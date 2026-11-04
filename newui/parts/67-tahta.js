  // --- Tahta: gezegen başına sonsuz tuval (Excalidraw / tldraw / FigJam çizgisi) ---
  _tahtaEmpty(){ return { v:2, cards:[], arrows:[], strokes:[], grid:true }; }
  _tahtaDoc(){
    const d=this.state.tahtaDoc;
    if(!(d&&d.v)) return this._tahtaEmpty();
    return { v:2, cards:Array.isArray(d.cards)?d.cards:[], arrows:Array.isArray(d.arrows)?d.arrows:[], strokes:Array.isArray(d.strokes)?d.strokes:[], grid:d.grid!==false };
  }
  _tahtaId(p){ return (p||'n')+Math.random().toString(36).slice(2,7)+Date.now().toString(36).slice(-3); }
  _tahtaNoteList(){
    const sel=this.sel;
    if(window.galaxy&&window.galaxy.load) return String((sel&&sel._notes)||'').split(/\n+/).map(s=>s.trim()).filter(Boolean);
    return (this.NOTES[(sel&&sel.id)]||[]).slice();
  }
  _tahtaKindSize(kind){
    return ({ note:[168,118], card:[220,96], text:[220,44], rect:[188,108], ellipse:[168,108], diamond:[168,140], frame:[380,250] })[kind]||[220,96];
  }
  _tahtaNormCard(c){
    if(!c||!c.id) return null;
    const kind=c.kind||'card';
    const sz=this._tahtaKindSize(kind);
    return { id:c.id, x:+c.x||0, y:+c.y||0, w:Math.max(72, +c.w||sz[0]), h:Math.max(36, +c.h||sz[1]), text:String(c.text||''), color:c.color||'#7cc4ff', kind, z:+c.z||0, lock:!!c.lock };
  }
  _tahtaNormArrow(a){
    if(!a||!a.id||!a.from||!a.to) return null;
    return { id:a.id, from:a.from, to:a.to, color:a.color||'#7cc4ff', style:a.style||'curve', dash:!!a.dash, label:String(a.label||'') };
  }
  openTahta(){
    if(!this.sel){ this.toast('Önce bir gezegene in','err'); return; }
    if(this.state.flowOpen) this.closeFlow();
    this._tahtaView=this._tahtaView||{x:56,y:48,k:1};
    this.setState({tahtaOpen:true, tahtaTool:'select', tahtaSel:null, tahtaSels:[], tahtaEdit:null, tahtaSaved:true, tahtaNoteInput:'', tahtaMenu:null, tahtaFind:this.state.tahtaFind||''});
    this._tahtaLoad();
  }
  closeTahta(){
    this._tahtaFlush();
    this._tahtaInk=null; this._tahtaDrag=null; this._tahtaArrowFrom=null; this._tahtaHover=null; this._tahtaCreate=null;
    this.setState({tahtaOpen:false, tahtaSel:null, tahtaSels:[], tahtaEdit:null, tahtaMenu:null});
  }
  _applyTahta(d){
    const cards=(Array.isArray(d.cards)?d.cards:[]).map(c=>this._tahtaNormCard(c)).filter(Boolean);
    const arrows=(Array.isArray(d.arrows)?d.arrows:[]).map(a=>this._tahtaNormArrow(a)).filter(Boolean);
    const doc={ v:2, cards, arrows, strokes:Array.isArray(d.strokes)?d.strokes.slice():[], grid:d.grid!==false };
    if(d.view&&typeof d.view.k==='number') this._tahtaView={ x:Number(d.view.x)||0, y:Number(d.view.y)||0, k:d.view.k };
    this.setState({tahtaDoc:doc, tahtaSaved:true});
  }
  async _tahtaLoad(){
    const p=this.sel; const pid=p&&p.id; if(!pid) return;
    if(this._tahtaMem&&this._tahtaMem[pid]){ this._applyTahta(this._tahtaMem[pid]); return; }
    const root=p._path;
    if(root&&window.galaxy&&window.galaxy.file){
      try{
        const r=await window.galaxy.file(root, '.galaxy/tahta.json');
        if(r&&r.content){ const d=JSON.parse(r.content); if(d&&d.v){ this._applyTahta(d); return; } }
      }catch(e){}
    }
    this._applyTahta(this._tahtaEmpty());
  }
  _tahtaMark(){
    if(this.state.tahtaSaved!==false) this.setState({tahtaSaved:false});
    clearTimeout(this._tahtaSaveT);
    this._tahtaSaveT=setTimeout(()=>this._tahtaSave(), 480);
  }
  _tahtaFlush(){ clearTimeout(this._tahtaSaveT); this._tahtaSave(); }
  async _tahtaSave(){
    const p=this.sel; if(!p||!this.state.tahtaDoc) return;
    const doc=Object.assign({}, this._tahtaDoc(), { view:this._tahtaView||{x:0,y:0,k:1} });
    this._tahtaMem=this._tahtaMem||{}; this._tahtaMem[p.id]=doc;
    const root=p._path;
    if(!(root&&window.galaxy&&window.galaxy.fileWrite)){ this.setState({tahtaSaved:true}); return; }
    try{
      if(window.galaxy.fileCreate){ try{ await window.galaxy.fileCreate({root, rel:'.galaxy/'}); }catch(e){} }
      const r=await window.galaxy.fileWrite({root, rel:'.galaxy/tahta.json', content:JSON.stringify(doc)});
      this.setState({tahtaSaved:!(r&&r.ok===false)});
    }catch(e){ this.setState({tahtaSaved:false}); }
  }
  _tahtaSetTool(t){ this._tahtaArrowFrom=null; this._tahtaCreate=null; this.setState({tahtaTool:t||'select', tahtaEdit:null, tahtaMenu:null}); }
  _tahtaWorld(e){
    const el=document.getElementById('gx-tahta-canvas');
    const v=this._tahtaView||{x:0,y:0,k:1};
    if(!el) return {x:0,y:0};
    const r=el.getBoundingClientRect();
    return { x:(e.clientX-r.left-v.x)/v.k, y:(e.clientY-r.top-v.y)/v.k };
  }
  _tahtaSnapGrid(n){
    const doc=this._tahtaDoc(); if(doc.grid===false) return Math.round(n);
    return Math.round(n/24)*24;
  }
  _tahtaSnap(){
    this._tahtaHist=this._tahtaHist||[]; this._tahtaRedo=[];
    this._tahtaHist.push(JSON.stringify(this._tahtaDoc()));
    if(this._tahtaHist.length>80) this._tahtaHist.shift();
  }
  _tahtaUndo(){
    const h=this._tahtaHist||[]; if(!h.length) return;
    this._tahtaRedo=this._tahtaRedo||[]; this._tahtaRedo.push(JSON.stringify(this._tahtaDoc()));
    try{ this._applyTahta(JSON.parse(h.pop())); this._tahtaMark(); }catch(e){}
  }
  _tahtaRedo(){
    const r=this._tahtaRedo||[]; if(!r.length) return;
    this._tahtaHist=this._tahtaHist||[]; this._tahtaHist.push(JSON.stringify(this._tahtaDoc()));
    try{ this._applyTahta(JSON.parse(r.pop())); this._tahtaMark(); }catch(e){}
  }
  _tahtaSetColor(c){
    const col=c||'#7cc4ff';
    this.setState({tahtaColor:col, tahtaMenu:null});
    const ids=this._tahtaSelIds(); if(!ids.length) return;
    this._tahtaSnap();
    const doc=this._tahtaDoc();
    const cards=doc.cards.map(x=>ids.indexOf(x.id)>=0?Object.assign({},x,{color:col}):x);
    const arrows=doc.arrows.map(a=>a.id===this.state.tahtaSel?Object.assign({},a,{color:col}):a);
    const strokes=doc.strokes.map(s=>s.id===this.state.tahtaSel?Object.assign({},s,{color:col}):s);
    this.setState({ tahtaDoc:{ v:2, cards, arrows, strokes, grid:doc.grid } });
    this._tahtaMark();
  }
  _tahtaSelIds(){
    const many=this.state.tahtaSels; if(many&&many.length) return many.slice();
    const id=this.state.tahtaSel; return id?[id]:[];
  }
  _tahtaSelect(id, add){
    this.setState({tahtaMenu:null});
    if(!id){ this.setState({tahtaSel:null, tahtaSels:[], tahtaEdit:null}); return; }
    if(add){
      const cur=this._tahtaSelIds();
      const next=cur.indexOf(id)>=0?cur.filter(x=>x!==id):cur.concat([id]);
      this.setState({tahtaSel:id, tahtaSels:next, tahtaEdit:null});
      return;
    }
    this.setState({tahtaSel:id, tahtaSels:[id], tahtaEdit:null});
  }
  _tahtaSelAll(){
    const ids=this._tahtaDoc().cards.filter(c=>!c.lock).map(c=>c.id);
    this.setState({tahtaSel:ids[0]||null, tahtaSels:ids, tahtaEdit:null, tahtaMenu:null});
  }
  _tahtaAddNode(kind, x, y, text, opt){
    opt=opt||{};
    this._tahtaSnap();
    const doc=this._tahtaDoc();
    const sz=this._tahtaKindSize(kind);
    const w=Math.max(72, +opt.w||sz[0]), h=Math.max(36, +opt.h||sz[1]);
    const id=this._tahtaId(kind==='note'?'n':'c');
    const z=doc.cards.reduce((m,c)=>Math.max(m,c.z||0),0)+1;
    const card=this._tahtaNormCard({ id, x:this._tahtaSnapGrid(x-w/2), y:this._tahtaSnapGrid(y-h/2), w, h, text:String(text||''), color:this.state.tahtaColor||'#7cc4ff', kind, z });
    const next={ v:2, cards:doc.cards.concat([card]), arrows:doc.arrows.slice(), strokes:doc.strokes.slice(), grid:doc.grid };
    const keep=!!opt.keepTool;
    const edit=!(opt.noEdit||text);
    this.setState({ tahtaDoc:next, tahtaSel:id, tahtaSels:[id], tahtaEdit:edit?id:null, tahtaTool:keep?(this.state.tahtaTool||'select'):'select', tahtaMenu:null });
    this._tahtaMark();
    if(edit) setTimeout(()=>{ try{ const t=document.querySelector('#gx-tahta [data-tid="'+id+'"] textarea'); if(t) t.focus(); }catch(e){} }, 40);
    return id;
  }
  _tahtaAddCard(x, y, text){ return this._tahtaAddNode('card', x, y, text); }
  _tahtaAddAtView(text, kind){
    const el=document.getElementById('gx-tahta-canvas');
    const v=this._tahtaView||{x:0,y:0,k:1};
    const cw=el?el.clientWidth:800, ch=el?el.clientHeight:560;
    const n=this._tahtaDoc().cards.length;
    this._tahtaAddNode(kind||'card', (cw/2-v.x)/v.k+(n%3)*28, (ch/2-v.y)/v.k+(n%3)*22, text);
  }
  _tahtaDropNote(text){ if(!text) return; this._tahtaAddAtView(text, 'note'); }
  _tahtaEditCard(id, text){
    const doc=this._tahtaDoc();
    const cards=doc.cards.map(c=>c.id===id?Object.assign({},c,{text:text}):c);
    this.setState({ tahtaDoc:{ v:2, cards, arrows:doc.arrows, strokes:doc.strokes, grid:doc.grid } });
    this._tahtaMark();
  }
  _tahtaRemoveCard(id){
    const c=this._tahtaDoc().cards.find(x=>x.id===id);
    if(c&&c.lock){ this.toast('kilitli','err'); return; }
    this._tahtaSnap();
    const doc=this._tahtaDoc();
    const next={ v:2, cards:doc.cards.filter(x=>x.id!==id), arrows:doc.arrows.filter(a=>a.from!==id&&a.to!==id), strokes:doc.strokes.slice(), grid:doc.grid };
    this.setState({ tahtaDoc:next, tahtaSel:null, tahtaSels:[], tahtaEdit:null, tahtaMenu:null });
    this._tahtaMark();
  }
  _tahtaDeleteSel(){
    if(this.state.tahtaEdit) return;
    const ids=this._tahtaSelIds();
    const sid=this.state.tahtaSel;
    const doc=this._tahtaDoc();
    if(doc.arrows.some(a=>a.id===sid)){ this._tahtaRemoveArrow(sid); return; }
    if(doc.strokes.some(s=>s.id===sid)){ this._tahtaRemoveStroke(sid); return; }
    if(!ids.length) return;
    const kill=new Set(ids.filter(id=>{ const c=doc.cards.find(x=>x.id===id); return c&&!c.lock; }));
    if(!kill.size){ this.toast('kilitli','err'); return; }
    this._tahtaSnap();
    const next={ v:2, cards:doc.cards.filter(c=>!kill.has(c.id)), arrows:doc.arrows.filter(a=>!kill.has(a.from)&&!kill.has(a.to)), strokes:doc.strokes.slice(), grid:doc.grid };
    this.setState({ tahtaDoc:next, tahtaSel:null, tahtaSels:[], tahtaEdit:null, tahtaMenu:null });
    this._tahtaMark();
  }
  _tahtaArrowClick(id){
    const from=this._tahtaArrowFrom;
    if(!from){ this._tahtaArrowFrom=id; this._tahtaSelect(id); return; }
    if(from===id){ this._tahtaArrowFrom=null; return; }
    const doc=this._tahtaDoc();
    if(doc.arrows.some(a=>a.from===from&&a.to===id)){ this._tahtaArrowFrom=null; this.setState({tahtaTool:'select'}); return; }
    this._tahtaSnap();
    const next={ v:2, cards:doc.cards.slice(), arrows:doc.arrows.concat([this._tahtaNormArrow({id:this._tahtaId('a'), from, to:id, color:this.state.tahtaColor||'#7cc4ff', style:this.state.tahtaArrow||'curve'})]), strokes:doc.strokes.slice(), grid:doc.grid };
    this._tahtaArrowFrom=null;
    this.setState({ tahtaDoc:next, tahtaSel:id, tahtaSels:[id] });
    this._tahtaMark();
  }
  _tahtaRemoveArrow(id){
    this._tahtaSnap();
    const doc=this._tahtaDoc();
    this.setState({ tahtaDoc:{ v:2, cards:doc.cards.slice(), arrows:doc.arrows.filter(a=>a.id!==id), strokes:doc.strokes.slice(), grid:doc.grid }, tahtaMenu:null });
    this._tahtaMark();
  }
  _tahtaRemoveStroke(id){
    this._tahtaSnap();
    const doc=this._tahtaDoc();
    this.setState({ tahtaDoc:{ v:2, cards:doc.cards.slice(), arrows:doc.arrows.slice(), strokes:doc.strokes.filter(s=>s.id!==id), grid:doc.grid }, tahtaMenu:null });
    this._tahtaMark();
  }
  _tahtaToggleGrid(){
    const doc=this._tahtaDoc();
    this.setState({ tahtaDoc:{ v:2, cards:doc.cards.slice(), arrows:doc.arrows.slice(), strokes:doc.strokes.slice(), grid:doc.grid===false }, tahtaMenu:null });
    this._tahtaMark();
  }
  _tahtaToggleSide(){ this.setState({ tahtaSide:this.state.tahtaSide===false, tahtaMenu:null }); }
  _tahtaSetArrowStyle(style){
    this.setState({tahtaArrow:style||'curve', tahtaMenu:null});
    const id=this.state.tahtaSel; const doc=this._tahtaDoc();
    if(!doc.arrows.some(a=>a.id===id)) return;
    this._tahtaSnap();
    this.setState({ tahtaDoc:{ v:2, cards:doc.cards.slice(), arrows:doc.arrows.map(a=>a.id===id?Object.assign({},a,{style}):a), strokes:doc.strokes.slice(), grid:doc.grid } });
    this._tahtaMark();
  }
  _tahtaToggleDash(){
    const id=this.state.tahtaSel; const doc=this._tahtaDoc();
    const a=doc.arrows.find(x=>x.id===id);
    if(!a) return;
    this._tahtaSnap();
    this.setState({ tahtaDoc:{ v:2, cards:doc.cards.slice(), arrows:doc.arrows.map(x=>x.id===id?Object.assign({},x,{dash:!x.dash}):x), strokes:doc.strokes.slice(), grid:doc.grid }, tahtaMenu:null });
    this._tahtaMark();
  }
  _tahtaSetLabel(text){
    const id=this.state.tahtaSel; const doc=this._tahtaDoc();
    if(!doc.arrows.some(a=>a.id===id)) return;
    this.setState({ tahtaDoc:{ v:2, cards:doc.cards.slice(), arrows:doc.arrows.map(a=>a.id===id?Object.assign({},a,{label:String(text||'')}):a), strokes:doc.strokes.slice(), grid:doc.grid } });
    this._tahtaMark();
  }
  _tahtaLock(){
    const ids=this._tahtaSelIds(); if(!ids.length) return;
    const doc=this._tahtaDoc();
    const any=doc.cards.some(c=>ids.indexOf(c.id)>=0&&c.lock);
    this._tahtaSnap();
    this.setState({ tahtaDoc:{ v:2, cards:doc.cards.map(c=>ids.indexOf(c.id)>=0?Object.assign({},c,{lock:!any}):c), arrows:doc.arrows, strokes:doc.strokes, grid:doc.grid }, tahtaMenu:null });
    this._tahtaMark();
  }
  _tahtaKids(frame, cards){
    if(!frame||frame.kind!=='frame') return [];
    return (cards||this._tahtaDoc().cards).filter(c=>c.id!==frame.id && c.kind!=='frame' &&
      c.x+c.w/2>frame.x && c.x+c.w/2<frame.x+frame.w && c.y+c.h/2>frame.y && c.y+c.h/2<frame.y+frame.h);
  }
  _tahtaAlign(how){
    const ids=this._tahtaSelIds(); if(ids.length<2) return;
    const doc=this._tahtaDoc();
    const sel=doc.cards.filter(c=>ids.indexOf(c.id)>=0&&!c.lock); if(sel.length<2) return;
    this._tahtaSnap();
    const minX=Math.min.apply(null,sel.map(c=>c.x)), maxX=Math.max.apply(null,sel.map(c=>c.x+c.w));
    const minY=Math.min.apply(null,sel.map(c=>c.y)), maxY=Math.max.apply(null,sel.map(c=>c.y+c.h));
    const midX=(minX+maxX)/2, midY=(minY+maxY)/2;
    const cards=doc.cards.map(c=>{
      if(ids.indexOf(c.id)<0||c.lock) return c;
      const n=Object.assign({},c);
      if(how==='l') n.x=minX;
      else if(how==='r') n.x=maxX-c.w;
      else if(how==='cx') n.x=Math.round(midX-c.w/2);
      else if(how==='t') n.y=minY;
      else if(how==='b') n.y=maxY-c.h;
      else if(how==='cy') n.y=Math.round(midY-c.h/2);
      return n;
    });
    this.setState({ tahtaDoc:{ v:2, cards, arrows:doc.arrows, strokes:doc.strokes, grid:doc.grid }, tahtaMenu:null });
    this._tahtaMark();
  }
  _tahtaDist(axis){
    const ids=this._tahtaSelIds(); if(ids.length<3) return;
    const doc=this._tahtaDoc();
    const sel=doc.cards.filter(c=>ids.indexOf(c.id)>=0&&!c.lock).slice();
    if(sel.length<3) return;
    this._tahtaSnap();
    const vert=axis==='v';
    sel.sort((a,b)=>vert?a.y-b.y:a.x-b.x);
    const first=sel[0], last=sel[sel.length-1];
    const span=vert?(last.y-first.y):(last.x-first.x);
    const step=span/(sel.length-1);
    const pos={};
    sel.forEach((c,i)=>{ pos[c.id]=vert?first.y+step*i:first.x+step*i; });
    const cards=doc.cards.map(c=>{
      if(pos[c.id]==null) return c;
      const n=Object.assign({},c);
      if(vert) n.y=Math.round(pos[c.id]); else n.x=Math.round(pos[c.id]);
      return n;
    });
    this.setState({ tahtaDoc:{ v:2, cards, arrows:doc.arrows, strokes:doc.strokes, grid:doc.grid }, tahtaMenu:null });
    this._tahtaMark();
  }
  _tahtaFront(){
    const ids=this._tahtaSelIds(); if(!ids.length) return;
    const doc=this._tahtaDoc();
    const top=doc.cards.reduce((m,c)=>Math.max(m,c.z||0),0)+1;
    this._tahtaSnap();
    this.setState({ tahtaDoc:{ v:2, cards:doc.cards.map(c=>ids.indexOf(c.id)>=0?Object.assign({},c,{z:top}):c), arrows:doc.arrows, strokes:doc.strokes, grid:doc.grid }, tahtaMenu:null });
    this._tahtaMark();
  }
  _tahtaBack(){
    const ids=this._tahtaSelIds(); if(!ids.length) return;
    const doc=this._tahtaDoc();
    const bot=doc.cards.reduce((m,c)=>Math.min(m,c.z||0),0)-1;
    this._tahtaSnap();
    this.setState({ tahtaDoc:{ v:2, cards:doc.cards.map(c=>ids.indexOf(c.id)>=0?Object.assign({},c,{z:bot}):c), arrows:doc.arrows, strokes:doc.strokes, grid:doc.grid }, tahtaMenu:null });
    this._tahtaMark();
  }
  _tahtaCopy(){
    const ids=this._tahtaSelIds(); const doc=this._tahtaDoc();
    const cards=doc.cards.filter(c=>ids.indexOf(c.id)>=0);
    if(!cards.length) return;
    const clip={ cards, arrows:doc.arrows.filter(a=>ids.indexOf(a.from)>=0&&ids.indexOf(a.to)>=0) };
    this._tahtaClip=clip;
    try{ navigator.clipboard.writeText(JSON.stringify({ gxTahta:1, clip })); }catch(e){}
    this.toast(cards.length+' öğe kopyalandı');
  }
  async _tahtaPaste(){
    let clip=this._tahtaClip;
    try{ const t=await navigator.clipboard.readText(); const j=JSON.parse(t); if(j&&j.gxTahta&&j.clip) clip=j.clip; }catch(e){}
    if(!(clip&&clip.cards&&clip.cards.length)) return;
    this._tahtaDupFrom(clip.cards, clip.arrows||[], 28, 28);
  }
  _tahtaDup(){
    const ids=this._tahtaSelIds(); const doc=this._tahtaDoc();
    const cards=doc.cards.filter(c=>ids.indexOf(c.id)>=0);
    if(!cards.length) return;
    this._tahtaDupFrom(cards, doc.arrows.filter(a=>ids.indexOf(a.from)>=0&&ids.indexOf(a.to)>=0), 24, 24);
  }
  _tahtaDupFrom(cards, arrows, dx, dy){
    this._tahtaSnap();
    const doc=this._tahtaDoc();
    const map={}; const z=doc.cards.reduce((m,c)=>Math.max(m,c.z||0),0)+1;
    const nextCards=cards.map((c,i)=>{ const id=this._tahtaId('c'); map[c.id]=id; return this._tahtaNormCard(Object.assign({},c,{id, x:c.x+(dx||24), y:c.y+(dy||24), z:z+i, lock:false})); });
    const nextArrows=(arrows||[]).map(a=>this._tahtaNormArrow(Object.assign({},a,{id:this._tahtaId('a'), from:map[a.from], to:map[a.to]}))).filter(Boolean);
    const next={ v:2, cards:doc.cards.concat(nextCards), arrows:doc.arrows.concat(nextArrows), strokes:doc.strokes.slice(), grid:doc.grid };
    const sel=nextCards.map(c=>c.id);
    this.setState({ tahtaDoc:next, tahtaSel:sel[0]||null, tahtaSels:sel, tahtaEdit:null, tahtaMenu:null });
    this._tahtaMark();
  }
  _tahtaNudge(dx, dy){
    const ids=this._tahtaSelIds(); if(!ids.length||this.state.tahtaEdit) return;
    const doc=this._tahtaDoc();
    if(ids.every(id=>{ const c=doc.cards.find(x=>x.id===id); return !c||c.lock; })) return;
    if(!this._tahtaNudged){ this._tahtaSnap(); this._tahtaNudged=true; }
    const cards=doc.cards.map(c=>ids.indexOf(c.id)>=0&&!c.lock?Object.assign({},c,{x:c.x+dx,y:c.y+dy}):c);
    this.setState({ tahtaDoc:{ v:2, cards, arrows:doc.arrows, strokes:doc.strokes, grid:doc.grid } });
    this._tahtaMark();
  }
  _tahtaSnapObj(x, y, w, h, skip){
    const T=7; let nx=x, ny=y;
    for(const o of this._tahtaDoc().cards){
      if(skip&&skip.has(o.id)) continue;
      if(Math.abs(x-o.x)<T) nx=o.x;
      else if(Math.abs(x+w-(o.x+o.w))<T) nx=o.x+o.w-w;
      else if(Math.abs(x-(o.x+o.w))<T) nx=o.x+o.w;
      else if(Math.abs(x+w-o.x)<T) nx=o.x-w;
      if(Math.abs(y-o.y)<T) ny=o.y;
      else if(Math.abs(y+h-(o.y+o.h))<T) ny=o.y+o.h-h;
      else if(Math.abs(y-(o.y+o.h))<T) ny=o.y+o.h;
      else if(Math.abs(y+h-o.y)<T) ny=o.y-h;
    }
    return { x:nx, y:ny };
  }
  _tahtaApplyTemplate(kind){
    const v=this._tahtaView||{x:0,y:0,k:1};
    const el=document.getElementById('gx-tahta-canvas');
    const ox=((el?el.clientWidth:900)/2-v.x)/v.k-260, oy=((el?el.clientHeight:600)/2-v.y)/v.k-80;
    const col=this.state.tahtaColor||'#7cc4ff';
    const mk=(knd,x,y,text,w,h)=>({ id:this._tahtaId('c'), x:Math.round(ox+x), y:Math.round(oy+y), w:w||this._tahtaKindSize(knd)[0], h:h||this._tahtaKindSize(knd)[1], text, color:col, kind:knd, z:1 });
    let cards=[], arrows=[];
    if(kind==='flow'){
      cards=[mk('card',0,40,'Giriş'), mk('card',280,40,'İş'), mk('rect',560,40,'Çıkış')];
      arrows=[{id:this._tahtaId('a'),from:cards[0].id,to:cards[1].id,color:col,style:'curve'},{id:this._tahtaId('a'),from:cards[1].id,to:cards[2].id,color:col,style:'curve'}];
    } else if(kind==='storm'){
      const notes=['Fikir 1','Fikir 2','Fikir 3','Risk','Soru','Sonraki adım'];
      cards=notes.map((t,i)=>mk('note', (i%3)*188, Math.floor(i/3)*140, t));
    } else if(kind==='kanban'){
      cards=[mk('frame',0,0,'Yapılacak',260,280), mk('frame',290,0,'Yapılıyor',260,280), mk('frame',580,0,'Bitti',260,280), mk('note',20,48,'İlk iş')];
    } else if(kind==='decide'){
      cards=[mk('card',160,0,'Soru'), mk('diamond',168,160,'Karar?'), mk('card',0,340,'Evet'), mk('card',320,340,'Hayır')];
      arrows=[
        {id:this._tahtaId('a'),from:cards[0].id,to:cards[1].id,color:col,style:'elbow'},
        {id:this._tahtaId('a'),from:cards[1].id,to:cards[2].id,color:'#5fe3c0',style:'elbow',label:'evet'},
        {id:this._tahtaId('a'),from:cards[1].id,to:cards[3].id,color:'#f08a96',style:'elbow',label:'hayır'}
      ];
    } else if(kind==='retro'){
      cards=[mk('frame',0,0,'İyi giden',260,280), mk('frame',290,0,'Kötü giden',260,280), mk('frame',580,0,'Sonraki',260,280), mk('note',20,48,'+'), mk('note',310,48,'+')];
    } else if(kind==='journey'){
      const steps=['Fark','Düşün','Dene','Kullan','Sadakat'];
      cards=steps.map((t,i)=>mk('ellipse', i*200, 40, t, 160, 88));
      arrows=cards.slice(0,-1).map((c,i)=>({id:this._tahtaId('a'),from:c.id,to:cards[i+1].id,color:col,style:'curve'}));
    } else return;
    this._tahtaSnap();
    const doc=this._tahtaDoc();
    const next={ v:2, cards:doc.cards.concat(cards), arrows:doc.arrows.concat(arrows.map(a=>this._tahtaNormArrow(a)).filter(Boolean)), strokes:doc.strokes.slice(), grid:doc.grid };
    this.setState({ tahtaDoc:next, tahtaSel:cards[0].id, tahtaSels:cards.map(c=>c.id), tahtaEdit:null, tahtaMenu:null });
    this._tahtaMark();
    setTimeout(()=>this._tahtaFit(), 30);
  }
  _tahtaExport(){
    const doc=this._tahtaDoc();
    const E=s=>String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[c]);
    let minX=0,minY=0,maxX=640,maxY=400;
    for(const c of doc.cards){ minX=Math.min(minX,c.x-16); minY=Math.min(minY,c.y-16); maxX=Math.max(maxX,c.x+c.w+16); maxY=Math.max(maxY,c.y+c.h+16); }
    for(const s of doc.strokes){ for(const p of (s.pts||[])){ minX=Math.min(minX,p[0]); minY=Math.min(minY,p[1]); maxX=Math.max(maxX,p[0]); maxY=Math.max(maxY,p[1]); } }
    const w=Math.max(320, maxX-minX), h=Math.max(240, maxY-minY);
    let svg='<svg xmlns="http://www.w3.org/2000/svg" width="'+w+'" height="'+h+'" viewBox="'+minX+' '+minY+' '+w+' '+h+'" fill="none">';
    svg+='<rect x="'+minX+'" y="'+minY+'" width="'+w+'" height="'+h+'" fill="#0b0f14"/>';
    svg+='<defs><marker id="arr" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" fill="#7cc4ff"/></marker></defs>';
    const cards=new Map(doc.cards.map(c=>[c.id,c]));
    for(const a of doc.arrows){
      const A=cards.get(a.from), B=cards.get(a.to); if(!A||!B) continue;
      const [p,q]=this._tahtaPair(A,B);
      svg+='<path d="'+E(this._tahtaArrowD(p,q,a.style))+'" stroke="'+(a.color||'#7cc4ff')+'" stroke-width="1.8" fill="none" marker-end="url(#arr)"'+(a.dash?' stroke-dasharray="7 5"':'')+'/>';
      if(a.label) svg+='<text x="'+((p.x+q.x)/2)+'" y="'+((p.y+q.y)/2-6)+'" fill="#f2f5f8" font-size="12" font-family="system-ui,sans-serif" text-anchor="middle">'+E(a.label)+'</text>';
    }
    for(const s of doc.strokes){
      if(!(s.pts||[]).length) continue;
      const d=s.pts.map((p,i)=>(i?'L':'M')+p[0]+','+p[1]).join(' ');
      svg+='<path d="'+d+'" stroke="'+(s.color||'#f2f5f8')+'" stroke-width="'+(s.hi?12:2.2)+'" stroke-linecap="round" stroke-linejoin="round" opacity="'+(s.hi?'.35':'1')+'"/>';
    }
    for(const c of doc.cards){
      const fill=c.kind==='note'?'#3a3420':(c.kind==='text'?'none':'#161c24');
      const stroke=c.color||'#7cc4ff';
      if(c.kind==='ellipse') svg+='<ellipse cx="'+(c.x+c.w/2)+'" cy="'+(c.y+c.h/2)+'" rx="'+(c.w/2)+'" ry="'+(c.h/2)+'" fill="'+fill+'" stroke="'+stroke+'"/>';
      else if(c.kind==='diamond'){
        const mx=c.x+c.w/2, my=c.y+c.h/2;
        svg+='<polygon points="'+mx+','+c.y+' '+(c.x+c.w)+','+my+' '+mx+','+(c.y+c.h)+' '+c.x+','+my+'" fill="'+fill+'" stroke="'+stroke+'"/>';
      }
      else svg+='<rect x="'+c.x+'" y="'+c.y+'" width="'+c.w+'" height="'+c.h+'" rx="'+(c.kind==='note'?10:8)+'" fill="'+fill+'" stroke="'+stroke+'" '+(c.kind==='frame'?'stroke-dasharray="6 4"':'')+'/>';
      const lines=String(c.text||'').split('\n').slice(0,8);
      lines.forEach((ln,i)=>{ svg+='<text x="'+(c.x+14)+'" y="'+(c.y+28+i*16)+'" fill="#f2f5f8" font-size="13" font-family="system-ui,sans-serif">'+E(ln.slice(0,80))+'</text>'; });
    }
    svg+='</svg>';
    this._tahtaDownload(((this.sel&&this.sel.name)||'tahta')+'.svg', svg, 'image/svg+xml');
    this.toast('SVG indirildi','ok');
  }
  _tahtaExportJson(){
    const doc=Object.assign({}, this._tahtaDoc(), { view:this._tahtaView||{x:0,y:0,k:1} });
    this._tahtaDownload(((this.sel&&this.sel.name)||'tahta')+'.json', JSON.stringify(doc,null,2), 'application/json');
    this.toast('JSON indirildi','ok');
  }
  _tahtaDownload(name, body, type){
    try{
      const blob=new Blob([body],{type:type||'text/plain'});
      const a=document.createElement('a'); a.href=URL.createObjectURL(blob);
      a.download=name; a.click();
      setTimeout(()=>URL.revokeObjectURL(a.href), 1500);
    }catch(e){ this.toast('dışa aktarılamadı','err'); }
  }
  _tahtaPorts(c){
    return [
      {x:c.x+c.w/2,y:c.y},{x:c.x+c.w,y:c.y+c.h/2},{x:c.x+c.w/2,y:c.y+c.h},{x:c.x,y:c.y+c.h/2}
    ];
  }
  _tahtaPair(A,B){
    let best=[{x:A.x+A.w,y:A.y+A.h/2},{x:B.x,y:B.y+B.h/2}], bd=1e12;
    for(const a of this._tahtaPorts(A)) for(const b of this._tahtaPorts(B)){
      const d=(a.x-b.x)*(a.x-b.x)+(a.y-b.y)*(a.y-b.y);
      if(d<bd){ bd=d; best=[a,b]; }
    }
    return best;
  }
  _tahtaArrowD(p,q,style){
    if(style==='elbow'){
      const mx=Math.round((p.x+q.x)/2);
      return 'M'+p.x+','+p.y+' L'+mx+','+p.y+' L'+mx+','+q.y+' L'+q.x+','+q.y;
    }
    const dx=Math.max(36, Math.abs(q.x-p.x)/2);
    return 'M'+p.x+','+p.y+' C'+(p.x+dx)+','+p.y+' '+(q.x-dx)+','+q.y+' '+q.x+','+q.y;
  }
  _tahtaZoom(f, cx, cy){
    const el=document.getElementById('gx-tahta-canvas'); if(!el) return;
    const v=this._tahtaView||{x:0,y:0,k:1};
    const k=Math.max(0.25, Math.min(3.2, v.k*f));
    const mx=cx!=null?cx:el.clientWidth/2, my=cy!=null?cy:el.clientHeight/2;
    this._tahtaView={ k, x:mx-(mx-v.x)*(k/v.k), y:my-(my-v.y)*(k/v.k) };
    this._tahtaApply();
    this.setState({ tahtaZoomPct: Math.round(k*100) });
  }
  _tahtaFitBox(minX, minY, maxX, maxY){
    const el=document.getElementById('gx-tahta-canvas'); if(!el) return;
    const w=Math.max(200, maxX-minX+80), h=Math.max(160, maxY-minY+80);
    const cw=el.clientWidth||1000, ch=el.clientHeight||640;
    const k=Math.max(0.35, Math.min(1.4, (cw-48)/w, (ch-48)/h));
    this._tahtaView={ k, x:(cw-w*k)/2-minX*k+24, y:(ch-h*k)/2-minY*k+16 };
    this._tahtaApply();
    this.setState({ tahtaZoomPct: Math.round(k*100) });
  }
  _tahtaFit(){
    const doc=this._tahtaDoc();
    let minX=0, minY=0, maxX=480, maxY=320;
    for(const c of doc.cards){ minX=Math.min(minX,c.x); minY=Math.min(minY,c.y); maxX=Math.max(maxX,c.x+c.w); maxY=Math.max(maxY,c.y+c.h); }
    for(const s of doc.strokes){ for(const p of (s.pts||[])){ minX=Math.min(minX,p[0]); minY=Math.min(minY,p[1]); maxX=Math.max(maxX,p[0]); maxY=Math.max(maxY,p[1]); } }
    this._tahtaFitBox(minX, minY, maxX, maxY);
  }
  _tahtaFitSel(){
    const ids=this._tahtaSelIds(); const doc=this._tahtaDoc();
    const sel=doc.cards.filter(c=>ids.indexOf(c.id)>=0);
    if(!sel.length){ this._tahtaFit(); return; }
    let minX=sel[0].x, minY=sel[0].y, maxX=sel[0].x+sel[0].w, maxY=sel[0].y+sel[0].h;
    for(const c of sel){ minX=Math.min(minX,c.x); minY=Math.min(minY,c.y); maxX=Math.max(maxX,c.x+c.w); maxY=Math.max(maxY,c.y+c.h); }
    this._tahtaFitBox(minX, minY, maxX, maxY);
  }
  _tahtaApply(){
    const vp=document.getElementById('gx-tahta-vp'); const v=this._tahtaView||{x:0,y:0,k:1};
    if(vp) vp.style.transform='translate('+v.x.toFixed(1)+'px,'+v.y.toFixed(1)+'px) scale('+v.k.toFixed(3)+')';
    this._tahtaMini();
  }
  _tahtaEnsure(){ if(this._tahtaRaf) return; this._tahtaRaf=setTimeout(()=>{ this._tahtaRaf=null; this._tahtaPaint(); this._tahtaBind(); this._tahtaApply(); }, 0); }
  _tahtaMini(){
    const svg=document.getElementById('gx-tahta-mini-svg'); const box=document.getElementById('gx-tahta-mini');
    if(!svg||!box) return;
    const doc=this._tahtaDoc();
    const cw=box.clientWidth||160, ch=box.clientHeight||96;
    let minX=0,minY=0,maxX=480,maxY=320;
    for(const c of doc.cards){ minX=Math.min(minX,c.x-40); minY=Math.min(minY,c.y-40); maxX=Math.max(maxX,c.x+c.w+40); maxY=Math.max(maxY,c.y+c.h+40); }
    const w=Math.max(80,maxX-minX), h=Math.max(80,maxY-minY);
    const s=Math.min(cw/w, ch/h);
    this._tahtaMiniB={ minX, minY, s, cw, ch };
    const E=n=>n.toFixed(1);
    let html='';
    for(const c of doc.cards){
      html+='<rect x="'+E((c.x-minX)*s)+'" y="'+E((c.y-minY)*s)+'" width="'+E(Math.max(3,c.w*s))+'" height="'+E(Math.max(2,c.h*s))+'" class="gx-tahta-mini-c'+(c.kind==='note'?' note':'')+'"></rect>';
    }
    const canvas=document.getElementById('gx-tahta-canvas');
    const v=this._tahtaView||{x:0,y:0,k:1};
    if(canvas){
      const vw=canvas.clientWidth/v.k, vh=canvas.clientHeight/v.k;
      const vx=(-v.x)/v.k, vy=(-v.y)/v.k;
      html+='<rect x="'+E((vx-minX)*s)+'" y="'+E((vy-minY)*s)+'" width="'+E(vw*s)+'" height="'+E(vh*s)+'" class="gx-tahta-mini-v"></rect>';
    }
    svg.setAttribute('viewBox','0 0 '+cw+' '+ch);
    svg.innerHTML=html;
  }
  _tahtaMiniClick(e){
    const b=this._tahtaMiniB; const canvas=document.getElementById('gx-tahta-canvas');
    if(!b||!canvas) return;
    const r=e.currentTarget.getBoundingClientRect();
    const wx=b.minX+(e.clientX-r.left)/b.s, wy=b.minY+(e.clientY-r.top)/b.s;
    const v=this._tahtaView||{x:0,y:0,k:1};
    this._tahtaView={ k:v.k, x:canvas.clientWidth/2-wx*v.k, y:canvas.clientHeight/2-wy*v.k };
    this._tahtaApply();
  }
  _tahtaPaint(){
    const svg=document.getElementById('gx-tahta-svg'); if(!svg) return;
    const doc=this._tahtaDoc();
    const E=s=>String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[c]);
    const cards=new Map(doc.cards.map(c=>[c.id,c]));
    let html='<defs><marker id="gx-ta-arr" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" style="fill:var(--gx-accent)"></path></marker></defs>';
    if(this._tahtaMarquee){
      const m=this._tahtaMarquee;
      const x=Math.min(m.x,m.x2), y=Math.min(m.y,m.y2), w=Math.abs(m.x2-m.x), h=Math.abs(m.y2-m.y);
      html+='<rect class="gx-tahta-marq" x="'+x+'" y="'+y+'" width="'+w+'" height="'+h+'"></rect>';
    }
    if(this._tahtaCreate){
      const c=this._tahtaCreate;
      const x=Math.min(c.x,c.x2), y=Math.min(c.y,c.y2), w=Math.abs(c.x2-c.x), h=Math.abs(c.y2-c.y);
      if(c.tool==='ellipse') html+='<ellipse class="gx-tahta-ghost" cx="'+(x+w/2)+'" cy="'+(y+h/2)+'" rx="'+(w/2)+'" ry="'+(h/2)+'"></ellipse>';
      else html+='<rect class="gx-tahta-ghost" x="'+x+'" y="'+y+'" width="'+w+'" height="'+h+'"></rect>';
    }
    for(const a of doc.arrows){
      const A=cards.get(a.from), B=cards.get(a.to); if(!A||!B) continue;
      const [p,q]=this._tahtaPair(A,B);
      const d=this._tahtaArrowD(p,q,a.style);
      const on=this.state.tahtaSel===a.id?' on':'';
      html+='<path data-aid="'+E(a.id)+'" class="gx-tahta-hit" d="'+d+'"></path>';
      html+='<path data-aid="'+E(a.id)+'" class="gx-tahta-arrow'+on+(a.dash?' dash':'')+'" d="'+d+'" marker-end="url(#gx-ta-arr)" style="stroke:'+E(a.color||'var(--gx-accent)')+'"></path>';
      if(a.label) html+='<text data-aid="'+E(a.id)+'" class="gx-tahta-alab" x="'+((p.x+q.x)/2)+'" y="'+((p.y+q.y)/2-8)+'">'+E(a.label)+'</text>';
    }
    for(const s of doc.strokes){
      if(!(s.pts||[]).length) continue;
      const d=s.pts.map((p,i)=>(i?'L':'M')+p[0]+','+p[1]).join(' ');
      html+='<path data-sid="'+E(s.id)+'" class="gx-tahta-hit" d="'+d+'"></path>';
      html+='<path data-sid="'+E(s.id)+'" class="gx-tahta-ink'+(s.hi?' hi':'')+(this.state.tahtaSel===s.id?' on':'')+'" d="'+d+'" style="stroke:'+E(s.color||'var(--gx-ink)')+'"></path>';
    }
    if(this._tahtaInk&&this._tahtaInk.pts.length){
      const d=this._tahtaInk.pts.map((p,i)=>(i?'L':'M')+p[0]+','+p[1]).join(' ');
      html+='<path class="gx-tahta-ink live'+(this._tahtaInk.hi?' hi':'')+'" d="'+d+'"></path>';
    }
    if(this._tahtaArrowFrom&&this._tahtaHover){
      const A=cards.get(this._tahtaArrowFrom);
      if(A) html+='<path class="gx-tahta-arrow live" d="M'+(A.x+A.w/2)+','+(A.y+A.h/2)+' L'+this._tahtaHover.x+','+this._tahtaHover.y+'"></path>';
    }
    svg.innerHTML=html;
    this._tahtaMini();
  }
  _tahtaBind(){
    const el=document.getElementById('gx-tahta-canvas'); if(!el||el._gxTahta) return;
    el._gxTahta=true;
    const cardOf=t=>{ const n=t&&t.closest&&t.closest('[data-tid]'); return n?n.getAttribute('data-tid'):null; };
    const hzOf=t=>{ const n=t&&t.closest&&t.closest('[data-hz]'); return n?n.getAttribute('data-hz'):null; };
    const portOf=t=>{ const n=t&&t.closest&&t.closest('[data-port]'); return n?n.getAttribute('data-port'):null; };
    const shapeOf=t=>t==='card'||t==='text'||t==='note'||t==='rect'||t==='ellipse'||t==='diamond'||t==='frame';
    el.addEventListener('wheel', e=>{
      e.preventDefault();
      const r=el.getBoundingClientRect();
      if(e.ctrlKey||e.metaKey) this._tahtaZoom(Math.exp(-e.deltaY*(e.ctrlKey?0.01:0.0016)), e.clientX-r.left, e.clientY-r.top);
      else { const v=this._tahtaView||{x:0,y:0,k:1}; this._tahtaView={k:v.k, x:v.x-e.deltaX, y:v.y-e.deltaY}; this._tahtaApply(); }
    }, {passive:false});
    el.addEventListener('contextmenu', e=>{
      e.preventDefault();
      const id=cardOf(e.target);
      if(id) this._tahtaSelect(id, e.shiftKey);
      const r=el.getBoundingClientRect();
      this.setState({ tahtaMenu:{ x:Math.min(e.clientX, r.right-180), y:Math.min(e.clientY, r.bottom-220) } });
    });
    el.addEventListener('mousedown', e=>{
      if(this.state.tahtaMenu) this.setState({tahtaMenu:null});
      if(e.button===1||this._tahtaSpace){
        const v=this._tahtaView||{x:0,y:0,k:1};
        this._tahtaDrag={ kind:'pan', sx:e.clientX, sy:e.clientY, x:v.x, y:v.y, moved:false };
        el.classList.add('grabbing'); e.preventDefault(); return;
      }
      if(e.button!==0) return;
      if(e.target&&(e.target.tagName==='TEXTAREA'||e.target.tagName==='INPUT')) return;
      if(e.target&&e.target.closest&&e.target.closest('#gx-tahta-mini')) return;
      const tool=this.state.tahtaTool||'select';
      const sid=e.target&&e.target.getAttribute&&e.target.getAttribute('data-sid');
      const aid=e.target&&e.target.getAttribute&&e.target.getAttribute('data-aid');
      if((tool==='erase'||tool==='select')&&sid){ if(tool==='erase') this._tahtaRemoveStroke(sid); else this._tahtaSelect(sid); return; }
      if((tool==='erase'||tool==='select')&&aid){ if(tool==='erase') this._tahtaRemoveArrow(aid); else this._tahtaSelect(aid); return; }
      const hz=hzOf(e.target);
      const port=portOf(e.target);
      const id=cardOf(e.target);
      if(port&&id){
        this._tahtaArrowFrom=id;
        this._tahtaDrag={ kind:'link', from:id };
        this._tahtaSelect(id);
        return;
      }
      if(hz&&id){
        const c=this._tahtaDoc().cards.find(x=>x.id===id); if(!c||c.lock) return;
        const v=this._tahtaView||{x:0,y:0,k:1};
        this._tahtaDrag={ kind:'resize', id, hz, sx:e.clientX, sy:e.clientY, x:c.x, y:c.y, w:c.w, h:c.h, k:v.k };
        this._tahtaSelect(id); return;
      }
      if(id){
        if(tool==='erase'){ this._tahtaRemoveCard(id); return; }
        if(tool==='arrow'){ this._tahtaArrowClick(id); return; }
        const c=this._tahtaDoc().cards.find(x=>x.id===id);
        if(!c) return;
        this._tahtaSelect(id, e.shiftKey);
        if(c.lock) return;
        const v=this._tahtaView||{x:0,y:0,k:1};
        let ids=e.shiftKey?this._tahtaSelIds().concat([id].filter(x=>this._tahtaSelIds().indexOf(x)<0)):[id];
        if(c.kind==='frame') this._tahtaKids(c).forEach(k=>{ if(ids.indexOf(k.id)<0) ids.push(k.id); });
        this._tahtaDrag={ kind:'card', ids, sx:e.clientX, sy:e.clientY, items:ids.map(i=>{ const n=this._tahtaDoc().cards.find(x=>x.id===i); return n&&!n.lock?{id:i,x:n.x,y:n.y,w:n.w,h:n.h}:null; }).filter(Boolean), k:v.k, moved:false };
        return;
      }
      const w=this._tahtaWorld(e);
      if(shapeOf(tool)){
        this._tahtaCreate={ tool, x:w.x, y:w.y, x2:w.x, y2:w.y };
        this._tahtaDrag={ kind:'create', tool };
        this._tahtaPaint();
        return;
      }
      if(tool==='draw'||tool==='hi'){ this._tahtaInk={ id:this._tahtaId('s'), pts:[[w.x,w.y]], hi:tool==='hi' }; this._tahtaPaint(); return; }
      if(tool==='erase') return;
      if(tool==='hand'){
        const v=this._tahtaView||{x:0,y:0,k:1};
        this._tahtaDrag={ kind:'pan', sx:e.clientX, sy:e.clientY, x:v.x, y:v.y, moved:false };
        el.classList.add('grabbing'); return;
      }
      this._tahtaMarquee={ x:w.x, y:w.y, x2:w.x, y2:w.y };
      this._tahtaDrag={ kind:'marq', add:e.shiftKey };
      if(!e.shiftKey) this._tahtaSelect(null);
      this._tahtaPaint();
    });
    el.addEventListener('dblclick', e=>{
      if(e.target&&(e.target.tagName==='TEXTAREA'||e.target.tagName==='INPUT')) return;
      const aid=e.target&&e.target.getAttribute&&e.target.getAttribute('data-aid');
      if(aid){ this.setState({tahtaSel:aid, tahtaSels:[], tahtaEdit:null, tahtaSide:true}); return; }
      const id=cardOf(e.target);
      if(id){ this.setState({tahtaSel:id, tahtaSels:[id], tahtaEdit:id, tahtaTool:'select'}); setTimeout(()=>{ try{ const t=document.querySelector('#gx-tahta [data-tid="'+id+'"] textarea'); if(t) t.focus(); }catch(err){} }, 30); return; }
      const w=this._tahtaWorld(e);
      this._tahtaAddNode('card', w.x, w.y, '');
    });
    if(!this._tahtaWinBound){
      this._tahtaWinBound=true;
      window.addEventListener('mousemove', e=>{
        if(!this.state.tahtaOpen) return;
        if(this._tahtaInk){ const w=this._tahtaWorld(e); this._tahtaInk.pts.push([w.x,w.y]); this._tahtaPaint(); return; }
        if(this._tahtaArrowFrom){ this._tahtaHover=this._tahtaWorld(e); this._tahtaPaint(); }
        const d=this._tahtaDrag; if(!d) return;
        const dx=e.clientX-d.sx, dy=e.clientY-d.sy;
        if(Math.abs(dx)+Math.abs(dy)>3) d.moved=true;
        if(d.kind==='create'){
          const w=this._tahtaWorld(e); this._tahtaCreate.x2=w.x; this._tahtaCreate.y2=w.y; this._tahtaPaint(); return;
        }
        if(d.kind==='marq'){
          const w=this._tahtaWorld(e); this._tahtaMarquee.x2=w.x; this._tahtaMarquee.y2=w.y; this._tahtaPaint(); return;
        }
        if(d.kind==='link') return;
        if(!d.moved) return;
        if(d.kind==='pan'){ this._tahtaView={ k:(this._tahtaView||{}).k||1, x:d.x+dx, y:d.y+dy }; this._tahtaApply(); return; }
        if(d.kind==='resize'){
          if(!d.snapped){ this._tahtaSnap(); d.snapped=true; }
          const doc=this._tahtaDoc(); const c=doc.cards.find(x=>x.id===d.id); if(!c) return;
          let x=d.x, y=d.y, w=d.w, h=d.h, ox=dx/d.k, oy=dy/d.k;
          if(e.shiftKey){
            const ratio=d.w/Math.max(1,d.h);
            if(Math.abs(ox)>=Math.abs(oy)) oy=ox/ratio; else ox=oy*ratio;
          }
          if(d.hz.indexOf('e')>=0) w=Math.max(72, d.w+ox);
          if(d.hz.indexOf('s')>=0) h=Math.max(36, d.h+oy);
          if(d.hz.indexOf('w')>=0){ w=Math.max(72, d.w-ox); x=d.x+d.w-w; }
          if(d.hz.indexOf('n')>=0){ h=Math.max(36, d.h-oy); y=d.y+d.h-h; }
          c.x=this._tahtaSnapGrid(x); c.y=this._tahtaSnapGrid(y); c.w=this._tahtaSnapGrid(w); c.h=this._tahtaSnapGrid(h);
          const node=document.querySelector('#gx-tahta [data-tid="'+d.id+'"]');
          if(node){ node.style.left=c.x+'px'; node.style.top=c.y+'px'; node.style.width=c.w+'px'; node.style.height=c.h+'px'; }
          this._tahtaPaint(); return;
        }
        if(d.kind==='card'){
          if(!d.snapped){ this._tahtaSnap(); d.snapped=true; }
          const doc=this._tahtaDoc();
          const skip=new Set(d.items.map(it=>it.id));
          for(const it of d.items){
            const c=doc.cards.find(x=>x.id===it.id); if(!c) continue;
            let nx=this._tahtaSnapGrid(it.x+dx/d.k), ny=this._tahtaSnapGrid(it.y+dy/d.k);
            const sn=this._tahtaSnapObj(nx, ny, it.w, it.h, skip);
            c.x=sn.x; c.y=sn.y;
            const node=document.querySelector('#gx-tahta [data-tid="'+it.id+'"]');
            if(node){ node.style.left=c.x+'px'; node.style.top=c.y+'px'; }
          }
          this._tahtaPaint();
        }
      });
      window.addEventListener('mouseup', e=>{
        const el2=document.getElementById('gx-tahta-canvas'); if(el2) el2.classList.remove('grabbing');
        if(this._tahtaInk){
          const ink=this._tahtaInk; this._tahtaInk=null;
          if((ink.pts||[]).length>2){
            const doc=this._tahtaDoc();
            this._tahtaSnap();
            this.setState({ tahtaDoc:{ v:2, cards:doc.cards.slice(), arrows:doc.arrows.slice(), strokes:doc.strokes.concat([{id:ink.id, pts:ink.pts, color:this.state.tahtaColor||'#7cc4ff', hi:!!ink.hi}]), grid:doc.grid } });
            this._tahtaMark();
          } else this._tahtaPaint();
        }
        const d=this._tahtaDrag; this._tahtaDrag=null;
        if(d&&d.kind==='create'&&this._tahtaCreate){
          const c=this._tahtaCreate; this._tahtaCreate=null;
          const x=Math.min(c.x,c.x2), y=Math.min(c.y,c.y2), w=Math.abs(c.x2-c.x), h=Math.abs(c.y2-c.y);
          const kind=c.tool==='text'?'text':c.tool;
          const write=kind==='note'||kind==='card'||kind==='text';
          if(w>22&&h>18) this._tahtaAddNode(kind, x+w/2, y+h/2, '', { keepTool:true, noEdit:!write, w, h });
          else this._tahtaAddNode(kind, c.x, c.y, '', { keepTool:true, noEdit:!write });
          return;
        }
        if(d&&d.kind==='link'){
          const t=e&&e.target; const n=t&&t.closest&&t.closest('[data-tid]'); const id=n?n.getAttribute('data-tid'):null;
          if(id&&id!==d.from) this._tahtaArrowClick(id);
          else { this._tahtaArrowFrom=null; this._tahtaHover=null; this._tahtaPaint(); }
          return;
        }
        if(d&&d.kind==='marq'&&this._tahtaMarquee){
          const m=this._tahtaMarquee; this._tahtaMarquee=null;
          const x=Math.min(m.x,m.x2), y=Math.min(m.y,m.y2), x2=Math.max(m.x,m.x2), y2=Math.max(m.y,m.y2);
          const hit=this._tahtaDoc().cards.filter(c=>c.x<x2&&c.x+c.w>x&&c.y<y2&&c.y+c.h>y).map(c=>c.id);
          const ids=d.add?this._tahtaSelIds().concat(hit.filter(i=>this._tahtaSelIds().indexOf(i)<0)):hit;
          this.setState({ tahtaSel:ids[0]||null, tahtaSels:ids });
          this._tahtaPaint(); return;
        }
        if(d&&(d.kind==='card'||d.kind==='resize')&&d.moved){ this.setState({ tahtaDoc:this._tahtaDoc() }); this._tahtaMark(); }
        else this._tahtaPaint();
      });
      window.addEventListener('keydown', e=>{
        if(!this.state.tahtaOpen) return;
        if(e.key===' ' && !this._inForm(e)){ this._tahtaSpace=true; }
        if(this._inForm(e)) return;
        const k=e.key;
        if(k==='Escape' && this.state.tahtaMenu){ this.setState({tahtaMenu:null}); return; }
        if(k==='Backspace'||k==='Delete'){ if(this.state.tahtaSel&&!this.state.tahtaEdit){ e.preventDefault(); this._tahtaDeleteSel(); } return; }
        if(k==='ArrowLeft'){ e.preventDefault(); this._tahtaNudge(e.shiftKey?-24:-1, 0); }
        else if(k==='ArrowRight'){ e.preventDefault(); this._tahtaNudge(e.shiftKey?24:1, 0); }
        else if(k==='ArrowUp'){ e.preventDefault(); this._tahtaNudge(0, e.shiftKey?-24:-1); }
        else if(k==='ArrowDown'){ e.preventDefault(); this._tahtaNudge(0, e.shiftKey?24:1); }
        else this._tahtaNudged=false;
        if(e.metaKey||e.ctrlKey||e.altKey) return;
        const map={v:'select',n:'note',c:'card',t:'text',r:'rect',o:'ellipse',d:'diamond',f:'frame',a:'arrow',p:'draw',h:'hi',e:'erase',s:'hand'};
        const tool=map[k.toLowerCase()];
        if(tool) this._tahtaSetTool(tool);
        if(k==='0') this._tahtaFit();
        if(k==='2') this._tahtaFitSel();
        if(k==='l'||k==='L') this._tahtaLock();
        if(k==='[') this.setState({tahtaSide:false});
        if(k===']') this.setState({tahtaSide:true});
        if(k==='1'){ this._tahtaView=Object.assign({}, this._tahtaView||{}, {k:1}); this._tahtaApply(); this.setState({tahtaZoomPct:100}); }
      });
      window.addEventListener('keyup', e=>{
        if(e.key===' ') this._tahtaSpace=false;
        if(e.key.indexOf('Arrow')===0) this._tahtaNudged=false;
      });
    }
  }
  _tahtaOnNoteInput(e){ this.setState({tahtaNoteInput:(e&&e.target&&e.target.value)||''}); }
  _tahtaOnNoteKey(e){ if(e.key==='Enter'){ e.preventDefault&&e.preventDefault(); this._tahtaCommitNote(); } }
  _tahtaCommitNote(){
    const text=String(this.state.tahtaNoteInput||'').trim(); if(!text) return;
    this.state.noteInput=text;
    this.setState({tahtaNoteInput:''});
    this.addNote();
    this._tahtaAddAtView(text, 'note');
  }
  _tahtaCloseMenu(){ if(this.state.tahtaMenu) this.setState({tahtaMenu:null}); }
  _tahtaBindings(st){
    if(st.tahtaOpen) this._tahtaEnsure();
    const doc=this._tahtaDoc();
    const tool=st.tahtaTool||'select';
    const notes=this._tahtaNoteList();
    const tx=(tr,en)=>this._tx?this._tx(tr,en):tr;
    const pill=(id,label,hint)=>({ id, btn:true, sep:false, label, title:hint||label, onClick:()=>this._tahtaSetTool(id), cls:'gx-tahta-tool'+(tool===id?' on':'') });
    const sep=()=>({ id:'sep', btn:false, sep:true, label:'', title:'', onClick:()=>{}, cls:'' });
    const cols=['#7cc4ff','#5fe3c0','#e8c170','#f08a96','#b4a6f0','#f2f5f8'];
    const kLab={ card:tx('Kart','Card'), note:tx('Not','Note'), text:tx('Yazı','Text'), rect:tx('Kutu','Box'), ellipse:tx('Elips','Ellipse'), diamond:tx('Karar','Decision'), frame:tx('Çerçeve','Frame') };
    const selIds=this._tahtaSelIds();
    const v=this._tahtaView||{x:0,y:0,k:1};
    const el=document.getElementById('gx-tahta');
    if(el){
      el.classList.toggle('grid', doc.grid!==false);
      el.classList.toggle('noside', st.tahtaSide===false);
    }
    const q=String(st.tahtaFind||'').trim().toLowerCase();
    const arrowSel=doc.arrows.find(a=>a.id===st.tahtaSel);
    const locked=selIds.some(id=>{ const c=doc.cards.find(x=>x.id===id); return c&&c.lock; });
    return {
      tahtaOpen: !!st.tahtaOpen, openTahta: ()=>this.openTahta(), closeTahta: ()=>this.closeTahta(),
      tahtaTitle: (this.sel&&this.sel.name)||'Proje',
      tahtaTool: tool,
      tahtaTools: [
        pill('select', tx('Seç','Select'), 'V'),
        sep(),
        pill('note', tx('Not','Sticky'), 'N'),
        pill('card', tx('Kart','Card'), 'C'),
        pill('text', tx('Yazı','Text'), 'T'),
        pill('rect', tx('Kutu','Box'), 'R'),
        pill('ellipse', tx('Elips','Ellipse'), 'O'),
        pill('diamond', tx('Karar','Decision'), 'D'),
        pill('frame', tx('Çerçeve','Frame'), 'F'),
        sep(),
        pill('arrow', tx('Ok','Arrow'), 'A'),
        pill('draw', tx('Çiz','Draw'), 'P'),
        pill('hi', tx('İşaret','Highlight'), 'H'),
        pill('erase', tx('Sil','Erase'), 'E'),
        sep(),
        pill('hand', tx('Kaydır','Pan'), 'S / Space')
      ],
      tahtaColors: cols.map(c=>({ c, on: (st.tahtaColor||'#7cc4ff')===c, onClick:()=>this._tahtaSetColor(c), style:'background:'+c+( (st.tahtaColor||'#7cc4ff')===c?';outline:2px solid var(--gx-ink)':'') })),
      tahtaUndo: ()=>this._tahtaUndo(), tahtaRedo: ()=>this._tahtaRedo(),
      tahtaAddCard: ()=>this._tahtaAddAtView(''),
      tahtaFit: ()=>this._tahtaFit(), tahtaFitSel: ()=>this._tahtaFitSel(), tahtaZoomIn: ()=>this._tahtaZoom(1.18), tahtaZoomOut: ()=>this._tahtaZoom(1/1.18),
      tahtaZoomPct: st.tahtaZoomPct || Math.round((v.k||1)*100),
      tahtaSaved: st.tahtaSaved!==false, tahtaDirty: st.tahtaSaved===false,
      tahtaEmpty: !doc.cards.length && !doc.strokes.length && !doc.arrows.length,
      tahtaHasCards: doc.cards.length>0,
      tahtaGridOn: doc.grid!==false, tahtaToggleGrid: ()=>this._tahtaToggleGrid(),
      tahtaExport: ()=>this._tahtaExport(), tahtaExportJson: ()=>this._tahtaExportJson(), tahtaDup: ()=>this._tahtaDup(),
      tahtaAlignL: ()=>this._tahtaAlign('l'), tahtaAlignC: ()=>this._tahtaAlign('cx'), tahtaAlignR: ()=>this._tahtaAlign('r'),
      tahtaAlignT: ()=>this._tahtaAlign('t'), tahtaAlignM: ()=>this._tahtaAlign('cy'), tahtaAlignB: ()=>this._tahtaAlign('b'),
      tahtaDistH: ()=>this._tahtaDist('h'), tahtaDistV: ()=>this._tahtaDist('v'),
      tahtaFront: ()=>this._tahtaFront(), tahtaBack: ()=>this._tahtaBack(), tahtaLock: ()=>this._tahtaLock(),
      tahtaCurve: ()=>this._tahtaSetArrowStyle('curve'), tahtaElbow: ()=>this._tahtaSetArrowStyle('elbow'), tahtaDash: ()=>this._tahtaToggleDash(),
      tahtaHasSel: selIds.length>0, tahtaMulti: selIds.length>1, tahtaLocked: locked,
      tahtaArrowOn: !!arrowSel, tahtaArrowLabel: arrowSel?arrowSel.label:'',
      onTahtaLabel: (e)=>this._tahtaSetLabel((e&&e.target&&e.target.value)||''),
      tahtaSideOn: st.tahtaSide!==false, tahtaToggleSide: ()=>this._tahtaToggleSide(),
      tahtaFind: st.tahtaFind||'', onTahtaFind: (e)=>this.setState({tahtaFind:(e&&e.target&&e.target.value)||''}),
      tahtaMenuOpen: !!st.tahtaMenu, closeTahtaMenu: ()=>this._tahtaCloseMenu(),
      tahtaMenuStyle: st.tahtaMenu?'left:'+st.tahtaMenu.x+'px;top:'+st.tahtaMenu.y+'px':'',
      tahtaMenuItems: [
        { label:tx('Çoğalt','Duplicate'), k:'⌘D', onClick:()=>this._tahtaDup() },
        { label:locked?tx('Kilidi aç','Unlock'):tx('Kilitle','Lock'), k:'L', onClick:()=>this._tahtaLock() },
        { label:tx('Öne al','Bring forward'), k:'', onClick:()=>this._tahtaFront() },
        { label:tx('Alta al','Send back'), k:'', onClick:()=>this._tahtaBack() },
        { label:tx('Seçime sığdır','Zoom to selection'), k:'2', onClick:()=>this._tahtaFitSel() },
        { label:tx('Sil','Delete'), k:'⌫', onClick:()=>this._tahtaDeleteSel() }
      ],
      tahtaMiniClick: (e)=>this._tahtaMiniClick(e),
      tahtaTemplates: [
        { id:'flow', label:tx('Akış','Flow'), d:tx('giriş → iş → çıkış','entry → work → exit'), onClick:()=>this._tahtaApplyTemplate('flow') },
        { id:'storm', label:tx('Fırtına','Brainstorm'), d:tx('yapışkan not kümesi','sticky cluster'), onClick:()=>this._tahtaApplyTemplate('storm') },
        { id:'kanban', label:tx('Kanban','Kanban'), d:tx('üç çerçeve','three frames'), onClick:()=>this._tahtaApplyTemplate('kanban') },
        { id:'decide', label:tx('Karar','Decision'), d:tx('soru + evet/hayır','question + yes/no'), onClick:()=>this._tahtaApplyTemplate('decide') },
        { id:'retro', label:tx('Retro','Retro'), d:tx('iyi · kötü · sonraki','good · bad · next'), onClick:()=>this._tahtaApplyTemplate('retro') },
        { id:'journey', label:tx('Yolculuk','Journey'), d:tx('beş adımlı elips','five-step ellipses'), onClick:()=>this._tahtaApplyTemplate('journey') }
      ],
      tahtaCards: doc.cards.slice().sort((a,b)=>(a.z||0)-(b.z||0)).map(c=>{
        const on=selIds.indexOf(c.id)>=0, ed=st.tahtaEdit===c.id, text=String(c.text||'');
        const kind=c.kind||'card';
        return {
          id:c.id, text, editing:ed, idle:!ed, hasText:!!text, empty:!text, handles:on&&!ed&&!c.lock,
          ports:(on||tool==='arrow')&&!ed, locked:!!c.lock,
          cls:'gx-tahta-card lg-2 lg-rim k-'+kind+(on?' on':'')+(ed?' edit':'')+(c.lock?' lock':''),
          style:'left:'+c.x+'px;top:'+c.y+'px;width:'+c.w+'px;height:'+c.h+'px;--c:'+(c.color||'#7cc4ff')+';border-color:'+(c.color||'var(--gx-line)')+';z-index:'+(c.z||1),
          onInput:(e)=>this._tahtaEditCard(c.id, (e&&e.target&&e.target.value)||''),
          onBlur:()=>{ if(this.state.tahtaEdit===c.id) this.setState({tahtaEdit:null}); }
        };
      }),
      tahtaHasNotes: notes.length>0, tahtaNoNotes: !notes.length,
      tahtaNotes: notes.map(t=>({ t, onClick:()=>this._tahtaDropNote(t) })),
      tahtaNoteInput: st.tahtaNoteInput||'', onTahtaNoteInput:(e)=>this._tahtaOnNoteInput(e), onTahtaNoteKey:(e)=>this._tahtaOnNoteKey(e),
      tahtaCardRows: doc.cards.filter(c=>{
        if(!q) return true;
        return (String(c.text||'')+' '+(kLab[c.kind||'card']||'')).toLowerCase().indexOf(q)>=0;
      }).map(c=>{
        const line=String(c.text||'').split('\n')[0].trim()||(kLab[c.kind||'card']||'kart');
        const on=selIds.indexOf(c.id)>=0;
        return { label:(kLab[c.kind||'card']||'')+' · '+line+(c.lock?' 🔒':''), onClick:()=>this._tahtaSelect(c.id), cls:'gx-tahta-row'+(on?' on':'') };
      }),
      tahtaHint: tx('V seç · N not · R kutu · A ok · P çiz · L kilit · ⌘D kopya · 2 seçime sığdır','V select · N note · R box · A arrow · P draw · L lock · ⌘D duplicate · 2 fit selection')
    };
  }
