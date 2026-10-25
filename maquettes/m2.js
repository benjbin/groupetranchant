/* Maquette 2 — Maquette d'architecte : la France en plâtre, effet miniature */
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { createStage, keyframes, setupScroll, chapters, hideLoader, setLoad, mouse, stepMouse, mobile, clamp01, BRAND } from './shared.js';

const PLACES = [
  { name: 'Paris Élysées Club', city: 'Paris', type: 'club', lon: 2.30, lat: 48.87, r: 'centre', url: 'https://www.paris-elysees-club.com/' },
  { name: 'Grand Casino Basel', city: 'Bâle (CH)', type: 'casino', lon: 7.53, lat: 47.59, r: 'est', url: 'https://grandcasinobasel.com/' },
  { name: 'Airport Hotel Basel', city: 'Bâle (CH)', type: 'hotel', lon: 7.53, lat: 47.59, r: 'est', url: 'https://www.airporthotelbasel.com/en/' },
  { name: 'Grand Casino Prilly', city: 'Prilly (CH)', type: 'casino', lon: 6.60, lat: 46.53, r: 'est', url: '' },
  { name: 'Seven Casino', city: 'Amnéville', type: 'casino', lon: 6.14, lat: 49.26, r: 'est', url: 'https://seven-casino.com/' },
  { name: 'Golden Tulip', city: 'Amnéville', type: 'hotel', lon: 6.14, lat: 49.26, r: 'est', url: 'https://amneville.goldentulip.com/fr-fr/' },
  { name: 'Casino de Saint-Gervais', city: 'Saint-Gervais', type: 'casino', lon: 6.71, lat: 45.89, r: 'est', url: 'https://casino-saint-gervais.fr/' },
  { name: "Casino d'Argelès-Gazost", city: 'Argelès-Gazost', type: 'casino', lon: -0.10, lat: 43.00, r: 'sud', url: 'https://casino-argeles-gazost.fr/' },
  { name: 'Casino de Bagnères-de-Bigorre', city: 'Bagnères-de-Bigorre', type: 'casino', lon: 0.15, lat: 43.07, r: 'sud', url: 'https://casino-bagneres-de-bigorre.fr/' },
  { name: 'Casino de Pau', city: 'Pau', type: 'casino', lon: -0.37, lat: 43.30, r: 'sud', url: 'https://casino-pau.fr/' },
  { name: 'Casino Terrazur', city: 'Cagnes-sur-Mer', type: 'casino', lon: 7.15, lat: 43.66, r: 'sud', url: 'https://casinoterrazur.com/' },
  { name: 'Casino Flamingos', city: 'Le Grau-du-Roi', type: 'casino', lon: 4.14, lat: 43.54, r: 'sud', url: 'https://casino-grau-du-roi.fr/' },
  { name: 'Casino de Sète', city: 'Sète', type: 'casino', lon: 3.70, lat: 43.40, r: 'sud', url: 'https://casino-sete.fr/' },
  { name: 'Casino de Valras-Plage', city: 'Valras-Plage', type: 'casino', lon: 3.29, lat: 43.25, r: 'sud', url: 'https://casino-valras.fr/' },
  { name: 'Casino de Dunkerque', city: 'Dunkerque', type: 'casino', lon: 2.38, lat: 51.03, r: 'manche', url: 'https://casino-dunkerque.fr/' },
  { name: "Casino d'Yport", city: 'Yport', type: 'casino', lon: 0.31, lat: 49.73, r: 'manche', url: 'https://casino-yport.fr/' },
  { name: 'Casino de Villers-sur-Mer', city: 'Villers-sur-Mer', type: 'casino', lon: 0.00, lat: 49.32, r: 'manche', url: 'https://casino-villers-sur-mer.fr/' },
  { name: 'Casino de Luc-sur-Mer', city: 'Luc-sur-Mer', type: 'casino', lon: -0.35, lat: 49.31, r: 'manche', url: 'https://casino-luc-sur-mer.fr/' },
  { name: 'Casino de Roscoff', city: 'Roscoff', type: 'casino', lon: -3.98, lat: 48.71, r: 'manche', url: 'https://casino-roscoff.fr/' },
  { name: 'Casino de Néris-les-Bains', city: 'Néris-les-Bains', type: 'casino', lon: 2.66, lat: 46.29, r: 'centre', url: 'https://casino-neris-les-bains.fr/' },
  { name: 'Casino de Pougues-les-Eaux', city: 'Pougues-les-Eaux', type: 'casino', lon: 3.10, lat: 47.08, r: 'centre', url: 'https://casino-pougues-les-eaux.fr/' },
  { name: 'Hôtel des Sources', city: 'Pougues-les-Eaux', type: 'hotel', lon: 3.10, lat: 47.08, r: 'centre', url: 'https://www.hoteldessources.fr/fr/' }
];
const LABEL = { casino: 'Casino', hotel: 'Hôtel', club: 'Club de jeux' };
const FRANCE = [[2.54,51.09],[3.15,50.79],[3.7,50.3],[4.23,49.96],[4.8,49.95],[4.86,50.15],[5.8,49.55],[6.37,49.46],[7.0,49.15],[7.6,49.08],[8.22,48.97],[7.8,48.5],[7.58,48.1],[7.55,47.58],[7.0,47.45],[6.95,47.25],[6.45,46.95],[6.1,46.58],[6.13,46.25],[6.3,46.4],[6.8,46.4],[6.85,46.15],[7.0,45.9],[6.8,45.4],[7.1,45.2],[6.65,45.0],[7.0,44.7],[6.9,44.35],[7.7,44.15],[7.5,43.78],[7.0,43.55],[6.65,43.2],[6.1,43.05],[5.4,43.2],[4.85,43.35],[4.2,43.47],[3.6,43.3],[3.05,42.9],[3.17,42.43],[2.6,42.35],[1.75,42.5],[0.7,42.85],[-0.3,42.8],[-1.4,43.25],[-1.78,43.37],[-1.45,43.9],[-1.25,44.6],[-1.15,45.5],[-1.45,46.2],[-2.15,46.85],[-2.5,47.3],[-3.0,47.55],[-4.35,47.8],[-4.75,48.05],[-4.78,48.5],[-4.0,48.72],[-3.2,48.85],[-2.3,48.62],[-1.6,48.65],[-1.58,49.2],[-1.9,49.68],[-1.25,49.7],[-1.15,49.35],[-0.4,49.33],[0.1,49.43],[0.2,49.7],[1.1,49.93],[1.6,50.2],[1.58,50.75],[1.9,50.96]];
const SWISS = [[6.13,46.25],[6.1,46.58],[6.45,46.95],[6.95,47.25],[7.0,47.45],[7.55,47.58],[8.2,47.62],[8.6,47.8],[9.55,47.55],[9.55,47.05],[10.45,46.87],[10.45,46.55],[10.1,46.25],[9.3,46.5],[9.0,45.83],[8.45,46.25],[7.85,45.92],[7.0,45.9],[6.85,46.15],[6.8,46.4],[6.3,46.4]];

const S = .95;
const W = (lon, lat) => [((lon + 5.4) * .69 - 5.45) * S, ((51.4 - lat) - 4.75) * S]; // x, z (nord = -z)
const TOP = .5;

const st = createStage({
  fov: 28, exposure: 1.18,
  tilt: { amount: 4, focus: .5, range: .36 },
  bloom: { strength: 0, radius: .1, threshold: 10 },
  grain: .028, vignette: .28, aberration: .0006, maxDpr: 1.5
});
const { scene, camera } = st;
const BGC = new THREE.Color(0xD9D0C3);
scene.background = BGC.clone();
scene.fog = new THREE.Fog(0xD9D0C3, 28, 70);

/* Table */
const table = new THREE.Mesh(new THREE.PlaneGeometry(200, 200), new THREE.MeshStandardMaterial({ color: 0xBFB4A4, roughness: .95 }));
table.rotation.x = -Math.PI / 2; table.receiveShadow = true; scene.add(table);

/* Relief plâtre */
function noiseTex() {
  const c = document.createElement('canvas'); c.width = c.height = 512;
  const x = c.getContext('2d'); const img = x.createImageData(512, 512);
  for (let i = 0; i < img.data.length; i += 4) { const v = 118 + Math.random() * 20; img.data[i] = img.data[i + 1] = img.data[i + 2] = v; img.data[i + 3] = 255; }
  x.putImageData(img, 0, 0);
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(6, 6); return t;
}
const bump = noiseTex();
const plaster = new THREE.MeshStandardMaterial({ color: 0xF8F6F2, roughness: .88, bumpMap: bump, bumpScale: .6, envMapIntensity: .08 });
const plasterWarm = new THREE.MeshStandardMaterial({ color: 0xF1E8DA, roughness: .9, bumpMap: bump, bumpScale: .6, envMapIntensity: .08 });
function shape(pts) { const s = new THREE.Shape(); pts.forEach(([lo, la], k) => { const [x, z] = W(lo, la); k ? s.lineTo(x, -z) : s.moveTo(x, -z); }); s.closePath(); return s; }
function slab(pts, depth, m) {
  const g = new THREE.ExtrudeGeometry(shape(pts), { depth, bevelEnabled: true, bevelThickness: .05, bevelSize: .05, bevelSegments: 4, curveSegments: 2 });
  g.rotateX(-Math.PI / 2);
  const mesh = new THREE.Mesh(g, m); mesh.castShadow = mesh.receiveShadow = true; return mesh;
}
const fr = slab(FRANCE, TOP - .05, plaster); scene.add(fr);
const ch = slab(SWISS, TOP - .17, plasterWarm); scene.add(ch);

/* Courbes de niveau autour du littoral */
const centre = new THREE.Vector3();
{
  const pts = FRANCE.map(([lo, la]) => { const [x, z] = W(lo, la); return new THREE.Vector3(x, 0, z); });
  pts.forEach(v => centre.add(v)); centre.divideScalar(pts.length);
  [1.035, 1.075, 1.12, 1.17].forEach((k, n) => {
    const ring = pts.map(v => v.clone().sub(centre).multiplyScalar(k).add(centre).setY(.004));
    ring.push(ring[0].clone());
    const line = new THREE.Line(new THREE.BufferGeometry().setFromPoints(ring), new THREE.LineBasicMaterial({ color: 0xBDB2A2, transparent: true, opacity: .55 - n * .1 }));
    scene.add(line);
  });
}

/* Bâtiments miniatures */
let seed = 7;
const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
const white = new THREE.MeshStandardMaterial({ color: 0xFBFAF7, roughness: .7, envMapIntensity: .08 });
const accent = {
  casino: new THREE.MeshStandardMaterial({ color: BRAND.blue, roughness: .45 }),
  hotel: new THREE.MeshStandardMaterial({ color: BRAND.yellow, roughness: .4, metalness: .2 }),
  club: new THREE.MeshStandardMaterial({ color: BRAND.bordeaux, roughness: .45 })
};
const hitMat = new THREE.MeshBasicMaterial({ visible: false });
const hits = [];
function building(p) {
  const g = new THREE.Group();
  const box = (w, h, d, x, z, m = white) => { const b = new THREE.Mesh(new RoundedBoxGeometry(w, h, d, 2, .012), m); b.position.set(x, h / 2, z); b.castShadow = b.receiveShadow = true; g.add(b); return b; };
  let top = 0;
  if (p.type === 'hotel') {
    box(.16, .78, .16, 0, 0); box(.26, .2, .2, 0, .02); top = .78;
    box(.17, .03, .17, 0, 0, accent.hotel).position.y = .79;
  } else if (p.type === 'club') {
    box(.28, .5, .22, 0, 0); box(.1, .95, .1, .05, -.02); top = .95;
    box(.11, .03, .11, .05, -.02, accent.club).position.y = .96;
  } else {
    const w = .26 + rnd() * .1, h = .22 + rnd() * .16;
    box(w, h, .22, 0, 0);
    box(.12, h * .7, .12, w / 2 + .05, .04);
    const dome = new THREE.Mesh(new THREE.SphereGeometry(.075, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2), accent.casino);
    dome.position.set(-.04, h, 0); dome.castShadow = true; g.add(dome);
    top = h + .08;
  }
  g.rotation.y = rnd() * Math.PI;
  const hit = new THREE.Mesh(new THREE.BoxGeometry(.45, top + .1, .45), hitMat); hit.position.y = (top + .1) / 2; hit.userData.place = p; g.add(hit); hits.push(hit);
  return { g, top };
}
const labelsEl = document.getElementById('labels');
PLACES.forEach(p => {
  let [x, z] = W(p.lon, p.lat);
  if (p.type === 'hotel') { x += .26; z += .14; }
  const { g, top } = building(p);
  const y = p.city.startsWith('Prilly') ? TOP - .12 : TOP;
  g.position.set(x, y, z);
  scene.add(g);
  p.pos = new THREE.Vector3(x, y + top + .05, z);
  p.lab = document.createElement('div'); p.lab.className = 'lab'; p.lab.textContent = p.name;
  labelsEl.appendChild(p.lab);
});

/* Listes des chapitres */
document.querySelectorAll('.places').forEach(ul => {
  ul.innerHTML = PLACES.filter(p => p.r === ul.dataset.region).map(p => `<li><i class="c-${p.type}"></i>${p.url ? `<a href="${p.url}" target="_blank" rel="noopener">${p.name}</a>` : p.name}<span>${p.city}</span></li>`).join('');
});

/* Lumière : du matin à la fin de journée */
const hemi = new THREE.HemisphereLight(0xFFFFFF, 0x9C907E, .28); scene.add(hemi);
const sun = new THREE.DirectionalLight(0xFFF6EA, 3.2);
sun.castShadow = true; sun.shadow.mapSize.set(4096, 4096);
Object.assign(sun.shadow.camera, { left: -9, right: 9, top: 9, bottom: -9, near: 1, far: 50 });
sun.shadow.bias = -.0002; sun.shadow.normalBias = .015;
scene.add(sun, sun.target);
const sunWarm = new THREE.Color(0xFFC890), sunCool = new THREE.Color(0xFFF6EA);
function placeSun(p) {
  const az = THREE.MathUtils.lerp(2.3, 3.9, p), el = THREE.MathUtils.lerp(.62, .32, p);
  sun.position.set(Math.cos(az) * Math.cos(el) * 20, Math.sin(el) * 20, Math.sin(az) * Math.cos(el) * 20).add(centre);
  sun.target.position.copy(centre);
  sun.color.copy(sunCool).lerp(sunWarm, Math.pow(p, 1.4));
  sun.intensity = THREE.MathUtils.lerp(2.4, 2.1, p);
  hemi.intensity = THREE.MathUtils.lerp(.28, .2, p);
  scene.background.copy(BGC).lerp(new THREE.Color(0xD8C4A8), p * .6);
  scene.fog.color.copy(scene.background);
}

/* Caméra */
const regionCenter = r => { const v = new THREE.Vector3(); const L = PLACES.filter(p => p.r === r); L.forEach(p => v.add(p.pos)); return v.divideScalar(L.length); };
const C = ['manche', 'centre', 'sud', 'est'].map(regionCenter);
const shot = (c, off) => ({ pos: [c.x + off[0], c.y + off[1], c.z + off[2]], look: [c.x, c.y - .3, c.z] });
const frames = [
  { t: 0, pos: [centre.x + .6, 15.5, centre.z + 10.5], look: [centre.x + .6, 0, centre.z + .6], tilt: 2.5 },
  { t: .2, ...shot(C[0], [-2.4, 5.8, 7.4]), tilt: 5 },
  { t: .4, ...shot(C[1], [2.6, 6.0, 7.4]), tilt: 5 },
  { t: .6, ...shot(C[2], [-.6, 9.5, 10.5]), tilt: 4 },
  { t: .8, ...shot(C[3], [-3.4, 7.2, 8.4]), tilt: 5 },
  { t: 1, pos: [centre.x - 2.5, 17, centre.z + 12], look: [centre.x, 0, centre.z + .3], tilt: 4 }
];
const path = keyframes(frames);
const intro = { v: 1 };
const look = new THREE.Vector3();
function placeCamera(p, t) {
  const k = path(p);
  const m = mobile() ? 1.5 : 1;
  const off = mobile() ? 0 : -1.6; // l'objet à droite du texte
  look.set(k.look[0] + off * (1 - Math.abs(k.e - .5) * 0), k.look[1], k.look[2]);
  camera.position.set(k.pos[0] + off + mouse.sx * .6 + Math.sin(t * .1) * .15, (k.pos[1] - k.look[1]) * m + k.look[1] + intro.v * 9, (k.pos[2] - k.look[2]) * m + k.look[2] + intro.v * 6);
  camera.lookAt(look);
  st.tiltH.uniforms.uAmount.value = st.tiltV.uniforms.uAmount.value = k.tilt;
}

/* Survol */
const ray = new THREE.Raycaster(), ndc = new THREE.Vector2(-9, -9), tip = document.getElementById('tip');
let hovered = null, px = 0, py = 0;
addEventListener('pointermove', e => { px = e.clientX; py = e.clientY; ndc.set(px / innerWidth * 2 - 1, -(py / innerHeight) * 2 + 1); });
st.renderer.domElement.addEventListener('click', () => { if (hovered && hovered.url) open(hovered.url, '_blank', 'noopener'); });

const scroll = setupScroll(7);
document.querySelectorAll('[data-p]').forEach(a => a.addEventListener('click', e => { e.preventDefault(); scroll.to(+a.dataset.p); }));

const v = new THREE.Vector3();
const clock = new THREE.Clock();
function loop() {
  const t = clock.getElapsedTime();
  stepMouse();
  const p = scroll.update();
  chapters(p);
  placeSun(p);
  placeCamera(p, t);
  // étiquettes des établissements proches du point de vue
  PLACES.forEach(pl => {
    const d = pl.pos.distanceTo(look);
    v.copy(pl.pos).project(camera);
    pl.lab.style.opacity = clamp01((3.4 - d) / 1.2) * clamp01((10.5 - camera.position.y) / 2) * (1 - intro.v);
    pl.lab.style.transform = `translate(${(v.x * .5 + .5) * innerWidth + 8}px,${(-v.y * .5 + .5) * innerHeight - 6}px)`;
  });
  ray.setFromCamera(ndc, camera);
  const h = ray.intersectObjects(hits)[0];
  hovered = h ? h.object.userData.place : null;
  st.renderer.domElement.style.cursor = hovered && hovered.url ? 'pointer' : '';
  if (hovered) { tip.innerHTML = `<small>${LABEL[hovered.type]} · ${hovered.city}</small>${hovered.name}`; tip.style.left = px + 'px'; tip.style.top = py + 'px'; tip.style.opacity = 1; }
  else tip.style.opacity = 0;
  st.finish.uniforms.uTime.value = t;
  st.composer.render();
  requestAnimationFrame(loop);
}

setLoad(.6);
placeSun(0); placeCamera(0, 0);
st.renderer.compile(scene, camera);
setLoad(1);
loop();
hideLoader(() => {
  gsap.to(intro, { v: 0, duration: 3.4, ease: 'power3.inOut', onComplete: () => scroll.lenis.start() });
  gsap.from('.ch-hero > *', { y: 30, autoAlpha: 0, duration: 1.6, stagger: .15, delay: 1.4, ease: 'expo.out' });
});
