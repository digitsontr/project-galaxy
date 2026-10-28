
class Component extends DCLogic {
  state = { mode:'space', tab:'genel', uiMode:'komutan', selId:'haci', hudOpen:false, agentId:null, palette:false, consoleTab:'claude', leftTab:'agac', orbitView:false, readmeOpen:false, warping:false, gitCenter:null, addUni:false, editUniId:null, uniName:'', uniEditRoot:'', uniSource:'ssh', settings:false, kayitSub:'gorevler', focusRunning:false, focusSec:1500,
    toolsOpen:false, toolFind:'', _clockTick:0, locOpen:false, moreOpen:false, holdPlanet:false, asstOpen:false, asstInput:'', planetTodoInput:'',
    loaded:false, uniId:null, _docker:null, _sched:null, _db:null, _git:null, _preview:null, _prevLoading:false, _fsCwd:'', _reports:null, _reportView:null, query:'', paletteIdx:0,
    gitMsg:'', branchInput:'', _branchAdd:false, _gitBusy:false, _gitActionMsg:'', _gitDiff:null,
    _editMode:false, _editContent:'', _editBusy:false, _editMsg:'', newFileInput:'', _newFileOpen:false, _fsMsg:'', grepQuery:'', _grep:null, _grepBusy:false,
    dockerTab:'containers', _dstatus:null, _images:null, _dlog:null,
    dbSel:null, dbDatabase:null, _dbschema:null, _dbdbs:null, dbAddOpen:false, _dbtest:'',
    _dbTable:null, _dbTableData:null, _dbEdits:{}, _dbRowBusy:null, _dbDelRow:null, _dbRowMsg:'', _dbOffset:0, _dbOrderBy:'', _dbOrderDir:'', _dbNewOpen:false, _dbNewRow:{},
    dbForm:{name:'',type:'postgres',host:'localhost',port:'5432',database:'',user:'',password:'',file:''},
    agentInput:'', _agentBusy:false, consoleInput:'', _todos:null, todoInput:'', noteInput:'', linkInput:'', linkAdd:false,
    _readme:null, docQuery:'', schInput:'', dbSql:'', dbAsk:'', dbAgentBusy:false, _dbresult:null, _dbConfirm:null, backupsOpen:false, _backups:null, activityOpen:false, _activityTick:0,
    fileTabs:[], treeFilter:'', pvFind:'', pvReplace:'', pvWrap:false, pvFont:13, _editSavedAt:'',
    _problems:[], problemsOpen:false, pvAutosave:false, _diag:null, diagBusy:false,
    filePalOpen:false, filePalQuery:'', filePalIdx:0, _agentReview:null, _runProblemsOpen:false,
    grQuery:'', grReplace:'', grRegex:false, grCase:false, _grPreview:null, grBusy:false, _grBackup:null,
    symOpen:false, symQuery:'',
    _tests:null, testsBusy:false, _testRunning:'',
    _history:null, _blame:null, histBusy:false, _histShow:null,
    _jobs:[], notifOpen:false, _notifs:[], jobCmd:'',
    _gxProfile:null, gxBusy:false, tplKind:'node',
    splitTerm:false, splitBash:'',
    splitEditor:false, _preview2:null,
    devSrvOpen:false, devSrvUrl:'', devSrvPort:'',
    promptLibOpen:false,
    _trainings:null, _trainingErr:'', _trainingCat:'', trainingSel:null, _trainingBusy:false, _trainingItem:null, trainingQuery:'',
    trainingMode:'oku', _quiz:null, _quizBusy:false, _quizPicked:null, _quizErr:'', _quizRight:0, _quizWrong:0,
    trainingAddOpen:false, _trainingAddCat:'', trainingAddNewCat:'', _trainingAddFiles:[], _trainingAddBusy:false, _trainingAddErr:'',
    _servers:null, _sshKeys:null, srvAddOpen:false, _srvtest:'', srvRootInput:'', srvForm:{name:'',host:'',user:'',port:'22',key:'',roots:[]}, _srvTerm:null, srvTermInput:'', _uniSrvSel:null, uniRemotePath:'', _toast:null, _confirm:null,
    _conBusy:false, _claudeOk:null, _githubOk:null, _githubMsg:'', _hubPulse:null, planInput:'',
    leftCollapsed:false, rightCollapsed:false, activityId:'explorer', consoleCollapsed:true, _helpTick:0, splashOpen:true, _masBlocked:false,
    _leftPeek:false, _rightPeek:false, _lastSurface:'',
    schAddOpen:false, _schResult:'', schForm:{name:'',prompt:'',agentId:'',type:'weekly',weekday:'1',hour:'9',minute:'0'},
    consoleH:240, hudH:128, agentFormOpen:false, agentForm:{id:'',name:'',role:'',prompt:'',color:'#61dcff',p1:'',p2:'',p3:''},
    mailPane:'inbox', _inbox:[], mailSel:null, mailReadBody:'', mailTo:'', mailSub:'', mailBody:'', mailAtts:[], _treeOpen:{},
    _pw:null, _prs:null, _issues:null, _ci:null, _traffic:null, _grepUniOpen:false, _grepUni:[], _grepUniBusy:false, grepUniQuery:'', grepStatus:'', scopePlanet:true, asstAgentId:null, _tourTick:0 };
  _uiTheme = 'apex';

  NOTES = { haci:['Yol tarifi v1\'de yok — sonraya','Kalıcı oturum: ilk girişten sonra login istenmez','Vital mock verisi sadece nabza indirilecek'], sales:['DuckDuckGo araması — API key gerektirmiyor','Web UI: python web_app.py'], core:['flux ile aynı kod tabanı','Son commit: Aralık 2025'], kyc:['Canlılık testi TurkTrust SDK ile'] };
  LINKS = { haci:[['PAP/BleBracelet','Bileklik firmware','#c77bff'],['KYC TurkTrust','Kimlik doğrulama','#61dcff']], sales:[['Core SDK','Ortak biyometri','#ffc861']], core:[['Flux','Aynı kod tabanı','#8a8fa8']], kyc:[['Hacı Takip','Kimlik modülü','#61dcff']] };

  DARK = { '#61dcff':'#1a6b8f', '#4fe0ff':'#146078', '#55e88b':'#1c6b45', '#c77bff':'#5b2f83', '#ffc861':'#8a6410', '#8a8fa8':'#3a3e52', '#ff6b7a':'#8a2d3a', '#ff8ec8':'#7a3a5c', '#7aa2ff':'#243a78' };
  STATUS = { active:{c:'#61dcff',l:'Aktif'}, waiting:{c:'#ffc861',l:'Beklemede'}, done:{c:'#55e88b',l:'Tamam'}, new:{c:'#c77bff',l:'Keşfedilmemiş'}, paused:{c:'#8a8fa8',l:'Arşiv'} };

  PROJECTS = [
    { id:'haci', name:'Hacı Takip', status:'active', prog:35, warn:true, orbit:true, x:19, y:31, size:150, branch:'feature/telemetri-v1', stage:'UI prototip tamam — Faz 1: backend entegrasyonu', desc:'Bileklik tabanlı konum + nabız takip sistemi (iOS + web portal).', plan:[['Login ekranı',true],['BLE eşleştirme',true],['Hacı CRUD ekranları',false],['Geofence alarmları',false],['Telemetri v1',false]] },
    { id:'sales', name:'Sales Agent', status:'active', prog:70, orbit:true, x:45, y:55, size:106, branch:'main', stage:'v1 çalışıyor (Ollama + FastAPI)', desc:'Web araması yapıp potansiyel müşteri bulan yerel AI satış ajanı.', plan:[['Rapor kalitesini iyileştir',false],['Model seçimini test et',false]] },
    { id:'core', name:'Core SDK', status:'waiting', prog:80, orbit:true, x:31, y:72, size:94, branch:'main', stage:'v1.0 — havaalanı projesi için', desc:'Android biyometrik SDK test uygulaması (NFIQ2, yüz, parmak izi).', plan:[['AES-256-GCM aktif',true],['MasterKey (Keystore)',true],['SSL pinning',false],['Root detection',false]] },
    { id:'gitflow', name:'Git Flow', status:'done', prog:100, orbit:true, x:66, y:25, size:130, branch:'develop', stage:'Tamamlandı', desc:'Takım için git akışı rehberi ve şablonları.', plan:[['Şerit diyagramı',true],['6 adım akış',true]] },
    { id:'kyc', name:'KYC TurkTrust', status:'active', prog:45, orbit:true, x:80, y:44, size:92, branch:'feature/kyc', stage:'Entegrasyon aşaması', desc:'Kimlik doğrulama ve canlılık servisi.', plan:[['SDK entegrasyonu',true],['Canlılık testi',false]] },
    { id:'yeni', name:'Yeni Klasör', status:'new', prog:0, orbit:true, x:58, y:75, size:84, branch:'—', stage:'Henüz taranmadı', desc:'Yeni eklenen, keşfedilmemiş klasör.', plan:[] },
    { id:'flux', name:'Flux', status:'paused', prog:80, orbit:false, branch:'main', stage:'Core SDK kopyası', desc:'core_sdk_tester_app kopyası — birleştirilebilir.', plan:[['Birleştir veya sil',false]] },
    { id:'sunum', name:'Sunumlar', status:'done', prog:100, orbit:false, branch:'main', stage:'Arşiv', desc:'Sunum ve doküman arşivi.', plan:[] },
  ];

  AGENTS = [
    { id:'git', kind:'git', builtin:true, name:'Git Yöneticisi', role:'Dallar · commit · MR · stash', color:'#f78166', avatar:'', abilities:['Yerel ve uzak dallar, commitler, stash’ler','Açık PR / MR listesi (GitHub, GitLab)','Ne olacağını adım adım grafikle gösterir','Geri alınamaz işlemden önce onay ister'], presets:[{label:'Dal grafiğini çiz',ask:'Bu deponun dal grafiğini çiz ve açıkla.'},{label:'Ne push/pull bekliyor?',ask:'Yerel ile uzağı karşılaştır.'}], badge:0, msgs:[] },
    { id:'quality', kind:'quality', builtin:true, name:'Kod Kalitesi', role:'Kod inceleme · SonarQube bakışı', color:'#7ee787', avatar:'', abilities:['Dili, framework’ü ve proje yapısını tanır','Code review kuralları + SonarQube kategorileri','Her bulgu dosya:satır, neden ve nasıl düzelir','Kalite kapısı kararı ve puan'], presets:[{label:'Değişikliklerimi incele',ask:'Commit’lenmemiş değişikliklerimi incele.'}], badge:0, msgs:[] },
    { id:'docs', kind:'docs', builtin:true, name:'Dokümantasyon', role:'md · pdf · excel · görsel', color:'#79c0ff', avatar:'', abilities:['Projedeki md, pdf, xlsx, csv, görsel dosyaları bulur','README, kılavuz, API dokümanı yazar','PDF, Excel/CSV, SVG diyagram üretir'], presets:[{label:'Tüm dokümanları listele',ask:'Bu projedeki tüm dokümanları listele.'}], badge:0, msgs:[] },
    { id:'flow', kind:'flow', builtin:true, name:'Akış Analisti', role:'Akışlar · aşamalar · sorunlar', color:'#d2a8ff', avatar:'', abilities:['Her akışı çıkarır: giriş → aşamalar → çıktı','Her aşamadaki sorunları bulur','Sorunların nasıl çözüldüğünü gösterir'], presets:[{label:'Tüm akışları çıkar',ask:'Bu projedeki tüm akışları çıkar.'}], badge:0, msgs:[] },
    { id:'planner', kind:'planner', builtin:true, name:'Planlayıcı', role:'Fikir → plan → prompt', color:'#ffa657', avatar:'', abilities:['Fikrini sorgular ve güçlendirir','Riskleri, MVP kapsamını çıkarır','3-4 alternatif plan ve uzun proje promptları'], presets:[{label:'Bir fikrim var',ask:'Yeni bir proje fikrim var. Önce soruları sor.'}], badge:0, msgs:[] },
  ];

  FILES = [
    { name:'src/', c:'#7aa2ff', x:30, y:34, s:44, kind:'dir' },
    { name:'README.md', c:'#ffc861', x:66, y:30, s:40, glow:true, kind:'doc' },
    { name:'app.py', c:'#4fe0ff', x:70, y:64, s:34, kind:'code' },
    { name:'logo.png', c:'#ff8ec8', x:26, y:66, s:36, kind:'img' },
    { name:'config.json', c:'#55e88b', x:47, y:80, s:32, kind:'cfg' },
  ];

  _inForm(e){ const t=(e&&e.target&&e.target.tagName)||''; return t==='INPUT'||t==='TEXTAREA'||t==='SELECT'||t==='BUTTON'||(e.target&&e.target.isContentEditable); }
  _overlayOpen(){ const s=this.state||{}; return !!(s.palette||s.filePalOpen||s.moreOpen||s.locOpen||s.toolsOpen||s._confirm||s.gitCenter||s.agentId||s.asstOpen||s._guideOpen||s.backupsOpen||s.activityOpen||s.trainingAddOpen||s.addUni||s.addProj||s.flowOpen||s.settings||s._srvTerm||s._dlog||s.dbAddOpen||s.agentFormOpen||s.schAddOpen||s._gitDiff||s._reportView||s._preview||s._history||s.srvAddOpen||s._dbConfirm||s.splashOpen||s._grepUniOpen||s.mailPane==='compose'); }
  _rememberSurface(id){
    const key=String(id||''); if(!key) return;
    this._lastSurface=key;
    try{ localStorage.setItem('gxLastSurface', JSON.stringify({tab:key, at:Date.now(), proj:(this.sel&&this.sel.id)||''})); }catch(e){}
    if(this.state._lastSurface!==key) this.setState({_lastSurface:key});
  }
  _surfaceLabel(id){
    return ({genel:'Ana Sayfa',evren:'Projeler',db:'Veritabanları',docker:'Konteynerler',pano:'Görevler',zaman:'Zamanlanmış işler',dongu:'Proje taraması',posta:'E-posta',servers:'SSH sunucuları',pixel:'Ajanlar',git:'Değişiklikler',dev:'Çalıştır',agac:'Dosyalar',dosya:'Dosya'}[id])||id||'';
  }
  _chromeMove(e){
    if(this._barDragging) return;
    const x=e.clientX, y=e.clientY, w=window.innerWidth;
    const st=this.state||{};
    const leftOpen=!st.leftCollapsed||st._leftPeek;
    const rightOpen=!st.rightCollapsed||st._rightPeek;
    const leftEdge=leftOpen?380:80;
    const rightEdge=rightOpen?208:0;
    let lp=!!st._leftPeek, rp=!!st._rightPeek;
    if(x<=16) lp=true; else if(x>leftEdge+28) lp=false;
    if(x>=w-16) rp=true; else if(x<w-rightEdge-28) rp=false;
    if(lp===st._leftPeek && rp===st._rightPeek) return;
    if(this._chromeT) cancelAnimationFrame(this._chromeT);
    this._chromeT=requestAnimationFrame(()=>this.setState({_leftPeek:lp,_rightPeek:rp}));
  }
  _activeDialog(){
    try{
      const list=[...document.querySelectorAll('[data-gx-dialog="true"]')].filter(el=>{
        const cs=getComputedStyle(el); return cs.display!=='none'&&cs.visibility!=='hidden'&&el.getClientRects().length>0;
      });
      return list[list.length-1]||null;
    }catch(e){ return null; }
  }
  _dialogFocusables(root){
    if(!root) return [];
    try{ return [...root.querySelectorAll('button:not([disabled]),input:not([disabled]),textarea:not([disabled]),select:not([disabled]),a[href],[tabindex]:not([tabindex="-1"])')].filter(el=>{ const cs=getComputedStyle(el); return cs.display!=='none'&&cs.visibility!=='hidden'&&el.getClientRects().length>0; }); }catch(e){ return []; }
  }
  _trapDialog(e){
    if(!e||e.key!=='Tab') return false;
    const root=this._activeDialog(); if(!root) return false;
    const fs=this._dialogFocusables(root); if(!fs.length){ e.preventDefault(); root.focus&&root.focus(); return true; }
    const first=fs[0], last=fs[fs.length-1], cur=document.activeElement;
    if(!root.contains(cur)){ e.preventDefault(); (e.shiftKey?last:first).focus(); return true; }
    if(e.shiftKey&&cur===first){ e.preventDefault(); last.focus(); return true; }
    if(!e.shiftKey&&cur===last){ e.preventDefault(); first.focus(); return true; }
    return false;
  }
  _syncDialogFocus(){
    const root=this._activeDialog();
    if(root===this._dialogNode) return;
    if(root){
      if(!this._dialogNode) this._dialogReturn=document.activeElement;
      this._dialogNode=root;
      setTimeout(()=>{ try{ const target=root.querySelector('[autofocus]')||this._dialogFocusables(root)[0]||root; target.focus&&target.focus(); }catch(e){} },0);
    }else{
      this._dialogNode=null;
      const ret=this._dialogReturn; this._dialogReturn=null;
      setTimeout(()=>{ try{ if(ret&&document.contains(ret)&&ret.focus) ret.focus(); }catch(e){} },0);
    }
  }
  _escDismiss(){
    const s=this.state||{};
    if(s.splashOpen){ this.dismissSplash(); return true; }
    if(s._confirm||s._dbConfirm){ this.cancelConfirm(); return true; }
    if(s.agentId){ this.setState({agentId:null}); return true; }
    if(s.filePalOpen){ this.setState({filePalOpen:false,filePalQuery:''}); return true; }
    if(s.palette){ this.setState({palette:false,query:'',paletteIdx:0, activityId:s.activityId==='search'?'explorer':s.activityId}); return true; }
    if(s.moreOpen){ this.setState({moreOpen:false}); return true; }
    if(s._guideOpen){ this.setState({_guideOpen:false}); return true; }
    if(s.flowOpen){ if(s.flowQuery) this.setState({flowQuery:''}); else if(s.flowSel) this.setState({flowSel:null}); else if(s.flowFocus) this._flowSetFocus(null); else this.closeFlow(); return true; }
    if(s._srvTerm){ this.closeSrvTerm(); return true; }
    if(s._gitDiff){ this.closeGitDiff(); return true; }
    if(s._reportView){ this.closeReport(); return true; }
    if(s._history||s._histShow){ this.closeHistory(); return true; }
    if(s._preview){ this.closePreview(); return true; }
    if(s._dlog){ this.closeDlog(); return true; }
    if(s.locOpen){ this.setState({locOpen:false}); return true; }
    if(s.toolsOpen){ this.closeTools(); return true; }
    if(s.agentFormOpen){ this.setState({agentFormOpen:false}); return true; }
    if(s.backupsOpen){ this.setState({backupsOpen:false}); return true; }
    if(s.activityOpen){ this.setState({activityOpen:false}); return true; }
    if(s._grepUniOpen){ this.setState({_grepUniOpen:false}); return true; }
    if(s.mailPane==='compose'){ this.setState({mailPane:'inbox'}); return true; }
    if(s.trainingAddOpen){ this._trainingCloseAdd(); return true; }
    if(s.gitCenter){ this.setState({gitCenter:null, activityId:(s.activityId==='git'?'explorer':s.activityId)}); return true; }
    if(s.addProj){ this._closeAddProj(); return true; }
    if(s.addUni||s.editUniId){ this._closeUniModal(); return true; }
    if(s.settings){ this.setState({settings:false}); return true; }
    if(s.dbAddOpen){ this.setState({dbAddOpen:false}); return true; }
    if(s.schAddOpen){ this.setState({schAddOpen:false}); return true; }
    if(s.srvAddOpen){ this.setState({srvAddOpen:false}); return true; }
    if(s.asstOpen||(this._asst&&this._asst.open)){ this._asstClose(); return true; }
    if(s._newFileOpen){ this.setState({_newFileOpen:false}); return true; }
    if(s._branchAdd){ this.setState({_branchAdd:false}); return true; }
    if(s.linkAdd){ this.setState({linkAdd:false,linkInput:''}); return true; }
    if(s.mode==='planet'||s.holdPlanet){ this.back(); return true; }
    return false;
  }
  _reduced(){ try{ return !!(typeof matchMedia==='function' && matchMedia('(prefers-reduced-motion: reduce)').matches); }catch(e){ return false; } }
  _applyTheme(){
    this._uiTheme='apex';
    try{ document.documentElement.dataset.theme='apex'; document.body.dataset.theme='apex'; localStorage.setItem('gxUiTheme','apex'); }catch(e){}
  }
  _theme(){
    if(this._uiTheme==='ev') return {acc:'#e8b86d', ink:'#f3eadc', dim:'#c4b49a', panel:'#241c16', panel2:'#1c1612', wire:'rgba(232,184,109,.9)', wireDim:'rgba(232,184,109,.28)'};
    if(this._uiTheme==='apex') return {acc:'#4fe0ff', ink:'#e8f4ff', dim:'#8aa0b8', panel:'#0c1018', panel2:'#080b12', wire:'rgba(79,224,255,.92)', wireDim:'rgba(79,224,255,.28)'};
    return {acc:'#61dcff', ink:'#dbe4ff', dim:'#9aa3c2', panel:'#10182c', panel2:'#0c1220', wire:'rgba(97,220,255,.9)', wireDim:'rgba(97,220,255,.28)'};
  }
  _t(){
    return {
      acc:'var(--gx-accent)', ink:'var(--gx-ink)', dim:'var(--gx-dim)', faint:'var(--gx-faint)',
      ok:'var(--gx-ok)', err:'var(--gx-err)', warn:'var(--gx-warn)', info:'var(--gx-info)',
      line:'var(--gx-line)', on:'var(--gx-on-accent)',
      accA:(p)=>`color-mix(in srgb, var(--gx-accent) ${p}%, transparent)`,
      okA:(p)=>`color-mix(in srgb, var(--gx-ok) ${p}%, transparent)`
    };
  }
  _float(sec){ return this._reduced()?'':`animation:floatOrb ${sec}s ease-in-out infinite`; }
  _floatC(sec){ return this._reduced()?'':`animation:floatOrbC ${sec}s ease-in-out infinite`; }
  _pulse(){ return ''; }
  _planetTint(p, base){
    const pal=['#61dcff','#7aa2ff','#c77bff','#ff6b9a','#55e88b','#ffc861','#4fe0ff','#a78bfa','#5eead4','#ff8ec8','#f59e0b'];
    const s=String((p&&p.id)||(p&&p.name)||'x'); let h=2166136261;
    for(let i=0;i<s.length;i++) h=Math.imul(h^s.charCodeAt(i),16777619);
    return pal[Math.abs(h)%pal.length]||base||pal[0]; }
  _isoSplit(n){
    const ringN=n<=6?1:n<=13?2:n<=24?3:4;
    const rx=ringN===1?[31]:ringN===2?[18,34]:ringN===3?[15,26,37]:[13,22,30,40];
    const weights=ringN===1?[1]:ringN===2?[2,5]:ringN===3?[2,3,5]:[2,3,4,6];
    const sum=weights.reduce((a,b)=>a+b,0);
    const caps=[]; let used=0;
    for(let r=0;r<ringN-1;r++){ const c=Math.max(1,Math.round(n*weights[r]/sum)); caps.push(Math.min(c, n-used-(ringN-1-r))); used+=caps[r]; }
    caps.push(Math.max(0,n-used));
    return {rx, caps, tilt:0.42}; }
  _sessRead(){ try{ return JSON.parse(localStorage.getItem('gxSession')||'null'); }catch(e){ return null; } }
  _sessWrite(patch){
    try{
      const st=this.state||{}, prev=this._sessRead()||{};
      const rec=Object.assign({}, prev, { uniId:st.uniId, selId:st.selId, ts:Date.now() }, patch||{});
      localStorage.setItem('gxSession', JSON.stringify(rec));
    }catch(e){}
  }
  _recentRead(){ try{ const a=JSON.parse(localStorage.getItem('gxRecent')||'[]'); return Array.isArray(a)?a.filter(Boolean):[]; }catch(e){ return []; } }
  _recentTouch(id){
    if(!id) return;
    const ids=(this._recentIds||this._recentRead()).filter(x=>x!==id);
    ids.unshift(id); if(ids.length>8) ids.length=8;
    this._recentIds=ids;
    try{ localStorage.setItem('gxRecent', JSON.stringify(ids)); }catch(e){}
  }
  _consoleCollapsedPref(){ try{ return localStorage.getItem('gxConsoleCollapsed')!=='0'; }catch(e){ return true; } }
  resumeSession(){
    const s=this._sessRead(); if(!s||!s.selId) return;
    this.setState({palette:false, query:'', paletteIdx:0});
    const tab=s.tab||'evren', mode=s.mode||'planet';
    if(mode==='planet'){
      this._gotoProject(s.selId);
      if(s.lastFile){ const rel=s.lastFile; setTimeout(()=>{ try{ this.openPreview(rel); }catch(e){} }, 80); }
      return;
    }
    const all=this._allProjects||this.PROJECTS; const p=all.find(x=>x.id===s.selId);
    if(p&&p.universe&&p.universe!==this.state.uniId) this._applyUni(p.universe);
    this.setState({uniId:(p&&p.universe)||this.state.uniId, selId:s.selId, tab, mode:'space', holdPlanet:false, moreOpen:false, palette:false});
    this._sessWrite({uniId:(p&&p.universe)||this.state.uniId, selId:s.selId, tab, mode:'space'});
    this._onTabOpen(tab);
  }
  openInEditor(app){
    const p=this.sel; if(!p||!p._path||!window.galaxy) return;
    const fn=window.galaxy.openInEditor; if(!fn){ if(window.galaxy.openFolder) window.galaxy.openFolder(p._path); return; }
    try{ fn({ path:p._path, app:app||'auto' }).then(r=>{ if(r&&r.ok) this.toast(r.app==='finder'?'Finder’da açıldı':'Editörde açıldı · '+(r.app||''),'ok'); else this.toast((r&&r.error)||'editör açılamadı','err'); }).catch(()=>{}); }catch(e){}
  }
  _railIds(){ return (this.PROJECTS||[]).slice().sort((a,b)=>(a._stale||0)-(b._stale||0)).map(p=>p.id); }
  _railMove(dir){ const ids=this._railIds(); if(!ids.length) return; let i=ids.indexOf(this.state.selId); if(i<0) i=0; this.select(ids[(i+dir+ids.length)%ids.length]); }
  _paletteMove(dir){ const n=this._paletteLen||0; if(!n) return; const i=((this.state.paletteIdx||0)+dir+n)%n; this.setState({paletteIdx:i}); }
  _paletteGo(){ const fn=this._paletteFns&&this._paletteFns[this.state.paletteIdx||0]; if(fn) fn(); }
  _paletteAskGalaxy(text){ this.setState({palette:false,query:'',paletteIdx:0}); this.assistantHandle(text); }
  _openSearch(forcePalette){
    if(!forcePalette && this.state.mode==='planet'){
      this.setState({palette:false, moreOpen:false, leftTab:'agac', leftCollapsed:false, activityId:'search'});
      setTimeout(()=>{ try{ const el=document.getElementById('gx-grep'); if(el){ el.focus(); el.select&&el.select(); } }catch(e){} }, 80);
      return;
    }
    this.setState({palette:true, moreOpen:false, paletteIdx:0, query:'', activityId:'search'});
    setTimeout(()=>{ try{ const el=document.getElementById('gx-palette-input'); if(el) el.focus(); }catch(e){} }, 50);
  }
  _actExplorer(){
    const st=this.state||{};
    if((st.activityId||'explorer')==='explorer' && !st.leftCollapsed){
      this.setState({leftCollapsed:true});
      return;
    }
    this.setState({activityId:'explorer', leftCollapsed:false});
  }
  _actGit(){
    const st=this.state||{};
    if(st.mode==='planet'||st.holdPlanet){
      this._setLeftTab('git');
      this.setState({activityId:'git', gitCenter:null, leftCollapsed:false});
      this._loadGit();
      this._rememberSurface&&this._rememberSurface('git');
      return;
    }
    this.setState({activityId:'git', gitCenter:null});
    if(this.enter) this.enter();
    setTimeout(()=>{ try{ this._setLeftTab('git'); this._loadGit(); }catch(e){} }, 0);
  }
  _openPrefs(pane){
    if(window.galaxy&&window.galaxy.openSettings){
      try{ window.galaxy.openSettings(pane||undefined); return; }catch(e){}
    }
    this.setState({settings:true});
  }
  _toggleConsole(){
    const on=!this.state.consoleCollapsed;
    this.setState({consoleCollapsed:on});
    try{ localStorage.setItem('gxConsoleCollapsed', on?'1':'0'); }catch(e){}
    if(!on) this._focusConsole();
  }
  componentDidMount(){
    this._key = (e) => {
      if(e.key==='Tab'&&this._activeDialog()){ this._trapDialog(e); return; }
      if ((e.metaKey||e.ctrlKey) && e.key.toLowerCase()==='p'){ if(this.state.mode==='planet'){ e.preventDefault(); this.setState({filePalOpen:true,filePalQuery:'',filePalIdx:0}); setTimeout(()=>{ try{ const i=document.getElementById('gx-filepal-input'); if(i) i.focus(); }catch(err){} },60); return; } }
      if ((e.metaKey||e.ctrlKey) && e.key.toLowerCase()==='s'){ if(this.state._editMode){ e.preventDefault(); this.saveEdit(); return; } }
      if ((e.metaKey||e.ctrlKey) && e.key.toLowerCase()==='e'){ const p=this.state._preview; if(this.state.mode==='planet'&&p&&!this.state._editMode&&(p.kind==='text'||p.kind==='markdown'||p.kind==='html')){ e.preventDefault(); this.startEdit(); return; } }
      if ((e.metaKey||e.ctrlKey) && e.key.toLowerCase()==='k'){ e.preventDefault(); this._openSearch(true); }
      else if ((e.metaKey||e.ctrlKey) && e.key.toLowerCase()==='f'){ e.preventDefault(); this._openSearch(); }
      else if (e.key==='F1'){ e.preventDefault(); this.setState({_guideOpen:!this.state._guideOpen}); }
      else if (e.key==='Enter' && !e.metaKey && !e.ctrlKey && !e.altKey){
        if(this._inForm(e)) return;
        if(this.state.palette){ e.preventDefault(); this._paletteGo(); return; }
        if(this._overlayOpen()) return;
        if(this.state.mode==='space' && this.sel && this.sel.id){ e.preventDefault(); this.enter(); }
      }
      else if ((e.key==='ArrowDown'||e.key==='ArrowUp') && this.state.palette){ e.preventDefault(); this._paletteMove(e.key==='ArrowDown'?1:-1); }
      else if (!e.metaKey && !e.ctrlKey && !e.altKey && (e.key==='j'||e.key==='k'||e.key==='J'||e.key==='K')){
        const t=(e.target&&e.target.tagName)||'';
        if(t==='INPUT'||t==='TEXTAREA'||t==='SELECT'||(e.target&&e.target.isContentEditable)) return;
        if(this.state.palette){ e.preventDefault(); this._paletteMove(e.key.toLowerCase()==='j'?1:-1); return; }
        if(this._overlayOpen()) return;
        if(this.state.mode==='space'){ e.preventDefault(); this._railMove(e.key.toLowerCase()==='j'?1:-1); }
      }
      else if ((e.metaKey||e.ctrlKey) && (e.key==='\\' || e.code==='Backslash')){ if(this.state.mode==='planet'){ e.preventDefault(); this.toggleReadme(); } }
      else if (e.key==='Escape'){ if(this._escDismiss()) e.preventDefault(); }
    };
    window.addEventListener('keydown', this._key);
    try{ this._dialogObserver=new MutationObserver(()=>this._syncDialogFocus()); this._dialogObserver.observe(document.body,{childList:true,subtree:true,attributes:true,attributeFilter:['style','class','aria-hidden']}); setTimeout(()=>this._syncDialogFocus(),0); }catch(e){}
    this._onBarResize=()=>{ if(!this._barDragging) this._clampBars(); };
    window.addEventListener('resize', this._onBarResize);
    this._onBarPtr=(e)=>{
      if(e.button!=null && e.button!==0) return;
      const t=e.target&&e.target.closest&&e.target.closest('.gx-bar-resizer');
      if(!t) return;
      this._startBarResize(t.getAttribute('data-bar'), e);
    };
    document.addEventListener('pointerdown', this._onBarPtr, true);
    this._onChromeMove=e=>this._chromeMove(e);
    document.addEventListener('mousemove', this._onChromeMove, {passive:true});
    try{ setTimeout(()=>this._clampBars(), 0); }catch(e){}
    try{ this.state.uiMode='komutan'; }catch(e){}
    try{ if(this.state.kayitSub==='baglanti') this.state.kayitSub='gorevler'; }catch(e){}
    try{ const h=parseInt(localStorage.getItem('gxConsoleH'),10); if(h>=140) this.state.consoleH=Math.min(560,h); }catch(e){}
    try{ const hh=parseInt(localStorage.getItem('gxHudH'),10); if(hh>160) this.state.hudH=128; else if(hh>=88) this.state.hudH=Math.min(160,hh); }catch(e){}
    try{ document.documentElement.style.removeProperty('--dock'); document.documentElement.style.removeProperty('--term'); }catch(e){}
    try{ if(localStorage.getItem('gxConsoleCollapsed')==='0') this.state.consoleCollapsed=false; }catch(e){}
    try{ this._recentIds=this._recentRead(); }catch(e){ this._recentIds=[]; }
    try{ if(localStorage.getItem('gxOrbitView')==='1') this.state.orbitView=true; else this.state.orbitView=false; }catch(e){}
    try{ if(localStorage.getItem('gxSplash')==='1') this.state.splashOpen=false; }catch(e){}
    if(this.state.splashOpen){ clearTimeout(this._splashT); this._splashT=setTimeout(()=>this.dismissSplash(),1600); }
    try{ if(localStorage.getItem('gxReadmeOpen')==='1') this.state.readmeOpen=true; else this.state.readmeOpen=false; }catch(e){}
    try{ const lt=localStorage.getItem('gxLeftTab'); if(lt==='kayit'||lt==='agac'||lt==='git'||lt==='dev') this.state.leftTab=lt; }catch(e){}
    try{ this.state.rightCollapsed = localStorage.getItem('gxRightPanel')==='closed'; }catch(e){ this.state.rightCollapsed=false; }
    try{ const ls=JSON.parse(localStorage.getItem('gxLastSurface')||'null'); if(ls&&ls.tab) this.state._lastSurface=ls.tab; }catch(e){}
    try{ this._applyTheme(); }catch(e){ this._uiTheme='apex'; }
    this._waitThree(0);
    this._loadReal();
    // Dil tercihi (tr/en) — ayarlardan gelir; UI metinleri buna göre çevrilir.
    this._lang='tr';
    try{ const lg=localStorage.getItem('gxAsstLang')||localStorage.getItem('gxLang'); if(lg==='en'||lg==='tr') this._lang=lg; }catch(e){}
    try{ if(window.galaxy&&window.galaxy.profileGet){ window.galaxy.profileGet().then(p=>{ this._profile=p||{}; if(this._langUserSet) return; this._lang=(p&&p.lang)||this._lang||'tr'; this._applyLang(); }); } }catch(e){ this._applyLang(); }
    // Odak (Pomodoro) süresi sabit 25 dk — ayar ekranı yok
    this._focusDefault=1500;
    this._loadFocusPref=()=>{ try{ if(window.galaxy&&window.galaxy.settingsGet) window.galaxy.settingsGet().then(r=>{
      const s=(r&&r.settings)||{};
      this._mailTo=s.mailTo||'';
      this._mailListTool=s.mailListTool||'';
      this._mailReadTool=s.mailReadTool||'';
      this._mcpOn=!!(s.mcpServers&&s.mcpServers[0]&&String(s.mcpServers[0].command||'').trim());
      this._focusDefault=1500;
      const ns={_setupTick:(this.state._setupTick||0)+1};
      if(!this.state.focusRunning) ns.focusSec=this._focusDefault;
      this._applyTheme();
      if(s.mailTo && !this.state.mailTo) ns.mailTo=s.mailTo;
      if(Object.keys(ns).length) this.setState(ns);
    }); }catch(e){} };
    this._loadFocusPref();
    // Üst bar saati — re-render'a gerek olmadan doğrudan DOM güncellemesi (her sn)
    this._barClock=setInterval(()=>{ try{ const el=document.getElementById('gx-clock'); if(el){ const d=new Date(),p=n=>String(n).padStart(2,'0'); el.textContent=p(d.getHours())+':'+p(d.getMinutes()); } }catch(e){} },1000);
    // Ayarlar penceresinde dil/odak değişince pencere focus'unda güncelle
    this._onFocus=()=>{ try{ if(!this._langUserSet&&window.galaxy&&window.galaxy.profileGet) window.galaxy.profileGet().then(p=>{ const l=(p&&p.lang)||'tr'; if(l!==this._lang){ this._lang=l; this._applyLang(); } }); }catch(e){} this._loadFocusPref(); };
    window.addEventListener('focus', this._onFocus);
    // Ajan yanıt akışı (Claude CLI) — {runId, kind:text|tool|err|done, text}
    try{ if(window.galaxy&&window.galaxy.onAgent){ window.galaxy.onAgent(m=>{ try{ if(this._salonAgentMsg(m)) return; }catch(e){} this._onAgentMsg(m); }); } }catch(e){}
    // Konsol akışları (Claude CLI + Bash shell)
    try{ if(window.galaxy&&window.galaxy.onClaude){ window.galaxy.onClaude(m=>{ try{ if(this._salonClaudeMsg(m)) return; }catch(e){} if(m&&String(m.runId||'').indexOf('asst-')===0){ this._asstClaudeMsg(m); return; } const pid=this._pidFromRun(m&&m.runId); this._appendOut(this._con(pid).cout,m); if(m&&pid&&(m.kind==='done'||m.kind==='info')) this._markClaudeSess(pid); }); } }catch(e){}
    try{ if(window.galaxy&&window.galaxy.onShell){ window.galaxy.onShell(m=>{ const sid=String((m&&m.id)||''); if(sid.indexOf('asst-sh-')===0){ this._asstShellMsg(m); return; } if(sid.indexOf('srvterm')===0){ this._sbout=this._sbout||[]; this._appendOut(this._sbout,m); } else if(sid.indexOf('sh2-')===0){ const pid=sid.slice(4); const con=this._con(pid); con.bout2=con.bout2||[]; this._appendOut(con.bout2,m); } else { const pid=this._pidFromShell(m&&m.id); const con=this._con(pid); if(m&&m.kind==='done'&&m.cwd) con.cwd=m.cwd; if(m&&m.kind==='done') this._noteTestPulse(m, pid); this._appendOut(con.bout,m); } }); } }catch(e){}
    try{ this._initAssistant(); }catch(e){}
    try{ if(window.galaxy&&window.galaxy.onStt) window.galaxy.onStt(m=>this._onStt(m)); }catch(e){}
    try{ if(window.galaxy&&window.galaxy.sttAvailable) window.galaxy.sttAvailable().then(r=>{ if(this._asst&&r&&r.ok){ this._asst.native=true; let wake=false; try{ wake=localStorage.getItem('gxWakeOn')==='1'; }catch(e){} this._asst.wakeOn=!!wake; this._asstWakeBtnStyle(); this._asstSyncChrome(); if(this._asst.wakeOn) this._asstWakeStart(); this._asstWatchStt(true); this.setState({_hubTick:(this.state._hubTick||0)+1}); } }); }catch(e){}
    try{ if(window.galaxy&&window.galaxy.onUpdate){ window.galaxy.onUpdate((kind,p)=>this._onUpdate(kind,p)); } }catch(e){}
    try{ if(window.galaxy&&window.galaxy.onDockerLog){ window.galaxy.onDockerLog(m=>this._onDockerLog(m)); } }catch(e){}
    try{ if(window.galaxy&&window.galaxy.onPty){ window.galaxy.onPty(m=>this._ptyOnData(m)); } }catch(e){}
    try{ if(window.galaxy&&window.galaxy.onFsChange){ window.galaxy.onFsChange(m=>this._onFsChanged(m)); } }catch(e){}
    try{ if(window.galaxy&&window.galaxy.onJobDone){ window.galaxy.onJobDone(m=>this._onJobDone(m)); } }catch(e){}
    try{ if(window.galaxy&&window.galaxy.onDebugReady){ window.galaxy.onDebugReady(m=>this._onDebugReady(m)); } }catch(e){}
    try{ if(window.galaxy&&window.galaxy.onAgentEvent){ window.galaxy.onAgentEvent(m=>this._onAgentEvent(m)); } }catch(e){}
    try{ if(window.galaxy&&window.galaxy.onDbgEvent){ window.galaxy.onDbgEvent(m=>this._onDbgEvent(m)); } }catch(e){}
    try{ if(window.galaxy&&window.galaxy.onJob){ window.galaxy.onJob(m=>this._onJobOut(m)); } }catch(e){}
    try{ if(window.galaxy&&window.galaxy.onScheduleDone){ window.galaxy.onScheduleDone(m=>this._onScheduleDone(m)); } }catch(e){}
    try{ if(window.galaxy&&window.galaxy.onEsc) window.galaxy.onEsc(()=>{ try{ this._escDismiss(); }catch(e){} }); }catch(e){}
    const fsCls=on=>{ try{ document.documentElement.classList.toggle('gx-fs', !!on); document.body.classList.toggle('gx-fs', !!on); }catch(e){} };
    try{ if(window.galaxy&&window.galaxy.onFullscreen) window.galaxy.onFullscreen(fsCls); }catch(e){}
    try{ fsCls(window.outerHeight>=(screen.height-8)); }catch(e){}
  }
