// Veritabanı (Postgres/MySQL/SQLite/SQL Server) gezgini + onaylı yazma ve denetim günlüğü;
// git işlemleri (log/stage/commit/push/pull/switch/diff).
// with(g) bilinçli: çıplak isimler main.js'in paylaşılan g nesnesine çözülür; g.X = ... atamaları
// bu modülün sonraki modüllere verdiği çıktıdır (sıra main.js'te). Bu yüzden 'use strict' yok ve
// `require('./lib/…')` gibi göreli yollar main.js'e (proje köküne) göre çözülür.
module.exports = function register(g) {
  with (g) {
// ---------- veritabanı görüntüleyici ----------
function encPass(p) {
  try {
    return safeStorage.isEncryptionAvailable()
      ? safeStorage.encryptString(p).toString('base64')
      : Buffer.from(p, 'utf8').toString('base64');
  } catch (e) { return Buffer.from(p, 'utf8').toString('base64'); }
}
function decPass(s) {
  try {
    const b = Buffer.from(s, 'base64');
    return safeStorage.isEncryptionAvailable() ? safeStorage.decryptString(b) : b.toString('utf8');
  } catch (e) {
    try { return Buffer.from(s, 'base64').toString('utf8'); } catch (e2) { return ''; }
  }
}

async function dbConnect(cfg) {
  if (cfg.type === 'sqlite') {
    const initSqlJs = require('sql.js');
    const SQL = await initSqlJs({
      locateFile: f => path.join(APP_DIR, 'node_modules', 'sql.js', 'dist', f)
    });
    const filePath = cfg.file.replace(/^~/, os.homedir());
    const buf = fs.readFileSync(filePath);
    const db = new SQL.Database(buf);
    return {
      sqlite: true,
      query: async (sql, params) => {
        // Parametreli sorgu (satır düzenleme/silme) — hazır ifade ile bağla
        if (params && params.length) {
          const stmt = db.prepare(sql);
          try {
            stmt.bind(params);
            if (/^\s*select/i.test(sql)) {
              const rows = []; let cols = [];
              while (stmt.step()) { const o = stmt.getAsObject(); rows.push(o); if (!cols.length) cols = Object.keys(o); }
              return { rows, fields: cols, rowCount: null };
            }
            stmt.step();
            let changes = null; try { changes = db.getRowsModified(); } catch (e) {}
            return { rows: [], fields: [], rowCount: changes };
          } finally { stmt.free(); }
        }
        const res = db.exec(sql);
        // db.exec döndürdüğü res son SELECT'in sonucudur; yazma ifadelerinde etkilenen satır sayısı:
        const changes = (() => { try { return db.getRowsModified(); } catch (e) { return null; } })();
        if (!res.length) return { rows: [], fields: [], rowCount: changes };
        const { columns, values } = res[res.length - 1];
        return { fields: columns, rows: values.map(v => Object.fromEntries(columns.map((c, i) => [c, v[i]]))), rowCount: changes };
      },
      // yazma sonrası bellekteki değişikliği diske kalıcı yaz
      persist: () => { try { fs.writeFileSync(filePath, Buffer.from(db.export())); return true; } catch (e) { return false; } },
      end: () => { try { db.close(); } catch (e) {} }
    };
  }
  const base = { host: cfg.host, port: +cfg.port, user: cfg.user, password: cfg.password, database: cfg.database };
  if (cfg.type === 'mysql') {
    const mysql = require('mysql2/promise');
    const conn = await mysql.createConnection({ ...base, connectTimeout: 6000 });
    return {
      query: async (sql, params) => { const [res, fields] = await conn.query(sql, params || []);
        if (Array.isArray(res)) return { rows: res, fields: (fields || []).map(f => f.name) };
        return { rows: [], fields: [], rowCount: (res && res.affectedRows != null) ? res.affectedRows : null };
      },
      end: () => conn.end().catch(() => {})
    };
  }
  if (cfg.type === 'mssql') {
    // Microsoft SQL Server (örn. .NET projelerinin Docker'daki SQL Server 2022'si).
    // Yerel/kendinden imzalı sertifika yaygın olduğu için trustServerCertificate açık;
    // encrypt kapalı (yerel ağ varsayımı) — uzak/Azure bağlantısında da TLS sertifikası
    // güvenilir zincirden geliyorsa çalışır.
    const sql = require('mssql');
    const pool = new sql.ConnectionPool({
      server: cfg.host, port: +cfg.port || 1433, user: cfg.user, password: cfg.password,
      database: cfg.database || undefined,
      connectionTimeout: 8000, requestTimeout: 30000,
      options: { encrypt: false, trustServerCertificate: true },
      pool: { max: 1, min: 0, idleTimeoutMillis: 5000 }
    });
    await pool.connect();
    return {
      query: async (text, params) => {
        const req = pool.request();
        (params || []).forEach((v, i) => req.input('p' + (i + 1), v));
        const r = await req.query(text);
        const rs = r.recordset;
        const rows = rs ? Array.from(rs) : [];
        const fields = rs && rs.columns ? Object.keys(rs.columns) : (rows.length ? Object.keys(rows[0]) : []);
        const affected = Array.isArray(r.rowsAffected) && r.rowsAffected.length ? r.rowsAffected[0] : null;
        return { rows, fields, rowCount: affected != null ? affected : rows.length };
      },
      end: () => pool.close().catch(() => {})
    };
  }
  const { Client } = require('pg');
  const client = new Client({ ...base, database: base.database || 'postgres', connectionTimeoutMillis: 6000 });
  await client.connect();
  return {
    query: async (sql, params) => { const r = await client.query(sql, params); return { rows: r.rows, fields: (r.fields || []).map(f => f.name), rowCount: r.rowCount }; },
    end: () => client.end().catch(() => {})
  };
}

// Bağlantıyı aç, işi çalıştır, HER durumda kapat (hata yolunda sızıntı olmasın)
async function withDb(cfg, fn) {
  const c = await dbConnect(cfg);
  try { return await fn(c); }
  finally { try { if (c && c.end) c.end(); } catch (e) {} }
}
// Yazma ifadesi mi (SELECT/EXPLAIN/SHOW/PRAGMA dışı)
function isWriteSql(sql) {
  return /^\s*(insert|update|delete|replace|merge|create|drop|alter|truncate|grant|revoke|call|vacuum|reindex)\b/i.test(String(sql || ''));
}
// Yıkıcı DDL/komut mı (ekstra onay gerektirir)
function isDangerSql(sql) {
  return /^\s*(drop|truncate|alter)\b/i.test(String(sql || '')) || /\bdrop\s+(table|database|schema)\b/i.test(String(sql || ''));
}

function getDbCfg(id) {
  const data = loadData();
  const db = (data.dbs || []).find(d => d.id === id);
  if (!db) return null;
  return { ...db, password: decPass(db.password) };
}

// ---------- yerel veritabanı sunucularını otomatik algıla ----------
// Kullanıcının kendi bilgisayarında çalışan PostgreSQL/MySQL sunucuları
// açılışta bulunur ve "Bu Mac — …" bağlantısı olarak otomatik eklenir.
// Her port için yalnızca bir kez eklenir: kullanıcı silerse yeniden eklenmez;
// sunucu o an kapalıysa sonraki açılışlarda tekrar denenir.
function probePort(port, timeoutMs) {
  return new Promise(resolve => {
    const net = require('net');
    const s = new net.Socket();
    let done = false;
    const fin = ok => { if (!done) { done = true; try { s.destroy(); } catch (e) {} resolve(ok); } };
    s.setTimeout(timeoutMs || 800);
    s.once('connect', () => fin(true));
    s.once('timeout', () => fin(false));
    s.once('error', () => fin(false));
    try { s.connect(port, '127.0.0.1'); } catch (e) { fin(false); }
  });
}

const LOCAL_DB_CANDIDATES = [
  { port: 5432, type: 'postgres', name: 'Bu Mac — PostgreSQL', user: 'postgres', database: 'postgres' },
  { port: 3306, type: 'mysql', name: 'Bu Mac — MySQL', user: 'root', database: '' },
  { port: 1433, type: 'mssql', name: 'Bu Mac — SQL Server', user: 'sa', database: '' }
];

async function autoDetectLocalDbs() {
  try {
    const data = loadData();
    data.dbAutoAdded = data.dbAutoAdded || {};
    let changed = false;
    for (const c of LOCAL_DB_CANDIDATES) {
      if (data.dbAutoAdded[c.port]) continue; // daha önce otomatik eklendi (silindiyse saygı duy)
      const exists = (data.dbs || []).some(d => (d.host === 'localhost' || d.host === '127.0.0.1') && +d.port === c.port);
      if (exists) { data.dbAutoAdded[c.port] = true; changed = true; continue; }
      if (!(await probePort(c.port))) continue; // bu portta sunucu çalışmıyor — sonraki açılışta yine bak
      data.dbs = data.dbs || [];
      data.dbs.push({
        id: 'local-' + c.port, name: c.name, type: c.type,
        host: 'localhost', port: c.port, database: c.database,
        user: c.user, password: encPass('')
      });
      data.dbAutoAdded[c.port] = true;
      changed = true;
    }
    if (changed) {
      // Stale-write koruması: probePort beklerken (~sn) kullanıcı sunucu/todo/ayar
      // eklemiş olabilir. Eski `data`yı yazmak onları silerdi — bu yüzden TAZE oku,
      // yalnızca kendi dokunduğumuz alanları birleştir.
      const fresh = loadData();
      fresh.dbs = data.dbs;
      fresh.dbAutoAdded = data.dbAutoAdded;
      saveData(fresh);
    }
  } catch (e) { /* algılama başarısız olsa da uygulama etkilenmez */ }
}

ipcMain.handle('galaxy:dbList', () => (loadData().dbs || []).map(({ password, ...rest }) => rest));

ipcMain.handle('galaxy:dbSave', (e, db) => {
  const isSqlite = db.type === 'sqlite';
  if (!db.name || (isSqlite ? !db.file : (!db.host || !db.user))) {
    return { ok: false, error: isSqlite ? 'Ad ve dosya yolu gerekli' : 'Ad, sunucu ve kullanıcı gerekli' };
  }
  const data = loadData();
  data.dbs = data.dbs || [];
  if (!db.id) db.id = String(Date.now());
  const idx = data.dbs.findIndex(d => d.id === db.id);
  const existing = idx >= 0 ? data.dbs[idx] : null;
  const pid = db.projectId || (existing && existing.projectId) || '';
  const DB_PORTS = { mysql: 3306, postgres: 5432, mssql: 1433 };
  const clean = isSqlite
    ? { id: db.id, name: db.name, type: 'sqlite', file: db.file, host: '', port: 0, database: path.basename(db.file), user: '', password: encPass(''), projectId: pid }
    : {
      id: db.id, name: db.name, type: DB_PORTS[db.type] ? db.type : 'postgres',
      host: db.host, port: +db.port || DB_PORTS[db.type] || 5432,
      database: db.database || '', user: db.user,
      password: db.password ? encPass(db.password) : (existing ? existing.password : encPass('')),
      projectId: pid
    };
  if (idx >= 0) data.dbs[idx] = clean; else data.dbs.push(clean);
  saveData(data);
  return { ok: true, id: db.id };
});

ipcMain.handle('galaxy:dbDelete', (e, id) => {
  const data = loadData();
  data.dbs = (data.dbs || []).filter(d => d.id !== id);
  saveData(data);
  return { ok: true };
});

ipcMain.handle('galaxy:dbTest', async (e, cfgRaw) => {
  try {
    const cfg = cfgRaw.id && !cfgRaw.password ? getDbCfg(cfgRaw.id) : cfgRaw;
    await withDb(cfg, c => c.query('SELECT 1'));
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err.code === 'MODULE_NOT_FOUND' ? 'Sürücü eksik — ProjectGalaxy klasöründe: npm install' : err.message };
  }
});

function dbErr(err) {
  return err.code === 'MODULE_NOT_FOUND' ? 'Sürücü eksik — ProjectGalaxy klasöründe: npm install' : err.message;
}

// Sunucudaki TÜM veritabanlarını listele
ipcMain.handle('galaxy:dbDatabases', async (e, id) => {
  const cfg = getDbCfg(id);
  if (!cfg) return { ok: false, error: 'Bağlantı bulunamadı' };
  if (cfg.type === 'sqlite') return { ok: true, databases: [path.basename(cfg.file || 'sqlite')] };
  try {
    const sql = cfg.type === 'mysql'
      ? 'SHOW DATABASES'
      : cfg.type === 'mssql'
        ? `SELECT name FROM sys.databases WHERE name NOT IN ('master','tempdb','model','msdb') ORDER BY 1`
        : `SELECT datname FROM pg_database WHERE datistemplate = false ORDER BY 1`;
    const r = await withDb({ ...cfg, database: cfg.type === 'postgres' ? (cfg.database || 'postgres') : (cfg.database || undefined) }, c => c.query(sql));
    const skip = new Set(['information_schema', 'performance_schema', 'mysql', 'sys']);
    const databases = r.rows.map(row => Object.values(row)[0]).filter(d => !skip.has(d));
    return { ok: true, databases };
  } catch (err) { return { ok: false, error: dbErr(err) }; }
});

ipcMain.handle('galaxy:dbTables', async (e, { id, database }) => {
  const cfg = getDbCfg(id);
  if (!cfg) return { ok: false, error: 'Bağlantı bulunamadı' };
  try {
    const sql = cfg.type === 'sqlite'
      ? `SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY 1`
      : cfg.type === 'mysql'
        ? 'SHOW TABLES'
        : cfg.type === 'mssql'
          ? `SELECT TABLE_SCHEMA + '.' + TABLE_NAME AS t FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_TYPE = 'BASE TABLE' ORDER BY 1`
          : `SELECT schemaname || '.' || tablename AS t FROM pg_catalog.pg_tables WHERE schemaname NOT IN ('pg_catalog','information_schema') ORDER BY 1`;
    const r = await withDb(cfg.type === 'sqlite' ? cfg : { ...cfg, database: database || cfg.database }, c => c.query(sql));
    const tables = r.rows.map(row => Object.values(row)[0]);
    return { ok: true, tables };
  } catch (err) { return { ok: false, error: dbErr(err) }; }
});

// Şema: tablolar + kolonlar + foreign key ilişkileri
async function buildDbSchema(cfg, database) {
  try {
    return await withDb(cfg.type === 'sqlite' ? cfg : { ...cfg, database: database || cfg.database }, async c => {
    const tables = []; const fks = [];

    if (cfg.type === 'sqlite') {
      const tr = await c.query(`SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY 1`);
      for (const row of tr.rows.slice(0, 60)) {
        const t = Object.values(row)[0];
        const cols = await c.query(`PRAGMA table_info("${t}")`);
        tables.push({ name: t, columns: cols.rows.map(cl => ({ name: cl.name, type: cl.type, pk: !!cl.pk })) });
        const fkr = await c.query(`PRAGMA foreign_key_list("${t}")`);
        for (const fk of fkr.rows) fks.push({ from: t, fromCol: fk.from, to: fk.table, toCol: fk.to });
      }
    } else if (cfg.type === 'mysql') {
      const db = database || cfg.database;
      const cr = await c.query(`SELECT TABLE_NAME t, COLUMN_NAME c, COLUMN_TYPE ty, COLUMN_KEY k FROM information_schema.COLUMNS WHERE TABLE_SCHEMA='${db.replace(/'/g, "''")}' ORDER BY TABLE_NAME, ORDINAL_POSITION`);
      const byT = {};
      for (const r2 of cr.rows) (byT[r2.t] ||= []).push({ name: r2.c, type: r2.ty, pk: r2.k === 'PRI' });
      for (const [name, columns] of Object.entries(byT)) tables.push({ name, columns });
      const fr = await c.query(`SELECT TABLE_NAME f, COLUMN_NAME fc, REFERENCED_TABLE_NAME rt, REFERENCED_COLUMN_NAME rc FROM information_schema.KEY_COLUMN_USAGE WHERE TABLE_SCHEMA='${db.replace(/'/g, "''")}' AND REFERENCED_TABLE_NAME IS NOT NULL`);
      for (const r2 of fr.rows) fks.push({ from: r2.f, fromCol: r2.fc, to: r2.rt, toCol: r2.rc });
    } else if (cfg.type === 'mssql') {
      const cr = await c.query(`SELECT TABLE_SCHEMA + '.' + TABLE_NAME AS t, COLUMN_NAME AS c, DATA_TYPE AS ty FROM INFORMATION_SCHEMA.COLUMNS ORDER BY TABLE_SCHEMA, TABLE_NAME, ORDINAL_POSITION`);
      const pkr = await c.query(`SELECT tc.TABLE_SCHEMA + '.' + tc.TABLE_NAME AS t, kcu.COLUMN_NAME AS c FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS tc JOIN INFORMATION_SCHEMA.KEY_COLUMN_USAGE kcu ON tc.CONSTRAINT_NAME = kcu.CONSTRAINT_NAME AND tc.TABLE_SCHEMA = kcu.TABLE_SCHEMA WHERE tc.CONSTRAINT_TYPE = 'PRIMARY KEY'`);
      const pkSet = new Set(pkr.rows.map(r2 => r2.t + '|' + r2.c));
      const byT = {};
      for (const r2 of cr.rows) (byT[r2.t] ||= []).push({ name: r2.c, type: r2.ty, pk: pkSet.has(r2.t + '|' + r2.c) });
      for (const [name, columns] of Object.entries(byT)) tables.push({ name, columns });
      // SQL Server'da INFORMATION_SCHEMA.CONSTRAINT_COLUMN_USAGE, FK'da başvurulan tarafı
      // güvenilir vermez — sys.foreign_key_columns kesin kaynaktır.
      const fr = await c.query(`SELECT OBJECT_SCHEMA_NAME(fkc.parent_object_id) + '.' + OBJECT_NAME(fkc.parent_object_id) AS f, COL_NAME(fkc.parent_object_id, fkc.parent_column_id) AS fc, OBJECT_SCHEMA_NAME(fkc.referenced_object_id) + '.' + OBJECT_NAME(fkc.referenced_object_id) AS rt, COL_NAME(fkc.referenced_object_id, fkc.referenced_column_id) AS rc FROM sys.foreign_key_columns fkc`);
      for (const r2 of fr.rows) fks.push({ from: r2.f, fromCol: r2.fc, to: r2.rt, toCol: r2.rc });
    } else {
      const cr = await c.query(`SELECT table_schema||'.'||table_name t, column_name c, data_type ty FROM information_schema.columns WHERE table_schema NOT IN ('pg_catalog','information_schema') ORDER BY table_schema, table_name, ordinal_position`);
      const pkr = await c.query(`SELECT tc.table_schema||'.'||tc.table_name t, kcu.column_name c FROM information_schema.table_constraints tc JOIN information_schema.key_column_usage kcu ON tc.constraint_name=kcu.constraint_name AND tc.table_schema=kcu.table_schema WHERE tc.constraint_type='PRIMARY KEY'`);
      const pkSet = new Set(pkr.rows.map(r2 => r2.t + '|' + r2.c));
      const byT = {};
      for (const r2 of cr.rows) (byT[r2.t] ||= []).push({ name: r2.c, type: r2.ty, pk: pkSet.has(r2.t + '|' + r2.c) });
      for (const [name, columns] of Object.entries(byT)) tables.push({ name, columns });
      const fr = await c.query(`SELECT tc.table_schema||'.'||tc.table_name f, kcu.column_name fc, ccu.table_schema||'.'||ccu.table_name rt, ccu.column_name rc
        FROM information_schema.table_constraints tc
        JOIN information_schema.key_column_usage kcu ON tc.constraint_name=kcu.constraint_name AND tc.table_schema=kcu.table_schema
        JOIN information_schema.constraint_column_usage ccu ON ccu.constraint_name=tc.constraint_name AND ccu.table_schema=tc.table_schema
        WHERE tc.constraint_type='FOREIGN KEY'`);
      for (const r2 of fr.rows) fks.push({ from: r2.f, fromCol: r2.fc, to: r2.rt, toCol: r2.rc });
    }
    return { ok: true, tables: tables.slice(0, 80), fks };
    });
  } catch (err) { return { ok: false, error: dbErr(err) }; }
}

ipcMain.handle('galaxy:dbSchema', async (e, { id, database }) => {
  const cfg = getDbCfg(id);
  if (!cfg) return { ok: false, error: 'Bağlantı bulunamadı' };
  return buildDbSchema(cfg, database);
});

ipcMain.handle('galaxy:dbQuery', async (e, { id, table, sql, database }) => {
  const cfg = getDbCfg(id);
  if (!cfg) return { ok: false, error: 'Bağlantı bulunamadı' };
  if (database && cfg.type !== 'sqlite') cfg.database = database;
  let finalSql;
  if (table) {
    if (!/^[\w.$]+$/.test(table)) return { ok: false, error: 'Geçersiz tablo adı' };
    if (cfg.type === 'mysql') finalSql = `SELECT * FROM \`${table}\` LIMIT 100`;
    else if (cfg.type === 'mssql') { const qt = quoteTableName(table, cfg.type); if (!qt) return { ok: false, error: 'Geçersiz tablo adı' }; finalSql = `SELECT TOP 100 * FROM ${qt}`; }
    else finalSql = `SELECT * FROM ${table.includes('.') ? table : '"' + table + '"'} LIMIT 100`;
  } else {
    if (!/^\s*select\b/i.test(sql || '')) return { ok: false, error: 'Yalnızca SELECT sorgularına izin var' };
    // Çoklu-ifade kaçağını engelle (pg simple-query "SELECT 1; DELETE …" çalıştırır)
    if (/;\s*\S/.test(String(sql).replace(/;\s*$/, ''))) return { ok: false, error: 'Tek SELECT ifadesi çalıştırılabilir (noktalı virgülle birden çok ifade değil)' };
    finalSql = sql;
  }
  try {
    const r = await withDb(cfg, c => c.query(finalSql));
    return { ok: true, fields: r.fields, rows: r.rows.slice(0, 200) };
  } catch (err) {
    return { ok: false, error: err.message };
  }
});

// ---------- DB işlem (yazma dahil) + audit log ----------
// SQL'i çalıştır (bağlantıyı garanti kapat, sqlite yazmasını diske persist et) ve audit log'a yaz.
// Log HER ZAMAN await'lerden SONRA taze loadData ile yazılır (kayıp-güncelleme yarışı olmasın).
async function runDbAndLog(cfg, sql, logMeta, params) {
  let result;
  try {
    result = await withDb(cfg, async c => {
      const r = await c.query(sql, params);
      if (c.sqlite && c.persist && isWriteSql(sql)) c.persist();
      const affected = (r && r.rowCount != null) ? r.rowCount : (r && r.affectedRows != null ? r.affectedRows : ((r && r.rows) ? r.rows.length : 0));
      return { ok: true, fields: (r && r.fields) || [], rows: ((r && r.rows) || []).slice(0, 200), affected };
    });
  } catch (err) { result = { ok: false, error: err.message }; }
  const data = loadData(); data.dbLog = data.dbLog || [];
  data.dbLog.unshift(Object.assign({
    ts: new Date().toISOString(), sql: String(sql).slice(0, 600),
    ok: result.ok, info: result.ok ? ((result.affected || 0) + ' satır etkilendi') : result.error
  }, logMeta || {}));
  data.dbLog = data.dbLog.slice(0, 200);
  saveData(data);
  return result;
}

ipcMain.handle('galaxy:dbExec', async (e, { id, database, sql, confirm, agent, request } = {}) => {
  const cfg = getDbCfg(id);
  if (!cfg) return { ok: false, error: 'Bağlantı bulunamadı' };
  if (database && cfg.type !== 'sqlite') cfg.database = database;
  if (!sql || !String(sql).trim()) return { ok: false, error: 'SQL boş' };
  // Yazma/DDL işlemleri için açık onay iste (yanlışlıkla veri değiştirmeyi/silmeyi önle)
  if (isWriteSql(sql) && confirm !== true) {
    return { ok: false, needConfirm: true, sql: String(sql), danger: isDangerSql(sql), write: true };
  }
  // Ajan tarafından üretilip onaylanan yazı ise log'da 🤖 istek olarak etiketle
  const meta = { conn: cfg.name || id, db: cfg.database || '' };
  if (agent) { meta.agent = true; meta.request = String(request || '').slice(0, 300); }
  return runDbAndLog(cfg, sql, meta);
});
// ---------- Tablo veri tarayıcı + satır düzenle/sil (parametreli, injection-güvenli) ----------
function quoteIdent(name, type) {
  if (!/^[\w$]+$/.test(String(name))) return null;              // yalnız harf/rakam/_/$ — enjeksiyon yok
  if (type === 'mysql') return '`' + name + '`';
  if (type === 'mssql') return '[' + name + ']';
  return '"' + name + '"';
}
function quoteTableName(table, type) {
  const parts = String(table).split('.');                        // şema.tablo veya tablo
  if (parts.length > 2 || parts.length < 1) return null;
  const q = parts.map(p => quoteIdent(p, type));
  if (q.some(x => x === null)) return null;
  return q.join('.');
}
function ph(type, i) { if (type === 'mssql') return '@p' + i; return type === 'postgres' ? '$' + i : '?'; }

// Tablonun ilk 100 satırı + PK bilgisi
ipcMain.handle('galaxy:dbRows', async (e, { id, database, table, offset, orderBy, orderDir } = {}) => {
  const cfg = getDbCfg(id);
  if (!cfg) return { ok: false, error: 'Bağlantı bulunamadı' };
  if (database && cfg.type !== 'sqlite') cfg.database = database;
  const qt = quoteTableName(table, cfg.type);
  if (!qt) return { ok: false, error: 'Geçersiz tablo adı' };
  const off = Math.max(0, parseInt(offset, 10) || 0);
  let orderSql = '';
  if (orderBy) { const oc = quoteIdent(orderBy, cfg.type); if (oc) orderSql = ` ORDER BY ${oc} ${/desc/i.test(orderDir) ? 'DESC' : 'ASC'}`; }
  try {
    const sc = await buildDbSchema(cfg, database);
    const tbl = (sc.tables || []).find(t => t.name === table || t.name.split('.').pop() === String(table).split('.').pop());
    const pk = tbl ? tbl.columns.filter(c => c.pk).map(c => c.name) : [];
    const columns = tbl ? tbl.columns.map(c => ({ name: c.name, type: c.type, pk: !!c.pk })) : [];
    const rowsSql = cfg.type === 'mssql'
      ? `SELECT * FROM ${qt} ${orderSql || 'ORDER BY (SELECT NULL)'} OFFSET ${off} ROWS FETCH NEXT 100 ROWS ONLY`
      : `SELECT * FROM ${qt}${orderSql} LIMIT 100 OFFSET ${off}`;
    const r = await withDb(cfg, c => c.query(rowsSql));
    let total = null;
    try { const cr = await withDb(cfg, c => c.query(`SELECT COUNT(*) AS n FROM ${qt}`)); total = cr.rows && cr.rows[0] ? +Object.values(cr.rows[0])[0] : null; } catch (er) {}
    const fields = (r.fields && r.fields.length) ? r.fields : columns.map(c => c.name);
    return { ok: true, fields, rows: (r.rows || []).map(row => fields.map(f => row[f])), pk, columns, offset: off, total, orderBy: orderBy || '', orderDir: orderDir || '' };
  } catch (err) { return { ok: false, error: err.message }; }
});

// Yeni satır ekle (INSERT)
ipcMain.handle('galaxy:dbInsertRow', async (e, { id, database, table, values } = {}) => {
  const cfg = getDbCfg(id);
  if (!cfg) return { ok: false, error: 'Bağlantı bulunamadı' };
  if (database && cfg.type !== 'sqlite') cfg.database = database;
  const qt = quoteTableName(table, cfg.type);
  if (!qt) return { ok: false, error: 'Geçersiz tablo adı' };
  const cols = Object.keys(values || {}).filter(c => values[c] !== '' && values[c] != null);
  if (!cols.length) return { ok: false, error: 'En az bir alan doldur' };
  const colQ = [], vals = []; let i = 1;
  for (const c of cols) { const cq = quoteIdent(c, cfg.type); if (!cq) return { ok: false, error: 'Geçersiz kolon' }; colQ.push(cq); vals.push(values[c]); }
  const phs = cols.map((_, j) => ph(cfg.type, j + 1)).join(', ');
  const sql = `INSERT INTO ${qt} (${colQ.join(', ')}) VALUES (${phs})`;
  return runDbAndLog(cfg, sql, { conn: cfg.name || id, db: cfg.database || '', table }, vals);
});

// Tabloyu CSV'ye aktar (Downloads'a yaz + Finder'da göster)
ipcMain.handle('galaxy:dbExportCsv', async (e, { id, database, table } = {}) => {
  const cfg = getDbCfg(id);
  if (!cfg) return { ok: false, error: 'Bağlantı bulunamadı' };
  if (database && cfg.type !== 'sqlite') cfg.database = database;
  const qt = quoteTableName(table, cfg.type);
  if (!qt) return { ok: false, error: 'Geçersiz tablo adı' };
  try {
    const r = await withDb(cfg, c => c.query(cfg.type === 'mssql' ? `SELECT TOP 10000 * FROM ${qt}` : `SELECT * FROM ${qt} LIMIT 10000`));
    const fields = r.fields || [];
    const esc = v => { if (v == null) return ''; const s = String(v); return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; };
    const lines = [fields.map(esc).join(',')];
    for (const row of (r.rows || [])) lines.push(fields.map(f => esc(row[f])).join(','));
    const dir = app.getPath('downloads');
    const safe = String(table).replace(/[^\w.-]/g, '_');
    const file = path.join(dir, `${safe}-${Date.now()}.csv`);
    fs.writeFileSync(file, lines.join('\n'), 'utf8');
    shell.showItemInFolder(file);
    return { ok: true, file, rows: (r.rows || []).length };
  } catch (err) { return { ok: false, error: err.message }; }
});

// Tek satırı PK'ye göre güncelle
ipcMain.handle('galaxy:dbUpdateRow', async (e, { id, database, table, key, changes } = {}) => {
  const cfg = getDbCfg(id);
  if (!cfg) return { ok: false, error: 'Bağlantı bulunamadı' };
  if (database && cfg.type !== 'sqlite') cfg.database = database;
  const qt = quoteTableName(table, cfg.type);
  if (!qt) return { ok: false, error: 'Geçersiz tablo adı' };
  const keyCols = Object.keys(key || {});
  const changeCols = Object.keys(changes || {});
  if (!keyCols.length) return { ok: false, error: 'Birincil anahtar yok — güvenli güncelleme yapılamıyor' };
  if (!changeCols.length) return { ok: false, error: 'Değişiklik yok' };
  const setQ = [], whereQ = [], vals = []; let i = 1;
  for (const c of changeCols) { const q = quoteIdent(c, cfg.type); if (!q) return { ok: false, error: 'Geçersiz kolon' }; setQ.push(q + '=' + ph(cfg.type, i++)); vals.push(changes[c]); }
  for (const c of keyCols) { const q = quoteIdent(c, cfg.type); if (!q) return { ok: false, error: 'Geçersiz kolon' }; whereQ.push(q + '=' + ph(cfg.type, i++)); vals.push(key[c]); }
  const sql = `UPDATE ${qt} SET ${setQ.join(', ')} WHERE ${whereQ.join(' AND ')}`;
  return runDbAndLog(cfg, sql, { conn: cfg.name || id, db: cfg.database || '', table }, vals);
});

// Tek satırı PK'ye göre sil
ipcMain.handle('galaxy:dbDeleteRow', async (e, { id, database, table, key } = {}) => {
  const cfg = getDbCfg(id);
  if (!cfg) return { ok: false, error: 'Bağlantı bulunamadı' };
  if (database && cfg.type !== 'sqlite') cfg.database = database;
  const qt = quoteTableName(table, cfg.type);
  if (!qt) return { ok: false, error: 'Geçersiz tablo adı' };
  const keyCols = Object.keys(key || {});
  if (!keyCols.length) return { ok: false, error: 'Birincil anahtar yok — güvenli silme yapılamıyor' };
  const whereQ = [], vals = []; let i = 1;
  for (const c of keyCols) { const q = quoteIdent(c, cfg.type); if (!q) return { ok: false, error: 'Geçersiz kolon' }; whereQ.push(q + '=' + ph(cfg.type, i++)); vals.push(key[c]); }
  const sql = `DELETE FROM ${qt} WHERE ${whereQ.join(' AND ')}`;
  return runDbAndLog(cfg, sql, { conn: cfg.name || id, db: cfg.database || '', table }, vals);
});

ipcMain.handle('galaxy:dbLog', () => (loadData().dbLog || []).slice(0, 100));
ipcMain.handle('galaxy:dbLogClear', () => { const d = loadData(); d.dbLog = []; saveData(d); return { ok: true }; });

// ---------- DB ajanı: doğal dil → SQL → çalıştır + audit log ----------
function agentReplyLooksLikeError(s) {
  const t = String(s || '');
  if (!t.trim()) return false;
  return /session limit|rate limit|quota|credit|usage limit|out of extra|please.?retry|try again later|authentication|not logged in|api.?key|unauthorized|forbidden|overloaded|capacity|you'?ve hit|you have hit|resets \d|billing|payment required|insufficient|invalid.?api|not_authorized|permission denied/i.test(t)
    || /^(error|hata|failed|başarısız)\b/i.test(t.trim())
    || /i('m| am) (sorry|unable|not able)/i.test(t);
}
function isPlausibleSql(s) {
  const t = String(s || '').trim().replace(/;+\s*$/,'');
  if (!t || t.length > 20000) return false;
  return /^(with|select|insert|update|delete|replace|merge|create|drop|alter|truncate|explain|analyze|show|describe|desc|pragma|call|do|begin|values)\b/i.test(t)
    || /^\(\s*select\b/i.test(t);
}
function parseAgentSql(raw) {
  const original = String(raw || '').trim();
  if (!original) return { error: 'Ajan boş yanıt verdi' };
  const short = original.replace(/\s+/g, ' ').slice(0, 220);
  if (agentReplyLooksLikeError(original)) {
    if (/session limit|you'?ve hit|usage limit|quota|credit/i.test(original))
      return { error: 'Ajan kotası doldu — SQL üretilmedi, sorgu çalıştırılmadı. ' + short };
    if (/rate limit|overloaded|capacity/i.test(original))
      return { error: 'Ajan meşgul / rate limit — SQL çalıştırılmadı. ' + short };
    if (/auth|api.?key|not logged|unauthorized|not_authorized/i.test(original))
      return { error: 'Ajan oturumu yok veya API anahtarı geçersiz. Ayarlar’dan Claude’u kontrol et.' };
    return { error: 'Ajan SQL yerine mesaj döndü — sorgu çalıştırılmadı. ' + short };
  }
  let s = original;
  const fence = s.match(/```(?:sql)?\s*([\s\S]*?)```/i);
  if (fence) s = fence[1].trim();
  s = s.replace(/^\s*(sql|sorgu|query)\s*[:\-]\s*/i, '').trim();
  if (!isPlausibleSql(s)) {
    const buried = s.match(/(?:^|\n)\s*((?:with|select|insert|update|delete|replace|merge|create|drop|alter|truncate|explain|show|describe|pragma)\b[\s\S]+)/i);
    if (buried) s = buried[1].trim();
  }
  const semi = s.search(/;\s*(?:\n|$)/);
  if (semi >= 0) s = s.slice(0, semi).trim();
  if (!isPlausibleSql(s)) return { error: 'Ajan geçerli SQL üretmedi; yanıt çalıştırılmadı. ' + short };
  return { sql: s };
}
function cleanAgentSql(raw) {
  const p = parseAgentSql(raw);
  return p.sql || '';
}
ipcMain.handle('galaxy:dbAgent', async (e, { id, database, request, confirm } = {}) => {
  const cfg = getDbCfg(id);
  if (!cfg) return { ok: false, error: 'Bağlantı bulunamadı' };
  if (!request || !String(request).trim()) return { ok: false, error: 'İstek boş' };
  if (IS_MAS) return { ok: false, error: MAS_BLOCKED };
  const db = (database && cfg.type !== 'sqlite') ? database : cfg.database;
  // 1) Şemayı çıkar
  const sc = await buildDbSchema(cfg, database);
  if (!sc.ok) return { ok: false, error: 'Şema okunamadı: ' + sc.error };
  const schemaTxt = (sc.tables || []).map(t =>
    `${t.name}(${t.columns.map(cl => `${cl.name}${cl.pk ? ' PK' : ''} ${cl.type}`).join(', ')})`
  ).join('\n');
  const fkTxt = (sc.fks || []).map(f => `${f.from}.${f.fromCol} -> ${f.to}.${f.toCol}`).join('\n');
  const dialect = cfg.type === 'mysql' ? 'MySQL' : (cfg.type === 'sqlite' ? 'SQLite' : (cfg.type === 'mssql' ? 'Microsoft SQL Server (T-SQL)' : 'PostgreSQL'));
  // 2) Claude'dan SQL üret
  const prompt = `Sen bir ${dialect} SQL üreticisisin. Aşağıdaki veritabanı şemasına göre, kullanıcının doğal dildeki (Türkçe olabilir) isteğini TEK bir geçerli ${dialect} SQL ifadesine çevir.

KURALLAR:
- SADECE SQL döndür. Açıklama, markdown, kod çiti (\`\`\`), yorum veya noktalı virgül dışında hiçbir metin ekleme.
- Şemadaki tam tablo/kolon adlarını kullan (şema adı dahil, ör. public.sergeant).
- Yazma isteği yoksa SELECT üret; kullanıcı açıkça isterse INSERT/UPDATE/DELETE üret.
- Emin değilsen en makul yorumu seç.

=== ŞEMA ===
${schemaTxt}
${fkTxt ? '\n=== İLİŞKİLER (FK) ===\n' + fkTxt : ''}

=== KULLANICI İSTEĞİ ===
${String(request).trim()}`;
  const gen = await runClaudeText(prompt, DATA_DIR);
  if (gen.error) {
    const parsedErr = parseAgentSql(gen.text || gen.error);
    return { ok: false, error: (parsedErr && parsedErr.error) || ('Ajan: ' + gen.error), request };
  }
  const parsed = parseAgentSql(gen.text);
  if (parsed.error || !parsed.sql) return { ok: false, error: (parsed && parsed.error) || 'Ajan geçerli SQL üretemedi', request };
  const sql = parsed.sql;
  const cfg2 = { ...cfg };
  if (database && cfg.type !== 'sqlite') cfg2.database = database;
  // 3) Yazma/DDL üretildiyse çalıştırmadan önce onaya sun (UI onaylayınca dbExec ile çalışır)
  if (isWriteSql(sql) && confirm !== true) {
    return { ok: false, needConfirm: true, sql, request: String(request), danger: isDangerSql(sql), write: true, agent: true };
  }
  // 4) Çalıştır + logla (SELECT ise doğrudan; yazma onaylandıysa buraya gelir)
  const result = await runDbAndLog(cfg2, sql, { conn: cfg.name || id, db: db || '', agent: true, request: String(request).slice(0, 300) });
  return { ...result, sql, request: String(request) };
});

// ---------- git detayları ----------
ipcMain.handle('galaxy:gitLog', async (e, projectId) => {
  const scan = scanProjects();
  const proj = scan.projects.find(p => p.id === projectId);
  if (!proj || !proj.path) return { ok: false, error: 'Git deposu yok' };
  if (isRemotePath(proj.path)) return remoteGitLog(proj.path);
  if (!fs.existsSync(path.join(proj.path, '.git'))) return { ok: false, error: 'Git deposu yok' };
  const run = args => new Promise(res => execFile('git', args, { cwd: proj.path, env: ENV, timeout: 10000 }, (err, out) => res(err ? '' : String(out).trim())));
  const [logOut, branch, statusOut, branches, aheadBehind] = await Promise.all([
    run(['log', '--pretty=format:%h§%an§%ad§%s', '--date=format:%Y-%m-%d %H:%M', '-40']),
    run(['branch', '--show-current']),
    run(['status', '--porcelain']),
    run(['branch', '--format=%(refname:short)']),
    run(['rev-list', '--left-right', '--count', '@{u}...HEAD'])   // "behind<TAB>ahead" (upstream yoksa boş)
  ]);
  let behind = 0, ahead = 0;
  { const m = String(aheadBehind || '').trim().split(/\s+/); if (m.length === 2) { behind = +m[0] || 0; ahead = +m[1] || 0; } }
  const commits = logOut ? logOut.split('\n').map(l => {
    const [h, an, ad, ...s] = l.split('§');
    return { h, an, ad, s: s.join('§') };
  }) : [];
  const dirty = statusOut ? statusOut.split('\n').filter(Boolean) : [];
  // Porcelain XY ayrıştır: X=stage (index), Y=worktree (unstaged). Staged + unstaged ayrı ayrı.
  const files = dirty.map(line => {
    const x = line[0], y = line[1];
    let p = line.slice(3);
    if (p.includes(' -> ')) p = p.split(' -> ')[1];         // rename → yeni ad
    p = p.replace(/^"|"$/g, '');
    const untracked = x === '?' && y === '?';
    const staged = !untracked && x !== ' ';
    const unstaged = untracked || y !== ' ';
    const code = untracked ? '?' : (staged ? x : y);
    const label = { M: 'Değişti', A: 'Yeni', D: 'Silindi', R: 'Taşındı', C: 'Kopya', U: 'Çakışma', '?': 'Yeni' }[code] || 'Değişti';
    return { path: p, x, y, staged, unstaged, untracked, code, label };
  });
  return {
    ok: true,
    branch: branch || (proj.git && proj.git.branch) || '?',
    branches: branches ? branches.split('\n').filter(Boolean) : [],
    commits,
    dirty: dirty.length,
    dirtyFiles: dirty.slice(0, 12).map(l => l.trim()),
    files,
    staged: files.filter(f => f.staged).length,
    ahead, behind, hasUpstream: String(aheadBehind || '').trim().split(/\s+/).length === 2,
    activity30: proj.git ? proj.git.activity30 : 0
  };
});

// ---------- Git aksiyonları (stage/commit/push/pull/branch/diff) ----------
function gitProj(projectId) {
  const proj = scanProjects().projects.find(p => p.id === projectId);
  if (!proj || !proj.path) return { error: 'Proje bulunamadı' };
  if (isRemotePath(proj.path)) return { error: 'Uzak projede git aksiyonu desteklenmiyor' };
  if (!fs.existsSync(path.join(proj.path, '.git'))) return { error: 'Git deposu yok' };
  return { proj };
}
function execGit(cwd, args, timeout) {
  return new Promise(res => {
    execFile('git', args, { cwd, env: ENV, timeout: timeout || 60000, maxBuffer: 16 * 1024 * 1024 }, (err, out, se) => {
      if (err) res({ ok: false, error: (se || err.message || '').toString().trim() || 'git hatası', out: (out || '').toString() });
      else res({ ok: true, out: (out || '').toString() });
    });
  });
}
ipcMain.handle('galaxy:gitStage', async (e, { projectId, file } = {}) => {
  const g = gitProj(projectId); if (g.error) return { ok: false, error: g.error };
  return execGit(g.proj.path, file ? ['add', '--', file] : ['add', '-A']);
});
ipcMain.handle('galaxy:gitUnstage', async (e, { projectId, file } = {}) => {
  const g = gitProj(projectId); if (g.error) return { ok: false, error: g.error };
  return execGit(g.proj.path, file ? ['restore', '--staged', '--', file] : ['reset', '-q']);
});
ipcMain.handle('galaxy:gitCommit', async (e, { projectId, message } = {}) => {
  const g = gitProj(projectId); if (g.error) return { ok: false, error: g.error };
  if (!message || !String(message).trim()) return { ok: false, error: 'Commit mesajı boş' };
  return execGit(g.proj.path, ['commit', '-m', String(message)]);
});
ipcMain.handle('galaxy:gitPush', async (e, { projectId } = {}) => {
  const g = gitProj(projectId); if (g.error) return { ok: false, error: g.error };
  return execGit(g.proj.path, ['push'], 120000);
});
ipcMain.handle('galaxy:gitPull', async (e, { projectId } = {}) => {
  const g = gitProj(projectId); if (g.error) return { ok: false, error: g.error };
  return execGit(g.proj.path, ['pull'], 120000);
});
ipcMain.handle('galaxy:gitInit', async (e, { projectId, path: pth } = {}) => {
  let projPath = pth;
  if (projectId) {
    const scan = scanProjects();
    const proj = (scan.projects || []).find(p => p.id === projectId);
    if (proj && proj.path) projPath = proj.path;
  }
  if (!projPath || !knownPaths.has(projPath)) return { ok: false, error: 'Geçersiz klasör' };
  if (isRemotePath(projPath)) return { ok: false, error: 'Uzak projede git init yok' };
  if (fs.existsSync(path.join(projPath, '.git'))) return { ok: true, already: true };
  return execGit(projPath, ['init']);
});
ipcMain.handle('galaxy:gitSwitch', async (e, { projectId, branch, create } = {}) => {
  const g = gitProj(projectId); if (g.error) return { ok: false, error: g.error };
  if (!branch || !/^[\w.\/-]+$/.test(branch)) return { ok: false, error: 'Geçersiz dal adı' };
  return execGit(g.proj.path, create ? ['switch', '-c', branch] : ['switch', branch]);
});
ipcMain.handle('galaxy:gitDiff', async (e, { projectId, file, staged } = {}) => {
  const g = gitProj(projectId); if (g.error) return { ok: false, error: g.error };
  const args = ['diff', '--no-color'];
  if (staged) args.push('--staged');
  if (file) args.push('--', file);
  const r = await execGit(g.proj.path, args, 30000);
  // untracked dosya için diff boş döner → içeriği göster
  if (r.ok && !r.out && file && !staged) {
    const full = safeJoin(g.proj.path, file);
    if (full) { try { const c = fs.readFileSync(full, 'utf8').slice(0, 100 * 1024); return { ok: true, out: c, untracked: true }; } catch (er) {} }
  }
  return r;
});

g.encPass = encPass;
g.decPass = decPass;
g.dbConnect = dbConnect;
g.withDb = withDb;
g.isWriteSql = isWriteSql;
g.isDangerSql = isDangerSql;
g.getDbCfg = getDbCfg;
g.probePort = probePort;
g.autoDetectLocalDbs = autoDetectLocalDbs;
g.dbErr = dbErr;
g.buildDbSchema = buildDbSchema;
g.runDbAndLog = runDbAndLog;
g.quoteIdent = quoteIdent;
g.quoteTableName = quoteTableName;
g.ph = ph;
g.cleanAgentSql = cleanAgentSql;
g.gitProj = gitProj;
g.execGit = execGit;
g.LOCAL_DB_CANDIDATES = LOCAL_DB_CANDIDATES;
  }
};
