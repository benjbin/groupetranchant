/* Groupe Tranchant — Activités spécialisées : les cinq filiales se lisent à côté de leur scène vivante.
   Le cadre reste collé à l'écran ; chaque filiale y fait monter sa scène (celles de l'accueil, spec-fx-<filiale>.js)
   comme un volet, avec un trait de balayage. Seules les scènes visibles tournent ; elles se chargent à l'approche. */
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
  const stage = root.querySelector('.sz-stage'), frameEl = root.querySelector('.sz-frame'), prog = root.querySelector('.sz-prog');
  const layers = [...root.querySelectorAll('.sz-layer')], chs = [...root.querySelectorAll('.sz-ch')];

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
    const w = chs.map((c, i) => {
      const r = c.getBoundingClientRect();
      const a = 1 - clamp(Math.abs(r.top + Math.min(r.height, vh) / 2 - vh / 2) / (vh * .7));
      c.style.setProperty('--a', ease(a).toFixed(4));
      return i ? ease(clamp((vh * .95 - r.top) / (vh * .55))) : 1;
    });
    w.forEach((v, i) => layers[i].style.setProperty('--w', v.toFixed(4)));
    const c = w.reduce((k, v, i) => (v > .5 ? i : k), 0);
    if (c !== cur) { cur = c; frameEl.dataset.n = String(c + 1).padStart(2, '0'); load(c); load(c + 1); chs.forEach((el, k) => el.classList.toggle('on', k === c)); }
    // une scène tourne si elle se voit : en train de monter, ou pas encore recouverte par la suivante
    layers.forEach((_, i) => { if (S[i] === undefined && w[i] > 0) load(i); want(i, w[i] > 0 && !(w[i + 1] >= 1)); });
    const f = chs[0].getBoundingClientRect(), l = chs[chs.length - 1].getBoundingClientRect();
    prog.style.setProperty('--sp', clamp((vh / 2 - f.top) / Math.max(1, l.bottom - f.top - vh / 2)).toFixed(4));
  };
  new IntersectionObserver(([e]) => { visible = e.isIntersecting; }, { rootMargin: '200px 0px' }).observe(root);
  requestAnimationFrame(frame);

  frameEl.addEventListener('pointermove', e => { const b = frameEl.getBoundingClientRect(); S[cur]?.then(s => s?.pointer((e.clientX - b.left) / b.width - .5, (e.clientY - b.top) / b.height - .5)); });
  frameEl.addEventListener('pointerleave', () => S[cur]?.then(s => s?.pointer(0, 0)));
}
