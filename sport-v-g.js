/* Groupe Tranchant — activités sportives (accueil), la 3D en plein écran.
   Une scène collante de la hauteur de l'écran ; la Patrouille puis le Shooting s'y succèdent au défilement
   (scènes sport-3d-air.js / sport-3d-shot.js), le texte se pose en bas à gauche. Photos en repli sans WebGL. */
const IMG = 'https://www.groupetranchant.com/wp-content/uploads/2025/03/';
const CH = [
  { k: 'air', n: '01', t: ['PATROUILLE', 'TRANCHANT'], l: 'Notre patrouille de voltige aérienne', h: '/activites-sportives/#patrouille', img: '494x626-avion-02.jpg', load: () => import('./sport-3d-air.js') },
  { k: 'shot', n: '02', t: ['SHOOTING', 'CLUBS'], l: 'Nos complexes de loisirs sportifs', h: '/activites-sportives/#shooting', img: 'plateau-balltrap.jpg', load: () => import('./sport-3d-shot.js') }
];

const CSS = `
#sportives.g3d{padding:0;background:#0B1B2E}
#sportives .g-track{position:relative;height:300vh}
#sportives .g-stage{position:sticky;top:0;height:100vh;height:100svh;overflow:hidden;color:#F5F1EA}
#sportives .g-layer{position:absolute;inset:0}
#sportives .g-layer[data-k="shot"]{z-index:1;opacity:0;visibility:hidden}
#sportives .g-dip{position:absolute;inset:0;z-index:1;background:#0B1B2E;opacity:0;pointer-events:none}
#sportives .g-host,#sportives .g-photo{position:absolute;inset:0}
#sportives .g-photo img{width:100%;height:100%;object-fit:cover}
#sportives .g-host canvas{display:block;width:100%!important;height:100%!important}
#sportives .g-veil{position:absolute;inset:0;z-index:2;pointer-events:none;background:linear-gradient(180deg,rgba(11,27,46,.55) 0%,rgba(11,27,46,0) 22%,rgba(11,27,46,0) 52%,rgba(11,27,46,.78) 100%),linear-gradient(90deg,rgba(11,27,46,.45) 0%,rgba(11,27,46,0) 45%)}
#sportives .g-top{position:absolute;z-index:3;top:clamp(92px,13vh,130px);left:var(--gutter);right:var(--gutter);display:flex;justify-content:space-between;align-items:flex-start}
#sportives .g-top .kicker{color:rgba(245,241,234,.75)}
#sportives .g-count{display:flex;align-items:center;gap:14px;font-family:var(--display);font-stretch:115%;font-weight:600;font-size:12.5px;letter-spacing:.16em;color:rgba(245,241,234,.5)}
#sportives .g-count b{color:#F9C83B;font-weight:600;min-width:1.6em}
#sportives .g-count i{display:block;width:120px;height:1px;background:rgba(245,241,234,.25);position:relative}
#sportives .g-count i::after{content:"";position:absolute;inset:0;background:#F5F1EA;transform-origin:left;transform:scaleX(var(--p,0))}
#sportives .g-txt{position:absolute;z-index:3;left:var(--gutter);right:var(--gutter);bottom:clamp(36px,8vh,84px);pointer-events:none}
#sportives .g-item{position:absolute;left:0;bottom:0;display:flex;flex-direction:column;align-items:flex-start;gap:clamp(18px,3vh,30px);color:inherit;text-decoration:none;pointer-events:none}
#sportives .g-item.on{pointer-events:auto}
#sportives .g-item .n{font-family:var(--display);font-stretch:115%;font-weight:600;font-size:12.5px;letter-spacing:.16em;color:#F9C83B}
#sportives .g-item h3{margin:0;font-family:var(--display);font-stretch:115%;font-weight:500;letter-spacing:-.035em;line-height:.9;font-size:clamp(44px,8.4vw,148px);color:#fff}
#sportives .g-item h3 span{display:block;overflow:hidden;padding-bottom:.06em}
#sportives .g-item h3 span>span{display:block;transform:translateY(105%);transition:transform 1.1s cubic-bezier(.2,.8,.2,1)}
#sportives .g-item h3 span+span>span{transition-delay:.08s}
#sportives .g-item .n,#sportives .g-item .btn{opacity:0;transform:translateY(16px);transition:opacity .8s,transform .9s cubic-bezier(.2,.8,.2,1)}
#sportives .g-item.on h3 span>span{transform:none}
#sportives .g-item.on .n,#sportives .g-item.on .btn{opacity:1;transform:none;transition-delay:.25s}
#sportives .g-item .btn{margin:0;border-color:rgba(245,241,234,.45);color:#F5F1EA;background:rgba(11,27,46,.25);backdrop-filter:blur(8px)}
#sportives .g-item:hover .btn,#sportives .g-item:focus-visible .btn{background:#F5F1EA;color:#0B1B2E;border-color:#F5F1EA}
#sportives .g-item:focus-visible{outline:2px solid #F9C83B;outline-offset:8px}
@media (max-width:760px){#sportives .g-track{height:260vh}#sportives .g-count i{width:60px}}
@media (prefers-reduced-motion:reduce){#sportives .g-item *{transition:none!important}}
`;

export function mountSport(section, { reduceMotion, lenis }) {
  const st = document.createElement('style'); st.textContent = CSS; document.head.appendChild(st);
  section.className = 'section g3d';
  section.innerHTML = `<div class="g-track"><div class="g-stage">
    ${CH.map((c, i) => `<div class="g-layer" data-k="${c.k}"><figure class="g-photo" style="margin:0"><img src="${IMG + c.img}" alt="" loading="lazy"></figure><div class="g-host"></div></div>`).join('')}
    <div class="g-dip"></div><div class="g-veil"></div>
    <div class="g-top"><p class="kicker">Activités sportives<i class="tri"></i></p><div class="g-count" aria-hidden="true"><b>01</b><i></i><span>02</span></div></div>
    <div class="g-txt">${CH.map((c, i) => `<a class="g-item${i ? '' : ' on'}" href="${c.h}"><span class="n" aria-hidden="true">${c.n}</span><h3>${c.t.map(w => `<span><span>${w}</span></span>`).join('')}</h3><span class="btn">${c.l}</span></a>`).join('')}</div>
  </div></div>`;

  const stage = section.querySelector('.g-stage'), track = section.querySelector('.g-track');
  const layers = [...section.querySelectorAll('.g-layer')], items = [...section.querySelectorAll('.g-item')];
  const count = section.querySelector('.g-count'), countN = count.querySelector('b'), dip = section.querySelector('.g-dip');

  // scènes 3D : chargées à l'approche ; une erreur laisse simplement la photo
  const hasGL = (() => { try { const c = document.createElement('canvas'); return !!(c.getContext('webgl2') || c.getContext('webgl')); } catch { return false; } })();
  const S = [null, null];
  let cur = 0, visible = false, loaded = false, mix = 0;
  const safe = (i, fn, ...a) => { try { S[i]?.[fn]?.(...a); } catch (err) { console.warn('scène 3D désactivée', err); S[i] = null; layers[i].querySelector('.g-host').remove(); } };
  const load = () => {
    if (loaded || !hasGL) return; loaded = true;
    CH.forEach((c, i) => c.load().then(m => {
      const host = layers[i].querySelector('.g-host');
      S[i] = m.mount(host, { reduceMotion });
      layers[i].querySelector('.g-photo').style.visibility = 'hidden';
      sync(); onScroll();   // la scène chargée prend tout de suite la position du défilement
    }).catch(err => console.warn('scène 3D indisponible', c.k, err)));
  };
  // une scène tourne tant qu'elle est visible : la Patrouille jusqu'à ce que le Shooting la recouvre, le Shooting dès qu'il apparaît
  const sync = () => S.forEach((s, i) => s && safe(i, visible && (i ? mix > 0 : mix < 1) ? 'play' : 'pause'));

  const setCur = i => {
    if (i === cur) return;
    cur = i;
    items.forEach((el, k) => el.classList.toggle('on', k === i));
    countN.textContent = CH[i].n;
  };

  // défilement : la Patrouille (0 → A), un fondu lié au défilement (A → B), puis le Shooting (B → 1)
  const A = .42, B = .58;
  const ease = t => t * t * (3 - 2 * t);
  const onScroll = () => {
    const r = track.getBoundingClientRect(), span = r.height - innerHeight;
    const p = Math.min(1, Math.max(0, -r.top / span));
    count.style.setProperty('--p', p.toFixed(3));
    const m = ease(Math.min(1, Math.max(0, (p - A) / (B - A))));
    if ((m > 0) !== (mix > 0) || (m < 1) !== (mix < 1)) { mix = m; sync(); } else mix = m;
    layers[1].style.opacity = m.toFixed(3); layers[1].style.visibility = m > 0 ? 'visible' : 'hidden';
    dip.style.opacity = (Math.sin(m * Math.PI) * .85).toFixed(3);   // passage par le bleu nuit : les deux scènes ne se superposent pas
    setCur(m < .5 ? 0 : 1);
    safe(0, 'progress', Math.min(1, p / A)); safe(1, 'progress', Math.max(0, (p - B) / (1 - B)));
  };
  lenis ? lenis.on('scroll', onScroll) : addEventListener('scroll', onScroll, { passive: true });
  addEventListener('resize', onScroll);
  // le clavier peut atteindre le lien de l'autre chapitre : on y défile
  items.forEach((el, i) => el.addEventListener('focus', () => { if (i !== cur) { const top = track.getBoundingClientRect().top + scrollY + (track.offsetHeight - innerHeight) * (i ? .75 : .1); lenis ? lenis.scrollTo(top, { immediate: reduceMotion }) : scrollTo(0, top); } }));

  stage.addEventListener('pointermove', e => { const b = stage.getBoundingClientRect(); safe(cur, 'pointer', (e.clientX - b.left) / b.width - .5, (e.clientY - b.top) / b.height - .5); });
  stage.addEventListener('pointerleave', () => safe(cur, 'pointer', 0, 0));

  new IntersectionObserver(([e]) => { if (e.isIntersecting) load(); }, { rootMargin: '100% 0px' }).observe(section);
  // préparées au repos : leur montage (shaders, textures) ne tombe pas au milieu de la transition jeton qui précède
  setTimeout(() => (window.requestIdleCallback || setTimeout)(load, { timeout: 5000 }), 9000);
  new IntersectionObserver(([e]) => { visible = e.isIntersecting; sync(); }).observe(stage);
  onScroll();
}
