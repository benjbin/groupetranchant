/* Carrières : une lumière dorée suit le pointeur dans l'ouverture, et une scène photo collée à côté des métiers
   (la photo du métier survolé ou ouvert y apparaît, avec son numéro). Les photos sont celles des fiches métiers ;
   tout ce qui est créé ici est décoratif (aria-hidden), aucun texte n'est ajouté à la page. */
export function mountCr(root, { reduceMotion = false } = {}) {
  const accs = [...root.querySelectorAll('.cr-metiers .acc')];
  const pics = accs.map(d => d.querySelector('.acc-in img')?.getAttribute('src')).filter(Boolean);
  if (!pics.length) return;
  const hero = root.querySelector('.cr-hero');
  if (hero && !reduceMotion) hero.addEventListener('pointermove', e => {
    const r = hero.getBoundingClientRect();
    hero.style.setProperty('--lx', (e.clientX - r.left) + 'px'); hero.style.setProperty('--ly', (e.clientY - r.top) + 'px');
  });
  mountStage(root.querySelector('.cr-metiers'), accs);
  // offres : le reflet doré suit le pointeur sur la carte
  root.querySelectorAll('.cr-offres .job').forEach(c => c.addEventListener('pointermove', e => {
    const r = c.getBoundingClientRect();
    c.style.setProperty('--jx', (e.clientX - r.left) + 'px'); c.style.setProperty('--jy', (e.clientY - r.top) + 'px');
  }));
}

function mountStage(sec, accs) {
  if (!sec || !matchMedia('(min-width: 1101px)').matches) return;
  const stage = document.createElement('div');
  stage.className = 'cr-stage';
  stage.setAttribute('aria-hidden', 'true');
  const frame = document.createElement('div');
  frame.className = 'cr-stage-f';
  const num = document.createElement('span');
  num.className = 'cr-stage-n';
  const tri = document.createElement('i');
  tri.className = 'tri';
  const imgs = accs.map(d => {
    const im = document.createElement('img');
    im.alt = ''; im.loading = 'lazy'; im.src = d.querySelector('.acc-in img')?.getAttribute('src') || '';
    frame.appendChild(im);
    return im;
  });
  frame.append(tri);
  stage.append(frame, num);
  sec.appendChild(stage);
  sec.classList.add('cr-staged');

  let cur = -1;
  const show = i => {
    if (i === cur || i < 0) return;
    imgs.forEach((im, k) => im.classList.toggle('on', k === i));
    // numéro dans sa famille, comme dans la liste
    const d = accs[i];
    num.textContent = String([...d.parentElement.querySelectorAll('.acc')].indexOf(d) + 1).padStart(2, '0');
    num.classList.remove('pop'); void num.offsetWidth; num.classList.add('pop');
    accs.forEach((d, k) => d.classList.toggle('lit', k === i));
    cur = i;
  };
  const opened = () => accs.findIndex(d => d.open);
  accs.forEach((d, i) => {
    const s = d.querySelector('summary');
    s.addEventListener('pointerenter', () => show(i));
    s.addEventListener('focus', () => show(i));
    d.addEventListener('toggle', () => { if (d.open) show(i); });
  });
  sec.querySelectorAll('.accs').forEach(a => a.addEventListener('pointerleave', () => { const o = opened(); if (o >= 0) show(o); }));
  show(0);
}
