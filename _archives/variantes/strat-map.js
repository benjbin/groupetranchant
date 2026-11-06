/* Groupe Tranchant — carte des implantations (section Stratégie de l'accueil).
   Carte à plat aux couleurs de la DA : France et Suisse en bleu brume, trame de points, un repère par adresse
   (casino : disque bleu GT, club : disque rouge, hôtel : anneau jaune soleil), fiche au survol, filtre par la légende.
   Relief : la carte est inclinée en perspective (CSS 3D), avec une tranche, une ombre au sol et des repères dressés sur une tige. */
import { PLACES } from './data.js';

const RANK = { club: 0, casino: 1, hotel: 2 };
const P = (lon, lat) => [(lon - 2.9) * .69, -(lat - 46.4)];
const SVG = 'http://www.w3.org/2000/svg';

export async function mountStratMap(box, { reduceMotion }) {
  const stage = box.querySelector('.hs-stage');
  const data = await fetch('/data/france-suisse.json').then(r => r.json());
  // la Corse est retirée : aucun établissement du groupe n'y est implanté
  const fr = data.fr.filter(poly => !poly[0].every(([lo, la]) => lo > 8.3 && la < 43.2)), ch = data.ch;

  let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
  [...fr, ...ch].forEach(poly => poly[0].forEach(([lo, la]) => { const [x, y] = P(lo, la); x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); }));
  const W = x1 - x0, H = y1 - y0;
  const path = polys => polys.map(poly => poly.map(r => 'M' + r.map(([lo, la]) => { const [x, y] = P(lo, la); return (x - x0).toFixed(3) + ' ' + (y - y0).toFixed(3); }).join('L') + 'Z').join('')).join('');
  const dFR = path(fr), dCH = path(ch);

  const plate = document.createElement('div');
  plate.className = 'hs-plate';
  plate.style.aspectRatio = `${W} / ${H}`;
  const land = document.createElementNS(SVG, 'svg');
  land.setAttribute('viewBox', `0 0 ${W} ${H}`); land.setAttribute('class', 'hs-land');
  land.innerHTML = `<path class="fr" d="${dFR}"/><path class="ch" d="${dCH}"/>`;
  // ombre au sol puis tranche : copies du contour empilées sous la carte
  const layer = (cls, z) => { const l = document.createElementNS(SVG, 'svg'); l.setAttribute('viewBox', `0 0 ${W} ${H}`); l.setAttribute('class', 'hs-land ' + cls); l.style.setProperty('--z', z); l.innerHTML = `<path d="${dFR}"/><path d="${dCH}"/>`; plate.appendChild(l); };
  layer('hs-shadow', -26);
  for (let k = 14; k >= 1; k--) layer('hs-slab', -k * 1.4);
  plate.appendChild(land);
  stage.appendChild(plate);

  /* Trame de points à l'intérieur des contours */
  const dots = document.createElement('canvas');
  dots.className = 'hs-dots';
  plate.appendChild(dots);
  const shape = new Path2D(dFR + dCH);
  const drawDots = () => {
    const w = plate.clientWidth, h = plate.clientHeight, r = Math.min(devicePixelRatio, 2);
    if (!w) return;
    dots.width = w * r; dots.height = h * r;
    const x = dots.getContext('2d'), k = w / W, step = W / 78;
    x.fillStyle = 'rgba(51,95,148,.2)';
    for (let gy = step / 2; gy < H; gy += step) for (let gx = step / 2; gx < W; gx += step) {
      if (!x.isPointInPath(shape, gx, gy)) continue;
      x.beginPath(); x.arc(gx * k * r, gy * k * r, .85 * r, 0, Math.PI * 2); x.fill();
    }
  };

  /* Un repère par adresse ; plusieurs établissements à la même adresse partagent le repère et la fiche */
  const spots = new Map();
  PLACES.forEach(p => { const key = p.lon + ',' + p.lat; if (!spots.has(key)) spots.set(key, []); spots.get(key).push(p); });
  [...spots.values()].sort((a, b) => b[0].lat - a[0].lat).forEach((items, n) => {
    items.sort((a, b) => RANK[a.type] - RANK[b.type]);
    const [x, y] = P(items[0].lon, items[0].lat), types = [...new Set(items.map(p => p.type))];
    const pin = document.createElement('div');
    pin.className = 'hs-pin c-' + items[0].type + ' ' + types.map(t => 't-' + t).join(' ') + (types.includes('hotel') && types.length > 1 ? ' with-hotel' : '');
    pin.style.left = ((x - x0) / W * 100) + '%'; pin.style.top = ((y - y0) / H * 100) + '%';
    pin.style.setProperty('--d', (n * 60) + 'ms');
    pin.tabIndex = 0;
    pin.setAttribute('aria-label', items.map(p => `${p.name}, ${p.city}`).join(' ; '));
    pin.dataset.names = items.map(p => p.name).join('|');
    pin.innerHTML = '<span class="hs-foot"><span class="hs-pulse"></span></span><span class="hs-up"><i class="hs-stem"></i><b class="hs-dot"></b></span>';
    const card = document.createElement('div'); card.className = 'hs-card';
    items.forEach(p => { const row = document.createElement('div'); row.className = 'c-' + p.type; const b = document.createElement('b'); b.textContent = p.name; const s = document.createElement('span'); s.textContent = p.city; row.append(b, s); card.appendChild(row); });
    if (x - x0 > W * .62) pin.classList.add('flip');
    pin.querySelector('.hs-up').appendChild(card);
    plate.appendChild(pin);
  });

  box.querySelectorAll('.hs-legend li').forEach(li => {
    li.addEventListener('mouseenter', () => { box.dataset.filter = li.dataset.type; });
    li.addEventListener('mouseleave', () => { delete box.dataset.filter; });
  });

  // page Nos destinations : l'annuaire allume le repère survolé et filtre la carte
  const pins = [...plate.querySelectorAll('.hs-pin')];
  document.addEventListener('dest:hover', e => pins.forEach(pin => pin.classList.toggle('lit', !!e.detail && pin.dataset.names.split('|').includes(e.detail))));
  document.addEventListener('dest:filter', e => { if (e.detail === 'all') delete box.dataset.filter; else box.dataset.filter = e.detail; });

  // légère bascule qui suit le pointeur
  if (!reduceMotion) {
    box.addEventListener('pointermove', e => { const r = box.getBoundingClientRect(); plate.style.setProperty('--px', ((e.clientX - r.left) / r.width - .5).toFixed(3)); plate.style.setProperty('--py', ((e.clientY - r.top) / r.height - .5).toFixed(3)); });
    box.addEventListener('pointerleave', () => { plate.style.setProperty('--px', 0); plate.style.setProperty('--py', 0); });
  }

  new ResizeObserver(drawDots).observe(plate); drawDots();
  if (reduceMotion) box.classList.add('live');
  else new IntersectionObserver(([e], io) => { if (e.isIntersecting) { box.classList.add('live'); io.disconnect(); } }, { threshold: .25 }).observe(box);
  box.classList.add('ready');
}
