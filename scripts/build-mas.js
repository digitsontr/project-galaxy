#!/usr/bin/env node
/*
 * Project Galaxy — Mac App Store (TestFlight) build
 * ─────────────────────────────────────────────────
 * electron-builder'ın yeni macOS'ta bilinen MAS imzalama hatasını (GPU/ağ
 * yardımcı süreçlerinin sandbox'ta SIGTRAP ile çökmesi) aşmak için, uygulamayı
 * @electron/packager ile paketleyip @electron/osx-sign ile — Electron Forge'un
 * kullandığı yöntemin aynısı — DOSYA-BAZLI entitlements uygulayarak imzalar:
 *   ana .app  → build/entitlements.mas.plist
 *   yardımcılar→ build/entitlements.mas.inherit.plist
 * Ardından installer sertifikasıyla App Store'a uygun .pkg üretir.
 *
 * Kullanım (proje kökünde):  node scripts/build-mas.js
 * Çıktı:  dist-mas/Project Galaxy-<sürüm>.pkg  → Transporter ile yükle.
 */
const path = require('path');
const fs = require('fs');
const { execFileSync, execSync } = require('child_process');

async function main() {
  const packager = require('@electron/packager');
  const osxSign = require('@electron/osx-sign');
  const signFn = osxSign.signAsync || osxSign.sign
    || (osxSign.default && (osxSign.default.signAsync || osxSign.default.sign));
  if (typeof signFn !== 'function') {
    throw new Error('@electron/osx-sign imza fonksiyonu bulunamadı. Mevcut anahtarlar: ' + Object.keys(osxSign).join(', '));
  }

  const ROOT = path.basename(__dirname) === 'scripts' ? path.join(__dirname, '..') : __dirname;
  const APP_NAME = 'Project Galaxy';
  const OUT = path.join(ROOT, 'dist-mas');
  const pkgVersion = require(path.join(ROOT, 'package.json')).version;

  // 0) gerekli dosyalar var mı?
  const profile = path.join(ROOT, 'build', 'embedded.provisionprofile');
  for (const f of [
    path.join(ROOT, 'build', 'entitlements.mas.plist'),
    path.join(ROOT, 'build', 'entitlements.mas.inherit.plist'),
    profile,
  ]) {
    if (!fs.existsSync(f)) throw new Error('Eksik dosya: ' + f);
  }

  // 1) sertifika kimliklerini otomatik bul
  const ids = execSync('security find-identity -v', { encoding: 'utf8' });
  const pick = (m) => {
    const line = ids.split('\n').find(l => l.includes(m));
    return line ? line.match(/"([^"]+)"/)[1] : null;
  };
  const appId = pick('Apple Distribution') || pick('3rd Party Mac Developer Application');
  const installerId = pick('Mac Installer Distribution') || pick('3rd Party Mac Developer Installer');
  if (!appId) throw new Error('Uygulama imzalama sertifikası yok (Apple Distribution). Xcode → Manage Certificates → + → Apple Distribution');
  if (!installerId) throw new Error('Yükleyici sertifikası yok (Mac Installer Distribution). Xcode → Manage Certificates → + → Mac Installer Distribution');
  console.log('▸ App imza kimliği :', appId);
  console.log('▸ Installer kimliği:', installerId);
  console.log('▸ Sürüm           :', pkgVersion);

  // 2) temizle + paketle (mas, universal)
  fs.rmSync(OUT, { recursive: true, force: true });
  console.log('\n▸ Paketleniyor (mas · universal) — Electron indirilebilir, birkaç dakika sürebilir…');
  const appPaths = await packager({
    dir: ROOT,
    name: APP_NAME,
    platform: 'mas',
    arch: 'universal',
    appBundleId: 'com.furkan.projectgalaxy',
    appCategoryType: 'public.app-category.developer-tools',
    icon: path.join(ROOT, 'build', 'galaxy.icns'),
    out: OUT,
    overwrite: true,
    prune: true,
    appVersion: pkgVersion,
    buildVersion: pkgVersion,
    extendInfo: {
      ITSAppUsesNonExemptEncryption: false,
      LSMinimumSystemVersion: '12.0',
    },
    // kişisel veri, geliştirme dosyaları ve gereksizleri bundle'a alma
    ignore: [
      /^\/dist($|\/)/, /^\/dist-mas($|\/)/, /^\/out($|\/)/,
      /^\/backups($|\/)/, /^\/reports($|\/)/, /^\/attachments($|\/)/,
      /^\/docs($|\/)/, /^\/\.git($|\/)/, /^\/scripts($|\/)/,
      /\.command$/, /\.md$/, /^\/index\.v2\.backup\.html$/,
      /^\/build\/icon_preview/, /^\/galaxy-data\.js$/, /^\/galaxy-data\.json$/,
      /^\/\.DS_Store$/,
    ],
  });

  const appPath = path.join(appPaths[0], `${APP_NAME}.app`);
  console.log('✓ Paketlendi:', appPath);

  // App Store kuralı: tüm dosyalar root olmayan kullanıcılarca da OKUNABİLİR olmalı
  // (kaynak dosyalar 600/owner-only izinle gelmişse imza doğrulaması kurulumda başarısız olur).
  // İzin düzeltmesi imzalamadan ÖNCE yapılmalı ki imza doğru izinleri kapsasın.
  console.log('▸ Dosya izinleri normalleştiriliyor (herkes okuyabilsin)…');
  const A = JSON.stringify(appPath);
  execSync(`chmod -R u+rwX,go+rX ${A}`);
  // dünyaya-okunamaz kalan dosya/dizinleri tek tek bul ve düzelt
  execSync(`find ${A} -type d -exec chmod o+rx {} +`);
  execSync(`find ${A} -type f -exec chmod o+r {} +`);
  // kesin doğrulama: hâlâ okunamayan varsa build'i durdur (bozuk pkg üretme)
  const remaining = execSync(`find ${A} \\( -type f -o -type d \\) ! -perm -o+r -print 2>/dev/null || true`, { encoding: 'utf8' }).trim();
  if (remaining) throw new Error('Hâlâ root-only dosyalar var, imzalama durduruldu:\n' + remaining);
  console.log('✓ İzinler tamam — tüm dosyalar okunabilir');

  // 3) DOSYA-BAZLI entitlements ile imzala (asıl düzeltme burası)
  console.log('\n▸ İmzalanıyor (@electron/osx-sign · dosya-bazlı entitlements)…');
  await signFn({
    app: appPath,
    platform: 'mas',
    provisioningProfile: profile,
    identity: appId,
    type: 'distribution',
    optionsForFile: (filePath) => {
      const isMain = filePath.endsWith(`${APP_NAME}.app`);
      return {
        entitlements: path.join(ROOT, 'build', isMain ? 'entitlements.mas.plist' : 'entitlements.mas.inherit.plist'),
        hardenedRuntime: false, // MAS'ta hardened runtime kullanılmaz
      };
    },
  });
  console.log('✓ İmzalandı');

  // 4) App Store'a uygun .pkg üret
  const pkgPath = path.join(OUT, `${APP_NAME}-${pkgVersion}.pkg`);
  console.log('\n▸ .pkg üretiliyor…');
  execFileSync('productbuild', [
    '--component', appPath, '/Applications',
    '--sign', installerId,
    pkgPath,
  ], { stdio: 'inherit' });

  // 5) hızlı doğrulama
  try {
    const ent = execSync(`codesign -d --entitlements :- "${appPath}/Contents/Frameworks/${APP_NAME} Helper (GPU).app" 2>&1`, { encoding: 'utf8' });
    console.log('\n▸ GPU helper entitlements (inherit + app-sandbox içermeli):');
    console.log('  ', /com\.apple\.security\.inherit/.test(ent) && /app-sandbox/.test(ent) ? 'TAMAM ✓' : 'DİKKAT — inherit/app-sandbox görünmüyor');
  } catch (e) {}

  console.log('\n✓ BİTTİ →', pkgPath);
  console.log('  Bu .pkg\'yi Transporter ile yükle, sonra App Store Connect → TestFlight.');
}

main().catch(e => { console.error('\n✗ HATA:', e && e.message ? e.message : e); process.exit(1); });
