// Regresyon smoke-test — Project Galaxy arayüzünü headless boot eder ve temel akışları doğrular.
// Çalıştır:  env -u ELECTRON_RUN_AS_NODE node_modules/.bin/electron test/smoke.js
// Çıkış kodu: 0 = tüm testler geçti, 1 = en az bir test başarısız (paketlemeyi durdurur).
const { app, BrowserWindow } = require('electron');
const path = require('path');
const fs = require('fs');

app.commandLine.appendSwitch('use-gl', 'angle');
app.commandLine.appendSwitch('use-angle', 'swiftshader');
app.commandLine.appendSwitch('enable-unsafe-swiftshader');

const ROOT = path.join(__dirname, '..');
const INDEX = path.join(ROOT, 'newui', 'index.html');
const PRELOAD = path.join(__dirname, 'mock-preload.js');
const wait = ms => new Promise(r => setTimeout(r, ms));

const results = [];
const check = (name, ok, detail) => { results.push({ name, ok: !!ok, detail: detail || '' }); };

function staticChecks() {
  // Tag dengesi — sc-for / sc-if açılış/kapanış eşit mi
  try {
    const h = fs.readFileSync(INDEX, 'utf8');
    for (const tag of ['sc-for', 'sc-if']) {
      const o = (h.match(new RegExp('<' + tag + '[ >]', 'g')) || []).length;
      const c = (h.match(new RegExp('</' + tag + '>', 'g')) || []).length;
      check('tag-balance:' + tag, o === c, o + '/' + c);
    }
    check('index-nonempty', h.length > 50000, h.length + ' bytes');
  } catch (e) { check('static-read', false, e.message); }
}

app.whenReady().then(async () => {
  staticChecks();
  let win, consoleErr = 0;
  try {
    win = new BrowserWindow({ width: 1400, height: 900, show: false, webPreferences: { preload: PRELOAD, contextIsolation: true, nodeIntegration: false, sandbox: false } });
    win.webContents.on('console-message', (e, level) => { if (level >= 3) consoleErr++; });
    await win.loadFile(INDEX);
    await wait(4500);
  } catch (e) { check('boot', false, e.message); return finish(); }

  const js = c => win.webContents.executeJavaScript(c);
  try {
    check('boot', true);
    check('no-console-errors', consoleErr === 0, consoleErr + ' hata');
    // Sekmeler render
    const nav = await js(`(document.querySelector('nav')||{}).innerText||''`);
    check('tabs-render', /GENEL BAK|EVREN|DOCKER|SUNUCU/i.test(nav), nav.replace(/\n/g, '|').slice(0, 60));
    // Sol proje listesi (railItems)
    const rail = await js(`document.body.innerText.includes('PROJELER')`);
    check('project-list', rail);
    // Asistan orbu var
    const orb = await js(`!!document.getElementById('ga-orbwrap')`);
    check('assistant-orb', orb);
    // Asistan açılıyor + karşılama
    await js(`document.getElementById('ga-orbwrap').click(); true`); await wait(400);
    const greet = await js(`(document.getElementById('ga-log').innerText||'').includes('dijital ikizin')`);
    check('assistant-open', greet);
    // Yazışma + komut yönlendirme: "docker aç" → Docker sekmesi
    await js(`(function(){var i=document.getElementById('ga-text');i.value='docker aç';i.dispatchEvent(new KeyboardEvent('keydown',{key:'Enter',bubbles:true}));})(); true`);
    await wait(700);
    const dockerReply = await js(`(document.getElementById('ga-log').lastChild.innerText||'').includes('Docker')`);
    check('assistant-command', dockerReply);
    // Evren değiştir: "şirket evrenini aç"
    await js(`(function(){var i=document.getElementById('ga-text');i.value='şirket evrenini aç';i.dispatchEvent(new KeyboardEvent('keydown',{key:'Enter',bubbles:true}));})(); true`);
    await wait(500);
    const uniReply = await js(`(document.getElementById('ga-log').lastChild.innerText||'').includes('evren')`);
    check('assistant-universe', uniReply);
    // Mic/voice kapalı olmalı (yazışma modu)
    const noMic = await js(`!document.getElementById('ga-mic') && !document.getElementById('ga-wake')`);
    check('voice-disabled', noMic);
  } catch (e) { check('runtime', false, e.message); }
  finish();

  function finish() {
    const failed = results.filter(r => !r.ok);
    console.log('\n=== SMOKE TEST ===');
    for (const r of results) console.log((r.ok ? '✓' : '✗') + ' ' + r.name + (r.detail ? '  (' + r.detail + ')' : ''));
    console.log('---');
    console.log(results.length - failed.length + '/' + results.length + ' geçti' + (failed.length ? ' — BAŞARISIZ: ' + failed.map(f => f.name).join(', ') : ''));
    app.exit(failed.length ? 1 : 0);
  }
}).catch(e => { console.error('SMOKE ERR', e && e.message); app.exit(1); });
