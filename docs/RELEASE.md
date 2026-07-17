# Project Galaxy — Yayınlama Rehberi

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

### 2d. Entitlements'ta Team ID
`build/entitlements.mas.plist` içindeki `TEAM_ID.com.furkan.projectgalaxy` satırında `TEAM_ID` yerine gerçek Team ID'ni yaz (ör. `AB12CD34EF.com.furkan.projectgalaxy`).

### 2e. Build + yükleme

```bash
npm run dist:mas    # dist/mas-universal (veya arm64) altında .pkg üretir
```

Çıkan `.pkg`'yi Apple'a yüklemek için **Transporter** uygulamasını kullan (Mac App Store'dan indir): Transporter'ı aç → pkg'yi sürükle → Deliver.

### 2f. App Review
App Store Connect'te sürümü doldur: ekran görüntüleri (uzay modu, gezegen modu), açıklama, gizlilik ("veri toplamıyor" — her şey lokalde, güçlü artı), fiyat. İncelemeye gönder.

Review notlarına şunu yaz: uygulamanın klasör erişiminin kullanıcının açıkça seçtiği klasörlerle sınırlı olduğu (security-scoped bookmarks) ve ağ erişiminin yalnızca kullanıcının kendi veritabanı sunucuları için olduğu.

## 3. Sürüm çıkarken kontrol listesi

- [ ] `package.json > version` yükseltildi
- [ ] `npm start` ile duman testi: onboarding (temiz profille), evren taraması, gezegen modu
- [ ] Temiz test: `GALAXY_DATA_DIR=/tmp/galaxy-test npm start` → onboarding baştan akmalı
- [ ] `npm run dist` → DMG'yi ikinci bir kullanıcı hesabında/makinede aç
- [ ] MAS için: `npm run dist:mas` → pkg'yi Transporter ile yükle
- [ ] Git etiketi: `git tag v2.2.0 && git push --tags`

## Sık karşılaşılan hatalar

| Hata | Çözüm |
|------|-------|
| `No identity found` | Sertifika Anahtar Zinciri'nde değil — Xcode → Manage Certificates |
| Notarization `invalid` | `xcrun notarytool log <id>` ile nedeni gör; genelde entitlements/imza eksiği |
| MAS build `provisioning profile` hatası | `build/embedded.provisionprofile` yok ya da Bundle ID uyuşmuyor |
| pkg yükleme sonrası "Invalid Binary" | entitlements.mas.plist'te Team ID yazılmamış olabilir (2d) |
