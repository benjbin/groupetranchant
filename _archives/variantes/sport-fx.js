/* Groupe Tranchant — activités sportives (accueil) : un effet par panneau, chacun dans son module.
   Patrouille : sport-fx-air.js ; Shooting : sport-fx-shot.js. */
const FX = { air: () => import('./sport-fx-air.js'), shot: () => import('./sport-fx-shot.js') };

/* Outil partagé : boucle de dessin 2D dans le canvas .sp-fx du panneau, active seulement quand il est à l'écran */
export function runner(pane, step) {
  const cv = pane.querySelector('.sp-fx'), x = cv.getContext('2d');
  const st = { w: 0, h: 0, px: null, py: null, on: false, raf: 0, last: 0 };
  new ResizeObserver(() => { const r = Math.min(devicePixelRatio, 2); st.w = cv.clientWidth; st.h = cv.clientHeight; cv.width = st.w * r; cv.height = st.h * r; x.setTransform(r, 0, 0, r, 0, 0); }).observe(cv);
  const frame = now => {
    st.raf = 0; if (!st.on) return;
    const dt = Math.min(.05, (now - (st.last || now)) / 1000); st.last = now;
    x.clearRect(0, 0, st.w, st.h);
    step(x, st, dt, now / 1000);
    st.raf = requestAnimationFrame(frame);
  };
  pane.addEventListener('pointermove', e => { const b = cv.getBoundingClientRect(); st.px = e.clientX - b.left; st.py = e.clientY - b.top; });
  pane.addEventListener('pointerleave', () => { st.px = st.py = null; });
  new IntersectionObserver(([e]) => { st.on = e.isIntersecting; st.last = 0; if (st.on && !st.raf) st.raf = requestAnimationFrame(frame); }).observe(pane);
  return st;
}


export function mountSportFx(root, { reduceMotion }) {
  root.querySelectorAll('.sp-pane').forEach(p => FX[p.dataset.fx]().then(m => m.mount(p, { reduceMotion })).catch(err => console.warn('effet indisponible', p.dataset.fx, err)));
  if (!reduceMotion) root.classList.add('fx');
}
