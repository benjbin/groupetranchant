/* Groupe Tranchant — Présentation du groupe : la maquette d'architecte.
   Une scène reste collée pendant tout le récit ; le texte passe devant dans des panneaux de verre.
   Au départ, tout n'est qu'un plan bleu (les arêtes des bâtiments à venir, cotes et trame qui se tracent) ;
   le défilement fait sortir de terre, chapitre après chapitre, ce que raconte le texte :
   1. 1988, le premier casino ; 2. le monument historique, l'hôtel et un second casino ; 3. la citation, au pied
   du casino ; 4. vue d'ensemble ; 5. le complexe de loisirs ; 6. parkings, routes et circulation ;
   7. les acquisitions, plateaux satellites reliés par des ponts de lumière ; 8. la digitalisation, réseau bleu.
   Chaque chantier : plan de balayage doré qui monte avec le volume, étincelles, onde au sol, grue pour les grands
   ouvrages. Ambiance : brume basse, poussière dorée en suspension, bascule de netteté (effet maquette), étalonnage.
   Contrat : mountGm(root, { reduceMotion }). Sans WebGL ou en mouvement réduit, le texte se lit seul. */
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
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
const ORIGIN = [.3, -1.2]; // le premier casino : centre du tracé, des ondes et du réseau

const VQUAD = 'varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}';
/* profondeur de champ en bascule : net au centre, flou en haut et en bas (maquette photographiée) */
const TILT = {
  uniforms: { tDiffuse: { value: null }, uDir: { value: new THREE.Vector2(1, 0) }, uRes: { value: new THREE.Vector2(1, 1) }, uFocus: { value: .5 }, uBand: { value: .2 }, uMax: { value: 2.4 } },
  vertexShader: VQUAD,
  fragmentShader: `uniform sampler2D tDiffuse; uniform vec2 uDir, uRes; uniform float uFocus, uBand, uMax; varying vec2 vUv;
    void main(){
      float r = smoothstep(uBand, uBand + .32, abs(vUv.y - uFocus)) * uMax;
      vec2 st = uDir / uRes * r;
      vec4 c = texture2D(tDiffuse, vUv) * .1964825;
      c += (texture2D(tDiffuse, vUv + st * 1.4117647) + texture2D(tDiffuse, vUv - st * 1.4117647)) * .2969069;
      c += (texture2D(tDiffuse, vUv + st * 3.2941176) + texture2D(tDiffuse, vUv - st * 3.2941176)) * .0944703;
      c += (texture2D(tDiffuse, vUv + st * 5.1764706) + texture2D(tDiffuse, vUv - st * 5.1764706)) * .0103813;
      gl_FragColor = c;
    }`
};
/* étalonnage : ombres froides, hautes lumières chaudes, vignette douce, grain fin */
const FILM = {
  uniforms: { tDiffuse: { value: null }, uT: { value: 0 }, uRes: { value: new THREE.Vector2(1, 1) } },
  vertexShader: VQUAD,
  fragmentShader: `uniform sampler2D tDiffuse; uniform float uT; uniform vec2 uRes; varying vec2 vUv;
    float h(vec2 p){ return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
    void main(){
      vec2 d = vUv - .5; float r = dot(d, d);
      vec2 o = d * r * .005;
      vec3 c = vec3(texture2D(tDiffuse, vUv + o).r, texture2D(tDiffuse, vUv).g, texture2D(tDiffuse, vUv - o).b);
      float l = dot(c, vec3(.299, .587, .114));
      c = mix(c, c * vec3(.93, .98, 1.07), (1. - l) * .45);
      c = mix(c, c * vec3(1.05, 1., .93), smoothstep(.35, .9, l) * .5);
      c *= 1. - smoothstep(.16, .62, r) * .42;
      c += (h(vUv * uRes + fract(uT) * 91.) - .5) * .026;
      gl_FragColor = vec4(c, 1.);
    }`
};

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
  const SM = small(); // budget fixé au montage : moins de particules, ombres plus légères, pas de bascule de netteté
  const renderer = new THREE.WebGLRenderer({ antialias: false, alpha: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, SM ? 1.5 : 1.6));
  renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.05;
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  host.append(renderer.domElement);
  const scene = new THREE.Scene();
  // fond : halo nocturne décentré, plutôt qu'un aplat ; brume lointaine de la même couleur
  scene.background = canvasTex(512, 512, (c, w, h) => {
    const g = c.createRadialGradient(w * .58, h * .38, 0, w * .58, h * .38, w * .78);
    g.addColorStop(0, '#16304f'); g.addColorStop(.45, '#0c1d31'); g.addColorStop(1, '#050c16');
    c.fillStyle = g; c.fillRect(0, 0, w, h);
  });
  scene.fog = new THREE.Fog(0x0b1a2c, 30, 78);
  const pm = new THREE.PMREMGenerator(renderer);
  scene.environment = pm.fromScene(new RoomEnvironment(), .04).texture; scene.environmentIntensity = .32; pm.dispose();
  const camera = new THREE.PerspectiveCamera(32, 1, .1, 200);

  // uniformes partagés
  const uTime = { value: 0 }, REV = { value: 0 }, HERO = { value: 1 }, PX = { value: 1000 };

  /* --- lumières : clair de lune froid, puis les lumières chaudes des établissements --- */
  scene.add(new THREE.HemisphereLight(0x8fb0e0, 0x0b1b2e, .5));
  const moon = new THREE.DirectionalLight(0xc6d6ff, 1.5); moon.position.set(-9, 15, 7);
  moon.castShadow = true; moon.shadow.mapSize.set(SM ? 1024 : 2048, SM ? 1024 : 2048);
  Object.assign(moon.shadow.camera, { left: -15, right: 15, top: 15, bottom: -15, near: 1, far: 50 });
  moon.shadow.bias = -.0004; moon.shadow.normalBias = .02; moon.shadow.radius = 3;
  scene.add(moon);
  const warm = [[.3, 1.2, .2, 1], [-4.2, 1.1, -.4, 2], [3.6, 1.4, 4.6, 5]].map(([x, y, z, b]) => { const l = new THREE.PointLight(0xffb764, 0, 7, 2); l.position.set(x, y, z); scene.add(l); return { l, b }; });

  /* --- textures utilitaires (aucun caractère) --- */
  const RAD = canvasTex(128, 128, (c, w, h) => { const g = c.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2); g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(.4, 'rgba(255,255,255,.55)'); g.addColorStop(1, 'rgba(255,255,255,0)'); c.fillStyle = g; c.fillRect(0, 0, w, h); });
  const FRAME = canvasTex(256, 256, (c, w, h) => { c.fillStyle = 'rgba(255,255,255,.06)'; c.fillRect(0, 0, w, h); for (let i = 0; i < 14; i++) { c.strokeStyle = `rgba(255,255,255,${(1 - i / 14) ** 2})`; c.lineWidth = 2; c.strokeRect(i * 2 + 1, i * 2 + 1, w - i * 4 - 2, h - i * 4 - 2); } c.strokeStyle = 'rgba(255,255,255,.25)'; c.lineWidth = 1; for (let k = 1; k < 8; k++) { c.beginPath(); c.moveTo(k * w / 8, 0); c.lineTo(k * w / 8, h); c.stroke(); c.beginPath(); c.moveTo(0, k * h / 8); c.lineTo(w, k * h / 8); c.stroke(); } });
  const flat = (geo, mat, y = 0) => { const m = new THREE.Mesh(geo, mat); m.rotation.x = -Math.PI / 2; m.position.y = y; return m; };
  const add = (color, op = 0, extra = {}) => new THREE.MeshBasicMaterial({ color, transparent: true, opacity: op, blending: THREE.AdditiveBlending, depthWrite: false, fog: false, ...extra });
  const PLANE = new THREE.PlaneGeometry(1, 1);

  // nuées de points (poussière, étincelles, paquets de données) : disque doux, taille en perspective
  const pointsMat = (color, move = '') => new THREE.ShaderMaterial({
    uniforms: { uC: { value: new THREE.Color(color) }, uPx: PX, uT: uTime, uOp: { value: 1 } },
    vertexShader: `attribute float aS; attribute float aA; uniform float uPx, uT; varying float vA;
      void main(){ vec3 p = position; float al = aA; ${move}
        vec4 mv = modelViewMatrix * vec4(p, 1.);
        gl_Position = projectionMatrix * mv;
        if (al <= 0.) { gl_PointSize = 0.; gl_Position = vec4(2., 2., 2., 1.); vA = 0.; return; }
        gl_PointSize = max(1., aS * uPx / -mv.z); vA = al * smoothstep(.5, 2.2, -mv.z); }`,
    fragmentShader: `uniform vec3 uC; uniform float uOp; varying float vA;
      void main(){ vec2 d = gl_PointCoord - .5; float r = dot(d, d) * 4.; float a = exp(-r * 3.5) * (1. - r); if (a <= 0.) discard; gl_FragColor = vec4(uC * a * vA * uOp, 1.); }`,
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending
  });
  const cloud = (n, mat, fill) => {
    const pos = new Float32Array(n * 3), aS = new Float32Array(n), aA = new Float32Array(n);
    for (let i = 0; i < n; i++) fill(i, pos, aS, aA);
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('aS', new THREE.BufferAttribute(aS, 1)); g.setAttribute('aA', new THREE.BufferAttribute(aA, 1));
    const p = new THREE.Points(g, mat); p.frustumCulled = false; scene.add(p); return p;
  };

  // arêtes du plan : apparaissent derrière un front de tracé doré qui part du premier casino, puis un balayage lent
  const wireMat = (color, op) => new THREE.ShaderMaterial({
    uniforms: { uC: { value: new THREE.Color(color) }, uOp: { value: op }, uR: REV, uT: uTime, uH: HERO },
    vertexShader: 'varying vec3 vW; void main(){ vec4 w = modelMatrix * vec4(position, 1.); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }',
    fragmentShader: `uniform vec3 uC; uniform float uOp, uR, uT, uH; varying vec3 vW;
      void main(){
        float d = length(vW.xz - vec2(${ORIGIN[0]}, ${ORIGIN[1]})) + vW.y * .8;
        if (d > uR) discard;
        float fr = exp(-pow((uR - d) * 1.5, 2.)) * step(uR, 40.);
        float ph = mod(uT, 7.5) * 4.;
        float sc = exp(-pow((ph - d) * 1.3, 2.)) * uH;
        float sh = .82 + .18 * sin(vW.y * 26. - uT * 3. + d * 2.);
        gl_FragColor = vec4(uC * sh * (1. + sc * 1.4) + vec3(1., .78, .42) * fr * 2.6, min(1., uOp * (1. + fr * 3. + sc * 1.5)));
      }`,
    transparent: true, depthWrite: false
  });

  /* --- le plateau : laque marine, filets dorés, plan gravé (routes, parcelles, trame bleue) --- */
  const PW = 18, PD = 12;
  const plinth = new THREE.Mesh(new THREE.BoxGeometry(PW, .6, PD), new THREE.MeshPhysicalMaterial({ color: 0x0c1a2c, metalness: .3, roughness: .38, clearcoat: 1, clearcoatRoughness: .1 }));
  plinth.position.y = -.3; plinth.receiveShadow = true; scene.add(plinth);
  const edge = new THREE.Mesh(new THREE.BoxGeometry(PW + .04, .03, PD + .04), gold(.25)); edge.position.y = -.015; scene.add(edge);
  const edge2 = new THREE.Mesh(new THREE.BoxGeometry(PW + .03, .012, PD + .03), gold(.3)); edge2.position.y = -.48; scene.add(edge2);
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
    // passages piétons aux carrefours
    c.fillStyle = 'rgba(245,241,234,.28)';
    roadsX.forEach(([a, b]) => { for (let x = X(a) * w + 6; x < X(b) * w - 6; x += 14) { c.fillRect(x, Z(.35) * h - 26, 8, 20); c.fillRect(x, Z(1.25) * h + 6, 8, 20); } });
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
  // dessus du plateau : vernis (reflets de l'environnement), plan imprimé dessous
  const topMat = new THREE.MeshPhysicalMaterial({ map: plan, emissive: 0xffffff, emissiveMap: grid, emissiveIntensity: .16, roughness: .62, metalness: .1, clearcoat: .55, clearcoatRoughness: .22, envMapIntensity: .8 });
  const top = flat(new THREE.PlaneGeometry(PW, PD), topMat, .002); top.receiveShadow = true; scene.add(top);

  // calque lumineux du plan : trame qui s'allume derrière le front de tracé, axes et cercle de cotes,
  // puis (chapitre 8) ondes bleues qui partent du premier casino
  const gridMat = new THREE.ShaderMaterial({
    uniforms: { uT: uTime, uR: REV, uH: HERO, uDig: { value: 0 }, uA: { value: new THREE.Color(ACC) }, uB: { value: new THREE.Color(0x4f9dff) }, uG: { value: new THREE.Color(GOLD) } },
    vertexShader: 'varying vec2 vP; void main(){ vP = position.xy; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.); }',
    fragmentShader: `uniform float uT, uR, uH, uDig; uniform vec3 uA, uB, uG; varying vec2 vP;
      float gline(vec2 p, float w){ vec2 g = abs(fract(p - .5) - .5) / fwidth(p); return 1. - min(min(g.x, g.y) / w, 1.); }
      float ln(float v, float w){ return 1. - min(abs(v) / (fwidth(v) * w), 1.); }
      void main(){
        vec2 p = vec2(vP.x, -vP.y), q = p - vec2(${ORIGIN[0]}, ${ORIGIN[1]});
        float d = length(q);
        float g = gline(p * 4., 1.) * .3 + gline(p / 1.5, 1.6);
        float edge = smoothstep(0., .6, min(${PW / 2}. - abs(p.x), ${PD / 2}. - abs(p.y)));
        float rev = step(d, uR);
        float fr = exp(-pow((uR - d) * 1.1, 2.)) * step(uR, 40.);
        float ph = mod(uT, 7.5) * 4., sc = exp(-pow((ph - d) * 1.2, 2.));
        // axes en tirets-points et cercles de cotes autour du casino fondateur
        float dash = step(.35, fract(dot(p, vec2(1.)) * .9));
        float ax = max(ln(q.x, 1.2), ln(q.y, 1.2)) * dash;
        float ci = (ln(d - 2.4, 1.3) + ln(d - 4.2, 1.) * step(.5, fract(atan(q.y, q.x) * 9.55))) ;
        float tk = ln(d - 2.55, 6.) * step(.85, fract(atan(q.y, q.x) * 11.459));
        vec3 c = uA * (g * (.09 + .3 * sc) + (ax * .55 + ci * .45 + tk * .6) * (.5 + sc)) * uH * rev;
        c += uG * (g * .9 + .1) * fr;
        for (int k = 0; k < 3; k++) {
          float r = fract(uT * .2 + float(k) / 3.) * 15.;
          float ring = exp(-pow((d - r) * 1.7, 2.)) * (1. - r / 15.);
          c += uB * (g * 1.3 + .1) * ring * uDig;
        }
        c += uB * g * .07 * uDig;
        gl_FragColor = vec4(c * edge, 1.);
      }`,
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending
  });
  scene.add(flat(new THREE.PlaneGeometry(PW, PD), gridMat, .004));

  /* --- matériaux de maquette --- */
  const ivory = () => new THREE.MeshStandardMaterial({ color: 0xbdb5a5, roughness: .85, metalness: 0, envMapIntensity: .5 });
  const slate = () => new THREE.MeshStandardMaterial({ color: 0x2b3646, roughness: .6, metalness: .2 });
  const green = () => new THREE.MeshStandardMaterial({ color: 0x4f6b57, roughness: .95, metalness: 0 });
  // fenêtres : 16 × 16 baies par motif, teintes variées (chaud, blanc, éteint, rideaux tirés)
  const WIN = canvasTex(512, 512, (c, w, h) => {
    c.fillStyle = '#000'; c.fillRect(0, 0, w, h);
    for (let j = 0; j < 16; j++) for (let i = 0; i < 16; i++) {
      const k = Math.random(), x = i * 32 + 9, y = j * 32 + 7;
      c.fillStyle = k < .24 ? '#1d1408' : k < .62 ? '#c98a3a' : k < .82 ? '#ffd590' : k < .9 ? '#f1e2c4' : '#a8642a';
      c.fillRect(x, y, 14, 18);
      if (k > .9) { c.fillStyle = '#ffcf85'; c.fillRect(x, y + 12, 14, 6); }
    }
  });
  // façade : trumeaux, bandeaux d'étage, baies vitrées sombres (lisibles même éteintes)
  const FAC = canvasTex(512, 512, (c, w, h) => {
    c.fillStyle = '#f4f1ea'; c.fillRect(0, 0, w, h);
    for (let j = 0; j < 16; j++) { c.fillStyle = '#ddd7cc'; c.fillRect(0, j * 32 + 28, w, 3); }
    for (let i = 0; i < 16; i++) { c.fillStyle = '#fbf9f4'; c.fillRect(i * 32 + 1, 0, 4, h); }
    for (let j = 0; j < 16; j++) for (let i = 0; i < 16; i++) { c.fillStyle = '#4a5260'; c.fillRect(i * 32 + 9, j * 32 + 7, 14, 18); c.fillStyle = '#6b7482'; c.fillRect(i * 32 + 9, j * 32 + 7, 14, 2); }
  });
  WIN.wrapS = WIN.wrapT = FAC.wrapS = FAC.wrapT = THREE.RepeatWrapping;
  // scintillement : quelques fenêtres s'éteignent ou s'allument au fil du temps, rares lueurs d'écran
  const flick = m => {
    m.onBeforeCompile = sh => {
      sh.uniforms.uT = uTime;
      sh.fragmentShader = 'uniform float uT;\n' + sh.fragmentShader.replace('#include <emissivemap_fragment>', `
        #ifdef USE_EMISSIVEMAP
          vec4 emissiveColor = texture2D(emissiveMap, vEmissiveMapUv);
          vec2 wc = floor(vEmissiveMapUv * 16.);
          float wh = fract(sin(dot(wc, vec2(12.9898, 78.233))) * 43758.5453);
          float ep = floor(uT * .11 + wh * 13.);
          float wk = fract(sin(ep * 91.7 + wh * 47.3) * 3711.3);
          emissiveColor.rgb *= wk < .1 ? .06 : (wk > .95 ? 1.3 : 1.);
          if (wh > .975) emissiveColor.rgb = mix(emissiveColor.rgb, vec3(.55, .7, 1.) * dot(emissiveColor.rgb, vec3(.4)), .7) * (.75 + .25 * sin(uT * 7. + wh * 50.) * sin(uT * 2.3));
          totalEmissiveRadiance *= emissiveColor.rgb;
        #endif`);
    };
    return m;
  };
  const lit = (rx, ry, base = 0xbdb5a5) => {
    const t = WIN.clone(), f = FAC.clone(); t.repeat.set(rx / 4, ry / 4); f.repeat.copy(t.repeat); t.needsUpdate = f.needsUpdate = true;
    return flick(new THREE.MeshStandardMaterial({ color: base, map: f, roughness: .82, metalness: 0, envMapIntensity: .5, emissive: 0xffc27a, emissiveMap: t, emissiveIntensity: 0 }));
  };
  const box = (w, h, d, m) => { const g = new THREE.BoxGeometry(w, h, d); g.translate(0, h / 2, 0); return new THREE.Mesh(g, m); };
  const at = (o, x, y, z) => { o.position.set(x, y, z); return o; };
  const units = (s, pts, y) => pts.forEach(([x, z, w = .12, d = .09]) => { s.add(at(box(w, .06, d, slate()), x, y, z)); s.add(at(box(w * .5, .015, w * .5, slate()), x, y + .06, z)); });

  /* --- chantiers : plan de balayage, étincelles, onde au sol, flaques de lumière, ombre de contact --- */
  const scanLineMat = () => new THREE.LineBasicMaterial({ color: new THREE.Color(GOLD).multiplyScalar(2.6), transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, fog: false });
  const dimMat = wireMat(ACC, 0);
  function dims(bb) {
    const v = [], o = .34, tk = .06, x0 = bb.min.x, x1 = bb.max.x, z0 = bb.min.z, z1 = bb.max.z, y = .012, h = bb.max.y;
    const L = (a, b) => v.push(...a, ...b);
    const zf = z1 + o; L([x0, y, zf], [x1, y, zf]); L([x0, y, z1 + .06], [x0, y, zf + .08]); L([x1, y, z1 + .06], [x1, y, zf + .08]);
    [x0, x1].forEach(x => L([x - tk, y, zf + tk], [x + tk, y, zf - tk]));
    const xs = x1 + o; L([xs, y, z0], [xs, y, z1]); L([x1 + .06, y, z0], [xs + .08, y, z0]); L([x1 + .06, y, z1], [xs + .08, y, z1]);
    [z0, z1].forEach(z => L([xs - tk, y, z + tk], [xs + tk, y, z - tk]));
    L([xs, 0, zf], [xs, h, zf]); L([x1 + .04, h, z1 + .04], [xs + .08, h, zf + .08]);
    [0, h].forEach(yy => L([xs - tk, yy - tk, zf], [xs + tk, yy + tk, zf]));
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(v, 3));
    return new THREE.LineSegments(g, dimMat);
  }

  const builds = [];
  function building(make, x, z, beat, delay = 0) {
    const solid = new THREE.Group(); const lights = [], glows = [];
    make(solid, lights, glows);
    solid.updateMatrixWorld(true);
    const wire = new THREE.Group(), wm = wireMat(ACC, .3);
    solid.traverse(o => { if (o.isMesh && !o.userData.noWire) { const l = new THREE.LineSegments(new THREE.EdgesGeometry(o.geometry, 28), wm); l.applyMatrix4(o.matrixWorld); wire.add(l); } if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
    const bb = new THREE.Box3().setFromObject(solid), sz = bb.getSize(new THREE.Vector3()), ct = bb.getCenter(new THREE.Vector3());
    const g = new THREE.Group(); g.add(solid, wire, dims(bb)); g.position.set(x, 0, z); scene.add(g);
    // ombre de contact et lumière qui déborde des baies sur le trottoir
    const shadow = flat(PLANE, new THREE.MeshBasicMaterial({ color: 0, map: RAD, transparent: true, opacity: 0, depthWrite: false }), .005);
    shadow.position.x = ct.x; shadow.position.z = ct.z; shadow.scale.set(sz.x * 1.45 + .3, sz.z * 1.45 + .3, 1); g.add(shadow);
    const pools = [[bb.max.z + .5, sz.x * 1.5 + .4, 1.5, .5], [ct.z, sz.x + 1.4, sz.z + 1.4, .22]].map(([pz, w, d, k]) => {
      const m = flat(PLANE, add(0xffa64d, 0, { map: RAD }), .009); m.position.set(ct.x, .009, pz); m.scale.set(w, d, 1); g.add(m); return [m, k];
    });
    // chantier : cadre doré qui monte avec le volume, montants d'angle, voile lumineux
    const scan = new THREE.Group(); scan.visible = false; g.add(scan);
    const sw = sz.x + .12, sd = sz.z + .12, sm = scanLineMat();
    const rect = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.PlaneGeometry(sw, sd).rotateX(-Math.PI / 2)), sm);
    const veil = flat(PLANE, add(GOLD, 0, { map: FRAME, side: THREE.DoubleSide })); veil.scale.set(sw, sd, 1);
    const scanTop = new THREE.Group(); scanTop.add(rect, veil); scanTop.position.set(ct.x, 0, ct.z); scan.add(scanTop);
    const pv = []; [[-1, -1], [1, -1], [1, 1], [-1, 1]].forEach(([a, c]) => pv.push(ct.x + a * sw / 2, 0, ct.z + c * sd / 2, ct.x + a * sw / 2, 1, ct.z + c * sd / 2));
    const pg = new THREE.BufferGeometry(); pg.setAttribute('position', new THREE.Float32BufferAttribute(pv, 3));
    const posts = new THREE.LineSegments(pg, sm); scan.add(posts);
    const ring = flat(new THREE.RingGeometry(.975, 1, 96), add(GOLD, 0), .012); ring.position.x = ct.x; ring.position.z = ct.z; ring.visible = false; g.add(ring);
    const R = Math.max(sz.x, sz.z) * .62;
    const b = { g, solid, wire, wm, lights, glows, beat, delay, a: -1, bb, h: bb.max.y, shadow, pools, scan, scanTop, posts, sm, veil, ring, R, x, z };
    builds.push(b); return b;
  }
  const setBuild = (b, s) => {
    const a = clamp((s - (b.beat - .9) - b.delay) / .7);
    if (Math.abs(a - b.a) < 1e-4) return; b.a = a;
    b.solid.visible = a > .001; b.solid.scale.set(1, Math.max(.001, back(a)), 1);
    b.wm.uniforms.uC.value.setHex(a > .02 ? GOLD : ACC); b.wm.uniforms.uOp.value = a > .02 ? .12 + .7 * Math.sin(Math.PI * Math.min(1, a * 1.15)) * (1 - a * .8) : .3;
    const on = clamp((a - .7) / .3);
    b.lights.forEach(m => { m.emissiveIntensity = (m.userData.k || 1.5) * on; });
    b.glows.forEach(m => { m.visible = on > .01; });
    b.shadow.material.opacity = .62 * clamp(a * 2);
    b.pools.forEach(([m, k]) => { m.material.opacity = k * on; m.visible = on > .01; });
    const live = a > .004 && a < .996; b.scan.visible = live;
    if (live) { const y = b.h * back(a), k = Math.sin(Math.PI * a); b.scanTop.position.y = y; b.posts.scale.y = Math.max(.001, y); b.sm.opacity = k; b.veil.material.opacity = .32 * k; }
    const fl = clamp((a - .5) / .5), fk = Math.sin(Math.PI * fl);
    b.ring.visible = fk > .01; b.ring.scale.setScalar(b.R * (1 + fl * 1.8)); b.ring.material.opacity = fk * .55;
  };

  // 1. le premier casino (1988) : galerie d'arcades, marquise dorée, dôme
  building((s, L, G) => {
    const w = lit(4, 1.4); L.push(w);
    s.add(at(box(2.4, .55, 1.3, w), 0, 0, -.15));
    s.add(at(box(2.6, .08, 1.5, ivory()), 0, .55, -.15));
    const drum = new THREE.Mesh(new THREE.CylinderGeometry(.42, .46, .22, 40), ivory()); drum.position.set(0, .74, -.15); s.add(drum);
    for (let i = 0; i < 16; i++) { const a = i / 16 * Math.PI * 2, p = box(.03, .2, .03, ivory()); p.position.set(Math.cos(a) * .455, .63, -.15 + Math.sin(a) * .455); p.userData.noWire = true; s.add(p); }
    const dome = new THREE.Mesh(new THREE.SphereGeometry(.42, 40, 20, 0, Math.PI * 2, 0, Math.PI / 2), gold(.22)); dome.position.set(0, .85, -.15); s.add(dome);
    const lan = new THREE.Mesh(new THREE.CylinderGeometry(.05, .07, .16, 16), gold(.22)); lan.position.set(0, 1.32, -.15); s.add(lan);
    for (let i = 0; i < 9; i++) { const p = box(.08, .5, .08, ivory()); p.position.set(-1.1 + i * .275, 0, .58); s.add(p); }
    s.add(at(box(2.4, .07, .22, ivory()), 0, .5, .56));
    const canopy = box(.8, .03, .45, gold(.25)); canopy.position.set(0, .34, .78); s.add(canopy);
    const sign = new THREE.Mesh(new THREE.BoxGeometry(.6, .05, .01), glow(GOLD, 2.6)); sign.position.set(0, .47, .68); sign.userData.noWire = true; s.add(sign); G.push(sign);
    const door = new THREE.Mesh(new THREE.BoxGeometry(.5, .26, .01), glow(0xffb05a, 1.6)); door.position.set(0, .13, .51); door.userData.noWire = true; s.add(door); G.push(door);
    for (let k = 0; k < 3; k++) { const st = box(.9 + k * .16, .03, .12, ivory()); st.position.set(0, 0, .82 + k * .1); s.add(st); }
    units(s, [[-.95, -.6], [.95, -.6], [-.8, .3, .1, .1]], .63);
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
    [-.95, .95].forEach(x => s.add(at(box(.09, .2, .09, ivory()), x, 1.08, -.45)));
    const tam = new THREE.Mesh(new THREE.CircleGeometry(.09, 24), gold(.2)); tam.position.set(0, 1.0, .645); s.add(tam);
  }, -4.4, -1.6, 2, .0);

  // 2. l'hôtel : socle à jardin, tour à pilastres dorés, couronne, enseigne, équipements de toiture
  building((s, L, G) => {
    const w0 = lit(3, 1); L.push(w0);
    s.add(at(box(1.9, .45, 1.7, w0), 0, 0, 0));
    s.add(at(box(1.7, .025, .3, green()), 0, .45, .66));
    for (let i = 0; i < 6; i++) { const t = new THREE.Mesh(new THREE.IcosahedronGeometry(.055, 0), green()); t.position.set(-.75 + i * .3, .51, .66); t.userData.noWire = true; s.add(t); }
    const w = lit(3, 7); w.userData.k = 1.7; L.push(w);
    s.add(at(box(1.1, 2.3, 1.1, w), 0, .45, -.1));
    [[-1, -1], [1, -1], [1, 1], [-1, 1]].forEach(([a, c]) => { const p = box(.035, 2.3, .035, gold(.3)); p.position.set(a * .56, .45, -.1 + c * .56); p.userData.noWire = true; s.add(p); });
    s.add(at(box(1.2, .1, 1.2, gold(.25)), 0, 2.75, -.1));
    units(s, [[-.3, -.35], [.25, -.35], [-.3, .15]], 2.85);
    const tank = new THREE.Mesh(new THREE.CylinderGeometry(.09, .09, .16, 16), slate()); tank.position.set(.3, 2.93, .17); s.add(tank);
    const sign = new THREE.Mesh(new THREE.BoxGeometry(.7, .08, .01), glow(GOLD, 2.4)); sign.position.set(0, 2.62, .46); sign.userData.noWire = true; s.add(sign); G.push(sign);
    const door = new THREE.Mesh(new THREE.BoxGeometry(.45, .2, .01), glow(0xffb05a, 1.5)); door.position.set(0, .1, .855); door.userData.noWire = true; s.add(door); G.push(door);
  }, 3.9, -2.3, 2, .12);

  // 2. second casino, contemporain : façade courbe vitrée, toit doré planté
  building((s, L) => {
    const glass = flick(new THREE.MeshPhysicalMaterial({ color: 0x1b3554, metalness: .5, roughness: .12, clearcoat: 1, envMapIntensity: 1, emissive: 0xffc27a, emissiveIntensity: 0 }));
    const t = WIN.clone(); t.repeat.set(2, .3); t.needsUpdate = true; glass.emissiveMap = t; glass.userData.k = 1.2; L.push(glass);
    const g = new THREE.CylinderGeometry(1.15, 1.15, .75, 48, 1, false, -Math.PI / 2, Math.PI); g.translate(0, .375, 0);
    s.add(new THREE.Mesh(g, glass));
    s.add(at(box(2.3, .75, .5, ivory()), 0, 0, -.25));
    for (let i = 0; i < 13; i++) { const a = -Math.PI / 2 + i / 12 * Math.PI, m = box(.025, .75, .025, gold(.3)); m.position.set(Math.sin(a) * 1.16, 0, Math.cos(a) * 1.16); m.userData.noWire = true; s.add(m); }
    const r = new THREE.CylinderGeometry(1.22, 1.22, .07, 48, 1, false, -Math.PI / 2, Math.PI); r.translate(0, .785, 0); s.add(new THREE.Mesh(r, gold(.25)));
    s.add(at(box(2.44, .07, .56, gold(.25)), 0, .75, -.25));
    const gr = new THREE.CylinderGeometry(.95, .95, .03, 40, 1, false, -Math.PI / 2, Math.PI); gr.translate(0, .835, .05); const gm = new THREE.Mesh(gr, green()); gm.userData.noWire = true; s.add(gm);
    for (let i = 0; i < 7; i++) { const a = -1.2 + i * .4, tr = new THREE.Mesh(new THREE.IcosahedronGeometry(.07, 0), green()); tr.position.set(Math.sin(a) * .65, .9, .1 + Math.cos(a) * .55); tr.userData.noWire = true; s.add(tr); }
  }, -4, 2.9, 2, .24);

  // 5. le complexe de loisirs : grand socle, toiture en voûte, tour, salle de spectacle
  building((s, L, G) => {
    const w = lit(6, 1.2); L.push(w);
    s.add(at(box(3.4, .5, 2.1, w), 0, 0, 0));
    const vault = new THREE.Mesh(new THREE.CylinderGeometry(1, 1, 3.3, 48, 1, false, -Math.PI / 2, Math.PI), new THREE.MeshStandardMaterial({ color: 0x8f897e, roughness: .55, metalness: .25, envMapIntensity: .45 }));
    vault.rotation.z = Math.PI / 2; vault.scale.set(.55, 1, 1); vault.position.set(0, .5, 0); s.add(vault);
    for (let i = 0; i < 7; i++) { const rib = new THREE.Mesh(new THREE.TorusGeometry(1, .015, 6, 40, Math.PI), gold(.25)); rib.rotation.y = Math.PI / 2; rib.scale.set(1, .55, 1); rib.position.set(-1.5 + i * .5, .5, 0); s.add(rib); }
    const sky = new THREE.Mesh(new THREE.BoxGeometry(3.1, .012, .16), glow(0xffc27a, 1.2)); sky.position.set(0, 1.055, 0); sky.userData.noWire = true; s.add(sky); G.push(sky);
    const wt = lit(2, 5); wt.userData.k = 1.7; L.push(wt);
    s.add(at(box(.8, 1.8, .8, wt), 1.9, 0, -1.2));
    s.add(at(box(.86, .06, .86, gold(.25)), 1.9, 1.8, -1.2));
    units(s, [[1.75, -1.35], [2.05, -1.05]], 1.86);
    const hall = new THREE.Mesh(new THREE.CylinderGeometry(.62, .66, .7, 40), ivory()); hall.geometry.translate(0, .35, 0); hall.position.set(-2.1, 0, -1.1); s.add(hall);
    const hr = new THREE.Mesh(new THREE.TorusGeometry(.63, .025, 8, 48), gold(.2)); hr.rotation.x = Math.PI / 2; hr.position.set(-2.1, .72, -1.1); s.add(hr);
    const sign = new THREE.Mesh(new THREE.BoxGeometry(1.2, .06, .01), glow(GOLD, 2.2)); sign.position.set(0, .42, 1.06); sign.userData.noWire = true; s.add(sign); G.push(sign);
    const door = new THREE.Mesh(new THREE.BoxGeometry(.8, .22, .01), glow(0xffb05a, 1.5)); door.position.set(0, .11, 1.056); door.userData.noWire = true; s.add(door); G.push(door);
  }, 3.6, 3.2, 5);

  /* --- grues : treillis doré qui sort de terre pour les grands ouvrages, travaille, puis repart --- */
  const latMat = new THREE.LineBasicMaterial({ color: new THREE.Color(GOLD).multiplyScalar(.9), transparent: true, opacity: .85 });
  function crane(x, z, hgt, jib, beat, rot0) {
    const g = new THREE.Group(); g.position.set(x, 0, z); scene.add(g);
    const w = .11, mast = new THREE.Group(); g.add(mast);
    const C = [[-w / 2, -w / 2], [w / 2, -w / 2], [w / 2, w / 2], [-w / 2, w / 2]], v = [];
    C.forEach(([a, c]) => { const p = box(.013, hgt, .013, gold(.3)); p.position.set(a, 0, c); p.castShadow = true; mast.add(p); });
    for (let y = 0, k = 0; y < hgt - .01; y += w, k++) for (let i = 0; i < 4; i++) { const [a, c] = C[i], [e, f] = C[(i + 1) % 4]; v.push(a, y, c, e, y, f); if (k % 2) v.push(a, y, c, e, y + w, f); else v.push(e, y, f, a, y + w, c); }
    const mg = new THREE.BufferGeometry(); mg.setAttribute('position', new THREE.Float32BufferAttribute(v, 3)); mast.add(new THREE.LineSegments(mg, latMat));
    const head = new THREE.Group(); head.position.y = hgt; g.add(head);
    const jv = [], x0 = -jib * .36;
    for (let xx = x0, k = 0; xx < jib - .01; xx += w, k++) {
      const x1 = Math.min(jib, xx + w);
      jv.push(xx, 0, -w / 2, x1, 0, -w / 2, xx, 0, w / 2, x1, 0, w / 2, xx, w * .9, 0, x1, w * .9, 0, xx, 0, -w / 2, xx, 0, w / 2);
      jv.push(xx, 0, -w / 2, x1, w * .9, 0, xx, 0, w / 2, x1, w * .9, 0);
    }
    jv.push(0, 0, 0, 0, .4, 0, 0, .4, 0, jib * .62, w * .9, 0, 0, .4, 0, x0, w * .9, 0);
    const jg = new THREE.BufferGeometry(); jg.setAttribute('position', new THREE.Float32BufferAttribute(jv, 3)); head.add(new THREE.LineSegments(jg, latMat));
    const chord = box(jib - x0, .012, .012, gold(.3)); chord.geometry.translate(0, -.006, 0); chord.position.set((jib + x0) / 2, 0, 0); chord.castShadow = true; head.add(chord);
    head.add(at(box(.2, .1, .14, slate()), x0 + .12, -.1, 0));
    const cab = box(.1, .08, .1, ivory()); cab.position.set(.09, -.09, .08); head.add(cab);
    const red = new THREE.Mesh(new THREE.SphereGeometry(.022, 10, 8), glow(0xff2a2a, 3)); red.position.y = .42; head.add(red);
    const red2 = red.clone(); red2.position.set(jib, .03, 0); head.add(red2);
    const trolley = new THREE.Group(); head.add(trolley);
    trolley.add(at(box(.06, .03, .1, slate()), 0, -.03, 0));
    const cable = box(.004, 1, .004, new THREE.MeshBasicMaterial({ color: 0x9aa4b2 })); cable.geometry.translate(0, -1, 0); trolley.add(cable);
    const load = box(.28, .05, .1, gold(.3)); trolley.add(load);
    return { g, mast, head, trolley, cable, load, red: red.material, hgt, jib, beat, rot0 };
  }
  const cranes = [crane(5.25, -3.55, 3.7, 2.1, 1.5, -2.4), crane(1.35, 4.75, 2.7, 2.3, 4.5, .6)];
  const setCrane = (C, s, t) => {
    const up = ease(clamp((s - (C.beat - .7)) / .35)), go = ease(clamp((s - (C.beat + .1)) / .35)), k = up * (1 - go);
    C.g.visible = k > .002; if (!C.g.visible) return;
    C.mast.scale.y = Math.max(.001, k); C.head.position.y = C.hgt * k; C.head.scale.setScalar(Math.max(.001, ease(clamp(k * 1.3 - .3))));
    C.head.rotation.y = C.rot0 + (s - C.beat) * 1.6 + Math.sin(t * .25) * .12;
    const tx = C.jib * (.5 + .3 * Math.sin(s * 4.2)); C.trolley.position.x = tx;
    const L = C.hgt * (.45 + .25 * Math.sin(s * 3.1 + 1)); C.cable.scale.y = L; C.load.position.y = -L - .05;
    C.red.emissiveIntensity = (t % 1.6) < .18 ? 4 : .2;
  };

  // 6. parkings : grands plateaux tracés, voitures garées
  const lotTex = canvasTex(256, 256, (c, w, h) => { c.fillStyle = '#1f2d40'; c.fillRect(0, 0, w, h); c.strokeStyle = 'rgba(245,241,234,.55)'; c.lineWidth = 2; for (let r = 0; r < 4; r++) for (let i = 0; i <= 10; i++) { const y = 18 + r * 60; c.beginPath(); c.moveTo(14 + i * 22.8, y); c.lineTo(14 + i * 22.8, y + 34); c.stroke(); } });
  const lots = [[7.4, 3.3, 2.6, 2.6], [-7.3, -3, 2.6, 2.6], [-.2, 3.4, 3, 1.5]].map(([x, z, w, d], k) => {
    const m = flat(new THREE.PlaneGeometry(w, d), new THREE.MeshStandardMaterial({ map: lotTex, roughness: .8, transparent: true, opacity: 0 }), .006);
    m.position.set(x, .006, z); m.receiveShadow = true; scene.add(m);
    // éclairage du parking : quatre mâts et une nappe de lumière sodium
    const pool = flat(PLANE, add(0xffc88a, 0, { map: RAD }), .011); pool.position.set(x, .011, z); pool.scale.set(w * 1.5, d * 1.5, 1); scene.add(pool);
    return { m, pool, x, z, w, d, k };
  });
  const carGeo = new THREE.BoxGeometry(.19, .085, .1); carGeo.translate(0, .045, 0);
  const parked = new THREE.InstancedMesh(carGeo, new THREE.MeshStandardMaterial({ roughness: .4, metalness: .5 }), 90); parked.castShadow = true;
  const PAL = [0xe6e1d6, 0x3a4658, 0x9aa4b2, 0x8a1a22, 0x1c2a3c, 0xc8a35a].map(c => new THREE.Color(c));
  const slots = [];
  lots.forEach(L => { for (let r = 0; r < 4; r++) for (let i = 0; i < 10; i++) if (Math.random() < .62 && slots.length < 90) slots.push([L.x - L.w / 2 + (14 + i * 22.8 + 11) / 256 * L.w, L.z - L.d / 2 + (18 + r * 60 + 17) / 256 * L.d, L.k]); });
  slots.forEach((_, i) => parked.setColorAt(i, PAL[i % PAL.length]));
  parked.count = slots.length; scene.add(parked);

  // trafic : traînées de phares blancs dans un sens, feux rouges dans l'autre
  const dot = new THREE.SphereGeometry(.04, 10, 8);
  const mkFlow = (color, n) => { const m = new THREE.InstancedMesh(dot, add(color, 0), n); m.frustumCulled = false; scene.add(m); return m; };
  const heads = mkFlow(0xfff2d6, 40), tails = mkFlow(0xff3030, 40);
  const cars = Array.from({ length: 40 }, (_, i) => ({ o: Math.random(), v: .035 + Math.random() * .025, lane: i % 4 }));
  const beamsM = new THREE.InstancedMesh(PLANE, add(0xfff0c8, 0, { map: RAD }), 40); beamsM.frustumCulled = false; scene.add(beamsM);

  // réverbères et arbres le long de l'avenue
  const poles = [], trees = [];
  for (let x = -8.4; x <= 8.4; x += 1.4) {
    if (roadsX.some(([a, b]) => x > a - .3 && x < b + .3)) continue;
    poles.push([x, .2], [x + .7, 1.4]);
    if (Math.abs(x - .3) > 1.6) trees.push([x + .35, -.05], [x + 1.05, 1.62]);
  }
  for (let i = 0; i < 26; i++) { const x = -8.5 + Math.random() * 17, z = -5.5 + Math.random() * 3.2; if (Math.abs(x + 4.4) > 1.8 && Math.abs(x - 3.9) > 1.3 && Math.abs(x - 5.25) > .5 && Math.abs(x - .3) > 1.6 && Math.abs(x - -1.6) > .6) trees.push([x, z]); }
  for (let i = 0; i < 18; i++) { const x = -8.5 + Math.random() * 17, z = 4.7 + Math.random() * .9; if (Math.abs(x - 1.35) > .5) trees.push([x, z]); }
  const poleM = new THREE.InstancedMesh(new THREE.CylinderGeometry(.012, .016, .36, 6).translate(0, .18, 0), gold(.3), poles.length);
  const lampM = new THREE.InstancedMesh(new THREE.SphereGeometry(.035, 10, 8), glow(0xffd08a, 3), poles.length);
  const lampPool = new THREE.InstancedMesh(PLANE, add(0xffc074, .3, { map: RAD }), poles.length); lampPool.frustumCulled = false;
  const treeM = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(.17, 1).translate(0, .26, 0), new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: .95, metalness: 0, flatShading: true }), trees.length);
  treeM.castShadow = true; treeM.receiveShadow = true; poleM.castShadow = true; scene.add(poleM, lampM, lampPool, treeM);
  trees.forEach((_, i) => treeM.setColorAt(i, new THREE.Color().setHSL(.36 + (i % 7) * .012, .14 + (i % 3) * .04, .34 + (i % 5) * .02, THREE.SRGBColorSpace)));
  const mtx = new THREE.Matrix4(), q0 = new THREE.Quaternion(), qf = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), -Math.PI / 2), v3 = new THREE.Vector3(), sc = new THREE.Vector3();

  /* --- 7. acquisitions : plateaux satellites, en France et à l'international, reliés par des ponts de lumière --- */
  const sats = [[-12.6, -1.2, 3.8, -PW / 2, 3], [12.6, -1, -3.2, PW / 2, -2], [3, -1.1, -10, 2, -PD / 2]].map(([x, y, z, sx, sz], k) => {
    const g = new THREE.Group();
    const p = new THREE.Mesh(new THREE.BoxGeometry(3.4, .4, 2.6), plinth.material); p.position.y = -.2; p.receiveShadow = true; g.add(p);
    const e = new THREE.Mesh(new THREE.BoxGeometry(3.44, .03, 2.64), gold(.25)); e.position.y = -.015; g.add(e);
    const t = flat(new THREE.PlaneGeometry(3.4, 2.6), topMat, .003); g.add(t);
    const w = lit(3, 1.3); w.emissiveIntensity = 1.4;
    const b = box(1.6 - k * .2, .5 + k * .5, 1, w); b.castShadow = true; g.add(b);
    if (k === 0) { const d = new THREE.Mesh(new THREE.SphereGeometry(.32, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2), gold(.22)); d.position.y = .5; g.add(d); }
    else g.add(at(box(1.7 - k * .2, .07, 1.1, gold(.25)), 0, .5 + k * .5, 0));
    const pool = flat(PLANE, add(0xffa64d, .45, { map: RAD }), .01); pool.position.z = .9; pool.scale.set(2.6, 1.4, 1); g.add(pool);
    g.position.set(x * 1.6, y - 4, z * 1.6); scene.add(g);
    const end = new THREE.Vector3(x, y + .1, z), start = new THREE.Vector3(sx, 0, sz);
    const mid = start.clone().lerp(end, .5); mid.y += 2.4;
    const curve = new THREE.QuadraticBezierCurve3(start, mid, end);
    const tube = new THREE.Mesh(new THREE.TubeGeometry(curve, 64, .025, 8), add(GOLD, .9));
    tube.geometry.setDrawRange(0, 0); scene.add(tube);
    const pulses = [0, 1, 2].map(() => { const m = new THREE.Mesh(new THREE.SphereGeometry(.07, 12, 8), add(0xffe3a0, 0)); scene.add(m); return m; });
    return { g, x, y, z, tube, curve, pulses, n: tube.geometry.index.count, k };
  });

  /* --- 8. digitalisation : arcs bleus, paquets de données, colonnes montantes, anneaux et disque holographiques --- */
  const nodes = [[.3, 1.4, -1.35], [-4.4, 1.25, -1.6], [3.9, 2.9, -2.4], [-4, .9, 2.9], [3.6, 1.1, 3.2], [5.5, 1.9, 2]];
  const pairs = [[0, 1], [0, 2], [0, 3], [0, 4], [2, 4], [1, 3], [2, 5], [4, 5], [1, 2], [3, 4]];
  const netMat = add(0x6fb0ff, .85);
  const arcs = pairs.map(([i, j], k) => {
    const a = new THREE.Vector3(...nodes[i]), b = new THREE.Vector3(...nodes[j]), m = a.clone().lerp(b, .5); m.y += 1.4 + a.distanceTo(b) * .12;
    const curve = new THREE.QuadraticBezierCurve3(a, m, b);
    const tube = new THREE.Mesh(new THREE.TubeGeometry(curve, 48, .014, 6), netMat); tube.geometry.setDrawRange(0, 0); scene.add(tube);
    return { tube, curve, n: tube.geometry.index.count, k, dir: k % 2 ? -1 : 1 };
  });
  const PK = 3, TR = 4; // paquets par arc, points de traîne par paquet
  const packets = new THREE.InstancedMesh(new THREE.SphereGeometry(.04, 10, 8), add(0xcfe6ff, 0), arcs.length * PK * TR); packets.frustumCulled = false; scene.add(packets);
  const nodeHalo = new THREE.InstancedMesh(PLANE, add(0x6fb0ff, 0, { map: RAD }), nodes.length); nodeHalo.frustumCulled = false; scene.add(nodeHalo);
  const rise = cloud(nodes.length * (SM ? 6 : 14), pointsMat(0x8cc4ff, `float ph = fract(uT * .32 + aA * 9.); p.y += ph * 1.6; al = (1. - ph) * smoothstep(0., .12, ph);`), (i, P, S, A) => {
    const n = nodes[i % nodes.length]; P[i * 3] = n[0] + (Math.random() - .5) * .5; P[i * 3 + 1] = n[1] - .1; P[i * 3 + 2] = n[2] + (Math.random() - .5) * .5; S[i] = .05 + Math.random() * .04; A[i] = Math.random();
  });
  rise.material.uniforms.uOp.value = 0;
  const holo = new THREE.Group(); holo.position.set(.3, 1.6, -1.35); scene.add(holo);
  const rings = [.5, .72, .95].map((r, k) => { const m = new THREE.Mesh(new THREE.TorusGeometry(r, .008, 6, 96), add(0x7fb6ff, 0)); m.rotation.x = Math.PI / 2; m.position.y = k * .22; holo.add(m); return m; });
  const DISC = canvasTex(512, 512, (c, w, h) => {
    c.translate(w / 2, h / 2); c.strokeStyle = '#fff';
    [.98, .9, .62, .5].forEach((r, k) => { c.lineWidth = k % 2 ? 1.5 : 3; c.globalAlpha = k % 2 ? .5 : .9; c.beginPath(); c.arc(0, 0, r * w / 2, 0, Math.PI * 2); c.stroke(); });
    c.globalAlpha = .8;
    for (let i = 0; i < 120; i++) { const a = i / 120 * Math.PI * 2, r0 = (i % 10 ? .92 : .86) * w / 2; c.lineWidth = i % 10 ? 1 : 3; c.beginPath(); c.moveTo(Math.cos(a) * r0, Math.sin(a) * r0); c.lineTo(Math.cos(a) * .97 * w / 2, Math.sin(a) * .97 * w / 2); c.stroke(); }
    c.lineWidth = 6; c.globalAlpha = .7;
    for (let i = 0; i < 6; i++) { c.beginPath(); c.arc(0, 0, .76 * w / 2, i / 6 * Math.PI * 2, i / 6 * Math.PI * 2 + .6); c.stroke(); }
  });
  const disc = flat(PLANE, add(0x7fb6ff, 0, { map: DISC, side: THREE.DoubleSide }), -.12); disc.scale.setScalar(2.4); holo.add(disc);
  const beamG = new THREE.CylinderGeometry(.06, .28, 4, 24, 1, true); beamG.translate(0, 2, 0);
  const beam = new THREE.Mesh(beamG, add(0x7fb6ff, 0, { side: THREE.DoubleSide })); beam.position.set(.3, 1.35, -1.35); scene.add(beam);

  /* --- atmosphère : brume basse qui dérive, poussière dorée en suspension --- */
  const mistMat = op => new THREE.ShaderMaterial({
    uniforms: { uT: uTime, uOp: { value: op }, uC: { value: new THREE.Color(0x8ea9cf) }, uK: { value: 1 } },
    vertexShader: 'varying vec2 vP; varying float vD; void main(){ vP = position.xy; vec4 mv = modelViewMatrix * vec4(position, 1.); vD = -mv.z; gl_Position = projectionMatrix * mv; }',
    fragmentShader: `uniform float uT, uOp, uK; uniform vec3 uC; varying vec2 vP; varying float vD;
      float hs(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
      float no(vec2 p){ vec2 i = floor(p), f = fract(p); f = f * f * (3. - 2. * f); return mix(mix(hs(i), hs(i + vec2(1, 0)), f.x), mix(hs(i + vec2(0, 1)), hs(i + vec2(1, 1)), f.x), f.y); }
      void main(){
        vec2 p = vP * .32 + vec2(uT * .035, -uT * .022);
        float n = no(p) * .55 + no(p * 2.1 + vec2(-uT * .05, uT * .03)) * .3 + no(p * 4.3) * .15;
        n = smoothstep(.38, .82, n);
        float e = smoothstep(1.08, .55, length(vP / vec2(10.5, 7.2)));
        gl_FragColor = vec4(uC, n * e * uOp * uK * smoothstep(1.2, 6., vD));
      }`,
    transparent: true, depthWrite: false
  });
  const mists = (SM ? [[.07, .12]] : [[.06, .1], [.32, .055]]).map(([y, op]) => { const m = flat(new THREE.PlaneGeometry(34, 26), mistMat(op), y); m.renderOrder = 2; scene.add(m); return m; });
  const dust = cloud(SM ? 160 : 520, pointsMat(0xffdca8, `p.x += sin(uT * .11 + aA * 40.) * .45; p.z += cos(uT * .09 + aA * 31.) * .45; p.y = mod(p.y + uT * .04 * (.5 + aA), 4.6) + .05; al = aA * (.45 + .55 * sin(uT * 1.3 + aA * 90.) * sin(uT * .7 + aA * 13.));`), (i, P, S, A) => {
    P[i * 3] = (Math.random() - .5) * 21; P[i * 3 + 1] = Math.random() * 4.6; P[i * 3 + 2] = (Math.random() - .5) * 15; S[i] = .018 + Math.random() * .03; A[i] = .25 + Math.random() * .75;
  });

  // étincelles des chantiers (simulées sur le processeur, réserve circulaire)
  const NS = SM ? 160 : 420;
  const sparks = cloud(NS, pointsMat(0xffd27a), (i, P, S, A) => { S[i] = .025 + Math.random() * .035; A[i] = 0; });
  const sP = sparks.geometry.attributes.position, sA = sparks.geometry.attributes.aA, sV = new Float32Array(NS * 3), sL = new Float32Array(NS), sM = new Float32Array(NS).fill(1);
  let sHead = 0;
  const spawn = (b, n) => {
    const { min, max } = b.bb, y = b.h * back(b.a);
    for (let j = 0; j < n; j++) {
      const i = sHead; sHead = (sHead + 1) % NS;
      const side = Math.floor(Math.random() * 4), u = Math.random();
      let x, z, nx = 0, nz = 0;
      if (side === 0) { x = lerp(min.x, max.x, u); z = max.z + .06; nz = 1; } else if (side === 1) { x = lerp(min.x, max.x, u); z = min.z - .06; nz = -1; }
      else if (side === 2) { x = max.x + .06; z = lerp(min.z, max.z, u); nx = 1; } else { x = min.x - .06; z = lerp(min.z, max.z, u); nx = -1; }
      const sp = .25 + Math.random() * .7;
      sP.setXYZ(i, b.x + x, y, b.z + z);
      sV[i * 3] = nx * sp + (Math.random() - .5) * .4; sV[i * 3 + 1] = .2 + Math.random() * .9; sV[i * 3 + 2] = nz * sp + (Math.random() - .5) * .4;
      sL[i] = sM[i] = .45 + Math.random() * .7;
    }
  };
  const stepSparks = dt => {
    for (let i = 0; i < NS; i++) {
      if (sL[i] <= 0) { sA.array[i] = 0; continue; }
      sL[i] -= dt; sV[i * 3 + 1] -= 3.4 * dt;
      let x = sP.getX(i) + sV[i * 3] * dt, y = sP.getY(i) + sV[i * 3 + 1] * dt, z = sP.getZ(i) + sV[i * 3 + 2] * dt;
      if (y < .015) { y = .015; sV[i * 3 + 1] *= -.28; sV[i * 3] *= .5; sV[i * 3 + 2] *= .5; }
      sP.setXYZ(i, x, y, z); const k = clamp(sL[i] / sM[i]); sA.array[i] = k * k;
    }
    sP.needsUpdate = sA.needsUpdate = true;
  };

  /* --- rendu : MSAA, halo lumineux, bascule de netteté, étalonnage --- */
  const rt = new THREE.WebGLRenderTarget(1, 1, { samples: 4, type: THREE.HalfFloatType });
  const composer = new EffectComposer(renderer, rt);
  composer.addPass(new RenderPass(scene, camera));
  const bloom = new UnrealBloomPass(new THREE.Vector2(1, 1), .55, .55, .82); composer.addPass(bloom);
  const tilts = SM ? [] : [new ShaderPass(TILT), new ShaderPass(TILT)];
  if (tilts.length) { tilts[1].uniforms.uDir.value.set(0, 1); tilts.forEach(p => composer.addPass(p)); }
  composer.addPass(new OutputPass());
  const film = new ShaderPass(FILM); composer.addPass(film);

  let W = 1, H = 1;
  const size = () => {
    W = stage.clientWidth; H = stage.clientHeight;
    const dpr = renderer.getPixelRatio();
    renderer.setSize(W, H, false); composer.setSize(W, H);
    camera.aspect = W / H; camera.updateProjectionMatrix();
    PX.value = H * dpr * .5 / Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
    film.uniforms.uRes.value.set(W * dpr, H * dpr);
    tilts.forEach(p => p.uniforms.uRes.value.set(W * dpr, H * dpr));
  };
  size(); addEventListener('resize', size);

  /* --- défilement → récit --- */
  let sT = 0, sS = 0, visible = true, px = 0, py = 0, tpx = 0, tpy = 0, tPrev = 0;
  new IntersectionObserver(([e]) => { visible = e.isIntersecting; }, { rootMargin: '100px 0px' }).observe(root);
  addEventListener('pointermove', e => { tpx = e.clientX / innerWidth - .5; tpy = e.clientY / innerHeight - .5; });
  const hud = root.querySelector('.gm-hud b');
  const cp = new THREE.Vector3(), ct = new THREE.Vector3(), pa = new THREE.Vector3(), pb = new THREE.Vector3(), pc = new THREE.Vector3();
  const clock = new THREE.Clock();
  const hide = () => mtx.compose(v3.set(0, -50, 0), q0, sc.setScalar(.001));

  const frame = () => {
    requestAnimationFrame(frame);
    if (!visible) { clock.getDelta(); return; }
    const vh = innerHeight;
    sT = beats.reduce((acc, el) => acc + ease(clamp((vh * .82 - el.getBoundingClientRect().top) / (vh * .62))), 0);
    sS += (sT - sS) * .09;
    const s = sS, t = clock.getElapsedTime(), dt = Math.min(.05, t - tPrev); tPrev = t;
    uTime.value = t; REV.value = t * 7.5; HERO.value = clamp(1 - s * 1.6);
    root.style.setProperty('--gs', s.toFixed(3));
    root.style.setProperty('--gq', clamp(1 - Math.abs(s - 3) * 1.4).toFixed(3));
    hud.style.setProperty('--sp', (s / 8).toFixed(4));

    builds.forEach(b => setBuild(b, s));
    const q3 = clamp(1 - Math.abs(s - 3) * 1.2);
    builds.forEach(b => { if (b.a <= .02) b.wm.uniforms.uOp.value = .3 * (1 - q3); }); // au ras du sol, pas d'arêtes devant l'objectif
    builds.forEach(b => { if (b.scan.visible) { b.acc = (b.acc || 0) + dt * (SM ? 45 : 110) * Math.sin(Math.PI * b.a); const n = Math.floor(b.acc); b.acc -= n; if (n) spawn(b, n); } });
    stepSparks(dt);
    cranes.forEach(C => setCrane(C, s, t));
    dimMat.uniforms.uOp.value = HERO.value * .5;
    warm.forEach(({ l, b }) => { l.intensity = 5 * clamp(s - b + .3); });

    // arbres et réverbères : ceux près du premier casino d'abord, les autres avec le complexe
    const grow = (x, z, k0) => { const near = Math.hypot(x - .3, z + .6); return back(clamp((s - k0 - near * .05) / .6)); };
    poles.forEach(([x, z], i) => {
      const k = grow(x, z, .35); sc.set(1, Math.max(.001, k), 1); mtx.compose(v3.set(x, 0, z), q0, sc); poleM.setMatrixAt(i, mtx);
      mtx.compose(v3.set(x, .36 * k, z), q0, sc.setScalar(Math.max(.001, k))); lampM.setMatrixAt(i, mtx);
      mtx.compose(v3.set(x, .008, z), qf, sc.setScalar(Math.max(.001, clamp(k) * .75))); lampPool.setMatrixAt(i, mtx);
    });
    trees.forEach(([x, z], i) => { const k = grow(x, z, Math.abs(z) > 3 ? 4.3 : 1.1); mtx.compose(v3.set(x, 0, z), q0, sc.setScalar(Math.max(.001, k) * (.8 + (i % 5) * .08))); treeM.setMatrixAt(i, mtx); });
    poleM.instanceMatrix.needsUpdate = lampM.instanceMatrix.needsUpdate = lampPool.instanceMatrix.needsUpdate = treeM.instanceMatrix.needsUpdate = true;

    // parkings et trafic
    const pk = clamp(s - 5.15);
    lots.forEach(L => { const o = clamp(pk * 1.6 - L.k * .2); L.m.material.opacity = o; L.pool.material.opacity = o * .22; });
    slots.forEach(([x, z, k], i) => { const a = back(clamp(pk * 2.2 - .4 - k * .25 - (i % 7) * .04)); mtx.compose(v3.set(x, (1 - Math.min(1, a)) * .8, z), q0, sc.setScalar(Math.max(.001, a))); parked.setMatrixAt(i, mtx); });
    parked.instanceMatrix.needsUpdate = true;
    const tf = clamp((s - 5.4) * 1.5);
    heads.material.opacity = tails.material.opacity = tf; beamsM.material.opacity = tf * .32;
    cars.forEach((c, i) => {
      const u = ((c.o + t * c.v) % 1), lane = c.lane, along = lane < 2;
      let x, z, dir;
      if (along) { dir = lane ? 1 : -1; x = lane ? -PW / 2 + u * PW : PW / 2 - u * PW; z = lane ? .58 : 1.02; }
      else { const R = roadsX[lane - 2]; dir = i % 2 ? 1 : -1; x = (R[0] + R[1]) / 2 + (i % 2 ? .14 : -.14); z = (i % 2 ? -1 : 1) * (PD / 2 - u * PD); }
      const isHead = lane === 1 || (lane > 1 && i % 2), fade = clamp(Math.min(u, 1 - u) * 12);
      sc.set(along ? 2.6 * fade : fade, fade * .8, along ? fade : 2.6 * fade);
      mtx.compose(v3.set(x, .06, z), q0, sc); (isHead ? heads : tails).setMatrixAt(i, mtx);
      hide(); (isHead ? tails : heads).setMatrixAt(i, mtx);
      // nappe des phares devant le véhicule
      if (isHead) { const ox = along ? dir * .3 : 0, oz = along ? 0 : -dir * .3; mtx.compose(v3.set(x + ox, .012, z + oz), qf, sc.set(along ? .7 : .3, along ? .3 : .7, 1)); }
      else hide();
      beamsM.setMatrixAt(i, mtx);
    });
    heads.instanceMatrix.needsUpdate = tails.instanceMatrix.needsUpdate = beamsM.instanceMatrix.needsUpdate = true;

    // satellites
    sats.forEach(S => {
      const a = ease(clamp((s - 6.2 - S.k * .18) / .7));
      S.g.position.set(S.x * (1.6 - .6 * a), S.y - 4 * (1 - a), S.z * (1.6 - .6 * a));
      S.g.visible = a > .001;
      const d = clamp((s - 6.6 - S.k * .18) / .5);
      S.tube.geometry.setDrawRange(0, Math.floor(S.n * d / 3) * 3);
      S.pulses.forEach((p, j) => { p.material.opacity = d >= 1 ? .9 : 0; if (d >= 1) p.position.copy(S.curve.getPoint((t * .3 + S.k / 3 + j / 3) % 1)); });
    });

    // réseau numérique : arcs, paquets avec traîne, colonnes de données, ondes au sol
    const dg = clamp(s - 7.2);
    topMat.emissiveIntensity = .16 + dg * .55 + (s < .5 ? .1 * (1 - s * 2) : 0);
    gridMat.uniforms.uDig.value = dg;
    packets.material.opacity = dg; rise.material.uniforms.uOp.value = dg; nodeHalo.material.opacity = dg * .55;
    arcs.forEach(A => {
      const d = clamp(dg * 1.8 - A.k * .07);
      A.tube.geometry.setDrawRange(0, Math.floor(A.n * d / 3) * 3);
      for (let j = 0; j < PK; j++) for (let m = 0; m < TR; m++) {
        const idx = (A.k * PK + j) * TR + m;
        let u = (t * (.28 + (A.k % 3) * .05) + A.k * .13 + j / PK) % 1; if (A.dir < 0) u = 1 - u;
        u -= A.dir * m * .018;
        if (d < 1 || u < 0 || u > 1) { hide(); packets.setMatrixAt(idx, mtx); continue; }
        A.curve.getPoint(u, pc); mtx.compose(pc, q0, sc.setScalar(1 - m * .22)); packets.setMatrixAt(idx, mtx);
      }
    });
    packets.instanceMatrix.needsUpdate = true;
    nodes.forEach(([x, y, z], i) => { mtx.compose(v3.set(x, y - .02, z), qf, sc.setScalar(dg > .001 ? .9 + .15 * Math.sin(t * 2 + i) : .001)); nodeHalo.setMatrixAt(i, mtx); });
    nodeHalo.instanceMatrix.needsUpdate = true;
    rings.forEach((r, k) => { r.material.opacity = dg * (.75 - k * .15); r.rotation.z = t * (.4 + k * .25) * (k % 2 ? -1 : 1); r.scale.setScalar(1 + Math.sin(t * 1.4 + k) * .04); });
    disc.material.opacity = dg * .55; disc.rotation.z = -t * .15;
    beam.material.opacity = dg * .12;

    // atmosphère : brume plus présente au ras du sol, poussière plus visible de près
    mists.forEach(m => { m.material.uniforms.uK.value = .75 + .5 * clamp(1 - Math.abs(s - 3)) + .3 * HERO.value; });
    dust.material.uniforms.uOp.value = .55 + .35 * clamp(1 - Math.abs(s - 3)) - .25 * HERO.value;

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

    // bascule de netteté : plus marquée au ras du sol (citation), douce en vue large
    tilts.forEach(p => { p.uniforms.uMax.value = 2 + q3 * 2.2; p.uniforms.uBand.value = .2 - q3 * .06; });
    film.uniforms.uT.value = t;

    composer.render();
  };
  requestAnimationFrame(frame);
}
