const { app, BrowserWindow, ipcMain, shell, Tray, Menu, nativeImage, globalShortcut, dialog, safeStorage } = require('electron');
const fs = require('fs');
const path = require('path');
const { spawn, execFile } = require('child_process');

const APP_DIR = __dirname;
const os = require('os');
const IS_MAS = !!process.mas; // Mac App Store (sandbox) sürümü

// ---------- veri dizini ----------
// Kalıcı veri ~/Library/Application Support/ProjectGalaxy altında yaşar
// (MAS sürümünde otomatik olarak uygulamanın sandbox konteynerine düşer).
// GALAXY_DATA_DIR ortam değişkeni test/geliştirme için önceliklidir.
const DEFAULT_DATA_DIR = path.join(app.getPath('appData'), 'ProjectGalaxy');
const DATA_DIR = (process.env.GALAXY_DATA_DIR && process.env.GALAXY_DATA_DIR.trim()) || DEFAULT_DATA_DIR;
const DATA_FILE = path.join(DATA_DIR, 'galaxy-data.json');

// Eski sürümlerin veri konumları — ilk açılışta tek seferlik yeni konuma taşınır
const LEGACY_DATA_DIRS = [
  APP_DIR,
  path.join(os.homedir(), 'Desktop', 'FY', 'Projects', 'ProjectGalaxy'),
  path.join(os.homedir(), 'Desktop', 'PAPILON', 'ProjectGalaxy'),
];

function migrateLegacyData() {
  try {
    if (fs.existsSync(DATA_FILE)) return; // yeni konumda veri zaten var
    fs.mkdirSync(DATA_DIR, { recursive: true });
    const legacy = LEGACY_DATA_DIRS.find(d => {
      try { return d && path.resolve(d) !== path.resolve(DATA_DIR) && fs.existsSync(path.join(d, 'galaxy-data.json')); } catch (e) { return false; }
    });
    if (!legacy) return; // temiz kurulum — evrenleri onboarding ekleyecek
    // Göreli evren kökleri (ör. "..") eski konuma göre mutlaklaştırılır
    const d = JSON.parse(fs.readFileSync(path.join(legacy, 'galaxy-data.json'), 'utf8'));
    for (const u of d.universes || []) {
      if (u.root && !path.isAbsolute(u.root)) u.root = path.resolve(legacy, u.root);
    }
    fs.writeFileSync(DATA_FILE, JSON.stringify(d, null, 2), 'utf8');
    for (const sub of ['backups', 'reports', 'attachments']) {
      const src = path.join(legacy, sub);
      try { if (fs.existsSync(src)) fs.cpSync(src, path.join(DATA_DIR, sub), { recursive: true, force: false }); } catch (e) {}
    }
  } catch (e) { /* migrasyon başarısız olsa da uygulama açılır */ }
  // Veri dizininde git versiyonlama (git kuruluysa) başlat
  try {
    if (!fs.existsSync(path.join(DATA_DIR, '.git'))) {
      if (!fs.existsSync(path.join(DATA_DIR, '.gitignore'))) fs.writeFileSync(path.join(DATA_DIR, '.gitignore'), 'attachments/\n', 'utf8');
      require('child_process').exec('git init -q', { cwd: DATA_DIR, env: ENV }, () => {});
    }
  } catch (e) {}
}

// GUI'den açılınca PATH kısıtlı olur; node/claude için genişlet
const ENV = { ...process.env, PATH: `${process.env.PATH || ''}:/opt/homebrew/bin:/usr/local/bin:${process.env.HOME}/.local/bin` };

// App Store (sandbox) sürümünde dış süreç başlatan özellikler devre dışıdır
const MAS_BLOCKED = 'Bu özellik App Store sürümünde kullanılamıyor (sandbox, dış komut çalıştırmaya izin vermez). Ajanlar ve konsollar için uygulamanın doğrudan indirilen (DMG) sürümünü kullan.';

// ---------- MAS: security-scoped bookmark erişimi ----------
// Sandbox'ta kullanıcının seçtiği klasörlere kalıcı erişim bookmark'larla sağlanır.
const bookmarkStops = [];
function startBookmarkAccess(bookmark) {
  if (!IS_MAS || !bookmark) return;
  try { bookmarkStops.push(app.startAccessingSecurityScopedResource(bookmark)); } catch (e) {}
}
function restoreBookmarks() {
  if (!IS_MAS) return;
  const data = loadData();
  for (const u of data.universes || []) startBookmarkAccess(u.bookmark);
}
app.on('will-quit', () => { for (const stop of bookmarkStops) { try { stop(); } catch (e) {} } });

// Varsayılan 5 ajan — onboarding'de adları/rolleri kişiselleştirilir
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

function listDirs(dir) {
  try {
    return fs.readdirSync(dir, { withFileTypes: true })
      .filter(d => d.isDirectory() && !d.name.startsWith('.') && !IGNORE.has(d.name) && !d.name.endsWith('.app'))
      .map(d => d.name.normalize('NFC'));
  } catch (e) { return []; }
}

const knownPaths = new Set();

// ---------- hiyerarşi algılama: proje mi, çatı (sistem) klasörü mü? ----------
// Gerçek uzay konsepti: evren kökündeki bir klasör kendi başına projeyse GEZEGEN,
// projeleri barındıran bir çatıysa YILDIZ SİSTEMİ olur — içindeki her proje
// o sistemin gezegeni olarak ayrı ayrı haritaya girer (grup = sistem adı).
const PROJECT_MARKERS = [
  'package.json', 'pubspec.yaml', 'go.mod', 'Cargo.toml', 'requirements.txt',
  'pyproject.toml', 'pom.xml', 'build.gradle', 'build.gradle.kts', 'composer.json',
  'Gemfile', 'Makefile', 'CMakeLists.txt', 'Package.swift', 'index.html', 'src'
];
const CODE_EXT_RE = /\.(swift|kt|kts|java|ts|tsx|js|jsx|py|go|rs|rb|php|cs|c|cpp|h|m|mm|dart|vue|svelte|sql|ipynb)$/i;

function looksLikeProject(dir) {
  try {
    const names = fs.readdirSync(dir).map(n => n.normalize('NFC'));
    const set = new Set(names);
    if (set.has('.git')) return true;
    if (names.some(n => n.endsWith('.xcodeproj') || n.endsWith('.xcworkspace'))) return true;
    for (const m of PROJECT_MARKERS) if (set.has(m)) return true;
    if (names.some(n => CODE_EXT_RE.test(n))) return true;
    return false;
  } catch (e) { return false; }
}

function looksLikeContainer(dir) {
  if (looksLikeProject(dir)) return false;   // kendisi projeyse gezegen kalır
  const subs = listDirs(dir);
  if (!subs.length) return false;
  let projLike = 0;
  for (const s of subs.slice(0, 30)) {
    if (looksLikeProject(path.join(dir, s))) projLike++;
    if (projLike) return true;               // içinde en az bir proje varsa çatıdır
  }
  return false;
}

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
  // Eski sürümlerden kalan göreli kökler veri dizinine göre çözülür;
  // yeni evrenler her zaman mutlak yolla kaydedilir (migrasyon da mutlaklaştırır)
  return path.isAbsolute(root) ? root : path.resolve(DATA_DIR, root);
}

// Uzay modunda ajanların çalışma dizini: ilk evrenin kökü (yoksa ev dizini)
function universeCwd(data) {
  for (const u of (data && data.universes) || []) {
    try {
      const r = resolveRoot(u.root);
      if (fs.existsSync(r)) return r;
    } catch (e) {}
  }
  return os.homedir();
}

// Kullanıcı profili → ajan prompt'larına eklenen kişisel bağlam
function profileContext(data) {
  const p = (data && data.profile) || {};
  const en = p.lang === 'en';
  const parts = [];
  if (p.name) parts.push(en ? `The user's name is ${p.name} — address them by name.` : `Kullanıcının adı ${p.name} — ona ismiyle hitap et.`);
  parts.push(en ? 'Respond in English.' : 'Yanıtlarını Türkçe ver.');
  return parts.join(' ');
}

function scanProjects() {
  const data = loadData();
  knownPaths.clear();
  const projects = [];
  let hierarchyChanged = false;

  for (const u of data.universes) {
    const root = resolveRoot(u.root);
    u.expandDirs = u.expandDirs || [];
    // Otomatik hiyerarşi: çatı klasörler yıldız sistemi olarak işaretlenir (kalıcı)
    for (const name of listDirs(root)) {
      if (u.expandDirs.includes(name)) continue;
      if (looksLikeContainer(path.join(root, name))) {
        u.expandDirs.push(name);
        hierarchyChanged = true;
      }
    }
    const found = [];
    for (const name of listDirs(root)) {
      if (u.expandDirs.includes(name)) {
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
  if (hierarchyChanged) { try { saveData(data); } catch (e) {} } // sistem işaretleri kalıcı olsun

  /* ---- uzak (SSH) evrenler ----
     Önbellekten okunur; ağ beklemesi YOK. Projeler yerel gezegenlerle
     birebir aynı şekle sahiptir, böylece derlenmiş arayüz onları ayırt etmez. */
  const remoteUniverses = [];
  for (const srv of (data.servers || [])) {
    const cache = remoteCache.get(srv.id);
    for (const rt of (srv.roots || [])) {
      const uid = 'ssh-' + srv.id + '-' + slugify(rt.name || rt.path);
      remoteUniverses.push({
        id: uid,
        name: rt.name ? `${srv.name} · ${rt.name}` : srv.name,
        subtitle: (cache && cache.error) ? 'çevrimdışı' : (rt.path || ''),
        remote: true, serverId: srv.id, offline: !!(cache && cache.error)
      });
      for (const rp of ((cache && cache.projects) || [])) {
        if (rp.root !== rt.path) continue;
        const full = remotePath(srv.id, rp.path);
        const id = uid + '/' + rp.name;
        if ((data.ignored || []).includes(id)) continue;
        knownPaths.add(full);
        const saved = data.projects[id] || {};
        projects.push({
          git: rp.isGit ? { branch: rp.branch, lastTs: rp.lastTs, activity30: rp.activity30 } : null,
          staleDays: rp.staleDays == null ? 0 : rp.staleDays,
          hasReadme: !!rp.readme,
          links: saved.links || [],
          id,
          universe: uid,
          name: saved.name || rp.name,
          group: saved.group || (rt.name || srv.name),
          status: saved.status || 'unknown',
          stage: saved.stage || '',
          progress: saved.progress ?? 0,
          plan: saved.plan || [],
          notes: saved.notes || '',
          desc: saved.desc || '',
          mtime: rp.mtime,
          path: full,
          remote: true, serverId: srv.id
        });
      }
    }
  }

  const st = getSettings(data);
  return {
    universes: data.universes.map(u => ({ id: u.id, name: u.name, subtitle: u.subtitle || '' }))
      .concat(remoteUniverses),
    projects,
    agents: (data.agents || []).map(a => ({ id: a.id, name: a.name, role: a.role, color: a.color || '#61dcff', presets: a.presets || [] })),
    alerts: buildAlerts(projects, st),
    settings: st,
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

// ---------- kullanıcı ayarları (uyarı eşikleri vb.) ----------
const DEFAULT_SETTINGS = { staleDays: 21, planPending: 5 };
function getSettings(data) {
  const s = (data && data.settings) || {};
  return {
    staleDays: Math.min(365, Math.max(1, +s.staleDays || DEFAULT_SETTINGS.staleDays)),
    planPending: Math.min(50, Math.max(1, +s.planPending || DEFAULT_SETTINGS.planPending))
  };
}

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

ipcMain.handle('galaxy:load', async () => {
  // Uzak sunucular varsa: önbellek boşsa ilk taramayı bekle, doluysa
  // arka planda tazele ve eldeki veriyle hemen dön (stale-while-revalidate).
  const servers = (loadData().servers || []);
  if (servers.length && !IS_MAS) {
    const cold = servers.filter(s => !remoteCache.has(s.id));
    if (cold.length) await Promise.all(cold.map(s => remoteRefresh(s.id, true)));
    for (const s of servers) if (!cold.includes(s)) remoteRefresh(s.id);
  }
  return scanProjects();
});

// ---------- evren CRUD ----------
function slugify(s) {
  return s.toLowerCase().replace(/[çğıöşü]/g, c => ({ 'ç': 'c', 'ğ': 'g', 'ı': 'i', 'ö': 'o', 'ş': 's', 'ü': 'u' }[c]))
    .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'evren';
}

ipcMain.handle('galaxy:universeAdd', (e, { name, root, bookmark }) => {
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
  data.universes.push({ id, name, subtitle: prefix, root, prefix, bookmark: bookmark || undefined, expandDirs: [] });
  saveData(data);
  startBookmarkAccess(bookmark);
  return { ok: true, id };
});

// Klasör seçici — MAS sürümünde kalıcı erişim için security-scoped bookmark üretir
ipcMain.handle('galaxy:pickFolder', async (e) => {
  const win = BrowserWindow.fromWebContents(e.sender);
  const r = await dialog.showOpenDialog(win, {
    title: 'Klasör seç',
    properties: ['openDirectory', 'createDirectory'],
    securityScopedBookmarks: true
  });
  if (r.canceled || !r.filePaths.length) return null;
  return { path: r.filePaths[0], bookmark: (r.bookmarks && r.bookmarks[0]) || null };
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
  if (isRemotePath(p)) return { ok: false, error: 'Uzak klasör Finder\'da açılamaz' };
  if (p && knownPaths.has(p)) shell.openPath(p);
});

// Yalnızca yerel makinedeki bir portu tarayıcıda açar (Docker konteyner portları).
// Keyfi URL açılmasın diye kalıp katı: http://localhost:<port>
ipcMain.handle('galaxy:openLocalPort', (e, port) => {
  const n = parseInt(port, 10);
  if (!(n >= 1 && n <= 65535)) return { ok: false };
  shell.openExternal('http://localhost:' + n);
  return { ok: true };
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

ipcMain.handle('galaxy:tree', async (e, p) => {
  if (!p || !knownPaths.has(p)) return null;
  if (isRemotePath(p)) return remoteTree(p, 3);
  return buildTree(p, 3);
});

// ---------- tek seviye dizin listesi (gezegen yörüngesi) ----------
function safeJoin(root, rel) {
  const full = path.resolve(root, rel || '');
  return (full === root || full.startsWith(root + path.sep)) ? full : null;
}

ipcMain.handle('galaxy:list', async (e, { root, rel }) => {
  if (!root || !knownPaths.has(root)) return null;
  if (isRemotePath(root)) return remoteList(root, rel);
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

ipcMain.handle('galaxy:file', async (e, { root, rel }) => {
  if (!root || !knownPaths.has(root)) return null;
  if (isRemotePath(root)) return remoteFile(root, rel);
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
  const client = new Client({ ...base, database: base.database || 'postgres', connectionTimeoutMillis: 6000 });
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

// ---------- yerel veritabanı sunucularını otomatik algıla ----------
// Kullanıcının kendi bilgisayarında çalışan PostgreSQL/MySQL sunucuları
// açılışta bulunur ve "Bu Mac — …" bağlantısı olarak otomatik eklenir.
// Her port için yalnızca bir kez eklenir: kullanıcı silerse yeniden eklenmez;
// sunucu o an kapalıysa sonraki açılışlarda tekrar denenir.
function probePort(port, timeoutMs) {
  return new Promise(resolve => {
    const net = require('net');
    const s = new net.Socket();
    let done = false;
    const fin = ok => { if (!done) { done = true; try { s.destroy(); } catch (e) {} resolve(ok); } };
    s.setTimeout(timeoutMs || 800);
    s.once('connect', () => fin(true));
    s.once('timeout', () => fin(false));
    s.once('error', () => fin(false));
    try { s.connect(port, '127.0.0.1'); } catch (e) { fin(false); }
  });
}

const LOCAL_DB_CANDIDATES = [
  { port: 5432, type: 'postgres', name: 'Bu Mac — PostgreSQL', user: 'postgres', database: 'postgres' },
  { port: 3306, type: 'mysql', name: 'Bu Mac — MySQL', user: 'root', database: '' }
];

async function autoDetectLocalDbs() {
  try {
    const data = loadData();
    data.dbAutoAdded = data.dbAutoAdded || {};
    let changed = false;
    for (const c of LOCAL_DB_CANDIDATES) {
      if (data.dbAutoAdded[c.port]) continue; // daha önce otomatik eklendi (silindiyse saygı duy)
      const exists = (data.dbs || []).some(d => (d.host === 'localhost' || d.host === '127.0.0.1') && +d.port === c.port);
      if (exists) { data.dbAutoAdded[c.port] = true; changed = true; continue; }
      if (!(await probePort(c.port))) continue; // bu portta sunucu çalışmıyor — sonraki açılışta yine bak
      data.dbs = data.dbs || [];
      data.dbs.push({
        id: 'local-' + c.port, name: c.name, type: c.type,
        host: 'localhost', port: c.port, database: c.database,
        user: c.user, password: encPass('')
      });
      data.dbAutoAdded[c.port] = true;
      changed = true;
    }
    if (changed) {
      // Stale-write koruması: probePort beklerken (~sn) kullanıcı sunucu/todo/ayar
      // eklemiş olabilir. Eski `data`yı yazmak onları silerdi — bu yüzden TAZE oku,
      // yalnızca kendi dokunduğumuz alanları birleştir.
      const fresh = loadData();
      fresh.dbs = data.dbs;
      fresh.dbAutoAdded = data.dbAutoAdded;
      saveData(fresh);
    }
  } catch (e) { /* algılama başarısız olsa da uygulama etkilenmez */ }
}

ipcMain.handle('galaxy:dbList', () => (loadData().dbs || []).map(({ password, ...rest }) => rest));

ipcMain.handle('galaxy:dbSave', (e, db) => {
  const isSqlite = db.type === 'sqlite';
  if (!db.name || (isSqlite ? !db.file : (!db.host || !db.user))) {
    return { ok: false, error: isSqlite ? 'Ad ve dosya yolu gerekli' : 'Ad, sunucu ve kullanıcı gerekli' };
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
      database: db.database || '', user: db.user,
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

function dbErr(err) {
  return err.code === 'MODULE_NOT_FOUND' ? 'Sürücü eksik — ProjectGalaxy klasöründe: npm install' : err.message;
}

// Sunucudaki TÜM veritabanlarını listele
ipcMain.handle('galaxy:dbDatabases', async (e, id) => {
  const cfg = getDbCfg(id);
  if (!cfg) return { ok: false, error: 'Bağlantı bulunamadı' };
  if (cfg.type === 'sqlite') return { ok: true, databases: [path.basename(cfg.file || 'sqlite')] };
  try {
    const c = await dbConnect({ ...cfg, database: cfg.type === 'postgres' ? (cfg.database || 'postgres') : (cfg.database || undefined) });
    const sql = cfg.type === 'mysql'
      ? 'SHOW DATABASES'
      : `SELECT datname FROM pg_database WHERE datistemplate = false ORDER BY 1`;
    const r = await c.query(sql);
    c.end();
    const skip = new Set(['information_schema', 'performance_schema', 'mysql', 'sys']);
    const databases = r.rows.map(row => Object.values(row)[0]).filter(d => !skip.has(d));
    return { ok: true, databases };
  } catch (err) { return { ok: false, error: dbErr(err) }; }
});

ipcMain.handle('galaxy:dbTables', async (e, { id, database }) => {
  const cfg = getDbCfg(id);
  if (!cfg) return { ok: false, error: 'Bağlantı bulunamadı' };
  try {
    const c = await dbConnect(cfg.type === 'sqlite' ? cfg : { ...cfg, database: database || cfg.database });
    const sql = cfg.type === 'sqlite'
      ? `SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY 1`
      : cfg.type === 'mysql'
        ? 'SHOW TABLES'
        : `SELECT schemaname || '.' || tablename AS t FROM pg_catalog.pg_tables WHERE schemaname NOT IN ('pg_catalog','information_schema') ORDER BY 1`;
    const r = await c.query(sql);
    c.end();
    const tables = r.rows.map(row => Object.values(row)[0]);
    return { ok: true, tables };
  } catch (err) { return { ok: false, error: dbErr(err) }; }
});

// Şema: tablolar + kolonlar + foreign key ilişkileri
ipcMain.handle('galaxy:dbSchema', async (e, { id, database }) => {
  const cfg = getDbCfg(id);
  if (!cfg) return { ok: false, error: 'Bağlantı bulunamadı' };
  try {
    const c = await dbConnect(cfg.type === 'sqlite' ? cfg : { ...cfg, database: database || cfg.database });
    const tables = []; const fks = [];

    if (cfg.type === 'sqlite') {
      const tr = await c.query(`SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY 1`);
      for (const row of tr.rows.slice(0, 60)) {
        const t = Object.values(row)[0];
        const cols = await c.query(`PRAGMA table_info("${t}")`);
        tables.push({ name: t, columns: cols.rows.map(cl => ({ name: cl.name, type: cl.type, pk: !!cl.pk })) });
        const fkr = await c.query(`PRAGMA foreign_key_list("${t}")`);
        for (const fk of fkr.rows) fks.push({ from: t, fromCol: fk.from, to: fk.table, toCol: fk.to });
      }
    } else if (cfg.type === 'mysql') {
      const db = database || cfg.database;
      const cr = await c.query(`SELECT TABLE_NAME t, COLUMN_NAME c, COLUMN_TYPE ty, COLUMN_KEY k FROM information_schema.COLUMNS WHERE TABLE_SCHEMA='${db.replace(/'/g, "''")}' ORDER BY TABLE_NAME, ORDINAL_POSITION`);
      const byT = {};
      for (const r2 of cr.rows) (byT[r2.t] ||= []).push({ name: r2.c, type: r2.ty, pk: r2.k === 'PRI' });
      for (const [name, columns] of Object.entries(byT)) tables.push({ name, columns });
      const fr = await c.query(`SELECT TABLE_NAME f, COLUMN_NAME fc, REFERENCED_TABLE_NAME rt, REFERENCED_COLUMN_NAME rc FROM information_schema.KEY_COLUMN_USAGE WHERE TABLE_SCHEMA='${db.replace(/'/g, "''")}' AND REFERENCED_TABLE_NAME IS NOT NULL`);
      for (const r2 of fr.rows) fks.push({ from: r2.f, fromCol: r2.fc, to: r2.rt, toCol: r2.rc });
    } else {
      const cr = await c.query(`SELECT table_schema||'.'||table_name t, column_name c, data_type ty FROM information_schema.columns WHERE table_schema NOT IN ('pg_catalog','information_schema') ORDER BY table_schema, table_name, ordinal_position`);
      const pkr = await c.query(`SELECT tc.table_schema||'.'||tc.table_name t, kcu.column_name c FROM information_schema.table_constraints tc JOIN information_schema.key_column_usage kcu ON tc.constraint_name=kcu.constraint_name AND tc.table_schema=kcu.table_schema WHERE tc.constraint_type='PRIMARY KEY'`);
      const pkSet = new Set(pkr.rows.map(r2 => r2.t + '|' + r2.c));
      const byT = {};
      for (const r2 of cr.rows) (byT[r2.t] ||= []).push({ name: r2.c, type: r2.ty, pk: pkSet.has(r2.t + '|' + r2.c) });
      for (const [name, columns] of Object.entries(byT)) tables.push({ name, columns });
      const fr = await c.query(`SELECT tc.table_schema||'.'||tc.table_name f, kcu.column_name fc, ccu.table_schema||'.'||ccu.table_name rt, ccu.column_name rc
        FROM information_schema.table_constraints tc
        JOIN information_schema.key_column_usage kcu ON tc.constraint_name=kcu.constraint_name AND tc.table_schema=kcu.table_schema
        JOIN information_schema.constraint_column_usage ccu ON ccu.constraint_name=tc.constraint_name AND ccu.table_schema=tc.table_schema
        WHERE tc.constraint_type='FOREIGN KEY'`);
      for (const r2 of fr.rows) fks.push({ from: r2.f, fromCol: r2.fc, to: r2.rt, toCol: r2.rc });
    }
    c.end();
    return { ok: true, tables: tables.slice(0, 80), fks };
  } catch (err) { return { ok: false, error: dbErr(err) }; }
});

ipcMain.handle('galaxy:dbQuery', async (e, { id, table, sql, database }) => {
  const cfg = getDbCfg(id);
  if (!cfg) return { ok: false, error: 'Bağlantı bulunamadı' };
  if (database && cfg.type !== 'sqlite') cfg.database = database;
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
  if (!proj || !proj.path) return { ok: false, error: 'Git deposu yok' };
  if (isRemotePath(proj.path)) return remoteGitLog(proj.path);
  if (!fs.existsSync(path.join(proj.path, '.git'))) return { ok: false, error: 'Git deposu yok' };
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
ipcMain.handle('galaxy:readme', async (e, p) => {
  if (!p || !knownPaths.has(p)) return null;
  if (isRemotePath(p)) return remoteReadme(p);
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
  if (IS_MAS) return { ok: false, error: MAS_BLOCKED };
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

// Ek dosyaları prompt'a ve erişim izinlerine bağlar
function applyAttachments(prompt, args, attachments) {
  if (!attachments || !attachments.length) return prompt;
  const list = attachments.slice(0, 10);
  prompt += `\n\n=== EKLENEN DOSYALAR ===\nKullanıcı şu dosyaları ekledi. Read aracıyla incele — görselleri ve PDF'leri doğrudan görebilirsin. .docx/.pptx/.xlsx gibi Office dosyaları için önce şu komutla metne çevir: textutil -convert txt -stdout "<dosya>" (veya gerekiyorsa unzip ile içeriğine bak):\n` +
    list.map(f => `- ${f}`).join('\n');
  const dirs = new Set(list.map(f => path.dirname(f)));
  for (const d of dirs) args.push('--add-dir', d);
  return prompt;
}

// Pano görüntüsünü (ekran görüntüsü) dosyaya kaydet
const { clipboard } = require('electron');
function attachmentsDir() {
  const d = path.join(DATA_DIR, 'attachments');
  fs.mkdirSync(d, { recursive: true });
  return d;
}
ipcMain.handle('galaxy:pasteImage', () => {
  const img = clipboard.readImage();
  if (!img || img.isEmpty()) return null;
  const file = path.join(attachmentsDir(), `pano-${Date.now()}.png`);
  fs.writeFileSync(file, img.toPNG());
  return file;
});

// Yolu olmayan (ör. tarayıcıdan sürüklenen) dosyayı kaydet
ipcMain.handle('galaxy:saveAttachment', (e, { name, dataBase64 }) => {
  if (!name || !dataBase64) return null;
  const safe = String(name).replace(/[^\w. çğıöşüÇĞİÖŞÜ-]/g, '_').slice(0, 80) || 'ek';
  const file = path.join(attachmentsDir(), `${Date.now()}-${safe}`);
  fs.writeFileSync(file, Buffer.from(dataBase64, 'base64'));
  return file;
});

ipcMain.handle('galaxy:pickFiles', async (e) => {
  const win = BrowserWindow.fromWebContents(e.sender);
  const { canceled, filePaths } = await dialog.showOpenDialog(win, {
    title: 'Dosya ekle',
    properties: ['openFile', 'multiSelections'],
    filters: [
      { name: 'Desteklenenler', extensions: ['png', 'jpg', 'jpeg', 'gif', 'webp', 'pdf', 'docx', 'doc', 'pptx', 'xlsx', 'csv', 'txt', 'md', 'json'] },
      { name: 'Tümü', extensions: ['*'] }
    ]
  });
  return canceled ? [] : filePaths;
});

ipcMain.handle('galaxy:claudeRun', (e, { runId, cwd, prompt, continueSession, attachments }) => {
  if (!cwd || !knownPaths.has(cwd)) return { ok: false, error: 'Geçersiz klasör' };
  const args = ['--output-format', 'stream-json', '--verbose', '--permission-mode', 'acceptEdits'];
  prompt = applyAttachments(prompt, args, attachments);
  args.unshift('-p', prompt);
  if (continueSession) args.push('--continue');
  return streamClaude({ win: BrowserWindow.fromWebContents(e.sender), channel: 'claude:out', runId, cwd, args });
});

// ---------- ajan (CTO vb.) çalıştırma ----------
ipcMain.handle('galaxy:agentRun', (e, { runId, agentId, prompt, projectId, attachments }) => {
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
    full = `${agent.prompt}\n\n=== ODAK: TEK PROJE ===\n${pdigest}\n=== SON ===\n\nŞu an bu projenin klasöründesin, dosyalarını okuyabilirsin. Yanıtını SADECE bu proje özelinde ver.\n\nKullanıcının isteği: ${prompt || 'Bu proje için durum değerlendirmesi yap.'}\n${profileContext(data)}`;
    cwd = proj.path;
  } else {
    const digest = buildDigest();
    full = `${agent.prompt}\n\n=== TÜM PROJELERİN GÜNCEL DURUMU ===\n${digest}\n=== SON ===\n\nKullanıcının isteği: ${prompt || 'Genel durum raporu ver.'}\n${profileContext(data)} Dosyaları incelemen gerekirse bulunduğun klasördeki proje klasörlerini okuyabilirsin.`;
    cwd = universeCwd(data);
  }
  const args = ['--output-format', 'stream-json', '--verbose'];
  full = applyAttachments(full, args, attachments);
  args.unshift('-p', full);
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
    if (IS_MAS) return resolve({ error: MAS_BLOCKED });
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
  const res = await runClaudeJson(prompt, universeCwd(loadData()));
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

// ---------- gömülü bash terminali ----------
// Proje başına kalıcı bash süreci: cd/env durumu korunur, çıktı canlı akar.
const shells = new Map(); // shellId -> { child, cwd }
const SHELL_SENTINEL = '\x03GALAXY_DONE ';

function broadcastShell(msg) {
  for (const w of BrowserWindow.getAllWindows()) {
    try { w.webContents.send('shell:out', msg); } catch (e) {}
  }
}

function ensureShell(shellId, cwd) {
  const existing = shells.get(shellId);
  if (existing && !existing.child.killed && existing.child.exitCode === null) return existing;
  const child = spawn('/bin/bash', ['--noprofile', '--norc'], { cwd, env: { ...ENV, PS1: '', TERM: 'dumb' } });
  let buf = '';
  child.stdout.on('data', chunk => {
    buf += chunk.toString();
    let i;
    while ((i = buf.indexOf('\n')) >= 0) {
      const line = buf.slice(0, i);
      buf = buf.slice(i + 1);
      if (line.startsWith(SHELL_SENTINEL)) {
        const rest = line.slice(SHELL_SENTINEL.length);
        const sp = rest.indexOf(' ');
        const code = +(sp >= 0 ? rest.slice(0, sp) : rest) || 0;
        const cwd = sp >= 0 ? rest.slice(sp + 1) : '';
        if (cwd) { const rec2 = shells.get(shellId); if (rec2) rec2.cwd = cwd; }
        broadcastShell({ id: shellId, kind: 'done', code, cwd });
      } else {
        broadcastShell({ id: shellId, kind: 'out', text: line });
      }
    }
  });
  child.stderr.on('data', chunk => {
    for (const line of chunk.toString().split('\n')) {
      if (line) broadcastShell({ id: shellId, kind: 'err', text: line });
    }
  });
  child.on('close', () => {
    broadcastShell({ id: shellId, kind: 'exit' });
    shells.delete(shellId);
  });
  const rec = { child, cwd };
  shells.set(shellId, rec);
  return rec;
}

ipcMain.handle('galaxy:shellStart', (e, { shellId, cwd }) => {
  if (IS_MAS) return { ok: false, error: 'Gömülü terminal App Store sürümünde devre dışı.' };
  if (!cwd || !knownPaths.has(cwd)) return { ok: false, error: 'Geçersiz klasör' };
  try {
    ensureShell(shellId, cwd);
    return { ok: true };
  } catch (err) { return { ok: false, error: err.message }; }
});

ipcMain.handle('galaxy:shellInput', (e, { shellId, cwd, cmd }) => {
  if (IS_MAS) return { ok: false, error: 'Gömülü terminal App Store sürümünde devre dışı.' };
  if (!cmd || !cmd.trim()) return { ok: false };
  if (!cwd || !knownPaths.has(cwd)) return { ok: false, error: 'Geçersiz klasör' };
  const rec = ensureShell(shellId, cwd);
  try {
    rec.child.stdin.write(cmd + '\n' + `printf '\\003GALAXY_DONE %s %s\\n' "$?" "$PWD"` + '\n');
    return { ok: true };
  } catch (err) { return { ok: false, error: err.message }; }
});

// Tab tamamlama: bulunduğu klasöre göre dosya/klasör adı önerileri
ipcMain.handle('galaxy:shellComplete', (e, { shellId, cwd, token }) => {
  try {
    const rec = shells.get(shellId);
    let base = (rec && rec.cwd) || cwd || os.homedir();
    let dirPart = '', namePart = token || '';
    const slash = (token || '').lastIndexOf('/');
    if (slash >= 0) { dirPart = token.slice(0, slash + 1); namePart = token.slice(slash + 1); }
    let dir = dirPart
      ? (dirPart.startsWith('/') ? dirPart : path.resolve(base, dirPart.replace(/^~/, os.homedir())))
      : base;
    const entries = fs.readdirSync(dir, { withFileTypes: true })
      .filter(d => d.name.startsWith(namePart) && (namePart.startsWith('.') || !d.name.startsWith('.')))
      .slice(0, 60)
      .map(d => ({ name: d.name + (d.isDirectory() ? '/' : ''), dir: d.isDirectory() }));
    return { ok: true, dirPart, matches: entries.map(x => x.name) };
  } catch (err) { return { ok: false, matches: [] }; }
});

ipcMain.handle('galaxy:shellStop', (e, shellId) => {
  const rec = shells.get(shellId);
  if (rec) { try { rec.child.kill('SIGKILL'); } catch (err) {} shells.delete(shellId); }
  return true;
});

app.on('before-quit', () => {
  for (const rec of shells.values()) { try { rec.child.kill('SIGKILL'); } catch (e) {} }
});

// Proje konumunda düz bash terminali aç
ipcMain.handle('galaxy:openTerminal', (e, p) => {
  if (IS_MAS) return false; // sandbox: Terminal'e AppleEvent gönderilemez
  if (!p || !knownPaths.has(p)) return false;
  const cmd = `cd ${JSON.stringify(p)}`;
  const script = `tell application "Terminal"
    activate
    do script "${cmd.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"
  end tell`;
  execFile('osascript', ['-e', script]);
  return true;
});

// ---------- uygulama içi zamanlayıcı ----------
function runClaudeText(prompt, cwd) {
  return new Promise(resolve => {
    if (IS_MAS) return resolve({ error: MAS_BLOCKED });
    let child;
    try {
      child = spawn('claude', ['-p', prompt, '--output-format', 'json'], { cwd, env: ENV });
    } catch (err) { return resolve({ error: err.message }); }
    let out = '';
    const timer = setTimeout(() => { child.kill('SIGTERM'); resolve({ error: 'zaman aşımı' }); }, 240000);
    child.stdout.on('data', c => { out += c.toString(); });
    child.on('error', err => { clearTimeout(timer); resolve({ error: err.code === 'ENOENT' ? 'claude bulunamadı' : err.message }); });
    child.on('close', () => {
      clearTimeout(timer);
      try { resolve({ text: (JSON.parse(out).result || '').trim() }); }
      catch (err) { resolve({ error: 'yanıt çözümlenemedi' }); }
    });
  });
}

const scheduleRunning = new Set();

async function runSchedule(s, notifyWin) {
  if (scheduleRunning.has(s.id)) return { ok: false, error: 'zaten çalışıyor' };
  scheduleRunning.add(s.id);
  try {
    const data = loadData();
    const agent = (data.agents || []).find(a => a.id === s.agentId) || (data.agents || [])[0];
    if (!agent) return { ok: false, error: 'ajan yok' };
    const digest = buildDigest();
    const full = `${agent.prompt}\n\n=== TÜM PROJELERİN GÜNCEL DURUMU ===\n${digest}\n=== SON ===\n\nZamanlanmış görev: ${s.prompt}\n${profileContext(data)} Yanıtını markdown formatında ver.`;
    const res = await runClaudeText(full, universeCwd(data));
    const date = new Date().toISOString().slice(0, 10);
    const rdir = path.join(DATA_DIR, 'reports');
    fs.mkdirSync(rdir, { recursive: true });
    const fname = `${date}-${s.id}.md`;
    const content = res.error
      ? `# ${s.name} — HATA\n\n${res.error}\n`
      : `# ${s.name} · ${date}\n\n_${agent.name} (${agent.role}) tarafından üretildi._\n\n${res.text}\n`;
    fs.writeFileSync(path.join(rdir, fname), content, 'utf8');
    // lastRun güncelle
    const d2 = loadData();
    const s2 = (d2.schedules || []).find(x => x.id === s.id);
    if (s2) { s2.lastRun = new Date().toISOString(); saveData(d2); }
    for (const w of BrowserWindow.getAllWindows()) {
      try { w.webContents.send('schedule:done', { name: s.name, file: fname, error: res.error || null }); } catch (e) {}
    }
    return { ok: !res.error, error: res.error, file: fname };
  } finally {
    scheduleRunning.delete(s.id);
  }
}

setInterval(() => {
  const data = loadData();
  const now = new Date();
  for (const s of data.schedules || []) {
    if (!s.enabled) continue;
    if (now.getHours() !== +s.hour || now.getMinutes() !== +s.minute) continue;
    if (s.type === 'weekly' && now.getDay() !== +s.weekday) continue;
    const today = now.toISOString().slice(0, 10);
    if (s.lastRun && s.lastRun.slice(0, 10) === today) continue;
    runSchedule(s);
  }
}, 60000);

ipcMain.handle('galaxy:scheduleList', () => loadData().schedules || []);

ipcMain.handle('galaxy:scheduleSave', (e, s) => {
  if (!s.name || !s.prompt) return { ok: false, error: 'Ad ve görev metni gerekli' };
  const data = loadData();
  data.schedules = data.schedules || [];
  if (!s.id) s.id = slugify(s.name) + '-' + String(Date.now()).slice(-4);
  const clean = {
    id: s.id, name: s.name, agentId: s.agentId || 'cto', prompt: s.prompt,
    type: s.type === 'weekly' ? 'weekly' : 'daily',
    hour: Math.min(23, Math.max(0, +s.hour || 9)),
    minute: Math.min(59, Math.max(0, +s.minute || 0)),
    weekday: +s.weekday || 1,
    enabled: s.enabled !== false,
    lastRun: (data.schedules.find(x => x.id === s.id) || {}).lastRun || null
  };
  const idx = data.schedules.findIndex(x => x.id === s.id);
  if (idx >= 0) data.schedules[idx] = clean; else data.schedules.push(clean);
  saveData(data);
  return { ok: true, id: s.id };
});

ipcMain.handle('galaxy:scheduleDelete', (e, id) => {
  const data = loadData();
  data.schedules = (data.schedules || []).filter(x => x.id !== id);
  saveData(data);
  return { ok: true };
});

ipcMain.handle('galaxy:scheduleRun', async (e, id) => {
  const s = (loadData().schedules || []).find(x => x.id === id);
  if (!s) return { ok: false, error: 'görev bulunamadı' };
  return runSchedule(s);
});

/* ==================== UZAK SUNUCU (SSH) ====================
 * Uzak bir makineyi "evren" olarak eklemenin temeli. Kimlik doğrulama
 * tamamen sistemin ssh'ına bırakılır: mevcut anahtarların ve ~/.ssh/config
 * Host takma adların çalışır — uygulama HİÇBİR parola saklamaz.
 * BatchMode=yes sayesinde parola sorulacak bir durumda komut asılı kalmaz,
 * temiz bir hata döner. ControlMaster ile aynı bağlantı yeniden kullanılır,
 * böylece art arda çağrılar (tarama, git, dosya) tek el sıkışmayla akar.
 */

const SSH_CTL_DIR = path.join(DATA_DIR, 'ssh');

function sshBaseArgs(srv) {
  try { fs.mkdirSync(SSH_CTL_DIR, { recursive: true }); } catch (e) {}
  const args = [
    '-o', 'BatchMode=yes',
    '-o', 'ConnectTimeout=8',
    '-o', 'StrictHostKeyChecking=accept-new',
    '-o', 'ControlMaster=auto',
    '-o', 'ControlPersist=90',
    '-o', 'ControlPath=' + path.join(SSH_CTL_DIR, 'cm-%C')
  ];
  if (srv.port && +srv.port !== 22) args.push('-p', String(+srv.port));
  if (srv.key) args.push('-o', 'IdentitiesOnly=yes', '-i', srv.key);
  return args;
}

// Hedef: ya ~/.ssh/config'teki Host takma adı, ya user@host
function sshTarget(srv) {
  if (srv.alias) return srv.alias;
  return (srv.user ? srv.user + '@' : '') + srv.host;
}

function sshExec(srv, remoteCmd, timeout) {
  return new Promise(resolve => {
    const args = [...sshBaseArgs(srv), sshTarget(srv), remoteCmd];
    execFile('ssh', args, { env: ENV, timeout: timeout || 25000, maxBuffer: 16 * 1024 * 1024 },
      (err, stdout, stderr) => {
        if (err) {
          const raw = String(stderr || err.message || '').trim();
          resolve({ ok: false, error: sshFriendly(raw), raw });
        } else resolve({ ok: true, out: String(stdout || ''), warn: String(stderr || '').trim() });
      });
  });
}

// ssh'ın ham hatalarını kullanıcının anlayacağı hâle çevir
function sshFriendly(raw) {
  const r = String(raw || '');
  if (/Permission denied/i.test(r)) {
    return 'Kimlik doğrulama başarısız — sunucu anahtarını kabul etmedi. Genel anahtarını sunucudaki ~/.ssh/authorized_keys dosyasına ekle (ssh-copy-id ile).';
  }
  if (/Could not resolve hostname|Name or service not known/i.test(r)) return 'Sunucu adı çözülemedi — adresi kontrol et.';
  if (/Connection refused/i.test(r)) return 'Bağlantı reddedildi — sunucuda SSH kapalı ya da port yanlış olabilir.';
  if (/Connection timed out|Operation timed out/i.test(r)) return 'Bağlantı zaman aşımına uğradı — sunucu erişilebilir değil ya da güvenlik duvarı engelliyor.';
  if (/Host key verification failed/i.test(r)) return 'Sunucu anahtarı doğrulanamadı — known_hosts kaydı değişmiş olabilir.';
  if (/no matching host key|no matching key exchange/i.test(r)) return 'SSH sürüm/algoritma uyuşmazlığı — sunucu çok eski olabilir.';
  return r.split('\n').filter(Boolean).slice(-1)[0] || 'SSH bağlantısı kurulamadı';
}

// ~/.ssh/config içindeki Host takma adları (joker olanlar hariç) — seçici için
// ~/.ssh altındaki özel anahtar dosyaları (.pub olmayanlar) — form seçici için
ipcMain.handle('galaxy:sshKeys', () => {
  try {
    const dir = path.join(os.homedir(), '.ssh');
    const names = fs.readdirSync(dir).filter(f => {
      if (f.endsWith('.pub') || f === 'config' || f === 'known_hosts' || f.startsWith('known_hosts')
        || f === 'authorized_keys' || f === 'agent') return false;
      try { return fs.statSync(path.join(dir, f)).isFile(); } catch (e) { return false; }
    });
    return { ok: true, keys: names.map(n => ({ name: n, path: path.join(dir, n) })) };
  } catch (e) { return { ok: true, keys: [] }; }
});

ipcMain.handle('galaxy:sshConfigHosts', () => {
  try {
    const cfg = fs.readFileSync(path.join(os.homedir(), '.ssh', 'config'), 'utf8');
    const hosts = [];
    let cur = null;
    for (const line of cfg.split('\n')) {
      const mh = line.match(/^\s*Host\s+(.+)$/i);
      if (mh) {
        for (const name of mh[1].trim().split(/\s+/)) {
          if (name.includes('*') || name.includes('?')) continue;
          cur = { alias: name, host: '', user: '', port: 0 };
          hosts.push(cur);
        }
        continue;
      }
      if (!cur) continue;
      const mk = line.match(/^\s*(HostName|User|Port)\s+(.+)$/i);
      if (mk) {
        const k = mk[1].toLowerCase(), v = mk[2].trim();
        if (k === 'hostname') cur.host = v;
        else if (k === 'user') cur.user = v;
        else if (k === 'port') cur.port = +v || 0;
      }
    }
    return { ok: true, hosts };
  } catch (e) { return { ok: true, hosts: [] }; }
});

ipcMain.handle('galaxy:sshList', () => (loadData().servers || []));

ipcMain.handle('galaxy:sshSave', (e, srv) => {
  if (!srv || !srv.name) return { ok: false, error: 'Ad gerekli' };
  if (!srv.alias && !srv.host) return { ok: false, error: 'Sunucu adresi ya da ~/.ssh/config takma adı gerekli' };
  const data = loadData();
  data.servers = data.servers || [];
  if (!srv.id) srv.id = 'srv' + Date.now();
  const clean = {
    id: srv.id,
    name: String(srv.name).slice(0, 60),
    alias: String(srv.alias || '').slice(0, 120),
    host: String(srv.host || '').slice(0, 200),
    user: String(srv.user || '').slice(0, 60),
    port: +srv.port || 0,
    key: String(srv.key || '').slice(0, 400),
    kind: (srv.kind === 'windows' || srv.kind === 'posix') ? srv.kind : '',
    // uzak evrenin kökleri: hangi klasörlerin altındaki projeler taranacak
    roots: (Array.isArray(srv.roots) ? srv.roots : []).slice(0, 12)
      .map(r => ({ name: String(r.name || '').slice(0, 60), path: String(r.path || '').slice(0, 400) }))
      .filter(r => r.path)
  };
  const idx = data.servers.findIndex(s => s.id === srv.id);
  if (idx >= 0) data.servers[idx] = clean; else data.servers.push(clean);
  saveData(data);
  return { ok: true, id: srv.id };
});

ipcMain.handle('galaxy:sshDelete', (e, id) => {
  const data = loadData();
  data.servers = (data.servers || []).filter(s => s.id !== id);
  saveData(data);
  return { ok: true };
});

const getServer = id => (loadData().servers || []).find(s => s.id === id);

/* PowerShell'e komut göndermenin dayanıklı yolu: ssh → cmd.exe → powershell
   zincirinde tırnak kaçışı güvenilmezdir. -EncodedCommand (UTF-16LE base64)
   bu sorunu tamamen ortadan kaldırır. */
function psCommand(script) {
  return 'powershell -NoProfile -EncodedCommand ' + Buffer.from(script, 'utf16le').toString('base64');
}

// Uzak makine POSIX mi Windows mu? Önce POSIX denenir, olmazsa PowerShell.
async function sshProbe(srv) {
  const p = await sshExec(srv,
    'echo "GX|$(uname -s)|$(uname -m)|$(hostname)|$(whoami)|$(git --version 2>/dev/null | head -1)|$(docker --version 2>/dev/null | head -1)"',
    20000);
  if (p.ok) {
    const l = (p.out.split('\n').find(x => x.startsWith('GX|')) || '').split('|');
    // cmd.exe de bu komutu "çalıştırıp" saçma çıktı verebilir; uname sonucu boşsa POSIX değildir
    if (l[1]) {
      return { ok: true, kind: 'posix', os: l[1], arch: l[2] || '', hostname: l[3] || '', user: l[4] || '', git: l[5] || '', docker: l[6] || '' };
    }
  }
  const w = await sshExec(srv, psCommand(`
$ErrorActionPreference='SilentlyContinue'
$g = (& git --version 2>$null) | Select-Object -First 1
$d = (& docker --version 2>$null) | Select-Object -First 1
Write-Output ("GX|Windows|{0}|{1}|{2}|{3}|{4}|{5}" -f $env:PROCESSOR_ARCHITECTURE, $env:COMPUTERNAME, $env:USERNAME, $g, $d, $PSVersionTable.PSVersion.ToString())
`), 25000);
  if (w.ok) {
    const l = (w.out.split('\n').find(x => x.startsWith('GX|')) || '').split('|');
    if (l[1]) {
      return { ok: true, kind: 'windows', os: 'Windows', arch: l[2] || '', hostname: l[3] || '', user: l[4] || '', git: l[5] || '', docker: l[6] || '', powershell: l[7] || '' };
    }
  }
  return { ok: false, error: (p.ok ? null : p.error) || (w.ok ? 'Uzak kabuk tanınamadı' : w.error) };
}

// Bağlantı testi: kimlik doğrulama + uzak ortam künyesi (POSIX ve Windows)
ipcMain.handle('galaxy:sshTest', async (e, srvRaw) => {
  if (IS_MAS) return { ok: false, error: MAS_BLOCKED };
  const srv = (srvRaw && srvRaw.id && !srvRaw.host && !srvRaw.alias) ? getServer(srvRaw.id) : srvRaw;
  if (!srv) return { ok: false, error: 'Sunucu bulunamadı' };
  const r = await sshProbe(srv);
  if (!r.ok) return r;
  // algılanan kabuk türünü kaydet ki tarama doğru betiği kullansın
  if (srv.id) {
    const data = loadData();
    const s = (data.servers || []).find(x => x.id === srv.id);
    if (s && s.kind !== r.kind) { s.kind = r.kind; saveData(data); }
  }
  return r;
});

/* Uzak kökteki projeleri TEK ssh çağrısında tarar.
   Her proje için: ad, yol, git mi, dal, son commit, son değişiklik, README, 30g aktivite.
   Çıktı satır formatı:  P|ad|yol|isGit|dal|commitEpoch|mtimeEpoch|readmeAdı|act30 */
const REMOTE_SCAN = `
for ROOT in %ROOTS%; do
  [ -d "$ROOT" ] || continue
  for D in "$ROOT"/*/; do
    [ -d "$D" ] || continue
    D="\${D%/}"
    NAME=$(basename "$D")
    case "$NAME" in .*|node_modules|venv|__pycache__) continue;; esac
    ISGIT=0; BRANCH=""; CEPOCH=0; ACT30=0
    if [ -d "$D/.git" ]; then
      ISGIT=1
      BRANCH=$(git -C "$D" rev-parse --abbrev-ref HEAD 2>/dev/null)
      CEPOCH=$(git -C "$D" log -1 --format=%ct 2>/dev/null)
      ACT30=$(git -C "$D" log --since=30.days --oneline 2>/dev/null | wc -l | tr -d ' ')
    fi
    MEPOCH=$(find "$D" -maxdepth 2 -type f -not -path '*/.git/*' -newermt '1970-01-01' -printf '%T@\\n' 2>/dev/null | sort -rn | head -1 | cut -d. -f1)
    [ -z "$MEPOCH" ] && MEPOCH=$(stat -c %Y "$D" 2>/dev/null || stat -f %m "$D" 2>/dev/null)
    README=""
    for F in README.md readme.md README.MD README; do
      [ -f "$D/$F" ] && README="$F" && break
    done
    echo "P|$NAME|$D|$ISGIT|$BRANCH|\${CEPOCH:-0}|\${MEPOCH:-0}|$README|\${ACT30:-0}"
  done
done
`;

/* Windows karşılığı — aynı "P|…" satır formatını üretir, böylece ayrıştırıcı ortaktır.
   Not: uzak makine Windows ise POSIX betiği hiç çalışmaz (cmd.exe/PowerShell), bu yüzden
   kabuk türüne göre ayrılmak zorunludur. */
const REMOTE_SCAN_WIN = `
$ErrorActionPreference='SilentlyContinue'
$roots = @(%ROOTS%)
$epoch = Get-Date '1970-01-01Z'
foreach ($root in $roots) {
  if (-not (Test-Path $root)) { continue }
  foreach ($d in Get-ChildItem -LiteralPath $root -Directory -ErrorAction SilentlyContinue) {
    $name = $d.Name
    if ($name -match '^\\.' -or $name -in @('node_modules','venv','__pycache__','$RECYCLE.BIN','System Volume Information')) { continue }
    $p = $d.FullName
    $isGit = 0; $branch = ''; $cepoch = 0
    if (Test-Path (Join-Path $p '.git')) {
      $isGit = 1
      $branch = (& git -C $p rev-parse --abbrev-ref HEAD 2>$null) | Select-Object -First 1
      $cepoch = (& git -C $p log -1 --format=%ct 2>$null) | Select-Object -First 1
    }
    $mt = $d.LastWriteTimeUtc
    $newest = Get-ChildItem -LiteralPath $p -File -Recurse -Depth 1 -ErrorAction SilentlyContinue |
              Sort-Object LastWriteTimeUtc -Descending | Select-Object -First 1
    if ($newest -and $newest.LastWriteTimeUtc -gt $mt) { $mt = $newest.LastWriteTimeUtc }
    $mepoch = [int64](New-TimeSpan -Start $epoch -End $mt).TotalSeconds
    $readme = ''
    foreach ($f in @('README.md','readme.md','README.MD','README')) {
      if (Test-Path (Join-Path $p $f)) { $readme = $f; break }
    }
    if (-not $cepoch) { $cepoch = 0 }
    Write-Output ("P|{0}|{1}|{2}|{3}|{4}|{5}|{6}" -f $name,$p,$isGit,$branch,$cepoch,$mepoch,$readme)
  }
}
`;

async function sshScanServer(id) {
  const srv = getServer(id);
  if (!srv) return { ok: false, error: 'Sunucu bulunamadı' };
  const roots = (srv.roots || []).map(r => r.path);
  if (!roots.length) return { ok: false, error: 'Bu sunucu için taranacak klasör tanımlı değil' };

  let kind = srv.kind;
  if (!kind) {                      // henüz test edilmediyse kabuk türünü şimdi bul
    const probe = await sshProbe(srv);
    if (!probe.ok) return probe;
    kind = probe.kind;
    const data = loadData();
    const s = (data.servers || []).find(x => x.id === srv.id);
    if (s) { s.kind = kind; saveData(data); }
  }

  let r;
  if (kind === 'windows') {
    // PowerShell tek tırnaklı dizge: içindeki ' karakteri '' olarak kaçırılır
    const psList = roots.map(p => "'" + String(p).replace(/'/g, "''") + "'").join(',');
    r = await sshExec(srv, psCommand(REMOTE_SCAN_WIN.replace('%ROOTS%', psList)), 90000);
  } else {
    // Yollar tek tırnakla kaçırılır; uzak kabukta genişletme olmaz
    const quoted = roots.map(p => "'" + String(p).replace(/'/g, "'\\''") + "'").join(' ');
    r = await sshExec(srv, REMOTE_SCAN.replace('%ROOTS%', quoted), 60000);
  }
  if (!r.ok) return r;
  const projects = [];
  for (const line of r.out.split('\n')) {
    if (!line.startsWith('P|')) continue;
    const [, name, rpath, isGit, branch, cepoch, mepoch, readme, act30] = line.split('|');
    if (!name || !rpath) continue;
    const cts = +cepoch || 0, mts = +mepoch || 0;
    const last = (cts || mts || 0) * 1000;
    projects.push({
      name, path: rpath, isGit: isGit === '1', branch: (branch || '').trim(),
      lastTs: cts ? new Date(cts * 1000).toISOString() : null,
      mtime: mts ? new Date(mts * 1000).toISOString() : null,
      activity30: +act30 || 0,
      lastActivity: last || null,
      staleDays: last ? Math.floor((Date.now() - last) / 86400000) : null,
      readme: (readme || '').trim(),
      // hangi kökün altından geldiği (evren eşlemesi için)
      root: roots.find(rt => rpath === rt || rpath.startsWith(rt.replace(/\/$/, '') + '/')) || roots[0]
    });
  }
  return { ok: true, projects, count: projects.length, kind };
}

/* ---- Uzak evren önbelleği ----
   scanProjects() eşzamanlıdır ve sık çağrılır; SSH ise ağ gecikmesine tabidir.
   Bu yüzden uzak veri arka planda tazelenir, harita her zaman önbellekten çizilir
   (stale-while-revalidate). Bağlantı koparsa son bilinen durum gösterilir. */
const remoteCache = new Map();   // serverId → { ts, projects, error, kind }
const REMOTE_TTL = 60000;
let remoteRefreshing = new Set();

function remoteRefresh(id, force) {
  const c = remoteCache.get(id);
  if (!force && c && Date.now() - c.ts < REMOTE_TTL) return Promise.resolve(c);
  if (remoteRefreshing.has(id)) return Promise.resolve(c);
  remoteRefreshing.add(id);
  return sshScanServer(id)
    .then(r => {
      const entry = r.ok
        ? { ts: Date.now(), projects: r.projects, error: null, kind: r.kind }
        : { ts: Date.now(), projects: (c && c.projects) || [], error: r.error, kind: c && c.kind };
      remoteCache.set(id, entry);
      return entry;
    })
    .catch(err => {
      const entry = { ts: Date.now(), projects: (c && c.projects) || [], error: String(err && err.message || err) };
      remoteCache.set(id, entry);
      return entry;
    })
    .finally(() => remoteRefreshing.delete(id));
}

// Uzak yol ad alanı: ssh://<serverId>/mutlak/yol
const remotePath = (srvId, p) => 'ssh://' + srvId + p;
const isRemotePath = p => typeof p === 'string' && p.startsWith('ssh://');
function parseRemote(p) {
  if (!isRemotePath(p)) return null;
  const rest = p.slice(6);
  const i = rest.indexOf('/');
  if (i < 0) return null;
  return { serverId: rest.slice(0, i), path: rest.slice(i) };
}

ipcMain.handle('galaxy:sshScan', async (e, id) => {
  if (IS_MAS) return { ok: false, error: MAS_BLOCKED };
  const r = await sshScanServer(id);
  if (r.ok) remoteCache.set(id, { ts: Date.now(), projects: r.projects, error: null, kind: r.kind });
  return r;
});

/* ---- Uzak okuma işlemleri (faz 3, POSIX) ----
   Yerel karşılıklarıyla AYNI şekli döndürürler; böylece derlenmiş arayüz
   uzak gezegeni yerelden ayırt etmez. Yollar tek tırnakla kaçırılır. */

const shq = p => "'" + String(p).replace(/'/g, "'\\''") + "'";

// rel yolu köke hapset ('..' ile dışarı çıkılamaz)
function safeRel(rel) {
  const parts = String(rel || '').split('/').filter(Boolean);
  const out = [];
  for (const seg of parts) {
    if (seg === '.') continue;
    if (seg === '..') { if (!out.length) return null; out.pop(); continue; }
    out.push(seg);
  }
  return out.join('/');
}

function remoteSrv(p) {
  const r = parseRemote(p);
  if (!r) return null;
  const srv = getServer(r.serverId);
  return srv ? { srv, path: r.path } : null;
}

async function remoteReadme(p) {
  const t = remoteSrv(p);
  if (!t) return null;
  const r = await sshExec(t.srv,
    `cd ${shq(t.path)} 2>/dev/null || exit 0
     F=$(ls -1 2>/dev/null | grep -i '^readme\\.md$' | head -1)
     [ -z "$F" ] && F=$(ls -1 2>/dev/null | grep -i '\\.md$' | head -1)
     [ -z "$F" ] && exit 0
     echo "GXNAME:$F"
     head -c 60000 -- "$F"`, 25000);
  if (!r.ok) return null;
  const i = r.out.indexOf('\n');
  if (i < 0 || !r.out.startsWith('GXNAME:')) return null;
  return { name: r.out.slice(7, i).trim(), content: r.out.slice(i + 1) };
}

async function remoteList(p, rel) {
  const t = remoteSrv(p);
  if (!t) return null;
  const sub = safeRel(rel);
  if (sub === null) return null;
  const dir = sub ? t.path + '/' + sub : t.path;
  // her satır: D|ad  ya da  F|ad|boyut
  const r = await sshExec(t.srv,
    `cd ${shq(dir)} 2>/dev/null || exit 0
     for E in * .[!.]*; do
       [ -e "$E" ] || continue
       case "$E" in .*|node_modules|__pycache__|*.app) continue;; esac
       if [ -d "$E" ]; then echo "D|$E"; else echo "F|$E|$(wc -c < "$E" 2>/dev/null | tr -d ' ')"; fi
     done`, 25000);
  if (!r.ok) return null;
  const out = [];
  for (const line of r.out.split('\n')) {
    const parts = line.split('|');
    if (parts[0] === 'D' && parts[1]) out.push({ name: parts[1], dir: true, size: 0 });
    else if (parts[0] === 'F' && parts[1]) out.push({ name: parts[1], dir: false, size: +parts[2] || 0 });
  }
  out.sort((a, b) => (b.dir - a.dir) || a.name.localeCompare(b.name, 'tr'));
  return out;
}

const REMOTE_MAX_TEXT = 2 * 1024 * 1024;  // 2 MB üstü uzaktan çekilmez

async function remoteFile(p, rel) {
  const t = remoteSrv(p);
  if (!t) return null;
  const sub = safeRel(rel);
  if (sub === null) return null;
  const full = sub ? t.path + '/' + sub : t.path;
  const meta = await sshExec(t.srv, `wc -c < ${shq(full)} 2>/dev/null | tr -d ' '`, 20000);
  if (!meta.ok) return null;
  const size = +meta.out.trim() || 0;
  const name = full.split('/').pop();
  const ext = (name.includes('.') ? name.split('.').pop() : '').toLowerCase();
  const base = { name, size, ext, path: p + (sub ? '/' + sub : '') };
  // İkili içerik (görsel, pdf, video) uzaktan akıtılmıyor — faz 3'ün sınırı
  if (IMAGE_EXT.has(ext) || ext === 'pdf' || MEDIA_EXT.has(ext)) {
    return { ...base, kind: 'unsupported', remote: true,
      text: `Bu dosya türü uzak sunucudan görüntülenemiyor (${ext.toUpperCase()}).\nUzak konum: ${full}` };
  }
  if (size > REMOTE_MAX_TEXT) {
    return { ...base, kind: 'text', remote: true,
      text: `Dosya çok büyük (${(size / 1048576).toFixed(1)} MB) — uzaktan yalnızca ${(REMOTE_MAX_TEXT / 1048576)} MB'a kadar okunuyor.` };
  }
  const r = await sshExec(t.srv, `head -c ${REMOTE_MAX_TEXT} -- ${shq(full)}`, 40000);
  if (!r.ok) return null;
  return { ...base, kind: 'text', text: r.out, remote: true };
}

async function remoteTree(p, depth) {
  const t = remoteSrv(p);
  if (!t) return null;
  const r = await sshExec(t.srv,
    `cd ${shq(t.path)} 2>/dev/null || exit 0
     find . -maxdepth ${Math.max(1, Math.min(+depth || 3, 5))} \
       -not -path '*/.*' -not -path '*/node_modules/*' -not -path '*/__pycache__/*' 2>/dev/null |
     head -4000 | sed 's|^\\./||' | grep -v '^\\.$'`, 40000);
  if (!r.ok) return null;
  // düz liste → ağaç
  const root = [];
  const dirs = new Map();
  const lines = r.out.split('\n').map(l => l.trim()).filter(Boolean).sort();
  // hangi yollar dizin: bir başkasının öneki olanlar
  const isDir = new Set();
  for (const l of lines) {
    const i = l.lastIndexOf('/');
    if (i > 0) isDir.add(l.slice(0, i));
  }
  for (const l of lines) {
    const parts = l.split('/');
    const name = parts[parts.length - 1];
    const parentKey = parts.slice(0, -1).join('/');
    const node = isDir.has(l) ? { name, dir: true, children: [] } : { name, dir: false };
    if (node.dir) dirs.set(l, node);
    const bucket = parentKey ? (dirs.get(parentKey) || {}).children : root;
    if (bucket) bucket.push(node);
  }
  return root;
}

async function remoteGitLog(p) {
  const t = remoteSrv(p);
  if (!t) return { ok: false, error: 'Sunucu bulunamadı' };
  const d = shq(t.path);
  const r = await sshExec(t.srv,
    `[ -d ${d}/.git ] || { echo "GXNOGIT"; exit 0; }
     echo "GX§LOG"; git -C ${d} log --pretty=format:"%h§%an§%ad§%s" --date=format:"%Y-%m-%d %H:%M" -40 2>/dev/null
     echo ""; echo "GX§BRANCH"; git -C ${d} branch --show-current 2>/dev/null
     echo "GX§STATUS"; git -C ${d} status --porcelain 2>/dev/null
     echo "GX§BRANCHES"; git -C ${d} branch --format="%(refname:short)" 2>/dev/null`, 40000);
  if (!r.ok) return { ok: false, error: r.error };
  if (r.out.includes('GXNOGIT')) return { ok: false, error: 'Git deposu yok' };
  const sec = name => {
    const i = r.out.indexOf('GX§' + name);
    if (i < 0) return '';
    const start = r.out.indexOf('\n', i) + 1;
    const next = r.out.indexOf('\nGX§', start);
    return r.out.slice(start, next < 0 ? undefined : next).trim();
  };
  const commits = sec('LOG') ? sec('LOG').split('\n').filter(Boolean).map(l => {
    const [h, an, ad, ...s] = l.split('§');
    return { h, an, ad, s: s.join('§') };
  }) : [];
  const dirtyFiles = sec('STATUS') ? sec('STATUS').split('\n').filter(Boolean) : [];
  return {
    ok: true,
    branch: sec('BRANCH') || '?',
    branches: sec('BRANCHES') ? sec('BRANCHES').split('\n').filter(Boolean) : [],
    commits,
    dirty: dirtyFiles.length,
    dirtyFiles,
    activity30: commits.filter(c => Date.now() - Date.parse(c.ad) < 30 * 86400000).length,
    remote: true
  };
}

/* ==================== DOCKER ====================
 * Docker Desktop'ın yaptığı işlerin çekirdeği: imaj ve konteyner listesi,
 * başlat/durdur/yeniden başlat/sil, loglar ve alan temizliği.
 * Tüm çağrılar `docker` CLI'ına execFile ile (kabuk YOK) gider; eylemler
 * beyaz listeyle sınırlıdır, kullanıcı metni asla komut olarak çalıştırılmaz.
 */

const DOCKER_TIMEOUT = 20000;

function docker(args, timeout) {
  return new Promise(resolve => {
    execFile('docker', args, { env: ENV, timeout: timeout || DOCKER_TIMEOUT, maxBuffer: 8 * 1024 * 1024 },
      (err, stdout, stderr) => {
        if (err) {
          const msg = String(stderr || err.message || '').trim();
          resolve({ ok: false, error: msg || 'docker komutu başarısız', code: err.code });
        } else resolve({ ok: true, out: String(stdout || '') });
      });
  });
}

// `--format '{{json .}}'` çıktısı: her satır bir JSON nesnesi
function parseJsonLines(out) {
  const rows = [];
  for (const line of String(out || '').split('\n')) {
    const t = line.trim();
    if (!t) continue;
    try { rows.push(JSON.parse(t)); } catch (e) { /* bozuk satırı atla */ }
  }
  return rows;
}

// Docker kurulu mu, daemon ayakta mı?
ipcMain.handle('galaxy:dockerStatus', async () => {
  if (IS_MAS) return { ok: false, mas: true, error: MAS_BLOCKED };
  // DİKKAT: `docker version` daemon'a da bağlanmaya çalışır ve motor kapalıyken
  // hata verir. Kurulu mu sorusunu yalnızca istemciye bakan `--version` yanıtlar.
  const v = await docker(['--version'], 8000);
  if (!v.ok) {
    return {
      ok: false, installed: false, running: false,
      error: 'Docker kurulu değil. docker.com/products/docker-desktop adresinden Docker Desktop kurabilirsin.'
    };
  }
  const clientVer = (v.out.match(/version\s+([\d.]+)/i) || [, v.out.trim()])[1];
  const info = await docker(['info', '--format', '{{.ServerVersion}}|{{.Containers}}|{{.ContainersRunning}}|{{.Images}}'], 8000);
  if (!info.ok) {
    return {
      ok: false, installed: true, running: false,
      client: clientVer,
      error: 'Docker motoru çalışmıyor — Docker Desktop kapalı olabilir.'
    };
  }
  const [server, containers, running, images] = info.out.trim().split('|');
  return {
    ok: true, installed: true, running: true,
    client: clientVer, server,
    containers: +containers || 0, containersRunning: +running || 0, images: +images || 0
  };
});

// Docker Desktop'ı başlat (yalnızca uygulamayı açar, komut çalıştırmaz)
ipcMain.handle('galaxy:dockerStart', () => {
  if (IS_MAS) return { ok: false, error: MAS_BLOCKED };
  return new Promise(resolve => {
    execFile('open', ['-a', 'Docker'], { env: ENV, timeout: 10000 }, err => {
      resolve(err ? { ok: false, error: 'Docker Desktop açılamadı — kurulu olmayabilir.' } : { ok: true });
    });
  });
});

ipcMain.handle('galaxy:dockerPs', async (e, all) => {
  if (IS_MAS) return { ok: false, error: MAS_BLOCKED };
  const args = ['ps', '--format', '{{json .}}', '--no-trunc'];
  if (all) args.splice(1, 0, '-a');
  const r = await docker(args);
  if (!r.ok) return r;
  const containers = parseJsonLines(r.out).map(c => ({
    id: c.ID, name: c.Names, image: c.Image, state: c.State, status: c.Status,
    ports: c.Ports || '', created: c.CreatedAt || '', size: c.Size || '',
    compose: (c.Labels || '').split(',').find(l => l.startsWith('com.docker.compose.project=')) ?
      (c.Labels || '').split(',').find(l => l.startsWith('com.docker.compose.project=')).split('=')[1] : ''
  }));
  return { ok: true, containers };
});

ipcMain.handle('galaxy:dockerImages', async () => {
  if (IS_MAS) return { ok: false, error: MAS_BLOCKED };
  const r = await docker(['images', '--format', '{{json .}}']);
  if (!r.ok) return r;
  const images = parseJsonLines(r.out).map(i => ({
    id: i.ID, repo: i.Repository, tag: i.Tag, size: i.Size,
    created: i.CreatedSince || i.CreatedAt || '', dangling: i.Repository === '<none>'
  }));
  return { ok: true, images };
});

// Konteyner eylemleri — beyaz liste; başka hiçbir docker alt komutu çalıştırılamaz
const CONTAINER_ACTIONS = {
  start: id => ['start', id],
  stop: id => ['stop', id],
  restart: id => ['restart', id],
  pause: id => ['pause', id],
  unpause: id => ['unpause', id],
  kill: id => ['kill', id],
  rm: id => ['rm', '-f', id]
};

ipcMain.handle('galaxy:dockerAction', async (e, { action, id } = {}) => {
  if (IS_MAS) return { ok: false, error: MAS_BLOCKED };
  const build = CONTAINER_ACTIONS[action];
  if (!build) return { ok: false, error: 'Bilinmeyen eylem' };
  if (!id || !/^[a-zA-Z0-9][a-zA-Z0-9_.\-]*$/.test(id)) return { ok: false, error: 'Geçersiz konteyner kimliği' };
  // stop/restart daemon'a bağlı olarak yavaş olabilir
  const r = await docker(build(id), /^(stop|restart|kill)$/.test(action) ? 45000 : DOCKER_TIMEOUT);
  return r.ok ? { ok: true } : r;
});

ipcMain.handle('galaxy:dockerImageAction', async (e, { action, id } = {}) => {
  if (IS_MAS) return { ok: false, error: MAS_BLOCKED };
  if (action !== 'rm') return { ok: false, error: 'Bilinmeyen eylem' };
  if (!id || !/^[a-zA-Z0-9][a-zA-Z0-9_.:@\/\-]*$/.test(id)) return { ok: false, error: 'Geçersiz imaj kimliği' };
  const r = await docker(['rmi', id], 45000);
  return r.ok ? { ok: true } : r;
});

ipcMain.handle('galaxy:dockerLogs', async (e, { id, tail } = {}) => {
  if (IS_MAS) return { ok: false, error: MAS_BLOCKED };
  if (!id || !/^[a-zA-Z0-9][a-zA-Z0-9_.\-]*$/.test(id)) return { ok: false, error: 'Geçersiz konteyner kimliği' };
  const n = Math.min(Math.max(parseInt(tail, 10) || 200, 1), 2000);
  const r = await docker(['logs', '--tail', String(n), '--timestamps', id], 25000);
  // docker logs stderr'i de kullanır; hata olsa bile eldeki çıktıyı göster
  if (!r.ok) return { ok: false, error: r.error };
  return { ok: true, logs: r.out };
});

// Alan temizliği — yalnızca güvenli prune biçimleri
const PRUNE = {
  containers: ['container', 'prune', '-f'],
  images: ['image', 'prune', '-f'],
  volumes: ['volume', 'prune', '-f'],
  builder: ['builder', 'prune', '-f']
};
ipcMain.handle('galaxy:dockerPrune', async (e, kind) => {
  if (IS_MAS) return { ok: false, error: MAS_BLOCKED };
  const args = PRUNE[kind];
  if (!args) return { ok: false, error: 'Bilinmeyen temizlik türü' };
  const r = await docker(args, 90000);
  return r.ok ? { ok: true, out: r.out.trim() } : r;
});

// Terminal'de Claude aç (alternatif)
ipcMain.handle('galaxy:openClaude', (e, p) => {
  if (IS_MAS) return false; // sandbox: Terminal'e AppleEvent gönderilemez
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
  // Arayüzü öncelikle veri dizininden yükle — UI güncellemeleri için
  // uygulamayı yeniden paketlemek gerekmesin (index.html oraya kopyalanabilir)
  const external = path.join(DATA_DIR, 'index.html');
  win.loadFile(fs.existsSync(external) ? external : path.join(APP_DIR, 'index.html'));
}

// ---------- ilk açılış: uygulama kullanıcısını bir defalığına tanır ----------
let onboardWin = null;

function needsOnboarding() {
  const d = loadData();
  return !(d.profile && d.profile.onboarded);
}

function createOnboardingWindow() {
  if (onboardWin && !onboardWin.isDestroyed()) { onboardWin.focus(); return; }
  onboardWin = new BrowserWindow({
    width: 860, height: 800, resizable: false, fullscreenable: false,
    backgroundColor: '#04060c',
    titleBarStyle: 'hiddenInset',
    webPreferences: { preload: path.join(APP_DIR, 'preload.js'), contextIsolation: true }
  });
  onboardWin.loadFile(path.join(APP_DIR, 'onboarding.html'));
  onboardWin.on('closed', () => { onboardWin = null; });
}

ipcMain.handle('galaxy:onboardStatus', () => {
  const d = loadData();
  const lang = (d.profile && d.profile.lang) || 'tr';
  return {
    needed: !(d.profile && d.profile.onboarded),
    profile: { name: (d.profile && d.profile.name) || '', lang },
    universes: (d.universes || []).map(u => ({ id: u.id, name: u.name, root: resolveRoot(u.root) })),
    agents: (d.agents || []).map(a => ({ id: a.id, name: a.name, role: a.role, color: a.color || '#61dcff' })),
    isMas: IS_MAS
  };
});

ipcMain.handle('galaxy:onboardComplete', (e, payload) => {
  const p = payload || {};
  const data = loadData();
  data.profile = {
    name: String(p.name || '').trim().slice(0, 60),
    lang: p.lang === 'en' ? 'en' : 'tr',
    onboarded: true,
    ts: new Date().toISOString()
  };
  // Ajanlar dil seçimine göre (henüz özelleştirilmemişse) yeniden üretilir
  if (!fs.existsSync(DATA_FILE)) data.agents = defaultAgents(data.profile.lang);
  // Evrenler: onboarding'de seçilen klasörler eklenir/güncellenir
  if (Array.isArray(p.universes)) {
    for (const u of p.universes) {
      if (!u || !u.root) continue;
      const root = String(u.root);
      const prefix = path.basename(root).normalize('NFC');
      const existing = data.universes.find(x => resolveRoot(x.root) === root);
      if (existing) {
        if (u.name) existing.name = String(u.name).slice(0, 60);
        if (u.bookmark) existing.bookmark = u.bookmark;
        continue;
      }
      let id = slugify(u.name || prefix);
      while (data.universes.find(x => x.id === id)) id += '2';
      data.universes.push({ id, name: (u.name || prefix).slice(0, 60), subtitle: prefix, root, prefix, bookmark: u.bookmark || undefined, expandDirs: [] });
    }
  }
  // Ajan adları/rolleri kişiselleştirmesi
  if (Array.isArray(p.agents)) {
    for (const a of p.agents) {
      const ex = (data.agents || []).find(x => x.id === a.id);
      if (ex) {
        if (a.name) ex.name = String(a.name).slice(0, 30);
        if (a.role) ex.role = String(a.role).slice(0, 40);
      }
    }
  }
  if (!data.universes.length) return { ok: false, error: data.profile.lang === 'en' ? 'Pick at least one folder' : 'En az bir klasör seç' };
  saveData(data);
  restoreBookmarks();
  createWindow();
  if (onboardWin && !onboardWin.isDestroyed()) onboardWin.close();
  onboardWin = null;
  return { ok: true };
});

ipcMain.handle('galaxy:profileGet', () => {
  const d = loadData();
  return d.profile || { name: '', lang: 'tr', onboarded: false };
});

// ---------- ayarlar penceresi ----------
let settingsWin = null;

function openSettingsWindow() {
  if (settingsWin && !settingsWin.isDestroyed()) { settingsWin.focus(); return; }
  settingsWin = new BrowserWindow({
    width: 640, height: 620, resizable: false, fullscreenable: false,
    backgroundColor: '#04060c',
    titleBarStyle: 'hiddenInset',
    webPreferences: { preload: path.join(APP_DIR, 'preload.js'), contextIsolation: true }
  });
  settingsWin.loadFile(path.join(APP_DIR, 'onboarding.html'), { query: { mode: 'settings' } });
  settingsWin.on('closed', () => { settingsWin = null; });
}

ipcMain.handle('galaxy:openSettings', () => { openSettingsWindow(); return true; });

ipcMain.handle('galaxy:settingsGet', () => {
  const d = loadData();
  return {
    profile: d.profile || { name: '', lang: 'tr', onboarded: false },
    settings: getSettings(d),
    dataDir: DATA_DIR,
    version: app.getVersion(),
    isMas: IS_MAS
  };
});

ipcMain.handle('galaxy:settingsSave', (e, p) => {
  p = p || {};
  const d = loadData();
  d.profile = d.profile || { onboarded: true };
  if (p.name !== undefined) d.profile.name = String(p.name).trim().slice(0, 60);
  if (p.lang !== undefined) d.profile.lang = p.lang === 'en' ? 'en' : 'tr';
  d.settings = {
    staleDays: Math.min(365, Math.max(1, +p.staleDays || DEFAULT_SETTINGS.staleDays)),
    planPending: Math.min(50, Math.max(1, +p.planPending || DEFAULT_SETTINGS.planPending))
  };
  saveData(d);
  return { ok: true, settings: getSettings(d) };
});

// ---------- yedekten geri yükleme ----------
ipcMain.handle('galaxy:backupList', () => {
  try {
    const bdir = path.join(DATA_DIR, 'backups');
    return fs.readdirSync(bdir)
      .filter(f => /^galaxy-data-\d{4}-\d{2}-\d{2}\.json$/.test(f))
      .sort().reverse()
      .map(f => {
        let size = 0;
        try { size = fs.statSync(path.join(bdir, f)).size; } catch (err) {}
        return { name: f, date: f.slice(12, 22), size };
      });
  } catch (e) { return []; }
});

ipcMain.handle('galaxy:backupRestore', async (e, name) => {
  if (!/^galaxy-data-\d{4}-\d{2}-\d{2}\.json$/.test(String(name))) return { ok: false, error: 'Geçersiz yedek adı' };
  const file = path.join(DATA_DIR, 'backups', name);
  if (!fs.existsSync(file)) return { ok: false, error: 'Yedek bulunamadı' };
  const win = BrowserWindow.fromWebContents(e.sender);
  const { response } = await dialog.showMessageBox(win, {
    type: 'warning',
    title: 'Yedeğe Dön',
    message: `${name.slice(12, 22)} tarihli yedeğe dönülsün mü?`,
    detail: 'Mevcut veri önce güvenlik kopyası olarak saklanır, ardından uygulama yeniden başlar.',
    buttons: ['Vazgeç', 'Evet, Geri Yükle'],
    defaultId: 0, cancelId: 0
  });
  if (response !== 1) return { ok: true, action: 'cancel' };
  try {
    try { fs.copyFileSync(DATA_FILE, path.join(DATA_DIR, 'backups', 'pre-restore-' + Date.now() + '.json')); } catch (err) {}
    fs.copyFileSync(file, DATA_FILE);
    try { fs.writeFileSync(path.join(DATA_DIR, 'galaxy-data.js'), 'window.GALAXY_DATA = ' + fs.readFileSync(DATA_FILE, 'utf8') + ';', 'utf8'); } catch (err) {}
    app.relaunch();
    app.exit(0);
    return { ok: true };
  } catch (err) { return { ok: false, error: err.message }; }
});

// ---------- otomatik güncelleme (Developer ID / DMG sürümü) ----------
// electron-updater kuruluysa açılışta sessizce denetler; tray menüsünden elle de denetlenir.
// MAS sürümü App Store'dan, geliştirme modu ise elle güncellenir — ikisinde de kapalı.
let autoUpdaterRef = null;

function setupAutoUpdate() {
  if (IS_MAS || !app.isPackaged) return;
  try {
    const { autoUpdater } = require('electron-updater');
    autoUpdater.autoDownload = true;
    autoUpdater.on('error', () => {}); // ağ yoksa sessiz
    autoUpdater.checkForUpdatesAndNotify().catch(() => {});
    autoUpdaterRef = autoUpdater;
  } catch (e) { /* electron-updater yüklü değil (npm install gerekli) — uygulama etkilenmez */ }
}

async function manualUpdateCheck() {
  if (!autoUpdaterRef) {
    dialog.showMessageBox({
      type: 'info', title: 'Güncelleme',
      message: 'Otomatik güncelleme bu sürümde etkin değil.',
      detail: IS_MAS ? 'App Store sürümü güncellemelerini App Store üzerinden alır.'
        : 'Geliştirme modunda ya da electron-updater kurulu değil (npm install).'
    });
    return;
  }
  try {
    const r = await autoUpdaterRef.checkForUpdates();
    const remote = r && r.updateInfo && r.updateInfo.version;
    dialog.showMessageBox({
      type: 'info', title: 'Güncelleme',
      message: remote && remote !== app.getVersion()
        ? `Yeni sürüm bulundu: v${remote}`
        : `Güncelsin (v${app.getVersion()})`,
      detail: remote && remote !== app.getVersion()
        ? 'Arka planda indiriliyor; hazır olunca uygulama kapanıp açıldığında kurulur.'
        : 'Yeni bir sürüm çıktığında açılışta otomatik denetlenir.'
    });
  } catch (err) {
    dialog.showMessageBox({ type: 'warning', title: 'Güncelleme', message: 'Güncelleme denetlenemedi', detail: String((err && err.message) || err) });
  }
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
      { label: 'Ayarlar…', click: openSettingsWindow },
      { label: 'Güncellemeleri Denetle', click: manualUpdateCheck },
      { type: 'separator' },
      { label: 'Çıkış', click: () => app.quit() }
    ]));
  } catch (err) { /* tray başarısız olsa da uygulama çalışsın */ }
}

app.whenReady().then(() => {
  migrateLegacyData();
  restoreBookmarks();
  if (needsOnboarding()) createOnboardingWindow(); else createWindow();
  createTray();
  try { globalShortcut.register('CommandOrControl+Shift+G', showQuickCapture); } catch (e) {}
  autoDetectLocalDbs(); // yerel PostgreSQL/MySQL sunucularını arka planda bul ve ekle
  setupAutoUpdate();
});
app.on('will-quit', () => globalShortcut.unregisterAll());
app.on('window-all-closed', () => { /* tray'de yaşamaya devam et */ });
app.on('activate', () => {
  const wins = BrowserWindow.getAllWindows().filter(w => w !== quickWin);
  if (!wins.length) { if (needsOnboarding()) createOnboardingWindow(); else createWindow(); }
});
