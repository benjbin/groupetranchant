/* Groupe Tranchant — activités sportives (accueil), variante D (comparaison via ?sp=d).
   « La cocarde et la cible » : un seul disque au centre, deux lectures d'une même figure.
   Pour la patrouille, la photo de ciel devient le cœur bleu d'une cocarde (anneau blanc, anneau rouge) cerclée d'un cadran d'instrument ;
   pour les clubs de tir, le même disque se fait œilleton : anneaux de cible et croisée fine sur les plateaux d'argile.
   Les deux titres encadrent le disque sur un même axe horizontal ; le défilement (ou le survol) fait passer de l'une à l'autre par un diaphragme. */

const U = 'https://www.groupetranchant.com/wp-content/uploads/2025/03/';
const NS = 'http://www.w3.org/2000/svg';

const CSS = `
#sportives.spd{--fg:#0B1B2E;--fg-rgb:11,27,46;--muted:rgba(11,27,46,.6);--line:rgba(11,27,46,.14);--ink:#0B1B2E;--red:#E1000F;
  position:relative;overflow:hidden;background:var(--paper);color:var(--ink);padding:15vh var(--gutter) 17vh}
#sportives .spd-head{display:flex;justify-content:center;margin-bottom:clamp(48px,8vh,96px)}
#sportives .spd-head .kicker{align-items:center;color:var(--muted)}
#sportives .spd-stage{position:relative;display:grid;grid-template-columns:minmax(0,1fr) min(34vw,500px) minmax(0,1fr);grid-template-areas:"a disc b";align-items:stretch;max-width:1360px;margin:0 auto}

/* ondes très fines qui prolongent le disque dans la page */
#sportives .spd-waves{position:absolute;left:50%;top:50%;width:0;height:0;pointer-events:none}
#sportives .spd-waves i{-webkit-mask-image:linear-gradient(transparent 4%,#000 30%,#000 70%,transparent 96%);mask-image:linear-gradient(transparent 4%,#000 30%,#000 70%,transparent 96%);position:absolute;left:50%;top:50%;border:1px solid rgba(11,27,46,.07);border-radius:50%;transform:translate(-50%,-50%) scale(.6);opacity:0;transition:transform 2.2s var(--ease),opacity 2.2s var(--ease)}
#sportives .spd-waves i:nth-child(1){width:min(52vw,720px);height:min(52vw,720px)}
#sportives .spd-waves i:nth-child(2){width:min(80vw,1100px);height:min(80vw,1100px);transition-delay:.12s;border-style:dashed;border-color:rgba(11,27,46,.06)}
#sportives .spd-waves i:nth-child(3){width:min(118vw,1640px);height:min(118vw,1640px);transition-delay:.24s}
#sportives.in .spd-waves i{transform:translate(-50%,-50%);opacity:1}

/* disque */
#sportives .spd-disc{grid-area:disc;position:relative;aspect-ratio:1;align-self:center}
#sportives .spd-ph{position:absolute;inset:calc(100% * 68 / 600);border-radius:50%;overflow:hidden;background:#335F94;clip-path:circle(0% at 50% 50%);transition:clip-path 1.25s var(--ease)}
#sportives .spd-ph.on{clip-path:circle(50% at 50% 50%)}
#sportives .spd-ph.top{z-index:1}
#sportives .spd-ph img{position:absolute;inset:0;width:100%;height:100%;max-width:none;object-fit:cover;transform:scale(1.12);transition:transform 1.8s var(--ease)}
#sportives .spd-ph.on img{transform:scale(1.02)}
#sportives .spd-ph.b{background:#C46A2A}
#sportives .spd-ph.b img{object-position:58% 50%}
#sportives .spd-svg{position:absolute;inset:0;width:100%;height:100%;overflow:visible;z-index:2;pointer-events:none}
#sportives .spd-svg circle,#sportives .spd-svg line,#sportives .spd-svg path{fill:none;vector-effect:non-scaling-stroke}
#sportives .r-draw{stroke-dasharray:1;stroke-dashoffset:1;transition:stroke-dashoffset 1.8s var(--ease),stroke .9s var(--ease),stroke-width .9s var(--ease)}
#sportives.in .r-draw{stroke-dashoffset:0}
#sportives .r-white{stroke:#fff;stroke-width:var(--w1,9px)}
#sportives .r-band{stroke:var(--red);stroke-width:var(--w2,3.5px);transition-delay:.15s}
#sportives .spd-disc.is-b .r-band{stroke:var(--ink)}
#sportives .r-hair{stroke:rgba(11,27,46,.55);stroke-width:1px;transition-delay:.3s}
#sportives .r-hair.in2{stroke:rgba(11,27,46,.18)}
#sportives .bezel{transform-origin:300px 300px;transform:rotate(var(--rot,0deg))}
#sportives .bezel line{stroke:rgba(11,27,46,.42);stroke-width:1px;opacity:0;transition:opacity 1.2s var(--ease) .5s}
#sportives .bezel line.maj{stroke:var(--ink)}
#sportives.in .bezel line{opacity:1}
#sportives .lubber{fill:var(--ink);stroke:var(--ink);stroke-width:1px;transition:opacity .7s var(--ease),transform .9s var(--ease);transform-origin:300px 300px}
#sportives .spd-disc.is-b .lubber{opacity:0;transform:translateY(-10px)}
#sportives .sight{opacity:0;transition:opacity .9s var(--ease)}
#sportives .spd-disc.is-b .sight{opacity:1}
#sportives .sight .cross{stroke:var(--ink);stroke-width:1.5px}
#sportives .tgt circle,#sportives .tgt line{stroke:rgba(255,255,255,.78);stroke-width:1px;stroke-dasharray:1;stroke-dashoffset:1;transition:stroke-dashoffset 1.4s var(--ease)}
#sportives .tgt .dot{fill:#fff;stroke:none;opacity:0;transition:opacity .6s .6s}#sportives .spd-disc.is-b .tgt .dot{opacity:1}
#sportives .spd-disc.is-b .tgt circle,#sportives .spd-disc.is-b .tgt line{stroke-dashoffset:0}
#sportives .tgt circle:nth-child(2){transition-delay:.1s}#sportives .tgt circle:nth-child(3){transition-delay:.2s}
#sportives .tgt line{transition-delay:.35s}

/* entrées : titre au-dessus de l'axe, lien au-dessous */
#sportives .spd-item{position:relative;display:grid;grid-template-rows:1fr 1fr;color:var(--ink);outline:none;padding:0 clamp(24px,3vw,60px)}
#sportives .spd-item.a{grid-area:a;text-align:right;padding-left:0}
#sportives .spd-item.b{grid-area:b;text-align:left;padding-right:0}
#sportives .spd-item::before{content:"";position:absolute;top:50%;height:1px;background:rgba(11,27,46,.16);transition:background .8s var(--ease)}
#sportives .spd-item.a::before{left:calc(-1 * var(--gutter));right:0}
#sportives .spd-item.b::before{left:0;right:calc(-1 * var(--gutter))}
#sportives .spd-item::after{content:"";position:absolute;top:50%;height:1px;background:var(--ink);transform:scaleX(0);transition:transform 1.1s var(--ease)}
#sportives .spd-item.a::after{left:calc(-1 * var(--gutter));right:0;transform-origin:right}
#sportives .spd-item.b::after{left:0;right:calc(-1 * var(--gutter));transform-origin:left}
#sportives .spd-item.on::after{transform:none}
#sportives .spd-top{align-self:end;padding-bottom:clamp(20px,2.6vh,30px)}
#sportives .spd-bot{align-self:start;padding-top:clamp(20px,2.6vh,30px)}
#sportives .spd-n{display:inline-flex;align-items:center;gap:10px;margin-bottom:18px;font-family:var(--display);font-stretch:115%;font-size:12px;font-weight:700;letter-spacing:.18em;color:var(--blue)}
#sportives .spd-n::before{content:"";width:7px;height:7px;border-radius:50%;border:1px solid currentColor;transition:background .6s}
#sportives .spd-item.on .spd-n::before{background:currentColor}
#sportives .spd-item.a .spd-n{flex-direction:row-reverse}
#sportives .spd-t{display:block;font-family:var(--display);font-stretch:115%;font-weight:600;font-size:clamp(30px,3.15vw,50px);line-height:.98;letter-spacing:-.03em;
  color:transparent;-webkit-text-stroke:1px rgba(11,27,46,.42);background:linear-gradient(90deg,var(--ink) 50%,transparent 50%) 100% 0/200% 100% no-repeat;-webkit-background-clip:text;background-clip:text;transition:background-position 1s var(--ease),-webkit-text-stroke-color 1s}
#sportives .spd-item.a .spd-t{background-image:linear-gradient(270deg,var(--ink) 50%,transparent 50%);background-position:0 0}
#sportives .spd-item.on .spd-t{background-position:0 0;-webkit-text-stroke-color:var(--ink)}
#sportives .spd-item.a.on .spd-t{background-position:100% 0}
#sportives .spd-t span{display:block}
#sportives .spd-cta{display:inline-flex;align-items:center;gap:12px;font-size:13.5px;white-space:nowrap;font-weight:600;line-height:1.35;color:var(--ink)}
#sportives .spd-item.a .spd-cta{flex-direction:row-reverse}
#sportives .spd-cta u{text-decoration:none;background:linear-gradient(currentColor,currentColor) 0 100%/0 1px no-repeat;padding-bottom:3px;transition:background-size .7s var(--ease)}
#sportives .spd-item.a .spd-cta u{background-position:100% 100%}
#sportives .spd-cta b{flex:none;display:grid;place-items:center;width:42px;height:42px;border-radius:50%;border:1px solid rgba(11,27,46,.22);font-weight:400;font-size:16px;transition:background .5s var(--ease),color .5s,border-color .5s,transform .6s var(--ease)}
#sportives .spd-item:hover .spd-cta u,#sportives .spd-item:focus-visible .spd-cta u{background-size:100% 1px}
#sportives .spd-item:hover .spd-cta b,#sportives .spd-item:focus-visible .spd-cta b{background:var(--ink);border-color:var(--ink);color:var(--paper)}
#sportives .spd-item.b:hover .spd-cta b{transform:translateX(4px)}
#sportives .spd-item.a:hover .spd-cta b{transform:translateX(-4px)}
#sportives .spd-item:focus-visible .spd-t{outline:2px solid var(--blue);outline-offset:8px;border-radius:2px}
#sportives .spd-item > *{opacity:0;transform:translateY(18px);transition:opacity 1.2s var(--ease),transform 1.2s var(--ease)}
#sportives .spd-item .spd-bot{transition-delay:.2s}
#sportives.in .spd-item > *{opacity:1;transform:none}

@media (max-width:1199px){
  #sportives.spd{padding:13vh var(--gutter) 14vh}
  #sportives .spd-head{justify-content:flex-start;margin-bottom:44px}
  #sportives .spd-head .kicker{align-items:flex-start}
  #sportives .spd-stage{grid-template-columns:minmax(0,1fr);grid-template-areas:"a" "disc" "b";row-gap:0}
  #sportives .spd-disc{width:min(100%,440px);justify-self:center;margin:40px 0 46px}
  #sportives .spd-item,#sportives .spd-item.a,#sportives .spd-item.b{grid-template-rows:auto auto;text-align:left;padding:0}
  #sportives .spd-item::before,#sportives .spd-item::after{top:auto;bottom:-1px}
  #sportives .spd-item.a::before,#sportives .spd-item.a::after,#sportives .spd-item.b::before,#sportives .spd-item.b::after{left:0;right:0;transform-origin:left}
  #sportives .spd-item.a{padding-bottom:28px}
  #sportives .spd-item.b{padding-top:28px;border-top:1px solid rgba(11,27,46,.16)}
  #sportives .spd-item.b::before,#sportives .spd-item.b::after{display:none}
  #sportives .spd-item.a .spd-n,#sportives .spd-item.a .spd-cta{flex-direction:row}
  #sportives .spd-item.a .spd-t{background-image:linear-gradient(90deg,var(--ink) 50%,transparent 50%);background-position:100% 0}
  #sportives .spd-item.a.on .spd-t{background-position:0 0}
  #sportives .spd-item.a .spd-cta u{background-position:0 100%}
  #sportives .spd-top{padding-bottom:20px}
  #sportives .spd-bot{padding-top:0}
  #sportives .spd-t{font-size:clamp(32px,9.4vw,56px)}
  #sportives .spd-cta{white-space:normal}
  #sportives .spd-waves i:nth-child(1){width:130vw;height:130vw}
  #sportives .spd-waves i:nth-child(2){width:190vw;height:190vw}
  #sportives .spd-waves i:nth-child(3){display:none}
}
@media (prefers-reduced-motion:reduce){
  #sportives *,#sportives *::before,#sportives *::after{transition-duration:.01ms!important;transition-delay:0s!important}
}
`;

const svgEl = (tag, attrs, parent) => {
  const el = document.createElementNS(NS, tag);
  for (const k in attrs) el.setAttribute(k, attrs[k]);
  if (parent) parent.appendChild(el);
  return el;
};

function buildDiscSvg() {
  const svg = svgEl('svg', { class: 'spd-svg', viewBox: '0 0 600 600', 'aria-hidden': 'true', focusable: 'false' });
  // cible : anneaux et croisée sur la photo (mode b)
  const tgt = svgEl('g', { class: 'tgt' }, svg);
  [58, 116, 174].forEach(r => svgEl('circle', { cx: 300, cy: 300, r, pathLength: 1 }, tgt));
  [[300, 82, 300, 272], [300, 328, 300, 518], [82, 300, 272, 300], [328, 300, 518, 300]].forEach(([x1, y1, x2, y2]) => svgEl('line', { x1, y1, x2, y2, pathLength: 1 }, tgt));
  svgEl('circle', { class: 'dot', cx: 300, cy: 300, r: 2.2 }, tgt);
  // bandes de la cocarde : blanc puis rouge (le rouge devient bleu nuit pour la cible)
  svgEl('circle', { class: 'r-draw r-hair in2', cx: 300, cy: 300, r: 232, pathLength: 1, transform: 'rotate(-90 300 300)' }, svg);
  svgEl('circle', { class: 'r-draw r-white', cx: 300, cy: 300, r: 237, pathLength: 1, transform: 'rotate(-90 300 300)' }, svg);
  svgEl('circle', { class: 'r-draw r-band', cx: 300, cy: 300, r: 245, pathLength: 1, transform: 'rotate(-90 300 300)' }, svg);
  svgEl('circle', { class: 'r-draw r-hair', cx: 300, cy: 300, r: 253, pathLength: 1, transform: 'rotate(-90 300 300)' }, svg);
  // cadran : 120 graduations fines, une majeure toutes les dix
  const bezel = svgEl('g', { class: 'bezel' }, svg);
  for (let i = 0; i < 120; i++) {
    const a = i / 120 * Math.PI * 2, maj = i % 10 === 0, mid = i % 5 === 0;
    const r1 = 266, r2 = maj ? 286 : mid ? 279 : 274;
    const s = Math.sin(a), c = -Math.cos(a);
    svgEl('line', { class: maj ? 'maj' : '', x1: (300 + s * r1).toFixed(2), y1: (300 + c * r1).toFixed(2), x2: (300 + s * r2).toFixed(2), y2: (300 + c * r2).toFixed(2) }, bezel);
  }
  // index fixe (instrument de bord)
  svgEl('path', { class: 'lubber', d: 'M300 13 L294 1 L306 1 Z' }, svg);
  // repères de visée (mode b) : quatre traits hors du cadran
  const sight = svgEl('g', { class: 'sight' }, svg);
  [[300, -6, 300, 22], [300, 578, 300, 606], [-6, 300, 22, 300], [578, 300, 606, 300]].forEach(([x1, y1, x2, y2]) => svgEl('line', { class: 'cross', x1, y1, x2, y2 }, sight));
  return svg;
}

export function mountSport(section, { reduceMotion, lenis }) {
  section.className = 'section spd';
  section.innerHTML = `
    <style>${CSS}</style>
    <div class="spd-head"><p class="kicker">Activités sportives<i class="tri"></i></p></div>
    <div class="spd-stage">
      <div class="spd-waves" aria-hidden="true"><i></i><i></i><i></i></div>
      <a class="spd-item a" href="/activites-sportives/#patrouille" data-i="0">
        <div class="spd-top"><span class="spd-n" aria-hidden="true">01</span><h3 class="spd-t"><span>PATROUILLE</span> <span>TRANCHANT</span></h3></div>
        <div class="spd-bot"><span class="spd-cta"><u>Notre patrouille de voltige aérienne</u><b aria-hidden="true">→</b></span></div>
      </a>
      <div class="spd-disc" aria-hidden="true">
        <div class="spd-ph a on top"><img src="${U}494x626-avion-02.jpg" alt="" decoding="async"></div>
        <div class="spd-ph b"><img src="${U}plateau-balltrap.jpg" alt="" decoding="async"></div>
      </div>
      <a class="spd-item b" href="/activites-sportives/#shooting" data-i="1">
        <div class="spd-top"><span class="spd-n" aria-hidden="true">02</span><h3 class="spd-t"><span>SHOOTING</span> <span>CLUBS</span></h3></div>
        <div class="spd-bot"><span class="spd-cta"><u>Nos complexes de loisirs sportifs</u><b aria-hidden="true">→</b></span></div>
      </a>
    </div>`;

  const disc = section.querySelector('.spd-disc');
  disc.appendChild(buildDiscSvg());
  const phs = [...disc.querySelectorAll('.spd-ph')];
  const items = [...section.querySelectorAll('.spd-item')];
  const kicker = section.querySelector('.kicker');
  const bezel = disc.querySelector('.bezel');

  let active = -1, hover = null, scrollIdx = 0, timer;
  const set = i => {
    if (i === active) return;
    const prev = active; active = i;
    items.forEach((it, k) => it.classList.toggle('on', k === i));
    disc.classList.toggle('is-b', i === 1);
    clearTimeout(timer);
    phs.forEach((p, k) => p.classList.toggle('top', k === i));
    phs[i].classList.add('on');
    if (prev >= 0) {
      if (reduceMotion) phs[prev].classList.remove('on');
      else timer = setTimeout(() => phs[prev].classList.remove('on'), 1300);
    }
  };
  const apply = () => set(hover ?? scrollIdx);

  // le défilement choisit l'entrée : sur ordinateur à mi-parcours de la section, sur mobile quand la seconde entrée monte dans l'écran
  const mq = matchMedia('(max-width:1199px)');
  const update = () => {
    const vh = innerHeight, r = section.getBoundingClientRect();
    if (r.bottom < -200 || r.top > vh + 200) return;
    if (mq.matches) {
      const rb = items[1].getBoundingClientRect();
      scrollIdx = rb.top < vh * .78 ? 1 : 0;
    } else {
      const p = (vh * .5 - r.top) / r.height;
      scrollIdx = p > .54 ? 1 : 0;
    }
    if (!reduceMotion) {
      const p = Math.max(-.5, Math.min(1.5, (vh - r.top) / (vh + r.height)));
      bezel.style.setProperty('--rot', (p * 48 - 24).toFixed(2) + 'deg');
    }
    apply();
  };
  if (lenis?.on) lenis.on('scroll', update); else addEventListener('scroll', update, { passive: true });
  addEventListener('resize', update);

  items.forEach((it, k) => {
    it.addEventListener('pointerenter', e => { if (e.pointerType === 'mouse') { hover = k; apply(); } });
    it.addEventListener('pointerleave', () => { hover = null; apply(); });
    it.addEventListener('focus', () => { hover = k; apply(); });
    it.addEventListener('blur', () => { hover = null; apply(); });
  });

  set(0);
  const io = new IntersectionObserver(es => es.forEach(e => {
    if (!e.isIntersecting) return;
    if (e.target === kicker) kicker.classList.add('fx-in');
    else section.classList.add('in');
    io.unobserve(e.target);
  }), { rootMargin: '0px 0px -15% 0px' });
  io.observe(kicker); io.observe(section.querySelector('.spd-stage'));
  if (reduceMotion) { kicker.classList.add('fx-in'); section.classList.add('in'); }
  update();
}
