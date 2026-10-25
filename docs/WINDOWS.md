# Project Galaxy — Windows

## Kurulum

1. [Git for Windows](https://gitforwindows.org) (gömülü terminal için bash).
2. İsteğe bağlı: [Claude Code](https://docs.anthropic.com/en/docs/claude-code) CLI.
3. GitHub Releases’ten `Project-Galaxy-Setup-….exe` **veya** kaynakta:

```bash
npm ci
npm run dist:win
```

Çıktı: `dist/Project-Galaxy-Setup-<version>.exe` (NSIS, x64).

## Smoke (CI / yerelde)

Smoke + entegrasyon testi CI’da (`ci.yml`) macOS ve Windows’ta koşar. Yerelde:

```bash
npm run build:ui
# PowerShell / cmd:
set ELECTRON_RUN_AS_NODE=
node_modules\.bin\electron test\smoke.js
npm run test:integration
```

Paket yapılandırması smoke içinde doğrulanır: `package.json` → `build.win.target=nsis`, `nsis.shortcutName`.

## Bilinen sınırlar

| Özellik | Windows |
|---------|---------|
| Harita, gezegen, git, pano, DB | Var |
| Gömülü bash (⌁/▮ konsol) | Git-Bash gerekir |
| `>_ TERMİNAL` sekmesi | Git-Bash, yoksa PowerShell. Gerçek tty yok (ConPTY yerel modül ister): satır satır komut çalışır, `vim`/`top` gibi tam ekran programlar çalışmaz — ⇗ ile Windows Terminal'de aç |
| Pencere düğmeleri | Sistem küçült/büyüt/kapat üst barın sağında (overlay); varsayılan büyütülmüş pencere, tam ekran isteğe bağlı |
| npm araçları (claude, tsc, eslint, prettier, npx) | `.cmd` sarmalayıcısının JS'i gömülü Node ile koşar (`lib/cli.js`) — ayrı Node kurulumu gerekmez |
| Native STT (`galaxy-stt.swift`) | Yok (macOS) |
| Keychain DB parolası | Windows Credential Manager / düz ayar yolu (sürüme göre) |
| Tray otomatik güncelleme | GitHub Releases `.exe` — macOS zip updater’dan ayrı |

## CI

- `ci.yml` → her push'ta macOS + Windows: `newui/build.js` + `smoke.js` + `npm run test:integration` (gerçek git, PTY, LSP, `.cmd` araçları)
- `release.yml` → `build-windows` NSIS üretir ve Release’e ekler
