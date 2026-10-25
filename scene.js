/* Groupe Tranchant — scènes 3D (ouverture Monogramme et maquette des implantations) */
import * as THREE from 'three';
import { Reflector } from 'three/addons/objects/Reflector.js';
import { FontLoader } from 'three/addons/loaders/FontLoader.js';
import { TextGeometry } from 'three/addons/geometries/TextGeometry.js';
import { createStage, beam, dust, keyframes, mouse, stepMouse, mobile, clamp01, BRAND } from './stage.js';
import { IMG, PLACES, FRANCE, PHOTO } from './data.js';

function initHero(ctx, LITE, onReady) {
const { lenis, chapters, progressOf, smoother, reduceMotion } = ctx;
/* ================= OUVERTURE : MONOGRAMME ================= */
const heroEl = document.getElementById('hero');
const H = createStage({
  canvas: document.getElementById('gl-hero'), fov: 30, exposure: 1.05,
  dof: LITE ? null : { focus: 15, aperture: .00018, maxblur: .006 },
  bloom: { strength: .3, radius: .7, threshold: 1.0 },
  grain: .045, vignette: .6, aberration: .0022
});
H.scene.background = new THREE.Color(0x050608);
H.scene.fog = new THREE.FogExp2(0x050608, .05);
{
  const mirror = new Reflector(new THREE.PlaneGeometry(120, 120), { textureWidth: innerWidth * H.dpr * (LITE ? .35 : .6), textureHeight: innerHeight * H.dpr * (LITE ? .35 : .6), color: 0x9a9a9a, clipBias: .003 });
  mirror.rotation.x = -Math.PI / 2; H.scene.add(mirror);
  const tint = new THREE.Mesh(new THREE.PlaneGeometry(120, 120), new THREE.MeshStandardMaterial({ color: 0x060709, roughness: .5, transparent: true, opacity: .8 }));
  tint.rotation.x = -Math.PI / 2; tint.position.y = .003; tint.receiveShadow = true; H.scene.add(tint);
}
function coinGeo(R, h, b) {
  const pts = [new THREE.Vector2(0, -h / 2)];
  for (let k = 0; k <= 10; k++) { const a = -Math.PI / 2 + k / 10 * Math.PI / 2; pts.push(new THREE.Vector2(R - b + Math.cos(a) * b, -h / 2 + b + Math.sin(a) * b)); }
  for (let k = 0; k <= 10; k++) { const a = k / 10 * Math.PI / 2; pts.push(new THREE.Vector2(R - b + Math.cos(a) * b, h / 2 - b + Math.sin(a) * b)); }
  pts.push(new THREE.Vector2(0, h / 2));
  return new THREE.LatheGeometry(pts, 180).rotateX(Math.PI / 2);
}
/* Tranche cannelée, comme une vraie pièce */
function reededGeo(R, h, ridges) {
  const g = new THREE.CylinderGeometry(R, R, h, ridges * 4, 1, true);
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), z = p.getZ(i), a = Math.atan2(z, x), k = 1 + .006 * Math.cos(a * ridges);
    p.setX(i, Math.cos(a) * R * k); p.setZ(i, Math.sin(a) * R * k);
  }
  g.computeVertexNormals();
  return g.rotateX(Math.PI / 2);
}
/* Guilloché gravé sous le vernis : rayons pour le G, ondes concentriques pour le T */
function guilloche(kind) {
  const c = document.createElement('canvas'); c.width = c.height = 1024;
  const x = c.getContext('2d'), m = 512;
  x.fillStyle = '#808080'; x.fillRect(0, 0, 1024, 1024);
  x.translate(m, m);
  if (kind === 'rays') {
    for (let k = 0; k < 360; k++) {
      x.rotate(Math.PI * 2 / 360);
      x.fillStyle = k % 2 ? 'rgba(255,255,255,.22)' : 'rgba(0,0,0,.22)';
      x.beginPath(); x.moveTo(0, 0); x.lineTo(-4.5, -m); x.lineTo(4.5, -m); x.closePath(); x.fill();
    }
  } else {
    x.lineWidth = 2.2;
    for (let r = 14; r < m; r += 9) {
      x.strokeStyle = (r / 9) % 2 < 1 ? 'rgba(255,255,255,.3)' : 'rgba(0,0,0,.3)';
      x.beginPath();
      for (let a = 0; a <= Math.PI * 2 + .01; a += .01) { const rr = r + Math.sin(a * 24) * 3.2; a ? x.lineTo(Math.cos(a) * rr, Math.sin(a) * rr) : x.moveTo(rr, 0); }
      x.stroke();
    }
  }
  const t = new THREE.CanvasTexture(c);
  t.anisotropy = H.renderer.capabilities.getMaxAnisotropy();
  return t;
}
const CR = 1.6, CH = .36;
const mats = {
  enamel: new THREE.MeshPhysicalMaterial({ color: 0xE4E1DA, roughness: .22, clearcoat: 1, clearcoatRoughness: .03, envMapIntensity: .65 }),
  lacquer: new THREE.MeshPhysicalMaterial({ color: BRAND.yellow, roughness: .24, metalness: .4, clearcoat: 1, clearcoatRoughness: .03, envMapIntensity: 1 }),
  blue: new THREE.MeshPhysicalMaterial({ color: BRAND.blue, roughness: .2, metalness: .15, clearcoat: 1, clearcoatRoughness: .04, envMapIntensity: .8 }),
  white: new THREE.MeshPhysicalMaterial({ color: 0xFBFAF7, roughness: .16, clearcoat: 1, clearcoatRoughness: .04, envMapIntensity: .7 }),
  gold: new THREE.MeshStandardMaterial({ color: 0xC9A13E, metalness: 1, roughness: .2 })
};
const faceG = mats.enamel.clone(); faceG.bumpMap = guilloche('rays'); faceG.bumpScale = 1.4;
const faceT = mats.lacquer.clone(); faceT.bumpMap = guilloche('waves'); faceT.bumpScale = 1.8;
const mono = new THREE.Group(); H.scene.add(mono);
let G = null, T = null;
function medallion(body, face, letterMat, ringMat, letter, font) {
  const g = new THREE.Group();
  const coin = new THREE.Mesh(coinGeo(CR, CH, .07), body); coin.castShadow = coin.receiveShadow = true; g.add(coin);
  const edge = new THREE.Mesh(reededGeo(CR + .003, CH - .15, 220), body); g.add(edge);
  const disc = new THREE.Mesh(new THREE.CircleGeometry(CR * .885, 160), face); disc.position.z = CH / 2 + .002; disc.receiveShadow = true; g.add(disc);
  [CR * .9, CR * .955].forEach((r, k) => { const ring = new THREE.Mesh(new THREE.TorusGeometry(r, k ? .01 : .02, 16, 220), ringMat); ring.position.z = CH / 2; g.add(ring); });
  const tg = new TextGeometry(letter, { font, size: 1.5, height: .16, depth: .16, curveSegments: 14, bevelEnabled: true, bevelThickness: .035, bevelSize: .024, bevelSegments: 6 });
  tg.computeBoundingBox(); const bb = tg.boundingBox;
  tg.translate(-(bb.max.x + bb.min.x) / 2, -(bb.max.y + bb.min.y) / 2, 0);
  const txt = new THREE.Mesh(tg, letterMat); txt.position.z = CH / 2 - .02; txt.castShadow = true; g.add(txt);
  const pivot = new THREE.Group(); pivot.add(g);
  return pivot;
}

/* Lumières */
H.scene.add(new THREE.AmbientLight(0xffffff, .015));
const key = new THREE.SpotLight(0xFFF0DA, 0, 40, .4, .7, 1.4);
key.position.set(2.2, 9.5, 5.5); key.target.position.set(0, 2, 0);
key.castShadow = true; key.shadow.mapSize.setScalar(LITE ? 1024 : 2048); key.shadow.bias = -.0002; key.shadow.normalBias = .02;
H.scene.add(key, key.target);
const rimBlue = new THREE.SpotLight(0x5A8CC8, 0, 40, .55, .8, 1.4); rimBlue.position.set(-6, 4, -6); rimBlue.target.position.set(0, 2, 0); H.scene.add(rimBlue, rimBlue.target);
const rimWarm = new THREE.SpotLight(0xFFC27A, 0, 40, .5, .8, 1.4); rimWarm.position.set(6.5, 2.6, -4.5); rimWarm.target.position.set(0, 2, 0); H.scene.add(rimWarm, rimWarm.target);
const fill = new THREE.PointLight(0xFFFFFF, 0, 0, 2); fill.position.set(0, 2.4, 9); H.scene.add(fill);
/* Reflet qui balaie les médaillons */
const sweep = new THREE.SpotLight(0xFFFFFF, 0, 30, .09, .6, 1.2);
sweep.position.set(-9, 3.4, 7); sweep.target.position.set(0, 2.1, 0); H.scene.add(sweep, sweep.target);
const shaft = beam(key.position.clone(), new THREE.Vector3(0, 0, 0), 3.2, 0xFFEBCB, { anglePower: 2.4, opacity: 0 });
H.scene.add(shaft);
const motes = dust(1100, new THREE.Vector3(-4, .2, -3), new THREE.Vector3(4, 8.5, 4.5), 0xFFE7C2, .028, .55);
H.scene.add(motes);

/* Décor : paroi cannelée sombre et halos lointains */
{
  const c = document.createElement('canvas'); c.width = 64; c.height = 8;
  const x = c.getContext('2d'); const gr = x.createLinearGradient(0, 0, 64, 0);
  gr.addColorStop(0, '#202020'); gr.addColorStop(.5, '#e0e0e0'); gr.addColorStop(1, '#202020');
  x.fillStyle = gr; x.fillRect(0, 0, 64, 8);
  const flute = new THREE.CanvasTexture(c); flute.wrapS = THREE.RepeatWrapping; flute.repeat.set(140, 1);
  const wall = new THREE.Mesh(new THREE.CylinderGeometry(21, 21, 18, 280, 1, true, Math.PI * .62, Math.PI * .76),
    new THREE.MeshStandardMaterial({ color: 0x121419, roughness: .5, metalness: .25, bumpMap: flute, bumpScale: 3, side: THREE.BackSide, envMapIntensity: .25 }));
  wall.position.set(0, 7, 6); wall.receiveShadow = true;
  H.scene.add(wall);
  const orbs = [[-9, 4.2, -11, 0xFFD3A0], [-6.5, 2.2, -12.5, 0xFFC890], [7.5, 3.6, -11.5, 0xFFD9AE], [10.5, 5.6, -12, 0x8FB2DE], [-12, 6.4, -9.5, 0x8FB2DE], [4.5, 6.8, -13, 0xFFE2BE], [13, 2.4, -9, 0xFFC890], [-3, 7.4, -13.5, 0xFFD9AE]];
  orbs.forEach(([ox, oy, oz, c2]) => {
    const o = new THREE.Mesh(new THREE.SphereGeometry(.2, 16, 12), new THREE.MeshBasicMaterial({ color: new THREE.Color(c2).multiplyScalar(2.2), fog: false }));
    o.position.set(ox, oy, oz); H.scene.add(o);
  });
}

/* Caméra et chorégraphie liées au défilement */
const heroPath = keyframes([
  { t: 0, pos: [-1.3, 2.4, 15], look: [-1.9, 1.35, 0], sep: 0, spin: -.12 },
  { t: .37, pos: [5.2, 1.6, 7.4], look: [2.9, 2.0, 0], sep: .22, spin: .32 },
  { t: .68, pos: [-5.6, 1.3, 7.6], look: [-3.0, 2.1, 0], sep: .22, spin: -.38 },
  { t: 1, pos: [.4, 5.6, 13.5], look: [0, 1.7, 0], sep: 0, spin: 0 }
]);
const intro = { v: 1, g: 1, t: 1 };
const heroLook = new THREE.Vector3();
const heroP = smoother(5);
const tilt = { x: 0, y: 0 };
function renderHero(t) {
  const p = heroP(progressOf(heroEl));
  chapters(heroEl, p);
  const k = heroPath(p);
  const f = mobile() ? 1.7 : Math.max(1, 1.62 / H.camera.aspect);
  heroLook.set(k.look[0] * (mobile() ? .2 : 1), k.look[1] + (mobile() ? -1.9 : 0), k.look[2]);
  H.camera.position.set(
    heroLook.x + (k.pos[0] - k.look[0]) * f + Math.sin(t * .17) * .22 + mouse.sx * .5,
    heroLook.y + (k.pos[1] - k.look[1]) * (mobile() ? 1 : f) + Math.sin(t * .23) * .06 - mouse.sy * .3 + intro.v * 1.2,
    heroLook.z + (k.pos[2] - k.look[2]) * f + intro.v * 7
  );
  H.camera.lookAt(heroLook);
  if (H.bokeh) H.bokeh.uniforms.focus.value = H.camera.position.distanceTo(heroLook);
  tilt.x += (-mouse.sy * .14 - tilt.x) * .05; tilt.y += (mouse.sx * .2 - tilt.y) * .05;
  mono.position.y = CR + .42 + Math.sin(t * .8) * .05;
  mono.rotation.set(tilt.x, k.spin + Math.sin(t * .3) * .06 + tilt.y, 0);
  if (G && T) {
    G.position.set(-1.12 - k.sep, Math.sin(t * .9) * .02 - intro.g * .4, 0);
    G.rotation.y = -intro.g * Math.PI * .5;
    T.position.set(1.12 + k.sep + intro.t * 1.1, Math.sin(t * .9 + 1) * .02, .32 + k.sep * .8 - intro.t * 1.2);
    T.rotation.y = intro.t * Math.PI * .5;
  }
  // reflet périodique (toutes les 9 s)
  const ph = (t % 9) / 9, sw = clamp01(ph / .28);
  sweep.position.x = -9 + 18 * sw;
  sweep.intensity = reduceMotion ? 0 : Math.sin(Math.PI * sw) * 110 * (1 - intro.v * .5);
  if (!reduceMotion) motes.userData.update(t);
  H.finish.uniforms.uTime.value = t;
  H.composer.render();
}


const bar = document.querySelector('#loader .bar i');
const setLoad = v => { if (bar) bar.style.width = Math.round(v * 100) + '%'; };
setLoad(.2);
new FontLoader().load('/vendor/fonts/helvetiker_bold.typeface.json', font => {
  setLoad(.7);
  G = medallion(mats.enamel, faceG, mats.blue, mats.blue, 'G', font);
  T = medallion(mats.lacquer, faceT, mats.white, mats.gold, 'T', font);
  mono.add(G, T);
  H.renderer.compile(H.scene, H.camera);
  setLoad(1);
  onReady();
  document.getElementById('loader').classList.add('done');
  document.body.classList.remove('loading');
  if (reduceMotion) gsap.globalTimeline.timeScale(6);
  setTimeout(() => {
    gsap.to(intro, { v: 0, duration: 3.6, ease: 'power3.inOut', onComplete: () => lenis.start() });
    gsap.to(intro, { g: 0, duration: 2.6, delay: .5, ease: 'expo.inOut' });
    gsap.to(intro, { t: 0, duration: 2.8, delay: 1.0, ease: 'expo.inOut' });
    gsap.to(key, { intensity: 170, duration: 2.6, delay: .3, ease: 'power2.inOut' });
    gsap.to(rimBlue, { intensity: 110, duration: 2.6, delay: .9, ease: 'power2.inOut' });
    gsap.to(rimWarm, { intensity: 70, duration: 2.6, delay: 1.2, ease: 'power2.inOut' });
    gsap.to(fill, { intensity: 4, duration: 2.6, delay: .6 });
    gsap.to(shaft.material.uniforms.uOpacity, { value: .22, duration: 3, delay: .4 });
    setTimeout(() => document.dispatchEvent(new Event('hero:intro')), reduceMotion ? 0 : 1500);
  }, 400);
});
return { el: heroEl, render: renderHero };
}

function initMapScene(ctx, LITE) {
const { chapters, progressOf, isVisible, smoother } = ctx;
/* ================= IMPLANTATIONS : MAQUETTE TOPOGRAPHIQUE ================= */

const mapEl = document.getElementById('implantations');
const M = createStage({
  canvas: document.getElementById('gl-map'), fov: 28, exposure: 1.0,
  tilt: { amount: 2, focus: .5, range: .42 },
  bloom: { strength: .4, radius: .5, threshold: 1.1 },
  grain: .035, vignette: .55, aberration: .0006
});
M.scene.background = new THREE.Color(0x07080B);
M.scene.fog = new THREE.Fog(0x07080B, 26, 62);

/* Projection (identique pour le relief, les punaises et la caméra) */
const S = .95, BASE = .35, EXAG = 1 / 117000 * 19;
const W = (lon, lat) => [((lon + 5.4) * .69 - 5.45) * S, ((51.4 - lat) - 4.75) * S];
const LON0 = -5.5, LON1 = 10.8, LAT0 = 41.1, LAT1 = 51.3;
const [X0, Z1] = W(LON0, LAT0), [X1, Z0] = W(LON1, LAT1);
const WX = X1 - X0, WZ = Z1 - Z0, CX = (X0 + X1) / 2, CZ = (Z0 + Z1) / 2;
const lonOf = x => (x / S + 5.45) / .69 - 5.4, latOf = z => 51.4 - (z / S + 4.75);

/* Table miroir sombre */
{
  const mirror = new Reflector(new THREE.PlaneGeometry(160, 160), { textureWidth: innerWidth * M.dpr * (LITE ? .3 : .5), textureHeight: innerHeight * M.dpr * (LITE ? .3 : .5), color: 0x8a8a8a, clipBias: .003 });
  mirror.rotation.x = -Math.PI / 2; M.scene.add(mirror);
  const tint = new THREE.Mesh(new THREE.PlaneGeometry(160, 160), new THREE.MeshStandardMaterial({ color: 0x0B0C10, roughness: .55, metalness: .1, transparent: true, opacity: .86 }));
  tint.rotation.x = -Math.PI / 2; tint.position.y = .003; tint.receiveShadow = true; M.scene.add(tint);
}

/* Données : altitudes réelles (tuiles Terrarium) et frontières (Natural Earth) */
async function loadElevation() {
  const z = 6, n = 2 ** z;
  const tx = lon => (lon + 180) / 360 * n;
  const ty = lat => { const r = lat * Math.PI / 180; return (1 - Math.log(Math.tan(r) + 1 / Math.cos(r)) / Math.PI) / 2 * n; };
  const xa = Math.floor(tx(LON0)), xb = Math.floor(tx(LON1)), ya = Math.floor(ty(LAT1)), yb = Math.floor(ty(LAT0));
  const cw = (xb - xa + 1) * 256, chh = (yb - ya + 1) * 256;
  const c = document.createElement('canvas'); c.width = cw; c.height = chh;
  const x = c.getContext('2d');
  const jobs = [];
  for (let i = xa; i <= xb; i++) for (let j = ya; j <= yb; j++) jobs.push(new Promise((res, rej) => {
    const im = new Image();
    im.onload = () => { x.drawImage(im, (i - xa) * 256, (j - ya) * 256); res(); };
    im.onerror = rej;
    im.src = `/data/terrain/${z}-${i}-${j}.png`;
  }));
  await Promise.all(jobs);
  const d = x.getImageData(0, 0, cw, chh).data;
  return (lon, lat) => {
    const px = Math.min(cw - 1, Math.max(0, Math.round((tx(lon) - xa) * 256)));
    const py = Math.min(chh - 1, Math.max(0, Math.round((ty(lat) - ya) * 256)));
    const k = (py * cw + px) * 4;
    return d[k] * 256 + d[k + 1] + d[k + 2] / 256 - 32768;
  };
}
/* Contours France + Suisse (Natural Earth 1:50m, pré-extraits dans data/france-suisse.json) */
async function loadCountries() {
  const r = await fetch('/data/france-suisse.json');
  if (!r.ok) throw new Error('contours introuvables');
  const { fr, ch } = await r.json();
  return { fr, ch };
}
/* Texture couleur (plâtre) et masque alpha du découpage */
function paintCutout({ fr, ch }, CW, CHH) {
  const px = lon => (lon - LON0) / (LON1 - LON0) * CW, py = lat => (LAT1 - lat) / (LAT1 - LAT0) * CHH;
  const trace = (ctx, polys) => { ctx.beginPath(); polys.forEach(poly => poly.forEach(ring => ring.forEach(([lo, la], k) => k ? ctx.lineTo(px(lo), py(la)) : ctx.moveTo(px(lo), py(la))))); };
  const color = document.createElement('canvas'); color.width = CW; color.height = CHH;
  const mask = document.createElement('canvas'); mask.width = CW; mask.height = CHH;
  const c = color.getContext('2d'), m = mask.getContext('2d');
  c.fillStyle = '#F3EFE8'; c.fillRect(0, 0, CW, CHH);
  trace(c, ch); c.fillStyle = '#E8DFCF'; c.fill('evenodd');
  trace(c, ch); c.strokeStyle = 'rgba(120,105,85,.5)'; c.lineWidth = 1.5; c.stroke();
  const img = c.getImageData(0, 0, CW, CHH), dd = img.data;
  for (let i = 0; i < dd.length; i += 4) { const n = (Math.random() - .5) * 9; dd[i] += n; dd[i + 1] += n; dd[i + 2] += n; }
  c.putImageData(img, 0, 0);
  m.fillStyle = '#000'; m.fillRect(0, 0, CW, CHH);
  m.fillStyle = '#fff'; trace(m, fr); m.fill('evenodd'); trace(m, ch); m.fill('evenodd');
  return { color, mask, maskData: m.getImageData(0, 0, CW, CHH).data };
}

let heightAt = () => BASE;
let mapReady = false;
const reliefGroup = new THREE.Group(); M.scene.add(reliefGroup);

async function buildRelief() {
  const CW = 2400, CHH = Math.round(CW * WZ / WX);
  const [elev, shapes] = await Promise.all([loadElevation(), loadCountries()]);
  const { color, mask, maskData } = paintCutout(shapes, CW, CHH);
  const inside = (lon, lat) => {
    const x = Math.round((lon - LON0) / (LON1 - LON0) * (CW - 1)), y = Math.round((LAT1 - lat) / (LAT1 - LAT0) * (CHH - 1));
    if (x < 0 || y < 0 || x >= CW || y >= CHH) return false;
    return maskData[(y * CW + x) * 4] > 127;
  };
  const TOPY = BASE + .012;
  heightAt = (lon, lat) => TOPY + (inside(lon, lat) ? Math.max(0, elev(lon, lat)) * EXAG : 0);

  // dessus : relief réel, découpé au contour par le masque
  const SX = 560, SZ = Math.round(SX * WZ / WX);
  const geo = new THREE.PlaneGeometry(WX, WZ, SX, SZ);
  geo.rotateX(-Math.PI / 2); geo.translate(CX, 0, CZ);
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) pos.setY(i, heightAt(lonOf(pos.getX(i)), latOf(pos.getZ(i))));
  geo.computeVertexNormals();
  const tex = new THREE.CanvasTexture(color); tex.colorSpace = THREE.SRGBColorSpace;
  const alpha = new THREE.CanvasTexture(mask);
  [tex, alpha].forEach(t => { t.anisotropy = M.renderer.capabilities.getMaxAnisotropy(); });
  const top = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ map: tex, alphaMap: alpha, alphaTest: .5, roughness: .9, envMapIntensity: .1 }));
  top.customDepthMaterial = new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking, alphaMap: alpha, alphaTest: .5 });
  top.castShadow = top.receiveShadow = true;
  reliefGroup.add(top);

  // tranches en plâtre taillé net
  const side = new THREE.MeshStandardMaterial({ color: 0xE4DED4, roughness: .92, envMapIntensity: .08 });
  const wall = (polys, tint) => {
    const list = polys.map(poly => {
      const s = new THREE.Shape();
      poly[0].forEach(([lo, la], k) => { const [x, z] = W(lo, la); k ? s.lineTo(x, -z) : s.moveTo(x, -z); });
      poly.slice(1).forEach(h => { const hp = new THREE.Path(); h.forEach(([lo, la], k) => { const [x, z] = W(lo, la); k ? hp.lineTo(x, -z) : hp.moveTo(x, -z); }); s.holes.push(hp); });
      return s;
    });
    const g = new THREE.ExtrudeGeometry(list, { depth: TOPY - .002, bevelEnabled: false, curveSegments: 1 });
    g.rotateX(-Math.PI / 2);
    const mesh = new THREE.Mesh(g, tint || side); mesh.castShadow = mesh.receiveShadow = true;
    reliefGroup.add(mesh);
  };
  wall(shapes.fr);
  wall(shapes.ch, new THREE.MeshStandardMaterial({ color: 0xDCD2C1, roughness: .92, envMapIntensity: .08 }));
}

/* Punaises de carte : tige en laiton, tête laquée aux couleurs de la marque */
const ACC = { casino: 0x3F78B8, hotel: 0xF2C230, club: 0xB3243A };
const brass = new THREE.MeshStandardMaterial({ color: 0xCFA64A, metalness: 1, roughness: .22 });
const rodGeo = new THREE.CylinderGeometry(.009, .009, .46, 10).translate(0, .23, 0);
const headGeo = new THREE.SphereGeometry(.058, 32, 20);
const collarGeo = new THREE.CylinderGeometry(.022, .03, .025, 20);
const hitGeo = new THREE.SphereGeometry(.2, 8, 8), hitMat = new THREE.MeshBasicMaterial({ visible: false });
const hits = [];
const labelsEl = document.getElementById('labels');
let seed = 11;
const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
function placePins() {
  PLACES.forEach((p, idx) => {
    const lon = p.lon + (p.type === 'hotel' ? .22 : 0), lat = p.lat + (p.type === 'hotel' ? -.12 : 0);
    const [x, z] = W(lon, lat);
    const y = heightAt(p.lon, p.lat);
    const g = new THREE.Group();
    const lacquer = new THREE.MeshPhysicalMaterial({ color: ACC[p.type], roughness: .14, clearcoat: 1, clearcoatRoughness: .03, emissive: ACC[p.type], emissiveIntensity: .12 });
    const rod = new THREE.Mesh(rodGeo, brass); rod.castShadow = true;
    const head = new THREE.Mesh(headGeo, lacquer); head.position.y = .48; head.castShadow = true;
    const collar = new THREE.Mesh(collarGeo, brass); collar.position.y = .44;
    const hit = new THREE.Mesh(hitGeo, hitMat); hit.position.y = .48; hit.userData.place = p; hits.push(hit);
    g.add(rod, head, collar, hit);
    g.position.set(x, Math.max(y, BASE), z);
    g.rotation.set((rnd() - .5) * .14, 0, (rnd() - .5) * .14);
    M.scene.add(g);
    Object.assign(p, { group: g, head, lacquer, baseY: g.position.y, pos: new THREE.Vector3(x, g.position.y + .5, z), rise: 0, hot: 0, delay: idx * .05 });
    p.lab = document.createElement('div'); p.lab.className = 'lab'; p.lab.textContent = p.name; labelsEl.appendChild(p.lab);
  });
}

/* Lien entre les listes des chapitres et la maquette */
document.querySelectorAll('.places li').forEach(li => {
  const name = li.textContent.trim();
  const pl = PLACES.find(p => name.startsWith(p.name));
  if (!pl) return;
  li.addEventListener('mouseenter', () => { pl.listHover = true; });
  li.addEventListener('mouseleave', () => { pl.listHover = false; });
});
/* Filtres de l'annuaire : les punaises des autres catégories s'effacent dans le relief */
document.addEventListener('dest:filter', e => PLACES.forEach(pl => { pl.off = e.detail !== 'all' && pl.type !== e.detail; }));
document.addEventListener('dest:hover', e => PLACES.forEach(pl => { pl.listHover = pl.name === e.detail; }));

/* Lumière : soleil rasant qui sculpte le relief, projecteur, contre-jour bleu */
const centre = new THREE.Vector3();
FRANCE.forEach(([lo, la]) => { const [x, z] = W(lo, la); centre.add(new THREE.Vector3(x, 0, z)); });
centre.divideScalar(FRANCE.length);
M.scene.add(new THREE.HemisphereLight(0xFFFFFF, 0x202228, .16));
const pool = new THREE.SpotLight(0xFFF4E4, 0, 0, .5, .9, 0);
pool.position.copy(centre).add(new THREE.Vector3(0, 24, 4)); pool.target.position.copy(centre); M.scene.add(pool, pool.target);
const sun = new THREE.DirectionalLight(0xFFE2BC, 1.5);
sun.castShadow = true; sun.shadow.mapSize.setScalar(LITE ? 2048 : 4096);
Object.assign(sun.shadow.camera, { left: -9, right: 9, top: 9, bottom: -9, near: 1, far: 50 });
sun.shadow.bias = -.0004; sun.shadow.normalBias = .02;
M.scene.add(sun, sun.target);
const rimMap = new THREE.SpotLight(0x5A8CC8, 1.6, 0, .6, .9, 0); rimMap.position.copy(centre).add(new THREE.Vector3(-14, 6, -12)); rimMap.target.position.copy(centre); M.scene.add(rimMap, rimMap.target);
const pinLight = new THREE.PointLight(0xffffff, 0, 2.2, 2); M.scene.add(pinLight);
const warmC = new THREE.Color(0xFFC890), coolC = new THREE.Color(0xFFF1E0);

/* Caméra */
let mapPath = null;
function buildPath() {
  const regionCenter = r => { const v = new THREE.Vector3(); const L = PLACES.filter(p => p.r === r); L.forEach(p => v.add(p.pos)); return v.divideScalar(L.length); };
  const RC = ['manche', 'centre', 'sud', 'est'].map(regionCenter);
  const shot = (c, off) => ({ pos: [c.x + off[0], c.y + off[1], c.z + off[2]], look: [c.x, c.y - .4, c.z] });
  mapPath = keyframes([
    { t: 0, pos: [centre.x + .6, 14.5, centre.z + 10.5], look: [centre.x + .6, 0, centre.z + .9], tilt: 1.5 },
    { t: .2, ...shot(RC[0], [-1.4, 6.6, 5.6]), tilt: 2 },
    { t: .4, ...shot(RC[1], [1.8, 6.6, 5.6]), tilt: 2 },
    { t: .6, ...shot(RC[2], [-.4, 8.2, 7.0]), tilt: 2 },
    { t: .8, ...shot(RC[3], [-2.4, 6.4, 5.2]), tilt: 2 },
    { t: 1, pos: [centre.x - 2.5, 16, centre.z + 12], look: [centre.x, 0, centre.z + .6], tilt: 1.5 }
  ]);
}
const mapLook = new THREE.Vector3(), focusPt = new THREE.Vector3(), v3 = new THREE.Vector3();
const mapP = smoother(5);
const ray = new THREE.Raycaster(), ndc = new THREE.Vector2(-9, -9), tip = document.getElementById('tip');
let hovered = null, px = 0, py = 0;
mapEl.addEventListener('pointermove', e => { px = e.clientX; py = e.clientY; ndc.set(px / innerWidth * 2 - 1, -(py / innerHeight) * 2 + 1); });
mapEl.addEventListener('pointerleave', () => ndc.set(-9, -9));
M.renderer.domElement.addEventListener('click', () => { if (hovered && hovered.url) open(hovered.url, '_blank', 'noopener'); });

/* Entrée en scène : les punaises se plantent une à une */
const mapIntro = { v: 0, started: false };
function startMapIntro() {
  if (mapIntro.started || !mapReady) return; mapIntro.started = true;
  gsap.to(pool, { intensity: 1.1, duration: 2.2, ease: 'power2.inOut' });
  gsap.to(mapIntro, { v: 1, duration: 3.4, ease: 'none' });
}
new IntersectionObserver(es => { if (es[0].isIntersecting) startMapIntro(); }, { threshold: .35 }).observe(mapEl.querySelector('.sticky'));

function initMap() {
buildRelief().catch(err => {
  // repli : plaque simple si les données géographiques ne se chargent pas
  console.warn('Relief indisponible', err);
  const s = new THREE.Shape(); FRANCE.forEach(([lo, la], k) => { const [x, z] = W(lo, la); k ? s.lineTo(x, -z) : s.moveTo(x, -z); });
  const g = new THREE.ExtrudeGeometry(s, { depth: BASE, bevelEnabled: true, bevelThickness: .04, bevelSize: .04, bevelSegments: 3 }); g.rotateX(-Math.PI / 2);
  const m = new THREE.Mesh(g, new THREE.MeshStandardMaterial({ color: 0xF3EFE8, roughness: .9 })); m.castShadow = m.receiveShadow = true; reliefGroup.add(m);
  heightAt = () => BASE + .04;
}).then(() => {
  placePins(); buildPath();
  M.renderer.compile(M.scene, M.camera);
  mapReady = true;
  if (isVisible(mapEl)) startMapIntro();
});
}
/* la carte se construit à l'approche de la section, pas au chargement de la page */
const mapWatch = new IntersectionObserver(es => { if (es[0].isIntersecting) { mapWatch.disconnect(); initMap(); } }, { rootMargin: '150% 0px' });
mapWatch.observe(mapEl);

const labRects = [];
function renderMap(t) {
  if (!mapReady) return;
  const p = mapP(progressOf(mapEl));
  chapters(mapEl, p);
  const az = THREE.MathUtils.lerp(2.5, 3.7, p), el = THREE.MathUtils.lerp(.42, .26, p);
  sun.position.set(Math.cos(az) * Math.cos(el) * 20, Math.sin(el) * 20, Math.sin(az) * Math.cos(el) * 20).add(centre);
  sun.target.position.copy(centre);
  sun.color.copy(coolC).lerp(warmC, p);
  const k = mapPath(p), m = mobile() ? 2.3 : Math.max(1, 1.62 / M.camera.aspect), off = mobile() ? 0 : -1.6;
  mapLook.set(k.look[0] + off, k.look[1], k.look[2] + (mobile() ? 2.6 : 0));
  M.camera.position.set(k.pos[0] + off + mouse.sx * .6 + Math.sin(t * .1) * .15, (k.pos[1] - k.look[1]) * m + k.look[1], (k.pos[2] - k.look[2]) * m + k.look[2]);
  M.camera.lookAt(mapLook);
  focusPt.set(k.look[0], k.look[1], k.look[2]);
  M.tiltH.uniforms.uAmount.value = M.tiltV.uniforms.uAmount.value = k.tilt;

  ray.setFromCamera(ndc, M.camera);
  const h = ray.intersectObjects(hits)[0];
  hovered = h ? h.object.userData.place : null;
  M.renderer.domElement.style.cursor = hovered && hovered.url ? 'pointer' : '';

  let lit = null;
  PLACES.forEach(pl => {
    const r = clamp01(mapIntro.v * 1.7 - pl.delay * .9);
    pl.rise += ((1 - Math.pow(1 - r, 4)) - pl.rise) * .25;
    const target = pl === hovered || pl.listHover ? 1 : 0;
    pl.hot += (target - pl.hot) * .12;
    pl.offV = (pl.offV || 0) + ((pl.off ? 1 : 0) - (pl.offV || 0)) * .1;
    pl.group.position.y = pl.baseY + (1 - pl.rise) * 1.6 + pl.hot * .08 - pl.offV * .42;
    pl.group.visible = pl.rise > .01 && pl.offV < .98;
    pl.head.scale.setScalar((1 + pl.hot * .35) * (1 - pl.offV * .7));
    pl.lacquer.emissiveIntensity = .12 + pl.hot * .9;
    if (pl.hot > .05 && (!lit || pl.hot > lit.hot)) lit = pl;
  });
  if (lit) { pinLight.position.copy(lit.pos).add(new THREE.Vector3(0, .1, 0)); pinLight.color.setHex(ACC[lit.type]); pinLight.intensity = lit.hot * 3; }
  else pinLight.intensity *= .9;

  labRects.length = 0;
  PLACES.map(pl => ({ pl, d: pl.pos.distanceTo(focusPt) })).sort((a, b) => (b.pl.hot - a.pl.hot) || (a.d - b.d)).forEach(({ pl, d }) => {
    v3.copy(pl.pos).project(M.camera);
    const sx = (v3.x * .5 + .5) * innerWidth + 10, sy = (-v3.y * .5 + .5) * innerHeight - 6;
    let o = Math.max(clamp01((3.8 - d) / 1.2) * clamp01((13 - M.camera.position.y) / 2), pl.hot) * pl.rise * (1 - (pl.offV || 0));
    if (o > .05) {
      const w = pl.name.length * 6.4 + 26;
      if (labRects.some(r => sx < r.x + r.w && sx + w > r.x && Math.abs(sy - r.y) < 16)) o = 0;
      else labRects.push({ x: sx, y: sy, w });
    }
    pl.lab.style.opacity = o;
    pl.lab.style.transform = `translate(${sx}px,${sy}px)`;
  });

  if (hovered) {
    tip.innerHTML = `<img src="${IMG + PHOTO[hovered.name]}" alt=""><div><small>${hovered.city}</small>${hovered.name}${hovered.url ? ' <em>↗</em>' : ''}</div>`;
    tip.style.left = px + 'px'; tip.style.top = py + 'px'; tip.style.opacity = 1;
  } else tip.style.opacity = 0;
  M.finish.uniforms.uTime.value = t;
  M.composer.render();
}


return { el: mapEl, render: renderMap };
}

/* ================= DÉMARRAGE : chaque page n'initialise que les scènes qu'elle contient ================= */
export function start(ctx) {
  const { lenis, isVisible } = ctx;
  /* version allégée sur mobile : pas de flou de profondeur, ombres et reflets moins coûteux */
  const LITE = mobile() || (navigator.hardwareConcurrency || 8) <= 4;
  const scenes = [];
  const clock = new THREE.Clock();
  const loop = () => {
    const t = clock.getElapsedTime();
    lenis.raf(performance.now());
    stepMouse();
    scenes.forEach(s => { if (isVisible(s.el)) s.render(t); });
    requestAnimationFrame(loop);
  };
  if (document.getElementById('implantations')) scenes.push(initMapScene(ctx, LITE));
  if (document.getElementById('hero')) {
    const h = initHero(ctx, LITE, () => { scenes.push(h); });
  } else {
    document.getElementById('loader')?.classList.add('done');
    document.body.classList.remove('loading');
    lenis.start();
    if (location.hash && document.querySelector(location.hash)) setTimeout(() => lenis.scrollTo(location.hash, { offset: -90, immediate: true, force: true }), 400);
  }
  loop();
}
