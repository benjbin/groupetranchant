/* Carrières : un mur de portraits qui défile derrière le titre, et une scène photo collée à côté des métiers
   (la photo du métier survolé ou ouvert y apparaît, avec son numéro). Les photos sont celles des fiches métiers ;
   tout ce qui est créé ici est décoratif (aria-hidden), aucun texte n'est ajouté à la page. */
export function mountCr(root, { reduceMotion = false } = {}) {
  const accs = [...root.querySelectorAll('.cr-metiers .acc')];
  const pics = accs.map(d => d.querySelector('.acc-in img')?.getAttribute('src')).filter(Boolean);
  if (!pics.length) return;
  mountWall(root.querySelector('.cr-hero'), pics, reduceMotion);
  mountStage(root.querySelector('.cr-metiers'), accs);
  // offres : le reflet doré suit le pointeur sur la carte
  root.querySelectorAll('.cr-offres .job').forEach(c => c.addEventListener('pointermove', e => {
    const r = c.getBoundingClientRect();
    c.style.setProperty('--jx', (e.clientX - r.left) + 'px'); c.style.setProperty('--jy', (e.clientY - r.top) + 'px');
  }));
}

function mountWall(hero, pics, reduceMotion) {
  if (!hero) return;
  const wall = document.createElement('div');
  wall.className = 'cr-wall';
  wall.setAttribute('aria-hidden', 'true');
  const cols = 6;
  for (let c = 0; c < cols; c++) {
    const col = document.createElement('div');
    col.className = 'cr-col';
    col.style.setProperty('--dur', 46 + (c * 17) % 30 + 's');
    if (c % 2) col.classList.add('up');
    const track = document.createElement('div');
    track.className = 'cr-track';
    // chaque colonne commence ailleurs dans la liste ; la suite est doublée pour boucler sans raccord
    const seq = pics.map((_, i) => pics[(i + c * 3) % pics.length]).slice(0, 6);
    [...seq, ...seq].forEach(src => { const f = document.createElement('i'); f.style.backgroundImage = `url("${src}")`; track.appendChild(f); });
    col.appendChild(track);
    wall.appendChild(col);
  }
  hero.prepend(wall);
  if (reduceMotion) wall.classList.add('still');
  requestAnimationFrame(() => hero.classList.add('cr-wall-on'));
  // le mur penche un peu plus avec le pointeur
  if (!reduceMotion) hero.addEventListener('pointermove', e => {
    hero.style.setProperty('--mx', (e.clientX / innerWidth - .5).toFixed(3));
    hero.style.setProperty('--my', (e.clientY / innerHeight - .5).toFixed(3));
  });
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
