'use strict';
// Gezegen klasöründen iş bağlamı: .env (değerler Galaxy'ye kopyalanmaz), compose, script, migrate.
const COMPOSE_NAMES = ['compose.yaml', 'compose.yml', 'docker-compose.yaml', 'docker-compose.yml'];
const ENV_NAMES = ['.env', '.env.local', '.env.development'];
const EXAMPLE_NAMES = ['.env.example', '.env.sample', '.env.template'];

function readText(fs, file, max) {
  try {
    if (!fs.existsSync(file)) return '';
    return fs.readFileSync(file, 'utf8').slice(0, max || 120000);
  } catch (e) { return ''; }
}

function parseEnv(text) {
  const map = {};
  const keys = [];
  String(text || '').split(/\r?\n/).forEach(line => {
    const t = line.trim();
    if (!t || t.startsWith('#')) return;
    const m = t.match(/^(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/);
    if (!m) return;
    let v = m[2].trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
    if (!map[m[1]]) keys.push(m[1]);
    map[m[1]] = v;
  });
  return { map, keys };
}

function parseDatabaseUrl(url) {
  const s = String(url || '').trim();
  if (!s) return null;
  try {
    const u = new URL(s.replace(/^jdbc:/, ''));
    const proto = (u.protocol || '').replace(':', '').toLowerCase();
    const type = /mysql|mariadb/.test(proto) ? 'mysql' : (/sqlite/.test(proto) ? 'sqlite' : 'postgres');
    if (type === 'sqlite') {
      const file = decodeURIComponent((u.pathname || '').replace(/^\/\//, '') || u.hostname || '');
      return { type, file, host: '', port: 0, database: file.split('/').pop() || 'sqlite', user: '', password: u.password || '' };
    }
    return {
      type,
      host: u.hostname || 'localhost',
      port: +(u.port || (type === 'mysql' ? 3306 : 5432)),
      database: (u.pathname || '').replace(/^\//, '').split('?')[0] || '',
      user: decodeURIComponent(u.username || ''),
      password: decodeURIComponent(u.password || '')
    };
  } catch (e) { return null; }
}

function dbHintFromEnv(map) {
  if (!map) return null;
  if (map.DATABASE_URL) {
    const p = parseDatabaseUrl(map.DATABASE_URL);
    if (p) return { type: p.type, host: p.host, port: p.port, database: p.database, user: p.user, file: p.file || '', hasPass: !!p.password };
  }
  const type = /mysql/i.test(map.DB_CONNECTION || map.DATABASE_TYPE || '') ? 'mysql'
    : /sqlite/i.test(map.DB_CONNECTION || map.DATABASE_TYPE || '') ? 'sqlite' : 'postgres';
  const host = map.DB_HOST || map.POSTGRES_HOST || map.PGHOST || map.MYSQL_HOST;
  const database = map.DB_NAME || map.POSTGRES_DB || map.PGDATABASE || map.MYSQL_DATABASE || map.DB_DATABASE;
  const user = map.DB_USER || map.POSTGRES_USER || map.PGUSER || map.MYSQL_USER || map.DB_USERNAME;
  const port = +(map.DB_PORT || map.POSTGRES_PORT || map.PGPORT || map.MYSQL_PORT || 0);
  if (host || database || user) {
    return {
      type,
      host: host || 'localhost',
      port: port || (type === 'mysql' ? 3306 : 5432),
      database: database || '',
      user: user || '',
      file: map.SQLITE_PATH || map.DB_FILE || '',
      hasPass: !!(map.DB_PASSWORD || map.POSTGRES_PASSWORD || map.MYSQL_PASSWORD || map.PGPASSWORD)
    };
  }
  return null;
}

function parseCompose(text) {
  const services = [];
  const ports = [];
  let inServices = false;
  let cur = '';
  String(text || '').split(/\r?\n/).forEach(raw => {
    const line = raw.replace(/\t/g, '  ');
    if (/^services:\s*$/.test(line)) { inServices = true; return; }
    if (inServices && /^\S/.test(line) && !/^services:/.test(line)) inServices = false;
    if (!inServices) return;
    const sm = line.match(/^  ([A-Za-z0-9_.-]+):\s*$/);
    if (sm) { cur = sm[1]; if (!services.includes(cur)) services.push(cur); return; }
    const pm = line.match(/["']?(\d{2,5}):\d+/);
    if (pm) {
      const n = +pm[1];
      if (n >= 1 && n <= 65535 && !ports.includes(n)) ports.push(n);
    }
  });
  return { services: services.slice(0, 24), ports: ports.slice(0, 12) };
}

function parsePackageScripts(text) {
  try {
    const j = JSON.parse(text);
    const scripts = (j && j.scripts && typeof j.scripts === 'object') ? j.scripts : {};
    const name = (j && j.name) || '';
    const out = Object.keys(scripts).slice(0, 24).map(k => ({ name: k, cmd: String(scripts[k] || '').slice(0, 160), kind: 'npm' }));
    return { name, scripts: out, deps: Object.assign({}, j.dependencies || {}, j.devDependencies || {}) };
  } catch (e) { return { name: '', scripts: [], deps: {} }; }
}

function parseMakeTargets(text) {
  const out = [];
  String(text || '').split(/\r?\n/).forEach(line => {
    const m = line.match(/^([A-Za-z][A-Za-z0-9_-]*):/);
    if (m && m[1] !== 'PHONY' && !out.includes(m[1])) out.push(m[1]);
  });
  return out.slice(0, 16).map(name => ({ name, cmd: 'make ' + name, kind: 'make' }));
}

function parseJustTargets(text) {
  const out = [];
  String(text || '').split(/\r?\n/).forEach(line => {
    const m = line.match(/^([A-Za-z][A-Za-z0-9_-]+):/);
    if (m && !out.includes(m[1])) out.push(m[1]);
  });
  return out.slice(0, 16).map(name => ({ name, cmd: 'just ' + name, kind: 'just' }));
}

function detectMigrate(fs, dir, pkg) {
  const has = n => { try { return fs.existsSync(require('path').join(dir, n)); } catch (e) { return false; } };
  const scripts = ((pkg && pkg.scripts) || []).map(s => s.name + ' ' + s.cmd).join(' ').toLowerCase();
  if (has('prisma/schema.prisma') || /prisma/.test(scripts)) {
    return { kind: 'prisma', label: 'Prisma migrate', run: /prisma/.test(scripts) ? 'npx prisma migrate dev' : 'npx prisma migrate dev', seed: has('prisma/seed.js') || has('prisma/seed.ts') || /db:seed|prisma db seed/.test(scripts) };
  }
  if (has('alembic.ini') || has('alembic')) return { kind: 'alembic', label: 'Alembic', run: 'alembic upgrade head', seed: /seed/.test(scripts) };
  if (has('db/migrate')) return { kind: 'rails', label: 'Rails migrate', run: 'bin/rails db:migrate', seed: has('db/seeds.rb') };
  if (has('manage.py')) {
    try {
      const names = fs.readdirSync(dir);
      const hasMig = names.some(n => {
        try { return fs.existsSync(require('path').join(dir, n, 'migrations')); } catch (e) { return false; }
      }) || has('migrations');
      if (hasMig) return { kind: 'django', label: 'Django migrate', run: 'python manage.py migrate', seed: has('seed.py') || /seed/.test(scripts) };
    } catch (e) {}
  }
  if (/knex|typeorm|drizzle|migrate/.test(scripts)) return { kind: 'sql', label: 'migrate', run: /migrate/.test(scripts) ? 'npm run migrate' : 'npm run db:migrate', seed: /seed/.test(scripts) };
  return null;
}

function portsFromScripts(scripts, envMap) {
  const ports = [];
  const add = n => { n = +n; if (n >= 1 && n <= 65535 && !ports.includes(n)) ports.push(n); };
  if (envMap && envMap.PORT) add(envMap.PORT);
  (scripts || []).forEach(s => {
    const cmd = String(s.cmd || '');
    const m = cmd.match(/--port(?:\s|=)(\d{2,5})/) || cmd.match(/:(\d{2,5})\b/);
    if (m) add(m[1]);
    if (/\b(vite|next|nuxt|dev)\b/.test(s.name) && !m) {
      if (/vite/.test(cmd)) add(5173);
      else if (/next/.test(cmd)) add(3000);
      else add(3000);
    }
  });
  return ports.slice(0, 8);
}

function preferredScripts(scripts) {
  const rank = { dev: 0, start: 1, test: 2, typecheck: 3, lint: 4, build: 5, migrate: 6, seed: 7 };
  return (scripts || []).slice().sort((a, b) => {
    const ra = rank[a.name] != null ? rank[a.name] : 40;
    const rb = rank[b.name] != null ? rank[b.name] : 40;
    return ra - rb;
  }).slice(0, 8);
}

function slugCompose(dir) {
  return String(require('path').basename(dir) || '').toLowerCase().replace(/[^a-z0-9_-]+/g, '');
}

function inspectPlanet(fs, pathMod, dir) {
  const out = {
    env: { present: false, example: false, missing: [], hasDatabaseUrl: false, dbHint: null, composeProject: '' },
    compose: null,
    scripts: [],
    pkgName: '',
    migrate: null,
    ports: [],
    files: []
  };
  if (!dir) return out;
  let names = [];
  try { names = fs.readdirSync(dir).map(n => n.normalize ? n.normalize('NFC') : n); } catch (e) { return out; }
  const set = new Set(names);
  out.files = names.slice(0, 80);

  let envMap = {};
  let envKeys = [];
  for (const n of ENV_NAMES) {
    if (!set.has(n)) continue;
    const parsed = parseEnv(readText(fs, pathMod.join(dir, n), 40000));
    envMap = Object.assign(envMap, parsed.map);
    parsed.keys.forEach(k => { if (!envKeys.includes(k)) envKeys.push(k); });
    out.env.present = true;
  }
  let exKeys = [];
  for (const n of EXAMPLE_NAMES) {
    if (!set.has(n)) continue;
    out.env.example = true;
    parseEnv(readText(fs, pathMod.join(dir, n), 40000)).keys.forEach(k => { if (!exKeys.includes(k)) exKeys.push(k); });
  }
  out.env.missing = exKeys.filter(k => !envKeys.includes(k) && !/secret|password|token|key/i.test(k)).slice(0, 12);
  out.env.hasDatabaseUrl = !!(envMap.DATABASE_URL);
  out.env.dbHint = dbHintFromEnv(envMap);
  out.env.composeProject = envMap.COMPOSE_PROJECT_NAME || '';

  for (const n of COMPOSE_NAMES) {
    if (!set.has(n)) continue;
    const parsed = parseCompose(readText(fs, pathMod.join(dir, n), 80000));
    out.compose = { file: n, services: parsed.services, ports: parsed.ports, project: out.env.composeProject || slugCompose(dir) };
    parsed.ports.forEach(p => { if (!out.ports.includes(p)) out.ports.push(p); });
    break;
  }

  let pkg = { name: '', scripts: [], deps: {} };
  if (set.has('package.json')) pkg = parsePackageScripts(readText(fs, pathMod.join(dir, 'package.json'), 80000));
  out.pkgName = pkg.name || '';
  let scripts = pkg.scripts.slice();
  if (set.has('Makefile') || set.has('makefile')) scripts = scripts.concat(parseMakeTargets(readText(fs, pathMod.join(dir, set.has('Makefile') ? 'Makefile' : 'makefile'), 40000)));
  if (set.has('justfile') || set.has('Justfile')) scripts = scripts.concat(parseJustTargets(readText(fs, pathMod.join(dir, set.has('justfile') ? 'justfile' : 'Justfile'), 20000)));
  if (set.has('pyproject.toml')) {
    const py = readText(fs, pathMod.join(dir, 'pyproject.toml'), 40000);
    const m = py.match(/\[project\.scripts\]([\s\S]*?)(\n\[|$)/);
    if (m) {
      String(m[1]).split(/\n/).forEach(line => {
        const sm = line.match(/^\s*([A-Za-z0-9_-]+)\s*=/);
        if (sm) scripts.push({ name: sm[1], cmd: sm[1], kind: 'py' });
      });
    }
  }
  out.scripts = preferredScripts(scripts);
  out.migrate = detectMigrate(fs, dir, pkg);
  if (out.migrate && !out.scripts.some(s => s.name === 'migrate' || s.cmd === out.migrate.run)) {
    out.scripts = out.scripts.concat([{ name: 'migrate', cmd: out.migrate.run, kind: out.migrate.kind }]).slice(0, 8);
  }
  portsFromScripts(scripts, envMap).forEach(p => { if (!out.ports.includes(p)) out.ports.push(p); });
  if (out.compose && out.compose.ports) out.compose.ports.forEach(p => { if (!out.ports.includes(p)) out.ports.push(p); });
  return out;
}

function relatedPlanets(all, me) {
  if (!me || !me.path) return [];
  const parent = require('path').dirname(me.path);
  const pkg = String(me.pkgName || '').toLowerCase();
  const compose = String((me.compose && me.compose.project) || '').toLowerCase();
  const out = [];
  (all || []).forEach(p => {
    if (!p || p.id === me.id || !p.path) return;
    let why = '';
    if (require('path').dirname(p.path) === parent) why = 'aynı klasör';
    if (compose && p.composeProject && String(p.composeProject).toLowerCase() === compose) why = why || 'compose';
    if (pkg && p.pkgName && String(p.pkgName).toLowerCase() === pkg) why = why || 'paket';
    if (why) out.push({ id: p.id, name: p.name, why });
  });
  return out.slice(0, 6);
}

module.exports = {
  inspectPlanet,
  parseEnv,
  parseDatabaseUrl,
  dbHintFromEnv,
  relatedPlanets,
  slugCompose,
  COMPOSE_NAMES,
  ENV_NAMES
};
