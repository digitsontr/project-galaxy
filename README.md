# Project Galaxy

Projelerini bir evren olarak gezdiğin, yapay zekâ ajanlarıyla yönettiğin macOS masaüstü uygulaması. PAPILON (iş) ve FY (kişisel) klasörlerindeki her alt klasör otomatik olarak bir "gezegen" olur; durumunu, planını, git geçmişini ve dokümanlarını uygulamanın içinden yönetirsin.

> Electron + React + TypeScript + Canvas 2D. Claude Code CLI ile ajan ve konsol entegrasyonu.

---

## Hızlı Başlangıç

```bash
# Gereksinimler: Node.js (nodejs.org) ve Claude Code (ajanlar için)
npm install -g @anthropic-ai/claude-code

# Gerçek .app paketini üret (bir kez; main.js her değiştiğinde tekrar):
#   ProjectGalaxy/"Gerçek App Oluştur.command" dosyasına çift tıkla
# Sonrasında PAPILON içindeki "Project Galaxy.app" ile aç — Dock'a sabitlenebilir.

# Alternatif (geliştirme modu):
npm install && npm start
```

Arayüz (`index.html`) uygulama paketinin **dışından**, bu klasörden yüklenir — yani UI güncellemeleri için yeniden paketlemek gerekmez; yalnızca `main.js` değişirse paketleme gerekir.

---

## Özellikler

### Evrenler
- Açılışta evren seçim ekranı: **İş Evreni (PAPILON)** ve **Kişisel Evren (FY)**.
- Evren ekle / düzenle / sil (✎ ve ✕, + Yeni Evren): herhangi bir klasörü evren yap; alt klasörleri gezegen olur.
- Klasör değişiklikleri canlı yansır (pencere odaklanınca + 60 sn'de bir tarama).

### Uzay Görünümü
- Gezegenler durum rengiyle çizilir: mavi aktif · sarı beklemede · yeşil tamam · gri arşiv · mor keşfedilmemiş.
- İlerleme halkası, git aktivitesine göre parlaklık/nabız, 21+ gün hareketsiz aktif projelerde **!** rozeti.
- Bağlantılı projeler arasında takımyıldız çizgileri (Genel sekmesinden bağlanır).
- Sol kenarda tıklanabilir proje listesi, README'si olmayanlar ve gizlenenler bölümleri.
- Minimap (Sektör Haritası), +/−/⌂ zoom, arama (Enter ile git), WASD/ok tuşları.
- Tek tık → bilgi kartı; çift tık veya "Gezegene İn" → gezegen modu.

### Gezegen Modu (proje içi)
- Dosyalar yörüngede döner: klasörler halkalı, dosyalar türe göre renkli; isimler hep görünür.
- Tıkla → uygulama içi görüntüleyici (kod, markdown, resim, PDF, video, ses). Klasöre tıkla → içine dal; sağ tık/Backspace → üst klasör; üstte breadcrumb.
- **Sol panel**: KAYIT (durum, ilerleme, plan CRUD — çift tıkla düzenle, notlar, bağlantılar, odak modu, onaylı proje kaldırma) · AĞAÇ (tam dosya ağacı) · **⎇ GİT** (dal, commit akışı, bekleyen değişiklikler).
- **Sağ panel**: README render'lı olarak hep açık.
- **Alt şerit**: Claude konsolu — komut yaz, Enter; Claude'un dokunduğu dosyalar yörüngede amber yanar, iş sonunda "dokunulan dosyalar" özeti düşer. DEVAM ile oturum sürdürme, TERMİNAL ile gerçek terminal.

### Ajanlar (sağ üst istasyon)
| Ajan | Rol | Görev |
|------|-----|-------|
| ATLAS | CTO | Evren geneli durum/risk raporu, haftalık odak |
| NAVIGATOR | PM | Standup, ihmal edilmiş projeler, taahhüt takibi; uyarı rozeti |
| DOCUMENTOR | Doküman | README açığı tespiti ve **README yazma** (tek yazma yetkili ajan) |
| FORGE | Kod Kalite | Teknik borç raporu, hızlı kazanımlar (salt okur) |
| MENTOR | Koç | FY öğrenme projeleri için haftalık plan ve ilerleme |

- Üzerine gel → görev kartı; tıkla → görev istasyonu (hazır komutlar + serbest soru).
- **Bağlam duyarlı**: uzaydayken tüm evrene, gezegen modundayken sadece o projeye bakarlar (panelde BAĞLAM çipi).
- Kişilikler `galaxy-data.json > agents` içinde düzenlenebilir.

### Günlük & Görev Akışı
- **✎ GÜNLÜK**: not yaz → Claude ilgili projeyi bulur → klasör yolu gösterilerek **onayın istenir** → yapılan iş README `## Günlük`e, yapılacak iş `## Yapılacaklar`a (`- [ ]`) ve plana işlenir. Genel TODO listesi de burada.
- **▦ PANO**: Trello tarzı 3 kolon (Bekliyor / Devam / Tamam) — genel todo'lar + tüm plan maddeleri. Karttan ▸ GİT ile gezegene in, ⌁ ile Claude terminali aç.
- **README ↔ plan senkronu**: README'deki `- [ ]` maddeleri gezegene girince plana aktarılır; planda işaretlenen README'de de işaretlenir.
- **Odak modu**: kronometre; bitirince süre README günlüğüne işlenir.
- **⌘⇧G**: uygulama kapalıyken bile menü çubuğundan hızlı not.

### Güvenlik & Veri
- Veri tek dosyada: `galaxy-data.json` (projeler, ajanlar, todo, günlük, gizlenenler).
- **Günlük yedek**: `backups/` (14 gün) + her değişiklikte **otomatik git commit** (30 sn debounce).
- Proje kaldırma iki aşamalı onaylıdır: "Evrenden Gizle" (diske dokunmaz) veya "Çöp Kutusuna Taşı" (geri alınabilir). Kalıcı silme yok.
- Zamanlanmış raporlar (Claude uygulaması üzerinden): sabah raporu (duraklatıldı, istenirse açılır) ve Pazartesi 09:00 haftalık retro → `reports/`.

### Yardım
Üst bardaki **?** düğmesi tüm bu özellikleri görselli 10 slaytta anlatır.

---

## Klasör Yapısı

```
ProjectGalaxy/
├── main.js                 # Electron ana süreç: tarama, git, ajanlar, günlük, IPC (30 kanal)
├── preload.js              # Renderer köprüsü (window.galaxy.*)
├── index.html              # Derlenmiş arayüz (React bundle — elle düzenleme!)
├── galaxy-data.json        # TÜM verin (tek kaynak)
├── galaxy-data.js          # Tarayıcı modu için senkron kopya (otomatik üretilir)
├── backups/                # Günlük veri yedekleri (14 gün)
├── reports/                # Ajan raporları (sabah/retro)
├── build/                  # galaxy.icns (app ikonu), tray.png (menü çubuğu)
├── Gerçek App Oluştur.command  # .app paketleyici (electron-packager, arm64)
├── Başlat.command          # Geliştirme modu başlatıcı
└── index.v2.backup.html    # Önceki (React öncesi) arayüz yedeği
```

## Mimari Notlar

- **Arayüz kaynağı**: React + TS + Tailwind projesi olarak geliştirilir, `web-artifacts-builder` ile tek `index.html`'e paketlenir. `index.html` üretilmiş dosyadır; değişiklikler kaynaktan derlenir (Claude'a "arayüzü güncelle" demen yeterli).
- **Canvas motoru**: uzay + gezegen sahneleri tek rAF döngüsü. Performans: gradyanlar offscreen sprite önbelleğinde, yıldızlar katman başına tek path, DPR ≤ 1.5, minimap 8 karede bir.
- **Ajan çalıştırma**: `claude -p --output-format stream-json` alt süreci; proje bağlamında `cwd` proje klasörüdür, FY'ye `--add-dir` ile erişilir. DOCUMENTOR `--permission-mode acceptEdits` ile yazabilir.
- **Git okuma**: liste görünümü için `.git/HEAD` ve `.git/logs/HEAD` doğrudan okunur (süreç yok); detay sekmesi `git log/status/branch` çalıştırır.
- **Veri güvenliği**: `galaxy:save` → günlük snapshot + `git add -A && commit` (sessiz).

## Kısayollar

| Tuş | İşlev |
|-----|-------|
| ESC | Katman katman geri (popup → panel → üst klasör → uzay) |
| ⌘⇧G | Hızlı not (global) |
| Enter | Aramada ilk sonuca git · konsolda çalıştır |
| ⌘/Ctrl+Enter | Ajan/Günlük metin kutularında gönder |
| WASD / Oklar | Uzayda gezinme · +/− zoom |
| Çift tık | Gezegene in · plan maddesi düzenle |
| Backspace / sağ tık | Gezegen modunda üst klasör |

## Sorun Giderme

- **App açılmıyor**: İlk açılışta sağ tık → Aç (Gatekeeper). Node yoksa nodejs.org'dan kur.
- **Ajanlar "claude bulunamadı" diyor**: `npm install -g @anthropic-ai/claude-code`.
- **UI eski görünüyor**: uygulamayı kapat-aç (arayüz bu klasörden yüklenir). `main.js` değiştiyse paketleyiciyi bir kez çalıştır.
- **Veriyi geri almak**: `backups/` içinden kopyala veya `git log` → `git checkout <hash> -- galaxy-data.json`.
