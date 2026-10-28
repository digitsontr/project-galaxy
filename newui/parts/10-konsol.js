  // ---------- KONSOL (Claude / Bash) — PROJE BAZLI ----------
  // Her projenin kendi bash/claude çıktısı + komut geçmişi (proje değişince karışmaz, silinmez).
  _con(pid){ this._consoles=this._consoles||{}; return this._consoles[pid]||(this._consoles[pid]={bout:[],cout:[],bhist:[],chist:[],cwd:null}); }
  _fmtPath(p){
    p=String(p||''); if(!p) return '';
    let home='';
    const m=p.match(/^\/Users\/[^/]+/)||p.match(/^\/home\/[^/]+/)||p.match(/^\\\\Users\\[^\\]+/i);
    if(m) home=m[0];
    if(home && (p===home || p.indexOf(home+'/')===0 || p.indexOf(home+'\\')===0)) p='~'+p.slice(home.length);
    if(p.length>42) p=p.slice(0,14)+'…'+p.slice(-20);
    return p;
  }
  _bashPrompt(pid){ const con=this._con(pid); const sel=this.sel; const raw=(con&&con.cwd)||(sel&&sel._path)||''; const f=this._fmtPath(raw); return f?(f+' $'):'$'; }
  _claudeSessMap(){
    if(this._claudeSess) return this._claudeSess;
    try{ this._claudeSess=JSON.parse(localStorage.getItem('gxClaudeSess')||'{}')||{}; }catch(e){ this._claudeSess={}; }
    return this._claudeSess;
  }
  _markClaudeSess(pid){
    if(!pid) return;
    const map=this._claudeSessMap(); map[pid]=true;
    try{ localStorage.setItem('gxClaudeSess', JSON.stringify(map)); }catch(e){}
  }
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
    if((k==='out'||k==='err'||k==='text')&&t){ try{ this._scanProblems(t); }catch(e){} }
    else if(k==='tool'){ arr.push({t:'tool',x:'▸ '+t}); }
    else if(k==='err'){ if(!this._cliNoise(t)) arr.push({t:'err',x:t}); }
    else if(k==='done'){ arr.push({t:'done',x:'── bitti ──'}); }
    else if(k==='exit'){ const c=(m.code!=null&&m.code!==0)?(' (kod '+m.code+')'):''; arr.push({t:'err',x:'── bağlantı kapandı'+c+' ──'}); }
    else { arr.push({t:'o',x:t}); }
    const ns={_cov:(this.state._cov||0)+1};
    if(k==='done'||k==='exit'){ const con=this._con(this.sel&&this.sel.id); if(arr===con.cout||arr===con.bout) ns._conBusy=false; }
    if(k==='done'){
      try{ this._flushProblems(); }catch(e){}
      let isClaudeArr=false;
      try{ isClaudeArr=Object.values(this._consoles||{}).some(c=>c&&c.cout===arr); }catch(e){}
      if(isClaudeArr&&this._runSnapshot){ this._runSnapshot=null; try{ this._checkAgentReview(); }catch(e){} }
    }
    this.setState(ns);
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
  _ipcErr(r,fb){ return String((r&&(r.error||r.err||r.message))||fb||'işlem başarısız'); }
  _isBlocked(r){ return /MAS|App Store|sandbox|bu sürümde kullanılamıyor|gömülü terminal App Store/i.test(this._ipcErr(r,'')); }
  _noteBlocked(r){ if(this._isBlocked(r)) this.setState({_masBlocked:true}); return this._isBlocked(r); }
  _failIpc(r,fb){ this._noteBlocked(r); return this._ipcErr(r,fb); }
  _errAction(kind, msg){
    const map={
      claude:{cta:'Ayarlar → Araçlar', pane:'araclar'},
      mcp:{cta:'Ayarlar → Posta', pane:'posta'},
      github:{cta:'gh auth login', pane:null},
      docker:{cta:'Docker’ı aç', pane:null},
      db:{cta:'DB sekmesi', pane:null}
    };
    const m=map[kind]||{cta:'Ayarlar', pane:null};
    this.setState({_errBanner:{kind, msg:String(msg||'').slice(0,160), cta:m.cta, pane:m.pane||''}});
  }
  _clearErrBanner(){ this.setState({_errBanner:null}); }
  _errBannerGo(){
    const b=this.state._errBanner; if(!b) return;
    if(b.pane) this._openPrefs(b.pane);
    else if(b.kind==='docker') this._openTab('docker');
    else if(b.kind==='db') this._openTab('db');
    else if(b.kind==='github') this._openGhTerminal();
    else this._openPrefs();
    this._clearErrBanner();
  }
  async _openGhTerminal(){
    const planet=this._ctxPlanet&&this._ctxPlanet();
    let dir=(planet&&planet._path)||'';
    try{ if(!dir&&window.galaxy&&window.galaxy.homeDir) dir=await window.galaxy.homeDir(); }catch(e){}
    try{
      if(dir&&window.galaxy&&window.galaxy.openTerminal){
        const r=await window.galaxy.openTerminal(dir);
        if(r===false) this.toast('Terminal’de: gh auth login');
        return;
      }
    }catch(e){}
    this.toast('Terminal’de: gh auth login');
  }
  _inPlanet(){ return !!((this.state.mode==='planet'||this.state.holdPlanet) && this.sel && this.sel._path); }
  _quickCmdList(){
    return [
      {label:'Docker’ı aç', ask:'Docker’ı aç'},
      {label:'DB’yi aç', ask:'veritabanını aç'},
      {label:'Kirli git', ask:'kirli git’i göster'},
      {label:'Özet’e dön', ask:'özeti aç'},
      {label:'Compose up', ask:'compose up'},
      {label:'Posta', ask:'postayı aç'},
      {label:'Durum', ask:'durum raporu ver'},
      {label:'Uzaya dön', ask:'uzaya dön'}
    ].map(c=>({label:c.label, onClick:()=>{ this.setState({asstInput:c.ask, asstOpen:true}); setTimeout(()=>this.sendAsst(),40); }}));
  }
  _friendlyFail(r, fb, kind){
    const raw=this._failIpc(r,fb);
    let msg=raw;
    if(kind==='mcp'||/MCP|posta|mail|search_emails|read_email/i.test(raw)){ msg='Posta MCP yanıt vermedi. Ayarlar → Posta’da Kaydet / Dene.'; kind=kind||'mcp'; }
    else if(kind==='claude'||/claude|CLI|kota|quota|Anthropic/i.test(raw)){ msg='Claude CLI yok veya yanıt vermedi. Ayarlar → Araçlar → Dene.'; kind=kind||'claude'; }
    else if(kind==='github'||/\bgh\b|GitHub|auth login/i.test(raw)){ msg='GitHub oturumu yok. Terminal’de: gh auth login'; kind=kind||'github'; }
    this._errAction(kind||'claude', msg);
    return msg;
  }
  _planItems(plan){ return (plan||[]).map(it=>Array.isArray(it)?{text:String(it[0]||''),done:!!it[1]}:{text:String((it&&(it.text!=null?it.text:it[0]))||''),done:!!(it&&it.done)}); }
  _keepAgentChat(agents){
    const prev={}; (this.AGENTS||[]).forEach(a=>{ if(a&&a.id) prev[a.id]={msgs:a.msgs||[], badge:a.badge||0, lastRunAt:a.lastRunAt}; });
    (agents||[]).forEach(a=>{ const p=prev[a.id]; if(p){ a.msgs=p.msgs; a.badge=p.badge||0; a.lastRunAt=p.lastRunAt; } });
    return agents;
  }
  stopRun(){
    try{ if(this.state._agentBusy) this.agentStopDo(); }catch(e){}
    const id=this._claudeRunId||this._agentRunId||(this._asst&&this._asst._clRun);
    try{ if(id&&window.galaxy&&window.galaxy.claudeStop) window.galaxy.claudeStop(id); }catch(e){}
    this._claudeRunId=null; this._agentRunId=null;
    if(this._asst){ this._asst._clRun=null; this._asstSetState('idle'); }
    if(this._loopTour){ this._loopTour=false; this._loopRunId=null; this.setState({loopTour:false}); }
    this.setState({_conBusy:false,_agentBusy:false});
  }
  async sendConsole(force){
    const text=String(force||this.state.consoleInput||'').trim(); if(!text) return;
    const p=this.sel, cwd=p&&p._path; const con=this._con(p&&p.id);
    const hk=this.state.consoleTab==='bash'?'bhist':'chist'; if(con[hk][con[hk].length-1]!==text) con[hk].push(text); con[hk]=con[hk].slice(-100); this._histIdx=null;
    this.setState({consoleInput:'',_conBusy:true});
    if(this.state.consoleTab==='ajan'){
      await this.agentSendText(text);
      this.setState({_cov:(this.state._cov||0)+1});
      this._scrollBottom('#ghud-console-scroll');
      return;
    }
    if(this.state.consoleTab==='bash'){
      con.bout.push({t:'in',x:this._bashPrompt(p&&p.id)+' '+text});
      const sid='sh-'+(p&&p.id||'');
      try{
        if(!(window.galaxy&&window.galaxy.shellInput)){ con.bout.push({t:'err',x:'(shell bu ortamda yok)'}); this.setState({_conBusy:false}); }
        else {
          if(window.galaxy.shellStart){ const a=await window.galaxy.shellStart({shellId:sid,cwd}); if(a&&a.ok===false){ con.bout.push({t:'err',x:this._failIpc(a,'shell başlatılamadı')}); this.setState({_conBusy:false}); this.setState({_cov:(this.state._cov||0)+1}); this._scrollBottom('#ghud-console-scroll'); return; } }
          this._lastBashCmd={cmd:text, pid:p&&p.id, sid};
          const b=await window.galaxy.shellInput({shellId:sid,cwd,cmd:text});
          if(b&&b.ok===false){ con.bout.push({t:'err',x:this._failIpc(b,'komut gönderilemedi')}); this.setState({_conBusy:false}); }
        }
      }catch(e){ this.setState({_conBusy:false}); }
    } else {
      con.cout.push({t:'in',x:'> '+text});
      if(!cwd){ con.cout.push({t:'err',x:'önce bir projeye gir (klasör yolu gerekli)'}); this.setState({_conBusy:false}); }
      else { const runId='c'+((this._cc=(this._cc||0)+1))+'-'+p.id;
        try{ this._snapshotDirty(); }catch(e){}
        const cont=!!this._claudeSessMap()[p.id];
        this._claudeRunId=runId;
        try{
          if(!(window.galaxy&&window.galaxy.claudeRun)){ con.cout.push({t:'err',x:'(claude bu ortamda yok)'}); this.setState({_conBusy:false}); }
          else { const promptText=await this._expandAtMentions(text, cwd);
            const profTxt=this._gxAgentInstructions(); const fullPrompt=profTxt?(profTxt+'\n\n'+promptText):promptText;
            const r=await window.galaxy.claudeRun({runId,cwd,prompt:fullPrompt,continueSession:cont,sessionKey:p.id});
            if(r&&r.ok===false){ con.cout.push({t:'err',x:this._failIpc(r,'claude çalışmadı')}); this.setState({_conBusy:false}); this._claudeRunId=null; } }
        }catch(e){ this.setState({_conBusy:false}); this._claudeRunId=null; } }
    }
    this.setState({_cov:(this.state._cov||0)+1}); this._scrollBottom('#ghud-console-scroll');
  }
  // ---------- AJAN SOHBETİ ----------
  _cliNoise(t){ return /no stdin data received|proceeding without it|redirect stdin|dev\/null to skip/i.test(String(t||'')); }
  _onAgentMsg(m){
    if(!m||!this._runAgents) return; const aid=this._runAgents[m.runId]; if(!aid) return;
    const ag=this.AGENTS.find(a=>a.id===aid); if(!ag) return;
    if(m.kind==='text'){ const last=ag.msgs[ag.msgs.length-1]; if(last&&last[0]==='a') last[1]+=m.text; else ag.msgs.push(['a',m.text]); if(this._loopRunId&&m.runId===this._loopRunId){ this._loopOut=(this._loopOut||'')+m.text; this.setState({loopBody:this._loopOut, loopStep:'is'}); } }
    else if(m.kind==='tool'){ ag.msgs.push(['t','⚙ '+m.text]); }
    else if(m.kind==='err'){ if(!this._cliNoise(m.text)) ag.msgs.push(['a','⚠ '+m.text]); if(this._loopRunId&&m.runId===this._loopRunId){ this._loopOut=(this._loopOut||'')+'\n⚠ '+m.text; this.setState({loopBody:this._loopOut}); } }
    else if(m.kind==='done'){ ag.lastRunAt=Date.now(); if(this.state.agentId!==aid) ag.badge=(ag.badge||0)+1; this.setState({_agentBusy:false}); this._agentRunId=null; delete this._runAgents[m.runId]; if(this._loopRunId&&m.runId===this._loopRunId) this._loopWorkDone(); }
    this.setState({_agv:(this.state._agv||0)+1});
    this._scrollBottom('#ghud-agent-scroll');
  }
  _scrollBottom(sel){ try{ setTimeout(()=>{ const el=document.querySelector(sel); if(el) el.scrollTop=el.scrollHeight; },40); }catch(e){} }
  _focusConsole(){ this._scrollBottom('#ghud-console-scroll'); try{ setTimeout(()=>{ const i=document.querySelector('#ghud-console-input'); if(i) i.focus(); },70); }catch(e){} }
  _winH(){ try{ return (typeof window!=='undefined'&&window.innerHeight)||800; }catch(e){ return 800; } }
  _barRoom(){ return Math.max(220, this._winH()-48-120); }
  _liveConH(){ if(this._barDragging==='term' && this._barLive!=null) return this._barLive; return this.state.consoleH||240; }
  _liveHudH(){ if(this._barDragging==='hud' && this._barLive!=null) return this._barLive; return this.state.hudH||136; }
  _fitBars(conH, hudH, termOpen, hudOpen){
    if(this._barDragging) return {consoleH:conH||240, hudH:hudH||136};
    conH=Math.min(560, Math.max(140, conH||240));
    hudH=Math.min(280, Math.max(88, hudH||136));
    const room=this._barRoom();
    let term=termOpen?(conH+14):32, dock=hudOpen?hudH:40;
    if(term+dock<=room) return {consoleH:conH, hudH};
    if(hudOpen){ hudH=Math.max(88, Math.min(hudH, room-term)); dock=hudH; }
    if(term+dock>room && termOpen){ conH=Math.max(140, Math.min(conH, room-dock-14)); term=conH+14; }
    if(term+dock>room && hudOpen) hudH=Math.max(88, room-term);
    return {consoleH:conH, hudH};
  }
  _maxTermH(){ const dock=this.state.hudOpen?(this._liveHudH()):40; return Math.max(140, Math.min(560, this._barRoom()-dock-14)); }
  _maxHudH(){ const term=(this.state.consoleCollapsed && this._barDragging!=='term')?32:(this._liveConH()+14); return Math.max(88, Math.min(280, this._barRoom()-term)); }
  _startBarResize(kind, e){
    if(kind!=='hud' && kind!=='term') return;
    if(kind==='hud' && !this.state.hudOpen) return;
    if(this._barDragging) return;
    if(e&&e.preventDefault) e.preventDefault();
    if(e&&e.stopPropagation) e.stopPropagation();
    const startY=(e&&e.clientY)||0;
    const startH=kind==='hud'
      ?(this.state.hudH||128)
      :(this.state.consoleCollapsed?18:(this.state.consoleH||240));
    this._barDragging=kind;
    this._barLive=startH;
    try{ document.body.classList.add('gx-bar-drag'); const sh=document.getElementById('appShell'); if(sh) sh.classList.add('gx-bar-drag'); }catch(err){}
    try{ const cap=e&&e.target&&e.target.closest&&e.target.closest('.gx-bar-resizer'); if(cap&&cap.setPointerCapture&&e.pointerId!=null) cap.setPointerCapture(e.pointerId); }catch(err){}
    const move=(ev)=>{
      if(ev&&ev.preventDefault) ev.preventDefault();
      const minH=kind==='hud'?88:18;
      const maxH=kind==='hud'?this._maxHudH():this._maxTermH();
      this._barLive=Math.max(minH, Math.min(maxH, startH+(startY-ev.clientY)));
      if(this._barRaf) return;
      this._barRaf=requestAnimationFrame(()=>{
        this._barRaf=0;
        if(!this._barDragging) return;
        const patch={_barTick:(this.state._barTick||0)+1};
        if(kind==='term' && this._barLive>40 && this.state.consoleCollapsed) patch.consoleCollapsed=false;
        this.setState(patch);
      });
    };
    const up=()=>{
      document.removeEventListener('pointermove', move, true);
      document.removeEventListener('pointerup', up, true);
      document.removeEventListener('pointercancel', up, true);
      if(this._barRaf){ try{ cancelAnimationFrame(this._barRaf); }catch(err){} this._barRaf=0; }
      const last=this._barLive!=null?this._barLive:startH;
      this._barDragging=null; this._barLive=null;
      try{ document.body.classList.remove('gx-bar-drag'); const sh=document.getElementById('appShell'); if(sh) sh.classList.remove('gx-bar-drag'); }catch(err){}
      if(kind==='hud'){
        const h=Math.max(88,last);
        this.setState({hudH:h, hudOpen:true});
        try{ localStorage.setItem('gxHudH',String(h)); }catch(err){}
      } else if(last<56){
        this.setState({consoleCollapsed:true});
        try{ localStorage.setItem('gxConsoleCollapsed','1'); }catch(err){}
      } else {
        const h=Math.max(140,last);
        this.setState({consoleH:h, consoleCollapsed:false});
        try{ localStorage.setItem('gxConsoleH',String(h)); localStorage.setItem('gxConsoleCollapsed','0'); }catch(err){}
      }
    };
    document.addEventListener('pointermove', move, true);
    document.addEventListener('pointerup', up, true);
    document.addEventListener('pointercancel', up, true);
  }
  _clampBars(){
    if(this._barDragging) return;
    const fit=this._fitBars(this.state.consoleH, this.state.hudH, !this.state.consoleCollapsed, this.state.hudOpen);
    const ns={};
    if(fit.consoleH!==(this.state.consoleH||240)) ns.consoleH=fit.consoleH;
    if(fit.hudH!==(this.state.hudH||136)) ns.hudH=fit.hudH;
    if(!Object.keys(ns).length) return;
    this.setState(ns);
    try{ if(ns.consoleH!=null) localStorage.setItem('gxConsoleH',String(ns.consoleH)); if(ns.hudH!=null) localStorage.setItem('gxHudH',String(ns.hudH)); }catch(e){}
  }
  onConsoleResize(e){ this._startBarResize('term', e); }
  onHudResize(e){ this._startBarResize('hud', e); }
  _setLeftTab(id){ this.setState({leftTab:id}); try{ localStorage.setItem('gxLeftTab',id); }catch(e){} if(id==='git'){ this.gitExtLoad(); this.ghLoad(); } if(id==='dev'){ this.langCheck(); this.gxLoad(); this.agentCfgLoad(); } }
  toggleReadme(){ const on=!this.state.readmeOpen; this.setState({readmeOpen:on}); try{ localStorage.setItem('gxReadmeOpen',on?'1':'0'); }catch(e){} }
  setOrbitView(on){ this.setState({orbitView:!!on}); try{ localStorage.setItem('gxOrbitView',on?'1':'0'); }catch(e){} }
  dismissSplash(){ clearTimeout(this._splashT); this.setState({splashOpen:false}); try{ localStorage.setItem('gxSplash','1'); }catch(e){} }
  // ---------- i18n (tr↔en) — render sonrası DOM cümle değişimi ----------
  _enMapObj(){ return {
    'GENEL BAKIŞ':'OVERVIEW','EVREN':'UNIVERSE','PANO':'BOARD','DOCKER':'DOCKER','ZAMANLAYICI':'SCHEDULER','SUNUCULAR':'SERVERS','DB':'DB',
    'Özet':'Overview','Evren':'Universe','Pano':'Board','Daha':'More','Kadet':'Cadet','Komutan':'Commander','İn':'In','İstasyon':'Station','HUD':'HUD','Döngü':'Loop','Posta':'Mail','Döngü tuvali':'Loop canvas',
    'Asistan':'Assistant','Anladım':'Got it','Araçlar':'Tools',
    'Klasörleri yaşayan bir evrene dönüştür.':'Turn folders into a living universe.',
    'Yerel proje yönetimi ve git merkezi.':'Local project management and a git center.',
    'Sen':'You','Bağlam':'Context','Sonuç':'Result','İstasyon':'Station','Sektör':'Sector','Akış':'Flow',
    'Gezegen seç':'Pick a planet','Hey Galaxy':'Hey Galaxy','Kaptan':'Captain','Kaptan açık':'Captain is on',
    'Kaptan — hep dinle':'Captain — always listen','Hep dinle AÇIK — “Kaptan” de':'Always-listen ON — say “Captain”',
    'Girdi':'Input','Eşleşme':'Match','Yazım':'Write','Pano':'Board','Günlük / not':'Log / note','Doğru gezegen':'Right planet','README güncelle':'Update README','Kanban senkron':'Kanban sync',
    'Dal':'Branch','Değişiklik':'Changes','Commit':'Commit','Push':'Push','Birleştir':'Merge','Dağıt':'Ship',
    'DB — bağlantı, tablo, SQL':'DB — connect, tables, SQL',
    'Docker — konteyner, log, imaj':'Docker — containers, logs, images',
    'Kaldığın işe dön. Eksik bağlantılar için aşağıdaki Kurulum kutusu; DB ve Docker üst barda.':'Pick up where you left off. Use the Setup box below for missing connections; DB and Docker are in the top bar.',
    'Bugün masası: kaldığın iş, kirli git, ihmal. DB ve Docker üst barda.':'Today desk: pick up work, dirty git, neglected. DB and Docker are in the top bar.',
    'Kaldığın işe dön. DB ve Docker üst barda; evren kartları aşağıda.':'Pick up where you left off. DB and Docker are in the top bar; universes are below.',
    'Tek tık gezegeni seçer, çift tık iner. Solda j/k, Enter. Yeni evren: Özet’te + veya sol ray Evren bağla.':'Single-click selects a planet, double-click lands. j/k in the list, Enter to land. New universe: + on Overview or Bind universe in the rail.',
    'Tık seçer, çift tık iner. j/k + Enter. Yeni evren: Özet’te +.':'Click selects, double-click lands. j/k + Enter. New universe: + on Overview.',
    'Tek tık gezegeni seçer, çift tık iner. Solda j/k, Enter.':'Single-click selects a planet, double-click lands. j/k in the list, Enter to land.',
    'Sol: Ağaç / Git / Kayıt. Ortada dosya. Altta proje terminali. ‹ ile uzaya çık.':'Left: Tree / Git / Record. File in the middle. Project terminal below. ‹ returns to space.',
    'Sol Ağaç / Git. Ortada dosya. ‹ uzaya çıkar. Konsol altta, zorlanmaz.':'Left Tree / Git. File in the middle. ‹ back to space. Console stays put unless you open it.',
    'Bu sekmede + Bağlantı. Host/kullanıcı/parola burada; parola Mac anahtarlığında. Token değil.':'Use + Connection on this tab. Host/user/password stay here; the password is in the Mac keychain. Not a token.',
    'Bağlantı ekle, tabloya tıkla, hücre düzenle. Yazma SQL onay ister.':'Add a connection, click a table, edit cells. Write SQL asks for confirm.',
    'Yerel Docker Desktop. API anahtarı yok. Motor kapalıysa Başlat.':'Local Docker Desktop. No API key. If the engine is down, hit Start.',
    'Motor açıksa konteyner başlat/durdur, log, imaj. Kapalıysa ▸ Başlat.':'If the engine is up: start/stop, logs, images. If not, ▸ Start.',
    'Görev ekle, sütunlar arası sürükle. README’ye işle kapalıysa dokunulmaz.':'Add tasks, drag between columns. README is left alone unless Sync to README is on.',
    'Pano: görev ekle, sürükle-bırak taşı; README’ye işle kapalıysa dokunulmaz':'Board: add tasks, drag-and-drop; README is left alone unless Sync to README is on',
    'Kart gezegene bağlı. README ayrı durur; Kayıt → README’ye işle açıksa CRUD README’ye de yazılır.':'The card is tied to the planet. README stays separate; Record → Sync to README also writes CRUD into the README.',
    'Haftalık/günlük ajan görevi. Claude yolu Ayarlar → Araçlar’da olmalı.':'Weekly/daily agent jobs. Claude path lives in Settings → Tools.',
    'Haftalık/günlük ajan görevi. App kapalıysa açılınca telafi eder.':'Weekly/daily agent jobs. If the app was closed, they catch up on open.',
    'Tetik → Tara → İş → İncele → Bildir. Harita durur.':'Trigger → Scan → Work → Review → Notify. The map stays put.',
    'Tetik → Tara → İş → İncele → Bildir. Turu başlat; İncele’de notunu yaz.':'Trigger → Scan → Work → Review → Notify. Start a tour; write your note at Review.',
    'Projelerini tarayıp seçtiğin ajanla tur attırır. Tetik → Tara → İş → İncele → Bildir.':'Scan your projects and run the chosen agent around them. Trigger → Scan → Work → Review → Notify.',
    'Turu başlat':'Start tour','Durdur':'Stop','Bu adımı çalıştır':'Run this step','Posta taslağını aç':'Open mail draft',
    'Kaydet ve bildir':'Save and notify','EVREN TURU':'UNIVERSE TOUR','İş ajanı — turda bu koşar':'Work agent — this one runs the tour',
    'seçili · İş':'selected · Work','henüz koşmadı':'not run yet',
    'Gelen Galaxy’de durmaz. Sol alt Ayarlar → Posta: MCP komutu, ortam anahtarları, Liste/Oku adları.':'The inbox does not live in Galaxy. Bottom-left Settings → Mail: MCP command, env keys, List/Read names.',
    'Gelen oku, yeni yaz. MCP Ayarlar → Posta.':'Read inbox, write new. MCP tools in Settings → Mail.',
    'Parola yok. ~/.ssh anahtarı veya config Host. + Sunucu Ekle, uzak klasör = evren.':'No password. A ~/.ssh key or config Host. + Add server; a remote folder becomes a universe.',
    'SSH ekle, uzak klasör evren olur, terminal.':'Add SSH; a remote folder becomes a universe, plus a terminal.',
    'Gizle':'Hide','Kurulum':'Setup','Anahtarlar ve bağlantılar':'Keys and connections','Nasıl bağlanır':'How to connect',
    'Kurulum rehberini göster':'Show setup guide','İpucu':'Tip',
    'Posta nasıl bağlanır':'How to connect mail','SSH nasıl bağlanır':'How to connect SSH','Docker kapalı':'Docker is off',
    'Nasıl çalışır':'How it works','Ayarlar → Posta':'Settings → Mail','tamam':'ok','eksik':'missing',
    'Posta ayarı':'Mail settings','DB aç':'Open DB','SSH aç':'Open SSH','Nasıl':'How',
    'Galaxy Gmail/GitHub jetonunu saklamaz. Claude kendi girişini kullanır; GitHub için `gh auth login`; posta MCP ortam anahtarları Ayarlar → Posta’da; DB parolası Mac anahtarlığında şifreli; SSH yalnızca ~/.ssh.':'Galaxy does not keep Gmail/GitHub tokens. Claude keeps its own login; GitHub is `gh auth login`; mail MCP env keys live in Settings → Mail; DB passwords are encrypted in the Mac keychain; SSH is ~/.ssh only.',
    'Asistan ve ajanlar CLI ister. Token buraya yazılmaz. Ayarlar → Araçlar → Dene.':'The assistant and agents need the CLI. No token is pasted here. Settings → Tools → Test.',
    '`gh auth login` — PAT yapıştırma. Üst şeritteki nokta bu oturumu okur.':'`gh auth login` — do not paste a PAT. The top-bar dot reads this session.',
    'Ayarlar → Posta: komut, GMAIL_CLIENT_ID / SECRET ortamı, Liste ve Oku adları.':'Settings → Mail: command, GMAIL_CLIENT_ID / SECRET env, List and Read names.',
    'Üst bar DB → + Bağlantı. Parola Mac anahtarlığında şifreli.':'Top bar DB → + Connection. Password is encrypted in the Mac keychain.',
    'Parola yok. ~/.ssh anahtarı. Daha ▾ → SSH → + Sunucu.':'No password. A ~/.ssh key. More ▾ → SSH → + Server.',
    '✕ gizler · Durdur keser · Voice On = mic (macOS izni)':'✕ hides · Stop kills · Voice On = mic (macOS permission)',
    '+ Bağlantı → Postgres, MySQL veya SQLite seç.':'+ Connection → pick Postgres, MySQL or SQLite.',
    'Host / port / veritabanı / kullanıcı / parola yaz. SQLite ise yalnızca dosya yolu.':'Fill host / port / database / user / password. SQLite is a file path only.',
    'Test, sonra Kaydet. Parola Mac anahtarlığında şifreli durur — Galaxy’ye düz metin yazılmaz.':'Test, then Save. The password stays encrypted in the Mac keychain — not plain text in Galaxy.',
    'Bağlantıya tıkla, tabloyu aç. Yazma SQL onay ister.':'Click a connection, open a table. Write SQL asks for confirm.',
    'Sol alt Ayarlar → Posta.':'Bottom-left Settings → Mail.',
    'Komut ve argüman (ör. npx −y @modelcontextprotocol/server-gmail).':'Command and args (e.g. npx −y @modelcontextprotocol/server-gmail).',
    'Ortam: GMAIL_CLIENT_ID=… satır satır. Refresh token da burada.':'Environment: GMAIL_CLIENT_ID=… one per line. Refresh token too.',
    'Liste / Oku / Gönder araç adlarını yaz, Kaydet, Bağlantıyı dene. Sonra Yenile.':'Fill List / Read / Send tool names, Save, Test connection. Then Refresh.',
    'Galaxy parola saklamaz. ~/.ssh içindeki anahtar veya config Host takma adı yeter.':'Galaxy does not store a password. A ~/.ssh key or config Host alias is enough.',
    '+ Sunucu Ekle → host (veya alias), kullanıcı, port, anahtar çipi.':'+ Add server → host (or alias), user, port, key chip.',
    'Uzak klasör yolu ekle — her kök bir evren olur. Test, sonra Kaydet.':'Add a remote folder path — each root becomes a universe. Test, then Save.',
    'Docker Desktop yüklü olsun (App Store sürümünde motor kısıtlı olabilir).':'Have Docker Desktop installed (the App Store build may restrict the engine).',
    'Yukarıdaki Başlat’a bas veya Docker uygulamasını aç.':'Hit Start above, or open the Docker app.',
    'API anahtarı gerekmez — yerel socket kullanılır.':'No API key — it uses the local socket.',
    'Ajan Claude CLI ister — yoksa Ayarlar → Araçlar → Dene. Token buraya yazılmaz.':'The agent needs Claude CLI — if missing, Settings → Tools → Test. No token is pasted here.',
    '+ Yeni Otomatik Görev: ad, ne yapsın, sıklık, saat, ajan.':'+ New automated task: name, what to do, cadence, time, agent.',
    'App o an kapalıysa açılınca telafi eder. Raporlar HUD’da (🚀).':'If the app was closed, it catches up on open. Reports live in the HUD (🚀).',
    'Gelen kutusu Galaxy’de barınmaz. MCP sunucusu Ayarlar → Posta’da bağlanır.':'The inbox does not live in Galaxy. The MCP server is wired in Settings → Mail.',
    'Kendi materyalini ekle, oku, quiz çöz.':'Add your own material, read it, take a quiz.',
    'PROJELER':'PROJECTS','İSTASYON':'STATION','Evrenini seç':'Choose your universe','Bugün':'Today','Evrenler':'Universes',
    'Kaldığın yerden devam':'Continue where you left off','Kaldığın işe dön, kirli git’i gör, evrenini seç.':'Pick up the work, see dirty git, choose a universe.',
    'Bugün masası':'Today desk','↵ çalıştır':'↵ run','esc kapat':'esc close','↑↓ gez':'↑↓ move',
    'Önce commit bekleyenler':'Commit the dirty ones first','İhmal edilenlere bak':'Look at neglected planets','Sakin bir gün. Evren seç veya yeni gezegen ekle.':'A quiet day. Pick a universe or add a planet.',
    'kirli git':'dirty git','ihmal':'neglected','açık todo':'open todos','Commit bekleyen':'Waiting to commit','Uzun süredir sessiz':'Quiet for a while',
    'Editörde Aç':'Open in Editor','Editörde aç':'Open in editor',
    'Her evren bir galaksi: içindeki proje klasörleri gezegen, projeleri barındıran çatı klasörler yıldız sistemi olur.':'Each universe is a galaxy: its project folders are planets, and the parent folders that hold them are star systems.',
    'YENİ EVREN EKLE':'ADD UNIVERSE','yerel klasör · uzak sunucu':'local folder · remote server','Evreni kaldır':'Remove universe','Evreni düzenle':'Edit universe',
    'EVREN EKLE':'ADD UNIVERSE','EVREN DÜZENLE':'EDIT UNIVERSE','herhangi bir klasörü evren yap':'turn any folder into a universe','adı ve yolu güncelle':'update the name and path',
    'Docker Merkezi':'Docker Center','Konteynerler':'Containers','İmajlar':'Images','+ Sunucu Ekle':'+ Add Server','+ Bağlantı':'+ Connection','+ Ekle':'+ Add',
    'Veritabanı':'Database','SQL Sorgu · SELECT':'SQL Query · SELECT','Çalıştır':'Run','Test':'Test','Kaydet':'Save','İptal':'Cancel','Ad (ör. Prod DB)':'Name (e.g. Prod DB)','Sunucu (host)':'Host','Port':'Port','Veritabanı adı':'Database name','Kullanıcı':'User','Parola':'Password','SQLite dosya yolu':'SQLite file path',
    'Pano':'Board','Bekliyor':'To Do','Devam':'In Progress','Tamam':'Done','Yeni görev ekle (Enter)…':'Add a task (Enter)…',
    'Zamanlayıcı · Otomatik Görevler':'Scheduler · Automated Tasks','Yeni otomatik görev (Enter)…':'New automated task (Enter)…','ÇALIŞTIR':'RUN','AKTİF':'ACTIVE','DURDU':'STOPPED',
    'Tetik':'Trigger','Tara':'Scan','İş':'Work','İncele':'Review','Bildir':'Notify','Tümünü koş':'Run all','Turu başlat':'Start tour','Brifing gönder':'Send briefing',
    'turu başlatır':'starts the tour','evreni tarar':'scans the universe','senin notun':'your note','toast + posta':'toast + mail',
    'Beş düğüm: tetik (zamanlayıcı veya ikiz) → tarama → ajan işi → inceleme notu → bildirim. Harita durur.':'Five nodes: trigger (timer or twin) → scan → agent work → review note → notify. The map stays.',
    'Gelen kutuyu oku, yeni e-posta yaz. MCP Ayarlar → Posta’daki araçlarla gider.':'Read the inbox, write a new email. MCP tools in Settings → Mail send it.',
    'Posta':'Mail','Gelen':'Inbox','Yaz':'Compose','Yenile':'Refresh','Gönder':'Send','Yanıtla':'Reply','Kime (e-posta)':'To (email)','Konu':'Subject','Metin…':'Message…',
    'Sunucular · Uzak Evrenler':'Servers · Remote Universes','SSH ile uzak bir sunucu bağla; klasörleri yerel evrenler gibi galakside gezilir.':'Connect a remote server via SSH; its folders are browsed in the galaxy like local universes.','⟳ Tara':'⟳ Scan','Ad (ör. Prod Sunucu)':'Name (e.g. Prod Server)',
    'İLERLEME':'PROGRESS','PLAN':'PLAN','NOTLAR':'NOTES','BAĞLANTILAR':'LINKS','ODAK':'FOCUS','KAYIT':'RECORD','AĞAÇ':'TREE','GİT':'GIT','Ağaç':'Tree','Kayıt':'Record','Git':'Git','Yörünge':'Orbit','Dosya':'File','📁 Klasörü Aç':'📁 Open Folder','Kaldır':'Remove','Hızlı not ekle… (Enter)':'Quick note… (Enter)','Gezegene İn ▸':'Land on Planet ▸','UZAY':'SPACE','README':'README','komut / istem yaz, Enter\'a bas…':'type a command / prompt, press Enter…','proje kökü':'project root','Yapılacaklar':'To Do','Günlük':'Log','ÇİFT TIK DÜZENLE':'DOUBLE-CLICK TO EDIT','Tıkla: tamam / beklemede':'Click: done / pending','tıkla: tamam':'click: done','Bir dosya seç':'Pick a file','Soldaki Ağaç’tan bir dosyaya tıkla — içerik burada açılır.':'Click a file in the Tree on the left — it opens here.','README’yi gizle (⌘\\)':'Hide README (⌘\\)','README’yi aç (⌘\\)':'Show README (⌘\\)',
    'BAĞLAM: Tüm evren':'CONTEXT: All universes','Sil':'Delete','Durum ver':'Give status','Yeni ajan ekle':'Add new agent',
    'GİT MERKEZİ':'GIT CENTER','DURUM':'STATUS','TAKIM AKIŞI':'TEAM FLOW','GEÇMİŞ':'HISTORY','GIT FLOW REHBERİ':'GIT FLOW GUIDE','Temel Git Komutları · ne işe yarar':'Basic Git Commands · what they do','Feature-branch Akışı':'Feature-branch Flow',
    'Proje ara, komut ya da Galaxy’ye sor…':'Search projects, run a command, or ask Galaxy…','Proje ara, komut ya da Kaptan’a sor…':'Search projects, run a command, or ask Captain…','Ayarlar':'Settings','Profil':'Profile','Yedekler':'Backups','Git Flow Rehberi':'Git Flow Guide',
    'Odak başlat/durdur':'Start/stop focus','SSH / Sunucular':'SSH / Servers','Bugünkü brifing':'Today briefing','son · ↵ in':'recent · ↵ land',
    'YEDEKLER':'BACKUPS','Geri Yükle':'Restore','Henüz yedek yok.':'No backups yet.',
    'README YOK (3)':'NO README (3)','GİZLENENLER (1)':'HIDDEN (1)',
    'Sol paneli aç/kapat':'Toggle left panel','Sağ paneli aç/kapat':'Toggle right panel',
    'Klasör':'Folder','Etkinlik':'Activity','Konsolu gizle':'Hide console','Konsolu göster':'Show console','Evreni seç':'Pick universe',
    'gezegen':'planets','sistem':'systems','aktif':'active','Kapat (ESC)':'Close (ESC)',
    'F1 Rehber · ⌘K Komut · ⌘G Not':'F1 Guide · ⌘K Command · ⌘G Note','F1 Rehber · ⌘K Komut · ⌘⇧G Not':'F1 Guide · ⌘K Command · ⌘⇧G Note','Ara':'Search',
    'F1 Rehber':'F1 Guide','⌘K Komut':'⌘K Command','⌘G Not':'⌘G Note','Komut':'Command','Not':'Note','Genel Bakış':'Overview','Projeler':'Projects',
    'Kaptan düğmesi açıkken «Kaptan» de — dinler, komutu yapar':'With Kaptan on, say “Captain” — it listens and acts',
    'AKTİF':'ACTIVE','BEKLEMEDE':'PENDING','TAMAMLANDI':'DONE','ARŞİV':'ARCHIVE','KEŞFEDİLMEMİŞ':'UNEXPLORED','SÜRÜKLE:GEZ':'DRAG:PAN',
    'Docker çalışıyor':'Docker running','konteyner':'containers','çalışıyor':'running','imaj':'images','Yenile':'Refresh','Başlat':'Start','LOG':'LOG','SİL':'DELETE','Docker motoru durdu — başlatmak için ▸ tıkla':'Docker engine stopped — click ▸ to start','Henüz veritabanı bağlantısı yok.':'No database connection yet.','Postgres':'Postgres','MySQL':'MySQL','SQLite':'SQLite',
    'Bir bash komutu yaz — bu projenin klasöründe çalışır.':'Type a bash command — runs in this project folder.','Claude\'a bir şey yaz — bu projenin klasöründe çalışır, dosya okur/yazar.':'Type to Claude — runs in this project folder, reads/writes files.','Yeni evren':'New universe','Henüz uzak sunucu yok.':'No remote server yet.',
    'PROJE EKLE':'ADD PROJECTS','＋ Ekle':'＋ Add','Proje ekle':'Add projects','Çalışma alanı oluştur':'Create workspace','Bu çalışma alanında henüz proje yok.':'No projects in this workspace yet.','Projeler kendiliğinden eklenmez. Yolunu yazarak tek tek ekle ya da bir klasördeki depoları bulup toplu seç.':'Projects are never added automatically. Add them one by one by path, or find the repos in a folder and pick them in bulk.','Proje yolları · her satıra bir yol':'Project paths · one per line','📁 Klasörleri seç (birden çok seçilebilir)':'📁 Pick folders (multiple allowed)','Toplu ekle · bir klasördeki git depolarını bul':'Bulk add · find git repos in a folder','⌕ Depoları bul':'⌕ Find repos','Tümünü seç':'Select all','Hiçbirini seçme':'Select none','zaten ekli':'already added','Bu klasörde git deposu bulunamadı.':'No git repos found in this folder.','Uzak çalışma alanında son taramanın bulduğu depolar listelenir. Eklemek istediklerini işaretle.':'Repos found by the last scan of this remote workspace are listed. Tick the ones to add.','Ekle':'Add','Bu çalışma alanına proje ekle':'Add projects to this workspace','Çalışma alanı boş başlar; projelerini sonra yolunu girerek tek tek ya da toplu eklersin. 🔒 Parola Anahtar Zinciri\'yle şifreli.':'A workspace starts empty; you add projects afterwards by path, one by one or in bulk. 🔒 Passwords are encrypted in the Keychain.','Projelerini ekle':'Add your projects','Çalışma alanı oluştur':'Create workspace','İlk projeyi aç':'Open your first project',
    'Bu evrende henüz gezegen yok.':'No planets in this universe yet.','Evren bağla':'Bind universe','Bu klasör henüz git deposu değil.':'This folder is not a git repo yet.','git init':'git init',
    'Henüz madde yok. README’deki işaret kutularını çek veya ilk maddeyi yaz.':'No items yet. Pull checkboxes from the README or type the first one.','README’den çek':'Pull from README','ilk madde yaz… (Enter)':'first item… (Enter)',
    'Claude Code bulunamadı.':'Claude Code not found.','Konsol ve ajanlar CLI ister. Kur, sonra Ayarlar’dan yolu doğrula.':'Console and agents need the CLI. Install it, then confirm the path in Settings.',
    'Galaxy Asistanı':'Galaxy Assistant','Captain':'Captain','hazır — bir komut ver':'ready — give a command','çalışıyorum…':'working…','dinliyorum…':'listening…','Dinliyor':'Listening','Bir şey yaz…':'Write something…','Yeni sohbet':'New chat',
    'SYSTEM ONLINE':'SYSTEM ONLINE','Efendim?':'Yes?','Galaxy’ye söyle…':'Tell Galaxy…',
    'Sesli komut':'Voice command','Hey Galaxy — hep dinle':'Hey Galaxy — always listen','Kaptan — hep dinle':'Captain — always listen','Dinlemeyi durdur':'Stop listening',
    'Gizle — asistan çalışır':'Hide — assistant keeps running','Durdur · kes':'Stop · kill','Asistan açık':'Assistant on',
    'Yaz veya Voice On ile konuş':'Type, or talk with Voice On','✕ gizler · Durdur keser':'✕ hides · Stop kills',
    'Güncel':'Up to date','Commit…':'Commit…','Git Merkezi':'Git Center','Gizle':'Hide','Push':'Push','Onayla ve çalıştır':'Confirm and run',
    'Gezegeni gizle':'Hide planet','Veritabanı yazma':'Database write',
    'Evrenler':'Universes','⌘K ile de hızlı geçiş yapabilirsin':'⌘K also jumps you quickly','buradasın':'you are here',
    'özellik rehberi · her şeyi buradan yönet':'feature guide · manage everything from here',
    'Yörünge bağları — ilişkili projeler':'Orbit links — related projects','Odak kronometresi':'Focus timer','Son commit':'Latest commit',
    'eşleşme yok':'no matches','Dosya listesi yükleniyor…':'Loading file list…','Tablo boş.':'Table is empty.',
    'Konteyner yok — ne çalışan ne durmuş.':'No containers — none running or stopped.','Uzak Terminal':'Remote Terminal',
    'Gönder':'Send','Kapat':'Close','Gezegene dön / uzaya çık':'Back to planet / to space','Komut paleti':'Command palette',
    'Henüz rapor yok — zamanlayıcıdan bir görev çalışınca burada listelenir.':'No reports yet — they appear here when a scheduler task runs.',
    'aç ▸':'open ▸','Göster':'Show','İlerleme':'Progress','Gizlenenler':'Hidden',
    'İlk commit için burada git init çalıştır.':'Run git init here for the first commit.',
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
    'Hazır komutlar':'Quick commands','Yeni ajan ekle':'Add new agent','Düzenle':'Edit','Ajanı düzenle':'Edit agent','Ajanı sil':'Delete agent','Yeni Ajan':'New Agent','Ajanı Düzenle':'Edit Agent','Yeni ajan':'New agent',
    'Ajan Adı':'Agent Name','Ajan adı':'Agent name','Görevi':'Role','Kişilik':'Personality','Tek tık komutlar':'One-click commands',
    'Sistem Promptu — ajan ne yapar, nasıl davranır?':'System prompt — what the agent does, how it behaves','3 Hazır Komut (opsiyonel — panelde tıklanabilir görünür)':'3 quick commands (optional — clickable in the panel)',
    'Bu ajan sağdaki sohbette konuşur. Kişilik her mesajdan önce okunur. Komutlar panelde buton olur.':'This agent talks in the right-hand chat. Personality is read before every message. Commands become buttons in the panel.',
    'Sağ panelde buton olur. Tıklayınca sohbete o cümleyi gönderir.':'They become buttons in the right panel. Clicking sends that sentence to chat.',
    'Klasörü Aç':'Open Folder','Aç':'Open','Sürükle: konsolu büyüt/küçült':'Drag: resize console','Sürükle: HUD’u büyüt/küçült':'Drag: resize HUD','İşlem Günlüğü':'Operation Log',
    'VERİTABANI:':'DATABASE:','temizle ✕':'clear ✕','temizle':'clear','✓ Her işlem loglanır · parolalar safeStorage ile şifreli':'✓ Every operation is logged · passwords encrypted with safeStorage','SQL / İşlem · SELECT + INSERT / UPDATE / DELETE':'SQL / Operation · SELECT + INSERT / UPDATE / DELETE','SQL Sorgu · SELECT':'SQL Query · SELECT','satır etkilendi':'rows affected','kayıtlı':'saved','veritabanı':'database','🤖 AI Veritabanı Ajanı · ne istediğini doğal dille yaz':'🤖 AI Database Agent · describe what you want in plain language','⚡ Sor':'⚡ Ask',
    'Durum okuması:':'Status:','Commit\'lenmemiş dosyalar':'Uncommitted files','✓ Temiz — commit\'lenecek dosya yok.':'✓ Clean — nothing to commit.','Bu depoda henüz commit yok.':'No commits in this repository yet.',
    'Katkı dağılımı':'Contribution breakdown','Son işlemler · kim yaptı':'Recent operations · who','Henüz commit yok — takım akışı grafiği için önce commit üret.':'No commits yet — make a commit first to see the team-flow graph.',
    'Tipik feature akışı · 6 adım':'Typical feature flow · 6 steps',
    '↗ Harici uygulamada aç':'↗ Open in external app','yükleniyor…':'loading…','Bu dosya app içinde önizlenemiyor.':'This file can\'t be previewed in-app.','Dosya okunamadı.':'Could not read file.','◂ üst klasör':'◂ parent folder',
    'Üst nav: Özet / Evren / Pano — DB · Docker · Zaman · SSH Daha menüsünde':'Top nav: Overview / Universe / Board — DB · Docker · Time · SSH under More',
    'Sol ray: tek tık seçer (inmez); çift tık, İn veya Enter ile in':'Left rail: single click selects (does not land); double-click, In or Enter to land',
    'j / k ile listede gez, Enter in':'j / k moves the list, Enter lands',
    '⌘K — komut paleti / arama (↑↓ seç, Enter çalıştır)':'⌘K — command palette / search (↑↓ select, Enter run)',
    'j / k — uzayda gezegen seç (Enter = in)':'j / k — select a planet in space (Enter = land)',
    'Esc — katman katman geri':'Esc — back layer by layer'
  }; }
  _applyLang(){
    try{ document.documentElement.lang=this._lang==='en'?'en':'tr'; }catch(e){}
    if(this._langObs){ try{ this._langObs.disconnect(); }catch(e){} this._langObs=null; }
    if(this._lang!=='en') return;
    const src=this._enMap||(this._enMap=this._enMapObj());
    const low=this._lowEn||(this._lowEn=(()=>{const o={}; for(const k in src){ const key=String(k).trim(); if(key.length<12) continue; if(/[=<>{}]|KEY=|GMAIL_|npm |gh /.test(key)) continue; o[key.toLowerCase()]=src[k]; } return o;})());
    const tr=(s)=>{ if(!s) return null; const t=s.trim(); if(t.length<12) return null; if(/[=<>{}]|KEY=|GMAIL_|npm |gh /.test(t)) return null; if(/\n/.test(s)) return null; const r=low[t.toLowerCase()]; return (r!=null&&r.toLowerCase()!==t.toLowerCase())?r:null; };
    const walk=(n)=>{ if(!n) return;
      if(n.nodeType===3){ const v=n.nodeValue, k=v&&v.trim(); const rep=tr(k); if(rep!=null) n.nodeValue=v.replace(k,rep); }
      else if(n.nodeType===1){
        const tag=n.tagName;
        if(tag==='SCRIPT'||tag==='STYLE'||tag==='CANVAS'||tag==='TEXTAREA'||tag==='INPUT'||tag==='SELECT'||tag==='CODE'||tag==='PRE') return;
        if(n.hasAttribute&&(n.hasAttribute('data-noi18n')||n.hasAttribute('contenteditable'))) return;
        if(n.classList&&(n.classList.contains('mono-in')||n.classList.contains('cli-box'))) return;
        try{ const pr=tr(n.placeholder); if(pr!=null) n.placeholder=pr; }catch(e){}
        try{ const ti=tr(n.title); if(ti!=null) n.title=ti; }catch(e){}
        for(const c of n.childNodes) walk(c); } };
    try{ walk(document.body); }catch(e){}
    this._langObs=new MutationObserver(()=>{ clearTimeout(this._langT); this._langT=setTimeout(()=>{ if(this._lang==='en') this._applyLang(); },160); });
    try{ this._langObs.observe(document.body,{childList:true,subtree:true}); }catch(e){}
  }
  // ---------- MARKDOWN-LITE (ajan çıktısı + README güzel görünsün) ----------
  _mdSegs(s){ const out=[]; const re=/(\*\*([^*]+)\*\*|`([^`]+)`|\[([^\]]+)\]\((https?:[^)\s]+)\)|(https?:\/\/[^\s)<]+))/g; let last=0,m;
    while((m=re.exec(s))){ if(m.index>last) out.push({t:s.slice(last,m.index),style:'color:inherit'});
      if(m[2]!=null) out.push({t:m[2],style:'color:var(--gx-ink);font-weight:600'});
      else if(m[3]!=null) out.push({t:m[3],style:'color:var(--gx-accent);font-family:JetBrains Mono,monospace;background:color-mix(in srgb, var(--gx-accent) 10%, transparent);padding:1px 5px;border-radius:3px'});
      else if(m[4]!=null) out.push({t:m[4],style:'color:var(--gx-accent);text-decoration:underline'});
      else out.push({t:m[6]||m[1],style:'color:var(--gx-accent);word-break:break-all'});
      last=re.lastIndex; }
    if(last<s.length) out.push({t:s.slice(last),style:'color:inherit'});
    if(!out.length) out.push({t:s||' ',style:'color:inherit'}); return out; }
  _mdLines(text, mode){ const doc=mode==='doc';
    const st=(t)=>({
      h1: doc?'font-size:26px;font-weight:700;color:#f4f7ff;margin:6px 0 14px;line-height:1.25;letter-spacing:-.02em':'font-size:15px;font-weight:700;color:#dbe4ff;margin:12px 0 6px',
      h2: doc?'font-size:18px;font-weight:600;color:#e8eeff;margin:22px 0 10px;padding-bottom:6px;border-bottom:1px solid rgba(190,205,255,.14)':'font-size:14px;font-weight:600;color:#dbe4ff;margin:12px 0 5px;border-bottom:1px solid rgba(190,205,255,.12);padding-bottom:4px',
      h3: doc?'font-size:15px;font-weight:600;color:#8ae7ff;margin:16px 0 8px':'font-size:13px;font-weight:600;color:#8ae7ff;margin:10px 0 4px',
      li: doc?'padding-left:18px;margin:6px 0;line-height:1.55':'padding-left:16px;position:relative;margin:3px 0',
      task: doc?'margin:6px 0;color:#c5cde8;line-height:1.5':'margin:3px 0;color:#9aa3c2',
      p: doc?'margin:8px 0;line-height:1.7;color:#cfd6ee;font-size:15px':'margin:5px 0',
      blank: doc?'height:10px':'height:6px',
      hr:'height:1px;background:rgba(190,205,255,.16);margin:18px 0',
      code:'font-family:JetBrains Mono,monospace;font-size:12px;color:#c9e7ff;background:rgba(8,12,24,.65);padding:1px 0;white-space:pre-wrap;line-height:1.55'
    }[t]||(doc?'margin:8px 0;line-height:1.7':'margin:5px 0'));
    const lines=String(text||'').split('\n'); const out=[]; let inCode=false;
    for(const ln of lines){
      if(/^```/.test(ln)){ inCode=!inCode; continue; }
      if(inCode){ out.push({type:'code',lineStyle:st('code'),bullet:'',segs:[{t:ln||' ',style:'font-family:JetBrains Mono,monospace;color:#c9e7ff'}]}); continue; }
      if(!ln.trim()){ out.push({type:'blank',lineStyle:st('blank'),bullet:'',segs:[{t:'',style:''}]}); continue; }
      if(/^---+$/.test(ln.trim())||/^\*\*\*+$/.test(ln.trim())){ out.push({type:'hr',lineStyle:st('hr'),bullet:'',segs:[{t:'',style:''}]}); continue; }
      let type='p',content=ln,bullet='';
      if(/^###\s/.test(ln)){type='h3';content=ln.replace(/^###\s/,'');}
      else if(/^##\s/.test(ln)){type='h2';content=ln.replace(/^##\s/,'');}
      else if(/^#\s/.test(ln)){type='h1';content=ln.replace(/^#\s/,'');}
      else if(/^\s*[-*]\s+\[[ xX]\]\s*/.test(ln)){type='task';const done=/\[[xX]\]/.test(ln);content=ln.replace(/^\s*[-*]\s+\[[ xX]\]\s*/,'');bullet=done?'✓ ':'○ ';}
      else if(/^\s*[-*]\s+/.test(ln)){type='li';content=ln.replace(/^\s*[-*]\s+/,'');bullet='• ';}
      else if(/^\s*\d+\.\s+/.test(ln)){type='li';content=ln.replace(/^\s*\d+\.\s+/,'');bullet='› ';}
      out.push({type,lineStyle:st(type),bullet,segs:this._mdSegs(content)});
    }
    return out; }
  onAgentInput(e){ this.setState({agentInput:(e&&e.target&&e.target.value)||''}); }
  onAgentKey(e){ if(e.key==='Enter'&&!e.shiftKey){ e.preventDefault&&e.preventDefault(); this.sendAgent(); } }
  async sendAgent(){
    const text=String(this.state.agentInput||'').trim(); if(!text) return;
    const ag=this.AGENTS.find(a=>a.id===this.state.agentId); if(!ag) return;
    ag.msgs.push(['u',text]); ag.msgs.push(['a','']);
    const runId='r'+(this._rc=(this._rc||0)+1)+'-'+ag.id;
    this._runAgents=this._runAgents||{}; this._runAgents[runId]=ag.id;
    this._agentSess=this._agentSess||{}; const cont=!!this._agentSess[ag.id]; this._agentSess[ag.id]=true;
    this._agentRunId=runId;
    this.setState({agentInput:'',_agentBusy:true}); this._scrollBottom('#ghud-agent-scroll');
    const ctxProjectId=(this._inPlanet()&&this.sel&&this.sel.id)?this.sel.id:null;
    try{
      if(!(window.galaxy&&window.galaxy.agentRun)){ ag.msgs[ag.msgs.length-1][1]='(ajan çalıştırma bu ortamda yok)'; this.setState({_agentBusy:false}); }
      else { const r=await window.galaxy.agentRun({runId,agentId:ag.id,prompt:text,projectId:ctxProjectId,continueSession:cont});
        if(r&&r.ok===false){ ag.msgs[ag.msgs.length-1][1]='⚠ '+this._failIpc(r,'ajan çalışmadı'); this.setState({_agentBusy:false}); this._agentRunId=null; delete this._runAgents[runId]; } }
    }catch(e){ this.setState({_agentBusy:false}); this._agentRunId=null; }
  }

