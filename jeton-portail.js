/* Groupe Tranchant — « la section finit sur un jeton qui tombe et s'ouvre pour faire découvrir la suite »
   1. chipKit : le jeton de l'ouverture (textures de face et de tranche, lentille GT, argile), partagé avec scene.js
   2. portalChip : le même jeton, centre ivoire découpé en 17 lames qui pivotent comme des persiennes
   3. mountPortails : transition entre grandes sections, sur un calque WebGL transparent (rendu seulement pendant le passage) */
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

const PI = Math.PI;
const clamp01 = x => Math.min(1, Math.max(0, x));
const seg = (x, a, b) => clamp01((x - a) / (b - a)), sm = x => x * x * (3 - 2 * x), mix = (a, b, e) => a + (b - a) * e;

/* ================= LE JETON (repris de l'ouverture « Le geste du croupier ») ================= */
export function chipKit(renderer, o = {}) {
  const FS = o.lite ? 1024 : 2048, LS = o.lite ? 512 : 1024;   // tailles des textures de face et de lentille
  /* Emblème « Jeton lenticulaire » : jeton de table rouge casino, inserts ivoire sur la tranche,
     centre lenticulaire. De face GT ; incliné, ♠ à gauche et ♥ à droite ; au revers ♣ et ♦. */
  const R = 1.9, CT = .34, RC = .642 * R;            // rayon, épaisseur, rayon du centre ivoire
  const C = { red: '#B3172E', black: '#0D0D11', ivory: '#F3ECDD', gold: '#C9A45C' };
  const INS = [...Array(8)].map((_, k) => PI / 8 + k * PI / 4);   // angles des inserts
  const tex = (c, srgb = true) => { const t = new THREE.CanvasTexture(c); if (srgb) t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = renderer.capabilities.getMaxAnisotropy(); return t; };
  const canvas = (w, h = w) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return [c, c.getContext('2d')]; };
  /* GT de la DA : dessiné dans une boîte de 120, découpé en 15 lames de 5 au pas de 8 (S = diamètre du centre) */
  const GT_G = new Path2D('M56 42A24 24 0 0 0 32 18A24 24 0 0 0 8 42V78A24 24 0 0 0 32 102A24 24 0 0 0 56 78V58H32V72H40V78A8 8 0 0 1 32 86A8 8 0 0 1 24 78V42A8 8 0 0 1 32 34A8 8 0 0 1 40 42Z');
  const GT_T = new Path2D('M64 18H112V34H96V102H80V34H64Z');
  function lames(x, S, cx, cy, draw) {
    const k = S / 154 * 1.067;
    x.save(); x.translate(cx - 64 * S / 154, cy - 64 * S / 154); x.scale(k, k);
    x.beginPath(); for (let i = 0; i < 15; i++) x.rect(1.5 + i * 8, 0, 5, 120); x.clip();
    draw(); x.restore();
  }
  function drawGT(x, S, cx, cy) {
    lames(x, S, cx, cy, () => { x.fillStyle = C.black; x.fill(GT_G); x.fillStyle = C.red; x.fill(GT_T); });
  }
  /* une vue de la lentille : fond ivoire, lames, et GT ou une enseigne */
  function lensView(glyph) {
    const S = LS, [c, x] = canvas(S);
    x.fillStyle = C.ivory; x.fillRect(0, 0, S, S);
    if (glyph === 'GT') drawGT(x, S, S / 2, S / 2);
    else {
      lames(x, S, S / 2, S / 2, () => {
        x.fillStyle = glyph === '♥' || glyph === '♦' ? C.red : C.black;
        x.font = '90px "Apple Symbols","Segoe UI Symbol","DejaVu Sans",serif'; x.textAlign = 'center'; x.textBaseline = 'middle';
        x.fillText(glyph + '︎', 60, 63);
      });
    }
    const u = S * .83 / 15, b0 = S * .085;
    for (let i = 0; i < 15; i++) {                    // relief cylindrique de chaque lame
      const g = x.createLinearGradient(b0 + i * u, 0, b0 + (i + 1) * u, 0);
      g.addColorStop(0, 'rgba(0,0,0,.10)'); g.addColorStop(.45, 'rgba(255,255,255,.06)'); g.addColorStop(1, 'rgba(0,0,0,.12)');
      x.fillStyle = g; x.fillRect(b0 + i * u, 0, u, S);
    }
    return tex(c);
  }
  /* face du jeton : corps, inserts, couronne dentelée, liseré or, microtexte, centre ivoire */
  function chipFace(body, withGT) {
    const S = FS, m = S / 2, [c, x] = canvas(S), P = r => r * m;
    x.fillStyle = body; x.beginPath(); x.arc(m, m, P(1), 0, 7); x.fill();
    const n = x.createImageData(S, S);               // grain d'argile
    for (let i = 0; i < n.data.length; i += 4) { const v = Math.random() * 255; n.data[i] = n.data[i + 1] = n.data[i + 2] = v; n.data[i + 3] = 10; }
    const [nc, nx] = canvas(S); nx.putImageData(n, 0, 0); x.globalCompositeOperation = 'overlay'; x.drawImage(nc, 0, 0); x.globalCompositeOperation = 'source-over';
    x.save(); x.translate(m, m);
    INS.forEach(a => {
      x.save(); x.rotate(-a + PI / 2);               // repère : l'insert monte vers le bord
      const w = P(.183), y1 = -P(1.01), hh = P(.18);
      x.fillStyle = C.ivory; x.fillRect(-w / 2, y1, w, hh);
      x.fillStyle = C.black; x.fillRect(-P(.0165), y1, P(.033), hh);
      x.restore();
    });
    x.fillStyle = C.ivory;
    for (let k = 0; k < 64; k++) { x.save(); x.rotate(k * PI / 32 + PI / 64); x.fillRect(-P(.011), -P(.808), P(.022), P(.033)); x.restore(); }
    x.strokeStyle = C.gold; x.lineWidth = P(.012); x.beginPath(); x.arc(0, 0, P(.754), 0, 7); x.stroke();
    const txt = 'GROUPE TRANCHANT · CASINOS · HÔTELS · DIVERTISSEMENT · 1988 · ';
    x.fillStyle = C.ivory; x.font = `600 ${P(.062)}px Archivo, Manrope, sans-serif`; x.textAlign = 'center'; x.textBaseline = 'middle';
    const total = [...txt].reduce((s, ch) => s + x.measureText(ch).width, 0), k = PI * 2 / total;
    let a = -PI / 2;
    [...txt].forEach(ch => { const w = x.measureText(ch).width; a += w * k / 2; x.save(); x.rotate(a + PI / 2); x.fillText(ch, 0, -P(.703)); x.restore(); a += w * k / 2; });
    x.strokeStyle = C.ivory; x.lineWidth = P(.009); x.beginPath(); x.arc(0, 0, P(.655), 0, 7); x.stroke();
    x.fillStyle = C.ivory; x.beginPath(); x.arc(0, 0, P(.642), 0, 7); x.fill();
    for (let k = 0; k < 700; k++) {                // usure : micro-éraflures claires près du bord
      const a = Math.random() * 7, r = P(.9 + Math.random() * .1);
      x.fillStyle = `rgba(255,246,230,${.03 + Math.random() * .08})`; x.fillRect(Math.cos(a) * r, Math.sin(a) * r, 1 + Math.random() * P(.006), 1 + Math.random() * 2);
    }
    x.restore();
    if (withGT) drawGT(x, P(1.284), m, m);
    return tex(c);
  }
  /* tranche : rouge, 8 inserts ivoire coupés d'un filet noir */
  function chipEdge(body) {
    const W = 2048, [c, x] = canvas(W, 64);
    x.fillStyle = body; x.fillRect(0, 0, W, 64);
    INS.forEach(a => {
      const u = ((a + PI / 2) / (PI * 2) % 1) * W, w = .183 / (PI * 2) * W;
      x.fillStyle = C.ivory; x.fillRect(u - w / 2, 0, w, 64);
      x.fillStyle = C.black; x.fillRect(u - w * .09, 0, w * .18, 64);
    });
    // arêtes : léger assombrissement au contact (occlusion) et usure claire
    const g = x.createLinearGradient(0, 0, 0, 64);
    [[0, .42], [.18, 0], [.82, 0], [1, .42]].forEach(([o, a]) => g.addColorStop(o, `rgba(0,0,0,${a})`));
    x.fillStyle = g; x.fillRect(0, 0, W, 64);
    for (let k = 0; k < 420; k++) { x.fillStyle = `rgba(255,246,230,${.04 + Math.random() * .12})`; x.fillRect(Math.random() * W, Math.random() < .5 ? Math.random() * 9 : 55 + Math.random() * 9, 1 + Math.random() * 3, 1 + Math.random() * 1.5); }
    return tex(c);
  }
  /* tranche légèrement arrondie (révolution) */
  const edgeGeo = (() => {
    const b = .03, pts = [];
    for (let i = 0; i <= 6; i++) { const t = -PI / 2 + i / 6 * PI / 2; pts.push(new THREE.Vector2(R - b + Math.cos(t) * b, -CT / 2 + b + Math.sin(t) * b)); }
    for (let i = 0; i <= 6; i++) { const t = i / 6 * PI / 2; pts.push(new THREE.Vector2(R - b + Math.cos(t) * b, CT / 2 - b + Math.sin(t) * b)); }
    return new THREE.LatheGeometry(pts, 160).rotateX(PI / 2);
  })();
  const faceGeo = new THREE.CircleGeometry(R - .03, 160), lensGeo = new THREE.CircleGeometry(RC, 96);
  const goldMat = new THREE.MeshPhysicalMaterial({ color: 0xD8B26A, metalness: 1, roughness: .2, clearcoat: .6, envMapIntensity: 1.2 });
  const ringGeo = new THREE.TorusGeometry(.754 * (R - .03), .011, 8, 200);
  /* argile : rugosité légèrement irrégulière (grain fin et plages plus satinées) */
  const grain = (() => {
    const [c, x] = canvas(512), d = x.createImageData(512, 512);
    for (let i = 0; i < d.data.length; i += 4) { d.data[i] = d.data[i + 1] = d.data[i + 2] = 104 + Math.random() * 40; d.data[i + 3] = 255; }
    x.putImageData(d, 0, 0);
    for (let k = 0; k < 90; k++) { x.fillStyle = Math.random() < .5 ? 'rgba(80,80,80,.08)' : 'rgba(170,170,170,.08)'; x.beginPath(); x.arc(Math.random() * 512, Math.random() * 512, 10 + Math.random() * 50, 0, 7); x.fill(); }
    return tex(c, false);
  })();
  const clay = map => new THREE.MeshPhysicalMaterial({ map, roughnessMap: grain, color: 0xE6E6E6, roughness: 1, metalness: 0, clearcoat: .55, clearcoatRoughness: .32, envMapIntensity: .7 });
  /* lentille : chaque lame choisit sa vue selon l'angle de regard (uPhi), avec un léger décalage de parallaxe */
  function lensMat(views) {
    const m = new THREE.MeshPhysicalMaterial({ map: views[1], roughness: .24, clearcoat: 1, clearcoatRoughness: .08, envMapIntensity: .9, side: THREE.DoubleSide });
    m.userData.phi = { value: 0 };
    m.onBeforeCompile = s => {
      Object.assign(s.uniforms, { tA: { value: views[0] }, tC: { value: views[2] }, uPhi: m.userData.phi });
      s.fragmentShader = 'uniform sampler2D tA, tC; uniform float uPhi;\n' + s.fragmentShader.replace('#include <map_fragment>', `
        vec2 q = vMapUv;
        float i = floor(clamp((q.x - .085) / .83, 0., .9999) * 15.);
        float a = abs(uPhi), V = 1. + sign(uPhi) * 1.6 * clamp((a - .16) / .32, 0., 1.) + .45 * ((i + .5) / 15. - .5);
        vec4 tx = V < .5 ? texture2D(tA, q) : V < 1.5 ? texture2D(map, q) : texture2D(tC, q);
        diffuseColor *= tx;`);
    };
    return m;
  }
  const lenses = () => [lensMat(['♠', 'GT', '♥'].map(lensView)), lensMat(['♦', 'GT', '♣'].map(lensView))];

  /* ===== Jeton « portail » : faces percées au rayon du centre, paroi ivoire, et 17 lames (2 marges + les 15 lames du GT)
     découpées dans le cercle de la lentille ; chaque lame pivote sur son axe vertical, du centre vers les bords ===== */
  const XS = [-RC, ...[...Array(16)].map((_, k) => (-.83 + k * 1.66 / 15) * RC), RC];
  const chord = x => Math.sqrt(Math.max(0, RC * RC - x * x));
  function slatGeo(a, b) {
    const n = Math.max(3, Math.ceil((b - a) / (2 * RC) * 60)), xc = (a + b) / 2, s = new THREE.Shape();
    for (let i = 0; i <= n; i++) { const x = mix(a, b, i / n); i ? s.lineTo(x - xc, -chord(x)) : s.moveTo(x - xc, -chord(x)); }
    for (let i = n; i >= 0; i--) { const x = mix(a, b, i / n); s.lineTo(x - xc, chord(x)); }
    const g = new THREE.ShapeGeometry(s), p = g.attributes.position, uv = g.attributes.uv;
    for (let i = 0; i < p.count; i++) uv.setXY(i, ((p.getX(i) + xc) / RC + 1) / 2, (p.getY(i) / RC + 1) / 2);
    return g;
  }
  const slatGeos = XS.slice(0, -1).map((a, k) => slatGeo(a, XS[k + 1]));
  const holeFace = new THREE.RingGeometry(RC, R - .03, 160, 1);
  const wallGeo = new THREE.CylinderGeometry(RC, RC, CT, 120, 1, true).rotateX(PI / 2);
  let faceTex = null, edgeTex = null;
  function portalChip(lens = lenses()) {
    faceTex ||= chipFace(C.red, false); edgeTex ||= chipEdge(C.red);
    const g = new THREE.Group(), face = clay(faceTex), slats = [];
    const edge = new THREE.Mesh(edgeGeo, clay(edgeTex)); edge.castShadow = edge.receiveShadow = true; g.add(edge);
    const wall = new THREE.Mesh(wallGeo, new THREE.MeshPhysicalMaterial({ color: 0xE9E0CE, roughness: .7, clearcoat: .3, side: THREE.BackSide, envMapIntensity: .6 }));
    g.add(wall);
    [1, -1].forEach(s => {
      const f = new THREE.Group(); f.position.z = s * CT / 2; if (s < 0) f.rotation.y = PI; g.add(f);
      const fm = new THREE.Mesh(holeFace, face); fm.castShadow = fm.receiveShadow = true; f.add(fm);
      const ring = new THREE.Mesh(ringGeo, goldMat); ring.scale.z = .35; ring.position.z = .004; f.add(ring);
      const set = slatGeos.map((geo, k) => {
        const m = new THREE.Mesh(geo, lens[s > 0 ? 0 : 1]); m.position.set((XS[k] + XS[k + 1]) / 2, 0, .006); m.castShadow = true; f.add(m);
        return { m, xc: m.position.x, hw: (XS[k + 1] - XS[k]) / 2, d: Math.abs(k - 8) / 8 };
      });
      slats.push(set);
    });
    g.userData = { slats, lens, zTop: CT / 2 + .006, open: 0 };
    return g;
  }
  /* ouverture des persiennes : o de 0 (fermé, GT entier) à 1 (lames de chant) */
  function openChip(g, o) {
    g.userData.open = o;
    g.userData.slats.forEach(set => set.forEach(s => {
      const a = PI / 2 * sm(seg(o, s.d * .42, s.d * .42 + .58));
      s.m.rotation.y = a; s.m.visible = a < PI / 2 - .002;
    }));
  }
  return { R, CT, RC, C, INS, XS, tex, canvas, chipFace, chipEdge, edgeGeo, faceGeo, lensGeo, goldMat, ringGeo, grain, clay, lensMat, lensView, lenses, portalChip, openChip };
}

/* Découpe de l'ouverture dans le shader de sortie (aucun travail de mise en page) : repère du jeton projeté à l'écran
   (le jeton couché est parallèle à l'écran, la projection de son plan est donc une similitude exacte), lames encore fermées */
const _p0 = new THREE.Vector3(), _p1 = new THREE.Vector3(), _p2 = new THREE.Vector3();
export function holeMask(K, g, camera, bw, bh, U, on) {
  U.uHOn.value = on ? 1 : 0;
  if (!on) return;
  const { slats, zTop } = g.userData;
  g.updateWorldMatrix(true, false);
  const P = (v, x, y) => { v.set(x, y, zTop).applyMatrix4(g.matrixWorld).project(camera); v.set((v.x + 1) / 2 * bw, (v.y + 1) / 2 * bh, 0); return v; };
  P(_p0, 0, 0); P(_p1, 1, 0).sub(_p0); P(_p2, 0, 1).sub(_p0);
  const det = _p1.x * _p2.y - _p2.x * _p1.y;
  U.uHC.value.set(_p0.x, _p0.y);
  U.uHM.value.set(_p2.y / det, -_p2.x / det, -_p1.y / det, _p1.x / det);
  U.uHR.value = K.RC; U.uHPx.value = 1 / Math.hypot(_p1.x, _p1.y);
  slats[0].forEach((s, k) => U.uSl.value[k].set(s.xc, s.m.visible ? s.hw * Math.abs(Math.cos(s.m.rotation.y)) : 0));
}

/* Calendrier d'une transition, fonction pure de la progression q ∈ [0,1] de la zone épinglée :
   chute 0→.35, temps de pose .35→.45, persiennes .45→.8, plongée dans l'ouverture jusqu'au plein écran .72→.95 */
export const PHASES = q => ({ f: seg(q, 0, .35), so: seg(q, .45, .8), dv: sm(seg(q, .72, .95)), light: sm(seg(q, 0, .2)) });

/* ================= TRANSITIONS ENTRE SECTIONS ================= */
/* sections révélées par un jeton (la transition se joue juste avant chacune) ; une ou deux par page, les grandes coupures seulement.
   Chaque suite a sa propre animation (jamais deux fois la même sur une page) ; ?jpv=nom force une variante partout (essais) */
const SUITES = { '#specialisees': 'pile', '#talents': 'lancer', '#engagements': 'rateau', '#index-egalite': 'iris', '.ap-story': 'roule', '.sz': 'pile',
  '#carte': 'lancer', '#annuaire': 'rateau', '#offres-emploi': 'iris', '#metiers': 'roule', '#shooting': 'lancer' };
const MODS = { pile: () => import('./jp-v-pile.js'), lancer: () => import('./jp-v-lancer.js'), rateau: () => import('./jp-v-rateau.js'),
  iris: () => import('./jp-v-iris.js'), roule: () => import('./jp-v-roule.js') };

/* Contrat d'une variante : create(ctx) → { frame(q), resize() }
   ctx = { THREE, renderer, camera, K (chipKit partagé), env (texture d'environnement), view { W, H, T }, LITE, seg, sm, mix, clamp01 }
   frame(q) est une fonction pure de q ∈ [0,1] (aucun temps réel) et fait tout le rendu (renderer.clear() puis ses scènes) :
   à q = 0 l'écran est entièrement couvert du tapis bleu nuit #0B1B2E (raccord avec .jp-gap), à q ≥ .95 plus rien n'est dessiné
   (calque transparent : la section suivante, glissée dessous, apparaît telle qu'on va la lire). */
export function createChute(ctx) {
  const { renderer, camera, K, view, env } = ctx;
  const scene = new THREE.Scene();
  scene.environment = env;
  scene.environmentRotation.x = -PI / 2;                                   // reflets du studio pris de côté : rouge profond, sans voile
  const key = new THREE.DirectionalLight(0xFFF0DA, 1.4); key.position.set(-4, 6, 10);
  const rim = new THREE.DirectionalLight(0x8FB4E6, .9); rim.position.set(6, -5, 4);
  scene.add(key, rim, new THREE.AmbientLight(0xffffff, .08));
  const chip = K.portalChip(), pivot = new THREE.Group();
  pivot.add(chip); scene.add(pivot);
  /* tapis : couvre l'écran (feutre bleu nuit sous un douche de lumière), porte l'ombre de contact et se perce au centre du jeton */
  const U = { uRes: { value: new THREE.Vector2() }, uTop: { value: 0 }, uL: { value: 0 }, uC: { value: new THREE.Vector2() }, uR: { value: 0 }, uS: { value: new THREE.Vector3() }, uSA: { value: 0 }, uSoft: { value: .3 } };
  const felt = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), new THREE.ShaderMaterial({
    uniforms: U, transparent: true, depthTest: false, depthWrite: false, premultipliedAlpha: true,
    vertexShader: 'void main(){ gl_Position = vec4(position.xy, 0., 1.); }',
    fragmentShader: `uniform vec2 uRes, uC; uniform float uTop, uL, uR, uSA, uSoft; uniform vec3 uS;
      float rnd(vec2 p){ return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
      void main(){
        vec2 p = gl_FragCoord.xy, q = (p - uRes * .5) / uRes.y;
        vec3 c = vec3(.0431, .1059, .1804) + uL * vec3(.05, .07, .08) * (1. - smoothstep(.05, .75, length(q * vec2(.8, 1.))));
        c += (rnd(p) - .5) * .012 * uL;
        float d = length(p - uS.xy) / uS.z, sh = uSA * (1. - smoothstep(1. - uSoft, 1. + uSoft, d));
        float m = clamp(uRes.y - p.y - uTop + .5, 0., 1.), hole = smoothstep(uR - 1.2, uR + 1.2, length(p - uC));
        gl_FragColor = vec4(c * (1. - sh), 1.) * m * hole;
      }` }));
  felt.frustumCulled = false; const under = new THREE.Scene(); under.add(felt);   // tapis dessiné d'abord, le jeton par-dessus
  const T = view.T;
  let Dc = 14, zEnd = 2.4;
  const resize = () => {
    const { W, H } = view;
    renderer.getDrawingBufferSize(U.uRes.value);
    // le jeton occupe près de la moitié de la hauteur (bureau) ou les quatre cinquièmes de la largeur (téléphone)
    Dc = Math.max(2 * K.R / (.48 * 2 * T), 2 * K.R / (.8 * 2 * T * camera.aspect));
    zEnd = K.RC * (H / 2 / T) / (Math.hypot(W, H) / 2 * 1.06);
  };
  resize();
  /* chute, fonction pure de f (donc de la position de défilement) : le jeton tombe en culbutant, frappe la table incliné,
     rebondit, puis tournoie sur sa tranche comme un disque d'Euler qui s'éteint, et se couche à plat face à l'écran */
  const qx = new THREE.Quaternion(), qs = new THREE.Quaternion(), ZA = new THREE.Vector3(0, 0, 1), ax = new THREE.Vector3();
  const _c = new THREE.Vector3();
  const lift = a => K.CT / 2 * Math.cos(a) + K.R * Math.abs(Math.sin(a));
  function pose(f) {
    const fa = seg(f, 0, .4), fb = seg(f, .4, .6), fc = seg(f, .6, 1);
    let x = 0, y = 0, z, tilt, prec = 0, spin;
    if (fb === 0) {                                                // chute libre, culbute d'un tour et quart
      const s = fa; tilt = .42 + (1 - s) * 2.5 * PI; spin = 1.3 * (1 - s) ** 2 + .35;
      z = lift(tilt) + Dc * .62 * (1 - s * s); y = K.R * 3 * (1 - s) ** 1.5; x = -K.R * .25 * (1 - s);
    } else if (fc === 0) {                                         // impact sur la tranche : rebond et bascule
      const s = fb; tilt = mix(.42, -.17, sm(s)); spin = .35 - .1 * s;
      z = lift(tilt) + K.R * .3 * Math.sin(PI * s) * (1 - .3 * s);
    } else {                                                       // toupie d'Euler : l'inclinaison s'éteint, la précession accélère
      const w = fc; tilt = .17 * (1 - w) ** 1.6; prec = PI + 24 * w ** 1.8; spin = .25 - .1 * w;
      z = lift(tilt);
    }
    ax.set(Math.cos(prec), Math.sin(prec), 0);
    qx.setFromAxisAngle(ax, tilt); qs.setFromAxisAngle(ZA, spin);
    pivot.quaternion.copy(qx).multiply(qs);
    pivot.position.set(x, y, z);
    return { x, y, z, tilt };
  }
  return {
    frame(q) {
      const { f, so, dv, light } = PHASES(q), ps = pose(f);
      const cz = Dc * Math.pow(zEnd / Dc, dv);
      camera.position.set(0, 0, cz); camera.up.set(0, 1, 0); camera.lookAt(0, 0, 0);
      K.openChip(chip, so);
      chip.userData.slats[1].forEach(s => { s.m.visible = so === 0; });   // revers masqué une fois ouvert (on voit au travers)
      chip.rotation.z = -.6 * dv;                                           // la bague tourne comme un diaphragme
      chip.updateWorldMatrix(true, false);                                  // lentille : GT de face, ♠/♥ quand il penche
      const lc = chip.worldToLocal(_c.copy(camera.position));
      chip.userData.lens[0].userData.phi.value = Math.atan2(lc.x, lc.z); chip.userData.lens[1].userData.phi.value = Math.atan2(-lc.x, -lc.z);
      const fp = renderer.getPixelRatio() * view.H / 2 / T, cx = U.uRes.value.x / 2, cy = U.uRes.value.y / 2;
      U.uTop.value = 0; U.uL.value = light;
      U.uC.value.set(cx, cy); U.uR.value = so > 0 ? K.RC * fp / cz : 0;  // le tapis se perce sous le centre : les jours entre les lames montrent la suite
      const h = ps.z - lift(ps.tilt) + Math.abs(ps.tilt) * .4;            // hauteur au-dessus du tapis
      U.uS.value.set(cx + (ps.x + h * .35) * fp / cz, cy + (ps.y - h * .5) * fp / cz, K.R * (1.04 + h * .18) * fp / cz);
      U.uSA.value = .62 * (1 - sm(clamp01(h / 6))) * (1 - dv); U.uSoft.value = .16 + Math.min(.5, h * .12);
      renderer.clear(); renderer.render(under, camera); renderer.render(scene, camera);
    },
    resize, scene
  };
}

export function mountPortails({ lenis, reduceMotion }) {
  const force = new URLSearchParams(location.search).get('jpv');
  const list = Object.entries(SUITES).map(([s, v]) => ({ b: document.querySelector(s), v: force || v })).filter(o => o.b?.previousElementSibling);
  if (!list.length) return;
  /* mouvement réduit : la section suivante apparaît en fondu, sans chute */
  if (reduceMotion) {
    const io = new IntersectionObserver(es => es.forEach(e => e.target.classList.toggle('jp-in', e.isIntersecting)), { rootMargin: '0px 0px -20% 0px' });
    list.forEach(({ b }) => { b.classList.add('jp-fade'); io.observe(b); });
    return;
  }
  const LITE = innerWidth < 821 || (navigator.hardwareConcurrency || 8) <= 4;
  /* avant chaque suite, une zone de tapis bleu nuit (même teinte que le tapis du calque) : la section précédente s'en va
     normalement ; quand le tapis couvre l'écran, la zone est épinglée et sa progression q pilote tout, sans aucun temps réel :
     on peut défiler à n'importe quelle vitesse, dans les deux sens, l'image est toujours f(q) */
  const ports = list.map(({ b, v }) => {
    const g = document.createElement('div'); g.className = 'jp-gap'; g.setAttribute('aria-hidden', 'true'); b.before(g);
    return { b, g, v, top: 0, h: 1, tf: '' };
  });
  let gl = null, building = false, act = null, lastQ = -1, shown = false;
  const cv = document.createElement('canvas'); cv.className = 'jp-gl'; cv.setAttribute('aria-hidden', 'true'); document.body.appendChild(cv);
  const sy = () => lenis.scroll ?? scrollY;

  async function build() {
    building = true;
    await Promise.race([document.fonts.load('600 64px Archivo'), new Promise(r => setTimeout(r, 1200))]).catch(() => {});
    const renderer = new THREE.WebGLRenderer({ canvas: cv, alpha: true, antialias: !LITE, powerPreference: 'high-performance' });
    renderer.setPixelRatio(Math.min(devicePixelRatio, LITE ? 1.25 : 1.5));
    renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = .9;
    renderer.outputColorSpace = THREE.SRGBColorSpace; renderer.setClearColor(0, 0);
    renderer.autoClear = false;
    const camera = new THREE.PerspectiveCamera(30, 1, .05, 200);
    const pmrem = new THREE.PMREMGenerator(renderer);
    const env = pmrem.fromScene(new RoomEnvironment(renderer), .04).texture; pmrem.dispose();
    const view = { W: 1, H: 1, T: Math.tan(PI / 12) };
    const sizeRenderer = () => {
      view.W = innerWidth; view.H = innerHeight;
      renderer.setSize(view.W, view.H, false); camera.aspect = view.W / view.H; camera.updateProjectionMatrix();
    };
    sizeRenderer();
    const ctx = { THREE, renderer, camera, K: chipKit(renderer, { lite: LITE }), env, view, LITE, seg, sm, mix, clamp01 };
    const vs = {};
    for (const v of new Set(ports.map(p => p.v))) {
      try { vs[v] = (await MODS[v]()).create(ctx); } catch (err) { console.warn('transition', v, 'indisponible', err); }
      if (!vs[v]) vs[v] = vs.chute || (vs.chute = createChute(ctx));
      vs[v].scene && renderer.compile(vs[v].scene, camera);
      // préchauffage au repos : quelques images à blanc compilent tous les programmes (ombres comprises) avant le premier passage
      for (const q of [0, .2, .4, .6, .8, .9]) vs[v].frame(q);
      renderer.clear();
      await new Promise(r => (window.requestIdleCallback || setTimeout)(r));
    }
    gl = {
      frame(q, v) { vs[v].frame(q); },
      resize() { sizeRenderer(); Object.values(vs).forEach(x => x.resize()); }
    };
    building = false;
    lastQ = -1; update();
  }

  /* positions lues une fois (et à chaque changement de taille), jamais pendant le défilement */
  function measure() {
    const y = sy();
    ports.forEach(pt => { pt.top = pt.g.getBoundingClientRect().top + y; pt.h = pt.g.offsetHeight; });
    lastQ = -1; update();
  }
  /* à chaque pas de défilement (dans l'image même où Lenis a bougé la page) : uniquement des transformations et un rendu */
  function update() {
    const y = sy(); let a = null, q = 0;
    for (const pt of ports) {
      const qq = (y - pt.top) / pt.h, pin = qq >= 0 && qq < 1;
      // la suite attend en haut de l'écran sous le tapis, à sa place définitive : l'ouverture la montre telle qu'on va la lire
      const tf = pin ? `translate3d(0,${(y - pt.top - pt.h).toFixed(1)}px,0)` : '';
      if (tf !== pt.tf) { if (!tf !== !pt.tf) pt.b.style.willChange = tf ? 'transform' : ''; pt.b.style.transform = pt.tf = tf; }
      if (pin && qq < .95) { a = pt; q = qq; }
      if (!gl && !building && qq > -1.5 && qq < 1.2) build();
    }
    const show = !!(a && gl);
    if (show !== shown) { cv.classList.toggle('on', show); shown = show; }
    if (show && (q !== lastQ || a !== act)) gl.frame(q, a.v);
    act = a; lastQ = show ? q : -1;
  }
  lenis.on('scroll', update);
  addEventListener('scroll', () => { if (lenis.isStopped) update(); }, { passive: true });
  addEventListener('resize', () => { gl?.resize(); measure(); });
  new ResizeObserver(() => measure()).observe(document.body);
  addEventListener('load', measure);
  measure();
  /* le moteur du calque (textures, environnement, shaders) se prépare au repos, jamais au milieu d'un défilement */
  const idle = window.requestIdleCallback || (f => setTimeout(f, 1));
  // plus tôt quand une transition est à quelques écrans du haut de la page : elle doit être prête avant qu'on l'atteigne
  const near = ports[0].top < 4 * innerHeight;
  setTimeout(() => idle(() => { if (!gl && !building) build(); }, { timeout: near ? 1500 : 5000 }), near ? 1200 : 6000);
}
