'use strict';
// Proje haritası: kaynak dosyaları çalıştırmadan okuyup mimari akışı çıkarır.
// Giriş noktaları (script/main/bin/__main__) → modüller (klasör grupları, import kenarları)
// → rotalar / IPC kanalları → veri katmanı (.env, compose, Prisma, sürücüler, koddaki tablolar)
// → dış servisler (SDK'lar, fetch edilen hostlar). Değerler (.env şifreleri) dışarı verilmez.
const fs = require('fs');
const path = require('path');

const SKIP_DIRS = new Set(['node_modules', '.git', 'dist', 'build', 'out', '.next', '.nuxt', '.svelte-kit', '.output', 'coverage',
  'vendor', 'venv', '.venv', 'env', '__pycache__', 'target', '.idea', '.vscode', '.turbo', '.cache', 'Pods', 'DerivedData',
  'bower_components', '.gradle', 'release', 'tmp', '.parcel-cache', '.expo', 'site-packages', '.mypy_cache', '.pytest_cache', '.tox']);
const SRC_EXT = {
  '.js': 'js', '.jsx': 'js', '.mjs': 'js', '.cjs': 'js', '.ts': 'ts', '.tsx': 'ts', '.mts': 'ts', '.cts': 'ts',
  '.vue': 'vue', '.svelte': 'svelte', '.py': 'py', '.go': 'go', '.rb': 'rb', '.php': 'php', '.java': 'java',
  '.kt': 'kt', '.cs': 'cs', '.rs': 'rs', '.swift': 'swift'
};
const JS_LIKE = new Set(['js', 'ts', 'vue', 'svelte']);
const RESOLVE_EXT = ['', '.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs', '.vue', '.svelte', '/index.ts', '/index.tsx', '/index.js', '/index.jsx', '/index.mjs'];
const LIMITS = { walk: 8000, analyze: 1500, bytes: 256 * 1024, routesPerFile: 200 };
const COMPOSE_NAMES = ['compose.yaml', 'compose.yml', 'docker-compose.yaml', 'docker-compose.yml'];
const ENV_NAMES = ['.env', '.env.local', '.env.development'];

const ENGINE_LABEL = { postgres: 'PostgreSQL', mysql: 'MySQL', sqlite: 'SQLite', mssql: 'SQL Server', mongo: 'MongoDB', redis: 'Redis', firestore: 'Firestore', sql: 'SQL veritabanı' };
const DB_LIBS = {
  pg: 'postgres', 'pg-promise': 'postgres', postgres: 'postgres', '@neondatabase/serverless': 'postgres', '@vercel/postgres': 'postgres',
  mysql: 'mysql', mysql2: 'mysql', mariadb: 'mysql',
  'better-sqlite3': 'sqlite', sqlite3: 'sqlite', sqlite: 'sqlite', 'sql.js': 'sqlite', '@libsql/client': 'sqlite',
  mssql: 'mssql', tedious: 'mssql',
  mongodb: 'mongo', mongoose: 'mongo',
  redis: 'redis', ioredis: 'redis', '@upstash/redis': 'redis',
  '@prisma/client': 'orm', sequelize: 'orm', typeorm: 'orm', knex: 'orm', 'drizzle-orm': 'orm', '@mikro-orm/core': 'orm', objection: 'orm',
  psycopg2: 'postgres', psycopg: 'postgres', asyncpg: 'postgres', pymysql: 'mysql', MySQLdb: 'mysql', 'mysql.connector': 'mysql',
  pymongo: 'mongo', motor: 'mongo', sqlalchemy: 'orm', sqlmodel: 'orm', peewee: 'orm', tortoise: 'orm', 'django.db': 'orm',
  'github.com/lib/pq': 'postgres', 'github.com/jackc/pgx': 'postgres', 'github.com/go-sql-driver/mysql': 'mysql',
  'github.com/mattn/go-sqlite3': 'sqlite', 'go.mongodb.org/mongo-driver': 'mongo', 'github.com/redis/go-redis': 'redis',
  'github.com/go-redis/redis': 'redis', 'gorm.io/gorm': 'orm', 'database/sql': 'orm'
};
const EXT_LIBS = {
  stripe: 'Stripe', openai: 'OpenAI', '@anthropic-ai/sdk': 'Anthropic', anthropic: 'Anthropic', '@google/generative-ai': 'Gemini',
  'aws-sdk': 'AWS', boto3: 'AWS', firebase: 'Firebase', 'firebase-admin': 'Firebase', '@supabase/supabase-js': 'Supabase', supabase: 'Supabase',
  twilio: 'Twilio', '@sendgrid/mail': 'SendGrid', resend: 'Resend', nodemailer: 'E-posta (SMTP)', smtplib: 'E-posta (SMTP)', imapflow: 'E-posta (IMAP)',
  '@octokit/rest': 'GitHub', octokit: 'GitHub', googleapis: 'Google API', '@slack/web-api': 'Slack', slack_sdk: 'Slack',
  '@sentry/node': 'Sentry', '@sentry/react': 'Sentry', '@sentry/nextjs': 'Sentry', sentry_sdk: 'Sentry',
  ssh2: 'SSH', 'node-ssh': 'SSH', paramiko: 'SSH', dockerode: 'Docker', docker: 'Docker',
  axios: 'HTTP API', 'node-fetch': 'HTTP API', got: 'HTTP API', ky: 'HTTP API', requests: 'HTTP API', httpx: 'HTTP API', aiohttp: 'HTTP API'
};
const EXT_PREFIX = { '@aws-sdk/': 'AWS', '@octokit/': 'GitHub', '@sentry/': 'Sentry', '@google-cloud/': 'Google Cloud', '@azure/': 'Azure' };
const COMPOSE_DB_IMAGES = [[/postgres|postgis|timescale/, 'postgres'], [/mysql|mariadb/, 'mysql'], [/mongo/, 'mongo'], [/redis|valkey|keydb/, 'redis'], [/mssql|sqlserver/, 'mssql']];

function readText(file, max) {
  try { return fs.readFileSync(file, 'utf8').slice(0, max || LIMITS.bytes); } catch (e) { return ''; }
}
function posix(p) { return String(p).split(path.sep).join('/'); }
function isTestRel(rel) {
  return /(^|\/)(__tests__|tests?|spec|e2e)\//.test(rel) || /\.(test|spec)\.[a-z]+$/.test(rel) || /_test\.(go|py)$/.test(rel) || /(^|\/)test_[^/]+\.py$/.test(rel);
}
function lineStarts(text) {
  const out = [0];
  for (let i = 0; i < text.length; i++) if (text.charCodeAt(i) === 10) out.push(i + 1);
  return out;
}
function lineAt(starts, idx) {
  let lo = 0, hi = starts.length - 1;
  while (lo < hi) { const mid = (lo + hi + 1) >> 1; if (starts[mid] <= idx) lo = mid; else hi = mid - 1; }
  return lo + 1;
}
function pkgName(spec) {
  const s = String(spec || '');
  if (s.startsWith('@')) return s.split('/').slice(0, 2).join('/');
  if (/^[a-z0-9.-]+\.[a-z]{2,}\//i.test(s)) return s; // go modülü: tam yol
  return s.split('/')[0];
}
function libLookup(table, spec) {
  if (table[spec]) return table[spec];
  const p = pkgName(spec);
  if (table[p]) return table[p];
  for (const k of Object.keys(table)) if (k.includes('/') && spec.startsWith(k)) return table[k];
  const dot = String(spec).split('.')[0];
  return table[dot] || null;
}
function extLookup(spec) {
  const hit = libLookup(EXT_LIBS, spec);
  if (hit) return hit;
  for (const [pre, label] of Object.entries(EXT_PREFIX)) if (String(spec).startsWith(pre)) return label;
  return null;
}

function classify(r, files, special) {
  const name = path.posix.basename(r);
  const ext = path.extname(name).toLowerCase();
  if (ext === '.prisma') special.prisma.push(r);
  else if (ext === '.sql') special.sql.push(r);
  else if (/\.(db|sqlite|sqlite3)$/.test(name)) special.sqliteFiles.push(r);
  else if (ext === '.html' && r.split('/').length <= 2) special.html.push(r);
  const lang = SRC_EXT[ext];
  if (!lang || /\.min\.js$|\.d\.ts$|\.bundle\.js$/.test(name)) return;
  files.push({ rel: r, lang, test: isTestRel(r) });
}

// Git deposunda .gitignore'a saygılı liste (build çıktıları, paketler girmez); değilse klasör yürüyüşü.
function gitFiles(root) {
  if (!fs.existsSync(path.join(root, '.git'))) return null;
  try {
    const out = require('child_process').execFileSync('git', ['-c', 'core.quotepath=off', 'ls-files', '-co', '--exclude-standard'], { cwd: root, timeout: 8000, maxBuffer: 32 * 1024 * 1024, stdio: ['ignore', 'pipe', 'ignore'] });
    return String(out).split('\n').filter(Boolean);
  } catch (e) { return null; }
}

function walk(root) {
  const files = [];
  const special = { prisma: [], sql: [], sqliteFiles: [], html: [] };
  const listed = gitFiles(root);
  if (listed) {
    const ok = listed.filter(r => !r.split('/').slice(0, -1).some(seg => SKIP_DIRS.has(seg)));
    ok.slice(0, LIMITS.walk).forEach(r => classify(r.normalize ? r.normalize('NFC') : r, files, special));
    files.sort((a, b) => a.rel.localeCompare(b.rel));
    return { files, special, truncated: ok.length > LIMITS.walk };
  }
  let visited = 0, truncated = false;
  const stack = [''];
  while (stack.length) {
    const rel = stack.pop();
    let ents = [];
    try { ents = fs.readdirSync(path.join(root, rel), { withFileTypes: true }); } catch (e) { continue; }
    for (const d of ents) {
      const name = d.name.normalize ? d.name.normalize('NFC') : d.name;
      const r = rel ? rel + '/' + name : name;
      if (d.isDirectory()) {
        if (SKIP_DIRS.has(name) || (name.startsWith('.') && name !== '.github')) continue;
        stack.push(r);
        continue;
      }
      if (!d.isFile()) continue;
      if (++visited > LIMITS.walk) { truncated = true; stack.length = 0; break; }
      classify(r, files, special);
    }
  }
  files.sort((a, b) => a.rel.localeCompare(b.rel));
  return { files, special, truncated };
}

function readJson(file) { try { return JSON.parse(readText(file, 400000).replace(/^\uFEFF/, '')); } catch (e) { return null; } }

function aliasMap(root) {
  const out = [];
  for (const n of ['tsconfig.json', 'jsconfig.json']) {
    const raw = readText(path.join(root, n), 200000);
    if (!raw) continue;
    let j = null;
    try { j = JSON.parse(raw.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '').replace(/,(\s*[}\]])/g, '$1')); } catch (e) { j = null; }
    const co = (j && j.compilerOptions) || {};
    const base = co.baseUrl ? posix(path.normalize(co.baseUrl)).replace(/^\.\/?/, '') : '';
    for (const [k, v] of Object.entries(co.paths || {})) {
      const target = Array.isArray(v) ? v[0] : v;
      if (!target) continue;
      out.push({ from: k.replace(/\*$/, ''), to: posix(path.join(base, String(target).replace(/\*$/, ''))).replace(/^\.\//, '') });
    }
    if (out.length) break;
  }
  if (!out.length) out.push({ from: '@/', to: 'src/' }, { from: '~/', to: 'src/' });
  return out;
}

function makeResolver(root, fileSet, aliases) {
  const tryPath = (base) => {
    for (const e of RESOLVE_EXT) {
      const p = posix(path.normalize(base + e)).replace(/^\.\//, '');
      if (fileSet.has(p)) return p;
    }
    return null;
  };
  return {
    js(fromRel, spec) {
      if (spec.startsWith('.')) return tryPath(path.posix.join(path.posix.dirname(fromRel), spec));
      if (spec.startsWith('/')) return tryPath(spec.slice(1));
      for (const a of aliases) if (a.from && spec.startsWith(a.from)) { const hit = tryPath(a.to + spec.slice(a.from.length)); if (hit) return hit; }
      return null;
    },
    joined(fromRel, segs, rootish) {
      const tail = segs.join('/');
      return (rootish ? null : tryPath(path.posix.join(path.posix.dirname(fromRel), tail))) || tryPath(tail) || tryPath(path.posix.join(path.posix.dirname(fromRel), tail));
    },
    py(fromRel, dots, mod) {
      const parts = String(mod || '').split('.').filter(Boolean);
      const bases = [];
      if (dots) {
        let d = path.posix.dirname(fromRel);
        for (let i = 1; i < dots; i++) d = path.posix.dirname(d);
        bases.push(d === '.' ? '' : d);
      } else bases.push('', 'src', 'app', path.posix.dirname(fromRel));
      for (const b of bases) {
        const stem = [b].concat(parts).filter(Boolean).join('/');
        if (!stem) continue;
        if (fileSet.has(stem + '.py')) return stem + '.py';
        if (fileSet.has(stem + '/__init__.py')) return stem + '/__init__.py';
      }
      return null;
    },
    goPkg(modPrefix, spec, dirIndex) {
      if (!modPrefix || !spec.startsWith(modPrefix)) return null;
      const dir = spec.slice(modPrefix.length).replace(/^\//, '');
      return (dirIndex.get(dir) || [])[0] || null;
    }
  };
}

const RE = {
  jsImport: /(?:^|[;\n\s])(?:import|export)\s+(?:[\w*{}\s,$]+?\s+from\s+)?['"]([^'"\n]+)['"]/g,
  jsRequire: /\b(?:require|import)\(\s*['"]([^'"\n]+)['"]\s*\)/g,
  jsJoinRequire: /\brequire\(\s*path\.(?:join|resolve)\(\s*([\w.]+)\s*((?:,\s*['"][^'"\n]+['"]\s*)+)\)\s*\)/g,
  pyFrom: /^[ \t]*from[ \t]+(\.*)([\w.]*)[ \t]+import[ \t]+([^\n#]+)/gm,
  pyImport: /^[ \t]*import[ \t]+([\w.]+(?:[ \t]*,[ \t]*[\w.]+)*)/gm,
  goImportBlock: /import\s*\(([\s\S]*?)\)/g,
  goImportOne: /import\s+(?:\w+\s+)?"([^"]+)"/g,
  jsRoute: /\b(?:app|router|server|api|routes?|fastify|hono|r|v\d)\.(get|post|put|patch|delete|all|options|head)\(\s*['"`](\/[^'"`\n]*)['"`]/g,
  nestRoute: /@(Get|Post|Put|Patch|Delete|All)\(\s*(?:['"`]([^'"`\n]*)['"`])?\s*\)/g,
  nestCtl: /@Controller\(\s*(?:['"`]([^'"`\n]*)['"`])?/,
  pyRoute: /@\w+\.(get|post|put|patch|delete|route|api_route|websocket)\(\s*['"]([^'"\n]+)['"]/g,
  djangoPath: /\b(?:re_)?path\(\s*r?['"]([^'"\n]*)['"]/g,
  ipcHandle: /\bipcMain\.(handle|on|handleOnce|once)\(\s*['"`]([^'"`\n]+)['"`]/g,
  ipcInvoke: /\bipcRenderer\.(invoke|send|sendSync)\(\s*['"`]([^'"`\n]+)['"`]/g,
  bridge: /\bcontextBridge\.exposeInMainWorld\(\s*['"`](\w+)['"`]/g,
  bridgeUse: /\bwindow\.(\w+)\s*(?:&&|\.|\?\.)/g,
  httpCall: /\b(?:fetch|axios(?:\.(?:get|post|put|patch|delete|request))?|\$fetch|ky(?:\.\w+)?|useFetch|useSWR)\(\s*['"`](\/[^'"`?#\s$]*)/g,
  extUrl: /\b(?:fetch|axios(?:\.\w+)?|got(?:\.\w+)?|requests\.\w+|httpx\.\w+|https?\.(?:get|request)|aiohttp\.\w+|ky(?:\.\w+)?)\(\s*[f]?['"`](https?:\/\/[^'"`/\s$]+)/g,
  sqlTable: /\b(?:FROM|JOIN|INTO|UPDATE|TABLE)\s+[`"\[]?([A-Za-z_][\w]*)(?:[`"\]]?\.[`"\[]?([A-Za-z_]\w*))?/g,
  knexTable: /\b(?:knex|db|trx)\(\s*['"]([A-Za-z_]\w*)['"]\s*\)|\.(?:from|table|into)\(\s*['"]([A-Za-z_]\w*)['"]\s*\)/g,
  prismaUse: /\b(?:prisma|db|tx|client)\.([a-z]\w*)\.(?:findMany|findUnique|findFirst|findUniqueOrThrow|findFirstOrThrow|create|createMany|update|updateMany|upsert|delete|deleteMany|count|aggregate|groupBy)\b/g,
  sqlaTable: /__tablename__\s*=\s*['"](\w+)['"]/g,
  djangoModel: /^class\s+(\w+)\((?:[\w.]*\.)?Model\):/gm,
  mongooseModel: /\bmodel\(\s*['"](\w+)['"]/g,
  pyMain: /if\s+__name__\s*==\s*['"]__main__['"]/,
  goMain: /^package\s+main\b[\s\S]*\bfunc\s+main\s*\(/m
};
const SQL_NOISE = new Set(['the', 'a', 'an', 'this', 'that', 'it', 'select', 'where', 'set', 'values', 'if', 'not', 'exists', 'only', 'as', 'on', 'dual', 'information_schema', 'pg_catalog', 'sys', 'sqlite_master', 'pg_tables', 'pg_database', 'unnest', 'json_each', 'lateral', 'columns', 'tables', 'table_constraints', 'key_column_usage',
  'constraint_column_usage', 'foreign_key_columns', 'databases', 'schemata', 'views', 'routines', 'pg_class', 'pg_namespace', 'sqlite_sequence']);

function scanFile(root, f, resolver, ctx) {
  const text = readText(path.join(root, f.rel), LIMITS.bytes);
  const out = { rel: f.rel, lang: f.lang, test: f.test, lines: 0, imports: new Set(), pkgs: new Set(), routes: [], ipcHandles: [], ipcCalls: [], httpCalls: [], extHosts: new Set(), tables: new Set(), main: false, bridges: [], bridgeUses: new Set() };
  if (!text) return out;
  const starts = lineStarts(text);
  out.lines = starts.length;
  const add = (spec) => {
    if (!spec) return;
    const hit = JS_LIKE.has(f.lang) ? resolver.js(f.rel, spec) : null;
    if (hit) { if (hit !== f.rel) out.imports.add(hit); return; }
    if (!spec.startsWith('.') && !spec.startsWith('/')) out.pkgs.add(spec.replace(/^node:/, ''));
  };
  let m;
  if (JS_LIKE.has(f.lang)) {
    RE.jsImport.lastIndex = 0; while ((m = RE.jsImport.exec(text))) add(m[1]);
    RE.jsRequire.lastIndex = 0; while ((m = RE.jsRequire.exec(text))) add(m[1]);
    RE.jsJoinRequire.lastIndex = 0;
    while ((m = RE.jsJoinRequire.exec(text))) {
      const segs = (m[2].match(/['"]([^'"]+)['"]/g) || []).map(s => s.slice(1, -1));
      const hit = resolver.joined(f.rel, segs, m[1] !== '__dirname');
      if (hit && hit !== f.rel) out.imports.add(hit);
    }
    RE.jsRoute.lastIndex = 0;
    while ((m = RE.jsRoute.exec(text)) && out.routes.length < LIMITS.routesPerFile) out.routes.push({ method: m[1].toUpperCase(), path: m[2], line: lineAt(starts, m.index), kind: 'http' });
    const ctl = text.match(RE.nestCtl);
    if (ctl) {
      const pre = '/' + String(ctl[1] || '').replace(/^\/|\/$/g, '');
      RE.nestRoute.lastIndex = 0;
      while ((m = RE.nestRoute.exec(text)) && out.routes.length < LIMITS.routesPerFile) out.routes.push({ method: m[1].toUpperCase(), path: (pre + '/' + String(m[2] || '').replace(/^\//, '')).replace(/\/+$/, '') || '/', line: lineAt(starts, m.index), kind: 'http' });
    }
    RE.ipcHandle.lastIndex = 0;
    while ((m = RE.ipcHandle.exec(text)) && out.ipcHandles.length < LIMITS.routesPerFile) out.ipcHandles.push({ channel: m[2], line: lineAt(starts, m.index) });
    RE.ipcInvoke.lastIndex = 0;
    while ((m = RE.ipcInvoke.exec(text))) out.ipcCalls.push(m[2]);
    RE.httpCall.lastIndex = 0;
    while ((m = RE.httpCall.exec(text))) out.httpCalls.push(m[1]);
    RE.bridge.lastIndex = 0;
    while ((m = RE.bridge.exec(text))) out.bridges.push(m[1]);
    RE.bridgeUse.lastIndex = 0;
    while ((m = RE.bridgeUse.exec(text))) out.bridgeUses.add(m[1]);
    RE.knexTable.lastIndex = 0;
    while ((m = RE.knexTable.exec(text))) out.tables.add(m[1] || m[2]);
    RE.prismaUse.lastIndex = 0;
    while ((m = RE.prismaUse.exec(text))) out.tables.add(m[1]);
    RE.mongooseModel.lastIndex = 0;
    while ((m = RE.mongooseModel.exec(text))) out.tables.add(m[1]);
  } else if (f.lang === 'py') {
    RE.pyFrom.lastIndex = 0;
    while ((m = RE.pyFrom.exec(text))) {
      const dots = m[1].length, mod = m[2];
      const hit = resolver.py(f.rel, dots, mod);
      if (hit) { if (hit !== f.rel) out.imports.add(hit); }
      else if (!dots && mod) out.pkgs.add(mod);
      for (const name of m[3].replace(/[()]/g, '').split(',').map(s => s.trim().split(/\s+/)[0]).filter(Boolean)) {
        const sub = resolver.py(f.rel, dots, (mod ? mod + '.' : '') + name);
        if (sub && sub !== f.rel) out.imports.add(sub);
      }
    }
    RE.pyImport.lastIndex = 0;
    while ((m = RE.pyImport.exec(text))) {
      for (const mod of m[1].split(',').map(s => s.trim())) {
        const hit = resolver.py(f.rel, 0, mod);
        if (hit) { if (hit !== f.rel) out.imports.add(hit); } else out.pkgs.add(mod);
      }
    }
    RE.pyRoute.lastIndex = 0;
    while ((m = RE.pyRoute.exec(text)) && out.routes.length < LIMITS.routesPerFile) out.routes.push({ method: m[1] === 'route' || m[1] === 'api_route' ? 'ANY' : m[1].toUpperCase(), path: m[2], line: lineAt(starts, m.index), kind: 'http' });
    if (/(^|\/)urls\.py$/.test(f.rel)) {
      RE.djangoPath.lastIndex = 0;
      while ((m = RE.djangoPath.exec(text)) && out.routes.length < LIMITS.routesPerFile) out.routes.push({ method: 'ANY', path: '/' + m[1].replace(/^\^|\$$/g, ''), line: lineAt(starts, m.index), kind: 'http' });
    }
    RE.sqlaTable.lastIndex = 0; while ((m = RE.sqlaTable.exec(text))) out.tables.add(m[1]);
    RE.djangoModel.lastIndex = 0; while ((m = RE.djangoModel.exec(text))) out.tables.add(m[1]);
    out.main = RE.pyMain.test(text);
  } else if (f.lang === 'go') {
    RE.goImportBlock.lastIndex = 0;
    const specs = [];
    while ((m = RE.goImportBlock.exec(text))) (m[1].match(/"([^"]+)"/g) || []).forEach(s => specs.push(s.slice(1, -1)));
    RE.goImportOne.lastIndex = 0; while ((m = RE.goImportOne.exec(text))) specs.push(m[1]);
    for (const s of specs) {
      const hit = resolver.goPkg(ctx.goModule, s, ctx.dirIndex);
      if (hit) { if (hit !== f.rel) out.imports.add(hit); } else out.pkgs.add(s);
    }
    out.main = RE.goMain.test(text);
  }
  if (!out.main && JS_LIKE.has(f.lang)) out.main = /\.listen\(\s*[\w.]*(?:PORT|port|\d{2,5})/.test(text);
  RE.extUrl.lastIndex = 0;
  while ((m = RE.extUrl.exec(text))) {
    const host = m[1].replace(/^https?:\/\//, '').replace(/:\d+$/, '').toLowerCase();
    if (host && !/^(localhost|127\.|0\.0\.0\.0|example\.)/.test(host)) out.extHosts.add(host);
  }
  RE.sqlTable.lastIndex = 0;
  while ((m = RE.sqlTable.exec(text))) {
    const t = m[2] || m[1];
    if (!t || SQL_NOISE.has(t.toLowerCase()) || /^[A-Z_]+$/.test(t) && t.length < 3) continue;
    const before = text.slice(Math.max(0, m.index - 140), m.index);
    if (!/['"`]/.test(before) && !/\b(SELECT|DELETE|INSERT|UPDATE|CREATE|ALTER|DROP)\b/.test(before + m[0])) continue;
    if (/\bimport\b|\bfrom\s*$/.test(before.slice(-12))) continue;
    out.tables.add(t);
  }
  return out;
}

function parseComposeServices(text) {
  const out = [];
  let inServices = false, cur = null;
  String(text || '').split(/\r?\n/).forEach(raw => {
    const line = raw.replace(/\t/g, '  ');
    if (/^services:\s*$/.test(line)) { inServices = true; return; }
    if (inServices && /^\S/.test(line)) inServices = false;
    if (!inServices) return;
    const sm = line.match(/^  ([A-Za-z0-9_.-]+):\s*$/);
    if (sm) { cur = { name: sm[1], image: '', ports: [], build: false }; out.push(cur); return; }
    if (!cur) return;
    const im = line.match(/^\s+image:\s*['"]?([^'"\s#]+)/);
    if (im) cur.image = im[1];
    if (/^\s+build:/.test(line)) cur.build = true;
    const pm = line.match(/["']?(\d{2,5}):(\d{2,5})/);
    if (pm && cur.ports.length < 4) cur.ports.push(+pm[1]);
  });
  return out.slice(0, 24);
}

function envHint(root) {
  let map = {};
  for (const n of ENV_NAMES) {
    const t = readText(path.join(root, n), 60000);
    t.split(/\r?\n/).forEach(line => {
      const m = line.trim().match(/^(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/);
      if (m && !(m[1] in map)) map[m[1]] = m[2].trim().replace(/^['"]|['"]$/g, '');
    });
  }
  try { return { map, hint: require('./planet-work').dbHintFromEnv(map) }; } catch (e) { return { map, hint: null }; }
}

function prismaInfo(root, files) {
  const models = [], fields = {};
  let provider = '';
  for (const rel of files.slice(0, 6)) {
    const t = readText(path.join(root, rel), 400000);
    const pm = t.match(/datasource\s+\w+\s*{[^}]*provider\s*=\s*"(\w+)"/);
    if (pm && !provider) provider = pm[1];
    const re = /^model\s+(\w+)\s*{([\s\S]*?)^}/gm;
    let m;
    while ((m = re.exec(t)) && models.length < 120) {
      models.push(m[1]);
      fields[m[1]] = m[2].split(/\n/).map(l => l.trim()).filter(l => l && !l.startsWith('//') && !l.startsWith('@@')).map(l => l.split(/\s+/)[0]).slice(0, 30);
    }
  }
  const engine = /postgres/.test(provider) ? 'postgres' : /mysql/.test(provider) ? 'mysql' : /sqlite/.test(provider) ? 'sqlite' : /sqlserver/.test(provider) ? 'mssql' : /mongo/.test(provider) ? 'mongo' : '';
  return { provider, engine, models, fields };
}

function sqlFileTables(root, files) {
  const out = new Set();
  for (const rel of files.slice(0, 80)) {
    const t = readText(path.join(root, rel), 200000);
    const re = /CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?[`"\[]?(?:\w+[`"\]]?\.[`"\[]?)?(\w+)/gi;
    let m;
    while ((m = re.exec(t)) && out.size < 200) out.add(m[1]);
  }
  return [...out];
}

function groupKeyFor(rel, depth) {
  const parts = rel.split('/');
  if (parts.length === 1) return rel;
  const wide = new Set(['src', 'app', 'lib', 'packages', 'apps', 'server', 'client', 'internal', 'pkg', 'cmd', 'services', 'modules']);
  if (depth >= 2 && parts.length > 2 && wide.has(parts[0])) return parts.slice(0, 2).join('/');
  return parts[0];
}

function roleFor(key, info) {
  const k = key.toLowerCase();
  if (info.routes || info.ipc) return 'api';
  if (/(^|\/)(components?|pages|views|ui|screens|widgets|layouts|public|static|styles|renderer|newui|frontend|client|web)(\/|$)/.test(k) || /\.(html|vue|svelte|tsx|jsx)$/.test(k)) return 'ui';
  if (/(^|\/)(models?|db|database|schema|entities|repositor(y|ies)|migrations|prisma|dao|store)(\/|$)/.test(k)) return 'data';
  if (/(^|\/)(config|settings|env|constants)(\/|$)|config\.\w+$/.test(k)) return 'config';
  if (/(^|\/)(tests?|__tests__|spec|e2e)(\/|$)/.test(k)) return 'test';
  return 'logic';
}

function scriptEntries(root, pkg, fileSet, resolver) {
  const out = [];
  if (!pkg) return out;
  const push = (label, cmd, rel) => { if (rel && fileSet.has(rel)) out.push({ label, cmd, rel }); };
  const resolveLoose = (p) => resolver.js('index.js', './' + String(p).replace(/^\.\//, '')) || (fileSet.has(p) ? p : null);
  if (pkg.main) push('main', 'package.json → main', resolveLoose(pkg.main));
  if (pkg.bin) {
    const bins = typeof pkg.bin === 'string' ? { [pkg.name || 'bin']: pkg.bin } : pkg.bin;
    for (const [k, v] of Object.entries(bins || {}).slice(0, 4)) push(k, 'bin: ' + k, resolveLoose(v));
  }
  const scripts = pkg.scripts || {};
  for (const name of ['start', 'dev', 'serve', 'server', 'worker', 'cli'].filter(n => scripts[n])) {
    const full = String(scripts[name]);
    const segs = full.split(/&&|\|\||;/).map(s => s.trim()).filter(Boolean);
    const cmd = segs.slice().reverse().find(s => !/\bbuild\b|\bcompile\b|\btsc\b/.test(s)) || segs[segs.length - 1] || full;
    const fm = cmd.match(/\b(?:node|nodemon|ts-node|tsx|bun(?:\s+run)?|deno\s+run(?:\s+-\S+)*|babel-node|esno|vite-node)\s+(?:--?\S+\s+)*([\w./@-]+\.(?:[cm]?[jt]sx?))/);
    if (fm) push('npm run ' + name, full, resolveLoose(fm[1]));
    else if (/\belectron\s+\.(\s|$)/.test(cmd) && pkg.main) push('npm run ' + name, full, resolveLoose(pkg.main));
    else if (/\bnext\s+(dev|start)/.test(cmd)) push('npm run ' + name, full, ['app/layout.tsx', 'app/layout.jsx', 'src/app/layout.tsx', 'pages/_app.tsx', 'pages/_app.js', 'src/pages/_app.tsx', 'app/page.tsx', 'pages/index.tsx', 'pages/index.js'].find(r => fileSet.has(r)));
    else if (/\b(vite|react-scripts\s+start|vue-cli-service\s+serve|ng\s+serve|webpack\s+serve)\b/.test(cmd)) push('npm run ' + name, full, ['src/main.tsx', 'src/main.ts', 'src/main.jsx', 'src/main.js', 'src/index.tsx', 'src/index.jsx', 'src/index.js', 'src/index.ts'].find(r => fileSet.has(r)));
    else if (/\bnest\s+start/.test(cmd)) push('npm run ' + name, full, 'src/main.ts');
    else if (/\buvicorn\s+([\w.]+):/.test(cmd)) push('npm run ' + name, full, resolver.py('x.py', 0, cmd.match(/\buvicorn\s+([\w.]+):/)[1]));
  }
  return out;
}

function analyzeProject(root, opts = {}) {
  const t0 = Date.now();
  if (!root || !fs.existsSync(root)) return { ok: false, error: 'Klasör bulunamadı' };
  const { files, special, truncated: walkTrunc } = walk(root);
  const fileSet = new Set(files.map(f => f.rel));
  const dirIndex = new Map();
  for (const f of files) { const d = path.posix.dirname(f.rel); const k = d === '.' ? '' : d; if (!dirIndex.has(k)) dirIndex.set(k, []); dirIndex.get(k).push(f.rel); }
  const goMod = readText(path.join(root, 'go.mod'), 4000).match(/^module\s+(\S+)/m);
  const ctx = { goModule: goMod ? goMod[1] : '', dirIndex };
  const resolver = makeResolver(root, fileSet, aliasMap(root));
  const src = files.filter(f => !f.test);
  const analyzed = src.slice(0, LIMITS.analyze).map(f => scanFile(root, f, resolver, ctx));
  const byRel = new Map(analyzed.map(a => [a.rel, a]));
  const pkg = readJson(path.join(root, 'package.json'));
  const deps = Object.assign({}, (pkg && pkg.dependencies) || {}, (pkg && pkg.devDependencies) || {});
  const pyDeps = (readText(path.join(root, 'requirements.txt'), 40000) + '\n' + readText(path.join(root, 'pyproject.toml'), 60000))
    .split(/\n/).map(l => (l.trim().match(/^["']?([A-Za-z0-9_.-]+)/) || [])[1]).filter(Boolean).map(s => s.toLowerCase());

  // Next.js dosya tabanlı rotalar
  for (const a of analyzed) {
    const r = a.rel;
    let m = r.match(/^(?:src\/)?pages\/api\/(.+?)\.(?:[jt]sx?)$/);
    if (m) { a.routes.push({ method: 'ANY', path: '/api/' + m[1].replace(/\/index$/, '').replace(/\[(\w+)\]/g, ':$1'), line: 1, kind: 'http' }); continue; }
    m = r.match(/^(?:src\/)?app\/(.*?)\/?route\.(?:[jt]sx?)$/);
    if (m) {
      const text = readText(path.join(root, r), 60000);
      const methods = (text.match(/export\s+(?:async\s+)?(?:function|const)\s+(GET|POST|PUT|PATCH|DELETE)\b/g) || []).map(s => s.match(/(GET|POST|PUT|PATCH|DELETE)/)[1]);
      const p = '/' + m[1].split('/').filter(s => !/^\(.*\)$/.test(s)).join('/').replace(/\[(\w+)\]/g, ':$1');
      (methods.length ? methods : ['ANY']).forEach(meth => a.routes.push({ method: meth, path: p, line: 1, kind: 'http' }));
      continue;
    }
    m = r.match(/^(?:src\/)?app\/(.*?)\/?page\.(?:[jt]sx?)$/) || r.match(/^(?:src\/)?pages\/(?!api\/|_)(.+?)\.(?:[jt]sx?)$/);
    if (m) a.routes.push({ method: 'PAGE', path: ('/' + String(m[1] || '').split('/').filter(s => !/^\(.*\)$/.test(s)).join('/').replace(/\/?index$/, '').replace(/\[(\w+)\]/g, ':$1')) || '/', line: 1, kind: 'page' });
  }

  // --- Veri katmanı ---
  const env = envHint(root);
  const prisma = prismaInfo(root, special.prisma);
  let composeServices = [];
  for (const n of COMPOSE_NAMES) { const t = readText(path.join(root, n), 120000); if (t) { composeServices = parseComposeServices(t); break; } }
  const stores = new Map();
  const store = (engine) => {
    if (!stores.has(engine)) stores.set(engine, { id: 'db:' + engine, engine, label: ENGINE_LABEL[engine] || engine, sources: [], env: null, compose: null, prisma: null, models: [], tables: new Set(), files: new Set(), sqliteFiles: [] });
    return stores.get(engine);
  };
  const addSource = (s, src) => { if (!s.sources.includes(src)) s.sources.push(src); };
  if (env.hint) { const s = store(env.hint.type || 'postgres'); addSource(s, 'env'); s.env = { host: env.hint.host || '', port: env.hint.port || 0, database: env.hint.database || '', user: env.hint.user || '', file: env.hint.file || '' }; }
  for (const svc of composeServices) {
    const hit = COMPOSE_DB_IMAGES.find(([re]) => re.test(svc.image.toLowerCase()) || (!svc.image && re.test(svc.name.toLowerCase())));
    if (hit) { const s = store(hit[1]); addSource(s, 'compose'); s.compose = { service: svc.name, image: svc.image, ports: svc.ports }; }
  }
  if (prisma.models.length || prisma.provider) {
    const s = store(prisma.engine || (env.hint && env.hint.type) || 'sql'); addSource(s, 'prisma');
    s.prisma = { provider: prisma.provider, schema: special.prisma[0] || '' };
    s.models = prisma.models.map(name => ({ name, fields: prisma.fields[name] || [] }));
  }
  for (const d of Object.keys(deps).concat(pyDeps)) { const e = DB_LIBS[d]; if (e && e !== 'orm') addSource(store(e), 'paket'); }
  if (special.sqliteFiles.length) { const s = store('sqlite'); addSource(s, 'dosya'); s.sqliteFiles = special.sqliteFiles.slice(0, 6); }
  const primary = prisma.engine || (env.hint && env.hint.type) || ([...stores.values()].find(s => ['postgres', 'mysql', 'sqlite', 'mssql'].includes(s.engine)) || {}).engine || 'sql';
  const sqlTables = sqlFileTables(root, special.sql);
  if (sqlTables.length) { const s = store(primary); addSource(s, 'migration'); sqlTables.forEach(t => s.tables.add(t)); }

  // dosya → veri / dış servis bağları
  const fileDb = new Map(), fileExt = new Map();
  for (const a of analyzed) {
    const engines = new Set(), exts = new Set();
    for (const spec of a.pkgs) {
      const e = libLookup(DB_LIBS, spec);
      if (e) engines.add(e === 'orm' ? primary : e);
      const x = extLookup(spec);
      if (x) exts.add(x);
    }
    for (const h of a.extHosts) exts.add(h);
    if (a.tables.size && !engines.size && stores.size) engines.add(primary);
    if (engines.size) {
      fileDb.set(a.rel, engines);
      for (const e of engines) { const s = store(e); addSource(s, 'kod'); s.files.add(a.rel); a.tables.forEach(t => s.tables.add(t)); }
    }
    if (exts.size) fileExt.set(a.rel, exts);
  }

  // --- Giriş noktaları ---
  const entries = [];
  const seenEntry = new Set();
  const addEntry = (label, cmd, rel) => { if (!rel || seenEntry.has(rel + '|' + label)) return; seenEntry.add(rel + '|' + label); entries.push({ label, cmd, rel }); };
  scriptEntries(root, pkg, fileSet, resolver).forEach(e => addEntry(e.label, e.cmd, e.rel));
  for (const a of analyzed) if (a.main && entries.length < 12 && !entries.some(e => e.rel === a.rel)) addEntry(a.lang === 'py' ? 'python ' + path.posix.basename(a.rel) : a.lang === 'go' ? 'go run ./' + path.posix.dirname(a.rel) : 'sunucu', a.lang === 'py' ? '__main__' : a.lang === 'go' ? 'func main()' : '.listen()', a.rel);
  for (const n of ['manage.py', 'wsgi.py', 'asgi.py']) if (fileSet.has(n)) addEntry(n, 'django', n);
  for (const h of special.html.slice(0, 3)) {
    const t = readText(path.join(root, h), 80000);
    const re = /<script[^>]+src=["']([^"']+)["']/g;
    let m;
    while ((m = re.exec(t))) { if (/^https?:|^\/\//.test(m[1])) continue; const hit = resolver.js(h, (m[1].startsWith('/') ? '.' : './') + m[1].replace(/^\.\//, '')) || resolver.js('x', m[1].replace(/^\//, './')); if (hit) addEntry(path.posix.basename(h), 'HTML <script>', hit); }
  }
  if (!entries.length) {
    for (const r of ['index.js', 'index.ts', 'main.js', 'main.ts', 'server.js', 'server.ts', 'app.js', 'app.ts', 'src/index.ts', 'src/index.js', 'src/main.ts', 'src/main.js', 'src/server.ts', 'main.py', 'app.py', 'main.go']) {
      if (fileSet.has(r)) { addEntry(path.posix.basename(r), 'varsayılan giriş', r); break; }
    }
  }

  // --- IPC / HTTP çapraz kenarlar (dosya düzeyi) ---
  const ipcOwner = new Map();
  for (const a of analyzed) for (const h of a.ipcHandles) if (!ipcOwner.has(h.channel)) ipcOwner.set(h.channel, a.rel);
  const routeIndex = [];
  // Router bir önekle monte edilebilir (app.use('/api', router)) — çağrı yolu rota yoluyla bitiyorsa eşleşir.
  for (const a of analyzed) for (const r of a.routes) {
    if (r.kind !== 'http') continue;
    const body = r.path.replace(/\/+$/, '').replace(/[.+?^${}()|\\]/g, '\\$&').replace(/\/:[\w]+/g, '/[^/]+').replace(/\/\{[\w]+\}/g, '/[^/]+').replace(/\/<[^>]+>/g, '/[^/]+').replace(/\*/g, '.*');
    if (!body) continue;
    routeIndex.push({ re: new RegExp((body.length > 3 ? '(?:^|/.*)' : '^') + body + '/?$'), rel: a.rel, len: body.length });
  }
  routeIndex.sort((x, y) => y.len - x.len);
  const crossEdges = [];
  const bridgeOwner = new Map();
  for (const a of analyzed) for (const b of a.bridges) if (!bridgeOwner.has(b)) bridgeOwner.set(b, a.rel);
  for (const a of analyzed) for (const b of a.bridgeUses) { const to = bridgeOwner.get(b); if (to && to !== a.rel) crossEdges.push({ from: a.rel, to, kind: 'ipc', n: 1 }); }
  for (const a of analyzed) {
    const ipcTargets = new Map();
    for (const ch of a.ipcCalls) { const to = ipcOwner.get(ch); if (to && to !== a.rel) ipcTargets.set(to, (ipcTargets.get(to) || 0) + 1); }
    for (const [to, n] of ipcTargets) crossEdges.push({ from: a.rel, to, kind: 'ipc', n });
    const httpTargets = new Map();
    for (const p of a.httpCalls) { const hit = routeIndex.find(r => r.re.test(p)); if (hit && hit.rel !== a.rel) httpTargets.set(hit.rel, (httpTargets.get(hit.rel) || 0) + 1); }
    for (const [to, n] of httpTargets) crossEdges.push({ from: a.rel, to, kind: 'http', n });
  }

  // --- Gruplama ---
  let depth = 2;
  let keys = new Map(analyzed.map(a => [a.rel, groupKeyFor(a.rel, depth)]));
  if (new Set(keys.values()).size > 36) { depth = 1; keys = new Map(analyzed.map(a => [a.rel, groupKeyFor(a.rel, depth)])); }
  const rootFiles = analyzed.filter(a => !a.rel.includes('/'));
  if (rootFiles.length > 10) rootFiles.forEach(a => { if (!entries.some(e => e.rel === a.rel)) keys.set(a.rel, '(kök)'); });

  const groups = new Map();
  for (const a of analyzed) {
    const k = keys.get(a.rel);
    if (!groups.has(k)) groups.set(k, { id: 'mod:' + k, key: k, kind: 'module', label: k, files: [], lines: 0, routes: 0, ipc: 0, pages: 0, tables: new Set(), langs: {} });
    const gr = groups.get(k);
    gr.files.push(a.rel);
    gr.lines += a.lines;
    gr.routes += a.routes.filter(r => r.kind === 'http').length;
    gr.pages += a.routes.filter(r => r.kind === 'page').length;
    gr.ipc += a.ipcHandles.length;
    a.tables.forEach(t => gr.tables.add(t));
    gr.langs[a.lang] = (gr.langs[a.lang] || 0) + 1;
  }
  const fileEdges = [];
  for (const a of analyzed) for (const to of a.imports) if (byRel.has(to)) fileEdges.push({ from: a.rel, to, kind: 'import', n: 1 });
  fileEdges.push(...crossEdges);

  const edgeMap = new Map();
  const addEdge = (from, to, kind, n, sample) => {
    if (from === to) return;
    const k = from + '>' + to + '>' + kind;
    const e = edgeMap.get(k) || { from, to, kind, n: 0, samples: [] };
    e.n += n || 1;
    if (sample && e.samples.length < 6) e.samples.push(sample);
    edgeMap.set(k, e);
  };
  for (const e of fileEdges) addEdge('mod:' + keys.get(e.from), 'mod:' + keys.get(e.to), e.kind, e.n, e.from + ' → ' + e.to);
  for (const [rel, engines] of fileDb) for (const en of engines) addEdge('mod:' + keys.get(rel), 'db:' + en, 'db', 1, rel);
  const extNodes = new Map();
  for (const [rel, exts] of fileExt) for (const x of exts) {
    const id = 'ext:' + x.toLowerCase().replace(/[^a-z0-9.]+/g, '-');
    if (!extNodes.has(id)) extNodes.set(id, { id, kind: 'ext', label: x, files: [] });
    extNodes.get(id).files.push(rel);
    addEdge('mod:' + keys.get(rel), id, 'ext', 1, rel);
  }
  const byTarget = new Map();
  for (const e of entries) {
    const cur = byTarget.get(e.rel);
    if (cur) { cur.labels.push(e.label); cur.cmds.push(e.cmd); } else byTarget.set(e.rel, { rel: e.rel, labels: [e.label], cmds: [e.cmd] });
  }
  const entryNodes = [...byTarget.values()].slice(0, 10).map((e, i) => {
    const id = 'entry:' + i;
    if (byRel.has(e.rel)) addEdge(id, 'mod:' + keys.get(e.rel), 'run', 1, e.rel);
    return { id, kind: 'entry', label: e.labels.join(' · '), sub: e.cmds[e.cmds.length - 1], cmds: e.cmds, file: e.rel };
  });

  const nodes = [];
  nodes.push(...entryNodes);
  for (const gr of groups.values()) {
    const info = { routes: gr.routes, ipc: gr.ipc };
    const single = gr.files.length === 1 && gr.key === gr.files[0];
    nodes.push({
      id: gr.id, kind: 'module', label: single ? path.posix.basename(gr.key) : gr.key + '/', path: gr.key, single,
      role: roleFor(gr.key, info), files: gr.files, lines: gr.lines, routes: gr.routes, ipc: gr.ipc, pages: gr.pages,
      tables: [...gr.tables].slice(0, 40)
    });
  }
  for (const s of stores.values()) {
    nodes.push({
      id: s.id, kind: 'db', label: s.label, engine: s.engine, sources: s.sources, env: s.env, compose: s.compose, prisma: s.prisma,
      models: s.models.slice(0, 120), tables: [...s.tables].sort().slice(0, 200), files: [...s.files].slice(0, 80), sqliteFiles: s.sqliteFiles
    });
  }
  nodes.push(...[...extNodes.values()].slice(0, 16));
  const nodeIds = new Set(nodes.map(n => n.id));
  const edges = [...edgeMap.values()].filter(e => nodeIds.has(e.from) && nodeIds.has(e.to));

  const fileList = analyzed.map(a => ({
    rel: a.rel, group: 'mod:' + keys.get(a.rel), lang: a.lang, lines: a.lines,
    imports: [...a.imports].filter(r => byRel.has(r)),
    routes: a.routes.slice(0, 60), ipc: a.ipcHandles.slice(0, 120),
    db: [...(fileDb.get(a.rel) || [])].map(e => 'db:' + e), ext: [...(fileExt.get(a.rel) || [])].map(x => 'ext:' + x.toLowerCase().replace(/[^a-z0-9.]+/g, '-')),
    tables: [...a.tables].slice(0, 40)
  }));
  const langs = {};
  for (const f of files) langs[f.lang] = (langs[f.lang] || 0) + 1;
  return {
    ok: true,
    name: (pkg && pkg.name) || path.basename(root),
    stats: {
      files: files.length, source: src.length, analyzed: analyzed.length, tests: files.length - src.length,
      lines: analyzed.reduce((s, a) => s + a.lines, 0), langs,
      routes: analyzed.reduce((s, a) => s + a.routes.filter(r => r.kind === 'http').length, 0),
      pages: analyzed.reduce((s, a) => s + a.routes.filter(r => r.kind === 'page').length, 0),
      ipc: analyzed.reduce((s, a) => s + a.ipcHandles.length, 0),
      ms: Date.now() - t0
    },
    truncated: walkTrunc || src.length > LIMITS.analyze,
    nodes, edges, files: fileList, fileEdges,
    compose: composeServices.map(s => ({ name: s.name, image: s.image, ports: s.ports, build: s.build }))
  };
}

module.exports = { analyzeProject, parseComposeServices, groupKeyFor };
