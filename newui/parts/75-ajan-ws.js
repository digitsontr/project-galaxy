  // ==================== AJAN ÇALIŞMA ALANI (tam ekran: kimlik + hızlı işler | sohbet) ====================
  _findAgent(q){ const f=s=>this._asstFold?this._asstFold(String(s||'')):String(s||'').toLowerCase(); const k=f(q).trim(); if(!k) return null;
    const list=this.AGENTS||[];
    return list.find(a=>f(a.id)===k)||list.find(a=>f(a.name)===k)||list.find(a=>f(a.kind)===k)||list.find(a=>f(a.name).includes(k)||k.includes(f(a.name)))||null; }
  _isReviewAsk(s){ return /incele|review|tarama|diff|kalite|hotspot|açık/i.test(String(s||'')); }
  _isFlowAsk(s){ return /akış|akis|flow|şema|sema|drawio|draw\.io|adım adım|yürü/i.test(String(s||'')); }
  _agentWsOpen(id, task){ const ag=(this.AGENTS||[]).find(a=>a.id===id); if(!ag) return;
    ag.badge=0;
    const reviewTask=ag.kind==='quality' && task && this._isReviewAsk(task);
    const flowTask=ag.kind==='flow' && task && this._isFlowAsk(task);
    if(flowTask){
      try{ if(this._asst&&this._asst.open&&this._asstClose) this._asstClose(); }catch(e){}
      this.setState({agentId:null, asstOpen:false});
      this._flowAgentGo(task);
      return;
    }
    this.setState({agentId:id, agentInput:reviewTask?'':(task||''), asstOpen:false});
    try{ if(this._asst&&this._asst.open&&this._asstClose) this._asstClose(); }catch(e){}
    if(ag.kind==='quality'){
      this._crLoad();
      if(reviewTask) setTimeout(()=>{ try{ this._crStart(); }catch(e){} }, 40);
      else if(task) setTimeout(()=>{ try{ this.sendAgent(); }catch(e){} }, 60);
    } else if(task) setTimeout(()=>{ try{ this.sendAgent(); }catch(e){} }, 60);
    setTimeout(()=>{ try{ const i=document.getElementById('gx-ws-input'); if(i) i.focus(); }catch(e){} this._scrollBottom('#gx-ws-feed'); }, 80); }
  _crQualityAgent(){ return (this.AGENTS||[]).find(a=>a.kind==='quality')||(this.AGENTS||[]).find(a=>a.id==='quality')||null; }
  async _crLoad(){
    const p=this.sel; if(!p||!p.id||!(window.galaxy&&window.galaxy.reviewLatest)) return;
    try{
      const r=await window.galaxy.reviewLatest({projectId:p.id});
      let runs=[];
      try{ const l=window.galaxy.reviewList?await window.galaxy.reviewList({projectId:p.id, limit:5}):null; runs=(l&&(l.runs||l.list))||[]; }catch(e){}
      if(this._crRunning||this.state._crBusy) return;
      const run=r&&(r.run||null);
      const ns={_crList:runs.slice(0,5), _agv:(this.state._agv||0)+1};
      if(run&&run.id) ns._cr=run;
      this.setState(ns);
    }catch(e){}
  }
  async _crOpenRun(id){
    if(!id||!(window.galaxy&&window.galaxy.reviewGet)) return;
    try{
      const r=await window.galaxy.reviewGet({runId:id, projectId:(this.sel&&this.sel.id)});
      const run=r&&(r.run||r);
      if(run&&run.id) this.setState({_cr:run, _agv:(this.state._agv||0)+1});
    }catch(e){}
  }
  async _crStart(){
    if(this._crRunning) return;
    const p=this.sel;
    if(!p||!p.id){ this.toast('Önce bir projeye gir','err'); return; }
    if(!(window.galaxy&&window.galaxy.reviewRun)){ this.toast('İnceleme motoru yok','err'); return; }
    const ag=this._crQualityAgent();
    if(ag && this.state.agentId!==ag.id) this._agentWsOpen(ag.id);
    this._crRunning=true;
    this.setState({_crBusy:true, _agv:(this.state._agv||0)+1});
    this.toast('Değişiklikler inceleniyor…');
    try{
      const r=await window.galaxy.reviewRun({projectId:p.id, scope:'dirty'});
      if(r&&r.ok===false){ this.toast(this._failIpc(r,'inceleme yapılamadı'),'err'); this.setState({_crBusy:false, _agv:(this.state._agv||0)+1}); return; }
      const run=r.run||r;
      this.setState({_cr:run, _crBusy:false, _agv:(this.state._agv||0)+1});
      if(run&&run.gate==='fail') this.toast('Kalite kapısı KALDI · '+run.score,'err');
      else this.toast('Kalite kapısı GEÇTİ · '+((run&&run.score)!=null?run.score:''));
    }catch(e){ this.setState({_crBusy:false, _agv:(this.state._agv||0)+1}); this.toast('İnceleme hata verdi','err'); }
    finally{ this._crRunning=false; try{ this._crLoad(); }catch(e){} }
  }
  _crJump(file, line){
    const rel=String(file||'').replace(/^\/+/, '');
    if(!rel) return;
    this._agentWsClose();
    if(!this._inPlanet()){ try{ this.enter(); }catch(e){} }
    try{ this._setLeftTab('agac'); }catch(e){}
    Promise.resolve(this.openPreview(rel)).then(()=>setTimeout(()=>this._gotoLine(Number(line)||1), 380));
  }
  _agentWsClose(){ this.setState({agentId:null}); }
  async _agentSetPaused(id, paused){ const ag=(this.AGENTS||[]).find(a=>a.id===id); if(!ag) return;
    if(paused){ try{ Object.keys(this._runAgents||{}).forEach(r=>{ if(this._runAgents[r]===id){ if(window.galaxy&&window.galaxy.claudeStop) window.galaxy.claudeStop(r); delete this._runAgents[r]; } }); }catch(e){} this.setState({_agentBusy:false}); }
    ag.paused=!!paused;
    try{ if(window.galaxy&&window.galaxy.agentPause){ const r=await window.galaxy.agentPause({id, paused:!!paused}); if(r&&r.ok===false){ this.toast(this._failIpc(r,'kaydedilemedi'),'err'); } } }catch(e){}
    this.toast(paused?(ag.name+' duraklatıldı'):(ag.name+' tekrar çalışıyor'));
    this.setState({_agv:(this.state._agv||0)+1}); }
  _agentBusyId(id){ return Object.values(this._runAgents||{}).includes(id); }
  _agentStatus(a){ if(a.paused) return {label:'Duraklatıldı', tone:'warn'}; if(this._agentBusyId(a.id)) return {label:'Çalışıyor', tone:'run'};
    const ago=this._ago(a.lastRunAt); return {label:ago?('Son çalışma '+ago):'Hazır', tone:'idle'}; }
  _agentInitial(a){ return String((a&&a.name)||'?').trim().charAt(0).toLocaleUpperCase('tr'); }
  _crView(){
    const st=this.state; const run=st._cr||null; const busy=!!st._crBusy;
    const findings=(run&&run.findings)||[];
    const hist=(st._crList||[]).slice(0,5);
    const sevLbl={blocker:'Engelleyici',critical:'Kritik',major:'Büyük',minor:'Küçük',info:'Bilgi'};
    const sevTone={blocker:'err',critical:'err',major:'warn',minor:'idle',info:'idle'};
    return {
      crStart:()=>this._crStart(),
      crRun:()=>this._crStart(),
      crBusy:busy, crIdle:!busy,
      crScore: run ? String(run.score) : '—',
      crGate: run ? (run.gate==='fail'?'KALDI':'GEÇTİ') : '',
      crGateCls: 'gx-pill '+(run?(run.gate==='fail'?'err':'ok'):'idle'),
      crMeta: run ? ((run.files||[]).length+' dosya · '+(findings.length)+' bulgu · '+(run.engine||'')) : 'Commitlenmemiş diff taranır. Claude yoksa kolektörler yine çalışır.',
      crRunLabel: busy?'İnceleniyor…':'Kod incele',
      crEmpty: !busy && !run,
      crClean: !busy && !!run && findings.length===0,
      crHasFindings: findings.length>0,
      crHasHistory: hist.length>0,
      crHistory: hist.map(h=>({
        score:String(h.score!=null?h.score:'—'),
        gate:h.gate==='fail'?'KALDI':'GEÇTİ',
        gateCls:'gx-pill '+(h.gate==='fail'?'err':'ok'),
        when:this._ago? (this._ago(h.createdAt)||'') : '',
        onClick:()=>this._crOpenRun(h.id)
      })),
      crHasCommit:!!run,
      crCommitScore: run?String(run.score):'',
      crCommitGate: run?(run.gate==='fail'?'KALDI':'GEÇTİ'):'',
      crCommitCls: 'gx-pill '+(run?(run.gate==='fail'?'err':'ok'):'idle'),
      crCommitHint: run?(run.gate==='fail'?'Son kod incelemesi kaldı.':'Son kod incelemesi geçti.'):'',
      crFindings: findings.map(f=>({
        sev: sevLbl[f.severity]||f.severity, sevCls:'gx-pill '+(sevTone[f.severity]||'idle'),
        title:f.title||f.rule, loc:(f.file||'')+':'+(f.line||1),
        why:f.why||'', fix:f.fix||'',
        onClick:()=>this._crJump(f.file, f.line)
      }))
    };
  }
  _agentWsVals(){
    const st=this.state; const a=(this.AGENTS||[]).find(x=>x.id===st.agentId)||null;
    const cr=this._crView();
    if(!a) return Object.assign({ wsOpen:false, wsMsgs:[], wsPresets:[], wsAbilities:[], wsEmpty:true, wsHasMsgs:false, crOpen:false }, cr);
    const s=this._agentStatus(a); const busy=this._agentBusyId(a.id);
    const inProj=this._inPlanet&&this._inPlanet()&&this.sel;
    const isQ=a.kind==='quality';
    const msgs=[]; let tools=null;
    (a.msgs||[]).forEach(([who,text])=>{
      if(who==='t'){ if(!tools){ tools={isTools:true,isUser:false,isAgent:false,items:[]}; msgs.push(tools); } tools.items.push(String(text||'').replace(/^⚙\s*/,'').slice(0,140)); return; }
      tools=null;
      if(who==='u') msgs.push({isUser:true,isAgent:false,isTools:false,text});
      else msgs.push({isUser:false,isAgent:true,isTools:false,text,lines:this._mdLines(text||'','doc'),pending:!String(text||'').trim()});
    });
    msgs.forEach(m=>{ if(m.isTools){ const n=m.items.length; m.toolSummary=n+' adım: '+m.items.slice(-1)[0]; m.toolItems=m.items.slice(-6).map(t=>({t})); } });
    return Object.assign({
      wsOpen:true, wsName:a.name, wsRole:a.role||'', wsInitial:this._agentInitial(a),
      wsAvatarStyle:`background:color-mix(in srgb, ${a.color} 22%, transparent);color:${a.color};border-color:color-mix(in srgb, ${a.color} 55%, transparent)`,
      wsStatus:s.label, wsStatusCls:'gx-pill '+s.tone,
      wsContext: inProj?('Proje: '+this.sel.name):'Tüm projeler',
      wsContextTitle: inProj?'Ajan bu projenin klasöründe çalışır':'Ajan tüm projelerin özetini görür; bir projeye girersen o projede çalışır',
      wsAbilities:(a.abilities&&a.abilities.length?a.abilities:[a.role||'Genel amaçlı ajan']).map(t=>({t})),
      wsPresets:(a.presets||[]).map(p=>({label:p.label, onClick:()=>{
        if(a.paused){ this.toast('Önce devam ettir','err'); return; }
        if(isQ){ this._crStart(); return; }
        if(a.kind==='flow'){ this._agentWsClose(); this._flowAgentGo(p.ask); return; }
        this.setState({agentInput:p.ask}); setTimeout(()=>this.sendAgent(),20);
      }})),
      wsMsgs:msgs, wsHasMsgs:msgs.length>0, wsEmpty:msgs.length===0 && !isQ,
      wsEmptyTitle:a.name+' ile ne yapmak istersin?',
      wsBusy:busy, wsIdle:!busy, wsPaused:!!a.paused, wsActive:!a.paused,
      wsPauseLabel:a.paused?'Devam ettir':'Duraklat',
      wsTogglePause:()=>this._agentSetPaused(a.id,!a.paused),
      wsClear:()=>{ a.msgs=[]; if(this._agentSess) delete this._agentSess[a.id]; this.setState({_agv:(this.state._agv||0)+1}); },
      wsEdit:()=>{ this.setState({agentId:null, asstAgentId:a.id}); this.openAgentEdit(a.id); },
      wsClose:()=>this._agentWsClose(),
      wsStop:()=>{ try{ if(this._agentRunId&&window.galaxy&&window.galaxy.claudeStop) window.galaxy.claudeStop(this._agentRunId); }catch(e){} if(this._agentRunId&&this._runAgents) delete this._runAgents[this._agentRunId]; this._agentRunId=null; this.setState({_agentBusy:false}); },
      wsPlaceholder:a.paused?(a.name+' duraklatıldı — önce devam ettir'):(isQ?'Bu sohbet serbest soru içindir. İnceleme üstteki listededir.':'Mesajını yaz… (Enter gönderir, Shift+Enter yeni satır)'),
      crOpen:isQ
    }, cr);
  }
