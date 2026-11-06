/* Page Groupe — suite : « Engagements et valeurs » (scène épinglée, volet tricolore) et
   « Index égalité » (huit cadrans dont l'arc se remplit et dont la note monte à l'arrivée ; le survol d'un
   cadran éclaire la ligne du tableau, et inversement).
   Aucun texte ajouté : seuls des éléments décoratifs aria-hidden sont créés. */
const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const smooth = t => t * t * (3 - 2 * t);

export function mountGpSuite(root = document, { reduceMotion = false } = {}) {
  root = root || document;
  const eng = root.querySelector('.ge'), idx = root.querySelector('.gx');
  if (eng) mountEng(eng, reduceMotion);
  if (idx) mountIdx(idx, reduceMotion);
}

function mountEng(eng, reduceMotion) {
  // les panneaux entrent à l'écran ; sur grand écran, la photo de droite reste en scène et la seconde monte
  // par un volet quand le second panneau arrive, pendant que le fond d'ambiance (même photo, floutée) suit
  const chs = [...eng.querySelectorAll('.ge-ch')];
  const io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } }), { rootMargin: '0px 0px -12% 0px' });
  eng.querySelectorAll('.ge-panel').forEach(p => io.observe(p));
  if (reduceMotion) { eng.classList.add('ge-still'); return; }
  eng.classList.add('ge-live');
  let raf = 0;
  const update = () => {
    raf = 0;
    const vh = innerHeight, r = eng.getBoundingClientRect(), b = chs[1].getBoundingClientRect();
    const w = smooth(clamp((vh * .95 - b.top) / (vh * .7)));
    const p = clamp(-r.top / Math.max(1, r.height - vh));
    eng.style.setProperty('--w', w.toFixed(4));
    eng.style.setProperty('--p', p.toFixed(4));
    eng.style.setProperty('--in', smooth(clamp((vh - r.top) / (vh * .8))).toFixed(4));
  };
  const req = () => { if (!raf) raf = requestAnimationFrame(update); };
  addEventListener('scroll', req, { passive: true }); addEventListener('resize', req);
  update();
}

function mountIdx(idx, reduceMotion) {
  const tiles = [...idx.querySelectorAll('.gx-tile')], rows = [...idx.querySelectorAll('.gx-table tbody tr')];
  const head = idx.querySelector('.gx-head');
  // survol croisé cadran ↔ ligne du tableau
  const hot = k => { tiles.forEach(t => t.classList.toggle('hot', t.dataset.k === k)); rows.forEach(r => r.classList.toggle('hot', r.dataset.k === k)); idx.classList.toggle('has-hot', k != null); };
  [...tiles, ...rows].forEach(el => { el.addEventListener('pointerenter', () => hot(el.dataset.k)); el.addEventListener('pointerleave', () => hot(null)); });
  const done = t => { t.classList.add('in'); };
  if (reduceMotion || !('IntersectionObserver' in window)) { tiles.forEach(done); head?.classList.add('in'); return; }
  idx.classList.add('gx-js');
  // la note monte de 0 à sa valeur pendant que l'arc se remplit
  const count = (t, delay) => {
    const sc = t.querySelector('.gx-score'), v = +t.style.getPropertyValue('--v');
    if (!v) return;
    const t0 = performance.now() + delay, dur = 1600;
    const step = now => { const p = clamp((now - t0) / dur), e = 1 - (1 - p) ** 3; sc.textContent = Math.round(v * e); if (p < 1) requestAnimationFrame(step); };
    sc.textContent = '0'; requestAnimationFrame(step);
  };
  const io = new IntersectionObserver(es => es.forEach(e => {
    if (!e.isIntersecting) return; io.unobserve(e.target);
    if (e.target === head) { head.classList.add('in'); return; }
    const i = tiles.indexOf(e.target), d = (i % 4) * 110 + Math.floor(i / 4) * 160;
    e.target.style.setProperty('--d', d + 'ms'); done(e.target); count(e.target, d + 150);
  }), { rootMargin: '0px 0px -12% 0px' });
  if (head) io.observe(head);
  tiles.forEach(t => io.observe(t));
}
