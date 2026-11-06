/* Groupe Tranchant — carte des implantations, variante A : maquette d'architecte en three.js.
   France et Suisse découpées dans un carton épais (dessus ivoire tramé de points brume, tranche bleu brume
   qui fonce vers le bleu GT), posées sur le papier de la page avec une ombre douce. Un repère par adresse :
   jeton de casino laqué sur une fine tige (casino bleu GT, club rouge, hôtel blanc cerclé de jaune ;
   plusieurs établissements à la même adresse = pile de jetons). Fiche HTML au survol, filtre par la légende. */
import * as THREE from 'three';
import { PLACES } from './data.js';

const RANK = { club: 0, casino: 1, hotel: 2 };
const P = (lon, lat) => [(lon - 2.9) * .69, -(lat - 46.4)];
const C = { paper: 0xF5F1EA, night: 0x0B1B2E, blue: 0x335F94, red: 0xBA2637, yellow: 0xF9C83B, mist: 0x9DB4D0 };
const DEPTH = .3, STEM = .8, CHIP_R = .22, CHIP_H = .075;
const ease = t => 1 - Math.pow(1 - Math.min(Math.max(t, 0), 1), 3);
const easeBack = t => { t = Math.min(Math.max(t, 0), 1); const s = 1.5; return 1 + (s + 1) * Math.pow(t - 1, 3) + s * Math.pow(t - 1, 2); };
const clamp01 = t => Math.min(Math.max(t, 0), 1);
// simplification Douglas-Peucker : un trait de côte plus calme, une tranche sans dents de scie
const simplify = (pts, tol) => {
  if (pts.length < 4) return pts;
  const keep = new Uint8Array(pts.length); keep[0] = keep[pts.length - 1] = 1;
  const st = [[0, pts.length - 1]];
  while (st.length) {
    const [a, b] = st.pop(); let md = 0, mi = -1;
    const [ax, ay] = pts[a], [bx, by] = pts[b], dx = bx - ax, dy = by - ay, L = Math.hypot(dx, dy);
    for (let i = a + 1; i < b; i++) { const d = L < 1e-6 ? Math.hypot(pts[i][0] - ax, pts[i][1] - ay) : Math.abs(dy * pts[i][0] - dx * pts[i][1] + bx * ay - by * ax) / L; if (d > md) { md = d; mi = i; } }
    if (md > tol) { keep[mi] = 1; st.push([a, mi], [mi, b]); }
  }
  return pts.filter((_, i) => keep[i]);
};

const CSS = `
.gta-canvas{position:absolute;inset:0;width:100%;height:100%;display:block;opacity:0;transition:opacity 1s ease}
.hstrat-map.ready .gta-canvas{opacity:1}
.gta-card{position:absolute;z-index:6;left:0;top:0;min-width:200px;padding:12px 15px;border-radius:12px;background:#fff;border:1px solid rgba(11,27,46,.12);
  box-shadow:0 22px 44px -22px rgba(11,27,46,.35);pointer-events:none;opacity:0;transform:translate(-50%,calc(-100% - 18px)) translateY(6px);
  transition:opacity .22s ease,transform .35s cubic-bezier(.2,.8,.2,1)}
.gta-card.on{opacity:1;transform:translate(-50%,calc(-100% - 18px))}
.gta-card div{display:flex;flex-direction:column;gap:1px;padding:2px 0 2px 10px;border-left:3px solid #335F94;white-space:nowrap;background:none}
.gta-card div[data-t=hotel]{border-color:#F9C83B}.gta-card div[data-t=club]{border-color:#BA2637}
.gta-card div+div{margin-top:8px}
.gta-card b{font-size:13.5px;font-weight:700;color:#0B1B2E}
.gta-card span{font-size:12px;color:rgba(11,27,46,.62)}
.gta-sr{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap}
`;

export async function mountStratMap(box, { reduceMotion }) {
  const stage = box.querySelector('.hs-stage');
  if (!document.getElementById('gta-style')) { const st = document.createElement('style'); st.id = 'gta-style'; st.textContent = CSS; document.head.appendChild(st); }
  const data = await fetch('/data/france-suisse.json').then(r => r.json());
  // la Corse est retirée : aucun établissement du groupe n'y est implanté
  const fr = data.fr.filter(poly => !poly[0].every(([lo, la]) => lo > 8.3 && la < 43.2)), ch = data.ch;

  let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
  [...fr, ...ch].forEach(poly => poly[0].forEach(([lo, la]) => { const [x, y] = P(lo, la); x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); }));
  const W = x1 - x0, H = y1 - y0, cx = (x0 + x1) / 2, cy = (y0 + y1) / 2;
  // coordonnées du monde : x vers l'est, z vers le sud, y vers le haut
  const world = (lon, lat) => { const [x, y] = P(lon, lat); return [x - cx, y - cy]; };

  /* ---------- rendu ---------- */
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.setClearColor(0x000000, 0);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.VSMShadowMap; // ombres floutées, plus douces que PCFSoft
  renderer.toneMapping = THREE.NeutralToneMapping;
  renderer.toneMappingExposure = 1;
  const canvas = renderer.domElement;
  canvas.className = 'gta-canvas';
  canvas.setAttribute('role', 'img');
  canvas.setAttribute('aria-label', 'Carte des implantations du Groupe TRANCHANT en France et en Suisse');
  stage.appendChild(canvas);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(26, 1, .1, 200);

  scene.add(new THREE.HemisphereLight(0xFFFFFF, 0xE8DFD0, 2.35));
  const sun = new THREE.DirectionalLight(0xFFF1DE, 1.25);
  sun.position.set(-5.5, 11, -4.5);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.radius = 9;
  sun.shadow.blurSamples = 16;
  sun.shadow.bias = -.0006;
  sun.shadow.normalBias = .02;
  Object.assign(sun.shadow.camera, { left: -9, right: 9, top: 9, bottom: -9, near: 1, far: 30 });
  scene.add(sun);
  const fill = new THREE.DirectionalLight(0xDCE6F2, .35);
  fill.position.set(6, 4, 8);
  scene.add(fill);

  /* sol invisible qui reçoit l'ombre portée */
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(60, 60), new THREE.ShadowMaterial({ color: C.night, opacity: .13 }));
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  scene.add(ground);

  /* ombre de contact : silhouette floutée juste sous la maquette */
  const shapePath = new Path2D(), pathOf = polys => polys.forEach(poly => poly.forEach(r => r.forEach(([lo, la], i) => { const [x, y] = P(lo, la); shapePath[i ? 'lineTo' : 'moveTo'](x - x0, y - y0); })));
  pathOf(fr); pathOf(ch);
  const pad = 1.6, cW = 1024, k = cW / (W + pad * 2), cH = Math.round((H + pad * 2) * k);
  const cc = document.createElement('canvas'); cc.width = cW; cc.height = cH;
  {
    const g = cc.getContext('2d');
    g.filter = `blur(${Math.round(k * .28)}px)`;
    g.setTransform(k, 0, 0, k, pad * k, pad * k);
    g.fillStyle = 'rgba(11,27,46,.55)'; g.fill(shapePath);
    g.setTransform(1, 0, 0, 1, 0, 0); g.filter = `blur(${Math.round(k * .07)}px)`;
    g.setTransform(k, 0, 0, k, pad * k, pad * k);
    g.fillStyle = 'rgba(11,27,46,.6)'; g.fill(shapePath);
  }
  const contactTex = new THREE.CanvasTexture(cc);
  const contact = new THREE.Mesh(new THREE.PlaneGeometry(W + pad * 2, H + pad * 2), new THREE.MeshBasicMaterial({ map: contactTex, transparent: true, opacity: 0, depthWrite: false, toneMapped: false }));
  contact.rotation.x = -Math.PI / 2; contact.position.y = .002;
  scene.add(contact);

  /* ---------- la maquette ---------- */
  const model = new THREE.Group();
  scene.add(model);

  // trame de points brume sur le dessus (texture en coordonnées du contour)
  const tW = 2048, tH = Math.round(tW * H / W);
  const tc = document.createElement('canvas'); tc.width = tW; tc.height = tH;
  {
    const g = tc.getContext('2d'), s = tW / W, step = W / 70;
    g.fillStyle = '#fff'; g.fillRect(0, 0, tW, tH);
    g.fillStyle = 'rgba(80,115,160,.32)';
    for (let gy = step / 2; gy < H; gy += step) for (let gx = step / 2; gx < W; gx += step) { g.beginPath(); g.arc(gx * s, gy * s, 2.6, 0, Math.PI * 2); g.fill(); }
  }
  const dotTex = new THREE.CanvasTexture(tc);
  dotTex.colorSpace = THREE.SRGBColorSpace;
  dotTex.anisotropy = renderer.capabilities.getMaxAnisotropy();
  // UV du dessus = coordonnées (x, -z) du contour → [0,1]
  dotTex.repeat.set(1 / W, 1 / H);
  dotTex.offset.set(.5, .5);

  const slabColors = geo => {
    const pos = geo.attributes.position, col = new Float32Array(pos.count * 3), top = new THREE.Color(0xD3DDE9), bot = new THREE.Color(0x7393BA), c = new THREE.Color();
    top.convertSRGBToLinear(); bot.convertSRGBToLinear();
    for (let i = 0; i < pos.count; i++) { c.copy(bot).lerp(top, Math.pow(clamp01(pos.getY(i) / DEPTH), .8)); col.set([c.r, c.g, c.b], i * 3); }
    geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
  };
  const country = (polys, topColor, h) => {
    const shapes = polys.map(poly => {
      const toV = r => {
        const pts = simplify(r.map(([lo, la]) => world(lo, la)), .028).filter((p, i, a) => !i || Math.hypot(p[0] - a[i - 1][0], p[1] - a[i - 1][1]) > 1e-4);
        while (pts.length > 3 && Math.hypot(pts[0][0] - pts.at(-1)[0], pts[0][1] - pts.at(-1)[1]) < 1e-4) pts.pop(); // anneau fermé : sans point doublé (sinon biseau en NaN)
        return pts.map(([x, z]) => new THREE.Vector2(x, -z));
      };
      const s = new THREE.Shape(toV(poly[0]));
      poly.slice(1).forEach(r => s.holes.push(new THREE.Path(toV(r))));
      return s;
    });
    const geo = new THREE.ExtrudeGeometry(shapes, { depth: h - .06, bevelEnabled: true, bevelThickness: .03, bevelSize: .014, bevelOffset: -.014, bevelSegments: 3, curveSegments: 1 });
    geo.rotateX(-Math.PI / 2);
    geo.translate(0, .03, 0);
    slabColors(geo);
    geo.computeVertexNormals();
    const topMat = new THREE.MeshStandardMaterial({ color: topColor, map: dotTex, roughness: .92, metalness: 0 });
    const sideMat = new THREE.MeshStandardMaterial({ color: 0xFFFFFF, vertexColors: true, roughness: .85, metalness: 0 });
    const m = new THREE.Mesh(geo, [topMat, sideMat]);
    m.castShadow = true; m.receiveShadow = true;
    return m;
  };
  model.add(country(fr, 0xF4F6F8, DEPTH));
  const chMesh = country(ch, 0xFBF6EC, DEPTH);
  model.add(chMesh);

  // frontière suisse en pointillés, posée sur le dessus
  ch.forEach(poly => {
    const pts = simplify(poly[0].map(([lo, la]) => world(lo, la)), .028).map(([x, z]) => new THREE.Vector3(x, DEPTH + .004, z));
    const line = new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), new THREE.LineDashedMaterial({ color: 0x5C7FA8, dashSize: .07, gapSize: .06, transparent: true, opacity: .9 }));
    line.computeLineDistances();
    model.add(line);
  });

  /* ---------- repères : un par adresse ---------- */
  const chipTex = (base, edge, insert, ring) => {
    const side = document.createElement('canvas'); side.width = 512; side.height = 32;
    let g = side.getContext('2d'); g.fillStyle = edge; g.fillRect(0, 0, 512, 32);
    if (insert) { g.fillStyle = insert; for (let i = 0; i < 6; i++) g.fillRect(i * 85.3 + 34, 0, 18, 32); }
    const top = document.createElement('canvas'); top.width = top.height = 256;
    g = top.getContext('2d'); g.fillStyle = base; g.fillRect(0, 0, 256, 256);
    g.lineWidth = ring[1]; g.strokeStyle = ring[0]; g.beginPath(); g.arc(128, 128, ring[2], 0, Math.PI * 2); g.stroke();
    return [side, top].map(c => { const x = new THREE.CanvasTexture(c); x.colorSpace = THREE.SRGBColorSpace; x.anisotropy = 8; return x; });
  };
  const CHIP = {
    casino: chipTex('#335F94', '#335F94', '#F3EFE7', ['rgba(243,239,231,.7)', 5, 92]),
    club: chipTex('#BA2637', '#BA2637', '#F3EFE7', ['rgba(243,239,231,.7)', 5, 92]),
    hotel: chipTex('#FCFAF6', '#F9C83B', null, ['#F9C83B', 26, 112]),
  };
  const chipGeo = new THREE.CylinderGeometry(CHIP_R, CHIP_R, CHIP_H, 48, 1);
  const stemGeo = new THREE.CylinderGeometry(.014, .014, 1, 8, 1); stemGeo.translate(0, .5, 0);
  const footGeo = new THREE.CylinderGeometry(.045, .055, .02, 20, 1);
  const waveGeo = new THREE.RingGeometry(.9, 1, 64); waveGeo.rotateX(-Math.PI / 2);
  const hitGeo = new THREE.CylinderGeometry(.24, .24, 1, 8, 1); hitGeo.translate(0, .5, 0);
  const HEX = { casino: C.blue, club: C.red, hotel: C.yellow };

  const spots = new Map();
  PLACES.forEach(p => { const key = p.lon + ',' + p.lat; if (!spots.has(key)) spots.set(key, []); spots.get(key).push(p); });
  const pins = [...spots.values()].sort((a, b) => b[0].lat - a[0].lat).map((items, n) => {
    items.sort((a, b) => RANK[a.type] - RANK[b.type]);
    const [x, z] = world(items[0].lon, items[0].lat), types = [...new Set(items.map(p => p.type))];
    const g = new THREE.Group(); g.position.set(x, DEPTH, z);
    const mats = [];
    const stemMat = new THREE.MeshStandardMaterial({ color: 0x6F7F93, roughness: .45, metalness: .15 });
    const stem = new THREE.Mesh(stemGeo, stemMat); stem.castShadow = true; g.add(stem); mats.push(stemMat);
    const foot = new THREE.Mesh(footGeo, stemMat); foot.position.y = .01; g.add(foot);
    const head = new THREE.Group(); g.add(head);
    types.forEach((t, i) => {
      const [side, top] = CHIP[t];
      const lac = { roughness: .32, clearcoat: 1, clearcoatRoughness: .18 };
      const ms = [new THREE.MeshPhysicalMaterial({ map: side, ...lac }), new THREE.MeshPhysicalMaterial({ map: top, ...lac }), new THREE.MeshPhysicalMaterial({ map: top, ...lac })];
      mats.push(...ms);
      const chip = new THREE.Mesh(chipGeo, ms);
      chip.position.y = CHIP_H / 2 + i * (CHIP_H + .006);
      chip.rotation.y = n * .7 + i * .4;
      chip.castShadow = true;
      head.add(chip);
    });
    const waveMat = new THREE.MeshBasicMaterial({ color: HEX[items[0].type === 'hotel' ? 'hotel' : items[0].type], transparent: true, opacity: 0, depthWrite: false });
    const wave = new THREE.Mesh(waveGeo, waveMat); wave.position.y = .003; wave.scale.setScalar(.2); g.add(wave);
    const hit = new THREE.Mesh(hitGeo, new THREE.MeshBasicMaterial({ visible: false })); g.add(hit);
    scene.add(g);
    const pin = { g, stem, head, wave, waveMat, hit, mats, items, types, names: items.map(p => p.name), n, grow: 0, lift: 0, hover: 0, op: 1, wavePhase: (n * .37) % 1 };
    hit.userData.pin = pin;
    return pin;
  });

  // liste pour les lecteurs d'écran
  const sr = document.createElement('ul'); sr.className = 'gta-sr';
  PLACES.forEach(p => { const li = document.createElement('li'); li.textContent = `${p.name}, ${p.city}`; sr.appendChild(li); });
  box.appendChild(sr);

  /* ---------- fiche HTML ---------- */
  const card = document.createElement('div'); card.className = 'gta-card'; card.setAttribute('aria-hidden', 'true');
  box.appendChild(card);
  let cardPin = null;
  const fillCard = pin => {
    card.textContent = '';
    pin.items.forEach(p => { const row = document.createElement('div'); row.dataset.t = p.type; const b = document.createElement('b'); b.textContent = p.name; const s = document.createElement('span'); s.textContent = p.city; row.append(b, s); card.appendChild(row); });
  };
  const v3 = new THREE.Vector3();
  const placeCard = () => {
    if (!cardPin) return;
    cardPin.head.getWorldPosition(v3); v3.y += CHIP_H * cardPin.types.length + .02; v3.project(camera);
    const sb = stage.getBoundingClientRect(), bb = box.getBoundingClientRect();
    const px = (v3.x + 1) / 2 * sb.width + sb.left - bb.left, py = (1 - v3.y) / 2 * sb.height + sb.top - bb.top;
    const half = (card.offsetWidth || 220) / 2, xx = Math.min(Math.max(px, half + 4), bb.width - half - 4);
    card.style.left = xx.toFixed(1) + 'px'; card.style.top = py.toFixed(1) + 'px';
  };
  const showCard = pin => {
    if (pin === cardPin) return;
    cardPin = pin;
    if (!pin) { card.classList.remove('on'); return; }
    fillCard(pin); placeCard(); card.classList.add('on');
  };

  /* ---------- caméra : vue en biais, cadrée sur la maquette ---------- */
  const BASE = { az: -.17, el: .68 };
  const view = { az: BASE.az, el: BASE.el, px: 0, py: 0 };
  const target = new THREE.Vector3(), fit = { dist: 20, off: new THREE.Vector3() };
  const corners = [];
  // cadrage sur le contour réel (et non sur son rectangle) et sur le sommet des repères
  [...fr, ...ch].forEach(poly => poly[0].forEach(([lo, la], i) => { if (i % 4) return; const [x, z] = world(lo, la); corners.push(new THREE.Vector3(x, 0, z)); }));
  pins.forEach(p => corners.push(new THREE.Vector3(p.g.position.x, DEPTH + STEM + CHIP_H * 2 + .1, p.g.position.z), new THREE.Vector3(p.g.position.x + CHIP_R, DEPTH + STEM, p.g.position.z), new THREE.Vector3(p.g.position.x - CHIP_R, DEPTH + STEM, p.g.position.z)));
  const place = (az, el, dist, off) => {
    camera.position.set(Math.sin(az) * Math.cos(el), Math.sin(el), Math.cos(az) * Math.cos(el)).multiplyScalar(dist).add(off);
    camera.lookAt(off);
  };
  const refit = () => {
    let dist = 20; const off = new THREE.Vector3(0, .25, .2);
    for (let it = 0; it < 6; it++) {
      place(BASE.az, BASE.el, dist, off); camera.updateMatrixWorld();
      let a = Infinity, b = -Infinity, c = Infinity, d = -Infinity;
      corners.forEach(p => { v3.copy(p).project(camera); a = Math.min(a, v3.x); b = Math.max(b, v3.x); c = Math.min(c, v3.y); d = Math.max(d, v3.y); });
      const span = Math.max((b - a) / 2 / .97, (d - c) / 2 / .9);
      dist *= span;
      // recentre : déplace la cible dans le plan de l'écran
      const right = new THREE.Vector3().setFromMatrixColumn(camera.matrixWorld, 0), up = new THREE.Vector3().setFromMatrixColumn(camera.matrixWorld, 1);
      const h = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * dist;
      off.addScaledVector(right, (a + b) / 2 * h * camera.aspect).addScaledVector(up, (c + d) / 2 * h);
    }
    fit.dist = dist; fit.off.copy(off);
  };

  /* ---------- état, filtre, survol ---------- */
  let pinK = 1; // repères un peu plus gros sur petit écran
  let live = false, visible = false, t0 = 0, hovered = null, lit = '', running = false, dirty = true;
  const filterOf = () => box.dataset.filter || 'all';
  new MutationObserver(() => kick()).observe(box, { attributes: true, attributeFilter: ['data-filter'] });
  box.querySelectorAll('.hs-legend li').forEach(li => {
    li.addEventListener('mouseenter', () => { box.dataset.filter = li.dataset.type; });
    li.addEventListener('mouseleave', () => { delete box.dataset.filter; });
  });
  document.addEventListener('dest:hover', e => { lit = e.detail || ''; kick(); });
  document.addEventListener('dest:filter', e => { if (e.detail === 'all') delete box.dataset.filter; else box.dataset.filter = e.detail; });

  const ray = new THREE.Raycaster(), ndc = new THREE.Vector2(), hits = pins.map(p => p.hit);
  let mouse = { x: 0, y: 0 };
  const pick = e => {
    const r = canvas.getBoundingClientRect();
    ndc.set((e.clientX - r.left) / r.width * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
    ray.setFromCamera(ndc, camera);
    const hit = ray.intersectObjects(hits, false)[0];
    const pin = hit && live ? hit.object.userData.pin : null;
    if (pin !== hovered) { hovered = pin; canvas.style.cursor = pin ? 'pointer' : ''; kick(); }
  };
  canvas.addEventListener('pointermove', pick);
  canvas.addEventListener('pointerdown', pick); // au toucher : la fiche s'ouvre d'un tap
  canvas.addEventListener('pointerleave', e => { if (e.pointerType === 'touch') return; hovered = null; canvas.style.cursor = ''; kick(); });
  if (!reduceMotion) {
    box.addEventListener('pointermove', e => { const r = box.getBoundingClientRect(); mouse = { x: (e.clientX - r.left) / r.width - .5, y: (e.clientY - r.top) / r.height - .5 }; kick(); });
    box.addEventListener('pointerleave', () => { mouse = { x: 0, y: 0 }; kick(); });
  }

  /* ---------- boucle ---------- */
  let last = performance.now();
  const step = now => {
    const dt = Math.min(.05, (now - last) / 1000); last = now;
    const T = live ? (reduceMotion ? 99 : (now - t0) / 1000) : 0;
    const damp = r => 1 - Math.exp(-dt * r);
    let busy = false;

    // la maquette monte du sol
    const rise = live ? ease(T / 1.5) : 0;
    model.scale.y = .02 + .98 * rise;
    contact.material.opacity = .22 * rise;
    // la caméra se pose doucement ; parallaxe au pointeur
    const settle = live ? ease(T / 2.4) : 0;
    const tx = reduceMotion ? 0 : mouse.x, ty = reduceMotion ? 0 : mouse.y;
    const pa = view.px, pb = view.py;
    view.px += (tx - view.px) * damp(4); view.py += (ty - view.py) * damp(4);
    if (Math.abs(view.px - pa) + Math.abs(view.py - pb) > 1e-5) busy = true;
    const az = BASE.az - .14 * (1 - settle) + view.px * .09, el = BASE.el + .16 * (1 - settle) - view.py * .06;
    place(az, el, fit.dist * (1 + .16 * (1 - settle)), fit.off);

    const f = filterOf();
    pins.forEach(pin => {
      const st = 1.05 + pin.n * .075;
      const grow = live ? ease((T - st) / .6) : 0, drop = live ? easeBack((T - st - .15) / .65) : 0;
      const on = pin === hovered || (lit && pin.names.includes(lit));
      pin.hover += ((on ? 1 : 0) - pin.hover) * damp(10);
      const want = f === 'all' || pin.types.includes(f) ? 1 : .16;
      pin.op += (want - pin.op) * damp(8);
      const len = STEM * (pin.types.length > 1 ? .92 : 1) * (1 + .45 * pin.hover);
      pin.stem.scale.y = Math.max(.001, len * grow);
      pin.g.visible = grow > 0;
      pin.head.position.y = len * grow + (1 - drop) * .5;
      pin.head.scale.setScalar(Math.max(.001, drop) * (1 + .18 * pin.hover) * pinK);
      pin.head.rotation.y = pin.hover * .6;
      pin.g.position.y = DEPTH * model.scale.y;
      const tr = pin.op < .99;
      pin.head.children.forEach(c => { c.castShadow = pin.op > .5; }); pin.stem.castShadow = pin.op > .5;
      pin.mats.forEach(m => { m.opacity = pin.op; if (m.transparent !== tr) { m.transparent = tr; m.needsUpdate = true; } });
      pin.hit.scale.y = len + .3;
      // onde au sol
      if (!reduceMotion && live && T > st + .5) {
        const ph = ((T - st) / 3.4 + pin.wavePhase) % 1;
        pin.wave.scale.setScalar(.22 + ph * .38);
        pin.waveMat.opacity = .32 * (1 - ph) * Math.min(1, ph * 8) * pin.op * clamp01((T - st - .5) / 1.2);
      } else pin.waveMat.opacity = 0;
      if (Math.abs(want - pin.op) > .002 || Math.abs((on ? 1 : 0) - pin.hover) > .002) busy = true;
    });
    // fiche : survol de la carte, sinon repère allumé depuis l'annuaire
    const cardFor = hovered || (lit && pins.find(p => p.names.includes(lit))) || null;
    showCard(live ? cardFor : null);
    renderer.render(scene, camera);
    placeCard();
    const animating = live && !reduceMotion;
    return busy || animating;
  };
  const loop = now => {
    const more = step(now);
    if (visible && more) requestAnimationFrame(loop); else running = false;
  };
  function kick() { if (!visible || running) return; running = true; last = performance.now(); requestAnimationFrame(loop); }

  const resize = () => {
    const w = stage.clientWidth, h = stage.clientHeight;
    if (!w || !h) return;
    renderer.setSize(w, h, false);
    camera.aspect = w / h; camera.updateProjectionMatrix();
    pinK = Math.min(1.4, Math.max(1, 520 / w));
    refit();
    if (!running) step(performance.now()); else kick();
  };
  new ResizeObserver(resize).observe(stage);
  resize();

  new IntersectionObserver(([e]) => { visible = e.isIntersecting; if (visible) kick(); }, { rootMargin: '100px' }).observe(box);
  const goLive = () => { live = true; t0 = performance.now(); box.classList.add('live'); kick(); if (reduceMotion) step(performance.now()); };
  if (reduceMotion) goLive();
  else new IntersectionObserver(([e], io) => { if (e.isIntersecting) { goLive(); io.disconnect(); } }, { threshold: .25 }).observe(box);
  box.classList.add('ready');
}
