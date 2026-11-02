# KAPTAN v2 — Liquid Glass tasarım sistemi

Bu belge arayüzün **tek görsel kaynağıdır**. Renk, cam, gölge, yazı ve köşe kararları burada
yazılıdır; kod bu belgeyi uygular. Belgede olmayan bir görsel efekt koda girmez.

## 1. Neden v2

v1 arayüzü "AI şablonu" gibi görünüyordu: neon parıltılar, her yüzeyde gradyan, mono büyük harf
etiketler, 6 farklı köşe yarıçapı. Sorun renk değil **ışık katmanıydı**.

### Geri sızma: neden ilk sakinleştirme turu tutmadı

`OZELLIKLER.md §34 Sakin yüzey` turu nabız animasyonlarını kapattı, ama CSS **ekleme-üstüne-ekleme**
büyüyordu:

| Katman | Ne yaptı |
|---|---|
| APEX v3 — aurora, cam yüzeyler | parıltı, gradyan, `text-shadow`, `backdrop-filter` ekledi |
| APEX v4 — calm developer workspace | v3'ü `!important` ile kapattı |
| APEX v5 — görsel kalite katmanı | aynı parıltı ve gradyanları `!important` ile geri açtı |

Her tur bir öncekini silmeden üstüne yazdı; son yazan kazandı. Ayrıca `:root` token bloğu 3 kez
tanımlıydı ve `_applyTheme()` temayı koda çiviliyordu, `_theme()` ise CSS'ten bağımsız ham hex
döndürüyordu.

**v2 kuralı:** katman eklenmez, değiştirilir. Görsel kurallar yalnızca `newui/styles/*.css`
içinde yaşar; `preview-sample.html` içindeki eski stil blokları yalnızca yapı (yerleşim, ölçü)
taşır. Bütçe testi (`test/design-budget.js`) her `npm test`'te çalışır ve sınırı aşan
değişikliği kırmızıya çevirir.

## 2. Kararlar (toplantı açık soruları)

| Soru | Karar |
|---|---|
| Palet yönü | **Koyu.** Token'lar açık temaya hazır yazılır (yalnız `:root` değerleri değişir). |
| Three.js uzay sahnesi | Kimlik olarak **yörünge/gezegen** kalır ama sakin: parıltısız, token renkli. Tam ekran galaksi canvas'ı v1'de zaten çizilmiyordu; kaldırıldı. |
| Mono font | **Yalnız kod**: editör, terminal, diff, log, komut, yol, hash. Etiket, başlık, sayı, düğme sans. |
| Işık | Cam malzemenin kendi kenar ışığı dışında parıltı yok. `text-shadow` yok. Renkli `box-shadow` yok. |

## 3. Malzeme: Liquid Glass

Referans: koyu doğal bir zemin üzerinde kalın buzlu cam. Arkası bulanık görünür, kenarında
ince bir ışık kırılması vardır, renk yalnız birincil eylemdedir.

Üç malzeme kademesi vardır; başka cam tanımı yazılmaz.

| Token | Kullanım | Bulanıklık | Dolgu |
|---|---|---|---|
| `--lg-1` (ince) | kenar çubukları, alt dock, üst bar | 32px | %16–5 beyaz + koyu %46 |
| `--lg-2` (kart) | kartlar, liste satırları, formlar | 28px | %22–7 beyaz + koyu %58 |
| `--lg-3` (yüzen) | modal, açılır menü, Kaptan paneli, toast | 40px | koyu %90–86 |

Her cam yüzeyin üç parçası vardır:

1. **Dolgu** — yarı saydam beyaz gradyan (üst-sol daha açık).
2. **Bulanıklık** — `backdrop-filter: blur() saturate(160%)`.
3. **Kenar ışığı** — 1px iç üst çizgi + iridesan çerçeve (`.lg-rim`, maske ile yalnız kenar).

Kırılma (refraction) yalnız küçük, öne çıkan yüzeylerde: ana sekme hapı. SVG
`feDisplacementMap` ile; büyük alanlarda performans için kullanılmaz.

## 4. Renk

| Token | Değer | Not |
|---|---|---|
| `--gx-bg` | `#0b0f14` | zemin (duvar kağıdının altı) |
| `--gx-ink` | `#f2f5f8` | ana metin |
| `--gx-dim` | `#b3bcc8` | ikincil metin |
| `--gx-faint` | `#7f8a98` | üçüncül, ipucu |
| `--gx-accent` | `#7cc4ff` | bağlantı, seçili durum |
| `--gx-cta` | `#5fe3c0` | **yalnız birincil eylem** (mint) |
| `--gx-ok` | `#6fd3a0` | |
| `--gx-warn` | `#e8c170` | |
| `--gx-err` | `#f08a96` | |
| `--gx-violet` | `#b4a6f0` | |

Doygunluk düşük, parlaklık yumuşak. Durum renkleri metin veya 8px nokta olarak kullanılır,
yüzey boyamaz (en çok %10 karışım).

## 5. Yazı

- UI: `-apple-system, "SF Pro Text", "Inter", "Segoe UI", sans-serif` (`--gx-font`).
- Kod: `"JetBrains Mono"` (`--gx-mono`) — yalnız kod bağlamı.
- Ölçek: 11 / 12.5 / 13.5 (gövde) / 15 / 18 / 24 / 32.
- Büyük harf + harf aralıklı "kicker" etiket yok; başlıklar cümle düzeninde.
- Sayılar `font-variant-numeric: tabular-nums`.

## 6. Geometri

Köşe yarıçapı **3 kademe** + hap:

| Token | Değer | Kullanım |
|---|---|---|
| `--r-sm` | 10px | düğme, girdi, çip |
| `--r-md` | 16px | kart, liste satırı |
| `--r-lg` | 24px | panel, modal, kenar çubuğu |
| `--r-pill` | 999px | hap, sekme hapı, rozet |

Boşluk: 4 / 8 / 12 / 16 / 24 / 32.

## 7. Hareket

- Süre 160–240ms, `cubic-bezier(.22,1,.36,1)`.
- Sürekli animasyon yok (yükleniyor göstergesi ve dinleme dalgası hariç).
- `prefers-reduced-motion` her şeyi kapatır.

## 8. Sakinlik bütçesi (kabul kriteri)

`test/design-budget.js` kaynak dosyalarda (`preview-sample.html`, `parts/*.js`, `styles/*.css`)
sayar. Cam malzeme tanımları (`styles/10-glass.css`) bütçeden muaftır; bütçe malzeme dışı
kullanımı ölçer.

| Metrik | v1 | v2 sınırı |
|---|---|---|
| `box-shadow` (malzeme dışı) | 186 | ≤ 40 |
| `linear-gradient` + `radial-gradient` (malzeme dışı) | 154 | ≤ 40 |
| `backdrop-filter` (malzeme dışı) | 34 | 0 |
| `text-shadow` | 12 | 0 |
| `@keyframes` | 25 | ≤ 10 |
| `!important` | 89 | ≤ 40 |
| Mono font (kod dışı) | ~480 | ≤ 160 |
| `:root` token bloğu | 3 | 1 |

## 9. Dosya düzeni

```
newui/styles/
  00-tokens.css      renk, yazı, köşe, boşluk, malzeme token'ları (tek :root)
  05-wallpaper.css   zemin: yumuşak gece duvar kağıdı
  10-glass.css       üç cam kademesi + kenar ışığı + kırılma
  20-shell.css       üst bar, aktivite çubuğu, kenar çubukları, dock, durum çubuğu
  30-controls.css    düğme, girdi, çip, hap, sekme, menü, kaydırma çubuğu
  40-surfaces.css    kartlar, listeler, boş durumlar, sayfa başlıkları
  50-features.css    Kaptan paneli, Toplantı Salonu, ajan alanı, editör, git
```

`newui/build.js` bu dosyaları ad sırasıyla birleştirip `<style id="gx-v2">` olarak eski stil
bloklarının **sonuna** ekler. Eski bloklarda görsel `!important` kalmadığı için v2 kuralları
özgüllük savaşına girmeden kazanır.
