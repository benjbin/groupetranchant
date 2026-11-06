/* Groupe Tranchant — scène de la filiale IDS (activités spécialisées, accueil).
   Contrat : mount(layer, { reduceMotion }) → { play(), pause(), pointer(mx, my) }.
   Plan-séquence three.js : un globe sombre en tuiles hexagonales tourne lentement ; des routes lumineuses
   partent des grands bassins de fabrication (Asie, Amériques, Europe) et convergent vers la France.
   La caméra plonge alors vers une plateforme logistique miniature, façon maquette d'architecte, qui sort
   du globe : porte-conteneurs, portique, entrepôt à sheds, convoyeur de colis, puis départs vers les clients.
   Tout est procédural (géométries, textures dessinées en canvas) ; un seul contexte WebGL. */
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

const LOOP = 11;                       // durée de la boucle (s), toutes les périodes en sont des diviseurs
const DEG = Math.PI / 180;
const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const lerp = (a, b, t) => a + (b - a) * t;
const sstep = (a, b, v) => { const t = clamp((v - a) / (b - a)); return t * t * t * (t * (t * 6 - 15) + 10); };
const easeOutBack = t => { const c = 1.4; t = clamp(t) - 1; return 1 + (c + 1) * t * t * t + c * t * t; };
const fract = v => v - Math.floor(v);
const ll = (lat, lon, r = 1) => new THREE.Vector3(Math.cos(lat * DEG) * Math.sin(lon * DEG), Math.sin(lat * DEG), Math.cos(lat * DEG) * Math.cos(lon * DEG)).multiplyScalar(r);
const hex = h => new THREE.Vector3(((h >> 16) & 255) / 255, ((h >> 8) & 255) / 255, (h & 255) / 255);
const PAL = { navy: 0x0B1B2E, blue: 0x335F94, mist: 0x9DB4D0, yellow: 0xF9C83B, red: 0xBA2637, paper: 0xF5F1EA };
const rand = seed => () => (seed = (seed * 16807) % 2147483647) / 2147483647;

/* ---------- terres émergées : contours simplifiés (lon, lat), rastérisés en masque ---------- */
const LAND = [
  // Amérique du Nord
  [-168, 66, -162, 70, -156, 71, -140, 70, -128, 70, -115, 68, -95, 72, -85, 70, -80, 63, -90, 57, -82, 52, -78, 58, -70, 60, -64, 58, -60, 53, -56, 51, -66, 45, -70, 43, -70, 41, -75, 39, -76, 35, -81, 31, -80, 26, -82, 26, -83, 29, -89, 30, -94, 29, -97, 26, -97, 21, -95, 18, -91, 19, -87, 21, -88, 16, -84, 15, -83, 10, -79, 9, -77, 8, -80, 7, -83, 8, -86, 12, -92, 14, -96, 16, -105, 20, -106, 23, -110, 23, -112, 29, -115, 30, -117, 33, -121, 35, -124, 40, -124, 46, -127, 50, -133, 55, -140, 60, -147, 61, -153, 59, -158, 57, -164, 55, -158, 59, -166, 61, -165, 64],
  [-73, 78, -60, 82, -35, 83, -20, 80, -20, 72, -30, 68, -40, 65, -44, 60, -50, 64, -55, 70, -60, 76],
  [-120, 74, -100, 78, -85, 80, -70, 82, -62, 80, -80, 74, -95, 72, -110, 72],
  [-80, 73, -68, 70, -62, 66, -72, 62, -80, 64, -88, 68],
  [-85, 22, -80, 23, -74, 20, -78, 20], [-74, 18.5, -69, 19, -68.5, 18.3, -72, 18],
  // Amérique du Sud
  [-80, 9, -75, 11, -72, 12, -63, 11, -60, 9, -52, 5, -50, 0, -44, -2, -35, -5, -35, -9, -39, -14, -40, -22, -48, -26, -53, -34, -58, -38, -62, -40, -65, -45, -68, -50, -69, -55, -73, -53, -75, -47, -73, -40, -72, -30, -70, -20, -75, -15, -81, -6, -80, -2, -80, 1, -78, 4, -77, 8],
  // Eurasie
  [-9, 37, -9, 43, -2, 43.5, -1.5, 46, -4.5, 48, -1, 49.5, 2, 51, 5, 53, 8, 54, 8, 57, 10.5, 57.5, 10, 55, 12, 54.5, 14, 54, 19, 54.5, 21, 57, 24, 57.5, 23, 59.5, 29, 60, 22, 60.5, 21, 63, 25, 65.5, 22, 66, 19, 63, 17, 61, 18, 59.5, 16, 56, 13, 55.5, 11, 58.5, 8, 58, 5, 59, 5, 62, 10, 64, 14, 67, 19, 70, 25, 71, 30, 70, 40, 68, 44, 67, 50, 68, 60, 69, 69, 73, 80, 73, 90, 76, 105, 78, 113, 74, 130, 72, 140, 72, 160, 70, 180, 69, 180, 65, 178, 62, 170, 60, 163, 58, 162, 54, 156, 51, 156, 57, 160, 61, 155, 59, 143, 59, 137, 54, 140, 48, 135, 43, 130, 42, 129, 36, 126, 35, 126, 38, 125, 40, 121, 39, 122, 37, 119, 35, 121, 32, 122, 29, 119, 25, 114, 22, 109, 21, 108, 16, 109, 12, 105, 9, 103, 10, 100, 13, 100, 8, 103, 1.5, 101, 3, 98, 8, 98, 16, 94, 17, 92, 22, 88, 22, 86, 20, 80, 15, 80, 10, 77, 8, 73, 16, 72, 21, 67, 25, 62, 25, 57, 26, 56, 27, 52, 28, 49, 30, 48, 29, 51, 25, 56, 26, 56, 22, 59, 22, 55, 17, 52, 16, 44, 12, 43, 14, 39, 21, 35, 28, 34, 31, 35, 35, 36, 36, 30, 36, 27, 37, 26, 40, 29, 41, 31, 41, 35, 42, 41, 41, 39, 44, 37, 47, 34, 46, 33, 44.5, 30, 45, 28, 44, 29, 41, 23, 40.5, 24, 38, 22, 37, 21, 39, 19, 41.5, 16, 43, 13, 45.5, 12, 44, 16, 41, 16, 38, 15.6, 38, 12, 42, 10, 44, 7, 43.5, 3, 43, 3, 42, 0, 40, -0.5, 38, -2, 36.7, -5, 36, -6, 37],
  [-5, 50, 1, 51, 2, 53, 0, 54, -2, 56, -2, 58, -5, 58.5, -6, 56, -5, 54.5, -3, 54, -5, 52], [-10, 52, -6, 52, -6, 55, -8, 55, -10, 54],
  [-24, 64, -14, 64, -14, 66, -22, 66.5], [8.5, 39, 9.8, 39, 9.8, 41.2, 8.2, 41], [8.6, 41.4, 9.6, 41.4, 9.4, 43, 8.6, 42.6], [12.5, 38, 15.6, 38, 15.3, 37, 12.5, 37.6],
  [130, 31, 132, 34, 135, 34, 140, 35, 141, 38, 142, 41, 141, 42, 140, 40, 139, 37, 136, 36, 132, 35.5, 130, 33], [140, 42, 145, 43, 143, 45, 141, 45],
  [120, 22, 122, 25, 121, 25.5, 120, 23.5], [120, 18, 122, 18, 124, 13, 126, 7, 124, 6, 122, 10, 120, 14], [80, 6, 82, 7.5, 81, 9.5, 79.8, 8.5],
  [109, 1, 111, -3, 116, -4, 119, 1, 117, 7, 113, 3], [95, 5, 98, 4, 106, -6, 104, -5, 101, -2, 96, 3], [105, -6, 114, -7, 114, -8.5, 106, -7],
  [119, -5, 121, 1, 125, 1, 121, -1, 123, -5], [131, -1, 138, -2, 147, -6, 150, -10, 143, -9, 138, -8, 134, -4],
  // Afrique, Océanie
  [-17, 21, -16, 28, -10, 30, -9, 33, -6, 35.8, 0, 35.8, 10, 37, 11, 33, 20, 31, 30, 31.5, 32, 31, 34, 28, 37, 22, 39, 16, 43, 12, 51, 12, 51, 10, 48, 5, 42, -1, 40, -5, 40, -11, 35, -20, 33, -26, 30, -31, 20, -35, 18, -32, 14, -23, 12, -17, 13, -12, 9, -1, 9, 4, 5, 5, -2, 5, -8, 4.5, -13, 8, -17, 14],
  [44, -25, 47, -25, 50, -15, 49, -12, 44, -17],
  [114, -22, 114, -26, 115, -34, 118, -35, 124, -34, 131, -31, 135, -35, 138, -35, 140, -38, 146, -39, 150, -37, 153, -31, 153, -25, 146, -19, 145, -15, 142, -11, 141, -17, 136, -15, 137, -12, 132, -11, 130, -15, 126, -14, 122, -18],
  [172, -34, 175, -37, 178, -38, 175, -41, 171, -44, 167, -46, 170, -46, 174, -41]
];
const WATER = [[-95, 59, -87, 56, -80, 52, -78, 56, -77, 62, -86, 64, -94, 62], [47, 45, 51, 47, 54, 45, 53, 40, 54, 37, 50, 37, 49, 40, 47, 43]];

function landMask() {
  const W = 720, H = 360, cv = document.createElement('canvas'); cv.width = W; cv.height = H;
  const x = cv.getContext('2d', { willReadFrequently: true });
  const poly = p => { x.beginPath(); for (let i = 0; i < p.length; i += 2) x.lineTo((p[i] + 180) * 2, (90 - p[i + 1]) * 2); x.closePath(); x.fill(); };
  x.fillStyle = '#fff'; LAND.forEach(poly);
  x.globalCompositeOperation = 'destination-out'; WATER.forEach(poly);
  const d = x.getImageData(0, 0, W, H).data;
  return (lat, lon) => d[(Math.min(H - 1, Math.floor((90 - lat) * 2)) * W + Math.min(W - 1, Math.floor((lon + 180) * 2))) * 4 + 3] > 120;
}

/* ---------- géographie du flux ---------- */
const FR = [46.6, 2.4];
// [lat, lon, période (diviseur de LOOP), décalage, accent rouge (Italie : tir sportif)]
const SOURCES = [
  [22.5, 114, 4, .00], [31.2, 121.5, 3, .55], [25, 121.5, 5, .30], [37.5, 127, 4, .62], [35.7, 139.7, 3, .15],
  [10.8, 106.7, 5, .80], [13, 77.6, 4, .38], [25.2, 55.3, 5, .05], [3.1, 101.7, 3, .86],
  [34, -118, 4, .22], [40.7, -74, 3, .40], [45.5, -73.6, 5, .66], [-23.5, -46.6, 4, .84],
  [45.6, 10.2, 5, .48, 1], [48.1, 11.6, 4, .72], [52.4, 13.4, 3, .05]
];
const CLIENTS = [[51.5, -.1], [52.4, 4.9], [40.4, -3.7], [41.4, 2.2], [38.7, -9.1], [45.5, 9.2], [50.1, 8.7], [41.9, 12.5], [53.3, -6.3], [41.9, 8.8], [55.7, 12.6], [48.2, 16.4]];

/* ---------- textures procédurales ---------- */
function tex(w, h, paint, repeat) {
  const cv = document.createElement('canvas'); cv.width = w; cv.height = h; paint(cv.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
  if (repeat) { t.wrapS = t.wrapT = THREE.RepeatWrapping; }
  return t;
}
const noise = (x, w, h, a, n, R) => { for (let i = 0; i < n; i++) { const g = R() > .5 ? 255 : 0; x.fillStyle = `rgba(${g},${g},${g},${a * R()})`; x.fillRect(R() * w, R() * h, 1 + R() * 2, 1 + R() * 2); } };

function floorTexture() {
  const R = rand(7), S = 1024, P = v => (v + 5) / 10 * S;
  return tex(S, S, (x) => {
    x.fillStyle = '#1d3350'; x.fillRect(0, 0, S, S); noise(x, S, S, .05, 9000, R);
    // cour à conteneurs
    x.fillStyle = '#172b45'; x.fillRect(P(1.1), P(-4.7), P(4.95) - P(1.1), P(-.35) - P(-4.7));
    x.strokeStyle = 'rgba(157,180,208,.16)'; x.lineWidth = 2;
    for (let z = -4.4; z < -.4; z += 1.2) { x.strokeRect(P(1.75), P(z), P(4.45) - P(1.75), 1.05 / 10 * S); }
    // voie de roulage avant
    x.fillStyle = '#132438'; x.fillRect(0, P(3.85), S, P(4.75) - P(3.85));
    x.strokeStyle = 'rgba(245,241,234,.55)'; x.lineWidth = 3; x.setLineDash([22, 18]); x.beginPath(); x.moveTo(0, P(4.3)); x.lineTo(S, P(4.3)); x.stroke(); x.setLineDash([]);
    x.strokeStyle = 'rgba(245,241,234,.22)'; x.lineWidth = 2; [3.85, 4.75].forEach(z => { x.beginPath(); x.moveTo(0, P(z)); x.lineTo(S, P(z)); x.stroke(); });
    // quai d'expédition hachuré
    x.save(); x.beginPath(); x.rect(P(1.4), P(2.3), P(3.55) - P(1.4), P(3.55) - P(2.3)); x.clip();
    x.strokeStyle = 'rgba(249,200,59,.55)'; x.lineWidth = 7; for (let i = -40; i < 60; i++) { x.beginPath(); x.moveTo(P(1.4) + i * 18, P(2.3)); x.lineTo(P(1.4) + i * 18 - 140, P(3.55)); x.stroke(); }
    x.restore(); x.strokeStyle = 'rgba(249,200,59,.85)'; x.lineWidth = 3; x.strokeRect(P(1.4), P(2.3), P(3.55) - P(1.4), P(3.55) - P(2.3));
    // places de parking + allée piétonne
    x.strokeStyle = 'rgba(245,241,234,.3)'; x.lineWidth = 2;
    for (let i = 0; i < 5; i++) { const px = P(-4.65 + i * .48); x.beginPath(); x.moveTo(px, P(1.25)); x.lineTo(px, P(2.15)); x.stroke(); }
    x.strokeStyle = 'rgba(249,200,59,.5)'; x.lineWidth = 3; x.beginPath(); x.moveTo(P(.55), P(.2)); x.lineTo(P(.55), P(1.15)); x.lineTo(P(3.7), P(1.15)); x.stroke();
    // bordure claire
    x.strokeStyle = 'rgba(157,180,208,.25)'; x.lineWidth = 4; x.strokeRect(P(-4.75), P(-4.75), P(4.75) - P(-4.75), P(4.75) - P(-4.75));
  });
}
const ribTexture = () => tex(256, 64, (x, w, h) => {
  for (let i = 0; i < w; i++) { const v = .5 + .5 * Math.sin(i / w * Math.PI * 2 * 22); const g = Math.round(185 + 70 * Math.pow(v, .6)); x.fillStyle = `rgb(${g},${g},${g})`; x.fillRect(i, 0, 1, h); }
  x.fillStyle = 'rgba(0,0,0,.18)'; x.fillRect(0, 0, w, 3); x.fillRect(0, h - 3, w, 3); x.fillRect(0, 0, 3, h); x.fillRect(w - 3, 0, 3, h);
});
const boxTexture = () => tex(128, 128, (x, w, h) => {
  const R = rand(11); x.fillStyle = '#c8a77c'; x.fillRect(0, 0, w, h); noise(x, w, h, .08, 900, R);
  x.fillStyle = 'rgba(232,214,182,.85)'; x.fillRect(0, 54, w, 20);
  x.fillStyle = '#F5F1EA'; x.fillRect(16, 16, 34, 24); x.fillStyle = 'rgba(11,27,46,.55)'; for (let i = 0; i < 4; i++) x.fillRect(20, 20 + i * 5, 14 + (i % 2) * 10, 2);
  x.strokeStyle = 'rgba(80,55,30,.35)'; x.lineWidth = 3; x.strokeRect(1.5, 1.5, w - 3, h - 3);
});

/* ---------- géométries ---------- */
function roundRect(w, d, r) {
  const s = new THREE.Shape(), x = -w / 2, y = -d / 2;
  s.moveTo(x + r, y); s.lineTo(x + w - r, y); s.quadraticCurveTo(x + w, y, x + w, y + r); s.lineTo(x + w, y + d - r); s.quadraticCurveTo(x + w, y + d, x + w - r, y + d);
  s.lineTo(x + r, y + d); s.quadraticCurveTo(x, y + d, x, y + d - r); s.lineTo(x, y + r); s.quadraticCurveTo(x, y, x + r, y);
  return s;
}
function arcPath(a, b, h, n) {
  const A = a.clone().normalize(), B = b.clone().normalize(), ra = a.length(), rb = b.length();
  const om = Math.acos(clamp(A.dot(B), -1, 1)), so = Math.sin(om), pts = [];
  for (let i = 0; i <= n; i++) {
    const s = i / n, ka = Math.sin((1 - s) * om) / so, kb = Math.sin(s * om) / so;
    pts.push(A.clone().multiplyScalar(ka).addScaledVector(B, kb).normalize().multiplyScalar(lerp(ra, rb, s) + h * Math.sin(Math.PI * s)));
  }
  return pts;
}
const along = (pts, s, out) => { const f = clamp(s) * (pts.length - 1), i = Math.min(pts.length - 2, Math.floor(f)); return out.copy(pts[i]).lerp(pts[i + 1], f - i); };

const ARC_V = `uniform float uR, uW; varying vec2 vUv; varying vec3 vN; varying vec3 vV;
void main(){ vUv = uv; vec4 mv = modelViewMatrix * vec4(position - normal * uR * (1. - uW), 1.); vN = normalMatrix * normal; vV = -mv.xyz; gl_Position = projectionMatrix * mv; }`;
const ARC_F = `uniform float uHead, uTail, uFade, uOp, uNear; uniform vec3 uA, uB, uH; varying vec2 vUv; varying vec3 vN; varying vec3 vV;
void main(){
  float s = vUv.x, edge = pow(abs(dot(normalize(vN), normalize(vV))), 1.6);
  float drawn = step(s, uHead);
  float trail = drawn * pow(smoothstep(uHead - uTail, uHead, s), 2.2);
  float path = mix(.08, .42 * uFade, drawn);
  float head = exp(-pow((s - uHead) * 55., 2.));
  vec3 c = mix(uA, uB, smoothstep(.0, 1., s));
  vec3 col = c * (path + trail * 2.2) + uH * head * 1.6;
  col *= edge * uOp * smoothstep(0., .04, s) * smoothstep(uNear * .55, uNear * 1.05, length(vV));
  gl_FragColor = vec4(col, 1.);
}`;
const GLOW_V = `attribute float aSize; attribute vec3 aColor; uniform float uH, uCam; varying vec3 vC;
void main(){ vec4 mv = modelViewMatrix * vec4(position, 1.); gl_Position = projectionMatrix * mv; gl_PointSize = aSize * uH * uCam / max(.001, -mv.z); vC = aColor; }`;
const GLOW_F = `varying vec3 vC;
void main(){ float d = length(gl_PointCoord - .5) * 2.; float a = exp(-d * d * 6.) * .55 + exp(-d * d * 40.) * 1.2; a *= smoothstep(1., .6, d); gl_FragColor = vec4(vC * a, 1.); }`;

export function mount(layer, { reduceMotion }) {
  const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
  renderer.setClearColor(0x0e1f33, 1);
  renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.05;
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  layer.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  const envRT = pmrem.fromScene(new RoomEnvironment(), .04); scene.environment = envRT.texture; pmrem.dispose();
  scene.environmentIntensity = .55;
  const camera = new THREE.PerspectiveCamera(28, 1, .1, 20);

  // fond : halo bleu centré, cohérent avec le bandeau bleu nuit
  const bg = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), new THREE.ShaderMaterial({
    depthWrite: false, depthTest: false, uniforms: { uAsp: { value: 1 } },
    vertexShader: 'varying vec2 vU; void main(){ vU = uv; gl_Position = vec4(position.xy, .9999, 1.); }',
    fragmentShader: `uniform float uAsp; varying vec2 vU;
      void main(){ vec2 p = (vU - vec2(.5, .47)) * vec2(uAsp, 1.); float d = length(p);
        vec3 c = mix(vec3(.085, .17, .29), vec3(.047, .105, .178), smoothstep(.0, .72, d));
        c += vec3(.02, .035, .06) * exp(-d * d * 9.); gl_FragColor = vec4(c, 1.); }`
  }));
  bg.frustumCulled = false; bg.renderOrder = -10; scene.add(bg);

  /* ----- globe ----- */
  const globe = new THREE.Group(); scene.add(globe);
  const ocean = new THREE.Mesh(new THREE.SphereGeometry(1, 96, 64), new THREE.ShaderMaterial({
    uniforms: { uL: { value: new THREE.Vector3(0, 1, 0) } },
    vertexShader: 'varying vec3 vP; void main(){ vec4 w = modelMatrix * vec4(position, 1.); vP = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }',
    fragmentShader: `uniform vec3 uL; varying vec3 vP;
      void main(){ vec3 n = normalize(vP), v = normalize(cameraPosition - vP); float l = max(dot(n, uL), 0.);
        vec3 c = mix(vec3(.022, .045, .082), vec3(.07, .15, .27), pow(l, 1.3));
        c += vec3(.55, .68, .85) * pow(max(dot(n, normalize(uL + v)), 0.), 90.) * .22;
        gl_FragColor = vec4(c, 1.); }`
  }));
  ocean.receiveShadow = true; globe.add(ocean);
  const fresnel = (r, side, pw, k, col) => new THREE.Mesh(new THREE.SphereGeometry(r, 96, 64), new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side,
    uniforms: { uC: { value: hex(col) }, uK: { value: k } },
    vertexShader: 'varying vec3 vN; varying vec3 vV; void main(){ vec4 mv = modelViewMatrix * vec4(position,1.); vN = normalMatrix * normal; vV = -mv.xyz; gl_Position = projectionMatrix * mv; }',
    fragmentShader: `uniform vec3 uC; uniform float uK; varying vec3 vN; varying vec3 vV;
      void main(){ float f = 1. - abs(dot(normalize(vN), normalize(vV))); ${side === THREE.BackSide ? 'f = pow(smoothstep(.0, 1., 1. - f), ' + pw + ') * smoothstep(0., .15, 1. - f);' : 'f = pow(f, ' + pw + ');'} gl_FragColor = vec4(uC * f * uK, 1.); }`
  }));
  const rim = fresnel(1.004, THREE.FrontSide, '4.5', .45, 0x6f93bf); globe.add(rim);
  const atmo = fresnel(1.13, THREE.BackSide, '5.0', .55, 0x4f7fb8); globe.add(atmo);

  // graticule discret
  {
    const pts = [];
    for (let lat = -60; lat <= 75; lat += 15) for (let lon = -180; lon < 180; lon += 3) pts.push(ll(lat, lon, 1.002), ll(lat, lon + 3, 1.002));
    for (let lon = -180; lon < 180; lon += 15) for (let lat = -80; lat < 80; lat += 3) pts.push(ll(lat, lon, 1.002), ll(lat + 3, lon, 1.002));
    globe.add(new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(pts), new THREE.LineBasicMaterial({ color: PAL.mist, transparent: true, opacity: .07, depthWrite: false })));
  }

  // tuiles hexagonales sur les terres, relief discret
  const isLand = landMask(), FRv = ll(FR[0], FR[1]);
  {
    const N = 17000, ga = Math.PI * (3 - Math.sqrt(5)), cells = [];
    for (let i = 0; i < N; i++) {
      const y = 1 - 2 * (i + .5) / N, r = Math.sqrt(1 - y * y), th = i * ga, v = new THREE.Vector3(r * Math.cos(th), y, r * Math.sin(th));
      const lat = Math.asin(y) / DEG, lon = Math.atan2(v.x, v.z) / DEG;
      if (lat > -58 && isLand(lat, lon)) cells.push(v);
    }
    const geo = new THREE.CylinderGeometry(.0112, .0112, 1, 6); geo.translate(0, .5, 0);
    const mat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: .55, metalness: .15, envMapIntensity: .3 });
    const im = new THREE.InstancedMesh(geo, mat, cells.length); im.receiveShadow = true;
    const m = new THREE.Matrix4(), q = new THREE.Quaternion(), up = new THREE.Vector3(0, 1, 0), sc = new THREE.Vector3(), c = new THREE.Color();
    const cLow = new THREE.Color(0x1f3b60), cHi = new THREE.Color(0x3b6496), cMist = new THREE.Color(PAL.mist), cYel = new THREE.Color(PAL.yellow);
    const srcV = SOURCES.map(s => ll(s[0], s[1]));
    cells.forEach((v, i) => {
      const n = .5 + .5 * Math.sin(v.x * 9.1 + 1.7) * Math.sin(v.y * 7.3 + .4) * Math.sin(v.z * 8.2 + 2.1) + .25 * Math.sin(v.x * 23 + v.z * 19);
      const nn = clamp(n);
      q.setFromUnitVectors(up, v); sc.set(1, .0035 + .013 * nn * nn, 1);
      m.compose(v, q, sc); im.setMatrixAt(i, m);
      c.copy(cLow).lerp(cHi, nn);
      const dFr = v.angleTo(FRv) / DEG; if (dFr < 16) c.lerp(cMist, .14 * (1 - dFr / 16));
      for (const s of srcV) { const d = v.angleTo(s) / DEG; if (d < 3.5 && s.angleTo(FRv) > .5) c.lerp(cYel, .3 * (1 - d / 3.5)); }
      im.setColorAt(i, c);
    });
    globe.add(im);
  }

  /* ----- repère local de la France : plateforme logistique ----- */
  const UNIT = .018, ALT = .036;
  const E = new THREE.Vector3(Math.cos(FR[1] * DEG), 0, -Math.sin(FR[1] * DEG)), Nn = new THREE.Vector3().crossVectors(FRv, E);
  const basis = new THREE.Matrix4().makeBasis(E, FRv, Nn.clone().negate()), dq = new THREE.Quaternion().setFromRotationMatrix(basis);
  const PD = FRv.clone().multiplyScalar(1 + ALT);
  const full = new THREE.Matrix4().compose(PD, dq, new THREE.Vector3(UNIT, UNIT, UNIT));
  const L2W = (x, y, z) => new THREE.Vector3(x, y, z).applyMatrix4(full);
  const dio = new THREE.Group(); dio.position.copy(PD); dio.quaternion.copy(dq); scene.add(dio);
  const dioAnim = buildDiorama(dio);

  /* ----- routes : arrivées (monde → plateforme) et départs (plateforme → clients) ----- */
  const routes = [];
  const YARD = L2W(3.1, 3.6, -2.4), DOCK = L2W(3.95, .9, 1.6);
  const mkRoute = (a, b, h, P, off, cA, cB, cH, rad, inbound) => {
    const pts = arcPath(a, b, h, 120);
    const mat = new THREE.ShaderMaterial({
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, vertexShader: ARC_V, fragmentShader: ARC_F,
      uniforms: { uNear: { value: 0 }, uR: { value: rad }, uW: { value: 1 }, uHead: { value: 0 }, uTail: { value: .32 }, uFade: { value: 1 }, uOp: { value: 1 }, uA: { value: hex(cA) }, uB: { value: hex(cB) }, uH: { value: hex(cH) } }
    });
    const mesh = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 140, rad, 6, false), mat);
    scene.add(mesh); routes.push({ pts, mat, P, off, inbound, a, b });
  };
  SOURCES.forEach(([la, lo, div, off, acc]) => {
    const a = ll(la, lo, 1.006), ang = a.angleTo(YARD);
    mkRoute(a, YARD, .06 + .32 * ang / Math.PI * 1.2, LOOP / div, off, acc ? PAL.red : 0x6f93bf, acc ? 0xff6a5a : PAL.yellow, PAL.paper, .0042, true);
  });
  CLIENTS.forEach(([la, lo], i) => {
    const b = ll(la, lo, 1.008), ang = DOCK.angleTo(b);
    mkRoute(DOCK, b, .03 + .5 * ang, LOOP / [4, 5, 3][i % 3], i / CLIENTS.length, PAL.yellow, 0xffe08a, PAL.paper, .0024, false);
  });

  // colis volants (un par route)
  const parcelGeo = new THREE.BoxGeometry(1, .78, .86);
  const parcels = new THREE.InstancedMesh(parcelGeo, new THREE.MeshStandardMaterial({ map: boxTexture(), roughness: .7, emissive: 0x3a2c18, emissiveIntensity: .6 }), routes.length);
  parcels.frustumCulled = false; scene.add(parcels);

  // halos : têtes de routes, sources, clients, balise France
  const nG = routes.length * 2 + 1;
  const gPos = new Float32Array(nG * 3), gCol = new Float32Array(nG * 3), gSize = new Float32Array(nG);
  const gGeo = new THREE.BufferGeometry();
  gGeo.setAttribute('position', new THREE.BufferAttribute(gPos, 3).setUsage(THREE.DynamicDrawUsage));
  gGeo.setAttribute('aColor', new THREE.BufferAttribute(gCol, 3).setUsage(THREE.DynamicDrawUsage));
  gGeo.setAttribute('aSize', new THREE.BufferAttribute(gSize, 1).setUsage(THREE.DynamicDrawUsage));
  const glowMat = new THREE.ShaderMaterial({ transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, uniforms: { uH: { value: 500 }, uCam: { value: 1 } }, vertexShader: GLOW_V, fragmentShader: GLOW_F });
  const glows = new THREE.Points(gGeo, glowMat); glows.frustumCulled = false; scene.add(glows);
  const setG = (i, p, col, k, size) => { gPos[i * 3] = p.x; gPos[i * 3 + 1] = p.y; gPos[i * 3 + 2] = p.z; gCol[i * 3] = col.x * k; gCol[i * 3 + 1] = col.y * k; gCol[i * 3 + 2] = col.z * k; gSize[i] = size; };

  /* ----- lumières ----- */
  scene.add(new THREE.HemisphereLight(0x9db4d0, 0x0b1b2e, .4));
  const key = new THREE.DirectionalLight(0xfff1dc, 3.1);
  const LD = FRv.clone().multiplyScalar(1).addScaledVector(E, -.75).addScaledVector(Nn, .45).normalize();
  ocean.material.uniforms.uL.value.copy(LD);
  key.position.copy(PD).addScaledVector(LD, .8); key.target.position.copy(PD); scene.add(key, key.target);
  key.castShadow = true; key.shadow.mapSize.set(2048, 2048);
  Object.assign(key.shadow.camera, { left: -.15, right: .15, top: .15, bottom: -.15, near: .3, far: 1.4 });
  key.shadow.bias = -.0004; key.shadow.normalBias = .0006; key.shadow.radius = 3;
  const rimL = new THREE.DirectionalLight(0x7fa6d8, 1.6); scene.add(rimL);
  const fill = new THREE.DirectionalLight(0xbfd3ea, .35); scene.add(fill);

  /* ----- caméra : orbite large → plongée → maquette → retour ----- */
  const camLocal = new THREE.Vector3(), tgtLocal = new THREE.Vector3(), O0 = new THREE.Vector3(), O1 = new THREE.Vector3(), dir = new THREE.Vector3(), tgt = new THREE.Vector3(), upv = new THREE.Vector3(), tmp = new THREE.Vector3(), tmp2 = new THREE.Vector3();
  const Y = new THREE.Vector3(0, 1, 0), M4 = new THREE.Matrix4(), Q4 = new THREE.Quaternion(), S3 = new THREE.Vector3(), FWD = new THREE.Vector3(1, 0, 0);
  const C_HEAD = hex(0xfff3d6), C_YEL = hex(PAL.yellow), C_RED = hex(PAL.red), C_MIST = hex(PAL.mist);
  const slerpV = (a, b, t, out) => { const om = Math.acos(clamp(a.dot(b), -1, 1)); if (om < 1e-4) return out.copy(a).lerp(b, t); const s = Math.sin(om); return out.copy(a).multiplyScalar(Math.sin((1 - t) * om) / s).addScaledVector(b, Math.sin(t * om) / s); };
  let W = 1, H = 1, mx = 0, my = 0, tmx = 0, tmy = 0;

  const dive = t => t < 6 ? sstep(1.75, 3.75, t) : 1 - sstep(8.35, 10.45, t);
  const rise = t => t < 6 ? easeOutBack((t - 2.55) / 1.25) : 1 - sstep(8.25, 9.25, t);

  function render(t) {
    t = fract(t / LOOP) * LOOP;
    const k = dive(t), sc = Math.max(0, rise(t));
    // orbite large
    const lon = 22 + 16 * Math.cos(t / LOOP * Math.PI * 2) - mx * 14, lat = 27 + 4 * Math.sin(t / LOOP * Math.PI * 2) + my * 10;
    O0.set(Math.cos(lat * DEG) * Math.sin(lon * DEG), Math.sin(lat * DEG), Math.cos(lat * DEG) * Math.cos(lon * DEG));
    const D0 = 5.35 * (W / H < 1 ? 1 / Math.max(.75, W / H) : 1);
    // vue maquette, en lent travelling circulaire
    const a = -.55 + .85 * clamp((t - 1.75) / 8.7) - mx * .5;
    const fz = 1 + .16 * clamp((1.33 - W / H) / .33);   // carré : un peu plus de recul qu'en 4:3
    camLocal.set(.5 + Math.sin(a) * 24.5 * fz, (19.5 - my * 6) * fz, -.3 + Math.cos(a) * 24.5 * fz).applyMatrix4(full);
    tgtLocal.set(.5, .9, -.3).applyMatrix4(full);
    O1.subVectors(camLocal, tgtLocal); const D1 = O1.length(); O1.normalize();
    const len = Math.exp(lerp(Math.log(D0), Math.log(D1), k));
    slerpV(O0, O1, sstep(0, .85, k), dir).normalize();
    const kt = sstep(0, .62, k);
    tgt.set(0, 0, 0).lerp(tgtLocal, kt);
    camera.position.copy(tgt).addScaledVector(dir, len);
    upv.copy(Y).lerp(FRv, sstep(.2, 1, k)).normalize(); camera.up.copy(upv);
    camera.lookAt(tgt);
    camera.near = Math.max(.004, len * .03); camera.far = len + 3; camera.updateProjectionMatrix();
    glowMat.uniforms.uCam.value = Math.max(len, .0001);
    // lumières liées à la caméra pour le globe (contre-jour + douche)
    tmp.copy(camera.position).normalize();
    rimL.position.copy(tmp).multiplyScalar(-3).addScaledVector(Y, 2.2); fill.position.copy(camera.position);

    // plateforme
    dio.visible = sc > .002; dio.scale.setScalar(UNIT * Math.max(.001, sc));
    renderer.shadowMap.autoUpdate = dio.visible;
    dioAnim(t, sc);

    // routes, colis, halos
    const m = M4, q = Q4, s3 = S3, fwd = FWD;
    let flash = 0;
    routes.forEach((r, i) => {
      const ph = fract(t / r.P + r.off), trav = .62;
      const head = clamp(ph / trav) * (1 + .32);
      const op = r.inbound ? lerp(1, .6, k) : sstep(.75, 1, sc) * sstep(.2, .6, k);
      r.mat.uniforms.uHead.value = head; r.mat.uniforms.uNear.value = len * sstep(.5, 1, k); r.mat.uniforms.uW.value = r.inbound ? lerp(1.9, .28, k) : lerp(1, .55, k); r.mat.uniforms.uFade.value = 1 - sstep(trav + .05, 1, ph); r.mat.uniforms.uOp.value = op;
      r.mat.visible = op > .01;
      const hs = Math.min(head, 1), vis = head > .01 && head < 1 ? 1 : 0;
      along(r.pts, hs, tmp); along(r.pts, hs + .01, tmp2);
      const sz = (r.inbound ? .012 : .0085) * lerp(1, .45, k) * sstep(0, .06, hs) * (1 - sstep(.9, 1, hs)) * vis * (op > .01 ? 1 : 0);
      q.setFromUnitVectors(fwd, tmp2.sub(tmp).normalize()); s3.setScalar(Math.max(1e-5, sz)); m.compose(tmp, q, s3); parcels.setMatrixAt(i, m);
      const hc = r.inbound ? C_HEAD : C_YEL;
      setG(i, tmp, hc, vis * op * (1 - sstep(.9, 1, hs)), (r.inbound ? .05 : .04) * lerp(1, .4, k));
      // source / client : pulsation au départ ou à l'arrivée
      const endP = r.inbound ? r.a : r.b, pulse = r.inbound ? Math.exp(-ph * 9) : (ph > trav ? Math.exp(-(ph - trav) * 9) : 0);
      setG(routes.length + i, endP, r.inbound ? (r.mat.uniforms.uA.value.x > .6 ? C_RED : C_MIST) : C_YEL, (.35 + 1.2 * pulse) * op, (r.inbound ? .035 : .028) * (1 + pulse) * lerp(1, .5, k));
      if (r.inbound && ph > trav) flash += Math.exp(-(ph - trav) * 14);
    });
    parcels.instanceMatrix.needsUpdate = true;
    setG(nG - 1, YARD, C_YEL, (.6 + .25 * Math.sin(t * 6) + Math.min(1.4, flash)) * (1 - .55 * sc), .09 * (1 - .6 * sc) + .03 * Math.min(1, flash));
    gGeo.attributes.position.needsUpdate = gGeo.attributes.aColor.needsUpdate = gGeo.attributes.aSize.needsUpdate = true;

    renderer.render(scene, camera);
  }

  /* ----- boucle ----- */
  let raf = 0, on = false, last = 0, tl = 0, pausedAt = -1e9;
  const frame = now => {
    raf = 0; if (!on) return;
    const dt = Math.min(.05, (now - last) / 1000); last = now; tl += dt;
    mx += (tmx - mx) * .05; my += (tmy - my) * .05;
    render(tl);
    raf = requestAnimationFrame(frame);
  };
  const STILL = 3.35;
  const resize = () => {
    W = Math.max(1, layer.clientWidth); H = Math.max(1, layer.clientHeight);
    const pr = Math.min(devicePixelRatio || 1, 2);
    renderer.setPixelRatio(pr); renderer.setSize(W, H, false);
    camera.aspect = W / H; bg.material.uniforms.uAsp.value = W / H;
    glowMat.uniforms.uH.value = H * pr / 2;
    if (!on || reduceMotion) render(reduceMotion ? STILL : tl);
  };
  new ResizeObserver(resize).observe(layer);

  return {
    play() {
      if (reduceMotion) { render(STILL); return; }
      if (on) return;
      if (performance.now() - pausedAt > 1200) tl = 0;   // chaque retour sur la scène rejoue le récit depuis le globe
      on = true; last = performance.now(); raf = requestAnimationFrame(frame);
    },
    pause() { if (on) pausedAt = performance.now(); on = false; if (raf) cancelAnimationFrame(raf); raf = 0; },
    pointer(px, py) { tmx = px; tmy = py; }
  };
}

/* ---------- la plateforme : maquette d'architecte posée sur un socle laqué ---------- */
function buildDiorama(root) {
  const std = (color, o = {}) => new THREE.MeshStandardMaterial({ color, roughness: .78, metalness: 0, ...o });
  const M = {
    paper: std(0xF2EEE6), paperD: std(0xDCD6CB), roof: std(0xE9E4DA, { roughness: .6 }),
    yellow: std(PAL.yellow, { roughness: .45, metalness: .15 }), red: std(PAL.red, { roughness: .55 }), blue: std(PAL.blue, { roughness: .5 }),
    mist: std(PAL.mist, { roughness: .6 }), dark: std(0x101820, { roughness: .6 }), rubber: std(0x171c24, { roughness: .85 }),
    steel: std(0x9fb2c6, { roughness: .32, metalness: .85 }), tree: std(0xB9CAE0, { roughness: .9 }),
    warm: new THREE.MeshStandardMaterial({ color: 0x1a1206, emissive: 0xffc566, emissiveIntensity: 1.6, roughness: .4 }),
    led: new THREE.MeshBasicMaterial({ color: 0xffd25a })
  };
  const rib = ribTexture(), box = boxTexture();
  const cont = c => std(c, { map: rib, roughness: .55, metalness: .25 });
  const CM = [cont(PAL.blue), cont(PAL.red), cont(0x8ea7c4), cont(0x1f3a5c), cont(0xE7E1D6)];
  const add = (geo, mat, x, y, z, parent = root, shadow = true) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.castShadow = shadow; m.receiveShadow = true; parent.add(m); return m; };
  const B = (w, h, d, mat, x, y, z, parent) => add(new THREE.BoxGeometry(w, h, d), mat, x, y + h / 2, z, parent);

  // socle laqué + liseré lumineux
  const slabGeo = new THREE.ExtrudeGeometry(roundRect(10, 10, 1.1), { depth: .7, bevelEnabled: true, bevelThickness: .12, bevelSize: .12, bevelSegments: 4, curveSegments: 10 });
  slabGeo.rotateX(-Math.PI / 2); slabGeo.translate(0, -.82, 0);
  add(slabGeo, new THREE.MeshPhysicalMaterial({ color: 0x10243b, roughness: .28, metalness: .55, clearcoat: 1, clearcoatRoughness: .12 }), 0, 0, 0);
  const ringS = roundRect(10.3, 10.3, 1.24); ringS.holes.push(roundRect(10.1, 10.1, 1.16));
  const ring = new THREE.ExtrudeGeometry(ringS, { depth: .07, bevelEnabled: false, curveSegments: 10 }); ring.rotateX(-Math.PI / 2);
  add(ring, M.led, 0, -.5, 0, root, false);
  const floorGeo = new THREE.ShapeGeometry(roundRect(9.95, 9.95, 1.05), 10); floorGeo.rotateX(-Math.PI / 2);
  { const p = floorGeo.attributes.position, uv = floorGeo.attributes.uv; for (let i = 0; i < p.count; i++) uv.setXY(i, (p.getX(i) + 5) / 10, 1 - (p.getZ(i) + 5) / 10); }
  add(floorGeo, new THREE.MeshStandardMaterial({ map: floorTexture(), roughness: .82 }), 0, .005, 0, root, false);

  // entrepôt à sheds
  const wh = new THREE.Group(); wh.position.set(-1.8, 0, -1.9); root.add(wh);
  B(5.2, 1.5, 3.8, M.paper, 0, 0, 0, wh);
  const saw = new THREE.Shape(); saw.moveTo(-2.6, 0); for (let i = 0; i < 4; i++) { saw.lineTo(-2.6 + (i + 1) * 1.3, .55); saw.lineTo(-2.6 + (i + 1) * 1.3, 0); }
  const roofG = new THREE.ExtrudeGeometry(saw, { depth: 3.8, bevelEnabled: false }); roofG.translate(0, 0, -1.9);
  add(roofG, M.roof, 0, 1.5, 0, wh);
  for (let i = 0; i < 4; i++) add(new THREE.BoxGeometry(.03, .42, 3.6), M.warm, -2.6 + (i + 1) * 1.3 - .02, 1.5 + .25, 0, wh, false);
  B(5.3, .08, .5, M.paperD, 0, 1.08, 2.1, wh);                            // auvent des quais
  [-0.6, .6, 1.8].forEach(x => { B(.86, .82, .06, M.dark, x, .02, 1.9, wh); add(new THREE.BoxGeometry(.7, .5, .02), M.warm, x, .45, 1.935, wh, false); });
  B(.9, .25, 1.0, M.paperD, -1.9, 0, 2.05, wh);                            // quai bas
  // bureaux
  const of = new THREE.Group(); of.position.set(-3.75, 0, .55); root.add(of);
  B(1.35, 2.25, 1.1, M.paper, 0, 0, 0, of);
  for (let f = 0; f < 3; f++) { add(new THREE.BoxGeometry(1.2, .16, .02), M.warm, 0, .45 + f * .66, .56, of, false); add(new THREE.BoxGeometry(.02, .16, .9), M.warm, .68, .45 + f * .66, 0, of, false); }
  B(1.45, .06, 1.2, M.paperD, 0, 2.25, 0, of);

  // cour à conteneurs
  const stacks = [[-3.8, [0, 2]], [-2.6, [3, 4]], [-1.4, [1]], [-3.8, [], 1]];
  stacks.forEach(([z, cs]) => cs.forEach((c, j) => B(2.4, .92, .9, CM[c], 3.1, j * .93, z)));
  // portique (RTG)
  const crane = new THREE.Group(); root.add(crane);
  [1.4, 4.8].forEach(x => { [-.6, .6].forEach(z => B(.15, 3.4, .15, M.yellow, x, 0, z, crane)); B(.24, .16, 1.5, M.yellow, x, 0, 0, crane); B(.16, .2, 1.36, M.yellow, x, 3.2, 0, crane); });
  [-.6, .6].forEach(z => B(3.6, .22, .16, M.yellow, 3.1, 3.4, z, crane));
  const trolley = new THREE.Group(); crane.add(trolley);
  B(.6, .26, 1.36, M.paperD, 0, 3.32, 0, trolley);
  const cables = [-.25, .25].map(z => add(new THREE.CylinderGeometry(.014, .014, 1, 5), M.steel, 0, 0, z, trolley, false));
  const hang = new THREE.Group(); trolley.add(hang);
  B(2.5, .1, .95, M.yellow, 0, .92, 0, hang); B(2.4, .92, .9, CM[2], 0, 0, 0, hang);
  // projecteurs
  [[1.1, -4.6], [4.85, -.3], [-4.7, -4.6], [4.7, 3.55]].forEach(([x, z]) => { add(new THREE.CylinderGeometry(.035, .05, 2.6, 6), M.steel, x, 1.3, z); add(new THREE.BoxGeometry(.28, .08, .18), M.warm, x, 2.62, z, root, false); });

  // convoyeur : sortie du quai droit → quai d'expédition
  const BY = .42;
  B(.62, .1, 2.15, M.rubber, 0, BY - .1, .55); B(4.05, .1, .62, M.rubber, 1.7, BY - .1, 1.6);
  [[-.34, .55, .05, 2.2], [.34, .5, .05, 2.0]].forEach(([x, z, w, d]) => B(w, .12, d, M.steel, x, BY - .06, z));
  B(3.75, .12, .05, M.steel, 1.85, BY - .06, 1.26); B(4.05, .12, .05, M.steel, 1.7, BY - .06, 1.94);
  for (let i = 0; i < 6; i++) { B(.06, BY - .1, .06, M.steel, -.25 + (i % 2) * .5, 0, .1 + Math.floor(i / 2) * .7); }
  for (let x = .4; x <= 3.6; x += .7) { B(.06, BY - .1, .06, M.steel, x, 0, 1.36); B(.06, BY - .1, .06, M.steel, x, 0, 1.84); }
  // borne d'expédition : départs vers les clients
  add(new THREE.CylinderGeometry(.42, .5, .3, 28), M.paperD, 3.95, .15, 1.6);
  const halo = add(new THREE.TorusGeometry(.43, .035, 8, 40), M.led, 3.95, .32, 1.6, root, false); halo.rotation.x = Math.PI / 2;

  // palettes au quai d'expédition
  const boxM = std(0xffffff, { map: box, roughness: .75 });
  [[1.9, 2.95], [2.55, 2.95], [3.2, 2.95], [2.2, 2.55]].forEach(([x, z], i) => {
    B(.55, .07, .55, M.paperD, x, 0, z);
    for (let j = 0; j < 2 + (i % 2); j++) B(.48, .26, .46, boxM, x + (j % 2 ? .02 : 0), .07 + j * .27, z);
  });
  // camions à quai
  const truck = (x, z, rot, cab) => {
    const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = rot; root.add(g);
    B(.66, .74, 2.2, M.paper, 0, .16, 0, g); B(.62, .62, .55, cab, 0, .14, 1.42, g); B(.5, .2, .02, M.dark, 0, .52, 1.70, g);
    [-0.7, -.45, .75, 1.45].forEach(zz => [-.3, .3].forEach(xx => { const w = add(new THREE.CylinderGeometry(.13, .13, .1, 12), M.dark, xx, .13, zz, g); w.rotation.z = Math.PI / 2; }));
    return g;
  };
  truck(-2.4, 1.35, 0, M.blue); truck(-1.2, 1.35, 0, M.red);
  const mover = truck(0, 4.3, Math.PI / 2, M.blue);
  // voitures et arbres de maquette
  [[-4.43, PAL.paper], [-3.95, PAL.mist], [-3.47, PAL.blue], [-2.99, PAL.paper]].forEach(([x, c], i) => i !== 3 && B(.3, .2, .62, std(c, { roughness: .4, metalness: .3 }), x, 0, 1.75));
  const treeGeo = new THREE.IcosahedronGeometry(.3, 2);
  [[-4.55, 2.7], [-4.0, 3.15], [-4.55, 3.55], [4.6, .1], [4.55, .75], [-4.6, -.5], [.3, -4.55], [-.6, -4.6], [4.6, 2.2]].forEach(([x, z], i) => {
    add(new THREE.CylinderGeometry(.03, .04, .5, 5), M.paperD, x, .25, z); const tr = add(treeGeo, M.tree, x, .62 + (i % 3) * .05, z); tr.scale.setScalar(.85 + (i % 3) * .15);
  });

  // colis sur le convoyeur
  const NB = 9, path = [new THREE.Vector3(0, BY, -.35), new THREE.Vector3(0, BY, 1.6), new THREE.Vector3(3.75, BY, 1.6)];
  const seg1 = path[0].distanceTo(path[1]), LEN = seg1 + path[1].distanceTo(path[2]);
  const belt = new THREE.InstancedMesh(new THREE.BoxGeometry(.4, .3, .36), boxM, NB); belt.castShadow = belt.receiveShadow = true; root.add(belt);
  const bm = new THREE.Matrix4(), bq = new THREE.Quaternion(), bs = new THREE.Vector3(), bp = new THREE.Vector3(), ey = new THREE.Vector3(0, 1, 0);

  return (t, sc) => {
    // portique : va-et-vient sur la cour, levage du conteneur
    const cp = Math.sin(t / LOOP * Math.PI * 2 * 2);
    crane.position.z = -2.55 + 1.05 * cp;
    trolley.position.x = 3.1;
    const hy = 2.1 + .3 * Math.cos(t / LOOP * Math.PI * 2 * 4); hang.position.y = hy;
    cables.forEach(c => { const top = 3.32, bot = hy + 1.02; c.scale.y = top - bot; c.position.y = (top + bot) / 2; });
    // camion sur la voie avant
    const u = fract(t / (LOOP / 2)); mover.position.x = lerp(-6.2, 6.2, u); const edge = sstep(0, .1, u) * (1 - sstep(.9, 1, u)); mover.scale.setScalar(Math.max(.001, edge));
    // convoyeur
    for (let i = 0; i < NB; i++) {
      const d = fract(t / (LOOP / 6) + i / NB) * LOOP / 6 * (LEN / (LOOP / 6)), s = d;
      if (s < seg1) bp.copy(path[0]).lerp(path[1], s / seg1); else bp.copy(path[1]).lerp(path[2], (s - seg1) / (LEN - seg1));
      const end = 1 - sstep(LEN - .45, LEN, s);
      bq.setFromAxisAngle(ey, s < seg1 ? 0 : Math.PI / 2 * sstep(seg1 - .2, seg1 + .3, s) + (i % 3) * .04);
      bs.set(1 + (i % 3) * .12, 1 + (i % 2) * .25, 1).multiplyScalar(Math.max(.001, end));
      bp.y = BY + .15 * bs.y; bm.compose(bp, bq, bs); belt.setMatrixAt(i, bm);
    }
    belt.instanceMatrix.needsUpdate = true;
    halo.material.color.setRGB(1, .82 + .1 * Math.sin(t * 5), .35);
  };
}
