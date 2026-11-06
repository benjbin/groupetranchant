/* Nos destinations : dans l'ouverture, un mur incliné des photos des établissements défile lentement
   en quatre colonnes et suit le pointeur. Les photos sont reprises de l'annuaire ; décor seul, aria-hidden. */
export function mountDn(hero, { reduceMotion = false } = {}) {
  const wall = hero.querySelector('.dn-wall');
  const srcs = [...document.querySelectorAll('#dest-grid .dest img')].map(i => i.getAttribute('src'));
  if (!wall || !srcs.length) return;
  const inner = document.createElement('div');
  inner.className = 'dn-wall-in';
  for (let c = 0; c < 4; c++) {
    // chaque colonne prend une photo sur quatre, décalée, pour que les voisines ne se répètent pas
    const list = srcs.filter((_, i) => i % 4 === c);
    const col = document.createElement('div'), track = document.createElement('div');
    col.className = 'dn-col'; track.className = 'dn-track';
    [...list, ...list].forEach((src, i) => {
      const img = new Image();
      img.src = src; img.alt = ''; img.decoding = 'async';
      if (i >= list.length) img.loading = 'lazy';
      track.appendChild(img);
    });
    col.appendChild(track); inner.appendChild(col);
  }
  wall.appendChild(inner);
  requestAnimationFrame(() => hero.classList.add('dn-on'));
  if (reduceMotion) { hero.classList.add('dn-still'); return; }
  hero.addEventListener('pointermove', e => {
    const r = hero.getBoundingClientRect();
    hero.style.setProperty('--px', ((e.clientX - r.left) / r.width - .5).toFixed(3));
    hero.style.setProperty('--py', ((e.clientY - r.top) / r.height - .5).toFixed(3));
    hero.style.setProperty('--lx', (e.clientX - r.left) + 'px'); hero.style.setProperty('--ly', (e.clientY - r.top) + 'px');
  });
  // le mur s'arrête hors de l'écran
  new IntersectionObserver(([e]) => hero.classList.toggle('dn-off', !e.isIntersecting)).observe(hero);
}
