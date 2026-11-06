/* Groupe Tranchant — activités sportives (accueil), variante C (comparaison via ?sp=c).
   « Ciel et terre » : une section bleu nuit coupée par une ligne d'horizon graduée.
   L'air au-dessus (Patrouille), le sol en dessous (Shooting) ; les titres naissent de l'horizon,
   les photos, en monochrome bleu, retrouvent leurs couleurs en passant au centre de l'écran.
   Un ruban d'altimètre, dans la marge, défile comme un vrai instrument : l'index reste au milieu de l'écran. */

const UP = 'https://www.groupetranchant.com/wp-content/uploads/2025/03/';

const CSS = `
#sportives.spc{--fg:#F5F1EA;--fg-rgb:245,241,234;--muted:rgba(245,241,234,.56);--line:rgba(245,241,234,.14);--bg:#0B1B2E;
  position:relative;overflow:hidden;color:var(--fg);padding:16vh var(--gutter) 20vh;
  background:
    radial-gradient(60% 34% at 50% var(--hz,50%),rgba(51,95,148,.26),rgba(51,95,148,0) 70%),
    linear-gradient(180deg,#0B1B2E 0%,#0E2238 calc(var(--hz,50%) - .5px),#09172A calc(var(--hz,50%) + .5px),#07121F 100%)}
#sportives.spc *{box-sizing:border-box}
#sportives .spc-head{position:relative;z-index:2;margin-bottom:clamp(40px,7vh,80px)}
#sportives .spc-head .kicker{color:rgba(245,241,234,.62)}

/* ruban d'altimètre (marge gauche) */
#sportives .spc-alt{position:absolute;top:0;bottom:0;left:calc(var(--gutter) * .5 - 7px);width:14px;pointer-events:none;
  background:
    linear-gradient(90deg,rgba(157,180,208,.38) 0 1px,transparent 1px) 0 0/100% 100% no-repeat,
    repeating-linear-gradient(180deg,rgba(157,180,208,.42) 0 1px,transparent 1px 64px) 0 0/14px 100% no-repeat,
    repeating-linear-gradient(180deg,rgba(157,180,208,.22) 0 1px,transparent 1px 16px) 0 0/7px 100% no-repeat;
  -webkit-mask:linear-gradient(180deg,transparent,#000 14%,#000 86%,transparent);mask:linear-gradient(180deg,transparent,#000 14%,#000 86%,transparent)}
#sportives .spc-idx{position:absolute;left:0;top:0;width:22px;height:0;transform:translateY(var(--ai,50vh));opacity:var(--ao,0);transition:opacity .6s}
#sportives .spc-idx::before{content:"";position:absolute;left:0;top:-.5px;width:22px;height:1px;background:#F9C83B}
#sportives .spc-idx::after{content:"";position:absolute;left:22px;top:-4px;border:4px solid transparent;border-left:6px solid #F9C83B}

/* zones */
#sportives .spc-zone{position:relative;display:grid;grid-template-columns:repeat(12,minmax(0,1fr));column-gap:clamp(16px,2vw,32px)}
#sportives .spc-air{align-items:end;padding-bottom:clamp(40px,6vh,64px)}
#sportives .spc-ground{align-items:start;padding-top:clamp(40px,6vh,64px)}
#sportives .spc-air .spc-txt{grid-column:1 / 8;grid-row:1}
#sportives .spc-air .spc-ph{grid-column:9 / 13;grid-row:1;max-width:400px;justify-self:end;width:100%;aspect-ratio:494/626;margin-bottom:clamp(30px,5vh,56px)}
#sportives .spc-ground .spc-txt{grid-column:7 / 13;grid-row:1;padding-left:clamp(0px,2vw,40px)}
#sportives .spc-ground .spc-ph{grid-column:1 / 7;grid-row:1;aspect-ratio:3/2;margin-top:clamp(30px,5vh,56px);max-width:640px;width:100%}

/* photos : monochrome bleu, la couleur revient au centre de l'écran ou au survol */
#sportives .spc-ph{position:relative;margin:0;overflow:hidden;background:#132A45;--mono:1;transform:translate3d(0,var(--py,0px),0)}
#sportives .spc-ph img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;transform:scale(1.06);filter:brightness(calc(1 - var(--mono) * .22)) contrast(calc(1 + var(--mono) * .08));transition:transform 2.4s cubic-bezier(.2,.7,.2,1)}
#sportives .spc-tone{position:absolute;inset:0;background:#335F94;mix-blend-mode:color;opacity:var(--mono);transition:opacity .9s ease}
#sportives .spc-tone + .spc-tone{background:#0B1B2E;mix-blend-mode:multiply;opacity:calc(var(--mono) * .35)}
#sportives .spc-zone:hover .spc-ph,#sportives .spc-zone:focus-within .spc-ph{--mono:0}
#sportives .spc-zone:hover .spc-ph img{transform:scale(1.02)}
#sportives .spc-ground .spc-ph img{object-position:50% 45%}
/* repères d'angle, très fins */
#sportives .spc-crop{position:absolute;inset:12px;pointer-events:none;opacity:.8;
  background:
    linear-gradient(#F5F1EA,#F5F1EA) 0 0/12px 1px,linear-gradient(#F5F1EA,#F5F1EA) 0 0/1px 12px,
    linear-gradient(#F5F1EA,#F5F1EA) 100% 0/12px 1px,linear-gradient(#F5F1EA,#F5F1EA) 100% 0/1px 12px,
    linear-gradient(#F5F1EA,#F5F1EA) 0 100%/12px 1px,linear-gradient(#F5F1EA,#F5F1EA) 0 100%/1px 12px,
    linear-gradient(#F5F1EA,#F5F1EA) 100% 100%/12px 1px,linear-gradient(#F5F1EA,#F5F1EA) 100% 100%/1px 12px;
  background-repeat:no-repeat}
/* rideau d'apparition depuis l'horizon */
#sportives .spc-ph{clip-path:inset(0 0 0 0);transition:clip-path 1.6s cubic-bezier(.76,0,.24,1)}
#sportives .spc-air:not(.is-in) .spc-ph{clip-path:inset(100% 0 0 0)}
#sportives .spc-ground:not(.is-in) .spc-ph{clip-path:inset(0 0 100% 0)}

/* textes */
#sportives .spc-n{display:flex;align-items:center;gap:14px;font-family:var(--display);font-stretch:115%;font-weight:600;font-size:12px;letter-spacing:.18em;color:#F9C83B}
#sportives .spc-n::after{content:"";width:40px;height:1px;background:rgba(249,200,59,.5)}
#sportives .spc-air .spc-n{margin-bottom:clamp(18px,2.4vh,26px)}
#sportives .spc-ground .spc-n{margin-top:clamp(26px,3.4vh,36px);margin-bottom:clamp(14px,2vh,20px)}
#sportives .spc-t{font-family:var(--display);font-stretch:115%;font-weight:500;letter-spacing:-.035em;line-height:.92;font-size:clamp(38px,5.4vw,84px);margin:0;color:#F5F1EA}
#sportives .spc-t .l{display:block;overflow:hidden;padding:.04em 0 .06em}
#sportives .spc-t .l > span{display:block;transform:none;transition:transform 1.5s cubic-bezier(.76,0,.24,1)}
#sportives .spc-t .l:first-child > span{color:#F5F1EA}
#sportives .spc-t .l:last-child > span{color:transparent;-webkit-text-stroke:1px rgba(245,241,234,.7)}
#sportives .spc-air:not(.is-in) .spc-t .l > span{transform:translateY(108%)}
#sportives .spc-ground:not(.is-in) .spc-t .l > span{transform:translateY(-108%)}
#sportives .spc-air .spc-t .l:first-child > span{transition-delay:.12s}
#sportives .spc-ground .spc-t .l:last-child > span{transition-delay:.12s}
#sportives .spc-zone:hover .spc-t .l:last-child > span{-webkit-text-stroke-color:#F5F1EA}

/* lien (toute la zone est cliquable) */
#sportives .spc-link{display:inline-flex;align-items:center;gap:18px;font-family:var(--sans);font-size:12px;font-weight:600;letter-spacing:.16em;text-transform:uppercase;color:#F5F1EA;text-decoration:none;border-radius:999px}
#sportives .spc-air .spc-link{margin-top:clamp(26px,3.6vh,38px)}
#sportives .spc-ground .spc-link{margin-top:clamp(26px,3.6vh,38px);margin-bottom:clamp(26px,3.6vh,38px)}
#sportives .spc-link::after{content:"";position:absolute;inset:0;z-index:3}
#sportives .spc-link b{font-weight:600;background:linear-gradient(#F9C83B,#F9C83B) 0 100%/0 1px no-repeat;padding-bottom:4px;transition:background-size .7s var(--ease)}
#sportives .spc-link i{flex:none;display:grid;place-items:center;width:46px;height:46px;border-radius:50%;border:1px solid rgba(245,241,234,.28);font-style:normal;font-size:16px;letter-spacing:0;transition:background .45s,border-color .45s,color .45s,transform .6s var(--ease)}
#sportives .spc-zone:hover .spc-link b,#sportives .spc-link:focus-visible b{background-size:100% 1px}
#sportives .spc-zone:hover .spc-link i,#sportives .spc-link:focus-visible i{background:#F9C83B;border-color:#F9C83B;color:#0B1B2E;transform:rotate(45deg)}
#sportives .spc-link:focus-visible{outline:2px solid #F9C83B;outline-offset:8px}
#sportives .spc-txt{transition:opacity 1.2s ease .3s}
#sportives .spc-zone:not(.is-in) .spc-n,#sportives .spc-zone:not(.is-in) .spc-link{opacity:0}
#sportives .spc-n,#sportives .spc-link{transition:opacity 1s ease .7s}

/* horizon : ligne pleine largeur, graduations de cap, lueur */
#sportives .spc-hz{position:relative;height:1px;margin:0 calc(var(--gutter) * -1)}
#sportives .spc-hz-line{position:absolute;left:0;right:0;top:0;height:1px;background:linear-gradient(90deg,rgba(245,241,234,0),rgba(245,241,234,.55) 18%,rgba(245,241,234,.55) 82%,rgba(245,241,234,0));transform:scaleX(0);transition:transform 2.2s cubic-bezier(.76,0,.24,1)}
#sportives .spc-hz-ticks{position:absolute;left:var(--gutter);right:var(--gutter);height:9px;top:-9px;opacity:0;transition:opacity 1.4s ease .9s;
  background:
    repeating-linear-gradient(90deg,rgba(157,180,208,.55) 0 1px,transparent 1px 120px) 0 0/100% 9px no-repeat,
    repeating-linear-gradient(90deg,rgba(157,180,208,.32) 0 1px,transparent 1px 24px) 0 100%/100% 4px no-repeat;
  -webkit-mask:linear-gradient(90deg,transparent,#000 22%,#000 78%,transparent);mask:linear-gradient(90deg,transparent,#000 22%,#000 78%,transparent)}
#sportives .spc-hz-mark{position:absolute;left:50%;top:0;width:clamp(120px,14vw,200px);height:22px;transform:translate(-50%,-50%);opacity:0;transition:opacity 1.2s ease 1.2s}
#sportives .spc-hz-mark::before{content:"";position:absolute;inset:10.5px 0 auto;height:1px;background:linear-gradient(90deg,#F9C83B 0 34%,transparent 34% 66%,#F9C83B 66%)}
#sportives .spc-hz-mark::after{content:"";position:absolute;left:50%;top:50%;width:7px;height:7px;border:1px solid #F9C83B;border-radius:50%;transform:translate(-50%,-50%)}
#sportives .spc-hz.is-in .spc-hz-line{transform:none}
#sportives .spc-hz.is-in .spc-hz-ticks,#sportives .spc-hz.is-in .spc-hz-mark{opacity:1}

@media (max-width:900px){
  #sportives.spc{padding:12vh var(--gutter) 14vh}
  #sportives .spc-alt{display:none}
  #sportives .spc-zone{grid-template-columns:repeat(6,minmax(0,1fr))}
  #sportives .spc-air .spc-ph{grid-column:2 / 7;grid-row:1;max-width:none;margin-bottom:40px}
  #sportives .spc-air .spc-txt{grid-column:1 / -1;grid-row:2}
  #sportives .spc-ground .spc-txt{grid-column:1 / -1;grid-row:1;padding-left:0}
  #sportives .spc-ground .spc-ph{grid-column:1 / 6;grid-row:2;margin-top:4px;aspect-ratio:4/3}
  #sportives .spc-hz-mark{left:auto;right:var(--gutter);transform:translate(0,-50%);width:96px}
  #sportives .spc-hz-ticks{left:0;right:0}
}
@media (max-width:420px){#sportives .spc-t{font-size:clamp(34px,10.4vw,44px)}#sportives .spc-link{gap:14px;letter-spacing:.12em;font-size:11.5px}#sportives .spc-link i{width:42px;height:42px}}
#sportives.spc-rm *{transition:none!important}
`;

const tpl = `
<style>${CSS}</style>
<div class="spc-alt" aria-hidden="true"><i class="spc-idx"></i></div>
<div class="spc-head"><p class="kicker">Activités sportives<i class="tri"></i></p></div>

<div class="spc-zone spc-air">
  <div class="spc-txt">
    <span class="spc-n" aria-hidden="true">01</span>
    <h4 class="spc-t"><span class="l"><span>PATROUILLE</span></span> <span class="l"><span>TRANCHANT</span></span></h4>
    <a class="spc-link" href="/activites-sportives/#patrouille"><b>Notre patrouille de voltige aérienne</b><i aria-hidden="true">↗</i></a>
  </div>
  <figure class="spc-ph"><img src="${UP}494x626-avion-02.jpg" alt="" loading="lazy" decoding="async"><span class="spc-tone"></span><span class="spc-tone"></span><span class="spc-crop"></span></figure>
</div>

<div class="spc-hz" aria-hidden="true"><i class="spc-hz-line"></i><i class="spc-hz-ticks"></i><i class="spc-hz-mark"></i></div>

<div class="spc-zone spc-ground">
  <div class="spc-txt">
    <span class="spc-n" aria-hidden="true">02</span>
    <h4 class="spc-t"><span class="l"><span>SHOOTING</span></span> <span class="l"><span>CLUBS</span></span></h4>
    <a class="spc-link" href="/activites-sportives/#shooting"><b>Nos complexes de loisirs sportifs</b><i aria-hidden="true">↗</i></a>
  </div>
  <figure class="spc-ph"><img src="${UP}plateau-balltrap.jpg" alt="" loading="lazy" decoding="async"><span class="spc-tone"></span><span class="spc-tone"></span><span class="spc-crop"></span></figure>
</div>
`;

export function mountSport(section, { reduceMotion, lenis } = {}) {
  section.className = 'section spc';
  section.innerHTML = tpl;
  if (reduceMotion) section.classList.add('spc-rm');

  const kicker = section.querySelector('.kicker');
  const zones = [...section.querySelectorAll('.spc-zone')];
  const hz = section.querySelector('.spc-hz');
  const phs = [...section.querySelectorAll('.spc-ph')];
  const idx = section.querySelector('.spc-idx');

  // apparitions
  const reveal = [kicker, ...zones, hz];
  if (reduceMotion || !('IntersectionObserver' in window)) {
    kicker.classList.add('fx-in'); zones.forEach(z => z.classList.add('is-in')); hz.classList.add('is-in');
  } else {
    const io = new IntersectionObserver(es => es.forEach(e => {
      if (!e.isIntersecting) return;
      e.target.classList.add(e.target === kicker ? 'fx-in' : 'is-in');
      io.unobserve(e.target);
    }), { rootMargin: '0px 0px -14% 0px' });
    reveal.forEach(el => io.observe(el));
  }

  // position de l'horizon dans le fond (lueur et changement de teinte ciel / sol)
  const placeHorizon = () => {
    const s = section.getBoundingClientRect(), h = hz.getBoundingClientRect();
    if (s.height) section.style.setProperty('--hz', ((h.top - s.top) / s.height * 100).toFixed(2) + '%');
  };
  placeHorizon();
  new ResizeObserver(placeHorizon).observe(section);

  if (reduceMotion) { phs.forEach(p => p.style.setProperty('--mono', '0')); return; }

  // au défilement : couleur qui revient au centre, léger écart vertical (l'air monte, le sol descend), index d'altimètre
  const smooth = t => t * t * (3 - 2 * t);
  let raf = 0;
  const update = () => {
    raf = 0;
    const vh = innerHeight, s = section.getBoundingClientRect();
    if (s.bottom < -200 || s.top > vh + 200) return;
    phs.forEach((p, i) => {
      const r = p.getBoundingClientRect();
      const c = (r.top - (parseFloat(p.style.getPropertyValue('--py')) || 0) + r.height / 2 - vh / 2) / vh; // -0.5..0.5 au centre
      const k = Math.max(0, 1 - Math.abs(c) / .42);
      p.style.setProperty('--mono', (1 - smooth(k)).toFixed(3));
      p.style.setProperty('--py', ((i === 0 ? 1 : -1) * Math.max(-1, Math.min(1, c)) * 36).toFixed(1) + 'px');
    });
    const ai = vh / 2 - s.top;
    idx.style.setProperty('--ai', ai.toFixed(1) + 'px');
    idx.style.setProperty('--ao', ai > s.height * .08 && ai < s.height * .92 ? '1' : '0');
  };
  const req = () => { if (!raf) raf = requestAnimationFrame(update); };
  if (lenis && lenis.on) lenis.on('scroll', req);
  addEventListener('scroll', req, { passive: true });
  addEventListener('resize', req);
  update();
}
