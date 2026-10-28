  // ==================== TOPLANTI SALONU (Ajanlar sekmesi: ekip + toplantı masası) ====================
  _salonInit(){ if(this._salon) return this._salon;
    let hist=[]; try{ hist=JSON.parse(localStorage.getItem('gxMeetings')||'[]')||[]; }catch(e){}
    this._salon={ topic:'', picks:null, running:false, turns:[], summary:null, viewId:null, history:Array.isArray(hist)?hist.slice(0,15):[], n:0 };
    this._salonRuns={}; this._salonWait={};
    this._salonLoadCatalog();
    return this._salon; }
  async _salonLoadCatalog(){ try{ if(window.galaxy&&window.galaxy.agentCatalog){ const c=await window.galaxy.agentCatalog(); if(Array.isArray(c)){ this._salonCatalog=c; this.setState({_salonTick:(this.state._salonTick||0)+1}); } } }catch(e){} }
  async _salonRestore(id){ try{ if(window.galaxy&&window.galaxy.agentRestore){ const r=await window.galaxy.agentRestore(id); if(r&&r.ok===false){ this.toast(this._failIpc(r,'eklenemedi'),'err'); return; } await this._loadReal(); await this._salonLoadCatalog(); this.toast('Ekibe eklendi'); } }catch(e){ this.toast('eklenemedi','err'); } }
  _salonPicked(){ const S=this._salonInit(); const active=(this.AGENTS||[]).filter(a=>!a.paused);
    if(!S.picks) return active; return active.filter(a=>S.picks[a.id]); }
  _salonTick(){ this.setState({_salonTick:(this.state._salonTick||0)+1}); }
  _salonStart(topic){ const S=this._salonInit(); if(S.running) return;
    if(topic!=null&&String(topic).trim()) S.topic=String(topic).trim();
    const t=String(S.topic||'').trim(); if(!t){ this.toast('Önce toplantı konusunu yaz','err'); return; }
    const who=this._salonPicked(); if(!who.length){ this.toast('En az bir ajan seç','err'); return; }
    if(!(window.galaxy&&window.galaxy.agentRun)){ this.toast('Toplantı için Claude CLI gerekli','err'); return; }
    S.viewId=null; S.running=true; S.turns=who.map(a=>({agentId:a.id,name:a.name,color:a.color,text:'',status:'wait'})); S.summary=null; S.startedAt=Date.now();
    this._salonTick(); this._salonRun(t, who); }
  _salonAwait(runId){ return new Promise(res=>{ this._salonWait[runId]=res; }); }
  async _salonRun(topic, who){ const S=this._salon; const pid=(this._inPlanet&&this._inPlanet()&&this.sel&&this.sel.id)?this.sel.id:null;
    const names=who.map(a=>a.name+' ('+a.role+')').join(', ');
    for(let i=0;i<who.length;i++){ if(!S.running) return; const a=who[i]; const turn=S.turns[i]; turn.status='run'; this._salonTick();
      const prev=S.turns.slice(0,i).filter(x=>x.text).map(x=>'### '+x.name+'\n'+String(x.text).slice(0,1800)).join('\n\n');
      const prompt='TOPLANTI\nKonu: '+topic+'\nKatılımcılar: '+names+'\n\n'+(prev?('Senden önce konuşanlar:\n'+prev+'\n\n'):'')+'Sen '+a.name+' olarak kendi uzmanlığından bu konuya katkı ver. Gerekirse projeye bak. En fazla 250 kelime, maddeler halinde. Öncekileri tekrar etme; katılmadığın nokta varsa açıkça söyle. Dosya değiştirme.';
      const runId='mt'+(++S.n)+'-'+a.id; this._salonRuns[runId]=turn; turn.runId=runId;
      const wait=this._salonAwait(runId);
      try{ const r=await window.galaxy.agentRun({runId,agentId:a.id,prompt,projectId:pid,continueSession:false});
        if(r&&r.ok===false){ turn.text='⚠ '+this._failIpc(r,'konuşamadı'); turn.status='err'; delete this._salonRuns[runId]; delete this._salonWait[runId]; this._salonTick(); continue; } }
      catch(e){ turn.status='err'; turn.text='⚠ konuşamadı'; delete this._salonRuns[runId]; continue; }
      await wait; }
    if(!S.running) return;
    S.summary={text:'',status:'run'}; this._salonTick();
    const all=S.turns.filter(x=>x.text&&x.status!=='err').map(x=>'### '+x.name+'\n'+String(x.text).slice(0,2200)).join('\n\n');
    const prompt='Bir ekip toplantısını yönettin. Konu: '+topic+'\n\nKonuşmalar:\n'+all+'\n\nBenim dijital ikizim olarak toparla. Markdown başlıkları: ## Ortak sonuç (2-3 cümle), ## Kararlar, ## Yapılacaklar (her madde: kim — ne), ## Açık sorular. [[ACT]] komutu kullanma.';
    if(!(window.galaxy&&window.galaxy.assistantRun)){ S.summary={text:'(özet için Claude gerekli)',status:'err'}; S.running=false; this._salonSave(topic); return; }
    const runId='mt-sum-'+(++S.n); this._salonSumRun=runId; const wait=this._salonAwait(runId);
    try{ const ctx=Object.assign({}, this._asstCtx?this._asstCtx():{}, {voice:false, agentName:''});
      const r=await window.galaxy.assistantRun({runId,cwd:null,prompt,continueSession:false,ctx});
      if(r&&r.ok===false){ S.summary={text:'⚠ '+this._failIpc(r,'özet çıkmadı'),status:'err'}; delete this._salonWait[runId]; }
      else await wait; }catch(e){ S.summary={text:'⚠ özet çıkmadı',status:'err'}; }
    S.running=false; this._salonSave(topic); this._salonTick(); }
  _salonSave(topic){ const S=this._salon; if(!S) return;
    const rec={id:'m'+Date.now().toString(36), ts:Date.now(), topic, turns:S.turns.map(t=>({name:t.name,color:t.color,text:t.text,status:t.status})), summary:(S.summary&&S.summary.text)||''};
    S.history=[rec].concat(S.history||[]).slice(0,15);
    try{ localStorage.setItem('gxMeetings', JSON.stringify(S.history)); }catch(e){} }
  _salonStop(){ const S=this._salon; if(!S||!S.running) return; S.running=false;
    Object.keys(this._salonRuns||{}).forEach(r=>{ try{ if(window.galaxy&&window.galaxy.claudeStop) window.galaxy.claudeStop(r); }catch(e){} const w=this._salonWait[r]; if(w) w(); });
    if(this._salonSumRun){ try{ window.galaxy&&window.galaxy.claudeStop&&window.galaxy.claudeStop(this._salonSumRun); }catch(e){} }
    this._salonRuns={}; this._salonWait={};
    S.turns.forEach(t=>{ if(t.status==='run'||t.status==='wait') t.status='stop'; }); if(S.summary&&S.summary.status==='run') S.summary.status='stop';
    this._salonTick(); }
  // agent:out akışından toplantı turlarını ayıklar; true dönerse olay toplantıya aittir.
  _salonAgentMsg(m){ const turn=this._salonRuns&&m&&this._salonRuns[m.runId]; if(!turn) return false;
    if(m.kind==='text') turn.text+=m.text||'';
    else if(m.kind==='err'){ if(!this._cliNoise(m.text)) turn.text+=(turn.text?'\n':'')+'⚠ '+m.text; }
    else if(m.kind==='done'){ if(turn.status==='run') turn.status=turn.text.trim()?'ok':'err'; delete this._salonRuns[m.runId]; const w=this._salonWait[m.runId]; delete this._salonWait[m.runId]; if(w) w(); }
    this._salonTick(); this._scrollBottom('#gx-salon-feed'); return true; }
  _salonClaudeMsg(m){ const S=this._salon; if(!S||!m||m.runId!==this._salonSumRun) return false; const sum=S.summary||(S.summary={text:'',status:'run'});
    if(m.kind==='text'||m.kind==='data') sum.text+=String(m.text||'');
    else if(m.kind==='result'){ if(!sum.text.trim()&&m.text) sum.text=String(m.text); }
    else if(m.kind==='err'){ const t=String(m.text||'').trim(); if(t&&!this._cliNoise(t)) sum.text+=(sum.text?'\n':'')+'⚠ '+t; }
    else if(m.kind==='done'){ sum.status=sum.text.trim()?'ok':'err'; const w=this._salonWait[m.runId]; delete this._salonWait[m.runId]; if(w) w(); }
    this._salonTick(); this._scrollBottom('#gx-salon-feed'); return true; }
  _salonVals(){
    const S=this._salonInit(); const agents=this.AGENTS||[];
    const picked=new Set(this._salonPicked().map(a=>a.id));
    const view=S.viewId?(S.history||[]).find(h=>h.id===S.viewId):null;
    const turns=view?view.turns:S.turns; const summary=view?(view.summary?{text:view.summary,status:'ok'}:null):S.summary;
    const stLabel={wait:'Sırada',run:'Konuşuyor…',ok:'',err:'Yanıt yok',stop:'Durduruldu'};
    const avatar=(c)=>`background:color-mix(in srgb, ${c} 22%, transparent);color:${c};border-color:color-mix(in srgb, ${c} 55%, transparent)`;
    const cards=agents.map(a=>{ const s=this._agentStatus(a);
      return { id:a.id, name:a.name, role:a.role||'', initial:this._agentInitial(a), avatarStyle:avatar(a.color),
        statusLabel:s.label, statusCls:'gx-pill '+s.tone, cardCls:'gx-salon-card'+(a.paused?' paused':''),
        abilities:(a.abilities&&a.abilities.length?a.abilities:[a.role||'Genel amaçlı ajan']).slice(0,4).map(t=>({t})),
        onTalk:()=>this._agentWsOpen(a.id), pauseLabel:a.paused?'Devam ettir':'Duraklat', onTogglePause:()=>this._agentSetPaused(a.id,!a.paused),
        onDelete:()=>this.askConfirm('“'+a.name+'” ekipten çıkarılsın mı?',()=>this._agentDelete(a.id),{title:'Ajanı sil',okLabel:'Sil',kind:'danger'}),
        hasBadge:(a.badge||0)>0, badge:a.badge||0 }; });
    const missing=(this._salonCatalog||[]).filter(c=>!c.added&&!agents.some(a=>a.id===c.id)).map(c=>({ name:c.name, role:c.role||'', initial:String(c.name||'?').charAt(0), avatarStyle:avatar(c.color||'#61dcff'), abilities:(c.abilities||[]).slice(0,2).map(t=>({t})), onAdd:()=>this._salonRestore(c.id) }));
    return {
      salonCards:cards, salonHasMissing:missing.length>0, salonMissing:missing,
      salonAddAgent:()=>this.openAgentAdd(),
      salonTopic:S.topic||'', onSalonTopic:(e)=>{ S.topic=(e&&e.target&&e.target.value)||''; this._salonTick(); },
      onSalonTopicKey:(e)=>{ if(e&&e.key==='Enter'&&(e.metaKey||e.ctrlKey)){ e.preventDefault&&e.preventDefault(); this._salonStart(); } },
      salonPicks:agents.filter(a=>!a.paused).map(a=>({ name:a.name, cls:'gx-chip'+(picked.has(a.id)?' on':''), dotStyle:`background:${a.color}`,
        onClick:()=>{ if(S.running) return; if(!S.picks){ S.picks={}; agents.forEach(x=>{ S.picks[x.id]=true; }); } S.picks[a.id]=!S.picks[a.id]; this._salonTick(); } })),
      salonRunning:!!S.running, salonIdle:!S.running,
      salonStart:()=>this._salonStart(), salonStop:()=>this._salonStop(),
      salonCanStart:!S.running&&!!String(S.topic||'').trim()&&picked.size>0,
      salonStartDisabled:!(!S.running&&!!String(S.topic||'').trim()&&picked.size>0),
      salonStartLabel:picked.size?('Toplantıyı başlat · '+picked.size+' ajan'):'Ajan seç',
      salonViewing:!!view, salonViewTitle:view?(view.topic+' · '+new Date(view.ts).toLocaleString('tr-TR',{day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'})):'',
      salonBackLive:()=>{ S.viewId=null; this._salonTick(); },
      salonHasFeed:(turns||[]).length>0, salonNoFeed:!(turns||[]).length,
      salonTurns:(turns||[]).map(t=>({ name:t.name, initial:String(t.name||'?').charAt(0), avatarStyle:avatar(t.color||'#61dcff'),
        stateLabel:stLabel[t.status]||'', isRun:t.status==='run', lines:this._mdLines(t.text||'',''), hasText:!!String(t.text||'').trim(), noText:!String(t.text||'').trim() })),
      salonHasSummary:!!summary, salonSumRun:!!(summary&&summary.status==='run'&&!String(summary.text||'').trim()),
      salonSumLines:summary?this._mdLines(summary.text||'',''):[],
      salonHasHistory:(S.history||[]).length>0,
      salonHistory:(S.history||[]).map(h=>({ topic:h.topic, when:this._ago?this._ago(h.ts):'', who:(h.turns||[]).map(t=>t.name).join(', '),
        cls:'gx-salon-hist'+(S.viewId===h.id?' on':''), onClick:()=>{ if(S.running) return; S.viewId=h.id; this._salonTick(); } })),
    };
  }
}
