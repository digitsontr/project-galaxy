# Project Galaxy — Windows

## Kurulum

1. [Git for Windows](https://gitforwindows.org) (gömülü terminal için bash).
2. İsteğe bağlı: [Claude Code](https://docs.anthropic.com/en/docs/claude-code) CLI.
3. GitHub Releases’ten `Project-Galaxy-Setup-….exe` **veya** kaynakta:

```bash
npm install
python newui/build.py
npx electron-builder --win --publish never
```

Çıktı: `dist/Project-Galaxy-Setup-<version>.exe` (NSIS, x64).

## Smoke (CI / yerelde)

Statik + Electron smoke macOS CI’da (`ci.yml`) koşar. Windows’ta aynı kontroller:

```bash
python newui/build.py
# PowerShell / cmd:
set ELECTRON_RUN_AS_NODE=
node_modules\.bin\electron test\smoke.js
```

Paket yapılandırması smoke içinde doğrulanır: `package.json` → `build.win.target=nsis`, `nsis.shortcutName`.

## Bilinen sınırlar

| Özellik | Windows |
|---------|---------|
| Harita, gezegen, git, pano, DB | Var |
| Gömülü bash | Git-Bash gerekir |
| Native STT (`galaxy-stt.swift`) | Yok (macOS) |
| Keychain DB parolası | Windows Credential Manager / düz ayar yolu (sürüme göre) |
| Tray otomatik güncelleme | GitHub Releases `.exe` — macOS zip updater’dan ayrı |

## CI

- `ci.yml` → macos smoke + (isteğe bağlı) windows-smoke job: `build.py` + `smoke.js`
- `release.yml` → `build-windows` NSIS üretir ve Release’e ekler
