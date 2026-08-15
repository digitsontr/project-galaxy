/*
 * Project Galaxy — HUD katmanı (v2)
 * ─────────────────────────────────
 * Derlenmiş arayüzün (index.html) ÜZERİNE eklenen bağımsız katman:
 *   1. Gerçek evren görünümü: prosedürel nebula bulutları, spiral galaksiler,
 *      parlak yıldızlar (screen-blend, tıklamaları engellemez)
 *   2. Alt dock — her zaman görünür alt-orta ok düğmesiyle açılıp kapanır:
 *      ROKET  EN AKTİF YILDIZ · son 30 gün git aktivitesine göre
 *      SAAT   SON YAPILANLAR  · günlüğe işlenen son işler + rapor arşivi
 *      KALEM  NOTLARIM        · hızlı notlar + buradan yeni not ekleme
 * Yalnızca preload'daki resmi window.galaxy API'sini kullanır; uygulama
 * koduna dokunmaz. index.html yeniden üretilirse dosyanın sonundaki
 * <script src="galaxy-hud.js"></script> satırını korumak yeterlidir.
 */
(function () {
  'use strict';
  if (window.__GALAXY_HUD__) return;
  window.__GALAXY_HUD__ = true;

  // ── AÇILIŞ FLASH'INI ÖNLE ──────────────────────────────────────────────
  // galaxy-hud.js index.html'in EN SONUNDA yüklenir; senkron çalışır (henüz ilk
  // paint olmadan). React eski "dev-gezegen seçici"yi çizmeden ekranı kaplayan
  // opak bir katman koyarız; overview hazır olunca (ya da güvenlik zaman aşımıyla)
  // kaldırılır. Böylece "önce eski hali gelir sonra yeni" flash'ı olmaz.
  try {
    const b = document.createElement('div');
    b.id = 'ghud-boot';
    b.style.cssText = 'position:fixed;inset:0;z-index:10040;background:'
      + 'radial-gradient(120% 88% at 50% -8%, rgba(20,26,54,.5), #04060c 62%), #04060c;';
    (document.body || document.documentElement).appendChild(b);
    setTimeout(function () { try { ovBootDone(); } catch (e) {} }, 5000);
  } catch (e) {}

  /* ================= 0. MODERN İKON SETİ (inline SVG) ================= */

  function svg(path, vb) {
    return '<svg viewBox="' + (vb || '0 0 24 24') + '" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + path + '</svg>';
  }
  const I = {
    rocket: svg('<path d="M4.5 16.5c-1.5 1.3-2 5-2 5s3.7-.5 5-2c.7-.8.7-2 0-2.8-.7-.7-2.2-.8-3 0z"/><path d="M12 15l-3-3c.5-1.3 1.2-2.6 2-3.8C13.5 4.5 17 2.7 21.3 2.7c0 4.3-1.8 7.8-5.5 10.3-1.2.8-2.5 1.5-3.8 2z"/><path d="M9 12H4.8c0-2 1.2-3.7 3-4.5L9 12zM12 15v4.2c2-.1 3.7-1.2 4.5-3L12 15z"/><circle cx="15.5" cy="8.5" r="1.4"/>'),
    chevUp: svg('<path d="M6 15l6-6 6 6"/>'),
    clock: svg('<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3.5 2"/>'),
    pencil: svg('<path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7.5 18.5 3 20l1.5-4.5 12-12z"/>'),
    folder: svg('<path d="M3 8a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8z"/>'),
    branch: svg('<circle cx="6" cy="5" r="2.2"/><circle cx="6" cy="19" r="2.2"/><circle cx="18" cy="7" r="2.2"/><path d="M6 7.2v9.6"/><path d="M18 9.2c-.3 3.6-3.5 5-8.4 5.2"/>'),
    doc: svg('<path d="M6 2.5h8L20 8.5v13h-14v-19z"/><path d="M14 2.5v6h6"/><path d="M9 13h6M9 17h6"/>'),
    refresh: svg('<path d="M20 12a8 8 0 1 1-2.34-5.66"/><path d="M20 4v4.5h-4.5"/>'),
    close: svg('<path d="M6 6l12 12M18 6L6 18"/>'),
    info: svg('<circle cx="12" cy="12" r="9"/><path d="M12 11v5"/><path d="M12 8h.01"/>'),
    alert: svg('<path d="M12 3l10 17H2L12 3z"/><path d="M12 10v4"/><path d="M12 17.5h.01"/>'),
    gear: svg('<circle cx="12" cy="12" r="3.2"/><path d="M19.4 15a1.7 1.7 0 0 0 .34 1.87l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.7 1.7 0 0 0-1.87-.34 1.7 1.7 0 0 0-1 1.55V21a2 2 0 1 1-4 0v-.09a1.7 1.7 0 0 0-1-1.55 1.7 1.7 0 0 0-1.87.34l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.7 1.7 0 0 0 .34-1.87 1.7 1.7 0 0 0-1.55-1H3a2 2 0 1 1 0-4h.09a1.7 1.7 0 0 0 1.55-1 1.7 1.7 0 0 0-.34-1.87l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.7 1.7 0 0 0 1.87.34h.09a1.7 1.7 0 0 0 1-1.55V3a2 2 0 1 1 4 0v.09a1.7 1.7 0 0 0 1 1.55 1.7 1.7 0 0 0 1.87-.34l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.7 1.7 0 0 0-.34 1.87v.09a1.7 1.7 0 0 0 1.55 1H21a2 2 0 1 1 0 4h-.09a1.7 1.7 0 0 0-1.55 1z"/>'),
    search: svg('<circle cx="11" cy="11" r="7"/><path d="M20 20l-4-4"/>'),
    archive: svg('<path d="M3 5h18v4H3z"/><path d="M5 9v11h14V9"/><path d="M10 13h4"/>'),
    book: svg('<path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20V3H6.5A2.5 2.5 0 0 0 4 5.5v14z"/><path d="M4 19.5A2.5 2.5 0 0 0 6.5 22H20v-5"/>'),
    // docker merkezi
    play: svg('<path d="M7 4.5l12 7.5-12 7.5z"/>'),
    stop: svg('<rect x="6" y="6" width="12" height="12" rx="2"/>'),
    pause: svg('<path d="M9 5v14M15 5v14"/>'),
    trash: svg('<path d="M4 7h16"/><path d="M9 7V5h6v2"/><path d="M6 7l1 13h10l1-13"/><path d="M10 11v6M14 11v6"/>'),
    terminal: svg('<rect x="2.5" y="4" width="19" height="16" rx="2"/><path d="M7 9l3 3-3 3"/><path d="M13 15h4"/>'),
    layers: svg('<path d="M12 3l9 5-9 5-9-5 9-5z"/><path d="M3 13l9 5 9-5"/>'),
    box: svg('<path d="M12 3l8 4.5v9L12 21l-8-4.5v-9L12 3z"/><path d="M4 7.5l8 4.5 8-4.5"/><path d="M12 12v9"/>'),
    ext: svg('<path d="M14 4h6v6"/><path d="M20 4l-9 9"/><path d="M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5"/>'),
    broom: svg('<path d="M14 3l7 7"/><path d="M12.5 5.5l6 6-6.5 6.5a4 4 0 0 1-5.7 0l-.3-.3a4 4 0 0 1 0-5.7z"/><path d="M4 20l2-2"/>'),
    // sunucu merkezi
    server: svg('<rect x="3" y="4" width="18" height="7" rx="1.5"/><rect x="3" y="13" width="18" height="7" rx="1.5"/><path d="M7 7.5h.01M7 16.5h.01"/>'),
    plug: svg('<path d="M9 2v6M15 2v6"/><path d="M7 8h10v3a5 5 0 0 1-10 0z"/><path d="M12 16v6"/>'),
    edit2: svg('<path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7.5 18.5 3 20l1.5-4.5 12-12z"/>'),
    plus: svg('<path d="M12 5v14M5 12h14"/>'),
    check: svg('<path d="M4 12l5 5L20 6"/>')
  };
  // Gezegen küçük görseli (mockup'taki kart thumbnail'i tarzında)
  function planetThumb(hue) {
    return '<svg viewBox="0 0 72 72" aria-hidden="true">' +
      '<defs><radialGradient id="ghp' + hue + '" cx="36%" cy="32%" r="75%">' +
      '<stop offset="0%" stop-color="hsl(' + hue + ',85%,72%)"/>' +
      '<stop offset="55%" stop-color="hsl(' + (hue + 24) + ',70%,45%)"/>' +
      '<stop offset="100%" stop-color="hsl(' + (hue + 40) + ',65%,22%)"/></radialGradient></defs>' +
      '<ellipse cx="36" cy="38" rx="30" ry="9" fill="none" stroke="hsla(' + (hue + 30) + ',80%,75%,.45)" stroke-width="2.4" transform="rotate(-16 36 38)"/>' +
      '<circle cx="36" cy="36" r="17" fill="url(#ghp' + hue + ')"/>' +
      '<ellipse cx="36" cy="38" rx="30" ry="9" fill="none" stroke="hsla(' + (hue + 30) + ',85%,82%,.85)" stroke-width="2.4" transform="rotate(-16 36 38)" stroke-dasharray="44 60" stroke-dashoffset="-8"/>' +
      '<circle cx="30" cy="30" r="4.5" fill="hsla(0,0%,100%,.18)"/></svg>';
  }

  /* ================= 0.5 GÖRSEL VARLIKLAR (docs/ sunumundan) ================= */
  // Tanıtım sunumundaki (Project_Galaxy_Mission_Control.pdf) infografikler
  // uygulamanın içine taşındı: rehber ekranları, ajan kartları ve git akışı
  // bu görsellerle aynı dili konuşur.
  const AST = 'assets/guide/';
  const IMG = {
    kapak: AST + 'hero-kapak.jpg',
    neden: AST + 'eski-yeni.jpg',
    terim: AST + 'terminoloji.jpg',
    uzay: AST + 'uzay-anatomi.jpg',
    gezegen: AST + 'gezegen-anatomi.jpg',
    hudgit: AST + 'hud-git-merkezi.jpg',
    crew: AST + 'gorev-murettebati.jpg',
    akis: AST + 'ajan-akisi.jpg',
    dongu: AST + 'readme-dongusu.jpg',
    guvenlik: AST + 'mimari-guvenlik.jpg',
    kisayol: AST + 'kisayol-haritasi.jpg',
    kurulum: AST + 'kurulum.jpg'
  };
  // Kurulu 5 ajanın sunumdaki portre kartları (id → görsel)
  const CREW_IDS = ['cto', 'navigator', 'documentor', 'forge', 'mentor'];
  const crewCard = id => AST + 'crew-' + id + '.jpg';
  const isCrew = id => CREW_IDS.indexOf(id) >= 0;
  // Özel ajanlar (portresi olmayan) için isim baş harfi → monogram rozeti
  const crewInit = a => (((a && a.name) || '?').trim()[0] || '?').toUpperCase();

  /* ================= 1. NEBULA ARKA PLANI ================= */

  function buildNebula() {
    const c = document.createElement('canvas');
    c.id = 'ghud-neb';
    const W = Math.ceil(innerWidth * 1.25), H = Math.ceil(innerHeight * 1.25);
    c.width = W; c.height = H;
    c.style.cssText = [
      'position:fixed', 'top:-12.5vh', 'left:-12.5vw',
      'width:125vw', 'height:125vh', 'z-index:2',
      'pointer-events:none', 'mix-blend-mode:screen', 'opacity:.55',
      'animation:ghudDrift 240s ease-in-out infinite alternate'
    ].join(';');
    const x = c.getContext('2d');

    const PALETTES = [
      ['rgba(96,60,220,', 'rgba(140,60,200,'],
      ['rgba(30,90,220,', 'rgba(40,140,255,'],
      ['rgba(20,160,190,', 'rgba(60,220,255,'],
      ['rgba(200,50,140,', 'rgba(255,80,160,'],
      ['rgba(220,120,40,', 'rgba(255,170,80,']
    ];
    const rnd = mulberry32(20260717);
    x.filter = 'blur(' + Math.round(W / 34) + 'px)';
    for (let ci = 0; ci < 5; ci++) {
      const cx = W * (0.12 + rnd() * 0.76), cy = H * (0.1 + rnd() * 0.8);
      const pal = PALETTES[ci % PALETTES.length];
      const blobs = 7 + Math.floor(rnd() * 6);
      for (let i = 0; i < blobs; i++) {
        const bx = cx + (rnd() - 0.5) * W * 0.22;
        const by = cy + (rnd() - 0.5) * H * 0.2;
        const r = W * (0.03 + rnd() * 0.085);
        const g = x.createRadialGradient(bx, by, 0, bx, by, r);
        g.addColorStop(0, pal[i % 2] + (0.05 + rnd() * 0.10) + ')');
        g.addColorStop(1, 'rgba(0,0,0,0)');
        x.fillStyle = g;
        x.beginPath(); x.arc(bx, by, r, 0, 7); x.fill();
      }
    }
    x.filter = 'none';
    drawGalaxy(x, W * 0.82, H * 0.16, W * 0.055, -0.5, rnd);
    drawGalaxy(x, W * 0.13, H * 0.72, W * 0.034, 0.9, rnd);
    for (let i = 0; i < 14; i++) {
      flareStar(x, rnd() * W, rnd() * H, 0.6 + rnd() * 1.8, [200, 210, 45, 300][Math.floor(rnd() * 4)]);
    }
    for (let i = 0; i < 420; i++) {
      x.globalAlpha = 0.04 + rnd() * 0.22;
      x.fillStyle = '#cfe0ff';
      x.fillRect(rnd() * W, rnd() * H, 1, 1);
    }
    x.globalAlpha = 1;
    return c;
  }

  function drawGalaxy(x, gx, gy, R, rot, rnd) {
    x.save();
    x.translate(gx, gy); x.rotate(rot); x.scale(1, 0.42);
    let g = x.createRadialGradient(0, 0, 0, 0, 0, R * 2.1);
    g.addColorStop(0, 'rgba(200,215,255,0.16)');
    g.addColorStop(0.4, 'rgba(140,150,255,0.07)');
    g.addColorStop(1, 'rgba(0,0,0,0)');
    x.fillStyle = g;
    x.beginPath(); x.arc(0, 0, R * 2.1, 0, 7); x.fill();
    for (let i = 0; i < 340; i++) {
      const t = rnd() * 4.4 + 0.35;
      const arm = rnd() < 0.5 ? 0 : Math.PI;
      const a = t * 1.9 + arm + (rnd() - 0.5) * 0.5;
      const r = R * 0.22 * t * (0.85 + rnd() * 0.3);
      x.globalAlpha = Math.max(0.03, 0.26 - t * 0.05) * (0.5 + rnd() * 0.5);
      x.fillStyle = rnd() < 0.16 ? '#ffd9b8' : '#dfe8ff';
      x.fillRect(Math.cos(a) * r, Math.sin(a) * r, 1.6, 1.6);
    }
    x.globalAlpha = 1;
    g = x.createRadialGradient(0, 0, 0, 0, 0, R * 0.5);
    g.addColorStop(0, 'rgba(255,240,215,0.75)');
    g.addColorStop(0.35, 'rgba(255,215,170,0.28)');
    g.addColorStop(1, 'rgba(0,0,0,0)');
    x.fillStyle = g;
    x.beginPath(); x.arc(0, 0, R * 0.5, 0, 7); x.fill();
    x.restore();
  }

  function flareStar(x, sx, sy, s, hue) {
    const core = 'hsla(' + hue + ',80%,88%,';
    const g = x.createRadialGradient(sx, sy, 0, sx, sy, s * 7);
    g.addColorStop(0, core + '0.85)');
    g.addColorStop(0.25, core + '0.18)');
    g.addColorStop(1, 'rgba(0,0,0,0)');
    x.fillStyle = g;
    x.beginPath(); x.arc(sx, sy, s * 7, 0, 7); x.fill();
    x.strokeStyle = core + '0.30)';
    x.lineWidth = Math.max(0.6, s * 0.25);
    x.beginPath();
    x.moveTo(sx - s * 11, sy); x.lineTo(sx + s * 11, sy);
    x.moveTo(sx, sy - s * 11); x.lineTo(sx, sy + s * 11);
    x.stroke();
  }

  function mulberry32(a) {
    return function () {
      a |= 0; a = a + 0x6D2B79F5 | 0;
      let t = Math.imul(a ^ a >>> 15, 1 | a);
      t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  }

  /* ================= 2. STİL ================= */

  const CSS = `
  @keyframes ghudDrift { from { transform: translate(0,0) scale(1); } to { transform: translate(-3.5vw,-2.5vh) scale(1.05); } }
  @keyframes ghudIn { from { opacity:0; transform: translateY(16px); } to { opacity:1; transform:none; } }
  #ghud-dock, #ghud-pop, #ghud-tab, #ghud-pal, #ghud-lb {
    font-family: 'Space Grotesk', -apple-system, sans-serif;
    --gh-cy:#5fe0ff; --gh-vio:#8b7bff; --gh-mag:#ff7bd8;
    /* --gh-faint: #55608a idi; 9px etiketlerde koyu panelde kontrast ~2.4:1 ile düşüktü.
       #667298'e açıldı (~3.5:1) — hâlâ "faint" ama küçük metinde belirgin okunur. */
    --gh-ink:#eaf0ff; --gh-dim:#93a0c8; --gh-faint:#667298;
    /* semantik durum renkleri (yeşil=onay, amber=uyarı, kırmızı=tehlike) */
    --gh-ok:#7bd88f; --gh-warn:#ffd166; --gh-danger:#ff8b8b;
    --gh-panel: linear-gradient(165deg, rgba(17,24,52,.94), rgba(8,12,30,.96));
    --gh-line: rgba(125,165,255,.20);
  }
  #ghud-dock svg, #ghud-pop svg, #ghud-tab svg { display:block; }
  .ghud-mono { font-family: 'JetBrains Mono', Menlo, monospace; }

  /* — her zaman görünür alt-orta aç/kapa sekmesi — */
  #ghud-tab {
    position:fixed; left:50%; bottom:0; transform:translateX(-50%); z-index:9999;
    display:flex; align-items:center; gap:9px;
    background:var(--gh-panel); border:1px solid var(--gh-line); border-bottom:none;
    border-radius:14px 14px 0 0; padding:7px 20px 6px;
    color:var(--gh-cy); cursor:pointer; user-select:none;
    font-size:10px; letter-spacing:.3em;
    box-shadow:0 -6px 26px rgba(0,0,0,.45);
    transition:padding .15s, color .15s, border-color .15s, bottom .22s ease;
  }
  #ghud-tab:hover { border-color:rgba(95,224,255,.55); box-shadow:0 -6px 26px rgba(0,0,0,.45), 0 0 20px rgba(95,224,255,.15); }
  #ghud-tab .ric { width:17px; height:17px; color:var(--gh-vio); }
  #ghud-tab .chev { width:15px; height:15px; transition:transform .25s ease; }
  #ghud-tab.open .chev { transform:rotate(180deg); }
  #ghud-tab.open { bottom:158px; }
  @media (max-width: 980px) { #ghud-tab.open { bottom:0; } #ghud-dock.open { padding-bottom:38px; } }

  /* — dock — */
  #ghud-dock {
    position:fixed; left:16px; right:16px; bottom:0; z-index:9998;
    display:none; gap:12px; padding:0 0 12px;
    animation:ghudIn .22s ease;
  }
  #ghud-dock.open { display:flex; }
  .ghud-card {
    flex:1 1 0; min-width:0; height:146px; overflow:hidden;
    background:var(--gh-panel);
    border:1px solid var(--gh-line); border-radius:14px;
    padding:13px 16px; color:var(--gh-ink);
    backdrop-filter: blur(12px); box-shadow:0 10px 34px rgba(0,0,0,.5);
    transition:border-color .15s, box-shadow .15s;
    display:flex; flex-direction:column;
  }
  .ghud-card:hover { border-color:rgba(95,224,255,.45); box-shadow:0 10px 34px rgba(0,0,0,.5), 0 0 24px rgba(95,224,255,.08); }
  .ghud-card.hero { border-color:rgba(139,123,255,.42); }
  .ghud-h { display:flex; align-items:center; gap:8px; margin-bottom:9px; flex:none; }
  .ghud-h .hic { width:15px; height:15px; color:var(--gh-cy); flex:none; }
  .ghud-card.hero .ghud-h .hic { color:var(--gh-vio); }
  .ghud-t { font-size:9.5px; letter-spacing:.26em; color:var(--gh-dim); flex:1; }
  .ghud-a { width:26px; height:26px; display:flex; align-items:center; justify-content:center;
    border:1px solid transparent; border-radius:8px; color:var(--gh-faint); cursor:pointer; flex:none; }
  .ghud-a svg { width:14px; height:14px; }
  .ghud-a:hover { color:var(--gh-cy); border-color:var(--gh-line); background:rgba(95,224,255,.07); }
  .ghud-a.wtxt { width:auto; padding:0 9px; gap:5px; font-size:9px; letter-spacing:.14em; }
  .ghud-body { flex:1; min-height:0; overflow:hidden; }

  /* hero kart: thumbnail + bilgi (mockup düzeni) */
  .ghud-hero-row { display:flex; gap:14px; align-items:center; height:100%; }
  .ghud-thumb { width:76px; height:76px; flex:none; border-radius:12px;
    background:radial-gradient(120% 120% at 30% 20%, rgba(70,90,180,.35), rgba(6,10,24,.9));
    border:1px solid var(--gh-line); display:flex; align-items:center; justify-content:center; }
  .ghud-thumb svg { width:62px; height:62px; }
  .ghud-hero-info { flex:1; min-width:0; }
  .ghud-star-name { font-size:17px; font-weight:600; letter-spacing:.02em;
    white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
  .ghud-sub { font-size:10.5px; color:var(--gh-dim); margin:2px 0 7px; }
  .ghud-bar { height:5px; border-radius:3px; background:rgba(125,145,255,.14); overflow:hidden; margin-bottom:8px; }
  .ghud-bar > div { height:100%; border-radius:3px; background:linear-gradient(90deg, var(--gh-cy), var(--gh-vio)); }
  .ghud-meta { display:flex; align-items:center; gap:10px; flex-wrap:wrap; }
  .ghud-chip { display:inline-flex; align-items:center; gap:5px; font-size:9.5px; color:var(--gh-dim); }
  .ghud-chip svg { width:12px; height:12px; color:var(--gh-faint); }
  .ghud-chip.warn, .ghud-chip.warn svg { color:var(--gh-warn); }
  .ghud-btn { display:inline-flex; align-items:center; gap:6px; font-size:9.5px; letter-spacing:.16em;
    color:var(--gh-cy); border:1px solid rgba(95,224,255,.4); border-radius:999px; padding:6px 14px;
    cursor:pointer; user-select:none; background:transparent; }
  .ghud-btn svg { width:12px; height:12px; }
  .ghud-btn:hover { background:rgba(95,224,255,.13); border-color:var(--gh-cy); }
  .ghud-btns { display:flex; gap:8px; margin-top:2px; }

  .ghud-li { display:flex; gap:9px; font-size:11.5px; line-height:1.45; padding:4px 0;
    border-bottom:1px solid rgba(125,165,255,.08); }
  .ghud-li:last-child { border-bottom:none; }
  .ghud-li .d { color:var(--gh-faint); font-size:9px; flex:none; padding-top:3px; }
  .ghud-li .x { flex:1; min-width:0; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; color:var(--gh-ink); }
  .ghud-li .p { color:var(--gh-cy); font-size:9px; flex:none; padding-top:3px; max-width:96px;
    overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
  .ghud-empty { color:var(--gh-faint); font-size:11px; padding:6px 0; }
  .ghud-note-in { display:flex; gap:6px; margin-top:7px; flex:none; }
  .ghud-note-in input { flex:1; min-width:0; background:rgba(22,30,66,.65);
    border:1px solid rgba(125,145,255,.28); color:var(--gh-ink); border-radius:999px;
    padding:7px 14px; font-size:11px; outline:none; font-family:inherit; }
  .ghud-note-in input::placeholder { color:var(--gh-faint); }
  .ghud-note-in input:focus { border-color:var(--gh-cy); }

  /* — popover — (artifact .panel-cut notch köşe dili; clip-path box-shadow'u kırptığı
     için gölge drop-shadow filter'a taşındı, böylece kesik köşeyi takip eder) */
  #ghud-pop {
    position:fixed; z-index:10000; left:50%; bottom:186px; transform:translateX(-50%);
    width:min(680px, 90vw); max-height:min(480px, 58vh); display:none; flex-direction:column;
    background:var(--gh-panel); border:1px solid var(--gh-line);
    clip-path:polygon(0 0, calc(100% - 16px) 0, 100% 16px, 100% 100%, 0 100%);
    filter:drop-shadow(0 16px 42px rgba(0,0,0,.6)); animation:ghudIn .18s ease; color:var(--gh-ink);
  }
  #ghud-pop.open { display:flex; }
  #ghud-pop .ph { display:flex; align-items:center; gap:9px;
    padding:12px 16px; border-bottom:1px solid var(--gh-line); }
  #ghud-pop .ph .pic { width:15px; height:15px; color:var(--gh-cy); flex:none; }
  #ghud-pop .ph .t { font-size:10px; letter-spacing:.24em; color:var(--gh-dim); flex:1;
    overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
  #ghud-pop .pb { overflow-y:auto; padding:12px 18px; font-size:12px; line-height:1.6; }
  #ghud-pop .pb::-webkit-scrollbar { width:8px; }
  #ghud-pop .pb::-webkit-scrollbar-thumb { background:rgba(125,165,255,.25); border-radius:4px; }
  .ghud-rep { display:flex; align-items:center; gap:9px; padding:8px 12px;
    border:1px solid rgba(125,165,255,.14); border-radius:9px;
    margin-bottom:7px; cursor:pointer; font-size:11px; color:var(--gh-ink); }
  .ghud-rep svg { width:13px; height:13px; color:var(--gh-faint); flex:none; }
  .ghud-rep:hover { border-color:var(--gh-cy); color:var(--gh-cy); }
  .ghud-rep:hover svg { color:var(--gh-cy); }
  .ghud-md h1,.ghud-md h2,.ghud-md h3 { color:var(--gh-cy); font-size:13px; letter-spacing:.06em; margin:12px 0 6px; }
  .ghud-md p { margin:6px 0; } .ghud-md li { margin:3px 0 3px 16px; }
  .ghud-md code { background:rgba(95,224,255,.1); border-radius:4px; padding:0 4px; }
  .ghud-md strong { color:#fff; }
  .ghud-commit { display:flex; gap:10px; padding:5px 0; border-bottom:1px solid rgba(125,165,255,.08); font-size:11px; }
  .ghud-commit .h7 { color:var(--gh-mag); flex:none; } .ghud-commit .w { color:var(--gh-faint); flex:none; }
  @media (max-width: 980px) { #ghud-dock { flex-direction:column; } .ghud-card { height:auto; } }

  /* — geniş popover, sekmeler, ⌘K paleti, git merkezi — */
  #ghud-pop.wide { width:min(880px, 94vw); max-height:min(600px, 72vh); }
  .ghud-tabs { display:flex; gap:6px; }
  .ghud-tab-btn { font-size:9px; letter-spacing:.18em; color:var(--gh-dim); padding:5px 12px;
    border:1px solid transparent; border-radius:999px; cursor:pointer; user-select:none; }
  .ghud-tab-btn:hover { color:var(--gh-cy); }
  .ghud-tab-btn.on { color:var(--gh-cy); border-color:rgba(95,224,255,.4); background:rgba(95,224,255,.08); }
  #ghud-pal { position:fixed; z-index:10001; left:50%; top:16vh; transform:translateX(-50%);
    width:min(560px, 92vw); display:none; flex-direction:column;
    background:var(--gh-panel); border:1px solid var(--gh-line);
    clip-path:polygon(0 0, calc(100% - 16px) 0, 100% 16px, 100% 100%, 0 100%);
    filter:drop-shadow(0 20px 52px rgba(0,0,0,.65)); animation:ghudIn .15s ease;
    font-family:'Space Grotesk', -apple-system, sans-serif; color:var(--gh-ink); }
  #ghud-pal.open { display:flex; }
  #ghud-pal .pin { display:flex; align-items:center; gap:10px; padding:13px 16px;
    border-bottom:1px solid var(--gh-line); }
  #ghud-pal .pin svg { width:15px; height:15px; color:var(--gh-cy); flex:none; }
  #ghud-pal input { flex:1; background:transparent; border:none; outline:none; color:var(--gh-ink);
    font-size:14px; font-family:inherit; }
  #ghud-pal .plist { max-height:320px; overflow-y:auto; padding:7px; }
  .ghud-pi { display:flex; align-items:center; gap:10px; padding:9px 11px; border-radius:9px; cursor:pointer; }
  .ghud-pi:hover, .ghud-pi.sel { background:rgba(95,224,255,.09); }
  .ghud-pi .pic2 { width:14px; height:14px; color:var(--gh-vio); flex:none; }
  .ghud-pi .nm2 { font-size:13px; flex:1; min-width:0; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
  .ghud-pi .gr2 { font-size:9px; color:var(--gh-faint); letter-spacing:.1em; flex:none; }
  .ghud-pi .acts { display:none; gap:5px; flex:none; }
  .ghud-pi:hover .acts, .ghud-pi.sel .acts { display:flex; }
  .ghud-pi .acts span { font-size:8.5px; letter-spacing:.12em; color:var(--gh-cy);
    border:1px solid rgba(95,224,255,.35); border-radius:5px; padding:3px 7px; }
  .ghud-pi .acts span:hover { background:rgba(95,224,255,.15); }
  /* git merkezi */
  .ghud-git-head { display:flex; align-items:center; gap:12px; flex-wrap:wrap; margin-bottom:12px; }
  .ghud-git-branch { display:inline-flex; align-items:center; gap:6px; font-size:11px; color:var(--gh-cy);
    border:1px solid rgba(95,224,255,.35); border-radius:999px; padding:5px 13px; }
  .ghud-git-branch svg { width:13px; height:13px; }
  .ghud-day { font-size:9px; letter-spacing:.2em; color:var(--gh-faint); margin:12px 0 4px; }
  .ghud-cline { display:flex; gap:10px; padding:5px 0 5px 4px; border-left:2px solid rgba(125,165,255,.18);
    margin-left:5px; padding-left:14px; position:relative; font-size:11.5px; align-items:baseline; }
  .ghud-cline:before { content:''; position:absolute; left:-5px; top:10px; width:8px; height:8px;
    border-radius:50%; background:var(--gh-vio); box-shadow:0 0 8px rgba(139,123,255,.6); }
  .ghud-cline .h7 { color:var(--gh-mag); flex:none; font-size:10.5px; }
  .ghud-cline .msg { flex:1; min-width:0; }
  .ghud-cline .who { color:var(--gh-faint); font-size:9.5px; flex:none; }
  .ghud-dirty { display:flex; gap:9px; padding:5px 0; font-size:11.5px; align-items:baseline;
    border-bottom:1px solid rgba(125,165,255,.07); }
  .ghud-dirty .st { flex:none; font-size:9px; letter-spacing:.08em; padding:2px 7px; border-radius:5px;
    border:1px solid rgba(255,209,102,.4); color:var(--gh-warn); }
  .ghud-dirty .st.add { border-color:rgba(123,216,143,.4); color:var(--gh-ok); }
  .ghud-dirty .st.del { border-color:rgba(255,123,123,.4); color:var(--gh-danger); }
  .ghud-dirty .st.unt { border-color:rgba(125,165,255,.3); color:var(--gh-dim); }
  /* git flow rehberi */
  .ghud-flow-step { border:1px solid rgba(125,165,255,.16); border-radius:11px; padding:12px 15px; margin:9px 0; }
  .ghud-flow-step .fs-t { display:flex; align-items:center; gap:8px; font-size:11px; letter-spacing:.1em;
    color:var(--gh-cy); margin-bottom:5px; }
  .ghud-flow-step .fs-n { width:19px; height:19px; border-radius:50%; flex:none; display:flex; align-items:center;
    justify-content:center; font-size:10px; background:rgba(95,224,255,.12); border:1px solid rgba(95,224,255,.4); }
  .ghud-flow-step .fs-d { font-size:11.5px; color:var(--gh-dim); line-height:1.6; margin-bottom:6px; }
  .ghud-flow-step code { display:block; background:rgba(10,16,38,.85); border:1px solid rgba(125,165,255,.16);
    border-radius:7px; padding:7px 11px; font-size:11px; color:#aef3ff; margin:4px 0;
    font-family:'JetBrains Mono', Menlo, monospace; }

  /* — README / markdown estetiği (uygulamanın .md kapsayıcısı) — */
  .md { line-height:1.7 !important; font-size:13px; }
  .md h1, .md h2, .md h3 { color:#5fe0ff; letter-spacing:.05em; font-weight:600; margin:18px 0 8px; }
  .md h1 { font-size:17px; padding-bottom:7px; border-bottom:1px solid rgba(125,165,255,.22); }
  .md h2 { font-size:14px; padding-bottom:5px; border-bottom:1px solid rgba(125,165,255,.12); }
  .md h3 { font-size:13px; color:#8b7bff; }
  .md p { margin:7px 0; }
  .md ul { margin:7px 0 7px 4px; padding-left:16px; }
  .md li { margin:4px 0; }
  .md li.task { list-style:none; margin-left:-16px; }
  .md li.task.done { color:#93a0c8; }
  .md b, .md strong { color:#fff; }
  .md pre { background:rgba(10,16,38,.85); border:1px solid rgba(125,165,255,.18); border-radius:9px;
    padding:11px 14px; overflow-x:auto; margin:10px 0; font-size:11.5px; line-height:1.55; }
  .md code { font-family:'JetBrains Mono', Menlo, monospace; }
  .md p code, .md li code { background:rgba(95,224,255,.10); border-radius:4px; padding:1px 5px; font-size:11.5px; }
  .md img { max-width:100%; border-radius:9px; }
  .md table.ghud-tbl { width:100%; border-collapse:collapse; margin:10px 0 14px;
    font-size:12px; border:1px solid rgba(125,165,255,.2); border-radius:9px; overflow:hidden; }
  .md table.ghud-tbl th { background:rgba(95,224,255,.08); color:#5fe0ff; text-align:left;
    font-size:10px; letter-spacing:.12em; padding:8px 12px; border-bottom:1px solid rgba(125,165,255,.25); }
  .md table.ghud-tbl td { padding:7px 12px; border-bottom:1px solid rgba(125,165,255,.09); vertical-align:top; }
  .md table.ghud-tbl tr:nth-child(even) td { background:rgba(125,165,255,.04); }
  .md table.ghud-tbl tr:last-child td { border-bottom:none; }

  /* ================= SEYİR REHBERİ (görselli) ================= */
  #ghud-pop.guide {
    width:min(1140px, 96vw); max-height:88vh; bottom:auto; top:50%;
    transform:translate(-50%, -50%);
  }
  #ghud-pop.guide .pb { padding:0; display:flex; overflow:hidden; }
  .ghud-g-nav { width:212px; flex:none; overflow-y:auto; padding:10px 8px 14px;
    border-right:1px solid var(--gh-line); background:rgba(6,10,26,.35); }
  .ghud-g-nav .gsec { font-size:8.5px; letter-spacing:.24em; color:var(--gh-faint); padding:10px 11px 5px; }
  .ghud-g-nav .gi { display:flex; align-items:center; gap:9px; padding:8px 11px; border-radius:9px;
    font-size:11px; letter-spacing:.07em; color:var(--gh-dim); cursor:pointer; user-select:none; }
  .ghud-g-nav .gi:hover { background:rgba(95,224,255,.07); color:var(--gh-ink); }
  .ghud-g-nav .gi.on { background:rgba(95,224,255,.12); color:var(--gh-cy); }
  .ghud-g-nav .gi i { width:5px; height:5px; border-radius:50%; background:currentColor; flex:none; opacity:.75; }
  .ghud-g-main { flex:1; min-width:0; overflow-y:auto; padding:18px 24px 28px; }
  .ghud-g-main::-webkit-scrollbar { width:8px; }
  .ghud-g-main::-webkit-scrollbar-thumb { background:rgba(125,165,255,.25); border-radius:4px; }
  .ghud-g-h { font-size:15px; letter-spacing:.16em; color:var(--gh-ink); margin:0 0 5px; }
  .ghud-g-lead { font-size:12px; color:var(--gh-dim); line-height:1.75; margin:0 0 14px; max-width:78ch; }
  .ghud-g-lead b { color:#fff; }
  .ghud-fig { position:relative; border-radius:13px; overflow:hidden; border:1px solid var(--gh-line);
    box-shadow:0 14px 44px rgba(0,0,0,.55); cursor:zoom-in; background:#05080f; }
  .ghud-fig img { width:100%; display:block; }
  .ghud-fig:after { content:'BÜYÜT'; position:absolute; right:9px; bottom:9px; font-size:8px; letter-spacing:.2em;
    color:var(--gh-cy); background:rgba(4,8,20,.8); border:1px solid rgba(95,224,255,.35);
    border-radius:6px; padding:3px 8px; opacity:0; transition:opacity .15s;
    font-family:'JetBrains Mono', Menlo, monospace; }
  .ghud-fig:hover:after { opacity:1; }
  .ghud-fig:hover { border-color:rgba(95,224,255,.45); }
  .ghud-g-body { font-size:12.5px; color:var(--gh-dim); line-height:1.8; margin-top:16px; max-width:82ch; }
  .ghud-g-body b { color:#fff; }
  .ghud-g-body p { margin:8px 0; }
  .ghud-g-grid { display:grid; grid-template-columns:repeat(auto-fit, minmax(186px, 1fr)); gap:10px; margin-top:15px; }
  .ghud-g-card { border:1px solid rgba(125,165,255,.16); border-radius:11px; padding:11px 13px;
    background:rgba(10,16,38,.4); }
  .ghud-g-card .t { font-size:9.5px; letter-spacing:.2em; margin-bottom:6px; color:var(--gh-cy); }
  .ghud-g-card .d { font-size:11.5px; color:var(--gh-dim); line-height:1.65; }
  .ghud-g-card .d b { color:#fff; }
  /* görsel büyütme katmanı */
  #ghud-lb { position:fixed; inset:0; z-index:10002; display:none; align-items:center; justify-content:center;
    background:rgba(2,4,12,.92); backdrop-filter:blur(6px); cursor:zoom-out; padding:4vh 4vw; }
  #ghud-lb.open { display:flex; }
  #ghud-lb img { max-width:100%; max-height:100%; border-radius:12px;
    border:1px solid rgba(125,165,255,.28); box-shadow:0 30px 90px rgba(0,0,0,.75); }

  /* ================= AJAN PORTRELERİ (React'e dokunmadan, ::before ile) ================= */
  [data-ghud-agent]:before {
    content:''; flex:none; width:30px; height:30px; border-radius:9px; margin-right:2px;
    background:#0b1330 center/cover no-repeat;
    border:1px solid rgba(125,165,255,.3); box-shadow:0 2px 10px rgba(0,0,0,.55);
  }
  [data-ghud-agent="cto"]:before    { background-image:url("${AST}avatar-cto.jpg");    border-color:rgba(97,220,255,.55); }
  [data-ghud-agent="navigator"]:before  { background-image:url("${AST}avatar-navigator.jpg");  border-color:rgba(255,209,102,.55); }
  [data-ghud-agent="documentor"]:before { background-image:url("${AST}avatar-documentor.jpg"); border-color:rgba(123,216,143,.55); }
  [data-ghud-agent="forge"]:before  { background-image:url("${AST}avatar-forge.jpg");  border-color:rgba(255,123,216,.55); }
  [data-ghud-agent="mentor"]:before { background-image:url("${AST}avatar-mentor.jpg"); border-color:rgba(183,139,255,.55); }
  [data-ghud-agent="_new"]:before {
    content:attr(data-ghud-init);
    display:flex; align-items:center; justify-content:center;
    font:600 13px/1 "JetBrains Mono", Menlo, monospace; color:#cfe4ff; letter-spacing:.01em;
    background:radial-gradient(120% 120% at 30% 20%, rgba(95,224,255,.28), rgba(8,12,30,.95));
    border-style:dashed;
  }
  [data-ghud-big][data-ghud-agent="_new"]:before { font-size:19px; }
  [data-ghud-big]:before { width:46px; height:46px; border-radius:11px; }

  /* ajan panelinde rehber şeridi */
  .ghud-crew-strip { margin:0 0 14px; border:1px solid var(--gh-line); border-radius:12px; overflow:hidden;
    background:rgba(8,12,30,.55); }
  .ghud-crew-strip .cs-h { display:flex; align-items:center; gap:9px; padding:9px 13px;
    border-bottom:1px solid rgba(125,165,255,.14); }
  .ghud-crew-strip .cs-h svg { width:14px; height:14px; color:var(--gh-cy); flex:none; }
  .ghud-crew-strip .cs-h .cs-t { font-size:9.5px; letter-spacing:.22em; color:var(--gh-dim); flex:1; }
  .ghud-crew-strip img { width:100%; display:block; cursor:zoom-in; }
  .ghud-crew-strip .cs-d { font-size:11.5px; color:var(--gh-dim); line-height:1.7; padding:10px 13px 12px; }
  .ghud-crew-strip .cs-d b { color:#fff; }
  .ghud-crew-hero { display:flex; gap:14px; align-items:flex-start; padding:12px 13px; }
  .ghud-crew-hero img { width:132px; flex:none; border-radius:10px; border:1px solid var(--gh-line); cursor:zoom-in; }
  .ghud-crew-hero .ch-x { flex:1; min-width:0; font-size:11.5px; color:var(--gh-dim); line-height:1.7; }
  .ghud-crew-hero .ch-x b { color:#fff; }

  /* ================= KOPYALANABİLİR KOMUTLAR ================= */
  .ghud-flow-step code, code.ghud-cmd { cursor:pointer; position:relative; transition:border-color .12s, color .12s; }
  .ghud-flow-step code:hover, code.ghud-cmd:hover { border-color:rgba(95,224,255,.5); color:#dffaff; }
  code.ghud-cmd.ok, .ghud-flow-step code.ok { border-color:var(--gh-ok); color:var(--gh-ok); }
  code.ghud-cmd { display:block; background:rgba(10,16,38,.85); border:1px solid rgba(125,165,255,.16);
    border-radius:7px; padding:7px 11px; font-size:11px; color:#aef3ff; margin:4px 0;
    font-family:'JetBrains Mono', Menlo, monospace; white-space:pre-wrap; }

  /* ================= TAKIM AKIŞI ASİSTANI ================= */
  .ghud-read { display:flex; gap:11px; align-items:flex-start; border:1px solid rgba(95,224,255,.28);
    background:rgba(95,224,255,.06); border-radius:11px; padding:11px 14px; margin:0 0 12px; }
  .ghud-read svg { width:15px; height:15px; color:var(--gh-cy); flex:none; margin-top:2px; }
  .ghud-read .rx { font-size:11.5px; color:var(--gh-ink); line-height:1.7; }
  .ghud-read .rx b { color:#fff; }
  .ghud-read.warn { border-color:rgba(255,209,102,.35); background:rgba(255,209,102,.06); }
  .ghud-read.warn svg { color:var(--gh-warn); }
  .ghud-read.ok { border-color:rgba(123,216,143,.35); background:rgba(123,216,143,.06); }
  .ghud-read.ok svg { color:var(--gh-ok); }
  .ghud-tpl { background:rgba(10,16,38,.85); border:1px solid rgba(125,165,255,.16); border-radius:9px;
    padding:11px 13px; font-size:11px; line-height:1.7; color:#cfe0ff; white-space:pre-wrap; cursor:pointer;
    font-family:'JetBrains Mono', Menlo, monospace; margin:6px 0; }
  .ghud-tpl:hover { border-color:rgba(95,224,255,.5); }
  .ghud-tpl.ok { border-color:var(--gh-ok); }
  .ghud-hint { font-size:10px; letter-spacing:.14em; color:var(--gh-faint); margin:3px 0 12px; }

  /* ================= DOCKER MERKEZİ ================= */
  .ghud-dk-head { display:flex; align-items:center; gap:10px; flex-wrap:wrap; margin-bottom:12px; }
  .ghud-dk-stat { display:inline-flex; align-items:center; gap:7px; font-size:10.5px; color:var(--gh-dim);
    border:1px solid rgba(125,165,255,.2); border-radius:999px; padding:5px 12px; }
  .ghud-dk-stat b { color:#fff; }
  .ghud-dk-stat .dot { width:7px; height:7px; border-radius:50%; background:var(--gh-ok); flex:none;
    box-shadow:0 0 8px rgba(123,216,143,.8); }
  .ghud-dk-stat .dot.off { background:var(--gh-danger); box-shadow:0 0 8px rgba(255,139,139,.8); }
  .ghud-row { display:flex; align-items:center; gap:11px; padding:9px 11px; border-radius:10px;
    border:1px solid rgba(125,165,255,.14); margin-bottom:7px; background:rgba(10,16,38,.4); }
  .ghud-row:hover { border-color:rgba(95,224,255,.35); }
  .ghud-row .sdot { width:9px; height:9px; border-radius:50%; flex:none; background:var(--gh-faint); }
  .ghud-row .sdot.run { background:var(--gh-ok); box-shadow:0 0 9px rgba(123,216,143,.7); }
  .ghud-row .sdot.pause { background:var(--gh-warn); box-shadow:0 0 9px rgba(255,209,102,.7); }
  .ghud-row .sdot.exit { background:var(--gh-danger); }
  .ghud-row .nm { font-size:12.5px; color:#fff; font-weight:600; overflow:hidden;
    text-overflow:ellipsis; white-space:nowrap; }
  .ghud-row .meta { font-size:10px; color:var(--gh-dim); margin-top:2px; overflow:hidden;
    text-overflow:ellipsis; white-space:nowrap; }
  .ghud-row .col { flex:1; min-width:0; }
  .ghud-row .acts { display:flex; gap:5px; flex:none; }
  .ghud-ib { display:inline-flex; align-items:center; justify-content:center; gap:5px;
    width:28px; height:28px; border-radius:8px; cursor:pointer; user-select:none;
    border:1px solid rgba(125,165,255,.22); color:var(--gh-dim); background:transparent; }
  .ghud-ib svg { width:13px; height:13px; }
  .ghud-ib:hover { color:var(--gh-cy); border-color:var(--gh-cy); background:rgba(95,224,255,.1); }
  .ghud-ib.danger:hover { color:var(--gh-danger); border-color:var(--gh-danger); background:rgba(255,139,139,.1); }
  .ghud-ib.go:hover { color:var(--gh-ok); border-color:var(--gh-ok); background:rgba(123,216,143,.1); }
  .ghud-ib.wide { width:auto; padding:0 10px; font-size:9px; letter-spacing:.14em; }
  .ghud-ib.busy { opacity:.45; pointer-events:none; }
  .ghud-port { font-size:9.5px; color:var(--gh-cy); border:1px solid rgba(95,224,255,.3);
    border-radius:5px; padding:2px 7px; cursor:pointer; margin-right:4px; display:inline-block; }
  .ghud-port:hover { background:rgba(95,224,255,.14); }
  .ghud-logs { background:rgba(4,8,20,.9); border:1px solid rgba(125,165,255,.16); border-radius:9px;
    padding:11px 13px; font-size:10.5px; line-height:1.55; color:#cfe0ff; white-space:pre-wrap;
    font-family:'JetBrains Mono', Menlo, monospace; max-height:46vh; overflow:auto; }
  .ghud-dk-empty { text-align:center; padding:26px 10px; }
  .ghud-dk-empty .big { font-size:13px; color:var(--gh-ink); margin-bottom:6px; }
  .ghud-dk-empty .sm { font-size:11.5px; color:var(--gh-dim); line-height:1.7; max-width:56ch;
    margin:0 auto 14px; }

  /* ================= ERİŞİLEBİLİRLİK ================= */
  /* klavye odağı: fare tıklamasında değil, yalnızca klavye ile gezerken görünür halka */
  #ghud-tab:focus-visible, .ghud-a:focus-visible, .ghud-btn:focus-visible,
  .ghud-tab-btn:focus-visible, .ghud-pi:focus-visible, .ghud-ib:focus-visible,
  .ghud-rep:focus-visible, .ghud-g-nav .gi:focus-visible, .ghud-fig:focus-visible,
  [data-gtab]:focus-visible, [data-dktab]:focus-visible, .ghud-port:focus-visible,
  code.ghud-cmd:focus-visible, .ghud-tpl:focus-visible {
    outline:2px solid var(--gh-cy); outline-offset:2px;
    border-radius:8px; color:var(--gh-cy);
  }
  #ghud-pal input:focus-visible, .ghud-note-in input:focus-visible { outline:none; }

  /* hareket hassasiyeti: ağır arka plan sürüklenmesi + entrance animasyonlarını kes */
  @media (prefers-reduced-motion: reduce) {
    #ghud-neb { animation:none !important; }
    #ghud-dock, #ghud-pop, #ghud-pal, #ghud-tab { animation:none !important; }
    #ghud-tab, #ghud-tab .chev { transition:none !important; }
  }

  /* ================= SUNUCU MERKEZİ (SSH) ================= */
  .ghud-srv-os { display:inline-flex; align-items:center; gap:6px; font-size:9.5px; letter-spacing:.1em;
    color:var(--gh-dim); border:1px solid rgba(125,165,255,.2); border-radius:999px; padding:3px 9px; }
  .ghud-srv-os.win { color:#7bbcff; border-color:rgba(123,188,255,.4); }
  .ghud-srv-os.posix { color:var(--gh-ok); border-color:rgba(123,216,143,.4); }
  .ghud-srv-os.off { color:var(--gh-danger); border-color:rgba(255,139,139,.4); }
  .ghud-field { margin-bottom:11px; }
  .ghud-field label { display:block; font-size:9px; letter-spacing:.2em; color:var(--gh-faint);
    margin-bottom:5px; font-family:'JetBrains Mono', Menlo, monospace; }
  .ghud-field input, .ghud-field select {
    width:100%; background:rgba(22,30,66,.6); border:1px solid rgba(125,145,255,.28);
    color:var(--gh-ink); border-radius:8px; padding:9px 12px; font-size:12.5px; outline:none;
    font-family:inherit; }
  .ghud-field input:focus, .ghud-field select:focus { border-color:var(--gh-cy); }
  .ghud-field input::placeholder { color:var(--gh-faint); }
  .ghud-field select option { background:#0c1226; color:var(--gh-ink); }
  .ghud-frow { display:flex; gap:10px; }
  .ghud-frow > * { flex:1; }
  .ghud-seg { display:flex; gap:6px; margin-bottom:12px; }
  .ghud-seg .s { flex:1; text-align:center; font-size:10px; letter-spacing:.14em; padding:8px;
    border:1px solid rgba(125,165,255,.22); border-radius:8px; cursor:pointer; color:var(--gh-dim); }
  .ghud-seg .s.on { color:var(--gh-cy); border-color:var(--gh-cy); background:rgba(95,224,255,.1); }
  .ghud-rootrow { display:flex; gap:8px; align-items:center; margin-bottom:7px; }
  .ghud-rootrow input { flex:1; background:rgba(22,30,66,.6); border:1px solid rgba(125,145,255,.28);
    color:var(--gh-ink); border-radius:8px; padding:8px 11px; font-size:12px; outline:none; font-family:inherit; }
  .ghud-rootrow input:focus { border-color:var(--gh-cy); }
  .ghud-rootrow .rn { flex:none; width:130px; }
  .ghud-srv-probe { border:1px solid rgba(125,165,255,.16); border-radius:9px; padding:10px 13px;
    margin:2px 0 12px; font-size:11px; line-height:1.7; background:rgba(10,16,38,.4); }
  .ghud-srv-probe b { color:#fff; }
  .ghud-srv-probe.ok { border-color:rgba(123,216,143,.4); }
  .ghud-srv-probe.bad { border-color:rgba(255,139,139,.4); }
  .ghud-kv { font-size:10.5px; color:var(--gh-dim); }
  .ghud-kv b { color:var(--gh-ink); font-weight:600; }

  /* ================= CİLA KATMANI (additive — mevcut kuralları ezmez) =================
   * Olgun temaya dokunmadan üstüne binen mikro-etkileşim rafinesi.
   * Tümü prefers-reduced-motion altında kapanır. */
  /* dock açılışında kartların sıralı yükselişi — orkestre edilmiş giriş */
  #ghud-dock.open .ghud-card { animation:ghudRise .42s cubic-bezier(.22,.61,.36,1) backwards; }
  #ghud-dock.open .ghud-card:nth-child(1) { animation-delay:.02s; }
  #ghud-dock.open .ghud-card:nth-child(2) { animation-delay:.08s; }
  #ghud-dock.open .ghud-card:nth-child(3) { animation-delay:.14s; }
  #ghud-dock.open .ghud-card:nth-child(4) { animation-delay:.20s; }
  #ghud-dock.open .ghud-card:nth-child(5) { animation-delay:.26s; }
  #ghud-dock.open .ghud-card:nth-child(6) { animation-delay:.32s; }
  @keyframes ghudRise { from { opacity:0; transform:translateY(14px); } to { opacity:1; transform:none; } }

  /* kartlarda dokunsal derinlik: hover'da hafif kalkış (geçiş transform'u da ekli) */
  .ghud-card { transition:border-color .15s, box-shadow .18s, transform .18s ease; }
  .ghud-card:hover { transform:translateY(-2px); }

  /* ilerleme çubuğunda canlı ışık süpürmesi */
  .ghud-bar > div { position:relative; overflow:hidden; }
  .ghud-bar > div:after { content:''; position:absolute; inset:0;
    background:linear-gradient(90deg, transparent, rgba(255,255,255,.32), transparent);
    transform:translateX(-100%); animation:ghudSheen 2.8s ease-in-out infinite; }
  @keyframes ghudSheen { 0%,55% { transform:translateX(-100%); } 100% { transform:translateX(100%); } }

  /* birleşik ince scrollbar — tüm kaydırma alanlarında tutarlı görünüm */
  #ghud-dock ::-webkit-scrollbar, #ghud-pop ::-webkit-scrollbar, #ghud-pal ::-webkit-scrollbar { width:8px; height:8px; }
  #ghud-dock ::-webkit-scrollbar-track, #ghud-pop ::-webkit-scrollbar-track, #ghud-pal ::-webkit-scrollbar-track { background:transparent; }
  #ghud-dock ::-webkit-scrollbar-thumb, #ghud-pop ::-webkit-scrollbar-thumb, #ghud-pal ::-webkit-scrollbar-thumb {
    background:rgba(125,165,255,.22); border-radius:4px; }
  #ghud-dock ::-webkit-scrollbar-thumb:hover, #ghud-pop ::-webkit-scrollbar-thumb:hover, #ghud-pal ::-webkit-scrollbar-thumb:hover {
    background:rgba(95,224,255,.35); }

  /* ── ikinci tur cila ──────────────────────────────────────────────
   * Bu elemanlarda daha önce transition yoktu; buradaki kurallar additive. */

  /* 1) buton mikro-feedback: tıklamada hafif çökme (dokunsal his) + yumuşak durum geçişi */
  .ghud-btn, .ghud-ib, .ghud-a, .ghud-tab-btn, .ghud-pi, .ghud-rep, .ghud-port, .ghud-seg .s {
    transition:transform .13s cubic-bezier(.34,1.56,.5,1), background .15s, border-color .15s, color .15s, box-shadow .15s;
  }
  .ghud-btn:active, .ghud-ib:active, .ghud-a:active, .ghud-tab-btn:active,
  .ghud-pi:active, .ghud-rep:active, .ghud-port:active, .ghud-seg .s:active { transform:scale(.93); }
  .ghud-ib.busy:active { transform:none; }   /* meşgul düğme geri bildirim vermesin */

  /* 2) kart başlık ikonlarına yumuşak canlanma: kart hover'ında ikon büyür ve kendi rengiyle parlar */
  .ghud-h .hic { transition:transform .28s cubic-bezier(.34,1.56,.5,1), filter .28s; }
  .ghud-card:hover .hic { transform:scale(1.16); filter:drop-shadow(0 0 5px currentColor); }

  /* 3) boş durum (empty-state) zenginleştirmesi: içerik yumuşak yükselir,
        başlığın üstünde "nefes alan" bir ışık halkası belirir */
  .ghud-dk-empty { animation:ghudRise .44s cubic-bezier(.22,.61,.36,1) backwards; }
  .ghud-dk-empty:before { content:''; display:block; width:46px; height:46px; margin:2px auto 16px;
    border-radius:50%;
    background:radial-gradient(circle, rgba(95,224,255,.20), rgba(139,123,255,.10) 55%, transparent 72%);
    animation:ghudBreathe 3.4s ease-in-out infinite; }
  @keyframes ghudBreathe { 0%,100% { opacity:.45; transform:scale(1); } 50% { opacity:1; transform:scale(1.14); } }
  /* satır içi küçük "boş" mesajlarına ince bir yön işareti */
  .ghud-empty { position:relative; }

  @media (prefers-reduced-motion: reduce) {
    #ghud-dock.open .ghud-card { animation:none !important; }
    .ghud-card { transition:border-color .15s, box-shadow .15s; }
    .ghud-card:hover { transform:none; }
    .ghud-bar > div:after { display:none; animation:none; }
    /* ikinci tur: hareketi kes, geri bildirimi anlık bırak */
    .ghud-btn, .ghud-ib, .ghud-a, .ghud-tab-btn, .ghud-pi, .ghud-rep, .ghud-port, .ghud-seg .s {
      transition:background .15s, border-color .15s, color .15s; }
    .ghud-btn:active, .ghud-ib:active, .ghud-a:active, .ghud-tab-btn:active,
    .ghud-pi:active, .ghud-rep:active, .ghud-port:active, .ghud-seg .s:active { transform:none; }
    .ghud-h .hic, .ghud-card:hover .hic { transition:none; transform:none; filter:none; }
    .ghud-dk-empty { animation:none; }
    .ghud-dk-empty:before { animation:none; opacity:.7; }
  }

  /* ════════════ "GENEL BAKIŞ" — evren kart-grid (referans tasarımın içerik ekranı) ════════════
   * Referans tasarımdaki "Evrenini seç" kart-grid'ini uygulamanın KENDİ token'larıyla
   * (--accent/--ink/--line…) ve panel-cut notch'uyla (16px) render eder. Tam-ekran DEĞİL:
   * içerik alanına oturur — üst nav, sol proje paneli ve sağ mürettebat rayı görünür kalır,
   * böylece referanstaki bütünlüklü sekme görünümü elde edilir. İnset'ler açılışta ölçülür. */
  #ghud-ov {
    position:fixed;
    top:var(--ghov-top,54px); left:var(--ghov-left,336px);
    right:var(--ghov-right,200px); bottom:var(--ghov-bottom,32px);
    z-index:10050; display:none; overflow-y:auto;
    background:radial-gradient(120% 82% at 50% -12%, rgba(18,24,52,.5), rgba(4,6,12,.995) 62%), #05070e;
    border-left:1px solid var(--line,#becdff1a);
    color:var(--ink,#dbe4ff);
    font-family:'Space Grotesk', -apple-system, sans-serif; animation:ghudIn .2s ease; }
  #ghud-ov.open { display:block; }
  /* tam-ekran (picker) modu: evrene girmeden önce dev-gezegen seçicinin YERİNE geçer;
     içerik-alanı insetlerini iptal edip tüm ekranı kaplar, wrap ortalanır (referans "Evrenini seç"). */
  #ghud-ov.full { top:0; left:0; right:0; bottom:0; border-left:none;
    background:radial-gradient(120% 88% at 50% -8%, rgba(20,26,54,.6), rgba(4,6,12,.99) 60%), #04060c; }
  #ghud-ov.full .ghud-ov-wrap { max-width:1180px; margin:0 auto; padding:76px 44px 60px; }
  #ghud-ov.full .ghud-ov-close { display:none; }   /* picker'da geri dönülecek yer yok — evren seçilmeli */
  .ghud-ov-wrap { max-width:1200px; padding:34px 40px 52px; }
  .ghud-ov-top { display:flex; align-items:flex-start; justify-content:space-between; margin-bottom:24px; }
  .ghud-ov-ovl { font-family:'JetBrains Mono', monospace; font-size:10px; letter-spacing:.3em; text-transform:uppercase;
    color:var(--accent,#61dcff); margin-bottom:12px; }
  .ghud-ov-h1 { font-size:34px; font-weight:600; letter-spacing:.005em; color:#fff; margin-bottom:10px; }
  .ghud-ov-lead { font-size:13px; color:var(--ink-dim,#8b96b8); line-height:1.65; max-width:62ch; }
  .ghud-ov-close { flex:none; width:34px; height:34px; display:flex; align-items:center; justify-content:center;
    border:1px solid var(--line,#becdff1a); color:var(--ink-dim,#8b96b8); cursor:pointer;
    clip-path:polygon(0 0, calc(100% - 8px) 0, 100% 8px, 100% 100%, 0 100%);
    transition:color .15s, border-color .15s, background .15s; }
  .ghud-ov-close:hover { color:var(--accent,#61dcff); border-color:var(--accent,#61dcff); background:var(--accent-dim,rgba(97,220,255,.14)); }
  .ghud-ov-close svg { width:16px; height:16px; }
  .ghud-ov-grid { display:grid; grid-template-columns:repeat(auto-fill, minmax(300px, 1fr)); gap:16px; }
  .ghud-ov-card {
    position:relative; padding:22px 22px 18px; cursor:pointer;
    border:1px solid var(--line-strong,#becdff38);
    background:linear-gradient(172deg,#0d1224eb,#050812f5);
    clip-path:polygon(0 0, calc(100% - 16px) 0, 100% 16px, 100% 100%, 0 100%);
    transition:border-color .16s, box-shadow .16s, transform .16s cubic-bezier(.34,1.4,.5,1); }
  .ghud-ov-card:hover { border-color:rgba(97,220,255,.5); box-shadow:0 0 34px rgba(97,220,255,.1); transform:translateY(-2px); }
  .ghud-ov-row { display:flex; align-items:center; gap:16px; }
  .ghud-ov-planet { width:60px; height:60px; border-radius:50%; flex:none;
    transition:transform .3s cubic-bezier(.34,1.56,.5,1); }
  .ghud-ov-card:hover .ghud-ov-planet { transform:scale(1.07); }
  .ghud-ov-info { min-width:0; flex:1; }
  .ghud-ov-name { font-size:19px; font-weight:600; color:#fff; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
  .ghud-ov-path { font-family:'JetBrains Mono', monospace; font-size:11px; color:var(--ink-faint,#4d5677);
    white-space:nowrap; overflow:hidden; text-overflow:ellipsis; margin-top:4px; }
  .ghud-ov-stats { display:flex; gap:18px; margin-top:16px; padding-top:14px; border-top:1px solid var(--line,#becdff1a);
    font-family:'JetBrains Mono', monospace; font-size:11px; color:var(--ink-dim,#8b96b8); }
  .ghud-ov-stats b { color:#fff; font-weight:600; }
  .ghud-ov-stats .ok b { color:var(--ok,#55e88b); }
  .ghud-ov-add {
    border:1px dashed var(--line-strong,#becdff38); clip-path:none;
    display:flex; flex-direction:column; align-items:center; justify-content:center; gap:8px;
    min-height:154px; color:var(--ink-dim,#8b96b8); background:transparent; }
  .ghud-ov-add:hover { border-color:var(--accent,#61dcff); color:var(--accent,#61dcff); box-shadow:none; transform:none; }
  .ghud-ov-add .pl { font-size:28px; font-weight:200; color:var(--accent,#61dcff); line-height:1; }
  .ghud-ov-add .lb { font-family:'JetBrains Mono', monospace; font-size:10px; letter-spacing:.2em; }
  .ghud-ov-add .s2 { font-family:'JetBrains Mono', monospace; font-size:9px; letter-spacing:.1em; color:var(--ink-faint,#4d5677); }
  .ghud-ov-empty { color:var(--ink-faint,#4d5677); font-size:13px; padding:40px 0; text-align:center; }

  /* ════════════ index.html ANA ARAYÜZ — artifact rafineleri ════════════
   * galaxy-hud'un CSS'i document.head'e GLOBAL enjekte edilir; bu kurallar
   * derlenmiş index.html'in KENDİ semantik sınıflarını hedefler. Hepsi
   * additive: React'in inline stillerini EZMEZ, yalnızca tanımsız durumları
   * (transition / :active / :focus) ekler. Yapısal layout'a dokunmaz.
   * Amaç: buton/input geri bildirimini HUD ile ve artifact ile aynı dile getirmek. */
  .gbtn { transition:transform .13s cubic-bezier(.34,1.56,.5,1), border-color .15s, color .15s, background .15s; }
  .gbtn:active { transform:scale(.95); }
  /* üst bar sekmeleri — hover'da cyan aksan (artifact seçili-sekme dili) */
  .gbtn:hover { border-color:var(--accent, #61dcff); color:var(--accent, #61dcff); background:var(--accent-dim, rgba(97,220,255,.14)); }
  /* tıklanabilir modal/kart panellerine hover derinliği + yumuşak iç kenar parıltısı */
  .panel-cut.brackets:hover { border-color:var(--line-strong, rgba(190,205,255,.38)); box-shadow:0 0 32px rgba(97,220,255,.07); }
  /* uygulama genelinde ince, tutarlı scrollbar (sol proje paneli + tüm listeler) */
  ::-webkit-scrollbar { width:9px; height:9px; }
  ::-webkit-scrollbar-track { background:transparent; }
  ::-webkit-scrollbar-thumb { background:rgba(190,205,255,.14); border-radius:5px; }
  ::-webkit-scrollbar-thumb:hover { background:rgba(97,220,255,.32); }
  /* metin daha net render (artifact kalitesi) */
  body, .panel-cut, .gbtn, .hud-label, .hud-value { -webkit-font-smoothing:antialiased; text-rendering:optimizeLegibility; }
  .hud-input { transition:border-color .15s, box-shadow .15s; }
  .hud-input:focus { box-shadow:0 0 0 1px var(--accent, #61dcff), 0 0 18px rgba(97,220,255,.12); }
  /* tıklanabilir modal/kart panellerine yumuşak geçiş (görünür değişim tek başına yok) */
  .panel-cut.brackets { transition:border-color .18s, box-shadow .18s; }
  @media (prefers-reduced-motion: reduce) {
    .gbtn { transition:border-color .15s, color .15s, background .15s; }
    .gbtn:active { transform:none; }
  }
  `;

  /* ================= 3. VERİ + DOCK ================= */

  const $ = (sel, root) => (root || document).querySelector(sel);
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  // Türkçe-güvenli karşılaştırma: küçült + ı/i farkını katla (COMMIT → commıt sorunu)
  const trFold = s => String(s || '').toLocaleLowerCase('tr').replace(/ı/g, 'i');
  const fdate = ts => { try { return String(ts).slice(5, 10).replace('-', '.'); } catch (e) { return ''; } };

  /* ================= i18n (tr/en) =================
   * Dil, onboarding'de seçilip profile.lang'a yazılır (window.galaxy.profileGet).
   * HUD dock chrome'u burada iki dile çevrilir; t('anahtar') ile kullanılır,
   * eksik anahtar TR'ye, o da yoksa anahtarın kendisine düşer. */
  let LANG = 'tr';
  const STR = {
    tr: {
      starTitle: 'EN AKTİF YILDIZ', recentTitle: 'SON YAPILANLAR', notesTitle: 'NOTLARIM',
      reports: 'RAPORLAR', folder: 'KLASÖR', history: 'GEÇMİŞ',
      warnSuffix: 'uyarı', dayShort: 'g',
      noScan: 'Henüz proje taranmadı.',
      noDone: 'Günlüğe işlenmiş iş yok — ✎ GÜNLÜK ile ekle.',
      noNotes: 'Not yok.', notePh: 'Hızlı not… (Enter)', quickNote: 'Her yerden hızlı not',
      aGuide: 'Seyir Rehberi', aSearch: 'Hızlı ara', aSettings: 'Ayarlar',
      aRefresh: 'Yenile', aReports: 'Rapor arşivi', aClose: 'Kapat'
    },
    en: {
      starTitle: 'MOST ACTIVE STAR', recentTitle: 'RECENT ACTIVITY', notesTitle: 'MY NOTES',
      reports: 'REPORTS', folder: 'FOLDER', history: 'HISTORY',
      warnSuffix: 'alerts', dayShort: 'd',
      noScan: 'No projects scanned yet.',
      noDone: 'No logged work yet — add one with ✎ LOG.',
      noNotes: 'No notes.', notePh: 'Quick note… (Enter)', quickNote: 'Quick note from anywhere',
      aGuide: 'Navigation Guide', aSearch: 'Quick search', aSettings: 'Settings',
      aRefresh: 'Refresh', aReports: 'Report archive', aClose: 'Close'
    }
  };
  const t = k => (STR[LANG] && STR[LANG][k]) || STR.tr[k] || k;

  let cache = { projects: [], universes: [], log: [], alerts: [], settings: { staleDays: 21, planPending: 5 } };

  async function refresh() {
    try {
      const [scan, log, prof] = await Promise.all([
        window.galaxy.load(),
        window.galaxy.logList(),
        window.galaxy.profileGet ? window.galaxy.profileGet().catch(() => null) : null
      ]);
      if (prof && prof.lang) LANG = prof.lang === 'en' ? 'en' : 'tr';
      cache = {
        projects: scan.projects || [], universes: scan.universes || [],
        log: log || [], alerts: scan.alerts || [],
        settings: scan.settings || { staleDays: 21, planPending: 5 }
      };
    } catch (e) { /* IPC hazır değilse sessiz geç */ }
    renderDock();
  }

  function topStar() {
    let best = null, bestScore = -1e9;
    for (const p of cache.projects) {
      const act = p.git ? (p.git.activity30 || 0) : 0;
      const score = act * 10 + (p.status === 'active' ? 6 : 0) + (p.progress || 0) / 25 - (p.staleDays || 0) * 0.05;
      if (score > bestScore) { bestScore = score; best = p; }
    }
    return best;
  }

  const uniName = id => { const u = cache.universes.find(x => x.id === id); return u ? u.name : ''; };
  const projName = id => { const p = cache.projects.find(x => x.id === id); return p ? p.name : ''; };
  const hueOf = s => { let h = 0; for (let i = 0; i < (s || '').length; i++) h = (h * 31 + s.charCodeAt(i)) % 360; return h; };

  function renderDock() {
    const star = topStar();
    const done = cache.log.filter(l => l.projectId).slice(0, 3);
    const notes = cache.log.filter(l => !l.projectId).slice(0, 2);
    const alerts = (cache.alerts || []).length;

    const heroEl = $('#ghud-hero');
    if (star) {
      heroEl.innerHTML = `
        <div class="ghud-h"><span class="hic">${I.rocket}</span>
          <span class="ghud-t">${t('starTitle')}</span>
          <span class="ghud-a" data-act="guide" role="button" tabindex="0" aria-label="${t('aGuide')}" title="${t('aGuide')} (F1)">${I.book}</span>
          <span class="ghud-a" data-act="palette" role="button" tabindex="0" aria-label="${t('aSearch')}" title="${t('aSearch')} (⌘K)">${I.search}</span>
          <span class="ghud-a" data-act="settings" role="button" tabindex="0" aria-label="${t('aSettings')}" title="${t('aSettings')}">${I.gear}</span>
          <span class="ghud-a" data-act="refresh" role="button" tabindex="0" aria-label="${t('aRefresh')}" title="${t('aRefresh')}">${I.refresh}</span></div>
        <div class="ghud-body"><div class="ghud-hero-row">
          <div class="ghud-thumb">${planetThumb(hueOf(star.id))}</div>
          <div class="ghud-hero-info">
            <div class="ghud-star-name">${esc(star.name)}</div>
            <div class="ghud-sub">${esc(uniName(star.universe))}${star.stage ? ' · ' + esc(star.stage) : ''} · %${star.progress || 0}</div>
            <div class="ghud-bar"><div style="width:${Math.max(2, Math.min(100, star.progress || 0))}%"></div></div>
            <div class="ghud-meta">
              ${star.git ? `<span class="ghud-chip ghud-mono">${I.branch}${esc(star.git.branch || '?')} · ${star.git.activity30 || 0}</span>` : ''}
              ${star.staleDays >= (cache.settings.staleDays || 21) ? `<span class="ghud-chip warn ghud-mono">${I.alert}${star.staleDays}${t('dayShort')}</span>` : ''}
              ${alerts ? `<span class="ghud-chip warn ghud-mono">${I.alert}${alerts} ${t('warnSuffix')}</span>` : ''}
              <span style="flex:1"></span>
              <span class="ghud-btn" data-act="folder" data-p="${esc(star.path)}">${I.folder}${t('folder')}</span>
              <span class="ghud-btn" data-act="git" data-id="${esc(star.id)}" data-nm="${esc(star.name)}">${I.branch}${t('history')}</span>
            </div>
          </div>
        </div></div>`;
    } else {
      heroEl.innerHTML = `
        <div class="ghud-h"><span class="hic">${I.rocket}</span><span class="ghud-t">${t('starTitle')}</span></div>
        <div class="ghud-empty">${t('noScan')}</div>`;
    }

    $('#ghud-recent').innerHTML = `
      <div class="ghud-h"><span class="hic">${I.clock}</span>
        <span class="ghud-t">${t('recentTitle')}</span>
        <span class="ghud-a wtxt" data-act="reports" role="button" tabindex="0" aria-label="${t('aReports')}" title="${t('aReports')}">${I.doc}${t('reports')}</span></div>
      <div class="ghud-body">
      ${done.length ? done.map(l => `
        <div class="ghud-li"><span class="d ghud-mono">${fdate(l.ts)}</span>
          <span class="x">${esc(l.text)}</span>
          <span class="p ghud-mono">${esc(projName(l.projectId))}</span></div>`).join('')
        : `<div class="ghud-empty">${t('noDone')}</div>`}</div>`;

    $('#ghud-notes').innerHTML = `
      <div class="ghud-h"><span class="hic">${I.pencil}</span>
        <span class="ghud-t">${t('notesTitle')}</span>
        <span class="ghud-a wtxt ghud-mono" title="${t('quickNote')}">⌘⇧G</span></div>
      <div class="ghud-body">
      ${notes.length ? notes.map(l => `
        <div class="ghud-li"><span class="d ghud-mono">${fdate(l.ts)}</span>
          <span class="x">${esc(l.text)}</span></div>`).join('')
        : `<div class="ghud-empty">${t('noNotes')}</div>`}</div>
      <div class="ghud-note-in">
        <input id="ghud-note-inp" type="text" placeholder="${t('notePh')}" maxlength="300">
      </div>`;
    const inp = $('#ghud-note-inp');
    inp.addEventListener('keydown', async e => {
      if (e.key === 'Enter' && inp.value.trim()) {
        try { await window.galaxy.logSave(inp.value.trim()); } catch (err) {}
        inp.value = '';
        refresh();
      }
      e.stopPropagation();
    });
    inp.addEventListener('keyup', e => e.stopPropagation());
  }

  /* ================= 4. POPOVER ================= */

  function popOpen(icon, title, bodyHtml) {
    $('#ghud-pop .pic').innerHTML = icon;
    $('#ghud-pop .t').textContent = title;
    const pb = $('#ghud-pop .pb');
    pb.innerHTML = bodyHtml;
    // Form alanlarına yazarken ⌘K / ESC gibi HUD kısayolları tetiklenmesin
    for (const inp of pb.querySelectorAll('input, select, textarea')) {
      inp.addEventListener('keydown', e => e.stopPropagation());
      inp.addEventListener('keyup', e => e.stopPropagation());
    }
    $('#ghud-pop').classList.remove('wide', 'guide');
    $('#ghud-pop').classList.add('open');
  }
  function popClose() { $('#ghud-pop').classList.remove('open', 'wide', 'guide'); }

  function mdLite(md) {
    let h = esc(md);
    h = h.replace(/^### (.*)$/gm, '<h3>$1</h3>')
         .replace(/^## (.*)$/gm, '<h2>$1</h2>')
         .replace(/^# (.*)$/gm, '<h1>$1</h1>')
         .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
         .replace(/`([^`]+)`/g, '<code>$1</code>')
         .replace(/^[-*] (.*)$/gm, '<li>$1</li>')
         .replace(/\n{2,}/g, '</p><p>');
    return '<div class="ghud-md"><p>' + h + '</p></div>';
  }

  async function showReports() {
    let names = [];
    try { names = await window.galaxy.reports(); } catch (e) {}
    popOpen(I.doc, 'RAPOR ARŞİVİ', names.length
      ? names.map(n => `<div class="ghud-rep ghud-mono" data-rep="${esc(n)}">${I.doc}<span>${esc(n)}</span></div>`).join('')
      : '<div class="ghud-empty">Rapor yok — ⏱ ZAMANLAYICI ile ajanlara görev kur.</div>');
  }

  async function showReport(name) {
    let md = null;
    try { md = await window.galaxy.report(name); } catch (e) {}
    popOpen(I.doc, name, md ? mdLite(md) : '<div class="ghud-empty">Rapor okunamadı.</div>');
  }

  /* ---- GİT MERKEZİ: durum + geçmiş + öğretici git flow rehberi ---- */

  function dirtyBadge(line) {
    const code = line.slice(0, 2).trim();
    const file = line.slice(2).trim() || line.trim();
    let cls = '', label = 'DEĞİŞTİ';
    if (code === '??') { cls = 'unt'; label = 'İZLENMİYOR'; }
    else if (code.includes('A')) { cls = 'add'; label = 'EKLENDİ'; }
    else if (code.includes('D')) { cls = 'del'; label = 'SİLİNDİ'; }
    else if (code.includes('R')) { label = 'TAŞINDI'; }
    else if (code.includes('M')) { label = 'DEĞİŞTİ'; }
    return `<div class="ghud-dirty"><span class="st ghud-mono ${cls}">${label}</span><span class="ghud-mono" style="flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(file)}</span></div>`;
  }

  function gitTimeline(commits) {
    if (!commits.length) return '<div class="ghud-empty">Commit yok — ilk commit\'i REHBER sekmesindeki adımlarla at.</div>';
    let html = '', lastDay = '';
    for (const c of commits.slice(0, 40)) {
      const day = (c.ad || '').slice(0, 10);
      if (day !== lastDay) { html += `<div class="ghud-day ghud-mono">${esc(day)}</div>`; lastDay = day; }
      html += `<div class="ghud-cline"><span class="h7 ghud-mono">${esc(c.h)}</span>
        <span class="msg">${esc(c.s)}</span>
        <span class="who ghud-mono">${esc((c.an || '').split(' ')[0])} · ${esc((c.ad || '').slice(11, 16))}</span></div>`;
    }
    return html;
  }

  // Tıklanınca panoya kopyalanan komut satırı
  const cmd = c => `<code class="ghud-cmd" data-cp="${esc(c)}" title="Tıkla → panoya kopyala">${esc(c)}</code>`;
  // Numaralı rehber adımı: başlık + açıklama + kopyalanabilir komutlar
  const step = (n, t, d, cmds) => `<div class="ghud-flow-step">
    <div class="fs-t ghud-mono"><span class="fs-n">${n}</span>${t}</div>
    <div class="fs-d">${d}</div>${(cmds || []).map(cmd).join('')}</div>`;

  // Git flow'u sıfırdan öğreten rehber — SVG diyagram + adım adım komutlar
  function gitFlowGuide() {
    const lanes = [
      { y: 26, c: '#5fe0ff', n: 'main', d: 'her zaman yayınlanabilir' },
      { y: 62, c: '#8b7bff', n: 'develop', d: 'bir sonraki sürümün gövdesi' },
      { y: 98, c: '#7bd88f', n: 'feature/…', d: 'her yeni iş kendi dalında' },
      { y: 134, c: '#ffd166', n: 'release/…', d: 'sürüm hazırlığı ve son rötuş' },
      { y: 170, c: '#ff7bd8', n: 'hotfix/…', d: 'üründeki acil yangınlar' }
    ];
    const lane = l => `<line x1="120" y1="${l.y}" x2="800" y2="${l.y}" stroke="${l.c}" stroke-opacity=".45" stroke-width="2"/>
      <text x="8" y="${l.y + 4}" fill="${l.c}" font-size="11" font-family="Menlo,monospace">${l.n}</text>
      <text x="810" y="${l.y + 4}" fill="#55608a" font-size="9" font-family="Menlo,monospace">${l.d}</text>`;
    const dot = (x, y, c) => `<circle cx="${x}" cy="${y}" r="5" fill="${c}"/>`;
    const arrow = (x1, y1, x2, y2, c) => `<path d="M${x1} ${y1} C ${x1} ${(y1 + y2) / 2}, ${x2} ${(y1 + y2) / 2}, ${x2} ${y2}" fill="none" stroke="${c}" stroke-opacity=".7" stroke-width="1.6" stroke-dasharray="4 3"/>`;
    const svgFlow = `<svg viewBox="0 0 1000 196" style="width:100%;max-width:860px;display:block;margin:2px auto 14px">
      ${lanes.map(lane).join('')}
      ${arrow(180, 62, 220, 98, '#7bd88f')}${dot(180, 62, '#8b7bff')}${dot(220, 98, '#7bd88f')}${dot(280, 98, '#7bd88f')}${dot(340, 98, '#7bd88f')}
      ${arrow(340, 98, 390, 62, '#7bd88f')}${dot(390, 62, '#8b7bff')}
      ${arrow(430, 62, 470, 134, '#ffd166')}${dot(430, 62, '#8b7bff')}${dot(470, 134, '#ffd166')}${dot(520, 134, '#ffd166')}
      ${arrow(520, 134, 570, 26, '#ffd166')}${dot(570, 26, '#5fe0ff')}
      ${arrow(520, 134, 560, 62, '#ffd166')}
      ${arrow(640, 26, 675, 170, '#ff7bd8')}${dot(640, 26, '#5fe0ff')}${dot(675, 170, '#ff7bd8')}
      ${arrow(675, 170, 720, 26, '#ff7bd8')}${dot(720, 26, '#5fe0ff')}
      <text x="570" y="14" fill="#5fe0ff" font-size="9" font-family="Menlo,monospace">v1.0.0 🏷</text>
      <text x="716" y="14" fill="#5fe0ff" font-size="9" font-family="Menlo,monospace">v1.0.1 🏷</text>
    </svg>`;
    return svgFlow +
      `<div class="fs-d" style="font-size:12px;color:var(--gh-dim);margin:0 0 6px;line-height:1.65">
        Git flow'un tüm fikri şu: <b style="color:#fff">main hep temiz kalır</b>, iş <b style="color:#fff">dallarda</b> yapılır,
        biten iş birleştirilerek aşağıdan yukarı akar. Şemadaki her nokta bir commit, kesikli oklar dallanma/birleşmedir.</div>` +
      step(1, 'BAŞLANGIÇ — depo aç', 'Projenin kök klasöründe bir kez yapılır. develop dalı, günlük işlerin toplandığı ana gövdedir.',
        ['git init', 'git add -A && git commit -m "ilk commit"', 'git branch develop && git checkout develop']) +
      step(2, 'FEATURE — yeni iş', 'Her yeni özellik kendi dalında yaşar; yarım iş main\'i asla kirletmez. Küçük ve sık commit at.',
        ['git checkout -b feature/giris-ekrani develop', 'git add -p        # değişiklikleri seçerek ekle', 'git commit -m "feat: giriş ekranı iskeleti"']) +
      step(3, 'BİRLEŞTİR — işi gövdeye al', 'İş bitince develop\'a --no-ff ile birleştir: dalın izi tarihçede görünür kalır.',
        ['git checkout develop', 'git merge --no-ff feature/giris-ekrani', 'git branch -d feature/giris-ekrani']) +
      step(4, 'RELEASE — sürüme hazırlan', 'Sürüm dalında yalnız son rötuşlar (sürüm numarası, ufak düzeltme) yapılır; yeni özellik girmez.',
        ['git checkout -b release/1.0 develop', 'git commit -am "chore: sürüm 1.0 hazırlığı"']) +
      step(5, 'YAYINLA — etiketle', 'Sürüm main\'e birleşir ve etiketlenir; aynı düzeltmeler develop\'a da geri akar.',
        ['git checkout main && git merge --no-ff release/1.0', 'git tag -a v1.0.0 -m "ilk sürüm"', 'git checkout develop && git merge --no-ff release/1.0', 'git push origin main develop --tags']) +
      step(6, 'HOTFIX — acil yangın', 'Üründe kritik hata çıkarsa main\'den dallan, düzelt, hem main\'e hem develop\'a geri birleştir.',
        ['git checkout -b hotfix/1.0.1 main', 'git commit -am "fix: çökme düzeltildi"', 'git checkout main && git merge --no-ff hotfix/1.0.1 && git tag v1.0.1', 'git checkout develop && git merge --no-ff hotfix/1.0.1']) +
      `<div class="ghud-flow-step">
        <div class="fs-t ghud-mono"><span class="fs-n">✓</span>GÜNLÜK DÖNGÜN + İYİ COMMIT MESAJI</div>
        <div class="fs-d">Her oturumda: durumu gör → seçerek ekle → anlamlı mesajla commit'le → gönder.
        Mesaj kalıbı: <b style="color:#fff">tip: kısa emir cümlesi</b> — tipler: feat, fix, docs, refactor, chore, test.
        "düzeltmeler" değil, "fix: boş parola girişinde çökme" yaz — 6 ay sonra tarihçeyi okuyan sensin.</div>
        ${cmd('git status && git diff')}${cmd('git add -p')}${cmd('git commit -m "feat: gezegen modunda dosya arama"')}${cmd('git push')}
      </div>`;
  }

  /* ---- TAKIM AKIŞI ASİSTANI ----
     Projenin GERÇEK git durumunu (dal, bekleyen değişiklikler, mevcut dallar)
     okur ve "şu an ne yapmalıyım" sorusunu adım adım, kopyalanabilir
     komutlarla yanıtlar: feature dalı → commit → push → MR → review → merge. */

  const PROTECTED = /^(main|master|develop|dev|release\/.*)$/i;

  function slugTr(s) {
    return String(s || '')
      .toLocaleLowerCase('tr')
      .replace(/ğ/g, 'g').replace(/ü/g, 'u').replace(/ş/g, 's')
      .replace(/ı/g, 'i').replace(/ö/g, 'o').replace(/ç/g, 'c')
      .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 32);
  }

  // "src", "app" gibi taşıyıcı klasör adları dal adı olarak hiçbir şey anlatmaz
  const GENERIC = new Set(['src', 'app', 'apps', 'lib', 'libs', 'source', 'sources', 'packages',
    'components', 'component', 'pages', 'modules', 'module', 'dist', 'build', 'out',
    'test', 'tests', 'spec', 'public', 'static', 'assets', 'docs', 'doc', 'styles',
    'css', 'js', 'ts', 'utils', 'util', 'helpers', 'common', 'core', 'shared',
    'index', 'main', 'node_modules', 'vendor']);

  // Bekleyen dosyalardan anlamlı bir dal adı öner: taşıyıcı klasörleri atlayıp
  // gerçekten "neyi" değiştirdiğini anlatan ilk parçayı seçer.
  function suggestBranch(files) {
    const counts = new Map();
    for (const line of files || []) {
      const p = (line.slice(2).trim() || line.trim()).replace(/\/$/, '');
      const seg = p.split('/').filter(Boolean);
      let key = '';
      for (let i = 0; i < seg.length; i++) {
        const isLast = i === seg.length - 1;
        const raw = isLast ? seg[i].replace(/\.[^.]+$/, '') : seg[i];
        if (!GENERIC.has(raw.toLowerCase())) { key = raw; break; }
      }
      if (!key) key = seg[seg.length - 1] || '';
      key = slugTr(key);
      if (key) counts.set(key, (counts.get(key) || 0) + 1);
    }
    let best = '', bestN = 0;
    for (const [k, n] of counts) if (n > bestN) { best = k; bestN = n; }
    return best || 'yeni-is';
  }

  function teamFlowGuide() {
    const r = gitCtx.data;
    const nm = gitCtx.nm || 'proje';

    if (!r || !r.ok) {
      return `<div class="ghud-read warn">${I.alert}<div class="rx">
          Bu projede henüz bir <b>git deposu</b> yok — yani hiçbir değişiklik güvencede değil ve
          ekip arkadaşınla ortak bir tarihçen yok. Aşağıdaki tek adım bunu başlatır.</div></div>`
        + step(1, 'DEPOYU BAŞLAT', 'Projenin kökünde bir kez çalıştır. Ardından bu sekme senin gerçek durumuna göre yeniden yazılır.',
          ['git init', 'git add -A && git commit -m "chore: ilk commit"', 'git branch -M main', 'git branch develop && git checkout develop'])
        + `<div class="ghud-hint ghud-mono">SONRA: uzak depoyu bağla → git remote add origin &lt;url&gt; → git push -u origin main develop</div>`;
    }

    const br = r.branch || 'main';
    const branches = r.branches || [];
    const hasDev = branches.some(b => /^(develop|dev)$/i.test(b));
    const base = hasDev ? (branches.find(b => /^(develop|dev)$/i.test(b)) || 'develop') : (branches.indexOf('master') >= 0 && branches.indexOf('main') < 0 ? 'master' : 'main');
    const onProtected = PROTECTED.test(br);
    const dirty = r.dirty || 0;
    const fb = 'feature/' + suggestBranch(r.dirtyFiles);
    const out = [];

    /* --- 1. durum okuması: kullanıcıya nerede olduğunu söyle --- */
    let read, cls;
    if (dirty && onProtected) {
      cls = 'warn';
      read = `Şu an <b>${esc(br)}</b> dalındasın ve <b>${dirty} bekleyen değişikliğin</b> var.
        ${esc(br)} takımın ortak dalı — doğrudan buraya commit atmak ekip için en riskli davranıştır.
        Aşağıdaki 1. adım, yaptığın işi <b>kaybetmeden</b> kendi feature dalına taşır.`;
    } else if (dirty) {
      cls = '';
      read = `Şu an <b>${esc(br)}</b> feature dalındasın ve <b>${dirty} bekleyen değişikliğin</b> var.
        Doğru yerdesin — sıra bu işi anlamlı commit'lere bölüp ekibin görebileceği bir <b>MR/PR</b>'a dönüştürmekte.`;
    } else if (onProtected) {
      cls = 'ok';
      read = `<b>${esc(br)}</b> dalındasın ve çalışma alanın tertemiz. Yeni bir işe başlamanın tam zamanı:
        1. adım seni kendi dalına çıkarır, sonrası tek yönlü akış.`;
    } else {
      cls = 'ok';
      read = `<b>${esc(br)}</b> dalındasın, bekleyen değişiklik yok. İşin bittiyse 3. adımdan devam et
        (push → MR), yeni commit atacaksan 2. adıma dön.`;
    }
    out.push(`<div class="ghud-read ${cls}">${cls === 'ok' ? I.info : I.alert}<div class="rx">
      <b>${esc(nm)}</b> · durum okuması — ${read}</div></div>`);

    if (!hasDev) {
      out.push(`<div class="ghud-hint ghud-mono">NOT: Depoda <b>develop</b> dalı yok; adımlar <b>${esc(base)}</b> üzerinden kuruldu.
        Takım çalışıyorsanız develop açmanız önerilir → <code class="ghud-cmd" data-cp="git branch develop ${esc(base)} && git push -u origin develop">git branch develop ${esc(base)}</code></div>`);
    }

    /* --- 2. adımlar: duruma göre sıralı --- */
    let n = 1;
    if (dirty && onProtected) {
      out.push(step(n++, 'İŞİ KENDİ DALINA TAŞI',
        `Değişikliklerin ${esc(br)} üzerinde duruyor. <b>stash</b> ile onları geçici olarak rafa kaldır,
         güncel ${esc(base)} üzerinden yeni bir feature dalı aç, sonra işini geri al. Hiçbir şey kaybolmaz.`,
        ['git stash push -u -m "wip"',
         `git checkout ${base} && git pull --ff-only`,
         `git checkout -b ${fb} ${base}`,
         'git stash pop']));
    } else if (onProtected) {
      out.push(step(n++, 'YENİ İŞ İÇİN DAL AÇ',
        `Her iş kendi dalında yaşar. Dal adı <b>ne yaptığını</b> anlatsın: <code>feature/kisa-aciklama</code>.
         Önce ${esc(base)} dalını güncelle ki eski bir tabandan dallanmayasın.`,
        [`git checkout ${base} && git pull --ff-only`,
         `git checkout -b ${fb} ${base}`]));
    }

    out.push(step(n++, 'KÜÇÜK VE ANLAMLI COMMIT AT',
      `Tek dev commit yerine <b>okunabilir</b> commit'ler at — inceleyen kişi diff'i değil, hikâyeni okur.
       <code>git add -p</code> değişiklikleri parça parça seçmeni sağlar.
       Mesaj kalıbı: <b>tip: kısa emir cümlesi</b> (feat, fix, docs, refactor, chore, test).`,
      ['git status',
       'git add -p',
       'git commit -m "feat: ' + slugTr(nm).replace(/-/g, ' ') + ' için ilk iskelet"']));

    out.push(step(n++, 'UZAĞA GÖNDER',
      `İlk gönderimde <code>-u</code> ile dalı uzakla eşle; sonraki gönderimlerde sade <code>git push</code> yeter.
       Gönderdiğin an ekip senin ne üzerinde çalıştığını görebilir.`,
      [`git push -u origin ${onProtected ? fb : br}`]));

    out.push(step(n++, 'MR / PR AÇ — ASIL DOKÜMANTASYON BURADA',
      `Merge Request (GitLab) / Pull Request (GitHub) sadece bir birleştirme düğmesi değil;
       <b>bu değişikliğin kalıcı dokümanı</b>. 6 ay sonra "bu neden böyle yapılmış?" sorusunun cevabı burada durur.
       Aşağıdaki şablona tıklayarak kopyala ve MR açıklamasına yapıştır.`,
      [`git push -u origin ${onProtected ? fb : br}   # çıktıdaki MR bağlantısını aç`]));
    out.push(mrTemplate(nm, onProtected ? fb : br, base));

    out.push(step(n++, 'İNCELEME (REVIEW) — ekip devreye girer',
      `En az bir kişi onaylamadan birleştirme yapılmaz. Gelen yorumlara <b>yeni commit</b> ile cevap ver
       (geçmişi yeniden yazma); tartışma MR üzerinde kalsın ki karar kaydı korunsun.
       Bu arada taban dal ilerlediyse dalını güncelle:`,
      [`git fetch origin && git rebase origin/${base}`,
       'git push --force-with-lease   # rebase sonrası güvenli gönderim']));

    out.push(step(n++, 'BİRLEŞTİR VE TEMİZLE',
      `Onay geldiyse MR'ı arayüzden birleştir (<b>squash</b> ya da <b>--no-ff</b> — takım kuralınız neyse).
       Ardından yerelini topla: biten dal silinir, ${esc(base)} güncellenir. Dal mezarlığı bırakma.`,
      [`git checkout ${base} && git pull --ff-only`,
       `git branch -d ${onProtected ? fb : br}`,
       `git push origin --delete ${onProtected ? fb : br}`]));

    /* --- 3. bekleyen dosyalar: neyi commit'leyeceğini göster --- */
    if (dirty) {
      out.push(`<div class="ghud-flow-step">
        <div class="fs-t ghud-mono"><span class="fs-n">✎</span>BEKLEYEN DEĞİŞİKLİKLERİN (${dirty})</div>
        <div class="fs-d">Bu dosyalar henüz hiçbir yerde kayıtlı değil. Tek bir commit'e tıkıştırma —
          birbiriyle ilgisiz olanları ayrı commit'lere böl.</div>
        ${(r.dirtyFiles || []).slice(0, 14).map(dirtyBadge).join('')}
        ${(r.dirtyFiles || []).length > 14 ? `<div class="ghud-hint ghud-mono">+${(r.dirtyFiles || []).length - 14} dosya daha…</div>` : ''}
      </div>`);
    }

    /* --- 4. takım kuralları kartları --- */
    out.push(`<div class="ghud-g-grid" style="margin-top:14px">
      <div class="ghud-g-card"><div class="t ghud-mono">DAL ADLANDIRMA</div><div class="d">
        <b>feature/</b>yeni-özellik · <b>fix/</b>hata-adı · <b>hotfix/</b>1.0.1 · <b>release/</b>1.2<br>
        Türkçe karakter ve boşluk kullanma; tire ile ayır.</div></div>
      <div class="ghud-g-card"><div class="t ghud-mono">COMMIT MESAJI</div><div class="d">
        <b>tip: kısa emir cümlesi</b> — "düzeltmeler" değil,
        <b>fix: boş parola girişinde çökme</b>. Gövdede <i>neden</i>i anlat, <i>ne</i>yi diff zaten söyler.</div></div>
      <div class="ghud-g-card"><div class="t ghud-mono">MR BOYUTU</div><div class="d">
        400 satırdan büyük MR ciddi incelenmez. İş büyükse <b>parçala</b>:
        önce iskelet, sonra davranış, sonra testler.</div></div>
      <div class="ghud-g-card"><div class="t ghud-mono">ASLA</div><div class="d">
        Korumalı dala doğrudan push, <b>force push</b> (paylaşılan dalda),
        sırların (.env, anahtar) commit'lenmesi, "wip" mesajıyla merge.</div></div>
    </div>`);

    return out.join('');
  }

  function mrTemplate(proj, branch, base) {
    const tpl = [
      '## Ne yapıldı',
      '- ' + proj + ' için <kısa özet>',
      '',
      '## Neden',
      '<hangi ihtiyaç / hata / karar bu değişikliği gerektirdi>',
      '',
      '## Nasıl test edilir',
      '1. <adım>',
      '2. <beklenen sonuç>',
      '',
      '## Etki / risk',
      '- Geriye dönük uyumluluk: <var/yok>',
      '- Göç (migration) gerekiyor mu: <evet/hayır>',
      '',
      '## Kontrol listesi',
      '- [ ] Kendi diff\'imi baştan sona okudum',
      '- [ ] Yeni davranış için test/deneme yaptım',
      '- [ ] README / dokümantasyon güncellendi',
      '- [ ] Sır (anahtar, parola, .env) sızmıyor',
      '',
      'Dal: `' + branch + '` → `' + base + '`'
    ].join('\n');
    return `<div class="ghud-hint ghud-mono">MR / PR AÇIKLAMA ŞABLONU — TIKLA, PANOYA KOPYALANSIN</div>
      <div class="ghud-tpl" data-cp="${esc(tpl)}">${esc(tpl)}</div>`;
  }

  let gitCtx = { id: null, nm: '', data: null, tab: 'durum' };

  function renderGitCenter() {
    const r = gitCtx.data;
    const tabs = `<div class="ghud-tabs" style="margin-bottom:12px">
      <span class="ghud-tab-btn ghud-mono ${gitCtx.tab === 'durum' ? 'on' : ''}" data-gtab="durum">DURUM</span>
      <span class="ghud-tab-btn ghud-mono ${gitCtx.tab === 'takim' ? 'on' : ''}" data-gtab="takim">TAKIM AKIŞI</span>
      <span class="ghud-tab-btn ghud-mono ${gitCtx.tab === 'gecmis' ? 'on' : ''}" data-gtab="gecmis">GEÇMİŞ</span>
      <span class="ghud-tab-btn ghud-mono ${gitCtx.tab === 'rehber' ? 'on' : ''}" data-gtab="rehber">GIT FLOW REHBERİ</span>
    </div>`;
    let body = '';
    if (gitCtx.tab === 'takim') {
      body = teamFlowGuide();
    } else if (gitCtx.tab === 'rehber') {
      body = gitFlowGuide();
    } else if (!r || !r.ok) {
      body = `<div class="ghud-empty">Bu projede git deposu yok. REHBER sekmesindeki 1. adımla saniyeler içinde açabilirsin — o andan itibaren her değişikliğin güvenceye girer.</div>`;
    } else if (gitCtx.tab === 'durum') {
      body = `<div class="ghud-git-head">
          <span class="ghud-git-branch ghud-mono">${I.branch}${esc(r.branch)}</span>
          ${(r.branches || []).filter(b => b !== r.branch).slice(0, 6).map(b => `<span class="ghud-chip ghud-mono">${esc(b)}</span>`).join('')}
          <span style="flex:1"></span>
          <span class="ghud-chip ghud-mono">30g: ${r.activity30 || 0} commit</span>
        </div>` +
        (r.dirty
          ? `<div class="ghud-read warn">${I.alert}<div class="rx">
                <b>${r.dirty} bekleyen değişiklik</b> — bunlar henüz ne commit'lendi ne de ekibin görebildiği bir yerde.
                Bu işi baştan sona nasıl teslim edeceğini (dal aç → commit → push → MR → review → merge)
                senin gerçek durumuna göre adım adım anlatan bir rehber hazır.
                <div style="margin-top:9px"><span class="ghud-btn" data-gtab="takim">${I.book}<span style="margin-left:6px">TAKIM AKIŞINI AÇ</span></span></div>
             </div></div>`
            + (r.dirtyFiles || []).map(dirtyBadge).join('')
          : `<div class="ghud-read ok">${I.info}<div class="rx">
                <b>✓ Çalışma alanı temiz</b> — her şey commit'lenmiş durumda.
                Yeni bir işe başlayacaksan <b>TAKIM AKIŞI</b> sekmesi doğru dalı açmanla başlayan akışı gösterir.</div></div>`);
    } else {
      body = gitTimeline(r.commits || []);
    }
    popOpen(I.branch, 'GİT MERKEZİ — ' + (gitCtx.nm || ''), tabs + body);
    $('#ghud-pop').classList.add('wide');
  }

  async function showGit(id, nm) {
    gitCtx = { id, nm, data: null, tab: 'durum' };
    try { gitCtx.data = await window.galaxy.gitLog(id); } catch (e) {}
    renderGitCenter();
  }

  /* ---- yedekler ---- */
  async function showBackups() {
    let list = [];
    try { list = await window.galaxy.backupList(); } catch (e) {}
    popOpen(I.archive, 'YEDEKLER — SON 14 GÜN', list.length
      ? `<div class="fs-d" style="font-size:11.5px;color:var(--gh-dim);margin-bottom:8px">Her gün ilk kayıttan önce otomatik yedek alınır. Geri yüklemede mevcut veri de güvenlik kopyası olarak saklanır ve uygulama yeniden başlar.</div>`
        + list.map(b => `<div class="ghud-rep ghud-mono" style="cursor:default">${I.archive}
          <span style="flex:1">${esc(b.date)}</span>
          <span style="color:var(--gh-faint);font-size:10px">${(b.size / 1024).toFixed(1)} KB</span>
          <span class="ghud-btn" data-restore="${esc(b.name)}" style="padding:4px 11px">GERİ YÜKLE</span></div>`).join('')
      : '<div class="ghud-empty">Henüz yedek yok — ilk veri değişikliğinde otomatik oluşur.</div>');
  }

  /* ---- ⌘K komut paleti ---- */
  let palSel = 0;

  function palItems(q) {
    const norm = s => String(s || '').toLocaleLowerCase('tr');
    const nq = norm(q).trim();
    const cmds = [
      { kind: 'cmd', act: 'overview', icon: I.rocket, label: 'Genel Bakış', hint: 'evren kartları · panorama' },
      { kind: 'cmd', act: 'docker', icon: I.box, label: 'Docker Merkezi', hint: 'konteyner · imaj · log' },
      { kind: 'cmd', act: 'servers', icon: I.server, label: 'Sunucu Merkezi', hint: 'uzak evren · SSH' },
      { kind: 'cmd', act: 'guide', icon: I.book, label: 'Seyir Rehberi', hint: 'görselli tanıtım · F1' },
      { kind: 'cmd', act: 'crew', icon: I.rocket, label: 'Görev Mürettebatı', hint: 'ajanlar ne yapar' },
      { kind: 'cmd', act: 'takim', icon: I.branch, label: 'Takım Akışı', hint: 'dal · commit · MR' },
      { kind: 'cmd', act: 'settings', icon: I.gear, label: 'Ayarlar', hint: 'profil · dil · eşikler' },
      { kind: 'cmd', act: 'backups', icon: I.archive, label: 'Yedekler', hint: 'geri yükleme' },
      { kind: 'cmd', act: 'gitguide', icon: I.book, label: 'Git Flow Rehberi', hint: 'öğretici' },
      { kind: 'cmd', act: 'kisayol', icon: I.info, label: 'Kısayol Haritası', hint: 'tüm kısayollar' }
    ].filter(c => !nq || norm(c.label).includes(nq) || norm(c.hint).includes(nq));
    const projs = cache.projects
      .filter(p => !nq || norm(p.name).includes(nq) || norm(p.group).includes(nq))
      .slice(0, 8)
      .map(p => ({ kind: 'proj', p }));
    return [...projs, ...cmds].slice(0, 10);
  }

  function renderPal() {
    const q = $('#ghud-pal input').value;
    const items = palItems(q);
    if (palSel >= items.length) palSel = Math.max(0, items.length - 1);
    $('#ghud-pal .plist').innerHTML = items.length ? items.map((it, i) => it.kind === 'proj'
      ? `<div class="ghud-pi ${i === palSel ? 'sel' : ''}" data-pi="${i}">
          <span class="pic2">${I.rocket}</span>
          <span class="nm2">${esc(it.p.name)}</span>
          <span class="gr2 ghud-mono">${esc(it.p.group || '')}</span>
          <span class="acts ghud-mono"><span data-pact="git" data-pid="${esc(it.p.id)}" data-pnm="${esc(it.p.name)}">GİT</span><span data-pact="folder" data-pp="${esc(it.p.path)}">KLASÖR</span><span data-pact="readme" data-pp="${esc(it.p.path)}" data-pnm="${esc(it.p.name)}">README</span></span>
        </div>`
      : `<div class="ghud-pi ${i === palSel ? 'sel' : ''}" data-pi="${i}">
          <span class="pic2">${it.icon}</span>
          <span class="nm2">${esc(it.label)}</span>
          <span class="gr2 ghud-mono">${esc(it.hint)}</span>
        </div>`).join('')
      : '<div class="ghud-empty" style="padding:12px">Sonuç yok.</div>';
  }

  function palOpen() {
    palSel = 0;
    if (!cache.projects.length) refresh();
    $('#ghud-pal').classList.add('open');
    const inp = $('#ghud-pal input');
    inp.value = '';
    renderPal();
    setTimeout(() => inp.focus(), 30);
  }
  function palClose() { $('#ghud-pal').classList.remove('open'); }

  async function palRun(it) {
    palClose();
    if (!it) return;
    if (it.kind === 'proj') { showGit(it.p.id, it.p.name); return; }
    if (it.act === 'settings') { try { window.galaxy.openSettings(); } catch (e) {} }
    else if (it.act === 'backups') showBackups();
    else if (it.act === 'overview') openOverview();
    else if (it.act === 'docker') openDocker();
    else if (it.act === 'servers') openServers();
    else if (it.act === 'guide') openGuide('neden');
    else if (it.act === 'crew') openGuide('crew');
    else if (it.act === 'kisayol') openGuide('kisayol');
    else if (it.act === 'takim') openGitCenterFromTab('takim');
    else if (it.act === 'gitguide') { gitCtx = { id: null, nm: 'REHBER', data: null, tab: 'rehber' }; renderGitCenter(); }
  }

  async function showReadmePreview(p, nm) {
    let r = null;
    try { r = await window.galaxy.readme(p); } catch (e) {}
    popOpen(I.doc, nm + ' · ' + (r ? r.name : 'README'), r ? mdLite(r.content) : '<div class="ghud-empty">README yok.</div>');
  }

  /* ============ 4.5 README OLUŞTUR (DOCUMENTOR enjeksiyonu) ============ */
  // Gezegen modunda sağ paneldeki "README BULUNAMADI" yazısını yakalar,
  // yanına düğme ekler; düğme DOCUMENTOR ajanını o projede çalıştırıp
  // README.md'yi otomatik yazdırır ve süreci canlı gösterir.

  let agentSink = null;           // aktif README akışının dinleyicisi
  let agentHooked = false;

  function hookAgentStream() {
    if (agentHooked || !window.galaxy.onAgent) return;
    agentHooked = true;
    try { window.galaxy.onAgent(m => { if (agentSink) agentSink(m); }); } catch (e) {}
  }

  function currentProject() {
    // Açık gezegeni, sayfada birebir görünen proje adından bul (üst bar / KAYIT paneli)
    const byName = new Map();
    for (const p of cache.projects) if (!byName.has(p.name)) byName.set(p.name, p);
    let best = null, bestTop = Infinity;
    const els = document.body.querySelectorAll('div,span,a,b,strong,h1,h2,h3');
    for (const el of els) {
      if (el.children.length) continue;
      if (el.closest && el.closest('#ghud-dock,#ghud-pop,#ghud-tab')) continue;
      const t = (el.textContent || '').trim();
      if (!t || !byName.has(t)) continue;
      let top = 0;
      try { top = el.getBoundingClientRect().top; } catch (e) {}
      if (top < bestTop) { bestTop = top; best = byName.get(t); }
    }
    return best;
  }

  async function generateReadme(btn) {
    if (!cache.projects.length) await refresh();
    const proj = currentProject();
    if (!proj) { btn.textContent = 'PROJE SAPTANAMADI — HUD PANELİNİ AÇIP TEKRAR DENE'; return; }
    let agents = [];
    try { agents = await window.galaxy.agentsFull(); } catch (e) {}
    const doc = agents.find(a => a.write) || agents.find(a => /doc/i.test(a.id) || /doc/i.test(a.name || '')) || agents[0];
    if (!doc) { btn.textContent = 'AJAN BULUNAMADI'; return; }

    hookAgentStream();
    const runId = 'ghud-readme-' + Date.now();
    popOpen(I.doc, (doc.name || 'DOCUMENTOR') + ' · README YAZILIYOR — ' + proj.name,
      '<div id="ghud-rdm-stream" class="ghud-mono" style="font-size:11px;white-space:pre-wrap;line-height:1.6"></div>');
    const stream = () => $('#ghud-rdm-stream');
    const append = (txt, dim) => {
      const el = stream(); if (!el) return;
      const line = document.createElement('div');
      if (dim) line.style.color = 'var(--gh-faint)';
      line.textContent = txt;
      el.appendChild(line);
      el.parentElement.scrollTop = el.parentElement.scrollHeight;
    };
    agentSink = m => {
      if (m.runId !== runId) return;
      if (m.kind === 'text' || m.kind === 'result') append(m.text);
      else if (m.kind === 'tool') append('⚙ ' + m.text, true);
      else if (m.kind === 'err') append('! ' + m.text, true);
      else if (m.kind === 'done') {
        append('');
        append('✓ Tamamlandı — gezegenden çıkıp yeniden girince README sağ panelde görünür.');
        agentSink = null;
        btn.textContent = 'README OLUŞTURULDU ✓';
      }
    };
    btn.textContent = 'YAZILIYOR…';
    const prompt = 'Bu projenin klasöründesin. Önce kodu ve dosyaları hızlıca incele, sonra projenin GERÇEK durumunu yansıtan kapsamlı bir README.md yazıp projenin köküne README.md adıyla KAYDET. Bölümler: proje adı + tek cümle özet, ne işe yarar, kurulum, kullanım, klasör yapısı, durum ve yol haritası. Var olmayan özellik uydurma. Türkçe yaz.';
    let r = null;
    try { r = await window.galaxy.agentRun({ runId, agentId: doc.id, projectId: proj.id, prompt }); } catch (e) { r = { ok: false, error: String(e) }; }
    if (!r || !r.ok) {
      append('! Başlatılamadı: ' + ((r && r.error) || 'bilinmeyen hata'));
      agentSink = null;
      btn.textContent = 'README OLUŞTUR';
    }
  }

  function injectReadmeButton() {
    const els = document.body.querySelectorAll('div,span,p');
    for (const el of els) {
      if (el.children.length) continue;
      if (el.closest && el.closest('#ghud-dock,#ghud-pop,#ghud-tab')) continue;
      const t = trFold((el.textContent || '').trim());
      if (t !== trFold('readme bulunamadı')) continue;
      if (el.dataset.ghudReadme) continue;
      el.dataset.ghudReadme = '1';
      const btn = document.createElement('span');
      btn.className = 'ghud-btn';
      btn.style.marginTop = '10px';
      btn.style.display = 'inline-flex';
      btn.innerHTML = I.doc + '<span style="margin-left:6px">README OLUŞTUR</span>';
      btn.title = 'DOCUMENTOR ajanı bu projeye README yazsın';
      btn.addEventListener('click', () => generateReadme(btn));
      el.insertAdjacentElement('afterend', btn);
    }
  }

  /* ============ 4.6 README TABLO DÖNÜŞTÜRÜCÜ ============ */
  // Uygulamanın markdown çevirici tablo desteklemiyor: "| a | b |" satırları
  // düz <p> olarak kalıyor. Ardışık tablo paragraflarını gerçek <table>'a çevirir.
  function enhanceReadmeTables() {
    for (const md of document.querySelectorAll('.md')) {
      let group = [];
      const isSepRow = html => {
        const t = html.replace(/<[^>]*>/g, '').trim();
        return /^\|?[\s:|-]+\|?$/.test(t) && t.indexOf('-') >= 0;
      };
      const cells = html => {
        let t = html.trim();
        if (t.startsWith('|')) t = t.slice(1);
        if (t.endsWith('|')) t = t.slice(0, -1);
        return t.split('|').map(c => c.trim());
      };
      const flush = () => {
        if (group.length >= 2) {
          const rows = group.map(p => p.innerHTML.trim());
          let header = null, bodyRows = [];
          if (rows.length >= 2 && isSepRow(rows[1])) { header = cells(rows[0]); bodyRows = rows.slice(2); }
          else bodyRows = rows;
          bodyRows = bodyRows.filter(r => !isSepRow(r));
          const tbl = document.createElement('table');
          tbl.className = 'ghud-tbl';
          if (header && header.some(c => c.replace(/<[^>]*>/g, '').trim())) {
            const tr = document.createElement('tr');
            for (const c of header) { const th = document.createElement('th'); th.innerHTML = c; tr.appendChild(th); }
            tbl.createTHead().appendChild(tr);
          }
          const tb = tbl.createTBody();
          const width = header ? header.length : 0;
          for (const r of bodyRows) {
            const tr = document.createElement('tr');
            const cs = cells(r);
            while (width && cs.length < width) cs.push('');
            for (const c of cs) { const td = document.createElement('td'); td.innerHTML = c; tr.appendChild(td); }
            tb.appendChild(tr);
          }
          if (tb.children.length) { group[0].before(tbl); group.forEach(p => p.remove()); }
        }
        group = [];
      };
      for (const el of Array.from(md.children)) {
        const txt = (el.textContent || '').trim();
        if (el.tagName === 'P' && txt.startsWith('|') && txt.split('|').length >= 3) group.push(el);
        else flush();
      }
      flush();
    }
  }

  /* ---- sol paneldeki ⎇ GİT sekmesine doğal entegrasyon ----
     Uygulamanın kendi git sekmesi açıldığında en üste iki düğme eklenir:
     GIT FLOW REHBERİ (öğretici) ve GİT MERKEZİ (durum + zaman çizelgesi). */
  function injectGitButtons() {
    const els = document.body.querySelectorAll('div,span');
    for (const el of els) {
      if (el.children.length) continue;
      if (el.closest && el.closest('#ghud-dock,#ghud-pop,#ghud-tab,#ghud-pal')) continue;
      const t = trFold((el.textContent || '').trim());
      const hit = t.startsWith(trFold('commit akışı')) || t === trFold('git deposu yok') || t === trFold('henüz commit yok')
        || t.startsWith(trFold('git geçmişi okunuyor')) || t === trFold('bekleyen değişiklikler');
      if (!hit) continue;
      const host = (el.closest && el.closest('.overflow-y-auto')) || el.parentElement;
      if (!host || host.dataset.ghudGit) continue;
      host.dataset.ghudGit = '1';
      const bar = document.createElement('div');
      bar.style.cssText = 'display:flex;gap:8px;margin:2px 0 12px;flex-wrap:wrap';
      bar.innerHTML = `<span class="ghud-btn" data-ghudgit="takim" title="Bu değişiklikleri ekiple nasıl teslim ederim — adım adım">${I.branch}<span style="margin-left:6px">TAKIM AKIŞI</span></span>
        <span class="ghud-btn" data-ghudgit="durum" title="Durum + commit zaman çizelgesi">${I.clock}<span style="margin-left:6px">GİT MERKEZİ</span></span>
        <span class="ghud-btn" data-ghudgit="rehber" title="Git flow'u sıfırdan öğren">${I.book}<span style="margin-left:6px">GIT FLOW REHBERİ</span></span>`;
      host.insertBefore(bar, host.firstChild);
    }
  }

  async function openGitCenterFromTab(tab) {
    if (!cache.projects.length) await refresh();
    const proj = currentProject();
    gitCtx = { id: proj ? proj.id : null, nm: proj ? proj.name : 'REHBER', data: null, tab };
    if (proj) { try { gitCtx.data = await window.galaxy.gitLog(proj.id); } catch (e) {} }
    renderGitCenter();
  }

  /* Üst bardaki ⛁ DB · ⏱ ZAMANLAYICI düğmelerinin yanına ⛴ DOCKER ekler.
     Uygulamanın kendi .gbtn sınıfını kullanır, böylece yerleşik durur. */
  function injectDockerButton() {
    for (const btn of document.querySelectorAll('button.gbtn')) {
      if (trFold((btn.textContent || '').trim()) !== trFold('⏱ ZAMANLAYICI')) continue;
      const bar = btn.parentElement;
      if (!bar || bar.querySelector('[data-ghuddocker]')) continue;
      const b = document.createElement('button');
      b.className = 'gbtn';
      b.setAttribute('data-ghuddocker', '1');
      b.textContent = '⛴ DOCKER';
      b.title = 'Docker Merkezi — konteynerler, imajlar, loglar';
      btn.insertAdjacentElement('afterend', b);

      const sv = document.createElement('button');
      sv.className = 'gbtn';
      sv.setAttribute('data-ghudservers', '1');
      sv.textContent = '🖧 SUNUCULAR';
      sv.title = 'Sunucu Merkezi — uzak sunucuları evren olarak ekle (SSH)';
      b.insertAdjacentElement('afterend', sv);
    }
  }

  // Marka sürümünü referans tasarımla hizala: "GALAXY v2" → "GALAXY v2.3"
  // (package.json 2.3.7 ile tutarlı). index.html'e dokunmadan, DOM'daki sürüm etiketini günceller.
  function injectBrandVersion() {
    for (const s of document.querySelectorAll('.hud-label, span')) {
      if (s.dataset.ghVer) continue;
      const t = (s.textContent || '').trim();
      if (t !== 'v2' && t !== 'V2') continue;
      const p = s.parentElement;
      if (p && /GALAXY/i.test(p.textContent || '')) { s.dataset.ghVer = '1'; s.textContent = 'v2.3'; }
    }
  }

  function enhanceAll() {
    try { injectBrandVersion(); } catch (e) {}
    try { injectOverviewTrigger(); } catch (e) {}
    try { injectDockerButton(); } catch (e) {}
    try { injectReadmeButton(); } catch (e) {}
    try { injectGitButtons(); } catch (e) {}
    try { enhanceReadmeTables(); } catch (e) {}
    try { injectAgentUI(); } catch (e) {}
  }

  function watchReadmePanel() {
    enhanceAll();
    try {
      const mo = new MutationObserver(() => {
        clearTimeout(watchReadmePanel._t);
        watchReadmePanel._t = setTimeout(enhanceAll, 250);
      });
      mo.observe(document.body, { childList: true, subtree: true });
    } catch (e) {}
    setInterval(enhanceAll, 2500); // gözlemci kaçırırsa emniyet ağı
  }

  /* ================= 4.65 DOCKER MERKEZİ =================
     Docker Desktop'ın günlük işleri: konteyner ve imaj listesi, başlat/durdur/
     yeniden başlat/sil, canlı loglar ve alan temizliği — hepsi düğmelerle.
     Yalnızca preload'daki docker* API'sini kullanır; komut metni üretmez. */

  let dkCtx = { tab: 'con', all: false, busy: null, status: null, logId: null, logName: '' };
  let dkTimer = null;

  const dkFmtPorts = (ports) => {
    if (!ports) return '';
    // "0.0.0.0:8080->80/tcp, :::8080->80/tcp" → tıklanabilir 8080
    const seen = new Set(), out = [];
    for (const part of String(ports).split(',')) {
      const m = part.match(/(?:0\.0\.0\.0|127\.0\.0\.1|\[::\]|:::)?:?(\d+)->/);
      if (m && !seen.has(m[1])) {
        seen.add(m[1]);
        out.push(`<span class="ghud-port ghud-mono" data-dkport="${esc(m[1])}" title="Tarayıcıda aç">:${esc(m[1])} ⇗</span>`);
      }
    }
    return out.join('');
  };

  const dkStateCls = s => /^running$/i.test(s) ? 'run' : (/^paused$/i.test(s) ? 'pause'
    : (/^(exited|dead)$/i.test(s) ? 'exit' : ''));

  function dkBtn(icon, act, id, title, cls) {
    return `<span class="ghud-ib ${cls || ''}" data-dkact="${act}" data-dkid="${esc(id)}" title="${esc(title)}">${icon}</span>`;
  }

  async function dkRefresh(silent) {
    if (!silent) $('#ghud-pop .pb') && renderDocker(true);
    try {
      dkCtx.status = await window.galaxy.dockerStatus();
      if (dkCtx.status && dkCtx.status.ok) {
        if (dkCtx.tab === 'con') {
          const r = await window.galaxy.dockerPs(dkCtx.all);
          dkCtx.containers = r && r.ok ? r.containers : [];
          dkCtx.err = r && r.ok ? null : (r && r.error);
        } else if (dkCtx.tab === 'img') {
          const r = await window.galaxy.dockerImages();
          dkCtx.images = r && r.ok ? r.images : [];
          dkCtx.err = r && r.ok ? null : (r && r.error);
        }
      }
    } catch (e) { dkCtx.err = String(e && e.message || e); }
    renderDocker();
  }

  function dkStatusBar() {
    const s = dkCtx.status || {};
    if (!s.ok) return '';
    return `<div class="ghud-dk-head">
      <span class="ghud-dk-stat ghud-mono"><span class="dot"></span>MOTOR <b>${esc(s.server || '?')}</b></span>
      <span class="ghud-dk-stat ghud-mono">${I.box}<b>${s.containersRunning || 0}</b>/${s.containers || 0} konteyner</span>
      <span class="ghud-dk-stat ghud-mono">${I.layers}<b>${s.images || 0}</b> imaj</span>
      <span style="flex:1"></span>
      ${dkCtx.tab === 'con' ? `<span class="ghud-ib wide ghud-mono ${dkCtx.all ? 'go' : ''}" data-dkact="toggleAll" data-dkid="-"
          title="Durmuş konteynerleri de göster">${dkCtx.all ? 'TÜMÜ' : 'ÇALIŞANLAR'}</span>` : ''}
      <span class="ghud-ib" data-dkact="refresh" data-dkid="-" title="Yenile">${I.refresh}</span>
      <span class="ghud-ib wide ghud-mono danger" data-dkact="prune" data-dkid="-"
        title="Kullanılmayan konteyner/imaj/volume'leri sil">${I.broom}<span style="margin-left:5px">TEMİZLE</span></span>
    </div>`;
  }

  function dkContainers() {
    const list = dkCtx.containers || [];
    if (!list.length) {
      return `<div class="ghud-dk-empty"><div class="big">${dkCtx.all ? 'Hiç konteyner yok.' : 'Çalışan konteyner yok.'}</div>
        <div class="sm">${dkCtx.all
          ? 'Bir imajdan konteyner başlattığında burada görünecek.'
          : 'Durmuş konteynerleri de görmek için üstteki <b>ÇALIŞANLAR</b> düğmesine bas.'}</div></div>`;
    }
    return list.map(c => {
      const running = /^running$/i.test(c.state);
      const paused = /^paused$/i.test(c.state);
      const acts = [
        running
          ? dkBtn(I.stop, 'stop', c.id, 'Durdur', 'danger')
          : dkBtn(I.play, 'start', c.id, 'Başlat', 'go'),
        running ? dkBtn(paused ? I.play : I.pause, paused ? 'unpause' : 'pause', c.id, paused ? 'Sürdür' : 'Duraklat') : '',
        dkBtn(I.refresh, 'restart', c.id, 'Yeniden başlat'),
        dkBtn(I.terminal, 'logs', c.id, 'Logları göster'),
        dkBtn(I.trash, 'rm', c.id, 'Konteyneri sil', 'danger')
      ].join('');
      return `<div class="ghud-row" data-dkname="${esc(c.name)}">
        <span class="sdot ${dkStateCls(c.state)}"></span>
        <div class="col">
          <div class="nm">${esc(c.name)}</div>
          <div class="meta ghud-mono">${esc(c.image)} · ${esc(c.status)}${c.compose ? ' · ⛴ ' + esc(c.compose) : ''}</div>
        </div>
        <div style="flex:none;max-width:220px;text-align:right">${dkFmtPorts(c.ports)}</div>
        <div class="acts">${acts}</div>
      </div>`;
    }).join('');
  }

  function dkImages() {
    const list = dkCtx.images || [];
    if (!list.length) return `<div class="ghud-dk-empty"><div class="big">İmaj yok.</div>
      <div class="sm">Bir imaj indirdiğinde (<code>docker pull</code>) ya da kendin derlediğinde burada listelenir.</div></div>`;
    return list.map(im => {
      const ref = im.dangling ? im.id : (im.repo + ':' + im.tag);
      return `<div class="ghud-row">
        <span class="sdot ${im.dangling ? 'exit' : 'run'}"></span>
        <div class="col">
          <div class="nm">${esc(im.dangling ? '<isimsiz imaj>' : im.repo)}${im.dangling ? '' : `<span style="color:var(--gh-cy);font-weight:400"> :${esc(im.tag)}</span>`}</div>
          <div class="meta ghud-mono">${esc(im.id.slice(0, 19))} · ${esc(im.size)} · ${esc(im.created)}</div>
        </div>
        <div class="acts">${dkBtn(I.trash, 'rmi', ref, 'İmajı sil', 'danger')}</div>
      </div>`;
    }).join('');
  }

  function dkNotReady() {
    const s = dkCtx.status || {};
    if (s.mas) {
      return `<div class="ghud-dk-empty"><div class="big">Docker, App Store sürümünde kullanılamıyor</div>
        <div class="sm">${esc(s.error || '')}</div></div>`;
    }
    if (s.installed === false) {
      return `<div class="ghud-dk-empty"><div class="big">Docker kurulu değil</div>
        <div class="sm">${esc(s.error || '')}</div></div>`;
    }
    return `<div class="ghud-dk-empty">
      <div class="big">Docker motoru çalışmıyor</div>
      <div class="sm">Docker Desktop kapalıyken konteynerler listelenemez.
        Aşağıdaki düğme Docker Desktop'ı başlatır; motor hazır olduğunda (birkaç saniye)
        <b>Yenile</b>'ye bas.</div>
      <span class="ghud-btn" data-dkact="up" data-dkid="-">${I.play}<span style="margin-left:6px">DOCKER DESKTOP'I BAŞLAT</span></span>
      <span class="ghud-btn" data-dkact="refresh" data-dkid="-" style="margin-left:8px">${I.refresh}<span style="margin-left:6px">YENİLE</span></span>
    </div>`;
  }

  function renderDocker(loading) {
    const tabs = `<div class="ghud-tabs" style="margin-bottom:12px">
      <span class="ghud-tab-btn ghud-mono ${dkCtx.tab === 'con' ? 'on' : ''}" data-dktab="con">KONTEYNERLER</span>
      <span class="ghud-tab-btn ghud-mono ${dkCtx.tab === 'img' ? 'on' : ''}" data-dktab="img">İMAJLAR</span>
      ${dkCtx.logId ? `<span class="ghud-tab-btn ghud-mono ${dkCtx.tab === 'log' ? 'on' : ''}" data-dktab="log">LOG · ${esc(dkCtx.logName)}</span>` : ''}
    </div>`;
    let body;
    if (loading && !dkCtx.status) body = '<div class="ghud-empty">Docker durumu okunuyor…</div>';
    else if (!dkCtx.status || !dkCtx.status.ok) body = dkNotReady();
    else if (dkCtx.err) body = `<div class="ghud-read warn">${I.alert}<div class="rx">${esc(dkCtx.err)}</div></div>`;
    else if (dkCtx.tab === 'log') body = `<div class="ghud-logs">${esc(dkCtx.logs || 'Log yok.')}</div>`;
    else body = (dkCtx.tab === 'con' ? dkContainers() : dkImages());

    popOpen(I.box, 'DOCKER MERKEZİ', tabs + (dkCtx.status && dkCtx.status.ok ? dkStatusBar() : '') + body);
    $('#ghud-pop').classList.add('wide');
  }

  async function openDocker() {
    dkCtx = { tab: 'con', all: false, busy: null, status: null, logId: null, logName: '' };
    renderDocker(true);
    await dkRefresh(true);
    clearInterval(dkTimer);
    dkTimer = setInterval(() => {
      const open = $('#ghud-pop').classList.contains('open');
      if (!open) { clearInterval(dkTimer); dkTimer = null; return; }
      if (dkCtx.tab !== 'log') dkRefresh(true);
    }, 5000);
  }

  async function dkDo(act, id, el) {
    if (el) el.classList.add('busy');
    try {
      if (act === 'refresh') { await dkRefresh(true); return; }
      if (act === 'toggleAll') { dkCtx.all = !dkCtx.all; await dkRefresh(true); return; }
      if (act === 'up') {
        const r = await window.galaxy.dockerStart();
        if (!r || !r.ok) { dkCtx.err = (r && r.error) || 'başlatılamadı'; renderDocker(); return; }
        dkCtx.status = { ok: false, installed: true, running: false, error: 'Docker Desktop başlatılıyor — motor hazır olunca Yenile\'ye bas.' };
        renderDocker();
        return;
      }
      if (act === 'logs') {
        const row = el && el.closest('.ghud-row');
        dkCtx.logId = id;
        dkCtx.logName = row ? (row.dataset.dkname || id.slice(0, 12)) : id.slice(0, 12);
        dkCtx.tab = 'log';
        renderDocker(true);
        const r = await window.galaxy.dockerLogs({ id, tail: 400 });
        dkCtx.logs = r && r.ok ? (r.logs || '(boş)') : ('Log okunamadı: ' + ((r && r.error) || ''));
        renderDocker();
        return;
      }
      if (act === 'prune') {
        if (!confirm('Kullanılmayan konteynerler, imajlar ve volume\'ler kalıcı olarak silinecek.\n\nÇalışan konteynerlere ve onların kullandığı imajlara dokunulmaz. Devam edilsin mi?')) return;
        const out = [];
        for (const kind of ['containers', 'images', 'volumes']) {
          const r = await window.galaxy.dockerPrune(kind);
          out.push(kind + ': ' + (r && r.ok ? (r.out || 'temiz') : ('hata — ' + ((r && r.error) || ''))));
        }
        alert('Temizlik tamamlandı\n\n' + out.join('\n'));
        await dkRefresh(true);
        return;
      }
      if (act === 'rm' || act === 'rmi') {
        const what = act === 'rm' ? 'Konteyner' : 'İmaj';
        if (!confirm(what + ' kalıcı olarak silinecek:\n\n' + id + '\n\nDevam edilsin mi?')) return;
      }
      const r = act === 'rmi'
        ? await window.galaxy.dockerImageAction({ action: 'rm', id })
        : await window.galaxy.dockerAction({ action: act, id });
      if (!r || !r.ok) {
        dkCtx.err = (r && r.error) || 'eylem başarısız';
        renderDocker();
        setTimeout(() => { dkCtx.err = null; dkRefresh(true); }, 2600);
        return;
      }
      await dkRefresh(true);
    } catch (e) {
      dkCtx.err = String(e && e.message || e);
      renderDocker();
    } finally { if (el) el.classList.remove('busy'); }
  }

  /* ================= 4.66 SUNUCU MERKEZİ (SSH) =================
     Uzak bir sunucuyu "evren" olarak eklemenin arayüzü: sunucu listesi,
     ekle/düzenle/sil, bağlantı testi (uzak künye), taranacak kökler ve tarama.
     Kaydedilen sunucunun projeleri haritada gezegen olarak çıkar. */

  let srvCtx = { view: 'list', servers: [], edit: null, probe: null, busy: false, keys: [], cfgHosts: [] };

  async function srvRefresh() {
    try { srvCtx.servers = (await window.galaxy.sshList()) || []; } catch (e) { srvCtx.servers = []; }
  }

  async function openServers() {
    srvCtx = { view: 'list', servers: [], edit: null, probe: null, busy: false, keys: [], cfgHosts: [] };
    await srvRefresh();
    renderServers();
  }

  function osBadge(s) {
    if (s.offline) return `<span class="ghud-srv-os off ghud-mono">● çevrimdışı</span>`;
    if (s.kind === 'windows') return `<span class="ghud-srv-os win ghud-mono">⊞ Windows</span>`;
    if (s.kind === 'posix') return `<span class="ghud-srv-os posix ghud-mono">⊡ POSIX</span>`;
    return `<span class="ghud-srv-os ghud-mono">? test edilmedi</span>`;
  }

  function srvList() {
    if (!srvCtx.servers.length) {
      return `<div class="ghud-dk-empty">
        <div class="big">Henüz uzak sunucu yok</div>
        <div class="sm">Bir uzak sunucuyu <b>evren</b> olarak ekle: üzerindeki proje klasörleri
          haritada gezegen olarak çıkar, README ve git panelleri yerelmiş gibi çalışır.
          Kimlik doğrulama sistemin <b>ssh</b>'ıyla yapılır — parola saklanmaz.</div>
        <span class="ghud-btn" data-srvact="new">${I.plus}<span style="margin-left:6px">SUNUCU EKLE</span></span>
      </div>`;
    }
    const rows = srvCtx.servers.map(s => {
      const target = s.alias || ((s.user ? s.user + '@' : '') + s.host + (s.port && s.port !== 22 ? ':' + s.port : ''));
      const nRoots = (s.roots || []).length;
      return `<div class="ghud-row" data-srvid="${esc(s.id)}">
        <span class="sdot ${s.offline ? 'exit' : (s.kind ? 'run' : '')}"></span>
        <div class="col">
          <div class="nm">${esc(s.name)}</div>
          <div class="meta ghud-mono">${esc(target)} · ${nRoots} kök klasör</div>
        </div>
        ${osBadge(s)}
        <div class="acts">
          <span class="ghud-ib go" data-srvact="test" data-srvid="${esc(s.id)}" title="Bağlantıyı test et">${I.plug}</span>
          <span class="ghud-ib" data-srvact="scan" data-srvid="${esc(s.id)}" title="Projeleri tara / haritayı yenile">${I.refresh}</span>
          <span class="ghud-ib" data-srvact="edit" data-srvid="${esc(s.id)}" title="Düzenle">${I.edit2}</span>
          <span class="ghud-ib danger" data-srvact="del" data-srvid="${esc(s.id)}" title="Sil">${I.trash}</span>
        </div>
      </div>`;
    }).join('');
    return rows + `<div style="margin-top:12px"><span class="ghud-btn" data-srvact="new">${I.plus}<span style="margin-left:6px">SUNUCU EKLE</span></span></div>`;
  }

  function srvForm() {
    const s = srvCtx.edit || {};
    const useAlias = srvCtx.mode === 'alias';
    const roots = (s.roots && s.roots.length) ? s.roots : [{ name: '', path: '' }];
    const keyOpts = ['<option value="">(varsayılan anahtarlar)</option>']
      .concat(srvCtx.keys.map(k => `<option value="${esc(k.path)}"${s.key === k.path ? ' selected' : ''}>${esc(k.name)}</option>`))
      .join('');
    const hostOpts = ['<option value="">— ~/.ssh/config takma adı seç —</option>']
      .concat(srvCtx.cfgHosts.map(h => `<option value="${esc(h.alias)}"${s.alias === h.alias ? ' selected' : ''}>${esc(h.alias)}${h.host ? ' (' + esc(h.user ? h.user + '@' : '') + esc(h.host) + ')' : ''}</option>`))
      .join('');

    const rootRows = roots.map((r, i) => `
      <div class="ghud-rootrow" data-rootidx="${i}">
        <input class="rn ghud-mono" data-rf="name" placeholder="Evren adı" value="${esc(r.name || '')}" maxlength="60">
        <input class="ghud-mono" data-rf="path" placeholder="/home/kullanici/projeler" value="${esc(r.path || '')}" maxlength="400">
        <span class="ghud-ib danger" data-srvact="rootdel" data-ri="${i}" title="Kaldır">${I.close}</span>
      </div>`).join('');

    return `
      <div class="ghud-seg">
        <div class="s ${!useAlias ? 'on' : ''}" data-srvact="mode" data-m="manual">ADRES GİR</div>
        <div class="s ${useAlias ? 'on' : ''}" data-srvact="mode" data-m="alias">~/.ssh/config</div>
      </div>

      <div class="ghud-field"><label>SUNUCU ADI (evrende görünür)</label>
        <input id="srv-name" placeholder="Örn. Üretim Sunucusu" value="${esc(s.name || '')}" maxlength="60"></div>

      ${useAlias ? `
        <div class="ghud-field"><label>~/.SSH/CONFIG TAKMA ADI</label>
          <select id="srv-alias">${hostOpts}</select></div>
        <div class="ghud-hint ghud-mono">Kullanıcı, port ve anahtar config dosyandan gelir.</div>
      ` : `
        <div class="ghud-frow">
          <div class="ghud-field" style="flex:2"><label>SUNUCU (host / IP)</label>
            <input id="srv-host" placeholder="10.0.0.5 ya da sunucu.com" value="${esc(s.host || '')}"></div>
          <div class="ghud-field"><label>PORT</label>
            <input id="srv-port" placeholder="22" value="${s.port && s.port !== 22 ? s.port : ''}" inputmode="numeric"></div>
        </div>
        <div class="ghud-frow">
          <div class="ghud-field"><label>KULLANICI</label>
            <input id="srv-user" placeholder="root" value="${esc(s.user || '')}"></div>
          <div class="ghud-field"><label>SSH ANAHTARI</label>
            <select id="srv-key">${keyOpts}</select></div>
        </div>
      `}

      <div class="ghud-field"><label>TARANACAK KÖK KLASÖRLER (her biri bir evren olur)</label>
        <div id="srv-roots">${rootRows}</div>
        <span class="ghud-ib wide" data-srvact="rootadd" style="margin-top:4px">${I.plus}<span style="margin-left:5px">KÖK EKLE</span></span>
      </div>

      ${srvCtx.probe ? `<div class="ghud-srv-probe ${srvCtx.probe.ok ? 'ok' : 'bad'}">
        ${srvCtx.probe.ok
          ? `${I.check} <b>Bağlantı başarılı.</b><br><span class="ghud-kv ghud-mono">
              ${esc(srvCtx.probe.os)} · ${esc(srvCtx.probe.arch)} · <b>${esc(srvCtx.probe.hostname)}</b> · ${esc(srvCtx.probe.user)}<br>
              git: <b>${esc(srvCtx.probe.git || 'yok')}</b> · docker: <b>${esc(srvCtx.probe.docker || 'yok')}</b></span>`
          : `${I.alert} <b>Bağlanılamadı.</b> ${esc(srvCtx.probe.error || '')}`}
      </div>` : ''}

      <div style="display:flex; gap:8px; margin-top:8px">
        <span class="ghud-btn ${srvCtx.busy ? 'busy' : ''}" data-srvact="probe">${I.plug}<span style="margin-left:6px">BAĞLANTIYI TEST ET</span></span>
        <span style="flex:1"></span>
        <span class="ghud-btn" data-srvact="cancel">VAZGEÇ</span>
        <span class="ghud-btn ${srvCtx.busy ? 'busy' : ''}" data-srvact="save" style="border-color:var(--gh-cy);color:var(--gh-cy)">${I.check}<span style="margin-left:6px">KAYDET</span></span>
      </div>
    `;
  }

  function renderServers() {
    const body = srvCtx.view === 'list' ? srvList() : srvForm();
    popOpen(I.server, srvCtx.view === 'list' ? 'SUNUCU MERKEZİ — UZAK EVRENLER'
      : (srvCtx.edit && srvCtx.edit.id ? 'SUNUCU DÜZENLE' : 'YENİ SUNUCU'), body);
    $('#ghud-pop').classList.add('wide');
  }

  function collectForm() {
    const g = id => { const el = $('#' + id); return el ? el.value.trim() : ''; };
    const s = Object.assign({}, srvCtx.edit || {});
    s.name = g('srv-name');
    if (srvCtx.mode === 'alias') {
      s.alias = g('srv-alias'); s.host = ''; s.user = ''; s.port = 0; s.key = '';
    } else {
      s.alias = ''; s.host = g('srv-host'); s.user = g('srv-user');
      s.port = parseInt(g('srv-port'), 10) || 0; s.key = g('srv-key');
    }
    const roots = [];
    for (const row of document.querySelectorAll('#srv-roots .ghud-rootrow')) {
      const nm = row.querySelector('[data-rf="name"]').value.trim();
      const p = row.querySelector('[data-rf="path"]').value.trim();
      if (p) roots.push({ name: nm || p.split(/[\\/]/).filter(Boolean).pop() || 'evren', path: p });
    }
    s.roots = roots;
    return s;
  }

  async function srvOpenForm(server) {
    srvCtx.view = 'form';
    srvCtx.edit = server ? JSON.parse(JSON.stringify(server)) : { name: '', host: '', user: '', port: 0, key: '', roots: [] };
    srvCtx.mode = (server && server.alias) ? 'alias' : 'manual';
    srvCtx.probe = null;
    try { const r = await window.galaxy.sshKeys(); srvCtx.keys = (r && r.keys) || []; } catch (e) { srvCtx.keys = []; }
    try { const r = await window.galaxy.sshConfigHosts(); srvCtx.cfgHosts = (r && r.hosts) || []; } catch (e) { srvCtx.cfgHosts = []; }
    renderServers();
  }

  async function srvDo(act, id, el) {
    const server = () => srvCtx.servers.find(s => s.id === id);
    if (act === 'new') { srvOpenForm(null); return; }
    if (act === 'edit') { srvOpenForm(server()); return; }
    if (act === 'cancel') { srvCtx.view = 'list'; srvCtx.edit = null; srvCtx.probe = null; renderServers(); return; }
    if (act === 'mode') { srvCtx.edit = collectForm(); srvCtx.mode = el.dataset.m; srvCtx.probe = null; renderServers(); return; }
    if (act === 'rootadd') { srvCtx.edit = collectForm(); (srvCtx.edit.roots = srvCtx.edit.roots || []).push({ name: '', path: '' }); renderServers(); return; }
    if (act === 'rootdel') { srvCtx.edit = collectForm(); srvCtx.edit.roots.splice(+el.dataset.ri, 1); renderServers(); return; }

    if (act === 'del') {
      const s = server();
      if (!confirm(`"${s ? s.name : ''}" sunucusu kaldırılsın mı?\n\nSunucudaki hiçbir dosyaya dokunulmaz — yalnızca bu evren haritadan kalkar.`)) return;
      await window.galaxy.sshDelete(id);
      await srvRefresh(); renderServers();
      try { window.dispatchEvent(new CustomEvent('galaxy:reload')); } catch (e) {}
      return;
    }

    if (act === 'test' || act === 'scan') {
      if (el) el.classList.add('busy');
      try {
        if (act === 'test') {
          const r = await window.galaxy.sshTest({ id });
          alert(r && r.ok
            ? `✓ ${server() ? server().name : ''} bağlantısı başarılı\n\n${r.os} · ${r.arch} · ${r.hostname}\ngit: ${r.git || 'yok'}\ndocker: ${r.docker || 'yok'}`
            : `✗ Bağlanılamadı\n\n${(r && r.error) || 'bilinmeyen hata'}`);
          await srvRefresh(); renderServers();
        } else {
          const r = await window.galaxy.sshScan(id);
          if (r && r.ok) {
            alert(`✓ ${r.count} proje bulundu — haritada gezegen olarak görünecekler.`);
            try { await refresh(); window.dispatchEvent(new CustomEvent('galaxy:reload')); } catch (e) {}
          } else alert(`✗ Tarama başarısız\n\n${(r && r.error) || ''}`);
        }
      } finally { if (el) el.classList.remove('busy'); }
      return;
    }

    if (act === 'probe' || act === 'save') {
      const s = collectForm();
      srvCtx.edit = s;
      if (!s.name) { srvCtx.probe = { ok: false, error: 'Sunucu adı gerekli.' }; renderServers(); return; }
      if (srvCtx.mode === 'alias' ? !s.alias : !s.host) {
        srvCtx.probe = { ok: false, error: srvCtx.mode === 'alias' ? 'Bir takma ad seç.' : 'Sunucu adresi gerekli.' };
        renderServers(); return;
      }
      srvCtx.busy = true; renderServers();
      if (act === 'probe') {
        const r = await window.galaxy.sshTest(s);
        srvCtx.busy = false; srvCtx.probe = r; renderServers();
        return;
      }
      // save
      const r = await window.galaxy.sshSave(s);
      srvCtx.busy = false;
      if (!r || !r.ok) { srvCtx.probe = { ok: false, error: (r && r.error) || 'kaydedilemedi' }; renderServers(); return; }
      s.id = r.id;
      // kaydettikten sonra arka planda tara ki gezegenler hemen çıksın
      window.galaxy.sshScan(r.id).then(() => {
        try { refresh(); window.dispatchEvent(new CustomEvent('galaxy:reload')); } catch (e) {}
      });
      srvCtx.view = 'list'; srvCtx.edit = null; srvCtx.probe = null;
      await srvRefresh(); renderServers();
      return;
    }
  }

  /* ================= 4.68 ARTIFACT "GENEL BAKIŞ" — canlı kart-grid =================
     Kullanıcının tasarım dosyasındaki "Evrenini seç" ekranını gerçek verisiyle
     uygulamaya getirir. React'e dokunmaz; z-index'i yüksek tam-ekran overlay. */

  function ovPlanetStyle(hue) {
    return `background:radial-gradient(circle at 38% 30%, hsl(${hue},95%,88%), hsl(${hue},78%,62%) 46%, hsl(${(hue + 14) % 360},58%,26%) 100%);`
      + `box-shadow:0 0 26px hsla(${hue},80%,60%,.5);`;
  }

  // ~/… biçiminde kısaltılmış yol (evren nesnesinde subtitle yoksa root'tan üretilir)
  function ovShortPath(p) {
    if (!p) return '';
    const home = (window.galaxy && window.galaxy.home) || '';
    let s = String(p);
    if (home && s.startsWith(home)) s = '~' + s.slice(home.length);
    else s = s.replace(/^\/Users\/[^/]+/, '~');
    return s;
  }

  // "Picker" durumu = henüz bir evrene girilmemiş; native dev-gezegen seçici ekranı
  // (GİRİŞ butonlu kartlar) görünür. Bu durumda overlay TAM-EKRAN açılıp seçicinin
  // yerine geçer; karta tıklayınca ilgili native GİRİŞ tetiklenip evrene girilir.
  function ovGirisButtons() {
    return [...document.querySelectorAll('button,div,span,a')].filter(e => {
      const t = trFold((e.textContent || '').trim());
      if (!t.startsWith(trFold('GİRİŞ'))) return false;
      if (!e.offsetParent) return false;
      const r = e.getBoundingClientRect();
      return r.width > 30 && r.width < 190 && r.height > 10 && r.height < 64;
    });
  }
  function ovPickerState() { return ovGirisButtons().length > 0; }

  // Verilen evren adının native seçici KARTINDAKİ GİRİŞ'ini bulup tıklar → o evrene girer.
  // Not: yalnızca kartın kendisine bakılır (tüm kartları saran grid'e ÇIKILMAZ), yoksa
  // grid tüm evren adlarını içerdiği için yanlış evrene girilir. Eşleşme yoksa girmez
  // (yanlış-evren riski > hiç girmemek). Tek-evren senaryosu da tek kartla doğal çalışır.
  function ovEnterUniverse(name) {
    const target = trFold(name);
    for (const g of ovGirisButtons()) {
      let n = g;
      for (let i = 0; i < 3 && n; i++) {
        n = n.parentElement; if (!n) break;
        const txt = n.textContent || '';
        if (txt.length > 90) break;                 // grid container'a ulaştık — kart değil, dur
        if (trFold(txt).includes(target)) { g.click(); return true; }
      }
    }
    return false;
  }

  /* Overlay içerik alanına otursun diye üst-bar / sol panel / mürettebat rayının
     gerçek kenarlarını açılışta ölçer; bulamazsa referans layout'una göre fallback.
     Picker durumunda ise tam-ekran (.full) moduna geçer. */
  function ovMeasure(forceFull) {
    const el = $('#ghud-ov'); if (!el) return;
    if (forceFull || ovPickerState()) { el.classList.add('full'); return; }
    el.classList.remove('full');
    const W = window.innerWidth, H = window.innerHeight;
    let top = 54, left = 336, right = 200, bottom = 32;
    try {
      const gb = [...document.querySelectorAll('button.gbtn')]
        .find(b => trFold((b.textContent || '').trim()) === trFold('GENEL BAKIŞ'));
      const bar = gb && gb.closest('div');
      if (bar) { const r = bar.getBoundingClientRect(); if (r.width > W * 0.7 && r.top < 20) top = Math.round(r.bottom); }
      const crew = [...document.querySelectorAll('.fixed.z-30')]
        .find(n => { const r = n.getBoundingClientRect(); return r.height > 180 && r.width < 300 && r.left > W * 0.7; });
      if (crew) { const r = crew.getBoundingClientRect(); right = Math.max(24, Math.round(W - r.left + 12)); }
      const lbl = [...document.querySelectorAll('div,span')]
        .find(e => e.children.length === 0 && /PROJELER|PROJ/.test((e.textContent || '').trim())
          && e.getBoundingClientRect().left < 60 && e.getBoundingClientRect().top < H * 0.4);
      if (lbl) {
        let n = lbl;
        for (let i = 0; i < 8 && n; i++) {
          const r = n.getBoundingClientRect();
          if (r.height > H * 0.35 && r.width > 150 && r.width < 460 && r.left < 40) { left = Math.round(r.right); break; }
          n = n.parentElement;
        }
      }
    } catch (e) {}
    el.style.setProperty('--ghov-top', top + 'px');
    el.style.setProperty('--ghov-left', left + 'px');
    el.style.setProperty('--ghov-right', right + 'px');
    el.style.setProperty('--ghov-bottom', bottom + 'px');
  }

  function renderOverview() {
    const unis = cache.universes || [];
    const projs = cache.projects || [];
    const grid = unis.map(u => {
      const up = projs.filter(p => p.universe === u.id);
      const gezegen = up.length;
      const sistem = new Set(up.map(p => p.group).filter(g => g && g !== 'Keşfedilmemiş')).size;
      const aktif = up.filter(p => p.status === 'active').length;
      const hue = hueOf(u.id || u.name);
      return `<div class="ghud-ov-card" data-ovuni="${esc(u.id)}" data-ovnm="${esc(u.name)}">
        <div class="ghud-ov-row">
          <div class="ghud-ov-planet" style="${ovPlanetStyle(hue)}"></div>
          <div class="ghud-ov-info">
            <div class="ghud-ov-name">${esc(u.name)}</div>
            <div class="ghud-ov-path">${esc(u.subtitle || ovShortPath(u.root) || '')}</div>
          </div>
        </div>
        <div class="ghud-ov-stats">
          <span><b>${gezegen}</b> gezegen</span>
          <span><b>${sistem}</b> sistem</span>
          <span class="ok"><b>${aktif}</b> aktif</span>
        </div>
      </div>`;
    }).join('');
    const add = `<div class="ghud-ov-card ghud-ov-add" data-ovadd="1">
      <div class="pl">+</div><div class="lb">YENİ EVREN EKLE</div><div class="s2">yerel klasör · uzak sunucu</div>
    </div>`;
    $('#ghud-ov').innerHTML = `<div class="ghud-ov-wrap">
      <div class="ghud-ov-top">
        <div>
          <div class="ghud-ov-ovl">GENEL BAKIŞ</div>
          <div class="ghud-ov-h1">Evrenini seç</div>
          <div class="ghud-ov-lead">Her evren bir galaksi: içindeki proje klasörleri gezegen, projeleri barındıran çatı klasörler yıldız sistemi olur.</div>
        </div>
        <div class="ghud-ov-close" data-ovclose="1" title="Kapat (ESC)">${I.close}</div>
      </div>
      ${unis.length ? `<div class="ghud-ov-grid">${grid}${add}</div>` : '<div class="ghud-ov-empty">Henüz evren yok — aşağıdan ekleyebilirsin.</div>'}
    </div>`;
  }

  // Overview açıkken haritanın sağ-alt sektör minimap'i + zoom butonları görünür kalıp
  // "harita sızması" yaratıyor (referans overview'de yoklar). Açıkken gizle, kapanınca geri getir.
  let _ovHidden = [];
  function ovHideMapChrome(hide) {
    if (hide) {
      _ovHidden = [];
      const W = window.innerWidth, H = window.innerHeight;
      const cands = [];
      const lbl = [...document.querySelectorAll('.hud-label')]
        .find(e => /SEKTÖR|HARİTAS/i.test(e.textContent || ''));
      if (lbl) {
        let n = lbl;
        for (let i = 0; i < 6 && n; i++) {
          const r = n.getBoundingClientRect();
          if (r.width > 120 && r.width < 360 && r.height > 60 && r.height < 300 && r.left > W * 0.75) { cands.push(n); break; }
          n = n.parentElement;
        }
      }
      const zb = [...document.querySelectorAll('button')].find(b => {
        const t = (b.textContent || '').trim(); const r = b.getBoundingClientRect();
        return (t === '+' || t === '−' || t === '-') && r.left > W * 0.8 && r.top > H * 0.6;
      });
      if (zb && zb.parentElement) cands.push(zb.parentElement);
      for (const el of cands) { try { _ovHidden.push([el, el.style.visibility]); el.style.visibility = 'hidden'; } catch (e) {} }
    } else {
      for (const [el, v] of _ovHidden) { try { el.style.visibility = v || ''; } catch (e) {} }
      _ovHidden = [];
    }
  }

  async function openOverview(forceFull) {
    const el = $('#ghud-ov');
    // EVREN sekmesi gibi picker'ın GELECEĞİNİ bildiğimiz durumda HEMEN tam-ekran kapla
    // ki alttaki native dev-gezegen seçici bir an bile görünmesin (flash yok).
    if (forceFull) { el.classList.add('full'); el.classList.add('open'); }
    if (!cache.universes || !cache.universes.length) await refresh();
    renderOverview();
    ovMeasure(forceFull);
    ovHideMapChrome(true);
    el.classList.add('open');
  }
  function closeOverview() { $('#ghud-ov').classList.remove('open'); ovHideMapChrome(false); }
  function ovIsOpen() { const el = $('#ghud-ov'); return !!(el && el.classList.contains('open')); }

  async function ovAddUniverse() {
    try {
      const r = await window.galaxy.pickFolder();
      if (!r || !r.path) return;
      const name = r.path.split('/').filter(Boolean).pop() || 'Evren';
      await window.galaxy.universeAdd({ name, root: r.path, bookmark: r.bookmark || null });
      await refresh();
      renderOverview();
    } catch (e) {}
  }

  // Açılış flash-önleyici katmanı kaldır (React eski görünümü artık üstte değil).
  function ovBootDone() { const b = document.getElementById('ghud-boot'); if (b) b.remove(); }

  // Native picker (dev-gezegen seçici) belirince tam-ekran kart-grid'i onun ÜSTÜNE aç.
  function ovOpenWhenPicker(maxTries) {
    let tries = 0;
    const t = () => {
      if (ovIsOpen()) { ovBootDone(); return; }
      if (ovPickerState()) { openOverview().then(ovBootDone); return; }   // kart-grid açık → boot kalkar
      if (++tries < (maxTries || 18)) setTimeout(t, 80);
      else ovBootDone();                                                   // picker yok (zaten evrende) → haritayı göster
    };
    t();
  }

  // Üst-bar sekmeleri:
  //  • "GENEL BAKIŞ" → in-app inset kart-grid (native 3D zoom bastırılır — çift-render biter).
  //  • "EVREN"       → native dev-gezegen seçicisini açtırır ama ANINDA tam-ekran kart-grid'le
  //                    örter; kullanıcı eski seçiciyi görmez, karttan evren değiştirir.
  //  • diğerleri     → açık overview'i kapat, native görünüme bırak.
  function injectOverviewTrigger() {
    for (const btn of document.querySelectorAll('button.gbtn')) {
      if (btn.dataset.ghudOv) continue;
      const nm = trFold((btn.textContent || '').trim());
      const kind = nm === trFold('GENEL BAKIŞ') ? 'ov' : (nm === trFold('EVREN') ? 'ev' : 'x');
      btn.dataset.ghudOv = kind;
      btn.addEventListener('click', (e) => {
        if (kind === 'ov') { e.stopPropagation(); setTimeout(openOverview, 0); }   // native overview() tetiklenmez
        else if (kind === 'ev') { openOverview(true); }                             // native picker altta; ANINDA tam-ekran kart-grid örter
        else if (ovIsOpen()) { closeOverview(); }                                    // başka sekme: native'e bırak
      }, true);
    }
  }

  /* ================= 4.7 SEYİR REHBERİ (görselli tanıtım + kullanım) ================= */
  // docs/Project_Galaxy_Mission_Control.pdf sunumundaki infografikler burada
  // uygulamanın içinde yaşar: her ekranın anatomisi, terminoloji, mürettebat,
  // günlük döngü ve kısayollar — hepsi aynı görsel dille.

  let guideSec = 'neden';

  const fig = src => `<div class="ghud-fig" data-zoom="${src}"><img src="${src}" alt="" draggable="false"></div>`;
  const gcard = (t, d, c) => `<div class="ghud-g-card"><div class="t ghud-mono" ${c ? `style="color:${c}"` : ''}>${t}</div><div class="d">${d}</div></div>`;

  function guideSections() {
    return [
      {
        k: 'neden', g: 'TEMELLER', t: 'NEDEN GALAXY', img: IMG.neden,
        lead: `Diskindeki onlarca proje klasörü, aslında görünmeyen bir evren. Hangisi canlı, hangisi
          aylardır ihmal edilmiş, hangisinin yarım kalmış bir planı var — klasör listesi bunu söylemez.
          Project Galaxy bu klasörleri <b>tek bakışta okunabilen canlı bir ekosisteme</b> çevirir.`,
        body: `<div class="ghud-g-body">
          <p>Hiçbir şeyi taşımaz, kopyalamaz, buluta göndermez. Var olan klasörlerini okur; git geçmişini,
          dosya değişim tarihlerini ve senin günlüğünü birleştirip her projeye bir <b>nabız</b> verir.</p>
          <p>Sonuç: "şu an neyle ilgilenmeliyim?" sorusunun cevabı, klasörleri tek tek açmadan önünde durur.</p>
        </div>`
      },
      {
        k: 'terim', g: 'TEMELLER', t: 'TERMİNOLOJİ', img: IMG.terim,
        lead: `Uygulamanın tamamı üç kavram üzerine kurulu. Bu üçünü anladığında geri kalan her ekran
          kendiliğinden yerine oturur.`,
        extra: `<div class="ghud-g-grid">
          ${gcard('GALAKSİ', 'Evrenin ta kendisi — <b>çalışma alanın</b>. Onboarding\'de seçtiğin kök klasörlerin toplamı.')}
          ${gcard('YILDIZ SİSTEMİ', 'Projeleri gruplayan <b>çatı klasörler</b> (sektör etiketleri). Müşteri, şirket ya da alan bazlı ayrım.')}
          ${gcard('GEZEGEN', 'Asıl <b>proje klasörü</b> — git ve kod burada yaşar. Tıkladığında gezegen moduna inersin.')}
        </div>
        <div class="ghud-g-body"><b>Gezegen renkleri = durum:</b></div>
        <div class="ghud-g-grid">
          ${gcard('AKTİF', 'Son günlerde dokunulmuş, git aktivitesi olan canlı proje.', '#61dcff')}
          ${gcard('BEKLEMEDE', 'Ayarladığın eşiği (varsayılan <b>21 gün</b>) aşacak kadar ihmal edilmiş. Sarı ünlem taşır.', '#ffd166')}
          ${gcard('TAMAMLANDI', 'Planı bitmiş, kapanmış iş.', '#7bd88f')}
          ${gcard('ARŞİV', 'Bilinçli olarak rafa kaldırılmış proje.', '#dfe8ff')}
          ${gcard('KEŞFEDİLMEMİŞ', 'Taramada bulundu ama henüz sen bakmadın — içinde ne olduğu belirsiz.', '#c07bff')}
        </div>`
      },
      {
        k: 'uzay', g: 'EKRANLAR', t: 'UZAY MODU', img: IMG.uzay,
        lead: `Kuşbakışı kontrol: tüm evren tek ekranda. Hiçbir proje artık karanlıkta kalmaz.`,
        extra: `<div class="ghud-g-grid">
          ${gcard('RADAR (SOL)', 'Tüm projelerin listesi, hiyerarşik filtreler ve plan maddeleri. Arama buradan.')}
          ${gcard('YÖRÜNGE BAĞLARI', 'İlişkili projeler arası bağlar; <b>sarı ünlem</b> ihmal edilmiş gezegen uyarısıdır.')}
          ${gcard('İSTASYON (SAĞ)', 'Yapay zekâ ajanlarının bulunduğu görev modülü — uzayda tüm evreni görürler.')}
          ${gcard('NAVİGASYON', 'Sektör haritası üzerinden anında ışınlanma. <b>WASD</b> / oklarla pan-tilt.')}
        </div>`
      },
      {
        k: 'gezegen', g: 'EKRANLAR', t: 'GEZEGEN MODU', img: IMG.gezegen,
        lead: `Bir gezegene indiğinde tek bir projenin içindesin. Dosyalar gezegenin yörüngesinde
          <b>türlerine göre renklenir</b>: kod mavi, doküman sarı, görsel pembe.`,
        extra: `<div class="ghud-g-grid">
          ${gcard('PLAN VE GİT (SOL)', 'Kayıt, ilerleme çubuğu, dosya ağacı ve git geçmişi.')}
          ${gcard('CANLI DOKÜMAN (SAĞ)', 'Her zaman açık, render edilen <b>otonom README</b>. Yoksa DOCUMENTOR ajanı yazabilir.')}
          ${gcard('KONTROL KONSOLU (ALT)', 'Bağlam farkındalığı olan BASH terminali ve CLAUDE konsolu.')}
          ${gcard('ÇİFT TIK', 'Plan maddesini anında düzenler; <b>ESC</b> bir katman yukarı çıkarır.')}
        </div>`
      },
      {
        k: 'hudgit', g: 'EKRANLAR', t: 'HUD & GİT MERKEZİ', img: IMG.hudgit,
        lead: `Alt kenardaki <b>HUD</b> her ekranda yanındadır: en aktif yıldız, son yapılanlar ve hızlı notlar.
          <b>⌘K</b> ile tüm evrende arama yapar, doğrudan Git Merkezi'ne geçersin.`,
        extra: `<div class="ghud-g-grid">
          ${gcard('EN AKTİF YILDIZ', 'Son 30 günün git aktivitesine göre öne çıkan proje; klasörünü ve geçmişini tek tıkla açar.')}
          ${gcard('SON YAPILANLAR', 'Günlüğe işlediğin işler ve ajanların ürettiği rapor arşivi.')}
          ${gcard('NOTLARIM', 'Hızlı not; uygulama kapalıyken bile <b>⌘⇧G</b> ile tepsiden yazabilirsin.')}
          ${gcard('GİT MERKEZİ', 'Durum · <b>takım akışı</b> · geçmiş · git flow rehberi — dört sekme.')}
        </div>
        <div style="margin-top:14px"><span class="ghud-btn" data-act="gitcenter">${I.branch}<span style="margin-left:6px">GİT MERKEZİNİ AÇ</span></span></div>`
      },
      {
        k: 'crew', g: 'AJANLAR', t: 'GÖREV MÜRETTEBATI', img: IMG.crew,
        lead: `Beş hazır ajan. <b>Uzayda tüm evreni</b>, <b>gezegende sadece o projeyi</b> görürler — bağlam
          bulundukları yere göre değişir. Adlarını, rollerini ve kişiliklerini ⚙ ile değiştirebilir,
          yenilerini ekleyebilirsin.`,
        extra: `<div class="ghud-g-body">
          <p><b>Tek yazma yetkisi DOCUMENTOR'dadır.</b> Diğerleri okur, analiz eder, rapor yazar ama
          dosyalarına dokunmaz — bu bilinçli bir güvenlik sınırıdır.</p></div>`
      },
      {
        k: 'akis', g: 'AJANLAR', t: 'AJAN AKIŞI', img: IMG.akis,
        lead: `Bir ajana soru sorduğunda ne oluyor? Dört adım: sen sorarsın, ajan kişiliğini ve projenin
          anlık durumunu kuşanır, Claude yerel bir alt süreç olarak kodu inceler, sonuç markdown rapor
          olarak döner ya da doğrudan README/Plan'a yazılır.`,
        extra: `<div class="ghud-g-body">
          <p>Dosya ya da ekran görüntüsünü <b>sürükleyip bırakarak</b> sohbete ekleyebilirsin.
          Her şey yerelde çalışır; proje içeriğin buluta gitmez.</p></div>
        <div style="margin-top:6px"><span class="ghud-btn" data-act="guide" data-sec="dongu">${I.refresh}<span style="margin-left:6px">GÜNLÜK DÖNGÜYE GEÇ</span></span></div>`
      },
      {
        k: 'dongu', g: 'AKIŞ', t: 'GÜNLÜK DÖNGÜ', img: IMG.dongu,
        lead: `README'ler artık bir yük değil, <b>otonom bir seyir defteri</b>. "Login ekranını bitirdim"
          yazarsın; sistem doğru projeyi bulur, onayını ister ve tek hamlede git commit'i atar,
          plan maddelerini günceller, README'yi yeniden yazar.`,
        extra: `<div class="ghud-g-grid">
          ${gcard('GİRDİ', 'Günlüğe tek cümle yaz. Uygulama kapalıysa <b>⌘⇧G</b> ile tepsiden.')}
          ${gcard('AKILLI EŞLEŞME', 'Sistem hangi projeden bahsettiğini tespit eder ve klasör yolunu göstererek <b>onay ister</b>.')}
          ${gcard('ÇOKLU DAĞITIM', 'Onayla birlikte commit atılır, plan güncellenir, README yazılır.')}
          ${gcard('ÇİFT YÖNLÜ SENKRON', 'Kanban panosu ve gezegen planı anında senkronize olur.')}
        </div>`
      },
      {
        k: 'gitflow', g: 'AKIŞ', t: 'GIT FLOW REHBERİ',
        lead: `Dallanma modelini sıfırdan öğreten bölüm. Kendi projenin gerçek durumuna göre hazırlanmış
          adımlar için Git Merkezi'ndeki <b>TAKIM AKIŞI</b> sekmesini kullan.`,
        extra: `<div style="margin:4px 0 14px"><span class="ghud-btn" data-act="gitcenter" data-tab="takim">${I.branch}<span style="margin-left:6px">TAKIM AKIŞINI AÇ (BENİM PROJEM İÇİN)</span></span></div>`
          + gitFlowGuide()
      },
      {
        k: 'kisayol', g: 'SİSTEM', t: 'KISAYOL HARİTASI', img: IMG.kisayol,
        lead: `Komut satırı ezberlemeye son. Bu beş kısayol uygulamanın tamamını açar.`,
        extra: `<div class="ghud-g-grid">
          ${gcard('⌘K', 'Hızlı komut: tüm evrende arama ve Git Merkezi.')}
          ${gcard('⌘⇧G', 'Uygulama kapalıyken bile global hızlı not (tepsiden).')}
          ${gcard('ESC', 'Görev kontrol katmanlarında bir adım geri çık.')}
          ${gcard('WASD / OKLAR', 'Uzayda pan-tilt gezinme.')}
          ${gcard('ÇİFT TIK', 'Gezegene in, plan maddesini anında düzenle.')}
          ${gcard('F1 · ⌘/', 'Bu rehberi her yerden aç.')}
        </div>`
      },
      {
        k: 'guvenlik', g: 'SİSTEM', t: 'GÜVENLİK & MİMARİ', img: IMG.guvenlik,
        lead: `Local-first: tek bir veri dosyası (galaxy-data.json), sıfır bulut. Tüm veriler ve yapılar
          yalnızca kendi diskinde yaşar.`,
        extra: `<div class="ghud-g-grid">
          ${gcard('ZAMAN YOLCULUĞU', '14 günlük yerel otomatik yedek; her değişiklikte sessiz git commit.')}
          ${gcard('VERİTABANI GÜVENLİĞİ', 'Parolalar anahtar zincirinde (safeStorage) şifreli; veritabanlarına yalnızca <b>SELECT</b> izni.')}
          ${gcard('SAF PERFORMANS', 'Canvas 2D ve önbellekli saf JS mimarisiyle 60fps akıcı HUD.')}
          ${gcard('AJAN SINIRI', 'Yalnızca DOCUMENTOR yazabilir; diğer ajanlar salt okunur.')}
        </div>
        <div style="margin-top:14px"><span class="ghud-btn" data-act="backups">${I.archive}<span style="margin-left:6px">YEDEKLERİ GÖSTER</span></span></div>`
      },
      {
        k: 'kurulum', g: 'SİSTEM', t: 'KURULUM & ATEŞLEME', img: IMG.kurulum,
        lead: `Yeni bir makinede sıfırdan kurulum on dakika sürer; kurulum tek seferliktir,
          güncellemeler otomatik akar.`,
        extra: `<div class="ghud-g-body"><p>Ajanların çalışması için Claude Code'un kurulu olması gerekir:</p></div>
          ${cmd('npm install -g @anthropic-ai/claude-code')}`
      }
    ];
  }

  function renderGuide() {
    const secs = guideSections();
    const cur = secs.find(s => s.k === guideSec) || secs[0];
    let nav = '', lastG = '';
    for (const s of secs) {
      if (s.g !== lastG) { nav += `<div class="gsec ghud-mono">${s.g}</div>`; lastG = s.g; }
      nav += `<div class="gi ghud-mono ${s.k === cur.k ? 'on' : ''}" data-gsec="${s.k}"><i></i>${s.t}</div>`;
    }
    const main = `<div class="ghud-g-h ghud-mono">${cur.t}</div>
      <div class="ghud-g-lead">${cur.lead}</div>
      ${cur.img ? fig(cur.img) : ''}
      ${cur.body || ''}${cur.extra || ''}`;
    popOpen(I.book, 'SEYİR REHBERİ · PROJECT GALAXY',
      `<div class="ghud-g-nav">${nav}</div><div class="ghud-g-main">${main}</div>`);
    $('#ghud-pop').classList.add('guide');
    const m = $('#ghud-pop .ghud-g-main'); if (m) m.scrollTop = 0;
  }

  function openGuide(sec) { if (sec) guideSec = sec; renderGuide(); }

  function lbOpen(src) {
    const lb = $('#ghud-lb');
    lb.querySelector('img').src = src;
    lb.classList.add('open');
  }

  /* ================= 4.8 AJAN EKRANLARI: PORTRE + REHBER ENJEKSİYONU =================
     Uygulamanın React ağacına düğüm eklemeden, yalnızca data-attribute + ::before
     ile ajan satırlarına sunumdaki portreleri getirir; ajan oluşturma/düzenleme
     panelinde ise mürettebat kartını ve akış rehberini gösterir. */

  let agentsCache = [];
  let agentsLoaded = false;

  async function loadAgents() {
    if (agentsLoaded) return agentsCache;
    try { agentsCache = (await window.galaxy.agentsFull()) || []; agentsLoaded = true; } catch (e) {}
    return agentsCache;
  }

  const agentByName = nm => agentsCache.find(a => trFold(a.name) === trFold(nm));

  // Metni birebir eşleşen, çocuksuz elemanı bul (kapsam verilmezse tüm sayfa)
  function findLeaf(text, root) {
    const t0 = trFold(text);
    for (const el of (root || document.body).querySelectorAll('div,span,p,b,strong')) {
      if (el.children.length) continue;
      if (trFold((el.textContent || '').trim()) === t0) return el;
    }
    return null;
  }

  function injectAgentUI() {
    if (!agentsLoaded) { loadAgents(); return; }

    /* --- 1. AJANLAR listesi (⚙ ajan yönetim penceresi) ---
       Ucuz kapı: ajan penceresi açık değilse hiçbir tarama yapılmaz. */
    for (const modal of document.querySelectorAll('.panel-cut.brackets')) {
      const rows = modal.querySelectorAll('div.cursor-pointer');
      if (!rows.length || !findLeaf('AJANLAR', modal)) continue;
      // ajan eklendi/silindiyse önbelleği tazele
      if (rows.length !== agentsCache.length) { agentsLoaded = false; loadAgents(); }
      for (const row of rows) {
        const spans = row.querySelectorAll(':scope > span');
        if (spans.length < 2) continue;
        const a = agentByName((spans[1].textContent || '').trim());
        const id = a && isCrew(a.id) ? a.id : '_new';
        if (row.getAttribute('data-ghud-agent') !== id) row.setAttribute('data-ghud-agent', id);
        if (id === '_new') row.setAttribute('data-ghud-init', crewInit(a));
      }
      injectAgentEditor(modal);
    }

    /* --- 2. GÖREV İSTASYONU başlığı (sağ panel) ---
       Uygulamanın kendi .hud-label sınıfı üzerinden hedeflenir. */
    for (const el of document.querySelectorAll('.hud-label')) {
      if (el.children.length) continue;
      if (!/— GÖREV İSTASYONU$/.test((el.textContent || '').trim())) continue;
      const bar = el.parentElement && el.parentElement.parentElement;
      if (!bar || bar.getAttribute('data-ghud-agent')) continue;
      const nmEl = el.nextElementSibling;
      const a = nmEl ? agentByName((nmEl.textContent || '').trim()) : null;
      if (!a) continue;
      const sid = isCrew(a.id) ? a.id : '_new';
      bar.setAttribute('data-ghud-agent', sid);
      if (sid === '_new') bar.setAttribute('data-ghud-init', crewInit(a));
      bar.setAttribute('data-ghud-big', '1');
    }
  }

  // Ajan düzenleme/oluşturma panelinde görsel rehber
  function injectAgentEditor(modal) {
    let mode = null, host = null;
    for (const label of ['AJANI DÜZENLE', 'YENİ AJAN', 'SOLDAN AJAN SEÇ']) {
      const el = findLeaf(label, modal);
      if (el) {
        mode = label;
        host = el.closest('.flex-1.flex.flex-col') || (el.parentElement && el.parentElement.parentElement);
        break;
      }
    }
    if (!host) return;
    const wantKey = mode === 'AJANI DÜZENLE' ? 'edit' : 'new';
    const old = host.querySelector(':scope > .ghud-crew-strip');
    if (old && old.dataset.k === wantKey) return;
    if (old) old.remove();

    const strip = document.createElement('div');
    strip.className = 'ghud-crew-strip';
    strip.dataset.k = wantKey;

    if (wantKey === 'edit') {
      // seçili ajanı, listedeki vurgulu satırdan bul
      let sel = null;
      for (const row of modal.querySelectorAll('div[data-ghud-agent]')) {
        const bg = (row.getAttribute('style') || '');
        if (bg.indexOf('rgba(97,220,255,.08)') >= 0 || bg.indexOf('rgba(97, 220, 255, 0.08)') >= 0) {
          const spans = row.querySelectorAll(':scope > span');
          if (spans.length > 1) sel = agentByName((spans[1].textContent || '').trim());
        }
      }
      const known = sel && isCrew(sel.id);
      strip.innerHTML = `<div class="cs-h">${I.book}<span class="cs-t">MÜRETTEBAT KARTI</span>
          <span class="ghud-btn" data-act="guide" data-sec="crew" style="padding:4px 11px">REHBER</span></div>
        <div class="ghud-crew-hero">
          ${known ? `<img src="${crewCard(sel.id)}" data-zoom="${crewCard(sel.id)}" alt="">` : ''}
          <div class="ch-x">
            ${known
              ? `<b>${esc(sel.name)}</b> — ${esc(sel.role || '')}<br>Sunumdaki hazır mürettebat üyesi.
                 ${sel.write ? '<b style="color:var(--gh-ok)">Dosya yazma yetkisi var.</b>' : 'Salt okunur: analiz eder, rapor yazar, dosyalarına dokunmaz.'}`
              : `<b>Özel ajan.</b> Kişiliğini aşağıdaki alandan yazarsın — ne kadar net tarif edersen o kadar tutarlı davranır.`}
            <br><br><b>İyi bir kişilik metni:</b> kim olduğu, neye baktığı, çıktı formatı ve neyi asla yapmayacağı.
            Örnek: <i>"Sen ARCHIVIST'sin. Eski projeleri tarar, hangilerinin arşive taşınabileceğini
            gerekçesiyle listelersin. Dosya değiştirmezsin."</i>
          </div>
        </div>`;
    } else {
      strip.innerHTML = `<div class="cs-h">${I.book}<span class="cs-t">GÖREV MÜRETTEBATI — YENİ ÜYE</span>
          <span class="ghud-btn" data-act="guide" data-sec="akis" style="padding:4px 11px">AJAN AKIŞI</span></div>
        <img src="${IMG.crew}" data-zoom="${IMG.crew}" alt="">
        <div class="cs-d">Hazır beş ajanın yanına kendi ajanını ekleyebilirsin.
          <b>Uzayda tüm evreni, gezegende sadece o projeyi</b> görür.
          <b>AD</b> kısa ve büyük harf (ARCHIVIST), <b>ROL</b> tek kelimelik iş tanımı (Arşivci),
          <b>RENK</b> uzayda tanınmasını sağlar, <b>KİŞİLİK</b> ise davranışını belirleyen sistem talimatıdır.
          Yazma iznini yalnızca dosya üretmesi gereken ajanlara ver.</div>`;
    }
    host.insertBefore(strip, host.firstChild ? host.firstChild.nextSibling : null);
  }

  /* ================= 5. KURULUM ================= */

  function setOpen(open) {
    const dock = $('#ghud-dock'), tab = $('#ghud-tab');
    dock.classList.toggle('open', open);
    tab.classList.toggle('open', open);
    tab.title = open ? 'HUD paneli kapat' : 'HUD paneli aç';
    if (open) refresh(); else popClose();
  }

  async function mount() {
    // Dili DOM kurulmadan önce yükle ki statik chrome (ör. pop kapat düğmesi)
    // ilk seferde doğru dilde bassın; başarısızsa varsayılan 'tr' kalır.
    try {
      if (window.galaxy && window.galaxy.profileGet) {
        const prof = await window.galaxy.profileGet();
        if (prof && prof.lang) LANG = prof.lang === 'en' ? 'en' : 'tr';
      }
    } catch (e) { /* profil yoksa sessiz geç */ }

    const style = document.createElement('style');
    style.textContent = CSS;
    document.head.appendChild(style);

    document.body.appendChild(buildNebula());

    // her zaman görünür aç/kapa sekmesi (alt-orta)
    const tab = document.createElement('div');
    tab.id = 'ghud-tab';
    tab.innerHTML = `<span class="ric">${I.rocket}</span><span>HUD</span><span class="chev">${I.chevUp}</span>`;
    tab.title = 'HUD paneli aç';
    tab.setAttribute('role', 'button');
    tab.setAttribute('tabindex', '0');
    tab.setAttribute('aria-label', 'HUD panelini aç ya da kapat');
    tab.addEventListener('keydown', e => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setOpen(!dock.classList.contains('open')); }
    });
    document.body.appendChild(tab);

    const dock = document.createElement('div');
    dock.id = 'ghud-dock';
    dock.innerHTML = `
      <div class="ghud-card hero" id="ghud-hero"></div>
      <div class="ghud-card" id="ghud-recent"></div>
      <div class="ghud-card" id="ghud-notes"></div>`;
    document.body.appendChild(dock);

    const pop = document.createElement('div');
    pop.id = 'ghud-pop';
    pop.innerHTML = `<div class="ph"><span class="pic"></span><span class="t"></span>
      <span class="ghud-a" data-act="close" role="button" tabindex="0" aria-label="${t('aClose')}" title="${t('aClose')}">${I.close}</span></div>
      <div class="pb"></div>`;
    document.body.appendChild(pop);

    const lb = document.createElement('div');
    lb.id = 'ghud-lb';
    lb.innerHTML = '<img alt="">';
    document.body.appendChild(lb);

    // artifact "GENEL BAKIŞ" kart-grid overlay'i
    const ov = document.createElement('div');
    ov.id = 'ghud-ov';
    document.body.appendChild(ov);

    const pal = document.createElement('div');
    pal.id = 'ghud-pal';
    pal.innerHTML = `<div class="pin">${I.search}<input type="text" placeholder="Proje ara ya da komut yaz…  (GİT için Enter)"></div>
      <div class="plist"></div>`;
    document.body.appendChild(pal);
    const palInp = pal.querySelector('input');
    palInp.addEventListener('input', () => { palSel = 0; renderPal(); });
    palInp.addEventListener('keydown', e => {
      e.stopPropagation();
      const items = palItems(palInp.value);
      if (e.key === 'ArrowDown') { palSel = Math.min(items.length - 1, palSel + 1); renderPal(); e.preventDefault(); }
      else if (e.key === 'ArrowUp') { palSel = Math.max(0, palSel - 1); renderPal(); e.preventDefault(); }
      else if (e.key === 'Enter') { palRun(items[palSel]); e.preventDefault(); }
      else if (e.key === 'Escape') { palClose(); }
    });
    palInp.addEventListener('keyup', e => e.stopPropagation());

    tab.addEventListener('click', () => setOpen(!dock.classList.contains('open')));

    // Klavye ile etkinleştirme: tabindex verilmiş HUD düğmelerinde Enter/Space → tıklama.
    // Tıklama zaten belge düzeyinde delege edildiği için click() dispatch etmek yeterli.
    document.addEventListener('keydown', e => {
      if (e.key !== 'Enter' && e.key !== ' ' && e.key !== 'Spacebar') return;
      const el = e.target;
      if (!el || !el.closest || el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') return;
      // #ghud-tab hariç: onun kendi keydown handler'ı var (çift tetiklemeyi önler)
      if (el.getAttribute && el.getAttribute('role') === 'button' &&
          el.closest('#ghud-dock, #ghud-pop, #ghud-pal')) {
        e.preventDefault();
        el.click();
      }
    });

    document.addEventListener('click', e => {
      if (!e.target || !e.target.closest) return;
      if ($('#ghud-pal').classList.contains('open') && !e.target.closest('#ghud-pal')) palClose();
      const gg = e.target.closest('[data-ghudgit]');
      if (gg) { openGitCenterFromTab(gg.dataset.ghudgit); return; }

      // rehber görselini büyüt
      const zm = e.target.closest('[data-zoom]');
      if (zm) { lbOpen(zm.dataset.zoom); e.stopPropagation(); return; }
      if (e.target.closest('#ghud-lb')) { $('#ghud-lb').classList.remove('open'); return; }

      // komut / şablon kopyala
      const cp = e.target.closest('[data-cp]');
      if (cp) {
        const txt = cp.dataset.cp;
        try { navigator.clipboard.writeText(txt); } catch (err) {}
        const prev = cp.textContent;
        cp.classList.add('ok');
        if (!cp.classList.contains('ghud-tpl')) cp.textContent = '✓ panoya kopyalandı';
        setTimeout(() => { cp.classList.remove('ok'); cp.textContent = prev; }, 1100);
        e.stopPropagation();
        return;
      }

      // rehber sol menüsü
      const gs = e.target.closest('[data-gsec]');
      if (gs) { openGuide(gs.dataset.gsec); return; }

      // docker merkezi
      const dt = e.target.closest('[data-dktab]');
      if (dt) { dkCtx.tab = dt.dataset.dktab; renderDocker(); if (dkCtx.tab !== 'log') dkRefresh(true); return; }
      const dp = e.target.closest('[data-dkport]');
      if (dp) { try { window.galaxy.openLocalPort(dp.dataset.dkport); } catch (err) {} e.stopPropagation(); return; }
      const da = e.target.closest('[data-dkact]');
      if (da) { dkDo(da.dataset.dkact, da.dataset.dkid, da); e.stopPropagation(); return; }
      const dbtn = e.target.closest('[data-ghuddocker]');
      if (dbtn) { openDocker(); return; }

      // sunucu merkezi
      const sa = e.target.closest('[data-srvact]');
      if (sa) { srvDo(sa.dataset.srvact, sa.dataset.srvid || (srvCtx.edit && srvCtx.edit.id), sa); e.stopPropagation(); return; }
      const srow = e.target.closest('[data-srvid]');
      if (srow && !e.target.closest('.acts')) { srvOpenForm(srvCtx.servers.find(s => s.id === srow.dataset.srvid)); return; }
      const sbtn = e.target.closest('[data-ghudservers]');
      if (sbtn) { openServers(); return; }

      // artifact genel bakış overlay
      if (e.target.closest('[data-ovclose]')) { closeOverview(); return; }
      if (e.target.closest('[data-ovadd]')) { ovAddUniverse(); return; }
      const ovc = e.target.closest('[data-ovuni]');
      if (ovc) {
        const nm = ovc.dataset.ovnm || '';
        if ($('#ghud-ov').classList.contains('full')) {
          // picker: karta tıkla → o evrene gir (native GİRİŞ hazır olana kadar dene), sonra overlay'i kapat
          let tries = 0;
          const tryEnter = () => {
            if (ovEnterUniverse(nm)) { setTimeout(closeOverview, 460); return; }
            if (++tries < 20) setTimeout(tryEnter, 100);
            // eşleşme hiç tutmazsa overlay AÇIK kalır (dev-gezegen seçici açığa çıkmasın)
          };
          tryEnter();
        } else {
          closeOverview();  // in-app GENEL BAKIŞ: overlay'i kapat, kullanıcı o evreni uygulamada görür
        }
        return;
      }
      const pa = e.target.closest('[data-pact]');
      if (pa) {
        const { pact, pid, pnm, pp } = pa.dataset;
        palClose();
        if (pact === 'git') showGit(pid, pnm);
        else if (pact === 'folder') { try { window.galaxy.openFolder(pp); } catch (err) {} }
        else if (pact === 'readme') showReadmePreview(pp, pnm);
        e.stopPropagation();
        return;
      }
      const pi = e.target.closest('[data-pi]');
      if (pi) { palRun(palItems($('#ghud-pal input').value)[+pi.dataset.pi]); return; }
      const gt = e.target.closest('[data-gtab]');
      if (gt) { gitCtx.tab = gt.dataset.gtab; renderGitCenter(); return; }
      const rs = e.target.closest('[data-restore]');
      if (rs) { window.galaxy.backupRestore(rs.dataset.restore).then(r => { if (r && r.error) alertLine(r.error); }); return; }
      const t = e.target.closest('[data-act],[data-rep]');
      if (!t) return;
      if (t.dataset.rep) { showReport(t.dataset.rep); return; }
      switch (t.dataset.act) {
        case 'refresh': refresh(); break;
        case 'folder': try { window.galaxy.openFolder(t.dataset.p); } catch (err) {} break;
        case 'git': showGit(t.dataset.id, t.dataset.nm); break;
        case 'reports': showReports(); break;
        case 'settings': try { window.galaxy.openSettings(); } catch (err) {} break;
        case 'palette': palOpen(); break;
        case 'guide': openGuide(t.dataset.sec || guideSec); break;
        case 'gitcenter': openGitCenterFromTab(t.dataset.tab || 'durum'); break;
        case 'backups': showBackups(); break;
        case 'close': popClose(); break;
      }
    });

    function alertLine(msg) {
      const pb = $('#ghud-pop .pb');
      if (pb) pb.insertAdjacentHTML('afterbegin', `<div class="ghud-empty" style="color:var(--gh-danger)">${esc(msg)}</div>`);
    }

    document.addEventListener('keydown', e => {
      if ((e.metaKey || e.ctrlKey) && (e.key === 'k' || e.key === 'K')) {
        e.preventDefault(); e.stopPropagation();
        if ($('#ghud-pal').classList.contains('open')) palClose(); else palOpen();
        return;
      }
      // F1 ya da ⌘/ → Seyir Rehberi
      if (e.key === 'F1' || ((e.metaKey || e.ctrlKey) && e.key === '/')) {
        e.preventDefault(); e.stopPropagation();
        if ($('#ghud-pop').classList.contains('guide')) popClose(); else openGuide();
        return;
      }
      if (e.key === 'Escape') {
        if ($('#ghud-lb').classList.contains('open')) { $('#ghud-lb').classList.remove('open'); e.stopPropagation(); return; }
        if ($('#ghud-ov').classList.contains('open') && !$('#ghud-ov').classList.contains('full')) { closeOverview(); e.stopPropagation(); return; }
        if ($('#ghud-pal').classList.contains('open')) { palClose(); e.stopPropagation(); return; }
        if ($('#ghud-pop').classList.contains('open')) { popClose(); e.stopPropagation(); return; }
        if (dock.classList.contains('open')) { setOpen(false); e.stopPropagation(); }
      }
    }, true);

    refresh().then(() => {
      // Açılışta native dev-gezegen seçicisi (picker) belirir belirmez onun YERİNE
      // yeni tasarım kart-grid'ini tam-ekran göster. Kullanıcı eski seçiciyi görmez;
      // karttan evrene girilir. Zaten bir evrene girilmişse (picker yok) açılmaz.
      setTimeout(() => ovOpenWhenPicker(40), 40);
    });
    // Açık overlay'i pencere yeniden boyutlanınca yeniden hizala
    window.addEventListener('resize', () => { if (ovIsOpen()) ovMeasure(); });
    watchReadmePanel();
    setInterval(() => { if (dock.classList.contains('open')) refresh(); }, 60000);
  }

  function waitReady(tries) {
    if (window.galaxy && document.body) { mount(); return; }
    if (tries > 100) return;
    setTimeout(() => waitReady(tries + 1), 100);
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => waitReady(0));
  } else waitReady(0);
})();
