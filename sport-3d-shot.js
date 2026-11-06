/* Groupe Tranchant — activités sportives (accueil) : scène 3D « shot », chapitre 02 en plein écran (variante G).
   Contrat : mount(host, { reduceMotion }) → { play(), pause(), progress(p), pointer(mx, my) }.

   Le plateau d'argile, au ralenti, en lumière dorée de fin d'après-midi, devant une lisière peinte très floue.
   - plan 1 : un plateau orange de 110 mm (dôme, couronne, épaule cannelée, jupe, dessous creux, argile mate) tourne
     sur lui-même en très gros plan ; la caméra glisse du dessus vers le dessous ;
   - plan 2 : de près, le plateau dérive ; l'impact : la fissure court dans la coque, puis il s'ouvre en éclats
     et en poudre orange éclairée à contre-jour ;
   - plan 3 : vu d'en dessous, contre le ciel, un plateau traverse le cadre et éclate à son tour.
   - rendu : PBR, environnement préfiltré doré, ombres douces, fond peint très flou (bokeh), profondeur de champ
     de macro (sujet net), halo, aberration, vignettage, AgX, grain.
   - progress(p) choisit le plan et fait avancer l'action ; sans défilement, chaque plan vit en boucle au ralenti.
     Les changements de plan se font par un flou de mise au point. La définition baisse d'elle-même si la machine peine. */
import * as THREE from 'three';

const D2R = Math.PI / 180;
const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const lerp = (a, b, t) => a + (b - a) * t;
const sstep = (a, b, x) => { const t = clamp((x - a) / (b - a)); return t * t * (3 - 2 * t); };
const v3 = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
function rng(seed) {
  return () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
}

/* ---------- séquence ---------- */
const PK = .56, PS = .6;              // défilement : la fissure part en PK, les éclats se séparent en PS
const FLYV = 1.6;                     // m de vol par unité de défilement
const SPINW = 90;                     // rad de rotation propre par unité de défilement
const TB = 3.1;                       // séparation des éclats
const TK = TB - .5;                   // impact : la fissure part

/* ---------- GLSL commun ---------- */
const NOISE = /* glsl */`
float h13(vec3 p){ p = fract(p * .1031); p += dot(p, p.zyx + 31.32); return fract((p.x + p.y) * p.z); }
float vn3(vec3 p){ vec3 i = floor(p), f = fract(p); f = f * f * (3. - 2. * f);
  return mix(mix(mix(h13(i), h13(i + vec3(1, 0, 0)), f.x), mix(h13(i + vec3(0, 1, 0)), h13(i + vec3(1, 1, 0)), f.x), f.y),
             mix(mix(h13(i + vec3(0, 0, 1)), h13(i + vec3(1, 0, 1)), f.x), mix(h13(i + vec3(0, 1, 1)), h13(i + vec3(1, 1, 1)), f.x), f.y), f.z); }
float fb3(vec3 p){ return .5 * vn3(p) + .25 * vn3(p * 2.03 + 1.7) + .125 * vn3(p * 4.01 + 3.1) + .0625 * vn3(p * 8.05 + 5.3); }`;

// fond peint : ciel doré, lisière sombre à contre-jour, trouées de lumière, champ ; repère « fond » : soleil vers −z, à 12°
const PAINT = /* glsl */`
const vec3 SUNB = vec3(0., .2079, -.9781);
vec3 paint(vec3 d, float soft){
  float el = asin(clamp(d.y, -1., 1.)), az = atan(d.x, -d.z);
  float ds = acos(clamp(dot(d, SUNB), -1., 1.)), side = exp(-abs(az) * 1.15);
  vec3 c = mix(vec3(1.1, .6, .26), vec3(.36, .37, .42), smoothstep(.0, .85, el));
  c *= .55 + .65 * side;
  c += vec3(1.5, .95, .5) * exp(-ds * ds * 9.) * .8 + vec3(1., .55, .25) * exp(-ds * 2.2) * .3;
  float top = .15 + .05 * sin(az * 2.3 + 1.) + .05 * (vn3(vec3(az * 9., 1.3, 0.)) - .5) + .035 * (vn3(vec3(az * 31., 4.1, 0.)) - .5) + .015 * (vn3(vec3(az * 90., 7.7, 0.)) - .5) * (1. - soft * 8.);
  float can = smoothstep(top + soft + .004, top - soft - .004, el);
  float holes = smoothstep(.56, .78, fb3(vec3(az * 26., el * 26., 2.))) * smoothstep(top - .3, top - .02, el) * (.4 + .6 * side);
  vec3 leaf = vec3(.030, .026, .012) * (.7 + 2.2 * side) + vec3(.16, .11, .025) * side * fb3(vec3(az * 14., el * 14., 5.));
  c = mix(c, mix(leaf, c * 1.05, holes), can);
  float gnd = smoothstep(.006 + soft * .5, -.03 - soft * .5, el);
  vec3 gc = vec3(.10, .075, .035) * (.45 + 1.1 * side) * (.8 + .4 * fb3(vec3(az * 6., el * 20., 9.)));
  return mix(c, gc, gnd);
}`;

/* ---------- le plateau de 110 mm (repère : axe +y, dessous en y = 0) ---------- */
const CLAY_OUT = [[0, 25.6], [19, 25.6], [21, 26.3], [23, 26.2], [24.5, 25.5], [31, 24.6], [45, 16.6], [48.5, 15.6], [51.5, 13.5], [53.4, 10.5], [54.6, 6], [55, 3.2], [54.6, 0], [53.6, 0], [51.4, .9], [50.8, 6], [48.6, 11.2], [44, 14.6], [40, 16.2], [28, 21.2], [14, 22.6], [0, 22.8]];
const ridge = (r, a) => (r > 31.5 && r < 44.5 ? Math.pow(.5 + .5 * Math.cos(a * 36), 2) * 1.1 * Math.sin(Math.PI * (r - 31.5) / 13) : 0) + (r > 6 && r < 18 ? .18 * Math.sin(r * 2.2) : 0);
function buildClay() {
  // profil rééchantillonné
  const P = [];
  for (let i = 0; i < CLAY_OUT.length - 1; i++) {
    const [r0, y0] = CLAY_OUT[i], [r1, y1] = CLAY_OUT[i + 1], n = Math.max(1, Math.ceil(Math.hypot(r1 - r0, y1 - y0) / 1.4));
    for (let k = 0; k < n; k++) P.push([lerp(r0, r1, k / n), lerp(y0, y1, k / n)]);
  }
  P.push(CLAY_OUT[CLAY_OUT.length - 1]);
  const g = new THREE.LatheGeometry(P.map(([r, y]) => new THREE.Vector2(Math.max(r, .001) / 1000, y / 1000)), 288);
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), y = p.getY(i), z = p.getZ(i), r = Math.hypot(x, z) * 1000;
    if (y * 1000 > r * .0 + 14 && y * 1000 > 24.6 - (r - 31) * .6 - .2) p.setY(i, y + ridge(r, Math.atan2(z, x)) / 1000);
  }
  g.computeVertexNormals();
  return g;
}
// éclats : surface moyenne du plateau aplatie en coordonnées polaires géodésiques, découpée en cellules de Voronoï,
// bords secoués ; chaque éclat a l'épaisseur de la coque (3,2 mm) et des tranches cassées
const CLAY_MID = [[0, 24.3], [19, 24.3], [22, 24.9], [24.5, 24.2], [31, 23.3], [45, 15.3], [49, 13.6], [52, 10.8], [53.3, 6], [53.5, .6]];
function buildShards(R, count) {
  const seg = []; let S = 0;
  for (let i = 0; i < CLAY_MID.length - 1; i++) { const l = Math.hypot(CLAY_MID[i + 1][0] - CLAY_MID[i][0], CLAY_MID[i + 1][1] - CLAY_MID[i][1]); seg.push(l); S += l; }
  const mid = s => {
    s = clamp(s, 0, S - 1e-6); let i = 0; while (i < seg.length - 1 && s > seg[i]) { s -= seg[i]; i++; }
    const t = s / seg[i], a = CLAY_MID[i], b = CLAY_MID[i + 1], dr = b[0] - a[0], dy = b[1] - a[1], l = Math.hypot(dr, dy);
    return [lerp(a[0], b[0], t), lerp(a[1], b[1], t), -dy / l, dr / l];
  };
  const map = (x, y, off, ridgeOn) => {
    const s = Math.hypot(x, y), th = Math.atan2(y, x), [r, yy, nr, ny] = mid(s);
    let rr = r + nr * off, h = yy + ny * off; if (ridgeOn && off > 0 && ny > .3) h += ridge(rr, th);
    return [Math.cos(th) * rr / 1000, h / 1000, Math.sin(th) * rr / 1000, Math.cos(th) * nr * Math.sign(off), ny * Math.sign(off), Math.sin(th) * nr * Math.sign(off)];
  };
  const sites = [];
  for (let k = 0; k < count; k++) { const a = R() * Math.PI * 2, r = (k === 0 ? 0 : Math.pow(R(), .55)) * S * .97; sites.push([Math.cos(a) * r, Math.sin(a) * r]); }
  const out = [];
  for (let k = 0; k < count; k++) {
    // cellule : disque (64 côtés) coupé par les médiatrices
    let poly = []; for (let i = 0; i < 64; i++) { const a = i / 64 * Math.PI * 2; poly.push([Math.cos(a) * S, Math.sin(a) * S, 1]); }
    const [cx, cy] = sites[k];
    for (let j = 0; j < count; j++) {
      if (j === k) continue;
      const [ox, oy] = sites[j], nx = ox - cx, ny = oy - cy, m = (nx * (ox + cx) + ny * (oy + cy)) / 2, np = [];
      for (let i = 0; i < poly.length; i++) {
        const A = poly[i], B = poly[(i + 1) % poly.length], da = nx * A[0] + ny * A[1] - m, db = nx * B[0] + ny * B[1] - m;
        if (da <= 0) np.push(A);
        if ((da < 0) !== (db < 0)) { const t = da / (da - db); np.push([lerp(A[0], B[0], t), lerp(A[1], B[1], t), 0]); }
      }
      poly = np; if (poly.length < 3) break;
    }
    if (poly.length < 3) continue;
    // contour secoué (les coupes ne sont pas des lignes droites)
    const ring = [];
    for (let i = 0; i < poly.length; i++) {
      const A = poly[i], B = poly[(i + 1) % poly.length], L = Math.hypot(B[0] - A[0], B[1] - A[1]), n = Math.max(1, Math.round(L / 1.6));
      const rim = A[2] && B[2], px = -(B[1] - A[1]) / (L || 1), py = (B[0] - A[0]) / (L || 1);
      for (let q = 0; q < n; q++) { const t = q / n, j = rim || q === 0 ? 0 : (R() - .5) * 1.5; ring.push([lerp(A[0], B[0], t) + px * j, lerp(A[1], B[1], t) + py * j]); }
    }
    const pos = [], nor = [], col = [];
    const v = (p, c, e) => { pos.push(p[0], p[1], p[2]); nor.push(p[3], p[4], p[5]); col.push(c, e, c); };   // g : proximité du bord (0 au centre, 1 sur la cassure)
    const M = 5;
    for (let i = 0; i < ring.length; i++) {
      const A = ring[i], B = ring[(i + 1) % ring.length];
      for (let m = 0; m < M; m++) {
        const t0 = m / M, t1 = (m + 1) / M;
        const P = (p, t) => [cx + (p[0] - cx) * t, cy + (p[1] - cy) * t];
        const a0 = P(A, t0), b0 = P(B, t0), a1 = P(A, t1), b1 = P(B, t1);
        for (const off of [1.6, -1.6]) {
          const c = off > 0 ? 1 : .62, q = [a0, a1, b1, b0].map(p => map(p[0], p[1], off, true));
          if (off > 0) { v(q[0], c, t0); v(q[2], c, t1); v(q[1], c, t1); if (m) { v(q[0], c, t0); v(q[3], c, t0); v(q[2], c, t1); } }
          else { v(q[0], c, t0); v(q[1], c, t1); v(q[2], c, t1); if (m) { v(q[0], c, t0); v(q[2], c, t1); v(q[3], c, t0); } }
        }
      }
      // tranche cassée
      const oa = map(A[0], A[1], 1.6, true), ob = map(B[0], B[1], 1.6, true), ia = map(A[0], A[1], -1.6), ib = map(B[0], B[1], -1.6);
      const e1 = v3(ob[0] - oa[0], ob[1] - oa[1], ob[2] - oa[2]), e2 = v3(ia[0] - oa[0], ia[1] - oa[1], ia[2] - oa[2]), n = e1.cross(e2).normalize();
      for (const p of [oa, ia, ib, oa, ib, ob]) { pos.push(p[0], p[1], p[2]); nor.push(n.x, n.y, n.z); col.push(.25, 1, .25); }
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3)); g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
    g.computeBoundingBox(); const c = g.boundingBox.getCenter(v3()); g.translate(-c.x, -c.y, -c.z); g.computeBoundingSphere();
    out.push({ g, c });
  }
  out.sites = sites; out.S = S;
  return out;
}

/* ---------- matériaux PBR patchés : repère objet, occlusion, relief, profondeur dans l'alpha ---------- */
const SHARED = {
  uSunW: { value: v3(0, 1, 0) }, uT: { value: 0 }, uDap: { value: 0 }
};

function pbr(key, params, o = {}) {
  const m = new THREE.MeshPhysicalMaterial(params);
  m.customProgramCacheKey = () => 'shot-' + key;
  m.onBeforeCompile = sh => {
    Object.assign(sh.uniforms, SHARED, o.u || {});
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vOP, vON, vWP, vAX, vAY, vAZ;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvOP = position; vON = objectNormal; vAX = normalize(normalMatrix * vec3(1., 0., 0.)); vAY = normalize(normalMatrix * vec3(0., 1., 0.)); vAZ = normalize(normalMatrix * vec3(0., 0., 1.));')
      .replace('#include <project_vertex>', '#include <project_vertex>\nvWP = (modelMatrix * vec4(transformed, 1.)).xyz;');
    let fs = sh.fragmentShader
      .replace('#include <common>', `#include <common>
        varying vec3 vOP, vON, vWP, vAX, vAY, vAZ; uniform vec3 uSunW; uniform float uT, uDap;
        ${NOISE}${o.head || ''}
        float dapple(vec3 w){ vec2 q = (w.xz - w.y * uSunW.xz / max(uSunW.y, .1)) * 7.;
          float n = vn3(vec3(q + uT * .035, uT * .05)) * .62 + vn3(vec3(q * 2.7 - uT * .05, 3.)) * .38; return mix(1., .25 + 1.15 * smoothstep(.36, .62, n), uDap); }`)
      .replace('#include <color_fragment>', `#include <color_fragment>
        vec3 P = vOP, N0 = normalize(vON), nObj = N0; float occ = 1., rgh = 0., ccM = 1., ccR = 0., mtl = -1., bmp = 0.; vec3 trans = vec3(0.);
        vec3 Vv = normalize(vViewPosition);
        ${o.color || ''}`)
      .replace('#include <roughnessmap_fragment>', '#include <roughnessmap_fragment>\nroughnessFactor = clamp(roughnessFactor + rgh, .04, 1.);')
      .replace('#include <metalnessmap_fragment>', '#include <metalnessmap_fragment>\nif (mtl >= 0.) metalnessFactor = mtl;')
      .replace('#include <normal_fragment_maps>', '#include <normal_fragment_maps>\nif (bmp > .5) normal = normalize(mat3(vAX, vAY, vAZ) * nObj) * faceDirection;')
      .replace('#include <clearcoat_normal_fragment_begin>', THREE.ShaderChunk.clearcoat_normal_fragment_begin.replace('vec3 clearcoatNormal = nonPerturbedNormal', 'vec3 clearcoatNormal = normal'))
      .replace('#include <lights_physical_fragment>', THREE.ShaderChunk.lights_physical_fragment
        .replace('material.clearcoat = clearcoat;', 'material.clearcoat = clearcoat * ccM;')
        .replace('material.clearcoatRoughness = clearcoatRoughness;', 'material.clearcoatRoughness = clamp(clearcoatRoughness + ccR, .03, 1.);'))
      .replace('#include <aomap_fragment>', `#include <aomap_fragment>
        { float dp = dapple(vWP); reflectedLight.directDiffuse *= dp * mix(1., occ, .35); reflectedLight.directSpecular *= dp;
          reflectedLight.indirectDiffuse *= occ;
          #if defined( USE_CLEARCOAT )
            clearcoatSpecularIndirect *= occ; clearcoatSpecularDirect *= dp;
          #endif
          reflectedLight.indirectSpecular *= computeSpecularOcclusion(saturate(dot(geometryNormal, geometryViewDir)), occ, material.roughness);
          reflectedLight.directDiffuse += trans * dp; }`)
      .replace('#include <dithering_fragment>', '#include <dithering_fragment>\ngl_FragColor.a = vViewPosition.z;');
    sh.fragmentShader = fs;
  };
  return m;
}
// relief : gradient numérique d'une hauteur h(P) dans le plan tangent (repère objet)
const BUMP = (expr, amp) => `{
  vec3 T1 = normalize(abs(N0.y) < .9 ? cross(N0, vec3(0., 1., 0.)) : cross(N0, vec3(1., 0., 0.))), T2 = cross(N0, T1);
  float e = .00012; vec3 Q = P; float h0 = ${expr}; Q = P + T1 * e; float h1 = ${expr}; Q = P + T2 * e; float h2 = ${expr};
  nObj = normalize(N0 - (${amp}) * ((h1 - h0) / e * T1 + (h2 - h0) / e * T2)); bmp = 1.; }`;

/* ---------- particules : fumée et poudre (instancées, mouvement dans le shader, triées par la profondeur de scène) ---------- */
function puffAtlas(R) {
  const T = 128, S = T * 2, out = new Uint8Array(S * S * 4);
  const perm = new Uint8Array(512), val = new Float32Array(256);
  for (let i = 0; i < 256; i++) { perm[i] = i; val[i] = R(); }
  for (let i = 255; i > 0; i--) { const j = Math.floor(R() * (i + 1)); [perm[i], perm[j]] = [perm[j], perm[i]]; }
  for (let i = 0; i < 256; i++) perm[i + 256] = perm[i];
  const h = (x, y) => val[perm[perm[x & 255] + (y & 255)]], sm = t => t * t * (3 - 2 * t);
  const noise = (x, y) => { const xi = Math.floor(x), yi = Math.floor(y), xf = sm(x - xi), yf = sm(y - yi); const a = h(xi, yi), b = h(xi + 1, yi), c = h(xi, yi + 1), d = h(xi + 1, yi + 1); return a + (b - a) * xf + (c - a) * yf + (a - b - c + d) * xf * yf; };
  const fbm = (x, y) => { let s = 0, a = .5, f = 1; for (let o = 0; o < 5; o++) { s += a * noise(x * f, y * f); f *= 2.03; a *= .5; } return s; };
  const F = new Float32Array(T * T);
  for (let tile = 0; tile < 4; tile++) {
    const blobs = []; for (let i = 0; i < 9; i++) { const r = Math.sqrt(R()) * .42, a = R() * 6.283; blobs.push([Math.cos(a) * r, Math.sin(a) * r, .2 + R() * .24, .6 + R() * .5]); }
    let mx = 0;
    for (let j = 0; j < T; j++) for (let i = 0; i < T; i++) {
      const u = (i + .5) / T * 2 - 1, v = (j + .5) / T * 2 - 1, rr = u * u + v * v;
      let b = 0; for (const [bx, by, br, bw] of blobs) { const d = ((u - bx) ** 2 + (v - by) ** 2) / (br * br); if (d < 1) b += bw * (1 - d) * (1 - d); }
      const d = b * (.25 + 1.25 * fbm(u * 2.6 + tile * 31.7, v * 2.6 + tile * 17.3)) * Math.max(0, 1 - rr) ** 1.8;
      F[j * T + i] = d; if (d > mx) mx = d;
    }
    for (let k = 0; k < T * T; k++) F[k] = Math.min(1, F[k] / mx * 1.15);
    const tx = (tile & 1) * T, ty = (tile >> 1) * T, g = (x, y) => F[clamp(y, 0, T - 1) * T + clamp(x, 0, T - 1)];
    for (let j = 0; j < T; j++) for (let i = 0; i < T; i++) {
      const hx = Math.sqrt(g(i + 2, j)) - Math.sqrt(g(i - 2, j)), hy = Math.sqrt(g(i, j + 2)) - Math.sqrt(g(i, j - 2));
      let nx = -hx * 3.4, ny = -hy * 3.4, nz = 1; const l = Math.hypot(nx, ny, nz); nx /= l; ny /= l; nz /= l;
      const o = ((ty + j) * S + tx + i) * 4;
      out[o] = (nx * .5 + .5) * 255; out[o + 1] = (ny * .5 + .5) * 255; out[o + 2] = (nz * .5 + .5) * 255; out[o + 3] = g(i, j) * 255;
    }
  }
  const t = new THREE.DataTexture(out, S, S, THREE.RGBAFormat);
  t.generateMipmaps = true; t.minFilter = THREE.LinearMipmapLinearFilter; t.magFilter = THREE.LinearFilter; t.needsUpdate = true;
  return t;
}
const PART_VS = /* glsl */`
attribute vec3 aP, aV; attribute vec4 aB, aK;   // aB : naissance, graine, durée, rayon ; aK : type, freinage, montée, croissance
uniform float uPh, uK, uF, uPix, uFade, uTB, uT; uniform vec3 uCarry;
varying vec2 vUv, vTile; varying float vA, vEr, vRot, vZ; varying vec3 vCol; varying float vType;
uniform vec3 uCol0, uCol1;
void main(){
  float age = uPh - aB.x, life = aB.z, sd = aB.y;
  if (age < 0. || age > life) { gl_Position = vec4(0., 0., -2., 1.); return; }
  float k = age / life, tau = aK.y;
  vec3 p = aP + aV * tau * (1. - exp(-age / tau));
  p.y += aK.z * age * age * .5;
  p += uCarry * (min(uPh, uTB) - uTB);   // né avant la séparation : suit le plateau
  p += .004 * min(age, 1.) * vec3(sin(uT * .31 + sd * 40.), .5 * sin(uT * .23 + sd * 23.), sin(uT * .27 + sd * 31.));   // dérive lente, vivante à l'arrêt
  float A = (.003 + .012 * aK.w) * pow(age, .9);
  p += A * vec3(sin(p.y * 90. + age * .9 + sd * 20.), .6 * sin(p.x * 70. + age * .7 + sd * 9.), sin(p.y * 60. - age * .8 + sd * 13.));
  float r = aB.w * (1. + aK.w * age * (.7 + .6 * fract(sd * 5.1)) + .6 * (1. - exp(-age * 3.)));
  vec4 mv = modelViewMatrix * vec4(p, 1.);
  float d = -mv.z, coc = min(abs(uK * (1. - uF / d)), 2.2 * uK), rb = sqrt(r * r + pow(coc * d * uPix * .5, 2.));
  float rot = sd * 6.2832 + age * (fract(sd * 3.3) - .5) * .8, c = cos(rot), s = sin(rot);
  mv.xy += mat2(c, s, -s, c) * position.xy * rb * 1.3;
  vUv = position.xy * .5 + .5;
  float tile = floor(fract(sd * 4.77) * 4.); vTile = vec2(mod(tile, 2.), floor(tile / 2.)) * .5;
  vRot = rot; vZ = d; vType = aK.x;
  vA = min(1., age * 12.) * pow(1. - k, 1.4) * (r * r) / (rb * rb) * uFade * smoothstep(.012, .03, d);
  vEr = .05 + k * .55;
  vCol = aK.x < .5 ? uCol0 : uCol1;
  gl_Position = projectionMatrix * mv;
}`;
const PART_FS = /* glsl */`
uniform sampler2D uTex, tScene; uniform vec2 uRes; uniform vec3 uSunV, uSunC, uAmb; uniform float uOp0, uOp1, uSoft, uGauss;
varying vec2 vUv, vTile; varying float vA, vEr, vRot, vZ; varying vec3 vCol; varying float vType;
void main(){
  vec4 t = texture2D(uTex, vTile + clamp(vUv, .006, .994) * .5);
  float r = length(vUv - .5) * 2.;
  float soft = mix((.55 + .45 * t.a) * pow(smoothstep(1., .0, r), 1.6), exp(-r * r * 3.4) * (1. - smoothstep(.8, 1., r)) * (.8 + .2 * t.a), uGauss);
  float a = mix(smoothstep(vEr, vEr + .5, t.a), soft, uSoft) * vA * (vType < .5 ? uOp0 : uOp1);
  float sz = texture2D(tScene, gl_FragCoord.xy / uRes).a;
  a *= clamp((sz - vZ) / (.004 + vZ * .03), 0., 1.);
  if (a < .002) discard;
  vec3 n = t.rgb * 2. - 1.; float c = cos(vRot), s = sin(vRot); n.xy = mat2(c, s, -s, c) * n.xy; n = normalize(mix(n, vec3((vUv - .5) * 1.6, .7), uGauss));
  float ndl = dot(n, uSunV);
  // diffusion avant : la poudre et la fumée s'allument à contre-jour, les bords fins davantage
  float fw = pow(max(-uSunV.z, 0.), 3.);
  float thin = mix(1. - smoothstep(.2, .9, t.a), smoothstep(.15, 1., r), uGauss);
  vec3 L = uAmb * (.6 + .4 * n.y) + uSunC * (clamp(ndl * .6 + .4, 0., 1.) * .45 * (1. - .4 * t.a) + fw * (.35 + 2.2 * thin * thin));
  gl_FragColor = vec4(vCol * L * a, a);
}`;
function particleMesh(n, tex, U) {
  const g = new THREE.InstancedBufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute([-1, -1, 0, 1, -1, 0, 1, 1, 0, -1, 1, 0], 3)); g.setIndex([0, 1, 2, 0, 2, 3]);
  const A = { aP: new Float32Array(n * 3), aV: new Float32Array(n * 3), aB: new Float32Array(n * 4), aK: new Float32Array(n * 4) };
  for (const [k, a] of Object.entries(A)) g.setAttribute(k, new THREE.InstancedBufferAttribute(a, k === 'aP' || k === 'aV' ? 3 : 4));
  g.instanceCount = n;
  const m = new THREE.ShaderMaterial({ uniforms: Object.assign({ uTex: { value: tex } }, U), vertexShader: PART_VS, fragmentShader: PART_FS, transparent: true, depthWrite: false, depthTest: false,
    blending: THREE.CustomBlending, blendSrc: THREE.OneFactor, blendDst: THREE.OneMinusSrcAlphaFactor, blendSrcAlpha: THREE.OneFactor, blendDstAlpha: THREE.OneMinusSrcAlphaFactor });
  const me = new THREE.Mesh(g, m); me.frustumCulled = false;
  let i = 0;
  me.push = (p, v, birth, seed, life, r, type, tau, rise, grow) => {
    if (i >= n) return;
    A.aP.set([p.x, p.y, p.z], i * 3); A.aV.set([v.x, v.y, v.z], i * 3); A.aB.set([birth, seed, life, r], i * 4); A.aK.set([type, tau, rise, grow], i * 4); i++;
  };
  me.done = () => { g.instanceCount = i; for (const k of Object.keys(A)) g.attributes[k].needsUpdate = true; };
  return me;
}
// poussières dans le rayon de soleil : petites, nettes au point, en disques de bokeh hors du plan
const DUST_VS = /* glsl */`
attribute vec4 aS; uniform float uT, uK, uF, uPix; uniform vec3 uC, uBox;
varying vec2 vUv; varying float vA, vZ;
void main(){
  vec3 p = uC + (fract(aS.xyz + vec3(.011, .006, -.008) * uT * (.5 + aS.w) + .05 * sin(uT * .3 + aS.w * 20.)) - .5) * uBox;
  vec4 mv = modelViewMatrix * vec4(p, 1.);
  float d = -mv.z, coc = min(abs(uK * (1. - uF / d)), 2.2 * uK), r = .00012 + .0001 * aS.w, rb = max(r, coc * d * uPix * .5);
  mv.xy += position.xy * rb;
  vUv = position.xy; vZ = d;
  vA = (r * r) / (rb * rb) * smoothstep(.02, .05, d) * (.4 + .6 * fract(aS.w * 7.3));
  gl_Position = projectionMatrix * mv;
}`;
const DUST_FS = /* glsl */`
uniform sampler2D tScene; uniform vec2 uRes; uniform vec3 uGlow; varying vec2 vUv; varying float vA, vZ;
void main(){
  float r = length(vUv); if (r > 1.) discard;
  float sz = texture2D(tScene, gl_FragCoord.xy / uRes).a;
  float a = vA * smoothstep(1., .82, r) * (.75 + .35 * smoothstep(.55, .95, r)) * step(vZ, sz);
  gl_FragColor = vec4(uGlow * a, 0.);
}`;

/* ---------- passes : tuiles de flou proche, profondeur de champ (demi-définition), composition, finition ---------- */
const FSQ_VS = 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0., 1.); }';
const COC = 'uniform float uK, uF, uBlur; float coc(float d){ return clamp(uK * (1. - uF / max(d, 1e-4)), -2.2 * uK, uK); }';
const TILE_FS = /* glsl */`
uniform sampler2D tC; uniform vec2 uTile, uPx; varying vec2 vUv; ${COC}
void main(){
  float m = 0.;
  for (int j = 0; j < 10; j++) for (int i = 0; i < 10; i++) {
    vec2 o = (vec2(float(i), float(j)) / 9. - .5) * uTile * 3.;
    float d = texture2D(tC, vUv + o).a; m = max(m, -coc(d));
  }
  gl_FragColor = vec4(m, 0., 0., 1.);
}`;
const DOF_FS = /* glsl */`
uniform sampler2D tC, tT; uniform vec2 uPx; uniform float uT; varying vec2 vUv; ${COC}
float h21(vec2 p){ p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
void main(){
  vec4 c0 = texture2D(tC, vUv); float d0 = min(min(c0.a, texture2D(tC, vUv + vec2(uPx.x, 0.)).a), min(texture2D(tC, vUv - vec2(uPx.x, 0.)).a, min(texture2D(tC, vUv + vec2(0., uPx.y)).a, texture2D(tC, vUv - vec2(0., uPx.y)).a)));
  float cr = max(abs(coc(d0)), uBlur), near = texture2D(tT, vUv).r;
  float R = max(cr, near);
  if (R < .7) { gl_FragColor = vec4(c0.rgb, 0.); return; }
  float rot = h21(gl_FragCoord.xy + fract(uT) * 37.) * 6.2832;
  vec3 aB = vec3(0.), aN = vec3(0.); float wB = 0., wN = 0., cN = 0.;
  const int NS = 44;
  for (int i = 0; i < NS; i++) {
    float f = (float(i) + .5) / float(NS), rr = sqrt(f) * R, a = float(i) * 2.39996 + rot;
    vec4 s = texture2D(tC, vUv + vec2(cos(a), sin(a)) * rr * uPx);
    float sc = max(abs(coc(s.a)), uBlur);
    if (s.a < d0 * .985 && sc > cr + 1.) { float w = clamp(sc - rr + 1., 0., 1.); aN += s.rgb * w; wN += w; cN += w; }
    else { float se = s.a > d0 ? min(sc, cr) : sc, w = clamp(se - rr + 1., 0., 1.); aB += s.rgb * w; wB += w; }
  }
  vec3 bg = wB > 0. ? aB / wB : c0.rgb, nc = wN > 0. ? aN / wN : bg;
  float b = smoothstep(.6, 2.2, cr), cov = clamp(cN / float(NS) * 1.15, 0., 1.);
  float A = 1. - (1. - b) * (1. - cov);
  gl_FragColor = vec4((bg * b * (1. - cov) + nc * cov) / max(A, 1e-3), A);
}`;
const COMP_FS = /* glsl */`
uniform sampler2D tC, tD, tP; varying vec2 vUv;
void main(){ vec4 s = texture2D(tC, vUv), d = texture2D(tD, vUv), p = texture2D(tP, vUv); gl_FragColor = vec4(mix(s.rgb, d.rgb, d.a) * (1. - p.a) + p.rgb, 1.); }`;
const POST_FS = /* glsl */`
uniform sampler2D tD; uniform vec2 uRes; uniform float uT, uSat, uCon, uCalm, uFlash; uniform vec3 uVeil, uLift;
varying vec2 vUv;
float h21(vec2 p){ p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
void main(){
  vec2 uv = vUv, asp = vec2(uRes.x / uRes.y, 1.), cc = uv - .5;
  float r2 = dot(cc * asp, cc * asp) / dot(asp * .5, asp * .5);
  vec2 ca = cc * r2 * .0018;
  vec3 c = vec3(texture2D(tD, uv + ca).r, texture2D(tD, uv).g, texture2D(tD, uv - ca).b);
  // halo de l'objectif : hautes lumières étalées (mips)
  vec3 g1 = textureLod(tD, uv, 3.).rgb, g2 = textureLod(tD, uv, 5.).rgb, g3 = textureLod(tD, uv, 7.).rgb;
  c += max(g1 - .9, 0.) * .10 + max(g2 - .55, 0.) * .14 + max(g3 - .35, 0.) * .2 + g3 * uFlash;
  c *= mix(1., .55, smoothstep(.35, 1.45, r2));
  // coin du titre (bas, gauche) plus sombre et calme
  vec2 q = (uv - vec2(-.05, -.08)) * vec2(asp.x * .62, 1.05);
  c *= 1. - uCalm * smoothstep(1.05, .2, length(q));
  c = c + uVeil;
  gl_FragColor = vec4(c, 1.);
  #include <tonemapping_fragment>
  { vec3 x = gl_FragColor.rgb; float l = dot(x, vec3(.2126, .7152, .0722));
    x = mix(vec3(l), x, uSat); x = max(x, 0.); x = mix(x, x * x * (3. - 2. * x), uCon); x += uLift * (1. - x); gl_FragColor.rgb = x; }
  #include <colorspace_fragment>
  float n = h21(uv * uRes + fract(uT * 7.13) * 91.) + h21(uv * uRes * 1.37 + fract(uT * 3.71) * 53.) - 1.;
  gl_FragColor.rgb += n * .028 * (1. - .6 * dot(gl_FragColor.rgb, vec3(.33)));
}`;

/* ---------- montage ---------- */
export function mount(host, { reduceMotion } = {}) {
  const noop = { play() {}, pause() {}, progress() {}, pointer() {} };
  const cv = document.createElement('canvas');
  cv.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;display:block;background:#1a120a';
  cv.setAttribute('aria-hidden', 'true');
  host.appendChild(cv);
  let renderer;
  try { renderer = new THREE.WebGLRenderer({ canvas: cv, alpha: false, antialias: false, powerPreference: 'high-performance' }); }
  catch (e) { cv.remove(); return noop; }
  renderer.setClearColor(0x1a120a, 1);
  renderer.toneMapping = THREE.AgXToneMapping; renderer.toneMappingExposure = 1.1;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  const R = rng(1105);
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(28, 1, .004, 60);

  /* --- environnement préfiltré, un par plan : ciel doré et lisière (orientés sur le soleil), grande boîte à lumière chaude
     derrière la caméra (les flancs polis de la bascule s'y reflètent), bande claire en hauteur (reflets longs des canons) --- */
  const envU = { uRot: { value: new THREE.Matrix3() }, uBox: { value: v3(0, 0, 1) }, uBand: { value: v3(1, 0, 0) }, uBoxI: { value: 1 } };
  const envSc = new THREE.Scene(), envGeo = new THREE.SphereGeometry(10, 128, 64);
  envSc.add(new THREE.Mesh(envGeo, new THREE.ShaderMaterial({
    side: THREE.BackSide, uniforms: envU,
    vertexShader: 'varying vec3 vD; void main(){ vD = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.); }',
    fragmentShader: NOISE + PAINT + `uniform mat3 uRot; uniform vec3 uBox, uBand; uniform float uBoxI; varying vec3 vD;
      void main(){ vec3 w = normalize(vD), d = uRot * w; vec3 c = paint(d, .0);
        float el = asin(clamp(d.y, -1., 1.)), ds = acos(clamp(dot(d, SUNB), -1., 1.));
        c += vec3(.55, .5, .45) * smoothstep(.12, .5, el) * .5;
        c += vec3(1., .8, .55) * smoothstep(.05, .035, ds) * 40.;
        float b = acos(clamp(dot(w, uBox), -1., 1.));
        c += vec3(1.05, .9, .74) * uBoxI * 1.3 * smoothstep(.6, .36, b) * (.7 + .3 * smoothstep(.4, .0, b));
        c *= mix(1., .35, smoothstep(.75, 1.4, b) * smoothstep(.0, -.6, dot(w, uBox)) * 0.);
        float band = abs(dot(w, uBand)); c += vec3(.95, .85, .72) * .8 * smoothstep(.09, .04, band) * step(.15, w.y) * smoothstep(.9, .5, abs(dot(w, uBox)));
        gl_FragColor = vec4(c, 1.); }`
  })));
  const pmrem = new THREE.PMREMGenerator(renderer), envs = [];
  /* --- fond peint, très flou, avec bokeh de lisière --- */
  const bgU = { uRot: { value: new THREE.Matrix3() }, uSoft: { value: .035 }, uBok: { value: 1 }, uT: { value: 0 }, uBgK: { value: 1 } };
  const bg = new THREE.Mesh(new THREE.SphereGeometry(30, 64, 32), new THREE.ShaderMaterial({
    uniforms: bgU, side: THREE.BackSide, depthWrite: false, depthTest: false,
    vertexShader: 'varying vec3 vW; void main(){ vec4 w = modelMatrix * vec4(position, 1.); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }',
    fragmentShader: NOISE + PAINT + `uniform mat3 uRot; uniform float uSoft, uBok, uT, uBgK; varying vec3 vW;
      vec3 bokeh(vec3 d){
        float el = asin(clamp(d.y, -1., 1.)), az = atan(d.x, -d.z), side = exp(-abs(az) * 1.3);
        vec3 acc = vec3(0.);
        for (int L = 0; L < 2; L++) {
          float cs = L == 0 ? .05 : .085; vec2 q = vec2(az * cos(el), el) / cs + float(L) * 17.3; vec2 ci = floor(q);
          for (int j = -1; j <= 1; j++) for (int i = -1; i <= 1; i++) {
            vec2 c = ci + vec2(float(i), float(j)); float h = h13(vec3(c, float(L) * 7.)), h2 = h13(vec3(c.yx, 3.1 + float(L)));
            if (h2 > .55) continue;
            vec2 ctr = c + .5 + .3 * vec2(h - .5, h2 - .5) + .06 * vec2(sin(uT * .2 + h * 9.), cos(uT * .17 + h2 * 7.));
            float rad = .28 + .2 * h, dd = length(q - ctr);
            float disc = smoothstep(rad, rad - .045, dd), rim = smoothstep(rad - .12, rad - .02, dd) * disc;
            float elc = ctr.y * cs; float band = smoothstep(.0, .1, elc) * smoothstep(.34, .17, elc);
            float br = (.25 + .75 * h * h) * band * (.25 + side);
            acc += mix(vec3(1., .66, .3), vec3(1., .86, .6), h2) * (disc * .8 + rim * .5) * br * (L == 0 ? .7 : 1.);
          }
        }
        return acc;
      }
      void main(){ vec3 d = uRot * normalize(vW - cameraPosition);
        vec3 c = paint(d, uSoft) * uBgK + bokeh(d) * uBok;
        gl_FragColor = vec4(c, 1000.); }`
  }));
  bg.renderOrder = -10; bg.frustumCulled = false; scene.add(bg);

  /* --- soleil --- */
  const sunL = new THREE.DirectionalLight(new THREE.Color().setRGB(1, .8, .58), 4.2);
  sunL.castShadow = true; sunL.shadow.mapSize.set(2048, 2048);
  sunL.shadow.bias = -.00004; sunL.shadow.normalBias = .0004; sunL.shadow.radius = 4;
  scene.add(sunL, sunL.target);

  /* --- matériaux --- */
  // fissure : cellules de Voronoï des éclats (coordonnées polaires géodésiques, mm), front qui part du point d'impact
  const NS = 34;
  const CU = { uCrack: { value: 0 }, uSites: { value: Array.from({ length: NS }, () => new THREE.Vector2(1e4, 1e4)) }, uMid: { value: [] }, uSS: { value: 80 } };
  { let s = 0; CU.uMid.value = CLAY_MID.map((m, i) => { if (i) s += Math.hypot(m[0] - CLAY_MID[i - 1][0], m[1] - CLAY_MID[i - 1][1]); return new THREE.Vector2(m[0], s); }); }
  const M = {
    clay: pbr('clay', { color: new THREE.Color().setRGB(.92, .09, .012), roughness: .74, specularIntensity: .7, sheen: .18, sheenRoughness: .6, sheenColor: new THREE.Color().setRGB(1, .45, .2), side: THREE.DoubleSide }, {
      u: CU,
      head: `uniform float uCrack, uSS; uniform vec2 uSites[${NS}]; uniform vec2 uMid[10];
        float sOf(float r, float y){
          if (r >= uMid[8].x) return uMid[8].y + clamp(6. - y, 0., 5.4);
          float s = 0.;
          for (int i = 0; i < 8; i++) { vec2 a = uMid[i], b = uMid[i + 1]; if (r >= a.x && r < b.x) s = mix(a.y, b.y, (r - a.x) / (b.x - a.x)); }
          return s;
        }`,
      color: `
        float r = length(P.xz);
        float inner = step(dot(N0, normalize(vec3(P.x, P.y - .03, P.z))), -.2);
        diffuseColor.rgb *= .9 + .2 * vn3(P * 1500.);
        occ = mix(1., .5, inner * smoothstep(.054, .03, r));
        if (uCrack > 0.) {
          float rm = r * 1000., th = atan(P.z, P.x), sg = sOf(rm, P.y * 1000.);
          vec2 q = vec2(cos(th), sin(th)) * sg + (vec2(vn3(P * 650.), vn3(P * 650. + 17.)) - .5) * 1.5;
          int ia = 0; float d1 = 1e9;
          for (int i = 0; i < ${NS}; i++) { vec2 dd = q - uSites[i]; float d = dot(dd, dd); if (d < d1) { d1 = d; ia = i; } }
          vec2 a = uSites[ia]; float e = 1e9;
          for (int i = 0; i < ${NS}; i++) { if (i == ia) continue; vec2 b = uSites[i]; e = min(e, dot((a + b) * .5 - q, normalize(b - a))); }
          float front = uCrack * (uSS + 10.), reach = smoothstep(front, front - 7., length(q) + 5. * vn3(P * 260.));
          float w = mix(.1, .42, uCrack * uCrack), line = (1. - smoothstep(w, w + .22, e)) * reach, halo = (1. - smoothstep(w, w + 1.3, e)) * reach;
          diffuseColor.rgb = mix(diffuseColor.rgb, vec3(1., .4, .17), halo * .4);
          diffuseColor.rgb = mix(diffuseColor.rgb, vec3(.035, .01, .004), line);
          rgh += halo * .2; occ *= 1. - .7 * line;
        }
        ${BUMP('vn3(Q * 9000.) * .000012 + vn3(Q * 2200.) * .00002', '1.')}`
    }),
    // éclats : argile mate, tranches poreuses sombres, arêtes de cassure poudreuses (pas de plastique)
    shard: pbr('shard', { color: new THREE.Color().setRGB(.92, .09, .012), roughness: .84, specularIntensity: .45, sheen: .12, sheenRoughness: .7, sheenColor: new THREE.Color().setRGB(1, .45, .2), side: THREE.DoubleSide, vertexColors: true }, {
      color: `
        float brk = 1. - smoothstep(.2, .3, vColor.r);
        float edge = smoothstep(.8, 1., vColor.g) * (1. - brk);
        diffuseColor.rgb = mix(vec3(.92, .09, .012) * (vColor.r > .5 ? 1. : .85), vec3(.15, .05, .022), brk);
        diffuseColor.rgb = mix(diffuseColor.rgb, vec3(1., .4, .18), edge * .3) * (.88 + .24 * vn3(P * 1500.));
        rgh += brk * .16 + edge * .15;
        occ *= 1. - .25 * brk;
        ${BUMP('vn3(Q * 9000.) * .000015 + brk * (vn3(Q * 3000.) * .00012 + vn3(Q * 800.) * .00022)', '1.')}`
    })
  };

  /* --- plateau, éclats --- */
  const clayG = buildClay();
  const clay = new THREE.Mesh(clayG, M.clay); clay.castShadow = clay.receiveShadow = true;
  const clayRig = new THREE.Group(); clayRig.add(clay); scene.add(clayRig);
  // pose du plateau à la séparation : les éclats partent de là
  const IMP = v3(.02, -.001, 0);
  const RIGQ = new THREE.Quaternion().setFromEuler(new THREE.Euler(-.22 + .03 * Math.sin(TB * 1.7), 0, .1 + .03 * Math.cos(TB * 1.3)));
  const RIGB = new THREE.Matrix4().compose(IMP, RIGQ, v3(1, 1, 1)), SPIN = new THREE.Quaternion().setFromAxisAngle(v3(0, 1, 0), SPINW * PS);
  const RIGE = new THREE.Euler().setFromQuaternion(RIGQ), FLYD = v3(1, .05, -.2).normalize();
  const SD = buildShards(R, NS);
  SD.sites.forEach((p, i) => CU.uSites.value[i].set(p[0], p[1])); CU.uSS.value = SD.S;
  const shards = SD.map(s => {
    const me = new THREE.Mesh(s.g, M.shard); me.castShadow = true; me.receiveShadow = true; scene.add(me);
    const p0 = s.c.clone().applyQuaternion(SPIN).add(v3(0, -.012, 0)).applyMatrix4(RIGB);
    const dir = s.c.clone().sub(v3(0, .013, 0)).applyQuaternion(SPIN).applyQuaternion(RIGQ); dir.y += .25 * (R() - .3) * dir.length(); dir.normalize();
    return { me, p0, dir, q0: RIGQ.clone().multiply(SPIN), sp: .045 + .1 * R(), ax: v3(R() - .5, R() - .5, R() - .5).normalize(), w: (.8 + 3 * R()) * (R() < .5 ? -1 : 1), up: (R() - .3) * .03 };
  });
  // miettes : petits fragments irréguliers
  const chipGeo = new THREE.IcosahedronGeometry(.0016, 0);
  { const p = chipGeo.attributes.position; for (let i = 0; i < p.count; i++) p.setXYZ(i, p.getX(i) * (.6 + .8 * R()), p.getY(i) * (.5 + .6 * R()), p.getZ(i) * (.6 + .8 * R())); chipGeo.computeVertexNormals(); }
  const chips = new THREE.InstancedMesh(chipGeo, M.shard, 160); chips.castShadow = false; scene.add(chips);
  { const cc = new Float32Array(chipGeo.attributes.position.count * 3).fill(.6); chipGeo.setAttribute('color', new THREE.BufferAttribute(cc, 3)); }
  const chipD = Array.from({ length: 160 }, () => { const a = R() * 6.283, el = (R() - .4) * 1.2; return { d: v3(Math.cos(a) * Math.cos(el), Math.sin(el), Math.sin(a) * Math.cos(el)), sp: .05 + .18 * R(), s: v3(.5 + 1.4 * R(), .4 + .8 * R(), .5 + 1.4 * R()), ax: v3(R() - .5, R() - .5, R() - .5).normalize(), w: 2 + 6 * R(), r0: .045 * Math.sqrt(R()) }; });

  /* --- particules --- */
  const ptex = puffAtlas(R);
  const PU = (c0, c1) => ({ uPh: { value: 0 }, uK: { value: 1 }, uF: { value: 1 }, uPix: { value: .001 }, uFade: { value: 1 }, tScene: { value: null }, uRes: { value: new THREE.Vector2(1, 1) },
    uSunV: { value: v3() }, uSunC: { value: new THREE.Color().setRGB(2.2, 1.6, 1.0) }, uAmb: { value: new THREE.Color().setRGB(.24, .2, .17) }, uCol0: { value: c0 }, uCol1: { value: c1 }, uOp0: { value: .9 }, uOp1: { value: .5 }, uSoft: { value: 0 },
    uGauss: { value: 0 }, uCarry: { value: v3() }, uTB: { value: TB }, uT: { value: 0 } });
  const powderU = PU(new THREE.Color().setRGB(1, .14, .014), new THREE.Color().setRGB(1, .3, .08));
  powderU.uSunC.value.setRGB(1.5, 1.0, .62); powderU.uAmb.value.setRGB(.17, .12, .1);
  const powder = particleMesh(2400, ptex, powderU);
  powderU.uOp0.value = .13; powderU.uOp1.value = .22; powderU.uSoft.value = 1; powderU.uGauss.value = 1;
  // traîne de vitesse : ruban face caméra le long de la trajectoire, derrière le plateau
  const trailU = { uU: { value: 0 }, uOp: { value: 0 }, uImp: { value: IMP } };
  const trail = new THREE.Mesh(new THREE.PlaneGeometry(1, 1, 48, 1).translate(.5, 0, 0), new THREE.ShaderMaterial({
    uniforms: trailU, transparent: true, depthTest: false, depthWrite: false, side: THREE.DoubleSide,
    blending: THREE.CustomBlending, blendSrc: THREE.OneFactor, blendDst: THREE.OneMinusSrcAlphaFactor, blendSrcAlpha: THREE.OneFactor, blendDstAlpha: THREE.OneMinusSrcAlphaFactor,
    vertexShader: `uniform float uU; uniform vec3 uImp; varying vec2 vQ;
      vec3 fly(float u){ return uImp + vec3(u, .05 * u - .08 * u * u, -.2 * u); }
      void main(){
        float x = position.x, u = uU - .045 - x * .32;
        vec3 w = fly(u), d = normalize(fly(u + .01) - w), side = normalize(cross(d, normalize(w - cameraPosition)));
        w += side * position.y * .042 * (1. - .6 * x);
        vQ = vec2(x, position.y * 2.);
        gl_Position = projectionMatrix * viewMatrix * vec4(w, 1.);
      }`,
    fragmentShader: `uniform float uOp; varying vec2 vQ;
      void main(){
        float a = uOp * .9 * pow(1. - vQ.x, 1.5) * exp(-vQ.y * vQ.y * 2.5) * smoothstep(0., .08, vQ.x) * (.7 + .3 * sin(vQ.y * 11. + 1.));
        gl_FragColor = vec4(vec3(.95, .26, .07) * a, a);
      }`
  }));
  trail.frustumCulled = false;
  const dustN = 260, dustG = new THREE.InstancedBufferGeometry();
  dustG.setAttribute('position', new THREE.Float32BufferAttribute([-1, -1, 0, 1, -1, 0, 1, 1, 0, -1, 1, 0], 3)); dustG.setIndex([0, 1, 2, 0, 2, 3]);
  { const a = new Float32Array(dustN * 4); for (let i = 0; i < a.length; i++) a[i] = R(); dustG.setAttribute('aS', new THREE.InstancedBufferAttribute(a, 4)); dustG.instanceCount = dustN; }
  const dustU = { uT: { value: 0 }, uK: { value: 1 }, uF: { value: 1 }, uPix: { value: .001 }, uC: { value: v3() }, uBox: { value: v3(.3, .2, .3) }, tScene: { value: null }, uRes: { value: new THREE.Vector2(1, 1) }, uGlow: { value: new THREE.Color().setRGB(.9, .62, .32) } };
  const dust = new THREE.Mesh(dustG, new THREE.ShaderMaterial({ uniforms: dustU, vertexShader: DUST_VS, fragmentShader: DUST_FS, transparent: true, depthTest: false, depthWrite: false, blending: THREE.CustomBlending, blendSrc: THREE.OneFactor, blendDst: THREE.OneFactor, blendSrcAlpha: THREE.ZeroFactor, blendDstAlpha: THREE.OneFactor }));
  dust.frustumCulled = false;

  /* --- émission précalculée (en phase) : bouffée d'impact, poussière des fissures, nuage de l'éclatement --- */
  const qA = new THREE.Quaternion(), tw = v3();
  {
    const p = v3(), d = v3();
    const OB = new THREE.Matrix4().compose(v3(0, -.012, 0), SPIN, v3(1, 1, 1)).premultiply(RIGB), UPW = v3(0, 1, 0).applyQuaternion(RIGQ);
    const midAt = s => { const m = CU.uMid.value; for (let i = 0; i < m.length - 1; i++) if (s <= m[i + 1].y) { const f = (s - m[i].y) / (m[i + 1].y - m[i].y); return [lerp(CLAY_MID[i][0], CLAY_MID[i + 1][0], f), lerp(CLAY_MID[i][1], CLAY_MID[i + 1][1], f)]; } return CLAY_MID[CLAY_MID.length - 1]; };
    for (let i = 0; i < 90; i++) {
      p.set((R() - .5) * .004, .0262, (R() - .5) * .004).applyMatrix4(OB);
      d.set(R() - .5, R() * .8, R() - .5).normalize().multiplyScalar(.015 + .05 * R()).addScaledVector(UPW, .015);
      powder.push(p, d, TK + R() * .06, R(), .9 + R() * 1.2, .0015 + R() * .0025, 1, .2 + R() * .3, .004, .5 + R() * .8);
    }
    for (let i = 0; i < 260; i++) {
      const b = TK + .05 + R() * (TB - TK - .02), s = Math.sqrt(R()) * Math.pow((b - TK) / (TB - TK), .7) * SD.S, a = R() * 6.283, [r, y] = midAt(s);
      p.set(Math.cos(a) * r / 1000, (y + 1.8) / 1000, Math.sin(a) * r / 1000).applyMatrix4(OB);
      d.set(R() - .5, R() - .3, R() - .5).multiplyScalar(.012).addScaledVector(UPW, .006 + .012 * R());
      powder.push(p, d, b, R(), 1.4 + R() * 1.6, .002 + R() * .003, i % 3 ? 1 : 0, .5 + R() * .5, .004, .6 + R());
    }
    const jets = Array.from({ length: 11 }, () => [R() * 6.283, (R() - .4) * .6, .5 + R()]);
    for (let i = 0; i < 2000; i++) {
      const J = jets[Math.floor(R() * jets.length)], inJ = R() < .55;
      const a = inJ ? J[0] + (R() - .5) * .28 : R() * 6.283, el = inJ ? J[1] + (R() - .5) * .2 : (R() - .45) * (R() < .7 ? .5 : 1.4), sp = (Math.pow(R(), 1.8) * .16 + .01) * (inJ ? J[2] : .8);
      d.set(Math.cos(a) * Math.cos(el), Math.sin(el), Math.sin(a) * Math.cos(el));
      const r0 = .045 * Math.sqrt(R());
      p.set(IMP.x + Math.cos(a) * r0, IMP.y + (R() - .5) * .012, Math.sin(a) * r0);
      d.multiplyScalar(sp).addScaledVector(FLYD, .05 + .07 * R()).add(tw.set(0, .01, 0));
      powder.push(p, d, TB + Math.pow(R(), 2) * .25, R(), 2.2 + R() * 2.5, i < 1500 ? .008 + R() * .01 : .0018 + R() * .0025, i < 1500 ? 0 : 1, .25 + R() * .55, .006, i < 1100 ? .35 + R() * .8 : .3 + R() * .6);
    }
    powder.done();
  }

  /* --- passes de rendu --- */
  const rtMain = new THREE.WebGLRenderTarget(4, 4, { type: THREE.HalfFloatType, samples: 4 });
  const rtTile = new THREE.WebGLRenderTarget(4, 4, { type: THREE.HalfFloatType, depthBuffer: false });
  const rtDof = new THREE.WebGLRenderTarget(4, 4, { type: THREE.HalfFloatType, depthBuffer: false });
  const rtPart = new THREE.WebGLRenderTarget(4, 4, { type: THREE.HalfFloatType, depthBuffer: false });
  const rtComp = new THREE.WebGLRenderTarget(4, 4, { type: THREE.HalfFloatType, depthBuffer: false, generateMipmaps: true, minFilter: THREE.LinearMipmapLinearFilter });
  const quad = fs => new THREE.Mesh(new THREE.PlaneGeometry(2, 2), new THREE.ShaderMaterial({ ...fs, vertexShader: FSQ_VS, depthTest: false, depthWrite: false }));
  const cocU = { uK: { value: 1 }, uF: { value: 1 }, uBlur: { value: 0 } };
  const tileQ = quad({ uniforms: { tC: { value: rtMain.texture }, uTile: { value: new THREE.Vector2() }, uPx: { value: new THREE.Vector2() }, ...cocU }, fragmentShader: TILE_FS });
  const dofQ = quad({ uniforms: { tC: { value: rtMain.texture }, tT: { value: rtTile.texture }, uPx: { value: new THREE.Vector2() }, uT: { value: 0 }, ...cocU }, fragmentShader: DOF_FS });
  const compQ = quad({ uniforms: { tC: { value: rtMain.texture }, tD: { value: rtDof.texture }, tP: { value: rtPart.texture } }, fragmentShader: COMP_FS });
  compQ.frustumCulled = false; compQ.renderOrder = -5;
  const postU = { tD: { value: rtComp.texture }, uRes: { value: new THREE.Vector2(1, 1) }, uT: { value: 0 }, uSat: { value: 1.1 }, uCon: { value: .3 }, uCalm: { value: .45 }, uFlash: { value: 0 }, uVeil: { value: v3(.002, .0015, .001) }, uLift: { value: v3(.012, .008, .004) } };
  const postQ = quad({ uniforms: postU, fragmentShader: POST_FS }); postQ.material.toneMapped = true;
  const fsCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  const sTile = new THREE.Scene(); sTile.add(tileQ);
  const sDof = new THREE.Scene(); sDof.add(dofQ);
  const sPost = new THREE.Scene(); sPost.add(postQ);
  const sComp = new THREE.Scene(); sComp.add(compQ);
  const sPart = new THREE.Scene(); sPart.add(trail, powder, dust);
  for (const U of [powderU, dustU]) U.tScene.value = rtMain.texture;

  /* --- état --- */
  const st = { w: 1, h: 1, pr: Math.min(window.devicePixelRatio || 1, 1.5), on: false, raf: 0, last: 0, t: 0, lt: 0, shot: 0, next: 0, tr: -1, p: 0, pt: 0, mx: 0, my: 0, tmx: 0, tmy: 0, ema: 1 / 60, slowT: 0, blur: 0 };

  const resize = () => {
    st.w = Math.max(1, host.clientWidth); st.h = Math.max(1, host.clientHeight);
    renderer.setPixelRatio(st.pr); renderer.setSize(st.w, st.h, false);
    const W = Math.round(st.w * st.pr), H = Math.round(st.h * st.pr);
    rtMain.setSize(W, H); rtComp.setSize(W, H); rtPart.setSize(Math.ceil(W / 2), Math.ceil(H / 2)); rtDof.setSize(Math.ceil(W / 2), Math.ceil(H / 2)); rtTile.setSize(Math.ceil(W / 16), Math.ceil(H / 16));
    postU.uRes.value.set(W, H);
    tileQ.material.uniforms.uTile.value.set(16 / W, 16 / H); dofQ.material.uniforms.uPx.value.set(1 / W, 1 / H);
    for (const U of [powderU, dustU]) U.uRes.value.set(Math.ceil(W / 2), Math.ceil(H / 2));
  };

  /* --- caméra par plan --- */
  const fwd = v3(), cr = new THREE.Vector3(), m4 = new THREE.Matrix4();
  const spline = (keys, a, out) => {
    const n = keys.length - 1, x = clamp(a) * n, i = Math.min(n - 1, Math.floor(x)), f = x - i;
    const p0 = keys[Math.max(0, i - 1)], p1 = keys[i], p2 = keys[i + 1], p3 = keys[Math.min(n, i + 2)];
    const f2 = f * f, f3 = f2 * f;
    out.set(0, 0, 0).addScaledVector(p0, -.5 * f3 + f2 - .5 * f).addScaledVector(p1, 1.5 * f3 - 2.5 * f2 + 1).addScaledVector(p2, -1.5 * f3 + 2 * f2 + .5 * f).addScaledVector(p3, .5 * f3 - .5 * f2);
    return out;
  };
  const orbit = (f, az, el, D) => f.pos.set(f.tgt.x + Math.sin(az * D2R) * Math.cos(el * D2R) * D, f.tgt.y + Math.sin(el * D2R) * D, f.tgt.z + Math.cos(az * D2R) * Math.cos(el * D2R) * D);
  const frame = { pos: v3(), tgt: v3(), fov: 28, sx: 0, sy: 0, roll: 0, F: .2, K: .014 };
  // trajectoire du plateau : abscisse u (m) le long du vol, impact en u = 0 (point IMP) ; il monte de gauche à droite en s'éloignant
  const FLY = (u, out) => out.set(IMP.x + u, IMP.y + .05 * u - .08 * u * u, IMP.z - .2 * u);
  const uOf = p => FLYV * (Math.min(p, PS) - PS);
  const cTgt = v3(), cFix = v3(), LEAD = v3(.075, -.03, 0);
  // la caméra suit le vol puis freine et s'arrête : le plateau traverse alors le cadre jusqu'à l'impact
  const pCam = p => p < .42 ? p : .42 + .12 * (1 - Math.pow(1 - clamp((p - .42) / .24), 2));
  const shotCam = (i, t, p) => {
    const asp = st.w / st.h, k = sstep(.6, 1.5, asp), f = frame;
    // un seul mouvement : gros plan qui accompagne le plateau, puis recul ; la caméra s'arrête et le laisse traverser le ciel
    const w = sstep(.12, .42, p), back = sstep(.12, .44, p), end = sstep(PS, 1, p);
    FLY(uOf(p), cTgt);
    FLY(uOf(pCam(p)), cFix).addScaledVector(LEAD, w).add(tw.set(.05 * end, .006 * end, 0));
    f.tgt.copy(cTgt).lerp(cFix, sstep(.02, .3, p));
    const az = lerp(18 + 26 * clamp(p / .16) + 5 * Math.sin(t * .11), 4 - 4 * end, back);
    const el = lerp(lerp(30, 14, clamp(p / .16)) + 4 * Math.sin(t * .13), 1, back);
    const D = lerp(lerp(.34, .235, k), lerp(.95, .52, k), back) * (1 + .12 * end);
    orbit(f, az, el, D);
    f.fov = lerp(48, 30, k); f.sx = lerp(0, lerp(.32, .12, back), k); f.sy = lerp(lerp(.3, .22, back), lerp(.17, .06, back), k); f.roll = lerp(-.03 + .015 * Math.sin(t * .1), -.015, back);
    // parallaxe du pointeur, respiration de la main
    f.pos.x += st.mx * .012 + .0012 * Math.sin(t * 1.3) + .0005 * Math.sin(t * 3.1);
    f.pos.y -= st.my * .008 - .001 * Math.sin(t * 1.1 + 1);
    fwd.subVectors(f.tgt, f.pos); f.F = fwd.length(); fwd.normalize(); f.K = SH[0].K;
  };

  /* --- plans : lumière (azimut du soleil relatif à la visée), fond peint (direction de visée dans le repère du fond) --- */
  const SH = [{ sunRel: 30, bgAz: -30, bgEl: 6, dap: 0, K: .014, exp: 1.03, sh: .15, box: .9, boxSide: 1 }];
  const sunW = v3(), Mw = new THREE.Matrix4(), Mb = new THREE.Matrix4(), Y = v3(0, 1, 0), bgNom = v3(0, 0, -1), bgDir = v3(0, 0, -1), bgF = v3();
  const basis = (f, out) => { const r = v3().crossVectors(f, Y).normalize(), u = v3().crossVectors(r, f); return out.makeBasis(r, u, f); };
  const applyShot = i => {
    const s = SH[i];
    shotCam(i, 0, .6);
    const head = Math.atan2(fwd.x, -fwd.z), phi = head + s.sunRel * D2R, el = 12 * D2R;
    sunW.set(Math.sin(phi) * Math.cos(el), Math.sin(el), -Math.cos(phi) * Math.cos(el));
    SHARED.uSunW.value.copy(sunW); SHARED.uDap.value = s.dap;
    if (!envs[i]) {
      envU.uRot.value.setFromMatrix4(new THREE.Matrix4().makeRotationY(phi));
      const rgt = v3().crossVectors(fwd, Y).normalize(), box = v3().copy(fwd).setY(0).normalize().negate().addScaledVector(Y, .95).addScaledVector(rgt, .3 * s.boxSide).normalize();
      envU.uBox.value.copy(box); envU.uBand.value.copy(fwd).cross(Y).normalize().applyAxisAngle(fwd, .25); envU.uBoxI.value = s.box;
      envs[i] = pmrem.fromScene(envSc, 0).texture;
    }
    scene.environment = envs[i];
    bgNom.copy(fwd); bgDir.set(Math.sin(s.bgAz * D2R) * Math.cos(s.bgEl * D2R), Math.sin(s.bgEl * D2R), -Math.cos(s.bgAz * D2R) * Math.cos(s.bgEl * D2R));
    const c = frame.tgt, hs = s.sh;
    sunL.target.position.copy(c); sunL.position.copy(c).addScaledVector(sunW, 1);
    Object.assign(sunL.shadow.camera, { left: -hs, right: hs, top: hs, bottom: -hs, near: .01, far: 3 }); sunL.shadow.camera.updateProjectionMatrix();
  };

  /* --- mise à jour de la scène selon la phase --- */
  const place = () => {
    const t = st.t, p = st.p;
    shotCam(0, t, p);
    // temps de l'éclatement, tiré du défilement : fissure entre PK et PS, puis ralenti à l'impact
    const x = clamp((p - PS) / (1 - PS));
    const ph = p < PS ? TK + (TB - TK) * clamp((p - PK) / (PS - PK)) : TB + 5.2 * (.3 * x + .7 * x * x);
    const alive = ph < TB, tb = Math.max(0, ph - TB);
    // vol
    FLY(uOf(p), clayRig.position);
    const w2 = sstep(.18, .42, p);
    clayRig.rotation.set(lerp(-.1 + .14 * Math.sin(t * .19), RIGE.x, w2), 0, lerp(.12 + .06 * Math.cos(t * .15), RIGE.z, w2));
    // rotation propre : liée au défilement ; à l'arrêt, elle continue doucement (modulo le pas des cannelures : sans saut visible)
    const live = 1 - sstep(PK - .03, PK, p), FL = Math.PI * 2 / 36;
    clay.rotation.y = SPINW * Math.min(p, PS) + live * ((t * .7) % FL);
    clay.position.set(0, -.012, 0);
    clay.visible = alive;
    CU.uCrack.value = alive ? Math.pow(clamp((ph - TK) / (TB - TK)), .8) : 0;
    // traîne de vitesse
    const tr = sstep(.3, .42, p) * (1 - sstep(PK - .05, PK + .01, p));
    trail.visible = tr > .01; trailU.uU.value = uOf(p); trailU.uOp.value = tr;
    // éclats : partent dans le sens du vol, retombent et sortent du cadre
    const dec = s => (1 - Math.exp(-tb / s)) * s;
    for (const s of shards) {
      s.me.visible = !alive;
      if (alive) continue;
      s.me.position.copy(s.p0).addScaledVector(s.dir, s.sp * dec(1.4)).addScaledVector(FLYD, .07 * tb).add(tw.set(0, s.up * tb - .03 * tb * tb, 0));
      s.me.quaternion.setFromAxisAngle(s.ax, s.w * tb * .6 + .05 * Math.sin(t * .4 + s.w)).multiply(s.q0);
    }
    chips.visible = !alive && tb < 5;
    if (chips.visible) {
      for (let k = 0; k < chipD.length; k++) {
        const c = chipD[k]; tw.copy(c.d).multiplyScalar(c.r0).add(IMP).addScaledVector(c.d, c.sp * dec(.9)).addScaledVector(FLYD, .08 * tb); tw.y -= .03 * tb * tb;
        qA.setFromAxisAngle(c.ax, c.w * tb + .1 * Math.sin(t * .5 + k));
        m4.compose(tw, qA, c.s); chips.setMatrixAt(k, m4);
      }
      chips.instanceMatrix.needsUpdate = true;
    }
    powder.visible = ph > TK;
    powderU.uCarry.value.copy(FLYD).multiplyScalar(FLYV * (PS - PK) / (TB - TK));
    powderU.uPh.value = ph; powderU.uFade.value = 1 - sstep(4.2, 5.2, tb);
    // ombres portées autour du plateau
    sunL.target.position.copy(alive ? clayRig.position : IMP); sunL.position.copy(sunL.target.position).addScaledVector(sunW, 1);
    // le fond monte doucement vers le ciel pendant le recul
    // pendant le suivi, la lisière défile derrière le plateau : on lit la vitesse
    const be = lerp(6, 15, sstep(.15, .55, p)), ba = (-30 + 70 * (uOf(pCam(p)) - uOf(.54))) * D2R;
    bgDir.set(Math.sin(ba) * Math.cos(be * D2R), Math.sin(be * D2R), -Math.cos(ba) * Math.cos(be * D2R));
    // mise au point sur le plateau, puis sur la gerbe
    const F = Math.max(.05, tw.copy(alive ? clayRig.position : IMP).sub(frame.pos).dot(fwd));
    st.blur = 0;
    const asp = st.w / st.h;
    camera.fov = frame.fov; camera.aspect = asp; camera.near = .004; camera.far = 60; camera.updateProjectionMatrix();
    camera.projectionMatrix.elements[8] = -frame.sx; camera.projectionMatrix.elements[9] = -frame.sy;
    camera.projectionMatrixInverse.copy(camera.projectionMatrix).invert();
    camera.position.copy(frame.pos); camera.lookAt(frame.tgt); camera.rotateZ(frame.roll);
    camera.updateMatrixWorld();
    // le plan focal : distance le long de l'axe de visée
    const H = st.h * st.pr, K = frame.K * H;
    cocU.uK.value = K; cocU.uF.value = F; cocU.uBlur.value = 0;
    const pix = 2 * Math.tan(frame.fov / 2 * D2R) / H;
    for (const U of [powderU, dustU]) { U.uK.value = K; U.uF.value = cocU.uF.value; U.uPix.value = pix; }
    bg.position.copy(camera.position);
    // le fond peint suit la visée aux deux tiers : il glisse doucement derrière le sujet sans jamais montrer le sol
    bgF.copy(bgNom).lerp(fwd, .7).normalize(); basis(bgF, Mw); basis(bgDir, Mb); bgU.uRot.value.setFromMatrix4(Mb.multiply(Mw.transpose()));
    SHARED.uT.value = t; powderU.uT.value = t; bgU.uT.value = t; dustU.uT.value = t; dofQ.material.uniforms.uT.value = t; postU.uT.value = t;
    dustU.uC.value.copy(frame.tgt).lerp(frame.pos, .3);
    const sv = cr.copy(sunW).transformDirection(camera.matrixWorldInverse);
    powderU.uSunV.value.copy(sv);
    renderer.toneMappingExposure = SH[0].exp;
  };

  const render = () => {
    place();
    renderer.setRenderTarget(rtMain); renderer.render(scene, camera);
    renderer.setRenderTarget(rtTile); renderer.render(sTile, fsCam);
    renderer.setRenderTarget(rtDof); renderer.render(sDof, fsCam);
    renderer.setClearColor(0, 0); renderer.setRenderTarget(rtPart); renderer.render(sPart, camera); renderer.setClearColor(0x1a120a, 1);
    renderer.setRenderTarget(rtComp); renderer.render(sComp, fsCam);
    renderer.setRenderTarget(null); renderer.render(sPost, fsCam);
  };

  const step = dt => {
    st.t += dt; st.lt += dt;
    const a = 1 - Math.exp(-dt * 2.4);
    st.p += (st.pt - st.p) * a; st.mx += (st.tmx - st.mx) * a; st.my += (st.tmy - st.my) * a;
  };

  const loop = now => {
    st.raf = 0; if (!st.on) return;
    const dt = Math.min(.05, (now - (st.last || now)) / 1000); st.last = now;
    if (dt > 0) {
      step(dt);
      st.ema += (dt - st.ema) * .05;
      if (st.ema > 1 / 45 && st.pr > .75 && now - st.slowT > 1500) { st.slowT = now; st.pr = Math.max(.75, st.pr - .25); st.ema = 1 / 50; resize(); }
    }
    render();
    st.raf = requestAnimationFrame(loop);
  };

  resize(); applyShot(st.shot);
  const ro = new ResizeObserver(() => { resize(); if (!st.on) render(); });
  ro.observe(host);

  if (reduceMotion) {
    st.p = st.pt = PS + .045; st.t = 3;
    render();
    return { play() {}, pause() {}, progress() {}, pointer() {} };
  }
  render();

  return {
    play() { if (st.on) return; st.on = true; st.last = 0; st.raf = requestAnimationFrame(loop); },
    pause() { st.on = false; if (st.raf) cancelAnimationFrame(st.raf); st.raf = 0; },
    progress(p) {
      st.pt = clamp(+p || 0);
      if (!st.on) { st.p = st.pt; render(); }
    },
    pointer(mx, my) { st.tmx = clamp(+mx || 0, -.5, .5); st.tmy = clamp(+my || 0, -.5, .5); }
  };
}
