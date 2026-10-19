'use strict';
// Faz 3 / LSP köprüsü: projenin kendi typescript'ini LanguageService olarak koşar.
// Kalıcı worker (parentPort mesajlaşması). TS bulunamazsa {ok:false, unavailable:true} döner.
// Protokol: {id, kind, ...} -> {id, ok, ...}  kind: status|diag|complete|def|refs|rename|hover
const { parentPort, workerData } = require('worker_threads');
const fs = require('fs');
const path = require('path');

const root = workerData && workerData.root;
let ts = null, service = null, loadError = '';
const openFiles = new Map(); // absPath -> {content, version}

function loadTs() {
  if (ts || loadError) return ts;
  const cands = [];
  try { cands.push(require.resolve('typescript', { paths: [path.join(root, 'node_modules'), root] })); } catch (e) {}
  cands.push(path.join(root, 'node_modules', 'typescript', 'lib', 'typescript.js'));
  for (const c of cands) {
    try { if (c && fs.existsSync(c)) { ts = require(c); return ts; } } catch (e) { loadError = e.message; }
  }
  loadError = 'typescript bulunamadı (proje node_modules içinde yok)';
  return null;
}

function ensureService() {
  if (!loadTs()) return null;
  if (service) return service;
  const host = {
    getScriptFileNames: () => [...openFiles.keys()],
    getScriptVersion: f => { const o = openFiles.get(f); return o ? String(o.version) : '0'; },
    getScriptSnapshot: f => {
      const o = openFiles.get(f);
      if (o) return ts.ScriptSnapshot.fromString(o.content);
      try { if (fs.existsSync(f)) return ts.ScriptSnapshot.fromString(fs.readFileSync(f, 'utf8')); } catch (e) {}
      return undefined;
    },
    getCurrentDirectory: () => root,
    getCompilationSettings: () => ({
      allowJs: true, checkJs: false, jsx: ts.JsxEmit ? ts.JsxEmit.React : 2,
      module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022,
      moduleResolution: ts.ModuleResolutionKind.NodeJs, esModuleInterop: true,
      allowSyntheticDefaultImports: true, strict: false, noEmit: true, resolveJsonModule: true,
      baseUrl: root, typeRoots: [path.join(root, 'node_modules', '@types')],
    }),
    getDefaultLibFileName: opts => ts.getDefaultLibFilePath(opts),
    fileExists: ts.sys.fileExists, readFile: ts.sys.readFile, readDirectory: ts.sys.readDirectory,
    directoryExists: ts.sys.directoryExists, getDirectories: ts.sys.getDirectories,
    realpath: ts.sys.realpath, useCaseSensitiveFileNames: () => ts.sys.useCaseSensitiveFileNames,
  };
  try { service = ts.createLanguageService(host, ts.createDocumentRegistry()); } catch (e) { loadError = e.message; }
  return service;
}

const toAbs = rel => path.isAbsolute(rel) ? rel : path.join(root, rel);
function lineOffsets(content) {
  const offs = [0];
  for (let i = 0; i < content.length; i++) if (content.charCodeAt(i) === 10) offs.push(i + 1);
  return offs;
}
function posOf(content, offset) {
  const offs = lineOffsets(content || '');
  let lo = 0, hi = offs.length - 1;
  while (lo < hi) { const mid = (lo + hi + 1) >> 1; if (offs[mid] <= offset) lo = mid; else hi = mid - 1; }
  return { line: lo + 1, ch: offset - offs[lo] + 1 };
}
function offsetOf(content, line, ch) {
  const offs = lineOffsets(content || '');
  const l = Math.min(Math.max((line || 1) - 1, 0), offs.length - 1);
  return offs[l] + Math.max((ch || 1) - 1, 0);
}
function syncFile(file, content) {
  const abs = toAbs(file);
  if (typeof content === 'string') {
    const prev = openFiles.get(abs);
    openFiles.set(abs, { content, version: (prev ? prev.version : 0) + 1 });
  } else if (!openFiles.has(abs)) {
    let c = ''; try { c = fs.readFileSync(abs, 'utf8'); } catch (e) {}
    openFiles.set(abs, { content: c, version: 1 });
  }
  return abs;
}
const relOf = abs => path.relative(root, abs).split(path.sep).join('/');
const docOf = d => { try { return ts.flattenDiagnosticMessageText(d.messageText, ' '); } catch (e) { return String(d.messageText || ''); } };

function handle(msg) {
  const kind = msg.kind;
  if (kind === 'status') {
    const ok = !!ensureService();
    return { ok, unavailable: !ok, error: ok ? undefined : loadError, version: ok && ts.version ? ts.version : undefined };
  }
  const svc = ensureService();
  if (!svc) return { ok: false, unavailable: true, error: loadError };
  const abs = syncFile(msg.file || '', msg.content);
  const content = (openFiles.get(abs) || {}).content || '';

  if (kind === 'diag') {
    const diags = [
      ...svc.getSyntacticDiagnostics(abs),
      ...svc.getSemanticDiagnostics(abs),
    ].slice(0, 60).map(d => {
      const p = d.start != null ? posOf(content, d.start) : { line: 1, ch: 1 };
      return { file: relOf(abs), line: p.line, col: p.ch, severity: d.category === 0 ? 'warning' : 'error', text: docOf(d).slice(0, 220), source: 'lsp', len: d.length || 1 };
    });
    return { ok: true, problems: diags };
  }
  const off = offsetOf(content, msg.line, msg.ch);
  if (kind === 'complete') {
    const c = svc.getCompletionsAtPosition(abs, off, { includeCompletionsForModuleExports: false, includeInsertTextCompletions: false });
    const entries = c && c.entries ? c.entries.filter(e => e && e.name).slice(0, 80).map(e => ({ name: e.name, kind: e.kind })) : [];
    return { ok: true, entries, isMember: !!(c && c.isMemberCompletion) };
  }
  if (kind === 'def') {
    const hitPos = Math.max(0, off - 1);
    const defs = (svc.getDefinitionAndBoundSpan ? (svc.getDefinitionAndBoundSpan(abs, hitPos) || {}).definitions : svc.getDefinitionAtPosition(abs, hitPos)) || [];
    const out = defs.filter(d => d && d.fileName).slice(0, 8).map(d => {
      let c2 = ''; try { c2 = d.fileName === abs ? content : fs.readFileSync(d.fileName, 'utf8'); } catch (e) {}
      const p = posOf(c2, d.textSpan.start);
      return { file: relOf(d.fileName), line: p.line, col: p.ch, name: d.name || '' };
    });
    return { ok: true, defs: out };
  }
  if (kind === 'refs') {
    const refs = svc.getReferencesAtPosition(abs, Math.max(0, off - 1)) || [];
    const out = refs.slice(0, 120).map(r => {
      let c2 = ''; try { c2 = r.fileName === abs ? content : fs.readFileSync(r.fileName, 'utf8'); } catch (e) {}
      const p = posOf(c2, r.textSpan.start);
      const lineText = (c2.split('\n')[p.line - 1] || '').trim().slice(0, 140);
      return { file: relOf(r.fileName), line: p.line, col: p.ch, text: lineText, isDef: !!r.isDefinition };
    });
    return { ok: true, refs: out };
  }
  if (kind === 'rename') {
    const newName = String(msg.newName || '').trim();
    if (!/^[A-Za-z_$][\w$]*$/.test(newName)) return { ok: false, error: 'Geçersiz isim' };
    let locs = [];
    try { locs = svc.findRenameLocations(abs, Math.max(0, off - 1), false, false) || []; } catch (e) { return { ok: false, error: e.message }; }
    if (!locs.length) return { ok: false, error: 'Yeniden adlandırılacak sembol bulunamadı' };
    const byFile = new Map();
    for (const l of locs) {
      if (!l || !l.fileName) continue;
      if (!byFile.has(l.fileName)) byFile.set(l.fileName, []);
      byFile.get(l.fileName).push(l.textSpan);
    }
    const files = [];
    for (const [f, spans] of byFile) {
      let c2 = ''; try { c2 = f === abs ? content : fs.readFileSync(f, 'utf8'); } catch (e) { continue; }
      spans.sort((a, b) => b.start - a.start);
      let next = c2;
      for (const s of spans) next = next.slice(0, s.start) + newName + next.slice(s.start + s.length);
      if (next !== c2) files.push({ file: relOf(f), content: next, count: spans.length });
    }
    return { ok: true, files, total: locs.length };
  }
  if (kind === 'quickfix') {
    const start = Math.max(0, off - 1);
    const allDiags = [...svc.getSyntacticDiagnostics(abs), ...svc.getSemanticDiagnostics(abs)];
    try { allDiags.push(...svc.getSuggestionDiagnostics(abs)); } catch (e) {}
    const diags = allDiags.filter(d => d.start != null && start >= d.start - 2 && start <= d.start + (d.length || 1) + 2);
    const codes = [...new Set(diags.map(d => d.code))];
    let fixes = [];
    try { fixes = svc.getCodeFixesAtPosition(abs, start, start + 1, codes, {}, {}) || []; } catch (e) { return { ok: false, error: e.message }; }
    const out = [];
    for (const fx of fixes.slice(0, 6)) {
      const byFile = new Map();
      for (const fc of (fx.changes || [])) {
        let c2 = ''; try { c2 = fc.fileName === abs ? content : fs.readFileSync(fc.fileName, 'utf8'); } catch (e) { continue; }
        const changes = [...(fc.textChanges || [])].sort((a, b) => b.span.start - a.span.start);
        let next = c2;
        for (const ch of changes) next = next.slice(0, ch.span.start) + ch.newText + next.slice(ch.span.start + ch.span.length);
        if (next !== c2) byFile.set(relOf(fc.fileName), next);
      }
      if (byFile.size) out.push({ description: fx.description || 'Düzelt', files: [...byFile.entries()].map(([file, content2]) => ({ file, content: content2 })) });
    }
    return { ok: true, fixes: out };
  }
  if (kind === 'hover') {
    const qi = svc.getQuickInfoAtPosition(abs, Math.max(0, off - 1));
    if (!qi) return { ok: true, text: '' };
    const disp = ts.displayPartsToString(qi.displayParts || []).slice(0, 400);
    const doc = ts.displayPartsToString(qi.documentation || []).slice(0, 300);
    return { ok: true, text: (disp + (doc ? '\n' + doc : '')).trim() };
  }
  return { ok: false, error: 'Bilinmeyen istek: ' + kind };
}

parentPort.on('message', msg => {
  if (!msg || msg.id == null) return;
  try { parentPort.postMessage({ id: msg.id, ...handle(msg) }); }
  catch (e) { try { parentPort.postMessage({ id: msg.id, ok: false, error: e.message }); } catch (e2) {} }
});
