const { app, BrowserWindow, ipcMain, shell, Tray, Menu, nativeImage, globalShortcut, dialog, safeStorage } = require('electron');
const fs = require('fs');
const path = require('path');
const { spawn, execFile } = require('child_process');

const APP_DIR = __dirname;
// Veri dosyası: paketlenmiş app'te bundle dışında (PAPILON/ProjectGalaxy) aranır
const os = require('os');
const DATA_DIR = [
  process.env.GALAXY_DATA_DIR,
  path.join(os.homedir(), 'Desktop', 'PAPILON', 'ProjectGalaxy'),
  APP_DIR,
].find(d => { try { return d && fs.existsSync(path.join(d, 'galaxy-data.json')); } catch (e) { return false; } }) || APP_DIR;
const DATA_FILE = path.join(DATA_DIR, 'galaxy-data.json');

// GUI'den açılınca PATH kısıtlı olur; node/claude için genişlet
const ENV = { ...process.env, PATH: `${process.env.PATH || ''}:/opt/homebrew/bin:/usr/local/bin:${process.env.HOME}/.local/bin` };

function loadData() {
  try {
    const d = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
    if (!d.universes) {
      d.universes = [{ id: 'is', name: 'İş Evreni', subtitle: 'PAPILON', root: '..', prefix: '', expandDirs: d.expandDirs || [] }];
    }
    d.projects = d.projects || {};
    if (!d.agents) {
      d.agents = [{
        id: 'cto',
        name: 'ATLAS',
        role: 'CTO',
        prompt: 'Sen ATLAS\'sın — Furkan\'ın kişisel CTO\'su. Onun tüm yazılım projelerini izliyorsun. Görevin: durumu net, dürüst ve yönetici bakışıyla raporlamak. Rapor formatın: (1) Yönetici özeti 2-3 cümle, (2) Dikkat gerektiren projeler ve nedenleri, (3) Riskler / tıkanıklıklar, (4) Somut sonraki adımlar (en fazla 5 madde, öncelik sırasıyla). Gereksiz övgü yapma, sorunları açıkça söyle. Kısa ve öz yaz.'
      }];
    }
    return d;
  } catch (e) {
    return { universes: [], projects: {} };
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
  fs.writeFileSync(DATA_FILE, json, 'utf8');
  try { fs.writeFileSync(path.join(DATA_DIR, 'galaxy-data.js'), 'window.GALAXY_DATA = ' + json + ';', 'utf8'); } catch (e) {}
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

const IGNORE = new Set(['ProjectGalaxy', 'node_modules', '.git', '.DS_Store', 'build', 'dist', '.venv', 'venv', 'myenv', '__pycache__', '.gradle', 'DerivedData', 'Pods']);

function listDirs(dir) {
  try {
    return fs.readdirSync(dir, { withFileTypes: true })
      .filter(d => d.isDirectory() && !d.name.startsWith('.') && !IGNORE.has(d.name) && !d.name.endsWith('.app'))
      .map(d => d.name.normalize('NFC'));
  } catch (e) { return []; }
}

const knownPaths = new Set();

// Git bilgisi — spawn olmadan, .git dosyalarını doğrudan okuyarak (hızlı)
function gitInfo(dir) {
  try {
    const gitDir = path.join(dir, '.git');
    if (!fs.existsSync(gitDir)) return null;
    let branch = '';
    try {
      const head = fs.readFileSync(path.join(gitDir, 'HEAD'), 'utf8').trim();
      branch = head.startsWith('ref:') ? head.split('/').pop() : head.slice(0, 7);
    } catch (e) {}
    let lastTs = null, activity30 = 0;
    try {
      const logs = fs.readFileSync(path.join(gitDir, 'logs', 'HEAD'), 'utf8');
      const lines = logs.trim().split('\n');
      const cutoff = Date.now() / 1000 - 30 * 86400;
      for (const ln of lines) {
        const m = ln.match(/>\s(\d{10})\s/);
        if (m) {
          if (+m[1] > cutoff) activity30++;
          lastTs = new Date(+m[1] * 1000).toISOString();
        }
      }
    } catch (e) {}
    return { branch, lastTs, activity30 };
  } catch (e) { return null; }
}

function resolveRoot(root) {
  // Göreli kökler (".." = PAPILON) veri dosyasının konumuna göre çözülür
  return path.isAbsolute(root) ? root : path.resolve(DATA_DIR, root);
}

function scanProjects() {
  const data = loadData();
  knownPaths.clear();
  const projects = [];

  for (const u of data.universes) {
    const root = resolveRoot(u.root);
    const found = [];
    for (const name of listDirs(root)) {
      if ((u.expandDirs || []).includes(name)) {
        for (const sub of listDirs(path.join(root, name))) {
          found.push({ rel: `${name}/${sub}`, full: path.join(root, name, sub) });
        }
      } else {
        found.push({ rel: name, full: path.join(root, name) });
      }
    }
    for (const { rel, full } of found) {
      const id = u.prefix ? `${u.prefix}/${rel}` : rel;
      if ((data.ignored || []).includes(id)) continue; // evrenden gizlenmiş
      knownPaths.add(full);
      let mtime = null;
      try { mtime = fs.statSync(full).mtime.toISOString(); } catch (e) {}
      const saved = data.projects[id] || {};
      const git = gitInfo(full);
      const lastAct = git && git.lastTs ? Date.parse(git.lastTs) : (mtime ? Date.parse(mtime) : Date.now());
      const staleDays = Math.floor((Date.now() - lastAct) / 86400000);
      let hasReadme = false;
      try { hasReadme = fs.readdirSync(full).some(f => f.toLowerCase() === 'readme.md'); } catch (err) {}
      projects.push({
        git,
        staleDays,
        hasReadme,
        links: saved.links || [],
        id,
        universe: u.id,
        name: saved.name || rel.split('/').pop(),
        group: saved.group || (rel.includes('/') ? rel.split('/')[0] : 'Keşfedilmemiş'),
        status: saved.status || 'unknown',
        stage: saved.stage || '',
        progress: saved.progress ?? 0,
        plan: saved.plan || [],
        notes: saved.notes || '',
        desc: saved.desc || '',
        mtime,
        path: full
      });
    }
  }
  return {
    universes: data.universes.map(u => ({ id: u.id, name: u.name, subtitle: u.subtitle || '' })),
    projects,
    agents: (data.agents || []).map(a => ({ id: a.id, name: a.name, role: a.role, color: a.color || '#61dcff', presets: a.presets || [] })),
    alerts: buildAlerts(projects),
    ignored: (data.ignored || []).map(id => ({ id, name: (data.projects[id] && data.projects[id].name) || id.split('/').pop() }))
  };
}

// ---------- proje silme / gizleme (onaylı) ----------
ipcMain.handle('galaxy:projectDelete', async (e, projectId) => {
  const scan = scanProjects();
  const proj = scan.projects.find(p => p.id === projectId);
  if (!proj || !proj.path) return { ok: false, error: 'Proje bulunamadı' };
  const win = BrowserWindow.fromWebContents(e.sender);

  const { response } = await dialog.showMessageBox(win, {
    type: 'warning',
    title: 'Projeyi Kaldır',
    message: `"${proj.name}" ne yapılsın?`,
    detail: `Klasör: ${proj.path}\n\n• Evrenden Gizle: klasöre dokunulmaz, sadece galakside görünmez olur (geri alınabilir).\n• Çöp Kutusuna Taşı: klasör macOS Çöp Kutusu'na taşınır (Finder'dan geri alınabilir).`,
    buttons: ['Vazgeç', 'Evrenden Gizle', 'Çöp Kutusuna Taşı'],
    defaultId: 0,
    cancelId: 0
  });

  if (response === 0) return { ok: true, action: 'cancel' };

  const data = loadData();
  if (response === 1) {
    data.ignored = data.ignored || [];
    if (!data.ignored.includes(projectId)) data.ignored.push(projectId);
    saveData(data);
    return { ok: true, action: 'hidden' };
  }

  // Çöp kutusuna taşı — ikinci onay
  const second = await dialog.showMessageBox(win, {
    type: 'warning',
    title: 'Son Onay',
    message: `"${proj.name}" klasörü Çöp Kutusu'na taşınacak. Emin misin?`,
    detail: proj.path,
    buttons: ['Vazgeç', 'Evet, Çöp Kutusuna Taşı'],
    defaultId: 0,
    cancelId: 0
  });
  if (second.response !== 1) return { ok: true, action: 'cancel' };

  try {
    await shell.trashItem(proj.path);
    delete data.projects[projectId];
    data.ignored = (data.ignored || []).filter(x => x !== projectId);
    saveData(data);
    return { ok: true, action: 'trashed' };
  } catch (err) {
    return { ok: false, error: 'Taşınamadı: ' + err.message };
  }
});

ipcMain.handle('galaxy:projectUnhide', (e, projectId) => {
  const data = loadData();
  data.ignored = (data.ignored || []).filter(x => x !== projectId);
  saveData(data);
  return { ok: true };
});

// Proaktif uyarılar — deterministik, anında (Claude gerekmez)
function buildAlerts(projects) {
  const alerts = [];
  for (const p of projects) {
    if (p.status !== 'active') continue;
    const pending = p.plan.filter(i => !i.done).length;
    if (p.staleDays >= 21) alerts.push({ projectId: p.id, msg: `${p.name}: ${p.staleDays} gündür hareket yok` });
    if (pending >= 5) alerts.push({ projectId: p.id, msg: `${p.name}: ${pending} bekleyen plan maddesi` });
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

ipcMain.handle('galaxy:load', () => scanProjects());

// ---------- evren CRUD ----------
function slugify(s) {
  return s.toLowerCase().replace(/[çğıöşü]/g, c => ({ 'ç': 'c', 'ğ': 'g', 'ı': 'i', 'ö': 'o', 'ş': 's', 'ü': 'u' }[c]))
    .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'evren';
}

ipcMain.handle('galaxy:universeAdd', (e, { name, root }) => {
  if (!name || !root) return { ok: false, error: 'Ad ve klasör yolu gerekli' };
  root = root.replace(/^~/, os.homedir()).trim();
  try {
    if (!fs.statSync(root).isDirectory()) return { ok: false, error: 'Bu yol bir klasör değil' };
  } catch (err) { return { ok: false, error: 'Klasör bulunamadı: ' + root }; }
  const data = loadData();
  let id = slugify(name);
  while (data.universes.find(u => u.id === id)) id += '2';
  const prefix = path.basename(root).normalize('NFC');
  if (data.universes.find(u => u.prefix === prefix)) return { ok: false, error: 'Aynı klasör adına sahip bir evren zaten var' };
  data.universes.push({ id, name, subtitle: prefix, root, prefix, expandDirs: [] });
  saveData(data);
  return { ok: true, id };
});

ipcMain.handle('galaxy:universeUpdate', (e, { id, name, root }) => {
  const data = loadData();
  const u = data.universes.find(x => x.id === id);
  if (!u) return { ok: false, error: 'Evren bulunamadı' };
  if (name) u.name = name;
  if (root) {
    root = root.replace(/^~/, os.homedir()).trim();
    try {
      if (!fs.statSync(root).isDirectory()) return { ok: false, error: 'Bu yol bir klasör değil' };
    } catch (err) { return { ok: false, error: 'Klasör bulunamadı: ' + root }; }
    u.root = root;
    if (u.prefix) { // ".." kökü (ana PAPILON) prefixsizdir, ona dokunma
      u.prefix = path.basename(root).normalize('NFC');
      u.subtitle = u.prefix;
    }
  }
  saveData(data);
  return { ok: true };
});

ipcMain.handle('galaxy:universeDelete', (e, id) => {
  const data = loadData();
  if (data.universes.length <= 1) return { ok: false, error: 'Son evren silinemez' };
  const idx = data.universes.findIndex(x => x.id === id);
  if (idx < 0) return { ok: false, error: 'Evren bulunamadı' };
  data.universes.splice(idx, 1);
  saveData(data);
  return { ok: true }; // proje metadataları korunur; evren geri eklenirse geri gelir
});

// ---------- evren geneli TODO ----------
ipcMain.handle('galaxy:todoList', (e, universe) => {
  const data = loadData();
  return (data.todos || []).filter(td => !universe || td.universe === universe).slice(0, 100);
});
ipcMain.handle('galaxy:todoAdd', (e, { universe, text, status }) => {
  if (!text || !text.trim()) return false;
  const data = loadData();
  data.todos = data.todos || [];
  data.todos.unshift({ id: String(Date.now()), universe, text: text.trim(), done: status === 'done', status: status || 'todo', ts: new Date().toISOString() });
  data.todos = data.todos.slice(0, 300);
  saveData(data);
  return true;
});
ipcMain.handle('galaxy:todoSetStatus', (e, { id, status }) => {
  const data = loadData();
  const td = (data.todos || []).find(x => x.id === id);
  if (td) { td.status = status; td.done = status === 'done'; saveData(data); }
  return true;
});
ipcMain.handle('galaxy:todoToggle', (e, id) => {
  const data = loadData();
  const td = (data.todos || []).find(x => x.id === id);
  if (td) { td.done = !td.done; saveData(data); }
  return true;
});
ipcMain.handle('galaxy:todoDelete', (e, id) => {
  const data = loadData();
  data.todos = (data.todos || []).filter(x => x.id !== id);
  saveData(data);
  return true;
});

ipcMain.handle('galaxy:save', (e, project) => {
  const data = loadData();
  const { id, name, group, status, stage, progress, plan, notes, desc, links } = project;
  data.projects[id] = { name, group, status, stage, progress, plan, notes, desc, links: links || [] };
  saveData(data);
  // README'deki eşleşen todo satırlarının işaretini plan durumuna göre güncelle (çift yönlü senkronun yazma yönü)
  try {
    if (project.path) {
      const readmePath = path.join(project.path, 'README.md');
      if (fs.existsSync(readmePath)) {
        let content = fs.readFileSync(readmePath, 'utf8');
        let changed = false;
        for (const item of plan || []) {
          const escaped = item.text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
          const re = new RegExp(`^(\\s*)- \\[( |x|X)\\] ${escaped}\\s*$`, 'm');
          const want = item.done ? 'x' : ' ';
          content = content.replace(re, (m0, sp, cur) => {
            if (cur.toLowerCase() !== want.trim() && !(cur === ' ' && want === ' ')) changed = true;
            return `${sp}- [${want}] ${item.text}`;
          });
        }
        if (changed) fs.writeFileSync(readmePath, content, 'utf8');
      }
    }
  } catch (err) {}
  return true;
});

// README'deki "- [ ]" maddelerini plana aktar (okuma yönü)
ipcMain.handle('galaxy:syncReadme', (e, projectId) => {
  const scan = scanProjects();
  const proj = scan.projects.find(p => p.id === projectId);
  if (!proj || !proj.path) return { ok: false, added: 0 };
  try {
    const readmePath = path.join(proj.path, 'README.md');
    if (!fs.existsSync(readmePath)) return { ok: true, added: 0 };
    const content = fs.readFileSync(readmePath, 'utf8');
    const data = loadData();
    if (!data.projects[projectId]) {
      data.projects[projectId] = { name: proj.name, group: proj.group, status: proj.status, stage: proj.stage, progress: proj.progress, plan: [], notes: proj.notes, desc: proj.desc, links: proj.links };
    }
    const plan = data.projects[projectId].plan = data.projects[projectId].plan || [];
    let added = 0;
    const re = /^\s*- \[( |x|X)\] (.+?)\s*$/gm;
    let m;
    while ((m = re.exec(content)) !== null) {
      const text = m[2].trim();
      const done = m[1].toLowerCase() === 'x';
      const existing = plan.find(i => i.text === text);
      if (!existing) { plan.push({ text, done }); added++; }
      else if (existing.done !== done && done) { existing.done = true; } // README'de kapanmışsa planda da kapat
    }
    if (added > 0 || true) saveData(data);
    return { ok: true, added, plan };
  } catch (err) { return { ok: false, added: 0 }; }
});

ipcMain.handle('galaxy:openFolder', (e, p) => {
  if (p && knownPaths.has(p)) shell.openPath(p);
});

// ---------- dosya ağacı ----------
function buildTree(dir, depth) {
  if (depth <= 0) return [];
  let entries = [];
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true })
      .filter(d => !d.name.startsWith('.') && !IGNORE.has(d.name))
      .slice(0, 60);
  } catch (e) { return []; }
  entries.sort((a, b) => (b.isDirectory() - a.isDirectory()) || a.name.localeCompare(b.name, 'tr'));
  return entries.map(d => ({
    name: d.name.normalize('NFC'),
    dir: d.isDirectory(),
    children: d.isDirectory() ? buildTree(path.join(dir, d.name), depth - 1) : undefined
  }));
}

ipcMain.handle('galaxy:tree', (e, p) => {
  if (!p || !knownPaths.has(p)) return null;
  return buildTree(p, 3);
});

// ---------- tek seviye dizin listesi (gezegen yörüngesi) ----------
function safeJoin(root, rel) {
  const full = path.resolve(root, rel || '');
  return (full === root || full.startsWith(root + path.sep)) ? full : null;
}

ipcMain.handle('galaxy:list', (e, { root, rel }) => {
  if (!root || !knownPaths.has(root)) return null;
  const dir = safeJoin(root, rel);
  if (!dir) return null;
  let entries = [];
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true })
      .filter(d => !d.name.startsWith('.') && !IGNORE.has(d.name) && !d.name.endsWith('.app'));
  } catch (err) { return null; }
  const out = entries.map(d => {
    let size = 0;
    try { if (!d.isDirectory()) size = fs.statSync(path.join(dir, d.name)).size; } catch (e2) {}
    return { name: d.name.normalize('NFC'), dir: d.isDirectory(), size };
  });
  out.sort((a, b) => (b.dir - a.dir) || a.name.localeCompare(b.name, 'tr'));
  return out;
});

// ---------- dosya içeriği (uygulama içi görüntüleyici) ----------
const TEXT_EXT = new Set(['md','txt','js','jsx','ts','tsx','py','swift','kt','kts','java','c','cpp','h','m','mm','cs','go','rs','rb','php','sh','bash','zsh','yml','yaml','json','xml','html','htm','css','scss','sql','gradle','properties','toml','ini','cfg','conf','env','csv','tsv','log','dio','plist','entitlements','pbxproj','storyboard','xib','dart','vue','svelte','r','lua','pl','tex']);
const IMAGE_EXT = new Set(['png','jpg','jpeg','gif','webp','svg','bmp','ico','heic','avif']);
const MEDIA_EXT = new Set(['mp4','mov','webm','m4v','mp3','wav','m4a','aac','ogg']);

ipcMain.handle('galaxy:file', (e, { root, rel }) => {
  if (!root || !knownPaths.has(root)) return null;
  const full = safeJoin(root, rel);
  if (!full) return null;
  let st;
  try { st = fs.statSync(full); } catch (err) { return null; }
  const ext = path.extname(full).slice(1).toLowerCase();
  const url = 'file://' + full.split('/').map(encodeURIComponent).join('/');
  const base = { name: path.basename(full), size: st.size, ext, path: full };

  if (IMAGE_EXT.has(ext)) return { ...base, kind: 'image', url };
  if (ext === 'pdf') return { ...base, kind: 'pdf', url };
  if (MEDIA_EXT.has(ext)) return { ...base, kind: ['mp3','wav','m4a','aac','ogg'].includes(ext) ? 'audio' : 'video', url };
  if (TEXT_EXT.has(ext) || st.size < 200 * 1024) {
    try {
      const content = fs.readFileSync(full, 'utf8').slice(0, 300 * 1024);
      // ikili dosya sezgisi
      if (/[\x00]/.test(content.slice(0, 1000))) return { ...base, kind: 'binary' };
      return { ...base, kind: ext === 'md' ? 'markdown' : 'text', content };
    } catch (err) { return { ...base, kind: 'binary' }; }
  }
  return { ...base, kind: 'binary' };
});

ipcMain.handle('galaxy:openFile', (e, p) => {
  // yalnızca bilinen proje köklerinin altındaki dosyalar
  for (const root of knownPaths) {
    if (p === root || p.startsWith(root + path.sep)) { shell.openPath(p); return true; }
  }
  return false;
});

// ---------- ajan yönetimi ----------
ipcMain.handle('galaxy:agentsFull', () => loadData().agents || []);

ipcMain.handle('galaxy:agentSave', (e, agent) => {
  if (!agent || !agent.name) return { ok: false, error: 'Ad gerekli' };
  const data = loadData();
  data.agents = data.agents || [];
  if (!agent.id) {
    agent.id = slugify(agent.name);
    while (data.agents.find(a => a.id === agent.id)) agent.id += '2';
  }
  const idx = data.agents.findIndex(a => a.id === agent.id);
  const clean = {
    id: agent.id, name: agent.name, role: agent.role || 'AJAN', color: agent.color || '#61dcff',
    prompt: agent.prompt || '', write: !!agent.write,
    presets: Array.isArray(agent.presets) ? agent.presets.filter(p => p && p.label && p.ask).slice(0, 8) : []
  };
  if (idx >= 0) data.agents[idx] = clean; else data.agents.push(clean);
  saveData(data);
  return { ok: true, id: agent.id };
});

ipcMain.handle('galaxy:agentDelete', (e, id) => {
  const data = loadData();
  if ((data.agents || []).length <= 1) return { ok: false, error: 'Son ajan silinemez' };
  data.agents = (data.agents || []).filter(a => a.id !== id);
  saveData(data);
  return { ok: true };
});

// ---------- veritabanı görüntüleyici ----------
function encPass(p) {
  try {
    return safeStorage.isEncryptionAvailable()
      ? safeStorage.encryptString(p).toString('base64')
      : Buffer.from(p, 'utf8').toString('base64');
  } catch (e) { return Buffer.from(p, 'utf8').toString('base64'); }
}
function decPass(s) {
  try {
    const b = Buffer.from(s, 'base64');
    return safeStorage.isEncryptionAvailable() ? safeStorage.decryptString(b) : b.toString('utf8');
  } catch (e) {
    try { return Buffer.from(s, 'base64').toString('utf8'); } catch (e2) { return ''; }
  }
}

async function dbConnect(cfg) {
  if (cfg.type === 'sqlite') {
    const initSqlJs = require('sql.js');
    const SQL = await initSqlJs({
      locateFile: f => path.join(APP_DIR, 'node_modules', 'sql.js', 'dist', f)
    });
    const buf = fs.readFileSync(cfg.file.replace(/^~/, os.homedir()));
    const db = new SQL.Database(buf);
    return {
      query: async sql => {
        const res = db.exec(sql);
        if (!res.length) return { rows: [], fields: [] };
        const { columns, values } = res[0];
        return { fields: columns, rows: values.map(v => Object.fromEntries(columns.map((c, i) => [c, v[i]]))) };
      },
      end: () => { try { db.close(); } catch (e) {} }
    };
  }
  const base = { host: cfg.host, port: +cfg.port, user: cfg.user, password: cfg.password, database: cfg.database };
  if (cfg.type === 'mysql') {
    const mysql = require('mysql2/promise');
    const conn = await mysql.createConnection({ ...base, connectTimeout: 6000 });
    return {
      query: async sql => { const [rows, fields] = await conn.query(sql); return { rows, fields: (fields || []).map(f => f.name) }; },
      end: () => conn.end().catch(() => {})
    };
  }
  const { Client } = require('pg');
  const client = new Client({ ...base, connectionTimeoutMillis: 6000 });
  await client.connect();
  return {
    query: async sql => { const r = await client.query(sql); return { rows: r.rows, fields: (r.fields || []).map(f => f.name) }; },
    end: () => client.end().catch(() => {})
  };
}

function getDbCfg(id) {
  const data = loadData();
  const db = (data.dbs || []).find(d => d.id === id);
  if (!db) return null;
  return { ...db, password: decPass(db.password) };
}

ipcMain.handle('galaxy:dbList', () => (loadData().dbs || []).map(({ password, ...rest }) => rest));

ipcMain.handle('galaxy:dbSave', (e, db) => {
  const isSqlite = db.type === 'sqlite';
  if (!db.name || (isSqlite ? !db.file : (!db.host || !db.database || !db.user))) {
    return { ok: false, error: isSqlite ? 'Ad ve dosya yolu gerekli' : 'Ad, sunucu, veritabanı ve kullanıcı gerekli' };
  }
  const data = loadData();
  data.dbs = data.dbs || [];
  if (!db.id) db.id = String(Date.now());
  const idx = data.dbs.findIndex(d => d.id === db.id);
  const existing = idx >= 0 ? data.dbs[idx] : null;
  const clean = isSqlite
    ? { id: db.id, name: db.name, type: 'sqlite', file: db.file, host: '', port: 0, database: path.basename(db.file), user: '', password: encPass('') }
    : {
      id: db.id, name: db.name, type: db.type === 'mysql' ? 'mysql' : 'postgres',
      host: db.host, port: +db.port || (db.type === 'mysql' ? 3306 : 5432),
      database: db.database, user: db.user,
      password: db.password ? encPass(db.password) : (existing ? existing.password : encPass(''))
    };
  if (idx >= 0) data.dbs[idx] = clean; else data.dbs.push(clean);
  saveData(data);
  return { ok: true, id: db.id };
});

ipcMain.handle('galaxy:dbDelete', (e, id) => {
  const data = loadData();
  data.dbs = (data.dbs || []).filter(d => d.id !== id);
  saveData(data);
  return { ok: true };
});

ipcMain.handle('galaxy:dbTest', async (e, cfgRaw) => {
  try {
    const cfg = cfgRaw.id && !cfgRaw.password ? getDbCfg(cfgRaw.id) : cfgRaw;
    const c = await dbConnect(cfg);
    await c.query('SELECT 1');
    c.end();
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err.code === 'MODULE_NOT_FOUND' ? 'Sürücü eksik — ProjectGalaxy klasöründe: npm install' : err.message };
  }
});

ipcMain.handle('galaxy:dbTables', async (e, id) => {
  const cfg = getDbCfg(id);
  if (!cfg) return { ok: false, error: 'Bağlantı bulunamadı' };
  try {
    const c = await dbConnect(cfg);
    const sql = cfg.type === 'sqlite'
      ? `SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY 1`
      : cfg.type === 'mysql'
        ? 'SHOW TABLES'
        : `SELECT schemaname || '.' || tablename AS t FROM pg_catalog.pg_tables WHERE schemaname NOT IN ('pg_catalog','information_schema') ORDER BY 1`;
    const r = await c.query(sql);
    c.end();
    const tables = r.rows.map(row => Object.values(row)[0]);
    return { ok: true, tables };
  } catch (err) {
    return { ok: false, error: err.code === 'MODULE_NOT_FOUND' ? 'Sürücü eksik — ProjectGalaxy klasöründe: npm install' : err.message };
  }
});

ipcMain.handle('galaxy:dbQuery', async (e, { id, table, sql }) => {
  const cfg = getDbCfg(id);
  if (!cfg) return { ok: false, error: 'Bağlantı bulunamadı' };
  let finalSql;
  if (table) {
    if (!/^[\w.$]+$/.test(table)) return { ok: false, error: 'Geçersiz tablo adı' };
    finalSql = cfg.type === 'mysql' ? `SELECT * FROM \`${table}\` LIMIT 100` : `SELECT * FROM ${table.includes('.') ? table : '"' + table + '"'} LIMIT 100`;
  } else {
    if (!/^\s*select\b/i.test(sql || '')) return { ok: false, error: 'Yalnızca SELECT sorgularına izin var' };
    finalSql = sql;
  }
  try {
    const c = await dbConnect(cfg);
    const r = await c.query(finalSql);
    c.end();
    return { ok: true, fields: r.fields, rows: r.rows.slice(0, 200) };
  } catch (err) {
    return { ok: false, error: err.message };
  }
});

// ---------- git detayları ----------
ipcMain.handle('galaxy:gitLog', async (e, projectId) => {
  const scan = scanProjects();
  const proj = scan.projects.find(p => p.id === projectId);
  if (!proj || !proj.path || !fs.existsSync(path.join(proj.path, '.git'))) return { ok: false, error: 'Git deposu yok' };
  const { exec } = require('child_process');
  const run = cmd => new Promise(res => exec(cmd, { cwd: proj.path, env: ENV, timeout: 10000 }, (err, out) => res(err ? '' : out.trim())));
  const [logOut, branch, statusOut, branches] = await Promise.all([
    run('git log --pretty=format:"%h§%an§%ad§%s" --date=format:"%Y-%m-%d %H:%M" -40'),
    run('git branch --show-current'),
    run('git status --porcelain'),
    run('git branch --format="%(refname:short)"')
  ]);
  const commits = logOut ? logOut.split('\n').map(l => {
    const [h, an, ad, ...s] = l.split('§');
    return { h, an, ad, s: s.join('§') };
  }) : [];
  const dirty = statusOut ? statusOut.split('\n').filter(Boolean) : [];
  return {
    ok: true,
    branch: branch || (proj.git && proj.git.branch) || '?',
    branches: branches ? branches.split('\n').filter(Boolean) : [],
    commits,
    dirty: dirty.length,
    dirtyFiles: dirty.slice(0, 12).map(l => l.trim()),
    activity30: proj.git ? proj.git.activity30 : 0
  };
});

// ---------- README ----------
ipcMain.handle('galaxy:readme', (e, p) => {
  if (!p || !knownPaths.has(p)) return null;
  try {
    const files = fs.readdirSync(p).map(f => f.normalize('NFC'));
    let md = files.find(f => f.toLowerCase() === 'readme.md')
          || files.find(f => f.toLowerCase().endsWith('.md'));
    if (!md) return null;
    const content = fs.readFileSync(path.join(p, md), 'utf8').slice(0, 60000);
    return { name: md, content };
  } catch (err) { return null; }
});

// ---------- Claude konsolu ----------
const runs = new Map(); // runId -> child

function streamClaude({ win, channel, runId, cwd, args }) {
  const send = (kind, text) => { if (!win.isDestroyed()) win.webContents.send(channel, { runId, kind, text }); };
  let child;
  try {
    child = spawn('claude', args, { cwd, env: ENV });
  } catch (err) {
    return { ok: false, error: err.message };
  }
  runs.set(runId, child);

  let buf = '';
  child.stdout.on('data', chunk => {
    buf += chunk.toString();
    let i;
    while ((i = buf.indexOf('\n')) >= 0) {
      const line = buf.slice(0, i).trim();
      buf = buf.slice(i + 1);
      if (!line) continue;
      try {
        const msg = JSON.parse(line);
        if (msg.type === 'system' && msg.subtype === 'init') {
          send('info', `oturum başladı · model: ${msg.model || '?'}`);
        } else if (msg.type === 'assistant' && msg.message && msg.message.content) {
          for (const c of msg.message.content) {
            if (c.type === 'text' && c.text) send('text', c.text);
            else if (c.type === 'tool_use') send('tool', `${c.name}${c.input && c.input.file_path ? ' → ' + c.input.file_path : c.input && c.input.command ? ' → ' + String(c.input.command).slice(0, 120) : ''}`);
          }
        } else if (msg.type === 'result') {
          send('result', msg.result || (msg.subtype === 'success' ? 'tamamlandı' : msg.subtype));
        }
      } catch (err) {
        send('raw', line);
      }
    }
  });
  child.stderr.on('data', chunk => send('err', chunk.toString()));
  child.on('error', err => {
    send('err', err.code === 'ENOENT'
      ? 'claude komutu bulunamadı. Kurulum: npm install -g @anthropic-ai/claude-code'
      : err.message);
    send('done', '');
    runs.delete(runId);
  });
  child.on('close', code => {
    send('done', String(code ?? ''));
    runs.delete(runId);
  });
  return { ok: true };
}

ipcMain.handle('galaxy:claudeRun', (e, { runId, cwd, prompt, continueSession }) => {
  if (!cwd || !knownPaths.has(cwd)) return { ok: false, error: 'Geçersiz klasör' };
  const args = ['-p', prompt, '--output-format', 'stream-json', '--verbose', '--permission-mode', 'acceptEdits'];
  if (continueSession) args.push('--continue');
  return streamClaude({ win: BrowserWindow.fromWebContents(e.sender), channel: 'claude:out', runId, cwd, args });
});

// ---------- ajan (CTO vb.) çalıştırma ----------
ipcMain.handle('galaxy:agentRun', (e, { runId, agentId, prompt, projectId }) => {
  const data = loadData();
  const agent = (data.agents || []).find(a => a.id === agentId);
  if (!agent) return { ok: false, error: 'Ajan bulunamadı' };

  let full, cwd;
  const scan = scanProjects();
  const proj = projectId ? scan.projects.find(p => p.id === projectId) : null;

  if (proj && proj.path) {
    // PROJE BAĞLAMI: ajan bu projenin içinde çalışır
    const done = proj.plan.filter(i => i.done).length;
    const files = listDirs(proj.path).slice(0, 30).join(', ');
    const pdigest = [
      `Proje: ${proj.name} (klasör: ${proj.path})`,
      `Durum: ${proj.status} · İlerleme: %${proj.progress} · Aşama: ${proj.stage || '-'}`,
      `Git: ${proj.git ? `${proj.git.branch} · son: ${(proj.git.lastTs || '').slice(0, 10)} · 30g aktivite: ${proj.git.activity30}` : 'depo yok'}`,
      `Plan (${done}/${proj.plan.length}):`,
      ...proj.plan.map(i => `  [${i.done ? 'x' : ' '}] ${i.text}`),
      proj.notes ? `Notlar: ${proj.notes}` : '',
      `Kök klasörler: ${files}`
    ].filter(Boolean).join('\n');
    full = `${agent.prompt}\n\n=== ODAK: TEK PROJE ===\n${pdigest}\n=== SON ===\n\nŞu an bu projenin klasöründesin, dosyalarını okuyabilirsin. Yanıtını SADECE bu proje özelinde ver.\n\nKullanıcının isteği: ${prompt || 'Bu proje için durum değerlendirmesi yap.'}\nTürkçe yanıtla.`;
    cwd = proj.path;
  } else {
    const digest = buildDigest();
    full = `${agent.prompt}\n\n=== TÜM PROJELERİN GÜNCEL DURUMU ===\n${digest}\n=== SON ===\n\nKullanıcının isteği: ${prompt || 'Genel durum raporu ver.'}\nYanıtını Türkçe ver. Dosyaları incelemen gerekirse bulunduğun klasördeki proje klasörlerini okuyabilirsin.`;
    cwd = path.resolve(DATA_DIR, '..'); // PAPILON kökü
  }
  const args = ['-p', full, '--output-format', 'stream-json', '--verbose'];
  // Diğer evren kökleri (ör. FY) mutlak yol olarak erişime açılır
  for (const u of data.universes || []) {
    if (path.isAbsolute(u.root)) args.push('--add-dir', u.root);
  }
  if (agent.write) args.push('--permission-mode', 'acceptEdits');
  return streamClaude({ win: BrowserWindow.fromWebContents(e.sender), channel: 'agent:out', runId, cwd, args });
});

// ---------- günlük (captain's log) ----------
function runClaudeJson(prompt, cwd) {
  return new Promise(resolve => {
    let child;
    try {
      child = spawn('claude', ['-p', prompt, '--output-format', 'json'], { cwd, env: ENV });
    } catch (err) { return resolve({ error: err.message }); }
    let out = '';
    const timer = setTimeout(() => { child.kill('SIGTERM'); resolve({ error: 'zaman aşımı' }); }, 90000);
    child.stdout.on('data', c => { out += c.toString(); });
    child.on('error', err => { clearTimeout(timer); resolve({ error: err.code === 'ENOENT' ? 'claude komutu bulunamadı' : err.message }); });
    child.on('close', () => {
      clearTimeout(timer);
      try {
        const wrapper = JSON.parse(out);
        let result = (wrapper.result || '').trim();
        const m = result.match(/\{[\s\S]*\}/);
        if (m) result = m[0];
        resolve({ data: JSON.parse(result) });
      } catch (err) { resolve({ error: 'yanıt çözümlenemedi' }); }
    });
  });
}

ipcMain.handle('galaxy:logDetect', async (e, text) => {
  const scan = scanProjects();
  const list = scan.projects.map(p => `${p.id} | ${p.name} | ${(p.desc || '').slice(0, 90)}`).join('\n');
  const prompt = `Aşağıda proje listesi var (id | ad | açıklama):\n${list}\n\nKullanıcının günlük notu: "${text}"\n\nBu not en çok hangi projeyle ilgili ve tipi ne? "done" = yapılmış bir işin kaydı, "todo" = yapılacak iş/plan. SADECE şu JSON'u döndür, başka hiçbir şey yazma:\n{"projectId": "<listeden bir id veya none>", "confidence": <0-1 arası sayı>, "type": "<done veya todo>", "reason": "<tek cümle Türkçe gerekçe>", "entry": "<notu kısa ve düzgün tek cümleye çevir>"}`;
  const res = await runClaudeJson(prompt, path.resolve(DATA_DIR, '..'));
  if (res.error) return { ok: false, error: res.error };
  const d = res.data || {};
  const proj = scan.projects.find(p => p.id === d.projectId);
  return {
    ok: true,
    projectId: proj ? proj.id : null,
    projectName: proj ? proj.name : null,
    folder: proj ? proj.path : null,
    confidence: d.confidence ?? 0,
    type: d.type === 'todo' ? 'todo' : 'done',
    reason: d.reason || '',
    entry: d.entry || text
  };
});

ipcMain.handle('galaxy:logApply', (e, { projectId, text, entry, writeReadme = true, addPlan = false }) => {
  const scan = scanProjects();
  const proj = scan.projects.find(p => p.id === projectId);
  const data = loadData();
  data.log = data.log || [];
  const record = { ts: new Date().toISOString(), text, projectId: proj ? proj.id : null, applied: false };

  // Plan listesine madde ekle
  if (proj && addPlan) {
    if (!data.projects[proj.id]) {
      data.projects[proj.id] = { name: proj.name, group: proj.group, status: proj.status, stage: proj.stage, progress: proj.progress, plan: [], notes: proj.notes, desc: proj.desc };
    }
    data.projects[proj.id].plan = data.projects[proj.id].plan || [];
    data.projects[proj.id].plan.push({ text: entry || text, done: false });
    record.applied = true;
  }

  if (proj && proj.path && writeReadme) {
    try {
      const readmePath = path.join(proj.path, 'README.md');
      const date = new Date().toISOString().slice(0, 10);
      // yapılacak iş → "## Yapılacaklar" bölümüne checkbox; yapılan iş → "## Günlük" bölümüne tarihli satır
      const isTodo = addPlan;
      const header = isTodo ? '## Yapılacaklar' : '## Günlük';
      const line = isTodo ? `- [ ] ${entry || text}` : `- **${date}:** ${entry || text}`;
      let content = '';
      try { content = fs.readFileSync(readmePath, 'utf8'); } catch (err) {}
      if (content.includes(header)) {
        content = content.replace(header, `${header}\n\n${line}`).replace(new RegExp(header + '\\n\\n\\n'), header + '\n\n');
      } else {
        content = (content ? content.trimEnd() + '\n\n' : `# ${proj.name}\n\n`) + `${header}\n\n${line}\n`;
      }
      fs.writeFileSync(readmePath, content, 'utf8');
      record.applied = true;
    } catch (err) {
      return { ok: false, error: err.message };
    }
  }
  data.log.unshift(record);
  data.log = data.log.slice(0, 200);
  saveData(data);
  return { ok: true, applied: record.applied };
});

ipcMain.handle('galaxy:logSave', (e, text) => {
  const data = loadData();
  data.log = data.log || [];
  data.log.unshift({ ts: new Date().toISOString(), text, projectId: null, applied: false });
  data.log = data.log.slice(0, 200);
  saveData(data);
  return true;
});

ipcMain.handle('galaxy:logList', () => {
  const data = loadData();
  return (data.log || []).slice(0, 50);
});

// ---------- kayıtlı sabah raporları ----------
ipcMain.handle('galaxy:reports', () => {
  const dir = path.join(DATA_DIR, 'reports');
  try {
    return fs.readdirSync(dir).filter(f => f.endsWith('.md')).sort().reverse().slice(0, 30);
  } catch (err) { return []; }
});

ipcMain.handle('galaxy:report', (e, name) => {
  if (typeof name !== 'string' || !/^[\w çğıöşüÇĞİÖŞÜ.-]+\.md$/.test(name)) return null;
  try { return fs.readFileSync(path.join(DATA_DIR, 'reports', name), 'utf8'); } catch (err) { return null; }
});

ipcMain.handle('galaxy:claudeStop', (e, runId) => {
  const child = runs.get(runId);
  if (child) { child.kill('SIGTERM'); runs.delete(runId); }
  return true;
});

// Terminal'de Claude aç (alternatif)
ipcMain.handle('galaxy:openClaude', (e, p) => {
  if (!p || !knownPaths.has(p)) return false;
  const cmd = `cd ${JSON.stringify(p)} && claude`;
  const script = `tell application "Terminal"
    activate
    do script "${cmd.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"
  end tell`;
  execFile('osascript', ['-e', script]);
  return true;
});

function createWindow() {
  const win = new BrowserWindow({
    fullscreen: true,
    backgroundColor: '#04060c',
    webPreferences: {
      preload: path.join(APP_DIR, 'preload.js'),
      contextIsolation: true
    }
  });
  // Arayüzü öncelikle ProjectGalaxy klasöründen yükle — UI güncellemeleri
  // için uygulamayı yeniden paketlemek gerekmesin
  const external = path.join(DATA_DIR, 'index.html');
  win.loadFile(fs.existsSync(external) ? external : path.join(APP_DIR, 'index.html'));
}

// ---------- menü çubuğu: hızlı not ----------
let tray = null, quickWin = null;

function showQuickCapture() {
  if (quickWin && !quickWin.isDestroyed()) { quickWin.show(); quickWin.focus(); return; }
  quickWin = new BrowserWindow({
    width: 460, height: 130, frame: false, resizable: false,
    alwaysOnTop: true, skipTaskbar: true, show: false,
    backgroundColor: '#0a0e1a',
    webPreferences: { preload: path.join(APP_DIR, 'preload.js'), contextIsolation: true }
  });
  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><style>
    body{margin:0;background:#0a0e1a;font-family:-apple-system,sans-serif;padding:16px;border:1px solid rgba(120,180,255,.3)}
    .l{font-size:10px;letter-spacing:2px;color:#61dcff;font-family:Menlo,monospace;margin-bottom:8px}
    textarea{width:100%;box-sizing:border-box;background:rgba(20,26,60,.6);border:1px solid rgba(120,140,255,.3);color:#e6ebff;padding:9px 12px;font-size:13px;outline:none;font-family:inherit;resize:none}
    .h{font-size:10px;color:#4d5677;margin-top:7px;font-family:Menlo,monospace}
  </style></head><body>
    <div class="l">⚡ HIZLI NOT — GALAXY GÜNLÜĞÜNE</div>
    <textarea id="t" rows="2" placeholder="Aklındakini yaz…" autofocus></textarea>
    <div class="h">ENTER: KAYDET · ESC: KAPAT</div>
    <script>
      const t = document.getElementById('t');
      t.focus();
      t.addEventListener('keydown', async e => {
        if (e.key === 'Enter' && !e.shiftKey) {
          e.preventDefault();
          if (t.value.trim()) await window.galaxy.logSave(t.value.trim());
          window.close();
        }
        if (e.key === 'Escape') window.close();
      });
    <\/script>
  </body></html>`;
  quickWin.loadURL('data:text/html;charset=utf-8,' + encodeURIComponent(html));
  quickWin.once('ready-to-show', () => quickWin.show());
  quickWin.on('blur', () => { if (quickWin && !quickWin.isDestroyed()) quickWin.close(); });
}

function createTray() {
  try {
    const iconPath = path.join(APP_DIR, 'build', 'tray.png');
    const img = fs.existsSync(iconPath)
      ? nativeImage.createFromPath(iconPath).resize({ width: 18, height: 18 })
      : nativeImage.createEmpty();
    tray = new Tray(img);
    tray.setToolTip('Project Galaxy');
    tray.setContextMenu(Menu.buildFromTemplate([
      { label: '⚡ Hızlı Not (⌘⇧G)', click: showQuickCapture },
      { label: 'Galaxy\'yi Aç', click: () => { const wins = BrowserWindow.getAllWindows().filter(w => w !== quickWin); if (wins.length) { wins[0].show(); wins[0].focus(); } else createWindow(); } },
      { type: 'separator' },
      { label: 'Çıkış', click: () => app.quit() }
    ]));
  } catch (err) { /* tray başarısız olsa da uygulama çalışsın */ }
}

app.whenReady().then(() => {
  createWindow();
  createTray();
  globalShortcut.register('CommandOrControl+Shift+G', showQuickCapture);
});
app.on('will-quit', () => globalShortcut.unregisterAll());
app.on('window-all-closed', () => { /* tray'de yaşamaya devam et */ });
app.on('activate', () => {
  const wins = BrowserWindow.getAllWindows().filter(w => w !== quickWin);
  if (!wins.length) createWindow();
});
