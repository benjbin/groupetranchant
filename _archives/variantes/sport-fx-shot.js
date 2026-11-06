/* Groupe Tranchant — activités sportives (accueil) : effet du panneau SHOOTING CLUBS.
   Contrat : mount(pane, { reduceMotion }) ; pane est le lien .sp-pane (photo .sp-img, canvas .sp-fx par-dessus).

   Ball-trap en vrai 3D (three.js, un seul contexte WebGL, canvas transparent sur la photo) :
   - plateaux modélisés au tour (dôme, jonc, rainures d'épaulement, jupe, dessous creux), rotation gyroscopique
     avec nutation et dévers progressif ;
   - balistique réelle : traînée et portance fonction de l'incidence (modèle de disque volant), gravité ;
   - les plateaux passent DERRIÈRE le rack, les tubes et la clôture de la photo (masque de profondeur tiré de l'image) ;
   - tir au clic : gerbe de plombs dans un cône, touché ou raté selon la visée, éclatement en éclats 3D,
     poussière orange éclairée, petit recul, lueur de bouche et micro-secousse ;
   - sans pointeur, un tireur fantôme suit les plateaux avec avance et tire de façon crédible. */
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

/* ---------- Masque des avant-plans de la photo (rack, poteaux, tubes, clôture, sol), 1/4 de résolution, RLE ---------- */
const MASK = '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';
const MW = 408, MH = 215, NW = 1632, NH = 861;
function decodeMask() {
  const bytes = Uint8Array.from(atob(MASK), c => c.charCodeAt(0)), out = new Uint8Array(MW * MH);
  let k = 0;
  for (let y = 0; y < MH; y++) {
    let x = 0, v = 0;
    while (x < MW && k < bytes.length) { const n = bytes[k++]; if (v) out.fill(255, y * MW + x, y * MW + x + n); x += n; v ^= 1; }
  }
  return out;
}

/* ---------- Constantes physiques ---------- */
const G = 9.81, RHO_A_M = 0.5 * 1.2 * 0.0095 / 0.105;   // ½ρA/m d'un plateau de 110 mm, 105 g
const CL0 = 0.12, CLA = 1.4, CD0 = 0.24, CDA = 2.4;       // portance / traînée en fonction de l'incidence
const RW = 0.21;                                          // rayon affiché (plateau légèrement grossi, effet téléobjectif)
const TS0 = 0.56;                                         // ralenti cinéma global
const FOV = 30, CAM_Y = 1.6, PITCH = 9;
const UP = new THREE.Vector3(0, 1, 0);

/* ---------- Géométrie du plateau : profil fermé (dessus → jupe → dessous creux) ---------- */
function clayProfile() {
  const top = [], P = [];
  const t = (r, y, s) => top.push([r, y, s]);
  t(0.0001, .445, 1); t(.18, .448, 1); t(.34, .444, 1); t(.41, .438, 1);
  t(.44, .44, 1); t(.455, .462, 1); t(.475, .466, 1); t(.492, .45, 1); t(.505, .425, 1);   // jonc autour du dôme
  for (let i = 0; i <= 30; i++) {                                                          // épaulement rainuré
    const u = i / 30, r = .51 + u * .39;
    t(r, .418 - u * .255 + Math.sin(u * Math.PI * 12) * .007 * (u < .93 ? 1 : 0), .97);
  }
  t(.935, .152, .9); t(.968, .135, .86); t(.99, .1, .8); t(1, .055, .74); t(.993, .018, .62); t(.972, 0, .5);   // jupe
  const bot = [];
  bot.push([.945, .006, .66], [.925, .045, .7], [.89, .1, .72]);
  for (let i = 1; i <= 10; i++) { const u = i / 10; bot.push([.89 - u * .43, .1 + u * .255, .74 + u * .04]); }
  bot.push([.4, .37, .78], [.25, .383, .78], [0.0001, .388, .78]);
  // ordre : dessous du centre vers la jupe puis dessus vers le centre (normales extérieures pour LatheGeometry)
  for (let i = bot.length - 1; i >= 0; i--) P.push(bot[i]);
  for (let i = top.length - 1; i >= 0; i--) P.push(top[i]);
  return P;
}
function latheWithShade(prof, seg, phi0, phiLen, jag) {
  const g = new THREE.LatheGeometry(prof.map(p => new THREE.Vector2(p[0], p[1] - .23)), seg, phi0, phiLen);
  const n = prof.length, pos = g.attributes.position, col = new Float32Array(pos.count * 3);
  for (let i = 0; i <= seg; i++) for (let j = 0; j < n; j++) {
    const k = i * n + j, s = prof[j][2];
    col[k * 3] = s; col[k * 3 + 1] = s; col[k * 3 + 2] = s;
    if (jag && (i === 0 || i === seg)) {   // bord de cassure irrégulier
      const a = (Math.sin(j * 1.9 + jag) * .5 + Math.sin(j * .7 + jag * 3) * .5) * .16 * (i ? -1 : 1);
      const x = pos.getX(k), z = pos.getZ(k), c = Math.cos(a), sn = Math.sin(a);
      pos.setXYZ(k, x * c - z * sn, pos.getY(k), x * sn + z * c);
    }
  }
  g.setAttribute('color', new THREE.BufferAttribute(col, 3));
  if (jag) g.computeVertexNormals();
  return g;
}
/* texture de tachetures étirées dans le sens de rotation : rend la giration lisible (flou de vitesse) */
function streakTexture() {
  const c = document.createElement('canvas'); c.width = 512; c.height = 128;
  const x = c.getContext('2d');
  x.fillStyle = '#fff'; x.fillRect(0, 0, 512, 128);
  for (let i = 0; i < 520; i++) {
    const y = 10 + Math.random() * 100, w = 4 + Math.random() ** 2 * 90, a = .05 + Math.random() * .16;
    x.fillStyle = Math.random() < .8 ? `rgba(90,28,8,${a})` : `rgba(255,236,220,${a * 1.4})`;
    x.fillRect(Math.random() * 512, y, w, .6 + Math.random() * 1.6);
  }
  const t = new THREE.CanvasTexture(c); t.wrapS = THREE.RepeatWrapping; t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
  return t;
}

/* ---------- Viseur : point rouge dans un anneau qui matérialise la gerbe ---------- */
const reticle = r => {
  const s = r + 14, tk = (a) => { const c = Math.cos(a), n = Math.sin(a); return `<line x1="${c * (r + 3)}" y1="${n * (r + 3)}" x2="${c * (r + 9)}" y2="${n * (r + 9)}"/>`; };
  const arc = (a0, a1) => `<path d="M${Math.cos(a0) * r} ${Math.sin(a0) * r}A${r} ${r} 0 0 1 ${Math.cos(a1) * r} ${Math.sin(a1) * r}"/>`;
  const g = .2, arcs = [0, 1, 2, 3].map(q => arc(q * Math.PI / 2 + g, (q + 1) * Math.PI / 2 - g)).join('');
  return `<svg viewBox="${-s} ${-s} ${2 * s} ${2 * s}" width="${2 * s}" height="${2 * s}" style="left:${-s}px;top:${-s}px">
  <g class="rk"><g fill="none" stroke="rgba(11,27,46,.38)" stroke-width="3.2" stroke-linecap="round">${arcs}${[0, 1, 2, 3].map(q => tk(q * Math.PI / 2)).join('')}</g>
  <g class="ring" fill="none" stroke="#F5F1EA" stroke-width="1.25" stroke-linecap="round">${arcs}${[0, 1, 2, 3].map(q => tk(q * Math.PI / 2)).join('')}</g>
  <circle class="pulse" r="${r}" fill="none" stroke="#F5F1EA" stroke-width="1"/>
  <circle r="6.5" fill="rgba(186,38,55,.22)"/><circle class="dot" r="2.3" fill="#BA2637"/><circle r=".9" fill="#FFE3DA"/></g></svg>`;
};
const CSS = `
.sp-shot .sp-cross::before{display:none}
.sp-shot .sp-cross svg,.sp-shot .shot-ghost svg{position:absolute;overflow:visible;filter:drop-shadow(0 0 6px rgba(186,38,55,.25))}
.sp-shot .sp-cross.off{opacity:0!important}
.sp-shot .sp-txt{cursor:pointer}
.sp-shot .shot-ghost{position:absolute;left:0;top:0;z-index:3;width:0;height:0;pointer-events:none;opacity:0;transition:opacity .6s}
.sp-shot .shot-ghost.on{opacity:.62}
.sp-shot .rk{transform-box:fill-box;transform-origin:center}
.sp-shot .kick .rk{animation:spShotKick .46s cubic-bezier(.2,.75,.25,1)}
.sp-shot .pulse{opacity:0;transform-box:fill-box;transform-origin:center}
.sp-shot .kick .pulse{animation:spShotPulse .5s ease-out}
.sp-shot .hit .ring{stroke:#F9C83B;transition:stroke 0s}
.sp-shot .ring{transition:stroke .5s}
.sp-shot .shot-flash{position:absolute;inset:0;z-index:1;pointer-events:none;opacity:0;mix-blend-mode:screen;
  background:radial-gradient(90% 55% at 74% 108%,rgba(249,200,59,.5),rgba(242,86,42,.14) 40%,transparent 66%)}
@keyframes spShotKick{0%{transform:none}14%{transform:translate(3px,-11px) rotate(-6deg) scale(1.05)}42%{transform:translate(-1px,2px) rotate(1.5deg)}100%{transform:none}}
@keyframes spShotPulse{0%{opacity:.7;transform:scale(.6)}100%{opacity:0;transform:scale(1.9)}}`;

/* ---------- Particules : poussière (sprites sphériques éclairés) et grenaille d'éclats ---------- */
const DUST_VS = `
uniform float uScale, uDpr;
attribute float aSize, aAlpha, aKind, aSeed; attribute vec3 aColor;
varying float vA, vK, vS; varying vec3 vC;
void main(){
  vec4 mv = modelViewMatrix * vec4(position, 1.); gl_Position = projectionMatrix * mv;
  float s = aSize * uScale / max(.1, -mv.z);
  gl_PointSize = aKind > .5 ? max(s, 1.6 * uDpr) : s;
  if (aAlpha <= 0.) gl_PointSize = 0.;
  vA = aAlpha; vK = aKind; vC = aColor; vS = aSeed;
}`;
const DUST_FS = `
varying float vA, vK, vS; varying vec3 vC;
void main(){
  vec2 p = gl_PointCoord * 2. - 1.; p.y = -p.y; float r2 = dot(p, p);
  if (r2 > 1.) discard;
  if (vK > .5) { float a = vA * smoothstep(1., .45, r2); gl_FragColor = vec4(vC * a, a); return; }
  float an = atan(p.y, p.x);
  float lump = 1. + .16 * sin(an * 3. + vS * 6.28) + .09 * sin(an * 5. - vS * 11.) + .05 * sin(an * 9. + vS * 3.);
  float rr = r2 * lump * lump; if (rr > 1.) discard;
  vec3 n = vec3(p, sqrt(max(0., 1. - r2)));
  float l = .66 + .44 * max(0., dot(n, normalize(vec3(-.55, .6, .55))));
  float a = vA * pow(1. - rr, 1.7);
  gl_FragColor = vec4(vC * l * a, a);
}`;
const OCC_VS = `uniform float uDepth; void main(){ gl_Position = vec4(position.xy, uDepth, 1.); }`;
const OCC_FS = `
uniform sampler2D uMask; uniform vec4 uImg; uniform vec2 uView; uniform float uDpr;
void main(){
  vec2 c = vec2(gl_FragCoord.x / uDpr, uView.y - gl_FragCoord.y / uDpr);
  vec2 uv = (c - uImg.xy) / uImg.zw;
  if (uv.x < 0. || uv.x > 1. || uv.y < 0. || uv.y > 1.) discard;
  if (texture2D(uMask, uv).r < .5) discard;
  gl_FragColor = vec4(0.);
}`;

export function mount(pane, { reduceMotion }) {
  const cv = pane.querySelector('.sp-fx'), fig = pane.querySelector('.sp-img'), img = fig && fig.querySelector('img');
  if (!cv) return;
  let renderer;
  try { renderer = new THREE.WebGLRenderer({ canvas: cv, alpha: true, antialias: true, powerPreference: 'high-performance' }); }
  catch (e) { return; }

  // RNG : déterministe pour l'image fixe
  let seed = 7;
  const rnd = reduceMotion ? () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; } : Math.random;
  const R = (a, b) => a + (b - a) * rnd();

  if (!document.getElementById('sp-shot-css')) { const st = document.createElement('style'); st.id = 'sp-shot-css'; st.textContent = CSS; document.head.appendChild(st); }

  renderer.setClearColor(0x000000, 0);
  renderer.toneMapping = THREE.NeutralToneMapping; renderer.toneMappingExposure = 1.05;
  const scene = new THREE.Scene(), camera = new THREE.PerspectiveCamera(FOV, 1, .25, 400);
  camera.position.set(0, CAM_Y, 0); camera.rotation.set(THREE.MathUtils.degToRad(PITCH), 0, 0);
  const pmrem = new THREE.PMREMGenerator(renderer), envRT = pmrem.fromScene(new RoomEnvironment(), .04);
  scene.environment = envRT.texture; scene.environmentIntensity = .32; pmrem.dispose();
  scene.add(new THREE.HemisphereLight(0xdce9f8, 0x9a7a5c, 1.6));
  const sun = new THREE.DirectionalLight(0xfff0dc, 2.9); sun.position.set(-7, 9, 5); scene.add(sun);
  const rim = new THREE.DirectionalLight(0xbcd3f0, .9); rim.position.set(4, 2, -10); scene.add(rim);

  /* --- masque d'avant-plan --- */
  const maskData = decodeMask();
  const maskTex = new THREE.DataTexture(maskData, MW, MH, THREE.RedFormat, THREE.UnsignedByteType);
  maskTex.minFilter = maskTex.magFilter = THREE.LinearFilter; maskTex.needsUpdate = true;
  const occU = { uMask: { value: maskTex }, uImg: { value: new THREE.Vector4(0, 0, 1, 1) }, uView: { value: new THREE.Vector2(1, 1) }, uDpr: { value: 1 }, uDepth: { value: .9 } };
  const occ = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), new THREE.ShaderMaterial({ uniforms: occU, vertexShader: OCC_VS, fragmentShader: OCC_FS, colorWrite: false }));
  occ.frustumCulled = false; occ.renderOrder = -10; scene.add(occ);
  { // profondeur NDC d'un plan à 4 m : le rack est au premier plan, tout plateau passe derrière
    const v = new THREE.Vector4(0, 0, -4, 1).applyMatrix4(camera.projectionMatrix); occU.uDepth.value = v.z / v.w;
  }
  const masked = (cx, cy) => { // en px CSS du panneau
    const u = occU.uImg.value, ix = (cx - u.x) / u.z * MW, iy = (cy - u.y) / u.w * MH;
    if (ix < 0 || iy < 0 || ix >= MW || iy >= MH) return false;
    return maskData[(iy | 0) * MW + (ix | 0)] > 127;
  };

  /* --- matériaux et géométries --- */
  const tex = streakTexture();
  const clayMat = new THREE.MeshStandardMaterial({ color: '#F2562A', map: tex, vertexColors: true, roughness: .56, metalness: 0, emissive: '#F2562A', emissiveIntensity: .2 });
  const fragMat = clayMat.clone(); fragMat.side = THREE.DoubleSide;
  const PROF = clayProfile(), clayGeo = latheWithShade(PROF, 72, 0, Math.PI * 2, 0);
  const NP = PROF.length, iRim = PROF.findIndex(p => p[1] < .02 && p[0] > .96);
  const fragGeos = [];
  for (let k = 0; k < 30; k++) {
    let a, b, len;
    if (k < 8) { a = 0; b = NP; len = R(.9, 1.9); }                                        // gros quartier complet
    else if (k < 18) { a = Math.max(0, iRim - R(8, 16) | 0); b = Math.min(NP, iRim + R(10, 26) | 0); len = R(.45, 1); }   // morceau de jupe
    else { const c = R(4, NP - 8) | 0; a = c; b = Math.min(NP, c + (R(5, 11) | 0)); len = R(.18, .45); }                    // éclat
    const sub = PROF.slice(a, b);
    const g = latheWithShade(sub, Math.max(2, Math.ceil(len * 14)), R(0, 6.28), len, R(1, 9));
    g.computeBoundingBox(); const c = g.boundingBox.getCenter(new THREE.Vector3());
    g.translate(-c.x, -c.y, -c.z);
    fragGeos.push({ g, c, big: k < 8, mid: k >= 8 && k < 18 });
  }

  /* --- plateaux --- */
  const clays = [];
  for (let i = 0; i < 4; i++) {
    const g = new THREE.Group(), m = new THREE.Mesh(clayGeo, clayMat);
    m.scale.setScalar(RW); g.add(m); g.visible = false; scene.add(g);
    clays.push({ g, m, p: new THREE.Vector3(), v: new THREE.Vector3(), axis: new THREE.Vector3(), roll: 0, spin: 0, age: 0, alive: false, fireAge: 1, plan: 'hit', wob: 0 });
  }
  /* --- éclats --- */
  const frags = [];
  for (let i = 0; i < 44; i++) { const m = new THREE.Mesh(fragGeos[0].g, fragMat); m.visible = false; m.frustumCulled = false; scene.add(m); frags.push({ m, v: new THREE.Vector3(), w: new THREE.Vector3(), age: 0, life: 0, k: 0, s: RW }); }
  let fragHead = 0;

  /* --- poussière --- */
  const N = 2600;
  const pPos = new Float32Array(N * 3), pVel = new Float32Array(N * 3), pCol = new Float32Array(N * 3);
  const pSize = new Float32Array(N), pAlpha = new Float32Array(N), pKind = new Float32Array(N), pSeed = new Float32Array(N);
  const pAge = new Float32Array(N), pLife = new Float32Array(N), pS0 = new Float32Array(N), pS1 = new Float32Array(N), pA0 = new Float32Array(N), pGrav = new Float32Array(N), pDrag = new Float32Array(N);
  for (let i = 0; i < N; i++) pSeed[i] = Math.random();
  const dGeo = new THREE.BufferGeometry();
  const at = (name, arr, n) => { const a = new THREE.BufferAttribute(arr, n); a.setUsage(THREE.DynamicDrawUsage); dGeo.setAttribute(name, a); return a; };
  const aPos = at('position', pPos, 3), aSize = at('aSize', pSize, 1), aAlpha = at('aAlpha', pAlpha, 1), aCol = at('aColor', pCol, 3), aKind = at('aKind', pKind, 1);
  dGeo.setAttribute('aSeed', new THREE.BufferAttribute(pSeed, 1));
  const dU = { uScale: { value: 1 }, uDpr: { value: 1 } };
  const dust = new THREE.Points(dGeo, new THREE.ShaderMaterial({
    uniforms: dU, vertexShader: DUST_VS, fragmentShader: DUST_FS, transparent: true, depthWrite: false,
    blending: THREE.CustomBlending, blendSrc: THREE.OneFactor, blendDst: THREE.OneMinusSrcAlphaFactor, blendSrcAlpha: THREE.OneFactor, blendDstAlpha: THREE.OneMinusSrcAlphaFactor
  }));
  dust.frustumCulled = false; dust.renderOrder = 5; scene.add(dust);
  let pHead = 0, pLive = 0;
  const emit = (x, y, z, vx, vy, vz, o) => {
    const i = pHead; pHead = (pHead + 1) % N;
    pPos[i * 3] = x; pPos[i * 3 + 1] = y; pPos[i * 3 + 2] = z; pVel[i * 3] = vx; pVel[i * 3 + 1] = vy; pVel[i * 3 + 2] = vz;
    pCol[i * 3] = o.c[0]; pCol[i * 3 + 1] = o.c[1]; pCol[i * 3 + 2] = o.c[2];
    pKind[i] = o.k; pAge[i] = 0; pLife[i] = o.life; pS0[i] = o.s0; pS1[i] = o.s1; pA0[i] = o.a; pGrav[i] = o.g; pDrag[i] = o.d;
    pSize[i] = o.s0; pAlpha[i] = 0;
  };


  /* --- DOM : viseur, viseur fantôme, lueur de bouche --- */
  const cross = pane.querySelector('.sp-cross');
  const ghost = document.createElement('i'); ghost.className = 'shot-ghost'; ghost.setAttribute('aria-hidden', 'true');
  const flash = document.createElement('i'); flash.className = 'shot-flash'; flash.setAttribute('aria-hidden', 'true');
  cv.after(flash); (cross || flash).after(ghost);

  /* --- état de vue --- */
  const st = { w: 1, h: 1, dpr: 1, focal: 1, pr: 30, on: false, raf: 0, last: 0, ts: 1, bt: 0, shake: 0, shakeAmp: 0, flash: 0, dirty: true };
  let prBuilt = 0;
  const buildReticles = () => {
    const r = Math.round(st.pr); if (r === prBuilt) return; prBuilt = r;
    if (cross) cross.innerHTML = reticle(r); ghost.innerHTML = reticle(r);
  };
  const updateImgRect = () => {
    if (!img) return;
    const pb = pane.getBoundingClientRect(), ib = img.getBoundingClientRect();
    const nw = img.naturalWidth || NW, nh = img.naturalHeight || NH, s = Math.max(ib.width / nw, ib.height / nh);
    const w = nw * s, h = nh * s, u = occU.uImg.value;
    // la toile est translatée avec la photo lors de la secousse : on reste en coordonnées du panneau
    u.set(ib.left - pb.left + (ib.width - w) / 2, ib.top - pb.top + (ib.height - h) / 2, w, h);
  };
  const resize = () => {
    const w = cv.clientWidth || pane.clientWidth, h = cv.clientHeight || pane.clientHeight; if (!w || !h) return;
    st.w = w; st.h = h; st.dpr = Math.min(devicePixelRatio || 1, 2);
    renderer.setPixelRatio(st.dpr); renderer.setSize(w, h, false);
    camera.aspect = w / h; camera.updateProjectionMatrix();
    st.focal = h / (2 * Math.tan(THREE.MathUtils.degToRad(FOV / 2)));
    st.pr = Math.max(22, Math.min(38, Math.min(w, h) * .046));
    dU.uScale.value = st.focal * st.dpr; dU.uDpr.value = st.dpr;
    occU.uView.value.set(w, h); occU.uDpr.value = st.dpr;
    updateImgRect(); buildReticles(); rest = findFree(.3, .32); st.dirty = true;
    if (reduceMotion) renderStill();
  };

  /* ---------- outils de projection ---------- */
  const _v = new THREE.Vector3(), _q = new THREE.Quaternion(), _q2 = new THREE.Quaternion();
  const toScreen = (p, out) => { _v.copy(p).project(camera); out.x = (_v.x + 1) / 2 * st.w; out.y = (1 - _v.y) / 2 * st.h; out.z = _v.z; return out; };
  const rayDir = (x, y, out) => out.set(x / st.w * 2 - 1, 1 - y / st.h * 2, .5).unproject(camera).sub(camera.position).normalize();

  /* ---------- balistique ---------- */
  const _a = new THREE.Vector3(), _vh = new THREE.Vector3(), _l = new THREE.Vector3();
  const physStep = (c, dt) => {
    const sp = c.v.length(); _vh.copy(c.v).divideScalar(sp || 1);
    const dn = c.axis.dot(_vh), alpha = -Math.asin(Math.max(-1, Math.min(1, dn)));
    const cl = Math.max(-.6, Math.min(1.1, CL0 + CLA * alpha)), cd = CD0 + CDA * alpha * alpha;
    _l.copy(c.axis).addScaledVector(_vh, -dn); const ll = _l.length();
    _a.set(0, -G, 0).addScaledVector(_vh, -RHO_A_M * cd * sp * sp);
    if (ll > 1e-4) _a.addScaledVector(_l, RHO_A_M * cl * sp * sp / ll);
    c.v.addScaledVector(_a, dt); c.p.addScaledVector(c.v, dt);
    // dévers gyroscopique : l'axe tourne lentement autour de la trajectoire (le plateau « se couche » en fin de vol)
    if (sp > .1) c.axis.applyAxisAngle(_vh, c.roll * dt).normalize();
  };

  const findFree = (fx, fy) => {
    // point de ciel libre le plus proche de (fx, fy) en fractions du panneau
    for (let r = 0; r < .5; r += .02) for (let k = 0; k < 12; k++) {
      const x = (fx + Math.cos(k * .5236) * r) * st.w, y = (fy + Math.sin(k * .5236) * r * .8) * st.h;
      if (x > 20 && x < st.w - 20 && y > 20 && y < st.h * .62 && !masked(x, y) && !masked(x + 22, y) && !masked(x - 22, y) && !masked(x, y + 22) && !masked(x, y - 22)) return { x, y };
    }
    return { x: fx * st.w, y: fy * st.h };
  };
  let rest = { x: 0, y: 0 };
  const pickSky = (o) => {
    for (let tries = 0; tries < 60; tries++) {
      const x = R(.08, .92) * st.w, y = R(.1, .56) * st.h;
      // marge : le plateau doit être visible autour du point visé
      if (!masked(x, y) && !masked(x + 18, y) && !masked(x - 18, y) && !masked(x, y + 18)) { o.x = x; o.y = y; return o; }
    }
    o.x = st.w * .3; o.y = st.h * .3; return o;
  };

  const TYPES = ['cross', 'cross', 'away', 'away', 'teal', 'incoming'];
  const _A = new THREE.Vector3(), _sim = { p: new THREE.Vector3(), v: new THREE.Vector3(), axis: new THREE.Vector3(), roll: 0 }, _tgt = { x: 0, y: 0 };
  const launch = (type, at) => {
    const c = clays.find(c => !c.alive); if (!c) return null;
    type = type || TYPES[rnd() * TYPES.length | 0];
    const tgt = at || pickSky(_tgt);
    let v0, tau, D, alpha = R(.05, .12), bank = R(.12, .55) * (rnd() < .5 ? -1 : 1);
    switch (type) {
      case 'cross': { const s = tgt.x > st.w * .5 ? 1 : -1; v0 = new THREE.Vector3(s * R(19, 25), R(3, 7), R(-4, 3)); tau = R(.75, 1); D = R(15, 24); break; }
      case 'away': v0 = new THREE.Vector3(R(-5, 5), R(10, 13), -R(19, 24)); tau = R(.75, .95); D = R(17, 26); break;
      case 'teal': v0 = new THREE.Vector3(R(-3, 3), R(17, 21), R(-2, 1)); tau = R(.65, .85); D = R(13, 20); alpha = R(.02, .08); break;
      default: v0 = new THREE.Vector3(R(-3, 3), R(1, 4), R(14, 18)); tau = R(.7, .9); D = R(14, 22); bank = R(-.25, .25);
    }
    rayDir(tgt.x, tgt.y, _A).multiplyScalar(D).add(camera.position);
    // axe initial : perpendiculaire à la vitesse, cabré de l'incidence, incliné du dévers
    const vh = v0.clone().normalize(), ax = UP.clone().addScaledVector(vh, -vh.y);
    if (ax.lengthSq() < .04) ax.set(0, 0, 1).addScaledVector(vh, -vh.z);
    ax.normalize().multiplyScalar(Math.cos(alpha)).addScaledVector(vh, -Math.sin(alpha)).normalize().applyAxisAngle(vh, bank);
    const roll = R(.18, .45) * Math.sign(bank || 1);
    _sim.p.set(0, 0, 0); _sim.v.copy(v0); _sim.axis.copy(ax); _sim.roll = roll;
    for (let t = 0; t < tau; t += 1 / 120) physStep(_sim, 1 / 120);
    c.p.copy(_A).sub(_sim.p); c.v.copy(v0); c.axis.copy(ax); c.roll = roll;
    c.age = 0; c.alive = true; c.spin = R(0, 6.28); c.wob = R(.6, 1.2); c.type = type;
    c.fireAge = tau * R(.65, 1.05); c.plan = rnd() < .2 ? 'miss' : 'hit';
    c.g.visible = true; place(c, 0);
    return c;
  };
  const place = (c, t) => {
    // nutation amortie autour de l'axe gyroscopique
    const n = .07 * c.wob * Math.exp(-c.age * 1.4) + .015;
    _v.copy(c.axis); const ph = c.age * 44;
    _l.set(1, 0, 0).cross(c.axis); if (_l.lengthSq() < .01) _l.set(0, 0, 1).cross(c.axis);
    _l.normalize(); _a.copy(c.axis).cross(_l);
    _v.addScaledVector(_l, Math.cos(ph) * n).addScaledVector(_a, Math.sin(ph) * n).normalize();
    c.g.position.copy(c.p); c.g.quaternion.setFromUnitVectors(UP, _v);
    c.m.rotation.y = c.spin;
    const sIn = Math.min(1, c.age / .08); c.g.scale.setScalar(sIn);
    void t;
  };

  /* ---------- éclatement ---------- */
  const ORANGE = [242 / 255, 86 / 255, 42 / 255];
  const mix = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
  const PALE = [248 / 255, 196 / 255, 160 / 255], DARK = [86 / 255, 44 / 255, 30 / 255], PAPER = [245 / 255, 241 / 255, 234 / 255];
  const _o = new THREE.Vector3(), _d = new THREE.Vector3();
  const breakClay = (c, q) => {
    c.alive = false; c.g.visible = false;
    const smoke = q > .38, p = c.p, v = c.v;
    c.g.updateMatrixWorld(true); _q.copy(c.g.quaternion); _q2.setFromAxisAngle(UP, c.spin); _q.multiply(_q2);
    // éclats 3D
    const list = smoke ? [R(0, 8) | 0, 8 + (R(0, 10) | 0), 8 + (R(0, 10) | 0), ...Array.from({ length: R(7, 11) | 0 }, () => 18 + (R(0, 12) | 0))]
      : [R(0, 8) | 0, R(0, 8) | 0, ...(rnd() < .6 ? [R(0, 8) | 0] : []), 8 + (R(0, 10) | 0), 18 + (R(0, 12) | 0), 18 + (R(0, 12) | 0)];
    list.forEach(k => {
      const f = frags[fragHead]; fragHead = (fragHead + 1) % frags.length;
      const fg = fragGeos[k]; f.m.geometry = fg.g;
      _o.copy(fg.c).multiplyScalar(RW).applyQuaternion(_q);
      f.m.position.copy(p).add(_o); f.m.quaternion.copy(_q); f.s = RW; f.m.scale.setScalar(RW);
      _d.copy(_o).normalize();
      const kick = fg.big ? R(1.5, 4) : fg.mid ? R(3, 7) : R(5, 11);
      f.v.copy(v).multiplyScalar(smoke ? R(.55, .85) : R(.8, .95)).addScaledVector(_d, kick * (smoke ? 1.3 : .8)).add(_o.set(R(-1, 1), R(-.5, 1.5), R(-1, 1)));
      f.w.set(R(-1, 1), R(-1, 1), R(-1, 1)).normalize().multiplyScalar(fg.big ? R(6, 14) : R(12, 30));
      f.k = fg.big ? .03 : fg.mid ? .06 : .12; f.age = 0; f.life = R(2.2, 3.4); f.m.visible = true;
    });
    // nuage de poudre
    const nd = smoke ? 190 : 40;
    for (let i = 0; i < nd; i++) {
      _d.set(R(-1, 1), R(-1, 1), R(-1, 1)); if (_d.lengthSq() > 1) _d.normalize();
      const sp = smoke ? R(1, 6.5) : R(.6, 3), dk = rnd() < .07;
      const col = dk ? mix(DARK, ORANGE, R(.3, .6)) : mix(ORANGE, rnd() < .5 ? PALE : PAPER, R(.15, .7));
      emit(p.x + _d.x * .08, p.y + _d.y * .08, p.z + _d.z * .08,
        v.x * R(.25, .7) + _d.x * sp, v.y * R(.25, .7) + _d.y * sp + R(0, .8), v.z * R(.25, .7) + _d.z * sp,
        { k: 0, c: col, life: R(1.3, smoke ? 3.4 : 2), s0: R(.08, .22), s1: R(.7, smoke ? 2.2 : 1.1), a: R(.22, smoke ? .62 : .4), g: R(.2, 1.1), d: R(2.2, 3.4) });
    }
    // grenaille (petits éclats durs) et noyau lumineux
    const nc = smoke ? 110 : 26;
    for (let i = 0; i < nc; i++) {
      _d.set(R(-1, 1), R(-.6, 1), R(-1, 1)).normalize(); const sp = R(3, smoke ? 13 : 7);
      emit(p.x, p.y, p.z, v.x * R(.5, .9) + _d.x * sp, v.y * R(.5, .9) + _d.y * sp, v.z * R(.5, .9) + _d.z * sp,
        { k: 1, c: rnd() < .3 ? [.16, .1, .08] : mix(ORANGE, DARK, R(0, .35)), life: R(1, 2.2), s0: R(.018, .04), s1: R(.012, .03), a: R(.75, 1), g: G, d: R(.4, 1.2) });
    }
    if (smoke) for (let i = 0; i < 5; i++) emit(p.x, p.y, p.z, v.x * .3, v.y * .3, v.z * .3,
      { k: 0, c: [1, .93, .82], life: R(.12, .2), s0: .15, s1: R(.9, 1.4), a: .55, g: 0, d: 4 });
    if (smoke) st.bt = 1;
    st.dirty = true;
  };

  /* ---------- tir ---------- */
  const pending = [];
  let lastShot = -1, clock = 0;
  const _dir = new THREE.Vector3(), _u = new THREE.Vector3(), _w = new THREE.Vector3(), _s = { x: 0, y: 0, z: 0 };
  const fire = (x, y, user) => {
    if (clock - lastShot < .2) return; lastShot = clock;
    // gerbe : cône dont l'ouverture correspond à l'anneau du viseur ; on voit passer la grenaille, en mouches sombres
    rayDir(x, y, _dir);
    const cone = st.pr / st.focal, cp = camera.position;
    _u.crossVectors(_dir, UP).normalize(); _w.crossVectors(_u, _dir).normalize();
    for (let i = 0; i < 64; i++) {
      const a = cone * Math.sqrt(rnd()) * .97, ph = rnd() * 6.283, ta = Math.tan(a), s0 = R(9, 15), sp = R(240, 300);
      _d.copy(_dir).addScaledVector(_u, Math.cos(ph) * ta).addScaledVector(_w, Math.sin(ph) * ta).normalize();
      emit(cp.x + _d.x * s0, cp.y + _d.y * s0, cp.z + _d.z * s0, _d.x * sp, _d.y * sp, _d.z * sp,
        { k: 1, c: [.1, .11, .13], life: R(.07, .11), s0: .014, s1: .014, a: R(.45, .8), g: 0, d: 0 });
    }
    // touché ou raté : décidé à l'instant du coup (la gerbe arrive en quelques centièmes)
    let best = null, bd = 1e9;
    clays.forEach(c => {
      if (!c.alive || c.age < .05) return;
      toScreen(c.p, _s); if (_s.z > 1) return;
      const rc = RW * st.focal / c.p.distanceTo(cp), lim = st.pr + rc * .8, d = Math.hypot(_s.x - x, _s.y - y);
      if (d < lim && d < bd && !masked(_s.x, _s.y)) { bd = d; best = { c, q: 1 - d / lim }; }
    });
    if (best) pending.push({ ...best, t: .02 + bd / st.pr * .012, user });
    if (user) { st.shake = 1; st.shakeAmp = 3.2; st.flash = 1; kick(cross); }
    else { st.flash = .35; kick(ghost); }
    st.dirty = true;
  };
  const kick = el => { if (!el) return; el.classList.remove('kick'); void el.offsetWidth; el.classList.add('kick'); };
  const hitMark = el => { if (!el) return; el.classList.add('hit'); setTimeout(() => el.classList.remove('hit'), 380); };
  const resolve = sh => { if (sh.c.alive) { breakClay(sh.c, sh.q); hitMark(sh.user ? cross : ghost); } };

  /* ---------- tireur fantôme ---------- */
  const demo = { x: 0, y: 0, vx: 0, vy: 0, target: null, second: -1, init: false };
  let userHover = false, touchUntil = 0;
  const demoStep = (dt, sdt) => {
    if (!demo.init) { demo.x = rest.x; demo.y = rest.y; demo.init = true; }
    let tx = rest.x + Math.sin(clock * .5) * 14, ty = rest.y + Math.sin(clock * .37) * 10;
    const active = !userHover && clock > touchUntil;
    let t = demo.target, tvx = 0, tvy = 0;
    if (t && !t.alive) t = demo.target = null;
    if (!t) {
      let bestAge = -1;
      clays.forEach(c => { if (!c.alive || c.age < .18) return; toScreen(c.p, _s);
        if (_s.x > 10 && _s.x < st.w - 10 && _s.y > 10 && _s.y < st.h * .68 && !masked(_s.x, _s.y) && c.age > bestAge) { bestAge = c.age; t = c; } });
      demo.target = t || null;
    }
    if (t) {
      // le fusil « balance » avec le plateau : on suit sa vitesse apparente (anticipation) puis on corrige l'écart
      toScreen(t.p, _o);
      if (_o.x < -20 || _o.x > st.w + 20 || _o.y < -20 || _o.y > st.h * .75 || _o.z > 1) { demo.target = null; t = null; }
    }
    if (t) {
      _v.copy(t.p).addScaledVector(t.v, .01); toScreen(_v, _s);
      const sk = TS0 * st.ts / .01; tvx = (_s.x - _o.x) * sk; tvy = (_s.y - _o.y) * sk; tx = _o.x; ty = _o.y;
      if (t.plan === 'miss' && demo.second < 0) { const l = Math.hypot(tvx, tvy) || 1; tx -= tvx / l * (st.pr * 1.9); ty -= tvy / l * (st.pr * 1.9); }
    }
    // poursuite amortie (ressort critique)
    const k = t ? 13 : 6, ax = (tx - demo.x) * k * k + 2 * k * (tvx - demo.vx), ay = (ty - demo.y) * k * k + 2 * k * (tvy - demo.vy);
    demo.vx += ax * dt; demo.vy += ay * dt; demo.x += demo.vx * dt; demo.y += demo.vy * dt;
    if (active && t) {
      const settled = Math.hypot(tx - demo.x, ty - demo.y) < 9;
      if (demo.second >= 0) { demo.second -= dt; if (demo.second < 0 && settled) { fire(demo.x, demo.y, false); demo.second = -1; t.plan = 'hit'; t.fireAge = 99; } else if (demo.second < 0) demo.second = 0; }
      else if (t.age > t.fireAge && settled && !masked(_s.x, _s.y)) {
        fire(demo.x, demo.y, false);
        if (t.plan === 'miss') { demo.second = R(.22, .34); t.plan = 'hit'; } else t.fireAge = 99;
      }
    }
    ghost.classList.toggle('on', active && !!(t || clays.some(c => c.alive)));
    ghost.style.transform = `translate(${demo.x}px,${demo.y}px)`;
    void sdt;
  };

  /* ---------- simulation ---------- */
  let nextLaunch = .5;
  const simulate = (dt, rdt) => {
    clock += rdt;
    // lancers
    if (!reduceMotion) {
      nextLaunch -= rdt;
      if (nextLaunch <= 0) {
        const c = launch(); if (c && rnd() < .2) launch(rnd() < .5 ? c.type : null);   // parfois un doublé
        nextLaunch = R(1.5, 2.6);
      }
    }
    clays.forEach(c => {
      if (!c.alive) return;
      c.age += dt; physStep(c, dt); c.spin += dt * 24;
      if ((c.p.y < -3 && c.v.y < 0) || c.age > 7 || c.p.distanceTo(camera.position) > 140) { c.alive = false; c.g.visible = false; return; }
      place(c, dt);
    });
    for (let i = pending.length - 1; i >= 0; i--) { pending[i].t -= dt; if (pending[i].t <= 0) { resolve(pending[i]); pending.splice(i, 1); } }
    // éclats
    frags.forEach(f => {
      if (!f.m.visible) return;
      f.age += dt;
      const sp = f.v.length(); f.v.multiplyScalar(Math.max(0, 1 - f.k * sp * dt)); f.v.y -= G * dt;
      f.m.position.addScaledVector(f.v, dt);
      const wl = f.w.length(); if (wl) { _q.setFromAxisAngle(_d.copy(f.w).divideScalar(wl), wl * dt); f.m.quaternion.premultiply(_q); }
      const left = f.life - f.age;
      f.m.scale.setScalar(f.s * Math.min(1, Math.max(0, left / .35)));
      if (left <= 0 || f.m.position.y < -3) f.m.visible = false;
    });
    // poussière
    pLive = 0;
    for (let i = 0; i < N; i++) {
      if (pLife[i] <= 0) continue;
      pAge[i] += dt;
      if (pAge[i] >= pLife[i]) { pLife[i] = 0; pAlpha[i] = 0; continue; }
      pLive++;
      const kd = Math.exp(-pDrag[i] * dt), j = i * 3;
      pVel[j] *= kd; pVel[j + 1] = pVel[j + 1] * kd - pGrav[i] * dt; pVel[j + 2] *= kd;
      if (!pKind[i]) pVel[j] += .5 * dt;   // vent léger
      pPos[j] += pVel[j] * dt; pPos[j + 1] += pVel[j + 1] * dt; pPos[j + 2] += pVel[j + 2] * dt;
      const t = pAge[i] / pLife[i];
      pSize[i] = pS0[i] + (pS1[i] - pS0[i]) * (1 - Math.pow(1 - t, 2.4));
      pAlpha[i] = pA0[i] * Math.min(1, t / .04) * Math.pow(1 - t, pKind[i] ? .6 : 1.6);
    }
  };
  const anyLive = () => clays.some(c => c.alive) || frags.some(f => f.m.visible) || pLive > 0;
  const draw = () => {
    aPos.needsUpdate = aSize.needsUpdate = aAlpha.needsUpdate = aCol.needsUpdate = aKind.needsUpdate = true;
    renderer.render(scene, camera);
  };

  /* ---------- image fixe (mouvement réduit) ---------- */
  function renderStill() {
    if (!st.w) return;
    seed = 11; clays.forEach(c => { c.alive = false; c.g.visible = false; }); frags.forEach(f => f.m.visible = false); pLife.fill(0); pAlpha.fill(0);
    // un plateau qui vient d'éclater, un autre encore en vol, cadrés dans le ciel libre
    const pin = (c, fx, fy, D) => { const f = findFree(fx, fy); rayDir(f.x, f.y, _A).multiplyScalar(D).add(camera.position); c.p.copy(_A); c.age = .5; };
    const b = launch('cross');
    if (b) { pin(b, .37, .4, 24); breakClay(b, .95); for (let i = 0; i < 16; i++) simulate(TS0 / 60, 0); }
    const a = launch('cross');
    if (a) { pin(a, .2, .24, 17); a.axis.set(.3, .85, 1).normalize(); a.spin = 1.2; a.wob = 0; place(a, 0); }
    draw();
  }

  /* ---------- boucle ---------- */
  const frame = now => {
    st.raf = 0; if (!st.on) return;
    const rdt = Math.min(.05, (now - (st.last || now)) / 1000); st.last = now;
    // ralenti au moment de l'éclatement
    if (st.bt > 0) st.bt = Math.max(0, st.bt - rdt / .7);
    const bt = st.bt, ts = 1 - .55 * (bt > .8 ? (1 - bt) / .2 : bt / .8);
    const dt = rdt * TS0 * ts; st.ts = ts;
    updateImgRect();
    simulate(dt, rdt);
    demoStep(rdt, dt);
    // recul de la vue : micro-secousse de la photo et de la scène
    if (st.shake > 0) {
      st.shake = Math.max(0, st.shake - rdt / .22);
      const e = st.shake * st.shake * st.shakeAmp, tr = st.shake > 0 ? `${(rnd() - .5) * 2 * e}px ${(-e * .9 + (rnd() - .5) * e)}px` : '';
      if (fig) fig.style.translate = tr; cv.style.translate = tr; flash.style.translate = tr;
    }
    if (st.flash > 0) { st.flash = Math.max(0, st.flash - rdt / .14); flash.style.opacity = (st.flash * st.flash).toFixed(3); }
    const live = anyLive();
    if (live || st.dirty) { draw(); st.dirty = live; }
    st.raf = requestAnimationFrame(frame);
  };

  /* ---------- entrées ---------- */
  const local = e => { const b = pane.getBoundingClientRect(); return [e.clientX - b.left, e.clientY - b.top]; };
  const onTxt = e => !!(e.target && e.target.closest && e.target.closest('.sp-txt'));
  if (!reduceMotion) {
    pane.addEventListener('pointermove', e => {
      if (e.pointerType === 'touch') return;
      const [x, y] = local(e); userHover = true;
      if (cross) { cross.style.transform = `translate(${x}px,${y}px)`; cross.classList.toggle('off', onTxt(e)); }
    });
    pane.addEventListener('pointerleave', e => { if (e.pointerType !== 'touch') userHover = false; });
    pane.addEventListener('pointerdown', e => {
      if (onTxt(e) || e.button > 0) return;
      const [x, y] = local(e);
      if (e.pointerType === 'touch') { touchUntil = clock + 4; demo.x = x; demo.y = y; demo.vx = demo.vy = 0; ghost.style.transform = `translate(${x}px,${y}px)`; ghost.classList.add('on'); fire(x, y, true); kick(ghost); }
      else fire(x, y, true);
    });
    // un clic dans la photo tire ; le titre et le bouton gardent la navigation (et le clavier aussi)
    pane.addEventListener('click', e => { if (e.detail > 0 && !onTxt(e)) e.preventDefault(); });
  }

  new ResizeObserver(resize).observe(pane);
  resize();
  if (reduceMotion) { if (cross) cross.remove(); return; }
  new IntersectionObserver(([e]) => {
    st.on = e.isIntersecting; st.last = 0;
    if (st.on && !st.raf) st.raf = requestAnimationFrame(frame);
  }).observe(pane);
}
