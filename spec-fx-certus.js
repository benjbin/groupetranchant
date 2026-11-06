/* Groupe Tranchant — scène de la filiale CERTUS (activités spécialisées, accueil).
   Contrat : mount(layer, { reduceMotion }) → { play(), pause(), pointer(mx, my) }.
   Un plan de salle de jeux en 3D (machines, VLT, tables) vu en perspective, sur un sol miroir.
   Des vagues partent du noyau cloud, allument le parc, et chaque terminal renvoie ses données
   vers le noyau le long de faisceaux lumineux. Des tableaux de bord flottants se mettent à jour en direct. */
import * as THREE from 'three';
import { Reflector } from 'three/addons/objects/Reflector.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

const HEX = { navy: '#0B1B2E', blue: '#335F94', mist: '#9DB4D0', yellow: '#F9C83B', red: '#BA2637', paper: '#F5F1EA' };
const PERIOD = 2.6;      // une vague toutes les 2,6 s (deux vagues pendant les 5,2 s d'affichage)
const SPEED = 5.2;       // vitesse de la vague sur le sol (unités / s)
const TRAVEL = 1.05;     // durée de remontée d'un paquet jusqu'au noyau
const CORE = new THREE.Vector3(0, 3.35, 0);
const rand = seed => () => (seed = (seed * 16807) % 2147483647) / 2147483647;
const clamp01 = v => Math.min(1, Math.max(0, v));
const ease = v => 1 - Math.pow(1 - clamp01(v), 3);
const smooth = (a, b, v) => { const k = clamp01((v - a) / (b - a)); return k * k * (3 - 2 * k); };
const modp = (a, p) => ((a % p) + p) % p;

/* ---------- plan de salle : carrousel central, îlots de machines, tables, rangées extérieures ---------- */
function floorPlan() {
  const R = rand(11), M = [];
  const add = (x, z, fx, fz, kind) => M.push({ x, z, rot: Math.atan2(fx, fz), kind, r: Math.hypot(x, z), seed: R() });
  // carrousel autour du noyau
  for (let i = 0; i < 10; i++) { const a = i / 10 * Math.PI * 2; add(Math.cos(a) * 1.25, Math.sin(a) * 1.25, Math.cos(a), Math.sin(a), 0); }
  // six îlots dos à dos
  for (let k = 0; k < 6; k++) {
    const A = k * Math.PI / 3 + Math.PI / 6, cx = Math.cos(A) * 4.1, cz = Math.sin(A) * 4.1, tx = -Math.sin(A), tz = Math.cos(A), rx = Math.cos(A), rz = Math.sin(A);
    for (let j = 0; j < 5; j++) {
      const o = (j - 2) * .4;
      add(cx + tx * o + rx * .2, cz + tz * o + rz * .2, rx, rz, 1);
      add(cx + tx * o - rx * .2, cz + tz * o - rz * .2, -rx, -rz, 1);
    }
  }
  // rangées extérieures tournées vers le centre
  for (let k = 0; k < 8; k++) {
    const A = k * Math.PI / 4 + Math.PI / 8, cx = Math.cos(A) * 7, cz = Math.sin(A) * 7, tx = -Math.sin(A), tz = Math.cos(A);
    for (let j = 0; j < 4; j++) { const o = (j - 1.5) * .4; add(cx + tx * o, cz + tz * o, -Math.cos(A), -Math.sin(A), 2); }
  }
  // tables de jeu entre les îlots
  for (let k = 0; k < 6; k++) { const A = k * Math.PI / 3; add(Math.cos(A) * 2.75, Math.sin(A) * 2.75, 0, 1, 3); }
  M.forEach(m => { m.delay = m.r / SPEED + m.seed * .06; });
  return M;
}

/* ---------- textures procédurales ---------- */
function screenTexture() {
  const c = document.createElement('canvas'); c.width = 64; c.height = 80;
  const x = c.getContext('2d');
  const g = x.createLinearGradient(0, 0, 0, 80); g.addColorStop(0, '#fff'); g.addColorStop(1, '#8a8a8a');
  x.fillStyle = '#2a2a2a'; x.fillRect(0, 0, 64, 80);
  x.fillStyle = g; x.fillRect(3, 3, 58, 46);
  x.fillStyle = 'rgba(0,0,0,.55)'; for (let i = 0; i < 2; i++) x.fillRect(22 + i * 19, 3, 2, 46);
  x.fillStyle = 'rgba(0,0,0,.35)'; for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) { x.beginPath(); x.arc(12 + i * 20, 12 + j * 14, 4, 0, 7); x.fill(); }
  x.fillStyle = '#9a9a9a'; x.fillRect(6, 56, 52, 8); x.fillStyle = '#555'; x.fillRect(6, 68, 24, 6); x.fillRect(34, 68, 24, 6);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}

function feltTexture() {
  const c = document.createElement('canvas'); c.width = c.height = 256; const x = c.getContext('2d');
  const g = x.createRadialGradient(128, 128, 10, 128, 128, 128); g.addColorStop(0, '#d8d8d8'); g.addColorStop(1, '#7a7a7a');
  x.fillStyle = g; x.fillRect(0, 0, 256, 256);
  x.strokeStyle = 'rgba(255,255,255,.9)'; x.lineWidth = 4;
  x.beginPath(); x.arc(128, 128, 92, Math.PI * .15, Math.PI * .85); x.stroke();
  x.beginPath(); x.arc(128, 128, 60, Math.PI * .2, Math.PI * .8); x.stroke();
  for (let i = 0; i < 7; i++) { const a = Math.PI * (.2 + i * .1); x.beginPath(); x.arc(128 + Math.cos(a) * 76, 128 + Math.sin(a) * 76, 7, 0, 7); x.stroke(); }
  x.fillStyle = 'rgba(0,0,0,.45)'; x.fillRect(98, 20, 60, 22);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}

/* ---------- matériaux shader ---------- */
const floorShader = {
  name: 'CertusFloor',
  uniforms: {
    color: { value: null }, tDiffuse: { value: null }, textureMatrix: { value: null },
    uTime: { value: 0 }, uIntro: { value: 0 }, uBg: { value: new THREE.Color(HEX.navy) },
    uMist: { value: new THREE.Color(HEX.mist) }, uYellow: { value: new THREE.Color(HEX.yellow) }, uBlue: { value: new THREE.Color(HEX.blue) }
  },
  vertexShader: /* glsl */`
    uniform mat4 textureMatrix; varying vec4 vUv; varying vec3 vW;
    void main(){ vUv = textureMatrix * vec4(position,1.); vW = (modelMatrix*vec4(position,1.)).xyz; gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.); }`,
  fragmentShader: /* glsl */`
    uniform sampler2D tDiffuse; uniform vec3 color, uBg, uMist, uYellow, uBlue; uniform float uTime, uIntro;
    varying vec4 vUv; varying vec3 vW;
    float gridLine(vec2 p, float w){ vec2 g = abs(fract(p - .5) - .5) / fwidth(p); return 1. - min(min(g.x, g.y) / w, 1.); }
    void main(){
      vec2 uv = vUv.xy / vUv.w;
      float d = length(vW.xz);
      // reflet légèrement flou (sol laqué)
      vec3 refl = vec3(0.);
      float b = .0035;
      refl += texture2D(tDiffuse, uv).rgb * .28;
      refl += texture2D(tDiffuse, uv + vec2(b, 0.)).rgb * .18; refl += texture2D(tDiffuse, uv - vec2(b, 0.)).rgb * .18;
      refl += texture2D(tDiffuse, uv + vec2(0., b * 1.6)).rgb * .18; refl += texture2D(tDiffuse, uv - vec2(0., b * 1.6)).rgb * .18;
      vec3 base = uBg * .55 + uBlue * .018 * smoothstep(9., 0., d);
      // dalles et trame fine
      float g1 = gridLine(vW.xz, 1.2), g2 = gridLine(vW.xz * 4., 1.) * .35;
      // vague : anneau qui part du noyau
      float ph = mod(uTime, ${PERIOD.toFixed(2)}) * ${SPEED.toFixed(2)};
      float ring = exp(-pow((d - ph) * 3.4, 2.)) * smoothstep(9.5, 2., ph) ;
      float wake = smoothstep(ph, ph - 1.6, d) * step(d, ph) * .12 * smoothstep(9.5, 2., ph);
      float reveal = smoothstep(uIntro * 13., uIntro * 13. - 2., d);
      vec3 col = base + refl * .55;
      col += uMist * (g1 * .05 + g2 * .018) * smoothstep(11., 2., d) * reveal;
      col += uYellow * ring * (.12 + g1 * 1.5 + g2 * .35) * reveal;
      col += uYellow * wake * g1 * .35 * reveal;
      // halo sous le noyau
      col += uYellow * .06 * exp(-d * d * .6);
      // fondu vers le fond
      col = mix(col, uBg, smoothstep(6.5, 12., d));
      gl_FragColor = vec4(col, 1.);
    }`
};

const beamVert = /* glsl */`
  attribute float aDelay; attribute float aSeed; varying float vT; varying float vDelay; varying float vSeed;
  void main(){ vT = uv.x; vDelay = aDelay; vSeed = aSeed; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.); }`;
const beamFrag = /* glsl */`
  uniform float uTime, uIntro; uniform vec3 uMist, uYellow, uRed;
  varying float vT; varying float vDelay; varying float vSeed;
  void main(){
    float on = smoothstep(vDelay, vDelay + .4, uIntro);
    float ph = mod(uTime - vDelay, ${PERIOD.toFixed(2)}) / ${TRAVEL.toFixed(2)};
    float head = exp(-pow((vT - ph) * 22., 2.));
    float tail = smoothstep(ph - .22, ph, vT) * step(vT, ph) * step(ph, 1.05);
    float tele = exp(-pow((vT - fract(uTime * (.22 + vSeed * .25) + vSeed * 7.)) * 40., 2.));
    vec3 hot = vSeed > .93 ? uRed * 1.6 : uYellow;
    vec3 c = uMist * (.035 + .03 * vT) + hot * (tail * .55 + head * 2.2) * step(ph, 1.05) + uMist * tele * .7;
    gl_FragColor = vec4(c * on, 1.);
  }`;
const packetVert = /* glsl */`
  attribute vec3 p1; attribute vec3 p2; attribute vec3 p3; attribute float aDelay; attribute float aSeed;
  uniform float uTime, uIntro, uPx, uMode; varying float vA; varying float vHot;
  void main(){
    float k = uMode < .5 ? mod(uTime - aDelay, ${PERIOD.toFixed(2)}) / ${TRAVEL.toFixed(2)} : fract(uTime * (.22 + aSeed * .25) + aSeed * 7.);
    float on = smoothstep(aDelay, aDelay + .4, uIntro);
    float t = clamp(k, 0., 1.), u = 1. - t;
    vec3 p = u*u*u*position + 3.*u*u*t*p1 + 3.*u*t*t*p2 + t*t*t*p3;
    vec4 mv = modelViewMatrix * vec4(p, 1.);
    vA = on * step(k, 1.) * smoothstep(0., .08, k) * (1. - smoothstep(.9, 1., k));
    vHot = aSeed;
    gl_PointSize = (uMode < .5 ? 6.5 : 3.5) * uPx / -mv.z;
    gl_Position = projectionMatrix * mv;
  }`;
const packetFrag = /* glsl */`
  uniform vec3 uColor, uRed; uniform float uMode; varying float vA; varying float vHot;
  void main(){
    float d = length(gl_PointCoord - .5) * 2.;
    float a = exp(-d * d * 5.) * vA;
    vec3 c = (uMode < .5 && vHot > .93) ? uRed * 1.6 : uColor;
    gl_FragColor = vec4(c * a * (uMode < .5 ? 4. : 1.4), 1.);
  }`;

/* ---------- tableaux de bord flottants (canvas 2D en texture) ---------- */
const FONT = 'Archivo, Manrope, system-ui, sans-serif';
const fmt = n => String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
function panelFrame(x, W, H, k) {
  x.clearRect(0, 0, W, H);
  const r = 18 * k;
  x.beginPath(); x.roundRect(2 * k, 2 * k, W - 4 * k, H - 4 * k, r);
  const g = x.createLinearGradient(0, 0, 0, H); g.addColorStop(0, 'rgba(26,48,78,.82)'); g.addColorStop(1, 'rgba(11,27,46,.86)');
  x.fillStyle = g; x.fill();
  x.lineWidth = 1.5 * k; x.strokeStyle = 'rgba(157,180,208,.32)'; x.stroke();
  // reflet de verre en haut
  x.save(); x.clip(); const s = x.createLinearGradient(0, 0, W * .6, H * .7); s.addColorStop(0, 'rgba(245,241,234,.07)'); s.addColorStop(.5, 'rgba(245,241,234,0)'); x.fillStyle = s; x.fillRect(0, 0, W, H); x.restore();
  // coins repères
  x.strokeStyle = 'rgba(249,200,59,.9)'; x.lineWidth = 2.2 * k; const c = 12 * k, m = 9 * k;
  x.beginPath(); x.moveTo(m, m + c); x.lineTo(m, m); x.lineTo(m + c, m); x.moveTo(W - m - c, H - m); x.lineTo(W - m, H - m); x.lineTo(W - m, H - m - c); x.stroke();
}
const liveDot = (x, px, py, k, t) => { x.fillStyle = `rgba(249,200,59,${.5 + .5 * Math.sin(t * 6)})`; x.beginPath(); x.arc(px, py, 4 * k, 0, 7); x.fill(); };

function series(v) { // courbe d'activité : houle + pic à chaque vague
  const w = modp(v, PERIOD);
  return .42 + .12 * Math.sin(v * 1.3) + .07 * Math.sin(v * 3.7 + 1) + .04 * Math.sin(v * 9.1) + .3 * Math.exp(-Math.pow((w - 1.25) * 2.6, 2));
}
function drawAnalytics(x, W, H, t) {
  const k = W / 640; panelFrame(x, W, H, k);
  x.textBaseline = 'alphabetic';
  x.fillStyle = '#F5F1EA'; x.font = `700 ${60 * k}px ${FONT}`;
  x.fillText(fmt(1284532 + t * 1873 + Math.floor(t * 3) * 41), 34 * k, 92 * k);
  const up = 2.4 + .3 * Math.sin(t * .7);
  x.fillStyle = '#F9C83B'; x.font = `700 ${26 * k}px ${FONT}`;
  x.beginPath(); x.moveTo(36 * k, 130 * k); x.lineTo(46 * k, 116 * k); x.lineTo(56 * k, 130 * k); x.fill();
  x.fillText(`+${up.toFixed(1).replace('.', ',')} %`, 66 * k, 131 * k);
  x.fillStyle = 'rgba(157,180,208,.75)'; x.font = `600 ${22 * k}px ${FONT}`; x.textAlign = 'right';
  x.fillText(`${(24 + Math.floor(t / PERIOD) % 36).toString().padStart(2, '0')}:${String(Math.floor(t * 7) % 60).padStart(2, '0')}`, W - 34 * k, 60 * k);
  x.textAlign = 'left'; liveDot(x, W - 128 * k, 52 * k, k, t);
  // graphique
  const L = 34 * k, R = W - 34 * k, T = 160 * k, B = H - 40 * k, N = 64, span = 9;
  x.strokeStyle = 'rgba(157,180,208,.12)'; x.lineWidth = 1 * k;
  for (let i = 0; i <= 4; i++) { const y = T + (B - T) * i / 4; x.beginPath(); x.moveTo(L, y); x.lineTo(R, y); x.stroke(); }
  const pt = i => { const v = t - span + span * i / N; return [L + (R - L) * i / N, B - (B - T) * series(v)]; };
  const pt2 = i => { const v = t - span + span * i / N - .8; return [L + (R - L) * i / N, B - (B - T) * (series(v) * .6 + .08)]; };
  x.beginPath(); for (let i = 0; i <= N; i++) { const [px, py] = pt2(i); i ? x.lineTo(px, py) : x.moveTo(px, py); }
  x.setLineDash([5 * k, 6 * k]); x.strokeStyle = 'rgba(157,180,208,.55)'; x.lineWidth = 2 * k; x.stroke(); x.setLineDash([]);
  x.beginPath(); for (let i = 0; i <= N; i++) { const [px, py] = pt(i); i ? x.lineTo(px, py) : x.moveTo(px, py); }
  const fill = x.createLinearGradient(0, T, 0, B); fill.addColorStop(0, 'rgba(249,200,59,.35)'); fill.addColorStop(1, 'rgba(249,200,59,0)');
  x.save(); x.lineTo(R, B); x.lineTo(L, B); x.closePath(); x.fillStyle = fill; x.fill(); x.restore();
  x.beginPath(); for (let i = 0; i <= N; i++) { const [px, py] = pt(i); i ? x.lineTo(px, py) : x.moveTo(px, py); }
  x.strokeStyle = '#F9C83B'; x.lineWidth = 3 * k; x.lineJoin = 'round'; x.stroke();
  const [ex, ey] = pt(N);
  x.fillStyle = 'rgba(249,200,59,.25)'; x.beginPath(); x.arc(ex, ey, 12 * k, 0, 7); x.fill();
  x.fillStyle = '#F5F1EA'; x.beginPath(); x.arc(ex, ey, 5 * k, 0, 7); x.fill();
}
function drawGauge(x, W, H, t) {
  const k = W / 480; panelFrame(x, W, H, k);
  const cx = W / 2, cy = 196 * k, r = 128 * k, a0 = Math.PI * .75, a1 = Math.PI * 2.25;
  const w = modp(t - 1.2, PERIOD), v = .9 + .035 * Math.sin(t * .8) + .05 * Math.exp(-w * 2.2);
  x.lineCap = 'round';
  for (let i = 0; i <= 40; i++) { const a = a0 + (a1 - a0) * i / 40, on = i / 40 <= v; x.strokeStyle = on ? 'rgba(157,180,208,.5)' : 'rgba(157,180,208,.15)'; x.lineWidth = 2 * k; x.beginPath(); x.moveTo(cx + Math.cos(a) * (r + 18 * k), cy + Math.sin(a) * (r + 18 * k)); x.lineTo(cx + Math.cos(a) * (r + (i % 5 ? 24 : 30) * k), cy + Math.sin(a) * (r + (i % 5 ? 24 : 30) * k)); x.stroke(); }
  x.lineWidth = 14 * k; x.strokeStyle = 'rgba(157,180,208,.14)'; x.beginPath(); x.arc(cx, cy, r, a0, a1); x.stroke();
  const g = x.createLinearGradient(cx - r, 0, cx + r, 0); g.addColorStop(0, '#335F94'); g.addColorStop(1, '#F9C83B');
  x.strokeStyle = g; x.beginPath(); x.arc(cx, cy, r, a0, a0 + (a1 - a0) * v); x.stroke();
  const ae = a0 + (a1 - a0) * v; x.fillStyle = '#F5F1EA'; x.beginPath(); x.arc(cx + Math.cos(ae) * r, cy + Math.sin(ae) * r, 9 * k, 0, 7); x.fill();
  x.lineCap = 'butt';
  x.fillStyle = '#F5F1EA'; x.textAlign = 'center'; x.font = `700 ${70 * k}px ${FONT}`;
  x.fillText((v * 100).toFixed(1).replace('.', ','), cx - 12 * k, cy + 22 * k);
  x.fillStyle = '#F9C83B'; x.font = `700 ${30 * k}px ${FONT}`; x.fillText('%', cx + 92 * k, cy + 22 * k);
  // trois segments (AWP, VLT, casino) : jauges en barres
  const segs = [[412, '#F9C83B'], [1086, '#9DB4D0'], [238, '#BA2637']];
  segs.forEach(([n, col], i) => {
    const y = 360 * k + i * 30 * k, val = n + Math.floor(t * (3 + i) + Math.sin(t * 2 + i) * 4);
    x.fillStyle = col; x.fillRect(40 * k, y - 10 * k, 10 * k, 10 * k);
    x.fillStyle = 'rgba(157,180,208,.16)'; x.fillRect(66 * k, y - 8 * k, 260 * k, 6 * k);
    x.fillStyle = col; x.fillRect(66 * k, y - 8 * k, 260 * k * (.45 + .4 * ((val % 97) / 97)), 6 * k);
    x.fillStyle = '#F5F1EA'; x.textAlign = 'right'; x.font = `600 ${24 * k}px ${FONT}`; x.fillText(fmt(val), W - 40 * k, y);
  });
  x.textAlign = 'left';
}
function drawHeat(x, W, H, t) {
  const k = W / 512; panelFrame(x, W, H, k);
  const cols = 16, rows = 9, L = 30 * k, T = 30 * k, cw = (W - 60 * k) / cols, ch = (H - 104 * k) / rows;
  for (let i = 0; i < cols; i++) for (let j = 0; j < rows; j++) {
    const dx = i - (cols - 1) / 2, dy = (j - (rows - 1) / 2) * 1.3, d = Math.hypot(dx, dy) / 7.5;
    const ph = modp(t - d * 1.4, PERIOD), hit = Math.exp(-ph * 3), n = (Math.sin(i * 12.9 + j * 78.2) * 43758.5) % 1;
    const a = .1 + Math.abs(n) * .18 + hit * .8;
    x.fillStyle = hit > .35 ? `rgba(249,200,59,${a})` : `rgba(157,180,208,${a})`;
    x.fillRect(L + i * cw + 2 * k, T + j * ch + 2 * k, cw - 4 * k, ch - 4 * k);
  }
  x.fillStyle = '#F5F1EA'; x.font = `700 ${34 * k}px ${FONT}`; x.textBaseline = 'alphabetic';
  x.fillText(fmt(2048 + Math.floor(t * 2.3) % 9), 30 * k, H - 30 * k);
  x.fillStyle = 'rgba(157,180,208,.8)'; x.font = `600 ${22 * k}px ${FONT}`; x.textAlign = 'right';
  x.fillText(`${(12 + Math.sin(t * 1.7) * 1.5).toFixed(1).replace('.', ',')} ms`, W - 30 * k, H - 32 * k); x.textAlign = 'left';
  liveDot(x, 170 * k, H - 42 * k, k, t);
}

/* ---------- passes d'image : profondeur de champ (bascule), finition (vignette, grain, aberration) ---------- */
const TiltShader = {
  uniforms: { tDiffuse: { value: null }, uDir: { value: new THREE.Vector2(1, 0) }, uRes: { value: new THREE.Vector2(1, 1) }, uFocus: { value: .48 }, uBand: { value: .16 }, uMax: { value: 3.5 } },
  vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.); }',
  fragmentShader: /* glsl */`
    uniform sampler2D tDiffuse; uniform vec2 uDir, uRes; uniform float uFocus, uBand, uMax; varying vec2 vUv;
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
const FinishShader = {
  uniforms: { tDiffuse: { value: null }, uTime: { value: 0 }, uBg: { value: new THREE.Vector3(11 / 255, 27 / 255, 46 / 255) }, uAspect: { value: 1 } },
  vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.); }',
  fragmentShader: /* glsl */`
    uniform sampler2D tDiffuse; uniform float uTime, uAspect; uniform vec3 uBg; varying vec2 vUv;
    float h(vec2 p){ return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
    void main(){
      vec2 q = vUv - .5; q.x *= uAspect;
      vec2 off = (vUv - .5) * .0025 * dot(q, q) * 3.;
      vec3 c = vec3(texture2D(tDiffuse, vUv + off).r, texture2D(tDiffuse, vUv).g, texture2D(tDiffuse, vUv - off).b);
      float v = smoothstep(.42, .95, length(q * vec2(1., 1.08)));
      c = mix(c, uBg, v * .85);
      c += (h(vUv * 913. + fract(uTime * 7.3)) - .5) * .028;
      gl_FragColor = vec4(c, 1.);
    }`
};

/* ---------- scène ---------- */
export function mount(layer, { reduceMotion } = {}) {
  const renderer = new THREE.WebGLRenderer({ antialias: false, powerPreference: 'high-performance', alpha: false });
  renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.05;
  renderer.setClearColor(HEX.navy, 1);
  layer.appendChild(renderer.domElement);
  const col = h => new THREE.Color(h);
  const scene = new THREE.Scene();
  scene.background = col(HEX.navy);
  scene.fog = new THREE.Fog(HEX.navy, 13, 24);
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), .04).texture; pmrem.dispose();
  scene.environmentIntensity = .35;
  const camera = new THREE.PerspectiveCamera(34, 1, .1, 60);
  const target = new THREE.Vector3(0, 1.55, 0);

  scene.add(new THREE.HemisphereLight(col(HEX.mist), col(HEX.navy), .35));
  const rim = new THREE.DirectionalLight(col(HEX.mist), .9); rim.position.set(-6, 7, -8); scene.add(rim);
  const coreLight = new THREE.PointLight(col(HEX.yellow), 14, 0, 1.6); coreLight.position.copy(CORE); scene.add(coreLight);
  const fill = new THREE.PointLight(col(HEX.blue), 4, 0, 1.6); fill.position.set(6, 4, 8); scene.add(fill);

  /* sol miroir */
  const floor = new Reflector(new THREE.PlaneGeometry(40, 40), { shader: floorShader, textureWidth: 512, textureHeight: 512, multisample: 0 });
  floor.rotation.x = -Math.PI / 2; scene.add(floor);
  const fU = floor.material.uniforms;

  /* parc de terminaux */
  const plan = floorPlan(), slots = plan.filter(m => m.kind < 3), tables = plan.filter(m => m.kind === 3);
  const scrTex = screenTexture();
  const bodyMat = new THREE.MeshStandardMaterial({ color: '#182a42', metalness: .75, roughness: .32 });
  const trimMat = new THREE.MeshStandardMaterial({ color: '#0d1828', metalness: .4, roughness: .6 });
  const glowMat = new THREE.MeshBasicMaterial({ color: 0xffffff, fog: true });
  const scrMat = new THREE.MeshBasicMaterial({ map: scrTex, color: 0xffffff });
  const nS = slots.length, nT = tables.length;
  const body = new THREE.InstancedMesh(new THREE.BoxGeometry(.34, .74, .3).translate(0, .37, -.01), bodyMat, nS);
  const topper = new THREE.InstancedMesh(new THREE.BoxGeometry(.3, .16, .2).translate(0, .82, -.04), trimMat, nS);
  const screens = new THREE.InstancedMesh(new THREE.PlaneGeometry(.27, .33).rotateX(-.22).translate(0, .53, .162), scrMat, nS);
  const strips = new THREE.InstancedMesh(new THREE.BoxGeometry(.014, .7, .014).translate(0, .36, .152), glowMat, nS * 2);
  const candles = new THREE.InstancedMesh(new THREE.CylinderGeometry(.035, .035, .1, 10).translate(0, .95, -.04), glowMat, nS);
  const tblBody = new THREE.InstancedMesh(new THREE.CylinderGeometry(.62, .5, .36, 40).translate(0, .18, 0), bodyMat, nT);
  const tblFelt = new THREE.InstancedMesh(new THREE.CircleGeometry(.56, 40).rotateX(-Math.PI / 2).translate(0, .362, 0), new THREE.MeshBasicMaterial({ map: feltTexture() }), nT);
  const tblRim = new THREE.InstancedMesh(new THREE.TorusGeometry(.6, .012, 6, 60).rotateX(Math.PI / 2).translate(0, .37, 0), glowMat, nT);
  const o = new THREE.Object3D(), m4 = new THREE.Matrix4();
  slots.forEach((m, i) => {
    o.position.set(m.x, 0, m.z); o.rotation.set(0, m.rot, 0); o.scale.setScalar(m.kind === 2 ? 1.08 : 1); o.updateMatrix();
    body.setMatrixAt(i, o.matrix); topper.setMatrixAt(i, o.matrix); screens.setMatrixAt(i, o.matrix); candles.setMatrixAt(i, o.matrix);
    [-1, 1].forEach((s, j) => { m4.makeTranslation(s * .163, 0, 0).premultiply(o.matrix); strips.setMatrixAt(i * 2 + j, m4); });
  });
  tables.forEach((m, i) => { o.position.set(m.x, 0, m.z); o.rotation.set(0, 0, 0); o.scale.setScalar(1); o.updateMatrix(); [tblBody, tblFelt, tblRim].forEach(t => t.setMatrixAt(i, o.matrix)); });
  const colorize = (mesh, n) => { mesh.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(n * 3), 3); mesh.instanceColor.setUsage(THREE.DynamicDrawUsage); };
  [screens, strips, candles, tblFelt, tblRim].forEach(mm => colorize(mm, mm.count));
  [body, topper, screens, strips, candles, tblBody, tblFelt, tblRim].forEach(mm => scene.add(mm));

  /* faisceaux de données terminal → noyau (tubes fusionnés) + paquets lumineux */
  const curves = plan.map(m => {
    const top = new THREE.Vector3(m.x, m.kind === 3 ? .45 : 1.02, m.z);
    const out = new THREE.Vector3(m.x, 0, m.z).normalize();
    const p1 = top.clone().add(new THREE.Vector3(0, 1.1 + m.r * .12, 0));
    const p2 = CORE.clone().addScaledVector(out, Math.min(2.2, .5 + m.r * .3)).add(new THREE.Vector3(0, .7, 0));
    return { m, c: new THREE.CubicBezierCurve3(top, p1, p2, CORE.clone()) };
  });
  {
    const pos = [], uv = [], dl = [], sd = [], idx = []; let base = 0;
    curves.forEach(({ m, c }) => {
      const g = new THREE.TubeGeometry(c, 48, m.kind === 3 ? .016 : .011, 4, false);
      const P = g.attributes.position.array, U = g.attributes.uv.array;
      for (let i = 0; i < P.length; i++) pos.push(P[i]);
      for (let i = 0; i < U.length; i++) uv.push(U[i]);
      for (let i = 0; i < P.length / 3; i++) { dl.push(m.delay); sd.push(m.seed); }
      g.index.array.forEach(v => idx.push(v + base)); base += P.length / 3; g.dispose();
    });
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
    g.setAttribute('aDelay', new THREE.Float32BufferAttribute(dl, 1)); g.setAttribute('aSeed', new THREE.Float32BufferAttribute(sd, 1)); g.setIndex(idx);
    var beamMat = new THREE.ShaderMaterial({
      uniforms: { uTime: { value: 0 }, uIntro: { value: 0 }, uMist: { value: col(HEX.mist) }, uYellow: { value: col(HEX.yellow) }, uRed: { value: col(HEX.red) } },
      vertexShader: beamVert, fragmentShader: beamFrag, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true
    });
    scene.add(new THREE.Mesh(g, beamMat));
  }
  const packets = [0, 1].map(mode => {
    const g = new THREE.BufferGeometry(), A = k => new Float32Array(curves.length * k);
    const p0 = A(3), p1 = A(3), p2 = A(3), p3 = A(3), dl = A(1), sd = A(1);
    curves.forEach(({ m, c }, i) => { c.v0.toArray(p0, i * 3); c.v1.toArray(p1, i * 3); c.v2.toArray(p2, i * 3); c.v3.toArray(p3, i * 3); dl[i] = m.delay; sd[i] = m.seed; });
    g.setAttribute('position', new THREE.BufferAttribute(p0, 3)); g.setAttribute('p1', new THREE.BufferAttribute(p1, 3)); g.setAttribute('p2', new THREE.BufferAttribute(p2, 3)); g.setAttribute('p3', new THREE.BufferAttribute(p3, 3));
    g.setAttribute('aDelay', new THREE.BufferAttribute(dl, 1)); g.setAttribute('aSeed', new THREE.BufferAttribute(sd, 1));
    g.boundingSphere = new THREE.Sphere(new THREE.Vector3(0, 2, 0), 12);
    const mat = new THREE.ShaderMaterial({
      uniforms: { uTime: { value: 0 }, uIntro: { value: 0 }, uPx: { value: 400 }, uMode: { value: mode }, uColor: { value: mode ? col(HEX.mist) : col(HEX.yellow).lerp(col(HEX.paper), .5) }, uRed: { value: col(HEX.red) } },
      vertexShader: packetVert, fragmentShader: packetFrag, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true
    });
    scene.add(new THREE.Points(g, mat)); return mat;
  });

  /* noyau cloud : cœur incandescent, coque géodésique, anneaux, nuage de particules, colonne de liaison */
  const core = new THREE.Group(); core.position.copy(CORE); scene.add(core);
  const heartMat = new THREE.MeshBasicMaterial({ color: col(HEX.yellow) });
  const heart = new THREE.Mesh(new THREE.IcosahedronGeometry(.3, 5), heartMat); core.add(heart);
  const shellGeo = new THREE.IcosahedronGeometry(.72, 1);
  const shell = new THREE.LineSegments(new THREE.EdgesGeometry(shellGeo), new THREE.LineBasicMaterial({ color: col(HEX.mist), transparent: true, opacity: .55, blending: THREE.AdditiveBlending, depthWrite: false }));
  const shellPts = new THREE.Points(shellGeo, new THREE.PointsMaterial({ color: col(HEX.yellow).multiplyScalar(2.5), size: .06, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true }));
  const shellG = new THREE.Group(); shellG.add(shell, shellPts); core.add(shellG);
  const rings = [[1.1, .9, 0, HEX.mist, .5], [1.45, -.5, .7, HEX.yellow, .9], [1.8, 1.25, -.3, HEX.mist, .3]].map(([r, ax, az, c, a]) => {
    const g = new THREE.Group(); g.rotation.set(ax, 0, az);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(r, .007, 6, 160), new THREE.MeshBasicMaterial({ color: col(c).multiplyScalar(a * 2), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }));
    ring.rotation.x = Math.PI / 2; g.add(ring);
    const bead = new THREE.Mesh(new THREE.SphereGeometry(.045, 12, 8), new THREE.MeshBasicMaterial({ color: col(HEX.yellow).multiplyScalar(4) }));
    bead.position.x = r; const bg = new THREE.Group(); bg.add(bead); g.add(bg); core.add(g);
    return bg;
  });
  // nuage de particules en rotation différentielle
  const NP = 800, cloudPos = new Float32Array(NP * 3), cloudAux = new Float32Array(NP * 2);
  { const R = rand(5); for (let i = 0; i < NP; i++) { const a = R() * Math.PI * 2, r = 1.0 + Math.pow(R(), .8) * 1.1, y = (R() - .5) * (1.3 - r * .45) * .7; cloudPos.set([Math.cos(a) * r, y, Math.sin(a) * r], i * 3); cloudAux.set([R(), r], i * 2); } }
  const cloudG = new THREE.BufferGeometry(); cloudG.setAttribute('position', new THREE.BufferAttribute(cloudPos, 3)); cloudG.setAttribute('aux', new THREE.BufferAttribute(cloudAux, 2));
  const cloudMat = new THREE.ShaderMaterial({
    uniforms: { uTime: { value: 0 }, uPx: { value: 400 }, uFlash: { value: 0 }, uIntro: { value: 0 }, uA: { value: col(HEX.mist) }, uB: { value: col(HEX.yellow) } },
    vertexShader: /* glsl */`attribute vec2 aux; uniform float uTime, uPx, uIntro; varying float vK; varying float vR;
      void main(){ float r = aux.y, a = atan(position.z, position.x) + uTime * (.55 / (r * r)) ;
        vec3 p = vec3(cos(a) * r, position.y + sin(uTime * .8 + aux.x * 30.) * .05, sin(a) * r) * mix(.2, 1., smoothstep(0., 1., uIntro));
        vec4 mv = modelViewMatrix * vec4(p, 1.); vK = aux.x; vR = r; gl_PointSize = (1.2 + aux.x * 1.8) * uPx / -mv.z * .02; gl_Position = projectionMatrix * mv; }`,
    fragmentShader: /* glsl */`uniform vec3 uA, uB; uniform float uFlash, uTime; varying float vK; varying float vR;
      void main(){ float d = length(gl_PointCoord - .5) * 2.; float a = smoothstep(1., .1, d);
        float tw = .5 + .5 * sin(uTime * (2. + vK * 5.) + vK * 40.);
        vec3 c = mix(uA, uB, step(.86, vK)) * (.45 + tw * .6 + uFlash * smoothstep(2.1, 1., vR) * 1.0);
        gl_FragColor = vec4(c * a * .32, 1.); }`,
    blending: THREE.AdditiveBlending, depthWrite: false, transparent: true
  });
  core.add(new THREE.Points(cloudG, cloudMat));
  const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: (() => { const c = document.createElement('canvas'); c.width = c.height = 128; const x = c.getContext('2d'), g = x.createRadialGradient(64, 64, 0, 64, 64, 64); g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(.25, 'rgba(255,255,255,.35)'); g.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = g; x.fillRect(0, 0, 128, 128); return new THREE.CanvasTexture(c); })(), color: col(HEX.yellow), blending: THREE.AdditiveBlending, depthWrite: false, transparent: true }));
  halo.scale.setScalar(2.4); core.add(halo);
  const column = new THREE.Mesh(new THREE.CylinderGeometry(.04, .22, CORE.y, 32, 1, true).translate(0, CORE.y / 2, 0), new THREE.ShaderMaterial({
    uniforms: { uColor: { value: col(HEX.yellow) }, uTime: { value: 0 } },
    vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.); }',
    fragmentShader: 'uniform vec3 uColor; uniform float uTime; varying vec2 vUv; void main(){ float s = .5 + .5 * sin(vUv.y * 40. - uTime * 6.); gl_FragColor = vec4(uColor * (.04 + .06 * s) * smoothstep(1., .5, vUv.y) * smoothstep(0., .15, vUv.y), 1.); }',
    blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, side: THREE.DoubleSide
  }));
  scene.add(column);

  /* interfaces flottantes (scène superposée, nette, hors flou et hors lueur) */
  const hud = new THREE.Scene();
  const rawColor = (h, k = 1) => { const c = new THREE.Color(); c.setRGB(parseInt(h.slice(1, 3), 16) / 255 * k, parseInt(h.slice(3, 5), 16) / 255 * k, parseInt(h.slice(5, 7), 16) / 255 * k, THREE.LinearSRGBColorSpace); return c; };
  const panels = [
    { draw: drawAnalytics, cw: 640, ch: 400, w: 2.85, at: [-3.15, 3.2, 1.5], yaw: .26, anchor: [.5, -.3], delay: .55 },
    { draw: drawHeat, cw: 512, ch: 340, w: 2.1, at: [3.35, 3.6, -.5], yaw: -.2, anchor: [-.5, -.3], delay: .8 },
    { draw: drawGauge, cw: 480, ch: 470, w: 1.8, at: [3.55, -1.55, 1.8], yaw: -.28, anchor: [-.5, .3], delay: 1.05 }
  ].map(p => {
    const cv = document.createElement('canvas'); cv.width = p.cw; cv.height = p.ch;
    const tex = new THREE.CanvasTexture(cv); tex.anisotropy = 4; tex.generateMipmaps = true; tex.minFilter = THREE.LinearMipmapLinearFilter;
    const h = p.w * p.ch / p.cw;
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(p.w, h), new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthTest: false, depthWrite: false, toneMapped: false }));
    hud.add(mesh);
    const lg = new THREE.BufferGeometry(); lg.setAttribute('position', new THREE.BufferAttribute(new Float32Array(6), 3));
    const line = new THREE.Line(lg, new THREE.LineBasicMaterial({ color: rawColor(HEX.mist), transparent: true, opacity: .4, depthTest: false }));
    hud.add(line);
    const dot = new THREE.Mesh(new THREE.CircleGeometry(.035, 16), new THREE.MeshBasicMaterial({ color: rawColor(HEX.yellow), transparent: true, depthTest: false }));
    hud.add(dot);
    // position définie dans le repère de la caméra de référence (cadrage stable carré comme 4:3)
    const az = .62, el = .62, fwd = new THREE.Vector3(-Math.sin(az) * Math.cos(el), -Math.sin(el), -Math.cos(az) * Math.cos(el));
    const rgt = new THREE.Vector3().crossVectors(fwd, new THREE.Vector3(0, 1, 0)).normalize(), upv = new THREE.Vector3().crossVectors(rgt, fwd);
    const base = target.clone().addScaledVector(rgt, p.at[0]).addScaledVector(upv, p.at[1]).addScaledVector(fwd, -p.at[2]);
    return { ...p, h, cv, ctx: cv.getContext('2d'), tex, mesh, line, dot, base };
  });

  /* chaîne d'images */
  const composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));
  const bloom = new UnrealBloomPass(new THREE.Vector2(256, 256), .7, .4, .85); composer.addPass(bloom);
  const tiltH = new ShaderPass(TiltShader), tiltV = new ShaderPass(TiltShader); tiltV.uniforms.uDir.value.set(0, 1);
  composer.addPass(tiltH); composer.addPass(tiltV);
  composer.addPass(new OutputPass());
  const hudPass = new RenderPass(hud, camera); hudPass.clear = false; composer.addPass(hudPass);
  const finish = new ShaderPass(FinishShader); composer.addPass(finish);

  /* animation */
  let w = 0, h = 0, raf = 0, on = false, clock = 0, last = 0, pausedAt = -1e9, lastDraw = -1;
  let mx = 0, my = 0, tmx = 0, tmy = 0;
  const cScr = new THREE.Color(), cTmp = new THREE.Color();
  const Y = col(HEX.yellow), MI = col(HEX.mist), RD = col(HEX.red), BL = col(HEX.blue), PA = col(HEX.paper);
  const camPos = new THREE.Vector3(), right = new THREE.Vector3(), up = new THREE.Vector3(), tmpV = new THREE.Vector3();

  const update = (t, intro) => {
    // caméra : lente orbite + parallaxe du pointeur
    const az = .62 + Math.sin(t * .11) * .1 + mx * .45, el = .62 - my * .14 + Math.sin(t * .17) * .02, dist = 16.2;
    camPos.set(Math.sin(az) * Math.cos(el) * dist, Math.sin(el) * dist + target.y, Math.cos(az) * Math.cos(el) * dist);
    camera.position.copy(camPos); camera.lookAt(target);
    // terminaux : allumage au passage de la vague, retour d'activité
    let flash = 0;
    slots.forEach((m, i) => {
      const boot = smooth(m.delay, m.delay + .35, intro);
      const ph = modp(t - m.delay, PERIOD), hit = Math.exp(-ph * 3.2);
      const fl = .82 + .18 * Math.sin(t * (5 + m.seed * 9) + m.seed * 50);
      const alert = m.seed > .93;
      cScr.copy(m.kind === 1 ? Y : m.kind === 0 ? PA : MI).multiplyScalar((.55 * fl + hit * 2.4) * boot);
      screens.setColorAt(i, cScr);
      cTmp.copy(alert ? RD : (m.kind === 2 ? MI : Y)).multiplyScalar((alert ? (Math.sin(t * 9) > 0 ? 3 : .4) : .5 + hit * 3) * boot);
      candles.setColorAt(i, cTmp);
      cTmp.copy(hit > .25 ? Y : BL).multiplyScalar((.35 + hit * 3.2) * boot);
      strips.setColorAt(i * 2, cTmp); strips.setColorAt(i * 2 + 1, cTmp);
      const arr = modp(t - m.delay - TRAVEL, PERIOD); flash += Math.exp(-arr * 6) * (arr < 1 ? 1 : 0);
    });
    tables.forEach((m, i) => {
      const boot = smooth(m.delay, m.delay + .35, intro), hit = Math.exp(-modp(t - m.delay, PERIOD) * 3);
      tblFelt.setColorAt(i, cTmp.copy(BL).multiplyScalar((.9 + hit * .8) * boot));
      tblRim.setColorAt(i, cTmp.copy(hit > .3 ? Y : MI).multiplyScalar((.35 + hit * 2.2) * boot));
    });
    [screens, strips, candles, tblFelt, tblRim].forEach(mm => { mm.instanceColor.needsUpdate = true; });
    flash = Math.min(1, flash / slots.length * 4);
    // noyau
    const cb = ease(intro / .6);
    heartMat.color.copy(Y).multiplyScalar((1.5 + flash * 1.2) * cb);
    heart.scale.setScalar((.8 + .25 * flash + .04 * Math.sin(t * 3)) * cb);
    shellG.rotation.set(t * .13, t * .21, 0); shellG.scale.setScalar(.6 + .4 * cb + flash * .05);
    rings.forEach((g, i) => { g.rotation.y = t * (.6 - i * .25) + i * 2; g.parent.scale.setScalar(cb); });
    halo.material.opacity = (.16 + flash * .22) * cb;
    coreLight.intensity = (10 + flash * 8) * cb;
    cloudMat.uniforms.uTime.value = t; cloudMat.uniforms.uFlash.value = flash; cloudMat.uniforms.uIntro.value = intro;
    column.material.uniforms.uTime.value = t;
    fU.uTime.value = t; fU.uIntro.value = intro;
    beamMat.uniforms.uTime.value = t; beamMat.uniforms.uIntro.value = intro;
    packets.forEach(p => { p.uniforms.uTime.value = t; p.uniforms.uIntro.value = intro; });
    // interfaces : face caméra, légère rotation, flottement
    camera.updateMatrixWorld();
    right.setFromMatrixColumn(camera.matrixWorld, 0); up.setFromMatrixColumn(camera.matrixWorld, 1);
    panels.forEach((p, i) => {
      const k = ease((intro - p.delay) / .55);
      p.mesh.position.copy(p.base).addScaledVector(up, Math.sin(t * .9 + i * 2) * .06 + (1 - k) * -.25);
      p.mesh.quaternion.copy(camera.quaternion); p.mesh.rotateY(p.yaw); p.mesh.rotateX(-.06);
      p.mesh.scale.set(1, .2 + .8 * k, 1);
      p.mesh.material.opacity = k;
      tmpV.set(p.anchor[0] * p.w, p.anchor[1] * p.h, 0).applyMatrix4(p.mesh.matrixWorld.compose(p.mesh.position, p.mesh.quaternion, p.mesh.scale));
      const a = p.line.geometry.attributes.position; a.setXYZ(0, tmpV.x, tmpV.y, tmpV.z);
      a.setXYZ(1, tmpV.x + (CORE.x - tmpV.x) * .72 * k, tmpV.y + (CORE.y - tmpV.y) * .72 * k, tmpV.z + (CORE.z - tmpV.z) * .72 * k); a.needsUpdate = true;
      p.line.geometry.computeBoundingSphere();
      p.line.material.opacity = .4 * k; p.dot.material.opacity = k;
      p.dot.position.set(a.getX(1), a.getY(1), a.getZ(1)); p.dot.quaternion.copy(camera.quaternion);
    });
    if (t - lastDraw > .05 || t < lastDraw) { lastDraw = t; panels.forEach(p => { p.draw(p.ctx, p.cw, p.ch, t); p.tex.needsUpdate = true; }); }
    finish.uniforms.uTime.value = t;
  };
  const render = () => composer.render();
  const frame = now => {
    raf = 0;
    const dt = Math.min(.05, (now - last) / 1000 || 0); last = now; clock += dt;
    mx += (tmx - mx) * .05; my += (tmy - my) * .05;
    update(clock, clock);
    render();
    if (on) raf = requestAnimationFrame(frame);
  };
  const still = () => { update(PERIOD * 2 + .75, 99); render(); };

  new ResizeObserver(() => {
    const r = Math.min(devicePixelRatio || 1, 2); w = layer.clientWidth; h = layer.clientHeight; if (!w || !h) return;
    renderer.setPixelRatio(r); renderer.setSize(w, h, false);
    composer.setPixelRatio(r); composer.setSize(w, h);
    floor.getRenderTarget().setSize(Math.round(w * r * .5), Math.round(h * r * .5));
    const a = w / h; camera.aspect = a;
    camera.fov = a >= 1 ? 36 : THREE.MathUtils.radToDeg(2 * Math.atan(Math.tan(THREE.MathUtils.degToRad(18)) / a));
    camera.updateProjectionMatrix();
    const px = h * r / (2 * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)));
    packets.forEach(p => { p.uniforms.uPx.value = px * .02; }); cloudMat.uniforms.uPx.value = px;
    [tiltH, tiltV].forEach(p => { p.uniforms.uRes.value.set(w * r, h * r); p.uniforms.uMax.value = 1.5 * r; });
    finish.uniforms.uAspect.value = a;
    if (reduceMotion) still(); else if (!on) { update(clock, clock); render(); }
  }).observe(layer);
  if (document.fonts) document.fonts.load(`700 40px Archivo`).then(() => { lastDraw = -1; if (reduceMotion && w) still(); });

  return {
    play() {
      if (reduceMotion || on) return;
      const now = performance.now();
      if (now - pausedAt > 1500) clock = 0; // nouvel affichage : le système redémarre
      on = true; last = now; if (!raf) raf = requestAnimationFrame(frame);
    },
    pause() { on = false; if (raf) cancelAnimationFrame(raf); raf = 0; pausedAt = performance.now(); },
    pointer(px, py) { tmx = px; tmy = py; }
  };
}
