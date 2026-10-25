'use strict';
// Tarama is parcacigi: proje geneli bul-onizleme ve test kesfi burada calisir.
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

function testDiscover({ root }) {
  const tests = [];
  for (const full of walkFiles(root)) {
    const rel = relOf(root, full);
    const base = path.basename(rel);
    const isTest = /(\.test\.|\.spec\.|_test\.py$|test_.*\.py$|Tests?\.swift$)/i.test(base) || /(^|\/)(test|tests|__tests__)(\/|$)/i.test(rel);
    if (!isTest || !TEXT_EXT.test(rel)) continue;
    let text = ''; try { text = fs.readFileSync(full, 'utf8').slice(0, 200 * 1024); } catch (e) { continue; }
    const lines = text.split('\n');
    lines.forEach((ln, i) => {
      const m = ln.match(/\b(?:it|test|describe)\s*\(\s*['"`]([^'"`]{2,90})['"`]/) || ln.match(/^\s*(?:async\s+)?def\s+(test_\w+)\s*\(/) || ln.match(/\bfunc\s+(test\w+)\s*\(/);
      if (m) tests.push({ file: rel, name: m[1], line: i + 1 });
    });
    if (!tests.some(t => t.file === rel)) tests.push({ file: rel, name: base, line: 1 });
    if (tests.length >= 300) break;
  }
  let pkg = null; try { pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8')); } catch (err) {}
  const runner = pkg && /vitest/.test(JSON.stringify(pkg)) ? 'vitest' : pkg && /jest/.test(JSON.stringify(pkg)) ? 'jest' : fs.existsSync(path.join(root, 'pytest.ini')) || fs.existsSync(path.join(root, 'pyproject.toml')) ? 'pytest' : pkg ? 'npm' : 'pytest';
  return { ok: true, runner, tests };
}

try {
  const d = workerData || {};
  const out = d.kind === 'testDiscover' ? testDiscover(d) : grepPreview(d);
  parentPort.postMessage(out);
} catch (err) {
  parentPort.postMessage({ ok: false, error: String((err && err.message) || err) });
}
