#!/bin/bash
# Project Galaxy'yi gerçek, Dock'a tutturulabilir bir .app olarak paketler.
# Bir kere çalıştırman yeterli — sonrasında bir üst klasördeki "Project Galaxy.app"i kullan.
set -e
export PATH="/opt/homebrew/bin:/usr/local/bin:$PATH"
DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$DIR"

if ! command -v npm >/dev/null 2>&1; then
  osascript -e 'display alert "Node.js gerekli" message "nodejs.org adresinden Node.js kurup tekrar çalıştır."'
  exit 1
fi

echo "▸ Bağımlılıklar kuruluyor (ilk seferde birkaç dakika sürebilir)…"
npm install

ARCH=$(uname -m)
[ "$ARCH" = "x86_64" ] && ARCH="x64"
echo "▸ Uygulama paketleniyor (mimari: $ARCH)…"
npx electron-packager . "Project Galaxy" \
  --platform=darwin --arch=$ARCH \
  --icon=build/galaxy.icns \
  --out=dist --overwrite --prune \
  --app-bundle-id=com.furkan.projectgalaxy \
  --ignore="^/dist" --ignore="\.command$" --ignore="backup" --ignore="^/build/icon_preview"

echo "▸ Bir üst klasöre yerleştiriliyor…"
rm -rf "$DIR/../Project Galaxy.app"
mv "$DIR/dist/Project Galaxy-darwin-$ARCH/Project Galaxy.app" "$DIR/.."
xattr -dr com.apple.quarantine "$DIR/../Project Galaxy.app" 2>/dev/null || true
rm -rf "$DIR/dist"

osascript -e 'display notification "Project Galaxy.app hazır — Dock için sağ tık > Seçenekler > Dock'"'"'ta Tut" with title "Project Galaxy"'
open -R "$DIR/../Project Galaxy.app"
echo "✓ Tamam. Bir üst klasördeki Project Galaxy.app artık gerçek bir uygulama."
