#!/usr/bin/env node
'use strict';
// Arayüz derleyicisi: preview-sample.html iskeleti + parts/*.js (ada göre sıralı) → index.html.
// parts/ dosyaları tek bir `class Component` gövdesinin metinsel dilimleridir; tek başlarına
// geçerli JS değildir. Uygulamayı açan tek dosya index.html'dir ve git'te tutulmaz:
// `npm start`, `npm test` ve `npm run build:ui` bu betiği otomatik çalıştırır.
const fs = require('fs');
const path = require('path');

const dir = __dirname;
const partsDir = path.join(dir, 'parts');
let page = fs.readFileSync(path.join(dir, 'preview-sample.html'), 'utf8');
const comp = fs.readdirSync(partsDir)
  .filter(f => f.endsWith('.js'))
  .sort()
  .map(f => fs.readFileSync(path.join(partsDir, f), 'utf8'))
  .join('');

const m = /(<script type="text\/x-dc"[^>]*>)([\s\S]*?)(<\/script>)/.exec(page);
if (!m) {
  console.error('newui/build.js: preview-sample.html içinde <script type="text/x-dc"> bulunamadı');
  process.exit(1);
}
const bodyStart = m.index + m[1].length;
const bodyEnd = bodyStart + m[2].length;
page = page.slice(0, bodyStart) + '\n' + comp + '\n' + page.slice(bodyEnd);
for (const f of ['three.js', 'react.js', 'react-dom.js', 'dc-runtime.js']) {
  page = page.split(`src="${f}"`).join(`src="vendor/${f}"`);
}
fs.writeFileSync(path.join(dir, 'index.html'), page, 'utf8');
if (!process.argv.includes('--quiet')) console.log('newui/index.html güncellendi:', page.length);
