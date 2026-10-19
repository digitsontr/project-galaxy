# Project Galaxy — Gizlilik

**Son güncelleme:** 2026-09-21

Project Galaxy veriyi kendi bilgisayarında tutar. Galaxy bir bulut hesabı açmaz; telemetri veya reklam SDK’sı göndermez.

## Ne saklanır (yalnızca yerelde)

- Evren / gezegen listesi, notlar, pano görevleri, ajan kişilikleri
- İsteğe bağlı asistan sohbet geçmişi
- Ayarlar: dil, Claude yolu, MCP komutu ve ortam değişkenleri (Posta MCP)
- DB parolaları: macOS Anahtar Zinciri (Keychain) — Galaxy dosyasında düz metin yok

Konum (macOS): `~/Library/Application Support/ProjectGalaxy/`  
Windows: `%APPDATA%/ProjectGalaxy/`

## Ne saklanmaz

- GitHub Personal Access Token (PAT) — `gh auth login` oturumu kullanılır
- Gmail OAuth refresh token’ı Galaxy’ye “yapıştırılan” ayrı bir kasa değil; MCP sürecinin ortamında kalır
- Kullanım analitikleri, çökme raporları (Sentry yok / opt-in değil)

## Harici süreçler (sen bağlarsan)

- **Claude Code CLI** — Anthropic oturumun; Galaxy token yazmaz
- **Gmail MCP** — Google API anahtarları MCP ortamında
- **Docker / Postgres / SSH** — yerel veya senin sunucun

## Mağaza (App Store) sürümü

Sandbox’ta ajan / gömülü terminal kısıtlıdır. Veri yine yerelde kalır. Detay: `docs/APPSTORE.md`.

## İletişim

Gizlilik soruları için depo sahibi / uygulama yayıncısı ile iletişime geç.
