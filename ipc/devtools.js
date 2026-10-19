'use strict';
// DevTools katmanı: gerçek PTY terminali, dosya izleme (watch), Git hunk/restore,
// tanılama (tsc/eslint), uzak dosya yazma. Diğer IPC dosyalarının with(g) kalıbına
// uymadan, g üzerinden paylaşılan yardımcıları kullanır.
module.exports = function register(g) {
  const { ipcMain, fs, path, spawn, execFile } = g;
  const knownPaths = g.knownPaths;
  const ENV = g.ENV || process.env;

  const sendTo = (wc, ch, msg) => { try { if (wc && !wc.isDestroyed()) wc.send(ch, msg); } catch (e) {} };

  // ---------- 1) Gerçek PTY terminali (macOS/Linux: `script` PTY köprüsü) ----------
  const ptys = new Map();
  g.ipcMain.handle('galaxy:ptyStart', (e, { id, cwd, cols, rows } = {}) => {
    if (g.IS_MAS) return { ok: false, error: 'Terminal App Store sürümünde devre dışı.' };
    if (!id || !cwd || !knownPaths.has(cwd)) return { ok: false, error: 'Geçersiz klasör' };
    if (g.isRemotePath && g.isRemotePath(cwd)) return { ok: false, error: 'Uzak projede SSH sekmesini kullan' };
    const ex = ptys.get(id);
    if (ex && ex.child && !ex.child.killed && ex.child.exitCode === null) return { ok: true, reused: true };
    const shellBin = process.env.SHELL || (process.platform === 'win32' ? 'powershell.exe' : '/bin/zsh');
    let child;
    try {
      if (process.platform === 'darwin') {
        child = spawn('script', ['-q', '/dev/null', shellBin, '-i'], { cwd, env: { ...ENV, TERM: 'xterm-256color', COLUMNS: String(cols || 100), LINES: String(rows || 30) } });
      } else if (process.platform === 'win32') {
        child = spawn(shellBin, [], { cwd, env: { ...ENV, TERM: 'xterm-256color' } });
      } else {
        child = spawn('script', ['-qec', shellBin + ' -i', '/dev/null'], { cwd, env: { ...ENV, TERM: 'xterm-256color', COLUMNS: String(cols || 100), LINES: String(rows || 30) } });
      }
    } catch (err) { return { ok: false, error: err.message }; }
    const wc = e.sender;
    const onData = chunk => sendTo(wc, 'pty:out', { id, data: chunk.toString('utf8') });
    if (child.stdout) child.stdout.on('data', onData);
    if (child.stderr) child.stderr.on('data', onData);
    child.on('error', err => sendTo(wc, 'pty:out', { id, data: '\r\n[terminal başlatılamadı: ' + (err.message || err) + ']\r\n' }));
    child.on('close', code => { sendTo(wc, 'pty:out', { id, data: '\r\n[terminal kapandı · kod ' + code + ']\r\n', exit: true }); ptys.delete(id); });
    ptys.set(id, { child, wc });
    return { ok: true };
  });
  g.ipcMain.handle('galaxy:ptyWrite', (e, { id, data } = {}) => {
    const rec = ptys.get(id);
    if (!rec || !rec.child || !rec.child.stdin) return { ok: false };
    try { rec.child.stdin.write(String(data == null ? '' : data)); return { ok: true }; } catch (err) { return { ok: false, error: err.message }; }
  });
  g.ipcMain.handle('galaxy:ptyResize', (e, { id, cols, rows } = {}) => {
    // script-PTY boyutu süreç başlangıcında sabitlenir; çalışan oturumda nazikçe yoksay.
    return { ok: true, cols, rows };
  });
  g.ipcMain.handle('galaxy:ptyStop', (e, id) => {
    const rec = ptys.get(id);
    if (rec) { try { rec.child.kill('SIGKILL'); } catch (err) {} ptys.delete(id); }
    return { ok: true };
  });

  // ---------- 2) Dosya izleme: dış değişiklikleri arayüze haber ver ----------
  const watchers = new Map();
  g.ipcMain.handle('galaxy:watchStart', (e, { root } = {}) => {
    if (!root || !knownPaths.has(root)) return { ok: false };
    if (g.isRemotePath && g.isRemotePath(root)) return { ok: false, error: 'uzak izlenmez' };
    const key = root;
    if (watchers.has(key)) return { ok: true, reused: true };
    const wc = e.sender;
    let timer = null, pending = new Set();
    let w;
    try {
      w = fs.watch(root, { recursive: true }, (evt, filename) => {
        if (filename) {
          const rel = String(filename).split(path.sep).join('/');
          if (/(^|\/)(node_modules|\.git|dist|build)(\/|$)/.test(rel)) return;
          pending.add(rel);
        }
        if (timer) clearTimeout(timer);
        timer = setTimeout(() => {
          const files = [...pending].slice(0, 40); pending = new Set();
          sendTo(wc, 'fs:changed', { root, files });
        }, 450);
      });
    } catch (err) { return { ok: false, error: err.message }; }
    w.on('error', () => { try { w.close(); } catch (e2) {} watchers.delete(key); });
    watchers.set(key, { w, wc });
    return { ok: true };
  });
  g.ipcMain.handle('galaxy:watchStop', (e, { root } = {}) => {
    const rec = watchers.get(root);
    if (rec) { try { rec.w.close(); } catch (err) {} watchers.delete(root); }
    return { ok: true };
  });

  // ---------- 5/7) Git: patch uygula (hunk stage), dosya geri al (ajan onayı) ----------
  const gitOk = async (projectId) => {
    if (!g.gitProj) return { error: 'git yok' };
    const gr = g.gitProj(projectId);
    return gr && gr.error ? { error: gr.error } : gr;
  };
  g.ipcMain.handle('galaxy:gitApplyPatch', async (e, { projectId, patch, reverse } = {}) => {
    const gr = await gitOk(projectId); if (gr.error) return { ok: false, error: gr.error };
    if (!patch || !String(patch).includes('@@')) return { ok: false, error: 'patch yok' };
    return new Promise(res => {
      const child = spawn('git', ['apply', '--cached', '--whitespace=nowarn', '-'], { cwd: gr.proj.path, env: ENV });
      let err = '';
      child.stderr.on('data', d => { err += d; });
      child.on('error', er => res({ ok: false, error: er.message }));
      child.on('close', code => res(code === 0 ? { ok: true } : { ok: false, error: err.trim() || ('git apply ' + code) }));
      child.stdin.end(String(patch));
    });
    void reverse;
  });
  g.ipcMain.handle('galaxy:gitRestoreFiles', async (e, { projectId, files } = {}) => {
    const gr = await gitOk(projectId); if (gr.error) return { ok: false, error: gr.error };
    const list = (files || []).filter(Boolean);
    if (!list.length) return { ok: false, error: 'dosya yok' };
    const r1 = await g.execGit(gr.proj.path, ['checkout', '--', ...list], 20000);
    // untracked (yeni) dosyalar checkout ile gitmez — yalnızca listelenenleri sil
    const r2 = await g.execGit(gr.proj.path, ['clean', '-f', '--', ...list], 20000);
    return { ok: !!(r1.ok || r2.ok), error: (!r1.ok && !r2.ok) ? ((r1.out || '') + (r2.out || '')) : undefined };
  });

  // ---------- 4/6) Tanılama: projede tsc / eslint varsa çalıştır, sorun listesi dön ----------
  g.ipcMain.handle('galaxy:diagRun', async (e, { root } = {}) => {
    if (!root || !knownPaths.has(root)) return { ok: false, problems: [], error: 'Geçersiz kök' };
    if (g.isRemotePath && g.isRemotePath(root)) return { ok: false, problems: [], error: 'Uzakta tanılama yok' };
    const problems = [];
    const run = (bin, args, timeout) => new Promise(res => {
      execFile(bin, args, { cwd: root, env: ENV, timeout: timeout || 90000, maxBuffer: 16 * 1024 * 1024 }, (err, out, errOut) => res(String(out || '') + String(errOut || '')));
    });
    const hasPkg = fs.existsSync(path.join(root, 'package.json'));
    let pkg = null;
    try { pkg = hasPkg ? JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8')) : null; } catch (e2) {}
    const deps = pkg ? { ...(pkg.dependencies || {}), ...(pkg.devDependencies || {}) } : {};
    const scripts = (pkg && pkg.scripts) || {};
    const localBin = n => path.join(root, 'node_modules', '.bin', n);
    let ran = [];
    if (fs.existsSync(localBin('tsc'))) {
      const out = await run(localBin('tsc'), ['--noEmit', '--pretty', 'false'], 120000);
      ran.push('tsc');
      for (const line of out.split('\n')) {
        const m = line.match(/^(.+?)\((\d+),(\d+)\):\s*(error|warning)\s*TS\d+:\s*(.*)$/);
        if (m) problems.push({ file: m[1], line: +m[2], col: +m[3], severity: m[4], text: m[5].slice(0, 200), source: 'tsc' });
      }
    }
    if (fs.existsSync(localBin('eslint'))) {
      const out = await run(localBin('eslint'), ['.', '-f', 'unix'], 120000);
      ran.push('eslint');
      for (const line of out.split('\n')) {
        const m = line.match(/^\/?.*?:\s*(.+?):(\d+):(\d+):\s*(.+?)\s*\[(Error|Warning)\//) || line.match(/^(.+?):(\d+):(\d+):\s*(.+?)\s*\[(Error|Warning)\//);
        if (m) problems.push({ file: path.relative(root, m[1].startsWith('/') ? m[1] : path.join(root, m[1])), line: +m[2], col: +m[3], severity: m[5].toLowerCase(), text: m[4].slice(0, 200), source: 'eslint' });
      }
    }
    if (scripts.test && !/no test specified/.test(String(scripts.test))) ran.push('test-script-var');
    return { ok: true, problems: problems.slice(0, 200), ran };
  });

  // ---------- Faz 2 ortak yardımcılar ----------
  const SKIP_DIRS = new Set(['node_modules', '.git', 'dist', 'build', '.next', 'coverage', '.galaxy-backups']);
  const TEXT_EXT = /\.(js|jsx|ts|tsx|mjs|cjs|py|rb|go|rs|swift|kt|java|c|cc|cpp|h|hpp|cs|php|sh|css|scss|html?|md|json|ya?ml|toml|xml|sql|txt|env|ini|cfg)$/i;
  function walkFiles(root, limit) {
    const out = [];
    const stack = [root];
    while (stack.length && out.length < (limit || 4000)) {
      const dir = stack.pop();
      let ents = [];
      try { ents = fs.readdirSync(dir, { withFileTypes: true }); } catch (e) { continue; }
      for (const en of ents) {
        if (en.name.startsWith('.') && en.name !== '.galaxy.json') { if (en.name === '.galaxy.json') {} else if (en.isDirectory()) continue; }
        const full = path.join(dir, en.name);
        if (en.isDirectory()) { if (!SKIP_DIRS.has(en.name)) stack.push(full); }
        else if (en.isFile()) out.push(full);
        if (out.length >= (limit || 4000)) break;
      }
    }
    return out;
  }
  const relOf = (root, full) => path.relative(root, full).split(path.sep).join('/');
  const safeJoin = (root, rel) => {
    const sub = g.safeRel ? g.safeRel(rel) : String(rel || '').replace(/^\/+/, '');
    if (sub === null || !sub) return null;
    const full = path.join(root, sub);
    return full.startsWith(root) ? full : null;
  };
  function makeRe(query, isRegex, caseSensitive) {
    if (isRegex) return new RegExp(query, caseSensitive ? 'g' : 'gi');
    const esc = String(query).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return new RegExp(esc, caseSensitive ? 'g' : 'gi');
  }
  // Taramalar worker'da: patolojik regex/dev repo ana sureci kilitlemesin.
  // Zaman asiminda worker terminate edilir ve kullaniciya anlasilir hata doner.
  function runScan(kind, payload, timeoutMs) {
    return new Promise(resolve => {
      let worker;
      try {
        const { Worker } = require('worker_threads');
        worker = new Worker(path.join(__dirname, 'scan-worker.js'), { workerData: { kind, ...payload } });
      } catch (err) { resolve({ ok: false, error: 'Tarama başlatılamadı: ' + err.message }); return; }
      let done = false;
      const finish = (val) => { if (done) return; done = true; clearTimeout(to); try { worker.terminate(); } catch (e) {} resolve(val); };
      const to = setTimeout(() => finish({ ok: false, error: 'Tarama zaman aşımı (' + Math.round((timeoutMs || 15000) / 1000) + ' sn) — desen çok ağır veya repo çok büyük; aramayı daralt' }), timeoutMs || 15000);
      worker.on('message', msg => finish(msg && typeof msg === 'object' ? msg : { ok: false, error: 'Tarama yanıtı bozuk' }));
      worker.on('error', err => finish({ ok: false, error: 'Tarama hatası: ' + err.message }));
      worker.on('exit', code => { if (!done && code !== 0) finish({ ok: false, error: 'Tarama beklenmedik şekilde bitti (kod ' + code + ')' }); });
    });
  }

  // ---------- R1) Proje geneli Bul & Değiştir (önizleme + yedekli uygula + geri al) ----------
  g.ipcMain.handle('galaxy:grepReplacePreview', async (e, { root, query, replacement, isRegex, caseSensitive } = {}) => {
    if (!root || !knownPaths.has(root) || !query) return { ok: false, error: 'Geçersiz arama' };
    // Regex guvenligi ana surecte hizli dogrulanir; agir is worker'da (zaman asimli).
    try { makeRe(query, !!isRegex, !!caseSensitive); } catch (err) { return { ok: false, error: 'Regex hatası: ' + err.message }; }
    return runScan('grepPreview', { root, query: String(query), replacement: String(replacement == null ? '' : replacement), isRegex: !!isRegex, caseSensitive: !!caseSensitive }, 15000);
  });
  g.ipcMain.handle('galaxy:grepReplaceApply', async (e, { root, query, replacement, isRegex, caseSensitive, files } = {}) => {
    if (!root || !knownPaths.has(root) || !query || !Array.isArray(files) || !files.length) return { ok: false, error: 'Dosya seçilmedi' };
    let re; try { re = makeRe(query, !!isRegex, !!caseSensitive); } catch (err) { return { ok: false, error: 'Regex hatası: ' + err.message }; }
    const stamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupDir = path.join(root, '.galaxy-backups', stamp);
    let changed = 0, replaced = 0;
    try { fs.mkdirSync(backupDir, { recursive: true }); } catch (err) {}
    for (const rel of files.slice(0, 200)) {
      const full = safeJoin(root, rel); if (!full || !fs.existsSync(full)) continue;
      let text; try { text = fs.readFileSync(full, 'utf8'); } catch (err) { continue; }
      re.lastIndex = 0;
      const matches = (text.match(re) || []).length;
      if (!matches) continue;
      re.lastIndex = 0;
      const next = text.replace(re, String(replacement == null ? '' : replacement));
      if (next === text) continue;
      try {
        const bFull = path.join(backupDir, rel);
        fs.mkdirSync(path.dirname(bFull), { recursive: true });
        fs.writeFileSync(bFull, text, 'utf8');
        fs.writeFileSync(full, next, 'utf8');
        changed++; replaced += matches;
      } catch (err) {}
    }
    return { ok: changed > 0, changed, replaced, backupId: stamp, backupDir: '.galaxy-backups/' + stamp };
  });
  g.ipcMain.handle('galaxy:grepReplaceRollback', async (e, { root, backupId } = {}) => {
    if (!root || !knownPaths.has(root) || !backupId) return { ok: false, error: 'Yedek yok' };
    const dir = path.join(root, '.galaxy-backups', String(backupId).replace(/[^\w-]/g, ''));
    if (!fs.existsSync(dir)) return { ok: false, error: 'Yedek bulunamadı' };
    let restored = 0;
    for (const full of walkFiles(dir, 2000)) {
      const rel = relOf(dir, full); const dest = safeJoin(root, rel); if (!dest) continue;
      try { fs.mkdirSync(path.dirname(dest), { recursive: true }); fs.copyFileSync(full, dest); restored++; } catch (err) {}
    }
    return { ok: restored > 0, restored };
  });

  // ---------- R4) Test Gezgini: keşif + koş ----------
  g.ipcMain.handle('galaxy:testDiscover', async (e, { root } = {}) => {
    if (!root || !knownPaths.has(root)) return { ok: false, tests: [] };
    const r = await runScan('testDiscover', { root }, 15000);
    return r && r.ok ? r : { ok: false, tests: [], error: (r && r.error) || 'keşif yapılamadı' };
  });
  const runCmd = (root, cmd, timeout) => new Promise(res => {
    const child = spawn(cmd, { cwd: root, shell: true, env: { ...ENV, CI: '1', FORCE_COLOR: '0' }, detached: process.platform !== 'win32' });
    let out = ''; const started = Date.now();
    const to = setTimeout(() => { try { if (process.platform !== 'win32' && child.pid) process.kill(-child.pid, 'SIGKILL'); else child.kill('SIGKILL'); } catch (e) { try { child.kill('SIGKILL'); } catch (e2) {} } }, timeout || 180000);
    child.stdout.on('data', d => { out += d; if (out.length > 512 * 1024) out = out.slice(-512 * 1024); });
    child.stderr.on('data', d => { out += d; });
    child.on('error', err => { clearTimeout(to); res({ ok: false, out: out + String(err.message || ''), code: -1, ms: Date.now() - started }); });
    child.on('close', code => { clearTimeout(to); res({ ok: code === 0, out, code, ms: Date.now() - started }); });
  });
  function parseProblems(root, out) {
    const probs = [];
    for (const line of String(out || '').split('\n')) {
      const m = line.match(/([\w@./-]+\.[A-Za-z]{1,8}):(\d+)(?::(\d+))?/) || line.match(/([\w@./-]+\.[A-Za-z]{1,8})\((\d+),(\d+)\)/);
      if (m && !/node_modules/.test(m[1]) && /fail|error|✕|×|FAIL|Error/i.test(line)) probs.push({ file: m[1], line: +m[2], col: m[3] ? +m[3] : 0, severity: 'error', text: line.trim().slice(0, 200), source: 'test' });
      if (probs.length >= 80) break;
    }
    return probs;
  }
  g.ipcMain.handle('galaxy:testRun', async (e, { root, file, name, runner } = {}) => {
    if (!root || !knownPaths.has(root)) return { ok: false, error: 'Geçersiz kök' };
    let pkg = null; try { pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8')); } catch (err) {}
    const r = runner || (pkg && /vitest/.test(JSON.stringify(pkg)) ? 'vitest' : pkg && /jest/.test(JSON.stringify(pkg)) ? 'jest' : 'pytest');
    let cmd;
    const q = s => '"' + String(s).replace(/"/g, '') + '"';
    if (r === 'vitest') cmd = 'npx vitest run ' + (file ? q(file) : '') + (name ? ' -t ' + q(name) : '');
    else if (r === 'jest') cmd = 'npx jest ' + (file ? q(file) : '') + (name ? ' -t ' + q(name) : '') + ' --ci';
    else if (r === 'npm') cmd = 'npm test';
    else cmd = 'python3 -m pytest ' + (file ? q(file) : '') + (name ? ' -k ' + q(name) : '') + ' -q';
    const res = await runCmd(root, cmd, 240000);
    return { ok: true, passed: res.ok, code: res.code, ms: res.ms, cmd, out: String(res.out || '').slice(-24000), problems: parseProblems(root, res.out) };
  });

  // ---------- R5) Dosya geçmişi / blame / eski sürüm ----------
  g.ipcMain.handle('galaxy:gitFileHistory', async (e, { projectId, file } = {}) => {
    const gr = await gitOk(projectId); if (gr.error) return { ok: false, error: gr.error };
    const r = await g.execGit(gr.proj.path, ['log', '--follow', '--date=short', '--pretty=format:%H%x09%h%x09%ad%x09%an%x09%s', '-n', '60', '--', file], 20000);
    if (!r.ok) return { ok: false, error: r.out || 'log yok' };
    const commits = String(r.out || '').split('\n').filter(Boolean).map(l => { const [hash, short, date, author, ...rest] = l.split('\t'); return { hash, short, date, author, subject: rest.join('\t') }; });
    return { ok: true, commits };
  });
  g.ipcMain.handle('galaxy:gitBlame', async (e, { projectId, file } = {}) => {
    const gr = await gitOk(projectId); if (gr.error) return { ok: false, error: gr.error };
    const r = await g.execGit(gr.proj.path, ['blame', '--line-porcelain', '--', file], 20000);
    if (!r.ok) return { ok: false, error: r.out || 'blame yok' };
    const lines = []; let cur = null;
    for (const ln of String(r.out || '').split('\n')) {
      const m = ln.match(/^[0-9a-f]{40} \d+ (\d+)(?: \d+)?$/);
      if (m) { cur = { line: +m[1], hash: '', author: '', date: '', summary: '' }; lines.push(cur); continue; }
      if (!cur) continue;
      if (ln.startsWith('author ')) cur.author = ln.slice(7);
      else if (ln.startsWith('author-time ')) { const d = new Date(+ln.slice(12) * 1000); cur.date = isNaN(d) ? '' : d.toISOString().slice(0, 10); }
      else if (ln.startsWith('summary ')) cur.summary = ln.slice(8);
      else if (/^[0-9a-f]{40}$/.test(ln.slice(0, 40)) && ln.length >= 40) cur.hash = ln.slice(0, 8);
    }
    return { ok: true, lines: lines.slice(0, 2000) };
  });
  g.ipcMain.handle('galaxy:gitShowFile', async (e, { projectId, file, rev } = {}) => {
    const gr = await gitOk(projectId); if (gr.error) return { ok: false, error: gr.error };
    if (!rev || !/^[\w./-]+$/.test(String(rev))) return { ok: false, error: 'rev yok' };
    const r = await g.execGit(gr.proj.path, ['show', String(rev) + ':' + String(file).replace(/^\/+/, '')], 20000);
    return r.ok ? { ok: true, content: String(r.out || '').slice(0, 512 * 1024) } : { ok: false, error: r.out || 'gösterilemedi' };
  });

  // ---------- R10) Arka plan işleri ----------
  const jobs = new Map();
  let jobSeq = 0;
  g.ipcMain.handle('galaxy:jobStart', (e, { root, cmd, label, env: extraEnv } = {}) => {
    if (!root || !knownPaths.has(root) || !cmd) return { ok: false, error: 'Geçersiz iş' };
    const id = 'job-' + (++jobSeq) + '-' + Date.now();
    const wc = e.sender;
    const env = { ...ENV, FORCE_COLOR: '0' };
    if (extraEnv && typeof extraEnv === 'object') for (const [k, v] of Object.entries(extraEnv)) { if (/^[A-Za-z_][\w]*$/.test(k)) env[k] = String(v); }
    // detached (POSIX): süreç grubuyla başlat ki dev-server gibi torunlar da temizlenebilsin
    const child = spawn(String(cmd), { cwd: root, shell: true, env, detached: process.platform !== 'win32' });
    const rec = { id, root, cmd: String(cmd), label: label || String(cmd).slice(0, 60), started: Date.now(), status: 'running', out: '', child };
    jobs.set(id, rec);
    const push = d => { rec.out = (rec.out + d).slice(-48000); sendTo(wc, 'job:out', { id, data: String(d) }); };
    child.stdout.on('data', push); child.stderr.on('data', push);
    child.on('error', err => { rec.status = 'error'; rec.ended = Date.now(); sendTo(wc, 'job:done', { id, status: 'error', code: -1, label: rec.label, ms: rec.ended - rec.started }); });
    child.on('close', code => { if (rec.status !== 'stopped') rec.status = code === 0 ? 'done' : 'error'; rec.code = code; rec.ended = Date.now(); sendTo(wc, 'job:done', { id, status: rec.status, code, label: rec.label, ms: rec.ended - rec.started }); });
    return { ok: true, id, label: rec.label };
  });
  g.ipcMain.handle('galaxy:jobList', () => ({ ok: true, jobs: [...jobs.values()].slice(-30).map(j => ({ id: j.id, label: j.label, cmd: j.cmd, status: j.status, code: j.code, started: j.started, ended: j.ended, out: String(j.out || '').slice(-12000) })) }));
  const killJobTree = (j) => {
    if (!j || !j.child) return;
    try { if (process.platform !== 'win32' && j.child.pid) process.kill(-j.child.pid, 'SIGKILL'); else j.child.kill('SIGKILL'); }
    catch (err) { try { j.child.kill('SIGKILL'); } catch (e2) {} }
  };
  g.ipcMain.handle('galaxy:jobStop', (e, { id } = {}) => { const j = jobs.get(id); if (j) { killJobTree(j); j.status = 'stopped'; } return { ok: true }; });

  // Kapanış temizliği: PTY kabukları + arka plan işleri öksüz kalmasın.
  const killAllChildren = () => {
    for (const rec of ptys.values()) { try { rec.child && rec.child.kill('SIGKILL'); } catch (err) {} }
    ptys.clear();
    for (const j of jobs.values()) { try { killJobTree(j); } catch (err) {} if (j.status === 'running') j.status = 'stopped'; }
    for (const rec of watchers.values()) { try { rec.w.close(); } catch (err) {} }
    watchers.clear();
    try { for (const rec of langWorkers.values()) { try { rec.worker.terminate(); } catch (err) {} } langWorkers.clear(); } catch (err) {}
  };
  try { if (g.app && typeof g.app.on === 'function') g.app.on('will-quit', killAllChildren); } catch (err) {}
  g._killDevtoolsChildren = killAllChildren;

  // ---------- R9) .galaxy proje profili + şablonlar ----------
  g.ipcMain.handle('galaxy:profileRead', async (e, { root } = {}) => {
    if (!root || !knownPaths.has(root)) return { ok: false };
    const p = path.join(root, '.galaxy.json');
    if (!fs.existsSync(p)) return { ok: true, exists: false, profile: null };
    try { return { ok: true, exists: true, profile: JSON.parse(fs.readFileSync(p, 'utf8')) }; } catch (err) { return { ok: false, error: 'JSON bozuk' }; }
  });
  g.ipcMain.handle('galaxy:profileWrite', async (e, { root, profile } = {}) => {
    if (!root || !knownPaths.has(root) || !profile) return { ok: false };
    try { fs.writeFileSync(path.join(root, '.galaxy.json'), JSON.stringify(profile, null, 2) + '\n', 'utf8'); return { ok: true }; } catch (err) { return { ok: false, error: err.message }; }
  });
  g.ipcMain.handle('galaxy:templateCreate', async (e, { root, kind, name } = {}) => {
    if (!root || !knownPaths.has(root)) return { ok: false, error: 'Geçersiz kök' };
    const projName = String(name || path.basename(root) || 'proje').replace(/[^\w -]/g, '').trim() || 'proje';
    const files = {
      node: {
        'package.json': JSON.stringify({ name: projName.toLowerCase().replace(/\s+/g, '-'), version: '0.1.0', private: true, type: 'module', scripts: { dev: 'node src/index.js', test: 'node --test' } }, null, 2) + '\n',
        'src/index.js': "console.log('Merhaba, " + projName + "');\n",
        'README.md': '# ' + projName + '\n\nNode projesi — Project Galaxy şablonu.\n\n## Çalıştır\n\n```bash\nnpm run dev\n```\n'
      },
      python: {
        'main.py': 'def main():\n    print("Merhaba, ' + projName + '")\n\n\nif __name__ == "__main__":\n    main()\n',
        'requirements.txt': '',
        'README.md': '# ' + projName + '\n\nPython projesi — Project Galaxy şablonu.\n\n## Çalıştır\n\n```bash\npython3 main.py\n```\n'
      },
      web: {
        'index.html': '<!doctype html>\n<html lang="tr">\n<head><meta charset="utf-8"><title>' + projName + '</title><link rel="stylesheet" href="style.css"></head>\n<body><h1>' + projName + '</h1><script src="app.js"></script></body>\n</html>\n',
        'style.css': 'body{font-family:system-ui;margin:40px;background:#0b0e18;color:#e8eefc}\n',
        'app.js': "console.log('" + projName + " hazır');\n",
        'README.md': '# ' + projName + '\n\nStatik web şablonu.\n'
      },
      swift: {
        'main.swift': 'print("Merhaba, ' + projName + '")\n',
        'README.md': '# ' + projName + '\n\nSwift şablonu. `swift main.swift` ile koş.\n'
      }
    };
    const set = files[kind] || files.node;
    const created = [];
    for (const [rel, content] of Object.entries(set)) {
      const full = safeJoin(root, rel); if (!full) continue;
      if (fs.existsSync(full)) continue;
      try { fs.mkdirSync(path.dirname(full), { recursive: true }); fs.writeFileSync(full, content, 'utf8'); created.push(rel); } catch (err) {}
    }
    return { ok: true, created };
  });

  // ---------- Faz 3 / 1) LSP köprüsü (kalıcı lang-worker, kök başına) ----------
  const langWorkers = new Map(); // root -> {worker, seq, pending:Map}
  function langWorkerFor(root) {
    let rec = langWorkers.get(root);
    if (rec) return rec;
    let worker;
    try {
      const { Worker } = require('worker_threads');
      worker = new Worker(path.join(__dirname, 'lang-worker.js'), { workerData: { root } });
    } catch (err) { return null; }
    rec = { worker, seq: 0, pending: new Map() };
    worker.on('message', m => {
      if (!m || m.id == null) return;
      const p = rec.pending.get(m.id); if (!p) return;
      rec.pending.delete(m.id); clearTimeout(p.to); p.res(m);
    });
    const die = () => { for (const p of rec.pending.values()) { clearTimeout(p.to); p.res({ ok: false, error: 'Dil sunucusu kapandı' }); } rec.pending.clear(); if (langWorkers.get(root) === rec) langWorkers.delete(root); };
    worker.on('error', die); worker.on('exit', die);
    langWorkers.set(root, rec);
    // En fazla 3 kök aynı anda sıcak tutulur
    if (langWorkers.size > 3) { const firstKey = langWorkers.keys().next().value; if (firstKey !== root) { const old = langWorkers.get(firstKey); try { old.worker.terminate(); } catch (e) {} langWorkers.delete(firstKey); } }
    return rec;
  }
  function langRequest(root, payload, timeoutMs) {
    return new Promise(resolve => {
      const rec = langWorkerFor(root);
      if (!rec) { resolve({ ok: false, error: 'Dil sunucusu başlatılamadı' }); return; }
      const id = ++rec.seq;
      const to = setTimeout(() => { rec.pending.delete(id); resolve({ ok: false, error: 'Dil sunucusu zaman aşımı' }); }, timeoutMs || 20000);
      rec.pending.set(id, { res: resolve, to });
      try { rec.worker.postMessage({ id, ...payload }); } catch (err) { clearTimeout(to); rec.pending.delete(id); resolve({ ok: false, error: err.message }); }
    });
  }
  g._langRequest = langRequest;
  const LANG_EXT = /\.(ts|tsx|js|jsx|mts|cts|mjs|cjs)$/i;
  g.ipcMain.handle('galaxy:langStatus', async (e, { root } = {}) => {
    if (!root || !knownPaths.has(root)) return { ok: false, error: 'Geçersiz kök' };
    if (g.isRemotePath && g.isRemotePath(root)) return { ok: false, unavailable: true, error: 'Uzak projede yok' };
    return langRequest(root, { kind: 'status' }, 30000);
  });
  g.ipcMain.handle('galaxy:langRequest', async (e, { root, kind, file, content, line, ch, newName } = {}) => {
    if (!root || !knownPaths.has(root) || !file || !LANG_EXT.test(String(file))) return { ok: false, error: 'Desteklenmeyen dosya' };
    const full = safeJoin(root, file); if (!full) return { ok: false, error: 'Geçersiz yol' };
    const c = typeof content === 'string' && content.length > 1024 * 1024 ? content.slice(0, 1024 * 1024) : content;
    return langRequest(root, { kind: kind || 'diag', file: String(file), content: c, line: +line || 1, ch: +ch || 1, newName }, kind === 'diag' ? 30000 : 20000);
  });

  // ---------- Faz 3 / 3) Kaydette formatla + lint düzelt ----------
  const execOut = (bin, args, opts, input) => new Promise(res => {
    try {
      const child = execFile(bin, args, { cwd: opts.cwd, env: opts.env || ENV, timeout: opts.timeout || 25000, maxBuffer: 8 * 1024 * 1024 }, (err, out, errOut) => res({ ok: !err, out: String(out || ''), errOut: String(errOut || ''), code: err ? (err.code || 1) : 0 }));
      if (input != null) { try { child.stdin.end(input); } catch (e) {} }
    } catch (e) { res({ ok: false, out: '', errOut: e.message, code: -1 }); }
  });
  g.ipcMain.handle('galaxy:formatFile', async (e, { root, file, content } = {}) => {
    if (!root || !knownPaths.has(root) || !file || typeof content !== 'string') return { ok: false, error: 'Geçersiz istek' };
    const full = safeJoin(root, file); if (!full) return { ok: false, error: 'Geçersiz yol' };
    const rel = String(file), ext = (rel.match(/\.[^.]+$/) || [''])[0].toLowerCase();
    const tools = [];
    let text = content;
    const bin = n => path.join(root, 'node_modules', '.bin', n);
    const has = p => { try { return fs.existsSync(p); } catch (err) { return false; } };
    if (['.js', '.jsx', '.ts', '.tsx', '.mjs', '.cjs', '.json', '.css', '.scss', '.html', '.md', '.vue'].includes(ext)) {
      if (has(bin('prettier'))) {
        const r = await execOut(bin('prettier'), ['--stdin-filepath', full], { cwd: root }, text);
        if (r.ok && r.out) { text = r.out; tools.push('prettier'); }
      }
      if (['.js', '.jsx', '.ts', '.tsx', '.mjs', '.cjs', '.vue'].includes(ext) && has(bin('eslint'))) {
        const r = await execOut(bin('eslint'), ['--stdin', '--stdin-filename', full, '--fix-dry-run', '-f', 'json'], { cwd: root }, text);
        try { const arr = JSON.parse(r.out || '[]'); if (arr[0] && typeof arr[0].output === 'string') { text = arr[0].output; tools.push('eslint --fix'); } } catch (err) {}
      }
    } else if (ext === '.py') {
      if (has(bin('ruff')) || has('/usr/bin/which')) {
        const r = await execOut('ruff', ['format', '--stdin-filename', full, '-'], { cwd: root }, text);
        if (r.ok && r.out) { text = r.out; tools.push('ruff'); }
      }
      if (!tools.length) { const r = await execOut('black', ['-q', '-'], { cwd: root }, text); if (r.ok && r.out) { text = r.out; tools.push('black'); } }
    } else if (ext === '.go') {
      const r = await execOut('gofmt', [], { cwd: root }, text);
      if (r.ok && r.out) { text = r.out; tools.push('gofmt'); }
    } else if (ext === '.rs') {
      const r = await execOut('rustfmt', ['--edition', '2021'], { cwd: root }, text);
      if (r.ok && r.out) { text = r.out; tools.push('rustfmt'); }
    } else if (ext === '.swift') {
      const r = await execOut('swiftformat', ['--stdinpath', full, 'stdin'], { cwd: root }, text);
      if (r.ok && r.out) { text = r.out; tools.push('swiftformat'); }
    }
    if (!tools.length) return { ok: false, error: 'Bu dosya için biçimlendirici bulunamadı (prettier/eslint/ruff/gofmt…)' };
    return { ok: true, content: text, tools, changed: text !== content };
  });

  // ---------- Faz 3 / 2) Çalıştırma profilleri (package.json scriptleri) + debug ----------
  g.ipcMain.handle('galaxy:pkgScripts', async (e, { root } = {}) => {
    if (!root || !knownPaths.has(root)) return { ok: false, scripts: [] };
    try { const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8')); return { ok: true, scripts: Object.entries(pkg.scripts || {}).map(([name, cmd]) => ({ name, cmd: String(cmd) })) }; }
    catch (err) { return { ok: true, scripts: [] }; }
  });
  g.ipcMain.handle('galaxy:debugStart', async (e, { root, file } = {}) => {
    if (!root || !knownPaths.has(root) || !file) return { ok: false, error: 'Dosya gerekli' };
    const full = safeJoin(root, file); if (!full || !fs.existsSync(full)) return { ok: false, error: 'Dosya yok' };
    if (!/\.(js|mjs|cjs)$/i.test(file)) return { ok: false, error: 'Debug yalnız JS dosyalarında (TS için derlenmiş çıktıyı seç)' };
    const id = 'dbg-' + Date.now();
    const wc = e.sender;
    const child = spawn(process.execPath, ['--inspect=127.0.0.1:0', full], { cwd: root, env: { ...ENV, ELECTRON_RUN_AS_NODE: '1', FORCE_COLOR: '0' }, detached: process.platform !== 'win32' });
    const rec = { id, root, cmd: 'node --inspect ' + file, label: '🐛 debug: ' + file, started: Date.now(), status: 'running', out: '', child };
    jobs.set(id, rec);
    let wsUrl = '';
    const push = d => {
      const s = String(d); rec.out = (rec.out + s).slice(-48000);
      const m = s.match(/ws:\/\/127\.0\.0\.1:\d+\/[^\s]+/);
      if (m && !wsUrl) { wsUrl = m[0]; sendTo(wc, 'debug:ready', { id, ws: wsUrl, devtoolsUrl: 'devtools://devtools/bundled/js_app.html?experiments=true&v8only=true&ws=' + wsUrl.replace('ws://', '') }); }
      sendTo(wc, 'job:out', { id, data: s });
    };
    child.stdout.on('data', push); child.stderr.on('data', push);
    child.on('error', err => { rec.status = 'error'; rec.ended = Date.now(); sendTo(wc, 'job:done', { id, status: 'error', code: -1, label: rec.label, ms: 0 }); });
    child.on('close', code => { if (rec.status !== 'stopped') rec.status = code === 0 ? 'done' : 'error'; rec.code = code; rec.ended = Date.now(); sendTo(wc, 'job:done', { id, status: rec.status, code, label: rec.label, ms: rec.ended - rec.started }); });
    return { ok: true, id, label: rec.label };
  });

  // ---------- Faz 4) Yerleşik debugger (CDP: breakpoint / adım / değişkenler) ----------
  const dbgSessions = new Map();
  function cdpSend(s, method, params) {
    return new Promise((res, rej) => {
      if (!s.ws || s.ws.readyState !== 1) { rej(new Error('CDP kapalı')); return; }
      const id = ++s.seq;
      s.pending.set(id, { res, rej });
      try { s.ws.send(JSON.stringify({ id, method, params: params || {} })); } catch (e) { s.pending.delete(id); rej(e); }
    });
  }
  g.ipcMain.handle('galaxy:dbgStart', async (e, { root, file, breakpoints } = {}) => {
    if (!root || !knownPaths.has(root) || !file) return { ok: false, error: 'Dosya gerekli' };
    const full = safeJoin(root, file); if (!full || !fs.existsSync(full)) return { ok: false, error: 'Dosya yok' };
    if (!/\.(js|mjs|cjs)$/i.test(file)) return { ok: false, error: 'Debugger yalnız JS dosyalarında' };
    if (typeof WebSocket === 'undefined') return { ok: false, error: 'WebSocket yok (CDP kurulamadı)' };
    const id = 'dbg-' + Date.now();
    const wc = e.sender;
    const emit = (kind, data) => sendTo(wc, 'dbg:event', { id, kind, ...(data || {}) });
    const child = spawn(process.execPath, ['--inspect-brk=127.0.0.1:0', full], { cwd: root, env: { ...ENV, ELECTRON_RUN_AS_NODE: '1', FORCE_COLOR: '0' }, detached: process.platform !== 'win32' });
    const rec = { id, root, cmd: 'node --inspect-brk ' + file, label: '🐛 debug: ' + file, started: Date.now(), status: 'running', out: '', child };
    jobs.set(id, rec);
    const s = { id, child, ws: null, seq: 0, pending: new Map(), bps: new Map(), fileUrl: 'file://' + full, fullPath: full, file: String(file), wc };
    dbgSessions.set(id, s);
    let wsUrl = '';
    const wsReady = new Promise(resolve => {
      const to = setTimeout(() => resolve(''), 9000);
      const onData = d => {
        const str = String(d); rec.out = (rec.out + str).slice(-48000);
        sendTo(wc, 'job:out', { id, data: str });
        const m = str.match(/ws:\/\/127\.0\.0\.1:\d+\/[^\s]+/);
        if (m && !wsUrl) { wsUrl = m[0]; clearTimeout(to); resolve(wsUrl); }
      };
      child.stdout.on('data', onData); child.stderr.on('data', onData);
    });
    child.on('error', err => { rec.status = 'error'; rec.ended = Date.now(); emit('ended', { code: -1, error: err.message }); sendTo(wc, 'job:done', { id, status: 'error', code: -1, label: rec.label, ms: 0 }); });
    child.on('close', code => {
      if (rec.status !== 'stopped') rec.status = code === 0 ? 'done' : 'error';
      rec.code = code; rec.ended = Date.now();
      try { if (s.ws) s.ws.close(); } catch (err) {}
      for (const p of s.pending.values()) p.rej(new Error('oturum bitti'));
      s.pending.clear(); dbgSessions.delete(id);
      emit('ended', { code });
      sendTo(wc, 'job:done', { id, status: rec.status, code, label: rec.label, ms: rec.ended - rec.started });
    });
    const wsEndpoint = await wsReady;
    if (!wsEndpoint) return { ok: false, id, error: 'Inspector adresi alınamadı' };
    try {
      const ws = new WebSocket(wsEndpoint);
      s.ws = ws;
      await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; setTimeout(() => rej(new Error('WS zaman aşımı')), 8000); });
      ws.onmessage = async (ev) => {
        let msg; try { msg = JSON.parse(String(ev.data)); } catch (err) { return; }
        if (msg.id && s.pending.has(msg.id)) { const p = s.pending.get(msg.id); s.pending.delete(msg.id); if (msg.error) p.rej(new Error(msg.error.message || 'CDP hata')); else p.res(msg.result || {}); return; }
        if (msg.method === 'Debugger.paused') {
          // Giriş duraklamasını (inspect-brk) sessizce geç: ilk breakpoint'e kadar koş.
          // Resume, runIfWaitingForDebugger öncesi yutulabilir; dbgStart sonunda gecikmeli tekrar denenir.
          if (!s._entryResumed && msg.params.reason !== 'breakpoint' && msg.params.reason !== 'exception') {
            s._entryResumed = true; s._lastPauseWasEntry = true;
            try { await cdpSend(s, 'Debugger.resume'); } catch (err) {}
            return;
          }
          s._lastPauseWasEntry = false;
          const frame = (msg.params.callFrames || [])[0];
          if (!frame) { emit('paused', { vars: [], stack: [] }); return; }
          const vars = [];
          for (const sc of (frame.scopeChain || []).slice(0, 3)) {
            if (!sc.object || !sc.object.objectId || sc.type === 'global') continue;
            try {
              const props = await cdpSend(s, 'Runtime.getProperties', { objectId: sc.object.objectId, ownProperties: true });
              for (const pr of (props.result || []).slice(0, 30)) {
                const v = pr.value || {};
                vars.push({ name: pr.name, value: String(v.value !== undefined ? v.value : (v.description || v.type || '')).slice(0, 120) });
                if (vars.length >= 40) break;
              }
            } catch (err) {}
            if (vars.length >= 40) break;
          }
          emit('paused', {
            file: s.file, line: (frame.location.lineNumber || 0) + 1, fn: frame.functionName || '(anonim)',
            vars, stack: (msg.params.callFrames || []).slice(0, 8).map(f => ({ fn: f.functionName || '(anonim)', line: (f.location.lineNumber || 0) + 1 })),
          });
        } else if (msg.method === 'Debugger.resumed') emit('resumed', {});
        else if (msg.method === 'Runtime.executionContextDestroyed') { try { ws.close(); } catch (err) {} }
      };
      ws.onclose = () => { for (const p of s.pending.values()) p.rej(new Error('CDP kapandı')); s.pending.clear(); };
      await cdpSend(s, 'Debugger.enable');
      await cdpSend(s, 'Runtime.enable');
      let realFull = full; try { realFull = fs.realpathSync(full); } catch (err) {}
      const escRe = s2 => String(s2).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      s.urlRegex = '^(file://)?(' + escRe(full) + '|' + escRe(realFull) + ')$';
      for (const line of (Array.isArray(breakpoints) ? breakpoints : [])) {
        try { const r = await cdpSend(s, 'Debugger.setBreakpointByUrl', { urlRegex: s.urlRegex, lineNumber: Math.max(0, (+line || 1) - 1) }); if (r.breakpointId) s.bps.set(+line, r.breakpointId); } catch (err) {}
      }
      await cdpSend(s, 'Runtime.runIfWaitingForDebugger');
      setTimeout(() => { if (s._lastPauseWasEntry && dbgSessions.has(id)) { s._lastPauseWasEntry = false; cdpSend(s, 'Debugger.resume').catch(() => {}); } }, 500);
      emit('started', { file: s.file });
      return { ok: true, id, label: rec.label };
    } catch (err) {
      try { killJobTree(rec); } catch (e2) {}
      return { ok: false, id, error: 'CDP bağlanamadı: ' + err.message };
    }
  });
  g.ipcMain.handle('galaxy:dbgBreakpoint', async (e, { id, line, on } = {}) => {
    const s = dbgSessions.get(id); if (!s) return { ok: false, error: 'Oturum yok' };
    const ln = +line || 1;
    try {
      if (on) { const r = await cdpSend(s, 'Debugger.setBreakpointByUrl', { urlRegex: s.urlRegex || ('^(file://)?' + String(s.fullPath || s.file).replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '$'), lineNumber: ln - 1 }); if (r.breakpointId) s.bps.set(ln, r.breakpointId); }
      else { const bpId = s.bps.get(ln); if (bpId) await cdpSend(s, 'Debugger.removeBreakpoint', { breakpointId: bpId }); s.bps.delete(ln); }
      return { ok: true };
    } catch (err) { return { ok: false, error: err.message }; }
  });
  g.ipcMain.handle('galaxy:dbgResume', async (e, { id } = {}) => { const s = dbgSessions.get(id); if (!s) return { ok: false }; try { await cdpSend(s, 'Debugger.resume'); return { ok: true }; } catch (err) { return { ok: false, error: err.message }; } });
  g.ipcMain.handle('galaxy:dbgStep', async (e, { id, kind } = {}) => { const s = dbgSessions.get(id); if (!s) return { ok: false }; const m = kind === 'into' ? 'Debugger.stepInto' : kind === 'out' ? 'Debugger.stepOut' : 'Debugger.stepOver'; try { await cdpSend(s, m); return { ok: true }; } catch (err) { return { ok: false, error: err.message }; } });
  g.ipcMain.handle('galaxy:dbgStop', (e, { id } = {}) => {
    const s = dbgSessions.get(id); const j = jobs.get(id);
    if (s) { try { if (s.ws) s.ws.close(); } catch (err) {} dbgSessions.delete(id); }
    if (j) { killJobTree(j); j.status = 'stopped'; }
    return { ok: true };
  });

  // ---------- Faz 3 / 4) GitHub paneli (gh CLI) ----------
  g.ipcMain.handle('galaxy:ghPrList', async (e, { root } = {}) => {
    if (!root || !knownPaths.has(root)) return { ok: false, prs: [], error: 'Geçersiz kök' };
    const auth = await execOut('gh', ['auth', 'status'], { cwd: root, timeout: 15000 });
    if (!auth.ok && !/Logged in/i.test(auth.errOut + auth.out)) return { ok: false, prs: [], error: 'gh oturumu yok — terminalde `gh auth login` çalıştır', noGh: /ENOENT/.test(auth.errOut) };
    const r = await execOut('gh', ['pr', 'list', '--limit', '30', '--json', 'number,title,state,headRefName,author,url,isDraft,updatedAt,statusCheckRollup'], { cwd: root, timeout: 30000 });
    if (!r.ok) return { ok: false, prs: [], error: (r.errOut || 'PR listesi alınamadı').slice(0, 200) };
    let prs = [];
    try {
      prs = JSON.parse(r.out || '[]').map(p => {
        const checks = Array.isArray(p.statusCheckRollup) ? p.statusCheckRollup : [];
        let ci = 'none';
        if (checks.length) {
          const conc = checks.map(c => String(c.conclusion || c.state || '').toUpperCase());
          if (conc.some(c => c === 'FAILURE' || c === 'ERROR' || c === 'TIMED_OUT')) ci = 'fail';
          else if (conc.every(c => c === 'SUCCESS' || c === 'NEUTRAL' || c === 'SKIPPED')) ci = 'pass';
          else ci = 'pending';
        }
        return { number: p.number, title: p.title, state: p.state, branch: p.headRefName, author: (p.author || {}).login || '', url: p.url, draft: !!p.isDraft, updatedAt: p.updatedAt, ci };
      });
    } catch (err) { return { ok: false, prs: [], error: 'gh çıktısı çözülemedi' }; }
    return { ok: true, prs };
  });
  g.ipcMain.handle('galaxy:ghPrCreateWeb', async (e, { root } = {}) => {
    if (!root || !knownPaths.has(root)) return { ok: false, error: 'Geçersiz kök' };
    const r = await execOut('gh', ['pr', 'create', '--web'], { cwd: root, timeout: 20000 });
    return r.ok ? { ok: true } : { ok: false, error: (r.errOut || 'PR oluşturma açılamadı (önce push gerekebilir)').slice(0, 240) };
  });

  // ---------- Faz 3 / 5) Git derinliği: dallar, stash, çakışmalar ----------
  const gitRun = async (projectId, args, timeout) => {
    const gr = await gitOk(projectId); if (gr.error) return { ok: false, error: gr.error };
    const r = await g.execGit(gr.proj.path, args, timeout || 20000);
    return { ok: !!r.ok, out: String(r.out || ''), error: r.ok ? undefined : String(r.out || 'git hatası').slice(0, 300), root: gr.proj.path };
  };
  g.ipcMain.handle('galaxy:gitBranches', async (e, { projectId } = {}) => {
    const r = await gitRun(projectId, ['branch', '-a', '--format=%(refname:short)%09%(HEAD)']);
    if (!r.ok) return { ok: false, error: r.error };
    const seen = new Set(); const branches = [];
    for (const line of r.out.split('\n')) {
      if (!line.trim()) continue;
      const [name, head] = line.split('\t');
      const remote = name.startsWith('origin/') || name.includes('/');
      const short = name.replace(/^origin\//, '');
      if (name.includes('HEAD')) continue;
      const key = (remote ? 'r:' : 'l:') + short;
      if (seen.has(key)) continue; seen.add(key);
      branches.push({ name: short, full: name, current: head === '*', remote });
    }
    const cur = await gitRun(projectId, ['rev-parse', '--abbrev-ref', 'HEAD']);
    return { ok: true, branches: branches.slice(0, 120), current: cur.ok ? cur.out.trim() : '' };
  });
  g.ipcMain.handle('galaxy:gitSwitchBranch', async (e, { projectId, branch, create } = {}) => {
    const b = String(branch || '').trim();
    if (!b || /[\s;|&$`]/.test(b)) return { ok: false, error: 'Geçersiz dal adı' };
    const r = await gitRun(projectId, create ? ['switch', '-c', b] : ['switch', b]);
    return r.ok ? { ok: true } : { ok: false, error: r.error };
  });
  g.ipcMain.handle('galaxy:gitStashList', async (e, { projectId } = {}) => {
    const r = await gitRun(projectId, ['stash', 'list', '--format=%gd%x09%gs%x09%ci']);
    if (!r.ok) return { ok: false, error: r.error };
    const stashes = r.out.split('\n').filter(Boolean).map(l => { const [ref, msg, date] = l.split('\t'); return { ref, msg: msg || '', date: (date || '').slice(0, 16) }; });
    return { ok: true, stashes };
  });
  g.ipcMain.handle('galaxy:gitStashPush', async (e, { projectId, msg, includeUntracked } = {}) => {
    const args = ['stash', 'push']; if (includeUntracked) args.push('-u');
    args.push('-m', String(msg || 'galaxy-stash').slice(0, 80) || 'galaxy-stash');
    const r = await gitRun(projectId, args);
    return r.ok ? { ok: true, out: r.out.trim() } : { ok: false, error: r.error };
  });
  g.ipcMain.handle('galaxy:gitStashApply', async (e, { projectId, ref, pop } = {}) => {
    const rf = String(ref || 'stash@{0}');
    if (!/^stash@\{\d+\}$/.test(rf)) return { ok: false, error: 'Geçersiz stash' };
    const r = await gitRun(projectId, ['stash', pop ? 'pop' : 'apply', rf]);
    return r.ok ? { ok: true } : { ok: false, error: r.error };
  });
  g.ipcMain.handle('galaxy:gitStashDrop', async (e, { projectId, ref } = {}) => {
    const rf = String(ref || '');
    if (!/^stash@\{\d+\}$/.test(rf)) return { ok: false, error: 'Geçersiz stash' };
    const r = await gitRun(projectId, ['stash', 'drop', rf]);
    return r.ok ? { ok: true } : { ok: false, error: r.error };
  });
  g.ipcMain.handle('galaxy:gitConflictVersions', async (e, { projectId, file } = {}) => {
    const gr = await gitOk(projectId); if (gr.error) return { ok: false, error: gr.error };
    const f = String(file || '').replace(/^\/+/, '');
    if (!f) return { ok: false, error: 'Dosya yok' };
    const stage = async n => { const r = await g.execGit(gr.proj.path, ['show', ':' + n + ':' + f], 20000); return r.ok ? String(r.out || '').slice(0, 400 * 1024) : null; };
    const [base, ours, theirs] = [await stage(1), await stage(2), await stage(3)];
    let current = null; try { current = fs.readFileSync(path.join(gr.proj.path, f), 'utf8').slice(0, 400 * 1024); } catch (err) {}
    return { ok: true, base, ours, theirs, current };
  });
  g.ipcMain.handle('galaxy:gitResolveConflict', async (e, { projectId, file, content } = {}) => {
    const gr = await gitOk(projectId); if (gr.error) return { ok: false, error: gr.error };
    const full = safeJoin(gr.proj.path, String(file || '')); if (!full) return { ok: false, error: 'Geçersiz yol' };
    try { fs.mkdirSync(path.dirname(full), { recursive: true }); fs.writeFileSync(full, String(content == null ? '' : content), 'utf8'); } catch (err) { return { ok: false, error: err.message }; }
    const r = await g.execGit(gr.proj.path, ['add', '--', String(file)], 20000);
    return r.ok ? { ok: true } : { ok: false, error: r.out || 'stage edilemedi' };
  });
  g.ipcMain.handle('galaxy:gitConflicts', async (e, { projectId } = {}) => {
    const r = await gitRun(projectId, ['diff', '--name-only', '--diff-filter=U']);
    if (!r.ok) return { ok: false, error: r.error };
    const files = r.out.split('\n').map(s => s.trim()).filter(Boolean);
    return { ok: true, conflicts: files };
  });

  // ---------- 10) Uzak (SSH) dosya yazma: base64 ile güvenli aktarım ----------
  g.ipcMain.handle('galaxy:remoteFileWrite', async (e, { root, rel, content } = {}) => {
    if (!g.isRemotePath || !g.isRemotePath(root)) return { ok: false, error: 'Uzak kök değil' };
    const t = g.remoteSrv ? g.remoteSrv(root) : null;
    if (!t) return { ok: false, error: 'Sunucu bulunamadı' };
    const sub = g.safeRel ? g.safeRel(rel) : null;
    if (sub === null || !sub) return { ok: false, error: 'Geçersiz yol' };
    const full = t.path + '/' + sub;
    const text = String(content == null ? '' : content);
    if (text.length > 512 * 1024) return { ok: false, error: 'Dosya çok büyük (512KB sınır)' };
    const b64 = Buffer.from(text, 'utf8').toString('base64');
    const dir = full.split('/').slice(0, -1).join('/') || '/';
    const cmd = 'mkdir -p ' + g.shq(dir) + ' && printf %s ' + g.shq(b64) + ' | base64 -d > ' + g.shq(full) + ' && wc -c < ' + g.shq(full);
    const r = await g.sshExec(t.srv, cmd, 40000);
    if (!r.ok) return { ok: false, error: r.error || 'yazılamadı' };
    return { ok: true, size: +String(r.out || '').trim() || text.length };
  });
};
