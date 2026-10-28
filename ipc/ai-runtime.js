// Yapay zekâ ve kabuk çalışma zamanı: Claude CLI akışı, dijital ikiz (asistan) + sohbet geçmişi,
// native ses tanıma, uzman ajanlar, günlük/rapor, yerel+SSH bash oturumları, zamanlayıcı.
// with(g) bilinçli: çıplak isimler main.js'in paylaşılan g nesnesine çözülür; g.X = ... atamaları
// bu modülün sonraki modüllere verdiği çıktıdır (sıra main.js'te). Bu yüzden 'use strict' yok ve
// `require('./lib/…')` gibi göreli yollar main.js'e (proje köküne) göre çözülür.
module.exports = function register(g) {
  with (g) {
// ---------- README ----------
ipcMain.handle('galaxy:readme', async (e, p) => {
  if (!p || !knownPaths.has(p)) return null;
  if (isRemotePath(p)) return remoteReadme(p);
  try {
    const files = fs.readdirSync(p).map(f => f.normalize('NFC'));
    let md = files.find(f => f.toLowerCase() === 'readme.md')
          || files.find(f => f.toLowerCase().endsWith('.md'));
    if (!md) return null;
    const content = fs.readFileSync(path.join(p, md), 'utf8').slice(0, 60000);
    return { name: md, content };
  } catch (err) { return null; }
});

// ---------- Claude konsolu ----------
const runs = new Map(); // runId -> child
const claudeSessions = new Map(); // sessionKey -> claude session_id

function streamClaude({ win, channel, runId, cwd, args, sessionKey, continued }) {
  if (IS_MAS) return { ok: false, error: MAS_BLOCKED };
  const send = (kind, text) => { if (!win.isDestroyed()) win.webContents.send(channel, { runId, kind, text }); };
  let child;
  try {
    child = cliSpawn(claudeBin(), args, { cwd, env: ENV });
  } catch (err) {
    return { ok: false, error: err.message };
  }
  // Prompt -p ile arg olarak geçiyor; stdin'i kapat ki "no stdin data received" uyarısı çıkmasın.
  try { child.stdin && child.stdin.end(); } catch (e) {}
  runs.set(runId, child);

  let buf = '';
  child.stdout.on('data', chunk => {
    buf += chunk.toString();
    let i;
    while ((i = buf.indexOf('\n')) >= 0) {
      const line = buf.slice(0, i).trim();
      buf = buf.slice(i + 1);
      if (!line) continue;
      try {
        const msg = JSON.parse(line);
        if (msg.type === 'system' && msg.subtype === 'init') {
          if (msg.session_id && sessionKey) claudeSessions.set(sessionKey, String(msg.session_id));
          send('info', (continued ? 'oturum devam' : 'oturum başladı') + ` · model: ${msg.model || '?'}`);
        } else if (msg.type === 'stream_event' && msg.event) {
          // Token token akış (--include-partial-messages): metin delta'larını canlı gönder.
          const ev = msg.event;
          if (ev.type === 'content_block_delta' && ev.delta && ev.delta.type === 'text_delta' && ev.delta.text) {
            child._sawDelta = true; send('text', ev.delta.text);
          }
        } else if (msg.type === 'assistant' && msg.message && msg.message.content) {
          for (const c of msg.message.content) {
            // Delta olarak akıttıysak tam metni TEKRAR gönderme (çift olmasın).
            if (c.type === 'text' && c.text) { if (!child._sawDelta) send('text', c.text); }
            else if (c.type === 'tool_use') send('tool', `${c.name}${c.input && c.input.file_path ? ' → ' + c.input.file_path : c.input && c.input.command ? ' → ' + String(c.input.command).slice(0, 120) : ''}`);
          }
        } else if (msg.type === 'result') {
          send('result', msg.result || (msg.subtype === 'success' ? 'tamamlandı' : msg.subtype));
        }
      } catch (err) {
        send('raw', line);
      }
    }
  });
  child.stderr.on('data', chunk => {
    // Zararsız uyarıları (trust/stdin/permission) hata olarak gösterme — yalnız gerçek hatalar.
    for (const line of String(chunk).split('\n')) {
      const l = line.trim(); if (!l) continue;
      if (/not been trusted|Ignoring \d+ permission|permissions\.allow|no stdin data received|proceeding without it|redirect stdin/i.test(l)) continue;
      send('err', l);
    }
  });
  child.on('error', err => {
    send('err', err.code === 'ENOENT'
      ? 'claude komutu bulunamadı. Kurulum: npm install -g @anthropic-ai/claude-code'
      : err.message);
    send('done', '');
    runs.delete(runId);
  });
  child.on('close', code => {
    send('done', String(code ?? ''));
    runs.delete(runId);
  });
  return { ok: true };
}

// Ek dosyaları prompt'a ve erişim izinlerine bağlar
function applyAttachments(prompt, args, attachments) {
  if (!attachments || !attachments.length) return prompt;
  const list = attachments.slice(0, 10);
  prompt += `\n\n=== EKLENEN DOSYALAR ===\nKullanıcı şu dosyaları ekledi. Read aracıyla incele — görselleri ve PDF'leri doğrudan görebilirsin. .docx/.pptx/.xlsx gibi Office dosyaları için önce şu komutla metne çevir: textutil -convert txt -stdout "<dosya>" (veya gerekiyorsa unzip ile içeriğine bak):\n` +
    list.map(f => `- ${f}`).join('\n');
  const dirs = new Set(list.map(f => path.dirname(f)));
  for (const d of dirs) args.push('--add-dir', d);
  return prompt;
}

// Pano görüntüsünü (ekran görüntüsü) dosyaya kaydet
const { clipboard } = require('electron');
function attachmentsDir() {
  const d = path.join(DATA_DIR, 'attachments');
  fs.mkdirSync(d, { recursive: true });
  return d;
}
ipcMain.handle('galaxy:pasteImage', () => {
  const img = clipboard.readImage();
  if (!img || img.isEmpty()) return null;
  const file = path.join(attachmentsDir(), `pano-${Date.now()}.png`);
  fs.writeFileSync(file, img.toPNG());
  return file;
});

// Yolu olmayan (ör. tarayıcıdan sürüklenen) dosyayı kaydet
ipcMain.handle('galaxy:saveAttachment', (e, { name, dataBase64 }) => {
  if (!name || !dataBase64) return null;
  const safe = String(name).replace(/[^\w. çğıöşüÇĞİÖŞÜ-]/g, '_').slice(0, 80) || 'ek';
  const file = path.join(attachmentsDir(), `${Date.now()}-${safe}`);
  fs.writeFileSync(file, Buffer.from(dataBase64, 'base64'));
  return file;
});

ipcMain.handle('galaxy:pickFiles', async (e) => {
  const win = BrowserWindow.fromWebContents(e.sender);
  const { canceled, filePaths } = await dialog.showOpenDialog(win, {
    title: 'Dosya ekle',
    properties: ['openFile', 'multiSelections'],
    filters: [
      { name: 'Desteklenenler', extensions: ['png', 'jpg', 'jpeg', 'gif', 'webp', 'pdf', 'docx', 'doc', 'pptx', 'xlsx', 'csv', 'txt', 'md', 'json'] },
      { name: 'Tümü', extensions: ['*'] }
    ]
  });
  return canceled ? [] : filePaths;
});

ipcMain.handle('galaxy:claudeRun', (e, { runId, cwd, prompt, continueSession, attachments, sessionKey }) => {
  if (!cwd || !knownPaths.has(cwd)) return { ok: false, error: 'Geçersiz klasör' };
  const key = String(sessionKey || cwd || '');
  const head = [];
  if (continueSession) {
    const sid = key && claudeSessions.get(key);
    if (sid) head.push('--resume', sid);
    else head.push('--continue');
  }
  const args = ['--output-format', 'stream-json', '--verbose', '--permission-mode', 'acceptEdits'];
  prompt = applyAttachments(prompt, args, attachments);
  return streamClaude({ win: BrowserWindow.fromWebContents(e.sender), channel: 'claude:out', runId, cwd, args: head.concat(['-p', prompt], args), sessionKey: key, continued: !!continueSession });
});

// ---------- Galaxy Asistanı (dijital ikiz — sohbet + proje yardımı) ----------
// claudeRun'dan farkı: KİŞİLİK sistem promptu ekler, projede olmak ŞART DEĞİL (genel sohbet de yapar),
// ve nötr bir dizinde çalışabilir. Böylece "bu kodlama sorusu değil" gibi robotik cevaplar vermez.
// ---------- Dijital ikiz hafızası (kullanıcının tercihleri, kararları, kendisi hakkındaki gerçekler) ----------
function twinFile() { return path.join(DATA_DIR, 'twin', 'facts.json'); }
function twinLoad() { try { const a = JSON.parse(fs.readFileSync(twinFile(), 'utf8')); return Array.isArray(a) ? a : []; } catch (e) { return []; } }
function twinSave(arr) { try { fs.mkdirSync(path.dirname(twinFile()), { recursive: true }); fs.writeFileSync(twinFile(), JSON.stringify(arr.slice(-300), null, 2), 'utf8'); } catch (e) {} }
ipcMain.handle('galaxy:twinMemGet', () => ({ ok: true, facts: twinLoad() }));
ipcMain.handle('galaxy:twinMemAdd', (e, text) => {
  const t = String(text || '').replace(/\s+/g, ' ').trim().slice(0, 400);
  if (!t) return { ok: false, error: 'boş' };
  const arr = twinLoad();
  const fold = s => s.toLocaleLowerCase('tr');
  if (arr.some(f => fold(f.text) === fold(t))) return { ok: true, dup: true };
  arr.push({ id: 'm' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5), text: t, ts: new Date().toISOString() });
  twinSave(arr);
  return { ok: true };
});
ipcMain.handle('galaxy:twinMemDelete', (e, id) => { twinSave(twinLoad().filter(f => f.id !== id)); return { ok: true }; });

function assistantPersona(ctx) {
  let name = '', bio = '', team = [];
  try {
    const d = loadData(); name = (d.profile && d.profile.name) || ''; bio = getSettings(d).assistantBio || '';
    team = (d.agents || []).filter(a => !a.paused).map(a => `${a.id} = ${a.name} (${a.role}${(a.abilities || []).length ? ': ' + a.abilities.slice(0, 3).join('; ') : ''})`);
  } catch (e) {}
  ctx = ctx || {};
  if (ctx.captainName) name = String(ctx.captainName);
  if (ctx.captainAbout) bio = (bio ? bio + ' · ' : '') + String(ctx.captainAbout);
  const who = name ? `${name}'in` : 'kullanıcının';
  const lang = (ctx.lang === 'en') ? 'en' : 'tr';
  const voice = !!ctx.voice;
  const speakRule = lang === 'en' ? 'Speak English. Do not switch to Turkish unless the user writes Turkish.' : 'DAIMA Türkçe konuş. Kullanıcı veya ses tanıma İngilizce yazsa bile CEVABI Türkçe ver. İngilizceye çevirme, İngilizce yanıt yazma.';
  const unis = (ctx.unis || []).slice(0, 30).join(', ');
  const projs = (ctx.projects || []).slice(0, 60).join(', ');
  const facts = twinLoad().slice(-60).map(f => '- ' + f.text).join('\n');
  const lines = [
    `Sen ${who} dijital ikizisin; adın Kaptan. Proje yardımcısı DEĞİLSİN: kullanıcıyı birebir temsil edersin — onun gibi düşünür, onun önceliklerini, alışkanlıklarını ve kararlarını bilir, onun yerine iş yürütürsün. KAPTAN masaüstü uygulamasının içindesin. Konum: ${ctx.location || 'uzay'}. ${speakRule} Emoji yok.`,
    voice
      ? 'Şu an SESLİ konuşuyorsunuz: en fazla 2 kısa cümle. Yazı yanlış duyulmuş olabilir; listeden EN YAKIN adı seç ve HEMEN [[ACT ad|arg]] bas. "Hangisini kastediyorsun?" SORMA.'
      : 'Şu an YAZILI konuşuyorsunuz: gerektiği kadar derin cevap ver. Önce net sonuç, sonra gerekirse Markdown ile maddeler, tablo, kod bloğu. Basit soruya kısa cevap.',
    `Ekibin (her biri bir işin uzmanı): ${team.join(' · ') || 'yok'}. Senin de tüm bu yeteneklerin var: git yönetimi, kod kalitesi incelemesi, doküman üretimi, akış analizi, proje planlama. Küçük işi kendin yap. Uzun, tam ekran görsel çalışma gerektiren işi uzmana devret: [[ACT open_agent|ajan_id|ajana gidecek görev]]. Birden çok uzmanın görüşü gerekiyorsa toplantı aç: [[ACT meeting|konu]].`,
    `Kullanıcı hakkında yeni ve kalıcı bir şey öğrenirsen (tercih, karar, alışkanlık, çalıştığı iş, sevmediği şey) cevabına [[MEM tek cümlelik gerçek]] ekle. Geçici şeyleri kaydetme. Bu etiket görünmez.`,
    `Uygulama işi varsa cevabında MUTLAKA [[ACT ad|arg]] olmalı. Tarif etme. "yapamam / sen tıkla" deme. Komut görünmez; yanında doğal bir cümle yaz.`,
    `"X tarafına/gezegenine/evrenine gir/aç/git" = evren ise [[ACT open_universe|ad]], proje ise [[ACT open_project|ad]]. Sekme isteği = [[ACT open_tab|id]].`,
    `Komutlar: [[ACT open_universe|ad]] · [[ACT open_project|ad]] · [[ACT open_tab|id]] (genel=Ana Sayfa, evren=Projeler, pano=Görevler, pixel=Ajanlar/Toplantı Salonu, zaman=Zamanlanmış işler, dongu=Proje taraması, posta=E-posta, db=Veritabanları, docker=Konteynerler, servers=SSH sunucuları) · [[ACT open_agent|id|görev]] · [[ACT meeting|konu]] · [[ACT open_git]] · [[ACT back]] · [[ACT git_push]] · [[ACT git_pull]] · [[ACT git_commit|mesaj]] · [[ACT git_pr]] · [[ACT run|komut]] · [[ACT open_folder]] · [[ACT open_terminal]] · [[ACT open_settings]] · [[ACT mail_brief]] · [[ACT open_db]] · [[ACT compose_up]] · [[ACT compose_down]] · [[ACT open_port|port]] · [[ACT run_script|ad]] · [[ACT bind_db]]`,
    `Örnek: "papilon tarafına gir" → "[[ACT open_universe|Papilon]] Papilon'a geçiyorum."  "dallarımı göster" → "[[ACT open_agent|git|Dal grafiğini çiz ve açıkla]] Git Yöneticisi'ni açıyorum."`,
    `Kodlama aracı değilsin: hava, sohbet, tavsiye — her konuda cevap ver. Web arama ve getirme açık; güncel bilgiyi ara. "iznim yok / erişemiyorum" deme.`,
    unis ? `Evrenler: ${unis}.` : '',
    projs ? `Projeler: ${projs}.` : '',
    ctx.agentName ? `Şu an ${ctx.agentName} kişiliğiyle konuşuyorsun (${ctx.agentRole || 'ajan'}). ${ctx.agentSys || ''}` : '',
    ctx.planetWork ? `Bu gezegen işi: ${ctx.planetWork}.` : '',
    name ? `Kullanıcının adı ${name}. İsmiyle hitap et.` : '',
    bio ? `\nKULLANICI HAKKINDA: ${bio}` : '',
    facts ? `\nKULLANICIYI TANIDIKLARIN (hafızan — buna göre davran, tekrar sorma):\n${facts}` : ''
  ];
  return lines.filter(Boolean).join('\n');
}
// ---------- Asistan sohbet geçmişi (kalıcı, diske) ----------
function asstChatFile() { return path.join(DATA_DIR, 'assistant-chat.json'); }
function asstChatLoad() { try { return JSON.parse(fs.readFileSync(asstChatFile(), 'utf8')) || []; } catch (e) { return []; } }
function asstChatSave(arr) { try { fs.mkdirSync(DATA_DIR, { recursive: true }); fs.writeFileSync(asstChatFile(), JSON.stringify(arr.slice(-400)), 'utf8'); } catch (e) {} }
ipcMain.handle('galaxy:asstHistoryGet', () => ({ ok: true, messages: asstChatLoad() }));
ipcMain.handle('galaxy:asstHistoryAppend', (e, msg) => { const a = asstChatLoad(); a.push({ role: (msg && msg.role) || 'assistant', text: String((msg && msg.text) || '').slice(0, 8000), ts: (msg && msg.ts) || Date.now() }); asstChatSave(a); return { ok: true }; });
ipcMain.handle('galaxy:asstHistoryClear', () => { asstChatSave([]); return { ok: true }; });
ipcMain.handle('galaxy:assistantRun', (e, { runId, prompt, cwd, continueSession, ctx }) => {
  // cwd: proje verildiyse (bilinen yol) orada çalış (dosya işi yapabilsin); yoksa nötr veri dizini (sadece sohbet).
  const workCwd = (cwd && knownPaths.has(cwd)) ? cwd : DATA_DIR;
  // Asistan TAM YETKİLİ: tüm araçlar (web arama/getirme, dosya, bash) izin sormadan çalışsın.
  const key = 'assistant:' + workCwd;
  const head = [];
  if (continueSession) {
    const sid = claudeSessions.get(key);
    if (sid) head.push('--resume', sid);
    else head.push('--continue');
  }
  const args = ['--output-format', 'stream-json', '--verbose', '--include-partial-messages',
    '--dangerously-skip-permissions',
    '--append-system-prompt', assistantPersona(ctx)];
  return streamClaude({ win: BrowserWindow.fromWebContents(e.sender), channel: 'claude:out', runId, cwd: workCwd, args: head.concat(['-p', String(prompt || '')], args), sessionKey: key, continued: !!continueSession });
});

// ---------- Native ses tanıma (macOS Speech) — asistanın sesli komutu + "Hey Galaxy" uyandırma ----------
let sttChild = null; let sttLocale = 'tr-TR';
function sttBin() {
  const src = path.join(APP_DIR, 'native', 'galaxy-stt.swift');
  const out = path.join(DATA_DIR, 'galaxy-stt');
  let packaged = '';
  try { packaged = path.join(process.resourcesPath || '', 'galaxy-stt'); } catch (e) {}
  try {
    const srcOk = fs.existsSync(src);
    const pkgOk = !!(packaged && fs.existsSync(packaged));
    const outOk = fs.existsSync(out);
    const srcM = srcOk ? fs.statSync(src).mtimeMs : 0;
    if (pkgOk && (!srcOk || fs.statSync(packaged).mtimeMs >= srcM)) return packaged;
    if (outOk && (!srcOk || fs.statSync(out).mtimeMs >= srcM)) return out;
    if (!srcOk) return pkgOk ? packaged : (outOk ? out : null);
    const { execFileSync } = require('child_process');
    const swiftc = ['/usr/bin/swiftc', 'swiftc'].find(p => { try { return p === 'swiftc' || fs.existsSync(p); } catch (e) { return false; } }) || 'swiftc';
    execFileSync(swiftc, [src, '-O', '-o', out], { stdio: 'ignore', timeout: 90000, env: ENV });
    return fs.existsSync(out) ? out : (pkgOk ? packaged : null);
  } catch (e) { try { if (packaged && fs.existsSync(packaged)) return packaged; } catch (x) {} return fs.existsSync(out) ? out : null; }
}
ipcMain.handle('galaxy:sttAvailable', () => ({ ok: process.platform === 'darwin' && !!sttBin() }));
ipcMain.handle('galaxy:sttStart', (e, hints) => {
  if (process.platform !== 'darwin') return { ok: false, error: 'yalnız macOS' };
  let hintList = hints, locale = 'tr-TR';
  if (hints && !Array.isArray(hints) && typeof hints === 'object') { hintList = hints.hints; locale = hints.lang === 'en' ? 'en-US' : 'tr-TR'; }
  const hintJson = JSON.stringify((Array.isArray(hintList) ? hintList : []).slice(0, 90));
  if (sttChild) {
    if (sttLocale && sttLocale !== locale) { const old = sttChild; sttChild = null; try { old.stdin.write('quit\n'); } catch (e) {} try { old.kill(); } catch (e) {} }
    else { try { sttChild.stdin.write('resume\n'); } catch (e) {} try { sttChild.stdin.write('hints ' + hintJson + '\n'); } catch (e) {} return { ok: true }; }
  }
  const bin = sttBin();
  if (!bin) return { ok: false, error: 'stt-derlenemedi (Xcode Command Line Tools gerekli)' };
  const win = BrowserWindow.fromWebContents(e.sender);
  const send = (msg) => { try { if (win && !win.isDestroyed()) win.webContents.send('stt:out', msg); } catch (e) {} };
  let child;
  try { child = spawn(bin, [], { env: Object.assign({}, ENV, { GALAXY_STT_HINTS: hintJson, GALAXY_STT_LOCALE: locale }) }); sttChild = child; sttLocale = locale; }
  catch (err) { sttChild = null; return { ok: false, error: err.message }; }
  let buf = '';
  child.stdout.on('data', d => { buf += d.toString(); let i; while ((i = buf.indexOf('\n')) >= 0) { const line = buf.slice(0, i).trim(); buf = buf.slice(i + 1); if (!line) continue; try { send(JSON.parse(line)); } catch (e) {} } });
  child.stderr.on('data', () => {});
  child.on('close', () => { send({ type: 'status', text: 'closed' }); if (sttChild === child) sttChild = null; });
  child.on('error', (err) => { send({ type: 'error', text: err.message }); if (sttChild === child) sttChild = null; });
  return { ok: true };
});
ipcMain.handle('galaxy:sttStop', () => {
  if (sttChild) { try { sttChild.stdin.write('quit\n'); } catch (e) {} const c = sttChild; sttChild = null; setTimeout(() => { try { c.kill(); } catch (e) {} }, 500); }
  return { ok: true };
});
ipcMain.handle('galaxy:sttPause', () => {
  if (sttChild) { try { sttChild.stdin.write('pause\n'); } catch (e) {} }
  return { ok: true };
});
ipcMain.handle('galaxy:sttResume', () => {
  if (sttChild) { try { sttChild.stdin.write('resume\n'); } catch (e) {} }
  return { ok: true };
});
app.on('will-quit', () => { if (sttChild) { try { sttChild.kill(); } catch (e) {} sttChild = null; } });

// ---------- ajan (CTO vb.) çalıştırma ----------
ipcMain.handle('galaxy:agentRun', (e, { runId, agentId, prompt, projectId, attachments, continueSession }) => {
  const data = loadData();
  const agent = (data.agents || []).find(a => a.id === agentId);
  if (!agent) return { ok: false, error: 'Ajan bulunamadı' };
  if (agent.paused) return { ok: false, error: agent.name + ' duraklatıldı — önce devam ettir' };

  let full, cwd;
  const scan = scanProjects();
  const proj = projectId ? scan.projects.find(p => p.id === projectId) : null;

  if (proj && proj.path) {
    // PROJE BAĞLAMI: ajan bu projenin içinde çalışır
    const done = proj.plan.filter(i => i.done).length;
    const files = listDirs(proj.path).slice(0, 30).join(', ');
    const pdigest = [
      `Proje: ${proj.name} (klasör: ${proj.path})`,
      `Durum: ${proj.status} · İlerleme: %${proj.progress} · Aşama: ${proj.stage || '-'}`,
      `Git: ${proj.git ? `${proj.git.branch} · son: ${(proj.git.lastTs || '').slice(0, 10)} · 30g aktivite: ${proj.git.activity30}` : 'depo yok'}`,
      `Plan (${done}/${proj.plan.length}):`,
      ...proj.plan.map(i => `  [${i.done ? 'x' : ' '}] ${i.text}`),
      proj.notes ? `Notlar: ${proj.notes}` : '',
      `Kök klasörler: ${files}`
    ].filter(Boolean).join('\n');
    full = `${agent.prompt}\n\n=== ODAK: TEK PROJE ===\n${pdigest}\n=== SON ===\n\nŞu an bu projenin klasöründesin, dosyalarını okuyabilirsin. Yanıtını SADECE bu proje özelinde ver.\n\nKullanıcının isteği: ${prompt || 'Bu proje için durum değerlendirmesi yap.'}\n${profileContext(data)}`;
    cwd = proj.path;
  } else {
    const digest = buildDigest();
    full = `${agent.prompt}\n\n=== TÜM PROJELERİN GÜNCEL DURUMU ===\n${digest}\n=== SON ===\n\nKullanıcının isteği: ${prompt || 'Genel durum raporu ver.'}\n${profileContext(data)} Dosyaları incelemen gerekirse bulunduğun klasördeki proje klasörlerini okuyabilirsin.`;
    cwd = universeCwd(data);
  }
  const args = ['--output-format', 'stream-json', '--verbose'];
  full = applyAttachments(full, args, attachments);
  const key = String(agentId || '') + ':' + String(projectId || cwd || '');
  const head = [];
  if (continueSession) {
    const sid = claudeSessions.get(key);
    if (sid) head.push('--resume', sid);
    else head.push('--continue');
  }
  // Diğer evren kökleri (ör. FY) mutlak yol olarak erişime açılır
  for (const u of data.universes || []) {
    if (path.isAbsolute(u.root)) args.push('--add-dir', u.root);
  }
  if (agent.write) args.push('--permission-mode', 'acceptEdits');
  const tools = (Array.isArray(agent.tools) ? agent.tools : []).map(t => String(t)).filter(t => /^[A-Za-z]+(\([^()]*\))?$/.test(t));
  if (tools.length) args.push('--allowedTools', tools.join(','));
  return streamClaude({ win: BrowserWindow.fromWebContents(e.sender), channel: 'agent:out', runId, cwd, args: head.concat(['-p', full], args), sessionKey: key, continued: !!continueSession });
});

// ---------- günlük (captain's log) ----------
function runClaudeJson(prompt, cwd) {
  return new Promise(resolve => {
    if (IS_MAS) return resolve({ error: MAS_BLOCKED });
    let child;
    try {
      child = cliSpawn(claudeBin(), ['-p', prompt, '--output-format', 'json'], { cwd, env: ENV });
    } catch (err) { return resolve({ error: err.message }); }
    let out = '';
    const timer = setTimeout(() => { child.kill('SIGTERM'); resolve({ error: 'zaman aşımı' }); }, 90000);
    child.stdout.on('data', c => { out += c.toString(); });
    child.on('error', err => { clearTimeout(timer); resolve({ error: err.code === 'ENOENT' ? 'claude komutu bulunamadı' : err.message }); });
    child.on('close', () => {
      clearTimeout(timer);
      try {
        const wrapper = JSON.parse(out);
        let result = (wrapper.result || '').trim();
        const m = result.match(/\{[\s\S]*\}/);
        if (m) result = m[0];
        resolve({ data: JSON.parse(result) });
      } catch (err) { resolve({ error: 'yanıt çözümlenemedi' }); }
    });
  });
}

ipcMain.handle('galaxy:logDetect', async (e, text) => {
  const scan = scanProjects();
  const list = scan.projects.map(p => `${p.id} | ${p.name} | ${(p.desc || '').slice(0, 90)}`).join('\n');
  const prompt = `Aşağıda proje listesi var (id | ad | açıklama):\n${list}\n\nKullanıcının günlük notu: "${text}"\n\nBu not en çok hangi projeyle ilgili ve tipi ne? "done" = yapılmış bir işin kaydı, "todo" = yapılacak iş/plan. SADECE şu JSON'u döndür, başka hiçbir şey yazma:\n{"projectId": "<listeden bir id veya none>", "confidence": <0-1 arası sayı>, "type": "<done veya todo>", "reason": "<tek cümle Türkçe gerekçe>", "entry": "<notu kısa ve düzgün tek cümleye çevir>"}`;
  const res = await runClaudeJson(prompt, universeCwd(loadData()));
  if (res.error) return { ok: false, error: res.error };
  const d = res.data || {};
  const proj = scan.projects.find(p => p.id === d.projectId);
  return {
    ok: true,
    projectId: proj ? proj.id : null,
    projectName: proj ? proj.name : null,
    folder: proj ? proj.path : null,
    confidence: d.confidence ?? 0,
    type: d.type === 'todo' ? 'todo' : 'done',
    reason: d.reason || '',
    entry: d.entry || text
  };
});

ipcMain.handle('galaxy:logApply', (e, { projectId, text, entry, writeReadme = true, addPlan = false }) => {
  const scan = scanProjects();
  const proj = scan.projects.find(p => p.id === projectId);
  const data = loadData();
  data.log = data.log || [];
  const record = { ts: new Date().toISOString(), text, projectId: proj ? proj.id : null, applied: false };

  // Plan listesine madde ekle
  if (proj && addPlan) {
    if (!data.projects[proj.id]) {
      data.projects[proj.id] = { name: proj.name, group: proj.group, status: proj.status, stage: proj.stage, progress: proj.progress, plan: [], notes: proj.notes, desc: proj.desc };
    }
    data.projects[proj.id].plan = data.projects[proj.id].plan || [];
    data.projects[proj.id].plan.push({ text: entry || text, done: false });
    record.applied = true;
  }

  if (proj && proj.path && writeReadme) {
    try {
      const readmePath = path.join(proj.path, 'README.md');
      const date = new Date().toISOString().slice(0, 10);
      // yapılacak iş → "## Yapılacaklar" bölümüne checkbox; yapılan iş → "## Günlük" bölümüne tarihli satır
      const isTodo = addPlan;
      const header = isTodo ? '## Yapılacaklar' : '## Günlük';
      const line = isTodo ? `- [ ] ${entry || text}` : `- **${date}:** ${entry || text}`;
      let content = '';
      try { content = fs.readFileSync(readmePath, 'utf8'); } catch (err) {}
      if (content.includes(header)) {
        content = content.replace(header, `${header}\n\n${line}`).replace(new RegExp(header + '\\n\\n\\n'), header + '\n\n');
      } else {
        content = (content ? content.trimEnd() + '\n\n' : `# ${proj.name}\n\n`) + `${header}\n\n${line}\n`;
      }
      fs.writeFileSync(readmePath, content, 'utf8');
      record.applied = true;
    } catch (err) {
      return { ok: false, error: err.message };
    }
  }
  data.log.unshift(record);
  data.log = data.log.slice(0, 200);
  saveData(data);
  return { ok: true, applied: record.applied };
});

ipcMain.handle('galaxy:logSave', (e, text) => {
  const data = loadData();
  data.log = data.log || [];
  data.log.unshift({ ts: new Date().toISOString(), text, projectId: null, applied: false });
  data.log = data.log.slice(0, 200);
  saveData(data);
  return true;
});

ipcMain.handle('galaxy:logList', () => {
  const data = loadData();
  return (data.log || []).slice(0, 50);
});

// ---------- kayıtlı sabah raporları ----------
ipcMain.handle('galaxy:reports', () => {
  const dir = path.join(DATA_DIR, 'reports');
  try {
    return fs.readdirSync(dir).filter(f => f.endsWith('.md')).sort().reverse().slice(0, 30);
  } catch (err) { return []; }
});

ipcMain.handle('galaxy:report', (e, name) => {
  if (typeof name !== 'string' || !/^[\w çğıöşüÇĞİÖŞÜ.-]+\.md$/.test(name)) return null;
  try { return fs.readFileSync(path.join(DATA_DIR, 'reports', name), 'utf8'); } catch (err) { return null; }
});

// Raporu harici uygulamada (Finder/editör) aç
ipcMain.handle('galaxy:openReportFile', (e, name) => {
  if (typeof name !== 'string' || !/^[\w çğıöşüÇĞİÖŞÜ.-]+\.md$/.test(name)) return false;
  try { shell.openPath(path.join(DATA_DIR, 'reports', name)); return true; } catch (err) { return false; }
});

ipcMain.handle('galaxy:claudeStop', (e, runId) => {
  const child = runs.get(runId);
  if (child) { child.kill('SIGTERM'); runs.delete(runId); }
  return true;
});

// ---------- gömülü bash terminali ----------
// Proje başına kalıcı bash süreci: cd/env durumu korunur, çıktı canlı akar.
const shells = new Map(); // shellId -> { child, cwd }
const SHELL_SENTINEL = '\x03GALAXY_DONE ';

function broadcastShell(msg) {
  for (const w of BrowserWindow.getAllWindows()) {
    try { w.webContents.send('shell:out', msg); } catch (e) {}
  }
}

// Yerel kabuk dosyası — Windows'ta Git for Windows'ın bash'i (aynı SHELL_SENTINEL protokolü çalışır).
function localShellFile() {
  if (process.platform !== 'win32') return '/bin/bash';
  const cands = [
    'C:\\Program Files\\Git\\bin\\bash.exe',
    'C:\\Program Files\\Git\\usr\\bin\\bash.exe',
    'C:\\Program Files (x86)\\Git\\bin\\bash.exe',
    path.join(process.env.LOCALAPPDATA || '', 'Programs', 'Git', 'bin', 'bash.exe')
  ];
  for (const c of cands) { try { if (c && fs.existsSync(c)) return c; } catch (e) {} }
  return null;
}
function ensureShell(shellId, cwd) {
  const existing = shells.get(shellId);
  if (existing && existing.child && !existing.child.killed && existing.child.exitCode === null) return existing;
  const shFile = localShellFile();
  if (!shFile) {  // Windows'ta git-bash yok
    broadcastShell({ id: shellId, kind: 'err', text: 'Gömülü terminal için Git for Windows (bash) gerekli. gitforwindows.org üzerinden kur ve uygulamayı yeniden aç.' });
    broadcastShell({ id: shellId, kind: 'done', code: 1, cwd });
    const stub = { child: null, cwd, noShell: true }; shells.set(shellId, stub); return stub;
  }
  const child = spawn(shFile, ['--noprofile', '--norc'], { cwd, env: { ...ENV, PS1: '', TERM: 'dumb' } });
  let buf = '';
  child.stdout.on('data', chunk => {
    buf += chunk.toString();
    let i;
    while ((i = buf.indexOf('\n')) >= 0) {
      const line = buf.slice(0, i);
      buf = buf.slice(i + 1);
      if (line.startsWith(SHELL_SENTINEL)) {
        const rest = line.slice(SHELL_SENTINEL.length);
        const sp = rest.indexOf(' ');
        const code = +(sp >= 0 ? rest.slice(0, sp) : rest) || 0;
        const cwd = sp >= 0 ? rest.slice(sp + 1) : '';
        if (cwd) { const rec2 = shells.get(shellId); if (rec2) rec2.cwd = cwd; }
        broadcastShell({ id: shellId, kind: 'done', code, cwd });
      } else {
        broadcastShell({ id: shellId, kind: 'out', text: line });
      }
    }
  });
  child.stderr.on('data', chunk => {
    for (const line of chunk.toString().split('\n')) {
      if (line) broadcastShell({ id: shellId, kind: 'err', text: line });
    }
  });
  child.on('error', err => broadcastShell({ id: shellId, kind: 'err', text: 'Kabuk başlatılamadı: ' + err.message }));
  child.on('close', () => {
    broadcastShell({ id: shellId, kind: 'exit' });
    shells.delete(shellId);
  });
  const rec = { child, cwd };
  shells.set(shellId, rec);
  return rec;
}

// Uzak sunucuda kabuk: ssh üzerinden bash (PTY yok → temiz satır çıktısı, echo/prompt yok).
// Yerel ensureShell ile aynı SHELL_SENTINEL mantığı ve aynı shell:out kanalı.
function ensureSshShell(shellId, serverId) {
  const existing = shells.get(shellId);
  if (existing && !existing.child.killed && existing.child.exitCode === null) return existing;
  const srv = getServer(serverId);
  if (!srv) throw new Error('Sunucu bulunamadı');
  // 'bash -l' = LOGIN kabuk: /etc/profile + ~/.bash_profile/.profile yüklenir, böylece
  // uzak PATH kullanıcının kendi terminalindekiyle aynı olur (docker/node/nvm/brew komutları bulunur).
  const child = spawn('ssh', [...sshBaseArgs(srv), sshTarget(srv), 'bash -l'], { env: ENV });
  let buf = '';
  child.stdout.on('data', chunk => {
    buf += chunk.toString();
    let i;
    while ((i = buf.indexOf('\n')) >= 0) {
      const line = buf.slice(0, i);
      buf = buf.slice(i + 1);
      if (line.startsWith(SHELL_SENTINEL)) {
        const rest = line.slice(SHELL_SENTINEL.length);
        const sp = rest.indexOf(' ');
        const code = +(sp >= 0 ? rest.slice(0, sp) : rest) || 0;
        const cwd = sp >= 0 ? rest.slice(sp + 1) : '';
        if (cwd) { const rec2 = shells.get(shellId); if (rec2) rec2.cwd = cwd; }
        broadcastShell({ id: shellId, kind: 'done', code, cwd });
      } else {
        broadcastShell({ id: shellId, kind: 'out', text: line });
      }
    }
  });
  child.stderr.on('data', chunk => { for (const line of chunk.toString().split('\n')) if (line) broadcastShell({ id: shellId, kind: 'err', text: line }); });
  child.on('error', err => broadcastShell({ id: shellId, kind: 'err', text: 'ssh başlatılamadı: ' + (err && err.message || err) }));
  child.on('close', (code) => { broadcastShell({ id: shellId, kind: 'exit', code }); shells.delete(shellId); });
  const rec = { child, remote: true, serverId };
  shells.set(shellId, rec);
  return rec;
}

ipcMain.handle('galaxy:sshShellStart', (e, { shellId, serverId } = {}) => {
  if (IS_MAS) return { ok: false, error: 'Gömülü terminal App Store sürümünde devre dışı.' };
  try { ensureSshShell(shellId, serverId); return { ok: true }; } catch (err) { return { ok: false, error: err.message }; }
});
ipcMain.handle('galaxy:sshShellInput', (e, { shellId, serverId, cmd } = {}) => {
  if (IS_MAS) return { ok: false, error: 'Gömülü terminal App Store sürümünde devre dışı.' };
  if (!cmd || !cmd.trim()) return { ok: false };
  try {
    const rec = ensureSshShell(shellId, serverId);
    rec.child.stdin.write(cmd + '\n' + `printf '\\003GALAXY_DONE %s %s\\n' "$?" "$PWD"` + '\n');
    return { ok: true };
  } catch (err) { return { ok: false, error: err.message }; }
});

ipcMain.handle('galaxy:shellStart', (e, { shellId, cwd }) => {
  if (IS_MAS) return { ok: false, error: 'Gömülü terminal App Store sürümünde devre dışı.' };
  if (!cwd || !knownPaths.has(cwd)) return { ok: false, error: 'Geçersiz klasör' };
  try {
    ensureShell(shellId, cwd);
    return { ok: true };
  } catch (err) { return { ok: false, error: err.message }; }
});

ipcMain.handle('galaxy:shellInput', (e, { shellId, cwd, cmd }) => {
  if (IS_MAS) return { ok: false, error: 'Gömülü terminal App Store sürümünde devre dışı.' };
  if (!cmd || !cmd.trim()) return { ok: false };
  if (!cwd || !knownPaths.has(cwd)) return { ok: false, error: 'Geçersiz klasör' };
  const rec = ensureShell(shellId, cwd);
  if (!rec || !rec.child) return { ok: false, error: 'kabuk yok' };
  try {
    rec.child.stdin.write(cmd + '\n' + `printf '\\003GALAXY_DONE %s %s\\n' "$?" "$PWD"` + '\n');
    return { ok: true };
  } catch (err) { return { ok: false, error: err.message }; }
});

// Tab tamamlama: bulunduğu klasöre göre dosya/klasör adı önerileri
ipcMain.handle('galaxy:shellComplete', (e, { shellId, cwd, token }) => {
  try {
    const rec = shells.get(shellId);
    let base = (rec && rec.cwd) || cwd || os.homedir();
    let dirPart = '', namePart = token || '';
    const slash = (token || '').lastIndexOf('/');
    if (slash >= 0) { dirPart = token.slice(0, slash + 1); namePart = token.slice(slash + 1); }
    let dir = dirPart
      ? (dirPart.startsWith('/') ? dirPart : path.resolve(base, dirPart.replace(/^~/, os.homedir())))
      : base;
    const entries = fs.readdirSync(dir, { withFileTypes: true })
      .filter(d => d.name.startsWith(namePart) && (namePart.startsWith('.') || !d.name.startsWith('.')))
      .slice(0, 60)
      .map(d => ({ name: d.name + (d.isDirectory() ? '/' : ''), dir: d.isDirectory() }));
    return { ok: true, dirPart, matches: entries.map(x => x.name) };
  } catch (err) { return { ok: false, matches: [] }; }
});

ipcMain.handle('galaxy:shellStop', (e, shellId) => {
  const rec = shells.get(shellId);
  if (rec) { try { rec.child.kill('SIGKILL'); } catch (err) {} shells.delete(shellId); }
  return true;
});

app.on('before-quit', () => {
  for (const rec of shells.values()) { try { rec.child.kill('SIGKILL'); } catch (e) {} }
});

// Proje konumunda düz bash terminali aç. gh auth için ev dizini de kabul.
ipcMain.handle('galaxy:openTerminal', (e, p) => {
  if (IS_MAS) return false; // sandbox: Terminal'e AppleEvent gönderilemez
  const _termHome = os.homedir();
  if (!p || !(knownPaths.has(p) || p === _termHome)) return false;
  if (process.platform === 'win32') {
    const dir = String(p); const { exec } = require('child_process');
    // Windows Terminal (wt) → yoksa cmd
    exec(`start "" wt -d "${dir}"`, { env: ENV }, err => { if (err) exec(`start "" /D "${dir}" cmd`, { env: ENV }, () => {}); });
    return true;
  }
  if (process.platform === 'linux') {
    const { exec } = require('child_process'); const dir = String(p).replace(/"/g, '\\"');
    exec(`x-terminal-emulator --working-directory="${dir}" || gnome-terminal --working-directory="${dir}" || xterm`, { env: ENV }, () => {});
    return true;
  }
  const cmd = `cd '${String(p).replace(/'/g, "'\\''")}'`;
  const esc = s => s.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
  const app = getSettings(loadData()).terminalApp;   // 'Terminal' | 'iTerm' (ayarlardan)
  // iTerm ve Terminal.app farklı AppleScript API'leri kullanır
  const script = app === 'iTerm'
    ? `tell application "iTerm"
    activate
    try
      tell current window to create tab with default profile
    on error
      create window with default profile
    end try
    tell current session of current window to write text "${esc(cmd)}"
  end tell`
    : `tell application "Terminal"
    activate
    do script "${esc(cmd)}"
  end tell`;
  execFile('osascript', ['-e', script]);
  return true;
});

// ---------- uygulama içi zamanlayıcı ----------
function runClaudeText(prompt, cwd) {
  return new Promise(resolve => {
    if (IS_MAS) return resolve({ error: MAS_BLOCKED });
    let child;
    try {
      child = cliSpawn(claudeBin(), ['-p', prompt, '--output-format', 'json'], { cwd, env: ENV });
    } catch (err) { return resolve({ error: err.message }); }
    let out = '';
    const timer = setTimeout(() => { child.kill('SIGTERM'); resolve({ error: 'zaman aşımı' }); }, 240000);
    child.stdout.on('data', c => { out += c.toString(); });
    child.on('error', err => { clearTimeout(timer); resolve({ error: err.code === 'ENOENT' ? 'claude bulunamadı' : err.message }); });
    child.on('close', () => {
      clearTimeout(timer);
      try {
        const j = JSON.parse(out);
        const text = String((j && (j.result || j.error || j.message)) || '').trim();
        if (j && (j.is_error || j.subtype === 'error' || j.type === 'error')) return resolve({ error: text || 'ajan hatası', text });
        resolve({ text });
      } catch (err) { resolve({ error: 'yanıt çözümlenemedi' }); }
    });
  });
}

const scheduleRunning = new Set();

async function runSchedule(s, notifyWin) {
  if (scheduleRunning.has(s.id)) return { ok: false, error: 'zaten çalışıyor' };
  scheduleRunning.add(s.id);
  try {
    const data = loadData();
    const agent = (data.agents || []).find(a => a.id === s.agentId) || (data.agents || [])[0];
    if (!agent) return { ok: false, error: 'ajan yok' };
    const digest = buildDigest();
    const full = `${agent.prompt}\n\n=== TÜM PROJELERİN GÜNCEL DURUMU ===\n${digest}\n=== SON ===\n\nZamanlanmış görev: ${s.prompt}\n${profileContext(data)} Yanıtını markdown formatında ver.`;
    const res = await runClaudeText(full, universeCwd(data));
    const date = new Date().toISOString().slice(0, 10);
    const rdir = path.join(DATA_DIR, 'reports');
    fs.mkdirSync(rdir, { recursive: true });
    const fname = `${date}-${s.id}.md`;
    const content = res.error
      ? `# ${s.name} — HATA\n\n${res.error}\n`
      : `# ${s.name} · ${date}\n\n_${agent.name} (${agent.role}) tarafından üretildi._\n\n${res.text}\n`;
    fs.writeFileSync(path.join(rdir, fname), content, 'utf8');
    // lastRun güncelle
    const d2 = loadData();
    const s2 = (d2.schedules || []).find(x => x.id === s.id);
    if (s2) { s2.lastRun = new Date().toISOString(); saveData(d2); }
    for (const w of BrowserWindow.getAllWindows()) {
      try { w.webContents.send('schedule:done', { name: s.name, file: fname, error: res.error || null }); } catch (e) {}
    }
    return { ok: !res.error, error: res.error, file: fname, out: res.error ? '' : (res.text || '') };
  } finally {
    scheduleRunning.delete(s.id);
  }
}

function checkSchedules() {
  const data = loadData();
  const now = new Date();
  // Yerel tarih (toISOString UTC verir; yerel saatle karşılaştırmak için yerel gün)
  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  for (const s of data.schedules || []) {
    if (!s.enabled) continue;
    // bugün zaten çalıştıysa geç
    if (s.lastRun && s.lastRun.slice(0, 10) === today) continue;
    // haftalık: form Pzt=1..Paz=7, getDay() Paz=0 → 7'yi 0'a çevir
    if (s.type === 'weekly') {
      const wantDay = (+s.weekday === 7) ? 0 : +s.weekday;
      if (now.getDay() !== wantDay) continue;
    }
    // Planlanan saat geldiyse VEYA geçtiyse çalıştır — uygulama o dakikada kapalıysa
    // açıldığında (o gün, saatten sonra) telafi eder.
    const mins = now.getHours() * 60 + now.getMinutes();
    const want = (Math.min(23, +s.hour || 0)) * 60 + (Math.min(59, +s.minute || 0));
    if (mins < want) continue;
    runSchedule(s);
  }
}
setInterval(checkSchedules, 60000);
// Açılıştan ~8sn sonra bir kez de kontrol et (gün içinde kaçmış görevleri telafi et)
setTimeout(() => { try { checkSchedules(); } catch (e) {} }, 8000);

ipcMain.handle('galaxy:scheduleList', () => loadData().schedules || []);

ipcMain.handle('galaxy:scheduleSave', (e, s) => {
  if (!s.name || !s.prompt) return { ok: false, error: 'Ad ve görev metni gerekli' };
  const data = loadData();
  data.schedules = data.schedules || [];
  if (!s.id) s.id = slugify(s.name) + '-' + String(Date.now()).slice(-4);
  const clean = {
    id: s.id, name: s.name, agentId: s.agentId || ((data.agents || [])[0] || {}).id || 'quality', prompt: s.prompt,
    type: s.type === 'weekly' ? 'weekly' : 'daily',
    hour: Math.min(23, Math.max(0, +s.hour || 9)),
    minute: Math.min(59, Math.max(0, +s.minute || 0)),
    weekday: +s.weekday || 1,
    enabled: s.enabled !== false,
    lastRun: (data.schedules.find(x => x.id === s.id) || {}).lastRun || null
  };
  const idx = data.schedules.findIndex(x => x.id === s.id);
  if (idx >= 0) data.schedules[idx] = clean; else data.schedules.push(clean);
  saveData(data);
  return { ok: true, id: s.id };
});

ipcMain.handle('galaxy:scheduleDelete', (e, id) => {
  const data = loadData();
  data.schedules = (data.schedules || []).filter(x => x.id !== id);
  saveData(data);
  return { ok: true };
});

ipcMain.handle('galaxy:scheduleRun', async (e, id) => {
  const s = (loadData().schedules || []).find(x => x.id === id);
  if (!s) return { ok: false, error: 'görev bulunamadı' };
  return runSchedule(s);
});

g.streamClaude = streamClaude;
g.applyAttachments = applyAttachments;
g.attachmentsDir = attachmentsDir;
g.assistantPersona = assistantPersona;
g.asstChatFile = asstChatFile;
g.asstChatLoad = asstChatLoad;
g.asstChatSave = asstChatSave;
g.sttBin = sttBin;
g.runClaudeJson = runClaudeJson;
g.broadcastShell = broadcastShell;
g.localShellFile = localShellFile;
g.ensureShell = ensureShell;
g.ensureSshShell = ensureSshShell;
g.runClaudeText = runClaudeText;
g.runSchedule = runSchedule;
g.checkSchedules = checkSchedules;
g.runs = runs;
g.claudeSessions = claudeSessions;
g.sttChild = sttChild;
g.shells = shells;
g.SHELL_SENTINEL = SHELL_SENTINEL;
g.scheduleRunning = scheduleRunning;
  }
};
