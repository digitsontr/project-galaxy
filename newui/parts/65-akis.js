  // --- Proje haritası: gezegen ana ekranında veri katmanı + tam ekran akış şeması ---
  // Veri lib/project-map.js'ten (worker) gelir. Şema SVG olarak #gx-flow-canvas'a elle çizilir;
  // seçim/odak/arama durumu state'te, kaydırma-yakınlaştırma ise this._flowView'da (yeniden render'sız).
  async _loadProjMap(force){
    const p=this.sel; if(!p||!p.id||!(window.galaxy&&window.galaxy.projectMap)) return;
    const cur=this.state._pmap;
    if(!force&&cur&&cur.pid===p.id&&(Date.now()-(cur.at||0)<30000)) return;
    if(!force&&this._pmapLoading===p.id) return;
    this._pmapLoading=p.id;
    this.setState({_pmapBusy:p.id});
    let r=null;
    try{ r=await window.galaxy.projectMap({projectId:p.id, force:!!force}); }catch(e){ r={ok:false, error:'analiz edilemedi'}; }
    if(this._pmapLoading===p.id) this._pmapLoading=null;
    if(!this.sel||this.sel.id!==p.id){ this.setState({_pmapBusy:null}); return; }
    this.setState({_pmap:Object.assign({pid:p.id, at:Date.now()}, r||{ok:false, error:'yanıt yok'}), _pmapBusy:null});
    const b=this._pmapBound();
    if(b) this._loadBoundLive(b.id); else this.setState({_pdbLive:null});
  }
  _pmapCur(){ const m=this.state._pmap; return (m&&this.sel&&m.pid===this.sel.id)?m:null; }
  _pmapBound(){ const m=this._pmapCur(); const n=m&&m.ok&&(m.nodes||[]).find(x=>x.kind==='db'&&x.bound); return n?n.bound:null; }
  async _loadBoundLive(id){
    if(!(window.galaxy&&window.galaxy.dbTables)) return;
    this.setState({_pdbLive:{id, busy:true, tables:[]}});
    try{ const r=await window.galaxy.dbTables({id}); this.setState({_pdbLive:{id, ok:!!(r&&r.ok), tables:(r&&r.tables)||[], error:(r&&!r.ok&&r.error)||''}}); }
    catch(e){ this.setState({_pdbLive:{id, ok:false, tables:[], error:'ulaşılamadı'}}); }
  }
  async _openBoundTable(t){
    const b=this._pmapBound(); if(!b) return;
    if(this.state.flowOpen) this.closeFlow();
    this._openTab('db');
    try{ await this.dbSelectConn(b.id); }catch(e){}
    if(t) this.dbOpenTable(t);
  }
  async _bindFromMap(){ await this._bindPlanetDb(); this._loadProjMap(true); }
  openFlow(selId){
    if(!this.sel) return;
    this._flowView=null;
    this.setState({flowOpen:true, flowFocus:null, flowSel:selId||null, flowQuery:'', flowStory:null, flowStoryIdx:0});
    this._loadProjMap(false);
  }
  closeFlow(){ this.setState({flowOpen:false, flowSel:null, flowFocus:null, flowQuery:'', flowStory:null, flowStoryIdx:0}); }
  _flowSetFocus(id){ this._flowView=null; this.setState({flowFocus:id||null, flowSel:null}); }
  _flowOpenFile(rel, line){
    if(!rel) return;
    this.closeFlow();
    if(this.state.mode!=='planet'&&!this.state.holdPlanet&&this.enter) this.enter();
    this._openFilePreview(rel);
    if(line>1) setTimeout(()=>this._gotoLine(line), 340);
  }

  _flowFnId(rel, name){ return 'fn:'+rel+':'+name; }
  _flowFileGraph(m, rel){
    const f=(m.files||[]).find(x=>x.rel===rel); if(!f) return {nodes:[], edges:[]};
    const byRel=new Map((m.files||[]).map(x=>[x.rel,x]));
    const nodes=[], have=new Set();
    const addN=n=>{ if(n&&n.id&&!have.has(n.id)){ have.add(n.id); nodes.push(n); } };
    const edges=[], ek=new Set();
    const addE=(from,to,kind,n)=>{ if(!from||!to||from===to) return; const k=from+'>'+to+'>'+kind; if(ek.has(k)) return; ek.add(k); edges.push({from,to,kind,n:n||1}); };
    addN({ id:'file:'+rel, kind:'file', label:(rel.split('/').pop()), path:rel, file:rel, lines:f.lines, role:'logic' });
    (f.fns||[]).forEach(fn=>{
      addN({ id:this._flowFnId(rel, fn.name), kind:fn.kind==='route'?'route':'fn', label:fn.name, file:rel, line:fn.line, path:rel, role:fn.kind==='route'?'api':'logic', sub:rel.split('/').pop()+':'+(fn.line||1) });
      addE('file:'+rel, this._flowFnId(rel, fn.name), 'run', 1);
    });
    (f.calls||[]).forEach(c=>{
      const fromId=c.from?this._flowFnId(rel, c.from):('file:'+rel);
      if(c.from) addN({ id:fromId, kind:'fn', label:c.from, file:rel, path:rel, role:'logic' });
      if(c.toRel && c.toRel!==rel){
        const toF=byRel.get(c.toRel);
        const toId=(toF&&(toF.fns||[]).some(x=>x.name===c.to))?this._flowFnId(c.toRel, c.to):('file:'+c.toRel);
        if(toId.indexOf('fn:')===0){
          const tf=(toF.fns||[]).find(x=>x.name===c.to);
          addN({ id:toId, kind:'fn', label:c.to, file:c.toRel, line:tf&&tf.line, path:c.toRel, role:'logic', sub:c.toRel.split('/').pop() });
        } else addN({ id:toId, kind:'file', label:c.toRel.split('/').pop(), path:c.toRel, file:c.toRel, role:'logic' });
        addE(fromId, toId, 'call', 1);
      } else {
        const local=(f.fns||[]).some(x=>x.name===c.to);
        const toId=local?this._flowFnId(rel, c.to):fromId;
        if(local && toId!==fromId) addE(fromId, toId, 'call', 1);
      }
    });
    (f.db||[]).forEach(id=>{ const n=(m.nodes||[]).find(x=>x.id===id); if(n){ addN(n); addE('file:'+rel, id, 'db', 1); } });
    (f.ext||[]).forEach(id=>{ const n=(m.nodes||[]).find(x=>x.id===id); if(n){ addN(n); addE('file:'+rel, id, 'ext', 1); } });
    return {nodes, edges};
  }
  _flowGraph(){
    const m=this._pmapCur(); if(!m||!m.ok) return {nodes:[], edges:[]};
    const focus=this.state.flowFocus;
    if(focus && String(focus).indexOf('file:')===0) return this._flowFileGraph(m, focus.slice(5));
    const grp=focus&&(m.nodes||[]).find(n=>n.id===focus);
    if(!grp) return {nodes:m.nodes||[], edges:m.edges||[]};
    const inG=new Set(grp.files||[]);
    const byId=new Map((m.nodes||[]).map(n=>[n.id,n]));
    const fileGroup=new Map((m.files||[]).map(f=>[f.rel,f.group]));
    const nodes=[], have=new Set(), agg=new Map();
    const addN=n=>{ if(n&&!have.has(n.id)){ have.add(n.id); nodes.push(n); } };
    const addE=(from,to,kind,n)=>{ if(!from||!to||from===to) return; const k=from+'>'+to+'>'+kind; const e=agg.get(k)||{from,to,kind,n:0}; e.n+=n||1; agg.set(k,e); };
    const files=(m.files||[]).filter(f=>inG.has(f.rel));
    files.forEach(f=>addN({ id:'file:'+f.rel, kind:'file', label:f.rel.split('/').pop(), path:f.rel, file:f.rel, lines:f.lines, role:grp.role,
      routes:(f.routes||[]).filter(r=>r.kind==='http').length, pages:(f.routes||[]).filter(r=>r.kind==='page').length, ipc:(f.ipc||[]).length, tables:f.tables||[] }));
    for(const e of (m.fileEdges||[])){
      const a=inG.has(e.from), b=inG.has(e.to); if(!a&&!b) continue;
      const from=a?'file:'+e.from:fileGroup.get(e.from), to=b?'file:'+e.to:fileGroup.get(e.to);
      if(!a) addN(byId.get(from)); if(!b) addN(byId.get(to));
      addE(from,to,e.kind,e.n);
    }
    for(const f of files){
      for(const d of (f.db||[])) if(byId.get(d)){ addN(byId.get(d)); addE('file:'+f.rel,d,'db',1); }
      for(const x of (f.ext||[])) if(byId.get(x)){ addN(byId.get(x)); addE('file:'+f.rel,x,'ext',1); }
    }
    for(const n of (m.nodes||[])) if(n.kind==='entry'&&inG.has(n.file)){ addN(n); addE(n.id,'file:'+n.file,'run',1); }
    return {nodes, edges:[...agg.values()].filter(e=>have.has(e.from)&&have.has(e.to))};
  }

  // Katmanlı yerleşim: giriş → (import/IPC/HTTP sırasına göre) katmanlar → veri + dış servis.
  // Döngüler DFS ile kırılır; sütun içi sıra barycenter ile kesişmeleri azaltır.
  _flowLayout(g){
    const W=228, H=78, CG=72, RG=22, PAD=56;
    const nodes=g.nodes||[], edges=g.edges||[];
    const isMid=n=>n.kind!=='entry'&&n.kind!=='db'&&n.kind!=='ext';
    const mid=nodes.filter(isMid), midSet=new Set(mid.map(n=>n.id));
    const out=new Map(mid.map(n=>[n.id,[]]));
    edges.forEach(e=>{ if(midSet.has(e.from)&&midSet.has(e.to)&&e.from!==e.to&&e.kind!=='run') out.get(e.from).push(e.to); });
    const mark=new Map(), back=new Set(), order=[];
    const visit=(id)=>{
      const stack=[[id,0]]; mark.set(id,1);
      while(stack.length){
        const top=stack[stack.length-1], v=top[0], outs=out.get(v)||[];
        if(top[1]<outs.length){ const w=outs[top[1]++]; const s=mark.get(w);
          if(s===1) back.add(v+'>'+w); else if(!s){ mark.set(w,1); stack.push([w,0]); } }
        else { mark.set(v,2); order.push(v); stack.pop(); }
      }
    };
    const starts=edges.filter(e=>e.kind==='run'&&midSet.has(e.to)).map(e=>e.to);
    starts.forEach(id=>{ if(!mark.get(id)) visit(id); });
    mid.slice().sort((a,b)=>(out.get(b.id)||[]).length-(out.get(a.id)||[]).length).forEach(n=>{ if(!mark.get(n.id)) visit(n.id); });
    const rank=new Map(mid.map(n=>[n.id,0]));
    order.slice().reverse().forEach(v=>(out.get(v)||[]).forEach(w=>{ if(!back.has(v+'>'+w)) rank.set(w, Math.max(rank.get(w), rank.get(v)+1)); }));
    const hasEntry=nodes.some(n=>n.kind==='entry');
    const base=hasEntry?1:0;
    let maxMid=base-1;
    const col=new Map();
    nodes.forEach(n=>{
      if(n.kind==='entry') col.set(n.id,0);
      else if(isMid(n)){ const c=base+Math.min(rank.get(n.id)||0, 8); col.set(n.id,c); maxMid=Math.max(maxMid,c); }
    });
    const lastCol=maxMid+1;
    nodes.forEach(n=>{ if(n.kind==='db'||n.kind==='ext') col.set(n.id,lastCol); });
    const roleRank={ui:0, api:1, logic:2, data:3, config:4, test:5};
    const cols=[];
    nodes.forEach(n=>{ const c=col.get(n.id); (cols[c]=cols[c]||[]).push(n); });
    for(let c=0;c<cols.length;c++){ cols[c]=(cols[c]||[]).sort((a,b)=>{
      const ka=a.kind==='db'?0:a.kind==='ext'?1:(roleRank[a.role]!=null?roleRank[a.role]:2), kb=b.kind==='db'?0:b.kind==='ext'?1:(roleRank[b.role]!=null?roleRank[b.role]:2);
      return ka-kb || String(a.label).localeCompare(String(b.label)); }); }
    const nbr=new Map(nodes.map(n=>[n.id,[]]));
    edges.forEach(e=>{ if(nbr.has(e.from)&&nbr.has(e.to)){ nbr.get(e.from).push(e.to); nbr.get(e.to).push(e.from); } });
    const idx=new Map();
    const reindex=()=>cols.forEach(list=>(list||[]).forEach((n,i)=>idx.set(n.id,i)));
    reindex();
    for(let pass=0;pass<6;pass++){
      const dir=pass%2===0?1:-1;
      const range=dir>0?[...cols.keys()]:[...cols.keys()].reverse();
      for(const c of range){
        const list=cols[c]; if(!list||list.length<2) continue;
        const ref=c-dir;
        const bary=new Map(list.map(n=>{ const ns=nbr.get(n.id).filter(x=>col.get(x)===ref); return [n.id, ns.length?ns.reduce((s,x)=>s+idx.get(x),0)/ns.length:idx.get(n.id)]; }));
        list.sort((a,b)=>(a.kind==='ext')-(b.kind==='ext') || bary.get(a.id)-bary.get(b.id));
        reindex();
      }
    }
    const heights=cols.map(list=>(list||[]).length*(H+RG)-RG);
    const maxH=Math.max(H, ...heights);
    const pos=new Map();
    cols.forEach((list,c)=>{ const off=(maxH-heights[c])/2; (list||[]).forEach((n,i)=>pos.set(n.id,{x:PAD+c*(W+CG), y:PAD+28+off+i*(H+RG), w:W, h:H, col:c})); });
    return { pos, back, W, H, CG, cols:cols.length, hasEntry, lastCol, width:PAD*2+cols.length*(W+CG)-CG, height:PAD*2+28+maxH };
  }

  _flowColor(n){
    if(n.kind==='entry') return 'var(--gx-ok)';
    if(n.kind==='db') return 'var(--gx-warn)';
    if(n.kind==='ext') return '#ef8bc0';
    if(n.kind==='fn') return '#7dd3fc';
    if(n.kind==='route') return 'var(--gx-violet)';
    return ({ui:'var(--gx-accent)', api:'var(--gx-violet)', data:'var(--gx-warn)', config:'#7d8aa8', test:'#7d8aa8'})[n.role]||'#8fa3c8';
  }
  _flowIcon(n){
    if(n.kind==='entry') return '▶'; if(n.kind==='db') return '◉'; if(n.kind==='ext') return '☁'; if(n.kind==='file') return '▤';
    if(n.kind==='fn') return 'ƒ'; if(n.kind==='route') return '⇄';
    return ({ui:'▣', api:'⇄', data:'▦', config:'⚙', test:'✓'})[n.role]||'◆';
  }
  _flowSub(n){
    const k=v=>v>=1000?(Math.round(v/100)/10)+'k':String(v||0);
    if(n.kind==='entry') return n.sub||'';
    if(n.kind==='db'){ const b=n.bound; if(b) return '● '+(b.name||'bağlı'); const e=n.env; if(e&&(e.database||e.host)) return (e.database||'')+(e.host?' @ '+e.host:''); if(n.compose) return 'compose: '+n.compose.service; if((n.models||[]).length) return 'Prisma · '+n.models.length+' model'; return (n.files||[]).length+' dosya erişiyor'; }
    if(n.kind==='ext') return (n.files||[]).length+' dosya';
    if(n.kind==='fn'||n.kind==='route') return (n.file||'').split('/').pop()+(n.line?(':'+n.line):'');
    if(n.kind==='file') return k(n.lines)+' satır';
    return (n.single?'':(n.files||[]).length+' dosya · ')+k(n.lines)+' satır';
  }
  _flowBadges(n){
    const b=[];
    if(n.routes) b.push('⇄ '+n.routes+' rota');
    if(n.pages) b.push('▣ '+n.pages+' sayfa');
    if(n.ipc) b.push('⚡ '+n.ipc+' IPC');
    if(n.kind!=='db'&&(n.tables||[]).length) b.push('▦ '+n.tables.length+' tablo');
    if(n.kind==='db'){ const t=(n.tables||[]).length, mo=(n.models||[]).length; if(mo) b.push(mo+' model'); else if(t) b.push(t+' tablo'); if((n.sources||[]).length) b.push(n.sources.slice(0,3).join(' · ')); }
    return b.join('   ');
  }
  _flowEsc(s){ return String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[c]); }
  _flowCut(s,n){ s=String(s||''); return s.length>n?s.slice(0,n-1)+'…':s; }

  _flowEnsure(){ if(this._flowRaf) return; this._flowRaf=setTimeout(()=>{ this._flowRaf=null; this._flowPaint(); }, 0); }
  _flowPaint(){
    const el=document.getElementById('gx-flow-canvas'); if(!el) return;
    const st=this.state, m=this._pmapCur();
    const sig=[m&&m.pid, m&&m.at, st.flowFocus, st.flowSel, st.flowQuery, st.flowStoryIdx].join('|');
    if(el.dataset.sig===sig&&el.querySelector('svg')) return;
    el.dataset.sig=sig;
    if(!m||!m.ok){ el.innerHTML=''; return; }
    const g=this._flowGraph(), L=this._flowLayout(g);
    this._flowLast={g, L};
    const E=s=>this._flowEsc(s);
    const sel=st.flowSel, q=String(st.flowQuery||'').trim().toLowerCase();
    const link=new Set();
    if(sel){ link.add(sel); g.edges.forEach(e=>{ if(e.from===sel) link.add(e.to); if(e.to===sel) link.add(e.from); }); }
    const hit=n=>!q||String(n.label||'').toLowerCase().includes(q)||String(n.path||n.file||'').toLowerCase().includes(q);
    const ECOL={import:'#5d6b8c', ipc:'var(--gx-violet)', http:'var(--gx-accent)', db:'var(--gx-warn)', ext:'#ef8bc0', run:'var(--gx-ok)', call:'#7dd3fc'};
    const ELBL={import:'import', ipc:'IPC / köprü', http:'HTTP çağrısı', db:'veritabanı erişimi', ext:'dış servis', run:'başlatır', call:'çağrı'};
    let defs='<defs>';
    for(const [k,c] of Object.entries(ECOL)) defs+='<marker id="gxa-'+k+'" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" style="fill:'+c+'"></path></marker>';
    defs+='</defs>';
    let heads='';
    for(let c=0;c<L.cols;c++){
      const x=56+c*(L.W+L.CG);
      const t=(L.hasEntry&&c===0)?'GİRİŞ':(c===L.lastCol&&g.nodes.some(n=>(n.kind==='db'||n.kind==='ext')))?'VERİ · DIŞ SERVİS':('KATMAN '+(c-(L.hasEntry?1:0)+1));
      heads+='<text x="'+x+'" y="40" style="fill:#7d8aa8;font:600 10.5px \'JetBrains Mono\',monospace;letter-spacing:.14em">'+t+'</text>';
    }
    let paths='';
    for(const e of g.edges){
      const a=L.pos.get(e.from), b=L.pos.get(e.to); if(!a||!b) continue;
      const on=!sel||(e.from===sel||e.to===sel);
      const w=Math.min(1.2+Math.log2((e.n||1)+1)*0.7, 4.2);
      let d;
      if(b.col>a.col){ const sx=a.x+a.w, sy=a.y+a.h/2, tx=b.x, ty=b.y+b.h/2, dx=Math.max(40,(tx-sx)/2); d='M'+sx+','+sy+' C'+(sx+dx)+','+sy+' '+(tx-dx)+','+ty+' '+tx+','+ty; }
      else { const sx=a.x+a.w/2, sy=a.y+a.h, tx=b.x+b.w/2, ty=b.y+b.h, dy=48+Math.abs(a.y-b.y)*0.15; d='M'+sx+','+sy+' C'+sx+','+(sy+dy)+' '+tx+','+(ty+dy)+' '+tx+','+ty; }
      const dash=e.kind==='ipc'||e.kind==='http'?'6 4':e.kind==='ext'?'2 4':'none';
      paths+='<path d="'+d+'" style="fill:none;stroke:'+ECOL[e.kind]+';stroke-width:'+w.toFixed(2)+';stroke-dasharray:'+dash+';opacity:'+(on?(sel?0.95:0.6):0.08)+'" marker-end="url(#gxa-'+e.kind+')"><title>'+E(ELBL[e.kind]+' · '+(e.n||1))+'</title></path>';
    }
    let boxes='';
    for(const n of g.nodes){
      const p=L.pos.get(n.id); if(!p) continue;
      const c=this._flowColor(n), isSel=n.id===sel, dim=(sel&&!link.has(n.id))||(q&&!hit(n));
      const strong=isSel||(q&&hit(n));
      const drill=n.kind==='module'&&!n.single&&(n.files||[]).length>1;
      boxes+='<g data-nid="'+E(n.id)+'" style="cursor:pointer;opacity:'+(dim?0.22:1)+'">'
        +'<rect x="'+p.x+'" y="'+p.y+'" width="'+p.w+'" height="'+p.h+'" rx="11" style="fill:'+(isSel?'color-mix(in srgb, var(--gx-accent) 16%, transparent)':'rgba(14,20,36,.96)')+';stroke:'+(strong?'#cfe0ff':c)+';stroke-width:'+(strong?2:1.2)+'"></rect>'
        +'<rect x="'+p.x+'" y="'+(p.y+10)+'" width="3.5" height="'+(p.h-20)+'" rx="2" style="fill:'+c+'"></rect>'
        +'<text x="'+(p.x+14)+'" y="'+(p.y+22)+'" style="fill:'+c+';font:600 12px \'Space Grotesk\',sans-serif">'+E(this._flowIcon(n))+'</text>'
        +'<text x="'+(p.x+30)+'" y="'+(p.y+22)+'" style="fill:var(--gx-ink);font:600 13px \'Space Grotesk\',sans-serif">'+E(this._flowCut(n.label, drill?22:25))+'</text>'
        +(drill?'<text x="'+(p.x+p.w-12)+'" y="'+(p.y+22)+'" text-anchor="end" style="fill:#7d8aa8;font:11px \'JetBrains Mono\',monospace">⤵</text>':'')
        +'<text x="'+(p.x+14)+'" y="'+(p.y+39)+'" style="fill:var(--gx-dim);font:10.5px \'JetBrains Mono\',monospace">'+E(this._flowCut(this._flowSub(n), 30))+'</text>'
        +'<text x="'+(p.x+14)+'" y="'+(p.y+53)+'" style="fill:'+c+';font:10px \'JetBrains Mono\',monospace;opacity:.9">'+E(this._flowCut(this._flowBadges(n), 34))+'</text>'
        +'<title>'+E((n.path||n.file||n.label)+(drill?' — çift tık: içine gir':n.file||n.single?' — çift tık: dosyayı aç':''))+'</title></g>';
    }
    el.innerHTML='<svg id="gx-flow-svg" width="100%" height="100%" style="display:block;user-select:none">'+defs+'<g id="gx-flow-vp">'+heads+paths+boxes+'</g></svg>';
    if(!this._flowView) this._flowFit(); else this._flowApply();
    this._flowBind(el);
  }
  _flowApply(){ const vp=document.getElementById('gx-flow-vp'); const v=this._flowView; if(vp&&v) vp.setAttribute('transform','translate('+v.x.toFixed(1)+','+v.y.toFixed(1)+') scale('+v.k.toFixed(3)+')'); }
  _flowFit(){
    const el=document.getElementById('gx-flow-canvas'); const L=this._flowLast&&this._flowLast.L; if(!el||!L) return;
    const cw=el.clientWidth||1200, ch=el.clientHeight||700;
    const k=Math.max(0.55, Math.min(1.15, (cw-24)/L.width, (ch-24)/L.height));
    this._flowView={k, x:Math.max(8,(cw-L.width*k)/2), y:Math.max(8,(ch-L.height*k)/2)};
    this._flowApply();
  }
  _flowZoom(f, cx, cy){
    const el=document.getElementById('gx-flow-canvas'); if(!el) return;
    const v=this._flowView||{x:0,y:0,k:1};
    const k=Math.max(0.2, Math.min(2.6, v.k*f));
    const mx=cx!=null?cx:el.clientWidth/2, my=cy!=null?cy:el.clientHeight/2;
    this._flowView={k, x:mx-(mx-v.x)*(k/v.k), y:my-(my-v.y)*(k/v.k)};
    this._flowApply();
  }
  _flowBind(el){
    if(el._gxBound) return; el._gxBound=true;
    const nid=t=>{ const g=t&&t.closest&&t.closest('[data-nid]'); return g?g.getAttribute('data-nid'):null; };
    el.addEventListener('wheel', e=>{ e.preventDefault(); const r=el.getBoundingClientRect();
      if(e.ctrlKey||e.metaKey) this._flowZoom(Math.exp(-e.deltaY*(e.ctrlKey?0.01:0.0016)), e.clientX-r.left, e.clientY-r.top);
      else { const v=this._flowView; if(v){ v.x-=e.deltaX; v.y-=e.deltaY; this._flowApply(); } } }, {passive:false});
    el.addEventListener('mousedown', e=>{ if(e.button!==0) return; const v=this._flowView; if(!v) return;
      this._flowDrag={sx:e.clientX, sy:e.clientY, x:v.x, y:v.y, moved:false, el}; el.style.cursor='grabbing'; });
    if(!this._flowWinBound){
      this._flowWinBound=true;
      window.addEventListener('mousemove', e=>{ const d=this._flowDrag; if(!d||!this._flowView) return; const dx=e.clientX-d.sx, dy=e.clientY-d.sy;
        if(Math.abs(dx)+Math.abs(dy)>3) d.moved=true; if(!d.moved) return; this._flowView.x=d.x+dx; this._flowView.y=d.y+dy; this._flowApply(); });
      window.addEventListener('mouseup', ()=>{ const d=this._flowDrag; if(d){ this._flowMoved=d.moved; this._flowDrag=null; d.el.style.cursor=''; } });
    }
    el.addEventListener('click', e=>{ if(this._flowMoved){ this._flowMoved=false; return; } const id=nid(e.target);
      this.setState({flowSel:id&&id!==this.state.flowSel?id:null}); });
    el.addEventListener('dblclick', e=>{ const id=nid(e.target); if(!id) return; this._flowActivate(id); });
  }
  _flowNode(id){ const g=this._flowLast&&this._flowLast.g; const n=g&&g.nodes.find(x=>x.id===id); if(n) return n; const m=this._pmapCur(); return m&&(m.nodes||[]).find(x=>x.id===id); }
  _flowActivate(id){
    const n=this._flowNode(id); if(!n) return;
    if(n.kind==='module'&&!n.single&&(n.files||[]).length>1){ this._flowSetFocus(n.id); return; }
    if(n.kind==='module'&&n.single) return this._flowOpenFile(n.files[0]);
    if(n.kind==='file'){ const rel=n.file||n.path||String(n.id||'').replace(/^file:/,''); if(rel) this._flowSetFocus('file:'+rel); return; }
    if(n.kind==='fn'||n.kind==='route') return this._flowOpenFile(n.file, n.line);
    if(n.kind==='entry') return this._flowOpenFile(n.file);
    if(n.kind==='db'&&n.bound) return this._openBoundTable();
  }
  _flowUp(){
    const focus=this.state.flowFocus;
    if(focus && String(focus).indexOf('file:')===0){
      const rel=focus.slice(5); const m=this._pmapCur();
      const f=m&&(m.files||[]).find(x=>x.rel===rel);
      this._flowSetFocus((f&&f.group)||null); return;
    }
    this._flowSetFocus(null);
  }
  _flowBuildStory(){
    const g=this._flowLast&&this._flowLast.g; if(!g||!g.nodes.length) return [];
    const start=(this.state.flowSel&&g.nodes.find(n=>n.id===this.state.flowSel))||g.nodes.find(n=>n.kind==='entry')||g.nodes.find(n=>n.kind==='route')||g.nodes[0];
    if(!start) return [];
    const order=['run','call','http','ipc','import','db','ext'];
    const out=[], seen=new Set(), q=[start.id];
    while(q.length && out.length<14){
      const id=q.shift(); if(seen.has(id)) continue; seen.add(id);
      const n=g.nodes.find(x=>x.id===id); if(!n) continue;
      out.push({id, n:out.length+1, label:n.label, kind:n.kind||'', sub:this._flowSub(n), onClick:()=>this._flowStoryGo(out.length)});
      g.edges.filter(e=>e.from===id).slice().sort((a,b)=>order.indexOf(a.kind)-order.indexOf(b.kind)).forEach(e=>{ if(!seen.has(e.to)) q.push(e.to); });
    }
    out.forEach((s,i)=>s.onClick=()=>this._flowStoryGo(i));
    return out;
  }
  _flowPlayStory(){
    const steps=this._flowBuildStory();
    if(!steps.length){ this.toast('Yürünecek akış yok','err'); return; }
    this.setState({flowStory:steps, flowStoryIdx:0, flowSel:steps[0].id});
    this.toast('Adım 1/'+steps.length+': '+steps[0].label);
  }
  _flowStoryGo(i){
    const steps=this.state.flowStory||[];
    const idx=Math.max(0, Math.min(steps.length-1, Number(i)||0));
    const s=steps[idx]; if(!s) return;
    this.setState({flowStoryIdx:idx, flowSel:s.id});
  }
  _flowToDrawio(g, L){
    const E=s=>String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[c]);
    const cells=['<mxCell id="0"/>','<mxCell id="1" parent="0"/>'];
    (g.nodes||[]).forEach((n,i)=>{
      const p=L&&L.pos&&L.pos.get(n.id);
      const x=p?Math.round(p.x):(40+(i%6)*220), y=p?Math.round(p.y):(40+Math.floor(i/6)*90);
      const w=p&&p.w?Math.round(p.w):200, h=p&&p.h?Math.round(p.h):60;
      const fill=n.kind==='entry'?'#d5f5e3':n.kind==='db'?'#fdebd0':n.kind==='ext'?'#f5d0fe':(n.kind==='fn'||n.kind==='route')?'#d6eaf8':'#eaf0fb';
      cells.push('<mxCell id="'+E(n.id)+'" value="'+E(n.label||n.id)+'" style="rounded=1;whiteSpace=wrap;html=1;fillColor='+fill+';strokeColor=#5d6d7e;align=left;spacingLeft=8;" vertex="1" parent="1"><mxGeometry x="'+x+'" y="'+y+'" width="'+w+'" height="'+h+'" as="geometry"/></mxCell>');
    });
    (g.edges||[]).forEach((e,i)=>{
      if(!e.from||!e.to||e.from===e.to) return;
      const dash=(e.kind==='http'||e.kind==='ipc'||e.kind==='call')?'dashed=1;':'';
      cells.push('<mxCell id="e'+i+'" value="'+E(e.kind||'')+'" style="edgeStyle=orthogonalEdgeStyle;rounded=1;endArrow=block;'+dash+'strokeColor=#5d6d7e;" edge="1" parent="1" source="'+E(e.from)+'" target="'+E(e.to)+'"><mxGeometry relative="1" as="geometry"/></mxCell>');
    });
    return '<?xml version="1.0" encoding="UTF-8"?>\n<mxfile host="Galaxy" type="device">\n  <diagram id="flow" name="Proje akışı">\n    <mxGraphModel dx="1200" dy="800" grid="1" gridSize="10" guides="1" tooltips="1" connect="1" arrows="1" fold="1" page="1" pageScale="1" pageWidth="1600" pageHeight="1200">\n      <root>\n        '+cells.join('\n        ')+'\n      </root>\n    </mxGraphModel>\n  </diagram>\n</mxfile>\n';
  }
  async _flowExportDrawio(){
    const p=this.sel; if(!p||!p._path){ this.toast('Önce bir projeye gir','err'); return; }
    if(!this._flowLast) this._flowPaint();
    const g=this._flowLast&&this._flowLast.g, L=this._flowLast&&this._flowLast.L;
    if(!g||!g.nodes.length){ this.toast('Önce şemayı çiz','err'); return; }
    const xml=this._flowToDrawio(g, L);
    try{
      if(window.galaxy&&window.galaxy.fileCreate){ try{ await window.galaxy.fileCreate({root:p._path, rel:'.galaxy/'}); }catch(e){} }
      if(!(window.galaxy&&window.galaxy.fileWrite)){ this.toast('Kayıt yok','err'); return; }
      const r=await window.galaxy.fileWrite({root:p._path, rel:'.galaxy/flow.drawio', content:xml});
      if(r&&r.ok===false){ this.toast(this._failIpc?this._failIpc(r,'yazılamadı'):(r.error||'yazılamadı'),'err'); return; }
      this.toast('✓ .galaxy/flow.drawio kaydedildi — diagrams.net ile aç');
    }catch(e){ this.toast('draw.io yazılamadı','err'); }
  }
  _flowAgentGo(ask){
    const q=String(ask||'');
    this.openFlow();
    const after=()=>{
      if(/drawio|kaydet|xml|export/i.test(q)) this._flowExportDrawio();
      if(/adım|step|yürü|yuru/i.test(q)) this._flowPlayStory();
    };
    setTimeout(after, 380);
  }
  _flowSearchGo(){
    const q=String(this.state.flowQuery||'').trim().toLowerCase(); const g=this._flowLast&&this._flowLast.g; if(!q||!g) return;
    const n=g.nodes.find(x=>String(x.label||'').toLowerCase().includes(q)||String(x.path||x.file||'').toLowerCase().includes(q));
    if(n){ this.setState({flowSel:n.id}); return; }
    const m=this._pmapCur(); const f=m&&(m.files||[]).find(x=>x.rel.toLowerCase().includes(q));
    if(f&&f.group!==this.state.flowFocus){ this._flowView=null; this.setState({flowFocus:f.group, flowSel:'file:'+f.rel}); }
  }

  // Sağ panel: seçili düğümün ayrıntısı (dosyalar, rotalar, tablolar, kim kullanıyor).
  _flowInspector(){
    const st=this.state, m=this._pmapCur(); const id=st.flowSel; const n=id&&this._flowNode(id);
    if(!m||!m.ok||!n) return null;
    const g=(this._flowLast&&this._flowLast.g)||{nodes:[],edges:[]};
    const name=x=>{ const o=this._flowNode(x); return o?(o.path||o.label):x; };
    const sec=[], acts=[];
    const item=(label, meta, onClick, color)=>({ label, meta:meta||'', onClick:onClick||(()=>{}), style:'display:flex;align-items:baseline;gap:8px;width:100%;text-align:left;padding:5px 8px;border:none;border-radius:6px;background:transparent;cursor:'+(onClick?'pointer':'default')+';color:'+(color||'var(--gx-ink)')+";font-family:var(--gx-font);font-size:11.5px" });
    const outs=g.edges.filter(e=>e.from===n.id), ins=g.edges.filter(e=>e.to===n.id);
    const KL={import:'import', ipc:'IPC', http:'HTTP', db:'DB', ext:'servis', run:'başlatır'};
    const rel=(list, dir)=>list.slice().sort((a,b)=>b.n-a.n).slice(0,30).map(e=>{ const o=dir==='out'?e.to:e.from; return item(name(o), KL[e.kind]+' · '+e.n, ()=>this.setState({flowSel:o}), this._flowColor(this._flowNode(o)||{})); });
    const files=n.kind==='file'?[]:(n.files||[]);
    const fileInfo=new Map((m.files||[]).map(f=>[f.rel,f]));
    if(n.kind==='module'&&!n.single&&files.length>1) acts.push({label:'⤵ İçine gir ('+files.length+' dosya)', onClick:()=>this._flowSetFocus(n.id)});
    if(n.kind==='file') acts.push({label:'⤵ Fonksiyonlara gir', onClick:()=>this._flowSetFocus('file:'+(n.file||n.path))});
    if(n.kind==='file'||n.kind==='entry'||n.kind==='fn'||n.kind==='route'||(n.kind==='module'&&n.single)) acts.push({label:'Dosyayı aç', onClick:()=>this._flowOpenFile(n.file||files[0], n.line)});
    if(n.kind==='db'){
      if(n.bound) acts.push({label:'DB sekmesinde aç', onClick:()=>this._openBoundTable()});
      else if(st._pw&&st._pw.env&&st._pw.env.dbHint) acts.push({label:'.env’den bağla', onClick:()=>this._bindFromMap()});
      const e=n.env; const info=[];
      if(n.bound) info.push(item('bağlantı', n.bound.name+' · '+(n.bound.host?n.bound.host+(n.bound.port?':'+n.bound.port:''):'')+(n.bound.database?' / '+n.bound.database:''), null, 'var(--gx-ok)'));
      if(e) info.push(item('.env', (e.database||e.file||'')+(e.host?' @ '+e.host+(e.port?':'+e.port:''):'')+(e.user?' · '+e.user:'')));
      if(n.compose) info.push(item('compose', n.compose.service+(n.compose.image?' ('+n.compose.image+')':'')+((n.compose.ports||[]).length?' :'+n.compose.ports.join(','):'')));
      if(n.prisma) info.push(item('prisma', (n.prisma.provider||'')+' · '+(n.prisma.schema||''), n.prisma.schema?()=>this._flowOpenFile(n.prisma.schema):null));
      (n.sqliteFiles||[]).forEach(f=>info.push(item('dosya', f)));
      info.push(item('kaynak', (n.sources||[]).join(', ')||'—'));
      sec.push({title:'Bağlantı', items:info});
      const live=st._pdbLive;
      if(n.bound&&live&&live.id===n.bound.id){
        if(live.busy) sec.push({title:'Canlı tablolar', items:[item('bağlanıyor…','')]});
        else if(live.ok) sec.push({title:'Canlı tablolar · '+live.tables.length, items:live.tables.slice(0,60).map(t=>item(t,'aç',()=>this._openBoundTable(t)))});
        else sec.push({title:'Canlı tablolar', items:[item('✕ ulaşılamadı', live.error||'', null, 'var(--gx-err)')]});
      }
      if((n.models||[]).length) sec.push({title:'Prisma modelleri · '+n.models.length, items:n.models.slice(0,60).map(x=>item(x.name, (x.fields||[]).slice(0,5).join(', ')))});
      if((n.tables||[]).length) sec.push({title:'Kodda geçen tablolar · '+n.tables.length, items:n.tables.slice(0,60).map(t=>{ const users=(m.files||[]).filter(f=>(f.tables||[]).includes(t)).map(f=>f.rel); return item(t, users.length?users.length+' dosya':'', users[0]?()=>this._flowOpenFile(users[0]):null); })});
    }
    if(files.length) sec.push({title:(n.kind==='db'?'Erişen dosyalar':n.kind==='ext'?'Kullanan dosyalar':'Dosyalar')+' · '+files.length, items:files.slice(0,80).map(r=>{ const f=fileInfo.get(r)||{}; const bits=[]; if(f.lines) bits.push(f.lines+' st'); const hr=(f.routes||[]).length; if(hr) bits.push(hr+' rota'); if((f.ipc||[]).length) bits.push(f.ipc.length+' IPC'); return item(r, bits.join(' · '), ()=>this._flowOpenFile(r)); })});
    const routeSrc=n.kind==='file'?[n.file]:(n.kind==='module'?files:[]);
    const routes=[]; routeSrc.forEach(r=>{ const f=fileInfo.get(r); (f&&f.routes||[]).forEach(x=>routes.push(Object.assign({file:r},x))); });
    if(routes.length) sec.push({title:'Rotalar · '+routes.length, items:routes.slice(0,80).map(x=>item(x.method+' '+x.path, x.file.split('/').pop()+':'+x.line, ()=>this._flowOpenFile(x.file, x.line), 'var(--gx-accent)'))});
    const ipcs=[]; routeSrc.forEach(r=>{ const f=fileInfo.get(r); (f&&f.ipc||[]).forEach(x=>ipcs.push(Object.assign({file:r},x))); });
    if(ipcs.length) sec.push({title:'IPC kanalları · '+ipcs.length, items:ipcs.slice(0,120).map(x=>item(x.channel, x.file.split('/').pop()+':'+x.line, ()=>this._flowOpenFile(x.file, x.line), 'var(--gx-violet)'))});
    if(n.kind!=='db'&&(n.tables||[]).length) sec.push({title:'Dokunduğu tablolar', items:n.tables.slice(0,40).map(t=>item(t,''))});
    if(outs.length) sec.push({title:'Bağımlı olduğu → '+outs.length, items:rel(outs,'out')});
    if(ins.length) sec.push({title:'Onu kullananlar ← '+ins.length, items:rel(ins,'in')});
    const kindLabel={entry:'Giriş noktası', db:'Veritabanı', ext:'Dış servis', file:'Dosya', fn:'Fonksiyon', route:'Rota işleyici', module:({ui:'Arayüz modülü', api:'API / IPC modülü', data:'Veri modülü', config:'Yapılandırma', test:'Test'})[n.role]||'Modül'}[n.kind];
    return { title:n.label, kind:kindLabel, sub:n.kind==='entry'?((n.cmds||[n.sub]).join('  ·  ')+' → '+n.file):(n.path||n.file||this._flowSub(n)), color:this._flowColor(n), acts, sections:sec };
  }

  _flowBindings(st){
    const m=this._pmapCur(); const busy=!!(this.sel&&st._pmapBusy===this.sel.id);
    const ok=!!(m&&m.ok); const s=(m&&m.stats)||{};
    if(st.flowOpen) this._flowEnsure();
    const ins=st.flowOpen?this._flowInspector():null;
    const fileFocus=st.flowFocus&&String(st.flowFocus).indexOf('file:')===0?st.flowFocus.slice(5):'';
    const focusNode=!fileFocus&&st.flowFocus&&m&&(m.nodes||[]).find(n=>n.id===st.flowFocus);
    const fileNode=fileFocus&&(m.files||[]).find(f=>f.rel===fileFocus);
    const k=v=>v>=1000?(Math.round(v/100)/10)+'k':String(v||0);
    const nodes=(m&&m.nodes)||[];
    const dbNodes=nodes.filter(n=>n.kind==='db'), extNodes=nodes.filter(n=>n.kind==='ext'), modNodes=nodes.filter(n=>n.kind==='module'), entryNodes=nodes.filter(n=>n.kind==='entry');
    const pw=st._pw||{}; const live=st._pdbLive;
    const pdbRows=dbNodes.map(n=>{
      let status='○ koddan tespit', scol='var(--gx-dim)', err='';
      const acts=[];
      if(n.bound){
        if(live&&live.id===n.bound.id&&live.ok){ status='● bağlı · '+live.tables.length+' tablo'; scol='var(--gx-ok)'; }
        else if(live&&live.id===n.bound.id&&live.busy){ status='… bağlanıyor'; }
        else if(live&&live.id===n.bound.id){ status='✕ ulaşılamadı'; scol='var(--gx-err)'; err=live.error||''; }
        else status='● bağlı';
        acts.push({label:'DB sekmesi', onClick:()=>this._openBoundTable()});
      } else if(n.env){ status='○ .env’de tanımlı · bağlı değil'; scol='var(--gx-warn)'; if(pw.env&&pw.env.dbHint) acts.push({label:'Bağla', onClick:()=>this._bindFromMap()}); }
      else if(n.compose){ status='○ compose servisi'; scol='var(--gx-warn)'; }
      acts.push({label:'Akışta göster', onClick:()=>this.openFlow(n.id)});
      const where=[]; if(n.bound){ where.push((n.bound.host||'')+(n.bound.port?':'+n.bound.port:'')+(n.bound.database?' / '+n.bound.database:'')); }
      else if(n.env) where.push((n.env.host||'')+(n.env.port?':'+n.env.port:'')+(n.env.database?' / '+n.env.database:''));
      if(n.compose) where.push('compose: '+n.compose.service);
      if((n.files||[]).length) where.push(n.files.length+' dosya erişiyor');
      const liveT=(n.bound&&live&&live.id===n.bound.id&&live.ok)?live.tables:null;
      const chips=liveT?liveT.slice(0,12).map(t=>({label:String(t).replace(/^public\./,''), title:'Tabloyu aç', onClick:()=>this._openBoundTable(t)}))
        :((n.models||[]).length?n.models.map(x=>x.name):(n.tables||[])).slice(0,12).map(t=>({label:t, title:'Koddan — akışta göster', onClick:()=>this.openFlow(n.id)}));
      const more=(liveT?liveT.length:((n.models||[]).length||(n.tables||[]).length))-chips.length;
      return { label:n.label, status, statusStyle:'font-family:\'JetBrains Mono\',monospace;font-size:11px;color:'+scol, where:where.filter(Boolean).join('  ·  '), err, hasErr:!!err,
        sources:(n.sources||[]).join(' · '), chips, hasChips:chips.length>0, more:more>0?'+'+more:'', hasMore:more>0, acts };
    });
    const layer=(label,n,c)=>({label, n:String(n), style:'display:flex;flex-direction:column;gap:2px;padding:8px 12px;border:1px solid '+c+'55;border-left:3px solid '+c+';border-radius:8px;background:rgba(8,12,22,.5);min-width:96px'});
    return {
      pmapBusy: busy && !ok, pmapOk: ok, pmapErr: !!(m&&!m.ok), pmapErrText: (m&&!m.ok&&m.error)||'',
      pmapSummary: ok?(k(s.analyzed)+' kaynak dosya · '+k(s.lines)+' satır · '+modNodes.length+' modül'+(s.routes?' · '+s.routes+' rota':'')+(s.pages?' · '+s.pages+' sayfa':'')+(s.ipc?' · '+s.ipc+' IPC kanalı':'')):'',
      pmapLayers: ok?[layer('Giriş',entryNodes.length,'var(--gx-ok)'), layer('Modül',modNodes.length,'var(--gx-accent)'), layer('Veri',dbNodes.length,'var(--gx-warn)'), layer('Dış servis',extNodes.length,'#ef8bc0')]:[],
      pmapEntries: entryNodes.slice(0,4).map(n=>({label:n.label+' → '+n.file, onClick:()=>this._flowOpenFile(n.file)})), hasPmapEntries: entryNodes.length>0,
      pdbRows, hasPdb: dbNodes.length>0, pdbNone: ok&&!dbNodes.length,
      pdbAdd: ()=>{ this._openTab('db'); this.setState({dbAddOpen:true}); },
      openFlow: ()=>this.openFlow(), reloadMap: ()=>this._loadProjMap(true),
      flowOpen: !!st.flowOpen, closeFlow: ()=>this.closeFlow(),
      flowTitle: (this.sel&&this.sel.name)||'Proje',
      flowCrumbs: [{label:'Mimari', onClick:()=>this._flowSetFocus(null), style:'cursor:pointer;color:'+(focusNode||fileFocus?'var(--gx-accent)':'var(--gx-ink)')}].concat(focusNode||fileNode?[{label:focusNode?focusNode.label:(fileNode.group||'').replace(/^mod:/,''), onClick:()=>this._flowSetFocus(focusNode?focusNode.id:(fileNode&&fileNode.group)), style:'cursor:pointer;color:'+(fileFocus?'var(--gx-accent)':'var(--gx-ink)')}]:[]).concat(fileFocus?[{label:fileFocus.split('/').pop(), onClick:()=>{}, style:'color:var(--gx-ink)'}]:[]),
      flowStats: ok?(k(s.analyzed)+' dosya · '+k(s.lines)+' satır'+(s.ms!=null?' · '+s.ms+' ms':'')+(m.truncated?' · ilk '+s.analyzed+' dosya':'')):'',
      flowBusy: busy, flowErr: !!(m&&!m.ok), flowErrText: (m&&!m.ok&&m.error)||'',
      flowNeedGen: !busy && !(m&&m.ok),
      flowGenerate: ()=>{ this._flowView=null; this._loadProjMap(true); },
      flowFit: ()=>this._flowFit(), flowZoomIn: ()=>this._flowZoom(1.2), flowZoomOut: ()=>this._flowZoom(1/1.2),
      flowReload: ()=>{ this._flowView=null; this._loadProjMap(true); },
      flowUp: ()=>this._flowUp(), flowInFocus: !!(focusNode||fileFocus),
      flowWalk: ()=>this._flowPlayStory(), flowExport: ()=>this._flowExportDrawio(),
      flowHasStory: !!((st.flowStory||[]).length),
      flowStoryN: String((st.flowStoryIdx||0)+1), flowStoryTotal: String((st.flowStory||[]).length||0),
      flowStoryPrev: ()=>this._flowStoryGo((st.flowStoryIdx||0)-1),
      flowStoryNext: ()=>this._flowStoryGo((st.flowStoryIdx||0)+1),
      flowStorySteps: (st.flowStory||[]).map((s,i)=>({ n:String(s.n), label:s.label, on:i===(st.flowStoryIdx||0), onClick:()=>this._flowStoryGo(i), style:'padding:4px 8px;border:1px solid '+(i===(st.flowStoryIdx||0)?'var(--gx-accent)':'var(--gx-line)')+';border-radius:6px;background:'+(i===(st.flowStoryIdx||0)?'color-mix(in srgb, var(--gx-accent) 14%, transparent)':'transparent')+';color:'+(i===(st.flowStoryIdx||0)?'var(--gx-accent)':'var(--gx-dim)')+';cursor:pointer;font-size:11px' })),
      flowQuery: st.flowQuery||'', onFlowQuery: (e)=>this.setState({flowQuery:(e&&e.target&&e.target.value)||''}),
      onFlowKey: (e)=>{ if(e.key==='Enter'){ e.preventDefault&&e.preventDefault(); this._flowSearchGo(); } else if(e.key==='Escape'){ e.stopPropagation&&e.stopPropagation(); this.setState({flowQuery:''}); } },
      flowLegend: [['Giriş','var(--gx-ok)'],['Arayüz','var(--gx-accent)'],['API / rota','var(--gx-violet)'],['Fonksiyon','#7dd3fc'],['Veri','var(--gx-warn)'],['Dış servis','#ef8bc0']].map(([l,c])=>({label:l, style:'display:inline-flex;align-items:center;gap:5px;font-size:11px;color:var(--gx-dim)', dot:'width:9px;height:9px;border-radius:3px;background:'+c})),
      flowEdgeLegend: 'düz: import · açık mavi: çağrı · kesikli: HTTP/IPC · sarı: DB · pembe: dış servis',
      flowHasSel: !!ins, flowNoSel: !ins,
      flowSelTitle: ins?ins.title:'', flowSelKind: ins?ins.kind:'', flowSelSub: ins?ins.sub:'',
      flowSelKindStyle: "font-family:var(--gx-font);font-size:10px;letter-spacing:.12em;text-transform:uppercase;color:"+(ins?ins.color:'var(--gx-dim)'),
      flowSelActs: ins?ins.acts:[], flowSelSections: ins?ins.sections:[],
      flowTips: [
        'Tek tık: düğümü seç, bağlantıları vurgula',
        'Çift tık: modül → dosyalar → fonksiyonlar. Fonksiyona çift tık satıra gider',
        'Adım adım: seçili girişten çağrı / DB / dış servis yürüyüşü',
        'draw.io kaydet: gördüğün şema .galaxy/flow.drawio olur',
        'Pinch / ⌘ + tekerlek: yakınlaştır · sürükle: kaydır',
        'Esc: bir üst seviye / kapat'
      ],
    };
  }
