#!/bin/bash
# Project Galaxy başlatıcı — çift tıklayınca uygulamayı açar.
cd "$(dirname "$0")"
if [ ! -d node_modules ]; then
  echo "İlk kurulum yapılıyor (bir kere, birkaç dakika sürebilir)…"
  npm install
fi
npm start
