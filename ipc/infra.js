// Sprint J — davranış taşındı; kopyalanmadı.
// Faz 5: eval-blob açıldı — gövde birebir aynı kod; artık satır satır okunur, diff'lenir,
// hata izinde gerçek satır numarası verir. with(g) bilinçli: çıplak isimler paylaşılan g'ye
// çözülür, g.X = ... atamaları bu modülün çıktısıdır. (Bu yüzden dosya başında 'use strict' yok.)
module.exports = function register(g) {
  with (g) {
/* ==================== UZAK SUNUCU (SSH) ====================
 * Uzak bir makineyi "evren" olarak eklemenin temeli. Kimlik doğrulama
 * tamamen sistemin ssh'ına bırakılır: mevcut anahtarların ve ~/.ssh/config
 * Host takma adların çalışır — uygulama HİÇBİR parola saklamaz.
 * BatchMode=yes sayesinde parola sorulacak bir durumda komut asılı kalmaz,
 * temiz bir hata döner. ControlMaster ile aynı bağlantı yeniden kullanılır,
 * böylece art arda çağrılar (tarama, git, dosya) tek el sıkışmayla akar.
 */

// Kontrol soketi (ControlMaster multiplexing) için TABAN dizin. İki kısıt:
//  1) BOŞLUKSUZ olmalı — DATA_DIR macOS'ta "Application Support" boşluğu içerir, ssh -o değerini bozar.
//  2) KISA olmalı — unix soket yolu macOS'ta 104 bayt sınırlı; ssh %C'yi ~40 hex'e açar ve
//     master soketi kurarken ~18 karakterlik geçici sonek ekler. os.tmpdir() (/var/folders/…) ~48
//     karakter olduğundan sınırı aşar. /tmp kısa ve boşluksuz.
const SSH_CTL_DIR = process.platform === 'win32' ? '' : '/tmp/.pgssh';

function sshBaseArgs(srv) {
  let to = 8; try { to = getSettings(loadData()).sshTimeout; } catch (e) {}
  const args = [
    '-o', 'BatchMode=yes',
    '-o', 'ConnectTimeout=' + to,
    '-o', 'StrictHostKeyChecking=accept-new'
  ];
  // Multiplexing'i yalnız yol boşluksuz VE yeterince kısaysa aç (yoksa bozuk/uzun soket üretme).
  if (SSH_CTL_DIR) {
    try { fs.mkdirSync(SSH_CTL_DIR, { recursive: true }); } catch (e) {}
    const ctlPath = path.join(SSH_CTL_DIR, '%C');
    // gerçek uzunluk ≈ taban + '/' + 40 (%C) + 18 (ssh geçici sonek); 100 baytın altında kalmalı
    if (!/\s/.test(ctlPath) && (SSH_CTL_DIR.length + 1 + 40 + 18) < 100) {
      args.push('-o', 'ControlMaster=auto', '-o', 'ControlPersist=90', '-o', 'ControlPath=' + ctlPath);
    }
  }
  if (srv.port && +srv.port !== 22) args.push('-p', String(+srv.port));
  // Anahtar dosyası verilmişse yalnız onu kullan. Yolu akıllıca çöz:
  //  ~ genişlet · mutlak yolu olduğu gibi · ÇIPLAK dosya adını (ör. "id_ed25519") ~/.ssh altında ara.
  // (ssh -i göreli yolu ÇALIŞMA DİZİNİNE göre çözer, ~/.ssh'a değil — çıplak ad bu yüzden bulunamıyordu.)
  if (srv.key) {
    let k = String(srv.key).trim().replace(/^~(?=\/|$)/, os.homedir());
    if (!path.isAbsolute(k)) k = k.includes('/') ? path.resolve(os.homedir(), k) : path.join(os.homedir(), '.ssh', k);
    // Anahtar dosyası GERÇEKTEN varsa yalnız onu kullan; yoksa -i EKLEME → agent/varsayılan anahtarlara düş
    // (kullanıcı yanlış/olmayan bir ad yazmışsa ölü uca girmesin).
    if (fs.existsSync(k)) args.push('-o', 'IdentitiesOnly=yes', '-i', k);
  }
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
    $act30 = 0
    if ($isGit) { $act30 = (& git -C $p log --since='30 days ago' --oneline 2>$null | Measure-Object).Count }
    Write-Output ("P|{0}|{1}|{2}|{3}|{4}|{5}|{6}|{7}" -f $name,$p,$isGit,$branch,$cepoch,$mepoch,$readme,$act30)
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
  // İkili içerik (görsel, pdf, video) uzaktan akıtılmıyor — faz 3'ün sınırı.
  // UI 'binary' kind'ını tanır ("app içinde önizlenemiyor" + harici aç); mesajı content'te ver.
  if (IMAGE_EXT.has(ext) || ext === 'pdf' || MEDIA_EXT.has(ext)) {
    return { ...base, kind: 'binary', remote: true,
      content: `Bu dosya türü uzak sunucudan görüntülenemiyor (${ext.toUpperCase()}).\nUzak konum: ${full}` };
  }
  if (size > REMOTE_MAX_TEXT) {
    return { ...base, kind: 'text', remote: true,
      content: `Dosya çok büyük (${(size / 1048576).toFixed(1)} MB) — uzaktan yalnızca ${(REMOTE_MAX_TEXT / 1048576)} MB'a kadar okunuyor.` };
  }
  const r = await sshExec(t.srv, `head -c ${REMOTE_MAX_TEXT} -- ${shq(full)}`, 40000);
  if (!r.ok) return null;
  return { ...base, kind: 'text', content: r.out, remote: true };
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
    if (process.platform === 'win32') {
      const { exec } = require('child_process');
      exec('start "" "%ProgramFiles%\\Docker\\Docker\\Docker Desktop.exe"', { env: ENV, timeout: 10000 }, err => resolve(err ? { ok: false, error: 'Docker Desktop açılamadı — kurulu olmayabilir.' } : { ok: true }));
      return;
    }
    if (process.platform === 'linux') { const { exec } = require('child_process'); exec('systemctl --user start docker-desktop || true', { env: ENV }, () => resolve({ ok: true })); return; }
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

ipcMain.handle('galaxy:dockerInspect', async (e, { id } = {}) => {
  if (IS_MAS) return { ok: false, error: MAS_BLOCKED };
  if (!id || !/^[a-zA-Z0-9][a-zA-Z0-9_.:@\/\-]*$/.test(id)) return { ok: false, error: 'Geçersiz kimlik' };
  const r = await docker(['inspect', id], 25000);
  if (!r.ok) return r;
  try {
    const arr = JSON.parse(r.out);
    const obj = Array.isArray(arr) ? arr[0] : arr;
    return { ok: true, inspect: obj, json: JSON.stringify(obj, null, 2) };
  } catch (err) {
    return { ok: true, json: r.out };
  }
});

// Canlı log akışı (docker logs -f) + konteyner içinde komut çalıştır
const dockerStreams = new Map();
ipcMain.handle('galaxy:dockerLogStream', (e, { id } = {}) => {
  if (IS_MAS) return { ok: false, error: MAS_BLOCKED };
  if (!id || !/^[a-zA-Z0-9][a-zA-Z0-9_.\-]*$/.test(id)) return { ok: false, error: 'Geçersiz konteyner kimliği' };
  const prev = dockerStreams.get(id); if (prev) { try { prev.kill('SIGKILL'); } catch (er) {} }
  let child;
  try { child = spawn('docker', ['logs', '-f', '--tail', '200', id], { env: ENV }); }
  catch (err) { return { ok: false, error: err.message }; }
  dockerStreams.set(id, child);
  const send = (kind, text) => { for (const w of BrowserWindow.getAllWindows()) { try { w.webContents.send('docker:log', { id, kind, text }); } catch (e2) {} } };
  child.stdout.on('data', c => send('out', c.toString()));
  child.stderr.on('data', c => send('out', c.toString()));   // docker logs stderr'e de yazar
  child.on('close', () => { dockerStreams.delete(id); send('done', ''); });
  child.on('error', err => send('err', err.message));
  return { ok: true };
});
ipcMain.handle('galaxy:dockerLogStop', (e, { id } = {}) => {
  const c = dockerStreams.get(id); if (c) { try { c.kill('SIGKILL'); } catch (er) {} dockerStreams.delete(id); }
  return { ok: true };
});
ipcMain.handle('galaxy:dockerExec', async (e, { id, cmd } = {}) => {
  if (IS_MAS) return { ok: false, error: MAS_BLOCKED };
  if (!id || !/^[a-zA-Z0-9][a-zA-Z0-9_.\-]*$/.test(id)) return { ok: false, error: 'Geçersiz konteyner kimliği' };
  if (!cmd || !String(cmd).trim()) return { ok: false, error: 'Komut boş' };
  const r = await docker(['exec', id, 'sh', '-c', String(cmd)], 30000);   // sh -c arg: kabuk yok, tek argüman
  return r.ok ? { ok: true, out: r.out } : { ok: false, error: r.error };
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
  if (process.platform === 'win32') {
    const dir = String(p); const { exec } = require('child_process');
    exec(`start "" cmd /k "cd /d "${dir}" && claude"`, { env: ENV }, () => {});
    return true;
  }
  const cmd = `cd '${String(p).replace(/'/g, "'\\''")}' && claude`;
  const script = `tell application "Terminal"
    activate
    do script "${cmd.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"
  end tell`;
  execFile('osascript', ['-e', script]);
  return true;
});

g.sshBaseArgs = sshBaseArgs;
g.sshTarget = sshTarget;
g.sshExec = sshExec;
g.sshFriendly = sshFriendly;
g.psCommand = psCommand;
g.sshProbe = sshProbe;
g.sshScanServer = sshScanServer;
g.remoteRefresh = remoteRefresh;
g.parseRemote = parseRemote;
g.safeRel = safeRel;
g.remoteSrv = remoteSrv;
g.remoteReadme = remoteReadme;
g.remoteList = remoteList;
g.remoteFile = remoteFile;
g.remoteTree = remoteTree;
g.remoteGitLog = remoteGitLog;
g.docker = docker;
g.parseJsonLines = parseJsonLines;
g.SSH_CTL_DIR = SSH_CTL_DIR;
g.getServer = getServer;
g.REMOTE_SCAN = REMOTE_SCAN;
g.REMOTE_SCAN_WIN = REMOTE_SCAN_WIN;
g.remoteCache = remoteCache;
g.REMOTE_TTL = REMOTE_TTL;
g.remoteRefreshing = remoteRefreshing;
g.remotePath = remotePath;
g.isRemotePath = isRemotePath;
g.shq = shq;
g.REMOTE_MAX_TEXT = REMOTE_MAX_TEXT;
g.DOCKER_TIMEOUT = DOCKER_TIMEOUT;
g.CONTAINER_ACTIONS = CONTAINER_ACTIONS;
g.dockerStreams = dockerStreams;
g.PRUNE = PRUNE;
  }
};
