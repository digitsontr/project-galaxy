// Sprint J — davranış taşındı; kopyalanmadı.
// Faz 5: eval-blob açıldı — gövde birebir aynı kod; artık satır satır okunur, diff'lenir,
// hata izinde gerçek satır numarası verir. with(g) bilinçli: çıplak isimler paylaşılan g'ye
// çözülür, g.X = ... atamaları bu modülün çıktısıdır. (Bu yüzden dosya başında 'use strict' yok.)
module.exports = function register(g) {
  with (g) {
function defaultAgents(lang) {
  const en = lang === 'en';
  return [
    {
      id: 'cto', name: 'ATLAS', role: 'CTO', color: '#61dcff', write: false, presets: [],
      prompt: en
        ? 'You are ATLAS — the user\'s personal CTO. You watch over all of their software projects. Your job: report status clearly, honestly, with an executive eye. Format: (1) Executive summary in 2-3 sentences, (2) Projects needing attention and why, (3) Risks / blockers, (4) Concrete next steps (max 5, by priority). No empty praise; state problems plainly. Be concise.'
        : 'Sen ATLAS\'sın — kullanıcının kişisel CTO\'su. Onun tüm yazılım projelerini izliyorsun. Görevin: durumu net, dürüst ve yönetici bakışıyla raporlamak. Rapor formatın: (1) Yönetici özeti 2-3 cümle, (2) Dikkat gerektiren projeler ve nedenleri, (3) Riskler / tıkanıklıklar, (4) Somut sonraki adımlar (en fazla 5 madde, öncelik sırasıyla). Gereksiz övgü yapma, sorunları açıkça söyle. Kısa ve öz yaz.'
    },
    {
      id: 'pm', name: 'NAVIGATOR', role: 'PM', color: '#ffd166', write: false, presets: [],
      prompt: en
        ? 'You are NAVIGATOR — the user\'s project manager. You track progress, plans and neglect. Your job: run standups, surface neglected projects and stuck plan items, and hold the user accountable in a constructive tone. Be specific: name projects, counts and dates. Be concise.'
        : 'Sen NAVIGATOR\'sın — kullanıcının proje yöneticisi. İlerlemeyi, planları ve ihmalleri takip ediyorsun. Görevin: standup yapmak, ihmal edilen projeleri ve tıkanan plan maddelerini öne çıkarmak, yapıcı bir tonda hesap sormak. Somut ol: proje adı, sayı ve tarih ver. Kısa yaz.'
    },
    {
      id: 'doc', name: 'DOCUMENTOR', role: en ? 'Documentation' : 'Dokümantasyon', color: '#7bd88f', write: true, presets: [],
      prompt: en
        ? 'You are DOCUMENTOR — the user\'s documentation agent. You can read project files and WRITE documentation (README.md etc.) when asked. Write clear, structured, honest docs that reflect the actual state of the code. Never invent features that do not exist.'
        : 'Sen DOCUMENTOR\'sın — kullanıcının dokümantasyon ajanı. Proje dosyalarını okuyabilir ve istendiğinde dokümantasyon (README.md vb.) YAZABİLİRSİN. Kodun gerçek durumunu yansıtan, net ve yapılandırılmış dokümanlar yaz. Var olmayan özellik uydurma.'
    },
    {
      id: 'forge', name: 'FORGE', role: en ? 'Code Review' : 'Kod Denetçisi', color: '#ff7bd8', write: false, presets: [],
      prompt: en
        ? 'You are FORGE — the user\'s code quality inspector. You READ code but never modify it. Your job: scan for technical debt, risky patterns, missing tests and security smells; report findings ranked by severity with file references. Be blunt but constructive.'
        : 'Sen FORGE\'sun — kullanıcının kod kalite denetçisi. Kodu OKURSUN ama asla değiştirmezsin. Görevin: teknik borcu, riskli kalıpları, eksik testleri ve güvenlik kokularını taramak; bulguları önem sırasına göre dosya referanslarıyla raporlamak. Açık sözlü ama yapıcı ol.'
    },
    {
      id: 'mentor', name: 'MENTOR', role: en ? 'Coach' : 'Koç', color: '#b78bff', write: false, presets: [],
      prompt: en
        ? 'You are MENTOR — the user\'s personal coach. You look at their projects as a whole and help with focus, motivation and planning. Suggest realistic weekly plans, celebrate real progress, and gently point out overcommitment. Warm but honest.'
        : 'Sen MENTOR\'sun — kullanıcının kişisel koçu. Projelerin bütününe bakar; odak, motivasyon ve planlama konusunda yardım edersin. Gerçekçi haftalık planlar öner, gerçek ilerlemeyi takdir et, fazla iş yüklenmeyi nazikçe söyle. Sıcak ama dürüst ol.'
    }
  ];
}

function loadData() {
  try {
    const d = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
    if (!d.universes) d.universes = [];
    d.projects = d.projects || {};
    if (!d.agents || !d.agents.length) {
      d.agents = defaultAgents((d.profile && d.profile.lang) || 'tr');
    }
    return d;
  } catch (e) {
    return { universes: [], projects: {}, agents: defaultAgents('tr') };
  }
}

function saveData(data) {
  // Günlük yedek: o günün ilk kaydından önce mevcut dosyanın anlık görüntüsü alınır (14 gün saklanır)
  try {
    const bdir = path.join(DATA_DIR, 'backups');
    fs.mkdirSync(bdir, { recursive: true });
    const today = new Date().toISOString().slice(0, 10);
    const bfile = path.join(bdir, `galaxy-data-${today}.json`);
    if (!fs.existsSync(bfile) && fs.existsSync(DATA_FILE)) {
      fs.copyFileSync(DATA_FILE, bfile);
      const files = fs.readdirSync(bdir).filter(f => f.startsWith('galaxy-data-')).sort();
      while (files.length > 14) fs.unlinkSync(path.join(bdir, files.shift()));
    }
  } catch (e) {}

  const json = JSON.stringify(data, null, 2);
  try { fs.mkdirSync(DATA_DIR, { recursive: true }); } catch (e) {}
  fs.writeFileSync(DATA_FILE, json, 'utf8');
  // Arayüzün açılış tohumu (window.GALAXY_DATA) — geliştirmede uygulama
  // klasörüne de yazılır; paketli app'te o konum salt-okunur olduğundan sessizce atlanır
  try { fs.writeFileSync(path.join(DATA_DIR, 'galaxy-data.js'), 'window.GALAXY_DATA = ' + json + ';', 'utf8'); } catch (e) {}
  try { if (path.resolve(APP_DIR) !== path.resolve(DATA_DIR)) fs.writeFileSync(path.join(APP_DIR, 'galaxy-data.js'), 'window.GALAXY_DATA = ' + json + ';', 'utf8'); } catch (e) {}
  scheduleAutoCommit();
}

// ---------- otomatik git versiyonlama ----------
let commitTimer = null;
function scheduleAutoCommit() {
  clearTimeout(commitTimer);
  commitTimer = setTimeout(autoCommit, 30000); // son kayıttan 30 sn sonra sessiz commit
}
function autoCommit() {
  const gitDir = path.join(DATA_DIR, '.git');
  if (!fs.existsSync(gitDir)) return;
  // bayat kilitleri temizle (yarım kalmış işlemlerden)
  for (const lock of ['HEAD.lock', 'index.lock', path.join('objects', 'maintenance.lock')]) {
    const lp = path.join(gitDir, lock);
    try {
      if (fs.existsSync(lp) && Date.now() - fs.statSync(lp).mtimeMs > 60000) fs.unlinkSync(lp);
    } catch (e) {}
  }
  const { exec } = require('child_process');
  const msg = 'oto: veri güncellemesi ' + new Date().toISOString().slice(0, 16).replace('T', ' ');
  exec(`git add -A && git -c user.name="Project Galaxy" -c user.email="galaxy@local" commit -qm "${msg}"`,
    { cwd: DATA_DIR, env: ENV }, () => { /* değişiklik yoksa sessizce geçer */ });
}

const IGNORE = new Set(['node_modules', '.git', '.DS_Store', 'build', 'dist', '.venv', 'venv', 'myenv', '__pycache__', '.gradle', 'DerivedData', 'Pods']);
// ---------- kullanıcı ayarları (uyarı eşikleri vb.) ----------
const DEFAULT_SETTINGS = { staleDays: 2, planPending: 5, claudePath: '', terminalApp: 'Terminal', sshTimeout: 8, focusMin: 25, assistantBio: '', mcpServers: [], mailBriefTool: '', mailSendTool: '', mailTo: '', mailListTool: '', mailReadTool: '', uiTheme: 'apex' };
function normalizeMcpServers(raw) {
  const list = Array.isArray(raw) ? raw : [];
  return list.slice(0, 8).map((s, i) => {
    const args = Array.isArray(s && s.args) ? s.args.map(a => String(a)) : String((s && s.args) || '').split(/\s+/).filter(Boolean);
    const env = (s && typeof s.env === 'object' && !Array.isArray(s.env) && s.env) ? s.env : {};
    return {
      id: String((s && s.id) || ('mcp-' + (i + 1))).slice(0, 40),
      command: String((s && s.command) || '').trim(),
      args,
      env
    };
  }).filter(s => s.command);
}
function getSettings(data) {
  const s = (data && data.settings) || {};
  return {
    staleDays: DEFAULT_SETTINGS.staleDays,
    planPending: DEFAULT_SETTINGS.planPending,
    claudePath: String(s.claudePath || '').trim(),
    terminalApp: (s.terminalApp === 'iTerm') ? 'iTerm' : 'Terminal',
    sshTimeout: Math.min(60, Math.max(3, +s.sshTimeout || DEFAULT_SETTINGS.sshTimeout)),
    focusMin: DEFAULT_SETTINGS.focusMin,
    assistantBio: String(s.assistantBio || '').slice(0, 2000),
    mcpServers: normalizeMcpServers(s.mcpServers),
    mailBriefTool: String(s.mailBriefTool || '').trim(),
    mailSendTool: String(s.mailSendTool || '').trim(),
    mailTo: String(s.mailTo || '').trim(),
    mailListTool: String(s.mailListTool || '').trim(),
    mailReadTool: String(s.mailReadTool || '').trim(),
    uiTheme: 'apex'
  };
}
// Yapılandırılabilir tüketiciler için kısa yardımcılar (her çağrıda güncel ayarı okur)
let _claudeResolved = '';
function claudeLooksBin(p) {
  if (!p) return false;
  try {
    if (!fs.existsSync(p)) return false;
    if (process.platform === 'win32') return true;
    fs.accessSync(p, fs.constants.X_OK);
    return true;
  } catch (e) { return false; }
}
function claudeExpand(p) {
  p = String(p || '').trim();
  if (!p) return '';
  if (p === '~') return os.homedir();
  if (p.startsWith('~/')) return path.join(os.homedir(), p.slice(2));
  return p;
}
function claudeCandidatePaths() {
  const home = os.homedir();
  const win = process.platform === 'win32';
  const names = win ? ['claude.exe', 'claude.cmd', 'claude'] : ['claude'];
  const dirs = [];
  const add = d => { if (d && !dirs.includes(d)) dirs.push(d); };
  if (win) {
    add(path.join(process.env.APPDATA || '', 'npm'));
    add(path.join(process.env.LOCALAPPDATA || '', 'npm'));
    add('C:\\Program Files\\nodejs');
    add(path.join(home, '.local', 'bin'));
  } else {
    add('/opt/homebrew/bin');
    add('/usr/local/bin');
    add(path.join(home, '.local', 'bin'));
  }
  add(path.join(home, '.volta', 'bin'));
  add(path.join(home, '.asdf', 'shims'));
  add(path.join(home, '.fnm', 'aliases', 'default', 'bin'));
  try {
    const nvm = path.join(home, '.nvm', 'versions', 'node');
    if (fs.existsSync(nvm)) for (const v of fs.readdirSync(nvm)) add(path.join(nvm, v, 'bin'));
  } catch (e) {}
  try {
    const fnm = path.join(home, '.local', 'share', 'fnm', 'node-versions');
    if (fs.existsSync(fnm)) for (const v of fs.readdirSync(fnm)) add(path.join(fnm, v, 'installation', 'bin'));
  } catch (e) {}
  if (process.env.npm_config_prefix) add(win ? process.env.npm_config_prefix : path.join(process.env.npm_config_prefix, 'bin'));
  for (const d of String((ENV && ENV.PATH) || '').split(path.delimiter)) add(d);
  const out = [];
  for (const d of dirs) for (const n of names) out.push(path.join(d, n));
  return out;
}
function discoverClaudeSync() {
  for (const p of claudeCandidatePaths()) if (claudeLooksBin(p)) return p;
  try {
    const { execFileSync } = require('child_process');
    const cmd = process.platform === 'win32' ? 'where' : 'which';
    const found = String(execFileSync(cmd, ['claude'], { timeout: 3000, env: ENV, encoding: 'utf8' })).trim().split(/\r?\n/)[0] || '';
    if (claudeLooksBin(found)) return found;
  } catch (e) {}
  return '';
}
function npmGlobalClaude() {
  return new Promise(res => {
    execFile('npm', ['prefix', '-g'], { timeout: 2500, env: ENV }, (err, out) => {
      if (err) return res('');
      const prefix = String(out || '').trim();
      if (!prefix) return res('');
      const cand = process.platform === 'win32' ? path.join(prefix, 'claude.cmd') : path.join(prefix, 'bin', 'claude');
      res(claudeLooksBin(cand) ? cand : '');
    });
  });
}
function claudeBin() {
  try {
    const configured = claudeExpand(getSettings(loadData()).claudePath);
    if (configured && path.isAbsolute(configured) && claudeLooksBin(configured)) {
      _claudeResolved = configured; return configured;
    }
    if (_claudeResolved && claudeLooksBin(_claudeResolved)) return _claudeResolved;
    const found = discoverClaudeSync();
    if (found) { _claudeResolved = found; return found; }
    return configured || 'claude';
  } catch (e) { return 'claude'; }
}
function whichClaudeLogin() {
  return new Promise(res => {
    if (process.platform === 'win32') {
      execFile('where', ['claude'], { timeout: 4000, env: ENV, windowsHide: true }, (err, out) => {
        const found = String(out || '').trim().split(/\r?\n/)[0] || '';
        res((!err && claudeLooksBin(found)) ? found : '');
      });
      return;
    }
    const shell = process.env.SHELL || (process.platform === 'darwin' ? '/bin/zsh' : '/bin/bash');
    execFile(shell, ['-lc', 'which claude'], { timeout: 5000, env: ENV }, (err, out) => {
      const found = String(out || '').trim().split(/\n/)[0] || '';
      res((!err && claudeLooksBin(found)) ? found : '');
    });
  });
}
function probeClaude(bin) {
  bin = claudeExpand(bin);
  return new Promise(res => {
    if (!bin) return res('');
    if (path.isAbsolute(bin)) return res(claudeLooksBin(bin) ? bin : '');
    const cmd = process.platform === 'win32' ? 'where' : 'which';
    execFile(cmd, [bin], { timeout: 3000, env: ENV }, (err, out) => {
      const found = String(out || '').trim().split(/\r?\n/)[0] || '';
      res((!err && found) ? found : '');
    });
  });
}
ipcMain.handle('galaxy:claudeCheck', async (e, opts) => {
  const miss = { ok: false, error: 'Claude bulunamadı. Terminalde: npm install -g @anthropic-ai/claude-code — sonra Dene.' };
  try {
    const typed = claudeExpand((opts && opts.path != null) ? opts.path : ((getSettings(loadData()).claudePath) || ''));
    let found = typed ? await probeClaude(typed) : '';
    let discovered = false;
    if (!found) {
      found = discoverClaudeSync() || await npmGlobalClaude() || await whichClaudeLogin();
      if (found) discovered = true;
    }
    if (!found) return miss;
    _claudeResolved = found;
    return { ok: true, path: found, discovered };
  } catch (e) { return miss; }
});

// GitHub CLI oturumu — Takım Akışı'ndaki PR adımları için sağlık sinyali (yalnız okur, değişiklik yapmaz).
ipcMain.handle('galaxy:githubCheck', async () => {
  return await new Promise(res => {
    execFile('gh', ['auth', 'status'], { timeout: 4000 }, (err) => {
      if (!err) return res({ ok: true });
      const msg = String((err && err.message) || '');
      if (/ENOENT/.test(msg)) return res({ ok: false, error: 'gh CLI kurulu değil' });
      res({ ok: false, error: 'gh oturumu yok — gh auth login çalıştır' });
    });
  });
});

// Proaktif uyarılar — deterministik, anında (Claude gerekmez)
function buildAlerts(projects, st) {
  st = st || DEFAULT_SETTINGS;
  const alerts = [];
  for (const p of projects) {
    if (p.status !== 'active') continue;
    const pending = p.plan.filter(i => !i.done).length;
    if (p.staleDays >= st.staleDays) alerts.push({ projectId: p.id, msg: `${p.name}: ${p.staleDays} gündür hareket yok` });
    if (pending >= st.planPending) alerts.push({ projectId: p.id, msg: `${p.name}: ${pending} bekleyen plan maddesi` });
  }
  return alerts.slice(0, 12);
}

// Ajanlar için tüm projelerin kompakt durumu
function buildDigest() {
  const { universes, projects } = scanProjects();
  const lines = [];
  for (const u of universes) {
    lines.push(`## ${u.name}`);
    for (const p of projects.filter(x => x.universe === u.id)) {
      const done = p.plan.filter(i => i.done).length;
      lines.push(`- ${p.name} [${p.status}] %${p.progress} | aşama: ${p.stage || '-'} | plan: ${done}/${p.plan.length} | son değişiklik: ${(p.mtime || '').slice(0, 10)}${p.notes ? ` | not: ${p.notes.slice(0, 140)}` : ''}`);
      for (const it of p.plan.filter(i => !i.done).slice(0, 4)) lines.push(`    bekleyen: ${it.text}`);
    }
  }
  return lines.join('\n');
}

g.defaultAgents = defaultAgents;
g.loadData = loadData;
g.saveData = saveData;
g.scheduleAutoCommit = scheduleAutoCommit;
g.autoCommit = autoCommit;
g.normalizeMcpServers = normalizeMcpServers;
g.getSettings = getSettings;
g.claudeBin = claudeBin;
g.discoverClaudeSync = discoverClaudeSync;
g.buildAlerts = buildAlerts;
g.buildDigest = buildDigest;
g.commitTimer = commitTimer;
g.IGNORE = IGNORE;
g.DEFAULT_SETTINGS = DEFAULT_SETTINGS;
  }
};
