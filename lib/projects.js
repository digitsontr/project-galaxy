// Sprint J — davranış taşındı; kopyalanmadı.
// Faz 5: eval-blob açıldı — gövde birebir aynı kod; artık satır satır okunur, diff'lenir,
// hata izinde gerçek satır numarası verir. with(g) bilinçli: çıplak isimler paylaşılan g'ye
// çözülür, g.X = ... atamaları bu modülün çıktısıdır. (Bu yüzden dosya başında 'use strict' yok.)
module.exports = function register(g) {
  with (g) {
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

// Bir klasörün kendisi bir git deposu mu? (gezegen tanımının birincil ölçütü)
function isGitRepo(dir) {
  try { return fs.existsSync(path.join(dir, '.git')); } catch (e) { return false; }
}

// Çatı (yıldız sistemi) mı? Kural: KENDİ .git'i varsa asla çatı değildir — GEZEGEN kalır
// (monorepo kökü dahil tek gezegen). Kendi .git'i yok ama bir alt klasörü git deposu
// ya da belirgin bir proje ise → çatı (yıldız sistemi), içindeki projeler ayrı gezegen olur.
function looksLikeContainer(dir) {
  if (isGitRepo(dir)) return false;          // kendi .git'i olan klasör HER ZAMAN gezegen
  const subs = listDirs(dir);
  if (!subs.length) return false;
  for (const s of subs.slice(0, 40)) {
    if (isGitRepo(path.join(dir, s))) return true;  // alt klasörde git deposu varsa çatı (yıldız sistemi)
  }
  // .git'i olmayan ama xcodeproj/workspace taşıyan alt proje de çatı sayılır (git init edilmemiş)
  for (const s of subs.slice(0, 40)) {
    const child = path.join(dir, s);
    try { if (fs.readdirSync(child).some(n => n.endsWith('.xcodeproj') || n.endsWith('.xcworkspace'))) return true; } catch (e) {}
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
    const prevExpand = u.expandDirs || [];
    // Otomatik hiyerarşi: çatı klasörler (yıldız sistemi) her taramada GÜNCEL kurala göre
    // yeniden hesaplanır — böylece eski yanlış sınıflandırma (üst klasörün gezegen görünmesi)
    // kendiliğinden düzelir. Yalnızca .git tabanlı; elle override yok.
    const nextExpand = listDirs(root).filter(name => looksLikeContainer(path.join(root, name)));
    u.expandDirs = nextExpand;
    if (nextExpand.length !== prevExpand.length || nextExpand.some(n => !prevExpand.includes(n))) hierarchyChanged = true;
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
      const git = gitInfo(full);
      // Yalnız GERÇEK projeler (içinde .git olan) gezegen olur — rastgele/çatı klasörler haritayı kirletmesin.
      // İstisna: kullanıcı bu klasöre daha önce elle veri kaydettiyse (isim/durum/plan) yine göster.
      const savedMeta = data.projects[id];
      if (!git && !(savedMeta && (savedMeta.name || savedMeta.status || (savedMeta.plan && savedMeta.plan.length)))) continue;
      knownPaths.add(full);
      let mtime = null;
      try { mtime = fs.statSync(full).mtime.toISOString(); } catch (e) {}
      const saved = savedMeta || {};
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
        root: rt.path || '', rootName: rt.name || '',
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
    universes: data.universes.map(u => ({ id: u.id, name: u.name, subtitle: u.subtitle || '', root: u.root || '', remote: false }))
      .concat(remoteUniverses),
    projects,
    agents: (data.agents || []).map(a => ({ id: a.id, name: a.name, role: a.role, color: a.color || '#61dcff', prompt: a.prompt || '', write: !!a.write, presets: a.presets || [] })),
    alerts: buildAlerts(projects, st),
    settings: st,
    ignored: (data.ignored || []).map(id => ({ id, name: (data.projects[id] && data.projects[id].name) || id.split('/').pop() }))
  };
}

g.listDirs = listDirs;
g.looksLikeProject = looksLikeProject;
g.isGitRepo = isGitRepo;
g.looksLikeContainer = looksLikeContainer;
g.gitInfo = gitInfo;
g.resolveRoot = resolveRoot;
g.universeCwd = universeCwd;
g.profileContext = profileContext;
g.scanProjects = scanProjects;
g.knownPaths = knownPaths;
g.PROJECT_MARKERS = PROJECT_MARKERS;
g.CODE_EXT_RE = CODE_EXT_RE;
  }
};
