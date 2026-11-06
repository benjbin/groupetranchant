/* Groupe Tranchant — Activités spécialisées : ouverture en 3D, pour comprendre la page d'un coup d'œil.
   Au centre, le groupe (noyau lumineux cerclé de tricolore) ; autour, ses cinq filiales en orbite, chacune
   reconnaissable à son objet : machine à sous (CAT), baie de serveurs et courbe en direct (CERTUS),
   écran d'où sort un cube (ALIOSCOPY), empreinte balayée (ZALIX), globe et conteneur (IDS).
   Des flux de données relient chaque filiale au noyau. Les étiquettes HTML suivent les objets et mènent à leur section.
   Contrat : mountSpecHero(hero, { reduceMotion }). Textures procédurales, aucune image chargée. */
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { Reflector } from 'three/addons/objects/Reflector.js';

const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const ease = t => t * t * (3 - 2 * t);
export const NAVY = 0x0B1B2E, ACC = 0x7FA8DA, GOLD = 0xF9C83B, BLUE = 0x2b5cff, RED = 0xE1000F;

/* matières : or brossé, chrome, laque vernie ; elles prennent vie dans l'éclairage de studio */
export const gold = (r = .24) => new THREE.MeshPhysicalMaterial({ color: 0xe0b25e, metalness: 1, roughness: r, clearcoat: .4, clearcoatRoughness: .2, envMapIntensity: 1.4 });
export const chrome = (r = .1) => new THREE.MeshPhysicalMaterial({ color: 0xe6edf5, metalness: 1, roughness: r, envMapIntensity: 1.5 });
export const lacquer = (color, r = .32) => new THREE.MeshPhysicalMaterial({ color, metalness: .35, roughness: r, clearcoat: 1, clearcoatRoughness: .06, envMapIntensity: 1.1 });
export const std = (color, o = {}) => new THREE.MeshStandardMaterial({ color, roughness: .35, metalness: .6, ...o });
export const glow = (color, k = 2) => new THREE.MeshStandardMaterial({ color: 0x000000, emissive: color, emissiveIntensity: k, roughness: 1, metalness: 0 });

/* boîte aux arêtes arrondies (profil extrudé biseauté) : les volumes accrochent la lumière comme de vrais objets */
export function rbox(w, h, d, r = Math.min(w, h, d) * .14) {
  const c = r * .5, x = w / 2 - r - c, y = h / 2 - r - c, sh = new THREE.Shape();
  sh.moveTo(-x, -y - c); sh.lineTo(x, -y - c); sh.absarc(x, -y, c, -Math.PI / 2, 0); sh.lineTo(x + c, y); sh.absarc(x, y, c, 0, Math.PI / 2);
  sh.lineTo(-x, y + c); sh.absarc(-x, y, c, Math.PI / 2, Math.PI); sh.lineTo(-x - c, -y); sh.absarc(-x, -y, c, Math.PI, Math.PI * 1.5);
  const dd = Math.max(.001, d - 2 * r);
  const g = new THREE.ExtrudeGeometry(sh, { depth: dd, bevelEnabled: true, bevelSize: r, bevelThickness: r, bevelSegments: 4, curveSegments: 4 });
  g.translate(0, 0, -dd / 2);
  return g;
}

export function canvasTex(w, h, draw) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
  return t;
}

/* --- les cinq objets --- */
function slot() {
  const g = new THREE.Group();
  const body = new THREE.Mesh(rbox(1.05, 1.5, .7), lacquer(0x14233a));
  const trim = new THREE.Mesh(rbox(1.12, .08, .76), gold());
  trim.position.y = .78; const trim2 = trim.clone(); trim2.position.y = -.2;
  const top = new THREE.Mesh(rbox(.9, .12, .2), glow(GOLD, 3)); top.position.set(0, .66, .3);
  const sym = canvasTex(128, 512, (x, w, h) => {
    x.fillStyle = '#f7f3ea'; x.fillRect(0, 0, w, h);
    ['7', 'BAR', '7', '♦', '7', 'BAR', '♣', '7'].forEach((s, i) => {
      x.fillStyle = s === '7' ? '#E1000F' : s === 'BAR' ? '#0B1B2E' : '#335F94';
      x.font = `bold ${s === 'BAR' ? 36 : 56}px Arial`; x.textAlign = 'center'; x.textBaseline = 'middle';
      x.fillText(s, w / 2, (i + .5) * h / 8);
    });
  });
  sym.wrapS = sym.wrapT = THREE.RepeatWrapping;
  const reels = [];
  for (let i = 0; i < 3; i++) {
    const t = sym.clone(); t.needsUpdate = true; t.wrapS = t.wrapT = THREE.RepeatWrapping;
    const r = new THREE.Mesh(new THREE.CylinderGeometry(.2, .2, .26, 32, 1, true), new THREE.MeshStandardMaterial({ map: t, roughness: .4, emissive: 0xffffff, emissiveMap: t, emissiveIntensity: .35 }));
    r.rotation.z = Math.PI / 2; r.position.set((i - 1) * .29, .28, .2); reels.push(t); g.add(r);
  }
  const win = new THREE.Mesh(rbox(.92, .48, .1), std(0x0a1422)); win.position.set(0, .28, .2);
  const chips = new THREE.Group();
  [[RED, -.3], [BLUE, 0], [GOLD, .3]].forEach(([c, x], k) => {
    for (let i = 0; i < 4 + k; i++) { const ch = new THREE.Mesh(new THREE.CylinderGeometry(.11, .11, .035, 24), std(c, { metalness: .2, roughness: .5 })); ch.position.set(x, -.72 + i * .04, .52); chips.add(ch); }
  });
  g.add(body, trim, trim2, top, win, chips);
  g.userData.tick = t => reels.forEach((r, i) => { r.offset.y = (t * (.9 + i * .25)) % 1; });
  return g;
}

function rack() {
  const g = new THREE.Group(), leds = [];
  for (let i = 0; i < 4; i++) {
    const u = new THREE.Mesh(rbox(1.1, .26, .8), lacquer(0x15263d, .28));
    u.position.y = -.55 + i * .3; g.add(u);
    for (let k = 0; k < 6; k++) { const l = new THREE.Mesh(rbox(.06, .05, .02), glow(k % 3 ? ACC : 0x4cff9a, 3)); l.position.set(-.4 + k * .12, -.55 + i * .3, .41); g.add(l); leds.push(l); }
  }
  const bars = [];
  for (let k = 0; k < 6; k++) { const b = new THREE.Mesh(rbox(.11, 1, .11), glow(k === 5 ? GOLD : ACC, 1.6)); b.position.set(-.38 + k * .15, .9, 0); g.add(b); bars.push(b); }
  g.userData.tick = t => {
    leds.forEach((l, i) => { l.material.emissiveIntensity = Math.sin(t * 6 + i * 1.7) > .2 ? 3 : .3; });
    bars.forEach((b, i) => { const h = .25 + .55 * (.5 + .5 * Math.sin(t * 1.4 + i * .9)) * (i + 2) / 7; b.scale.y = h; b.position.y = .78 + h / 2; });
  };
  return g;
}

function screen3d() {
  const g = new THREE.Group();
  const frame = new THREE.Mesh(rbox(1.5, .95, .07), lacquer(0x111c2c, .2));
  const panel = new THREE.Mesh(new THREE.PlaneGeometry(1.4, .85), new THREE.MeshStandardMaterial({ color: 0x000000, emissive: 0x1d3f7a, emissiveIntensity: 1.2 }));
  panel.position.z = .04;
  const grid = new THREE.GridHelper(1.3, 8, ACC, 0x2a4f86); grid.rotation.x = Math.PI / 2; grid.position.z = .045; grid.scale.y = .62;
  const stand = new THREE.Mesh(new THREE.CylinderGeometry(.03, .03, .5), chrome()); stand.position.y = -.7;
  const cube = new THREE.Mesh(rbox(.32, .32, .32), std(RED, { metalness: .3, roughness: .3 }));
  const ball = new THREE.Mesh(new THREE.SphereGeometry(.14, 32, 16), std(GOLD, { metalness: .7, roughness: .2 }));
  g.add(frame, panel, grid, stand, cube, ball);
  g.userData.tick = t => {
    const k = .5 + .5 * Math.sin(t * 1.2);
    cube.position.set(-.18, .02, .1 + k * .7); cube.rotation.set(t * .7, t, 0);
    ball.position.set(.35, .15 + Math.sin(t * 2) * .05, .2 + (1 - k) * .55);
  };
  return g;
}

function finger() {
  const g = new THREE.Group();
  const tex = canvasTex(512, 512, (x, w, h) => {
    x.fillStyle = '#06101c'; x.fillRect(0, 0, w, h);
    x.strokeStyle = '#F9C83B'; x.lineWidth = 5; x.lineCap = 'round';
    for (let r = 14; r < 230; r += 15) {
      x.beginPath();
      for (let a = 0; a <= Math.PI * 2 + .01; a += .04) {
        const rr = r * (1 + .1 * Math.sin(a * 2 + r * .03)) + 6 * Math.sin(a * 5 + r * .11);
        const px = w / 2 + Math.cos(a) * rr * .78, py = h / 2 + Math.sin(a) * rr - r * .25;
        a ? x.lineTo(px, py) : x.moveTo(px, py);
      }
      if ((r / 15 | 0) % 4 === 1) x.setLineDash([60, 18]); else x.setLineDash([]);
      x.stroke();
    }
  });
  const disc = new THREE.Mesh(new THREE.CircleGeometry(.72, 64), new THREE.MeshStandardMaterial({ map: tex, emissive: 0xffffff, emissiveMap: tex, emissiveIntensity: .9, roughness: .6 }));
  const ring = new THREE.Mesh(new THREE.TorusGeometry(.76, .025, 12, 80), chrome());
  const base = new THREE.Mesh(new THREE.CylinderGeometry(.82, .82, .08, 64), std(0x13233a)); base.rotation.x = Math.PI / 2; base.position.z = -.05;
  const scan = new THREE.Mesh(new THREE.PlaneGeometry(1.5, .03), glow(ACC, 4)); scan.position.z = .03;
  g.add(base, disc, ring, scan);
  g.userData.tick = t => { scan.position.y = Math.sin(t * 1.6) * .66; scan.scale.x = Math.sqrt(Math.max(0, 1 - (scan.position.y / .76) ** 2)); };
  return g;
}

function globe() {
  const g = new THREE.Group();
  const sphere = new THREE.Mesh(new THREE.SphereGeometry(.62, 48, 32), std(0x10223a, { metalness: .4, roughness: .55 }));
  const n = 900, pos = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) { const y = 1 - (i / (n - 1)) * 2, r = Math.sqrt(1 - y * y), th = i * 2.39996; pos.set([Math.cos(th) * r * .64, y * .64, Math.sin(th) * r * .64], i * 3); }
  const pg = new THREE.BufferGeometry(); pg.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const dots = new THREE.Points(pg, new THREE.PointsMaterial({ color: ACC, size: .018, transparent: true, opacity: .85 }));
  const earth = new THREE.Group(); earth.add(sphere, dots);
  const orbit = new THREE.Group();
  const box = new THREE.Mesh(rbox(.36, .16, .16), std(RED, { metalness: .5, roughness: .45 })); box.position.x = .95;
  const route = new THREE.Mesh(new THREE.TorusGeometry(.95, .006, 6, 120), glow(GOLD, 2)); route.rotation.x = Math.PI / 2;
  orbit.add(box, route); orbit.rotation.z = .35;
  g.add(earth, orbit);
  g.userData.tick = t => { earth.rotation.y = t * .25; orbit.rotation.y = t * .6; };
  return g;
}

/* éclairage de studio pour les reflets : grande boîte à lumière au-dessus, bandes froide et dorée sur les côtés */
function studioEnv(renderer) {
  const env = new THREE.Scene(); env.background = new THREE.Color(0x03060b);
  const box = (w, h, c, k, x, y, z) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ color: new THREE.Color(c).multiplyScalar(k), side: THREE.DoubleSide })); m.position.set(x, y, z); m.lookAt(0, 0, 0); env.add(m); };
  box(10, 10, 0xfff3e0, 3.2, 0, 9, 1);
  box(2, 12, 0x8fb4ff, 2.6, -9, 2, -3);
  box(2, 10, 0xffc870, 2.2, 9, 1.5, 4);
  box(14, 1.2, 0xffffff, 1.4, 0, 3, -10);
  box(30, 30, 0x0b1b2e, .5, 0, -8, 0);
  const pm = new THREE.PMREMGenerator(renderer), tx = pm.fromScene(env, .03).texture; pm.dispose();
  return tx;
}

/* sol laqué : reflet adouci, trame fine, ondes qui partent du noyau, flaques de lumière et ombres de contact sous les socles */
const FLOOR = {
  uniforms: { color: { value: null }, tDiffuse: { value: null }, textureMatrix: { value: null }, uTime: { value: 0 }, uIntro: { value: 0 },
    uBg: { value: new THREE.Color(0x08121f) }, uAcc: { value: new THREE.Color(ACC) }, uGold: { value: new THREE.Color(GOLD) },
    uPed: { value: Array.from({ length: 5 }, () => new THREE.Vector3()) }, uR: { value: 3.4 } },
  vertexShader: `uniform mat4 textureMatrix; varying vec4 vUv; varying vec2 vL;
    void main(){ vUv = textureMatrix * vec4(position,1.); vL = position.xy; gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.); }`,
  fragmentShader: `uniform sampler2D tDiffuse; uniform vec3 uBg, uAcc, uGold; uniform float uTime, uIntro, uR; uniform vec3 uPed[5];
    varying vec4 vUv; varying vec2 vL;
    float gridLine(vec2 p, float w){ vec2 g = abs(fract(p - .5) - .5) / fwidth(p); return 1. - min(min(g.x, g.y) / w, 1.); }
    void main(){
      vec2 uv = vUv.xy / vUv.w; vec2 p = vec2(vL.x, -vL.y); float d = length(p);
      vec3 refl = texture2D(tDiffuse, uv).rgb * .3;
      float b = .004;
      refl += (texture2D(tDiffuse, uv + vec2(b, 0.)).rgb + texture2D(tDiffuse, uv - vec2(b, 0.)).rgb) * .17;
      refl += (texture2D(tDiffuse, uv + vec2(0., b * 2.)).rgb + texture2D(tDiffuse, uv - vec2(0., b * 2.)).rgb) * .18;
      vec3 col = uBg * .7 + refl * .5;
      float g1 = gridLine(p * .9, 1.4);
      float reveal = smoothstep(uIntro * 14., uIntro * 14. - 2., d);
      col += uAcc * g1 * .025 * smoothstep(12., 2., d) * reveal;
      // ondes : un anneau part du noyau toutes les 3,2 s et allume la trame en passant
      for (int k = 0; k < 2; k++) {
        float ph = mod(uTime + float(k) * 1.6, 3.2) * 2.6;
        float ring = exp(-pow((d - ph) * 3., 2.)) * smoothstep(9., 1., ph);
        col += uAcc * ring * .16 * reveal;
      }
      // sous chaque socle : ombre de contact, puis flaque de lumière (plus vive sur la filiale mise en avant)
      for (int i = 0; i < 5; i++) {
        float q = length(p - uPed[i].xy);
        col *= 1. - .55 * smoothstep(1.05, .55, q);
        col += mix(uAcc, uGold, uPed[i].z) * (.05 + uPed[i].z * .12) * exp(-q * q * 1.6);
      }
      col += uAcc * .07 * exp(-d * d * .5);
      col = mix(col, uBg, smoothstep(7., 16., d));
      gl_FragColor = vec4(col, 1.);
    }`
};
/* profondeur de champ en bascule : net au centre, flou en haut et en bas, comme une maquette photographiée */
const TILT = {
  uniforms: { tDiffuse: { value: null }, uDir: { value: new THREE.Vector2(1, 0) }, uRes: { value: new THREE.Vector2(1, 1) }, uFocus: { value: .5 }, uBand: { value: .2 }, uMax: { value: 2.6 } },
  vertexShader: 'varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
  fragmentShader: `uniform sampler2D tDiffuse; uniform vec2 uDir, uRes; uniform float uFocus, uBand, uMax; varying vec2 vUv;
    void main(){
      float r = smoothstep(uBand, uBand + .3, abs(vUv.y - uFocus)) * uMax;
      vec2 st = uDir / uRes * r;
      vec4 c = texture2D(tDiffuse, vUv) * .1964825;
      c += (texture2D(tDiffuse, vUv + st * 1.4117647) + texture2D(tDiffuse, vUv - st * 1.4117647)) * .2969069;
      c += (texture2D(tDiffuse, vUv + st * 3.2941176) + texture2D(tDiffuse, vUv - st * 3.2941176)) * .0944703;
      c += (texture2D(tDiffuse, vUv + st * 5.1764706) + texture2D(tDiffuse, vUv - st * 5.1764706)) * .0103813;
      gl_FragColor = c;
    }`
};

export function mountSpecHero(hero, { reduceMotion }) {
  return mountHub(hero, { reduceMotion, makers: [slot, rack, screen3d, finger, globe] });
}

/* Le moyeu : noyau du groupe, orbite, socles, flux, étiquettes. makers : une fonction par objet (Group, userData.tick(t)).
   fly() : avancée du défilement (0 → 1) si l'ouverture est épinglée ; sinon calculée sur la position du bloc. */
export function mountHub(hero, { reduceMotion, makers, fly: flyFn }) {
  const host = hero.querySelector('.sz-hero-gl');
  const labels = [...hero.querySelectorAll('.sz-orbit a')];
  let renderer;
  try { renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: 'high-performance' }); } catch { return; }
  renderer.setClearColor(0x08121f, 1);
  renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.05;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  host.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  scene.fog = new THREE.Fog(0x08121f, 16, 34);
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = studioEnv(renderer); scene.environmentIntensity = .8;
  const camera = new THREE.PerspectiveCamera(34, 1, .1, 60);
  const world = new THREE.Group(); scene.add(world);
  // lumière : soleil chaud qui porte les ombres, contre-jour froid, ciel bleuté
  const key = new THREE.DirectionalLight(0xfff0d8, 2.6); key.position.set(4, 8, 5);
  key.castShadow = true; key.shadow.mapSize.set(2048, 2048); key.shadow.bias = -.0004; key.shadow.normalBias = .02; key.shadow.radius = 4;
  Object.assign(key.shadow.camera, { left: -7, right: 7, top: 7, bottom: -7, near: 1, far: 30 });
  world.add(key, key.target);
  const rim = new THREE.DirectionalLight(0x7fa8da, 2.6); rim.position.set(-6, 3, -5); scene.add(rim);
  scene.add(new THREE.HemisphereLight(0x9fc0ff, 0x0b1b2e, .55));
  // sol sombre et satiné qui reçoit les ombres et les reflets des socles
  const small = Math.min(innerWidth, innerHeight) < 700;
  let fU = null;
  if (!small) {
    const mirror = new Reflector(new THREE.PlaneGeometry(90, 90), { shader: FLOOR, textureWidth: 1024, textureHeight: 1024, multisample: 0 });
    mirror.rotation.x = -Math.PI / 2; mirror.position.y = -1.62; world.add(mirror); fU = mirror.material.uniforms;
  } else {
    const floor = new THREE.Mesh(new THREE.CircleGeometry(80, 96), new THREE.MeshStandardMaterial({ color: 0x0a1626, roughness: .42, metalness: .55, envMapIntensity: .6 }));
    floor.rotation.x = -Math.PI / 2; floor.position.y = -1.62; floor.receiveShadow = true; world.add(floor);
  }
  // sol : grille qui se perd dans la brume
  const grid = new THREE.GridHelper(120, 180, 0x2a4f86, 0x16304f); grid.position.y = -1.6; grid.material.transparent = true; grid.material.opacity = .3; grid.visible = small; world.add(grid);

  // noyau du groupe : sphère lumineuse, anneaux bleu-blanc-rouge
  const core = new THREE.Group(); world.add(core);
  // au cœur, le logo du groupe dans une bulle de verre
  const glass = new THREE.Mesh(new THREE.SphereGeometry(.78, 64, 32), new THREE.MeshPhysicalMaterial({ color: 0x9fc0ff, metalness: 0, roughness: .05, transparent: true, opacity: .16, clearcoat: 1, envMapIntensity: 2.2, side: THREE.DoubleSide, depthWrite: false }));
  const mesh = new THREE.Mesh(new THREE.IcosahedronGeometry(.8, 2), new THREE.MeshBasicMaterial({ color: ACC, wireframe: true, transparent: true, opacity: .14 }));
  core.add(glass, mesh);
  const src = hero.querySelector('.sz-logo-src');
  const logo = new THREE.Sprite(new THREE.SpriteMaterial({ color: 0xd8d8d8, transparent: true, depthWrite: false }));
  logo.scale.setScalar(1.35); logo.renderOrder = 2; core.add(logo);
  if (src) new THREE.TextureLoader().load(src.currentSrc || src.src, tx => { tx.colorSpace = THREE.SRGBColorSpace; logo.material.map = tx; logo.material.needsUpdate = true; });
  const rings = [BLUE, 0xffffff, RED].map((c, i) => { const r = new THREE.Mesh(new THREE.TorusGeometry(.95 + i * .14, .018, 10, 140), glow(c, c === 0xffffff ? 1.1 : 2)); r.rotation.set(Math.PI / 2 + (i - 1) * .35, (i - 1) * .4, 0); core.add(r); return r; });
  const coreLight = new THREE.PointLight(0x6f9bff, 6, 8); core.add(coreLight);
  // faisceau vertical : le noyau éclaire vers le haut
  const beam = new THREE.Mesh(new THREE.CylinderGeometry(.35, .75, 6, 48, 1, true), new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
    uniforms: { uC: { value: new THREE.Color(0x5f8fff) } },
    vertexShader: 'varying vec2 vU;varying vec3 vN;varying vec3 vV;void main(){vU=uv;vec4 w=modelViewMatrix*vec4(position,1.);vN=normalize(normalMatrix*normal);vV=normalize(-w.xyz);gl_Position=projectionMatrix*w;}',
    fragmentShader: 'uniform vec3 uC;varying vec2 vU;varying vec3 vN;varying vec3 vV;void main(){float f=pow(abs(dot(vN,vV)),2.);float a=f*pow(1.-vU.y,2.)*smoothstep(0.,.08,vU.y)*.09;gl_FragColor=vec4(uC*a,1.);}'
  }));
  beam.position.y = 3.2; core.add(beam);

  // les cinq filiales sur l'orbite, chacune sur son socle
  const POOL = canvasTex(128, 128, (x, w, h) => { const g = x.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2); g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = g; x.fillRect(0, 0, w, h); });
  const R = 3.4, sats = makers.map((mk, i) => {
    const pivot = new THREE.Group();
    const obj = mk(); obj.scale.setScalar(.82);
    const ped = new THREE.Mesh(new THREE.CylinderGeometry(.62, .7, .1, 48), std(0x0a1422, { metalness: .85, roughness: .22, envMapIntensity: .7 }));
    const halo = new THREE.Mesh(new THREE.TorusGeometry(.66, .012, 8, 96), glow(ACC, 2.5)); halo.rotation.x = Math.PI / 2;
    const top = new THREE.Mesh(new THREE.CylinderGeometry(.6, .6, .03, 64), new THREE.MeshPhysicalMaterial({ color: 0x5f86c9, roughness: .06, metalness: .2, transparent: true, opacity: .18, clearcoat: 1, envMapIntensity: 1.2 }));
    const foot = new THREE.Mesh(new THREE.CylinderGeometry(.74, .82, .5, 64), std(0x08111d, { metalness: .85, roughness: .3, envMapIntensity: .6 }));
    const pool = new THREE.Mesh(new THREE.CircleGeometry(1.15, 48), new THREE.MeshBasicMaterial({ map: POOL, color: ACC, transparent: true, opacity: .3, blending: THREE.AdditiveBlending, depthWrite: false }));
    ped.position.y = -.95; halo.position.y = -.9; top.position.y = -.885; foot.position.y = -1.27; pool.rotation.x = -Math.PI / 2; pool.position.y = -1.6;
    pool.visible = small; pivot.add(obj, ped, halo, top, foot, pool); world.add(pivot);
    pivot.traverse(o => { if (o.isMesh && !o.material.transparent && o !== pool) { o.castShadow = true; o.receiveShadow = true; } });
    return { pivot, obj, halo, pool, a0: i / 5 * Math.PI * 2 - Math.PI / 2, hover: 0, thover: 0 };
  });

  // l'orbite tracée au sol, sous les socles
  const orbit = new THREE.Group(); orbit.position.y = -.98; world.add(orbit);
  const orb1 = new THREE.Mesh(new THREE.TorusGeometry(R, .012, 6, 200), glow(ACC, 1.4)); orb1.rotation.x = Math.PI / 2;
  const orb2 = new THREE.Mesh(new THREE.RingGeometry(R - .9, R + .9, 160), new THREE.MeshBasicMaterial({ color: 0x3d6fd1, transparent: true, opacity: .07, side: THREE.DoubleSide, depthWrite: false })); orb2.rotation.x = -Math.PI / 2;
  orb2.visible = small; orbit.add(orb1, orb2);

  // flux de données : un trait par filiale, des impulsions qui vont et viennent
  const pulseGeo = new THREE.SphereGeometry(.045, 12, 8);
  const links = sats.map(() => {
    const line = new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3()]), new THREE.LineBasicMaterial({ color: ACC, transparent: true, opacity: .35 }));
    world.add(line);
    const pulses = [0, .33, .66].map((o, k) => { const p = new THREE.Mesh(pulseGeo, glow(k === 1 ? GOLD : ACC, 4)); world.add(p); return { p, o, dir: k === 1 ? -1 : 1 }; });
    return { line, pulses };
  });

  // poussière de données
  const dn = 500, dp = new Float32Array(dn * 3);
  for (let i = 0; i < dn; i++) dp.set([(Math.random() - .5) * 18, Math.random() * 7 - 1.5, (Math.random() - .5) * 18], i * 3);
  const dg = new THREE.BufferGeometry(); dg.setAttribute('position', new THREE.BufferAttribute(dp, 3));
  const dust = new THREE.Points(dg, new THREE.PointsMaterial({ color: ACC, size: .03, transparent: true, opacity: .5 })); world.add(dust);

  // rendu : anticrénelage multi-échantillons, halo sur les seules lumières, puis passe « pellicule »
  const composer = new EffectComposer(renderer, new THREE.WebGLRenderTarget(1, 1, { samples: 4, type: THREE.HalfFloatType }));
  composer.addPass(new RenderPass(scene, camera));
  const bloom = new UnrealBloomPass(new THREE.Vector2(256, 256), .5, .5, .86); composer.addPass(bloom);
  const tiltH = new ShaderPass(TILT), tiltV = new ShaderPass(TILT); tiltV.uniforms.uDir.value.set(0, 1);
  composer.addPass(tiltH); composer.addPass(tiltV);
  composer.addPass(new OutputPass());
  const film = new ShaderPass({
    uniforms: { tDiffuse: { value: null }, uT: { value: 0 }, uRes: { value: new THREE.Vector2(1, 1) } },
    vertexShader: 'varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
    fragmentShader: `uniform sampler2D tDiffuse;uniform float uT;uniform vec2 uRes;varying vec2 vUv;
      float h(vec2 p){return fract(sin(dot(p,vec2(12.9898,78.233)))*43758.5453);}
      void main(){
        vec2 d=vUv-.5;float r=dot(d,d);
        vec2 o=d*r*.006;
        vec3 c=vec3(texture2D(tDiffuse,vUv+o).r,texture2D(tDiffuse,vUv).g,texture2D(tDiffuse,vUv-o).b);
        c=mix(c,c*vec3(.92,.97,1.06),.35);
        c=mix(vec3(.035,.07,.12),c,.96+.04*c);
        c*=1.-smoothstep(.18,.75,r)*.55;
        c+=(h(vUv*uRes+uT)-.5)*.035;
        gl_FragColor=vec4(c,1.);
      }`
  });
  composer.addPass(film);

  let W = 1, H = 1, wide = true;
  const size = () => {
    W = host.clientWidth || 1; H = host.clientHeight || 1; wide = W / H > 1.15;
    const dpr = Math.min(devicePixelRatio || 1, 1.5);
    renderer.setPixelRatio(dpr); renderer.setSize(W, H, false); composer.setPixelRatio(dpr); composer.setSize(W, H); film.uniforms.uRes.value.set(W * dpr, H * dpr); [tiltH, tiltV].forEach(p => { p.uniforms.uRes.value.set(W * dpr, H * dpr); p.uniforms.uFocus.value = wide ? .52 : .62; });
    camera.aspect = W / H; camera.updateProjectionMatrix();
  };
  new ResizeObserver(size).observe(host); size();

  // pointeur et survol des étiquettes
  let mx = 0, my = 0, tmx = 0, tmy = 0;
  hero.addEventListener('pointermove', e => { tmx = e.clientX / innerWidth - .5; tmy = e.clientY / innerHeight - .5; });
  // une filiale à la fois est mise en avant : celle que l'on survole (étiquette ou objet), sinon tour à tour
  let focus = -1, userFocus = -1, cycleAt = 0;
  const setFocus = i => {
    if (i === focus) return; focus = i;
    sats.forEach((s, k) => { s.thover = k === i ? 1 : 0; });
    labels.forEach((a, k) => a.classList.toggle('on', k === i));
    hero.classList.toggle('sz-focus', i >= 0);
  };
  labels.forEach((a, i) => {
    a.addEventListener('mouseenter', () => { userFocus = i; setFocus(i); });
    a.addEventListener('mouseleave', () => { userFocus = -1; cycleAt = performance.now(); });
  });
  const ray = new THREE.Raycaster(), ndc = new THREE.Vector2();
  const hit = e => {
    const b = host.getBoundingClientRect();
    ndc.set((e.clientX - b.left) / b.width * 2 - 1, -(e.clientY - b.top) / b.height * 2 + 1);
    ray.setFromCamera(ndc, camera);
    const h = ray.intersectObjects(sats.map(s => s.pivot), true)[0];
    return h ? sats.findIndex(s => { let o = h.object; while (o) { if (o === s.pivot) return true; o = o.parent; } return false; }) : -1;
  };
  hero.addEventListener('pointermove', e => {
    if (e.target.closest('.sz-orbit a, .page-head-in')) return;
    const i = hit(e); hero.style.cursor = i >= 0 ? 'pointer' : '';
    if (i >= 0) { userFocus = i; setFocus(i); } else if (userFocus >= 0) { userFocus = -1; cycleAt = performance.now(); }
  });
  hero.addEventListener('click', e => { if (e.target.closest('a')) return; const i = hit(e); if (i >= 0) labels[i]?.click(); });

  const v = new THREE.Vector3();
  let on = true, t0 = performance.now(), intro = reduceMotion ? 1 : 0;
  const render = now => {
    const t = reduceMotion ? 3 : (now - t0) / 1000;
    intro = reduceMotion ? 1 : clamp(t / 2.6);
    const ei = ease(intro);
    let fly;
    if (flyFn) fly = flyFn();
    else { const r = hero.getBoundingClientRect(); fly = clamp(-r.top / Math.max(1, r.height)); hero.style.setProperty('--fly', fly.toFixed(4)); }
    mx += (tmx - mx) * .05; my += (tmy - my) * .05;

    // caméra : arrivée en plongée, puis le défilement l'approche du noyau
    const dist = (wide ? 18 : 22 + 12 * clamp(1 - W / H)) - ei * 1.5 - fly * 4;
    const elev = .62 - (1 - ei) * .3 + my * .1 - fly * .15;
    const az = (1 - ei) * .9 + mx * .35;
    camera.position.set(Math.sin(az) * dist * Math.cos(elev), Math.sin(elev) * dist + .2, Math.cos(az) * dist * Math.cos(elev));
    world.position.x = wide ? 2.7 : 0;   // sur grand écran, l'ensemble se tient à droite du titre
    camera.lookAt(0, wide ? -.4 : -2.6, 0);

    core.rotation.y = t * .3; rings.forEach((rg, i) => { rg.rotation.z = t * (.4 + i * .2) * (i % 2 ? -1 : 1); });
    coreLight.intensity = 5 + Math.sin(t * 2) * 1.5;
    if (userFocus < 0 && intro >= 1 && !reduceMotion && now - cycleAt > 3200) { cycleAt = now; setFocus((focus + 1) % sats.length); }
    const spin = t * .06 + fly * .8;
    orbit.scale.setScalar((wide ? 1 : .8) * (.35 + .65 * ei)); orb1.material.emissiveIntensity = 1 + Math.sin(t * 1.5) * .4;
    logo.material.rotation = Math.sin(t * .6) * .06;
    sats.forEach((s, i) => {
      s.hover += (s.thover - s.hover) * .12;
      const a = s.a0 + spin, rr = R * (wide ? 1 : .8) * (.35 + .65 * ease(clamp(intro * 1.4 - i * .08)));
      s.pivot.position.set(Math.cos(a) * rr, Math.sin(t * .9 + i) * .08 + s.hover * .25, Math.sin(a) * rr);
      s.pivot.lookAt(camera.position.x, s.pivot.position.y, camera.position.z);
      s.pivot.scale.setScalar((ease(clamp(intro * 1.6 - i * .12))) * (1 + s.hover * .18));
      s.halo.material.emissiveIntensity = 2.5 + s.hover * 5; s.pool.material.opacity = .18 + s.hover * .4;
      s.obj.userData.tick?.(t);
      const L = links[i];
      L.line.geometry.attributes.position.setXYZ(1, s.pivot.position.x, s.pivot.position.y - .2, s.pivot.position.z); L.line.geometry.attributes.position.needsUpdate = true;
      L.line.material.opacity = .25 + s.hover * .5;
      L.pulses.forEach(pu => { const k = ((t * .45 * pu.dir + pu.o) % 1 + 1) % 1; pu.p.position.copy(s.pivot.position).multiplyScalar(k); pu.p.position.y = (s.pivot.position.y - .2) * k; pu.p.visible = intro > .6; });
      // étiquette : suit l'objet à l'écran
      if (labels[i]) {
        s.pivot.getWorldPosition(v); v.y += wide ? 1.15 : 1.05; v.project(camera);
        const hw = labels[i].firstElementChild.offsetWidth / 2 + 12;
        const x = clamp((v.x * .5 + .5) * W, hw, W - hw), y = Math.max(110, (-v.y * .5 + .5) * H);
        labels[i].style.transform = `translate(${x.toFixed(1)}px,${y.toFixed(1)}px)`;
        labels[i].style.opacity = (clamp(intro * 2 - 1 - i * .08) * (1 - fly * 1.6)).toFixed(3);
        labels[i].style.zIndex = v.z < 0.985 ? 3 : 2;
      }
    });
    dust.rotation.y = t * .02;
    film.uniforms.uT.value = (t * 60 | 0) % 97;
    if (fU) {
      fU.uTime.value = t; fU.uIntro.value = ei;
      sats.forEach((s, i) => fU.uPed.value[i].set(s.pivot.position.x, s.pivot.position.z, s.hover));
    }
    composer.render();
  };
  const loop = now => { if (!on) return; render(now); if (!reduceMotion) requestAnimationFrame(loop); };
  new IntersectionObserver(([e]) => { const was = on; on = e.isIntersecting; if (on && !was) requestAnimationFrame(loop); }).observe(hero);
  hero.classList.add('gl-on');
  requestAnimationFrame(loop);
  if (reduceMotion) addEventListener('resize', () => requestAnimationFrame(render));
}
