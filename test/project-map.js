'use strict';
// Proje haritası (lib/project-map.js): tipik bir web projesi + Python worker kurgusunda
// giriş, modül, rota, HTTP/IPC kenarı, veri katmanı ve dış servis tespitini doğrular.
const fs = require('fs');
const os = require('os');
const path = require('path');
const { analyzeProject } = require('../lib/project-map');

const results = [];
const check = (name, ok, detail) => { results.push({ name, ok: !!ok }); console.log((ok ? '✓ ' : '✗ ') + name + (detail ? '  (' + detail + ')' : '')); };

const ROOT = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'gx-map-')));
const w = (rel, text) => { const f = path.join(ROOT, rel); fs.mkdirSync(path.dirname(f), { recursive: true }); fs.writeFileSync(f, text); };

w('package.json', JSON.stringify({
  name: 'shop', scripts: { build: 'tsc', dev: 'tsc -p . && nodemon src/server.ts', web: 'vite' },
  dependencies: { express: '^4', '@prisma/client': '^5', stripe: '^14', axios: '^1', react: '^18' }
}));
w('.env', 'DATABASE_URL=postgresql://shop:gizli@localhost:5432/shopdb\nPORT=4000\n');
w('docker-compose.yml', 'services:\n  db:\n    image: postgres:16\n    ports:\n      - "5432:5432"\n  cache:\n    image: redis:7\n  api:\n    build: .\n');
w('prisma/schema.prisma', 'datasource db {\n  provider = "postgresql"\n  url = env("DATABASE_URL")\n}\nmodel User {\n  id Int @id\n  email String\n  orders Order[]\n}\nmodel Order {\n  id Int @id\n  total Int\n  userId Int\n}\n');
w('src/server.ts', "import express from 'express';\nimport { router } from './routes/orders';\nconst app = express();\napp.use('/api', router);\napp.listen(process.env.PORT);\n");
w('src/routes/orders.ts', "import { Router } from 'express';\nimport { listOrders, payOrder } from '../services/orders';\nexport const router = Router();\nrouter.get('/orders', async (req, res) => res.json(await listOrders()));\nrouter.post('/orders/:id/pay', async (req, res) => res.json(await payOrder(req.params.id)));\n");
w('src/services/orders.ts', "import { prisma } from '@/lib/db';\nimport Stripe from 'stripe';\nexport const listOrders = () => prisma.order.findMany();\nexport async function payOrder(id) { await fetch('https://api.stripe.com/v1/charges'); return prisma.order.update({ where: { id } }); }\nexport const raw = (db) => db.query('SELECT * FROM audit_log WHERE id = 1');\n");
w('src/lib/db.ts', "import { PrismaClient } from '@prisma/client';\nexport const prisma = new PrismaClient();\n");
w('src/routes/orders.test.ts', "import { router } from './orders';\n");
w('web/index.html', '<html><body><script type="module" src="/src/main.tsx"></script></body></html>');
w('web/src/main.tsx', "import App from './App';\nimport './styles.css';\n");
w('web/src/App.tsx', "import axios from 'axios';\nexport default function App(){ fetch('/api/orders'); axios.post('/api/orders/7/pay'); return null; }\n");
w('worker/jobs.py', "import redis\nfrom worker.util import helper\n\nif __name__ == '__main__':\n    helper()\n");
w('worker/util.py', "def helper():\n    return 1\n");
w('node_modules/express/index.js', "module.exports = 1;\n");

const m = analyzeProject(ROOT);
const node = id => m.nodes.find(n => n.id === id);
const edge = (from, to, kind) => m.edges.find(e => e.from === from && e.to === to && (!kind || e.kind === kind));

check('Analiz çalıştı', m.ok, m.stats && (m.stats.analyzed + ' dosya, ' + m.stats.ms + ' ms'));
check('node_modules ve test dosyası grafikte yok', !m.files.some(f => /node_modules|\.test\./.test(f.rel)) && m.stats.tests === 1);
const entries = m.nodes.filter(n => n.kind === 'entry');
check('Giriş: npm run dev → src/server.ts (build adımı atlandı)', entries.some(e => /npm run dev/.test(e.label) && e.file === 'src/server.ts'), entries.map(e => e.label + '→' + e.file).join(', '));
check('Giriş: web/index.html <script> → web/src/main.tsx', entries.some(e => e.file === 'web/src/main.tsx'));
check('Giriş: Python __main__', entries.some(e => e.file === 'worker/jobs.py'));
check('Modüller: src/routes, src/services, src/lib ayrı', ['mod:src/routes', 'mod:src/services', 'mod:src/lib'].every(node));
check('Rotalar: 2 HTTP rotası (src/routes)', node('mod:src/routes') && node('mod:src/routes').routes === 2);
check('Import kenarı: routes → services → lib (@/ takma adı)', edge('mod:src/routes', 'mod:src/services', 'import') && edge('mod:src/services', 'mod:src/lib', 'import'));
check('HTTP kenarı: web → routes (/api öneki)', edge('mod:web', 'mod:src/routes', 'http'));
check('Python import kenarı: worker kendi içinde', m.files.find(f => f.rel === 'worker/jobs.py').imports.includes('worker/util.py'));
const pg = node('db:postgres');
check('Veri: PostgreSQL (env + compose + prisma + kod)', pg && ['env', 'compose', 'prisma', 'kod'].every(s => pg.sources.includes(s)), pg && pg.sources.join(','));
check('Veri: .env şifresi dışarı verilmez', pg && !JSON.stringify(m).includes('gizli') && pg.env.database === 'shopdb');
check('Veri: Prisma modelleri + alanları', pg && pg.models.map(x => x.name).join() === 'User,Order' && pg.models[0].fields.includes('email'));
check('Veri: koddan tablolar (prisma.order, SQL audit_log)', pg && pg.tables.includes('order') && pg.tables.includes('audit_log'), pg && pg.tables.join(','));
check('Veri: lib → PostgreSQL kenarı (ORM birincil motora bağlanır)', edge('mod:src/lib', 'db:postgres', 'db'));
check('Veri: Redis (compose + Python kodu)', node('db:redis') && edge('mod:worker', 'db:redis', 'db'));
check('Dış servis: Stripe SDK + api.stripe.com', edge('mod:src/services', 'ext:stripe', 'ext') && edge('mod:src/services', 'ext:api.stripe.com', 'ext'));
check('Compose servisleri listelendi', m.compose.map(s => s.name).join() === 'db,cache,api');

// Uygulama analizi worker'da koşturur (ipc/scan-worker.js) — aynı sonuç oradan da gelmeli.
const { Worker } = require('worker_threads');
const worker = new Worker(path.join(__dirname, '..', 'ipc', 'scan-worker.js'), { workerData: { kind: 'projectMap', root: ROOT } });
const done = (ok, detail) => {
  check('Worker: ipc/scan-worker.js aynı haritayı döndürür', ok, detail);
  worker.terminate();
  fs.rmSync(ROOT, { recursive: true, force: true });
  const failed = results.filter(r => !r.ok);
  console.log('\nPROJE HARİTASI: ' + (results.length - failed.length) + '/' + results.length + ' geçti');
  process.exit(failed.length ? 1 : 0);
};
worker.on('message', w2 => done(w2 && w2.ok && w2.nodes.length === m.nodes.length && w2.edges.length === m.edges.length, w2 && (w2.nodes || []).length + ' düğüm'));
worker.on('error', err => done(false, err.message));
