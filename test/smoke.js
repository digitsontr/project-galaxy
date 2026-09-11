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
    check('workshop-stage', /Bir dosya seç/.test(h) && /Yörünge/.test(h) && !/belgede ara/.test(h), '');
    check('sprint-c-copy', /Evren bağla/.test(h) && /git init/.test(h) && /README.den/.test(h) && /confirmOkLabel/.test(h), '');
    check('sprint-d-twin', /id="ga-root"/.test(h) && /id="ga-panel"/.test(h) && /id="ga-orbwrap"/.test(h), '');
    check('sprint-f-stt', /id="ga-mic"/.test(h) && /id="ga-wake"/.test(h) && /Dinliyor/.test(h) && /Voice On/.test(h) && /STATUS: READY/.test(h), '');
    check('sprint-g-cal', /calDayOpen/.test(h) && /EVENT CREATED/.test(h) && /Kilitle/.test(h), '');
    check('sprint-h-loop', /Döngü/.test(h) && /Tetik/.test(h) && /Bildir/.test(h), '');
    check('sprint-i-posta', /Posta/.test(h) && /mail_send/.test(h) && /Gelen/.test(h) && /Yaz/.test(h) && /mailShowCompose/.test(h), '');
    check('sprint-j-split', fs.existsSync(path.join(ROOT, 'lib', 'config.js')) && fs.existsSync(path.join(ROOT, 'ipc', 'core.js')) && fs.existsSync(path.join(ROOT, 'lib', 'mcp-client.js')), '');
    check('sprint-k-fonts', (h.match(/data:font\/woff2/g) || []).length === 0 && fs.existsSync(path.join(ROOT, 'newui', 'assets', 'fonts')), '');
    check('sprint-e-a11y', /prefers-reduced-motion/.test(h) && /#9aa3c2/.test(h) && /aria-label/.test(h) && /role="banner"/.test(h), '');
    check('agent-edit-form', /value="\{\{ agFormPrompt \}\}"/.test(h) && /agFormRole/.test(h) && /Kişilik/.test(h) && /Tek tık komutlar/.test(h) && !/>\{\{ agFormPrompt \}\}<\/textarea>/.test(h), '');
    check('ux-shell', /planSections/.test(h) && /pvMd/.test(h) && /pvHtml/.test(h) && /mailPickFiles/.test(h) && /Git nedir/.test(h) && /gx-md-doc/.test(h) && /_toggleTree/.test(h) && /--gx-ok/.test(h) && /asstStatusPill/.test(h), '');
    const dbGit = fs.readFileSync(path.join(ROOT, 'ipc', 'db-git.js'), 'utf8');
    const uiSrc = fs.readFileSync(path.join(ROOT, 'newui', 'component.js'), 'utf8');
    check('db-agent-sql-guard', /parseAgentSql/.test(dbGit) && /session limit/.test(dbGit) && /_sqlLooks/.test(uiSrc) && /you've hit/.test(uiSrc), '');
    const onb = fs.readFileSync(path.join(ROOT, 'onboarding.html'), 'utf8');
    check('settings-prefs', /prefs-nav/.test(onb) && /STATUS · KAPTAN/.test(onb) && /id="prefsSave"/.test(onb) && /theme-card/.test(onb) && /Görünüm/.test(onb) && /id="themeApex"/.test(onb) && /id="themeEv"/.test(onb), '');
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
    check('tabs-render', /Özet|Evren|Pano|Daha/i.test(nav), nav.replace(/\n/g, '|').slice(0, 80));
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
    const dockerReply = await js(`(document.getElementById('ga-log').innerText||'').includes('Docker')`);
    check('assistant-command', dockerReply);
    // Evren değiştir: "şirket evrenini aç"
    await js(`(function(){var i=document.getElementById('ga-text');i.value='şirket evrenini aç';i.dispatchEvent(new KeyboardEvent('keydown',{key:'Enter',bubbles:true}));})(); true`);
    await wait(500);
    const uniReply = await js(`(document.getElementById('ga-log').innerText||'').includes('evren')`);
    check('assistant-universe', uniReply);
    const hasMic = await js(`!!document.getElementById('ga-mic') && !!document.getElementById('ga-wake')`);
    check('voice-ui', hasMic);
    // ⌘K tek kapı: eşleşmeyen bir soru yazınca Galaxy'ye düşmeli (asistan log'una eklenmeli)
    await js(`window.dispatchEvent(new KeyboardEvent('keydown',{key:'k',metaKey:true,bubbles:true})); true`);
    await wait(250);
    await js(`(function(){var i=document.getElementById('gx-palette-input');i.value='zzqx bu proje ya da komutla eşleşmez';i.dispatchEvent(new Event('input',{bubbles:true}));})(); true`);
    await wait(150);
    await js(`(function(){var i=document.getElementById('gx-palette-input');i.dispatchEvent(new KeyboardEvent('keydown',{key:'Enter',bubbles:true}));})(); true`);
    await wait(400);
    const paletteAsk = await js(`(document.getElementById('ga-log').innerText||'').includes('zzqx bu proje ya da komutla eşleşmez') && !document.getElementById('gx-palette-input')`);
    check('palette-ask-galaxy', paletteAsk);
    await js(`(function(){ var c=document.getElementById('ga-close'); if(c) c.click(); document.querySelectorAll('button').forEach(function(b){ if((b.innerText||'').trim()==='Evren') b.click(); }); if(document.activeElement&&document.activeElement.blur) document.activeElement.blur(); })(); true`);
    await wait(350);
    const railSel = `(function(){ var n=''; document.querySelectorAll('.gx-rail-row').forEach(function(el){ var st=el.getAttribute('style')||''; if(st.indexOf('var(--gx-accent)')>=0) n=(el.innerText||'').split('\\n')[0].trim(); }); return n; })()`;
    const jkA = await js(railSel);
    await js(`window.dispatchEvent(new KeyboardEvent('keydown',{key:'j',bubbles:true})); true`);
    await wait(250);
    const jkB = await js(railSel);
    check('sprint-e-jk', !!jkA && !!jkB && jkA !== jkB, jkA + ' → ' + jkB);
    await js(`(function(){ var c=document.getElementById('ga-close'); if(c) c.click(); var b=document.querySelector('button[title="ATLAS"]'); if(b) b.click(); })(); true`);
    await wait(400);
    await js(`(function(){ document.querySelectorAll('button').forEach(function(b){ if((b.innerText||'').trim()==='Düzenle') b.click(); }); })(); true`);
    await wait(450);
    const form = await js(`(function(){
      var ta=document.querySelector('textarea');
      var roleEl=document.querySelector('input[placeholder*="standup"]');
      var p1=document.querySelector('input[placeholder*="Standup"]') || document.querySelector('input[placeholder*="Durum"]');
      var txt=ta?(ta.value||ta.textContent||''):'';
      return { txt: txt.slice(0,80), role: roleEl?roleEl.value:'', p1: p1?p1.value:'', obj: /\\[object Object\\]/.test(document.body.innerText||'') };
    })()`);
    check('agent-edit-content', form && /ATLAS/i.test(form.txt||'') && /CTO/i.test(form.role||'') && form.p1 && !form.obj, JSON.stringify(form));
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
