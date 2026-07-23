# Uzak Sunucu Evrenleri (SSH) — tasarım ve durum

Hedef: bir uzak sunucuyu **yerel evrenle tam eşit** bir evren olarak eklemek —
gezegenler haritada çıkar, dosyalar okunur/yazılır, git panelleri çalışır,
konsol ve ajanlar o sunucuda çalışır.

Kimlik doğrulama **tamamen sistemin `ssh`'ına** bırakılmıştır: mevcut anahtarların ve
`~/.ssh/config` Host takma adların kullanılır. **Uygulama hiçbir parola saklamaz.**

---

## Temel kararlar

| Karar | Gerekçe |
|-------|---------|
| Kimlik: yalnızca anahtar + `~/.ssh/config` | Parola saklamamak en güvenlisi; kullanıcının kurulu düzeni zaten çalışır. |
| `BatchMode=yes` | Parola sorulacak bir durumda komut **asılı kalmaz**, temiz hata döner. |
| `ControlMaster=auto` + `ControlPersist=90` | Bağlantı yeniden kullanılır. Ölçüldü: ilk el sıkışmadan sonra çağrılar **~7 ms**. Tam eşitliği mümkün kılan şey budur — yoksa her dosya okuması saniyeler sürerdi. |
| `StrictHostKeyChecking=accept-new` | İlk bağlantı sorunsuz, ama **değişen** sunucu anahtarı yine reddedilir (MITM koruması korunur). |
| Tarama tek `ssh` çağrısında | Uzakta çalışan tek bir sh betiği tüm projeleri satır satır döker; N proje için N round-trip yok. |
| MAS sürümünde kapalı | Sandbox dış süreç çalıştıramaz — ajanlar/BASH ile aynı sınır. |

---

## Tamamlanan (faz 1 — temel) ✅

`main.js` içinde, gerçek bir uzak sunucuya karşı doğrulandı:

| IPC | İş |
|-----|-----|
| `galaxy:sshConfigHosts` | `~/.ssh/config`'teki Host takma adlarını (HostName/User/Port ile) okur — sunucu eklerken seçici için |
| `galaxy:sshList` / `sshSave` / `sshDelete` | Sunucu kayıtları (`data.servers`); parola alanı **yok** |
| `galaxy:sshTest` | Bağlanır ve künye döner: OS, mimari, hostname, kullanıcı, uzak `git` ve `docker` sürümü |
| `galaxy:sshScan` | Tanımlı köklerin altındaki projeleri tarar: ad, yol, git mi, **dal**, son commit zamanı, son değişiklik, README adı |

Yardımcılar: `sshExec` (execFile, kabuk yok), `sshBaseArgs`, `sshTarget`,
`sshFriendly` (ham ssh hatalarını Türkçe açıklamaya çevirir).

**Doğrulama** (Docker'da ayağa kaldırılan gerçek sshd + 3 örnek proje):

```
✓ sshTest → os=Linux arch=aarch64 user=galaxy git="git version 2.54.0"
✓ ikinci çağrı 7ms (multiplexing çalışıyor)
✓ sshScan 3 proje buldu · api(git, develop, README.md) · web(git, master) · notlar(git değil)
✓ kimlik hatası / kapalı port / geçersiz host → hepsi anlaşılır mesaj
```

> Test ortamını yeniden kurmak için:
> ```bash
> docker run -d --name galaxy-ssh-test -p 2222:2222 \
>   -e PUBLIC_KEY="$(cat ~/.ssh/id_ed25519.pub)" -e USER_NAME=galaxy \
>   linuxserver/openssh-server:latest
> ```
> İşin bitince `docker rm -f galaxy-ssh-test` ile kaldır — dışarıya açık sshd bırakma.

### Gerçek sunucu testi — 10.6.2.214 (22 Tem 2026)

Kullanıcının verdiği sunucuya karşı doğrulandı. **İki yapısal bulgu çıktı:**

**1) Sunucu Windows.** `mugo@10.6.2.214` → Windows 10 (19045), `DESKTOP-1JKEO6O`,
varsayılan kabuk `cmd.exe`, PowerShell 5.1, git 2.51.2, **Docker 29.1.3 kurulu**.
POSIX tarama betiği burada hiç çalışmaz. Çözüldü:

- `sshProbe()` → önce POSIX dener, `uname` boş dönerse PowerShell koluna geçer;
  bulunan tür sunucu kaydına `kind: 'posix' | 'windows'` olarak yazılır.
- `REMOTE_SCAN_WIN` → PowerShell karşılığı, **aynı `P|…` satır formatını** üretir,
  böylece ayrıştırıcı tek kalır.
- `psCommand()` → ssh → cmd.exe → powershell zincirinde tırnak kaçışı güvenilmez;
  komut **UTF-16LE base64** ile `-EncodedCommand` olarak gönderilir. Bu şart, kaçış hilesi değil.

Doğrulanan çıktı (gerçek `D:\` içeriği):
```
✓ sshProbe → kind=windows arch=AMD64 host=DESKTOP-1JKEO6O user=mugo
✓ git="git version 2.51.2.windows.1" powershell=5.1.19041.6456 docker="29.1.3"
✓ sshScan(windows) 5 proje · yollar D:\… biçiminde · mtime/staleDays doğru
✓ git deposu testi: isGit=1, branch=develop, README.md algılandı
```

**2) Sunucuda anahtar girişi kurulu değil — yalnızca parola kabul ediyor.**
Seçilen "yalnızca anahtar" modeli (`BatchMode=yes`) bu sunucuya **bağlanamaz**.
Karar bekliyor:

| Seçenek | Etki |
|---------|------|
| **A. Anahtarı kur** (`ssh-copy-id mugo@10.6.2.214`, parola bir kez elle girilir) | Tasarım korunur, uygulama hiçbir parola saklamaz. **Önerilen.** |
| **B. Parola desteği ekle** | `safeStorage` ile şifreli saklama + parola sürücüsü gerekir (`BatchMode` kapanır). Saklanan sır yüzeyi artar; ilk kararın tersine döner. |

> **Karar (22 Tem 2026): Windows geliştirmesi faz 1'de donduruldu.** Algılama (`sshProbe`)
> ve tarama (`REMOTE_SCAN_WIN`) çalışır durumda kalıyor — bir Windows sunucu eklenirse
> gezegenleri haritada görünür. Faz 3–4 (dosya/git/kabuk) **yalnızca POSIX** için geliştiriliyor.

---

## Tamamlanan (faz 2 — harita) ✅

- `scanProjects()` uzak evrenleri **önbellekten** birleştirir; gezegen nesnesi yerelle
  birebir aynı şekle sahiptir (`git{branch,lastTs,activity30}`, `staleDays`, `hasReadme`, …),
  bu yüzden derlenmiş arayüz uzak gezegeni ayırt etmez.
- Yol ad alanı **`ssh://<serverId>/mutlak/yol`**; `isRemotePath` / `parseRemote` yardımcıları,
  `knownPaths` uzak yolları da içerir (güvenlik kontrolü korunur).
- `galaxy:load` artık async: önbellek soğuksa ilk taramayı bekler, doluysa arka planda
  tazeleyip eldeki veriyle **hemen** döner (stale-while-revalidate, TTL 60 sn).
  Sunucu çevrimdışıysa son bilinen gezegenler kalır, evren `subtitle`'ı "çevrimdışı" olur.

## Tamamlanan (faz 3 — okuma) ✅

| Handler | Uzak davranış |
|---------|----------------|
| `galaxy:readme` | `README.md` (yoksa ilk `.md`), 60 KB'a kadar |
| `galaxy:list` | tek seviye listeleme; gizli dosyalar/`node_modules` elenir, dizinler önce |
| `galaxy:file` | metin dosyaları (≤ **2 MB**); görsel/PDF/video → "uzaktan görüntülenemiyor" |
| `galaxy:tree` | `find -maxdepth 3` → iç içe ağaç |
| `galaxy:gitLog` | dal, tüm dallar, son 40 commit, `status --porcelain` — **yerelle aynı şekil** |
| `galaxy:openFolder` | uzak yolda Finder açmayı reddeder (anlaşılır hata) |

Güvenlik: tüm yollar `shq()` ile tek tırnak kaçışından geçer; `safeRel()` `..` ile kökün
dışına çıkmayı engeller (test edildi).

**Doğrulama** (gerçek Linux sunucu, 3 proje):
```
✓ faz2 tarama: 3 proje · act30 okundu · yol ssh://s1/projects/api
✓ gezegen şekli: {"branch":"develop","lastTs":"…","activity30":1}
✓ readme README.md · list [📁src,📄README.md,📄wip.txt] · .git gizlendi
✓ file src/index.js → "console.log(1)"
✓ tree: src/ → index.js (iç içe)
✓ gitLog: dal=develop dallar=[develop,master] commit=1 dirty=1
✓ safeRel("../../etc/passwd") reddedildi
```

> Bonus: `gitLog` çıktısı yerelle aynı şekilde olduğu için **GİT MERKEZİ → TAKIM AKIŞI**
> paneli uzak projelerde de çalışır — dal önerisi, MR şablonu, adım adım akış dahil.

## Tamamlanan (faz 2.5 — arayüz) ✅

**🖧 SUNUCULAR** düğmesi üst bara eklendi (Docker'ın yanına); ⌘K'da "Sunucu Merkezi".
Panel Docker Merkezi ile aynı dilde:

- Sunucu listesi (durum ışığı + OS rozeti: ⊡ POSIX / ⊞ Windows / ● çevrimdışı)
- Ekle/düzenle formu: **iki mod** — manuel adres (host/user/port/anahtar seçici) veya
  **~/.ssh/config takma adı** (açılır liste). Anahtarlar `~/.ssh`'tan otomatik listelenir.
- Taranacak **kök klasörler** (her biri bir evren olur), satır satır eklenir
- **BAĞLANTIYI TEST ET** → uzak künye (OS, mimari, hostname, git, docker)
- **KAYDET** → arka planda tarar, gezegenler haritaya düşer
- Her satırda: test · tara/yenile · düzenle · sil

Doğrulama (gerçek IPC bağlı headless UI testi, 18 kontrol):
```
✓ üst bar düğmesi · boş durum · form (manuel+alias) · anahtar seçici
✓ kök ekleme sırasında girilen değerler korunuyor (collectForm)
✓ bağlantı testi künye gösteriyor · kaydet → listeye dönüş · POSIX rozeti
```

### 🐞 Yol boyunca bulunan gerçek bug (düzeltildi)

`autoDetectLocalDbs()` açılışta `loadData()` yapıp yerel DB portlarını yoklarken ~sn bekliyor;
o pencerede eklenen **her şeyi** (sunucu, todo, ayar) eski kopyanın `saveData`'sı **siliyordu**
(stale read-modify-write yarışı). Bu, açılıştan hemen sonra sunucu ekleyen kullanıcının
sunucusunu kaybetmesi demekti. Düzeltme: yazmadan önce **taze `loadData()`**, yalnızca
`dbs`/`dbAutoAdded` alanları birleştiriliyor. SSH'a özel değil — mevcut ve genel bir bug'dı.

## Kalan iş

### Faz 3b — Yazma eşitliği
- `galaxy:save`, `syncReadme`, ✎ GÜNLÜK → uzağa atomik yazım
  (`cat > dosya.tmp && mv` kalıbı), ardından önbelleği geçersizle.
- Çakışma kontrolü: yazmadan önce uzak `mtime` karşılaştırması.

### Faz 4 — Çalıştırma eşitliği
- **Uzak BASH konsolu:** `shellStart` uzak sunucuda `ssh -tt` ile kalıcı kabuk açar;
  mevcut `shell:out` akış protokolü aynen kullanılır.
- **Ajanlar:** iki seçenek — (a) `claude` uzakta kuruluysa orada çalıştır,
  (b) dosyaları yerele akıtıp yerel `claude` ile çalıştır. (a) tercih edilir, yoksa (b)'ye düş.
- **Docker paneli uzak moda:** aynı `docker` komutları `ssh <sunucu> docker …` ile;
  panelde sunucu seçici (YEREL / <sunucu adı>).

### Açık sorular
- Uzak projede otomatik "sessiz commit" davranışı istenir mi? (yerelde var)
- ~~Uzaktan okuma boyut sınırı~~ → **2 MB** olarak uygulandı; ikili dosyalar okunmuyor.
- ~~Bağlantı koptuğunda görünüm~~ → **son bilinen gezegenler kalır**, evren "çevrimdışı"
  etiketi alır. Haritada ayrıca soluklaştırma istenir mi?
- Uzak sunucu eklemek için arayüz nerede olsun — ⚙ Ayarlar mı, HUD'da ayrı bir "SUNUCULAR"
  paneli mi? (Docker Merkezi gibi bir panel olabilir.)
