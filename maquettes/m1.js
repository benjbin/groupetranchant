/* Maquette 1 — Monogramme : le logo sculpté, en studio */
import * as THREE from 'three';
import { Reflector } from 'three/addons/objects/Reflector.js';
import { FontLoader } from 'three/addons/loaders/FontLoader.js';
import { TextGeometry } from 'three/addons/geometries/TextGeometry.js';
import { createStage, beam, dust, keyframes, setupScroll, chapters, hideLoader, setLoad, mouse, stepMouse, mobile, BRAND } from './shared.js';

const st = createStage({
  fov: 30, exposure: 1.05,
  dof: { focus: 10.5, aperture: .00018, maxblur: .006 },
  bloom: { strength: .32, radius: .7, threshold: .92 },
  grain: .045, vignette: .6, aberration: .0022
});
const { scene, camera, bokeh } = st;
scene.background = new THREE.Color(0x050608);
scene.fog = new THREE.FogExp2(0x050608, .05);

/* Sol miroir, assombri */
const mirror = new Reflector(new THREE.PlaneGeometry(120, 120), {
  textureWidth: innerWidth * st.dpr * .6, textureHeight: innerHeight * st.dpr * .6, color: 0x9a9a9a, clipBias: .003
});
mirror.rotation.x = -Math.PI / 2;
scene.add(mirror);
const tint = new THREE.Mesh(new THREE.PlaneGeometry(120, 120), new THREE.MeshStandardMaterial({ color: 0x060709, roughness: .5, metalness: 0, transparent: true, opacity: .8 }));
tint.rotation.x = -Math.PI / 2; tint.position.y = .003; tint.receiveShadow = true;
scene.add(tint);

/* Médaillons */
function coinGeo(R, h, b) {
  const pts = [new THREE.Vector2(0, -h / 2)];
  for (let k = 0; k <= 10; k++) { const a = -Math.PI / 2 + k / 10 * Math.PI / 2; pts.push(new THREE.Vector2(R - b + Math.cos(a) * b, -h / 2 + b + Math.sin(a) * b)); }
  for (let k = 0; k <= 10; k++) { const a = k / 10 * Math.PI / 2; pts.push(new THREE.Vector2(R - b + Math.cos(a) * b, h / 2 - b + Math.sin(a) * b)); }
  pts.push(new THREE.Vector2(0, h / 2));
  const g = new THREE.LatheGeometry(pts, 180);
  g.rotateX(Math.PI / 2);
  return g;
}
const R = 1.6, H = .36;
const enamel = new THREE.MeshPhysicalMaterial({ color: 0xE9E6E0, roughness: .16, clearcoat: 1, clearcoatRoughness: .04, envMapIntensity: .9 });
const lacquer = new THREE.MeshPhysicalMaterial({ color: BRAND.yellow, roughness: .2, metalness: .35, clearcoat: 1, clearcoatRoughness: .05, envMapIntensity: 1.1 });
const blueEnamel = new THREE.MeshPhysicalMaterial({ color: BRAND.blue, roughness: .22, metalness: .1, clearcoat: 1, clearcoatRoughness: .05 });
const whiteLetter = new THREE.MeshPhysicalMaterial({ color: 0xFFFFFF, roughness: .18, clearcoat: 1, clearcoatRoughness: .05 });
const goldRing = new THREE.MeshStandardMaterial({ color: 0xC9A13E, metalness: 1, roughness: .22 });

const mono = new THREE.Group();
scene.add(mono);
function medallion(body, letterMat, ringMat, letter, font) {
  const g = new THREE.Group();
  const coin = new THREE.Mesh(coinGeo(R, H, .07), body); coin.castShadow = true; coin.receiveShadow = true; g.add(coin);
  const ring = new THREE.Mesh(new THREE.TorusGeometry(R * .9, .018, 16, 200), ringMat); ring.position.z = H / 2; g.add(ring);
  const tg = new TextGeometry(letter, { font, size: 1.55, height: .14, depth: .14, curveSegments: 12, bevelEnabled: true, bevelThickness: .03, bevelSize: .022, bevelSegments: 5 });
  tg.computeBoundingBox();
  const bb = tg.boundingBox;
  tg.translate(-(bb.max.x + bb.min.x) / 2, -(bb.max.y + bb.min.y) / 2, 0);
  const txt = new THREE.Mesh(tg, letterMat); txt.position.z = H / 2 - .03; txt.castShadow = true; g.add(txt);
  return g;
}

/* Lumières */
scene.add(new THREE.AmbientLight(0xffffff, .015));
const key = new THREE.SpotLight(0xFFF0DA, 0, 40, .4, .7, 1.4);
key.position.set(2.2, 9.5, 5.5); key.target.position.set(0, 2, 0);
key.castShadow = true; key.shadow.mapSize.set(2048, 2048); key.shadow.bias = -.0002; key.shadow.normalBias = .02;
key.shadow.camera.near = 3; key.shadow.camera.far = 30;
scene.add(key, key.target);
const rimBlue = new THREE.SpotLight(0x5A8CC8, 0, 40, .55, .8, 1.4); rimBlue.position.set(-6, 4, -6); rimBlue.target.position.set(0, 2, 0); scene.add(rimBlue, rimBlue.target);
const rimWarm = new THREE.SpotLight(0xFFC27A, 0, 40, .5, .8, 1.4); rimWarm.position.set(6.5, 2.6, -4.5); rimWarm.target.position.set(0, 2, 0); scene.add(rimWarm, rimWarm.target);
const fill = new THREE.PointLight(0xFFFFFF, 0, 0, 2); fill.position.set(0, 2.4, 9); scene.add(fill);

const shaft = beam(key.position.clone(), new THREE.Vector3(0, 0, 0), 3.2, 0xFFEBCB, { anglePower: 2.4, opacity: .0 });
scene.add(shaft);
const motes = dust(1100, new THREE.Vector3(-4, .2, -3), new THREE.Vector3(4, 8.5, 4.5), 0xFFE7C2, .028, .55);
scene.add(motes);

/* Lames lumineuses en fond (bokeh) */
const slats = new THREE.Group(); scene.add(slats);
for (let k = 0; k < 14; k++) {
  const warm = k % 5 !== 2;
  const m = new THREE.MeshBasicMaterial({ color: new THREE.Color(warm ? 0xFFD9A6 : 0x7FA7D8).multiplyScalar(warm ? 1.6 : 1.2), fog: false });
  const s = new THREE.Mesh(new THREE.PlaneGeometry(.07, 5 + (k % 3) * 1.5), m);
  s.position.set(-18 + k * 2.7 + (k % 2) * .5, 3.2, -18 - (k % 4) * 1.2);
  slats.add(s);
}

/* Caméra */
const path = keyframes([
  { t: 0, pos: [-1.3, 2.4, 15], look: [-1.9, 1.35, 0], focus: 15 },
  { t: .37, pos: [3.4, 1.35, 4.4], look: [.95, 2.05, 0], focus: 4.7 },
  { t: .68, pos: [-3.9, 1.05, 5.4], look: [-1.1, 2.15, 0], focus: 5.7 },
  { t: 1, pos: [.4, 5.6, 13.5], look: [0, 1.7, 0], focus: 13.8 }
]);
const intro = { v: 1 };
const look = new THREE.Vector3();
function placeCamera(p, t) {
  const k = path(p);
  const m = mobile() ? 1.35 : 1;
  camera.position.set(k.pos[0] * m + Math.sin(t * .17) * .22 + mouse.sx * .5, k.pos[1] + Math.sin(t * .23) * .06 - mouse.sy * .3 + intro.v * 1.2, k.pos[2] * m + intro.v * 7);
  look.set(k.look[0], k.look[1], k.look[2]);
  camera.lookAt(look);
  bokeh.uniforms.focus.value = camera.position.distanceTo(look);
}

/* Scroll */
const scroll = setupScroll(5);
document.querySelectorAll('[data-p]').forEach(a => a.addEventListener('click', e => { e.preventDefault(); scroll.to(+a.dataset.p); }));

/* Boucle */
const clock = new THREE.Clock();
function loop() {
  const t = clock.getElapsedTime();
  stepMouse();
  const p = scroll.update();
  chapters(p);
  placeCamera(p, t);
  mono.position.y = R + .42 + Math.sin(t * .8) * .05;
  mono.rotation.y = -.12 + Math.sin(t * .3) * .08 + mouse.sx * .1;
  motes.userData.update(t);
  st.finish.uniforms.uTime.value = t;
  st.composer.render();
  requestAnimationFrame(loop);
}

/* Démarrage */
setLoad(.2);
new FontLoader().load('https://cdn.jsdelivr.net/npm/three@0.160.0/examples/fonts/helvetiker_bold.typeface.json', font => {
  setLoad(.7);
  const G = medallion(enamel, blueEnamel, blueEnamel, 'G', font);
  const T = medallion(lacquer, whiteLetter, goldRing, 'T', font);
  G.position.x = -1.12; T.position.set(1.12, 0, .32);
  mono.add(G, T);
  placeCamera(0, 0);
  st.renderer.compile(scene, camera);
  setLoad(1);
  loop();
  hideLoader(() => {
    gsap.to(intro, { v: 0, duration: 3.6, ease: 'power3.inOut', onComplete: () => scroll.lenis.start() });
    gsap.to(key, { intensity: 170, duration: 2.6, delay: .3, ease: 'power2.inOut' });
    gsap.to(rimBlue, { intensity: 110, duration: 2.6, delay: .9, ease: 'power2.inOut' });
    gsap.to(rimWarm, { intensity: 70, duration: 2.6, delay: 1.2, ease: 'power2.inOut' });
    gsap.to(fill, { intensity: 4, duration: 2.6, delay: .6 });
    gsap.to(shaft.material.uniforms.uOpacity, { value: .22, duration: 3, delay: .4 });
    gsap.from('.ch-hero > *', { y: 30, autoAlpha: 0, duration: 1.6, stagger: .15, delay: 1.6, ease: 'expo.out' });
  });
});
