/* Page établissement — Casino de Pougues-les-Eaux.
   Statut d'ouverture calculé à l'heure du visiteur, jour en cours marqué dans chaque tableau d'horaires,
   chiffres qui montent, affiches qui défilent aux flèches, sommaire qui suit la section lue. Rien n'est ajouté au texte. */
const CLOSE = [3, 3, 3, 3, 3, 4, 4]; // heure de fermeture (lendemain) selon le jour d'ouverture, dimanche = 0

export function mountPg(root, { reduceMotion = false } = {}) {
  /* la « journée » du casino commence à 9 h et finit à 3 h ou 4 h le lendemain */
  const now = new Date(), h = now.getHours() + now.getMinutes() / 60;
  const prev = (now.getDay() + 6) % 7;
  const night = h < CLOSE[prev];
  const day = night ? prev : now.getDay();
  const open = night || h >= 9;
  const live = root.querySelector('[data-live]');
  if (live) {
    live.classList.toggle('on', open);
    live.querySelector('span').textContent = open
      ? `Ouvert maintenant · jusqu'à ${String(CLOSE[day]).padStart(2, '0')}:00`
      : 'Fermé · ouverture à 09:00';
  }
  root.querySelectorAll('[data-hours] tr[data-d]').forEach(tr => {
    if (+tr.dataset.d !== day) return;
    tr.classList.add('today');
    tr.querySelector('th').setAttribute('aria-label', `${tr.querySelector('th').textContent} (aujourd'hui)`);
  });

  /* chiffres qui montent à l'arrivée */
  root.querySelectorAll('b[data-n]').forEach(b => {
    if (reduceMotion) return;
    const to = +b.dataset.n; b.textContent = '0';
    const io = new IntersectionObserver(([e]) => {
      if (!e.isIntersecting) return; io.disconnect();
      const t0 = performance.now(), st = t => { const k = Math.min(1, (t - t0) / 1600); b.textContent = Math.round(to * (1 - Math.pow(1 - k, 3))); if (k < 1) requestAnimationFrame(st); };
      requestAnimationFrame(st);
    }, { threshold: .5 });
    io.observe(b);
  });

  /* affiches : flèches, et glisser à la souris */
  const rail = root.querySelector('.pg-rail');
  if (rail) {
    const arrows = [...root.querySelectorAll('.pg-arrow')];
    const step = () => (rail.querySelector('li')?.getBoundingClientRect().width || 300) + 20;
    arrows.forEach(a => a.addEventListener('click', () => rail.scrollBy({ left: +a.dataset.dir * step(), behavior: reduceMotion ? 'auto' : 'smooth' })));
    const sync = () => {
      arrows[0].disabled = rail.scrollLeft < 4;
      arrows[1].disabled = rail.scrollLeft > rail.scrollWidth - rail.clientWidth - 4;
    };
    rail.addEventListener('scroll', sync, { passive: true }); addEventListener('resize', sync); sync();
    let x0 = 0, s0 = 0, down = false, moved = false;
    rail.addEventListener('pointerdown', e => { if (e.pointerType !== 'mouse') return; down = true; moved = false; x0 = e.clientX; s0 = rail.scrollLeft; });
    addEventListener('pointermove', e => { if (!down) return; if (Math.abs(e.clientX - x0) > 4) { moved = true; rail.classList.add('drag'); } rail.scrollLeft = s0 - (e.clientX - x0); });
    addEventListener('pointerup', () => { down = false; rail.classList.remove('drag'); });
    rail.addEventListener('click', e => { if (moved) { e.preventDefault(); moved = false; } }, true);
  }

  /* sommaire : le lien de la section lue s'allume */
  const sub = root.querySelector('.pg-sub');
  if (sub) {
    const links = [...sub.querySelectorAll('a')];
    const map = new Map(links.map(a => [document.querySelector(a.hash), a]));
    const io = new IntersectionObserver(es => es.forEach(e => {
      if (!e.isIntersecting) return;
      links.forEach(a => a.removeAttribute('aria-current'));
      const a = map.get(e.target); a?.setAttribute('aria-current', 'true');
      if (a) sub.scrollLeft = a.offsetLeft - (sub.clientWidth - a.offsetWidth) / 2;
    }), { rootMargin: '-45% 0px -50% 0px' });
    map.forEach((a, sec) => sec && io.observe(sec));
  }
}
