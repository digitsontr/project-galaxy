'use strict';
// Kod inceleme motoru — saf Node. IPC katmanı git diff toplar, burası
// kolektör + skor + JSON şema + DATA_DIR/reviews saklama.
const fs = require('fs');
const path = require('path');

const SEV = ['blocker', 'critical', 'major', 'minor', 'info'];
const CAT = ['bug', 'vulnerability', 'hotspot', 'smell', 'duplication', 'complexity'];
const WEIGHT = { blocker: 20, critical: 15, major: 7, minor: 3, info: 1 };
const MAX_FINDINGS = 40;
const SCHEMA_V = 1;

const REVIEW_PROMPT = [
  'Sen kıdemli bir kod inceleyicisisin. Sana UNİFİED DIFF verilecek (yalnız eklenen satırlar yeni kod).',
  'Yalnız JSON döndür. Markdown, açıklama, kod çiti yok. Şema:',
  '{"summary":"1-2 cümle Türkçe","findings":[{"severity":"blocker|critical|major|minor|info","category":"bug|vulnerability|hotspot|smell|duplication|complexity","file":"rel/path","line":1,"rule":"kisa-id","title":"kısa başlık","why":"neden önemli","fix":"somut düzeltme","snippet":"ilgili satır"}]}',
  'Kurallar: sahte bulgu uydurma. Diff’te görünmeyen dosyaya yazma. Gizli anahtar, enjeksiyon, SQL birleştirme, eval/innerHTML, yarım iş (TODO) ve üretimde debug çıktısı öncelikli.',
  'En fazla 25 bulgu. Önem sırası: blocker > critical > major > minor > info.',
  'Satır numarası yeni dosyadaki satır (hunk +N).'
].join(' ');

function reviewDir(dataDir, projectId) {
  const safe = String(projectId || 'unknown').replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 80) || 'unknown';
  return path.join(dataDir, 'reviews', safe);
}

function newId() {
  return 'r-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 8);
}

function normSev(s) {
  const k = String(s || '').toLowerCase().trim();
  if (SEV.includes(k)) return k;
  if (/engelleyici|blocker/.test(k)) return 'blocker';
  if (/kritik|critical/.test(k)) return 'critical';
  if (/büyük|buyuk|major|high/.test(k)) return 'major';
  if (/küçük|kucuk|minor|low/.test(k)) return 'minor';
  return 'info';
}

function normCat(s) {
  const k = String(s || '').toLowerCase().trim();
  if (CAT.includes(k)) return k;
  if (/bug|hata/.test(k)) return 'bug';
  if (/vuln|güvenlik aç|guvenlik ac/.test(k)) return 'vulnerability';
  if (/hotspot|risk/.test(k)) return 'hotspot';
  if (/smell|koku/.test(k)) return 'smell';
  if (/dup/.test(k)) return 'duplication';
  if (/complex|karmaş/.test(k)) return 'complexity';
  return 'smell';
}

function normalizeFinding(raw, source) {
  if (!raw || typeof raw !== 'object') return null;
  const file = String(raw.file || raw.path || '').replace(/\\/g, '/').replace(/^\.\//, '').trim();
  if (!file || file === '/dev/null') return null;
  const line = Math.max(1, parseInt(raw.line, 10) || 1);
  const title = String(raw.title || raw.message || raw.rule || 'Bulgu').trim().slice(0, 160);
  return {
    severity: normSev(raw.severity || raw.sev),
    category: normCat(raw.category || raw.type),
    file,
    line,
    rule: String(raw.rule || 'review').trim().slice(0, 48) || 'review',
    title,
    why: String(raw.why || raw.reason || '').trim().slice(0, 400),
    fix: String(raw.fix || raw.suggestion || '').trim().slice(0, 400),
    snippet: String(raw.snippet || raw.code || '').trim().slice(0, 200),
    source: source || raw.source || 'model'
  };
}

function findingKey(f) {
  return [f.file, f.line, f.rule, f.title].join('|').toLowerCase();
}

function dedupeFindings(list) {
  const seen = new Set();
  const out = [];
  for (const f of list || []) {
    if (!f) continue;
    const k = findingKey(f);
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(f);
    if (out.length >= MAX_FINDINGS) break;
  }
  return out;
}

function mergeFindings() {
  const all = [];
  for (let i = 0; i < arguments.length; i++) {
    const arr = arguments[i];
    if (Array.isArray(arr)) for (const f of arr) all.push(f);
  }
  const rank = { blocker: 0, critical: 1, major: 2, minor: 3, info: 4 };
  return dedupeFindings(all).sort((a, b) => (rank[a.severity] - rank[b.severity]) || String(a.file).localeCompare(b.file) || (a.line - b.line));
}

function countsOf(findings) {
  const c = { blocker: 0, critical: 0, major: 0, minor: 0, info: 0 };
  for (const f of findings || []) if (c[f.severity] != null) c[f.severity]++;
  return c;
}

function scoreFindings(findings) {
  const counts = countsOf(findings);
  let score = 100;
  for (const f of findings || []) score -= WEIGHT[f.severity] || 3;
  score = Math.max(0, Math.min(100, score));
  const hard = counts.blocker > 0 || counts.critical > 0;
  const gate = (hard || score < 70) ? 'fail' : 'pass';
  return { score, gate, counts };
}

function scanAddedLine(out, file, line, text) {
  const t = String(text || '');
  const skipSecretFile = /\.(md|example|sample|template)$/i.test(file) || /test|spec|fixture/i.test(file);
  const skipDebugFile = /\.(test|spec)\.[jt]sx?$|\btests?\/|\b__tests__\b/i.test(file);
  const add = (severity, category, rule, title, why, fix) => {
    out.push({ severity, category, file, line, rule, title, why, fix, snippet: t.trim().slice(0, 200), source: 'collector' });
  };
  if (!skipSecretFile && /(api[_-]?key\s*[:=]\s*['"][^'"]{8,}|secret_key\s*[:=]|begin (rsa |openssh )?private key|ghp_[A-Za-z0-9]{20,}|sk_live_[A-Za-z0-9]{8,}|AKIA[0-9A-Z]{16}|xox[baprs]-)/i.test(t)) {
    add('critical', 'vulnerability', 'secret', 'Gizli anahtar diff’te', 'Commit’e girecek sır gibi duruyor.', 'Anahtarı env / Keychain’e taşı; rotasyon yap.');
  }
  if (/\beval\s*\(|new Function\s*\(|document\.write\s*\(|\.innerHTML\s*=/i.test(t)) {
    add('major', 'hotspot', 'injection', 'Tehlikeli dinamik kod', 'Bu kalıp enjeksiyona açık.', 'Güvenli API kullan; kullanıcı girdisini birleştirme.');
  }
  if (/(SELECT|INSERT|UPDATE|DELETE)\s+[^;]*['"`]\s*\+|query\s*=\s*['"`][^'"`]*['"`]\s*\+/i.test(t)) {
    add('critical', 'vulnerability', 'sqli', 'SQL birleştirme', 'Kullanıcı girdisi sorguya yapışıyor olabilir.', 'Parametreli sorgu kullan.');
  }
  if (/\bTODO\b|\bFIXME\b|\bHACK\b/.test(t)) {
    add('info', 'smell', 'todo', 'Açık TODO', 'Bu satır işi yarım bırakıyor.', 'Kapat veya pano görevi aç.');
  }
  if (!skipDebugFile && /\bconsole\.(log|debug|info)\s*\(|\bdebugger\b|\bprint\s*\(/.test(t)) {
    add('minor', 'smell', 'debug', 'Debug çıktısı', 'Üretim kodunda kalabilir.', 'Kaldır veya gerçek logger kullan.');
  }
}

function collectFromDiff(diffText) {
  const findings = [];
  let file = '';
  let newLine = 0;
  const lines = String(diffText || '').split('\n');
  for (const raw of lines) {
    if (raw.startsWith('diff --git ')) {
      const m = raw.match(/\sb\/(.+)$/);
      file = m ? m[1].trim() : '';
      continue;
    }
    if (raw.startsWith('+++ b/')) { file = raw.slice(6).trim(); continue; }
    if (raw.startsWith('+++ /dev/null')) { file = ''; continue; }
    if (raw.startsWith('@@')) {
      const m = raw.match(/\+(\d+)/);
      newLine = m ? parseInt(m[1], 10) : 0;
      continue;
    }
    if (raw.startsWith('+') && !raw.startsWith('+++')) {
      if (file) scanAddedLine(findings, file, newLine, raw.slice(1));
      newLine++;
      continue;
    }
    if (raw.startsWith('-') && !raw.startsWith('---')) continue;
    if (raw.startsWith('\\') || raw.startsWith('index ') || raw.startsWith('new file') || raw.startsWith('deleted file') || raw.startsWith('---')) continue;
    if (file) newLine++;
  }
  return dedupeFindings(findings);
}

function parseModelFindings(text) {
  const s = String(text || '');
  const fence = s.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const raw = fence ? fence[1] : s;
  const start = raw.indexOf('{');
  const end = raw.lastIndexOf('}');
  let findings = [];
  let summary = '';
  if (start >= 0 && end > start) {
    try {
      const j = JSON.parse(raw.slice(start, end + 1));
      if (Array.isArray(j.findings)) findings = j.findings;
      else if (Array.isArray(j)) findings = j;
      summary = String(j.summary || '').trim();
    } catch (e) { /* düz metin yedeği */ }
  }
  if (!findings.length) {
    const blocks = s.split(/##\s*İhlal\s*:/i).slice(1);
    for (const b of blocks) {
      const title = (b.split('\n')[0] || '').trim();
      const loc = b.match(/([A-Za-z0-9_./-]+):(\d+)/);
      findings.push({
        title,
        file: loc ? loc[1] : '',
        line: loc ? +loc[2] : 1,
        severity: (b.match(/önem\s*:\s*(\w+)/i) || [])[1],
        category: (b.match(/kategori\s*:\s*(\w+)/i) || [])[1],
        why: ((b.match(/neden\s*:\s*(.+)/i) || [])[1] || '').trim(),
        fix: ((b.match(/düzelt\s*:\s*(.+)/i) || [])[1] || '').trim()
      });
    }
  }
  return {
    summary,
    findings: findings.map(f => normalizeFinding(f, 'model')).filter(Boolean)
  };
}

function filesFromDiff(diffText) {
  const set = new Set();
  String(diffText || '').split('\n').forEach(l => {
    let m = l.match(/^\+\+\+ b\/(.+)$/);
    if (!m) m = l.match(/^diff --git a\/.+ b\/(.+)$/);
    if (m && m[1] && m[1] !== '/dev/null') set.add(m[1].trim());
  });
  return Array.from(set);
}

function fakeAddDiff(rel, lines) {
  const body = (lines || []).map(l => '+' + l).join('\n');
  const n = Math.max(1, (lines || []).length);
  return ['diff --git a/' + rel + ' b/' + rel, 'new file mode 100644', '--- /dev/null', '+++ b/' + rel, '@@ -0,0 +1,' + n + ' @@', body].join('\n');
}

function buildRun(opts) {
  const findings = mergeFindings(opts.findings || []);
  const scored = scoreFindings(findings);
  const files = Array.isArray(opts.files) ? opts.files : filesFromDiff(opts.diff || '');
  const n = findings.length;
  let summary = String(opts.summary || '').trim();
  if (!summary) {
    if (!(opts.diff || '').trim() && !files.length) summary = 'Commitlenmemiş değişiklik yok.';
    else if (!n) summary = 'Kolektör ve yargıç kritik bulgu görmedi.';
    else summary = n + ' bulgu · kapı ' + (scored.gate === 'fail' ? 'KALDI' : 'GEÇTİ') + ' · ' + scored.score;
  }
  return {
    v: SCHEMA_V,
    id: opts.id || newId(),
    createdAt: opts.createdAt || new Date().toISOString(),
    projectId: opts.projectId || '',
    projectName: opts.projectName || '',
    scope: opts.scope || 'dirty',
    engine: opts.engine || 'collectors',
    files,
    diffBytes: Number(opts.diffBytes) || String(opts.diff || '').length,
    findings,
    counts: scored.counts,
    score: scored.score,
    gate: scored.gate,
    summary,
    error: opts.error || '',
    status: opts.status || 'done'
  };
}

function saveRun(dataDir, run) {
  if (!dataDir || !run || !run.projectId) return run;
  const dir = reviewDir(dataDir, run.projectId);
  fs.mkdirSync(dir, { recursive: true });
  const file = path.join(dir, (run.id || newId()) + '.json');
  fs.writeFileSync(file, JSON.stringify(run, null, 2), 'utf8');
  return run;
}

function listRuns(dataDir, projectId) {
  const dir = reviewDir(dataDir, projectId);
  let names = [];
  try { names = fs.readdirSync(dir).filter(f => f.endsWith('.json')); } catch (e) { return []; }
  const rows = [];
  for (const name of names) {
    try {
      const j = JSON.parse(fs.readFileSync(path.join(dir, name), 'utf8'));
      rows.push({
        id: j.id || name.replace(/\.json$/, ''),
        createdAt: j.createdAt || '',
        score: j.score,
        gate: j.gate,
        summary: j.summary || '',
        files: (j.files || []).length,
        findings: (j.findings || []).length
      });
    } catch (e) {}
  }
  return rows.sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt))).slice(0, 40);
}

function getRun(dataDir, projectId, runId) {
  const dir = reviewDir(dataDir, projectId);
  const id = String(runId || '').replace(/[^a-zA-Z0-9._-]/g, '');
  if (!id) return null;
  try { return JSON.parse(fs.readFileSync(path.join(dir, id + '.json'), 'utf8')); } catch (e) { return null; }
}

function latestRun(dataDir, projectId) {
  const list = listRuns(dataDir, projectId);
  if (!list.length) return null;
  return getRun(dataDir, projectId, list[0].id);
}

module.exports = {
  SCHEMA_V, REVIEW_PROMPT, MAX_FINDINGS,
  collectFromDiff, parseModelFindings, scoreFindings, mergeFindings,
  normalizeFinding, countsOf, filesFromDiff, fakeAddDiff, buildRun,
  saveRun, listRuns, getRun, latestRun, reviewDir, newId
};
