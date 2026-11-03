# Project Galaxy — Özellik Kataloğu

**Ürün:** Project Galaxy  
**Sürüm:** 2.3.13  
**Platform:** macOS (ana), Windows  
**Kategori:** Geliştirici aracı · üretkenlik  
**Bu belge:** Uygulamada **bugün gerçekten olan** her özellik. Pazarlama, mağaza metni ve satış konuşması için kaynak.

---

## 1. Ürün vaadi (tek bakışta)

Diskindeki proje klasörleri dağınık bir arşiv değil, **yaşayan bir evren** olur.

Her git deposu bir **gezegen**. Çatı klasör bir **yıldız sistemi**. Çalışma alanın bir **evren**. Rengi durumu, halkası ilerlemeyi, parlaklığı son aktiviteyi gösterir. Gezegene inersin: dosya, README, git, terminal, Claude, veritabanı, Docker — hepsi **tek pencerede**.

Üstünde **Kaptan** durur: yazarak veya sesle “Kaptan, Docker’ı aç” dersen açar. Beş uzman ajan (CTO, PM, dokümantasyon, kod kalitesi, koç) evrenine bakıp rapor verir.

Galaxy bir bulut hesabı değildir. **Senin bilgisayarın, senin klasörlerin, senin Claude oturumun.** GitHub jetonu ve Gmail şifresi buraya yapıştırılmaz.

**Bir cümle:**  
*Klasörlerini bir evrene çevir; Kaptan’la yönet; IDE’ye ancak kod yazacağın an geç.*

**Kısa alt başlık (mağaza, 30 karakter):**  
`Projelerin, bir evren olarak`

---

## 2. Kimin için

- Birden fazla projeyi aynı anda taşıyan yazılım geliştiricisi
- Git’i bilen ama “hangi klasörde ne kalmıştı?” diyen kişi
- Claude Code kullanan, ajanlarını bir kokpitte görmek isteyen kişi
- Yerel Postgres / Docker / uzak sunucu ile çalışan kişi
- Verisini bir SaaS’e yüklemek istemeyen kişi

**Kimin için değil:** Sıfır teknik bilgi. Galaxy bir kod editörü değil; Cursor / VS Code’u **Editörde Aç** ile çağırır.

---

## 3. Temel dil (pazarlamada bu kelimeleri kullan)

| Galaxy dili | Gerçek karşılığı |
|-------------|------------------|
| **Evren** | Seçtiğin kök klasör (ör. `~/Projects`) veya uzak SSH kökü |
| **Yıldız sistemi** | Evren kökü altındaki çatı klasör (eklenen projeleri gruplar) |
| **Gezegen** | Asıl proje — kural: evrene sen eklersin (yol yazarak, klasör seçerek ya da bulunan depolardan) |
| **Kaptan** | Dijital ikiz asistan. Yazılır, seslenilir, uygulama içi iş yapar |
| **Mürettebat** | 5 uzman AI ajan (ATLAS, NAVIGATOR, DOCUMENTOR, FORGE, MENTOR) |
| **Özet** | Bugünün masası — kaldığın yer, kirli git, ihmal, PR, compose |
| **İnmek** | Gezegene girmek (atölye: ağaç, dosya, git, terminal) |
| **Uzay** | Evren haritası ve listeler |

**Gezegen rengi:** mavi aktif · sarı beklemede · yeşil tamam · gri arşiv · mor henüz keşfedilmemiş.

---

## 4. İlk açılış (İlk Kalkış)

Uygulama bir kez sorar, bir daha sormaz. Sonradan her şey **sol alt Ayarlar**’dan değişir.

1. **Dil** — Türkçe veya İngilizce (ajanlar + rehber).
2. **İsim** — ajanlar sana bu isimle hitap eder.
3. **Evren kur** — çalışma alanı klasörünü seç. Evren **boş** başlar; projeler uygulamada **＋ Ekle** ile eklenir. App Store sürümünde macOS klasör izni (bookmark) burada alınır.
4. **Mürettebat** — 5 ajanın adı ve rolü; sonra da düzenlenir.
5. **Bağlantılar** — Claude, GitHub, posta, DB, SSH, mikrofon. **Hepsi opsiyonel.** Kalkış için zorunlu değil.
6. **Kalkış** — en az bir evren klasörü yeter.

İlk girişte kısa bir splash görünür; bir daha çıkmaz.

**Pazarlama cümlesi:** *Kurulum 6 ekran. Anahtar yapıştırmazsın. Bağlantılar sonra.*

---

## 5. Ekranın anatomisi

Soldan sağa, yukarıdan aşağıya:

- **Aktivite çubuğu (sol kenar):** klasör, ara, Docker, Git. En altta **yalnız Ayarlar**.
- **Sol ray:** evrenler + o evrenin gezegen listesi (son dokunulan üstte).
- **Üst bar:** CAPTAIN · konum (Evren › Gezegen) · gezegen bağlam şeridi · sekmeler · sistem sağlığı · Asistan · ⌘K.
- **Sahne:** seçili sekme veya gezegen atölyesi.
- **Sağ şerit:** uzman ajanlar (varsayılan kapalı, kenardan açılır).
- **Alt dock:** HUD (🚀) — raporlar, odak, özet kartlar.

**Ana sekmeler:** Özet · Evren · DB · Docker · Pano · **Daha ▾**  
**Daha menüsü:** Zamanlayıcı · Döngü · Sunucular · İstasyon · HUD

---

## 6. Özet — bugünün masası

Geliştiricinin sabah ilk baktığı yer.

**Ne görür**
- Kaldığın gezegen ve son dosya → **kaldığın yerden devam**
- Commit bekleyen kirli git’ler
- 14 gündür sessiz aktif projeler (ihmal)
- Açık Pano görevleri
- Bu gezegenin compose’u durmuş mu
- Açık pull request sayısı
- `.env` örneğe göre eksik anahtarlar (değerler Galaxy’ye kopyalanmaz)
- Migrate / seed var mı (Prisma, Alembic, Rails, Django…)
- Çalışan iş: `localhost` portu dinliyor mu; son test/typecheck kanıtı
- Evren trafik kontrolü (gezegen compose/port)
- Evren kartları (kaç gezegen, kaç sistem, kaç aktif)

Satırlar tıklanır: compose → Docker, kirli → Git, PR → tarayıcı, port → localhost.

**İlk 10 dakika turu** (bir kez, “Anladım” ile kapanır)

1. `git init` — klasör henüz depo değilse
2. İlk gezegene in
3. `.env`’den DB bağla
4. “Kaptan” de

**Kurulum kutusu** — Claude, GitHub, posta, DB, SSH eksikse tek bakışta söyler; gizlenir, sonra tekrar açılır.

**Boş gün:** “Sakin bir gün. Evren seç veya yeni gezegen ekle.” Sahte demo evren **gösterilmez**.

**Pazarlama cümlesi:** *Özet bir gösterge paneli değil, bugün ne yapacağını söyleyen bir masa.*

---

## 7. Evren — harita ve liste

**Sol liste**
- Tek tık: seçer, **inmez**
- Çift tık / **İn** / **Enter**: gezegene iner
- **j / k** ile listede gez
- Satır: ad · dal · “2g önce”
- Evren boşsa tek düğme: **Proje ekle** (evren yoksa **Çalışma alanı oluştur**)
- Başlıktaki **＋ Ekle** / evren kartındaki ＋ → proje ekleme penceresi: satır başına bir yol (`~` olur, kök dışı da olur), **Klasör seç…** (çoklu), **Depoları bul** (3 seviyeye kadar git depoları; işaretle, **Ekle (N)**)

**Harita**
- İzometrik uzay: gezegenler elips yörüngede durur (CSS küreler; dönen 3D galaksi yok)
- Sürükle, tekerlek, WASD / oklar, + / −
- Çift tık in

**Evren işlemleri**
- Yeni evren: yerel klasör veya SSH uzak kök
- Düzenle, kaldır (klasör **diskte kalır**; yalnız galaksiden çıkar)
- Son evren silinemez
- Üst breadcrumb’dan evren/gezegen arası tek tıkla ışınlanma

**Kural (dürüst):** Kendiliğinden gezegen olmaz — yalnız eklediğin klasörler haritada. Kökün altına yeni depo açmak haritayı değiştirmez. Evrenden çıkarmak klasöre dokunmaz; tekrar eklersen not/plan geri gelir. Eski evrenler bir kez taşınır: o an görünenler üye kalır.

---

## 8. Gezegen atölyesi (indikten sonra)

Burası günlük sürücünün kalbi.

### 8.1 Üst bağlam şeridi

Bulunduğun gezegenin nabzı, her an görünür:

- Dal adı → Git Merkezi
- Kirli dosya sayısı → Git
- Bağlı veritabanı veya **DB bağla**
- Compose projesi → Docker
- Açık port (`:3000`) → tarayıcı; kapalıysa Docker log
- `.env` eksikleri
- Uzak gezegense **salt okuma** rozeti

### 8.2 Sol panel — üç sekme

**Ağaç**
- Dosya ağacı (oluştur, sil, yeniden adlandır)
- Projede ara (grep) — **⌘F**
- Tıklanan dosya ortada açılır

**Kayıt**
- Varsayılan: bu gezegenin Pano görevleri
- **README’ye işle** anahtarı (kapalı): Pano CRUD README’ye dokunmaz
- README planı ayrı sekmede (`- [ ]` checklist)
- Notlar, odak kronometresi
- Klasörü Aç · Editörde Aç (Cursor / VS Code) · Kaldır (gizle; diskte kalır)
- İlişkili gezegenler (aynı klasör / aynı compose / aynı paket adı)
- Uzaksa: salt okuma uyarısı

**Git**
- Canlı özet: dal, ahead/behind, kirli sayısı
- Tek ana düğme bağlama göre: Commit… / Push / Pull / Güncel
- Git yoksa: **git init**

### 8.3 Orta — Dosya veya Yörünge

- **Yörünge (varsayılan):** klasörler halkalı uydu, gezegen/dosya adları altta belirgin.
- **Dosya:** kod, markdown, HTML, görsel, PDF, video önizleme. Düzenle → kaydet (yerel).
- Boş: “Soldaki Ağaç’tan bir dosyaya tıkla.”

### 8.4 Sağ — README

Her zaman gözünün önünde. **⌘\\** gizle/göster. İçinde ara. DOCUMENTOR ajanı onayınla `README.md` yazabilir.

### 8.5 Alt — Terminal

Projeye özel, **kalıcı** oturum. Başka gezegene geçince kapanmaz; geri dönünce kaldığın yerdedir.

| Sekme | Ne işe yarar |
|-------|----------------|
| **⌁ CLAUDE** | Claude Code bu klasörde. Dosya okur/yazar, komut çalıştırır. Oturum devam eder. |
| **▮ BASH** | Gömülü kabuk. `cd` ve ortam kalır. Tab tamamlama, ↑/↓ geçmiş. |

- Yüksekliği sürükleyerek ayarla (hatırlanır)
- Üstte **script çipleri:** `package.json` (dev, test, lint…), Makefile, justfile, pyproject, migrate
- Çipe bas → BASH’e yazılır, çalışır
- Tam ekran programlar (vim, top) için gerçek Terminal / iTerm’e kaçış var

**Pazarlama cümlesi:** *Gezegene in = o projenin atölyesi. IDE’ye ancak yazacağın an geçersin.*

---

## 9. Git ve GitHub

Galaxy bir git istemcisidir. PAT yapıştırılmaz.

**Git Merkezi** (sekmeler)

1. **Durum** — stage / unstage, diff, commit (⌘Enter), push, pull, dal, PR  
2. **Issues** — `gh issue list` (PAT yok)  
3. **CI** — `gh run list`  
4. **Takım akışı** — yazar dağılımı  
5. **Geçmiş** — commit zaman çizelgesi  
6. **Git Flow rehberi** — hiç bilmeyen için şerit + kopyalanabilir komutlar  

**Pull request**
- Commit sonrası: “Bu commit için PR açılsın mı?”
- `gh pr create` — GitHub CLI oturumu (`gh auth login`)
- Açık PR’ler listelenir; tıkla tarayıcıda aç
- Galaxy **GitHub kişisel erişim jetonu saklamaz**

**Kanıt:** işlem bitince yeşil toast (`main ← 2 commit`). Push öncesi onay kartı.

---

## 10. Veritabanı (DB)

Üst barda **DB**. Varsayılan bakış: **bu gezegen**. İstersen **Tümü**.

**Bağlantı**
- Postgres, MySQL, SQLite
- Test → Kaydet
- Parola Mac anahtarlığında şifreli (`safeStorage`). Düz metin dosyada durmaz.
- Açılışta bu Mac’te 5432 / 3306 dinliyorsa “Bu Mac — PostgreSQL/MySQL” önerisi (bir kez)

**Gezegenden bağla**
- Klasördeki `.env` / `.env.local` içinden `DATABASE_URL` veya `DB_*` okunur
- **Tüm `.env` Galaxy’ye kopyalanmaz**
- Parola yalnız “bağla” anında okunur, anahtarlığa yazılır

**Tablo tezgâhı**
- Şema, tablolar, hücre düzenle, satır ekle/sil
- Yazma SQL (INSERT / UPDATE / DELETE) **onay ister**
- SELECT serbest; CSV dışa aktar
- Her işlem denetim günlüğüne düşer
- **AI Veritabanı Ajanı:** Türkçe “e-postası olmayan kullanıcıları göster” → SQL üretir, yazmaysa yine onaylar

**Boş durum:** “Nasıl bağlanır” adımları ekranda durur.

---

## 11. Docker

Üst barda **Docker**. Varsayılan: **bu gezegenin compose’u**. İstersen **Tümü**.

**Motor**
- Durum satırı: çalışıyor / durdu / kurulu değil
- Durduysa **Başlat** (Docker Desktop)
- API anahtarı yok; yerel socket

**Konteyner**
- Başlat / durdur / yeniden başlat / kaldır
- Canlı log
- İçinde komut (exec)
- Port çipi → `http://localhost:…`
- Port dinlemiyorsa ilgili loga atlar

**Compose (bu klasörün `compose.yaml` / `docker-compose.yml`)**
- **up** / **down** / **log**
- Özet, durmuş compose’u hatırlatır

**İmajlar:** listele, sil, prune

**Sınır:** App Store (sandbox) sürümünde Docker ve gömülü terminal kapalıdır. Tam özellik doğrudan indirilen (DMG) sürümde.

---

## 12. Pano (Kanban)

Birincil sekme. Üç sütun: **Bekliyor · Devam · Tamam**.

- Enter ile görev ekle (seçili gezegene ve dala yazılır)
- Sürükle-bırak ile sütun değiştir
- Karttaki gezegen adına tıkla → o gezegene in
- README planından **ayrı** durur. Gezegen Kayıt panelinde “README’ye işle” açılırsa CRUD README’ye de yazılır.

---

## 13. Kaptan — dijital ikiz

Üst barda **Asistan**. Karşılama: *dijital ikizin*. Başlık: **Captain**.

Kaptan sohbet botu değil: **uygulamanın içinde iş görür.**

**Nasıl konuşulur**
- Yaz, Enter
- Mic (Voice On) — macOS konuşma tanıma, **sunucuya ses yüklenmez**
- Wake açıkken söyle: **Kaptan** / Captain / “Hey Galaxy”
- ⌘K’de eşleşmeyen her şey Kaptan’a sorulabilir

**Ne yaptırılır (ses ve yazı aynı dil)**
- Evren / gezegen aç, uzaya dön
- Sekme: Özet, DB, Docker, Pano…
- Git: commit, push, pull, durum
- **PR aç**
- Compose up / down
- `.env`’den DB bağla
- `localhost` / port aç
- `npm run dev` / test / script
- Klasör, gerçek terminal, ayarlar, HUD
- Posta brifingi, döngüyü çalıştır

Claude açıksa daha serbest konuşur; yanıtın içindeki gizli komutlar arayüzü hareket ettirir. Claude yoksa yerel komutlar yine çalışır.

**Kalıcı hafıza:** sohbet diske yazılır. Yeni sohbet başlığıyla sıfırlanır.  
**Kimlik:** her gün profildeki isimle hitap eder; katı kural dayatmaz.  
**Kişilik:** Ayarlar → Asistan — kendini yaz, o tarza konuşur.  
**Günlük brifing:** günde bir kez kısa durum.

**Dürüst sınır:** Model çağrıları senin Claude hesabınla dışarı çıkar. Repoların Galaxy bulutuna gitmez.

---

## 14. Mürettebat — 5 uzman ajan

Sağ şerit. Varsayılan kapalı. Ajan avatarına tıklamak **ikinci bir sohbet açmaz** — Kaptan o sesle konuşur. Düzenle Kaptan çipinin yanında.

| Ajan | Rol | Ona ne dersin | Yetki |
|------|-----|---------------|--------|
| **ATLAS** | CTO | Durum raporu, riskler, bu hafta neye odaklan | Okur, raporlar |
| **NAVIGATOR** | PM | Standup, ihmaller, sıradaki somut adım | Okur, takip |
| **DOCUMENTOR** | Dokümantasyon | README yaz, eksikleri tara | Onayınla dosya yazar |
| **FORGE** | Kod kalitesi | Teknik borç, en riskli 3 proje | Okur, **değiştirmez** |
| **MENTOR** | Koç | Haftalık plan, küçük hedef | Öğrenme temposu |

İsim, renk, kişilik, hazır komutlar düzenlenir; yeni ajan eklenir, silinir.

Uzaydayken **tüm evrene**, gezegendeyken **o projeye** bakarlar.

Zamanlayıcı ve Döngü bu ajanları otomatik koşturur.

---

## 15. Zamanlayıcı

**Daha ▾ → Zamanlayıcı**

Örnek: her sabah 09:00 ATLAS durum raporu.

- Günlük veya haftalık, saat, ajan, prompt
- Aç / kapa, şimdi çalıştır, sil (onaylı)
- Uygulama o an kapalıysa açılışta telafi edebilir
- Çıktı **rapor arşivine** düşer; HUD’dan okunur; toast çıkar

Claude yolu gerekir.

---

## 16. Döngü — evren turu

**Daha ▾ → Döngü**

Ne işe yarar: seçili evrendeki gezegenleri tarar, bir ajanı koşturur, sen notunu yazarsın, kısa rapor çıkar. Tek düğme: **Turu başlat**.

Beş adım:

1. **Tetik** — turu başlat (veya Zamanlayıcı)  
2. **Tara** — kirli git, ihmal, açık plan  
3. **İş** — seçili ajanı koştur  
4. **İncele** — sen notunu yazarsın  
5. **Bildir** — toast + Kaptan posta taslağı (MCP varsa gönderir)

Notlar kalır. “Kaptan, döngüyü çalıştır” da aynı işi açar.

---

## 17. Posta

Galaxy bir Gmail uygulaması **değildir**. Gelen kutusu sekmesi yok.

Ayarlar → Posta’da bir **MCP** komutu (ör. Gmail MCP) tanımlanır: Liste / Oku / Gönder araç adları, ortam anahtarları (`GMAIL_CLIENT_ID` …).

Kaptan **posta brifingi / gönder** derse yazma overlay’i açılır (kime, konu, ek, Gönder).

**Galaxy Gmail jetonunu kendi kasasına koymaz**; süreç senin verdiğin MCP komutudur. App Store sürümünde MCP kapalıdır.

---

## 18. Sunucular (SSH) — uzak evren

**Daha ▾ → Sunucular**

1. Sunucu ekle: ad, host, kullanıcı, port  
2. Anahtar: `~/.ssh` çiplerinden seç veya config **Host** takma adı  
3. Test et → Kaydet  
4. Uzak klasör yolu ekle → o kök bir **evren** olur  
5. Tara: içindeki git depoları gezegen olur  
6. Uzak terminal (login kabuk — uzak PATH senin terminalinle aynı olsun diye)

**Parola saklanmaz.** `BatchMode=yes`. ssh-agent veya anahtar dosyası.

Uzak gezegen **salt okunur:** compose, script, `.env` bağlama, Finder/editör yok. Okuma ve tarama var.

---

## 19. Evreni ara

⌘K’de **Evreni ara** veya yazdığın metinle grep. Bilinen yerel gezegenlerde `git grep` / `grep`; sonuç gezegene iner. PAT yok.

---

## 20. İstasyon, HUD, odak, aktivite

**İstasyon** (saat): canlı saat, gezegenlere hızlı ara.

**HUD (🚀):** en aktif yıldız, son yapılanlar, rapor arşivi, notlar. Taşınca kayar, kırpılmaz.

**Odak:** geri sayım (ayarlanan dakika). Palette’ten başlat/durdur.

**Aktivite şeridi:** commit, push, gezegen aç… kalıcı iz. Bazıları geri alınır (ör. gizlenen gezegen).

**Hızlı not (⌘⇧G):** uygulama önde olmasa da menü çubuğundan not; ilgili gezegenin günlüğüne / README’ye onayla işlenebilir.

---

## 21. Komut paleti ve kısayollar

**⌘K** tek kapı: son gezegenler, tüm projeler, komutlar, **evreni ara**. Eşleşme yoksa satır **Kaptan’a sor** olur.

Palette komutları: kaldığın yerden devam, Özet, Pano, DB, Docker, Zamanlayıcı, SSH, odak, Git Flow, yedekler, aktivite, ayarlar, editörde aç.

| Kısayol | İş |
|---------|----|
| **⌘K** | Komut paleti |
| **⌘F** | Projede ara |
| **⌘⇧G** | Hızlı not (tray’den de) |
| **⌘\\** | README gizle/göster |
| **F1** | Rehber |
| **j / k** | Listede gezegen seç |
| **Enter** | İn / çalıştır |
| **Esc** | Katman katman kapat (tam ekrandan **çıkmaz**) |
| **⌘Enter** | Commit / SQL çalıştır |
| **Tab** | Bash tamamlama |
| **↑ ↓** | Komut geçmişi |
| **⌃⌘F** | macOS tam ekran |

---

## 22. Ayarlar (sol alt dişli)

| Bölüm | Ne var |
|-------|--------|
| **Profil** | İsim, dil |
| **Asistan** | Kişilik / hakkında (Kaptan’a context), ses-mikrofon notu |
| **Araçlar** | Claude yolu + Dene, Terminal.app / iTerm, SSH timeout, `gh auth login` rehberi |
| **Posta** | MCP komut, ortam, araç adları, dene |
| **Hakkında** | Sürüm, veri klasörü |

Tema sabittir (Apex). Eski “Kadet / Komutan” anahtarı yoktur — görünüm her zaman tam.

---

## 23. Sistem sağlığı (üst şerit, 4 nokta)

Tek bakışta, tıklanır:

1. Claude CLI  
2. GitHub (`gh` oturumu)  
3. SSH anahtarları (`~/.ssh`)  
4. Ses tanıma  

Eksik olan sarı yazar. Bağlantı yok diye uygulama **açılmaz** — her şey opsiyonel.

---

## 24. Veri, güvenlik, yedek — pazarlamanın en güçlü kısmı

**Nerede durur**  
`~/Library/Application Support/ProjectGalaxy/` (Windows’ta AppData). Tek ana dosya `galaxy-data.json`. Galaxy kendi sunucusuna hesap açmaz, telemetri göndermez.

**Ne saklanır, ne saklanmaz**

| Veri | Durum |
|------|--------|
| Proje yolları, notlar, todo, evrenler | Yerel dosya |
| DB parolası | Mac anahtarlığı, şifreli |
| GitHub PAT | **Saklanmaz** — `gh auth login` |
| Gmail / Claude token | **Yapıştırılmaz** — Claude kendi girişi; posta MCP ortamı senin sürecin |
| SSH parolası | **Saklanmaz** |
| `.env` içeriği | Kopyalanmaz; yalnız bağla anında DB alanları |
| Ses | Cihazda macOS Speech; Galaxy sunucusuna upload yok |

**Yedek**
- Her gün otomatik kopya, 14 gün
- Veri klasöründe sessiz git geçmişi
- ⌘K → Yedekler → tarih seç → geri yükle (önce mevcut hali saklanır, uygulama yeniden açılır)

**Silme**
- Gezegen kaldır = galaksiden **gizle** (geri alınır). Disk silinmez.
- İstenirse Çöp Kutusu (ayrı, onaylı yol)

**Dürüst cümle (kullan, abartma):**  
*Klasörlerin sende kalır. Dil modeli senin Claude hesabınla konuşur. Galaxy bir anahtar kasası değildir.*

Ayrıntılı politika: [`docs/PRIVACY.md`](PRIVACY.md). Windows kurulumu / smoke: [`docs/WINDOWS.md`](WINDOWS.md).

---

## 25. İki sürüm — mağazada ne vaat edilir

| | Doğrudan indirme (DMG / .app) | Mac App Store |
|--|-------------------------------|---------------|
| Harita, gezegen, git, pano, DB görüntüleyici | Var | Var |
| Kaptan, ajanlar, Claude / Bash konsol | Var | Sandbox’ta kapalı |
| Docker, compose, MCP posta | Var | Kapalı |
| SSH uzak evren | Var | Kısıtlı / kapalı |

Mağaza vitrini **ajan satmasın**. Vitrin: evren, gezegen, git, pano, DB. Tam ikiz = doğrudan indirme.

---

## 26. Pazarlama için hazır metinler

### Mağaza açıklaması (TR, kısa)

Diskindeki proje klasörleri bir evrene dönüşür: her git deposu bir gezegen. Rengi durumu, halkası ilerlemeyi gösterir — ihmal ettiklerin Özet’te seni bekler.

Gezegene in: dosya ağacı, README, git, bu klasörün terminali ve Claude oturumu. Üst şeritte dal, kirli dosya, bağlı veritabanı, compose ve localhost portu.

Kaptan yazarak veya “Kaptan” diye seslenerek sekme açar, commit eder, compose kaldırır, `.env`’den veritabanı bağlar. Beş uzman ajan (CTO, PM, dokümantasyon, kod, koç) evrenine bakıp raporlar.

Veritabanı parolası Mac anahtarlığında. GitHub jetonu ve Gmail Galaxy’ye yapıştırılmaz. Verin senin diskinde; günlük yedek var. Hesap yok, telemetri yok.

### Mağaza açıklaması (EN, kısa)

Your folders become a universe: every git repo is a planet. Color is status, the ring is progress — neglected work waits on Today’s desk.

Land on a planet: tree, README, git, a project-local terminal and Claude. The header shows branch, dirty files, bound database, compose and localhost ports.

Captain acts in the app — by text or voice: open tabs, commit, compose up, bind DB from `.env`. Five specialist agents report on the universe.

Database passwords live in the Mac keychain. No GitHub PAT, no Gmail token stored in Galaxy. Data stays on your disk. Daily backups. No account, no telemetry.

### Anahtar kelimeler (örnek)

`proje, git, geliştirici, kanban, docker, veritabanı, asistan, evren, galaxy, readme, terminal, claude`

### Sosyal / tek kare sloganlar

- Klasör değil. Evren.
- Kaptan de. O yapsın.
- IDE’ye ancak yazacağın an geç.
- Jeton yapıştırma. `gh auth login`.
- Bugün masası: kirli git, durmuş compose, açık PR.
- Uzak sunucu salt okunur. Parola yok.
- Beş ajan. Bir kokpit.

### Ekran görüntüsü sırası (vitrin)

1. Özet — bugün masası (sağ ajan rayı kapalı)
2. Evren haritası
3. Gezegen atölyesi — ağaç + dosya + README + terminal çipleri
4. Git Merkezi
5. DB — bu gezegen + tablo
6. Docker — compose up/down
7. Kaptan paneli (DMG vitrini; mağazada opsiyonel)

---

## 27. Özellik haritası (tek sayfa özet)

```
İLK KALKIŞ          dil · isim · evren klasörü · ajanlar · opsiyonel bağlantılar
ÖZET                devam · kirli git · ihmal · PR · compose · .env · migrate · tur
EVREN               harita · liste · evren ekle/sil · breadcrumb
GEZEGEN             ağaç · kayıt · git · dosya/yörünge · README · bash/claude · script
BAĞLAM ŞERİDİ       dal · kirli · DB · compose · port · salt okuma
GIT                 stage · commit · push/pull · dal · PR/issue/CI (gh) · flow rehberi
DB                  pg/mysql/sqlite · .env bağla · şema · hücre · onaylı yazma · AI SQL
DOCKER              konteyner · imaj · log · exec · compose up/down · port
PANO                kanban · gezegene bağlı · README anahtarı
KAPTAN              yazı · ses · wake · uygulama aksiyonları · günlük kimlik
MÜRETTABAT          ATLAS NAVIGATOR DOCUMENTOR FORGE MENTOR (Kaptan sesi)
ZAMAN / DÖNGÜ       ajana saat ver · Turu başlat: Tetik→Tara→İş→İncele→Bildir
POSTA               MCP · Kaptan overlay  (Galaxy kutu değil)
SSH                 anahtarsız parola · uzak evren · salt okuma
ARAMA               evren çapında grep (⌘K)
İSTASYON / HUD      saat · hızlı ara · rapor · aktivite
GÜVENLİK            yerel veri · keychain DB · PAT yok · günlük yedek
```

---

## 28. Geliştirme kokpiti — IDE katmanı (Faz 2)

Galaxy artık sadece proje yöneticisi değil; gezegenin içinde günlük geliştirme işinin kendisi de yapılıyor. Sol panelde yeni **Geliştir** sekmesi: dosya ağacının yanına dördüncü bir sekme olarak.

### 28.1 Terminal (üç oturum tipi + bölme)
- **CLAUDE** — projeye özel, kalıcı Claude Code oturumu.
- **BASH** — kalıcı kabuk (cd/env korunur, Tab tamamlama).
- **>_ TERMİNAL** — gerçek PTY: xterm.js + `script` köprüsüyle gerçek etkileşimli zsh (vim, top, REPL çalışır; ayrıca derlenmiş uzantı gerekmez).
- **◧ böl** — ikinci bağımsız bash oturumu (dev server izlemek için) terminal panelinin içinde.
- Çıktılar **tıklanabilir**: `dosya:satır` satıra zıplar, `localhost` bağlantısı önizlemeyi açar.

### 28.2 Editör (CodeMirror)
- ⌘E düzenle, ⌘S kaydet, otomatik kaydet düğmesi, kaydedilmemiş taslak kurtarma (kapatıp açsan da geri gelir).
- Satır numaraları, 20+ dil renklendirmesi, parantez eşleşme, aktif satır vurgusu.
- 2000 satıra kadar görüntüleme + değişen satırlarda yeşil git işareti; bul/değiştir, satır kaydır, yazı boyutu.
- **F12** tanıma gider (dosya içi, bulamazsa proje genelinde); **Ctrl+Space** tamamlar; **⌘⇧O / § Semboller** fonksiyon-sınıf haritası.
- Sekmeler kalıcıdır; sürükleyerek veya ◂▸ ile sıralanır; **◧** ikinci dosyayı yan panele açar (bölünmüş editör). İmleç ve kaydırma konumu dosya başına hatırlanır.

### 28.3 Bul & Değiştir — proje geneli
- Geliştir sekmesinde regex/büyük-küçük duyarlı arama; sonuç **önizlemeli** (önceki/sonraki satırlarıyla).
- “Tümünü uygula” otomatik yedek alır (`.galaxy-backups/<tarih>`); “↩ geri al” saniyeler içinde eski haline döner.

### 28.4 Test Gezgini
- Vitest/Jest/Pytest testlerini keşfeder, adıyla listeler; **▶** tek testi koşturur.
- Çıktı bash'e akar, başarısızlıklar `dosya:satır` bağlantısıyla **Sorunlar** listesine düşer; sonuç bildirim olarak da gelir.

### 28.5 Dosya geçmişi
- **◷ Geçmiş**: açık dosyanın git zaman çizelgesi (commit, tarih, yazar). Bir sürümü **gör** ya da editöre **geri yükle** (⌘S ile yazarsın).
- Blame özeti (son 2000 satır) panelde görünür.

### 28.6 Tanılama ve Sorunlar
- **▶ Tanıla** `tsc --noEmit` ve `eslint` çalıştırır; terminal/ajan çıktıları arka planda da taranarak hatalar `dosya:satır` olarak toplanır. Tıklayan dosyayı açıp satıra gider.

### 28.7 AI bağlam
- Claude konsolunda **@dosya** yazmak, dosya içeriğini bağlama ekler.
- Editörde seçimle: **Açıkla / Düzelt / Test yaz**. **🤖 Diff incele** açık değişiklikleri Claude'a kod incelemesi yaptırır.
- Prompt kütüphanesi (`.galaxy.json` + hazır şablonlar); proje talimatı her gönderime eklenir. Ajan değişikliklerinde **Kabul/Geri al** şeridi aynen çalışır.

### 28.8 Dev server önizlemesi
- Dinlenen portlar üst barda **▶ localhost:<port>** olarak belirir; tıklayınca gömülü önizleme açılır; portu elle de yazabilirsin.

### 28.9 `.galaxy.json` proje profili ve şablonlar
- Projeye özel: açılış görevleri (gezeneğe girişte arka planda çalışır), talimatlar, promptlar, scriptler.
- Boş klasöre tek tıkla iskelet: **Node / Python / Web / Swift** şablonları.

### 28.10 Arka plan işleri ve bildirimler
- Üst çubuktaki 🔔: her yerden iş başlat (örn. `npm test`); bildirimler burada birikir, test ve iş sonuçları toast ile de düşer. İşleri listeden durdurabilirsin.

### Faz 2 değişiklik günlüğü (2026-10-19)
- Sol panele **Geliştir** sekmesi eklendi (Ağaç / Kayıt / Git / **Geliştir**).
- PTY (`script`+xterm) + Bölünmüş terminal (bash-2) + tıklanabilir çıktılar.
- CodeMirror: sembol haritası, tanıma git (F12), tamamlama (Ctrl+Space); imleç/kaydırma konumu kalıcı.
- Bölünmüş editör (yan panel) + sekme sürükleme/ok düğmeleri.
- Proje geneli Bul & Değiştir: regex, önizleme, yedekli uygula/geri al.
- Test Gezgini: keşif, tek tık çalıştırma, sorunlara akış.
- Dosya geçmişi: zaman çizelgesi, sürüm gör/geri yükle, blame özeti.
- AI bağlam: `@dosya`, seçime özel aksiyonlar, diff inceleme, prompt kütüphanesi, proje talimatı.
- Dev server önizlemesi: port algılama + gömülü açılış.
- `.galaxy.json` profili + 4 iskelet şablonu; açılış görevleri arka planda çalışır.
- Arka plan işleri (jobStart/jobList/jobStop IPC'leri) + Bildirim merkezi (🔔 üst barda).
- Backend: `ipc/devtools.js` genişledi (toplu değiştir, test keşif/koş, tarih/blame, işler, profil/şablon). Arayüz ↔ backend yeni IPC'ler: `grepReplacePreview/Apply/Rollback`, `testDiscover/testRun`, `gitFileHistory/gitBlame/gitShowFile`, `jobStart/jobList/jobStop` + `job:done` olayı, `profileRead/profileWrite/templateCreate`.
- Smoke: 79/79 — yeni 12 Faz 2 kontrolü eklendi (mock-preload stub'ları dahil).
- Dayanıklılık (2026-10-19 genel kontrol sonrası): proje taramaları (`grepReplacePreview`, `testDiscover`) `ipc/scan-worker.js` içinde **worker + 15 sn zaman aşımı** ile çalışıyor — patolojik regex (örn. `(a+)+$`, gerçek repoda test edildi) ve >20.000 karakterlik satırlar ana süreci kilitlemiyor, anlaşılır hata dönüyor. Uygulama kapanışında (`will-quit`) PTY kabukları, dosya izleyiciler ve arka plan işleri (süreç grubuyla, dev server torunları dahil) temizleniyor; durdurulan iş artık `stopped` durumuyla doğru raporlanıyor. Backend mantığı gerçek geçici git reposuyla **24/24** testten geçti.

## 29. Faz 3 — "başka tool gerekmesin" katmanı

Hedef: Galaxy'de kapsama ~%85 → ~%95. Kalan delikler (refactor/debug/çakışma günleri) kapatılıyor:

1. **LSP köprüsü (TS/JS):** projenin kendi `node_modules/typescript`'i `ipc/lang-worker.js` içinde **kalıcı worker** olarak koşar (TypeScript LanguageService). Yazarken canlı tanı (editörde altı çizili + Sorunlar), gerçek tanıma git (F12), referanslar (⇧F12), güvenli yeniden adlandırma (F2), hover tip bilgisi, Ctrl+Space'de tip-duyarlı tamamlama. TS yoksa sessizce eski regex davranışına düşülür.
2. **Çalıştırma profilleri + debug:** `.galaxy.json` `scripts` + `package.json` scriptleri tek listeden ▶ koşulur (env destekli); JS dosyasında **🐛 Debug** Node Inspector (`--inspect`) başlatır, DevTools bağlantısı verir (breakpoint/adımlama Chrome DevTools'ta — gerçek debugger).
3. **Kaydette formatla + lint düzelt:** ⌘S öncesi proje aracıyla (prettier → eslint --fix; py: ruff/black; go: gofmt; rs: rustfmt) biçimlendirir. Ayar: editör çubuğunda `fmt` düğmesi (kalıcı).
4. **GitHub paneli:** Git sekmesinde `gh` üzerinden açık PR'lar + CI durumu; PR'a tıklayınca tarayıcıda açılır; "PR aç" `gh pr create --web` akışına bağlanır.
5. **Git derinliği:** Git sekmesinde dal listesi/değiştirme/yeni dal, stash (at/listele/uygula/bırak), çakışan dosya listesi (tıkla-aç).

### Faz 3 değişiklik günlüğü (2026-10-19)
- **LSP:** yeni `ipc/lang-worker.js` — projenin `node_modules/typescript`'i kalıcı worker'da LanguageService olarak koşar (kök başına en fazla 3 sıcak worker; will-quit'te kapanır). IPC: `langStatus/langRequest` (diag/complete/def/refs/rename/hover). Editörde: yazarken 900ms debounce ile canlı tanı → dalgalı altı çizili işaret + Sorunlar listesi (kaynak: `lsp`); F12 artık önce LSP'ye sorar (bulamazsa eski grep yedeği); ⇧F12 referans paneli; F2 güvenli yeniden adlandırma (önce onay kartı, sonra dosyalara yazar); Ctrl+Space tip-duyarlı tamamlama (LSP yoksa kelime yedeği); hover'da tip imzası. TS olmayan projede sessizce eski davranış.
- **Çalıştır & Debug:** Geliştir sekmesinde **Çalıştır** kartı — `.galaxy.json` scripts + `package.json` scriptleri (`pkgScripts` IPC) tek listede; ▶ arka plan işi (profil `env`'i `jobStart`a iletilir), 🐛 `NODE_OPTIONS=--inspect` ile koşar. Editörde JS dosyasında 🐛 düğmesi `debugStart` ile `node --inspect` başlatır; `debug:ready` olayı DevTools bağlantısını bildirim olarak verir (breakpoint/adımlama Chrome DevTools'ta).
- **Format:** editör çubuğunda `fmt` düğmesi (localStorage `gxFmtOnSave`, kalıcı). ⌘S öncesi `formatFile` IPC: prettier (stdin) → eslint `--fix-dry-run`; py: ruff/black; go: gofmt; rs: rustfmt; swift: swiftformat. Format hatası kaydı engellemez; kullanılan araç toast'ta görünür.
- **GitHub:** Git sekmesinde PR kartı — `ghPrList` (gh CLI, oturum yoksa anlaşılır hata), CI özeti (✓/✕/…), tıklayınca tarayıcıda açılır; "+ PR aç" `gh pr create --web`.
- **Git derinliği:** Git sekmesinde Dallar (çip liste, tıkla-geç, +yeni dal), Stash (at/uygula/pop/sil — pop ve sil onaylı), Çakışmalar kartı (merge çakışan dosyalar, tıkla-aç). IPC: `gitBranches/gitSwitchBranch/gitStashList/gitStashPush/gitStashApply/gitStashDrop/gitConflicts` (hepsi `execGit` argüman dizisiyle, kabuk yok).
- **Düzeltme:** gezegene girişte `sel` henüz oturmamışsa `_onEnterDev` 800ms sonra bir kez tekrar dener; Geliştir sekmesi açılışında da profil+scriptler tazelenir (önceden `.galaxy.json` içeriği ilk girişte boş gelebiliyordu). Yeni panellerdeki boş-durum notları doğru koşula bağlandı.
- **Testler:** backend `/tmp/faz3-test.js` **24/24** (gerçek TS 5.6 ile: tip hatası tanısı, tanıma git, referans, rename, hover, tamamlama; prettier format; pkgScripts; gerçek `--inspect` ws adresi; dallar/stash/çakışma gerçek repoda) + Faz 2 backend **24/24** regresyonsuz + smoke **83/83** (4 yeni Faz 3 kontrolü: `faz3-backend`, `faz3-runprofiles-lsp`, `faz3-github-pr`, `faz3-git-depth`).

## 30. Faz 4 — "Cursor da, Claude Code da, VS Code da gerekmesin"

1. **Yerleşik Ajan Motoru (Claude Code yerine):** yeni `ipc/agent-engine.js`. Anthropic Messages API'ye doğrudan bağlanır (BYOK; anahtar `agent-config.json`'da safeStorage ile şifreli, env `ANTHROPIC_API_KEY` yedekli). Araçlar: `read_file/write_file/edit_file/list_files/grep/run_bash/git_status/git_diff` — hepsi proje köküne kilitli. Yazma/komut araçları **onay kartı** ister (konsolda ✓/✕; Geliştir kartında oto-onay açılabilir). Konsolda yeni **✦ AJAN** sekmesi: akış (kullanıcı/araç/sonuç/onay), durdur, sohbet temizle. `.galaxy.json` talimatı + `@dosya` bağlamı CLI akışındaki gibi eklenir. CLAUDE sekmesi (CLI) isteğe bağlı olarak durur; ajan için artık gerekmez.
2. **Yerleşik Debugger (VS Code yerine):** `dbgStart/dbgBreakpoint/dbgResume/dbgStep/dbgStop` — CDP (WebSocket) üzerinden gerçek Node debugger. Editörde satır numarası solundan breakpoint (kalıcı), durunca satır vurgusu + **Değişkenler** ve **Çağrı zinciri** şeridi; Devam/Adım/İçine/Dışarı kontrolleri. Giriş duraklaması otomatik geçilir; macOS `/private` symlink'i URL regex'inde hesaba katılır.
3. **Quick-fix:** `⌘.` — TS dil sunucusundan kod düzeltmeleri (örn. "Remove unused declaration") panelden tek tıkla uygulanır; Sorunlar listesindeki LSP satırına tıklamak da düzeltme panelini açar.
4. **Çoklu imleç:** `⌘D` sonraki eşleşmeyi de seçer (VS Code alışkanlığı).
5. **Çakışma çözücü:** Git sekmesinde çakışan dosyaya tıklayınca Bizim (HEAD) / Onların (gelen) yan yana; **Bizimkini al / Onlarınkini al / İkisini birleştir / Elle düzenle** — seçim yazılır + `git add` ile stage edilir (`gitConflictVersions/gitResolveConflict`).

### Faz 4 değişiklik günlüğü (2026-10-20)
- Backend: `ipc/agent-engine.js` (yeni, main.js'e kayıtlı) + devtools'a CDP debugger ve çakışma IPC'leri + lang-worker'a `quickfix` türü. Preload/mock: `agent*`, `dbg*`, `gitConflictVersions/Resolve`, `onAgentEvent/onDbgEvent`.
- Testler: ajan motoru sahte Anthropic API ile **11/11** (şifreli anahtar saklama, onay akışı, red yolu, araç döngüsü); Faz 4 backend **10/10** (gerçek süreçte breakpoint'te durma + `a=2 b=3` değişkenleri + adımda `c=5`, quick-fix içerik üretimi, gerçek merge çakışmasında ours/theirs/base + çözüm). Faz 2 **24/24** + Faz 3 **24/24** regresyonsuz; smoke **87/87** (yeni: `faz4-backend`, `faz4-agent-tab`, `faz4-agent-send`, `faz4-agent-card`).
- Dürüst sınırlar: debugger yalnız Node/JS (TS için derlenmiş çıktı); ajan akışı metni tur sonunda basar (token-token streaming yok); Python'da LSP yerine eski sembol/tanı yedeği çalışır; CLI konsolları ve uzman ajanlar (ATLAS vb.) hâlâ `claude` CLI kullanır — yerleşik motor şimdilik proje içi kodlama ajanını kapsar.
- **Maliyet netliği (2026-10-20):** Projede iki Claude yolu var. (1) **CLI/abonelik:** ⌁ CLAUDE konsolu, uzman ajanlar, Kaptan ve artık ✦ AJAN'ın varsayılanı — yerel `claude` CLI, kullanıcının Pro/Max aboneliğiyle çalışır, token ücreti yoktur (hız sınırları geçerli). (2) **API/anahtar:** yalnızca ✦ AJAN'da kullanıcı seçerse (veya CLI yoksa) — token başına ücretli, abonelikten ayrı faturalanır. Bu yüzden AJAN kartına **Motor seçimi** eklendi (`Oto` = CLI varsa abonelik, yoksa API; tespitte 60 sn önbellek, config kaydında tazelenir). CLI modunda oturum `--resume` ile sürer; izinler CLI'ın `acceptEdits` moduna aittir, Galaxy onay kartı bu modda gösterilmez (akışta motor satırı bunu söyler). API motoruna **prompt caching** eklendi: sistem promptu + araç tanımları + konuşma geçmişi `cache_control: ephemeral` ile işaretlenir; tekrarlı bağlam giriş maliyeti ~%90 düşer. Ajan testleri sahte CLI ikiziyle **18/18** (motor seçimi, `--resume`, caching işaretleri payload'da doğrulandı).

## 31. Faz 5 — Bakım turu: "ben olsam böyle yapardım" listesi (2026-10-20)

Özellik değil, bakım: kod tabanının zayıf halkaları tek tek kapatıldı. Her adımda davranış eşdeğerliği kanıtla doğrulandı.

1. **Eval-blob'lar açıldı:** `lib/config.js`, `lib/data.js`, `lib/projects.js`, `ipc/core.js`, `ipc/db-git.js`, `ipc/ai-runtime.js`, `ipc/infra.js` eskiden `Function('g', 'with(g){...}')` içine gömülü tek-satır string'lerdi; artık gövde dosyada düz `with(g){ ... }` bloğu olarak durur (~3.400 satır okunabilir kod). `with(g)` kalıbı bilinçli korundu (çıplak isimler paylaşılan `g`'ye çözülür, `g.X = ...` atamaları modül çıktısıdır); bu yüzden dosya başlarında `'use strict'` yok. **Kanıt:** kayıt fotoğrafı (yüklenen 197 IPC kanalı + `g`'ye atanan anahtarlar + yükleme hataları) açma öncesi/sonrası birebir aynı; backend takımları 24/24 + 24/24 + 10/10 + 20/20 yeşil. Artık bu dosyalarda diff okunur, hata izi gerçek satır numarası verir.
2. **Dev component bölündü:** `newui/component.js` (6.599 satır, tek `class Component`) metinsel dilimlere ayrıldı: `newui/parts/00-cekirdek … 80-pixel.js` (10 dosya; en büyüğü renderVals 1.411 satır). `newui/build.py` parçaları sırayla birleştirir; **üretilen `index.html`'in SHA-256'sı bölme öncesi/sonrası aynı** (bayt-bayt eşdeğer). Düzenleme artık ilgili dilimde yapılır; `test/smoke.js` kontroller için parçaları birleştirip okur.
3. **Gerçek entegrasyon testi:** `test/integration.js` (`npm run test:integration`; düzenli `npm test`'in parçası değil). Sahte sunucu/CLI ikizi yok: gerçek git deposunda dal/stash/çakışma, fikstür projeye npm ile kurulan **gerçek TypeScript 5.9** ile LSP (tanı/tanıma git/rename), gerçek prettier, gerçek `node --inspect` süreci. `GALAXY_IT_CLAUDE=1` verilirse yerleşik ajanın **gerçek Claude CLI** turu da koşar (abonelikten küçük bir tur). Sonuç: **16/16** (CLI kapısı açıkken **18/18**). Ağ yoksa fikstür araçları kurulamaz; LSP/Format bölümü "atlandı" sayılır, test yine yeşil biter.
4. **CLI modunda tur-sonu değişiklik izi:** `acceptEdits` dosyaları sessizce yazdığı için ajan motoru artık CLI turundan önce/sonra `git status` fotoğrafını karşılaştırır (durum + boyut + mtime imzası); değişen dosyalar ✦ AJAN akışına "✏️ Bu turda değişen dosyalar" başlığıyla satır satır düşer, satıra tıklayınca dosya editörde açılır. Ön-onay değil (CLI'ın doğasına sadık), ama gözden kaçan yazma kalmaz. Ajan testleri **20/20** (sahte CLI dosya yazar, `changed` olayı `done`'dan önce gelir); smoke `faz4-agent-send` liste görünümünü de doğrular (mock-preload artık gerçek olay dizisi ateşliyor: metin → changed → done).
5. **Git hijyeni:** çalışma ağacı alan bazlı checkpoint commit'leriyle çapalandı (backend / arayüz / test / doküman). Büyük tanıtım videoları bilinçli olarak commit dışı bırakıldı.

## 32. SQL Server (MSSQL) — .NET projeleri için dördüncü veritabanı tipi (2026-10-20)

DB formu artık **Postgres / MySQL / SQL Server / SQLite**. Tip `mssql` olarak saklanır (eskiden `mysql` değilse her şey `postgres`'e zorlanıyordu — .NET + Docker SQL Server 2022 bu yüzden eklenemiyordu).

- Sürücü: `mssql` npm paketi. Yerel/Docker için `encrypt: false`, `trustServerCertificate: true` (kendinden imzalı sertifika). Parametreler `@p1…` (T-SQL).
- Liste/şema: `sys.databases` (sistem DB'leri hariç), `INFORMATION_SCHEMA.TABLES` (`dbo.Users` biçiminde), PK `INFORMATION_SCHEMA`, FK **`sys.foreign_key_columns`** (SQL Server'da `CONSTRAINT_COLUMN_USAGE` yanlış tarafı verir).
- Satır işlemleri: `SELECT TOP` / `OFFSET…FETCH NEXT` (LIMIT yok), `quoteIdent` köşeli parantez (`[Users]`).
- Otomatik algılama: 1433 açık ve daha önce eklenmemişse "Bu Mac — SQL Server" (`sa`) adayı. Docker eşlemesi `14333` gibi ise formda Port'u elle yaz.
- Testler: gerçek SQL Server 2022 kabına karşı `/tmp/mssql-test.js` **21/21** (kayıt, yanlış parola, şema+FK, TOP 100, parametreli insert/update/delete, onaylı `dbExec`). `npm run test:integration` + `GALAXY_IT_MSSQL=1` + `GX_MSSQL_PASS` ile kalıcı takımda **24/24**. Smoke `mssql-support`.

## 33. Sade sahne — 3 kolon + kenar hover + tek kimlik (2026-10-20)

Ekranda kaybolma / baş ağrısı: aynı bilgi 2-3 yerde, açık overlay'ler proje değişince kalıyor, çubuklar hep açık.

- **Geçmiş overlay bug:** `select` / `enter` / `closePreview` `_history/_blame/_histShow` sıfırlar. Panelde ✕ var; Esc önce geçmişi kapatır (sonra dosyayı).
- **Tek kimlik:** dosya açıkken gezegen kimlik şeridi gizlenir (`showPlanetIdent`); ad/dal/yol sağ bağlamda bir kez durur. Üst çipler sağ ray açıkken tekrarlanmaz.
- **3 kolon:** sol (ağaç/git) + orta (iş) + sağ **bağlam** (`Nerede kaldın` + Dosya/Git/DB/Docker/Geliştir atlamaları). Son durak `_rememberSurface` ile kalır (DB'ye girip çıkınca sağda yazar).
- **Kenar hover:** imleç sol/sağ 16px'e yaklaşınca kapalı ray peek açılır, uzaklaşınca kapanır. Kenardaki ◀▶ düğmesi sabitle/gizle (localStorage).
- **Marka:** görünür "PROJECT GALAXY" → **KAPTAN** (üst bar, splash, rehber, onboarding). macOS izin metinleri uygulama paket adı olduğu için `Project Galaxy` kalır.

## 34. Sakin yüzey — gerçek terminal + tek Git + tek arama (2026-10-20)

İkinci tur sadeleştirme: yanıp sönen yeşil, aynı yere giden Git kapıları, üç arama kutusu, açılmayan PTY.

- **PTY:** macOS `script` pipe üzerinde `tcgetattr` ile ölüyordu (`Operation not supported on socket`). Artık `ipc/pty-host.py` (`pty.spawn`) kabuğa gerçek tty verir; python yoksa kabuk pipe’a düşer.
- **Sakin renk:** sürekli `gxpulse` / `gxhubpulse` / `pulseGlow` ve yeşil `box-shadow` glow’ları kapalı. Sağlık noktaları, dinleme şeridi, Docker/port çipleri statik.
- **Tek Git:** sol **Git** sekmesi tek kapı. Aktivite çubuğu, sağ bağlam, Kaptan komutu oraya gider. Kahraman kartındaki ve Git sekmesindeki **Git Merkezi** düğmeleri kalktı.
- **Tek arama (ağaç):** “içerikte ara” + “dosya adına göre filtrele” birleşti. Yazınca ağaç süzülür; Enter içerikte arar. Global ⌘K paleti durur (komut, dosya değil).
- **Tek kimlik:** sol rayda ad/yol + Klasör/Editör. Ortadaki kahraman kartı kısa: ad, cümle, kaldığın dosya. Üst kimlik şeridi yalnızca Dosya/Yörünge + README.

## 35. Projeleri sen eklersin — otomatik keşif yok (2026-10-25)

Eskiden evren kökünün altındaki her `.git` klasörü kendiliğinden gezegen oluyordu. Artık evren boş başlar; içine ne gireceğine kullanıcı karar verir.

- **Üyelik:** yerel evren `members: [{id, path, bookmark?}]`, uzak kök `members: [uzakYol…]` tutar. Tarama yalnız üyeleri okur; kökün altına yeni depo açmak haritayı değiştirmez.
- **Ekleme penceresi** (sol ray **＋ Ekle**, evren kartı ＋, boş durum düğmesi; yeni evren oluşturunca kendiliğinden açılır): satır başına bir yol (`~` olur), **Klasör seç…** (çoklu, macOS bookmark'lı), **Depoları bul** (verilen klasörün 3 seviye altına kadar git depoları; depo içine inilmez; en çok 300). Reddedilenler gerekçesiyle pencerede kalır: *tam yol gir · bulunamadı · klasör değil · zaten bu alanda*.
- **Kural:** git şart değil; evren kökü dışındaki klasör de eklenebilir. Uzak evrende yalnız son taramanın bulduğu depolar eklenir.
- **Kimlik:** kök altı proje `önek/göreli/yol` (eski kimlikle aynı → not, plan, durum korunur); kök dışı `önek/@klasörAdı`. Grup (yıldız sistemi) = kök altındaki ilk klasör.
- **Çıkarma:** "Evrenden çıkar" üyeliği siler, klasöre ve proje verisine dokunmaz; tekrar eklenince aynı kimlikle geri gelir. Klasör geçici olarak yoksa listede görünmez ama üyelik silinmez.
- **Taşıma:** `members` alanı olmayan eski evren ilk taramada bir kez eski algoritmayla doldurulur (gizlenenler hariç), `expandDirs` kalkar. Kullanıcı güncellemeden sonra aynı projeleri görür.
- **IPC:** `galaxy:projectsAdd`, `galaxy:findRepos`, `galaxy:pickFolders`. Test: `test/universe-members.js` (`npm run test:integration` içinde, macOS + Windows CI) + smoke `addproj-*`.

## 36. Proje hakimiyeti — veri katmanı + tam ekran akış şeması (2026-10-29)

Gezegene inen kullanıcı projenin neye bağlı olduğunu ve içinde işin nasıl aktığını tek bakışta görür.

- **Analiz (`lib/project-map.js`, worker'da):** kod çalıştırılmaz, okunur. Git deposunda `git ls-files` ile `.gitignore`'a saygılı liste kullanılır (build çıktısı, `node_modules` girmez); en çok 1500 kaynak dosya okunur. Testler grafiğe girmez, sayılır. Sonuç 20 sn önbellekte; ↻ ile zorla yenilenir.
  - **Giriş:** `package.json` `main`/`bin`, `start`/`dev`/`serve` script'leri (build adımı atlanır; `electron .`, `next`, `vite`, `nest`, `uvicorn` tanınır), Python `__main__`, Go `func main`, `.listen(PORT)`, HTML `<script src>`.
  - **Modül:** klasör grupları (`src/routes` gibi iki seviye, çok kalabalıksa tek). Kenarlar: JS/TS import/require (`tsconfig` `paths`, `@/` takma adı, `require(path.join(...))`), Python import, Go paket importu.
  - **Çapraz kenar:** Electron `ipcRenderer.invoke` → `ipcMain.handle` sahibi, `window.X` → `contextBridge.exposeInMainWorld('X')` sahibi, ön yüz `fetch/axios('/api/…')` → eşleşen rota (önekle monte edilmiş router dahil).
  - **Rota:** Express/Koa/Fastify/Hono, NestJS dekoratörleri, FastAPI/Flask, Django `urls.py`, Next.js `pages/api`, `app/**/route`, sayfalar.
  - **Veri:** `.env` (`DATABASE_URL`, `DB_*`; şifre dışarı verilmez), compose imajları (postgres/mysql/mongo/redis/mssql), Prisma (`provider` + modeller ve alanlar), sürücü/ORM paketleri, `*.sqlite` dosyaları, migration `CREATE TABLE`. Koddan tablo: SQL (`FROM/JOIN/INTO/UPDATE`), `prisma.x.findMany`, knex, mongoose, SQLAlchemy `__tablename__`, Django modelleri. ORM'ler birincil motora bağlanır.
  - **Dış servis:** SDK paketleri (Stripe, OpenAI, Anthropic, AWS, Firebase, Supabase, GitHub, Slack, Sentry, SMTP…) ve `fetch('https://host')` ile çağrılan hostlar.
- **Gezegen ana ekranı:** **Veri katmanı** kartı (motor, durum: `● bağlı · N tablo` / `.env’de tanımlı · bağlı değil` / `koddan tespit`, bağlantı adresi, compose servisi, erişen dosya sayısı, tablo çipleri → DB sekmesinde tabloyu açar; **Bağla**, **Akışta göster**). Bağlı DB'nin canlı tabloları `dbTables` ile okunur. **Proje haritası** kartı: özet + Giriş/Modül/Veri/Dış servis sayıları + giriş noktaları + tam ekran düğmesi. Ayrıca kimlik şeridinde ve sağ bağlamda **⤢ Akış şeması**.
- **Tam ekran şema:** katmanlı yerleşim (döngüler DFS ile kırılır, sütun içi barycenter); sütunlar GİRİŞ · KATMAN n · VERİ · DIŞ SERVİS. Renk = rol (arayüz, API/IPC, mantık, veri, yapılandırma), çizgi = tür (import düz, IPC kesikli mor, HTTP kesikli mavi, DB sarı, dış servis noktalı pembe), kalınlık = bağlantı sayısı. Tek tık seçer ve komşuları vurgular; çift tık modülün içine iner (dosya düzeyi şema + komşu modüller) ya da dosyayı açar. Sağ panel: dosyalar, rotalar (dosya:satır'a gider), IPC kanalları, tablolar, bağımlı olduğu / onu kullananlar, DB için bağlantı + canlı tablolar + Prisma modelleri. Arama (Enter: düğüm ya da dosya bulur), ⌘/pinch yakınlaştırma, sürükleyerek kaydırma, Sığdır, Esc katman katman çıkar.
- **IPC:** `galaxy:projectMap` (uzak gezegende henüz yok). Test: `test/project-map.js` (Express + Prisma + React + Python worker fixture'ı, worker yolu dahil; `npm run test:integration` içinde) + smoke `flow-*`, `planet-db-card`. `GX_SHOTS=klasör npm test` ekran görüntüsü kaydeder.

---

*Kaynak: çalışan uygulama kodu (v2.3.13). README’deki eski Kadet/Komutan, “Pano Daha’da” ve HUD dişlisi bu belgede yok — ürün onları bıraktı.*
