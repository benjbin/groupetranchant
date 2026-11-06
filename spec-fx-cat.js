/* Groupe Tranchant — scène de la filiale CAT (Casino Advanced Technology), accueil.
   Contrat : mount(layer, { reduceMotion }) → { play(), pause(), pointer(mx, my) }.
   Plan « publicité produit » en vrai 3D (three.js) : façade de machine à sous laquée, cadre laiton,
   rouleaux cylindriques avec flou de vitesse, arrêt mécanique avec rebond, ligne gagnante qui s'allume,
   jetons de casino qui tombent et s'empilent sur la console. Textures 100 % procédurales. */
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

const P = 5.2;
const TAU = Math.PI * 2;
const C = { navy: '#0B1B2E', blue: '#335F94', mist: '#9DB4D0', yellow: '#F9C83B', red: '#BA2637', paper: '#F5F1EA' };
const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const smooth = (a, b, v) => { const t = clamp((v - a) / (b - a)); return t * t * (3 - 2 * t); };
const rand = seed => () => (seed = (seed * 16807) % 2147483647) / 2147483647;
const canvas = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return [c, c.getContext('2d')]; };

/* ---------------- symboles des rouleaux (dessin canvas) ---------------- */
const SYM_N = 5;          // 0:7  1:BAR  2:cloche  3:diamant  4:jeton
const STRIPS = [
  [0, 3, 1, 4, 2, 0, 1, 3, 2, 4],
  [1, 4, 0, 2, 3, 1, 0, 4, 3, 2],
  [2, 0, 4, 1, 3, 0, 2, 4, 1, 3]
];
const CELLS = 10, CW = 320, CH = 292;

function drawSymbol(x, k, s) {
  x.save(); x.lineJoin = 'round'; x.lineCap = 'round';
  if (k === 0) {                                   // 7 rouge cerclé d'or
    x.font = `800 ${s * 1.22}px Archivo, Arial`; x.textAlign = 'center'; x.textBaseline = 'middle';
    x.transform(1, 0, -.14, 1, 0, 0);
    x.lineWidth = s * .2; x.strokeStyle = '#0B1B2E'; x.strokeText('7', 0, s * .06);
    const gs = x.createLinearGradient(0, -s * .5, 0, s * .5); gs.addColorStop(0, '#FFE69A'); gs.addColorStop(.5, '#F9C83B'); gs.addColorStop(1, '#A87414');
    x.lineWidth = s * .1; x.strokeStyle = gs; x.strokeText('7', 0, s * .06);
    const g = x.createLinearGradient(0, -s * .5, 0, s * .5); g.addColorStop(0, '#E6505F'); g.addColorStop(.55, '#BA2637'); g.addColorStop(1, '#6E1220');
    x.fillStyle = g; x.fillText('7', 0, s * .06);
    x.globalCompositeOperation = 'source-atop'; x.fillStyle = 'rgba(255,255,255,.22)'; x.fillRect(-s, -s, s * 2, s * .82);
  } else if (k === 1) {                            // BAR sur plaque bleu nuit
    const w = s * 1.12, h = s * .5;
    x.fillStyle = 'rgba(11,27,46,.25)'; x.beginPath(); x.roundRect(-w / 2 + 4, -h / 2 + 6, w, h, h * .22); x.fill();
    const g = x.createLinearGradient(0, -h / 2, 0, h / 2); g.addColorStop(0, '#24456F'); g.addColorStop(1, '#0B1B2E');
    x.fillStyle = g; x.beginPath(); x.roundRect(-w / 2, -h / 2, w, h, h * .22); x.fill();
    const gs = x.createLinearGradient(0, -h / 2, 0, h / 2); gs.addColorStop(0, '#FFE69A'); gs.addColorStop(1, '#A87414');
    x.lineWidth = s * .045; x.strokeStyle = gs; x.stroke();
    x.font = `800 ${s * .34}px Archivo, Arial`; x.fontStretch = 'expanded'; x.textAlign = 'center'; x.textBaseline = 'middle';
    x.fillStyle = '#F5F1EA'; x.fillText('BAR', 0, s * .02);
  } else if (k === 2) {                            // cloche dorée
    x.translate(0, -s * .04);
    x.fillStyle = '#8A5E10'; x.beginPath(); x.arc(0, s * .36, s * .085, 0, TAU); x.fill();
    const g = x.createRadialGradient(-s * .15, -s * .2, s * .02, 0, 0, s * .6);
    g.addColorStop(0, '#FFF2C4'); g.addColorStop(.35, '#F9C83B'); g.addColorStop(1, '#9C6A0E');
    x.fillStyle = g; x.strokeStyle = '#7A520C'; x.lineWidth = s * .03;
    x.beginPath(); x.moveTo(-s * .06, -s * .42);
    x.bezierCurveTo(-s * .34, -s * .4, -s * .3, s * .02, -s * .38, s * .2);
    x.quadraticCurveTo(-s * .44, s * .3, -s * .5, s * .32); x.lineTo(s * .5, s * .32);
    x.quadraticCurveTo(s * .44, s * .3, s * .38, s * .2);
    x.bezierCurveTo(s * .3, s * .02, s * .34, -s * .4, s * .06, -s * .42); x.closePath(); x.fill(); x.stroke();
    x.beginPath(); x.arc(0, -s * .46, s * .07, 0, TAU); x.fill(); x.stroke();
    x.strokeStyle = 'rgba(122,82,12,.7)'; x.lineWidth = s * .035; x.beginPath(); x.moveTo(-s * .4, s * .22); x.quadraticCurveTo(0, s * .27, s * .4, s * .22); x.stroke();
    x.fillStyle = 'rgba(255,255,255,.55)'; x.beginPath(); x.ellipse(-s * .16, -s * .12, s * .05, s * .2, .25, 0, TAU); x.fill();
  } else if (k === 3) {                            // diamant taillé
    const f = (pts, c) => { x.fillStyle = c; x.beginPath(); pts.forEach(([a, b], i) => i ? x.lineTo(a * s, b * s) : x.moveTo(a * s, b * s)); x.closePath(); x.fill(); };
    const A = [-.5, -.1], B = [-.28, -.4], Cc = [.28, -.4], D = [.5, -.1], E = [0, .5], m1 = [-.12, -.1], m2 = [.12, -.1], t = [0, -.4];
    f([A, B, m1], '#5B84B8'); f([B, t, m1], '#D6E2EF'); f([t, Cc, m2], '#9DB4D0'); f([t, m1, m2], '#EAF1F8'); f([Cc, D, m2], '#335F94');
    f([A, m1, E], '#24456F'); f([m1, m2, E], '#7FA0C7'); f([m2, D, E], '#1A3456');
    x.strokeStyle = 'rgba(11,27,46,.55)'; x.lineWidth = s * .02; x.beginPath(); [A, B, Cc, D, E].forEach(([a, b], i) => i ? x.lineTo(a * s, b * s) : x.moveTo(a * s, b * s)); x.closePath(); x.stroke();
    x.fillStyle = '#fff'; x.beginPath(); const sx = -s * .14, sy = -s * .26, r = s * .1;
    x.moveTo(sx, sy - r); x.quadraticCurveTo(sx, sy, sx + r, sy); x.quadraticCurveTo(sx, sy, sx, sy + r); x.quadraticCurveTo(sx, sy, sx - r, sy); x.quadraticCurveTo(sx, sy, sx, sy - r); x.fill();
  } else {                                         // jeton vu de dessus
    const r = s * .46;
    x.fillStyle = 'rgba(11,27,46,.25)'; x.beginPath(); x.arc(4, 6, r, 0, TAU); x.fill();
    const g = x.createRadialGradient(-r * .3, -r * .3, r * .1, 0, 0, r); g.addColorStop(0, '#D8404F'); g.addColorStop(1, '#8E1A29');
    x.fillStyle = g; x.beginPath(); x.arc(0, 0, r, 0, TAU); x.fill();
    x.fillStyle = '#F5F1EA';
    for (let i = 0; i < 8; i++) { const a = i * TAU / 8; x.beginPath(); x.arc(0, 0, r, a - .17, a + .17); x.arc(0, 0, r * .74, a + .2, a - .2, true); x.fill(); }
    x.strokeStyle = '#F5F1EA'; x.lineWidth = s * .025; x.setLineDash([s * .04, s * .03]); x.beginPath(); x.arc(0, 0, r * .62, 0, TAU); x.stroke(); x.setLineDash([]);
    x.fillStyle = '#F9C83B'; x.beginPath(); x.arc(0, 0, r * .3, 0, TAU); x.fill();
  }
  x.restore();
}

function stripCanvas(order) {
  const [c, x] = canvas(CW, CH * CELLS);
  const bg = x.createLinearGradient(0, 0, CW, 0);
  bg.addColorStop(0, '#E4DDD0'); bg.addColorStop(.18, '#F7F3EC'); bg.addColorStop(.82, '#F7F3EC'); bg.addColorStop(1, '#E4DDD0');
  x.fillStyle = bg; x.fillRect(0, 0, CW, CH * CELLS);
  const rnd = rand(order[0] * 97 + 13);
  for (let i = 0; i < 2600; i++) { x.fillStyle = `rgba(80,60,30,${rnd() * .035})`; x.fillRect(rnd() * CW, rnd() * CH * CELLS, 1.5, 1.5); }
  order.forEach((k, i) => {
    x.fillStyle = 'rgba(11,27,46,.08)'; x.fillRect(0, i * CH, CW, 2);
    x.save(); x.translate(CW / 2, i * CH + CH / 2); drawSymbol(x, k, CH * .66); x.restore();
  });
  return c;
}

/* ---------------- jetons : face et tranche ---------------- */
function chipTextures(base, insert, accent) {
  const [t, x] = canvas(512, 512), r = 256;
  x.translate(r, r);
  const g = x.createRadialGradient(0, 0, 0, 0, 0, r); g.addColorStop(0, base); g.addColorStop(1, base);
  x.fillStyle = base; x.beginPath(); x.arc(0, 0, r, 0, TAU); x.fill();
  x.fillStyle = insert;                                        // inserts du liseré
  for (let i = 0; i < 8; i++) { const a = i * TAU / 8; x.beginPath(); x.arc(0, 0, r, a - .15, a + .15); x.arc(0, 0, r * .8, a + .18, a - .18, true); x.closePath(); x.fill(); }
  x.strokeStyle = insert; x.lineWidth = 5;                     // filet
  x.beginPath(); x.arc(0, 0, r * .72, 0, TAU); x.stroke();
  x.setLineDash([10, 9]); x.lineWidth = 7; x.strokeStyle = accent; x.beginPath(); x.arc(0, 0, r * .655, 0, TAU); x.stroke(); x.setLineDash([]);
  const gi = x.createRadialGradient(-r * .15, -r * .15, 0, 0, 0, r * .6);  // inlay central
  gi.addColorStop(0, '#FFFDF8'); gi.addColorStop(1, '#E7DFD0');
  x.fillStyle = gi; x.beginPath(); x.arc(0, 0, r * .58, 0, TAU); x.fill();
  x.strokeStyle = base; x.lineWidth = 6; x.beginPath(); x.arc(0, 0, r * .5, 0, TAU); x.stroke();
  x.lineWidth = 2; x.beginPath(); x.arc(0, 0, r * .46, 0, TAU); x.stroke();
  x.fillStyle = base;                                          // emblème : étoile à quatre branches
  x.beginPath(); for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4 - Math.PI / 2, rr = i % 2 ? r * .08 : r * .28; x.lineTo(Math.cos(a) * rr, Math.sin(a) * rr); } x.closePath(); x.fill();
  x.fillStyle = accent; x.beginPath(); x.arc(0, 0, r * .05, 0, TAU); x.fill();
  const rnd = rand(base.length * 131 + insert.charCodeAt(1));
  for (let i = 0; i < 5000; i++) { const a = rnd() * TAU, d = Math.sqrt(rnd()) * r; x.fillStyle = `rgba(${rnd() < .5 ? '255,255,255' : '0,0,0'},${rnd() * .06})`; x.fillRect(Math.cos(a) * d, Math.sin(a) * d, 2, 2); }
  const [s, y] = canvas(1024, 32);
  y.fillStyle = base; y.fillRect(0, 0, 1024, 32);
  y.fillStyle = insert;
  for (let i = 0; i < 8; i++) { const u = i / 8 * 1024, w = .3 / TAU * 1024; y.fillRect(u - w / 2, 0, w, 32); if (i === 0) y.fillRect(1024 - w / 2, 0, w, 32); }
  y.fillStyle = 'rgba(0,0,0,.18)'; y.fillRect(0, 0, 1024, 3); y.fillRect(0, 29, 1024, 3);
  for (let i = 0; i < 1024; i += 4) { y.fillStyle = `rgba(0,0,0,${.03 + (i % 8 ? 0 : .03)})`; y.fillRect(i, 0, 1, 32); }
  return [t, s];
}

/* ---------------- géométries ---------------- */
function rrPath(P, w, h, r, cx = 0, cy = 0) {
  const s = new P(), x = cx - w / 2, y = cy - h / 2;
  s.moveTo(x + r, y); s.lineTo(x + w - r, y); s.quadraticCurveTo(x + w, y, x + w, y + r);
  s.lineTo(x + w, y + h - r); s.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  s.lineTo(x + r, y + h); s.quadraticCurveTo(x, y + h, x, y + h - r);
  s.lineTo(x, y + r); s.quadraticCurveTo(x, y, x + r, y);
  return s;
}
function reelGeo(R, W, seg = 120) {
  const pos = [], nor = [], uv = [], idx = [];
  for (let i = 0; i <= seg; i++) {
    const a = i / seg * TAU, sy = Math.sin(a), cz = Math.cos(a);
    for (const s of [0, 1]) { pos.push((s - .5) * W, sy * R, cz * R); nor.push(0, sy, cz); uv.push(s, a / TAU); }
  }
  for (let i = 0; i < seg; i++) { const a = i * 2; idx.push(a, a + 1, a + 3, a, a + 3, a + 2); }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx); return g;
}

/* ---------------- mouvement des rouleaux ---------------- */
const ORDER = [0, 1, 3, 2, 4];
const winSym = c => ORDER[((c % 5) + 5) % 5];
const cellAngle = (r, k) => TAU * (1 - (STRIPS[r].indexOf(k) + .5) / CELLS);
const INIT = [cellAngle(0, 3) + .3, cellAngle(1, 4) - .25, cellAngle(2, 1) + .2];
const K = [4, 5, 6];
const stopAngle = (r, c) => c < 0 ? -TAU * K[r] + INIT[r] : TAU * K[r] * c + cellAngle(r, winSym(c));
const START = [.18, .24, .3], STOP = [1.5, 1.92, 2.34];
const VEND = 2.6, BW = 26, BK = 11, TA = .3, TB = .32;
function reelAngle(r, c, u) {
  const a0 = stopAngle(r, c - 1), a1 = stopAngle(r, c), D = a1 - a0, s = START[r], e = STOP[r], T = e - s;
  if (u < s) {                                     // anticipation : léger recul avant le départ
    const k = clamp((u - (s - .2)) / .2);
    return a0 - .07 * Math.sin(Math.PI * k);
  }
  const vmax = (D - VEND * TB / 2) / (TA / 2 + (T - TA - TB) + TB / 2);
  const t = u - s;
  if (t < TA) return a0 + vmax * t * t / (2 * TA);
  if (t < T - TB) return a0 + vmax * TA / 2 + vmax * (t - TA);
  if (t < T) { const q = t - (T - TB); return a0 + vmax * TA / 2 + vmax * (T - TA - TB) + vmax * q - (vmax - VEND) * q * q / (2 * TB); }
  const q = t - T;                                 // arrêt : dépassement puis retour, ressort amorti
  return a1 + VEND / BW * Math.exp(-BK * q) * Math.sin(BW * q);
}

/* ---------------- montage ---------------- */
export function mount(layer, { reduceMotion }) {
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
  renderer.setClearColor(0x000000, 0);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.05;
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  layer.appendChild(renderer.domElement);
  const aniso = Math.min(8, renderer.capabilities.getMaxAnisotropy());

  const scene = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  const envRT = pmrem.fromScene(new RoomEnvironment(), .04);
  scene.environment = envRT.texture; scene.environmentIntensity = .55;
  pmrem.dispose();

  const camera = new THREE.PerspectiveCamera(30, 1, .1, 60);
  const tex = (c, srgb = true) => { const t = new THREE.CanvasTexture(c); if (srgb) t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = aniso; return t; };

  /* matériaux */
  const lacquer = new THREE.MeshPhysicalMaterial({ color: 0x0f2238, roughness: .38, metalness: .1, clearcoat: 1, clearcoatRoughness: .08 });
  const lacquerSide = new THREE.MeshPhysicalMaterial({ color: 0x0c1c30, roughness: .45, metalness: .1, clearcoat: .8, clearcoatRoughness: .12 });
  const brass = new THREE.MeshPhysicalMaterial({ color: 0xd2a65a, metalness: 1, roughness: .24, envMapIntensity: 1.3 });
  const chrome = new THREE.MeshStandardMaterial({ color: 0xc8d0da, metalness: 1, roughness: .16, envMapIntensity: 1.2 });
  const darkChrome = new THREE.MeshStandardMaterial({ color: 0x4a5566, metalness: 1, roughness: .3 });
  const cavity = new THREE.MeshBasicMaterial({ color: 0x03070d });
  const deckMat = new THREE.MeshPhysicalMaterial({ color: 0x08111e, roughness: .5, metalness: .05, clearcoat: .7, clearcoatRoughness: .18, envMapIntensity: .35 });

  const machine = new THREE.Group(); scene.add(machine);
  const WY = .1, WW = 2.3, WH = 1.36;                       // fenêtre des rouleaux

  // façade laquée percée de la fenêtre
  const front = rrPath(THREE.Shape, 3.5, 7, .28, 0, .1);
  front.holes.push(rrPath(THREE.Path, WW, WH, .1, 0, WY));
  const panel = new THREE.Mesh(new THREE.ExtrudeGeometry(front, { depth: .1, bevelEnabled: true, bevelThickness: .025, bevelSize: .02, bevelSegments: 3, curveSegments: 16 }), lacquer);
  panel.position.z = .02; panel.receiveShadow = true; machine.add(panel);
  // caisson
  for (const sx of [-1, 1]) { const sp = new THREE.Mesh(new THREE.BoxGeometry(.12, 7, 2.1), lacquerSide); sp.position.set(sx * 1.67, .1, -1.03); machine.add(sp); }
  const backP = new THREE.Mesh(new THREE.BoxGeometry(3.46, 7, .1), lacquerSide); backP.position.set(0, .1, -2.1); machine.add(backP);
  // cadre laiton
  const bez = rrPath(THREE.Shape, 2.6, 1.66, .2, 0, WY); bez.holes.push(rrPath(THREE.Path, WW + .02, WH + .02, .11, 0, WY));
  const bezel = new THREE.Mesh(new THREE.ExtrudeGeometry(bez, { depth: .025, bevelEnabled: true, bevelThickness: .03, bevelSize: .03, bevelSegments: 5, curveSegments: 24 }), brass);
  bezel.position.z = .175; machine.add(bezel);
  // filet laiton fin et bandeau LED rouge au-dessus
  const trim = new THREE.Mesh(new THREE.BoxGeometry(3.1, .03, .03), brass); trim.position.set(0, 1.3, .17); machine.add(trim);
  const ledRedMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(C.red).multiplyScalar(2.2) });
  const ledRed = new THREE.Mesh(new THREE.BoxGeometry(2.9, .035, .02), ledRedMat); ledRed.position.set(0, 1.42, .15); machine.add(ledRed);
  const ledHalo = new THREE.Mesh(new THREE.PlaneGeometry(3.4, .3), null); ledHalo.position.set(0, 1.42, .17); machine.add(ledHalo);
  const trim2 = trim.clone(); trim2.position.y = 1.54; machine.add(trim2);
  // listels LED verticaux sur les arêtes de la façade
  const edgeMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(C.blue).multiplyScalar(2) });
  for (const sx of [-1, 1]) {
    const e = new THREE.Mesh(new THREE.BoxGeometry(.03, 6, .03), edgeMat); e.position.set(sx * 1.66, .6, .15); machine.add(e);
    const b = new THREE.Mesh(new THREE.CylinderGeometry(.03, .03, 7, 16), brass); b.position.set(sx * 1.75, .1, .07); machine.add(b);
  }
  // fond de la cavité + séparateurs chromés
  const back = new THREE.Mesh(new THREE.PlaneGeometry(WW + .2, WH + .2), cavity); back.position.set(0, WY, -.45); machine.add(back);
  for (const sx of [-.37, .37]) { const d = new THREE.Mesh(new THREE.BoxGeometry(.035, WH + .1, .06), darkChrome); d.position.set(sx, WY, -.02); machine.add(d); }

  // rouleaux
  const R = .95, RW = .66, reels = [], stripTex = [];
  const reelG = reelGeo(R, RW);
  for (let r = 0; r < 3; r++) {
    const t = tex(stripCanvas(STRIPS[r])); t.wrapT = THREE.RepeatWrapping; stripTex.push(t);
    const blur = { value: 0 };
    const m = new THREE.MeshStandardMaterial({ map: t, roughness: .42, metalness: 0, envMapIntensity: .6 });
    m.onBeforeCompile = sh => {
      sh.uniforms.uBlur = blur;
      sh.fragmentShader = 'uniform float uBlur;\n' + sh.fragmentShader.replace('#include <map_fragment>', `
        vec4 sampledDiffuseColor = vec4(0.0);
        if (uBlur < 0.002) sampledDiffuseColor = texture2D(map, vMapUv);
        else { for (int k = 0; k < 11; k++) { float o = (float(k) / 10.0 - 0.5) * uBlur; sampledDiffuseColor += texture2D(map, vMapUv + vec2(0.0, o)); } sampledDiffuseColor /= 11.0; }
        diffuseColor *= sampledDiffuseColor;`);
    };
    const mesh = new THREE.Mesh(reelG, m); mesh.position.set((r - 1) * .74, WY, -R); machine.add(mesh);
    const capM = new THREE.MeshStandardMaterial({ color: 0x1b2a3c, metalness: .6, roughness: .4 });
    for (const sx of [-1, 1]) { const cap = new THREE.Mesh(new THREE.CircleGeometry(R, 64), capM); cap.rotation.y = sx * Math.PI / 2; cap.position.set(sx * RW / 2, 0, 0); mesh.add(cap); }
    reels.push({ mesh, blur, last: 0 });
  }
  // ombres internes haut/bas de la fenêtre
  const [gc, gx] = canvas(4, 256); const gg = gx.createLinearGradient(0, 0, 0, 256);
  gg.addColorStop(0, 'rgba(3,8,15,.95)'); gg.addColorStop(.45, 'rgba(3,8,15,.45)'); gg.addColorStop(1, 'rgba(3,8,15,0)'); gx.fillStyle = gg; gx.fillRect(0, 0, 4, 256);
  const shadeT = tex(gc);
  for (const sy of [1, -1]) {
    const p = new THREE.Mesh(new THREE.PlaneGeometry(WW + .05, .5), new THREE.MeshBasicMaterial({ map: shadeT, transparent: true, depthWrite: false }));
    p.position.set(0, WY + sy * (WH / 2 - .24), .05); if (sy < 0) p.rotation.z = Math.PI; p.renderOrder = 2; machine.add(p);
  }

  // halo générique
  const [hc, hx] = canvas(128, 128); const hg = hx.createRadialGradient(64, 64, 0, 64, 64, 64);
  hg.addColorStop(0, 'rgba(255,255,255,1)'); hg.addColorStop(.2, 'rgba(255,255,255,.45)'); hg.addColorStop(.5, 'rgba(255,255,255,.1)'); hg.addColorStop(1, 'rgba(255,255,255,0)');
  hx.fillStyle = hg; hx.fillRect(0, 0, 128, 128); const haloT = tex(hc);
  const additive = (color, opacity = 1) => new THREE.MeshBasicMaterial({ map: haloT, color, transparent: true, opacity, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false });

  ledHalo.material = additive(new THREE.Color(C.red), .55); ledHalo.renderOrder = 4;
  // ligne gagnante
  const yellow = new THREE.Color(C.yellow);
  const lineMat = new THREE.MeshBasicMaterial({ color: yellow.clone(), toneMapped: false });
  const payline = new THREE.Mesh(new THREE.BoxGeometry(WW - .04, .014, .01), lineMat); payline.position.set(0, WY, .06); payline.renderOrder = 3; machine.add(payline);
  const lineGlow = new THREE.Mesh(new THREE.PlaneGeometry(WW + .6, .5), additive(yellow, 0)); lineGlow.position.set(0, WY, .07); lineGlow.renderOrder = 4; machine.add(lineGlow);
  const rowGlow = new THREE.Mesh(new THREE.PlaneGeometry(WW - .05, .62), new THREE.MeshBasicMaterial({ color: yellow, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false })); rowGlow.position.set(0, WY, .055); rowGlow.renderOrder = 3; machine.add(rowGlow);
  const arrowG = new THREE.ExtrudeGeometry((() => { const s = new THREE.Shape(); s.moveTo(0, -.07); s.lineTo(.11, 0); s.lineTo(0, .07); s.closePath(); return s; })(), { depth: .02, bevelEnabled: true, bevelThickness: .01, bevelSize: .008, bevelSegments: 2 });
  const arrowMat = new THREE.MeshStandardMaterial({ color: 0x3a2a08, emissive: yellow.clone(), emissiveIntensity: .4, roughness: .3, metalness: .4 });
  for (const sx of [-1, 1]) { const a = new THREE.Mesh(arrowG, arrowMat); a.position.set(sx * 1.235, WY, .23); a.rotation.z = sx > 0 ? Math.PI : 0; machine.add(a); }
  // cadres lumineux autour des symboles gagnants
  const [fc, fx] = canvas(256, 232);
  fx.shadowColor = 'rgba(255,220,120,1)'; fx.shadowBlur = 18; fx.strokeStyle = 'rgba(255,236,170,1)'; fx.lineWidth = 7;
  fx.beginPath(); fx.roundRect(22, 22, 212, 188, 22); fx.stroke(); fx.stroke();
  const frameT = tex(fc);
  const frames = [-1, 0, 1].map(i => { const f = new THREE.Mesh(new THREE.PlaneGeometry(.66, .6), new THREE.MeshBasicMaterial({ map: frameT, color: yellow, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false })); f.position.set(i * .74, WY, .065); f.renderOrder = 4; machine.add(f); return f; });
  // reflet de vitre
  const [sc, sx2] = canvas(256, 256);
  const sg = sx2.createLinearGradient(0, 0, 256, 0); sg.addColorStop(0, 'rgba(255,255,255,0)'); sg.addColorStop(.42, 'rgba(255,255,255,.0)'); sg.addColorStop(.5, 'rgba(255,255,255,.9)'); sg.addColorStop(.56, 'rgba(255,255,255,.15)'); sg.addColorStop(.66, 'rgba(255,255,255,.35)'); sg.addColorStop(.7, 'rgba(255,255,255,0)');
  sx2.fillStyle = sg; sx2.fillRect(0, 0, 256, 256);
  const glintT = tex(sc); glintT.wrapS = THREE.ClampToEdgeWrapping;
  const glint = new THREE.Mesh(new THREE.PlaneGeometry(WW, WH), new THREE.MeshBasicMaterial({ map: glintT, transparent: true, opacity: .08, blending: THREE.AdditiveBlending, depthWrite: false }));
  glint.position.set(0, WY, .12); glint.renderOrder = 5; machine.add(glint);
  const glass = new THREE.Mesh(new THREE.PlaneGeometry(WW, WH), new THREE.MeshPhysicalMaterial({ color: 0x000000, roughness: .04, metalness: 0, transparent: true, opacity: .12, depthWrite: false, envMapIntensity: 1.6 }));
  glass.position.set(0, WY, .115); glass.renderOrder = 5; machine.add(glass);

  // ampoules chenillard autour du cadre
  const ringPts = rrPath(THREE.Shape, 2.92, 1.98, .34, 0, WY).getSpacedPoints(34).slice(0, 34);
  const bulbG = new THREE.SphereGeometry(.042, 20, 14);
  const bulbs = new THREE.InstancedMesh(bulbG, new THREE.MeshBasicMaterial({ color: 0xffffff, toneMapped: false }), ringPts.length);
  const socketG = new THREE.CylinderGeometry(.06, .07, .03, 24); socketG.rotateX(Math.PI / 2);
  const sockets = new THREE.InstancedMesh(socketG, brass, ringPts.length);
  const glowPos = new Float32Array(ringPts.length * 3), glowCol = new Float32Array(ringPts.length * 3);
  const dummy = new THREE.Object3D();
  ringPts.forEach((p, i) => {
    dummy.position.set(p.x, p.y, .2); dummy.updateMatrix(); bulbs.setMatrixAt(i, dummy.matrix);
    dummy.position.z = .17; dummy.updateMatrix(); sockets.setMatrixAt(i, dummy.matrix);
    glowPos.set([p.x, p.y, .24], i * 3);
  });
  bulbs.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(ringPts.length * 3), 3);
  machine.add(sockets, bulbs);
  const glowGeo = new THREE.BufferGeometry();
  glowGeo.setAttribute('position', new THREE.BufferAttribute(glowPos, 3));
  glowGeo.setAttribute('color', new THREE.BufferAttribute(glowCol, 3));
  const glows = new THREE.Points(glowGeo, new THREE.PointsMaterial({ map: haloT, size: .62, vertexColors: true, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false }));
  glows.renderOrder = 6; machine.add(glows);

  // console avant
  const DY = -1.05, DZ = 1.35;
  const prof = new THREE.Shape(); prof.moveTo(0, -3.2); prof.lineTo(0, DY); prof.lineTo(DZ - .14, DY); prof.quadraticCurveTo(DZ, DY, DZ, DY - .14); prof.lineTo(DZ, -3.2); prof.closePath();
  const deckG = new THREE.ExtrudeGeometry(prof, { depth: 3.5, bevelEnabled: false, curveSegments: 12 }); deckG.rotateY(-Math.PI / 2); deckG.translate(1.75, 0, 0);
  const deck = new THREE.Mesh(deckG, deckMat); deck.receiveShadow = true; machine.add(deck);
  const rail = new THREE.Mesh(new THREE.CylinderGeometry(.028, .028, 3.5, 20), brass); rail.rotation.z = Math.PI / 2; rail.position.set(0, DY - .2, DZ + .02); machine.add(rail);
  const rail2 = rail.clone(); rail2.position.set(0, DY + .006, .1); rail2.scale.set(.7, 1, .7); machine.add(rail2);
  // boutons
  const btnShape = rrPath(THREE.Shape, .36, .2, .07);
  const btnG = new THREE.ExtrudeGeometry(btnShape, { depth: .03, bevelEnabled: true, bevelThickness: .025, bevelSize: .02, bevelSegments: 4, curveSegments: 10 }); btnG.rotateX(-Math.PI / 2);
  const ringG = new THREE.ExtrudeGeometry(rrPath(THREE.Shape, .44, .28, .1), { depth: .015, bevelEnabled: true, bevelThickness: .01, bevelSize: .01, bevelSegments: 2 }); ringG.rotateX(-Math.PI / 2);
  const buttons = [C.red, C.yellow, C.paper, C.mist, C.blue].map((col, i) => {
    const m = new THREE.MeshPhysicalMaterial({ color: new THREE.Color(col).multiplyScalar(.55), emissive: new THREE.Color(col), emissiveIntensity: .35, roughness: .15, clearcoat: 1 });
    const b = new THREE.Mesh(btnG, m); const x = -1.25 + i * .5;
    b.position.set(x, DY + .02, .38); b.castShadow = true; machine.add(b);
    const rg = new THREE.Mesh(ringG, chrome); rg.position.set(x, DY, .38); rg.receiveShadow = true; machine.add(rg);
    return m;
  });

  // jetons
  const CHIP_R = .19, CHIP_H = .036;
  const chipG = new THREE.CylinderGeometry(CHIP_R, CHIP_R, CHIP_H, 56, 1);
  const chipMats = [[C.red, C.paper, C.yellow], [C.blue, C.paper, C.yellow], [C.yellow, C.navy, C.red], [C.paper, C.blue, C.red], [C.navy, C.yellow, C.mist]].map(([b, i, a]) => {
    const [top, side] = chipTextures(b, i, a);
    const tt = tex(top), st = tex(side);
    const face = new THREE.MeshStandardMaterial({ map: tt, roughness: .36 });
    return [new THREE.MeshStandardMaterial({ map: st, roughness: .5 }), face, face];
  });
  const chips = [];
  const addChip = (v, x, y, z, ry, tilt = 0) => { const m = new THREE.Mesh(chipG, chipMats[v]); m.castShadow = m.receiveShadow = true; m.position.set(x, y, z); m.rotation.set(tilt, ry, 0); machine.add(m); chips.push(m); return m; };
  const rs = rand(7);
  const stacks = [[1, 1.32, .58, 13], [0, .98, .98, 7], [3, 1.48, 1.0, 4]];
  // piles fixes : une instanciation par couleur (peu d'appels de dessin)
  const fixed = [...stacks.flatMap(([v, x, z, n]) => Array.from({ length: n }, (_, i) => [v, x + (rs() - .5) * .018, DY + CHIP_H * (i + .5), z + (rs() - .5) * .018, rs() * TAU])), [2, .78, DY + CHIP_H / 2, .6, .4]];
  chipMats.forEach((mat, v) => {
    const list = fixed.filter(f => f[0] === v); if (!list.length) return;
    const im = new THREE.InstancedMesh(chipG, mat, list.length); im.castShadow = im.receiveShadow = true;
    list.forEach(([, x, y, z, ry], i) => { dummy.position.set(x, y, z); dummy.rotation.set(0, ry, 0); dummy.updateMatrix(); im.setMatrixAt(i, dummy.matrix); });
    machine.add(im);
  });
  dummy.rotation.set(0, 0, 0);
  // pile des gains : tombe puis glisse vers le joueur
  const PAY = { x: .5, z: 1.02 }, payVar = [0, 0, 2, 0, 0, 3, 0, 0, 2, 0, 0];
  const pay = payVar.map((v, i) => { const r0 = rand(31 + i * 17); r0(); return { m: addChip(v, 0, 0, 0, 0), t0: 2.42 + i * .1, dx: (r0() - .5) * .025, dz: (r0() - .5) * .025, ry: r0() * TAU, tx: (r0() - .5) * 1.6, tz: (r0() - .5) * 1.6, sx: (r0() - .5) * .5 }; });

  // éclairage studio
  const key = new THREE.DirectionalLight(0xfff1dc, 2.6); key.position.set(3.5, 5.5, 6); key.target.position.set(.3, -1, .5);
  key.castShadow = true; key.shadow.mapSize.set(1024, 1024); key.shadow.bias = -.0004; key.shadow.normalBias = .02; key.shadow.radius = 4;
  Object.assign(key.shadow.camera, { left: -2.2, right: 2.2, top: 2.2, bottom: -2.2, near: 2, far: 16 });
  scene.add(key, key.target);
  const rim = new THREE.DirectionalLight(0x9db4d0, 2.2); rim.position.set(-5, 2.5, -2); scene.add(rim);
  const fill = new THREE.DirectionalLight(0x335f94, 1.2); fill.position.set(-3, -1, 5); scene.add(fill);
  const reelLight = new THREE.SpotLight(0xfff4e0, 7, 4.5, .8, .9, 1.4); reelLight.position.set(0, WY + 1.6, 1.6); reelLight.target.position.set(0, WY - .2, -.1); scene.add(reelLight, reelLight.target);
  const winLight = new THREE.PointLight(0xf9c83b, 0, 4, 1.6); winLight.position.set(.2, WY, .9); scene.add(winLight);

  /* cadrage : tout le plan tient dans le carré comme dans le 4:3 */
  let w = 1, h = 1, pr = Math.min(devicePixelRatio || 1, 2), slow = 0, nF = 0;
  const camBase = new THREE.Vector3(1.5, 1.25, 6.5), camTarget = new THREE.Vector3(.16, -.26, .2);
  const lookAt = new THREE.Vector3();
  const resize = () => {
    w = Math.max(1, layer.clientWidth); h = Math.max(1, layer.clientHeight);
    renderer.setPixelRatio(pr); renderer.setSize(w, h, false);
    const a = w / h, vfov = 30;
    camera.fov = a >= 1 ? vfov / Math.min(1.12, Math.pow(a, .4)) : 2 * Math.atan(Math.tan(vfov * Math.PI / 360) / a) * 180 / Math.PI;
    camera.aspect = a; camera.updateProjectionMatrix();
  };

  /* image à l'instant u du cycle c */
  const bulbCol = new THREE.Color(), warm = new THREE.Color(1, .82, .55), gold = new THREE.Color(1.6, 1.15, .3), redC = new THREE.Color(C.red);
  const edgeBlue = new THREE.Color(C.blue).multiplyScalar(2), edgeGold = new THREE.Color(C.yellow).multiplyScalar(2.2);
  let mx = 0, my = 0, tmx = 0, tmy = 0;
  const draw = (c, u, dt) => {
    // rouleaux
    let shake = 0;
    reels.forEach((rl, r) => {
      const a = reelAngle(r, c, u);
      const v = dt > 0 ? (reelAngle(r, c, u + 1 / 240) - a) * 240 : 0;
      rl.mesh.rotation.x = a;
      rl.blur.value = Math.min(.05, Math.abs(v) / TAU * (1 / 90));
      const q = u - STOP[r]; if (q > 0 && q < .25) shake += Math.exp(-q * 22) * Math.sin(q * 90) * .006;
    });
    // gain
    const W = smooth(2.42, 2.62, u) * (1 - smooth(4.75, 5.15, u));
    const flash = W * (.55 + .45 * Math.cos((u - 2.45) * TAU * 2.2));
    lineMat.color.copy(yellow).multiplyScalar(.7 + 2.6 * W * (.6 + .4 * flash));
    lineGlow.material.opacity = .12 + .75 * W * (.5 + .5 * flash);
    rowGlow.material.opacity = .09 * flash;
    frames.forEach((f, i) => { const k = smooth(2.42 + i * .07, 2.6 + i * .07, u) * (1 - smooth(4.75, 5.15, u)); f.material.opacity = k * (.75 + .6 * flash); f.scale.setScalar(1 + .04 * (1 - smooth(2.42 + i * .07, 2.8 + i * .07, u))); });
    arrowMat.emissiveIntensity = .5 + 3 * W * flash;
    winLight.intensity = 9 * W * (.5 + .5 * flash);
    edgeMat.color.copy(edgeBlue).lerp(edgeGold, W);
    ledRedMat.color.copy(redC).multiplyScalar(1.6 + 1.6 * W * flash);
    buttons.forEach((m, i) => { m.emissiveIntensity = .3 + .5 * Math.max(0, Math.sin(u * 3 - i * .9)) * (1 - W) + W * 1.2 * (.5 + .5 * Math.sin(u * 14 + i)); });
    // chenillard : lent pendant la rotation, rapide et doré pendant le gain
    const n = ringPts.length, speed = 9 + W * 22;
    for (let i = 0; i < n; i++) {
      const ph = ((i - (c * P + u) * speed) % 3 + 3) % 3;
      const on = ph < 1 ? 1 : .18;
      bulbCol.copy(warm).lerp(gold, W).multiplyScalar(.35 + on * (1.4 + 1.2 * W));
      bulbs.setColorAt(i, bulbCol);
      glowCol[i * 3] = bulbCol.r * .5 * on; glowCol[i * 3 + 1] = bulbCol.g * .5 * on; glowCol[i * 3 + 2] = bulbCol.b * .5 * on;
    }
    bulbs.instanceColor.needsUpdate = true; glowGeo.attributes.color.needsUpdate = true;
    // reflet balayant la vitre au moment du gain
    const sw = smooth(2.4, 3.3, u);
    glintT.offset.x = .55 - sw * 1.1 - mx * .15; glint.material.opacity = .05 + .12 * Math.sin(Math.PI * sw);
    // jetons des gains : chute, petit rebond, puis glissement vers l'avant
    const out = smooth(4.5, 5.15, u), G = 24;
    pay.forEach((p, i) => {
      const yl = DY + CHIP_H * (i + .5), y0 = 2.3, tf = Math.sqrt(2 * (y0 - yl) / G), q = u - p.t0, m = p.m;
      if (q < 0) { m.visible = false; return; }
      m.visible = true;
      let x = PAY.x + p.dx, z = PAY.z + p.dz, y, rx = 0, rz = 0, ry = p.ry;
      if (q < tf) {
        const k = q / tf; y = y0 - .5 * G * q * q;
        rx = p.tx * (1 - k); rz = p.tz * (1 - k); ry += p.sx * (1 - k) * 3; x += p.sx * .1 * (1 - k);
      } else {
        const b = q - tf; y = yl + Math.abs(Math.sin(b * 34)) * Math.exp(-b * 26) * .05;
        rx = Math.sin(b * 40) * Math.exp(-b * 18) * .08; rz = Math.cos(b * 37) * Math.exp(-b * 18) * .06;
      }
      x -= out * 3.2; ry -= out * .6;
      m.position.set(x, y, z); m.rotation.set(rx, ry, rz);
    });
    // caméra : respiration + suivi du pointeur
    mx += (tmx - mx) * .05; my += (tmy - my) * .05;
    const br = Math.sin((c * P + u) * TAU / 10.4);
    camera.position.set(camBase.x + mx * 2.1 + br * .12, camBase.y - my * 1.3 + Math.sin((c * P + u) * .9) * .05 + shake, camBase.z - .18 * (.5 - .5 * Math.cos(u / P * TAU)));
    lookAt.copy(camTarget); lookAt.x += mx * .35; lookAt.y += shake * .5;
    camera.lookAt(lookAt);
    renderer.render(scene, camera);
  };

  let time = 0, raf = 0, on = false, last = 0, paused = true;
  const frame = now => {
    raf = 0;
    const dt = last ? Math.min(.05, (now - last) / 1000) : 0; last = now;
    time += dt;
    // résolution adaptative : si la machine peine, on réduit la densité de pixels (jamais l'inverse)
    if (dt > 0) { nF++; slow += dt > .026 ? 1 : 0; if (nF >= 90) { if (slow > 45 && pr > 1) { pr = Math.max(1, pr - .5); resize(); } nF = slow = 0; } }
    const c = Math.floor(time / P);
    draw(c, time - c * P, dt);
    if (on) raf = requestAnimationFrame(frame);
  };
  const still = () => { tmx = mx = tmy = my = 0; draw(0, 3.95, 0); };
  new ResizeObserver(() => { resize(); if (reduceMotion) still(); else if (!on) draw(Math.floor(time / P), time - Math.floor(time / P) * P, 0); }).observe(layer);
  resize();
  // la police Archivo sert au 7 et au BAR : on redessine les bandes une fois chargée
  document.fonts?.load('800 100px Archivo').then(() => {
    stripTex.forEach((t, r) => { const c2 = stripCanvas(STRIPS[r]); t.image = c2; t.needsUpdate = true; });
    if (reduceMotion) still();
  }).catch(() => {});

  return {
    play() {
      if (reduceMotion) { still(); return; }
      if (paused && time > 0) time = Math.ceil(time / P - 1e-6) * P;   // reprise propre en début de cycle
      paused = false; on = true; last = 0;
      if (!raf) raf = requestAnimationFrame(frame);
    },
    pause() { on = false; paused = true; if (raf) cancelAnimationFrame(raf); raf = 0; },
    pointer(px, py) { tmx = px; tmy = py; }
  };
}
