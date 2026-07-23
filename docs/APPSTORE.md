# Project Galaxy — App Store Başvuru Paketi

Bu dosya, App Store Connect formlarına **kopyala-yapıştır** hazır içeriktir. Teknik build adımları `RELEASE.md`'de (bölüm 2); burası mağaza vitrini ve inceleme tarafı.

## Senin yapman gereken 6 adım (sırayla)

1. **Team ID'yi yaz:** `build/entitlements.mas.plist` içindeki `TEAM_ID.com.furkan.projectgalaxy` → gerçek Team ID'n (developer.apple.com → Membership).
2. **App ID kaydet:** developer.apple.com → Identifiers → `com.furkan.projectgalaxy` (App Sandbox işaretli).
3. **Sertifikalar:** Xcode → Settings → Accounts → Manage Certificates → **Apple Distribution** + **Mac Installer Distribution**.
4. **Provisioning profile:** developer.apple.com → Profiles → Mac App Store dağıtım profili → indir → `build/embedded.provisionprofile` adıyla koy.
5. **Build + yükle:** `npm install && npm run dist:mas` → çıkan `.pkg`'yi **Transporter** ile yükle.
6. **App Store Connect'te formu doldur:** aşağıdaki metinlerle. Ekran görüntülerini ekle (liste aşağıda) → Submit for Review.

---

## Mağaza metinleri

**Ad:** Project Galaxy
**Alt başlık (30 kr):** Projelerin, bir evren olarak
**Kategori:** Developer Tools · **İkincil:** Productivity
**Fiyat önerisi:** İlk sürümde ücretsiz (kitle + yorum topla; ödemeye sonra geç)

**Açıklama (TR):**

> Diskindeki proje klasörleri bir evrene dönüşür: her proje bir gezegen, çatı klasörler birer yıldız sistemi. Rengi durumunu, halkası ilerlemeyi, parlaklığı git aktivitesini gösterir — ihmal ettiklerin sana sarı ünlemle bakar.
>
> Gezegene in: dosyaların yörüngede döner; kod, markdown, görsel ve PDF'i uygulamadan çıkmadan aç. Sol panelde plan, notlar ve git akışı; sağda README her zaman gözünün önünde.
>
> • Otomatik hiyerarşi — klasörlerini tarar, proje/çatı ayrımını kendi yapar
> • Git zaman çizelgesi + yeni başlayanlar için adım adım Git Flow rehberi
> • Pano (todo), günlük, hızlı not (⌘⇧G) ve ⌘K hızlı arama
> • Veritabanı görüntüleyici: PostgreSQL/MySQL/SQLite, salt-okunur, şema diyagramı
> • Verin yalnızca senin diskinde: günlük yedek + yerel git geçmişi. Bulut yok, hesap yok, telemetri yok.
>
> İlk açılışta seni bir defalığına tanır: dilini, adını, klasörlerini seçersin — gerisi otomatik.

**Açıklama (EN):**

> Your project folders become a universe: every project is a planet, container folders become star systems. Color shows status, the ring shows progress, glow shows git activity — neglected projects stare back with a warning.
>
> Land on a planet: files orbit around it; open code, markdown, images and PDFs without leaving the app. Plans, notes and git flow on the left; the README always in view on the right.
>
> • Automatic hierarchy — scans your folders, tells projects from containers
> • Git timeline plus a step-by-step Git Flow guide for beginners
> • Kanban board, captain's log, quick note (⌘⇧G) and ⌘K quick search
> • Read-only database viewer: PostgreSQL/MySQL/SQLite with schema diagrams
> • Your data stays on your disk: daily backups + local git history. No cloud, no account, no telemetry.

**Anahtar kelimeler (100 kr):**
`proje,yönetim,git,dashboard,developer,kanban,tracker,universe,galaxy,todo,readme,database`

**Sürüm notu (v2.3.0):** İlk App Store sürümü.

## Gizlilik formu ("App Privacy")

- **Data Collection:** "Data Not Collected" — uygulama hiçbir veri toplamaz, hiçbir sunucuya bağlanmaz (kullanıcının kendi eklediği veritabanı sunucuları hariç; onlar da kullanıcının kendi altyapısıdır).
- Gizlilik politikası URL'si zorunlu: bir sayfa gerekir (landing page'e "verileriniz cihazınızda kalır" metni yeterli). Henüz site yoksa GitHub Pages'te tek sayfalık `privacy.html` aç.

## İnceleme notları (App Review Notes alanına)

> The app visualizes the user's local project folders. Folder access is strictly limited to folders the user explicitly picks via the system open dialog (security-scoped bookmarks). Network access is used only for outgoing connections to database servers the user manually configures (host/port/credentials); the app itself has no backend and collects no data. AI-agent features present in the direct-download edition are disabled in this build.

## Ekran görüntüleri (zorunlu: 1280×800 / 1440×900 / 2560×1600 / 2880×1800)

- [ ] Uzay modu — evren geneli (nebula arka planıyla)
- [ ] Gezegen modu — yörüngede dosyalar + README paneli
- [ ] GİT MERKEZİ — Git Flow rehberi sekmesi
- [ ] Pano (todo kolonları)
- [ ] DB görüntüleyici — şema diyagramı
- İpucu: `⌘⇧5` ile pencere görüntüsü al; onboarding'de İngilizce seçip bir set de EN al (mağaza yerelleştirmesi için).

## Bilinen sınırlar (bu build'de bilinçli kapalı)

Sandbox nedeniyle: AI ajanları, ⌁ CLAUDE konsolu, ▮ BASH, Terminal'de açma, otomatik zamanlanmış raporlar. Bunlar reddedilme sebebi değildir; inceleme notunda belirtilmiştir. Ajanların MAS'ta da çalışması için yol haritası: Claude API (BYOK) modu — `PRODUCTIZATION.md` Faz 1.
