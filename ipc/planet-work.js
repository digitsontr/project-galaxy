'use strict';
const planetWork = require('../lib/planet-work');

module.exports = function register(g) {
  const {
    ipcMain, fs, path, execFile, shell,
    loadData, saveData, scanProjects, knownPaths, isRemotePath,
    encPass, probePort, IS_MAS, MAS_BLOCKED, ENV, docker
  } = g;

  function projById(id) {
    const scan = scanProjects();
    return (scan.projects || []).find(p => p.id === id) || null;
  }

  function localProj(id) {
    const proj = projById(id);
    if (!proj || !proj.path) return { error: 'Proje bulunamadı' };
    if (isRemotePath(proj.path)) return { error: 'Uzak gezegende bu iş yok', remote: true, proj };
    if (!knownPaths.has(proj.path)) return { error: 'Geçersiz yol' };
    return { proj };
  }

  function composeFile(dir) {
    for (const n of planetWork.COMPOSE_NAMES) {
      const f = path.join(dir, n);
      if (fs.existsSync(f)) return n;
    }
    return '';
  }

  function runGh(cwd, args, timeout) {
    return new Promise(resolve => {
      execFile('gh', args, { cwd, env: ENV, timeout: timeout || 25000, maxBuffer: 4 * 1024 * 1024 }, (err, out, se) => {
        if (err) resolve({ ok: false, error: String(se || err.message || '').trim() || 'gh yok — Terminal’de: gh auth login', out: String(out || '') });
        else resolve({ ok: true, out: String(out || '') });
      });
    });
  }

  function runCompose(cwd, args, timeout) {
    return new Promise(resolve => {
      execFile('docker', ['compose'].concat(args), { cwd, env: ENV, timeout: timeout || 90000, maxBuffer: 8 * 1024 * 1024 }, (err, out, se) => {
        if (err) resolve({ ok: false, error: String(se || err.message || '').trim() || 'compose başarısız', out: String(out || '') });
        else resolve({ ok: true, out: String(out || '') });
      });
    });
  }

  ipcMain.handle('galaxy:planetContext', async (e, projectId) => {
    const loc = localProj(projectId);
    if (loc.remote) {
      return { ok: true, remote: true, reason: 'Uzak gezegen salt okunur — compose, .env ve script burada çalışmaz.', env: {}, compose: null, scripts: [], migrate: null, ports: [], related: [], boundDbId: '', prs: [] };
    }
    if (loc.error) return { ok: false, error: loc.error };
    const proj = loc.proj;
    const data = loadData();
    const inspected = planetWork.inspectPlanet(fs, path, proj.path);
    const bound = (data.dbs || []).find(d => d.projectId === proj.id) || null;
    const related = planetWork.relatedPlanets(
      (scanProjects().projects || []).map(p => ({ id: p.id, name: p.name, path: p.path, pkgName: '', composeProject: '' })),
      { id: proj.id, name: proj.name, path: proj.path, pkgName: inspected.pkgName, compose: inspected.compose }
    );
    const listening = [];
    for (const port of (inspected.ports || []).slice(0, 6)) {
      try { if (await probePort(port, 250)) listening.push(port); } catch (err) {}
    }
    return {
      ok: true,
      remote: false,
      env: inspected.env,
      compose: inspected.compose,
      scripts: inspected.scripts,
      migrate: inspected.migrate,
      ports: inspected.ports,
      listening,
      pkgName: inspected.pkgName,
      related,
      boundDbId: bound ? bound.id : '',
      boundDbName: bound ? bound.name : ''
    };
  });

  // Proje haritası (akış şeması + veri katmanı). Analiz worker'da koşar; sonuç kısa süre önbellekte.
  const mapCache = new Map();
  function analyzeInWorker(root, timeoutMs) {
    return new Promise(resolve => {
      let worker;
      try {
        const { Worker } = require('worker_threads');
        worker = new Worker(path.join(__dirname, 'scan-worker.js'), { workerData: { kind: 'projectMap', root } });
      } catch (err) { resolve({ ok: false, error: 'Analiz başlatılamadı: ' + err.message }); return; }
      let done = false;
      const finish = (val) => { if (done) return; done = true; clearTimeout(to); try { worker.terminate(); } catch (err) {} resolve(val); };
      const to = setTimeout(() => finish({ ok: false, error: 'Analiz zaman aşımı — proje çok büyük' }), timeoutMs || 30000);
      worker.on('message', msg => finish(msg && typeof msg === 'object' ? msg : { ok: false, error: 'Analiz yanıtı bozuk' }));
      worker.on('error', err => finish({ ok: false, error: 'Analiz hatası: ' + err.message }));
      worker.on('exit', code => { if (!done && code !== 0) finish({ ok: false, error: 'Analiz beklenmedik şekilde bitti (kod ' + code + ')' }); });
    });
  }

  ipcMain.handle('galaxy:projectMap', async (e, { projectId, force } = {}) => {
    const loc = localProj(projectId);
    if (loc.remote) return { ok: false, remote: true, error: 'Uzak projede akış şeması henüz yok — yerel kopyada aç.' };
    if (loc.error) return { ok: false, error: loc.error };
    const root = loc.proj.path;
    const hit = mapCache.get(root);
    let map = (!force && hit && Date.now() - hit.at < 20000) ? hit.map : null;
    if (!map) {
      map = await analyzeInWorker(root, 30000);
      if (map && map.ok) {
        mapCache.set(root, { at: Date.now(), map });
        if (mapCache.size > 12) mapCache.delete(mapCache.keys().next().value);
      }
    }
    if (!map || !map.ok) return map || { ok: false, error: 'Analiz başarısız' };
    const bound = (loadData().dbs || []).find(d => d.projectId === loc.proj.id);
    if (!bound) return map;
    const out = Object.assign({}, map, { nodes: map.nodes.map(n => Object.assign({}, n)) });
    const info = { id: bound.id, name: bound.name, type: bound.type, host: bound.host || '', port: bound.port || 0, database: bound.database || (bound.file ? path.basename(bound.file) : '') };
    let target = out.nodes.find(n => n.kind === 'db' && n.engine === bound.type) || out.nodes.find(n => n.kind === 'db' && n.engine === 'sql');
    if (!target) {
      target = { id: 'db:' + bound.type, kind: 'db', label: ({ postgres: 'PostgreSQL', mysql: 'MySQL', sqlite: 'SQLite', mssql: 'SQL Server' })[bound.type] || bound.type, engine: bound.type, sources: [], models: [], tables: [], files: [] };
      out.nodes.push(target);
    }
    target.bound = info;
    target.sources = (target.sources || []).concat(['bağlantı']);
    return out;
  });

  ipcMain.handle('galaxy:planetBindDb', async (e, { projectId } = {}) => {
    const loc = localProj(projectId);
    if (loc.error) return { ok: false, error: loc.error };
    const inspected = planetWork.inspectPlanet(fs, path, loc.proj.path);
    const hint = inspected.env && inspected.env.dbHint;
    if (!hint) return { ok: false, error: 'Bu klasörde DATABASE_URL / DB_* yok' };
    let password = '';
    for (const n of planetWork.ENV_NAMES) {
      const raw = (() => { try { return fs.existsSync(path.join(loc.proj.path, n)) ? fs.readFileSync(path.join(loc.proj.path, n), 'utf8') : ''; } catch (err) { return ''; } })();
      const parsed = planetWork.parseEnv(raw);
      if (parsed.map.DATABASE_URL) {
        const u = planetWork.parseDatabaseUrl(parsed.map.DATABASE_URL);
        if (u && u.password) password = u.password;
      }
      password = password || parsed.map.DB_PASSWORD || parsed.map.POSTGRES_PASSWORD || parsed.map.MYSQL_PASSWORD || parsed.map.PGPASSWORD || '';
      if (password) break;
    }
    const data = loadData();
    data.dbs = data.dbs || [];
    const name = (loc.proj.name || 'gezegen') + ' DB';
    let rec = data.dbs.find(d => d.projectId === loc.proj.id);
    const id = rec ? rec.id : String(Date.now());
    const clean = hint.type === 'sqlite'
      ? { id, name, type: 'sqlite', file: hint.file || '', host: '', port: 0, database: path.basename(hint.file || 'sqlite'), user: '', password: encPass(''), projectId: loc.proj.id }
      : {
        id, name, type: hint.type === 'mysql' ? 'mysql' : 'postgres',
        host: hint.host || 'localhost', port: +hint.port || (hint.type === 'mysql' ? 3306 : 5432),
        database: hint.database || '', user: hint.user || '',
        password: password ? encPass(password) : (rec ? rec.password : encPass('')),
        projectId: loc.proj.id
      };
    const idx = data.dbs.findIndex(d => d.id === id);
    if (idx >= 0) data.dbs[idx] = Object.assign({}, data.dbs[idx], clean);
    else data.dbs.push(clean);
    saveData(data);
    return { ok: true, id, name };
  });

  ipcMain.handle('galaxy:planetCompose', async (e, { projectId, action } = {}) => {
    if (IS_MAS) return { ok: false, error: MAS_BLOCKED };
    const loc = localProj(projectId);
    if (loc.error) return { ok: false, error: loc.error };
    const file = composeFile(loc.proj.path);
    if (!file) return { ok: false, error: 'compose.yaml yok' };
    const act = String(action || '');
    if (act === 'up') return runCompose(loc.proj.path, ['-f', file, 'up', '-d'], 120000);
    if (act === 'down') return runCompose(loc.proj.path, ['-f', file, 'down'], 90000);
    if (act === 'logs') {
      const r = await runCompose(loc.proj.path, ['-f', file, 'logs', '--no-color', '--tail', '120'], 25000);
      return r.ok ? { ok: true, logs: r.out } : r;
    }
    if (act === 'ps') {
      const r = await runCompose(loc.proj.path, ['-f', file, 'ps', '--format', 'json'], 20000);
      return r;
    }
    return { ok: false, error: 'Bilinmeyen compose eylemi' };
  });

  ipcMain.handle('galaxy:planetPrs', async (e, { projectId } = {}) => {
    const loc = localProj(projectId);
    if (loc.error) return { ok: false, error: loc.error, prs: [] };
    const r = await runGh(loc.proj.path, ['pr', 'list', '--json', 'number,title,url,state,headRefName', '-L', '8'], 20000);
    if (!r.ok) return { ok: false, error: r.error, prs: [] };
    let prs = [];
    try { prs = JSON.parse(r.out || '[]'); } catch (err) { prs = []; }
    return { ok: true, prs: (prs || []).slice(0, 8) };
  });

  ipcMain.handle('galaxy:planetPrCreate', async (e, { projectId, title, body } = {}) => {
    const loc = localProj(projectId);
    if (loc.error) return { ok: false, error: loc.error };
    const args = ['pr', 'create'];
    if (title && String(title).trim()) args.push('--title', String(title).slice(0, 180));
    else args.push('--fill');
    if (body && String(body).trim()) args.push('--body', String(body).slice(0, 4000));
    const r = await runGh(loc.proj.path, args, 45000);
    if (!r.ok) return r;
    const url = (r.out.match(/https:\/\/github\.com\/\S+/) || [])[0] || '';
    if (url) { try { shell.openExternal(url); } catch (err) {} }
    return { ok: true, url, out: r.out };
  });

  ipcMain.handle('galaxy:probePort', async (e, port) => {
    const n = parseInt(port, 10);
    if (!(n >= 1 && n <= 65535)) return { ok: false, listening: false };
    try { return { ok: true, listening: !!(await probePort(n, 400)) }; }
    catch (err) { return { ok: true, listening: false }; }
  });

  ipcMain.handle('galaxy:openPrUrl', (e, url) => {
    const u = String(url || '');
    if (!/^https:\/\/github\.com\/[\w.-]+\/[\w.-]+\/(pull|issues)\/\d+/.test(u) && !/^https:\/\/github\.com\/[\w.-]+\/[\w.-]+\/actions\/runs\/\d+/.test(u)) return { ok: false };
    try { shell.openExternal(u); return { ok: true }; } catch (err) { return { ok: false }; }
  });

  ipcMain.handle('galaxy:planetIssues', async (e, { projectId } = {}) => {
    const loc = localProj(projectId);
    if (loc.error) return { ok: false, error: loc.error, issues: [] };
    const r = await runGh(loc.proj.path, ['issue', 'list', '--json', 'number,title,url,state', '-L', '12'], 20000);
    if (!r.ok) return { ok: false, error: r.error, issues: [] };
    let issues = [];
    try { issues = JSON.parse(r.out || '[]'); } catch (err) { issues = []; }
    return { ok: true, issues: (issues || []).slice(0, 12) };
  });

  ipcMain.handle('galaxy:planetCi', async (e, { projectId } = {}) => {
    const loc = localProj(projectId);
    if (loc.error) return { ok: false, error: loc.error, runs: [] };
    const r = await runGh(loc.proj.path, ['run', 'list', '--json', 'databaseId,name,status,conclusion,url,headBranch,displayTitle', '-L', '8'], 20000);
    if (!r.ok) return { ok: false, error: r.error, runs: [] };
    let runs = [];
    try { runs = JSON.parse(r.out || '[]'); } catch (err) { runs = []; }
    return { ok: true, runs: (runs || []).slice(0, 8) };
  });

  ipcMain.handle('galaxy:universeTraffic', async () => {
    const scan = scanProjects();
    const projects = (scan.projects || []).filter(p => p.path && !isRemotePath(p.path) && knownPaths.has(p.path)).slice(0, 14);
    const rows = [];
    for (const proj of projects) {
      const inspected = planetWork.inspectPlanet(fs, path, proj.path);
      const listening = [];
      for (const port of (inspected.ports || []).slice(0, 3)) {
        try { if (await probePort(port, 180)) listening.push(port); } catch (err) {}
      }
      let composeUp = false;
      if (inspected.compose && !IS_MAS) {
        try {
          const r = await runCompose(proj.path, ['-f', inspected.compose.file, 'ps', '--format', 'json'], 12000);
          const raw = String((r && r.out) || '').trim();
          if (r && r.ok && raw) {
            try {
              const rows = raw[0] === '[' ? JSON.parse(raw) : raw.split('\n').filter(Boolean).map(l => JSON.parse(l));
              composeUp = (rows || []).some(x => /running|up/i.test(String((x && (x.State || x.Status || x.state)) || '')));
            } catch (err) { composeUp = /running|up/i.test(raw); }
          }
        } catch (err) {}
      }
      rows.push({
        id: proj.id, name: proj.name,
        compose: inspected.compose ? inspected.compose.file : '',
        composeUp, listening, ports: inspected.ports || []
      });
    }
    return { ok: true, rows };
  });

  ipcMain.handle('galaxy:universeGrep', async (e, { query } = {}) => {
    const q = String(query || '').trim();
    if (q.length < 2) return { ok: false, error: 'En az 2 karakter', matches: [] };
    const scan = scanProjects();
    const projects = (scan.projects || []).filter(p => p.path && !isRemotePath(p.path) && knownPaths.has(p.path)).slice(0, 10);
    const matches = [];
    for (const proj of projects) {
      if (matches.length >= 80) break;
      const useGit = fs.existsSync(path.join(proj.path, '.git'));
      const args = useGit
        ? ['grep', '-n', '-I', '--no-color', '--fixed-strings', '--ignore-case', '-e', q]
        : ['-rniI', '--exclude-dir=.git', '--exclude-dir=node_modules', '--exclude-dir=dist', '--fixed-strings', q, '.'];
      const bin = useGit ? 'git' : 'grep';
      const out = await new Promise(resolve => {
        execFile(bin, args, { cwd: proj.path, env: ENV, timeout: 8000, maxBuffer: 2 * 1024 * 1024 }, (err, stdout) => {
          resolve(String(stdout || ''));
        });
      });
      const lines = out.split('\n').filter(Boolean).slice(0, 12);
      for (const l of lines) {
        const m = l.match(/^(?:\.[/\\])?(.+?):(\d+):(.*)$/);
        if (!m) continue;
        matches.push({ planet: proj.name, projectId: proj.id, file: m[1], line: +m[2], text: m[3].slice(0, 180) });
        if (matches.length >= 80) break;
      }
    }
    return { ok: true, matches, truncated: matches.length >= 80 };
  });

  function normTodo(t) {
    return String(t || '').replace(/\s+/g, ' ').trim().toLowerCase();
  }
  function planText(it) {
    return Array.isArray(it) ? String(it[0] || '') : String((it && (it.text != null ? it.text : it[0])) || '');
  }
  function planDone(it) {
    return Array.isArray(it) ? !!it[1] : !!(it && it.done);
  }
  function pendingFromReadme(dir) {
    try {
      const names = fs.readdirSync(dir);
      const md = names.find(f => String(f).toLowerCase() === 'readme.md');
      if (!md) return [];
      const content = fs.readFileSync(path.join(dir, md), 'utf8').slice(0, 80000);
      const out = [];
      const re = /^\s*[-*]\s+\[([ xX])\]\s+(.+?)\s*$/gm;
      let m;
      while ((m = re.exec(content))) {
        if (String(m[1]).toLowerCase() !== 'x') out.push(String(m[2] || '').trim());
      }
      return out.filter(Boolean);
    } catch (err) { return []; }
  }

  ipcMain.handle('galaxy:todoSeedFromPlans', (e, { universe } = {}) => {
    const data = loadData();
    data.todos = data.todos || [];
    data.todoSkip = data.todoSkip || [];
    const skip = new Set(data.todoSkip);
    const have = new Set((data.todos || []).map(t => String(t.projectId || '') + '\0' + normTodo(t.text)));
    const scan = scanProjects();
    const projects = (scan.projects || []).filter(p => p && p.id && (!universe || p.universe === universe));
    let added = 0;
    for (const proj of projects) {
      const texts = [];
      const seen = new Set();
      const push = (raw) => {
        const t = String(raw || '').replace(/\s+/g, ' ').trim();
        const n = normTodo(t);
        if (!t || !n || seen.has(n)) return;
        seen.add(n);
        texts.push(t);
      };
      for (const it of (proj.plan || [])) { if (!planDone(it)) push(planText(it)); }
      if (proj.path && !isRemotePath(proj.path) && knownPaths.has(proj.path)) {
        for (const t of pendingFromReadme(proj.path)) push(t);
      }
      for (const t of texts) {
        const key = proj.id + '\0' + normTodo(t);
        const skipKey = proj.id + '::' + normTodo(t);
        if (skip.has(skipKey) || have.has(key)) continue;
        data.todos.push({
          id: 'pl-' + Date.now().toString(36) + '-' + added,
          universe: proj.universe,
          text: t,
          done: false,
          status: 'todo',
          ts: new Date().toISOString(),
          projectId: proj.id,
          branch: (proj.git && proj.git.branch) || '',
          fromPlan: true
        });
        have.add(key);
        added++;
      }
    }
    if (added) {
      data.todos = data.todos.slice(0, 500);
      saveData(data);
    }
    return { ok: true, added };
  });

  ipcMain.handle('galaxy:todoSkip', (e, { projectId, text, has } = {}) => {
    const pid = String(projectId || '');
    const n = normTodo(text);
    if (!pid || !n) return { ok: false };
    const data = loadData();
    data.todoSkip = data.todoSkip || [];
    const key = pid + '::' + n;
    if (has) return { ok: true, skip: data.todoSkip.includes(key) };
    if (!data.todoSkip.includes(key)) {
      data.todoSkip.push(key);
      data.todoSkip = data.todoSkip.slice(-800);
      saveData(data);
    }
    return { ok: true, skip: true };
  });

  ipcMain.handle('galaxy:todoSkipHas', (e, { projectId, text } = {}) => {
    const pid = String(projectId || '');
    const n = normTodo(text);
    if (!pid || !n) return { ok: false, skip: false };
    const data = loadData();
    const key = pid + '::' + n;
    return { ok: true, skip: (data.todoSkip || []).includes(key) };
  });

  g.planetWork = planetWork;
};
