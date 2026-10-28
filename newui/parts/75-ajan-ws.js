  // ==================== AJAN ÇALIŞMA ALANI (tam ekran: kimlik + hızlı işler | sohbet) ====================
  _findAgent(q){ const f=s=>this._asstFold?this._asstFold(String(s||'')):String(s||'').toLowerCase(); const k=f(q).trim(); if(!k) return null;
    const list=this.AGENTS||[];
    return list.find(a=>f(a.id)===k)||list.find(a=>f(a.name)===k)||list.find(a=>f(a.kind)===k)||list.find(a=>f(a.name).includes(k)||k.includes(f(a.name)))||null; }
  _agentWsOpen(id, task){ const ag=(this.AGENTS||[]).find(a=>a.id===id); if(!ag) return;
    ag.badge=0;
    this.setState({agentId:id, agentInput:task||'', asstOpen:false});
    try{ if(this._asst&&this._asst.open&&this._asstClose) this._asstClose(); }catch(e){}
    if(task) setTimeout(()=>{ try{ this.sendAgent(); }catch(e){} }, 60);
    setTimeout(()=>{ try{ const i=document.getElementById('gx-ws-input'); if(i) i.focus(); }catch(e){} this._scrollBottom('#gx-ws-feed'); }, 80); }
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
  _agentWsVals(){
    const st=this.state; const a=(this.AGENTS||[]).find(x=>x.id===st.agentId)||null;
    if(!a) return { wsOpen:false, wsMsgs:[], wsPresets:[], wsAbilities:[], wsEmpty:true, wsHasMsgs:false };
    const s=this._agentStatus(a); const busy=this._agentBusyId(a.id);
    const inProj=this._inPlanet&&this._inPlanet()&&this.sel;
    const msgs=[]; let tools=null;
    (a.msgs||[]).forEach(([who,text])=>{
      if(who==='t'){ if(!tools){ tools={isTools:true,isUser:false,isAgent:false,items:[]}; msgs.push(tools); } tools.items.push(String(text||'').replace(/^⚙\s*/,'').slice(0,140)); return; }
      tools=null;
      if(who==='u') msgs.push({isUser:true,isAgent:false,isTools:false,text});
      else msgs.push({isUser:false,isAgent:true,isTools:false,text,lines:this._mdLines(text||'','doc'),pending:!String(text||'').trim()});
    });
    msgs.forEach(m=>{ if(m.isTools){ const n=m.items.length; m.toolSummary=n+' adım: '+m.items.slice(-1)[0]; m.toolItems=m.items.slice(-6).map(t=>({t})); } });
    return {
      wsOpen:true, wsName:a.name, wsRole:a.role||'', wsInitial:this._agentInitial(a),
      wsAvatarStyle:`background:color-mix(in srgb, ${a.color} 22%, transparent);color:${a.color};border-color:color-mix(in srgb, ${a.color} 55%, transparent)`,
      wsStatus:s.label, wsStatusCls:'gx-pill '+s.tone,
      wsContext: inProj?('Proje: '+this.sel.name):'Tüm projeler',
      wsContextTitle: inProj?'Ajan bu projenin klasöründe çalışır':'Ajan tüm projelerin özetini görür; bir projeye girersen o projede çalışır',
      wsAbilities:(a.abilities&&a.abilities.length?a.abilities:[a.role||'Genel amaçlı ajan']).map(t=>({t})),
      wsPresets:(a.presets||[]).map(p=>({label:p.label, onClick:()=>{ if(a.paused){ this.toast('Önce devam ettir','err'); return; } this.setState({agentInput:p.ask}); setTimeout(()=>this.sendAgent(),20); }})),
      wsMsgs:msgs, wsHasMsgs:msgs.length>0, wsEmpty:msgs.length===0,
      wsEmptyTitle:a.name+' ile ne yapmak istersin?',
      wsBusy:busy, wsIdle:!busy, wsPaused:!!a.paused, wsActive:!a.paused,
      wsPauseLabel:a.paused?'Devam ettir':'Duraklat',
      wsTogglePause:()=>this._agentSetPaused(a.id,!a.paused),
      wsClear:()=>{ a.msgs=[]; if(this._agentSess) delete this._agentSess[a.id]; this.setState({_agv:(this.state._agv||0)+1}); },
      wsEdit:()=>{ this.setState({agentId:null, asstAgentId:a.id}); this.openAgentEdit(a.id); },
      wsClose:()=>this._agentWsClose(),
      wsStop:()=>{ try{ if(this._agentRunId&&window.galaxy&&window.galaxy.claudeStop) window.galaxy.claudeStop(this._agentRunId); }catch(e){} if(this._agentRunId&&this._runAgents) delete this._runAgents[this._agentRunId]; this._agentRunId=null; this.setState({_agentBusy:false}); },
      wsPlaceholder:a.paused?(a.name+' duraklatıldı — önce devam ettir'):('Mesajını yaz… (Enter gönderir, Shift+Enter yeni satır)'),
    };
  }
