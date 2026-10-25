/* Maquette 3 — Grand Hall : galerie de marbre à l'heure dorée */
import * as THREE from 'three';
import { Reflector } from 'three/addons/objects/Reflector.js';
import { FontLoader } from 'three/addons/loaders/FontLoader.js';
import { TextGeometry } from 'three/addons/geometries/TextGeometry.js';
import { createStage, dust, keyframes, setupScroll, chapters, hideLoader, setLoad, mouse, stepMouse, mobile, BRAND } from './shared.js';

const st = createStage({
  fov: 40, exposure: .85,
  dof: { focus: 9, aperture: .00012, maxblur: .005 },
  bloom: { strength: .38, radius: .85, threshold: 1.05 },
  grain: .04, vignette: .5, aberration: .0014
});
const { scene, camera, bokeh } = st;
scene.background = new THREE.Color(0x8C7458);
scene.fog = new THREE.FogExp2(0x9C8264, .017);

const SPAN = 4.5, NCOL = 13, Z0 = 0, HALL_W = 7, CEIL = 7.4;
const colZ = k => Z0 - k * SPAN;

/* Sol de marbre (miroir + dallage) */
function marbleTex() {
  const c = document.createElement('canvas'); c.width = c.height = 1024;
  const x = c.getContext('2d');
  const T = 512;
  for (let i = 0; i < 2; i++) for (let j = 0; j < 2; j++) {
    x.fillStyle = (i + j) % 2 ? '#C9B9A3' : '#F1EBE1';
    x.fillRect(i * T, j * T, T, T);
    for (let v = 0; v < 7; v++) {
      x.strokeStyle = (i + j) % 2 ? 'rgba(90,70,50,.14)' : 'rgba(140,120,95,.12)';
      x.lineWidth = .6 + Math.random() * 1.8;
      x.beginPath(); x.moveTo(i * T + Math.random() * T, j * T);
      x.bezierCurveTo(i * T + Math.random() * T, j * T + T * .3, i * T + Math.random() * T, j * T + T * .7, i * T + Math.random() * T, j * T + T);
      x.stroke();
    }
  }
  x.strokeStyle = 'rgba(80,60,40,.25)'; x.lineWidth = 2;
  [0, T, 1024].forEach(p => { x.beginPath(); x.moveTo(p, 0); x.lineTo(p, 1024); x.stroke(); x.beginPath(); x.moveTo(0, p); x.lineTo(1024, p); x.stroke(); });
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.anisotropy = st.renderer.capabilities.getMaxAnisotropy();
  return t;
}
const LEN = 80, ZC = Z0 - 30;
const mirror = new Reflector(new THREE.PlaneGeometry(HALL_W * 2, LEN), { textureWidth: innerWidth * st.dpr * .5, textureHeight: innerHeight * st.dpr * .5, color: 0x9c9080, clipBias: .003 });
mirror.rotation.x = -Math.PI / 2; mirror.position.set(0, 0, ZC); scene.add(mirror);
const mt = marbleTex(); mt.repeat.set(HALL_W * 2 / 3.6, LEN / 3.6);
const floor = new THREE.Mesh(new THREE.PlaneGeometry(HALL_W * 2, LEN), new THREE.MeshStandardMaterial({ map: mt, roughness: .3, transparent: true, opacity: .8, envMapIntensity: .08 }));
floor.rotation.x = -Math.PI / 2; floor.position.set(0, .004, ZC); floor.receiveShadow = true; scene.add(floor);

/* Colonnes cannelées (instanciées) */
const marble = new THREE.MeshPhysicalMaterial({ color: 0xEFEAE2, roughness: .34, clearcoat: .3, clearcoatRoughness: .3, envMapIntensity: .12 });
const shaftGeo = new THREE.CylinderGeometry(.42, .46, 6, 120, 12);
{
  const p = shaftGeo.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), z = p.getZ(i), r = Math.hypot(x, z), a = Math.atan2(z, x);
    const k = 1 - .05 * Math.pow(.5 + .5 * Math.cos(a * 24), 2);
    p.setX(i, Math.cos(a) * r * k); p.setZ(i, Math.sin(a) * r * k);
  }
  shaftGeo.computeVertexNormals(); shaftGeo.translate(0, 3.55, 0);
}
const parts = [
  [new THREE.BoxGeometry(1.05, .3, 1.05).translate(0, .15, 0)],
  [new THREE.TorusGeometry(.5, .1, 16, 64).rotateX(Math.PI / 2).translate(0, .4, 0)],
  [shaftGeo],
  [new THREE.TorusGeometry(.47, .08, 16, 64).rotateX(Math.PI / 2).translate(0, 6.62, 0)],
  [new THREE.BoxGeometry(1.08, .28, 1.08).translate(0, 6.86, 0)]
];
const m4 = new THREE.Matrix4();
parts.forEach(([geo]) => {
  const im = new THREE.InstancedMesh(geo, marble, NCOL * 2);
  let n = 0;
  for (let k = 0; k < NCOL; k++) for (const sx of [-1, 1]) { m4.makeTranslation(sx * 4, 0, colZ(k)); im.setMatrixAt(n++, m4); }
  im.castShadow = im.receiveShadow = true; scene.add(im);
});

/* Murs, fenêtres, plafond */
const plaster = new THREE.MeshStandardMaterial({ color: 0xE6D7C0, roughness: .92, envMapIntensity: .08 });
const trim = new THREE.MeshStandardMaterial({ color: 0xEDE3D3, roughness: .7, envMapIntensity: .08 });
const addBox = (w, h, d, x, y, z, m = plaster) => { const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m); b.position.set(x, y, z); b.castShadow = b.receiveShadow = true; scene.add(b); return b; };
const zStart = 6, zEnd = colZ(NCOL - 1) - 6;
// mur gauche, pilastres
addBox(.4, CEIL, zStart - zEnd, -HALL_W - .2, CEIL / 2, (zStart + zEnd) / 2);
for (let k = 0; k < NCOL; k++) addBox(.25, CEIL - .4, .9, -HALL_W + .1, (CEIL - .4) / 2, colZ(k), trim);
// mur droit percé de grandes baies
const WIN_W = 2.5, WIN_B = .9, WIN_T = 6.2;
addBox(.8, WIN_B, zStart - zEnd, HALL_W + .4, WIN_B / 2, (zStart + zEnd) / 2);
addBox(.8, CEIL - WIN_T, zStart - zEnd, HALL_W + .4, (CEIL + WIN_T) / 2, (zStart + zEnd) / 2);
const windows = [];
for (let z = zStart; z > zEnd; z -= SPAN) {
  const wz = z - SPAN / 2;
  addBox(.8, WIN_T - WIN_B, SPAN - WIN_W, HALL_W + .4, (WIN_T + WIN_B) / 2, z);
  windows.push(wz);
}
const sky = new THREE.Mesh(new THREE.PlaneGeometry(LEN + 20, 30), new THREE.MeshBasicMaterial({ color: new THREE.Color(1, .9, .74).multiplyScalar(2.4), fog: false }));
sky.rotation.y = -Math.PI / 2; sky.position.set(HALL_W + 6, 6, ZC); scene.add(sky);
// plafond et poutres
const ceil = new THREE.Mesh(new THREE.PlaneGeometry(HALL_W * 2 + 1, zStart - zEnd), new THREE.MeshStandardMaterial({ color: 0xDCCBB2, roughness: .95, envMapIntensity: .08 }));
ceil.rotation.x = Math.PI / 2; ceil.position.set(0, CEIL, (zStart + zEnd) / 2); ceil.receiveShadow = true; scene.add(ceil);
for (let k = 0; k < NCOL; k++) addBox(HALL_W * 2, .4, .55, 0, CEIL - .2, colZ(k), trim);
// mur du fond
addBox(HALL_W * 2 + 1, CEIL, .5, 0, CEIL / 2, zEnd - .25);

/* Portail et monogramme au fond */
const pz = zEnd + .3;
const glow = new THREE.Mesh(new THREE.PlaneGeometry(4.2, 5.6), new THREE.MeshBasicMaterial({ color: new THREE.Color(1, .88, .7).multiplyScalar(2.2), fog: false }));
glow.position.set(0, 2.8, pz); scene.add(glow);
addBox(.6, 6.2, .6, -2.4, 3.1, pz + .2, trim); addBox(.6, 6.2, .6, 2.4, 3.1, pz + .2, trim); addBox(5.4, .6, .6, 0, 6.1, pz + .2, trim);
const mono = new THREE.Group(); mono.position.set(0, 3.1, pz + 2.2); scene.add(mono);

/* Lumière de fin de journée */
scene.add(new THREE.HemisphereLight(0xFFE8CC, 0x5A4632, .16));
const sun = new THREE.DirectionalLight(0xFFC27E, 9);
const SUN_DIR = new THREE.Vector3(14, 10, -5);
sun.castShadow = true; sun.shadow.mapSize.set(4096, 4096);
Object.assign(sun.shadow.camera, { left: -16, right: 16, top: 16, bottom: -16, near: 1, far: 60 });
sun.shadow.bias = -.0003; sun.shadow.normalBias = .03;
scene.add(sun, sun.target);
const monoLight = new THREE.SpotLight(0xFFE6C4, 0, 30, .5, .7, 1.5); monoLight.position.set(0, 5.5, pz + 9); monoLight.target = mono; scene.add(monoLight);

/* Rayons de soleil volumétriques à travers chaque baie */
const rayMat = new THREE.ShaderMaterial({
  uniforms: { uColor: { value: new THREE.Color(1, .85, .6) }, uOpacity: { value: .14 } },
  vertexShader: 'attribute float aT; varying float vT; void main(){ vT = aT; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.); }',
  fragmentShader: 'uniform vec3 uColor; uniform float uOpacity; varying float vT; void main(){ float a = pow(1. - vT, 1.6) * smoothstep(0., .08, vT); gl_FragColor = vec4(uColor * a * uOpacity, 1.); }',
  transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide
});
const dir = SUN_DIR.clone().normalize().negate();
windows.forEach(wz => {
  const L = 12, x = HALL_W, z0 = wz - WIN_W / 2, z1 = wz + WIN_W / 2;
  const a = [[x, WIN_B, z0], [x, WIN_T, z0], [x, WIN_T, z1], [x, WIN_B, z1]].map(v => new THREE.Vector3(...v));
  const b = a.map(v => v.clone().addScaledVector(dir, L));
  const pos = [], t = [];
  const quad = (p0, p1, p2, p3, t0, t1, t2, t3) => { pos.push(...p0.toArray(), ...p1.toArray(), ...p2.toArray(), ...p0.toArray(), ...p2.toArray(), ...p3.toArray()); t.push(t0, t1, t2, t0, t2, t3); };
  for (let i = 0; i < 4; i++) { const j = (i + 1) % 4; quad(a[i], a[j], b[j], b[i], 0, 0, 1, 1); }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('aT', new THREE.Float32BufferAttribute(t, 1));
  scene.add(new THREE.Mesh(g, rayMat));
});
const motes = dust(1600, new THREE.Vector3(-6, .2, -12), new THREE.Vector3(6.5, 6.8, 4), 0xFFE2B5, .022, .6);
scene.add(motes);

/* Caméra : on avance dans le hall */
const path = keyframes([
  { t: 0, pos: [0, 2.0, 10], look: [0, 2.9, -10] },
  { t: .2, pos: [-.4, 1.75, -1.5], look: [2.2, 2.4, -12] },
  { t: .36, pos: [.4, 1.75, -10.5], look: [-1.8, 2.5, -22] },
  { t: .52, pos: [-.4, 1.75, -19.5], look: [2.0, 2.3, -31] },
  { t: .68, pos: [.4, 1.75, -28.5], look: [-1.7, 2.5, -40] },
  { t: .84, pos: [0, 1.8, -37.5], look: [.9, 2.8, -52] },
  { t: 1, pos: [0, 2.6, pz + 11], look: [0, 3.2, pz] }
]);
const intro = { v: 1 };
const look = new THREE.Vector3();
function placeCamera(p, t) {
  const k = path(p);
  const sway = Math.sin(t * .6) * .03;
  camera.position.set(k.pos[0] + mouse.sx * .5, k.pos[1] + sway - mouse.sy * .2 + intro.v * .6, k.pos[2] + intro.v * 10);
  look.set(k.look[0] + mouse.sx * 1.2, k.look[1], k.look[2]);
  camera.lookAt(look);
  camera.fov = mobile() ? 58 : 40; camera.updateProjectionMatrix();
  // l'ombre suit le visiteur
  sun.target.position.set(0, 0, camera.position.z - 10);
  sun.position.copy(sun.target.position).add(SUN_DIR);
  motes.position.z = camera.position.z - 4;
  bokeh.uniforms.focus.value = Math.min(14, camera.position.distanceTo(look) * .7);
}

const scroll = setupScroll(8);
document.querySelectorAll('[data-p]').forEach(a => a.addEventListener('click', e => { e.preventDefault(); scroll.to(+a.dataset.p); }));

const clock = new THREE.Clock();
function loop() {
  const t = clock.getElapsedTime();
  stepMouse();
  const p = scroll.update();
  chapters(p);
  placeCamera(p, t);
  mono.rotation.y = Math.sin(t * .4) * .2;
  mono.position.y = 3.1 + Math.sin(t * .7) * .06;
  monoLight.intensity = 60 * Math.max(0, (p - .8) / .2);
  motes.userData.update(t);
  st.finish.uniforms.uTime.value = t;
  st.composer.render();
  requestAnimationFrame(loop);
}

/* Monogramme */
function coinGeo(R, h, b) {
  const pts = [new THREE.Vector2(0, -h / 2)];
  for (let k = 0; k <= 8; k++) { const a = -Math.PI / 2 + k / 8 * Math.PI / 2; pts.push(new THREE.Vector2(R - b + Math.cos(a) * b, -h / 2 + b + Math.sin(a) * b)); }
  for (let k = 0; k <= 8; k++) { const a = k / 8 * Math.PI / 2; pts.push(new THREE.Vector2(R - b + Math.cos(a) * b, h / 2 - b + Math.sin(a) * b)); }
  pts.push(new THREE.Vector2(0, h / 2));
  return new THREE.LatheGeometry(pts, 160).rotateX(Math.PI / 2);
}
function medallion(font, bodyMat, letterMat, letter) {
  const g = new THREE.Group();
  const c = new THREE.Mesh(coinGeo(1, .22, .05), bodyMat); c.castShadow = true; g.add(c);
  const tg = new TextGeometry(letter, { font, size: .98, height: .09, depth: .09, curveSegments: 10, bevelEnabled: true, bevelThickness: .02, bevelSize: .015, bevelSegments: 4 });
  tg.computeBoundingBox(); const bb = tg.boundingBox;
  tg.translate(-(bb.max.x + bb.min.x) / 2, -(bb.max.y + bb.min.y) / 2, 0);
  const tx = new THREE.Mesh(tg, letterMat); tx.position.z = .09; g.add(tx);
  return g;
}

setLoad(.25);
new FontLoader().load('https://cdn.jsdelivr.net/npm/three@0.160.0/examples/fonts/helvetiker_bold.typeface.json', font => {
  setLoad(.7);
  const enamel = new THREE.MeshPhysicalMaterial({ color: 0xF2F0EB, roughness: .16, clearcoat: 1, clearcoatRoughness: .05 });
  const lacquer = new THREE.MeshPhysicalMaterial({ color: BRAND.yellow, roughness: .2, metalness: .35, clearcoat: 1 });
  const G = medallion(font, enamel, new THREE.MeshPhysicalMaterial({ color: BRAND.blue, roughness: .2, clearcoat: 1 }), 'G');
  const T = medallion(font, lacquer, new THREE.MeshPhysicalMaterial({ color: 0xFFFFFF, roughness: .2, clearcoat: 1 }), 'T');
  G.position.x = -.7; T.position.set(.7, 0, .2);
  mono.add(G, T);
  placeCamera(0, 0);
  st.renderer.compile(scene, camera);
  setLoad(1);
  loop();
  hideLoader(() => {
    gsap.to(intro, { v: 0, duration: 3.8, ease: 'power3.inOut', onComplete: () => scroll.lenis.start() });
    gsap.from('.ch-hero > *', { y: 30, autoAlpha: 0, duration: 1.6, stagger: .15, delay: 1.6, ease: 'expo.out' });
  });
});
