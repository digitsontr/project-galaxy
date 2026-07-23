<p align="center">
  <img src="assets/guide/hero-kapak.jpg" alt="Project Galaxy — Klasörleri yaşayan bir evrene dönüştürün" width="900">
</p>

<h1 align="center">Project Galaxy</h1>
<p align="center"><b>Bilgisayarındaki projeleri bir evren olarak gez, yapay zekâ ajanlarınla yönet.</b><br>
macOS · Electron · React · Claude</p>

---

## Bu uygulama ne işe yarar?

<p align="center"><img src="assets/guide/eski-yeni.jpg" alt="Dağınık klasörlerden otonom seyir defterine" width="900"></p>

Diyelim ki diskinde onlarca proje klasörü var: kimi yarım, kimi bitmiş, kiminde ne kaldığını hatırlamıyorsun bile. Project Galaxy bu klasörleri **yaşayan bir evrene** çevirir:

- Her klasör bir **gezegen** olur — rengi durumunu (aktif/beklemede/bitti), halkası ilerlemesini, parlaklığı git aktivitesini gösterir. İhmal ettiklerin sarı ünlemle sana bakar.
- Gezegene "inersin": dosyaların yörüngede döner, README'si yanında, planın solunda, altta Claude'a ve bash'e komut verdiğin konsol.
- **5 kişisel AI ajanın** (CTO, PM, Dokümantasyoncu, Kod Denetçisi, Koç) projelerinin gerçek durumunu görerek rapor verir, README yazar, hesap sorar.
- Notların, todo'ların, günlüğün — hepsi projelere bağlanır ve README dosyalarına **senin onayınla** işlenir.

**Kazanımın:** dağınık klasörler yerine tek bakışta durum; unutulan işlerin bitmesi; dokümantasyonun kendini yazması; ve her şeyin git + yedeklerle güvende olması. Verilerin hiçbir sunucuya gitmez — her şey diskinde.

---

## Kurulum (hiç bilmeyenler için)

**Gerekenler:** macOS ve 10 dakika.

**Adım 1 — Node.js kur** (uygulamanın motoru):
[nodejs.org](https://nodejs.org) adresinden "LTS" düğmesiyle indir, kurulum sihirbazını tamamla.

**Adım 2 — Claude Code kur** (ajanların beyni):
Terminal'i aç (⌘+Boşluk → "Terminal") ve şunu yapıştır:
```bash
npm install -g @anthropic-ai/claude-code
claude   # ilk çalıştırmada hesabınla giriş yapmanı ister
```

**Adım 3 — Uygulamayı paketle** (tek seferlik):
`ProjectGalaxy` klasöründeki **`create_app.command`** dosyasına çift tıkla.
macOS "tanımlanamayan geliştirici" derse: dosyaya **sağ tık → Aç → Aç**.
Script birkaç dakikada bağımlılıkları indirir ve bir üst klasöre **Project Galaxy.app** üretir.

> Paketlemeden hızlıca denemek istersen: **`Başlat.command`** dosyasına çift tıkla — uygulamayı doğrudan kaynak koddan açar.

**Adım 4 — Aç ve tanış:**
`Project Galaxy.app`'e çift tıkla (ilk sefer yine sağ tık → Aç gerekebilir). İlk açılışta uygulama seni **bir defalığına tanır**: dilini seçersin (TR/EN), adını söylersin (ajanlar sana ismiyle hitap eder), proje klasörlerini seçersin (her biri bir evren olur) ve 5 ajanının adlarını/rollerini istersen kişiselleştirirsin. Bu ekran bir daha çıkmaz — hepsi sonradan uygulama içinden değiştirilebilir. Dock'ta sağ tık → Seçenekler → **Dock'ta Tut** ile sabitle.

> Güncellemelerde: yalnızca arayüz değiştiyse uygulamayı kapat-aç yeterli; `main.js` değiştiyse Adım 3'ü bir kez tekrarla.

---

## Terminoloji — üç kavram

<p align="center"><img src="assets/guide/terminoloji.jpg" alt="Galaksi, Yıldız Sistemi, Gezegen" width="900"></p>

**Galaksi** evrenin (çalışma alanının) ta kendisi · **Yıldız sistemi** projeleri gruplayan çatı klasörler · **Gezegen** git/kod barındıran asıl proje klasörleri. Gezegen renkleri durumu söyler: 🔵 aktif · 🟡 beklemede (21+ gün ihmal) · 🟢 tamamlandı · ⚪ arşiv · 🟣 keşfedilmemiş.

---

## İlk 10 dakika — rehberli tur

<p align="center"><img src="assets/guide/uzay-anatomi.jpg" alt="Uzay modu anatomisi" width="900"></p>
<p align="center"><img src="docs/uzay-modu.png" alt="Uzay modu — gerçek ekran" width="900"></p>

1. **Evrenini seç.** Açılışta onboarding'de seçtiğin evrenlerin kartları çıkar. ✎ ile ad/klasör değiştir, **+** ile bilgisayarındaki herhangi bir klasörü yeni evren yap. Hiyerarşi gerçek uzay gibidir ve otomatik kurulur: **evren = galaksi**, kendi başına proje olan klasör (git'i/kodu olan) = **gezegen**, projeleri barındıran çatı klasör (ör. `Projects/`, `Forsico/`) = **yıldız sistemi** — kendisi gezegen olmaz, içindeki her proje o sistemin gezegeni olur ve sistem adı grup/sektör etiketi olarak görünür.
2. **Gezin.** Fareyle sürükle, tekerlekle yaklaş. Soldaki listeden tek tık = projeye uç, çift tık = gezegene in. Sağ alttaki Sektör Haritası'na tıkla = ışınlan.
3. **Renkleri oku.** 🔵 aktif · 🟡 beklemede · 🟢 tamam · ⚪ arşiv · 🟣 keşfedilmemiş (yeni klasör). Sarı **!** = 21+ gündür dokunulmamış aktif proje. Gezegenler arası akan çizgiler = bağladığın ilişkili projeler.
4. **Bilgi kartı.** Gezegene tek tıkla: aşama, ilerleme, git satırı (`⎇ dal · son commit · ▸ GEÇMİŞ`). "Gezegene İn ▸" ile içeri gir.
5. **F1 (ya da ⌘/) — SEYİR REHBERİ.** Bu turun uygulama içi, görselli hali: terminoloji, her ekranın anatomisi, mürettebat, günlük döngü, kısayol haritası ve güvenlik mimarisi tek pencerede. HUD'daki 📖 düğmesi ve ⌘K → "Seyir Rehberi" ile de açılır; her görsele tıklayınca tam boy büyür.
6. **GALAXY HUD.** Ekranın alt ortasındaki 🚀 **HUD** sekmesine tıkla: yukarı ok panelı açar, aşağı ok kapatır (ESC de kapatır). Üç kişisel kart çıkar — **En Aktif Yıldız** (son 30 günde en çok commit alan projen, gezegen görseliyle; KLASÖR ve GEÇMİŞ düğmeleri), **Son Yapılanlar** (günlüğe işlenen son işler + RAPORLAR arşivi), **Notlarım** (hızlı notların; alttaki kutudan Enter'la yenisini ekle). Arka plandaki nebula ve galaksiler de bu katmandan gelir.
7. **⌘K — hızlı komut.** Her yerden aç: proje ara → Enter ile GİT MERKEZİ'ne git, ya da satırdaki KLASÖR / README düğmelerini kullan; "Ayarlar", "Yedekler" ve "Git Flow Rehberi" komutları da buradan.
8. **GİT MERKEZİ.** Gezegen modunda sol paneldeki **⎇ GİT** sekmesinin en üstünde iki düğme durur: GIT FLOW REHBERİ ve GİT MERKEZİ (aynı panele HUD'daki GEÇMİŞ düğmesi ve ⌘K ile de ulaşılır). Dört sekmesi var: **DURUM** (dal, commit'lenmemiş dosyalar Türkçe rozetlerle), **TAKIM AKIŞI** (aşağıda), **GEÇMİŞ** (günlere gruplu commit zaman çizelgesi), **GIT FLOW REHBERİ** (şerit diyagramı + 6 adımda feature/release/hotfix akışı, kopyalanabilir komutlar, iyi commit mesajı kuralları — git'i hiç bilmeyen biri için yazıldı).
9. **⚙ Ayarlar.** HUD'daki dişli, tray menüsü veya ⌘K → adını, dilini ve uyarı eşiklerini (ihmal günü / plan maddesi) değiştir. Yedeklerden geri dönüş de ⌘K → Yedekler'de.

### Gezegenin içi

<p align="center"><img src="assets/guide/gezegen-anatomi.jpg" alt="Gezegen modu anatomisi" width="900"></p>
<p align="center"><img src="docs/gezegen-modu.png" alt="Gezegen modu — gerçek ekran" width="900"></p>

- **Orta:** dosyaların yörüngede. Klasör = halkalı uydu (tıkla → içine dal), dosya = türüne göre renkli (kod mavi, doküman sarı, görsel pembe). Tıklayınca **uygulama içinde** açılır: kod, markdown, resim, PDF, video. Üstte "belgede ara…" kutusu vurgulu arama yapar.
- **Sol panel:** KAYIT (durum, ilerleme, plan checklist'i — çift tıkla düzenle, notlar, odak kronometresi, onaylı proje kaldırma) · AĞAÇ (tam dosya ağacı) · **⎇ GİT** (dallar, commit'lenmemiş değişiklikler, commit zaman çizgisi).
- **Sağ panel:** README her zaman açık, render'lı.
- **Alt konsol, iki sekme:**
  - **⌁ CLAUDE** — "şu bug'ı düzelt" yaz, Enter. Claude'un dokunduğu dosyalar yörüngede amber yanar; ekran görüntüsü **yapıştır** (⌘V) veya dosya **sürükle**, görerek analiz eder.
  - **▮ BASH** — gömülü terminal. `cd`, ortam değişkenleri oturum boyunca korunur; ↑↓ komut geçmişi; ⟲ sıfırla; ⇗ Terminal.app'te aç.

### Ajanların

<p align="center"><img src="assets/guide/gorev-murettebati.jpg" alt="Görev mürettebatı" width="900"></p>
<p align="center"><img src="assets/guide/ajan-akisi.jpg" alt="Ajan akışı" width="900"></p>

Sağ üstteki istasyonda dururlar; üzerine gel → görev kartı, tıkla → konuşma paneli. **Uzaydayken tüm evrene, gezegen modundayken sadece o projeye** bakarlar (panelde BAĞLAM çipi).

| Ajan | Rolü | Ona ne dersin |
|------|------|----------------|
| 🔵 **ATLAS** | CTO | "İş evreninin durum raporunu ver", "Risk analizi yap" |
| 🟡 **NAVIGATOR** | PM | "Standup", "İhmal ettiklerim neler?" — rozetinde uyarı sayısı birikir |
| 🟢 **DOCUMENTOR** | Dokümantasyon | "Bu projeye README yaz" — dosya yazabilen tek ajan |
| 🩷 **FORGE** | Kod kalitesi | "Teknik borcu tara" — okur ama asla değiştirmez |
| 🟣 **MENTOR** | Kişisel koç | "Bu hafta için çalışma planı öner" |

⚙ düğmesiyle adlarını, renklerini, görev tanımlarını ve hazır komut düğmelerini düzenler, yeni ajan eklersin. Ajan listesinde ve görev istasyonunda her ajan kendi mürettebat portresiyle görünür; düzenleme panelinde o ajanın kartı ve iyi bir kişilik metninin nasıl yazılacağı yanında durur.

### Günlük iş akışın

<p align="center"><img src="assets/guide/readme-dongusu.jpg" alt="Otonom README döngüsü" width="900"></p>

- **✎ GÜNLÜK:** "login ekranını bitirdim" yaz → uygulama hangi projeyle ilgili olduğunu bulur → **klasör yolunu göstererek onayını ister** → yapılan iş README `## Günlük`e, yapılacak iş `## Yapılacaklar`a ve plana işlenir. README'deki `- [ ]` maddeleri de gezegene girince plana aktarılır — çift yönlü senkron.
- **▦ PANO:** tüm todo'lar Trello tarzı üç kolonda (Bekliyor / Devam / Tamam). Karttan ▸ GİT ile gezegene in, ⌁ ile Claude aç.
- **⏱ ZAMANLAYICI:** "her sabah 09:00'da ATLAS durum raporu hazırlasın" gibi görevler; çıktılar rapor arşivine düşer, ekranda bildirim çıkar.
- **⌘⇧G:** uygulama kapalıyken bile menü çubuğundan hızlı not.
- **⛁ DB:** veritabanı sunucularını ekle (parolalar Anahtar Zinciri'yle şifreli) → sunucudaki tüm veritabanları → tablolar → satırlar; **ŞEMA** düğmesi tablo ilişkilerini (foreign key) kart diyagramı olarak çizer. Yalnızca okuma — veri bozamazsın.

### Takım çalışması — TAKIM AKIŞI

<p align="center"><img src="assets/guide/hud-git-merkezi.jpg" alt="HUD ve Git Merkezi" width="900"></p>

Bir projede bekleyen değişikliğin varsa iş "commit at"la bitmiyor: o değişikliğin ekibe doğru şekilde teslim edilmesi gerekiyor. **GİT MERKEZİ → TAKIM AKIŞI** sekmesi tam bunu anlatır — üstelik genel geçer değil, **senin o andaki gerçek durumuna göre**:

- Hangi daldasın, kaç bekleyen değişikliğin var, depoda `develop` var mı — hepsi okunur ve akış buna göre yazılır.
- `main`/`develop` gibi korumalı bir dalda değişiklik biriktirdiysen, işini **kaybetmeden** kendi feature dalına taşıyan `git stash` adımıyla başlar.
- Dal adını bekleyen dosyalarından türetip önerir (`feature/…`), sonra sırasıyla: küçük ve anlamlı commit → `push -u` → **MR/PR açma** → inceleme (rebase + `--force-with-lease`) → birleştirme ve dal temizliği.
- **MR/PR açıklama şablonu** hazır durur (ne yapıldı · neden · nasıl test edilir · etki/risk · kontrol listesi) — tıkla, panoya kopyalanır.
- Her komut kutusu tıklandığında panoya kopyalanır; yanında dal adlandırma, commit mesajı kalıbı, MR boyutu ve "asla yapma" kuralları durur.

Git'i hiç bilmiyorsan **GIT FLOW REHBERİ** sekmesi sıfırdan öğretir: şerit diyagramı üzerinde main/develop/feature/release/hotfix ilişkisi ve altı adımda tüm döngü.

---

## Verilerim güvende mi?

<p align="center"><img src="assets/guide/mimari-guvenlik.jpg" alt="Mimari güvenlik ve performans" width="900"></p>

- Her şey diskinde: tek veri dosyası `galaxy-data.json`, konumu `~/Library/Application Support/ProjectGalaxy/`. Hiçbir bulut yok. (Eski sürümden geliyorsan verin ilk açılışta otomatik oraya taşınır.)
- Her gün otomatik yedek (aynı klasördeki `backups/`, 14 gün) + her değişiklikte sessiz **git commit** — `git log` ile zaman yolculuğu.
- Proje silme iki aşamalı onaylıdır ve en kötü ihtimalle macOS Çöp Kutusu'na gider; kalıcı silme yoktur.
- DB parolaları macOS `safeStorage` ile şifrelenir; DB tarafında yalnızca `SELECT` çalışır.

## Sık sorulanlar

**Uygulama açılmıyor.** İlk açılışta sağ tık → Aç (Gatekeeper). Hâlâ olmuyorsa Node.js kurulu mu kontrol et: Terminal'de `node -v`.

**Ajanlar "claude bulunamadı" diyor.** Adım 2'yi yap; sonra `claude` yazıp giriş yaptığından emin ol.

**Yeni eklediğim klasör görünmüyor.** 60 saniye bekle ya da pencereye tıkla (odaklanınca tarar). Uzay modundayken görünür.

**Bir şeyi yanlışlıkla değiştirdim.** `~/Library/Application Support/ProjectGalaxy/backups/` klasöründen dünkü `galaxy-data-*.json`'u geri kopyala veya aynı klasörde `git checkout <hash> -- galaxy-data.json`.

**vim/top gömülü terminalde çalışmıyor.** Doğru — o bir komut yürütücü, tam ekran programlar için ⇗ ile gerçek Terminal'i aç.

**Onboarding'i tekrar görmek istiyorum.** `~/Library/Application Support/ProjectGalaxy/galaxy-data.json` içindeki `"profile"` bölümünü sil, uygulamayı yeniden aç.

**App Store sürümüyle DMG sürümü arasındaki fark ne?** App Store sürümü Apple'ın sandbox kuralları içinde çalışır: ajanlar, ⌁ CLAUDE konsolu ve ▮ BASH orada devre dışıdır; evren haritası, gezegen modu, git panelleri, todo/pano ve DB görüntüleyici tam çalışır. Tüm özellikler için doğrudan indirilen (DMG) sürümü kullan. Ayrıntı: `docs/RELEASE.md`.

## Klasör yapısı & mimari (meraklısına)

```
ProjectGalaxy/                       (kod)
├── main.js                          # Electron ana süreç — tarama, git, ajanlar, DB, zamanlayıcı (55+ IPC)
├── preload.js                       # Güvenli köprü (window.galaxy.*)
├── index.html                       # Derlenmiş React arayüzü (kaynaktan üretilir; sondaki HUD satırına dokunma)
├── galaxy-hud.js                    # HUD katmanı: nebula arka planı, kişisel kartlar, SEYİR REHBERİ, GİT MERKEZİ
├── assets/guide/                    # Tanıtım infografikleri + mürettebat portreleri (rehber ekranları buradan besleniyor)
├── onboarding.html                  # İlk açılış: kullanıcıyı tanıma ekranı
├── docs/                            # Görseller + DEPLOYMENT.md (sürüm çıkarma runbook'u) + RELEASE.md
├── build/                           # ikon, tray, entitlements (DMG + MAS)
├── Başlat.command                   # paketlemeden çalıştır (npm start)
└── create_app.command               # kişisel paketleyici (mimarini otomatik algılar)

~/Library/Application Support/ProjectGalaxy/   (veri — koddan ayrı yaşar)
├── galaxy-data.json                 # TÜM verin — tek kaynak (galaxy-data.js: arayüz tohumu)
└── backups/  reports/  attachments/
```

Teknik notlar: Canvas 2D sahne (sprite önbelleği + katman-başına-tek-path yıldızlar sayesinde 60fps), ajanlar `claude -p --output-format stream-json` alt süreci olarak akar, git bilgisi süreç başlatmadan `.git` dosyalarından okunur, DB sürücüleri saf JS (pg/mysql2/sql.js). App Store sürümü sandbox içinde security-scoped bookmark'larla klasör erişimi kurar. Ürünleştirme yol haritası: `PRODUCTIZATION.md` · **sürüm çıkarma runbook'u: `docs/DEPLOYMENT.md`** · hesap/sertifika kurulumu ve DMG yolu: `docs/RELEASE.md`.

## Kısayollar

<p align="center"><img src="assets/guide/kisayol-haritasi.jpg" alt="Kısayol haritası" width="900"></p>

| | |
|---|---|
| **F1** ya da **⌘/** | Seyir Rehberi (görselli tanıtım + kullanım) |
| **⌘K** | hızlı komut: proje ara, Git Merkezi, Takım Akışı, rehber |
| **ESC** | katman katman geri | 
| **Enter** | gönder/çalıştır (her konsol ve ajan kutusunda) · **Shift+Enter** yeni satır |
| **⌘⇧G** | her yerden hızlı not |
| **Çift tık** | gezegene in · plan maddesi düzenle |
| **↑↓** | bash komut geçmişi · **⌫** üst klasör |
| **WASD/oklar, +/−, ⌂** | uzayda gezinme |
