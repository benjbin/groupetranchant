/* Groupe Tranchant — activités sportives (accueil), variante F (comparaison via ?sp=f) : la E, avec une scène 3D par activité dans la fenêtre.
   Les modules sport-3d-air.js / sport-3d-shot.js (mount(host,{reduceMotion}) → {play,pause,progress,pointer}) remplacent les photos ;
   les photos restent dessous en repli (pas de WebGL, module absent ou en erreur).
   « Index en plan-séquence » : l'index typographique (deux titres monumentaux en escalier) se pose dans une scène
   collante. Une fenêtre de visée, guidée par le défilement, s'ouvre en obturateur sur le titre actif ; à travers elle,
   les lettres réapparaissent en clair, parfaitement calées (calque jumeau). Le pointeur la fait dériver et peut
   réveiller l'autre titre ; au second temps, la fenêtre glisse vers « SHOOTING CLUBS » et s'ouvre en cinémascope.
   Une réglette graduée façon chronographe indique l'avancement. */
const U = 'https://www.groupetranchant.com/wp-content/uploads/2025/03/';
const ROWS = [
  { href: '/activites-sportives/#patrouille', n: '01', l1: 'PATROUILLE', l2: 'TRANCHANT', cta: 'Notre patrouille de voltige aérienne' },
  { href: '/activites-sportives/#shooting', n: '02', l1: 'SHOOTING', l2: 'CLUBS', cta: 'Nos complexes de loisirs sportifs' },
];

const CSS = `
#sportives.ex{padding:0;background:#F5F1EA;color:#0B1B2E;overflow:clip}
#sportives .ex-track{position:relative;height:280vh}
#sportives .ex-stage{position:sticky;top:0;height:100vh;height:100svh;overflow:hidden;--ink:#0B1B2E;--pp:#F5F1EA;--hair:rgba(11,27,46,.14);--fs:140px}
#sportives .ex-head{position:absolute;z-index:5;left:var(--gutter);right:var(--gutter);top:calc(84px + 3vh);display:flex;align-items:flex-end;justify-content:space-between;gap:24px}
#sportives .ex-head .kicker{color:rgba(11,27,46,.6);letter-spacing:.2em;opacity:1}
#sportives .ex-head .kicker .tri{transform:none}
/* index typographique (et son jumeau clair dans la fenêtre) */
#sportives .ex-board{position:absolute;left:var(--gutter);right:var(--gutter);top:var(--bt,200px)}
#sportives .ex-list{list-style:none;margin:0;padding:0;border-top:1px solid var(--hair)}
#sportives .ex-list li{margin:0;padding:0}
#sportives .ex-row{position:relative;display:grid;grid-template-columns:auto minmax(0,1fr) auto;grid-template-areas:"n . c" "t t t";align-items:center;row-gap:clamp(10px,1.8vh,20px);padding:clamp(14px,2.2vh,24px) 0 clamp(18px,3vh,30px);border-bottom:1px solid var(--hair);color:inherit;text-decoration:none;outline:none}
#sportives .ex-n{grid-area:n;font-family:var(--display);font-stretch:115%;font-weight:600;font-size:12.5px;letter-spacing:.16em;color:#335F94;transition:color .6s}
#sportives .ex-t{grid-area:t;margin:0;font-family:var(--display);font-weight:500;font-stretch:100%;font-size:var(--fs);line-height:.84;letter-spacing:-.045em;color:var(--ink);-webkit-text-stroke:1px transparent;white-space:nowrap;
  transition:font-stretch 1.2s var(--ease),color .7s var(--ease),-webkit-text-stroke-color .7s var(--ease)}
#sportives .ex-t>span{display:block;overflow:hidden;padding:.07em 0 .05em;margin:-.07em 0 -.05em}
#sportives .ex-t>span>span{display:inline-block;transform:translateY(108%);transition:transform 1.4s var(--ease)}
#sportives .ex-stage.in .ex-t>span>span{transform:none}
#sportives .ex-stage.in li:nth-child(1) .l2>span{transition-delay:.08s}
#sportives .ex-stage.in li:nth-child(2) .l1>span{transition-delay:.16s}
#sportives .ex-stage.in li:nth-child(2) .l2>span{transition-delay:.24s}
#sportives .ex-t .l2{padding-left:1.2em;transition:padding-left 1.2s var(--ease)}
#sportives .ex-cta{grid-area:c;display:inline-flex;align-items:center;gap:16px;font-size:13.5px;font-weight:600;white-space:nowrap;opacity:0;transform:translateY(12px);transition:opacity 1s .4s var(--ease),transform 1.2s .4s var(--ease)}
#sportives .ex-stage.in .ex-cta{opacity:1;transform:none}
#sportives .ex-cta u{text-decoration:none;background:linear-gradient(currentColor,currentColor) 0 100%/0 1px no-repeat;padding-bottom:3px;transition:background-size .8s var(--ease)}
#sportives .ex-go{display:grid;place-items:center;width:44px;height:44px;border-radius:50%;border:1px solid rgba(11,27,46,.22);font-size:16px;line-height:1;transition:background .5s,border-color .5s,color .5s,transform .8s var(--ease)}
#sportives .ex-rule{position:absolute;left:0;right:0;bottom:-1px;height:2px;background:linear-gradient(90deg,#000091 0 33.3%,#fff 33.3% 66.6%,#E1000F 66.6%);transform:scaleX(0);transform-origin:left;transition:transform 1.1s var(--ease)}
#sportives .ex-row:focus-visible{outline:2px solid #335F94;outline-offset:6px;border-radius:2px}
/* état actif : le titre actif s'élargit, l'autre passe au contour */
#sportives .ex-stage[data-on] .ex-t{color:transparent;-webkit-text-stroke-color:rgba(11,27,46,.3)}
#sportives .ex-stage[data-on] .ex-n{color:rgba(11,27,46,.35)}
#sportives .ex-stage[data-on="0"] li:nth-child(1) .ex-t,#sportives .ex-stage[data-on="1"] li:nth-child(2) .ex-t{color:var(--ink);-webkit-text-stroke-color:transparent;font-stretch:125%}
#sportives .ex-stage[data-on="0"] li:nth-child(1) .l2,#sportives .ex-stage[data-on="1"] li:nth-child(2) .l2{padding-left:.55em}
#sportives .ex-stage[data-on="0"] li:nth-child(1) .ex-n,#sportives .ex-stage[data-on="1"] li:nth-child(2) .ex-n{color:#BA2637}
#sportives .ex-stage[data-on="0"] li:nth-child(1) .ex-rule,#sportives .ex-stage[data-on="1"] li:nth-child(2) .ex-rule{transform:none}
#sportives .ex-stage[data-on="0"] li:nth-child(1) .ex-go,#sportives .ex-stage[data-on="1"] li:nth-child(2) .ex-go{background:var(--ink);border-color:var(--ink);color:var(--pp);transform:rotate(45deg)}
#sportives .ex-stage[data-on="0"] li:nth-child(1) .ex-cta u,#sportives .ex-stage[data-on="1"] li:nth-child(2) .ex-cta u{background-size:100% 1px}
#sportives .ex-row:hover .ex-cta u{background-size:100% 1px}
/* fenêtre de visée */
#sportives .ex-lens{position:absolute;inset:0;z-index:3;pointer-events:none;clip-path:inset(50% 50% 50% 50%);will-change:clip-path}
#sportives .ex-media{position:absolute;left:0;top:0;overflow:hidden;background:#10243A;will-change:transform}
#sportives .ex-stk{position:absolute;inset:0;clip-path:inset(100% 0 0 0);transition:clip-path 1.1s var(--ease)}
#sportives .ex-stk.on{clip-path:inset(0);z-index:1}
#sportives .ex-stk img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;will-change:transform,clip-path}
#sportives .f3d-host{position:absolute;inset:0;z-index:1;overflow:hidden;opacity:0;transition:opacity .8s var(--ease)}
#sportives .f3d-host.ready{opacity:1}
#sportives .f3d-host canvas{display:block}
#sportives .ex-veil{position:absolute;inset:0;z-index:2;background:linear-gradient(180deg,rgba(11,27,46,.2),rgba(11,27,46,.4))}
#sportives .ex-ghost .ex-list,#sportives .ex-ghost .ex-row{border-color:rgba(245,241,234,.22)}
#sportives .ex-ghost .ex-t{color:var(--pp)}
#sportives .ex-stage[data-on] .ex-ghost .ex-t{color:transparent;-webkit-text-stroke-color:rgba(245,241,234,.55)}
#sportives .ex-stage[data-on="0"] .ex-ghost li:nth-child(1) .ex-t,#sportives .ex-stage[data-on="1"] .ex-ghost li:nth-child(2) .ex-t{color:var(--pp);-webkit-text-stroke-color:transparent}
#sportives .ex-ghost .ex-n,#sportives .ex-stage[data-on] .ex-ghost .ex-n{color:rgba(245,241,234,.6)}
#sportives .ex-stage[data-on="0"] .ex-ghost li:nth-child(1) .ex-n,#sportives .ex-stage[data-on="1"] .ex-ghost li:nth-child(2) .ex-n{color:#F9C83B}
#sportives .ex-ghost .ex-cta{color:var(--pp)}
#sportives .ex-ghost .ex-go{border-color:rgba(245,241,234,.4)}
#sportives .ex-stage[data-on="0"] .ex-ghost li:nth-child(1) .ex-go,#sportives .ex-stage[data-on="1"] .ex-ghost li:nth-child(2) .ex-go{background:var(--pp);border-color:var(--pp);color:var(--ink)}
#sportives .ex-hair{position:absolute;left:0;top:0;height:1px;background:#0B1B2E;z-index:4;pointer-events:none}
#sportives .ex-mk{position:absolute;left:0;top:0;width:14px;height:14px;z-index:4;pointer-events:none;border:0 solid rgba(11,27,46,.55)}
#sportives .ex-mk.tl{border-left-width:1px;border-top-width:1px}
#sportives .ex-mk.tr{border-right-width:1px;border-top-width:1px}
#sportives .ex-mk.bl{border-left-width:1px;border-bottom-width:1px}
#sportives .ex-mk.br{border-right-width:1px;border-bottom-width:1px}
/* réglette graduée */
#sportives .ex-dial{position:relative;width:min(240px,26vw);height:28px;flex:none}
#sportives .ex-dial .sc{position:absolute;left:0;right:0;bottom:0;height:7px;background:repeating-linear-gradient(90deg,rgba(11,27,46,.32) 0 1px,transparent 1px 100%) 0 100%/6px 7px repeat-x}
#sportives .ex-dial .mj{position:absolute;left:0;right:0;bottom:0;height:12px;background:repeating-linear-gradient(90deg,rgba(11,27,46,.6) 0 1px,transparent 1px 100%) 0 100%/calc(25% - .25px) 12px repeat-x}
#sportives .ex-dial::after{content:"";position:absolute;right:0;bottom:0;width:1px;height:12px;background:rgba(11,27,46,.6)}
#sportives .ex-dial .lb{position:absolute;top:0;font-family:var(--display);font-stretch:115%;font-size:10px;font-weight:600;letter-spacing:.08em;color:rgba(11,27,46,.42);transition:color .5s}
#sportives .ex-dial .lb.on{color:#0B1B2E}
#sportives .ex-dial .nd{position:absolute;left:0;bottom:0;width:1px;height:21px;background:#BA2637;will-change:transform}
@media (max-width:760px){
  #sportives .ex-track{height:260vh}
  #sportives .ex-head{top:calc(70px + 2vh)}
  #sportives .ex-dial{width:112px;height:24px}
  #sportives .ex-row{grid-template-columns:minmax(0,1fr);grid-template-areas:"n" "t" "c";row-gap:16px;padding:40px 0 30px}
  #sportives .ex-cta{justify-self:start;gap:12px;font-size:12.5px}
  #sportives .ex-go{width:32px;height:32px;font-size:12px}
  #sportives .ex-t{line-height:.88}
  #sportives .ex-t .l2{padding-left:.9em}
  #sportives .ex-stage[data-on="0"] li:nth-child(1) .ex-t,#sportives .ex-stage[data-on="1"] li:nth-child(2) .ex-t{font-stretch:112%}
  #sportives .ex-stage[data-on="0"] li:nth-child(1) .l2,#sportives .ex-stage[data-on="1"] li:nth-child(2) .l2{padding-left:.75em}
  #sportives .ex-mk{width:10px;height:10px}
}
#sportives .ex-stage.rm *{transition:none!important}
`;

const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const ease = t => (t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const seg = (p, a, d) => ease(clamp((p - a) / d));
const lerp = (a, b, t) => a + (b - a) * t;

export function mountSport(section, { reduceMotion, lenis }) {
  section.className = 'section ex';
  const rowHTML = (r, i) => `<li><a class="ex-row" href="${r.href}" data-i="${i}">
      <span class="ex-n" aria-hidden="true">${r.n}</span>
      <h3 class="ex-t"><span class="l1"><span>${r.l1}</span></span> <span class="l2"><span>${r.l2}</span></span></h3>
      <span class="ex-cta"><u>${r.cta}</u><span class="ex-go" aria-hidden="true">↗</span></span>
      <span class="ex-rule" aria-hidden="true"></span>
    </a></li>`;
  section.innerHTML = `<style>${CSS}</style>
  <div class="ex-track"><div class="ex-stage${reduceMotion ? ' rm' : ''}">
    <div class="ex-head"><p class="kicker fx-in">Activités sportives<i class="tri"></i></p>
      <div class="ex-dial" aria-hidden="true"><span class="lb" style="left:0">01</span><span class="lb" style="left:50%">02</span><i class="sc"></i><i class="mj"></i><i class="nd"></i></div></div>
    <div class="ex-board"><ol class="ex-list">${ROWS.map(rowHTML).join('')}</ol></div>
    <div class="ex-hair" aria-hidden="true"></div>
    <div class="ex-lens" aria-hidden="true">
      <div class="ex-media">
        <div class="ex-stk" data-s="0">
          <img src="${U}494x626-avion-02.jpg" alt="" decoding="async" style="object-position:50% 40%">
          <img src="${U}494x626-avion-01.jpg" alt="" decoding="async" style="object-position:50% 55%">
          <img src="${U}494x626-avion-04.jpg" alt="" decoding="async" style="object-position:50% 45%">
          <div class="f3d-host" data-k="air"></div>
        </div>
        <div class="ex-stk" data-s="1"><img src="${U}plateau-balltrap.jpg" alt="" decoding="async" style="object-position:58% 50%"><div class="f3d-host" data-k="shot"></div></div>
        <div class="ex-veil"></div>
      </div>
      <div class="ex-board ex-ghost"></div>
    </div>
    <i class="ex-mk tl"></i><i class="ex-mk tr"></i><i class="ex-mk bl"></i><i class="ex-mk br"></i>
  </div></div>`;

  const $ = s => section.querySelector(s);
  const track = $('.ex-track'), stage = $('.ex-stage'), board = $('.ex-board'), list = $('.ex-list');
  const lens = $('.ex-lens'), media = $('.ex-media'), ghost = $('.ex-ghost'), hair = $('.ex-hair');
  const stks = [...section.querySelectorAll('.ex-stk')];
  const avion = [...stks[0].querySelectorAll('img')], shot = stks[1].querySelector('img');
  const marks = [...section.querySelectorAll('.ex-mk')];
  const dial = $('.ex-dial'), needle = $('.ex-dial .nd'), labels = [...section.querySelectorAll('.ex-dial .lb')];
  // calque jumeau, inerte, pour l'inversion des lettres dans la fenêtre
  const gList = list.cloneNode(true);
  gList.setAttribute('inert', '');
  gList.querySelectorAll('a').forEach(a => { a.removeAttribute('href'); a.setAttribute('tabindex', '-1'); });
  gList.querySelectorAll('h3').forEach(h => { const d = document.createElement('div'); d.className = h.className; d.innerHTML = h.innerHTML; h.replaceWith(d); });
  ghost.appendChild(gList);
  const rows = [...list.querySelectorAll('.ex-row')];
  const titles = rows.map(r => r.querySelector('.ex-t'));
  const fine = matchMedia('(hover:hover) and (pointer:fine)');

  let G = null;
  function layout() {
    const vw = stage.clientWidth, vh = stage.clientHeight, mob = vw < 760;
    const g = Math.min(72, Math.max(18, vw * .045));
    const W = vw - 2 * g;
    const head = mob ? 70 + vh * .02 + 40 : 84 + vh * .03 + 44;
    // corps : borné par la largeur (comme l'index) et par la hauteur de la scène
    let fs = mob ? W / 7.7 : Math.min(176, W / 8.6);
    stage.style.setProperty('--fs', fs.toFixed(1) + 'px');
    const avail = vh - head - (mob ? 24 : 36);
    let bh = board.offsetHeight;
    if (bh > avail) { fs *= Math.max(.5, (avail - (bh - 3.5 * fs * .88)) / (3.5 * fs * .88)); stage.style.setProperty('--fs', fs.toFixed(1) + 'px'); bh = board.offsetHeight; }
    const bt = Math.round(head + Math.max(0, (avail - bh) * (mob ? .45 : .5)));
    stage.style.setProperty('--bt', bt + 'px');
    const lw = Math.round(mob ? Math.min(W * .42, 170) : Math.min(Math.max(W * .22, 230), 340));
    const lh = Math.round(lw * 1.25);
    const tb = titles.map(t => { const r = t.getBoundingClientRect(), s = stage.getBoundingClientRect(); return { top: r.top - s.top, h: r.height }; });
    G = { vw, vh, mob, g, W, lw, lh, tb, bt, bh };
    draw(true);
  }

  const progress = () => { const r = track.getBoundingClientRect(); return -r.top / Math.max(1, r.height - stage.clientHeight); };

  // pointeur : dérive douce de la fenêtre, et survol d'une rangée = la réveiller
  let mx = null, my = null, hov = -1, foc = -1;
  stage.addEventListener('pointermove', e => {
    if (e.pointerType !== 'mouse' && e.pointerType !== 'pen') return;
    const s = stage.getBoundingClientRect(); mx = e.clientX - s.left; my = e.clientY - s.top;
    const hit = e.target.closest?.('.ex-row'); hov = hit ? rows.indexOf(hit) : -1;
  }, { passive: true });
  stage.addEventListener('pointerleave', () => { mx = my = null; hov = -1; });
  rows.forEach((r, i) => { r.addEventListener('focus', () => { foc = i; }); r.addEventListener('blur', () => { if (foc === i) foc = -1; }); });

  // géométrie cible de la fenêtre pour une rangée
  function target(i, wideF, p) {
    const { W, g, lw, lh, tb, vh, mob } = G;
    const cy = tb[i].top + tb[i].h / 2;
    // portrait : posé sur les lettres, glisse lentement au fil du plan
    const drift = i === 0 ? clamp((p + .05) / .5) : clamp((p - .45) / .3);
    let cx = g + W * (mob ? .7 : lerp(i === 0 ? .44 : .36, i === 0 ? .6 : .5, drift));
    let py = cy;
    if (mx != null && fine.matches && !mob) { cx = lerp(cx, mx, .5); py = cy + clamp((my - cy) * .12, -30, 30); }
    let x = cx - lw / 2, y = py - lh / 2, w = lw, h = lh;
    x = clamp(x, g, g + W - lw);
    y = clamp(y, mob ? 120 : 150, vh - lh - (mob ? 14 : 18));
    // cinémascope : toute la largeur utile, calé sur le titre
    const wh = mob ? Math.min(vh * .42, tb[i].h + 150) : Math.min(W / 2.39, vh * .5);
    let wy = clamp(cy - wh / 2, (mob ? 120 : 150), vh - wh - (mob ? 14 : 22));
    return { x: lerp(x, g, wideF), y: lerp(y, wy, wideF), w: lerp(w, W, wideF), h: lerp(h, wh, wideF) };
  }

  /* scènes 3D : une par activité, chargées à l'approche ; toute erreur rend la main aux photos */
  const hosts = [...section.querySelectorAll('.f3d-host')];
  const S3 = [null, null], playing = [false, false], lastP = [-1, -1], lastM = [[9, 9], [9, 9]];
  const kill = i => { const h = hosts[i]; S3[i] = null; playing[i] = false; h.classList.remove('ready'); h.replaceChildren(); h.remove(); };
  const call = (i, fn, ...a) => { const sc = S3[i]; if (!sc) return; try { sc[fn]?.(...a); } catch (err) { console.warn('scène 3D désactivée', err); kill(i); } };
  const hasGL = (() => { try { const c = document.createElement('canvas'); return !!(c.getContext('webgl2') || c.getContext('webgl')); } catch { return false; } })();
  let loaded = false;
  function load3d() {
    if (loaded || !hasGL) return; loaded = true;
    const mods = [() => import('./sport-3d-air.js'), () => import('./sport-3d-shot.js')];
    mods.forEach((imp, i) => imp().then(m => {
      const sc = m.mount(hosts[i], { reduceMotion });
      if (!sc || typeof sc.play !== 'function') throw new Error('contrat de scène invalide');
      S3[i] = sc; lastP[i] = -1; lastM[i] = [9, 9]; hosts[i].classList.add('ready'); draw(true);
    }).catch(err => { console.warn('scène 3D indisponible', err); kill(i); }));
  }
  function sync3d(on, p) {
    for (let i = 0; i < 2; i++) {
      if (!S3[i]) continue;
      const want = running && i === on;
      if (want !== playing[i]) { playing[i] = want; call(i, want ? 'play' : 'pause'); }
    }
    if (!S3[on] || !R) return;
    const cp = on === 0 ? clamp((p + .06) / .56) : clamp((p - .44) / .56);
    if (Math.abs(cp - lastP[on]) > 1e-4) { lastP[on] = cp; call(on, 'progress', cp); }
    const inside = mx != null && mx >= R.x && mx <= R.x + R.w && my >= R.y && my <= R.y + R.h;
    const px = inside ? clamp((mx - R.x) / R.w - .5, -.5, .5) : 0, py = inside ? clamp((my - R.y) / R.h - .5, -.5, .5) : 0;
    if (px !== lastM[on][0] || py !== lastM[on][1]) { lastM[on] = [px, py]; call(on, 'pointer', px, py); }
  }

  let R = null, last = 0, curOn = null, curStk = -1;
  function draw(force) {
    if (!G) return;
    let p = progress();
    if (reduceMotion) p = p < .5 ? .3 : .85;
    const now = performance.now(), dt = Math.min(.1, (now - (last || now)) / 1000); last = now;
    stage.classList.toggle('in', p > -.35);

    const sOn = p < .5 ? 0 : 1;
    const settled = p > -.06;
    const ovr = foc >= 0 ? foc : hov;
    const on = ovr >= 0 ? ovr : sOn;
    const onAttr = settled || ovr >= 0 ? String(on) : null;
    if (onAttr !== curOn) { curOn = onAttr; onAttr == null ? stage.removeAttribute('data-on') : stage.dataset.on = onAttr; }

    // ouverture en obturateur, voyage d'une rangée à l'autre, puis cinémascope
    const open = ovr >= 0 ? 1 : seg(p, -.06, .14);
    const wideF = on === 1 ? seg(p, .6, .16) : 0;
    let T;
    if (ovr < 0) {
      const tr = seg(p, .44, .12);
      const a = target(0, 0, p), b = target(1, wideF, p);
      T = { x: lerp(a.x, b.x, tr), y: lerp(a.y, b.y, tr), w: lerp(a.w, b.w, tr), h: lerp(a.h, b.h, tr) };
    } else T = target(on, wideF, p);
    if (!R || force || reduceMotion) R = { ...T };
    else { const k = 1 - Math.exp(-dt * 9); for (const key in R) R[key] += (T[key] - R[key]) * k; }

    const { vw, vh, mob } = G;
    const oh = R.h * open, oy = R.y + (R.h - oh) / 2;
    lens.style.clipPath = `inset(${oy.toFixed(1)}px ${(vw - R.x - R.w).toFixed(1)}px ${(vh - oy - oh).toFixed(1)}px ${R.x.toFixed(1)}px)`;
    media.style.width = R.w + 'px'; media.style.height = R.h + 'px';
    media.style.transform = `translate3d(${R.x}px,${R.y}px,0)`;
    hair.style.transform = `translate3d(${R.x}px,${R.y + R.h / 2}px,0)`; hair.style.width = R.w + 'px';
    hair.style.opacity = (1 - clamp(open * 4)) * clamp((p + .3) / .2);
    const o = mob ? 8 : 11, s = mob ? 10 : 14;
    const pts = [[R.x - o, R.y - o], [R.x + R.w + o - s, R.y - o], [R.x - o, R.y + R.h + o - s], [R.x + R.w + o - s, R.y + R.h + o - s]];
    const mo = clamp((p + .3) / .2);
    marks.forEach((m, i) => { m.style.transform = `translate3d(${pts[i][0].toFixed(1)}px,${pts[i][1].toFixed(1)}px,0)`; m.style.opacity = mo; });

    // photos : la série de la rangée active ; la Patrouille se déroule en volets au fil du défilement
    if (on !== curStk) { curStk = on; stks.forEach((el, i) => el.classList.toggle('on', i === on)); }
    const w1 = seg(p, .12, .08), w2 = seg(p, .26, .08);
    avion[0].style.transform = `scale(${lerp(1.16, 1.03, clamp((p + .06) / .3)).toFixed(4)})`;
    avion[1].style.clipPath = `inset(${((1 - w1) * 100).toFixed(2)}% 0 0 0)`;
    avion[1].style.transform = `scale(${lerp(1.14, 1.03, clamp((p - .12) / .2)).toFixed(4)})`;
    avion[2].style.clipPath = `inset(${((1 - w2) * 100).toFixed(2)}% 0 0 0)`;
    avion[2].style.transform = `scale(${lerp(1.14, 1.03, clamp((p - .26) / .2)).toFixed(4)})`;
    const kb = clamp((p - .45) / .55);
    shot.style.transform = `scale(${lerp(1.22, 1.05, kb).toFixed(4)}) translate3d(${lerp(2.5, -1.5, kb).toFixed(3)}%,0,0)`;

    labels.forEach((l, i) => l.classList.toggle('on', i === sOn));
    needle.style.transform = `translate3d(${(clamp(p) * (dial.clientWidth - 1)).toFixed(1)}px,0,0)`;
    sync3d(on, p);
  }

  // boucle d'animation tant que la scène est visible (inertie de la fenêtre)
  let raf = 0, running = false;
  const loop = () => { draw(false); raf = running ? requestAnimationFrame(loop) : 0; };
  const io = new IntersectionObserver(es => es.forEach(e => {
    if (e.isIntersecting && !running) { running = true; last = 0; raf = requestAnimationFrame(loop); }
    else if (!e.isIntersecting) { running = false; cancelAnimationFrame(raf); for (let i = 0; i < 2; i++) if (playing[i]) { playing[i] = false; call(i, 'pause'); } }
  }));
  // les modules 3D (et three.js) ne se chargent qu'à l'approche de la section
  const pre = new IntersectionObserver(es => { if (es.some(e => e.isIntersecting)) { pre.disconnect(); load3d(); } }, { rootMargin: '100% 0px' });
  pre.observe(track);
  io.observe(track);
  if (lenis) lenis.on('scroll', () => { if (!running) draw(false); });

  if (reduceMotion) track.style.height = '200vh';
  let rz; addEventListener('resize', () => { cancelAnimationFrame(rz); rz = requestAnimationFrame(layout); });
  layout();
  (document.fonts?.ready || Promise.resolve()).then(layout);
  setTimeout(layout, 1500);
}
