'use strict';
// Gerçek entegrasyon testleri — Electron yok, sahte sunucu/ikiz yok:
// gerçek git deposu, projenin kendi typescript'i ile LSP, gerçek prettier,
// gerçek `node --inspect`. Ajanın gerçek Claude CLI turu yalnızca
// GALAXY_IT_CLAUDE=1 ile koşar (abonelikten küçük bir tur harcar).
// Koş: npm run test:integration   (düzenli `npm test`'in parçası değildir)
const fs = require('fs');
const path = require('path');
const os = require('os');
const { spawn, execFile } = require('child_process');
const { createRequire } = require('module');

const ROOT = path.join(__dirname, '..');
const repoRequire = createRequire(path.join(ROOT, 'main.js'));
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'gx-it-'));
const PROJ = path.join(TMP, 'proj');
fs.mkdirSync(path.join(PROJ, 'src'), { recursive: true });
// LSP/format, projenin KENDİ araçlarını kullanır — fikstüre gerçek npm kurulumu yapılır
// (ağ yoksa bu iki bölüm "atlandı" sayılır, test yine de yeşil biter; ağ varken tam koşar).
async function ensureTools() {
  const need = ['typescript', 'prettier'].filter(m => !fs.existsSync(path.join(PROJ, 'node_modules', m, 'package.json')));
  if (!need.length) return true;
  const r = await new Promise(res => {
    execFile('npm', ['install', '--no-save', '--no-audit', '--no-fund', '--loglevel=error', 'typescript@5', 'prettier@3'], { cwd: PROJ, timeout: 180000 }, (err, out, errOut) => res({ ok: !err, err: String(errOut || (err && err.message) || '') }));
  });
  if (!r.ok) console.log('· fikstür araçları kurulamadı (ağ?): ' + r.err.slice(0, 160));
  return r.ok;
}
fs.writeFileSync(path.join(PROJ, 'package.json'), JSON.stringify({ name: 'it-proj', scripts: { dev: 'node src/a.js', test: 'node --test' } }, null, 2));
fs.writeFileSync(path.join(PROJ, 'src', 'a.ts'), 'export function topla(a: number, b: number) { return a + b; }\nconst sonuc: string = topla(2, 3);\nconsole.log(sonuc);\n');
fs.writeFileSync(path.join(PROJ, 'src', 'a.js'), 'const x = { a: 1 };\nconsole.log(x.a);\n');
fs.writeFileSync(path.join(PROJ, 'src', 'ugly.js'), 'const   x={a:1,b:2};\nconsole.log(  x  )\n');

const handlers = {};
const execGitP = (cwd, args, timeout) => new Promise(res => {
  execFile('git', args, { cwd, timeout: timeout || 20000, maxBuffer: 8 * 1024 * 1024 }, (err, out, errOut) => res({ ok: !err, out: String(out || ''), err: String(errOut || '') }));
});
const known = new Set([PROJ]);
const g = {
  ipcMain: { handle: (ch, fn) => { handlers[ch] = fn; } },
  app: { on: () => {} },
  fs, path, spawn, execFile,
  knownPaths: known,
  ENV: { ...process.env, GIT_CONFIG_NOSYSTEM: '1', HOME: os.homedir() },
  DATA_DIR: path.join(TMP, 'data'),
  APP_DIR: ROOT,
  IS_MAS: false,
  isRemotePath: p => String(p || '').startsWith('ssh://'),
  safeRel: rel => { const s = String(rel || '').replace(/^\/+/, ''); if (!s || s.includes('..')) return null; return s; },
  gitProj: id => id === 'p1' ? { proj: { path: PROJ } } : { error: 'yok' },
  execGit: (cwd, args, timeout) => execGitP(cwd, args, timeout),
};
require(path.join(ROOT, 'ipc', 'devtools.js'))(g);
require(path.join(ROOT, 'ipc', 'agent-engine.js'))(g);
const H = n => handlers[n];
let sent = [];
const evt = { sender: { isDestroyed: () => false, send: (ch, m) => sent.push([ch, m]) } };

const results = [];
const check = (name, ok, detail) => { results.push([name, !!ok]); console.log((ok ? '✓' : '✗') + ' ' + name + (detail ? ' (' + detail + ')' : '')); };
const git = args => execGitP(PROJ, args);

(async () => {
  let r;
  const toolsOk = await ensureTools();
  if (toolsOk) {
    // ---------- LSP: gerçek TypeScript ----------
    const aTs = fs.readFileSync(path.join(PROJ, 'src', 'a.ts'), 'utf8');
    r = await H('galaxy:langStatus')(evt, { root: PROJ });
    check('LSP: typescript bulundu', r.ok && !!r.version, String(r.version || ''));
    r = await H('galaxy:langRequest')(evt, { root: PROJ, kind: 'diag', file: 'src/a.ts', content: aTs });
    check('LSP: tip hatası yakalandı', r.ok && r.problems.some(p => /not assignable|number/.test(p.text)), JSON.stringify(r.problems || []).slice(0, 160));
    const chTopla = aTs.split('\n')[1].indexOf('topla') + 2;
    r = await H('galaxy:langRequest')(evt, { root: PROJ, kind: 'def', file: 'src/a.ts', content: aTs, line: 2, ch: chTopla });
    check('LSP: tanıma git', r.ok && r.defs.length && r.defs[0].line === 1, JSON.stringify(r.defs || []));
    r = await H('galaxy:langRequest')(evt, { root: PROJ, kind: 'rename', file: 'src/a.ts', content: aTs, line: 1, ch: 20, newName: 'sum' });
    check('LSP: güvenli rename', r.ok && r.files.length === 1 && /sum\(2, 3\)/.test(r.files[0].content) && !/topla/.test(r.files[0].content), '');

    // ---------- Format: gerçek prettier ----------
    const ugly = fs.readFileSync(path.join(PROJ, 'src', 'ugly.js'), 'utf8');
    r = await H('galaxy:formatFile')(evt, { root: PROJ, file: 'src/ugly.js', content: ugly });
    check('Format: prettier çalıştı', r.ok && (r.tools || []).includes('prettier') && /const x = \{ a: 1, b: 2 \}/.test(r.content), (r.tools || []).join(','));
  } else {
    console.log('· LSP/Format bölümleri atlandı (fikstür araçları yok)');
  }

  // ---------- package.json scriptleri ----------
  r = await H('galaxy:pkgScripts')(evt, { root: PROJ });
  check('pkgScripts okundu', r.ok && r.scripts.some(s => s.name === 'dev'), '');

  // ---------- Debugger: gerçek --inspect süreci ----------
  sent = [];
  r = await H('galaxy:debugStart')(evt, { root: PROJ, file: 'src/a.js' });
  check('debugStart süreç açtı', r.ok && !!r.id, '');
  await new Promise(res => setTimeout(res, 1500));
  check('debug:ready ws adresi geldi', sent.some(([ch]) => ch === 'debug:ready'), '');
  if (r.id) await H('galaxy:jobStop')(evt, { id: r.id });

  // ---------- Git: gerçek depo ----------
  await git(['init', '-q']); await git(['config', 'user.email', 't@t.t']); await git(['config', 'user.name', 'T']);
  await git(['add', '-A']); await git(['commit', '-qm', 'ilk']);
  r = await H('galaxy:gitBranches')(evt, { projectId: 'p1' });
  check('Git: dal listesi', r.ok && r.branches.length >= 1, JSON.stringify((r.branches || []).map(b => b.name)));
  await git(['checkout', '-qb', 'ozellik']);
  fs.writeFileSync(path.join(PROJ, 'f.txt'), 'ozellik satiri\n');
  await git(['add', '-A']); await git(['commit', '-qm', 'ozellik isi']);
  r = await H('galaxy:gitSwitchBranch')(evt, { projectId: 'p1', branch: r.branches[0].name });
  check('Git: dal değiştir (f.txt bu dalda yok)', r.ok !== false && !fs.existsSync(path.join(PROJ, 'f.txt')), '');
  fs.writeFileSync(path.join(PROJ, 'wip.txt'), 'yarim is\n');
  r = await H('galaxy:gitStashPush')(evt, { projectId: 'p1', msg: 'it-stash', includeUntracked: true });
  check('Git: stash push', r.ok !== false && !fs.existsSync(path.join(PROJ, 'wip.txt')), '');
  r = await H('galaxy:gitStashList')(evt, { projectId: 'p1' });
  check('Git: stash listesi', r.ok && (r.stashes || r.list || []).length >= 1, '');
  const stashRef = ((r.stashes || r.list || [])[0] || {}).ref || 'stash@{0}';
  r = await H('galaxy:gitStashApply')(evt, { projectId: 'p1', ref: stashRef });
  check('Git: stash apply geri getirdi', fs.existsSync(path.join(PROJ, 'wip.txt')), '');
  // gerçek çakışma: iki dal aynı satırı değiştirsin
  await git(['checkout', '-q', 'ozellik']);
  fs.writeFileSync(path.join(PROJ, 'c.txt'), 'taban\n'); await git(['add', '-A']); await git(['commit', '-qm', 'taban']);
  await git(['checkout', '-qb', 'dal-a']); fs.writeFileSync(path.join(PROJ, 'c.txt'), 'A tarafi\n'); await git(['commit', '-qam', 'A']);
  await git(['checkout', '-q', 'ozellik']); await git(['checkout', '-qb', 'dal-b']); fs.writeFileSync(path.join(PROJ, 'c.txt'), 'B tarafi\n'); await git(['commit', '-qam', 'B']);
  await git(['merge', 'dal-a']);
  r = await H('galaxy:gitConflicts')(evt, { projectId: 'p1' });
  const confs = r.conflicts || r.files || [];
  check('Git: çakışma algılandı', r.ok && confs.length >= 1, JSON.stringify(confs).slice(0, 120));
  r = await H('galaxy:gitConflictVersions')(evt, { projectId: 'p1', file: 'c.txt' });
  check('Git: bizim/onların sürümleri', r.ok && /B tarafi/.test(r.ours || '') && /A tarafi/.test(r.theirs || ''), '');
  r = await H('galaxy:gitResolveConflict')(evt, { projectId: 'p1', file: 'c.txt', content: 'B tarafi\n' });
  check('Git: çakışma çözüldü+eklendi', r.ok !== false, '');

  // ---------- Ajan: gerçek Claude CLI (yalnız GALAXY_IT_CLAUDE=1) ----------
  if (process.env.GALAXY_IT_CLAUDE === '1') {
    await H('galaxy:agentConfigSave')(evt, { engine: 'cli' });
    sent = [];
    r = await H('galaxy:agentSend')(evt, { root: PROJ, sessionKey: 'it', text: 'Sadece TAMAM yaz, baska hicbir sey yapma ve yazma.' });
    check('Ajan(CLI): koşu başladı', r.ok && r.engine === 'cli', JSON.stringify(r).slice(0, 120));
    const done = await new Promise(res => {
      const t0 = Date.now();
      const iv = setInterval(() => {
        const evs = sent.filter(([ch]) => ch === 'agent:event').map(([, m]) => m);
        const fin = evs.find(m => m.kind === 'done' || m.kind === 'error');
        if (fin) { clearInterval(iv); res({ fin, text: evs.filter(m => m.kind === 'text').map(m => m.text || '').join('') }); }
        else if (Date.now() - t0 > 150000) { clearInterval(iv); res(null); }
      }, 500);
    });
    check('Ajan(CLI): gerçek tur tamam', !!done && done.fin.kind === 'done' && /TAMAM/.test(done.text), done ? done.text.slice(0, 80) : 'zaman aşımı');
  } else {
    console.log('· Ajan(CLI) gerçek tur atlandı (GALAXY_IT_CLAUDE=1 ile koş)');
  }

  const fail = results.filter(([, ok]) => !ok).length;
  console.log('\nSONUÇ: ' + (results.length - fail) + '/' + results.length + ' geçti');
  try { fs.rmSync(TMP, { recursive: true, force: true }); } catch (e) {}
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error('ENTEGRASYON ÇÖKTÜ:', e); process.exit(2); });
