
class Component extends DCLogic {
  state = { mode:'space', tab:'genel', selId:'haci', hudOpen:false, agentId:null, palette:false, consoleTab:'claude', leftTab:'kayit', warping:false, gitCenter:null, addUni:false, uniSource:'ssh', settings:false, kayitSub:'plan', focusRunning:false, focusSec:1500,
    toolsOpen:false, calcExpr:'', calMonthOffset:0, toolFind:'', _clockTick:0, locOpen:false,
    loaded:false, uniId:null, _docker:null, _sched:null, _db:null, _git:null, _preview:null, _prevLoading:false, _fsCwd:'', _reports:null, _reportView:null, query:'',
    gitMsg:'', branchInput:'', _branchAdd:false, _gitBusy:false, _gitActionMsg:'', _gitDiff:null,
    _editMode:false, _editContent:'', _editBusy:false, _editMsg:'', newFileInput:'', _newFileOpen:false, _fsMsg:'', grepQuery:'', _grep:null, _grepBusy:false,
    dockerTab:'containers', _dstatus:null, _images:null, _dlog:null,
    dbSel:null, dbDatabase:null, _dbschema:null, _dbdbs:null, dbAddOpen:false, _dbtest:'',
    _dbTable:null, _dbTableData:null, _dbEdits:{}, _dbRowBusy:null, _dbDelRow:null, _dbRowMsg:'', _dbOffset:0, _dbOrderBy:'', _dbOrderDir:'', _dbNewOpen:false, _dbNewRow:{},
    dbForm:{name:'',type:'postgres',host:'localhost',port:'5432',database:'',user:'',password:'',file:''},
    agentInput:'', _agentBusy:false, consoleInput:'', _todos:null, todoInput:'', noteInput:'', linkInput:'', linkAdd:false,
    _readme:null, docQuery:'', schInput:'', dbSql:'', dbAsk:'', dbAgentBusy:false, _dbresult:null, _dbConfirm:null, backupsOpen:false, _backups:null,
    _servers:null, _sshKeys:null, srvAddOpen:false, _srvtest:'', srvRootInput:'', srvForm:{name:'',host:'',user:'',port:'22',key:'',roots:[]}, _srvTerm:null, srvTermInput:'', _uniSrvSel:null, uniRemotePath:'', _toast:null, _confirm:null,
    leftCollapsed:false, rightCollapsed:false,
    schAddOpen:false, _schResult:'', schForm:{name:'',prompt:'',agentId:'',type:'weekly',weekday:'1',hour:'9',minute:'0'},
    consoleH:180, agentFormOpen:false, agentForm:{id:'',name:'',prompt:'',color:'#61dcff',p1:'',p2:'',p3:''} };

  NOTES = { haci:['Yol tarifi v1\'de yok — sonraya','Kalıcı oturum: ilk girişten sonra login istenmez','Vital mock verisi sadece nabza indirilecek'], sales:['DuckDuckGo araması — API key gerektirmiyor','Web UI: python web_app.py'], core:['flux ile aynı kod tabanı','Son commit: Aralık 2025'], kyc:['Canlılık testi TurkTrust SDK ile'] };
  LINKS = { haci:[['PAP/BleBracelet','Bileklik firmware','#c77bff'],['KYC TurkTrust','Kimlik doğrulama','#61dcff']], sales:[['Core SDK','Ortak biyometri','#ffc861']], core:[['Flux','Aynı kod tabanı','#8a8fa8']], kyc:[['Hacı Takip','Kimlik modülü','#61dcff']] };

  DARK = { '#61dcff':'#1a6b8f', '#55e88b':'#1c6b45', '#c77bff':'#5b2f83', '#ffc861':'#8a6410', '#8a8fa8':'#3a3e52', '#ff6b7a':'#8a2d3a' };
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
    { id:'atlas', name:'ATLAS', role:'CTO · Risk & Durum', color:'#61dcff', avatar:(window.__resources&&window.__resources.avCto)||'assets/avatar-cto.jpg', prompt:'İş evreninin durum raporunu ver', badge:0, msgs:[['u','Bugün nereye odaklanmalıyım?'],['a','3 aktif projenden Hacı Takip 21 gündür telemetri açık — en yüksek risk. Sales Agent %70, tek engel rapor kalitesi. Öneri: sabah telemetri, öğleden sonra rapor.']] },
    { id:'nav', name:'NAVIGATOR', role:'PM · Standup', color:'#ffc861', avatar:(window.__resources&&window.__resources.avNav)||'assets/avatar-navigator.jpg', prompt:'İhmal ettiklerim neler?', badge:3, msgs:[['u','İhmal ettiklerim neler?'],['a','3 uyarı: Hacı Takip (21g), Core SDK (SSL pinning bekliyor), Flux (birleştirilmedi). İlk ikisini bu hafta kapatmanı öneririm.']] },
    { id:'doc', name:'DOCUMENTOR', role:'Dokümantasyon', color:'#55e88b', avatar:(window.__resources&&window.__resources.avDoc)||'assets/avatar-documentor.jpg', prompt:'Bu projeye README yaz', badge:0, msgs:[['u','Bu projeye README yaz'],['a','Taslak hazır: başlık, kurulum, mimari ve yapılacaklar bölümleri. Onaylarsan README.md dosyasına yazarım — dosya yazma yetkim var.']] },
    { id:'forge', name:'FORGE', role:'Kod Kalitesi', color:'#ff6b7a', avatar:(window.__resources&&window.__resources.avForge)||'assets/avatar-forge.jpg', prompt:'Teknik borcu tara', badge:0, msgs:[['u','Teknik borcu tara'],['a','Core SDK: RoleSelectView kaldırılmalı, 4 TODO açık. Sadece okurum, asla değiştirmem — düzeltmeleri sana bırakıyorum.']] },
    { id:'mentor', name:'MENTOR', role:'Kişisel Koç', color:'#c77bff', avatar:(window.__resources&&window.__resources.avMentor)||'assets/avatar-mentor.jpg', prompt:'Bu hafta için plan öner', badge:0, msgs:[['u','Bu hafta için plan öner'],['a','Pzt-Sal: Hacı Takip telemetri. Çar: Core SDK güvenlik. Per: Sales rapor. Cum: temizlik + Flux kararı. Küçük, bitirilebilir bloklar.']] },
  ];

  FILES = [
    { name:'src/', c:'#c77bff', x:30, y:34, s:44 },
    { name:'README.md', c:'#ffc861', x:66, y:30, s:40, glow:true },
    { name:'app.py', c:'#61dcff', x:70, y:64, s:34 },
    { name:'logo.png', c:'#ff6b7a', x:26, y:66, s:36 },
    { name:'config.json', c:'#55e88b', x:47, y:80, s:32 },
  ];

  componentDidMount(){
    this._key = (e) => {
      if ((e.metaKey||e.ctrlKey) && e.key.toLowerCase()==='k'){ e.preventDefault(); this.setState({palette:true}); }
      else if (e.key==='F1'){ e.preventDefault(); this.setState({_guideOpen:!this.state._guideOpen}); }
      else if (e.key==='Escape'){ if (this._asst&&this._asst.open) this._asstClose(); else if (this.state.locOpen) this.setState({locOpen:false}); else if (this.state.toolsOpen) this.closeTools(); else if (this.state._guideOpen) this.setState({_guideOpen:false}); else if (this.state._confirm) this.setState({_confirm:null}); else if (this.state.palette) this.setState({palette:false}); else if (this.state.agentId) this.setState({agentId:null}); else if (this.state.mode==='planet') this.back(); }
    };
    window.addEventListener('keydown', this._key);
    this._waitThree(0);
    this._loadReal();
    // Dil tercihi (tr/en) — ayarlardan gelir; UI metinleri buna göre çevrilir.
    this._lang='tr';
    try{ if(window.galaxy&&window.galaxy.profileGet){ window.galaxy.profileGet().then(p=>{ this._lang=(p&&p.lang)||'tr'; this._applyLang(); }); } }catch(e){ this._applyLang(); }
    // Ayarlardan yapılandırılabilir odak (Pomodoro) süresi — çalışmıyorken uygula
    this._focusDefault=1500;
    this._loadFocusPref=()=>{ try{ if(window.galaxy&&window.galaxy.settingsGet) window.galaxy.settingsGet().then(r=>{ const m=(r&&r.settings&&+r.settings.focusMin)||25; this._focusDefault=Math.max(60,m*60); if(!this.state.focusRunning) this.setState({focusSec:this._focusDefault}); }); }catch(e){} };
    this._loadFocusPref();
    // Üst bar saati — re-render'a gerek olmadan doğrudan DOM güncellemesi (her sn)
    this._barClock=setInterval(()=>{ try{ const el=document.getElementById('gx-clock'); if(el){ const d=new Date(),p=n=>String(n).padStart(2,'0'); el.textContent=p(d.getHours())+':'+p(d.getMinutes()); } }catch(e){} },1000);
    // Ayarlar penceresinde dil/odak değişince pencere focus'unda güncelle
    this._onFocus=()=>{ try{ if(window.galaxy&&window.galaxy.profileGet) window.galaxy.profileGet().then(p=>{ const l=(p&&p.lang)||'tr'; if(l!==this._lang){ this._lang=l; this._applyLang(); } }); }catch(e){} this._loadFocusPref(); };
    window.addEventListener('focus', this._onFocus);
    // Ajan yanıt akışı (Claude CLI) — {runId, kind:text|tool|err|done, text}
    try{ if(window.galaxy&&window.galaxy.onAgent){ window.galaxy.onAgent(m=>this._onAgentMsg(m)); } }catch(e){}
    // Konsol akışları (Claude CLI + Bash shell)
    try{ if(window.galaxy&&window.galaxy.onClaude){ window.galaxy.onClaude(m=>{ if(m&&String(m.runId||'').indexOf('asst-')===0){ this._asstClaudeMsg(m); return; } const pid=this._pidFromRun(m&&m.runId); this._appendOut(this._con(pid).cout,m); }); } }catch(e){}
    try{ if(window.galaxy&&window.galaxy.onShell){ window.galaxy.onShell(m=>{ const sid=String((m&&m.id)||''); if(sid.indexOf('asst-sh-')===0){ this._asstShellMsg(m); return; } if(sid.indexOf('srvterm')===0){ this._sbout=this._sbout||[]; this._appendOut(this._sbout,m); } else { const pid=this._pidFromShell(m&&m.id); this._appendOut(this._con(pid).bout,m); } }); } }catch(e){}
    try{ this._initAssistant(); }catch(e){}
    try{ if(window.galaxy&&window.galaxy.onUpdate){ window.galaxy.onUpdate((kind,p)=>this._onUpdate(kind,p)); } }catch(e){}
    try{ if(window.galaxy&&window.galaxy.onDockerLog){ window.galaxy.onDockerLog(m=>this._onDockerLog(m)); } }catch(e){}
    try{ if(window.galaxy&&window.galaxy.onScheduleDone){ window.galaxy.onScheduleDone(m=>this._onScheduleDone(m)); } }catch(e){}
  }
  // ---------- KONSOL (Claude / Bash) — PROJE BAZLI ----------
  // Her projenin kendi bash/claude çıktısı + komut geçmişi (proje değişince karışmaz, silinmez).
  _con(pid){ this._consoles=this._consoles||{}; return this._consoles[pid]||(this._consoles[pid]={bout:[],cout:[],bhist:[],chist:[]}); }
  // Gelen mesajı VERİLEN diziye ekle (satır ayrıştırma). arr: hedef çıktı dizisi.
  _appendOut(arr,m){
    if(!m||!arr) return;
    const k=m.kind||'out', t=(m.text!=null?m.text:(m.data!=null?m.data:''));
    const pushLines=(txt,joinFirst)=>{ const parts=String(txt).split('\n');
      if(joinFirst){ const last=arr[arr.length-1]; if(last&&last.t==='o') last.x+=parts[0]; else arr.push({t:'o',x:parts[0]}); }
      else arr.push({t:'o',x:parts[0]});
      for(let i=1;i<parts.length;i++) arr.push({t:'o',x:parts[i]}); };
    if(k==='text'){ pushLines(t,true); }               // Claude: kısmi token'ları birleştir
    else if(k==='out'||k==='data'){ pushLines(t,false); } // shell: her satır ayrı
    else if(k==='tool'){ arr.push({t:'tool',x:'▸ '+t}); }
    else if(k==='err'){ if(!this._cliNoise(t)) arr.push({t:'err',x:t}); }
    else if(k==='done'){ arr.push({t:'done',x:'── bitti ──'}); }
    else if(k==='exit'){ const c=(m.code!=null&&m.code!==0)?(' (kod '+m.code+')'):''; arr.push({t:'err',x:'── bağlantı kapandı'+c+' ──'}); }
    else { arr.push({t:'o',x:t}); }
    this.setState({_cov:(this.state._cov||0)+1});
    this._scrollBottom(this.state._srvTerm?'#ghud-srvterm-scroll':'#ghud-console-scroll');
  }
  // shellId / runId'den proje id'sini çıkar (mesaj hangi projeye ait)
  _pidFromShell(id){ return String(id||'').replace(/^sh-/,''); }
  _pidFromRun(id){ return String(id||'').replace(/^c\d+-/,''); }
  onConsoleInput(e){ this._histIdx=null; this.setState({consoleInput:(e&&e.target&&e.target.value)||''}); }
  onConsoleKey(e){
    if(e.key==='Enter'){ e.preventDefault&&e.preventDefault(); this.sendConsole(); return; }
    if(e.key==='Tab'){ e.preventDefault&&e.preventDefault(); this._complete(); return; }
    if(e.key==='ArrowUp'){ e.preventDefault&&e.preventDefault(); this._histNav(-1); return; }
    if(e.key==='ArrowDown'){ e.preventDefault&&e.preventDefault(); this._histNav(1); return; }
  }
  // Komut geçmişi (yukarı/aşağı) — proje + sekme bazlı
  _histNav(dir){ const con=this._con(this.sel&&this.sel.id); const hist=this.state.consoleTab==='bash'?con.bhist:con.chist; if(!hist.length) return;
    if(this._histIdx==null) this._histIdx=hist.length;
    this._histIdx=Math.max(0,Math.min(hist.length,this._histIdx+dir));
    const val=this._histIdx>=hist.length?'':hist[this._histIdx];
    this.setState({consoleInput:val}); }
  _commonPrefix(arr){ if(!arr.length) return ''; let p=arr[0]; for(const s of arr){ let i=0; while(i<p.length&&i<s.length&&p[i]===s[i]) i++; p=p.slice(0,i); } return p; }
  // Tab tamamlama (bash) — son token'ı dosya/klasör adıyla tamamla
  async _complete(){ if(this.state.consoleTab!=='bash') return; const p=this.sel; const text=String(this.state.consoleInput||''); const cwd=p&&p._path;
    if(!cwd||!window.galaxy||!window.galaxy.shellComplete) return;
    const m=text.match(/(\S*)$/); const token=m?m[1]:''; const before=text.slice(0,text.length-token.length);
    const sid='sh-'+(p&&p.id||'');
    try{ const r=await window.galaxy.shellComplete({shellId:sid,cwd,token}); const matches=(r&&r.matches)||[]; const dirPart=(r&&r.dirPart)||'';
      if(!matches.length) return;
      if(matches.length===1){ this.setState({consoleInput:before+dirPart+matches[0]}); }
      else { const common=this._commonPrefix(matches);
        if(common && (dirPart+common).length>token.length) this.setState({consoleInput:before+dirPart+common});
        this._con(p&&p.id).bout.push({t:'o',x:matches.join('   ')}); this.setState({_cov:(this.state._cov||0)+1}); this._scrollBottom('#ghud-console-scroll'); }
    }catch(e){} }
  sendConsole(){
    const text=String(this.state.consoleInput||'').trim(); if(!text) return;
    const p=this.sel, cwd=p&&p._path; const con=this._con(p&&p.id);
    // komut geçmişi — proje + sekme bazlı
    const hk=this.state.consoleTab==='bash'?'bhist':'chist'; if(con[hk][con[hk].length-1]!==text) con[hk].push(text); con[hk]=con[hk].slice(-100); this._histIdx=null;
    this.setState({consoleInput:''});
    if(this.state.consoleTab==='bash'){
      con.bout.push({t:'in',x:'$ '+text});
      const sid='sh-'+(p&&p.id||'');   // PROJE BAZLI shell — her projenin kendi oturumu (cd/env kalıcı)
      try{ if(window.galaxy&&window.galaxy.shellStart){ window.galaxy.shellStart({shellId:sid,cwd}); } if(window.galaxy&&window.galaxy.shellInput){ window.galaxy.shellInput({shellId:sid,cwd,cmd:text}); } else con.bout.push({t:'err',x:'(shell bu ortamda yok)'}); }catch(e){}
    } else {
      con.cout.push({t:'in',x:'> '+text});
      if(!cwd){ con.cout.push({t:'err',x:'önce bir projeye gir (klasör yolu gerekli)'}); }
      else { const runId='c'+((this._cc=(this._cc||0)+1))+'-'+p.id;
        this._claudeSess=this._claudeSess||{}; const cont=!!this._claudeSess[p.id]; this._claudeSess[p.id]=true;
        try{ if(window.galaxy&&window.galaxy.claudeRun){ window.galaxy.claudeRun({runId,cwd,prompt:text,continueSession:cont}); } else con.cout.push({t:'err',x:'(claude bu ortamda yok)'}); }catch(e){} }
    }
    this.setState({_cov:(this.state._cov||0)+1}); this._scrollBottom('#ghud-console-scroll');
  }
  // ---------- AJAN SOHBETİ ----------
  _cliNoise(t){ return /no stdin data received|proceeding without it|redirect stdin|dev\/null to skip/i.test(String(t||'')); }
  _onAgentMsg(m){
    if(!m||!this._runAgents) return; const aid=this._runAgents[m.runId]; if(!aid) return;
    const ag=this.AGENTS.find(a=>a.id===aid); if(!ag) return;
    if(m.kind==='text'){ const last=ag.msgs[ag.msgs.length-1]; if(last&&last[0]==='a') last[1]+=m.text; else ag.msgs.push(['a',m.text]); }
    else if(m.kind==='tool'){ ag.msgs.push(['t','⚙ '+m.text]); }
    else if(m.kind==='err'){ if(!this._cliNoise(m.text)) ag.msgs.push(['a','⚠ '+m.text]); }
    else if(m.kind==='done'){ this.setState({_agentBusy:false}); delete this._runAgents[m.runId]; }
    this.setState({_agv:(this.state._agv||0)+1});
    this._scrollBottom('#ghud-agent-scroll');
  }
  _scrollBottom(sel){ try{ setTimeout(()=>{ const el=document.querySelector(sel); if(el) el.scrollTop=el.scrollHeight; },40); }catch(e){} }
  _focusConsole(){ this._scrollBottom('#ghud-console-scroll'); try{ setTimeout(()=>{ const i=document.querySelector('#ghud-console-input'); if(i) i.focus(); },70); }catch(e){} }
  onConsoleResize(e){ if(e&&e.preventDefault)e.preventDefault(); const startY=(e&&e.clientY)||0, startH=this.state.consoleH||180;
    const mv=(ev)=>{ this.setState({consoleH:Math.max(120,Math.min(640,startH+(startY-ev.clientY)))}); };
    const up=()=>{ document.removeEventListener('mousemove',mv); document.removeEventListener('mouseup',up); };
    document.addEventListener('mousemove',mv); document.addEventListener('mouseup',up); }
  // ---------- i18n (tr↔en) — render sonrası DOM cümle değişimi ----------
  _enMapObj(){ return {
    'GENEL BAKIŞ':'OVERVIEW','EVREN':'UNIVERSE','PANO':'BOARD','DOCKER':'DOCKER','ZAMANLAYICI':'SCHEDULER','SUNUCULAR':'SERVERS','DB':'DB',
    'PROJELER':'PROJECTS','İSTASYON':'STATION','Evrenini seç':'Choose your universe',
    'Her evren bir galaksi: içindeki proje klasörleri gezegen, projeleri barındıran çatı klasörler yıldız sistemi olur.':'Each universe is a galaxy: its project folders are planets, and the parent folders that hold them are star systems.',
    'YENİ EVREN EKLE':'ADD UNIVERSE','yerel klasör · uzak sunucu':'local folder · remote server','Evreni kaldır':'Remove universe',
    'Docker Merkezi':'Docker Center','Konteynerler':'Containers','İmajlar':'Images','+ Sunucu Ekle':'+ Add Server','+ Bağlantı':'+ Connection','+ Ekle':'+ Add',
    'Veritabanı':'Database','SQL Sorgu · SELECT':'SQL Query · SELECT','Çalıştır':'Run','Test':'Test','Kaydet':'Save','İptal':'Cancel','Ad (ör. Prod DB)':'Name (e.g. Prod DB)','Sunucu (host)':'Host','Port':'Port','Veritabanı adı':'Database name','Kullanıcı':'User','Parola':'Password','SQLite dosya yolu':'SQLite file path',
    'Pano':'Board','Bekliyor':'To Do','Devam':'In Progress','Tamam':'Done','Yeni görev ekle (Enter)…':'Add a task (Enter)…',
    'Zamanlayıcı · Otomatik Görevler':'Scheduler · Automated Tasks','Yeni otomatik görev (Enter)…':'New automated task (Enter)…','ÇALIŞTIR':'RUN','AKTİF':'ACTIVE','DURDU':'STOPPED',
    'Sunucular · Uzak Evrenler':'Servers · Remote Universes','SSH ile uzak bir sunucu bağla; klasörleri yerel evrenler gibi galakside gezilir.':'Connect a remote server via SSH; its folders are browsed in the galaxy like local universes.','⟳ Tara':'⟳ Scan','Ad (ör. Prod Sunucu)':'Name (e.g. Prod Server)',
    'İLERLEME':'PROGRESS','PLAN':'PLAN','NOTLAR':'NOTES','BAĞLANTILAR':'LINKS','ODAK':'FOCUS','KAYIT':'RECORD','AĞAÇ':'TREE','GİT':'GIT','📁 Klasörü Aç':'📁 Open Folder','Kaldır':'Remove','Hızlı not ekle… (Enter)':'Quick note… (Enter)','Gezegene İn ▸':'Land on Planet ▸','UZAY':'SPACE','README':'README','komut / istem yaz, Enter\'a bas…':'type a command / prompt, press Enter…','proje kökü':'project root','belgede ara…':'search in doc…','Yapılacaklar':'To Do','Günlük':'Log','ÇİFT TIK DÜZENLE':'DOUBLE-CLICK TO EDIT',
    'BAĞLAM: Tüm evren':'CONTEXT: All universes','Sil':'Delete','Durum ver':'Give status','Yeni ajan ekle':'Add new agent',
    'GİT MERKEZİ':'GIT CENTER','DURUM':'STATUS','TAKIM AKIŞI':'TEAM FLOW','GEÇMİŞ':'HISTORY','GIT FLOW REHBERİ':'GIT FLOW GUIDE','Temel Git Komutları · ne işe yarar':'Basic Git Commands · what they do','Feature-branch Akışı':'Feature-branch Flow',
    'Proje ara ya da komut…':'Search projects or command…','Ayarlar':'Settings','Yedekler':'Backups','Git Flow Rehberi':'Git Flow Guide',
    'YEDEKLER':'BACKUPS','Geri Yükle':'Restore','Henüz yedek yok.':'No backups yet.',
    'README YOK (3)':'NO README (3)','GİZLENENLER (1)':'HIDDEN (1)',
    'Sol paneli aç/kapat':'Toggle left panel','Sağ paneli aç/kapat':'Toggle right panel',
    'gezegen':'planets','sistem':'systems','aktif':'active','Kapat (ESC)':'Close (ESC)',
    'F1 Rehber · ⌘K Komut · ⌘G Not':'F1 Guide · ⌘K Command · ⌘G Note','F1 Rehber · ⌘K Komut · ⌘⇧G Not':'F1 Guide · ⌘K Command · ⌘⇧G Note','Ara':'Search',
    'F1 Rehber':'F1 Guide','⌘K Komut':'⌘K Command','⌘G Not':'⌘G Note','Komut':'Command','Not':'Note','Genel Bakış':'Overview','Projeler':'Projects',
    'AKTİF':'ACTIVE','BEKLEMEDE':'PENDING','TAMAMLANDI':'DONE','ARŞİV':'ARCHIVE','KEŞFEDİLMEMİŞ':'UNEXPLORED','SÜRÜKLE:GEZ':'DRAG:PAN',
    'Docker çalışıyor':'Docker running','konteyner':'containers','çalışıyor':'running','imaj':'images','Yenile':'Refresh','Başlat':'Start','LOG':'LOG','SİL':'DELETE','Docker motoru durdu — başlatmak için ▸ tıkla':'Docker engine stopped — click ▸ to start','Henüz veritabanı bağlantısı yok.':'No database connection yet.','Postgres':'Postgres','MySQL':'MySQL','SQLite':'SQLite',
    'Bir bash komutu yaz — bu projenin klasöründe çalışır.':'Type a bash command — runs in this project folder.','Claude\'a bir şey yaz — bu projenin klasöründe çalışır, dosya okur/yazar.':'Type to Claude — runs in this project folder, reads/writes files.','Yeni evren':'New universe','Henüz uzak sunucu yok.':'No remote server yet.',
    // Git rehberi
    'Dallanma modeli — git\'i hiç bilmeyen biri için. Her nokta bir commit, kesikli oklar dallanma/birleşmedir.':'Branching model — for someone new to git. Each dot is a commit, dashed arrows are branch/merge.',
    'Temel Git Komutları · ne işe yarar':'Basic Git Commands · what they do','BAŞLANGIÇ & DURUM':'GETTING STARTED & STATUS','DEĞİŞİKLİKLERİ KAYDETME':'SAVING CHANGES','DALLANMA (BRANCH)':'BRANCHING','UZAK SUNUCU (REMOTE)':'REMOTE','GERİ ALMA':'UNDO','İNCELEME':'INSPECT','Feature-branch Akışı':'Feature-branch Flow',
    'git init — bu klasörde yeni git deposu başlat':'git init — start a new git repo in this folder','git clone <url> — uzak depoyu bilgisayarına kopyala':'git clone <url> — copy a remote repo to your computer','git status — hangi dosyalar değişti/eklendi göster':'git status — show which files changed/added','git log --oneline — commit geçmişini kısa listele':'git log --oneline — list commit history briefly',
    'git add . — tüm değişiklikleri sahneye al (commit\'e hazırla)':'git add . — stage all changes (prepare to commit)','git commit -m "mesaj" — sahnedekileri kalıcı kaydet':'git commit -m "message" — permanently save staged changes','git commit --amend — son commit\'i düzelt/mesajını değiştir':'git commit --amend — fix the last commit / change its message','git diff — henüz kaydedilmemiş satır farklarını gör':'git diff — see unsaved line changes',
    'git branch — mevcut dalları listele':'git branch — list branches','git switch -c <dal> — yeni dal aç ve o dala geç':'git switch -c <branch> — create a branch and switch to it','git switch <dal> — var olan bir dala geç':'git switch <branch> — switch to an existing branch','git merge <dal> — o dalı bulunduğun dala birleştir':'git merge <branch> — merge that branch into current','git branch -d <dal> — işi biten dalı sil':'git branch -d <branch> — delete a finished branch',
    'git remote -v — bağlı uzak adresleri göster':'git remote -v — show connected remotes','git fetch — uzaktaki yenilikleri indir (birleştirmeden)':'git fetch — download remote updates (without merging)','git pull — uzaktakini indir + kendi dalınla birleştir':'git pull — download + merge into your branch','git push — kendi commit\'lerini uzağa gönder':'git push — send your commits to remote','git push -u origin <dal> — dalı ilk kez gönder ve takibe al':'git push -u origin <branch> — push a branch the first time and track it',
    'git restore <dosya> — dosyadaki kaydedilmemiş değişikliği geri al':'git restore <file> — discard unsaved changes in a file','git restore --staged <dosya> — dosyayı sahneden çıkar':'git restore --staged <file> — unstage a file','git reset --soft HEAD~1 — son commit\'i geri al (değişiklikler durur)':'git reset --soft HEAD~1 — undo last commit (keep changes)','git revert <hash> — bir commit\'i tersine çeviren yeni commit':'git revert <hash> — a new commit that reverses one','git show <hash> — bir commit\'in tüm detayını gör':'git show <hash> — see full detail of a commit','git blame <dosya> — her satırı kim/ne zaman değiştirmiş':'git blame <file> — who/when changed each line','git diff <dal1>..<dal2> — iki dal arasındaki farkı gör':'git diff <b1>..<b2> — see the difference between two branches','İpucu: bir şeyi bozmaktan korkma — commit\'lenmiş her şey geri alınabilir.':'Tip: don\'t fear breaking things — anything committed can be undone.',
    // Scheduler + ajan form
    '+ Yeni Otomatik Görev':'+ New Automated Task','SIKLIK':'FREQUENCY','Her gün':'Daily','Haftalık':'Weekly','GÜN':'DAY','SAAT':'TIME','AJAN':'AGENT','Görev adı (ör. Haftalık rapor)':'Task name (e.g. Weekly report)','Ne yapsın? (ör. bana bu haftanın ilerleme raporunu çıkar)':'What should it do? (e.g. give me this week\'s progress report)',
    'Hazır komutlar':'Quick commands','Yeni ajan ekle':'Add new agent','Düzenle':'Edit','Ajanı düzenle':'Edit agent','Ajanı sil':'Delete agent','Yeni Ajan':'New Agent','Ajanı Düzenle':'Edit Agent','Ajan Adı':'Agent Name','Sistem Promptu — ajan ne yapar, nasıl davranır?':'System prompt — what the agent does, how it behaves','3 Hazır Komut (opsiyonel — panelde tıklanabilir görünür)':'3 quick commands (optional — clickable in the panel)',
    'Klasörü Aç':'Open Folder','Aç':'Open','Sürükle: konsolu büyüt/küçült':'Drag: resize console','İşlem Günlüğü':'Operation Log',
    'VERİTABANI:':'DATABASE:','temizle ✕':'clear ✕','temizle':'clear','✓ Her işlem loglanır · parolalar safeStorage ile şifreli':'✓ Every operation is logged · passwords encrypted with safeStorage','SQL / İşlem · SELECT + INSERT / UPDATE / DELETE':'SQL / Operation · SELECT + INSERT / UPDATE / DELETE','SQL Sorgu · SELECT':'SQL Query · SELECT','satır etkilendi':'rows affected','kayıtlı':'saved','veritabanı':'database','🤖 AI Veritabanı Ajanı · ne istediğini doğal dille yaz':'🤖 AI Database Agent · describe what you want in plain language','⚡ Sor':'⚡ Ask',
    'Durum okuması:':'Status:','Commit\'lenmemiş dosyalar':'Uncommitted files','✓ Temiz — commit\'lenecek dosya yok.':'✓ Clean — nothing to commit.','Bu depoda henüz commit yok.':'No commits in this repository yet.',
    'Katkı dağılımı':'Contribution breakdown','Son işlemler · kim yaptı':'Recent operations · who','Henüz commit yok — takım akışı grafiği için önce commit üret.':'No commits yet — make a commit first to see the team-flow graph.',
    'Tipik feature akışı · 6 adım':'Typical feature flow · 6 steps',
    '↗ Harici uygulamada aç':'↗ Open in external app','yükleniyor…':'loading…','Bu dosya app içinde önizlenemiyor.':'This file can\'t be previewed in-app.','Dosya okunamadı.':'Could not read file.','◂ üst klasör':'◂ parent folder'
  }; }
  _applyLang(){
    const en=this._lang==='en'; const map=en?(this._enMap||(this._enMap=this._enMapObj())):null;
    const rev=(!en)?(this._trMap||(this._trMap=(()=>{const o={},m=this._enMapObj();for(const k in m)o[m[k]]=k;return o;})())):null;
    const dict=en?map:rev; if(!dict) return;
    // Büyük/küçük harf duyarsız (CSS text-transform:uppercase etiketleri DOM'da karışık-harf)
    const low=this[en?'_lowEn':'_lowTr']||(this[en?'_lowEn':'_lowTr']=(()=>{const o={};for(const k in dict)o[k.toLowerCase()]=dict[k];return o;})());
    const tr=(s)=>{ if(!s) return null; const r=low[s.trim().toLowerCase()]; return (r!=null&&r.toLowerCase()!==s.trim().toLowerCase())?r:null; };
    if(this._langObs) this._langObs.disconnect();
    const walk=(n)=>{ if(!n) return;
      if(n.nodeType===3){ const v=n.nodeValue, k=v&&v.trim(); const rep=tr(k); if(rep!=null) n.nodeValue=v.replace(k,rep); }
      else if(n.nodeType===1){ if(n.tagName==='SCRIPT'||n.tagName==='STYLE'||n.tagName==='CANVAS') return;
        // dinamik kullanıcı/repo verisi taşıyan alanları çevirme (proje adı, not, commit, dosya adı, DB hücresi… yanlış çeviri olmasın)
        if(n.hasAttribute&&n.hasAttribute('data-noi18n')) return;
        try{ const pr=tr(n.placeholder); if(pr!=null) n.placeholder=pr; }catch(e){}
        try{ const ti=tr(n.title); if(ti!=null) n.title=ti; }catch(e){}
        for(const c of n.childNodes) walk(c); } };
    try{ walk(document.body); }catch(e){}
    this._langObs=this._langObs||new MutationObserver(()=>{ clearTimeout(this._langT); this._langT=setTimeout(()=>this._applyLang(),90); });
    try{ this._langObs.observe(document.body,{childList:true,subtree:true,characterData:true}); }catch(e){}
  }
  // ---------- MARKDOWN-LITE (ajan çıktısı + README güzel görünsün) ----------
  _mdSegs(s){ const out=[]; const re=/(\*\*([^*]+)\*\*|`([^`]+)`)/g; let last=0,m;
    while((m=re.exec(s))){ if(m.index>last) out.push({t:s.slice(last,m.index),style:'color:inherit'});
      if(m[2]!=null) out.push({t:m[2],style:'color:#dbe4ff;font-weight:600'});
      else out.push({t:m[3],style:'color:#8ae7ff;font-family:JetBrains Mono,monospace;background:rgba(97,220,255,.1);padding:1px 5px;border-radius:3px'});
      last=re.lastIndex; }
    if(last<s.length) out.push({t:s.slice(last),style:'color:inherit'});
    if(!out.length) out.push({t:s||' ',style:'color:inherit'}); return out; }
  _mdLines(text){ const st=(t)=>({h1:'font-size:15px;font-weight:700;color:#dbe4ff;margin:12px 0 6px',h2:'font-size:14px;font-weight:600;color:#dbe4ff;margin:12px 0 5px;border-bottom:1px solid rgba(190,205,255,.12);padding-bottom:4px',h3:'font-size:13px;font-weight:600;color:#8ae7ff;margin:10px 0 4px',li:'padding-left:16px;position:relative;margin:3px 0',task:'margin:3px 0;color:#8b96b8',p:'margin:5px 0',blank:'height:6px'}[t]||'margin:5px 0');
    return String(text||'').split('\n').map(ln=>{ let type='p',content=ln,bullet='';
      if(!ln.trim()) return {type:'blank',lineStyle:st('blank'),bullet:'',segs:[{t:'',style:''}]};
      if(/^###\s/.test(ln)){type='h3';content=ln.replace(/^###\s/,'');}
      else if(/^##\s/.test(ln)){type='h2';content=ln.replace(/^##\s/,'');}
      else if(/^#\s/.test(ln)){type='h1';content=ln.replace(/^#\s/,'');}
      else if(/^\s*[-*]\s+\[[ xX]\]\s*/.test(ln)){type='task';const done=/\[[xX]\]/.test(ln);content=ln.replace(/^\s*[-*]\s+\[[ xX]\]\s*/,'');bullet=done?'✓ ':'○ ';}
      else if(/^\s*[-*]\s+/.test(ln)){type='li';content=ln.replace(/^\s*[-*]\s+/,'');bullet='•';}
      else if(/^\s*\d+\.\s+/.test(ln)){type='li';content=ln.replace(/^\s*\d+\.\s+/,'');bullet='›';}
      return {type,lineStyle:st(type),bullet,segs:this._mdSegs(content)}; }); }
  onAgentInput(e){ this.setState({agentInput:(e&&e.target&&e.target.value)||''}); }
  onAgentKey(e){ if(e.key==='Enter'&&!e.shiftKey){ e.preventDefault&&e.preventDefault(); this.sendAgent(); } }
  sendAgent(){
    const text=String(this.state.agentInput||'').trim(); if(!text) return;
    const ag=this.AGENTS.find(a=>a.id===this.state.agentId); if(!ag) return;
    ag.msgs.push(['u',text]); ag.msgs.push(['a','']);
    const runId='r'+(this._rc=(this._rc||0)+1)+'-'+ag.id;
    this._runAgents=this._runAgents||{}; this._runAgents[runId]=ag.id;
    this._agentSess=this._agentSess||{}; const cont=!!this._agentSess[ag.id]; this._agentSess[ag.id]=true;
    this.setState({agentInput:'',_agentBusy:true}); this._scrollBottom('#ghud-agent-scroll');
    // Bağlam: gezegen (proje) görünümündeyse O projeye odakla; genel bakış/uzayda TÜM evren bağlamı (projectId yok).
    const ctxProjectId=(this.state.mode==='planet'&&this.sel&&this.sel.id)?this.sel.id:null;
    try{ if(window.galaxy&&window.galaxy.agentRun){ window.galaxy.agentRun({runId,agentId:ag.id,prompt:text,projectId:ctxProjectId,continueSession:cont}); }
      else { ag.msgs[ag.msgs.length-1][1]='(ajan çalıştırma bu ortamda yok)'; this.setState({_agentBusy:false}); } }catch(e){ this.setState({_agentBusy:false}); }
  }

  // ========== GERÇEK VERİ KÖPRÜSÜ (window.galaxy) ==========
  // Mockup'ın sabit örnek verisini gerçek projelerinle değiştirir. window.galaxy
  // yoksa (tarayıcı önizlemesi) örnek veri kalır. Render/stil mantığına dokunmaz;
  // yalnızca PROJECTS/AGENTS/universes gibi KAYNAKLARI canlı veriyle doldurur.
  _statusMap(s){ return ({active:'active',doing:'active',done:'done',archive:'paused',paused:'paused',idle:'paused',waiting:'waiting',unknown:'new','':'new'})[s]||'new'; }
  _mapPlan(plan){ return (plan||[]).map(p=>Array.isArray(p)?[String(p[0]),!!p[1]]:[String(p.text||''),!!p.done]); }
  _mapProject(p){
    return { id:p.id, name:p.name, status:this._statusMap(p.status), prog:p.progress||0,
      warn:(p.staleDays||0)>=21, orbit:true,
      branch:(p.git&&p.git.branch)||'—', stage:p.stage||'', desc:p.desc||'',
      plan:this._mapPlan(p.plan), group:p.group||'Diğer', universe:p.universe,
      _notes:p.notes||'', _links:p.links||[], _path:p.path||'', _git:p.git||null, _stale:p.staleDays||0, _readme:!!p.hasReadme };
  }
  _avatar(name,color){
    const init=String(name||'?').trim().replace(/[^A-Za-zÇĞİÖŞÜçğıöşü0-9]/g,'').slice(0,2).toUpperCase()||'AI';
    // ÖNEMLİ: dc, style'ı `;` üzerinden böldüğü için data-URI'de `;` OLAMAZ (base64/utf8 çalışmaz).
    // Bu yüzden `;` içermeyen `data:image/svg+xml,` + percent-encode kullanılır. SVG çift tırnaklı,
    // gradient/paren yok → url('...') içinde tırnak/paren çakışması olmaz.
    const svg='<svg xmlns="http://www.w3.org/2000/svg" width="96" height="96">'
      +'<rect width="96" height="96" fill="#0a0e1a"/>'
      +'<circle cx="48" cy="48" r="46" fill="'+color+'" opacity="0.20"/>'
      +'<text x="48" y="61" font-family="JetBrains Mono,monospace" font-size="34" font-weight="700" fill="'+color+'" text-anchor="middle">'+init+'</text></svg>';
    return 'data:image/svg+xml,'+encodeURIComponent(svg);
  }
  _mapAgent(a){ const c=a.color||'#61dcff'; const av=(window.__resources&&window.__resources['av'+(a.id||'')])||this._avatar(a.name,c);
    const presets=(a.presets||[]).map(p=>typeof p==='string'?{label:p,ask:p}:{label:p.label||p.ask||'',ask:p.ask||p.label||''}).filter(p=>p.ask).slice(0,3);
    return { id:a.id, name:a.name, role:a.role||'', color:c, avatar:av, prompt:(presets[0]&&presets[0].ask)||'Durum ver', presets, sys:a.prompt||'', write:!!a.write, badge:0, msgs:[] }; }
  sendPreset(ask){ if(!ask) return; this.setState({agentInput:ask}); setTimeout(()=>this.sendAgent(),30); }
  _hue(s){ let h=0; s=String(s||''); for(let i=0;i<s.length;i++) h=(h*31+s.charCodeAt(i))%360; return h; }
  _layout(list){
    // Gerçek projeleri gruplarına (sektör) göre kümele; her sektör bir bölge.
    const groups={}; list.forEach(p=>{(groups[p.group]=groups[p.group]||[]).push(p);});
    const keys=Object.keys(groups), gN=keys.length||1;
    keys.forEach((g,gi)=>{
      const ang=(gi/gN)*Math.PI*2 - Math.PI/2;
      const cx=50+Math.cos(ang)*(gN>1?27:0), cy=50+Math.sin(ang)*(gN>1?30:0);
      const arr=groups[g], n=arr.length;
      arr.forEach((p,pi)=>{
        const a2=(pi/Math.max(1,n))*Math.PI*2, rad=n>1?(8+(pi%3)*4):0;
        p.x=Math.max(9,Math.min(91, cx+Math.cos(a2)*rad));
        p.y=Math.max(14,Math.min(82, cy+Math.sin(a2)*rad*0.82));
        p.size=Math.round(58 + (p.prog/100)*64 + (p.status==='active'?18:0));
        p._sector=g;
      });
    });
    return list;
  }
  _buildUnis(scan){
    const projs=scan.projects||[];
    return (scan.universes||[]).map(u=>{
      const up=projs.filter(p=>p.universe===u.id);
      const systems=new Set(up.map(p=>p.group).filter(g=>g&&g!=='Keşfedilmemiş')).size;
      const active=up.filter(p=>p.status==='active'||p.status==='doing').length;
      const hue=this._hue(u.id||u.name);
      return { id:u.id, name:u.name, path:u.subtitle||'', planets:up.length, systems, active, color:`hsl(${hue},72%,62%)`, _hue:hue };
    });
  }
  async _loadReal(){
    if(!(window.galaxy&&window.galaxy.load)){ this.setState({loaded:'preview'}); return; }
    try{
      const scan=await window.galaxy.load();
      this._scan=scan;
      this._allProjects=(scan.projects||[]).map(p=>this._mapProject(p));
      this._unis=this._buildUnis(scan);
      const agents=(scan.agents||[]).map(a=>this._mapAgent(a));
      if(agents.length) this.AGENTS=agents;
      const uniId=(this._unis[0]&&this._unis[0].id)||null;
      this._applyUni(uniId);
      this.setState({loaded:true, uniId, selId:(this.PROJECTS[0]&&this.PROJECTS[0].id)||this.state.selId});
      this._loadSecondary();
      this._asstMaybeDailyBrief();   // günde bir kez: dijital ikiz sabah brifingi
    }catch(e){ console.error('[newui] veri yüklenemedi',e); this.setState({loaded:'error'}); }
  }
  _applyUni(uniId){
    const list=(this._allProjects||[]).filter(p=>p.universe===uniId);
    // Boş evren de olsa PROJECTS'i güncelle (eski evrenin gezegenleri sızmasın)
    this._layout(list); this.PROJECTS=list;
  }
  selectUni(uniId){ this._applyUni(uniId); this.setState({uniId, tab:'evren', mode:'space', agentId:null, _fsCwd:'', _preview:null, selId:(this.PROJECTS[0]&&this.PROJECTS[0].id)||this.state.selId}); this._loadGit(); this._loadTodos(); }
  // Aramadan bir projeye git: gerekirse evreni değiştir, seç, gezegen görünümüne gir.
  _gotoProject(pid){
    const all=this._allProjects||this.PROJECTS; const p=all.find(x=>x.id===pid); if(!p) return;
    if(p.universe && p.universe!==this.state.uniId){ this._applyUni(p.universe); }
    this.setState({uniId:p.universe||this.state.uniId, selId:pid, tab:'evren', mode:'planet', palette:false, query:'', _fsCwd:'', _preview:null});
    this._loadGit();
  }
  onSearch(e){ this.setState({query:(e&&e.target&&e.target.value)||''}); }
  onSearchKey(e){ if(e.key==='Enter'){ const q=String(this.state.query||'').toLocaleLowerCase('tr').replace(/ı/g,'i');
    const all=this._allProjects||this.PROJECTS; const hit=all.find(p=>!q||String(p.name).toLocaleLowerCase('tr').replace(/ı/g,'i').includes(q));
    if(hit) this._gotoProject(hit.id); } else if(e.key==='Escape'){ this.setState({palette:false,query:''}); } }
  async _loadSecondary(){
    this._loadDocker();
    try{ if(window.galaxy.scheduleList){ this.setState({_sched:(await window.galaxy.scheduleList())||[]}); } }catch(e){}
    this._loadDb();
    this._loadTodos();
    this._loadServers();
    this._loadReports();
  }
  // ---------- Zamanlanmış görev raporları ----------
  async _loadReports(){ try{ if(window.galaxy&&window.galaxy.reports){ this.setState({_reports:(await window.galaxy.reports())||[]}); } }catch(e){} }
  async openReport(name){ if(!name||!window.galaxy||!window.galaxy.report) return;
    this.setState({_reportView:{name,content:null}});
    try{ const c=await window.galaxy.report(name); this.setState({_reportView:{name,content:c||'(boş)'}}); }
    catch(e){ this.setState({_reportView:{name,content:'(okunamadı)'}}); } }
  closeReport(){ this.setState({_reportView:null}); }
  reportExternal(){ const rv=this.state._reportView; if(rv&&rv.name&&window.galaxy&&window.galaxy.openReportFile){ try{ window.galaxy.openReportFile(rv.name); }catch(e){} } }
  // ---------- SUNUCULAR (SSH) ----------
  async _loadServers(){ try{ if(window.galaxy.sshList){ this.setState({_servers:(await window.galaxy.sshList())||[]}); } }catch(e){}
    try{ if(window.galaxy.sshKeys){ const r=await window.galaxy.sshKeys(); this.setState({_sshKeys:(r&&r.keys)||[]}); } }catch(e){} }
  srvFormSet(k,v){ this.setState({srvForm:Object.assign({},this.state.srvForm,{[k]:v})}); }
  async srvTest(){ this.setState({_srvtest:'test ediliyor…'}); try{ const r=await window.galaxy.sshTest(this.state.srvForm); this.setState({_srvtest:(r&&r.ok)?'✓ bağlantı başarılı':('✕ '+((r&&r.error)||'başarısız'))}); }catch(e){ this.setState({_srvtest:'✕ hata'}); } }
  async srvSave(){ try{ const r=await window.galaxy.sshSave(this.state.srvForm); if(r&&r.ok){ const id=r.id; this.setState({srvAddOpen:false,_srvtest:'',srvForm:{name:'',host:'',user:'',port:'22',key:'',roots:[]},srvRootInput:''}); await this._loadServers(); if(id&&window.galaxy.sshScan){ try{ await window.galaxy.sshScan(id); }catch(e){} } this._loadReal(); } else this.setState({_srvtest:'✕ '+((r&&r.error)||'kaydedilemedi')}); }catch(e){ this.setState({_srvtest:'✕ hata'}); } }
  // Kayıtlı sunucuyu düzenle: formu mevcut değerlerle (id + roots dahil) aç → srvSave GÜNCELLER
  openSrvEdit(s){ this.setState({ srvAddOpen:true, _srvtest:'', srvRootInput:'', srvForm:{ id:s.id, name:s.name||'', host:s.host||'', alias:s.alias||'', user:s.user||'', port:String(s.port||22), key:s.key||'', roots:(s.roots||[]).slice() } }); }
  // Sunucuya uzak klasör (evren) ekle/çıkar
  onSrvRoot(e){ this.setState({srvRootInput:(e&&e.target&&e.target.value)||''}); }
  onSrvRootKey(e){ if(e.key==='Enter'){ e.preventDefault&&e.preventDefault(); this.addSrvRoot(); } }
  addSrvRoot(){ const p=String(this.state.srvRootInput||'').trim(); if(!p) return; const roots=((this.state.srvForm&&this.state.srvForm.roots)||[]).slice();
    if(roots.some(r=>r.path===p)) { this.setState({srvRootInput:''}); return; }
    roots.push({ path:p, name:(p.replace(/\/+$/,'').split('/').filter(Boolean).pop())||p });
    this.setState({srvForm:Object.assign({},this.state.srvForm,{roots}), srvRootInput:''}); }
  removeSrvRoot(i){ const roots=((this.state.srvForm&&this.state.srvForm.roots)||[]).slice(); roots.splice(i,1); this.setState({srvForm:Object.assign({},this.state.srvForm,{roots})}); }
  async srvDelete(id){ try{ await window.galaxy.sshDelete(id); this.toast('✓ sunucu kaldırıldı'); this._loadServers(); this._loadReal(); }catch(e){} }
  async srvScan(id){ try{ await window.galaxy.sshScan(id); this._loadServers(); this._loadReal(); }catch(e){} }
  async pickLocalUni(){ try{ if(window.galaxy&&window.galaxy.pickFolder){ const r=await window.galaxy.pickFolder(); if(r&&r.path){ const name=r.path.split('/').filter(Boolean).pop()||'Evren'; await window.galaxy.universeAdd({name,root:r.path,bookmark:r.bookmark||null}); this.setState({addUni:false}); this._loadReal(); } } }catch(e){} }
  // Modalın SSH dalı: seçili sunucuya uzak klasör ekle → o klasör evren olur
  async addRemoteRoot(){ const id=this.state._uniSrvSel; const p=String(this.state.uniRemotePath||'').trim(); if(!id||!p) return;
    const srv=(this.state._servers||[]).find(s=>s.id===id); if(!srv||!window.galaxy||!window.galaxy.sshSave) return;
    const roots=(srv.roots||[]).slice(); if(!roots.some(r=>r.path===p)) roots.push({ path:p, name:(p.replace(/\/+$/,'').split('/').filter(Boolean).pop())||p });
    try{ await window.galaxy.sshSave(Object.assign({},srv,{roots})); if(window.galaxy.sshScan) await window.galaxy.sshScan(id); await this._loadServers(); this.setState({addUni:false,uniRemotePath:'',_uniSrvSel:null}); this._loadReal(); }catch(e){} }
  // --- Uzak terminal ---
  openSrvTerm(s){ if(!s||!s.id||!window.galaxy||!window.galaxy.sshShellStart) return; const sid='srvterm-'+s.id;
    // temiz oturum: her açılışta çıktı sıfırlanır (birikme olmaz)
    this._sbout=[{t:'in',x:'⟳ '+(s.name||'')+' bağlanıyor… (anahtar: '+((s.key&&s.key.split('/').pop())||'agent/varsayılan')+')'}];
    this.setState({_srvTerm:{id:s.id,name:s.name||s.host||'sunucu'},srvTermInput:'',_cov:(this.state._cov||0)+1});
    try{ window.galaxy.sshShellStart({shellId:sid,serverId:s.id}); }catch(e){}
    setTimeout(()=>this._focusEl('#ghud-srvterm-input'),120); }
  closeSrvTerm(){ const t=this.state._srvTerm; if(t&&window.galaxy&&window.galaxy.shellStop){ try{ window.galaxy.shellStop('srvterm-'+t.id); }catch(e){} } this.setState({_srvTerm:null}); }
  onSrvTermInput(e){ this._sthist_i=null; this.setState({srvTermInput:(e&&e.target&&e.target.value)||''}); }
  onSrvTermKey(e){ if(e.key==='Enter'){ e.preventDefault&&e.preventDefault(); this.sendSrvTerm(); }
    else if(e.key==='ArrowUp'){ e.preventDefault&&e.preventDefault(); this._srvHistNav(-1); }
    else if(e.key==='ArrowDown'){ e.preventDefault&&e.preventDefault(); this._srvHistNav(1); } }
  _srvHistNav(dir){ const h=this._sthist||[]; if(!h.length) return; if(this._sthist_i==null) this._sthist_i=h.length; this._sthist_i=Math.max(0,Math.min(h.length,this._sthist_i+dir)); this.setState({srvTermInput:this._sthist_i>=h.length?'':h[this._sthist_i]}); }
  sendSrvTerm(){ const t=this.state._srvTerm; const text=String(this.state.srvTermInput||'').trim(); if(!t||!text) return;
    this._sthist=this._sthist||[]; if(this._sthist[this._sthist.length-1]!==text) this._sthist.push(text); this._sthist=this._sthist.slice(-100); this._sthist_i=null;
    this._sbout=this._sbout||[]; this._sbout.push({t:'in',x:'$ '+text}); this.setState({srvTermInput:'',_cov:(this.state._cov||0)+1});
    try{ window.galaxy.sshShellInput({shellId:'srvterm-'+t.id,serverId:t.id,cmd:text}); }catch(e){}
    this._scrollBottom('#ghud-srvterm-scroll'); }
  _focusEl(sel){ try{ const el=document.querySelector(sel); if(el) el.focus(); }catch(e){} }
  // ---------- İSTASYON ARAÇLARI (saat · takvim · hesap makinesi · hızlı ara) ----------
  toggleTools(){ const open=!this.state.toolsOpen;
    if(open){ this._toolClock=setInterval(()=>this.setState({_clockTick:Date.now()}),1000); setTimeout(()=>this._focusEl('#gx-tool-find'),100); }
    else { clearInterval(this._toolClock); }
    this.setState({toolsOpen:open, calMonthOffset:0}); }
  closeTools(){ clearInterval(this._toolClock); this.setState({toolsOpen:false}); }
  // Hesap makinesi — güvenli değerlendirme (yalnız sayı/operatör/parantez/%)
  onCalc(e){ this.setState({calcExpr:(e&&e.target&&e.target.value)||''}); }
  calcPush(ch){ this.setState({calcExpr:String(this.state.calcExpr||'')+ch}); this._focusEl('#gx-calc-in'); }
  calcClear(){ this.setState({calcExpr:''}); this._focusEl('#gx-calc-in'); }
  calcBack(){ this.setState({calcExpr:String(this.state.calcExpr||'').slice(0,-1)}); this._focusEl('#gx-calc-in'); }
  calcEq(){ const raw=String(this.state.calcExpr||'').trim(); if(!raw) return;
    if(!/^[0-9+\-*/().%\s]+$/.test(raw)){ this.setState({calcExpr:'Hata'}); return; }
    try{ const v=Function('"use strict";return('+raw.replace(/%/g,'/100')+')')();
      if(v===undefined||v===null||!isFinite(v)){ this.setState({calcExpr:'Hata'}); return; }
      this.setState({calcExpr:String(Math.round(v*1e10)/1e10)}); }catch(err){ this.setState({calcExpr:'Hata'}); } }
  onCalcKey(e){ if(e.key==='Enter'){ e.preventDefault&&e.preventDefault(); this.calcEq(); } }
  // Takvim gezinme
  calPrev(){ this.setState({calMonthOffset:(this.state.calMonthOffset||0)-1}); }
  calNext(){ this.setState({calMonthOffset:(this.state.calMonthOffset||0)+1}); }
  calToday(){ this.setState({calMonthOffset:0}); }
  // Hızlı ara — tüm gezegenlerde ada göre; seçince o gezegene ışınla
  onToolFind(e){ this.setState({toolFind:(e&&e.target&&e.target.value)||''}); }
  _toolFindHits(){ const q=String(this.state.toolFind||'').trim().toLowerCase(); if(!q) return [];
    return (this.PROJECTS||[]).filter(p=>String(p.name||'').toLowerCase().includes(q)||String(p.group||'').toLowerCase().includes(q)).slice(0,8); }
  toolGo(id){ if(!id) return; this.closeTools(); this.setState({selId:id}); this.enter(); }
  _clk(){ const d=new Date(), p=n=>String(n).padStart(2,'0');
    let date=''; try{ date=d.toLocaleDateString('tr-TR',{weekday:'long',day:'numeric',month:'long',year:'numeric'}); }catch(e){ date=d.toDateString(); }
    return { hm:p(d.getHours())+':'+p(d.getMinutes()), hms:p(d.getHours())+':'+p(d.getMinutes())+':'+p(d.getSeconds()), date }; }
  _calCells(offset){ const now=new Date(); const base=new Date(now.getFullYear(), now.getMonth()+(offset||0), 1);
    const y=base.getFullYear(), m=base.getMonth();
    const lead=(new Date(y,m,1).getDay()+6)%7;                 // Pazartesi=0
    const dim=new Date(y,m+1,0).getDate();
    const isCur=(now.getFullYear()===y && now.getMonth()===m);
    const cellBase='display:flex;align-items:center;justify-content:center;height:28px;font-family:\'JetBrains Mono\',monospace;font-size:12px;border-radius:6px;';
    const cells=[];
    for(let i=0;i<lead;i++) cells.push({label:'',style:cellBase+'visibility:hidden'});
    for(let d=1;d<=dim;d++){ const today=isCur&&d===now.getDate();
      cells.push({label:String(d), style:cellBase+(today?'background:#61dcff;color:#04121c;font-weight:700;box-shadow:0 0 14px rgba(97,220,255,.5)':'color:#c3cbe6')}); }
    let title=''; try{ title=base.toLocaleDateString('tr-TR',{month:'long',year:'numeric'}); }catch(e){ title=(m+1)+'/'+y; }
    return { title:title.charAt(0).toLocaleUpperCase('tr')+title.slice(1), cells }; }
  // Özellik rehberi (app içi README) — F1 ya da alt bardan
  openGuide(){ this.setState({_guideOpen:true}); }
  closeGuide(){ this.setState({_guideOpen:false}); }
  _guideData(){ return [
    ['🌌 Galaksi & Projeler',['Projelerin gezegen, klasör grupların yıldız sistemi olarak görselleşir','Üst nav: GENEL BAKIŞ / EVREN / PANO / DB / DOCKER / ZAMANLAYICI / SUNUCULAR','Sol raydan projeye tıkla → "Gezegene İn" ile detaya gir','README yoksa tek tıkla oluştur; sağ panelde README + arama']],
    ['⛁ Veritabanı',['Bağlantı ekle: Postgres · MySQL · SQLite (parola safeStorage ile şifreli)','Tabloya tıkla → ilk 100 satır tablo halinde','Hücreyi düzenle → satır sonunda Kaydet (PK\'ye göre güvenli UPDATE)','Satır Ekle (+ satır), Sil (onaylı), sırala (başlığa tıkla), sayfalama, CSV dışa aktar','SQL çalıştır — yazma/DDL onay ister; 🤖 AI ajanı: doğal dille sorgu üretir','Tüm işlemler İşlem Günlüğü\'ne yazılır']],
    ['⎇ Git İstemcisi',['Dosyaları stage/unstage et, commit mesajı yaz → Commit','Push / Pull, dal değiştir/oluştur','Dosyaya tıkla → renkli diff görüntüleyici','Geçmiş + takım katkı grafiği (kim ne kadar commit\'lemiş)','Git Flow rehberi (adım adım)']],
    ['🐳 Docker',['Konteyner: başlat / durdur / ⟳ yeniden başlat / 🗑 kaldır','Canlı log akışı, konteyner içine terminal','İmaj yönetimi + silme, prune']],
    ['🖥 Uzak Sunucular (SSH)',['Sunucu ekle: anahtar seçici (agent/varsayılan + ~/.ssh anahtarların)','Uzak klasör tanımla → galakside evren olur (Düzenle → Uzak klasörler)','⌁ Uzak terminal — sunucuda komut çalıştır (Tab tamamlama, geçmiş)','Uzak dosya önizleme']],
    ['🤖 AI Ajanları',['Sağ İSTASYON rayından ajan seç → sohbet (Claude, proje klasöründe çalışır)','Hazır komutlar tek tıkla; ajan ekle/düzenle/sil','Genel bakışta ajan TÜM evrene, gezegen içinde o projeye odaklanır']],
    ['⏰ Zamanlayıcı',['Otomatik görev kur (haftalık/günlük, saat + ajan seç)','Telafi: app o an kapalıysa, açıldığında geçmiş görevi çalıştırır','Üretilen raporları HUD\'dan (🚀) görüntüle']],
    ['📋 Pano · 📁 Dosyalar · ⌁ Konsol',['Pano: görev ekle, sürükle-bırak taşı, README ile senkron','Dosyalar: ağaç/gezegen görünümü, önizleme (metin/md/resim/pdf), düzenle→kaydet, oluştur/sil, projede ara (grep)','Konsol: Bash + Claude (proje klasöründe), Tab tamamlama, ↑/↓ geçmiş']],
    ['⌘ Kısayollar',['⌘K — komut paleti / arama','F1 — bu rehber','🚀 (alt bar) — HUD paneli + raporlar','Plan maddesine çift tık → tamam/beklemede']],
  ]; }
  // Global bildirim (toast) — başarı/hata; ~3sn sonra kaybolur
  toast(msg,kind){ if(!msg) return; const id=(this._toastN=(this._toastN||0)+1); this.setState({_toast:{msg,kind:kind||'ok'}}); clearTimeout(this._toastT); this._toastT=setTimeout(()=>{ if(this._toastN===id) this.setState({_toast:null}); },3200); }
  // Global yıkıcı-işlem onayı: askConfirm(mesaj, fn)
  askConfirm(msg,fn){ this.setState({_confirm:{msg,fn}}); }
  runConfirm(){ const c=this.state._confirm; this.setState({_confirm:null}); if(c&&c.fn){ try{ c.fn(); }catch(e){} } }
  cancelConfirm(){ this.setState({_confirm:null}); }
  // ---------- DOCKER ----------
  // Sekme açılınca ilgili veriyi tazele — konteyner/DB/sunucu vb. güncel görünsün
  _onTabOpen(id){ try{
    if(id==='docker') this._loadDocker();
    else if(id==='db') this._loadDb&&this._loadDb();
    else if(id==='servers') this._loadServers&&this._loadServers();
    else if(id==='zaman'){ if(window.galaxy&&window.galaxy.scheduleList) window.galaxy.scheduleList().then(s=>this.setState({_sched:s||[]})); this._loadReports&&this._loadReports(); }
  }catch(e){} }
  async _loadDocker(){
    try{ if(window.galaxy.dockerStatus){ this.setState({_dstatus:await window.galaxy.dockerStatus()}); } }catch(e){ this.setState({_dstatus:{ok:false}}); }
    try{ if(window.galaxy.dockerPs){ const r=await window.galaxy.dockerPs(true); this.setState({_docker:(r&&r.ok)?(r.containers||[]):[]}); } }catch(e){ this.setState({_docker:[]}); }
    try{ if(window.galaxy.dockerImages){ const r=await window.galaxy.dockerImages(); this.setState({_images:(r&&r.ok)?(r.images||[]):[]}); } }catch(e){ this.setState({_images:[]}); }
  }
  async _dockerAct(id,action){ try{ const r=await window.galaxy.dockerAction({id,action}); if(r&&r.ok===false) this.toast('✕ '+((r&&r.error)||'işlem başarısız'),'err'); else this.toast('✓ '+({start:'başlatıldı',stop:'durduruldu',restart:'yeniden başlatıldı',rm:'kaldırıldı'}[action]||'tamam')); this._loadDocker(); }catch(e){ this.toast('✕ Docker hatası','err'); } }
  // Canlı log akışı + konteyner içinde komut çalıştır
  dockerOpenLog(id,name){ this._dlogLines=[]; this.setState({_dlog:{id,name}});
    try{ if(window.galaxy&&window.galaxy.dockerLogStream){ window.galaxy.dockerLogStream({id}); } else if(window.galaxy&&window.galaxy.dockerLogs){ window.galaxy.dockerLogs({id,tail:200}).then(r=>{ this._dlogLines=String((r&&(r.out||r.logs))||'').split('\n'); this.setState({_dlv:(this.state._dlv||0)+1}); }); } }catch(e){} }
  _onDockerLog(m){ if(!m||!this.state._dlog||m.id!==this.state._dlog.id) return; this._dlogLines=this._dlogLines||[];
    if(m.kind==='out'||m.kind==='err'){ for(const ln of String(m.text||'').split('\n')){ if(ln!=='') this._dlogLines.push(ln); } this._dlogLines=this._dlogLines.slice(-1000); this.setState({_dlv:(this.state._dlv||0)+1}); this._scrollBottom('#ghud-dlog-scroll'); } }
  closeDlog(){ const d=this.state._dlog; if(d&&window.galaxy&&window.galaxy.dockerLogStop){ try{ window.galaxy.dockerLogStop({id:d.id}); }catch(e){} } this._dlogLines=[]; this.setState({_dlog:null,dockExec:''}); }
  onDockExec(e){ this.setState({dockExec:(e&&e.target&&e.target.value)||''}); }
  onDockExecKey(e){ if(e.key==='Enter'){ e.preventDefault&&e.preventDefault(); this.dockerExecRun(); } }
  async dockerExecRun(){ const d=this.state._dlog; const cmd=String(this.state.dockExec||'').trim(); if(!d||!cmd||!window.galaxy||!window.galaxy.dockerExec) return;
    this._dlogLines=this._dlogLines||[]; this._dlogLines.push('$ '+cmd); this.setState({dockExec:'',_dlv:(this.state._dlv||0)+1});
    try{ const r=await window.galaxy.dockerExec({id:d.id,cmd}); const out=(r&&r.ok)?(r.out||'(çıktı yok)'):('hata: '+((r&&r.error)||''));
      for(const ln of String(out).split('\n')){ this._dlogLines.push(ln); } this._dlogLines=this._dlogLines.slice(-1000); this.setState({_dlv:(this.state._dlv||0)+1}); this._scrollBottom('#ghud-dlog-scroll'); }
    catch(e){ this._dlogLines.push('hata'); this.setState({_dlv:(this.state._dlv||0)+1}); } }
  async _dockerStartEngine(){ try{ await window.galaxy.dockerStart(); setTimeout(()=>this._loadDocker(),1500); }catch(e){} }
  async _dockerPrune(kind){ try{ await window.galaxy.dockerPrune(kind); this._loadDocker(); }catch(e){} }
  async _dockerImgAct(id,action){ try{ const r=await window.galaxy.dockerImageAction({id,action}); if(r&&r.ok===false) this.toast('✕ '+((r&&r.error)||'imaj kaldırılamadı (kullanımda olabilir)'),'err'); else this.toast('✓ imaj kaldırıldı'); this._loadDocker(); }catch(e){ this.toast('✕ Docker hatası','err'); } }
  // ---------- DB ----------
  async _loadDb(){ try{ if(window.galaxy.dbList){ const l=(await window.galaxy.dbList())||[]; this.setState({_db:l}); if(l.length&&!this.state.dbSel) this.dbSelectConn(l[0].id); } }catch(e){} }
  // ---------- KANBAN / TODO ----------
  async _loadTodos(){ try{ if(window.galaxy.todoList){ this.setState({_todos:(await window.galaxy.todoList(this.state.uniId))||[]}); } }catch(e){} }
  async _todoSetStatus(id,status){ try{ await window.galaxy.todoSetStatus({id,status}); this._loadTodos(); }catch(e){} }
  async _todoDelete(id){ try{ await window.galaxy.todoDelete(id); this._loadTodos(); }catch(e){} }
  async addTodo(){ const text=String(this.state.todoInput||'').trim(); if(!text) return; this.setState({todoInput:''});
    try{ if(window.galaxy.todoAdd){ await window.galaxy.todoAdd({universe:this.state.uniId,text,status:'todo'}); this._loadTodos(); } }catch(e){} }
  onTodoInput(e){ this.setState({todoInput:(e&&e.target&&e.target.value)||''}); }
  onTodoKey(e){ if(e.key==='Enter'){ e.preventDefault&&e.preventDefault(); this.addTodo(); } }
  // ---------- NOT EKLE (proje notu — ham projeyi kullanır, format bozulmaz) ----------
  onNoteInput(e){ this.setState({noteInput:(e&&e.target&&e.target.value)||''}); }
  onNoteKey(e){ if(e.key==='Enter'){ e.preventDefault&&e.preventDefault(); this.addNote(); } }
  _rawProj(){ const p=this.sel; return ((this._scan&&this._scan.projects)||[]).find(x=>x.id===(p&&p.id)); }
  _saveRaw(raw){ try{ if(raw&&window.galaxy&&window.galaxy.save){ window.galaxy.save({id:raw.id,name:raw.name,group:raw.group,status:raw.status,stage:raw.stage,progress:raw.progress,plan:raw.plan,notes:raw.notes,desc:raw.desc,links:raw.links}); } }catch(e){} }
  // Plan maddesini çift-tıkla tamam/beklemede yap (README + backend'e senkron yazılır)
  _togglePlan(i){ const p=this.sel; if(!p) return; const raw=this._rawProj();
    let done=null;
    if(raw&&Array.isArray(raw.plan)&&raw.plan[i]!=null){ const it=raw.plan[i]; if(Array.isArray(it)){ it[1]=!it[1]; done=it[1]; } else { it.done=!it.done; done=it.done; } this._saveRaw(raw); }
    if(p.plan&&p.plan[i]){ if(done==null) done=!p.plan[i][1]; p.plan[i][1]=done; }
    this.setState({_nv:(this.state._nv||0)+1}); }
  // Bağlantı ekle (BAĞLANTILAR sekmesi) — ad + URL/açıklama
  onLinkInput(e){ this.setState({linkInput:(e&&e.target&&e.target.value)||''}); }
  onLinkKey(e){ if(e.key==='Enter'){ e.preventDefault&&e.preventDefault(); this.addLink(); } else if(e.key==='Escape'){ this.setState({linkAdd:false,linkInput:''}); } }
  addLink(){ const v=String(this.state.linkInput||'').trim(); if(!v){ this.setState({linkAdd:false}); return; }
    const parts=v.split('|'); const name=(parts[0]||'').trim()||v; const desc=(parts[1]||'').trim();
    const raw=this._rawProj(); const p=this.sel;
    const link={name,desc,color:'#61dcff'};
    if(raw){ raw.links=raw.links||[]; raw.links.push(link); this._saveRaw(raw); if(p) p._links=raw.links; }
    this.setState({linkInput:'',linkAdd:false,_nv:(this.state._nv||0)+1}); }
  addNote(){
    const text=String(this.state.noteInput||'').trim(); if(!text) return; const p=this.sel; this.setState({noteInput:''});
    const raw=((this._scan&&this._scan.projects)||[]).find(x=>x.id===(p&&p.id));
    try{
      if(raw&&window.galaxy&&window.galaxy.save){ const notes=(raw.notes?raw.notes+'\n':'')+text;
        window.galaxy.save({id:raw.id,name:raw.name,group:raw.group,status:raw.status,stage:raw.stage,progress:raw.progress,plan:raw.plan,notes,desc:raw.desc,links:raw.links});
        raw.notes=notes; if(p) p._notes=notes; this.setState({_nv:(this.state._nv||0)+1}); }
      else if(window.galaxy&&window.galaxy.logSave){ window.galaxy.logSave(text); }
    }catch(e){}
  }
  // ---------- PROJE AKSİYONLARI ----------
  openProjectFolder(){ try{ const p=this.sel; if(p&&p._path&&window.galaxy.openFolder) window.galaxy.openFolder(p._path); }catch(e){} }
  async removeProject(){ try{ const p=this.sel; if(p&&window.galaxy.projectDelete){ const r=await window.galaxy.projectDelete(p.id); if(r&&r.ok&&r.action&&r.action!=='cancel'){ this.setState({mode:'space'}); this._loadReal(); } } }catch(e){} }
  // ---------- EVREN sil ----------
  async _universeDelete(id){ try{ if(window.galaxy.universeDelete){ await window.galaxy.universeDelete(id); this.toast('✓ evren kaldırıldı'); await this._loadReal(); const first=(this._unis&&this._unis[0]&&this._unis[0].id)||null; this._applyUni(first); this.setState({uniId:first,mode:'space',tab:'genel'}); } }catch(e){} }
  // ---------- YEDEKLER ----------
  async _openBackups(){ this.setState({backupsOpen:true,palette:false}); try{ if(window.galaxy.backupList){ this.setState({_backups:(await window.galaxy.backupList())||[]}); } }catch(e){} }
  async _restoreBackup(name){ try{ await window.galaxy.backupRestore(name); this.setState({backupsOpen:false}); await this._loadReal(); }catch(e){} }
  // ---------- AJAN CRUD ----------
  openAgentAdd(){ this.setState({agentFormOpen:true,agentForm:{id:'',name:'',prompt:'',color:'#61dcff',p1:'',p2:'',p3:''}}); }
  openAgentEdit(){ const a=this.AGENTS.find(x=>x.id===this.state.agentId); if(!a) return;
    this.setState({agentFormOpen:true,agentForm:{id:a.id,name:a.name,prompt:a.sys||'',color:a.color||'#61dcff',p1:(a.presets[0]&&a.presets[0].ask)||'',p2:(a.presets[1]&&a.presets[1].ask)||'',p3:(a.presets[2]&&a.presets[2].ask)||''}}); }
  agentFormSet(k,v){ this.setState({agentForm:Object.assign({},this.state.agentForm,{[k]:v})}); }
  async saveAgentForm(){ const f=this.state.agentForm; if(!f.name){ return; }
    const presets=[f.p1,f.p2,f.p3].filter(x=>x&&x.trim()).map(x=>({label:x.trim().slice(0,40),ask:x.trim()}));
    try{ if(window.galaxy.agentSave){ const r=await window.galaxy.agentSave({id:f.id||undefined,name:f.name,role:'Özel Ajan',color:f.color,prompt:f.prompt,write:false,presets});
      if(r&&r.ok){ this.setState({agentFormOpen:false}); await this._loadReal(); } } }catch(e){} }
  async _agentDelete(id){ try{ if(window.galaxy.agentDelete){ await window.galaxy.agentDelete(id||this.state.agentId); this.toast('✓ ajan silindi'); this.setState({agentId:null,agentFormOpen:false}); await this._loadReal(); } }catch(e){} }
  // ---------- ZAMANLAYICI ----------
  async _schedRun(id){ this.setState({_schResult:'⏳ çalışıyor…'}); try{ const r=await window.galaxy.scheduleRun(id); this.setState({_schResult:(r&&r.ok)?('✓ Çalıştı:\n\n'+(r.out||'(çıktı yok)')):('✕ '+((r&&r.error)||'hata'))}); }catch(e){ this.setState({_schResult:'✕ hata'}); } }
  schFormSet(k,v){ this.setState({schForm:Object.assign({},this.state.schForm,{[k]:v})}); }
  async saveSchedule(){ const f=this.state.schForm; if(!f.name||!f.prompt){ this.setState({_schResult:'✕ Ad ve görev metni gerekli'}); return; }
    const agentId=f.agentId||((this.AGENTS[0]&&this.AGENTS[0].id)||'cto');
    try{ if(window.galaxy.scheduleSave){ const r=await window.galaxy.scheduleSave({name:f.name,prompt:f.prompt,agentId,type:f.type,weekday:f.weekday,hour:f.hour,minute:f.minute,enabled:true});
      if(r&&r.ok){ this.setState({schAddOpen:false,_schResult:'',schForm:{name:'',prompt:'',agentId:'',type:'weekly',weekday:'1',hour:'9',minute:'0'},_sched:(await window.galaxy.scheduleList())||[]}); }
      else this.setState({_schResult:'✕ '+((r&&r.error)||'kaydedilemedi')}); } }catch(e){ this.setState({_schResult:'✕ hata'}); } }
  _onScheduleDone(m){ if(!m) return; this.setState({_schResult:'✓ "'+(m.name||'görev')+'" çalıştı → '+(m.file||'')+(m.error?(' · hata: '+m.error):'')}); try{ this.toast(m.error?('✕ "'+(m.name||'görev')+'" hata: '+m.error):('✓ "'+(m.name||'görev')+'" çalıştı — rapor hazır')); }catch(e){} try{ window.galaxy.scheduleList().then(s=>this.setState({_sched:s||[]})); }catch(e){} this._loadReports(); }
  // ---------- DB SORGU ----------
  async runDbQuery(){ if(!window.galaxy) return; const sql=String(this.state.dbSql||'').trim(); if(!sql||!this.state.dbSel) return;
    // dbExec: SELECT + yazma (INSERT/UPDATE/DELETE) çalıştırır ve audit log'a yazar. Yazma → önce onay.
    const fn=(window.galaxy.dbExec||window.galaxy.dbQuery);
    try{ const r=await fn({id:this.state.dbSel,database:this.state.dbDatabase,sql});
      if(r&&r.needConfirm){ this.setState({_dbConfirm:{sql:r.sql,danger:!!r.danger}}); return; }
      this.setState({_dbresult:(r&&r.ok)?r:{error:(r&&r.error)||'sorgu hatası',fields:[],rows:[]}}); this._loadDbLog();
    }catch(e){ this.setState({_dbresult:{error:'sorgu hatası',fields:[],rows:[]}}); } }
  // Yazma/DDL onaylandı → confirm:true ile çalıştır
  async confirmDbWrite(){ const c=this.state._dbConfirm; if(!c||!window.galaxy||!window.galaxy.dbExec) return; this.setState({_dbConfirm:null});
    try{ const r=await window.galaxy.dbExec({id:this.state.dbSel,database:this.state.dbDatabase,sql:c.sql,confirm:true,agent:!!c.request,request:c.request||''});
      this.setState({_dbresult:(r&&r.ok)?r:{error:(r&&r.error)||'işlem hatası',sql:c.sql,fields:[],rows:[]}}); this._loadDbLog();
    }catch(e){ this.setState({_dbresult:{error:'işlem hatası',fields:[],rows:[]}}); } }
  cancelDbWrite(){ this.setState({_dbConfirm:null}); }
  async _loadDbLog(){ try{ if(window.galaxy.dbLog){ this.setState({_dblog:(await window.galaxy.dbLog())||[]}); } }catch(e){} }
  async clearDbLog(){ try{ if(window.galaxy.dbLogClear){ await window.galaxy.dbLogClear(); this.setState({_dblog:[]}); } }catch(e){} }
  onDbSql(e){ this.setState({dbSql:(e&&e.target&&e.target.value)||''}); }
  onDbSqlKey(e){ if(e.key==='Enter'&&(e.metaKey||e.ctrlKey)){ e.preventDefault&&e.preventDefault(); this.runDbQuery(); } }
  onDbAsk(e){ this.setState({dbAsk:(e&&e.target&&e.target.value)||''}); }
  onDbAskKey(e){ if(e.key==='Enter'){ e.preventDefault&&e.preventDefault(); this.runDbAgent(); } }
  async runDbAgent(){ const request=String(this.state.dbAsk||'').trim(); if(!request||!this.state.dbSel||this.state.dbAgentBusy) return;
    if(!window.galaxy.dbAgent){ this.setState({_dbresult:{error:'Ajan bu sürümde yok',fields:[],rows:[]}}); return; }
    this.setState({dbAgentBusy:true,_dbresult:null});
    try{ const r=await window.galaxy.dbAgent({id:this.state.dbSel,database:this.state.dbDatabase,request});
      this.setState({dbAgentBusy:false});
      if(r&&r.needConfirm){ this.setState({_dbConfirm:{sql:r.sql,danger:!!r.danger,request:r.request},_dbresult:{sql:r.sql,fields:[],rows:[]}}); return; }
      this.setState({_dbresult:(r&&r.ok)?r:{error:(r&&r.error)||'ajan hatası',sql:(r&&r.sql)||'',fields:[],rows:[]}}); this._loadDbLog();
    }catch(e){ this.setState({dbAgentBusy:false,_dbresult:{error:'ajan hatası',fields:[],rows:[]}}); } }
  async _schedDelete(id){ try{ await window.galaxy.scheduleDelete(id); this.toast('✓ görev silindi'); this.setState({_sched:(await window.galaxy.scheduleList())||[]}); }catch(e){} }
  async dbSelectConn(id){
    this.setState({dbSel:id,_dbschema:null});
    try{ const r=await window.galaxy.dbDatabases(id); const dbs=(r&&r.ok)?r.databases:[]; const first=dbs[0]||null;
      this.setState({_dbdbs:dbs,dbDatabase:first}); if(first) this._dbLoadSchema(id,first); }catch(e){}
    this._loadDbLog();
  }
  async dbPickDatabase(db){ this.setState({dbDatabase:db}); this._dbLoadSchema(this.state.dbSel,db); }
  async _dbLoadSchema(id,database){ try{ const r=await window.galaxy.dbSchema({id,database}); this.setState({_dbschema:(r&&r.ok)?r:{error:(r&&r.error)||'şema alınamadı',tables:[]}}); }catch(e){ this.setState({_dbschema:{error:'şema alınamadı',tables:[]}}); } }
  // --- Tablo veri tarayıcı/editör ---
  async dbOpenTable(name){ if(!this.state.dbSel||!name||!window.galaxy||!window.galaxy.dbRows) return;
    this.setState({_dbTable:name,_dbTableData:null,_dbEdits:{},_dbDelRow:null,_dbRowMsg:'',_dbOffset:0,_dbOrderBy:'',_dbOrderDir:'',_dbNewOpen:false,_dbNewRow:{}});
    this._dbLoadRows(name,0,'',''); }
  async _dbLoadRows(name,offset,orderBy,orderDir){
    try{ const r=await window.galaxy.dbRows({id:this.state.dbSel,database:this.state.dbDatabase,table:name,offset,orderBy,orderDir});
      this.setState({_dbTableData:(r&&r.ok)?r:{error:(r&&r.error)||'okunamadı',fields:[],rows:[],pk:[]},_dbEdits:{}}); }
    catch(e){ this.setState({_dbTableData:{error:'okunamadı',fields:[],rows:[],pk:[]}}); } }
  dbCloseTable(){ this.setState({_dbTable:null,_dbTableData:null,_dbEdits:{},_dbDelRow:null,_dbRowMsg:'',_dbNewOpen:false}); }
  dbReloadTable(){ if(this.state._dbTable) this._dbLoadRows(this.state._dbTable,this.state._dbOffset||0,this.state._dbOrderBy,this.state._dbOrderDir); }
  dbNextPage(){ const d=this.state._dbTableData; const off=(this.state._dbOffset||0)+100; if(d&&d.total!=null&&off>=d.total) return; this.setState({_dbOffset:off}); this._dbLoadRows(this.state._dbTable,off,this.state._dbOrderBy,this.state._dbOrderDir); }
  dbPrevPage(){ const off=Math.max(0,(this.state._dbOffset||0)-100); this.setState({_dbOffset:off}); this._dbLoadRows(this.state._dbTable,off,this.state._dbOrderBy,this.state._dbOrderDir); }
  dbSort(col){ let dir='asc'; if(this.state._dbOrderBy===col&&this.state._dbOrderDir==='asc') dir='desc'; this.setState({_dbOrderBy:col,_dbOrderDir:dir,_dbOffset:0}); this._dbLoadRows(this.state._dbTable,0,col,dir); }
  dbInsertOpen(){ this.setState({_dbNewOpen:!this.state._dbNewOpen,_dbNewRow:{},_dbRowMsg:''}); }
  onNewCell(col,e){ const v=(e&&e.target)?e.target.value:''; this.setState({_dbNewRow:Object.assign({},this.state._dbNewRow,{[col]:v})}); }
  async dbInsertRow(){ const vals=this.state._dbNewRow||{}; if(!Object.keys(vals).filter(k=>vals[k]!=='').length){ this.setState({_dbRowMsg:'En az bir alan doldur'}); return; }
    this.setState({_dbRowBusy:'new'});
    try{ const r=await window.galaxy.dbInsertRow({id:this.state.dbSel,database:this.state.dbDatabase,table:this.state._dbTable,values:vals});
      this.setState({_dbRowBusy:null});
      if(r&&r.ok){ this.setState({_dbNewOpen:false,_dbNewRow:{},_dbRowMsg:'✓ satır eklendi'}); this._dbLoadRows(this.state._dbTable,this.state._dbOffset||0,this.state._dbOrderBy,this.state._dbOrderDir); this._loadDbLog(); }
      else this.setState({_dbRowMsg:'✕ '+((r&&r.error)||'eklenemedi')}); }
    catch(e){ this.setState({_dbRowBusy:null,_dbRowMsg:'✕ hata'}); } }
  async dbExportCsv(){ if(!this.state._dbTable||!window.galaxy||!window.galaxy.dbExportCsv) return; this.setState({_dbRowMsg:'CSV yazılıyor…'});
    try{ const r=await window.galaxy.dbExportCsv({id:this.state.dbSel,database:this.state.dbDatabase,table:this.state._dbTable});
      this.setState({_dbRowMsg:(r&&r.ok)?('✓ CSV · '+r.rows+' satır → Downloads'):('✕ '+((r&&r.error)||'hata'))}); }
    catch(e){ this.setState({_dbRowMsg:'✕ hata'}); } }
  onCellInput(ri,col,e){ const v=(e&&e.target)?e.target.value:''; const ed=Object.assign({},this.state._dbEdits); ed[ri]=Object.assign({},ed[ri],{[col]:v}); this.setState({_dbEdits:ed,_dbRowMsg:''}); }
  _rowKey(ri){ const d=this.state._dbTableData; if(!d||!d.pk||!d.pk.length) return null; const key={};
    for(const pc of d.pk){ const idx=(d.fields||[]).indexOf(pc); if(idx<0) return null; key[pc]=d.rows[ri][idx]; } return key; }
  async dbSaveRow(ri){ const d=this.state._dbTableData; const edits=(this.state._dbEdits||{})[ri]; if(!edits||!Object.keys(edits).length) return;
    const key=this._rowKey(ri); if(!key){ this.setState({_dbRowMsg:'Bu tabloda birincil anahtar yok — satır güncellenemiyor'}); return; }
    this.setState({_dbRowBusy:ri,_dbRowMsg:''});
    try{ const r=await window.galaxy.dbUpdateRow({id:this.state.dbSel,database:this.state.dbDatabase,table:this.state._dbTable,key,changes:edits});
      this.setState({_dbRowBusy:null});
      if(r&&r.ok){ for(const c in edits){ const idx=(d.fields||[]).indexOf(c); if(idx>=0) d.rows[ri][idx]=edits[c]; }
        const ed=Object.assign({},this.state._dbEdits); delete ed[ri]; this.setState({_dbEdits:ed,_dbTableData:d,_dbRowMsg:'✓ satır güncellendi'}); this._loadDbLog(); }
      else this.setState({_dbRowMsg:'✕ '+((r&&r.error)||'güncellenemedi')}); }
    catch(e){ this.setState({_dbRowBusy:null,_dbRowMsg:'✕ hata'}); } }
  askDeleteRow(ri){ this.setState({_dbDelRow:ri,_dbRowMsg:''}); }
  cancelDeleteRow(){ this.setState({_dbDelRow:null}); }
  async dbDoDeleteRow(ri){ const d=this.state._dbTableData; const key=this._rowKey(ri);
    if(!key){ this.setState({_dbRowMsg:'Birincil anahtar yok — silinemiyor',_dbDelRow:null}); return; }
    this.setState({_dbRowBusy:ri});
    try{ const r=await window.galaxy.dbDeleteRow({id:this.state.dbSel,database:this.state.dbDatabase,table:this.state._dbTable,key});
      this.setState({_dbRowBusy:null,_dbDelRow:null});
      if(r&&r.ok){ d.rows.splice(ri,1); const ed=Object.assign({},this.state._dbEdits); delete ed[ri]; this.setState({_dbTableData:d,_dbEdits:ed,_dbRowMsg:'✓ satır silindi'}); this._loadDbLog(); }
      else this.setState({_dbRowMsg:'✕ '+((r&&r.error)||'silinemedi')}); }
    catch(e){ this.setState({_dbRowBusy:null,_dbRowMsg:'✕ hata'}); } }
  dbFormSet(k,v){ this.setState({dbForm:Object.assign({},this.state.dbForm,{[k]:v})}); }
  async dbTestConn(){ this.setState({_dbtest:'test ediliyor…'}); try{ const r=await window.galaxy.dbTest(this.state.dbForm); this.setState({_dbtest:(r&&r.ok)?'✓ bağlantı başarılı':('✕ '+((r&&r.error)||'başarısız'))}); }catch(e){ this.setState({_dbtest:'✕ hata'}); } }
  async dbSaveConn(){ try{ const r=await window.galaxy.dbSave(this.state.dbForm); if(r&&r.ok){ this.setState({dbAddOpen:false,_dbtest:'',dbForm:{name:'',type:'postgres',host:'localhost',port:'5432',database:'',user:'',password:'',file:''}}); await this._loadDb(); if(r.id) this.dbSelectConn(r.id); } else this.setState({_dbtest:'✕ '+((r&&r.error)||'kaydedilemedi')}); }catch(e){ this.setState({_dbtest:'✕ hata'}); } }
  async dbDeleteConn(id){ try{ const wasSel=this.state.dbSel===id; await window.galaxy.dbDelete(id); await this._loadDb();
    if(wasSel){ const l=this.state._db||[]; if(l.length){ this.dbSelectConn(l[0].id); } else { this.setState({dbSel:null,dbDatabase:null,_dbdbs:null,_dbschema:null}); } }
  }catch(e){} }
  async _unhide(id){ try{ if(window.galaxy&&window.galaxy.projectUnhide){ await window.galaxy.projectUnhide(id); await this._loadReal(); } }catch(e){} }
  async createReadme(){ const p=this.sel; if(!p||!p.id||this.state._readmeBusy) return;
    if(!window.galaxy||!window.galaxy.createReadme){ return; }
    this.setState({_readmeBusy:true});
    try{ const r=await window.galaxy.createReadme(p.id);
      this.setState({_readmeBusy:false});
      if(r&&r.ok){ p._readme=true; await this._loadGit(); }  // _loadGit README içeriğini yeniden yükler
      else this.setState({_readmeErr:(r&&r.error)||'oluşturulamadı'});
    }catch(e){ this.setState({_readmeBusy:false}); } }
  // --- Git aksiyonları ---
  async _gitDo(promise,okMsg){ this.setState({_gitBusy:true,_gitActionMsg:''});
    try{ const r=await promise; this.setState({_gitBusy:false,_gitActionMsg:(r&&r.ok)?(okMsg||''):('✕ '+((r&&r.error)||'hata'))}); await this._loadGit(); return r; }
    catch(e){ this.setState({_gitBusy:false,_gitActionMsg:'✕ hata'}); return {ok:false}; } }
  gitStage(file){ const p=this.sel; if(p&&p.id) this._gitDo(window.galaxy.gitStage({projectId:p.id,file})); }
  gitUnstage(file){ const p=this.sel; if(p&&p.id) this._gitDo(window.galaxy.gitUnstage({projectId:p.id,file})); }
  gitStageAll(){ const p=this.sel; if(p&&p.id) this._gitDo(window.galaxy.gitStage({projectId:p.id})); }
  async gitCommit(){ const p=this.sel; const msg=String(this.state.gitMsg||'').trim(); if(!p||!p.id||!msg) return;
    const r=await this._gitDo(window.galaxy.gitCommit({projectId:p.id,message:msg}),'✓ commit yapıldı'); if(r&&r.ok) this.setState({gitMsg:''}); }
  gitPush(){ const p=this.sel; if(p&&p.id) this._gitDo(window.galaxy.gitPush({projectId:p.id}),'✓ push edildi'); }
  gitPull(){ const p=this.sel; if(p&&p.id) this._gitDo(window.galaxy.gitPull({projectId:p.id}),'✓ pull edildi'); }
  gitSwitchBranch(branch){ const p=this.sel; if(p&&p.id&&branch) this._gitDo(window.galaxy.gitSwitch({projectId:p.id,branch}),'✓ '+branch); }
  async gitCreateBranch(){ const p=this.sel; const name=String(this.state.branchInput||'').trim(); if(!p||!p.id||!name) return;
    const r=await this._gitDo(window.galaxy.gitSwitch({projectId:p.id,branch:name,create:true}),'✓ dal oluşturuldu'); if(r&&r.ok) this.setState({branchInput:'',_branchAdd:false}); }
  onGitMsg(e){ this.setState({gitMsg:(e&&e.target&&e.target.value)||''}); }
  onGitMsgKey(e){ if(e.key==='Enter'&&(e.metaKey||e.ctrlKey)){ e.preventDefault&&e.preventDefault(); this.gitCommit(); } }
  onBranchInput(e){ this.setState({branchInput:(e&&e.target&&e.target.value)||''}); }
  onBranchKey(e){ if(e.key==='Enter'){ e.preventDefault&&e.preventDefault(); this.gitCreateBranch(); } else if(e.key==='Escape') this.setState({_branchAdd:false}); }
  async gitViewDiff(file,staged){ const p=this.sel; if(!p||!p.id) return; this.setState({_gitDiff:{file,content:null}});
    try{ const r=await window.galaxy.gitDiff({projectId:p.id,file,staged}); this.setState({_gitDiff:{file,content:(r&&r.ok)?(r.out||'(değişiklik yok)'):('hata: '+((r&&r.error)||''))}}); }
    catch(e){ this.setState({_gitDiff:{file,content:'okunamadı'}}); } }
  closeGitDiff(){ this.setState({_gitDiff:null}); }
  _diffLines(text){ return String(text||'').split('\n').slice(0,2000).map(l=>{ let c='#8b96b8';
    if(/^\+\+\+|^---/.test(l)) c='#8b96b8'; else if(l[0]==='+') c='#55e88b'; else if(l[0]==='-') c='#ff6b7a'; else if(/^@@/.test(l)) c='#61dcff'; else if(/^diff |^index /.test(l)) c='#8791b8';
    return {t:l||' ',style:`color:${c};white-space:pre;font-family:'JetBrains Mono',monospace;font-size:12px;line-height:1.5`}; }); }
  async _loadGit(){
    const p=this.sel; if(!p) return;
    // Seçili projenin git durumu + gerçek dosya ağacı (gezegen detayındaki yörünge)
    try{ if(window.galaxy&&window.galaxy.gitLog){ const g=await window.galaxy.gitLog(p.id); this.setState({_git:(g&&g.ok)?g:null}); } }catch(e){ this.setState({_git:null}); }
    try{ if(window.galaxy&&window.galaxy.tree&&p._path){ const t=await window.galaxy.tree(p._path); if(Array.isArray(t)&&t.length) this._applyFiles(t); } }catch(e){}
    try{ if(window.galaxy&&window.galaxy.readme&&p._path){ const r=await window.galaxy.readme(p._path); this.setState({_readme:(r&&r.content)?r:null}); } else this.setState({_readme:null}); }catch(e){ this.setState({_readme:null}); }
  }
  _applyFiles(nodes){
    this._treeNodes=nodes;
    this._rebuildPlanets();
  }
  // _fsCwd altındaki node listesini bul (planet drill-in için)
  _childrenAt(cwd){ let list=this._treeNodes||[]; if(!cwd) return list;
    for(const seg of cwd.split('/')){ const d=(list||[]).find(n=>n.dir&&n.name===seg); list=(d&&d.children)||[]; } return list; }
  _rebuildPlanets(){
    const col=n=>{const l=String(n).toLowerCase();
      if(/\.md$/.test(l))return'#ffc861'; if(/\.(js|ts|jsx|tsx|py|swift|kt|java|go|rs|rb|php|c|cpp|h)$/.test(l))return'#61dcff';
      if(/\.(png|jpe?g|svg|gif|webp|ico)$/.test(l))return'#ff6b7a'; if(/\.(json|ya?ml|toml|env|lock|cfg)$/.test(l))return'#55e88b'; return'#c77bff';};
    const cwd=this.state._fsCwd||''; const nodes=this._childrenAt(cwd);
    const top=nodes.slice(0,7), N=top.length||1; const base=(this.sel&&this.sel._path)||'';
    this.FILES = top.map((c,i)=>{ const a=(i/N)*Math.PI*2 - Math.PI/2, r=27; const rel=cwd?(cwd+'/'+c.name):c.name;
      return { name:c.name+(c.dir?'/':''), c:col(c.name), x:Math.round(50+Math.cos(a)*r), y:Math.round(50+Math.sin(a)*r*0.86),
        s:c.dir?42:34, glow:/readme/i.test(c.name), _path:base?(base+'/'+rel):'', _rel:rel, _dir:!!c.dir }; });
    this.setState({_fv:(this.state._fv||0)+1});
  }
  // Tıklama: klasörse drill-in (gezegen görünümü), dosyaysa app-içi önizleme
  _openFsNode(rel,dir){ if(dir){ this.setState({_fsCwd:rel},()=>this._rebuildPlanets()); } else { this.openPreview(rel); } }
  _fsUp(){ const cwd=this.state._fsCwd||''; if(!cwd) return; const parent=cwd.split('/').slice(0,-1).join('/'); this.setState({_fsCwd:parent},()=>this._rebuildPlanets()); }
  async openPreview(rel){
    const root=(this.sel&&this.sel._path)||''; if(!root||!rel) return;
    this.setState({_prevLoading:true,_preview:{name:rel.split('/').pop(),rel,kind:'loading'}});
    try{ const f=await window.galaxy.file(root,rel);
      if(!f){ this.setState({_prevLoading:false,_preview:{name:rel.split('/').pop(),rel,kind:'error'}}); return; }
      this.setState({_prevLoading:false,_preview:Object.assign({rel},f)});
    }catch(e){ this.setState({_prevLoading:false,_preview:{name:rel.split('/').pop(),rel,kind:'error'}}); }
  }
  closePreview(){ this.setState({_preview:null,_editMode:false,_editContent:'',_editMsg:''}); }
  openPreviewExternal(){ const p=this.state._preview; if(p&&p.path&&window.galaxy.openFile){ try{ window.galaxy.openFile(p.path); }catch(e){} } }
  // --- Dosya düzenleme ---
  startEdit(){ const p=this.state._preview; if(!p||(p.kind!=='text'&&p.kind!=='markdown')) return; this.setState({_editMode:true,_editContent:p.content||'',_editMsg:''}); }
  onEditContent(e){ this.setState({_editContent:(e&&e.target&&e.target.value)||''}); }
  cancelEdit(){ this.setState({_editMode:false,_editMsg:''}); }
  async saveEdit(){ const p=this.state._preview, root=(this.sel&&this.sel._path)||''; if(!p||!p.rel||!root||!window.galaxy||!window.galaxy.fileWrite) return;
    this.setState({_editBusy:true,_editMsg:''});
    try{ const r=await window.galaxy.fileWrite({root,rel:p.rel,content:this.state._editContent});
      if(r&&r.ok){ this.setState({_editBusy:false,_editMode:false,_editMsg:'',_preview:Object.assign({},p,{content:this.state._editContent})}); }
      else this.setState({_editBusy:false,_editMsg:'✕ '+((r&&r.error)||'kaydedilemedi')}); }
    catch(e){ this.setState({_editBusy:false,_editMsg:'✕ hata'}); } }
  // --- Dosya oluştur/sil ---
  async fileDelete(rel){ const root=(this.sel&&this.sel._path)||''; if(!root||!rel||!window.galaxy||!window.galaxy.fileDelete) return;
    try{ await window.galaxy.fileDelete({root,rel}); if(this.state._preview&&this.state._preview.rel===rel) this.closePreview(); await this._loadGit(); }catch(e){} }
  async fileCreate(){ const root=(this.sel&&this.sel._path)||''; const rel=String(this.state.newFileInput||'').trim(); if(!root||!rel||!window.galaxy||!window.galaxy.fileCreate) return;
    try{ const r=await window.galaxy.fileCreate({root,rel}); if(r&&r.ok){ this.setState({newFileInput:'',_newFileOpen:false}); await this._loadGit(); if(!/\/$/.test(rel)) this.openPreview(rel); } else this.setState({_fsMsg:(r&&r.error)||'oluşturulamadı'}); }catch(e){} }
  onNewFileInput(e){ this.setState({newFileInput:(e&&e.target&&e.target.value)||''}); }
  onNewFileKey(e){ if(e.key==='Enter'){ e.preventDefault&&e.preventDefault(); this.fileCreate(); } else if(e.key==='Escape') this.setState({_newFileOpen:false}); }
  // --- Projede ara (grep) ---
  onGrepInput(e){ this.setState({grepQuery:(e&&e.target&&e.target.value)||''}); }
  onGrepKey(e){ if(e.key==='Enter'){ e.preventDefault&&e.preventDefault(); this.runGrep(); } }
  async runGrep(){ const root=(this.sel&&this.sel._path)||''; const q=String(this.state.grepQuery||'').trim(); if(!root||q.length<2||!window.galaxy||!window.galaxy.projectGrep) return;
    this.setState({_grepBusy:true,_grep:null});
    try{ const r=await window.galaxy.projectGrep({root,query:q}); this.setState({_grepBusy:false,_grep:(r&&r.ok)?r.matches:[]}); }
    catch(e){ this.setState({_grepBusy:false,_grep:[]}); } }
  // (geriye dönük — bazı yerler hâlâ tam yol + dir ile çağırıyor)
  _openFsPath(path,dir){ try{ if(dir){ if(window.galaxy.openFolder) window.galaxy.openFolder(path); } else if(window.galaxy.openFile) window.galaxy.openFile(path); }catch(e){} }
  _flatTree(nodes,base,depth){ let out=[]; for(const n of (nodes||[])){ const path=base?base+'/'+n.name:n.name;
    out.push({name:n.name,dir:!!n.dir,depth,path}); if(n.dir&&n.children&&depth<2) out=out.concat(this._flatTree(n.children,path,depth+1)); } return out; }
  componentWillUnmount(){
    window.removeEventListener('keydown', this._key);
    if (this._raf) cancelAnimationFrame(this._raf);
    if (this._onResize) window.removeEventListener('resize', this._onResize);
    if (this._warpT) clearTimeout(this._warpT);
    if (this._focusI) clearInterval(this._focusI);
    if (this._barClock) clearInterval(this._barClock);
    try{ if(this._asst){ if(this._asst._raf) cancelAnimationFrame(this._asst._raf); this._asstMicMeter(false); if(this._asst.root&&this._asst.root.parentNode) this._asst.root.parentNode.removeChild(this._asst.root); } }catch(e){}
    try{ window.speechSynthesis&&window.speechSynthesis.cancel(); }catch(e){}
  }

  get sel(){ return this.PROJECTS.find(p=>p.id===this.state.selId) || this.PROJECTS[0] || this._emptyProj(); }
  _emptyProj(){ return { id:'', name:'—', group:'', status:'active', stage:'', desc:'', prog:0, branch:'', plan:[], notes:'', _notes:'', links:[], _links:[], _path:'', _git:null, _readme:false, _stale:0, warn:false, orbit:false, x:50, y:50, size:60 }; }
  planetBg(c){ return `radial-gradient(circle at 38% 30%,#dffbff,${c} 46%,${this.DARK[c]||'#222'} 100%)`; }
  rgba(hex,a){ const n=parseInt(hex.slice(1),16); return `rgba(${(n>>16)&255},${(n>>8)&255},${n&255},${a})`; }

  select(id){ this.setState({selId:id, _fsCwd:'', _preview:null}); this._loadGit(); }
  enter(){ this._warp(()=>this.setState({mode:'planet'})); this._loadGit(); this._focusConsole(); }
  back(){ this._warp(()=>this.setState({mode:'space'})); }
  _warp(cb){ if(this._warpT) clearTimeout(this._warpT); this.setState({warping:true}); cb(); this._warpT=setTimeout(()=>this.setState({warping:false}),560); }
  toggleFocus(){ if(this.state.focusRunning){ clearInterval(this._focusI); this.setState({focusRunning:false}); } else { this._focusI=setInterval(()=>this.setState(s=>{ const n=Math.max(0,s.focusSec-1); if(n===0){ clearInterval(this._focusI); return {focusSec:0,focusRunning:false}; } return {focusSec:n}; }),1000); this.setState({focusRunning:true}); } }
  resetFocus(){ clearInterval(this._focusI); this.setState({focusRunning:false,focusSec:this._focusDefault||1500}); }

  renderVals(){
    const st=this.state, sel=this.sel, sc=this.STATUS[sel.status]||this.STATUS.active;
    const statusColor = s => (this.STATUS[s]||this.STATUS.active).c;
    const trFold = s => String(s||'').toLocaleLowerCase('tr').replace(/ı/g,'i');
    const realMode = st.loaded===true;
    // Seçili projenin notları/bağlantıları — gerçek modda proje verisinden.
    const noteArr = realMode ? String(sel._notes||'').split(/\n+/).map(s=>s.trim()).filter(Boolean) : (this.NOTES[sel.id]||[]);
    const linkArr = realMode ? (sel._links||[]).map(l=>Array.isArray(l)?l:[l.name||l.label||String(l),l.desc||l.role||'',l.color||'#61dcff']) : (this.LINKS[sel.id]||[]);

    const tabDef=[['genel','GENEL BAKIŞ'],['evren','EVREN'],['pano','PANO'],['db','DB'],['docker','DOCKER'],['zaman','ZAMANLAYICI'],['servers','SUNUCULAR']];
    const tabBtn=(active)=>`font-family:'JetBrains Mono',monospace;font-size:10px;letter-spacing:.1em;text-transform:uppercase;padding:7px 13px;cursor:pointer;border-radius:6px;border:none;background:${active?'rgba(97,220,255,.16)':'transparent'};box-shadow:${active?'inset 0 0 0 1px rgba(97,220,255,.5)':'none'};color:${active?'#61dcff':'#8b96b8'};transition:background .15s,color .15s`;
    const tabs=tabDef.map(([id,label])=>({id,label,style:tabBtn(st.tab===id),onClick:()=>{ this.setState({tab:id,mode:'space',agentId:null}); this._onTabOpen(id); }}));

    const relT=(d)=>{ d=d||0; if(d<=0) return 'bugün'; if(d===1) return 'dün'; if(d<7) return d+'g önce'; if(d<31) return Math.max(1,Math.floor(d/7))+'h önce'; if(d<365) return Math.floor(d/30)+'ay önce'; return Math.floor(d/365)+'y önce'; };
    // Tazelik sırasına göre (en son dokunulan üstte) — anlamlı: dal + son aktivite; "!" gürültüsü kaldırıldı
    const railItems=this.PROJECTS.slice().sort((a,b)=>(a._stale||0)-(b._stale||0)).map(p=>{ const active=p.id===st.selId; const col=statusColor(p.status);
      const br=(p.branch&&p.branch!=='—')?p.branch:''; const meta=[br,relT(p._stale)].filter(Boolean).join(' · '); const stale=(p._stale||0)>=60;
      return {
      id:p.id, name:p.name, meta,
      rowStyle:`display:flex;align-items:center;gap:11px;width:100%;padding:8px 18px;cursor:pointer;background:${active?'rgba(97,220,255,.07)':'transparent'};border:none;border-left:2px solid ${active?'#61dcff':'transparent'};text-align:left`,
      dotStyle:`width:8px;height:8px;border-radius:50%;flex-shrink:0;background:${col};${active?`box-shadow:0 0 8px ${col}`:''}`,
      nameStyle:`font-size:13px;color:${active?'#dbe4ff':'#c3cbe6'};white-space:nowrap;overflow:hidden;text-overflow:ellipsis`,
      metaStyle:`font-family:'JetBrains Mono',monospace;font-size:10px;color:${stale?'#8a7a55':(active?'#8791b8':'#6d78a0')};white-space:nowrap;overflow:hidden;text-overflow:ellipsis;margin-top:2px`,
      onClick:()=>{ this.select(p.id); this.setState({mode:'planet',tab:'evren'}); } }; });

    const planets=this.PROJECTS.filter(p=>p.orbit).map(p=>{ const col=statusColor(p.status); const active=p.id===st.selId; return {
      id:p.id, name:p.name, warn:!!p.warn, progLabel:'%'+p.prog,
      style:`position:absolute;left:${p.x}%;top:${p.y}%;transform:translate(-50%,-50%);width:${p.size}px;height:${p.size}px;border-radius:50%;border:none;cursor:pointer;padding:0;background:${this.planetBg(col)};box-shadow:0 0 ${active?60:42}px ${this.rgba(col,active?.7:.45)},inset -7px -10px 30px rgba(0,0,0,.45)${active?`,0 0 0 3px ${this.rgba(col,.5)}`:''};animation:floatOrb ${5+p.size/30}s ease-in-out infinite`,
      labelStyle:`position:absolute;left:${p.x}%;top:calc(${p.y}% + ${p.size/2+16}px);transform:translateX(-50%);font-size:13px;color:#dbe4ff;pointer-events:none;white-space:nowrap`,
      onClick:()=>this.select(p.id) }; });

    const files=this.FILES.map(f=>({ name:f.name, onClick:()=>this._openFsNode(f._rel,f._dir),
      style:`position:absolute;left:${f.x}%;top:${f.y}%;transform:translate(-50%,-50%);width:${f.s}px;height:${f.s}px;border-radius:50%;border:none;padding:0;cursor:pointer;background:${this.planetBg(f.c)};box-shadow:0 0 ${f.glow?24:16}px ${this.rgba(f.c,.5)}${f.glow?';animation:pulseGlow 1.6s ease-in-out infinite':''};color:${f.c}`,
      labelStyle:`position:absolute;left:${f.x}%;top:calc(${f.y}% + ${f.s/2+8}px);transform:translateX(-50%);font-family:'JetBrains Mono',monospace;font-size:11px;color:${f.glow?f.c:'#8b96b8'};white-space:nowrap` }));

    const planLabel=`${sel.plan.filter(x=>x[1]).length}/${sel.plan.length}`;
    const selPlan=sel.plan.map(([text,done],i)=>({ text, done, onToggle:()=>this._togglePlan(i),
      textColor:`color:${done?'#55e88b':'#8b96b8'}`,
      boxStyle:`width:14px;height:14px;flex-shrink:0;display:flex;align-items:center;justify-content:center;font-size:10px;border:1px solid ${done?'#55e88b':'rgba(190,205,255,.3)'};background:${done?'rgba(85,232,139,.13)':'transparent'};color:#55e88b`,
      check:done?'✓':'',
      md:`[${done?'x':' '}] ${text}`, mdColor:`color:${done?'#55e88b':'#ffc861'}` }));

    const leftDef=[['kayit','KAYIT'],['agac','AĞAÇ'],['git','⎇ GİT']];
    const leftTabs=leftDef.map(([id,label])=>({id,label,onClick:()=>this.setState({leftTab:id}),style:`background:none;border:none;cursor:pointer;font-family:'JetBrains Mono',monospace;font-size:10px;letter-spacing:.12em;text-transform:uppercase;color:${st.leftTab===id?'#61dcff':'#8791b8'}`}));

    const consoleTabs=[['claude','⌁ CLAUDE'],['bash','▮ BASH']].map(([id,label])=>({id,label,onClick:()=>{this.setState({consoleTab:id});this._focusConsole();},style:`padding:4px 10px;cursor:pointer;background:${st.consoleTab===id?'rgba(97,220,255,.08)':'transparent'};border:1px solid ${st.consoleTab===id?'#61dcff':'rgba(190,205,255,.16)'};color:${st.consoleTab===id?'#61dcff':'#8b96b8'}`}));
    const _outSt=t=>(t==='in'?'color:#8b96b8':t==='tool'?'color:#61dcff':t==='err'?'color:#ff6b7a':t==='done'?'color:#55e88b':'color:#dbe4ff')+';white-space:pre-wrap';
    const _curCon=this._con(sel&&sel.id);   // seçili projenin konsolu (proje bazlı)
    const claudeLines=(_curCon.cout||[]).map(l=>({text:l.x,style:_outSt(l.t)}));
    const bashLines=(_curCon.bout||[]).map(l=>({text:l.x,style:_outSt(l.t)}));

    const agents=this.AGENTS.map(a=>{ const on=a.id===st.agentId; return { id:a.id, name:a.name, hasBadge:a.badge>0, badge:a.badge,
      btnStyle:`position:relative;width:44px;height:44px;border-radius:50%;cursor:pointer;padding:0;background:url('${a.avatar}') center/cover,#0a0e1a;border:2px solid ${on?a.color:this.rgba(a.color,.4)};box-shadow:0 0 ${on?18:10}px ${this.rgba(a.color,on?.6:.25)}`,
      onClick:()=>this.setState({agentId:on?null:a.id}) }; });
    const activeRaw=this.AGENTS.find(a=>a.id===st.agentId)||null;
    const activePresets=((activeRaw&&activeRaw.presets)||[]).map(p=>({label:p.label,onClick:()=>this.sendPreset(p.ask),style:`text-align:left;width:100%;padding:8px 14px;cursor:pointer;font-family:'JetBrains Mono',monospace;font-size:12px;border:1px solid rgba(190,205,255,.16);color:#8b96b8;background:rgba(13,18,36,.5)`}));
    const activeDesc=activeRaw?(activeRaw.role||''):''; const hasActivePresets=activePresets.length>0;
    const active=activeRaw?{...activeRaw,avatarStyle:`width:38px;height:38px;flex-shrink:0;background:url('${activeRaw.avatar}') center/cover,#0a0e1a;border:1px solid ${this.rgba(activeRaw.color,.5)}`}:{avatarStyle:'',color:'#61dcff',name:'',role:'',prompt:''};
    const activeMsgs=(activeRaw?activeRaw.msgs:[]).map(([who,text])=>{ const isU=who==='u'; return { text, isUser:isU, notUser:!isU, lines:isU?[]:this._mdLines(text),
      wrapStyle:`display:flex;${isU?'justify-content:flex-end':''}`,
      bubbleStyle:`max-width:88%;font-size:13px;line-height:1.5;padding:10px 13px;${isU?'background:rgba(97,220,255,.1);border:1px solid rgba(97,220,255,.25);color:#dbe4ff':`background:rgba(13,18,36,.7);border-left:2px solid ${activeRaw?activeRaw.color:'#61dcff'};color:#8b96b8`}` }; });

    // ARAMA — gerçek projeler (tüm evrenler) + komutlar, query'ye göre filtrelenir.
    const q=trFold(st.query||'');
    const cmds=[
      {icon:'⚙',ic:'#c77bff',label:'Ayarlar',hint:'',fn:()=>{this.setState({palette:false,query:''}); if(window.galaxy&&window.galaxy.openSettings)try{window.galaxy.openSettings();}catch(e){}}},
      {icon:'⎇',ic:'#55e88b',label:'Git Flow Rehberi',hint:'',fn:()=>this.setState({palette:false,query:'',gitCenter:'rehber'})},
      {icon:'↺',ic:'#ffc861',label:'Yedekler',hint:'',fn:()=>this._openBackups()},
    ];
    const searchable = realMode ? (this._allProjects||this.PROJECTS) : this.PROJECTS;
    const projRes=searchable.filter(p=>!q||trFold(p.name).includes(q)).slice(0,8).map(p=>({icon:'●',ic:statusColor(p.status),label:p.name,hint:'↵ GİT',fn:()=>this._gotoProject(p.id)}));
    const cmdRes=cmds.filter(c=>!q||trFold(c.label).includes(q));
    const paletteResults=[...projRes,...cmdRes].map((r,i)=>({ icon:r.icon, label:r.label, hint:r.hint,
      iconStyle:`color:${r.ic};width:18px;text-align:center`,
      style:`display:flex;align-items:center;gap:12px;width:100%;padding:11px 18px;cursor:pointer;background:${i===0?'rgba(97,220,255,.06)':'transparent'};border:none;border-left:2px solid ${i===0?'#61dcff':'transparent'};text-align:left;color:#dbe4ff`,
      onClick:r.fn }));

    // KANBAN — gerçek todo'lar; kartı başka sütuna sürükle → durum değişir (kalıcı).
    const _todoCols=[['todo','Bekliyor','#8b96b8'],['doing','Devam','#61dcff'],['done','Tamam','#55e88b']];
    const _todos = realMode ? (st._todos||[]) : [{id:'1',text:'Örnek görev',status:'todo'},{id:'2',text:'Devam eden iş',status:'doing'},{id:'3',text:'Biten iş',status:'done'}];
    const board=_todoCols.map(([status,title,cc])=>{ const items=_todos.filter(t=>(t.status||(t.done?'done':'todo'))===status);
      return { title, count:items.length,
        headStyle:`font-family:'JetBrains Mono',monospace;font-size:11px;letter-spacing:.14em;text-transform:uppercase;color:${cc};padding:12px 14px;border-bottom:1px solid rgba(190,205,255,.12)`,
        onDragOver:(e)=>{ if(e&&e.preventDefault)e.preventDefault(); }, onDrop:(e)=>{ if(e&&e.preventDefault)e.preventDefault(); if(this._dragTodo){ this._todoSetStatus(this._dragTodo,status); this._dragTodo=null; } },
        cards:items.map(t=>({ id:t.id, title:t.text, cc,
          style:`border:1px solid rgba(190,205,255,.12);border-left:2px solid ${cc};background:rgba(13,18,36,.7);padding:12px;cursor:grab`,
          dotStyle:`width:7px;height:7px;border-radius:50%;background:${cc}`,
          onDragStart:(e)=>{ this._dragTodo=t.id; }, onDelete:(e)=>{ if(e&&e.stopPropagation)e.stopPropagation(); this._todoDelete(t.id); } })) };
    });

    const schRaw=(realMode && st._sched)
      ? st._sched.map(s=>({when:s.when||s.cron||s.schedule||'—', task:s.task||s.label||[s.agent,s.action].filter(Boolean).join(' ')||'görev', next:s.next||s.nextRun||'—', on:s.enabled!==false&&s.on!==false, id:s.id}))
      : [{when:'Her sabah 09:00',task:'ATLAS durum raporu',next:'yarın 09:00',on:true,id:null},{when:'Pazartesi 10:00',task:'NAVIGATOR standup',next:'Pzt 10:00',on:true,id:null},{when:'Her gün 18:00',task:'DOCUMENTOR README kontrolü',next:'bugün 18:00',on:false,id:null}];
    const schedule=schRaw.map(s=>({ when:s.when, task:s.task, next:s.next, state:s.on?'AKTİF':'DURDU', hasId:!!s.id,
      onRun:s.id?()=>this._schedRun(s.id):(()=>{}), onDelete:s.id?()=>this.askConfirm('"'+(s.name||'görev')+'" zamanlanmış görevini sil?',()=>this._schedDelete(s.id)):(()=>{}),
      dotStyle:`width:9px;height:9px;border-radius:50%;background:${s.on?'#55e88b':'#8791b8'};${s.on?'box-shadow:0 0 8px #55e88b':''}`,
      pillStyle:`font-family:'JetBrains Mono',monospace;font-size:10px;letter-spacing:.1em;padding:5px 10px;border:1px solid ${s.on?'rgba(85,232,139,.35)':'rgba(190,205,255,.16)'};color:${s.on?'#55e88b':'#8b96b8'}` }));

    const _g = realMode ? st._git : null;
    const gitFilesDef=(_g && _g.dirtyFiles && _g.dirtyFiles.length)
      ? _g.dirtyFiles.map(l=>{ const parts=String(l).trim().split(/\s+/); const code=parts[0]||''; const name=parts.slice(1).join(' ')||parts[0];
          const info=/D/.test(code)?['Silindi','#ff6b7a']:(/A|\?/.test(code)?['Yeni','#55e88b']:(/R/.test(code)?['Taşındı','#61dcff']:['Değişti','#ffc861'])); return [name,info[0],info[1]]; })
      : (realMode ? [] : [['LoginView.swift','Değişti','#ffc861'],['AuthService.swift','Yeni','#55e88b'],['RoleSelectView.swift','Silindi','#ff6b7a']]);
    const gitFiles=gitFilesDef.map(([name,badge,c])=>({name,badge,badgeStyle:`font-size:10px;letter-spacing:.06em;padding:2px 7px;border:1px solid ${this.rgba(c,.4)};color:${c};text-transform:uppercase`}));
    const commitSrc=(_g && _g.commits && _g.commits.length)
      ? _g.commits.map(c=>[c.s||'', c.h||'', c.ad||'', c.an||''])
      : (realMode ? [] : [['login akışı tamamlandı','a3f2c1','2 saat önce','Furkan'],['BLE eşleştirme ekranı eklendi','8e1b40','dün','Ayşe'],['proje iskeleti + CI','1c9d77','3 gün önce','Furkan']]);
    // yazar rengi (isimden deterministik)
    const authColor=(nm)=>{ const pal=['#61dcff','#55e88b','#ffc861','#c77bff','#ff6b7a','#7bd8ff','#f59fff']; let h=0; for(let i=0;i<String(nm).length;i++)h=(h*31+nm.charCodeAt(i))>>>0; return pal[h%pal.length]; };
    const commits=commitSrc.map(([msg,hash,when,who])=>{ const wc=authColor(who||'?'); return {msg,hash,when,who:who||'?',whoColor:wc,
      whoStyle:`font-family:'JetBrains Mono',monospace;font-size:10px;color:${wc}`,
      dotStyle:`position:absolute;left:-23px;top:4px;width:9px;height:9px;border-radius:50%;background:${wc};box-shadow:0 0 8px ${wc}`}; });
    const gitBranchName=(_g && _g.branch) || sel.branch || '?';
    const gitDirtyCount=_g ? (_g.dirty!=null?_g.dirty:(_g.dirtyFiles||[]).length) : (realMode?0:3);
    const hasGitFiles=gitFiles.length>0, hasCommits=commits.length>0;
    // Canlı git özeti (sol panel için): ahead/behind + durum satırı
    const gitAhead=(_g&&_g.ahead)||0, gitBehind=(_g&&_g.behind)||0, gitHasUpstream=!!(_g&&_g.hasUpstream);
    const gitAB=(gitAhead||gitBehind)?[(gitAhead?'↑'+gitAhead:''),(gitBehind?'↓'+gitBehind:'')].filter(Boolean).join(' '):(gitHasUpstream?'güncel':'takipsiz');
    const gitStatusLine=gitDirtyCount>0?(gitDirtyCount+' değişiklik bekliyor'):'çalışma alanı temiz';
    const gitTopCommit=commits[0]||null;
    const isGitRepoSel=!!(_g||(sel&&sel._git));
    // --- Git istemci: staged/unstaged dosyalar + aksiyonlar ---
    const _gf=(_g&&_g.files)||[];
    const fColor=(lbl)=>/Sil/.test(lbl)?'#ff6b7a':(/Yeni/.test(lbl)?'#55e88b':(/Taşı/.test(lbl)?'#61dcff':'#ffc861'));
    const fRow=(f,staged)=>({ path:f.path, label:f.label,
      badgeStyle:`font-size:10px;letter-spacing:.05em;padding:2px 6px;border:1px solid ${this.rgba(fColor(f.label),.4)};color:${fColor(f.label)};text-transform:uppercase;flex-shrink:0`,
      rowStyle:`display:flex;align-items:center;gap:9px;padding:4px 0;font-family:'JetBrains Mono',monospace;font-size:12px`,
      nameStyle:`color:#8b96b8;flex:1;cursor:pointer;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;background:none;border:none;text-align:left;font-family:'JetBrains Mono',monospace;font-size:12px;padding:0`,
      onDiff:()=>this.gitViewDiff(f.path,staged),
      onStage:()=>this.gitStage(f.path), onUnstage:()=>this.gitUnstage(f.path) });
    const stagedArr=_gf.filter(f=>f.staged), unstagedArr=_gf.filter(f=>f.unstaged);
    const gitStagedList=stagedArr.map(f=>fRow(f,true)), gitUnstagedList=unstagedArr.map(f=>fRow(f,false));
    const gitBranchList=((_g&&_g.branches)||[]).map(b=>({name:b, current:b===gitBranchName,
      onClick:()=>this.gitSwitchBranch(b),
      style:`padding:4px 10px;cursor:pointer;font-family:'JetBrains Mono',monospace;font-size:11px;border:1px solid ${b===gitBranchName?'#61dcff':'rgba(190,205,255,.16)'};color:${b===gitBranchName?'#61dcff':'#8b96b8'};background:${b===gitBranchName?'rgba(97,220,255,.08)':'transparent'};white-space:nowrap`}));
    const _gitDiff=st._gitDiff;
    // Takım akışı: commit'leri yazara göre topla
    const authMap={}; commitSrc.forEach(([,,,who])=>{ const a=who||'?'; authMap[a]=(authMap[a]||0)+1; });
    const totalCommits=Object.values(authMap).reduce((a,b)=>a+b,0)||1;
    const authors=Object.entries(authMap).sort((a,b)=>b[1]-a[1]).map(([name,n])=>{ const c=authColor(name); const pct=Math.round(n/totalCommits*100); return {
      name, count:n+' commit', pct:pct+'%', color:c,
      dotStyle:`width:10px;height:10px;border-radius:50%;background:${c};box-shadow:0 0 8px ${c};flex-shrink:0`,
      nameStyle:`font-size:13px;color:#dbe4ff;flex:1`,
      countStyle:`font-family:'JetBrains Mono',monospace;font-size:11px;color:${c}`,
      barStyle:`height:6px;border-radius:3px;background:${c};width:${pct}%;box-shadow:0 0 8px ${this.rgba(c,.6)}`,
      barWrapStyle:`height:6px;border-radius:3px;background:rgba(190,205,255,.08);margin-top:6px;overflow:hidden` }; });
    const hasAuthors=authors.length>0;

    const srcTab=(on)=>`flex:1;padding:9px;cursor:pointer;font-family:'JetBrains Mono',monospace;font-size:11px;letter-spacing:.06em;text-transform:uppercase;background:${on?'rgba(97,220,255,.08)':'transparent'};border:1px solid ${on?'#61dcff':'rgba(190,205,255,.16)'};color:${on?'#61dcff':'#8b96b8'}`;
    const serverSrc = (realMode && st._db && st._db.length)
      ? st._db.map(s=>{ const c=s.type==='postgres'?'#61dcff':(s.type==='mysql'?'#ffc861':'#55e88b');
          return [s.name||s.host||'DB', [s.host,s.type].filter(Boolean).join(' · ')||(s.host||''), c, 'kayıtlı', s.type||'veritabanı']; })
      : [['Yerel PostgreSQL','localhost:5432','#55e88b','bağlı','4 veritabanı'],['papilon-prod (SSH)','10.0.2.14 · postgres','#61dcff','bağlı','12 veritabanı'],['staging-mysql (SSH)','staging.local · mysql','#8a8fa8','uyku','3 veritabanı']];
    const servers=serverSrc.map(([name,host,c,state,dbs])=>({name,host,dbs,state,dotStyle:`width:9px;height:9px;border-radius:50%;background:${c};flex-shrink:0;${state==='bağlı'?`box-shadow:0 0 8px ${c}`:''}`,stateStyle:`font-family:'JetBrains Mono',monospace;font-size:10px;color:${c}`}));
    // DOCKER — gerçek konteyner + imaj + durum + aksiyonlar
    const ds=st._dstatus, dRunning=realMode?!!(ds&&ds.running):true;
    const dConts = realMode ? (st._docker||[]) : [{id:'a',name:'galaxy-api',image:'node:20-alpine',state:'running'},{id:'b',name:'galaxy-db',image:'postgres:16',state:'running'},{id:'c',name:'redis-cache',image:'redis:7',state:'exited'}];
    const containers=dConts.map(d=>{ const up=/^up|running/i.test(d.state||d.status||''); const c=up?'#55e88b':'#8a8fa8';
      return {name:d.name||d.id||'container',image:d.image||'',state:up?'çalışıyor':(d.state||'durdu'),up,
        dotStyle:`width:8px;height:8px;border-radius:50%;background:${c};${up?`box-shadow:0 0 8px ${c}`:''}`,
        stateStyle:`font-family:'JetBrains Mono',monospace;font-size:10px;color:${c}`,act:up?'⏹':'▸',
        onToggle:()=>this._dockerAct(d.id||d.name,up?'stop':'start'), onLog:()=>this.dockerOpenLog(d.id||d.name,d.name),
        onRestart:()=>this._dockerAct(d.id||d.name,'restart'),
        onRemove:()=>this.askConfirm('"'+(d.name||d.id)+'" konteynerini kaldır? (durdurulup silinir)',()=>this._dockerAct(d.id||d.name,'rm'))}; });
    const dockerImages=(realMode?(st._images||[]):[{id:'i1',repo:'node',tag:'20-alpine',size:'180MB',created:'2 gün önce'},{id:'i2',repo:'postgres',tag:'16',size:'420MB',created:'1 hafta önce'}])
      .map(im=>({repo:im.repo||im.id,tag:im.tag||'',size:im.size||'',created:im.created||'',onRemove:()=>this.askConfirm((im.repo||im.id)+':'+(im.tag||'')+' imajını sil?',()=>this._dockerImgAct(im.id,'rm')),
        dotStyle:`width:8px;height:8px;border-radius:50%;background:${im.dangling?'#8a8fa8':'#61dcff'}`}));
    // DB — bağlantı listesi + ekleme formu + gerçek şema
    const dbConns=(realMode?(st._db||[]):[{id:'x',name:'Yerel PG',type:'postgres',host:'localhost'}]).map(c=>{ const on=c.id===st.dbSel;
      return {id:c.id,name:c.name,type:c.type||'',
        style:`display:flex;align-items:center;gap:8px;padding:8px 12px;cursor:pointer;font-family:'JetBrains Mono',monospace;font-size:12px;border:1px solid ${on?'#61dcff':'rgba(190,205,255,.16)'};color:${on?'#61dcff':'#8b96b8'};background:${on?'rgba(97,220,255,.08)':'transparent'}`,
        onClick:()=>this.dbSelectConn(c.id), onDelete:(e)=>{if(e&&e.stopPropagation)e.stopPropagation();this.askConfirm('"'+(c.name||'bağlantı')+'" veritabanı bağlantısını sil?',()=>this.dbDeleteConn(c.id));}}; });
    const dbHasConns=dbConns.length>0;
    const dbf=st.dbForm||{};
    const dbTypeBtn=t=>`padding:6px 12px;cursor:pointer;font-family:'JetBrains Mono',monospace;font-size:11px;text-transform:uppercase;border:1px solid ${dbf.type===t?'#61dcff':'rgba(190,205,255,.16)'};color:${dbf.type===t?'#61dcff':'#8b96b8'};background:${dbf.type===t?'rgba(97,220,255,.08)':'transparent'}`;
    const dbdbs=(st._dbdbs||[]).map(d=>({name:d,onClick:()=>this.dbPickDatabase(d),
      style:`padding:5px 11px;cursor:pointer;font-family:'JetBrains Mono',monospace;font-size:11px;border:1px solid ${d===st.dbDatabase?'#61dcff':'rgba(190,205,255,.16)'};color:${d===st.dbDatabase?'#61dcff':'#8b96b8'};background:${d===st.dbDatabase?'rgba(97,220,255,.08)':'transparent'}`}));
    const _sch=st._dbschema;
    const dbSchemaTables=((_sch&&_sch.tables)||[]).map((t,i)=>{ const c=['#61dcff','#c77bff','#ffc861','#55e88b'][i%4];
      return {name:t.name, onClick:()=>this.dbOpenTable(t.name),
        headStyle:`font-family:'JetBrains Mono',monospace;font-size:12px;color:${c};padding:8px 14px;border-bottom:1px solid ${this.rgba(c,.25)};background:${this.rgba(c,.06)};cursor:pointer;display:flex;align-items:center;justify-content:space-between`,
        boxStyle:`border:1px solid ${this.rgba(c,.35)};background:rgba(13,18,36,.85);cursor:pointer`,
        columns:((t.columns)||[]).map(cl=>({txt:(cl.pk?'🔑 ':'')+cl.name+' · '+(cl.type||''), style:`color:${cl.pk?'#ffc861':'#8b96b8'}`}))}; });
    // Tablo veri editörü grid
    const _td=st._dbTableData; const _edits=st._dbEdits||{};
    const dbHasPk=!!(_td&&_td.pk&&_td.pk.length);
    const dbTableRows=((_td&&_td.rows)||[]).map((row,ri)=>{ const rowEd=_edits[ri]||{}; const dirty=Object.keys(rowEd).length>0; const delC=st._dbDelRow===ri; const busy=st._dbRowBusy===ri;
      return { ri, dirty, delConfirm:delC, notDelConfirm:!delC, busy,
        cells:((_td&&_td.fields)||[]).map((col,ci)=>{ const orig=row[ci]; const has=Object.prototype.hasOwnProperty.call(rowEd,col); const val=has?rowEd[col]:(orig==null?'':String(orig)); const isPk=(_td.pk||[]).includes(col);
          return { value:val, onInput:(e)=>this.onCellInput(ri,col,e), readOnly:isPk&&dbHasPk,
            style:`width:100%;box-sizing:border-box;min-width:${isPk?'56px':'130px'};background:${has?'rgba(97,220,255,.1)':'transparent'};border:1px solid ${has?'#61dcff':'rgba(190,205,255,.08)'};color:${isPk?'#ffc861':'#dbe4ff'};font-family:'JetBrains Mono',monospace;font-size:11px;padding:5px 7px;outline:none${(isPk&&dbHasPk)?';opacity:.7':''}` }; }),
        onSave:()=>this.dbSaveRow(ri), onAskDelete:()=>this.askDeleteRow(ri), onDoDelete:()=>this.dbDoDeleteRow(ri), onCancelDelete:()=>this.cancelDeleteRow(),
        saveStyle:`padding:4px 10px;cursor:${dirty?'pointer':'default'};font-family:'JetBrains Mono',monospace;font-size:10px;border:1px solid ${dirty?'#55e88b':'rgba(190,205,255,.12)'};background:${dirty?'rgba(85,232,139,.1)':'transparent'};color:${dirty?'#55e88b':'#8791b8'};white-space:nowrap`,
        saveLabel:busy?'…':'Kaydet' }; });
    const dbTableColHdr=((_td&&_td.fields)||[]).map(f=>({name:f+(st._dbOrderBy===f?(st._dbOrderDir==='desc'?' ▼':' ▲'):''), isPk:(_td&&_td.pk||[]).includes(f), onSort:()=>this.dbSort(f),
      style:`text-align:left;padding:7px 8px;cursor:pointer;min-width:${(_td&&_td.pk||[]).includes(f)?'56px':'130px'};font-family:'JetBrains Mono',monospace;font-size:10px;letter-spacing:.06em;text-transform:uppercase;color:${(_td&&_td.pk||[]).includes(f)?'#ffc861':'#61dcff'};border-bottom:1px solid rgba(190,205,255,.16);white-space:nowrap`}));
    // yeni satır formu hücreleri
    const dbNewCells=((_td&&_td.fields)||[]).map(f=>({ value:(st._dbNewRow&&st._dbNewRow[f])||'', onInput:(e)=>this.onNewCell(f,e),
      style:`width:100%;box-sizing:border-box;min-width:${(_td&&_td.pk||[]).includes(f)?'56px':'130px'};background:rgba(85,232,139,.06);border:1px solid rgba(85,232,139,.25);color:#dbe4ff;font-family:'JetBrains Mono',monospace;font-size:11px;padding:5px 7px;outline:none` }));
    // sayfalama bilgisi
    const _off=st._dbOffset||0; const _tot=(_td&&_td.total);
    const dbPageInfo=(_td&&_td.rows)?((_off+1)+'–'+(_off+_td.rows.length)+(_tot!=null?(' / '+_tot):'')):'';
    const dbSchemaErr=(_sch&&_sch.error)||'';
    const dbSelName=(dbConns.find(c=>c.id===st.dbSel)||{}).name||'';
    const dockerStatusText = !realMode ? 'Docker motoru çalışıyor · 3 konteyner · 2 çalışıyor'
      : (ds ? (ds.mas?'Docker bu sürümde kullanılamıyor':(ds.installed===false?'Docker kurulu değil':(ds.running?`Docker çalışıyor · ${ds.containers||0} konteyner · ${ds.containersRunning||0} çalışıyor · ${ds.images||0} imaj`:'Docker motoru durdu — başlatmak için ▸ tıkla'))) : 'Docker durumu okunuyor…');

    // Gerçek evrenler (yoksa örnek). Karta tıklayınca O evrenin galaksisine geçilir.
    const uniSrc = (this._unis && this._unis.length) ? this._unis
      : [{name:'İş Evreni',path:'~/Projects',planets:6,systems:2,active:4,color:'#61dcff',id:null},
         {name:'Papilon',path:'~/Papilon',planets:4,systems:1,active:2,color:'#c77bff',id:null},
         {name:'Arşiv',path:'~/Archive',planets:9,systems:3,active:0,color:'#8a8fa8',id:null}];
    const universes=uniSrc.map(u=>{ const c=u.color; return {name:u.name,path:u.path,planets:u.planets,systems:u.systems,active:u.active,
      cardStyle:`display:flex;flex-direction:column;justify-content:space-between;min-height:150px;box-sizing:border-box;text-align:left;cursor:pointer;border:1px solid ${this.rgba(c,.38)};background:linear-gradient(160deg,${this.rgba(c,.12)},rgba(9,13,26,.86));padding:22px;clip-path:polygon(0 0,calc(100% - 16px) 0,100% 16px,100% 100%,0 100%);box-shadow:0 0 30px ${this.rgba(c,.1)},inset 0 0 0 1px rgba(255,255,255,.02)`,
      orbStyle:`width:52px;height:52px;border-radius:50%;background:${this.planetBg(c)};box-shadow:0 0 24px ${this.rgba(c,.5)};animation:floatOrb ${5+u.planets/3}s ease-in-out infinite`,
      accent:c, hasId:!!u.id, onClick:()=> u.id ? this.selectUni(u.id) : this.setState({tab:'evren'}),
      onDelete:(e)=>{ if(e&&e.stopPropagation)e.stopPropagation(); if(u.id) this.askConfirm('"'+(u.name||'evren')+'" evrenini kaldır? (klasörler diskte kalır)',()=>this._universeDelete(u.id)); } }; });

    const isEvren=st.tab==='evren', space=st.mode==='space';
    return {
      viewOverview: space&&st.tab==='genel', universes,
      addUniOpen: st.addUni,
      // Sunucu varsa modal aç (yerel/uzak seçimi); yoksa doğrudan yerel klasör seç.
      openAddUni: ()=>{ if((st._servers&&st._servers.length)){ this.setState({addUni:true, uniSource:'ssh', _uniSrvSel:null, uniRemotePath:''}); } else this.pickLocalUni(); },
      closeAddUni:()=>this.setState({addUni:false}),
      pickLocalUni:()=>this.pickLocalUni(),
      uniLocal: st.uniSource==='local', uniSsh: st.uniSource==='ssh',
      srcLocalStyle: srcTab(st.uniSource==='local'), srcSshStyle: srcTab(st.uniSource==='ssh'),
      setLocal:()=>this.setState({uniSource:'local'}), setSsh:()=>this.setState({uniSource:'ssh'}),
      // uzak klasör → evren (modalın SSH dalı)
      uniServers:((st._servers)||[]).map(s=>({ id:s.id, name:s.name, host:s.host||s.alias||'', sel:st._uniSrvSel===s.id, onSelect:()=>this.setState({_uniSrvSel:s.id}),
        rowStyle:`display:flex;align-items:center;gap:10px;border:1px solid ${st._uniSrvSel===s.id?'#61dcff':'rgba(190,205,255,.12)'};background:${st._uniSrvSel===s.id?'rgba(97,220,255,.06)':'rgba(13,18,36,.6)'};padding:11px 14px;cursor:pointer`,
        dotStyle:`width:9px;height:9px;border-radius:50%;background:#61dcff;flex-shrink:0` })),
      hasUniServers:!!(st._servers&&st._servers.length), uniSrvSelected:!!st._uniSrvSel,
      uniRemotePath:st.uniRemotePath||'', onUniRemotePath:(e)=>this.setState({uniRemotePath:(e&&e.target&&e.target.value)||''}),
      onUniRemoteKey:(e)=>{ if(e.key==='Enter'){ e.preventDefault&&e.preventDefault(); this.addRemoteRoot(); } },
      addRemoteRoot:()=>this.addRemoteRoot(),
      viewServers: space&&st.tab==='servers',
      serverList:((st._servers)||[]).map(s=>({ name:s.name, host:[s.host||s.alias,s.user].filter(Boolean).join(' · '), roots:(s.roots&&s.roots.length)?(s.roots.length+' kök'):'',
        onScan:()=>this.srvScan(s.id), onEdit:()=>this.openSrvEdit(s), onDelete:()=>this.askConfirm('"'+(s.name||'sunucu')+'" sunucusunu kaldır?',()=>this.srvDelete(s.id)), onTerm:()=>this.openSrvTerm(s),
        dotStyle:`width:9px;height:9px;border-radius:50%;background:#61dcff;flex-shrink:0` })),
      // uzak terminal
      srvTermOpen:!!st._srvTerm, srvTermName:(st._srvTerm&&st._srvTerm.name)||'',
      srvTermLines:(this._sbout||[]).map(l=>({text:l.x,style:_outSt(l.t)})), hasSrvTermLines:!!(this._sbout&&this._sbout.length),
      srvTermInput:st.srvTermInput||'', onSrvTermInput:(e)=>this.onSrvTermInput(e), onSrvTermKey:(e)=>this.onSrvTermKey(e), sendSrvTerm:()=>this.sendSrvTerm(), closeSrvTerm:()=>this.closeSrvTerm(),
      hasServers:!!(st._servers&&st._servers.length), noServers:!!(st._servers&&!st._servers.length),
      srvAddOpen: st.srvAddOpen, openSrvAdd:()=>this.setState({srvAddOpen:true,_srvtest:'',srvForm:{name:'',host:'',user:'',port:'22',key:''}}), closeSrvAdd:()=>this.setState({srvAddOpen:false}),
      srvFormTitle: st.srvForm&&st.srvForm.id ? 'Sunucuyu düzenle' : 'Yeni sunucu',
      srvName:(st.srvForm&&st.srvForm.name)||'', srvHost:(st.srvForm&&st.srvForm.host)||'', srvUser:(st.srvForm&&st.srvForm.user)||'', srvPort:(st.srvForm&&st.srvForm.port)||'', srvKey:(st.srvForm&&st.srvForm.key)||'',
      srvSetName:(e)=>this.srvFormSet('name',e.target.value), srvSetHost:(e)=>this.srvFormSet('host',e.target.value), srvSetUser:(e)=>this.srvFormSet('user',e.target.value), srvSetPort:(e)=>this.srvFormSet('port',e.target.value), srvSetKey:(e)=>this.srvFormSet('key',e.target.value),
      // ~/.ssh anahtar seçici çipleri (Varsayılan/agent + mevcut anahtarlar)
      sshKeyChips:(()=>{ const cur=(st.srvForm&&st.srvForm.key)||''; const chip=(name,val,sel)=>({name,onClick:()=>this.srvFormSet('key',val),
        style:`padding:5px 11px;cursor:pointer;font-family:'JetBrains Mono',monospace;font-size:11px;border:1px solid ${sel?'#61dcff':'rgba(190,205,255,.16)'};color:${sel?'#61dcff':'#8b96b8'};background:${sel?'rgba(97,220,255,.08)':'transparent'}`});
        const list=[chip('Agent / varsayılan','',!cur)];
        for(const k of (st._sshKeys||[])){ const b=cur===k.name||cur===k.path; list.push(chip(k.name,k.name,b)); }
        return list; })(),
      // uzak klasör (evren) listesi
      srvRoots:((st.srvForm&&st.srvForm.roots)||[]).map((r,i)=>({ name:r.name||r.path, path:r.path, onRemove:()=>this.removeSrvRoot(i) })),
      hasSrvRoots:!!(st.srvForm&&st.srvForm.roots&&st.srvForm.roots.length),
      srvRootInput:st.srvRootInput||'', onSrvRoot:(e)=>this.onSrvRoot(e), onSrvRootKey:(e)=>this.onSrvRootKey(e), addSrvRoot:()=>this.addSrvRoot(),
      srvBrowseKey:async()=>{ try{ if(window.galaxy&&window.galaxy.pickFiles){ const r=await window.galaxy.pickFiles(); const f=Array.isArray(r)?r[0]:(r&&r.path); if(f) this.srvFormSet('key', f.path||f); } }catch(e){} },
      srvTest:()=>this.srvTest(), srvSave:()=>this.srvSave(), srvTestMsg: st._srvtest||'',
      viewDocker: space&&st.tab==='docker', servers, containers, dockerImages,
      noContainers: realMode && dRunning && !containers.length,
      dockerStatusText, dockerRunning:dRunning, dockerNotRunning:realMode&&ds&&ds.installed!==false&&!ds.running&&!ds.mas,
      isDockContainers: st.dockerTab!=='images', isDockImages: st.dockerTab==='images',
      dockContStyle:`padding:6px 12px;cursor:pointer;font-family:'JetBrains Mono',monospace;font-size:10px;letter-spacing:.1em;text-transform:uppercase;border:1px solid ${st.dockerTab!=='images'?'#61dcff':'rgba(190,205,255,.16)'};color:${st.dockerTab!=='images'?'#61dcff':'#8b96b8'};background:${st.dockerTab!=='images'?'rgba(97,220,255,.08)':'transparent'}`,
      dockImgStyle:`padding:6px 12px;cursor:pointer;font-family:'JetBrains Mono',monospace;font-size:10px;letter-spacing:.1em;text-transform:uppercase;border:1px solid ${st.dockerTab==='images'?'#61dcff':'rgba(190,205,255,.16)'};color:${st.dockerTab==='images'?'#61dcff':'#8b96b8'};background:${st.dockerTab==='images'?'rgba(97,220,255,.08)':'transparent'}`,
      setDockContainers:()=>this.setState({dockerTab:'containers'}), setDockImages:()=>this.setState({dockerTab:'images'}),
      dockerRefresh:()=>this._loadDocker(), dockerStartEngine:()=>this._dockerStartEngine(),
      dockerPruneImg:()=>this._dockerPrune('image'),
      dlogOpen:!!st._dlog, dlogName:(st._dlog&&st._dlog.name)||'', closeDlog:()=>this.closeDlog(),
      dlogLines:(this._dlogLines||[]).map(l=>({t:l||' ', style:`white-space:pre-wrap;word-break:break-word;color:${/^\$ /.test(l)?'#61dcff':(/error|hata|exception|fatal/i.test(l)?'#ff6b7a':'#8b96b8')}`})),
      dockExec:st.dockExec||'', onDockExec:(e)=>this.onDockExec(e), onDockExecKey:(e)=>this.onDockExecKey(e), dockerExecRun:()=>this.dockerExecRun(),
      // DB
      dbConns, dbHasConns, dbAddOpen:st.dbAddOpen, openDbAdd:()=>this.setState({dbAddOpen:true,_dbtest:''}), closeDbAdd:()=>this.setState({dbAddOpen:false}),
      dbTypePg:dbTypeBtn('postgres'), dbTypeMy:dbTypeBtn('mysql'), dbTypeLite:dbTypeBtn('sqlite'),
      setDbTypePg:()=>this.dbFormSet('type','postgres'), setDbTypeMy:()=>this.dbFormSet('type','mysql'), setDbTypeLite:()=>this.dbFormSet('type','sqlite'),
      dbIsSqlite:dbf.type==='sqlite', dbNotSqlite:dbf.type!=='sqlite',
      dbSetName:(e)=>this.dbFormSet('name',e.target.value), dbSetHost:(e)=>this.dbFormSet('host',e.target.value), dbSetPort:(e)=>this.dbFormSet('port',e.target.value),
      dbSetDatabase:(e)=>this.dbFormSet('database',e.target.value), dbSetUser:(e)=>this.dbFormSet('user',e.target.value), dbSetPassword:(e)=>this.dbFormSet('password',e.target.value), dbSetFile:(e)=>this.dbFormSet('file',e.target.value),
      dbTestConn:()=>this.dbTestConn(), dbSaveConn:()=>this.dbSaveConn(), dbTestMsg:st._dbtest||'',
      dbSelOpen:!!st.dbSel&&!st.dbAddOpen, dbSelName, dbDbs:dbdbs, dbSchemaTables, dbSchemaErr, dbEmpty:realMode&&!dbHasConns&&!st.dbAddOpen,
      // Tablo veri editörü
      dbTableOpen:!!st._dbTable, dbTableName:st._dbTable||'', dbCloseTable:()=>this.dbCloseTable(), dbReloadTable:()=>this.dbReloadTable(),
      dbTableLoading:!!(st._dbTable&&!_td), dbTableErr:(_td&&_td.error)||'',
      dbTableColHdr, dbTableRows, dbTableRowCount:(_td&&_td.rows&&_td.rows.length)||0,
      dbTableHasRows:!!(_td&&_td.rows&&_td.rows.length), dbTableEmpty:!!(_td&&!_td.error&&_td.rows&&_td.rows.length===0),
      dbTableNoPk:!!(_td&&!_td.error&&!(dbHasPk)), dbRowMsg:st._dbRowMsg||'',
      // DB v2: insert + sayfalama + CSV + sıralama
      dbNewCells, dbNewOpen:!!st._dbNewOpen, dbInsertOpen:()=>this.dbInsertOpen(), dbInsertRow:()=>this.dbInsertRow(),
      dbInsertLabel:st._dbRowBusy==='new'?'…':'Ekle', dbExportCsv:()=>this.dbExportCsv(),
      dbPageInfo, dbPrevPage:()=>this.dbPrevPage(), dbNextPage:()=>this.dbNextPage(),
      dbCanPrev:(st._dbOffset||0)>0, dbCanNext:!!(_td&&_td.total!=null&&((st._dbOffset||0)+100)<_td.total),
      dbRowMsgStyle:`font-family:'JetBrains Mono',monospace;font-size:11px;color:${/✕|yok/.test(st._dbRowMsg||'')?'#ff6b7a':'#55e88b'}`,
      settingsOpen: st.settings,
      openSettings:()=>{ if(window.galaxy&&window.galaxy.openSettings){ try{ window.galaxy.openSettings(); return; }catch(e){} } this.setState({settings:true}); },
      closeSettings:()=>this.setState({settings:false}),
      isKayit: st.leftTab==='kayit', isAgac: st.leftTab==='agac', isGit: st.leftTab==='git',
      gitFiles, commits, gitBranchName, gitDirtyCount, hasGitFiles, noGitFiles:!hasGitFiles,
      gitAB, gitStatusLine, gitHasChangesLeft:gitDirtyCount>0, gitCleanLeft:gitDirtyCount===0,
      gitTopCommitMsg:gitTopCommit?gitTopCommit.msg:'', gitTopCommitMeta:gitTopCommit?(gitTopCommit.hash+' · '+gitTopCommit.when):'', hasTopCommit:!!gitTopCommit,
      isGitRepoSel, notGitRepoSel:!isGitRepoSel,
      gitStatusColor: gitDirtyCount>0?'#ffc861':'#55e88b',
      // Git istemci
      gitStagedList, gitUnstagedList, hasStaged:stagedArr.length>0, hasUnstaged:unstagedArr.length>0, gitWorkClean:!stagedArr.length&&!unstagedArr.length,
      gitStagedCount:stagedArr.length, gitCommitLabel:'Commit'+(stagedArr.length?(' · '+stagedArr.length):''), gitCanCommit:stagedArr.length>0,
      gitMsg:st.gitMsg, onGitMsg:(e)=>this.onGitMsg(e), onGitMsgKey:(e)=>this.onGitMsgKey(e), gitCommit:()=>this.gitCommit(),
      gitStageAll:()=>this.gitStageAll(), gitPush:()=>this.gitPush(), gitPull:()=>this.gitPull(),
      gitBusy:!!st._gitBusy, gitActionMsg:st._gitActionMsg||'', hasGitActionMsg:!!st._gitActionMsg, gitActionMsgStyle:`font-family:'JetBrains Mono',monospace;font-size:11px;color:${/✕/.test(st._gitActionMsg||'')?'#ff6b7a':'#55e88b'}`,
      gitBranchList, branchAddOpen:!!st._branchAdd, openBranchAdd:()=>this.setState({_branchAdd:true,branchInput:''}),
      branchInput:st.branchInput, onBranchInput:(e)=>this.onBranchInput(e), onBranchKey:(e)=>this.onBranchKey(e), gitCreateBranch:()=>this.gitCreateBranch(),
      gitDiffOpen:!!_gitDiff, gitDiffFile:(_gitDiff&&_gitDiff.file)||'', gitDiffLoading:!!(_gitDiff&&_gitDiff.content==null),
      gitDiffLines:this._diffLines((_gitDiff&&_gitDiff.content)||''), closeGitDiff:()=>this.closeGitDiff(),
      hasCommits, noCommits:!hasCommits, authors, hasAuthors, noAuthors:!hasAuthors,
      gitClean:gitDirtyCount===0, gitHasChanges:gitDirtyCount>0,
      isPlan: st.kayitSub==='plan', isNotlar: st.kayitSub==='notlar', isBaglanti: st.kayitSub==='baglanti', isOdak: st.kayitSub==='odak',
      kayitTabs: [['plan','PLAN'],['notlar','NOTLAR'],['baglanti','BAĞLANTILAR'],['odak','ODAK']].map(([id,label])=>({label,onClick:()=>this.setState({kayitSub:id}),style:`background:none;border:none;cursor:pointer;padding:0 0 4px;font-family:'JetBrains Mono',monospace;font-size:10px;letter-spacing:.08em;text-transform:uppercase;border-bottom:1.5px solid ${st.kayitSub===id?'#61dcff':'transparent'};color:${st.kayitSub===id?'#61dcff':'#8791b8'}`})),
      selNotes: noteArr.map(t=>({t})),
      selLinks: linkArr.map(([name,desc,c])=>({name,desc,dotStyle:`width:8px;height:8px;border-radius:50%;background:${c};flex-shrink:0;box-shadow:0 0 8px ${c}`})),
      hasNotes: noteArr.length>0, hasLinks: linkArr.length>0,
      // Bağlantı ekleme (inline)
      linkAdd: st.linkAdd, linkInput: st.linkInput, openLinkAdd:()=>this.setState({linkAdd:true,linkInput:''}),
      onLinkInput:(e)=>this.onLinkInput(e), onLinkKey:(e)=>this.onLinkKey(e), addLink:()=>this.addLink(),
      // Gezegen özet kartındaki "Günlük" — gerçek son commit
      selLastActivity: commits.length?((commits[0].when||'')+': '+commits[0].msg):'kayıt yok',
      // HUD dock — gerçek veriye bağlı özet
      ...(()=>{ const allP=(this._allProjects||this.PROJECTS);
        const star=allP.slice().sort((a,b)=>(((b._git&&b._git.activity30)||0)-((a._git&&a._git.activity30)||0))||((b.prog||0)-(a.prog||0)))[0]||sel;
        const act=(star&&star._git&&star._git.activity30)||0;
        const recent=commits.slice(0,3).map(c=>({when:(c.when||'').slice(5,10)||(c.when||''),text:c.msg,
          whenStyle:"font-family:'JetBrains Mono',monospace;color:#8791b8;margin-right:6px"}));
        const notes=noteArr.slice(0,3);
        return { hudStarName:(star&&star.name)||'—', hudStarMeta:act?(act+' commit / 30g'):((star&&star.stage)||''),
          hudRecent:recent, hasHudRecent:recent.length>0,
          hudNotes:notes.map(t=>({t})), hasHudNotes:notes.length>0 }; })(),
      // ---- Zamanlanmış görev raporları (HUD'da listelenir, tıklanınca app-içi açılır) ----
      ...(()=>{ const reps=(st._reports||[]).map(fn=>{ const m=String(fn).match(/^(\d{4}-\d{2}-\d{2})-(.+)-\d+\.md$/);
          const date=m?m[1]:''; const title=m?m[2]:String(fn).replace(/\.md$/,'');
          return { name:fn, title, when:date, onClick:()=>this.openReport(fn),
            style:`display:flex;gap:10px;align-items:baseline;padding:5px 0;cursor:pointer`,
            whenStyle:`font-family:'JetBrains Mono',monospace;font-size:10px;color:#8791b8;flex-shrink:0`,
            titleStyle:`font-size:12px;color:#8b96b8` }; });
        const rv=st._reportView;
        return { reportList:reps, hasReports:reps.length>0, noReports:reps.length===0,
          reportViewOpen:!!rv, reportViewName:(rv&&rv.name)||'', reportViewLoading:!!(rv&&rv.content==null),
          reportLines:this._mdLines((rv&&rv.content)||''), closeReport:()=>this.closeReport(), reportExternal:()=>this.reportExternal() }; })(),
      noteInput: st.noteInput, onNoteInput:(e)=>this.onNoteInput(e), onNoteKey:(e)=>this.onNoteKey(e), addNote:()=>this.addNote(),
      focusDisplay: `${String(Math.floor(st.focusSec/60)).padStart(2,'0')}:${String(st.focusSec%60).padStart(2,'0')}`,
      focusRunning: st.focusRunning, focusBtn: st.focusRunning?'⏸ DURAKLAT':'▸ BAŞLAT',
      toggleFocus:()=>this.toggleFocus(), resetFocus:()=>this.resetFocus(),
      gitCenterOpen: !!st.gitCenter,
      openGitCenter:()=>{this.setState({gitCenter:'durum'});this._loadGit();}, openGitFlow:()=>this.setState({gitCenter:'rehber'}), closeGitCenter:()=>this.setState({gitCenter:null}),
      gcDurum: st.gitCenter==='durum', gcTakim: st.gitCenter==='takim', gcGecmis: st.gitCenter==='gecmis', gcRehber: st.gitCenter==='rehber',
      gitCenterTabs: [['durum','DURUM'],['takim','TAKIM AKIŞI'],['gecmis','GEÇMİŞ'],['rehber','GIT FLOW REHBERİ']].map(([id,label])=>({label,style:`padding:8px 14px;cursor:pointer;font-family:'JetBrains Mono',monospace;font-size:10px;letter-spacing:.1em;text-transform:uppercase;background:${st.gitCenter===id?'rgba(97,220,255,.08)':'transparent'};border:1px solid ${st.gitCenter===id?'#61dcff':'rgba(190,205,255,.16)'};color:${st.gitCenter===id?'#61dcff':'#8b96b8'}`,onClick:()=>this.setState({gitCenter:id})})),
      isSpace: space, isPlanet: st.mode==='planet',
      // Konum breadcrumb + hızlı geçiş anahtarı
      locUniName: ((this._unis||[]).find(u=>u.id===st.uniId)||{}).name || 'Evren seç',
      locOpen: st.locOpen, toggleLoc:()=>this.setState({locOpen:!st.locOpen}), closeLoc:()=>this.setState({locOpen:false}),
      locBtnBg: st.locOpen?'rgba(97,220,255,.1)':'rgba(4,6,12,.5)', locBtnBorder: st.locOpen?'#61dcff':'rgba(190,205,255,.18)',
      locUnis: (this._unis||[]).map(u=>{
        const ps=(this._allProjects||[]).filter(p=>p.universe===u.id);
        const active=u.id===st.uniId;
        return { name:u.name, meta:ps.length+' gezegen',
          rowStyle:`display:flex;align-items:center;gap:10px;width:100%;text-align:left;padding:9px 12px;cursor:pointer;background:${active?'rgba(97,220,255,.1)':'transparent'};border:none;border-left:2px solid ${active?'#61dcff':'transparent'}`,
          dot:`display:inline-block;width:13px;flex-shrink:0;color:${active?'#61dcff':'#4d5677'}`, mark: active?'●':'○',
          onClick:()=>{ this.selectUni(u.id); this.setState({locOpen:false}); } };
      }),
      locActiveName: ((this._unis||[]).find(u=>u.id===st.uniId)||{}).name || '',
      locPlanets: (this._allProjects||[]).filter(p=>p.universe===st.uniId).map(p=>{
        const cur=p.id===st.selId && st.mode==='planet';
        return { name:p.name,
          dot:`display:inline-block;width:8px;height:8px;border-radius:50%;flex-shrink:0;background:${(({active:'#55e88b',paused:'#ffc861',waiting:'#8791b8'})[p.status])||'#61dcff'}`,
          rowStyle:`display:flex;align-items:center;gap:10px;width:100%;text-align:left;padding:8px 12px;cursor:pointer;background:${cur?'rgba(97,220,255,.1)':'transparent'};border:none;border-left:2px solid ${cur?'#61dcff':'transparent'}`,
          nameStyle:`font-size:12px;color:${cur?'#dbe4ff':'#8b96b8'}`, cur, curMark: cur?'buradasın':'',
          onClick:()=>{ this._gotoProject(p.id); this.setState({locOpen:false}); } };
      }),
      hasLocPlanets: (this._allProjects||[]).some(p=>p.universe===st.uniId),
      viewGalaxy: space&&isEvren, viewPano: space&&st.tab==='pano', viewDb: space&&st.tab==='db', viewZaman: space&&st.tab==='zaman',
      board, schedule,
      todoInput: st.todoInput, onTodoInput:(e)=>this.onTodoInput(e), onTodoKey:(e)=>this.onTodoKey(e), addTodo:()=>this.addTodo(),
      agentsW: st.agentId?'368px':(st.rightCollapsed?'0px':'64px'), dockH: st.hudOpen?'340px':'40px',
      railW: st.leftCollapsed?'0px':'246px',
      toggleLeft:()=>this.setState({leftCollapsed:!st.leftCollapsed}), toggleRight:()=>this.setState({rightCollapsed:!st.rightCollapsed}),
      leftIcon: st.leftCollapsed?'▶':'◀', rightIcon: st.rightCollapsed?'◀':'▶',
      hudOpen: st.hudOpen, hudArrow: st.hudOpen?'▾':'▴',
      hudBtnBg: st.hudOpen?'rgba(97,220,255,.08)':'transparent', hudBtnBorder: st.hudOpen?'#61dcff':'rgba(190,205,255,.16)', hudBtnColor: st.hudOpen?'#61dcff':'#8b96b8',
      tabs, railItems, planets, files, leftTabs, consoleTabs, agents,
      projCount:'· '+((this.PROJECTS&&this.PROJECTS.length)||0), noProjects:!(this.PROJECTS&&this.PROJECTS.length),
      isClaude: st.consoleTab==='claude', isBash: st.consoleTab==='bash',
      claudeLines, bashLines, emptyClaude:claudeLines.length===0, emptyBash:bashLines.length===0,
      consoleInput: st.consoleInput, onConsoleInput:(e)=>this.onConsoleInput(e), onConsoleKey:(e)=>this.onConsoleKey(e), sendConsole:()=>this.sendConsole(),
      consolePrompt: st.consoleTab==='bash'?'$':'›', focusConsole:()=>this._focusConsole(),
      consolePlaceholder: st.consoleTab==='bash'?'komut yaz, Enter ile çalıştır…':'Claude\'a yaz, Enter ile gönder…',
      consoleH:(st.consoleH||180)+'px', onConsoleResize:(e)=>this.onConsoleResize(e),
      agentOpen: !!activeRaw, activeAgent: active, activeMsgs,
      agentInput: st.agentInput, onAgentInput:(e)=>this.onAgentInput(e), onAgentKey:(e)=>this.onAgentKey(e), sendAgent:()=>this.sendAgent(), agentBusy: st._agentBusy,
      agentAdd:()=>this.openAgentAdd(), agentDelete:()=>this.askConfirm('"'+((this.AGENTS.find(a=>a.id===st.agentId)||{}).name||'ajan')+'" ajanını sil?',()=>this._agentDelete(st.agentId)), agentEdit:()=>this.openAgentEdit(),
      activePresets, activeDesc, hasActivePresets,
      agentFormOpen: st.agentFormOpen, closeAgentForm:()=>this.setState({agentFormOpen:false}),
      agSetName:(e)=>this.agentFormSet('name',e.target.value), agSetPrompt:(e)=>this.agentFormSet('prompt',e.target.value),
      agSetP1:(e)=>this.agentFormSet('p1',e.target.value), agSetP2:(e)=>this.agentFormSet('p2',e.target.value), agSetP3:(e)=>this.agentFormSet('p3',e.target.value),
      saveAgentForm:()=>this.saveAgentForm(), agFormName:st.agentForm.name, agFormPrompt:st.agentForm.prompt, agFormP1:st.agentForm.p1, agFormP2:st.agentForm.p2, agFormP3:st.agentForm.p3, agFormTitle: st.agentForm.id?'Ajanı Düzenle':'Yeni Ajan',
      backupsOpen: st.backupsOpen, closeBackups:()=>this.setState({backupsOpen:false}),
      backupList:((st._backups)||[]).map(b=>({name:b.name,date:b.date||'',size:b.size?Math.round(b.size/1024)+' KB':'',onRestore:()=>this._restoreBackup(b.name)})),
      hasBackups:!!(st._backups&&st._backups.length), noBackups:!!(st._backups&&!st._backups.length),
      contextChip: st.mode==='planet'? sel.name : 'Tüm evren',
      paletteOpen: st.palette, paletteResults, warping: st.warping,
      hasSelected: space&&isEvren,
      readmeText:(st._readme&&st._readme.content)||'', readmeName:(st._readme&&st._readme.name)||'README.md', hasRealReadme:!!(st._readme&&st._readme.content), noRealReadme:!(st._readme&&st._readme.content),
      readmeLines: (()=>{ const q=String(st.docQuery||'').trim().toLowerCase(); let lines=this._mdLines((st._readme&&st._readme.content)||'');
        if(q) lines=lines.filter(ln=>ln.type!=='blank' && (ln.segs||[]).map(s=>s.t).join('').toLowerCase().includes(q));
        return lines; })(),
      docQuery: st.docQuery, onDocSearch:(e)=>this.setState({docQuery:(e&&e.target&&e.target.value)||''}),
      createReadme:()=>this.createReadme(), readmeBusy:!!st._readmeBusy, createReadmeLabel:st._readmeBusy?'oluşturuluyor…':'＋ README.md Oluştur',
      // README YOK + GİZLENENLER (gerçek veriye bağlı, tıklanınca açılır liste)
      ...(()=>{ const uniP=(this._allProjects||[]).filter(p=>p.universe===st.uniId);
        const noR=uniP.filter(p=>!p._readme); const hid=(this._scan&&this._scan.ignored)||[];
        const rowS=`font-family:'JetBrains Mono',monospace;font-size:11px;color:#8b96b8;cursor:pointer;padding:3px 0 3px 14px`;
        return {
          noReadmeLabel:'⚠ README YOK ('+noR.length+')', hasNoReadme:noR.length>0, noReadmeOpen:!!st._showNoReadme,
          toggleNoReadme:()=>this.setState({_showNoReadme:!st._showNoReadme}),
          noReadmeList:noR.map(p=>({name:'· '+p.name,onClick:()=>this._gotoProject(p.id),style:rowS})),
          hiddenLabel:'GİZLENENLER ('+hid.length+')', hasHidden:hid.length>0, hiddenOpen:!!st._showHidden,
          toggleHidden:()=>this.setState({_showHidden:!st._showHidden}),
          hiddenList:hid.map(h=>({name:'· '+(h.name||h.id),onClick:()=>this._unhide(h.id),style:rowS})),
        }; })(),
      docNoMatch: !!(String(st.docQuery||'').trim() && (st._readme&&st._readme.content) && !this._mdLines(st._readme.content).some(ln=>ln.type!=='blank'&&(ln.segs||[]).map(s=>s.t).join('').toLowerCase().includes(String(st.docQuery).trim().toLowerCase()))),
      selName: sel.name, selDesc: sel.desc, selStage: sel.stage, selBranch: sel.branch, selProg: sel.prog,
      selProgLabel:'%'+sel.prog, selPlanLabel: planLabel, selPlan,
      selStatusColor: sc.c, selStatusLabel: sc.l,
      selDotStyle:`width:10px;height:10px;border-radius:50%;background:${sc.c};box-shadow:0 0 8px ${sc.c}`,
      selBarStyle:`width:${sel.prog}%;height:100%;background:linear-gradient(90deg,${sc.c},#8ae7ff);box-shadow:0 0 10px ${sc.c};transition:width .6s`,
      treeList: this._flatTree(this._treeNodes||[], '', 0).slice(0,140).map(t=>({name:(t.dir?'▸ ':'· ')+t.name, onClick:()=>this._openFsNode(t.path,t.dir), style:`padding:3px 0 3px ${t.depth*18}px;cursor:pointer;color:${t.dir?'#61dcff':'#8b96b8'};white-space:nowrap;font-family:'JetBrains Mono',monospace;font-size:12px`})),
      hasTree: (this._treeNodes&&this._treeNodes.length)>0, noTree: !(this._treeNodes&&this._treeNodes.length),
      enter:()=>this.enter(), back:()=>this.back(),
      openProjectFolder:()=>this.openProjectFolder(), removeProject:()=>this.removeProject(),
      schAddOpen:st.schAddOpen, openSchAdd:()=>this.setState({schAddOpen:true,_schResult:''}), closeSchAdd:()=>this.setState({schAddOpen:false}),
      schSetName:(e)=>this.schFormSet('name',e.target.value), schSetPrompt:(e)=>this.schFormSet('prompt',e.target.value),
      schSetHour:(e)=>this.schFormSet('hour',e.target.value), schSetMinute:(e)=>this.schFormSet('minute',e.target.value),
      schSetDaily:()=>this.schFormSet('type','daily'), schSetWeekly:()=>this.schFormSet('type','weekly'),
      schIsDaily:st.schForm.type==='daily', schIsWeekly:st.schForm.type==='weekly',
      schTypeDailyStyle:`padding:6px 12px;cursor:pointer;font-family:'JetBrains Mono',monospace;font-size:11px;border:1px solid ${st.schForm.type==='daily'?'#61dcff':'rgba(190,205,255,.16)'};color:${st.schForm.type==='daily'?'#61dcff':'#8b96b8'};background:${st.schForm.type==='daily'?'rgba(97,220,255,.08)':'transparent'}`,
      schTypeWeeklyStyle:`padding:6px 12px;cursor:pointer;font-family:'JetBrains Mono',monospace;font-size:11px;border:1px solid ${st.schForm.type==='weekly'?'#61dcff':'rgba(190,205,255,.16)'};color:${st.schForm.type==='weekly'?'#61dcff':'#8b96b8'};background:${st.schForm.type==='weekly'?'rgba(97,220,255,.08)':'transparent'}`,
      schDays:[['1','Pzt'],['2','Sal'],['3','Çar'],['4','Per'],['5','Cum'],['6','Cmt'],['7','Paz']].map(([v,l])=>({label:l,onClick:()=>this.schFormSet('weekday',v),style:`padding:4px 10px;cursor:pointer;font-family:'JetBrains Mono',monospace;font-size:11px;border:1px solid ${st.schForm.weekday===v?'#61dcff':'rgba(190,205,255,.16)'};color:${st.schForm.weekday===v?'#61dcff':'#8b96b8'};background:${st.schForm.weekday===v?'rgba(97,220,255,.08)':'transparent'}`})),
      schAgents:this.AGENTS.map(a=>({name:a.name,onClick:()=>this.schFormSet('agentId',a.id),style:`padding:4px 10px;cursor:pointer;font-family:'JetBrains Mono',monospace;font-size:11px;border:1px solid ${st.schForm.agentId===a.id?a.color:'rgba(190,205,255,.16)'};color:${st.schForm.agentId===a.id?a.color:'#8b96b8'};background:transparent`})),
      saveSchedule:()=>this.saveSchedule(), schResult:st._schResult||'', hasSchResult:!!st._schResult,
      dbSql:st.dbSql, onDbSql:(e)=>this.onDbSql(e), onDbSqlKey:(e)=>this.onDbSqlKey(e), runDbQuery:()=>this.runDbQuery(),
      dbAsk:st.dbAsk, onDbAsk:(e)=>this.onDbAsk(e), onDbAskKey:(e)=>this.onDbAskKey(e), runDbAgent:()=>this.runDbAgent(),
      dbAgentBusy:!!st.dbAgentBusy, dbAgentBtn:st.dbAgentBusy?'…':'⚡ Sor',
      dbGenSql:(st._dbresult&&st._dbresult.sql)||'', hasGenSql:!!(st._dbresult&&st._dbresult.sql),
      dbResultFields:((st._dbresult&&st._dbresult.fields)||[]).map(f=>({name:(f&&f.name)||String(f)})),
      dbResultRows:((st._dbresult&&st._dbresult.rows)||[]).slice(0,50).map(r=>({cells:Object.values(r).map(v=>({v:v==null?'':String(v)}))})),
      dbResultErr:(st._dbresult&&st._dbresult.error)||'', hasDbResult:!!(st._dbresult&&(st._dbresult.rows||st._dbresult.error)),
      dbLog:((st._dblog)||[]).map(l=>({sql:l.sql,info:l.info,ok:l.ok,when:(l.ts||'').slice(5,16).replace('T',' '),
        req:l.agent?('🤖 '+(l.request||'')):'', isAgent:!!l.agent,
        style:`padding:8px 12px;border-bottom:1px solid rgba(190,205,255,.06);border-left:2px solid ${l.ok?'#55e88b':'#ff6b7a'}`,
        reqStyle:`font-size:11px;color:#c9a6ff;font-family:'JetBrains Mono',monospace;margin-bottom:3px`,
        infoStyle:`font-size:10px;color:${l.ok?'#55e88b':'#ff6b7a'};font-family:'JetBrains Mono',monospace`})),
      hasDbLog:!!(st._dblog&&st._dblog.length), clearDbLog:()=>this.clearDbLog(),
      // ---- yazma onayı ----
      dbConfirmOpen:!!st._dbConfirm, dbConfirmSql:(st._dbConfirm&&st._dbConfirm.sql)||'', dbConfirmDanger:!!(st._dbConfirm&&st._dbConfirm.danger),
      dbConfirmTitle:(st._dbConfirm&&st._dbConfirm.danger)?'⚠ Yıkıcı işlem — emin misin?':'Bu işlem veriyi değiştirecek — onayla',
      confirmDbWrite:()=>this.confirmDbWrite(), cancelDbWrite:()=>this.cancelDbWrite(),
      // ---- dosya önizleme popup ----
      previewOpen:!!st._preview, closePreview:()=>this.closePreview(), openPreviewExternal:()=>this.openPreviewExternal(),
      previewName:(st._preview&&st._preview.name)||'', previewRel:(st._preview&&st._preview.rel)||'',
      previewMeta:(st._preview&&st._preview.size!=null)?('  ·  '+(st._preview.size<1024?st._preview.size+' B':(st._preview.size/1024<1024?(st._preview.size/1024).toFixed(1)+' KB':(st._preview.size/1048576).toFixed(1)+' MB'))):'',
      pvText:!!(st._preview&&(st._preview.kind==='text'||st._preview.kind==='markdown')&&!st._editMode),
      pvImage:!!(st._preview&&st._preview.kind==='image'),
      pvPdf:!!(st._preview&&st._preview.kind==='pdf'),
      pvMedia:!!(st._preview&&(st._preview.kind==='audio'||st._preview.kind==='video')),
      pvVideo:!!(st._preview&&st._preview.kind==='video'),
      pvAudio:!!(st._preview&&st._preview.kind==='audio'),
      pvBinary:!!(st._preview&&st._preview.kind==='binary'),
      pvLoading:!!(st._preview&&st._preview.kind==='loading'),
      pvError:!!(st._preview&&st._preview.kind==='error'),
      previewText:(st._preview&&st._preview.content)||'', previewUrl:(st._preview&&st._preview.url)||'',
      // dosya düzenleme
      pvEditable:!!(st._preview&&(st._preview.kind==='text'||st._preview.kind==='markdown')), editMode:!!st._editMode,
      startEdit:()=>this.startEdit(), saveEdit:()=>this.saveEdit(), cancelEdit:()=>this.cancelEdit(),
      editContent:st._editContent, onEditContent:(e)=>this.onEditContent(e), editBusy:!!st._editBusy,
      editSaveLabel:st._editBusy?'…':'Kaydet', editMsg:st._editMsg||'',
      previewDelete:()=>{ const p=st._preview; if(p&&p.rel) this.fileDelete(p.rel); },
      // projede ara + yeni dosya
      grepQuery:st.grepQuery, onGrepInput:(e)=>this.onGrepInput(e), onGrepKey:(e)=>this.onGrepKey(e), runGrep:()=>this.runGrep(), grepBusy:!!st._grepBusy,
      grepResults:((st._grep)||[]).map(m=>({file:m.file,line:m.line,text:m.text, label:m.file+':'+m.line,
        onClick:()=>this.openPreview(m.file), style:`padding:5px 8px;cursor:pointer;border-bottom:1px solid rgba(190,205,255,.05)`,
        locStyle:`font-family:'JetBrains Mono',monospace;font-size:10px;color:#61dcff`, textStyle:`font-family:'JetBrains Mono',monospace;font-size:11px;color:#8b96b8;white-space:nowrap;overflow:hidden;text-overflow:ellipsis`})),
      hasGrep:!!(st._grep&&st._grep.length), grepEmpty:!!(st._grep&&st._grep.length===0),
      newFileOpen:!!st._newFileOpen, openNewFile:()=>this.setState({_newFileOpen:true,newFileInput:''}), newFileInput:st.newFileInput,
      onNewFileInput:(e)=>this.onNewFileInput(e), onNewFileKey:(e)=>this.onNewFileKey(e), fileCreate:()=>this.fileCreate(),
      // ---- gezegen klasör drill ----
      fsCwd:st._fsCwd||'', fsInSub:!!st._fsCwd, fsUp:()=>this._fsUp(),
      fsCrumb:st._fsCwd?('/ '+st._fsCwd):'',
      openPalette:()=>this.setState({palette:true,query:''}), closePalette:()=>this.setState({palette:false,query:''}), stop:(e)=>{e.stopPropagation&&e.stopPropagation();},
      // İstasyon araçları (saat · takvim · hesap makinesi · hızlı ara)
      toolsOpen: st.toolsOpen, toggleTools:()=>this.toggleTools(), closeTools:()=>this.closeTools(),
      toolsBtnBorder: st.toolsOpen?'#61dcff':'rgba(190,205,255,.16)',
      clockTop:this._clk().hm, toolsClock:this._clk().hms, toolsDate:this._clk().date,
      calTitle:this._calCells(st.calMonthOffset).title, calCells:this._calCells(st.calMonthOffset).cells,
      calPrev:()=>this.calPrev(), calNext:()=>this.calNext(), calToday:()=>this.calToday(),
      calcExpr:st.calcExpr||'', onCalc:(e)=>this.onCalc(e), onCalcKey:(e)=>this.onCalcKey(e),
      calcEq:()=>this.calcEq(), calcClear:()=>this.calcClear(), calcBack:()=>this.calcBack(),
      calcKeys:['7','8','9','/','4','5','6','*','1','2','3','-','0','.','%','+'].map(k=>({k,onClick:()=>this.calcPush(k)})),
      toolFind:st.toolFind||'', onToolFind:(e)=>this.onToolFind(e),
      toolFindRes:this._toolFindHits().map(p=>({name:p.name,group:p.group||'',dot:'display:inline-block;width:8px;height:8px;border-radius:50%;background:'+((({active:'#55e88b',paused:'#ffc861',waiting:'#8791b8'})[p.status])||'#61dcff'),onClick:()=>this.toolGo(p.id)})),
      hasToolFind:!!(String(st.toolFind||'').trim()),
      onSearch:(e)=>this.onSearch(e), onSearchKey:(e)=>this.onSearchKey(e),
      toggleHud:()=>this.setState({hudOpen:!st.hudOpen}), closeAgent:()=>this.setState({agentId:null}),
      // Global toast + yıkıcı-işlem onayı
      toastOpen:!!st._toast, toastMsg:(st._toast&&st._toast.msg)||'',
      toastStyle:`position:fixed;top:64px;right:22px;z-index:80;max-width:360px;padding:12px 16px;border:1px solid ${(st._toast&&st._toast.kind==='err')?'#ff6b7a':'#55e88b'};background:${(st._toast&&st._toast.kind==='err')?'rgba(40,12,16,.95)':'rgba(10,30,18,.95)'};color:${(st._toast&&st._toast.kind==='err')?'#ff9aa4':'#7bf0a8'};font-family:'JetBrains Mono',monospace;font-size:12px;box-shadow:0 12px 40px rgba(0,0,0,.5);animation:slideIn .22s ease both`,
      confirmOpen:!!st._confirm, confirmMsg:(st._confirm&&st._confirm.msg)||'', runConfirm:()=>this.runConfirm(), cancelConfirm:()=>this.cancelConfirm(),
      // Özellik rehberi
      guideOpen:!!st._guideOpen, openGuide:()=>this.openGuide(), closeGuide:()=>this.closeGuide(),
      guideSections:this._guideData().map(([title,items])=>({title, items:items.map(t=>({t}))})),
    };
  }

  // ==================== PROJECT GALAXY ASİSTANI ====================
  // dc dışında, body'ye eklenen bağımsız katman: parçacık orbu (canvas) + ses giriş/çıkış + komut yönlendirme.
  // Durum renkleri: idle cyan · listening yeşil · working mavi · speaking parlak cyan.
  _asstFold(s){ return String(s||'').toLocaleLowerCase('tr').replace(/ı/g,'i').replace(/İ/g,'i'); }
  _initAssistant(){
    if(this._asst||typeof document==='undefined') return;
    const self=this;
    const A=this._asst={ open:false, state:'idle', amp:0, rec:null, cc:0, speak:false, convo:false };
    // --- kök + panel + orb ---
    const root=document.createElement('div'); root.id='ga-root';
    root.style.cssText='position:fixed;right:22px;bottom:50px;z-index:70;display:flex;flex-direction:column;align-items:flex-end;gap:12px;font-family:Inter,system-ui,-apple-system,sans-serif';
    const panel=document.createElement('div'); panel.id='ga-panel';
    panel.style.cssText='width:372px;max-width:84vw;height:0;opacity:0;pointer-events:none;overflow:hidden;transition:height .3s cubic-bezier(.2,.8,.2,1),opacity .22s ease;background:linear-gradient(180deg,rgba(11,15,30,.97),rgba(5,8,18,.98));border:1px solid rgba(97,220,255,.24);border-radius:16px;backdrop-filter:blur(18px);box-shadow:0 22px 70px rgba(0,0,0,.55);display:flex;flex-direction:column';
    panel.innerHTML=
      '<div style="display:flex;align-items:center;gap:10px;padding:14px 16px;border-bottom:1px solid rgba(190,205,255,.1)">'
      + '<span id="ga-dot" style="width:9px;height:9px;border-radius:50%;background:#61dcff;box-shadow:0 0 10px #61dcff;flex-shrink:0"></span>'
      + '<div style="flex:1;min-width:0"><div style="font-size:13px;font-weight:600;color:#dbe4ff;letter-spacing:.02em">Galaxy Asistanı</div><div id="ga-status" style="font-family:\'JetBrains Mono\',monospace;font-size:10px;color:#8791b8;margin-top:1px">hazır — bir komut ver</div></div>'
      + '<span id="ga-new" title="Yeni sohbet" style="color:#8791b8;cursor:pointer;font-size:14px;padding:2px 6px">✎</span>'
      + '<span id="ga-close" title="Kapat" style="color:#8791b8;cursor:pointer;font-size:15px;padding:2px 6px">✕</span></div>'
      + '<div id="ga-log" style="flex:1;min-height:220px;max-height:46vh;overflow-y:auto;padding:14px 16px;display:flex;flex-direction:column;gap:10px"></div>'
      + '<div style="display:flex;gap:8px;align-items:center;padding:10px 12px;border-top:1px solid rgba(190,205,255,.1)">'
      + '<input id="ga-text" placeholder="Bir şey yaz…" style="flex:1;background:rgba(10,14,28,.7);border:1px solid rgba(190,205,255,.16);border-radius:10px;color:#dbe4ff;font-size:13px;padding:9px 12px;outline:none" />'
      + '<button id="ga-send" title="Gönder" style="width:38px;height:38px;flex-shrink:0;border-radius:10px;border:1px solid #61dcff;background:rgba(97,220,255,.14);color:#61dcff;cursor:pointer;font-size:15px">➤</button></div>';
    const orbWrap=document.createElement('div'); orbWrap.id='ga-orbwrap';
    orbWrap.title='Galaxy Asistanı — tıkla ya da konuş';
    orbWrap.style.cssText='width:84px;height:84px;cursor:pointer;position:relative;transition:transform .18s ease';
    orbWrap.onmouseenter=()=>{ orbWrap.style.transform='scale(1.08)'; }; orbWrap.onmouseleave=()=>{ orbWrap.style.transform='scale(1)'; };
    const canvas=document.createElement('canvas'); canvas.id='ga-orb'; canvas.width=222; canvas.height=222;
    canvas.style.cssText='width:100%;height:100%;display:block';
    orbWrap.appendChild(canvas);
    root.appendChild(panel); root.appendChild(orbWrap);
    document.body.appendChild(root);
    try{ window.__ga=A; }catch(e){}
    A.root=root; A.panel=panel; A.canvas=canvas; A.log=panel.querySelector('#ga-log');
    A.statusEl=panel.querySelector('#ga-status'); A.dotEl=panel.querySelector('#ga-dot'); A.textEl=panel.querySelector('#ga-text'); A.micBtn=panel.querySelector('#ga-mic');
    // --- parçacık orbu (2D) ---
    const ctx=canvas.getContext('2d'); const N=96; const P=[];
    for(let i=0;i<N;i++){ P.push({a:Math.random()*Math.PI*2, r:26+Math.random()*66, sp:0.003+Math.random()*0.012, sz:0.7+Math.random()*2.4, ph:Math.random()*Math.PI*2, rr:0.85+Math.random()*0.3}); }
    const COL={ idle:[97,220,255], listening:[85,232,139], working:[70,132,246], speaking:[138,231,255] };
    let tk=0;
    const draw=()=>{ A._raf=requestAnimationFrame(draw); tk++;
      const w=canvas.width,h=canvas.height,cx=w/2,cy=h/2; ctx.clearRect(0,0,w,h); ctx.globalCompositeOperation='lighter';
      const c=COL[A.state]||COL.idle;
      const speed=A.state==='working'?2.6:(A.state==='listening'?1.15:1);
      const pulse=A.state==='listening'?(0.6+A.amp*0.9+Math.sin(tk*0.11)*0.1):(A.state==='speaking'?(0.72+Math.abs(Math.sin(tk*0.16))*0.5):(0.88+Math.sin(tk*0.045)*0.13));
      const coreR=30*pulse;
      const g=ctx.createRadialGradient(cx,cy,0,cx,cy,coreR*2.1);
      g.addColorStop(0,'rgba('+c[0]+','+c[1]+','+c[2]+',.95)'); g.addColorStop(.38,'rgba('+c[0]+','+c[1]+','+c[2]+',.34)'); g.addColorStop(1,'rgba(0,0,0,0)');
      ctx.fillStyle=g; ctx.beginPath(); ctx.arc(cx,cy,coreR*2.1,0,Math.PI*2); ctx.fill();
      for(const p of P){ p.a+=p.sp*speed; const rr=p.r*pulse+Math.sin(tk*0.03+p.ph)*5; const x=cx+Math.cos(p.a)*rr, y=cy+Math.sin(p.a)*rr*p.rr;
        const al=0.42+Math.sin(tk*0.05+p.ph)*0.4; ctx.fillStyle='rgba('+c[0]+','+c[1]+','+c[2]+','+Math.max(0,al)+')';
        ctx.beginPath(); ctx.arc(x,y,p.sz*(0.7+pulse*0.5),0,Math.PI*2); ctx.fill(); }
      ctx.globalCompositeOperation='source-over';
    };
    draw();
    // --- olaylar ---
    orbWrap.addEventListener('click',()=>this._asstToggle());
    panel.querySelector('#ga-close').addEventListener('click',(e)=>{ e.stopPropagation(); this._asstClose(); });
    // Sesli komut şimdilik kapalı — yalnız yazışma. (STT altyapısı dursun, aktive edilmiyor.)
    A.sttMode='off'; A.wakeOn=false; A.native=false;
    panel.querySelector('#ga-new').addEventListener('click',(e)=>{ e.stopPropagation(); this._asstNewChat(); });
    // Kalıcı sohbet geçmişini yükle (kapanınca kaybolmasın)
    try{ if(window.galaxy&&window.galaxy.asstHistoryGet){ window.galaxy.asstHistoryGet().then(r=>{ const ms=(r&&r.messages)||[]; if(ms.length){ A._greeted=true; for(const m of ms){ this._asstSay(m.role==='user'?'user':'assistant', m.text||'', {speak:false}); } if(A.log) A.log.scrollTop=A.log.scrollHeight; } }); } }catch(e){}
    const send=()=>{ const v=A.textEl.value.trim(); if(!v) return; A.textEl.value=''; A.speak=false; this.assistantHandle(v); };  // yazılı → sesli okuma yok
    panel.querySelector('#ga-send').addEventListener('click',(e)=>{ e.stopPropagation(); send(); });
    A.textEl.addEventListener('keydown',(e)=>{ if(e.key==='Enter'){ e.preventDefault(); send(); } });
    // ilk karşılama
    A._greeted=false;
  }
  _asstToggle(){ const A=this._asst; if(!A) return; A.open?this._asstClose():this._asstOpen(); }
  _asstOpen(){ const A=this._asst; if(!A) return; A.open=true; A.panel.style.height='auto'; A.panel.style.height=Math.min(window.innerHeight*0.7,520)+'px'; A.panel.style.opacity='1'; A.panel.style.pointerEvents='auto';
    if(!A._greeted){ A._greeted=true; this._asstSay('assistant','Selam! Ben senin dijital ikizin. İstersen sohbet ederiz, istersen bir işini hallederim — “Core SDK’ya git”, “commit et”, “terminalde npm test çalıştır” ya da aklına takılan herhangi bir şeyi yaz.',{speak:false}); }
    setTimeout(()=>{ try{ A.textEl.focus(); }catch(e){} },80); }
  _asstClose(){ const A=this._asst; if(!A) return; A.open=false; A.panel.style.height='0'; A.panel.style.opacity='0'; A.panel.style.pointerEvents='none'; try{ window.speechSynthesis&&window.speechSynthesis.cancel(); }catch(e){} }
  _asstSetState(s){ const A=this._asst; if(!A) return; A.state=s; const lbl={idle:'hazır — bir komut ver',listening:'dinliyorum…',working:'çalışıyorum…',speaking:'yanıtlıyorum…'}[s]||''; const col={idle:'#61dcff',listening:'#55e88b',working:'#4684f6',speaking:'#8ae7ff'}[s]||'#61dcff';
    if(A.statusEl) A.statusEl.textContent=lbl; if(A.dotEl){ A.dotEl.style.background=col; A.dotEl.style.boxShadow='0 0 10px '+col; } if(A.canvas){ A.canvas.parentNode.style.filter='drop-shadow(0 0 20px '+col+'88)'; } }
  _asstSay(role,text,opts){ const A=this._asst; if(!A) return; opts=opts||{};
    const row=document.createElement('div'); const me=role==='user';
    row.style.cssText='max-width:88%;align-self:'+(me?'flex-end':'flex-start')+';font-size:13px;line-height:1.5;padding:9px 12px;border-radius:12px;white-space:pre-wrap;word-break:break-word;'
      +(me?'background:rgba(97,220,255,.14);border:1px solid rgba(97,220,255,.28);color:#dbe4ff;border-bottom-right-radius:4px':'background:rgba(20,26,46,.8);border:1px solid rgba(190,205,255,.12);color:#c3cbe6;border-bottom-left-radius:4px');
    row.textContent=text; A.log.appendChild(row); A.log.scrollTop=A.log.scrollHeight;
    if(!me && opts.speak!==false && A.speak) this._asstSpeak(text); return row; }  // yalnız sesli girişte oku
  _asstReply(text){ if(!this._asst||!text) return; if(!this._asst.open) this._asstOpen(); this._asstSay('assistant',text); this._asstPersist('assistant',text); }
  _asstPersist(role,text){ try{ if(window.galaxy&&window.galaxy.asstHistoryAppend&&text) window.galaxy.asstHistoryAppend({role,text:String(text)}); }catch(e){} }
  _asstNewChat(){ const A=this._asst; if(!A) return; try{ if(window.galaxy&&window.galaxy.asstHistoryClear) window.galaxy.asstHistoryClear(); }catch(e){}
    this._asstClaudeSess={};                                  // Claude devamlılığını da sıfırla (yeni oturum)
    if(A.log) A.log.innerHTML=''; A._greeted=false; this._asstSay('assistant','Yeni bir sayfa açtık. Ne yapalım?',{speak:false}); A._greeted=true; }
  // ---- Günlük durum brifingi (proaktif dijital ikiz) ----
  _asstBriefData(){ const ps=this._allProjects||[]; const active=ps.filter(p=>p.status==='active');
    const stale=active.filter(p=>(p._stale||0)>=14).sort((a,b)=>(b._stale||0)-(a._stale||0));
    const fresh=active.filter(p=>(p._stale||0)<3).sort((a,b)=>(a._stale||0)-(b._stale||0));
    const pend=active.map(p=>({n:p.name,c:(p.plan||[]).filter(i=>!i[1]).length})).filter(x=>x.c>0).sort((a,b)=>b.c-a.c);
    if(!ps.length) return '';
    const L=['Toplam '+ps.length+' proje, '+active.length+' aktif.'];
    if(stale.length) L.push('Durgunlar (gün): '+stale.slice(0,6).map(p=>p.name+' '+(p._stale||0)+'g').join(', '));
    if(fresh.length) L.push('Son dokunulanlar: '+fresh.slice(0,6).map(p=>p.name).join(', '));
    if(pend.length) L.push('Bekleyen plan maddeleri: '+pend.slice(0,6).map(x=>x.n+' ('+x.c+')').join(', '));
    return L.join('\n'); }
  _asstBrief(manual){ const A=this._asst; if(!A) return; if(!(window.galaxy&&window.galaxy.assistantRun)){ if(manual) this._asstReply('Bunu yapabilmem için Claude kurulumu gerek.'); return; }
    const data=this._asstBriefData(); if(!data){ if(manual) this._asstReply('Henüz özetleyecek proje verisi yok.'); return; }
    this._asstOpen(); A.speak=false; this._asstSetState('working');
    const prompt='Bana çok kısa, sıcak bir '+(manual?'':'günaydın ')+'brifingi ver — dijital ikizim gibi samimi konuş. Aşağıdaki duruma bakıp en kritik 2-3 şeyi vurgula ve bugün neye odaklanmamı öner. Madde madde liste dökme, 3-4 cümle yeter:\n\n'+data;
    const runId='asst-brief-'+(++A.cc); A._clRaw=''; A._clRow=null; A._clRun=runId;
    try{ window.galaxy.assistantRun({runId,cwd:null,prompt,continueSession:false,ctx:this._asstCtx()}); }catch(e){ this._asstSetState('idle'); this._asstReply('Brifing hazırlanamadı.'); } }
  _asstMaybeDailyBrief(){ try{ if(!this._asst) return; if(window.galaxy&&window.galaxy.__testNoBrief) return; const today=new Date().toISOString().slice(0,10); if(localStorage.getItem('gxBriefDate')===today) return; if(!(this._allProjects||[]).length) return; localStorage.setItem('gxBriefDate',today); setTimeout(()=>this._asstBrief(false),3500); }catch(e){} }
  // ---- Otomatik güncelleme bildirimi ----
  _onUpdate(kind,p){ if(kind==='available'){ this._showUpdateBanner(p); } else if(kind==='none'){ this.toast((p&&p.noRepo)?'Güncelleme deposu ayarlı değil':'Zaten en güncel sürümdesin ✓'); } else if(kind==='error'){ this.toast('Güncelleme denetlenemedi (bağlantı?)','err'); } }
  _showUpdateBanner(p){ try{ if(!p||!p.version) return; const old=document.getElementById('gx-update'); if(old) old.remove();
    const el=document.createElement('div'); el.id='gx-update';
    el.style.cssText='position:fixed;top:62px;left:50%;transform:translateX(-50%);z-index:80;display:flex;align-items:center;gap:14px;background:linear-gradient(90deg,rgba(97,220,255,.18),rgba(199,123,255,.18));border:1px solid rgba(97,220,255,.42);border-radius:12px;padding:10px 12px 10px 16px;backdrop-filter:blur(14px);box-shadow:0 12px 44px rgba(0,0,0,.5);font-family:Inter,system-ui,-apple-system,sans-serif;animation:fadeUp .3s ease both';
    el.innerHTML='<span style="font-size:16px">🚀</span><span style="font-size:13px;color:#dbe4ff">Yeni sürüm <b>v'+String(p.version).replace(/[<>]/g,'')+'</b> hazır</span>';
    const dl=document.createElement('button'); dl.textContent='İndir'; dl.style.cssText='border:1px solid #61dcff;background:rgba(97,220,255,.16);color:#61dcff;border-radius:8px;padding:6px 14px;cursor:pointer;font-size:12px;font-family:inherit';
    dl.onclick=()=>{ try{ window.galaxy&&window.galaxy.openUpdate&&window.galaxy.openUpdate(p.url); }catch(e){} el.remove(); };
    const x=document.createElement('span'); x.textContent='✕'; x.title='Kapat'; x.style.cssText='color:#8791b8;cursor:pointer;font-size:14px;padding:0 4px'; x.onclick=()=>el.remove();
    el.appendChild(dl); el.appendChild(x); document.body.appendChild(el);
  }catch(e){} }
  // Konuşma metnini temizle: gizli aksiyon komutları, emoji, markdown → sesli okumaya uygun düz metin
  _asstClean(text){ let t=String(text||'');
    t=t.replace(/\[\[ACT[^\]]*\]\]/g,' ');                       // gizli aksiyon komutları
    t=t.replace(/[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{2190}-\u{21FF}\u{2B00}-\u{2BFF}\u{FE00}-\u{FE0F}\u{1F1E6}-\u{1F1FF}\u200d]/gu,''); // emoji
    t=t.replace(/```[\s\S]*?```/g,' kod bloğu ').replace(/`([^`]+)`/g,'$1'); // kod
    t=t.replace(/[*_#>~]/g,'').replace(/\[([^\]]+)\]\([^)]+\)/g,'$1');       // markdown
    t=t.replace(/\s{2,}/g,' ').trim(); return t; }
  _asstPickVoice(){ try{ if(!window.speechSynthesis) return null; const vs=window.speechSynthesis.getVoices()||[]; if(!vs.length) return null;
    const want=(this._lang==='en')?/en[-_]/i:/tr[-_]/i;
    const trs=vs.filter(v=>want.test(v.lang)||(this._lang!=='en'&&/turkish|yelda/i.test(v.name)));
    const pref=trs.find(v=>/premium|enhanced|natural|siri/i.test(v.name))||trs.find(v=>/yelda/i.test(v.name))||trs[0];
    return pref||null; }catch(e){ return null; } }
  _asstSpeak(text){ try{ if(!window.speechSynthesis) return; const clean=this._asstClean(text); if(!clean) return; window.speechSynthesis.cancel();
    const A=this._asst; if(A&&A.convo) this._asstPauseRec();   // konuşurken kendi sesini dinlemesin
    const est=Math.min(30000, clean.length*80+900);           // tahmini konuşma süresi (onend gelmezse kurtarma için)
    const restore=()=>{ if(!A) return; A._speakUntil=Date.now()+500; if(A.state==='speaking') this._asstSetState(A.sttMode==='command'?'listening':'idle'); if(A.convo) this._asstResumeRec(); };
    const u=new SpeechSynthesisUtterance(clean.slice(0,700)); u.lang=(this._lang==='en')?'en-US':'tr-TR'; u.rate=0.98; u.pitch=1.02;
    if(!this._asstVoice) this._asstVoice=this._asstPickVoice(); if(this._asstVoice) u.voice=this._asstVoice;
    if(A){ A._speakUntil=Date.now()+est; if(A._speakT) clearTimeout(A._speakT); A._speakT=setTimeout(restore, est+600); }  // onstart/onend gelmezse (bazı ortamlar) donmasın
    u.onstart=()=>{ this._asstSetState('speaking'); if(A) A._speakUntil=Date.now()+est; };
    u.onend=()=>{ if(A&&A._speakT){ clearTimeout(A._speakT); A._speakT=null; } restore(); };
    this._asstSetState('speaking'); window.speechSynthesis.speak(u); }catch(e){} }
  // Sürekli konuşma modu: bir kez bas → "çekil/dur/kapan" diyene kadar (ya da mic'e tekrar basana kadar) dinler.
  _asstMicToggle(){ const A=this._asst; if(!A) return; if(!A.open) this._asstOpen();
    // Native STT (macOS) — mic butonu komut modunu aç/kapatır
    if(A.native){ if(A.sttMode==='command'){ this._asstCommandExit('Tamam, dinlemeyi bıraktım.'); } else { this._asstActivateManual(); } return; }
    if(A.convo){ this._asstConvoStop('Tamam, dinlemeyi bıraktım.'); return; }
    const SR=window.SpeechRecognition||window.webkitSpeechRecognition;
    if(!SR){ A.speak=false; this._asstSay('assistant','Bu ortamda ses tanıma yok — yazarak konuşabiliriz.',{speak:false}); return; }
    A.convo=true; A.speak=true; A._gotAny=false; this._asstMicBtn(true); this._asstStartRec(); this._asstMicMeter(true);
    this._asstSay('assistant','Seni dinliyorum, konuş. Bitince “dur” ya da “çekil” de, kapatırım.',{speak:false}); }
  _asstMicBtn(on){ const A=this._asst; if(!A||!A.micBtn) return; A.micBtn.style.background=on?'rgba(85,232,139,.16)':'rgba(97,220,255,.08)'; A.micBtn.style.borderColor=on?'#55e88b':'rgba(97,220,255,.3)'; A.micBtn.style.color=on?'#55e88b':'#61dcff'; A.micBtn.textContent=on?'■':'🎙'; A.micBtn.title=on?'Dinlemeyi durdur':'Sesli komut'; }
  _asstStartRec(){ const A=this._asst; if(!A||!A.convo) return; const SR=window.SpeechRecognition||window.webkitSpeechRecognition; if(!SR) return;
    try{ const rec=new SR(); A.rec=rec; rec.lang=(this._lang==='en')?'en-US':'tr-TR'; rec.interimResults=true; rec.continuous=true; rec.maxAlternatives=1;
      rec.onstart=()=>{ if(A.state!=='speaking'&&A.state!=='working') this._asstSetState('listening'); };
      rec.onresult=(e)=>{ A._gotAny=true; let interim='',final=''; for(let i=e.resultIndex;i<e.results.length;i++){ const r=e.results[i]; if(r.isFinal) final+=r[0].transcript; else interim+=r[0].transcript; }
        if(A._silT){ clearTimeout(A._silT); A._silT=null; }
        if(final.trim()){ A._interim=''; if(A.textEl) A.textEl.value=''; this._asstHeard(final.trim()); return; }
        if(interim){ A._interim=interim; if(A.textEl) A.textEl.value=interim;
          // Motor "final" üretmezse: 1.4sn sessizlikte biriken metni kendimiz gönderelim.
          A._silT=setTimeout(()=>{ A._silT=null; const t=(A._interim||'').trim(); A._interim=''; if(A.textEl) A.textEl.value=''; if(t) this._asstHeard(t); }, 1400); }
      };
      rec.onerror=(ev)=>{ const er=ev&&ev.error;
        if(er==='not-allowed'||er==='service-not-allowed'){ this._asstConvoStop(''); A.speak=false; this._asstSay('assistant','Mikrofona erişemedim. Sistem Ayarları → Gizlilik ve Güvenlik → Mikrofon’dan “Project Galaxy”ye izin ver, sonra tekrar dene.',{speak:false}); }
        else if(er==='network'||er==='language-not-supported'){ this._asstConvoStop(''); A.speak=false; this._asstSay('assistant','Ses tanıma servisi bu ortamda yanıt vermiyor. Şimdilik yazarak konuşalım; sesli tanımayı düzeltmek için üzerinde çalışıyorum.',{speak:false}); }
      };
      rec.onend=()=>{ A.rec=null; if(A.convo && !A._recPaused){ setTimeout(()=>{ if(A.convo && !A._recPaused && !A.rec) this._asstStartRec(); },250); } };
      rec.start();
    }catch(e){ /* zaten çalışıyor olabilir */ } }
  _asstHeard(txt){ const A=this._asst; if(!A) return; if(A.textEl) A.textEl.value='';
    const n=this._asstFold(txt);
    if(/^\s*(çekil|dur|kapan|yeter|sus|teşekkürler kapat|dinlemeyi bırak|iptal|tamam kapat)\b/.test(n)){ this._asstConvoStop('Tamam, kapattım. Yine lazım olursan buradayım.'); return; }
    A.speak=true; this.assistantHandle(txt); }
  _asstConvoStop(msg){ const A=this._asst; if(!A) return; A.convo=false; A._recPaused=false; this._asstMicBtn(false); this._asstMicMeter(false); try{ if(A.rec){ A.rec.onend=null; A.rec.stop(); } }catch(e){} A.rec=null; if(this._asst.state==='listening') this._asstSetState('idle'); if(msg) this._asstReply(msg); }
  _asstPauseRec(){ const A=this._asst; if(!A) return; A._recPaused=true; try{ if(A.rec){ A.rec.onend=null; A.rec.stop(); } }catch(e){} A.rec=null; }
  _asstResumeRec(){ const A=this._asst; if(!A||!A.convo) return; A._recPaused=false; if(!A.rec) this._asstStartRec(); }
  // ---- Native STT (macOS Speech) : "Hey Galaxy" uyandırma + sesli komut ----
  _asstWakeBtnStyle(){ const A=this._asst; if(!A||!A.wakeBtn) return; const on=A.native&&A.wakeOn; A.wakeBtn.style.color=on?'#55e88b':'#8791b8'; A.wakeBtn.style.opacity=A.native?'1':'.4'; A.wakeBtn.title=A.native?(on?'Hep dinle AÇIK — “Hey Galaxy” de':'Hep dinle kapalı'):'Native ses tanıma yok'; }
  _asstWakeToggle(){ const A=this._asst; if(!A) return; if(!A.native){ A.speak=false; this._asstSay('assistant','Bu ortamda native ses tanıma yok; mic tuşuyla konuşabiliriz.',{speak:false}); return; } A.wakeOn=!A.wakeOn; this._asstWakeBtnStyle(); if(A.wakeOn){ this._asstWakeStart(); this._asstSay('assistant','Tamam, artık “Hey Galaxy” diyerek beni çağırabilirsin.',{speak:false}); } else { if(A.sttMode!=='command'){ A.sttMode='off'; this._asstSttStop(); } this._asstSay('assistant','Hep dinleme kapandı. Mic tuşuyla yine konuşabiliriz.',{speak:false}); } }
  _asstSttStart(){ try{ if(window.galaxy&&window.galaxy.sttStart){ window.galaxy.sttStart(); this._asst._sttRunning=true; } }catch(e){} }
  _asstSttStop(){ try{ if(window.galaxy&&window.galaxy.sttStop){ window.galaxy.sttStop(); } }catch(e){} this._asst._sttRunning=false; }
  _asstWakeStart(){ const A=this._asst; if(!A||!A.native||!A.wakeOn) return; A.sttMode='wake'; if(!A._sttRunning) this._asstSttStart(); }
  _asstActivateManual(){ const A=this._asst; A.sttMode='command'; A.speak=true; if(!A._sttRunning) this._asstSttStart(); this._asstMicBtn(true); this._asstSetState('listening'); A._cmdBuf=''; this._asstSay('assistant','Seni dinliyorum, konuş. “Dur” dediğinde kapatırım.',{speak:false}); }
  _asstActivateFromWake(rest){ const A=this._asst; if(A.sttMode==='command') return; A.sttMode='command'; A.speak=true; if(!A.open) this._asstOpen(); this._asstMicBtn(true); A._cmdBuf=''; this._asstSetState('listening'); this._asstSpeak('Efendim?');
    if(rest){ const r=rest.trim(); if(r.length>2 && !/^(hey|galaxy|galaksi|galeksi)$/.test(this._asstFold(r))){ setTimeout(()=>this._asstSttSubmit(r),700); } } }
  _asstCommandExit(msg){ const A=this._asst; if(!A) return; if(A._silT){ clearTimeout(A._silT); A._silT=null; } A._cmdBuf=''; if(A.textEl) A.textEl.value=''; A.sttMode=A.wakeOn?'wake':'off'; this._asstMicBtn(false); if(A.state==='listening') this._asstSetState('idle'); if(msg){ A.speak=true; this._asstReply(msg); } if(A.sttMode==='off') this._asstSttStop(); }
  _asstSttSubmit(text){ const A=this._asst; if(!A) return; const t=String(text||A._cmdBuf||(A.textEl&&A.textEl.value)||'').trim(); A._cmdBuf=''; if(A.textEl) A.textEl.value=''; if(!t) return;
    const n=this._asstFold(t); if(/^\s*(çekil|dur|kapan|yeter|sus|iptal|tamam kapat|dinlemeyi bırak)\b/.test(n)){ this._asstCommandExit('Tamam, kapattım. “Hey Galaxy” ile yine çağır.'); return; }
    A.speak=true; this.assistantHandle(t); }
  _onStt(m){ const A=this._asst; if(!A||!m) return;
    if(m.type==='status'){ if(m.text==='listening'||m.text==='ondevice'||m.text==='server'||m.text==='authorized') A._sttRunning=true; if(m.text==='closed'||m.text==='stopped') A._sttRunning=false; return; }
    if(m.type==='error'){ A._sttRunning=false; if(/auth-denied|auth-restricted|auth-not/.test(m.text||'')){ A.native=false; A.wakeOn=false; this._asstWakeBtnStyle(); if(!A.open) this._asstOpen(); A.speak=false; this._asstSay('assistant','Konuşma tanıma/mikrofon izni kapalı. Sistem Ayarları → Gizlilik ve Güvenlik → “Konuşma Tanıma” ve “Mikrofon” altında Project Galaxy’ye izin verip uygulamayı yeniden aç. O zamana kadar yazarak konuşalım.',{speak:false}); } return; }
    const text=String(m.text||''); if(!text) return;
    // kendi TTS sesini komut sanmasın
    if(A.state==='speaking' || (A._speakUntil && Date.now()<A._speakUntil)) return;
    const n=this._asstFold(text);
    if(A.sttMode==='wake'){ if(/hey ?gal|gal(a|e|i)ks?i|galaxy|galaksi|galeksi/.test(n)){ const after=n.replace(/^.*?(hey\s*)?(gal(a|e|i)ks?i|galaxy|galaksi|galeksi)\s*/,''); this._asstActivateFromWake(after); } return; }
    if(A.sttMode==='command'){
      if(m.type==='final'){ if(A._silT){ clearTimeout(A._silT); A._silT=null; } A._cmdBuf=text; this._asstSttSubmit(text); }
      else { A._cmdBuf=text; if(A.textEl) A.textEl.value=text; if(A.state!=='working') this._asstSetState('listening'); if(A._silT) clearTimeout(A._silT); A._silT=setTimeout(()=>{ A._silT=null; this._asstSttSubmit(); },1500); }
      return; }
  }
  _asstMicMeter(on){ const A=this._asst; if(!A) return;
    if(!on){ A.amp=0; try{ if(A._micStream){ A._micStream.getTracks().forEach(t=>t.stop()); A._micStream=null; } if(A._ac){ A._ac.close(); A._ac=null; } }catch(e){} return; }
    try{ if(!navigator.mediaDevices) return; navigator.mediaDevices.getUserMedia({audio:true}).then(stream=>{ A._micStream=stream; const AC=window.AudioContext||window.webkitAudioContext; const ac=new AC(); A._ac=ac; const src=ac.createMediaStreamSource(stream); const an=ac.createAnalyser(); an.fftSize=256; src.connect(an); const data=new Uint8Array(an.frequencyBinCount);
      const tick=()=>{ if(!A._ac) return; an.getByteFrequencyData(data); let s=0; for(let i=0;i<data.length;i++) s+=data[i]; A.amp=Math.min(1,(s/data.length)/90); A._micRaf=requestAnimationFrame(tick); }; tick();
    }).catch(()=>{}); }catch(e){} }
  // --- komut yönlendirme: uygulama kontrolü + geliştirme (Claude) ---
  _asstFindProject(q){ q=this._asstFold(q); const ps=this.PROJECTS||[]; if(!q) return null; let best=null,bs=0;
    for(const p of ps){ const nm=this._asstFold(p.name); let s=0; if(nm===q) s=100; else if(nm.indexOf(q)>=0||q.indexOf(nm)>=0) s=65; else { const qw=q.split(/\s+/).filter(w=>w.length>2); s=qw.filter(w=>nm.indexOf(w)>=0).length*22; } if(s>bs){ bs=s; best=p; } }
    return bs>=22?best:null; }
  _asstFindUni(q){ q=this._asstFold(q); const us=this._unis||[]; if(!q) return null; let best=null,bs=0;
    for(const u of us){ if(!u.id) continue; const nm=this._asstFold(u.name||''); let s=0; if(nm===q) s=100; else if(nm.indexOf(q)>=0||q.indexOf(nm)>=0) s=65; else { const qw=q.split(/\s+/).filter(w=>w.length>2); s=qw.filter(w=>nm.indexOf(w)>=0).length*22; } if(s>bs){ bs=s; best=u; } }
    return bs>=22?best:null; }
  _asstCtx(){ return { unis:(this._unis||[]).filter(u=>u.id).map(u=>u.name), projects:(this.PROJECTS||[]).map(p=>p.name), location:(this.state.mode==='planet'?('“'+((this.sel&&this.sel.name)||'')+'” gezegeni'):'uzay (evren: '+(((this._unis||[]).find(u=>u.id===this.state.uniId)||{}).name||'-')+')') }; }
  // Tüm uygulama aksiyonları tek kapıdan — hem yerel parser hem Claude komutları bunu çağırır.
  _asstDoAction(name,arg){ arg=(arg||'').trim(); const inProj=this.state.mode==='planet'&&this.sel&&this.sel._path;
    switch(name){
      case 'open_universe':{ const u=this._asstFindUni(arg); if(u){ this.selectUni(u.id); return '“'+u.name+'” evrenini açtım.'; } return arg?('“'+arg+'” diye bir evren bulamadım.'):null; }
      case 'open_project':{ const p=this._asstFindProject(arg); if(p){ this._gotoProject(p.id); return '“'+p.name+'” gezegenine indim.'; } return arg?('“'+arg+'” diye bir proje bulamadım.'):null; }
      case 'open_tab':{ const map={genel:'Genel Bakış',evren:'Evren',pano:'Pano',db:'Veritabanı',docker:'Docker',zaman:'Zamanlayıcı',servers:'Sunucular'}; if(map[arg]){ this.setState({tab:arg,mode:'space',agentId:null}); try{ this._onTabOpen&&this._onTabOpen(arg); }catch(e){} return map[arg]+' sekmesini açtım.'; } return null; }
      case 'open_git': if(!inProj) return 'Git için önce bir projeye girmem gerek.'; this.setState({leftTab:'git',gitCenter:'durum'}); return 'Git Merkezi’ni açtım.';
      case 'back': this.back&&this.back(); return 'Uzaya döndüm.';
      case 'git_push': if(!inProj) return 'Push için bir projeye girmem gerek.'; this.gitPush&&this.gitPush(); return 'Push ediyorum.';
      case 'git_pull': if(!inProj) return 'Pull için bir projeye girmem gerek.'; this.gitPull&&this.gitPull(); return 'Pull ediyorum.';
      case 'git_commit': if(!inProj) return 'Commit için bir projeye girmem gerek.'; this.setState({leftTab:'git',gitCenter:'durum'}); if(arg) this.setState({gitMsg:arg}); return 'Git Merkezi’ni açtım'+(arg?(', commit mesajı: “'+arg+'”.'):'.');
      case 'run': if(!inProj) return 'Terminal için bir projeye girmem gerek.'; this._asstRunBash(arg); return null;
      case 'open_folder': this.openProjectFolder&&this.openProjectFolder(); return 'Klasörü Finder’da açtım.';
      case 'open_terminal': try{ if(this.sel&&this.sel._path&&window.galaxy.openTerminal) window.galaxy.openTerminal(this.sel._path); }catch(e){} return 'Terminali açtım.';
      case 'open_settings': try{ if(window.galaxy&&window.galaxy.openSettings) window.galaxy.openSettings(); else this.setState({settings:true}); }catch(e){} return 'Ayarları açtım.';
      case 'hud': this.setState({hudOpen:!this.state.hudOpen}); return null;
      case 'tools': this.setState({toolsOpen:true}); return null;
    }
    return null; }
  async assistantHandle(text){ text=String(text||'').trim(); if(!text) return; const A=this._asst; if(!A) return; if(!A.open) this._asstOpen();
    this._asstSay('user',text); this._asstPersist('user',text);
    // nazik kalıpları temizle → eşleşme kolaylaşsın
    let n=this._asstFold(text).replace(/\b(lütfen|acaba|rica etsem|benim için|bir|misin|mısın|musun|müsün|mısınız|abi|dostum|kanka|hadi)\b/g,' ').replace(/\s{2,}/g,' ').trim();
    // 1) uzaya dön
    if(/^(uzaya (dön|git)|geri dön|ana ekran|galaksiye dön|geri$|çık$)/.test(n)){ return this._asstReply(this._asstDoAction('back')); }
    // 2) evren aç  (ör: "papilon evrenini aç")
    let um=n.match(/(.+?)\s*evren(?:ini|ine|i)?\s*(aç|geç|git|göster)?$/) || n.match(/^evren(?:i)?\s*(aç|değiştir)\s*(.+)$/);
    if(um){ const q=(um[1]&&!/^(aç|geç|git|göster|değiştir)$/.test(um[1])?um[1]:um[2]||'')||''; const r=this._asstDoAction('open_universe',q); if(r) return this._asstReply(r); }
    // 3) sekmeler
    const tabs=[[/(pano|kanban|todo)/,'pano'],[/(docker|konteyner)/,'docker'],[/(veritaban|(^| )db( |$)|sql)/,'db'],[/(zamanlay|scheduler|zamanl)/,'zaman'],[/(sunucu|ssh)/,'servers'],[/(genel bak|overview)/,'genel']];
    for(const [re,id] of tabs){ if(re.test(n)&&/(aç|göster|geç|git|bak)/.test(n)){ return this._asstReply(this._asstDoAction('open_tab',id)); } }
    // 4) git
    if(/\b(push|gönder)\b/.test(n)){ return this._asstReply(this._asstDoAction('git_push')); }
    if(/\b(pull|çek)\b/.test(n)){ return this._asstReply(this._asstDoAction('git_pull')); }
    if(/\bcommit\b/.test(n)){ const msg=text.replace(/.*commit\s*(et|le|leyelim)?\s*:?/i,'').trim(); return this._asstReply(this._asstDoAction('git_commit',msg)); }
    if(/(git )?(durum|status)/.test(n) && this.state.mode==='planet'){ this.setState({leftTab:'git'}); const g=this.state._git; return this._asstReply(((g&&g.branch)||'?')+' dalındasın, '+((g&&g.dirty)||0)+' bekleyen değişiklik var.'); }
    // 5) klasör / terminal / ayarlar
    if(/(klasör|finder).*(aç|göster)|(aç|göster).*(klasör|finder)/.test(n)&&this.state.mode==='planet'){ return this._asstReply(this._asstDoAction('open_folder')); }
    if(/(gerçek |sistem )?terminal.*(aç)|(aç).*terminal/.test(n)&&this.state.mode==='planet'){ return this._asstReply(this._asstDoAction('open_terminal')); }
    if(/(ayarlar|settings).*(aç|göster)|(aç).*ayarlar/.test(n)){ return this._asstReply(this._asstDoAction('open_settings')); }
    // 6) terminal komutu
    const shM=text.match(/^(?:terminalde|bash(?:'?te)?|komut(?:u)?|çalıştır|run|shell)\s*:?\s+(.+)$/i);
    if(shM){ if(this.state.mode!=='planet'||!(this.sel&&this.sel._path)) return this._asstReply('Terminal komutu için önce bir projeye girmem gerek — hangi projede?'); return this._asstRunBash(shM[1].trim()); }
    // 7) projeye git  (ör: "core sdk projesine git", "delta data'yı aç")
    const navM=n.match(/^(.*?)\s*(projesine|gezegenine|adlı projeye|projesi|gezegeni|projeye)?\s*(git|aç|geç|gir|gidelim|götür|dal)$/);
    if(navM){ const q=(navM[1]||'').replace(/\b(projesine|gezegenine|projesi|gezegeni|adlı|projeye|proje)\b/g,'').trim(); if(q){ const p=this._asstFindProject(q); if(p){ this._gotoProject(p.id); return this._asstReply('“'+p.name+'” gezegenine indim.'); } } }
    // 8) yardım
    if(/(ne yapabilirsin|neler yapabilir|yeteneğin|komutlar)/.test(n)){ return this._asstReply('Konuşabiliriz ya da senin için iş görürüm: evren/proje açma (“papilon evrenini aç”), sekme (“docker’ı aç”), git (“commit et”, “push”), terminal (“terminalde npm test çalıştır”), klasör/ayarlar açma ve doğrudan geliştirme (“şu hatayı düzelt”). Neye ihtiyacın var?'); }
    // 8b) günlük brifing / durum raporu
    if(/(brifing|brifin|durum raporu|günün özeti|projelerin? özeti|nereye odaklan|bugün ne var)/.test(n)){ return this._asstBrief(true); }
    // 9) varsayılan → dijital ikiz (sohbet + gerekiyorsa aksiyon komutu üretir)
    return this._asstAskClaude(text);
  }
  _asstRunBash(cmd){ const p=this.sel; if(!p||!p._path) return; const sid='asst-sh-'+(p.id||''); this._asstSetState('working');
    this._asstSay('assistant','▮ '+cmd,{speak:false}); this._asstReply('Terminalde çalıştırıyorum: '+cmd);
    try{ if(window.galaxy&&window.galaxy.shellStart) window.galaxy.shellStart({shellId:sid,cwd:p._path}); if(window.galaxy&&window.galaxy.shellInput) window.galaxy.shellInput({shellId:sid,cwd:p._path,cmd}); }catch(e){} }
  _asstShellMsg(m){ const A=this._asst; if(!A) return; if(!m) return;
    if(m.kind==='out'||m.kind==='err'){ const line=String(m.text||''); if(line){ A._shBuf=(A._shBuf||''); A._shBuf+=(A._shBuf?'\n':'')+line; if(A._shRow){ A._shRow.textContent=A._shBuf.slice(-1400); } else { A._shRow=this._asstSay('assistant',A._shBuf.slice(-1400),{speak:false}); A._shRow.style.fontFamily="'JetBrains Mono',monospace"; A._shRow.style.fontSize='11px'; } A.log.scrollTop=A.log.scrollHeight; } }
    else if(m.kind==='done'||m.kind==='exit'){ this._asstSetState('idle'); const done=A._shBuf?('bitti.'):'komut çalıştı.'; A._shBuf=''; A._shRow=null; this._asstReply('Komut '+done); } }
  // Dijital ikiz: her yerde sohbet eder (proje şart değil). Projedeyken dosya/terminal işi de yapabilir.
  _asstAskClaude(text){ const p=this.sel; const A=this._asst; const inProj=this.state.mode==='planet'&&p&&p._path;
    if(!(window.galaxy&&window.galaxy.assistantRun)){ return this._asstReply('Şu an düşünebilmem için Claude kurulumuna ihtiyacım var. Terminalde: npm install -g @anthropic-ai/claude-code'); }
    this._asstSetState('working');
    const key=inProj?('p:'+p.id):'chat'; const cwd=inProj?p._path:null;
    const runId='asst-'+key.replace(/[^a-z0-9]/gi,'')+'-'+(++A.cc);
    this._asstClaudeSess=this._asstClaudeSess||{}; const cont=!!this._asstClaudeSess[key]; this._asstClaudeSess[key]=true;
    A._clRaw=''; A._clRow=null; A._clRun=runId; A._clActN=0;
    try{ window.galaxy.assistantRun({runId,cwd,prompt:text,continueSession:cont,ctx:this._asstCtx()}); }catch(e){ this._asstSetState('idle'); this._asstReply('Bir şeyler ters gitti, tekrar dener misin?'); } }
  // Akıştan gizli [[ACT ...]] komutlarını ayıkla + çalıştır, gerisini temiz gösterip oku (token token akış).
  _asstActDisplay(raw){ return String(raw||'').replace(/\[\[ACT[^\]]*\]\]/g,'').replace(/\[\[[^\]]*$/,'').replace(/\s{2,}/g,' ').trimStart(); }
  _asstRunActions(){ const A=this._asst; const re=/\[\[ACT\s+([a-z_]+)(?:\|([^\]]*))?\]\]/gi; let m,i=0; const raw=A._clRaw||'';
    while((m=re.exec(raw))){ i++; if(i>A._clActN){ A._clActN=i; try{ this._asstDoAction(this._asstFold(m[1]).trim(), (m[2]||'').trim()); }catch(e){} } } }
  _asstClaudeMsg(m){ const A=this._asst; if(!A||!m) return;
    const push=(t)=>{ A._clRaw=(A._clRaw||'')+t; this._asstRunActions(); const disp=this._asstActDisplay(A._clRaw); if(disp){ if(A._clRow) A._clRow.textContent=disp; else A._clRow=this._asstSay('assistant',disp,{speak:false}); } if(A.state!=='speaking') this._asstSetState('working'); A.log.scrollTop=A.log.scrollHeight; };
    if(m.kind==='text'||m.kind==='data'){ const t=String(m.text||''); if(t) push(t); }
    else if(m.kind==='result'){ if(!((A._clRaw||'').trim()) && m.text) push(String(m.text)); }
    else if(m.kind==='tool'||m.kind==='info'||m.kind==='raw'){ /* sessiz */ }
    else if(m.kind==='err'){ const t=String(m.text||'').trim(); if(t){ this._asstSetState('idle'); this._asstReply('Şununla takıldım: '+t.slice(0,180)); A._clRaw=''; A._clRow=null; } }
    else if(m.kind==='done'){ const disp=this._asstActDisplay(A._clRaw||'').trim(); A._clRaw=''; A._clRow=null; this._asstSetState('idle'); if(disp) this._asstPersist('assistant',disp); if(disp && A.speak) this._asstSpeak(disp); else if(this._asst&&this._asst.convo) this._asstResumeRec(); } }

  _waitThree(t){ if(window.THREE){ this._initBg(); return; } if(t>80) return; setTimeout(()=>this._waitThree(t+1),60); }
  _initBg(){
    const canvas=document.getElementById('bgGalaxy'); if(!canvas) return;
    const THREE=window.THREE;
    const renderer=new THREE.WebGLRenderer({canvas,antialias:true,alpha:true});
    renderer.setPixelRatio(Math.min(window.devicePixelRatio,2));
    const scene=new THREE.Scene();
    const camera=new THREE.PerspectiveCamera(60,1,0.1,100); camera.position.set(0,3,7); camera.lookAt(0,0,0);
    const group=new THREE.Group(); scene.add(group);
    const COUNT=6000,ARMS=4,R=6;
    const pos=new Float32Array(COUNT*3),col=new Float32Array(COUNT*3);
    const cIn=new THREE.Color('#8ae7ff'),cMid=new THREE.Color('#61dcff'),cOut=new THREE.Color('#c77bff');
    for(let i=0;i<COUNT;i++){const r=Math.pow(Math.random(),0.7)*R;const arm=(i%ARMS)/ARMS*Math.PI*2;const a=arm+r*0.8;const sp=(Math.random()-0.5)*(0.4+r*0.12);
      pos[i*3]=Math.cos(a)*r+sp;pos[i*3+1]=(Math.random()-0.5)*(0.3+(R-r)*0.05);pos[i*3+2]=Math.sin(a)*r+sp;
      const tt=r/R;const c=tt<0.5?cIn.clone().lerp(cMid,tt*2):cMid.clone().lerp(cOut,(tt-0.5)*2);col[i*3]=c.r;col[i*3+1]=c.g;col[i*3+2]=c.b;}
    const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.BufferAttribute(pos,3));g.setAttribute('color',new THREE.BufferAttribute(col,3));
    group.add(new THREE.Points(g,new THREE.PointsMaterial({size:0.035,sizeAttenuation:true,vertexColors:true,transparent:true,opacity:0.26,blending:THREE.AdditiveBlending,depthWrite:false})));
    const sc2=900,sp2=new Float32Array(sc2*3);for(let i=0;i<sc2;i++){sp2[i*3]=(Math.random()-0.5)*70;sp2[i*3+1]=(Math.random()-0.5)*70;sp2[i*3+2]=(Math.random()-0.5)*70;}
    const sg=new THREE.BufferGeometry();sg.setAttribute('position',new THREE.BufferAttribute(sp2,3));
    scene.add(new THREE.Points(sg,new THREE.PointsMaterial({size:0.045,color:'#aab6e0',transparent:true,opacity:0.22,depthWrite:false})));
    group.rotation.x=0.62;
    const resize=()=>{const w=window.innerWidth,h=window.innerHeight;renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix();};
    this._onResize=resize;window.addEventListener('resize',resize);resize();
    const loop=()=>{this._raf=requestAnimationFrame(loop);group.rotation.y+=0.00018;renderer.render(scene,camera);};loop();
  }
}
