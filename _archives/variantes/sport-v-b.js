/* Groupe Tranchant — activités sportives (accueil), variante B (comparaison via ?sp=b).
   « Index typographique » : deux lignes de titres monumentales. Une fenêtre photo (4:5) suit le pointeur
   avec inertie ; à travers elle, le titre réapparaît en clair sur l'image (lentille). Au tactile, la fenêtre
   se pose sur la ligne au centre de l'écran et glisse de l'une à l'autre au défilement. */
export function mountSport(section, { reduceMotion, lenis }) {
  const U = 'https://www.groupetranchant.com/wp-content/uploads/2025/03/';
  const ROWS = [
    { href: '/activites-sportives/#patrouille', n: '01', l1: 'PATROUILLE', l2: 'TRANCHANT', cta: 'Notre patrouille de voltige aérienne',
      imgs: [[U + '494x626-avion-02.jpg', '50% 40%'], [U + '494x626-avion-01.jpg', '50% 55%'], [U + '494x626-avion-04.jpg', '50% 45%']] },
    { href: '/activites-sportives/#shooting', n: '02', l1: 'SHOOTING', l2: 'CLUBS', cta: 'Nos complexes de loisirs sportifs',
      imgs: [[U + 'plateau-balltrap.jpg', '58% 50%'], [U + 'plateau-balltrap.jpg', '14% 60%'], [U + 'plateau-balltrap.jpg', '88% 35%']] },
  ];

  const css = `
#sportives.ixb{--ink:#0B1B2E;--pp:#F5F1EA;--hair:rgba(11,27,46,.14);position:relative;background:var(--pp);color:var(--ink);padding:clamp(110px,17vh,190px) var(--gutter) clamp(120px,19vh,210px);overflow:hidden}
#sportives .ixb-head{display:flex;align-items:flex-end;justify-content:space-between;gap:24px;margin-bottom:clamp(36px,6vh,72px)}
#sportives .kicker{color:rgba(11,27,46,.58)}
#sportives .ixb-count{font-family:var(--display);font-stretch:115%;font-weight:600;font-size:12px;letter-spacing:.16em;color:rgba(11,27,46,.45)}
#sportives .ixb-wrap{position:relative}
#sportives .ixb-list{list-style:none;margin:0;padding:0;border-top:1px solid var(--hair)}
#sportives .ixb-list li{margin:0;padding:0}
#sportives .ixb-row{position:relative;display:grid;grid-template-columns:auto minmax(0,1fr) auto;grid-template-areas:"n . c" "t t t";align-items:center;row-gap:clamp(22px,3.6vh,40px);padding:clamp(26px,4vh,44px) 0 clamp(34px,5.4vh,60px);border-bottom:1px solid var(--hair);color:inherit;text-decoration:none;outline:none;cursor:pointer}
#sportives .ixb-n{grid-area:n;font-family:var(--display);font-stretch:115%;font-weight:600;font-size:12.5px;letter-spacing:.16em;color:var(--blue);transition:color .6s}
#sportives .ixb-t{margin:0;font-family:var(--display);font-weight:500;font-stretch:100%;grid-area:t;font-size:min(calc((100vw - 2 * var(--gutter)) / 8.45),190px);line-height:.84;letter-spacing:-.045em;color:var(--ink);-webkit-text-stroke:1px transparent;transition:font-stretch 1.2s var(--ease),color .7s var(--ease),-webkit-text-stroke-color .7s var(--ease)}
#sportives .ixb-t>span{display:block;overflow:hidden;padding:.07em 0 .05em;margin:-.07em 0 -.05em}
#sportives .ixb-t>span>span{display:inline-block;transform:translateY(108%);transition:transform 1.4s var(--ease)}
#sportives .ixb-wrap.in .ixb-t>span>span{transform:none}
#sportives .ixb-wrap.in li:nth-child(1) .l2>span{transition-delay:.08s}
#sportives .ixb-wrap.in li:nth-child(2) .l1>span{transition-delay:.16s}
#sportives .ixb-wrap.in li:nth-child(2) .l2>span{transition-delay:.24s}
#sportives .ixb-t .l2{padding-left:1.2em;transition:padding-left 1.2s var(--ease)}
#sportives .ixb-cta{grid-area:c;display:inline-flex;align-items:center;gap:16px;font-size:13.5px;font-weight:600;letter-spacing:.005em;white-space:nowrap;opacity:0;transform:translateY(14px);transition:opacity 1s .5s var(--ease),transform 1.2s .5s var(--ease)}
#sportives .ixb-wrap.in .ixb-cta{opacity:1;transform:none}
#sportives .ixb-cta u{text-decoration:none;background:linear-gradient(currentColor,currentColor) 0 100%/0 1px no-repeat;padding-bottom:3px;transition:background-size .8s var(--ease)}
#sportives .ixb-go{display:grid;place-items:center;width:48px;height:48px;border-radius:50%;border:1px solid rgba(11,27,46,.22);font-size:17px;line-height:1;transition:background .5s,border-color .5s,color .5s,transform .8s var(--ease)}
#sportives .ixb-rule{position:absolute;left:0;right:0;bottom:-1px;height:2px;background:linear-gradient(90deg,#000091 0 33.3%,#fff 33.3% 66.6%,#E1000F 66.6%);transform:scaleX(0);transform-origin:left;transition:transform 1.1s var(--ease)}
/* état actif : la ligne survolée s'élargit et reste pleine, l'autre passe au contour */
#sportives .ixb-wrap.has-on .ixb-t{color:transparent;-webkit-text-stroke-color:rgba(11,27,46,.3)}
#sportives .ixb-wrap.has-on .ixb-n{color:rgba(11,27,46,.35)}
#sportives .ixb-wrap[data-on="0"] li:nth-child(1) .ixb-t,#sportives .ixb-wrap[data-on="1"] li:nth-child(2) .ixb-t{color:var(--ink);-webkit-text-stroke-color:transparent;font-stretch:125%}
#sportives .ixb-wrap[data-on="0"] li:nth-child(1) .l2,#sportives .ixb-wrap[data-on="1"] li:nth-child(2) .l2{padding-left:.55em}
#sportives .ixb-wrap[data-on="0"] li:nth-child(1) .ixb-n,#sportives .ixb-wrap[data-on="1"] li:nth-child(2) .ixb-n{color:var(--bordeaux)}
#sportives .ixb-wrap[data-on="0"] li:nth-child(1) .ixb-rule,#sportives .ixb-wrap[data-on="1"] li:nth-child(2) .ixb-rule{transform:none}
#sportives .ixb-wrap[data-on="0"] li:nth-child(1) .ixb-go,#sportives .ixb-wrap[data-on="1"] li:nth-child(2) .ixb-go{background:var(--ink);border-color:var(--ink);color:var(--pp);transform:rotate(45deg)}
#sportives .ixb-wrap[data-on="0"] li:nth-child(1) .ixb-cta u,#sportives .ixb-wrap[data-on="1"] li:nth-child(2) .ixb-cta u{background-size:100% 1px}
#sportives .ixb-list>li>.ixb-row:focus-visible{outline:2px solid var(--blue);outline-offset:6px;border-radius:2px}
/* lentille photo */
#sportives .ixb-lens{position:absolute;left:0;top:0;z-index:3;width:var(--lw);aspect-ratio:4/5;overflow:hidden;pointer-events:none;clip-path:inset(50% 50% 50% 50% round 2px);transition:clip-path .95s var(--ease);will-change:transform;background:#10243A}
#sportives .ixb-wrap.has-on .ixb-lens{clip-path:inset(0 0 0 0 round 2px)}
#sportives .ixb-media{position:absolute;inset:-6%;will-change:transform}
#sportives .ixb-media img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;clip-path:inset(100% 0 0 0);transform:scale(1.22);transition:clip-path 1.15s var(--ease),transform 1.9s var(--ease);filter:saturate(.92) contrast(1.04)}
#sportives .ixb-media img.show{clip-path:inset(0);transform:scale(1.04)}
#sportives .ixb-veil{position:absolute;inset:0;background:linear-gradient(180deg,rgba(11,27,46,.18),rgba(11,27,46,.42))}
#sportives .ixb-ghost{position:absolute;left:0;top:0;will-change:transform}
#sportives .ixb-ghost .ixb-list{border-color:rgba(245,241,234,.22)}
#sportives .ixb-ghost .ixb-row{border-color:rgba(245,241,234,.22)}
#sportives .ixb-ghost .ixb-t,#sportives .ixb-ghost .ixb-wrap .ixb-t{color:var(--pp)}
#sportives .ixb-wrap.has-on .ixb-ghost .ixb-t{color:transparent;-webkit-text-stroke-color:rgba(245,241,234,.55)}
#sportives .ixb-wrap[data-on="0"] .ixb-ghost li:nth-child(1) .ixb-t,#sportives .ixb-wrap[data-on="1"] .ixb-ghost li:nth-child(2) .ixb-t{color:var(--pp);-webkit-text-stroke-color:transparent}
#sportives .ixb-ghost .ixb-n,#sportives .ixb-wrap.has-on .ixb-ghost .ixb-n{color:rgba(245,241,234,.6)}
#sportives .ixb-wrap[data-on="0"] .ixb-ghost li:nth-child(1) .ixb-n,#sportives .ixb-wrap[data-on="1"] .ixb-ghost li:nth-child(2) .ixb-n{color:var(--yellow)}
#sportives .ixb-ghost .ixb-cta{color:var(--pp)}
#sportives .ixb-ghost .ixb-go{border-color:rgba(245,241,234,.4)}
#sportives .ixb-wrap[data-on="0"] .ixb-ghost li:nth-child(1) .ixb-go,#sportives .ixb-wrap[data-on="1"] .ixb-ghost li:nth-child(2) .ixb-go{background:var(--pp);border-color:var(--pp);color:var(--ink)}
@media (max-width:760px){
  #sportives.ixb{padding:96px var(--gutter) 110px}
  #sportives .ixb-row{grid-template-columns:minmax(0,1fr);grid-template-areas:"n" "t" "c";row-gap:16px;padding:40px 0 28px}
  #sportives .ixb-cta{justify-self:start;margin-top:6px}
  #sportives .ixb-t{font-size:calc((100vw - 2 * var(--gutter)) / 7.7);line-height:.88}
  #sportives .ixb-t .l2{padding-left:.9em}
  #sportives .ixb-wrap[data-on="0"] li:nth-child(1) .ixb-t,#sportives .ixb-wrap[data-on="1"] li:nth-child(2) .ixb-t{font-stretch:112%}
  #sportives .ixb-wrap[data-on="0"] li:nth-child(1) .l2,#sportives .ixb-wrap[data-on="1"] li:nth-child(2) .l2{padding-left:.75em}
  #sportives .ixb-cta{gap:12px;font-size:12.5px}
  #sportives .ixb-go{width:34px;height:34px;font-size:13px}
}
@media (prefers-reduced-motion:reduce){
  #sportives .ixb-t,#sportives .ixb-t .l2,#sportives .ixb-t>span>span,#sportives .ixb-cta,#sportives .ixb-lens,#sportives .ixb-media img,#sportives .ixb-rule{transition:none!important}
}`;

  const rowHTML = (r, i) => `<li><a class="ixb-row" href="${r.href}" data-i="${i}">
      <span class="ixb-n" aria-hidden="true">${r.n}</span>
      <h3 class="ixb-t"><span class="l1"><span>${r.l1}</span></span> <span class="l2"><span>${r.l2}</span></span></h3>
      <span class="ixb-cta"><u>${r.cta}</u><span class="ixb-go" aria-hidden="true">↗</span></span>
      <span class="ixb-rule" aria-hidden="true"></span>
    </a></li>`;
  const imgs = ROWS.map((r, s) => r.imgs.map(([src, pos], k) => `<img src="${src}" alt="" data-s="${s}" data-k="${k}" style="object-position:${pos}" decoding="async">`).join('')).join('');

  section.className = 'section ixb';
  section.innerHTML = `<style>${css}</style>
  <div class="ixb-head"><p class="kicker">Activités sportives<i class="tri"></i></p><span class="ixb-count" aria-hidden="true">01 / 02</span></div>
  <div class="ixb-wrap">
    <ol class="ixb-list">${ROWS.map(rowHTML).join('')}</ol>
    <div class="ixb-lens" aria-hidden="true"><div class="ixb-media">${imgs}</div><div class="ixb-veil"></div><div class="ixb-ghost"></div></div>
  </div>`;

  const wrap = section.querySelector('.ixb-wrap');
  const list = wrap.querySelector('.ixb-list');
  const lens = wrap.querySelector('.ixb-lens');
  const media = lens.querySelector('.ixb-media');
  const ghost = lens.querySelector('.ixb-ghost');
  const gList = list.cloneNode(true);
  gList.setAttribute('inert', '');
  gList.querySelectorAll('a').forEach(a => { a.removeAttribute('href'); a.setAttribute('tabindex', '-1'); });
  gList.querySelectorAll('h3').forEach(h => { const d = document.createElement('div'); d.className = h.className; d.innerHTML = h.innerHTML; h.replaceWith(d); });
  ghost.appendChild(gList);
  const rows = [...list.querySelectorAll('.ixb-row')];
  const pics = [...media.querySelectorAll('img')];

  const fine = matchMedia('(hover:hover) and (pointer:fine)');
  const narrow = matchMedia('(max-width:760px)');
  let W = 0, lw = 0, lh = 0;
  const measure = () => {
    W = wrap.clientWidth;
    lw = narrow.matches ? Math.round(Math.min(W * 0.38, 190)) : Math.round(Math.min(Math.max(W * 0.2, 220), 330));
    lh = Math.round(lw * 1.25);
    wrap.style.setProperty('--lw', lw + 'px');
    ghost.style.width = W + 'px';
  };
  measure();
  addEventListener('resize', measure, { passive: true });

  /* photos : chaque ligne a sa série, qui se déroule par volets successifs tant qu'elle est active */
  let on = -1, k = 0, z = 1, timer = 0;
  const show = (s, i) => {
    const img = pics.find(p => +p.dataset.s === s && +p.dataset.k === i);
    img.classList.remove('show'); void img.offsetWidth;
    img.style.zIndex = ++z; img.classList.add('show');
    const keep = img;
    setTimeout(() => pics.forEach(p => { if (p !== keep && +p.style.zIndex < +keep.style.zIndex) p.classList.remove('show'); }), 1300);
  };
  const activate = i => {
    if (i === on) return;
    on = i;
    clearInterval(timer);
    if (i < 0) { wrap.classList.remove('has-on'); wrap.removeAttribute('data-on'); return; }
    wrap.classList.add('has-on'); wrap.dataset.on = i;
    k = 0; show(i, 0);
    if (!reduceMotion) timer = setInterval(() => { k = (k + 1) % ROWS[i].imgs.length; show(on, k); }, 2200);
  };

  /* position de la lentille : pointeur (souris) ou ancre sur la ligne (clavier, tactile) */
  let x = 0, y = 0, tx = 0, ty = 0, vx = 0, cx = -1, cy = -1, inside = false, mode = 'anchor', snap = true;
  const anchor = i => {
    const r = rows[i];
    if (narrow.matches) { const t = r.querySelector('.ixb-t'); return [W - lw, r.offsetTop + t.offsetTop + t.offsetHeight - lh + 4]; }
    return [W * 0.56, r.offsetTop + (r.offsetHeight - lh) / 2];
  };
  const clampX = v => Math.min(Math.max(v, 0), W - lw);
  const place = () => {
    lens.style.transform = `translate3d(${x}px,${y}px,0)`;
    ghost.style.transform = `translate3d(${-x}px,${-y}px,0)`;
    media.style.transform = `translate3d(${Math.max(-1, Math.min(1, vx / 40)) * -4}%,0,0)`;
  };

  const tick = () => {
    if (mode === 'pointer' && cx >= 0) {
      const r = wrap.getBoundingClientRect();
      inside = cx >= r.left && cx <= r.right && cy >= r.top && cy <= r.bottom;
      if (inside) {
        const hit = document.elementFromPoint(cx, cy)?.closest('.ixb-row');
        const i = hit && rows.includes(hit) ? rows.indexOf(hit) : -1;
        if (i !== on) { if (on < 0) snap = true; activate(i); }
        tx = clampX(cx - r.left - lw / 2);
        ty = cy - r.top - lh / 2;
      } else if (on >= 0 && !wrap.contains(document.activeElement)) activate(-1);
    } else if (on >= 0) [tx, ty] = anchor(on);
    tx = clampX(tx);
    if (snap || reduceMotion) { x = tx; y = ty; vx = 0; snap = false; }
    else { const dx = (tx - x) * 0.11; vx = vx * 0.8 + dx * 0.2; x += dx; y += (ty - y) * 0.11; }
    place();
    raf = running ? requestAnimationFrame(tick) : 0;
  };
  let raf = 0, running = false;
  const start = () => { if (!running) { running = true; raf = requestAnimationFrame(tick); } };
  const stop = () => { running = false; cancelAnimationFrame(raf); raf = 0; };

  wrap.addEventListener('pointermove', e => {
    if (e.pointerType !== 'mouse' && e.pointerType !== 'pen') return;
    mode = 'pointer'; cx = e.clientX; cy = e.clientY;
  }, { passive: true });
  addEventListener('pointermove', e => { if (mode === 'pointer') { cx = e.clientX; cy = e.clientY; } }, { passive: true });
  document.addEventListener('mouseleave', () => { cx = cy = -1; if (mode === 'pointer') activate(-1); });

  /* clavier : la lentille se pose sur la ligne qui a le focus */
  rows.forEach((r, i) => {
    r.addEventListener('focus', () => { if (mode === 'pointer' && inside) return; mode = 'anchor'; if (on < 0) snap = true; activate(i); });
    r.addEventListener('blur', () => { if (mode === 'anchor' && !fine.matches) return; setTimeout(() => { if (!wrap.contains(document.activeElement) && mode === 'anchor') activate(-1); }, 0); });
  });

  /* tactile : la ligne la plus proche du centre de l'écran devient active, la lentille glisse vers elle */
  const scrollPick = () => {
    if (fine.matches && !narrow.matches) return;
    mode = 'anchor';
    const vh = innerHeight, mid = vh * 0.5;
    let best = -1, bd = Infinity;
    rows.forEach((r, i) => {
      const b = r.getBoundingClientRect();
      if (b.bottom < vh * 0.2 || b.top > vh * 0.8) return;
      const d = Math.abs((b.top + b.bottom) / 2 - mid);
      if (d < bd) { bd = d; best = i; }
    });
    if (best !== on) { if (on < 0) snap = true; activate(best); }
  };
  if (lenis && lenis.on) lenis.on('scroll', scrollPick);
  addEventListener('scroll', scrollPick, { passive: true });

  const io = new IntersectionObserver(es => es.forEach(e => {
    if (e.isIntersecting) { wrap.classList.add('in'); measure(); start(); scrollPick(); }
    else { stop(); if (on >= 0) activate(-1); }
  }), { rootMargin: '0px 0px -8% 0px' });
  io.observe(wrap);
  const kick = section.querySelector('.kicker');
  const kio = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { kick.classList.add('fx-in'); kio.disconnect(); } }), { rootMargin: '0px 0px -10% 0px' });
  kio.observe(kick);
  if (reduceMotion) { wrap.classList.add('in'); kick.classList.add('fx-in'); }
}
