  // ---------- EĞİTİMLERİM ----------
  async _trainingLoad(){
    if(this._trainings) return; // klasör taraması ucuz değil; sekmeye her dönüşte tekrar tarama
    try{
      if(!(window.galaxy&&window.galaxy.trainingList)){ this.setState({_trainingErr:'Bu ortamda eğitim modülü yok'}); return; }
      const r=await window.galaxy.trainingList();
      if(!r||!r.ok){ this.setState({_trainingErr:(r&&r.error)||'okunamadı'}); return; }
      this._trainings=r.categories||[]; this._trainingRoot=r.root||'';
      const keep=this.state._trainingCat;
      const first=this._trainings[0];
      const cat=(keep&&this._trainings.some(c=>c.key===keep))?keep:((first&&first.key)||'');
      this.setState({_trainingErr:'', _trainingCat:cat});
    }catch(e){ this.setState({_trainingErr:'okunamadı'}); }
  }
  _trainingRefresh(){ this._trainings=null; this._trainingLoad(); }
  async _trainingOpen(id){
    this.setState({trainingSel:id, _trainingBusy:true, _trainingItem:null});
    try{
      const r=await window.galaxy.trainingRead(id);
      if(r&&r.ok){ this._trainingHtml=r.html; this.setState({_trainingBusy:false, _trainingItem:{title:r.title,kind:r.kind}}); }
      else { this._trainingHtml='<p><em>'+((r&&r.error)||'okunamadı')+'</em></p>'; this.setState({_trainingBusy:false, _trainingItem:{title:'Hata',kind:''}}); }
    }catch(e){ this._trainingHtml='<p><em>okunamadı</em></p>'; this.setState({_trainingBusy:false, _trainingItem:{title:'Hata',kind:''}}); }
    setTimeout(()=>{ const el=document.getElementById('tr-reader'); if(el) el.innerHTML=this._trainingHtml||''; },30);
  }
  _trainingOpenOriginal(){ const id=this.state.trainingSel; if(id&&window.galaxy&&window.galaxy.trainingOpenOriginal) try{ window.galaxy.trainingOpenOriginal(id); }catch(e){} }
  _trainingSetMode(mode){ this.setState({trainingMode:mode}); if(mode==='sinav' && !this.state._quiz && !this.state._quizScope && !this.state._quizBusy) this._quizNext(); }
  // Sınav "kapsamı": null ise tüm derslerden rastgele (quizRandom); doluysa TEK bir dersin
  // kendi soru setinde ilerler (quizGet ile önceden çekilmiş, sırayla gösterilir).
  async _quizNext(){
    const scope=this.state._quizScope;
    if(scope){
      const nextIdx=scope.idx+1;
      if(nextIdx<scope.questions.length){
        this.setState({_quizPicked:null, _quizScope:Object.assign({},scope,{idx:nextIdx}),
          _quiz:{id:scope.id, title:scope.title, category:scope.category, question:scope.questions[nextIdx]}});
      } else {
        // set tükendi — "tamamlandı" ekranı gösterilsin
        this.setState({_quizPicked:null, _quiz:null, _quizScope:Object.assign({},scope,{idx:nextIdx})});
      }
      return;
    }
    const avoidRel=this.state._quiz&&this.state._quiz.rel;
    this.setState({_quizBusy:true, _quizPicked:null, _quizErr:''});
    try{
      const r=await window.galaxy.quizRandom(avoidRel);
      if(r&&r.ok) this.setState({_quizBusy:false, _quiz:r});
      else this.setState({_quizBusy:false, _quiz:null, _quizErr:(r&&r.error)||'sınav üretilemedi'});
    }catch(e){ this.setState({_quizBusy:false, _quiz:null, _quizErr:'sınav üretilemedi'}); }
  }
  _quizPick(i){ const q=this.state._quiz; if(this.state._quizPicked!=null||!q) return;
    const correct=q.question.correct===i;
    this.setState({_quizPicked:i, _quizRight:this.state._quizRight+(correct?1:0), _quizWrong:this.state._quizWrong+(correct?0:1)}); }
  // Okuma panelindeki "Bu dersten pratik yap" — bu dersin TÜM sorularını çeker (önbelleğe
  // alınmışsa anında, değilse Claude ile üretilir), sırayla gösterir.
  async _quizStartLesson(id){
    if(!id) return;
    this.setState({trainingMode:'sinav', _quizBusy:true, _quizPicked:null, _quizErr:'', _quiz:null, _quizScope:null});
    try{
      const r=await window.galaxy.quizGet(id);
      if(r&&r.ok&&r.questions&&r.questions.length){
        const cat=(this._trainings||[]).find(c=>(c.items||[]).some(it=>it.id===id));
        const catName=(cat&&cat.name)||'';
        this.setState({_quizBusy:false, _quizRight:0, _quizWrong:0,
          _quizScope:{id, title:r.title, category:catName, questions:r.questions, idx:0},
          _quiz:{id, title:r.title, category:catName, question:r.questions[0]}});
      } else this.setState({_quizBusy:false, _quizErr:(r&&r.error)||'bu ders için soru üretilemedi'});
    }catch(e){ this.setState({_quizBusy:false, _quizErr:'bu ders için soru üretilemedi'}); }
  }
  _quizExitScope(){ this.setState({_quizScope:null, _quiz:null, _quizPicked:null, _quizErr:''}); this._quizNext(); }
  _quizRetryScope(){ const scope=this.state._quizScope; if(!scope) return;
    this.setState({_quizPicked:null, _quizRight:0, _quizWrong:0, _quizScope:Object.assign({},scope,{idx:0}), _quiz:{id:scope.id,title:scope.title,category:scope.category,question:scope.questions[0]}}); }
  // ---------- Eğitim CRUD: ekle / sil ----------
  _trainingOpenAdd(){ this.setState({trainingAddOpen:true, _trainingAddCat:this.state._trainingCat||'', trainingAddNewCat:'', _trainingAddFiles:[], _trainingAddErr:''}); }
  _trainingCloseAdd(){ this.setState({trainingAddOpen:false}); }
  _trainingSetAddCat(key){ this.setState({_trainingAddCat:key, trainingAddNewCat:''}); }
  onTrainingAddNewCat(e){ this.setState({trainingAddNewCat:(e&&e.target&&e.target.value)||'', _trainingAddCat:''}); }
  async _trainingPickFiles(){
    try{ if(!(window.galaxy&&window.galaxy.pickFiles)) return;
      const r=await window.galaxy.pickFiles();
      const arr=(Array.isArray(r)?r:(r?[r]:[])).map(f=>({ path:(f&&f.path)||f, name:(f&&f.name)||String((f&&f.path)||f||'').split(/[\\/]/).pop() })).filter(f=>f.path);
      if(arr.length) this.setState({_trainingAddFiles:arr, _trainingAddErr:''});
    }catch(e){}
  }
  _trainingRemoveAddFile(i){ this.setState({_trainingAddFiles:this.state._trainingAddFiles.filter((_,idx)=>idx!==i)}); }
  async _trainingSubmitAdd(){
    if(this.state._trainingAddBusy) return;
    const files=this.state._trainingAddFiles||[];
    if(!files.length){ this.setState({_trainingAddErr:'Önce bir dosya seç.'}); return; }
    const categoryKey=this.state._trainingAddCat||'';
    const newCategory=String(this.state.trainingAddNewCat||'').trim();
    if(!categoryKey && !newCategory){ this.setState({_trainingAddErr:'Bir kategori seç ya da yeni bir kategori adı yaz.'}); return; }
    this.setState({_trainingAddBusy:true, _trainingAddErr:''});
    let lastId=null, failCount=0;
    for(const f of files){
      try{ const r=await window.galaxy.trainingAdd({sourcePath:f.path, categoryKey, newCategory});
        if(r&&r.ok) lastId=r.id; else failCount++;
      }catch(e){ failCount++; }
    }
    this._trainings=null; // yeniden taransın
    this.setState({_trainingAddBusy:false, trainingAddOpen:false, _trainingAddFiles:[]});
    await this._trainingLoad();
    if(failCount) this.toast('✕ '+failCount+' dosya eklenemedi','err'); else this.toast('✓ eklendi');
    if(lastId){ const cat=(this._trainings||[]).find(c=>(c.items||[]).some(it=>it.id===lastId)); if(cat) this.setState({_trainingCat:cat.key}); this._trainingOpen(lastId); }
  }
  _trainingDeleteItem(id,title){
    this.askConfirm('"'+(title||'ders')+'" silinsin mi? (Çöp Kutusu’na taşınır)', async ()=>{
      try{ const r=await window.galaxy.trainingDelete(id); if(r&&r.ok){ this.toast('✓ silindi'); this._trainings=null;
          if(this.state.trainingSel===id) this.setState({trainingSel:null});
          await this._trainingLoad(); } else this.toast('✕ '+((r&&r.error)||'silinemedi'),'err'); }
      catch(e){ this.toast('✕ silinemedi','err'); }
    }, {title:'Dersi sil', okLabel:'Çöp Kutusuna Taşı', kind:'warn'});
  }
  _mailReply(){
    const sel=this.state.mailSel||{};
    const from=String(sel.from||'').replace(/^.*<([^>]+)>\s*$/,'$1').trim();
    const sub=String(sel.subject||'');
    this.setState({ mailPane:'compose', mailTo: from||this.state.mailTo||this._mailTo||'', mailSub: sub?( /^re:/i.test(sub)?sub:('Re: '+sub) ):'', mailBody:'' });
  }
  _mailNormFiles(r){
    const list=Array.isArray(r)?r:(r?[r]:[]);
    return list.map(f=>{
      const path=typeof f==='string'?f:(f&&(f.path||f.file||''))||'';
      const name=String((f&&f.name)||path).split(/[\\/]/).pop()||'dosya';
      const img=/\.(png|jpe?g|gif|webp|heic|svg|bmp)$/i.test(name);
      return { path, name, icon: img?'🖼':'📄' };
    }).filter(a=>a.path||a.name);
  }
  async _mailPickFiles(){
    try{
      if(!(window.galaxy&&window.galaxy.pickFiles)){ this.toast('dosya seçici yok','err'); return; }
      const r=await window.galaxy.pickFiles();
      const add=this._mailNormFiles(r);
      if(!add.length) return;
      const cur=(this.state.mailAtts||[]).slice();
      for(const a of add){ if(!cur.some(x=>x.path===a.path&&x.name===a.name)) cur.push(a); }
      this.setState({mailAtts:cur.slice(0,12)});
    }catch(e){ this.toast('✕ dosya seçilemedi','err'); }
  }
  _mailRemoveAtt(i){ const cur=(this.state.mailAtts||[]).slice(); cur.splice(i,1); this.setState({mailAtts:cur}); }
  async _mailSend(){
    const to=String(this.state.mailTo||this._mailTo||'').trim();
    const sub=String(this.state.mailSub||'').trim();
    const body=String(this.state.mailBody||'').trim();
    if(!to){ this.toast('kime yaz','err'); return; }
    if(!body){ this.toast('metin boş','err'); return; }
    const atts=this.state.mailAtts||[];
    try{
      if(!(window.galaxy&&window.galaxy.mcpCall)){ this._friendlyFail({error:'MCP yok'},'MCP yok','mcp'); this.toast('✕ MCP yok','err'); return; }
      const paths=atts.map(a=>a.path).filter(Boolean);
      const names=atts.map(a=>a.name);
      const r=await window.galaxy.mcpCall({alias:'send', args:{to:[to], subject:sub||'(konu yok)', body, text:body, attachments:paths, files:paths, filenames:names}});
      if(r&&r.ok){ this.toast(paths.length?('✓ posta + '+paths.length+' ek'):'✓ posta gitti'); this.setState({mailBody:'', mailAtts:[]}); }
      else { const msg=this._friendlyFail(r,'MCP yok','mcp'); this.toast('✕ '+msg,'err'); }
    }catch(e){ this._friendlyFail({error:'posta hatası'},'posta hatası','mcp'); this.toast('✕ posta hatası','err'); }
  }
  async _loadDocker(){
    try{ if(window.galaxy.dockerStatus){ const s=await window.galaxy.dockerStatus(); this.setState({_dstatus:s}); if(s&&s.mas) this.setState({_masBlocked:true}); } }catch(e){ this.setState({_dstatus:{ok:false}}); }
    try{ if(window.galaxy.dockerPs){ const r=await window.galaxy.dockerPs(true); if(r&&r.ok===false){ this._noteBlocked(r); this.setState({_docker:[]}); } else this.setState({_docker:(r&&r.containers)||[]}); } }catch(e){ this.setState({_docker:[]}); }
    try{ if(window.galaxy.dockerImages){ const r=await window.galaxy.dockerImages(); if(r&&r.ok===false){ this._noteBlocked(r); this.setState({_images:[]}); } else this.setState({_images:(r&&r.images)||[]}); } }catch(e){ this.setState({_images:[]}); }
  }
  _dockerPorts(str){ if(Array.isArray(str)) str=str.join(','); const out=[]; String(str||'').replace(/:(\d+)->/g,(_,p)=>{ if(out.indexOf(p)<0) out.push(p); }); return out; }
  openLocalPort(port){ try{ if(window.galaxy&&window.galaxy.openLocalPort) window.galaxy.openLocalPort(Number(port)); }catch(e){ this.toast('✕ port açılamadı','err'); } }
  async _dockerAct(id,action){
    try{
      const r=await window.galaxy.dockerAction({id,action});
      if(r&&r.ok===false) this.toast('✕ '+((r&&r.error)||'işlem başarısız'),'err');
      else {
        this.toast('✓ '+({start:'başlatıldı',stop:'durduruldu',restart:'yeniden başlatıldı',rm:'kaldırıldı'}[action]||'tamam'));
        const d=this.state._dlog;
        if(d&&d.kind!=='image'&&d.id===id){
          if(action==='rm') this.closeDlog();
          else {
            const up=action==='start'||action==='restart'?true:(action==='stop'?false:!!d.up);
            this.setState({_dlog:Object.assign({},d,{up,state:up?'çalışıyor':'durdu'})});
            this._dockerLoadInspect(id);
          }
        }
      }
      this._loadDocker();
    }catch(e){ this.toast('✕ Docker hatası','err'); }
  }
  _dockerStopEv(e){ if(e&&e.stopPropagation) e.stopPropagation(); }
  _fmtBytes(n){ n=+n||0; if(n<1024) return n+' B'; const u=['KB','MB','GB','TB']; let i=-1; do{ n/=1024; i++; }while(n>=1024&&i<u.length-1); return (n>=10?n.toFixed(0):n.toFixed(1))+' '+u[i]; }
  _fmtInspectPorts(ports){ if(!ports||typeof ports!=='object') return ''; const out=[];
    for(const k of Object.keys(ports)){ const binds=ports[k]; if(!binds||!binds.length){ out.push(k); continue; }
      for(const b of binds){ out.push((b.HostIp||'0.0.0.0')+':'+(b.HostPort||'')+'->'+k); } }
    return out.join(', '); }
  _dockerDetailFields(kind,d,obj){
    const kv=(k,v)=>{ const s=v==null||v===''?'':String(v); return s?{k,v:s.length>160?s.slice(0,157)+'…':s}:null; };
    const out=[]; d=d||{};
    if(kind==='image'){
      const tags=(obj&&obj.RepoTags)||null;
      const id=(obj&&(obj.Id||obj.ID)||d.id||'').replace(/^sha256:/,'');
      out.push(kv('Kimlik', id?id.slice(0,12):''));
      out.push(kv('Etiketler', tags&&tags.length?tags.filter(t=>t&&t!=='<none>:<none>').join(', '):((d.repo||'')+(d.tag?':'+d.tag:''))));
      out.push(kv('Boyut', d.size||(obj&&obj.Size!=null?this._fmtBytes(obj.Size):'')));
      out.push(kv('Oluşturulma', d.created||(obj&&obj.Created)||''));
      if(obj&&obj.Architecture) out.push(kv('Mimari', obj.Architecture+(obj.Os?'/'+obj.Os:'')));
    } else {
      const st=(obj&&obj.State)||{}, cfg=(obj&&obj.Config)||{}, net=(obj&&obj.NetworkSettings)||{};
      out.push(kv('Ad', String((obj&&obj.Name)||d.name||'').replace(/^\//,'')));
      out.push(kv('Durum', st.Status||d.status||d.state||''));
      out.push(kv('İmaj', cfg.Image||d.image||''));
      out.push(kv('Portlar', d.ports||this._fmtInspectPorts(net.Ports)));
      out.push(kv('Oluşturulma', d.created||(obj&&obj.Created)||''));
      const id=(obj&&obj.Id)||d.id||''; if(id) out.push(kv('Kimlik', String(id).replace(/^sha256:/,'').slice(0,12)));
      if(st.ExitCode!=null&&st.Status==='exited') out.push(kv('Çıkış', st.ExitCode));
      if(cfg.Cmd) out.push(kv('Komut', Array.isArray(cfg.Cmd)?cfg.Cmd.join(' '):cfg.Cmd));
    }
    return out.filter(Boolean);
  }
  dockerOpenLog(id,name){ this.dockerOpenDetail({kind:'container',id,name,tab:'logs'}); }
  dockerOpenDetail(spec){
    spec=spec||{};
    const prev=this.state._dlog;
    if(prev&&prev.kind!=='image'&&window.galaxy&&window.galaxy.dockerLogStop){ try{ window.galaxy.dockerLogStop({id:prev.id}); }catch(e){} }
    const isImg=spec.kind==='image';
    const id=spec.id||spec.name||((spec.repo||'')+(spec.tag?':'+spec.tag:''));
    const dlog={ kind:isImg?'image':'container', id, name:spec.name||spec.repo||id, image:spec.image||'', state:spec.state||'', status:spec.status||'', ports:spec.ports||'', created:spec.created||'', size:spec.size||'', tag:spec.tag||'', repo:spec.repo||'', up:!!spec.up, tab:isImg?'inspect':(spec.tab||'inspect'), inspectJson:'Inspect yükleniyor…', inspectErr:'', fields:this._dockerDetailFields(isImg?'image':'container', spec, null) };
    this._dlogLines=[]; this.setState({_dlog:dlog,dockExec:''});
    if(!isImg){
      try{
        if(window.galaxy&&window.galaxy.dockerLogStream) window.galaxy.dockerLogStream({id});
        else if(window.galaxy&&window.galaxy.dockerLogs){ window.galaxy.dockerLogs({id,tail:200}).then(r=>{ this._dlogLines=String((r&&(r.out||r.logs))||'').split('\n'); this.setState({_dlv:(this.state._dlv||0)+1}); }); }
      }catch(e){}
    }
    this._dockerLoadInspect(id);
  }
  async _dockerLoadInspect(id){
    try{
      const apply=(patch)=>{ this.setState(s=>{ const cur=s._dlog; if(!cur||cur.id!==id) return {}; return {_dlog:Object.assign({},cur,patch)}; }); };
      if(!window.galaxy||!window.galaxy.dockerInspect){
        const d=this.state._dlog||{};
        apply({inspectJson:JSON.stringify({id,name:d.name,image:d.image,state:d.state,status:d.status,ports:d.ports,created:d.created,size:d.size,repo:d.repo,tag:d.tag},null,2)});
        return;
      }
      const r=await window.galaxy.dockerInspect({id});
      const d=this.state._dlog; if(!d||d.id!==id) return;
      if(!r||r.ok===false){ apply({inspectErr:(r&&r.error)||'inspect alınamadı',inspectJson:(r&&r.error)||'inspect alınamadı'}); return; }
      const obj=r.inspect||null;
      const json=r.json||(obj?JSON.stringify(obj,null,2):'');
      apply({inspectJson:json||'(boş)',inspectErr:'',fields:this._dockerDetailFields(d.kind,Object.assign({},d),obj)});
    }catch(e){ this.setState(s=>{ const cur=s._dlog; if(!cur||cur.id!==id) return {}; return {_dlog:Object.assign({},cur,{inspectJson:'inspect alınamadı'})}; }); }
  }
  setDlogTab(tab){ const d=this.state._dlog; if(!d||d.kind==='image') return; this.setState({_dlog:Object.assign({},d,{tab})}); }
  _onDockerLog(m){ if(!m||!this.state._dlog||this.state._dlog.kind==='image'||m.id!==this.state._dlog.id) return; this._dlogLines=this._dlogLines||[];
    if(m.kind==='out'||m.kind==='err'){ for(const ln of String(m.text||'').split('\n')){ if(ln!=='') this._dlogLines.push(ln); } this._dlogLines=this._dlogLines.slice(-1000); this.setState({_dlv:(this.state._dlv||0)+1}); this._scrollBottom('#ghud-dlog-scroll'); } }
  closeDlog(){ const d=this.state._dlog; if(d&&d.kind!=='image'&&window.galaxy&&window.galaxy.dockerLogStop){ try{ window.galaxy.dockerLogStop({id:d.id}); }catch(e){} } this._dlogLines=[]; this.setState({_dlog:null,dockExec:''}); }
  onDockExec(e){ this.setState({dockExec:(e&&e.target&&e.target.value)||''}); }
  onDockExecKey(e){ if(e.key==='Enter'){ e.preventDefault&&e.preventDefault(); this.dockerExecRun(); } }
  async dockerExecRun(){ const d=this.state._dlog; const cmd=String(this.state.dockExec||'').trim(); if(!d||d.kind==='image'||!cmd||!window.galaxy||!window.galaxy.dockerExec) return;
    this._dlogLines=this._dlogLines||[]; this._dlogLines.push('$ '+cmd); this.setState({dockExec:'',_dlv:(this.state._dlv||0)+1});
    try{ const r=await window.galaxy.dockerExec({id:d.id,cmd}); const out=(r&&r.ok)?(r.out||'(çıktı yok)'):('hata: '+((r&&r.error)||''));
      for(const ln of String(out).split('\n')){ this._dlogLines.push(ln); } this._dlogLines=this._dlogLines.slice(-1000); this.setState({_dlv:(this.state._dlv||0)+1}); this._scrollBottom('#ghud-dlog-scroll'); }
    catch(e){ this._dlogLines.push('hata'); this.setState({_dlv:(this.state._dlv||0)+1}); } }
  async _dockerStartEngine(){ try{ const r=await window.galaxy.dockerStart(); if(r&&r.ok===false) this.toast('✕ '+this._failIpc(r,'Docker başlatılamadı'),'err'); setTimeout(()=>this._loadDocker(),1500); }catch(e){ this.toast('✕ Docker başlatılamadı','err'); } }
  async _dockerPrune(kind){ try{ await window.galaxy.dockerPrune(kind); this._loadDocker(); }catch(e){} }
  async _dockerImgAct(id,action){ try{ const r=await window.galaxy.dockerImageAction({id,action}); if(r&&r.ok===false) this.toast('✕ '+((r&&r.error)||'imaj kaldırılamadı (kullanımda olabilir)'),'err'); else this.toast('✓ imaj kaldırıldı'); this._loadDocker(); }catch(e){ this.toast('✕ Docker hatası','err'); } }
  // ---------- DB ----------
  async _loadDb(){ try{ if(window.galaxy.dbList){ const l=(await window.galaxy.dbList())||[]; this.setState({_db:l}); if(l.length&&!this.state.dbSel) this.dbSelectConn(l[0].id); } }catch(e){} }
  // ---------- KANBAN / TODO ----------
  async _loadTodos(){ try{
      const uni=this.state.uniId;
      if(this._readmeSyncOn() && window.galaxy&&window.galaxy.todoSeedFromPlans && this._panoSeeded!==uni){
        try{ await window.galaxy.todoSeedFromPlans({universe:uni}); this._panoSeeded=uni; }catch(e){}
      }
      if(window.galaxy.todoList){ this.setState({_todos:(await window.galaxy.todoList(uni))||[]}); }
    }catch(e){ this.toast('✕ görevler okunamadı','err'); } }
  _findTodoForPlan(pid,text){ const n=this._plainPlan(text).toLowerCase(); return (this.state._todos||[]).find(t=>t.projectId===pid && this._plainPlan(t.text).toLowerCase()===n); }
  _setPlanItemDone(pid, text, done){
    if(this._planTodoLock) return;
    const n=this._plainPlan(text).toLowerCase();
    const p=(this._allProjects||[]).find(x=>x.id===pid);
    const raw=((this._scan&&this._scan.projects)||[]).find(x=>x.id===pid);
    const apply=arr=>{ if(!arr) return false; const i=arr.findIndex(it=>this._plainPlan(Array.isArray(it)?it[0]:(it&&it.text)).toLowerCase()===n); if(i<0) return false; if(Array.isArray(arr[i])) arr[i][1]=!!done; else arr[i].done=!!done; return true; };
    apply(p&&p.plan); apply(raw&&raw.plan);
    if(raw) this._saveRaw(raw, (p&&p._path)||raw.path);
  }
  _todoSkipKey(pid,text){ return String(pid||'')+'::'+String(text||'').replace(/\s+/g,' ').trim().toLowerCase(); }
  _todoSkipMark(pid,text){ const n=String(text||'').replace(/\s+/g,' ').trim(); if(!pid||!n) return; this._todoSkipLocal=this._todoSkipLocal||new Set(); this._todoSkipLocal.add(this._todoSkipKey(pid,n)); }
  async _todoSkipHas(pid,text){
    const n=String(text||'').replace(/\s+/g,' ').trim(); if(!pid||!n) return false;
    const k=this._todoSkipKey(pid,n);
    if(this._todoSkipLocal&&this._todoSkipLocal.has(k)) return true;
    const fn=(window.galaxy&&(window.galaxy.todoSkipHas||null));
    if(fn){
      try{ const r=await fn({projectId:pid,text:n}); if(r&&r.skip){ this._todoSkipMark(pid,n); return true; } }catch(e){}
    }
    return false;
  }
  async _todoSetStatus(id,status){ try{ const t=(this.state._todos||[]).find(x=>x.id===id); await window.galaxy.todoSetStatus({id,status}); const sync=this._readmeSyncOn(); if(sync&&t&&t.projectId) this._setPlanItemDone(t.projectId, t.text, status==='done'); this._loadTodos(); if(sync&&t) this._readmeFromTodo(t.text, status==='done', t.projectId); }catch(e){ this.toast('✕ görev güncellenemedi','err'); } }
  async _todoDelete(id){ try{ const t=(this.state._todos||[]).find(x=>x.id===id); await window.galaxy.todoDelete(id); if(t&&t.projectId){ this._todoSkipMark(t.projectId, t.text); if(window.galaxy.todoSkip) try{ await window.galaxy.todoSkip({projectId:t.projectId, text:t.text}); }catch(e){} } this._loadTodos(); if(this._readmeSyncOn()&&t) this._readmeDropTodo(t.text, t.projectId); }catch(e){ this.toast('✕ görev silinemedi','err'); } }
  async addTodo(){ const text=String(this.state.todoInput||'').trim(); if(!text) return; this.setState({todoInput:''});
    try{ if(window.galaxy.todoAdd){ const p=this._ctxPlanet(); await window.galaxy.todoAdd({universe:this.state.uniId,text,status:'todo',projectId:p&&p.id,branch:(this.state._git&&this.state._git.branch)||(p&&p.branch)||''}); this._loadTodos(); if(this._readmeSyncOn()) this._readmeFromTodo(text,false, p&&p.id); } }catch(e){ this.toast('✕ görev eklenemedi','err'); } }
  onTodoInput(e){ this.setState({todoInput:(e&&e.target&&e.target.value)||''}); }
  onTodoKey(e){ if(e.key==='Enter'){ e.preventDefault&&e.preventDefault(); this.addTodo(); } }
  // ---------- NOT EKLE (proje notu — ham projeyi kullanır, format bozulmaz) ----------
  onNoteInput(e){ this.setState({noteInput:(e&&e.target&&e.target.value)||''}); }
  onNoteKey(e){ if(e.key==='Enter'){ e.preventDefault&&e.preventDefault(); this.addNote(); } }
  _planetOf(pid){
    if(pid){
      const hit=(this._allProjects||[]).find(x=>x.id===pid);
      if(hit) return hit;
      return (this.sel&&this.sel.id===pid)?this.sel:null;
    }
    return this.sel||null;
  }
  _rawProj(pid){ const id=pid||(this.sel&&this.sel.id); if(!id) return; return ((this._scan&&this._scan.projects)||[]).find(x=>x.id===id); }
  _saveRaw(raw, pathHint){ try{ if(raw&&window.galaxy&&window.galaxy.save){ const plan=this._planItems(raw.plan); raw.plan=plan; const mapped=this._planetOf(raw.id); const path=raw.path||pathHint||(mapped&&mapped._path)||(this.sel&&this.sel.id===raw.id&&this.sel._path)||''; window.galaxy.save({id:raw.id,name:raw.name,group:raw.group,status:raw.status,stage:raw.stage,progress:raw.progress,plan,notes:raw.notes,desc:raw.desc,links:raw.links,path}); } }catch(e){ this.toast('✕ kayıt yazılamadı','err'); } }
  // Plan maddesini tek tıkla tamam/beklemede yap. Pano ancak README’ye işle açıksa bağlanır.
  _togglePlan(i){ const p=this.sel; if(!p) return; const raw=this._rawProj();
    let done=null;
    if(raw&&Array.isArray(raw.plan)&&raw.plan[i]!=null){ const it=raw.plan[i]; if(Array.isArray(it)){ it[1]=!it[1]; done=it[1]; } else { it.done=!it.done; done=it.done; } this._saveRaw(raw); }
    if(p.plan&&p.plan[i]){ if(done==null) done=!p.plan[i][1]; p.plan[i][1]=done; }
    const text=p.plan&&p.plan[i]?p.plan[i][0]:'';
    if(this._readmeSyncOn()){
      const hit=text?this._findTodoForPlan(p.id, text):null;
      if(hit&&!this._planTodoLock){ this._planTodoLock=true; Promise.resolve(this._todoSetStatus(hit.id, done?'done':'todo')).then(()=>{ this._planTodoLock=false; },()=>{ this._planTodoLock=false; }); }
      else if(text&&done===false) this._panoEnsure(p, text);
    }
    this.setState({_nv:(this.state._nv||0)+1}); }
  async _panoEnsure(p, text){ const t=String(text||'').trim(); if(!p||!p.id||!t||!window.galaxy||!window.galaxy.todoAdd) return;
    if(this._findTodoForPlan(p.id, t)) return;
    if(await this._todoSkipHas(p.id, t)) return;
    try{ await window.galaxy.todoAdd({universe:p.universe||this.state.uniId,text:t,status:'todo',projectId:p.id,branch:(this.state._git&&this.state._git.branch)||p.branch||''}); this._loadTodos(); }catch(e){} }
  onPlanInput(e){ this.setState({planInput:(e&&e.target&&e.target.value)||''}); }
  onPlanKey(e){ if(e.key==='Enter'){ e.preventDefault&&e.preventDefault(); this.addPlanItem(); } }
  addPlanItem(){ const text=String(this.state.planInput||'').trim(); if(!text) return; const p=this.sel; const raw=this._rawProj();
    if(raw){ raw.plan=raw.plan||[]; raw.plan.push(Array.isArray(raw.plan[0])||!raw.plan.length?[text,false]:{text,done:false}); this._saveRaw(raw); }
    if(p){ p.plan=p.plan||[]; p.plan.push([text,false]); if(this._readmeSyncOn()){ this._panoEnsure(p, text); this._readmeFromTodo(text,false, p.id); } }
    this.setState({planInput:'',_nv:(this.state._nv||0)+1}); }
  _plainPlan(t){ return String(t||'').replace(/\*\*(.+?)\*\*/g,'$1').replace(/`([^`]+)`/g,'$1').replace(/\s+/g,' ').trim(); }
  _parseReadmePlan(md){
    const lines=String(md||'').split('\n'); const secs=[]; let cur={title:'Yapılacaklar',items:[]};
    for(const ln of lines){
      const h=ln.match(/^#{1,3}\s+(.+)/); if(h){ if(cur.items.length) secs.push(cur); cur={title:h[1].trim(),items:[]}; continue; }
      const t=ln.match(/^\s*[-*]\s+\[([ xX])\]\s+(.+)/); if(t) cur.items.push({text:t[2].trim(),done:t[1].toLowerCase()==='x'});
    }
    if(cur.items.length) secs.push(cur);
    return secs.filter(s=>s.items.length);
  }
  async pullPlanFromReadme(){ return this._autoPlanFromReadme(true); }
  async _autoPlanFromReadme(force){
    if(!force && !this._readmeSyncOn()) return;
    const p=this.sel; if(!p||!p.id||!window.galaxy||!window.galaxy.syncReadme) return;
    if(!force && this._planAuto===p.id) return;
    this._planAuto=p.id;
    try{
      const r=await window.galaxy.syncReadme(p.id);
      if(r&&r.ok&&r.plan){ p.plan=this._mapPlan(r.plan); const raw=this._rawProj(); if(raw) raw.plan=r.plan; this.setState({_nv:(this.state._nv||0)+1}); this._panoSeeded=null; this._loadTodos(); }
    }catch(e){}
  }
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
        const plan=this._planItems(raw.plan); raw.plan=plan; raw.notes=notes;
        window.galaxy.save({id:raw.id,name:raw.name,group:raw.group,status:raw.status,stage:raw.stage,progress:raw.progress,plan,notes,desc:raw.desc,links:raw.links,path:raw.path||(p&&p._path)||''});
        if(p) p._notes=notes; this.setState({_nv:(this.state._nv||0)+1});
        if(window.galaxy.logDetect){ window.galaxy.logDetect(text).then(d=>{ if(d&&d.ok&&window.galaxy.logApply) window.galaxy.logApply(d); }).catch(()=>{}); } }
      else if(window.galaxy&&window.galaxy.logSave){ window.galaxy.logSave(text); }
    }catch(e){ this.toast('✕ not yazılamadı','err'); }
  }
  // ---------- PROJE AKSİYONLARI ----------
  openProjectFolder(){ try{ const p=this.sel; if(p&&p._path&&window.galaxy.openFolder){ const r=window.galaxy.openFolder(p._path); if(r&&r.then) r.then(x=>{ if(x&&x.ok===false) this.toast('✕ '+this._failIpc(x,'klasör açılamadı'),'err'); }); } else this.toast('✕ klasör açılamadı','err'); }catch(e){ this.toast('✕ klasör açılamadı','err'); } }
  async removeProject(){ const p=this.sel; if(!p) return;
    this.askConfirm('"'+p.name+'" galaksiden gizlensin?', ()=>this._hideProject(),
      {title:'Gezegeni gizle', detail:'Klasör diskte kalır. Gizlenenler listesinden geri alabilirsin.', okLabel:'Gizle', kind:'warn'}); }
  async _hideProject(){ try{ const p=this.sel; const fn=(window.galaxy&&(window.galaxy.projectHide||window.galaxy.projectDelete));
    if(p&&fn){ const r=await fn(p.id); if(r&&r.ok&&(!r.action||r.action!=='cancel')){ this.toast('✓ gizlendi'); this.setState({mode:'space', holdPlanet:false}); this._loadReal();
      this._logActivity('HIDE_PLANET', p.name||'gezegen', {undo:()=>this._unhide(p.id)}); } }
  }catch(e){ this.toast('✕ gizlenemedi','err'); } }
  // ---------- EVREN sil ----------
  async _universeDelete(id){ try{ if(!(window.galaxy&&window.galaxy.universeDelete)){ this.toast('✕ evren kaldırılamadı','err'); return; }
    const r=await window.galaxy.universeDelete(id);
    if(r&&r.ok===false){ this.toast('✕ '+(r.error||'evren kaldırılamadı'),'err'); return; }
    this.toast('✓ evren kaldırıldı'); await this._loadReal();
    const first=(this._unis&&this._unis[0]&&this._unis[0].id)||null; this._applyUni(first); this.setState({uniId:first,mode:'space',tab:'genel'});
  }catch(e){ this.toast('✕ evren kaldırılamadı','err'); } }
  // ---------- YEDEKLER ----------
  async _openBackups(){ this.setState({backupsOpen:true,palette:false}); try{ if(window.galaxy.backupList){ this.setState({_backups:(await window.galaxy.backupList())||[]}); } }catch(e){ this.toast('✕ yedekler okunamadı','err'); } }
  async _restoreBackup(name){ try{ await window.galaxy.backupRestore(name); this.setState({backupsOpen:false}); await this._loadReal(); this.toast('✓ yedek geri yüklendi'); }catch(e){ this.toast('✕ yedek geri yüklenemedi','err'); } }
  // ---------- AJAN CRUD ----------
  _formVal(e){ return (e&&e.target&&e.target.value!=null)?e.target.value:(typeof e==='string'?e:''); }
  openAgentAdd(){ this.setState({agentFormOpen:true,agentForm:{id:'',name:'',role:'',prompt:'',color:'#61dcff',p1:'Durum ver',p2:'Ne birikti?',p3:'Sıradaki iş'}}); }
  openAgentEdit(id){ const a=this.AGENTS.find(x=>x.id===(id||this.state.asstAgentId||this.state.agentId)); if(!a) return;
    const defs=this._agentPresetDefaults(a);
    const p=a.presets||[];
    this.setState({agentFormOpen:true,agentForm:{
      id:a.id, name:a.name||'', role:a.role||'', color:a.color||'#61dcff',
      prompt:this._asText(a.sys||a.prompt),
      p1:this._asText((p[0]&&p[0].ask)||defs[0]||''),
      p2:this._asText((p[1]&&p[1].ask)||defs[1]||''),
      p3:this._asText((p[2]&&p[2].ask)||defs[2]||'')
    }}); }
  agentFormSet(k,v){ this.setState({agentForm:Object.assign({},this.state.agentForm,{[k]:v})}); }
  async saveAgentForm(){ const f=this.state.agentForm||{}; if(!String(f.name||'').trim()){ this.toast('ajan adı yaz','err'); return; }
    const prev=this.AGENTS.find(x=>x.id===f.id)||{};
    const presets=[f.p1,f.p2,f.p3].map(x=>this._asText(x).trim()).filter(Boolean).map(x=>({label:x.slice(0,48),ask:x}));
    try{
      if(window.galaxy&&window.galaxy.agentSave){
        const r=await window.galaxy.agentSave({
          id:f.id||undefined, name:String(f.name).trim().slice(0,40),
          role:String(f.role||prev.role||'Ajan').trim().slice(0,40),
          color:f.color||prev.color||'#61dcff',
          prompt:this._asText(f.prompt), write:!!prev.write, presets
        });
        if(r&&r.ok){ this.toast('✓ ajan kaydedildi'); this.setState({agentFormOpen:false}); await this._loadReal(); }
        else this.toast('✕ '+((r&&r.error)||'kayıt yok'),'err');
      }
    }catch(e){ this.toast('✕ ajan kaydı','err'); } }
  async _agentDelete(id){ try{ if(window.galaxy.agentDelete){ await window.galaxy.agentDelete(id||this.state.asstAgentId||this.state.agentId); this.toast('✓ ajan silindi'); this.setState({agentId:null,asstAgentId:null,agentFormOpen:false}); await this._loadReal(); } }catch(e){ this.toast('✕ ajan silinemedi','err'); } }
  // ---------- ZAMANLAYICI ----------
  async _schedRun(id){ this.setState({_schResult:'⏳ çalışıyor…'}); try{ const r=await window.galaxy.scheduleRun(id); this.setState({_schResult:(r&&r.ok)?('✓ Çalıştı:\n\n'+(r.out||'(çıktı yok)')):('✕ '+((r&&r.error)||'hata'))}); }catch(e){ this.setState({_schResult:'✕ hata'}); } }
  schFormSet(k,v){ this.setState({schForm:Object.assign({},this.state.schForm,{[k]:v})}); }
  async saveSchedule(){ const f=this.state.schForm; if(!f.name||!f.prompt){ this.setState({_schResult:'✕ Ad ve görev metni gerekli'}); return; }
    const agentId=f.agentId||((this.AGENTS[0]&&this.AGENTS[0].id)||'cto');
    try{ if(window.galaxy.scheduleSave){ const r=await window.galaxy.scheduleSave({name:f.name,prompt:f.prompt,agentId,type:f.type,weekday:f.weekday,hour:f.hour,minute:f.minute,enabled:true});
      if(r&&r.ok){ this.setState({schAddOpen:false,_schResult:'',schForm:{name:'',prompt:'',agentId:'',type:'weekly',weekday:'1',hour:'9',minute:'0'},_sched:(await window.galaxy.scheduleList())||[]}); }
      else this.setState({_schResult:'✕ '+((r&&r.error)||'kaydedilemedi')}); } }catch(e){ this.setState({_schResult:'✕ hata'}); } }
  _onScheduleDone(m){ if(!m) return; this.setState({_schResult:'✓ "'+(m.name||'görev')+'" çalıştı → '+(m.file||'')+(m.error?(' · hata: '+m.error):'')}); try{ this.toast(m.error?('✕ "'+(m.name||'görev')+'" hata: '+m.error):('✓ "'+(m.name||'görev')+'" çalıştı — rapor hazır')); }catch(e){} try{ window.galaxy.scheduleList().then(s=>this.setState({_sched:s||[]})); }catch(e){} this._loadReports(); }
  // Ajan kota / auth / düz metin yanıtını SQL sanma — yalnızca gerçek sorgu göster/çalıştır.
  _sqlLooks(s){ const t=String(s||'').trim(); if(!t||t.length>20000) return false;
    if(/session limit|rate limit|quota|you've hit|you have hit|not logged in|unauthorized|overloaded/i.test(t)) return false;
    return /^(with|select|insert|update|delete|replace|merge|create|drop|alter|truncate|explain|analyze|show|describe|desc|pragma|call|do|begin|values)\b/i.test(t)
      || /^\(\s*select\b/i.test(t); }
  // ---------- DB SORGU ----------
  async runDbQuery(){ if(!window.galaxy) return; const sql=String(this.state.dbSql||'').trim(); if(!sql||!this.state.dbSel) return;
    // dbExec: SELECT + yazma (INSERT/UPDATE/DELETE) çalıştırır ve audit log'a yazar. Yazma → önce onay.
    const fn=(window.galaxy.dbExec||window.galaxy.dbQuery);
    try{ const r=await fn({id:this.state.dbSel,database:this.state.dbDatabase,sql});
      if(r&&r.needConfirm){ this.setState({_dbConfirm:{sql:r.sql,danger:!!r.danger}});
        this.askConfirm(r.danger?'Yıkıcı işlem — emin misin?':'Bu işlem veriyi değiştirecek.', ()=>this.confirmDbWrite(),
          {title:'Veritabanı yazma', detail:r.sql, okLabel:'Onayla ve çalıştır', kind:r.danger?'danger':'warn'}); return; }
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
      if(r&&r.needConfirm && this._sqlLooks(r.sql)){ this.setState({_dbConfirm:{sql:r.sql,danger:!!r.danger,request:r.request},_dbresult:{sql:r.sql,fields:[],rows:[]}});
        this.askConfirm(r.danger?'Yıkıcı işlem — emin misin?':'Bu işlem veriyi değiştirecek.', ()=>this.confirmDbWrite(),
          {title:'Veritabanı yazma', detail:r.sql, okLabel:'Onayla ve çalıştır', kind:r.danger?'danger':'warn'}); return; }
      const sql=this._sqlLooks(r&&r.sql)?r.sql:'';
      this.setState({_dbresult:(r&&r.ok)?Object.assign({},r,{sql}):{error:(r&&r.error)||'ajan hatası',sql,fields:[],rows:[]}}); this._loadDbLog();
    }catch(e){ this.setState({dbAgentBusy:false,_dbresult:{error:'ajan hatası',fields:[],rows:[]}}); } }
  async _schedDelete(id){ try{ await window.galaxy.scheduleDelete(id); this.toast('✓ görev silindi'); this.setState({_sched:(await window.galaxy.scheduleList())||[]}); }catch(e){} }
  async _schedToggle(s){
    if(!s||!s.id||!window.galaxy||!window.galaxy.scheduleSave) return;
    const next=!s.on;
    try{
      const payload=Object.assign({}, s.raw||{}, {id:s.id, enabled:next, on:next});
      const r=await window.galaxy.scheduleSave(payload);
      if(r&&r.ok===false) this.toast('✕ '+((r&&r.error)||'güncellenemedi'),'err');
      else this.setState({_sched:(await window.galaxy.scheduleList())||[]});
    }catch(e){}
  }
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
  dbFormSetType(t,port){ this.setState({dbForm:Object.assign({},this.state.dbForm,{type:t,port})}); }
  async dbTestConn(){ this.setState({_dbtest:'test ediliyor…'}); try{ const r=await window.galaxy.dbTest(this.state.dbForm); this.setState({_dbtest:(r&&r.ok)?'✓ bağlantı başarılı':('✕ '+((r&&r.error)||'başarısız'))}); }catch(e){ this.setState({_dbtest:'✕ hata'}); } }
  async dbSaveConn(){ try{ const p=this._ctxPlanet(); const form=Object.assign({},this.state.dbForm); if(p&&p.id) form.projectId=p.id; const r=await window.galaxy.dbSave(form); if(r&&r.ok){ this.setState({dbAddOpen:false,_dbtest:'',dbForm:{name:'',type:'postgres',host:'localhost',port:'5432',database:'',user:'',password:'',file:''}}); await this._loadDb(); if(r.id) this.dbSelectConn(r.id); this._loadPlanetWork(); } else this.setState({_dbtest:'✕ '+((r&&r.error)||'kaydedilemedi')}); }catch(e){ this.setState({_dbtest:'✕ hata'}); } }
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
