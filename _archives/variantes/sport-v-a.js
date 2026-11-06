/* Groupe Tranchant — activités sportives (accueil), variante A (comparaison via ?sp=a).
   « Plan-séquence » : une scène collante pilotée par le défilement. Un cadre de visée s'ouvre comme un obturateur,
   la typographie monumentale le traverse et s'inverse exactement là où elle croise l'image (deux calques, même découpe),
   puis le cadre portrait s'élargit en format cinémascope pour le second plan. Un fin cadran gradué indique l'avancement. */
const UP = 'https://www.groupetranchant.com/wp-content/uploads/2025/03/';

const CSS = `
#sportives.sq{padding:0;background:#F5F1EA;color:#0B1B2E;overflow:clip}
#sportives .sq-track{position:relative;height:400vh}
#sportives .sq-stage{position:sticky;top:0;height:100vh;height:100svh;overflow:hidden;
  --fs:120px;--ink:#0B1B2E;--paper:#F5F1EA}
#sportives .sq-stage .kicker{position:absolute;z-index:6;left:var(--gutter);top:calc(84px + 3vh);color:rgba(11,27,46,.62);letter-spacing:.2em;opacity:1}
#sportives .sq-stage .kicker .tri{transform:none}
#sportives .sq-titles{position:absolute;inset:0;pointer-events:none}
#sportives .sq-t{margin:0;font:inherit}
#sportives .sq-l{position:absolute;left:0;top:0;display:block;overflow:hidden;white-space:nowrap;
  font-family:var(--display);font-stretch:115%;font-weight:500;font-size:var(--fs);line-height:.86;letter-spacing:-.035em;
  padding:.06em .04em .04em;will-change:transform}
#sportives .sq-l>span{display:block;will-change:transform}
#sportives .sq-titles.base .sq-l{color:var(--ink)}
#sportives .sq-titles.ko .sq-l{color:var(--paper)}
#sportives .sq-win{position:absolute;inset:0;z-index:2;clip-path:inset(50% 50% 50% 50%);cursor:pointer;will-change:clip-path}
#sportives .sq-wide,#sportives .sq-port{position:absolute;left:0;top:0;overflow:hidden;background:#10243A}
#sportives .sq-wide{opacity:0}
#sportives .sq-port img,#sportives .sq-wide img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;will-change:transform,clip-path}
#sportives .sq-wide::after,#sportives .sq-port::after{content:"";position:absolute;inset:0;pointer-events:none}
#sportives .sq-wide::after{background:linear-gradient(180deg,rgba(11,27,46,.32),rgba(11,27,46,.14) 45%,rgba(11,27,46,.42))}
#sportives .sq-port::after{background:linear-gradient(180deg,rgba(11,27,46,.12),rgba(11,27,46,0) 40%,rgba(11,27,46,.22))}
#sportives .sq-hair{position:absolute;left:0;top:0;height:1px;background:#0B1B2E;transform-origin:50% 50%;z-index:3}
#sportives .sq-mk{position:absolute;left:0;top:0;width:14px;height:14px;z-index:3;pointer-events:none;border-color:rgba(11,27,46,.55);border-style:solid;border-width:0}
#sportives .sq-mk.tl{border-left-width:1px;border-top-width:1px}
#sportives .sq-mk.tr{border-right-width:1px;border-top-width:1px}
#sportives .sq-mk.bl{border-left-width:1px;border-bottom-width:1px}
#sportives .sq-mk.br{border-right-width:1px;border-bottom-width:1px}
#sportives .sq-foot{position:absolute;z-index:6;left:var(--gutter);right:var(--gutter);bottom:max(26px,4.6vh);display:flex;align-items:flex-end;justify-content:space-between;gap:24px}
#sportives .sq-links{display:grid}
#sportives .sq-links a{grid-area:1/1;display:inline-flex;align-items:center;gap:16px;padding:10px 0;color:#0B1B2E;text-decoration:none;
  font-family:var(--sans);font-size:12px;font-weight:600;letter-spacing:.18em;text-transform:uppercase;
  opacity:0;visibility:hidden;transform:translateY(8px);transition:opacity .7s var(--ease),transform .7s var(--ease),visibility 0s .7s}
#sportives .sq-links a.on{opacity:1;visibility:visible;transform:none;transition:opacity .9s var(--ease) .1s,transform .9s var(--ease) .1s,visibility 0s}
#sportives .sq-links a:focus-visible{opacity:1;visibility:visible;transform:none;outline:2px solid #335F94;outline-offset:6px;border-radius:2px}
#sportives .sq-links .n{font-family:var(--display);font-stretch:115%;font-weight:600;font-size:13px;letter-spacing:.04em;color:#335F94}
#sportives .sq-links .rule{display:block;width:44px;height:1px;background:currentColor;opacity:.5;transition:width .6s var(--ease),opacity .6s}
#sportives .sq-links .ar{display:inline-block;font-family:var(--sans);letter-spacing:0;transition:transform .6s var(--ease)}
#sportives .sq-links a:hover .rule{width:76px;opacity:1}
#sportives .sq-links a:hover .ar{transform:translateX(5px)}
#sportives .sq-dial{position:relative;width:min(260px,28vw);height:30px;flex:none}
#sportives .sq-dial .sc{position:absolute;left:0;right:0;bottom:0;height:7px;
  background:repeating-linear-gradient(90deg,rgba(11,27,46,.32) 0 1px,transparent 1px 100%) 0 100%/6.5px 7px repeat-x}
#sportives .sq-dial .mj{position:absolute;left:0;right:0;bottom:0;height:13px;
  background:repeating-linear-gradient(90deg,rgba(11,27,46,.6) 0 1px,transparent 1px 100%) 0 100%/calc(25% - .25px) 13px repeat-x}
#sportives .sq-dial .lb{position:absolute;top:0;font-family:var(--display);font-stretch:115%;font-size:10px;font-weight:600;letter-spacing:.08em;color:rgba(11,27,46,.45);transform:translateX(-1px);transition:color .5s}
#sportives .sq-dial .lb.on{color:#0B1B2E}
#sportives .sq-dial .nd{position:absolute;left:0;bottom:0;width:1px;height:22px;background:#BA2637;will-change:transform}
#sportives .sq-dial::after{content:"";position:absolute;right:0;bottom:0;width:1px;height:13px;background:rgba(11,27,46,.6)}
@media (max-width:760px){
  #sportives .sq-track{height:340vh}
  #sportives .sq-stage .kicker{top:calc(70px + 2vh)}
  #sportives .sq-foot{flex-direction:column;align-items:flex-start;gap:14px;bottom:max(20px,3vh)}
  #sportives .sq-links a{font-size:10.5px;letter-spacing:.09em;gap:10px}
  #sportives .sq-links .rule{width:18px}
  #sportives .sq-dial{width:100%;height:24px}
  #sportives .sq-dial .mj{height:10px}
  #sportives .sq-dial .nd{height:18px}
  #sportives .sq-mk{width:10px;height:10px}
}
#sportives.sq.rm .sq-track{height:auto}
#sportives.sq.rm .sq-stage{position:relative}
#sportives.sq.rm .sq-stage+.sq-stage{margin-top:0}
`;

const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const ease = t => (t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const seg = (p, a, d) => ease(clamp((p - a) / d));
const lerp = (a, b, t) => a + (b - a) * t;

const LINES = [['PATROUILLE', 'TRANCHANT'], ['SHOOTING', 'CLUBS']];

function titleLayer(base) {
  const L = (txt, k) => `<span class="sq-l" data-k="${k}"><span>${txt}</span></span>`;
  if (base) return `<div class="sq-titles base">
      <h3 class="sq-t">${L(LINES[0][0], 'a0')} ${L(LINES[0][1], 'a1')}</h3>
      <h3 class="sq-t">${L(LINES[1][0], 'b0')} ${L(LINES[1][1], 'b1')}</h3></div>`;
  return `<div class="sq-titles ko" aria-hidden="true">${L(LINES[0][0], 'a0')}${L(LINES[0][1], 'a1')}${L(LINES[1][0], 'b0')}${L(LINES[1][1], 'b1')}</div>`;
}

export function mountSport(section, { reduceMotion, lenis }) {
  section.className = 'section sq' + (reduceMotion ? ' rm' : '');
  const style = document.createElement('style');
  style.textContent = CSS;
  section.innerHTML = `
  <div class="sq-track">
    <div class="sq-stage">
      <p class="kicker fx-in">Activités sportives<i class="tri"></i></p>
      ${titleLayer(true)}
      <div class="sq-hair" aria-hidden="true"></div>
      <div class="sq-win" aria-hidden="true">
        <div class="sq-wide"><img src="${UP}plateau-balltrap.jpg" alt="" loading="lazy" decoding="async"></div>
        <div class="sq-port">
          <img src="${UP}494x626-avion-02.jpg" alt="" decoding="async">
          <img src="${UP}494x626-avion-01.jpg" alt="" loading="lazy" decoding="async">
          <img src="${UP}494x626-avion-04.jpg" alt="" loading="lazy" decoding="async">
        </div>
        ${titleLayer(false)}
      </div>
      <i class="sq-mk tl"></i><i class="sq-mk tr"></i><i class="sq-mk bl"></i><i class="sq-mk br"></i>
      <div class="sq-foot">
        <div class="sq-links">
          <a href="/activites-sportives/#patrouille" data-ph="0"><span class="n" aria-hidden="true">01</span><i class="rule"></i><span>Notre patrouille de voltige aérienne</span><span class="ar" aria-hidden="true">→</span></a>
          <a href="/activites-sportives/#shooting" data-ph="1"><span class="n" aria-hidden="true">02</span><i class="rule"></i><span>Nos complexes de loisirs sportifs</span><span class="ar" aria-hidden="true">→</span></a>
        </div>
        <div class="sq-dial" aria-hidden="true"><span class="lb" style="left:0">01</span><span class="lb" style="left:50%">02</span><i class="sc"></i><i class="mj"></i><i class="nd"></i></div>
      </div>
    </div>
  </div>`;
  section.prepend(style);

  const track = section.querySelector('.sq-track');
  const stage = section.querySelector('.sq-stage');
  const win = section.querySelector('.sq-win');
  const wide = section.querySelector('.sq-wide');
  const wideImg = wide.querySelector('img');
  const port = section.querySelector('.sq-port');
  const pImgs = [...port.querySelectorAll('img')];
  const hair = section.querySelector('.sq-hair');
  const marks = [...section.querySelectorAll('.sq-mk')];
  const links = [...section.querySelectorAll('.sq-links a')];
  const labels = [...section.querySelectorAll('.sq-dial .lb')];
  const dial = section.querySelector('.sq-dial');
  const needle = section.querySelector('.sq-dial .nd');
  const lines = {};
  section.querySelectorAll('.sq-l').forEach(el => (lines[el.dataset.k] ||= []).push(el));

  let G = null;
  function layout() {
    const vw = stage.clientWidth, vh = stage.clientHeight;
    const mob = vw < 760;
    const g = Math.min(72, Math.max(18, vw * .045));
    // cadre portrait : les photos d'avion ne dépassent jamais ~440 px de large
    let W = Math.min(440, vw * (mob ? .64 : .32), (vh * (mob ? .4 : .6)) * 494 / 626);
    W = Math.round(W); let H = Math.round(W * 626 / 494);
    const cy = Math.round(mob ? vh * .47 : vh * .5 + 14);
    const ww = vw - 2 * g;
    const wh = mob ? Math.min(vh * .52, ww * 1.25) : Math.min(ww / 2.39, vh * .62);
    // corps : « PATROUILLE » occupe ~ les trois quarts de la largeur utile
    const probe = lines.a0[0];
    stage.style.setProperty('--fs', '100px');
    const w100 = probe.firstElementChild.getBoundingClientRect().width;
    const fs = Math.min(210, 100 * (vw - 2 * g) * (mob ? .97 : .76) / w100);
    stage.style.setProperty('--fs', fs.toFixed(2) + 'px');
    const wOf = k => lines[k][0].getBoundingClientRect().width;
    const lh = lines.a0[0].getBoundingClientRect().height;
    G = { vw, vh, mob, g, W, H, cy, ww, wh, fs, lh, w: { a0: wOf('a0'), a1: wOf('a1'), b0: wOf('b0'), b1: wOf('b1') } };
    dial.style.setProperty('--dw', dial.clientWidth + 'px');
    draw(true);
  }

  function frameRect(m, open) {
    const { vw, W, H, cy, ww, wh } = G;
    const w = lerp(W, ww, m), h = lerp(H, wh, m) * open;
    const x = Math.round((vw - w) / 2) + .5, y = cy - h / 2 + .5;
    return { x, y, w: w - 1, h: Math.max(0, h - 1), fh: lerp(H, wh, m) };
  }

  let last = -9;
  function progress() {
    const r = track.getBoundingClientRect();
    return (-r.top) / Math.max(1, r.height - stage.clientHeight);
  }

  function setLine(k, x, y, inP, exP = 0) {
    // entrée par le bas du masque, sortie par le haut
    const t = `translate3d(${x.toFixed(1)}px,${y.toFixed(1)}px,0)`;
    const it = `translate3d(0,${(exP > 0 ? -108 * exP : 108 * (1 - inP)).toFixed(2)}%,0)`;
    for (const el of lines[k]) { el.style.transform = t; el.firstElementChild.style.transform = it; }
  }

  function draw(force) {
    if (!G) return;
    let p = progress();
    if (reduceMotion) p = p < .5 ? .3 : .84; // coupe franche, sans mouvement
    if (!force && Math.abs(p - last) < 1e-4) return;
    last = p;
    const { vw, g, cy, H, wh, lh, w, mob } = G;

    const open = seg(p, -.1, .2);
    const m = seg(p, .52, .14);
    const fr = frameRect(m, open);
    const r = `${fr.y.toFixed(1)}px ${(vw - fr.x - fr.w).toFixed(1)}px ${(stage.clientHeight - fr.y - fr.h).toFixed(1)}px ${fr.x.toFixed(1)}px`;
    win.style.clipPath = `inset(${r})`;
    // trait d'obturateur, visible tant que le cadre est fermé
    hair.style.transform = `translate3d(${fr.x}px,${cy}px,0)`;
    hair.style.width = fr.w + 'px';
    hair.style.opacity = (1 - clamp(open * 4)).toFixed(3);
    // repères d'angle : la cible du cadre
    const fy = cy - fr.fh / 2, o = mob ? 8 : 12, s = mob ? 10 : 14;
    const pts = [[fr.x - o, fy - o], [fr.x + fr.w + o - s, fy - o], [fr.x - o, fy + fr.fh + o - s], [fr.x + fr.w + o - s, fy + fr.fh + o - s]];
    marks.forEach((mk, i) => { mk.style.transform = `translate3d(${pts[i][0]}px,${pts[i][1]}px,0)`; mk.style.opacity = (.35 + .65 * clamp(p * 6 + .6)).toFixed(3); });

    // plan 1 : les trois photos de la patrouille, au centre, en portrait
    const pw = G.W, ph = G.H;
    port.style.width = pw + 'px'; port.style.height = ph + 'px';
    const out = seg(p, .455, .08);
    port.style.transform = `translate3d(${Math.round((vw - pw) / 2)}px,${cy - ph / 2}px,0)`;
    port.style.clipPath = `inset(0 0 ${(out * 100).toFixed(2)}% 0)`;
    const w1 = seg(p, .17, .09), w2 = seg(p, .31, .09);
    pImgs[0].style.transform = `scale(${lerp(1.16, 1.02, clamp((p + .1) / .4)).toFixed(4)})`;
    pImgs[1].style.clipPath = `inset(${((1 - w1) * 100).toFixed(2)}% 0 0 0)`;
    pImgs[1].style.transform = `scale(${lerp(1.14, 1.02, clamp((p - .17) / .3)).toFixed(4)})`;
    pImgs[2].style.clipPath = `inset(${((1 - w2) * 100).toFixed(2)}% 0 0 0)`;
    pImgs[2].style.transform = `scale(${lerp(1.14, 1.02, clamp((p - .31) / .3)).toFixed(4)})`;

    // plan 2 : le stand de tir, en cinémascope
    wide.style.width = G.ww + 'px'; wide.style.height = wh + 'px';
    wide.style.transform = `translate3d(${(vw - G.ww) / 2}px,${cy - wh / 2}px,0)`;
    wide.style.opacity = p > .46 ? 1 : 0;
    const kb = clamp((p - .46) / .54);
    wideImg.style.transform = `scale(${lerp(1.2, 1.04, kb).toFixed(4)}) translate3d(${lerp(2.5, -1.5, kb).toFixed(3)}%,0,0)`;

    // typographie : deux lignes qui traversent le cadre, à contre-sens
    const yA = cy - H * (mob ? .34 : .3) - lh / 2, yB = cy + H * (mob ? .34 : .3) - lh / 2;
    const dA = lerp(0, vw * (mob ? .0 : .045), clamp((p + .15) / .62));
    const inA0 = seg(p, -.24, .16), inA1 = seg(p, -.2, .16);
    const exA0 = seg(p, .42, .07), exA1 = seg(p, .44, .07);
    setLine('a0', g + dA, yA, inA0, exA0);
    setLine('a1', vw - g - w.a1 - dA, yB, inA1, exA1);
    const dB = lerp(0, vw * (mob ? 0 : .035), clamp((p - .6) / .4));
    const inB0 = seg(p, .6, .09), inB1 = seg(p, .63, .09);
    setLine('b0', g + (mob ? vw * .035 : vw * .02) + dB, yA, inB0);
    setLine('b1', vw - g - w.b1 - (mob ? vw * .035 : vw * .02) - dB, yB, inB1);

    // légendes et cadran
    const ph1 = p < .5 ? 0 : 1;
    links.forEach((a, i) => {
      const on = i === 0 ? (p > .02 && p < .42) : p > .64;
      a.classList.toggle('on', on || (reduceMotion && i === ph1));
    });
    labels.forEach((l, i) => l.classList.toggle('on', i === ph1));
    needle.style.transform = `translate3d(${(clamp(p) * (dial.clientWidth - 1)).toFixed(1)}px,0,0)`;
  }

  // un lien hors champ qui reçoit le focus : on amène la scène au bon plan
  links.forEach(a => a.addEventListener('focus', () => {
    if (a.classList.contains('on')) return;
    const target = a.dataset.ph === '0' ? .25 : .82;
    const top = track.getBoundingClientRect().top + window.scrollY;
    const y = top + target * (track.offsetHeight - stage.clientHeight);
    if (lenis) lenis.scrollTo(y, { immediate: true }); else window.scrollTo(0, y);
    draw(true);
  }));
  win.addEventListener('click', () => { const a = links.find(l => l.classList.contains('on')) || links[progress() < .5 ? 0 : 1]; a.click(); });

  if (reduceMotion) track.style.height = '220vh';
  const tick = () => draw(false);
  if (lenis) lenis.on('scroll', tick);
  window.addEventListener('scroll', tick, { passive: true });
  let rz; window.addEventListener('resize', () => { cancelAnimationFrame(rz); rz = requestAnimationFrame(layout); });
  layout();
  (document.fonts?.ready || Promise.resolve()).then(layout);
  setTimeout(layout, 1200);
}
