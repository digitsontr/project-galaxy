const { app, BrowserWindow, ipcMain, shell, Tray, Menu, nativeImage, globalShortcut, dialog, safeStorage, screen } = require('electron');

// Tek örnek kilidi — uygulama tray'de arka planda kalmaya devam ettiği için (window-all-closed'da
// çıkmıyor), kullanıcı simgeye/kısayola tekrar tıklarsa ikinci bir süreç açılıp aynı
// galaxy-data.json'a eşzamanlı yazabilir (veri kaybı riski). İkinci süreç hemen kapanır,
// birincisi mevcut pencereyi öne getirir (macOS ve Windows'ta aynı şekilde çalışır).
if (!app.requestSingleInstanceLock()) {
  app.exit(0);
}

const fs = require('fs');
const path = require('path');
const { spawn, execFile } = require('child_process');
const os = require('os');

const g = {
  app, BrowserWindow, ipcMain, shell, Tray, Menu, nativeImage, globalShortcut, dialog, safeStorage,
  fs, path, os, spawn, execFile,
  APP_DIR: __dirname,
  IS_MAS: !!process.mas,
  require, process, console, Buffer, setTimeout, clearTimeout, setInterval, clearInterval,
  Map, Set, Promise, JSON, Date, parseInt, parseFloat, isNaN, isFinite, Math, Error, Object, Array,
  String, Number, Boolean, encodeURIComponent, decodeURIComponent, URL, Intl, encodeURI, decodeURI
};

require('./lib/config')(g);
require('./lib/data')(g);
require('./lib/projects')(g);
require('./ipc/core')(g);
require('./ipc/db-git')(g);
require('./ipc/ai-runtime')(g);
require('./ipc/infra')(g);
require('./ipc/planet-work')(g);
require('./ipc/devtools')(g);
require('./ipc/agent-engine')(g);
require('./lib/trainings')(g);

const {
  APP_DIR, DATA_DIR, IS_MAS, migrateLegacyData, restoreBookmarks,
  needsOnboarding, createOnboardingWindow, autoDetectLocalDbs, openSettingsWindow
} = g;

const WIN_FILE = path.join(DATA_DIR, 'window.json');
function loadWinState() {
  try { return JSON.parse(fs.readFileSync(WIN_FILE, 'utf8')) || {}; } catch (e) { return {}; }
}
function saveWinState(win) {
  if (!win || win.isDestroyed()) return;
  try {
    const b = (typeof win.getNormalBounds === 'function') ? win.getNormalBounds() : win.getBounds();
    fs.mkdirSync(DATA_DIR, { recursive: true });
    fs.writeFileSync(WIN_FILE, JSON.stringify({
      x: b.x, y: b.y, width: b.width, height: b.height,
      fullscreen: !!win.isFullScreen(),
      maximized: !win.isFullScreen() && !!win.isMaximized()
    }), 'utf8');
  } catch (e) {}
}
function boundsOnScreen(b) {
  if (!b || typeof b.x !== 'number') return false;
  try {
    return screen.getAllDisplays().some(d => {
      const a = d.workArea;
      return b.x < a.x + a.width && b.x + 80 > a.x && b.y < a.y + a.height && b.y + 40 > a.y;
    });
  } catch (e) { return false; }
}
function ensureUsableBounds(win) {
  if (!win || win.isDestroyed() || win.isFullScreen()) return;
  try {
    const b = win.getBounds();
    const wa = screen.getPrimaryDisplay().workAreaSize;
    if (b.width < 900 || b.height < 560) {
      win.setBounds({
        x: Math.max(0, Math.round((wa.width - Math.min(1440, wa.width)) / 2)),
        y: Math.max(0, Math.round((wa.height - Math.min(900, wa.height)) / 2)),
        width: Math.min(1440, wa.width),
        height: Math.min(900, wa.height)
      });
    }
  } catch (e) {}
}
function bindMainWindow(win) {
  const emitFs = () => { try { if (!win.isDestroyed()) win.webContents.send('galaxy:fullscreen', !!win.isFullScreen()); } catch (e) {} };
  win.on('enter-full-screen', () => { emitFs(); saveWinState(win); });
  win.on('leave-full-screen', () => {
    emitFs();
    setTimeout(() => { ensureUsableBounds(win); saveWinState(win); }, 40);
  });
  win.on('moved', () => saveWinState(win));
  win.on('resized', () => saveWinState(win));
  win.on('maximize', () => saveWinState(win));
  win.on('unmaximize', () => saveWinState(win));
  win.on('close', () => saveWinState(win));
  win.webContents.on('did-finish-load', emitFs);
  // Esc iç pop-up'ları kapatır; native tam ekrandan düşürmez (⌃⌘F / yeşil düğme durur).
  win.webContents.on('before-input-event', (event, input) => {
    if (input.type === 'keyDown' && input.key === 'Escape' && win.isFullScreen()) {
      event.preventDefault();
      try { win.webContents.send('galaxy:esc'); } catch (e) {}
    }
  });
}
function createWindow() {
  const wa = (() => { try { return screen.getPrimaryDisplay().workAreaSize; } catch (e) { return { width: 1440, height: 900 }; } })();
  const st = loadWinState();
  const wantFs = st.fullscreen !== false;
  const opts = {
    width: Math.max(1024, st.width || Math.min(1440, wa.width)),
    height: Math.max(640, st.height || Math.min(900, wa.height)),
    minWidth: 960,
    minHeight: 600,
    backgroundColor: '#04060c',
    show: false,
    fullscreenable: true,
    fullscreen: wantFs,
    titleBarStyle: 'hiddenInset',
    trafficLightPosition: { x: 16, y: 16 },
    webPreferences: {
      preload: path.join(APP_DIR, 'preload.js'),
      contextIsolation: true
    }
  };
  if (boundsOnScreen(st)) { opts.x = st.x; opts.y = st.y; }
  const win = new BrowserWindow(opts);
  bindMainWindow(win);
  // Arayüzü öncelikle veri dizininden yükle — UI güncellemeleri için
  // uygulamayı yeniden paketlemek gerekmesin (index.html oraya kopyalanabilir)
  // Yeni tasarım arayüzü (newui/) — Three.js galaksi + dc-runtime, gerçek verine bağlı.
  // DATA_DIR override'ı korunur (yeniden paketlemeden güncelleme): önce newui, sonra düz index.
  const extNew = path.join(DATA_DIR, 'newui', 'index.html');
  const extOld = path.join(DATA_DIR, 'index.html');
  win.loadFile(
    fs.existsSync(extNew) ? extNew :
    fs.existsSync(extOld) ? extOld :
    path.join(APP_DIR, 'newui', 'index.html')
  );
  win.once('ready-to-show', () => {
    win.show();
    if (wantFs && !win.isFullScreen()) win.setFullScreen(true);
    else if (!wantFs && st.maximized) win.maximize();
  });
}
ipcMain.handle('galaxy:toggleFullscreen', e => {
  const w = BrowserWindow.fromWebContents(e.sender);
  if (!w || w.isDestroyed()) return { ok: false };
  w.setFullScreen(!w.isFullScreen());
  return { ok: true, fullscreen: w.isFullScreen() };
});
g.createWindow = createWindow;

// ---------- otomatik güncelleme (Developer ID / DMG sürümü) ----------
// Hafif güncelleme denetleyici — GitHub Releases API üzerinden. Ad-hoc imzalı zip dağıtımı için
// (Squirrel.Mac/electron-updater geçerli imza ister; ad-hoc'ta çalışmaz). Yeni sürüm varsa arayüze
// bildirir, kullanıcı tek tıkla indirir. MAS App Store'dan güncellenir; geliştirme modunda kapalı.
let UPDATE_REPO = '';
try { UPDATE_REPO = require(path.join(APP_DIR, 'package.json')).updateRepo || ''; } catch (e) {}

function verGt(a, b) {
  const pa = String(a).split('.').map(n => parseInt(n, 10) || 0);
  const pb = String(b).split('.').map(n => parseInt(n, 10) || 0);
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) { const x = pa[i] || 0, y = pb[i] || 0; if (x !== y) return x > y; }
  return false;
}
function httpGetJson(url, depth) {
  return new Promise((resolve, reject) => {
    if ((depth || 0) > 4) return reject(new Error('too many redirects'));
    const https = require('https');
    const req = https.get(url, { headers: { 'User-Agent': 'ProjectGalaxy', 'Accept': 'application/vnd.github+json' } }, r => {
      if (r.statusCode >= 300 && r.statusCode < 400 && r.headers.location) { r.resume(); return httpGetJson(r.headers.location, (depth || 0) + 1).then(resolve, reject); }
      if (r.statusCode !== 200) { r.resume(); return reject(new Error('http ' + r.statusCode)); }
      let d = ''; r.on('data', c => d += c); r.on('end', () => { try { resolve(JSON.parse(d)); } catch (e) { reject(e); } });
    });
    req.on('error', reject);
    req.setTimeout(9000, () => { req.destroy(); reject(new Error('timeout')); });
  });
}
async function checkForUpdate(manual) {
  const send = (ch, p) => { for (const w of BrowserWindow.getAllWindows()) { try { if (!w.isDestroyed()) w.webContents.send(ch, p); } catch (e) {} } };
  try {
    if (!UPDATE_REPO) { if (manual) send('update:none', { version: app.getVersion(), noRepo: true }); return; }
    const rel = await httpGetJson('https://api.github.com/repos/' + UPDATE_REPO + '/releases/latest');
    const tag = String(rel.tag_name || '').replace(/^v/i, '');
    const cur = app.getVersion();
    if (tag && verGt(tag, cur)) {
      const zip = (rel.assets || []).find(a => /\.zip$/i.test(a.name || ''));
      send('update:available', { version: tag, url: (zip && zip.browser_download_url) || rel.html_url, notes: (rel.name || rel.tag_name || '') });
    } else if (manual) { send('update:none', { version: cur }); }
  } catch (e) { if (manual) send('update:error', { error: e.message }); }
}
function setupAutoUpdate() {
  if (IS_MAS || !app.isPackaged) return;
  setTimeout(() => checkForUpdate(false), 6000); // açılıştan biraz sonra sessizce denetle
}
ipcMain.handle('galaxy:checkUpdate', () => { checkForUpdate(true); return { ok: true }; });
ipcMain.handle('galaxy:openUpdate', (e, url) => { try { require('electron').shell.openExternal(url || ('https://github.com/' + UPDATE_REPO + '/releases')); } catch (err) {} return { ok: true }; });
ipcMain.handle('galaxy:homeDir', () => { try { return os.homedir(); } catch (err) { return ''; } });

async function manualUpdateCheck() {
  if (IS_MAS) { dialog.showMessageBox({ type: 'info', title: 'Güncelleme', message: 'App Store sürümü', detail: 'Güncellemeler App Store üzerinden gelir.' }); return; }
  // Pencere açıksa arayüzde banner/toast göster; yoksa aç ve denetle.
  const wins = BrowserWindow.getAllWindows().filter(w => w !== quickWin);
  if (!wins.length) createWindow();
  checkForUpdate(true);
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
      { label: 'Galaxy\'yi Aç', click: () => {
        const wins = BrowserWindow.getAllWindows().filter(w => w !== quickWin);
        if (wins.length) {
          const w = wins[0];
          if (w.isMinimized()) w.restore();
          w.show(); w.focus();
          if (loadWinState().fullscreen !== false && !w.isFullScreen()) w.setFullScreen(true);
        } else createWindow();
      } },
      { type: 'separator' },
      { label: 'Ayarlar…', click: openSettingsWindow },
      { label: 'Güncellemeleri Denetle', click: manualUpdateCheck },
      { label: 'Kaynaklardan yenile…', click: () => {
        try {
          const { spawn } = require('child_process');
          const script = path.join(APP_DIR, 'scripts', 'refresh-app.sh');
          const alt = path.join(path.dirname(APP_DIR), 'ProjectGalaxy', 'scripts', 'refresh-app.sh');
          const src = fs.existsSync(script) ? script : (fs.existsSync(alt) ? alt : null);
          if (!src) {
            const { dialog } = require('electron');
            dialog.showMessageBox({ type: 'info', title: 'Yenile', message: 'Kaynak klasörde scripts/refresh-app.sh yok.', detail: 'Geliştirme için ProjectGalaxy klasöründeki Yenile.app.command dosyasına çift tıkla.' });
            return;
          }
          spawn('bash', [src], { detached: true, stdio: 'ignore' }).unref();
        } catch (e) {}
      } },
      { type: 'separator' },
      { label: 'Çıkış', click: () => app.quit() }
    ]));
  } catch (err) { /* tray başarısız olsa da uygulama çalışsın */ }
}

app.whenReady().then(() => {
  // Media izin handler'ı (ileride sesli komut açılırsa hazır; şu an proaktif mikrofon izni İSTENMEZ).
  try {
    const { session } = require('electron');
    session.defaultSession.setPermissionRequestHandler((wc, permission, cb) => cb(true));
    try { session.defaultSession.setPermissionCheckHandler(() => true); } catch (e) {}
  } catch (e) {}
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
// İkinci bir kopya açılmaya çalışıldığında (kısayol/simge tekrar tıklanınca) yeni pencere AÇMA —
// mevcut pencereyi öne getir. Böylece aynı veri dosyasına iki süreç birden yazamaz.
app.on('second-instance', () => {
  const wins = BrowserWindow.getAllWindows().filter(w => w !== quickWin);
  if (wins.length) {
    const w = wins[0];
    if (w.isMinimized()) w.restore();
    w.show(); w.focus();
    if (loadWinState().fullscreen !== false && !w.isFullScreen()) w.setFullScreen(true);
  }
  else if (needsOnboarding()) createOnboardingWindow(); else createWindow();
});
