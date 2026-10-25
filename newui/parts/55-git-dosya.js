  // --- Git aksiyonları ---
  async _gitDo(promise,okMsg){ this.setState({_gitBusy:true,_gitActionMsg:''});
    try{ const r=await promise; const ok=!!(r&&r.ok); const msg=ok?(okMsg||''):('✕ '+((r&&r.error)||'hata'));
      this.setState({_gitBusy:false,_gitActionMsg:msg});
      if(ok&&okMsg) this.toast(okMsg); else if(!ok) this.toast(msg,'err');
      await this._loadGit(); return r; }
    catch(e){ this.setState({_gitBusy:false,_gitActionMsg:'✕ hata'}); this.toast('✕ hata','err'); return {ok:false}; } }
  gitStage(file){ const p=this.sel; if(p&&p.id) this._gitDo(window.galaxy.gitStage({projectId:p.id,file})); }
  gitUnstage(file){ const p=this.sel; if(p&&p.id) this._gitDo(window.galaxy.gitUnstage({projectId:p.id,file})); }
  gitStageAll(){ const p=this.sel; if(p&&p.id) return this._gitDo(window.galaxy.gitStage({projectId:p.id})); return Promise.resolve({ok:false}); }
  async gitCommit(){ const p=this.sel; const g=this.state._git||{}; const hasStaged=(g.staged>0||(g.files||[]).some(f=>f.staged)); const msg=String(this.state.gitMsg||'').trim()||this._suggestCommitMsg(); if(!p||!p.id||!msg){ this.toast('commit mesajı yaz','err'); return; }
    if(!hasStaged){ this.toast('Önce commit edilecek dosyaları seç','err'); return; }
    this.askConfirm('Commit: '+msg, async ()=>{
      this.setState({gitMsg:msg});
      const r=await this._gitDo(window.galaxy.gitCommit({projectId:p.id,message:msg}),'✓ commit yapıldı');
      if(r&&r.ok){ this.setState({gitMsg:''}); this._logActivity('CREATE_COMMIT', (p.name||'proje')+': '+msg); this._loadPlanetWork(); }
    }, {title:'Commit', detail:(this.state._git&&this.state._git.dirty)?(this.state._git.dirty+' dosya kaydedilecek.'):'Sahnedeki değişiklikler commit olur. Push ayrıdır.', okLabel:'Commit', kind:'warn'}); }
  _suggestCommitMsg(){
    const g=this.state._git||{}; const files=(g.files||g.changed||[]).map(f=>f.path||f.file||f).filter(Boolean);
    const names=files.map(f=>String(f).split('/').pop()).slice(0,4);
    if(names.length===1) return 'update '+names[0];
    if(names.length>1) return 'update '+names.slice(0,2).join(', ')+(names.length>2?'…':'');
    const dirty=g.dirty||0;
    return dirty?('wip: '+dirty+' dosya'):'update';
  }
  async gitQuickCommit(){
    const p=this.sel; if(!p||!p.id) return;
    const g=this.state._git||{};
    if(!(g.dirty>0)){ this.toast('commit bekleyen değişiklik yok'); return; }
    if(!(g.staged>0||(g.files||[]).some(f=>f.staged))){
      this.setState({gitCenter:'durum',leftTab:'git',gitMsg:String(this.state.gitMsg||'').trim()||this._suggestCommitMsg()});
      this.toast('Önce commit edilecek dosyaları seç','err');
      return;
    }
    const msg=String(this.state.gitMsg||'').trim()||this._suggestCommitMsg();
    this.setState({gitMsg:msg, leftTab:'git', gitCenter:'durum'});
    this.gitCommit();
  }
  gitPush(){ const p=this.sel; if(!p||!p.id) return; const g=this.state._git||{}; const ahead=g.ahead||0; const br=g.branch||p.branch||'dal';
    this.askConfirm('"'+br+'" dalı uzağa gönderilsin mi?', async ()=>{
      const r=await this._gitDo(window.galaxy.gitPush({projectId:p.id}), '✓ '+br+' ← '+(ahead||1)+' commit');
      if(r&&r.ok) this._logActivity('PUSH', (p.name||'proje')+' · '+br+' ← '+(ahead||1)+' commit');
    }, {title:'Push', detail:ahead?(ahead+' commit gönderilecek.'):'Uzakla senkronla.', okLabel:'Push', kind:'warn'}); }
  gitPull(){ const p=this.sel; if(!p||!p.id) return; const g=this.state._git||{}; const behind=g.behind||0; const br=g.branch||p.branch||'dal';
    this._gitDo(window.galaxy.gitPull({projectId:p.id}), behind?('✓ '+br+' → '+behind+' commit'):'✓ pull edildi'); }
  async gitInit(){ const p=this.sel; if(!p||!p.id||!window.galaxy||!window.galaxy.gitInit){ this.toast('✕ git init bu ortamda yok','err'); return; }
    const r=await this._gitDo(window.galaxy.gitInit({projectId:p.id,path:p._path}),'✓ git deposu başlatıldı'); if(r&&r.ok) this._loadReal(); }
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
  _diffLines(text){ return String(text||'').split('\n').slice(0,2000).map(l=>{ let c='#9aa3c2';
    if(/^\+\+\+|^---/.test(l)) c='#9aa3c2'; else if(l[0]==='+') c='#55e88b'; else if(l[0]==='-') c='#ff6b7a'; else if(/^@@/.test(l)) c='#61dcff'; else if(/^diff |^index /.test(l)) c='#9aa3c2';
    return {t:l||' ',style:`color:${c};white-space:pre;font-family:'JetBrains Mono',monospace;font-size:12px;line-height:1.5`}; }); }
  async _loadGit(){
    const p=this.sel; if(!p) return;
    // Seçili projenin git durumu + gerçek dosya ağacı (gezegen detayındaki yörünge)
    try{ if(window.galaxy&&window.galaxy.gitLog){ const g=await window.galaxy.gitLog(p.id); this.setState({_git:(g&&g.ok)?g:null}); } }catch(e){ this.setState({_git:null}); }
    try{ if(window.galaxy&&window.galaxy.tree&&p._path){ const t=await window.galaxy.tree(p._path); if(Array.isArray(t)&&t.length) this._applyFiles(t); } }catch(e){}
    try{ if(window.galaxy&&window.galaxy.readme&&p._path){ const r=await window.galaxy.readme(p._path); this.setState({_readme:(r&&r.content)?r:null}); } else this.setState({_readme:null}); }catch(e){ this.setState({_readme:null}); }
    if(this._readmeSyncOn()) this._autoPlanFromReadme();
    this._loadPlanetWork();
  }
  _ctxPlanet(){
    const st=this.state||{};
    if(st.mode==='planet'||st.holdPlanet) return this.sel;
    return null;
  }
  _scopePlanetOn(){
    try{ if(this.state.scopePlanet===false) return false; }catch(e){}
    try{ return localStorage.getItem('gxScopePlanet')!=='0'; }catch(e){ return true; }
  }
  setScopePlanet(on){
    const v=!!on; try{ localStorage.setItem('gxScopePlanet', v?'1':'0'); }catch(e){}
    this.setState({scopePlanet:v});
  }
  async _loadPlanetWork(){
    const p=this._ctxPlanet();
    if(!p||!p.id||!(window.galaxy&&window.galaxy.planetContext)){ this.setState({_pw:null,_prs:[],_issues:[],_ci:[]}); return; }
    try{
      const r=await window.galaxy.planetContext(p.id);
      this.setState({_pw:(r&&r.ok)?r:null});
      if(r&&r.ok&&!r.remote&&window.galaxy.planetPrs){
        try{ const pr=await window.galaxy.planetPrs({projectId:p.id}); this.setState({_prs:(pr&&pr.ok)?(pr.prs||[]):[]}); }catch(e){ this.setState({_prs:[]}); }
        this._loadPlanetIssues(); this._loadPlanetCi();
      } else this.setState({_prs:[],_issues:[],_ci:[]});
    }catch(e){ this.setState({_pw:null,_prs:null}); }
  }
  async _bindPlanetDb(){
    const p=this._ctxPlanet(); if(!p||!p.id||!(window.galaxy&&window.galaxy.planetBindDb)) return;
    try{
      const r=await window.galaxy.planetBindDb({projectId:p.id});
      if(r&&r.ok){ this.toast('✓ '+((r.name)||'DB')+' bağlandı'); await this._loadDb(); if(r.id) this.dbSelectConn(r.id); this._openTab('db'); this._loadPlanetWork(); }
      else this.toast('✕ '+((r&&r.error)||'DB bağlanamadı'),'err');
    }catch(e){ this.toast('✕ DB bağlanamadı','err'); }
  }
  _planetCompose(action){
    if(action==='down'){
      const name=(this.state._pw&&this.state._pw.compose&&this.state._pw.compose.project)||'compose';
      this.askConfirm(name+' durdurulsun mu? Konteynerler iner.', ()=>this._planetComposeNow('down'), {title:'Compose down', detail:'Çalışan servisler kapanır. Diskteki dosyalara dokunulmaz.', okLabel:'Durdur', kind:'warn'});
      return;
    }
    return this._planetComposeNow(action);
  }
  async _planetComposeNow(action){
    const p=this._ctxPlanet(); if(!p||!p.id||!(window.galaxy&&window.galaxy.planetCompose)) return;
    if(p._remote){ this.toast('Uzak gezegende compose yok','err'); return; }
    try{
      const r=await window.galaxy.planetCompose({projectId:p.id,action});
      if(r&&r.ok===false) this.toast('✕ '+((r.error)||'compose'),'err');
      else {
        this.toast(action==='up'?'✓ compose up':(action==='down'?'✓ compose down':'✓ compose'));
        if(action==='logs'&&r.logs){ this._dlogLines=String(r.logs).split('\n'); this.setState({_dlog:{kind:'container',id:'compose',name:'compose',tab:'logs',up:true,fields:[]},_dlv:(this.state._dlv||0)+1}); }
      }
      this._loadDocker(); this._loadPlanetWork();
    }catch(e){ this.toast('✕ compose hatası','err'); }
  }
  async _openPlanetPort(port){
    const n=parseInt(port,10); if(!(n>=1&&n<=65535)) return;
    try{
      let listening=true;
      if(window.galaxy&&window.galaxy.probePort){ const r=await window.galaxy.probePort(n); listening=!!(r&&r.listening); }
      if(listening){ this.openLocalPort(n); return; }
      this.toast(':'+n+' dinlemiyor — Docker log');
      this._openTab('docker');
      const pw=this.state._pw; const proj=(pw&&pw.compose&&pw.compose.project)||'';
      const cts=(this.state._docker||[]).filter(c=>!proj||String(c.compose||'').toLowerCase()===String(proj).toLowerCase());
      const hit=cts[0];
      if(hit) this.dockerOpenLog(hit.id||hit.name, hit.name);
    }catch(e){ this.openLocalPort(n); }
  }
  _runPlanetScript(s){
    if(!s||!s.cmd) return;
    const p=this.sel; if(!p||!p._path){ this.toast('Önce gezegene in','err'); return; }
    if(p._remote){ this.toast('Uzak gezegende script yok','err'); return; }
    const cmd=s.kind==='npm'?('npm run '+s.name):s.cmd;
    this.setState({consoleTab:'bash', consoleCollapsed:false, consoleInput:cmd});
    this._focusConsole();
    setTimeout(()=>{ try{ this.sendConsole(cmd); }catch(e){} }, 50);
  }
  async _planetPrCreate(){
    const p=this._ctxPlanet(); if(!p||!p.id||!(window.galaxy&&window.galaxy.planetPrCreate)) return;
    try{
      const r=await window.galaxy.planetPrCreate({projectId:p.id});
      if(r&&r.ok){ this.toast('✓ PR açıldı'); this._loadPlanetWork(); }
      else { const msg=this._friendlyFail(r,'gh auth login','github'); this.toast('✕ '+msg,'err'); }
    }catch(e){ this._friendlyFail({error:'PR açılamadı'},'PR açılamadı','github'); this.toast('✕ PR açılamadı','err'); }
  }
  _tourDismiss(){ try{ localStorage.setItem('gxTourDone','1'); }catch(e){} this.setState({_tourTick:(this.state._tourTick||0)+1}); }
  _tourShow(){ try{ return localStorage.getItem('gxTourDone')!=='1'; }catch(e){ return false; } }
  _setAsstAgent(id){ this.setState({asstAgentId:id||null, agentId:null}); }
  _openAsstVoice(id){ const a=(this.AGENTS||[]).find(x=>x.id===id); if(a) a.badge=0; this._setAsstAgent(id); this._asstOpen(); this.setState({asstOpen:true, agentId:null}); }
  _stampAgentPulse(busy){ const aid=this.state.asstAgentId; if(!aid) return; const ag=(this.AGENTS||[]).find(a=>a.id===aid); if(ag) ag.lastRunAt=Date.now(); this.setState({_agentBusy:!!busy}); }
  _captainWho(){ const p=this._profile||{}; return { name:String(p.name||'').trim(), about:String(p.about||p.bio||'').trim() }; }
  _readmeSyncOn(){ try{ return localStorage.getItem('gxPlanSyncReadme')==='1'; }catch(e){ return false; } }
  _toggleReadmeSync(){ const on=!this._readmeSyncOn(); try{ localStorage.setItem('gxPlanSyncReadme', on?'1':'0'); }catch(e){} this.setState({_nv:(this.state._nv||0)+1}); }
  _readmeFromTodo(text, done, pid){ const raw=this._rawProj(pid); const mapped=this._planetOf(pid||(raw&&raw.id)); const t=String(text||'').trim(); if(!t) return;
    if(raw){ raw.plan=raw.plan||[]; const i=raw.plan.findIndex(it=>String(Array.isArray(it)?it[0]:(it.text||'')).trim()===t);
      if(i>=0){ const it=raw.plan[i]; if(Array.isArray(it)) it[1]=!!done; else it.done=!!done; } else raw.plan.push([t,!!done]);
      this._saveRaw(raw, (mapped&&mapped._path)||raw.path); if(mapped) mapped.plan=this._mapPlan?this._mapPlan(raw.plan):raw.plan; }
    this._patchReadmeCheckbox(t, {done:!!done, projectId:(raw&&raw.id)||pid}); this.setState({_nv:(this.state._nv||0)+1}); }
  _readmeDropTodo(text, pid){ const raw=this._rawProj(pid); const mapped=this._planetOf(pid||(raw&&raw.id)); const t=String(text||'').trim(); if(!t) return;
    if(raw){ raw.plan=(raw.plan||[]).filter(it=>String(Array.isArray(it)?it[0]:(it.text||'')).trim()!==t); this._saveRaw(raw, (mapped&&mapped._path)||raw.path); if(mapped) mapped.plan=this._mapPlan?this._mapPlan(raw.plan):raw.plan; }
    this._patchReadmeCheckbox(t, {drop:true, projectId:(raw&&raw.id)||pid}); this.setState({_nv:(this.state._nv||0)+1}); }
  async _patchReadmeCheckbox(text, opts){
    opts=opts||{}; const t=String(text||'').trim();
    const mapped=this._planetOf(opts.projectId); const raw=this._rawProj(opts.projectId);
    const p=mapped||(!opts.projectId&&this.sel)||null;
    const root=(p&&p._path)||(raw&&raw.path)||'';
    const remote=!!(p&&p._remote)||!!(raw&&raw.remote);
    if(!root||remote||!t||!(window.galaxy&&window.galaxy.readme&&window.galaxy.fileWrite)) return;
    try{
      const r=await window.galaxy.readme(root); if(!r||!r.name) return;
      let content=String(r.content||''); const esc=t.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
      const re=new RegExp('^([ \\t]*[-*]\\s+)\\[[ xX]\\]\\s+'+esc+'\\s*$','m');
      if(opts.drop){ if(!re.test(content)) return; content=content.replace(re,'').replace(/\n{3,}/g,'\n\n'); }
      else {
        const mark=opts.done?'x':' ';
        if(re.test(content)) content=content.replace(re,'$1['+mark+'] '+t);
        else {
          const line='- ['+mark+'] '+t;
          if(/##\s*Yapılacaklar/i.test(content)) content=content.replace(/(##\s*Yapılacaklar[^\n]*\n)/i,'$1\n'+line+'\n');
          else content=content.replace(/\s*$/,'\n\n## Yapılacaklar\n\n'+line+'\n');
        }
      }
      const wr=await window.galaxy.fileWrite({root, rel:r.name, content});
      const sel=this.sel;
      if(wr&&wr.ok!==false && sel && (sel._path===root || sel.id===(opts.projectId||(p&&p.id)||(raw&&raw.id)))) this.setState({_readme:{name:r.name, content}});
    }catch(e){}
  }
  onPlanetTodoInput(e){ this.setState({planetTodoInput:(e&&e.target&&e.target.value)||''}); }
  onPlanetTodoKey(e){ if(e.key==='Enter'){ e.preventDefault&&e.preventDefault(); this.addPlanetTodo(); } }
  async addPlanetTodo(){ const text=String(this.state.planetTodoInput||'').trim(); if(!text) return; this.setState({planetTodoInput:''});
    try{ if(window.galaxy.todoAdd){ const p=this.sel; await window.galaxy.todoAdd({universe:this.state.uniId,text,status:'todo',projectId:p&&p.id,branch:(this.state._git&&this.state._git.branch)||(p&&p.branch)||''}); this._loadTodos(); if(this._readmeSyncOn()) this._readmeFromTodo(text,false, p&&p.id); } }catch(e){ this.toast('✕ görev eklenemedi','err'); } }
  closeMailCompose(){ this.setState({mailPane:'inbox'}); }
  async _loadUniverseTraffic(){ try{ if(window.galaxy&&window.galaxy.universeTraffic){ const r=await window.galaxy.universeTraffic(); this.setState({_traffic:(r&&r.rows)||[]}); } }catch(e){} }
  async _loadPlanetIssues(){ const p=this.sel; if(!p||!p.id||!window.galaxy||!window.galaxy.planetIssues) return;
    try{ const r=await window.galaxy.planetIssues({projectId:p.id}); this.setState({_issues:(r&&r.issues)||[]}); }catch(e){ this.setState({_issues:[]}); } }
  async _loadPlanetCi(){ const p=this.sel; if(!p||!p.id||!window.galaxy||!window.galaxy.planetCi) return;
    try{ const r=await window.galaxy.planetCi({projectId:p.id}); this.setState({_ci:(r&&r.runs)||[]}); }catch(e){ this.setState({_ci:[]}); } }
  _noteTestPulse(m, pid){ const last=this._lastBashCmd; if(!last||!/\b(test|typecheck|vitest|jest|pytest|mocha|playwright)\b/i.test(last.cmd||'')) return;
    const rec={at:Date.now(), cmd:last.cmd, code:m&&m.code, projectId:pid||last.pid, name:(this.sel&&this.sel.name)||''};
    this._testPulse=rec; try{ localStorage.setItem('gxTestPulse', JSON.stringify(rec)); }catch(e){} this.setState({_nv:(this.state._nv||0)+1}); }
  _readTestPulse(){ if(this._testPulse) return this._testPulse; try{ const j=JSON.parse(localStorage.getItem('gxTestPulse')||'null'); if(j&&j.at) this._testPulse=j; }catch(e){} return this._testPulse||null; }
  onGrepUniInput(e){ this.setState({grepUniQuery:(e&&e.target&&e.target.value)||''}); }
  onGrepUniKey(e){ if(e.key==='Enter'){ e.preventDefault&&e.preventDefault(); this._openUniverseGrep(this.state.grepUniQuery); } }
  async _openUniverseGrep(q){ const query=String(q!=null?q:(this.state.grepUniQuery||this.state.query||'')).trim();
    this.setState({palette:false,query:'',_grepUniOpen:true,grepUniQuery:query,_grepUni:[],_grepUniBusy:query.length>=2,grepStatus:query.length>=2?('“'+query+'” taranıyor…'):'en az 2 karakter yaz, Enter'});
    setTimeout(()=>{ try{ const el=document.getElementById('gx-grep-uni'); if(el) el.focus(); }catch(e){} },80);
    if(query.length<2||!window.galaxy||!window.galaxy.universeGrep){ this.setState({_grepUniBusy:false}); return; }
    try{ const r=await window.galaxy.universeGrep({query}); this.setState({_grepUniBusy:false,_grepUni:(r&&r.matches)||[],grepStatus:((r&&r.matches)||[]).length?(r.matches.length+' eşleşme'):'eşleşme yok'}); }
    catch(e){ this.setState({_grepUniBusy:false,_grepUni:[],grepStatus:'taranamadı'}); } }
  closeUniverseGrep(){ this.setState({_grepUniOpen:false}); }
  _applyFiles(nodes){
    this._treeNodes=nodes;
    this._rebuildPlanets();
  }
  // _fsCwd altındaki node listesini bul (planet drill-in için)
  _childrenAt(cwd){ let list=this._treeNodes||[]; if(!cwd) return list;
    for(const seg of cwd.split('/')){ const d=(list||[]).find(n=>n.dir&&n.name===seg); list=(d&&d.children)||[]; } return list; }
  _rebuildPlanets(){
    const kindOf=n=>{
      const l=String(n).toLowerCase();
      if(/\/$/.test(l)||!/\./.test(l)) return 'dir';
      if(/\.md$/.test(l)||/\.(txt|rtf|doc|docx|pdf)$/.test(l)) return 'doc';
      if(/\.(js|ts|jsx|tsx|py|swift|kt|java|go|rs|rb|php|c|cpp|h|cs|vue|svelte)$/.test(l)) return 'code';
      if(/\.(png|jpe?g|svg|gif|webp|ico|bmp)$/.test(l)) return 'img';
      if(/\.(json|ya?ml|toml|env|lock|cfg|ini)$/.test(l)) return 'cfg';
      return 'other';
    };
    const col=k=>({dir:'#7aa2ff',doc:'#ffc861',code:'#4fe0ff',img:'#ff8ec8',cfg:'#55e88b',other:'#c77bff'}[k]||'#c77bff');
    const cwd=this.state._fsCwd||''; const nodes=this._childrenAt(cwd);
    const top=nodes.slice(0,14), N=top.length||1; const base=(this.sel&&this.sel._path)||'';
    const iso=this._isoSplit(N); const CX=50, CY=50;
    this.FILES=[]; let cursor=0;
    for(let r=0;r<iso.rx.length;r++){
      const slice=top.slice(cursor, cursor+iso.caps[r]); cursor+=iso.caps[r];
      const m=slice.length||1, rx=Math.min(36, 20+r*11), ry=rx*0.48, spin=r*0.55;
      slice.forEach((c,i)=>{
        const a=(i/m)*Math.PI*2 - Math.PI/2 + spin; const depth=(Math.sin(a)+1)/2;
        const rel=cwd?(cwd+'/'+c.name):c.name;
        const kind=c.dir?'dir':kindOf(c.name);
        const s=Math.round((c.dir?54:40)*(0.82+depth*0.4));
        this.FILES.push({ name:c.name+(c.dir?'/':''), c:col(kind), kind,
          x:Math.round(CX+Math.cos(a)*rx), y:Math.round(CY+Math.sin(a)*ry),
          s, glow:/readme/i.test(c.name), _path:base?(base+'/'+rel):'', _rel:rel, _dir:!!c.dir, _z:3+Math.round(depth*8) });
      });
    }
    this.setState({_fv:(this.state._fv||0)+1});
  }
  // Tıklama: klasörse drill-in (gezegen görünümü), dosyaysa app-içi önizleme
  _openFsNode(rel,dir){ if(dir){ this.setState({_fsCwd:rel},()=>this._rebuildPlanets()); } else { this._openFilePreview(rel); } }
  _openFilePreview(rel){ this.setOrbitView(false); this.openPreview(rel); }
  _fsUp(){ const cwd=this.state._fsCwd||''; if(!cwd) return; const parent=cwd.split('/').slice(0,-1).join('/'); this.setState({_fsCwd:parent},()=>this._rebuildPlanets()); }
  // Kaydedilmemiş değişiklik varken başka dosyaya/projeye geçişi onaya bağla
  _editDirty(){ return !!(this.state._editMode && this.state._preview && String(this.state._editContent||'')!==String(this.state._preview.content||'')); }
  _guardDirty(fn){
    if(!this._editDirty()){ fn(); return; }
    this.askConfirm('Kaydedilmemiş değişiklikler var. Kaydetmeden geçilsin mi?', ()=>{ this.setState({_editMode:false,_editContent:'',_editMsg:''}); fn(); }, {title:'Kaydedilmemiş değişiklik', okLabel:'Kaydetmeden geç', kind:'warn'});
  }
  _addFileTab(rel){
    if(!rel) return;
    const tabs=(this.state.fileTabs||[]).slice();
    if(!tabs.some(t=>t.rel===rel)) tabs.push({rel, name:rel.split('/').pop()});
    const next=tabs.slice(-10);
    this.setState({fileTabs:next});
    this._wsSaveTabs(next);
  }
  _wsSaveTabs(tabs){
    const pid=this.sel&&this.sel.id; if(!pid) return;
    try{ localStorage.setItem('gxWs::'+pid, JSON.stringify({tabs:(tabs||[]).map(t=>t.rel), at:Date.now()})); }catch(e){}
  }
  _wsRestoreTabs(pid){
    if(!pid) return [];
    try{ const r=JSON.parse(localStorage.getItem('gxWs::'+pid)||'null'); if(r&&Array.isArray(r.tabs)) return r.tabs.slice(-10).map(rel=>({rel, name:String(rel).split('/').pop()})); }catch(e){}
    return [];
  }
  closeFileTab(rel){
    const doClose=()=>{
      const tabs=(this.state.fileTabs||[]).filter(t=>t.rel!==rel);
      const isActive=this.state._preview&&this.state._preview.rel===rel;
      this.setState({fileTabs:tabs});
      this._wsSaveTabs(tabs);
      if(isActive){
        this._cmDestroy();
        const next=tabs[tabs.length-1];
        if(next) this.openPreview(next.rel);
        else this.setState({_preview:null,_editMode:false,_editContent:'',_editMsg:''});
      }
    };
    if(this.state._preview&&this.state._preview.rel===rel) this._guardDirty(doClose); else doClose();
  }
  // R8) Bölünmüş editör: ikinci dosyayı salt-okunur yan panele yükle
  async openSplitWith(rel){
    const root=(this.sel&&this.sel._path)||''; if(!root||!rel) return;
    try{ const f=await window.galaxy.file(root,rel); if(f) this.setState({splitEditor:true, _preview2:Object.assign({rel},f)}); }catch(e){}
  }
  // R8) Sekme sıralama (sürükle-bırak + ok düğmeleri)
  moveFileTab(rel, dir){
    const tabs=(this.state.fileTabs||[]).slice(); const i=tabs.findIndex(t=>t.rel===rel); if(i<0) return;
    const j=i+dir; if(j<0||j>=tabs.length) return;
    const tmp=tabs[i]; tabs[i]=tabs[j]; tabs[j]=tmp;
    this.setState({fileTabs:tabs}); this._wsSaveTabs(tabs);
  }
  async openPreview(rel, force){
    const root=(this.sel&&this.sel._path)||''; if(!root||!rel) return;
    if(!force && this.state._preview&&this.state._preview.rel===rel&&!this.state._editMode) return;
    const load=async()=>{
      this._cmDestroy(); this._pvChangedSet=null;
      this.setState({_prevLoading:true,_preview:{name:rel.split('/').pop(),rel,kind:'loading'},_editMode:false,_editMsg:'',pvFind:''});
      try{ const f=await window.galaxy.file(root,rel);
        if(!f){ this.setState({_prevLoading:false,_preview:{name:rel.split('/').pop(),rel,kind:'error'}}); return; }
        this.setState({_prevLoading:false,_preview:Object.assign({rel},f)});
        this._addFileTab(rel);
        this._sessWrite({ lastFile:rel, lastFileName:(f&&f.name)||rel.split('/').pop(), selId:this.sel&&this.sel.id });
        // Değişen satır işaretleri (git diff) — arka planda
        if(window.galaxy&&window.galaxy.gitDiff&&this.sel&&this.sel.id&&this._isCodePreview(this.state._preview)){
          try{ const dr=await window.galaxy.gitDiff({projectId:this.sel.id,file:rel,staged:false});
            if(this.state._preview&&this.state._preview.rel===rel&&dr&&dr.ok){ this._pvChangedSet=this._parseChangedLines(dr.out||dr.content||''); this.setState({_pvChg:(this.state._pvChg||0)+1}); }
          }catch(e){}
        }
      }catch(e){ this.setState({_prevLoading:false,_preview:{name:rel.split('/').pop(),rel,kind:'error'}}); }
    };
    if(force) load(); else this._guardDirty(load);
  }
  reloadPreview(){ const p=this.state._preview; if(p&&p.rel) this.openPreview(p.rel, true); }
  closePreview(){ this._guardDirty(()=>{ this._cmDestroy(); this.setState({_preview:null,_editMode:false,_editContent:'',_editMsg:'',_history:null,_blame:null,_histShow:null,histBusy:false}); }); }
  closeHistory(){ this.setState({_history:null,_blame:null,_histShow:null,histBusy:false}); }
  openPreviewExternal(){ const p=this.state._preview; if(p&&p.path&&window.galaxy.openFile){ try{ window.galaxy.openFile(p.path); }catch(e){} } }
  _isCodePreview(p){
    if(!p||p.kind!=='text') return false;
    return /\.(js|jsx|mjs|cjs|ts|tsx|py|swift|kt|kts|java|go|rs|rb|php|c|cc|cpp|cxx|h|hpp|cs|vue|svelte|css|scss|less|sh|bash|zsh|sql|json|ya?ml|toml|xml|env|ini|cfg|gradle|properties)$/i.test(String(p.name||p.rel||'')) || /^(Dockerfile|Makefile|\.gitignore|\.env.*)$/i.test(String(p.name||''));
  }
  _codeKwRe(){ return /^(abstract|async|await|break|case|catch|class|const|continue|def|default|elif|else|enum|export|extends|false|finally|for|from|func|function|guard|if|import|in|interface|let|new|nil|None|null|override|pass|private|public|return|self|static|struct|switch|this|throw|true|try|typeof|var|void|while|with|yield)$/; }
  _codeViewLines(text){
    const kw=this._codeKwRe(); const chg=this._pvChangedSet||null;
    return String(text||'').split('\n').slice(0,2000).map((line,i)=>{
      const _changed=!!(chg&&chg.has(i+1));
      const segs=[]; let rest=line;
      const push=(t,cls)=>{ if(t!=='') segs.push({t, cls:cls||''}); };
      while(rest.length){
        let m;
        if((m=rest.match(/^(\s+)/))){ push(m[1],''); rest=rest.slice(m[1].length); continue; }
        if((m=rest.match(/^(\/\/.*)/))){ push(m[1],'gx-code-cmt'); rest=''; continue; }
        if((m=rest.match(/^(#(?![\{!]).*)/))){ push(m[1],'gx-code-cmt'); rest=''; continue; }
        if((m=rest.match(/^("(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*')/))){ push(m[1],'gx-code-str'); rest=rest.slice(m[1].length); continue; }
        if((m=rest.match(/^(\d+(?:\.\d+)?)/))){ push(m[1],'gx-code-num'); rest=rest.slice(m[1].length); continue; }
        if((m=rest.match(/^([A-Za-z_$][\w$]*)/))){
          const id=m[1]; const after=rest.slice(id.length);
          let cls='';
          if(kw.test(id)) cls='gx-code-kw';
          else if(/^\s*\(/.test(after)) cls='gx-code-fn';
          push(id,cls); rest=after; continue;
        }
        push(rest.charAt(0),''); rest=rest.slice(1);
      }
      if(!segs.length) segs.push({t:' ', cls:''});
      return {n:String(i+1), segs, changed:_changed, lineStyle:_changed?'background:rgba(83,201,139,.09);box-shadow:inset 2px 0 0 #53c98b':''};
    });
  }
  _codeLineNos(text){ return String(text||'').split('\n').slice(0,2000).map((_,i)=>({n:String(i+1)})); }
  // --- Dosya düzenleme ---
  startEdit(){ const p=this.state._preview; if(!p||(p.kind!=='text'&&p.kind!=='markdown'&&p.kind!=='html')) return;
    let content=p.content||'';
    const buf=this._bufRestore(); const recovered=!!(buf&&buf.v!==content);
    if(recovered){ content=buf.v; setTimeout(()=>this.toast('↻ Kaydedilmemiş taslak kurtarıldı — kontrol edip ⌘S ile yaz'), 80); }
    this.setState({_editMode:true,_editContent:content,_editMsg:''}, ()=>setTimeout(()=>this._cmMount(), 70)); }
  onEditContent(e){ const v=(e&&e.target&&e.target.value)||''; this._bufSave(v); this.setState({_editContent:v}); }
  cancelEdit(){
    if(this._editDirty()){ this.askConfirm('Değişiklikler kaydedilmedi. Düzenlemeden çıkılsın mı?', ()=>{ this._cmDestroy(); try{ const k=this._bufKey(); if(k) localStorage.removeItem(k); }catch(e){} this.setState({_editMode:false,_editContent:'',_editMsg:''}); }, {title:'Kaydedilmemiş değişiklik', okLabel:'Kaydetmeden çık', kind:'warn'}); return; }
    this._cmDestroy();
    this.setState({_editMode:false,_editMsg:''});
  }
  pvEditKey(e){
    if(!e) return;
    if((e.metaKey||e.ctrlKey)&&e.key.toLowerCase()==='s'){ e.preventDefault&&e.preventDefault(); this.saveEdit(); return; }
    if(e.key==='Tab'){
      e.preventDefault&&e.preventDefault();
      const ta=e.target; if(!ta||ta.selectionStart==null) return;
      const v=ta.value, s=ta.selectionStart, en=ta.selectionEnd;
      const nv=v.slice(0,s)+'  '+v.slice(en);
      this.setState({_editContent:nv});
      setTimeout(()=>{ try{ ta.selectionStart=ta.selectionEnd=s+2; }catch(err){} }, 0);
    }
  }
  async saveEdit(){ const p=this.state._preview, root=(this.sel&&this.sel._path)||''; if(!p||!p.rel||!root||!window.galaxy) return;
    if(!this._editDirty()){ this._cmDestroy(); this.setState({_editMode:false,_editMsg:''}); return; }
    const isRemote=String(root).indexOf('ssh://')===0;
    if(isRemote&&!window.galaxy.fileWriteRemote){ this.toast('✕ Uzak yazma bu ortamda yok','err'); return; }
    if(!isRemote&&!window.galaxy.fileWrite) return;
    this.setState({_editBusy:true,_editMsg:''});
    try{ let content=this.state._editContent;
      // Faz 3) Kaydette formatla (proje aracı: prettier/eslint/ruff/gofmt…) — hata olursa yine de kaydet
      let fmtTools='';
      if(!isRemote){ const fr=await this._maybeFormat(content, p.rel); if(fr&&fr.content!=null){ fmtTools=(fr.tools||[]).join(' + '); if(fr.changed&&fr.content!==content){ content=fr.content;
        if(this._cm){ try{ const cur=this._cm.getCursor(); const sc=this._cm.getScrollInfo(); this._cmSilent=true; this._cm.setValue(content); this._cmSilent=false; this._cm.setCursor(cur); this._cm.scrollTo(null, sc.top); this.setState({_editContent:content}); }catch(e){ this._cmSilent=false; } }
      } } }
      const r=isRemote? await window.galaxy.fileWriteRemote({root,rel:p.rel,content}) : await window.galaxy.fileWrite({root,rel:p.rel,content});
      if(r&&r.ok){ const bust=p.url?(String(p.url).split('?')[0]+'?t='+Date.now()):p.url; const now=new Date(), pad=n=>String(n).padStart(2,'0');
        const savedAt=pad(now.getHours())+':'+pad(now.getMinutes())+':'+pad(now.getSeconds());
        this._selfWriteRel=p.rel; this._selfWriteAt=Date.now();
        try{ const k=this._bufKey(); if(k) localStorage.removeItem(k); }catch(e){}
        this._cmDestroy();
        this.setState({_editBusy:false,_editMode:false,_editMsg:'',_editSavedAt:savedAt,_preview:Object.assign({},p,{content,url:bust||p.url})});
        this.toast('✓ Kaydedildi · '+p.rel+' ('+savedAt+')'+(isRemote?' · uzaktan':'')+(fmtTools?' · fmt: '+fmtTools:''));
        this._loadGit();
      }
      else this.setState({_editBusy:false,_editMsg:'✕ '+((r&&r.error)||'kaydedilemedi')}); }
    catch(e){ this.setState({_editBusy:false,_editMsg:'✕ hata'}); } }
  // Dosyada bul / değiştir
  onPvFindInput(e){ this.setState({pvFind:(e&&e.target&&e.target.value)||''}); this._pvFindIdx=-1; }
  onPvReplaceInput(e){ this.setState({pvReplace:(e&&e.target&&e.target.value)||''}); }
  pvFindNext(){
    const p=this.state._preview, q=String(this.state.pvFind||''); if(!p||!q) return;
    const lines=String(this.state._editMode?this.state._editContent:(p.content||'')).split('\n');
    const hits=[]; lines.forEach((l,i)=>{ if(l.toLowerCase().includes(q.toLowerCase())) hits.push(i+1); });
    if(!hits.length){ this.toast('Eşleşme yok','err'); return; }
    this._pvFindIdx=((this._pvFindIdx==null?-1:this._pvFindIdx)+1)%hits.length;
    const ln=hits[this._pvFindIdx];
    try{ const el=document.querySelector('[data-pv-line="'+ln+'"]'); if(el){ el.scrollIntoView({block:'center'}); el.style.background='rgba(106,167,255,.18)'; setTimeout(()=>{ el.style.background=''; },900); } }catch(e){}
    this.toast('Satır '+ln+' · '+(this._pvFindIdx+1)+'/'+hits.length);
  }
  pvFindKey(e){ if(e&&e.key==='Enter'){ e.preventDefault&&e.preventDefault(); this.pvFindNext(); } }
  pvReplaceAll(){
    const q=String(this.state.pvFind||''); if(!q||!this.state._editMode) return;
    const cur=String(this.state._editContent||'');
    const n=cur.split(q).length-1;
    if(!n){ this.toast('Eşleşme yok','err'); return; }
    this.setState({_editContent:cur.split(q).join(String(this.state.pvReplace||''))});
    this.toast(n+' eşleşme değiştirildi — Kaydet (⌘S) ile yaz');
  }
  onTreeFilterInput(e){
    const v=(e&&e.target&&e.target.value)||'';
    const next={treeFilter:v, grepQuery:v};
    if(!String(v).trim()) next._grep=null;
    this.setState(next);
  }
  onTreeFilterKey(e){ if(e&&e.key==='Enter'){ e.preventDefault&&e.preventDefault(); this.runGrep(); } }
  // --- Dosya oluştur/sil ---
  fileDelete(rel){ const root=(this.sel&&this.sel._path)||''; if(!root||!rel||!window.galaxy||!window.galaxy.fileDelete) return;
    this.askConfirm('"'+rel+'" silinsin mi? Bu geri alınamaz.', async()=>{
      try{ await window.galaxy.fileDelete({root,rel});
        const tabs=(this.state.fileTabs||[]).filter(t=>t.rel!==rel);
        if(this.state._preview&&this.state._preview.rel===rel) this.setState({_preview:null,_editMode:false,fileTabs:tabs}); else this.setState({fileTabs:tabs});
        this.toast('🗑 '+rel+' silindi'); await this._loadGit();
      }catch(e){ this.toast('✕ silinemedi','err'); }
    }, {title:'Dosyayı sil', okLabel:'Sil', kind:'danger'}); }
  async fileCreate(){ const root=(this.sel&&this.sel._path)||''; const rel=String(this.state.newFileInput||'').trim(); if(!root||!rel||!window.galaxy||!window.galaxy.fileCreate) return;
    try{ const r=await window.galaxy.fileCreate({root,rel}); if(r&&r.ok){ this.setState({newFileInput:'',_newFileOpen:false}); await this._loadGit(); if(!/\/$/.test(rel)) this._openFilePreview(rel); } else this.setState({_fsMsg:(r&&r.error)||'oluşturulamadı'}); }catch(e){} }
  onNewFileInput(e){ this.setState({newFileInput:(e&&e.target&&e.target.value)||''}); }
  onNewFileKey(e){ if(e.key==='Enter'){ e.preventDefault&&e.preventDefault(); this.fileCreate(); } else if(e.key==='Escape') this.setState({_newFileOpen:false}); }
  // --- Projede ara (grep) ---
  onGrepInput(e){ this.setState({grepQuery:(e&&e.target&&e.target.value)||''}); }
  onGrepKey(e){ if(e.key==='Enter'){ e.preventDefault&&e.preventDefault(); this.runGrep(); } }
  async runGrep(){ const root=(this.sel&&this.sel._path)||''; const q=String(this.state.grepQuery||this.state.treeFilter||'').trim(); if(!root||q.length<2||!window.galaxy||!window.galaxy.projectGrep) return;
    this.setState({_grepBusy:true,_grep:null});
    try{ const r=await window.galaxy.projectGrep({root,query:q}); this.setState({_grepBusy:false,_grep:(r&&r.ok)?r.matches:[]}); }
    catch(e){ this.setState({_grepBusy:false,_grep:[]}); } }
  // (geriye dönük — bazı yerler hâlâ tam yol + dir ile çağırıyor)
  _openFsPath(path,dir){ try{ if(dir){ if(window.galaxy.openFolder) window.galaxy.openFolder(path); } else if(window.galaxy.openFile) window.galaxy.openFile(path); }catch(e){} }
  _treeIsOpen(path, depth){ const o=this.state._treeOpen||{}; if(Object.prototype.hasOwnProperty.call(o,path)) return !!o[path]; return depth<1; }
  _toggleTree(path, depth){ const o=Object.assign({}, this.state._treeOpen||{}); o[path]=!this._treeIsOpen(path, depth); this.setState({_treeOpen:o}); }
  _flatTree(nodes,base,depth){ let out=[]; for(const n of (nodes||[])){ const path=base?base+'/'+n.name:n.name; const isDir=!!n.dir; const kids=isDir&&n.children&&n.children.length; const open=isDir&&this._treeIsOpen(path,depth);
    out.push({name:n.name,dir:isDir,depth,path,hasKids:!!kids,open}); if(isDir&&open&&n.children) out=out.concat(this._flatTree(n.children,path,depth+1)); } return out; }
  componentWillUnmount(){
    window.removeEventListener('keydown', this._key);
    if (this._dialogObserver) this._dialogObserver.disconnect();
    if (this._onBarResize) window.removeEventListener('resize', this._onBarResize);
    if (this._onBarPtr) document.removeEventListener('pointerdown', this._onBarPtr, true);
    if (this._raf) cancelAnimationFrame(this._raf);
    if (this._onResize) window.removeEventListener('resize', this._onResize);
    if (this._warpT) clearTimeout(this._warpT);
    if (this._focusI) clearInterval(this._focusI);
    if (this._barClock) clearInterval(this._barClock);
    try{ if(this._asst){ if(this._asst._raf) cancelAnimationFrame(this._asst._raf); this._asstMicMeter(false); } }catch(e){}
    try{ window.speechSynthesis&&window.speechSynthesis.cancel(); }catch(e){}
  }

  get sel(){ return this.PROJECTS.find(p=>p.id===this.state.selId) || this.PROJECTS[0] || this._emptyProj(); }
  _emptyProj(){ return { id:'', name:'—', group:'', status:'active', stage:'', desc:'', prog:0, branch:'', plan:[], notes:'', _notes:'', links:[], _links:[], _path:'', _git:null, _readme:false, _stale:0, warn:false, orbit:false, x:50, y:50, size:60 }; }
  planetBg(c){
    const dark=this.DARK[c]||'#071018';
    return `radial-gradient(circle at 32% 28%,#f7fbff 0 7%,#d4ecff 16%,${c} 42%,${dark} 78%,#02060c 100%)`;
  }
  rgba(hex,a){ const n=parseInt(hex.slice(1),16); return `rgba(${(n>>16)&255},${(n>>8)&255},${n&255},${a})`; }

  select(id){ this._planAuto=null; const doSel=()=>{ this._cmDestroy(); if(this._pty&&this._pty.pid!==id) this._ptyDispose(); this.setState({selId:id, _fsCwd:'', _preview:null, _treeOpen:{}, fileTabs:[], _editSavedAt:'', filePalOpen:false, _history:null, _blame:null, _histShow:null, histBusy:false}); this._loadGit(); if(this.state.mode==='planet') this._watchStartFor(); }; if(id!==this.state.selId) this._guardDirty(doSel); else doSel(); }
  enter(){
    this._planAuto=null; const p=this.sel; this._recentTouch(p&&p.id);
    const cons=this._consoleCollapsedPref();
    const ns={mode:'planet', tab:'evren', orbitView:false, holdPlanet:true, moreOpen:false, consoleCollapsed:cons, activityId:'explorer', leftTab:'agac', fileTabs:this._wsRestoreTabs(p&&p.id), rightCollapsed:false, _history:null, _blame:null, _histShow:null, histBusy:false};
    const prev=this._sessRead();
    const patch={mode:'planet', tab:'evren', selId:p&&p.id};
    if(!(prev&&p&&prev.selId===p.id)){ patch.lastFile=null; patch.lastFileName=null; }
    this._warp(()=>this.setState(ns)); this._sessWrite(patch); this._loadGit(); this._watchStartFor(); this._onEnterDev();
    if(prev&&prev.lastFile&&p&&prev.selId===p.id){ const rel=prev.lastFile; setTimeout(()=>{ try{ this.openPreview(rel); }catch(e){} }, 80); }
    if(!cons) this._focusConsole();
    if(p) this._logActivity('OPEN_PLANET', p.name||'gezegen', {undo:()=>this.back()}); }
  back(){
    if(this.state.mode==='space' && this.state.holdPlanet){
      const cons=this._consoleCollapsedPref();
      this._warp(()=>this.setState({mode:'planet', tab:'evren', orbitView:false, moreOpen:false, consoleCollapsed:cons, activityId:'explorer'}));
      this._loadGit(); if(!cons) this._focusConsole(); return;
    }
    this._warp(()=>this.setState({mode:'space', holdPlanet:false, tab:'evren', moreOpen:false, consoleCollapsed:true, activityId:'explorer'}));
  }
  _warp(cb){ if(this._warpT) clearTimeout(this._warpT); cb(); }
  toggleFocus(){ if(this.state.focusRunning){ clearInterval(this._focusI); this.setState({focusRunning:false}); } else { this._focusI=setInterval(()=>this.setState(s=>{ const n=Math.max(0,s.focusSec-1); if(n===0){ clearInterval(this._focusI); return {focusSec:0,focusRunning:false}; } return {focusSec:n}; }),1000); this.setState({focusRunning:true}); } }
  resetFocus(){ clearInterval(this._focusI); this.setState({focusRunning:false,focusSec:this._focusDefault||1500}); }

