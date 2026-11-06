/* Groupe Tranchant — Activités principales : ouverture en 3D, même principe que les activités spécialisées
   (spec-hero.js) : le groupe au centre, ses cinq activités en orbite, chacune reconnaissable à son objet :
   roulette qui tourne (casinos), tour d'hôtel aux fenêtres qui s'allument (hôtels), bouteille qui sert
   un verre de vin à côté d'une cloche (restaurants et bars), scène sous les projecteurs (salles de concerts et
   spectacles), table ronde dressée sous un lustre de cristal (salles de réception et séminaires). Contrat : mountApHub(hero, { reduceMotion, fly }). */
import * as THREE from 'three';
import { mountHub, std, glow, canvasTex, rbox, gold, chrome, lacquer, ACC, GOLD, RED } from './spec-hero.js';

function roulette() {
  const g = new THREE.Group();
  const tex = canvasTex(512, 512, (x, w, h) => {
    const n = 37, cx = w / 2, cy = h / 2;
    for (let i = 0; i < n; i++) {
      const a0 = i / n * Math.PI * 2, a1 = (i + 1) / n * Math.PI * 2;
      x.beginPath(); x.moveTo(cx, cy); x.arc(cx, cy, w / 2, a0, a1); x.closePath();
      x.fillStyle = i === 0 ? '#1f8a4c' : i % 2 ? '#c4151c' : '#0d0f14'; x.fill();
    }
    x.beginPath(); x.arc(cx, cy, w * .3, 0, Math.PI * 2); x.fillStyle = '#6b4a1f'; x.fill();
    x.strokeStyle = '#d9b25a'; x.lineWidth = 4;
    for (let i = 0; i < n; i++) { const a = i / n * Math.PI * 2; x.beginPath(); x.moveTo(cx + Math.cos(a) * w * .3, cy + Math.sin(a) * w * .3); x.lineTo(cx + Math.cos(a) * w * .5, cy + Math.sin(a) * w * .5); x.stroke(); }
  });
  const bowl = new THREE.Mesh(new THREE.CylinderGeometry(.82, .7, .22, 64), std(0x3a2412, { metalness: .2, roughness: .45 }));
  const rim = new THREE.Mesh(new THREE.TorusGeometry(.8, .05, 12, 80), gold()); rim.rotation.x = Math.PI / 2; rim.position.y = .11;
  const wheel = new THREE.Group();
  const disc = new THREE.Mesh(new THREE.CircleGeometry(.7, 64), new THREE.MeshStandardMaterial({ map: tex, roughness: .35, metalness: .2 })); disc.rotation.x = -Math.PI / 2; disc.position.y = .115;
  const hub = new THREE.Mesh(new THREE.ConeGeometry(.12, .22, 24), gold()); hub.position.y = .22;
  const cross = new THREE.Group();
  for (let k = 0; k < 4; k++) { const arm = new THREE.Mesh(new THREE.CylinderGeometry(.015, .015, .34, 8), gold()); arm.rotation.z = Math.PI / 2; arm.rotation.y = k * Math.PI / 4; arm.position.y = .27; cross.add(arm); }
  wheel.add(disc, hub, cross);
  const ball = new THREE.Mesh(new THREE.SphereGeometry(.045, 16, 12), std(0xffffff, { metalness: .1, roughness: .15 }));
  const chips = new THREE.Group();
  [[RED, -.95, .35], [0x2b5cff, -.75, .7], [GOLD, .9, .55]].forEach(([c, x, z], k) => {
    for (let i = 0; i < 3 + k; i++) { const ch = new THREE.Mesh(new THREE.CylinderGeometry(.11, .11, .035, 24), std(c, { metalness: .2, roughness: .5 })); ch.position.set(x, -.08 + i * .04, z); chips.add(ch); }
  });
  g.add(bowl, rim, wheel, ball, chips);
  g.rotation.x = .5; g.position.y = -.15;
  g.userData.tick = t => { wheel.rotation.y = t * .9; const a = -t * 2.3; ball.position.set(Math.cos(a) * .6, .17, Math.sin(a) * .6); };
  return g;
}

function hotel() {
  const g = new THREE.Group();
  const cols = 6, rows = 10, lit = [];
  const cv = document.createElement('canvas'); cv.width = 192; cv.height = 320;
  const x = cv.getContext('2d');
  const tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace;
  for (let i = 0; i < cols * rows; i++) lit.push(Math.random() < .45);
  const paint = () => {
    x.fillStyle = '#0d1a2c'; x.fillRect(0, 0, 192, 320);
    for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
      x.fillStyle = lit[r * cols + c] ? '#ffcf6b' : '#1d3550';
      x.fillRect(10 + c * 30, 12 + r * 30, 20, 20);
    }
    tex.needsUpdate = true;
  };
  paint();
  const facade = new THREE.MeshStandardMaterial({ map: tex, emissive: 0xffffff, emissiveMap: tex, emissiveIntensity: .9, roughness: .5, metalness: .3 });
  const side = std(0x0f1d31, { metalness: .7 });
  const tower = new THREE.Mesh(new THREE.BoxGeometry(.8, 1.6, .6), [side, side, side, side, facade, side]); tower.position.y = .05;
  const crown = new THREE.Mesh(rbox(.86, .06, .66), gold()); crown.position.y = .88;
  const sign = new THREE.Mesh(rbox(.5, .08, .02), glow(GOLD, 3)); sign.position.set(0, .97, .2);
  const canopy = new THREE.Mesh(rbox(.5, .04, .3), gold()); canopy.position.set(0, -.5, .44);
  const wing = new THREE.Mesh(new THREE.BoxGeometry(.5, .8, .5), [side, side, side, side, facade, side]); wing.position.set(-.62, -.35, -.05);
  g.add(tower, crown, sign, canopy, wing);
  let next = 0;
  g.userData.tick = t => { if (t > next) { next = t + .35; lit[(Math.random() * lit.length) | 0] ^= true; paint(); } };
  return g;
}

function dining() {
  const g = new THREE.Group();
  const V = (a, b) => new THREE.Vector2(a, b);
  const glassMat = new THREE.MeshPhysicalMaterial({ color: 0xe4eeff, roughness: .04, metalness: 0, transparent: true, opacity: .2, clearcoat: 1, envMapIntensity: .7, side: THREE.DoubleSide, depthWrite: false });
  const wineMat = new THREE.MeshPhysicalMaterial({ color: 0x7a0c1c, emissive: 0x5a000e, emissiveIntensity: .8, roughness: .08, metalness: 0, clearcoat: 1, transparent: true, opacity: .92 });
  // verre à vin : pied, jambe, puis un calice sphérique (centre c, rayon R) que le vin remplit
  const c = -.06, R = .2, bowl = [];
  for (let k = 0; k <= 16; k++) { const th = k / 16 * 2.3; bowl.push(V(Math.max(.012, R * Math.sin(th)), c - R * Math.cos(th))); }
  const wg = new THREE.Mesh(new THREE.LatheGeometry([V(.001, -.6), V(.15, -.6), V(.16, -.59), V(.02, -.57), V(.012, -.3), V(.02, -.27), ...bowl], 48), glassMat);
  const wine = new THREE.Mesh(new THREE.BufferGeometry(), wineMat);
  const surf = new THREE.Mesh(new THREE.CircleGeometry(1, 40), wineMat); surf.rotation.x = -Math.PI / 2;
  const wineGlass = new THREE.Group(); wineGlass.add(wine, surf, wg); wineGlass.position.set(.16, 0, .12);
  let lvl = -1;
  const fill = f => { // f : 0 → 1, hauteur du vin dans le calice
    const th = .15 + f * 1.45;
    if (Math.abs(th - lvl) < .01) return; lvl = th;
    wine.geometry.dispose(); wine.geometry = new THREE.SphereGeometry(R * .96, 40, 10, 0, Math.PI * 2, Math.PI - th, th); wine.position.y = c;
    surf.position.y = c - R * .96 * Math.cos(th); surf.scale.setScalar(R * .96 * Math.sin(th));
    const on = f > .01; wine.visible = surf.visible = on;
  };
  // bouteille : verre vert sombre laqué, capsule dorée, étiquette ivoire filetée d'or
  const bp = [V(.001, -.6), V(.12, -.6), V(.13, -.58), V(.13, -.08), V(.11, .02), V(.055, .1), V(.045, .16), V(.045, .32), V(.052, .33), V(.052, .35), V(.001, .35)];
  const bottleBody = new THREE.Mesh(new THREE.LatheGeometry(bp, 48), new THREE.MeshPhysicalMaterial({ color: 0x0d2a1c, roughness: .12, metalness: .2, clearcoat: 1, clearcoatRoughness: .04, envMapIntensity: 1.4 }));
  const foil = new THREE.Mesh(new THREE.CylinderGeometry(.05, .05, .13, 32), gold(.3)); foil.position.y = .29;
  const labelTex = canvasTex(256, 128, (x, w, h) => {
    x.fillStyle = '#efe6d2'; x.fillRect(0, 0, w, h);
    x.strokeStyle = '#b8892f'; x.lineWidth = 4; x.strokeRect(10, 10, w - 20, h - 20); x.lineWidth = 1.5; x.strokeRect(18, 18, w - 36, h - 36);
    x.fillStyle = '#7a0c1c'; x.beginPath(); x.arc(w / 2, h / 2 - 8, 16, 0, Math.PI * 2); x.fill();
    x.fillStyle = '#b8892f'; x.fillRect(w / 2 - 50, h / 2 + 18, 100, 3); x.fillRect(w / 2 - 34, h / 2 + 28, 68, 2);
  });
  const label = new THREE.Mesh(new THREE.CylinderGeometry(.132, .132, .22, 32, 1, true, -.95, 1.9), new THREE.MeshStandardMaterial({ map: labelTex, roughness: .7, metalness: 0, envMapIntensity: .4 })); label.position.y = -.3;
  const bottle = new THREE.Group(); bottle.add(bottleBody, foil, label);
  const stream = new THREE.Mesh(new THREE.CylinderGeometry(.012, .016, 1, 10), wineMat); stream.visible = false;
  // cloche sur plat, en retrait
  const dish = new THREE.Group();
  const plate = new THREE.Mesh(new THREE.CylinderGeometry(.34, .28, .03, 48), std(0xb9b2a5, { metalness: .1, roughness: .45, envMapIntensity: .5 }));
  const rimP = new THREE.Mesh(new THREE.TorusGeometry(.33, .008, 8, 64), gold()); rimP.rotation.x = Math.PI / 2; rimP.position.y = .016;
  const dome = new THREE.Mesh(new THREE.SphereGeometry(.28, 48, 24, 0, Math.PI * 2, 0, Math.PI / 2), chrome(.06));
  const knob = new THREE.Mesh(new THREE.SphereGeometry(.035, 16, 12), gold()); knob.position.y = .3;
  const lid = new THREE.Group(); lid.add(dome, knob);
  dish.add(plate, rimP, lid); dish.position.set(-.08, -.58, -.38);
  const steam = [0, 1, 2].map(() => { const s = new THREE.Mesh(new THREE.SphereGeometry(.04, 12, 8), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0, depthWrite: false })); dish.add(s); return s; });
  g.add(dish, bottle, wineGlass, stream);
  g.scale.setScalar(1.22);
  const ez = x => x * x * (3 - 2 * x), cl = x => Math.min(1, Math.max(0, x));
  const tip = new THREE.Vector3();
  g.userData.tick = t => {
    // la bouteille se lève, verse, se repose ; le verre se remplit puis tourne doucement
    const p = (t % 8) / 8;
    const tilt = ez(cl(p / .12)) * (1 - ez(cl((p - .46) / .12)));
    bottle.position.set(-.42 + tilt * .22, tilt * .34, 0); bottle.rotation.z = -tilt * 2.05;
    const pour = cl((p - .13) / .32);
    fill(Math.min(pour, 1 - ez(cl((p - .9) / .1))) * .62);
    tip.set(0, .35, 0).applyAxisAngle(new THREE.Vector3(0, 0, 1), bottle.rotation.z).add(bottle.position);
    const on = tilt > .97 && pour < 1, top = tip.y, bot = c - R * .96 * Math.cos(Math.max(lvl, .4)) + .02;
    stream.visible = on; if (on) { stream.position.set(tip.x, (top + bot) / 2, wineGlass.position.z); stream.scale.y = Math.max(.01, top - bot); }
    const sw = cl((p - .58) / .3); wineGlass.rotation.z = Math.sin(sw * Math.PI * 4) * .06 * Math.sin(sw * Math.PI);
    const up = Math.max(0, Math.sin(t * .55 + 1)) ** 4; lid.position.y = up * .22; lid.rotation.z = up * .3;
    steam.forEach((s, k) => { const q = (t * .45 + k / 3) % 1; s.position.set(Math.sin(t * 2 + k) * .05, .05 + q * .55, 0); s.material.opacity = .3 * up * (1 - q); s.scale.setScalar(.6 + q * 1.6); });
  };
  return g;
}

function stage() {
  const g = new THREE.Group();
  const floor = new THREE.Mesh(rbox(1.5, .14, .9), std(0x1a1410, { metalness: .2, roughness: .6 })); floor.position.y = -.6;
  const back = new THREE.Mesh(rbox(1.5, 1.2, .06), std(0x0d0a14, { metalness: .1, roughness: .9 })); back.position.set(0, .05, -.42);
  const curtain = new THREE.MeshStandardMaterial({ color: 0x8a0f1a, roughness: .7, metalness: 0 });
  const folds = new THREE.CylinderGeometry(.06, .06, 1.25, 8);
  for (let k = 0; k < 5; k++) { [-1, 1].forEach(sd => { const f = new THREE.Mesh(folds, curtain); f.position.set(sd * (.72 - k * .07), .05, -.3 + k * .02); g.add(f); }); }
  const valance = new THREE.Mesh(rbox(1.6, .16, .12), curtain); valance.position.set(0, .66, -.26);
  const mic = new THREE.Group();
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(.012, .012, .6), chrome()); pole.position.y = -.23;
  const head = new THREE.Mesh(new THREE.SphereGeometry(.045, 16, 12), std(0x30343c, { metalness: .8, roughness: .4 })); head.position.y = .1;
  mic.add(pole, head); mic.position.set(0, 0, .05);
  const beams = [-1, 1].map(sd => {
    const cone = new THREE.Mesh(new THREE.ConeGeometry(.32, 1.5, 32, 1, true), new THREE.MeshBasicMaterial({ color: sd < 0 ? 0xfff0c2 : 0x9fc0ff, transparent: true, opacity: .16, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }));
    const pv = new THREE.Group(); pv.position.set(sd * .62, .82, .2); cone.position.y = -.75; pv.add(cone);
    const lamp = new THREE.Mesh(new THREE.CylinderGeometry(.06, .08, .14, 16), std(0x22252c, { metalness: .9 })); pv.add(lamp);
    g.add(pv); return { pv, sd };
  });
  const spot = new THREE.Mesh(new THREE.CircleGeometry(.22, 32), new THREE.MeshBasicMaterial({ color: 0xfff3d1, transparent: true, opacity: .35, blending: THREE.AdditiveBlending, depthWrite: false })); spot.rotation.x = -Math.PI / 2; spot.position.set(0, -.52, .05);
  g.add(floor, back, valance, mic, spot);
  g.userData.tick = t => { beams.forEach(({ pv, sd }) => { pv.rotation.z = sd * (.45 + Math.sin(t * 1.1 + sd) * .25); pv.rotation.x = Math.sin(t * .8) * .15; }); spot.material.opacity = .25 + .15 * Math.sin(t * 3); };
  return g;
}

function banquet() {
  const g = new THREE.Group();
  const V = (a, b) => new THREE.Vector2(a, b);
  // table ronde nappée jusqu'au sol, couverts dorés, bougies ; lustre de cristal au-dessus
  const cloth = new THREE.Mesh(new THREE.LatheGeometry([V(.001, -.1), V(.56, -.1), V(.6, -.12), V(.62, -.17), V(.66, -.45), V(.71, -.6), V(.001, -.6)], 64),
    new THREE.MeshStandardMaterial({ color: 0x9f9788, roughness: .95, metalness: 0, envMapIntensity: .35 }));
  const runner = new THREE.Mesh(new THREE.TorusGeometry(.61, .012, 8, 96), gold(.3)); runner.rotation.x = Math.PI / 2; runner.position.y = -.135;
  g.add(cloth, runner);
  const flames = [];
  const flame = (x, y, z, s = 1) => { const f = new THREE.Mesh(new THREE.SphereGeometry(.022 * s, 12, 8), glow(0xffc46b, 3.2)); f.scale.y = 1.8; f.position.set(x, y, z); g.add(f); flames.push(f); return f; };
  for (let k = 0; k < 6; k++) {
    const a = k / 6 * Math.PI * 2 + Math.PI / 6, cx = Math.cos(a), sz = Math.sin(a);
    const charger = new THREE.Mesh(new THREE.CylinderGeometry(.11, .11, .012, 40), gold(.28)); charger.position.set(cx * .42, -.094, sz * .42);
    const plate = new THREE.Mesh(new THREE.CylinderGeometry(.08, .065, .014, 40), std(0xc9c2b4, { metalness: .05, roughness: .4, envMapIntensity: .5 })); plate.position.set(cx * .42, -.082, sz * .42);
    const flute = new THREE.Mesh(new THREE.LatheGeometry([V(.001, 0), V(.03, 0), V(.004, .01), V(.004, .07), V(.018, .09), V(.024, .2), V(.001, .2)], 20), new THREE.MeshPhysicalMaterial({ color: 0xffe2a0, emissive: 0x6a4a10, roughness: .05, clearcoat: 1, transparent: true, opacity: .55, envMapIntensity: 1.5 }));
    const fa = a + .32; flute.position.set(Math.cos(fa) * .5, -.1, Math.sin(fa) * .5);
    g.add(charger, plate, flute);
    // chaise Chiavari dorée : assise, quatre pieds fins, dossier à barreaux
    const chair = new THREE.Group(), rod = (h, x, y, z, rz = 0) => { const m = new THREE.Mesh(new THREE.CylinderGeometry(.008, .008, h, 8), gold(.22)); m.position.set(x, y, z); m.rotation.z = rz; chair.add(m); };
    const seat = new THREE.Mesh(rbox(.2, .03, .19), std(0x9c8f76, { metalness: 0, roughness: .85, envMapIntensity: .3 })); seat.position.y = -.33; chair.add(seat);
    [[-.09, -.085], [.09, -.085], [-.09, .085], [.09, .085]].forEach(([x, z]) => rod(.27, x, -.47, z));
    [-.09, .09].forEach(x => rod(.36, x, -.15, -.09));
    [-.02, .05, .12].forEach(y => rod(.18, 0, y - .08, -.09, Math.PI / 2));
    for (let s = -1; s <= 1; s++) rod(.14, s * .045, -.08, -.09);
    chair.position.set(cx * .86, 0, sz * .86); chair.lookAt(0, 0, 0); g.add(chair);
  }
  // centre : trois photophores et un bouquet bas
  [[0, 0], [.13, .07], [-.12, .08]].forEach(([x, z], k) => {
    const h = .1 + k * .05;
    const cup = new THREE.Mesh(new THREE.CylinderGeometry(.03, .03, h, 20, 1, true), new THREE.MeshPhysicalMaterial({ color: 0xffffff, roughness: .1, transparent: true, opacity: .3, side: THREE.DoubleSide, depthWrite: false })); cup.position.set(x, -.1 + h / 2, z - .1);
    const wax = new THREE.Mesh(new THREE.CylinderGeometry(.02, .02, h * .8, 16), std(0xf2ead8, { metalness: 0, roughness: .9, emissive: 0x3a2a10 })); wax.position.set(x, -.1 + h * .4, z - .1);
    g.add(cup, wax); flame(x, -.1 + h * .8 + .03, z - .1);
  });
  const bouquet = new THREE.Group();
  for (let k = 0; k < 7; k++) { const r = new THREE.Mesh(new THREE.SphereGeometry(.045, 14, 10), std(k % 3 ? 0xb3122a : 0xe8dcc6, { metalness: 0, roughness: .6 })); const a = k / 7 * Math.PI * 2; r.position.set(Math.cos(a) * .06 * (k ? 1 : 0), -.04 + (k ? 0 : .03), Math.sin(a) * .06 * (k ? 1 : 0) + .1); bouquet.add(r); }
  g.add(bouquet);
  // lustre : tige, deux couronnes dorées, bougies et pampilles de cristal
  const chand = new THREE.Group();
  const stemC = new THREE.Mesh(new THREE.CylinderGeometry(.01, .01, .3, 8), gold()); stemC.position.y = .17; chand.add(stemC);
  const ball = new THREE.Mesh(new THREE.SphereGeometry(.05, 20, 14), gold(.18)); chand.add(ball);
  [[.34, 0], [.2, .1]].forEach(([r, y]) => { const ring = new THREE.Mesh(new THREE.TorusGeometry(r, .01, 8, 80), gold(.2)); ring.rotation.x = Math.PI / 2; ring.position.y = y; chand.add(ring); });
  const crystal = new THREE.MeshPhysicalMaterial({ color: 0xeaf2ff, metalness: .2, roughness: .02, clearcoat: 1, envMapIntensity: 2.4, emissive: 0x2a3550 });
  const drops = [];
  for (let k = 0; k < 12; k++) {
    const a = k / 12 * Math.PI * 2;
    const d = new THREE.Mesh(new THREE.OctahedronGeometry(.028), crystal); d.scale.y = 1.7; d.position.set(Math.cos(a) * .34, -.07, Math.sin(a) * .34); chand.add(d); drops.push(d);
    if (k % 2 === 0) { const arm = new THREE.Mesh(new THREE.CylinderGeometry(.006, .006, .34, 6), gold()); arm.rotation.z = Math.PI / 2; arm.rotation.y = -a; arm.position.set(Math.cos(a) * .17, 0, Math.sin(a) * .17); chand.add(arm);
      const cd = new THREE.Mesh(new THREE.CylinderGeometry(.012, .012, .06, 10), std(0xf2ead8, { metalness: 0, roughness: .9 })); cd.position.set(Math.cos(a) * .34, .035, Math.sin(a) * .34); chand.add(cd);
      const f = new THREE.Mesh(new THREE.SphereGeometry(.016, 10, 8), glow(0xffd28a, 3.6)); f.scale.y = 1.7; f.position.set(Math.cos(a) * .34, .085, Math.sin(a) * .34); chand.add(f); flames.push(f); }
  }
  for (let k = 0; k < 6; k++) { const a = k / 6 * Math.PI * 2 + .3, d = new THREE.Mesh(new THREE.OctahedronGeometry(.02), crystal); d.scale.y = 1.8; d.position.set(Math.cos(a) * .2, .04, Math.sin(a) * .2); chand.add(d); drops.push(d); }
  const pend = new THREE.Mesh(new THREE.OctahedronGeometry(.04), crystal); pend.scale.y = 2; pend.position.y = -.12; chand.add(pend); drops.push(pend);
  chand.position.y = .5; g.add(chand);
  g.rotation.x = .32; g.position.y = -.08;
  g.userData.tick = t => {
    chand.rotation.y = t * .25; chand.rotation.z = Math.sin(t * .9) * .03;
    drops.forEach((d, k) => { d.rotation.y = t * 1.5 + k; });
    flames.forEach((f, k) => { const n = Math.sin(t * 11 + k * 3.1) * .5 + Math.sin(t * 7.3 + k) * .5; f.material.emissiveIntensity = 3 + n * .7; f.scale.set(1 + n * .08, 1.75 + n * .25, 1 + n * .08); });
  };
  return g;
}

export function mountApHub(hero, { reduceMotion, fly }) {
  return mountHub(hero, { reduceMotion, fly, makers: [roulette, hotel, dining, stage, banquet] });
}
