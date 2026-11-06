/* Carrières : une lumière dorée suit le pointeur dans l'ouverture et sur les offres d'emploi.
   Rien n'est ajouté au texte de la page. */
export function mountCr(root, { reduceMotion = false } = {}) {
  if (reduceMotion) return;
  const follow = (el, kx, ky) => el.addEventListener('pointermove', e => {
    const r = el.getBoundingClientRect();
    el.style.setProperty(kx, (e.clientX - r.left) + 'px'); el.style.setProperty(ky, (e.clientY - r.top) + 'px');
  });
  const hero = root.querySelector('.cr-hero');
  if (hero) follow(hero, '--lx', '--ly');
  root.querySelectorAll('.cr-offres .job').forEach(c => follow(c, '--jx', '--jy'));
}
