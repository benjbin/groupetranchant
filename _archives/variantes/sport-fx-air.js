/* Groupe Tranchant — activités sportives (accueil) : effet du panneau PATROUILLE TRANCHANT.
   Contrat : mount(pane, { reduceMotion }) ; pane est le lien .sp-pane (photo .sp-img, canvas .sp-fx par-dessus).

   Un meeting aérien en 3D (three.js, un seul contexte WebGL, canvas transparent) par-dessus la photo :
   - la photo devient un plan « téléobjectif » : le Fouga de la photo crache ses fumigènes en continu,
     la caméra tremble à peine comme un opérateur qui suit l'avion, et le pointeur oriente le regard ;
   - une patrouille de Fouga Magister modélisés (fuselage bleu, bidons et nez jaunes, empennage papillon
     rouge et jaune, vernis brillant et reflets du ciel) enchaîne looping tricolore, croisement, passage
     au ras de l'objectif et éclatement ;
   - les fumées sont des volumes de bouffées éclairées par le soleil (atlas de normales généré à la volée),
     turbulentes, dispersées par le vent, voilées par la brume de distance ;
   - le jet de la photo est détouré (masque encodé ci-dessous) : la patrouille passe DERRIÈRE lui. */
import * as THREE from 'three';

const IW = 494, IH = 626;                 // photo 494x626-avion-02.jpg
// masque du jet de la photo : ligne de départ, puis par ligne des paires [début, fin) en base 64 sur 2 caractères
const MASK = '97:3Y4b.3M4m.3H4s.3B4w.3w4y.3r4z.3q4B.3r4C.3t4C.3y4B.3D4A.3G4x.3G4u.3G4p.3G4e.3G4a.3G4a.3G4a.3G4b.3G4b.3G4b.3G4b.3G4c.3G4c.3G4c.3G4d.3H4d.3H4d.3H4d.3H4e.3H4e.3H4e.3H4f.3H4f.3H4f.3H4g.3H4g.3H4g.3H4g.3H4h.3H4h.3H4h.3H4i.3H4i.3H4i.3H4i.3H4j.3H4j.3H4j.3H4k.3H4k.3H4k.3H4k.3H4l.3H4l.3I4l.3I4m.3I4m.3I4m.3I4n.3I4n.3I4n.3I4n.3I4o.3I4o.3I4o.3I4p.3I4p.3I4p.3I4p.3I4q.3I4q.3I4q.3I4r.3I4r.3I4r.3I4r.3I4s.3I4s.3I4s.3I4t.3I4t.3I4t.3I4u.3I4u.3I4u.3J4u.3J4v.3J4v.3J4v.3J4w.3J4w.3J4w.3J4w.3J4x.3J4x.3J4x.3J4y.3J4y.3J4y.3J4y.3J4z.3J4z.3J4z.3J4A.3J4A.3J4A.3J4B.3J4B.3J4B.3K4B.3K4C.3K4C.3K4C.3K4D.3K4D.3K4D.3K4D.3K4E.3K4E.3K4E.3K4E.3K4F.3K4F.3K4F.3K4G.3K4G.3K4G.3K4H.3K4H.3K4H.3K4I.3K4I.3K4I.3K4I.3K4J.3K4J.3K4J.3K4K.3K4K.3L4K.3L4K.3L4L.3L4L.3L4L.3L4M.3L4M.3L4M.1V1Z3L4M.1S203L4N.1M213L4N.1L223L4N.1L233L4O.1L243L4O.1L243L4O.1L253L4P.1L263L4P.1L263L4P.1M273L4P.1M283L4Q.1M283L4Q.1M293L4Q.1M293L4Q.1M2a3L4R.1M2b3L4R.1M2c3L4R.1M2c3M4R.1M2d3M4S.1M2e3H4S.1M2f3l3m3n3E3F4_.1M2f3b50.1M2g3250.1N2g2X50.1N2h2U50.1N2i2S50.1N2j2R50.1N2j2R51.1N2k2Q565g5m.1N2k2O5d5e5G.1N2l2M5W.1N2m2J66.1N2m2D6f6Q6Z.1N2n2B6p6O6-.1O2o2A6v6N70.1O2o2A6C6N71.1O2p2B6I6M71.1O2o2q2u2z72.1O72.1O72.1O72.1O73.1P75.1I76.1E77.1z78.1x78.1w77.1x76.1A75.1G73.1L72.1Q73.1P73.1P72.1P6L6O72.1P6H6P72.1Q6A6Q71.1Q2t2C6u6R6_.1Q2t2K6n6T6Y.1R2t2M2N2O6e.1R2s2Q6a.1Q2s2R65.1Q2s2S61.1Q2s2S5I5Q5R.1P2r2S5k5m5o5z5C.1P2r2T52.1P2r2X52.1P2q3252.1P2q3a52.1P2q3j52.1P2p3t52.1P2p3w3A3J3K3L52.1P2p3y3z3N51.1P2p3N4U.1P2o3N4U.1P2o3N4T.1P2o3N4T.1P2n3N4T.1P2n3N4T.1P2n3N4T.1P2n3N4S.1P2m3N4S.1P2m3N4S.1P2m3N4S.1P2m3N4R.1P2l3N4R.1P2l3N4R.1P2k3O4R.1P2k3O4R.1P2k3O4Q.1P2k3O4Q.1P2j3O4Q.1P2j3O4Q.1P2j3O4Q.1P2i3O4P.1P2i3O4P.1P2i3O4P.1P2i3O4P.1P2h3O4P.1P2h3O4P.1P2h3O4P.1P2g3O4O.1P2g3O4O.1P2g3O4O.1P2g3O4O.1P2f3O4N.1P2f3O4N.1P2f3O4M.1P2e3O4N.1P2e3O4M.1P2e3O4M.1P2d3O4M.1P2d3O4L.1P2d3O4L.1P2c3O4L.1P2c3O4L.1P2c3O4K.1P2c3O4K.1P2b3O4K.1P2b3O4K.1P2b3O4K.1P2b3O4J.1P2a3O4J.1P2a3P4J.1P2a3P4J.1P293P4J.1P293P4J.1P293P4J.1P293P4J.1P283P4I.1P283P4I.1P283P4I.1P273P4I.1P273P4H.1P273P4H.1P263P4H.1P263P4H.1P263P4G.1P263P4G.1P253P4F.1Q243P4G.1W233P4G.3P4F.3P4E.3P4F.3P4E.3P4E.3P4E.3P4E.3P4E.3P4D.3P4D.3P4D.3P4D.3P4C.3P4D.3Q4C.3P4C.3P4C.3P4B.3P4B.3P4B.3Q4B.3Q4B.3Q4B.3Q4A.3Q4z.3Q4z.3Q4z.3Q4z.3Q4y.3Q4y.3Q4y.3Q4y.3Q4y.3Q4x.3Q4x.3Q4x.3Q4x.3Q4x.3Q4w.3Q4w.3Q4w.3Q4w.3Q4w.3R4w.3R4w.3R4v.3R4v.3R4v.3R4v.3R4u.3R4u.3R4u.3R4u.3R4u.3R4u.3R4t.3R4t.3R4s.3R4t.3R4s.3R4r.3R4r.3R4r.3R4r.3R4r.3R4r.3R4r.3R4r.3R4q.3R4q.3R4p.3R4p.3R4p.3R4p.3R4p.3R4p.3R4p.3R4p.3S4o.3S4o.3S4o.3S4o.3S4o.3S4n.3S4m.3S4n.3S4n.3S4n.3S4m.3S4l.3S4r.3S4A.3S4F.3O4J.3J4L.3E4N.3B4O.3A4P.3B4P.3F4O.3K4N.3O4L.3T4J.3Z4F.454y';
const PHOTO_SMOKE = [[103, 270], [113, 308]]; // sorties des fumigènes de la photo (px image)
const D_PHOTO = 40;                        // distance virtuelle du jet de la photo (m)
const FOV = 22, TH = Math.tan(FOV / 2 * Math.PI / 180);
const SUN = new THREE.Vector3(-.42, .74, .52).normalize();
const SPEED_SCALE = 1;

/* ---------- utilitaires ---------- */
const v3 = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
const col = h => new THREE.Color(h);
let seedR = 1234567;
const rnd = () => (seedR = (seedR * 16807) % 2147483647) / 2147483647;

/* ---------- masque du jet de la photo -> texture ---------- */
function maskTexture() {
  const A = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ-_', n = s => A.indexOf(s[0]) * 64 + A.indexOf(s[1]);
  const [y0s, body] = MASK.split(':'), y0 = +y0s, data = new Uint8Array(IW * IH);
  body.split('.').forEach((row, k) => {
    const y = y0 + k, base = (IH - 1 - y) * IW;
    for (let i = 0; i < row.length; i += 4) { const a = n(row.substr(i, 2)), b = n(row.substr(i + 2, 2)); data.fill(255, base + a, base + b); }
  });
  const t = new THREE.DataTexture(data, IW, IH, THREE.RedFormat, THREE.UnsignedByteType);
  t.magFilter = t.minFilter = THREE.LinearFilter; t.needsUpdate = true;
  return t;
}

/* ---------- atlas de bouffées : densité (A) + normale (RGB), 4 variantes ---------- */
function puffAtlas() {
  const T = 128, S = T * 2, out = new Uint8Array(S * S * 4);
  const perm = new Uint8Array(512), val = new Float32Array(256);
  for (let i = 0; i < 256; i++) { perm[i] = i; val[i] = rnd(); }
  for (let i = 255; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [perm[i], perm[j]] = [perm[j], perm[i]]; }
  for (let i = 0; i < 256; i++) perm[i + 256] = perm[i];
  const h = (x, y) => val[perm[perm[x & 255] + (y & 255)]];
  const sm = t => t * t * (3 - 2 * t);
  const noise = (x, y) => { const xi = Math.floor(x), yi = Math.floor(y), xf = sm(x - xi), yf = sm(y - yi); const a = h(xi, yi), b = h(xi + 1, yi), c = h(xi, yi + 1), d = h(xi + 1, yi + 1); return a + (b - a) * xf + (c - a) * yf + (a - b - c + d) * xf * yf; };
  const fbm = (x, y) => { let s = 0, a = .5, f = 1; for (let o = 0; o < 5; o++) { s += a * noise(x * f, y * f); f *= 2.03; a *= .5; } return s; };
  const F = new Float32Array(T * T);
  for (let tile = 0; tile < 4; tile++) {
    const blobs = []; for (let i = 0; i < 9; i++) { const r = Math.sqrt(rnd()) * .42, a = rnd() * 6.283; blobs.push([Math.cos(a) * r, Math.sin(a) * r, .2 + rnd() * .24, .6 + rnd() * .5]); }
    const ox = tile * 31.7, oy = tile * 17.3;
    let mx = 0;
    for (let j = 0; j < T; j++) for (let i = 0; i < T; i++) {
      const u = (i + .5) / T * 2 - 1, v = (j + .5) / T * 2 - 1, rr = u * u + v * v;
      let b = 0; for (const [bx, by, br, bw] of blobs) { const d = ((u - bx) ** 2 + (v - by) ** 2) / (br * br); if (d < 1) b += bw * (1 - d) * (1 - d); }
      const n = fbm(u * 2.6 + ox, v * 2.6 + oy);
      let d = b * (.25 + 1.25 * n) * Math.max(0, 1 - rr) ** 1.8;
      F[j * T + i] = d; if (d > mx) mx = d;
    }
    for (let k = 0; k < T * T; k++) F[k] = Math.min(1, F[k] / mx * 1.15);
    const tx = (tile & 1) * T, ty = (tile >> 1) * T;
    for (let j = 0; j < T; j++) for (let i = 0; i < T; i++) {
      const g = (x, y) => F[Math.min(T - 1, Math.max(0, y)) * T + Math.min(T - 1, Math.max(0, x))];
      const d = g(i, j);
      // hauteur arrondie : sqrt de la densité, pour des bosses de chou-fleur
      const hx = Math.sqrt(g(i + 2, j)) - Math.sqrt(g(i - 2, j)), hy = Math.sqrt(g(i, j + 2)) - Math.sqrt(g(i, j - 2));
      let nx = -hx * 3.4, ny = -hy * 3.4, nz = 1; const l = Math.hypot(nx, ny, nz); nx /= l; ny /= l; nz /= l;
      const o = ((ty + j) * S + tx + i) * 4;
      out[o] = (nx * .5 + .5) * 255; out[o + 1] = (ny * .5 + .5) * 255; out[o + 2] = (nz * .5 + .5) * 255; out[o + 3] = d * 255;
    }
  }
  const t = new THREE.DataTexture(out, S, S, THREE.RGBAFormat);
  t.generateMipmaps = true; t.minFilter = THREE.LinearMipmapLinearFilter; t.magFilter = THREE.LinearFilter; t.needsUpdate = true;
  return t;
}

/* ---------- fumées : bouffées instanciées, tampon circulaire, mouvement calculé dans le shader ---------- */
const SMOKE_VS = /* glsl */`
attribute vec3 aP; attribute vec3 aV; attribute vec4 aD; // aD : naissance, graine, couleur, échelle
uniform float uTime, uLife, uR0, uR1, uGrow, uTurb, uOp, uFogD, uNear;
uniform vec3 uWind; uniform vec3 uCol[4];
varying vec2 vUv, vTile; varying float vA, vEr, vRot, vFog; varying vec3 vCol;
void main(){
  float age = uTime - aD.x, sd = aD.y;
  float life = uLife * (.8 + .4 * fract(sd * 7.31));
  if (age < 0. || age > life) { gl_Position = vec4(0., 0., -2., 1.); return; }
  float k = age / life;
  vec3 p = aP + aV * .6 * (1. - exp(-age / .6)) + uWind * age;
  // tourbillons cohérents dans l'espace (les bouffées voisines bougent ensemble) + un peu de bruit propre
  float A = uTurb * pow(age, .8) * aD.w;
  vec3 q = aP * .045 / aD.w;
  p += A * vec3(sin(q.y * 1.7 + q.z + age * .45) + .6 * sin(q.x * 3.1 - age * .7 + 1.3),
                sin(q.x * 1.3 + q.z * .7 + age * .38 + 2.) + .6 * sin(q.z * 2.9 + q.y + age * .6),
                sin(q.x * 1.1 + q.y * 1.9 + age * .5 + 4.) + .6 * sin(q.y * 3.3 - age * .55));
  p += A * .3 * vec3(sin(sd * 91.), sin(sd * 57. + 1.), sin(sd * 33. + 2.));
  float r = aD.w * (uR0 + (uR1 - uR0) * (1. - exp(-age / .9)) + uGrow * age) * (.75 + .5 * fract(sd * 13.7));
  vec4 mv = modelViewMatrix * vec4(p, 1.);
  float rot = sd * 6.2832 + age * (fract(sd * 3.3) - .5) * .6;
  float c = cos(rot), s = sin(rot);
  mv.xy += mat2(c, s, -s, c) * position.xy * r * 1.35;
  vUv = position.xy * .5 + .5;
  float tile = floor(fract(sd * 4.77) * 4.);
  vTile = vec2(mod(tile, 2.), floor(tile / 2.)) * .5;
  vRot = rot;
  float dens = uOp * min(1., age * 14.) * pow(1. - k, 1.3) * clamp(pow(uR0 * aD.w * 1.25 / r, .38), .22, 1.);
  dens *= smoothstep(uNear * .35, uNear, -mv.z);
  vA = dens;
  vEr = .1 + k * .5;
  vFog = 1. - exp(-pow(uFogD * -mv.z, 2.));
  vCol = uCol[int(aD.z + .5)];
  gl_Position = projectionMatrix * mv;
}`;
const SMOKE_FS = /* glsl */`
uniform sampler2D uTex; uniform vec3 uSunV, uUpV, uSunC, uSkyC, uGndC, uFogC; uniform vec2 uRes; uniform float uBottom;
varying vec2 vUv, vTile; varying float vA, vEr, vRot, vFog; varying vec3 vCol;
void main(){
  vec4 t = texture2D(uTex, vTile + clamp(vUv, .006, .994) * .5);
  float a = smoothstep(vEr, vEr + .36, t.a) * vA;
  a *= smoothstep(uBottom * .42, uBottom, gl_FragCoord.y / uRes.y);
  if (a < .002) discard;
  vec3 n = t.rgb * 2. - 1.;
  float c = cos(vRot), s = sin(vRot);
  n.xy = mat2(c, s, -s, c) * n.xy;
  n = normalize(n);
  float ndl = dot(n, uSunV);
  float sun = clamp(ndl * .7 + .3, 0., 1.);
  // le cœur dense d'une bouffée s'ombre lui-même côté opposé au soleil
  sun *= 1. - .35 * smoothstep(.35, 1., t.a) * clamp(-ndl + .3, 0., 1.);
  vec3 amb = mix(uGndC, uSkyC, dot(n, uUpV) * .5 + .5);
  vec3 col = vCol * (amb + uSunC * sun);
  col = mix(col, uFogC, vFog);
  gl_FragColor = vec4(col, a);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}`;

class Smoke {
  constructor(max, uniforms) {
    this.max = max; this.i = 0; this.s0 = 0; this.n = 0;
    const g = new THREE.InstancedBufferGeometry();
    g.setIndex([0, 1, 2, 0, 2, 3]);
    g.setAttribute('position', new THREE.Float32BufferAttribute([-1, -1, 0, 1, -1, 0, 1, 1, 0, -1, 1, 0], 3));
    this.P = new THREE.InstancedBufferAttribute(new Float32Array(max * 3), 3);
    this.V = new THREE.InstancedBufferAttribute(new Float32Array(max * 3), 3);
    this.D = new THREE.InstancedBufferAttribute(new Float32Array(max * 4).fill(-1e6), 4);
    for (const [k, a] of [['aP', this.P], ['aV', this.V], ['aD', this.D]]) { a.setUsage(THREE.DynamicDrawUsage); g.setAttribute(k, a); }
    g.instanceCount = max;
    this.mat = new THREE.ShaderMaterial({ uniforms, vertexShader: SMOKE_VS, fragmentShader: SMOKE_FS, transparent: true, depthWrite: false });
    this.mesh = new THREE.Mesh(g, this.mat); this.mesh.frustumCulled = false;
  }
  emit(p, vx, vy, vz, t, kind, sc) {
    const i = this.i; this.i = (i + 1) % this.max;
    if (this.n === 0) this.s0 = i; this.n++;
    this.P.array[i * 3] = p.x; this.P.array[i * 3 + 1] = p.y; this.P.array[i * 3 + 2] = p.z;
    this.V.array[i * 3] = vx; this.V.array[i * 3 + 1] = vy; this.V.array[i * 3 + 2] = vz;
    const d = this.D.array; d[i * 4] = t; d[i * 4 + 1] = rnd(); d[i * 4 + 2] = kind; d[i * 4 + 3] = sc;
  }
  flush() {
    if (!this.n) return;
    const n = Math.min(this.n, this.max), s0 = this.n >= this.max ? 0 : this.s0, c1 = Math.min(n, this.max - s0), c2 = n - c1;
    for (const a of [this.P, this.V, this.D]) {
      const k = a.itemSize; a.addUpdateRange(s0 * k, c1 * k); if (c2 > 0) a.addUpdateRange(0, c2 * k); a.needsUpdate = true;
    }
    this.n = 0;
  }
  reset() { this.D.array.fill(-1e6); this.n = this.max; this.flush(); }
}

/* ---------- le Fouga Magister : géométrie simple mais fidèle (ailes droites, bidons de bout d'aile, empennage papillon) ---------- */
function colorize(geo, f) {
  const p = geo.attributes.position, c = new Float32Array(p.count * 3), t = new THREE.Color();
  for (let i = 0; i < p.count; i++) { t.copy(f(p.getX(i), p.getY(i), p.getZ(i))); c[i * 3] = t.r; c[i * 3 + 1] = t.g; c[i * 3 + 2] = t.b; }
  geo.setAttribute('color', new THREE.BufferAttribute(c, 3));
  return geo;
}
function merge(geos) {
  const parts = geos.map(g => (g.index ? g.toNonIndexed() : g));
  const total = parts.reduce((s, g) => s + g.attributes.position.count, 0), out = new THREE.BufferGeometry();
  for (const name of ['position', 'normal', 'color']) {
    const arr = new Float32Array(total * 3); let o = 0;
    for (const g of parts) { arr.set(g.attributes[name].array, o); o += g.attributes[name].array.length; }
    out.setAttribute(name, new THREE.BufferAttribute(arr, 3));
  }
  parts.forEach(g => g.dispose()); geos.forEach(g => g.dispose());
  return out;
}
// profil NACA symétrique, bord de fuite fermé
function foil(n = 10) {
  const th = x => 5 * (.2969 * Math.sqrt(x) - .126 * x - .3516 * x * x + .2843 * x ** 3 - .1036 * x ** 4), pts = [];
  for (let i = n; i >= 0; i--) { const x = (1 - Math.cos(i / n * Math.PI)) / 2; pts.push([x, th(x)]); }
  for (let i = 1; i < n; i++) { const x = (1 - Math.cos(i / n * Math.PI)) / 2; pts.push([x, -th(x)]); }
  return pts;
}
const FOIL = foil();
// une section de surface portante : origine, direction d'envergure (ignorée ici), direction d'épaisseur, bord d'attaque z, corde, épaisseur relative
const section = (o, up, zLE, chord, t) => FOIL.map(([x, y]) => [o.x + up.x * y * t * chord, o.y + up.y * y * t * chord, zLE - x * chord]);
function loft(rings, f) {
  const m = rings[0].length, pos = [], idx = [];
  rings.forEach(r => r.forEach(v => pos.push(...v)));
  for (let k = 0; k < rings.length - 1; k++) for (let j = 0; j < m; j++) {
    const a = k * m + j, b = k * m + (j + 1) % m, c = (k + 1) * m + j, d = (k + 1) * m + (j + 1) % m; idx.push(a, b, d, a, d, c);
  }
  // capuchons (sommets dupliqués pour garder des normales nettes)
  for (const r of [rings[0], rings[rings.length - 1]]) {
    const base = pos.length / 3, cx = r.reduce((s, v) => s + v[0], 0) / m, cy = r.reduce((s, v) => s + v[1], 0) / m, cz = r.reduce((s, v) => s + v[2], 0) / m;
    r.forEach(v => pos.push(...v)); pos.push(cx, cy, cz);
    for (let j = 0; j < m; j++) idx.push(base + m, base + j, base + (j + 1) % m);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx); g.computeVertexNormals();
  return colorize(g, f);
}
function buildFouga() {
  const BLUE = col('#1E3C9E'), BLUE_D = col('#162C78'), YEL = col('#F9C83B'), RED = col('#D1182B'), DARK = col('#26282c'), WHITE = col('#F5F1EA');
  const geos = [];
  // fuselage tourné (axe z, nez vers +z), légèrement ovale
  const prof = [[0, -4.9], [.13, -5.0], [.22, -4.92], [.29, -4.6], [.36, -4.1], [.44, -3.4], [.52, -2.5], [.58, -1.5], [.62, -.5], [.62, .6], [.6, 1.5], [.55, 2.5], [.47, 3.3], [.36, 4.0], [.25, 4.5], [.14, 4.85], [.05, 5.0], [0, 5.04]];
  const fus = new THREE.LatheGeometry(prof.map(([r, z]) => new THREE.Vector2(r, z)), 24);
  fus.rotateX(Math.PI / 2); fus.scale(1, 1.1, 1);
  geos.push(colorize(fus, (x, y, z) => (z > 4.38 ? YEL : z < -4.88 ? DARK : (y < -.35 && z > -3 && z < 3.5 ? BLUE_D : BLUE))));
  // nacelles des réacteurs aux emplanture
  for (const sx of [-1, 1]) {
    const n = new THREE.SphereGeometry(1, 20, 12); n.scale(.42, .4, 2.3); n.translate(sx * .6, -.1, .1);
    geos.push(colorize(n, (x, y, z) => (z > 2.25 ? DARK : BLUE)));
  }
  // ailes droites effilées, dièdre léger
  const UPY = v3(0, 1, 0), dih = Math.tan(5 * Math.PI / 180);
  for (const sx of [-1, 1]) {
    const rings = [section(v3(sx * .5, -.12, 0), UPY, 1.25, 2.6, .14), section(v3(sx * 2.9, -.12 + 2.4 * dih, 0), UPY, 1.02, 1.95, .12), section(v3(sx * 5.25, -.12 + 4.75 * dih, 0), UPY, .8, 1.3, .1)];
    geos.push(loft(rings, (x, y, z) => (Math.abs(x) > 4.95 ? YEL : BLUE)));
    // bidon de bout d'aile
    const tk = new THREE.SphereGeometry(1, 22, 12); tk.scale(.3, .3, 1.45); tk.translate(sx * 5.42, -.12 + 4.75 * dih, .2);
    geos.push(colorize(tk, (x, y, z) => (z < -.95 ? RED : YEL)));
  }
  // empennage papillon (110° entre les deux plans), bord d'attaque jaune, arrière rouge
  const a = 35 * Math.PI / 180;
  for (const sx of [-1, 1]) {
    const dir = v3(sx * Math.cos(a), Math.sin(a), 0), thick = v3(-sx * Math.sin(a), Math.cos(a), 0), o = v3(sx * .14, .22, 0);
    const rings = [section(o, thick, -2.8, 1.95, .1), section(o.clone().addScaledVector(dir, 2.1), thick, -3.8, .95, .08)];
    geos.push(loft(rings, (x, y, z) => { const r = Math.abs(x) / Math.cos(a), le = -2.8 - (r / 2.1) * 1, ch = 1.95 - (r / 2.1); return (le - z) / ch < .5 ? YEL : RED; }));
  }
  // petit liseré blanc sous le nez (bande de livrée)
  const st = new THREE.CylinderGeometry(.5, .5, .12, 20, 1, true); st.rotateX(Math.PI / 2); st.scale(1.01, 1.1, 1); st.translate(0, 0, 3.05);
  geos.push(colorize(st, () => WHITE));
  const body = merge(geos);
  const can = new THREE.SphereGeometry(1, 24, 14, 0, Math.PI * 2, 0, Math.PI * .55); can.scale(.34, .42, 1.3); can.translate(0, .38, 1.75);
  return { body, can };
}

/* ---------- trajectoires : une « tortue » 3D (ligne droite, virage/looping incliné, tonneau) ---------- */
function path(start, fwd, up, cmds) {
  const STEP = 2, pts = [], ups = [], cum = [];
  const P = start.clone(), F = fwd.clone().normalize(), U = up.clone().addScaledVector(F, -up.dot(F)).normalize();
  let L = 0;
  const push = u => { pts.push(P.clone()); ups.push(u.clone()); cum.push(L); };
  push(U);
  for (const c of cmds) {
    if (c[0] === 'S') {
      const n = Math.max(1, Math.round(c[1] / STEP)), d = c[1] / n;
      for (let i = 0; i < n; i++) { P.addScaledVector(F, d); L += d; push(U); }
    } else if (c[0] === 'T') { // [T, angle°, rayon, inclinaison°] : tire sur le manche après avoir incliné
      const ang = c[1] * Math.PI / 180, roll = (c[3] || 0) * Math.PI / 180, Ub = U.clone().applyAxisAngle(F, roll);
      const ax = F.clone().cross(Ub).normalize(), arc = c[2] * ang, n = Math.max(2, Math.round(arc / STEP)), dth = ang / n, d = 2 * c[2] * Math.sin(dth / 2);
      for (let i = 0; i < n; i++) {
        F.applyAxisAngle(ax, dth / 2); P.addScaledVector(F, d); F.applyAxisAngle(ax, dth / 2); Ub.applyAxisAngle(ax, dth); L += d; push(Ub);
      }
      U.copy(Ub).applyAxisAngle(F, -roll);
    } else if (c[0] === 'R') { // [R, longueur, tours] : tonneau
      const n = Math.max(1, Math.round(c[1] / STEP)), d = c[1] / n, U0 = U.clone();
      for (let i = 0; i < n; i++) { P.addScaledVector(F, d); L += d; U.copy(U0).applyAxisAngle(F, (i + 1) / n * c[2] * Math.PI * 2); push(U); }
    }
  }
  return { pts, ups, cum, len: L };
}
function sample(pa, s, P, U, F) {
  const c = pa.cum; let lo = 0, hi = c.length - 1;
  while (hi - lo > 1) { const m = (lo + hi) >> 1; if (c[m] <= s) lo = m; else hi = m; }
  const f = (s - c[lo]) / ((c[hi] - c[lo]) || 1);
  P.lerpVectors(pa.pts[lo], pa.pts[hi], f); U.lerpVectors(pa.ups[lo], pa.ups[hi], f).normalize();
  F.subVectors(pa.pts[hi], pa.pts[lo]).normalize();
}

/* ---------- programme du meeting (secondes, boucle) ---------- */
const KIND = { white: 0, blue: 1, red: 2, photo: 3 };
const CYCLE = 34;
function program(asp) {
  const V = (xn, yn, d) => v3(xn * TH * d * asp, yn * TH * d, -d);
  const W = d => TH * d * asp, H = d => TH * d;
  return [
    { t: .2, jets: () => { // looping tricolore en formation serrée, plan du looping oblique
      const d = 640, st = V(1.3, -.3, d), f = v3(-1, .03, .42), pa = path(st, f, v3(0, 1, 0), [['S', W(d) * 1.15], ['T', 360, H(d) * .5, 0], ['S', W(d) * 3.2]]);
      return [{ pa, off: v3(0, 0, 0), kind: KIND.white, speed: 92 }, { pa, off: v3(-13, -1, -8), kind: KIND.blue, speed: 92 }, { pa, off: v3(13, -1, -8), kind: KIND.red, speed: 92 }];
    } },
    { t: 11.5, jets: () => { // croisement de deux solos, l'un en tonneau
      const d1 = 470, d2 = 420;
      const a = path(V(-1.35, .34, d1), v3(1, -.06, .12), v3(0, 1, 0), [['S', W(d1) * 1.05], ['R', W(d1) * .75, 1], ['S', W(d1) * 1.6]]);
      const b = path(V(1.35, -.08, d2), v3(-1, .08, -.1), v3(0, 1, 0), [['S', W(d2) * 3.4]]);
      return [{ pa: a, off: v3(), kind: KIND.blue, speed: 98 }, { pa: b, off: v3(), kind: KIND.red, speed: 98, delay: .3 }];
    } },
    { t: 17, jets: () => { // passage au ras de l'objectif : le jet sort de l'image
      const st = V(-1.25, .5, 900), end = v3(34, 7, -60), dir = end.clone().sub(st);
      const pa = path(st, dir, v3(0, 1, 0), [['S', dir.length() + 160]]);
      return [{ pa, off: v3(), kind: KIND.white, speed: 140, close: true }];
    } },
    { t: 23.5, jets: () => { // éclatement : quatre jets montent face au public puis s'ouvrent en gerbe
      const d = 760, base = V(.12, -1.25, d), out = [];
      [[-15, 9, -105, KIND.blue], [-5, 0, -30, KIND.white], [5, 0, 30, KIND.white], [15, 9, 105, KIND.red]].forEach(([x, back, turn, kind]) => {
        const st = base.clone().add(v3(x, -back, 0));
        const pa = path(st, v3(0, 1, 0), v3(0, 0, 1), [['S', H(d) * 1.12 - back], ['T', Math.abs(turn), 78, turn < 0 ? -90 : 90], ['S', W(d) * 3]]);
        out.push({ pa, off: v3(), kind, speed: 95 });
      });
      return out;
    } }
  ];
}

/* ---------- environnement : ciel dégradé + soleil, préfiltré pour des reflets crédibles ---------- */
function skyEnv(renderer) {
  const sc = new THREE.Scene(), geo = new THREE.SphereGeometry(50, 48, 24);
  const mat = new THREE.ShaderMaterial({
    side: THREE.BackSide, uniforms: { uSun: { value: SUN } },
    vertexShader: 'varying vec3 vD; void main(){ vD = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.); }',
    fragmentShader: `uniform vec3 uSun; varying vec3 vD;
      void main(){ vec3 d = normalize(vD); float y = d.y;
        vec3 zen = vec3(.08, .2, .52), hor = vec3(.62, .72, .86), gnd = vec3(.16, .17, .15);
        vec3 c = y > 0. ? mix(hor, zen, pow(y, .55)) : mix(hor * .8, gnd, pow(-y, .35));
        float s = max(dot(d, uSun), 0.);
        c += vec3(1., .95, .85) * (pow(s, 900.) * 120. + pow(s, 24.) * .6);
        gl_FragColor = vec4(c, 1.); }`
  });
  sc.add(new THREE.Mesh(geo, mat));
  const pm = new THREE.PMREMGenerator(renderer), rt = pm.fromScene(sc, 0);
  pm.dispose(); geo.dispose(); mat.dispose();
  return rt.texture;
}

/* ---------- montage ---------- */
export function mount(pane, { reduceMotion }) {
  const cv = pane.querySelector('.sp-fx'), fig = pane.querySelector('.sp-img'), img = fig && fig.querySelector('img');
  if (!cv || !img) return;
  let renderer;
  try { renderer = new THREE.WebGLRenderer({ canvas: cv, alpha: true, antialias: true, powerPreference: 'high-performance' }); }
  catch (e) { return; }
  renderer.setClearColor(0x000000, 0);
  renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.05;
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  if (!document.getElementById('sp-air-style')) {
    const s = document.createElement('style'); s.id = 'sp-air-style';
    s.textContent = `.sp-air .sp-img{will-change:transform;transform:scale(1.035)}
.sp-air .sp-fx{transition:filter 1.1s}
.sp-air:has(~ .sp-pane:hover) .sp-fx{filter:saturate(.35) brightness(.7)}`;
    document.head.appendChild(s);
  }

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(FOV, 1, 1, 6000);
  camera.rotation.order = 'YXZ';
  scene.add(camera);
  scene.environment = skyEnv(renderer); scene.environmentIntensity = .9;
  const HAZE = new THREE.Color().setRGB(.34, .44, .62);
  scene.fog = new THREE.FogExp2(HAZE, .00062);
  const sunL = new THREE.DirectionalLight(0xfff1dc, 3.2); sunL.position.copy(SUN).multiplyScalar(100); scene.add(sunL);
  scene.add(new THREE.HemisphereLight(0x9DB4D0, 0x3a3a34, .5));

  // avions
  const { body, can } = buildFouga();
  const bodyMat = new THREE.MeshPhysicalMaterial({ vertexColors: true, metalness: .2, roughness: .36, clearcoat: 1, clearcoatRoughness: .05, side: THREE.DoubleSide });
  const canMat = new THREE.MeshPhysicalMaterial({ color: 0x0c1622, metalness: .3, roughness: .04, clearcoat: 1, envMapIntensity: 1.6 });
  const pool = [];
  for (let i = 0; i < 5; i++) {
    const g = new THREE.Group(); g.add(new THREE.Mesh(body, bodyMat), new THREE.Mesh(can, canMat)); g.visible = false; scene.add(g);
    pool.push({ g, busy: false, q: new THREE.Quaternion(), last: v3(), hasLast: false });
  }

  // fumées
  const atlas = puffAtlas();
  const lightU = () => ({ uTex: { value: atlas }, uSunV: { value: v3() }, uUpV: { value: v3() }, uSunC: { value: new THREE.Color().setRGB(1.5, 1.4, 1.22) }, uSkyC: { value: new THREE.Color().setRGB(.34, .42, .58) }, uGndC: { value: new THREE.Color().setRGB(.3, .29, .27) }, uFogC: { value: HAZE }, uRes: { value: new THREE.Vector2(1, 1) }, uBottom: { value: .34 } });
  const COLS = [new THREE.Color().setRGB(.86, .86, .88), new THREE.Color().setRGB(.008, .04, .44), new THREE.Color().setRGB(.56, .012, .02), new THREE.Color().setRGB(.9, .91, .95)];
  const worldU = { ...lightU(), uTime: { value: 0 }, uLife: { value: 11 }, uR0: { value: 1.25 }, uR1: { value: 4.4 }, uGrow: { value: .9 }, uTurb: { value: 1.1 }, uOp: { value: .95 }, uFogD: { value: .00062 }, uNear: { value: 130 }, uWind: { value: v3(3.2, .35, -.6) }, uCol: { value: COLS } };
  const photoU = { ...lightU(), uTime: worldU.uTime, uLife: { value: 1.7 }, uR0: { value: .26 }, uR1: { value: .62 }, uGrow: { value: .32 }, uTurb: { value: .22 }, uOp: { value: .32 }, uFogD: { value: 0 }, uNear: { value: .001 }, uWind: { value: v3(-6.2, .1, 0) }, uCol: { value: COLS } };
  photoU.uRes = worldU.uRes; photoU.uSunV = worldU.uSunV; photoU.uUpV = worldU.uUpV;
  const smokeW = new Smoke(9000, worldU), smokeP = new Smoke(900, photoU);
  smokeW.mesh.renderOrder = 2; smokeP.mesh.renderOrder = 3;
  scene.add(smokeW.mesh); camera.add(smokeP.mesh);

  // détourage du jet de la photo : efface ce qui est derrière lui (la patrouille passe derrière)
  const holeMat = new THREE.ShaderMaterial({
    uniforms: { uMask: { value: maskTexture() } },
    vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.); }',
    fragmentShader: 'uniform sampler2D uMask; varying vec2 vUv; void main(){ float m = texture2D(uMask, vUv).r; if (m < .5) discard; gl_FragColor = vec4(0., 0., 0., smoothstep(.5, .85, m)); }',
    blending: THREE.CustomBlending, blendSrc: THREE.ZeroFactor, blendDst: THREE.OneMinusSrcAlphaFactor, blendSrcAlpha: THREE.ZeroFactor, blendDstAlpha: THREE.OneMinusSrcAlphaFactor, toneMapped: false
  });
  const hole = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), holeMat); hole.frustumCulled = false; camera.add(hole);

  // état
  const st = { w: 1, h: 1, pr: Math.min(devicePixelRatio || 1, 2), on: false, raf: 0, last: 0, t: 0, cyc: -1, next: 0, ema: 1 / 60, slowT: 0, look: { x: 0, y: 0, tx: 0, ty: 0 }, shake: 0, photoAcc: 0 };
  let prog = null;
  const active = [];
  const tmpP = v3(), tmpU = v3(), tmpF = v3(), tmpR = v3(), tmpN = v3(), tmpX = v3(), mtx = new THREE.Matrix4(), tq = new THREE.Quaternion();
  const objPos = { x: .5, y: .3 };
  const readObjPos = () => { const p = getComputedStyle(img).objectPosition.split(' ').map(s => parseFloat(s) / 100); if (p.length === 2 && p.every(isFinite)) { objPos.x = p[0]; objPos.y = p[1]; } };
  readObjPos();

  const resize = () => {
    st.w = Math.max(1, pane.clientWidth); st.h = Math.max(1, pane.clientHeight);
    renderer.setPixelRatio(st.pr); renderer.setSize(st.w, st.h, false);
    camera.aspect = st.w / st.h; camera.updateProjectionMatrix();
    worldU.uRes.value.set(st.w * st.pr, st.h * st.pr);
  };

  // correspondance pixel photo -> espace caméra (à la distance virtuelle du jet de la photo)
  const map = { ok: false, x0: 0, y0: 0, s: 1 };
  const updateMap = () => {
    const pr = pane.getBoundingClientRect(), ir = img.getBoundingClientRect();
    if (!ir.width || !pr.width) { map.ok = false; return; }
    const s = Math.max(ir.width / IW, ir.height / IH);
    map.x0 = ir.left - pr.left + (ir.width - IW * s) * objPos.x; map.y0 = ir.top - pr.top + (ir.height - IH * s) * objPos.y; map.s = s; map.ok = true;
    map.pw = pr.width; map.ph = pr.height;
  };
  const toCam = (px, py, D, out) => {
    const X = map.x0 + px * map.s, Y = map.y0 + py * map.s, a = map.pw / map.ph;
    return out.set((X / map.pw * 2 - 1) * D * TH * a, (1 - Y / map.ph * 2) * D * TH, -D);
  };

  const spawn = fig => {
    for (const j of fig.jets()) {
      const slot = pool.find(p => !p.busy); if (!slot) break;
      slot.busy = true; slot.hasLast = false; slot.snap = true;
      active.push(Object.assign(slot, { pa: j.pa, off: j.off, kind: j.kind, speed: j.speed * SPEED_SCALE, t0: st.t + (j.delay || 0), close: !!j.close }));
    }
  };

  const step = dt => {
    st.t += dt; const t = st.t;
    worldU.uTime.value = t;
    // programme
    const cyc = Math.floor(t / CYCLE), ct = t - cyc * CYCLE;
    if (cyc !== st.cyc) { st.cyc = cyc; st.next = 0; prog = program(camera.aspect); }
    while (st.next < prog.length && ct >= prog[st.next].t) spawn(prog[st.next++]);
    // avions
    for (let i = active.length - 1; i >= 0; i--) {
      const j = active[i], s = (t - j.t0) * j.speed;
      if (s < 0) { j.g.visible = false; continue; }
      if (s > j.pa.len) { j.g.visible = false; j.busy = false; active.splice(i, 1); continue; }
      sample(j.pa, s, tmpP, tmpU, tmpF);
      tmpR.crossVectors(tmpF, tmpU).normalize();
      tmpP.addScaledVector(tmpR, j.off.x).addScaledVector(tmpU, j.off.y).addScaledVector(tmpF, j.off.z);
      tmpX.crossVectors(tmpU, tmpF).normalize(); tmpU.crossVectors(tmpF, tmpX);
      mtx.makeBasis(tmpX, tmpU, tmpF); tq.setFromRotationMatrix(mtx);
      if (j.snap) { j.q.copy(tq); j.snap = false; } else j.q.slerp(tq, 1 - Math.exp(-dt * 9));
      j.g.position.copy(tmpP); j.g.quaternion.copy(j.q); j.g.visible = true;
      // fumigène : émis le long du trajet de la tuyère, espacement adapté à la distance
      tmpN.set(0, -.22, -5.15).applyQuaternion(j.q).add(tmpP);
      if (j.hasLast) {
        const dist = tmpN.length(), smoking = !(j.close && dist < 170), sp = Math.max(.5, dist * .0011), seg = tmpX.subVectors(tmpN, j.last), L = seg.length(), n = Math.min(60, Math.floor(L / sp));
        for (let k = 1; k <= (smoking ? n : 0); k++) {
          const f = k / n, e = tmpR.copy(j.last).addScaledVector(seg, f);
          smokeW.emit(e, (rnd() - .5) * 3, (rnd() - .5) * 3, (rnd() - .5) * 3, t - (1 - f) * dt, j.kind, j.close ? .45 : 1);
        }
        if (n) j.last.copy(tmpN);
      } else { j.last.copy(tmpN); j.hasLast = true; }
      if (j.close) { const d = tmpP.length(); if (d < 90) st.shake = Math.max(st.shake, 1 - d / 90); }
    }
    // fumigènes du jet de la photo
    if (map.ok) {
      st.photoAcc += dt;
      const every = 1 / 70;
      while (st.photoAcc >= every) {
        st.photoAcc -= every;
        for (const [px, py] of PHOTO_SMOKE) { toCam(px + 3, py, D_PHOTO + .3, tmpN); smokeP.emit(tmpN, (rnd() - .5) * .6, (rnd() - .5) * .4, 0, t - st.photoAcc, KIND.photo, 1); }
      }
    }
    smokeW.flush(); smokeP.flush();
  };

  const place = () => {
    // regard : pointeur + léger flottement de téléobjectif tenu à la main ; la photo suit exactement le décor
    const L = st.look; L.x += (L.tx - L.x) * .05; L.y += (L.ty - L.y) * .05;
    const t = st.t, sh = st.shake * st.shake;
    const sx = -L.x * 10 + 2.4 * Math.sin(t * .37) + 1.1 * Math.sin(t * .83 + 1) + sh * 3 * Math.sin(t * 61);
    const sy = -L.y * 7 + 1.8 * Math.sin(t * .29 + 2) + .9 * Math.sin(t * .71) + sh * 2.4 * Math.sin(t * 47 + 1);
    st.shake = Math.max(0, st.shake - .02);
    fig.style.transform = `translate3d(${sx.toFixed(2)}px,${sy.toFixed(2)}px,0) scale(1.035)`;
    camera.rotation.set(Math.atan(sy / (st.h / 2) * TH), Math.atan(sx / (st.w / 2) * TH * camera.aspect), 0);
    camera.updateMatrixWorld();
    // éclairage des fumées en espace vue
    const inv = camera.matrixWorldInverse;
    worldU.uSunV.value.copy(SUN).transformDirection(inv); worldU.uUpV.value.set(0, 1, 0).transformDirection(inv);
    // détourage calé sur la photo
    updateMap();
    if (map.ok) {
      toCam(IW / 2, IH / 2, D_PHOTO, hole.position);
      const a = map.pw / map.ph; hole.scale.set(IW * map.s / map.pw * 2 * D_PHOTO * TH * a, IH * map.s / map.ph * 2 * D_PHOTO * TH, 1);
      hole.visible = true;
    } else hole.visible = false;
  };

  const render = () => { place(); renderer.render(scene, camera); };

  const frame = now => {
    st.raf = 0; if (!st.on) return;
    const dt = Math.min(.05, (now - (st.last || now)) / 1000); st.last = now;
    if (dt > 0) {
      st.ema += (dt - st.ema) * .05;
      // garde-fou : si la machine peine, on baisse la définition
      if (st.ema > 1 / 38 && st.pr > 1 && now - st.slowT > 2000 && !window.__airFixedDPR) { st.slowT = now; st.pr = Math.max(1, st.pr - .25); resize(); }
      step(dt);
    }
    render();
    st.raf = requestAnimationFrame(frame);
  };

  const seek = T => { updateMap(); const h = 1 / 30; while (st.t + h <= T) step(h); render(); };
  pane.__air = { seek, st };

  resize();
  new ResizeObserver(() => { resize(); readObjPos(); if (reduceMotion) render(); }).observe(pane);

  if (reduceMotion) {
    // image fixe : la patrouille en plein looping, fumées déjà dessinées
    prog = null; place(); seek(5.6);
    return;
  }
  pane.addEventListener('pointermove', e => { const r = pane.getBoundingClientRect(); st.look.tx = (e.clientX - r.left) / r.width * 2 - 1; st.look.ty = (e.clientY - r.top) / r.height * 2 - 1; });
  pane.addEventListener('pointerleave', () => { st.look.tx = st.look.ty = 0; });
  new IntersectionObserver(([e]) => { st.on = e.isIntersecting; st.last = 0; if (st.on && !st.raf) st.raf = requestAnimationFrame(frame); }).observe(pane);
}
