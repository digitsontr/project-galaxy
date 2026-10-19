  // ==================== PIXEL AGENTS (VS Code Pixel Agents 1:1 Sanal Ofis Motoru) ====================
  _initPixelAgents(){
    if(this._px) return;
    let saved={};
    try{ saved=JSON.parse(localStorage.getItem('gxPixelOffice')||'{}')||{}; }catch(e){}
    const seats=[
      {id:0, gx:4,  gy:4,  dir:'up', label:'Masa 1'},
      {id:1, gx:9,  gy:4,  dir:'up', label:'Masa 2'},
      {id:2, gx:14, gy:4,  dir:'up', label:'Masa 3'},
      {id:3, gx:19, gy:4,  dir:'up', label:'Masa 4'},
      {id:4, gx:4,  gy:9,  dir:'up', label:'Masa 5'},
      {id:5, gx:9,  gy:9,  dir:'up', label:'Masa 6'},
      {id:6, gx:14, gy:9,  dir:'up', label:'Masa 7'},
      {id:7, gx:19, gy:9,  dir:'up', label:'Masa 8'}
    ];
    const defaultExtras=Array.isArray(saved.extras)?saved.extras:[
      {gx:2, gy:2, kind:'plant'},
      {gx:22, gy:2, kind:'coffee'},
      {gx:22, gy:6, kind:'cooler'},
      {gx:2, gy:11, kind:'couch'},
      {gx:21, gy:11, kind:'server'},
      {gx:11, gy:2, kind:'bookshelf'}
    ];
    // Varsayılan ajan YOK: ofis boş başlar. NAVIGATOR / DOCUMENTOR gibi hazır
    // ajanlar yalnızca kullanıcı şablondan seçip işe alınca açılır (bkz. _pxTemplates).
    // Daha önce kullanıcı tarafından açılmış ajanlar localStorage'dan geri yüklenir.
    const baseAgents=(Array.isArray(saved.agents)?saved.agents:[]).filter(a=>a&&a.id&&a.name).slice(0,8).map(a=>{
      const seat=Math.max(0,Math.min(7, a.seat|0));
      return {
        id:String(a.id), name:String(a.name).slice(0,24), role:String(a.role||'Ajan').slice(0,40),
        color:/^#[0-9a-f]{6}$/i.test(a.color||'')?a.color:'#61dcff',
        model:Math.max(0,Math.min(5, a.model|0)), seat,
        state:a.paused?'paused':'idle', paused:!!a.paused,
        tool:String(a.tool||'Hazır').slice(0,80), inp:a.inp|0, out:a.out|0,
        project:String(a.project||'ProjectGalaxy'), logs:Array.isArray(a.logs)?a.logs.slice(-20):[],
        subOf:null
      };
    });
    if(saved.customCostumes){
      baseAgents.forEach(a=>{ const c=saved.customCostumes[a.id]; if(c){ if(c.model!=null) a.model=c.model; if(c.color) a.color=c.color; if(c.seat!=null) a.seat=c.seat; } });
    }
    baseAgents.forEach(a=>{
      const st=seats[a.seat]||seats[0];
      a.x=st.gx; a.y=st.gy; a.tx=st.gx; a.ty=st.gy; a.path=[]; a.mood=''; a.moodUntil=0; a.spawnFx=0;
      if(!a.logs.length) a.logs=[{text:'Ofise katıldı · Masa #'+(a.seat+1), kind:'sys'}];
    });
    const pets=[
      {id:'cat1', kind:'cat', name:'Mırnav', color:'#f59e0b', x:7, y:7, tx:7, ty:7, state:'wander', timer:40},
      {id:'dog1', kind:'dog', name:'Karabaş', color:'#a78bfa', x:16, y:7, tx:16, ty:7, state:'sleep', timer:90}
    ];
    const achList=[
      {id:'first_agent', icon:'🚀', title:'First Agent', desc:'İlk Pixel Agent karakterini sahneye çıkar', unlocked:baseAgents.length>0||!!saved.ach_first},
      {id:'team_player', icon:'🤝', title:'Team Player', desc:'Aynı anda 5 veya daha fazla ajanı ofiste bulundur', unlocked:baseAgents.length>=5||!!saved.ach_team},
      {id:'token_millionaire', icon:'💎', title:'Token Master', desc:'Toplam 20.000+ token kullanımına ulaş', unlocked:!!saved.ach_token},
      {id:'night_owl', icon:'🦉', title:'Night Owl', desc:'Gece 00:00 - 05:00 arasında ajan çalıştır', unlocked:(new Date().getHours()<5)},
      {id:'bug_squasher', icon:'🐛', title:'Bug Squasher', desc:'Terminal veya Guardian ile hata/test kontrolü yap', unlocked:!!saved.ach_bug},
      {id:'architect', icon:'🏛', title:'Architect', desc:'Koltuk Modu ile bir ajanın masasını değiştir', unlocked:!!saved.ach_seat},
      {id:'marathon', icon:'⚡', title:'Marathon', desc:'Bir ajana yeni görev gönder veya + Agent başlat', unlocked:!!saved.ach_spawn},
      {id:'decorator', icon:'🎨', title:'Decorator', desc:'Ofis Düzenleyici ile mobilya veya duvar yazısı ekle', unlocked:!!saved.ach_deco}
    ];
    this._px={
      cols:24, rows:14, zoom:saved.zoom||1,
      seats, extras:defaultExtras,
      agents:baseAgents, pets,
      petsOn:saved.petsOn!==false,
      soundOn:saved.soundOn!==false,
      wallText:saved.wallText||'GALAXY HQ',
      selId:baseAgents.length?baseAgents[0].id:null,
      seatMode:false,
      sideOpen:true,
      pane:'tasks', // tasks | tokens | costume | editor | ach
      brush:'plant',
      promptInput:'',
      creatorOpen:false,
      newName:'', newRole:'', newTask:'', newColor:'#61dcff', newModel:0, newTpl:null,
      ach:achList,
      hoverTile:null,
      tick:0
    };
    const step=()=>{
      this._pxRaf=requestAnimationFrame(step);
      this._pxStep();
      this._pxDraw('gxPixelCanvasMain', 32);
      this._pxDraw('gxPixelCanvasTerm', 24);
    };
    this._pxRaf=requestAnimationFrame(step);
  }
  _pxSave(){
    if(!this._px) return;
    try{
      const customCostumes={};
      this._px.agents.forEach(a=>{ customCostumes[a.id]={model:a.model,color:a.color,seat:a.seat}; });
      localStorage.setItem('gxPixelOffice', JSON.stringify({
        zoom:this._px.zoom, extras:this._px.extras, petsOn:this._px.petsOn, soundOn:this._px.soundOn,
        wallText:this._px.wallText, customCostumes,
        agents:this._px.agents.filter(a=>!a.subOf).map(a=>({
          id:a.id, name:a.name, role:a.role, color:a.color, model:a.model, seat:a.seat,
          paused:!!a.paused, tool:a.tool, inp:a.inp|0, out:a.out|0, project:a.project,
          logs:(a.logs||[]).slice(-20)
        })),
        ach_first:this._px.ach[0].unlocked, ach_team:this._px.ach[1].unlocked,
        ach_token:this._px.ach[2].unlocked, ach_bug:this._px.ach[4].unlocked,
        ach_seat:this._px.ach[5].unlocked, ach_spawn:this._px.ach[6].unlocked, ach_deco:this._px.ach[7].unlocked
      }));
    }catch(e){}
  }
  _pxUnlock(id){
    if(!this._px) return;
    const a=this._px.ach.find(x=>x.id===id);
    if(a && !a.unlocked){ a.unlocked=true; this._pxSave(); this.toast('🏆 Başarım açıldı: '+a.title); }
  }
  // ---- Ajan etkileşimi: log, duraklat/devam, sil, oluştur ----
  _pxLog(ag, text, kind){
    if(!ag||!text) return;
    ag.logs=ag.logs||[];
    const t=String(text).replace(/\s+/g,' ').slice(0,120);
    if(ag.logs.length && ag.logs[ag.logs.length-1].text===t) return;
    ag.logs.push({text:t, kind:kind||'sys'});
    if(ag.logs.length>30) ag.logs=ag.logs.slice(-30);
  }
  _pxRealId(pxId){
    // Pixel ajan id → gerçek AGENTS id (asistan motoru)
    return ({atlas:'atlas', navigator:'nav', nav:'nav', documentor:'doc', doc:'doc', forge:'forge', mentor:'mentor', guardian:null, captain:null})[pxId]||null;
  }
  _pxStopRunsFor(ag){
    if(!ag) return;
    try{
      const realId=this._pxRealId(ag.id);
      if(realId && this._runAgents){
        Object.keys(this._runAgents).forEach(runId=>{
          if(this._runAgents[runId]===realId && window.galaxy && window.galaxy.claudeStop){
            window.galaxy.claudeStop(runId); delete this._runAgents[runId];
            if(this._agentRunId===runId) this._agentRunId=null;
          }
        });
        this.setState({_agentBusy:false});
      } else if(this._claudeRunId && window.galaxy && window.galaxy.claudeStop){
        window.galaxy.claudeStop(this._claudeRunId); this._claudeRunId=null;
        this.setState({_conBusy:false});
      }
    }catch(e){}
  }
  _pxTogglePause(ag){
    if(!ag) return;
    const P=this._px;
    if(ag.paused){
      ag.paused=false; ag.state='idle'; ag.tool='Devam ediyor · hazır';
      this._pxLog(ag,'▶ Devam ettirildi','sys');
      this.toast('▶ '+ag.name+' devam ediyor');
    } else {
      ag.paused=true; ag.state='paused'; ag.path=[]; ag.tool='⏸ Duraklatıldı — iş bekletiliyor';
      this._pxStopRunsFor(ag);
      this._pxLog(ag,'⏸ Duraklatıldı (çalışan iş durduruldu)','warn');
      this.toast('⏸ '+ag.name+' duraklatıldı');
    }
    this._pxSave();
    this.setState({_pxTick:(this.state._pxTick||0)+1});
    void P;
  }
  _pxDeleteAgent(ag){
    if(!ag) return;
    this.askConfirm('"'+ag.name+'" ajanını ofisten tamamen kaldır?', ()=>{
      const P=this._px; if(!P) return;
      this._pxStopRunsFor(ag);
      P.agents=P.agents.filter(a=>a.id!==ag.id && a.subOf!==ag.id);
      if(P.selId===ag.id) P.selId=P.agents.length?P.agents[0].id:null;
      this._pxSave();
      this.setState({_pxTick:(this.state._pxTick||0)+1});
      this.toast('🗑 '+ag.name+' kaldırıldı');
    }, {title:'Ajanı sil', okLabel:'Sil', kind:'danger'});
  }
  _pxBreakAgent(ag){
    if(!ag||ag.paused) return;
    const couch=(this._px.extras||[]).find(x=>x.kind==='couch')||{gx:3,gy:11};
    ag.path=[]; ag.state='idle'; ag.tool='☕ Molada — kanepeye gitti';
    ag.mood='☕'; ag.moodUntil=Date.now()+6000;
    this._pxWalkTo(ag, Math.max(2,couch.gx), Math.max(3,Math.min(12,couch.gy)));
    this._pxLog(ag,'☕ Molaya çıktı','sys');
    this.setState({_pxTick:(this.state._pxTick||0)+1});
  }
  _pxTemplates(){
    return [
      {tpl:'atlas', icon:'🛰', name:'ATLAS', role:'Mimari & Analiz', color:'#61dcff', model:0, task:'Bu projenin mimari durum özetini çıkar'},
      {tpl:'navigator', icon:'🧭', name:'NAVIGATOR', role:'Yol Haritası & Standup', color:'#c77bff', model:1, task:'İhmal ettiklerim neler? Standup yap'},
      {tpl:'documentor', icon:'📚', name:'DOCUMENTOR', role:'Dokümantasyon', color:'#55e88b', model:3, task:'README eksiklerini tara'},
      {tpl:'guardian', icon:'🛡', name:'GUARDIAN', role:'Kalite & Güvenlik', color:'#ffc861', model:2, task:'Güvenlik ve kalite denetimi yap'},
      {tpl:'forge', icon:'🔨', name:'FORGE', role:'Kod Kalitesi', color:'#ff6b7a', model:2, task:'Teknik borcu tara'},
      {tpl:'claude', icon:'⚡', name:'CLAUDE', role:'Genel Amaçlı Kod Ajanı', color:'#38bdf8', model:4, task:''}
    ];
  }
  _pxCreateAgent(){
    const P=this._px; if(!P) return;
    const name=String(P.newName||'').trim().toUpperCase().slice(0,24);
    if(!name){ this.toast('Önce ajan adı yaz (veya şablon seç)','err'); return; }
    const tpl=(this._pxTemplates()||[]).find(t=>t.tpl===P.newTpl) || null;
    const canonId=tpl?tpl.tpl:null;
    if(canonId && P.agents.some(a=>a.id===canonId)){
      P.selId=canonId; P.creatorOpen=false;
      this.toast('👾 '+name+' zaten ofiste — seçildi');
      this.setState({_pxTick:(this.state._pxTick||0)+1});
      return;
    }
    if(P.agents.filter(a=>!a.subOf).length>=8){ this.toast('Ofisteki 8 masa da dolu — önce bir ajanı sil','err'); return; }
    const usedSeats=new Set(P.agents.map(a=>a.seat));
    let freeSeat=P.seats.findIndex((_,i)=>!usedSeats.has(i));
    if(freeSeat<0) freeSeat=0;
    const st=P.seats[freeSeat];
    const palette=['#61dcff','#55e88b','#ffc861','#c77bff','#ff6b9a','#38bdf8','#f97316','#a3e635'];
    const id=canonId || ('agent-'+Date.now().toString(36).slice(-6));
    const ag={
      id, name, role:String(P.newRole||'').trim().slice(0,40)||(tpl?tpl.role:'Ajan'),
      color:(tpl&&tpl.color)||P.newColor||palette[P.agents.length%palette.length],
      model:tpl?tpl.model:(P.newModel|0), seat:freeSeat,
      x:12, y:12, tx:st.gx, ty:st.gy, path:[],
      state:'idle', paused:false, tool:'Ofise katıldı · hazır',
      inp:0, out:0, project:(this.sel&&this.sel.name)||'ProjectGalaxy',
      subOf:null, spawnFx:1, mood:'🚀', moodUntil:Date.now()+4500, logs:[]
    };
    this._pxLog(ag,'Ofise katıldı · Masa #'+(freeSeat+1),'sys');
    this._pxWalkTo(ag, st.gx, st.gy);
    P.agents.push(ag); P.selId=id; P.creatorOpen=false;
    const firstTask=String(P.newTask||'').trim();
    P.newName=''; P.newRole=''; P.newTask=''; P.newTpl=null;
    this._pxUnlock('first_agent');
    if(P.agents.length>=5) this._pxUnlock('team_player');
    this._pxSave();
    this.setState({_pxTick:(this.state._pxTick||0)+1});
    this.toast('👾 '+ag.name+' ofise katıldı (Masa #'+(freeSeat+1)+')');
    if(firstTask){ P.promptInput=firstTask; setTimeout(()=>{ try{ this._pxSendPrompt(); }catch(e){} }, 60); }
  }
  _pxBeep(){
    if(!this._px||!this._px.soundOn) return;
    try{
      const Ctx=window.AudioContext||window.webkitAudioContext; if(!Ctx) return;
      const ctx=new Ctx(); const o=ctx.createOscillator(); const g=ctx.createGain();
      o.type='square'; o.frequency.setValueAtTime(587.33, ctx.currentTime);
      o.frequency.setValueAtTime(880, ctx.currentTime+0.08);
      g.gain.setValueAtTime(0.04, ctx.currentTime);
      g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime+0.22);
      o.connect(g); g.connect(ctx.destination); o.start(); o.stop(ctx.currentTime+0.22);
    }catch(e){}
  }
  _pxFindPath(sx,sy,tx,ty){
    sx=Math.round(sx); sy=Math.round(sy); tx=Math.max(1,Math.min(22,Math.round(tx))); ty=Math.max(2,Math.min(12,Math.round(ty)));
    if(sx===tx&&sy===ty) return [];
    const q=[[sx,sy,[]]], vis=new Set([sx+','+sy]);
    const dirs=[[1,0],[-1,0],[0,1],[0,-1]];
    while(q.length){
      const [cx,cy,path]=q.shift();
      if(cx===tx&&cy===ty) return path;
      if(path.length>28) continue;
      for(const [dx,dy] of dirs){
        const nx=cx+dx, ny=cy+dy, k=nx+','+ny;
        if(nx<1||nx>22||ny<2||ny>12||vis.has(k)) continue;
        vis.add(k);
        q.push([nx,ny,path.concat([[nx,ny]])]);
      }
    }
    return [[tx,ty]];
  }
  _pxWalkTo(ag, tx, ty){
    ag.path=this._pxFindPath(ag.x, ag.y, tx, ty);
    ag.tx=tx; ag.ty=ty;
  }
  _pxStep(){
    const P=this._px; if(!P) return;
    P.tick=(P.tick+1)%100000;
    const now=Date.now();
    for(const a of P.agents){
      if(a.spawnFx>0) a.spawnFx=Math.max(0, a.spawnFx-0.05);
      if(a.moodUntil && now>a.moodUntil){ a.mood=''; a.moodUntil=0; }
      if(a.paused){ a.path=[]; continue; }
      if(a.path && a.path.length){
        const [nx,ny]=a.path[0];
        const dx=nx-a.x, dy=ny-a.y, d=Math.hypot(dx,dy);
        if(d<0.12){ a.x=nx; a.y=ny; a.path.shift(); }
        else { a.x+=dx/d*0.11; a.y+=dy/d*0.11; }
      } else if(a.state==='idle' && P.tick%260===((a.seat*47)%260)){
        // Boştaki ajanlar bazen kahve makinesine veya koltuğuna yürür
        const st=P.seats[a.seat]||P.seats[0];
        if(Math.hypot(a.x-st.gx,a.y-st.gy)>1.5){
          this._pxWalkTo(a, st.gx, st.gy);
        } else if(Math.random()<0.28){
          const spot=P.extras[Math.floor(Math.random()*P.extras.length)];
          if(spot) this._pxWalkTo(a, Math.max(2,Math.min(21,spot.gx-1)), Math.max(3,Math.min(12,spot.gy)));
        }
      }
    }
    if(P.petsOn){
      for(const pt of P.pets){
        pt.timer=(pt.timer||0)-1;
        if(pt.timer<=0){
          const r=Math.random();
          if(r<0.32){ pt.state='sleep'; pt.timer=140+Math.floor(Math.random()*120); }
          else {
            pt.state='wander'; pt.timer=80+Math.floor(Math.random()*90);
            pt.tx=2+Math.floor(Math.random()*19); pt.ty=3+Math.floor(Math.random()*9);
          }
        }
        if(pt.state==='wander'){
          const dx=pt.tx-pt.x, dy=pt.ty-pt.y, d=Math.hypot(dx,dy);
          if(d>0.08){ pt.x+=dx/d*0.055; pt.y+=dy/d*0.055; }
        }
      }
    }
  }
  _pxOnEvent(src, m){
    if(!this._px||!m) return;
    const P=this._px;
    let ag=null;
    if(src==='agent' && this._runAgents && m.runId){
      const aid=this._runAgents[m.runId];
      ag=P.agents.find(x=>x.id===aid);
    } else if(src==='claude'){
      if(String(m.runId||'').indexOf('asst-')===0) ag=P.agents.find(x=>x.id==='captain');
      else ag=P.agents.find(x=>x.id===P.selId)||P.agents[0];
    } else if(src==='shell'){
      ag=P.agents.find(x=>x.id==='guardian')||P.agents[0];
      this._pxUnlock('bug_squasher');
    }
    if(!ag) ag=P.agents[0];
    if(!ag) return;
    if(ag.paused) return; // duraklatılan ajan olayla uyanmaz
    const st=P.seats[ag.seat]||P.seats[0];
    if(Math.hypot(ag.x-st.gx,ag.y-st.gy)>0.8) this._pxWalkTo(ag, st.gx, st.gy);
    const txt=String(m.text||m.data||'').trim();
    if(m.kind==='tool'){
      const low=txt.toLowerCase();
      if(/read|grep|glob|search|cat|find/.test(low)){ ag.state='read'; ag.tool='Okuyor: '+txt.slice(0,36); }
      else if(/bash|shell|exec|npm|git|test/.test(low)){ ag.state='run'; ag.tool='Komut: '+txt.slice(0,36); }
      else if(/task|subagent/.test(low)){
        ag.state='think'; ag.tool='Alt-ajan: '+txt.slice(0,32);
        this._pxSpawnSubAgent(ag, txt.slice(0,24));
      } else { ag.state='type'; ag.tool='Yazıyor: '+txt.slice(0,36); }
      this._pxLog(ag,'⚙ '+txt.slice(0,60),'tool');
      ag.inp+=Math.max(40, txt.length*4);
    } else if(m.kind==='text'||m.kind==='out'||m.kind==='data'){
      ag.state=src==='shell'?'run':'type';
      if(txt) ag.tool=txt.replace(/\s+/g,' ').slice(0,42);
      ag.out+=Math.max(12, txt.length*2);
    } else if(m.kind==='err'){
      ag.state='wait'; ag.mood='⚠️'; ag.moodUntil=Date.now()+6000;
      if(txt) ag.tool='Hata: '+txt.slice(0,36);
      this._pxLog(ag,'⚠ '+txt.slice(0,60),'warn');
    } else if(m.kind==='done'||m.kind==='exit'){
      ag.state='idle'; ag.mood='✨'; ag.moodUntil=Date.now()+5000;
      ag.tool='Görev tamamlandı ✓';
      this._pxLog(ag,'✓ Görev tamamlandı','ok');
      this._pxSave();
      // Alt ajanları temizle
      P.agents=P.agents.filter(x=>x.subOf!==ag.id);
      this._pxBeep();
    }
    const tot=P.agents.reduce((s,x)=>s+x.inp+x.out,0);
    if(tot>=20000) this._pxUnlock('token_millionaire');
    this.setState({_pxTick:(this.state._pxTick||0)+1});
  }
  _pxSpawnSubAgent(parent, label){
    const P=this._px; if(!P) return;
    if(P.agents.filter(x=>x.subOf===parent.id).length>=2) return;
    const id='sub-'+Date.now().toString(36).slice(-4);
    P.agents.push({
      id, name:parent.name+'·SUB', role:'Alt-Ajan', color:parent.color, model:(parent.model+2)%6,
      seat:parent.seat, x:parent.x+1, y:parent.y+1, tx:parent.x+1, ty:parent.y+1,
      path:[], state:'run', tool:label||'Alt görev çalışıyor', inp:320, out:180,
      project:parent.project, subOf:parent.id, spawnFx:1, mood:'⚡', moodUntil:Date.now()+4000
    });
  }
  _pxSpawnAgent(yolo){
    if(!this._px) return;
    const P=this._px;
    const usedSeats=new Set(P.agents.map(a=>a.seat));
    let freeSeat=P.seats.findIndex((_,i)=>!usedSeats.has(i));
    if(freeSeat<0) freeSeat=P.agents.length%P.seats.length;
    const st=P.seats[freeSeat];
    const palette=['#61dcff','#55e88b','#ffc861','#c77bff','#ff6b9a','#38bdf8','#f97316','#a3e635'];
    const idx=P.agents.length+1;
    const id='claude-'+idx;
    const proj=(this.sel&&this.sel.name)||'ProjectGalaxy';
    const ag={
      id, name:(yolo?'FAST-':'CLAUDE-')+idx, role:yolo?'Skip-Perms':'Claude Code',
      color:palette[idx%palette.length], model:idx%6, seat:freeSeat,
      x:12, y:12, tx:st.gx, ty:st.gy, path:[],
      state:'type', tool:(yolo?'⚡ Hızlı oturum: ':'Yeni oturum: ')+proj,
      inp:640, out:220, project:proj, spawnFx:1, mood:'🚀', moodUntil:Date.now()+4500, paused:false, logs:[]
    };
    this._pxLog(ag,'Ofise katıldı · Masa #'+(freeSeat+1),'sys');
    this._pxWalkTo(ag, st.gx, st.gy);
    P.agents.push(ag);
    P.selId=id;
    this._pxUnlock('marathon');
    if(P.agents.length>=5) this._pxUnlock('team_player');
    this._pxSave();
    this.setState({_pxTick:(this.state._pxTick||0)+1});
    this.toast('👾 '+ag.name+' ofise katıldı (Masa #'+(freeSeat+1)+')');
  }
  _pxDemoPulse(){
    if(!this._px) return;
    const P=this._px;
    const states=['type','read','run','think','wait'];
    const samples=[
      'src/index.ts yazılıyor…',
      'test/smoke.js kontrol ediliyor',
      'git diff & PR analizi',
      'README.md güncelleniyor',
      'Alt-ajan: performans taraması'
    ];
    P.agents.forEach((a,i)=>{
      if(a.paused) return;
      const st=P.seats[a.seat]||P.seats[0];
      this._pxWalkTo(a, st.gx, st.gy);
      a.state=states[(i+Math.floor(Math.random()*states.length))%states.length];
      a.tool=samples[(i+Math.floor(Math.random()*samples.length))%samples.length];
      a.inp+=450+Math.floor(Math.random()*600);
      a.out+=240+Math.floor(Math.random()*400);
      a.mood=['⚡','✨','🔥','💡'][i%4];
      a.moodUntil=Date.now()+5000;
    });
    const tot=P.agents.reduce((s,x)=>s+x.inp+x.out,0);
    if(tot>=20000) this._pxUnlock('token_millionaire');
    this.setState({_pxTick:(this.state._pxTick||0)+1});
  }
  _pxCanvasCoords(e){
    if(!e||!e.target||!this._px) return null;
    const rect=e.target.getBoundingClientRect();
    const scaleX=e.target.width/Math.max(1,rect.width);
    const scaleY=e.target.height/Math.max(1,rect.height);
    const px=(e.clientX-rect.left)*scaleX;
    const py=(e.clientY-rect.top)*scaleY;
    const tileW=e.target.width/this._px.cols;
    const tileH=e.target.height/this._px.rows;
    return {gx:Math.floor(px/tileW), gy:Math.floor(py/tileH)};
  }
  _pxCanvasMove(e){
    const c=this._pxCanvasCoords(e); if(!c||!this._px) return;
    this._px.hoverTile=c;
  }
  _pxCanvasClick(e){
    const c=this._pxCanvasCoords(e); if(!c||!this._px) return;
    const P=this._px;
    // 1) Ofis düzenleyici açıksa mobilya ekle/sil
    if(P.sideOpen && P.pane==='editor'){
      if(c.gy<2) return;
      const exIdx=P.extras.findIndex(x=>x.gx===c.gx&&x.gy===c.gy);
      if(P.brush==='erase'){
        if(exIdx>=0) P.extras.splice(exIdx,1);
      } else {
        if(exIdx>=0) P.extras[exIdx].kind=P.brush;
        else P.extras.push({gx:c.gx, gy:c.gy, kind:P.brush});
        this._pxUnlock('decorator');
      }
      this._pxSave();
      this.setState({_pxTick:(this.state._pxTick||0)+1});
      return;
    }
    // 2) Koltuk modu açıksa ve bir koltuğa tıklandıysa seçili ajanı o koltuğa taşı
    if(P.seatMode){
      const seatIdx=P.seats.findIndex(s=>Math.abs(s.gx-c.gx)<=1 && Math.abs(s.gy-c.gy)<=1);
      if(seatIdx>=0){
        const sel=P.agents.find(a=>a.id===P.selId)||P.agents[0];
        if(sel){
          const other=P.agents.find(a=>a.seat===seatIdx && a.id!==sel.id);
          if(other){ other.seat=sel.seat; const ost=P.seats[other.seat]; if(ost) this._pxWalkTo(other, ost.gx, ost.gy); }
          sel.seat=seatIdx;
          const nst=P.seats[seatIdx];
          this._pxWalkTo(sel, nst.gx, nst.gy);
          P.seatMode=false;
          this._pxUnlock('architect');
          this._pxSave();
          this.toast('🪑 '+sel.name+' → Masa #'+(seatIdx+1)+' atandı');
          this.setState({_pxTick:(this.state._pxTick||0)+1});
          return;
        }
      }
    }
    // 3) Ajana tıklandıysa seç
    const hit=P.agents.find(a=>Math.abs(a.x-c.gx)<=1.2 && Math.abs(a.y-c.gy)<=1.4);
    if(hit){
      P.selId=hit.id;
      this.setState({_pxTick:(this.state._pxTick||0)+1});
      return;
    }
    // 4) Boş zemine tıklandıysa seçili ajanı oraya yürüt
    const sel=P.agents.find(a=>a.id===P.selId);
    if(sel && c.gy>=2 && c.gy<=12){
      this._pxWalkTo(sel, c.gx, c.gy);
      this.setState({_pxTick:(this.state._pxTick||0)+1});
    }
  }
  _pxSendPrompt(){
    if(!this._px) return;
    const P=this._px;
    const txt=String(P.promptInput||'').trim();
    if(!txt) return;
    const sel=P.agents.find(a=>a.id===P.selId)||P.agents[0];
    if(!sel){ this.toast('Önce bir ajan oluştur','err'); P.creatorOpen=true; P.sideOpen=true; P.pane='tasks'; this.setState({_pxTick:(this.state._pxTick||0)+1}); return; }
    if(sel.paused){ this.toast('⏸ '+sel.name+' duraklatıldı — önce ▶ Devam de','err'); return; }
    P.promptInput='';
    const st=P.seats[sel.seat]||P.seats[0];
    this._pxWalkTo(sel, st.gx, st.gy);
    sel.state='type';
    sel.tool='Görev: '+txt.slice(0,38);
    sel.inp+=Math.max(80, txt.length*5);
    sel.mood='💻'; sel.moodUntil=Date.now()+4000;
    this._pxLog(sel,'› '+txt,'in');
    this._pxSave();
    this._pxUnlock('marathon');
    // Gerçek ajan/Claude akışına da gönder (pixel id → gerçek ajan id eşlemesiyle)
    const realId=this._pxRealId(sel.id);
    const realAg=realId?this.AGENTS.find(a=>a.id===realId):null;
    if(realAg){
      this.setState({asstAgentId:realAg.id, agentId:realAg.id, agentInput:txt, _pxTick:(this.state._pxTick||0)+1});
      setTimeout(()=>{ try{ this.sendAgent(); }catch(e){} }, 30);
    } else {
      const prefixed='['+sel.name+' · '+sel.role+'] '+txt;
      this.setState({consoleTab:'claude', consoleCollapsed:false, consoleInput:prefixed, _pxTick:(this.state._pxTick||0)+1});
      setTimeout(()=>{ try{ this.sendConsole(); }catch(e){} }, 30);
    }
  }
  _pxDraw(canvasId, baseTile){
    if(typeof document==='undefined'||!this._px) return;
    const cv=document.getElementById(canvasId); if(!cv||cv.offsetWidth===0) return;
    const ctx=cv.getContext('2d'); if(!ctx) return;
    const P=this._px;
    const T=Math.round((baseTile||32)*(canvasId==='gxPixelCanvasMain'?P.zoom:1));
    const W=P.cols*T, H=P.rows*T;
    if(cv.width!==W) cv.width=W;
    if(cv.height!==H) cv.height=H;
    ctx.imageSmoothingEnabled=false;
    const p=(x,y,w,h,c)=>{ ctx.fillStyle=c; ctx.fillRect(Math.round(x),Math.round(y),Math.round(w),Math.round(h)); };

    // 1) Duvar (üst 2 satır) + Zemin (ahşap/koyu karo dama)
    for(let gy=0;gy<P.rows;gy++){
      for(let gx=0;gx<P.cols;gx++){
        const x=gx*T, y=gy*T;
        if(gy<2){
          p(x,y,T,T, gy===0?'#1b2236':'#232c44');
          p(x,y+T-2,T,2,'#141929');
        } else {
          const odd=(gx+gy)%2===0;
          p(x,y,T,T, odd?'#1b2334':'#1f293e');
          p(x,y,T,1,'rgba(255,255,255,0.03)');
        }
      }
    }
    // Halı / çalışma alanı zemini (masaların altında yumuşak derinlik)
    p(Math.round(1.4*T), Math.round(2.55*T), Math.round(21.2*T), Math.round(10.1*T), 'rgba(64,92,148,0.20)');
    p(Math.round(1.4*T), Math.round(2.55*T), Math.round(21.2*T), 2, 'rgba(125,215,255,0.22)');
    p(Math.round(1.4*T), Math.round(12.6*T), Math.round(21.2*T), 2, 'rgba(0,0,0,0.35)');
    // Süpürgelik çizgisi
    p(0, 2*T-3, W, 3, '#334166');

    // Pencereler (gece yıldızlı gökyüzü) + Duvar Pixel Yazısı
    [3, 17].forEach(wx=>{
      const x=wx*T, y=Math.round(T*0.25), w=T*3, h=Math.round(T*1.4);
      p(x-2,y-2,w+4,h+4,'#3b4a6b');
      p(x,y,w,h,'#090d1a');
      p(x+4,y+4,3,3,'#fffce8'); p(x+w-12,y+7,2,2,'#61dcff'); p(x+w*0.5,y+10,2,2,'#c77bff');
      p(x+w/2-1,y,2,h,'#2a3550'); p(x,y+h/2-1,w,2,'#2a3550');
    });
    // Duvar tabelası (Pixel Text)
    if(P.wallText){
      const bx=7.5*T, by=Math.round(T*0.32), bw=8.5*T, bh=Math.round(T*1.25);
      p(bx-2,by-2,bw+4,bh+4,'#2d3a59');
      p(bx,by,bw,bh,'#0d1220');
      ctx.fillStyle='#61dcff';
      ctx.font=`bold ${Math.max(10,Math.round(T*0.52))}px "JetBrains Mono", monospace`;
      ctx.textAlign='center';
      ctx.fillText(String(P.wallText).toUpperCase(), bx+bw/2, by+bh*0.68);
    }

    // 2) Ekstra Mobilyalar (bitki, kahve, su sebili, koltuk, sunucu, kitaplık)
    for(const ex of P.extras){
      const x=ex.gx*T, y=ex.gy*T;
      if(ex.kind==='plant'){
        p(x+T*0.28, y+T*0.58, T*0.44, T*0.34, '#b45309');
        p(x+T*0.22, y+T*0.22, T*0.56, T*0.42, '#16a34a');
        p(x+T*0.32, y+T*0.12, T*0.36, T*0.35, '#4ade80');
      } else if(ex.kind==='coffee'){
        p(x+T*0.15, y+T*0.45, T*0.7, T*0.5, '#475569');
        p(x+T*0.25, y+T*0.15, T*0.5, T*0.35, '#1e293b');
        p(x+T*0.42, y+T*0.32, T*0.16, T*0.14, '#ef4444');
        if(P.tick%40<20) p(x+T*0.46, y+T*0.04, 3, 5, 'rgba(255,255,255,0.45)');
      } else if(ex.kind==='cooler'){
        p(x+T*0.28, y+T*0.45, T*0.44, T*0.5, '#cbd5e1');
        p(x+T*0.32, y+T*0.12, T*0.36, T*0.34, '#38bdf8');
      } else if(ex.kind==='couch'){
        p(x+T*0.08, y+T*0.32, T*1.6, T*0.55, '#7c2d12');
        p(x+T*0.14, y+T*0.42, T*1.48, T*0.38, '#ea580c');
      } else if(ex.kind==='server'){
        p(x+T*0.18, y+T*0.08, T*0.64, T*0.86, '#0f172a');
        p(x+T*0.24, y+T*0.2, T*0.52, 3, '#334155');
        p(x+T*0.24, y+T*0.4, T*0.52, 3, '#334155');
        p(x+T*0.26, y+T*0.18, 4, 4, P.tick%20<10?'#55e88b':'#61dcff');
        p(x+T*0.42, y+T*0.38, 4, 4, P.tick%30<15?'#ffc861':'#55e88b');
      } else if(ex.kind==='bookshelf'){
        p(x+T*0.1, y+T*0.08, T*0.8, T*0.85, '#78350f');
        p(x+T*0.18, y+T*0.22, T*0.15, T*0.22, '#ef4444');
        p(x+T*0.36, y+T*0.22, T*0.15, T*0.22, '#3b82f6');
        p(x+T*0.54, y+T*0.22, T*0.18, T*0.22, '#10b981');
        p(x+T*0.2, y+T*0.54, T*0.22, T*0.22, '#eab308');
        p(x+T*0.46, y+T*0.54, T*0.2, T*0.22, '#a855f7');
      }
    }

    // 3) Çalışma Masaları, Çift Monitörler ve Koltuklar (8 Masa)
    const selAg=P.agents.find(a=>a.id===P.selId);
    P.seats.forEach((st, idx)=>{
      const dx=st.gx*T, dy=(st.gy-1)*T; // Masa koltuğun 1 karo üstünde
      const occ=P.agents.find(a=>a.seat===idx && !a.subOf);
      const isWorking=occ && (occ.state==='type'||occ.state==='run'||occ.state==='read'||occ.state==='think');
      // Koltuk (alt karo)
      const cx=st.gx*T, cy=st.gy*T;
      if(P.seatMode){
        const isCur=selAg && selAg.seat===idx;
        const hl=isCur?'rgba(97,220,255,0.42)':(occ?'rgba(255,107,122,0.34)':'rgba(85,232,139,0.38)');
        p(cx+2, cy+2, T-4, T-4, hl);
      }
      p(cx+T*0.24, cy+T*0.26, T*0.52, T*0.52, '#334155');
      p(cx+T*0.3, cy+T*0.64, T*0.4, T*0.2, '#1e293b');
      // Masa yüzeyi (2 karo genişlik efekti)
      p(dx-T*0.35, dy+T*0.22, T*1.7, T*0.62, '#5c3a21');
      p(dx-T*0.35, dy+T*0.22, T*1.7, 3, '#7c4d2b');
      p(dx-T*0.3, dy+T*0.82, 4, T*0.18, '#27170c');
      p(dx+T*1.2, dy+T*0.82, 4, T*0.18, '#27170c');
      // Monitör + klavye
      const scrCol=isWorking?(P.tick%14<7?'#38bdf8':'#4ade80'):'#1e293b';
      p(dx+T*0.12, dy+T*0.05, T*0.76, T*0.44, '#0f172a');
      p(dx+T*0.17, dy+T*0.1, T*0.66, T*0.34, scrCol);
      if(isWorking){
        p(dx+T*0.22, dy+T*0.16, T*0.36, 2, '#0f172a');
        p(dx+T*0.22, dy+T*0.26, T*0.48, 2, '#0f172a');
      }
      p(dx+T*0.44, dy+T*0.49, T*0.12, T*0.1, '#475569');
      // Klavye + Kupa
      p(dx+T*0.25, dy+T*0.62, T*0.45, T*0.12, '#94a3b8');
      p(dx+T*0.92, dy+T*0.52, T*0.18, T*0.2, '#f43f5e');
    });

    // 4) Evcil Hayvanlar (Kedi & Köpek)
    if(P.petsOn){
      for(const pt of P.pets){
        const x=pt.x*T, y=pt.y*T;
        const bob=pt.state==='wander'?(Math.sin(P.tick*0.25)*2):0;
        p(x+T*0.25, y+T*0.48+bob, T*0.46, T*0.32, pt.color);
        p(x+T*0.56, y+T*0.34+bob, T*0.24, T*0.24, pt.color);
        // Kulaklar
        p(x+T*0.56, y+T*0.26+bob, 4, 4, pt.kind==='cat'?'#fbbf24':'#7c3aed');
        p(x+T*0.72, y+T*0.26+bob, 4, 4, pt.kind==='cat'?'#fbbf24':'#7c3aed');
        if(pt.state==='sleep' && P.tick%60<35){
          ctx.fillStyle='#94a3b8';
          ctx.font=`${Math.max(8,Math.round(T*0.32))}px "JetBrains Mono", monospace`;
          ctx.textAlign='left';
          ctx.fillText('zzZ', x+T*0.65, y+T*0.22);
        }
      }
    }

    // 5) Pixel Ajan Karakterleri (16x16 stilize, 6 model, animasyonlu)
    const hairColors=['#1e1b4b','#78350f','#fde047','#dc2626','#a855f7','#cbd5e1'];
    const skinColors=['#fed7aa','#fde68a','#f5d0fe','#fdba74','#e2e8f0','#fecdd3'];
    for(const a of P.agents){
      const x=a.x*T, y=a.y*T;
      const walking=a.path && a.path.length>0;
      const typing=a.state==='type'||a.state==='run';
      const bob=walking?(Math.abs(Math.sin(P.tick*0.32))*3):(typing?(P.tick%10<5?1:0):0);
      const scale=a.subOf?0.78:1;
      const ox=x+T*(1-scale)*0.5, oy=y+T*(1-scale)*0.5 - bob;
      const S=T*scale;

      // Seçili ajan beyaz çerçevesi (Pixel Agents stili)
      if(a.id===P.selId){
        ctx.strokeStyle='#ffffff';
        ctx.lineWidth=2;
        ctx.strokeRect(Math.round(ox+S*0.14), Math.round(oy+S*0.04), Math.round(S*0.72), Math.round(S*0.92));
      }
      // Matrix spawn efekti
      if(a.spawnFx>0){
        p(ox+S*0.2, oy-S*0.2, S*0.6, S*1.1, 'rgba(85,232,139,'+(a.spawnFx*0.45)+')');
      }
      // Gölge
      p(ox+S*0.22, y+T*0.84, S*0.56, 4, 'rgba(0,0,0,0.45)');
      // Bacaklar
      const legOff=walking?(P.tick%12<6?2:-2):0;
      p(ox+S*0.3, oy+S*0.68+legOff, S*0.16, S*0.2, '#1e293b');
      p(ox+S*0.54, oy+S*0.68-legOff, S*0.16, S*0.2, '#1e293b');
      // Gövde (Kostüm rengi)
      p(ox+S*0.24, oy+S*0.38, S*0.52, S*0.34, a.color);
      // Kollar (yazarken hareket eder)
      const armOff=typing?(P.tick%8<4?-3:2):0;
      p(ox+S*0.14, oy+S*0.4+armOff, S*0.12, S*0.24, a.color);
      p(ox+S*0.74, oy+S*0.4-armOff, S*0.12, S*0.24, a.color);
      // Baş & Saç (Model 0..5)
      const skin=skinColors[(a.model||0)%skinColors.length];
      const hair=hairColors[(a.model||0)%hairColors.length];
      p(ox+S*0.26, oy+S*0.12, S*0.48, S*0.28, skin);
      p(ox+S*0.24, oy+S*0.06, S*0.52, S*0.12, hair);
      if((a.model||0)%2===1) p(ox+S*0.22, oy+S*0.12, S*0.08, S*0.18, hair);
      // Gözler / Gözlük
      p(ox+S*0.34, oy+S*0.22, 3, 3, '#0f172a');
      p(ox+S*0.58, oy+S*0.22, 3, 3, '#0f172a');
      if((a.model||0)===2 || (a.model||0)===4){
        p(ox+S*0.3, oy+S*0.2, S*0.4, 2, '#38bdf8'); // Siber gözlük
      }

      // Durum Baloncuğu (Speech / Activity Bubble)
      const bx=x+T*0.5, by=oy-6;
      let badgeTxt=''; let badgeCol='#61dcff';
      if(a.paused){ badgeTxt='⏸ DURAKLATILDI'; badgeCol='#ffc861'; }
      else if(a.mood && a.moodUntil>Date.now()){ badgeTxt=a.mood; badgeCol='#ffc861'; }
      else if(a.state==='type'){ badgeTxt='⌨️ ...'; badgeCol='#55e88b'; }
      else if(a.state==='read'){ badgeTxt='📖'; badgeCol='#61dcff'; }
      else if(a.state==='run'){ badgeTxt='⚙️'; badgeCol='#ffc861'; }
      else if(a.state==='think'){ badgeTxt='💭'; badgeCol='#c77bff'; }
      else if(a.state==='wait'){ badgeTxt='❗ ONAY'; badgeCol='#ff6b7a'; }

      if(badgeTxt){
        ctx.font=`bold ${Math.max(9,Math.round(T*0.34))}px "JetBrains Mono", monospace`;
        const tw=Math.max(22, ctx.measureText(badgeTxt).width+10);
        p(bx-tw/2, by-16, tw, 15, 'rgba(10,14,24,0.92)');
        ctx.strokeStyle=badgeCol; ctx.lineWidth=1;
        ctx.strokeRect(Math.round(bx-tw/2), Math.round(by-16), Math.round(tw), 15);
        ctx.fillStyle='#f8fafc'; ctx.textAlign='center';
        ctx.fillText(badgeTxt, bx, by-5);
      }

      // İsim Etiketi
      ctx.font=`bold ${Math.max(8,Math.round(T*0.3))}px "JetBrains Mono", monospace`;
      ctx.fillStyle=a.id===P.selId?'#61dcff':'#cbd5e1';
      ctx.textAlign='center';
      ctx.fillText(a.name, x+T*0.5, y+T+Math.round(T*0.28));
    }

    // 6) Editör veya Koltuk Modu Hover İmleci
    if(P.hoverTile && ((P.sideOpen&&P.pane==='editor') || P.seatMode)){
      const hx=P.hoverTile.gx*T, hy=P.hoverTile.gy*T;
      ctx.strokeStyle='#61dcff'; ctx.lineWidth=2;
      ctx.strokeRect(hx+1, hy+1, T-2, T-2);
    }
  }
  _pxRenderVals(){
    if(!this._px) this._initPixelAgents();
    const P=this._px;
    const sel=P.agents.find(a=>a.id===P.selId)||P.agents[0]||null;
    const selSafe=sel||{name:'Ajan yok',state:'idle',tool:'Ofis boş — + Yeni Agent ile ilk ajanını oluştur',seat:0,color:'#61dcff',model:0,paused:false,logs:[]};
    const stMeta={
      type:{l:'YAZIYOR', bg:'rgba(85,232,139,.15)', col:'#55e88b'},
      read:{l:'OKUYOR', bg:'rgba(97,220,255,.15)', col:'#61dcff'},
      run:{l:'KOMUT', bg:'rgba(255,200,97,.15)', col:'#ffc861'},
      think:{l:'DÜŞÜNÜYOR', bg:'rgba(199,123,255,.15)', col:'#c77bff'},
      wait:{l:'BEKLİYOR', bg:'rgba(255,107,122,.18)', col:'#ff6b7a'},
      paused:{l:'⏸ DURAKLATILDI', bg:'rgba(255,200,97,.16)', col:'#ffc861'},
      idle:{l:'HAZIR', bg:'rgba(148,163,184,.12)', col:'#94a3b8'}
    };
    const fmtTok=n=>n>=1000?(n/1000).toFixed(1)+'k':String(n||0);
    const totTok=P.agents.reduce((s,a)=>s+(a.inp||0)+(a.out||0),0);
    const maxTok=Math.max(1000, ...P.agents.map(a=>(a.inp||0)+(a.out||0)));
    const cost=((totTok/1000)*0.003).toFixed(3);
    const unlockedCount=P.ach.filter(a=>a.unlocked).length;
    const setPane=(pane)=>{
      if(P.sideOpen && P.pane===pane) P.sideOpen=false;
      else { P.sideOpen=true; P.pane=pane; }
      this.setState({_pxTick:(this.state._pxTick||0)+1});
    };
    const sideTitles={tasks:'GÖREVLER & AJANLAR', tokens:'TOKEN & MALİYET', costume:'KOSTÜM & MODEL', editor:'OFİS DÜZENLEYİCİ', ach:'BAŞARIMLAR (8)'};
    const modelDefs=[
      [0,'👩‍💻','Siber Uzman'],[1,'🧑‍🚀','Kaptan Pilot'],[2,'🕶️','Neon Hacker'],
      [3,'🧙','Bilge Mimar'],[4,'🤖','Sentetik Droid'],[5,'🦊','Gece Bekçisi']
    ];
    const paletteDefs=[
      ['#61dcff','Buz Mavisi'],['#55e88b','Zümrüt'],['#ffc861','Kehribar'],['#c77bff','Mor Bulutsu'],
      ['#ff6b9a','Mercan'],['#38bdf8','Gökyüzü'],['#f97316','Turuncu'],['#a3e635','Limon']
    ];
    const brushDefs=[
      ['plant','🌿','Bitki'],['coffee','☕','Kahve'],['cooler','💧','Su Sebili'],['couch','🛋️','Koltuk'],
      ['server','🖥️','Sunucu'],['bookshelf','📚','Kitaplık'],['erase','🗑️','Silgi']
    ];
    return {
      pxSpawnAgent:()=>this._pxSpawnAgent(false),
      pxSpawnNormal:()=>this._pxSpawnAgent(false),
      pxSpawnYolo:()=>this._pxSpawnAgent(true),
      pxToggleSeatMode:()=>{ P.seatMode=!P.seatMode; this.setState({_pxTick:(this.state._pxTick||0)+1}); },
      pxSeatBtnCls:'gx-px-btn'+(P.seatMode?' on':''),
      pxToggleTasks:()=>setPane('tasks'),
      pxTaskBtnCls:'gx-px-btn'+(P.sideOpen&&P.pane==='tasks'?' on':''),
      pxAgentCount:P.agents.length,
      pxToggleTokens:()=>setPane('tokens'),
      pxTokenBtnCls:'gx-px-btn'+(P.sideOpen&&P.pane==='tokens'?' on':''),
      pxTotalTokens:fmtTok(totTok),
      pxTotalCost:'$'+cost,
      pxToggleCostume:()=>setPane('costume'),
      pxCostumeBtnCls:'gx-px-btn'+(P.sideOpen&&P.pane==='costume'?' on':''),
      pxToggleEditor:()=>setPane('editor'),
      pxEditorBtnCls:'gx-px-btn'+(P.sideOpen&&P.pane==='editor'?' on':''),
      pxToggleAch:()=>setPane('ach'),
      pxAchBtnCls:'gx-px-btn'+(P.sideOpen&&P.pane==='ach'?' on':''),
      pxAchUnlocked:unlockedCount,
      pxTogglePets:()=>{ P.petsOn=!P.petsOn; this._pxSave(); this.setState({_pxTick:(this.state._pxTick||0)+1}); },
      pxPetsBtnCls:'gx-px-btn'+(P.petsOn?' on':''),
      pxPetCount:P.petsOn?P.pets.length:0,
      pxToggleSound:()=>{ P.soundOn=!P.soundOn; this._pxSave(); this.setState({_pxTick:(this.state._pxTick||0)+1}); },
      pxSoundBtnCls:'gx-px-btn'+(P.soundOn?' on':''),
      pxSoundLabel:P.soundOn?'🔊 Ses':'🔇 Sessiz',
      pxDemoPulse:()=>this._pxDemoPulse(),
      pxZoomOut:()=>{ P.zoom=Math.max(0.75, +(P.zoom-0.25).toFixed(2)); this._pxSave(); this.setState({_pxTick:(this.state._pxTick||0)+1}); },
      pxZoomIn:()=>{ P.zoom=Math.min(1.5, +(P.zoom+0.25).toFixed(2)); this._pxSave(); this.setState({_pxTick:(this.state._pxTick||0)+1}); },
      pxZoomLabel:Math.round(P.zoom*100)+'%',
      pxModeBanner:P.seatMode || (P.sideOpen&&P.pane==='editor'),
      pxModeBannerText:P.seatMode
        ? ('🪑 KOLTUK MODU: Seçili ajan ('+selSafe.name+') için haritadaki mavi/yeşil koltuklardan birine tıkla.')
        : ('🛠 OFİS DÜZENLEYİCİ: Haritaya tıklayarak seçili nesneyi ('+P.brush+') yerleştir veya sil.'),
      pxClearMode:()=>{ P.seatMode=false; if(P.pane==='editor') P.pane='tasks'; this.setState({_pxTick:(this.state._pxTick||0)+1}); },
      pxCanvasClick:(e)=>this._pxCanvasClick(e),
      pxCanvasMove:(e)=>this._pxCanvasMove(e),
      pxSideOpen:!!P.sideOpen,
      pxSideTitle:sideTitles[P.pane]||'GÖREVLER',
      pxCloseSide:()=>{ P.sideOpen=false; this.setState({_pxTick:(this.state._pxTick||0)+1}); },
      pxPaneTasks:P.pane==='tasks',
      pxPaneTokens:P.pane==='tokens',
      pxPaneCostume:P.pane==='costume',
      pxPaneEditor:P.pane==='editor',
      pxPaneAch:P.pane==='ach',
      pxAgentsList:P.agents.map(a=>{
        const m=stMeta[a.paused?'paused':a.state]||stMeta.idle;
        return {
          id:a.id, name:a.name, role:a.role,
          cardCls:'gx-px-card'+(a.id===P.selId?' sel':'')+(a.paused?' paused':''),
          dotStyle:`width:8px;height:8px;border-radius:50%;background:${a.paused?'var(--gx-warn)':a.color};box-shadow:0 0 8px ${a.paused?'var(--gx-warn)':a.color};flex-shrink:0`,
          badgeStyle:`background:${m.bg};color:${m.col};border:1px solid ${m.col}`,
          stateLabel:m.l,
          toolText:a.paused?'⏸ Duraklatıldı — devam bekliyor':(a.tool||'Hazır'),
          seatNum:(a.seat||0)+1,
          project:a.project||'ProjectGalaxy',
          tokens:fmtTok((a.inp||0)+(a.out||0)),
          pauseLabel:a.paused?'▶ Devam':'⏸ Duraklat',
          pauseTitle:a.paused?'Ajanı devam ettir':'Ajanı duraklat (çalışan işi de durdurur)',
          pauseStyle:a.paused?'color:var(--gx-ok);border-color:rgba(85,232,139,.4)':'',
          onSelect:()=>{ P.selId=a.id; this.setState({_pxTick:(this.state._pxTick||0)+1}); },
          onTogglePause:()=>{ P.selId=a.id; this._pxTogglePause(a); },
          onBreak:()=>{ P.selId=a.id; this._pxBreakAgent(a); },
          onDelete:()=>{ P.selId=a.id; this._pxDeleteAgent(a); }
        };
      }),
      pxTokenRows:P.agents.map(a=>{
        const tot=(a.inp||0)+(a.out||0);
        const pct=Math.min(100, Math.round((tot/maxTok)*100));
        return {
          name:a.name, total:fmtTok(tot)+' tok', inp:fmtTok(a.inp||0), out:fmtTok(a.out||0),
          barStyle:`width:${pct}%;height:100%;background:${a.color}`
        };
      }),
      pxModels:modelDefs.map(([id,icon,name])=>({
        icon, name, cls:'gx-px-btn'+((selSafe.model||0)===id?' on':''),
        onClick:()=>{ if(!sel) return; sel.model=id; this._pxSave(); this.setState({_pxTick:(this.state._pxTick||0)+1}); }
      })),
      pxPalette:paletteDefs.map(([col,name])=>({
        name,
        style:`width:28px;height:28px;border-radius:6px;background:${col};border:2px solid ${selSafe.color===col?'#fff':'rgba(0,0,0,.4)'};cursor:pointer`,
        onClick:()=>{ if(!sel) return; sel.color=col; this._pxSave(); this.setState({_pxTick:(this.state._pxTick||0)+1}); }
      })),
      pxBrushes:brushDefs.map(([id,icon,label])=>({
        icon, label, cls:'gx-px-btn'+(P.brush===id?' on':''),
        onClick:()=>{ P.brush=id; this.setState({_pxTick:(this.state._pxTick||0)+1}); }
      })),
      pxWallText:P.wallText,
      onPxWallText:(e)=>{ P.wallText=(e&&e.target&&e.target.value)||''; this._pxUnlock('decorator'); this._pxSave(); this.setState({_pxTick:(this.state._pxTick||0)+1}); },
      pxResetLayout:()=>{
        P.extras=[{gx:2,gy:2,kind:'plant'},{gx:22,gy:2,kind:'coffee'},{gx:22,gy:6,kind:'cooler'},{gx:2,gy:11,kind:'couch'},{gx:21,gy:11,kind:'server'},{gx:11,gy:2,kind:'bookshelf'}];
        P.wallText='GALAXY HQ'; this._pxSave(); this.setState({_pxTick:(this.state._pxTick||0)+1});
      },
      pxAddPet:()=>{
        if(P.pets.length>=5){ this.toast('Ofiste en fazla 5 evcil hayvan olabilir'); return; }
        const isCat=P.pets.length%2===0;
        P.pets.push({id:'pet-'+Date.now(), kind:isCat?'cat':'dog', name:isCat?'Pamuk':'Dost', color:isCat?'#38bdf8':'#f43f5e', x:10, y:7, tx:12, ty:8, state:'wander', timer:60});
        P.petsOn=true; this._pxSave(); this.setState({_pxTick:(this.state._pxTick||0)+1});
      },
      pxAchievements:P.ach.map(a=>({
        icon:a.icon, title:a.title, desc:a.desc,
        status:a.unlocked?'AÇIK ✓':'KİLİTLİ',
        style:`padding:8px 10px;border:1px solid ${a.unlocked?'rgba(85,232,139,.35)':'var(--gx-line-soft)'};background:${a.unlocked?'rgba(85,232,139,.06)':'rgba(12,16,26,.5)'};border-radius:8px;opacity:${a.unlocked?'1':'.6'}`,
        badgeStyle:`font-family:'JetBrains Mono',monospace;font-size:9.5px;color:${a.unlocked?'var(--gx-ok)':'var(--gx-faint)'}`
      })),
      // -- Oluşturucu + kart kontrolleri + canlı etkileşim --
      pxCreatorOpen:!!P.creatorOpen,
      pxOpenCreator:()=>{ P.creatorOpen=true; P.sideOpen=true; P.pane='tasks'; this.setState({_pxTick:(this.state._pxTick||0)+1}); },
      pxCloseCreator:()=>{ P.creatorOpen=false; this.setState({_pxTick:(this.state._pxTick||0)+1}); },
      pxTemplates:this._pxTemplates().map(t=>({
        icon:t.icon, name:t.name,
        style:`border-color:${P.newTpl===t.tpl?t.color:'var(--gx-line)'};color:${P.newTpl===t.tpl?t.color:'var(--gx-dim)'};background:${P.newTpl===t.tpl?'rgba(255,255,255,.06)':'#161c2c'}`,
        onClick:()=>{ P.newTpl=t.tpl; P.newName=t.name; P.newRole=t.role; P.newTask=t.task||''; P.newColor=t.color; P.newModel=t.model; this.setState({_pxTick:(this.state._pxTick||0)+1}); }
      })),
      pxNewName:P.newName||'', onPxNewName:(e)=>{ P.newName=(e&&e.target&&e.target.value)||''; P.newTpl=null; this.setState({_pxTick:(this.state._pxTick||0)+1}); },
      pxNewRole:P.newRole||'', onPxNewRole:(e)=>{ P.newRole=(e&&e.target&&e.target.value)||''; this.setState({_pxTick:(this.state._pxTick||0)+1}); },
      pxNewTask:P.newTask||'', onPxNewTask:(e)=>{ P.newTask=(e&&e.target&&e.target.value)||''; this.setState({_pxTick:(this.state._pxTick||0)+1}); },
      pxCreateAgentSubmit:()=>this._pxCreateAgent(),
      pxNoAgents:P.agents.filter(a=>!a.subOf).length===0,
      pxHasSelected:!!sel,
      pxQuickActions:(()=>{
        const realId=sel?this._pxRealId(sel.id):null;
        const realAg=realId?this.AGENTS.find(a=>a.id===realId):null;
        const asks=realAg&&realAg.presets&&realAg.presets.length?realAg.presets.map(p=>p.ask):['Durum ver','Sıradaki somut adımı söyle','Riskleri sırala','Kısa özet çıkar'];
        return asks.slice(0,4).map(ask=>({ label:ask, onClick:()=>{ if(!sel||sel.paused){ if(sel) this.toast('⏸ Önce devam ettir','err'); return; } P.promptInput=ask; this._pxSendPrompt(); } }));
      })(),
      pxSelLogs:((sel&&sel.logs)||[]).slice(-14).map(l=>({
        text:l.text,
        style:`line-height:1.5;color:${l.kind==='warn'?'var(--gx-warn)':l.kind==='ok'?'var(--gx-ok)':l.kind==='in'?'var(--gx-accent)':l.kind==='tool'?'#9aa3c2':'var(--gx-dim)'};white-space:nowrap;overflow:hidden;text-overflow:ellipsis`
      })),
      pxToggleSelPause:()=>{ if(sel) this._pxTogglePause(sel); },
      pxSelPauseLabel:sel&&sel.paused?'▶ Devam':'⏸ Duraklat',
      pxSelPauseStyle:sel&&sel.paused?'color:var(--gx-ok);border-color:rgba(85,232,139,.4)':'',
      pxDeleteSelected:()=>{ if(sel) this._pxDeleteAgent(sel); },
      pxSelAgentName:selSafe.name,
      pxSelAgentStatus:sel?( (selSafe.tool||'Masasında hazır')+' · Masa #'+(selSafe.seat+1) ):selSafe.tool,
      pxPromptInput:P.promptInput||'',
      onPxPromptInput:(e)=>{ P.promptInput=(e&&e.target&&e.target.value)||''; this.setState({_pxTick:(this.state._pxTick||0)+1}); },
      onPxPromptKey:(e)=>{ if(e&&e.key==='Enter'){ e.preventDefault&&e.preventDefault(); this._pxSendPrompt(); } },
      sendPxPrompt:()=>this._pxSendPrompt(),
      pxOpenSelectedTerminal:()=>{
        this.setState({consoleTab:'claude', consoleCollapsed:false});
        this._focusConsole();
      },
      pxOpenFullView:()=>this._openTab('pixel')
    };
  }
}
