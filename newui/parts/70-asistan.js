  // ==================== PROJECT GALAXY ASİSTANI ====================
  // Markup: preview-sample.html (#ga-root / #ga-orbwrap / #ga-mic / #ga-wake).
  _asstFold(s){ return String(s||'').toLocaleLowerCase('tr').replace(/ı/g,'i').replace(/İ/g,'i').replace(/[.,!?;:"""''()[\]{}<>…—–]+/g,' ').replace(/\s{2,}/g,' ').trim(); }
  _asstBind(){ const A=this._asst; if(!A||typeof document==='undefined') return;
    A.root=document.getElementById('ga-root'); A.panel=document.getElementById('ga-panel');
    A.log=document.getElementById('ga-log'); A.statusEl=document.getElementById('ga-status');
    A.dotEl=document.getElementById('ga-dot'); A.textEl=document.getElementById('ga-text');
    const orbs=document.querySelectorAll('.ga-orb-canvas'); let cv=null;
    for(let i=0;i<orbs.length;i++){ if(orbs[i].offsetWidth>0){ cv=orbs[i]; break; } }
    A.canvas=cv||orbs[0]||null;
    A.micBtn=document.getElementById('ga-mic'); A.wakeBtn=document.getElementById('ga-wake'); }
  _asstScroll(){ try{ const el=document.getElementById('ga-log'); if(el) el.scrollTop=el.scrollHeight; }catch(e){} }
  _asstFlush(){ const A=this._asst; this.setState({_asstTick:(this.state._asstTick||0)+1}); setTimeout(()=>this._asstScroll(),30); }
  onAsstInput(e){ this.setState({asstInput:(e&&e.target&&e.target.value)||''}); }
  onAsstKey(e){ if(e.key==='Enter'){ e.preventDefault&&e.preventDefault(); this.sendAsst(); } }
  sendAsst(){ const el=typeof document!=='undefined'?document.getElementById('ga-text'):null; const v=String((el&&el.value)||this.state.asstInput||'').trim(); if(!v) return; this.setState({asstInput:''}); if(el) el.value=''; const A=this._asst; if(A) A.speak=false; this._stampAgentPulse(true); this.assistantHandle(v); }
  _initAssistant(){
    if(this._asst||typeof document==='undefined') return;
    const A=this._asst={ open:false, state:'idle', amp:0, rec:null, cc:0, speak:false, convo:false, msgs:[], sttMode:'off', wakeOn:false, native:false };
    this._asstBind();
    try{ window.__ga=A; }catch(e){}
    const canvas=()=>{ this._asstBind(); return A.canvas; };
    const N=96; const P=[];
    for(let i=0;i<N;i++){ P.push({a:Math.random()*Math.PI*2, r:26+Math.random()*66, sp:0.003+Math.random()*0.012, sz:0.7+Math.random()*2.4, ph:Math.random()*Math.PI*2, rr:0.85+Math.random()*0.3}); }
    const COL={ idle:[97,220,255], listening:[85,232,139], working:[70,132,246], speaking:[138,231,255] };
    let tk=0;
    const draw=()=>{ A._raf=requestAnimationFrame(draw);
      const reduce=this._reduced(); if(!reduce) tk++;
      const cv=canvas(); if(!cv) return; const ctx=cv.getContext('2d'); if(!ctx) return;
      const w=cv.width,h=cv.height,cx=w/2,cy=h/2; ctx.clearRect(0,0,w,h); ctx.globalCompositeOperation='lighter';
      const c=COL[A.state]||COL.idle;
      const speed=reduce?0:(A.state==='working'?2.6:(A.state==='listening'?1.15:1));
      if(A.native && A.state==='listening' && !(A.amp>0.05)) A.amp=0.42+Math.abs(Math.sin(tk*0.18))*0.38;
      const pulse=reduce?0.9:(A.state==='listening'?(0.6+A.amp*0.9+Math.sin(tk*0.11)*0.1):(A.state==='speaking'?(0.72+Math.abs(Math.sin(tk*0.16))*0.5):(0.88+Math.sin(tk*0.045)*0.13)));
      const coreR=30*pulse;
      const g=ctx.createRadialGradient(cx,cy,0,cx,cy,coreR*2.1);
      g.addColorStop(0,'rgba('+c[0]+','+c[1]+','+c[2]+',.95)'); g.addColorStop(.38,'rgba('+c[0]+','+c[1]+','+c[2]+',.34)'); g.addColorStop(1,'rgba(0,0,0,0)');
      ctx.fillStyle=g; ctx.beginPath(); ctx.arc(cx,cy,coreR*2.1,0,Math.PI*2); ctx.fill();
      for(const p of P){ if(!reduce) p.a+=p.sp*speed; const rr=p.r*pulse+(reduce?0:Math.sin(tk*0.03+p.ph)*5); const x=cx+Math.cos(p.a)*rr, y=cy+Math.sin(p.a)*rr*p.rr;
        const al=reduce?0.5:(0.42+Math.sin(tk*0.05+p.ph)*0.4); ctx.fillStyle='rgba('+c[0]+','+c[1]+','+c[2]+','+Math.max(0,al)+')';
        ctx.beginPath(); ctx.arc(x,y,p.sz*(0.7+pulse*0.5),0,Math.PI*2); ctx.fill(); }
      ctx.globalCompositeOperation='source-over';
      ctx.strokeStyle='rgba('+c[0]+','+c[1]+','+c[2]+','+(0.28+pulse*0.22)+')';
      ctx.lineWidth=1.4;
      for(const rad of [52,78,104]){ ctx.beginPath(); ctx.arc(cx,cy,rad*pulse,0,Math.PI*2); ctx.stroke(); }
      ctx.save(); ctx.translate(cx,cy); if(!reduce) ctx.rotate(tk*0.004*speed);
      for(let i=0;i<48;i++){ ctx.rotate(Math.PI/24); ctx.beginPath(); ctx.moveTo(0,-110*pulse); ctx.lineTo(0,(i%6? -116:-122)*pulse); ctx.stroke(); }
      ctx.restore();
    };
    draw();
    try{ if(window.speechSynthesis){ const pick=()=>{ this._asstVoice=this._asstPickVoice(); }; if(speechSynthesis.getVoices().length) pick(); speechSynthesis.addEventListener('voiceschanged', pick); } }catch(e){}
    try{ if(window.galaxy&&window.galaxy.asstHistoryGet){ window.galaxy.asstHistoryGet().then(r=>{ const ms=(r&&r.messages)||[]; if(ms.length){ A._greeted=true; A.msgs=ms.map(m=>({role:m.role==='user'?'user':'assistant', text:m.text||'', isUser:m.role==='user'})); this._asstFlush(); } }); } }catch(e){}
    A._greeted=false;
  }
  _asstToggle(){ const A=this._asst; if(!A) return; (this.state.asstOpen||A.open)?this._asstClose():this._asstOpen(); }
  _asstSessionLive(){ const A=this._asst; if(!A) return false;
    if(A.sttMode==='command'||A.sttMode==='wake'||A.convo||A.wakeOn) return true;
    if(A.state==='listening'||A.state==='speaking'||A.state==='working') return true;
    return !!A._sttRunning; }
  _asstSilence(){ const A=this._asst; if(!A) return;
    try{ window.speechSynthesis&&window.speechSynthesis.cancel(); }catch(e){}
    A.wakeOn=false; try{ localStorage.setItem('gxWakeOn','0'); }catch(e){}
    A.convo=false; A.speak=false; A._listenHeld=false; A._sttHeld=false; A._recPaused=true; A._cmdManual=false;
    if(A._silT){ clearTimeout(A._silT); A._silT=null; } if(A._cmdIdle){ clearTimeout(A._cmdIdle); A._cmdIdle=null; } A._cmdBuf='';
    this._asstPauseRec(); A.sttMode='off'; this._asstSttStop(); this._asstWatchStt(false); this._asstMicMeter(false); this._asstMicBtn(false); this._asstWakeBtnStyle();
    if(A.state==='listening'||A.state==='speaking'||A.state==='working') this._asstSetState('idle');
    this._asstSyncChrome();
    this.setState({_hubTick:(this.state._hubTick||0)+1, _asstTick:(this.state._asstTick||0)+1}); }
  _asstOpen(){ const A=this._asst; if(!A) return; A.open=true; A._userHid=false;
    this.setState({asstOpen:true, agentId:null});
    try{ if(A.panel) A.panel.setAttribute('aria-hidden','false'); }catch(e){}
    this._asstHudChrome(true);
    if(!A._greeted){ A._greeted=true;
      const n=this._captainWho().name;
      this._asstSay('assistant', this._lang==='en' ? ('I am your digital twin'+(n?(', '+n):'')+'.') : ('Ben senin dijital ikizin'+(n?(', '+n):'')+'.'),{speak:false}); }
    setTimeout(()=>{ try{ const el=document.getElementById('ga-text'); if(el) el.focus(); }catch(e){} },80); }
  _asstClose(){ const A=this._asst; if(!A) return;
    A.open=false; A._userHid=true;
    this.setState({asstOpen:false});
    this._asstHudChrome(false);
    try{ if(A.panel) A.panel.setAttribute('aria-hidden','true'); }catch(e){}
    this._asstSyncChrome(); }
  _asstLiveListen(){ const A=this._asst; if(!A) return false;
    if(A.state==='speaking'||A.state==='working'||A._listenHeld||A._sttHeld) return false;
    if(A.native) return !!(A._sttRunning && A.sttMode==='command');
    return !!(A.convo && A.rec); }
  _asstStopListen(){ const A=this._asst; if(!A) return;
    if(A.convo) this._asstConvoStop('');
    if(A.sttMode==='command') this._asstCommandExit('');
    this.setState({_hubTick:(this.state._hubTick||0)+1, _asstTick:(this.state._asstTick||0)+1}); }
  _asstHudChrome(on){ try{ document.body.classList.toggle('ga-hud-on', !!on); }catch(e){} this._asstSyncChrome(); }
  _asstSyncChrome(){ const A=this._asst; const listen=!!this._asstLiveListen();
    const wake=!!(A&&A.native&&A.wakeOn&&A.sttMode==='wake'&&!listen);
    try{ document.body.classList.toggle('ga-listening', listen); document.body.classList.toggle('ga-wake-armed', wake); }catch(e){} }
  _asstSetState(s){ const A=this._asst; if(!A) return; const prev=A.state; A.state=s; const lbl={idle:'hazır — bir komut ver',listening:'dinliyorum…',working:'çalışıyorum…',speaking:'yanıtlıyorum…'}[s]||''; const col={idle:'var(--gx-accent)',listening:'var(--gx-ok)',working:'var(--gx-info)',speaking:'var(--gx-accent)'}[s]||'var(--gx-accent)';
    A.statusLbl=lbl; A.dotCol=col;
    A.statusPill={idle:'STATUS: READY',listening:'STATUS: LISTENING',working:'STATUS: WORKING',speaking:'STATUS: SPEAKING'}[s]||'STATUS: READY';
    this._asstSyncChrome();
    if(s==='working'||prev==='working'||s!==prev) this.setState({_hubTick:(this.state._hubTick||0)+1}); }
  _asstSay(role,text,opts){ const A=this._asst; if(!A) return; opts=opts||{};
    const msg={role, text, isUser:role==='user', mono:!!opts.mono};
    A.msgs=A.msgs||[]; A.msgs.push(msg); this._asstFlush();
    if(!msg.isUser && opts.speak!==false && A.speak) this._asstSpeak(text);
    else if(!msg.isUser && A._listenHeld && A.state!=='working' && A.state!=='speaking') this._asstResumeListen();
    return msg; }
  _asstReply(text){ if(!this._asst||!text) return; this._asstSay('assistant',text); this._asstPersist('assistant',text); }
  _asstPersist(role,text){ try{ if(window.galaxy&&window.galaxy.asstHistoryAppend&&text) window.galaxy.asstHistoryAppend({role,text:String(text)}); }catch(e){} }
  _asstNewChat(){ const A=this._asst; if(!A) return; try{ if(window.galaxy&&window.galaxy.asstHistoryClear) window.galaxy.asstHistoryClear(); }catch(e){}
    this._asstClaudeSess={};
    A.msgs=[]; A._greeted=false; this._asstSay('assistant','Yeni bir sayfa açtık. Ne yapalım?',{speak:false}); A._greeted=true; }
  // ---- Günlük durum brifingi (proaktif dijital ikiz) ----
  _asstBriefData(){ const ps=this._allProjects||[]; const active=ps.filter(p=>p.status==='active');
    const stale=active.filter(p=>(p._stale||0)>=14).sort((a,b)=>(b._stale||0)-(a._stale||0));
    const fresh=active.filter(p=>(p._stale||0)<3).sort((a,b)=>(a._stale||0)-(b._stale||0));
    const pend=active.map(p=>({n:p.name,c:(p.plan||[]).filter(i=>!i[1]).length})).filter(x=>x.c>0).sort((a,b)=>b.c-a.c);
    if(!ps.length) return '';
    const L=['Toplam '+ps.length+' proje, '+active.length+' aktif.'];
    if(stale.length) L.push('Durgunlar (gün): '+stale.slice(0,6).map(p=>p.name+' '+(p._stale||0)+'g').join(', '));
    if(fresh.length) L.push('Son dokunulanlar: '+fresh.slice(0,6).map(p=>p.name).join(', '));
    if(pend.length) L.push('Bekleyen plan maddeleri: '+pend.slice(0,6).map(x=>x.n+' ('+x.c+')').join(', '));
    return L.join('\n'); }
  async _asstBrief(manual){ const A=this._asst; if(!A) return; if(!(window.galaxy&&window.galaxy.assistantRun)){ if(manual) this._asstReply('Bunu yapabilmem için Claude kurulumu gerek.'); return; }
    const data=this._asstBriefData(); if(!data){ if(manual) this._asstReply('Henüz özetleyecek proje verisi yok.'); return; }
    this._asstOpen(); A.speak=false; this._asstSetState('working');
    const who=this._captainWho(); const ident=(who.name?('Kullanıcı adı: '+who.name+'. '):'')+(who.about?('Hakkında: '+who.about+'. '):'')+'Her gün kim olduğunu hatırla, ismiyle hitap et; katı kural koyma.\n\n';
    const prompt=ident+'Bana çok kısa, sıcak bir '+(manual?'':'günaydın ')+'brifingi ver — dijital ikizim gibi samimi konuş. Aşağıdaki duruma bakıp en kritik 2-3 şeyi vurgula ve bugün neye odaklanmamı öner. Madde madde liste dökme, 3-4 cümle yeter:\n\n'+data;
    const runId='asst-brief-'+(++A.cc); A._clRaw=''; A._clRow=null; A._clRun=runId;
    try{ const r=await window.galaxy.assistantRun({runId,cwd:null,prompt,continueSession:false,ctx:this._asstCtx()});
      if(r&&r.ok===false){ this._asstSetState('idle'); this._asstReply(this._failIpc(r,'Brifing hazırlanamadı.')); this._briefPendingDate=null; } }
    catch(e){ this._asstSetState('idle'); this._asstReply('Brifing hazırlanamadı.'); this._briefPendingDate=null; } }
  _asstMaybeDailyBrief(){}
  // ---- Otomatik güncelleme bildirimi ----
  _onUpdate(kind,p){ if(kind==='available'){ this._showUpdateBanner(p); } else if(kind==='none'){ this.toast((p&&p.noRepo)?'Güncelleme deposu ayarlı değil':'Zaten en güncel sürümdesin ✓'); } else if(kind==='error'){ this.toast('Güncelleme denetlenemedi (bağlantı?)','err'); } }
  _showUpdateBanner(p){ try{ if(!p||!p.version) return; const old=document.getElementById('gx-update'); if(old) old.remove();
    const el=document.createElement('div'); el.id='gx-update';
    el.style.cssText='position:fixed;top:62px;left:50%;transform:translateX(-50%);z-index:80;display:flex;align-items:center;gap:14px;background:linear-gradient(90deg,rgba(97,220,255,.18),rgba(199,123,255,.18));border:1px solid rgba(97,220,255,.42);border-radius:12px;padding:10px 12px 10px 16px;backdrop-filter:blur(14px);box-shadow:0 12px 44px rgba(0,0,0,.5);font-family:Inter,system-ui,-apple-system,sans-serif;animation:fadeUp .3s ease both';
    el.innerHTML='<span style="font-size:16px">🚀</span><span style="font-size:13px;color:#dbe4ff">Yeni sürüm <b>v'+String(p.version).replace(/[<>]/g,'')+'</b> hazır</span>';
    const dl=document.createElement('button'); dl.textContent='İndir'; dl.style.cssText='border:1px solid #61dcff;background:rgba(97,220,255,.16);color:#61dcff;border-radius:8px;padding:6px 14px;cursor:pointer;font-size:12px;font-family:inherit';
    dl.onclick=()=>{ try{ window.galaxy&&window.galaxy.openUpdate&&window.galaxy.openUpdate(p.url); }catch(e){} el.remove(); };
    const x=document.createElement('span'); x.textContent='✕'; x.title='Kapat'; x.style.cssText='color:#9aa3c2;cursor:pointer;font-size:14px;padding:0 4px'; x.onclick=()=>el.remove();
    el.appendChild(dl); el.appendChild(x); document.body.appendChild(el);
  }catch(e){} }
  // Konuşma metnini temizle: gizli aksiyon komutları, emoji, markdown → sesli okumaya uygun düz metin
  _asstClean(text){ let t=String(text||'');
    t=t.replace(/\[\[ACT[^\]]*\]\]/g,' ');                       // gizli aksiyon komutları
    t=t.replace(/[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{2190}-\u{21FF}\u{2B00}-\u{2BFF}\u{FE00}-\u{FE0F}\u{1F1E6}-\u{1F1FF}\u200d]/gu,''); // emoji
    t=t.replace(/```[\s\S]*?```/g,' kod bloğu ').replace(/`([^`]+)`/g,'$1'); // kod
    t=t.replace(/[*_#>~]/g,'').replace(/\[([^\]]+)\]\([^)]+\)/g,'$1');       // markdown
    t=t.replace(/\s{2,}/g,' ').trim(); return t; }
  _asstPickVoice(){ try{ if(!window.speechSynthesis) return null; const vs=window.speechSynthesis.getVoices()||[]; if(!vs.length) return null;
    const en=this._lang==='en';
    const male=/male|\bman\b|tolga|ahmet|erol|mehmet|\bcem\b|emre|yusuf|baris|barış|onur|burak|daniel|alex|fred|tom|jorge|diego|eddy|reed|gordon|rishi|aaron|grandpa/i;
    const female=/female|yelda|filiz|zeynep|samantha|karen|moira|tessa|fiona|victoria|kathy|princess|woman|girl|grandma/i;
    const isTr=v=>/tr[-_]/i.test(v.lang||'')||/turkish|\btürk|yelda|filiz|zeynep/i.test((v.name||'')+' '+(v.lang||''));
    const isEn=v=>/en[-_]/i.test(v.lang||'')||/\benglish\b/i.test((v.name||'')+' '+(v.lang||''));
    const quality=n=>/premium|enhanced|natural|siri|compact/i.test(n)?6:0;
    if(!en){
      const banned=/alex|daniel|fred|\btom\b|samantha|karen|moira|victoria|kathy|daniel/i;
      const trVs=vs.filter(v=>isTr(v)&&!banned.test(v.name||''));
      const score=v=>{ const n=(v.name||'')+' '+(v.lang||''); let s=0;
        if(isTr(v)) s+=80;
        if(/yelda/i.test(n)) s+=50;
        if(/filiz|zeynep/i.test(n)) s+=24;
        s+=quality(n);
        if(banned.test(n)&&!isTr(v)) s-=200;
        if(!isTr(v)) s-=120;
        return s; };
      const best=trVs.slice().sort((a,b)=>score(b)-score(a))[0]||null;
      if(best && banned.test(best.name||'') && !isTr(best)) return null;
      return best||null;
    }
    const enVs=vs.filter(isEn);
    const pool=enVs.length?enVs:vs;
    const score=v=>{ const n=(v.name||'')+' '+(v.lang||''); let s=0;
      if(isEn(v)) s+=20;
      const isF=female.test(n)&&!/\bmale\b/i.test(n);
      const isM=male.test(n)&&!isF;
      if(isM) s+=12; if(isF) s-=8; s+=quality(n); return s; };
    return pool.slice().sort((a,b)=>score(b)-score(a))[0]||null;
  }catch(e){ return null; } }
  _asstSttHints(){ const out=['Kaptan','kaptan','Captain','CAPTAIN','Hey Kaptan','Kapten','Galaxy','Hey Galaxy','Galaksi','Hey Galaksi','docker','commit','push','pull','terminal','ayarlar','evren','gezegen','tarafına','gezegenine','projesine'];
    const add=s=>{ s=String(s||'').trim(); if(s.length>=2 && out.indexOf(s)<0) out.push(s); };
    (this._unis||[]).forEach(u=>add(u&&u.name));
    const ps=(this._allProjects&&this._allProjects.length)?this._allProjects:(this.PROJECTS||[]);
    ps.forEach(p=>add(p&&p.name));
    return out.slice(0,90); }
  _asstEditDist(a,b){ if(a===b) return 0; const m=a.length,n=b.length; if(!m) return n; if(!n) return m; if(Math.abs(m-n)>3) return 99;
    const dp=new Array(n+1); for(let j=0;j<=n;j++) dp[j]=j;
    for(let i=1;i<=m;i++){ let prev=dp[0]; dp[0]=i; for(let j=1;j<=n;j++){ const tmp=dp[j]; dp[j]=a[i-1]===b[j-1]?prev:1+Math.min(prev,dp[j],dp[j-1]); prev=tmp; } }
    return dp[n]; }
  _asstRepairHeard(text){ const lex=this._asstSttHints(); if(!lex.length||!text) return text;
    const items=lex.map(s=>({raw:s, fold:this._asstFold(s)}));
    return String(text).split(/(\s+)/).map(tok=>{
      if(/^\s+$/.test(tok)||tok.length<3) return tok;
      const f=this._asstFold(tok.replace(/[^\p{L}\p{N}]+/gu,'')); if(f.length<3) return tok;
      let best=null, bd=99;
      for(const it of items){
        const d=this._asstEditDist(f, it.fold);
        const lim=it.fold.length<=4?1:it.fold.length<=8?2:3;
        if(d && d<=lim && d<bd && d/Math.max(it.fold.length,1)<=0.4){ bd=d; best=it.raw; }
      }
      return best||tok;
    }).join(''); }
  _asstMute(ms){ const A=this._asst; if(!A) return; A._deafUntil=Math.max(A._deafUntil||0, Date.now()+(ms||800)); }
  _asstIsDeaf(){ const A=this._asst; if(!A) return true;
    if(A._listenHeld) return true;
    if(A.state==='speaking'||A.state==='working') return true;
    if(A._speakUntil&&Date.now()<A._speakUntil) return true;
    if(A._deafUntil&&Date.now()<A._deafUntil) return true;
    return false; }
  _asstWakePat(){ return String.raw`(?:\b(?:hey|hei|ey|hi)\s+)?\b(?:kaptan|kapten|captain|kapitan|captan)\b|\b(?:hey|hei|ey)\s+(?:galaxy|galaksi)\b|\bcap\s+tan\b`; }
  _asstWakeRe(){ return new RegExp(this._asstWakePat()); }
  _asstStripWake(s){ return this._asstFold(s).replace(new RegExp(this._asstWakePat(),'g'),' ').replace(/\s{2,}/g,' ').trim(); }
  _asstIsWakeOnly(s){ return !this._asstStripWake(s); }
  _asstLastAsstText(){ const msgs=(this._asst&&this._asst.msgs)||[]; for(let i=msgs.length-1;i>=0;i--){ if(!msgs[i].isUser) return String(msgs[i].text||''); } return ''; }
  _asstIsEcho(heard){ const A=this._asst; if(!A) return false;
    const spoken=A._lastSpoken||'';
    if(!spoken||!A._lastSpokenAt||Date.now()-A._lastSpokenAt>4000) return false;
    const corpus=this._asstFold(spoken).slice(0,220); const h=this._asstFold(heard);
    if(!h||h.length<6) return false;
    if(h===corpus||h===this._asstFold(spoken)) return true;
    if(h.length>=10 && (corpus.indexOf(h)>=0||this._asstFold(spoken).indexOf(h)>=0)) return true;
    if(corpus.length>=12 && h.indexOf(corpus.slice(0,Math.min(80,corpus.length)))>=0) return true;
    return false; }
  _asstDupe(text){ const A=this._asst; if(!A) return false; const n=this._asstFold(text);
    if(A._lastHeard && A._lastHeard.t===n && Date.now()-A._lastHeard.at<2800) return true;
    A._lastHeard={t:n, at:Date.now()}; return false; }
  _asstTooShort(t){ const n=this._asstFold(t); if(!n) return true;
    if(/^(dur|aç|ac|git|in|çekil|cek|sus)$/.test(n)) return false;
    const compact=n.replace(/\s/g,''); if(compact.length<4) return true;
    const words=n.split(/\s+/).filter(Boolean);
    if(compact.length<6 && words.length<2) return true;
    return false; }
  _asstPauseListen(){ const A=this._asst; if(!A) return; A._listenHeld=true;
    if(A._silT){ clearTimeout(A._silT); A._silT=null; } A._cmdBuf='';
    this._asstPauseRec();
    if(A.native && (A._sttRunning||A.sttMode==='command'||A.sttMode==='wake')){
      A._sttHeld=true;
      try{ if(window.galaxy&&window.galaxy.sttPause) window.galaxy.sttPause(); }catch(e){}
    } }
  _asstResumeListen(){ const A=this._asst; if(!A) return; A._listenHeld=false; this._asstMute(500);
    if(A._sttHeld){
      A._sttHeld=false;
      if(A.sttMode==='command'||(A.wakeOn&&A.sttMode!=='off')){
        try{
          if(window.galaxy&&window.galaxy.sttResume) window.galaxy.sttResume();
          else this._asstSttStart();
        }catch(e){ this._asstSttStart(); }
      }
    }
    if(A.convo) this._asstResumeRec();
    this._asstSyncChrome(); this.setState({_asstTick:(this.state._asstTick||0)+1}); }
  _asstSpeak(text){ try{ if(!window.speechSynthesis){ this._asstResumeListen(); return; } const clean=this._asstClean(text); if(!clean){ this._asstResumeListen(); return; } window.speechSynthesis.cancel();
    const A=this._asst; this._asstPauseListen();
    const spoken=clean.length>420?(function(){ const cut=clean.slice(0,360); const sp=Math.max(cut.lastIndexOf('. '),cut.lastIndexOf('! '),cut.lastIndexOf('? ')); return (sp>80?cut.slice(0,sp+1):cut).trim(); })():clean;
    const restore=()=>{ if(!A) return; A._lastSpokenAt=Date.now(); A._speakUntil=Date.now()+700; this._asstMute(700); if(A.state==='speaking') this._asstSetState(A.sttMode==='command'?'listening':'idle'); this._asstResumeListen(); };
    const u=new SpeechSynthesisUtterance(spoken.slice(0,700));
    const tr=this._lang!=='en';
    u.lang=tr?'tr-TR':'en-US'; u.rate=1.12; u.pitch=tr?1.02:0.82;
    this._asstVoice=this._asstPickVoice();
    const vn=((this._asstVoice&&this._asstVoice.name)||'')+' '+((this._asstVoice&&this._asstVoice.lang)||'');
    if(tr && (!this._asstVoice || /alex|daniel|fred|\btom\b/i.test(vn))){ this._asstResumeListen(); return; }
    if(this._asstVoice) u.voice=this._asstVoice;
    const est=Math.min(18000, spoken.length*52+600);
    if(A){ A._lastSpoken=clean; A._lastSpokenAt=Date.now(); A._speakUntil=Date.now()+est+700; this._asstMute(est+700);
      if(A._speakT) clearTimeout(A._speakT); A._speakT=setTimeout(restore, est+400); }
    u.onstart=()=>{ this._asstSetState('speaking'); if(A){ A._speakUntil=Date.now()+est+700; this._asstMute(est+700); } };
    u.onend=()=>{ if(A&&A._speakT){ clearTimeout(A._speakT); A._speakT=null; } restore(); };
    this._asstSetState('speaking'); window.speechSynthesis.speak(u); }catch(e){ try{ this._asstResumeListen(); }catch(x){} } }
  // Sürekli konuşma modu: bir kez bas → "çekil/dur/kapan" diyene kadar (ya da mic'e tekrar basana kadar) dinler.
  _asstMicToggle(){ const A=this._asst; if(!A) return; if(!A.open) this._asstOpen();
    A._listenHeld=false; A._sttHeld=false; A._recPaused=false;
    if(A.native){ if(A.sttMode==='command'){ this._asstCommandExit('Tamam, dinlemeyi bıraktım.'); } else { this._asstActivateManual(); } return; }
    if(A.convo){ this._asstConvoStop('Tamam, dinlemeyi bıraktım.'); return; }
    const SR=window.SpeechRecognition||window.webkitSpeechRecognition;
    if(!SR){ A.speak=false; this._asstSay('assistant','Bu ortamda ses tanıma yok — yazarak konuşabiliriz.',{speak:false}); return; }
    A.convo=true; A.speak=true; A._cmdManual=true; A._gotAny=false; this._asstMicBtn(true); this._asstStartRec(); this._asstMicMeter(true);
    this._asstSay('assistant','Seni dinliyorum, konuş. Bitince “dur” ya da “çekil” de, kapatırım.',{speak:false}); }
  _asstMicBtn(on){ const A=this._asst; if(!A||!A.micBtn) return; try{ A.micBtn.classList.toggle('on', !!on); A.micBtn.setAttribute('aria-pressed', on?'true':'false'); }catch(e){} A.micBtn.title=on?'Dinlemeyi durdur':'Voice On'; this._asstSyncChrome(); }
  _asstChatMode(){ const A=this._asst; if(!A) return; this._asstSilence(); this.setState({_asstTick:(this.state._asstTick||0)+1}); }
  _asstSetLang(lang){ const l=lang==='en'?'en':'tr'; this._lang=l; this._langUserSet=true;
    try{ localStorage.setItem('gxLang',l); localStorage.setItem('gxAsstLang',l); }catch(e){}
    this._asstVoice=this._asstPickVoice(); this._applyLang();
    const A=this._asst; if(A&&A.rec){ try{ A.rec.lang=l==='en'?'en-US':'tr-TR'; }catch(e){} }
    if(A&&A.native&&(A.sttMode==='command'||A.sttMode==='wake'||A._sttRunning)){ this._asstSttStop(); this._asstSttStart(); }
    this.setState({_asstTick:(this.state._asstTick||0)+1});
    try{ if(window.galaxy&&window.galaxy.settingsGet&&window.galaxy.settingsSave){ window.galaxy.settingsGet().then(r=>{ const s=(r&&r.settings)||{}; window.galaxy.settingsSave(Object.assign({}, s, {lang:l})); }); } }catch(e){} }
  _asstStartRec(){ const A=this._asst; if(!A||!A.convo) return; const SR=window.SpeechRecognition||window.webkitSpeechRecognition; if(!SR) return;
    try{ const rec=new SR(); A.rec=rec; rec.lang=(this._lang==='en')?'en-US':'tr-TR'; rec.interimResults=true; rec.continuous=true; rec.maxAlternatives=3;
      rec.onstart=()=>{ if(A.state!=='speaking'&&A.state!=='working') this._asstSetState('listening'); };
      rec.onresult=(e)=>{ A._gotAny=true; let interim='',final=''; for(let i=e.resultIndex;i<e.results.length;i++){ const r=e.results[i]; if(r.isFinal) final+=r[0].transcript; else interim+=r[0].transcript; }
        if(A._silT){ clearTimeout(A._silT); A._silT=null; }
        if(final.trim()){ A._interim=''; if(A.textEl) A.textEl.value=''; this._asstHeard(final.trim()); return; }
        if(interim){ A._interim=interim; if(A.textEl) A.textEl.value=interim; }
      };
      rec.onerror=(ev)=>{ const er=ev&&ev.error;
        if(er==='not-allowed'||er==='service-not-allowed'){ this._asstConvoStop(''); A.speak=false; this._asstSay('assistant','Mikrofona erişemedim. Sistem Ayarları → Gizlilik ve Güvenlik → Mikrofon’dan “Project Galaxy”ye izin ver, sonra tekrar dene.',{speak:false}); }
        else if(er==='network'||er==='language-not-supported'){ this._asstConvoStop(''); A.speak=false; this._asstSay('assistant','Ses tanıma servisi bu ortamda yanıt vermiyor. Şimdilik yazarak konuşalım; sesli tanımayı düzeltmek için üzerinde çalışıyorum.',{speak:false}); }
      };
      rec.onend=()=>{ A.rec=null; if(A.convo && !A._recPaused){ setTimeout(()=>{ if(A.convo && !A._recPaused && !A.rec) this._asstStartRec(); },250); } };
      rec.start();
    }catch(e){ /* zaten çalışıyor olabilir */ } }
  _asstHeard(txt){ const A=this._asst; if(!A) return; txt=this._asstRepairHeard(txt); if(A.textEl) A.textEl.value='';
    if(this._asstIsDeaf()) return;
    if(this._asstTooShort(txt)) return;
    if(this._asstIsWakeOnly(txt)||this._asstIsEcho(txt)||this._asstDupe(txt)) return;
    const n=this._asstFold(txt);
    if(/^\s*(çekil|dur|kapan|yeter|sus|teşekkürler kapat|dinlemeyi bırak|iptal|tamam kapat)\b/.test(n)){ this._asstStopListen(); this._asstReply('Tamam, kapattım. İstersen Asistan’dan veya «Kaptan» ile yine açarsın.'); return; }
    A.speak=true; this.assistantHandle(txt); }
  _asstConvoStop(msg){ const A=this._asst; if(!A) return; A.convo=false; A._recPaused=false; this._asstMicBtn(false); this._asstMicMeter(false); try{ if(A.rec){ A.rec.onend=null; A.rec.stop(); } }catch(e){} A.rec=null; if(this._asst.state==='listening') this._asstSetState('idle'); if(msg) this._asstReply(msg); }
  _asstPauseRec(){ const A=this._asst; if(!A) return; A._recPaused=true; try{ if(A.rec){ A.rec.onend=null; A.rec.stop(); } }catch(e){} A.rec=null; }
  _asstResumeRec(){ const A=this._asst; if(!A||!A.convo) return; A._recPaused=false; if(!A.rec) this._asstStartRec(); }
  // ---- Native STT (macOS Speech) : "Kaptan" uyandırma + sesli komut ----
  _asstWakeBtnStyle(){ const A=this._asst; if(!A||!A.wakeBtn) return; const on=A.native&&A.wakeOn; try{ A.wakeBtn.classList.toggle('on', !!on); A.wakeBtn.setAttribute('aria-pressed', on?'true':'false'); }catch(e){} A.wakeBtn.style.opacity=A.native?'1':'.4'; A.wakeBtn.title=A.native?(on?'Hep dinle AÇIK — “Kaptan” de':'Hep dinle kapalı'):'Native ses tanıma yok'; this._asstSyncChrome(); }
  _asstWakeToggle(){ const A=this._asst; if(!A) return; if(!A.native){ A.speak=false; this._asstSay('assistant','Bu ortamda native ses tanıma yok; mic tuşuyla konuşabiliriz.',{speak:false}); return; } A.wakeOn=!A.wakeOn; try{ localStorage.setItem('gxWakeOn', A.wakeOn?'1':'0'); }catch(e){} this._asstWakeBtnStyle(); this.setState({_hubTick:(this.state._hubTick||0)+1}); if(A.wakeOn){ this._asstWakeStart(); this._asstSay('assistant','Tamam, artık “Kaptan” diyerek beni çağırabilirsin — hangi sayfada olursan ol. Komutu peşine ekle: “Kaptan, docker’ı aç”.',{speak:false}); } else { if(A.sttMode!=='command'){ A.sttMode='off'; this._asstSttStop(); } this._asstSay('assistant','Hep dinleme kapandı. Mic tuşuyla yine konuşabiliriz.',{speak:false}); } this._asstSyncChrome(); }
  async _asstSttStart(){ const A=this._asst; if(!A) return false;
    if(A.native && window.galaxy && window.galaxy.sttStart){
      try{
        const r=await window.galaxy.sttStart({ hints:this._asstSttHints(), lang:this._lang==='en'?'en':'tr' });
        if(r && r.ok!==false){ A._sttRunning=true; this._asstSyncChrome(); this.setState({_asstTick:(this.state._asstTick||0)+1}); this._asstWatchStt(true); return true; }
      }catch(e){}
    }
    A._sttRunning=false;
    if(!A.native && A.sttMode==='command'){
      const SR=window.SpeechRecognition||window.webkitSpeechRecognition;
      if(SR){ A.convo=true; A.speak=true; this._asstStartRec(); this._asstMicMeter(true); this._asstSyncChrome(); this.setState({_asstTick:(this.state._asstTick||0)+1}); return true; }
    }
    return false; }
  _asstSttStop(){ try{ if(window.galaxy&&window.galaxy.sttStop){ window.galaxy.sttStop(); } }catch(e){} if(this._asst) this._asst._sttRunning=false; this._asstSyncChrome(); this.setState({_asstTick:(this.state._asstTick||0)+1}); }
  _asstWatchStt(on){ if(this._asstWatchI){ clearInterval(this._asstWatchI); this._asstWatchI=null; }
    if(!on) return;
    this._asstWatchI=setInterval(()=>{
      const A=this._asst; if(!A||!A.native) return;
      if(A._listenHeld||A._sttHeld||A.state==='speaking'||A.state==='working') return;
      if(A.sttMode!=='command' && !(A.wakeOn&&A.sttMode==='wake')) return;
      if(A._sttRunning) return;
      if(A._sttRetryAt && Date.now()-A._sttRetryAt<1800) return;
      A._sttRetryAt=Date.now();
      this._asstSttStart();
    }, 1600); }
  _asstWakeStart(){ const A=this._asst; if(!A||!A.native||!A.wakeOn) return; A.sttMode='wake'; this._asstSttStart(); this._asstSyncChrome(); }
  _asstArmCmdIdle(){ const A=this._asst; if(!A) return; if(A._cmdIdle){ clearTimeout(A._cmdIdle); A._cmdIdle=null; }
    if(A._cmdManual) return;
    A._cmdIdle=setTimeout(()=>{ const B=this._asst; if(!B||B.sttMode!=='command'||B._cmdManual) return;
      if(B.state==='working'||B.state==='speaking'){ this._asstArmCmdIdle(); return; }
      this._asstCommandExit(''); }, 10000); }
  async _asstActivateManual(){ const A=this._asst; if(!A) return;
    A._listenHeld=false; A._sttHeld=false; A._recPaused=false; A._deafUntil=0; A._speakUntil=0; A._cmdManual=true;
    if(A._cmdIdle){ clearTimeout(A._cmdIdle); A._cmdIdle=null; }
    A.sttMode='command'; A.speak=true; A._cmdBuf=''; this._asstMicBtn(true);
    const ok=await this._asstSttStart();
    if(ok){ this._asstSetState('listening'); this._asstMicMeter(true); this._asstMute(350); }
    else { this._asstSetState('idle'); this._asstMicBtn(false); A.speak=false; this._asstSay('assistant','Mikrofonu açamadım. Sistem Ayarları → Gizlilik → Mikrofon / Konuşma Tanıma’dan izin ver, veya yazarak konuş.',{speak:false}); }
    this._asstSyncChrome(); this.setState({_hubTick:(this.state._hubTick||0)+1, _asstTick:(this.state._asstTick||0)+1}); }
  _asstActivateFromWake(rest){ const A=this._asst; if(!A) return;
    if(A.sttMode==='command'||A.state==='working'||A.state==='speaking') return;
    if(A._wakeAt && Date.now()-A._wakeAt<4500) return;
    A._wakeAt=Date.now(); A.sttMode='command'; A.speak=true; A._cmdManual=false;
    if(!A.open) this._asstOpen(); this._asstMicBtn(true); A._cmdBuf=''; this._asstSetState('listening');
    this._asstSttStart(); this._asstMute(500); this._asstArmCmdIdle();
    const r=this._asstStripWake(rest||'');
    if(r.length>=6){ setTimeout(()=>{ const B=this._asst; if(!B||B.sttMode!=='command') return; this._asstSttSubmit(r); }, 400); } }
  _asstCommandExit(msg){ const A=this._asst; if(!A) return; if(A._silT){ clearTimeout(A._silT); A._silT=null; } if(A._cmdIdle){ clearTimeout(A._cmdIdle); A._cmdIdle=null; } A._cmdBuf=''; A._cmdManual=false; if(A.textEl) A.textEl.value=''; A.sttMode=A.wakeOn?'wake':'off'; this._asstMicBtn(false); if(A.state==='listening') this._asstSetState('idle'); if(msg){ A.speak=false; this._asstReply(msg); } if(A.sttMode==='off') this._asstSttStop(); else if(A.sttMode==='wake') this._asstWakeStart(); this._asstSyncChrome(); }
  _asstSttSubmit(text){ const A=this._asst; if(!A) return; if(this._asstIsDeaf()) return;
    const t=this._asstRepairHeard(String(text||A._cmdBuf||(A.textEl&&A.textEl.value)||'').trim()); A._cmdBuf=''; if(A.textEl) A.textEl.value=''; if(!t) return;
    if(this._asstTooShort(t)) return;
    if(this._asstIsWakeOnly(t)||this._asstIsEcho(t)||this._asstDupe(t)) return;
    const n=this._asstFold(t); if(/^\s*(çekil|dur|kapan|yeter|sus|iptal|tamam kapat|dinlemeyi bırak)\b/.test(n)){ this._asstStopListen(); this._asstReply('Tamam, kapattım. İstersen Asistan’dan veya «Kaptan» ile yine açarsın.'); return; }
    A.speak=true; this.assistantHandle(t); }
  _onStt(m){ const A=this._asst; if(!A||!m) return;
    if(m.type==='status'){
      if(m.text==='listening'||m.text==='ondevice'||m.text==='server'||m.text==='authorized'){ A._sttRunning=true; this._asstSyncChrome(); this.setState({_asstTick:(this.state._asstTick||0)+1}); }
      if(m.text==='closed'||m.text==='stopped'||m.text==='paused'){
        A._sttRunning=false; this._asstSyncChrome(); this.setState({_asstTick:(this.state._asstTick||0)+1});
        if(A._sttHeld||A._listenHeld||A.state==='speaking'||A.state==='working') return;
        if((A.sttMode==='command'||(A.wakeOn&&A.sttMode==='wake')) && !A._sttHeld){
          setTimeout(()=>{ const B=this._asst; if(!B||B._sttHeld||B._listenHeld) return; if(B._sttRunning) return; if(B.sttMode==='command'||(B.wakeOn&&B.sttMode!=='off')) this._asstSttStart(); }, 400);
        }
      }
      return; }
    if(m.type==='error'){ A._sttRunning=false; this._asstSyncChrome(); this.setState({_asstTick:(this.state._asstTick||0)+1}); if(/auth-denied|auth-restricted|auth-not/.test(m.text||'')){ A.native=false; A.wakeOn=false; this._asstWakeBtnStyle(); if(!A.open) this._asstOpen(); A.speak=false; this._asstSay('assistant','Konuşma tanıma/mikrofon izni kapalı. Sistem Ayarları → Gizlilik ve Güvenlik → “Konuşma Tanıma” ve “Mikrofon” altında Project Galaxy’ye izin verip uygulamayı yeniden aç. O zamana kadar yazarak konuşalım.',{speak:false}); } else if(A.sttMode==='command' || A.sttMode==='wake'){ setTimeout(()=>{ const B=this._asst; if(!B||B._listenHeld||B._sttHeld) return; if(B.sttMode==='command'||(B.wakeOn&&B.sttMode==='wake')) this._asstSttStart(); }, 700); } return; }
    const text=String(m.text||''); if(!text) return;
    if(m.type==='alts') return;
    if(this._asstIsDeaf()) return;
    const n=this._asstFold(text);
    const wakeHit=this._asstWakeRe().test(n);
    if(wakeHit && A.sttMode==='command') return;
    if(A.wakeOn && A.sttMode!=='command' && wakeHit){ this._asstActivateFromWake(this._asstStripWake(n)); return; }
    if(A.sttMode==='wake') return;
    if(A.sttMode==='command'){
      if(m.type==='final'){ if(A._silT){ clearTimeout(A._silT); A._silT=null; } this._asstArmCmdIdle(); this._asstSttSubmit(text); }
      else { A._cmdBuf=text; if(A.textEl) A.textEl.value=text; if(A.state!=='working') this._asstSetState('listening'); }
      return; }
  }
  _asstMicMeter(on){ const A=this._asst; if(!A) return;
    // Native STT owns the mic. Chromium getUserMedia here steals the input and galaxy-stt goes deaf.
    if(A.native || !on){ A.amp=0; try{ if(A._micRaf){ cancelAnimationFrame(A._micRaf); A._micRaf=null; } if(A._micStream){ A._micStream.getTracks().forEach(t=>t.stop()); A._micStream=null; } if(A._ac){ A._ac.close(); A._ac=null; } }catch(e){} return; }
    try{ if(!navigator.mediaDevices) return; navigator.mediaDevices.getUserMedia({audio:true}).then(stream=>{ if(!this._asst||this._asst.native){ try{ stream.getTracks().forEach(t=>t.stop()); }catch(e){} return; } A._micStream=stream; const AC=window.AudioContext||window.webkitAudioContext; const ac=new AC(); A._ac=ac; const src=ac.createMediaStreamSource(stream); const an=ac.createAnalyser(); an.fftSize=256; src.connect(an); const data=new Uint8Array(an.frequencyBinCount);
      const tick=()=>{ if(!A._ac) return; an.getByteFrequencyData(data); let s=0; for(let i=0;i<data.length;i++) s+=data[i]; A.amp=Math.min(1,(s/data.length)/90); A._micRaf=requestAnimationFrame(tick); }; tick();
    }).catch(()=>{}); }catch(e){} }
  // --- komut yönlendirme: uygulama kontrolü + geliştirme (Claude) ---
  _asstNameScore(q, name){
    q=this._asstFold(q).replace(/[-_/]/g,' ').replace(/\s+/g,' ').trim();
    const nm=this._asstFold(name).replace(/[-_/]/g,' ').replace(/\s+/g,' ').trim();
    if(!q||!nm) return 0;
    if(nm===q) return 100;
    if(nm.indexOf(q)>=0||(q.length>=4&&q.indexOf(nm)>=0)) return 74;
    const compact=(s)=>s.replace(/\s+/g,'');
    const a=compact(nm), b=compact(q);
    const d=this._asstEditDist(a,b);
    const maxL=Math.max(a.length,b.length);
    if(maxL>=3 && d<=Math.max(1, Math.floor(maxL*0.34))) return Math.max(36, 62-d*8);
    const qw=q.split(/\s+/).filter(w=>w.length>1);
    let s=qw.filter(w=>nm.indexOf(w)>=0).length*24;
    for(const w of qw){ if(w.length<3) continue; for(const p of nm.split(/\s+/)){ const ed=this._asstEditDist(w,p); if(ed<=1) s+=20; } }
    return s; }
  _asstFindProject(q){ const ps=(this._allProjects&&this._allProjects.length)?this._allProjects:(this.PROJECTS||[]); if(!q) return null; let best=null,bs=0;
    for(const p of ps){ const s=this._asstNameScore(q,p.name); if(s>bs){ bs=s; best=p; } }
    return bs>=28?best:null; }
  _asstFindUni(q){ const us=this._unis||[]; if(!q) return null; let best=null,bs=0;
    for(const u of us){ if(!u.id) continue; const s=this._asstNameScore(q,u.name||''); if(s>bs){ bs=s; best=u; } }
    return bs>=28?best:null; }
  _asstTabId(arg){ const a=this._asstFold(arg||''); if(!a) return '';
    if(/(^| )(genel|ozet|özet|overview|dashboard|ana sayfa|anasayfa|home|bugun|bugün)( |$)/.test(a)||a==='genel') return 'genel';
    if(/(^| )(evren|galaksi|universe|projeler)( |$)/.test(a)||a==='evren') return 'evren';
    if(/(^| )(ajan|ajanlar|agents?|toplanti|toplantı)( |$)/.test(a)) return 'pixel';
    if(/(otomasyon|automation)/.test(a)) return 'zaman';
    if(/(proje taramas|tarama)/.test(a)) return 'dongu';
    if(/(servis|services)/.test(a)) return 'db';
    if(/(pano|kanban|todo|görev|gorev)/.test(a)) return 'pano';
    if(/(veritaban|(^| )db( |$)|sql)/.test(a)) return 'db';
    if(/(docker|konteyner|container)/.test(a)) return 'docker';
    if(/(zamanlay|scheduler|zamanl)/.test(a)) return 'zaman';
    if(/(döngü|dongu|loop canvas|loop)/.test(a)) return 'dongu';
    if(/(posta|gmail|e-?posta|(^| )mail( |$))/.test(a)) return 'posta';
    if(/(sunucu|ssh|servers?)/.test(a)) return 'servers';
    return ''; }
  _asstTabLabel(id){ return {genel:'Ana Sayfa',evren:'Projeler',pano:'Görevler',pixel:'Ajanlar',db:'Veritabanları',docker:'Konteynerler',zaman:'Zamanlanmış işler',dongu:'Proje taraması',posta:'E-posta',servers:'SSH sunucuları'}[id]||id; }
  _asstCtx(){
    const pw=this.state._pw||{};
    const bits=[];
    if(pw.compose) bits.push('compose '+(pw.compose.file||''));
    if(pw.env&&pw.env.dbHint) bits.push('DB '+(pw.env.dbHint.database||pw.env.dbHint.host||''));
    if((pw.listening||[]).length) bits.push('port '+(pw.listening.join(',')));
    if(pw.migrate) bits.push(pw.migrate.label);
    const ag=(this.AGENTS||[]).find(a=>a.id===this.state.asstAgentId);
    return {
      lang:this._lang==='en'?'en':'tr',
      unis:(this._unis||[]).filter(u=>u.id).map(u=>u.name),
      projects:((this._allProjects&&this._allProjects.length)?this._allProjects:this.PROJECTS||[]).map(p=>p.name),
      location:(this._inPlanet()?('“'+((this.sel&&this.sel.name)||'')+'” gezegeni'):'uzay (evren: '+(((this._unis||[]).find(u=>u.id===this.state.uniId)||{}).name||'-')+')'),
      planetWork: bits.join(' · '),
      agentName: ag?ag.name:'', agentRole: ag?ag.role:'', agentSys: '',
      captainName: this._captainWho().name, captainAbout: this._captainWho().about
    };
  }
  // Tüm uygulama aksiyonları tek kapıdan — hem yerel parser hem Claude komutları bunu çağırır.
  _asstDoAction(name,arg){ arg=(arg||'').trim(); const inProj=this._inPlanet();
    name=String(name||'').toLowerCase().replace(/[^a-z_]/g,'');
    switch(name){
      case 'open_universe':{ const u=this._asstFindUni(arg); if(u){ this.selectUni(u.id); return '“'+u.name+'” evrenini açtım.'; } return arg?('“'+arg+'” diye bir evren bulamadım.'):null; }
      case 'open_project':{ const p=this._asstFindProject(arg); if(p){ this._gotoProject(p.id); return '“'+p.name+'” gezegenine indim.'; } return arg?('“'+arg+'” diye bir proje bulamadım.'):null; }
      case 'open_tab':{ const raw=String(arg||'').toLowerCase().trim(); const id=this._asstTabId(arg)||({genel:1,evren:1,pano:1,db:1,docker:1,zaman:1,dongu:1,posta:1,servers:1}[raw]?raw:''); if(id){ this._openTab(id); return this._asstTabLabel(id)+' sekmesini açtım.'; } return null; }
      case 'mail_brief': this._openTab('posta'); this.setState({mailPane:'compose', mailTo:this.state.mailTo||this._mailTo||'', mailSub:this.state.mailSub||'Galaxy', mailBody:this._mailItems().map(i=>i.kind+'\n'+i.text).join('\n\n')||this._asstBriefData()||''}); return 'Posta yazma alanını açtım.';
      case 'mail_send': try{ if(window.galaxy&&window.galaxy.mcpCall) window.galaxy.mcpCall({alias:'send', args:this._mailArgs(arg||'','Galaxy')}).then(r=>this._asstReply((r&&r.ok)?'Posta gitti.':('Posta: '+((r&&r.error)||'MCP yok')))); else this._asstReply('Posta: MCP yok'); }catch(e){} return 'Postayı deniyorum.';
      case 'open_git': if(!inProj) return 'Git için önce bir projeye girmem gerek.'; this._setLeftTab('git'); return 'Git sekmesini açtım.';
      case 'back': this.back&&this.back(); return 'Uzaya döndüm.';
      case 'git_push': if(!inProj) return 'Push için bir projeye girmem gerek.'; this.gitPush&&this.gitPush(); return 'Push ediyorum.';
      case 'git_pull': if(!inProj) return 'Pull için bir projeye girmem gerek.'; this.gitPull&&this.gitPull(); return 'Pull ediyorum.';
      case 'git_commit': if(!inProj) return 'Commit için bir projeye girmem gerek.'; if(arg){ this.setState({gitMsg:arg}); this.gitCommit(); return 'Commit deniyorum: “'+arg+'”.'; } this._setLeftTab('git'); return 'Git sekmesini açtım — mesajı yazıp Commit’e bas.';
      case 'run': if(!inProj) return 'Terminal için bir projeye girmem gerek.'; this._asstRunBash(arg); return null;
      case 'open_folder': try{ const p=this.sel; if(p&&p._path&&window.galaxy.openFolder){ const r=window.galaxy.openFolder(p._path); if(r&&r.then) r.then(x=>{ if(x&&x.ok===false) this._asstReply(this._failIpc(x,'Klasör açılamadı')); }); } else return 'Klasör açılamadı.'; }catch(e){ return 'Klasör açılamadı.'; } return 'Klasörü açmayı deniyorum.';
      case 'open_terminal': try{ if(this.sel&&this.sel._path&&window.galaxy.openTerminal){ const r=window.galaxy.openTerminal(this.sel._path); if(r&&r.then) r.then(x=>{ if(x&&x.ok===false) this._asstReply(this._failIpc(x,'Terminal açılamadı')); }); } else return 'Terminal için proje yolu yok.'; }catch(e){ return 'Terminal açılamadı.'; } return 'Terminali açmayı deniyorum.';
      case 'open_settings': try{ if(window.galaxy&&window.galaxy.openSettings) window.galaxy.openSettings(); else this.setState({settings:true}); }catch(e){} return 'Ayarları açtım.';
      case 'hud':{ const on=!this.state.hudOpen; this.setState({hudOpen:on}); return on?'Göstergeyi açtım.':'Göstergeyi kapattım.'; }
      case 'tools': this.setState({toolsOpen:true}); return null;
      case 'open_db': this._openTab('db'); if(this.state._pw&&this.state._pw.boundDbId) this.dbSelectConn(this.state._pw.boundDbId); return 'Veritabanını açtım.';
      case 'bind_db': this._bindPlanetDb(); return 'Bu gezegenin .env DB’sini bağlıyorum.';
      case 'compose_up': this._openTab('docker'); this._planetCompose('up'); return (this.state._pw&&this.state._pw.compose&&this.state._pw.compose.project)?(this.state._pw.compose.project+' compose up.'):'Compose up.';
      case 'compose_down': this._openTab('docker'); this._planetCompose('down'); return 'Compose down için onay istiyorum.';
      case 'open_port': this._openPlanetPort(arg||((this.state._pw&&(this.state._pw.listening||this.state._pw.ports)||[])[0])); return 'Portu açıyorum.';
      case 'run_script':{ const scripts=(this.state._pw&&this.state._pw.scripts)||[]; const hit=scripts.find(s=>String(s.name).toLowerCase()===String(arg||'').toLowerCase())||scripts[0]; if(!hit) return 'Bu gezegende script yok.'; this._runPlanetScript(hit); return hit.name+' çalışıyor.'; }
      case 'git_pr': this._planetPrCreate(); return 'PR açıyorum.';
    }
    return null; }
  async assistantHandle(text){ text=String(text||'').trim(); if(!text) return; const A=this._asst; if(!A) return;
    if(this._asstWakeRe().test(this._asstFold(text))){
      const rest=this._asstStripWake(text);
      if(!rest){ this._asstActivateFromWake(''); return; }
      text=rest;
    }
    if(A._handleAt && A._handleText===this._asstFold(text) && Date.now()-A._handleAt<2500) return;
    A._handleAt=Date.now(); A._handleText=this._asstFold(text);
    if(!A.open && !A._userHid) this._asstOpen();
    this._asstSay('user',text); this._asstPersist('user',text);
    // nazik kalıpları temizle → eşleşme kolaylaşsın
    let n=this._asstFold(text).replace(/\b(lütfen|acaba|rica etsem|benim için|bir|misin|mısın|musun|müsün|mısınız|abi|dostum|kanka|hadi)\b/g,' ').replace(/\s{2,}/g,' ').trim();
    // 1) uzaya dön
    if(/^(uzaya (dön|git)|geri dön|ana ekran|galaksiye dön|geri$|çık$)/.test(n)){ return this._asstReply(this._asstDoAction('back')); }
    // 2) evren aç  (ör: "papilon evrenini aç")
    let um=n.match(/(.+?)\s*evren(?:ini|ine|i)?\s*(aç|geç|git|göster)?$/) || n.match(/^evren(?:i)?\s*(aç|değiştir)\s*(.+)$/);
    if(um){ const q=(um[1]&&!/^(aç|geç|git|göster|değiştir)$/.test(um[1])?um[1]:um[2]||'')||''; const r=this._asstDoAction('open_universe',q); if(r) return this._asstReply(r); }
    // 3) sekmeler + git merkezi + hud
    const tabId=this._asstTabId(n);
    if(tabId && /(aç|göster|geç|git|bak|sekme)/.test(n)){ return this._asstReply(this._asstDoAction('open_tab',tabId)); }
    if(/(git (merkezi|merkezini|sekmesi)|git.?i aç|git.?e (bak|geç))/.test(n)){ return this._asstReply(this._asstDoAction('open_git')); }
    if(/(hud|gösterge).*(aç|kapat|göster)|(aç|kapat|göster).*(hud|gösterge)/.test(n)){ return this._asstReply(this._asstDoAction('hud')||'Göstergeyi değiştirdim.'); }
    if(/(posta brif|mail brif|brifing gönder|mail_brief)/.test(n)){ return this._asstReply(this._asstDoAction('mail_brief')); }
    if(/(döngüyü? çalıştır|dongu calistir|loop run)/.test(n)){ this._openTab('dongu'); this._loopRunAll(); return this._asstReply('Döngüyü koşturuyorum.'); }
    // 4) git (yalnız git bağlamında — "gönder/çek" sohbeti push/pull olmasın)
    if((/\bgit\b/.test(n) && /\b(push|gönder)\b/.test(n)) || /\bpush et\b/.test(n)){ return this._asstReply(this._asstDoAction('git_push')); }
    if((/\bgit\b/.test(n) && /\b(pull|çek|cek)\b/.test(n)) || /\bpull et\b/.test(n)){ return this._asstReply(this._asstDoAction('git_pull')); }
    if(/\bcommit\b/.test(n)){ const msg=text.replace(/.*commit\s*(et|le|leyelim)?\s*:?/i,'').trim(); return this._asstReply(this._asstDoAction('git_commit',msg)); }
    if(/\bgit\b/.test(n) && /(durum|status|ne durumda)/.test(n) && this._inPlanet()){ this._setLeftTab('git'); const g=this.state._git; return this._asstReply(((g&&g.branch)||'?')+' dalındasın, '+((g&&g.dirty)||0)+' bekleyen değişiklik var.'); }
    // 5) klasör / terminal / ayarlar
    if(/(klasör|finder).*(aç|göster)|(aç|göster).*(klasör|finder)/.test(n)&&this._inPlanet()){ return this._asstReply(this._asstDoAction('open_folder')); }
    if(/(gerçek |sistem )?terminal.*(aç)|(aç).*terminal/.test(n)&&this._inPlanet()){ return this._asstReply(this._asstDoAction('open_terminal')); }
    if(/(ayarlar|settings).*(aç|göster)|(aç).*ayarlar/.test(n)){ return this._asstReply(this._asstDoAction('open_settings')); }
    if(/(compose.*(up|kaldır|başlat)|docker.?compose.*(aç|başlat)|aşağı çek|compose down)/.test(n)){
      if(/down|kapat|durdur/.test(n)) return this._asstReply(this._asstDoAction('compose_down'));
      return this._asstReply(this._asstDoAction('compose_up'));
    }
    if(/(veritabanını? bağla|db bağla|env.?den db)/.test(n)){ return this._asstReply(this._asstDoAction('bind_db')); }
    if(/(localhost|tarayıcıda aç|portu aç|siteyi aç)/.test(n)){ const pm=n.match(/(\d{2,5})/); return this._asstReply(this._asstDoAction('open_port', pm?pm[1]:'')); }
    if(/(pr aç|pull request|github pr)/.test(n)){ return this._asstReply(this._asstDoAction('git_pr')); }
    if(/(npm run|script çalış|dev başlat|test çalıştır)/.test(n)){ const sm=n.match(/npm run\s+(\S+)/)||n.match(/\b(dev|test|lint|build|start|migrate|seed)\b/); return this._asstReply(this._asstDoAction('run_script', sm?sm[1]:'')); }
    // 6) terminal komutu
    const shM=text.match(/^(?:terminalde|bash(?:'?te)?|komut(?:u)?|çalıştır|run|shell)\s*:?\s+(.+)$/i);
    if(shM){ if(!this._inPlanet()) return this._asstReply('Terminal komutu için önce bir projeye girmem gerek — hangi projede?'); return this._asstRunBash(shM[1].trim()); }
    // 7) evren/projeye git  (ör: "papilon tarafına gir", "core sdk projesine git")
    const navM=n.match(/^(.*?)\s*(projesine|gezegenine|adli projeye|projesi|gezegeni|projeye|tarafina|yanina|evrenine|evrenini)?\s*(git|ac|aç|geç|gir|gidelim|gotur|götür|dal|in)$/);
    if(navM){ const q=(navM[1]||'').replace(/\b(projesine|gezegenine|projesi|gezegeni|adli|projeye|proje|tarafina|yanina|evren(?:ini|ine|i)?)\b/g,'').trim();
      if(q){ const u=this._asstFindUni(q); if(u) return this._asstReply(this._asstDoAction('open_universe',u.name));
        const p=this._asstFindProject(q); if(p) return this._asstReply(this._asstDoAction('open_project',p.name)); } }
    if(/(git|ac|aç|geç|gir|in|tarafina|gezegen|proje|evren)/.test(n)){
      const q=n.replace(/\b(tarafina|yanina|projesine|gezegenine|evren(?:ini|ine|i)?|projesi|gezegeni|adli|projeye|proje|git|ac|aç|geç|gir|gidelim|gotur|götür|dal|in)\b/g,' ').replace(/\s+/g,' ').trim();
      if(q.length>=3){ const u=this._asstFindUni(q); if(u) return this._asstReply(this._asstDoAction('open_universe',u.name));
        const p=this._asstFindProject(q); if(p) return this._asstReply(this._asstDoAction('open_project',p.name)); } }
    // 8) yardım
    if(/(ne yapabilirsin|neler yapabilir|yeteneğin|komutlar)/.test(n)){ return this._asstReply('Uygulamanın içinde iş görürüm: evren/proje, sekme, git, PR, compose up/down, DB bağla, localhost port, script (dev/test). Söyle, yapayım.'); }
    // 8b) günlük brifing / durum raporu
    if(/(brifing|brifin|durum raporu|günün özeti|projelerin? özeti|nereye odaklan|bugün ne var)/.test(n)){ return this._asstBrief(true); }
    // 9) varsayılan → dijital ikiz (sohbet + gerekiyorsa aksiyon komutu üretir)
    return this._asstAskClaude(text);
  }
  async _asstRunBash(cmd){ const p=this.sel; if(!p||!p._path) return; const sid='asst-sh-'+(p.id||''); this._asstSetState('working');
    this._asstSay('assistant','▮ '+cmd,{speak:false}); this._asstReply('Terminalde çalıştırıyorum: '+cmd);
    try{
      if(window.galaxy&&window.galaxy.shellStart){ const a=await window.galaxy.shellStart({shellId:sid,cwd:p._path}); if(a&&a.ok===false){ this._asstSetState('idle'); this._asstReply(this._failIpc(a,'Terminal başlatılamadı')); return; } }
      if(window.galaxy&&window.galaxy.shellInput){ const b=await window.galaxy.shellInput({shellId:sid,cwd:p._path,cmd}); if(b&&b.ok===false){ this._asstSetState('idle'); this._asstReply(this._failIpc(b,'Komut gönderilemedi')); } }
    }catch(e){ this._asstSetState('idle'); this._asstReply('Terminal komutu başarısız.'); } }
  _asstShellMsg(m){ const A=this._asst; if(!A) return; if(!m) return;
    if(m.kind==='out'||m.kind==='err'){ const line=String(m.text||''); if(line){ A._shBuf=(A._shBuf||''); A._shBuf+=(A._shBuf?'\n':'')+line; if(A._shRow){ A._shRow.text=A._shBuf.slice(-1400); this._asstFlush(); } else { A._shRow=this._asstSay('assistant',A._shBuf.slice(-1400),{speak:false,mono:true}); } } }
    else if(m.kind==='done'||m.kind==='exit'){ this._asstSetState('idle'); const done=A._shBuf?('bitti.'):'komut çalıştı.'; A._shBuf=''; A._shRow=null; this._asstReply('Komut '+done); } }
  // Dijital ikiz: her yerde sohbet eder (proje şart değil). Projedeyken dosya/terminal işi de yapabilir.
  async _asstAskClaude(text){ const p=this.sel; const A=this._asst; const inProj=this._inPlanet();
    if(!(window.galaxy&&window.galaxy.assistantRun)){ return this._asstReply('Şu an düşünebilmem için Claude kurulumuna ihtiyacım var. Terminalde: npm install -g @anthropic-ai/claude-code'); }
    this._asstSetState('working'); this._asstPauseListen();
    const key=inProj?('p:'+p.id):'chat'; const cwd=inProj?p._path:null;
    const runId='asst-'+key.replace(/[^a-z0-9]/gi,'')+'-'+(++A.cc);
    this._asstClaudeSess=this._asstClaudeSess||{}; const cont=!!this._asstClaudeSess[key]; this._asstClaudeSess[key]=true;
    A._clRaw=''; A._clRow=null; A._clRun=runId; A._clActN=0;
    try{ const r=await window.galaxy.assistantRun({runId,cwd,prompt:text,continueSession:cont,ctx:this._asstCtx()});
      if(r&&r.ok===false){ this._asstSetState('idle'); this._asstReply(this._friendlyFail(r,'Şu an yanıt veremedim.','claude')); } }
    catch(e){ this._asstSetState('idle'); this._friendlyFail({error:'claude'},'Şu an yanıt veremedim.','claude'); this._asstReply('Bir şeyler ters gitti, tekrar dener misin?'); } }
  // Akıştan gizli [[ACT ...]] komutlarını ayıkla + çalıştır, gerisini temiz gösterip oku (token token akış).
  _asstActDisplay(raw){ return String(raw||'').replace(/\[\[ACT[^\]]*\]\]/g,'').replace(/\[\[[^\]]*$/,'').replace(/\s{2,}/g,' ').trimStart(); }
  _asstRunActions(){ const A=this._asst; const re=/\[\[ACT\s+([a-z_]+)(?:\|([^\]]*))?\]\]/gi; let m,i=0; const raw=A._clRaw||'';
    while((m=re.exec(raw))){ i++; if(i>A._clActN){ A._clActN=i; try{ this._asstDoAction(String(m[1]||'').toLowerCase().trim(), (m[2]||'').trim()); }catch(e){} } } }
  _asstClaudeMsg(m){ const A=this._asst; if(!A||!m) return;
    const push=(t)=>{ A._clRaw=(A._clRaw||'')+t; this._asstRunActions(); const disp=this._asstActDisplay(A._clRaw); if(disp){ if(A._clRow){ A._clRow.text=disp; this._asstFlush(); } else { A._clRow=this._asstSay('assistant',disp,{speak:false}); } } if(A.state!=='speaking') this._asstSetState('working'); this._asstScroll(); };
    if(m.kind==='text'||m.kind==='data'){ const t=String(m.text||''); if(t) push(t); }
    else if(m.kind==='result'){ if(!((A._clRaw||'').trim()) && m.text) push(String(m.text)); }
    else if(m.kind==='tool'||m.kind==='info'||m.kind==='raw'){ /* sessiz */ }
    else if(m.kind==='err'){ const t=String(m.text||'').trim(); if(t){ this._asstSetState('idle'); this._asstReply('Şununla takıldım: '+t.slice(0,180)); A._clRaw=''; A._clRow=null; } }
    else if(m.kind==='done'){ if(String(A._clRun||'').indexOf('asst-brief-')===0){ try{ if(this._briefPendingDate) localStorage.setItem('gxBriefDate',this._briefPendingDate); }catch(e){} this._briefPendingDate=null; } const disp=this._asstActDisplay(A._clRaw||'').trim(); A._clRaw=''; A._clRow=null; this._asstSetState('idle'); this._stampAgentPulse(false); if(disp) this._asstPersist('assistant',disp); if(disp && A.speak) this._asstSpeak(disp); else this._asstResumeListen(); } }

  _waitThree(t){ if((this._uiTheme||'apex')==='apex'){ this._initBg(); return; } if(window.THREE){ this._initBg(); return; } if(t>80) return; setTimeout(()=>this._waitThree(t+1),60); }
  _initBg(){
    const canvas=document.getElementById('bgGalaxy'); if(!canvas) return;
    // Apex / Özet: Three.js spiral yok — #bgApex ızgarası. Canvas gizle, RAF başlatma.
    if((this._uiTheme||'apex')==='apex'){
      try{ canvas.style.visibility='hidden'; }catch(e){}
      if(this._raf){ try{ cancelAnimationFrame(this._raf); }catch(e){} this._raf=null; }
      return;
    }
    const THREE=window.THREE;
    const renderer=new THREE.WebGLRenderer({canvas,antialias:true,alpha:true});
    renderer.setPixelRatio(Math.min(window.devicePixelRatio,2));
    const scene=new THREE.Scene();
    const camera=new THREE.PerspectiveCamera(60,1,0.1,100); camera.position.set(0,3,7); camera.lookAt(0,0,0);
    const group=new THREE.Group(); scene.add(group);
    const COUNT=12000,ARMS=4,R=6.4;
    const pos=new Float32Array(COUNT*3),col=new Float32Array(COUNT*3);
    const cIn=new THREE.Color('#fffce8'),cMid=new THREE.Color('#4fe0ff'),cOut=new THREE.Color('#c77bff');
    for(let i=0;i<COUNT;i++){const r=Math.pow(Math.random(),0.7)*R;const arm=(i%ARMS)/ARMS*Math.PI*2;const a=arm+r*0.8;const sp=(Math.random()-0.5)*(0.4+r*0.12);
      pos[i*3]=Math.cos(a)*r+sp;pos[i*3+1]=(Math.random()-0.5)*(0.22+(R-r)*0.04);pos[i*3+2]=Math.sin(a)*r+sp;
      const tt=r/R;const c=tt<0.5?cIn.clone().lerp(cMid,tt*2):cMid.clone().lerp(cOut,(tt-0.5)*2);col[i*3]=c.r;col[i*3+1]=c.g;col[i*3+2]=c.b;}
    const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.BufferAttribute(pos,3));g.setAttribute('color',new THREE.BufferAttribute(col,3));
    group.add(new THREE.Points(g,new THREE.PointsMaterial({size:0.09,sizeAttenuation:true,vertexColors:true,transparent:true,opacity:0.88,blending:THREE.AdditiveBlending,depthWrite:false})));
    const sc2=2800,sp2=new Float32Array(sc2*3);for(let i=0;i<sc2;i++){sp2[i*3]=(Math.random()-0.5)*80;sp2[i*3+1]=(Math.random()-0.5)*80;sp2[i*3+2]=(Math.random()-0.5)*80;}
    const sg=new THREE.BufferGeometry();sg.setAttribute('position',new THREE.BufferAttribute(sp2,3));
    scene.add(new THREE.Points(sg,new THREE.PointsMaterial({size:0.14,color:'#e8f4ff',transparent:true,opacity:0.72,depthWrite:false})));
    const sun=new THREE.Mesh(new THREE.SphereGeometry(0.28,28,28), new THREE.MeshBasicMaterial({color:'#ffc14a'}));
    sun.position.set(0,0,0); scene.add(sun);
    group.rotation.x=0.78;
    const resize=()=>{const w=window.innerWidth,h=window.innerHeight;renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix();};
    this._onResize=resize;window.addEventListener('resize',resize);resize();
    const loop=()=>{this._raf=requestAnimationFrame(loop); if(this._reduced()) return; group.rotation.y+=0.00018; renderer.render(scene,camera);};loop();
  }

