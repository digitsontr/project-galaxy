// Yapılandırma: veri klasörü (DATA_DIR/DATA_FILE), PATH genişletme (ENV), eski konumdan
// veri taşıma, App Store sandbox klasör izinleri (bookmark). İlk yüklenen modül.
// with(g) bilinçli: çıplak isimler main.js'in paylaşılan g nesnesine çözülür; g.X = ... atamaları
// bu modülün sonraki modüllere verdiği çıktıdır (sıra main.js'te). Bu yüzden 'use strict' yok ve
// `require('./lib/…')` gibi göreli yollar main.js'e (proje köküne) göre çözülür.
module.exports = function register(g) {
  with (g) {
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
// Platform-bağımsız PATH: alt süreçlerin (git, claude, docker) bulunması için yaygın konumlar eklenir.
const HOME = process.env.HOME || process.env.USERPROFILE || '';
const EXTRA_PATHS = process.platform === 'win32'
  ? [
      'C:\\Program Files\\Git\\bin', 'C:\\Program Files\\Git\\cmd',
      'C:\\Program Files\\nodejs',
      path.join(process.env.APPDATA || '', 'npm'),
      path.join(process.env.LOCALAPPDATA || '', 'Microsoft', 'WindowsApps'),
      path.join(HOME, '.local', 'bin')
    ]
  : ['/opt/homebrew/bin', '/usr/local/bin', path.join(HOME, '.local', 'bin')];
const ENV = { ...process.env, PATH: [process.env.PATH || process.env.Path || '', ...EXTRA_PATHS].filter(Boolean).join(path.delimiter) };

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

g.migrateLegacyData = migrateLegacyData;
g.startBookmarkAccess = startBookmarkAccess;
g.restoreBookmarks = restoreBookmarks;
g.DEFAULT_DATA_DIR = DEFAULT_DATA_DIR;
g.DATA_DIR = DATA_DIR;
g.DATA_FILE = DATA_FILE;
g.LEGACY_DATA_DIRS = LEGACY_DATA_DIRS;
g.HOME = HOME;
g.EXTRA_PATHS = EXTRA_PATHS;
g.ENV = ENV;
g.MAS_BLOCKED = MAS_BLOCKED;
g.bookmarkStops = bookmarkStops;
  }
};
