#!/bin/bash
# Kaynak → çalışan Project Galaxy.app (tam paketleme yok).
# Kullanım: bash scripts/refresh-app.sh   |   ./Yenile.app.command
# Sonra Cmd+Q ile kapatıp .app’i yeniden aç.
set -e
export PATH="/opt/homebrew/bin:/usr/local/bin:$HOME/.bun/bin:$PATH"
DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$DIR"
APP="$DIR/../Project Galaxy.app"
RES="$APP/Contents/Resources/app"

if [ ! -d "$APP" ]; then
  echo "▸ Project Galaxy.app yok — create_app.command ile ilk paketi üret."
  osascript -e 'display alert "Project Galaxy.app yok" message "Önce create_app.command ile paketle."' 2>/dev/null || true
  exit 1
fi

echo "▸ Arayüz derleniyor…"
python3 newui/build.py

echo "▸ .app içine kopyalanıyor…"
mkdir -p "$RES/newui" "$RES/ipc" "$RES/lib"
rsync -a --delete \
  --exclude 'node_modules' --exclude '.git' --exclude 'dist' --exclude '*.mp4' \
  newui/ "$RES/newui/"
rsync -a ipc/ "$RES/ipc/"
rsync -a lib/ "$RES/lib/"
cp -f main.js preload.js onboarding.html package.json "$RES/" 2>/dev/null || true
# root entry files that Electron loads from Resources/app
[ -f "$RES/package.json" ] || cp -f package.json "$RES/"

codesign --force --deep --sign - "$APP" 2>/dev/null || true
xattr -cr "$APP" 2>/dev/null || true

echo "✓ Güncellendi: $APP"
echo "  Cmd+Q → Project Galaxy.app ile aç."
osascript -e 'display notification "Kaynak .app’e kopyalandı — Cmd+Q ile yeniden aç" with title "Project Galaxy"' 2>/dev/null || true
