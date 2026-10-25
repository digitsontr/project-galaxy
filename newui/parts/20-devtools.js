  // ========== DEVTOOLS: PTY / WATCH / ⌘P / CODEMIRROR / SORUNLAR / AJAN ONAYI ==========
  // --- 1) Gerçek PTY terminali (xterm.js) ---
  _ptyOnData(m){
    if(!m || !this._pty || m.id!==this._pty.id || !this._pty.term) return;
    try{ this._pty.term.write(m.data); }catch(e){}
  }
  _ptyMount(){
    const div=document.getElementById('gx-xterm');
    const pid=this.sel&&this.sel.id; const root=this.sel&&this.sel._path;
    if(!div||!pid||!root) return;
    if(this._pty && this._pty.pid===pid && this._pty.term){
      try{ this._pty.fit&&this._pty.fit.fit(); this._pty.term.focus(); }catch(e){}
      return;
    }
    this._ptyDispose();
    if(!(window.Terminal)){ div.innerHTML='<div style="padding:14px;font-family:var(--gx-mono);font-size:12px;color:var(--gx-dim)">xterm yüklenemedi — BASH sekmesini kullan.</div>'; return; }
    const term=new window.Terminal({
      theme:{background:'#070a12',foreground:'#d7e3f5',cursor:'#6aa7ff',selectionBackground:'rgba(106,167,255,.3)',green:'#53c98b',red:'#ef6b7b',yellow:'#e5b45d',blue:'#6aa7ff',magenta:'#a596e8',cyan:'#5ce1ff'},
      fontFamily:'"JetBrains Mono",ui-monospace,monospace', fontSize:12, lineHeight:1.25, cursorBlink:true, scrollback:4000
    });
    let fit=null;
    try{ if(window.FitAddon&&window.FitAddon.FitAddon){ fit=new window.FitAddon.FitAddon(); term.loadAddon(fit); } }catch(e){}
    term.open(div);
    try{ fit&&fit.fit(); }catch(e){}
    const id='pty-'+pid;
    this._pty={term, fit, pid, id};
    if(window.galaxy&&window.galaxy.ptyStart){
      window.galaxy.ptyStart({id, cwd:root, cols:term.cols||100, rows:term.rows||30});
      term.onData(d=>{ try{ window.galaxy.ptyWrite({id, data:d}); }catch(e){} });
    }
    try{ term.focus(); }catch(e){}
  }
  _ptyDispose(){
    if(!this._pty) return;
    try{ if(window.galaxy&&window.galaxy.ptyStop) window.galaxy.ptyStop(this._pty.id); }catch(e){}
    try{ this._pty.term&&this._pty.term.dispose(); }catch(e){}
    this._pty=null;
  }
  // --- 2) Dosya izleme + ⌘P dosya paleti ---
  _watchStartFor(){
    const root=this.sel&&this.sel._path; if(!root) return;
    if(this._watchRoot===root) return;
    try{
      if(this._watchRoot&&window.galaxy&&window.galaxy.watchStop) window.galaxy.watchStop({root:this._watchRoot});
      if(window.galaxy&&window.galaxy.watchStart) window.galaxy.watchStart({root});
    }catch(e){}
    this._watchRoot=root;
  }
  _onFsChanged(m){
    if(!m||m.root!==(this.sel&&this.sel._path)) return;
    if(this._fsT) clearTimeout(this._fsT);
    this._fsT=setTimeout(()=>{
      this._loadGit();
      const p=this.state._preview;
      if(p&&p.rel&&(m.files||[]).includes(p.rel)&&!this._editDirty()){
        if(this._selfWriteRel===p.rel&&Date.now()-(this._selfWriteAt||0)<1800) return;
        this.openPreview(p.rel, true);
        this.toast('↻ '+p.rel+' dışarıda değişti — tazelendi');
      }
    }, 120);
  }
  onFilePalInput(e){ this.setState({filePalQuery:(e&&e.target&&e.target.value)||'', filePalIdx:0}); }
  onFilePalKey(e){
    if(!e) return;
    if(e.key==='Enter'){ e.preventDefault&&e.preventDefault(); const r=(this._filePalList||[])[this.state.filePalIdx||0]; if(r) r.onClick(); }
    else if(e.key==='ArrowDown'){ e.preventDefault&&e.preventDefault(); this.setState({filePalIdx:Math.min((this.state.filePalIdx||0)+1, Math.max(0,(this._filePalList||[]).length-1))}); }
    else if(e.key==='ArrowUp'){ e.preventDefault&&e.preventDefault(); this.setState({filePalIdx:Math.max(0,(this.state.filePalIdx||0)-1)}); }
    else if(e.key==='Escape'){ this.setState({filePalOpen:false,filePalQuery:''}); }
  }
  _filePalRows(){
    const q=String(this.state.filePalQuery||'').toLowerCase();
    const files=this._flatTree(this._treeNodes||[], '', 0).filter(n=>!n.dir);
    const scored=files.map(f=>{
      const lp=f.path.toLowerCase();
      let score=lp.includes(q)?0:999;
      if(q){ // gevşek fuzzy: karakterler sırayla bulunuyor mu
        let qi=0; for(const ch of lp){ if(ch===q[qi]) qi++; if(qi>=q.length) break; }
        if(qi>=q.length) score=Math.min(score, lp.length);
      }
      return {f, score};
    }).filter(x=>!q||x.score!==999);
    const recent=(this.state.fileTabs||[]).map(t=>t.rel);
    scored.sort((a,b)=> (recent.indexOf(b.f.path)-recent.indexOf(a.f.path)) || (a.score-b.score) || a.f.path.localeCompare(b.f.path));
    const rows=scored.slice(0,14).map((x,i)=>({
      label:x.f.path, isActive:i===(this.state.filePalIdx||0),
      style:`display:flex;align-items:center;gap:10px;width:100%;padding:9px 16px;cursor:pointer;background:${i===(this.state.filePalIdx||0)?'rgba(106,167,255,.10)':'transparent'};border:none;border-left:2px solid ${i===(this.state.filePalIdx||0)?'var(--gx-accent)':'transparent'};text-align:left;color:var(--gx-ink);font-family:'JetBrains Mono',monospace;font-size:12.5px`,
      onClick:()=>{ this.setState({filePalOpen:false,filePalQuery:''}); this._openFilePreview(x.f.path); }
    }));
    this._filePalList=rows;
    return rows;
  }
  // --- 3) CodeMirror editör çekirdeği ---
  _cmModeFor(name){
    const l=String(name||'').toLowerCase();
    if(/\.(js|jsx|mjs|cjs)$/.test(l)) return 'javascript';
    if(/\.(ts|tsx)$/.test(l)) return {name:'javascript', typescript:true};
    if(/\.py$/.test(l)) return 'python';
    if(/\.md$/.test(l)) return 'markdown';
    if(/\.css$/.test(l)) return 'css';
    if(/\.html?$/.test(l)) return 'htmlmixed';
    if(/\.(c|cpp|h|hpp|java|cs|kt|scala)$/.test(l)) return 'text/x-csrc';
    if(/\.swift$/.test(l)) return 'swift';
    if(/\.go$/.test(l)) return 'go';
    if(/\.php$/.test(l)) return 'php';
    if(/\.rb$/.test(l)) return 'ruby';
    if(/\.rs$/.test(l)) return 'rust';
    if(/\.(sh|bash|zsh)$/.test(l)) return 'shell';
    if(/\.(ya?ml)$/.test(l)) return 'yaml';
    if(/\.sql$/.test(l)) return 'sql';
    if(/\.toml$/.test(l)) return 'toml';
    if(/\.json$/.test(l)) return {name:'javascript', json:true};
    if(/dockerfile/.test(l)) return 'dockerfile';
    return 'text/plain';
  }
  _cmMount(){
    if(!window.CodeMirror) return;
    if(this._cm) return;
    const tas=Array.from(document.querySelectorAll('textarea.gx-cm-ta'));
    const ta=tas.find(t=>t.offsetParent!==null&&t.clientHeight>0)||tas[0];
    if(!ta) return;
    const p=this.state._preview; if(!p) return;
    let cm;
    try{
      cm=window.CodeMirror.fromTextArea(ta, {
        mode:this._cmModeFor(p.name||p.rel), theme:'galaxy', lineNumbers:true,
        gutters:['CodeMirror-linenumbers','gx-bp-gutter'],
        matchBrackets:true, autoCloseBrackets:true, styleActiveLine:true,
        tabSize:2, indentUnit:2, lineWrapping:!!this.state.pvWrap,
        extraKeys:this._cmExtraKeys()
      });
    }catch(e){ return; }
    const host=ta.closest('.gx-cm-host')||ta.parentElement;
    const hostH=(host&&host.clientHeight)||480;
    cm.setSize('100%', Math.max(200, hostH)+'px');
    try{ cm.getWrapperElement().style.fontSize=(this.state.pvFont||13)+'px'; }catch(e){}
    this._cm=cm;
    // Gizliyken monte edilmişse ölçüleri tazele (boş editör görünümünü önler)
    setTimeout(()=>{ try{ if(this._cm){ const h2=(host&&host.clientHeight)||hostH; this._cm.setSize('100%', Math.max(200,h2)+'px'); this._cm.refresh(); } }catch(e){} }, 180);
    cm.on('change', ()=>{
      if(this._cmSilent) return;
      const v=cm.getValue();
      this._bufSave(v);
      this.setState({_editContent:v});
      if(this.state.pvAutosave){ if(this._asT) clearTimeout(this._asT); this._asT=setTimeout(()=>{ if(this._editDirty()) this.saveEdit(); }, 1400); }
    });
    // R8) imleç + kaydırma konumu hatırlama (dosya başına localStorage)
    const posKey=()=>'gxPos::'+(this.sel&&this.sel.id)+'::'+((this.state._preview||{}).rel||'');
    try{ const saved=JSON.parse(localStorage.getItem(posKey())||'null'); if(saved){ cm.setCursor({line:saved.line||0, ch:saved.ch||0}); cm.scrollTo(null, saved.scroll||0); } }catch(e){}
    const savePos=()=>{ try{ const cur=cm.getCursor(); const sc=cm.getScrollInfo(); localStorage.setItem(posKey(), JSON.stringify({line:cur.line, ch:cur.ch, scroll:sc.top})); }catch(e){} };
    cm.on('cursorActivity', savePos); cm.on('scroll', savePos);
    // R2 + Faz3) Ctrl-Space: önce LSP (tip-duyarlı), yoksa kelime/sembol tamamlama
    if(window.CodeMirror && CodeMirror.showHint){
      cm.setOption('extraKeys', Object.assign({}, cm.getOption('extraKeys')||{}, { 'Ctrl-Space':(c)=>{ CodeMirror.showHint(c, (cm2, cb)=>this._langHint(cm2, cb), {completeSingle:false, async:true}); } }));
    }
    // Faz 4) Breakpoint gutter'ı
    cm.on('gutterClick', (c, line, gutter)=>this._cmGutterClick(c, line, gutter));
    setTimeout(()=>this._cmBpRefresh(), 60);
    // Faz 3) Yazarken canlı tanı (debounce) + hover
    cm.on('change', ()=>{ if(this._cmSilent) return; this._langScheduleDiag(900); });
    this._cmHoverBind(cm);
    this.langCheck();
    this._langScheduleDiag(500);
    setTimeout(()=>{ try{ cm.focus(); }catch(e){} }, 40);
  }
  _cmDestroy(){
    if(!this._cm) return;
    try{ this._cm.toTextArea(); }catch(e){}
    this._cm=null;
  }
  _bufKey(){ const p=this.state._preview; return (this.sel&&this.sel.id&&p&&p.rel)?('gxBuf::'+this.sel.id+'::'+p.rel):null; }
  _bufSave(v){
    const k=this._bufKey(); if(!k) return;
    try{
      if(String(v||'')===String((this.state._preview&&this.state._preview.content)||'')) localStorage.removeItem(k);
      else localStorage.setItem(k, JSON.stringify({v:String(v||''), at:Date.now()}));
    }catch(e){}
  }
  _bufRestore(){
    const k=this._bufKey(); if(!k) return null;
    try{ const r=JSON.parse(localStorage.getItem(k)||'null'); return (r&&r.v!=null)?r:null; }catch(e){ return null; }
  }
  // --- 6) Sorunlar: çıktı satırlarından dosya:satır topla ---
  _scanProblems(text){
    if(!text) return;
    const re=/([\w@./-]+\.[A-Za-z]{1,8}):(\d+)(?::(\d+))?/g;
    let m; this._probAcc=this._probAcc||new Map();
    for(const line of String(text).split('\n')){
      re.lastIndex=0;
      while((m=re.exec(line))){
        if(/^(https?|node_modules)/.test(m[1])) continue;
        const key=m[1]+':'+m[2];
        if(!this._probAcc.has(key)) this._probAcc.set(key, {file:m[1], line:+m[2], col:m[3]?+m[3]:0, text:line.trim().slice(0,180), severity:/error/i.test(line)?'error':'warning'});
        if(this._probAcc.size>120) break;
      }
    }
  }
  _flushProblems(){
    if(!this._probAcc||!this._probAcc.size) return;
    const arr=[...this._probAcc.values()];
    this._probAcc=new Map();
    const merged=[...(this.state._problems||[])];
    for(const pr of arr){ if(!merged.some(x=>x.file===pr.file&&x.line===pr.line)) merged.push(pr); }
    this.setState({_problems:merged.slice(-120)});
  }
  async runDiag(){
    const root=this.sel&&this.sel._path; if(!root||!(window.galaxy&&window.galaxy.diagRun)) return;
    this.setState({diagBusy:true});
    try{
      const r=await window.galaxy.diagRun({root});
      const probs=(r&&r.problems)||[];
      this.setState({diagBusy:false, _diag:r, _problems:probs, problemsOpen:true});
      this.toast(probs.length?('⚠ '+probs.length+' sorun bulundu ('+((r.ran||[]).join(', ')||'araç yok')+')'):'✓ Tanılama temiz ('+((r&&r.ran||[]).join(', ')||'araç yok')+')', probs.length?'err':'ok');
    }catch(e){ this.setState({diagBusy:false}); }
  }
  // --- 7) Ajan/Claude çalışması bitince değişiklik onayı ---
  _snapshotDirty(){
    const files=((this.state._git&&this.state._git.dirtyFiles)||[]).map(l=>String(l).trim().split(/\s+/).slice(1).join(' ')).filter(Boolean);
    this._runSnapshot=new Set(files);
  }
  async _checkAgentReview(){
    const p=this.sel; if(!p||!p.id||!(window.galaxy&&window.galaxy.gitLog)) return;
    try{
      const g=await window.galaxy.gitLog(p.id); if(!g||!g.ok) return;
      const now=(g.dirtyFiles||[]).map(l=>String(l).trim().split(/\s+/).slice(1).join(' ')).filter(Boolean);
      const snap=this._runSnapshot||new Set();
      const changed=now.filter(f=>!snap.has(f));
      if(changed.length) this.setState({_agentReview:{files:changed, at:Date.now()}});
    }catch(e){}
  }
  async agentReviewAccept(){ this.setState({_agentReview:null}); this._loadGit(); this.toast('✓ Değişiklikler kabul edildi — Git sekmesinden commitleyebilirsin'); }
  async agentReviewRevert(){
    const rev=this.state._agentReview; const p=this.sel;
    if(!rev||!p) return;
    this.askConfirm(rev.files.length+' dosyadaki ajan değişiklikleri geri alınsın mı?', async()=>{
      try{
        const r=await window.galaxy.gitRestoreFiles({projectId:p.id, files:rev.files});
        if(r&&r.ok===false) this.toast('✕ '+((r&&r.error)||'geri alınamadı'),'err'); else this.toast('↩ Ajan değişiklikleri geri alındı');
      }catch(e){ this.toast('✕ geri alınamadı','err'); }
      this.setState({_agentReview:null});
      const pv=this.state._preview; if(pv&&rev.files.includes(pv.rel)) this.openPreview(pv.rel, true);
      this._loadGit();
    }, {title:'Ajan değişikliklerini geri al', okLabel:'Geri al', kind:'danger'});
  }
  // --- 5) Git hunk bazlı stage ---
  _gitHunks(){
    const d=this.state._gitDiff; if(!d||!d.content) return [];
    const lines=String(d.content).split('\n');
    const out=[]; let header=[], i=0;
    while(i<lines.length){
      if(/^diff --git/.test(lines[i])){ header=[lines[i]]; i++;
        while(i<lines.length&&!/^@@/.test(lines[i])&&!/^diff --git/.test(lines[i])){ header.push(lines[i]); i++; }
        continue; }
      if(/^@@/.test(lines[i])){
        const hunk=[lines[i]]; i++;
        while(i<lines.length&&!/^@@/.test(lines[i])&&!/^diff --git/.test(lines[i])){ hunk.push(lines[i]); i++; }
        const hdr=header.slice();
        out.push({label:hunk[0], patch:hdr.concat(hunk).join('\n')+'\n'});
        continue; }
      i++;
    }
    return out.slice(0, 40);
  }
  async gitStageHunk(hunk){
    const p=this.sel; if(!p||!hunk||!(window.galaxy&&window.galaxy.gitApplyPatch)) return;
    try{
      const r=await window.galaxy.gitApplyPatch({projectId:p.id, patch:hunk.patch});
      if(r&&r.ok){ this.toast('✓ Parça sahneye alındı'); this._loadGit(); if(this.state._gitDiff) this.gitViewDiff(this.state._gitDiff.file, false); }
      else this.toast('✕ '+((r&&r.error)||'uygulanamadı'),'err');
    }catch(e){ this.toast('✕ hunk uygulanamadı','err'); }
  }
  _parseChangedLines(diffText){
    const set=new Set(); let newLine=0;
    for(const l of String(diffText||'').split('\n')){
      const m=l.match(/^@@ -\d+(?:,\d+)? \+(\d+)(?:,\d+)? @@/);
      if(m){ newLine=+m[1]; continue; }
      if(/^diff |^index |^--- |^\+\+\+/.test(l)) continue;
      if(l[0]==='+'){ set.add(newLine); newLine++; }
      else if(l[0]==='-'){ /* eski satır */ }
      else if(l[0]==='\\'){ continue; }
      else newLine++;
    }
    return set;
  }

