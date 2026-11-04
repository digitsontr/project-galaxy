'use strict';
const R = require('../lib/review');
const fs = require('fs');
const os = require('os');
const path = require('path');

const results = [];
const check = (name, ok, detail) => {
  results.push({ name, ok: !!ok, detail: detail || '' });
  if (!ok) console.log('  FAIL', name, detail || '');
};

const secretDiff = [
  'diff --git a/src/auth.js b/src/auth.js',
  'index 111..222 100644',
  '--- a/src/auth.js',
  '+++ b/src/auth.js',
  '@@ -1,3 +1,6 @@',
  ' const app = 1;',
  '+const api_key = "sk_live_abcdefghijklmnop";',
  '+eval(userInput);',
  '+console.log("debug");',
  ' export default app;'
].join('\n');

const coll = R.collectFromDiff(secretDiff);
check('collect-secret', coll.some(f => f.rule === 'secret' && f.file === 'src/auth.js' && f.line === 2), JSON.stringify(coll.map(f => f.rule + '@' + f.line)));
check('collect-eval', coll.some(f => f.rule === 'injection' && f.line === 3), '');
check('collect-debug', coll.some(f => f.rule === 'debug' && f.line === 4), '');

const sqlDiff = [
  'diff --git a/db.py b/db.py',
  '--- a/db.py',
  '+++ b/db.py',
  '@@ -10,1 +10,2 @@',
  ' def q(name):',
  '+    return "SELECT * FROM users WHERE name=" + name'
].join('\n');
const sql = R.collectFromDiff(sqlDiff);
check('collect-sqli', sql.some(f => f.rule === 'sqli' && f.line === 11), JSON.stringify(sql));

const todoDiff = [
  'diff --git a/a.ts b/a.ts',
  '+++ b/a.ts',
  '@@ -4,0 +4,1 @@',
  '+  // TODO: fix later'
].join('\n');
check('collect-todo', R.collectFromDiff(todoDiff).some(f => f.rule === 'todo' && f.line === 4), '');

const scored = R.scoreFindings([{ severity: 'critical' }, { severity: 'minor' }]);
check('score-critical-fail', scored.gate === 'fail' && scored.score === 100 - 15 - 3, JSON.stringify(scored));
check('score-clean-pass', R.scoreFindings([]).gate === 'pass' && R.scoreFindings([]).score === 100, '');

const parsed = R.parseModelFindings('```json\n{"summary":"riskli","findings":[{"severity":"major","category":"bug","file":"src/a.js","line":9,"rule":"null","title":"null check","why":"patlar","fix":"guard"}]}\n```');
check('parse-json', parsed.summary === 'riskli' && parsed.findings[0] && parsed.findings[0].file === 'src/a.js' && parsed.findings[0].line === 9, JSON.stringify(parsed));

const merged = R.mergeFindings(coll, parsed.findings);
check('merge-keeps-both', merged.length >= coll.length, String(merged.length));

const run = R.buildRun({ projectId: 'p1', projectName: 'Alpha', findings: coll, files: ['src/auth.js'], diff: secretDiff });
check('run-schema', run.v === 1 && run.gate === 'fail' && run.score === 75 && run.findings.length >= 3, JSON.stringify({ score: run.score, gate: run.gate, n: run.findings.length }));

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'gx-rev-'));
R.saveRun(tmp, run);
const latest = R.latestRun(tmp, 'p1');
check('save-latest', latest && latest.id === run.id && latest.findings.length === run.findings.length, latest && latest.id);
const listed = R.listRuns(tmp, 'p1');
check('list-one', listed.length === 1 && listed[0].id === run.id, JSON.stringify(listed));
try { fs.rmSync(tmp, { recursive: true, force: true }); } catch (e) {}

const empty = R.buildRun({ projectId: 'p2', files: [], diff: '' });
check('empty-pass', empty.gate === 'pass' && empty.score === 100 && /yok/i.test(empty.summary), empty.summary);

const fail = results.filter(r => !r.ok);
console.log('review ' + (results.length - fail.length) + '/' + results.length);
if (fail.length) process.exit(1);
