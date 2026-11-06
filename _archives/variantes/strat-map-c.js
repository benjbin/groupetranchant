/* Groupe Tranchant — carte des implantations, variante C : « La donne ».
   La France (et la Suisse) est imprimée sur le papier comme le tapis d'une table de jeu, vue depuis la place du croupier.
   À l'entrée de la section, un croupier invisible distribue 22 cartes depuis un sabot : chacune file en courbe, tourne,
   s'élève puis se pose face cachée sur son établissement, légèrement de travers, son ombre se resserrant à l'atterrissage.
   Au survol (ou au focus, ou via dest:hover) la carte se lève vers le regard et se retourne : photo, nom, ville, filet de couleur.
   Deux établissements à la même adresse forment un petit éventail ; la légende retourne les cartes du type choisi. */
import { PLACES, PHOTO, IMG } from './data.js';

const P = (lon, lat) => [(lon - 2.9) * .69, -(lat - 46.4)];
const SVG = 'http://www.w3.org/2000/svg';
const RANK = { club: 0, casino: 1, hotel: 2 };
const LABEL = { casino: 'Casino', club: 'Club de jeu', hotel: 'Hôtel' };
const CW = 150, CH = 210;            // carte « réelle » (px), réduite sur la table par --s
const REST = .046;                   // largeur d'une carte posée, en fraction de la largeur de table
const DECK = [8.75, 42.95];          // le sabot : en mer, au large de Nice (lon, lat)
const RESERVE = 5;                   // cartes qui restent dans le sabot après la donne

const CSS = `
@property --u{syntax:'<number>';inherits:true;initial-value:0}
@property --f{syntax:'<number>';inherits:true;initial-value:0}
@property --m{syntax:'<number>';inherits:true;initial-value:0}
.dn-root{position:absolute;inset:0;perspective:1300px;perspective-origin:50% -10%;--tilt:36;--s:.2;--k:1.1;--navy:#0B1B2E;--gt:#335F94;--red:#BA2637;--sun:#F9C83B;--mist:#9DB4D0;--paper:#F5F1EA}
.dn-table{position:absolute;transform-style:preserve-3d;transform-origin:50% 60%;
  transform:rotateX(calc((var(--tilt) + var(--py,0) * 3) * 1deg)) rotateZ(calc(var(--px,0) * 2deg));transition:transform 1.2s cubic-bezier(.2,.7,.2,1)}
.dn-table>*{position:absolute}
.dn-land,.dn-dots,.dn-ink{left:0;top:0;width:100%;height:100%;pointer-events:none}
.dn-land{overflow:visible;transform:translateZ(-1px)}
.dn-land .fr{fill:rgba(255,255,255,.55);stroke:rgba(11,27,46,.55);stroke-width:1.1;vector-effect:non-scaling-stroke;stroke-linejoin:round}
.dn-land .ch{fill:rgba(157,180,208,.16);stroke:rgba(11,27,46,.4);stroke-width:1;vector-effect:non-scaling-stroke;stroke-linejoin:round}
.dn-land .fr,.dn-land .ch{stroke-dasharray:1;stroke-dashoffset:1;opacity:0}
.dn-land .rail{fill:none;stroke:rgba(11,27,46,.16);stroke-width:1;vector-effect:non-scaling-stroke}
.dn-land text{font-family:var(--display);font-weight:600;letter-spacing:.5em;fill:rgba(11,27,46,.45);font-stretch:115%}
.dn-land .fr,.dn-land .ch{fill-opacity:0;transition:fill-opacity 1.6s ease .6s}
.hstrat-map.live .dn-land .fr,.hstrat-map.live .dn-land .ch{fill-opacity:1}
.hstrat-map.live .dn-land .fr,.hstrat-map.live .dn-land .ch{opacity:1;animation:dn-draw 2.4s cubic-bezier(.6,0,.2,1) forwards}
.dn-land .rail,.dn-land text{opacity:0;transition:opacity 1.4s ease 1.2s}
.hstrat-map.live .dn-land .rail,.hstrat-map.live .dn-land text{opacity:1}
@keyframes dn-draw{to{stroke-dashoffset:0}}
.dn-dots{transform:translateZ(-.8px);opacity:0;transition:opacity 1.8s ease .5s}
.hstrat-map.live .dn-dots{opacity:1}
.dn-ink{overflow:visible;transform:translateZ(-.6px)}
.dn-ink line{stroke:rgba(11,27,46,.35);stroke-width:1;stroke-dasharray:2 2.5;vector-effect:non-scaling-stroke;opacity:0;transition:opacity .6s}
.dn-ink circle{fill:var(--paper);stroke-width:1.4;vector-effect:non-scaling-stroke;opacity:0;transition:opacity .6s}
.dn-ink .on{opacity:1}
.dn-ink .t-casino{stroke:var(--gt)}.dn-ink .t-club{stroke:var(--red)}.dn-ink .t-hotel{stroke:#E0A900}

.dn-spot{width:0;height:0;transform-style:preserve-3d;outline:none;--u:0;--f:0;
  transition:--u .62s cubic-bezier(.2,.8,.2,1),--f .8s cubic-bezier(.45,0,.15,1) .06s}
.dn-spot.up{--u:1;--f:1;z-index:5}
.dn-spot.peek{--f:1}
.dn-spot.up,.dn-spot:not(.up){}
.dn-card{position:absolute;left:0;top:0;width:0;height:0;transform-style:preserve-3d;--m:0;transition:opacity .7s ease,--m .7s cubic-bezier(.2,.8,.2,1)}
.dn-card.wait{visibility:hidden}
.dn-air{position:absolute;transform-style:preserve-3d}
.dn-lift,.dn-sh{position:absolute;left:${-CW / 2}px;top:${-CH / 2}px;width:${CW}px;height:${CH}px}
.dn-lift{transform-style:preserve-3d;cursor:pointer;
  transform:translate3d(calc(var(--u) * var(--lx) * 1px),calc(var(--u) * var(--ly) * 1px),calc(var(--u) * var(--lz) * 1px + var(--zi) * 1px))
    rotateZ(calc((1 - var(--u)) * var(--rot) * 1deg)) rotateX(calc(var(--u) * var(--tilt) * -1deg))
    translateX(calc((1 - var(--u)) * var(--fx) * 1px + var(--u) * var(--off) * (var(--k) * ${CW}px + 14px)))
    scale(calc(var(--s) * (1 + var(--m) * var(--mg,1) * (1 - var(--u))) + var(--u) * (var(--k) - var(--s))))}
.dn-shw{position:absolute;pointer-events:none}
.dn-sh{border-radius:10px;background:var(--navy);pointer-events:none;
  opacity:calc(.3 - var(--u) * .16);filter:blur(calc(1.2px + var(--u) * 14px));
  transform:translate3d(calc(var(--u) * (var(--lx) + 10) * 1px),calc(var(--u) * (var(--ly) + 26) * 1px),calc(var(--zi) * 1px - .3px))
    rotateZ(calc((1 - var(--u)) * var(--rot) * 1deg))
    translateX(calc((1 - var(--u)) * var(--fx) * 1px + var(--u) * var(--off) * (var(--k) * ${CW}px + 14px)))
    translate(calc(var(--s) * 4px),calc(var(--s) * 7px))
    scale(calc(var(--s) + var(--u) * (var(--k) - var(--s)) * .95),calc(var(--s) + var(--u) * (var(--k) * .42 - var(--s))))}
.dn-flip{position:absolute;inset:0;transform-style:preserve-3d;transform:rotateY(calc(var(--f) * 180deg))}
.dn-back,.dn-face{position:absolute;inset:0;border-radius:10px;backface-visibility:hidden;-webkit-backface-visibility:hidden;overflow:hidden}
.dn-back{background:#FFFDF9;box-shadow:inset 0 0 0 1px rgba(11,27,46,.16)}
.dn-back::before{content:"";position:absolute;inset:8px;border-radius:5px;background-color:var(--navy);
  background-image:
    radial-gradient(circle at 50% 50%,var(--navy) 0 38px,transparent 38.5px),
    repeating-linear-gradient(45deg,transparent 0 7px,rgba(157,180,208,.26) 7px 8px),
    repeating-linear-gradient(-45deg,transparent 0 7px,rgba(157,180,208,.26) 7px 8px)}
.dn-back::after{content:"";position:absolute;inset:13px;border-radius:3px;border:1px solid rgba(249,200,59,.55)}
.dn-back svg{position:absolute;left:50%;top:50%;width:66px;height:40px;margin:-20px 0 0 -33px;z-index:1}
.dn-back i{position:absolute;left:50%;top:50%;width:84px;height:84px;margin:-42px;border-radius:50%;border:1px solid rgba(157,180,208,.55);z-index:1}
.dn-back i::after{content:"";position:absolute;inset:5px;border-radius:50%;border:1px solid rgba(157,180,208,.25)}
.dn-face{transform:rotateY(180deg);background:#FFFDF9;box-shadow:inset 0 0 0 1px rgba(11,27,46,.1);display:flex;flex-direction:column;color:var(--navy)}
.dn-face img{display:block;margin:8px 8px 0;width:calc(100% - 16px);height:112px;object-fit:cover;border-radius:5px;background:#E6E1D8}
.dn-face .rule{height:3px;margin:9px 8px 0;border-radius:2px;background:var(--c)}
.dn-face .meta{display:flex;justify-content:space-between;align-items:center;margin:8px 10px 0;font-family:var(--sans);font-size:7.5px;font-weight:800;letter-spacing:.2em;text-transform:uppercase;color:rgba(11,27,46,.55)}
.dn-face .meta b{font-family:var(--display);font-stretch:115%;font-size:9px;letter-spacing:.06em;color:var(--navy)}
.dn-face h4{margin:5px 10px 0;font-family:var(--display);font-stretch:112%;font-weight:600;font-size:13.5px;line-height:1.08;letter-spacing:-.015em;text-wrap:balance}
.dn-face p{margin:3px 10px 0;font-family:var(--sans);font-size:9.5px;font-weight:600;color:rgba(11,27,46,.6)}
.dn-casino{--c:var(--gt)}.dn-club{--c:var(--red)}.dn-hotel{--c:var(--sun)}

.dn-deck{width:0;height:0;transform-style:preserve-3d;cursor:pointer}
.dn-deck .dk{position:absolute;left:${-CW / 2}px;top:${-CH / 2}px;width:${CW}px;height:${CH}px;border-radius:10px;
  background:#FBFAF6;box-shadow:inset 0 0 0 1.5px rgba(11,27,46,.28);
  transform:translateZ(calc(var(--i) * .32px)) rotateZ(calc(var(--j) * 1deg)) scale(var(--s));transition:opacity .25s}
.dn-deck .dk.dn-back{background:#FFFDF9}
.dn-deck .dk.gone{opacity:0}
.dn-deck .dsh{position:absolute;left:${-CW / 2}px;top:${-CH / 2}px;width:${CW}px;height:${CH}px;border-radius:10px;background:var(--navy);
  opacity:.32;filter:blur(3px);transform:translate(calc(var(--s) * 9px),calc(var(--s) * 16px)) scale(calc(var(--s) * 1.04))}
.dn-count{pointer-events:none;transform:translate(-100%,-50%) translateZ(.5px);text-align:right;white-space:nowrap;opacity:0;transition:opacity 1s ease 1s;padding-right:calc(var(--s) * 120px)}
.hstrat-map.live .dn-count{opacity:1}
.dn-count b{display:block;font-family:var(--display);font-stretch:115%;font-weight:600;font-size:calc(var(--s) * 150px);line-height:.9;letter-spacing:-.04em;color:var(--navy);font-variant-numeric:tabular-nums}
.dn-count span{display:block;margin-top:.5em;font-family:var(--sans);font-size:calc(var(--s) * 44px);font-weight:800;letter-spacing:.22em;text-transform:uppercase;color:rgba(11,27,46,.5)}

/* filtres : les cartes du type choisi se retournent sur la table, les autres s'effacent */
.hstrat-map[data-filter] .dn-card{opacity:.06}
.hstrat-map[data-filter=casino] .dn-card.dn-casino,.hstrat-map[data-filter=club] .dn-card.dn-club,.hstrat-map[data-filter=hotel] .dn-card.dn-hotel{opacity:1;--m:1}
.hstrat-map[data-filter=casino] .dn-card.dn-casino .dn-flip,.hstrat-map[data-filter=club] .dn-card.dn-club .dn-flip,.hstrat-map[data-filter=hotel] .dn-card.dn-hotel .dn-flip{transform:rotateY(calc(max(var(--f), var(--m)) * 180deg))}
.hstrat-map[data-filter=casino]{--mg:.3}
.hstrat-map[data-filter] .dn-ink circle{opacity:.35}
.hstrat-map[data-filter] .dn-spot.up .dn-card{opacity:1}
.hs-legend li{cursor:pointer}
.hs-legend li.on{border-color:var(--navy,#0B1B2E);color:#0B1B2E}
.dn-rm .dn-spot{transition:none}
`;

export async function mountStratMap(box, { reduceMotion }) {
  const stage = box.querySelector('.hs-stage');
  stage.removeAttribute('aria-hidden');
  if (!document.getElementById('dn-style')) { const st = document.createElement('style'); st.id = 'dn-style'; st.textContent = CSS; document.head.appendChild(st); }
  const data = await fetch('/data/france-suisse.json').then(r => r.json());
  // la Corse est retirée : aucun établissement du groupe n'y est implanté
  const fr = data.fr.filter(poly => !poly[0].every(([lo, la]) => lo > 8.3 && la < 43.2)), ch = data.ch;

  let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
  [...fr, ...ch].forEach(poly => poly[0].forEach(([lo, la]) => { const [x, y] = P(lo, la); x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); }));
  const W = x1 - x0, H = y1 - y0;
  // la table : un peu plus large que la carte, pour le sabot et le filet imprimé
  const M = { l: .03 * W, r: .03 * W, t: .03 * H, b: .1 * H };
  const TW = W + M.l + M.r, TH = H + M.t + M.b;
  const tx = (lon, lat) => { const [x, y] = P(lon, lat); return [x - x0 + M.l, y - y0 + M.t]; };
  const path = polys => polys.map(poly => poly.map(r => 'M' + r.map(([lo, la]) => tx(lo, la).map(v => v.toFixed(3)).join(' ')).join('L') + 'Z').join('')).join('');
  const dFR = path(fr), dCH = path(ch);

  const root = document.createElement('div'); root.className = 'dn-root' + (reduceMotion ? ' dn-rm' : '');
  const table = document.createElement('div'); table.className = 'dn-table';
  root.appendChild(table); stage.appendChild(root);

  const land = document.createElementNS(SVG, 'svg');
  land.setAttribute('viewBox', `0 0 ${TW} ${TH}`); land.setAttribute('class', 'dn-land'); land.setAttribute('preserveAspectRatio', 'none');
  // filet de table imprimé : un arc côté croupier, comme sur un tapis de baccara
  const ax0 = TW * .06, ax1 = TW * .94, ay = TH * .965, sag = TH * .07;
  land.innerHTML = `<path class="ch" pathLength="1" d="${dCH}"/><path class="fr" pathLength="1" d="${dFR}"/>`
    + `<path class="rail" pathLength="1" id="dn-arc" d="M${ax0} ${ay - sag} Q${TW / 2} ${ay + sag} ${ax1} ${ay - sag}"/>`
    + `<path class="rail" pathLength="1" d="M${ax0} ${ay - sag + TH * .045} Q${TW / 2} ${ay + sag + TH * .045} ${ax1} ${ay - sag + TH * .045}"/>`
    + `<text font-size="${(TH * .0135).toFixed(3)}" text-anchor="middle"><textPath href="#dn-arc" startOffset="50%" dy="0">`
    + `<tspan dy="${(TH * .03).toFixed(3)}">GROUPE TRANCHANT  ·  DEPUIS 1988</tspan></textPath></text>`;
  table.appendChild(land);

  const dots = document.createElement('canvas'); dots.className = 'dn-dots'; table.appendChild(dots);
  const shape = new Path2D(dFR), shapeCH = new Path2D(dCH);
  const drawDots = () => {
    const w = table.clientWidth, h = table.clientHeight, r = Math.min(devicePixelRatio, 2);
    if (!w) return;
    dots.width = w * r; dots.height = h * r;
    const c = dots.getContext('2d'), k = w / TW, step = W / 74;
    for (let gy = step / 2; gy < TH; gy += step) for (let gx = step / 2; gx < TW; gx += step) {
      const inFR = c.isPointInPath(shape, gx, gy), inCH = !inFR && c.isPointInPath(shapeCH, gx, gy);
      if (!inFR && !inCH) continue;
      c.fillStyle = inFR ? 'rgba(51,95,148,.22)' : 'rgba(51,95,148,.13)';
      c.beginPath(); c.arc(gx * k * r, gy * k * r, .8 * r, 0, Math.PI * 2); c.fill();
    }
  };

  /* Adresses : un paquet par adresse (1 ou 2 cartes en éventail) */
  const spots = new Map();
  PLACES.forEach(p => { const key = p.lon + ',' + p.lat; if (!spots.has(key)) spots.set(key, []); spots.get(key).push(p); });
  const S = [...spots.values()].map(items => {
    items.sort((a, b) => RANK[a.type] - RANK[b.type]);
    const [ax, ay2] = tx(items[0].lon, items[0].lat);
    return { items, ax: ax / TW, ay: ay2 / TH, x: ax / TW, y: ay2 / TH };
  });
  // densité : écarte légèrement les paquets qui se recouvrent trop (Pyrénées, littoral languedocien, Normandie)
  {
    const asp = TH / TW, cw = REST, chh = REST * CH / CW / asp;
    for (let it = 0; it < 220; it++) {
      for (let i = 0; i < S.length; i++) for (let j = i + 1; j < S.length; j++) {
        const a = S[i], b = S[j];
        const wa = cw * (a.items.length > 1 ? 1.45 : 1), wb = cw * (b.items.length > 1 ? 1.45 : 1);
        const minX = (wa + wb) / 2 * .9, minY = chh * .78;
        const dx = b.x - a.x, dy = b.y - a.y;
        const ox = minX - Math.abs(dx), oy = minY - Math.abs(dy);
        if (ox > 0 && oy > 0) {
          if (ox / minX < oy / minY) { const m = ox / 2 * .5 * Math.sign(dx || 1); a.x -= m; b.x += m; }
          else { const m = oy / 2 * .5 * Math.sign(dy || 1); a.y -= m; b.y += m; }
        }
      }
      S.forEach(s => { s.x += (s.ax - s.x) * .02; s.y += (s.ay - s.y) * .02; });
    }
  }

  const ink = document.createElementNS(SVG, 'svg');
  ink.setAttribute('viewBox', `0 0 ${TW} ${TH}`); ink.setAttribute('class', 'dn-ink'); ink.setAttribute('preserveAspectRatio', 'none');
  table.appendChild(ink);

  // graine déterministe : chaque carte garde son « travers » d'une visite à l'autre
  let seed = 7; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const cards = [];
  let order = 0;
  const spotEls = S.map((s, si) => {
    const el = document.createElement('div');
    const types = [...new Set(s.items.map(p => p.type))];
    el.className = 'dn-spot ' + types.map(t => 't-' + t).join(' ');
    el.style.left = s.x * 100 + '%'; el.style.top = s.y * 100 + '%';
    el.tabIndex = 0;
    el.setAttribute('role', 'button');
    el.setAttribute('aria-label', s.items.map(p => `${p.name}, ${p.city} (${LABEL[p.type].toLowerCase()})`).join(' ; '));
    el.dataset.names = s.items.map(p => p.name).join('|');
    const skew = (rnd() - .5) * 18;
    s.items.forEach((p, i) => {
      const n = s.items.length, c = n > 1 ? i - (n - 1) / 2 : 0;
      const card = document.createElement('div');
      card.className = 'dn-card wait dn-' + p.type;
      card.style.setProperty('--rot', (skew + c * 16).toFixed(2));
      card.style.setProperty('--fx', (c * 0).toFixed(2));
      card.style.setProperty('--off', c);
      card.style.setProperty('--zi', (.2 + si * .05 + i * .4).toFixed(2));
      const num = String(PLACES.indexOf(p) + 1).padStart(2, '0');
      card.innerHTML = `<div class="dn-shw"><div class="dn-sh"></div></div><div class="dn-air"><div class="dn-lift"><div class="dn-flip">`
        + `<div class="dn-back"><i></i><svg viewBox="0 0 66 40"><use href="#gt"/></svg></div>`
        + `<div class="dn-face"><img alt="" loading="eager" decoding="async"><div class="rule"></div><div class="meta"><span>${LABEL[p.type]}</span><b>${num}</b></div><h4></h4><p></p></div>`
        + `</div></div></div>`;
      const img = card.querySelector('img'); if (PHOTO[p.name]) img.src = IMG + PHOTO[p.name];
      card.querySelector('h4').textContent = p.name; card.querySelector('p').textContent = p.city;
      el.appendChild(card);
      cards.push({ el: card, spot: s, spotEl: el, place: p, fan: c, idx: order++ });
    });
    table.appendChild(el);
    // repère exact et fil quand le paquet a dû s'écarter
    const moved = Math.hypot((s.x - s.ax) * TW, (s.y - s.ay) * TH) > W * .006;
    const g = document.createElementNS(SVG, 'g');
    g.innerHTML = (moved ? `<line x1="${s.ax * TW}" y1="${s.ay * TH}" x2="${s.x * TW}" y2="${s.y * TH}"/>` : '') + `<circle class="t-${types[0]}" cx="${s.ax * TW}" cy="${s.ay * TH}" r="${W * .0055}"/>`;
    ink.appendChild(g); s.ink = g;
    return el;
  });

  /* Le sabot */
  const [dkx, dky] = tx(...DECK);
  const deck = document.createElement('div'); deck.className = 'dn-deck';
  deck.style.left = dkx / TW * 100 + '%'; deck.style.top = dky / TH * 100 + '%';
  deck.setAttribute('role', 'button'); deck.tabIndex = 0; deck.setAttribute('aria-label', 'Redistribuer les cartes');
  const total = cards.length + RESERVE;
  deck.innerHTML = '<div class="dsh"></div>' + Array.from({ length: total }, (_, i) => `<div class="dk dn-back" style="--i:${i};--j:${((rnd() - .5) * 2.4).toFixed(2)}"><i></i><svg viewBox="0 0 66 40"><use href="#gt"/></svg></div>`).join('');
  table.appendChild(deck);
  const layers = [...deck.querySelectorAll('.dk')];
  const count = document.createElement('div'); count.className = 'dn-count';
  count.style.left = (dkx / TW * 100) + '%'; count.style.top = (dky / TH * 100) + '%';
  count.innerHTML = '<b>00</b><span>établissements</span>';
  table.appendChild(count);
  const countB = count.querySelector('b');

  /* Mise à l'échelle */
  let tw = 0, th = 0;
  const layout = () => {
    const sw = stage.clientWidth, sh = stage.clientHeight;
    if (!sw || !sh) return;
    const tilt = sw < 600 ? 38 : 47;
    const cos = Math.cos(tilt * Math.PI / 180);
    tw = Math.min(sw * 1.06, sh * .95 / (cos * TH / TW)); th = tw * TH / TW;
    table.style.width = tw + 'px'; table.style.height = th + 'px';
    table.style.left = (sw - tw) / 2 + 'px'; table.style.top = (sh - th) / 2 + 'px';
    // ajustement sur l'emprise réelle en perspective : la table tient dans la scène et y est centrée
    const st = stage.getBoundingClientRect(), saved = table.style.transition;
    table.style.transition = 'none';
    let r = table.getBoundingClientRect();
    if (r.height > sh * .98) { tw *= sh * .98 / r.height; th = tw * TH / TW; table.style.width = tw + 'px'; table.style.height = th + 'px'; table.style.left = (sw - tw) / 2 + 'px'; table.style.top = (sh - th) / 2 + 'px'; r = table.getBoundingClientRect(); }
    table.style.top = (sh - th) / 2 + (st.top + sh / 2) - (r.top + r.height / 2) + 'px';
    table.offsetWidth; table.style.transition = saved;
    const s = tw * REST / CW, face = Math.max(sw < 600 ? 128 : 150, Math.min(180, tw * .25)), k = face / CW;
    root.style.setProperty('--tilt', tilt); root.style.setProperty('--s', s.toFixed(4)); root.style.setProperty('--k', k.toFixed(3));
    // carte levée : elle reste dans le cadre et ne bute ni sur les bords ni sur le haut de la table
    spotEls.forEach((el, i) => {
      const sp = S[i], n = sp.items.length, half = (k * CW * n + 14 * (n - 1)) / 2 + 10;
      const px = sp.x * tw, py = sp.y * th;
      const lx = Math.max(half, Math.min(tw - half, px)) - px;
      const lz = k * CH * .5 + 14;
      const ly = Math.max(0, th * .3 - py) * .55 + 12;
      el.style.setProperty('--lx', lx.toFixed(1)); el.style.setProperty('--ly', ly.toFixed(1)); el.style.setProperty('--lz', lz.toFixed(1));
    });
    cards.forEach(c => c.el.style.setProperty('--fx', (c.fan * CW * s * .55).toFixed(2)));
    drawDots();
  };
  new ResizeObserver(layout).observe(stage); layout();

  /* Survol, focus, annuaire */
  let lockedUp = null;
  const setUp = (el, on) => el.classList.toggle('up', on);
  spotEls.forEach(el => {
    el.addEventListener('pointerenter', () => { if (el.dataset.dealt) setUp(el, true); });
    el.addEventListener('pointerleave', () => { if (el !== lockedUp) setUp(el, false); });
    el.addEventListener('focus', () => setUp(el, true));
    el.addEventListener('blur', () => setUp(el, false));
    el.addEventListener('click', () => { lockedUp = lockedUp === el ? null : el; spotEls.forEach(o => o !== el && setUp(o, false)); setUp(el, true); });
  });
  document.addEventListener('dest:hover', e => spotEls.forEach(el => setUp(el, !!e.detail && el.dataset.names.split('|').includes(e.detail))));

  /* Légende : survol = aperçu, clic = filtre posé */
  let locked = null;
  const lis = [...box.querySelectorAll('.hs-legend li')];
  const applyFilter = f => { if (f && f !== 'all') box.dataset.filter = f; else delete box.dataset.filter; };
  lis.forEach(li => {
    li.tabIndex = 0; li.setAttribute('role', 'button');
    li.addEventListener('mouseenter', () => applyFilter(li.dataset.type));
    li.addEventListener('mouseleave', () => applyFilter(locked));
    const toggle = () => { locked = locked === li.dataset.type ? null : li.dataset.type; lis.forEach(o => { o.classList.toggle('on', o.dataset.type === locked); o.setAttribute('aria-pressed', o.dataset.type === locked); }); applyFilter(locked); };
    li.addEventListener('click', toggle);
    li.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggle(); } });
  });
  document.addEventListener('dest:filter', e => { locked = e.detail === 'all' ? null : e.detail; applyFilter(locked); });

  /* Légère bascule de la table avec le pointeur */
  if (!reduceMotion) {
    box.addEventListener('pointermove', e => { const r = box.getBoundingClientRect(); root.style.setProperty('--px', ((e.clientX - r.left) / r.width - .5).toFixed(3)); root.style.setProperty('--py', ((e.clientY - r.top) / r.height - .5).toFixed(3)); });
    box.addEventListener('pointerleave', () => { root.style.setProperty('--px', 0); root.style.setProperty('--py', 0); });
  }

  /* La donne */
  const ease = t => 1 - Math.pow(1 - t, 3);
  const flight = c => {
    // départ du sabot, trajectoire courbe, rotation qui se résorbe, arc en hauteur puis glissé sur le tapis
    const ex = c.spot.x * tw, ey = c.spot.y * th;
    const sx = dkx / TW * tw - ex, sy = dky / TH * th - ey;
    const dist = Math.hypot(sx, sy);
    const nx = -sy / (dist || 1), ny = sx / (dist || 1);
    const bow = dist * .16 * (ny < 0 ? 1 : -1);          // la courbe s'infléchit vers le fond de la table
    const cx = sx / 2 + nx * bow, cy = sy / 2 + ny * bow;
    const spin = -150 - dist / tw * 140;
    const peak = 26 + dist / tw * 70;
    const N = 18, kc = [], ka = [], ks = [];
    for (let i = 0; i <= N; i++) {
      const t = i / N, p = ease(t), q = 1 - p;
      const x = q * q * sx + 2 * q * p * cx, y = q * q * sy + 2 * q * p * cy;
      const land = Math.min(1, p / .86);
      const z = peak * Math.sin(Math.PI * land) * (1 - land * .25) + (p < .02 ? 4 : 0);
      const r = spin * Math.pow(q, 1.6);
      kc.push({ transform: `translate(${x.toFixed(2)}px,${y.toFixed(2)}px) rotate(${r.toFixed(2)}deg)`, offset: t });
      ka.push({ transform: `translateZ(${z.toFixed(2)}px) rotateX(${(z * .25).toFixed(2)}deg)`, offset: t });
      ks.push({ transform: `translate(${(z * .45).toFixed(2)}px,${(z * .8).toFixed(2)}px) scale(${(1 + z * .006).toFixed(3)})`, opacity: (1 - z / (peak * 1.6)).toFixed(3), filter: `blur(${(z * .14).toFixed(2)}px)`, offset: t });
    }
    return { kc, ka, ks, dur: 760 + dist / tw * 420 };
  };
  const dealOrder = () => [...cards].sort((a, b) => {
    // le croupier distribue en balayant la table, de la gauche vers la droite, depuis le sabot
    const ang = c => Math.atan2(c.spot.y * th - dky / TH * th, c.spot.x * tw - dkx / TW * tw);
    return ang(a) - ang(b);
  }).reverse();
  let dealing = false, landed = 0;
  const finish = c => { c.spotEl.dataset.dealt = 1; landed++; countB.textContent = String(landed).padStart(2, '0'); c.spot.ink.querySelectorAll('*').forEach(n => n.classList.add('on')); };
  const deal = (delay = 0) => {
    if (dealing) return; dealing = true; landed = 0;
    const seq = dealOrder();
    seq.forEach((c, i) => setTimeout(() => {
      const f = flight(c);
      layers[total - 1 - i]?.classList.add('gone');
      c.el.classList.remove('wait');
      c.el.animate(f.kc, { duration: f.dur, easing: 'linear' });
      c.el.querySelector('.dn-air').animate(f.ka, { duration: f.dur, easing: 'linear' });
      c.el.querySelector('.dn-shw').animate(f.ks, { duration: f.dur, easing: 'linear' });
      setTimeout(() => { finish(c); if (i === seq.length - 1) { dealing = false; restack(); peek(); } }, f.dur);
    }, delay + i * 115));
  };
  // une fois la donne faite, le croupier retourne les cartes d'un geste, de l'ouest à l'est, puis les recouvre
  const peek = () => [...spotEls].sort((a, b) => parseFloat(a.style.left) - parseFloat(b.style.left)).forEach((el, i) => {
    setTimeout(() => el.classList.add('peek'), 250 + i * 55);
    setTimeout(() => el.classList.remove('peek'), 2300 + i * 55);
  });
  // le sabot garde ses cartes de réserve, la dernière montre le dos
  const restack = () => layers.forEach((l, j) => l.classList.toggle('gone', j >= RESERVE));
  const gather = () => {
    if (dealing) return; dealing = true;
    spotEls.forEach(el => { setUp(el, false); el.classList.remove('peek'); delete el.dataset.dealt; });
    S.forEach(s => s.ink.querySelectorAll('*').forEach(n => n.classList.remove('on')));
    const seq = dealOrder().reverse();
   
    seq.forEach((c, i) => setTimeout(() => {
      const f = flight(c), d = f.dur * .55;
      c.el.animate(f.kc, { duration: d, direction: 'reverse', easing: 'ease-in', fill: 'forwards' });
      c.el.querySelector('.dn-air').animate(f.ka, { duration: d, direction: 'reverse', easing: 'ease-in', fill: 'forwards' });
      c.el.querySelector('.dn-shw').animate(f.ks, { duration: d, direction: 'reverse', easing: 'ease-in', fill: 'forwards' }).onfinish = () => {
        c.el.classList.add('wait'); c.el.getAnimations({ subtree: true }).forEach(a => a.cancel());
        layers[RESERVE + i]?.classList.remove('gone'); countB.textContent = String(seq.length - 1 - i).padStart(2, '0');
        if (i === seq.length - 1) { layers.forEach(l => l.classList.remove('gone')); countB.textContent = '00'; dealing = false; deal(350); }
      };
    }, i * 45));
  };
  const redeal = () => { if (!reduceMotion && box.classList.contains('live')) gather(); };
  deck.addEventListener('click', redeal);
  deck.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); redeal(); } });

  if (reduceMotion) {
    cards.forEach(c => { c.el.classList.remove('wait'); finish(c); });
    restack(); box.classList.add('live');
  } else {
    // le sabot arrive sur la table, puis la donne commence
    deck.style.opacity = 0;
    let started = false;
    const start = () => {
      if (started) return; started = true;
      io.disconnect(); clearInterval(poll); box.classList.add('live');
      deck.style.opacity = '';
      deck.animate([{ transform: 'translate3d(30px,60px,140px) rotateZ(-14deg)', opacity: 0 }, { transform: 'none', opacity: 1 }], { duration: 900, delay: 500, easing: 'cubic-bezier(.2,.8,.2,1)', fill: 'backwards' });
      deal(1500);
    };
    const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) start(); }, { threshold: .25 });
    io.observe(box);
    // filet de sécurité si l'observateur tarde (défilement piloté par script)
    const poll = setInterval(() => { const r = box.getBoundingClientRect(); if (r.top < innerHeight - r.height * .25 && r.bottom > r.height * .25) start(); }, 400);
  }
  box.classList.add('ready');
}
