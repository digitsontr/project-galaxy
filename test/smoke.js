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
    check('sprint-d-twin', /id="ga-root"/.test(h) && /id="ga-panel"/.test(h) && /id="ga-open"/.test(h) && /dijital ikizin/.test(h) && !/id="ga-orbwrap"/.test(h), '');
    check('sprint-f-stt', /id="ga-mic"/.test(h) && /id="ga-wake"/.test(h) && /id="ga-open"/.test(h) && /Dinliyor/.test(h) && /Voice On/.test(h) && /STATUS: READY/.test(h) && /ga-hud-frame/.test(h) && /SYSTEM ONLINE/.test(h), '');
    check('sprint-h-loop', /Döngü/.test(h) && /Tetik/.test(h) && /Bildir/.test(h), '');
    check('sprint-i-posta', /Posta/.test(h) && /mail_send/.test(h) && /mailShowCompose/.test(h) && /Gönder/.test(h) && /openMailSettings/.test(h), '');
    check('sprint-j-split', fs.existsSync(path.join(ROOT, 'lib', 'config.js')) && fs.existsSync(path.join(ROOT, 'ipc', 'core.js')) && fs.existsSync(path.join(ROOT, 'lib', 'mcp-client.js')), '');
    check('sprint-k-fonts', (h.match(/data:font\/woff2/g) || []).length === 0 && fs.existsSync(path.join(ROOT, 'newui', 'assets', 'fonts')), '');
    check('sprint-e-a11y', /prefers-reduced-motion/.test(h) && /#9aa3c2/.test(h) && /aria-label/.test(h) && /role="banner"/.test(h), '');
    check('agent-edit-form', /value="\{\{ agFormPrompt \}\}"/.test(h) && /agFormRole/.test(h) && /Kişilik/.test(h) && /Tek tık komutlar/.test(h) && !/>\{\{ agFormPrompt \}\}<\/textarea>/.test(h), '');
    check('ux-shell', /planSections/.test(h) && /pvMd/.test(h) && /pvHtml/.test(h) && /mailPickFiles/.test(h) && /Git nedir/.test(h) && /gx-md-doc/.test(h) && /_toggleTree/.test(h) && /--gx-ok/.test(h) && /asstStatusPill/.test(h) && /grid-area:dock/.test(h) && /toggleHud/.test(h), '');
    const dbGit = fs.readFileSync(path.join(ROOT, 'ipc', 'db-git.js'), 'utf8');
    const uiSrc = fs.readdirSync(path.join(ROOT, 'newui', 'parts')).filter(f => f.endsWith('.js')).sort().map(f => fs.readFileSync(path.join(ROOT, 'newui', 'parts', f), 'utf8')).join('');
    check('no-calendar', !/calDayOpen/.test(h) && !/EVENT CREATED/.test(h) && !/\bcalList\b/.test(uiSrc) && !/calMonthOffset/.test(uiSrc) && !/mini takvim/i.test(h), '');
    check('db-agent-sql-guard', /parseAgentSql/.test(dbGit) && /session limit/.test(dbGit) && /_sqlLooks/.test(uiSrc) && /you've hit/.test(uiSrc), '');
    check('mssql-support', /setDbTypeMs/.test(h) && /SQL Server/.test(h) && /dbIsMssql/.test(h) && /cfg\.type === 'mssql'/.test(dbGit) && /sys\.foreign_key_columns/.test(dbGit) && /mssql: 1433/.test(dbGit), 'SQL Server tipi: form + sürücü dalı + FK kaynağı');
    check('daily-desk', /resumeSession/.test(h) && /Kaldığın yerden devam/.test(h) && /openInEditor/.test(h) && /Editörde Aç/.test(h) && /gxSession/.test(uiSrc), '');
    check('sade-chrome', />KAPTAN</.test(h) && !/Nerede kaldın/.test(h) && !/ctxJumps/.test(h) && !/Daha ▾/.test(h) && /gx-subnav/.test(h) && /id="gx-notif-btn"/.test(h) && /_navGroups/.test(uiSrc) && /closeHistory/.test(h) && /_chromeMove/.test(uiSrc) && /_rememberSurface/.test(uiSrc) && /showPlanetIdent/.test(h), 'tek menü + alt sekmeler + bildirim zili; sağ kısayol paneli ve Daha menüsü yok');
    const ptySrc = fs.readFileSync(path.join(ROOT, 'ipc', 'devtools.js'), 'utf8');
    check('calm-ui', /filtrele veya Enter ile içerikte ara/.test(h) && !/placeholder="içerikte ara/.test(h) && !/Git Merkezi<\/button>/.test(h) && /pty-host\.py/.test(ptySrc) && /spawnPtyChild/.test(ptySrc) && fs.existsSync(path.join(ROOT, 'ipc', 'pty-host.py')) && /box-shadow:none!important/.test(h), 'tek ağaç araması + tek Git + sakin yüzey + gerçek PTY');
    const onb = fs.readFileSync(path.join(ROOT, 'onboarding.html'), 'utf8');
    check('settings-prefs', /prefs-nav/.test(onb) && /STATUS · KAPTAN/.test(onb) && /id="prefsSave"/.test(onb) && /Asistan/.test(onb) && /id="testClaude"/.test(onb) && /id="testMcp"/.test(onb) && !/id="themeApex"/.test(onb) && !/id="themeEv"/.test(onb), '');
    check('onboard-connections', /connGrid/.test(onb) && /cClaudeT/.test(onb) && /gh auth login/.test(onb) && /GMAIL_CLIENT_ID/.test(onb) && /step < 5/.test(onb) && /\/6/.test(onb), '');
    check('inline-howto', /gx-howto/.test(h) && /gx-setup/.test(h) && /setupItems/.test(h) && /openMailSettings/.test(h) && /Nasıl bağlanır/.test(h) && /Posta nasıl bağlanır/.test(h), '');
    const mainSrc = fs.readFileSync(path.join(ROOT, 'main.js'), 'utf8');
    const cfgSrc = fs.readFileSync(path.join(ROOT, 'lib', 'config.js'), 'utf8');
    check('fullscreen-window', /fullscreenable:\s*true/.test(mainSrc) && /getNormalBounds/.test(mainSrc) && /galaxy:esc/.test(mainSrc) && /windowChrome\(\)/.test(mainSrc) && /titleBarStyle:\s*'hiddenInset'/.test(cfgSrc) && /titleBarOverlay/.test(cfgSrc) && /html\.gx-fs/.test(h) && /data-platform="win32"/.test(h), '');
    check('sprint-l-health', /Sistem sağlığı/.test(h) && /healthItems/.test(h) && /galaxy:githubCheck/.test(fs.readFileSync(path.join(ROOT, 'lib', 'data.js'), 'utf8')), '');
    check('no-egitim-tab', !/Eğitimlerim/.test(h) && !/id="tr-reader"/.test(h), '');
    check('no-calculator', !/hesap makinesi/i.test(h) && !/takvim · hesap/.test(h) && !/\bcalcKeys\b/.test(uiSrc) && !/gx-calc/.test(h), '');
    check('no-second-agent-chat', !/id="ghud-agent-scroll"/.test(h) && /_openAsstVoice/.test(uiSrc), '');
    // Gerçek ama boş evren listesinde sahte demo evrenler (İş Evreni/Papilon/Arşiv) ASLA gösterilmemeli.
    check('no-fake-universes-in-real-mode', /\(demoData \? \[\{name:'İş Evreni'/.test(h), '');
    check('wake-kaptan', /_asstWakePat/.test(uiSrc) && /kaptan\|kapten\|captain/.test(uiSrc) && /aria-label="Kaptan"/.test(h) && /id="ga-wake"/.test(h), '');
    check('polish-first60', /first60Open/.test(h) && /gx-first60/.test(h) && /Evren bağla/.test(h), '');
    check('polish-err-banner', /errBannerOpen/.test(h) && /_friendlyFail/.test(uiSrc) && /_errAction/.test(uiSrc), '');
    check('polish-quick-chips', /ga-quick/.test(h) && /asstQuickCmds/.test(uiSrc) && /gitSuggestMsg/.test(uiSrc) && /_suggestCommitMsg/.test(uiSrc), '');
    check('polish-refresh-app', fs.existsSync(path.join(ROOT, 'scripts', 'refresh-app.sh')) && /refresh-app/.test(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8')), '');
    const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8'));
    const win = (pkg.build && pkg.build.win) || {};
    const nsis = (pkg.build && pkg.build.nsis) || {};
    check('windows-nsis', Array.isArray(win.target) && win.target.some(t => (t.target || t) === 'nsis') && nsis.shortcutName === 'Project Galaxy', JSON.stringify(win.target));
    check('docs-privacy-windows', fs.existsSync(path.join(ROOT, 'docs', 'PRIVACY.md')) && fs.existsSync(path.join(ROOT, 'docs', 'WINDOWS.md')), '');
    check('faz2-backend', /grepReplacePreview/.test(fs.readFileSync(path.join(ROOT, 'ipc', 'devtools.js'), 'utf8')) && /testDiscover/.test(fs.readFileSync(path.join(ROOT, 'preload.js'), 'utf8')) && /gitFileHistory/.test(fs.readFileSync(path.join(ROOT, 'ipc', 'devtools.js'), 'utf8')) && /jobStart/.test(fs.readFileSync(path.join(ROOT, 'ipc', 'devtools.js'), 'utf8')) && /Geliştir/.test(h) && /Sembol haritası/.test(h) && /Test Gezgini/.test(h), '');
    check('faz4-backend', fs.existsSync(path.join(ROOT, 'ipc', 'agent-engine.js')) && /galaxy:agentSend/.test(fs.readFileSync(path.join(ROOT, 'ipc', 'agent-engine.js'), 'utf8')) && /galaxy:dbgStart/.test(fs.readFileSync(path.join(ROOT, 'ipc', 'devtools.js'), 'utf8')) && /galaxy:agentSend/.test(fs.readFileSync(path.join(ROOT, 'preload.js'), 'utf8')) && /Yerleşik Ajan/.test(h) && /gx-bp-gutter/.test(h) && /Çakışma çöz/.test(h) && /Hızlı düzeltmeler/.test(h), '');
    const devtoolsSrc = fs.readFileSync(path.join(ROOT, 'ipc', 'devtools.js'), 'utf8');
    check('faz3-backend', fs.existsSync(path.join(ROOT, 'ipc', 'lang-worker.js')) && /galaxy:langRequest/.test(devtoolsSrc) && /galaxy:formatFile/.test(devtoolsSrc) && /galaxy:ghPrList/.test(devtoolsSrc) && /galaxy:gitStashPush/.test(devtoolsSrc) && /galaxy:debugStart/.test(devtoolsSrc) && /langRequest/.test(fs.readFileSync(path.join(ROOT, 'preload.js'), 'utf8')) && /ÇALIŞTIR/.test(h.toLocaleUpperCase('tr-TR')) && /GitHub · PR/.test(h) && /Yeniden adlandır \(LSP\)/.test(h) && /gx-diag-err/.test(h), '');
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
    // İzolasyon: önceki koşudan kalan oturum/pixel durumu testi kirletmesin
    await win.webContents.executeJavaScript(`localStorage.removeItem('gxSession'); localStorage.removeItem('gxPixelOffice'); true`);
    await win.reload();
    await wait(3500);
  } catch (e) { check('boot', false, e.message); return finish(); }

  const js = c => win.webContents.executeJavaScript(c);
  const shot = async name => { const dir = process.env.GX_SHOTS; if (!dir) return; try { fs.mkdirSync(dir, { recursive: true }); fs.writeFileSync(path.join(dir, name + '.png'), (await win.webContents.capturePage()).toPNG()); } catch (e) {} };
  try {
    check('boot', true);
    check('no-console-errors', consoleErr === 0, consoleErr + ' hata');
    // Sekmeler render
    const nav = await js(`(document.querySelector('nav.gx-tabs')||{}).innerText||''`);
    check('tabs-render', /Ana Sayfa[\s\S]*Görevler[\s\S]*Ajanlar[\s\S]*Otomasyonlar[\s\S]*Servisler/.test(nav) && !/Daha|Zamanlayıcı|Döngü/.test(nav), nav.replace(/\n/g, '|').slice(0, 80));
    const goNav = (top, sub) => js(`(function(){
      var n=document.querySelector('nav.gx-tabs'); var b=n?[].slice.call(n.querySelectorAll('button')).find(function(x){ return (x.innerText||'').trim()===${JSON.stringify(top)}; }):null; if(b) b.click();
      return new Promise(function(res){ setTimeout(function(){
        var s=document.querySelector('nav.gx-subnav'); var c=(s&&${JSON.stringify(sub || '')})?[].slice.call(s.querySelectorAll('button')).find(function(x){ return (x.innerText||'').trim()===${JSON.stringify(sub || '')}; }):null; if(c) c.click();
        setTimeout(function(){ res(!!b && (!${JSON.stringify(sub || '')} || !!c)); }, 400);
      }, 250); });
    })()`);
    // Sol proje listesi (railItems)
    const rail = await js(`document.body.innerText.includes('PROJELER')`);
    check('project-list', rail);
    const twinBtn = await js(`(function(){ var b=document.getElementById('ga-open'); return !!b && /dijital ikizin/.test(b.title||'') && !document.getElementById('ga-orbwrap'); })()`);
    check('assistant-twin-button', twinBtn, 'üst barda tek Kaptan düğmesi, yüzen küre yok');
    // Asistan açılıyor + karşılama — sağ şerit kapalıyken orb görünmez; üst çubuktaki Asistan düğmesi her zaman var.
    // Panel visibility:hidden iken innerText boş kalır; textContent + mesaj tamponu esas alınır.
    await js(`(function(){ var b=document.getElementById('ga-open')||document.querySelector('button[aria-label="Asistan"]')||document.getElementById('ga-orbwrap'); if(b) b.click(); })(); true`);
    await wait(900);
    const greet = await js(`(function(){
      var log=document.getElementById('ga-log');
      var t=(log&&(log.textContent||log.innerText)||'');
      var msgs=((window.__ga&&window.__ga.msgs)||[]).map(function(m){return m.text||'';}).join(' ');
      return /dijital ikizin/.test(t+' '+msgs);
    })()`);
    check('assistant-open', greet);
    // Yazışma + komut yönlendirme: "docker aç" → Docker sekmesi
    await js(`(function(){var i=document.getElementById('ga-text');i.value='docker aç';i.dispatchEvent(new KeyboardEvent('keydown',{key:'Enter',bubbles:true}));})(); true`);
    await wait(700);
    const dockerReply = await js(`/Docker|Konteyner/.test(document.getElementById('ga-log').innerText||'')`);
    check('assistant-command', dockerReply);
    // Evren değiştir: "şirket evrenini aç"
    await js(`(function(){var i=document.getElementById('ga-text');i.value='şirket evrenini aç';i.dispatchEvent(new KeyboardEvent('keydown',{key:'Enter',bubbles:true}));})(); true`);
    await wait(500);
    const uniReply = await js(`(document.getElementById('ga-log').innerText||'').includes('evren')`);
    check('assistant-universe', uniReply);
    const hasMic = await js(`!!document.getElementById('ga-mic') && !!document.getElementById('ga-wake')`);
    check('voice-ui', hasMic);
    const health = await js(`[].slice.call(document.querySelectorAll('[aria-label="Sistem sağlığı"] [title]')).map(function(s){return s.getAttribute('title');})`);
    check('health-strip', Array.isArray(health) && health.length===4 && /Claude CLI/.test(health[0]) && /GitHub/.test(health[1]) && /SSH/.test(health[2]) && /Ses tanıma/.test(health[3]), health.join(' | '));
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
    // Aktivite şeridi: gezegene gir → OPEN_PLANET kaydı düşmeli → Geri al uzaya döndürmeli
    await js(`(function(){ var b=document.querySelector('main button[title*="çift tık"]'); if(b) b.dispatchEvent(new MouseEvent('dblclick',{bubbles:true})); })(); true`);
    await wait(500);
    await js(`window.dispatchEvent(new KeyboardEvent('keydown',{key:'k',metaKey:true,bubbles:true})); true`);
    await wait(250);
    await js(`(function(){var i=document.getElementById('gx-palette-input');i.value='Aktivite';i.dispatchEvent(new Event('input',{bubbles:true}));})(); true`);
    await wait(150);
    await js(`(function(){var i=document.getElementById('gx-palette-input');i.dispatchEvent(new KeyboardEvent('keydown',{key:'Enter',bubbles:true}));})(); true`);
    await wait(300);
    const actEntry = await js(`(document.body.innerText||'').includes('GEZEGEN') && (document.body.innerText||'').includes('Geri al')`);
    check('activity-log', actEntry);
    await js(`(function(){ document.querySelectorAll('button').forEach(function(b){ if((b.innerText||'').trim()==='↺ Geri al') b.click(); }); })(); true`);
    await wait(600);
    const backToSpace = await js(`(document.body.innerText||'').includes('PROJELER')`);
    check('activity-undo', backToSpace);
    // Ajan nabzı: ATLAS Kaptan sesi olur, #ga-text'e yazınca "son koşu" tooltip'e düşmeli
    await js(`(function(){ var b=[].slice.call(document.querySelectorAll('button')).find(function(x){return (x.title||'').indexOf('ATLAS')===0;}); if(b) b.click(); })(); true`);
    await wait(300);
    await js(`(function(){var i=document.getElementById('ga-text'); if(i){ i.value='durum ver'; i.dispatchEvent(new Event('input',{bubbles:true})); i.dispatchEvent(new KeyboardEvent('keydown',{key:'Enter',bubbles:true})); } })(); true`);
    await wait(900);
    const pulseTitle = await js(`(function(){ var b=[].slice.call(document.querySelectorAll('button')).find(function(x){return (x.title||'').indexOf('ATLAS')===0;}); return b?b.title:''; })()`);
    check('agent-pulse', /son koşu|çalışıyor/.test(pulseTitle), pulseTitle);
    await js(`(function(){ var c=document.getElementById('ga-close'); if(c) c.click(); var b=[].slice.call(document.querySelectorAll('button')).find(function(x){return (x.title||'').indexOf('ATLAS')===0;}); if(b) b.click(); })(); true`);
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
    // UI temizliği: Zamanlayıcı gerçek görev adını/saatini göstermeli (önceden hep "görev" + ham cron alanı düşüyordu)
    const toSched = await goNav('Otomasyonlar', 'Zamanlanmış işler');
    const schedText = await js(`document.body.innerText||''`);
    check('sched-real-name', toSched && /Nightly/.test(schedText) && /Her gün 02:00/.test(schedText) && !/^görev$/m.test(schedText), schedText.split('\n').filter(function(){return true;}).slice(0,1).join(''));
    await goNav('Ana Sayfa', 'Bugün');
    const ozetText = await js(`document.body.innerText||''`);
    check('mail-on-ozet', /Posta/.test(ozetText) && /posta MCP|Posta \(MCP\)|Ayarlar → Posta|Posta nasıl bağlanır/i.test(ozetText), '');
    await goNav('Otomasyonlar');
    const subText = await js(`(document.querySelector('nav.gx-subnav')||{}).innerText||''`);
    check('no-egitim-menu', !/Eğitimlerim/.test(subText) && /Zamanlanmış işler/.test(subText) && /Proje taraması/.test(subText) && /E-posta/.test(subText), subText.replace(/\n/g, '|'));
    await goNav('Servisler');
    const svcText = await js(`(document.querySelector('nav.gx-subnav')||{}).innerText||''`);
    check('nav-services-sub', /Veritabanları[\s\S]*Konteynerler[\s\S]*SSH sunucuları/.test(svcText), svcText.replace(/\n/g, '|'));
    // Ajanlar: sol etkinlik barından açılır; varsayılan ajan açılmaz.
    await js(`localStorage.removeItem('gxPixelOffice'); location.reload(); true`);
    await wait(2500);
    await js(`(function(){ var b=[].slice.call(document.querySelectorAll('.gx-actbar button, nav[aria-label] button')).find(function(x){ return /^Ajanlar/.test(x.title||''); }); if(b) b.click(); })(); true`);
    await wait(600);
    const pxOk = await js(`(function(){
      var cv = document.getElementById('gxPixelCanvasMain');
      var txt = document.body.innerText||'';
      var topHasPixel = !![].slice.call(document.querySelectorAll('header button, .gx-term button')).find(function(b){ return /PIXEL AGENTS/i.test(b.innerText||''); });
      return !!(cv && cv.width > 300 && /PIXEL AGENTS/.test(txt) && /Koltuk Modu/.test(txt) && /henüz çalışan bir ajan yok/.test(txt) && !topHasPixel);
    })()`);
    check('pixel-agents-office', pxOk, 'sol bar + boş ofis + canvas');
    // Kullanıcı şablondan ajan açar → duraklatır → siler (onay kartıyla)
    await js(`(function(){ var b=[].slice.call(document.querySelectorAll('button')).find(function(x){ return /Yeni Ajan Oluştur/.test(x.innerText||''); }); if(b) b.click(); })(); true`);
    await wait(350);
    await js(`(function(){ var b=[].slice.call(document.querySelectorAll('button')).find(function(x){ return /NAVIGATOR/.test(x.innerText||''); }); if(b) b.click(); })(); true`);
    await wait(250);
    await js(`(function(){ var inp=document.querySelector('input[placeholder*="İlk görevi"]'); if(inp){ inp.focus(); } var b=[].slice.call(document.querySelectorAll('button')).find(function(x){ return /Ofise Yerleştir/.test(x.innerText||''); }); if(b) b.click(); })(); true`);
    await wait(600);
    const pxCreated = await js(`/NAVIGATOR/.test(document.body.innerText||'') && /Masa #/.test(document.body.innerText||'')`);
    check('pixel-agent-create', pxCreated, 'şablondan ajan');
    await js(`(function(){ var b=[].slice.call(document.querySelectorAll('button')).find(function(x){ return /Duraklat/.test(x.innerText||''); }); if(b) b.click(); })(); true`);
    await wait(350);
    const pxPaused = await js(`/DURAKLATILDI|duraklatıldı/.test(document.body.innerText||'')`);
    check('pixel-agent-pause', pxPaused, 'duraklat');
    await js(`(function(){ var bs=[].slice.call(document.querySelectorAll('button')).filter(function(x){ return /🗑/.test(x.innerText||''); }); if(bs.length) bs[0].click(); })(); true`);
    await wait(350);
    await js(`(function(){ var b=[].slice.call(document.querySelectorAll('button')).find(function(x){ return (x.innerText||'').trim()==='Sil'; }); if(b) b.click(); })(); true`);
    await wait(500);
    const pxDeleted = await js(`/henüz çalışan bir ajan yok/.test(document.body.innerText||'')`);
    check('pixel-agent-delete', pxDeleted, 'sil → boş ofis');
    // Proje çalışma alanı: gezegene gir → kimlik çubuğu + proje evi
    await goNav('Ana Sayfa', 'Projeler');
    await js(`(function(){ var b=document.querySelector('main button[title*="çift tık"]'); if(b) b.dispatchEvent(new MouseEvent('dblclick',{bubbles:true})); })(); true`);
    await wait(700);
    const wsHome = await js(`(function(){ var t=document.body.innerText||''; return /AlphaAPI/.test(t) && /Kaldığın yerden|Bir dosya seç/.test(t) && /dosya/.test(t) && !!document.querySelector('input[placeholder*="filtrele"]'); })()`);
    check('workspace-home', wsHome, 'kimlik + filtre + proje evi');
    // Dosya aç: ağaçtan README → sekme + breadcrumb + okuyucu
    await js(`(function(){ var r=[].slice.call(document.querySelectorAll('.gx-tree-row')).find(function(x){ return /README\\.md/.test(x.innerText||''); }); if(r){ var lb=r.querySelector('[data-noi18n]'); (lb||r).click(); } })(); true`);
    await wait(600);
    const wsRead = await js(`(function(){ var t=document.body.innerText||''; return /README\\.md/.test(t) && /Markdown/.test(t) && /satır/.test(t) && !!document.querySelector('.gx-md-doc'); })()`);
    check('workspace-read', wsRead, 'sekme + markdown okuyucu');
    // Düzenle → kirli işareti → ⌘S kaydet → "Son kayıt"
    await js(`(function(){ var b=[].slice.call(document.querySelectorAll('button')).find(function(x){ return /Düzenle/.test(x.innerText||''); }); if(b) b.click(); })(); true`);
    await wait(350);
    await js(`(function(){ var ta=document.querySelector('textarea'); if(ta){ ta.focus(); ta.value=ta.value+'\\n<!-- smoke -->'; ta.dispatchEvent(new Event('input',{bubbles:true})); } })(); true`);
    await wait(350);
    const wsDirty = await js(`/kaydedilmedi/.test(document.body.innerText||'')`);
    check('workspace-dirty', wsDirty, 'kirli işareti');
    await js(`window.dispatchEvent(new KeyboardEvent('keydown',{key:'s',metaKey:true,bubbles:true,cancelable:true})); true`);
    await wait(600);
    const wsSaved = await js(`/Son kayıt/.test(document.body.innerText||'')`);
    check('workspace-save', wsSaved, '⌘S kayıt onayı');
    // Filtreyle kod dosyası aç → satır numaralı kod + dosyada bul
    await js(`(function(){ var i=document.querySelector('input[placeholder*="filtrele"]'); if(i){ i.focus(); i.value='index'; i.dispatchEvent(new Event('input',{bubbles:true})); } })(); true`);
    await wait(400);
    await js(`(function(){ var r=[].slice.call(document.querySelectorAll('.gx-tree-row')).find(function(x){ return /index\\.js/.test(x.innerText||''); }); if(r){ var lb=r.querySelector('[data-noi18n]'); (lb||r).click(); } })(); true`);
    await wait(600);
    const wsCode = await js(`!!document.querySelector('[data-pv-line="1"]') && /Kod/.test(document.body.innerText||'')`);
    check('workspace-code', wsCode, 'satır numaralı kod görünümü');
    await js(`(function(){ var i=document.querySelector('input[placeholder*="dosyada bul"]'); if(i){ i.focus(); i.value='express'; i.dispatchEvent(new Event('input',{bubbles:true})); i.dispatchEvent(new KeyboardEvent('keydown',{key:'Enter',bubbles:true})); } })(); true`);
    await wait(400);
    const wsFind = await js(`/eşleşme/.test(document.body.innerText||'')`);
    check('workspace-find', wsFind, 'dosyada bul sayacı');
    // DevTools 1: gerçek terminal sekmesi (xterm) monte olur
    await js(`(function(){ var b=[].slice.call(document.querySelectorAll('button')).find(function(x){ return /TERMİNAL/.test(x.innerText||''); }); if(b) b.click(); })(); true`);
    await wait(900);
    const ptyOk = await js(`(function(){ return !!document.getElementById('gx-xterm') && !!document.querySelector('#gx-xterm .xterm'); })()`);
    check('devtools-pty', ptyOk, 'xterm monte');
    // DevTools 2: ⌘P dosya paleti açılır, Enter dosyayı açar ve paleti kapatır
    await js(`window.dispatchEvent(new KeyboardEvent('keydown',{key:'p',metaKey:true,bubbles:true,cancelable:true})); true`);
    await wait(400);
    const palOpen = await js(`!!document.getElementById('gx-filepal-input')`);
    check('devtools-filepal-open', palOpen, '⌘P paleti');
    await js(`(function(){ var i=document.getElementById('gx-filepal-input'); if(i){ i.focus(); i.value='index'; i.dispatchEvent(new Event('input',{bubbles:true})); } })(); true`);
    await wait(300);
    await js(`(function(){ var i=document.getElementById('gx-filepal-input'); if(i) i.dispatchEvent(new KeyboardEvent('keydown',{key:'Enter',bubbles:true,cancelable:true})); })(); true`);
    await wait(700);
    const palGo = await js(`(function(){ return !document.getElementById('gx-filepal-input') && !!document.querySelector('[data-pv-line="1"]'); })()`);
    check('devtools-filepal-open-file', palGo, 'Enter → dosya açılır');
    // DevTools 3: Düzenle'de CodeMirror çekirdeği devreye girer
    await js(`(function(){ var b=[].slice.call(document.querySelectorAll('button')).find(function(x){ return /Düzenle/.test(x.innerText||''); }); if(b) b.click(); })(); true`);
    await wait(900);
    const cmOk = await js(`!!document.querySelector('.CodeMirror') && !!document.querySelector('.CodeMirror-gutters')`);
    check('devtools-codemirror', cmOk, 'CM çekirdeği + satır no');
    await js(`(function(){ var b=[].slice.call(document.querySelectorAll('button')).find(function(x){ return /İptal/.test(x.innerText||''); }); if(b) b.click(); })(); true`);
    await wait(300);
    // DevTools 4: Tanıla → sorun listesi dolar ve satır tıklanabilir
    await js(`(function(){ var b=[].slice.call(document.querySelectorAll('button')).find(function(x){ return /Tanıla/.test(x.innerText||''); }); if(b) b.click(); })(); true`);
    await wait(900);
    const diagOk = await js(`(function(){ var t=document.body.innerText||''; return /src\\/index\\.js/.test(t) && /mock diag/.test(t); })()`);
    check('devtools-diag', diagOk, 'tsc/eslint sorun listesi');
    // DevTools 5: hunk parse + ajan onay vals'ları çökmeden render olur (durumsuz yollar)
    const dtVals = await js(`(function(){ return /Tanıla|Tanıla…/.test(document.body.innerText||''); })()`);
    check('devtools-problems-strip', dtVals, 'sorun şeridi');
    // ---- FAZ 2 ----
    // Sembol haritası açılır
    await js(`(function(){ var b=[].slice.call(document.querySelectorAll('button')).find(function(x){ return /Semboller/.test(x.innerText||''); }); if(b) b.click(); })(); true`);
    await wait(400);
    const symOk = await js(`(document.body.innerText||'').toLocaleUpperCase('tr-TR').includes('SEMBOL HARİTASI')`);
    check('faz2-symbols', symOk, 'sembol paneli');
    await js(`(function(){ var b=[].slice.call(document.querySelectorAll('button')).find(function(x){ return /Semboller/.test(x.innerText||''); }); if(b) b.click(); })(); true`);
    await wait(200);
    // Geçmiş paneli (mock commit)
    await js(`(function(){ var b=[].slice.call(document.querySelectorAll('button')).find(function(x){ return /Geçmiş/.test(x.innerText||''); }); if(b) b.click(); })(); true`);
    await wait(700);
    const histOk = await js(`(document.body.innerText||'').includes('health endpoint')`);
    check('faz2-history', histOk, 'zaman çizelgesi + blame');
    // Bölünmüş terminal
    await js(`(function(){ var b=[].slice.call(document.querySelectorAll('button')).find(function(x){ return (x.title||'').includes('Terminali böl'); }); if(b) b.click(); })(); true`);
    await wait(500);
    const splitTermOk = await js(`(document.body.innerText||'').toLocaleUpperCase('tr-TR').includes('İKİNCİ OTURUM')`);
    check('faz2-split-term', splitTermOk, 'bash-2');
    // Bölünmüş editör: sekmedeki ◧
    await js(`(function(){ var b=[].slice.call(document.querySelectorAll('button')).find(function(x){ return (x.title||'').includes('Yan panelde'); }); if(b) b.click(); })(); true`);
    await wait(700);
    const splitEdOk = await js(`(document.body.innerText||'').toLocaleUpperCase('tr-TR').includes('YAN PANEL')`);
    check('faz2-split-editor', splitEdOk, 'yan panel');
    // Bildirim merkezi
    await js(`(function(){ var b=[].slice.call(document.querySelectorAll('button')).find(function(x){ return /🔔/.test(x.innerText||''); }); if(b) b.click(); })(); true`);
    await wait(400);
    const notifOk = await js(`(document.body.innerText||'').toLocaleUpperCase('tr-TR').includes('BİLDİRİMLER') && !!document.querySelector('input[placeholder*="Arka planda çalıştır"]')`);
    await js(`(function(){ var b=document.getElementById('gx-notif-btn'); if(b) b.click(); })(); true`);
    await wait(200);
    check('faz2-notif-jobs', notifOk, 'bildirim + iş başlat');
    // Çalıştır paneli (eski Geliştir): Bul&Değiştir önizleme + Test keşfi
    await js(`(function(){ var b=[].slice.call(document.querySelectorAll('button')).find(function(x){ return (x.innerText||'').trim()==='Çalıştır'; }); if(b) b.click(); })(); true`);
    await wait(500);
    const devPane = await js(`(function(){ var t=(document.body.innerText||'').toLocaleUpperCase('tr-TR'); return t.includes('BUL & DEĞİŞTİR') && t.includes('TEST GEZGİNİ') && t.includes('GALAXY PROFİLİ'); })()`);
    check('faz2-devpane', devPane, 'Geliştir sekmesi');
    await js(`(function(){ var i=document.querySelector('input[placeholder*="aranacak"]'); if(i){ i.focus(); i.value='express'; i.dispatchEvent(new Event('input',{bubbles:true})); } var b=[].slice.call(document.querySelectorAll('button')).find(function(x){ return /Önizle/.test(x.innerText||''); }); if(b) b.click(); })(); true`);
    await wait(800);
    const grOk = await js(`(document.body.innerText||'').includes('eşleşme') && (document.body.innerText||'').includes('Tümünü uygula')`);
    check('faz2-grep-replace', grOk, 'önizlemeli toplu değiştir');
    await js(`(function(){ var b=[].slice.call(document.querySelectorAll('button')).find(function(x){ return /Keşfet/.test(x.innerText||''); }); if(b) b.click(); })(); true`);
    await wait(800);
    const testOk = await js(`(document.body.innerText||'').includes('health ok döner')`);
    check('faz2-test-explorer', testOk, 'test keşfi');
    await js(`(function(){ var b=[].slice.call(document.querySelectorAll('button')).filter(function(x){ return (x.title||'').includes('Bu testi'); }); if(b.length) b[0].click(); })(); true`);
    await wait(900);
    const testRunOk = await js(`(document.body.innerText||'').includes('Test geçti') || (document.body.innerText||'').includes('vitest')`);
    check('faz2-test-run', testRunOk, 'tek tık koş');
    // Dev server önizlemesi
    await js(`(function(){ var i=document.querySelector('input[placeholder*="port (örn"]'); if(i){ i.focus(); i.value='5173'; i.dispatchEvent(new Event('input',{bubbles:true})); } })(); true`);
    await wait(350);
    await js(`(function(){ var bs=[].slice.call(document.querySelectorAll('button')).filter(function(x){ return (x.innerText||'').trim()==='aç'; }); if(bs.length) bs[bs.length-1].click(); })(); true`);
    await wait(700);
    const devSrvOk = await js(`(document.body.innerText||'').includes('localhost:5173')`);
    check('faz2-devsrv', devSrvOk, 'gömülü önizleme');
    // ---- FAZ 3 ----
    // Çalıştır profilleri + LSP durumu (Geliştir sekmesindeyiz)
    const runOk = await js(`(function(){ var t=document.body.innerText||''; return /ÇALIŞTIR/.test(t.toLocaleUpperCase('tr-TR')) && /npm run dev|npm run build|node server\\.js/.test(t) && /TypeScript 5\\.6\\.3/.test(t); })()`);
    check('faz3-runprofiles-lsp', runOk, 'profilller + TS durumu');
    // Git sekmesi: GitHub PR + dallar + stash (sol panel segmesinden bas — etkinlik çubuğundaki Git ile karıştırma)
    await js(`(function(){ var seg=document.querySelector('.gx-seg'); var b=seg?[].slice.call(seg.querySelectorAll('button')).find(function(x){ return (x.innerText||'').trim()==='Değişiklikler'; }):null; if(b) b.click(); })(); true`);
    await wait(800);
    const ghOk = await js(`(function(){ var t=document.body.innerText||''; return /#12/.test(t) && /Health endpoint düzeltmesi/.test(t) && /fix\\/health/.test(t); })()`);
    check('faz3-github-pr', ghOk, 'PR listesi + CI');
    const gdOk = await js(`(function(){ var t=document.body.innerText||''; return /DALLAR/.test(t.toLocaleUpperCase('tr-TR')) && /yarım kalan iş/.test(t) && /STASH/.test(t.toLocaleUpperCase('tr-TR')); })()`);
    check('faz3-git-depth', gdOk, 'dallar + stash paneli');
    // ---- FAZ 4 ----
    // AJAN konsol sekmesi: boş durum + mesaj akışı (mock motor)
    await js(`(function(){ var b=[].slice.call(document.querySelectorAll('button')).find(function(x){ return (x.innerText||'').trim()==='✦ AJAN'; }); if(b) b.click(); })(); true`);
    await wait(600);
    const ajEmpty = await js(`(function(){ var t=document.body.innerText||''; return /Yerleşik ajan/.test(t) && /Claude Code CLI gerekmez/.test(t); })()`);
    check('faz4-agent-tab', ajEmpty, 'AJAN sekmesi + CLI gerekmez notu');
    await js(`(function(){ var i=document.getElementById('ghud-console-input'); if(i){ i.focus(); i.value='hello.js dosyası yaz'; i.dispatchEvent(new Event('input',{bubbles:true})); i.dispatchEvent(new KeyboardEvent('keydown',{key:'Enter',bubbles:true})); } })(); true`);
    await wait(800);
    const ajFeed = await js(`(function(){ var t=document.body.innerText||''; return /hello\\.js dosyası yaz/.test(t) && /değişen dosyalar/.test(t) && /src\\/hello\\.js/.test(t); })()`);
    check('faz4-agent-send', ajFeed, 'mesaj + tur-sonu değişen dosya listesi akışta');
    // Yerleşik Ajan kartı (Geliştir sekmesi): anahtar durumu
    await js(`(function(){ var seg=document.querySelector('.gx-seg'); var b=seg?[].slice.call(seg.querySelectorAll('button')).find(function(x){ return (x.innerText||'').trim()==='Çalıştır'; }):null; if(b) b.click(); })(); true`);
    await wait(700);
    const ajCard = await js(`(function(){ var t=document.body.innerText||''; return /YERLEŞİK AJAN/.test(t.toLocaleUpperCase('tr-TR')) && /anahtar kayıtlı/.test(t); })()`);
    check('faz4-agent-card', ajCard, 'BYOK kartı + anahtar durumu');
    // Akış şeması: tam ekran, katmanlı mimari + seçim paneli + modüle in + DB canlı tablolar
    await js(`(function(){ var b=document.getElementById('gx-flow-open')||document.getElementById('gx-flow-open-side')||document.getElementById('gx-pmap-open')||[].slice.call(document.querySelectorAll('button')).find(function(x){ return /Akış şeması/.test(x.innerText||''); }); if(b) b.click(); })(); true`);
    await wait(700);
    const flowOk = await js(`(function(){ var c=document.getElementById('gx-flow-canvas'); if(!c) return 'kanvas yok'; var n=c.querySelectorAll('[data-nid]').length; var t=c.textContent||''; return n>=7 && /PostgreSQL/.test(t) && /GİRİŞ/.test(t) && /Stripe/.test(t) ? true : ('düğüm '+n); })()`);
    await shot('flow-mimari');
    check('flow-open', flowOk === true, flowOk === true ? 'giriş → modül → veri/dış servis' : String(flowOk));
    const nodeClick = (id, type) => js(`(function(){ var g=document.querySelector('#gx-flow-canvas [data-nid="${id}"]'); if(g) g.dispatchEvent(new MouseEvent('${type}',{bubbles:true})); return !!g; })()`);
    await nodeClick('mod:src/routes', 'click');
    await wait(350);
    const flowSel = await js(`(function(){ var t=(document.getElementById('gx-flow-side')||{}).textContent||''; return /Rotalar · 3/.test(t) && /POST \\/orders\\/:id\\/pay/.test(t) && /Onu kullananlar/.test(t); })()`);
    check('flow-inspect', flowSel, flowSel ? 'rotalar + kim kullanıyor' : await js(`((document.getElementById('gx-flow-side')||{}).innerText||'yok').slice(0,300).replace(/\\s+/g,' ')`));
    await nodeClick('mod:src/routes', 'dblclick');
    await wait(450);
    const flowDrill = await js(`(function(){ var c=document.getElementById('gx-flow-canvas'); return !!c.querySelector('[data-nid="file:src/routes/orders.ts"]') && !!c.querySelector('[data-nid="mod:src/services"]') && /src\\/routes\\//.test(document.getElementById('gx-flow').innerText||''); })()`);
    await shot('flow-modul');
    check('flow-drill', flowDrill, 'modül içi dosya grafiği');
    await js(`window.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape',bubbles:true})); true`);
    await wait(350);
    await nodeClick('db:postgres', 'click');
    await wait(400);
    const flowDb = await js(`(function(){ var t=(document.getElementById('gx-flow-side')||{}).textContent||''; return /Canlı tablolar · 2/.test(t) && /Prisma modelleri/.test(t) && /DB sekmesinde aç/.test(t); })()`);
    await shot('flow-db');
    check('flow-db', flowDb, 'bağlı DB canlı tablolar + modeller');
    for (let i = 0; i < 4; i++) { await js(`window.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape',bubbles:true})); true`); await wait(200); }
    const flowClosed = await js(`!document.getElementById('gx-flow')`);
    check('flow-esc', flowClosed, 'Esc katman katman çıkar');
    await js(`(function(){ var b=[].slice.call(document.querySelectorAll('button')).find(function(x){ return (x.innerText||'').trim()==='Dosyalar'; }); if(b) b.click(); })(); true`);
    await wait(300);
    for (let i = 0; i < 2 && await js(`!document.getElementById('gx-pdb')`); i++) { await js(`window.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape',bubbles:true})); true`); await wait(300); }
    const pdbOk = await js(`(function(){ var c=document.getElementById('gx-pdb'); var t=c?(c.innerText||''):''; return /PostgreSQL/.test(t) && /bağlı · 2 tablo/.test(t) && /orders/.test(t) ? true : (c?t.slice(0,160).replace(/\\s+/g,' '):'kart yok'); })()`);
    await js(`(function(){ var c=document.getElementById('gx-pdb'); if(c) c.scrollIntoView(); })(); true`);
    await wait(200);
    await shot('gezegen-veri');
    check('planet-db-card', pdbOk === true, pdbOk === true ? 'gezegende bağlı DB + tablolar' : String(pdbOk));
    // Evrene proje ekleme: kendiliğinden keşif yok; modal → depoları bul → işaretle → ekle
    for (let i = 0; i < 2; i++) {
      await js(`(function(){ var b=document.querySelector('button[aria-label="Geri dön"]'); if(b) b.click(); })(); true`);
      await wait(400);
    }
    await goNav('Ana Sayfa', 'Projeler');
    await wait(200);
    await js(`(function(){ var b=document.querySelector('button[aria-label="Proje ekle"]'); if(b) b.click(); })(); true`);
    await wait(400);
    const apOpen = await js(`!!document.getElementById('gx-addproj') && !!document.getElementById('gx-addproj-paths')`);
    check('addproj-modal', apOpen, apOpen ? 'yol kutusu + depo bul' : await js(`document.querySelectorAll('button[aria-label="Proje ekle"]').length+' btn | '+(document.body.innerText||'').slice(0,300).replace(/\\s+/g,' ')`));
    await js(`(function(){ var b=[].slice.call(document.querySelectorAll('#gx-addproj button')).find(function(x){ return /Depoları bul/.test(x.innerText||''); }); if(b) b.click(); })(); true`);
    await wait(500);
    const apRows = await js(`(function(){ var r=document.querySelectorAll('#gx-addproj .gx-addproj-row'); var t=document.getElementById('gx-addproj').innerText||''; return r.length===3 && /epsilon/.test(t) && /lab\\/zeta/.test(t); })()`);
    check('addproj-find', apRows, '3 depo, ekli olan işaretli');
    await js(`(function(){ var r=[].slice.call(document.querySelectorAll('#gx-addproj .gx-addproj-row')).find(function(x){ return /epsilon/.test(x.innerText||''); }); if(r) r.click(); })(); true`);
    await wait(200);
    await js(`(function(){ var t=document.getElementById('gx-addproj-paths'); if(t){ t.value='/x/lab/zeta'; t.dispatchEvent(new Event('input',{bubbles:true})); } })(); true`);
    await wait(200);
    await js(`(function(){ var b=[].slice.call(document.querySelectorAll('#gx-addproj button')).find(function(x){ return /^Ekle/.test((x.innerText||'').trim()); }); if(b) b.click(); })(); true`);
    await wait(900);
    const apDone = await js(`!document.getElementById('gx-addproj') && /epsilon/i.test(document.body.innerText||'') && /zeta/i.test(document.body.innerText||'')`);
    check('addproj-submit', apDone, 'işaretli + yazılan yol eklendi');
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
