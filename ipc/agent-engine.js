'use strict';
// Faz 4 — Yerleşik Ajan Motoru (Claude Code CLI gerekmez)
// Anthropic Messages API + araç kullanımı (tool use) döngüsü Galaxy içinde koşar.
// Anahtar: DATA_DIR/agent-config.json içinde safeStorage ile şifreli saklanır (BYOK).
// Yazma/komut araçları kullanıcı onayı ister (oto-onay açıksa sormaz); okuma araçları serbesttir.
module.exports = function register(g) {
  const { ipcMain, fs, path, spawn, execFile } = g;
  const knownPaths = g.knownPaths;
  const ENV = g.ENV || process.env;
  const sendTo = (wc, ch, msg) => { try { if (wc && !wc.isDestroyed()) wc.send(ch, msg); } catch (e) {} };

  // ---------- yapılandırma ----------
  const cfgFile = () => path.join(g.DATA_DIR || g.APP_DIR, 'agent-config.json');
  const encKey = (plain) => {
    try {
      if (g.safeStorage && g.safeStorage.isEncryptionAvailable()) return 'enc:' + g.safeStorage.encryptString(plain).toString('base64');
    } catch (e) {}
    return 'b64:' + Buffer.from(plain, 'utf8').toString('base64');
  };
  const decKey = (s) => {
    try {
      if (!s) return '';
      if (s.startsWith('enc:') && g.safeStorage && g.safeStorage.isEncryptionAvailable()) return g.safeStorage.decryptString(Buffer.from(s.slice(4), 'base64'));
      if (s.startsWith('b64:')) return Buffer.from(s.slice(4), 'base64').toString('utf8');
    } catch (e) {}
    return '';
  };
  function loadCfg() {
    let raw = {};
    try { raw = JSON.parse(fs.readFileSync(cfgFile(), 'utf8')) || {}; } catch (e) {}
    return {
      key: decKey(raw.keyEnc || '') || String(ENV.ANTHROPIC_API_KEY || ''),
      hasStoredKey: !!raw.keyEnc,
      model: String(raw.model || 'claude-sonnet-4-5').slice(0, 60),
      autoApprove: !!raw.autoApprove,
      engine: ['auto', 'cli', 'api'].includes(raw.engine) ? raw.engine : 'auto',
      baseUrl: String(raw.baseUrl || 'https://api.anthropic.com').replace(/\/+$/, ''),
    };
  }
  function saveCfg(patch) {
    let raw = {};
    try { raw = JSON.parse(fs.readFileSync(cfgFile(), 'utf8')) || {}; } catch (e) {}
    if (patch.key !== undefined) { if (patch.key) raw.keyEnc = encKey(String(patch.key)); else delete raw.keyEnc; }
    if (patch.model) raw.model = String(patch.model).slice(0, 60);
    if (patch.autoApprove !== undefined) raw.autoApprove = !!patch.autoApprove;
    if (['auto', 'cli', 'api'].includes(patch.engine)) raw.engine = patch.engine;
    if (patch.baseUrl) raw.baseUrl = String(patch.baseUrl).replace(/\/+$/, '');
    try { fs.mkdirSync(path.dirname(cfgFile()), { recursive: true }); fs.writeFileSync(cfgFile(), JSON.stringify(raw, null, 2)); } catch (e) {}
    return loadCfg();
  }

  // CLI (abonelik) bulunabilirliği: ana uygulama g.claudeBin verir; yoksa PATH'e bakılır.
  let _cliCache = null, _cliCacheAt = 0;
  function cliAvailable() {
    const now = Date.now();
    if (_cliCache !== null && now - _cliCacheAt < 60000) return _cliCache;
    let found = '';
    try {
      const whichSync = (name) => {
        try { const r = require('child_process').spawnSync(process.platform === 'win32' ? 'where' : 'which', [name], { env: ENV, timeout: 4000 }); const p = String((r && r.stdout) || '').trim().split(/\r?\n/)[0]; return p && fs.existsSync(p) ? p : ''; } catch (e) { return ''; }
      };
      if (typeof g.claudeBin === 'function') {
        const bin = String(g.claudeBin() || '');
        if (bin && path.isAbsolute(bin) && fs.existsSync(bin)) found = bin;
        else if (bin && !path.isAbsolute(bin)) found = whichSync(bin) || bin;
      } else {
        found = whichSync('claude');
      }
    } catch (e) {}
    _cliCache = found; _cliCacheAt = now;
    return found;
  }

  const cfgView = () => { const c = loadCfg(); return { ok: true, hasKey: !!c.key, model: c.model, autoApprove: c.autoApprove, baseUrl: c.baseUrl, engine: c.engine, cliAvailable: !!cliAvailable() }; };
  g.ipcMain.handle('galaxy:agentConfigGet', () => cfgView());
  g.ipcMain.handle('galaxy:agentConfigSave', (e, patch = {}) => { saveCfg(patch || {}); _cliCache = null; return cfgView(); });

  // ---------- araçlar ----------
  const SKIP = new Set(['node_modules', '.git', 'dist', 'build', '.next', 'coverage', '.galaxy-backups']);
  const safeJoin = (root, rel) => {
    const sub = g.safeRel ? g.safeRel(rel) : String(rel || '').replace(/^\/+/, '');
    if (sub === null || sub === undefined) return null;
    const full = path.join(root, sub);
    return full.startsWith(root) ? full : null;
  };
  const trunc = (s, n) => { s = String(s == null ? '' : s); return s.length > n ? s.slice(0, n) + '\n…[kısaltıldı]' : s; };

  const TOOLS = [
    { name: 'read_file', description: 'Dosya içeriğini satır numaralarıyla okur.', input_schema: { type: 'object', properties: { path: { type: 'string' }, offset: { type: 'number' }, limit: { type: 'number' } }, required: ['path'] } },
    { name: 'write_file', description: 'Dosyayı verilen içerikle yazar (oluşturur/üzerine yazar).', input_schema: { type: 'object', properties: { path: { type: 'string' }, content: { type: 'string' } }, required: ['path', 'content'] } },
    { name: 'edit_file', description: 'Dosyada benzersiz bir metin parçasını yenisiyle değiştirir.', input_schema: { type: 'object', properties: { path: { type: 'string' }, old: { type: 'string' }, new: { type: 'string' } }, required: ['path', 'old', 'new'] } },
    { name: 'list_files', description: 'Proje dosyalarını listeler (node_modules/.git atlanır).', input_schema: { type: 'object', properties: { sub: { type: 'string' } } } },
    { name: 'grep', description: 'Proje genelinde regex ile arar; dosya:satır döner.', input_schema: { type: 'object', properties: { pattern: { type: 'string' } }, required: ['pattern'] } },
    { name: 'run_bash', description: 'Proje kökünde kabuk komutu çalıştırır (en çok 120 sn).', input_schema: { type: 'object', properties: { cmd: { type: 'string' } }, required: ['cmd'] } },
    { name: 'git_status', description: 'git status + dal bilgisi.', input_schema: { type: 'object', properties: {} } },
    { name: 'git_diff', description: 'Kaydedilmemiş değişikliklerin diff\'i.', input_schema: { type: 'object', properties: {} } },
  ];
  const MUTATING = new Set(['write_file', 'edit_file', 'run_bash']);

  function toolSummary(name, input) {
    const i = input || {};
    if (name === 'write_file') return 'dosya yaz: ' + i.path + ' (' + String(i.content || '').split('\n').length + ' satır)';
    if (name === 'edit_file') return 'düzenle: ' + i.path;
    if (name === 'run_bash') return 'komut: ' + String(i.cmd || '').slice(0, 140);
    if (name === 'read_file') return 'oku: ' + i.path;
    if (name === 'list_files') return 'listele: ' + (i.sub || '.');
    if (name === 'grep') return 'ara: ' + i.pattern;
    return name;
  }

  function execGit(root, args, timeout) {
    return new Promise(res => execFile('git', args, { cwd: root, env: ENV, timeout: timeout || 20000, maxBuffer: 16 * 1024 * 1024 }, (err, out, errOut) => res({ ok: !err, out: String(out || '') + String(errOut || '') })));
  }

  function runTool(run, name, input) {
    const root = run.root;
    const i = input || {};
    if (name === 'read_file') {
      const full = safeJoin(root, i.path); if (!full) return Promise.resolve({ ok: false, text: 'Geçersiz yol' });
      try {
        const lines = fs.readFileSync(full, 'utf8').split('\n');
        const off = Math.max(0, (i.offset || 1) - 1), lim = Math.min(500, i.limit || 300);
        const slice = lines.slice(off, off + lim).map((l, k) => (off + k + 1) + '\t' + l).join('\n');
        return Promise.resolve({ ok: true, text: trunc(slice, 16000) + (lines.length > off + lim ? '\n…[toplam ' + lines.length + ' satır]' : '') });
      } catch (e) { return Promise.resolve({ ok: false, text: 'Okunamadı: ' + e.message }); }
    }
    if (name === 'write_file') {
      const full = safeJoin(root, i.path); if (!full) return Promise.resolve({ ok: false, text: 'Geçersiz yol' });
      try { fs.mkdirSync(path.dirname(full), { recursive: true }); fs.writeFileSync(full, String(i.content || ''), 'utf8'); return Promise.resolve({ ok: true, text: 'Yazıldı: ' + i.path }); }
      catch (e) { return Promise.resolve({ ok: false, text: 'Yazılamadı: ' + e.message }); }
    }
    if (name === 'edit_file') {
      const full = safeJoin(root, i.path); if (!full) return Promise.resolve({ ok: false, text: 'Geçersiz yol' });
      try {
        const text = fs.readFileSync(full, 'utf8');
        const idx = text.indexOf(String(i.old || ''));
        if (idx < 0) return Promise.resolve({ ok: false, text: 'Parça bulunamadı' });
        if (text.indexOf(String(i.old || ''), idx + 1) >= 0) return Promise.resolve({ ok: false, text: 'Parça benzersiz değil; daha uzun bağlam ver' });
        fs.writeFileSync(full, text.slice(0, idx) + String(i.new || '') + text.slice(idx + String(i.old).length), 'utf8');
        return Promise.resolve({ ok: true, text: 'Düzenlendi: ' + i.path });
      } catch (e) { return Promise.resolve({ ok: false, text: 'Düzenlenemedi: ' + e.message }); }
    }
    if (name === 'list_files') {
      const base = safeJoin(root, i.sub || '.') || root;
      const out = []; const stack = [base];
      while (stack.length && out.length < 240) {
        const dir = stack.pop(); let ents = [];
        try { ents = fs.readdirSync(dir, { withFileTypes: true }); } catch (e) { continue; }
        for (const en of ents) {
          if (en.name.startsWith('.')) continue;
          const full = path.join(dir, en.name);
          if (en.isDirectory()) { if (!SKIP.has(en.name)) stack.push(full); }
          else out.push(path.relative(root, full).split(path.sep).join('/'));
          if (out.length >= 240) break;
        }
      }
      return Promise.resolve({ ok: true, text: out.sort().join('\n') || '(boş)' });
    }
    if (name === 'grep') {
      let re; try { re = new RegExp(String(i.pattern || ''), 'g'); } catch (e) { return Promise.resolve({ ok: false, text: 'Regex hatası: ' + e.message }); }
      const out = []; const stack = [root]; let scanned = 0;
      while (stack.length && scanned < 900 && out.length < 60) {
        const dir = stack.pop(); let ents = [];
        try { ents = fs.readdirSync(dir, { withFileTypes: true }); } catch (e) { continue; }
        for (const en of ents) {
          if (en.name.startsWith('.')) continue;
          const full = path.join(dir, en.name);
          if (en.isDirectory()) { if (!SKIP.has(en.name)) stack.push(full); continue; }
          if (!/\.(js|jsx|ts|tsx|mjs|cjs|py|rb|go|rs|swift|java|cs|php|sh|css|html?|md|json|ya?ml|toml|sql|txt)$/i.test(en.name)) continue;
          scanned++;
          let lines; try { if (fs.statSync(full).size > 512 * 1024) continue; lines = fs.readFileSync(full, 'utf8').split('\n'); } catch (e) { continue; }
          lines.forEach((l, k) => { if (l.length <= 2000) { re.lastIndex = 0; if (re.test(l) && out.length < 60) out.push(path.relative(root, full).split(path.sep).join('/') + ':' + (k + 1) + ': ' + l.trim().slice(0, 160)); } });
          if (out.length >= 60) break;
        }
      }
      return Promise.resolve({ ok: true, text: out.join('\n') || 'eşleşme yok' });
    }
    if (name === 'run_bash') {
      return new Promise(res => {
        const child = spawn(String(i.cmd || ''), { cwd: root, shell: true, env: { ...ENV, FORCE_COLOR: '0' }, detached: process.platform !== 'win32' });
        run.child = child;
        let out = '';
        const to = setTimeout(() => { try { if (process.platform !== 'win32' && child.pid) process.kill(-child.pid, 'SIGKILL'); else child.kill('SIGKILL'); } catch (e) { try { child.kill('SIGKILL'); } catch (e2) {} } }, Math.min(120, Math.max(5, i.timeoutSec || 60)) * 1000);
        child.stdout.on('data', d => { out += d; if (out.length > 60000) out = out.slice(-60000); });
        child.stderr.on('data', d => { out += d; });
        child.on('error', err => { clearTimeout(to); res({ ok: false, text: String(err.message || err) }); });
        child.on('close', code => { clearTimeout(to); if (run.child === child) run.child = null; res({ ok: code === 0, text: trunc(out || '(çıktı yok)', 12000) + '\n[çıkış kodu: ' + code + ']' }); });
      });
    }
    if (name === 'git_status') return execGit(root, ['status', '--short', '--branch']).then(r => ({ ok: true, text: trunc(r.out, 6000) || 'temiz' }));
    if (name === 'git_diff') return execGit(root, ['diff', '--stat']).then(async r1 => { const r2 = await execGit(root, ['diff']); return { ok: true, text: trunc((r1.out || '') + '\n' + (r2.out || ''), 14000) || 'diff yok' }; });
    return Promise.resolve({ ok: false, text: 'Bilinmeyen araç: ' + name });
  }

  // ---------- konuşma döngüsü ----------
  const sessions = new Map(); // sessionKey -> messages[]
  const approvals = new Map(); // approvalId -> {res}
  const runs = new Map(); // runId -> run
  let runSeq = 0, apprSeq = 0;

  g.ipcMain.handle('galaxy:agentApprove', (e, { approvalId, ok } = {}) => {
    const a = approvals.get(approvalId);
    if (a) { approvals.delete(approvalId); a.res(!!ok); }
    return { ok: true };
  });
  g.ipcMain.handle('galaxy:agentStop', (e, { runId } = {}) => {
    const run = runs.get(runId);
    if (run) { run.stopped = true; try { if (run.child) { let killed = false; if (process.platform !== 'win32' && run.child.pid) { try { process.kill(-run.child.pid, 'SIGKILL'); killed = true; } catch (e) {} } if (!killed) try { run.child.kill('SIGKILL'); } catch (e) {} } } catch (err) {} if (run.abort) try { run.abort.abort(); } catch (err) {} }
    return { ok: true };
  });
  g.ipcMain.handle('galaxy:agentReset', (e, { sessionKey } = {}) => { sessions.delete(sessionKey || 'default'); try { cliSessions.delete(sessionKey || 'default'); } catch (err) {} return { ok: true }; });

  // ---------- CLI motoru (abonelik): claude CLI'yi stream-json ile sürer ----------
  const cliSessions = new Map(); // sessionKey -> claude session_id
  // CLI modu tur-sonu değişiklik görünürlüğü: acceptEdits sessiz yazar; Galaxy turdan önce/sonra
  // `git status` fotoğrafını karşılaştırıp değişen dosyaları akışa düşürür (ön-onay değil, iz).
  function gitChangedSnapshot(root) {
    return new Promise(res => {
      try {
        execFile('git', ['-C', root, 'status', '--porcelain=v1', '-z'], { env: ENV, timeout: 8000, maxBuffer: 4 * 1024 * 1024 }, (err, out) => {
          if (err) return res(null);
          const map = new Map();
          for (const ent of String(out || '').split('\0')) {
            if (!ent || ent.length < 4) continue;
            const st = ent.slice(0, 2), p = ent.slice(3);
            let sig = st;
            try { const s = fs.statSync(path.join(root, p)); sig += '|' + s.mtimeMs + '|' + s.size; } catch (e) { sig += '|yok'; }
            map.set(p, sig);
          }
          res(map);
        });
      } catch (e) { res(null); }
    });
  }
  function diffSnapshots(before, after) {
    if (!before || !after) return [];
    const out = [];
    for (const [p, sig] of after) if (!before.has(p) || before.get(p) !== sig) out.push({ path: p, status: sig.slice(0, 2).trim() || 'M' });
    for (const p of before.keys()) if (!after.has(p)) out.push({ path: p, status: 'D' });
    return out.slice(0, 40);
  }
  function cliToolSummary(name, input) {
    const i = input || {};
    return String(name || 'araç') + (i.file_path ? ': ' + i.file_path : i.command ? ': ' + String(i.command).slice(0, 110) : i.pattern ? ': ' + i.pattern : i.path ? ': ' + i.path : '');
  }
  async function runCli(run, emit, { root, sessionKey, text, instructions, bin }) {
    const before = await gitChangedSnapshot(root);
    return new Promise(finish => {
      const sid = cliSessions.get(sessionKey);
      const promptText = (instructions ? ('[Proje talimatı] ' + String(instructions).slice(0, 1500) + '\n\n') : '') + String(text).slice(0, 12000);
      const args = [];
      if (sid) args.push('--resume', sid);
      args.push('-p', promptText, '--output-format', 'stream-json', '--verbose', '--permission-mode', 'acceptEdits');
      let child;
      try { child = g.cliSpawn(bin, args, { cwd: root, env: ENV }); }
      catch (err) { emit('error', { text: 'CLI başlatılamadı: ' + err.message }); return finish(); }
      run.child = child;
      try { child.stdin && child.stdin.end(); } catch (e) {}
      let buf = '', sawText = false, errBuf = '';
      const handleLine = (line) => {
        let m; try { m = JSON.parse(line); } catch (e) { return; }
        if (!m || typeof m !== 'object') return;
        if (m.type === 'system' && m.session_id) cliSessions.set(sessionKey, m.session_id);
        else if (m.type === 'assistant') {
          for (const b of ((m.message || {}).content || [])) {
            if (b.type === 'text' && b.text) { sawText = true; emit('text', { text: b.text }); }
            else if (b.type === 'tool_use') emit('tool', { toolId: b.id, tool: b.name, summary: cliToolSummary(b.name, b.input) });
          }
        } else if (m.type === 'user') {
          for (const b of ((m.message || {}).content || [])) {
            if (b.type === 'tool_result') {
              const c = Array.isArray(b.content) ? b.content.map(x => (x && x.text) || '').join('') : String(b.content || '');
              emit('tool_result', { toolId: b.tool_use_id, ok: !b.is_error, preview: trunc(c, 400) });
            }
          }
        } else if (m.type === 'result') {
          if (m.is_error) emit('error', { text: String(m.result || 'CLI hata verdi').slice(0, 400) });
          else if (!sawText && m.result) emit('text', { text: String(m.result) });
        }
      };
      child.stdout.on('data', d => { buf += d; let ix; while ((ix = buf.indexOf('\n')) >= 0) { const line = buf.slice(0, ix); buf = buf.slice(ix + 1); if (line.trim()) handleLine(line); } });
      child.stderr.on('data', d => { errBuf = (errBuf + String(d)).slice(-2000); });
      child.on('error', err => { emit('error', { text: err.code === 'ENOENT' ? 'claude komutu bulunamadı — CLI kur veya motoru API yap' : String(err.message || err) }); finish(); });
      child.on('close', async code => {
        if (buf.trim()) handleLine(buf);
        if (run.child === child) run.child = null;
        if (run.stopped) { emit('error', { text: 'Durduruldu.' }); return finish(); }
        if (code !== 0) { emit('error', { text: 'CLI kapandı (kod ' + code + ')' + (errBuf ? ': ' + trunc(errBuf.trim().split('\n').pop(), 200) : '') }); return finish(); }
        try {
          const files = diffSnapshots(before, await gitChangedSnapshot(root));
          if (files.length) emit('changed', { files });
        } catch (e) {}
        emit('done', {});
        finish();
      });
    });
  }

  g.ipcMain.handle('galaxy:agentSend', async (e, { root, sessionKey, text, instructions } = {}) => {
    if (!root || !knownPaths.has(root) || !String(text || '').trim()) return { ok: false, error: 'Geçersiz istek' };
    if (g.isRemotePath && g.isRemotePath(root)) return { ok: false, error: 'Uzak projede yerleşik ajan yok' };
    const cfg = loadCfg();
    const wanted = cfg.engine || 'auto';
    const cliBinPath = wanted !== 'api' ? cliAvailable() : '';
    let engine;
    if (wanted === 'api') engine = 'api';
    else if (wanted === 'cli') {
      if (!cliBinPath) return { ok: false, error: 'Claude CLI bulunamadı — kurulum: npm install -g @anthropic-ai/claude-code (veya motoru API yap)' };
      engine = 'cli';
    } else engine = cliBinPath ? 'cli' : 'api';
    if (engine === 'api' && !cfg.key) return { ok: false, error: 'Anthropic API anahtarı yok — Geliştir sekmesindeki Yerleşik Ajan kartına anahtarını ekle (veya ANTHROPIC_API_KEY ortam değişkeni).' };
    const key = sessionKey || root;
    const runId = 'ag-' + (++runSeq) + '-' + Date.now();
    const run = { id: runId, root, stopped: false, child: null, abort: null };
    runs.set(runId, run);
    const wc = e.sender;
    const emit = (kind, data) => sendTo(wc, 'agent:event', { runId, sessionKey: key, kind, ...(data || {}) });

    if (engine === 'cli') {
      (async () => { try { await runCli(run, emit, { root, sessionKey: key, text, instructions, bin: cliBinPath }); } catch (err) { emit('error', { text: String(err.message || err) }); } finally { runs.delete(runId); } })();
      return { ok: true, runId, engine, model: 'claude-code (abonelik)' };
    }

    const msgs = sessions.get(key) || [];
    msgs.push({ role: 'user', content: String(text).slice(0, 12000) });
    const system = [
      'Sen Project Galaxy içindeki yerleşik kodlama ajanısın. Kullanıcının projesinde, verdiği görevi araçları kullanarak tamamlarsın.',
      'Proje kökü: ' + root,
      'Kurallar: Önce ilgili dosyaları oku; tahminle yazma. Küçük ve odaklı değişiklikler yap. Yazma/düzenleme/komut araçları kullanıcı onayından geçer (reddedilirse ısrar etme, alternatif öner).',
      'Komut çalıştırırken uzun süreli süreçler (dev server) başlatma; test/build gibi biten komutlar çalıştır.',
      'Yanıtların kısa ve Türkçe olsun; ne yaptığını özetle, dosya:satır ver.',
      instructions ? ('Proje talimatı: ' + String(instructions).slice(0, 1500)) : '',
    ].filter(Boolean).join('\n');

    const askApproval = (toolName, input) => new Promise(res => {
      if (cfg.autoApprove || !MUTATING.has(toolName)) { res(true); return; }
      const approvalId = 'ap-' + (++apprSeq) + '-' + Date.now();
      const to = setTimeout(() => { approvals.delete(approvalId); res(false); }, 180000);
      approvals.set(approvalId, { res: (ok) => { clearTimeout(to); res(ok); } });
      emit('approval', { approvalId, tool: toolName, summary: toolSummary(toolName, input) });
    });

    const callApi = async (messages) => {
      run.abort = (typeof AbortController !== 'undefined') ? new AbortController() : null;
      // Prompt caching: sistem + araçlar + konuşma geçmişi önbelleklenir (tekrarlı bağlam ~%90 ucuzlar)
      const CC = { type: 'ephemeral' };
      const toolsCached = TOOLS.map((t, i) => i === TOOLS.length - 1 ? { ...t, cache_control: CC } : t);
      const msgsCached = messages.map((m, i) => {
        if (i !== messages.length - 1) return m;
        if (Array.isArray(m.content) && m.content.length) { const c = m.content.slice(); c[c.length - 1] = { ...c[c.length - 1], cache_control: CC }; return { ...m, content: c }; }
        return { ...m, content: [{ type: 'text', text: String(m.content || ''), cache_control: CC }] };
      });
      const resp = await fetch(cfg.baseUrl + '/v1/messages', {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'x-api-key': cfg.key, 'anthropic-version': '2023-06-01' },
        body: JSON.stringify({ model: cfg.model, max_tokens: 4096, system: [{ type: 'text', text: system, cache_control: CC }], messages: msgsCached, tools: toolsCached }),
        signal: run.abort ? run.abort.signal : undefined,
      });
      const data = await resp.json().catch(() => null);
      if (!resp.ok) throw new Error('API ' + resp.status + ': ' + trunc(data && data.error ? (data.error.message || JSON.stringify(data.error)) : 'bilinmeyen hata', 300));
      return data;
    };

    (async () => {
      try {
        for (let iter = 0; iter < 14; iter++) {
          if (run.stopped) { emit('error', { text: 'Durduruldu.' }); break; }
          const data = await callApi(msgs.slice(-40));
          const content = Array.isArray(data && data.content) ? data.content : [];
          msgs.push({ role: 'assistant', content });
          const toolUses = content.filter(b => b && b.type === 'tool_use');
          for (const b of content) if (b && b.type === 'text' && b.text) emit('text', { text: b.text });
          if (!toolUses.length || (data && data.stop_reason !== 'tool_use')) { emit('done', {}); break; }
          const results = [];
          for (const tu of toolUses) {
            if (run.stopped) break;
            emit('tool', { toolId: tu.id, tool: tu.name, summary: toolSummary(tu.name, tu.input) });
            const approved = await askApproval(tu.name, tu.input);
            if (!approved) {
              emit('tool_result', { toolId: tu.id, ok: false, preview: 'Kullanıcı onaylamadı' });
              results.push({ type: 'tool_result', tool_use_id: tu.id, content: 'Kullanıcı bu işlemi onaylamadı. Devam etme; ne yapabileceğini sor veya özetle.', is_error: true });
              continue;
            }
            let r;
            try { r = await runTool(run, tu.name, tu.input); } catch (err) { r = { ok: false, text: String(err.message || err) }; }
            emit('tool_result', { toolId: tu.id, ok: r.ok, preview: trunc(r.text, 400) });
            results.push({ type: 'tool_result', tool_use_id: tu.id, content: trunc(r.text, 12000), is_error: !r.ok });
          }
          msgs.push({ role: 'user', content: results });
          if (iter === 13) emit('error', { text: 'Araç döngüsü sınırına ulaşıldı (14 tur).' });
        }
      } catch (err) {
        emit('error', { text: run.stopped ? 'Durduruldu.' : String(err.message || err) });
      } finally {
        sessions.set(key, msgs.slice(-46));
        runs.delete(runId);
      }
    })();

    return { ok: true, runId, engine, model: cfg.model };
  });

  // Kapanışta çalışan bash çocuklarını temizle
  try { if (g.app && typeof g.app.on === 'function') g.app.on('will-quit', () => { for (const run of runs.values()) { try { if (run.child && run.child.pid) { if (process.platform !== 'win32') process.kill(-run.child.pid, 'SIGKILL'); else run.child.kill('SIGKILL'); } } catch (e) {} } for (const a of approvals.values()) a.res(false); approvals.clear(); }); } catch (e) {}
};
