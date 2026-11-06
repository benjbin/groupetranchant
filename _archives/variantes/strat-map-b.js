/* Groupe Tranchant — carte des implantations, variante B : « la France en colonnes de points ».
   La trame de points de la carte validée devient un relief : une colonne par point, basse et doucement ondulée,
   qui se soulève en colline autour de chaque implantation (teinte du type : casino bleu GT, club rouge, hôtel jaune).
   Un jeton au sommet de chaque colline, fiche HTML au survol, filtre par la légende ou l'annuaire. Fond transparent. */
import * as THREE from 'three';
import { PLACES } from './data.js';

const RANK = { club: 0, casino: 1, hotel: 2 };
const P = (lon, lat) => [(lon - 2.9) * .69, -(lat - 46.4)];
const TYPE_COL = { casino: '#335F94', club: '#BA2637', hotel: '#E2B33C' };
const TOKEN_COL = { casino: '#335F94', club: '#BA2637', hotel: '#F9C83B' };

const CSS = `
.smb-canvas{position:absolute;inset:0;width:100%;height:100%;display:block;outline:none}
.smb-card{position:absolute;left:0;top:0;z-index:5;min-width:200px;padding:12px 14px;border-radius:12px;background:#fff;
  border:1px solid rgba(11,27,46,.12);box-shadow:0 22px 44px -22px rgba(11,27,46,.45);pointer-events:none;opacity:0;
  transform:translate(var(--x),var(--y)) translateY(6px);transition:opacity .22s,transform .35s cubic-bezier(.2,.7,.2,1)}
.smb-card.on{opacity:1;transform:translate(var(--x),var(--y))}
.smb-card div{display:flex;flex-direction:column;gap:1px;padding:2px 0 2px 10px;border-left:3px solid #335F94;white-space:nowrap}
.smb-card div.smb-club{border-color:#BA2637}.smb-card div.smb-hotel{border-color:#F9C83B}
.smb-card div+div{margin-top:8px}
.smb-card b{font-size:13.5px;font-weight:700;color:#0B1B2E}
.smb-card span{font-size:12px;color:rgba(11,27,46,.6)}
.smb-sr{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap}
`;

const ease = t => t <= 0 ? 0 : t >= 1 ? 1 : 1 - Math.pow(1 - t, 3);
const easeQ = t => t <= 0 ? 0 : t >= 1 ? 1 : 1 - Math.pow(1 - t, 4);

export async function mountStratMap(box, { reduceMotion }) {
  const stage = box.querySelector('.hs-stage');
  if (!document.getElementById('smb-style')) { const s = document.createElement('style'); s.id = 'smb-style'; s.textContent = CSS; document.head.appendChild(s); }
  const data = await fetch('/data/france-suisse.json').then(r => r.json());
  // la Corse est retirée : aucun établissement du groupe n'y est implanté
  const fr = data.fr.filter(poly => !poly[0].every(([lo, la]) => lo > 8.3 && la < 43.2)), ch = data.ch;

  let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
  [...fr, ...ch].forEach(poly => poly[0].forEach(([lo, la]) => { const [x, y] = P(lo, la); x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); }));
  const W = x1 - x0, H = y1 - y0, cx = (x0 + x1) / 2, cy = (y0 + y1) / 2;
  const path = polys => polys.map(poly => poly.map(r => 'M' + r.map(([lo, la]) => { const [x, y] = P(lo, la); return (x - x0).toFixed(3) + ' ' + (y - y0).toFixed(3); }).join('L') + 'Z').join('')).join('');
  const shape = new Path2D(path(fr) + path(ch));
  const ctx = document.createElement('canvas').getContext('2d');

  /* ---- établissements regroupés par adresse ---- */
  const spots = [];
  const byKey = new Map();
  PLACES.forEach(p => { const k = p.lon + ',' + p.lat; if (!byKey.has(k)) { const s = { items: [] }; byKey.set(k, s); spots.push(s); } byKey.get(k).items.push(p); });
  spots.forEach(s => {
    s.items.sort((a, b) => RANK[a.type] - RANK[b.type]);
    s.type = s.items[0].type; s.types = [...new Set(s.items.map(p => p.type))];
    const [x, y] = P(s.items[0].lon, s.items[0].lat); s.x = x - cx; s.z = y - cy;
    s.names = s.items.map(p => p.name);
    s.amp = .46 + .1 * (s.items.length - 1);
    s.boost = 0; s.dim = 1; s.lit = false; s.hover = false;
  });
  spots.sort((a, b) => a.z - b.z).forEach((s, n) => { s.order = n; s.delay = 1.15 + n * .05; });

  /* ---- grille de colonnes dans les terres (même trame que la carte validée) ---- */
  const step = W / 84, sigma = step * 3.2;
  const cols = [];
  for (let gy = step / 2; gy < H; gy += step) for (let gx = step / 2; gx < W; gx += step) {
    if (!ctx.isPointInPath(shape, gx, gy)) continue;
    cols.push({ x: gx + x0 - cx, z: gy + y0 - cy });
  }
  const N = cols.length;
  const noise = (x, z) => .5 + .5 * (Math.sin(x * 1.25 + z * .62) * .5 + Math.sin(x * .55 - z * 1.08 + 1.3) * .32 + Math.sin(x * 2.4 + z * 1.9 + .4) * .18);
  cols.forEach((c, i) => {
    c.base = .03 + .075 * noise(c.x, c.z);
    c.delay = ((c.z + H / 2) / H) * 1.05 + Math.sin(c.x * 3.1 + c.z * 7.3) * .04;
    c.hills = [];
    spots.forEach((s, k) => { const d2 = (c.x - s.x) ** 2 + (c.z - s.z) ** 2; const w = Math.exp(-d2 / (2 * sigma * sigma)); if (w > .02) c.hills.push(k, w); });
  });

  /* ---- three.js ---- */
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
  renderer.setClearColor(0x000000, 0);
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.NeutralToneMapping;
  renderer.toneMappingExposure = 1;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  const canvas = renderer.domElement;
  canvas.className = 'smb-canvas';
  canvas.setAttribute('role', 'img');
  canvas.setAttribute('aria-label', 'Carte des implantations du Groupe Tranchant : ' + spots.map(s => s.items.map(p => `${p.name} (${p.city})`).join(', ')).join(' ; '));
  stage.appendChild(canvas);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(26, 1, .1, 200);

  scene.add(new THREE.HemisphereLight(0xFFFFFF, 0xEDE4D6, 2.1));
  const sun = new THREE.DirectionalLight(0xFFF3E2, 1.7);
  sun.position.set(-5, 10, 5.5);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  Object.assign(sun.shadow.camera, { left: -7.5, right: 7.5, top: 7.5, bottom: -7.5, near: 1, far: 30 });
  sun.shadow.bias = -.0004; sun.shadow.normalBias = .012; sun.shadow.radius = 4;
  scene.add(sun);

  // sol : ombres seules, sur le papier
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(40, 40), new THREE.ShadowMaterial({ color: 0x0B1B2E, opacity: .065 }));
  ground.rotation.x = -Math.PI / 2; ground.receiveShadow = true;
  scene.add(ground);

  // empreinte des terres, très légère, pour dessiner la silhouette entre les colonnes
  const landShapes = [];
  [...fr, ...ch].forEach(poly => {
    const sh = new THREE.Shape(poly[0].map(([lo, la]) => { const [x, y] = P(lo, la); return new THREE.Vector2(x - cx, -(y - cy)); }));
    poly.slice(1).forEach(h => sh.holes.push(new THREE.Path(h.map(([lo, la]) => { const [x, y] = P(lo, la); return new THREE.Vector2(x - cx, -(y - cy)); }))));
    landShapes.push(sh);
  });
  const land = new THREE.Mesh(new THREE.ShapeGeometry(landShapes), new THREE.MeshStandardMaterial({ color: 0xE6DFD3, roughness: 1, transparent: true, opacity: .55, depthWrite: false }));
  land.rotation.x = -Math.PI / 2; land.position.y = .001; land.receiveShadow = true;
  scene.add(land);

  // colonnes : cylindre à base au sol, sommet plus clair (couleurs de sommets × couleur d'instance)
  const r = step * .36;
  const geo = new THREE.CylinderGeometry(r, r, 1, 14, 1, false);
  geo.translate(0, .5, 0);
  { const pos = geo.attributes.position, nor = geo.attributes.normal, col = new Float32Array(pos.count * 3);
    for (let i = 0; i < pos.count; i++) { const top = nor.getY(i) > .5, y = pos.getY(i); const v = top ? 1 : .84 + .12 * y; col.set([v, v, v], i * 3); }
    geo.setAttribute('color', new THREE.BufferAttribute(col, 3)); }
  const mat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: .9, metalness: 0 });
  const mesh = new THREE.InstancedMesh(geo, mat, N);
  mesh.castShadow = true; mesh.receiveShadow = true;
  mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  mesh.frustumCulled = false;
  scene.add(mesh);

  const baseCol = new THREE.Color('#FBF8F2'), mistCol = new THREE.Color('#E4E9EF');
  const typeCol = Object.fromEntries(Object.entries(TYPE_COL).map(([k, v]) => [k, new THREE.Color(v)]));
  // flancs des collines : teinte pâle (brume pour les casinos), le cœur prend la couleur du type
  const flankCol = { casino: new THREE.Color('#A9C0DB'), club: new THREE.Color('#E8B4B9'), hotel: new THREE.Color('#F4DD9C') };
  const tmpC = new THREE.Color(), m4 = new THREE.Matrix4();
  cols.forEach((c, i) => { c.col = baseCol.clone().lerp(mistCol, Math.max(0, noise(c.x * 1.7 + 3, c.z * 1.7) - .45) * .9); mesh.setColorAt(i, c.col); });

  // jetons
  const tokens = new THREE.Group(); scene.add(tokens);
  const hitGeo = new THREE.CylinderGeometry(.22, .22, 2, 10); hitGeo.translate(0, 1, 0);
  const hitMat = new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false, colorWrite: false });
  const discGeo = new THREE.CylinderGeometry(.088, .088, .03, 40);
  const rimGeo = new THREE.CylinderGeometry(.104, .104, .022, 40);
  const ringGeo = new THREE.TorusGeometry(.132, .022, 14, 48); ringGeo.rotateX(Math.PI / 2);
  const ringSoloGeo = new THREE.TorusGeometry(.1, .032, 14, 48); ringSoloGeo.rotateX(Math.PI / 2);
  const stemMat = new THREE.MeshBasicMaterial({ color: 0x0B1B2E, transparent: true, opacity: .4 });
  const stemGeo = new THREE.CylinderGeometry(.006, .006, 1, 6); stemGeo.translate(0, .5, 0);
  const hits = [];
  spots.forEach((s, k) => {
    const g = new THREE.Group(); g.position.set(s.x, 0, s.z);
    const head = new THREE.Group();
    const mk = (geo, color, rough = .45) => { const m = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ color, roughness: rough, metalness: 0, transparent: true })); m.castShadow = true; return m; };
    const solo = s.types.length === 1 && s.type === 'hotel';
    if (solo) head.add(mk(ringSoloGeo, TOKEN_COL.hotel, .5));
    else {
      const rim = mk(rimGeo, '#FFFFFF', .6); rim.position.y = -.004; head.add(rim);
      head.add(mk(discGeo, TOKEN_COL[s.type]));
      if (s.types.includes('hotel')) head.add(mk(ringGeo, TOKEN_COL.hotel, .5));
    }
    const stem = new THREE.Mesh(stemGeo, stemMat.clone());
    const hit = new THREE.Mesh(hitGeo, hitMat); hit.userData.k = k; hits.push(hit);
    g.add(stem, head, hit); tokens.add(g);
    s.g = g; s.head = head; s.stem = stem;
    s.mats = []; head.traverse(o => o.material && s.mats.push(o.material));
  });

  /* ---- fiche ---- */
  const card = document.createElement('div'); card.className = 'smb-card'; card.setAttribute('aria-hidden', 'true');
  stage.appendChild(card);
  let cardSpot = null;
  const fillCard = s => { card.textContent = ''; s.items.forEach(p => { const row = document.createElement('div'); row.className = 'smb-' + p.type; const b = document.createElement('b'); b.textContent = p.name; const sp = document.createElement('span'); sp.textContent = p.city; row.append(b, sp); card.appendChild(row); }); };

  /* ---- caméra : plongée ~38°, cadrage calculé pour que la carte remplisse la scène ---- */
  const target = new THREE.Vector3(0, .15, 0);
  const PITCH = 38 * Math.PI / 180, YAW = -9 * Math.PI / 180;
  let dist = 20, vw = 1, vh = 1;
  const par = { x: 0, y: 0, tx: 0, ty: 0 };
  const place = (yaw, pitch) => {
    camera.position.set(target.x + dist * Math.sin(yaw) * Math.cos(pitch), target.y + dist * Math.sin(pitch), target.z + dist * Math.cos(yaw) * Math.cos(pitch));
    camera.lookAt(target); camera.updateMatrixWorld();
  };
  const corners = [];
  for (const x of [-W / 2, W / 2]) for (const z of [-H / 2, H / 2]) for (const y of [0, 1.05]) corners.push(new THREE.Vector3(x, y, z));
  // points de silhouette plus fins que la boîte englobante : les colonnes extrêmes
  const hull = cols.filter((c, i) => i % 3 === 0).map(c => new THREE.Vector3(c.x, .12, c.z));
  spots.forEach(s => hull.push(new THREE.Vector3(s.x, s.amp + .45, s.z)));
  const v = new THREE.Vector3();
  const bounds = () => { let a = Infinity, b = -Infinity, c = Infinity, d = -Infinity; hull.forEach(p => { v.copy(p).project(camera); a = Math.min(a, v.x); b = Math.max(b, v.x); c = Math.min(c, v.y); d = Math.max(d, v.y); }); return [a, b, c, d]; };
  const fit = () => {
    camera.aspect = vw / vh; camera.clearViewOffset(); camera.updateProjectionMatrix();
    let lo = 4, hi = 120;
    for (let it = 0; it < 26; it++) {
      dist = (lo + hi) / 2; place(YAW, PITCH);
      const [a, b, c, d] = bounds();
      ((b - a) / 2 > .94 || (d - c) / 2 > .9) ? lo = dist : hi = dist;
    }
    dist = hi; place(YAW, PITCH);
    const [a, b, c, d] = bounds();
    camera.setViewOffset(vw, vh, (a + b) / 2 * vw / 2, -((c + d) / 2 - .02) * vh / 2, vw, vh);
    camera.updateProjectionMatrix();
  };
  const resize = () => {
    const w = stage.clientWidth, h = stage.clientHeight;
    if (!w || !h) return;
    vw = w; vh = h; renderer.setSize(w, h, false); fit(); kick();
  };

  /* ---- état et animation ---- */
  let tLive = reduceMotion ? -1e9 : null, last = 0;
  const filterOf = () => box.dataset.filter || '';
  const update = now => {
    const t = tLive == null ? -1 : (now - tLive) / 1000;
    const dt = Math.min(.05, last ? (now - last) / 1000 : .016); last = now;
    let busy = tLive != null && t < 4.2;
    const k = 1 - Math.exp(-dt * 7);
    // parallaxe
    par.x += (par.tx - par.x) * k * .6; par.y += (par.ty - par.y) * k * .6;
    if (Math.abs(par.tx - par.x) + Math.abs(par.ty - par.y) > .0005) busy = true;
    place(YAW + par.x * .07, PITCH + par.y * .035);
    // collines : gonflement au survol, atténuation par le filtre
    const f = filterOf();
    spots.forEach(s => {
      const tb = (s.hover || s.lit) ? 1 : 0, td = !f || s.types.includes(f) ? 1 : 0;
      s.boost += (tb - s.boost) * k; s.dim += (td - s.dim) * k;
      if (Math.abs(tb - s.boost) + Math.abs(td - s.dim) > .002) busy = true;
      s.grow = easeQ((t - s.delay) / 1.3);
      s.h = s.amp * s.grow * (.4 + .6 * s.dim) * (1 + .8 * s.boost);
      s.tint = s.dim;
    });
    for (let i = 0; i < N; i++) {
      const c = cols[i], g = ease((t - c.delay) / .9);
      let hmax = 0, hsum = 0, cw = 0;
      tmpC.copy(c.col);
      for (let j = 0; j < c.hills.length; j += 2) {
        const s = spots[c.hills[j]], w = c.hills[j + 1], hh = s.h * w;
        hsum += hh; if (hh > hmax) hmax = hh;
        const tw = w * s.grow * (.18 + .7 * s.tint);
        if (tw > cw) cw = tw;
        if (tw > .005) { tmpC.lerp(flankCol[s.type], Math.min(1, tw * 1.7) * .85); const q = Math.min(1, Math.max(0, (tw - .4) / .6)); if (q > 0) tmpC.lerp(typeCol[s.type], q * q * .8); }
      }
      const h = Math.max(.002, c.base * g + hmax + .3 * (hsum - hmax));
      m4.makeScale(1, h, 1); m4.setPosition(c.x, 0, c.z);
      mesh.setMatrixAt(i, m4); mesh.setColorAt(i, tmpC);
    }
    mesh.instanceMatrix.needsUpdate = true; mesh.instanceColor.needsUpdate = true;
    // jetons
    spots.forEach(s => {
      const top = s.h + .06, a = easeQ((t - s.delay - .55) / .7);
      s.head.position.y = top + .2 + .06 * s.boost;
      s.head.scale.setScalar(Math.max(.001, a * (1 + .35 * s.boost)));
      s.stem.position.y = 0; s.stem.scale.y = Math.max(.001, (top + .2) * a);
      const op = .18 + .82 * s.dim;
      s.mats.forEach(m => { m.opacity = op; });
      s.stem.material.opacity = .4 * op * a;
      s.g.visible = a > .001;
    });
    // fiche
    if (cardSpot) {
      v.set(cardSpot.x, cardSpot.head.position.y + .1, cardSpot.z).project(camera);
      const px = (v.x + 1) / 2 * vw, py = (1 - v.y) / 2 * vh, cw = card.offsetWidth, ch = card.offsetHeight;
      const left = Math.max(4, Math.min(vw - cw - 4, px - cw / 2)), top = py - ch - 16 < -8 ? py + 30 : py - ch - 16;
      card.style.setProperty('--x', left.toFixed(1) + 'px');
      card.style.setProperty('--y', top.toFixed(1) + 'px');
    }
    return busy;
  };

  let raf = 0, visible = false;
  const frame = now => { raf = 0; const busy = update(now); renderer.render(scene, camera); if (busy && visible) kick(); };
  function kick() { if (!raf && visible) raf = requestAnimationFrame(frame); }

  const setCard = () => {
    const s = spots.find(s => s.hover) || spots.find(s => s.lit) || null;
    if (s && s !== cardSpot) fillCard(s);
    if (s) cardSpot = s;
    card.classList.toggle('on', !!s);
    kick();
  };

  /* ---- interactions ---- */
  const ray = new THREE.Raycaster(), ndc = new THREE.Vector2();
  canvas.addEventListener('pointermove', e => {
    const rc = canvas.getBoundingClientRect();
    ndc.set((e.clientX - rc.left) / rc.width * 2 - 1, -((e.clientY - rc.top) / rc.height) * 2 + 1);
    if (!reduceMotion) { par.tx = ndc.x; par.ty = ndc.y; }
    ray.setFromCamera(ndc, camera);
    const hit = ray.intersectObjects(hits, false)[0];
    const k = hit && spots[hit.object.userData.k].g.visible ? hit.object.userData.k : -1;
    spots.forEach((s, i) => { s.hover = i === k; });
    canvas.style.cursor = k >= 0 ? 'pointer' : '';
    setCard();
  });
  canvas.addEventListener('pointerleave', () => { par.tx = 0; par.ty = 0; spots.forEach(s => { s.hover = false; }); canvas.style.cursor = ''; setCard(); });

  box.querySelectorAll('.hs-legend li').forEach(li => {
    li.addEventListener('mouseenter', () => { box.dataset.filter = li.dataset.type; });
    li.addEventListener('mouseleave', () => { delete box.dataset.filter; });
  });
  new MutationObserver(kick).observe(box, { attributes: true, attributeFilter: ['data-filter'] });
  document.addEventListener('dest:hover', e => { spots.forEach(s => { s.lit = !!e.detail && s.names.includes(e.detail); }); setCard(); });
  document.addEventListener('dest:filter', e => { if (e.detail === 'all') delete box.dataset.filter; else box.dataset.filter = e.detail; kick(); });

  new ResizeObserver(resize).observe(stage);
  new IntersectionObserver(([e]) => {
    visible = e.isIntersecting;
    if (visible) {
      if (tLive == null && e.intersectionRatio >= .2) { tLive = performance.now(); box.classList.add('live'); }
      kick();
    }
  }, { threshold: [0, .2, .4] }).observe(box);
  if (reduceMotion) box.classList.add('live');
  resize();
  box.classList.add('ready');
}
