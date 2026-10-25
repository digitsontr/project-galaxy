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
const cli = require(path.join(ROOT, 'lib', 'cli'));
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
    cli.cliExecFile('npm', ['install', '--no-save', '--no-audit', '--no-fund', '--loglevel=error', 'typescript@5', 'prettier@3'], { cwd: PROJ, timeout: 180000 }, (err, out, errOut) => res({ ok: !err, err: String(errOut || (err && err.message) || '') }));
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
let dbStore = { dbs: [], dbLog: [] };
const g = {
  ipcMain: { handle: (ch, fn) => { handlers[ch] = fn; } },
  app: { on: () => {}, getPath: () => TMP },
  shell: { showItemInFolder: () => {} },
  safeStorage: { isEncryptionAvailable: () => false },
  loadData: () => JSON.parse(JSON.stringify(dbStore)),
  saveData: d => { dbStore = d; },
  fs, path, spawn, execFile,
  cliSpawn: cli.cliSpawn, cliExecFile: cli.cliExecFile,
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
require(path.join(ROOT, 'ipc', 'db-git.js'))(g);
// db-git kendi gitProj'ini g'ye yazar (gerçek uygulamada scanProjects ile çalışır);
// iskeletin git testleri kendi kökünü kullansın diye stub geri yüklenir.
g.gitProj = id => id === 'p1' ? { proj: { path: PROJ } } : { error: 'yok' };
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

  // ---------- Terminal: gerçek kabuk (macOS/Linux python tty, Windows pipe satır disiplini) ----------
  sent = [];
  r = await H('galaxy:ptyStart')(evt, { id: 'it-pty', cwd: PROJ, cols: 80, rows: 24 });
  check('PTY: kabuk açıldı', r.ok, r.error || '');
  if (r.ok) {
    await new Promise(res => setTimeout(res, 1500));
    for (const ch of 'echo gx-pty-ok\r') await H('galaxy:ptyWrite')(evt, { id: 'it-pty', data: ch });
    let out = '';
    for (let i = 0; i < 40 && !/gx-pty-ok[\s\S]*gx-pty-ok/.test(out); i++) {
      await new Promise(res => setTimeout(res, 150));
      out = sent.filter(([ch]) => ch === 'pty:out').map(([, m]) => m.data).join('');
    }
    check('PTY: komut çalıştı + yankı', /gx-pty-ok[\s\S]*gx-pty-ok/.test(out), JSON.stringify(out.slice(-120)));
    await H('galaxy:ptyStop')(evt, 'it-pty');
  }

  // ---------- CLI: platformdan bağımsız çağrı (Windows'ta npm.cmd) ----------
  r = await new Promise(res => cli.cliExecFile('npm', ['--version'], { timeout: 30000 }, (err, out) => res({ ok: !err, out: String(out || '').trim(), err })));
  check('CLI: npm --version', r.ok && /^\d+\./.test(r.out), r.out || String(r.err && r.err.message));

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

  // ---------- MSSQL: gerçek SQL Server (yalnız GALAXY_IT_MSSQL=1; GX_MSSQL_PASS zorunlu) ----------
  if (process.env.GALAXY_IT_MSSQL === '1' && process.env.GX_MSSQL_PASS) {
    const ms = { type: 'mssql', host: process.env.GX_MSSQL_HOST || '127.0.0.1', port: +(process.env.GX_MSSQL_PORT || 1433), user: process.env.GX_MSSQL_USER || 'sa', password: process.env.GX_MSSQL_PASS, database: process.env.GX_MSSQL_DB || 'master' };
    r = await H('galaxy:dbSave')(evt, { name: 'IT SQL Server', ...ms });
    check('MSSQL: dbSave tipi korudu', r.ok && dbStore.dbs[0] && dbStore.dbs[0].type === 'mssql', JSON.stringify(r));
    const msId = r.id;
    r = await H('galaxy:dbTest')(evt, { id: msId });
    check('MSSQL: dbTest', r.ok, r.error || '');
    r = await H('galaxy:dbExec')(evt, { id: msId, database: ms.database, confirm: true, sql: 'CREATE TABLE dbo.gx_it_users (Id INT IDENTITY(1,1) PRIMARY KEY, Name NVARCHAR(50) NOT NULL)' });
    check('MSSQL: dbExec DDL (onaylı)', r.ok, r.error || '');
    r = await H('galaxy:dbTables')(evt, { id: msId, database: ms.database });
    check('MSSQL: tablo listede', r.ok && r.tables.includes('dbo.gx_it_users'), JSON.stringify(r.tables || []).slice(0, 120));
    r = await H('galaxy:dbInsertRow')(evt, { id: msId, database: ms.database, table: 'dbo.gx_it_users', values: { Name: 'İntegrasyon' } });
    check('MSSQL: insert (@p)', r.ok, r.error || '');
    r = await H('galaxy:dbRows')(evt, { id: msId, database: ms.database, table: 'dbo.gx_it_users', offset: 0 });
    check('MSSQL: rows + PK', r.ok && r.total === 1 && (r.pk || []).includes('Id'), 'total=' + r.total);
    const rowObj = r.rows && r.rows[0] ? Object.fromEntries(r.fields.map((f, i) => [f, r.rows[0][i]])) : {};
    r = await H('galaxy:dbUpdateRow')(evt, { id: msId, database: ms.database, table: 'dbo.gx_it_users', key: { Id: rowObj.Id }, changes: { Name: 'Güncel' } });
    check('MSSQL: update PK ile', r.ok, r.error || '');
    r = await H('galaxy:dbDeleteRow')(evt, { id: msId, database: ms.database, table: 'dbo.gx_it_users', key: { Id: rowObj.Id } });
    check('MSSQL: delete PK ile', r.ok, r.error || '');
    await H('galaxy:dbExec')(evt, { id: msId, database: ms.database, confirm: true, sql: 'DROP TABLE dbo.gx_it_users' });
  } else if (process.env.GALAXY_IT_MSSQL === '1') {
    console.log('· MSSQL bölümü atlandı (GX_MSSQL_PASS yok)');
  } else {
    console.log('· MSSQL bölümü atlandı (GALAXY_IT_MSSQL=1 + GX_MSSQL_PASS ile koş)');
  }

  const fail = results.filter(([, ok]) => !ok).length;
  console.log('\nSONUÇ: ' + (results.length - fail) + '/' + results.length + ' geçti');
  try { fs.rmSync(TMP, { recursive: true, force: true }); } catch (e) {}
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error('ENTEGRASYON ÇÖKTÜ:', e); process.exit(2); });
