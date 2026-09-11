'use strict';
// Eğitimlerim — Desktop'taki "yazılım" klasöründeki ders materyallerini (docx, pptx,
// isimsiz Colab/Jupyter defterleri, .py alıştırmaları) okunabilir HTML'e çevirip listeler.
// Kaynak dosyalara hiç yazmaz; yalnız DATA_DIR altında küçük bir dönüşüm önbelleği tutar.
const JSZip = require('jszip');

const SOURCE_EXT = { '.py': 'code', '.js': 'code', '.ts': 'code', '.java': 'code', '.cs': 'code' };
const SKIP_NAMES = new Set(['.DS_Store', '__pycache__']);
const SKIP_EXT = new Set(['.pyc', '.log', '.json', '.txt']); // alıştırma verisi/çıktısı — ders içeriği değil
const CATEGORY_LABELS = { 'c sharp': 'C#', 'yapay zeka': 'Yapay Zeka', java: 'Java', python: 'Python', react: 'React' };

function titleCase(name) {
  return name.split(/[\s_-]+/).filter(Boolean)
    .map(w => w[0] ? w[0].toLocaleUpperCase('tr') + w.slice(1) : w)
    .join(' ');
}

// Dosya adı bozulmuş (mojibake) birkaç öğe için elle temiz başlık — kaynağa dokunmuyoruz.
const TITLE_OVERRIDES = {
  'C# E告timi.docx': 'C# Eğitimi',
  'Derste kullan考an materyaller.zip': 'Derste Kullanılan Materyaller',
};

function esc(s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }

// ---------- basit markdown → HTML (not defteri açıklama hücreleri için) ----------
function mdToHtml(src) {
  const lines = String(src || '').replace(/\r\n/g, '\n').split('\n');
  const out = []; let inList = false;
  const inline = (t) => esc(t)
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/(?<!\*)\*([^*]+)\*(?!\*)/g, '<em>$1</em>')
    .replace(/`([^`]+)`/g, '<code>$1</code>');
  for (const raw of lines) {
    const line = raw.trim();
    const h = line.match(/^(#{1,4})\s+(.*)$/);
    const li = line.match(/^[-*]\s+(.*)$/);
    if (h) { if (inList) { out.push('</ul>'); inList = false; } out.push(`<h${h[1].length + 2}>${inline(h[2])}</h${h[1].length + 2}>`); }
    else if (li) { if (!inList) { out.push('<ul>'); inList = true; } out.push(`<li>${inline(li[1])}</li>`); }
    else if (!line) { if (inList) { out.push('</ul>'); inList = false; } }
    else { if (inList) { out.push('</ul>'); inList = false; } out.push(`<p>${inline(line)}</p>`); }
  }
  if (inList) out.push('</ul>');
  return out.join('\n');
}

// ---------- .docx ----------
async function docxToHtml(buf) {
  const zip = await JSZip.loadAsync(buf);
  const entry = zip.file('word/document.xml');
  if (!entry) return '<p><em>Belge içeriği okunamadı.</em></p>';
  const xml = await entry.async('string');
  const body = (xml.match(/<w:body>([\s\S]*)<\/w:body>/) || [, xml])[1];
  const paras = body.match(/<w:p[ >][\s\S]*?<\/w:p>/g) || [];
  const out = []; let inList = false;
  for (const p of paras) {
    const isList = /<w:numPr>/.test(p);
    const runs = p.match(/<w:r[ >][\s\S]*?<\/w:r>/g) || [];
    let html = '';
    for (const r of runs) {
      const rPr = (r.match(/<w:rPr>([\s\S]*?)<\/w:rPr>/) || [, ''])[1];
      const bold = /<w:b\/>|<w:b w:val="(true|1)"/.test(rPr);
      const italic = /<w:i\/>|<w:i w:val="(true|1)"/.test(rPr);
      const texts = r.match(/<w:t[^>]*>([\s\S]*?)<\/w:t>/g) || [];
      let t = texts.map(m => m.replace(/<w:t[^>]*>|<\/w:t>/g, '')).join('');
      if (/<w:tab\/>/.test(r)) t += '    ';
      if (!t) continue;
      if (bold) t = '<strong>' + t + '</strong>';
      if (italic) t = '<em>' + t + '</em>';
      html += t;
    }
    if (/<w:br\/>/.test(p)) html += '<br>';
    const plain = html.replace(/<[^>]+>/g, '').trim();
    if (isList) {
      if (!inList) { out.push('<ul>'); inList = true; }
      if (plain) out.push(`<li>${html}</li>`);
      continue;
    }
    if (inList) { out.push('</ul>'); inList = false; }
    if (!plain) { out.push('<div class="tr-gap"></div>'); continue; }
    // kısa, tamamı kalın/az kelimeli satırları başlık gibi göster (belgelerde stil bilgisi yok)
    const wordCount = plain.split(/\s+/).length;
    if (/^<strong>.*<\/strong>$/.test(html) && wordCount <= 10) out.push(`<h3>${html.replace(/<\/?strong>/g, '')}</h3>`);
    else out.push(`<p>${html}</p>`);
  }
  if (inList) out.push('</ul>');
  return out.join('\n') || '<p><em>Belge boş görünüyor.</em></p>';
}

// ---------- .pptx ----------
async function pptxToHtml(buf) {
  const zip = await JSZip.loadAsync(buf);
  const names = Object.keys(zip.files)
    .filter(n => /^ppt\/slides\/slide\d+\.xml$/.test(n))
    .sort((a, b) => (+a.match(/\d+/)[0]) - (+b.match(/\d+/)[0]));
  const out = [];
  for (const name of names) {
    const n = name.match(/\d+/)[0];
    const xml = await zip.file(name).async('string');
    const paras = xml.match(/<a:p>[\s\S]*?<\/a:p>/g) || [];
    const lines = [];
    for (const p of paras) {
      const texts = p.match(/<a:t>([\s\S]*?)<\/a:t>/g) || [];
      const t = texts.map(m => m.replace(/<a:t>|<\/a:t>/g, '')).join('').trim();
      if (t) lines.push(t);
    }
    if (!lines.length) continue;
    // a:t içeriği zaten XML olarak kaçışlanmış (ör. "&lt;button&gt;") — tekrar esc() UYGULAMA, çift kaçışa yol açar.
    const [title, ...rest] = lines;
    out.push(`<section class="tr-slide"><div class="tr-slide-no">SLAYT ${n}</div><h3>${title}</h3>${rest.map(l => `<p>${l}</p>`).join('')}</section>`);
  }
  return out.join('\n') || '<p><em>Sunumda metin bulunamadı.</em></p>';
}

// ---------- isimsiz Colab/Jupyter defteri (JSON) ----------
function notebookToHtml(raw) {
  let nb; try { nb = JSON.parse(raw); } catch (e) { return '<p><em>Not defteri okunamadı.</em></p>'; }
  const cells = nb.cells || [];
  const out = [];
  for (const c of cells) {
    const src = Array.isArray(c.source) ? c.source.join('') : String(c.source || '');
    if (!src.trim() && !(c.outputs && c.outputs.length)) continue;
    if (c.cell_type === 'markdown') { out.push(`<div class="tr-md">${mdToHtml(src)}</div>`); continue; }
    if (c.cell_type === 'code') {
      out.push(`<pre class="tr-code"><code>${esc(src)}</code></pre>`);
      for (const o of (c.outputs || [])) {
        if (o.output_type === 'stream') out.push(`<pre class="tr-out">${esc(Array.isArray(o.text) ? o.text.join('') : o.text)}</pre>`);
        else if (o.output_type === 'error') out.push(`<pre class="tr-out tr-err">${esc((o.ename || '') + ': ' + (o.evalue || ''))}</pre>`);
        else if (o.data) {
          const png = o.data['image/png'];
          const txt = o.data['text/plain'];
          if (png) out.push(`<img class="tr-img" src="data:image/png;base64,${(Array.isArray(png) ? png.join('') : png).replace(/\s/g, '')}">`);
          else if (txt) out.push(`<pre class="tr-out">${esc(Array.isArray(txt) ? txt.join('') : txt)}</pre>`);
        }
      }
    }
  }
  return out.join('\n') || '<p><em>Not defterinde içerik bulunamadı.</em></p>';
}

function codeToHtml(raw) { return `<pre class="tr-code"><code>${esc(raw)}</code></pre>`; }

async function sniffKind(fs, abs, ext) {
  if (ext === '.docx') return 'docx';
  if (ext === '.pptx') return 'pptx';
  if (ext === '.zip') return 'archive';
  if (SOURCE_EXT[ext]) return 'code';
  if (ext === '') {
    try { const head = fs.readFileSync(abs, 'utf8').slice(0, 200); if (/"nbformat"\s*:/.test(head)) return 'notebook'; } catch (e) {}
  }
  return null;
}

module.exports = function registerTrainings(g) {
  const { ipcMain, fs, path, os, shell } = g;

  function trainingsRoot() {
    try { const d = g.loadData && g.loadData(); const custom = d && d.settings && d.settings.trainingsPath;
      if (custom && fs.existsSync(custom)) return custom; } catch (e) {}
    return path.join(os.homedir(), 'Desktop', 'yazılım');
  }
  function cacheFile() { return path.join(g.DATA_DIR, 'trainings-cache.json'); }
  function readCache() { try { return JSON.parse(fs.readFileSync(cacheFile(), 'utf8')); } catch (e) { return {}; } }
  function writeCache(c) { try { fs.mkdirSync(g.DATA_DIR, { recursive: true }); fs.writeFileSync(cacheFile(), JSON.stringify(c)); } catch (e) {} }
  const idFor = (rel) => Buffer.from(rel).toString('base64').replace(/[+/=]/g, x => ({ '+': '-', '/': '_', '=': '' }[x]));
  const relFor = (id) => Buffer.from(id.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf8');

  function scan() {
    const root = trainingsRoot();
    const cats = [];
    let entries;
    try { entries = fs.readdirSync(root, { withFileTypes: true }); } catch (e) { return { ok: false, error: 'Klasör bulunamadı: ' + root, root }; }

    function listFiles(dirAbs, dirRel) {
      const items = [];
      let names; try { names = fs.readdirSync(dirAbs, { withFileTypes: true }); } catch (e) { return items; }
      for (const ent of names) {
        if (SKIP_NAMES.has(ent.name) || ent.name.startsWith('.')) continue;
        if (ent.isDirectory()) continue; // yalnız iki seviye: kategori/dosya
        const ext = path.extname(ent.name).toLowerCase();
        if (SKIP_EXT.has(ext)) continue;
        const abs = path.join(dirAbs, ent.name);
        let st; try { st = fs.statSync(abs); } catch (e) { continue; }
        items.push({ name: ent.name, abs, rel: dirRel + '/' + ent.name, mtimeMs: st.mtimeMs, size: st.size, ext });
      }
      return items;
    }

    const loose = listFiles(root, '.').filter(f => f.ext !== '');
    if (loose.length) cats.push({ key: 'genel', name: 'Genel', files: loose });

    for (const ent of entries) {
      if (!ent.isDirectory() || SKIP_NAMES.has(ent.name) || ent.name.startsWith('.')) continue;
      const files = listFiles(path.join(root, ent.name), ent.name);
      if (!files.length) continue;
      cats.push({ key: ent.name, name: CATEGORY_LABELS[ent.name.toLowerCase()] || titleCase(ent.name), files });
    }
    return { ok: true, root, cats };
  }

  ipcMain.handle('galaxy:trainingList', async () => {
    const s = scan();
    if (!s.ok) return s;
    const categories = [];
    for (const cat of s.cats) {
      const items = [];
      for (const f of cat.files) {
        const kind = await sniffKind(fs, f.abs, f.ext);
        if (!kind) continue;
        const id = idFor(f.rel);
        items.push({
          id, title: TITLE_OVERRIDES[f.name] || titleCase(f.name.replace(/\.[^.]+$/, '')), kind,
          sizeKb: Math.max(1, Math.round(f.size / 1024))
        });
      }
      items.sort((a, b) => a.title.localeCompare(b.title, 'tr'));
      if (items.length) categories.push({ key: cat.key, name: cat.name, count: items.length, items });
    }
    categories.sort((a, b) => a.name.localeCompare(b.name, 'tr'));
    return { ok: true, root: s.root, categories };
  });

  ipcMain.handle('galaxy:trainingRead', async (e, id) => {
    let rel; try { rel = relFor(id); } catch (err) { return { ok: false, error: 'geçersiz id' }; }
    const abs = path.join(trainingsRoot(), rel);
    let st; try { st = fs.statSync(abs); } catch (err) { return { ok: false, error: 'dosya bulunamadı' }; }
    const cache = readCache();
    const hit = cache[rel];
    if (hit && hit.mtimeMs === st.mtimeMs) return { ok: true, title: hit.title, kind: hit.kind, html: hit.html };

    const ext = path.extname(abs).toLowerCase();
    const kind = await sniffKind(fs, abs, ext);
    let html = '<p><em>Bu dosya türü henüz desteklenmiyor.</em></p>';
    try {
      if (kind === 'docx') html = await docxToHtml(fs.readFileSync(abs));
      else if (kind === 'pptx') html = await pptxToHtml(fs.readFileSync(abs));
      else if (kind === 'notebook') html = notebookToHtml(fs.readFileSync(abs, 'utf8'));
      else if (kind === 'code') html = codeToHtml(fs.readFileSync(abs, 'utf8'));
      else if (kind === 'archive') html = '<p><em>Bu bir arşiv dosyası — içeriği önizlenemiyor.</em> Aşağıdaki düğmeyle Finder’da açabilirsin.</p>';
    } catch (err) { html = `<p><em>Dönüştürme hatası: ${esc(err.message)}</em></p>`; }

    const baseName = path.basename(abs);
    const title = TITLE_OVERRIDES[baseName] || titleCase(baseName.replace(/\.[^.]+$/, ''));
    cache[rel] = { mtimeMs: st.mtimeMs, title, kind, html };
    writeCache(cache);
    return { ok: true, title, kind, html };
  });

  ipcMain.handle('galaxy:trainingOpenOriginal', (e, id) => {
    try { const abs = path.join(trainingsRoot(), relFor(id)); shell.showItemInFolder(abs); return { ok: true }; }
    catch (err) { return { ok: false, error: err.message }; }
  });
};
