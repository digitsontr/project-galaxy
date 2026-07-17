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
    alert: svg('<path d="M12 3l10 17H2L12 3z"/><path d="M12 10v4"/><path d="M12 17.5h.01"/>')
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
  #ghud-dock, #ghud-pop, #ghud-tab {
    font-family: 'Space Grotesk', -apple-system, sans-serif;
    --gh-cy:#5fe0ff; --gh-vio:#8b7bff; --gh-mag:#ff7bd8;
    --gh-ink:#eaf0ff; --gh-dim:#93a0c8; --gh-faint:#55608a;
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
  .ghud-chip.warn, .ghud-chip.warn svg { color:#ffd166; }
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

  /* — popover — */
  #ghud-pop {
    position:fixed; z-index:10000; left:50%; bottom:186px; transform:translateX(-50%);
    width:min(680px, 90vw); max-height:min(480px, 58vh); display:none; flex-direction:column;
    background:var(--gh-panel); border:1px solid var(--gh-line); border-radius:14px;
    box-shadow:0 18px 64px rgba(0,0,0,.65); animation:ghudIn .18s ease; color:var(--gh-ink);
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
  `;

  /* ================= 3. VERİ + DOCK ================= */

  const $ = (sel, root) => (root || document).querySelector(sel);
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const fdate = ts => { try { return String(ts).slice(5, 10).replace('-', '.'); } catch (e) { return ''; } };

  let cache = { projects: [], universes: [], log: [], alerts: [] };

  async function refresh() {
    try {
      const [scan, log] = await Promise.all([window.galaxy.load(), window.galaxy.logList()]);
      cache = { projects: scan.projects || [], universes: scan.universes || [], log: log || [], alerts: scan.alerts || [] };
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
          <span class="ghud-t">EN AKTİF YILDIZ</span>
          <span class="ghud-a" data-act="refresh" title="Yenile">${I.refresh}</span></div>
        <div class="ghud-body"><div class="ghud-hero-row">
          <div class="ghud-thumb">${planetThumb(hueOf(star.id))}</div>
          <div class="ghud-hero-info">
            <div class="ghud-star-name">${esc(star.name)}</div>
            <div class="ghud-sub">${esc(uniName(star.universe))}${star.stage ? ' · ' + esc(star.stage) : ''} · %${star.progress || 0}</div>
            <div class="ghud-bar"><div style="width:${Math.max(2, Math.min(100, star.progress || 0))}%"></div></div>
            <div class="ghud-meta">
              ${star.git ? `<span class="ghud-chip ghud-mono">${I.branch}${esc(star.git.branch || '?')} · ${star.git.activity30 || 0}</span>` : ''}
              ${star.staleDays >= 21 ? `<span class="ghud-chip warn ghud-mono">${I.alert}${star.staleDays}g</span>` : ''}
              ${alerts ? `<span class="ghud-chip warn ghud-mono">${I.alert}${alerts} uyarı</span>` : ''}
              <span style="flex:1"></span>
              <span class="ghud-btn" data-act="folder" data-p="${esc(star.path)}">${I.folder}KLASÖR</span>
              <span class="ghud-btn" data-act="git" data-id="${esc(star.id)}" data-nm="${esc(star.name)}">${I.branch}GEÇMİŞ</span>
            </div>
          </div>
        </div></div>`;
    } else {
      heroEl.innerHTML = `
        <div class="ghud-h"><span class="hic">${I.rocket}</span><span class="ghud-t">EN AKTİF YILDIZ</span></div>
        <div class="ghud-empty">Henüz proje taranmadı.</div>`;
    }

    $('#ghud-recent').innerHTML = `
      <div class="ghud-h"><span class="hic">${I.clock}</span>
        <span class="ghud-t">SON YAPILANLAR</span>
        <span class="ghud-a wtxt" data-act="reports" title="Rapor arşivi">${I.doc}RAPORLAR</span></div>
      <div class="ghud-body">
      ${done.length ? done.map(l => `
        <div class="ghud-li"><span class="d ghud-mono">${fdate(l.ts)}</span>
          <span class="x">${esc(l.text)}</span>
          <span class="p ghud-mono">${esc(projName(l.projectId))}</span></div>`).join('')
        : '<div class="ghud-empty">Günlüğe işlenmiş iş yok — ✎ GÜNLÜK ile ekle.</div>'}</div>`;

    $('#ghud-notes').innerHTML = `
      <div class="ghud-h"><span class="hic">${I.pencil}</span>
        <span class="ghud-t">NOTLARIM</span>
        <span class="ghud-a wtxt ghud-mono" title="Her yerden hızlı not">⌘⇧G</span></div>
      <div class="ghud-body">
      ${notes.length ? notes.map(l => `
        <div class="ghud-li"><span class="d ghud-mono">${fdate(l.ts)}</span>
          <span class="x">${esc(l.text)}</span></div>`).join('')
        : '<div class="ghud-empty">Not yok.</div>'}</div>
      <div class="ghud-note-in">
        <input id="ghud-note-inp" type="text" placeholder="Hızlı not… (Enter)" maxlength="300">
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
    $('#ghud-pop .pb').innerHTML = bodyHtml;
    $('#ghud-pop').classList.add('open');
  }
  function popClose() { $('#ghud-pop').classList.remove('open'); }

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

  async function showGit(id, nm) {
    let r = null;
    try { r = await window.galaxy.gitLog(id); } catch (e) {}
    if (!r || !r.ok) { popOpen(I.branch, nm, '<div class="ghud-empty">Git deposu yok.</div>'); return; }
    popOpen(I.branch, nm + ' · ' + r.branch,
      (r.dirty ? `<div class="ghud-chip warn ghud-mono" style="margin-bottom:8px">${I.alert}${r.dirty} commit'lenmemiş değişiklik</div>` : '') +
      (r.commits.length ? r.commits.slice(0, 30).map(c => `
        <div class="ghud-commit ghud-mono">
          <span class="h7">${esc(c.h)}</span><span class="w">${esc(c.ad)}</span>
          <span style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(c.s)}</span></div>`).join('')
        : '<div class="ghud-empty">Commit yok.</div>'));
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
      const t = (el.textContent || '').trim().toLocaleLowerCase('tr');
      if (t !== 'readme bulunamadı' && t !== 'readme bulunamadi') continue;
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

  function enhanceAll() {
    injectReadmeButton();
    enhanceReadmeTables();
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

  /* ================= 5. KURULUM ================= */

  function setOpen(open) {
    const dock = $('#ghud-dock'), tab = $('#ghud-tab');
    dock.classList.toggle('open', open);
    tab.classList.toggle('open', open);
    tab.title = open ? 'HUD paneli kapat' : 'HUD paneli aç';
    if (open) refresh(); else popClose();
  }

  function mount() {
    const style = document.createElement('style');
    style.textContent = CSS;
    document.head.appendChild(style);

    document.body.appendChild(buildNebula());

    // her zaman görünür aç/kapa sekmesi (alt-orta)
    const tab = document.createElement('div');
    tab.id = 'ghud-tab';
    tab.innerHTML = `<span class="ric">${I.rocket}</span><span>HUD</span><span class="chev">${I.chevUp}</span>`;
    tab.title = 'HUD paneli aç';
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
      <span class="ghud-a" data-act="close">${I.close}</span></div>
      <div class="pb"></div>`;
    document.body.appendChild(pop);

    tab.addEventListener('click', () => setOpen(!dock.classList.contains('open')));

    document.addEventListener('click', e => {
      const t = e.target && e.target.closest ? e.target.closest('[data-act],[data-rep]') : null;
      if (!t) return;
      if (t.dataset.rep) { showReport(t.dataset.rep); return; }
      switch (t.dataset.act) {
        case 'refresh': refresh(); break;
        case 'folder': try { window.galaxy.openFolder(t.dataset.p); } catch (err) {} break;
        case 'git': showGit(t.dataset.id, t.dataset.nm); break;
        case 'reports': showReports(); break;
        case 'close': popClose(); break;
      }
    });

    document.addEventListener('keydown', e => {
      if (e.key === 'Escape') {
        if ($('#ghud-pop').classList.contains('open')) { popClose(); e.stopPropagation(); return; }
        if (dock.classList.contains('open')) { setOpen(false); e.stopPropagation(); }
      }
    }, true);

    refresh();
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
