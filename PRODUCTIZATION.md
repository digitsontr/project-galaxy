# Project Galaxy — Ürünleştirme Yol Haritası

Hedef: kişisel araçtan, satılabilir bir macOS ürününe. Önerilen rota: **Developer ID ile doğrudan dağıtım** (notarized DMG). Mac App Store, sandbox kısıtları nedeniyle Faz 4'e ertelendi.

---

## Faz 0 — Hazır Olanlar ✓
- [x] Çalışan Electron uygulaması (paketlenebilir .app)
- [x] electron-builder yapılandırması (`npm run dist` → arm64 + x64 DMG, şimdilik imzasız)
- [x] Mimari algılama (Intel/Apple Silicon)
- [x] Hardened runtime entitlements dosyası (build/entitlements.plist)
- [x] Veri güvenliği: safeStorage parola şifreleme, günlük yedek, otomatik git
- [x] Uygulama içi yardım (onboarding slaytlarının temeli)

## Faz 1 — Genelleştirme (en kritik iş, ~1-2 hafta)
- [ ] **Sabit yolları kaldır**: `~/Desktop/PAPILON` varsayımı yerine ilk açılışta "evren klasörünü seç" onboarding'i; veri dosyası `~/Library/Application Support/ProjectGalaxy/` altına taşınır
- [ ] **Claude CLI → Claude API geçişi (opsiyonlu)**: kullanıcı ya kendi Claude Code kurulumunu ya da API anahtarını kullanır (Ayarlar ekranı; anahtar safeStorage'da). Ajanlar API modunda `fetch` ile Messages API'ye gider — CLI bağımlılığı ürün için opsiyonel hale gelir
- [ ] **Ayarlar ekranı**: dil (TR/EN), tema yoğunluğu, tarama aralığı, uyarı eşikleri (21 gün / 5 madde)
- [ ] **i18n**: string'leri sözlüğe çıkar; İngilizce çeviri
- [ ] İlk çalıştırma deneyimi: örnek evren + rehberli tur (mevcut ? slaytları onboarding'e bağlanır)

## Faz 2 — Dağıtım Altyapısı (~1 hafta)
- [ ] Apple Developer Program üyeliği ($99/yıl)
- [ ] **Developer ID Application** sertifikası → `package.json > build.mac.identity` doldur
- [ ] **Notarization**: electron-builder `notarize` ayarı (Apple ID + app-specific password) — ilk imzalı DMG
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

## Faz 4 — Mac App Store (opsiyonel, sonra)
- [ ] App Sandbox uyumu: security-scoped bookmarks ile klasör erişimi
- [ ] CLI çağrılarını tamamen API'ye taşı (sandbox'ta süreç başlatma kısıtlı)
- [ ] Global kısayol yerine MAS-uyumlu alternatif
- [ ] mas hedefi (electron-builder `mas` target) + App Review süreci

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
npm run dist       # ürün DMG'si (arm64 + x64; sertifika girilince imzalı)
```
