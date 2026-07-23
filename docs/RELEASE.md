# Project Galaxy — Yayınlama Rehberi

> **Sürüm çıkarıyorsan asıl dosya bu değil:** App Store / TestFlight build'inin çalışan, doğrulanmış
> adım adım akışı **[`DEPLOYMENT.md`](DEPLOYMENT.md)** dosyasındadır (referans: 2.3.6).
> Bu rehber tek seferlik hesap/sertifika kurulumunu ve DMG yolunu anlatır.

Bu rehber iki dağıtım yolunu adım adım anlatır: **Developer ID ile imzalı DMG** (önerilen ilk yol) ve **Mac App Store**. Her ikisi de Apple Developer Program üyeliği ($99/yıl) gerektirir.

> **Önemli — App Store sınırı:** Sandbox, `claude` CLI'ı çalıştırmaya izin vermediği için MAS sürümünde ajanlar, ⌁ CLAUDE konsolu, ✎ GÜNLÜK'ün otomatik proje algılaması, ⏱ ZAMANLAYICI çıktıları ve ▮ BASH devre dışıdır (uygulama bunu kullanıcıya açıklayan mesajlar gösterir). Evren haritası, gezegen modu, dosya görüntüleyici, git panelleri, todo/pano, DB görüntüleyici çalışır. Ajanların App Store'da da çalışması için yol haritasındaki "Claude API (BYOK) modu" tamamlanmalı — bkz. PRODUCTIZATION.md.

---

## 0. Tek seferlik hazırlık (her iki yol için)

1. [developer.apple.com](https://developer.apple.com) hesabınla giriş yap → **Membership** sayfasından **Team ID**'ni not al (10 karakter, ör. `AB12CD34EF`).
2. Xcode'u kur (sertifika ve profil yönetimi için en kolayı): `xcode-select --install` yetmez, App Store'dan tam Xcode.
3. Xcode → Settings → Accounts → Apple ID'ni ekle → **Manage Certificates**.

## 1. Developer ID sürümü (imzalı + notarize DMG)

### 1a. Sertifika
Xcode → Manage Certificates → **+** → **Developer ID Application**. (Ya da developer.apple.com → Certificates'ten oluştur ve çift tıklayıp Anahtar Zinciri'ne yükle.)

### 1b. Notarization kimlik bilgileri
[appleid.apple.com](https://appleid.apple.com) → App-Specific Passwords → yeni parola üret. Sonra terminalde:

```bash
export APPLE_ID="senin@appleid.com"
export APPLE_APP_SPECIFIC_PASSWORD="xxxx-xxxx-xxxx-xxxx"
export APPLE_TEAM_ID="AB12CD34EF"
```

(`package.json > build.mac.notarize: true` bu üç ortam değişkenini okur.)

### 1c. Build

```bash
npm run dist        # dist/ altında imzalı + notarize edilmiş DMG (arm64 + x64)
```

electron-builder imzayı Anahtar Zinciri'ndeki Developer ID sertifikasıyla otomatik yapar, ardından Apple'a notarization'a gönderir (birkaç dakika sürer). Çıkan DMG'yi herhangi bir Mac'te aç: Gatekeeper "doğrulanmış geliştirici" diyorsa tamamdır.

Doğrulama:

```bash
spctl -a -vv "dist/mac-arm64/Project Galaxy.app"   # "accepted · Notarized Developer ID" görmeli
```

## 2. Mac App Store sürümü

### 2a. Sertifikalar
Xcode → Manage Certificates → **+** ile iki sertifika: **Apple Distribution** ve **Mac Installer Distribution**.

### 2b. App Store Connect kaydı
[appstoreconnect.apple.com](https://appstoreconnect.apple.com) → My Apps → **+** → New App → platform **macOS**, Bundle ID **com.furkan.projectgalaxy** (önce developer.apple.com → Identifiers'ta bu ID'yi App ID olarak kaydet, **App Sandbox** capability'si ile).

### 2c. Provisioning profile
developer.apple.com → Profiles → **+** → **Mac App Store** dağıtım profili → App ID olarak com.furkan.projectgalaxy'yi seç → indir → dosyayı `build/embedded.provisionprofile` adıyla projeye koy.

### 2d. Entitlements'ta Team ID — ~~elle yaz~~ **artık gerekmiyor**
> **Güncelleme (2.3.6):** Team ID, `application-identifier` ve `application-groups` anahtarları
> imzalama sırasında **provisioning profile'dan otomatik türetiliyor**; `build/entitlements.mas.plist`
> içine elle yazılmaz ve orada yer almaz. Doğrulanmış çıktı: [`DEPLOYMENT.md`](DEPLOYMENT.md) §4.

### 2e. Build + yükleme

```bash
npm run release:mas    # dist-mas/Project Galaxy-<sürüm>.pkg üretir
```

> **Neden electron-builder değil:** `electron-builder --mac mas` güncel macOS'ta yardımcı süreçleri
> sandbox'ta SIGTRAP ile çökertiyor. Çalışan yol `scripts/build-mas.js` (packager + dosya-bazlı
> osx-sign). Gerekçe ve değişmezler: [`DEPLOYMENT.md`](DEPLOYMENT.md) §0.

Çıkan `.pkg`'yi Apple'a yüklemek için **Transporter** uygulamasını kullan (Mac App Store'dan indir): Transporter'ı aç → pkg'yi sürükle → Deliver.

### 2f. TestFlight ile beta (mağazadan önce önerilen yol)

Mac uygulamaları da TestFlight'ta dağıtılır; Xcode'daki Archive → Distribute akışının buradaki karşılığı şudur:

1. **Ön koşullar 2a–2d ile aynı** (Apple Distribution + Mac Installer Distribution sertifikaları, App Store Connect'te uygulama kaydı, `build/embedded.provisionprofile`, entitlements'ta gerçek Team ID). TestFlight için ekstra sertifika/profil GEREKMEZ.
2. **Build:** `npm run release:mas` → `dist-mas/Project Galaxy-<sürüm>.pkg`
3. **Yükle:** Transporter'ı aç → pkg'yi sürükle → **Deliver**. (Xcode Organizer'ın yerini bu alıyor; komut satırı istersen: `xcrun altool --upload-app -f <pkg> -t macos -u <appleid> -p <app-specific-password>`)
4. **App Store Connect → uygulaman → TestFlight sekmesi:** build birkaç dakikada "Processing"den çıkar. `ITSAppUsesNonExemptEncryption=false` pakete gömülü olduğu için şifreleme sorusu sorulmaz, build doğrudan kullanılabilir olur.
5. **Test edenleri ekle:**
   - **Internal Testing** (anında, incelemesiz): grup oluştur → App Store Connect ekibindeki kişileri ekle (max 100). Kendini eklemek için bu yeterli.
   - **External Testing** (max 10.000 kişi, e-postayla ya da public link): ilk build kısa bir **Beta App Review**'dan geçer (~1 gün); `APPSTORE.md`'deki inceleme notunu buraya da yapıştır.
6. **Test edenler:** Mac App Store'dan **TestFlight** uygulamasını kurar (macOS 12+), davet e-postasındaki/linkteki kodu kullanır, uygulama TestFlight içinden kurulur; yeni build yüklediğinde otomatik bildirim alırlar.
7. **Her yeni yüklemede sürümü artır:** aynı sürüm numarasıyla ikinci pkg yüklenemez — `package.json > version`'ı yükselt (2.3.0 → 2.3.1) ya da sürümü sabit tutup `build.mac.buildVersion` alanına artan bir build numarası ver.

**TestFlight'a özgü bilinen tuzaklar (Electron):**

| Belirti | Neden / Çözüm |
|---------|----------------|
| Build TestFlight'ta hiç görünmüyor | pkg `mas-dev` ile imzalanmış olabilir — `npm run release:mas` doğru olanı (distribution) kullanır. Ayrıca App Store Connect'te doğru uygulamaya yüklendiğini kontrol et (Bundle ID eşleşmeli). |
| TestFlight'tan kurulan uygulama açılır açılmaz çöküyor | Yardımcı süreç entitlements'ı bozuktur (`inherit` yanına anahtar eklenmiş) ya da provisioning profile App ID'yle uyuşmuyordur. Bkz. [`DEPLOYMENT.md`](DEPLOYMENT.md) §0 ve §2.4. |
| "Asset validation failed" | Sürüm/build numarası daha önce kullanılmış — 7. maddedeki gibi artır. |

### 2g. App Review (mağazaya çıkış)
TestFlight'ta beta bittiğinde aynı build'i mağazaya göndermek için App Store Connect formunu doldur. Hazır metinler (açıklama TR/EN, anahtar kelimeler, gizlilik yanıtları, inceleme notları, ekran görüntüsü listesi): **`docs/APPSTORE.md`** — kopyala-yapıştır.

## 2½. Otomatik güncelleme (electron-updater + GitHub Releases)

Kod hazır: uygulama paketli (DMG) sürümde açılışta güncellemeleri sessizce denetler, tray menüsünde **Güncellemeleri Denetle** vardır. Çalışması için:

1. GitHub'da `furkanyildiz/project-galaxy` adında repo aç (private yeterli) — farklı ad kullanacaksan `package.json > build.publish` içindeki owner/repo'yu değiştir.
2. Yayınlarken: `GH_TOKEN=<github-token> npx electron-builder --mac dmg --publish always` — DMG'yi imzalar, notarize eder ve GitHub Releases'a yükler (latest-mac.yml dahil; updater bu dosyadan beslenir).
3. Kullanıcıdaki uygulama bir sonraki açılışta yeni sürümü arka planda indirir; kapat-aç ile kurulur.

Not: MAS sürümünde ve `npm start` geliştirme modunda updater bilinçli olarak kapalıdır.

## 3. Sürüm çıkarken kontrol listesi

- [ ] `package.json > version` yükseltildi
- [ ] `npm start` ile duman testi: onboarding (temiz profille), evren taraması, gezegen modu
- [ ] Temiz test: `GALAXY_DATA_DIR=/tmp/galaxy-test npm start` → onboarding baştan akmalı
- [ ] `npm run dist` → DMG'yi ikinci bir kullanıcı hesabında/makinede aç
- [ ] MAS için: `npm run release:mas` → pkg'yi Transporter ile yükle (tam liste: [`DEPLOYMENT.md`](DEPLOYMENT.md) §6)
- [ ] Git etiketi: `git tag v2.2.0 && git push --tags`

## Sık karşılaşılan hatalar

| Hata | Çözüm |
|------|-------|
| `No identity found` | Sertifika Anahtar Zinciri'nde değil — Xcode → Manage Certificates |
| Notarization `invalid` | `xcrun notarytool log <id>` ile nedeni gör; genelde entitlements/imza eksiği |
| MAS build `provisioning profile` hatası | `build/embedded.provisionprofile` yok ya da Bundle ID uyuşmuyor |
| pkg yükleme sonrası "Invalid Binary" | Bundle'da root-only (600) izinli dosya kalmış olabilir — bkz. [`DEPLOYMENT.md`](DEPLOYMENT.md) §5 |
