/* Groupe Tranchant — scènes 3D (ouverture Jeton casino et maquette des implantations) */
import * as THREE from 'three';
import { Reflector } from 'three/addons/objects/Reflector.js';
import { createStage, beam, keyframes, mouse, stepMouse, mobile, clamp01, BRAND } from './stage.js';
import { IMG, PLACES, FRANCE, PHOTO } from './data.js';
import { chipKit, holeMask, PHASES } from './jeton-portail.js';

function initHero(ctx, LITE, onReady) {
const { lenis, chapters, progressOf, smoother, reduceMotion } = ctx;
/* ================= OUVERTURE : MONOGRAMME ================= */
const heroEl = document.getElementById('hero');
/* deux hauteurs d'écran de plus pour la fin (1,6 sur téléphone) : le jeton tombe, se couche et s'ouvre sur la section suivante
   (glissée dessous, cf. .jt-hero) ; tout est fonction de la progression de défilement, sans temps réel ni défilement forcé */
const ZT = mobile() ? 1.6 : 2, PE = 3 / (3 + ZT), sticky = heroEl.querySelector('.sticky'), nextEl = heroEl.nextElementSibling, port = { f: 0, open: false }, ENVX = Math.PI / 2;
heroEl.style.setProperty('--screens', 4 + ZT); heroEl.classList.add('jt-hero');
let span = 1; const bufSz = new THREE.Vector2(), measure = () => { span = heroEl.offsetHeight - innerHeight; };
const H = createStage({
  canvas: document.getElementById('gl-hero'), fov: 30, exposure: 1.05, alpha: true,
  dof: LITE ? null : { focus: 15, aperture: .00018, maxblur: .006 },
  bloom: { strength: .12, radius: .6, threshold: 1.2 },
  grain: .045, vignette: .6, aberration: .0022
});
H.scene.background = new THREE.Color(0x0B1B2E);
/* Photo de fond du site actuel (Arc de Triomphe), cadrée en « cover » et assombrie pour la lisibilité */
new THREE.TextureLoader().load('/img/hero-paris.jpg', bg => {
  bg.colorSpace = THREE.SRGBColorSpace;
  const fit = () => {
    const r = (innerWidth / innerHeight) / (bg.image.width / bg.image.height);
    if (r > 1) { bg.repeat.set(1, 1 / r); bg.offset.set(0, (1 - 1 / r) / 2); }
    else { bg.repeat.set(r, 1); bg.offset.set((1 - r) / 2, 0); }
  };
  fit(); addEventListener('resize', fit);
  H.scene.background = bg; H.scene.backgroundIntensity = .45;
});
H.scene.fog = new THREE.FogExp2(0x0B1B2E, .05);
{
  /* Sol miroir qui s'efface avec la distance (de R0 à R1) : il se fond dans la photo, sans ligne d'horizon */
  const R0 = 4, R1 = 30, S = Reflector.ReflectorShader;
  const fadeShader = { ...S,
    vertexShader: S.vertexShader.replace('void main() {', 'varying vec2 vFloor;\nvoid main() {\nvFloor = position.xy;'),
    fragmentShader: S.fragmentShader.replace('void main() {', 'varying vec2 vFloor;\nvoid main() {')
      .replace(/gl_FragColor = vec4\((.*), 1\.0 \);/, `gl_FragColor = vec4($1, 1.0 - smoothstep(${R0}.0, ${R1}.0, length(vFloor)));`) };
  const mirror = new Reflector(new THREE.PlaneGeometry(120, 120), { textureWidth: innerWidth * H.dpr * (LITE ? .35 : .6), textureHeight: innerHeight * H.dpr * (LITE ? .35 : .6), color: 0x9a9a9a, clipBias: .003, shader: fadeShader });
  mirror.material.transparent = true;
  mirror.rotation.x = -Math.PI / 2; H.scene.add(mirror);
  const c = document.createElement('canvas'); c.width = c.height = 512;
  const x = c.getContext('2d'), k = 256 / 60, gr = x.createRadialGradient(256, 256, R0 * k, 256, 256, R1 * k);
  gr.addColorStop(0, '#fff'); gr.addColorStop(1, '#000');
  x.fillStyle = gr; x.fillRect(0, 0, 512, 512);
  const tint = new THREE.Mesh(new THREE.PlaneGeometry(120, 120), new THREE.MeshStandardMaterial({ color: 0x0A1726, roughness: .5, transparent: true, opacity: .8, alphaMap: new THREE.CanvasTexture(c) }));
  tint.rotation.x = -Math.PI / 2; tint.position.y = .003; tint.receiveShadow = true; tint.renderOrder = 1; H.scene.add(tint);
}
/* Emblème « Jeton lenticulaire » : le jeton (textures, lentille GT, argile) vient de jeton-portail.js, partagé avec les transitions de sections ;
   le jeton héros est la version « portail » : son centre ivoire s'ouvre en persiennes à la fin de l'ouverture */
const K = chipKit(H.renderer);
const { R, CT, RC, C, chipFace, chipEdge, edgeGeo, faceGeo, goldMat, ringGeo, clay, lensMat, lensView } = K;
const mono = new THREE.Group(); H.scene.add(mono);
let hero = null, lenses = null;
const tmpV = new THREE.Vector3();
addEventListener('resize', () => { span = 1; });

/* ===== Le geste du croupier : petits jetons instanciés (rouge, noir), un tirage par matière =====
   Chaque pose est calculée au contact exact : piles aux multiples de l'épaisseur, jetons plaqués
   face contre face dans l'éventail, posés sur la tranche au sol ; aucun jeton n'en traverse un autre. */
const S = .42, hS = CT * S, rS = R * S, PI = Math.PI;
// fusion de géométries indexées, couchées (axe du jeton vertical)
const merge = gs => { const g = new THREE.BufferGeometry(), at = { position: [], normal: [], uv: [] }, idx = []; let o = 0;
  gs.forEach(s => { for (const k in at) at[k].push(...s.attributes[k].array); s.index.array.forEach(i => idx.push(i + o)); o += s.attributes.position.count; });
  for (const k in at) g.setAttribute(k, new THREE.Float32BufferAttribute(at[k], k === 'uv' ? 2 : 3));
  g.setIndex(idx); return g.rotateX(-PI / 2); };
const both = (geo, z) => merge([geo.clone().translate(0, 0, z), geo.clone().rotateY(PI).translate(0, 0, -z)]);
const fiches = [], fx = { kinds: null, rings: null, blobs: null, ghosts: null, lastA: 0 };
const dum = new THREE.Object3D(), qa = new THREE.Quaternion(), qb = new THREE.Quaternion(), UP = new THREE.Vector3(0, 1, 0), ZV = new THREE.Vector3(0, 0, 1);
const P = { x: 0, y: 0, z: 0, hd: 0, a: 0, s: 0, k: 1 };     // pose : cap, inclinaison (a), rotation propre (s)
const seg = (x, a, b) => clamp01((x - a) / (b - a)), sm = x => x * x * (3 - 2 * x), o3 = x => 1 - (1 - x) ** 3, o2 = x => 1 - (1 - x) ** 2;
const back = x => 1 + 2.2 * (x - 1) ** 3 + 1.2 * (x - 1) ** 2;          // dépassement puis retour
const mix = (a, b, e) => a + (b - a) * e;
const ext = a => hS / 2 * Math.abs(Math.cos(a)) + rS * Math.abs(Math.sin(a));   // demi-hauteur d'un jeton incliné de a
const jit = (n, k) => { const v = Math.sin(n * 12.9898 + k * 78.233) * 43758.5453; return v - Math.floor(v) - .5; };  // aléa fixe par jeton
/* ombre de contact : tache douce sous chaque jeton, plus sombre et plus nette quand il touche le miroir */
const blobMat = new THREE.ShaderMaterial({ transparent: true, depthWrite: false,
  vertexShader: 'attribute float aO; varying float vO; varying vec2 vU; void main() { vO = aO; vU = uv * 2. - 1.; gl_Position = projectionMatrix * modelViewMatrix * instanceMatrix * vec4(position, 1.); }',
  fragmentShader: 'varying float vO; varying vec2 vU; void main() { float r = clamp(1. - length(vU), 0., 1.); gl_FragColor = vec4(0., 0., 0., vO * r * r * (3. - 2. * r)); }' });
function blob(i, x, z, size, op) {
  dum.position.set(x, .006, z); dum.quaternion.identity(); dum.scale.set(size, 1, size); dum.updateMatrix();
  fx.blobs.setMatrixAt(i, dum.matrix); fx.blobs.geometry.attributes.aO.array[i] = op;
}
function poser(c) {
  dum.position.set(P.x, P.y, P.z);
  dum.quaternion.setFromAxisAngle(UP, P.hd).multiply(qa.setFromAxisAngle(ZV, P.a)).multiply(qb.setFromAxisAngle(UP, P.s));
  dum.scale.setScalar(S * P.k); dum.updateMatrix();
  const m = fx.kinds[c.col]; m.edge.setMatrixAt(c.ci, dum.matrix); m.face.setMatrixAt(c.ci, dum.matrix); fx.rings.setMatrixAt(c.n, dum.matrix);
  const hb = P.y - ext(P.a);                                          // hauteur du point le plus bas
  blob(c.n, P.x, P.z, 2 * rS * (.75 + .6 * Math.abs(Math.cos(P.a))) * (1 + hb * .6), P.k * .34 * (1 - sm(clamp01(hb / .9))));
}
/* tableau : battage à gauche au fond (deux piles → une), ramassage à droite, roulé derrière le jeton héros */
const AX = -3, AZ = -4.8, G = rS + .042, nR = LITE ? 5 : 7, NT = 2 * nR;
const TX = 2.7, TZ = -1.2, pre = LITE ? 2 : 3;
const LOOSE = [[4.6, .3], [1.9, 1.5], [4.9, -2.3], [3.9, 1.9], [1.2, -2.9]].slice(0, LITE ? 3 : 5), nL = LOOSE.length;
const FD = [-.9708, .2402], FA = .42, FDX = hS / Math.sin(FA) * 1.03;            // éventail : direction, inclinaison, pas au sol
const RR = 3.9, RR2 = 3.7, PS0 = Math.atan2(TZ, TX) - .3, PS1 = -2.25, A0 = PI / 2 + .14;   // roulé, penché dans le virage
/* éventail : le jeton 0 reste à plat ; le 1 s'appuie sur son arête, les suivants se couchent face contre face (inclinaison b) */
function fan(m, b) {
  let u = 0, y = hS / 2, a = 0;
  if (m > 0 && b > 0) {
    const k = b / FA, e1 = hS / Math.tan(FA) * k, dx = FDX * k, dy = Math.max(0, hS - dx * Math.sin(b)) / Math.cos(b);
    const lx = rS + e1 + (m - 1) * dx, ly = hS - e1 * Math.tan(b) + (m - 1) * dy;   // arête basse avant
    u = lx - rS * Math.cos(b) + hS / 2 * Math.sin(b); y = ly + rS * Math.sin(b) + hS / 2 * Math.cos(b); a = b;
  } else y = hS * (m + .5);
  P.x = AX + FD[0] * u; P.z = AZ + FD[1] * u; P.y = y; P.a = a; P.hd = Math.atan2(FD[1], -FD[0]);
}
/* poser sur une pile : le jeton se lève, passe au-dessus, puis descend juste sur le dessus (Y) */
function hop(h, ax, az, bx, bz, Y, c = .18) {
  const mv = sm(seg(h, .3, .85));
  P.x = mix(ax, bx, mv); P.z = mix(az, bz, mv);
  P.y = mix(hS / 2, Y + c, o3(seg(h, 0, .45))) - c * sm(seg(h, .75, 1));
}
// petit balancement amorti sur l'arête après la pose (le point bas reste au contact)
function rock(w, amp, hd) {
  if (w <= 0 || w >= 1) return;
  const a = amp * Math.sin(3 * PI * w) * (1 - w) ** 2;
  P.a += a; P.s -= hd - P.hd; P.hd = hd; P.y += rS * Math.abs(Math.sin(a)) - hS / 2 * (1 - Math.cos(a));
}
function approach(sx, sz, bx, bz) { const d = Math.hypot(bx - sx, bz - sz), g = (2 * rS + .07) / d; return [bx + (sx - bx) * g, bz + (sz - bz) * g]; }
function croupier(p, u) {
  fiches.forEach(c => {
    P.hd = 0; P.a = 0; P.k = 1; P.s = c.jy;
    if (c.role === 0) {
      /* battage : la main lève les bords intérieurs, les jetons s'écartent d'une épaisseur (chacun sa place),
         puis glissent un à un, chacun à sa hauteur exacte : la pile alternée se referme sans choc */
      const { sd, j, o } = c, qr = seg(p, .02, .3);
      const a = -sd * .13 * sm(seg(qr, 0, .3)) * (1 - sm(seg(qr, .4, .55)));
      const yl = mix(hS * (j + .5), hS * (o + .5), sm(seg(qr, .08, .4)));
      const e = back(seg(qr, .55 + o / NT * .3, .7 + o / NT * .3)), rx = -sd * rS;
      P.x = AX + sd * (G + rS) + rx * Math.cos(a) - yl * Math.sin(a) - sd * G * e; P.z = AZ;
      P.y = rx * Math.sin(a) + yl * Math.cos(a); P.a = a; P.s = (sd < 0 ? .3 : -.25) * (1 - e) + c.jy;
      /* éventail : la pile se couche d'un geste en ligne, puis se rassemble */
      const w = sm(seg(p, .47, .62)) * (1 - sm(seg(p, .8, .9)));
      if (w > 0) { fan(o, FA * w); P.s = c.jy - P.hd; }
      const jf = 1 - clamp01(w * 4);
      P.x += FD[1] * c.jl + FD[0] * c.jf * jf; P.z -= FD[0] * c.jl - FD[1] * c.jf * jf;
    } else if (c.role === 1) {                                     // pile de droite déjà montée
      P.x = TX + c.jl; P.z = TZ + c.jf; P.y = hS * (c.j + .5);
    } else {
      /* ramassage : chaque jeton glisse en courbe et ralentit par frottement, puis la main le pose sur la pile */
      const q = c.j, Q = seg(p, .14, .5), t0 = q * .16, ls = seg(Q, t0, t0 + .2), lh = seg(Q, t0 + .2, t0 + .3), lw = seg(Q, t0 + .3, t0 + .36);
      const [sx, sz] = LOOSE[q], [ax, az] = approach(sx, sz, TX, TZ), bend = q % 2 ? .3 : -.3;
      const cx = (sx + ax) / 2 - (az - sz) * bend, cz = (sz + az) / 2 + (ax - sx) * bend, Y = hS * (pre + q + .5), e = o2(ls), b = 1 - e;
      const s0 = q * 1.37, s1 = c.jy + (q % 2 ? 2 : -2) * PI;
      if (lh === 0) { P.x = b * b * sx + 2 * b * e * cx + e * e * ax; P.z = b * b * sz + 2 * b * e * cz + e * e * az; P.y = hS / 2; P.s = mix(s0, s1, e); }
      else { hop(lh, ax, az, TX + c.jl, TZ + c.jf, Y); P.s = s1; }
      rock(lw, .06, q * 1.1);
      if (c.roll && p > .5) roller(p, Y, c);
    }
    // ouverture : les jetons tombent un à un sur le miroir
    const li = seg(u, c.io * .7 / fiches.length, c.io * .7 / fiches.length + .22), ei = o3(li);
    P.y += (1 - ei) * 3.5; P.s += (1 - ei) * 1.2; P.k = li > 0 ? 1 : 0;
    poser(c);
  });
  fx.kinds.forEach(m => { m.edge.instanceMatrix.needsUpdate = m.face.instanceMatrix.needsUpdate = true; });
  fx.rings.instanceMatrix.needsUpdate = fx.blobs.instanceMatrix.needsUpdate = fx.blobs.geometry.attributes.aO.needsUpdate = true;
}
/* le dernier jeton ramassé est chassé d'une pichenette : il saute, se dresse, roule en long arc derrière
   le jeton héros, tournoie comme un disque d'Euler, se couche, puis rejoint le sommet de la pile battue */
function roller(p, Y, c) {
  const pp = seg(p, .5, .56), pr = seg(p, .56, .76), pe = seg(p, .76, .88), pf = seg(p, .9, .99);
  const bx = TX + c.jl, bz = TZ + c.jf, sR = -(PS1 - PS0) * (RR + RR2) / 2 / rS;
  if (pr === 0) {
    const h = sm(seg(pp, .2, .85));
    P.a = A0 * sm(seg(pp, .15, .8)); P.hd = -PS0; P.s = c.jy;
    P.x = mix(bx, (RR + rS * Math.cos(A0)) * Math.cos(PS0), h); P.z = mix(bz, (RR + rS * Math.cos(A0)) * Math.sin(PS0), h);
    P.y = mix(Y - hS / 2, 0, sm(seg(pp, .5, 1))) + 4 * 1.1 * pp * (1 - pp) + ext(P.a);   // point bas : du dessus de la pile au sol, en cloche
  } else if (pe === 0) {
    const e = o2(pr), ps = mix(PS0, PS1, e), rr = mix(RR, RR2, e);
    P.hd = -ps; P.a = A0 + .05 * Math.sin(pr * 34) * (1 - pr); P.s = c.jy + sR * e;
    P.x = (rr + rS * Math.cos(P.a)) * Math.cos(ps); P.z = (rr + rS * Math.cos(P.a)) * Math.sin(ps); P.y = ext(P.a);
  } else {
    const ps = PS1 - .12 * o3(pe), r0 = RR2 + rS * Math.cos(A0) * (1 - o3(pe)), w = pe;
    P.hd = -ps + (reduceMotion ? 3 : 10) * w * w; P.a = w > .93 ? PI - .05 * Math.sin(PI * seg(w, .93, 1)) : A0 + (PI - A0) * w ** 2.4;
    P.s = c.jy + sR + 2.5 * w; P.x = r0 * Math.cos(ps); P.z = r0 * Math.sin(ps); P.y = ext(P.a);
    if (pf > 0) {                                                  // glisse puis posé au sommet de la pile battue, inserts alignés
      const ex = P.x, ez = P.z, d0 = P.hd - P.s, d = d0 - Math.round(d0 / (PI / 4)) * PI / 4, tx = AX + c.jl, tz = AZ + c.jf;
      const [ax, az] = approach(ex, ez, tx, tz), ls = o2(seg(pf, 0, .45)), lh = seg(pf, .45, .88);
      P.a = PI; P.s += d * sm(pf);
      if (lh === 0) { P.x = mix(ex, ax, ls); P.z = mix(ez, az, ls); P.y = hS / 2; } else hop(lh, ax, az, tx, tz, hS * (NT + .5));
      rock(seg(pf, .88, 1), .05, P.hd + 1);
    }
  }
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
/* Reflet qui balaie le jeton */
const sweep = new THREE.SpotLight(0xFFFFFF, 0, 30, .09, .6, 1.2);
sweep.position.set(-9, 3.4, 7); sweep.target.position.set(0, 2.1, 0); H.scene.add(sweep, sweep.target);
/* éclat chaud pendant le pile ou face */
const flash = new THREE.PointLight(0xFFD9A0, 0, 9, 2); flash.position.set(1.2, 4.2, 3.4); H.scene.add(flash);
const shaft = beam(key.position.clone(), new THREE.Vector3(0, 0, 0), 3.2, 0xFFEBCB, { anglePower: 2.4, opacity: 0 });
H.scene.add(shaft);


/* Caméra et chorégraphie liées au défilement */
const heroPath = keyframes([
  { t: 0, pos: [-1.3, 2.4, 15], look: [-1.9, 1.35, 0], spin: 0 },
  { t: .37, pos: [5.2, 1.6, 7.4], look: [2.9, 2.0, 0], spin: -.38 },
  { t: .68, pos: [-5.6, 1.3, 7.6], look: [-3.0, 2.1, 0], spin: .4 },
  { t: 1, pos: [.4, 5.6, 13.5], look: [0, 1.7, 0], spin: 0 }
]);
const intro = { v: 1, g: 1, t: 1 };
const heroLook = new THREE.Vector3();
const heroP = smoother(5);
const tilt = { x: 0, y: 0 };
/* lancé : le jeton tombe en tournant sur sa tranche (trois tours) et se pose sur GT ;
   à mi-parcours, pile ou face : élan, vrilles rapides (♠/♥ en éclairs), rattrapé net sur GT */
function heroPose(p, t, k) {
  const fl = seg(p, .43, .6), up = seg(fl, .16, .82), st = seg(fl, .82, 1), turns = reduceMotion ? 1 : 3, air = 4 * up * (1 - up);
  const A = (fl < .16 ? -.12 * Math.sin(PI * fl / .16) : 0) + turns * 2 * PI * (up + sm(up)) / 2 + .16 * Math.sin(2 * PI * st) * (1 - st);
  const y = (fl < .16 ? -.22 * Math.sin(PI * fl / .16) : 0) + (mobile() ? -.3 : 1.1) * air - .08 * Math.sin(PI * st) * (1 - st);
  mono.position.set(0, R + .38 + Math.sin(t * .8) * .05 + intro.g * 2.4 + y, -intro.g * 2 - (mobile() ? 5 : 2.2) * air);
  mono.rotation.set(tilt.x + intro.g * .3 + A, k.spin + Math.sin(t * .3) * .06 + tilt.y + intro.g * PI * 6, Math.sin(t * .21) * .015 + .25 * Math.sin(PI * up));
  return { up, A };
}
/* Fin de l'ouverture : le jeton se pose, bascule en arrière et se couche à plat (rebond, puis toupie d'Euler qui s'éteint) ;
   la caméra monte à l'aplomb, les lames du centre pivotent en persiennes, puis la caméra plonge dans l'ouverture.
   La chute se joue en temps réel une fois le seuil passé (et se rejoue à l'envers en remontant) ; l'ouverture suit le défilement. */
const qT = new THREE.Quaternion(), qW = new THREE.Quaternion(), XA = new THREE.Vector3(1, 0, 0), axW = new THREE.Vector3(), offV = new THREE.Vector3();
const LAND = new THREE.Vector3(0, CT / 2, -CT / 2 - R), camTop = new THREE.Vector3(), TAN = Math.tan(PI / 12);
function fallPose(f) {
  const fd = seg(f, 0, .18), ft = seg(f, .18, .58), fw = seg(f, .58, 1);
  if (ft === 0) {                                                  // il cesse de flotter et touche le miroir
    const e = fd * fd;
    mono.position.set(mono.position.x * (1 - e), mix(mono.position.y, R, e), mono.position.z * (1 - e));
    mono.rotation.set(mono.rotation.x * (1 - e), mono.rotation.y * (1 - e), mono.rotation.z * (1 - e));
    return;
  }
  let b = PI / 2 * ft ** 2.2;                                      // bascule autour de l'arête au sol, de plus en plus vite
  if (fw > 0 && fw < .3) b = PI / 2 - .12 * Math.sin(PI * fw / .3) * (1 - fw);
  qT.setFromAxisAngle(XA, -b); mono.quaternion.copy(qT);
  mono.position.set(0, 0, -CT / 2).add(offV.set(0, R, CT / 2).applyQuaternion(qT));
  if (fw >= .3) {
    const w = (fw - .3) / .7, a = .07 * Math.sin(Math.min(1, w * 5) * PI / 2) * (1 - w) ** 1.6, ph = 2.5 + 26 * w ** 1.7;
    qW.setFromAxisAngle(axW.set(Math.cos(ph), 0, Math.sin(ph)), a); mono.quaternion.premultiply(qW);
    mono.position.y = CT / 2 * Math.cos(a) + R * Math.sin(a);
  }
}
function renderHero(t) {
  const raw = progressOf(heroEl), P0 = heroP(raw), p = Math.min(1, P0 / PE), u = clamp01((P0 - PE) / (1 - PE));
  /* fin de l'ouverture : chute, pose, persiennes et plongée, fonctions pures de u (même calendrier que les autres transitions) */
  const tp = reduceMotion ? { f: 0, so: 0, dv: 0 } : PHASES(u), so = tp.so, dv = tp.dv;
  port.f = tp.f;
  chapters(heroEl, p);
  const k = heroPath(p);
  const f = mobile() ? 1.7 : Math.max(1, 1.62 / H.camera.aspect);
  heroLook.set(k.look[0] * (mobile() ? .2 : 1), k.look[1] + (mobile() ? -1.9 : 0), k.look[2]);
  H.camera.position.set(
    heroLook.x + (k.pos[0] - k.look[0]) * f + Math.sin(t * .17) * .22 + mouse.sx * .5,
    heroLook.y + (k.pos[1] - k.look[1]) * (mobile() ? 1 : f) + Math.sin(t * .23) * .06 - mouse.sy * .3 + intro.v * 1.2,
    heroLook.z + (k.pos[2] - k.look[2]) * f + intro.v * 7
  );
  const e = sm(seg(port.f, .14, .9));
  if (e > 0) {                                                     // grue jusqu'à l'aplomb du jeton couché, puis plongée dans l'ouverture
    const D0 = Math.max(2 * R / (.5 * 2 * TAN), 2 * R / (.84 * 2 * TAN * H.camera.aspect));
    const D1 = CT / 2 + .006 + RC * (innerHeight / 2 / TAN) / (Math.hypot(innerWidth, innerHeight) / 2 * 1.05);
    camTop.set(LAND.x, LAND.y + D0 * Math.pow(D1 / D0, dv), LAND.z);
    H.camera.position.lerp(camTop, e); H.camera.position.y += Math.sin(PI * e) * 1.6;
    heroLook.lerp(LAND, e);
  }
  H.camera.up.set(0, 1 - e, -e).normalize();
  H.camera.lookAt(heroLook);
  /* couché, le jeton garde le reflet qu'il avait debout face à la caméra (sinon il refléterait le plafond lumineux) ;
     la photo s'éteint : on ne voit plus qu'une table sombre */
  H.scene.fog.density = .05 * (1 - .6 * e);
  H.scene.environmentRotation.x = ENVX * sm(seg(port.f, .2, .58));
  H.scene.backgroundIntensity = .45 * (1 - .8 * e);
  /* la section suivante attend, calée en haut de l'écran sous la scène, dès que l'ouverture approche */
  if (nextEl) {
    if (span < 2) measure();
    const ur = clamp01((raw - PE) / (1 - PE)), tf = ur > .4 && ur < 1 && !reduceMotion ? `translate3d(0,${(-(1 - raw) * span).toFixed(1)}px,0)` : '';
    if (tf !== port.tf) nextEl.style.transform = port.tf = tf;
  }
  if (H.bokeh) H.bokeh.uniforms.focus.value = H.camera.position.distanceTo(heroLook);
  tilt.x += (-mouse.sy * .14 - tilt.x) * .05; tilt.y += (mouse.sx * .45 - tilt.y) * .05;
  const fl = heroPose(p, t, k);
  if (port.f > 0) fallPose(port.f);
  if (hero) {
    K.openChip(hero, so);
    hero.userData.slats[1].forEach(s => { s.m.visible = so === 0; });
    hero.rotation.z = -.6 * dv;                                // la bague tourne comme un diaphragme pendant la plongée
  }
  flash.intensity = Math.sin(PI * fl.up) * (.6 + .4 * Math.cos(fl.A * 2)) * 14;
  if (lenses) {
    mono.updateMatrixWorld();
    const c = mono.worldToLocal(tmpV.copy(H.camera.position)), fb = Math.sin(PI * fl.up) * .95 * Math.sin(fl.A * 1.5);
    lenses[0].userData.phi.value = Math.atan2(c.x, c.z) + fb;
    lenses[1].userData.phi.value = Math.atan2(-c.x, -c.z) - fb;
  }
  if (fx.ghosts) {                                                  // flou de bougé : deux échos en retard sur la vrille
    const dA = clamp01(Math.abs(fl.A - fx.lastA) / .5) * Math.sign(fl.A - fx.lastA); fx.lastA = fl.A;
    fx.ghosts.forEach((g, i) => {
      g.visible = Math.abs(dA) > .02 && !reduceMotion;
      g.position.copy(mono.position); g.rotation.copy(mono.rotation); g.rotation.x -= dA * .55 * (i + 1);
      g.userData.mats.forEach(m => m.opacity = (i ? .07 : .14) * clamp01(Math.abs(dA) * 3));
    });
  }
  if (fx.kinds) {
    croupier(p, 1 - intro.t);
    const lay = sm(seg(port.f, .4, .62));
    blob(fiches.length, mono.position.x, mono.position.z, mix(4.4 + (mono.position.y - R) * 1.2, 4.5, lay), mix(.3 * (1 - sm(clamp01((mono.position.y - R - .38) / 2.5))), .55, lay) * (1 - intro.g));
  }
  // reflet périodique (toutes les 9 s)
  const ph = (t % 9) / 9, sw = clamp01(ph / .28);
  sweep.position.x = -9 + 18 * sw;
  sweep.intensity = reduceMotion ? 0 : Math.sin(Math.PI * sw) * 60 * (1 - intro.v * .5) * (1 - sm(seg(port.f, .1, .5)));
  H.finish.uniforms.uTime.value = t;
  /* la scène s'efface par les jours des lames puis par le disque qui grandit : la section suivante, glissée dessous, apparaît.
     La découpe est faite dans le dernier passage du rendu (alpha), sans aucun calcul de mise en page */
  const gone = reduceMotion ? u > .97 : dv > .999, open = !reduceMotion && so > 0 && !!hero;
  if (reduceMotion) sticky.style.opacity = 1 - sm(seg(u, .3, .95));
  if (open !== port.open) { heroEl.classList.toggle('jt-open', open); port.open = open; }
  if (gone !== port.gone) { sticky.style.visibility = gone ? 'hidden' : ''; port.gone = gone; }
  if (open && !gone) { H.camera.updateMatrixWorld(); H.renderer.getDrawingBufferSize(bufSz); holeMask(K, hero, H.camera, bufSz.x, bufSz.y, H.finish.uniforms, true); }
  else H.finish.uniforms.uHOn.value = 0;
  if (!gone) H.composer.render();
}


const bar = document.querySelector('#loader .bar i');
const setLoad = v => { if (bar) bar.style.width = Math.round(v * 100) + '%'; };
setLoad(.2);
requestAnimationFrame(async () => {
  await Promise.race([document.fonts.load(`600 64px Archivo`), new Promise(r => setTimeout(r, 1500))]).catch(() => {});
  setLoad(.7);
  lenses = [lensMat(['♠', 'GT', '♥'].map(lensView)), lensMat(['♦', 'GT', '♣'].map(lensView))];
  hero = K.portalChip(lenses); mono.add(hero);
  /* jetons du croupier : deux piles à battre (rouge / noire), une pile à droite et des jetons épars à ramasser */
  for (let j = 0; j < nR; j++) [-1, 1].forEach(sd => fiches.push({ role: 0, sd, j, o: 2 * j + (sd > 0), col: sd < 0 ? 0 : 1 }));
  for (let j = 0; j < pre; j++) fiches.push({ role: 1, j, col: j % 2 });
  for (let j = 0; j < nL; j++) fiches.push({ role: 2, j, col: j === nL - 1 ? 0 : (j + 1) % 2, roll: j === nL - 1 });
  const edge2 = edgeGeo.clone().rotateX(-PI / 2), face2 = both(faceGeo, CT / 2), ring2 = both(ringGeo.clone().scale(1, 1, .35), CT / 2 + .004);
  const inst = (geo, mat, n) => { const m = new THREE.InstancedMesh(geo, mat, n); m.castShadow = m.receiveShadow = true; m.frustumCulled = false; H.scene.add(m); return m; };
  fx.kinds = [C.red, C.black].map((b, col) => {
    const n = fiches.filter(c => c.col === col).length;
    return { edge: inst(edge2, clay(chipEdge(b)), n), face: inst(face2, clay(chipFace(b, true)), n) };
  });
  fx.rings = inst(ring2, goldMat, fiches.length); fx.rings.castShadow = false;
  // imperfections : chaque jeton garde un infime décalage (rotation propre, position)
  const cnt = [0, 0]; fiches.forEach((c, n) => Object.assign(c, { n, io: n, ci: cnt[c.col]++, jy: jit(n, 1) * .06, jl: jit(n, 2) * .018, jf: jit(n, 3) * .018 }));
  const bg = new THREE.PlaneGeometry(1, 1).rotateX(-PI / 2); bg.setAttribute('aO', new THREE.InstancedBufferAttribute(new Float32Array(fiches.length + 1), 1));
  fx.blobs = new THREE.InstancedMesh(bg, blobMat, fiches.length + 1); fx.blobs.frustumCulled = false; fx.blobs.renderOrder = 2; H.scene.add(fx.blobs);
  // échos du pile ou face (flou de bougé), mêmes géométries, matières translucides
  fx.ghosts = [0, 1].map(() => {
    const g = new THREE.Group(), r = new THREE.Group(), mats = [fx.kinds[0].edge.material, fx.kinds[0].face.material].map(m => Object.assign(m.clone(), { transparent: true, depthWrite: false }));
    r.rotation.x = PI / 2; g.add(r); r.add(new THREE.Mesh(edge2, mats[0]), new THREE.Mesh(face2, mats[1]));
    g.userData.mats = mats; g.visible = false; H.scene.add(g); return g;
  });
  croupier(0, 0);
  H.renderer.compile(H.scene, H.camera);
  setLoad(1);
  onReady();
  document.getElementById('loader').classList.add('done');
  document.body.classList.remove('loading');
  if (reduceMotion) gsap.globalTimeline.timeScale(6);
  setTimeout(() => {
    gsap.to(intro, { v: 0, duration: 3.6, ease: 'power3.inOut', onComplete: () => lenis.start() });
    gsap.to(intro, { g: 0, duration: 3, delay: .4, ease: 'expo.inOut' });
    gsap.to(intro, { t: 0, duration: 3.2, delay: 1.4, ease: 'none' });
    gsap.to(key, { intensity: 100, duration: 2.6, delay: .3, ease: 'power2.inOut' });
    gsap.to(rimBlue, { intensity: 110, duration: 2.6, delay: .9, ease: 'power2.inOut' });
    gsap.to(rimWarm, { intensity: 70, duration: 2.6, delay: 1.2, ease: 'power2.inOut' });
    gsap.to(fill, { intensity: 2.5, duration: 2.6, delay: .6 });
    gsap.to(shaft.material.uniforms.uOpacity, { value: .1, duration: 3, delay: .4 });
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
M.scene.background = new THREE.Color(0x0B1B2E);
M.scene.fog = new THREE.Fog(0x0B1B2E, 26, 62);

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
  const tint = new THREE.Mesh(new THREE.PlaneGeometry(160, 160), new THREE.MeshStandardMaterial({ color: 0x0C1A2B, roughness: .55, metalness: .1, transparent: true, opacity: .86 }));
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
const ACC = { casino: 0x9DB4D0, hotel: 0xF9C83B, club: 0xBA2637 };
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
