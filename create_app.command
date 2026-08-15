#!/bin/bash
# Project Galaxy'yi gerçek, Dock'a tutturulabilir bir .app olarak paketler.
# Bir kere çalıştırman yeterli — sonrasında bir üst klasördeki "Project Galaxy.app"i kullan.
# node/npm yoksa otomatik bun'a düşer; newui arayüzünü de kendi build eder.
set -e
export PATH="/opt/homebrew/bin:/usr/local/bin:$HOME/.bun/bin:$HOME/.local/bin:$PATH"
DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$DIR"

# ---- Runtime seç: bun'ı TERCİH ET (bazı deneysel Node sürümleri — ör. v26 — electron-packager'ı bozuyor) ----
RUNNER=""
if command -v bun >/dev/null 2>&1; then
  RUNNER="bun"
elif command -v node >/dev/null 2>&1 && command -v npm >/dev/null 2>&1; then
  RUNNER="node"
else
  osascript -e 'display alert "Bun ya da Node.js gerekli" message "bun.sh ya da nodejs.org üzerinden kurup tekrar çalıştır."'
  exit 1
fi
echo "▸ Runtime: $RUNNER"

# ---- Bağımlılıklar (yalnız eksikse kur) ----
if [ ! -d "node_modules/@electron/packager" ]; then
  echo "▸ Bağımlılıklar kuruluyor (ilk seferde birkaç dakika sürebilir)…"
  if [ "$RUNNER" = "node" ]; then npm install; else bun install; fi
fi

# ---- newui arayüzünü (index.html) template'ten yeniden üret ----
if command -v python3 >/dev/null 2>&1 && [ -f "newui/build.py" ]; then
  echo "▸ Arayüz derleniyor (newui/index.html)…"
  python3 newui/build.py >/dev/null || true
fi

# ---- Regresyon smoke-test (paketlemeden önce güvence) — SKIP_SMOKE=1 ile atlanır ----
if [ "$SKIP_SMOKE" != "1" ] && [ -f "test/smoke.js" ]; then
  echo "▸ Smoke test çalışıyor…"
  SMOKE_OUT=$(env -u ELECTRON_RUN_AS_NODE ./node_modules/.bin/electron test/smoke.js 2>/dev/null | grep -E "geçti|BAŞARISIZ")
  echo "  $SMOKE_OUT"
  if echo "$SMOKE_OUT" | grep -q "BAŞARISIZ"; then
    osascript -e 'display alert "Smoke test BAŞARISIZ" message "Bir şey bozulmuş olabilir. Yine de paketlemek için Terminalden SKIP_SMOKE=1 ile çalıştır." as critical' 2>/dev/null || true
    echo "  ✗ smoke test başarısız — paketleme durduruldu (SKIP_SMOKE=1 ile zorlayabilirsin)."
    exit 1
  fi
fi

ARCH=$(uname -m)
[ "$ARCH" = "x86_64" ] && ARCH="x64"
echo "▸ Uygulama paketleniyor (mimari: $ARCH)…"

PKG_ARGS=(. "Project Galaxy"
  --platform=darwin --arch="$ARCH"
  --icon=build/galaxy.icns
  --out=dist --overwrite --prune
  --app-bundle-id=com.furkan.projectgalaxy
  --extend-info=build/extra-info.plist
  --ignore="^/dist" --ignore="\.zip$" --ignore="\.command$" --ignore="backup" --ignore="^/build/icon_preview"
  --ignore="claude-design-result" --ignore="^/reports" --ignore="^/attachments"
  --ignore="preview-sample" --ignore="newui/build.py")

# Yerel @electron/packager binary'sini çalıştır (npx deprecated 'electron-packager'ı çeker — YANLIŞ)
if [ "$RUNNER" = "bun" ]; then
  bun node_modules/.bin/electron-packager "${PKG_ARGS[@]}"
else
  ./node_modules/.bin/electron-packager "${PKG_ARGS[@]}"
fi

# ---- Native ses tanıma yardımcısını (Galaxy Asistanı "Hey Galaxy") bundle'a derle ----
if command -v swiftc >/dev/null 2>&1 && [ -f "$DIR/native/galaxy-stt.swift" ]; then
  echo "▸ Sesli asistan (native STT) derleniyor…"
  swiftc "$DIR/native/galaxy-stt.swift" -O -o "$DIR/dist/Project Galaxy-darwin-$ARCH/Project Galaxy.app/Contents/Resources/galaxy-stt" 2>/dev/null \
    && codesign -s - -f "$DIR/dist/Project Galaxy-darwin-$ARCH/Project Galaxy.app/Contents/Resources/galaxy-stt" 2>/dev/null || true
else
  echo "▸ (swiftc yok — sesli tanıma ilk kullanımda derlenecek ya da devre dışı kalacak)"
fi

echo "▸ Bir üst klasöre yerleştiriliyor…"
rm -rf "$DIR/../Project Galaxy.app"
mv "$DIR/dist/Project Galaxy-darwin-$ARCH/Project Galaxy.app" "$DIR/.."
rm -rf "$DIR/dist"

# ---- ad-hoc imzala (macOS'ta "hasarlı" hatası olmadan açılsın) + karantina temizle ----
codesign --force --deep --sign - "$DIR/../Project Galaxy.app" 2>/dev/null || true
xattr -cr "$DIR/../Project Galaxy.app" 2>/dev/null || true

osascript -e 'display notification "Project Galaxy.app hazır — Dock için sağ tık > Seçenekler > Dock'"'"'ta Tut" with title "Project Galaxy"' 2>/dev/null || true
open -R "$DIR/../Project Galaxy.app" 2>/dev/null || true
echo "✓ Tamam. Bir üst klasördeki Project Galaxy.app artık gerçek bir uygulama."
