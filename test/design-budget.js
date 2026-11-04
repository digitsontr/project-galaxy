'use strict';
// KAPTAN v2 sakinlik bütçesi — docs/DESIGN.md §8. Kaynak: preview-sample + parts + styles (malzeme muaf).
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const EXEMPT_STYLES = new Set(['00-tokens.css', '05-wallpaper.css', '10-glass.css']);
const LIMITS = {
  'box-shadow': 40,
  'linear-gradient': 40,
  'radial-gradient': 20,
  'backdrop-filter': 0,
  'text-shadow': 0,
  '@keyframes': 10,
  '!important': 40,
  'body-mono': 160,
  ':root': 1
};

function read(p){ return fs.readFileSync(p, 'utf8'); }
function walk(dir, ext){
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir).filter(f => f.endsWith(ext)).map(f => path.join(dir, f));
}

function cssOnly(html){
  const bits = [];
  const re = /<style\b[^>]*>([\s\S]*?)<\/style>/g;
  let m; while ((m = re.exec(html))) bits.push(m[1]);
  let css = bits.join('\n');
  css = css.replace(/\/\* CodeMirror çekirdek[\s\S]*?(?=\/\* ---- Ortak)/, '');
  css = css.replace(/@font-face\s*\{[\s\S]*?\}/g, '');
  return css;
}

function nonempty(src, prop){
  let n = 0;
  const re = new RegExp(prop + '\\s*:\\s*([^;{}]+)', 'g');
  let m; while ((m = re.exec(src))) {
    const v = m[1].trim().toLowerCase();
    if (!v || v === 'none' || v.startsWith('none') || v === '0' || v === 'initial' || v === 'unset') continue;
    n++;
  }
  return n;
}

function measure(){
  const html = read(path.join(ROOT, 'newui', 'preview-sample.html'));
  const css = cssOnly(html);
  let extra = '';
  for (const f of walk(path.join(ROOT, 'newui', 'styles'), '.css')) {
    if (EXEMPT_STYLES.has(path.basename(f))) continue;
    extra += '\n' + read(f);
  }
  let js = '';
  for (const f of walk(path.join(ROOT, 'newui', 'parts'), '.js')) js += '\n' + read(f);
  const src = css + '\n' + extra + '\n' + js;
  const counts = {
    'box-shadow': nonempty(src, 'box-shadow'),
    'linear-gradient': (src.match(/linear-gradient\s*\(/g) || []).length,
    'radial-gradient': (src.match(/radial-gradient\s*\(/g) || []).length,
    'backdrop-filter': nonempty(src, 'backdrop-filter') + nonempty(src, '-webkit-backdrop-filter'),
    'text-shadow': nonempty(src, 'text-shadow'),
    '@keyframes': (src.match(/@keyframes\s+/g) || []).length,
    '!important': (src.match(/!important/g) || []).length,
    'body-mono': (src.match(/JetBrains Mono/g) || []).length,
    ':root': (css.match(/:root/g) || []).length + (extra.match(/:root/g) || []).length
  };
  const fails = [];
  for (const [k, lim] of Object.entries(LIMITS)) {
    if (counts[k] > lim) fails.push(k + '=' + counts[k] + '>' + lim);
  }
  return { ok: fails.length === 0, counts, fails, detail: fails.join(', ') || JSON.stringify(counts) };
}

if (require.main === module) {
  const r = measure();
  console.log(r.detail);
  process.exit(r.ok ? 0 : 1);
}

module.exports = { measure, LIMITS };
