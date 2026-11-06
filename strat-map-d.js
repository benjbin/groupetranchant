/* Groupe Tranchant — carte des implantations, variante D : « Le réseau ».
   Une France gravée (hachures fines, lignes d'eau autour des côtes à la manière des cartes anciennes) sur le papier.
   Paris, siège du groupe, est l'origine : à l'entrée de la section, des arcs tendus partent l'un après l'autre
   vers chaque établissement, du plus proche au plus lointain, portés par une comète. À l'arrivée, le repère s'allume
   (casino : disque bleu GT, club : disque rouge, hôtel : anneau jaune soleil) et le compteur monte.
   Au survol : l'arc se met en avant, les autres s'estompent, une vignette photo s'ouvre. Filtre par la légende.
   Tout est dessiné en SVG au pixel près (la mise en page est recalculée à chaque redimensionnement). */
import { PLACES, PHOTO, IMG } from './data.js';

const RANK = { club: 0, casino: 1, hotel: 2 };
const P = (lon, lat) => [(lon - 2.9) * .69, -(lat - 46.4)];
const SVG = 'http://www.w3.org/2000/svg';
const C = { paper: '#FBF9F5', land: '#F5F1EA', navy: '#0B1B2E', blue: '#335F94', red: '#BA2637', sun: '#F9C83B', mist: '#9DB4D0' };

/* Étiquettes : décalages en px (échelle de référence 61 px par degré de latitude).
   l = [dx, dy] du coude du trait de rappel (vertical) ; t = position du texte ; a = ancrage. */
const LB = {
  'Paris': { t: [-12, -11], a: 'end' },
  'Dunkerque': { t: [10, 3.5] },
  'Roscoff': { t: [0, -12], a: 'middle' },
  'Yport': { l: [0, -15] },
  'Villers-sur-Mer': { l: [0, -54] },
  'Luc-sur-Mer': { l: [0, -68] },
  'Amnéville': { t: [10, 3.5] },
  'Bâle': { t: [11, 3.5] },
  'Prilly': { t: [10, 3.5] },
  'Saint-Gervais': { t: [10, 3.5] },
  'Cagnes-sur-Mer': { t: [10, 3.5] },
  'Le-Grau-du-Roi': { l: [0, 34] },
  'Sète': { l: [0, 39] },
  'Valras-Plage': { l: [0, 44] },
  'Pau': { l: [0, 36, 'l'] },
  'Argelès-Gazost': { l: [0, 32, 'l'] },
  'Bagnères-de-Bigorre': { l: [0, 50, 'l'] },
  'Pougues-les-Eaux': { t: [10, 3.5] },
  'Néris-les-Bains': { t: [-10, 3.5], a: 'end' }
};

/* courbure des arcs : les grappes d'établissements voisins s'ouvrent en éventail au lieu de se confondre */
const BOW = { 'Pau': .14, 'Argelès-Gazost': .21, 'Bagnères-de-Bigorre': .28, 'Valras-Plage': .13, 'Sète': .2, 'Le-Grau-du-Roi': .27,
  'Luc-sur-Mer': .18, 'Villers-sur-Mer': .26, 'Yport': .34, 'Saint-Gervais': .14, 'Prilly': .21, 'Bâle': .24 };

const CSS = `
.rz-wrap{position:absolute;inset:0}
@media (prefers-reduced-motion:reduce){.rz-wrap *{transition:none!important;animation:none!important}}
@media (max-width:600px){.hstrat-map.rz-on .hs-stage{inset:18px 14px 68px}}
.rz-svg{position:absolute;inset:0;width:100%;height:100%;overflow:visible}
.rz-land{opacity:0;transition:opacity 1.6s cubic-bezier(.2,.7,.2,1)}
.hstrat-map.ready .rz-land{opacity:1}
.rz-grat{opacity:0;transition:opacity 2s ease .3s}
.hstrat-map.live .rz-grat{opacity:1}
.rz-arc,.rz-mk,.rz-lb,.rz-tail,.rz-head{transition:opacity .6s cubic-bezier(.2,.7,.2,1)}
.rz-arc path{fill:none;stroke-linecap:round}
.rz-arc .rz-line{stroke-width:1}
.rz-mk{cursor:pointer;outline:none}
.rz-mk .rz-core{transform-box:fill-box;transform-origin:center;transform:scale(0);transition:transform .7s cubic-bezier(.3,1.7,.45,1)}
.rz-mk.lit .rz-core{transform:scale(1)}
.rz-mk .rz-ripple{transform-box:fill-box;transform-origin:center;opacity:0;fill:none}
.rz-mk.lit .rz-ripple{animation:rz-ripple 1.3s cubic-bezier(.1,.6,.3,1) 1}
.rz-mk.ping .rz-ripple{animation:rz-ripple2 1.6s cubic-bezier(.1,.6,.3,1) 1}
@keyframes rz-ripple{0%{opacity:.9;transform:scale(.4)}100%{opacity:0;transform:scale(3.4)}}
@keyframes rz-ripple2{0%{opacity:.6;transform:scale(.6)}100%{opacity:0;transform:scale(2.8)}}
.rz-hub .rz-orbit{transform-box:fill-box;transform-origin:center;animation:rz-spin 60s linear infinite}
.rz-hub .rz-sonar{transform-box:fill-box;transform-origin:center;fill:none;opacity:0}
.hstrat-map.live .rz-hub .rz-sonar{animation:rz-sonar 3.6s cubic-bezier(.1,.6,.3,1) infinite}
.hstrat-map.live .rz-hub .rz-sonar+.rz-sonar{animation-delay:1.8s}
@keyframes rz-sonar{0%{opacity:.5;transform:scale(.5)}100%{opacity:0;transform:scale(3)}}
@keyframes rz-spin{to{transform:rotate(360deg)}}
.rz-lb{opacity:0}
.rz-lb.lit{opacity:1}
.rz-lb text{font-family:var(--sans);font-size:var(--rz-fs,9.5px);font-weight:700;letter-spacing:.17em;text-transform:uppercase;fill:rgba(11,27,46,.74);paint-order:stroke;stroke:${C.paper};stroke-width:3.2px;stroke-linejoin:round}
.rz-lb.hub text{font-family:var(--display);font-stretch:115%;font-size:calc(var(--rz-fs,9.5px) + 2.5px);font-weight:700;letter-spacing:.2em;fill:${C.navy}}
.rz-lb path{fill:none;stroke:rgba(11,27,46,.42);stroke-width:.75}
.rz-lb .rz-lead{stroke-dasharray:var(--len);stroke-dashoffset:var(--len);transition:stroke-dashoffset .7s cubic-bezier(.2,.7,.2,1)}
.rz-lb.lit .rz-lead{stroke-dashoffset:0}
.rz-lb text{transition:opacity .8s ease .25s,letter-spacing 1.1s cubic-bezier(.2,.7,.2,1) .2s}
.rz-lb:not(.lit) text{opacity:0;letter-spacing:.4em}
.rz-small .rz-lb:not(.hub):not(.on){opacity:0!important}
/* mise en avant */
.rz-focus .rz-arc:not(.on){opacity:.1}
.rz-focus .rz-mk:not(.on):not(.rz-hub){opacity:.3}
.rz-focus .rz-lb:not(.on):not(.hub){opacity:.22}
.rz-arc.on .rz-line{stroke-width:1.7;stroke:${C.blue}}
.rz-lb.on text{fill:${C.navy}}
.rz-mk.on .rz-core{transform:scale(1.22)}
/* filtres (légende) */
.hstrat-map[data-filter="casino"] .rz-f:not(.t-casino),.hstrat-map[data-filter="hotel"] .rz-f:not(.t-hotel),.hstrat-map[data-filter="club"] .rz-f:not(.t-club){opacity:.07}
.hstrat-map[data-filter="casino"] .rz-lb:not(.t-casino),.hstrat-map[data-filter="hotel"] .rz-lb:not(.t-hotel),.hstrat-map[data-filter="club"] .rz-lb:not(.t-club){opacity:.12}
/* le siège reste lisible quand un filtre est actif : c'est l'origine du réseau */
.hstrat-map[data-filter] .rz-hub.rz-f,.hstrat-map[data-filter] .rz-lb.hub{opacity:.55!important}
/* compteur */
.rz-count{position:absolute;left:0;top:0;font-family:var(--display);font-stretch:115%;font-weight:500;font-size:clamp(40px,5.2vw,68px);line-height:.9;letter-spacing:-.04em;color:${C.navy};font-variant-numeric:tabular-nums;pointer-events:none;opacity:0;transition:opacity 1s ease .2s}
.rz-count::after{content:"";display:block;width:34px;height:2px;margin-top:14px;background:linear-gradient(90deg,${C.blue} 0 33%,${C.red} 33% 66%,${C.sun} 66%)}
.hstrat-map.live .rz-count{opacity:1}
/* vignette */
.rz-card{position:absolute;left:0;top:0;width:var(--rz-cw,232px);background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 1px 0 rgba(11,27,46,.06),0 26px 50px -18px rgba(11,27,46,.4);pointer-events:none;opacity:0;transform:translateY(8px) scale(.98);transition:opacity .3s ease,transform .45s cubic-bezier(.2,.7,.2,1);z-index:3}
.rz-card.on{opacity:1;transform:none}
.rz-card figure{margin:0;aspect-ratio:16/10;overflow:hidden;background:#E9EEF4}
.rz-card img{display:block;width:100%;height:100%;object-fit:cover;transform:scale(1.08);transition:transform 1.2s cubic-bezier(.2,.7,.2,1)}
.rz-card.on img{transform:none}
.rz-card .rz-cb{padding:13px 16px 15px}
.rz-card .rz-row{position:relative;padding-left:14px}
.rz-card .rz-row+.rz-row{margin-top:9px}
.rz-card .rz-row::before{content:"";position:absolute;left:0;top:2px;bottom:2px;width:2px;border-radius:2px;background:var(--rz-c)}
.rz-card b{display:block;font-family:var(--display);font-stretch:110%;font-size:14.5px;font-weight:600;letter-spacing:-.01em;line-height:1.2;color:${C.navy}}
.rz-card span{display:block;margin-top:3px;font-size:9.5px;font-weight:700;letter-spacing:.18em;text-transform:uppercase;color:rgba(11,27,46,.55)}
`;

export async function mountStratMap(box, { reduceMotion }) {
  const stage = box.querySelector('.hs-stage');
  const data = await fetch('/data/france-suisse.json').then(r => r.json());
  // la Corse est retirée : aucun établissement du groupe n'y est implanté
  const fr = data.fr.filter(poly => !poly[0].every(([lo, la]) => lo > 8.3 && la < 43.2)), ch = data.ch;

  if (!document.getElementById('rz-style')) { const st = document.createElement('style'); st.id = 'rz-style'; st.textContent = CSS; document.head.appendChild(st); }

  let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
  [...fr, ...ch].forEach(poly => poly[0].forEach(([lo, la]) => { const [x, y] = P(lo, la); x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); }));
  const W = x1 - x0, H = y1 - y0;

  /* établissements regroupés par adresse */
  const byKey = new Map();
  PLACES.forEach(p => { const key = p.lon + ',' + p.lat; if (!byKey.has(key)) byKey.set(key, []); byKey.get(key).push(p); });
  const spots = [...byKey.values()].map(items => {
    items.sort((a, b) => RANK[a.type] - RANK[b.type]);
    const [gx, gy] = P(items[0].lon, items[0].lat);
    return { items, gx, gy, city: items[0].city, types: [...new Set(items.map(p => p.type))], lit: false };
  });
  const hub = spots.find(s => s.city === 'Paris');
  const dests = spots.filter(s => s !== hub).sort((a, b) => Math.hypot(a.gx - hub.gx, a.gy - hub.gy) - Math.hypot(b.gx - hub.gx, b.gy - hub.gy));
  hub.lit = true;

  box.classList.add('rz-on');
  const wrap = document.createElement('div'); wrap.className = 'rz-wrap';
  const count = document.createElement('div'); count.className = 'rz-count';
  const card = document.createElement('div'); card.className = 'rz-card';
  stage.appendChild(wrap);
  wrap.append(count, card);
  let cShown = null;
  let svg = null, L = { k: 1, ox: 0, oy: 0, w: 0, h: 0 }, uid = 0;
  const tot = PLACES.length;
  let shown = reduceMotion ? tot : hub.items.length;
  const setCount = n => { shown = n; if (!box.dataset.filter) { count.textContent = String(n).padStart(2, '0'); cShown = n; } };

  const el = (tag, attrs = {}, parent) => { const n = document.createElementNS(SVG, tag); for (const k in attrs) n.setAttribute(k, attrs[k]); if (parent) parent.appendChild(n); return n; };
  const mix = (hex, a) => { const c = parseInt(hex.slice(1), 16), b = parseInt(C.paper.slice(1), 16); const ch = s => Math.round(((c >> s) & 255) * a + ((b >> s) & 255) * (1 - a)); return `rgb(${ch(16)},${ch(8)},${ch(0)})`; };

  function layout() {
    const w = stage.clientWidth, h = stage.clientHeight;
    if (!w || !h) return;
    const k = Math.min(w / W, h / H), ox = (w - W * k) / 2, oy = (h - H * k) / 2, s = Math.max(.55, Math.min(1.25, k / 61));
    L = { k, ox, oy, w, h, s };
    const pt = (gx, gy) => [ox + (gx - x0) * k, oy + (gy - y0) * k];
    const path = polys => polys.map(poly => poly.map(r => 'M' + r.map(([lo, la]) => pt(...P(lo, la)).map(v => v.toFixed(1)).join(' ')).join('L') + 'Z').join('')).join('');
    const dFR = path(fr), dCH = path(ch), id = 'rz' + (++uid);
    const small = k < 44;
    wrap.classList.toggle('rz-small', small);
    wrap.style.setProperty('--rz-fs', (small ? 9 : Math.max(8.5, Math.min(10.5, 9.5 * s))) + 'px');

    const n = el('svg', { class: 'rz-svg', width: w, height: h, viewBox: `0 0 ${w} ${h}` });
    const defs = el('defs', {}, n);
    defs.innerHTML = `
      <pattern id="${id}h" width="6" height="${(3.1 * Math.max(.8, s)).toFixed(2)}" patternUnits="userSpaceOnUse"><line x1="0" y1=".5" x2="6" y2=".5" stroke="${C.navy}" stroke-opacity=".17" stroke-width=".7"/></pattern>
      <pattern id="${id}c" width="3.4" height="3.4" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><line x1="0" y1=".5" x2="3.4" y2=".5" stroke="${C.navy}" stroke-opacity=".12" stroke-width=".6"/></pattern>
      <radialGradient id="${id}g" cx="${pt(hub.gx, hub.gy)[0]}" cy="${pt(hub.gx, hub.gy)[1]}" r="${Math.max(w, h) * .75}" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#fff" stop-opacity=".55"/><stop offset=".55" stop-color="#fff" stop-opacity="0"/></radialGradient>
      <clipPath id="${id}k"><path d="${dFR}${dCH}"/></clipPath>`;

    /* graticule : croix fines tous les deux degrés */
    const grat = el('g', { class: 'rz-grat', stroke: C.navy, 'stroke-opacity': .16, 'stroke-width': .7 }, n);
    let gd = '';
    if (!small) for (let lon = -6; lon <= 12; lon += 2) for (let lat = 42; lat <= 52; lat += 2) {
      const [x, y] = pt(...P(lon, lat)); if (x < 6 || y < 6 || x > w - 6 || y > h - 6) continue;
      gd += `M${(x - 3).toFixed(1)} ${y.toFixed(1)}h6M${x.toFixed(1)} ${(y - 3).toFixed(1)}v6`;
    }
    el('path', { d: gd }, grat);

    /* terre : lignes d'eau, aplat papier, hachures, contour */
    const land = el('g', { class: 'rz-land' }, n);
    const rings = small ? [[13, .12], [8, .18], [3.5, .28]] : [[24, .09], [17, .13], [10.5, .19], [4.5, .3]];
    rings.forEach(([d, a]) => {
      el('path', { d: dFR + dCH, fill: 'none', stroke: mix(C.blue, a), 'stroke-width': d * 2, 'stroke-linejoin': 'round' }, land);
      el('path', { d: dFR + dCH, fill: 'none', stroke: C.paper, 'stroke-width': d * 2 - 1, 'stroke-linejoin': 'round' }, land);
    });
    el('path', { d: dFR, fill: C.land }, land);
    el('path', { d: dCH, fill: '#F1EEE8' }, land);
    el('path', { d: dFR, fill: `url(#${id}h)` }, land);
    el('path', { d: dCH, fill: `url(#${id}c)` }, land);
    el('rect', { x: 0, y: 0, width: w, height: h, fill: `url(#${id}g)`, 'clip-path': `url(#${id}k)` }, land);
    el('path', { d: dFR, fill: 'none', stroke: C.navy, 'stroke-opacity': .62, 'stroke-width': .85, 'stroke-linejoin': 'round' }, land);
    el('path', { d: dCH, fill: 'none', stroke: C.navy, 'stroke-opacity': .45, 'stroke-width': .75, 'stroke-dasharray': '2 2.5' }, land);

    /* arcs */
    const [hx, hy] = pt(hub.gx, hub.gy);
    const arcs = el('g', {}, n), comets = el('g', {}, n), lbls = el('g', {}, n), mks = el('g', {}, n);
    dests.forEach(sp => {
      const [x, y] = pt(sp.gx, sp.gy);
      const dx = x - hx, dy = y - hy, d = Math.hypot(dx, dy);
      // courbure constante, toujours du même côté : l'ensemble tourne comme une gerbe
      const bow = (BOW[sp.city] ?? .24) * d, cx = (hx + x) / 2 + (dy / d) * bow, cy = (hy + y) / 2 - (dx / d) * bow;
      const dd = `M${hx.toFixed(1)} ${hy.toFixed(1)}Q${cx.toFixed(1)} ${cy.toFixed(1)} ${x.toFixed(1)} ${y.toFixed(1)}`;
      const gid = id + 'a' + dests.indexOf(sp);
      el('linearGradient', { id: gid, gradientUnits: 'userSpaceOnUse', x1: hx, y1: hy, x2: x, y2: y }, defs).innerHTML =
        `<stop offset="0" stop-color="${C.navy}" stop-opacity=".18"/><stop offset=".55" stop-color="${C.navy}" stop-opacity=".55"/><stop offset="1" stop-color="${C.blue}" stop-opacity=".95"/>`;
      const g = el('g', { class: 'rz-arc rz-f ' + sp.types.map(t => 't-' + t).join(' ') }, arcs);
      const line = el('path', { class: 'rz-line', d: dd, stroke: `url(#${gid})` }, g);
      const len = line.getTotalLength();
      const cg = el('g', { class: 'rz-cm rz-f ' + sp.types.map(t => 't-' + t).join(' '), opacity: 0 }, comets);
      const tails = [[.34, 1.2, .1], [.2, 1.6, .28], [.09, 2, .75]].map(([f, sw, op]) => {
        const tl = Math.min(90, len * f + 6);
        return { tl, n: el('path', { d: dd, fill: 'none', stroke: C.blue, 'stroke-width': sw, 'stroke-opacity': op, 'stroke-linecap': 'round', 'stroke-dasharray': `${tl} ${len + tl}` }, cg) };
      });
      el('circle', { r: 11, fill: C.blue, 'fill-opacity': .07 }, cg);
      el('circle', { r: 5.5, fill: C.blue, 'fill-opacity': .16 }, cg);
      el('circle', { r: 2.6, fill: '#fff', stroke: C.blue, 'stroke-width': 1.5 }, cg);
      Object.assign(sp, { x, y, arc: g, line, len, comet: cg, tails });
      line.setAttribute('stroke-dasharray', `${len} ${len}`);
      setReveal(sp, sp.drawn ?? (reduceMotion ? 1 : 0));
    });

    /* repères */
    const ms = small ? .66 : Math.max(.85, Math.min(1.12, s));
    const mk = (sp, x, y) => {
      const g = el('g', { class: 'rz-mk rz-f ' + sp.types.map(t => 't-' + t).join(' ') + (sp.lit ? ' lit' : ''), transform: `translate(${x.toFixed(1)} ${y.toFixed(1)}) scale(${ms})`, tabindex: 0, 'aria-label': sp.items.map(p => `${p.name}, ${p.city}`).join(' ; ') }, mks);
      const main = sp.types.includes('club') ? C.red : sp.types.includes('casino') ? C.blue : C.sun;
      el('circle', { class: 'rz-ripple', r: 7, stroke: main, 'stroke-width': 1 }, g);
      const core = el('g', { class: 'rz-core' }, g);
      if (sp === hub) {
        g.classList.add('rz-hub');
        el('circle', { class: 'rz-sonar', r: 9, stroke: C.red, 'stroke-width': .8 }, g);
        el('circle', { class: 'rz-sonar', r: 9, stroke: C.red, 'stroke-width': .8 }, g);
        el('circle', { r: 14, fill: C.paper, 'fill-opacity': .9 }, core);
        el('circle', { class: 'rz-orbit', r: 12.5, fill: 'none', stroke: C.navy, 'stroke-width': .8, 'stroke-dasharray': '1.2 2.4' }, core);
        el('circle', { r: 8, fill: 'none', stroke: C.navy, 'stroke-width': .9 }, core);
        el('circle', { r: 5, fill: C.red }, core);
      } else {
        const hasH = sp.types.includes('hotel'), hasC = sp.types.includes('casino');
        el('circle', { r: hasH ? 9.6 : 8, fill: C.paper }, core);
        if (hasC) el('circle', { r: hasH ? 3.6 : 4.4, fill: C.blue }, core);
        if (hasH) el('circle', { r: hasC ? 7 : 5, fill: 'none', stroke: C.sun, 'stroke-width': 2.3 }, core);
        if (!hasH) el('circle', { r: 7, fill: 'none', stroke: C.blue, 'stroke-opacity': .45, 'stroke-width': .7 }, core);
      }
      el('circle', { r: 12, fill: 'transparent' }, g);
      g.addEventListener('mouseenter', () => focus(sp, sp.items[0].name, true));
      g.addEventListener('mouseleave', () => focus(null));
      g.addEventListener('focus', () => focus(sp, sp.items[0].name, true));
      g.addEventListener('blur', () => focus(null));
      sp.mk = g;
    };
    dests.forEach(sp => mk(sp, sp.x, sp.y));
    hub.x = hx; hub.y = hy; mk(hub, hx, hy);

    /* étiquettes */
    spots.forEach(sp => {
      const c = (small && sp === hub) ? { t: [0, -13], a: 'middle' } : LB[sp.city] || { t: [10, 3.5] };
      const g = el('g', { class: 'rz-lb ' + sp.types.map(t => 't-' + t).join(' ') + (sp === hub ? ' hub' : '') + (sp.lit ? ' lit' : '') }, lbls);
      let tx, ty, anchor = c.a || 'start';
      if (c.l) {
        const ly = sp.y + c.l[1] * s, sgn = Math.sign(c.l[1]);
        const left = c.l[2] === 'l';
        const d = `M${sp.x} ${sp.y + sgn * 6}V${ly}h${left ? -4 : 4}`, len = Math.abs(ly - sp.y) + 4;
        const p = el('path', { class: 'rz-lead', d }, g); p.style.setProperty('--len', len);
        el('circle', { cx: sp.x, cy: ly, r: 1, fill: 'rgba(11,27,46,.5)' }, g);
        tx = sp.x + (left ? -7 : 7); ty = ly + 3.3; if (left) anchor = 'end';
      } else { const pad = sp.types.includes('hotel') && sp !== hub ? 4 * Math.sign(c.t[0]) : 0; tx = sp.x + pad + c.t[0] * (c.t[0] && Math.abs(c.t[0]) > 11 ? s : 1); ty = sp.y + c.t[1] * (Math.abs(c.t[1]) > 5 ? s : 1); }
      const t = el('text', { x: tx.toFixed(1), y: ty.toFixed(1), 'text-anchor': anchor }, g);
      t.textContent = sp.city;
      sp.lb = g;
    });

    if (svg) svg.replaceWith(n); else wrap.prepend(n);
    svg = n;
    count.style.left = Math.max(0, 4) + 'px'; count.style.top = '2px';
    if (active) focus(active.sp, active.name, active.local);
  }

  /* dessin progressif d'un arc (p de 0 à 1) et position de la comète */
  function setReveal(sp, p) {
    sp.drawn = p;
    if (!sp.line) return;
    sp.line.setAttribute('stroke-dashoffset', (sp.len * (1 - p)).toFixed(2));
  }
  function setComet(sp, p, alpha) {
    if (!sp.comet) return;
    const s = sp.len * p;
    sp.comet.setAttribute('opacity', alpha.toFixed(3));
    sp.tails.forEach(({ tl, n }) => n.setAttribute('stroke-dashoffset', (tl - s).toFixed(2)));
    const q = sp.line.getPointAtLength(s);
    [...sp.comet.querySelectorAll('circle')].forEach(c => { c.setAttribute('cx', q.x.toFixed(2)); c.setAttribute('cy', q.y.toFixed(2)); });
  }
  const light = sp => {
    if (sp.lit) return;
    sp.lit = true; sp.mk?.classList.add('lit'); sp.lb?.classList.add('lit');
    setCount(Math.min(tot, shown + sp.items.length));
  };

  /* mise en avant : survol d'un repère ou événement dest:hover */
  let active = null;
  function focus(sp, name, local) {
    spots.forEach(o => { o.arc?.classList.toggle('on', o === sp); o.mk?.classList.toggle('on', o === sp); o.lb?.classList.toggle('on', o === sp); });
    wrap.classList.toggle('rz-focus', !!sp);
    active = sp ? { sp, name, local } : null;
    if (!sp) { card.classList.remove('on'); return; }
    const item = sp.items.find(p => p.name === name) || sp.items[0];
    const list = local ? sp.items : [item, ...sp.items.filter(p => p !== item)];
    card.innerHTML = '';
    const fig = document.createElement('figure'), img = document.createElement('img');
    img.alt = ''; img.decoding = 'async'; img.src = IMG + PHOTO[item.name]; fig.appendChild(img);
    const body = document.createElement('div'); body.className = 'rz-cb';
    list.forEach(p => {
      const row = document.createElement('div'); row.className = 'rz-row';
      row.style.setProperty('--rz-c', p.type === 'club' ? C.red : p.type === 'hotel' ? C.sun : C.blue);
      const b = document.createElement('b'); b.textContent = p.name; const s = document.createElement('span'); s.textContent = p.city;
      row.append(b, s); body.appendChild(row);
    });
    card.append(fig, body);
    const cw = L.w < 420 ? 176 : 232; card.style.setProperty('--rz-cw', cw + 'px');
    const ch = cw * .625 + 24 + list.length * 44;
    // emplacement : on essaie plusieurs positions autour du repère et on garde celle qui masque le moins l'arc et les autres repères
    const g = 22, cands = [];
    [[sp.x + g, sp.y - ch / 2], [sp.x - g - cw, sp.y - ch / 2], [sp.x + g, sp.y - ch + 30], [sp.x - g - cw, sp.y - ch + 30], [sp.x + g, sp.y - 30], [sp.x - g - cw, sp.y - 30],
      [sp.x - cw / 2, sp.y - g - ch], [sp.x - cw / 2, sp.y + g], [sp.x - cw + 30, sp.y - g - ch], [sp.x - 30, sp.y - g - ch], [sp.x - cw + 30, sp.y + g], [sp.x - 30, sp.y + g]].forEach(([l, t], i) => {
      const inR = (x, y, m = 0) => x > l - m && x < l + cw + m && y > t - m && y < t + ch + m;
      let score = i * .5;
      const ov = Math.max(0, -l) + Math.max(0, l + cw - L.w) + Math.max(0, -t + 8) + Math.max(0, t + ch - L.h - 8);
      score += ov * 20;
      spots.forEach(o => { if (o !== sp && inR(o.x, o.y, 6)) score += o === hub ? 60 : 40; });
      if (sp.line) for (let q = 0; q <= 1; q += .05) { const p = sp.line.getPointAtLength(sp.len * q); if (inR(p.x, p.y, 4)) score += 8; }
      cands.push([score, l, t]);
    });
    cands.sort((a, b) => a[0] - b[0]);
    let [, left, top] = cands[0];
    left = Math.max(-8, Math.min(L.w - cw + 8, left)); top = Math.max(-8, Math.min(L.h - ch + 8, top));
    card.style.left = left + 'px'; card.style.top = top + 'px';
    requestAnimationFrame(() => card.classList.add('on'));
    if (!reduceMotion && sp !== hub) { run(sp, 1100, .9); }
  }

  /* comètes : file d'animations pilotée par requestAnimationFrame */
  const jobs = [];
  const ease = t => t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  function run(sp, dur, delay = 0, draw = false) {
    for (let i = jobs.length - 1; i >= 0; i--) if (jobs[i].sp === sp && !jobs[i].draw) jobs.splice(i, 1);
    jobs.push({ sp, t0: performance.now() + delay, dur, draw });
    tick();
  }
  let raf = 0;
  function tick() { if (!raf) raf = requestAnimationFrame(frame); }
  function frame(now) {
    raf = 0;
    for (let i = jobs.length - 1; i >= 0; i--) {
      const j = jobs[i], t = (now - j.t0) / j.dur;
      if (t < 0) { continue; }
      const p = ease(Math.min(1, t));
      if (j.draw) setReveal(j.sp, Math.max(j.sp.drawn, p));
      // la comète s'éteint en arrivant, sur les derniers 15 %
      setComet(j.sp, p, t >= 1 ? 0 : Math.min(1, t * 8) * (p > .85 ? (1 - p) / .15 : 1));
      if (t >= 1) { jobs.splice(i, 1); if (j.draw) light(j.sp); else if (j.sp.mk) { j.sp.mk.classList.remove('ping'); void j.sp.mk.getBBox(); j.sp.mk.classList.add('ping'); } }
    }
    if (jobs.length) tick();
  }

  function play() {
    const t = 450;
    dests.forEach((sp, i) => {
      const d = Math.hypot(sp.gx - hub.gx, sp.gy - hub.gy);
      run(sp, 650 + d * 150, t + i * 165, true);
    });
    // ensuite, le réseau reste vivant : une comète part de temps en temps vers un établissement
    const end = t + dests.length * 165 + 1600;
    setTimeout(() => setInterval(() => {
      if (active || document.hidden) return;
      const sp = dests[Math.floor(Math.random() * dests.length)];
      run(sp, 900 + Math.hypot(sp.gx - hub.gx, sp.gy - hub.gy) * 160);
    }, 2600), end);
  }

  box.querySelectorAll('.hs-legend li').forEach(li => {
    li.addEventListener('mouseenter', () => { box.dataset.filter = li.dataset.type; });
    li.addEventListener('mouseleave', () => { delete box.dataset.filter; });
  });
  document.addEventListener('dest:hover', e => {
    const sp = e.detail && spots.find(o => o.items.some(p => p.name === e.detail));
    focus(sp || null, e.detail, false);
  });
  document.addEventListener('dest:filter', e => { if (e.detail === 'all') delete box.dataset.filter; else box.dataset.filter = e.detail; });
  // le compteur suit le filtre (nombre d'établissements du type survolé), puis revient au total relié
  let cAnim = 0;
  const tween = to => {
    cancelAnimationFrame(cAnim);
    const from = cShown ?? shown, t0 = performance.now();
    if (reduceMotion) { count.textContent = String(to).padStart(2, '0'); cShown = to; return; }
    const st = now => { const t = Math.min(1, (now - t0) / 450), v = Math.round(from + (to - from) * (1 - Math.pow(1 - t, 3))); count.textContent = String(v).padStart(2, '0'); cShown = v; if (t < 1) cAnim = requestAnimationFrame(st); };
    cAnim = requestAnimationFrame(st);
  };
  new MutationObserver(() => {
    const f = box.dataset.filter;
    if (!box.classList.contains('live')) return;
    tween(f ? PLACES.filter(p => p.type === f && spots.find(o => o.items.includes(p)).lit).length : shown);
  }).observe(box, { attributes: true, attributeFilter: ['data-filter'] });

  if (reduceMotion) { spots.forEach(sp => { sp.lit = true; sp.drawn = 1; }); }
  setCount(shown);
  layout();
  new ResizeObserver(() => layout()).observe(stage);
  box.classList.add('ready');
  if (reduceMotion) box.classList.add('live');
  else {
    let started = false;
    const go = () => { if (started) return; started = true; box.classList.add('live'); io.disconnect(); clearInterval(poll); play(); };
    const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) go(); }, { threshold: .25 });
    io.observe(box);
    // filet de sécurité si l'observateur ne se déclenche pas (onglet en arrière-plan, rendu sans image)
    const poll = setInterval(() => { const r = box.getBoundingClientRect(), vis = Math.min(r.bottom, innerHeight) - Math.max(r.top, 0); if (r.height && vis > r.height * .25) go(); }, 400);
  }
}
