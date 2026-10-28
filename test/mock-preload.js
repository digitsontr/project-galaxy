// Smoke-test için sahte window.galaxy köprüsü — gerçek backend olmadan UI'ı boot eder ve
// temel akışları (asistan, komut yönlendirme, sekmeler) sürebilecek kadar veri sağlar.
const { contextBridge } = require('electron');

const P = (id, name, branch, stale) => ({
  id, universe: 'u', name, group: name, status: 'active', progress: 55, stage: name + ' geliştirme',
  desc: name + ' açıklaması.', plan: [['Görev bir', true], ['Görev iki', false]], notes: 'Not.',
  links: [], git: { branch: branch || 'main', ahead: 1, behind: 0, dirty: 2 }, staleDays: stale == null ? 2 : stale,
  hasReadme: true, path: '/x/' + id, tech: ['node']
});
const projects = [P('alpha', 'AlphaAPI', 'main', 1), P('beta', 'BetaWeb', 'dev', 3), P('gamma', 'GammaBot', 'main', 40), P('delta', 'DeltaData', 'main', 9)];
const universes = [{ id: 'u', name: 'Şirket', subtitle: '~/work', root: '/x', count: 4 }, { id: 'u2', name: 'Papilon', subtitle: '~/pap', root: '/pap', count: 2 }];
const mockRepos = () => [{ path: '/x/alpha', name: 'alpha', rel: 'alpha', isGit: true }, { path: '/x/epsilon', name: 'epsilon', rel: 'epsilon', isGit: true }, { path: '/x/lab/zeta', name: 'zeta', rel: 'lab/zeta', isGit: true }]
  .map(r => ({ ...r, already: projects.some(p => p.path === r.path) }));
let lastTerminal = '';
let mockTodoSkip = new Set();
let claudeCb = null, shellCb = null, agentCb = null, agentEvCb = null;

contextBridge.exposeInMainWorld('galaxy', {
  load: async () => ({ universes, projects, agents: [{ id: 'a1', name: 'ATLAS', role: 'CTO', color: '#61dcff', prompt: 'Sen ATLAS\'sın — kişisel CTO. Durumu net raporla.', presets: [{ label: 'Durum raporu ver', ask: 'Durum raporu ver' }, { label: 'Riskleri sırala', ask: 'Riskleri sırala' }, { label: 'Bu hafta neye odaklanayım', ask: 'Bu hafta neye odaklanayım' }] }], alerts: [], settings: { lang: 'tr' }, ignored: [] }),
  profileGet: async () => ({ lang: 'tr', name: 'Furkan', about: 'geliştirici, Galaxy kaptanı' }),
  settingsGet: async () => ({ settings: { lang: 'tr', focusMin: 25, uiTheme: 'apex' } }),
  gitLog: async () => ({ ok: true, branch: 'main', ahead: 1, behind: 0, commits: [{ h: 'a1b2c3d', an: 'Furkan', ad: '2s', s: 'fix' }], files: [{ path: 'src/index.js', label: 'Değişti', staged: false, unstaged: true }, { path: 'README.md', label: 'Değişti', staged: false, unstaged: true }], dirty: 2, dirtyFiles: [' M src/index.js', ' M README.md'], staged: 0, branches: ['main', 'dev'] }),
  tree: async () => [{ name: 'src', dir: true, children: [{ name: 'index.js', dir: false }] }, { name: 'README.md', dir: false }],
  file: async (a, b) => {
    const rel = (a && typeof a === 'object') ? a.rel : (b || a);
    const name = (rel||'README.md').split('/').pop();
    const html = /\.html?$/i.test(rel||'');
    const isCode = /\.(js|ts|py|swift)$/i.test(rel||'');
    return { name, rel, size: 420, kind: html ? 'html' : (/\.md$/i.test(rel||'') ? 'markdown' : 'text'), url: html ? 'about:blank' : undefined, content: html ? '<h1>Demo</h1><p>Sayfa.</p>' : (isCode ? 'import express from "express";\n\nconst app = express();\napp.get("/health", (req, res) => {\n  res.json({ ok: true, service: "AlphaAPI" });\n});\n\napp.listen(3000);\n' : '# AlphaAPI\n\n**Servis** dokümantasyonu.\n\n## Yapılacaklar\n\n- [ ] Görev bir\n- [x] Görev iki\n') };
  },
  syncReadme: async () => ({ ok: true, added: 2, plan: [{ text: 'Görev bir', done: false }, { text: 'Görev iki', done: true }] }),
  readme: async () => ({ name: 'README.md', content: '# AlphaAPI\n\nBackend.\n\n## Yapılacaklar\n\n- [ ] Görev bir\n' }),
  fileWrite: async () => ({ ok: true }),
  save: async () => true,
  dbList: async () => [], dbTables: async () => ({ ok: true, tables: [] }),
  scheduleList: async () => [{ id: 's1', name: 'Nightly', agentId: 'a1', prompt: 'Durum raporu ver', type: 'daily', hour: 2, minute: 0, weekday: 1, enabled: true }],
  scheduleSave: async (s) => ({ ok: true, id: (s && s.id) || 's1' }),
  sshList: async () => [], sshKeys: async () => ({ ok: true, keys: ['id_ed25519'] }),
  todoList: async () => [{ id: 't1', text: 'API', done: false, status: 'todo', projectId: 'alpha' }],
  todoSeedFromPlans: async () => ({ ok: true, added: 0 }),
  todoSkip: async (opts) => {
    const pid = String((opts && opts.projectId) || '');
    const n = String((opts && opts.text) || '').replace(/\s+/g, ' ').trim().toLowerCase();
    const key = pid + '::' + n;
    if (opts && opts.has) return { ok: true, skip: mockTodoSkip.has(key) };
    if (pid && n) mockTodoSkip.add(key);
    return { ok: true, skip: true };
  },
  todoSkipHas: async (opts) => {
    const pid = String((opts && opts.projectId) || '');
    const n = String((opts && opts.text) || '').replace(/\s+/g, ' ').trim().toLowerCase();
    return { ok: true, skip: mockTodoSkip.has(pid + '::' + n) };
  },
  todoAdd: async () => true,
  todoSetStatus: async () => true,
  todoDelete: async () => true,
  reports: async () => [], dockerStatus: async () => ({ ok: true, running: true, containers: 1, containersRunning: 1, images: 1 }),
  dockerPs: async () => ({ ok: true, containers: [{ id: 'c1', name: 'web', image: 'nginx', state: 'running', status: 'Up 2h', ports: '0.0.0.0:8080->80/tcp' }] }),
  claudeStop: async () => ({ ok: true }),
  openLocalPort: async () => ({ ok: true }),
  planetContext: async () => ({ ok: true, remote: false, env: { present: true, example: true, missing: ['REDIS_URL'], hasDatabaseUrl: true, dbHint: { type: 'postgres', host: 'localhost', port: 5432, database: 'alpha', user: 'alpha' } }, compose: { file: 'compose.yaml', services: ['web', 'db'], project: 'alphaapi', ports: [3000] }, scripts: [{ name: 'dev', cmd: 'vite', kind: 'npm' }, { name: 'test', cmd: 'vitest', kind: 'npm' }], migrate: { kind: 'prisma', label: 'Prisma migrate', run: 'npx prisma migrate dev', seed: true }, ports: [3000], listening: [3000], pkgName: 'alpha', related: [{ id: 'beta', name: 'BetaWeb', why: 'aynı klasör' }], boundDbId: '', boundDbName: '' }),
  planetBindDb: async () => ({ ok: true, id: 'db1', name: 'Alpha DB' }),
  planetCompose: async ({ action } = {}) => ({ ok: true, logs: action === 'logs' ? 'listening on 3000\n' : '' }),
  planetPrs: async () => ({ ok: true, prs: [{ number: 12, title: 'fix: login', url: 'https://github.com/ex/alpha/pull/12', state: 'OPEN', headRefName: 'fix/login' }] }),
  planetPrCreate: async () => ({ ok: true, url: 'https://github.com/ex/alpha/pull/13' }),
  probePort: async () => ({ ok: true, listening: true }),
  openPrUrl: async () => ({ ok: true }),
  planetIssues: async () => ({ ok: true, issues: [{ number: 4, title: 'flaky login', url: 'https://github.com/ex/alpha/issues/4', state: 'OPEN' }] }),
  planetCi: async () => ({ ok: true, runs: [{ databaseId: 9, name: 'CI', status: 'completed', conclusion: 'success', displayTitle: 'CI', url: 'https://github.com/ex/alpha/actions/runs/9' }] }),
  universeTraffic: async () => ({ ok: true, rows: [{ id: 'alpha', name: 'AlphaAPI', compose: 'compose.yaml', composeUp: true, listening: [3000], ports: [3000] }] }),
  universeGrep: async ({ query } = {}) => ({ ok: true, matches: [{ planet: 'AlphaAPI', projectId: 'alpha', file: 'src/index.js', line: 12, text: String(query || 'hit') }] }),
  dockerImages: async () => ({ ok: true, images: [{ id: 'i1', repo: 'nginx', tag: 'latest', size: '142MB', created: '2 gün önce' }] }),
  dockerInspect: async ({ id } = {}) => {
    if (id === 'i1') return { ok: true, inspect: { Id: 'sha256:i1', RepoTags: ['nginx:latest'], Size: 148897792, Created: '2026-01-01T00:00:00Z', Architecture: 'arm64', Os: 'linux' }, json: '{\n  "Id": "sha256:i1",\n  "RepoTags": ["nginx:latest"],\n  "Size": 148897792\n}' };
    return { ok: true, inspect: { Id: 'c1', Name: '/web', Created: '2026-01-01T00:00:00Z', State: { Status: 'running', Running: true, StartedAt: '2026-09-14T00:00:00Z' }, Config: { Image: 'nginx', Cmd: ['nginx', '-g', 'daemon off;'] }, NetworkSettings: { Ports: { '80/tcp': [{ HostIp: '0.0.0.0', HostPort: '8080' }] } } }, json: '{\n  "Name": "/web",\n  "Config": { "Image": "nginx" }\n}' };
  },
  dockerLogs: async () => ({ ok: true, logs: 'listening on 80\n' }),
  dockerLogStream: async () => ({ ok: true }),
  dockerLogStop: async () => ({ ok: true }),
  dockerAction: async () => ({ ok: true }),
  dockerImageAction: async () => ({ ok: true }),
  ptyStart: async (o) => { if (ptyCb) setTimeout(() => ptyCb({ id: o && o.id, data: 'galaxy-pty hazır\r\n$ ' }), 30); return { ok: true }; },
  ptyWrite: async () => ({ ok: true }),
  ptyResize: async () => ({ ok: true }),
  ptyStop: async () => ({ ok: true }),
  watchStart: async () => ({ ok: true }),
  watchStop: async () => ({ ok: true }),
  diagRun: async () => ({ ok: true, problems: [{ file: 'src/index.js', line: 2, col: 1, severity: 'error', text: 'src/index.js(2,1): error TS2304 mock diag hatası', source: 'tsc' }], ran: ['tsc'] }),
  gitApplyPatch: async () => ({ ok: true }),
  gitRestoreFiles: async () => ({ ok: true }),
  fileWriteRemote: async () => ({ ok: true }),
  gitDiff: async () => ({ ok: true, out: 'diff --git a/src/index.js b/src/index.js\nindex 111..222 100644\n--- a/src/index.js\n+++ b/src/index.js\n@@ -1,3 +1,4 @@\n import express from "express";\n+\n const app = express();\n app.get("/health", (req, res) => {' }),
  grepReplacePreview: async ({ query } = {}) => ({ ok: true, total: 2, files: [{ rel: 'src/index.js', count: 2, hits: [{ line: 1, before: 'import "' + (query || 'x') + '"', after: 'import "y"' }, { line: 5, before: (query || 'x') + '()', after: 'y()' }] }] }),
  grepReplaceApply: async () => ({ ok: true, changed: 1, replaced: 2, backupId: '2026-01-01', backupDir: '.galaxy-backups/2026-01-01' }),
  grepReplaceRollback: async () => ({ ok: true, restored: 1 }),
  testDiscover: async () => ({ ok: true, runner: 'vitest', tests: [{ file: 'src/index.test.js', name: 'health ok döner', line: 3 }, { file: 'src/index.test.js', name: 'listen 3000', line: 9 }] }),
  testRun: async () => ({ ok: true, passed: true, code: 0, ms: 123, cmd: 'npx vitest run', out: 'Test Files 1 passed', problems: [] }),
  gitFileHistory: async () => ({ ok: true, commits: [{ hash: 'abc123456', short: 'abc1234', date: '2026-10-01', author: 'Furkan', subject: 'feat: health endpoint' }, { hash: 'def789012', short: 'def7890', date: '2026-09-20', author: 'Furkan', subject: 'init' }] }),
  gitBlame: async () => ({ ok: true, lines: [{ line: 1, author: 'Furkan', date: '2026-10-01', summary: 'feat: health endpoint' }, { line: 2, author: 'Furkan', date: '2026-09-20', summary: 'init' }] }),
  gitShowFile: async () => ({ ok: true, content: 'import express from "express";\n// eski sürüm\n' }),
  jobStart: async ({ cmd, label } = {}) => ({ ok: true, id: 'job-mock-1', label: label || cmd || 'iş' }),
  jobList: async () => ({ ok: true, jobs: [{ id: 'job-mock-1', label: 'npm test', cmd: 'npm test', status: 'done', code: 0, started: Date.now() - 2000, ended: Date.now(), out: 'ok' }] }),
  jobStop: async () => ({ ok: true }),
  onJob: () => {}, onJobDone: () => {}, onDebugReady: () => {}, onAgentEvent: (cb) => { agentEvCb = cb; }, onDbgEvent: () => {},
  galaxyProfileRead: async () => ({ ok: true, exists: true, profile: { name: 'AlphaAPI', scripts: [{ name: 'dev', cmd: 'npm run dev' }], onOpen: [], env: {}, agentInstructions: 'Türkçe yanıt ver.', prompts: [{ label: 'Haftalık özet', text: 'Haftalık özet çıkar.' }] } }),
  galaxyProfileWrite: async () => ({ ok: true }),
  templateCreate: async () => ({ ok: true, created: ['package.json', 'src/index.js', 'README.md'] }),
  langStatus: async () => ({ ok: true, version: '5.6.3' }),
  langRequest: async ({ kind } = {}) => kind === 'diag' ? { ok: true, problems: [{ file: 'src/api.js', line: 4, col: 3, severity: 'error', text: "Type 'number' is not assignable to type 'string'.", source: 'lsp', len: 5 }] } : kind === 'hover' ? { ok: true, text: 'function health(): string' } : kind === 'def' ? { ok: true, defs: [{ file: 'src/api.js', line: 2, col: 17, name: 'health' }] } : kind === 'refs' ? { ok: true, refs: [{ file: 'src/api.js', line: 9, col: 5, text: 'health()', isDef: false }] } : kind === 'complete' ? { ok: true, entries: [{ name: 'health', kind: 'function' }] } : { ok: true, files: [] },
  formatFile: async ({ content } = {}) => ({ ok: true, content: String(content || ''), tools: ['prettier'], changed: false }),
  pkgScripts: async () => ({ ok: true, scripts: [{ name: 'dev', cmd: 'node server.js' }, { name: 'build', cmd: 'node build.js' }] }),
  debugStart: async () => ({ ok: true, id: 'dbg-mock-1', label: '🐛 debug: server.js' }),
  ghPrList: async () => ({ ok: true, prs: [{ number: 12, title: 'Health endpoint düzeltmesi', branch: 'fix/health', author: 'furkan', url: 'https://github.com/x/y/pull/12', ci: 'pass', draft: false }, { number: 13, title: 'Bağımlılık güncelleme', branch: 'chore/deps', author: 'furkan', url: 'https://github.com/x/y/pull/13', ci: 'fail', draft: true }] }),
  ghPrCreateWeb: async () => ({ ok: true }),
  gitBranches: async () => ({ ok: true, current: 'main', branches: [{ name: 'main', current: true, remote: false }, { name: 'fix/health', current: false, remote: false }] }),
  gitSwitchBranch: async () => ({ ok: true }),
  gitStashList: async () => ({ ok: true, stashes: [{ ref: 'stash@{0}', msg: 'On main: yarım kalan iş', date: '2026-10-18 21:00' }] }),
  gitStashPush: async () => ({ ok: true, out: 'Saved working directory' }),
  gitStashApply: async () => ({ ok: true }),
  gitStashDrop: async () => ({ ok: true }),
  gitConflicts: async () => ({ ok: true, conflicts: [] }),
  gitConflictVersions: async () => ({ ok: true, base: 'ortak\n', ours: 'bizim sürüm\n', theirs: 'onların sürümü\n', current: '<<<<<<< HEAD\nbizim\n' }),
  gitResolveConflict: async () => ({ ok: true }),
  agentConfigGet: async () => ({ ok: true, hasKey: true, model: 'claude-sonnet-4-5', autoApprove: false, engine: 'auto', cliAvailable: true }),
  agentConfigSave: async (p) => ({ ok: true, hasKey: true, model: (p && p.model) || 'claude-sonnet-4-5', autoApprove: !!(p && p.autoApprove), engine: (p && p.engine) || 'auto', cliAvailable: true }),
  agentSend: async () => { if (agentEvCb) { setTimeout(() => agentEvCb({ kind: 'text', text: 'hello.js yazdım.' }), 60); setTimeout(() => agentEvCb({ kind: 'changed', files: [{ path: 'src/hello.js', status: 'M' }] }), 130); setTimeout(() => agentEvCb({ kind: 'done' }), 200); } return { ok: true, runId: 'ag-mock-1', engine: 'cli', model: 'claude-code (abonelik)' }; },
  agentApprove: async () => ({ ok: true }), agentStop: async () => ({ ok: true }), agentReset: async () => ({ ok: true }),
  dbgStart: async () => ({ ok: true, id: 'dbg-mock-1', label: '🐛 debug: server.js' }),
  dbgBreakpoint: async () => ({ ok: true }), dbgResume: async () => ({ ok: true }), dbgStep: async () => ({ ok: true }), dbgStop: async () => ({ ok: true }),
  shellStart: async () => ({ ok: true }),
  shellInput: async ({ shellId, cmd }) => { if (shellCb) { shellCb({ id: shellId, kind: 'out', text: 'çıktı: ' + cmd }); shellCb({ id: shellId, kind: 'done', code: 0, cwd: '/x' }); } return { ok: true }; },
  shellComplete: async () => ({ ok: true, matches: [] }),
  claudeRun: async ({ runId }) => { if (claudeCb) { claudeCb({ runId, kind: 'text', text: 'Merhaba, buradayım.' }); claudeCb({ runId, kind: 'done', text: '0' }); } return { ok: true }; },
  agentRun: async ({ runId }) => { if (agentCb) { agentCb({ runId, kind: 'text', text: 'Durum iyi.' }); agentCb({ runId, kind: 'done' }); } return { ok: true }; },
  assistantRun: async ({ runId, prompt }) => {
    if (!claudeCb) return { ok: true };
    const resp = /docker/i.test(prompt || '') ? '[[ACT open_tab|docker]] Docker sekmesini açtım.' : 'Selam, buradayım. Nasıl yardımcı olayım?';
    const words = resp.split(' '); let i = 0;
    const tick = () => { if (i < words.length) { claudeCb({ runId, kind: 'text', text: (i ? ' ' : '') + words[i] }); i++; setTimeout(tick, 15); } else claudeCb({ runId, kind: 'done', text: '0' }); };
    setTimeout(tick, 20); return { ok: true };
  },
  sttAvailable: async () => ({ ok: false }),
  sttStart: async () => ({ ok: false }),
  sttStop: async () => ({ ok: true }),
  sttPause: async () => ({ ok: true }),
  sttResume: async () => ({ ok: true }),
  loopGet: async () => ({ ok: true, remarks: '', lastRun: null }),
  loopSave: async () => ({ ok: true }),
  mcpList: async () => ({ ok: true, tools: [{ name: 'search_emails' }, { name: 'read_email' }, { name: 'send_email' }], aliases: { list: 'search_emails', read: 'read_email', brief: 'send_email', send: 'send_email' } }),
  mcpCall: async ({ alias, name }) => {
    if (alias === 'list' || name === 'search_emails') {
      return { ok: true, result: { content: [{ type: 'text', text: JSON.stringify([
        { id: 'm1', from: 'atlas@galaxy', subject: 'Haftalık durum', snippet: 'Hacı Takip 21g sessiz', date: '2026-08-18' },
        { id: 'm2', from: 'nav@galaxy', subject: 'Plan uyarısı', snippet: '3 açık madde', date: '2026-08-17' }
      ]) }] } };
    }
    if (alias === 'read' || name === 'read_email') {
      return { ok: true, result: { content: [{ type: 'text', text: 'From: atlas@galaxy\nSubject: Haftalık durum\n\nHacı Takip 21 gündür telemetri açık.' }] } };
    }
    if (alias === 'brief' || alias === 'send') return { ok: true, result: { content: [{ type: 'text', text: 'sent' }] } };
    return { ok: false, error: 'mock' };
  },
  claudeCheck: async (opts) => ({ ok: true, path: (opts && opts.path && String(opts.path).startsWith('/')) ? String(opts.path) : '/usr/local/bin/claude' }),
  githubCheck: async () => ({ ok: true }),
  homeDir: async () => '/Users/test',
  openTerminal: async (p) => { lastTerminal = String(p || ''); return { ok: true, path: lastTerminal }; },
  lastTerminal: () => lastTerminal,
  trainingList: async () => ({ ok: true, root: '~/Desktop/yazılım', categories: [
    { key: 'python', name: 'Python', blurb: 'İleri konular', count: 2, items: [
      { id: 'p1', title: 'Döngüler', kind: 'code', sizeKb: 1, meta: 'Alıştırma', locked: false },
      { id: 'p2', title: 'Rapor', kind: 'docx', sizeKb: 3, meta: 'Belge', locked: false },
    ] },
    { key: 'yapay zeka', name: 'Yapay Zeka', blurb: 'Modeller', count: 1, items: [
      { id: 'y1', title: 'KNN', kind: 'notebook', sizeKb: 5, meta: 'Defter', locked: false },
    ] },
  ] }),
  trainingRead: async (id) => ({ ok: true, title: id === 'p1' ? 'Döngüler' : 'İçerik', kind: 'code', html: '<pre class="tr-code"><code>for i in range(3):\n    print(i)</code></pre>' }),
  trainingOpenOriginal: async () => ({ ok: true }),
  trainingAdd: async () => ({ ok: true, id: 'new1' }),
  trainingDelete: async () => ({ ok: true }),
  quizGet: async () => ({ ok: true, title: 'Rapor', questions: [
    { q: 'range(3) kaç eleman üretir?', options: ['2', '3', '4', '0'], correct: 1, explain: 'range(3) → 0,1,2, yani 3 eleman.' },
    { q: 'print() ne işe yarar?', options: ['Dosya siler', 'Ekrana yazdırır', 'Sunucu başlatır', 'Değişken silinir'], correct: 1, explain: 'print() konsola çıktı basar.' },
  ] }),
  quizRandom: async () => ({ ok: true, id: 'p1', rel: 'python/donguler.py', category: 'Python', title: 'Döngüler',
    question: { q: 'range(3) kaç eleman üretir?', options: ['2', '3', '4', '0'], correct: 1, explain: 'range(3) → 0,1,2, yani 3 eleman.' } }),
  gitInit: async () => ({ ok: true }),
  projectHide: async () => ({ ok: true, action: 'hidden' }),
  syncReadme: async () => ({ ok: true, added: 0, plan: [] }),
  gitPush: async () => ({ ok: true }), gitPull: async () => ({ ok: true }), gitCommit: async () => ({ ok: true }),
  __testNoBrief: true,
  asstHistoryGet: async () => ({ ok: true, messages: [] }),
  asstHistoryAppend: async () => ({ ok: true }),
  asstHistoryClear: async () => ({ ok: true }),
  onClaude: (cb) => { claudeCb = cb; }, onShell: (cb) => { shellCb = cb; }, onStt: () => {},
  onPty: (cb) => { ptyCb = cb; }, onFsChange: () => {},
  onAgent: (cb) => { agentCb = cb; }, onScheduleDone: () => {}, onDockerLog: () => {},
  openSettings: () => {}, onSettingsPane: () => {}, onEsc: () => {}, onFullscreen: () => {}, toggleFullscreen: async () => ({ ok: true }), openClaude: () => {},
  pickFolder: async () => null, pickFiles: async () => [{ path: '/tmp/shot.png', name: 'shot.png' }], agentsFull: async () => [{ id: 'a1', name: 'ATLAS', role: 'CTO', color: '#61dcff', prompt: 'Sen ATLAS\'sın — kişisel CTO. Durumu net raporla.', presets: [{ label: 'Durum raporu ver', ask: 'Durum raporu ver' }, { label: 'Riskleri sırala', ask: 'Riskleri sırala' }, { label: 'Bu hafta neye odaklanayım', ask: 'Bu hafta neye odaklanayım' }] }], agentSave: async () => ({ ok: true, id: 'a1' }), backupList: async () => [],
  findRepos: async () => ({ ok: true, root: '/x', repos: mockRepos() }),
  pickFolders: async () => [],
  projectsAdd: async ({ universeId, items } = {}) => {
    const added = [], skipped = [];
    for (const it of items || []) {
      const p = typeof it === 'string' ? it : it.path;
      if (projects.some(x => x.path === p)) { skipped.push({ path: p, reason: 'zaten bu alanda' }); continue; }
      const id = p.split('/').pop();
      projects.push({ ...P(id, id), universe: universeId || 'u', path: p });
      added.push({ id, path: p, name: id });
    }
    return { ok: true, added, skipped };
  },
  universeDelete: async (id) => { const i = universes.findIndex(u => u.id === id); if (universes.length <= 1) return { ok: false, error: 'Son evren silinemez' }; if (i < 0) return { ok: false, error: 'Evren bulunamadı' }; universes.splice(i, 1); return { ok: true }; },
  universeUpdate: async (opts) => { const u = universes.find(x => x.id === (opts && opts.id)); if (!u) return { ok: false, error: 'Evren bulunamadı' }; if (opts && opts.name) u.name = opts.name; if (opts && opts.root) u.subtitle = opts.root; return { ok: true }; }
});
