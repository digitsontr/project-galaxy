'use strict';
// Tarama is parcacigi: proje geneli bul-onizleme burada calisir.
// Amac: patolojik regex (or. (a+)+$) veya dev repo ana sureci (dolayisiyla arayuzu)
// kilitlemesin. Ust surec zaman asiminda worker'i terminate eder.
const { parentPort, workerData } = require('worker_threads');
const fs = require('fs');
const path = require('path');

const SKIP_DIRS = new Set(['node_modules', '.git', 'dist', 'build', '.next', 'coverage', '.galaxy-backups']);
const TEXT_EXT = /\.(js|jsx|ts|tsx|mjs|cjs|py|rb|go|rs|swift|kt|java|c|cc|cpp|h|hpp|cs|php|sh|css|scss|html?|md|json|ya?ml|toml|xml|sql|txt|env|ini|cfg)$/i;

function walkFiles(root, limit) {
  const out = [];
  const stack = [root];
  while (stack.length && out.length < (limit || 4000)) {
    const dir = stack.pop();
    let ents = [];
    try { ents = fs.readdirSync(dir, { withFileTypes: true }); } catch (e) { continue; }
    for (const en of ents) {
      const full = path.join(dir, en.name);
      if (en.isDirectory()) { if (!SKIP_DIRS.has(en.name) && !en.name.startsWith('.')) stack.push(full); }
      else if (en.isFile()) out.push(full);
      if (out.length >= (limit || 4000)) break;
    }
  }
  return out;
}
const relOf = (root, full) => path.relative(root, full).split(path.sep).join('/');

function grepPreview({ root, query, replacement, isRegex, caseSensitive }) {
  let re;
  try {
    if (isRegex) re = new RegExp(query, caseSensitive ? 'g' : 'gi');
    else { const esc = String(query).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); re = new RegExp(esc, caseSensitive ? 'g' : 'gi'); }
  } catch (err) { return { ok: false, error: 'Regex hatası: ' + err.message }; }
  const files = [];
  let total = 0;
  const deadline = Date.now() + 12000; // ic butce: ust surec 15sn'de oldurur
  for (const full of walkFiles(root)) {
    if (Date.now() > deadline) return { ok: false, error: 'Tarama iç zaman aşımına uğradı (12 sn) — deseni daralt veya kökü küçült' };
    if (!TEXT_EXT.test(full)) continue;
    let text; try { const st = fs.statSync(full); if (st.size > 1024 * 1024) continue; text = fs.readFileSync(full, 'utf8'); } catch (err) { continue; }
    if (text.includes('\0')) continue;
    const lines = text.split('\n'); const hits = [];
    for (let i = 0; i < lines.length; i++) {
      const ln = lines[i];
      if (ln.length > 20000) continue; // patolojik satirlar regex'e girmez
      re.lastIndex = 0;
      if (re.test(ln)) {
        re.lastIndex = 0;
        const after = ln.replace(re, String(replacement == null ? '' : replacement));
        hits.push({ line: i + 1, before: ln.slice(0, 220), after: after.slice(0, 220) });
        total++;
      }
    }
    if (hits.length) files.push({ rel: relOf(root, full), hits: hits.slice(0, 30), count: hits.length });
    if (files.length >= 60 || total >= 600) break;
  }
  return { ok: true, files, total };
}

try {
  const d = workerData || {};
  const out = d.kind === 'projectMap' ? require('../lib/project-map').analyzeProject(d.root)
    : grepPreview(d);
  parentPort.postMessage(out);
} catch (err) {
  parentPort.postMessage({ ok: false, error: String((err && err.message) || err) });
}
