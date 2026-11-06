/* Groupe Tranchant — Présentation du groupe : la maquette d'architecte.
   Une scène reste collée pendant tout le récit ; le texte passe devant dans des panneaux de verre.
   Au départ, tout n'est qu'un plan bleu (les arêtes des bâtiments à venir) ; le défilement fait sortir de terre,
   chapitre après chapitre, ce que raconte le texte :
   1. 1988, le premier casino ; 2. le monument historique, l'hôtel et un second casino ; 3. la citation, au pied
   du casino ; 4. vue d'ensemble ; 5. le complexe de loisirs ; 6. parkings, routes et circulation ;
   7. les acquisitions, plateaux satellites reliés par des ponts de lumière ; 8. la digitalisation, réseau bleu.
   Contrat : mountGm(root, { reduceMotion }). Sans WebGL ou en mouvement réduit, le texte se lit seul. */
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { gold, glow, canvasTex, ACC, GOLD } from './spec-hero.js';

const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const ease = t => t * t * (3 - 2 * t);
const back = t => { const c = 1.4; return 1 + (c + 1) * (t - 1) ** 3 + c * (t - 1) ** 2; };
const lerp = (a, b, k) => a + (b - a) * k;

// caméra par chapitre : position, cible, décalage de l'image (côté opposé au panneau)
const CAM = [
  [[11, 12.5, 15], [.5, 0, 0], .14],
  [[4.6, 3.1, 5.6], [.3, .45, -1.3], .17],
  [[-1.5, 7.5, 11.5], [-.6, .4, -.6], -.17],
  [[1.1, .62, 2.4], [.3, .75, -1.4], 0],
  [[-10, 9.5, 10.5], [0, 0, 0], .15],
  [[9.5, 4.8, 8.8], [3.6, .5, 2.4], -.15],
  [[13, 7.5, 5], [2.5, 0, 1.2], .15],
  [[-3, 25, 30], [1.5, -.6, -1.4], -.1],
  [[8, 11, 13.5], [0, .7, 0], .15]
];

export function mountGm(root, { reduceMotion }) {
  const stage = root.querySelector('.gm-stage'), host = root.querySelector('.gm-gl');
  const beats = [...root.querySelectorAll('[data-beat]')];
  const panels = [...root.querySelectorAll('.gm-panel, .gm-quote')];
  // les panneaux : chaque bloc entre quand il arrive dans l'écran ; l'année se colore
  const io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } }), { rootMargin: '0px 0px -12% 0px' });
  panels.forEach(p => io.observe(p));

  const hasGL = (() => { try { const c = document.createElement('canvas'); return !!(c.getContext('webgl2') || c.getContext('webgl')); } catch { return false; } })();
  if (reduceMotion || !hasGL) { root.classList.add('gm-still'); return; }
  root.classList.add('gm-live');

  const small = () => innerWidth < 760;
  const renderer = new THREE.WebGLRenderer({ antialias: false, alpha: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, small() ? 1.5 : 1.6));
  renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.05;
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  host.append(renderer.domElement);
  const scene = new THREE.Scene(); scene.background = new THREE.Color(0x0a1828);
  const pm = new THREE.PMREMGenerator(renderer);
  scene.environment = pm.fromScene(new RoomEnvironment(), .04).texture; scene.environmentIntensity = .32;
  const camera = new THREE.PerspectiveCamera(32, 1, .1, 200);

  /* --- lumières : clair de lune froid, puis les lumières chaudes des établissements --- */
  scene.add(new THREE.HemisphereLight(0x8fb0e0, 0x0b1b2e, .5));
  const moon = new THREE.DirectionalLight(0xc6d6ff, 1.5); moon.position.set(-9, 15, 7);
  moon.castShadow = true; moon.shadow.mapSize.set(2048, 2048);
  Object.assign(moon.shadow.camera, { left: -15, right: 15, top: 15, bottom: -15, near: 1, far: 50 });
  moon.shadow.bias = -.0004; moon.shadow.normalBias = .02;
  scene.add(moon);
  const warm = [[.3, 1.2, .2, 1], [-4.2, 1.1, -.4, 2], [3.6, 1.4, 4.6, 5]].map(([x, y, z, b]) => { const l = new THREE.PointLight(0xffb764, 0, 7, 2); l.position.set(x, y, z); scene.add(l); return { l, b }; });

  /* --- le plateau : laque marine, filet doré, plan gravé (routes, parcelles, trame bleue) --- */
  const PW = 18, PD = 12;
  const plinth = new THREE.Mesh(new THREE.BoxGeometry(PW, .6, PD), new THREE.MeshPhysicalMaterial({ color: 0x0c1a2c, metalness: .3, roughness: .38, clearcoat: 1, clearcoatRoughness: .1 }));
  plinth.position.y = -.3; plinth.receiveShadow = true; scene.add(plinth);
  const edge = new THREE.Mesh(new THREE.BoxGeometry(PW + .04, .03, PD + .04), gold(.25)); edge.position.y = -.015; scene.add(edge);
  const X = x => (x + PW / 2) / PW, Z = z => (z + PD / 2) / PD;
  const roadsZ = [[.35, 1.25]], roadsX = [[-1.95, -1.25], [5.6, 6.3]];
  const plan = canvasTex(2048, 1366, (c, w, h) => {
    c.fillStyle = '#16263a'; c.fillRect(0, 0, w, h);
    // parcelles : léger damier
    c.fillStyle = '#192b41';
    for (let i = 0; i < 18; i++) for (let j = 0; j < 12; j++) if ((i + j) % 2) c.fillRect(i / 18 * w, j / 12 * h, w / 18, h / 12);
    c.fillStyle = '#26394f';
    roadsZ.forEach(([a, b]) => c.fillRect(0, Z(a) * h, w, (Z(b) - Z(a)) * h));
    roadsX.forEach(([a, b]) => c.fillRect(X(a) * w, 0, (X(b) - X(a)) * w, h));
    c.fillStyle = 'rgba(245,241,234,.35)';
    for (let x = 0; x < w; x += 46) c.fillRect(x, Z(.8) * h - 1.5, 24, 3);
    roadsX.forEach(([a, b]) => { for (let y = 0; y < h; y += 46) c.fillRect(X((a + b) / 2) * w - 1.5, y, 3, 24); });
    // trottoirs
    c.strokeStyle = 'rgba(245,241,234,.18)'; c.lineWidth = 2;
    roadsZ.forEach(([a, b]) => [a - .12, b + .12].forEach(z => { c.beginPath(); c.moveTo(0, Z(z) * h); c.lineTo(w, Z(z) * h); c.stroke(); }));
  });
  const grid = canvasTex(2048, 1366, (c, w, h) => {
    c.fillStyle = '#000'; c.fillRect(0, 0, w, h);
    c.strokeStyle = 'rgba(127,168,218,.55)'; c.lineWidth = 1;
    for (let i = 0; i <= 72; i++) { const x = i / 72 * w; c.beginPath(); c.moveTo(x, 0); c.lineTo(x, h); c.stroke(); }
    for (let j = 0; j <= 48; j++) { const y = j / 48 * h; c.beginPath(); c.moveTo(0, y); c.lineTo(w, y); c.stroke(); }
    c.lineWidth = 2.5; c.strokeStyle = 'rgba(127,168,218,.9)';
    for (let i = 0; i <= 18; i += 3) { const x = i / 18 * w; c.beginPath(); c.moveTo(x, 0); c.lineTo(x, h); c.stroke(); }
    for (let j = 0; j <= 12; j += 3) { const y = j / 12 * h; c.beginPath(); c.moveTo(0, y); c.lineTo(w, y); c.stroke(); }
  });
  const topMat = new THREE.MeshStandardMaterial({ map: plan, emissive: 0xffffff, emissiveMap: grid, emissiveIntensity: .16, roughness: .75, metalness: .1 });
  const top = new THREE.Mesh(new THREE.PlaneGeometry(PW, PD), topMat); top.rotation.x = -Math.PI / 2; top.position.y = .002; top.receiveShadow = true; scene.add(top);

  /* --- matériaux de maquette --- */
  const ivory = () => new THREE.MeshStandardMaterial({ color: 0xbdb5a5, roughness: .85, metalness: 0, envMapIntensity: .5 });
  const slate = () => new THREE.MeshStandardMaterial({ color: 0x2b3646, roughness: .6, metalness: .2 });
  const WIN = canvasTex(128, 128, (c, w, h) => {
    c.fillStyle = '#000'; c.fillRect(0, 0, w, h);
    for (let j = 0; j < 4; j++) for (let i = 0; i < 4; i++) { const k = Math.random(); c.fillStyle = k < .25 ? '#2a1a08' : k < .6 ? '#c98a3a' : '#ffd590'; c.fillRect(i * 32 + 9, j * 32 + 7, 14, 18); }
  });
  WIN.wrapS = WIN.wrapT = THREE.RepeatWrapping;
  const lit = (rx, ry, base = 0xbdb5a5) => { const t = WIN.clone(); t.repeat.set(rx, ry); t.needsUpdate = true; return new THREE.MeshStandardMaterial({ color: base, roughness: .82, metalness: 0, envMapIntensity: .5, emissive: 0xffc27a, emissiveMap: t, emissiveIntensity: 0 }); };
  const box = (w, h, d, m) => { const g = new THREE.BoxGeometry(w, h, d); g.translate(0, h / 2, 0); return new THREE.Mesh(g, m); };
  const at = (o, x, y, z) => { o.position.set(x, y, z); return o; };

  /* --- chaque bâtiment : un volume plein qui monte, doublé de ses arêtes (le plan) --- */
  const builds = [];
  const wireMatBase = new THREE.LineBasicMaterial({ color: ACC, transparent: true, opacity: .3, depthWrite: false });
  function building(make, x, z, beat, delay = 0, ry = 0) {
    const solid = new THREE.Group(); const lights = [], glows = [];
    make(solid, lights, glows);
    solid.updateMatrixWorld(true);
    const wire = new THREE.Group(), wm = wireMatBase.clone();
    solid.traverse(o => { if (o.isMesh && !o.userData.noWire) { const l = new THREE.LineSegments(new THREE.EdgesGeometry(o.geometry, 28), wm); l.applyMatrix4(o.matrixWorld); wire.add(l); } if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
    const g = new THREE.Group(); g.add(solid, wire); g.position.set(x, 0, z); g.rotation.y = ry; scene.add(g);
    const b = { g, solid, wire, wm, lights, glows, beat, delay, a: -1 };
    builds.push(b); return b;
  }
  const setBuild = (b, s) => {
    const a = clamp((s - (b.beat - .9) - b.delay) / .7);
    if (Math.abs(a - b.a) < 1e-4) return; b.a = a;
    b.solid.visible = a > .001; b.solid.scale.set(1, Math.max(.001, back(a)), 1);
    b.wm.color.setHex(a > .02 ? GOLD : ACC); b.wm.opacity = a > .02 ? .12 + .7 * Math.sin(Math.PI * Math.min(1, a * 1.15)) * (1 - a * .8) : .3;
    const on = clamp((a - .7) / .3);
    b.lights.forEach(m => { m.emissiveIntensity = (m.userData.k || 1.5) * on; });
    b.glows.forEach(m => { m.visible = on > .01; });
  };

  // 1. le premier casino (1988) : galerie d'arcades, marquise dorée, dôme
  const B0 = building((s, L, G) => {
    const w = lit(4, 1.4); L.push(w);
    s.add(at(box(2.4, .55, 1.3, w), 0, 0, -.15));
    s.add(at(box(2.6, .08, 1.5, ivory()), 0, .55, -.15));
    const drum = new THREE.Mesh(new THREE.CylinderGeometry(.42, .46, .22, 40), ivory()); drum.position.set(0, .74, -.15); s.add(drum);
    const dome = new THREE.Mesh(new THREE.SphereGeometry(.42, 40, 20, 0, Math.PI * 2, 0, Math.PI / 2), gold(.22)); dome.position.set(0, .85, -.15); s.add(dome);
    const lan = new THREE.Mesh(new THREE.CylinderGeometry(.05, .07, .16, 16), gold(.22)); lan.position.set(0, 1.32, -.15); s.add(lan);
    for (let i = 0; i < 9; i++) { const p = box(.08, .5, .08, ivory()); p.position.set(-1.1 + i * .275, 0, .58); s.add(p); }
    s.add(at(box(2.4, .07, .22, ivory()), 0, .5, .56));
    const canopy = box(.8, .03, .45, gold(.25)); canopy.position.set(0, .34, .78); s.add(canopy);
    const sign = new THREE.Mesh(new THREE.BoxGeometry(.6, .05, .01), glow(GOLD, 2.6)); sign.position.set(0, .47, .68); sign.userData.noWire = true; s.add(sign); G.push(sign);
    for (let k = 0; k < 3; k++) { const st = box(.9 + k * .16, .03, .12, ivory()); st.position.set(0, 0, .82 + k * .1); s.add(st); }
  }, .3, -1.2, 1);

  // 2. monument historique : perron, colonnade, fronton, toiture d'ardoise
  building((s, L) => {
    for (let k = 0; k < 3; k++) s.add(at(box(2.9 - k * .1, .06, 1.9 - k * .1, ivory()), 0, k * .06, 0));
    const w = lit(5, 1.6); L.push(w);
    s.add(at(box(2.5, .7, 1.2, w), 0, .18, -.2));
    for (let i = 0; i < 8; i++) { const c = new THREE.Mesh(new THREE.CylinderGeometry(.055, .065, .62, 14), ivory()); c.position.set(-1.05 + i * .3, .49, .55); s.add(c); }
    s.add(at(box(2.5, .1, .5, ivory()), 0, .8, .4));
    const ped = new THREE.Mesh(new THREE.CylinderGeometry(.42, .42, 2.5, 3), ivory()); ped.rotation.z = Math.PI / 2; ped.scale.set(1, 1, .45); ped.position.set(0, 1.05, .45); s.add(ped);
    const roof = box(2.5, .32, 1.1, slate()); roof.position.set(0, .88, -.25); s.add(roof);
    const tam = new THREE.Mesh(new THREE.CircleGeometry(.09, 24), gold(.2)); tam.position.set(0, 1.0, .645); s.add(tam);
  }, -4.4, -1.6, 2, .0);

  // 2. l'hôtel : socle, tour, couronne dorée et enseigne
  building((s, L, G) => {
    const w0 = lit(3, 1); L.push(w0);
    s.add(at(box(1.9, .45, 1.7, w0), 0, 0, 0));
    const w = lit(3, 7); w.userData.k = 1.7; L.push(w);
    s.add(at(box(1.1, 2.3, 1.1, w), 0, .45, -.1));
    s.add(at(box(1.2, .1, 1.2, gold(.25)), 0, 2.75, -.1));
    const sign = new THREE.Mesh(new THREE.BoxGeometry(.7, .08, .01), glow(GOLD, 2.4)); sign.position.set(0, 2.62, .46); sign.userData.noWire = true; s.add(sign); G.push(sign);
  }, 3.9, -2.3, 2, .12);

  // 2. second casino, contemporain : façade courbe vitrée, toit doré
  building((s, L) => {
    const glass = new THREE.MeshPhysicalMaterial({ color: 0x1b3554, metalness: .5, roughness: .12, clearcoat: 1, envMapIntensity: 1, emissive: 0xffc27a, emissiveIntensity: 0 });
    const t = WIN.clone(); t.repeat.set(8, 1.2); t.needsUpdate = true; glass.emissiveMap = t; glass.userData.k = 1.2; L.push(glass);
    const g = new THREE.CylinderGeometry(1.15, 1.15, .75, 48, 1, false, -Math.PI / 2, Math.PI); g.translate(0, .375, 0);
    s.add(new THREE.Mesh(g, glass));
    s.add(at(box(2.3, .75, .5, ivory()), 0, 0, -.25));
    const r = new THREE.CylinderGeometry(1.22, 1.22, .07, 48, 1, false, -Math.PI / 2, Math.PI); r.translate(0, .785, 0); s.add(new THREE.Mesh(r, gold(.25)));
    s.add(at(box(2.44, .07, .56, gold(.25)), 0, .75, -.25));
  }, -4, 2.9, 2, .24);

  // 5. le complexe de loisirs : grand socle, toiture en voûte, tour, salle de spectacle
  const BX = building((s, L, G) => {
    const w = lit(6, 1.2); L.push(w);
    s.add(at(box(3.4, .5, 2.1, w), 0, 0, 0));
    const vault = new THREE.Mesh(new THREE.CylinderGeometry(1, 1, 3.3, 48, 1, false, -Math.PI / 2, Math.PI), new THREE.MeshStandardMaterial({ color: 0x8f897e, roughness: .55, metalness: .25, envMapIntensity: .45 }));
    vault.rotation.z = Math.PI / 2; vault.scale.set(.55, 1, 1); vault.position.set(0, .5, 0); s.add(vault);
    for (let i = 0; i < 7; i++) { const rib = new THREE.Mesh(new THREE.TorusGeometry(1, .015, 6, 40, Math.PI), gold(.25)); rib.rotation.y = Math.PI / 2; rib.scale.set(1, .55, 1); rib.position.set(-1.5 + i * .5, .5, 0); s.add(rib); }
    const wt = lit(2, 5); wt.userData.k = 1.7; L.push(wt);
    s.add(at(box(.8, 1.8, .8, wt), 1.9, 0, -1.2));
    const hall = new THREE.Mesh(new THREE.CylinderGeometry(.62, .66, .7, 40), ivory()); hall.geometry.translate(0, .35, 0); hall.position.set(-2.1, 0, -1.1); s.add(hall);
    const hr = new THREE.Mesh(new THREE.TorusGeometry(.63, .025, 8, 48), gold(.2)); hr.rotation.x = Math.PI / 2; hr.position.set(-2.1, .72, -1.1); s.add(hr);
    const sign = new THREE.Mesh(new THREE.BoxGeometry(1.2, .06, .01), glow(GOLD, 2.2)); sign.position.set(0, .42, 1.06); sign.userData.noWire = true; s.add(sign); G.push(sign);
  }, 3.6, 3.2, 5);

  // 6. parkings : grands plateaux tracés, voitures garées
  const lotTex = canvasTex(256, 256, (c, w, h) => { c.fillStyle = '#1f2d40'; c.fillRect(0, 0, w, h); c.strokeStyle = 'rgba(245,241,234,.55)'; c.lineWidth = 2; for (let r = 0; r < 4; r++) for (let i = 0; i <= 10; i++) { const y = 18 + r * 60; c.beginPath(); c.moveTo(14 + i * 22.8, y); c.lineTo(14 + i * 22.8, y + 34); c.stroke(); } });
  const lots = [[7.4, 3.3, 2.6, 2.6], [-7.3, -3, 2.6, 2.6], [-.2, 3.4, 3, 1.5]].map(([x, z, w, d], k) => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, d), new THREE.MeshStandardMaterial({ map: lotTex, roughness: .8, transparent: true, opacity: 0 }));
    m.rotation.x = -Math.PI / 2; m.position.set(x, .006, z); m.receiveShadow = true; scene.add(m); return { m, x, z, w, d, k };
  });
  const carGeo = new THREE.BoxGeometry(.19, .085, .1); carGeo.translate(0, .045, 0);
  const parked = new THREE.InstancedMesh(carGeo, new THREE.MeshStandardMaterial({ roughness: .4, metalness: .5 }), 90); parked.castShadow = true;
  const PAL = [0xe6e1d6, 0x3a4658, 0x9aa4b2, 0x8a1a22, 0x1c2a3c, 0xc8a35a].map(c => new THREE.Color(c));
  const slots = [];
  lots.forEach(L => { for (let r = 0; r < 4; r++) for (let i = 0; i < 10; i++) if (Math.random() < .62 && slots.length < 90) slots.push([L.x - L.w / 2 + (14 + i * 22.8 + 11) / 256 * L.w, L.z - L.d / 2 + (18 + r * 60 + 17) / 256 * L.d, L.k]); });
  slots.forEach((_, i) => parked.setColorAt(i, PAL[i % PAL.length]));
  parked.count = slots.length; scene.add(parked);

  // trafic : phares blancs dans un sens, feux rouges dans l'autre
  const dot = new THREE.SphereGeometry(.04, 10, 8);
  const mkFlow = (color, n) => { const m = new THREE.InstancedMesh(dot, new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false }), n); scene.add(m); return m; };
  const heads = mkFlow(0xfff2d6, 40), tails = mkFlow(0xff3030, 40);
  const cars = Array.from({ length: 40 }, (_, i) => ({ o: Math.random(), v: .035 + Math.random() * .025, lane: i % 4 }));

  // réverbères et arbres le long de l'avenue
  const poles = [], trees = [];
  for (let x = -8.4; x <= 8.4; x += 1.4) {
    if (roadsX.some(([a, b]) => x > a - .3 && x < b + .3)) continue;
    poles.push([x, .2], [x + .7, 1.4]);
    if (Math.abs(x - .3) > 1.6) trees.push([x + .35, -.05], [x + 1.05, 1.62]);
  }
  for (let i = 0; i < 26; i++) { const x = -8.5 + Math.random() * 17, z = -5.5 + Math.random() * 3.2; if (Math.abs(x + 4.4) > 1.8 && Math.abs(x - 3.9) > 1.3 && Math.abs(x - .3) > 1.6 && Math.abs(x - -1.6) > .6) trees.push([x, z]); }
  for (let i = 0; i < 18; i++) { const x = -8.5 + Math.random() * 17, z = 4.7 + Math.random() * .9; trees.push([x, z]); }
  const poleM = new THREE.InstancedMesh(new THREE.CylinderGeometry(.012, .016, .36, 6).translate(0, .18, 0), gold(.3), poles.length);
  const lampM = new THREE.InstancedMesh(new THREE.SphereGeometry(.035, 10, 8), glow(0xffd08a, 3), poles.length);
  const treeM = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(.17, 1).translate(0, .26, 0), new THREE.MeshStandardMaterial({ color: 0x55705c, roughness: .95, metalness: 0, flatShading: true }), trees.length);
  treeM.castShadow = true; poleM.castShadow = true; scene.add(poleM, lampM, treeM);
  const mtx = new THREE.Matrix4(), q0 = new THREE.Quaternion(), v3 = new THREE.Vector3(), sc = new THREE.Vector3();

  /* --- 7. acquisitions : plateaux satellites, en France et à l'international, reliés par des ponts de lumière --- */
  const sats = [[-12.6, -1.2, 3.8, -PW / 2, 3], [12.6, -1, -3.2, PW / 2, -2], [3, -1.1, -10, 2, -PD / 2]].map(([x, y, z, sx, sz], k) => {
    const g = new THREE.Group();
    const p = new THREE.Mesh(new THREE.BoxGeometry(3.4, .4, 2.6), plinth.material); p.position.y = -.2; p.receiveShadow = true; g.add(p);
    const e = new THREE.Mesh(new THREE.BoxGeometry(3.44, .03, 2.64), gold(.25)); e.position.y = -.015; g.add(e);
    const t = new THREE.Mesh(new THREE.PlaneGeometry(3.4, 2.6), topMat); t.rotation.x = -Math.PI / 2; t.position.y = .003; g.add(t);
    const w = lit(3, 1.3); w.emissiveIntensity = 1.4;
    const b = box(1.6 - k * .2, .5 + k * .5, 1, w); b.castShadow = true; g.add(b);
    if (k === 0) { const d = new THREE.Mesh(new THREE.SphereGeometry(.32, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2), gold(.22)); d.position.y = .5; g.add(d); }
    else g.add(at(box(1.7 - k * .2, .07, 1.1, gold(.25)), 0, .5 + k * .5, 0));
    g.position.set(x * 1.6, y - 4, z * 1.6); scene.add(g);
    const end = new THREE.Vector3(x, y + .1, z), start = new THREE.Vector3(sx, 0, sz);
    const mid = start.clone().lerp(end, .5); mid.y += 2.4;
    const curve = new THREE.QuadraticBezierCurve3(start, mid, end);
    const tube = new THREE.Mesh(new THREE.TubeGeometry(curve, 64, .025, 8), new THREE.MeshBasicMaterial({ color: GOLD, transparent: true, opacity: .9, blending: THREE.AdditiveBlending, depthWrite: false }));
    tube.geometry.setDrawRange(0, 0); scene.add(tube);
    const pulse = new THREE.Mesh(new THREE.SphereGeometry(.07, 12, 8), new THREE.MeshBasicMaterial({ color: 0xffe3a0, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false })); scene.add(pulse);
    return { g, x, y, z, tube, curve, pulse, n: tube.geometry.index.count, k };
  });

  /* --- 8. digitalisation : arcs bleus entre les bâtiments, impulsions, anneaux holographiques --- */
  const nodes = [[.3, 1.4, -1.35], [-4.4, 1.25, -1.6], [3.9, 2.9, -2.4], [-4, .9, 2.9], [3.6, 1.1, 3.2], [5.5, 1.9, 2]];
  const pairs = [[0, 1], [0, 2], [0, 3], [0, 4], [2, 4], [1, 3], [2, 5], [4, 5], [1, 2], [3, 4]];
  const netMat = new THREE.MeshBasicMaterial({ color: 0x6fb0ff, transparent: true, opacity: .85, blending: THREE.AdditiveBlending, depthWrite: false });
  const arcs = pairs.map(([i, j], k) => {
    const a = new THREE.Vector3(...nodes[i]), b = new THREE.Vector3(...nodes[j]), m = a.clone().lerp(b, .5); m.y += 1.4 + a.distanceTo(b) * .12;
    const curve = new THREE.QuadraticBezierCurve3(a, m, b);
    const tube = new THREE.Mesh(new THREE.TubeGeometry(curve, 48, .014, 6), netMat); tube.geometry.setDrawRange(0, 0); scene.add(tube);
    const p = new THREE.Mesh(new THREE.SphereGeometry(.045, 10, 8), new THREE.MeshBasicMaterial({ color: 0xbfe0ff, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false })); scene.add(p);
    return { tube, curve, p, n: tube.geometry.index.count, k };
  });
  const holo = new THREE.Group(); holo.position.set(.3, 1.6, -1.35); scene.add(holo);
  const rings = [.5, .72, .95].map((r, k) => { const m = new THREE.Mesh(new THREE.TorusGeometry(r, .008, 6, 96), new THREE.MeshBasicMaterial({ color: 0x7fb6ff, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false })); m.rotation.x = Math.PI / 2; m.position.y = k * .22; holo.add(m); return m; });
  const beamG = new THREE.CylinderGeometry(.06, .28, 4, 24, 1, true); beamG.translate(0, 2, 0);
  const beam = new THREE.Mesh(beamG, new THREE.MeshBasicMaterial({ color: 0x7fb6ff, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide })); beam.position.set(.3, 1.35, -1.35); scene.add(beam);

  /* --- rendu : MSAA + halo lumineux --- */
  const rt = new THREE.WebGLRenderTarget(1, 1, { samples: 4, type: THREE.HalfFloatType });
  const composer = new EffectComposer(renderer, rt);
  composer.addPass(new RenderPass(scene, camera));
  const bloom = new UnrealBloomPass(new THREE.Vector2(1, 1), .55, .55, .82); composer.addPass(bloom);
  composer.addPass(new OutputPass());

  let W = 1, H = 1;
  const size = () => {
    W = stage.clientWidth; H = stage.clientHeight;
    renderer.setSize(W, H, false); composer.setSize(W, H);
    camera.aspect = W / H; camera.updateProjectionMatrix();
  };
  size(); addEventListener('resize', size);

  /* --- défilement → récit --- */
  let sT = 0, sS = 0, visible = true, px = 0, py = 0, tpx = 0, tpy = 0;
  new IntersectionObserver(([e]) => { visible = e.isIntersecting; }, { rootMargin: '100px 0px' }).observe(root);
  addEventListener('pointermove', e => { tpx = e.clientX / innerWidth - .5; tpy = e.clientY / innerHeight - .5; });
  const hud = root.querySelector('.gm-hud b');
  const cp = new THREE.Vector3(), ct = new THREE.Vector3(), pa = new THREE.Vector3(), pb = new THREE.Vector3();
  const clock = new THREE.Clock();

  const frame = () => {
    requestAnimationFrame(frame);
    if (!visible) return;
    const vh = innerHeight;
    sT = beats.reduce((acc, el) => acc + ease(clamp((vh * .82 - el.getBoundingClientRect().top) / (vh * .62))), 0);
    sS += (sT - sS) * .09;
    const s = sS, t = clock.getElapsedTime();
    root.style.setProperty('--gs', s.toFixed(3));
    root.style.setProperty('--gq', clamp(1 - Math.abs(s - 3) * 1.4).toFixed(3));
    hud.style.setProperty('--sp', (s / 8).toFixed(4));

    builds.forEach(b => setBuild(b, s));
    warm.forEach(({ l, b }) => { l.intensity = 5 * clamp(s - b + .3); });

    // arbres et réverbères : ceux près du premier casino d'abord, les autres avec le complexe
    const grow = (x, z, k0) => { const near = Math.hypot(x - .3, z + .6); return back(clamp((s - k0 - near * .05) / .6)); };
    poles.forEach(([x, z], i) => { const k = grow(x, z, .35); sc.set(1, Math.max(.001, k), 1); mtx.compose(v3.set(x, 0, z), q0, sc); poleM.setMatrixAt(i, mtx); mtx.compose(v3.set(x, .36 * k, z), q0, sc.setScalar(Math.max(.001, k))); lampM.setMatrixAt(i, mtx); });
    trees.forEach(([x, z], i) => { const k = grow(x, z, Math.abs(z) > 3 ? 4.3 : 1.1); mtx.compose(v3.set(x, 0, z), q0, sc.setScalar(Math.max(.001, k) * (.8 + (i % 5) * .08))); treeM.setMatrixAt(i, mtx); });
    poleM.instanceMatrix.needsUpdate = lampM.instanceMatrix.needsUpdate = treeM.instanceMatrix.needsUpdate = true;

    // parkings et trafic
    const pk = clamp(s - 5.15);
    lots.forEach(L => { L.m.material.opacity = clamp(pk * 1.6 - L.k * .2); });
    slots.forEach(([x, z, k], i) => { const a = back(clamp(pk * 2.2 - .4 - k * .25 - (i % 7) * .04)); mtx.compose(v3.set(x, (1 - Math.min(1, a)) * .8, z), q0, sc.setScalar(Math.max(.001, a))); parked.setMatrixAt(i, mtx); });
    parked.instanceMatrix.needsUpdate = true;
    const tf = clamp((s - 5.4) * 1.5);
    heads.material.opacity = tails.material.opacity = tf;
    cars.forEach((c, i) => {
      const u = ((c.o + t * c.v) % 1), lane = c.lane;
      let x, z;
      if (lane < 2) { x = lane ? -PW / 2 + u * PW : PW / 2 - u * PW; z = lane ? .58 : 1.02; }
      else { const R = roadsX[lane - 2]; x = (R[0] + R[1]) / 2 + (i % 2 ? .14 : -.14); z = (i % 2 ? -1 : 1) * (PD / 2 - u * PD); }
      mtx.compose(v3.set(x, .06, z), q0, sc.setScalar(1)); (lane === 1 || (lane > 1 && i % 2) ? heads : tails).setMatrixAt(i, mtx);
      mtx.compose(v3.set(0, -5, 0), q0, sc.setScalar(.001)); (lane === 1 || (lane > 1 && i % 2) ? tails : heads).setMatrixAt(i, mtx);
    });
    heads.instanceMatrix.needsUpdate = tails.instanceMatrix.needsUpdate = true;

    // satellites
    sats.forEach(S => {
      const a = ease(clamp((s - 6.2 - S.k * .18) / .7));
      S.g.position.set(S.x * (1.6 - .6 * a), S.y - 4 * (1 - a), S.z * (1.6 - .6 * a));
      S.g.visible = a > .001;
      const d = clamp((s - 6.6 - S.k * .18) / .5);
      S.tube.geometry.setDrawRange(0, Math.floor(S.n * d / 3) * 3);
      S.pulse.material.opacity = d >= 1 ? .9 : 0; if (d >= 1) S.pulse.position.copy(S.curve.getPoint((t * .35 + S.k / 3) % 1));
    });

    // réseau numérique
    const dg = clamp(s - 7.2);
    topMat.emissiveIntensity = .16 + dg * .55 + (s < .5 ? .1 * (1 - s * 2) : 0);
    arcs.forEach(A => {
      const d = clamp(dg * 1.8 - A.k * .07);
      A.tube.geometry.setDrawRange(0, Math.floor(A.n * d / 3) * 3);
      A.p.material.opacity = d >= 1 ? 1 : 0; if (d >= 1) A.p.position.copy(A.curve.getPoint((t * .45 + A.k * .13) % 1));
    });
    rings.forEach((r, k) => { r.material.opacity = dg * (.75 - k * .15); r.rotation.z = t * (.4 + k * .25) * (k % 2 ? -1 : 1); r.scale.setScalar(1 + Math.sin(t * 1.4 + k) * .04); });
    beam.material.opacity = dg * .12;

    // caméra : interpolation entre les plans des chapitres, dérive lente et parallaxe
    const i0 = Math.min(CAM.length - 1, Math.floor(s)), i1 = Math.min(CAM.length - 1, i0 + 1), f = ease(clamp(s - i0));
    cp.fromArray(CAM[i0][0]).lerp(pb.fromArray(CAM[i1][0]), f);
    ct.fromArray(CAM[i0][1]).lerp(pa.fromArray(CAM[i1][1]), f);
    const narrow = W < 760, zoom = narrow ? 1 + clamp(1 - W / H) * .9 : 1;
    cp.sub(ct).multiplyScalar(zoom).add(ct);
    px += (tpx - px) * .05; py += (tpy - py) * .05;
    const ang = Math.sin(t * .08) * .05 + px * .08;
    const dx = cp.x - ct.x, dz = cp.z - ct.z;
    cp.x = ct.x + dx * Math.cos(ang) - dz * Math.sin(ang); cp.z = ct.z + dx * Math.sin(ang) + dz * Math.cos(ang);
    cp.y += py * -.6;
    camera.position.copy(cp); camera.lookAt(ct);
    const off = lerp(CAM[i0][2], CAM[i1][2], f);
    if (narrow) camera.setViewOffset(W, H, 0, H * .16, W, H); else camera.setViewOffset(W, H, -off * W, 0, W, H);

    composer.render();
  };
  requestAnimationFrame(frame);
}
