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
const universes = [{ id: 'u', name: 'Şirket', subtitle: '~/work', count: 4 }, { id: 'u2', name: 'Papilon', subtitle: '~/pap', count: 2 }];
let claudeCb = null, shellCb = null, agentCb = null;

contextBridge.exposeInMainWorld('galaxy', {
  load: async () => ({ universes, projects, agents: [{ id: 'a1', name: 'ATLAS', role: 'CTO', color: '#61dcff', prompt: 'Sen ATLAS\'sın — kişisel CTO. Durumu net raporla.', presets: [{ label: 'Durum raporu ver', ask: 'Durum raporu ver' }, { label: 'Riskleri sırala', ask: 'Riskleri sırala' }, { label: 'Bu hafta neye odaklanayım', ask: 'Bu hafta neye odaklanayım' }] }], alerts: [], settings: { lang: 'tr' }, ignored: [] }),
  profileGet: async () => ({ lang: 'tr', name: 'Furkan' }),
  settingsGet: async () => ({ settings: { lang: 'tr', focusMin: 25, uiTheme: 'galaxy' } }),
  gitLog: async () => ({ ok: true, branch: 'main', ahead: 1, behind: 0, commits: [{ h: 'a1b2c3d', an: 'Furkan', ad: '2s', s: 'fix' }], files: [], dirty: 2, dirtyFiles: [], staged: 0, branches: ['main', 'dev'] }),
  tree: async () => [{ name: 'src', dir: true, children: [{ name: 'index.js', dir: false }] }, { name: 'README.md', dir: false }],
  file: async ({ rel }) => {
    const name = (rel||'README.md').split('/').pop();
    const html = /\.html?$/i.test(rel||'');
    return { name, rel, kind: html ? 'html' : (/\.md$/i.test(rel||'') ? 'markdown' : 'text'), url: html ? 'about:blank' : undefined, content: html ? '<h1>Demo</h1><p>Sayfa.</p>' : '# LinguMonster\n\n**Uygulama** metni.\n\n## Ne Yapar?\n\n- [ ] Görev bir\n- [x] Görev iki\n' };
  },
  syncReadme: async () => ({ ok: true, added: 2, plan: [{ text: 'Görev bir', done: false }, { text: 'Görev iki', done: true }] }),
  readme: async () => ({ name: 'README.md', content: '# AlphaAPI\n\nBackend.' }),
  dbList: async () => [], dbTables: async () => ({ ok: true, tables: [] }),
  scheduleList: async () => [{ id: 's1', name: 'Nightly', agentId: 'a1', prompt: 'Durum raporu ver', type: 'daily', hour: 2, minute: 0, weekday: 1, enabled: true }],
  sshList: async () => [], sshKeys: async () => ({ ok: true, keys: ['id_ed25519'] }),
  todoList: async () => [{ id: 't1', text: 'API', done: false, status: 'todo' }],
  reports: async () => [], dockerStatus: async () => ({ ok: true, running: true, containers: 1, containersRunning: 1, images: 1 }),
  dockerPs: async () => ({ ok: true, containers: [{ id: 'c1', name: 'web', image: 'nginx', state: 'running', status: 'Up 2h' }] }),
  dockerImages: async () => ({ ok: true, images: [{ id: 'i1', repo: 'nginx', tag: 'latest', size: '142MB' }] }),
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
  calList: async () => [],
  calSave: async (ev) => ({ ok: true, event: Object.assign({ id: 'cal-mock' }, ev) }),
  calDelete: async () => ({ ok: true }),
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
  claudeCheck: async () => ({ ok: true, path: '/usr/local/bin/claude' }),
  githubCheck: async () => ({ ok: true }),
  trainingList: async () => ({ ok: true, root: '~/Desktop/yazılım', categories: [
    { key: 'python', name: 'Python', count: 2, items: [
      { id: 'p1', title: 'Döngüler', kind: 'code', sizeKb: 1 },
      { id: 'p2', title: 'Rapor', kind: 'docx', sizeKb: 3 },
    ] },
    { key: 'yapay zeka', name: 'Yapay Zeka', count: 1, items: [
      { id: 'y1', title: 'KNN', kind: 'notebook', sizeKb: 5 },
    ] },
  ] }),
  trainingRead: async (id) => ({ ok: true, title: id === 'p1' ? 'Döngüler' : 'İçerik', kind: 'code', html: '<pre class="tr-code"><code>for i in range(3):\n    print(i)</code></pre>' }),
  trainingOpenOriginal: async () => ({ ok: true }),
  gitInit: async () => ({ ok: true }),
  projectHide: async () => ({ ok: true, action: 'hidden' }),
  syncReadme: async () => ({ ok: true, added: 0, plan: [] }),
  gitPush: async () => ({ ok: true }), gitPull: async () => ({ ok: true }), gitCommit: async () => ({ ok: true }),
  __testNoBrief: true,
  asstHistoryGet: async () => ({ ok: true, messages: [] }),
  asstHistoryAppend: async () => ({ ok: true }),
  asstHistoryClear: async () => ({ ok: true }),
  onClaude: (cb) => { claudeCb = cb; }, onShell: (cb) => { shellCb = cb; }, onStt: () => {},
  onAgent: (cb) => { agentCb = cb; }, onScheduleDone: () => {}, onDockerLog: () => {},
  openFile: () => {}, openFolder: () => {}, openTerminal: () => {}, openSettings: () => {}, openClaude: () => {},
  pickFolder: async () => null, pickFiles: async () => [{ path: '/tmp/shot.png', name: 'shot.png' }], agentsFull: async () => [{ id: 'a1', name: 'ATLAS', role: 'CTO', color: '#61dcff', prompt: 'Sen ATLAS\'sın — kişisel CTO. Durumu net raporla.', presets: [{ label: 'Durum raporu ver', ask: 'Durum raporu ver' }, { label: 'Riskleri sırala', ask: 'Riskleri sırala' }, { label: 'Bu hafta neye odaklanayım', ask: 'Bu hafta neye odaklanayım' }] }], agentSave: async () => ({ ok: true, id: 'a1' }), backupList: async () => []
});
