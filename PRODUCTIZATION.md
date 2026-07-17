# Project Galaxy — Ürünleştirme Yol Haritası

Hedef: kişisel araçtan, satılabilir bir macOS ürününe. İki dağıtım hedefi birlikte hazırlanıyor: **Developer ID ile doğrudan dağıtım** (notarized DMG — tam özellik) ve **Mac App Store** (sandbox; ajanlar API moduna geçene dek kısıtlı). Adım adım yayınlama: `docs/RELEASE.md`.

---

## Faz 0 — Hazır Olanlar ✓
- [x] Çalışan Electron uygulaması (paketlenebilir .app)
- [x] electron-builder yapılandırması (`npm run dist` → arm64 + x64 DMG, şimdilik imzasız)
- [x] Mimari algılama (Intel/Apple Silicon)
- [x] Hardened runtime entitlements dosyası (build/entitlements.plist)
- [x] Veri güvenliği: safeStorage parola şifreleme, günlük yedek, otomatik git
- [x] Uygulama içi yardım (onboarding slaytlarının temeli)

## Faz 1 — Genelleştirme (en kritik iş, ~1-2 hafta)
- [x] **Sabit yolları kaldır**: PAPILON varsayımı silindi; veri `~/Library/Application Support/ProjectGalaxy/` altında, eski konumdan otomatik migrasyon var
- [x] **İlk açılış onboarding'i**: dil (TR/EN) + ad (ajanlar ismiyle hitap eder) + evren klasörleri (klasör seçici, MAS'ta bookmark üretir) + ajan adı/rolü kişiselleştirme (`onboarding.html`)
- [ ] **Claude CLI → Claude API geçişi (opsiyonlu)**: kullanıcı ya kendi Claude Code kurulumunu ya da API anahtarını kullanır (Ayarlar ekranı; anahtar safeStorage'da). Ajanlar API modunda `fetch` ile Messages API'ye gider — **App Store'da ajanların çalışması buna bağlı** (şimdilik karar: CLI'da kal)
- [ ] **Ayarlar ekranı**: onboarding'deki tercihlerin sonradan da düzenlenebildiği yer; tarama aralığı, uyarı eşikleri (21 gün / 5 madde)
- [ ] **i18n (arayüz)**: ana arayüz string'lerini sözlüğe çıkar (onboarding + ajan dili tamam)
- [ ] Örnek evren + rehberli turun onboarding'e bağlanması

## Faz 2 — Dağıtım Altyapısı (~1 hafta)
- [x] Apple Developer Program üyeliği ($99/yıl)
- [x] **Notarization**: `build.mac.notarize: true` — `APPLE_ID` / `APPLE_APP_SPECIFIC_PASSWORD` / `APPLE_TEAM_ID` ortam değişkenleriyle çalışır (bkz. RELEASE.md 1b)
- [ ] **Developer ID Application** sertifikasını Anahtar Zinciri'ne yükle → ilk imzalı `npm run dist` (RELEASE.md 1a)
- [ ] **Auto-update**: electron-updater + GitHub Releases (private repo yeterli)
- [ ] Crash/hata raporlama: Sentry (opt-in)
- [ ] Universal build doğrulaması (Intel Mac'te test)

## Faz 3 — Satış (~1-2 hafta)
- [ ] Landing page (ürün adı kararı: "Project Galaxy" ticari marka taraması!)
- [ ] Lisanslama + ödeme: **Paddle** veya **LemonSqueezy** (KDV/vergiyi onlar yönetir; TR satıcılar için Paddle pürüzsüz)
- [ ] Lisans anahtarı doğrulama (çevrimdışı-toleranslı)
- [ ] Fiyatlandırma önerisi: tek seferlik $29-49 veya $5/ay; 14 gün deneme
- [ ] Gizlilik politikası + KVKK/GDPR metni (veri lokalde kalıyor — güçlü satış argümanı!)
- [ ] Beta programı: 10-20 geliştiriciye TestFlight benzeri dağıtım (DMG + geri bildirim formu)

## Faz 4 — Mac App Store
- [x] App Sandbox uyumu: security-scoped bookmarks ile klasör erişimi (onboarding klasör seçiciden), `entitlements.mas.plist` + inherit hazır
- [x] mas hedefi: `npm run dist:mas` (.pkg üretir) — Team ID + provisioning profile gerekli (RELEASE.md 2c-2d)
- [x] Sandbox'ta çalışmayan özellikler (ajanlar, CLAUDE/BASH konsolları, Terminal açma) MAS sürümünde açıklayıcı mesajla kapatılıyor
- [ ] **Ajanları App Store'da da çalıştırmak için**: Claude API (BYOK) modu (Faz 1'deki madde) — tamamlanana dek MAS sürümü "harita + panolar + DB" ürünü olarak gider
- [ ] App Store Connect kaydı + ekran görüntüleri + App Review süreci (RELEASE.md 2b, 2f)

## Riskler / Kararlar
| Konu | Karar önerisi |
|------|---------------|
| İsim | "Project Galaxy" jenerik — marka taraması yap, alternatif hazırla |
| Claude bağımlılığı | API moduyla "kendi anahtarını getir" (BYOK) — maliyet kullanıcıda, sen altyapı satmıyorsun |
| Electron boyutu (~200MB) | Kabul edilebilir; Tauri'ye geçiş v3 konusu |
| DB sürücüleri | pg/mysql2/sql.js saf JS — imzalama sorunu yok ✓ |

## Komutlar
```bash
npm run make-app   # kişisel kullanım paketi (mevcut akış)
npm run dist       # ürün DMG'si (arm64 + x64; Developer ID sertifikası varsa imzalı + notarize)
npm run dist:mas   # Mac App Store .pkg'si (Team ID + provisioning profile ister — RELEASE.md)
```
