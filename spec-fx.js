/* Groupe Tranchant — activités spécialisées (accueil) : une scène animée par filiale.
   Chaque filiale a son module (spec-fx-<filiale>.js) qui dessine dans son propre calque ;
   la filiale survolée prend la scène, sinon la scène passe d'une filiale à l'autre. */
const SCENES = {
  cat: () => import('./spec-fx-cat.js'),
  certus: () => import('./spec-fx-certus.js'),
  alioscopy: () => import('./spec-fx-alioscopy.js'),
  zalix: () => import('./spec-fx-zalix.js'),
  ids: () => import('./spec-fx-ids.js')
};

/* Outil partagé : fait tourner une fonction de dessin 2D draw(ctx, w, h, t, mx, my) dans un canvas du calque */
export function canvas2d(layer, draw, { reduceMotion }) {
  const cv = document.createElement('canvas'), x = cv.getContext('2d');
  layer.appendChild(cv);
  let w = 0, h = 0, raf = 0, on = false, mx = 0, my = 0, tmx = 0, tmy = 0;
  const frame = now => {
    raf = 0;
    mx += (tmx - mx) * .06; my += (tmy - my) * .06;
    x.clearRect(0, 0, w, h);
    draw(x, w, h, reduceMotion ? 2.4 : now / 1000, mx, my);
    if (on && !reduceMotion) raf = requestAnimationFrame(frame);
  };
  new ResizeObserver(() => { const r = Math.min(devicePixelRatio, 2); w = layer.clientWidth; h = layer.clientHeight; cv.width = w * r; cv.height = h * r; x.setTransform(r, 0, 0, r, 0, 0); if (!raf) raf = requestAnimationFrame(frame); }).observe(layer);
  return {
    play() { on = true; if (!raf) raf = requestAnimationFrame(frame); },
    pause() { on = false; },
    pointer(px, py) { tmx = px; tmy = py; }
  };
}

export function mountSpecFx(root, { reduceMotion }) {
  const stage = root.querySelector('.sx-stage');
  const rows = [...root.querySelectorAll('.sx-row')];
  const big = stage.querySelector('.sx-big'), count = stage.querySelector('.sx-count b');
  const before = stage.querySelector('.sx-count');
  // un calque par filiale, chargé à la première apparition
  const layers = rows.map(r => { const l = document.createElement('div'); l.className = 'sx-layer'; l.dataset.fx = r.dataset.fx; stage.insertBefore(l, before); return l; });
  const scenes = [];
  const load = i => scenes[i] ||= SCENES[rows[i].dataset.fx]().then(m => m.mount(layers[i], { reduceMotion })).catch(err => { console.warn('scène indisponible', rows[i].dataset.fx, err); return null; });
  let cur = 0, switchedAt = 0, hovering = false, visible = false, raf = 0;
  const CYCLE = 5200;

  const show = i => {
    layers.forEach((l, k) => l.classList.toggle('on', k === i));
    scenes.forEach((p, k) => p?.then(s => s && (k === i && visible ? s.play() : setTimeout(() => k !== cur && s.pause(), 800))));
    load(i).then(s => { if (s && i === cur && visible) s.play(); });
  };
  const select = i => {
    if (i === cur) return;
    cur = i; switchedAt = performance.now();
    rows.forEach((r, k) => { r.classList.toggle('on', k === i); if (k !== i) r.style.setProperty('--sx-p', 0); });
    const n = String(i + 1).padStart(2, '0');
    count.textContent = n;
    big.classList.remove('swap'); void big.offsetWidth; big.textContent = n; big.classList.add('swap');
    show(i);
    load((i + 1) % rows.length);
  };
  rows.forEach((r, i) => {
    r.addEventListener('mouseenter', () => { hovering = true; select(i); });
    r.addEventListener('focus', () => select(i));
  });
  root.querySelector('.sx-list').addEventListener('mouseleave', () => { hovering = false; switchedAt = performance.now(); });
  stage.addEventListener('pointermove', e => { const b = stage.getBoundingClientRect(), px = (e.clientX - b.left) / b.width - .5, py = (e.clientY - b.top) / b.height - .5; scenes[cur]?.then(s => s?.pointer(px, py)); });
  stage.addEventListener('pointerleave', () => scenes[cur]?.then(s => s?.pointer(0, 0)));

  // passage automatique à la filiale suivante, avec la jauge de la ligne active
  const tick = now => {
    raf = 0; if (!visible) return;
    if (!hovering && !reduceMotion) {
      const k = (now - switchedAt) / CYCLE;
      rows[cur].style.setProperty('--sx-p', Math.min(1, k).toFixed(3));
      if (k >= 1) select((cur + 1) % rows.length);
    }
    raf = requestAnimationFrame(tick);
  };
  new IntersectionObserver(([e]) => {
    visible = e.isIntersecting;
    if (visible) { switchedAt = performance.now(); show(cur); if (!raf) raf = requestAnimationFrame(tick); }
    else scenes.forEach(p => p?.then(s => s?.pause()));
  }, { rootMargin: '100px' }).observe(stage);
  rows[0].classList.add('on');
  root.classList.add('ready');
}
