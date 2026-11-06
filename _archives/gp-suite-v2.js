/* Page Groupe — suite : « Engagements et valeurs » (scène épinglée, volet tricolore) et
   « Index égalité » (huit cadrans dont l'arc se remplit et dont la note monte à l'arrivée ; le survol d'un
   cadran éclaire la ligne du tableau, et inversement).
   Aucun texte ajouté : seuls des éléments décoratifs aria-hidden sont créés. */
const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const smooth = t => t * t * (3 - 2 * t);

export function mountGpSuite(root = document, { reduceMotion = false } = {}) {
  root = root || document;
  const eng = root.querySelector('.gs-eng'), idx = root.querySelector('.gx');
  if (eng) mountEng(eng, reduceMotion);
  if (idx) mountIdx(idx, reduceMotion);
}

function mountEng(eng, reduceMotion) {
  const items = [...eng.querySelectorAll('.gs-eng-item')];
  const track = eng.querySelector('.gs-eng-track');
  if (reduceMotion) return; // mise en page statique, état final
  eng.classList.add('gs-js');
  const io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { e.target.classList.add('gs-in'); io.unobserve(e.target); } }), { threshold: .2 });
  items.forEach(it => io.observe(it));
  const ioS = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { eng.classList.add('gs-in'); ioS.disconnect(); } }), { threshold: .12 });
  ioS.observe(eng);

  const mq = matchMedia('(min-width: 1000px) and (min-height: 620px)');
  let pin = false, raf = 0, cur = -1;
  const range = () => { const r = track.getBoundingClientRect(); return { r, span: Math.max(1, r.height - innerHeight) }; };
  const update = () => {
    raf = 0;
    if (!pin) return;
    const { r, span } = range();
    const p = clamp(-r.top / span);
    const w = smooth(clamp((p - .36) / .3));
    eng.style.setProperty('--p', p.toFixed(4));
    eng.style.setProperty('--w', w.toFixed(4));
    const c = w > .5 ? 1 : 0;
    if (c !== cur) {
      cur = c; eng.dataset.cur = c;
      items.forEach((it, i) => { it.classList.toggle('cur', i === c); it.classList.toggle('out', i < c); });
    }
  };
  const req = () => { if (!raf) raf = requestAnimationFrame(update); };
  const set = () => {
    pin = mq.matches;
    eng.classList.toggle('gs-pin', pin);
    if (!pin) { cur = -1; delete eng.dataset.cur; items.forEach(it => it.classList.remove('cur', 'out')); eng.style.removeProperty('--p'); eng.style.removeProperty('--w'); }
    update();
  };
  mq.addEventListener ? mq.addEventListener('change', set) : mq.addListener(set);
  addEventListener('scroll', req, { passive: true });
  addEventListener('resize', req);
  // clavier : amener à l'écran le panneau qui reçoit le focus
  eng.addEventListener('focusin', e => {
    if (!pin) return;
    const i = items.indexOf(e.target.closest('.gs-eng-item'));
    if (i < 0 || i === cur) return;
    const { r, span } = range();
    scrollTo({ top: scrollY + r.top + span * (i ? .8 : .12), behavior: 'auto' });
    requestAnimationFrame(update);
  });
  set();
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
