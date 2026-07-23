# Project Galaxy — Sürüm Çıkarma Runbook'u (Mac App Store / TestFlight)

> **Doğrulanmış referans sürüm: 2.3.6** — 21 Tem 2026'da bu akışla üretildi, Transporter ile yüklendi,
> TestFlight'tan indirildi ve **sorunsuz açıldı**. Bu dosya o çalışan akışın birebir kaydıdır.
> Bir sonraki sürümde tek yapman gereken: **§2'yi yukarıdan aşağıya uygulamak.**

İki dağıtım yolu var. Bu dosya **App Store / TestFlight** yolunu (asıl kırılgan olan) anlatır.
Developer ID + notarize DMG yolu ve tek seferlik hesap/sertifika kurulumu için: [`RELEASE.md`](RELEASE.md).

---

## 0. Değişmezler — bunlara dokunma

2.3.6'nın çalışmasının sebebi aşağıdaki yedi karardır. Biri bozulursa build ya reddedilir ya da
kullanıcıda açılır açılmaz çöker. Değiştirmen gerekiyorsa **önce nedenini oku.**

| # | Değişmez | Neden |
|---|----------|-------|
| 1 | Build komutu **`npm run release:mas`** (= `node scripts/build-mas.js`) | electron-builder'ın `--mac mas` hedefi güncel macOS'ta yardımcı süreçleri sandbox'ta **SIGTRAP** ile çökertiyor. Script, Electron Forge'un yöntemini kullanır: `@electron/packager` ile paketle + `@electron/osx-sign` ile **dosya-bazlı** entitlements uygula. |
| 2 | **İki ayrı entitlements dosyası**, dosya-bazlı uygulanır | Ana `.app` → `build/entitlements.mas.plist`, tüm yardımcılar → `build/entitlements.mas.inherit.plist`. Tek dosya tüm bundle'a uygulanırsa helper'lar ölür. |
| 3 | `entitlements.mas.inherit.plist` **yalnızca** `app-sandbox` + `inherit` içerir | `inherit` yanına başka herhangi bir entitlement konursa macOS yardımcı süreci öldürür. Buraya asla yeni anahtar ekleme. |
| 4 | MAS entitlements'ında **`com.apple.security.cs.*` yok**, `hardenedRuntime: false` | `cs.*` anahtarları hardened runtime'a aittir, MAS'a değil; eklenirse imza/çalışma bozulur. (DMG yolu bunun tam tersi — `build/entitlements.plist` ayrı dosyadır, karıştırma.) |
| 5 | Team ID, `application-identifier`, `application-groups` **elle yazılmaz** | Bunları `@electron/osx-sign` **provisioning profile'dan otomatik türetir**. 2.3.6'da doğrulandı (§4). `entitlements.mas.plist` içine elle Team ID yazma — eski RELEASE.md notu artık geçersiz. |
| 6 | İzin normalleştirmesi **imzadan önce** yapılır | Kaynak dosyalar 600 (owner-only) izinle gelirse App Store doğrulaması kurulumda patlar. Script `chmod` uygular ve **hâlâ okunamayan dosya kalırsa build'i durdurur** — bu koruma kaldırılmasın. |
| 7 | `universal` (x86_64 + arm64), `LSMinimumSystemVersion 12.0`, `ITSAppUsesNonExemptEncryption false` | Sırasıyla: Intel+Apple Silicon tek pakette; desteklenen en düşük macOS; şifreleme sorusunun TestFlight'ta sorulmaması. |

---

## 1. Ön koşullar (makine başına bir kez)

- Xcode (App Store'dan tam sürüm) + Apple Developer Program üyeliği.
- Anahtar Zinciri'nde **iki** sertifika: `Apple Distribution` ve `Mac Installer Distribution`.
  Kontrol: `security find-identity -v | grep -E "Apple Distribution|Mac Installer"` → iki satır gelmeli.
- `build/embedded.provisionprofile` — developer.apple.com → Profiles → **Mac App Store** dağıtım profili,
  App ID `com.furkan.projectgalaxy`. **Profilin son kullanma tarihi vardır**; süresi dolarsa build imzalanır
  ama TestFlight'ta çalışmaz → yenisini indirip bu dosyanın üzerine yaz.
  Mevcut profil: **"FY Project Galaxy"**, oluşturma 20 Tem 2026 → **bitiş 20 Tem 2027**.
  Tarihi istediğin zaman kontrol et:
  ```bash
  security cms -D -i build/embedded.provisionprofile | plutil -extract ExpirationDate raw -
  ```
- **Transporter** (Mac App Store'dan ücretsiz) — pkg yüklemek için.

Detaylı hesap/sertifika kurulumu: [`RELEASE.md`](RELEASE.md) §0 ve §2a–2c.

---

## 2. Her yeni sürümde izlenecek adımlar

### 2.1 — Sürümü yükselt (atlanamaz)

```bash
# package.json > version   →  2.3.6'dan 2.3.7'ye
```

App Store Connect **aynı sürüm numarasını iki kez kabul etmez**. Unutursan yükleme
`Asset validation failed` ile reddedilir. Sürüm numarası hem `CFBundleShortVersionString`
hem `CFBundleVersion` olarak pakete gömülür (script `package.json`'dan okur).

### 2.2 — Duman testi (paketlemeden önce)

```bash
npm start                                     # normal açılış
GALAXY_DATA_DIR=/tmp/galaxy-test npm start    # temiz profil → onboarding baştan akmalı
```

Bak: onboarding akışı, evren taraması, gezegen modu, HUD (alt orta 🚀), **F1 → Seyir Rehberi**,
git panelindeki **TAKIM AKIŞI**.

> **Tuzak:** `npm start` şu hatayı veriyorsa —
> `TypeError: Cannot read properties of undefined (reading 'getPath')` —
> kabuğunda `ELECTRON_RUN_AS_NODE=1` set edilmiştir; Electron ana süreç yerine düz Node olarak açılır.
> Çözüm: `env -u ELECTRON_RUN_AS_NODE npm start`

### 2.3 — Build

```bash
npm run release:mas          # = node scripts/build-mas.js
```

Script sırayla: sertifikaları otomatik bulur → `dist-mas/`'ı siler → universal paketler →
izinleri normalleştirir ve **doğrular** → dosya-bazlı entitlements ile imzalar →
`productbuild` ile .pkg üretir → GPU helper entitlements'ını kontrol eder.

Çıktı: **`dist-mas/Project Galaxy-<sürüm>.pkg`** (2.3.6'da ~225 MB).
İlk çalıştırmada Electron indirilebilir, birkaç dakika sürer.

Konsolda görmen gerekenler:

```
✓ İzinler tamam — tüm dosyalar okunabilir
✓ İmzalandı
▸ GPU helper entitlements (inherit + app-sandbox içermeli):
   TAMAM ✓
✓ BİTTİ → .../dist-mas/Project Galaxy-2.3.7.pkg
```

`TAMAM ✓` yerine `DİKKAT` yazıyorsa **yükleme, çöken bir build üretir** — durdur, §0/2–3'ü kontrol et.

### 2.4 — Yükleme öncesi doğrulama (30 saniye, atlama)

```bash
APP="dist-mas/Project Galaxy-mas-universal/Project Galaxy.app"

lipo -archs "$APP/Contents/MacOS/Project Galaxy"                    # → x86_64 arm64
codesign -dv "$APP" 2>&1 | grep -E "Identifier|TeamIdentifier"      # → com.furkan.projectgalaxy / R58P2TDF5U
ls -l "$APP/Contents/embedded.provisionprofile"                     # → dosya var
codesign -d --entitlements :- "$APP/Contents/Frameworks/Project Galaxy Helper (GPU).app" 2>/dev/null
#   → SADECE app-sandbox + inherit
find "$APP" \( -type f -o -type d \) ! -perm -o+r | head            # → hiçbir çıktı olmamalı
ls "$APP/Contents/Resources/app"                                    # → §3: her şey pakette mi
```

### 2.5 — Apple'a yükle

Transporter'ı aç → `dist-mas/Project Galaxy-<sürüm>.pkg` dosyasını sürükle → **Deliver**.

Komut satırı alternatifi:
```bash
xcrun altool --upload-app -f "dist-mas/Project Galaxy-2.3.7.pkg" -t macos \
  -u <apple-id> -p <app-specific-password>
```

### 2.6 — TestFlight

App Store Connect → uygulaman → **TestFlight**. Build birkaç dakika "Processing"de kalır, sonra kullanılabilir olur
(`ITSAppUsesNonExemptEncryption` gömülü olduğu için şifreleme sorusu sorulmaz).

- **Internal Testing** — anında, incelemesiz, max 100 kişi. Kendini test etmek için bu yeterli.
- **External Testing** — max 10.000 kişi; ilk build kısa bir Beta App Review'dan geçer (~1 gün).
  İnceleme notu metni: [`APPSTORE.md`](APPSTORE.md).

### 2.7 — Sürümü işaretle

```bash
git add -A && git commit -m "release: 2.3.7"
git tag v2.3.7 && git push --tags
```

---

## 3. Yeni dosya eklerken — en sık kırılan yer

Projede **iki ayrı paketleme listesi** var ve ikisi farklı çalışır:

| Liste | Nerede | Kimin için | Mantık |
|-------|--------|------------|--------|
| `build.files` | `package.json` | electron-builder → **DMG** | **İzin listesi** — yazmadığın dosya pakete girmez |
| `ignore` | `scripts/build-mas.js` | @electron/packager → **MAS** | **Yasak listesi** — yazmadığın her şey pakete girer |

Yani yeni bir çalışma-zamanı dosyası (yeni bir `.js`, klasör, görsel seti) eklediğinde:

1. `package.json > build.files` içine **ekle** (yoksa DMG sürümünde dosya bulunamaz hatası alırsın),
2. `scripts/build-mas.js > ignore` içine **yanlışlıkla girmediğinden emin ol**,
3. Build sonrası doğrula:
   ```bash
   ls "dist-mas/Project Galaxy-mas-universal/Project Galaxy.app/Contents/Resources/app"
   ```

Örnek: `assets/guide/**` (rehber görselleri + ajan portreleri) her iki tarafta da doğru ayarlandı —
2.3.6 bundle'ında 24 dosya olarak yer aldı.

Bundle'a **girmemesi gerekenler** (script bunları zaten dışlar): `docs/`, `scripts/`, `dist*/`,
`backups/`, `reports/`, `attachments/`, `*.md`, `*.command`, `galaxy-data.json`, `.git/`.

---

## 4. 2.3.6 referans künyesi (doğrulanmış değerler)

Bir sonraki build'de bir şey tuhaf görünürse buradaki değerlerle karşılaştır.

| Alan | Değer |
|------|-------|
| Sürüm (short / bundle) | `2.3.6` / `2.3.6` |
| Bundle ID | `com.furkan.projectgalaxy` |
| Team ID | `R58P2TDF5U` (gizli değil; her imzalı binary'de görünür) |
| Mimari | `x86_64 arm64` (universal) |
| Min. macOS | `12.0` |
| Electron | `43.1.1` |
| Node (build makinesi) | `v24.10.0` |
| pkg boyutu | ~225 MB |
| Kategori | `public.app-category.developer-tools` |

**Ana .app'in imzalanmış son entitlements'ı** (dikkat: `application-identifier`, `team-identifier` ve
`application-groups` kaynak plist'te **yok** — imzalarken profilden geldiler):

```
com.apple.application-identifier          R58P2TDF5U.com.furkan.projectgalaxy
com.apple.developer.team-identifier       R58P2TDF5U
com.apple.security.app-sandbox            true
com.apple.security.application-groups     R58P2TDF5U.com.furkan.projectgalaxy
com.apple.security.files.bookmarks.app-scope    true
com.apple.security.files.user-selected.read-write   true
com.apple.security.network.client         true
```

**Yardımcı süreçlerin (GPU/Renderer/Network) entitlements'ı — tam olarak bu ikisi, fazlası değil:**

```
com.apple.security.app-sandbox   true
com.apple.security.inherit       true
```

---

## 5. Hata → çözüm

| Belirti | Sebep / Çözüm |
|---------|----------------|
| `Asset validation failed` | Bu sürüm numarası daha önce yüklenmiş. `package.json > version` artır, yeniden build al. |
| Uygulama TestFlight'tan kurulunca **açılır açılmaz çöküyor** | Yardımcı süreç entitlements'ı bozuk. `inherit` yanına anahtar eklenmiş ya da tek-dosya entitlements uygulanmış olabilir → §0/2–3, doğrulama için §2.4. |
| Yardımcı süreçler **SIGTRAP** ile ölüyor | electron-builder `--mac mas` ile build alınmış. `npm run release:mas` kullan (§0/1). |
| `Invalid Binary` / kurulumda imza doğrulaması başarısız | Bundle'da root-only (600) dosya kalmış. Script bunu engeller; elle build aldıysan §2.4'teki `find ... ! -perm -o+r` komutunu çalıştır. |
| `Uygulama imzalama sertifikası yok` | Anahtar Zinciri'nde `Apple Distribution` yok → Xcode → Settings → Accounts → Manage Certificates → **+**. |
| `Yükleyici sertifikası yok` | Aynı yerden `Mac Installer Distribution` ekle. |
| Build TestFlight'ta hiç görünmüyor | Yanlış uygulamaya yüklenmiş olabilir (Bundle ID eşleşmeli) ya da profil `mas-dev`. Ayrıca Processing birkaç dakika sürebilir. |
| `Eksik dosya: build/embedded.provisionprofile` | Profil indirilmemiş ya da süresi dolmuş → §1. |
| `npm start` → `Cannot read properties of undefined (reading 'getPath')` | Kabukta `ELECTRON_RUN_AS_NODE=1` var → `env -u ELECTRON_RUN_AS_NODE npm start` (§2.2). |

---

## 6. Kontrol listesi (kopyala, her sürümde işaretle)

- [ ] `package.json > version` yükseltildi
- [ ] Yeni dosya eklendiyse `build.files` + `ignore` kontrol edildi (§3)
- [ ] `npm start` ve temiz profil duman testi geçti (§2.2)
- [ ] `npm run release:mas` → konsolda `TAMAM ✓` ve `✓ BİTTİ` (§2.3)
- [ ] §2.4 doğrulama komutlarının hepsi beklendiği gibi (özellikle GPU helper entitlements + izinler)
- [ ] `Resources/app` içeriği eksiksiz (§3)
- [ ] Transporter → Deliver başarılı
- [ ] TestFlight'ta build "Processing"den çıktı, **indirilip açıldı**
- [ ] `git commit` + `git tag v<sürüm>` + `git push --tags`

---

## 6½. Sürüm geçmişi

| Sürüm | Tarih | Build | §2.4 doğrulama | TestFlight'ta açıldı |
|-------|-------|-------|----------------|----------------------|
| 2.3.6 | 21 Tem 2026 | ✅ | ✅ | ✅ **doğrulandı** |
| 2.3.7 | 22 Tem 2026 | ✅ (215 MB) | ✅ hepsi geçti | ⏳ yükleme bekliyor |

> Yeni sürüm çıkardıkça bu tabloya bir satır ekle — hangi sürümün gerçekten
> **cihazda açıldığı** bilgisi, bir şey bozulduğunda geri dönülecek noktayı verir.

---

## 7. DMG (Developer ID) yolu — kısa not

App Store'un dışında doğrudan dağıtım için:

```bash
export APPLE_ID="..." APPLE_APP_SPECIFIC_PASSWORD="..." APPLE_TEAM_ID="R58P2TDF5U"
npm run dist                      # imzalar + notarize eder → dist/*.dmg
# GitHub Releases'a yayınlayarak otomatik güncellemeyi beslemek için:
GH_TOKEN=<token> npx electron-builder --mac dmg --publish always
```

DMG yolu **`build/entitlements.plist`** kullanır (`cs.allow-jit` + `cs.allow-unsigned-executable-memory`,
`hardenedRuntime: true`) — MAS dosyalarıyla karıştırma. Ayrıntı ve notarization kurulumu: [`RELEASE.md`](RELEASE.md) §1.

> DMG sürümünde ajanlar, ⌁ CLAUDE konsolu ve ▮ BASH çalışır; MAS sürümünde sandbox nedeniyle kapalıdır.
