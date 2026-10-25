  renderVals(){
    const st=this.state, sel=this.sel, sc=this.STATUS[sel.status]||this.STATUS.active;
    const conH=this._liveConH(), hudH=this._liveHudH();
    const statusColor = s => (this.STATUS[s]||this.STATUS.active).c;
    const trFold = s => String(s||'').toLocaleLowerCase('tr').replace(/ı/g,'i');
    const realMode = st.loaded===true;
    const demoData = st.loaded!==true && st.loaded!=='error';
    // Seçili projenin notları/bağlantıları — gerçek modda proje verisinden.
    const noteArr = realMode ? String(sel._notes||'').split(/\n+/).map(s=>s.trim()).filter(Boolean) : (demoData?(this.NOTES[sel.id]||[]):[]);
    const linkArr = realMode ? (sel._links||[]).map(l=>Array.isArray(l)?l:[l.name||l.label||String(l),l.desc||l.role||'',l.color||'#61dcff']) : (demoData?(this.LINKS[sel.id]||[]):[]);

    const kadet=false;
    // Üst: Özet / Evren / DB / Docker / Pano. Zaman·SSH Daha menüsünde.
    const tabDefAll=[['genel','Özet'],['evren','Projeler'],['pano','Pano'],['db','DB'],['docker','Docker'],['zaman','Zamanlayıcı'],['dongu','Döngü'],['posta','Posta'],['servers','Sunucular']];
    const primaryIds=['genel','evren','db','docker','pano'];
    const moreIds=['zaman','dongu','posta','servers'];
    const tabDef=primaryIds.map(id=>tabDefAll.find(t=>t[0]===id)).filter(Boolean);
    const tabBtn=(active)=>`font-family:'Space Grotesk',sans-serif;font-size:12.5px;font-weight:${active?600:500};padding:6px 12px;cursor:pointer;border-radius:7px;background:${active?'#242a34':'transparent'};border:1px solid ${active?'#343c49':'var(--gx-line)'};color:${active?'var(--gx-ink)':'var(--gx-dim)'}`;
    const tabs=tabDef.map(([id,label])=>({id,label,cls:st.tab===id?'on':'',current:st.tab===id?'page':'false',style:'',onClick:()=>this._openTab(id)}));
    const moreItem=(active)=>`display:flex;align-items:center;width:100%;text-align:left;padding:8px 12px;cursor:pointer;border:none;border-radius:7px;background:${active?'color-mix(in srgb, var(--gx-accent) 12%, transparent)':'transparent'};color:${active?'var(--gx-accent)':'var(--gx-ink)'};font-family:'Space Grotesk',sans-serif;font-size:13px;letter-spacing:.01em`;
    const moreTabs=tabDefAll.filter(([id])=>moreIds.includes(id)).map(([id,label])=>({id,label,style:moreItem(st.tab===id),onClick:()=>this._openTab(id)}));
    const moreActive=moreIds.includes(st.tab)||!!st.moreOpen;
    const t=this._t();
    const modeBtn=(on)=>`padding:6px 10px;cursor:pointer;font-size:11px;font-family:'Space Grotesk',sans-serif;letter-spacing:.02em;border:none;background:${on?t.accA(16):'transparent'};color:${on?t.acc:t.dim};transition:background .15s`;

    const relT=(d)=>{ d=d||0; if(d<=0) return 'bugün'; if(d===1) return 'dün'; if(d<7) return d+'g önce'; if(d<31) return Math.max(1,Math.floor(d/7))+'h önce'; if(d<365) return Math.floor(d/30)+'ay önce'; return Math.floor(d/365)+'y önce'; };
    // Tazelik sırasına göre (en son dokunulan üstte) — anlamlı: dal + son aktivite; "!" gürültüsü kaldırıldı
    const railItems=this.PROJECTS.slice().sort((a,b)=>(a._stale||0)-(b._stale||0)).map(p=>{ const active=p.id===st.selId; const col=statusColor(p.status);
      const br=(p.branch&&p.branch!=='—')?p.branch:''; const meta=[br,relT(p._stale)].filter(Boolean).join(' · '); const stale=(p._stale||0)>=60;
      return {
      id:p.id, name:p.name, meta,
      rowStyle:`display:flex;align-items:center;gap:12px;width:calc(100% - 16px);margin:2px 8px;padding:10px 12px;cursor:pointer;border-radius:10px;text-align:left;${active?'background:var(--gx-panel-2);border:1px solid color-mix(in srgb, var(--gx-accent) 32%, transparent)':'background:transparent;border:1px solid transparent'}`,
      dotStyle:`width:8px;height:8px;border-radius:50%;flex-shrink:0;background:${col}`,
      nameStyle:`font-size:14px;font-weight:${active?600:500};color:${active?t.ink:'color-mix(in srgb, var(--gx-ink) 84%, var(--gx-dim))'};white-space:nowrap;overflow:hidden;text-overflow:ellipsis`,
      metaStyle:`font-family:'JetBrains Mono',monospace;font-size:11px;color:${stale?t.warn:(active?t.dim:t.faint)};white-space:nowrap;overflow:hidden;text-overflow:ellipsis;margin-top:2px`,
      active, onClick:()=>{ this.select(p.id); this.enter(); }, onEnter:()=>{ this.select(p.id); this.enter(); } }; });

    const orbitSrc=this.PROJECTS.filter(p=>p.orbit).slice().sort((a,b)=>(a._stale||0)-(b._stale||0)||String(a.name).localeCompare(String(b.name),'tr'));
    const orbitN=orbitSrc.length||1;
    const iso=this._isoSplit(orbitN);
    const CX=50, CY=47.5;
    const planets=[]; const placed=[];
    let cursor=0;
    for(let r=0;r<iso.rx.length;r++){
      const slice=orbitSrc.slice(cursor, cursor+iso.caps[r]); cursor+=iso.caps[r];
      const m=slice.length||1, rx=iso.rx[r], ry=rx*iso.tilt, spin=r*0.41;
      slice.forEach((p,i)=>{
        const ang=(i/m)*Math.PI*2 - Math.PI/2 + spin;
        const px=CX+Math.cos(ang)*rx, py=CY+Math.sin(ang)*ry;
        const depth=(Math.sin(ang)+1)/2;
        placed.push({p, px, py, depth, r, ang});
      });
    }
    placed.forEach((slot,i)=>{
      const p=slot.p, col=this._planetTint(p, statusColor(p.status)), active=p.id===st.selId, paper=false, node=false;
      const px=slot.px, py=slot.py, depth=slot.depth;
      const base=Math.max(52, Math.min(98, Math.round(58 + Math.min(28,(p.prog||0)*0.2) + (slot.r===0?12:0))));
      const sz=Math.round(base*(0.68+depth*0.5)*(1-slot.r*0.07));
      const z=3+Math.round(depth*12);
        const glow=Math.round((active?36:16)+depth*22);
        const orbStyle=`position:absolute;left:${px}%;top:${py}%;z-index:${z};transform:translate(-50%,-50%);width:${sz}px;height:${sz}px;border-radius:50%;border:none;cursor:pointer;padding:0;opacity:${(0.72+depth*0.28).toFixed(2)};background:${this.planetBg(col)};box-shadow:0 ${Math.round(8+depth*16)}px ${Math.round(10+depth*14)}px rgba(0,0,0,${(0.28+depth*0.25).toFixed(2)}),0 0 ${glow}px ${this.rgba(col,active?0.7:0.32)},inset -8px -12px 26px rgba(0,0,0,.5),inset 6px 8px 14px rgba(255,255,255,.12)${active?`,0 0 0 2px ${this.rgba(col,.6)}`:''};${active?this._floatC(8+sz/40):''}`;
      const showLabel=true;
      const pDirty=(p._git&&p._git.dirty)||0;
      const pBranch=(p._git&&p._git.branch)||p.branch||'main';
      planets.push({
        id:p.id, name:p.name, warn:!!p.warn && !paper, progLabel:'%'+p.prog, paper, node, named:paper||node, notPaper:!paper&&!node,
        branch:pBranch, desc:p.desc||p.stage||'', hasDesc:!!(p.desc||p.stage),
        dirtyBadge:pDirty>0?(pDirty+' değişiklik'):'temiz',
        dirtyStyle:`font-family:'JetBrains Mono',monospace;font-size:11px;padding:2px 7px;border-radius:999px;border:1px solid ${pDirty>0?'rgba(210,153,34,.35)':'rgba(63,185,80,.28)'};color:${pDirty>0?'var(--gx-warn)':'var(--gx-ok)'};background:${pDirty>0?'rgba(210,153,34,.08)':'rgba(63,185,80,.08)'}`,
        ox:px, oy:py, col, showLabel,
        style: orbStyle,
        labelStyle: `position:absolute;left:${px}%;top:calc(${py}% + ${sz/2+8}px);z-index:${z+1};transform:translateX(-50%);font-family:'Space Grotesk',sans-serif;font-size:${Math.round(13+depth*2)}px;font-weight:600;letter-spacing:.01em;color:${active?'#f7fbff':'#eef3ff'};opacity:${(0.88+depth*0.12).toFixed(2)};pointer-events:none;white-space:nowrap;text-shadow:0 2px 12px rgba(0,0,0,.92),0 0 18px ${this.rgba(col,.4)}`,
        onClick:()=>this.select(p.id), onEnter:()=>this._gotoProject(p.id) });
    });
    const orbitRings=iso.rx.map((rx,r)=>{
      const w=rx*2, h=rx*2*iso.tilt;
      return { style:`width:${w}%;height:${h}%;opacity:${0.82-r*0.1}` };
    });
    const groups={};
    planets.forEach(pl=>{ const key=String(pl.name||'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim().split(/[\s_-]/)[0]; if(key&&key.length>=3){ (groups[key]=groups[key]||[]).push(pl); } });
    const orbitWires=[];
    const orbitFolders=[];
    Object.keys(groups).forEach(k=>{ const g=groups[k]; if(g.length<2||g.length>8) return;
      const cx=g.reduce((s,p)=>s+p.ox,0)/g.length, cy=g.reduce((s,p)=>s+p.oy,0)/g.length;
      orbitFolders.push({ style:`left:${cx}%;top:${Math.max(8, cy-7)}%;transform:translate(-50%,-50%)` });
      for(let i=0;i<g.length-1;i++){ const a=g[i], b=g[i+1]; const dx=b.ox-a.ox, dy=b.oy-a.oy, len=Math.hypot(dx,dy), ang=Math.atan2(dy,dx)*180/Math.PI;
        orbitWires.push({ style:`position:absolute;left:${a.ox}%;top:${a.oy}%;width:${len}%;height:1px;background:linear-gradient(90deg, transparent, color-mix(in srgb, var(--gx-accent) 32%, transparent), transparent);transform-origin:0 50%;transform:rotate(${ang}deg);pointer-events:none;z-index:1;opacity:.7` }); }
    });
    const radarDots=planets.map(pl=>{ const on=pl.id===st.selId; const sz=on?11:(pl.warn?9:7);
      return { name:pl.name, onClick:()=>this.select(pl.id), onEnter:()=>this.enter(),
        style:`position:absolute;left:${pl.ox}%;top:${pl.oy}%;width:${sz}px;height:${sz}px;border-radius:50%;padding:0;border:${on?'2px solid var(--gx-accent)':'none'};background:${pl.col};transform:translate(-50%,-50%);box-shadow:0 0 ${on?10:6}px ${pl.col};z-index:${on?2:1}` }; });
    const radarSel=planets.find(pl=>pl.id===st.selId)||planets[0];
    const radarFocus=radarSel?`position:absolute;left:${radarSel.ox}%;top:${radarSel.oy}%;width:22px;height:16px;border:1px solid var(--gx-accent);transform:translate(-50%,-50%);box-shadow:0 0 8px color-mix(in srgb, var(--gx-accent) 40%, transparent)`:'';
    const sectorSelName=(planets.find(pl=>pl.id===st.selId)||{}).name || 'Gezegen seç';
    const sectorCount=String(planets.length);

    const files=this.FILES.map(f=>({ name:f.name, onClick:()=>this._openFsNode(f._rel,f._dir),
      moonCls:'gx-moon gx-body '+(f.kind||''),
      style:`position:absolute;left:${f.x}%;top:${f.y}%;z-index:${f._z||3};transform:translate(-50%,-50%);width:${f.s}px;height:${f.s}px;border-radius:50%;border:none;padding:0;cursor:pointer;background:${this.planetBg(f.c)};box-shadow:0 8px 16px rgba(0,0,0,.35),0 0 ${f.glow?24:16}px ${this.rgba(f.c,.5)};color:${f.c};${this._floatC(6)}`,
      labelStyle:`position:absolute;left:${f.x}%;top:calc(${f.y}% + ${f.s/2+8}px);z-index:3;transform:translateX(-50%);font-family:'Space Grotesk',sans-serif;font-size:12px;color:${f.glow?f.c:'#9aa3c2'};white-space:nowrap;text-shadow:0 2px 8px rgba(0,0,0,.7)` }));

    const planLabel=`${sel.plan.filter(x=>x[1]).length}/${sel.plan.length}`;
    const _mkPlanItem=(text,done,i)=>({ text:this._plainPlan(text), done, onToggle:()=>this._togglePlan(i),
      textColor:`color:${done?'#55e88b':'#c5cde8'}`,
      boxStyle:`width:16px;height:16px;margin-top:2px;flex-shrink:0;display:flex;align-items:center;justify-content:center;font-size:10px;border-radius:4px;border:1px solid ${done?'#55e88b':'rgba(190,205,255,.3)'};background:${done?'rgba(85,232,139,.13)':'transparent'};color:#55e88b`,
      check:done?'✓':'',
      md:`[${done?'x':' '}] ${text}`, mdColor:`color:${done?'#55e88b':'#ffc861'}` });
    const selPlan=sel.plan.map(([text,done],i)=>_mkPlanItem(text,done,i));
    const planSections=(()=>{
      const parsed=this._parseReadmePlan((st._readme&&st._readme.content)||'');
      const items=sel.plan||[];
      if(!parsed.length){
        if(!items.length) return [];
        return [{title:'Yapılacaklar', meta:planLabel, items:selPlan}];
      }
      const used=new Set();
      const secs=parsed.map(s=>{
        const mapped=s.items.map(it=>{
          const idx=items.findIndex((p,i)=>!used.has(i) && String(p[0]).trim()===it.text);
          if(idx<0) return null;
          used.add(idx);
          return _mkPlanItem(items[idx][0], items[idx][1], idx);
        }).filter(Boolean);
        const done=mapped.filter(x=>x.done).length;
        return {title:s.title, meta:done+'/'+mapped.length, items:mapped};
      }).filter(s=>s.items.length);
      const rest=items.map((p,i)=>used.has(i)?null:_mkPlanItem(p[0],p[1],i)).filter(Boolean);
      if(rest.length) secs.push({title:'Diğer', meta:rest.filter(x=>x.done).length+'/'+rest.length, items:rest});
      return secs;
    })();

    const leftDef=[['agac','Ağaç'],['kayit','Kayıt'],['git','Git'],['dev','Geliştir']];
    const leftTabs=leftDef.map(([id,label])=>({id,label,onClick:()=>this._setLeftTab(id),style:`flex:1;background:${st.leftTab===id?'#242a34':'transparent'};box-shadow:none;border:none;border-radius:7px;cursor:pointer;font-family:'Space Grotesk',sans-serif;font-size:12.5px;font-weight:${st.leftTab===id?600:500};padding:6px 8px;color:${st.leftTab===id?t.ink:t.dim}`}));

    // Pixel Agents üst/terminal barında DEĞİL — yalnızca sol etkinlik barında.
    const consoleTabs=[['claude','⌁ CLAUDE'],['ajan','✦ AJAN'],['bash','▮ BASH'],['pty','>_ TERMİNAL']].map(([id,label])=>({id,label,onClick:()=>{ this.setState({consoleTab:id, consoleCollapsed:false}, ()=>{ if(id==='pty') setTimeout(()=>this._ptyMount(),90); else this._focusConsole(); if(id==='ajan') this.agentCfgLoad(); }); },style:`padding:4px 10px;cursor:pointer;border-radius:6px;font-weight:600;letter-spacing:.03em;background:${st.consoleTab===id?'#242a34':'transparent'};border:1px solid ${st.consoleTab===id?'#343c49':t.line};color:${st.consoleTab===id?t.ink:t.dim};box-shadow:none`}));
    const _outSt=x=>(x==='in'?('color:'+t.dim):x==='tool'?('color:'+t.acc):x==='err'?('color:'+t.err):x==='done'?('color:'+t.ok):('color:'+t.ink))+';white-space:pre-wrap';
    const _curCon=this._con(sel&&sel.id);   // seçili projenin konsolu (proje bazlı)
    // R3) tıklanabilir çıktılar: dosya:satır → aç, localhost URL → önizle
    const _linkify=l=>{
      const txt=String(l.x||'');
      const fm=txt.match(/([\w@./-]+\.[A-Za-z]{1,8}):(\d+)(?::(\d+))?/);
      const um=txt.match(/https?:\/\/localhost:(\d+)[^\s]*/);
      if(um) return { text:txt, style:_outSt(l.t)+';cursor:pointer;text-decoration:underline dotted', onClick:()=>this.devSrvOpenUrl(um[0]) };
      if(fm && !/^https?/.test(fm[1])) return { text:txt, style:_outSt(l.t)+';cursor:pointer', onClick:()=>{ this._openFilePreview(fm[1]); setTimeout(()=>this._gotoLine(+fm[2]), 320); } };
      return { text:txt, style:_outSt(l.t), onClick:()=>{} };
    };
    const claudeLines=(_curCon.cout||[]).map(_linkify);
    const bashLines=(_curCon.bout||[]).map(_linkify);
    const bash2Lines=(_curCon.bout2||[]).map(_linkify);

    const agents=this.AGENTS.map(a=>{ const on=a.id===st.asstAgentId; const busy=!!st._agentBusy && st.asstAgentId===a.id || Object.values(this._runAgents||{}).includes(a.id);
      const ranAgo=this._ago(a.lastRunAt);
      const cmd=(a.presets&&a.presets[0]&&a.presets[0].label)||a.prompt||'';
      return { id:a.id, name:a.name, cmd, hasBadge:a.badge>0, badge:a.badge, busy,
      pulseTitle:a.name+(busy?' · çalışıyor':(ranAgo?' · son koşu '+ranAgo:' · henüz çalışmadı')),
      cardStyle:`border:1px solid ${on?a.color:this.rgba(a.color,.35)};box-shadow:${on?'0 0 14px '+this.rgba(a.color,.35):'none'}`,
      btnStyle:`position:relative;display:block;width:36px;height:36px;border-radius:50%;padding:0;background:url('${a.avatar}') center/cover,#0a0e1a;border:2px solid ${on?a.color:this.rgba(a.color,.4)};box-shadow:0 0 ${on?14:8}px ${this.rgba(a.color,on?.55:.22)}`,
      onClick:()=>this._openAsstVoice(a.id) }; });
    const activeRaw=this.AGENTS.find(a=>a.id===st.agentId)||null;
    const activePresets=((activeRaw&&activeRaw.presets)||[]).map(p=>({label:p.label,onClick:()=>this.sendPreset(p.ask),style:`text-align:left;width:100%;padding:8px 14px;cursor:pointer;font-family:'JetBrains Mono',monospace;font-size:12px;border:1px solid rgba(190,205,255,.16);color:#9aa3c2;background:rgba(13,18,36,.5);border-radius:14px`}));
    const activeDesc=activeRaw?(activeRaw.role||''):''; const hasActivePresets=activePresets.length>0;
    const active=activeRaw?{...activeRaw,avatarStyle:`width:38px;height:38px;flex-shrink:0;border-radius:10px;background:url('${activeRaw.avatar}') center/cover,#0a0e1a;border:1px solid ${this.rgba(activeRaw.color,.5)}`}:{avatarStyle:'',color:'#61dcff',name:'',role:'',prompt:''};
    const activeMsgs=(activeRaw?activeRaw.msgs:[]).map(([who,text])=>{ const isU=who==='u'; return { text, isUser:isU, notUser:!isU, lines:isU?[]:this._mdLines(text),
      wrapStyle:`display:flex;${isU?'justify-content:flex-end':''}`,
      bubbleStyle:`max-width:88%;font-size:13px;line-height:1.5;padding:10px 13px;${isU?'background:rgba(97,220,255,.1);border:1px solid rgba(97,220,255,.25);color:#dbe4ff':`background:rgba(13,18,36,.7);border-radius:14px;border-left:2px solid ${activeRaw?activeRaw.color:'#61dcff'};color:#9aa3c2`}` }; });

    // ARAMA — gerçek projeler (tüm evrenler) + komutlar, query'ye göre filtrelenir.
    const q=trFold(st.query||'');
    const cmds=[
      {icon:'↺',ic:'#61dcff',label:'Kaldığın yerden devam',hint:'',fn:()=>this.resumeSession()},
      {icon:'◎',ic:'#61dcff',label:'Özet',hint:'Bugün',fn:()=>{this.setState({palette:false,query:''}); this._openTab('genel');}},
      {icon:'✎',ic:'#8ae7ff',label:'Editörde aç',hint:'Cursor / VS Code',fn:()=>{this.setState({palette:false,query:''}); this.openInEditor('auto');}},
      {icon:'⚙',ic:'#c77bff',label:'Ayarlar',hint:'',fn:()=>{this.setState({palette:false,query:''}); if(window.galaxy&&window.galaxy.openSettings)try{window.galaxy.openSettings();}catch(e){}}},
      {icon:'▤',ic:'#8aa0ff',label:'Pano',hint:'',fn:()=>{this.setState({palette:false,query:''}); this._openTab('pano');}},
      {icon:'◷',ic:'#c77bff',label:'Zamanlayıcı',hint:'',fn:()=>{this.setState({palette:false,query:''}); this._openTab('zaman');}},
      {icon:'🖧',ic:'#61dcff',label:'SSH / Sunucular',hint:'',fn:()=>{this.setState({palette:false,query:''}); this._openTab('servers');}},
      {icon:'⏱',ic:'#ffc861',label:'Odak başlat/durdur',hint:'25 dk',fn:()=>{this.setState({palette:false,query:''}); this.toggleFocus();}},
      {icon:'⎇',ic:'#55e88b',label:'Git Flow Rehberi',hint:'',fn:()=>this.setState({palette:false,query:'',gitCenter:'rehber'})},
      {icon:'↺',ic:'#ffc861',label:'Yedekler',hint:'',fn:()=>this._openBackups()},
      {icon:'▤',ic:'#8aa0ff',label:'Aktivite',hint:'',fn:()=>this.openActivity()},
      {icon:'⛁',ic:'#61dcff',label:'Veritabanı',hint:'DB',fn:()=>{this.setState({palette:false,query:''}); this._openTab('db');}},
      {icon:'▣',ic:'#8ae7ff',label:'Docker',hint:'',fn:()=>{this.setState({palette:false,query:''}); this._openTab('docker');}},
      {icon:'⌕',ic:'#61dcff',label:'Evreni ara',hint:'kod',fn:()=>this._openUniverseGrep(String(this.state.query||'').trim())},
      {icon:'↺',ic:'#c77bff',label:'Döngü',hint:'tur',fn:()=>{this.setState({palette:false,query:''}); this._openTab('dongu');}},
    ];
    const searchable = realMode ? (this._allProjects||this.PROJECTS) : (demoData?this.PROJECTS:[]);
    const recentIds=this._recentIds||this._recentRead();
    const recentPs=!q?recentIds.map(id=>searchable.find(p=>p.id===id)).filter(Boolean).slice(0,5):[];
    const recentSet=new Set(recentPs.map(p=>p.id));
    const recentRes=recentPs.map(p=>({icon:'↺',ic:statusColor(p.status),label:p.name,hint:'son · ↵ in',fn:()=>this._gotoProject(p.id)}));
    const projRes=searchable.filter(p=>!q||trFold(p.name).includes(q)).filter(p=>q||!recentSet.has(p.id)).slice(0,8).map(p=>({icon:'●',ic:statusColor(p.status),label:p.name,hint:'↵ GİT',fn:()=>this._gotoProject(p.id)}));
    const cmdRes=cmds.filter(c=>!q||trFold(c.label).includes(q));
    // ⌘K tek kapı: eşleşme olsun ya da olmasın, yazdığını doğrudan Galaxy'ye sorabilirsin.
    const rawQ=String(st.query||'').trim();
    const askRes=rawQ?[{icon:'🔮',ic:'#61dcff',label:`Kaptan’a sor: "${rawQ}"`,hint:'↵ Sor',fn:()=>this._paletteAskGalaxy(rawQ)}]:[];
    const grepRes=(rawQ&&rawQ.length>=2)?[{icon:'⌕',ic:'#8ae7ff',label:`Evreni ara: "${rawQ}"`,hint:'grep',fn:()=>this._openUniverseGrep(rawQ)}]:[];
    const palAll=[...recentRes,...cmdRes,...projRes,...askRes,...grepRes];
    this._paletteFns=palAll.map(r=>r.fn); this._paletteLen=palAll.length;
    const palIdx=Math.max(0, Math.min(st.paletteIdx||0, Math.max(0,palAll.length-1)));
    const paletteResults=palAll.map((r,i)=>({ icon:r.icon, label:r.label, hint:r.hint,
      iconStyle:`color:${r.ic};width:18px;text-align:center`,
      style:`display:flex;align-items:center;gap:12px;width:100%;padding:11px 18px;cursor:pointer;background:${i===palIdx?'rgba(97,220,255,.06)':'transparent'};border:none;border-left:2px solid ${i===palIdx?'#61dcff':'transparent'};text-align:left;color:#dbe4ff`,
      onClick:r.fn }));

    // KANBAN — gerçek todo'lar; kartı başka sütuna sürükle → durum değişir (kalıcı).
    const _todoCols=[['todo','Bekliyor','#9aa3c2'],['doing','Devam','#61dcff'],['done','Tamam','#55e88b']];
    const _todos = realMode ? (st._todos||[]) : (demoData?[{id:'1',text:'Örnek görev',status:'todo'},{id:'2',text:'Devam eden iş',status:'doing'},{id:'3',text:'Biten iş',status:'done'}]:[]);
    const board=_todoCols.map(([status,title,cc])=>{ const items=_todos.filter(t=>(t.status||(t.done?'done':'todo'))===status);
      return { title, count:items.length, empty:items.length===0,
        emptyHint:status==='todo'?'Yeni görevler burada görünür.':(status==='doing'?'Bir kartı buraya sürükleyerek çalışmaya başla.':'Tamamlanan işler burada birikir.'),
        headStyle:`font-family:'Space Grotesk',sans-serif;font-size:13px;letter-spacing:.04em;text-transform:uppercase;color:${cc};padding:14px 16px;border-bottom:1px solid var(--gx-line)`,
        onDragOver:(e)=>{ if(e&&e.preventDefault)e.preventDefault(); }, onDrop:(e)=>{ if(e&&e.preventDefault)e.preventDefault(); if(this._dragTodo){ this._todoSetStatus(this._dragTodo,status); this._dragTodo=null; } },
        cards:items.map(t=>{ const proj=(this._allProjects||this.PROJECTS||[]).find(x=>x.id===t.projectId);
          return { id:t.id, title:t.text, cc, planet:proj?proj.name:'', hasPlanet:!!proj,
          style:`border-left-color:${cc}`,
          dotStyle:`width:7px;height:7px;border-radius:50%;background:${cc}`,
          onOpen:()=>{ if(proj) this._gotoProject(proj.id); },
          onDragStart:(e)=>{ this._dragTodo=t.id; }, onDelete:(e)=>{ if(e&&e.stopPropagation)e.stopPropagation(); this._todoDelete(t.id); } }; }) };
    });

    const _schWhen=(s)=>{ if(s.when||s.cron||s.schedule) return s.when||s.cron||s.schedule;
      const days=['Pazar','Pazartesi','Salı','Çarşamba','Perşembe','Cuma','Cumartesi'];
      const hh=String(s.hour!=null?s.hour:9).padStart(2,'0'), mm=String(s.minute!=null?s.minute:0).padStart(2,'0');
      return s.type==='weekly' ? (days[s.weekday||1]+' '+hh+':'+mm) : ('Her gün '+hh+':'+mm); };
    const _schNext=(s)=>{ if(s.next||s.nextRun) return s.next||s.nextRun;
      if(s.enabled===false||s.on===false) return 'duraklatıldı';
      const hh=String(s.hour!=null?s.hour:9).padStart(2,'0'), mm=String(s.minute!=null?s.minute:0).padStart(2,'0');
      const days=['Pazar','Pazartesi','Salı','Çarşamba','Perşembe','Cuma','Cumartesi'];
      return s.type==='weekly' ? ('gelecek '+days[s.weekday||1]+' '+hh+':'+mm) : ('günlük '+hh+':'+mm); };
    const schRaw=(realMode && st._sched)
      ? st._sched.map(s=>({when:_schWhen(s), task:s.name||s.task||s.label||[s.agent,s.action].filter(Boolean).join(' ')||'görev', next:_schNext(s), on:s.enabled!==false&&s.on!==false, id:s.id, name:s.name, raw:s}))
      : (demoData?[{when:'Her sabah 09:00',task:'ATLAS durum raporu',next:'yarın 09:00',on:true,id:null},{when:'Pazartesi 10:00',task:'NAVIGATOR standup',next:'Pzt 10:00',on:true,id:null},{when:'Her gün 18:00',task:'DOCUMENTOR README kontrolü',next:'bugün 18:00',on:false,id:null}]:[]);
    const schedule=schRaw.map(s=>({ when:s.when, task:s.task, next:s.next, state:s.on?'AKTİF':'DURDU', hasId:!!s.id, on:!!s.on,
      toggleCls:s.on?'gx-toggle on':'gx-toggle',
      onToggle:s.id?()=>this._schedToggle(s):(()=>{}),
      onRun:s.id?()=>this._schedRun(s.id):(()=>{}), onDelete:s.id?()=>this.askConfirm('"'+(s.name||s.task||'görev')+'" zamanlanmış görevini sil?',()=>this._schedDelete(s.id)):(()=>{}),
      dotStyle:`width:9px;height:9px;border-radius:50%;background:${s.on?'#55e88b':'#9aa3c2'}`,
      pillStyle:`font-family:'Space Grotesk',sans-serif;font-size:11px;letter-spacing:.08em;padding:5px 10px;border:1px solid ${s.on?'rgba(85,232,139,.35)':'rgba(190,205,255,.16)'};color:${s.on?'#55e88b':'#9aa3c2'};border-radius:8px` }));

    const _g = realMode ? st._git : null;
    const gitFilesDef=(_g && _g.dirtyFiles && _g.dirtyFiles.length)
      ? _g.dirtyFiles.map(l=>{ const parts=String(l).trim().split(/\s+/); const code=parts[0]||''; const name=parts.slice(1).join(' ')||parts[0];
          const info=/D/.test(code)?['Silindi','#ff6b7a']:(/A|\?/.test(code)?['Yeni','#55e88b']:(/R/.test(code)?['Taşındı','#61dcff']:['Değişti','#ffc861'])); return [name,info[0],info[1]]; })
      : (demoData ? [['LoginView.swift','Değişti','#ffc861'],['AuthService.swift','Yeni','#55e88b'],['RoleSelectView.swift','Silindi','#ff6b7a']] : []);
    const gitFiles=gitFilesDef.map(([name,badge,c])=>({name,badge,badgeStyle:`font-size:10px;letter-spacing:.06em;padding:2px 7px;border:1px solid ${this.rgba(c,.4)};color:${c};text-transform:uppercase`}));
    const commitSrc=(_g && _g.commits && _g.commits.length)
      ? _g.commits.map(c=>[c.s||'', c.h||'', c.ad||'', c.an||''])
      : (demoData ? [['login akışı tamamlandı','a3f2c1','2 saat önce','Furkan'],['BLE eşleştirme ekranı eklendi','8e1b40','dün','Ayşe'],['proje iskeleti + CI','1c9d77','3 gün önce','Furkan']] : []);
    // yazar rengi (isimden deterministik)
    const authColor=(nm)=>{ const pal=['#61dcff','#55e88b','#ffc861','#c77bff','#ff6b7a','#7bd8ff','#f59fff']; let h=0; for(let i=0;i<String(nm).length;i++)h=(h*31+nm.charCodeAt(i))>>>0; return pal[h%pal.length]; };
    const commits=commitSrc.map(([msg,hash,when,who])=>{ const wc=authColor(who||'?'); return {msg,hash,when,who:who||'?',whoColor:wc,
      whoStyle:`font-family:'JetBrains Mono',monospace;font-size:10px;color:${wc}`,
      dotStyle:`position:absolute;left:-23px;top:4px;width:9px;height:9px;border-radius:50%;background:${wc};box-shadow:0 0 8px ${wc}`}; });
    const gitBranchName=(_g && _g.branch) || sel.branch || '?';
    const gitDirtyCount=_g ? (_g.dirty!=null?_g.dirty:(_g.dirtyFiles||[]).length) : (demoData?3:0);
    const hasGitFiles=gitFiles.length>0, hasCommits=commits.length>0;
    // Canlı git özeti (sol panel için): ahead/behind + durum satırı
    const gitAhead=(_g&&_g.ahead)||0, gitBehind=(_g&&_g.behind)||0, gitHasUpstream=!!(_g&&_g.hasUpstream);
    const gitAB=(gitAhead||gitBehind)?[(gitAhead?'↑'+gitAhead:''),(gitBehind?'↓'+gitBehind:'')].filter(Boolean).join(' '):(gitHasUpstream?'güncel':'takipsiz');
    const gitStatusLine=gitDirtyCount>0?(gitDirtyCount+' değişiklik bekliyor'):'çalışma alanı temiz';
    const gitPriBase='width:100%;padding:9px 0;cursor:pointer;font-family:\'Space Grotesk\',sans-serif;font-size:12px;border-radius:8px;margin-bottom:6px;';
    const gitPriCyan=gitPriBase+'border:1px solid #61dcff;background:rgba(97,220,255,.1);color:#61dcff';
    const gitPriGreen=gitPriBase+'border:1px solid #55e88b;background:rgba(85,232,139,.1);color:#55e88b';
    const gitPriMuted=gitPriBase+'border:1px solid rgba(190,205,255,.18);background:transparent;color:#9aa3c2;cursor:default';
    let gitPrimaryLabel='Güncel', gitPrimaryTitle='Çalışma alanı güncel', gitPrimaryStyle=gitPriMuted, gitShowPullGhost=false, gitPrimaryFn=()=>{};
    if(gitDirtyCount>0){ gitPrimaryLabel='Değişiklikleri incele'; gitPrimaryTitle='Dosyaları incele, seç ve commit et'; gitPrimaryStyle=gitPriGreen; gitPrimaryFn=async()=>{ await this._loadGit(); this.setState({gitMsg:this._suggestCommitMsg()}); }; gitShowPullGhost=gitBehind>0; }
    else if(gitAhead>0){ gitPrimaryLabel='⬆ Push'; gitPrimaryTitle='Push (uzağa gönder)'; gitPrimaryStyle=gitPriCyan; gitPrimaryFn=()=>this.gitPush(); gitShowPullGhost=gitBehind>0; }
    else if(gitBehind>0){ gitPrimaryLabel='⬇ Pull'; gitPrimaryTitle='Pull (uzaktan indir)'; gitPrimaryStyle=gitPriCyan; gitPrimaryFn=()=>this.gitPull(); }
    const gitTopCommit=commits[0]||null;
    const isGitRepoSel=!!(_g||(sel&&sel._git));
    // --- Git istemci: staged/unstaged dosyalar + aksiyonlar ---
    const _gfRaw=(_g&&_g.files)||[];
    const _gf=_gfRaw.length?_gfRaw:(((_g&&_g.dirtyFiles)||[]).map(l=>{ const parts=String(l).trim().split(/\s+/); const code=parts[0]||''; const path=parts.slice(1).join(' ')||parts[0]; const label=/D/.test(code)?'Silindi':(/A|\?/.test(code)?'Yeni':(/R/.test(code)?'Taşındı':'Değişti')); return {path, label, staged:false, unstaged:true}; }));
    const fColor=(lbl)=>/Sil/.test(lbl)?'#ff6b7a':(/Yeni/.test(lbl)?'#55e88b':(/Taşı/.test(lbl)?'#61dcff':'#ffc861'));
    const fRow=(f,staged)=>({ path:f.path, label:f.label,
      badgeStyle:`font-size:10px;letter-spacing:.05em;padding:2px 6px;border:1px solid ${this.rgba(fColor(f.label),.4)};color:${fColor(f.label)};text-transform:uppercase;flex-shrink:0`,
      rowStyle:`display:flex;align-items:center;gap:9px;padding:4px 0;font-family:'JetBrains Mono',monospace;font-size:12px`,
      nameStyle:`color:#9aa3c2;flex:1;cursor:pointer;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;background:none;border:none;text-align:left;font-family:'JetBrains Mono',monospace;font-size:12px;padding:0`,
      onDiff:()=>this.gitViewDiff(f.path,staged),
      onStage:()=>this.gitStage(f.path), onUnstage:()=>this.gitUnstage(f.path) });
    const stagedArr=_gf.filter(f=>f.staged), unstagedArr=_gf.filter(f=>f.unstaged);
    const gitStagedList=stagedArr.map(f=>fRow(f,true)), gitUnstagedList=unstagedArr.map(f=>fRow(f,false));
    const gitBranchList=((_g&&_g.branches)||[]).map(b=>({name:b, current:b===gitBranchName,
      onClick:()=>this.gitSwitchBranch(b),
      style:`display:block;width:100%;text-align:left;padding:8px 10px;cursor:pointer;font-family:'Space Grotesk',sans-serif;font-size:13px;border:1px solid ${b===gitBranchName?'var(--gx-accent)':'var(--gx-line)'};color:${b===gitBranchName?'var(--gx-accent)':'var(--gx-ink)'};background:${b===gitBranchName?'color-mix(in srgb, var(--gx-accent) 10%, transparent)':'transparent'};border-radius:8px`}));
    const _gitDiff=st._gitDiff;
    // Takım akışı: commit'leri yazara göre topla
    const authMap={}; commitSrc.forEach(([,,,who])=>{ const a=who||'?'; authMap[a]=(authMap[a]||0)+1; });
    const totalCommits=Object.values(authMap).reduce((a,b)=>a+b,0)||1;
    const authors=Object.entries(authMap).sort((a,b)=>b[1]-a[1]).map(([name,n])=>{ const c=authColor(name); const pct=Math.round(n/totalCommits*100); return {
      name, count:n+' commit', pct:pct+'%', color:c,
      dotStyle:`width:10px;height:10px;border-radius:50%;background:${c};box-shadow:0 0 8px ${c};flex-shrink:0`,
      nameStyle:`font-size:13px;color:#dbe4ff;flex:1`,
      countStyle:`font-family:'JetBrains Mono',monospace;font-size:11px;color:${c}`,
      barStyle:`height:6px;border-radius:3px;background:${c};width:${pct}%;box-shadow:0 0 8px ${this.rgba(c,.6)}`,
      barWrapStyle:`height:6px;border-radius:3px;background:rgba(190,205,255,.08);margin-top:6px;overflow:hidden` }; });
    const hasAuthors=authors.length>0;

    const srcTab=(on)=>`flex:1;padding:9px;cursor:pointer;font-family:'JetBrains Mono',monospace;font-size:11px;letter-spacing:.06em;text-transform:uppercase;background:${on?'rgba(97,220,255,.08)':'transparent'};border:1px solid ${on?'#61dcff':'rgba(190,205,255,.16)'};color:${on?'#61dcff':'#9aa3c2'}`;
    const serverSrc = (realMode && st._db && st._db.length)
      ? st._db.map(s=>{ const c=s.type==='postgres'?'#61dcff':(s.type==='mysql'?'#ffc861':'#55e88b');
          return [s.name||s.host||'DB', [s.host,s.type].filter(Boolean).join(' · ')||(s.host||''), c, 'kayıtlı', s.type||'veritabanı']; })
      : (demoData?[['Yerel PostgreSQL','localhost:5432','#55e88b','bağlı','4 veritabanı'],['papilon-prod (SSH)','10.0.2.14 · postgres','#61dcff','bağlı','12 veritabanı'],['staging-mysql (SSH)','staging.local · mysql','#8a8fa8','uyku','3 veritabanı']]:[]);
    const servers=serverSrc.map(([name,host,c,state,dbs])=>({name,host,dbs,state,dotStyle:`width:9px;height:9px;border-radius:50%;background:${c};flex-shrink:0`,stateStyle:`font-family:'JetBrains Mono',monospace;font-size:10px;color:${c}`}));
    // DOCKER — gerçek konteyner + imaj + durum + aksiyonlar
    const ds=st._dstatus, dRunning=realMode?!!(ds&&ds.running):!!demoData;
    const dContsAll = realMode ? (st._docker||[]) : (demoData?[{id:'a',name:'galaxy-api',image:'node:20-alpine',state:'running',ports:'0.0.0.0:3000->3000/tcp',compose:'alphaapi'},{id:'b',name:'galaxy-db',image:'postgres:16',state:'running',ports:'0.0.0.0:5432->5432/tcp',compose:'alphaapi'},{id:'c',name:'redis-cache',image:'redis:7',state:'exited'}]:[]);
    const pw=st._pw||{};
    const scopeOn=this._scopePlanetOn()&&!!this._ctxPlanet();
    const composeProj=(pw.compose&&pw.compose.project)||'';
    const _cmpCo=(a,b)=>String(a||'').toLowerCase().replace(/[^a-z0-9]+/g,'')===String(b||'').toLowerCase().replace(/[^a-z0-9]+/g,'');
    const dConts = (scopeOn&&composeProj)? dContsAll.filter(d=>_cmpCo(d.compose, composeProj)) : dContsAll;
    const containers=dConts.map(d=>{ const up=/^up|running/i.test(d.state||d.status||''); const c=up?'#55e88b':'#8a8fa8';
      const cid=d.id||d.name;
      const ports=this._dockerPorts(d.ports).map(port=>({port, onClick:(e)=>{ this._dockerStopEv(e); this.openLocalPort(port); }}));
      return {name:d.name||d.id||'container',image:d.image||'',state:up?'çalışıyor':(d.state||'durdu'),up, ports, hasPorts:ports.length>0,
        dotStyle:`width:8px;height:8px;border-radius:50%;background:${c}`,
        stateStyle:`font-family:'Space Grotesk',sans-serif;font-size:12px;color:${c}`,act:up?'⏹':'▸',
        onClick:()=>this.dockerOpenDetail({kind:'container',id:cid,name:d.name||cid,image:d.image,state:d.state,status:d.status,ports:d.ports,created:d.created,up}),
        onToggle:(e)=>{ this._dockerStopEv(e); this._dockerAct(cid,up?'stop':'start'); },
        onStart:(e)=>{ this._dockerStopEv(e); if(!up) this._dockerAct(cid,'start'); },
        onStop:(e)=>{ this._dockerStopEv(e); if(up) this._dockerAct(cid,'stop'); },
        startStyle: up ? 'opacity:.4;cursor:default' : 'border-color:var(--gx-accent);color:#04121c;background:var(--gx-accent);font-weight:600',
        stopStyle: up ? 'border-color:color-mix(in srgb, var(--gx-err) 55%, transparent);color:var(--gx-err)' : 'opacity:.4;cursor:default',
        onLog:(e)=>{ this._dockerStopEv(e); this.dockerOpenLog(cid,d.name); },
        onRestart:(e)=>{ this._dockerStopEv(e); this._dockerAct(cid,'restart'); },
        onRemove:(e)=>{ this._dockerStopEv(e); this.askConfirm('"'+(d.name||d.id)+'" konteynerini kaldır? (durdurulup silinir)',()=>this._dockerAct(cid,'rm')); }}; });
    const dockerImages=(realMode?(st._images||[]):(demoData?[{id:'i1',repo:'node',tag:'20-alpine',size:'180MB',created:'2 gün önce'},{id:'i2',repo:'postgres',tag:'16',size:'420MB',created:'1 hafta önce'}]:[]))
      .map(im=>({repo:im.repo||im.id,tag:im.tag||'',size:im.size||'',created:im.created||'',
        onClick:()=>this.dockerOpenDetail({kind:'image',id:im.id||((im.repo||'')+(im.tag?':'+im.tag:'')),repo:im.repo,tag:im.tag,size:im.size,created:im.created}),
        onRemove:(e)=>{ this._dockerStopEv(e); this.askConfirm((im.repo||im.id)+':'+(im.tag||'')+' imajını sil?',()=>this._dockerImgAct(im.id,'rm')); },
        dotStyle:`width:8px;height:8px;border-radius:50%;background:${im.dangling?'#8a8fa8':'#61dcff'}`}));
    // DB — bağlantı listesi + ekleme formu + gerçek şema
    const dbSrc=(realMode?(st._db||[]):(demoData?[{id:'x',name:'Yerel PG',type:'postgres',host:'localhost'}]:[]));
    const ctxP=this._ctxPlanet();
    const dbFiltered=(scopeOn&&ctxP)? dbSrc.filter(c=>c.projectId===ctxP.id || c.id===pw.boundDbId) : dbSrc;
    const dbShow=(scopeOn&&ctxP)? dbFiltered : dbSrc;
    const dbConns=dbShow.map(c=>{ const on=c.id===st.dbSel;
      return {id:c.id,name:c.name,type:c.type||'',
        style:`display:flex;align-items:center;gap:8px;padding:8px 12px;cursor:pointer;font-family:'JetBrains Mono',monospace;font-size:12px;border:1px solid ${on?'#61dcff':'rgba(190,205,255,.16)'};color:${on?'#61dcff':'#9aa3c2'};background:${on?'rgba(97,220,255,.08)':'transparent'}`,
        onClick:()=>this.dbSelectConn(c.id), onDelete:(e)=>{if(e&&e.stopPropagation)e.stopPropagation();this.askConfirm('"'+(c.name||'bağlantı')+'" veritabanı bağlantısını sil?',()=>this.dbDeleteConn(c.id));}}; });
    const dbHasConns=dbConns.length>0;
    const dbf=st.dbForm||{};
    const dbTypeBtn=t=>`padding:6px 12px;cursor:pointer;font-family:'JetBrains Mono',monospace;font-size:11px;text-transform:uppercase;border:1px solid ${dbf.type===t?'#61dcff':'rgba(190,205,255,.16)'};color:${dbf.type===t?'#61dcff':'#9aa3c2'};background:${dbf.type===t?'rgba(97,220,255,.08)':'transparent'}`;
    const dbdbs=(st._dbdbs||[]).map(d=>({name:d,onClick:()=>this.dbPickDatabase(d),
      style:`padding:5px 11px;cursor:pointer;font-family:'JetBrains Mono',monospace;font-size:11px;border:1px solid ${d===st.dbDatabase?'#61dcff':'rgba(190,205,255,.16)'};color:${d===st.dbDatabase?'#61dcff':'#9aa3c2'};background:${d===st.dbDatabase?'rgba(97,220,255,.08)':'transparent'}`}));
    const _sch=st._dbschema;
    const dbSchemaTables=((_sch&&_sch.tables)||[]).map((t,i)=>{ const c=['#61dcff','#c77bff','#ffc861','#55e88b'][i%4];
      return {name:t.name, onClick:()=>this.dbOpenTable(t.name),
        headStyle:`font-family:'JetBrains Mono',monospace;font-size:12px;color:${c};padding:8px 14px;border-bottom:1px solid ${this.rgba(c,.25)};background:${this.rgba(c,.06)};cursor:pointer;display:flex;align-items:center;justify-content:space-between`,
        boxStyle:`border:1px solid ${this.rgba(c,.35)};background:rgba(13,18,36,.85);border-radius:14px;cursor:pointer`,
        columns:((t.columns)||[]).map(cl=>({txt:(cl.pk?'🔑 ':'')+cl.name+' · '+(cl.type||''), style:`color:${cl.pk?'#ffc861':'#9aa3c2'}`}))}; });
    // Tablo veri editörü grid
    const _td=st._dbTableData; const _edits=st._dbEdits||{};
    const dbHasPk=!!(_td&&_td.pk&&_td.pk.length);
    const dbTableRows=((_td&&_td.rows)||[]).map((row,ri)=>{ const rowEd=_edits[ri]||{}; const dirty=Object.keys(rowEd).length>0; const delC=st._dbDelRow===ri; const busy=st._dbRowBusy===ri;
      return { ri, dirty, delConfirm:delC, notDelConfirm:!delC, busy,
        cells:((_td&&_td.fields)||[]).map((col,ci)=>{ const orig=row[ci]; const has=Object.prototype.hasOwnProperty.call(rowEd,col); const val=has?rowEd[col]:(orig==null?'':String(orig)); const isPk=(_td.pk||[]).includes(col);
          return { value:val, onInput:(e)=>this.onCellInput(ri,col,e), readOnly:isPk&&dbHasPk,
            style:`width:100%;box-sizing:border-box;min-width:${isPk?'56px':'130px'};background:${has?'rgba(97,220,255,.1)':'transparent'};border:1px solid ${has?'#61dcff':'rgba(190,205,255,.08)'};color:${isPk?'#ffc861':'#dbe4ff'};font-family:'JetBrains Mono',monospace;font-size:13px;padding:7px 9px;outline:none${(isPk&&dbHasPk)?';opacity:.7':''}` }; }),
        onSave:()=>this.dbSaveRow(ri), onAskDelete:()=>this.askDeleteRow(ri), onDoDelete:()=>this.dbDoDeleteRow(ri), onCancelDelete:()=>this.cancelDeleteRow(),
        saveStyle:`padding:4px 10px;cursor:${dirty?'pointer':'default'};font-family:'JetBrains Mono',monospace;font-size:10px;border:1px solid ${dirty?'#55e88b':'rgba(190,205,255,.12)'};background:${dirty?'rgba(85,232,139,.1)':'transparent'};color:${dirty?'#55e88b':'#9aa3c2'};white-space:nowrap`,
        saveLabel:busy?'…':'Kaydet' }; });
    const dbTableColHdr=((_td&&_td.fields)||[]).map(f=>({name:f+(st._dbOrderBy===f?(st._dbOrderDir==='desc'?' ▼':' ▲'):''), isPk:(_td&&_td.pk||[]).includes(f), onSort:()=>this.dbSort(f),
      style:`text-align:left;padding:8px 10px;cursor:pointer;min-width:${(_td&&_td.pk||[]).includes(f)?'56px':'130px'};font-family:'Space Grotesk',sans-serif;font-size:11px;letter-spacing:.06em;text-transform:uppercase;color:${(_td&&_td.pk||[]).includes(f)?'#ffc861':'#61dcff'};border-bottom:1px solid rgba(190,205,255,.16);white-space:nowrap`}));
    // yeni satır formu hücreleri
    const dbNewCells=((_td&&_td.fields)||[]).map(f=>({ value:(st._dbNewRow&&st._dbNewRow[f])||'', onInput:(e)=>this.onNewCell(f,e),
      style:`width:100%;box-sizing:border-box;min-width:${(_td&&_td.pk||[]).includes(f)?'56px':'130px'};background:rgba(85,232,139,.06);border:1px solid rgba(85,232,139,.25);color:#dbe4ff;font-family:'JetBrains Mono',monospace;font-size:11px;padding:5px 7px;outline:none` }));
    // sayfalama bilgisi
    const _off=st._dbOffset||0; const _tot=(_td&&_td.total);
    const dbPageInfo=(_td&&_td.rows)?((_off+1)+'–'+(_off+_td.rows.length)+(_tot!=null?(' / '+_tot):'')):'';
    const dbSchemaErr=(_sch&&_sch.error)||'';
    const dbSelName=(dbConns.find(c=>c.id===st.dbSel)||{}).name||'';
    const dockerStatusText = demoData ? 'Docker motoru çalışıyor · 3 konteyner · 2 çalışıyor'
      : (ds ? (ds.mas?'Docker bu sürümde kullanılamıyor':(ds.installed===false?'Docker kurulu değil':(ds.running?`Docker çalışıyor · ${ds.containers||0} konteyner · ${ds.containersRunning||0} çalışıyor · ${ds.images||0} imaj`:'Docker motoru durdu — başlatmak için ▸ tıkla'))) : 'Docker durumu okunuyor…');

    // Gerçek evrenler; yalnız ÖNİZLEME modunda (gerçek veri yokken) örnek kartlar gösterilir.
    // Gerçek uygulamada evren gerçekten boşsa (yeni kurulum) sahte veri GÖSTERME — kullanıcıyı yanıltır.
    const uniSrc = (this._unis && this._unis.length) ? this._unis
      : (demoData ? [{name:'İş Evreni',path:'~/Projects',planets:6,systems:2,active:4,color:'#61dcff',id:null},
         {name:'Papilon',path:'~/Papilon',planets:4,systems:1,active:2,color:'#c77bff',id:null},
         {name:'Arşiv',path:'~/Archive',planets:9,systems:3,active:0,color:'#8a8fa8',id:null}] : []);
    const universes=uniSrc.map(u=>{ const c=u.color; const on=!!u.id && u.id===st.uniId; const th=this._theme();
      return {name:u.name,path:u.path,planets:u.planets,systems:u.systems,active:u.active,
      cardStyle:`border:1px solid ${on?th.acc:'var(--gx-line)'};background:var(--gx-panel);border-radius:12px;box-shadow:none`,
      orbStyle:`width:36px;height:36px;border-radius:9px;background:color-mix(in srgb, ${c} 16%, var(--gx-panel-2));border:1px solid color-mix(in srgb, ${c} 42%, transparent);flex-shrink:0`,
      accent:c, hasId:!!u.id,
      onClick:(e)=>{ const t=e&&e.target; const el=(t&&t.nodeType===3)?t.parentElement:t; if(el&&el.closest&&el.closest('.gx-univ-acts')) return; if(u.id) this.selectUni(u.id); else this.setState({tab:'evren'}); },
      onEdit:(e)=>this._uniAct(e, ()=>this.openEditUni(u)),
      onDelete:(e)=>this._uniAct(e, ()=>{ if(u.id) this.askConfirm('"'+(u.name||'evren')+'" evrenini kaldır? (klasörler diskte kalır)',()=>this._universeDelete(u.id), {title:'Evreni kaldır', detail:'Klasörler diskte kalır. Yalnız galaksiden çıkarılır.', okLabel:'Kaldır', kind:'warn'}); }) }; });
    const uniN=universes.length||1;
    const uniOrbits=[];
    const hasUniOrbits=false;

    const isEvren=st.tab==='evren', space=st.mode==='space';
    const spaceFull=!!(space&&(isEvren||st.tab==='pano'));
    const spaceDim=!!(space&&!spaceFull&&/^(db|docker|zaman|dongu)$/.test(st.tab||''));
    try{
      document.documentElement.classList.toggle('gx-space-on', spaceFull);
      document.documentElement.classList.toggle('gx-space-dim', spaceDim);
    }catch(e){}
    const allP=realMode?(this._allProjects||this.PROJECTS):(demoData?this.PROJECTS:[]);
    const sess=this._sessRead()||(demoData?{selId:(this.PROJECTS[0]&&this.PROJECTS[0].id), lastFileName:'README.md', lastFile:'README.md'}:null);
    const resumeP=sess&&sess.selId?allP.find(p=>p.id===sess.selId):null;
    const dirtyAll=allP.filter(p=>p._git&&p._git.dirty>0);
    const staleAll=allP.filter(p=>p.status==='active'&&(p._stale||0)>=14).sort((a,b)=>(b._stale||0)-(a._stale||0));
    const dirtyPs=dirtyAll.slice(0,5);
    const stalePs=staleAll.slice(0,4);
    const openTodos=(realMode?(st._todos||[]):(demoData?[{status:'todo'},{status:'doing'}]:[])).filter(t=>(t.status||(t.done?'done':'todo'))!=='done').length;
    const deskDirty=dirtyPs.map(p=>({ name:p.name, meta:(p._git.branch||'?')+' · '+p._git.dirty+' kirli'+(p._git.ahead?(' · +'+p._git.ahead):''),
      onClick:()=>{ this._gotoProject(p.id); this._setLeftTab('git'); },
      style:'text-align:left;width:100%;padding:8px 0;cursor:pointer;background:none;border:none;border-bottom:1px solid var(--gx-line-soft);color:var(--gx-ink);font-size:13px' }));
    const deskStale=stalePs.map(p=>({ name:p.name, meta:(p._stale||0)+'g sessiz', onClick:()=>this._gotoProject(p.id),
      style:'text-align:left;width:100%;padding:8px 0;cursor:pointer;background:none;border:none;border-bottom:1px solid var(--gx-line-soft);color:var(--gx-ink);font-size:13px' }));
    const _bl=(text,onClick)=>({text, onClick:onClick||(()=>{})});
    const deskBriefLines=[];
    if(resumeP) deskBriefLines.push(_bl((resumeP.name||'')+(sess&&sess.lastFileName?(' · '+(sess.lastFileName)):'')+' — kaldığın yerden devam.', ()=>this.resumeSession()));
    if(dirtyAll.length) deskBriefLines.push(_bl(dirtyAll.length+' projede commit bekleyen değişiklik.', ()=>{ const p=dirtyAll[0]; if(p){ this._gotoProject(p.id); this._setLeftTab('git'); } }));
    if(staleAll.length) deskBriefLines.push(_bl((staleAll[0].name||'')+' '+(staleAll[0]._stale||0)+' gündür sessiz.', ()=>this._gotoProject(staleAll[0].id)));
    if(openTodos) deskBriefLines.push(_bl(openTodos+' açık görev (Pano).', ()=>this._openTab('pano')));
    if(pw.compose && !(dContsAll||[]).some(c=>_cmpCo(c.compose, pw.compose.project) && /^up|running/i.test(c.state||c.status||''))) deskBriefLines.push(_bl('Compose durmuş: '+(pw.compose.file||'compose.yaml')+' — Docker’dan bak.', ()=>this._openTab('docker')));
    const _tp=this._readTestPulse&&this._readTestPulse();
    if(_tp&&_tp.at){ const ago=this._ago(_tp.at)||'şimdi'; const ok=_tp.code==null||+_tp.code===0; deskBriefLines.push(_bl('Son test: '+(_tp.cmd||'test')+' · '+(ok?'tamam':'kod '+_tp.code)+' · '+ago+(_tp.name?(' · '+_tp.name):''), ()=>{ if(_tp.projectId) this._gotoProject(_tp.projectId); this.setState({consoleTab:'bash', consoleCollapsed:false}); })); }
    else if((pw.scripts||[]).some(s=>/^(test|typecheck)$/.test(s.name))) deskBriefLines.push(_bl('Kanıt yok: test/typecheck henüz koşmadı. Terminal çipinden çalıştır.', ()=>this.setState({consoleTab:'bash', consoleCollapsed:false})));
    const openPrs=(st._prs||[]).length;
    if(openPrs) deskBriefLines.push(_bl(openPrs+' açık PR bu projede.', ()=>{ const pr=(st._prs||[])[0]; if(pr&&window.galaxy&&window.galaxy.openPrUrl) try{ window.galaxy.openPrUrl(pr.url); }catch(e){} else { this.setState({gitCenter:'durum'}); } }));
    if((st._issues||[]).length) deskBriefLines.push(_bl((st._issues||[]).length+' açık issue.', ()=>this.setState({gitCenter:'issues'})));
    if(pw.env&&pw.env.missing&&pw.env.missing.length) deskBriefLines.push(_bl('.env örneğe göre eksik: '+pw.env.missing.slice(0,3).join(', ')+'. Değerler Galaxy’ye kopyalanmaz.', ()=>this._openTab('db')));
    if(pw.migrate) deskBriefLines.push(_bl(pw.migrate.label+' hazır'+(pw.migrate.seed?' · seed var':'' )+'.', ()=>this._openTab('db')));
    if((pw.listening||[]).length) deskBriefLines.push(_bl('Çalışan iş: localhost:'+pw.listening.join(', ')+'.', ()=>this._openPlanetPort((pw.listening||[])[0])));
    if(!deskBriefLines.length) deskBriefLines.push(_bl('Sakin bir gün. Bir proje aç veya yeni çalışma alanı bağla.', ()=>this._openTab('evren')));
    const deskBriefTitle=dirtyAll.length?'Önce commit bekleyenler':(staleAll.length?'İhmal edilenlere bak':(resumeP?('Şimdi: '+(resumeP.name||'')):(openTodos?'Açık görevler':'Bugün masası')));
      const deskNextCta=dirtyAll.length?{label:'Değişiklikleri incele', onClick:async()=>{ const p=dirtyAll[0]; if(!p) return; this._gotoProject(p.id); this._setLeftTab('git'); await this._loadGit(); this.setState({gitMsg:this._suggestCommitMsg()}); }}
      :(resumeP?{label:'Kaldığın yerden devam', onClick:()=>this.resumeSession()}
      :(staleAll.length?{label:'İhmale bak', onClick:()=>this._gotoProject(staleAll[0].id)}
      :((!(this._unis&&this._unis.length))?{label:'Çalışma alanı bağla', onClick:()=>this.setState({addUni:true})}:null)));
    const first60=!realMode?false:(!(this._unis&&this._unis.length) || (!(this._allProjects||this.PROJECTS||[]).length));
    const onOverview=!!(space&&st.tab==='genel');
    const welcome=!!(onOverview&&first60);
    const setupMiss=st.loaded!==false && !this._setupHidden() && (st._claudeOk===false || st._githubOk===false || !this._mcpOn);
    const showSetupNow=!welcome && !!(this._setupForce || setupMiss);
    const showTourNow=!welcome && !showSetupNow && this._tourShow();
    const first60Steps=[
      {n:'1', t:'Çalışma alanı bağla', d:'Projelerini içeren ana klasörü seç.'},
      {n:'2', t:'İlk projeyi aç', d:'Sol listede projeye bir kez tıkla.'},
      {n:'3', t:'Durumu gör', d:'Özet, Git, DB ve çalışan servisler proje bağlamında hazır olur.'}
    ];
    if(st.tab==='dongu'){ clearTimeout(this._loopPaintT); this._loopPaintT=setTimeout(()=>this._loopPaint(),0); }
    const bag = {
      viewOverview: space&&st.tab==='genel', universes, uniOrbits, hasUniOrbits,
      setupOpen:showSetupNow,
      setupPeek:!!(onOverview&&this._setupHidden()&&!welcome),
      dismissSetup:()=>this.dismissSetup(),
      showSetup:()=>this.showSetup(),
      setupItems:(()=>{
        const clOk=st._claudeOk!==false, ghOk=st._githubOk!==false, mailOk=!!this._mcpOn;
        const dbOk=!!(st._db&&st._db.length), sshOk=!!(st._servers&&st._servers.length);
        const row=(ok,title,body,cta,onClick)=>({ ok:!!ok, miss:!ok, title, body, cta, onClick });
        const rows=[
          row(clOk,'Claude CLI','Asistan ve ajanlar CLI ister. Ayarlar → Araçlar → Dene.','Araçlar',()=>this._openPrefs('araclar')),
          row(ghOk,'GitHub','`gh auth login` — üst şeritteki nokta bu oturumu okur.','Nasıl',()=>this._openPrefs('araclar')),
          row(mailOk,'Posta (MCP)','Gelen kutu ve yazma: Daha ▾ → Posta. Bağlantı Ayarlar → Posta’da.','Posta',()=>this._openTab('posta')),
        ];
        if(this._setupForce){
          rows.push(row(dbOk,'Veritabanı','Üst bar DB → + Bağlantı. Parola Mac anahtarlığında şifreli.','DB aç',()=>this._openTab('db')));
          rows.push(row(sshOk,'SSH','Parola yok. ~/.ssh anahtarı. Daha ▾ → SSH → + Sunucu.','SSH aç',()=>this._openTab('servers')));
        }
        return this._setupForce?rows:rows.filter(r=>r.miss);
      })(),
      hasDesk:!welcome, hasResume:!!resumeP, resumeTitle:resumeP?(resumeP.name||''):'',
      resumeMeta:[sess&&(sess.lastFileName||sess.lastFile), resumeP&&resumeP.branch].filter(Boolean).join(' · '),
      resumeSession:()=>this.resumeSession(),
      deskDirtyCount:dirtyAll.length, deskStaleCount:staleAll.length, deskTodoCount:openTodos,
      hasDeskDirty:deskDirty.length>0, hasDeskStale:deskStale.length>0,
      hasDeskBrief:!welcome && deskBriefLines.length>0, noDeskBrief:!welcome && !deskBriefLines.length,
      deskBriefTitle, deskBriefLines,
      hasDeskNext:!!deskNextCta, deskNextLabel:(deskNextCta&&deskNextCta.label)||'', deskNextClick:()=>{ if(deskNextCta&&deskNextCta.onClick) return deskNextCta.onClick(); },
      first60Open:!!(space&&st.tab==='genel'&&first60),
      first60Steps: first60Steps.map(s=>({n:s.n,t:s.t,d:s.d})),
      first60Chips:[],
      first60Cta:()=>this.setState({addUni:true}),
      scopeContextLabel:(this._scopePlanetOn()&&this._ctxPlanet())?('Proje · '+((this._ctxPlanet()&&this._ctxPlanet().name)||'Seçili proje')):'Tüm projeler',
      ...(()=>{ const now=new Date(); const h=now.getHours();
        const days=['Pazar','Pazartesi','Salı','Çarşamba','Perşembe','Cuma','Cumartesi'];
        const months=['Ocak','Şubat','Mart','Nisan','Mayıs','Haziran','Temmuz','Ağustos','Eylül','Ekim','Kasım','Aralık'];
        const greet=h<5?'İyi geceler':(h<12?'Günaydın':(h<18?'İyi günler':'İyi akşamlar'));
        let who=''; try{ who=(this._captainWho().name||'').split(' ')[0]; }catch(e){}
        const sub=welcome?'Bir klasör bağla, evrenin birkaç saniyede kurulsun.'
          :(dirtyAll.length?'Önce yarım kalan değişiklikleri toparla, sonra akışa gir.'
          :(resumeP?'Evrenin hazır — kaldığın yerden devam et.':'Sakin bir gün. Evreni keşfet ya da yeni bir gezegen ekle.'));
        const stats=welcome?[]:[
          {n:String(allP.length), label:'Proje', tone:'acc', title:'Projeler', onClick:()=>this._openTab('evren')},
          {n:String(dirtyAll.length), label:'Commit bekliyor', tone:dirtyAll.length?'warn':'ok', title:'Kirli gezegenler', onClick:()=>{ const p=dirtyAll[0]; if(p){ this._gotoProject(p.id); this._setLeftTab('git'); } else this.toast('Tüm gezegenler temiz'); }},
          {n:String(openTodos), label:'Açık görev', tone:'vio', title:'Pano', onClick:()=>this._openTab('pano')},
          {n:String(staleAll.length), label:'Sessiz proje', tone:staleAll.length?'dim':'ok', title:'14+ gündür dokunulmayan', onClick:()=>{ if(staleAll[0]) this._gotoProject(staleAll[0].id); else this.toast('İhmal edilen proje yok'); }},
        ];
        return { ozetDate:days[now.getDay()]+' · '+now.getDate()+' '+months[now.getMonth()],
          ozetHello:greet+(who?(', '+who):''), ozetSub:sub, ozetStats:stats, hasOzetStats:stats.length>0 }; })(),
      errBannerOpen:!!st._errBanner, errBannerMsg:(st._errBanner&&st._errBanner.msg)||'', errBannerCta:(st._errBanner&&st._errBanner.cta)||'Ayarlar',
      errBannerGo:()=>this._errBannerGo(), errBannerDismiss:()=>this._clearErrBanner(),
      hasTraffic:!!((st._traffic||[]).length && space && st.tab==='genel'),
      trafficRows:(st._traffic||[]).map(r=>{ const up=!!(r.composeUp|| (r.listening&&r.listening.length)); return { name:r.name, meta:[r.compose?(r.composeUp?'compose up':'compose down'):'', (r.listening&&r.listening.length)?(':'+r.listening.join(',')):''].filter(Boolean).join(' · ')||'sessiz', onClick:()=>this._gotoProject(r.id), style:'width:100%;background:none;border:none;cursor:pointer', dot:`width:8px;height:8px;border-radius:50%;background:${up?'var(--gx-ok)':'var(--gx-warn)'};flex-shrink:0` }; }),
      mailShowCompose: st.mailPane==='compose', mailFloatCompose: st.mailPane==='compose' && st.tab!=='posta', closeMailCompose:()=>this.closeMailCompose(),
      grepOpen: !!st._grepUniOpen, closeUniverseGrep:()=>this.closeUniverseGrep(), grepStatus: st.grepStatus||'', grepUniQuery: st.grepUniQuery||'', grepUniBusy:!!st._grepUniBusy, onGrepUniInput:(e)=>this.onGrepUniInput(e), onGrepUniKey:(e)=>this.onGrepUniKey(e), grepHits:(st._grepUni||[]).map(h=>({ planet:h.planet, file:h.file, line:h.line, text:h.text, onClick:()=>{ this.closeUniverseGrep(); this._gotoProject(h.projectId); } })),
      deskDirty, deskStale, openPano:()=>this._openTab('pano'),
      openDb:()=>this._openTab('db'), openDocker:()=>this._openTab('docker'),
      tourOpen: showTourNow, tourDismiss:()=>this._tourDismiss(),
      tourSteps:[
        {n:'1', t:'git init', d:'Gezegene in, solda Git yoksa init.'},
        {n:'2', t:'İlk gezegen', d:'Evren’de çift tık veya İn.'},
        {n:'3', t:'.env → DB', d:'Üst şeritte Bağla — parola anahtarlıkta.'},
        {n:'4', t:'Kaptan de', d:'Wake açıkken «Kaptan, docker’ı aç».'},
      ],
      addUniOpen: st.addUni, uniEditOpen:!!st.editUniId, uniAddMode:!st.editUniId,
      addUniTitle: st.editUniId?'EVREN DÜZENLE':'EVREN EKLE',
      addUniSub: st.editUniId?'adı ve yolu güncelle':'herhangi bir klasörü evren yap',
      uniName: st.uniName||'', onUniName:(e)=>this.setState({uniName:(e&&e.target&&e.target.value)||''}),
      uniEditRoot: st.uniEditRoot||'', saveUniEdit:()=>this.saveUniEdit(),
      onUniEditKey:(e)=>{ if(e.key==='Enter'){ e.preventDefault&&e.preventDefault(); this.saveUniEdit(); } },
      // Sunucu varsa modal aç (yerel/uzak seçimi); yoksa doğrudan yerel klasör seç.
      openAddUni: ()=>{ if((st._servers&&st._servers.length)){ this.setState({addUni:true, editUniId:null, uniName:'', uniEditRoot:'', uniSource:'ssh', _uniSrvSel:null, uniRemotePath:''}); } else this.pickLocalUni('add'); },
      closeAddUni:()=>this._closeUniModal(),
      pickLocalUni:()=>this.pickLocalUni(st.editUniId?'edit':'add'),
      uniLocal: st.uniSource==='local', uniSsh: st.uniSource==='ssh',
      srcLocalStyle: srcTab(st.uniSource==='local'), srcSshStyle: srcTab(st.uniSource==='ssh'),
      setLocal:()=>this.setState({uniSource:'local'}), setSsh:()=>this.setState({uniSource:'ssh'}),
      // uzak klasör → evren (modalın SSH dalı)
      uniServers:((st._servers)||[]).map(s=>({ id:s.id, name:s.name, host:s.host||s.alias||'', sel:st._uniSrvSel===s.id, onSelect:()=>this.setState({_uniSrvSel:s.id}),
        rowStyle:`display:flex;align-items:center;gap:10px;border:1px solid ${st._uniSrvSel===s.id?'#61dcff':'rgba(190,205,255,.12)'};background:${st._uniSrvSel===s.id?'rgba(97,220,255,.06)':'rgba(13,18,36,.6)'};padding:11px 14px;cursor:pointer`,
        dotStyle:`width:9px;height:9px;border-radius:50%;background:#61dcff;flex-shrink:0` })),
      hasUniServers:!!(st._servers&&st._servers.length), uniSrvSelected:!!st._uniSrvSel,
      uniRemotePath:st.uniRemotePath||'', onUniRemotePath:(e)=>this.setState({uniRemotePath:(e&&e.target&&e.target.value)||''}),
      onUniRemoteKey:(e)=>{ if(e.key==='Enter'){ e.preventDefault&&e.preventDefault(); this.addRemoteRoot(); } },
      addRemoteRoot:()=>this.addRemoteRoot(),
      viewServers: space&&st.tab==='servers',
      viewPixel: space&&st.tab==='pixel',
      isPixelTerm: false,
      isPtyTerm: st.consoleTab==='pty',
      notPixelTerm: st.consoleTab!=='pty',
      ...this._pxRenderVals(),
      loopNodes: this._loopNodes(),
      loopStepTitle: this._loopTitles()[this._loopFocusId()]||'Döngü',
      loopStepDesc: this._loopDesc(this._loopFocusId()||''),
      loopBody: st.loopBody||'',
      loopBodyShow: (()=>{
        const id=this._loopFocusId(); const body=String(st.loopBody||'').trim();
        if(!id||!body) return false;
        return body!==this._loopDesc(id);
      })(),
      loopRemarks: st.loopRemarks||'', onLoopRemarks:(e)=>this.setState({loopRemarks:(e&&e.target&&e.target.value)||''}),
      loopSaveRemarks:()=>this._loopSaveRemarks(),
      loopRunAll:()=>this._loopRunAll(),
      loopCtaLabel: (this._loopTour||st.loopTour||st._agentBusy)?'Durdur':'Turu başlat',
      loopAgentName: (this._loopAgent()&&this._loopAgent().name)||'—',
      loopSaveLabel: (this._loopTour||st.loopTour)&&st.loopStep==='incele'?'Kaydet ve bildir':'Kaydet',
      loopLastRun: (()=>{ const r=st.loopLastRun; if(!r||!r.ts) return 'henüz koşmadı'; try{ return new Date(r.ts).toLocaleString('tr-TR',{hour:'2-digit',minute:'2-digit',day:'2-digit',month:'short'}); }catch(e){ return 'koştu'; } })(),
      loopInspect: true, loopIsIncele: this._loopFocusId()==='incele',
      loopShowRunStep: !st._agentBusy && !this._loopTour && !st.loopTour && !!this._loopFocusId() && this._loopFocusId()!=='incele',
      loopRunStep:()=>{ const id=this._loopFocusId(); if(id) this._loopExec(id); },
      loopShowMail: this._loopFocusId()==='bildir',
      loopOpenMail:()=>this._loopOpenMail(),
      loopAgents: (this.AGENTS||[]).map(a=>{ const on=(!st.loopAgentId&&a===this.AGENTS[0])||st.loopAgentId===a.id;
        return { name:a.name, role:a.role, selected:!!on, onClick:()=>this.setState({loopAgentId:a.id}),
          style:`flex:0 0 168px;text-align:left;padding:10px 12px;cursor:pointer;border-radius:10px;border:1px solid ${on?a.color:'var(--gx-line)'};background:var(--gx-panel);border-top:2px solid ${a.color};color:var(--gx-ink);box-shadow:none` }; }),
      mailStatus: st.mailStatus||'', mailRefresh:()=>this._mailLoad(), openMailSettings:()=>this._openPrefs('posta'),
      // Posta eyebrow'u artık gerçek MCP durumunu yansıtıyor (önceden hep sabit "uyarı" sarısıydı).
      // Boş = henüz kontrol edilmedi (nötr); "yok/değil/✕" = sorunlu (sarı); aksi = bağlı (yeşil).
      mailEyebrowDotStyle:(()=>{ const s=st.mailStatus||''; const bad=/yok|değil|^✕/.test(s); const unknown=!s;
        const c=unknown?'var(--gx-faint)':(bad?'var(--gx-warn)':'var(--gx-ok)'); return `width:7px;height:7px;border-radius:50%;background:${c};box-shadow:0 0 8px ${c};flex-shrink:0`; })(),
      mailEyebrowLabel:(()=>{ const s=st.mailStatus||''; const bad=/yok|değil|^✕/.test(s); return !s?'POSTA · KONTROL EDİLİYOR':(bad?'POSTA · MCP AYARLA':'POSTA · BAĞLI'); })(),
      mailPane: st.mailPane||'inbox',
      mailShowInbox: (st.mailPane||'inbox')!=='compose', mailShowCompose: st.mailPane==='compose',
      mailInboxTab:()=>this.setState({mailPane:'inbox'}), mailComposeTab:()=>this.setState({mailPane:'compose', mailTo:st.mailTo||this._mailTo||''}),
      mailInboxTabStyle: tabBtn((st.mailPane||'inbox')!=='compose'), mailComposeTabStyle: tabBtn(st.mailPane==='compose'),
      inboxItems: (st._inbox||[]).map(im=>{ const on=st.mailSel&&((st.mailSel.id&&st.mailSel.id===im.id)||st.mailSel===im);
        return { from:im.from||'', subject:im.subject||'(konu yok)', snippet:im.snippet||'', when:im.when||this._mailPrettyWhen(im.date)||'', onClick:()=>this._mailOpen(im),
          style: on?'background:color-mix(in srgb, var(--gx-accent) 12%, transparent)':'' }; }),
      noInbox:!(st._inbox&&st._inbox.length), mailHowto:!this._mcpOn && !this._mailListTool && !this._mailReadTool && !(st._inbox&&st._inbox.length),
      mailReadFrom:(st.mailSel&&st.mailSel.from)||'', mailReadSubject:(st.mailSel&&st.mailSel.subject)||'', mailReadBody:st.mailReadBody||'',
      hasMailBody:!!String(st.mailReadBody||'').trim(), mailReadEmpty:!String(st.mailReadBody||'').trim(), mailReadHint:st.mailReadHint||'İçerik yok',
      mailReadWhen:(st.mailSel&&(st.mailSel.when||this._mailPrettyWhen(st.mailSel.date)))||'', mailHasWhen:!!(st.mailSel&&(st.mailSel.when||st.mailSel.date)),
      mailCanReply:!!(st.mailSel&&((st.mailSel.fromEmail)||(st.mailSel.from&&st.mailSel.from!=='Bilinmeyen')||st.mailSel.id)), mailReply:()=>this._mailReply(),
      mailTo: st.mailTo||'', mailSub: st.mailSub||'', mailBody: st.mailBody||'',
      onMailTo:(e)=>this.setState({mailTo:(e&&e.target&&e.target.value)||''}),
      onMailSub:(e)=>this.setState({mailSub:(e&&e.target&&e.target.value)||''}),
      onMailBody:(e)=>this.setState({mailBody:(e&&e.target&&e.target.value)||''}),
      mailSend:()=>this._mailSend(), mailPickFiles:()=>this._mailPickFiles(),
      mailAtts:(st.mailAtts||[]).map((a,i)=>({name:a.name, icon:a.icon||'📄', onRemove:()=>this._mailRemoveAtt(i)})),
      // ---------- EĞİTİMLERİM ----------
      trainingLoading: this._trainings===null && !st._trainingErr,
      trainingErr: st._trainingErr||'', hasTrainingErr: !!st._trainingErr,
      trainingRoot: this._trainingRoot||'',
      trainingEmpty: !!(this._trainings && !this._trainings.length),
      hasTrainingCats: !!(this._trainings && this._trainings.length),
      trainingCats:(this._trainings||[]).map(c=>{ const on=c.key===st._trainingCat; return {
        key:c.key, name:c.name, blurb:c.blurb||'', count:c.count, active:on,
        onClick:()=>this.setState({_trainingCat:c.key, trainingQuery:''}),
        style:`display:flex;align-items:flex-start;justify-content:space-between;gap:8px;width:100%;text-align:left;padding:10px 12px;cursor:pointer;border:none;border-radius:10px;background:${on?'color-mix(in srgb, var(--gx-accent) 12%, transparent)':'transparent'};color:${on?'var(--gx-accent)':'var(--gx-ink)'};font-family:'Space Grotesk',sans-serif;font-size:13px` }; }),
      trainingQuery: st.trainingQuery||'', onTrainingQuery:(e)=>this.setState({trainingQuery:(e&&e.target&&e.target.value)||''}),
      trainingItems:(()=>{ const cat=(this._trainings||[]).find(c=>c.key===st._trainingCat); if(!cat) return [];
        const q=this._asstFold(st.trainingQuery||'');
        const icon={docx:'📄',pptx:'▤',notebook:'◆',code:'⌁',archive:'🗀',markdown:'▣',note:'✎'};
        return cat.items.filter(it=>!q||this._asstFold(it.title+' '+(it.meta||'')+' '+(it.blurb||'')).indexOf(q)>=0).map(it=>{ const on=it.id===st.trainingSel; return { id:it.id, title:it.title, icon:icon[it.kind]||'•', sizeKb:it.sizeKb, active:on,
          meta:it.meta||'', hasMeta:!!it.meta, hasDelete:!it.locked,
          onClick:()=>this._trainingOpen(it.id), onDelete:()=>this._trainingDeleteItem(it.id,it.title),
          rowStyle:`display:flex;align-items:center;gap:2px;border-radius:8px;background:${on?'rgba(97,220,255,.1)':'transparent'};border-left:2px solid ${on?'var(--gx-accent)':'transparent'}`,
          style:`display:flex;align-items:flex-start;gap:10px;flex:1;min-width:0;text-align:left;padding:9px 6px 9px 10px;cursor:pointer;border:none;background:transparent;color:${on?'var(--gx-ink)':'var(--gx-dim)'};font-size:13px` }; }); })(),
      trainingReaderOpen: !!st.trainingSel, trainingReaderEmpty: !st.trainingSel, trainingReaderTitle:(st._trainingItem&&st._trainingItem.title)||'',
      trainingPracticeThis:()=>this._quizStartLesson(st.trainingSel),
      trainingReaderBusy: !!st._trainingBusy,
      trainingOpenOriginal:()=>this._trainingOpenOriginal(),
      trainingRefresh:()=>this._trainingRefresh(),
      trainingOpenAdd:()=>this._trainingOpenAdd(), trainingCloseAdd:()=>this._trainingCloseAdd(),
      trainingAddOpen: !!st.trainingAddOpen,
      trainingAddCats:(this._trainings||[]).map(c=>{ const on=c.key===st._trainingAddCat; return { key:c.key, name:c.name,
        onClick:()=>this._trainingSetAddCat(c.key),
        style:`padding:6px 12px;cursor:pointer;font-family:'Space Grotesk',sans-serif;font-size:12px;border:1px solid ${on?'var(--gx-accent)':'var(--gx-line)'};background:${on?'rgba(97,220,255,.12)':'transparent'};color:${on?'var(--gx-accent)':'var(--gx-dim)'};border-radius:8px` }; }),
      trainingAddNewCat: st.trainingAddNewCat||'', onTrainingAddNewCat:(e)=>this.onTrainingAddNewCat(e),
      trainingPickFiles:()=>this._trainingPickFiles(),
      trainingAddFiles:(st._trainingAddFiles||[]).map((f,i)=>({ name:f.name, onRemove:()=>this._trainingRemoveAddFile(i) })),
      hasTrainingAddFiles: !!(st._trainingAddFiles&&st._trainingAddFiles.length),
      trainingAddBusy: !!st._trainingAddBusy, hasTrainingAddErr: !!st._trainingAddErr, trainingAddErr: st._trainingAddErr||'',
      trainingAddBusyLabel: st._trainingAddBusy?'Ekleniyor…':'Ekle',
      trainingSubmitAdd:()=>this._trainingSubmitAdd(),
      trainingModeOku: (st.trainingMode||'oku')==='oku', trainingModeSinav: st.trainingMode==='sinav',
      trainingTabOku:()=>this._trainingSetMode('oku'), trainingTabSinav:()=>this._trainingSetMode('sinav'),
      trainingTabOkuStyle: tabBtn((st.trainingMode||'oku')==='oku'), trainingTabSinavStyle: tabBtn(st.trainingMode==='sinav'),
      // ---------- SINAV ----------
      quizBusy: !!st._quizBusy, hasQuizErr: !!st._quizErr, quizErr: st._quizErr||'',
      hasQuiz: !!(st._quiz && !st._quizBusy),
      quizCategory: (st._quiz&&st._quiz.category)||'', quizLessonTitle: (st._quiz&&st._quiz.title)||'',
      quizQuestion: (st._quiz&&st._quiz.question&&st._quiz.question.q)||'',
      quizPicked: st._quizPicked!=null,
      quizScoreText: st._quizRight+' doğru · '+st._quizWrong+' yanlış',
      quizExplain: (st._quiz&&st._quiz.question&&st._quiz.question.explain)||'',
      quizNext:()=>this._quizNext(),
      quizScopeActive: !!st._quizScope,
      quizProgress: st._quizScope ? `${Math.min(st._quizScope.idx+1, st._quizScope.questions.length)} / ${st._quizScope.questions.length}` : '',
      quizScopeDone: !!(st._quizScope && st._quizScope.idx>=st._quizScope.questions.length),
      quizExitScope:()=>this._quizExitScope(), quizRetryScope:()=>this._quizRetryScope(),
      quizOptions:(()=>{ const q=st._quiz&&st._quiz.question; if(!q) return [];
        return (q.options||[]).map((opt,i)=>{ const picked=st._quizPicked;
          const isPicked=picked===i, isCorrect=q.correct===i;
          let bg='rgba(13,18,36,.6)', border='var(--gx-line)', color='var(--gx-ink)';
          if(picked!=null){
            if(isCorrect){ bg='rgba(85,232,139,.12)'; border='var(--gx-ok)'; color='var(--gx-ok)'; }
            else if(isPicked){ bg='rgba(255,107,122,.1)'; border='var(--gx-err)'; color='var(--gx-err)'; }
          }
          return { idx:i, text:opt, onClick:()=>this._quizPick(i),
            style:`display:flex;align-items:center;gap:10px;width:100%;text-align:left;padding:12px 16px;cursor:${picked!=null?'default':'pointer'};border:1px solid ${border};background:${bg};color:${color};border-radius:10px;font-size:14px` }; }); })(),
      serverList:((st._servers)||[]).map(s=>({ name:s.name, host:[s.host||s.alias,s.user].filter(Boolean).join(' · '), roots:(s.roots&&s.roots.length)?(s.roots.length+' kök'):'',
        onScan:()=>this.srvScan(s.id), onEdit:()=>this.openSrvEdit(s), onDelete:()=>this.askConfirm('"'+(s.name||'sunucu')+'" sunucusunu kaldır?',()=>this.srvDelete(s.id)), onTerm:()=>this.openSrvTerm(s),
        dotStyle:`width:9px;height:9px;border-radius:50%;background:#61dcff;flex-shrink:0` })),
      // uzak terminal
      srvTermOpen:!!st._srvTerm, srvTermName:(st._srvTerm&&st._srvTerm.name)||'',
      srvTermLines:(this._sbout||[]).map(l=>({text:l.x,style:_outSt(l.t)})), hasSrvTermLines:!!(this._sbout&&this._sbout.length),
      srvTermInput:st.srvTermInput||'', onSrvTermInput:(e)=>this.onSrvTermInput(e), onSrvTermKey:(e)=>this.onSrvTermKey(e), sendSrvTerm:()=>this.sendSrvTerm(), closeSrvTerm:()=>this.closeSrvTerm(),
      hasServers:!!(st._servers&&st._servers.length), noServers:!!(st._servers&&!st._servers.length),
      srvAddOpen: st.srvAddOpen, openSrvAdd:()=>this.setState({srvAddOpen:true,_srvtest:'',srvForm:{name:'',host:'',user:'',port:'22',key:''}}), closeSrvAdd:()=>this.setState({srvAddOpen:false}),
      srvFormTitle: st.srvForm&&st.srvForm.id ? 'Sunucuyu düzenle' : 'Yeni sunucu',
      srvName:(st.srvForm&&st.srvForm.name)||'', srvHost:(st.srvForm&&st.srvForm.host)||'', srvUser:(st.srvForm&&st.srvForm.user)||'', srvPort:(st.srvForm&&st.srvForm.port)||'', srvKey:(st.srvForm&&st.srvForm.key)||'',
      srvSetName:(e)=>this.srvFormSet('name',e.target.value), srvSetHost:(e)=>this.srvFormSet('host',e.target.value), srvSetUser:(e)=>this.srvFormSet('user',e.target.value), srvSetPort:(e)=>this.srvFormSet('port',e.target.value), srvSetKey:(e)=>this.srvFormSet('key',e.target.value),
      // ~/.ssh anahtar seçici çipleri (Varsayılan/agent + mevcut anahtarlar)
      sshKeyChips:(()=>{ const cur=(st.srvForm&&st.srvForm.key)||''; const chip=(name,val,sel)=>({name,onClick:()=>this.srvFormSet('key',val),
        style:`padding:5px 11px;cursor:pointer;font-family:'JetBrains Mono',monospace;font-size:11px;border:1px solid ${sel?'#61dcff':'rgba(190,205,255,.16)'};color:${sel?'#61dcff':'#9aa3c2'};background:${sel?'rgba(97,220,255,.08)':'transparent'}`});
        const list=[chip('Agent / varsayılan','',!cur)];
        for(const k of (st._sshKeys||[])){ const b=cur===k.name||cur===k.path; list.push(chip(k.name,k.name,b)); }
        return list; })(),
      // uzak klasör (evren) listesi
      srvRoots:((st.srvForm&&st.srvForm.roots)||[]).map((r,i)=>({ name:r.name||r.path, path:r.path, onRemove:()=>this.removeSrvRoot(i) })),
      hasSrvRoots:!!(st.srvForm&&st.srvForm.roots&&st.srvForm.roots.length),
      srvRootInput:st.srvRootInput||'', onSrvRoot:(e)=>this.onSrvRoot(e), onSrvRootKey:(e)=>this.onSrvRootKey(e), addSrvRoot:()=>this.addSrvRoot(),
      srvBrowseKey:async()=>{ try{ if(window.galaxy&&window.galaxy.pickFiles){ const r=await window.galaxy.pickFiles(); const f=Array.isArray(r)?r[0]:(r&&r.path); if(f) this.srvFormSet('key', f.path||f); } }catch(e){} },
      srvTest:()=>this.srvTest(), srvSave:()=>this.srvSave(), srvTestMsg: st._srvtest||'',
      viewDocker: space&&st.tab==='docker', servers, containers, dockerImages,
      noContainers: realMode && dRunning && !containers.length,
      noContainersText: (scopeOn && pw.compose) ? 'Bu gezegenin compose’u durmuş — up ile kaldır.' : 'Konteyner yok — ne çalışan ne durmuş.',
      scopePlanet: scopeOn, scopeAll: !scopeOn,
      scopePlanetStyle:`padding:5px 10px;font-size:11px;border:1px solid var(--gx-line);border-radius:7px;cursor:pointer;background:${scopeOn?'color-mix(in srgb, var(--gx-accent) 12%, transparent)':'transparent'};color:${scopeOn?'var(--gx-accent)':'var(--gx-dim)'}`,
      scopeAllStyle:`padding:5px 10px;font-size:11px;border:1px solid var(--gx-line);border-radius:7px;cursor:pointer;background:${scopeOn?'transparent':'color-mix(in srgb, var(--gx-accent) 12%, transparent)'};color:${scopeOn?'var(--gx-dim)':'var(--gx-accent)'}`,
      setScopePlanet:()=>this.setScopePlanet(true), setScopeAll:()=>this.setScopePlanet(false),
      hasCompose:!!(pw.compose&&pw.compose.file), composeFile:(pw.compose&&pw.compose.file)||'',
      composeUp:()=>this._planetCompose('up'), composeDown:()=>this._planetCompose('down'), composeLogs:()=>this._planetCompose('logs'),
      bindPlanetDb:()=>this._bindPlanetDb(),
      canBindDb:!!(pw.env&&pw.env.dbHint&&!pw.boundDbId),
      dockerStatusText, dockerRunning:dRunning, dockerNotRunning:realMode&&ds&&ds.installed!==false&&!ds.running&&!ds.mas,
      isDockContainers: st.dockerTab!=='images', isDockImages: st.dockerTab==='images',
      dockContStyle:`padding:6px 12px;cursor:pointer;font-family:'JetBrains Mono',monospace;font-size:10px;letter-spacing:.1em;text-transform:uppercase;border:1px solid ${st.dockerTab!=='images'?'#61dcff':'rgba(190,205,255,.16)'};color:${st.dockerTab!=='images'?'#61dcff':'#9aa3c2'};background:${st.dockerTab!=='images'?'rgba(97,220,255,.08)':'transparent'}`,
      dockImgStyle:`padding:6px 12px;cursor:pointer;font-family:'JetBrains Mono',monospace;font-size:10px;letter-spacing:.1em;text-transform:uppercase;border:1px solid ${st.dockerTab==='images'?'#61dcff':'rgba(190,205,255,.16)'};color:${st.dockerTab==='images'?'#61dcff':'#9aa3c2'};background:${st.dockerTab==='images'?'rgba(97,220,255,.08)':'transparent'}`,
      setDockContainers:()=>this.setState({dockerTab:'containers'}), setDockImages:()=>this.setState({dockerTab:'images'}),
      dockerRefresh:()=>this._loadDocker(), dockerStartEngine:()=>this._dockerStartEngine(),
      dockerPruneImg:()=>this._dockerPrune('image'),
      dlogOpen:!!st._dlog, dlogName:(st._dlog&&st._dlog.name)||'', closeDlog:()=>this.closeDlog(),
      dlogIsContainer:!!(st._dlog&&st._dlog.kind!=='image'), dlogIsImage:!!(st._dlog&&st._dlog.kind==='image'),
      dlogKindLabel:(st._dlog&&st._dlog.kind==='image')?'İMAJ':'KONTEYNER',
      dlogAct:(st._dlog&&st._dlog.up)?'⏹ Durdur':'▸ Başlat',
      dlogToggle:()=>{ const d=this.state._dlog; if(d&&d.kind!=='image') this._dockerAct(d.id, d.up?'stop':'start'); },
      dlogRestart:()=>{ const d=this.state._dlog; if(d&&d.kind!=='image') this._dockerAct(d.id,'restart'); },
      dlogDotStyle:(()=>{ const d=st._dlog, up=d&&d.up, img=d&&d.kind==='image', c=img?'#61dcff':(up?'#55e88b':'#8a8fa8'); return `width:7px;height:7px;border-radius:50%;background:${c};margin-right:2px`; })(),
      dlogFields:(st._dlog&&st._dlog.fields)||[],
      dlogShowInspect:!!(st._dlog&&(st._dlog.kind==='image'||st._dlog.tab!=='logs')),
      dlogShowLogs:!!(st._dlog&&st._dlog.kind!=='image'&&st._dlog.tab==='logs'),
      dlogInspectJson:(st._dlog&&st._dlog.inspectJson)||'',
      dlogInspectTabStyle:`padding:6px 12px;cursor:pointer;font-family:'JetBrains Mono',monospace;font-size:10px;letter-spacing:.1em;text-transform:uppercase;border:1px solid ${(st._dlog&&st._dlog.tab!=='logs')?'#61dcff':'rgba(190,205,255,.16)'};color:${(st._dlog&&st._dlog.tab!=='logs')?'#61dcff':'#9aa3c2'};background:${(st._dlog&&st._dlog.tab!=='logs')?'rgba(97,220,255,.08)':'transparent'}`,
      dlogLogsTabStyle:`padding:6px 12px;cursor:pointer;font-family:'JetBrains Mono',monospace;font-size:10px;letter-spacing:.1em;text-transform:uppercase;border:1px solid ${(st._dlog&&st._dlog.tab==='logs')?'#61dcff':'rgba(190,205,255,.16)'};color:${(st._dlog&&st._dlog.tab==='logs')?'#61dcff':'#9aa3c2'};background:${(st._dlog&&st._dlog.tab==='logs')?'rgba(97,220,255,.08)':'transparent'}`,
      setDlogInspect:()=>this.setDlogTab('inspect'), setDlogLogs:()=>this.setDlogTab('logs'),
      dlogLines:(this._dlogLines||[]).map(l=>({t:l||' ', style:`white-space:pre-wrap;word-break:break-word;color:${/^\$ /.test(l)?'#61dcff':(/error|hata|exception|fatal/i.test(l)?'#ff6b7a':'#9aa3c2')}`})),
      dockExec:st.dockExec||'', onDockExec:(e)=>this.onDockExec(e), onDockExecKey:(e)=>this.onDockExecKey(e), dockerExecRun:()=>this.dockerExecRun(),
      // DB
      dbConns, dbHasConns, dbAddOpen:st.dbAddOpen, openDbAdd:()=>this.setState({dbAddOpen:true,_dbtest:''}), closeDbAdd:()=>this.setState({dbAddOpen:false}),
      dbTypePg:dbTypeBtn('postgres'), dbTypeMy:dbTypeBtn('mysql'), dbTypeMs:dbTypeBtn('mssql'), dbTypeLite:dbTypeBtn('sqlite'),
      setDbTypePg:()=>this.dbFormSetType('postgres','5432'), setDbTypeMy:()=>this.dbFormSetType('mysql','3306'), setDbTypeMs:()=>this.dbFormSetType('mssql','1433'), setDbTypeLite:()=>this.dbFormSetType('sqlite',''),
      dbIsSqlite:dbf.type==='sqlite', dbNotSqlite:dbf.type!=='sqlite', dbIsMssql:dbf.type==='mssql',
      dbSetName:(e)=>this.dbFormSet('name',e.target.value), dbSetHost:(e)=>this.dbFormSet('host',e.target.value), dbSetPort:(e)=>this.dbFormSet('port',e.target.value),
      dbSetDatabase:(e)=>this.dbFormSet('database',e.target.value), dbSetUser:(e)=>this.dbFormSet('user',e.target.value), dbSetPassword:(e)=>this.dbFormSet('password',e.target.value), dbSetFile:(e)=>this.dbFormSet('file',e.target.value),
      dbTestConn:()=>this.dbTestConn(), dbSaveConn:()=>this.dbSaveConn(), dbTestMsg:st._dbtest||'',
      dbSelOpen:!!st.dbSel&&!st.dbAddOpen, dbSelName, dbDbs:dbdbs, dbSchemaTables, dbSchemaErr, dbEmpty:realMode&&!dbHasConns&&!st.dbAddOpen,
      // Tablo veri editörü
      dbTableOpen:!!st._dbTable, dbTableName:st._dbTable||'', dbCloseTable:()=>this.dbCloseTable(), dbReloadTable:()=>this.dbReloadTable(),
      dbTableLoading:!!(st._dbTable&&!_td), dbTableErr:(_td&&_td.error)||'',
      dbTableColHdr, dbTableRows, dbTableRowCount:(_td&&_td.rows&&_td.rows.length)||0,
      dbTableHasRows:!!(_td&&_td.rows&&_td.rows.length), dbTableEmpty:!!(_td&&!_td.error&&_td.rows&&_td.rows.length===0),
      dbTableNoPk:!!(_td&&!_td.error&&!(dbHasPk)), dbRowMsg:st._dbRowMsg||'',
      // DB v2: insert + sayfalama + CSV + sıralama
      dbNewCells, dbNewOpen:!!st._dbNewOpen, dbInsertOpen:()=>this.dbInsertOpen(), dbInsertRow:()=>this.dbInsertRow(),
      dbInsertLabel:st._dbRowBusy==='new'?'…':'Ekle', dbExportCsv:()=>this.dbExportCsv(),
      dbPageInfo, dbPrevPage:()=>this.dbPrevPage(), dbNextPage:()=>this.dbNextPage(),
      dbCanPrev:(st._dbOffset||0)>0, dbCanNext:!!(_td&&_td.total!=null&&((st._dbOffset||0)+100)<_td.total),
      dbRowMsgStyle:`font-family:'JetBrains Mono',monospace;font-size:11px;color:${/✕|yok/.test(st._dbRowMsg||'')?'#ff6b7a':'#55e88b'}`,
      settingsOpen: st.settings,
      openSettings:()=>this._openPrefs(),
      openProfile:()=>this._openPrefs('profil'),
      closeSettings:()=>this.setState({settings:false}),
      isKayit: st.leftTab==='kayit', isAgac: st.leftTab==='agac', isGit: st.leftTab==='git', isDev: st.leftTab==='dev',
      gitFiles, commits, gitBranchName, gitDirtyCount, hasGitFiles, noGitFiles:!hasGitFiles,
      gitAB, gitStatusLine, gitHasChangesLeft:gitDirtyCount>0, gitCleanLeft:gitDirtyCount===0,
      gitPrimaryLabel, gitPrimaryTitle, gitPrimaryStyle, gitPrimaryFn, gitShowPullGhost,
      gitInit:()=>this.gitInit(),
      gitTopCommitMsg:gitTopCommit?gitTopCommit.msg:'', gitTopCommitMeta:gitTopCommit?(gitTopCommit.hash+' · '+gitTopCommit.when):'', hasTopCommit:!!gitTopCommit,
      isGitRepoSel, notGitRepoSel:!isGitRepoSel,
      gitStatusColor: gitDirtyCount>0?'#ffc861':'#55e88b',
      // Git istemci
      gitStagedList, gitUnstagedList, hasStaged:stagedArr.length>0, hasUnstaged:unstagedArr.length>0, gitWorkClean:!stagedArr.length&&!unstagedArr.length&&gitDirtyCount===0,
      gitStagedCount:stagedArr.length, gitCommitLabel:stagedArr.length?('Commit · '+stagedArr.length):'Önce dosya seç', gitCanCommit:stagedArr.length>0, gitCommitDisabled:stagedArr.length===0,
      gitMsg:st.gitMsg, onGitMsg:(e)=>this.onGitMsg(e), onGitMsgKey:(e)=>this.onGitMsgKey(e), gitCommit:()=>this.gitCommit(),
      gitStageAll:()=>this.gitStageAll(), gitPush:()=>this.gitPush(), gitPull:()=>this.gitPull(),
      gitBusy:!!st._gitBusy, gitActionMsg:st._gitActionMsg||'', hasGitActionMsg:!!st._gitActionMsg, gitActionMsgStyle:`font-family:'JetBrains Mono',monospace;font-size:11px;color:${/✕/.test(st._gitActionMsg||'')?'#ff6b7a':'#55e88b'}`,
      gitBranchList, branchAddOpen:!!st._branchAdd, openBranchAdd:()=>this.setState({_branchAdd:true,branchInput:''}),
      branchInput:st.branchInput, onBranchInput:(e)=>this.onBranchInput(e), onBranchKey:(e)=>this.onBranchKey(e), gitCreateBranch:()=>this.gitCreateBranch(),
      gitDiffOpen:!!_gitDiff, gitDiffFile:(_gitDiff&&_gitDiff.file)||'', gitDiffLoading:!!(_gitDiff&&_gitDiff.content==null),
      gitDiffLines:this._diffLines((_gitDiff&&_gitDiff.content)||''), closeGitDiff:()=>this.closeGitDiff(),
      hasCommits, noCommits:!hasCommits, authors, hasAuthors, noAuthors:!hasAuthors,
      gitClean:gitDirtyCount===0, gitHasChanges:gitDirtyCount>0,
      isGorevler: (st.kayitSub||'gorevler')!=='plan' && st.kayitSub!=='notlar' && st.kayitSub!=='odak', isPlan: st.kayitSub==='plan', isNotlar: st.kayitSub==='notlar', isBaglanti:false, isOdak: st.kayitSub==='odak',
      kayitTabs: [['gorevler','GÖREVLER'],['plan','README'],['notlar','NOTLAR']].map(([id,label])=>({label,onClick:()=>this.setState({kayitSub:id}),style:`background:none;border:none;cursor:pointer;padding:0 0 4px;font-family:'JetBrains Mono',monospace;font-size:10px;letter-spacing:.08em;text-transform:uppercase;border-bottom:1.5px solid ${(st.kayitSub||'gorevler')===id?t.acc:'transparent'};color:${(st.kayitSub||'gorevler')===id?t.acc:t.dim}`})),
      planetTodos:(()=>{ const pid=sel&&sel.id; const items=(st._todos||[]).filter(t=>t.projectId===pid); return items.map(t=>{ const done=(t.status||(t.done?'done':'todo'))==='done'; return { text:t.text, check:done?'☑':'☐', onToggle:()=>this._todoSetStatus(t.id, done?'todo':'done'), onDelete:()=>this._todoDelete(t.id), boxStyle:'border:none;background:none;cursor:pointer;color:var(--gx-accent);font-size:14px;padding:0', textColor:done?'color:var(--gx-dim);text-decoration:line-through':'' }; }); })(),
      planetTodosEmpty:!((st._todos||[]).some(t=>t.projectId===(sel&&sel.id))),
      planetTodoInput: st.planetTodoInput||'', onPlanetTodoInput:(e)=>this.onPlanetTodoInput(e), onPlanetTodoKey:(e)=>this.onPlanetTodoKey(e),
      toggleReadmeSync:()=>this._toggleReadmeSync(), readmeSyncCls: this._readmeSyncOn()?'gx-sw on':'gx-sw',
      selNotes: noteArr.map(t=>({t})),
      selLinks: linkArr.map(([name,desc,c])=>({name,desc,dotStyle:`width:8px;height:8px;border-radius:50%;background:${c};flex-shrink:0;box-shadow:0 0 8px ${c}`})),
      hasNotes: noteArr.length>0, hasLinks: linkArr.length>0,
      // Bağlantı ekleme (inline)
      linkAdd: st.linkAdd, linkInput: st.linkInput, openLinkAdd:()=>this.setState({linkAdd:true,linkInput:''}),
      onLinkInput:(e)=>this.onLinkInput(e), onLinkKey:(e)=>this.onLinkKey(e), addLink:()=>this.addLink(),
      // Gezegen özet kartındaki "Günlük" — gerçek son commit
      selLastActivity: commits.length?((commits[0].when||'')+': '+commits[0].msg):'kayıt yok',
      // HUD dock — gerçek veriye bağlı özet
      ...(()=>{ const allP=(this._allProjects||this.PROJECTS);
        const star=allP.slice().sort((a,b)=>(((b._git&&b._git.activity30)||0)-((a._git&&a._git.activity30)||0))||((b.prog||0)-(a.prog||0)))[0]||sel;
        const act=(star&&star._git&&star._git.activity30)||0;
        const recent=commits.slice(0,3).map(c=>({when:(c.when||'').slice(5,10)||(c.when||''),text:c.msg,
          whenStyle:"font-family:'JetBrains Mono',monospace;color:#9aa3c2;margin-right:6px"}));
        const notes=noteArr.slice(0,3);
        return { hudStarName:(star&&star.name)||'—', hudStarMeta:act?(act+' commit / 30g'):((star&&star.stage)||''),
          hudRecent:recent, hasHudRecent:recent.length>0,
          hudNotes:notes.map(t=>({t})), hasHudNotes:notes.length>0 }; })(),
      // ---- Zamanlanmış görev raporları (HUD'da listelenir, tıklanınca app-içi açılır) ----
      ...(()=>{ const reps=(st._reports||[]).map(fn=>{ const m=String(fn).match(/^(\d{4}-\d{2}-\d{2})-(.+)-\d+\.md$/);
          const date=m?m[1]:''; const title=m?m[2]:String(fn).replace(/\.md$/,'');
          return { name:fn, title, when:date, onClick:()=>this.openReport(fn),
            style:`display:flex;gap:10px;align-items:baseline;padding:5px 0;cursor:pointer`,
            whenStyle:`font-family:'JetBrains Mono',monospace;font-size:10px;color:#9aa3c2;flex-shrink:0`,
            titleStyle:`font-size:12px;color:#9aa3c2` }; });
        const rv=st._reportView;
        return { reportList:reps, hasReports:reps.length>0, noReports:reps.length===0,
          reportViewOpen:!!rv, reportViewName:(rv&&rv.name)||'', reportViewLoading:!!(rv&&rv.content==null),
          reportLines:this._mdLines((rv&&rv.content)||''), closeReport:()=>this.closeReport(), reportExternal:()=>this.reportExternal() }; })(),
      noteInput: st.noteInput, onNoteInput:(e)=>this.onNoteInput(e), onNoteKey:(e)=>this.onNoteKey(e), addNote:()=>this.addNote(),
      focusDisplay: `${String(Math.floor(st.focusSec/60)).padStart(2,'0')}:${String(st.focusSec%60).padStart(2,'0')}`,
      focusRunning: st.focusRunning, focusBtn: st.focusRunning?'⏸ DURAKLAT':'▸ BAŞLAT',
      toggleFocus:()=>this.toggleFocus(), resetFocus:()=>this.resetFocus(),
      gitCenterOpen: !!st.gitCenter,
      openGitCenter:()=>{this.setState({gitCenter:'durum', activityId:'git'});this._loadGit();}, openGitFlow:()=>this.setState({gitCenter:'rehber', activityId:'git'}), closeGitCenter:()=>this.setState({gitCenter:null, activityId:(st.activityId==='git'?'explorer':st.activityId)}),
      gcDurum: st.gitCenter==='durum', gcIssues: st.gitCenter==='issues', gcCi: st.gitCenter==='ci', gcTakim: st.gitCenter==='takim', gcGecmis: st.gitCenter==='gecmis', gcRehber: st.gitCenter==='rehber',
      gitCenterTabs: [['durum','DURUM'],['issues','ISSUES'],['ci','CI'],['takim','TAKIM AKIŞI'],['gecmis','GEÇMİŞ'],['rehber','GIT FLOW REHBERİ']].map(([id,label])=>({label,style:`padding:12px 16px;cursor:pointer;font-family:'Space Grotesk',sans-serif;font-size:13px;border:none;border-bottom:2px solid ${st.gitCenter===id?'var(--gx-accent)':'transparent'};background:transparent;color:${st.gitCenter===id?'var(--gx-accent)':'var(--gx-dim)'}`,onClick:()=>{ this.setState({gitCenter:id}); if(id==='issues') this._loadPlanetIssues(); if(id==='ci') this._loadPlanetCi(); }})),
      isSpace: space, isPlanet: st.mode==='planet',
      showPlanetCrumb: st.mode==='planet' || !!st.holdPlanet,
      planetRemote: !!(sel&&sel._remote) || !!(pw&&pw.remote),
      ctxChips:(()=>{
        if(!(st.mode==='planet'||st.holdPlanet)) return [];
        const g=st._git||{}; const chips=[];
        const mk=(id,label,onClick,tone)=>{
          const warn=tone==='warn', ok=tone==='ok', bad=tone==='bad';
          const col=bad?'var(--gx-err)':(warn?'var(--gx-warn)':(ok?'var(--gx-ok)':'var(--gx-dim)'));
          const border=bad?'color-mix(in srgb, var(--gx-err) 45%, transparent)':(warn?'color-mix(in srgb, var(--gx-warn) 45%, transparent)':(ok?'color-mix(in srgb, var(--gx-ok) 40%, transparent)':'var(--gx-line)'));
          return {id,label,onClick, style:`font-family:'JetBrains Mono',monospace;font-size:10px;padding:3px 9px;border:1px solid ${border};border-radius:999px;color:${col};background:color-mix(in srgb, ${col} 8%, transparent);cursor:${onClick?'pointer':'default'}`};
        };
        if(sel&&sel._remote) chips.push(mk('ro','salt okuma',null,'warn'));
        chips.push(mk('br','⎇ '+(g.branch||sel.branch||'—'), ()=>{this._setLeftTab('git');}));
        if(g.dirty>0) chips.push(mk('dirt', g.dirty+' değişiklik', ()=>{ this._setLeftTab('git'); this.setState({gitMsg:this._suggestCommitMsg()}); }, 'warn'));
        const composeUp=!!(pw.compose && (dContsAll||[]).some(c=>_cmpCo(c.compose, pw.compose.project) && /^up|running/i.test(c.state||c.status||'')));
        if(pw.boundDbName) chips.push(mk('db', 'DB · '+(pw.boundDbName), ()=>this._openTab('db'), 'ok'));
        else if(pw.env&&pw.env.dbHint) chips.push(mk('dbx','DB bağla', ()=>this._bindPlanetDb(), ''));
        if(pw.compose) chips.push(mk('co', composeUp?('● '+(pw.compose.project||'compose')):('○ '+(pw.compose.project||'compose')), ()=>this._openTab('docker'), composeUp?'ok':'warn'));
        (pw.listening||[]).slice(0,2).forEach(port=>chips.push(mk('p'+port, ':'+port, ()=>this._openPlanetPort(port), 'ok')));
        (pw.ports||[]).filter(p=>!(pw.listening||[]).includes(p)).slice(0,1).forEach(port=>chips.push(mk('x'+port, '○ :'+port, ()=>this._openPlanetPort(port), 'bad')));
        if(pw.env&&pw.env.missing&&pw.env.missing.length) chips.push(mk('env', '.env '+pw.env.missing.length+' eksik', ()=>{ this.toast('Eksik: '+pw.env.missing.slice(0,4).join(', ')); this._openTab('db'); }, 'warn'));
        return chips;
      })(),
      hasCtxChips: !!(st.mode==='planet'||st.holdPlanet) && !!st.rightCollapsed && !st._rightPeek,
      relatedPlanets:((pw.related)||[]).map(r=>({ name:r.name, why:r.why, onClick:()=>this._gotoProject(r.id) })),
      hasRelated:!!(pw.related&&pw.related.length),
      planetScripts:(pw.scripts||[]).map(s=>({ name:s.name, kind:s.kind||'', onClick:()=>this._runPlanetScript(s) })),
      hasPlanetScripts:!!(pw.scripts&&pw.scripts.length),
      planetPrs:(st._prs||[]).map(pr=>({ title:'#'+pr.number+' '+(pr.title||''), onClick:()=>{ try{ if(window.galaxy&&window.galaxy.openPrUrl) window.galaxy.openPrUrl(pr.url); }catch(e){} } })),
      planetIssues:(st._issues||[]).map(iss=>({ number:iss.number, title:iss.title||'', onClick:()=>{ try{ if(iss.url&&window.galaxy&&window.galaxy.openPrUrl) window.galaxy.openPrUrl(iss.url); }catch(e){} } })),
      noPlanetIssues:!(st._issues&&st._issues.length),
      planetCi:(st._ci||[]).map(r=>({ status:(r.conclusion||r.status||'').toLowerCase(), title:r.displayTitle||r.name||'run', onClick:()=>{ try{ if(r.url&&window.galaxy&&window.galaxy.openPrUrl) window.galaxy.openPrUrl(r.url); }catch(e){} } })),
      noPlanetCi:!(st._ci&&st._ci.length),
      hasPlanetPrs:!!(st._prs&&st._prs.length),
      gitPrCreate:()=>this._planetPrCreate(),
      moreOpen: !!st.moreOpen, moreTabs,
      toggleMore:()=>this.setState({moreOpen:!st.moreOpen, locOpen:false}),
      closeMore:()=>this.setState({moreOpen:false}),
      moreBtnStyle: tabBtn(moreActive), moreBtnCls: moreActive?'on':'',
      moreTools:()=>{ this.setState({moreOpen:false}); this.toggleTools(); },
      moreHud:()=>this.setState({hudOpen:!st.hudOpen, moreOpen:false}),
      moreToolsStyle: moreItem(!!st.toolsOpen),
      moreHudStyle: moreItem(!!st.hudOpen),
      moreKadetStyle: moreItem(kadet), moreKomutanStyle: moreItem(!kadet),
      // Konum breadcrumb + hızlı geçiş anahtarı
      locUniName: ((this._unis||[]).find(u=>u.id===st.uniId)||{}).name || 'Çalışma alanı seç',
      locOpen: st.locOpen, toggleLoc:()=>this.setState({locOpen:!st.locOpen, moreOpen:false}), closeLoc:()=>this.setState({locOpen:false}),
      locBtnBg: st.locOpen?'color-mix(in srgb, var(--gx-accent) 12%, transparent)':'transparent', locBtnBorder: st.locOpen?'var(--gx-accent)':'var(--gx-line)',
      locUnis: (this._unis||[]).map(u=>{
        const ps=(this._allProjects||[]).filter(p=>p.universe===u.id);
        const active=u.id===st.uniId;
        return { name:u.name, meta:ps.length+' gezegen',
          rowStyle:`display:flex;align-items:center;gap:10px;width:100%;text-align:left;padding:9px 12px;cursor:pointer;background:${active?'rgba(97,220,255,.1)':'transparent'};border:none;border-left:2px solid ${active?'#61dcff':'transparent'}`,
          dot:`display:inline-block;width:13px;flex-shrink:0;color:${active?'#61dcff':'#4d5677'}`, mark: active?'●':'○',
          onClick:()=>{ this.selectUni(u.id); this.setState({locOpen:false}); } };
      }),
      railUnis: (this._unis||[]).map(u=>{
        const ps=(this._allProjects||[]).filter(p=>p.universe===u.id);
        const active=u.id===st.uniId;
        return { name:u.name, meta:String(ps.length),
          rowStyle:`display:flex;align-items:center;gap:8px;width:100%;text-align:left;padding:8px 10px;margin-bottom:2px;cursor:pointer;border-radius:10px;background:${active?'color-mix(in srgb, var(--gx-accent) 11%, transparent)':'transparent'};border:1px solid ${active?'color-mix(in srgb, var(--gx-accent) 26%, transparent)':'transparent'}`,
          dot:`display:inline-block;width:13px;flex-shrink:0;color:${active?'var(--gx-accent)':'var(--gx-faint)'}`, mark: active?'●':'○',
          onClick:()=>{ this.selectUni(u.id); this.setState({activityId:'explorer', leftCollapsed:false}); } };
      }),
      hasRailUnis: !!(this._unis&&this._unis.length), noRailUnis: !(this._unis&&this._unis.length),
      locActiveName: ((this._unis||[]).find(u=>u.id===st.uniId)||{}).name || '',
      locPlanets: (this._allProjects||[]).filter(p=>p.universe===st.uniId).map(p=>{
        const cur=p.id===st.selId && (st.mode==='planet' || !!st.holdPlanet);
        return { name:p.name,
          dot:`display:inline-block;width:8px;height:8px;border-radius:50%;flex-shrink:0;background:${(({active:'#55e88b',paused:'#ffc861',waiting:'#9aa3c2'})[p.status])||'#61dcff'}`,
          rowStyle:`display:flex;align-items:center;gap:10px;width:100%;text-align:left;padding:8px 12px;cursor:pointer;background:${cur?'rgba(97,220,255,.1)':'transparent'};border:none;border-left:2px solid ${cur?'#61dcff':'transparent'}`,
          nameStyle:`font-size:12px;color:${cur?'#dbe4ff':'#9aa3c2'}`, cur, curMark: cur?'buradasın':'',
          onClick:()=>{ this._gotoProject(p.id); this.setState({locOpen:false}); } };
      }),
      hasLocPlanets: (this._allProjects||[]).some(p=>p.universe===st.uniId),
      viewGalaxy: space&&isEvren, orbInRail: !(space&&isEvren), viewPano: space&&st.tab==='pano', viewDb: space&&st.tab==='db', viewZaman: space&&st.tab==='zaman',
      viewDongu: space&&st.tab==='dongu', viewPosta: space&&st.tab==='posta', viewEgitim:false,
      viewGalaxyHud: !!(space&&isEvren), notPaperMap: true,
      showOrbitDecor: true,
      mapHudLabel: 'Aktif Geliştirme',
      viewMapTitle: true,
      orbitRings, orbitWires, orbitFolders, radarDots, radarFocus, sectorCount, sectorSelName,
      appVer:'2.3.13', splashOpen:!!st.splashOpen, dismissSplash:()=>this.dismissSplash(),
      gitFlowNodes:[
        {name:'Feature', meta:'tek iş dalı', hasNext:true, boxStyle:'min-width:110px;padding:12px 14px;border:1px solid color-mix(in srgb, var(--gx-violet) 50%, transparent);border-radius:12px;background:color-mix(in srgb, var(--gx-violet) 8%, transparent);box-shadow:0 0 14px color-mix(in srgb, var(--gx-violet) 18%, transparent)', nameStyle:'font-size:14px;font-weight:600;color:var(--gx-violet)'},
        {name:'Release', meta:'sürüm adayı', hasNext:true, boxStyle:'min-width:110px;padding:12px 14px;border:1px solid var(--gx-frame);border-radius:12px;background:color-mix(in srgb, var(--gx-accent) 8%, transparent);box-shadow:var(--gx-glow)', nameStyle:'font-size:14px;font-weight:600;color:var(--gx-accent)'},
        {name:'Hotfix', meta:'acil yama', hasNext:false, boxStyle:'min-width:110px;padding:12px 14px;border:1px solid color-mix(in srgb, var(--gx-warn) 50%, transparent);border-radius:12px;background:color-mix(in srgb, var(--gx-warn) 8%, transparent)', nameStyle:'font-size:14px;font-weight:600;color:var(--gx-warn)'},
      ],
      gitFlowSteps:['Dal','Değişiklik','Commit','Push','Birleştir','Dağıt'].map(label=>({label, style:"font-family:var(--gx-mono);font-size:10px;letter-spacing:.08em;text-transform:uppercase;padding:5px 8px;border:1px solid var(--gx-line);border-radius:8px;color:var(--gx-dim)"})),
      board, schedule,
      todoInput: st.todoInput, onTodoInput:(e)=>this.onTodoInput(e), onTodoKey:(e)=>this.onTodoKey(e), addTodo:()=>this.addTodo(),
      agentsW: (st.rightCollapsed && !st._rightPeek)?'0px':'220px',
      dockH: (st.hudOpen||this._barDragging==='hud')?((hudH||128)+'px'):'28px',
      railW: (st.leftCollapsed && !st._leftPeek)?'0px':'300px',
      termH: (st.consoleCollapsed && this._barDragging!=='term')?'32px':(conH+14)+'px',
      shellRows: '48px minmax(0,1fr) '+(st.consoleCollapsed && this._barDragging!=='term'?'32px':((conH+14)+'px'))+' '+(st.hudOpen||this._barDragging==='hud'?((hudH||128)+'px'):'28px'),
      termExpanded: !st.consoleCollapsed, termCollapsed: !!st.consoleCollapsed,
      termArrow: st.consoleCollapsed?'▴':'▾',
      termToggleTitle: st.consoleCollapsed?'Konsolu göster':'Konsolu gizle',
      termChevStyle: st.consoleCollapsed?'':'color:var(--gx-accent);border-color:var(--gx-accent)',
      termHeadStyle: st.consoleCollapsed
        ? "display:flex;align-items:center;gap:10px;margin:0;padding:0 12px;height:32px;flex-shrink:0"
        : "display:flex;align-items:center;gap:10px;margin:0 -14px 10px;padding:8px 14px;border-bottom:1px solid var(--gx-line);flex-shrink:0",
      termConsoleStyle: st.consoleCollapsed?"flex:1;min-height:0;padding:0":"flex:1;min-height:0",
      toggleConsole:()=>this._toggleConsole(),
      closeConsole:()=>{ this.setState({consoleCollapsed:true}); try{ localStorage.setItem('gxConsoleCollapsed','1'); }catch(e){} },
      actItems:(()=>{ const cur=st.tab==='pixel'?'pixel':(st.gitCenter?'git':(st.palette?'search':(!st.leftCollapsed?'explorer':'')));
        const mk=(id,ico,label,onClick,title)=>({ id, icoCls:'gx-act-ico gx-ico-'+ico, label, title:title||label, on:cur===id, cls:cur===id?'on':'', onClick });
        const pxCount=this._px?this._px.agents.filter(a=>!a.subOf).length:0;
        const pxBusy=this._px?this._px.agents.some(a=>!a.subOf&&!a.paused&&a.state!=='idle'):false;
        return [
          mk('explorer','folder','Klasör',()=>this._actExplorer()),
          mk('search','search','Ara',()=>this._openSearch()),
          mk('git','git','Git',()=>this._actGit()),
          mk('pixel','pixel', pxCount?('Agents · '+pxCount):'Agents', ()=>this._openTab('pixel'), 'Pixel Agents — ajan ofisi'+(pxBusy?' · çalışıyor':'')+(pxCount?' · '+pxCount+' ajan':'')),
        ]; })(),
      actFoot:(()=>{
        const mk=(id,ico,label,onClick)=>({ id, icoCls:'gx-act-ico gx-ico-'+ico, label, title:label, on:false, cls:'', onClick });
        return [
          mk('settings','gear','Ayarlar',()=>this._openPrefs()),
        ]; })(),
      toggleLeft:()=>this.setState({leftCollapsed:!st.leftCollapsed, _leftPeek:false}),
      toggleRight:()=>{ const on=!st.rightCollapsed; this.setState({rightCollapsed:on, _rightPeek:false}); try{ localStorage.setItem('gxRightCollapsed',on?'1':'0'); }catch(e){} },
      pinLeft:()=>this.setState({leftCollapsed:false, _leftPeek:false}),
      pinRight:()=>{ this.setState({rightCollapsed:false, _rightPeek:false}); try{ localStorage.setItem('gxRightCollapsed','0'); }catch(e){} },
      leftPeeking: !!(st.leftCollapsed && st._leftPeek),
      rightPeeking: !!(st.rightCollapsed && st._rightPeek),
      showPlanetIdent: !(st._preview && (st.mode==='planet'||st.holdPlanet)),
      hideCtxChips: !st.rightCollapsed || !!st._rightPeek,
      ctxLastLabel: this._surfaceLabel(st._lastSurface||st.tab),
      ctxLastHint: (st._lastSurface||st.tab)==='db'?'Son durak: veritabanı':(st._lastSurface||st.tab)==='docker'?'Son durak: Docker':(st._lastSurface==='git'||st.leftTab==='git')?'Son durak: Git':'Son durak: '+this._surfaceLabel(st._lastSurface||st.tab),
      ctxJumps:[
        {label:'Dosya', on: (st.mode==='planet'||st.holdPlanet)&&st.tab==='evren'&&st.leftTab!=='git', onClick:()=>{ if(!(st.mode==='planet'||st.holdPlanet)) this.enter(); this._setLeftTab('agac'); this._rememberSurface('dosya'); }},
        {label:'Git', on: st.leftTab==='git', onClick:()=>{ if(!(st.mode==='planet'||st.holdPlanet)) this.enter(); this._setLeftTab('git'); this._rememberSurface('git'); }},
        {label:'DB', on: st.tab==='db', onClick:()=>this._openTab('db')},
        {label:'Docker', on: st.tab==='docker', onClick:()=>this._openTab('docker')},
        {label:'Geliştir', on: st.leftTab==='dev', onClick:()=>{ if(!(st.mode==='planet'||st.holdPlanet)) this.enter(); this._setLeftTab('dev'); this._rememberSurface('dev'); }},
      ].map(x=>({...x, style:`padding:5px 8px;border:1px solid ${x.on?'var(--gx-accent)':'var(--gx-line)'};border-radius:7px;background:${x.on?'rgba(106,167,255,.12)':'transparent'};color:${x.on?'var(--gx-accent)':'var(--gx-dim)'};cursor:pointer;font-family:'JetBrains Mono',monospace;font-size:10.5px;width:100%;text-align:left`})),
      asstBtnStyle:(()=>{ const live=this._asstSessionLive(); const on=!!st.asstOpen;
        const col=this._asstLiveListen()?'var(--gx-ok)':(live?'var(--gx-accent)':'var(--gx-dim)');
        const bd=on||live?col:'var(--gx-line)';
        const bg=on?'color-mix(in srgb, var(--gx-accent) 12%, transparent)':(live?'color-mix(in srgb, var(--gx-ok) 10%, transparent)':'transparent');
        return "display:flex;align-items:center;gap:6px;font-family:'Space Grotesk',sans-serif;font-size:12px;color:"+col+";background:"+bg+";border:1px solid "+bd+";padding:6px 10px;cursor:pointer;border-radius:8px"; })(),
      leftIcon: st.leftCollapsed?'▶':'◀', rightIcon: st.rightCollapsed?'◀':'▶',
      hudOpen: st.hudOpen, hudArrow: st.hudOpen?'▾':'▴',
      toggleHud:()=>{ const on=!st.hudOpen; if(!on){ this.setState({hudOpen:false}); return; } const h=(st.hudH||128)>160?128:(st.hudH||128); this.setState({hudOpen:true, hudH:h}); }, closeHud:()=>this.setState({hudOpen:false}), onHudResize:(e)=>this.onHudResize(e),
      hudChevStyle: st.hudOpen?'color:var(--gx-accent);border-color:var(--gx-accent)':'',
      hudBtnBg: st.hudOpen?'rgba(97,220,255,.08)':'transparent', hudBtnBorder: st.hudOpen?'#61dcff':'rgba(190,205,255,.16)', hudBtnColor: st.hudOpen?'#61dcff':'#9aa3c2',
      tabs, railItems, planets, files, leftTabs, consoleTabs, agents,
      kadetBtnStyle:modeBtn(kadet), komutanBtnStyle:modeBtn(!kadet),
      setKadet:()=>this._setUiMode('kadet'), setKomutan:()=>this._setUiMode('komutan'),
      projCount:'· '+((this.PROJECTS&&this.PROJECTS.length)||0), noProjects:!(this.PROJECTS&&this.PROJECTS.length),
      isClaude: st.consoleTab==='claude', isBash: st.consoleTab==='bash', isAgentTab: st.consoleTab==='ajan',
      agentBusy: !!st._agentBusy,
      agentFeed: (st._agentFeed||[]).map((x,i)=>({
        text:x.text||'', preview:x.preview||'', hasPreview:!!x.preview,
        onText:x.kind==='chgfile'?(()=>this._openFilePreview(x.file)):(()=>{}),
        icon:x.kind==='user'?'›':x.kind==='tool'?'⚙':x.kind==='approval'?'⚠':x.kind==='error'?'✕':x.kind==='chgfile'?'✎':'✦',
        isApproval:x.kind==='approval'&&x.status==='wait',
        onOk:()=>this.agentApproveDo(x.approvalId, true), onNo:()=>this.agentApproveDo(x.approvalId, false),
        style:`padding:3px 0;line-height:1.65;white-space:pre-wrap;word-break:break-word;color:${x.kind==='user'?'#dbe7ff':x.kind==='error'?'var(--gx-err)':x.kind==='approval'?'var(--gx-warn)':x.kind==='tool'?'#8e99c0':x.kind==='sys'?'#6d78a0':'#c6d2ee'};${x.kind==='sys'?';font-size:10.5px':''}${x.kind==='tool'&&x.status==='err'?';color:var(--gx-err)':''}${x.kind==='chgfile'?';cursor:pointer;color:#9db8ff;padding-left:14px':''}${x.kind==='approval'?';border:1px solid rgba(229,180,93,.4);border-radius:8px;padding:7px 10px;margin:5px 0;background:rgba(229,180,93,.06)':''}`
      })),
      emptyAgent: !(st._agentFeed||[]).length,
      agentHasKey: !!((st._agentCfg||{}).hasKey), agentModelLabel: ((st._agentCfg||{}).model)||'',
      agentStop:()=>this.agentStopDo(), agentReset:()=>this.agentResetDo(),
      // Faz 4) Ajan ayar kartı
      agentKeyVal: st.agentKeyVal||'', onAgentKey:(e)=>this.setState({agentKeyVal:(e&&e.target&&e.target.value)||''}),
      agentModelVal: st.agentModelVal||'', onAgentModel:(e)=>this.setState({agentModelVal:(e&&e.target&&e.target.value)||''}),
      agentCfgSave:()=>this.agentCfgSave(), agentCfgLoad:()=>this.agentCfgLoad(),
      agentAutoOn: !!((st._agentCfg||{}).autoApprove), agentToggleAuto:()=>this.agentToggleAuto(),
      agentAutoLabel: ((st._agentCfg||{}).autoApprove)?'oto-onay: açık (araçlar sormadan çalışır)':'oto-onay: kapalı (yazma/komut sorar)',
      agentKeyStatus: ((st._agentCfg||{}).hasKey)?'✓ anahtar kayıtlı — CLI gerekmez':'anahtar yok — aşağıya ekle',
      agentEngineLabel: 'Motor: '+(((st._agentCfg||{}).engine)==='cli'?'CLI (abonelik)':((st._agentCfg||{}).engine)==='api'?'API (anahtar)':'Oto (CLI varsa abonelik)')+' · değiştir',
      agentEngineCycle:()=>{ const order=['auto','cli','api']; const cur=((this.state._agentCfg||{}).engine)||'auto'; const next=order[(order.indexOf(cur)+1)%3]; this.setState({_agentCfg:Object.assign({}, this.state._agentCfg||{}, {engine:next})}, async()=>{ try{ if(window.galaxy&&window.galaxy.agentConfigSave){ const r=await window.galaxy.agentConfigSave({engine:next}); if(r&&r.ok) this.setState({_agentCfg:r}); } }catch(e){} this.toast('Ajan motoru: '+(next==='cli'?'CLI (abonelik)':next==='api'?'API (anahtar)':'Oto')); }); },
      agentCliStatus: ((st._agentCfg||{}).cliAvailable)?'CLI bulundu (abonelik kullanılabilir)':'CLI yok (API gerekir)',
      // Faz 4) Debugger şeridi
      dbgActive: !!(st._dbg&&st._dbg.status!=='ended'), dbgEnded: !!(st._dbg&&st._dbg.status==='ended'),
      dbgPausedNow: !!(st._dbg&&st._dbg.status==='paused'),
      dbgStatusText: (()=>{ const d=st._dbg; if(!d) return ''; if(d.status==='paused') return '⏸ '+(d.file||'')+':'+(d.line||'')+' · '+(d.fn||''); if(d.status==='ended') return '■ debug bitti'; return '▶ çalışıyor · '+(d.file||''); })(),
      dbgVars: ((st._dbg||{}).vars||[]).map(v=>({ label:v.name, value:v.value })),
      hasDbgVars: !!(((st._dbg||{}).vars||[]).length),
      dbgStackText: ((st._dbg||{}).stack||[]).map(s2=>(s2.fn||'')+' :'+(s2.line||'')).join('  ←  '),
      dbgResume:()=>this.dbgResumeDo(), dbgStepOver:()=>this.dbgStepDo('over'), dbgStepInto:()=>this.dbgStepDo('into'), dbgStepOut:()=>this.dbgStepDo('out'), dbgStop:()=>this.dbgStopDo(),
      // Faz 4) Quick-fix katmanı
      qfixOpen: !!st.qfixOpen, closeQfix:()=>this.setState({qfixOpen:false}),
      qfixList: (st._qfixes||[]).map(fx=>({ label:fx.description, meta:(fx.files||[]).map(f2=>f2.file).join(', '), onClick:()=>this.qfixApply(fx) })),
      hasQfix: !!((st._qfixes||[]).length), noQfix: !((st._qfixes||[]).length), noDbgVars: !(((st._dbg||{}).vars||[]).length),
      // Faz 4) Çakışma çözücü
      conflictOpen: !!st._conflict, conflictFile: (st._conflict||{}).file||'',
      conflictOurs: (st._conflict||{}).ours||'', conflictTheirs: (st._conflict||{}).theirs||'',
      conflictHasOurs: (st._conflict||{}).ours!=null, conflictHasTheirs: (st._conflict||{}).theirs!=null,
      closeConflict:()=>this.setState({_conflict:null}),
      resolveOurs:()=>this.resolveConflict('ours'), resolveTheirs:()=>this.resolveConflict('theirs'), resolveBoth:()=>this.resolveConflict('both'),
      openConflictFile:()=>{ const c=st._conflict; if(c){ this.setState({_conflict:null}); this._openFilePreview(c.file); } },
      claudeLines, bashLines, bash2Lines, emptyClaude:claudeLines.length===0, emptyBash:bashLines.length===0, emptyBash2:bash2Lines.length===0,
      splitTerm: !!st.splitTerm, toggleSplitTerm:()=>this.setState({splitTerm:!st.splitTerm}),
      onSplitBashInput:(e)=>this.setState({splitBash:(e&&e.target&&e.target.value)||''}),
      splitBashVal: st.splitBash||'',
      onSplitBashKey:(e)=>{ if(e&&e.key==='Enter'){ e.preventDefault&&e.preventDefault(); this.splitBashSend(String(st.splitBash||'')); } },
      claudeMissing:st._claudeOk===false, claudeReady:st._claudeOk!==false,
      // Sağlık şeridi — Faz 2: tek bakışta Claude CLI / GitHub / SSH / STT durumu (üst bar, ⌘K'nın yanı).
      healthItems:(()=>{ const sttOn=!!(this._asst&&this._asst.native);
        const items=[
          {k:'claude', ic:'⌁', ok:st._claudeOk!==false, label:'Claude CLI', detail:st._claudeOk===false?'bulunamadı — Ayarlar’dan yolu düzelt':'hazır', go:()=>this._openPrefs('araclar')},
          {k:'github', ic:'⎇', ok:st._githubOk!==false, label:'GitHub', detail:st._githubOk===false?(st._githubMsg||'oturum yok — gh auth login'):'bağlı', go:()=>this._openPrefs('araclar')},
          {k:'ssh', ic:'🖧', ok:!!(st._sshKeys&&st._sshKeys.length), label:'SSH', detail:(st._sshKeys&&st._sshKeys.length)?st._sshKeys.length+' anahtar':'~/.ssh altında anahtar yok', go:()=>this._openTab('servers')},
          {k:'stt', ic:'◉', ok:sttOn, label:'Ses tanıma', detail:sttOn?'native STT hazır':'kapalı — mic ile de yazabilirsin', go:()=>{ if(!this._asst||!this._asst.open) this._asstOpen&&this._asstOpen(); }},
        ];
        const miss=items.filter(h=>!h.ok && h.k!=='stt');
        this._healthMissLabel=miss.length?(miss.length+' eksik'):'';
        this._healthHasMiss=miss.length>0;
        return items.map(h=>({ key:h.k, icon:h.ic, title:h.label+' · '+h.detail, onClick:h.go,
          dotStyle:`width:6px;height:6px;border-radius:50%;background:${h.ok?'var(--gx-ok)':'var(--gx-faint)'}`,
          style:`display:flex;align-items:center;gap:4px;font-size:12px;color:${h.ok?'var(--gx-dim)':'var(--gx-faint)'};opacity:${h.ok?'1':'.55'};cursor:pointer;background:transparent;border:none;padding:4px 2px` })); })(),
      healthMissLabel:this._healthMissLabel||'', healthHasMiss:!!this._healthHasMiss,
      consoleInput: st.consoleInput, onConsoleInput:(e)=>this.onConsoleInput(e), onConsoleKey:(e)=>this.onConsoleKey(e), sendConsole:()=>this.sendConsole(),
      consolePrompt: st.consoleTab==='bash'?this._bashPrompt(sel&&sel.id):'›', focusConsole:()=>this._focusConsole(),
      consolePlaceholder: st.consoleTab==='bash'?(this._bashPrompt(sel&&sel.id)+' komut yaz…'):st.consoleTab==='ajan'?'Yerleşik ajana görev yaz — dosya okur/yazar, komut koşar (onayınla)…':'Claude\'a yaz, Enter ile gönder…',
      consoleH:conH+'px', onConsoleResize:(e)=>this.onConsoleResize(e),
      showOrbit: !!st.orbitView, previewEmpty: !st.orbitView && !st._preview, previewInline: !st.orbitView && !!st._preview,
      setStageFile:()=>this.setOrbitView(false), setStageOrbit:()=>this.setOrbitView(true),
      stageFileStyle:`padding:5px 10px;cursor:pointer;font-family:'Space Grotesk',sans-serif;font-size:12px;border:none;border-radius:6px;background:${!st.orbitView?'color-mix(in srgb, var(--gx-accent) 16%, transparent)':'transparent'};color:${!st.orbitView?'var(--gx-accent)':'var(--gx-dim)'}`,
      stageOrbitStyle:`padding:5px 10px;cursor:pointer;font-family:'Space Grotesk',sans-serif;font-size:12px;border:none;border-radius:6px;background:${st.orbitView?'color-mix(in srgb, var(--gx-accent) 16%, transparent)':'transparent'};color:${st.orbitView?'var(--gx-accent)':'var(--gx-dim)'}`,
      readmeOpen: st.readmeOpen!==false, readmeClosed: st.readmeOpen===false, toggleReadme:()=>this.toggleReadme(),
      agentOpen: false, activeAgent: active, activeMsgs,
      agentInput: st.agentInput, onAgentInput:(e)=>this.onAgentInput(e), onAgentKey:(e)=>this.onAgentKey(e), sendAgent:()=>this.sendAgent(), agentBusy: st._agentBusy,
      agentAdd:()=>this.openAgentAdd(), agentDelete:()=>this.askConfirm('"'+((this.AGENTS.find(a=>a.id===st.agentId)||{}).name||'ajan')+'" ajanını sil?',()=>this._agentDelete(st.agentId)), agentEdit:()=>this.openAgentEdit(),
      activePresets, activeDesc, hasActivePresets,
      agentFormOpen: st.agentFormOpen, closeAgentForm:()=>this.setState({agentFormOpen:false}),
      agSetName:(e)=>this.agentFormSet('name',this._formVal(e)), agSetRole:(e)=>this.agentFormSet('role',this._formVal(e)),
      agSetPrompt:(e)=>this.agentFormSet('prompt',this._formVal(e)),
      agSetP1:(e)=>this.agentFormSet('p1',this._formVal(e)), agSetP2:(e)=>this.agentFormSet('p2',this._formVal(e)), agSetP3:(e)=>this.agentFormSet('p3',this._formVal(e)),
      saveAgentForm:()=>this.saveAgentForm(),
      agFormName:this._asText(st.agentForm&&st.agentForm.name), agFormRole:this._asText(st.agentForm&&st.agentForm.role),
      agFormPrompt:this._asText(st.agentForm&&st.agentForm.prompt),
      agFormP1:this._asText(st.agentForm&&st.agentForm.p1), agFormP2:this._asText(st.agentForm&&st.agentForm.p2), agFormP3:this._asText(st.agentForm&&st.agentForm.p3),
      agFormTitle: (st.agentForm&&st.agentForm.id)?('Düzenle · '+(st.agentForm.name||'ajan')):'Yeni ajan',
      backupsOpen: st.backupsOpen, closeBackups:()=>this.setState({backupsOpen:false}),
      backupList:((st._backups)||[]).map(b=>({name:b.name,date:b.date||'',size:b.size?Math.round(b.size/1024)+' KB':'',onRestore:()=>this._restoreBackup(b.name)})),
      // Aktivite şeridi — kalıcı eylem kanıtı (toast'lar 4sn'de kaybolur, bu kalıcı geçmiş).
      activityOpen: st.activityOpen, closeActivity:()=>this.setState({activityOpen:false}),
      activityList:(()=>{ const meta={ CREATE_COMMIT:{icon:'⎇',type:'COMMIT',color:'#55e88b'}, PUSH:{icon:'↑',type:'PUSH',color:'#61dcff'}, OPEN_PLANET:{icon:'●',type:'GEZEGEN',color:'#9aa3c2'}, HIDE_PLANET:{icon:'◌',type:'GİZLENDİ',color:'#ffc861'} };
        const ago=(ts)=>this._ago(ts)||'şimdi';
        return (this._activityLog||[]).map(a=>{ const m=meta[a.type]||{icon:'•',type:a.type,color:'#9aa3c2'};
          return { id:a.id, icon:m.icon, typeLabel:m.type, iconStyle:`color:${m.color};width:20px;text-align:center;flex-shrink:0`,
            label:a.label, ago:ago(a.ts), hasUndo:!!a.undo&&!a.undone, undone:!!a.undone,
            onUndo:()=>this._undoActivity(a.id) }; }); })(),
      noActivity: !(this._activityLog&&this._activityLog.length),
      hasBackups:!!(st._backups&&st._backups.length), noBackups:!!(st._backups&&!st._backups.length),
      contextChip: (st.mode==='planet'||st.holdPlanet)? sel.name : 'Tüm evren',
      paletteOpen: st.palette, paletteResults, warping: st.warping,
      hasSelected: space&&isEvren,
      readmeText:(st._readme&&st._readme.content)||'', readmeName:(st._readme&&st._readme.name)||'README.md', hasRealReadme:!!(st._readme&&st._readme.content), noRealReadme:!(st._readme&&st._readme.content),
      readmeLines: (()=>{ const q=String(st.docQuery||'').trim().toLowerCase(); let lines=this._mdLines((st._readme&&st._readme.content)||'');
        if(q) lines=lines.filter(ln=>ln.type!=='blank' && (ln.segs||[]).map(s=>s.t).join('').toLowerCase().includes(q));
        return lines; })(),
      docQuery: st.docQuery, onDocSearch:(e)=>this.setState({docQuery:(e&&e.target&&e.target.value)||''}),
      createReadme:()=>this.createReadme(), readmeBusy:!!st._readmeBusy, createReadmeLabel:st._readmeBusy?'oluşturuluyor…':'＋ README.md Oluştur',
      // README YOK + GİZLENENLER (gerçek veriye bağlı, tıklanınca açılır liste)
      ...(()=>{ const uniP=(this._allProjects||[]).filter(p=>p.universe===st.uniId);
        const noR=uniP.filter(p=>!p._readme); const hid=(this._scan&&this._scan.ignored)||[];
        const rowS=`font-family:'JetBrains Mono',monospace;font-size:11px;color:#9aa3c2;cursor:pointer;padding:3px 0 3px 14px`;
        return {
          noReadmeLabel:'⚠ README YOK ('+noR.length+')', hasNoReadme:noR.length>0, noReadmeOpen:!!st._showNoReadme,
          toggleNoReadme:()=>this.setState({_showNoReadme:!st._showNoReadme}),
          noReadmeList:noR.map(p=>({name:'· '+p.name,onClick:()=>this._gotoProject(p.id),style:rowS})),
          hiddenLabel:'GİZLENENLER ('+hid.length+')', hasHidden:hid.length>0, hiddenOpen:!!st._showHidden,
          toggleHidden:()=>this.setState({_showHidden:!st._showHidden}),
          hiddenList:hid.map(h=>({name:'· '+(h.name||h.id),onClick:()=>this._unhide(h.id),style:rowS})),
        }; })(),
      docNoMatch: !!(String(st.docQuery||'').trim() && (st._readme&&st._readme.content) && !this._mdLines(st._readme.content).some(ln=>ln.type!=='blank'&&(ln.segs||[]).map(s=>s.t).join('').toLowerCase().includes(String(st.docQuery).trim().toLowerCase()))),
      selName: sel.name, selDesc: sel.desc, selStage: sel.stage, selBranch: sel.branch, selProg: sel.prog,
      selProgLabel:'%'+sel.prog, selPlanLabel: planLabel, selPlan, planSections, planEmpty:!sel.plan.length,
      planInput:st.planInput||'', onPlanInput:(e)=>this.onPlanInput(e), onPlanKey:(e)=>this.onPlanKey(e), pullPlanFromReadme:()=>this.pullPlanFromReadme(),
      selStatusColor: sc.c, selStatusLabel: sc.l,
      selDotStyle:`width:10px;height:10px;border-radius:50%;background:${sc.c};box-shadow:0 0 8px ${sc.c}`,
      selBarStyle:`width:${sel.prog}%;height:100%;background:linear-gradient(90deg,${sc.c},#8ae7ff);box-shadow:0 0 10px ${sc.c};transition:width .6s`,
      treeList: (()=>{
        const flatAll=this._flatTree(this._treeNodes||[], '', 0);
        const dirtySet=new Set((gitFilesDef||[]).map(([n])=>n));
        const tf=String(st.treeFilter||'').trim().toLowerCase();
        const rows=tf ? flatAll.filter(t=>!t.dir&&t.path.toLowerCase().includes(tf)).slice(0,80).map(t=>({name:t.path,dir:false,depth:0,path:t.path,open:false}))
                       : flatAll.slice(0,320);
        const iconOf=t=>{ if(t.dir) return ['▸','var(--gx-accent)'];
          const l=t.name.toLowerCase();
          if(/\.md$/.test(l)||/readme/.test(l)) return ['▤','#ffc861'];
          if(/\.(js|jsx|ts|tsx|py|swift|kt|java|go|rs|rb|php|c|cpp|h|cs|vue|svelte|css|scss|html?|sh|sql)$/.test(l)) return ['‹›','#4fe0ff'];
          if(/\.(png|jpe?g|svg|gif|webp|ico)$/.test(l)) return ['▣','#ff8ec8'];
          if(/\.(json|ya?ml|toml|env|lock|cfg|ini)$/.test(l)) return ['⚙','#55e88b'];
          return ['·','#9aa3c2']; };
        return rows.map(t=>{ const on=!!(st._preview&&st._preview.rel===t.path); const isDirty=dirtySet.has(t.path); const [ico,icol]=iconOf(t);
          return {label:t.name, arrow: t.dir?(t.open?'▾':'▸'):'', icon:ico, isDirty,
            dirtyStyle:`width:7px;height:7px;border-radius:50%;background:var(--gx-warn);box-shadow:0 0 6px var(--gx-warn);flex-shrink:0;margin-left:auto`,
            iconStyle:`width:20px;flex-shrink:0;text-align:center;color:${icol};font-family:'JetBrains Mono',monospace;font-size:11px`,
            onToggle:(e)=>{ if(e&&e.stopPropagation)e.stopPropagation(); if(t.dir) this._toggleTree(t.path,t.depth); else this._openFsNode(t.path,false); },
            onClick:()=>{ if(t.dir) this._toggleTree(t.path,t.depth); else this._openFsNode(t.path,false); },
            arrowStyle:`width:14px;flex-shrink:0;text-align:center;cursor:pointer;color:${t.dir?'var(--gx-dim)':'transparent'};font-family:'JetBrains Mono',monospace;font-size:10px`,
            style:`display:flex;align-items:center;gap:2px;min-height:27px;padding:4px 6px 4px ${t.depth*13+4}px;margin:1px 4px;cursor:pointer;color:${on?'#eef5ff':isDirty?'var(--gx-warn)':(t.dir?'#cfe6ff':'var(--gx-dim)')};background:${on?'linear-gradient(90deg,rgba(106,167,255,.20),rgba(106,167,255,.05))':'transparent'};border:1px solid ${on?'rgba(106,167,255,.35)':'transparent'};border-radius:7px;white-space:nowrap;font-family:'JetBrains Mono',monospace;font-size:12px`}; });
      })(),
      hasTree: (this._treeNodes&&this._treeNodes.length)>0, noTree: !(this._treeNodes&&this._treeNodes.length),
      treeFilter: st.treeFilter||'', onTreeFilterInput:(e)=>this.onTreeFilterInput(e), onTreeFilterKey:(e)=>this.onTreeFilterKey(e),
      treeFileCount: this._flatTree(this._treeNodes||[], '', 0).filter(n=>!n.dir).length,
      quickFiles: this._flatTree(this._treeNodes||[], '', 0).filter(n=>!n.dir).slice(0,6).map(n=>({ name:n.path, rel:n.path, onClick:()=>this._openFilePreview(n.path) })),
      hasQuickFiles: this._flatTree(this._treeNodes||[], '', 0).some(n=>!n.dir),
      enter:()=>this.enter(), back:()=>this.back(),
      openProjectFolder:()=>this.openProjectFolder(), openInEditor:()=>this.openInEditor('auto'), removeProject:()=>this.removeProject(),
      schAddOpen:st.schAddOpen, openSchAdd:()=>this.setState({schAddOpen:true,_schResult:''}), closeSchAdd:()=>this.setState({schAddOpen:false}),
      schEmpty:realMode&&!(st._sched&&st._sched.length),
      schSetName:(e)=>this.schFormSet('name',e.target.value), schSetPrompt:(e)=>this.schFormSet('prompt',e.target.value),
      schSetHour:(e)=>this.schFormSet('hour',e.target.value), schSetMinute:(e)=>this.schFormSet('minute',e.target.value),
      schSetDaily:()=>this.schFormSet('type','daily'), schSetWeekly:()=>this.schFormSet('type','weekly'),
      schIsDaily:st.schForm.type==='daily', schIsWeekly:st.schForm.type==='weekly',
      schTypeDailyStyle:`padding:6px 12px;cursor:pointer;font-family:'JetBrains Mono',monospace;font-size:11px;border:1px solid ${st.schForm.type==='daily'?'#61dcff':'rgba(190,205,255,.16)'};color:${st.schForm.type==='daily'?'#61dcff':'#9aa3c2'};background:${st.schForm.type==='daily'?'rgba(97,220,255,.08)':'transparent'}`,
      schTypeWeeklyStyle:`padding:6px 12px;cursor:pointer;font-family:'JetBrains Mono',monospace;font-size:11px;border:1px solid ${st.schForm.type==='weekly'?'#61dcff':'rgba(190,205,255,.16)'};color:${st.schForm.type==='weekly'?'#61dcff':'#9aa3c2'};background:${st.schForm.type==='weekly'?'rgba(97,220,255,.08)':'transparent'}`,
      schDays:[['1','Pzt'],['2','Sal'],['3','Çar'],['4','Per'],['5','Cum'],['6','Cmt'],['7','Paz']].map(([v,l])=>({label:l,onClick:()=>this.schFormSet('weekday',v),style:`padding:4px 10px;cursor:pointer;font-family:'JetBrains Mono',monospace;font-size:11px;border:1px solid ${st.schForm.weekday===v?'#61dcff':'rgba(190,205,255,.16)'};color:${st.schForm.weekday===v?'#61dcff':'#9aa3c2'};background:${st.schForm.weekday===v?'rgba(97,220,255,.08)':'transparent'}`})),
      schAgents:this.AGENTS.map(a=>({name:a.name,onClick:()=>this.schFormSet('agentId',a.id),style:`padding:4px 10px;cursor:pointer;font-family:'JetBrains Mono',monospace;font-size:11px;border:1px solid ${st.schForm.agentId===a.id?a.color:'rgba(190,205,255,.16)'};color:${st.schForm.agentId===a.id?a.color:'#9aa3c2'};background:transparent`})),
      saveSchedule:()=>this.saveSchedule(), schResult:st._schResult||'', hasSchResult:!!st._schResult,
      dbSql:st.dbSql, onDbSql:(e)=>this.onDbSql(e), onDbSqlKey:(e)=>this.onDbSqlKey(e), runDbQuery:()=>this.runDbQuery(),
      dbAsk:st.dbAsk, onDbAsk:(e)=>this.onDbAsk(e), onDbAskKey:(e)=>this.onDbAskKey(e), runDbAgent:()=>this.runDbAgent(),
      dbAgentBusy:!!st.dbAgentBusy, dbAgentBtn:st.dbAgentBusy?'…':'⚡ Sor',
      dbGenSql:this._sqlLooks(st._dbresult&&st._dbresult.sql)?st._dbresult.sql:'', hasGenSql:this._sqlLooks(st._dbresult&&st._dbresult.sql),
      dbResultFields:((st._dbresult&&st._dbresult.fields)||[]).map(f=>({name:(f&&f.name)||String(f)})),
      dbResultRows:((st._dbresult&&st._dbresult.rows)||[]).slice(0,50).map(r=>({cells:Object.values(r).map(v=>({v:v==null?'':String(v)}))})),
      dbResultErr:(st._dbresult&&st._dbresult.error)||'', hasDbResult:!!(st._dbresult&&(st._dbresult.rows||st._dbresult.error)),
      dbLog:((st._dblog)||[]).map(l=>({sql:l.sql,info:l.info,ok:l.ok,when:(l.ts||'').slice(5,16).replace('T',' '),
        req:l.agent?('🤖 '+(l.request||'')):'', isAgent:!!l.agent,
        style:`padding:8px 12px;border-bottom:1px solid rgba(190,205,255,.06);border-left:2px solid ${l.ok?'#55e88b':'#ff6b7a'}`,
        reqStyle:`font-size:11px;color:#c9a6ff;font-family:'JetBrains Mono',monospace;margin-bottom:3px`,
        infoStyle:`font-size:10px;color:${l.ok?'#55e88b':'#ff6b7a'};font-family:'JetBrains Mono',monospace`})),
      hasDbLog:!!(st._dblog&&st._dblog.length), clearDbLog:()=>this.clearDbLog(),
      // ---- yazma onayı ----
      dbConfirmOpen:!!st._dbConfirm, dbConfirmSql:(st._dbConfirm&&st._dbConfirm.sql)||'', dbConfirmDanger:!!(st._dbConfirm&&st._dbConfirm.danger),
      dbConfirmTitle:(st._dbConfirm&&st._dbConfirm.danger)?'⚠ Yıkıcı işlem — emin misin?':'Bu işlem veriyi değiştirecek — onayla',
      confirmDbWrite:()=>this.confirmDbWrite(), cancelDbWrite:()=>this.cancelDbWrite(),
      // ---- dosya önizleme popup ----
      previewOpen:!!st._preview && st.mode!=='planet', closePreview:()=>this.closePreview(), openPreviewExternal:()=>this.openPreviewExternal(),
      previewName:(st._preview&&st._preview.name)||'', previewRel:(st._preview&&st._preview.rel)||'',
      previewMeta:(st._preview&&st._preview.size!=null)?('  ·  '+(st._preview.size<1024?st._preview.size+' B':(st._preview.size/1024<1024?(st._preview.size/1024).toFixed(1)+' KB':(st._preview.size/1048576).toFixed(1)+' MB'))):'',
      pvText:!!(st._preview&&st._preview.kind==='text'&&!st._editMode&&!this._isCodePreview(st._preview)),
      pvMd:!!(st._preview&&st._preview.kind==='markdown'&&!st._editMode),
      pvHtml:!!(st._preview&&st._preview.kind==='html'&&!st._editMode),
      pvCode:!!(st._preview&&!st._editMode&&this._isCodePreview(st._preview)),
      previewMdLines: (st._preview&&st._preview.kind==='markdown')?this._mdLines(st._preview.content||'','doc'):[],
      pvImage:!!(st._preview&&st._preview.kind==='image'),
      pvPdf:!!(st._preview&&st._preview.kind==='pdf'),
      pvMedia:!!(st._preview&&(st._preview.kind==='audio'||st._preview.kind==='video')),
      pvVideo:!!(st._preview&&st._preview.kind==='video'),
      pvAudio:!!(st._preview&&st._preview.kind==='audio'),
      pvBinary:!!(st._preview&&st._preview.kind==='binary'),
      pvLoading:!!(st._preview&&st._preview.kind==='loading'),
      pvError:!!(st._preview&&st._preview.kind==='error'),
      previewText:(st._preview&&st._preview.content)||'', previewUrl:(st._preview&&st._preview.url)||'about:blank',
      pvImageStyle:`height:100%;display:flex;align-items:center;justify-content:center;padding:20px;box-sizing:border-box;${(st._preview&&st._preview.kind==='image'&&st._preview.url)?'background-image:url('+st._preview.url+')':''};background-size:contain;background-repeat:no-repeat;background-position:center`,
      // dosya düzenleme
      pvEditable:!!(st._preview&&(st._preview.kind==='text'||st._preview.kind==='markdown'||st._preview.kind==='html')), editMode:!!st._editMode,
      showStartEdit:!!(st._preview&&(st._preview.kind==='text'||st._preview.kind==='markdown'||st._preview.kind==='html')&&!st._editMode),
      editCode:!!(st._editMode&&this._isCodePreview(st._preview)),
      editPlain:!!(st._editMode&&!this._isCodePreview(st._preview)&&(st._preview&&(st._preview.kind==='text'||st._preview.kind==='markdown'||st._preview.kind==='html'))),
      codeLineNos: this._codeLineNos(st._editContent||(st._preview&&st._preview.content)||''),
      codeViewLines: this._isCodePreview(st._preview)?this._codeViewLines((st._preview&&st._preview.content)||''):[],
      startEdit:()=>this.startEdit(), saveEdit:()=>this.saveEdit(), cancelEdit:()=>this.cancelEdit(),
      editContent:st._editContent, onEditContent:(e)=>this.onEditContent(e), editBusy:!!st._editBusy,
      editSaveLabel:st._editBusy?'…':'Kaydet', editMsg:st._editMsg||'',
      previewDelete:()=>{ const p=st._preview; if(p&&p.rel) this.fileDelete(p.rel); },
      // ---- Çalışma alanı: açık dosya sekmeleri, breadcrumb, okuyucu kontrolleri ----
      fileTabs: (st.fileTabs||[]).map(t=>{ const act=!!(st._preview&&st._preview.rel===t.rel); const dirty=act&&this._editDirty();
        return { name:t.name, rel:t.rel, dirty, hasDirty:dirty,
          tabStyle:`display:inline-flex;align-items:center;gap:7px;max-width:190px;padding:6px 8px 6px 11px;cursor:pointer;border-radius:8px 8px 0 0;border:1px solid ${act?'rgba(106,167,255,.4)':'transparent'};border-bottom:none;background:${act?'linear-gradient(180deg,rgba(38,52,84,.85),rgba(20,27,44,.9))':'transparent'};color:${act?'var(--gx-ink)':'var(--gx-dim)'};font-family:'JetBrains Mono',monospace;font-size:11.5px;white-space:nowrap`,
          dirtyStyle:`width:7px;height:7px;border-radius:50%;background:var(--gx-warn);box-shadow:0 0 6px var(--gx-warn);flex-shrink:0`,
          onClick:()=>this.openPreview(t.rel), onClose:(e)=>{ if(e&&e.stopPropagation)e.stopPropagation(); this.closeFileTab(t.rel); },
          onMoveLeft:(e)=>{ if(e&&e.stopPropagation)e.stopPropagation(); this.moveFileTab(t.rel,-1); },
          onMoveRight:(e)=>{ if(e&&e.stopPropagation)e.stopPropagation(); this.moveFileTab(t.rel,1); },
          onSplit:(e)=>{ if(e&&e.stopPropagation)e.stopPropagation(); this.openSplitWith(t.rel); },
          onDragStart:(e)=>{ try{ this._dragTab=t.rel; if(e&&e.dataTransfer) e.dataTransfer.effectAllowed='move'; }catch(err){} },
          onDragOver:(e)=>{ try{ if(e&&e.preventDefault) e.preventDefault(); }catch(err){} },
          onDrop:(e)=>{ try{ if(e&&e.preventDefault) e.preventDefault(); const from=this._dragTab; if(!from||from===t.rel) return; const tabs=(this.state.fileTabs||[]).slice(); const fi=tabs.findIndex(x=>x.rel===from); const ti=tabs.findIndex(x=>x.rel===t.rel); if(fi<0||ti<0) return; const mv=tabs.splice(fi,1)[0]; tabs.splice(ti,0,mv); this.setState({fileTabs:tabs}); this._wsSaveTabs(tabs); this._dragTab=null; }catch(err){} } }; }),
      hasFileTabs: !!(st.fileTabs&&st.fileTabs.length),
      pvCrumbs: (()=>{ const rel=(st._preview&&st._preview.rel)||''; if(!rel) return [];
        const parts=rel.split('/'); const out=[{label:sel.name, segStyle:`color:var(--gx-accent);font-weight:600`, onClick:()=>this.closePreview()}];
        parts.forEach((seg,i)=>{ const isLast=i===parts.length-1; const path=parts.slice(0,i+1).join('/');
          out.push({label:seg, segStyle:isLast?`color:var(--gx-ink);font-weight:600`:`color:var(--gx-dim)`, onClick:()=>{ if(!isLast) this._openFsNode(parts.slice(0,i).join('/'), true); }});
          void path; });
        return out; })(),
      hasPvCrumbs: !!(st._preview&&st._preview.rel),
      pvLineCount: st._preview&&st._preview.content!=null ? String(st._preview.content).split('\n').length : 0,
      pvKindLabel: (st._preview&&({markdown:'Markdown',html:'HTML',text:this._isCodePreview(st._preview)?'Kod':'Metin',image:'Görsel',pdf:'PDF',audio:'Ses',video:'Video',binary:'Binary',loading:'…',error:'Hata'}[st._preview.kind]))||'',
      editDirty: this._editDirty(),
      saveBtnStyle: this._editDirty()
        ? `background:linear-gradient(135deg,#4be3a2,#2fbf8f);border:1px solid transparent;color:#04140c;font-family:'JetBrains Mono',monospace;font-size:11px;font-weight:700;padding:5px 12px;cursor:pointer;border-radius:7px`
        : `background:none;border:1px solid var(--gx-line);color:var(--gx-faint);font-family:'JetBrains Mono',monospace;font-size:11px;padding:5px 12px;cursor:pointer;border-radius:7px`,
      savedLabel: st._editSavedAt?('Son kayıt '+st._editSavedAt):'',
      hasSaved: !!st._editSavedAt,
      pvFind: st.pvFind||'', onPvFindInput:(e)=>this.onPvFindInput(e), onPvFindKey:(e)=>this.pvFindKey(e), pvFindNext:()=>this.pvFindNext(),
      pvFindCount: (()=>{ const q=String(st.pvFind||'').toLowerCase(); if(!q||!st._preview||st._preview.content==null) return '';
        const c=String(st._preview.content).toLowerCase().split(q).length-1; return c?(c+' eşleşme'):''; })(),
      hasPvFindCount: !!String(st.pvFind||'').trim() && !!(st._preview&&st._preview.content!=null),
      pvReplace: st.pvReplace||'', onPvReplaceInput:(e)=>this.onPvReplaceInput(e), pvReplaceAll:()=>this.pvReplaceAll(),
      pvWrap: !!st.pvWrap, togglePvWrap:()=>this.setState({pvWrap:!st.pvWrap}),
      pvWrapBtnStyle: `padding:4px 8px;border-radius:6px;cursor:pointer;font-family:'JetBrains Mono',monospace;font-size:10px;border:1px solid ${st.pvWrap?'var(--gx-accent)':'var(--gx-line)'};background:${st.pvWrap?'rgba(106,167,255,.14)':'transparent'};color:${st.pvWrap?'var(--gx-accent)':'var(--gx-dim)'}`,
      pvFont: st.pvFont||13, pvFontLabel:(st.pvFont||13)+'px',
      pvFontDec:()=>this.setState({pvFont:Math.max(11,(st.pvFont||13)-1)}), pvFontInc:()=>this.setState({pvFont:Math.min(17,(st.pvFont||13)+1)}),
      pvFontStyle: `font-size:${st.pvFont||13}px`,
      pvCodeEdStyle: `font-size:${st.pvFont||13}px;${st.pvWrap?'--pvwrap:1':''}`,
      pvTextStyle: `margin:0;padding:20px 26px;font-family:'JetBrains Mono',monospace;font-size:${st.pvFont||13}px;line-height:1.75;color:var(--gx-ink);white-space:${st.pvWrap?'pre-wrap':'pre'};word-break:${st.pvWrap?'break-word':'normal'};overflow:auto`,
      reloadPreview:()=>this.reloadPreview(),
      pvEditKey:(e)=>this.pvEditKey(e),
      // ---- DevTools: ⌘P paleti / sorunlar / tanılama / ajan onayı / hunk / otomatik kaydet ----
      filePalOpen: !!st.filePalOpen,
      filePalQuery: st.filePalQuery||'',
      onFilePalInput:(e)=>this.onFilePalInput(e), onFilePalKey:(e)=>this.onFilePalKey(e),
      filePalResults: st.filePalOpen ? this._filePalRows() : [],
      filePalEmpty: !!st.filePalOpen && (this._filePalList||[]).length===0,
      closeFilePal:()=>this.setState({filePalOpen:false,filePalQuery:''}),
      hasProblems: !!((st._problems||[]).length),
      problemsCount: String((st._problems||[]).length||''),
      problemsOpen: !!st.problemsOpen,
      toggleProblems:()=>this.setState({problemsOpen:!st.problemsOpen}),
      problemsList: (st._problems||[]).map(pr=>({
        label: pr.file+':'+pr.line, text: pr.text||'', sev: pr.severity==='error'?'✕':'⚠',
        sevStyle:`color:${pr.severity==='error'?'var(--gx-err)':'var(--gx-warn)'};flex-shrink:0`,
        rowStyle:`display:flex;gap:8px;align-items:baseline;width:100%;padding:5px 10px;cursor:pointer;background:none;border:none;border-bottom:1px solid rgba(190,205,255,.05);text-align:left`,
        onClick:()=>{ this._openFilePreview(pr.file); setTimeout(()=>{ try{ const el=document.querySelector('[data-pv-line="'+pr.line+'"]'); if(el){ el.scrollIntoView({block:'center'}); el.style.background='rgba(229,180,93,.22)'; setTimeout(()=>{ el.style.background=''; },1200); } }catch(e){} }, 280); if(pr.source==='lsp') setTimeout(()=>this.langQuickFixAt(pr), 420); }
      })),
      clearProblems:()=>this.setState({_problems:[]}),
      runDiag:()=>this.runDiag(), diagBusy:!!st.diagBusy, diagLabel: st.diagBusy?'tanılanıyor…':'▶ Tanıla',
      diagSummary: st._diag ? ('çalıştı: '+(((st._diag||{}).ran||[]).join(', ')||'araç bulunamadı')) : '',
      hasDiagSummary: !!st._diag,
      hasAgentReview: !!(st._agentReview&&st._agentReview.files&&st._agentReview.files.length),
      agentReviewFiles: ((st._agentReview&&st._agentReview.files)||[]).join(', '),
      agentReviewAccept:()=>this.agentReviewAccept(), agentReviewRevert:()=>this.agentReviewRevert(),
      gitHunks: this._gitHunks().map(h=>({
        label: h.label, onStage:()=>this.gitStageHunk(h),
        btnStyle:`margin-left:auto;flex-shrink:0;background:rgba(83,201,139,.1);border:1px solid rgba(83,201,139,.45);color:#53c98b;font-family:'JetBrains Mono',monospace;font-size:10px;padding:3px 9px;cursor:pointer;border-radius:6px`
      })),
      hasGitHunks: !!this._gitHunks().length,
      pvAutosave: !!st.pvAutosave,
      togglePvAutosave:()=>this.setState({pvAutosave:!st.pvAutosave}),
      pvAutosaveBtnStyle: `padding:4px 8px;border-radius:6px;cursor:pointer;font-family:'JetBrains Mono',monospace;font-size:10px;border:1px solid ${st.pvAutosave?'var(--gx-ok)':'var(--gx-line)'};background:${st.pvAutosave?'rgba(83,201,139,.12)':'transparent'};color:${st.pvAutosave?'var(--gx-ok)':'var(--gx-dim)'}`,
      pvTruncated: !!(st._preview&&st._preview.content!=null&&String(st._preview.content).split('\n').length>2000),
      pvTotalLines: st._preview&&st._preview.content!=null ? String(String(st._preview.content).split('\n').length) : '',
      // ---- FAZ 2 vals ----
      grQuery: st.grQuery||'', grReplace: st.grReplace||'', onGrQuery:(e)=>this.onGrQuery(e), onGrReplace:(e)=>this.onGrReplace(e),
      grRegex: !!st.grRegex, grCase: !!st.grCase, toggleGrRegex:()=>this.setState({grRegex:!st.grRegex}), toggleGrCase:()=>this.setState({grCase:!st.grCase}),
      grBusy: !!st.grBusy, grPreview:()=>this.grPreview(), grApply:()=>this.grApply(), grRollback:()=>this.grRollback(),
      grHasPreview: !!(st._grPreview&&st._grPreview.total), grTotal: String((st._grPreview||{}).total||0),
      grFiles: ((st._grPreview||{}).files||[]).map(f=>({ rel:f.rel, count:String(f.count), label:f.rel+' · '+f.count+' eşleşme', hits:(f.hits||[]).slice(0,6).map(h=>({ label:'L'+h.line, before:h.before, after:h.after, onClick:()=>{ this._openFilePreview(f.rel); setTimeout(()=>this._gotoLine(h.line),320); } })) })),
      grHasBackup: !!st._grBackup, grBackupDir: (st._grBackup||{}).backupDir||'',
      // Semboller
      symOpen: !!st.symOpen, symQuery: st.symQuery||'', onSymInput:(e)=>this.setState({symQuery:(e&&e.target&&e.target.value)||''}), closeSym:()=>this.setState({symOpen:false}),
      symList: this._curSymbols().filter(s=>!st.symQuery||s.name.toLowerCase().includes(String(st.symQuery).toLowerCase())).map(s=>({ label:s.name, meta:s.kind+' · L'+s.line, onClick:()=>{ this.setState({symOpen:false}); this._gotoLine(s.line); } })),
      hasSym: this._curSymbols().length>0,
      openSym:()=>this.setState({symOpen:true, symQuery:''}),
      // Testler
      testsBusy: !!st.testsBusy, testsDiscover:()=>this.testsDiscover(),
      testRunner: (st._tests||{}).runner||'', hasTests: !!((st._tests||{}).tests||[]).length,
      testsList: ((st._tests||{}).tests||[]).map(t=>({ label:t.name, meta:t.file+':'+t.line, running:st._testRunning===(t.file+':'+t.line), runLabel:st._testRunning===(t.file+':'+t.line)?'…':'▶', onRun:()=>this.testRunOne(t), onOpen:()=>{ this._openFilePreview(t.file); setTimeout(()=>this._gotoLine(t.line),320); } })),
      // Geçmiş + blame
      histBusy: !!st.histBusy, loadHistory:()=>this.loadHistory(), closeHistory:()=>this.closeHistory(),
      hasHistory: !!((st._history||{}).commits||[]).length,
      histList: ((st._history||{}).commits||[]).map(c=>({ label:c.short+' · '+c.subject, meta:c.date+' · '+c.author, onShow:()=>this.histShowVersion(c), onRestore:()=>this.histRestoreVersion(c) })),
      histShowOpen: !!st._histShow, histShowTitle: st._histShow?((st._histShow.rev||'')+' · '+(st._histShow.subject||'')):'', histShowText: (st._histShow||{}).content||'', closeHistShow:()=>this.setState({_histShow:null}),
      blameLine: (()=>{ const p=st._preview; if(!p||!st._blame) return ''; const first=st._blame[0]; return first?('blame: son '+ (st._blame.length) +' satır · ilk: '+first.author+' '+first.date+' '+first.summary.slice(0,50)):''; })(),
      hasBlame: !!st._blame,
      // İşler + bildirimler
      jobCmd: st.jobCmd||'', onJobCmd:(e)=>this.setState({jobCmd:(e&&e.target&&e.target.value)||''}),
      jobCmdKey:(e)=>{ if(e&&e.key==='Enter'){ e.preventDefault&&e.preventDefault(); const c=String(st.jobCmd||''); this.setState({jobCmd:''}); this.jobStartCmd(c); } },
      jobStartBtn:()=>{ const c=String(st.jobCmd||''); this.setState({jobCmd:''}); this.jobStartCmd(c); },
      jobsList: (st._jobs||[]).slice().reverse().map(j=>({ label:j.label, meta:(j.status||'')+(j.started?(' · '+new Date(j.started).toLocaleTimeString('tr-TR')):''), running:j.status==='running', onStop:()=>this.jobStop(j.id) })),
      hasJobs: !!(st._jobs||[]).length, jobsRefresh:()=>this.jobsRefresh(),
      notifOpen: !!st.notifOpen, toggleNotif:()=>this.setState({notifOpen:!st.notifOpen}),
      notifCount: String((st._notifs||[]).length||''),
      notifsList: (st._notifs||[]).slice().reverse().map(n=>({ label:n.title, meta:n.body, icon:n.kind==='err'?'✕':'✓' })),
      hasNotifs: !!(st._notifs||[]).length,
      // .galaxy profili + şablonlar
      gxHasProfile: !!((st._gxProfile||{}).exists), gxLoad:()=>this.gxLoad(), gxCreateDefault:()=>this.gxCreateDefault(), gxRunOnOpen:()=>this.gxRunOnOpen(),
      gxProfileText: (st._gxProfile&&st._gxProfile.profile)?JSON.stringify(st._gxProfile.profile, null, 2).slice(0,900):'',
      tplKind: st.tplKind||'node', setTplNode:()=>this.setState({tplKind:'node'}), setTplPython:()=>this.setState({tplKind:'python'}), setTplWeb:()=>this.setState({tplKind:'web'}), setTplSwift:()=>this.setState({tplKind:'swift'}), tplCreate:()=>this.tplCreate(), gxBusy: !!st.gxBusy,
      // AI bağlam
      aiExplain:()=>this.aiExplainSelection(), aiFix:()=>this.aiFixSelection(), aiTest:()=>this.aiTestSelection(), aiReviewDiff:()=>this.aiReviewDiff(),
      promptLib: this.promptLib().map(p=>({ label:p.label, onClick:()=>this._aiSendToClaude(p.text) })),
      // Faz 3) LSP durumu + referanslar + rename + hover + fmt
      langOk: !!((st._langStatus||{}).ok), langVersion: ((st._langStatus||{}).version)||'',
      langLabel: ((st._langStatus||{}).ok)?('TypeScript '+(((st._langStatus||{}).version)||'')+' · canlı tanı / F12 / ⇧F12 referans / F2 rename'):(((st._langStatus||{}).unavailable)?'TS yok — eski mod (proje node_modules\'una typescript ekle)':'dil sunucusu…'),
      refsOpen: !!st.refsOpen, closeRefs:()=>this.setState({refsOpen:false}),
      refsWord: st._refsWord||'', hasRefs: !!((st._refs||[]).length), noRefs: !((st._refs||[]).length),
      refsList: (st._refs||[]).map(r=>({ label:r.file+':'+r.line, text:r.text||'', def:r.isDef?'tanım':'', onClick:()=>{ this.setState({refsOpen:false}); const p=st._preview; if(p&&p.rel===r.file) this._gotoLine(r.line); else { this._openFilePreview(r.file); setTimeout(()=>this._gotoLine(r.line),340); } } })),
      renameOpen: !!st.renameOpen, renameVal: st.renameVal||'', renameWord: st._renameWord||'',
      onRenameInput:(e)=>this.setState({renameVal:(e&&e.target&&e.target.value)||''}),
      renameKey:(e)=>{ if(e&&e.key==='Enter'){ e.preventDefault&&e.preventDefault(); this.langRenameApply(); } else if(e&&e.key==='Escape') this.setState({renameOpen:false}); },
      renameApply:()=>this.langRenameApply(), closeRename:()=>this.setState({renameOpen:false}),
      hoverTip: st._hoverTip||null, hasHoverTip: !!(st._hoverTip&&st._hoverTip.text),
      hoverTipText: (st._hoverTip||{}).text||'', hoverTipStyle: st._hoverTip?('position:fixed;left:'+(st._hoverTip.x||0)+'px;top:'+(st._hoverTip.y||0)+'px;z-index:90;max-width:430px;pointer-events:none'):'',
      fmtOnSave: st.fmtOnSave!=null?!!st.fmtOnSave:this._fmtOn(), toggleFmtOnSave:()=>this.toggleFmtOnSave(),
      fmtBtnStyle: `padding:4px 8px;border:1px solid ${(st.fmtOnSave!=null?!!st.fmtOnSave:this._fmtOn())?'rgba(83,201,139,.55)':'var(--gx-line)'};border-radius:6px;background:${(st.fmtOnSave!=null?!!st.fmtOnSave:this._fmtOn())?'rgba(83,201,139,.12)':'transparent'};color:${(st.fmtOnSave!=null?!!st.fmtOnSave:this._fmtOn())?'var(--gx-ok)':'var(--gx-dim)'};cursor:pointer;font-family:'JetBrains Mono',monospace;font-size:10px`,
      // Faz 3) Çalıştırma profilleri
      runProfiles: this.runProfiles().map(p=>({ label:p.name, meta:p.src, cmd:p.cmd, onRun:()=>this.runProfile(p), onDebug:()=>this.runProfileDebug(p) })),
      hasRunProfiles: this.runProfiles().length>0, noRunProfiles: this.runProfiles().length===0,
      ghEmpty: !!((st._gh||{}).ok) && !(((st._gh||{}).prs||[]).length), noStashes: !(((st._stashes||{}).stashes||[]).length),
      debugCurrentFile:()=>this.debugCurrentFile(),
      // Faz 3) GitHub
      ghBusy: !!st.ghBusy, ghLoad:()=>this.ghLoad(), ghPrCreate:()=>this.ghPrCreate(),
      ghOk: !!((st._gh||{}).ok), ghErr: (st._gh&&!st._gh.ok)?(st._gh.error||''):((st._ghErr)||''),
      ghPrs: ((st._gh||{}).prs||[]).map(p=>({ label:'#'+p.number+' '+p.title, meta:(p.draft?'taslak · ':'')+(p.branch||'')+' · @'+(p.author||''), ci:p.ci, ciIcon:p.ci==='pass'?'✓':p.ci==='fail'?'✕':p.ci==='pending'?'…':'–', ciColor:p.ci==='pass'?'var(--gx-ok)':p.ci==='fail'?'var(--gx-err)':p.ci==='pending'?'var(--gx-warn)':'var(--gx-faint)', onClick:()=>{ try{ if(window.galaxy&&window.galaxy.openUpdate) window.galaxy.openUpdate(p.url); }catch(e){} } })),
      hasGhPrs: !!(((st._gh||{}).prs||[]).length),
      ghCiSummary: (()=>{ const prs=(st._gh||{}).prs||[]; if(!prs.length) return ''; const f=prs.filter(p=>p.ci==='fail').length, ok=prs.filter(p=>p.ci==='pass').length; return prs.length+' açık PR · '+ok+' CI ✓ · '+f+' CI ✕'; })(),
      // Faz 3) Git derinliği
      gitExtLoad:()=>this.gitExtLoad(),
      branchList: ((st._branches||{}).branches||[]).map(b=>({ label:b.name, mark:b.current?'● ':'', style:`padding:4px 9px;border-radius:99px;cursor:${b.current?'default':'pointer'};font-family:'JetBrains Mono',monospace;font-size:10px;border:1px solid ${b.current?'rgba(83,201,139,.55)':'var(--gx-line)'};background:${b.current?'rgba(83,201,139,.12)':'transparent'};color:${b.current?'var(--gx-ok)':'var(--gx-dim)'}`, onClick:()=>{ if(!b.current) this.branchSwitch(b.name, false); } })),
      hasBranches: !!(((st._branches||{}).branches||[]).length),
      newBranch: st.newBranch||'', onNewBranch:(e)=>this.setState({newBranch:(e&&e.target&&e.target.value)||''}),
      newBranchKey:(e)=>{ if(e&&e.key==='Enter'){ e.preventDefault&&e.preventDefault(); this.branchCreate(); } },
      branchCreate:()=>this.branchCreate(), stashPush:()=>this.stashPush(),
      stashList: ((st._stashes||{}).stashes||[]).map(s=>({ label:s.ref, msg:s.msg, date:s.date, onApply:()=>this.stashApply(s.ref,false), onPop:()=>this.stashApply(s.ref,true), onDrop:()=>this.stashDrop(s.ref) })),
      hasStashes: !!(((st._stashes||{}).stashes||[]).length),
      conflictList: ((st._conflicts||{}).conflicts||[]).map(f=>({ label:f, onClick:()=>this.openConflict(f) })),
      hasConflicts: !!(((st._conflicts||{}).conflicts||[]).length),
      // Dev server önizleme
      devPorts: ((st._pw||{}).listening||(st._pw||{}).ports||[]).map(port=>({ label:'localhost:'+port, onClick:()=>this.devSrvOpenUrl('http://localhost:'+port) })),
      hasDevPorts: !!(((st._pw||{}).listening||(st._pw||{}).ports||[]).length),
      devSrvOpen: !!st.devSrvOpen, devSrvUrl: st.devSrvUrl||'', closeDevSrv:()=>this.setState({devSrvOpen:false}),
      onDevSrvInput:(e)=>this.setState({devSrvPort:(e&&e.target&&e.target.value)||''}), devSrvPort: st.devSrvPort||'',
      devSrvGo:()=>this.devSrvOpenUrl(st.devSrvPort||st.devSrvUrl||'3000'),
      // Bölünmüş editör
      splitEditor: !!st.splitEditor, toggleSplitEditor:()=>this.setState({splitEditor:!st.splitEditor, _preview2:null}),
      split2Name: (st._preview2||{}).name||'', split2Text: (st._preview2||{}).content||'', hasSplit2: !!st._preview2,
      splitOpenWith:(rel)=>this.openSplitWith(rel),
      // Proje evi (dosya seçiliyken de kimlik her zaman üstte)
      projPath: sel._path||'', projPathShort: sel._path?String(sel._path).replace(/^\/Users\/[^/]+/,'~'):'',
      projInitial: String(sel.name||'?').slice(0,1).toUpperCase(),
      projBadgeStyle: `width:34px;height:34px;border-radius:10px;flex-shrink:0;display:flex;align-items:center;justify-content:center;font-family:'Space Grotesk',sans-serif;font-size:16px;font-weight:700;color:#06121f;background:linear-gradient(135deg,${sc.c},#a596e8);box-shadow:0 8px 18px -8px ${sc.c}`,
      homeDirtyFiles: gitFilesDef.slice(0,6).map(([name,badge,c])=>({ name, badge,
        badgeStyle:`font-size:9.5px;letter-spacing:.05em;padding:2px 6px;border:1px solid ${this.rgba(c,.4)};color:${c};text-transform:uppercase;border-radius:5px;flex-shrink:0`,
        onClick:()=>this._openFilePreview(name) })),
      hasHomeDirty: gitFilesDef.length>0,
      homeLastName: (()=>{ const s=this._sessRead(); return (s&&s.selId===sel.id&&s.lastFile)?s.lastFile:''; })(),
      openHomeLast: ()=>{ const s=this._sessRead(); if(s&&s.selId===sel.id&&s.lastFile) this._openFilePreview(s.lastFile); },
      hasHomeLast: (()=>{ const s=this._sessRead(); return !!(s&&s.selId===sel.id&&s.lastFile); })(),
      // projede ara + yeni dosya
      grepQuery:st.grepQuery, onGrepInput:(e)=>this.onGrepInput(e), onGrepKey:(e)=>this.onGrepKey(e), runGrep:()=>this.runGrep(), grepBusy:!!st._grepBusy,
      grepResults:((st._grep)||[]).map(m=>({file:m.file,line:m.line,text:m.text, label:m.file+':'+m.line,
        onClick:()=>this._openFilePreview(m.file), style:`padding:5px 8px;cursor:pointer;border-bottom:1px solid rgba(190,205,255,.05)`,
        locStyle:`font-family:'JetBrains Mono',monospace;font-size:10px;color:#61dcff`, textStyle:`font-family:'JetBrains Mono',monospace;font-size:11px;color:#9aa3c2;white-space:nowrap;overflow:hidden;text-overflow:ellipsis`})),
      hasGrep:!!(st._grep&&st._grep.length), grepEmpty:!!(st._grep&&st._grep.length===0),
      newFileOpen:!!st._newFileOpen, openNewFile:()=>this.setState({_newFileOpen:true,newFileInput:''}), newFileInput:st.newFileInput,
      onNewFileInput:(e)=>this.onNewFileInput(e), onNewFileKey:(e)=>this.onNewFileKey(e), fileCreate:()=>this.fileCreate(),
      // ---- gezegen klasör drill ----
      fsCwd:st._fsCwd||'', fsInSub:!!st._fsCwd, fsUp:()=>this._fsUp(),
      fsCrumb:st._fsCwd?('/ '+st._fsCwd):'',
      openPalette:()=>this._openSearch(true), closePalette:()=>this.setState({palette:false,query:'',paletteIdx:0, activityId:st.activityId==='search'?'explorer':st.activityId}), stop:(e)=>{e.stopPropagation&&e.stopPropagation();},
      toolsOpen: st.toolsOpen, toggleTools:()=>this.toggleTools(), closeTools:()=>this.closeTools(),
      toolsBtnBorder: st.toolsOpen?'#61dcff':'rgba(190,205,255,.16)',
      clockTop:this._clk().hm, toolsClock:this._clk().hms, toolsDate:this._clk().date,
      toolFind:st.toolFind||'', onToolFind:(e)=>this.onToolFind(e),
      toolFindRes:this._toolFindHits().map(p=>({name:p.name,group:p.group||'',dot:'display:inline-block;width:8px;height:8px;border-radius:50%;background:'+((({active:'#55e88b',paused:'#ffc861',waiting:'#9aa3c2'})[p.status])||'#61dcff'),onClick:()=>this.toolGo(p.id)})),
      hasToolFind:!!(String(st.toolFind||'').trim()),
      onSearch:(e)=>this.onSearch(e), onSearchKey:(e)=>this.onSearchKey(e),
      closeAgent:()=>this.setState({agentId:null}),
      asstOpen:!!st.asstOpen, asstToggle:()=>this._asstToggle(), asstClose:()=>this._asstClose(), asstNewChat:()=>this._asstNewChat(), asstSilence:()=>this._asstSilence(),
      asstStopListen:()=>this._asstSilence(),
      asstLiveChip: !st.asstOpen && this._asstSessionLive(),
      asstChipClass: this._asstLiveListen()?'listen':'',
      asstChipLabel: this._asstLiveListen()?'Dinliyor':((this._asst&&this._asst.state==='speaking')?'Konuşuyor':((this._asst&&this._asst.state==='working')?'Çalışıyor':'Asistan açık')),
      asstHasMsgs:!!(this._asst&&this._asst.msgs&&this._asst.msgs.length),
      asstEmpty:!(this._asst&&this._asst.msgs&&this._asst.msgs.length),
      showHelp:(()=>{ const h=this._helpCopy(); if(welcome||showSetupNow||showTourNow) return false; return !!(h && !this._helpDismissed()[this._helpKey()]); })(),
      helpPeek:(()=>{ const h=this._helpCopy(); return !!(h && this._helpDismissed()[this._helpKey()]); })(),
      helpTitle:(()=>{ const h=this._helpCopy(); return h?h[0]:''; })(),
      helpBody:(()=>{ const h=this._helpCopy(); return h?h[1]:''; })(),
      dismissHelp:()=>this._helpDismiss(),
      showHelpAgain:()=>this._helpShow(),
      loadError: st.loaded==='error', loadErrorBody:'Galaksi verisi okunamadı. Sahte gezegen göstermiyorum — yeniden dene.',
      retryLoad:()=>this._loadReal(), masBlocked:!!st._masBlocked, conBusy:!!st._conBusy, stopRun:()=>this.stopRun(),
      asstInput:st.asstInput||'', onAsstInput:(e)=>this.onAsstInput(e), onAsstKey:(e)=>this.onAsstKey(e), sendAsst:()=>this.sendAsst(),
      asstQuickCmds:this._quickCmdList(),
      hasAsstQuick:true,
      gitSuggestMsg:()=>{ const m=this._suggestCommitMsg(); this.setState({gitMsg:m}); },
      gitSuggestLabel:'Öner: '+(this._suggestCommitMsg()||'update'),
      asstMicToggle:()=>this._asstMicToggle(), asstWakeToggle:()=>this._asstWakeToggle(),
      asstChatMode:()=>this._asstChatMode(), asstLangTr:()=>this._asstSetLang('tr'), asstLangEn:()=>this._asstSetLang('en'),
      listenOpen:!!this._asstLiveListen(),
      wakeArmed:!!(this._asst&&this._asst.wakeOn&&this._asst.sttMode==='wake'&&!this._asstLiveListen()),
      listenFxClass:(()=>{ if(this._asstLiveListen()) return 'on'; if(this._asst&&this._asst.wakeOn&&this._asst.sttMode==='wake') return 'wake'; return ''; })(),
      asstListenLabel:this._asstLiveListen()?'Dinliyor':'',
      asstStatus:(this._asst&&this._asst.statusLbl)||'hazır — bir komut ver',
      asstStatusPill:(this._asst&&this._asst.statusPill)||'STATUS: READY',
      asstHudWord:(()=>{ const s=(this._asst&&this._asst.state)||'idle'; return ({idle:'READY',listening:'LISTENING',working:'WORKING',speaking:'SPEAKING'})[s]||'READY'; })(),
      asstAgents:(this.AGENTS||[]).map(a=>{ const on=st.asstAgentId===a.id; return { name:a.name, onClick:()=>this._setAsstAgent(on?'':a.id),
        style:`padding:3px 8px;cursor:pointer;font-family:'JetBrains Mono',monospace;font-size:10px;border:1px solid ${on?a.color:'var(--gx-line)'};color:${on?a.color:'var(--gx-dim)'};background:${on?'color-mix(in srgb, '+a.color+' 14%, transparent)':'transparent'};border-radius:6px` }; }),
      hasAsstAgents:!!(this.AGENTS&&this.AGENTS.length), hasAsstEdit:!!st.asstAgentId, asstEditAgent:()=>this.openAgentEdit(),
      asstRootClass:st.asstOpen?('ga-hud ga-st-'+((this._asst&&this._asst.state)||'idle')):'',
      asstHidden:st.asstOpen?'false':'true',
      asstPillStyle:(()=>{ const s=(this._asst&&this._asst.state)||'idle';
        if(s==='listening') return 'color:var(--gx-ok);border-color:color-mix(in srgb, var(--gx-ok) 45%, transparent);background:color-mix(in srgb, var(--gx-ok) 10%, transparent)';
        if(s==='working') return 'color:var(--gx-info);border-color:color-mix(in srgb, var(--gx-info) 45%, transparent)';
        if(s==='speaking') return 'color:var(--gx-accent);border-color:color-mix(in srgb, var(--gx-accent) 45%, transparent)';
        return ''; })(),
      asstChatOn:(()=>{ const A=this._asst; const v=!(A&&(A.state==='listening'||A.sttMode==='command'||A.convo)); return v?'true':'false'; })(),
      asstVoiceOn:(()=>{ const A=this._asst; return (A&&(A.state==='listening'||A.sttMode==='command'||A.convo))?'true':'false'; })(),
      asstIsTr:this._lang!=='en'?'true':'false', asstIsEn:this._lang==='en'?'true':'false',
      asstWakeOn:(this._asst&&this._asst.wakeOn)?'true':'false',
      asstDotStyle:(()=>{ const col=(this._asst&&this._asst.dotCol)||'var(--gx-accent)'; return `width:9px;height:9px;border-radius:50%;background:${col};flex-shrink:0`; })(),
      asstOrbStyle:(()=>{ const n=!!st.agentId; const col=(this._asst&&this._asst.dotCol)||'var(--gx-accent)'; return `width:${n?'22px':'44px'};height:${n?'22px':'44px'};filter:drop-shadow(0 0 ${n?10:18}px ${col})`; })(),
      asstOrbCenterStyle:(()=>{ const n=!!st.agentId; const col=(this._asst&&this._asst.dotCol)||'var(--gx-accent)'; return `width:${n?'18px':'36px'};height:${n?'18px':'36px'};filter:drop-shadow(0 0 ${n?8:16}px ${col})`; })(),
      asstPanelStyle:`opacity:${st.asstOpen?'1':'0'};visibility:${st.asstOpen?'visible':'hidden'}`,
      asstMsgs:((this._asst&&this._asst.msgs)||[]).map(m=>{ const me=!!m.isUser; const mono=!!m.mono;
        const lines=me?[]:(mono?[{type:'p',lineStyle:'font-family:var(--gx-mono);font-size:12px;white-space:pre-wrap;margin:0',bullet:'',segs:[{t:m.text||' ',style:'color:inherit'}]}]:this._mdLines(m.text));
        return { text:m.text, who:me?'Sen':'', isUser:me, notUser:!me, lines, sideClass:me?'me':'gx',
          wrapStyle:'',
          bubbleStyle: mono?'font-family:var(--gx-mono);font-size:12px;white-space:pre-wrap':'' }; }),
      // Global toast + yıkıcı-işlem onayı
      toastOpen:!!st._toast, toastMsg:(st._toast&&st._toast.msg)||'',
      toastStyle:`position:fixed;top:64px;right:22px;z-index:80;max-width:360px;padding:12px 16px;border:1px solid ${(st._toast&&st._toast.kind==='err')?'#ff6b7a':'#55e88b'};background:${(st._toast&&st._toast.kind==='err')?'rgba(40,12,16,.95)':'rgba(10,30,18,.95)'};color:${(st._toast&&st._toast.kind==='err')?'#ff9aa4':'#7bf0a8'};font-family:'JetBrains Mono',monospace;font-size:12px;box-shadow:0 12px 40px rgba(0,0,0,.5);animation:slideIn .22s ease both`,
      confirmOpen:!!st._confirm, confirmMsg:(st._confirm&&st._confirm.msg)||'', confirmTitle:(st._confirm&&st._confirm.title)||'', confirmDetail:(st._confirm&&st._confirm.detail)||'',
      hasConfirmTitle:!!(st._confirm&&st._confirm.title), hasConfirmDetail:!!(st._confirm&&st._confirm.detail),
      confirmOkLabel:(st._confirm&&st._confirm.okLabel)||'Sil', runConfirm:()=>this.runConfirm(), cancelConfirm:()=>this.cancelConfirm(),
      confirmCardStyle:`width:430px;max-width:90vw;border:1px solid ${(st._confirm&&st._confirm.kind==='warn')?'rgba(255,150,80,.45)':'rgba(255,107,122,.35)'};background:linear-gradient(172deg,${(st._confirm&&st._confirm.kind==='warn')?'rgba(20,14,10,.98),rgba(8,6,5,.99)':'rgba(20,12,14,.98),rgba(8,5,7,.99)'});box-shadow:0 30px 80px rgba(0,0,0,.6);padding:22px 24px;border-radius:14px`,
      confirmOkStyle:`padding:8px 20px;cursor:pointer;font-family:'JetBrains Mono',monospace;font-size:12px;border:1px solid ${(st._confirm&&st._confirm.kind==='warn')?'#ff9650':'#ff6b7a'};background:${(st._confirm&&st._confirm.kind==='warn')?'rgba(255,150,80,.14)':'rgba(255,107,122,.14)'};color:${(st._confirm&&st._confirm.kind==='warn')?'#ffb060':'#ff6b7a'}`,
      hubTitle:(()=>{ const err=st._hubPulse==='error'; const listen=this._asstLiveListen(); const work=!!(st._gitBusy||st._agentBusy||st._conBusy||(this._asst&&this._asst.state==='working')); return err?'hata':(listen?'dinliyor':(work?'çalışıyor':'hazır')); })(),
      hubDotStyle:(()=>{ const err=st._hubPulse==='error'; const listen=this._asstLiveListen(); const work=!!(st._gitBusy||st._agentBusy||st._conBusy||(this._asst&&this._asst.state==='working')); const col=err?t.err:(listen?t.ok:(work?t.info:t.acc)); return `display:inline-block;width:7px;height:7px;border-radius:50%;background:${col};flex-shrink:0`; })(),
      // Özellik rehberi
      guideOpen:!!st._guideOpen, openGuide:()=>this.openGuide(), closeGuide:()=>this.closeGuide(),
      guideSections:this._guideData().map(([title,items])=>({title, items:items.map(t=>({t}))})),
    };
    try{ this._asstSyncChrome(); }catch(e){}
    return bag;
  }

