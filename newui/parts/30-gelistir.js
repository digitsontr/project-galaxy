  // ========== FAZ 2: BUL-DEĞİŞTİR / SEMBOLLER / TESTLER / GEÇMİŞ / İŞLER / PROFİL ==========
  // --- R1) Proje geneli Bul & Değiştir ---
  onGrQuery(e){ this.setState({grQuery:(e&&e.target&&e.target.value)||''}); }
  onGrReplace(e){ this.setState({grReplace:(e&&e.target&&e.target.value)||''}); }
  async grPreview(){
    const root=this.sel&&this.sel._path; const q=String(this.state.grQuery||'');
    if(!root||!q||!(window.galaxy&&window.galaxy.grepReplacePreview)) return;
    this.setState({grBusy:true,_grPreview:null});
    try{
      const r=await window.galaxy.grepReplacePreview({root, query:q, replacement:this.state.grReplace||'', isRegex:!!this.state.grRegex, caseSensitive:!!this.state.grCase});
      if(!r||!r.ok){ this.toast('✕ '+((r&&r.error)||'arama yapılamadı'),'err'); this.setState({grBusy:false}); return; }
      this.setState({grBusy:false, _grPreview:r});
      if(!r.total) this.toast('Eşleşme yok');
    }catch(e){ this.setState({grBusy:false}); }
  }
  async grApply(){
    const pv=this.state._grPreview; const root=this.sel&&this.sel._path;
    if(!pv||!pv.files||!pv.files.length||!root) return;
    const files=pv.files.map(f=>f.rel);
    this.askConfirm(files.length+' dosyada toplam '+pv.total+' değişiklik uygulanacak. Otomatik yedek (.galaxy-backups) alınacak.', async()=>{
      try{
        const r=await window.galaxy.grepReplaceApply({root, query:this.state.grQuery, replacement:this.state.grReplace||'', isRegex:!!this.state.grRegex, caseSensitive:!!this.state.grCase, files});
        if(r&&r.ok){ this.setState({_grBackup:r, _grPreview:null}); this.toast('✓ '+r.changed+' dosya, '+r.replaced+' değişiklik — yedek: '+r.backupDir); this._loadGit(); const p=this.state._preview; if(p&&files.includes(p.rel)) this.openPreview(p.rel,true); }
        else this.toast('✕ '+((r&&r.error)||'uygulanamadı'),'err');
      }catch(e){ this.toast('✕ uygulanamadı','err'); }
    }, {title:'Toplu değiştirmeyi uygula', okLabel:'Uygula', kind:'warn'});
  }
  async grRollback(){
    const b=this.state._grBackup; const root=this.sel&&this.sel._path;
    if(!b||!root||!(window.galaxy&&window.galaxy.grepReplaceRollback)) return;
    try{ const r=await window.galaxy.grepReplaceRollback({root, backupId:b.backupId}); if(r&&r.ok){ this.toast('↩ '+r.restored+' dosya yedekten geri yüklendi'); this.setState({_grBackup:null}); this._loadGit(); } else this.toast('✕ '+((r&&r.error)||'geri alınamadı'),'err'); }catch(e){}
  }
  // --- R2) Semboller: dosya içi taslak + tanıma git + tamamlama kelimeleri ---
  _parseSymbols(text, rel){
    const out=[]; const lines=String(text||'').split('\n');
    lines.forEach((ln,i)=>{
      let m;
      if((m=ln.match(/^\s*(?:export\s+)?(?:async\s+)?function\s+([A-Za-z_$][\w$]*)/))) out.push({name:m[1], kind:'fn', line:i+1});
      else if((m=ln.match(/^\s*(?:export\s+)?class\s+([A-Za-z_$][\w$]*)/))) out.push({name:m[1], kind:'class', line:i+1});
      else if((m=ln.match(/^\s*(?:export\s+)?(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=\s*(?:async\s*)?\(/))) out.push({name:m[1], kind:'fn', line:i+1});
      else if((m=ln.match(/^\s*def\s+([A-Za-z_]\w*)/))) out.push({name:m[1], kind:'fn', line:i+1});
      else if((m=ln.match(/^\s*(?:class|struct|enum|protocol)\s+([A-Za-z_]\w*)/))) out.push({name:m[1], kind:'type', line:i+1});
      else if((m=ln.match(/^\s*func\s+([A-Za-z_]\w*)/))) out.push({name:m[1], kind:'fn', line:i+1});
      else if((m=ln.match(/^#{1,3}\s+(.+)/))&&/\.md$/i.test(rel||'')) out.push({name:m[1].slice(0,60), kind:'md', line:i+1});
      else if((m=ln.match(/^\s*(?:public|private|protected|static|final|\s)*[\w<>\[\]]+\s+([A-Za-z_]\w*)\s*\([^;]*\)\s*\{/))&&/\.(java|cs|cpp|c|h)$/i.test(rel||'')) out.push({name:m[1], kind:'fn', line:i+1});
    });
    return out.slice(0, 400);
  }
  _curSymbols(){
    const p=this.state._preview; if(!p||p.content==null) return [];
    return this._parseSymbols(this.state._editMode?this.state._editContent:p.content, p.rel);
  }
  _gotoLine(line){
    if(!line) return;
    if(this._cm){ try{ this._cm.scrollIntoView({line:line-1, ch:0}, 120); this._cm.setCursor({line:line-1, ch:0}); this._cm.focus(); return; }catch(e){} }
    try{ const el=document.querySelector('[data-pv-line="'+line+'"]'); if(el){ el.scrollIntoView({block:'center'}); el.style.background='rgba(106,167,255,.18)'; setTimeout(()=>{ el.style.background=''; },1100); } }catch(e){}
  }
  async gotoDefinition(word){
    const w=String(word||'').trim(); if(!w||w.length<2) return;
    const root=this.sel&&this.sel._path; if(!root) return;
    // Önce açık dosyada ara
    const p=this.state._preview;
    if(p&&p.content){ const syms=this._parseSymbols(p.content, p.rel); const hit=syms.find(s=>s.name===w); if(hit){ this._gotoLine(hit.line); this.toast('Tanım: '+p.rel+':'+hit.line); return; } }
    // Proje genelinde tanım kalıbı ara (grep IPC varsa onu, yoksa tree+file ile tara)
    if(window.galaxy&&window.galaxy.grepReplacePreview){
      try{
        const r=await window.galaxy.grepReplacePreview({root, query:'(function|class|def|func|const|let|var)\\s+'+w.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')+'\\b', replacement:'', isRegex:true, caseSensitive:true});
        const f=(r&&r.files||[])[0];
        if(f&&f.hits&&f.hits[0]){ if(!(p&&p.rel===f.rel)) await this.openPreview(f.rel); setTimeout(()=>this._gotoLine(f.hits[0].line), 320); this.toast('Tanım: '+f.rel+':'+f.hits[0].line); return; }
      }catch(e){}
    }
    this.toast('Tanım bulunamadı: '+w,'err');
  }
  _selectNextOccurrence(cm){
    try{
      let sel=cm.getSelection();
      const cur=cm.getCursor();
      if(!sel){ const tok=cm.getTokenAt(cur); if(!tok||!/[\w$]/.test(tok.string||'')) return; cm.setSelection({line:cur.line, ch:tok.start}, {line:cur.line, ch:tok.end}); return; }
      const value=cm.getValue(); const lines=value.split('\n');
      const offOf=(pos)=>{ let o=0; for(let i=0;i<pos.line;i++) o+=lines[i].length+1; return o+pos.ch; };
      const posOf=(off)=>{ let o=off; for(let i=0;i<lines.length;i++){ if(o<=lines[i].length) return {line:i, ch:o}; o-=lines[i].length+1; } return {line:lines.length-1, ch:lines[lines.length-1].length}; };
      const from=offOf(cm.getCursor('to'));
      let idx=value.indexOf(sel, from);
      if(idx<0) idx=value.indexOf(sel, 0);
      if(idx<0) return;
      cm.addSelection(posOf(idx), posOf(idx+sel.length));
    }catch(e){}
  }
  _cmExtraKeys(){
    return {
      'Cmd-S':()=>this.saveEdit(), 'Ctrl-S':()=>this.saveEdit(), 'Esc':()=>this.cancelEdit(),
      'Cmd-Shift-O':()=>this.setState({symOpen:true, symQuery:''}),
      'Ctrl-Shift-O':()=>this.setState({symOpen:true, symQuery:''}),
      'F12':(cm)=>{ this.langGotoDef().then(ok=>{ if(!ok){ try{ const w=cm.getSelection()||cm.getTokenAt(cm.getCursor()).string; this.gotoDefinition(w); }catch(e){} } }); },
      'Shift-F12':()=>this.langRefs(),
      'F2':()=>this.langRenameOpen(),
      'Cmd-.':()=>this.langQuickFix(), 'Ctrl-.':()=>this.langQuickFix(),
      'Cmd-D':(cm)=>this._selectNextOccurrence(cm), 'Ctrl-D':(cm)=>this._selectNextOccurrence(cm)
    };
  }
  // --- R4) Test Gezgini ---
  async testsDiscover(){
    const root=this.sel&&this.sel._path; if(!root||!(window.galaxy&&window.galaxy.testDiscover)) return;
    this.setState({testsBusy:true});
    try{ const r=await window.galaxy.testDiscover({root}); this.setState({testsBusy:false, _tests:r}); if(r&&r.tests&&!r.tests.length) this.toast('Test bulunamadı'); }
    catch(e){ this.setState({testsBusy:false}); }
  }
  async testRunOne(t){
    const root=this.sel&&this.sel._path; if(!root||!(window.galaxy&&window.galaxy.testRun)) return;
    this.setState({_testRunning:t.file+':'+t.line});
    try{
      const r=await window.galaxy.testRun({root, file:t.file, name:t.name, runner:(this.state._tests||{}).runner});
      this.setState({_testRunning:''});
      if(r){ this._appendOut(this._con(this.sel&&this.sel.id).bout, {kind:'out', text:'$ '+r.cmd+'\n'+String(r.out||'').slice(-6000)}); this._flushProblems();
        if(r.problems&&r.problems.length) this.setState({_problems:[...(this.state._problems||[]), ...r.problems].slice(-120), problemsOpen:true});
        this._notify(r.passed?'✓ Test geçti':'✕ Test başarısız', (t.name||t.file)+' · '+Math.round((r.ms||0))+'ms', r.passed?'ok':'err');
        this.toast(r.passed?'✓ Test geçti ('+Math.round(r.ms||0)+'ms)':'✕ Test başarısız — çıktı Bash terminalinde', r.passed?'ok':'err');
      }
    }catch(e){ this.setState({_testRunning:''}); }
  }
  // --- R5) Dosya geçmişi + blame ---
  async loadHistory(){
    const p=this.state._preview; const proj=this.sel;
    if(!p||!p.rel||!proj||!(window.galaxy&&window.galaxy.gitFileHistory)) return;
    this.setState({histBusy:true, _history:null, _blame:null, _histShow:null});
    try{
      const h=await window.galaxy.gitFileHistory({projectId:proj.id, file:p.rel});
      this.setState({histBusy:false, _history:h});
      if(window.galaxy.gitBlame){ const b=await window.galaxy.gitBlame({projectId:proj.id, file:p.rel}); this.setState({_blame:(b&&b.ok)?b.lines:null}); }
    }catch(e){ this.setState({histBusy:false}); }
  }
  async histShowVersion(c){
    const p=this.state._preview; const proj=this.sel; if(!p||!proj||!(window.galaxy&&window.galaxy.gitShowFile)) return;
    try{ const r=await window.galaxy.gitShowFile({projectId:proj.id, file:p.rel, rev:c.hash}); if(r&&r.ok) this.setState({_histShow:{rev:c.short, subject:c.subject, content:r.content}}); else this.toast('✕ '+((r&&r.error)||'sürüm açılamadı'),'err'); }catch(e){}
  }
  async histRestoreVersion(c){
    const p=this.state._preview; const proj=this.sel; if(!p||!proj) return;
    this.askConfirm(c.short+' sürümü mevcut dosyanın üstüne yazılsın mı? (Önce yedek alınmaz — Git geçmişi duruyor.)', async()=>{
      try{ const r=await window.galaxy.gitShowFile({projectId:proj.id, file:p.rel, rev:c.hash}); if(!r||!r.ok){ this.toast('✕ sürüm okunamadı','err'); return; }
        if(this.state._editMode||true){ this.setState({_editMode:true, _editContent:r.content, _histShow:null}, ()=>setTimeout(()=>this._cmMount(),70)); this.toast('↩ '+c.short+' editöre yüklendi — ⌘S ile kaydet'); }
      }catch(e){}
    }, {title:'Eski sürümü geri yükle', okLabel:'Yükle', kind:'warn'});
  }
  blameForLine(n){
    const b=this.state._blame; if(!b) return null;
    return b.find(x=>x.line===n)||null;
  }
  // --- R10) Arka plan işleri + bildirimler ---
  async jobStartCmd(cmd, label, env){
    const root=this.sel&&this.sel._path; const c=String(cmd||'').trim();
    if(!root||!c||!(window.galaxy&&window.galaxy.jobStart)) return;
    try{ const r=await window.galaxy.jobStart({root, cmd:c, label:label||c.slice(0,60), env:env||undefined}); if(r&&r.ok){ this.setState({_jobs:[...(this.state._jobs||[]), {id:r.id, label:r.label, cmd:c, status:'running', started:Date.now()}]}); this.toast('▶ Arka planda başladı: '+r.label); } else this.toast('✕ '+((r&&r.error)||'başlatılamadı'),'err'); }catch(e){}
  }
  async jobsRefresh(){
    if(!(window.galaxy&&window.galaxy.jobList)) return;
    try{ const r=await window.galaxy.jobList(); if(r&&r.jobs) this.setState({_jobs:r.jobs}); }catch(e){}
  }
  async jobStop(id){ try{ if(window.galaxy&&window.galaxy.jobStop) await window.galaxy.jobStop({id}); }catch(e){} this.jobsRefresh(); }
  _onJobOut(m){ /* çıktı jobList ile çekiliyor; canlı rozet yeterli */ }
  _onJobDone(m){
    if(!m) return;
    this.jobsRefresh();
    if(m.status==='stopped'){ this._notify('■ İş durduruldu', (m.label||m.id||''), 'ok'); return; }
    this._notify(m.status==='done'?'✓ İş bitti':'✕ İş hatayla bitti', (m.label||m.id)+' · '+Math.round((m.ms||0)/100)/10+'sn', m.status==='done'?'ok':'err');
  }
  _notify(title, body, kind){
    const list=[...(this.state._notifs||[]), {id:Date.now()+Math.random(), title, body, kind:kind||'ok', at:new Date()}].slice(-30);
    this.setState({_notifs:list});
    this.toast(title+' — '+body, kind==='err'?'err':'ok');
  }
  // --- R9) .galaxy profili + şablonlar ---
  async gxLoad(){
    const root=this.sel&&this.sel._path; if(!root||!(window.galaxy&&window.galaxy.galaxyProfileRead)) return;
    try{ const r=await window.galaxy.galaxyProfileRead({root}); this.setState({_gxProfile:r}); }catch(e){}
    this.pkgLoad();
  }
  async gxCreateDefault(){
    const root=this.sel&&this.sel._path; if(!root) return;
    const profile={ name:this.sel&&this.sel.name||'', scripts:[{name:'dev', cmd:'npm run dev'}], onOpen:[], env:{}, agentInstructions:'Bu projede Türkçe yanıt ver; dosya değiştirmeden önce planı söyle.' , prompts:[{label:'Kod incele', text:'Son değişiklikleri incele, risk ve eksikleri listele.'},{label:'Test yaz', text:'Seçili dosya için birim testleri yaz.'}] };
    try{ const r=await window.galaxy.galaxyProfileWrite({root, profile}); if(r&&r.ok){ this.toast('✓ .galaxy.json oluşturuldu'); this.gxLoad(); } }catch(e){}
  }
  async gxRunOnOpen(){
    const prof=(this.state._gxProfile||{}).profile;
    const list=(prof&&prof.onOpen)||[];
    for(const cmd of list){ this.jobStartCmd(cmd, 'açılış: '+cmd); }
    if(list.length) this.toast(list.length+' açılış görevi arka planda');
  }
  async tplCreate(){
    const root=this.sel&&this.sel._path; if(!root||!(window.galaxy&&window.galaxy.templateCreate)) return;
    this.setState({gxBusy:true});
    try{ const r=await window.galaxy.templateCreate({root, kind:this.state.tplKind||'node', name:(this.sel&&this.sel.name)||''}); this.setState({gxBusy:false}); if(r&&r.ok){ this.toast(r.created.length?('✓ Şablon kuruldu: '+r.created.join(', ')):'Şablon dosyaları zaten var'); this._loadGit(); } }catch(e){ this.setState({gxBusy:false}); }
  }
  promptLib(){
    const prof=(this.state._gxProfile||{}).profile;
    const base=[{label:'Kod incele', text:'Son değişiklikleri incele, risk ve eksikleri listele.'},{label:'Hataları bul', text:'Bu projedeki olası hataları tara, dosya:satır ile raporla.'},{label:'Refaktör öner', text:'Açık dosyayı davranış değiştirmeden sadeleştirme önerileri sun.'}];
    const extra=(prof&&prof.prompts)||[];
    return [...extra, ...base.filter(b=>!extra.some(x=>x.label===b.label))];
  }
  async _expandAtMentions(text, root){
    const mentions=[...String(text||'').matchAll(/@([\w./-]+\.[A-Za-z]{1,8})/g)].map(m=>m[1]).slice(0,3);
    if(!mentions.length||!(window.galaxy&&window.galaxy.file)) return text;
    let extra='';
    for(const rel of mentions){
      try{ const f=await window.galaxy.file(root, rel); if(f&&f.content) extra+='\n\n--- @'+rel+' ---\n'+String(f.content).slice(0,6000); }catch(e){}
    }
    return extra? (text+extra) : text;
  }
  _gxAgentInstructions(){
    const prof=(this.state._gxProfile||{}).profile;
    return prof&&prof.agentInstructions ? ('[Proje talimatı] '+String(prof.agentInstructions)) : '';
  }
  _onEnterDev(){
    // Gezegene girişte: .galaxy profili + iş listesi yükle, açılış görevlerini bir kez çalıştır
    const pid=this.sel&&this.sel.id;
    if(!pid){ // sel henüz oturmamış olabilir (setState asenkron) — bir kez gecikmeli tekrar dene
      if(!this._enterRetry){ this._enterRetry=1; setTimeout(()=>{ this._enterRetry=0; this._onEnterDev(); }, 800); }
      return;
    }
    this.gxLoad(); this.jobsRefresh(); this.langCheck(); this.gitExtLoad();
    setTimeout(async()=>{
      if(this._onOpenRanFor===pid) return;
      this._onOpenRanFor=pid;
      try{ await this.gxLoad(); const prof=(this.state._gxProfile||{}).profile; const list=(prof&&prof.onOpen)||[]; for(const cmd of list) this.jobStartCmd(cmd, 'açılış: '+cmd); }catch(e){}
    }, 600);
  }
  // --- Faz 3) LSP köprüsü ---
  _langExtOk(rel){ return /\.(ts|tsx|js|jsx|mts|cts|mjs|cjs)$/i.test(String(rel||'')); }
  _langRoot(){ const r=this.sel&&this.sel._path; return (r&&String(r).indexOf('ssh://')!==0)?r:null; }
  async langCheck(){
    const root=this._langRoot(); if(!root||!(window.galaxy&&window.galaxy.langStatus)) return;
    if(this._langCheckedFor===root&&this.state._langStatus) return;
    this._langCheckedFor=root;
    try{ const r=await window.galaxy.langStatus({root}); this.setState({_langStatus:r||{ok:false}}); }catch(e){ this.setState({_langStatus:{ok:false,error:'ulaşılamadı'}}); }
  }
  async _langReq(kind, extra){
    const root=this._langRoot(); const p=this.state._preview;
    if(!root||!p||!p.rel||!this._langExtOk(p.rel)||!(window.galaxy&&window.galaxy.langRequest)) return null;
    const content=this.state._editMode?String(this.state._editContent||''):String(p.content||'');
    try{ return await window.galaxy.langRequest(Object.assign({root, kind, file:p.rel, content}, extra||{})); }catch(e){ return null; }
  }
  _langScheduleDiag(delay){
    if(this._langDiagT) clearTimeout(this._langDiagT);
    this._langDiagT=setTimeout(()=>this.langDiagNow(), delay==null?900:delay);
  }
  async langDiagNow(){
    if(!this.state._editMode) return;
    const p=this.state._preview; if(!p||!this._langExtOk(p.rel)) return;
    const r=await this._langReq('diag');
    if(!r||!r.ok||!Array.isArray(r.problems)) return;
    if(!this._cm||this.state._preview!==p) return;
    // Sorunlar listesinde bu dosyanın eski LSP kayıtlarını yenile
    const others=(this.state._problems||[]).filter(x=>!(x.source==='lsp'&&x.file===p.rel));
    this.setState({_problems:[...others, ...r.problems].slice(-160)});
    this._cmLangMarks(r.problems);
  }
  _cmLangMarks(problems){
    if(!this._cm) return;
    const cm=this._cm;
    try{ (this._langMarkList||[]).forEach(m=>{ try{ m.clear(); }catch(e){} }); }catch(e){}
    this._langMarkList=[];
    for(const pr of (problems||[]).slice(0,60)){
      try{
        const from={line:Math.max(0,(pr.line||1)-1), ch:Math.max(0,(pr.col||1)-1)};
        const word=cm.getTokenAt({line:from.line, ch:from.ch+1});
        const to={line:from.line, ch:Math.max(from.ch+1, (word&&word.end)||from.ch+1)};
        const mk=cm.markText(from, to, {className:pr.severity==='warning'?'gx-diag-warn':'gx-diag-err', title:pr.text||''});
        this._langMarkList.push(mk);
      }catch(e){}
    }
  }
  async langGotoDef(){
    const cm=this._cm; if(!cm) return false;
    const cur=cm.getCursor();
    const r=await this._langReq('def', {line:cur.line+1, ch:cur.ch+1});
    const d=r&&r.ok&&r.defs&&r.defs[0];
    if(!d) return false;
    const p=this.state._preview;
    if(p&&d.file===p.rel){ this._gotoLine(d.line); }
    else { await this.openPreview(d.file); setTimeout(()=>this._gotoLine(d.line), 340); }
    this.toast('Tanım (LSP): '+d.file+':'+d.line);
    return true;
  }
  async langRefs(){
    const cm=this._cm; if(!cm) return;
    const cur=cm.getCursor();
    const tok=cm.getTokenAt(cur); const word=(tok&&tok.string)||'';
    const r=await this._langReq('refs', {line:cur.line+1, ch:cur.ch+1});
    if(r&&r.ok){ this.setState({refsOpen:true, _refs:r.refs||[], _refsWord:word}); if(!(r.refs||[]).length) this.toast('Referans yok'); }
    else this.toast('LSP referans veremedi','err');
  }
  langRenameOpen(){
    const cm=this._cm; if(!cm) return;
    const cur=cm.getCursor(); const tok=cm.getTokenAt(cur);
    const word=(cm.getSelection()||(tok&&tok.string)||'').trim();
    if(!/^[A-Za-z_$][\w$]*$/.test(word)){ this.toast('Yeniden adlandırmak için bir sembol seç','err'); return; }
    this._renamePos={line:cur.line+1, ch:cur.ch+1};
    this.setState({renameOpen:true, renameVal:word, _renameWord:word});
  }
  async langRenameApply(){
    const name=String(this.state.renameVal||'').trim();
    const pos=this._renamePos||{}; const p=this.state._preview; const root=this._langRoot();
    if(!name||!p||!root) return;
    this.setState({renameOpen:false});
    const r=await this._langReq('rename', {line:pos.line||1, ch:pos.ch||1, newName:name});
    if(!r||!r.ok){ this.toast('✕ '+((r&&r.error)||'yeniden adlandırılamadı'),'err'); return; }
    const files=r.files||[];
    this.askConfirm('"'+(this.state._renameWord||'')+'" → "'+name+'" · '+r.total+' kullanım, '+files.length+' dosya güncellenecek. Uygulansın mı?', async()=>{
      let done=0;
      for(const f of files){
        try{ const w=await window.galaxy.fileWrite({root, rel:f.file, content:f.content}); if(w&&w.ok) done++; }catch(e){}
      }
      this.toast(done?('✓ Yeniden adlandırıldı: '+done+' dosya'):'✕ yazılamadı', done?'ok':'err');
      if(done&&p&&files.some(f=>f.file===p.rel)) this.reloadPreview&&this.reloadPreview();
      this._langScheduleDiag(400);
    }, {title:'Güvenli yeniden adlandırma (LSP)', okLabel:'Uygula', kind:'warn'});
  }
  _cmHoverBind(cm){
    try{
      const wrap=cm.getWrapperElement(); if(!wrap||wrap._gxHoverBound) return; wrap._gxHoverBound=true;
      let lastKey='';
      wrap.addEventListener('mousemove', ev=>{
        if(!this.state._editMode||!this._cm) return;
        if(this._hoverT) clearTimeout(this._hoverT);
        const x=ev.clientX, y=ev.clientY;
        this._hoverT=setTimeout(async()=>{
          try{
            if(!this._cm) return;
            const pos=this._cm.coordsChar({left:x, top:y});
            const tok=this._cm.getTokenAt(pos);
            if(!tok||!/[\w$]/.test(tok.string||'')) { if(this.state._hoverTip) this.setState({_hoverTip:null}); return; }
            const key=pos.line+':'+tok.start+':'+tok.string;
            if(key===lastKey&&this.state._hoverTip) return; lastKey=key;
            const r=await this._langReq('hover', {line:pos.line+1, ch:tok.start+2});
            if(r&&r.ok&&r.text){
              const cc=this._cm.charCoords({line:pos.line, ch:tok.start}, 'window');
              this.setState({_hoverTip:{text:r.text, x:Math.round(cc.left), y:Math.round(cc.bottom+6)}});
            } else if(this.state._hoverTip) this.setState({_hoverTip:null});
          }catch(e){}
        }, 420);
      });
      wrap.addEventListener('mouseleave', ()=>{ if(this._hoverT) clearTimeout(this._hoverT); if(this.state._hoverTip) this.setState({_hoverTip:null}); });
    }catch(e){}
  }
  _langHint(cm, cb){
    const fallback=()=>{ const syms=this._curSymbols().map(s=>s.name); const words=new Set(syms); String(cm.getValue()||'').replace(/[A-Za-z_$][\w$]{2,}/g, w=>{ words.add(w); return w; }); const cur=cm.getCursor(); const tok=cm.getTokenAt(cur); const start=tok.start, end=cur.ch; const word=(tok.string||'').slice(0, end-start); const list=[...words].filter(w=>w.toLowerCase().startsWith(String(word||'').toLowerCase())&&w!==word).slice(0,40).sort(); cb({ list, from:{line:cur.line, ch:start}, to:{line:cur.line, ch:end} }); };
    (async()=>{
      const cur=cm.getCursor();
      const r=await this._langReq('complete', {line:cur.line+1, ch:cur.ch+1});
      if(r&&r.ok&&r.entries&&r.entries.length){
        const tok=cm.getTokenAt(cur); const word=(tok.string||'').slice(0, cur.ch-tok.start);
        const list=r.entries.filter(e=>e.name&&e.name.toLowerCase().startsWith(String(word||'').toLowerCase())).slice(0,50).map(e=>e.name);
        if(list.length){ cb({ list:[...new Set(list)], from:{line:cur.line, ch:tok.start}, to:{line:cur.line, ch:cur.ch} }); return; }
      }
      fallback();
    })().catch(()=>fallback());
  }
  // --- Faz 3) Kaydette formatla ---
  _fmtOn(){ try{ return localStorage.getItem('gxFmtOnSave')==='1'; }catch(e){ return false; } }
  toggleFmtOnSave(){ const v=!this._fmtOn(); try{ localStorage.setItem('gxFmtOnSave', v?'1':'0'); }catch(e){} this.setState({fmtOnSave:v}); this.toast(v?'✓ Kaydette formatla açık (prettier/eslint…)':'Kaydette formatla kapalı'); }
  async _maybeFormat(content, rel){
    if(!this._fmtOn()) return null;
    const root=this._langRoot(); if(!root||!(window.galaxy&&window.galaxy.formatFile)) return null;
    try{ const r=await window.galaxy.formatFile({root, file:rel, content}); if(r&&r.ok) return r; }catch(e){}
    return null;
  }
  // --- Faz 3) Çalıştırma profilleri + debug ---
  async pkgLoad(){
    const root=this._langRoot(); if(!root||!(window.galaxy&&window.galaxy.pkgScripts)) return;
    try{ const r=await window.galaxy.pkgScripts({root}); this.setState({_pkgScripts:(r&&r.scripts)||[]}); }catch(e){}
  }
  runProfiles(){
    const prof=(this.state._gxProfile||{}).profile||{};
    const out=[];
    for(const s of (prof.scripts||[])) if(s&&s.cmd) out.push({name:s.name||s.cmd, cmd:s.cmd, src:'galaxy', env:prof.env||{}, key:'g:'+s.cmd});
    for(const s of (this.state._pkgScripts||[])) out.push({name:s.name, cmd:'npm run '+s.name, src:'npm', env:prof.env||{}, key:'n:'+s.name});
    return out;
  }
  runProfile(p){ if(p) this.jobStartCmd(p.cmd, '▶ '+p.name, p.env); }
  runProfileDebug(p){
    if(!p) return;
    this.jobStartCmd(p.cmd, '🐛 '+p.name, Object.assign({}, p.env||{}, {NODE_OPTIONS:'--inspect=127.0.0.1:0'}));
    this.toast('🐛 Inspector açık — job çıktısındaki "Debugger listening" satırını Chrome\'da chrome://inspect ile aç');
  }
  async debugStartLegacyFile(){
    const root=this._langRoot(); const p=this.state._preview;
    if(!root||!p||!/\.(js|mjs|cjs)$/i.test(p.rel||'')){ this.toast('Debug için bir .js dosyası aç','err'); return; }
    if(!(window.galaxy&&window.galaxy.debugStart)) return;
    try{ const r=await window.galaxy.debugStart({root, file:p.rel}); if(r&&r.ok){ this.toast('🐛 Debug başladı: '+p.rel); this.jobsRefresh(); } else this.toast('✕ '+((r&&r.error)||'başlatılamadı'),'err'); }catch(e){}
  }
  _onDebugReady(m){ if(m) this._notify('🐛 Debug hazır', 'DevTools: '+String(m.devtoolsUrl||'').slice(0,90), 'ok'); }
  // --- Faz 3) GitHub paneli ---
  async ghLoad(){
    const root=this._langRoot(); if(!root||!(window.galaxy&&window.galaxy.ghPrList)) return;
    this.setState({ghBusy:true});
    try{ const r=await window.galaxy.ghPrList({root}); this.setState({ghBusy:false, _gh:r}); if(r&&!r.ok&&r.error) this.setState({_ghErr:r.error}); }catch(e){ this.setState({ghBusy:false}); }
  }
  async ghPrCreate(){
    const root=this._langRoot(); if(!root||!(window.galaxy&&window.galaxy.ghPrCreateWeb)) return;
    try{ const r=await window.galaxy.ghPrCreateWeb({root}); if(r&&r.ok) this.toast('🌐 PR oluşturma sayfası tarayıcıda açıldı'); else this.toast('✕ '+((r&&r.error)||'açılamadı'),'err'); }catch(e){}
  }
  // --- Faz 3) Git derinliği ---
  async gitExtLoad(){
    const proj=this.sel; if(!proj||!proj.id||!(window.galaxy&&window.galaxy.gitBranches)) return;
    try{
      const [b, s, c]=await Promise.all([ window.galaxy.gitBranches({projectId:proj.id}), window.galaxy.gitStashList({projectId:proj.id}), window.galaxy.gitConflicts({projectId:proj.id}) ]);
      this.setState({_branches:b, _stashes:s, _conflicts:c});
    }catch(e){}
  }
  async branchSwitch(name, create){
    const proj=this.sel; if(!proj||!(window.galaxy&&window.galaxy.gitSwitchBranch)) return;
    this.setState({gitBusy:true});
    try{ const r=await window.galaxy.gitSwitchBranch({projectId:proj.id, branch:name, create:!!create}); this.setState({gitBusy:false}); if(r&&r.ok){ this.toast('⎇ Dal: '+name); this._loadGit(); this.gitExtLoad(); } else this.toast('✕ '+((r&&r.error)||'geçilemedi'),'err'); }catch(e){ this.setState({gitBusy:false}); }
  }
  branchCreate(){
    const name=String(this.state.newBranch||'').trim(); if(!name){ this.toast('Dal adı yaz','err'); return; }
    this.setState({newBranch:''}); this.branchSwitch(name, true);
  }
  async stashPush(){
    const proj=this.sel; if(!proj||!(window.galaxy&&window.galaxy.gitStashPush)) return;
    try{ const r=await window.galaxy.gitStashPush({projectId:proj.id, msg:'galaxy: '+(this.sel&&this.sel.name||'çalışma')}); if(r&&r.ok){ this.toast('📦 Stash\'e atıldı'); this._loadGit(); this.gitExtLoad(); } else this.toast('✕ '+((r&&r.error)||'stash olmadı'),'err'); }catch(e){}
  }
  async stashApply(ref, pop){
    const proj=this.sel; if(!proj) return;
    const run=async()=>{ try{ const r=await window.galaxy.gitStashApply({projectId:proj.id, ref, pop:!!pop}); if(r&&r.ok){ this.toast(pop?'📦 Stash uygulandı + silindi':'📦 Stash uygulandı'); this._loadGit(); this.gitExtLoad(); } else this.toast('✕ '+((r&&r.error)||'uygulanamadı'),'err'); }catch(e){} };
    if(pop) this.askConfirm(ref+' uygulanıp stash\'ten silinsin mi?', run, {title:'Stash pop', okLabel:'Uygula + sil', kind:'warn'}); else run();
  }
  async stashDrop(ref){
    const proj=this.sel; if(!proj) return;
    this.askConfirm(ref+' kalıcı olarak silinsin mi?', async()=>{ try{ const r=await window.galaxy.gitStashDrop({projectId:proj.id, ref}); if(r&&r.ok){ this.toast('🗑 Stash silindi'); this.gitExtLoad(); } else this.toast('✕ '+((r&&r.error)||'silinemedi'),'err'); }catch(e){} }, {title:'Stash sil', okLabel:'Sil', kind:'danger'});
  }

  // --- Faz 4) Yerleşik Ajan (Claude Code gerekmez) ---
  async agentCfgLoad(){
    if(!(window.galaxy&&window.galaxy.agentConfigGet)) return;
    try{ const r=await window.galaxy.agentConfigGet(); if(r&&r.ok) this.setState({_agentCfg:r, agentModelVal:this.state.agentModelVal||r.model||''}); }catch(e){}
  }
  async agentCfgSave(){
    if(!(window.galaxy&&window.galaxy.agentConfigSave)) return;
    const patch={ model:String(this.state.agentModelVal||'').trim()||undefined, autoApprove:!!((this.state._agentCfg||{}).autoApprove) };
    const k=String(this.state.agentKeyVal||'').trim(); if(k) patch.key=k;
    try{ const r=await window.galaxy.agentConfigSave(patch); if(r&&r.ok){ this.setState({_agentCfg:r, agentKeyVal:''}); this.toast(r.hasKey?'✓ Ajan hazır (anahtar kaydedildi)':'Anahtar yok — eklemelisin', r.hasKey?'ok':'err'); } }catch(e){}
  }
  agentToggleAuto(){
    const cur=(this.state._agentCfg||{}).autoApprove;
    this.setState({_agentCfg:Object.assign({}, this.state._agentCfg||{}, {autoApprove:!cur})}, ()=>this.agentCfgSave());
  }
  _agentFeedPush(item){
    const feed=[...(this.state._agentFeed||[]), item].slice(-140);
    this.setState({_agentFeed:feed});
    this._scrollBottom('#ghud-console-scroll');
  }
  async agentSendText(text){
    const p=this.sel; const root=p&&p._path;
    if(!root){ this._agentFeedPush({kind:'error', text:'Önce bir projeye gir.'}); return; }
    if(!(window.galaxy&&window.galaxy.agentSend)){ this._agentFeedPush({kind:'error', text:'Yerleşik ajan bu ortamda yok.'}); return; }
    this._agentFeedPush({kind:'user', text});
    this.setState({_agentBusy:true});
    try{ this._snapshotDirty(); }catch(e){}
    try{
      const expanded=await this._expandAtMentions(text, root);
      const instr=[this._gxAgentInstructions(), expanded!==text?'':''].join(' ');
      const r=await window.galaxy.agentSend({root, sessionKey:p.id, text:expanded, instructions:this._gxAgentInstructions()});
      if(r&&r.ok){ this._agentRunId=r.runId; this._agentFeedPush({kind:'sys', text:r.engine==='cli'?'⎇ Motor: Claude Code (abonelik) · izinler acceptEdits — değişen dosyalar tur sonunda listelenir':'✦ Motor: API anahtarı (token başına ücretli)'}); }
      else { this.setState({_agentBusy:false,_conBusy:false}); this._agentFeedPush({kind:'error', text:(r&&r.error)||'Ajan başlatılamadı'}); }
    }catch(e){ this.setState({_agentBusy:false,_conBusy:false}); this._agentFeedPush({kind:'error', text:'Ajan hatası'}); }
  }
  _onAgentEvent(m){
    if(!m) return;
    const pid=this.sel&&this.sel.id;
    if(m.sessionKey&&pid&&m.sessionKey!==pid) return;
    if(m.kind==='text'){ const feed=[...(this.state._agentFeed||[])]; const last=feed[feed.length-1]; if(last&&last.kind==='text') feed[feed.length-1]={kind:'text', text:(last.text||'')+m.text}; else feed.push({kind:'text', text:m.text}); this.setState({_agentFeed:feed.slice(-140)}); this._scrollBottom('#ghud-console-scroll'); }
    else if(m.kind==='tool') this._agentFeedPush({kind:'tool', toolId:m.toolId, text:'⚙ '+(m.summary||m.tool||'araç'), status:'run'});
    else if(m.kind==='tool_result'){ const feed=(this.state._agentFeed||[]).map(x=>x.toolId&&x.toolId===m.toolId?Object.assign({}, x, {status:m.ok?'ok':'err', preview:m.preview||''}):x); this.setState({_agentFeed:feed}); }
    else if(m.kind==='approval') this._agentFeedPush({kind:'approval', approvalId:m.approvalId, text:'Onay gerekli: '+(m.summary||m.tool||''), status:'wait'});
    else if(m.kind==='error'){ this._agentFeedPush({kind:'error', text:m.text||'hata'}); this.setState({_agentBusy:false,_conBusy:false}); }
    else if(m.kind==='changed'){ const fl=m.files||[]; if(fl.length){ this._agentFeedPush({kind:'sys', text:'✏️ Bu turda değişen dosyalar ('+fl.length+') — açmak için satıra tıkla:'}); for(const f of fl.slice(0,40)) this._agentFeedPush({kind:'chgfile', file:f.path, text:f.path+'  ('+({'??':'yeni',M:'değişti',A:'eklendi',D:'silindi',R:'yeniden adlandırıldı'}[f.status]||f.status||'değişti')+')'}); } }
    else if(m.kind==='done'){ this.setState({_agentBusy:false,_conBusy:false}); this._agentRunId=null; try{ this._checkAgentReview(); }catch(e){} this._loadGit(); }
  }
  async agentApproveDo(approvalId, ok){
    const feed=(this.state._agentFeed||[]).map(x=>x.approvalId===approvalId?Object.assign({}, x, {status:ok?'ok':'err', text:x.text+(ok?'  ✓ onaylandı':'  ✕ reddedildi')}):x);
    this.setState({_agentFeed:feed});
    try{ if(window.galaxy&&window.galaxy.agentApprove) await window.galaxy.agentApprove({approvalId, ok}); }catch(e){}
  }
  async agentStopDo(){
    try{ if(this._agentRunId&&window.galaxy&&window.galaxy.agentStop) await window.galaxy.agentStop({runId:this._agentRunId}); }catch(e){}
    this.setState({_agentBusy:false});
  }
  async agentResetDo(){
    const p=this.sel;
    try{ if(window.galaxy&&window.galaxy.agentReset) await window.galaxy.agentReset({sessionKey:p&&p.id}); }catch(e){}
    this.setState({_agentFeed:[]});
    this.toast('Ajan sohbeti temizlendi');
  }
  // --- Faz 4) Yerleşik debugger ---
  _bpKey(rel){ return 'gxBp::'+((this.sel&&this.sel.id)||'')+'::'+(rel||''); }
  _bpSet(rel){
    if(!this._bpMap) this._bpMap={};
    if(!this._bpMap[rel]){ let init=[]; try{ init=JSON.parse(localStorage.getItem(this._bpKey(rel))||'[]'); }catch(e){} this._bpMap[rel]=new Set(Array.isArray(init)?init:[]); }
    return this._bpMap[rel];
  }
  _bpSave(rel){ try{ localStorage.setItem(this._bpKey(rel), JSON.stringify([...this._bpSet(rel)])); }catch(e){} }
  _bpMarker(){
    const d=document.createElement('div');
    d.textContent='●'; d.style.cssText='color:#ef6b7b;font-size:11px;line-height:1;text-align:center;cursor:pointer;text-shadow:0 0 6px rgba(239,107,123,.7)';
    return d;
  }
  _cmBpRefresh(){
    const cm=this._cm; const p=this.state._preview; if(!cm||!p) return;
    try{
      cm.clearGutter('gx-bp-gutter');
      for(const line of this._bpSet(p.rel)) cm.setGutterMarker(line-1, 'gx-bp-gutter', this._bpMarker());
    }catch(e){}
  }
  async _cmGutterClick(cm, line, gutter){
    if(gutter!=='gx-bp-gutter') return;
    const p=this.state._preview; if(!p) return;
    const set=this._bpSet(p.rel); const ln=line+1;
    const on=!set.has(ln);
    if(on) set.add(ln); else set.delete(ln);
    this._bpSave(p.rel); this._cmBpRefresh();
    const dbg=this.state._dbg;
    if(dbg&&dbg.id&&dbg.file===p.rel&&window.galaxy&&window.galaxy.dbgBreakpoint){
      try{ await window.galaxy.dbgBreakpoint({id:dbg.id, line:ln, on}); this.toast((on?'⬤ Breakpoint: ':'○ Breakpoint kalktı: ')+p.rel+':'+ln); }catch(e){}
    }
  }
  async debugCurrentFile(){
    const root=this._langRoot(); const p=this.state._preview;
    if(!root||!p||!/\.(js|mjs|cjs)$/i.test(p.rel||'')){ this.toast('Debug için bir .js dosyası aç','err'); return; }
    if(!(window.galaxy&&window.galaxy.dbgStart)){ this.toast('Debugger bu ortamda yok','err'); return; }
    if(this.state._editMode&&this._editDirty()){ this.toast('Önce kaydet (⌘S) — debugger diskteki dosyayı koşar','err'); return; }
    try{
      const bps=[...this._bpSet(p.rel)].sort((a,b)=>a-b);
      const r=await window.galaxy.dbgStart({root, file:p.rel, breakpoints:bps});
      if(r&&r.ok){ this.setState({_dbg:{id:r.id, file:p.rel, status:'running', line:0, vars:[], stack:[]}}); this.toast('🐛 Debugger başladı: '+p.rel+(bps.length?(' · '+bps.length+' breakpoint'):'')); this.jobsRefresh(); }
      else this.toast('✕ '+((r&&r.error)||'başlatılamadı'),'err');
    }catch(e){ this.toast('✕ debugger hatası','err'); }
  }
  _onDbgEvent(m){
    if(!m) return;
    const dbg=this.state._dbg; if(!dbg||m.id!==dbg.id) return;
    if(m.kind==='paused'){
      this.setState({_dbg:Object.assign({}, dbg, {status:'paused', line:m.line||0, fn:m.fn||'', vars:m.vars||[], stack:m.stack||[]})});
      if(this._cm&&m.line){ try{ if(this._dbgLineH) this._cm.removeLineClass(this._dbgLineH, 'background', 'gx-dbg-line'); }catch(e){} try{ this._dbgLineH=this._cm.addLineClass(m.line-1, 'background', 'gx-dbg-line'); this._cm.scrollIntoView({line:m.line-1, ch:0}, 90); }catch(e){} }
    }
    else if(m.kind==='resumed'){ this.setState({_dbg:Object.assign({}, dbg, {status:'running'})}); if(this._cm&&this._dbgLineH){ try{ this._cm.removeLineClass(this._dbgLineH, 'background', 'gx-dbg-line'); }catch(e){} this._dbgLineH=null; } }
    else if(m.kind==='ended'){ this.setState({_dbg:Object.assign({}, dbg, {status:'ended', line:0})}); if(this._cm&&this._dbgLineH){ try{ this._cm.removeLineClass(this._dbgLineH, 'background', 'gx-dbg-line'); }catch(e){} this._dbgLineH=null; } this.toast('🐛 Debug bitti (kod '+m.code+')'); this.jobsRefresh(); }
  }
  async dbgResumeDo(){ const d=this.state._dbg; if(d&&window.galaxy&&window.galaxy.dbgResume) try{ await window.galaxy.dbgResume({id:d.id}); }catch(e){} }
  async dbgStepDo(kind){ const d=this.state._dbg; if(d&&window.galaxy&&window.galaxy.dbgStep) try{ await window.galaxy.dbgStep({id:d.id, kind}); }catch(e){} }
  async dbgStopDo(){ const d=this.state._dbg; if(d&&window.galaxy&&window.galaxy.dbgStop) try{ await window.galaxy.dbgStop({id:d.id}); }catch(e){} this.setState({_dbg:null}); }
  // --- Faz 4) Quick-fix (Cmd+.) ---
  async langQuickFix(){
    const cm=this._cm; if(!cm) return;
    const cur=cm.getCursor();
    const r=await this._langReq('quickfix', {line:cur.line+1, ch:cur.ch+1});
    if(r&&r.ok&&r.fixes&&r.fixes.length) this.setState({qfixOpen:true, _qfixes:r.fixes});
    else this.toast('Bu konumda hızlı düzeltme yok');
  }
  async langQuickFixAt(pr){
    const p=this.state._preview;
    if(!p||p.rel!==pr.file){ try{ await this.openPreview(pr.file); }catch(e){} }
    if(!this.state._editMode){ try{ this.startEdit(); }catch(e){} }
    setTimeout(()=>{ try{ if(this._cm){ this._cm.setCursor({line:Math.max(0,(pr.line||1)-1), ch:Math.max(0,(pr.col||1)-1)}); this._cm.focus(); } }catch(e){} this.langQuickFix(); }, 460);
  }
  async qfixApply(fx){
    const root=this._langRoot(); const p=this.state._preview; if(!root||!fx) return;
    this.setState({qfixOpen:false});
    let done=0;
    for(const f of (fx.files||[])){
      try{ const w=await window.galaxy.fileWrite({root, rel:f.file, content:f.content}); if(w&&w.ok) done++; }catch(e){}
    }
    this.toast(done?('⚡ Uygulandı: '+fx.description):'✕ uygulanamadı', done?'ok':'err');
    if(done&&p) this.reloadPreview();
  }
  // --- Faz 4) Çakışma çözücü ---
  async openConflict(f){
    const proj=this.sel; if(!proj||!(window.galaxy&&window.galaxy.gitConflictVersions)) return;
    try{ const r=await window.galaxy.gitConflictVersions({projectId:proj.id, file:f}); if(r&&r.ok) this.setState({_conflict:Object.assign({file:f}, r)}); else this.toast('✕ '+((r&&r.error)||'sürümler alınamadı'),'err'); }catch(e){}
  }
  async resolveConflict(mode){
    const c=this.state._conflict; const proj=this.sel; if(!c||!proj) return;
    let content=c.current||'';
    if(mode==='ours') content=c.ours||'';
    else if(mode==='theirs') content=c.theirs||'';
    else if(mode==='both') content=(c.ours||'')+(c.ours&&c.theirs&&!String(c.ours).endsWith('\n')?'\n':'')+(c.theirs||'');
    this.askConfirm(c.file+' → '+(mode==='ours'?'bizim sürüm':mode==='theirs'?'onların sürümü':mode==='both'?'birleşik (biz+onlar)':'mevcut içerik')+' yazılıp stage edilsin mi?', async()=>{
      try{ const r=await window.galaxy.gitResolveConflict({projectId:proj.id, file:c.file, content}); if(r&&r.ok){ this.toast('✓ Çakışma çözüldü: '+c.file); this.setState({_conflict:null}); this._loadGit(); this.gitExtLoad(); if(this.state._preview&&this.state._preview.rel===c.file) this.reloadPreview(); } else this.toast('✕ '+((r&&r.error)||'çözülemedi'),'err'); }catch(e){}
    }, {title:'Çakışmayı çöz', okLabel:'Yaz + stage', kind:'warn'});
  }

  // --- R6) AI bağlam yardımcıları ---
  _aiSendToClaude(text){
    this.setState({consoleTab:'claude', consoleCollapsed:false}, ()=>{
      const p=this.sel; const con=this._con(p&&p.id);
      con.cout.push({t:'in', x:'> '+String(text).slice(0,300)});
      this.setState({consoleInput:''});
      try{ this._snapshotDirty(); }catch(e){}
      if(window.galaxy&&window.galaxy.claudeRun&&p&&p._path){
        const runId='c'+((this._cc=(this._cc||0)+1))+'-'+p.id; this._claudeRunId=runId;
        window.galaxy.claudeRun({runId, cwd:p._path, prompt:String(text), continueSession:!!this._claudeSessMap()[p.id], sessionKey:p.id});
      }
      this.setState({_cov:(this.state._cov||0)+1});
    });
  }
  aiExplainSelection(){
    const selText=this._cm?String(this._cm.getSelection()||''):String((window.getSelection&&window.getSelection())||'');
    const p=this.state._preview;
    if(!selText.trim()){ this.toast('Önce editörde kod seç','err'); return; }
    this._aiSendToClaude('Şu kodu açıkla ('+(p?p.rel:'')+'):\n```\n'+selText.slice(0,4000)+'\n```');
  }
  aiFixSelection(){
    const selText=this._cm?String(this._cm.getSelection()||''):'';
    const p=this.state._preview;
    if(!selText.trim()){ this.toast('Önce editörde kod seç','err'); return; }
    this._aiSendToClaude('Şu kodu hatalara karşı incele ve düzeltilmiş halini öner ('+(p?p.rel:'')+'):\n```\n'+selText.slice(0,4000)+'\n```\nDeğişikliği dosyaya uygulamadan önce bana göster.');
  }
  aiTestSelection(){
    const p=this.state._preview;
    this._aiSendToClaude((p?p.rel+' dosyası':'Açık dosya')+' için birim testleri yaz. Mevcut test desenini izle, dosyayı oluşturmadan önce planı söyle.');
  }
  async aiReviewDiff(){
    const p=this.sel; if(!p||!(window.galaxy&&window.galaxy.gitDiff)) return;
    const files=((this.state._git&&this.state._git.dirtyFiles)||[]).slice(0,5);
    if(!files.length){ this.toast('İncelenecek değişiklik yok'); return; }
    let combined='';
    for(const l of files){ const rel=String(l).trim().split(/\s+/).slice(1).join(' '); try{ const r=await window.galaxy.gitDiff({projectId:p.id, file:rel, staged:false}); if(r&&r.ok) combined+='\n--- '+rel+' ---\n'+String(r.out||'').slice(0,5000); }catch(e){} }
    if(!combined.trim()){ this.toast('Diff okunamadı','err'); return; }
    this._aiSendToClaude('Şu değişiklikleri kod incelemesi gibi değerlendir; risk, hata ve eksik testleri madde madde söyle:\n'+combined.slice(0,14000));
  }
  // --- R7) Dev server önizlemesi ---
  devSrvOpenUrl(url){
    const u=String(url||'').trim(); if(!u) return;
    this.setState({devSrvOpen:true, devSrvUrl:u.startsWith('http')?u:('http://localhost:'+u.replace(/[^0-9]/g,''))});
  }
  // --- R3) Bölünmüş terminal: ikinci bash oturumu (mevcut shell IPC ile) ---
  async splitBashSend(cmd){
    const p=this.sel; if(!p||!cmd) return;
    this.setState({splitBash:''});
    const con=this._con(p.id);
    const sid='sh2-'+p.id;
    try{
      if(window.galaxy&&window.galaxy.shellStart) await window.galaxy.shellStart({shellId:sid, cwd:p._path});
      if(window.galaxy&&window.galaxy.shellInput) await window.galaxy.shellInput({shellId:sid, cwd:p._path, cmd});
    }catch(e){}
    void con;
  }

