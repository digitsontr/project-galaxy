<p align="center">
  <img src="assets/guide/hero-kapak.jpg" alt="Project Galaxy — Klasörleri yaşayan bir evrene dönüştürün" width="900">
</p>

<h1 align="center">Project Galaxy</h1>
<p align="center"><b>Bilgisayarındaki projeleri bir evren olarak gez, yapay zekâ ajanlarınla yönet, tek pencereden geliştir.</b><br>
macOS · Windows · Electron · Claude Code · v2.3.13</p>

---

## İçindekiler

- [Bu uygulama ne işe yarar?](#bu-uygulama-ne-i̇şe-yarar)
- [Kurulum (hiç bilmeyenler için)](#kurulum-hiç-bilmeyenler-için)
- [Terminoloji — galaksi · yıldız sistemi · gezegen](#terminoloji--galaksi--yıldız-sistemi--gezegen)
- [Arayüz turu](#arayüz-turu)
  - [Üst bar & navigasyon](#üst-bar--navigasyon)
  - [Kadet / Komutan](#kadet--komutan)
  - [İstasyon Araçları (saat · takvim · hesap · hızlı ara)](#i̇stasyon-araçları)
  - [Uzay modu — galaksi haritası](#uzay-modu--galaksi-haritası)
  - [Gezegen modu — projenin içi](#gezegen-modu--projenin-i̇çi)
  - [Konsol — kalıcı bash + Claude oturumları](#konsol--kalıcı-bash--claude-oturumları)
  - [🔮 Galaxy Asistanı — dijital ikizin](#-galaxy-asistanı--dijital-ikizin)
  - [GİT — canlı panel + Git Merkezi](#gi̇t--canlı-panel--git-merkezi)
- [Sekmeler](#sekmeler)
  - [PANO (Kanban)](#-pano--kanban)
  - [DB (Veritabanı gezgini)](#-db--veritabanı-gezgini)
  - [DOCKER](#-docker)
  - [ZAMANLAYICI](#-zamanlayıcı)
  - [SUNUCULAR (Uzak / SSH)](#-sunucular--uzak--ssh)
- [Yapay zekâ ajanların](#yapay-zekâ-ajanların)
- [Ayarlar](#ayarlar)
- [Kısayollar](#kısayollar)
- [Verilerim güvende mi?](#verilerim-güvende-mi)
- [Sık sorulanlar](#sık-sorulanlar)
- [Klasör yapısı & mimari](#klasör-yapısı--mimari-meraklısına)
- [Yol haritası — global ürün (yapılacaklar)](#yol-haritası--global-ürün-yapılacaklar)
- [Sürüm notları — bu sürümde neler değişti](#sürüm-notları--bu-sürümde-neler-değişti)

---

## Bu uygulama ne işe yarar?

<p align="center"><img src="assets/guide/eski-yeni.jpg" alt="Dağınık klasörlerden otonom seyir defterine" width="900"></p>

Diskinde onlarca proje klasörü var: kimi yarım, kimi bitmiş, kiminde ne kaldığını hatırlamıyorsun bile. Project Galaxy bu klasörleri **yaşayan bir evrene** çevirir ve üstüne günlük geliştirme için ihtiyacın olan araçları (terminal, Claude, git, DB, Docker, uzak sunucu, zamanlayıcı) **tek pencerede** toplar:

- Her git deposu bir **gezegen** olur — rengi durumunu, halkası ilerlemesini, konumu son aktivitesini gösterir.
- Gezegene "inersin": solda **Ağaç**, ortada dosya önizlemesi (isteğe bağlı **Yörünge**), sağda daraltılabilir README, altta **projeye özel, kalıcı** bir terminal (bash + Claude).
- **5 kişisel AI ajanın** (CTO, PM, Dokümantasyoncu, Kod Denetçisi, Koç) projelerinin gerçek durumunu görerek rapor verir, README yazar, hesap sorar.
- Notların, todo'ların, günlüğün — hepsi projelere bağlanır ve README dosyalarına **senin onayınla** işlenir.
- Verilerin hiçbir sunucuya gitmez — her şey diskinde, git + yedeklerle güvende.

---

## Kurulum (hiç bilmeyenler için)

**Gerekenler:** macOS 12+ veya Windows 10+ ve ~10 dakika.

**Adım 1 — Node.js *veya* Bun kur** (uygulamanın motoru):
[nodejs.org](https://nodejs.org) → "LTS" ile indir. (Alternatif ve daha hızlı: [bun.sh](https://bun.sh). Paketleyici otomatik olarak bun'ı tercih eder.)

**Adım 2 — Claude Code kur** (ajanların ve ⌁ CLAUDE konsolunun beyni):
Terminal'i aç (⌘+Boşluk → "Terminal") ve yapıştır:
```bash
npm install -g @anthropic-ai/claude-code
claude   # ilk çalıştırmada hesabınla giriş yapmanı ister
```

**Adım 3 — Uygulamayı paketle** (tek seferlik):

- **macOS:** `ProjectGalaxy` klasöründeki **`create_app.command`** dosyasına çift tıkla.
  Sistem "tanımlanamayan geliştirici" derse: dosyaya **sağ tık → Aç → Aç**.
  Script bağımlılıkları indirir, arayüzü derler (`newui/build.py`) ve bir üst klasöre **Project Galaxy.app** üretir, ad-hoc imzalayıp karantinayı temizler.
- **Windows:** `npm install` sonra `npm run dist` — NSIS kurucu (`Project-Galaxy-Setup-….exe`) çıkar. Gömülü terminal için [Git for Windows](https://gitforwindows.org) (bash) gerekir. Hazır kurucu GitHub Releases’te de yayınlanır.

> Paketlemeden hızlıca denemek için: macOS’ta **`Başlat.command`**, her iki sistemde `npm start` — uygulamayı doğrudan kaynak koddan açar.

**Adım 4 — Aç ve tanış:**
`Project Galaxy.app`'e çift tıkla (ilk sefer yine sağ tık → Aç gerekebilir). İlk açılışta uygulama seni **bir defalığına tanır**: dil (TR/EN), adın (ajanlar sana ismiyle hitap eder), proje klasörlerin (her biri bir evren) ve 5 ajanının kişiselleştirmesi. Bu ekran bir daha çıkmaz — hepsi sonradan **⚙ Ayarlar**'dan değişir. Dock'ta sağ tık → Seçenekler → **Dock'ta Tut**.

> Güncellemelerde: yalnızca arayüz değiştiyse (`newui/`) kapat-aç yeterli; `main.js` değiştiyse Adım 3'ü bir kez tekrarla.

---

## Terminoloji — galaksi · yıldız sistemi · gezegen

<p align="center"><img src="assets/guide/terminoloji.jpg" alt="Galaksi, Yıldız Sistemi, Gezegen" width="900"></p>

| Kavram | Karşılığı |
|--------|-----------|
| **Galaksi** | Evrenin (çalışma alanının) kendisi — seçtiğin bir kök klasör. |
| **Yıldız sistemi** | Projeleri gruplayan çatı klasör (kendi `.git`'i yok ama içinde git projeleri var). Kendisi gezegen olmaz; içindeki her proje onun gezegeni olur, adı da grup etiketi olur. |
| **Gezegen** | **İçinde `.git` olan** asıl proje klasörü. |

> **Önemli:** Yalnızca **içinde `.git` olan** klasörler gezegen olarak gösterilir. Rastgele/çatı klasörler (indirmeler, geçici klasörler vb.) haritayı ve listeyi kirletmez. `.git`'i olan bir klasör her zaman **tek** gezegendir (monorepo kökü dahil); kendi `.git`'i yok ama alt klasörlerinde git deposu olan → yıldız sistemi.

**Gezegen durumu (renk):** 🔵 aktif · 🟡 beklemede · 🟢 tamamlandı · ⚪ arşiv · 🟣 keşfedilmemiş.

---

## Arayüz turu

<p align="center"><img src="assets/guide/uzay-anatomi.jpg" alt="Uzay modu anatomisi" width="900"></p>
<p align="center"><img src="docs/uzay-modu.png" alt="Uzay modu — gerçek ekran" width="900"></p>

### Üst bar & navigasyon

Soldan sağa:

- **GALAXY** logosu + **durum noktası** (hazır / çalışıyor / hata) · gezegen modundayken **‹** (uzaya dön) düğmesi.
- **Konum breadcrumb'ı** — nerede olduğun her an bellidir: **🌌 Evren › 🪐 Gezegen ▾**. Tıkla → **hızlı geçiş anahtarı** açılır: üstte tüm **evrenler** (aktif olan işaretli), altta o evrenin **gezegenleri** (bulunduğun "buradasın" etiketiyle). Tek tıkla başka evrene/projeye ışınlan.
- **Segmentli sekme çubuğu** — **Özet / Evren / Pano** + **Daha ▾** (DB, Docker, Zaman, SSH). Kadet’te Daha gizlenir.
- **🎓 Kadet / ★ Komutan** — yoğunluk anahtarı (aşağıda).
- **◷ Saat** — canlı saat; tıkla → **İstasyon Araçları**.
- **⌕ Ara (⌘K)** — hızlı komut paleti: proje ara, komut çalıştır.
- **🚀 HUD** — alttaki gösterge panelini aç/kapat.
- **⚙ Ayarlar**.

### Kadet / Komutan

Üst barda iki düğme: **Kadet** (🎓) sadeleştirilmiş acemi modu — gelişmiş sekmeler (DB, Docker, SSH, zamanlayıcı) gizlenir; harita, gezegen, git, pano ve asistan kalır. **Komutan** (★) tam yoğunluk: tüm araçlar. Tercih `localStorage`'da saklanır. İlk kez açan için Kadet önerilir; güç kullanıcı Komutan'da kalır.

### İstasyon Araçları

Üst bardaki **◷ saat** düğmesine tıkla — gün içi araçların tek panelde:

- **Canlı saat + tam tarih** (saniye saniye).
- **Mini takvim** — bugünü vurgular, ‹ › ile ay gezinme, başlığa tıkla → bugüne dön.
- **Hesap makinesi** — klavye + tuş takımı, C / ⌫ / =, güvenli değerlendirme (yalnız sayı/operatör/parantez/%).
- **Hızlı ara** — tüm gezegenlerde ada göre; seçince o gezegene ışınlar.

`Esc` ile kapanır. (⌘K komut paleti proje/komut aramasını sürdürür; İstasyon Araçları ise saat-takvim-hesap-hızlı erişim içindir.)

### Uzay modu — galaksi haritası

- **Galaksi görseli:** fareyle sürükle, tekerlekle yaklaş. WASD/oklar + / − ile de gezinilir.
- **Sol panel — PROJELER:** aktif evrenin gezegenleri, **son aktiviteye göre sıralı** (en taze üstte). Her satır: durum noktası + proje adı + **dal ve son aktivite** (`main · 2g önce`). **Tek tık seçer, inmez;** **j / k** ile listede gez, **Enter** · **İn** · çift tık ile inersin. Evren boşsa **Evren bağla** tek CTA.
- **Sağ istasyon:** 5 AI ajanın avatarları (üzerine gel → görev kartı, tıkla → sohbet).
- **GALAXY HUD (alt):** 🚀 ile aç. Üç kart: **En Aktif Yıldız** (son 30 günde en çok commit alan projen), **Son Yapılanlar** (+ RAPOR arşivi), **Notlarım** (hızlı not ekle). Panel taşarsa iç kısmı kaydırılır; içerik asla kırpılmaz.

### Gezegen modu — projenin içi

<p align="center"><img src="assets/guide/gezegen-anatomi.jpg" alt="Gezegen modu anatomisi" width="900"></p>
<p align="center"><img src="docs/gezegen-modu.png" alt="Gezegen modu — gerçek ekran" width="900"></p>

- **Orta — atölye:** varsayılan **Dosya** görünümü; soldaki ağaçtan tıklanan dosya burada açılır (kod, markdown, resim, PDF, video). **Yörünge** anahtarı eski uydu haritasını geri getirir (klasör = halkalı uydu, dosya = türe göre renk).
- **Sol panel, üç sekme (varsayılan Ağaç):**
  - **Ağaç** — tam dosya ağacı + projede ara (grep).
  - **Kayıt** — durum, ilerleme, plan checklist'i (**tek tıkla** tamam/beklemede), notlar, **odak kronometresi** (süresi Ayarlar'dan), onaylı proje kaldırma, klasörü aç.
  - **Git** — canlı git paneli (aşağıda).
- **Sağ panel:** README; **‹** veya **⌘\\** ile gizlenir, dikey şeritten geri açılır. İçinde ara.
- **Alt konsol:** projeye özel, kalıcı terminal; üst kenarından sürükleyerek yükseklik (en az 240px, hatırlanır).

### Konsol — kalıcı bash + Claude oturumları

Alt kısımda, **başlıklı ayrı bir panel** olarak durur: **▮ TERMİNAL · \<proje\>** + `CLAUDE` / `BASH` sekmeleri + sağda **● oturum sürüyor** (canlı nabız). Giriş alanında **yanıp sönen imleç** komut beklediğini belli eder.

- **⌁ CLAUDE** — "şu bug'ı düzelt" yaz, Enter. Bu projenin klasöründe çalışır; dosya okur/yazar, komut çalıştırır. Oturum `claude --continue` ile sürer (kaldığın yerden devam). Ekran görüntüsü yapıştır (⌘V) ya da dosya sürükle.
- **▮ BASH** — gömülü terminal. `cd` / ortam değişkenleri oturum boyunca korunur, Tab ile tamamlama, ↑↓ komut geçmişi, ⇗ ile gerçek Terminal/iTerm'de aç.

> **Oturumlar projeye özel ve KALICI:** Bir projede komut çalıştırıp başka projeye geçtiğinde önceki oturum kapanmaz. Geri döndüğünde bash çıktın ve Claude sohbetin **kaldığın yerde** durur — her projenin kendi bağımsız oturumu vardır. Konsol tutamağını sürükleyerek yüksekliğini ayarlayabilirsin.

### 🔮 Galaxy Asistanı — dijital ikizin

Ekranın **sağ istasyon** sütununun altında parçacıklı bir **asistan orbu** durur (ajan açıkken küçük nokta). Tıkla → 380px yazışma paneli açılır. Bu bir **dijital ikiz**: robotik bir komut kutusu değil, **insan gibi konuşan** kişisel asistan. Hem sohbet eder hem de projede yaptığın her şeyi **yazarak** yaptırır. Ajan paneli açıkken ikiz kapanır — aynı anda tek sohbet.

- **Yazışarak konuş:** panele yaz, Enter'a bas. Yanıt **token token akar** (hece hece yazılır gibi). Cevaplar panelde kalır; oturum kaldığın yerden sürer.
- **Durum renkleri** — orb yaptığı işe göre renk değiştirir: **cyan** hazır · **mavi** çalışıyor.
- **Tam yetkili** — projede/uygulamada yapabileceğin her şeyi yaptırabilirsin:
  - **Gezinme:** "Core SDK projesine git", "Papilon evrenini aç", "uzaya dön".
  - **Sekme:** "Docker'ı aç", "veritabanını aç", "pano".
  - **Git:** "commit et [mesaj]", "push", "pull", "git durumu".
  - **Terminal:** "terminalde npm test çalıştır" → o projenin bash'inde çalıştırır, çıktıyı gösterir.
  - **Geliştirme + genel bilgi:** "login ekranındaki hatayı düzelt" ya da "bugün Ankara'da hava kaç derece" — kod işini yapar, genel soruları da (web araması dahil, tam izinli) yanıtlar.
- **Kalıcı hafıza:** sohbet geçmişi diske kaydedilir — uygulamayı kapatıp açsan da kaldığın yerden devam eder. Başlıktaki **✎** ile "yeni sohbet" başlatırsın (geçmiş + Claude oturumu sıfırlanır).
- **Kişilik / dijital ikiz:** Ayarlar → "Asistan kişiliği / hakkında" alanına kendini yaz (kim olduğun, tarzın, tercihlerin) → ikiz senin gibi konuşur.
- **Günlük brifing:** her gün ilk açılışta ikiz sana kısa bir durum özeti verir (ne durgun, ne bekliyor, bugün neye odaklan). İstediğinde "brifing" / "durum raporu" yaz.
- "Ne yapabilirsin?" dersen yeteneklerini sayar. `Esc` ile kapanır.

> **Not:** Sesli komut altyapısı (native macOS ses tanıma + “Hey Galaxy” uyandırma + TTS) kodda **hazır** ama arayüzde **kapalı** — asistan yalnız yazışma modunda. Açılınca durum HUD’u (LISTENING / konuşuyor), komutan çubuğu ve aksiyon kanıtı ile birlikte gelecek; bkz. [Yol haritası](#yol-haritası--global-ürün-yapılacaklar).

### GİT — canlı panel + Git Merkezi

Sol paneldeki **⎇ GİT** sekmesi artık pasif bir liste değil, **canlı bir kontrol** paneli:

- **Durum kartı:** hangi daldasın, **ahead/behind** (`↑2 ↓0`), ve "N değişiklik bekliyor / çalışma alanı temiz".
- **Tek birincil CTA:** kirliyse **Commit…** (Git Merkezi durum), temiz+ahead ise **Push**, temiz+behind ise **Pull**, aksi **Güncel**. Push/pull/commit bitince yeşil **kanıt toast’ı** (~4 sn), örn. `main ← 2 commit`. Push öncesi uygulama içi onay kartı.
- **Git Merkezi** ikinci satır, sönük. (Git deposu değilse **git init** tek düğmesi.)

**Git Merkezi** dört sekmeli tam iş tezgahı:

<p align="center"><img src="assets/guide/hud-git-merkezi.jpg" alt="HUD ve Git Merkezi" width="900"></p>

- **DURUM** — dal değiştir/oluştur, dosyaları stage/unstage et, commit mesajı yaz → commit.
- **TAKIM AKIŞI** — senin o andaki gerçek durumuna göre (dal, bekleyen değişiklik, `develop` var mı) yazılan adım adım teslim akışı: gerekiyorsa `git stash` ile işini kaybetmeden feature dalına taşı, `feature/…` adı öner, küçük commit → `push -u` → **MR/PR aç** (kopyalanabilir açıklama şablonu) → rebase + `--force-with-lease` → birleştir + dal temizliği. Her komut kutusu tıklayınca panoya kopyalanır.
- **GEÇMİŞ** — günlere gruplu commit zaman çizelgesi + kim ne kadar katkı yapmış.
- **GIT FLOW REHBERİ** — git'i hiç bilmeyen biri için: şerit diyagramı (main/develop/feature/release/hotfix) + 6 adımda tüm döngü + kopyalanabilir komut sözlüğü (başlangıç, kaydetme, remote, geri alma, inceleme).

---

## Sekmeler

Üst bardaki segmentli çubuktan erişilir. Bir sekmeye geçince ilgili veri **otomatik tazelenir**.

### ▦ PANO — Kanban

Tüm todo'lar üç kolonda: **Bekliyor / Devam / Tamam**. Karttan ▸ GİT ile gezegene in, ⌁ ile Claude aç.

### ⛁ DB — Veritabanı gezgini

Postgres / MySQL / SQLite sunucularını ekle (parolalar macOS `safeStorage` ile şifreli) → sunucudaki tüm veritabanları → tablolar → satırlar. **Satır düzenle / ekle / sil**, **CSV dışa aktar**, **ŞEMA** düğmesiyle foreign key ilişkilerini kart diyagramı olarak çiz. Serbest SQL çalıştır: `SELECT` doğrudan çalışır; yazma işlemleri (INSERT/UPDATE/DELETE) **önce onay** ister ve denetim günlüğüne (🤖 ajan onaylıysa etiketle) yazılır.

### 🐳 DOCKER

- **Konteynerler:** çalışan + durmuş hepsi listelenir; **başlat / durdur / yeniden başlat / kaldır**, **canlı log akışı** ve konteyner içinde **komut çalıştır** (exec). Sekmeye her geçişte liste tazelenir; konteyner yoksa açıkça belirtilir.
- **İmajlar:** listele + sil.
- Motor kapalıysa **▸ Başlat** ile Docker Desktop'ı aç; `prune` ile temizle.

### ⏱ ZAMANLAYICI

"Her sabah 09:00'da ATLAS durum raporu hazırlasın" gibi görevler tanımla (haftalık/günlük, ajan seç). Görev çalışınca **çıktısı ekranda görünür**, rapor arşivine (`reports/`) düşer ve hangi sekmede olursan ol bildirim (toast) çıkar. ▸ ÇALIŞTIR ile elle de tetiklenir.

### 🖧 SUNUCULAR — Uzak / SSH

<p align="center"><img src="assets/guide/gorev-murettebati.jpg" alt="Görev mürettebatı" width="900"></p>

- **Sunucu ekle/düzenle:** ad, host, kullanıcı, port, **anahtar seçici** (`~/.ssh` altındaki gerçek anahtarlar çip olarak listelenir). **Test et** bağlantıyı ve uzak kabuğu (POSIX/Windows) doğrular.
- **Uzak klasör → evren:** sunucudaki bir yolu (ör. `/root`, `/home/kullanıcı/projeler`) yaz → o klasör **uzak evren** olur; içindeki projeler tıpkı yerel gezegenler gibi haritaya çıkar (arka planda taranır, stale-while-revalidate önbellek).
- **Uzak terminal:** sunucuda gömülü terminal — **login kabuk** (`bash -l`) kullanır; böylece uzak `PATH` senin kendi terminalindekiyle aynıdır (docker/node/nvm/brew komutları bulunur).
- ControlMaster multiplexing, `accept-new` host-key politikası, yapılandırılabilir zaman aşımı (Ayarlar).

---

## Yapay zekâ ajanların

<p align="center"><img src="assets/guide/ajan-akisi.jpg" alt="Ajan akışı" width="900"></p>

Sağ üstteki istasyonda dururlar; üzerine gel → görev kartı, tıkla → konuşma paneli. **Uzaydayken tüm evrene, gezegen modundayken sadece o projeye** bakarlar (panelde BAĞLAM çipi).

| Ajan | Rolü | Ona ne dersin |
|------|------|----------------|
| 🔵 **ATLAS** | CTO | "İş evreninin durum raporunu ver", "Risk analizi yap" |
| 🟡 **NAVIGATOR** | PM | "Standup", "İhmal ettiklerim neler?" — rozetinde uyarı sayısı birikir |
| 🟢 **DOCUMENTOR** | Dokümantasyon | "Bu projeye README yaz" — dosya yazabilen tek ajan |
| 🩷 **FORGE** | Kod kalitesi | "Teknik borcu tara" — okur ama asla değiştirmez |
| 🟣 **MENTOR** | Kişisel koç | "Bu hafta için çalışma planı öner" |

⚙ ile adlarını, renklerini, görev tanımlarını, hazır komut düğmelerini düzenle; yeni ajan ekle. Ajanlar `claude -p --output-format stream-json` alt süreci olarak akar.

### Günlük iş akışın (Otonom README döngüsü)

<p align="center"><img src="assets/guide/readme-dongusu.jpg" alt="Otonom README döngüsü" width="900"></p>

**✎ GÜNLÜK:** "login ekranını bitirdim" yaz → uygulama hangi projeyle ilgili olduğunu bulur → **klasör yolunu göstererek onayını ister** → yapılan iş README `## Günlük`e, yapılacak iş `## Yapılacaklar`a ve plana işlenir. README'deki `- [ ]` maddeleri gezegene girince plana aktarılır — çift yönlü senkron. **⌘⇧G** ile uygulama kapalıyken menü çubuğundan hızlı not.

---

## Ayarlar

⚙ (HUD dişlisi / tray / ⌘K) — artık yalnız profil değil, gerçek araç yapılandırması:

| Ayar | Ne işe yarar |
|------|--------------|
| **Ad / Hitap** | Ajanların sana seslenişi. |
| **Dil** | TR / EN (arayüz + ajan varsayılanları). |
| **İhmal uyarısı (gün)** | Bu süreden eski aktif projeler uyarı üretir. |
| **Plan uyarısı (madde)** | Bekleyen plan maddesi eşiği. |
| **Claude komut yolu** | Boşsa PATH'ten; ya da tam yol (ör. `/opt/homebrew/bin/claude`). Tüm Claude çağrılarına uygulanır. |
| **Terminal uygulaması** | Terminal.app / iTerm — "gerçek terminalde aç" bunu kullanır. |
| **Odak süresi (dk)** | Pomodoro kronometresinin varsayılanı. |
| **SSH zaman aşımı (sn)** | Uzak bağlantı `ConnectTimeout`. |
| **Asistan kişiliği / hakkında** | Dijital ikizine kendini tanıt — senin tarzınla konuşsun. |

Yedeklerden geri dönüş: ⌘K → Yedekler.

---

## Kısayollar

<p align="center"><img src="assets/guide/kisayol-haritasi.jpg" alt="Kısayol haritası" width="900"></p>

| | |
|---|---|
| **F1** / **⌘/** | Seyir Rehberi (görselli tanıtım + kullanım) |
| **⌘K** | Hızlı komut: proje ara, Git Merkezi, ayarlar, yedekler |
| **◷ (üst bar)** | İstasyon Araçları: saat · takvim · hesap · hızlı ara |
| **🌌 breadcrumb** | Konum switcher: evren/gezegen değiştir |
| **j / k** | Uzayda gezegen listesinde seç (**Enter** = in) · palette **↑↓** |
| **ESC** | Katman katman geri (araçlar → switcher → paneller → uzay) |
| **Enter** | Gönder/çalıştır · **Shift+Enter** yeni satır · **⌘Enter** commit |
| **⌘⇧G** | Her yerden hızlı not |
| **⌘\\** | Gezegende README gizle / göster |
| **Çift tık** | Haritada gezegene in |
| **Tek tık** | Plan maddesi tamam / beklemede |
| **↑ ↓** | Bash komut geçmişi · **Tab** tamamlama · **⌫** üst klasör |
| **WASD / oklar, + / −, ⌂** | Uzayda gezinme |

---

## Verilerim güvende mi?

<p align="center"><img src="assets/guide/mimari-guvenlik.jpg" alt="Mimari güvenlik ve performans" width="900"></p>

- **Kodun ve notların diskinde:** tek veri dosyası `galaxy-data.json`, konum macOS’ta `~/Library/Application Support/ProjectGalaxy/`, Windows’ta `%APPDATA%\ProjectGalaxy\`. Uygulama kendi bulutunu işletmez; yedek `backups/` altında yereldir.
- **Model çağrıları dışarı çıkar:** ajanlar ve dijital ikiz Claude Code CLI üzerinden çalışır (sohbet, web araması, dosya/terminal). “Hiçbir paket internete gitmez” iddiası yok — dürüst söz: **senin repoların yerelde kalır, dil modeli senin Claude hesabınla konuşur.**
- Her gün otomatik yedek (`backups/`, 14 gün) + her değişiklikte sessiz **git commit** — `git log` ile zaman yolculuğu.
- Gezegen kaldırma uygulama içi onay kartıyla **galaksiden gizler**; klasör diskte kalır (Gizlenenler’den geri alınır). Eski native üç seçenekli diyalog (`projectDelete`) hâlâ IPC’de durur ama arayüz gizlemeyi kullanır.
- DB parolaları `safeStorage` ile şifrelenir; DB yazma işlemleri onaylı ve denetim günlüğüne yazılır.
- SSH anahtarların uygulamaya kopyalanmaz — `~/.ssh` altındakiler doğrudan kullanılır; verilen anahtar dosyası yoksa ssh-agent'a düşülür.

---

## Sık sorulanlar

**Uygulama açılmıyor / "Apple could not verify…" diyor.** İmzasız (ad-hoc) derleme olduğu için macOS engelliyor — normaldir. **Move to Trash deme, Done de.** Sonra Terminal'de karantinayı temizle (tek seferlik):
```bash
xattr -cr /Applications/"Project Galaxy.app"    # ya da ~/Downloads/"Project Galaxy.app"
```
Terminal istemezsen: **Sistem Ayarları → Gizlilik ve Güvenlik** → aşağıda *"engellendi"* → **Yine de Aç**. (macOS 15'te eski "sağ tık → Aç" çalışmaz.) Ayrıca `node -v` / `bun -v` ile motorun kurulu olduğunu doğrula.

**Ajanlar / ⌁ CLAUDE "claude bulunamadı" diyor.** Kurulum Adım 2'yi yap; `claude` yazıp giriş yaptığından emin ol. Gerekirse **Ayarlar → Claude komut yolu**'na tam yolu gir.

**Yeni eklediğim klasör görünmüyor.** İçinde `.git` var mı? Yalnız git depoları gezegen olur. 60 sn bekle ya da pencereye tıkla (odaklanınca tarar).

**Sol listede eskiden gördüğüm klasörler kayboldu.** Kasıtlı: artık yalnız `.git` içeren gerçek projeler gösteriliyor. Bir klasörü göstermek istiyorsan içinde `git init` çalıştır.

**Docker konteynerlerim listelenmiyor.** DOCKER sekmesine geç (açılışta tazelenir) ya da **⟳ Yenile**'ye bas. Gerçekten konteyner yoksa panel bunu açıkça yazar. Motor kapalıysa **▸ Başlat**.

**Uzak sunucuya bağlanamıyorum / komutlar bulunamıyor.** Sunucu **Test et** ile doğrulanıyor mu? Uzak terminal login kabuk kullanır; yine de eksik komut olursa sunucudaki `~/.bash_profile` PATH'ini kontrol et. Anahtar alanına **host adı değil, `~/.ssh` altındaki gerçek anahtar dosyası** yazılmalı (çipe tıkla).

**Terminalde önceki oturumum kayboluyor mu?** Hayır — oturumlar projeye özel ve kalıcıdır. Projeler arası geçince kaldığın yerden devam edersin.

**vim/top gömülü terminalde çalışmıyor.** Doğru — o bir komut yürütücü; tam ekran programlar için ⇗ ile gerçek Terminal'i aç.

**Onboarding'i tekrar görmek istiyorum.** `galaxy-data.json` içindeki `"profile"` bölümünü sil, uygulamayı yeniden aç.

**App Store sürümüyle DMG sürümü arasındaki fark ne?** App Store (MAS) sürümü Apple sandbox'ı içinde çalışır: ajanlar, ⌁ CLAUDE, ▮ BASH, Docker ve SSH orada devre dışıdır; harita, gezegen modu, git panelleri, todo/pano ve DB görüntüleyici çalışır. Tüm özellikler için DMG (doğrudan indirilen) sürümü kullan. Ayrıntı: `docs/RELEASE.md`.

---

## Klasör yapısı & mimari (meraklısına)

```
ProjectGalaxy/                       (kod)
├── main.js                          # Electron ana süreç — tarama, git, ajanlar, DB, Docker, SSH, zamanlayıcı (106 IPC handler)
├── preload.js                       # Güvenli köprü (window.galaxy.*)
├── newui/                           # GERÇEK ARAYÜZ (uygulamanın yüklediği)
│   ├── preview-sample.html          #   şablon (dc template sözdizimi)
│   ├── component.js                 #   arayüz mantığı (class Component extends DCLogic)
│   ├── build.py                     #   derleyici → newui/index.html
│   └── index.html                   #   derlenmiş çıktı (elle düzenleme; build.py üretir)
├── onboarding.html                  # İlk açılış + Ayarlar penceresi (?mode=settings)
├── galaxy-hud.js                    # Eski HUD katmanı (geçmiş sürüm)
├── assets/guide/                    # Tanıtım infografikleri + mürettebat portreleri
├── docs/                            # Görseller + DEPLOYMENT.md / RELEASE.md / REMOTE-SSH.md
├── build/                           # ikon, tray, entitlements (DMG + MAS)
├── Başlat.command                   # paketlemeden çalıştır
└── create_app.command               # kişisel paketleyici (bun/node otomatik, ad-hoc imza)

~/Library/Application Support/ProjectGalaxy/   (veri — koddan ayrı yaşar)
├── galaxy-data.json                 # TÜM verin — tek kaynak
└── backups/  reports/  attachments/
```

**Teknik notlar:** Arayüz proprietary `dc-runtime` bileşen çatısıyla yazılır; `newui/build.py`, `preview-sample.html` + `component.js`'ten `index.html` üretir. Galaksi arka planı WebGL (three.js) ile ayrı katmanda çizilir, bu yüzden arayüz yeniden render'ları 3D'yi etkilemez. Git bilgisi süreç başlatmadan `.git` dosyalarından okunur; ahead/behind `git rev-list` ile hesaplanır. Yerel/uzak kabuklar `SHELL_SENTINEL` ile komut bitişini yakalar; konsol çıktısı ve oturumları **proje bazlı** tutulur (`_consoles[pid]`, `_claudeSess[pid]`). DB sürücüleri saf JS (pg/mysql2/sql.js). Native ses tanıma `native/galaxy-stt.swift` (yalnız macOS). Windows gömülü terminal Git-Bash ister. Dağıtım: macOS DMG/zip (Developer ID + notarize), Windows NSIS, MAS sandbox kısıtlı.

---

## Yol haritası — global ürün (yapılacaklar)

Hedef: kişisel araçtan, bir geliştiricinin klonlayıp yıldızlayacağı **yerel komuta OS’u**. Referans incelenen Apex (sesli JARVIS, Gmail döngüsü, takvim aksiyonu) **iş CRM’i değil** — oradan mekanik alınır, Galaxy’nin gezegen metaforu korunur.

### Konum — neyiz, ne değiliz

| Al | Bırak |
|----|--------|
| Sesle uyanan ikiz, LISTENING HUD, Chat \| Voice | Sales / Marketing / Instagram / Meta Ads |
| “Yaptım”ın ekranda kanıtı (takvim bloğu, toast, aktivite) | Gelen kutusu yöneticisi olmak |
| Döngü: Tetik → Tara → İş → İncele → Öğren → Bildir | Jenerik “AI OS” kimliği |
| Gmail = brifing / stale uyarı / ajan çıktısı | Kişisel hayatın tamamını yönetmek |
| Takvim = odak bloğu (“bu gezegene 2 saat”) | Ajanda uygulaması olmak |
| 5 geliştirici ajanı + araç + KPI | Yeni iş departmanı ajanları |

### Faz 0 — güven ve ilk izlenim

- [x] README sürüm / platform / Kadet-Komutan / dürüst Claude sınırı (bu belge)
- [ ] İngilizce README + 60 sn demo (uzay, ikiz, git, döngü)
- [ ] Boş evren turu: `git init` ile ilk gezegen, örnek ajan sorusu
- [x] Ölü katman temizliği (`galaxy-hud.js`, kök `index.html` kaldırıldı; gömülü demo `PROJECTS` main.js split'iyle zaten gitmişti)

### Faz 1 — sesli ikiz (demo’nun wow’u)

- [x] STT açıldı: mic/wake HUD (`#ga-mic`, `#ga-wake`), native+`webkitSpeechRecognition`, “Hey Galaxy” uyandırma, Voice On/TR-EN metinleri arayüzde
- [x] Orb, Evren sekmesi + uzay modundayken galaksinin tam merkezine taşındı (bir "güneş" gibi); diğer sekmelerde İSTASYON rayında kalıyor
- [x] Komutan çubuğu tek kapı: ⌘K'da eşleşme olsun olmasın "🔮 Galaxy'ye sor: '...'" seçeneği var, Enter asistanı doğrudan açıp soruyu iletiyor (interim transcript hâlâ yok)
- [ ] Tehlikeli işte netleştir (hangi gezegen, commit mi push mı) — Apex’in slayt öncesi 3 sorusu
- [ ] Aksiyon kanıtı: toast var (git/posta akışlarında) ama ayrı bir Aktivite şeridi (`CREATE_COMMIT`, `OPEN_PLANET`) + geri al yok

### Faz 2 — geliştirici döngüleri

Apex WORKSPACE: Trigger → Gather → Work (model, short/long memory, araçlar) → Review → Learn → Notify. Gmail’de “Apex emails me”; “Waiting for my remarks.”

- [x] Döngü tuvali temel akışı var: Tetik · Tara · İş · İncele · Bildir adımları arayüzde (`galaxy:loopGet/loopSave`)
- [x] Remarks → uzun bellek: `loopRemarks` diskte kalıcı (çekirdek gerçekler için ayrı tek kaynak henüz yok)
- [ ] ATLAS / NAVIGATOR / DOCUMENTOR / FORGE / MENTOR’a araç + son koşu nabzı; haritada düğüm
- [ ] Sol sağlık şeridi: Claude CLI, GitHub, STT izni, SSH, (sonra) Gmail / Takvim
- [ ] Varsayılan onay kartı; Komutan’da süreli “güvenilir oturum”; `--dangerously-skip-permissions` kalksın

### Faz 3 — dünyaya bağlan (dar Gmail / takvim)

- [~] **Gmail:** Gmail'e özel değil, genel MCP alias sistemi (`galaxy:mcpList/mcpCall`) üzerinden gelen kutusu okuma + gönderme var; döngü çıktısını postayla iletme de var. Sabah brifingi / stale uyarısı hâlâ yalnız uygulama içi bildirim, postaya düşmüyor
- [~] **Takvim:** “bu gezegene kilitle” → olay yarat → **EVENT CREATED** kanıtı çalışıyor, ama tamamen **Galaxy içi** (`d.calEvents`) — EventKit/sistem takvimine yazmıyor (koddaki not: *"takvim odak blokları; EventKit yok"*)
- [ ] **GitHub:** Takım Akışı’ndaki PR şablonunu gerçek `gh pr create` / API’ye bağla; checks oku

### Faz 4 — global paket

- [x] `main.js` → `lib/` + `ipc/` modüllerine bölündü (3300 satırdan ~185 satıra)
- [~] `preview-sample.html` + `component.js` toplamı ~1 MB’den ~500 KB’a indi ama hâlâ büyük
- [ ] Claude API BYOK — CLI’sız Windows ve (ileride) Mac App Store ajanları
- [ ] Arayüz i18n TR/EN (onboarding var, ana UI gömülü)
- [ ] Landing + gizlilik: local-first veri, isteğe bağlı model bulutu
- [ ] `asar: true` + native STT `extraResources`

### Bilinen borç (şimdi, yıldızdan önce)

| Konu | Durum |
|------|--------|
| Asistan `document.body`’ye inline style ile enjekte; v2 tasarım sistemi dışında | Faz 1 ile birleşir |
| Takvim/döngü/posta tamamen yerel — hiçbiri gerçek dış sisteme (EventKit, Gmail gelen kutusu) yazmıyor | Faz 3 |
| i18n yarım; asistan sistem promptu Türkçe sabit | Faz 4 |
| README ile ikiz “tam yetkili”, pratikte onay yok (push/run) | Faz 2 Guard |

Onayına göre ilk sprint: **Faz 1’in üç parçası** (mic HUD + merkez orb + aksiyon kanıtı). Gmail beklemeden demo Apex seviyesine çıkar.

---

## Sürüm notları — bu sürümde neler değişti

**v2.3.13 / 2.3.12** — Windows NSIS kurucu; `build.py` UTF-8 (cp1252 kırılması).
**v2.3.11** — v2 tasarım (Space Grotesk, yuvarlak köşeler); Kadet / Komutan yoğunluk anahtarı.
**v2.3.10** — Developer ID imza + Apple notarization.

**v2.3.9 öne çıkanlar** (temel ürün)

- **Yeni: Otomatik güncelleme** — GitHub Releases'ten sürüm denetimi; yeni sürüm çıkınca üstte "🚀 İndir" bildirimi (tray'den elle de denetlenir).
- **Yeni: İkiz kişiliği + kalıcı hafıza** — Ayarlar'da "hakkında" alanı (ikiz senin tarzınla konuşur) + sohbet geçmişi diske kaydedilir + "yeni sohbet".
- **Yeni: Günlük durum brifingi** — her sabah ikiz tüm projelerini özetler (durgun/bekleyen/odak).
- **Yeni: Regresyon smoke-test** — her paketlemeden önce otomatik boot+akış testi (`npm test`), bozuk sürüm çıkmaz.
- **Yeni: 🔮 Galaxy Asistanı (dijital ikiz)** — sağ istasyonun altındaki parçacık orbuna tıkla; yazışarak projede her şeyi yaptır. Ajan açıkken orb noktaya iner. (Sesli komut altyapısı hazır ama şimdilik kapalı.)
- **Yeni: İstasyon Araçları** — üst bardan canlı saat, mini takvim, hesap makinesi ve gezegen hızlı arama.
- **Yeni: Konum breadcrumb + hızlı geçiş anahtarı** — nerede olduğun net; evren/gezegen değişimi tek tık.
- **Kalıcı, projeye özel konsol oturumları** — bash ve Claude projeler arası geçişte kapanmaz; her projede kaldığın yerden devam. Başlıklı terminal paneli + "oturum sürüyor" göstergesi + yanıp sönen imleç.
- **Yalnız git projeleri gezegen** — `.git`'i olmayan klasörler artık gösterilmez; sol liste "ad + dal + son aktivite" ile anlamlı, son aktiviteye göre sıralı.
- **Zenginleştirilmiş GİT** — canlı durum kartı (ahead/behind), hızlı Commit/Push/Pull, tek Git Merkezi girişi; tekrarlar kaldırıldı.
- **Genişletilmiş Ayarlar** — Claude yolu, terminal uygulaması, odak süresi, SSH zaman aşımı (hepsi bağlı).
- **Docker** — sekme açılınca otomatik tazelenir, durmuş konteynerler de listelenir, boş-durum mesajı.
- **Zamanlayıcı** — görev çıktısı artık arayüzde görünür + bildirim.
- **Uzak SSH** — login kabuk (doğru PATH), evren ekleme akışı sadeleşti.
- **UX/erişilebilirlik** — segmentli navigasyon, HUD kırpılması giderildi, ikincil metin `#9aa3c2`, `j/k` gezegen seçimi, `prefers-reduced-motion`.

## Sürüm çıkarma (otomatik — CI/CD)

Artık elle paketleme yok. GitHub Actions hallediyor:

- **Her push/PR** → `.github/workflows/ci.yml` arayüzü derler + smoke test çalıştırır (bozuk kod erken yakalanır).
- **Yeni sürüm çıkarmak için** tek komut — bir versiyon tag'i push et:
  ```bash
  npm version patch          # package.json sürümünü yükseltir + commit + tag
  git push --follow-tags     # tag'i gönder → CI devreye girer
  ```
  `.github/workflows/release.yml` macOS'ta build + smoke + paketler ve **GitHub Release**'i `Project-Galaxy-full.zip` ekiyle otomatik yayınlar. Arkadaşlarının uygulaması bunu görüp "🚀 İndir" bildirimi gösterir.
- Elle paketleme hâlâ mümkün: `bash scripts/package-mac.sh` (CI ile aynı script) ya da `create_app.command`.

Ek notlar: `docs/DEPLOYMENT.md` · hesap/sertifika ve DMG yolu: `docs/RELEASE.md` · uzak SSH: `docs/REMOTE-SSH.md`.
