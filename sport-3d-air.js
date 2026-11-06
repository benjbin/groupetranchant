/* Groupe Tranchant — activités sportives (accueil) : scène 3D « air », affichée en plein écran (variante G).
   Contrat : mount(host, { reduceMotion }) → { play(), pause(), progress(p), pointer(mx, my) }.

   Une prise de vue air-to-air au téléobjectif (≈ 17–31° de champ vertical : perspective tassée), depuis un avion-caméra :
   - quatre Fouga CM.170 Magister en losange serré, en virage : fuselage effilé, Marboré accolés, aile droite à bidons,
     papillon à 110°, verrière tandem (plexiglas à Fresnel), pilotes casqués qui regardent le leader ; ailerons et gouvernes
     mobiles ; sonde pitot, antennes, feux de navigation ; tuyères à revenu de chaleur (paille → bleu → suie) ;
   - laque : lignes de panneaux, rivets, ondulation des tôles, teinte qui varie d'un panneau à l'autre, usure des bords
     d'attaque, traînées d'huile et de suie, vernis interrompu ; cocardes, numéros, immatriculations, inscriptions (atlas canvas) ;
   - occlusion ambiante par champ de distance analytique (jonctions aile/fuselage, nacelles, papillon, verrière) ;
   - soleil rasant, ombres douces ; environnement préfiltré (ciel + mer de nuages texturée) pour les reflets ;
   - mer de nuages parcourue en rayons, légèrement floue (profondeur de champ), brume de distance ;
   - fumées tricolores volumétriques qui s'élargissent, se déchirent en lambeaux et s'effilochent (sans bout arrondi) ;
   - passe finale : chaleur derrière les tuyères, halo de l'objectif, aberration, vignettage, voile, tirage AgX, grain ;
   - progress(p) fait glisser l'avion-caméra de trois quarts avant vers le travers ; pointer() incline le regard ;
     bougé d'opérateur discret. */
import * as THREE from 'three';

const SUN = new THREE.Vector3(-.78, .17, .6).normalize();   // soleil bas (≈ 10°), côté caméra, devant la formation
const V = 46;                                               // vitesse relative de l'air (m/s) : fumées et nuages
const LIFE = 11;                                           // durée de vie des bouffées (s)
const EMIT = 84;                                            // bouffées / s / avion
const CLOUD_B = 1400, CLOUD_TH = 210;                        // mer de nuages : base sous la formation, épaisseur

const v3 = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
const col = h => new THREE.Color(h);
const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const lerp = (a, b, t) => a + (b - a) * t;
const sstep = (a, b, x) => { const t = clamp((x - a) / (b - a)); return t * t * (3 - 2 * t); };
const D2R = Math.PI / 180;
let seedR = 918273;
const rnd = () => (seedR = (seedR * 16807) % 2147483647) / 2147483647;

/* ---------- bruit périodique (nuages) : 256², deux canaux indépendants ---------- */
function noiseTexture() {
  const S = 256, out = new Uint8Array(S * S * 4);
  const chan = (seed, oct0) => {
    const f = new Float32Array(S * S);
    let amp = .5, tot = 0;
    for (let o = 0; o < 6; o++) {
      const P = 4 << (o + oct0), g = new Float32Array(P * P);
      for (let i = 0; i < P * P; i++) g[i] = rnd();
      const c = S / P;
      for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
        const gx = x / c, gy = y / c, x0 = Math.floor(gx), y0 = Math.floor(gy);
        let fx = gx - x0, fy = gy - y0; fx = fx * fx * (3 - 2 * fx); fy = fy * fy * (3 - 2 * fy);
        const a = g[(y0 % P) * P + x0 % P], b = g[(y0 % P) * P + (x0 + 1) % P], cc = g[((y0 + 1) % P) * P + x0 % P], d = g[((y0 + 1) % P) * P + (x0 + 1) % P];
        f[y * S + x] += amp * (a + (b - a) * fx + (cc - a) * fy + (a - b - cc + d) * fx * fy);
      }
      tot += amp; amp *= .5;
      if ((4 << (o + 1 + oct0)) > S) break;
    }
    let mn = 1e9, mx = -1e9; for (const v of f) { mn = Math.min(mn, v); mx = Math.max(mx, v); }
    return f.map(v => (v - mn) / (mx - mn));
  };
  const R = chan(1, 0), G = chan(2, 0);
  for (let i = 0; i < S * S; i++) { out[i * 4] = R[i] * 255; out[i * 4 + 1] = G[i] * 255; out[i * 4 + 2] = 0; out[i * 4 + 3] = 255; }
  const t = new THREE.DataTexture(out, S, S, THREE.RGBAFormat);
  t.wrapS = t.wrapT = THREE.RepeatWrapping; t.generateMipmaps = true;
  t.minFilter = THREE.LinearMipmapLinearFilter; t.magFilter = THREE.LinearFilter; t.needsUpdate = true;
  return t;
}

/* ---------- ciel + mer de nuages (sphère qui suit la caméra) ---------- */
const SKY_GLSL = /* glsl */`
uniform vec3 uSun;
vec3 skyCol(vec3 d){
  float y = d.y;
  vec3 zen = vec3(.004, .019, .098), mid = vec3(.012, .05, .192), hor = vec3(.12, .175, .29);
  vec3 c = mix(hor, mid, smoothstep(-.01, .13, y));
  c = mix(c, zen, smoothstep(.1, .7, y));
  float s = max(dot(normalize(vec3(d.x, max(y, 0.) * .6, d.z)), normalize(vec3(uSun.x, 0., uSun.z))), 0.);
  float low = 1. - smoothstep(-.02, .3, y);
  c += vec3(.55, .34, .17) * pow(s, 5.) * low * .55;          // halo chaud sur l'horizon, côté soleil
  float sd = max(dot(d, uSun), 0.);
  c += vec3(1., .78, .52) * (pow(sd, 40.) * .35 + pow(sd, 1600.) * 30.);
  return c;
}`;
const SKY_VS = 'varying vec3 vW; void main(){ vec4 w = modelMatrix * vec4(position, 1.); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }';
const SKY_FS = /* glsl */`
${SKY_GLSL}
uniform sampler2D uN; uniform vec3 uOff; uniform float uPix, uDof;
varying vec3 vW;
const float B = ${CLOUD_B.toFixed(1)}, TH = ${CLOUD_TH.toFixed(1)};
float tl(vec2 uv, float foot, float per){ return log2(max(foot / per * 256., 1.)); }
float H(vec2 p, float foot){
  vec2 a = p / 6100. + vec2(.13, uOff.x), b = p / 1900. + vec2(.71, uOff.y), c = p / 560. + vec2(.37, uOff.z);
  float h = textureLod(uN, a, tl(a, foot, 6100.)).r * .56 + textureLod(uN, b, tl(b, foot, 1900.)).g * .30 + textureLod(uN, c, tl(c, foot, 560.)).r * .1;
  return smoothstep(.16, .72, h);
}
void main(){
  vec3 d = normalize(vW - cameraPosition);
  vec3 col = skyCol(d);
  if (d.y < -.0004) {
    vec3 o = cameraPosition;
    float yt = -B + TH, yb = -B;
    float t0 = (yt - o.y) / d.y, t1 = (yb - o.y) / d.y;
    float k = uPix / max(-d.y, .015) + uDof; // + cercle de confusion : arrière-plan à peine flou (mise au point sur la patrouille)
    const int N = 26;
    float dt = (t1 - t0) / float(N), t = t0, hit = t1, pre = t0, found = 0.;
    for (int i = 0; i < N; i++) {
      vec3 p = o + d * t;
      float h = H(p.xz, t * k);
      if (found < .5 && p.y < yb + TH * h) { hit = t; found = 1.; }
      if (found < .5) pre = t;
      t += dt;
    }
    if (found > .5) { // affine
      float a = pre, b = hit;
      for (int i = 0; i < 5; i++) { float m = .5 * (a + b); vec3 p = o + d * m; if (p.y < yb + TH * H(p.xz, m * k)) b = m; else a = m; }
      hit = b;
    }
    vec3 p = o + d * hit;
    float foot = hit * k, h = H(p.xz, foot);
    vec3 cc;
    if (found > .5) {
      float e = max(6., foot * 1.5);
      float hx = H(p.xz + vec2(e, 0.), foot) - H(p.xz - vec2(e, 0.), foot);
      float hz = H(p.xz + vec2(0., e), foot) - H(p.xz - vec2(0., e), foot);
      vec3 n = normalize(vec3(-hx * TH / (2. * e), 1., -hz * TH / (2. * e)));
      // ombre portée par le relief (soleil rasant)
      float sh = 1.;
      for (int i = 1; i <= 5; i++) { vec3 q = p + uSun * (float(i) * float(i) * 22.); sh *= mix(1., .35, smoothstep(-6., 10., yb + TH * H(q.xz, foot) - q.y)); }
      float dif = clamp(dot(n, uSun) * .85 + .25, 0., 1.) * sh;
      float ao = .55 + .45 * smoothstep(0., .9, (p.y - yb) / TH);
      vec3 lit = vec3(1.0, .72, .5) * .62, shd = vec3(.06, .09, .17);
      cc = (shd * ao + lit * dif * ao);
      // liseré clair là où la lumière traverse les bords fins
      cc += vec3(1., .78, .55) * pow(1. - h, 3.) * .14 * sh;
    } else {
      cc = vec3(.06, .09, .13); // sol / mer entre deux nuages
    }
    float fog = 1. - exp(-hit / 11000.);
    vec3 haze = skyCol(normalize(vec3(d.x, -.005, d.z))) * vec3(.92, .9, .9);
    col = mix(cc, haze, fog);
    col = mix(col, skyCol(d), smoothstep(-.012, -.0004, d.y)); // horizon fondu
  }
  gl_FragColor = vec4(col, 1.);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}`;

/* ---------- environnement préfiltré pour les reflets de la laque ---------- */
function skyEnv(renderer, noise) {
  const sc = new THREE.Scene(), geo = new THREE.SphereGeometry(50, 96, 48);
  const mat = new THREE.ShaderMaterial({
    side: THREE.BackSide, uniforms: { uSun: { value: SUN }, uN: { value: noise } },
    vertexShader: 'varying vec3 vD; void main(){ vD = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.); }',
    fragmentShader: `${SKY_GLSL}
      uniform sampler2D uN;
      varying vec3 vD;
      void main(){ vec3 d = normalize(vD); vec3 c = skyCol(d);
        if (d.y < 0.) { // mer de nuages : moutonnement clair au soleil, creux bleutés (se lit dans le reflet des intrados)
          vec2 q = d.xz / max(-d.y, .03) * .35;
          float n = texture2D(uN, q * .5).r * .6 + texture2D(uN, q * 1.7 + .3).g * .4;
          vec3 cl = mix(vec3(.2, .24, .33), vec3(1.05, .86, .68), smoothstep(.3, .75, n));
          cl = mix(cl, vec3(.42, .42, .46), smoothstep(.2, .8, -d.y) * .4);
          c = mix(c, cl, smoothstep(0., .04, -d.y)); }
        gl_FragColor = vec4(c, 1.); }`
  });
  sc.add(new THREE.Mesh(geo, mat));
  const pm = new THREE.PMREMGenerator(renderer), rt = pm.fromScene(sc, 0);
  pm.dispose(); geo.dispose(); mat.dispose();
  return rt.texture;
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
      const d = b * (.25 + 1.25 * n) * Math.max(0, 1 - rr) ** 1.8;
      F[j * T + i] = d; if (d > mx) mx = d;
    }
    for (let k = 0; k < T * T; k++) F[k] = Math.min(1, F[k] / mx * 1.15);
    const tx = (tile & 1) * T, ty = (tile >> 1) * T;
    for (let j = 0; j < T; j++) for (let i = 0; i < T; i++) {
      const g = (x, y) => F[Math.min(T - 1, Math.max(0, y)) * T + Math.min(T - 1, Math.max(0, x))];
      const d = g(i, j);
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
uniform vec3 uWind; uniform vec3 uCol[3];
varying vec2 vUv, vTile; varying float vA, vEr, vRot, vFog; varying vec3 vCol;
void main(){
  float age = uTime - aD.x, sd = aD.y;
  // durée de vie très dispersée : la traîne s'effiloche au lieu de finir en bout arrondi
  float life = uLife * (.4 + .75 * pow(fract(sd * 7.31), .7));
  if (age < 0. || age > life) { gl_Position = vec4(0., 0., -2., 1.); return; }
  float k = age / life, kg = age / uLife;
  // déchirures : le panache se fragmente en lambeaux à mesure qu'il vieillit (bruit lent sur l'instant d'émission)
  float e = aD.x + aD.z * 17.3;
  float tear = .5 + .5 * sin(e * 1.13 + sin(e * .37) * 2.) * sin(e * .61 + 1.7 + sin(e * 2.3) * .6);
  float torn = mix(1., smoothstep(.22, .7, tear), smoothstep(.08, .45, kg));
  vec3 p = aP + aV * .6 * (1. - exp(-age / .6)) + uWind * age;
  float A = uTurb * pow(age, .8) * aD.w;
  vec3 q = (aP + uWind * age * .15) * .05;
  p += A * vec3(sin(q.y * 1.7 + q.z + age * .45) + .6 * sin(q.x * 3.1 - age * .7 + 1.3),
                .7 * (sin(q.x * 1.3 + q.z * .7 + age * .38 + 2.) + .6 * sin(q.z * 2.9 + q.y + age * .6)),
                .4 * (sin(q.x * 1.1 + q.y * 1.9 + age * .5 + 4.) + .6 * sin(q.y * 3.3 - age * .55)));
  p += A * .25 * vec3(sin(sd * 91.), sin(sd * 57. + 1.), sin(sd * 33. + 2.));
  p.y -= .18 * age * age;                       // la fumée retombe doucement
  p += A * 1.1 * kg * kg * vec3(sin(e * .9 + 1.), .5 * sin(e * .53), sin(e * .71 + 2.)); // lambeaux qui se séparent et dérivent
  float r = aD.w * (uR0 + (uR1 - uR0) * (1. - exp(-age / 1.1)) + uGrow * age * (.6 + .8 * fract(sd * 5.1))) * (.7 + .6 * fract(sd * 13.7));
  vec4 mv = modelViewMatrix * vec4(p, 1.);
  float rot = sd * 6.2832 + age * (fract(sd * 3.3) - .5) * .5;
  float c = cos(rot), s = sin(rot);
  mv.xy += mat2(c, s, -s, c) * position.xy * r * 1.35;
  vUv = position.xy * .5 + .5;
  float tile = floor(fract(sd * 4.77) * 4.);
  vTile = vec2(mod(tile, 2.), floor(tile / 2.)) * .5;
  vRot = rot;
  float dens = uOp * min(1., age * 10.) * pow(1. - k, 1.3) * clamp(pow(uR0 * aD.w * 1.3 / r, .42), .12, 1.) * torn * pow(clamp(1. - kg / 1.2, 0., 1.), 1.4) * (aD.z > .5 ? 1. - .35 * kg : 1.);
  dens *= smoothstep(uNear * .4, uNear, -mv.z) * smoothstep(1., .35, k);
  vA = dens;
  vEr = .06 + k * .62 + (1. - torn) * .2;     // érosion : les bords se creusent et la bouffée se troue
  vFog = 1. - exp(-pow(uFogD * -mv.z, 1.6));
  vCol = uCol[int(aD.z + .5)];
  gl_Position = projectionMatrix * mv;
}`;
const SMOKE_FS = /* glsl */`
uniform sampler2D uTex; uniform vec3 uSunV, uUpV, uSunC, uSkyC, uGndC, uFogC;
varying vec2 vUv, vTile; varying float vA, vEr, vRot, vFog; varying vec3 vCol;
void main(){
  vec4 t = texture2D(uTex, vTile + clamp(vUv, .006, .994) * .5);
  float a = smoothstep(vEr, vEr + .36, t.a) * vA;
  if (a < .002) discard;
  vec3 n = t.rgb * 2. - 1.;
  float c = cos(vRot), s = sin(vRot);
  n.xy = mat2(c, s, -s, c) * n.xy;
  n = normalize(n);
  float ndl = dot(n, uSunV);
  float sun = clamp(ndl * .7 + .3, 0., 1.);
  sun *= 1. - .4 * smoothstep(.35, 1., t.a) * clamp(-ndl + .3, 0., 1.);
  vec3 amb = mix(uGndC, uSkyC, dot(n, uUpV) * .5 + .5);
  vec3 col = vCol * (amb + uSunC * sun);
  // diffusion avant : les bords fins s'illuminent quand le soleil est derrière la fumée
  col += vCol * uSunC * pow(max(-uSunV.z, 0.), 4.) * (1. - t.a) * .8;
  col = mix(col, uFogC, vFog);
  gl_FragColor = vec4(col, a * (1. - vFog * .55));
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
      const k = a.itemSize; a.clearUpdateRanges(); a.addUpdateRange(s0 * k, c1 * k); if (c2 > 0) a.addUpdateRange(0, c2 * k); a.needsUpdate = true;
    }
    this.n = 0;
  }
}

/* ---------- le Fouga CM.170 Magister ----------
   Repère avion : nez vers +z, dos vers +y, aile droite du pilote vers -x. Mètres. Longueur ≈ 10,1 m, envergure ≈ 12,1 m (bidons). */
const P3 = (x, y, z) => new THREE.Vector3(x, y, z);

// loft de boucles fermées (même nombre de points) ; orientation des faces corrigée vers l'extérieur ; capuchons optionnels
function loft(rings, { cap0 = true, cap1 = true } = {}) {
  const m = rings[0].length, pos = [], idx = [];
  rings.forEach(r => r.forEach(v => pos.push(v.x, v.y, v.z)));
  for (let k = 0; k < rings.length - 1; k++) for (let j = 0; j < m; j++) {
    const a = k * m + j, b = k * m + (j + 1) % m, c = (k + 1) * m + j, d = (k + 1) * m + (j + 1) % m; idx.push(a, b, d, a, d, c);
  }
  // vote : normales de face contre direction centre de boucle -> face
  const cen = r => r.reduce((s, v) => s.add(v), P3(0, 0, 0)).multiplyScalar(1 / r.length);
  let vote = 0; const A = P3(0, 0, 0), B = P3(0, 0, 0), C = P3(0, 0, 0), n = P3(0, 0, 0), e1 = P3(0, 0, 0), e2 = P3(0, 0, 0);
  for (let k = 0; k < rings.length - 1; k++) {
    const cc = cen(rings[k]).add(cen(rings[k + 1])).multiplyScalar(.5);
    for (let j = 0; j < m; j += 3) {
      A.copy(rings[k][j]); B.copy(rings[k][(j + 1) % m]); C.copy(rings[k + 1][(j + 1) % m]);
      n.crossVectors(e1.subVectors(B, A), e2.subVectors(C, A));
      vote += Math.sign(n.dot(A.clone().add(C).multiplyScalar(.5).sub(cc)));
    }
  }
  if (vote < 0) for (let i = 0; i < idx.length; i += 3) { const t = idx[i + 1]; idx[i + 1] = idx[i + 2]; idx[i + 2] = t; }
  const caps = [];
  const capOf = (r, other) => {
    const c = cen(r), out = c.clone().sub(cen(other)), base = pos.length / 3;
    r.forEach(v => pos.push(v.x, v.y, v.z)); pos.push(c.x, c.y, c.z);
    n.crossVectors(e1.subVectors(r[0], c), e2.subVectors(r[Math.floor(m / 4)], c));
    const flip = n.dot(out) < 0;
    for (let j = 0; j < m; j++) flip ? idx.push(base + m, base + (j + 1) % m, base + j) : idx.push(base + m, base + j, base + (j + 1) % m);
  };
  if (cap0) capOf(rings[0], rings[1]);
  if (cap1) capOf(rings[rings.length - 1], rings[rings.length - 2]);
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx); g.computeVertexNormals();
  return g;
}
// couleur par face (centre du triangle) : aplats de livrée nets
function paint(geo, f) {
  if (geo.index) { const g2 = geo.toNonIndexed(); geo.dispose(); geo = g2; }
  const p = geo.attributes.position, c = new Float32Array(p.count * 3), t = new THREE.Color();
  for (let i = 0; i < p.count; i += 3) {
    t.copy(f((p.getX(i) + p.getX(i + 1) + p.getX(i + 2)) / 3, (p.getY(i) + p.getY(i + 1) + p.getY(i + 2)) / 3, (p.getZ(i) + p.getZ(i + 1) + p.getZ(i + 2)) / 3));
    for (let k = 0; k < 3; k++) { c[(i + k) * 3] = t.r; c[(i + k) * 3 + 1] = t.g; c[(i + k) * 3 + 2] = t.b; }
  }
  geo.setAttribute('color', new THREE.BufferAttribute(c, 3));
  return geo;
}
function merge(geos) {
  const parts = geos.map(g => (g.index ? g.toNonIndexed() : g));
  const total = parts.reduce((s, g) => s + g.attributes.position.count, 0), out = new THREE.BufferGeometry();
  const names = ['position', 'normal'].concat(parts.every(g => g.attributes.color) ? ['color'] : []);
  for (const name of names) {
    const arr = new Float32Array(total * 3); let o = 0;
    for (const g of parts) { arr.set(g.attributes[name].array, o); o += g.attributes[name].array.length; }
    out.setAttribute(name, new THREE.BufferAttribute(arr, 3));
  }
  parts.forEach(g => g.dispose()); geos.forEach(g => g.dispose());
  return out;
}
// section transversale en super-ellipse : demi-largeur w, dessus yt, dessous yb, décalage latéral cx
function sring(z, w, yt, yb, n = 56, e = 2.3, cx = 0) {
  const yc = (yt + yb) / 2, h = (yt - yb) / 2, r = [];
  for (let i = 0; i < n; i++) {
    const a = i / n * Math.PI * 2, c = Math.cos(a), s = Math.sin(a);
    r.push(P3(cx + w * Math.sign(c) * Math.abs(c) ** (2 / e), yc + h * Math.sign(s) * Math.abs(s) ** (2 / e), z));
  }
  return r;
}
// profil NACA symétrique entre deux fractions de corde (bord de fuite fermé quand x1 = 1)
const naca = x => 5 * (.2969 * Math.sqrt(x) - .126 * x - .3516 * x * x + .2843 * x ** 3 - .1036 * x ** 4);
function foilLoop(x0, x1, n = 18) {
  const xs = []; for (let i = 0; i <= n; i++) { const u = i / n; xs.push(x0 + (x1 - x0) * (x0 === 0 ? (1 - Math.cos(u * Math.PI / 2)) : u)); }
  const up = xs.map(x => [x, naca(Math.min(x, .999))]), lo = xs.slice().reverse().map(x => [x, -naca(Math.min(x, .999))]);
  if (x1 >= 1) { up[up.length - 1][1] = .0015; lo[0][1] = -.0015; }
  return up.concat(lo);
}
// une section de profil : origine o (point de bord d'attaque projeté), axe d'épaisseur up, corde vers -z
const foilSec = (loop, o, up, zLE, chord, t) => loop.map(([x, y]) => P3(o.x + up.x * y * t * chord, o.y + up.y * y * t * chord, zLE - x * chord));

/* livrée réelle de la Patrouille Tranchant (photos groupetranchant.com, patrouille-tranchant.com, airhistory.net) :
   dessus rouge vif, dessous et nacelles bleu roi, bande jaune du nez à l'entrée d'air, anneau de nez jaune et phare,
   bidons jaunes, papillon jaune à gouvernes rouges et bande bleue numérotée, verrières cerclées de rouge,
   « GROUPE TRANCHANT » en capitales romaines blanches sur l'extrados ET l'intrados, monogramme GT au bout de l'aile. */
const LIV = {
  BLUE: new THREE.Color('#1B2C98'), YEL: new THREE.Color('#F8C500'), RED: new THREE.Color('#B2031A'), GOLD: new THREE.Color('#D8A11E'),
  DARK: new THREE.Color('#141518'), COCK: new THREE.Color('#2a2c30'), GREY: new THREE.Color('#5d6066')
};
// la laque est calculée dans le shader à partir de la pièce (codée dans la couleur de sommet) et de la position : bords nets
const PART = { FUS: 1, NAC: 2, DUCT: 3, WING: 4, TANK: 5, TAIL: 6, COCK: 7, FRAME: 8, CONE: 9, YEL: 10 };
const pc = k => new THREE.Color().setRGB(k / 16, 0, 0);

function buildFouga(opt = {}) {
  const paintG = [], metalG = [], darkG = [], glassG = [], interG = [], helmG = [], visorG = [], suitG = [], movers = [];
  // fuselage : stations (z, demi-largeur, dessus, dessous) — habitacle ouvert sous la verrière
  const FUS = [[5.03, .075, .085, -.065], [5.0, .1, .11, -.09], [4.93, .125, .135, -.12], [4.8, .155, .155, -.16], [4.62, .185, .175, -.195], [4.45, .21, .19, -.22], [3.95, .295, .265, -.305], [3.9, .3, .27, -.31], [3.55, .35, .315, -.37], [3.4, .37, .34, -.4], [2.9, .42, .41, -.47],
    [2.55, .45, .45, -.51], [2.35, .46, .42, -.53], [2.0, .48, .40, -.55], [1.0, .5, .40, -.57], [0, .5, .40, -.57], [-.7, .49, .41, -.56], [-1.0, .485, .45, -.55], [-1.6, .46, .47, -.52],
    [-2.3, .42, .46, -.47], [-3.0, .36, .43, -.39], [-3.7, .29, .38, -.3], [-4.4, .21, .32, -.2], [-4.85, .14, .27, -.12], [-5.0, .1, .24, -.08]];
  const fus = loft(FUS.map(([z, w, t, b]) => sring(z, w, t, b, 64, 2.25)), { cap0: true, cap1: true });
  paintG.push(paint(fus, (x, y, z) => {
    if (y > .36 && z < 2.3 && z > -.85 && Math.abs(x) < .4) return pc(PART.COCK);       // plancher et flancs intérieurs de l'habitacle
    if (z < -4.97) return pc(PART.CONE);
    return pc(PART.FUS);
  }));
  // phare d'atterrissage dans l'anneau jaune du nez, et les deux tubes de Pitot jaunes sur les joues
  const lens = new THREE.SphereGeometry(.072, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2); lens.rotateX(Math.PI / 2); lens.scale(1, 1, .55); lens.translate(0, .01, 5.02);
  metalG.push(paint(lens, () => new THREE.Color('#d9dcd8')));
  for (const sx of [-1, 1]) {
    const rod = new THREE.CylinderGeometry(.016, .016, .62, 8); rod.rotateX(Math.PI / 2); rod.translate(sx * .25, -.035, 4.28);
    const st = new THREE.BoxGeometry(.1, .025, .06); st.translate(sx * .2, -.035, 4.05);
    const tipR = new THREE.CylinderGeometry(.006, .012, .12, 6); tipR.rotateX(Math.PI / 2); tipR.translate(sx * .25, -.035, 4.65);
    paintG.push(paint(rod, () => pc(PART.YEL)), paint(st, () => pc(PART.YEL))); metalG.push(paint(tipR, () => new THREE.Color('#9a9a98')));
  }
  // nacelles des Marboré, accolées au fuselage : entrée d'air ovale à l'emplanture, conduit sombre, tuyère qui dépasse
  for (const sx of [-1, 1]) {
    const cx = sx * .64, yc = -.2, R = (z, w, h, s = 1) => sring(z, w * s, yc + h * s, yc - h * s, 44, 2.1, cx);
    const rings = [R(1.15, .3, .32, .8), R(1.92, .3, .32, .82), R(2.0, .33, .35, .9), R(1.94, .37, .39), R(1.6, .395, .41), R(.6, .4, .41), R(-.6, .39, .4), R(-1.4, .36, .37), R(-2.0, .3, .31), R(-2.25, .27, .28)];
    const nac = loft(rings, { cap0: true, cap1: true });
    paintG.push(paint(nac, (x, y, z) => {
      const r = Math.hypot((x - cx) / .4, (y - yc) / .41);
      return pc(z > 1.1 && r < .9 && z < 1.93 ? PART.DUCT : PART.NAC);                  // conduit sombre / nacelle (lèvre rouge : shader)
    }));
    // tuyère en métal brûlé, plus fond sombre
    const tu = new THREE.LatheGeometry([[.255, -2.15], [.253, -2.25], [.25, -2.4], [.242, -2.52], [.235, -2.62], [.215, -2.7], [.19, -2.7], [.2, -2.45]].map(([r, z]) => new THREE.Vector2(r, z)), 48);
    tu.rotateX(Math.PI / 2); tu.translate(cx, yc, 0);
    // revenu de chaleur : paille près de la nacelle, puis bleu-violet, bord de fuite noirci par la suie
    const HT = [[-2.15, '#8f8268'], [-2.3, '#9a7b52'], [-2.42, '#6d4f6e'], [-2.53, '#3d4f78'], [-2.63, '#46464c'], [-2.71, '#252321']].map(([z, c]) => [z, new THREE.Color(c)]);
    metalG.push(paint(tu, (x, y, z) => { if (Math.hypot(x - cx, y - yc) < .205 && z > -2.69) return new THREE.Color('#1c1a18'); let i = 0; while (i < HT.length - 2 && z < HT[i + 1][0]) i++; return HT[i][1].clone().lerp(HT[i + 1][1], clamp((HT[i][0] - z) / (HT[i][0] - HT[i + 1][0]))); }));
    const bot = new THREE.CircleGeometry(.2, 28); bot.rotateY(Math.PI); bot.translate(cx, yc, -2.42); darkG.push(bot);
  }
  // aile droite effilée, dièdre 4°, bord d'attaque légèrement en flèche ; aileron mobile sur la partie externe
  const dih = Math.tan(4 * D2R), UP = P3(0, 1, 0);
  const W = x => ({ zLE: 1.25 - (x - .7) * .1, c: 2.45 - (x - .7) * (1.15 / 4.6), y: -.28 + (x - .7) * dih, t: .135 - (x - .7) * .007 });
  const full = foilLoop(0, 1), fwd = foilLoop(0, .74), aft = foilLoop(.745, 1, 8);
  const wingCol = () => () => pc(PART.WING);
  for (const sx of [-1, 1]) {
    const sec = (x, loop) => { const s = W(x); return foilSec(loop, P3(sx * x, s.y, 0), UP, s.zLE, s.c, s.t); };
    paintG.push(paint(loft([.7, 1.6, 2.5, 3.3].map(x => sec(x, full))), wingCol()));
    paintG.push(paint(loft([3.3, 4.2, 5.1].map(x => sec(x, fwd))), wingCol()));
    paintG.push(paint(loft([5.1, 5.32].map(x => sec(x, full))), wingCol()));
    // aileron (articulé sur sa charnière)
    const ail = paint(loft([3.32, 4.2, 5.08].map(x => sec(x, aft))), wingCol());
    const hA = P3(sx * 3.32, W(3.32).y, W(3.32).zLE - .745 * W(3.32).c), hB = P3(sx * 5.08, W(5.08).y, W(5.08).zLE - .745 * W(5.08).c);
    movers.push({ geo: ail, mat: 'paint', a: hA, axis: hB.clone().sub(hA).normalize(), kind: 'ail', side: sx });
    // réservoir de bout d'aile en goutte : avant en ogive, arrière effilé
    const tp = [[0, 1.85], [.07, 1.78], [.15, 1.6], [.215, 1.3], [.26, .9], [.275, .4], [.27, -.2], [.24, -.75], [.18, -1.15], [.1, -1.42], [0, -1.58]];
    const tk = new THREE.LatheGeometry(tp.map(([r, z]) => new THREE.Vector2(r, z)).reverse(), 36);
    tk.rotateX(Math.PI / 2); tk.translate(sx * 5.47, W(5.3).y, .1);
    paintG.push(paint(tk, () => pc(PART.TANK)));
  }
  // empennage papillon (110° entre les plans) ; gouverne arrière mobile
  const a35 = 35 * D2R;
  for (const sx of [-1, 1]) {
    const dir = P3(sx * Math.cos(a35), Math.sin(a35), 0), th = P3(-sx * Math.sin(a35), Math.cos(a35), 0), o = P3(sx * .1, .3, 0);
    const T = s => ({ zLE: -2.55 - s * .62, c: 2.05 - s * .5, t: .105 - s * .012 });
    const sec = (s, loop) => { const q = T(s); return foilSec(loop, o.clone().addScaledVector(dir, s), th, q.zLE, q.c, q.t); };
    const col = () => pc(PART.TAIL);
    paintG.push(paint(loft([0, .75, 1.75, 2.25].map(s => sec(s, foilLoop(0, .66)))), col));
    paintG.push(paint(loft([2.25, 2.38].map(s => sec(s, full))), col));
    const rv = paint(loft([.12, .75, 1.75, 2.24].map(s => sec(s, foilLoop(.665, 1, 8)))), col);
    const ha = o.clone().addScaledVector(dir, .12).add(P3(0, 0, T(.12).zLE - .665 * T(.12).c)), hb = o.clone().addScaledVector(dir, 2.24).add(P3(0, 0, T(2.24).zLE - .665 * T(2.24).c));
    movers.push({ geo: rv, mat: 'paint', a: ha, axis: hb.clone().sub(ha).normalize(), kind: 'rv', side: sx });
  }
  // verrière biplace en tandem : bulle continue, arceaux du pare-brise, de séparation et arrière, rails de seuil
  const CAN = [[2.62, .2, .44], [2.45, .3, .58], [2.2, .37, .74], [1.9, .4, .86], [1.5, .41, .95], [1.0, .415, 1.0], [.4, .415, 1.02], [-.1, .4, .99], [-.45, .36, .9], [-.75, .27, .74], [-.98, .14, .56], [-1.1, .04, .47]];
  const yb = .3;
  const canRing = (z, w, top, s = 1) => { const r = [], n = 40; for (let i = 0; i <= n; i++) { const a = i / n * Math.PI; r.push(P3(Math.cos(a) * w * s, yb + (top - yb) * s * Math.sin(a) ** .72, z)); } r.push(P3(-w * s * .9, yb - .05, z), P3(w * s * .9, yb - .05, z)); return r; };
  glassG.push(loft(CAN.map(([z, w, t]) => canRing(z, w, t)), { cap0: true, cap1: true }));
  const arch = (z, rad = .022) => {
    const i = CAN.findIndex(c => c[0] < z), c0 = CAN[i - 1], c1 = CAN[i], f = (z - c0[0]) / (c1[0] - c0[0]);
    const w = lerp(c0[1], c1[1], f), t = lerp(c0[2], c1[2], f), pts = canRing(z, w, t, 1.012).slice(0, 41).filter(p => p.y > .38);
    return new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 40, rad, 6, false);
  };
  // CM-170R : pare-brise fixe, deux verrières séparées (chacune s'ouvre sur le côté), arceau fixe entre les deux ; cadres rouges
  [[2.22, .03], [.8, .026], [.64, .026], [-.5, .024]].forEach(([z, r]) => paintG.push(paint(arch(z, r), () => pc(PART.FRAME))));
  for (const sx of [-1, 1]) {
    const rail = CAN.slice(0, 11).map(([z, w]) => P3(sx * w * .98, .41, z));
    paintG.push(paint(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(rail), 40, .026, 6, false), () => pc(PART.FRAME)));
  }
  // habitacle : planche de bord, sièges, deux pilotes (casques, visières)
  const box = (w, h, d, x, y, z, rx = 0) => { const b = new THREE.BoxGeometry(w, h, d); b.rotateX(rx); b.translate(x, y, z); return b; };
  interG.push(box(.62, .12, .32, 0, .58, 2.12, -.25), box(.56, .14, .1, 0, .63, .78, -.1));
  const HELM = { white: new THREE.Color('#e4e3de'), blue: new THREE.Color('#1f3a8a') }, GREEN = new THREE.Color('#a3201f'), MASK = new THREE.Color('#2c2d2b'); // combinaisons rouges de l'équipe
  const pilots = [[1.28, 0, 'white', true], [.02, .06, 'blue', opt.rear !== false]];
  pilots.forEach(([z, dy, hc, on]) => {
    interG.push(box(.44, .5, .1, 0, .58 + dy, z - .33, .2), box(.42, .12, .4, 0, .42 + dy, z - .1));            // dossier + assise
    if (!on) return;
    // le pilote : combinaison, épaules, harnais, tête tournée vers le leader (yaw) et légèrement levée (pitch)
    const hx = 0, hy = .87 + dy, hz = z - .1, R = new THREE.Matrix4().makeRotationY(opt.yaw || 0).multiply(new THREE.Matrix4().makeRotationX(-(opt.pitch || 0)));
    const at = (g, col) => { g.applyMatrix4(R); g.translate(hx, hy, hz); return col ? paint(g, () => col) : g; };
    const tor = new THREE.CapsuleGeometry(.15, .2, 6, 14); tor.scale(1.2, 1, .78); tor.translate(0, .6 + dy, z - .15); suitG.push(paint(tor, () => GREEN));
    const sh = new THREE.CapsuleGeometry(.075, .3, 4, 10); sh.rotateZ(Math.PI / 2); sh.translate(0, .71 + dy, z - .17); suitG.push(paint(sh, () => GREEN));
    for (const s of [-1, 1]) interG.push(box(.045, .3, .02, s * .1, .66 + dy, z - .04, .25));                    // bretelles du harnais
    const nk = new THREE.CylinderGeometry(.055, .065, .1, 10); nk.translate(0, .78 + dy, z - .12); suitG.push(paint(nk, () => GREEN));
    const hel = at(new THREE.SphereGeometry(.128, 28, 18).scale(1, 1.05, 1.14), HELM[hc]); helmG.push(hel);
    const vis = at(new THREE.SphereGeometry(.136, 28, 14, Math.PI * .1, Math.PI * .8, Math.PI * .2, Math.PI * .36).scale(1, 1.05, 1.14)); visorG.push(vis);
    const msk = at(new THREE.SphereGeometry(.06, 14, 10).scale(1, .95, 1.1).translate(0, -.085, .095), MASK); suitG.push(msk);
    const hose = at(new THREE.CylinderGeometry(.018, .018, .22, 6).rotateX(.9).translate(.03, -.17, .03), MASK); suitG.push(hose);
  });
  // détails : sonde pitot au nez, antenne lame dorsale, fouet ventral, feux de position (rouge à gauche, vert à droite, blanc en queue)
  const bl = new THREE.BoxGeometry(.01, .13, .1); bl.applyMatrix4(new THREE.Matrix4().makeShear(0, 0, 0, 0, -.7, 0)); bl.translate(0, .52, -1.75); darkG.push(bl);
  const wh = new THREE.CylinderGeometry(.004, .008, .45, 5); wh.rotateX(-.5); wh.translate(0, -.73, -.9); darkG.push(wh);
  const liteG = [];
  for (const sx of [-1, 1]) {
    const nl = new THREE.SphereGeometry(.045, 10, 8); nl.scale(.7, 1, 1.3); nl.translate(sx * 5.72, W(5.3).y, .25);
    liteG.push(paint(nl, () => (sx > 0 ? new THREE.Color(4, .05, .05) : new THREE.Color(.05, 3, .6))));
  }
  const tl = new THREE.SphereGeometry(.035, 8, 6); tl.translate(0, .25, -5.02); liteG.push(paint(tl, () => new THREE.Color(3, 3, 2.8)));
  const fixGroup = arr => (arr.length ? merge(arr) : null);
  // les surfaces mobiles gardent leur propre géométrie
  return { paint: fixGroup(paintG), metal: fixGroup(metalG), dark: fixGroup(darkG), glass: fixGroup(glassG), inter: fixGroup(interG), helm: fixGroup(helmG), visor: fixGroup(visorG), suit: fixGroup(suitG), lite: fixGroup(liteG), movers };
}

/* ---------- matériaux ---------- */
const PANEL_GLSL = /* glsl */`
varying vec3 vObjP;
float hsh(vec3 p){ p = fract(p * .3183099 + .1); p *= 17.; return fract(p.x * p.y * p.z * (p.x + p.y + p.z)); }
float vnz(vec3 x){ vec3 i = floor(x), f = fract(x); f = f * f * (3. - 2. * f);
  return mix(mix(mix(hsh(i), hsh(i + vec3(1,0,0)), f.x), mix(hsh(i + vec3(0,1,0)), hsh(i + vec3(1,1,0)), f.x), f.y),
             mix(mix(hsh(i + vec3(0,0,1)), hsh(i + vec3(1,0,1)), f.x), mix(hsh(i + vec3(0,1,1)), hsh(i + vec3(1,1,1)), f.x), f.y), f.z); }
float pl(float v, float c){ float f = fwidth(v) * 1.1 + .0015; return 1. - smoothstep(.0045, .0045 + f, abs(v - c)); }
float rv(float v, float c, float s){ float f = fwidth(s) * 1.5 + .002; float d = length(vec2(v - c, (fract(s / .085) - .5) * .085)); return 1. - smoothstep(.009, .009 + f, d); }
// lignes de panneaux (m) et rangées de rivets, définies dans le repère avion
float panel(vec3 p, out float riv){
  float ax = abs(p.x), m = 0.; riv = 0.;
  if (ax < .56 && p.y > -.62) {
    float s = atan(p.y + .05, p.x) * .5;
    for (int i = 0; i < 7; i++) { float z = i == 0 ? 4.42 : i == 1 ? 3.62 : i == 2 ? 2.66 : i == 3 ? -1.02 : i == 4 ? -2.05 : i == 5 ? -3.15 : -4.15; m = max(m, pl(p.z, z)); riv = max(riv, rv(p.z, z + .045, s)); }
    m = max(m, pl(p.y, -.1) * step(-3.1, p.z) * step(p.z, 2.6) * step(.3, ax));
    m = max(m, pl(ax, .16) * step(p.y, -.4) * step(-1.6, p.z) * step(p.z, 1.2));     // trappes du train
    m = max(m, pl(p.z, 1.2) * step(p.y, -.4) * step(ax, .16));
  } else if (ax > .95 && ax < 5.2 && abs(p.y + .2) < .45) {
    m = max(m, pl(ax, 1.9)); m = max(m, pl(ax, 3.3));
    float zs = 1.25 - (ax - .7) * .1 - .3 * (2.45 - (ax - .7) * .25);
    m = max(m, pl(p.z, zs) * step(1.1, ax)); riv = max(riv, rv(p.z, zs - .04, ax));
    m = max(m, pl(ax, 1.25) * step(p.y, -.25) * step(p.z, .9) * step(-.6, p.z));  // trappe de roue
  }
  return m;
}
// salissures : suie derrière les tuyères et sous les nacelles, traînées le long de l'écoulement
float grime(vec3 p){
  float ax = abs(p.x), n = vnz(vec3(p.x * 9., p.y * 9., p.z * 1.2)) * .6 + vnz(p * 23.) * .4;
  float soot = smoothstep(-1.4, -2.6, p.z) * (1. - smoothstep(.15, .9, abs(ax - .64))) * smoothstep(.3, -.4, p.y);
  float belly = smoothstep(-.3, -.55, p.y) * smoothstep(1.5, -1., p.z) * .5;
  return clamp((soot + belly) * (.55 + .7 * n), 0., 1.);
}`;
/* occlusion ambiante : l'avion est approché par des primitives à distance signée (fuselage, nacelles, aile, bidons,
   verrière, papillon) ; on sonde le long de la normale (repère avion) — jonctions aile/fuselage, nacelles, emplanture
   du papillon, pied de verrière s'assombrissent sous la lumière du ciel et des nuages, sans passe écran. */
const AO_GLSL = /* glsl */`
varying vec3 vObjN;
float sdRC(vec3 p, vec3 a, vec3 b, float ra, float rb){ vec3 pa = p - a, ba = b - a; float h = clamp(dot(pa, ba) / dot(ba, ba), 0., 1.); return length(pa - ba * h) - mix(ra, rb, h); }
float sdE(vec3 p, vec3 r){ float k0 = length(p / r), k1 = length(p / (r * r)); return k0 * (k0 - 1.) / max(k1, 1e-4); }
float sdSlab(float dx, float dy, float dz){ vec3 q = vec3(dx, dy, dz); return length(max(q, 0.)) + min(max(q.x, max(q.y, q.z)), 0.); }
float airSDF(vec3 p){
  vec3 q = vec3(abs(p.x), p.y, p.z), f = vec3(p.x, p.y + .07, p.z);
  float d = sdRC(f, vec3(0., 0., 4.7), vec3(0., .02, 2.6), .1, .41);
  d = min(d, sdRC(f, vec3(0., .02, 2.6), vec3(0., 0., -1.), .41, .45));
  d = min(d, sdRC(f, vec3(0., 0., -1.), vec3(0., .1, -4.8), .45, .12));
  d = min(d, sdRC(q, vec3(.64, -.2, 1.85), vec3(.64, -.2, -2.1), .36, .26));
  float wx = q.x - .7, zl = 1.25 - wx * .1, c = 2.45 - wx * .25, yw = -.28 + wx * .07;
  d = min(d, sdSlab(max(-wx, q.x - 5.25), abs(q.y - yw) - .055 * c, max(q.z - zl + .04, zl - c + .04 - q.z)));
  d = min(d, sdRC(q, vec3(5.47, .04, 1.55), vec3(5.47, .04, -1.15), .24, .12));
  d = min(d, sdE(p - vec3(0., .56, .75), vec3(.37, .41, 1.72)));
  vec2 tq = q.xy - vec2(.1, .3); float s = dot(tq, vec2(.819, .574)), tt = dot(tq, vec2(-.574, .819));
  float tzl = -2.55 - s * .62, tc = 2.05 - s * .5;
  d = min(d, sdSlab(max(-s, s - 2.3), abs(tt) - .045 * tc, max(q.z - tzl, tzl - tc - q.z)));
  return d;
}
float airAO(vec3 p, vec3 n){
  float occ = 0., sca = 1.;
  for (int i = 0; i < 5; i++) { float fi = float(i), h = .06 + .1 * fi + .035 * fi * fi; occ += clamp((.85 * h - airSDF(p + n * h)) / h, 0., 1.) * sca; sca *= .8; }
  return clamp(1. - .26 * occ, 0., 1.);
}`;
const AO_INJECT = `#include <aomap_fragment>
  reflectedLight.indirectDiffuse *= airOcc;
  #if defined( USE_CLEARCOAT )
    clearcoatSpecularIndirect *= airOcc;
  #endif
  #if defined( USE_ENVMAP ) && defined( STANDARD )
    reflectedLight.indirectSpecular *= computeSpecularOcclusion( saturate( dot( geometryNormal, geometryViewDir ) ), airOcc, material.roughness );
  #endif`;
const objVaryings = sh => {
  sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vObjP; varying vec3 vObjN;')
    .replace('#include <begin_vertex>', '#include <begin_vertex>\nvObjP = position; vObjN = objectNormal;');
};
// métal, pièces sombres : même occlusion, plus un voile de suie
function withAO(m) {
  m.onBeforeCompile = sh => {
    objVaryings(sh);
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nvarying vec3 vObjP;\n' + AO_GLSL)
      .replace('#include <color_fragment>', '#include <color_fragment>\nfloat airOcc = airAO(vObjP, normalize(vObjN)); diffuseColor.rgb *= mix(1., airOcc, .4);')
      .replace('#include <aomap_fragment>', AO_INJECT);
  };
  m.customProgramCacheKey = () => 'airAO';
  return m;
}

/* ---------- marquages : atlas canvas 2048² (sans flipY : v = y canvas / 2048) ----------
   rangée 0 : « GROUPE » + monogramme GT bleu (extrados)   rangée 1 : « GROUPE » + monogramme GT rouge (intrados)
   rangée 2 : « TRANCHANT »                                rangée 3 : écusson du papillon, pastille GT du nez, dragon doré ;
   cartouches « GROUPE TRANCHANT » et immatriculations. Une bande = 5 m × 1,25 m d'aile. */
// immatriculations réelles des Fouga de la patrouille (airhistory.net) ; F-GKYF porte le n° 3, F-GSYD le n° 4
const REG = ['F-AZZD', 'F-GJMN', 'F-GKYF', 'F-GSYD', 'F-HDND'];
const SERIF = '"Trajan Pro", "Times New Roman", Times, "Liberation Serif", "Noto Serif", "DejaVu Serif", Georgia, serif';
function gtMono(g, cx, cy, r, cG, cT, lG, lT) {
  // monogramme GT : deux pastilles accolées, G et T en capitales (d'après le logo du site, img/favicon.svg)
  [[cx - r * .98, cG, lG, 'G'], [cx + r * .98, cT, lT, 'T']].forEach(([x, c, l, ch]) => {
    g.fillStyle = '#F6F5F0'; g.beginPath(); g.arc(x, cy, r * 1.08, 0, Math.PI * 2); g.fill();
    g.fillStyle = c; g.beginPath(); g.arc(x, cy, r, 0, Math.PI * 2); g.fill();
    g.fillStyle = l; g.font = `800 ${Math.round(r * 1.32)}px Archivo, "Helvetica Neue", Arial, sans-serif`; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillText(ch, x, cy + r * .06);
  });
}
// capitales romaines « à la Trajan » : initiale haute, petites capitales, légère condensation, approche généreuse
function serifWord(g, word, x0, x1, base, hCap, hSmall) {
  const parts = [[word[0], hCap], ...[...word.slice(1)].map(c => [c, hSmall])];
  const wOf = ([c, h]) => { g.font = `600 ${h / .69}px ${SERIF}`; return g.measureText(c).width; };
  const track = hSmall * .2, tot = parts.reduce((s, p) => s + wOf(p), 0) + track * (parts.length - 1);
  const sx = Math.min(1, (x1 - x0) / tot) * .96;
  let x = x0 + ((x1 - x0) - tot * sx) / 2;
  g.save(); g.textAlign = 'left'; g.textBaseline = 'alphabetic'; g.fillStyle = '#F7F6F1';
  for (const p of parts) { const w = wOf(p); g.save(); g.translate(x, base); g.scale(sx, 1); g.fillText(p[0], 0, 0); g.restore(); x += (w + track) * sx; }
  g.restore();
}
function dragon(g, cx, cy, s) {
  // dragon héraldique doré (emblème du nez et du ventre), tête vers l'avant : ailes déployées en festons, queue enroulée
  g.save(); g.translate(cx, cy); g.scale(s, s); g.lineJoin = 'round'; g.lineCap = 'round';
  const wing = sx => { const p = new Path2D(); p.moveTo(sx * 8, -22); p.bezierCurveTo(sx * 40, -60, sx * 85, -70, sx * 112, -58);
    p.lineTo(sx * 96, -40); p.lineTo(sx * 106, -30); p.lineTo(sx * 86, -16); p.lineTo(sx * 94, -4); p.lineTo(sx * 70, 4); p.lineTo(sx * 74, 16);
    p.bezierCurveTo(sx * 50, 18, sx * 26, 10, sx * 10, 6); p.closePath(); return p; };
  const body = new Path2D('M0 -92 C14 -86 20 -72 14 -60 L22 -54 L12 -48 C22 -30 22 10 14 40 C8 62 -8 62 -14 40 C-22 10 -22 -30 -12 -48 L-22 -54 L-14 -60 C-20 -72 -14 -86 0 -92 Z');
  const tail = new Path2D('M-6 54 C-10 80 20 88 30 104 C38 118 22 128 6 120 C20 118 24 110 12 102 C-8 90 -24 74 -12 50 Z');
  g.fillStyle = '#E2AC28'; g.strokeStyle = '#6e4a06'; g.lineWidth = 5;
  for (const p of [wing(-1), wing(1), tail, body]) { g.fill(p); g.stroke(p); }
  g.strokeStyle = '#FFE38F'; g.lineWidth = 3.5;
  for (const sx of [-1, 1]) { g.beginPath(); g.moveTo(sx * 14, -18); g.quadraticCurveTo(sx * 55, -48, sx * 100, -54); g.stroke(); }
  g.beginPath(); g.moveTo(-8, -30); g.lineTo(8, -20); g.moveTo(-8, -10); g.lineTo(8, 0); g.moveTo(-8, 10); g.lineTo(8, 20); g.stroke();
  g.fillStyle = '#6e4a06'; g.beginPath(); g.arc(-6, -74, 3.5, 0, 7); g.arc(6, -74, 3.5, 0, 7); g.fill();
  g.restore();
}
function decalAtlas() {
  const S = 2048, cv = document.createElement('canvas'); cv.width = cv.height = S;
  const g = cv.getContext('2d');
  // bandes d'aile : 2048 px ↔ 5 m (410 px/m) ; capitales étroites et hautes comme sur l'avion : initiale 1,0 m, petites
  // capitales 0,84 m (≈ 60 % de la corde) ; axe au milieu de la bande
  const PXM = S / 5, base = r => r * 512 + 256 + .42 * PXM;
  // GROUPE : lu du saumon vers l'emplanture, monogramme côté saumon (bande : u = 0 à 5,25 m du plan de symétrie)
  for (const r of [0, 1]) {
    gtMono(g, .42 * PXM, r * 512 + 256, .18 * PXM, r ? '#D3112B' : '#1D2F9C', '#F4BF12', '#F7F6F1', '#1D2F9C');
    serifWord(g, 'GROUPE', .88 * PXM, 3.95 * PXM, base(r), 1 * PXM, .84 * PXM);
  }
  // TRANCHANT : lu de l'emplanture vers le saumon (bande : u = 0 à 0,25 m)
  serifWord(g, 'TRANCHANT', 1.02 * PXM, 4.85 * PXM, base(2), 1 * PXM, .84 * PXM);
  // écusson ovale des gouvernes papillon (bleu, liseré blanc, chevron rouge et jaune)
  {
    const cx = 128, cy = 1536 + 128; g.save(); g.translate(cx, cy);
    g.fillStyle = '#F6F5F0'; g.beginPath(); g.ellipse(0, 0, 112, 78, 0, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#1D2F9C'; g.beginPath(); g.ellipse(0, 0, 100, 66, 0, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#D3112B'; g.beginPath(); g.moveTo(-70, 30); g.lineTo(0, -40); g.lineTo(70, 30); g.lineTo(48, 30); g.lineTo(0, -12); g.lineTo(-48, 30); g.fill();
    g.fillStyle = '#F4BF12'; g.beginPath(); g.arc(0, 26, 16, 0, Math.PI * 2); g.fill(); g.restore();
  }
  // pastille GT du nez (G bleu, T rouge) ; dragon doré
  gtMono(g, 5 * 256 + 128, 1536 + 128, 56, '#1D2F9C', '#D3112B', '#F7F6F1', '#F7F6F1');
  dragon(g, 6 * 256 + 128, 1536 + 120, 1.0);
  // cartouches blancs « GT GROUPE TRANCHANT » (sous chaque verrière) et immatriculations
  const slot = k => [(k % 4) * 512, 1792 + (k >> 2) * 128];
  {
    const [x, y] = slot(5); g.fillStyle = '#F6F5F0'; g.beginPath(); g.roundRect(x + 30, y + 10, 452, 108, 14); g.fill();
    g.strokeStyle = '#1D2F9C'; g.lineWidth = 5; g.stroke();
    gtMono(g, x + 104, y + 64, 30, '#1D2F9C', '#F4BF12', '#F7F6F1', '#1D2F9C');
    g.fillStyle = '#1D2F9C'; g.font = `600 44px ${SERIF}`; g.textAlign = 'left'; g.textBaseline = 'alphabetic';
    g.fillText('GROUPE', x + 175, y + 58); g.fillText('TRANCHANT', x + 175, y + 104);
  }
  g.textAlign = 'center'; g.textBaseline = 'middle';
  REG.forEach((r, k) => { const [x, y] = slot(k); g.fillStyle = '#F2F1EC'; g.font = '700 84px "Helvetica Neue", Arial, sans-serif'; g.save(); g.translate(x + 256, y + 66); g.scale(1.1, 1); g.fillText(r, 0, 0); g.restore(); });
  const t = new THREE.CanvasTexture(cv);
  t.flipY = false; t.premultiplyAlpha = true; t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; t.generateMipmaps = true; t.minFilter = THREE.LinearMipmapLinearFilter;
  return t;
}

// la laque : panneaux, rivets, ondulation des tôles, usure des bords d'attaque, coulures et suie, marquages, AO
function paintMaterial(id, decals) {
  const m = new THREE.MeshPhysicalMaterial({ vertexColors: true, metalness: 0, roughness: .32, clearcoat: 1, clearcoatRoughness: .04, envMapIntensity: 1 });
  m.customProgramCacheKey = () => 'airPaint';
  m.onBeforeCompile = sh => {
    sh.uniforms.uDec = { value: decals }; sh.uniforms.uId = { value: id };
    for (const [k, c] of [['uRed', LIV.RED], ['uBlue', LIV.BLUE], ['uYel', LIV.YEL], ['uGold', LIV.GOLD], ['uDark', LIV.DARK], ['uCock', LIV.COCK]]) sh.uniforms[k] = { value: c };
    objVaryings(sh);
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nuniform sampler2D uDec; uniform float uId; uniform vec3 uRed, uBlue, uYel, uGold, uDark, uCock;\n' + PANEL_GLSL + AO_GLSL + `
      // projection d'un rectangle de l'atlas (rect : x, y, largeur, hauteur en uv) ; masque hors zone, pas de branchement
      vec4 dcl(vec2 uv, vec4 rect){ vec2 c = clamp(uv, .002, .998); float m = step(abs(uv.x - .5), .5) * step(abs(uv.y - .5), .5); vec4 t = texture2D(uDec, rect.xy + c * rect.zw); return vec4(t.rgb / max(t.a, .004), t.a * m); } // atlas prémultiplié : mips sans liseré sombre
      float panelId(vec3 p){ float ax = abs(p.x);
        float s = step(4.42, p.z) + step(3.62, p.z) + step(2.66, p.z) + step(-1.02, p.z) + step(-2.05, p.z) + step(-3.15, p.z) + step(-4.15, p.z);
        float w = step(1.9, ax) + step(3.3, ax);
        return hsh(vec3(s, w * 3. + step(-.1, p.y), sign(p.x) + uId * 7.)); }`)
      .replace('#include <color_fragment>', `#include <color_fragment>
        vec3 P = vObjP, N = normalize(vObjN); float ax = abs(P.x), fl = step(0., P.x);
        float part = floor(diffuseColor.r * 16. + .5);
        // ---- livrée Patrouille Tranchant : aplats calculés au pixel, transitions antialiasées ----
        vec3 L;
        {
          float wx = ax - .7, zl = 1.25 - wx * .1, c = 2.45 - wx * .25, yw = -.28 + wx * .07;
          if (part < 1.5) {                                   // fuselage
            float aw = fwidth(P.y) * .75 + 1e-4;
            float yT = mix(.11, .035, smoothstep(1.6, 4.5, P.z));                  // haut de la bande jaune (rouge au-dessus)
            float yB = yT - .13 - .62 * smoothstep(3.25, 4.5, P.z);                // bas : le menton devient jaune vers l'anneau du nez
            float ys = mix(.06, yT, smoothstep(-.4, 1.6, P.z));                    // limite rouge / bleu en arrière
            float band = smoothstep(1.45, 1.75, P.z);
            yB = mix(ys - .055, yB, band);                                         // en arrière : simple filet jaune jusqu'à la queue
            L = uBlue;
            L = mix(L, uYel, step(-4.75, P.z) * smoothstep(yB - aw, yB + aw, P.y));
            L = mix(L, uRed, smoothstep(ys - aw, ys + aw, P.y));
            L = mix(L, uYel, smoothstep(4.6, 4.64, P.z));                          // anneau du nez
          } else if (part < 2.5) L = mix(uBlue, uRed, smoothstep(1.78, 1.84, P.z));  // nacelle bleue, lèvre d'entrée d'air rouge
          else if (part < 3.5) L = vec3(.03);                                       // conduit
          else if (part < 4.5) { float aw = fwidth(P.y) * .75 + 1e-4; L = mix(uBlue, uRed, smoothstep(yw - aw, yw + aw, P.y)); } // aile : extrados rouge, intrados bleu
          else if (part < 5.5) L = uYel;                                            // bidons
          else if (part < 6.5) {                                                    // papillon : jaune, gouvernes rouges, bande bleue numérotée
            vec2 tq = vec2(ax - .1, P.y - .3); float s = dot(tq, vec2(.819, .574));
            float tzl = -2.55 - s * .62, tc = 2.05 - s * .5, fx = (tzl - P.z) / tc;
            L = mix(uYel, uRed, smoothstep(.655, .67, fx));
          } else if (part < 7.5) L = uCock;
          else if (part < 8.5) L = uRed;                                            // cadres de verrière
          else if (part < 9.5) L = uDark;
          else L = uYel;
        }
        diffuseColor.rgb = L;
        // ---- marquages (atlas) ----
        if (part > 3.5 && part < 4.5) {
          // GROUPE TRANCHANT, sur l'extrados (GROUPE à gauche du pilote) et sur l'intrados (GROUPE sous l'aile droite) :
          // lisible de gauche à droite, nez en haut, vu de dessus comme vu de dessous
          float wx = ax - .7, zl = 1.25 - wx * .1, c = 2.45 - wx * .25, yw = -.28 + wx * .07;
          float top = step(yw, P.y), grp = top > .5 ? fl : 1. - fl;
          float u = grp > .5 ? (5.25 - ax) / 5. : (ax - .25) / 5.;
          float v = (zl - .47 * c + .625 - P.z) / 1.25;
          float row = grp > .5 ? 1. - top : 2.;
          vec4 d = dcl(vec2(u, v), vec4(0., row * .25, 1., .25));
          diffuseColor.rgb = mix(diffuseColor.rgb, d.rgb, d.a);
        } else if (part > 5.5 && part < 6.5) {
          // écusson sur la face extérieure (intrados) de chaque plan du papillon
          vec2 tq = vec2(ax - .1, P.y - .3); float s = dot(tq, vec2(.819, .574)), tt = dot(tq, vec2(-.574, .819));
          float tzl = -2.55 - s * .62, tc = 2.05 - s * .5, zc = tzl - .36 * tc;
          vec2 nu = vec2(mix(P.z - zc + .2, zc + .2 - P.z, fl) / .4, (1.2 + .2 - s) / .4);
          vec4 d = dcl(nu, vec4(0., .75, .125, .125)) * step(tt, 0.);
          diffuseColor.rgb = mix(diffuseColor.rgb, d.rgb, d.a);
        } else if (part < 1.5) {
          float side = step(.3, abs(N.x));
          // cartouches « GT GROUPE TRANCHANT » sous les deux verrières
          vec4 d = dcl(vec2(mix(P.z - 1.06, 1.62 - P.z, fl) / .56, (.29 - P.y) / .14), vec4(.25, .9375, .25, .0625)) * side;
          diffuseColor.rgb = mix(diffuseColor.rgb, d.rgb, d.a);
          d = dcl(vec2(mix(P.z + .26, .3 - P.z, fl) / .56, (.27 - P.y) / .14), vec4(.25, .9375, .25, .0625)) * side;
          diffuseColor.rgb = mix(diffuseColor.rgb, d.rgb, d.a);
          // pastille GT sur la joue, dans la bande jaune
          d = dcl(vec2(mix(P.z - 3.62, 3.96 - P.z, fl) / .34, (.16 - P.y) / .34), vec4(.625, .75, .125, .125)) * side;
          diffuseColor.rgb = mix(diffuseColor.rgb, d.rgb, d.a);
          // immatriculation, discrète, sur l'arrière du fuselage
          float rid = uId;
          d = dcl(vec2(mix(P.z + 3.55, -2.65 - P.z, fl) / .9, (-.0 - P.y) / .225), vec4(mod(rid, 4.) * .25, .875 + floor(rid / 4.) * .0625, .25, .0625)) * side;
          diffuseColor.rgb = mix(diffuseColor.rgb, d.rgb, d.a * .95);
          // dragon doré : sur le ventre, en avant de l'aile, et sur le dessus du nez devant le pare-brise
          d = dcl(vec2((P.x + .5) / 1., (2.75 - P.z) / 1.), vec4(.75, .75, .125, .125)) * step(N.y, -.35);
          diffuseColor.rgb = mix(diffuseColor.rgb, d.rgb, d.a);
          d = dcl(vec2((.3 - P.x) / .6, (3.95 - P.z) / .6), vec4(.75, .75, .125, .125)) * step(.3, N.y);
          diffuseColor.rgb = mix(diffuseColor.rgb, d.rgb, d.a);
        }
        float rivM; float pm = panel(P, rivM); float gr = grime(P);
        float airOcc = airAO(P, N);
        float wn = vnz(P * 7.), big = vnz(P * .8 + 3.1), pid = panelId(P);
        // traînées d'huile et de suie, étirées dans l'écoulement
        float strk = vnz(vec3(P.x * 24., P.y * 24., P.z * .55)) * .65 + vnz(vec3(P.x * 60., P.y * 60., P.z * 1.3)) * .35;
        float oil = smoothstep(-.35, -.6, P.y) * smoothstep(1.2, -.5, P.z) * smoothstep(.45, .75, strk) * .7
                  + step(ax, .56) * smoothstep(-2.3, -3.2, P.z) * smoothstep(.4, .7, strk) * smoothstep(.25, -.15, P.y) * .55;
        // bords d'attaque : laque matée, picots, léger éclaircissement
        float le = smoothstep(.72, .97, N.z) * smoothstep(.3, .7, vnz(P * 38.) * .6 + wn * .4) * (1. - step(4.5, P.z) * .5);
        // vieillissement au soleil des surfaces supérieures
        float up = smoothstep(.35, .95, N.y);
        vec3 base = diffuseColor.rgb;
        base = mix(base, vec3(dot(base, vec3(.3, .5, .2))), .1 * up);
        base *= (.93 + .1 * big + .04 * wn) * (1. + .07 * (pid - .5));
        base = mix(base, base * .78 + .025, le * .55);
        base *= (1. - .45 * pm) * (1. - .55 * gr) * (1. - .1 * rivM) * (1. - .45 * oil);
        diffuseColor.rgb = base * mix(1., airOcc, .35);
        float airCCR = .02 * big + .07 * gr + .12 * oil + .2 * le;`)
      .replace('#include <roughnessmap_fragment>', '#include <roughnessmap_fragment>\nroughnessFactor = clamp(roughnessFactor + .35 * pm + .45 * gr + .25 * oil + .3 * le + .12 * (big - .5) + .08 * (pid - .5) + .06 * (wn - .5), .08, 1.);')
      .replace('#include <normal_fragment_maps>', `#include <normal_fragment_maps>
        { // joints et rivets en creux/relief, ondulation des tôles (« oil canning »), peau d'orange légère
          float hgt = -.0035 * pm + .0012 * rivM + .0008 * vnz(P * 2.1 + pid * 9.) + .00008 * vnz(P * 13.);
          vec2 dh = vec2(dFdx(hgt), dFdy(hgt));
          vec3 sx = dFdx(-vViewPosition), sy = dFdy(-vViewPosition);
          vec3 r1 = cross(sy, normal), r2 = cross(normal, sx);
          float det = dot(sx, r1);
          normal = normalize(abs(det) * normal - sign(det) * (dh.x * r1 + dh.y * r2)); }`)
      // le vernis suit la tôle (reflets ondulés), s'interrompt dans les joints, la suie et l'usure
      .replace('#include <clearcoat_normal_fragment_begin>', THREE.ShaderChunk.clearcoat_normal_fragment_begin.replace('vec3 clearcoatNormal = nonPerturbedNormal', 'vec3 clearcoatNormal = normal'))
      .replace('#include <lights_physical_fragment>', THREE.ShaderChunk.lights_physical_fragment
        .replace('material.clearcoat = clearcoat;', 'material.clearcoat = clearcoat * (1. - .75 * gr) * (1. - .6 * pm) * (1. - .7 * le) * (1. - .6 * oil);')
        .replace('material.clearcoatRoughness = clearcoatRoughness;', 'material.clearcoatRoughness = clearcoatRoughness + airCCR;'))
      .replace('#include <aomap_fragment>', AO_INJECT);
  };
  return m;
}

/* ---------- formation : la « flèche » à cinq de la Patrouille Tranchant (m, repère du leader) ----------
   leader en pointe, deux ailiers, deux extérieurs ; fumées tricolores vues de l'arrière : bleu à gauche, blanc, rouge à droite.
   Numéros de dérive 1–5 (F-GKYF porte le 3, F-GSYD le 4). */
const SLOTS = [
  { o: P3(0, 0, 0), smoke: 0, ph: 0, pilot: { yaw: 0, pitch: .05, rear: false } },                    // n° 1, leader : blanc
  { o: P3(7.9, -1.0, -6.8), smoke: 1, ph: 1.7, pilot: { yaw: -.75, pitch: .12, rear: true } },        // n° 2, ailier gauche : bleu
  { o: P3(-7.9, -1.0, -6.8), smoke: 2, ph: 3.1, pilot: { yaw: .75, pitch: .12, rear: false } },       // n° 3, ailier droit : rouge
  { o: P3(15.8, -2.0, -13.6), smoke: 1, ph: 4.4, pilot: { yaw: -.6, pitch: .15, rear: true } },       // n° 4, extérieur gauche : bleu
  { o: P3(-15.8, -2.0, -13.6), smoke: 2, ph: 5.6, pilot: { yaw: .6, pitch: .15, rear: false } }       // n° 5, extérieur droit : rouge
];
const CENTER = P3(0, -1.2, -8.2);   // centre de la formation : axe de roulis commun et point visé
const NOZZ = [P3(-.64, -.2, -2.7), P3(.64, -.2, -2.7)];

/* ---------- passe finale : distorsion de chaleur, aberration discrète, vignettage, grain ---------- */
const POST_FS = /* glsl */`
uniform sampler2D tD; uniform vec2 uRes; uniform float uT, uSat, uCon; uniform vec3 uVeil; uniform vec4 uHeat[10];
varying vec2 vUv;
float h21(vec2 p){ p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
void main(){
  vec2 uv = vUv, asp = vec2(uRes.x / uRes.y, 1.), off = vec2(0.);
  for (int i = 0; i < 10; i++) {
    vec4 h = uHeat[i]; vec2 ab = h.zw - h.xy; float L = dot(ab * asp, ab * asp);
    if (L < 1e-7) continue;
    float t = clamp(dot((uv - h.xy) * asp, ab * asp) / L, 0., 1.);
    float d = length((uv - h.xy - ab * t) * asp), w = sqrt(L) * (.05 + .12 * t);
    float m = (1. - smoothstep(0., w, d)) * (1. - t) * smoothstep(0., .08, t);
    vec2 q = (uv * asp) / sqrt(L);
    off += m * vec2(sin(q.y * 38. + uT * 23. + float(i)), cos(q.x * 31. - uT * 19.)) * .0022 * sqrt(L) * 8.;
  }
  vec2 cc = uv - .5; float r2 = dot(cc * asp, cc * asp) / dot(asp, asp) * 4.;
  vec2 ca = cc * r2 * .0022;
  vec3 c = vec3(texture2D(tD, uv + off + ca).r, texture2D(tD, uv + off).g, texture2D(tD, uv + off - ca).b);
  // halo de l'objectif autour des hautes lumières (fumée blanche au soleil, reflets) : 8 prises, très léger
  vec3 hl = vec3(0.); vec2 px = 1. / uRes;
  for (int i = 0; i < 8; i++) { float a = float(i) * .785 + .3; vec3 s = texture2D(tD, uv + vec2(cos(a), sin(a)) * px * (7. + 9. * float(i & 1))).rgb; hl += max(s - .9, 0.); }
  c += hl * .035;
  c *= mix(1., .58, smoothstep(.25, 1.25, r2));
  c += uVeil;                                   // voile atmosphérique + diffusion de l'objectif : jamais de noir pur
  gl_FragColor = vec4(c, 1.);
  #include <tonemapping_fragment>
  // tirage : légère courbe en S et saturation, à la manière d'un boîtier réglé « paysage »
  { vec3 x = gl_FragColor.rgb; float l = dot(x, vec3(.2126, .7152, .0722));
    x = mix(vec3(l), x, uSat); x = max(x, 0.);
    x = mix(x, x * x * (3. - 2. * x), uCon); gl_FragColor.rgb = x; }
  #include <colorspace_fragment>
  float g = h21(uv * uRes + fract(uT * 7.13) * 91.) - .5;
  gl_FragColor.rgb += g * .045 * (1. - .5 * dot(gl_FragColor.rgb, vec3(.33)));
}`;

/* ---------- montage ---------- */
export function mount(host, { reduceMotion } = {}) {
  const noop = { play() {}, pause() {}, progress() {}, pointer() {} };
  const cv = document.createElement('canvas');
  cv.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;display:block';
  host.appendChild(cv);
  let renderer;
  try { renderer = new THREE.WebGLRenderer({ canvas: cv, alpha: false, antialias: false, powerPreference: 'high-performance' }); }
  catch (e) { cv.remove(); return noop; }
  renderer.setClearColor(0x0a1f4a, 1);
  renderer.toneMapping = THREE.AgXToneMapping; renderer.toneMappingExposure = 1.05;   // AgX : hautes lumières douces, comme un capteur
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(30, 1, .3, 9000);
  const noise = noiseTexture();
  scene.environment = skyEnv(renderer, noise); scene.environmentIntensity = 1;

  // soleil : ombres douces, y compris l'avion sur lui-même (aile sur fuselage, verrière dans l'habitacle)
  const sunL = new THREE.DirectionalLight(new THREE.Color().setRGB(1, .85, .68), 4.2);
  sunL.castShadow = true; sunL.shadow.mapSize.set(2048, 2048);
  Object.assign(sunL.shadow.camera, { left: -27, right: 27, top: 27, bottom: -27, near: 1, far: 140 });
  sunL.shadow.bias = -.0003; sunL.shadow.normalBias = .025; sunL.shadow.radius = 3;
  sunL.position.copy(SUN).multiplyScalar(65).add(CENTER); sunL.target.position.copy(CENTER);
  scene.add(sunL, sunL.target);
  scene.add(new THREE.HemisphereLight(new THREE.Color().setRGB(.42, .55, .85), new THREE.Color().setRGB(.5, .45, .4), .35));

  // ciel
  const skyU = { uSun: { value: SUN }, uN: { value: noise }, uOff: { value: P3(0, 0, 0) }, uPix: { value: .001 }, uDof: { value: 0 } };
  const sky = new THREE.Mesh(new THREE.SphereGeometry(8000, 48, 24), new THREE.ShaderMaterial({ uniforms: skyU, vertexShader: SKY_VS, fragmentShader: SKY_FS, side: THREE.BackSide, depthWrite: false, depthTest: false }));
  sky.renderOrder = -10; sky.frustumCulled = false; scene.add(sky);

  // avions
  const decals = decalAtlas();
  const MAT = {
    metal: withAO(new THREE.MeshPhysicalMaterial({ vertexColors: true, metalness: 1, roughness: .38, side: THREE.DoubleSide })),
    dark: withAO(new THREE.MeshStandardMaterial({ color: LIV.DARK, roughness: .6, metalness: .2 })),
    inter: new THREE.MeshStandardMaterial({ color: new THREE.Color('#2b2d2c'), roughness: .8 }),
    suit: new THREE.MeshStandardMaterial({ vertexColors: true, roughness: .92 }),
    helm: new THREE.MeshPhysicalMaterial({ vertexColors: true, roughness: .35, clearcoat: .7, clearcoatRoughness: .12 }),
    visor: new THREE.MeshPhysicalMaterial({ color: new THREE.Color('#120d05'), metalness: .7, roughness: .06, envMapIntensity: 1.6 }),
    lite: new THREE.MeshBasicMaterial({ vertexColors: true }),
    // plexiglas : légère teinte gris-vert, presque transparent de face, réfléchissant en incidence rasante (Fresnel)
    tint: new THREE.ShaderMaterial({
      transparent: true, depthWrite: false, uniforms: { uC: { value: new THREE.Color().setRGB(.035, .05, .055) } },
      vertexShader: 'varying vec3 vN, vV; void main(){ vec4 mv = modelViewMatrix * vec4(position, 1.); vN = normalMatrix * normal; vV = -mv.xyz; gl_Position = projectionMatrix * mv; }',
      fragmentShader: 'uniform vec3 uC; varying vec3 vN, vV; void main(){ float f = pow(1. - abs(dot(normalize(vN), normalize(vV))), 3.); gl_FragColor = vec4(uC, mix(.1, .62, f)); }'
    }),
    gloss: new THREE.MeshPhysicalMaterial({ color: 0x000000, roughness: .03, metalness: 0, specularIntensity: 1, envMapIntensity: 1.7, clearcoat: 1, clearcoatRoughness: .05, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false })
  };
  const planes = SLOTS.map((s, i) => {
    const M = buildFouga(s.pilot), g = new THREE.Group(), paintM = paintMaterial(i, decals);
    const add = (geo, mat, shadow = true) => { if (!geo) return null; const me = new THREE.Mesh(geo, mat); me.castShadow = shadow; me.receiveShadow = true; g.add(me); return me; };
    add(M.paint, paintM); add(M.metal, MAT.metal); add(M.dark, MAT.dark); add(M.inter, MAT.inter); add(M.suit, MAT.suit); add(M.helm, MAT.helm); add(M.visor, MAT.visor); add(M.lite, MAT.lite, false);
    const t1 = add(M.glass, MAT.tint, false), t2 = add(M.glass, MAT.gloss, false); t1.renderOrder = 5; t2.renderOrder = 6;
    const movers = M.movers.map(mv => { const me = add(mv.geo, paintM); me.matrixAutoUpdate = false; return { ...mv, me }; });
    scene.add(g);
    return { g, movers, roll: 0, pitch: 0 };
  });

  // fumées
  const HAZE = new THREE.Color().setRGB(.16, .24, .40);
  const COLS = [new THREE.Color().setRGB(.74, .74, .76), new THREE.Color().setRGB(.018, .035, .24), new THREE.Color().setRGB(.36, .006, .014)];
  const smU = {
    uTex: { value: puffAtlas() }, uSunV: { value: P3(0, 0, 0) }, uUpV: { value: P3(0, 0, 0) },
    uSunC: { value: new THREE.Color().setRGB(1.45, 1.18, .9) }, uSkyC: { value: new THREE.Color().setRGB(.26, .34, .55) }, uGndC: { value: new THREE.Color().setRGB(.42, .37, .33) }, uFogC: { value: HAZE },
    uTime: { value: 0 }, uLife: { value: LIFE }, uR0: { value: .62 }, uR1: { value: 2.8 }, uGrow: { value: .4 }, uTurb: { value: .8 }, uOp: { value: .85 },
    uFogD: { value: 1 / 950 }, uNear: { value: 4 }, uWind: { value: P3(1.2, .25, -V) }, uCol: { value: COLS }
  };
  const smoke = new Smoke(Math.ceil(EMIT * LIFE * 1.2 * SLOTS.length * 2) + 64, smU);
  smoke.mesh.renderOrder = 2; scene.add(smoke.mesh);

  // rendu hors écran (MSAA, HDR) puis passe finale
  const rt = new THREE.WebGLRenderTarget(4, 4, { type: THREE.HalfFloatType, samples: 4 });
  const postU = { tD: { value: rt.texture }, uRes: { value: new THREE.Vector2(1, 1) }, uT: { value: 0 }, uSat: { value: 1.22 }, uCon: { value: .3 }, uVeil: { value: new THREE.Vector3(.006, .009, .016) }, uHeat: { value: Array.from({ length: 10 }, () => new THREE.Vector4()) } };
  const post = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), new THREE.ShaderMaterial({ uniforms: postU, vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0., 1.); }', fragmentShader: POST_FS, depthTest: false, depthWrite: false }));
  post.frustumCulled = false;
  const postScene = new THREE.Scene(); postScene.add(post);
  const postCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

  // état
  const st = { w: 1, h: 1, pr: Math.min(window.devicePixelRatio || 1, 1.75), on: false, raf: 0, last: 0, t: LIFE + 2, acc: 0, p: .3, pt: .3, mx: 0, my: 0, tmx: 0, tmy: 0, ema: 1 / 60, slowT: 0, side: 0 };
  const qa = new THREE.Quaternion(), qb = new THREE.Quaternion(), eu = new THREE.Euler(), tp = P3(0, 0, 0), tq = new THREE.Quaternion(), tn = P3(0, 0, 0), tv = P3(0, 0, 0);

  // pose d'un avion : formation en virage, air commun un peu agité, chaque équipier corrige sa place avec retard
  // le défilement fait basculer la patrouille : virage montré par le dos (rouge), puis renversement qui offre les ventres
  // bleus et « GROUPE TRANCHANT » à l'objectif (plan signature)
  const rev = () => sstep(.36, .74, st.p);
  const formRoll = t => (lerp(46, -64, rev()) + 2 * Math.sin(t * .21) + .45 * Math.sin(t * 1.9) + .25 * Math.sin(t * 3.3 + 1)) * D2R;
  const att = (i, t) => {
    const ph = SLOTS[i].ph, k = i === 0 ? .35 : 1;
    return {
      x: k * (.3 * Math.sin(t * .53 + ph) + .1 * Math.sin(t * 1.31 + ph * 2)),
      y: k * (.22 * Math.sin(t * .61 + ph * 1.3) + .06 * Math.sin(t * 2.7 + ph)) + .4 * Math.sin(t * .35) + .12 * Math.sin(t * 1.7) + .05 * Math.sin(t * 3.1),
      z: k * .4 * Math.sin(t * .37 + ph * .7),
      roll: k * (1.3 * Math.sin(t * .59 + ph * 1.1) + .5 * Math.sin(t * 2.3 + ph * 3) + .25 * Math.sin(t * 3.9 + ph)),
      pitch: .5 * Math.sin(t * .47 + ph) + .25 * Math.sin(t * 2.1 + ph * 2), yaw: .35 * Math.sin(t * .29 + ph)
    };
  };
  const pose = (i, t, P, Q) => {
    const s = SLOTS[i], a = att(i, t);
    P.set(s.o.x + a.x - CENTER.x, s.o.y + a.y - CENTER.y, s.o.z + a.z - CENTER.z);
    eu.set(a.pitch * D2R, a.yaw * D2R, a.roll * D2R); Q.setFromEuler(eu);
    qa.setFromAxisAngle(tn.set(0, 0, 1), formRoll(t)); qb.setFromAxisAngle(tn.set(1, 0, 0), (-1.5 + .8 * Math.sin(t * .27)) * D2R);
    qa.multiply(qb); P.applyQuaternion(qa).add(CENTER); Q.premultiply(qa);
  };

  const emitAt = t => {
    st.side ^= 1;
    for (let i = 0; i < SLOTS.length; i++) {
      pose(i, t, tp, tq); tn.copy(NOZZ[st.side]).applyQuaternion(tq).add(tp);
      smoke.emit(tn, (Math.random() - .5) * 1.2, (Math.random() - .5) * 1.2, (Math.random() - .5) * 1.2, t, SLOTS[i].smoke, 1);
    }
  };
  const prefill = () => { for (let t = st.t - LIFE * 1.2; t < st.t; t += 1 / (EMIT * 2)) emitAt(t); smoke.flush(); };
  prefill();

  const resize = () => {
    st.w = Math.max(1, host.clientWidth); st.h = Math.max(1, host.clientHeight);
    renderer.setPixelRatio(st.pr); renderer.setSize(st.w, st.h, false);
    const W = Math.round(st.w * st.pr), H = Math.round(st.h * st.pr);
    rt.setSize(W, H); postU.uRes.value.set(W, H);
  };

  // cadrage plein écran : formation à droite et en haut, le bas et la gauche restent au titre ; portrait : en haut au centre
  const mat4 = new THREE.Matrix4(), mA = new THREE.Matrix4(), mB = new THREE.Matrix4(), mR = new THREE.Matrix4();
  const place = () => {
    const t = st.t, asp = st.w / st.h, k = sstep(.6, 1.5, asp), p = st.p, e = p * p * (3 - 2 * p);
    const vfov = lerp(31, 17.5, k), hf = Math.tan(vfov / 2 * D2R) * asp;
    const fill = lerp(.95, .64, k);
    const r = rev();
    const D = lerp(lerp(18.9, 17.6, k), lerp(27.5, 22.5, k), r) / (fill * hf) * lerp(1.06, .96, e);
    const az = (lerp(lerp(-36, -48, e), -64, r) + st.mx * 6 + 2 * Math.sin(t * .071)) * D2R;
    const el = (lerp(lerp(2, 4, e), -9, r) - st.my * 3.5 + .7 * Math.sin(t * .093 + 1)) * D2R;
    camera.fov = vfov; camera.aspect = asp; camera.updateProjectionMatrix();
    const sx = lerp(lerp(.24, .02, r), lerp(.3, .26, r), k), sy = lerp(.3, .12, r);
    camera.projectionMatrix.elements[8] = -sx; camera.projectionMatrix.elements[9] = -sy;
    camera.projectionMatrixInverse.copy(camera.projectionMatrix).invert();
    camera.position.set(CENTER.x + D * Math.sin(az) * Math.cos(el), CENTER.y + D * Math.sin(el), CENTER.z + D * Math.cos(az) * Math.cos(el));
    // l'avion-caméra respire et prend les mêmes remous, un peu décalés
    camera.position.x += .3 * Math.sin(t * .43) + .08 * Math.sin(t * 1.13) + .03 * Math.sin(t * 3.7);
    camera.position.y += .25 * Math.sin(t * .37 + 2) + .08 * Math.sin(t * 1.29) + .1 * Math.sin(t * 1.7 - .4);
    camera.lookAt(CENTER.x, CENTER.y + D * .02, CENTER.z);
    camera.rotateZ(formRoll(t - .25) * .5 * Math.cos(az * .5) + (.4 * Math.sin(t * .19) + .1 * Math.sin(t * 2.3) + st.mx * 1.2) * D2R);
    // bougé d'opérateur : micro-tremblement de la main au téléobjectif
    camera.rotateX((.022 * Math.sin(t * 6.1) + .012 * Math.sin(t * 13.7 + 1.3) + .006 * Math.sin(t * 23.1)) * D2R);
    camera.rotateY((.018 * Math.sin(t * 5.3 + 2.) + .01 * Math.sin(t * 15.9) + .005 * Math.sin(t * 27.7 + .4)) * D2R);
    camera.updateMatrixWorld();
    sky.position.copy(camera.position);
    skyU.uPix.value = 2 * Math.tan(vfov / 2 * D2R) / (st.h * st.pr); skyU.uDof.value = 1.1 * 2 * Math.tan(vfov / 2 * D2R) / st.h;
    const z = V * t; skyU.uOff.value.set(-(z / 6100 % 1), -(z / 1900 % 1), -(z / 560 % 1));
    smU.uSunV.value.copy(SUN).transformDirection(camera.matrixWorldInverse);
    smU.uUpV.value.set(0, 1, 0).transformDirection(camera.matrixWorldInverse);
    smU.uTime.value = t; postU.uT.value = t;
    // avions, gouvernes, chaleur des tuyères
    let hi = 0;
    for (let i = 0; i < planes.length; i++) {
      const pl = planes[i], a0 = att(i, t), a1 = att(i, t - .12);
      pose(i, t, pl.g.position, pl.g.quaternion); pl.g.updateMatrixWorld();
      const rollRate = (a0.roll - a1.roll) / .12, pitchRate = (a0.pitch - a1.pitch) / .12;
      for (const mv of pl.movers) {
        const ang = mv.kind === 'ail' ? clamp(-rollRate * .9 * mv.side, -6, 6) * D2R : clamp(pitchRate * 2.2 + .6 + mv.side * rollRate * .4, -5, 5) * D2R;
        mA.makeTranslation(mv.a.x, mv.a.y, mv.a.z); mR.makeRotationAxis(mv.axis, ang); mB.makeTranslation(-mv.a.x, -mv.a.y, -mv.a.z);
        mv.me.matrix.copy(mA).multiply(mR).multiply(mB); mv.me.matrixWorldNeedsUpdate = true;
      }
      for (const nz of NOZZ) {
        tn.copy(nz).applyMatrix4(pl.g.matrixWorld); tv.copy(nz).add(tn.set(0, 0, 0)).setZ(nz.z - 6).applyMatrix4(pl.g.matrixWorld);
        tn.copy(nz).applyMatrix4(pl.g.matrixWorld).project(camera); tv.project(camera);
        postU.uHeat.value[hi++].set(tn.x * .5 + .5, tn.y * .5 + .5, tv.x * .5 + .5, tv.y * .5 + .5);
      }
    }
  };

  const step = dt => {
    st.t += dt;
    st.acc += dt;
    const h = 1 / (EMIT * 2);
    while (st.acc >= h) { st.acc -= h; emitAt(st.t - st.acc); }
    smoke.flush();
    const a = 1 - Math.exp(-dt * 2.2);
    st.p += (st.pt - st.p) * a; st.mx += (st.tmx - st.mx) * a; st.my += (st.tmy - st.my) * a;
  };

  const render = () => {
    place();
    renderer.setRenderTarget(rt); renderer.render(scene, camera);
    renderer.setRenderTarget(null); renderer.render(postScene, postCam);
  };

  const frame = now => {
    st.raf = 0; if (!st.on) return;
    const dt = Math.min(.05, (now - (st.last || now)) / 1000); st.last = now;
    if (dt > 0) {
      step(dt);
      // garde-fou : si la machine peine, on baisse la définition (sans recréer de ressources)
      st.ema += (dt - st.ema) * .05;
      if (st.ema > 1 / 45 && st.pr > .75 && now - st.slowT > 1500) { st.slowT = now; st.pr = Math.max(.75, st.pr - .25); st.ema = 1 / 50; resize(); }
    }
    render();
    st.raf = requestAnimationFrame(frame);
  };

  resize();
  const ro = new ResizeObserver(() => { resize(); if (!st.on) render(); });
  ro.observe(host);

  if (reduceMotion) {
    st.p = st.pt = .92;   // image fixe : le plan signature (ventres bleus, GROUPE TRANCHANT) st.t = LIFE + 4.6;
    smoke.D.array.fill(-1e6); smoke.n = smoke.max; smoke.flush();
    prefill(); render();
    return { play() {}, pause() {}, progress() {}, pointer() {} };
  }
  render();

  return {
    play() { if (st.on) return; st.on = true; st.last = 0; st.raf = requestAnimationFrame(frame); },
    pause() { st.on = false; if (st.raf) cancelAnimationFrame(st.raf); st.raf = 0; },
    progress(p) { st.pt = clamp(+p || 0); if (!st.on) { st.p = st.pt; render(); } },
    pointer(mx, my) { st.tmx = clamp(+mx || 0, -.5, .5); st.tmy = clamp(+my || 0, -.5, .5); }
  };
}
