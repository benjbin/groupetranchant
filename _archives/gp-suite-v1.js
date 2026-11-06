/* Page Groupe — suite : « Engagements et valeurs » (scène épinglée, volet tricolore) et
   « Index égalité » (anneaux tracés au défilement, jauges segmentées, compteurs à rouleaux).
   Aucun texte ajouté : seuls des éléments décoratifs aria-hidden sont créés. */
const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const smooth = t => t * t * (3 - 2 * t);

export function mountGpSuite(root = document, { reduceMotion = false } = {}) {
  root = root || document;
  const eng = root.querySelector('.gs-eng'), idx = root.querySelector('.gs-idx');
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
  const rows = [...idx.querySelectorAll('.gs-table tbody tr')];
  const rings = idx.querySelector('.gs-idx-rings');
  const hot = idx.querySelector('.gs-idx-hot');
  // survol d'une ligne : son anneau s'allume, sa note au centre
  const setHot = tr => {
    if (!tr) { delete idx.dataset.hot; return; }
    idx.dataset.hot = tr.dataset.k;
    if (hot) hot.textContent = tr.querySelector('.gs-sr, .gs-score')?.textContent.trim() || '';
  };
  rows.forEach(tr => { tr.addEventListener('pointerenter', () => setHot(tr)); tr.addEventListener('pointerleave', () => setHot(null)); });
  if (reduceMotion) return;
  idx.classList.add('gs-js');
  // compteurs à rouleaux : le texte d'origine reste lisible par les lecteurs d'écran
  rows.forEach(tr => {
    const b = tr.querySelector('.gs-score'); const t = b && b.textContent.trim();
    if (!t || !/^\d+$/.test(t)) return;
    const odo = document.createElement('span'); odo.className = 'gs-odo'; odo.setAttribute('aria-hidden', 'true');
    [...t].forEach((d, j) => {
      const col = document.createElement('span');
      for (let n = 0; n <= 19; n++) { const s = document.createElement('span'); s.textContent = n % 10; col.appendChild(s); }
      col.style.transitionDelay = (.25 + +tr.dataset.k * .07 + j * .12).toFixed(2) + 's';
      col.dataset.to = 10 + +d; // passe une dizaine complète avant de s'arrêter
      odo.appendChild(col);
    });
    b.innerHTML = `<span class="gs-sr">${t}</span>`; b.appendChild(odo);
  });
  const io = new IntersectionObserver(es => es.forEach(e => {
    if (!e.isIntersecting) return;
    const tr = e.target; tr.classList.add('in'); io.unobserve(tr);
    tr.querySelectorAll('.gs-odo > span').forEach(c => { c.style.transform = `translateY(${-c.dataset.to}em)`; });
  }), { threshold: .35, rootMargin: '0px 0px -6% 0px' });
  rows.forEach(tr => io.observe(tr));
  // anneaux tracés selon le défilement
  if (rings) {
    let raf = 0;
    const upd = () => {
      raf = 0;
      const r = rings.getBoundingClientRect();
      const t = clamp((innerHeight * .95 - r.top) / (innerHeight * .75 + r.height * .3));
      rings.style.setProperty('--r', smooth(t).toFixed(4));
    };
    addEventListener('scroll', () => { if (!raf) raf = requestAnimationFrame(upd); }, { passive: true });
    addEventListener('resize', upd);
    upd();
  }
}
