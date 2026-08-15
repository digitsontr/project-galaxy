#!/bin/bash
# Project Galaxy'yi macOS .app olarak paketler → ad-hoc imza → Project-Galaxy-full.zip
# Tek kaynak: hem CI (GitHub Actions) hem elle paketleme bunu kullanır.
set -e
cd "$(dirname "$0")/.."

ARCH=$(uname -m); [ "$ARCH" = "x86_64" ] && ARCH="x64"
echo "▸ Arayüz derleniyor…"
python3 newui/build.py >/dev/null

echo "▸ Paketleniyor (mimari: $ARCH)…"
rm -rf dist
./node_modules/.bin/electron-packager . "Project Galaxy" \
  --platform=darwin --arch="$ARCH" \
  --icon=build/galaxy.icns \
  --out=dist --overwrite --prune \
  --app-bundle-id=com.furkan.projectgalaxy \
  --extend-info=build/extra-info.plist \
  --ignore="^/dist" --ignore="\.command$" --ignore="\.zip$" --ignore="backup" \
  --ignore="^/build/icon_preview" --ignore="claude-design-result" \
  --ignore="^/reports" --ignore="^/attachments" --ignore="preview-sample" \
  --ignore="newui/build.py" --ignore="^/test" --ignore="^/\.github" --ignore="^/scripts"

APP="dist/Project Galaxy-darwin-$ARCH/Project Galaxy.app"

# Native ses tanıma yardımcısını (Hey Galaxy altyapısı) bundle'a derle
if command -v swiftc >/dev/null 2>&1 && [ -f native/galaxy-stt.swift ]; then
  echo "▸ Native STT derleniyor…"
  swiftc native/galaxy-stt.swift -O -o "$APP/Contents/Resources/galaxy-stt" || true
  codesign -s - -f "$APP/Contents/Resources/galaxy-stt" 2>/dev/null || true
fi

echo "▸ Ad-hoc imzalanıyor…"
codesign -s - -f --deep "$APP" 2>/dev/null || true
xattr -cr "$APP" 2>/dev/null || true

echo "▸ Zip oluşturuluyor…"
rm -f Project-Galaxy-full.zip
ditto -c -k --keepParent "$APP" Project-Galaxy-full.zip
echo "✓ Project-Galaxy-full.zip hazır ($(du -h Project-Galaxy-full.zip | cut -f1))"
