'use strict';
// Evren üyeliği testi — gerçek main-süreç modülleri (config → data → projects → core → infra),
// Electron nesneleri taklit; gerçek dosya sistemi ve gerçek git depoları.
// Koş: node test/universe-members.js   (npm run test:integration da çağırır)
const fs = require('fs');
const path = require('path');
const os = require('os');
const { spawn, execFile, execFileSync } = require('child_process');

const ROOT = path.join(__dirname, '..');
const TMP = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'gx-um-')));
process.env.GALAXY_DATA_DIR = path.join(TMP, 'data');

const handlers = {};
const noop = () => {};
const g = {
  app: { getPath: () => TMP, on: noop, isPackaged: false, getVersion: () => '0.0.0' },
  BrowserWindow: { fromWebContents: () => null, getAllWindows: () => [] },
  ipcMain: { handle: (ch, fn) => { handlers[ch] = fn; } },
  shell: { openPath: async () => '', trashItem: async () => {}, showItemInFolder: noop, openExternal: noop },
  Tray: function () {}, Menu: { buildFromTemplate: () => ({}) }, nativeImage: { createFromPath: () => ({}) },
  globalShortcut: { register: noop }, dialog: { showMessageBox: async () => ({ response: 0 }), showOpenDialog: async () => ({ canceled: true }) },
  safeStorage: { isEncryptionAvailable: () => false }, screen: {},
  fs, path, os, spawn, execFile,
  APP_DIR: ROOT, IS_MAS: false,
  require, process, console, Buffer, setTimeout, clearTimeout, setInterval, clearInterval,
  Map, Set, Promise, JSON, Date, parseInt, parseFloat, isNaN, isFinite, Math, Error, Object, Array,
  String, Number, Boolean, encodeURIComponent, decodeURIComponent, URL, Intl, encodeURI, decodeURI
};
for (const m of ['lib/config', 'lib/data', 'lib/projects', 'ipc/core', 'ipc/infra']) require(path.join(ROOT, m))(g);

const results = [];
const check = (name, ok, detail) => { results.push(!!ok); console.log((ok ? '✓' : '✗') + ' ' + name + (detail ? ' (' + detail + ')' : '')); };
const mkRepo = dir => { fs.mkdirSync(dir, { recursive: true }); execFileSync('git', ['init', '-q'], { cwd: dir }); };
const H = (ch, ...a) => handlers[ch]({ sender: null }, ...a);

(async () => {
  // Eski kurulum: kökte iki depo + çatı klasörde bir depo + git'siz klasör; hiç "members" yok.
  const legacyRoot = path.join(TMP, 'Eski');
  mkRepo(path.join(legacyRoot, 'alfa'));
  mkRepo(path.join(legacyRoot, 'beta'));
  mkRepo(path.join(legacyRoot, 'Sistem', 'gama'));
  fs.mkdirSync(path.join(legacyRoot, 'notlar'), { recursive: true });
  fs.mkdirSync(process.env.GALAXY_DATA_DIR, { recursive: true });
  const legacy = g.loadData();
  legacy.universes = [{ id: 'eski', name: 'Eski', root: legacyRoot, prefix: 'Eski', expandDirs: [] }];
  legacy.projects = { 'Eski/alfa': { notes: 'korunmalı not', status: 'active' } };
  legacy.ignored = ['Eski/beta'];
  legacy.profile = { onboarded: true };
  g.saveData(legacy);

  let scan = g.scanProjects();
  const eskiIds = scan.projects.filter(p => p.universe === 'eski').map(p => p.id).sort();
  check('Taşıma: eski görünenler korundu (gizli hariç)', JSON.stringify(eskiIds) === JSON.stringify(['Eski/Sistem/gama', 'Eski/alfa']), eskiIds.join(','));
  check('Taşıma: not aynı kimlikle bağlı', (scan.projects.find(p => p.id === 'Eski/alfa') || {}).notes === 'korunmalı not');
  const saved = g.loadData();
  check('Taşıma: üyelik diske yazıldı, expandDirs kalktı', Array.isArray(saved.universes[0].members) && saved.universes[0].members.length === 2 && !('expandDirs' in saved.universes[0]));

  mkRepo(path.join(legacyRoot, 'delta'));
  scan = g.scanProjects();
  check('Taşıma sonrası: köke eklenen yeni depo kendiliğinden GELMEZ', !scan.projects.some(p => p.id === 'Eski/delta'));

  // Yeni evren: depolarla dolu bir klasör seçilse de boş başlar.
  const newRoot = path.join(TMP, 'Yeni');
  mkRepo(path.join(newRoot, 'api'));
  mkRepo(path.join(newRoot, 'web'));
  mkRepo(path.join(newRoot, 'grup', 'mobil'));
  const ua = await H('galaxy:universeAdd', { name: 'Yeni', root: newRoot });
  scan = g.scanProjects();
  check('Yeni evren boş başlar', ua.ok && !scan.projects.some(p => p.universe === ua.id), ua.id);

  // Toplu: depoları bul → seç → ekle
  let r = await H('galaxy:findRepos', { universeId: ua.id });
  const rels = (r.repos || []).map(x => x.rel).sort();
  check('Depoları bul: 3 seviyeye kadar depolar', r.ok && JSON.stringify(rels) === JSON.stringify(['api', 'grup/mobil', 'web']), rels.join(','));
  r = await H('galaxy:projectsAdd', { universeId: ua.id, items: r.repos.filter(x => x.rel !== 'web').map(x => x.path) });
  check('Toplu ekleme: 2 eklendi', r.ok && r.added.length === 2 && !r.skipped.length, JSON.stringify(r.skipped));

  // Tek tek: ~ ile yol, kök dışından klasör, git'siz klasör, hatalı yollar
  const outside = path.join(TMP, 'Baska', 'cli');
  mkRepo(outside);
  const plain = path.join(newRoot, 'taslak');
  fs.mkdirSync(plain);
  const homeRel = '~/' + path.relative(os.homedir(), path.join(newRoot, 'web'));
  r = await H('galaxy:projectsAdd', { universeId: ua.id, items: [homeRel, outside, plain, path.join(newRoot, 'api'), 'goreli/yol', path.join(TMP, 'yok')] });
  const reasons = r.skipped.map(s => s.reason);
  check('Tek tek: ~ yolu, kök dışı ve git’siz klasör eklendi', r.added.length === 3, r.added.map(a => a.id).join(','));
  check('Tek tek: tekrar/göreli/olmayan yol reddedildi', reasons.length === 3 && reasons.includes('zaten bu alanda') && reasons.includes('bulunamadı') && reasons.some(x => /tam yol/.test(x)), reasons.join(' | '));

  scan = g.scanProjects();
  const yeni = scan.projects.filter(p => p.universe === ua.id);
  const ids = yeni.map(p => p.id).sort();
  check('Kimlik: kök altı göreli, kök dışı @ad', JSON.stringify(ids) === JSON.stringify(['Yeni/@cli', 'Yeni/api', 'Yeni/grup/mobil', 'Yeni/taslak', 'Yeni/web']), ids.join(','));
  check('Grup: alt klasör yıldız sistemi olur', (yeni.find(p => p.id === 'Yeni/grup/mobil') || {}).group === 'grup');
  check('knownPaths: yalnız üyeler', g.knownPaths.has(outside) && !g.knownPaths.has(path.join(legacyRoot, 'delta')));

  r = await H('galaxy:findRepos', { universeId: ua.id });
  check('Depoları bul: ekliler işaretli', r.repos.filter(x => x.already).length === 3, r.repos.map(x => x.rel + (x.already ? '✓' : '')).join(','));

  // Evrenden çıkar → plan/not korunur, tekrar ekleyince aynı kimlik
  const d0 = g.loadData(); d0.projects['Yeni/api'] = { notes: 'api notu' }; g.saveData(d0);
  r = await H('galaxy:projectHide', 'Yeni/api');
  scan = g.scanProjects();
  check('Evrenden çıkar: listeden kalktı', r.ok && !scan.projects.some(p => p.id === 'Yeni/api'));
  r = await H('galaxy:projectsAdd', { universeId: ua.id, items: [path.join(newRoot, 'api')] });
  scan = g.scanProjects();
  check('Tekrar ekle: aynı kimlik, not geri geldi', r.added[0] && r.added[0].id === 'Yeni/api' && (scan.projects.find(p => p.id === 'Yeni/api') || {}).notes === 'api notu');

  // Klasör geçici olarak yoksa üyelik korunur
  fs.renameSync(outside, outside + '-x');
  scan = g.scanProjects();
  const keep = g.loadData().universes.find(u => u.id === ua.id).members.some(m => m.path === outside);
  fs.renameSync(outside + '-x', outside);
  check('Eksik klasör: listede yok ama üyelik korunur', !scan.projects.some(p => p.id === 'Yeni/@cli') && keep);

  // Uzak kök: sshSave üyeliği korur; yeni kök boş başlar
  await H('galaxy:sshSave', { id: 'srv1', name: 'S', host: 'h', roots: [{ path: '/srv/a', name: 'a' }] });
  let srv = g.loadData().servers[0];
  check('Uzak: yeni kök boş üyelikle başlar', Array.isArray(srv.roots[0].members) && srv.roots[0].members.length === 0);
  const d1 = g.loadData(); d1.servers[0].roots[0].members = ['/srv/a/x']; g.saveData(d1);
  await H('galaxy:sshSave', { id: 'srv1', name: 'S2', host: 'h', roots: [{ path: '/srv/a', name: 'a' }, { path: '/srv/b', name: 'b' }] });
  srv = g.loadData().servers[0];
  check('Uzak: kaydetmede üyelik korunur', JSON.stringify(srv.roots[0].members) === '["/srv/a/x"]' && srv.roots[1].members.length === 0);

  const fail = results.filter(x => !x).length;
  console.log('\nEVREN ÜYELİĞİ: ' + (results.length - fail) + '/' + results.length + ' geçti');
  try { fs.rmSync(TMP, { recursive: true, force: true }); } catch (e) {}
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error('EVREN ÜYELİĞİ TESTİ ÇÖKTÜ:', e); process.exit(2); });
