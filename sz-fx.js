/* Groupe Tranchant — Activités spécialisées : chaque filiale entre en scène.
   Une scène plein écran reste collée pendant toute la section ; chaque filiale y fait entrer sa scène vivante
   (celles de l'accueil, spec-fx-<filiale>.js) par un volet latéral, du côté opposé à son texte, pendant que la
   précédente recule dans l'ombre. Le texte passe devant dans un panneau de verre. Seules les scènes visibles tournent. */
const SCENES = {
  cat: () => import('./spec-fx-cat.js'),
  certus: () => import('./spec-fx-certus.js'),
  alioscopy: () => import('./spec-fx-alioscopy.js'),
  zalix: () => import('./spec-fx-zalix.js'),
  ids: () => import('./spec-fx-ids.js')
};
const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const ease = t => t * t * (3 - 2 * t);

export function mountSz(root, { reduceMotion }) {
  if (reduceMotion) { root.classList.add('sz-still'); return; }
  root.classList.add('sz-live');
  const frameEl = root.querySelector('.sz-frame'), prog = root.querySelector('.sz-prog');
  const layers = [...root.querySelectorAll('.sz-layer')], chs = [...root.querySelectorAll('.sz-ch')];
  const dots = [...root.querySelectorAll('.sz-hud > i')];

  // les panneaux : chaque ligne entre quand elle arrive dans l'écran
  const io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } }), { rootMargin: '0px 0px -10% 0px' });
  root.querySelectorAll('.sz-panel > *').forEach(el => io.observe(el));

  const hasGL = (() => { try { const c = document.createElement('canvas'); return !!(c.getContext('webgl2') || c.getContext('webgl')); } catch { return false; } })();
  const S = [];
  const load = i => {
    if (!hasGL || i >= layers.length || S[i]) return;
    S[i] = SCENES[layers[i].dataset.fx]().then(m => m.mount(layers[i], { reduceMotion })).catch(err => { console.warn('scène indisponible', layers[i].dataset.fx, err); return null; });
  };
  const playing = new Set();
  const want = (i, on) => {
    if (on === playing.has(i)) return;
    on ? playing.add(i) : playing.delete(i);
    S[i]?.then(s => s && (playing.has(i) ? s.play() : s.pause()));
  };

  let visible = false, cur = -1;
  const frame = () => {
    requestAnimationFrame(frame);
    if (!visible) { layers.forEach((_, i) => want(i, false)); return; }
    const vh = innerHeight;
    const rs = chs.map(c => c.getBoundingClientRect());
    // volet d'entrée de chaque scène (--w), puis recul quand la suivante arrive (--u)
    const w = rs.map((r, i) => (i ? ease(clamp((vh * .95 - r.top) / (vh * .65))) : 1));
    layers.forEach((l, i) => {
      l.style.setProperty('--w', w[i].toFixed(4));
      l.style.setProperty('--u', (w[i + 1] || 0).toFixed(4));
      if (w[i] > 0 && !S[i]) load(i);
      want(i, w[i] > 0 && !((w[i + 1] || 0) >= 1));
    });
    const c = w.reduce((k, v, i) => (v > .5 ? i : k), 0);
    if (c !== cur) { cur = c; frameEl.dataset.n = String(c + 1).padStart(2, '0'); load(c + 1); dots.forEach((d, k) => d.classList.toggle('on', k === c)); }
    const f = rs[0], l = rs[rs.length - 1];
    prog.style.setProperty('--sp', clamp((vh - f.top) / Math.max(1, l.bottom - f.top)).toFixed(4));
  };
  new IntersectionObserver(([e]) => { visible = e.isIntersecting; }, { rootMargin: '200px 0px' }).observe(root);
  requestAnimationFrame(frame);

  root.addEventListener('pointermove', e => S[cur]?.then(s => s?.pointer(e.clientX / innerWidth - .5, e.clientY / innerHeight - .5)));
}
