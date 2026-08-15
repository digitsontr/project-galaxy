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
let claudeCb = null, shellCb = null;

contextBridge.exposeInMainWorld('galaxy', {
  load: async () => ({ universes, projects, agents: [{ id: 'a1', name: 'ATLAS', role: 'CTO', color: '#61dcff' }], alerts: [], settings: { lang: 'tr' }, ignored: [] }),
  profileGet: async () => ({ lang: 'tr', name: 'Furkan' }),
  settingsGet: async () => ({ settings: { lang: 'tr', focusMin: 25 } }),
  gitLog: async () => ({ ok: true, branch: 'main', ahead: 1, behind: 0, commits: [{ h: 'a1b2c3d', an: 'Furkan', ad: '2s', s: 'fix' }], files: [], dirty: 2, dirtyFiles: [], staged: 0, branches: ['main', 'dev'] }),
  tree: async () => [{ name: 'src', dir: true, children: [{ name: 'index.js', dir: false }] }, { name: 'README.md', dir: false }],
  readme: async () => ({ name: 'README.md', content: '# AlphaAPI\n\nBackend.' }),
  dbList: async () => [], dbTables: async () => ({ ok: true, tables: [] }),
  scheduleList: async () => [{ id: 's1', name: 'Nightly', cron: '0 2 * * *', enabled: true }],
  sshList: async () => [], sshKeys: async () => ({ ok: true, keys: ['id_ed25519'] }),
  todoList: async () => [{ id: 't1', text: 'API', done: false, status: 'todo' }],
  reports: async () => [], dockerStatus: async () => ({ ok: true, running: true, containers: 1, containersRunning: 1, images: 1 }),
  dockerPs: async () => ({ ok: true, containers: [{ id: 'c1', name: 'web', image: 'nginx', state: 'running', status: 'Up 2h' }] }),
  dockerImages: async () => ({ ok: true, images: [{ id: 'i1', repo: 'nginx', tag: 'latest', size: '142MB' }] }),
  shellStart: async () => ({ ok: true }),
  shellInput: async ({ shellId, cmd }) => { if (shellCb) { shellCb({ id: shellId, kind: 'out', text: 'çıktı: ' + cmd }); shellCb({ id: shellId, kind: 'done', code: 0, cwd: '/x' }); } return { ok: true }; },
  shellComplete: async () => ({ ok: true, matches: [] }),
  claudeRun: async ({ runId }) => { if (claudeCb) { claudeCb({ runId, kind: 'text', text: 'Merhaba, buradayım.' }); claudeCb({ runId, kind: 'done', text: '0' }); } return { ok: true }; },
  assistantRun: async ({ runId, prompt }) => {
    if (!claudeCb) return { ok: true };
    const resp = /docker/i.test(prompt || '') ? '[[ACT open_tab|docker]] Docker sekmesini açtım.' : 'Selam, buradayım. Nasıl yardımcı olayım?';
    const words = resp.split(' '); let i = 0;
    const tick = () => { if (i < words.length) { claudeCb({ runId, kind: 'text', text: (i ? ' ' : '') + words[i] }); i++; setTimeout(tick, 15); } else claudeCb({ runId, kind: 'done', text: '0' }); };
    setTimeout(tick, 20); return { ok: true };
  },
  sttAvailable: async () => ({ ok: false }),
  __testNoBrief: true,
  asstHistoryGet: async () => ({ ok: true, messages: [] }),
  asstHistoryAppend: async () => ({ ok: true }),
  asstHistoryClear: async () => ({ ok: true }),
  onClaude: (cb) => { claudeCb = cb; }, onShell: (cb) => { shellCb = cb; }, onStt: () => {},
  onAgent: () => {}, onScheduleDone: () => {}, onDockerLog: () => {},
  openFile: () => {}, openFolder: () => {}, openTerminal: () => {}, openSettings: () => {}, openClaude: () => {},
  pickFolder: async () => null, pickFiles: async () => null, agentsFull: async () => [], backupList: async () => []
});
