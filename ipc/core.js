// Sprint J — davranış taşındı; kopyalanmadı.
// Faz 5: eval-blob açıldı — gövde birebir aynı kod; artık satır satır okunur, diff'lenir,
// hata izinde gerçek satır numarası verir. with(g) bilinçli: çıplak isimler paylaşılan g'ye
// çözülür, g.X = ... atamaları bu modülün çıktısıdır. (Bu yüzden dosya başında 'use strict' yok.)
module.exports = function register(g) {
  with (g) {
// ---------- proje silme / gizleme (onaylı) ----------
ipcMain.handle('galaxy:projectDelete', async (e, projectId) => {
  const scan = scanProjects();
  const proj = scan.projects.find(p => p.id === projectId);
  if (!proj || !proj.path) return { ok: false, error: 'Proje bulunamadı' };
  const win = BrowserWindow.fromWebContents(e.sender);

  const { response } = await dialog.showMessageBox(win, {
    type: 'warning',
    title: 'Projeyi Kaldır',
    message: `"${proj.name}" ne yapılsın?`,
    detail: `Klasör: ${proj.path}\n\n• Evrenden Gizle: klasöre dokunulmaz, sadece galakside görünmez olur (geri alınabilir).\n• Çöp Kutusuna Taşı: klasör macOS Çöp Kutusu'na taşınır (Finder'dan geri alınabilir).`,
    buttons: ['Vazgeç', 'Evrenden Gizle', 'Çöp Kutusuna Taşı'],
    defaultId: 0,
    cancelId: 0
  });

  if (response === 0) return { ok: true, action: 'cancel' };

  const data = loadData();
  if (response === 1) {
    data.ignored = data.ignored || [];
    if (!data.ignored.includes(projectId)) data.ignored.push(projectId);
    saveData(data);
    return { ok: true, action: 'hidden' };
  }

  // Çöp kutusuna taşı — ikinci onay
  const second = await dialog.showMessageBox(win, {
    type: 'warning',
    title: 'Son Onay',
    message: `"${proj.name}" klasörü Çöp Kutusu'na taşınacak. Emin misin?`,
    detail: proj.path,
    buttons: ['Vazgeç', 'Evet, Çöp Kutusuna Taşı'],
    defaultId: 0,
    cancelId: 0
  });
  if (second.response !== 1) return { ok: true, action: 'cancel' };

  try {
    await shell.trashItem(proj.path);
    delete data.projects[projectId];
    data.ignored = (data.ignored || []).filter(x => x !== projectId);
    saveData(data);
    return { ok: true, action: 'trashed' };
  } catch (err) {
    return { ok: false, error: 'Taşınamadı: ' + err.message };
  }
});

ipcMain.handle('galaxy:projectUnhide', (e, projectId) => {
  const data = loadData();
  data.ignored = (data.ignored || []).filter(x => x !== projectId);
  saveData(data);
  return { ok: true };
});

// Galaksiden gizle (klasöre dokunulmaz) — onay kartı renderer’da
ipcMain.handle('galaxy:projectHide', (e, projectId) => {
  if (!projectId) return { ok: false, error: 'Proje yok' };
  const data = loadData();
  data.ignored = data.ignored || [];
  if (!data.ignored.includes(projectId)) data.ignored.push(projectId);
  saveData(data);
  return { ok: true, action: 'hidden' };
});

ipcMain.handle('galaxy:load', async () => {
  // Uzak sunucular varsa: önbellek boşsa ilk taramayı bekle, doluysa
  // arka planda tazele ve eldeki veriyle hemen dön (stale-while-revalidate).
  const servers = (loadData().servers || []);
  if (servers.length && !IS_MAS) {
    const cold = servers.filter(s => !remoteCache.has(s.id));
    if (cold.length) await Promise.all(cold.map(s => remoteRefresh(s.id, true)));
    for (const s of servers) if (!cold.includes(s)) remoteRefresh(s.id);
  }
  return scanProjects();
});

// ---------- evren CRUD ----------
function slugify(s) {
  return s.toLowerCase().replace(/[çğıöşü]/g, c => ({ 'ç': 'c', 'ğ': 'g', 'ı': 'i', 'ö': 'o', 'ş': 's', 'ü': 'u' }[c]))
    .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'evren';
}

ipcMain.handle('galaxy:universeAdd', (e, { name, root, bookmark }) => {
  if (!name || !root) return { ok: false, error: 'Ad ve klasör yolu gerekli' };
  root = root.replace(/^~/, os.homedir()).trim();
  try {
    if (!fs.statSync(root).isDirectory()) return { ok: false, error: 'Bu yol bir klasör değil' };
  } catch (err) { return { ok: false, error: 'Klasör bulunamadı: ' + root }; }
  const data = loadData();
  let id = slugify(name);
  while (data.universes.find(u => u.id === id)) id += '2';
  const prefix = path.basename(root).normalize('NFC');
  if (data.universes.find(u => u.prefix === prefix)) return { ok: false, error: 'Aynı klasör adına sahip bir evren zaten var' };
  data.universes.push({ id, name, subtitle: prefix, root, prefix, bookmark: bookmark || undefined, expandDirs: [] });
  saveData(data);
  startBookmarkAccess(bookmark);
  return { ok: true, id };
});

// Klasör seçici — MAS sürümünde kalıcı erişim için security-scoped bookmark üretir
ipcMain.handle('galaxy:pickFolder', async (e) => {
  const win = BrowserWindow.fromWebContents(e.sender);
  const r = await dialog.showOpenDialog(win, {
    title: 'Klasör seç',
    properties: ['openDirectory', 'createDirectory'],
    securityScopedBookmarks: true
  });
  if (r.canceled || !r.filePaths.length) return null;
  return { path: r.filePaths[0], bookmark: (r.bookmarks && r.bookmarks[0]) || null };
});

ipcMain.handle('galaxy:universeUpdate', (e, { id, name, root, bookmark }) => {
  const data = loadData();
  const local = data.universes.find(x => x.id === id);
  if (local) {
    if (name) local.name = name;
    if (root) {
      root = root.replace(/^~/, os.homedir()).trim();
      try {
        if (!fs.statSync(root).isDirectory()) return { ok: false, error: 'Bu yol bir klasör değil' };
      } catch (err) { return { ok: false, error: 'Klasör bulunamadı: ' + root }; }
      local.root = root;
      if (bookmark) local.bookmark = bookmark;
      if (local.prefix) { // ".." kökü (ana PAPILON) prefixsizdir, ona dokunma
        local.prefix = path.basename(root).normalize('NFC');
        local.subtitle = local.prefix;
      }
    }
    saveData(data);
    return { ok: true };
  }
  for (const srv of (data.servers || [])) {
    for (const rt of (srv.roots || [])) {
      const uid = 'ssh-' + srv.id + '-' + slugify(rt.name || rt.path);
      if (uid !== id) continue;
      if (name) rt.name = String(name).slice(0, 60);
      if (root) rt.path = String(root).slice(0, 400);
      saveData(data);
      return { ok: true };
    }
  }
  return { ok: false, error: 'Evren bulunamadı' };
});

ipcMain.handle('galaxy:universeDelete', (e, id) => {
  const data = loadData();
  const remoteCount = (data.servers || []).reduce((n, s) => n + ((s.roots || []).length), 0);
  if ((data.universes.length + remoteCount) <= 1) return { ok: false, error: 'Son evren silinemez' };
  const idx = data.universes.findIndex(x => x.id === id);
  if (idx >= 0) {
    data.universes.splice(idx, 1);
    saveData(data);
    return { ok: true }; // proje metadataları korunur; evren geri eklenirse geri gelir
  }
  for (const srv of (data.servers || [])) {
    const roots = srv.roots || [];
    const ridx = roots.findIndex(rt => ('ssh-' + srv.id + '-' + slugify(rt.name || rt.path)) === id);
    if (ridx < 0) continue;
    roots.splice(ridx, 1);
    srv.roots = roots;
    saveData(data);
    return { ok: true };
  }
  return { ok: false, error: 'Evren bulunamadı' };
});

// ---------- evren geneli TODO ----------
ipcMain.handle('galaxy:todoList', (e, universe) => {
  const data = loadData();
  return (data.todos || []).filter(td => !universe || td.universe === universe).slice(0, 100);
});
ipcMain.handle('galaxy:todoAdd', (e, { universe, text, status, projectId, branch }) => {
  if (!text || !text.trim()) return false;
  const data = loadData();
  data.todos = data.todos || [];
  data.todos.unshift({ id: String(Date.now()), universe, text: text.trim(), done: status === 'done', status: status || 'todo', ts: new Date().toISOString(), projectId: projectId || '', branch: branch || '' });
  data.todos = data.todos.slice(0, 300);
  saveData(data);
  return true;
});
ipcMain.handle('galaxy:todoSetStatus', (e, { id, status }) => {
  const data = loadData();
  const td = (data.todos || []).find(x => x.id === id);
  if (td) { td.status = status; td.done = status === 'done'; saveData(data); }
  return true;
});
ipcMain.handle('galaxy:todoToggle', (e, id) => {
  const data = loadData();
  const td = (data.todos || []).find(x => x.id === id);
  if (td) { td.done = !td.done; saveData(data); }
  return true;
});
ipcMain.handle('galaxy:todoDelete', (e, id) => {
  const data = loadData();
  data.todos = (data.todos || []).filter(x => x.id !== id);
  saveData(data);
  return true;
});

ipcMain.handle('galaxy:save', (e, project) => {
  const data = loadData();
  const { id, name, group, status, stage, progress, plan, notes, desc, links } = project;
  data.projects[id] = { name, group, status, stage, progress, plan, notes, desc, links: links || [] };
  saveData(data);
  // README'deki eşleşen todo satırlarının işaretini plan durumuna göre güncelle (çift yönlü senkronun yazma yönü)
  try {
    if (project.path) {
      const readmePath = path.join(project.path, 'README.md');
      if (fs.existsSync(readmePath)) {
        let content = fs.readFileSync(readmePath, 'utf8');
        let changed = false;
        for (const item of plan || []) {
          const escaped = item.text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
          const re = new RegExp(`^(\\s*)- \\[( |x|X)\\] ${escaped}\\s*$`, 'm');
          const want = item.done ? 'x' : ' ';
          content = content.replace(re, (m0, sp, cur) => {
            if (cur.toLowerCase() !== want.trim() && !(cur === ' ' && want === ' ')) changed = true;
            return `${sp}- [${want}] ${item.text}`;
          });
        }
        if (changed) fs.writeFileSync(readmePath, content, 'utf8');
      }
    }
  } catch (err) {}
  return true;
});

// README'si olmayan projeye başlangıç README.md yaz (ad + açıklama + plan + not)
ipcMain.handle('galaxy:createReadme', (e, projectId) => {
  const scan = scanProjects();
  const proj = scan.projects.find(p => p.id === projectId);
  if (!proj || !proj.path) return { ok: false, error: 'Proje yolu yok' };
  if (isRemotePath(proj.path)) return { ok: false, error: 'Uzak projede README oluşturulamıyor' };
  const readmePath = path.join(proj.path, 'README.md');
  if (fs.existsSync(readmePath)) return { ok: false, error: 'README zaten var' };
  const saved = (loadData().projects || {})[projectId] || {};
  const desc = (saved.desc || proj.desc || '').trim();
  const plan = saved.plan || proj.plan || [];
  const notes = (saved.notes || proj.notes || '').trim();
  const lines = [`# ${proj.name}`, ''];
  if (desc) lines.push(desc, '');
  lines.push('## Kurulum', '', '```bash', '# kurulum adımlarını buraya yaz', '```', '');
  if (plan.length) { lines.push('## Yapılacaklar', ''); for (const it of plan) lines.push(`- [${it.done ? 'x' : ' '}] ${it.text}`); lines.push(''); }
  if (notes) lines.push('## Notlar', '', notes, '');
  try { fs.writeFileSync(readmePath, lines.join('\n'), 'utf8'); return { ok: true, path: readmePath }; }
  catch (err) { return { ok: false, error: err.message }; }
});

// README'deki "- [ ]" maddelerini plana aktar (okuma yönü)
ipcMain.handle('galaxy:syncReadme', (e, projectId) => {
  const scan = scanProjects();
  const proj = scan.projects.find(p => p.id === projectId);
  if (!proj || !proj.path) return { ok: false, added: 0 };
  try {
    const readmePath = path.join(proj.path, 'README.md');
    if (!fs.existsSync(readmePath)) return { ok: true, added: 0 };
    const content = fs.readFileSync(readmePath, 'utf8');
    const data = loadData();
    if (!data.projects[projectId]) {
      data.projects[projectId] = { name: proj.name, group: proj.group, status: proj.status, stage: proj.stage, progress: proj.progress, plan: [], notes: proj.notes, desc: proj.desc, links: proj.links };
    }
    const plan = data.projects[projectId].plan = data.projects[projectId].plan || [];
    let added = 0;
    const re = /^\s*- \[( |x|X)\] (.+?)\s*$/gm;
    let m;
    while ((m = re.exec(content)) !== null) {
      const text = m[2].trim();
      const done = m[1].toLowerCase() === 'x';
      const existing = plan.find(i => i.text === text);
      if (!existing) { plan.push({ text, done }); added++; }
      else if (existing.done !== done && done) { existing.done = true; } // README'de kapanmışsa planda da kapat
    }
    if (added > 0 || true) saveData(data);
    return { ok: true, added, plan };
  } catch (err) { return { ok: false, added: 0 }; }
});

ipcMain.handle('galaxy:openFolder', (e, p) => {
  if (isRemotePath(p)) return { ok: false, error: 'Uzak klasör Finder\'da açılamaz' };
  if (p && knownPaths.has(p)) shell.openPath(p);
});

ipcMain.handle('galaxy:openInEditor', async (e, { path: projectPath, app: editor } = {}) => {
  const p = projectPath;
  if (!p || !knownPaths.has(p)) return { ok: false, error: 'Geçersiz yol' };
  if (isRemotePath(p)) return { ok: false, error: 'Uzak klasör editörde açılamaz' };
  const want = String(editor || 'auto');
  const win = process.platform === 'win32';
  const bins = want === 'code'
    ? (win ? ['code.cmd', 'code'] : ['code'])
    : want === 'cursor'
      ? (win ? ['cursor.cmd', 'cursor'] : ['cursor'])
      : (win ? ['cursor.cmd', 'cursor', 'code.cmd', 'code'] : ['cursor', 'code']);
  for (const bin of bins) {
    const ok = await new Promise(res => {
      execFile(bin, [p], { timeout: 8000 }, err => res(!err));
    });
    if (ok) return { ok: true, app: bin.replace(/\.cmd$/, '') };
  }
  try { await shell.openPath(p); return { ok: true, app: 'finder' }; }
  catch (err) { return { ok: false, error: err.message }; }
});

// Yalnızca yerel makinedeki bir portu tarayıcıda açar (Docker konteyner portları).
// Keyfi URL açılmasın diye kalıp katı: http://localhost:<port>
ipcMain.handle('galaxy:openLocalPort', (e, port) => {
  const n = parseInt(port, 10);
  if (!(n >= 1 && n <= 65535)) return { ok: false };
  shell.openExternal('http://localhost:' + n);
  return { ok: true };
});

// ---------- dosya ağacı ----------
function buildTree(dir, depth) {
  if (depth <= 0) return [];
  let entries = [];
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true })
      .filter(d => !d.name.startsWith('.') && !IGNORE.has(d.name))
      .slice(0, 60);
  } catch (e) { return []; }
  entries.sort((a, b) => (b.isDirectory() - a.isDirectory()) || a.name.localeCompare(b.name, 'tr'));
  return entries.map(d => ({
    name: d.name.normalize('NFC'),
    dir: d.isDirectory(),
    children: d.isDirectory() ? buildTree(path.join(dir, d.name), depth - 1) : undefined
  }));
}

ipcMain.handle('galaxy:tree', async (e, p) => {
  if (!p || !knownPaths.has(p)) return null;
  if (isRemotePath(p)) return remoteTree(p, 3);
  return buildTree(p, 3);
});

// ---------- tek seviye dizin listesi (gezegen yörüngesi) ----------
function safeJoin(root, rel) {
  const full = path.resolve(root, rel || '');
  if (!(full === root || full.startsWith(root + path.sep))) return null;
  // symlink'le kök dışına çıkışı engelle: gerçek yolu çöz ve tekrar doğrula
  try {
    const real = fs.realpathSync(full);
    const realRoot = fs.realpathSync(root);
    if (!(real === realRoot || real.startsWith(realRoot + path.sep))) return null;
  } catch (e) { /* dosya henüz yoksa realpath atar — mantıksal kontrol yeterli */ }
  return full;
}

ipcMain.handle('galaxy:list', async (e, { root, rel }) => {
  if (!root || !knownPaths.has(root)) return null;
  if (isRemotePath(root)) return remoteList(root, rel);
  const dir = safeJoin(root, rel);
  if (!dir) return null;
  let entries = [];
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true })
      .filter(d => !d.name.startsWith('.') && !IGNORE.has(d.name) && !d.name.endsWith('.app'));
  } catch (err) { return null; }
  const out = entries.map(d => {
    let size = 0;
    try { if (!d.isDirectory()) size = fs.statSync(path.join(dir, d.name)).size; } catch (e2) {}
    return { name: d.name.normalize('NFC'), dir: d.isDirectory(), size };
  });
  out.sort((a, b) => (b.dir - a.dir) || a.name.localeCompare(b.name, 'tr'));
  return out;
});

// ---------- dosya içeriği (uygulama içi görüntüleyici) ----------
const TEXT_EXT = new Set(['md','txt','js','jsx','ts','tsx','py','swift','kt','kts','java','c','cpp','h','m','mm','cs','go','rs','rb','php','sh','bash','zsh','yml','yaml','json','xml','html','htm','css','scss','sql','gradle','properties','toml','ini','cfg','conf','env','csv','tsv','log','dio','plist','entitlements','pbxproj','storyboard','xib','dart','vue','svelte','r','lua','pl','tex']);
const IMAGE_EXT = new Set(['png','jpg','jpeg','gif','webp','svg','bmp','ico','heic','avif']);
const MEDIA_EXT = new Set(['mp4','mov','webm','m4v','mp3','wav','m4a','aac','ogg']);

ipcMain.handle('galaxy:file', async (e, { root, rel }) => {
  if (!root || !knownPaths.has(root)) return null;
  if (isRemotePath(root)) return remoteFile(root, rel);
  const full = safeJoin(root, rel);
  if (!full) return null;
  let st;
  try { st = fs.statSync(full); } catch (err) { return null; }
  const ext = path.extname(full).slice(1).toLowerCase();
  const url = 'file://' + full.split('/').map(encodeURIComponent).join('/');
  const base = { name: path.basename(full), size: st.size, ext, path: full };

  if (IMAGE_EXT.has(ext)) return { ...base, kind: 'image', url };
  if (ext === 'pdf') return { ...base, kind: 'pdf', url };
  if (MEDIA_EXT.has(ext)) return { ...base, kind: ['mp3','wav','m4a','aac','ogg'].includes(ext) ? 'audio' : 'video', url };
  if (TEXT_EXT.has(ext) || st.size < 200 * 1024) {
    try {
      const content = fs.readFileSync(full, 'utf8').slice(0, 300 * 1024);
      // ikili dosya sezgisi
      if (/[\x00]/.test(content.slice(0, 1000))) return { ...base, kind: 'binary' };
      return { ...base, kind: ext === 'md' ? 'markdown' : ((ext === 'html' || ext === 'htm') ? 'html' : 'text'), content, url };
    } catch (err) { return { ...base, kind: 'binary' }; }
  }
  return { ...base, kind: 'binary' };
});

ipcMain.handle('galaxy:openFile', (e, p) => {
  if (!p || typeof p !== 'string') return false;
  // yalnızca bilinen proje köklerinin altındaki dosyalar
  for (const root of knownPaths) {
    if (p === root || p.startsWith(root + path.sep)) { shell.openPath(p); return true; }
  }
  return false;
});

// ---------- Dosya yaz/oluştur/sil/yeniden adlandır + projede ara ----------
ipcMain.handle('galaxy:fileWrite', (e, { root, rel, content } = {}) => {
  if (!root || !knownPaths.has(root)) return { ok: false, error: 'Geçersiz kök' };
  if (isRemotePath(root)) return { ok: false, error: 'Uzak dosya yazma desteklenmiyor' };
  const full = safeJoin(root, rel);
  if (!full) return { ok: false, error: 'Geçersiz yol' };
  try { fs.writeFileSync(full, String(content == null ? '' : content), 'utf8'); return { ok: true }; }
  catch (err) { return { ok: false, error: err.message }; }
});
ipcMain.handle('galaxy:fileCreate', (e, { root, rel } = {}) => {
  if (!root || !knownPaths.has(root)) return { ok: false, error: 'Geçersiz kök' };
  if (isRemotePath(root)) return { ok: false, error: 'Uzak desteklenmiyor' };
  const full = safeJoin(root, rel);
  if (!full) return { ok: false, error: 'Geçersiz yol' };
  if (fs.existsSync(full)) return { ok: false, error: 'Zaten var' };
  try {
    fs.mkdirSync(path.dirname(full), { recursive: true });
    if (/\/$/.test(rel)) fs.mkdirSync(full, { recursive: true });   // klasör
    else fs.writeFileSync(full, '', 'utf8');
    return { ok: true };
  } catch (err) { return { ok: false, error: err.message }; }
});
ipcMain.handle('galaxy:fileDelete', (e, { root, rel } = {}) => {
  if (!root || !knownPaths.has(root)) return { ok: false, error: 'Geçersiz kök' };
  if (isRemotePath(root)) return { ok: false, error: 'Uzak desteklenmiyor' };
  const full = safeJoin(root, rel);
  if (!full || full === root) return { ok: false, error: 'Geçersiz yol' };
  try { fs.rmSync(full, { recursive: true, force: true }); return { ok: true }; }
  catch (err) { return { ok: false, error: err.message }; }
});
ipcMain.handle('galaxy:fileRename', (e, { root, rel, newRel } = {}) => {
  if (!root || !knownPaths.has(root)) return { ok: false, error: 'Geçersiz kök' };
  if (isRemotePath(root)) return { ok: false, error: 'Uzak desteklenmiyor' };
  const a = safeJoin(root, rel), b = safeJoin(root, newRel);
  if (!a || !b || a === root) return { ok: false, error: 'Geçersiz yol' };
  try { fs.mkdirSync(path.dirname(b), { recursive: true }); fs.renameSync(a, b); return { ok: true }; }
  catch (err) { return { ok: false, error: err.message }; }
});
// Projede metin ara (git grep varsa onu, yoksa basit tarama)
ipcMain.handle('galaxy:projectGrep', async (e, { root, query } = {}) => {
  if (!root || !knownPaths.has(root)) return { ok: false, error: 'Geçersiz kök' };
  if (isRemotePath(root)) return { ok: false, error: 'Uzak desteklenmiyor' };
  const q = String(query || '').trim();
  if (q.length < 2) return { ok: false, error: 'En az 2 karakter' };
  const useGit = fs.existsSync(path.join(root, '.git'));
  const args = useGit
    ? ['grep', '-n', '-I', '--no-color', '--fixed-strings', '--ignore-case', '-e', q]
    : ['-rniI', '--exclude-dir=.git', '--exclude-dir=node_modules', '--fixed-strings', q, '.'];
  const bin = useGit ? 'git' : 'grep';
  return new Promise(res => {
    execFile(bin, args, { cwd: root, env: ENV, timeout: 20000, maxBuffer: 8 * 1024 * 1024 }, (err, out) => {
      const lines = String(out || '').split('\n').filter(Boolean).slice(0, 200).map(l => {
        const m = l.match(/^(?:\.\/)?(.+?):(\d+):(.*)$/);
        return m ? { file: m[1], line: +m[2], text: m[3].slice(0, 200) } : null;
      }).filter(Boolean);
      res({ ok: true, matches: lines, truncated: lines.length >= 200 });
    });
  });
});

// ---------- ajan yönetimi ----------
ipcMain.handle('galaxy:agentsFull', () => loadData().agents || []);

ipcMain.handle('galaxy:agentSave', (e, agent) => {
  if (!agent || !agent.name) return { ok: false, error: 'Ad gerekli' };
  const data = loadData();
  data.agents = data.agents || [];
  if (!agent.id) {
    agent.id = slugify(agent.name);
    while (data.agents.find(a => a.id === agent.id)) agent.id += '2';
  }
  const idx = data.agents.findIndex(a => a.id === agent.id);
  const clean = {
    id: agent.id, name: agent.name, role: agent.role || 'AJAN', color: agent.color || '#61dcff',
    prompt: agent.prompt || '', write: !!agent.write,
    presets: Array.isArray(agent.presets) ? agent.presets.filter(p => p && p.label && p.ask).slice(0, 8) : []
  };
  if (idx >= 0) data.agents[idx] = clean; else data.agents.push(clean);
  saveData(data);
  return { ok: true, id: agent.id };
});

ipcMain.handle('galaxy:agentDelete', (e, id) => {
  const data = loadData();
  if ((data.agents || []).length <= 1) return { ok: false, error: 'Son ajan silinemez' };
  data.agents = (data.agents || []).filter(a => a.id !== id);
  saveData(data);
  return { ok: true };
});

// ---------- ilk açılış: uygulama kullanıcısını bir defalığına tanır ----------
let onboardWin = null;

function needsOnboarding() {
  const d = loadData();
  return !(d.profile && d.profile.onboarded);
}

function createOnboardingWindow() {
  if (onboardWin && !onboardWin.isDestroyed()) { onboardWin.focus(); return; }
  onboardWin = new BrowserWindow({
    width: 860, height: 800, resizable: false, fullscreenable: false,
    backgroundColor: '#04060c',
    titleBarStyle: 'hiddenInset',
    webPreferences: { preload: path.join(APP_DIR, 'preload.js'), contextIsolation: true }
  });
  onboardWin.loadFile(path.join(APP_DIR, 'onboarding.html'));
  onboardWin.on('closed', () => { onboardWin = null; });
}

ipcMain.handle('galaxy:onboardStatus', () => {
  const d = loadData();
  const lang = (d.profile && d.profile.lang) || 'tr';
  return {
    needed: !(d.profile && d.profile.onboarded),
    profile: { name: (d.profile && d.profile.name) || '', lang },
    universes: (d.universes || []).map(u => ({ id: u.id, name: u.name, root: resolveRoot(u.root) })),
    agents: (d.agents || []).map(a => ({ id: a.id, name: a.name, role: a.role, color: a.color || '#61dcff' })),
    isMas: IS_MAS
  };
});

ipcMain.handle('galaxy:onboardComplete', (e, payload) => {
  const p = payload || {};
  const data = loadData();
  data.profile = {
    name: String(p.name || '').trim().slice(0, 60),
    lang: p.lang === 'en' ? 'en' : 'tr',
    onboarded: true,
    ts: new Date().toISOString()
  };
  // Ajanlar dil seçimine göre (henüz özelleştirilmemişse) yeniden üretilir
  if (!fs.existsSync(DATA_FILE)) data.agents = defaultAgents(data.profile.lang);
  // Evrenler: onboarding'de seçilen klasörler eklenir/güncellenir
  if (Array.isArray(p.universes)) {
    for (const u of p.universes) {
      if (!u || !u.root) continue;
      const root = String(u.root);
      const prefix = path.basename(root).normalize('NFC');
      const existing = data.universes.find(x => resolveRoot(x.root) === root);
      if (existing) {
        if (u.name) existing.name = String(u.name).slice(0, 60);
        if (u.bookmark) existing.bookmark = u.bookmark;
        continue;
      }
      let id = slugify(u.name || prefix);
      while (data.universes.find(x => x.id === id)) id += '2';
      data.universes.push({ id, name: (u.name || prefix).slice(0, 60), subtitle: prefix, root, prefix, bookmark: u.bookmark || undefined, expandDirs: [] });
    }
  }
  // Ajan adları/rolleri kişiselleştirmesi
  if (Array.isArray(p.agents)) {
    for (const a of p.agents) {
      const ex = (data.agents || []).find(x => x.id === a.id);
      if (ex) {
        if (a.name) ex.name = String(a.name).slice(0, 30);
        if (a.role) ex.role = String(a.role).slice(0, 40);
      }
    }
  }
  if (!data.universes.length) return { ok: false, error: data.profile.lang === 'en' ? 'Pick at least one folder' : 'En az bir klasör seç' };
  saveData(data);
  restoreBookmarks();
  createWindow();
  if (onboardWin && !onboardWin.isDestroyed()) onboardWin.close();
  onboardWin = null;
  return { ok: true };
});

ipcMain.handle('galaxy:profileGet', () => {
  const d = loadData();
  return d.profile || { name: '', lang: 'tr', onboarded: false };
});

// ---------- ayarlar penceresi ----------
let settingsWin = null;

function openSettingsWindow(pane) {
  const q = { mode: 'settings' };
  if (pane) q.pane = String(pane);
  if (settingsWin && !settingsWin.isDestroyed()) {
    settingsWin.focus();
    try { settingsWin.webContents.send('settings:setPane', q.pane || 'profil'); } catch (e) {}
    return;
  }
  settingsWin = new BrowserWindow({
    width: 960, height: 680, resizable: true, minWidth: 800, minHeight: 560, fullscreenable: false,
    backgroundColor: '#04060c',
    titleBarStyle: 'hiddenInset',
    webPreferences: { preload: path.join(APP_DIR, 'preload.js'), contextIsolation: true }
  });
  settingsWin.loadFile(path.join(APP_DIR, 'onboarding.html'), { query: q });
  settingsWin.on('closed', () => { settingsWin = null; });
}

ipcMain.handle('galaxy:openSettings', (e, pane) => { openSettingsWindow(pane); return true; });

ipcMain.handle('galaxy:settingsGet', () => {
  const d = loadData();
  return {
    profile: d.profile || { name: '', lang: 'tr', onboarded: false },
    settings: getSettings(d),
    dataDir: DATA_DIR,
    version: app.getVersion(),
    isMas: IS_MAS
  };
});

ipcMain.handle('galaxy:settingsSave', (e, p) => {
  p = p || {};
  const d = loadData();
  d.profile = d.profile || { onboarded: true };
  if (p.name !== undefined) d.profile.name = String(p.name).trim().slice(0, 60);
  if (p.lang !== undefined) d.profile.lang = p.lang === 'en' ? 'en' : 'tr';
  const cur = getSettings(d);
  d.settings = {
    staleDays: cur.staleDays,
    planPending: cur.planPending,
    claudePath: (p.claudePath !== undefined) ? String(p.claudePath).trim() : cur.claudePath,
    terminalApp: (p.terminalApp !== undefined) ? (p.terminalApp === 'iTerm' ? 'iTerm' : 'Terminal') : cur.terminalApp,
    sshTimeout: Math.min(60, Math.max(3, +p.sshTimeout || cur.sshTimeout)),
    focusMin: cur.focusMin,
    assistantBio: (p.assistantBio !== undefined) ? String(p.assistantBio).slice(0, 2000) : cur.assistantBio,
    mcpServers: (p.mcpServers !== undefined) ? normalizeMcpServers(p.mcpServers) : cur.mcpServers,
    mailBriefTool: (p.mailBriefTool !== undefined) ? String(p.mailBriefTool).trim().slice(0, 80) : cur.mailBriefTool,
    mailSendTool: (p.mailSendTool !== undefined) ? String(p.mailSendTool).trim().slice(0, 80) : cur.mailSendTool,
    mailTo: (p.mailTo !== undefined) ? String(p.mailTo).trim().slice(0, 200) : cur.mailTo,
    mailListTool: (p.mailListTool !== undefined) ? String(p.mailListTool).trim().slice(0, 80) : cur.mailListTool,
    mailReadTool: (p.mailReadTool !== undefined) ? String(p.mailReadTool).trim().slice(0, 80) : cur.mailReadTool,
    uiTheme: 'apex'
  };
  saveData(d);
  return { ok: true, settings: getSettings(d) };
});

// ---------- döngü tuvali uzun bellek ----------
ipcMain.handle('galaxy:loopGet', () => {
  const d = loadData();
  return { ok: true, remarks: d.loopRemarks || '', lastRun: d.loopLastRun || null };
});
ipcMain.handle('galaxy:loopSave', (e, p) => {
  p = p || {};
  const d = loadData();
  if (p.remarks !== undefined) d.loopRemarks = String(p.remarks).slice(0, 8000);
  if (p.lastRun) d.loopLastRun = p.lastRun;
  saveData(d);
  return { ok: true };
});

// ---------- MCP stdio (posta brifing; gelen kutusu yok) ----------
ipcMain.handle('galaxy:mcpList', async () => {
  if (IS_MAS) return { ok: false, error: MAS_BLOCKED, tools: [] };
  const st = getSettings(loadData());
  const spec = (st.mcpServers || [])[0];
  if (!spec || !spec.command) return { ok: false, error: 'Ayarlar’da MCP komutu yok', tools: [] };
  try {
    const { withClient } = require('./lib/mcp-client');
    const tools = await withClient(spec, c => c.listTools(), ENV);
    return { ok: true, tools: (tools || []).map(t => ({ name: t.name, description: t.description || '' })), aliases: { brief: st.mailBriefTool, send: st.mailSendTool, list: st.mailListTool, read: st.mailReadTool } };
  } catch (err) {
    return { ok: false, error: err.message || String(err), tools: [] };
  }
});
ipcMain.handle('galaxy:mcpCall', async (e, { name, args, alias } = {}) => {
  if (IS_MAS) return { ok: false, error: MAS_BLOCKED };
  const st = getSettings(loadData());
  const spec = (st.mcpServers || [])[0];
  if (!spec || !spec.command) return { ok: false, error: 'Ayarlar’da MCP komutu yok' };
  let tool = String(name || '').trim();
  if (!tool && alias === 'brief') tool = st.mailBriefTool;
  if (!tool && alias === 'send') tool = st.mailSendTool;
  if (!tool && alias === 'list') tool = st.mailListTool;
  if (!tool && alias === 'read') tool = st.mailReadTool;
  if (!tool) return { ok: false, error: 'araç adı yok (Ayarlar’da alias yaz)' };
  try {
    const { withClient } = require('./lib/mcp-client');
    const result = await withClient(spec, c => c.callTool(tool, args || {}), ENV);
    return { ok: true, result };
  } catch (err) {
    return { ok: false, error: err.message || String(err) };
  }
});

// ---------- yedekten geri yükleme ----------
ipcMain.handle('galaxy:backupList', () => {
  try {
    const bdir = path.join(DATA_DIR, 'backups');
    return fs.readdirSync(bdir)
      .filter(f => /^galaxy-data-\d{4}-\d{2}-\d{2}\.json$/.test(f))
      .sort().reverse()
      .map(f => {
        let size = 0;
        try { size = fs.statSync(path.join(bdir, f)).size; } catch (err) {}
        return { name: f, date: f.slice(12, 22), size };
      });
  } catch (e) { return []; }
});

ipcMain.handle('galaxy:backupRestore', async (e, name) => {
  if (!/^galaxy-data-\d{4}-\d{2}-\d{2}\.json$/.test(String(name))) return { ok: false, error: 'Geçersiz yedek adı' };
  const file = path.join(DATA_DIR, 'backups', name);
  if (!fs.existsSync(file)) return { ok: false, error: 'Yedek bulunamadı' };
  const win = BrowserWindow.fromWebContents(e.sender);
  const { response } = await dialog.showMessageBox(win, {
    type: 'warning',
    title: 'Yedeğe Dön',
    message: `${name.slice(12, 22)} tarihli yedeğe dönülsün mü?`,
    detail: 'Mevcut veri önce güvenlik kopyası olarak saklanır, ardından uygulama yeniden başlar.',
    buttons: ['Vazgeç', 'Evet, Geri Yükle'],
    defaultId: 0, cancelId: 0
  });
  if (response !== 1) return { ok: true, action: 'cancel' };
  try {
    try { fs.copyFileSync(DATA_FILE, path.join(DATA_DIR, 'backups', 'pre-restore-' + Date.now() + '.json')); } catch (err) {}
    fs.copyFileSync(file, DATA_FILE);
    try { fs.writeFileSync(path.join(DATA_DIR, 'galaxy-data.js'), 'window.GALAXY_DATA = ' + fs.readFileSync(DATA_FILE, 'utf8') + ';', 'utf8'); } catch (err) {}
    app.relaunch();
    app.exit(0);
    return { ok: true };
  } catch (err) { return { ok: false, error: err.message }; }
});

g.slugify = slugify;
g.buildTree = buildTree;
g.safeJoin = safeJoin;
g.needsOnboarding = needsOnboarding;
g.createOnboardingWindow = createOnboardingWindow;
g.openSettingsWindow = openSettingsWindow;
g.TEXT_EXT = TEXT_EXT;
g.IMAGE_EXT = IMAGE_EXT;
g.MEDIA_EXT = MEDIA_EXT;
g.onboardWin = onboardWin;
g.settingsWin = settingsWin;
  }
};
