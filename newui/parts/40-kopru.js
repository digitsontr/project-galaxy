  // ========== GERÇEK VERİ KÖPRÜSÜ (window.galaxy) ==========
  // Mockup'ın sabit örnek verisini gerçek projelerinle değiştirir. window.galaxy
  // yoksa (tarayıcı önizlemesi) örnek veri kalır. Render/stil mantığına dokunmaz;
  // yalnızca PROJECTS/AGENTS/universes gibi KAYNAKLARI canlı veriyle doldurur.
  _statusMap(s){ return ({active:'active',doing:'active',done:'done',archive:'paused',paused:'paused',idle:'paused',waiting:'waiting',unknown:'new','':'new'})[s]||'new'; }
  _mapPlan(plan){ return (plan||[]).map(p=>Array.isArray(p)?[String(p[0]),!!p[1]]:[String(p.text||''),!!p.done]); }
  _mapProject(p){
    return { id:p.id, name:p.name, status:this._statusMap(p.status), prog:p.progress||0,
      warn:(p.staleDays||0)>=2, orbit:true,
      branch:(p.git&&p.git.branch)||'—', stage:p.stage||'', desc:p.desc||'',
      plan:this._mapPlan(p.plan), group:p.group||'Diğer', universe:p.universe,
      _notes:p.notes||'', _links:p.links||[], _path:p.path||'', _git:p.git||null, _stale:p.staleDays||0, _readme:!!p.hasReadme, _remote:!!p.remote };
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
  _asText(v){
    if(v==null||v==='') return '';
    if(typeof v==='string') return v;
    if(typeof v==='number'||typeof v==='boolean') return String(v);
    if(typeof v==='object'){
      for(const k of ['text','prompt','content','sys','message','value']){
        if(v[k]!=null&&v[k]!==v){ const t=this._asText(v[k]); if(t) return t; }
      }
      return '';
    }
    return '';
  }
  _agentPresetDefaults(a){
    const k=String((a&&(a.id||''))+' '+(a&&(a.role||''))+' '+(a&&(a.name||''))).toLowerCase();
    if(/atlas|cto/.test(k)) return ['Durum raporu ver','Riskleri sırala','Bu hafta neye odaklanayım'];
    if(/nav|pm/.test(k)) return ['Standup yap','İhmal edilenleri göster','Sıradaki somut adımlar'];
    if(/doc/.test(k)) return ['README eksiklerini tara','Bu projeye README yaz','Doküman sağlığı'];
    if(/forge|kod/.test(k)) return ['Teknik borcu tara','En riskli 3 proje','Hızlı kazanımlar'];
    if(/mentor|koç/.test(k)) return ['Bu hafta için plan öner','Öğrenme momentumu','Küçük hedef ver'];
    if(/design|ux/.test(k)) return ['Bu ekranı değerlendir','Tema tutarlılığı','UX sorunlarını listele'];
    return ['Durum ver','Ne birikti?','Sıradaki iş'];
  }
  _mapAgent(a){ const c=a.color||'#61dcff'; const av=(window.__resources&&window.__resources['av'+(a.id||'')])||this._avatar(a.name,c);
    let presets=(a.presets||[]).map(p=>typeof p==='string'?{label:p,ask:p}:{label:p.label||p.ask||'',ask:p.ask||p.label||''}).filter(p=>p.ask).slice(0,3);
    if(!presets.length) presets=this._agentPresetDefaults(a).map(x=>({label:x,ask:x}));
    const sys=this._asText(a.sys||a.prompt);
    return { id:a.id, name:a.name, role:a.role||'', color:c, avatar:av, prompt:(presets[0]&&presets[0].ask)||'Durum ver', presets, sys, write:!!a.write, badge:0, msgs:[] }; }
  sendPreset(ask){ if(!ask) return; this._asstOpen(); this.setState({asstInput:ask, asstOpen:true}); setTimeout(()=>this.sendAsst(),30); }
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
        // Gezegen sayısı ne olursa olsun küçük bir yarıçapla it: tam merkez (50,50)
        // uzayın ortasındaki asistan güneşi için boş kalsın, üst üste binmesin.
        const a2=(pi/Math.max(1,n))*Math.PI*2, rad=8+(pi%3)*4;
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
      return { id:u.id, name:u.name, path:u.subtitle||u.root||'', planets:up.length, systems, active, color:`hsl(${hue},72%,62%)`, _hue:hue,
        root:u.root||'', remote:!!u.remote, serverId:u.serverId||null, rootName:u.rootName||'' };
    });
  }
  async _loadReal(){
    if(!(window.galaxy&&window.galaxy.load)){ this.setState({loaded:'preview'}); return; }
    try{
      const scan=await window.galaxy.load();
      this._scan=scan;
      this._allProjects=(scan.projects||[]).map(p=>this._mapProject(p));
      this._unis=this._buildUnis(scan);
      let rawAgents=scan.agents||[];
      try{ if(window.galaxy.agentsFull){ const full=await window.galaxy.agentsFull(); if(Array.isArray(full)&&full.length) rawAgents=full; } }catch(e){}
      const agents=this._keepAgentChat(rawAgents.map(a=>this._mapAgent(a)));
      if(agents.length) this.AGENTS=agents;
      const sess=this._sessRead();
      let uniId=(this._unis[0]&&this._unis[0].id)||null;
      if(sess&&sess.uniId&&this._unis.some(u=>u.id===sess.uniId)) uniId=sess.uniId;
      this._applyUni(uniId);
      let selId=(this.PROJECTS[0]&&this.PROJECTS[0].id)||this.state.selId;
      const all=this._allProjects||this.PROJECTS;
      if(sess&&sess.selId&&all.some(p=>p.id===sess.selId)) selId=sess.selId;
      const ns={loaded:true, uniId, selId};
      if(sess&&sess.tab) ns.tab=(sess.tab==='egitim')?'genel':sess.tab;
      if(sess&&sess.mode==='planet'){ ns.mode='planet'; ns.holdPlanet=true; }
      else if(sess&&sess.mode==='space'){ ns.mode='space'; ns.holdPlanet=false; }
      this.setState(ns);
      this._sessWrite({ uniId, selId, tab:ns.tab||this.state.tab, mode:ns.mode||this.state.mode });
      this._loadSecondary();
      if(ns.mode==='planet') this._loadGit();
      try{ localStorage.removeItem('gxBriefDate'); }catch(e){}
    }catch(e){ console.error('[newui] veri yüklenemedi',e); this.PROJECTS=[]; this._allProjects=[]; this._unis=[]; this.setState({loaded:'error'}); }
  }
  _applyUni(uniId){
    const list=(this._allProjects||[]).filter(p=>p.universe===uniId);
    // Boş evren de olsa PROJECTS'i güncelle (eski evrenin gezegenleri sızmasın)
    this._layout(list); this.PROJECTS=list;
  }
  selectUni(uniId){ this._applyUni(uniId); const selId=(this.PROJECTS[0]&&this.PROJECTS[0].id)||this.state.selId; this.setState({uniId, tab:'evren', mode:'space', holdPlanet:false, moreOpen:false, agentId:null, _fsCwd:'', _preview:null, selId}); this._sessWrite({uniId, selId, tab:'evren', mode:'space'}); this._loadGit(); this._loadTodos(); }
  // Aramadan bir projeye git: gerekirse evreni değiştir, seç, gezegen görünümüne gir.
  _gotoProject(pid){
    const all=this._allProjects||this.PROJECTS; const p=all.find(x=>x.id===pid); if(!p) return;
    if(p.universe && p.universe!==this.state.uniId){ this._applyUni(p.universe); }
    this._recentTouch(pid);
    const prev=this._sessRead();
    this._cmDestroy(); if(this._pty&&this._pty.pid!==pid) this._ptyDispose();
    const ns={uniId:p.universe||this.state.uniId, selId:pid, tab:'evren', mode:'planet', orbitView:false, holdPlanet:true, moreOpen:false, palette:false, query:'', _fsCwd:'', _preview:null, fileTabs:this._wsRestoreTabs(pid), consoleCollapsed:this._consoleCollapsedPref(), activityId:'explorer', leftTab:'agac'};
    this.setState(ns);
    this._watchStartFor();
    const patch={uniId:p.universe||this.state.uniId, selId:pid, tab:'evren', mode:'planet'};
    if(!(prev&&prev.selId===pid)){ patch.lastFile=null; patch.lastFileName=null; }
    this._sessWrite(patch);
    this._loadGit();
    if(prev&&prev.lastFile&&prev.selId===pid){ const rel=prev.lastFile; setTimeout(()=>{ try{ this.openPreview(rel); }catch(e){} }, 80); }
    if(!ns.consoleCollapsed) this._focusConsole();
    this._logActivity('OPEN_PLANET', p.name||'gezegen', {undo:()=>this.back()});
  }
  onSearch(e){ this.setState({query:(e&&e.target&&e.target.value)||'', paletteIdx:0}); }
  onSearchKey(e){
    if(e.key==='Enter'){ e.preventDefault&&e.preventDefault(); this._paletteGo(); }
    else if(e.key==='ArrowDown'){ e.preventDefault&&e.preventDefault(); this._paletteMove(1); }
    else if(e.key==='ArrowUp'){ e.preventDefault&&e.preventDefault(); this._paletteMove(-1); }
    else if(e.key==='Escape'){ this.setState({palette:false,query:'',paletteIdx:0, activityId:this.state.activityId==='search'?'explorer':this.state.activityId}); }
  }
  async _loadSecondary(){
    this._loadDocker();
    try{ if(window.galaxy.scheduleList){ this.setState({_sched:(await window.galaxy.scheduleList())||[]}); } }catch(e){}
    this._loadDb();
    this._loadTodos();
    this._loadServers();
    this._loadReports();
    this._probeClaude();
    this._probeGithub();
    this._loopLoad();
    this._loadUniverseTraffic();
    this._loadPlanetWork();
  }
  async _probeClaude(){
    try{
      if(window.galaxy&&window.galaxy.claudeCheck){ const r=await window.galaxy.claudeCheck(); this.setState({_claudeOk:!!(r&&r.ok)}); }
      else this.setState({_claudeOk:false});
    }catch(e){ this.setState({_claudeOk:false}); }
  }
  // Sol/üst sağlık şeridi — Faz 2: Claude CLI, GitHub, SSH, STT izni tek bakışta.
  async _probeGithub(){
    try{
      if(window.galaxy&&window.galaxy.githubCheck){ const r=await window.galaxy.githubCheck(); this.setState({_githubOk:!!(r&&r.ok), _githubMsg:(r&&r.error)||''}); }
      else this.setState({_githubOk:false});
    }catch(e){ this.setState({_githubOk:false}); }
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
  async srvDelete(id){ try{ await window.galaxy.sshDelete(id); this.toast('✓ sunucu kaldırıldı'); this._loadServers(); this._loadReal(); }catch(e){ this.toast('✕ sunucu kaldırılamadı','err'); } }
  async srvScan(id){ try{ await window.galaxy.sshScan(id); this._loadServers(); this._loadReal(); }catch(e){ this.toast('✕ tarama başarısız','err'); } }
  _uniAct(e, fn){ if(e){ if(e.stopPropagation) e.stopPropagation(); if(e.preventDefault) e.preventDefault(); } if(fn) fn(); }
  _closeUniModal(){ this._uniEditBookmark=null; this.setState({addUni:false, editUniId:null, uniName:'', uniEditRoot:'', uniRemotePath:'', _uniSrvSel:null}); }
  openEditUni(u){ if(!u||!u.id) return;
    const remote=!!u.remote;
    const rootName=u.rootName||((u.name||'').indexOf(' · ')>=0?(u.name.split(' · ').slice(1).join(' · ')):(u.name||''));
    this.setState({ addUni:true, editUniId:u.id, uniSource: remote?'ssh':'local', uniName: remote?rootName:(u.name||''),
      uniEditRoot: u.root||u.path||'', uniRemotePath: remote?(u.root||u.path||''):'', _uniSrvSel:u.serverId||null }); }
  async saveUniEdit(){ const id=this.state.editUniId; const name=String(this.state.uniName||'').trim();
    const root=String((this.state.uniSource==='ssh'?this.state.uniRemotePath:this.state.uniEditRoot)||'').trim();
    if(!id) return; if(!name){ this.toast('evren adı yaz','err'); return; }
    try{ if(!(window.galaxy&&window.galaxy.universeUpdate)){ this.toast('✕ kaydedilemedi','err'); return; }
      const opts={id, name}; if(root) opts.root=root; if(this._uniEditBookmark) opts.bookmark=this._uniEditBookmark;
      const r=await window.galaxy.universeUpdate(opts);
      if(r&&r.ok===false){ this.toast('✕ '+(r.error||'kaydedilemedi'),'err'); return; }
      this._closeUniModal(); this.toast('✓ evren güncellendi'); await this._loadReal();
    }catch(e){ this.toast('✕ kaydedilemedi','err'); } }
  async pickLocalUni(mode){ try{ if(window.galaxy&&window.galaxy.pickFolder){ const r=await window.galaxy.pickFolder(); if(r&&r.path){
    if(mode!=='add' && this.state.editUniId){ this._uniEditBookmark=r.bookmark||null; const name=String(this.state.uniName||'').trim()||(r.path.split('/').filter(Boolean).pop()||'Evren');
      this.setState({uniEditRoot:r.path, uniName:name}); return; }
    const name=r.path.split('/').filter(Boolean).pop()||'Evren'; await window.galaxy.universeAdd({name,root:r.path,bookmark:r.bookmark||null}); this._closeUniModal(); this._loadReal(); } } }catch(e){ this.toast('✕ evren eklenemedi','err'); } }
  // Modalın SSH dalı: seçili sunucuya uzak klasör ekle → o klasör evren olur
  async addRemoteRoot(){ const id=this.state._uniSrvSel; const p=String(this.state.uniRemotePath||'').trim(); if(!id||!p) return;
    const srv=(this.state._servers||[]).find(s=>s.id===id); if(!srv||!window.galaxy||!window.galaxy.sshSave) return;
    const roots=(srv.roots||[]).slice(); if(!roots.some(r=>r.path===p)) roots.push({ path:p, name:(p.replace(/\/+$/,'').split('/').filter(Boolean).pop())||p });
    try{ await window.galaxy.sshSave(Object.assign({},srv,{roots})); if(window.galaxy.sshScan) await window.galaxy.sshScan(id); await this._loadServers(); this._closeUniModal(); this._loadReal(); }catch(e){ this.toast('✕ uzak evren eklenemedi','err'); } }
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
  // ---------- İSTASYON ARAÇLARI (saat · hızlı ara) ----------
  toggleTools(){ const open=!this.state.toolsOpen;
    if(open){ this._toolClock=setInterval(()=>this.setState({_clockTick:Date.now()}),1000); setTimeout(()=>this._focusEl('#gx-tool-find'),100); }
    else { clearInterval(this._toolClock); }
    this.setState({toolsOpen:open, moreOpen:false}); }
  closeTools(){ clearInterval(this._toolClock); this.setState({toolsOpen:false}); }
  onToolFind(e){ this.setState({toolFind:(e&&e.target&&e.target.value)||''}); }
  _toolFindHits(){ const q=String(this.state.toolFind||'').trim().toLowerCase(); if(!q) return [];
    return (this.PROJECTS||[]).filter(p=>String(p.name||'').toLowerCase().includes(q)||String(p.group||'').toLowerCase().includes(q)).slice(0,8); }
  toolGo(id){ if(!id) return; this.closeTools(); this.setState({selId:id}); this.enter(); }
  _clk(){ const d=new Date(), p=n=>String(n).padStart(2,'0');
    let date=''; try{ date=d.toLocaleDateString('tr-TR',{weekday:'long',day:'numeric',month:'long',year:'numeric'}); }catch(e){ date=d.toDateString(); }
    return { hm:p(d.getHours())+':'+p(d.getMinutes()), hms:p(d.getHours())+':'+p(d.getMinutes())+':'+p(d.getSeconds()), date }; }
  // Özellik rehberi (app içi README) — F1 ya da alt bardan
  openGuide(){ this.setState({_guideOpen:true}); }
  closeGuide(){ this.setState({_guideOpen:false}); }
  _helpKey(){ const st=this.state||{}; return st.mode==='planet'?'planet':(st.tab||'genel'); }
  _helpDismissed(){ try{ return JSON.parse(localStorage.getItem('gxHelpDismissed')||'{}'); }catch(e){ return {}; } }
  _helpDismiss(){ const k=this._helpKey(); const m=this._helpDismissed(); m[k]=1; try{ localStorage.setItem('gxHelpDismissed',JSON.stringify(m)); }catch(e){} this.setState({_helpTick:(this.state._helpTick||0)+1}); }
  _helpShow(){ const k=this._helpKey(); const m=this._helpDismissed(); delete m[k]; try{ localStorage.setItem('gxHelpDismissed',JSON.stringify(m)); }catch(e){} this.setState({_helpTick:(this.state._helpTick||0)+1}); }
  _setupHidden(){ try{ return localStorage.getItem('gxSetupDismiss')==='1'; }catch(e){ return false; } }
  dismissSetup(){ try{ localStorage.setItem('gxSetupDismiss','1'); }catch(e){} this._setupForce=false; this.setState({_setupTick:(this.state._setupTick||0)+1}); }
  showSetup(){ try{ localStorage.removeItem('gxSetupDismiss'); }catch(e){} this._setupForce=true; this.setState({_setupTick:(this.state._setupTick||0)+1}); }
  _helpCopy(){
    const map={
      genel:['Özet','Kaldığın işe dön, bekleyen değişiklikleri incele ve açık görevlerini gör.'],
      evren:['Projeler','Bir projeyi tek tıkla aç. j/k ile listede gezebilir, Enter ile seçili projeyi açabilirsin.'],
      planet:['Proje','Üst şerit dal, değişiklik, DB, compose ve port durumunu gösterir. Uzak projeler salt okunur.'],
      db:['Veritabanı','Varsayılan kapsam seçili projedir. Parolalar Mac Anahtar Zinciri’nde tutulur.'],
      docker:['Docker','Varsayılan kapsam seçili projenin compose servisleridir. Başlat, durdur ve logları incele.'],
      pano:['Pano','Kartlar projelere bağlıdır. README eşitlemesi yalnız sen açarsan devreye girer.'],
      zaman:['Zamanlayıcı','Haftalık/günlük ajan görevi. Claude yolu Ayarlar → Araçlar’da olmalı.'],
      dongu:['Döngü','Çalışma alanını tara, ajanı çalıştır, sonucu incele ve raporla.'],
      servers:['Sunucular','Parola saklanmaz. ~/.ssh anahtarı veya SSH config kullanılır; uzak klasör çalışma alanına eklenir.'],
    };
    return map[this._helpKey()]||null;
  }
  _guideData(){ return [
    ['Çalışma Alanları ve Projeler',['Projeler klasörlerine göre çalışma alanlarında düzenlenir','Üst menü: Özet / Projeler / DB / Docker / Pano','Sol listede projeyi tek tıkla aç; j / k ve Enter da kullanılabilir']],
    ['Veritabanı',['DB → Veritabanı bağla (Postgres · MySQL · SQLite)','Parola Mac Anahtar Zinciri’nde şifreli tutulur','Yazma işlemleri onay ister']],
    ['Git ve GitHub',['Önce farkı incele, dosyaları hazırla, sonra commit et','Push ve PR ayrı işlemlerdir','GitHub oturumu Terminal’de gh auth login ile açılır']],
    ['Docker',['Varsayılan kapsam seçili projenin compose servisleridir','Başlat, durdur ve log işlemleri compose.yaml üzerinden çalışır','Port dinlemiyorsa log görünümü açılır']],
    ['Posta',['Postalar Galaxy’de saklanmaz; MCP bağlantısı gerekir','Bağlantı Ayarlar → Posta bölümünden yapılandırılır']],
    ['Uzak Sunucular',['Parola saklanmaz; ~/.ssh anahtarı veya SSH config kullanılır','Uzak klasör çalışma alanı olarak eklenebilir']],
    ['Kaptan',['Üst bardaki Kaptan düğmesinden açılır','Token Galaxy’ye yazılmaz; Claude kendi girişini kullanır','Bağlamsal komutlar tek tıkla çalıştırılabilir']],
    ['Zamanlayıcı',['Haftalık veya günlük otomatik görev kur','Uygulama kapalıysa kaçırılan görev açılışta telafi edilir','Üretilen raporlar alt panelde görünür']],
    ['Döngü',['Çalışma alanını tara → ajanı çalıştır → sonucu incele → raporla']],
    ['Pano, Dosyalar ve Konsol',['Pano görevleri projelere bağlar','Dosyalar orta panelde açılır; yörünge görünümü isteğe bağlıdır','Bash ve Claude konsolları proje klasöründe çalışır']],
    ['⌘ Kısayollar',['⌘K — komut paleti / arama (↑↓ seç, Enter çalıştır)','j / k — uzayda gezegen seç (Enter = in)','Kaptan düğmesi açıkken «Kaptan» de — dinler, komutu yapar','F1 — bu rehber','⌘\\ — README gizle/göster','Esc — katman katman geri','🚀 (alt bar) — HUD paneli + raporlar','Plan maddesine tık → tamam/beklemede']],
  ]; }
  // Global bildirim (toast) — başarı/hata; ~4sn sonra kaybolur. Kaptan açıksa kısa kanıt satırı.
  toast(msg,kind){ if(!msg) return; const id=(this._toastN=(this._toastN||0)+1); const ns={_toast:{msg,kind:kind||'ok'}};
    if(kind==='err') ns._hubPulse='error'; this.setState(ns);
    clearTimeout(this._toastT); this._toastT=setTimeout(()=>{ if(this._toastN===id) this.setState({_toast:null}); },4000);
    if(kind==='err'){ clearTimeout(this._hubPulseT); this._hubPulseT=setTimeout(()=>this.setState({_hubPulse:null}),4000); }
    try{ if(kind!=='err'&&/^✓/.test(String(msg))) this._asstProof(String(msg).replace(/^✓\s*/,'')); }catch(e){} }
  _asstProof(text){ const t=String(text||'').trim(); if(!t) return;
    try{ const A=this._asst; if(!A||!A.open) return; const last=String(((A.msgs||[]).slice(-1)[0]||{}).text||''); if(last===t||last.indexOf(t)===0) return; this._asstSay('assistant', t, {speak:false}); }catch(e){} }
  _pulseHub(kind){ this.setState({_hubPulse:kind||'error'}); clearTimeout(this._hubPulseT); this._hubPulseT=setTimeout(()=>this.setState({_hubPulse:null}),4000); }
  // Aktivite şeridi — toast'lar 4sn'de kaybolur, bu kalıcı bir eylem geçmişi (CREATE_COMMIT, PUSH, OPEN_PLANET, HIDE_PLANET…).
  // Bazı türler (undo verilirse) geri alınabilir; commit/push gibi git işlemleri sadece görülebilir kanıt olarak durur.
  _logActivity(type,label,opts){ opts=opts||{}; this._activityLog=this._activityLog||[];
    this._activityLog.unshift({id:'act'+Date.now()+Math.random().toString(36).slice(2,6), type, label:String(label||''), ts:Date.now(), undo:opts.undo||null, undone:false});
    if(this._activityLog.length>30) this._activityLog.length=30;
    this.setState({_activityTick:(this.state._activityTick||0)+1}); }
  _undoActivity(id){ const a=(this._activityLog||[]).find(x=>x.id===id); if(!a||!a.undo||a.undone) return;
    try{ a.undo(); a.undone=true; this.toast('↺ geri alındı'); }catch(e){}
    this.setState({_activityTick:(this.state._activityTick||0)+1}); }
  openActivity(){ this.setState({activityOpen:true,palette:false}); }
  _ago(ts){ if(!ts) return null; const s=Math.max(0,Math.floor((Date.now()-ts)/1000)); if(s<60) return 'şimdi'; const m=Math.floor(s/60); if(m<60) return m+'dk önce'; const h=Math.floor(m/60); if(h<24) return h+'sa önce'; return Math.floor(h/24)+'g önce'; }
  // Global onay kartı: askConfirm(mesaj, fn, {title, detail, okLabel, kind:'danger'|'warn'})
  askConfirm(msg,fn,opts){ opts=opts||{}; this.setState({_confirm:{msg,fn,title:opts.title||'',detail:opts.detail||'',okLabel:opts.okLabel||'Sil',kind:opts.kind||'danger'}}); }
  runConfirm(){ const c=this.state._confirm; this.setState({_confirm:null}); if(c&&c.fn){ try{ c.fn(); }catch(e){} } }
  cancelConfirm(){ this.setState({_confirm:null,_dbConfirm:null}); }
  // ---------- DOCKER ----------
  // Kadet kaldırıldı — görünüm her zaman tam (eski Komutan)
  _setUiMode(){ this.setState({uiMode:'komutan', moreOpen:false}); }
  // Üst sekme: sahneyi değiştir ama gezegen bağlamını (holdPlanet) silme
  _openTab(id){
    if(id==='egitim') id='genel';
    const fromPlanet=this.state.mode==='planet';
    const ns={tab:id, agentId:null, moreOpen:false};
    if(id==='posta') ns.mailPane=this.state.mailPane||'inbox';
    if(fromPlanet){ ns.mode='space'; ns.holdPlanet=true; }
    else if(this.state.mode!=='space') ns.mode='space';
    if(id==='dongu'||id==='db'||id==='docker'||id==='zaman'||id==='servers'||id==='posta'||id==='pixel'){ ns.leftCollapsed=true; ns.hudOpen=false; }
    else if(id==='genel'||id==='evren'||id==='pano'){ ns.leftCollapsed=false; }
    this._rememberSurface(id);
    if(id==='docker') ns.activityId='docker';
    else if(id==='pixel') ns.activityId='pixel';
    else if(this.state.activityId==='docker'||this.state.activityId==='pixel') ns.activityId='explorer';
    const keepPlanet=fromPlanet||!!this.state.holdPlanet;
    const toolTab=id==='docker'||id==='db'||id==='posta'||id==='servers'||id==='zaman'||id==='dongu'||id==='pixel';
    const persistMode=(toolTab&&keepPlanet)?'planet':(ns.mode||this.state.mode);
    this.setState(ns); this._sessWrite({tab:id, mode:persistMode}); this._onTabOpen(id);
  }
  // Sekme açılınca ilgili veriyi tazele — konteyner/DB/sunucu vb. güncel görünsün
  _onTabOpen(id){ try{
    if(id==='docker'){ this._loadDocker(); this._loadPlanetWork(); }
    else if(id==='db'){ this._loadDb&&this._loadDb(); this._loadPlanetWork(); const b=this.state._pw&&this.state._pw.boundDbId; if(b) this.dbSelectConn(b); }
    else if(id==='servers') this._loadServers&&this._loadServers();
    else if(id==='zaman'){ if(window.galaxy&&window.galaxy.scheduleList) window.galaxy.scheduleList().then(s=>this.setState({_sched:s||[]})); this._loadReports&&this._loadReports(); }
    else if(id==='dongu') this._loopLoad();
    else if(id==='genel') this._loadUniverseTraffic();
    else if(id==='pano'){ this._panoSeeded=null; this._loadTodos(); }
    else if(id==='posta') this._mailLoad();
  }catch(e){} }
  _loopAgent(){ const st=this.state; return (this.AGENTS||[]).find(a=>a.id===st.loopAgentId)||(this.AGENTS||[])[0]||null; }
  _loopOrder(){ return ['tetik','tara','is','incele','bildir']; }
  _loopTitles(){ return {tetik:'Tetik',tara:'Tara',is:'İş',incele:'İncele',bildir:'Bildir'}; }
  _loopDesc(id){
    const ag=this._loopAgent();
    return ({
      tetik:'Başlat. «Turu başlat» ya da Zamanlayıcı bu adımı tetikler.',
      tara:'Bu evrendeki gezegenlere bakar: durgun gün, kirli git, açık plan.',
      is:'Seçili ajanı ('+((ag&&ag.name)||'—')+') taramanın üstüne koşar.',
      incele:'Tur durur. Notunu yaz, kaydet — bir sonraki tura taşınır.',
      bildir:'Kısa toast + Kaptan posta taslağı. MCP bağlıysa gönderir.'
    })[id]||'Döngü: bir tıkla evren taraması. Tetik → Tara → İş → İncele → Bildir.';
  }
  _loopRemember(id, text){ this._loopOutByStep=this._loopOutByStep||{}; this._loopOutByStep[id]=String(text||''); }
  _loopFocusId(){ const st=this.state||{}; return st.loopFocus||st.loopStep||null; }
  _loopScanProjects(){
    const uni=this.state&&this.state.uniId;
    const all=this._allProjects||this.PROJECTS||[];
    if(uni&&this._allProjects) return all.filter(p=>p.universe===uni);
    return this.PROJECTS||[];
  }
  _loopOpenPlan(p){ return (p.plan||[]).filter(i=>Array.isArray(i)?!i[1]:!i.done).length; }
  _loopScanData(){
    const ps=this._loopScanProjects();
    const uni=(this._unis||[]).find(u=>u.id===(this.state&&this.state.uniId));
    const uniName=(uni&&uni.name)||'Evren';
    if(!ps.length) return uniName+' · taranacak proje yok.';
    const active=ps.filter(p=>p.status==='active'||p.status==='doing');
    const stale=active.filter(p=>(p._stale||0)>=14).sort((a,b)=>(b._stale||0)-(a._stale||0));
    const dirty=ps.filter(p=>p._git&&p._git.dirty>0);
    const pend=ps.map(p=>({n:p.name,c:this._loopOpenPlan(p)})).filter(x=>x.c>0).sort((a,b)=>b.c-a.c);
    const L=[uniName+' · '+ps.length+' proje, '+active.length+' aktif.'];
    if(stale.length) L.push('Durgun: '+stale.slice(0,8).map(p=>p.name+' · '+(p._stale||0)+'g').join(', '));
    if(dirty.length) L.push('Kirli git: '+dirty.slice(0,8).map(p=>p.name+' · '+(p._git.branch||'?')+' · '+p._git.dirty+(p._git.ahead?(' · +'+p._git.ahead):'')).join(', '));
    if(pend.length) L.push('Açık plan: '+pend.slice(0,8).map(x=>x.n+' ('+x.c+')').join(', '));
    const notes=String((this.state&&this.state.loopRemarks)||'').trim();
    if(notes) L.push('Önceki not: '+notes.slice(0,240));
    if(L.length===1) L.push('Durgun proje, kirli git veya açık plan yok — evren sakin.');
    return L.join('\n');
  }
  _loopNodes(){
    const st=this.state; const ag=this._loopAgent();
    const order=this._loopOrder(); const cur=order.indexOf(st.loopStep);
    const focus=this._loopFocusId();
    const meta={
      tetik:['Tetik','Turu başlatır'], tara:['Tara','Evreni tarar (stale / git / plan)'],
      is:['İş','Seçili ajanı koşar · '+((ag&&ag.name)||'ajan')], incele:['İncele','Senin notun'], bildir:['Bildir','Toast + posta']
    };
    const th=this._theme();
    const busy=!!st._agentBusy && st.loopStep==='is';
    const touring=!!(this._loopTour||st.loopTour);
    return order.map((id,i)=>{
      const on=st.loopStep===id; const done=cur>i; const sel=focus===id;
      const [label,hint]=meta[id];
      let status='hazır', sc=th.dim;
      if(done){ status='bitti'; sc='#55e88b'; }
      if(on&&busy){ status='çalışıyor'; sc=th.acc; }
      else if(on&&id==='incele'&&touring){ status='sende'; sc='#ffc861'; }
      else if(on){ status='şimdi'; sc=th.acc; }
      else if(sel){ status='seçili'; sc=th.acc; }
      const border=on?(id==='incele'&&touring&&!busy?'#ffc861':th.acc):(sel?th.acc:(done?'rgba(85,232,139,.55)':'var(--gx-line)'));
      const bg=on||sel?th.panel:th.panel2;
      const pulse=busy&&on&&!this._reduced();
      return {
        id, label, hint, status, hasNext:i<order.length-1, idx:String(i+1).padStart(2,'0'),
        onClick:()=>this._loopInspect(id),
        style:`border:1px solid ${border};background:${bg};color:${th.ink};box-shadow:none${pulse?';animation:gxlooprun 1.1s ease-in-out infinite':''}`,
        stStyle:`font-family:'JetBrains Mono',monospace;font-size:10px;letter-spacing:.04em;color:${sc};margin-top:8px;display:flex;align-items:center;gap:6px`
      };
    });
  }
  _loopPaint(){
    const el=document.getElementById('gx-loop-track'); if(!el) return;
    const order=this._loopOrder(); const i=order.indexOf(this.state.loopStep);
    const pct=i<0?0:((i+1)/order.length)*100;
    el.style.width=pct+'%';
  }
  async _loopLoad(){
    try{
      if(window.galaxy&&window.galaxy.loopGet){
        const r=await window.galaxy.loopGet();
        const intro=this.state.loopBody||'';
        this.setState({loopRemarks:(r&&r.remarks)||'', loopLastRun:(r&&r.lastRun)||null, loopBody:intro});
      }
    }catch(e){}
    clearTimeout(this._loopPaintT); this._loopPaintT=setTimeout(()=>this._loopPaint(),0);
  }
  _loopInspect(id){
    const out=(this._loopOutByStep||{})[id];
    let body=out||'';
    if(id==='incele'&&!out){ const note=String(this.state.loopRemarks||'').trim(); body=note||''; }
    if(id==='tara'&&!out) body=this._loopScanData();
    this.setState({loopFocus:id, loopBody:body});
  }
  _loopRun(id){ this._loopExec(id); }
  _loopExec(id){
    const st=this.state;
    if(id==='tetik'){
      const sch=(st._sched||[])[0];
      const body=sch
        ? ('Tur tetiklendi.\nZamanlayıcı: '+(sch.name||sch.task||'görev')+' · '+(sch.when||sch.cron||''))
        : 'Tur tetiklendi.\nElle «Turu başlat» — veya Zamanlayıcı’dan otomatik tur bağla.';
      this._loopRemember('tetik', body);
      this.setState({loopStep:'tetik', loopFocus:'tetik', loopBody:body});
      return;
    }
    if(id==='tara'){
      const data=this._loopScanData();
      this._loopRemember('tara', data);
      this.setState({loopStep:'tara', loopFocus:'tara', loopBody:data, loopScan:data});
      return;
    }
    if(id==='is'){ this._loopWork(); return; }
    if(id==='incele'){
      const note=String(st.loopRemarks||'').trim();
      const work=(this._loopOutByStep||{}).is;
      const body=[work?('Ajan çıktısı:\n'+work):'', note?('Notun:\n'+note):this._loopDesc('incele')].filter(Boolean).join('\n\n');
      this.setState({loopStep:'incele', loopFocus:'incele', loopBody:body});
      return;
    }
    if(id==='bildir'){ this._loopNotify(); }
  }
  _loopClaudeMissing(){
    return this.state&&this.state._claudeOk===false;
  }
  _loopFailIs(msg){
    this._loopTour=false; this._loopRunId=null;
    this._loopRemember('is', msg);
    this.setState({loopStep:'is', loopFocus:'is', loopBody:msg, loopTour:false, _agentBusy:false});
    this.toast(msg,'err');
  }
  _loopWork(){
    const ag=this._loopAgent();
    const scan=this.state.loopScan||this._loopScanData()||'';
    const notes=String(this.state.loopRemarks||'').trim();
    const prompt=['Evren turu — İş adımı.',
      'Aşağıdaki taramaya bak. Durgun veya kirli projeleri öncelikle.',
      'Kısa durum + en fazla 3 somut sonraki adım. Türkçe.',
      notes?('Kullanıcının önceki notu:\n'+notes):'',
      scan].filter(Boolean).join('\n\n');
    this.setState({loopStep:'is', loopFocus:'is', loopScan:scan||this.state.loopScan});
    if(!ag){ this._loopFailIs('Ajan yok — İstasyon’dan bir ajan ekle.'); return; }
    if(this._loopClaudeMissing()){
      this._loopFailIs('Claude CLI yok — ajan koşamaz. Ayarlar’dan Claude yolunu doğrula.');
      return;
    }
    if(!(window.galaxy&&window.galaxy.agentRun)){
      const body='Ajan bu ortamda yok.\n\n'+scan;
      this._loopRemember('is', body);
      this.setState({loopBody:body, _agentBusy:false});
      if(this._loopTour) setTimeout(()=>this._loopAdvanceIncele(), this._reduced()?0:350);
      return;
    }
    this._rc=(this._rc||0)+1; const runId='loop-is-'+this._rc;
    this._runAgents=this._runAgents||{}; this._runAgents[runId]=ag.id; this._loopRunId=runId; this._loopOut='';
    this.setState({loopBody:(ag.name||'Ajan')+' çalışıyor…', _agentBusy:true});
    this._agentRunId=runId;
    Promise.resolve(window.galaxy.agentRun({runId,agentId:ag.id,prompt,projectId:null,continueSession:false})).then(r=>{
      if(r&&r.ok===false){
        const err='✕ '+this._failIpc(r,'ajan başlatılamadı');
        this._agentRunId=null; delete this._runAgents[runId];
        this._loopFailIs(err);
      }
    }).catch(()=>{ this._agentRunId=null; this._loopFailIs('✕ ajan başlatılamadı'); });
  }
  _loopWorkDone(){
    const out=this._loopOut||'ajan bitti';
    this._loopRemember('is', out);
    this._loopRunId=null;
    if(this._loopTour) this._loopAdvanceIncele(out);
    else this.setState({loopBody:out, loopStep:'is', loopFocus:'is', _agentBusy:false});
  }
  _loopAdvanceIncele(out){
    const body=out||(this._loopOutByStep||{}).is||'Ajan bitti — notunu yaz.';
    this.setState({loopStep:'incele', loopFocus:'incele', loopBody:body, _agentBusy:false});
    this.toast('İncele: notunu yaz, kaydet');
  }
  _mailArgs(text, subject){ const to=String(this._mailTo||'').trim();
    return to ? {to:[to], subject:subject||'Galaxy', body:text} : {text}; }
  async _loopNotify(){
    const work=(this._loopOutByStep||{}).is||'';
    const scan=this.state.loopScan||'';
    const remarks=this.state.loopRemarks||'';
    const body=[scan, work, remarks].filter(Boolean).join('\n\n').slice(0,4000);
    const last={ts:Date.now(), text:(body||'boş döngü').slice(0,800)};
    this.toast('Tur bildirildi');
    try{ if(window.galaxy&&window.galaxy.loopSave) await window.galaxy.loopSave({lastRun:last}); }catch(e){}
    let mail='';
    const to=String(this._mailTo||this.state.mailTo||'').trim();
    if(to&&window.galaxy&&window.galaxy.mcpCall){
      try{ const r=await window.galaxy.mcpCall({alias:'send', args:this._mailArgs(body,'Galaxy Döngü')}); mail=(r&&r.ok)?'posta MCP: gitti':('posta: '+((r&&r.error)||'MCP yok')); }
      catch(e){ mail='posta: bağlanamadı'; }
    }
    const shown=(body||'boş döngü')+(mail?('\n\n'+mail):'')+'\n\nPosta taslağı dolduruldu.';
    this._loopRemember('bildir', shown);
    this._loopTour=false;
    this.setState({
      loopStep:'bildir', loopFocus:'bildir', loopTour:false, loopLastRun:last, loopBody:shown,
      mailPane:'compose', mailTo:this.state.mailTo||this._mailTo||'', mailSub:'Galaxy Döngü', mailBody:body
    });
  }
  _loopOpenMail(){
    const body=(this._loopOutByStep||{}).bildir||[this.state.loopScan, (this._loopOutByStep||{}).is, this.state.loopRemarks].filter(Boolean).join('\n\n');
    this._openTab('posta');
    this.setState({mailPane:'compose', mailTo:this.state.mailTo||this._mailTo||'', mailSub:this.state.mailSub||'Galaxy Döngü', mailBody:this.state.mailBody||body});
  }
  async _loopSaveRemarks(){
    const t=String(this.state.loopRemarks||'');
    try{ if(window.galaxy&&window.galaxy.loopSave) await window.galaxy.loopSave({remarks:t}); this.toast('✓ not kaydedildi'); this._loopRemember('incele', t||'not yok'); this.setState({loopStep:'incele', loopFocus:'incele'}); }
    catch(e){ this.toast('✕ kayıt yok','err'); return; }
    if(this._loopTour) await this._loopNotify();
  }
  _loopWait(ms){ return new Promise(r=>setTimeout(r, this._reduced()?0:ms)); }
  _loopStop(){
    this._loopTour=false; this._loopRunId=null;
    try{ if(this._agentRunId&&window.galaxy&&window.galaxy.claudeStop) window.galaxy.claudeStop(this._agentRunId); }catch(e){}
    this._agentRunId=null;
    this.setState({loopTour:false, _agentBusy:false, loopBody:(this.state.loopBody||'')+'\n\nTur durduruldu.'});
    this.toast('Tur durdu');
  }
  async _loopRunAll(){
    if(this._loopTour||this.state._agentBusy){ this._loopStop(); return; }
    this._loopTour=true; this._loopOutByStep={};
    this.setState({loopTour:true, loopFocus:'tetik'});
    this._loopExec('tetik');
    await this._loopWait(280); if(!this._loopTour) return;
    this._loopExec('tara');
    await this._loopWait(280); if(!this._loopTour) return;
    this._loopWork();
  }
  _mailItems(){ const items=[]; const ps=this._allProjects||[];
    const stale=ps.filter(p=>p.status==='active'&&(p._stale||0)>=14).sort((a,b)=>(b._stale||0)-(a._stale||0)).slice(0,6);
    if(stale.length) items.push({kind:'stale gezegen', text:stale.map(p=>p.name+' · '+(p._stale||0)+'g').join('\n')});
    if(this.state.loopLastRun&&this.state.loopLastRun.text) items.push({kind:'döngü çıktısı', text:String(this.state.loopLastRun.text)});
    else if(this.state.loopBody&&this.state.loopStep==='bildir') items.push({kind:'döngü çıktısı', text:String(this.state.loopBody)});
    const dirty=ps.filter(p=>p._git&&p._git.dirty>0).slice(0,5);
    if(dirty.length) items.push({kind:'PR özeti', text:dirty.map(p=>p.name+' · '+(p._git.branch||'?')+' · '+p._git.dirty+' kirli'+(p._git.ahead?(' · +'+p._git.ahead):'')).join('\n')});
    return items; }
  _mailPrettyFrom(s){
    s=String(s||'').replace(/\s+/g,' ').trim();
    const m=s.match(/^"?([^"<]{1,80})"?\s*<([^>]+)>/);
    if(m) return { name:m[1].trim(), email:m[2].trim(), display:m[1].trim() };
    if(/^[^\s]+@[^\s]+$/.test(s)) return { name:s.split('@')[0], email:s, display:s };
    return { name:s, email:'', display:s||'Bilinmeyen' };
  }
  _mailPrettyWhen(s){
    s=String(s||'').trim(); if(!s) return '';
    const n=Number(s); const d=(!isNaN(n)&&n>1e11)?new Date(n):new Date(s);
    if(isNaN(d.getTime())) return s.slice(0,22);
    const now=new Date(); const same=d.toDateString()===now.toDateString();
    const t=d.toLocaleTimeString('tr-TR',{hour:'2-digit',minute:'2-digit'});
    if(same) return t;
    return d.toLocaleDateString('tr-TR',{day:'numeric',month:'short'})+' · '+t;
  }
  _mailStripHeaders(s){
    let t=String(s||'');
    t=t.replace(/^(ID|Message[-_ ]?I[Dd]|Thread[-_ ]?ID|Email[-_ ]?ID|Subject|From|To|Date|Cc|Bcc|Reply-To|Labels?)\s*:[^\n]*/gmi,'');
    t=t.replace(/\s+(ID|Message[-_ ]?I[Dd]|Thread[-_ ]?ID|Subject|From|To|Date|Cc)\s*:[^\n]*/gi,' ');
    return t.replace(/^[ \t]+/gm,'').replace(/\n{3,}/g,'\n\n').trim();
  }
  _mailHtmlToText(s){
    let t=String(s||'');
    t=t.replace(/<script[\s\S]*?<\/script>/gi,' ').replace(/<style[\s\S]*?<\/style>/gi,' ');
    t=t.replace(/<br\s*\/?>/gi,'\n').replace(/<\/p>/gi,'\n\n').replace(/<\/div>/gi,'\n');
    t=t.replace(/<[^>]+>/g,' ');
    return t.replace(/&nbsp;/g,' ').replace(/&amp;/g,'&').replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&#(\d+);/g,(_,n)=>String.fromCharCode(+n)).replace(/[ \t]+\n/g,'\n').replace(/\n{3,}/g,'\n\n').replace(/[ \t]{2,}/g,' ').trim();
  }
  _mailB64(s){
    try{ const n=String(s||'').replace(/-/g,'+').replace(/_/g,'/'); return decodeURIComponent(escape(atob(n))); }catch(e){ try{ return atob(String(s||'').replace(/-/g,'+').replace(/_/g,'/')); }catch(e2){ return ''; } }
  }
  _mailPickField(b, names){
    const re=new RegExp('(?:^|[\\n\\r*\\s])(?:'+names+')\\s*:\\s*(.+?)(?=\\s*(?:\\n|\\r|$)\\s*(?:\\*{0,2})(?:id|message[-_ ]?id|thread[-_ ]?id|email[-_ ]?id|subject|from|to|date|cc)\\s*:|$)','i');
    const m=String(b||'').match(re); return m?String(m[1]).replace(/\*+/g,'').trim():'';
  }
  _mailPickId(b){
    const m=String(b||'').match(/(?:^|\n)\s*\*{0,2}(?:message[-_ ]?id|thread[-_ ]?id|email[-_ ]?id|\bid)\s*:\s*([A-Za-z0-9._+/-]{6,})/i);
    return m?String(m[1]).replace(/[<>]/g,''):'';
  }
  _mailBodyAfterHeaders(t){
    const s=String(t||'');
    const parts=s.split(/\n\s*\n/);
    let body=parts.length>=2?parts.slice(1).join('\n\n').trim():this._mailStripHeaders(s);
    if(!body) body=this._mailStripHeaders(s);
    if(/<[a-z][\s\S]*>/i.test(body)) body=this._mailHtmlToText(body);
    return body;
  }
  _mailFromBlock(b){
    const from=this._mailPickField(b,'from|kimden|sender|from_email')||((String(b).match(/[\w.+-]+@[\w.-]+/)||[])[0]||'');
    const subject=this._mailPickField(b,'subject|konu|title');
    const date=this._mailPickField(b,'date|tarih');
    const id=this._mailPickId(b);
    let body=this._mailBodyAfterHeaders(b);
    const pf=this._mailPrettyFrom(from);
    const snip=(body&&body!==subject)?body.replace(/\s+/g,' '): (subject||body||'');
    return { id, messageId:id, from:pf.display, fromEmail:pf.email, subject:subject||'(konu yok)', date, when:this._mailPrettyWhen(date), snippet:String(snip).slice(0,140), body:body||'' };
  }
  _mailExtract(r){
    const res=r&&(r.result!=null?r.result:r); if(res==null) return '';
    if(typeof res==='string') return res;
    if(res.isError) return String((res.content&&res.content[0]&&res.content[0].text)||res.error||'');
    const c=res.content;
    if(Array.isArray(c)) return c.map(x=>(x&&(x.text||x.content||(typeof x==='string'?x:'')))||'').join('\n');
    if(typeof res.text==='string') return res.text;
    try{ return JSON.stringify(res); }catch(e){ return String(res); }
  }
  _mailDecodePayload(obj){
    if(!obj||typeof obj!=='object') return '';
    const direct=obj.body||obj.text||obj.plain||obj.bodyText||obj.message||obj.content;
    if(direct&&typeof direct==='object'){
      if(typeof direct.text==='string'&&direct.text.trim()) return direct.text;
      if(typeof direct.html==='string'&&direct.html.trim()) return this._mailHtmlToText(direct.html);
    }
    if(typeof direct==='string'&&direct.trim()) return /<[a-z][\s\S]*>/i.test(direct)?this._mailHtmlToText(direct):direct;
    if(typeof obj.html==='string'&&obj.html.trim()) return this._mailHtmlToText(obj.html);
    const texts=[];
    const walk=p=>{
      if(!p||typeof p!=='object') return;
      const mt=String(p.mimeType||p.type||'');
      const data=p.body&&(p.body.data||p.body.content);
      if(typeof data==='string'&&data.length>8){
        const decoded=/^[A-Za-z0-9+/_=-]+$/.test(data.replace(/\s/g,''))? (this._mailB64(data)||data):data;
        texts.push(/html/i.test(mt)?this._mailHtmlToText(decoded):decoded);
      }
      (p.parts||p.payload&&p.payload.parts||[]).forEach(walk);
    };
    walk(obj.payload||obj);
    return texts.filter(t=>t&&t.trim()).join('\n\n');
  }
  _mailParseRead(raw, fallback){
    const fb=fallback||{};
    const t=String(raw||'').trim();
    if(!t) return { from:fb.from, fromEmail:fb.fromEmail, subject:fb.subject, body:fb.body||fb.snippet||'' };
    const tryJ=s=>{ try{ return JSON.parse(s); }catch(e){ return null; } };
    let j=tryJ(t);
    if(!j){ const m=t.match(/(\{[\s\S]*\}|\[[\s\S]*\])/); if(m) j=tryJ(m[1]); }
    if(j){
      const o=Array.isArray(j)?j[0]:(j.email||j.message||j.data||j);
      if(o&&typeof o==='object'){
        const hdr=(n)=>{ const hs=(o.payload&&o.payload.headers)||o.headers||[]; const h=hs.find(x=>String(x.name||'').toLowerCase()===n); return (h&&h.value)||''; };
        const from=String(o.from||o.sender||o.from_email||o.fromEmail||o.from_address||hdr('from')||fb.from||'');
        const subject=String(o.subject||o.title||hdr('subject')||fb.subject||'');
        const pf=this._mailPrettyFrom(from);
        let body=this._mailDecodePayload(o);
        if(!body) body=this._mailStripHeaders(typeof o.body==='string'?o.body:t);
        if(/<[a-z][\s\S]*>/i.test(body)) body=this._mailHtmlToText(body);
        return { from:pf.display||fb.from, fromEmail:pf.email||fb.fromEmail, subject:subject||fb.subject, body:body||fb.body||fb.snippet||'' };
      }
    }
    const blk=this._mailFromBlock(t);
    const body=blk.body||this._mailBodyAfterHeaders(t)||fb.body||fb.snippet||'';
    const subj=(blk.subject&&blk.subject!=='(konu yok)')?blk.subject:(fb.subject||blk.subject||'(konu yok)');
    return { from:blk.from&&blk.from!=='Bilinmeyen'?blk.from:fb.from, fromEmail:blk.fromEmail||fb.fromEmail, subject:subj, body };
  }
  _mailParseInbox(raw){
    const t=String(raw||'').trim(); if(!t) return [];
    const hdr=(m,n)=>{ const hs=(m&&m.payload&&m.payload.headers)||(m&&m.headers)||[]; const h=hs.find(x=>String(x.name||'').toLowerCase()===n); return (h&&h.value)||''; };
    const asObj=m=>{
      const from=String(m.from||m.sender||m.from_email||m.fromEmail||m.from_address||m.fromAddress||m.from_name||m.fromName||m.From||hdr(m,'from')||'');
      const subject=String(m.subject||m.title||m.Subject||hdr(m,'subject')||'(konu yok)');
      const date=String(m.date||m.internalDate||m.Date||m.received||hdr(m,'date')||'');
      const rawBody=this._mailDecodePayload(m)||String(m.body||m.text||m.snippet||m.preview||'');
      const pf=this._mailPrettyFrom(from);
      const body=this._mailStripHeaders(rawBody)||rawBody;
      const snip=this._mailStripHeaders(String(m.snippet||m.preview||m.snippetText||body||subject)).replace(/\s+/g,' ');
      const id=String(m.id||m.messageId||m.message_id||m.emailId||m.email_id||m.uid||m.Id||'');
      return { id, messageId:id, from:pf.display, fromEmail:pf.email, subject, date, when:this._mailPrettyWhen(date), snippet:String(snip||subject).slice(0,140), body };
    };
    const tryJ=s=>{ try{ return JSON.parse(s); }catch(e){ return null; } };
    let j=tryJ(t);
    if(!j){ const m=t.match(/(\[[\s\S]*\]|\{[\s\S]*\})/); if(m) j=tryJ(m[1]); }
    if(j){
      const arr=Array.isArray(j)?j:(j.messages||j.emails||j.threads||j.results||j.data||[]);
      if(Array.isArray(arr)&&arr.length) return arr.slice(0,40).map(asObj);
    }
    let chunks=t.split(/\n(?=\s*\*{0,2}(?:ID|Message[-_ ]?ID|Email[-_ ]?ID)\s*:)/i).map(b=>b.trim()).filter(Boolean);
    if(chunks.length<=1) chunks=t.split(/\n{2,}/).map(b=>b.trim()).filter(b=>b.length>8);
    const items=[];
    for(const b of chunks){
      if(/(?:^|\n)\s*\*{0,2}(?:id|message[-_ ]?id|subject|from|konu|kimden)\s*:/i.test(b)) items.push(this._mailFromBlock(b));
    }
    if(items.length) return items.filter(x=>x.id||x.subject!=='(konu yok)'||x.from!=='Bilinmeyen').slice(0,40);
    return t.split(/\n/).filter(l=>l.trim()).slice(0,20).map((l)=>this._mailFromBlock(l));
  }
  _mailPickTool(tools, re, fallback){ const n=(tools||[]).map(t=>t.name||t).find(x=>re.test(String(x||''))); return n||fallback||''; }
  async _mailInbox(){
    const tools=this._mcpTools||[];
    const list=this._mailListTool||this._mailPickTool(tools, /search_?emails?|list_?emails?|list_?messages?|get_inbox|gmail[_-]?(search|list|messages)?/i, '');
    if(!list){ this.setState({_inbox:[], mailSel:null, mailReadBody:'', mailStatus:(this.state.mailStatus||'')+' · liste aracı yok'}); return; }
    this._mailListTool=list;
    try{
      let r=await window.galaxy.mcpCall({alias:'list', name:list, args:{query:'in:inbox', maxResults:20}});
      if(!(r&&r.ok)) r=await window.galaxy.mcpCall({alias:'list', name:list, args:{q:'in:inbox', max:20, limit:20}});
      if(!(r&&r.ok)){ const msg=this._friendlyFail(r,'liste yok','mcp'); this.setState({_inbox:[], mailSel:null, mailReadBody:'', mailStatus:'✕ '+msg}); return; }
      const parsed=this._mailParseInbox(this._mailExtract(r));
      const first=parsed[0]||null;
      this.setState({_inbox:parsed, mailSel:first, mailReadBody:first?(first.body||first.snippet||''):'', mailReadHint:'', mailStatus:(parsed.length||0)+' posta'});
      if(first) this._mailOpen(first);
    }catch(e){ this.setState({_inbox:[], mailSel:null, mailReadBody:'', mailStatus:'✕ gelen kutu'}); }
  }
  async _mailOpen(im){
    if(!im) return;
    const preview=String(im.body||im.snippet||'').trim();
    this.setState({mailSel:im, mailReadBody:preview, mailReadHint:preview?'':'İçerik yükleniyor…'});
    const id=String(im.id||im.messageId||'').trim();
    const tools=this._mcpTools||[];
    const read=this._mailReadTool||this._mailPickTool(tools, /read_?e?mails?|get_?e?mails?|get_?messages?|fetch_?e?mails?|gmail[_-]?(read|get|message)/i, '');
    if(!read){ this.setState({mailReadHint:preview?'':'Oku aracı yok — Ayarlar → Posta’da read_email yaz.'}); return; }
    if(!id){ this.setState({mailReadHint:preview?'':'Bu postanın kimliği yok, gövde çekilemedi.'}); return; }
    this._mailReadTool=read;
    try{
      let r=await window.galaxy.mcpCall({alias:'read', name:read, args:{messageId:id}});
      if(!(r&&r.ok)) r=await window.galaxy.mcpCall({alias:'read', name:read, args:{id}});
      if(!(r&&r.ok)) r=await window.galaxy.mcpCall({alias:'read', name:read, args:{message_id:id}});
      if(!(r&&r.ok)){ this.setState({mailReadBody:preview, mailReadHint:(r&&r.error)||'posta okunamadı'}); return; }
      const parsed=this._mailParseRead(this._mailExtract(r), im);
      const body=String(parsed.body||preview||'').trim();
      this.setState({
        mailSel:Object.assign({},im,{from:parsed.from||im.from, fromEmail:parsed.fromEmail||im.fromEmail, subject:parsed.subject||im.subject}),
        mailReadBody:body,
        mailReadHint:body?'':('Gövde boş geldi. '+(preview?'Önizleme gösterildi.':'HTML-only veya oku aracı farklı argüman bekliyor olabilir.'))
      });
    }catch(e){ this.setState({mailReadBody:preview, mailReadHint:'posta okunamadı'}); }
  }
  async _mailLoad(){ try{ if(window.galaxy&&window.galaxy.loopGet){ const r=await window.galaxy.loopGet(); if(r&&r.lastRun) this.setState({loopLastRun:r.lastRun}); }
      if(window.galaxy&&window.galaxy.mcpList){ const r=await window.galaxy.mcpList();
        const tools=(r&&r.tools)||[]; this._mcpTools=tools;
        const aliases=(r&&r.aliases)||{};
        if(aliases.list) this._mailListTool=aliases.list;
        if(aliases.read) this._mailReadTool=aliases.read;
        const st=(r&&r.ok)?((tools.length)+' MCP araç'):((r&&r.error)||'MCP bağlı değil');
        this.setState({mailStatus:st, mailPane:this.state.mailPane||'inbox'});
        if(r&&r.ok) this._mailInbox();
      } else this.setState({mailStatus:''});
    }catch(e){ this.setState({mailStatus:'MCP yok'}); } }
