/* Groupe Tranchant — carte des implantations, variante F : « Le réseau en relief ».
   La France (et la Suisse) en plateau épais de papier gravé, posé en biais au-dessus de son ombre.
   Depuis Paris, des arches s'élèvent l'une après l'autre vers chaque établissement, portées par une comète ;
   à l'arrivée, le repère se dresse sur sa tige (casino : bille bleue, club : bille rouge, hôtel : anneau jaune)
   et le compteur monte. Au survol, l'arche passe devant, les autres s'estompent, une fiche photo s'ouvre.
   Les noms des villes restent en HTML, posés sur la projection des repères. Sans WebGL : variante D, à plat. */
import * as THREE from 'three';
import { PLACES, PHOTO, IMG } from './data.js';

const RANK = { club: 0, casino: 1, hotel: 2 };
const P = (lon, lat) => [(lon - 2.9) * .69, -(lat - 46.4)];
const C = { paper: '#FBF9F5', land: '#F5F1EA', navy: '#0B1B2E', blue: '#335F94', red: '#BA2637', sun: '#F9C83B' };
const BOW = { 'Pau': .1, 'Argelès-Gazost': .17, 'Bagnères-de-Bigorre': .24, 'Valras-Plage': .1, 'Sète': .16, 'Le-Grau-du-Roi': .22,
  'Luc-sur-Mer': .14, 'Villers-sur-Mer': .2, 'Yport': .26, 'Saint-Gervais': .1, 'Prilly': .16, 'Bâle': .2 };
const LIFT = .32, DEPTH = .3, BEV = .04, TOP = LIFT + DEPTH + BEV;

const CSS = `
.m3-wrap{position:absolute;inset:0}
.m3-wrap canvas{position:absolute;inset:0;width:100%!important;height:100%!important;display:block}
.m3-lbs{position:absolute;inset:0;pointer-events:none}
.m3-lb{position:absolute;left:0;top:0;white-space:nowrap;font-family:var(--sans);font-size:var(--m3-fs,10px);font-weight:700;letter-spacing:.17em;text-transform:uppercase;color:rgba(11,27,46,.78);
  text-shadow:0 0 3px ${C.paper},0 0 3px ${C.paper},0 0 6px ${C.paper};pointer-events:auto;cursor:pointer;outline:none;opacity:0;transition:opacity .7s ease,color .3s;will-change:transform}
.m3-lb.lit{opacity:1}
.m3-ld{position:absolute;left:0;top:0;width:1px;height:1px;overflow:visible;pointer-events:none;display:none}
.m3-lb.lead .m3-ld{display:block}
.m3-ld polyline{fill:none;stroke:rgba(11,27,46,.5);stroke-width:.8;stroke-linejoin:round;stroke-linecap:round}
.m3-ld circle{fill:rgba(11,27,46,.6)}
.m3-lb.on .m3-ld polyline{stroke:${C.navy};stroke-width:1}
.m3-lb.hub{font-family:var(--display);font-stretch:115%;font-size:calc(var(--m3-fs,10px) + 3px);letter-spacing:.2em;color:${C.navy}}
.m3-focus .m3-lb:not(.on):not(.hub){opacity:.2}
.m3-lb.on{color:${C.navy}}
.m3-wrap[data-f] .m3-lb.dim{opacity:.12}
.m3-small .m3-lb:not(.hub):not(.on){opacity:0!important;pointer-events:none}
.rz-count{position:absolute;left:4px;top:2px;font-family:var(--display);font-stretch:115%;font-weight:500;font-size:clamp(40px,5.2vw,68px);line-height:.9;letter-spacing:-.04em;color:${C.navy};font-variant-numeric:tabular-nums;pointer-events:none;opacity:0;transition:opacity 1s ease .2s;z-index:2}
.rz-count::after{content:"";display:block;width:34px;height:2px;margin-top:14px;background:linear-gradient(90deg,${C.blue} 0 33%,${C.red} 33% 66%,${C.sun} 66%)}
.hstrat-map.live .rz-count{opacity:1}
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
.hstrat-map.m3-on{overflow:visible}
@media (prefers-reduced-motion:reduce){.m3-wrap *{transition:none!important}}`;

export async function mountStratMap(box, opts) {
  const probe = document.createElement('canvas');
  const gl = probe.getContext('webgl2') || probe.getContext('webgl');
  const flat = async () => (await import('./strat-map-d.js')).mountStratMap(box, opts);
  if (!gl) return flat();
  gl.getExtension('WEBGL_lose_context')?.loseContext();
  const { reduceMotion } = opts;
  const stage = box.querySelector('.hs-stage');
  const data = await fetch('/data/france-suisse.json').then(r => { if (!r.ok) throw new Error('carte ' + r.status); return r.json(); });
  // la Corse est retirée : aucun établissement du groupe n'y est implanté
  const fr = data.fr.filter(poly => !poly[0].every(([lo, la]) => lo > 8.3 && la < 43.2)), ch = data.ch;
  if (!document.getElementById('m3-style')) { const st = document.createElement('style'); st.id = 'm3-style'; st.textContent = CSS; document.head.appendChild(st); }

  /* emprise, centrée sur l'origine */
  let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
  [...fr, ...ch].forEach(poly => poly[0].forEach(([lo, la]) => { const [x, y] = P(lo, la); x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); }));
  const W = x1 - x0, H = y1 - y0, cx = (x0 + x1) / 2, cy = (y0 + y1) / 2;
  const toW = (lon, lat) => { const [x, y] = P(lon, lat); return new THREE.Vector3(x - cx, 0, y - cy); };

  /* établissements regroupés par adresse */
  const byKey = new Map();
  PLACES.forEach(p => { const key = p.lon + ',' + p.lat; if (!byKey.has(key)) byKey.set(key, []); byKey.get(key).push(p); });
  const spots = [...byKey.values()].map(items => {
    items.sort((a, b) => RANK[a.type] - RANK[b.type]);
    const w = toW(items[0].lon, items[0].lat);
    return { items, w, city: items[0].city, types: [...new Set(items.map(p => p.type))], lit: false, drawn: 0, pop: 0 };
  });
  const hub = spots.find(s => s.city === 'Paris');
  const dests = spots.filter(s => s !== hub).sort((a, b) => a.w.distanceTo(hub.w) - b.w.distanceTo(hub.w));
  hub.lit = true; hub.pop = 1;

  /* scène */
  box.classList.add('rz-on', 'm3-on');
  const wrap = document.createElement('div'); wrap.className = 'm3-wrap';
  const lbs = document.createElement('div'); lbs.className = 'm3-lbs';
  const count = document.createElement('div'); count.className = 'rz-count';
  const card = document.createElement('div'); card.className = 'rz-card';
  let renderer;
  try { renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' }); } catch { return flat(); }
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.NeutralToneMapping;
  renderer.shadowMap.enabled = true;
  // l'ombre n'est recalculée que lorsque les repères bougent (apparition, redimensionnement)
  renderer.shadowMap.autoUpdate = false; renderer.shadowMap.needsUpdate = true;
  renderer.shadowMap.type = THREE.VSMShadowMap;
  renderer.domElement.setAttribute('aria-hidden', 'true');
  wrap.append(renderer.domElement, lbs, count, card);
  stage.appendChild(wrap);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(28, 1, .1, 200);
  scene.add(new THREE.HemisphereLight('#ffffff', '#b8c4d3', 1.05));
  const sun = new THREE.DirectionalLight('#fff6e8', 1.7);
  sun.position.set(-5, 14, 7);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  Object.assign(sun.shadow.camera, { left: -10, right: 10, top: 10, bottom: -10, near: 1, far: 40 });
  sun.shadow.radius = 14; sun.shadow.blurSamples = 20; sun.shadow.bias = -.0004;
  scene.add(sun);
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(60, 60), new THREE.ShadowMaterial({ color: C.navy, opacity: .2 }));
  ground.rotation.x = -Math.PI / 2; ground.receiveShadow = true;
  scene.add(ground);

  const world = new THREE.Group(); scene.add(world);

  /* plateau : dessus en papier gravé (texture dessinée), tranche bleu brume */
  const TW = 2600, TH = Math.round(TW * H / W);
  const tc = document.createElement('canvas'); tc.width = TW; tc.height = TH;
  const g2 = tc.getContext('2d');
  const tp = (lo, la) => { const [x, y] = P(lo, la); return [(x - x0) / W * TW, (y - y0) / H * TH]; };
  const trace = polys => { g2.beginPath(); polys.forEach(poly => poly.forEach(r => r.forEach(([lo, la], i) => { const [x, y] = tp(lo, la); i ? g2.lineTo(x, y) : g2.moveTo(x, y); }))); };
  g2.fillStyle = C.land; g2.fillRect(0, 0, TW, TH);
  g2.save(); trace(fr); g2.clip();
  g2.strokeStyle = 'rgba(11,27,46,.24)'; g2.lineWidth = 1.8;
  for (let y = 2; y < TH; y += 8) { g2.beginPath(); g2.moveTo(0, y); g2.lineTo(TW, y); g2.stroke(); }
  g2.restore();
  g2.save(); trace(ch); g2.clip(); g2.fillStyle = '#EFEBE3'; g2.fillRect(0, 0, TW, TH);
  g2.strokeStyle = 'rgba(11,27,46,.12)'; g2.lineWidth = 1.4;
  for (let d = -TH; d < TW; d += 8) { g2.beginPath(); g2.moveTo(d, TH); g2.lineTo(d + TH, 0); g2.stroke(); }
  g2.restore();
  const [hxT, hyT] = tp(hub.items[0].lon, hub.items[0].lat);
  const glow = g2.createRadialGradient(hxT, hyT, 0, hxT, hyT, TW * .55);
  glow.addColorStop(0, 'rgba(255,255,255,.45)'); glow.addColorStop(1, 'rgba(255,255,255,0)');
  g2.fillStyle = glow; g2.fillRect(0, 0, TW, TH);
  g2.lineJoin = 'round';
  trace(fr); g2.strokeStyle = 'rgba(11,27,46,.6)'; g2.lineWidth = 2.6; g2.stroke();
  trace(ch); g2.setLineDash([6, 7]); g2.strokeStyle = 'rgba(11,27,46,.45)'; g2.lineWidth = 2.2; g2.stroke(); g2.setLineDash([]);
  const tex = new THREE.CanvasTexture(tc); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = renderer.capabilities.getMaxAnisotropy();
  const topMat = new THREE.MeshStandardMaterial({ map: tex, roughness: .92, metalness: 0 });
  const sideMat = new THREE.MeshStandardMaterial({ color: '#B9C8DA', roughness: .8, metalness: 0 });
  const shapes = polys => polys.map(poly => {
    const pts = r => r.map(([lo, la]) => { const [x, y] = P(lo, la); return new THREE.Vector2(x - cx, -(y - cy)); });
    const s = new THREE.Shape(pts(poly[0]));
    poly.slice(1).forEach(h => s.holes.push(new THREE.Path(pts(h))));
    return s;
  });
  const slab = new THREE.Group(); world.add(slab);
  [fr, ch].forEach(polys => {
    const geo = new THREE.ExtrudeGeometry(shapes(polys), { depth: DEPTH, bevelEnabled: true, bevelThickness: BEV, bevelSize: .035, bevelSegments: 3, curveSegments: 1 });
    geo.rotateX(-Math.PI / 2);
    // coordonnées de texture : projection du dessus, valables pour le dessus comme pour le dessous
    const pos = geo.attributes.position, uv = geo.attributes.uv;
    for (let i = 0; i < pos.count; i++) uv.setXY(i, (pos.getX(i) + cx - x0) / W, 1 - (pos.getZ(i) + cy - y0) / H);
    uv.needsUpdate = true;
    geo.computeVertexNormals();
    const m = new THREE.Mesh(geo, [topMat, sideMat]);
    m.position.y = LIFT; m.castShadow = true; m.receiveShadow = true;
    slab.add(m);
  });

  /* repères : tige, bille ou anneau, pastille au sol */
  const colOf = sp => sp.types.includes('club') ? C.red : sp.types.includes('casino') ? C.blue : C.sun;
  const mats = [];
  const mat = (o) => { const m = new THREE.MeshStandardMaterial({ roughness: .35, metalness: .1, transparent: true, ...o }); mats.push(m); return m; };
  const stemGeo = new THREE.CylinderGeometry(.014, .014, 1, 6); stemGeo.translate(0, .5, 0);
  spots.forEach(sp => {
    const g = new THREE.Group(); g.position.set(sp.w.x, TOP, sp.w.z); world.add(g);
    const hgt = sp === hub ? .78 : .42 + Math.min(.12, sp.w.distanceTo(hub.w) * .012);
    const c = colOf(sp), hasH = sp.types.includes('hotel'), hasC = sp.types.includes('casino');
    const stem = new THREE.Mesh(stemGeo, mat({ color: C.navy, opacity: .55 })); stem.scale.y = hgt; stem.castShadow = true; g.add(stem);
    const head = new THREE.Group(); head.position.y = hgt; g.add(head);
    if (sp === hub) {
      head.add(new THREE.Mesh(new THREE.SphereGeometry(.12, 32, 16), mat({ color: C.red, roughness: .25 })));
      const halo = new THREE.Mesh(new THREE.TorusGeometry(.16, .008, 8, 64), mat({ color: C.navy, opacity: .6 })); head.add(halo); sp.halo = halo;
    } else {
      if (hasC || !hasH) head.add(new THREE.Mesh(new THREE.SphereGeometry(hasH ? .06 : .08, 24, 12), mat({ color: sp.types.includes('club') ? C.red : C.blue, roughness: .28 })));
      if (hasH) { const r = new THREE.Mesh(new THREE.TorusGeometry(hasC ? .11 : .085, .024, 10, 48), mat({ color: C.sun, roughness: .3, metalness: .3 })); head.add(r); sp.ring = r; }
    }
    head.children.forEach(m => { m.castShadow = true; });
    const foot = new THREE.Mesh(new THREE.RingGeometry(.03, .05, 32), new THREE.MeshBasicMaterial({ color: c, transparent: true, opacity: .8, depthWrite: false }));
    foot.rotation.x = -Math.PI / 2; foot.position.y = .003; g.add(foot); mats.push(foot.material);
    const wave = new THREE.Mesh(new THREE.RingGeometry(.9, 1, 48), new THREE.MeshBasicMaterial({ color: c, transparent: true, opacity: 0, depthWrite: false }));
    wave.rotation.x = -Math.PI / 2; wave.position.y = .004; wave.scale.setScalar(.05); g.add(wave);
    Object.assign(sp, { g, head, hgt, wave, waveT: -1, op: 1 });
    g.scale.setScalar(sp.pop ? 1 : .0001);
  });

  /* arches */
  const SEG = 80, RAD = 6;
  dests.forEach(sp => {
    const a = hub.w.clone().setY(TOP + .02), b = sp.w.clone().setY(TOP + .02);
    const d = a.distanceTo(b), mid = a.clone().add(b).multiplyScalar(.5);
    const side = new THREE.Vector3(b.z - a.z, 0, a.x - b.x).normalize().multiplyScalar((BOW[sp.city] ?? .12) * d);
    mid.add(side).setY(TOP + .5 + d * .4);
    const curve = new THREE.QuadraticBezierCurve3(a, mid, b);
    const geo = new THREE.TubeGeometry(curve, SEG, .014, RAD, false);
    const m = new THREE.MeshBasicMaterial({ color: C.navy, transparent: true, opacity: .55, depthWrite: false });
    const tube = new THREE.Mesh(geo, m); world.add(tube);
    const comet = new THREE.Group();
    comet.add(new THREE.Mesh(new THREE.SphereGeometry(.03, 16, 8), new THREE.MeshBasicMaterial({ color: '#ffffff' })));
    comet.add(new THREE.Mesh(new THREE.SphereGeometry(.07, 16, 8), new THREE.MeshBasicMaterial({ color: C.blue, transparent: true, opacity: .35, depthWrite: false })));
    comet.visible = false; world.add(comet);
    Object.assign(sp, { curve, tube, comet, total: geo.index.count });
    setReveal(sp, reduceMotion ? 1 : 0);
  });
  function setReveal(sp, p) {
    sp.drawn = p;
    sp.tube.geometry.setDrawRange(0, Math.floor(p * SEG) * RAD * 6);
  }

  /* étiquettes HTML */
  spots.forEach(sp => {
    const el = document.createElement('div');
    el.className = 'm3-lb ' + sp.types.map(t => 't-' + t).join(' ') + (sp === hub ? ' hub lit' : '');
    el.textContent = sp.city; el.tabIndex = 0;
    // filet de rappel (masqué tant que le nom reste collé au repère)
    const ld = document.createElementNS('http://www.w3.org/2000/svg', 'svg'); ld.setAttribute('class', 'm3-ld'); ld.setAttribute('aria-hidden', 'true');
    ld.innerHTML = '<polyline/><circle r="1.4"/>'; el.appendChild(ld); sp.ld = ld;
    el.setAttribute('aria-label', sp.items.map(p => `${p.name}, ${p.city}`).join(' ; '));
    el.addEventListener('mouseenter', () => focus(sp, sp.items[0].name, true));
    el.addEventListener('mouseleave', () => focus(null));
    el.addEventListener('focus', () => focus(sp, sp.items[0].name, true));
    el.addEventListener('blur', () => focus(null));
    lbs.appendChild(el); sp.lb = el;
  });

  /* cadrage : la caméra recule jusqu'à ce que tout le plateau tienne dans le cadre */
  let vw = 0, vh = 0, small = false;
  const dir = new THREE.Vector3(.1, 1, 1.02).normalize(), look = new THREE.Vector3(.15, TOP * .6, .35);
  const corners = [];
  // contour réel des terres (un point sur quatre), au pied et au sommet du plateau
  [...fr, ...ch].forEach(poly => poly[0].forEach(([lo, la], i) => { if (i % 4) return; const [x, y] = P(lo, la); corners.push(new THREE.Vector3(x - cx, LIFT, y - cy), new THREE.Vector3(x - cx, TOP + .15, y - cy)); }));
  spots.forEach(sp => corners.push(new THREE.Vector3(sp.w.x, TOP + .9, sp.w.z)));
  let dist = 20;
  function frameCam(px = 0, py = 0) {
    const d = dir.clone().applyAxisAngle(new THREE.Vector3(0, 1, 0), px * .1);
    d.y += py * .06; d.normalize();
    camera.position.copy(look).addScaledVector(d, dist);
    camera.lookAt(look);
  }
  const tmp = new THREE.Vector3();
  function resize() {
    vw = stage.clientWidth; vh = stage.clientHeight;
    if (!vw || !vh) return;
    renderer.setSize(vw, vh, false);
    camera.aspect = vw / vh; camera.updateProjectionMatrix();
    small = vw < 520;
    wrap.classList.toggle('m3-small', small);
    wrap.style.setProperty('--m3-fs', (small ? 9 : Math.max(9, Math.min(10.5, vw / 85))) + 'px');
    for (dist = 6; dist < 60; dist += .1) {
      frameCam();
      camera.updateMatrixWorld();
      if (corners.every(c => { tmp.copy(c).project(camera); return Math.abs(tmp.x) < .95 && Math.abs(tmp.y) < .93; })) break;
    }
    frameCam(); camera.updateMatrixWorld();
    placeLabels();
    frameCam(px, py); camera.updateMatrixWorld();
    renderer.shadowMap.needsUpdate = true;
    kick();
  }

  /* placement des noms, en cartographe : chaque position candidate (collée au repère, puis écartée en colonne avec filet de rappel)
     est notée — chevaucher un repère, sa tige ou un autre nom est exclu, couvrir une arche coûte, s'éloigner coûte un peu —
     et l'on garde la moins chère ; deux passes de reprise une fois tout le monde posé */
  const v = new THREE.Vector3();
  const prj = () => { world.localToWorld(v); v.project(camera); return [(v.x + 1) / 2 * vw, (1 - v.y) / 2 * vh]; };
  const scr = (sp, y = 0) => { v.set(sp.w.x, TOP + y, sp.w.z); return prj(); };
  const inR = (r, x, y) => x > r[0] && x < r[2] && y > r[1] && y < r[3];
  const ovl = (a, b) => a[0] < b[2] && a[2] > b[0] && a[1] < b[3] && a[3] > b[1];
  const cross = (a, b, c, d) => { const o = (p, q, r) => Math.sign((q[0] - p[0]) * (r[1] - p[1]) - (q[1] - p[1]) * (r[0] - p[0])); return o(a, b, c) * o(a, b, d) < 0 && o(c, d, a) * o(c, d, b) < 0; };
  function placeLabels() {
    // obstacles : têtes, tiges (échantillonnées), arches (échantillonnées)
    const heads = [], stems = [], arcs = [];
    spots.forEach(sp => {
      const [x, y] = scr(sp, sp.hgt), [fx, fy] = scr(sp, 0), rr = sp === hub ? 13 : 9;
      sp.hx = x; sp.hy = y; sp.fx = fx; sp.fy = fy; heads.push([x - rr, y - rr, x + rr, y + rr]);
      for (let t = .1; t <= 1; t += .1) stems.push([x + (fx - x) * t, y + (fy - y) * t, t < .35 && sp]);
      if (sp.curve) { const a = []; for (let i = 0; i <= 90; i++) { v.copy(sp.curve.getPoint(i / 90)); a.push(prj()); } arcs.push(a); }
    });
    const G = 3;
    const cost = (sp, c, w, h, k) => {
      const r = [sp.hx + c[0] - G, sp.hy + c[1] - G, sp.hx + c[0] + w + G, sp.hy + c[1] + h + G];
      if (r[0] < 2 || r[2] > vw - 2 || r[1] < 2 || r[3] > vh - 2) return 1e6;
      let s = c[2];
      heads.forEach((b, j) => { if (spots[j] !== sp && ovl(r, b)) s += 1e4; });
      stems.forEach(p => { if (p[2] !== sp && inR(r, p[0], p[1])) s += 400; });
      arcs.forEach(a => { if (a.some(p => inR(r, p[0], p[1]))) s += 22; });
      spots.forEach(o => {
        if (o === sp || !o.box) return;
        if (ovl(r, o.box)) s += 1e4;
        if (c[3] && o.lead && cross([sp.hx, sp.hy], c[3], [o.hx, o.hy], o.lead)) s += 300; // filets : ni croisés entre eux, ni sur une tige, ni sur un nom
        if (c[3] && cross([sp.hx, sp.hy], c[3], [o.hx, o.hy], [o.fx, o.fy])) s += 150;
        if (c[3]) { for (let t = .15; t <= 1; t += .1) { const px = sp.hx + (c[3][0] - sp.hx) * t, py = sp.hy + (c[3][1] - sp.hy) * t; if (inR(o.box, px, py)) { s += 600; break; } } }
        if (o.lead) { for (let t = .15; t <= 1; t += .1) { const px = o.hx + (o.lead[0] - o.hx) * t, py = o.hy + (o.lead[1] - o.hy) * t; if (inR(r, px, py)) { s += 600; break; } } }
      });
      if (c[3]) heads.forEach((b, j) => { if (spots[j] === sp) return; for (let t = .1; t <= 1; t += .1) { const px = sp.hx + (c[3][0] - sp.hx) * t, py = sp.hy + (c[3][1] - sp.hy) * t; if (inR(b, px, py)) { s += 800; break; } } });
      return s;
    };
    const cands = (sp, w, h) => {
      const out = [], rh = h + 2;
      // collées : à droite, à gauche, au-dessus, au-dessous
      out.push([11, -h / 2, 0], [-11 - w, -h / 2, 3], [-w / 2, -h - 10, 4], [-w / 2, 10, 5]);
      // écartées : en colonne à droite ou à gauche, reliées par un filet coudé
      for (const dx of [20, 34, 50]) for (let k = -4; k <= 4; k++) {
        const dy = k * rh;
        if (!k && dx < 30) continue;
        const pen = 30 + Math.hypot(dx - 11, dy) * .6;
        out.push([dx, -h / 2 + dy, pen, [sp.hx + dx - 5, sp.hy + dy], 1], [-dx - w, -h / 2 + dy, pen + 3, [sp.hx - dx + 5, sp.hy + dy], -1]);
      }
      // écartées vers le haut ou le bas, centrées
      for (let k = 1; k <= 4; k++) {
        const d = 10 + k * rh, pen = 30 + d * .6;
        out.push([-w / 2, -h - d, pen, [sp.hx, sp.hy - d - 1], 0], [-w / 2, d, pen + 2, [sp.hx, sp.hy + d + 1], 0]);
      }
      return out;
    };
    spots.forEach(sp => { sp.box = null; sp.lead = null; });
    const order = [hub, ...dests.slice().sort((a, b) => a.hy - b.hy)];
    const put = sp => {
      const w = sp.lb.offsetWidth, h = sp.lb.offsetHeight;
      sp.box = null; sp.lead = null;
      let best = null, bs = Infinity;
      cands(sp, w, h).forEach(c => { const s = cost(sp, c, w, h); if (s < bs) { bs = s; best = c; } });
      sp.off = best; sp.lead = best[3] || null;
      sp.box = [sp.hx + best[0], sp.hy + best[1], sp.hx + best[0] + w, sp.hy + best[1] + h];
      // filet : de la tête vers le bord du nom, avec un court coude horizontal sur les côtés
      const L = sp.lb.classList; L.toggle('lead', !!sp.lead);
      if (sp.lead) {
        const ox = -best[0], oy = -best[1], ex = sp.lead[0] - sp.hx + ox, ey = sp.lead[1] - sp.hy + oy;
        const dx = ex - ox, dy = ey - oy, n = Math.hypot(dx, dy) || 1, r0 = sp === hub ? 7 : 5;
        const sx = ox + dx / n * r0, sy = oy + dy / n * r0;
        const pts = best[4] ? [[sx, sy], [ex, ey], [ex + best[4] * 3, ey]] : [[sx, sy], [ex, ey]];
        sp.ld.firstChild.setAttribute('points', pts.map(p => p[0].toFixed(1) + ',' + p[1].toFixed(1)).join(' '));
        sp.ld.lastChild.setAttribute('cx', sx.toFixed(1)); sp.ld.lastChild.setAttribute('cy', sy.toFixed(1));
      }
    };
    order.forEach(put);
    for (let pass = 0; pass < 2; pass++) order.forEach(put);
  }
  function moveLabels() {
    spots.forEach(sp => {
      const [x, y] = scr(sp, sp.hgt); sp.sx = x; sp.sy = y;
      sp.lb.style.transform = `translate(${(x + sp.off[0]).toFixed(1)}px,${(y + sp.off[1]).toFixed(1)}px)`;
    });
  }

  /* compteur */
  const tot = PLACES.length;
  let shown = reduceMotion ? tot : hub.items.length, cShown = null;
  const setCount = n => { shown = n; if (!box.dataset.filter) { count.textContent = String(n).padStart(2, '0'); cShown = n; } };
  const light = sp => {
    if (sp.lit) return;
    sp.lit = true; sp.lb.classList.add('lit'); sp.waveT = 0;
    setCount(Math.min(tot, shown + sp.items.length));
  };

  /* mise en avant */
  let active = null;
  function focus(sp, name, local) {
    if (sp && active?.sp === sp && active.name === name) return;
    active = sp ? { sp, name, local } : null;
    wrap.classList.toggle('m3-focus', !!sp);
    spots.forEach(o => o.lb.classList.toggle('on', o === sp));
    if (!sp) { card.classList.remove('on'); kick(); return; }
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
    const cw = vw < 420 ? 176 : 232; card.style.setProperty('--rz-cw', cw + 'px');
    const chh = cw * .625 + 24 + list.length * 44;
    const [x, y] = [sp.sx ?? 0, sp.sy ?? 0];
    let left = x + 26, top = y - chh / 2;
    if (left + cw > vw - 8) left = x - 26 - cw;
    left = Math.max(-8, Math.min(vw - cw + 8, left)); top = Math.max(-8, Math.min(vh - chh + 8, top));
    card.style.left = left + 'px'; card.style.top = top + 'px';
    requestAnimationFrame(() => { if (active?.sp === sp) card.classList.add('on'); });
    if (!reduceMotion && sp !== hub && sp.lit) run(sp, 1100, 0);
    kick();
  }

  /* comètes : file d'animations */
  const jobs = [];
  const ease = t => t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  function run(sp, dur, delay = 0, draw = false) {
    for (let i = jobs.length - 1; i >= 0; i--) if (jobs[i].sp === sp && !jobs[i].draw) jobs.splice(i, 1);
    jobs.push({ sp, t0: performance.now() + delay, dur, draw });
    kick();
  }
  function stepJobs(now) {
    for (let i = jobs.length - 1; i >= 0; i--) {
      const j = jobs[i], t = (now - j.t0) / j.dur;
      if (t < 0) continue;
      const p = ease(Math.min(1, t));
      if (j.draw) setReveal(j.sp, Math.max(j.sp.drawn, p));
      const c = j.sp.comet;
      c.visible = t < 1;
      if (c.visible) { c.position.copy(j.sp.curve.getPoint(p)); c.scale.setScalar(p > .85 ? Math.max(.01, (1 - p) / .15) : Math.min(1, t * 8)); }
      if (t >= 1) { jobs.splice(i, 1); if (j.draw) light(j.sp); else j.sp.waveT = 0; }
    }
  }

  /* boucle de rendu : tourne tant que la carte est visible et qu'il y a du mouvement */
  let px = 0, py = 0, tx = 0, ty = 0, raf = 0, seen = false, last = 0, nextWave = 0, waveTimer = 0;
  const NAVY = new THREE.Color(C.navy), BLUE = new THREE.Color(C.blue);
  const filterOf = () => box.dataset.filter;
  function frame(now) {
    raf = 0;
    const dt = Math.min(.05, (now - (last || now)) / 1000); last = now;
    px += (tx - px) * .06; py += (ty - py) * .06;
    frameCam(px, py);
    stepJobs(now);
    const f = filterOf();
    let moving = Math.abs(tx - px) > .001 || Math.abs(ty - py) > .001 || jobs.length > 0;
    spots.forEach(sp => {
      // apparition du repère, en ressort
      if (sp.lit && sp.pop < 1) { sp.pop = Math.min(1, sp.pop + dt * 2.4); moving = true; renderer.shadowMap.needsUpdate = true; }
      const k = sp.pop, s = k >= 1 ? 1 : 1 + 2.2 * Math.pow(k - 1, 3) + 1.2 * Math.pow(k - 1, 2);
      sp.g.scale.set(Math.max(.0001, s), Math.max(.0001, k < 1 ? s : 1), Math.max(.0001, s));
      // filtre et mise en avant
      const on = !active || active.sp === sp || sp === hub, keep = !f || sp.types.includes(f) || sp === hub;
      const target = (keep ? 1 : .1) * (on ? 1 : .35);
      if (Math.abs(target - sp.op) > .002) {
        sp.op += (target - sp.op) * .15; moving = true;
        sp.mats ??= (() => { const l = []; sp.g.traverse(o => { if (o.material && o !== sp.wave) { o.material.userData.base = o.material.opacity; l.push(o.material); } }); return l; })();
        sp.mats.forEach(m => { m.opacity = m.userData.base * sp.op; });
      }
      if (sp.keep !== keep) { sp.keep = keep; sp.lb.classList.toggle('dim', !keep); }
      if (sp.tube) {
        const hot = active?.sp === sp;
        const ta = (keep ? 1 : .12) * (active ? (hot ? 1 : .18) : .55);
        const m = sp.tube.material; m.opacity += (ta - m.opacity) * .15; m.color.copy(hot ? BLUE : NAVY);
        if (Math.abs(ta - m.opacity) > .005) moving = true;
      }
      if (sp.waveT >= 0) {
        sp.waveT += dt / 1.4; moving = true;
        const t = sp.waveT; sp.wave.scale.setScalar(.05 + t * .32); sp.wave.material.opacity = Math.max(0, .5 * (1 - t)) * sp.op;
        if (t >= 1) sp.waveT = -1;
      }
      if (sp.ring) sp.ring.quaternion.copy(camera.quaternion);
    });
    if (hub.halo) hub.halo.quaternion.copy(camera.quaternion);
    // Paris émet une onde toutes les 3,6 s ; entre deux, la boucle s'arrête si rien ne bouge
    if (!reduceMotion && seen && hub.waveT < 0 && now >= nextWave) { hub.waveT = 0; nextWave = now + 3600; moving = true; }
    moveLabels();
    renderer.render(scene, camera);
    if (moving) raf = requestAnimationFrame(frame);
    else if (!reduceMotion && seen) { clearTimeout(waveTimer); waveTimer = setTimeout(kick, Math.max(16, nextWave - now)); }
  }
  const kick = () => { if (!raf) raf = requestAnimationFrame(frame); };
  const nearest = e => {
    const r = wrap.getBoundingClientRect();
    let best = null, bd = e.pointerType === 'mouse' ? 26 : 34;
    spots.forEach(sp => { const d = Math.hypot(sp.sx - (e.clientX - r.left), sp.sy - (e.clientY - r.top)); if (d < bd && sp.lit) { bd = d; best = sp; } });
    return best;
  };
  // au doigt : un toucher ouvre la fiche du repère le plus proche, un second la referme
  wrap.addEventListener('pointerup', e => {
    if (e.pointerType === 'mouse') return;
    const best = nearest(e);
    if (best && active?.sp !== best) focus(best, best.items[0].name, true); else focus(null);
  });
  wrap.addEventListener('pointercancel', () => { tx = ty = 0; kick(); });
  wrap.addEventListener('pointermove', e => {
    if (e.pointerType !== 'mouse') return;
    const r = wrap.getBoundingClientRect();
    tx = (e.clientX - r.left) / r.width - .5; ty = (e.clientY - r.top) / r.height - .5;
    if (e.target.closest('.m3-lb')) { kick(); return; }
    // survol direct d'un repère, au plus près
    const best = nearest(e);
    if (best && active?.sp !== best) focus(best, best.items[0].name, true);
    else if (!best && active?.local && !e.target.closest('.m3-lb')) focus(null);
    kick();
  });
  wrap.addEventListener('pointerleave', () => { tx = ty = 0; if (active?.local) focus(null); kick(); });

  function play() {
    const t = 450;
    dests.forEach((sp, i) => run(sp, 700 + sp.w.distanceTo(hub.w) * 140, t + i * 165, true));
    const end = t + dests.length * 165 + 1600;
    setTimeout(() => setInterval(() => {
      if (active || document.hidden || !seen) return;
      const sp = dests[Math.floor(Math.random() * dests.length)];
      run(sp, 1000 + sp.w.distanceTo(hub.w) * 150);
    }, 2600), end);
  }

  box.querySelectorAll('.hs-legend li').forEach(li => {
    li.addEventListener('mouseenter', () => { box.dataset.filter = li.dataset.type; });
    li.addEventListener('mouseleave', () => { delete box.dataset.filter; });
    // au doigt, la légende bascule le filtre
    li.addEventListener('click', () => { if (matchMedia('(hover: none)').matches) { if (box.dataset.filter === li.dataset.type) delete box.dataset.filter; else box.dataset.filter = li.dataset.type; } });
  });
  document.addEventListener('dest:hover', e => {
    const sp = e.detail && spots.find(o => o.items.some(p => p.name === e.detail));
    focus(sp || null, e.detail, false);
  });
  document.addEventListener('dest:filter', e => { if (e.detail === 'all') delete box.dataset.filter; else box.dataset.filter = e.detail; });
  let cAnim = 0;
  const tween = to => {
    cancelAnimationFrame(cAnim);
    const from = cShown ?? shown, t0 = performance.now();
    if (reduceMotion) { count.textContent = String(to).padStart(2, '0'); cShown = to; return; }
    const st = now => { const t = Math.min(1, (now - t0) / 450), val = Math.round(from + (to - from) * (1 - Math.pow(1 - t, 3))); count.textContent = String(val).padStart(2, '0'); cShown = val; if (t < 1) cAnim = requestAnimationFrame(st); };
    cAnim = requestAnimationFrame(st);
  };
  new MutationObserver(() => {
    const f = box.dataset.filter;
    if (f) wrap.dataset.f = f; else delete wrap.dataset.f;
    kick();
    if (!box.classList.contains('live')) return;
    tween(f ? PLACES.filter(p => p.type === f && spots.find(o => o.items.includes(p)).lit).length : shown);
  }).observe(box, { attributes: true, attributeFilter: ['data-filter'] });

  if (reduceMotion) spots.forEach(sp => { sp.lit = true; sp.pop = 1; sp.lb.classList.add('lit'); });
  setCount(shown);
  resize();
  new ResizeObserver(resize).observe(stage);
  document.fonts?.ready.then(resize);
  box.classList.add('ready');
  new IntersectionObserver(([e]) => { seen = e.isIntersecting; if (seen) kick(); }, { rootMargin: '100px' }).observe(box);
  if (reduceMotion) { box.classList.add('live'); kick(); }
  else {
    let started = false;
    const go = () => { if (started) return; started = true; box.classList.add('live'); io.disconnect(); clearInterval(poll); play(); };
    const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) go(); }, { threshold: .25 });
    io.observe(box);
    const poll = setInterval(() => { const r = box.getBoundingClientRect(), vis = Math.min(r.bottom, innerHeight) - Math.max(r.top, 0); if (r.height && vis > r.height * .25) go(); }, 400);
  }
}
