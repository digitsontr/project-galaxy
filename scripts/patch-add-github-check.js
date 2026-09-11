'use strict';
// Faz 2 sağlık şeridi: lib/data.js'e galaxy:githubCheck IPC'sini ekler.
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');

function patchWrapped(file, fn) {
  const abs = path.join(ROOT, file);
  const src = fs.readFileSync(abs, 'utf8');
  const marker = "Function('g', 'with (g) {\\n' + ";
  const i = src.indexOf(marker);
  if (i < 0) throw new Error('no wrapper in ' + file);
  const start = i + marker.length;
  if (src[start] !== '"') throw new Error('expected quote');
  let j = start + 1, out = '';
  while (true) {
    const c = src[j];
    if (c === '\\') { out += c + src[j + 1]; j += 2; continue; }
    if (c === '"') break;
    out += c; j++;
  }
  const rawLen = (j + 1) - start;
  const body = JSON.parse(src.slice(start, j + 1));
  const newBody = fn(body);
  if (typeof newBody !== 'string') throw new Error('patch did not return string');
  fs.writeFileSync(abs, src.slice(0, start) + JSON.stringify(newBody) + src.slice(start + rawLen));
}

const MARKER = "ipcMain.handle('galaxy:claudeCheck'";
const ADD = `
// GitHub CLI oturumu — Takım Akışı'ndaki PR adımları için sağlık sinyali (yalnız okur, değişiklik yapmaz).
ipcMain.handle('galaxy:githubCheck', async () => {
  return await new Promise(res => {
    execFile('gh', ['auth', 'status'], { timeout: 4000 }, (err) => {
      if (!err) return res({ ok: true });
      const msg = String((err && err.message) || '');
      if (/ENOENT/.test(msg)) return res({ ok: false, error: 'gh CLI kurulu değil' });
      res({ ok: false, error: 'gh oturumu yok — gh auth login çalıştır' });
    });
  });
});
`;

patchWrapped('lib/data.js', (body) => {
  if (body.includes("galaxy:githubCheck")) throw new Error('already patched');
  const idx = body.indexOf(MARKER);
  if (idx < 0) throw new Error('claudeCheck marker not found');
  // claudeCheck handler'ının bittiği ilk "});\n" satırını bul, hemen sonrasına ekle.
  const endIdx = body.indexOf('\n});\n', idx);
  if (endIdx < 0) throw new Error('end of claudeCheck not found');
  const insertAt = endIdx + '\n});\n'.length;
  return body.slice(0, insertAt) + ADD + body.slice(insertAt);
});

console.log('patched lib/data.js: galaxy:githubCheck eklendi');
