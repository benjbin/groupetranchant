/* Groupe Tranchant — scène de la filiale ALIOSCOPY (activités spécialisées, accueil).
   Contrat : mount(layer, { reduceMotion }) → { play(), pause(), pointer(mx, my) }.

   Un écran 3D auto-stéréoscopique flotte dans la scène, vu en légère perspective.
   La caméra est la tête du spectateur : elle se balance lentement (ou suit le pointeur) et l'écran
   se comporte comme une vraie fenêtre. Derrière la vitre, une salle profonde (piles de jetons, carte,
   poussière d'or) n'est visible qu'à travers l'ouverture (masque au stencil) ; devant la vitre, un dé
   de verre rouge puis un jeton jaillissent de l'écran et débordent du cadre. Chaque objet qui traverse
   la vitre est rendu deux fois (moitié arrière masquée par l'ouverture, moitié avant libre, séparées
   par un plan de découpe). Une trame lenticulaire chatoie selon l'angle de vue. */
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

const W = 1.6, H = 1.0, DEPTH = 1.5, BEZ = .052, FRONT = 1.0;
const HEX = { navy: 0x0B1B2E, blue: 0x335F94, mist: 0x9DB4D0, yellow: 0xF9C83B, red: 0xBA2637, paper: 0xF5F1EA };
const CSS = { navy: '#0B1B2E', blue: '#335F94', mist: '#9DB4D0', yellow: '#F9C83B', red: '#BA2637', paper: '#F5F1EA' };
const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const sm = (a, b, x) => { x = clamp((x - a) / (b - a)); return x * x * (3 - 2 * x); };
const mixV = (a, b, k) => a.clone().lerp(b, k);
const rand = seed => () => (seed = (seed * 16807) % 2147483647) / 2147483647;
const LOOP = 9.0;

/* ---------- textures procédurales ---------- */
function canvasTex(w, h, draw, srgb = true) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c);
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}
// face d'un jeton : couleur de fond, inserts sur la tranche, filet, et le double cercle du groupe au centre
function chipFace(base, insert, trim) {
  return canvasTex(512, 512, (x, w) => {
    const R = w / 2; x.translate(R, R);
    x.fillStyle = base; x.beginPath(); x.arc(0, 0, R, 0, 7); x.fill();
    x.fillStyle = insert;
    for (let i = 0; i < 8; i++) {
      const a = i * Math.PI / 4;
      x.beginPath(); x.arc(0, 0, R, a - .17, a + .17); x.arc(0, 0, R * .78, a + .2, a - .2, true); x.closePath(); x.fill();
    }
    x.strokeStyle = trim; x.lineWidth = R * .03; x.beginPath(); x.arc(0, 0, R * .7, 0, 7); x.stroke();
    x.setLineDash([R * .05, R * .045]); x.lineWidth = R * .022; x.strokeStyle = insert; x.beginPath(); x.arc(0, 0, R * .62, 0, 7); x.stroke(); x.setLineDash([]);
    const g = x.createRadialGradient(0, -R * .2, 0, 0, 0, R * .56); g.addColorStop(0, 'rgba(255,255,255,.10)'); g.addColorStop(1, 'rgba(0,0,0,.12)');
    x.fillStyle = g; x.beginPath(); x.arc(0, 0, R * .56, 0, 7); x.fill();
    // les deux cercles entrelacés de la marque (sans lettres)
    x.fillStyle = CSS.paper; x.strokeStyle = CSS.blue; x.lineWidth = R * .03;
    x.beginPath(); x.arc(-R * .15, 0, R * .22, 0, 7); x.fill(); x.stroke();
    x.fillStyle = CSS.yellow; x.beginPath(); x.arc(R * .15, 0, R * .22, 0, 7); x.fill();
  });
}
function chipSide(base, insert) {
  const t = canvasTex(512, 32, (x, w, h) => {
    x.fillStyle = base; x.fillRect(0, 0, w, h);
    x.fillStyle = insert;
    for (let i = 0; i < 8; i++) x.fillRect((i / 8) * w - w * .027, 0, w * .054, h);
    x.fillRect(w - w * .027, 0, w * .027, h);
    x.fillStyle = 'rgba(0,0,0,.18)'; x.fillRect(0, 0, w, 2); x.fillRect(0, h - 2, w, 2);
  });
  t.wrapS = THREE.RepeatWrapping; return t;
}
const roundRect = (x, l, t, w, h, r) => { x.beginPath(); x.moveTo(l + r, t); x.arcTo(l + w, t, l + w, t + h, r); x.arcTo(l + w, t + h, l, t + h, r); x.arcTo(l, t + h, l, t, r); x.arcTo(l, t, l + w, t, r); x.closePath(); };
const diamond = (x, cx, cy, s) => { x.beginPath(); x.moveTo(cx, cy - s); x.quadraticCurveTo(cx + s * .18, cy - s * .18, cx + s * .72, cy); x.quadraticCurveTo(cx + s * .18, cy + s * .18, cx, cy + s); x.quadraticCurveTo(cx - s * .18, cy + s * .18, cx - s * .72, cy); x.quadraticCurveTo(cx - s * .18, cy - s * .18, cx, cy - s); x.fill(); };
function cardFront() {
  return canvasTex(360, 504, (x, w, h) => {
    roundRect(x, 2, 2, w - 4, h - 4, 26); x.fillStyle = CSS.paper; x.fill();
    x.strokeStyle = 'rgba(11,27,46,.12)'; x.lineWidth = 2; roundRect(x, 18, 18, w - 36, h - 36, 14); x.stroke();
    x.fillStyle = CSS.red; diamond(x, w / 2, h / 2, 92);
    diamond(x, 44, 56, 20); diamond(x, w - 44, h - 56, 20);
    x.fillStyle = CSS.yellow; diamond(x, w / 2, h / 2, 26);
  });
}
function cardBack() {
  return canvasTex(360, 504, (x, w, h) => {
    roundRect(x, 2, 2, w - 4, h - 4, 26); x.fillStyle = CSS.paper; x.fill();
    roundRect(x, 18, 18, w - 36, h - 36, 14); x.fillStyle = CSS.blue; x.fill(); x.save(); x.clip();
    x.strokeStyle = 'rgba(245,241,234,.22)'; x.lineWidth = 2;
    for (let i = -h; i < w + h; i += 18) { x.beginPath(); x.moveTo(i, 0); x.lineTo(i + h, h); x.stroke(); x.beginPath(); x.moveTo(i + h, 0); x.lineTo(i, h); x.stroke(); }
    x.restore();
    x.fillStyle = CSS.paper; x.strokeStyle = CSS.navy; x.lineWidth = 4;
    x.beginPath(); x.arc(w / 2 - 26, h / 2, 42, 0, 7); x.fill(); x.stroke();
    x.fillStyle = CSS.yellow; x.beginPath(); x.arc(w / 2 + 26, h / 2, 42, 0, 7); x.fill();
  });
}
const blobTex = () => canvasTex(128, 128, (x, w) => {
  const g = x.createRadialGradient(w / 2, w / 2, 0, w / 2, w / 2, w / 2);
  g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(.45, 'rgba(255,255,255,.45)'); g.addColorStop(1, 'rgba(255,255,255,0)');
  x.fillStyle = g; x.fillRect(0, 0, w, w);
}, false);

/* ---------- géométries ---------- */
// cube arrondi : sommets resserrés vers les arêtes puis projetés sur des coins sphériques
function roundedBox(size, r) {
  const g = new THREE.BoxGeometry(1, 1, 1, 22, 22, 22), p = g.attributes.position, n = g.attributes.normal;
  const v = new THREE.Vector3(), inner = new THREE.Vector3(), rr = r / size, lim = .5 - rr;
  for (let i = 0; i < p.count; i++) {
    v.fromBufferAttribute(p, i);
    for (const k of ['x', 'y', 'z']) if (Math.abs(v[k]) < .4999) v[k] = Math.sign(v[k]) * .5 * Math.pow(Math.abs(v[k]) * 2, .55);
    inner.set(clamp(v.x, -lim, lim), clamp(v.y, -lim, lim), clamp(v.z, -lim, lim));
    const d = v.sub(inner); if (d.lengthSq() < 1e-12) continue;
    d.normalize(); n.setXYZ(i, d.x, d.y, d.z);
    d.multiplyScalar(rr).add(inner); p.setXYZ(i, d.x * size, d.y * size, d.z * size);
  }
  return g;
}
function roundRectShape(w, h, r, s = new THREE.Shape()) {
  const x = -w / 2, y = -h / 2;
  s.moveTo(x + r, y); s.lineTo(x + w - r, y); s.quadraticCurveTo(x + w, y, x + w, y + r); s.lineTo(x + w, y + h - r);
  s.quadraticCurveTo(x + w, y + h, x + w - r, y + h); s.lineTo(x + r, y + h); s.quadraticCurveTo(x, y + h, x, y + h - r);
  s.lineTo(x, y + r); s.quadraticCurveTo(x, y, x + r, y); return s;
}

/* ---------- plans de découpe : derrière la vitre (masqué par l'ouverture) / devant la vitre ---------- */
const PLANE_BACK = new THREE.Plane(new THREE.Vector3(0, 0, -1), 0);
const PLANE_FRONT = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0);
function behind(m) {
  m.stencilWrite = true; m.stencilRef = 1; m.stencilFunc = THREE.EqualStencilFunc;
  m.stencilFail = m.stencilZFail = m.stencilZPass = THREE.KeepStencilOp; return m;
}
const cache = new WeakMap();
function variant(m, side) {
  let c = cache.get(m); if (!c) cache.set(m, c = {});
  if (!c[side]) {
    const k = m.clone();
    if (side === 'back') { behind(k); k.clippingPlanes = [PLANE_BACK]; } else k.clippingPlanes = [PLANE_FRONT];
    c[side] = k;
  }
  return c[side];
}
const setSide = (o, side) => o.traverse(n => { if (n.material) n.material = Array.isArray(n.material) ? n.material.map(m => variant(m, side)) : variant(n.material, side); });
// objet qui traverse la vitre : deux exemplaires, l'un découpé derrière, l'autre devant
function dual(src) {
  const g = new THREE.Group(), front = src.clone(true);
  setSide(src, 'back'); setSide(front, 'front'); g.add(src, front); return g;
}

const CHUNK_END = '#include <tonemapping_fragment>\n#include <colorspace_fragment>\n}';

export function mount(layer, { reduceMotion }) {
  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, stencil: true, powerPreference: 'high-performance' });
  } catch (e) {
    console.warn('alioscopy : WebGL indisponible', e);
    return { play() {}, pause() {}, pointer() {} };
  }
  renderer.setClearColor(0x000000, 0);
  renderer.toneMapping = THREE.NeutralToneMapping; renderer.toneMappingExposure = 1.05;
  renderer.localClippingEnabled = true;
  layer.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(26, 1, .1, 40);
  const pmrem = new THREE.PMREMGenerator(renderer);
  const envScene = new RoomEnvironment();
  scene.environment = pmrem.fromScene(envScene, .04).texture;
  envScene.traverse(o => { o.geometry?.dispose(); o.material?.dispose?.(); });
  pmrem.dispose();
  scene.environmentIntensity = .55;

  /* lumières */
  const key = new THREE.DirectionalLight(HEX.paper, 2.4); key.position.set(-1.6, 2.6, 3.2); scene.add(key);
  const rim = new THREE.DirectionalLight(HEX.mist, 1.4); rim.position.set(2, 1.2, -2.5); scene.add(rim);
  const warm = new THREE.PointLight(HEX.yellow, 2.2, 0, 1.6); warm.position.set(-.1, .42, -.75); scene.add(warm);
  const fill = new THREE.PointLight(HEX.blue, 2.5, 0, 1.5); fill.position.set(.6, -.2, .9); scene.add(fill);

  /* ---------- masques stencil : 2 = façade de l'écran, 1 = ouverture de la vitre ---------- */
  const maskMat = ref => new THREE.MeshBasicMaterial({ colorWrite: false, depthWrite: false, stencilWrite: true, stencilRef: ref, stencilFunc: THREE.AlwaysStencilFunc, stencilZPass: THREE.ReplaceStencilOp });
  const outerMask = new THREE.Mesh(new THREE.ShapeGeometry(roundRectShape(W + BEZ * 2, H + BEZ * 2, .07), 8), maskMat(2)); outerMask.renderOrder = -101;
  const apMask = new THREE.Mesh(new THREE.ShapeGeometry(roundRectShape(W, H, .025), 6), maskMat(1)); apMask.renderOrder = -100;
  scene.add(outerMask, apMask);

  /* ---------- cadre de l'écran : métal sombre biseauté ---------- */
  const frameShape = roundRectShape(W + BEZ * 2, H + BEZ * 2, .07);
  frameShape.holes.push(roundRectShape(W, H, .025, new THREE.Path()));
  const frameGeo = new THREE.ExtrudeGeometry(frameShape, { depth: .05, bevelEnabled: true, bevelThickness: .008, bevelSize: .008, bevelSegments: 4, curveSegments: 10 });
  const bezel = new THREE.Mesh(frameGeo, new THREE.MeshPhysicalMaterial({ color: 0x101c2b, metalness: .75, roughness: .32, clearcoat: .6, clearcoatRoughness: .2, envMapIntensity: 1.2 }));
  bezel.position.z = -.05; scene.add(bezel);
  // dos de l'appareil (visible seulement de biais)
  const back = new THREE.Mesh(new THREE.ShapeGeometry(roundRectShape(W + BEZ * 2, H + BEZ * 2, .07), 8), new THREE.MeshStandardMaterial({ color: 0x0a1522, roughness: .6, metalness: .4, side: THREE.BackSide }));
  back.position.z = -.058; scene.add(back);

  /* halo émis par l'écran sur le fond de la scène (hors ouverture) */
  const halo = new THREE.Mesh(new THREE.PlaneGeometry(5.2, 3.8), new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    stencilWrite: true, stencilRef: 1, stencilFunc: THREE.NotEqualStencilFunc,
    uniforms: { uA: { value: .5 } },
    vertexShader: 'varying vec2 vU; void main(){ vU = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.); }',
    fragmentShader: `uniform float uA; varying vec2 vU; void main(){ vec2 p = (vU - .5) * vec2(1.37, 1.); float d = length(p);
      float g = exp(-d*d*9.) * uA; gl_FragColor = vec4(vec3(.06,.13,.26) * g + vec3(.10,.08,.02) * exp(-d*d*30.) * uA, 0.); }`
  }));
  halo.position.z = -.6; halo.renderOrder = -50; scene.add(halo);

  /* ---------- la salle derrière la vitre ---------- */
  const roomMat = behind(new THREE.ShaderMaterial({
    uniforms: { uNavy: { value: new THREE.Color(HEX.navy) }, uBlue: { value: new THREE.Color(HEX.blue) }, uMist: { value: new THREE.Color(HEX.mist) }, uSun: { value: new THREE.Color(HEX.yellow) }, uTime: { value: 0 } },
    vertexShader: 'varying vec3 vW; varying vec3 vN; void main(){ vec4 w = modelMatrix * vec4(position,1.); vW = w.xyz; vN = normalize(mat3(modelMatrix) * normal); gl_Position = projectionMatrix * viewMatrix * w; }',
    fragmentShader: `uniform vec3 uNavy, uBlue, uMist, uSun; uniform float uTime; varying vec3 vW; varying vec3 vN;
      float grid(vec2 p, float s, float w){ vec2 g = p / s; vec2 f = abs(fract(g - .5) - .5) / max(fwidth(g), 1e-4); return 1. - clamp(min(f.x, f.y) - w, 0., 1.); }
      void main(){
        vec3 n = abs(vN); vec2 p = n.y > .5 ? vW.xz : (n.x > .5 ? vW.zy : vW.xy);
        float d = clamp(-vW.z / ${DEPTH.toFixed(2)}, 0., 1.);
        vec3 col = mix(uNavy * 1.9, uNavy * .55, pow(d, .8));
        // lumière chaude tombant du plafond sur le sol, halo bleu sur le mur du fond
        float floorK = step(.5, vN.y) * step(n.x + n.z, .5);
        float pool = exp(-dot(vW.xz - vec2(-.05, -.78), vW.xz - vec2(-.05, -.78)) * 5.5);
        col += uSun * pool * .22 * floorK;
        float backK = step(.5, vN.z);
        col += uBlue * exp(-dot(vW.xy - vec2(0., .05), vW.xy - vec2(0., .05)) * 2.6) * .55 * backK;
        // trame de profondeur : lignes fines, plus marquées tous les 5 carreaux, qui s'éteignent au fond
        float l1 = grid(p, .1, .0) * .55, l2 = grid(p, .5, .3);
        float fade = (1. - d * .78);
        col += uMist * (l1 * .16 + l2 * .22) * fade;
        col += uSun * l2 * .08 * pool * floorK;
        // arête lumineuse aux coins de la boîte
        gl_FragColor = vec4(col, 1.);
      ${CHUNK_END}`
  }));
  const room = new THREE.Group();
  const RW = W + .004, RH = H + .004;
  const wall = (w, h, pos, rot) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), roomMat); m.position.copy(pos); m.rotation.set(...rot); room.add(m); };
  wall(RW, RH, new THREE.Vector3(0, 0, -DEPTH), [0, 0, 0]);
  wall(RW, DEPTH, new THREE.Vector3(0, -RH / 2, -DEPTH / 2), [-Math.PI / 2, 0, 0]);
  wall(RW, DEPTH, new THREE.Vector3(0, RH / 2, -DEPTH / 2), [Math.PI / 2, 0, 0]);
  wall(DEPTH, RH, new THREE.Vector3(-RW / 2, 0, -DEPTH / 2), [0, Math.PI / 2, 0]);
  wall(DEPTH, RH, new THREE.Vector3(RW / 2, 0, -DEPTH / 2), [0, -Math.PI / 2, 0]);
  scene.add(room);

  /* ---------- jetons ---------- */
  const CR = .105, CH = .022;
  const chipGeo = new THREE.CylinderGeometry(CR, CR, CH, 72, 1);
  const chipKinds = [[CSS.red, CSS.paper, CSS.yellow], [CSS.blue, CSS.paper, CSS.yellow], [CSS.paper, CSS.blue, CSS.red], [CSS.navy, CSS.yellow, CSS.yellow]].map(([b, i, t]) => {
    const side = chipSide(b, i); side.repeat.set(1, 1);
    const face = chipFace(b, i, t);
    const mk = map => new THREE.MeshPhysicalMaterial({ map, roughness: .42, clearcoat: .7, clearcoatRoughness: .25, envMapIntensity: .8 });
    return [mk(side), mk(face), mk(face)];
  });
  const chip = k => new THREE.Mesh(chipGeo, chipKinds[k]);
  const R = rand(7);
  const FLOOR = -H / 2;
  const stack = (x, z, n, kinds) => {
    const g = new THREE.Group();
    for (let i = 0; i < n; i++) { const c = chip(kinds[Math.floor(i / 4) % kinds.length]); c.position.set((R() - .5) * .012, CH / 2 + i * CH * 1.02, (R() - .5) * .012); c.rotation.y = R() * 6.3; g.add(c); }
    g.position.set(x, FLOOR, z); setSide(g, 'back'); scene.add(g); return g;
  };
  stack(-.48, -1.05, 14, [0, 2]); stack(-.3, -1.22, 9, [1]); stack(.52, -.78, 11, [1, 3]); stack(.36, -1.1, 6, [0]);
  // jetons posés à plat
  [[-.05, -.95, 2], [.18, -.62, 0], [-.6, -.55, 1]].forEach(([x, z, k], i) => { const c = chip(k); c.position.set(x, FLOOR + CH / 2, z); c.rotation.set(0, i * 2, 0); setSide(c, 'back'); scene.add(c); });

  /* ---------- carte flottante au milieu de la profondeur ---------- */
  const card = new THREE.Group();
  const cardGeo = new THREE.PlaneGeometry(.25, .35);
  const cf = new THREE.Mesh(cardGeo, new THREE.MeshStandardMaterial({ map: cardFront(), roughness: .5, alphaTest: .5, side: THREE.FrontSide }));
  const cb = new THREE.Mesh(cardGeo, new THREE.MeshStandardMaterial({ map: cardBack(), roughness: .5, alphaTest: .5, side: THREE.FrontSide })); cb.rotation.y = Math.PI;
  card.add(cf, cb); setSide(card, 'back'); scene.add(card);

  /* ---------- le dé de verre rouge, héros qui sort de l'écran ---------- */
  const DS = .25;
  const dieSrc = new THREE.Group();
  const glass = new THREE.MeshPhysicalMaterial({ color: 0xc8283c, emissive: 0x5a0a14, emissiveIntensity: .3, transmission: .45, thickness: .2, ior: 1.45, roughness: .12, attenuationColor: new THREE.Color(0xd23a4c), attenuationDistance: .4, clearcoat: 1, clearcoatRoughness: .04, specularIntensity: 1, sheen: .4, sheenColor: new THREE.Color(0xff8a8a), envMapIntensity: 1.6 });
  dieSrc.add(new THREE.Mesh(roundedBox(DS, .045), glass));
  const faces = [[1, 0, 0, 1], [-1, 0, 0, 6], [0, 1, 0, 2], [0, -1, 0, 5], [0, 0, 1, 3], [0, 0, -1, 4]];
  const LAY = { 1: [[0, 0]], 2: [[-1, -1], [1, 1]], 3: [[-1, -1], [0, 0], [1, 1]], 4: [[-1, -1], [1, -1], [-1, 1], [1, 1]], 5: [[-1, -1], [1, -1], [0, 0], [-1, 1], [1, 1]], 6: [[-1, -1], [-1, 0], [-1, 1], [1, -1], [1, 0], [1, 1]] };
  const pipGeo = new THREE.SphereGeometry(DS * .085, 20, 12); pipGeo.scale(1, 1, .42);
  const pips = new THREE.InstancedMesh(pipGeo, new THREE.MeshStandardMaterial({ color: HEX.paper, roughness: .35, emissive: HEX.paper, emissiveIntensity: .12 }), 21);
  { let i = 0; const m = new THREE.Matrix4(), q = new THREE.Quaternion(), Z = new THREE.Vector3(0, 0, 1);
    for (const [nx, ny, nz, k] of faces) {
      const nrm = new THREE.Vector3(nx, ny, nz); q.setFromUnitVectors(Z, nrm);
      const u = new THREE.Vector3(1, 0, 0).applyQuaternion(q), v = new THREE.Vector3(0, 1, 0).applyQuaternion(q);
      for (const [a, b] of LAY[k]) { const pos = nrm.clone().multiplyScalar(DS * .5 - DS * .03).addScaledVector(u, a * DS * .26).addScaledVector(v, b * DS * .26); m.compose(pos, q, new THREE.Vector3(1, 1, 1)); pips.setMatrixAt(i++, m); }
    } }
  dieSrc.add(pips);
  const die = dual(dieSrc); scene.add(die);

  /* ---------- le jeton qui jaillit ensuite ---------- */
  const popSrc = new THREE.Group(); const pc = chip(0); pc.scale.setScalar(1.45); popSrc.add(pc);
  const pop = dual(popSrc); scene.add(pop);

  /* ---------- ombres portées sur la façade quand un objet est devant ---------- */
  const blob = blobTex();
  const shadow = () => { const m = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ color: 0x02060c, alphaMap: blob, transparent: true, depthWrite: false, opacity: 0, stencilWrite: true, stencilRef: 0, stencilFunc: THREE.NotEqualStencilFunc })); m.position.z = .014; m.renderOrder = 2; scene.add(m); return m; };
  const dieShadow = shadow(), popShadow = shadow();

  /* ---------- poussière d'or : du fond de la salle jusque devant la vitre ---------- */
  const N = 520, pr = rand(31), pPos = new Float32Array(N * 3), pSeed = new Float32Array(N);
  for (let i = 0; i < N; i++) { pPos[i * 3] = (pr() - .5) * W * .94; pPos[i * 3 + 1] = (pr() - .5) * H * .9; pPos[i * 3 + 2] = pr(); pSeed[i] = pr(); }
  const pGeo = new THREE.BufferGeometry();
  pGeo.setAttribute('position', new THREE.BufferAttribute(pPos, 3)); pGeo.setAttribute('aSeed', new THREE.BufferAttribute(pSeed, 1));
  pGeo.boundingSphere = new THREE.Sphere(new THREE.Vector3(0, 0, 0), 4);
  const dustMat = side => {
    const m = new THREE.ShaderMaterial({
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
      uniforms: { uTime: { value: 0 }, uScale: { value: 400 }, uSun: { value: new THREE.Color(HEX.yellow) }, uPaper: { value: new THREE.Color(HEX.paper) }, uMist: { value: new THREE.Color(HEX.mist) } },
      vertexShader: `uniform float uTime, uScale; attribute float aSeed; varying float vA; varying float vS;
        void main(){
          float span = ${(DEPTH + FRONT).toFixed(3)};
          float z = fract(position.z + uTime * (.018 + aSeed * .03)) * span - ${DEPTH.toFixed(3)};
          vec3 p = vec3(position.xy, z);
          p.x += sin(uTime * .4 + aSeed * 40.) * .03; p.y += cos(uTime * .33 + aSeed * 23.) * .03;
          float out_ = max(z, 0.); p.xy *= 1. + out_ * .55;
          ${side === 'front' ? 'if (z < 0.) p.z = -50.;' : 'if (z >= 0.) p.z = -50.;'}
          vec4 mv = modelViewMatrix * vec4(p, 1.);
          float tw = .55 + .45 * sin(uTime * (1.5 + aSeed * 3.) + aSeed * 60.);
          vA = tw * smoothstep(-${DEPTH.toFixed(3)}, -${(DEPTH - .25).toFixed(3)}, z) * (1. - smoothstep(${(FRONT - .35).toFixed(3)}, ${FRONT.toFixed(3)}, z));
          vS = aSeed;
          gl_PointSize = (.008 + aSeed * aSeed * .022) * uScale / -mv.z;
          gl_Position = projectionMatrix * mv;
        }`,
      fragmentShader: `uniform vec3 uSun, uPaper, uMist; varying float vA; varying float vS;
        void main(){ vec2 c = gl_PointCoord - .5; float d = length(c); float a = smoothstep(.5, 0., d); a *= a;
          vec3 col = vS < .6 ? mix(uSun, uPaper, vS / .6) : uMist;
          gl_FragColor = vec4(col * a * vA * 1.4, 0.);
        ${CHUNK_END}`
    });
    if (side === 'back') behind(m);
    return m;
  };
  const dustBack = new THREE.Points(pGeo, dustMat('back')), dustFront = new THREE.Points(pGeo, dustMat('front'));
  dustBack.frustumCulled = dustFront.frustumCulled = false;
  scene.add(dustBack, dustFront);

  /* ---------- vitre lenticulaire : lentilles inclinées, moiré irisé et reflet qui glissent avec l'angle ---------- */
  const lens = new THREE.Mesh(new THREE.PlaneGeometry(W, H), behind(new THREE.ShaderMaterial({
    transparent: true, depthWrite: false,
    blending: THREE.CustomBlending, blendSrc: THREE.OneFactor, blendDst: THREE.OneMinusSrcAlphaFactor,
    uniforms: { uCam: { value: new THREE.Vector3() }, uTime: { value: 0 }, uHit: { value: new THREE.Vector4(0, 0, 9, 0) }, uA: { value: new THREE.Color(HEX.mist) }, uB: { value: new THREE.Color(HEX.yellow) }, uC: { value: new THREE.Color(HEX.red) }, uD: { value: new THREE.Color(HEX.blue) } },
    vertexShader: 'varying vec3 vP; void main(){ vP = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.); }',
    fragmentShader: `uniform vec3 uCam, uA, uB, uC, uD; uniform float uTime; uniform vec4 uHit; varying vec3 vP;
      vec3 pal(float t){ t = fract(t) * 4.; return t < 1. ? mix(uA, uB, t) : t < 2. ? mix(uB, uC, t - 1.) : t < 3. ? mix(uC, uD, t - 2.) : mix(uD, uA, t - 3.); }
      void main(){
        vec3 v = normalize(uCam - vP); float ax = v.x / v.z, ay = v.y / v.z;
        float s = vP.x + vP.y * .19;
        // lentilles : fines lignes sombres, atténuées quand elles deviennent plus fines qu'un pixel
        float f = s / .0105 + ax * 3.;
        float w = fwidth(f);
        float l = abs(fract(f) - .5);
        float line = smoothstep(.5 - .12 - w, .5, l) * (1. - smoothstep(.3, .6, w));
        // moiré : battement entre la trame et l'angle de vue, en grandes bandes irisées obliques
        float m1 = s * 2.6 - ax * 5.5 + ay * 1.5 + uTime * .02;
        float m2 = (vP.x * .7 - vP.y * 1.2) * 1.9 + ax * 2.2 - ay * 2.;
        float band = pow(.5 + .5 * sin(m1 * 6.2832), 3.) * (.55 + .45 * sin(m2 * 6.2832));
        vec3 iri = pal(m1 * .5 + m2 * .25) * band * .2;
        // reflet de la vitre : une large bande de lumière qui glisse avec la tête
        float g = vP.x * .5 + vP.y * .9 - ax * 1.4 + ay * .9;
        float sheen = exp(-pow((g - .25) * 3.2, 2.)) * .055 + exp(-pow((g + .55) * 9., 2.)) * .03;
        // bord de dalle légèrement assombri
        vec2 e = abs(vP.xy) / vec2(${(W / 2).toFixed(3)}, ${(H / 2).toFixed(3)});
        float edge = smoothstep(.86, 1., max(e.x, e.y * 1.02));
        // onde lumineuse quand un objet franchit la vitre
        float hd = length(vP.xy - uHit.xy), age = uHit.z;
        float ring = exp(-pow((hd - age * .9 - uHit.w) * 16., 2.)) * (1. - smoothstep(0., 1.1, age)) * smoothstep(0., .05, age);
        float core = exp(-hd * hd * 40.) * exp(-age * 5.) * .6;
        vec3 add = iri + vec3(.95, .93, .9) * sheen + mix(uA, uB, .35) * (ring * .35 + core);
        float dark = line * .17 + edge * .35;
        gl_FragColor = vec4(add, dark);
      }`
  })));
  lens.position.z = .002; lens.renderOrder = 1; scene.add(lens);

  /* ---------- animation ---------- */
  const DIE_BACK = new THREE.Vector3(-.12, -.08, -.9), DIE_FRONT = new THREE.Vector3(.64, .42, 1.1);
  const POP_BACK = new THREE.Vector3(.3, -.12, -.95), POP_FRONT = new THREE.Vector3(-.66, -.36, 1.0);
  const LIGHT = new THREE.Vector3(-.35, .55, 1).normalize();
  const place = (sh, p, size, k) => {
    sh.position.x = p.x - LIGHT.x / LIGHT.z * p.z; sh.position.y = p.y - LIGHT.y / LIGHT.z * p.z;
    const s = size * (1 + p.z * .9); sh.scale.set(s, s, 1);
    sh.material.opacity = clamp(p.z / .25) * k * (1 - clamp(p.z - .6) * .4);
  };
  const hit = new THREE.Vector4(0, 0, -99, 0), prevSide = {};
  let w = 0, h = 0, mx = 0, my = 0, tmx = 0, tmy = 0;
  const render = (T, dt) => {
    const u = T % LOOP;
    // tête du spectateur : balancement lent + pointeur
    const k = dt ? 1 - Math.exp(-dt * 3.2) : 1; mx += (tmx - mx) * k; my += (tmy - my) * k;
    const yaw = -.1 + Math.sin(T * .72) * .2 + Math.sin(T * .29) * .06 + mx * .9;
    const pitch = .1 + Math.sin(T * .53 + 1) * .06 - my * .5;
    const aspect = w / h || 1, tan = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
    const D = Math.max((W + BEZ * 2) / .78 / (2 * tan * aspect), (H + BEZ * 2) / .62 / (2 * tan));
    camera.position.set(Math.sin(yaw) * Math.cos(pitch) * D, Math.sin(pitch) * D, Math.cos(yaw) * Math.cos(pitch) * D);
    camera.lookAt(0, .02, 0);

    // dé : sort de la profondeur, franchit la vitre, flotte devant le cadre, puis repart
    const kd = sm(.15, 2.1, u) * (1 - sm(3.9, 5.7, u));
    const dp = mixV(DIE_BACK, DIE_FRONT, kd);
    dp.x += Math.sin(T * .9) * .03; dp.y += Math.sin(T * 1.3) * .025 + Math.sin(kd * Math.PI) * .12;
    die.position.copy(dp);
    die.rotation.set(T * .55 + kd * 2.2, T * .8 + .6, .4 + Math.sin(T * .4) * .3);
    die.scale.setScalar(1 + kd * .12);
    place(dieShadow, dp, .42, .45);
    // jeton : prend le relais quand le dé recule
    const kp = sm(3.8, 5.6, u) * (1 - sm(7.2, 8.9, u));
    const pp = mixV(POP_BACK, POP_FRONT, kp); pp.y += Math.sin(kp * Math.PI) * .14 + Math.sin(T * 1.1) * .02;
    pop.position.copy(pp);
    pop.rotation.set(1.25 - kp * .55 + Math.sin(T * .7) * .12, T * .9, -.35 + kp * .5);
    place(popShadow, pp, .52, .45);
    // carte en lévitation, qui pivote doucement
    card.position.set(-.4, .1 + Math.sin(T * .8) * .03, -.5);
    card.rotation.set(-.12 + Math.sin(T * .5) * .08, .5 + Math.sin(T * .45) * .55, .08);

    // franchissement de la vitre : on lance l'onde au point de passage
    for (const [o, r, key] of [[dp, .14, 'd'], [pp, .14, 'p']]) {
      const sgn = o.z > 0; if (prevSide[key] !== undefined && prevSide[key] !== sgn) hit.set(o.x, o.y, T, r); prevSide[key] = sgn;
    }
    lens.material.uniforms.uHit.value.set(hit.x, hit.y, dt || reduceMotion ? T - hit.z : 9, hit.w);
    const t = T;
    dustBack.material.uniforms.uTime.value = dustFront.material.uniforms.uTime.value = t;
    lens.material.uniforms.uTime.value = t;
    lens.material.uniforms.uCam.value.copy(camera.position);
    renderer.render(scene, camera);
  };

  const resize = () => {
    w = layer.clientWidth; h = layer.clientHeight; if (!w || !h) return;
    const pr = Math.min(devicePixelRatio || 1, 2);
    renderer.setPixelRatio(pr); renderer.setSize(w, h, false);
    camera.aspect = w / h; camera.updateProjectionMatrix();
    const sc = h * pr * .5 / Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
    dustBack.material.uniforms.uScale.value = dustFront.material.uniforms.uScale.value = sc;
    if (!on) render(reduceMotion ? STILL : T, 0);
  };
  const STILL = 2.9;
  let raf = 0, on = false, T = .2, last = 0, pausedAt = -1e9;
  const frame = now => {
    raf = 0; if (!on) return;
    const dt = last ? Math.min(.05, (now - last) / 1000) : 0; last = now; T += dt;
    render(T, dt);
    raf = requestAnimationFrame(frame);
  };
  new ResizeObserver(resize).observe(layer);
  resize();

  return {
    play() {
      if (reduceMotion) { render(STILL, 0); return; }
      if (on) return;
      // de retour après une vraie absence : on rejoue l'entrée (le dé qui sort de l'écran)
      if (performance.now() - pausedAt > 1500) T = .2;
      on = true; last = 0; if (!raf) raf = requestAnimationFrame(frame);
    },
    pause() { if (!on) return; on = false; pausedAt = performance.now(); if (raf) cancelAnimationFrame(raf); raf = 0; },
    pointer(px, py) { tmx = px; tmy = py; if (reduceMotion) { mx = px; my = py; render(STILL, 0); } }
  };
}
