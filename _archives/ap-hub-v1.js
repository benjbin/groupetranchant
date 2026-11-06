/* Groupe Tranchant — Activités principales : ouverture en 3D, même principe que les activités spécialisées
   (spec-hero.js) : le groupe au centre, ses cinq activités en orbite, chacune reconnaissable à son objet :
   roulette qui tourne (casinos), tour d'hôtel aux fenêtres qui s'allument (hôtels), cocktail et cloche
   (restaurants et bars), scène sous les projecteurs (salles de concerts et spectacles), table de banquet
   dressée (salles de réception et séminaires). Contrat : mountApHub(hero, { reduceMotion, fly }). */
import * as THREE from 'three';
import { mountHub, std, glow, canvasTex, ACC, GOLD, RED } from './spec-hero.js';

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
  const rim = new THREE.Mesh(new THREE.TorusGeometry(.8, .05, 12, 80), std(0xd9b25a, { metalness: 1, roughness: .25 })); rim.rotation.x = Math.PI / 2; rim.position.y = .11;
  const wheel = new THREE.Group();
  const disc = new THREE.Mesh(new THREE.CircleGeometry(.7, 64), new THREE.MeshStandardMaterial({ map: tex, roughness: .35, metalness: .2 })); disc.rotation.x = -Math.PI / 2; disc.position.y = .115;
  const hub = new THREE.Mesh(new THREE.ConeGeometry(.12, .22, 24), std(0xd9b25a, { metalness: 1, roughness: .2 })); hub.position.y = .22;
  const cross = new THREE.Group();
  for (let k = 0; k < 4; k++) { const arm = new THREE.Mesh(new THREE.CylinderGeometry(.015, .015, .34, 8), std(0xd9b25a, { metalness: 1 })); arm.rotation.z = Math.PI / 2; arm.rotation.y = k * Math.PI / 4; arm.position.y = .27; cross.add(arm); }
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
  const crown = new THREE.Mesh(new THREE.BoxGeometry(.86, .06, .66), std(0xd9b25a, { metalness: 1, roughness: .25 })); crown.position.y = .88;
  const sign = new THREE.Mesh(new THREE.BoxGeometry(.5, .08, .02), glow(GOLD, 3)); sign.position.set(0, .97, .2);
  const canopy = new THREE.Mesh(new THREE.BoxGeometry(.5, .04, .3), std(0xd9b25a, { metalness: 1 })); canopy.position.set(0, -.5, .44);
  const wing = new THREE.Mesh(new THREE.BoxGeometry(.5, .8, .5), [side, side, side, side, facade, side]); wing.position.set(-.62, -.35, -.05);
  g.add(tower, crown, sign, canopy, wing);
  let next = 0;
  g.userData.tick = t => { if (t > next) { next = t + .35; lit[(Math.random() * lit.length) | 0] ^= true; paint(); } };
  return g;
}

function dining() {
  const g = new THREE.Group();
  // verre à cocktail (profil tourné), olive, et plat sous cloche
  const prof = [[.02, -.55], [.22, -.55], [.24, -.53], [.03, -.5], [.025, -.05], [.38, .32], [.4, .34]].map(([a, b]) => new THREE.Vector2(a, b));
  const glass = new THREE.Mesh(new THREE.LatheGeometry(prof, 48), new THREE.MeshPhysicalMaterial({ color: 0xdfeaff, roughness: .05, metalness: 0, transparent: true, opacity: .35, clearcoat: 1, side: THREE.DoubleSide, depthWrite: false }));
  const drink = new THREE.Mesh(new THREE.ConeGeometry(.33, .3, 48, 1, false), new THREE.MeshStandardMaterial({ color: 0xffb340, emissive: 0xff8a1f, emissiveIntensity: .6, transparent: true, opacity: .85, roughness: .2 }));
  drink.rotation.x = Math.PI; drink.position.y = .14;
  const olive = new THREE.Mesh(new THREE.SphereGeometry(.06, 16, 12), std(0x6d8a2a, { metalness: 0, roughness: .5 })); olive.position.set(.05, .12, 0);
  const pick = new THREE.Mesh(new THREE.CylinderGeometry(.006, .006, .5), std(0xd9b25a, { metalness: 1 })); pick.position.set(.1, .3, 0); pick.rotation.z = -.35;
  const cocktail = new THREE.Group(); cocktail.add(glass, drink, olive, pick); cocktail.position.set(-.42, .1, .1);
  const plate = new THREE.Mesh(new THREE.CylinderGeometry(.48, .4, .04, 48), std(0xcfcac0, { metalness: .1, roughness: .5 })); plate.position.set(.38, -.46, 0);
  const dome = new THREE.Mesh(new THREE.SphereGeometry(.4, 48, 24, 0, Math.PI * 2, 0, Math.PI / 2), std(0xd6dbe3, { metalness: 1, roughness: .12 })); dome.position.set(.38, -.44, 0);
  const knob = new THREE.Mesh(new THREE.SphereGeometry(.05, 16, 12), std(0xd9b25a, { metalness: 1, roughness: .2 })); knob.position.set(.38, -.02, 0);
  const steam = [0, 1, 2].map(k => { const s = new THREE.Mesh(new THREE.SphereGeometry(.05, 12, 8), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: .3, depthWrite: false })); g.add(s); return s; });
  const lid = new THREE.Group(); lid.add(dome, knob);
  g.add(cocktail, plate, lid);
  g.userData.tick = t => {
    const up = Math.max(0, Math.sin(t * .8)) ** 3; lid.position.y = up * .28; lid.rotation.z = up * .25;
    steam.forEach((s, k) => { const p = (t * .5 + k / 3) % 1; s.position.set(.38 + Math.sin(t * 2 + k) * .06, -.35 + p * .9 * up + .1, 0); s.material.opacity = .35 * up * (1 - p); s.scale.setScalar(.6 + p * 1.4); });
    cocktail.rotation.y = Math.sin(t * .7) * .3;
  };
  return g;
}

function stage() {
  const g = new THREE.Group();
  const floor = new THREE.Mesh(new THREE.BoxGeometry(1.5, .14, .9), std(0x1a1410, { metalness: .2, roughness: .6 })); floor.position.y = -.6;
  const back = new THREE.Mesh(new THREE.BoxGeometry(1.5, 1.2, .06), std(0x0d0a14, { metalness: .1, roughness: .9 })); back.position.set(0, .05, -.42);
  const curtain = new THREE.MeshStandardMaterial({ color: 0x8a0f1a, roughness: .7, metalness: 0 });
  const folds = new THREE.CylinderGeometry(.06, .06, 1.25, 8);
  for (let k = 0; k < 5; k++) { [-1, 1].forEach(sd => { const f = new THREE.Mesh(folds, curtain); f.position.set(sd * (.72 - k * .07), .05, -.3 + k * .02); g.add(f); }); }
  const valance = new THREE.Mesh(new THREE.BoxGeometry(1.6, .16, .12), curtain); valance.position.set(0, .66, -.26);
  const mic = new THREE.Group();
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(.012, .012, .6), std(0x9aa4b2, { metalness: 1 })); pole.position.y = -.23;
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
  const cloth = new THREE.Mesh(new THREE.CylinderGeometry(.62, .7, .5, 48), std(0x8c8578, { metalness: 0, roughness: 1, envMapIntensity: .3 })); cloth.position.y = -.38;
  const top = new THREE.Mesh(new THREE.CylinderGeometry(.62, .62, .02, 48), std(0x9a9387, { metalness: 0, roughness: 1, envMapIntensity: .3 })); top.position.y = -.12;
  const vase = new THREE.Mesh(new THREE.CylinderGeometry(.05, .07, .16, 16), std(0xd9b25a, { metalness: 1, roughness: .2 })); vase.position.y = -.02;
  const flowers = new THREE.Mesh(new THREE.IcosahedronGeometry(.11, 1), std(RED, { metalness: 0, roughness: .6, emissive: 0x400008 })); flowers.position.y = .1;
  g.add(cloth, top, vase, flowers);
  const flutes = [];
  for (let k = 0; k < 6; k++) {
    const a = k / 6 * Math.PI * 2;
    const chair = new THREE.Group();
    const seat = new THREE.Mesh(new THREE.BoxGeometry(.24, .04, .24), std(0xd9b25a, { metalness: .6, roughness: .35 })); seat.position.y = -.35;
    const backr = new THREE.Mesh(new THREE.BoxGeometry(.24, .32, .03), std(0xd9b25a, { metalness: .6, roughness: .35 })); backr.position.set(0, -.18, -.12);
    const legs = new THREE.Mesh(new THREE.BoxGeometry(.2, .26, .2), std(0x2a2a30, { metalness: .5 })); legs.position.y = -.5;
    chair.add(seat, backr, legs); chair.position.set(Math.cos(a) * .9, 0, Math.sin(a) * .9); chair.lookAt(0, 0, 0); g.add(chair);
    const f = new THREE.Mesh(new THREE.CylinderGeometry(.025, .012, .16, 12), new THREE.MeshStandardMaterial({ color: 0xffe08a, emissive: 0xffc83b, emissiveIntensity: .7, transparent: true, opacity: .85 }));
    f.position.set(Math.cos(a) * .42, -.03, Math.sin(a) * .42); g.add(f); flutes.push(f);
  }
  g.rotation.x = .3; g.scale.setScalar(.95);
  g.userData.tick = t => flutes.forEach((f, k) => { f.material.emissiveIntensity = .5 + .4 * Math.max(0, Math.sin(t * 2 + k)); });
  return g;
}

export function mountApHub(hero, { reduceMotion, fly }) {
  return mountHub(hero, { reduceMotion, fly, makers: [roulette, hotel, dining, stage, banquet] });
}
