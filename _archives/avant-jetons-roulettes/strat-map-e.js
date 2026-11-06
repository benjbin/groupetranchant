/* Groupe Tranchant — carte des implantations, variante E : « La roulette ».
   Un cylindre de roulette laqué bleu nuit, garni de laiton, photographié en studio sur le papier de la page.
   Vingt-deux cases, une par établissement (le club en rouge, à la place du zéro), cases émaillées bleu nuit et papier,
   nom court gravé en petites capitales Archivo, filet de couleur du type au bord du cylindre.
   Le cylindre tourne lentement, la bille court en sens inverse ; au survol, au clic ou via dest:hover,
   la bille tombe dans la case et une fiche s'ouvre (photo, nom, ville, situation discrète en France). */
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { PLACES, PHOTO, IMG, FRANCE } from './data.js';
import { createRouletteSound } from './roulette-sound.js';

/* ordre des cases : le club au zéro, puis le tour du groupe, chaque hôtel à côté de son casino */
const ORDER = [
  ['Paris Élysées Club', 'Élysées'],
  ['Seven Casino', 'Seven'], ['Golden Tulip', 'Golden Tulip'],
  ['Grand Casino Basel', 'Basel'], ['Airport Hotel Basel', 'Airport'],
  ['Grand Casino Prilly', 'Prilly'], ['Casino de Saint-Gervais', 'St-Gervais'],
  ['Casino Terrazur', 'Terrazur'], ['Casino Flamingos', 'Flamingos'], ['Casino de Sète', 'Sète'],
  ['Casino de Valras-Plage', 'Valras'], ["Casino d'Argelès-Gazost", 'Argelès'],
  ['Casino de Bagnères-de-Bigorre', 'Bagnères'], ['Casino de Pau', 'Pau'],
  ['Casino de Roscoff', 'Roscoff'], ['Casino de Luc-sur-Mer', 'Luc'], ['Casino de Villers-sur-Mer', 'Villers'],
  ["Casino d'Yport", 'Yport'], ['Casino de Dunkerque', 'Dunkerque'],
  ['Casino de Néris-les-Bains', 'Néris'], ['Casino de Pougues-les-Eaux', 'Pougues'], ['Hôtel des Sources', 'Sources']
];
const CASES = ORDER.map(([name, short]) => ({ ...PLACES.find(p => p.name === name), short })).filter(c => c.name);
PLACES.forEach(p => { if (!CASES.some(c => c.name === p.name)) CASES.push({ ...p, short: p.city }); });
const N = CASES.length, STEP = Math.PI * 2 / N;

const COL = { night: '#0B1B2E', paper: '#F3EEE3', red: '#A51F30', blue: '#335F94', yellow: '#F9C83B', brass: '#C9A862' };
const TYPE = { casino: COL.blue, club: '#BA2637', hotel: COL.yellow };

/* géométrie (unités monde) */
const R_RING = [0.62, 1.0], R_POCK = [0.5, 0.62], FLOOR = -0.06, BALL = 0.04, BASE = -0.3, TRACK = [1.02, 1.25];
const trackY = r => 0.02 + (r - TRACK[0]) / (TRACK[1] - TRACK[0]) * 0.08;

const wrap = a => ((a % (Math.PI * 2)) + Math.PI * 3) % (Math.PI * 2) - Math.PI;

/* ---------- physique de la bille : pas fixe de 240 Hz, déterministe, pour pouvoir prédire la case ----------
   Repères : la piste et la pente sont fixes (angle monde th) ; sur le cylindre on calcule dans son repère (angle local lam).
   Unités : 1 = rayon du cylindre (environ 40 cm). Gravité ralentie d'un facteur ~0,6 (prise de vue au ralenti). */
const TAU = Math.PI * 2, SIM_DT = 1 / 240;
const GRAV = 9, RT = TRACK[1] - BALL - 0.008, DEF_R = 1.15, FRET_TOP = FLOOR + 0.075, RP = (R_POCK[0] + R_POCK[1]) / 2;
const LEAN = 34;                       // tenue contre la bande : la bille décroche quand r·w² passe sous ce seuil
const DEFS = Array.from({ length: 8 }, (_, k) => ({ a: k / 8 * TAU + Math.PI / 8, tall: k % 2 === 1 }));
const surf = r => r >= TRACK[0] ? trackY(r) : r >= R_RING[1] ? 0.02 * (r - R_RING[1]) / (TRACK[0] - R_RING[1]) : r >= R_RING[0] ? 0 : FLOOR;
const rng = seed => () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
const mod = (a, n) => ((a % n) + n) % n;
const pocketOf = lam => mod(Math.round(lam / STEP), N);
const OM_IDLE = 0.25;
const newBall = () => ({ ph: 'rest', th: 0, w: 0, r: R_POCK[1] - BALL - 0.003, vr: 0, h: FLOOR, vy: 0, contact: true, lam: 0, wl: 0, psi: 0.4, om: OM_IDLE, held: false, running: false, seed: 1, rnd: rng(1), lift: null, pass: null, defPrev: null, time: 0, ev: null, restT: 0, rimT: 0 });
const cloneBall = s => ({ ...s, rnd: rng(s.seed), lift: s.lift && { ...s.lift }, defPrev: s.defPrev && s.defPrev.slice(), ev: null });
const emit = (s, k, v) => { if (s.ev && v > 0.04) s.ev.push([k, Math.min(1, v)]); };
function stepBall(s, dt) {
  s.time += dt;
  // cylindre lourd : il revient lentement à son allure (ou s'arrête sous la main, hors tour)
  const omT = s.held && !s.running ? 0 : OM_IDLE;
  s.om += (omT - s.om) * (1 - Math.exp(-dt * (s.held && !s.running ? 0.7 : 0.2)));
  s.psi += s.om * dt;
  if (s.ph === 'rest') { s.th = s.lam - s.psi; return; }
  if (s.ph === 'lift') {
    const L = s.lift; L.t += dt; const u = Math.min(1, L.t / L.T), e = u * u * (3 - 2 * u);
    s.r = L.r0 + (RT - L.r0) * e;
    s.th = L.th0 + L.span * (u * u * 0.85 + u * 0.15);
    s.h = L.h0 + (surf(RT) - L.h0) * e + Math.sin(Math.PI * u) * 0.2;
    if (u >= 1) { s.ph = 'free'; s.r = RT; s.vr = 0; s.w = L.w; s.h = surf(RT); s.vy = 0; s.contact = true; s.lift = null; s.defPrev = null; emit(s, 'rim', 0.35); }
    return;
  }
  if (s.ph === 'free') {
    let L = s.r * s.r * s.w;
    const q = s.r * s.w * s.w / LEAN;
    if (s.r >= RT - 1e-4 && q > 1 && s.vr >= 0) {
      s.r = RT; s.vr = 0;
      // près du décrochage, la bille flotte et vibre contre la bande
      if (q < 1.35 && s.rnd() < dt * 5 * (1.35 - q) / 0.35) { s.vr = -(0.08 + s.rnd() * 0.3) * (1.35 - q) / 0.35; s.r -= 0.0005; }
    } else {
      const pull = !s.contact ? 0 : s.r >= R_RING[1] ? LEAN * 1.7 : 6;
      s.vr += (s.r * s.w * s.w - pull) * dt;
      s.r += s.vr * dt;
      if (s.r > RT) { emit(s, 'rim', Math.abs(s.vr) * 1.5); s.r = RT; s.vr = 0; }
    }
    if (s.contact) L -= (0.8 + 0.025 * s.w * s.w) * s.r * s.r * dt; // roulement + air (en v²) : perte progressive
    s.w = Math.max(0.2, L / (s.r * s.r));
    const hs = surf(s.r);
    if (s.contact) { if (hs < s.h - 0.004) s.contact = false; else { s.vy = (hs - s.h) / dt; s.h = hs; } }
    if (!s.contact) {
      s.vy -= GRAV * dt; s.h += s.vy * dt;
      if (s.h <= hs) { s.h = hs; if (s.vy < -0.3) { emit(s, 'rim', -s.vy / 2.5); s.vy = -s.vy * 0.45; s.w *= 0.96; } else { s.vy = 0; s.contact = true; } }
    }
    // losanges de laiton : couchés (la bille passe dessus) ou dressés (choc franc)
    if (!s.defPrev) s.defPrev = DEFS.map(d => wrap(s.th - d.a));
    const thN = s.th + s.w * dt;
    DEFS.forEach((d, k) => {
      const x = wrap(thN - d.a);
      if (s.defPrev[k] < 0 && x >= 0 && x < 0.5 && Math.abs(s.r - DEF_R) < 0.05 && s.h < surf(s.r) + 0.02 && s.rnd() < 0.8) {
        const f = d.tall ? 1 : 0.6;
        s.vy = (0.8 + s.rnd() * 0.9) * f + 0.4; s.h += 0.003; s.contact = false;
        s.w *= d.tall ? 0.6 + s.rnd() * 0.15 : 0.82 + s.rnd() * 0.1;
        s.vr += d.tall ? -0.9 + s.rnd() * 1.3 : -(0.15 + s.rnd() * 0.45);
        emit(s, 'diamond', 0.5 + f * 0.5 * s.rnd());
      }
      s.defPrev[k] = x;
    });
    s.th = thN;
    if (s.r < R_RING[1] - 0.005) { s.ph = 'rotor'; s.lam = s.th + s.psi; s.wl = s.w + s.om; s.pass = null; }
    return;
  }
  /* ph === 'rotor' : sur le cylindre, dans son repère */
  const w = s.wl - s.om;                       // vitesse angulaire réelle (monde)
  const inPocket = s.r < R_POCK[1];
  let hs = inPocket ? FLOOR : 0;
  // radial : force centrifuge (atténuée par le frottement), pente de la couronne vers les cases
  let ar = s.r * w * w * 0.3;
  if (s.contact) ar += inPocket ? 0.6 : -8;
  s.vr += ar * dt; s.vr *= s.contact ? 1 - 2 * dt : 1;
  s.r += s.vr * dt;
  if (s.r > R_RING[1] - 0.012) { s.r = R_RING[1] - 0.012; if (s.vr > 0) { emit(s, 'rim', s.vr); s.vr = -s.vr * 0.4; } }
  if (s.r < R_POCK[0] + BALL) { s.r = R_POCK[0] + BALL; if (s.vr < 0) { emit(s, 'fret', -s.vr * 0.6); s.vr = -s.vr * 0.5; } }
  // paroi extérieure des cases : on n'en ressort que par-dessus
  if (s.h < -0.004 && s.r > R_POCK[1] - BALL) { s.r = R_POCK[1] - BALL; if (s.vr > 0) { s.vr = -s.vr * 0.45; } }
  hs = s.r < R_POCK[1] ? FLOOR : 0;
  // frettes : cloisons de laiton qui dépassent
  const v = s.wl * s.r, dir = Math.sign(s.wl) || 1;
  if (s.r < R_POCK[1] + BALL * 0.4 && s.h < FRET_TOP) {
    const fi = Math.round(s.lam / STEP - 0.5 * dir) + 0.5 * dir, gap = (fi * STEP - s.lam) * dir * s.r;
    const key = Math.round(fi * 2);
    if (gap < BALL + 0.004 && gap > -0.01 && s.pass !== key) {
      const sp = Math.abs(v);
      if (s.h < FRET_TOP - BALL * 0.7 || sp < 0.5) {
        // choc sur la cloison : la bille repart en arrière
        s.wl = -s.wl * 0.55;
        if (sp > 0.3) { s.vy = Math.max(s.vy, sp * (0.1 + 0.25 * s.rnd())); s.contact = false; }
        s.lam = fi * STEP - dir * (BALL + 0.0045) / s.r;
        if (sp > 0.05) emit(s, 'fret', sp / 3);
      } else {
        // la bille frappe l'arête : projetée vers le haut, en avant ou en arrière
        s.vy = Math.min(2.4, Math.max(s.vy, sp * (0.5 + 0.5 * s.rnd()))); s.contact = false;
        s.wl = s.wl * (s.rnd() < 0.62 ? 0.5 : -0.4);
        s.vr += (s.rnd() - 0.5) * 0.7;
        s.pass = key; emit(s, 'fret', sp / 3);
      }
    }
    if (s.pass !== null && Math.abs(s.pass / 2 * STEP - s.lam) * s.r > BALL * 1.6) s.pass = null;
  }
  if (s.contact) {
    if (hs < s.h - 0.004) s.contact = false; else s.h = hs;
  }
  if (!s.contact) {
    s.vy -= GRAV * dt; s.h += s.vy * dt;
    if (s.h <= hs) {
      s.h = hs;
      if (s.vy < -0.3) { emit(s, hs === FLOOR ? 'pocket' : 'rim', -s.vy / 2.2); s.vy = -s.vy * 0.5; s.wl *= 0.82; }
      else { s.vy = 0; s.contact = true; }
    }
  } else {
    // roulement : le cylindre entraîne la bille ; au fond de la case, elle roule vers la frette côté entraînement
    s.wl *= Math.exp(-dt * (inPocket ? 4.5 : 1.1));
    if (inPocket) s.wl -= 3.2 * dt;
    if (inPocket && Math.abs(s.wl) * s.r < 0.04 && Math.abs(s.vr) < 0.05) {
      const idx = Math.round(s.lam / STEP), fr = (idx - 0.5) * STEP + (BALL + 0.004) / s.r;
      if (s.lam - fr < 0.004) { s.ph = 'rest'; s.lam = fr; s.wl = 0; s.vr = 0; s.restT = s.time; s.running = false; }
    }
  }
  s.lam += s.wl * dt;
  s.th = s.lam - s.psi;
}
/* prépare un tour : des centaines d'essais simulés, on garde celui qui finit naturellement dans la case voulue */
function simulate(s, maxT = 11) { const c = cloneBall(s); const t0 = c.time; while (c.ph !== 'rest' && c.time - t0 < maxT) stepBall(c, SIM_DT); return c; }
function planRun(cur, target, { power = 'short', avoid = null } = {}) {
  const long = power === 'long', ideal = long ? 7 : 2.4, lo = long ? 6 : 2, hi = long ? 8.5 : 3.1;
  let best = null, bestScore = Infinity;
  for (let k = 0; k < (target >= 0 ? 700 : 40) && bestScore > 0.15; k++) {
    const seed = (Math.random() * 1e9) | 0, s = cloneBall(cur), u = Math.random();
    s.seed = seed; s.rnd = rng(seed); s.running = true; s.pass = null;
    const w = long ? 14 + u * 3 : 5.5 + u * 0.9;
    s.lift = { t: 0, T: 0.3, r0: s.r, th0: s.th, h0: s.h, span: 0.5 + Math.random() * 0.8, w };
    s.ph = 'lift';
    if (long) s.om = Math.max(s.om, 2.6 + Math.random() * 0.6); // le croupier relance le cylindre
    else s.om = Math.max(s.om, 0.3 + Math.random() * 0.9);
    const end = simulate(s);
    if (end.ph !== 'rest') continue;
    const dur = end.restT - cur.time;
    let score = Math.abs(dur - ideal) * 0.3 + (dur < lo || dur > hi ? 3 : 0);
    if (target >= 0 && pocketOf(end.lam + STEP / 2 - (BALL + 0.004) / end.r) !== target) score += 20;
    if (avoid && avoid(end)) score += 1;
    if (score < bestScore) { bestScore = score; best = s; }
  }
  return best;
}


const CSS = `
.hstrat-map.rl-on .hs-stage{display:block;perspective:none}
.rl-canvas{position:absolute;top:0;left:0;height:100%;display:block;opacity:0;transform:translateY(18px);transition:opacity 1.6s var(--ease),transform 1.8s var(--ease);cursor:default}
.hstrat-map.ready .rl-canvas{opacity:1;transform:none}
.rl-canvas.rl-point{cursor:pointer}
.rl-panel{position:absolute;z-index:3;width:200px;pointer-events:none;opacity:0;transform:translateY(10px);transition:opacity .45s var(--ease),transform .6s var(--ease)}
.rl-panel.rl-open{opacity:1;transform:none;pointer-events:auto}
.rl-card{display:block;position:relative;background:#FCFAF6;padding:10px 10px 16px;color:#0B1B2E;text-decoration:none;
  box-shadow:0 0 0 1px rgba(11,27,46,.08),0 1px 0 rgba(11,27,46,.04),0 28px 50px -26px rgba(11,27,46,.45),0 10px 18px -12px rgba(11,27,46,.18)}
.rl-card::after{content:"";position:absolute;inset:4px;border:1px solid rgba(169,140,74,.35);pointer-events:none}
.rl-ph{display:block;position:relative;aspect-ratio:4/3;overflow:hidden;background:#E9E3D7}
.rl-ph img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;opacity:0;transition:opacity .5s ease;filter:saturate(.92) contrast(1.02)}
.rl-ph img.rl-in{opacity:1}
.rl-rule{display:block;height:2px;margin:14px 6px 0;width:28px;background:var(--rl-c,#335F94);transition:background .3s}
.rl-txt{display:grid;grid-template-columns:minmax(0,1fr) auto;align-items:end;gap:10px;padding:10px 6px 0}
.rl-name{display:block;font-family:var(--display);font-stretch:112%;font-weight:600;font-size:16px;line-height:1.12;letter-spacing:-.015em;text-wrap:balance}
.rl-city{display:block;margin-top:6px;font-family:var(--display);font-size:9.5px;font-weight:700;letter-spacing:.2em;text-transform:uppercase;color:rgba(11,27,46,.55)}
.rl-fr{width:40px;height:40px;overflow:visible;opacity:.9}
.rl-fr path{fill:none;stroke:rgba(11,27,46,.32);stroke-width:1;vector-effect:non-scaling-stroke;stroke-linejoin:round}
.rl-fr circle{fill:var(--rl-c,#335F94)}
.hstrat-map.rl-on .hs-legend{gap:26px;bottom:22px;transition:opacity .4s}
.hstrat-map.rl-on .hs-legend li{height:28px;padding:0 0 2px;border:0;border-radius:0;background:none;gap:9px;font-size:10px;letter-spacing:.2em;color:rgba(11,27,46,.5);cursor:pointer;box-shadow:inset 0 -1px 0 transparent;transition:color .3s,box-shadow .3s}
.hstrat-map.rl-on .hs-legend li:hover,.hstrat-map.rl-on .hs-legend li.rl-act{color:#0B1B2E;box-shadow:inset 0 -1px 0 rgba(169,140,74,.8)}
.hstrat-map.rl-on .hs-legend i{width:7px;height:7px}
.hstrat-map.rl-on .hs-legend .c-hotel{background:var(--yellow);box-shadow:none}
.rl-snd{position:absolute;z-index:4;top:6px;right:6px;width:34px;height:34px;display:grid;place-items:center;padding:0;border-radius:50%;border:1px solid rgba(11,27,46,.14);background:rgba(252,250,246,.7);color:rgba(11,27,46,.55);cursor:pointer;transition:color .3s,border-color .3s,background .3s}
.rl-snd:hover,.rl-snd:focus-visible{color:#0B1B2E;border-color:rgba(169,140,74,.7)}
.rl-snd svg{width:16px;height:16px;overflow:visible}
.rl-snd path,.rl-snd line{fill:none;stroke:currentColor;stroke-width:1.4;stroke-linecap:round;stroke-linejoin:round}
.rl-snd .rl-body{fill:currentColor;stroke:none}
.rl-snd .rl-on{display:none}.rl-snd[aria-pressed="true"] .rl-on{display:inline}.rl-snd[aria-pressed="true"] .rl-off{display:none}
@media (max-width:600px){
  .rl-panel{width:auto}
  .rl-card{display:grid;grid-template-columns:96px minmax(0,1fr);gap:0 12px;padding:8px;align-items:center}
  .rl-ph{grid-row:1/span 2;aspect-ratio:1}
  .rl-rule{margin:4px 0 0}
  .rl-txt{padding:6px 0 0}
  .rl-name{font-size:14px}
  .rl-fr{width:32px;height:32px}
  .hstrat-map.rl-on .hs-legend{gap:16px;bottom:12px}
  .hstrat-map.rl-sel .hs-legend{opacity:0;pointer-events:none}
  .hstrat-map.rl-on .hs-legend li{font-size:9px;letter-spacing:.14em}
}
`;

export async function mountStratMap(box, { reduceMotion }) {
  const stage = box.querySelector('.hs-stage');
  if (!document.getElementById('rl-style')) { const st = document.createElement('style'); st.id = 'rl-style'; st.textContent = CSS; document.head.appendChild(st); }
  box.classList.add('rl-on');
  try { await Promise.all([document.fonts.load('700 semi-expanded 40px Archivo'), document.fonts.load('600 40px Archivo')]); } catch {}

  /* ---------- son (coupé par défaut) ---------- */
  let snd = null;
  try { snd = createRouletteSound(); } catch {}
  if (snd) {
    const bt = document.createElement('button'); bt.type = 'button'; bt.className = 'rl-snd'; bt.setAttribute('aria-label', 'Son'); bt.setAttribute('aria-pressed', 'false');
    bt.innerHTML = '<svg viewBox="0 0 16 16" aria-hidden="true"><path class="rl-body" d="M2 6h2.6L8 3.2v9.6L4.6 10H2z"/><g class="rl-on"><path d="M10.4 5.6a3.4 3.4 0 0 1 0 4.8"/><path d="M12.3 3.8a6 6 0 0 1 0 8.4"/></g><g class="rl-off"><line x1="10.6" y1="6" x2="14" y2="10"/><line x1="14" y1="6" x2="10.6" y2="10"/></g></svg>';
    bt.addEventListener('click', () => { const on = bt.getAttribute('aria-pressed') !== 'true'; bt.setAttribute('aria-pressed', String(on)); try { on ? snd.enable() : snd.disable(); } catch {} });
    box.appendChild(bt);
  }

  /* ---------- rendu ---------- */
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.NeutralToneMapping;
  renderer.toneMappingExposure = 1.0;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  const canvas = renderer.domElement; canvas.className = 'rl-canvas';
  stage.appendChild(canvas);

  const scene = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environmentIntensity = 0.85;
  const camera = new THREE.PerspectiveCamera(26, 1, 0.1, 50);
  const ELEV = 52 * Math.PI / 180;

  const key = new THREE.DirectionalLight(0xfff6ea, 1.7);
  key.position.set(-1.6, 7, 2.4);
  key.castShadow = true;
  key.shadow.mapSize.set(2048, 2048);
  Object.assign(key.shadow.camera, { left: -2, right: 2, top: 2, bottom: -2, near: 1, far: 14 });
  key.shadow.radius = 6; key.shadow.bias = -0.0012; key.shadow.normalBias = 0.025;
  scene.add(key);
  const fill = new THREE.DirectionalLight(0xe8eefa, 0.35); fill.position.set(4, 3, 5); scene.add(fill);

  /* matériaux */
  // petites imperfections de surface (voile, traces de doigts, micro-rayures) pour éviter l'aspect « plastique 3D »
  const grain = (n, lines) => { const c = document.createElement('canvas'); c.width = c.height = 512; const x = c.getContext('2d');
    x.fillStyle = 'rgb(205,205,205)'; x.fillRect(0, 0, 512, 512);
    for (let k = 0; k < n; k++) { const v = 170 + Math.random() * 85 | 0; x.fillStyle = `rgba(${v},${v},${v},.25)`; x.beginPath(); x.ellipse(Math.random() * 512, Math.random() * 512, 8 + Math.random() * 60, 4 + Math.random() * 30, Math.random() * 3, 0, Math.PI * 2); x.fill(); }
    for (let k = 0; k < lines; k++) { const v = 150 + Math.random() * 105 | 0; x.strokeStyle = `rgba(${v},${v},${v},.35)`; x.lineWidth = 0.6 + Math.random(); x.beginPath(); const y = Math.random() * 512; x.moveTo(0, y); x.lineTo(512, y + (Math.random() - .5) * 40); x.stroke(); }
    const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(3, 2); return t; };
  const smudge = grain(260, 30), brushed = grain(40, 400);
  const lacquer = new THREE.MeshPhysicalMaterial({ color: COL.night, roughness: 0.48, roughnessMap: smudge, metalness: 0, clearcoat: 1, clearcoatRoughness: 0.09, clearcoatRoughnessMap: smudge });
  const lacquerTrack = new THREE.MeshPhysicalMaterial({ color: '#10223A', roughness: 0.55, roughnessMap: smudge, metalness: 0, clearcoat: 1, clearcoatRoughness: 0.14, clearcoatRoughnessMap: smudge, side: THREE.DoubleSide });
  const satin0 = new THREE.MeshStandardMaterial({ color: COL.night, roughness: 0.6, metalness: 0, side: THREE.DoubleSide });
  const brass = new THREE.MeshPhysicalMaterial({ color: COL.brass, roughness: 0.32, roughnessMap: brushed, metalness: 1, clearcoat: 0.4, clearcoatRoughness: 0.2 });
  const ivory = new THREE.MeshPhysicalMaterial({ color: '#FFFFFF', roughness: 0.1, metalness: 0, clearcoat: 1, clearcoatRoughness: 0.02, envMapIntensity: 1.25 });

  const wheel = new THREE.Group(); scene.add(wheel);
  const shade = m => { m.castShadow = true; m.receiveShadow = true; return m; };
  const lathe = (pts, mat, seg = 160) => shade(new THREE.Mesh(new THREE.LatheGeometry(pts.map(([x, y]) => new THREE.Vector2(x, y)), seg), mat));

  /* cuvette : piste de la bille, puis bord laqué arrondi */
  wheel.add(lathe([[1.004, -0.11], [1.0, -0.012]], satin0), lathe([[1.0, -0.012], [TRACK[0], 0.02]], lacquerTrack), lathe([[TRACK[0], 0.02], [TRACK[1], trackY(TRACK[1])]], lacquerTrack));
  wheel.add(lathe([[1.25, 0.1], [1.258, 0.128], [1.275, 0.146], [1.39, 0.152], [1.43, 0.144], [1.455, 0.118], [1.466, 0.07], [1.47, -0.05], [1.465, -0.22], [1.45, -0.3], [1.425, -0.335], [1.41, BASE + 0.012], [1.0, BASE]], lacquer));
  const torus = (r, t, y, mat = brass) => { const m = shade(new THREE.Mesh(new THREE.TorusGeometry(r, t, 16, 220), mat)); m.rotation.x = Math.PI / 2; m.position.y = y; return m; };
  wheel.add(torus(1.262, 0.009, 0.132), torus(1.452, 0.007, 0.112), torus(1.452, 0.006, -0.3));
  /* déflecteurs en losange sur la piste */
  for (let k = 0; k < 8; k++) {
    const a = k / 8 * Math.PI * 2 + Math.PI / 8, r = 1.15;
    // alternance : losange couché le long de la course, losange dressé en travers
    const tall = k % 2 === 1, d = shade(new THREE.Mesh(new THREE.OctahedronGeometry(0.03, 0), brass));
    if (tall) { d.scale.set(0.7, 1.15, 1.25); d.position.set(Math.cos(a) * r, trackY(r) + 0.028, Math.sin(a) * r); }
    else { d.scale.set(1.9, 0.55, 0.75); d.position.set(Math.cos(a) * r, trackY(r) + 0.012, Math.sin(a) * r); }
    d.rotation.y = -a;
    wheel.add(d);
  }

  /* cylindre tournant */
  const rotor = new THREE.Group(); wheel.add(rotor);
  const S = 2048, tex = document.createElement('canvas'), mr = document.createElement('canvas');
  tex.width = tex.height = mr.width = mr.height = S;
  const map = new THREE.CanvasTexture(tex); map.colorSpace = THREE.SRGBColorSpace; map.anisotropy = renderer.capabilities.getMaxAnisotropy();
  const mrMap = new THREE.CanvasTexture(mr); mrMap.anisotropy = map.anisotropy;
  const face = new THREE.MeshPhysicalMaterial({ map, roughnessMap: mrMap, metalnessMap: mrMap, roughness: 1, metalness: 1, clearcoat: 0.85, clearcoatRoughness: 0.06 });
  const planar = geo => { const p = geo.attributes.position, uv = geo.attributes.uv; for (let i = 0; i < p.count; i++) uv.setXY(i, (p.getX(i) + 1) / 2, (p.getY(i) + 1) / 2); geo.rotateX(-Math.PI / 2); return geo; };
  const ring = shade(new THREE.Mesh(planar(new THREE.RingGeometry(R_RING[0], R_RING[1], 220, 1)), face));
  const pockets = shade(new THREE.Mesh(planar(new THREE.RingGeometry(R_POCK[0], R_POCK[1], 220, 1)), face)); pockets.position.y = FLOOR;
  rotor.add(ring, pockets);
  const wall = (r, y0, y1, mat) => { const m = shade(new THREE.Mesh(new THREE.CylinderGeometry(r, r, y1 - y0, 220, 1, true), mat)); m.position.y = (y0 + y1) / 2; m.material.side = THREE.DoubleSide; return m; };
  const satin = new THREE.MeshStandardMaterial({ color: COL.night, roughness: 0.55, metalness: 0 });
  rotor.add(wall(R_POCK[1], FLOOR, 0, satin.clone()), wall(1.0, -0.12, 0, satin.clone()));
  // fond de cuvette sous le cylindre : rien ne doit laisser voir le papier entre la piste et le cylindre
  const well = new THREE.Mesh(new THREE.CircleGeometry(1.03, 96), satin); well.rotation.x = -Math.PI / 2; well.position.y = -0.11; wheel.add(well);
  /* cône central : laque soleillée comme un cadran de montre, filets de laiton concentriques */
  const sun = document.createElement('canvas'); sun.width = sun.height = 1024;
  { const x = sun.getContext('2d'); x.fillStyle = COL.night; x.fillRect(0, 0, 1024, 1024); x.translate(512, 512);
    for (let k = 0; k < 360; k++) { const a = k / 360 * Math.PI * 2; x.strokeStyle = k % 2 ? 'rgba(60,92,140,.10)' : 'rgba(0,0,0,.10)'; x.lineWidth = 3; x.beginPath(); x.moveTo(0, 0); x.lineTo(Math.cos(a) * 520, Math.sin(a) * 520); x.stroke(); }
    const g = x.createRadialGradient(0, 0, 0, 0, 0, 512); g.addColorStop(0, 'rgba(255,255,255,.04)'); g.addColorStop(1, 'rgba(0,0,0,.12)'); x.fillStyle = g; x.fillRect(-512, -512, 1024, 1024); }
  const sunMap = new THREE.CanvasTexture(sun); sunMap.colorSpace = THREE.SRGBColorSpace; sunMap.anisotropy = map.anisotropy;
  const coneMat = new THREE.MeshPhysicalMaterial({ color: '#ffffff', map: sunMap, roughness: 0.38, metalness: 0, clearcoat: 1, clearcoatRoughness: 0.06 });
  const cone = lathe([[R_POCK[0], FLOOR], [0.5, 0.012], [0.44, 0.032], [0.3, 0.07], [0.16, 0.095], [0.05, 0.104], [0.0, 0.105]], coneMat);
  { const p = cone.geometry.attributes.position, uv = cone.geometry.attributes.uv; for (let i = 0; i < p.count; i++) uv.setXY(i, p.getX(i) + .5, p.getZ(i) + .5); }
  rotor.add(cone, torus(0.4, 0.0035, 0.043), torus(0.155, 0.0035, 0.096));
  rotor.add(torus(0.5, 0.006, 0.012));
  /* frettes de laiton entre les cases */
  for (let i = 0; i < N; i++) {
    // cloisons de laiton : elles dépassent le bord de la couronne
    const a = i * STEP + STEP / 2, fh = FRET_TOP - FLOOR, f = shade(new THREE.Mesh(new THREE.BoxGeometry(R_POCK[1] - R_POCK[0] + 0.006, fh, 0.008), brass));
    f.position.set(Math.cos(a) * (R_POCK[0] + R_POCK[1]) / 2, FLOOR + fh / 2, Math.sin(a) * (R_POCK[0] + R_POCK[1]) / 2); f.rotation.y = -a;
    rotor.add(f);
  }
  /* tourniquet */
  const turret = new THREE.Group(); turret.position.y = 0.1; rotor.add(turret);
  turret.add(lathe([[0.075, 0], [0.07, 0.012], [0.03, 0.03], [0.022, 0.07], [0.03, 0.1], [0.026, 0.13], [0.016, 0.145], [0, 0.15]], brass, 64));
  for (let k = 0; k < 4; k++) {
    const a = k * Math.PI / 2, arm = shade(new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.011, 0.2, 24), brass));
    arm.rotation.z = Math.PI / 2; arm.position.set(0.1, 0, 0);
    const knob = shade(new THREE.Mesh(new THREE.SphereGeometry(0.022, 32, 16), brass)); knob.position.set(0.2, 0, 0);
    const g = new THREE.Group(); g.add(arm, knob); g.position.y = 0.1; g.rotation.y = a; turret.add(g);
  }
  const top = shade(new THREE.Mesh(new THREE.SphereGeometry(0.02, 32, 16), brass)); top.position.y = 0.16; turret.add(top);

  /* bille : résine blanche très brillante ; un filet de moulage gris perle pour que sa rotation se lise */
  const bt = document.createElement('canvas'); bt.width = 512; bt.height = 256;
  { const x = bt.getContext('2d'); x.fillStyle = '#FFFFFF'; x.fillRect(0, 0, 512, 256);
    x.fillStyle = 'rgba(150,158,170,.55)'; x.fillRect(0, 125, 512, 5);
    x.fillStyle = 'rgba(150,158,170,.45)'; x.beginPath(); x.arc(128, 58, 10, 0, Math.PI * 2); x.arc(384, 198, 10, 0, Math.PI * 2); x.fill(); }
  const ballMap = new THREE.CanvasTexture(bt); ballMap.colorSpace = THREE.SRGBColorSpace;
  ivory.map = ballMap;
  const ball = shade(new THREE.Mesh(new THREE.SphereGeometry(BALL, 48, 24), ivory)); wheel.add(ball);
  // liseré d'ombre très fin autour de la bille : elle se détache sur l'émail papier comme sur le bleu nuit
  const halo = new THREE.Mesh(new THREE.SphereGeometry(BALL * 1.07, 32, 16), new THREE.MeshBasicMaterial({ color: '#0B1B2E', side: THREE.BackSide, transparent: true, opacity: 0.32, depthWrite: false }));
  ball.add(halo);
  // flou de mouvement : un fantôme étiré dans l'axe de la vitesse, comme une pose de 1/50 s
  const streak = new THREE.Mesh(new THREE.SphereGeometry(BALL, 32, 16), new THREE.MeshBasicMaterial({ color: '#C9D0D8', transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending }));
  wheel.add(streak);
  const bs = document.createElement('canvas'); bs.width = bs.height = 128;
  { const x = bs.getContext('2d'), g = x.createRadialGradient(64, 64, 0, 64, 64, 64); g.addColorStop(0, 'rgba(0,0,0,1)'); g.addColorStop(.35, 'rgba(0,0,0,.55)'); g.addColorStop(1, 'rgba(0,0,0,0)'); x.fillStyle = g; x.fillRect(0, 0, 128, 128); }
  const ballShadow = new THREE.Mesh(new THREE.PlaneGeometry(BALL * 2.7, BALL * 2.7), new THREE.MeshBasicMaterial({ color: '#06101C', transparent: true, opacity: 0.62, alphaMap: new THREE.CanvasTexture(bs), depthWrite: false, polygonOffset: true, polygonOffsetFactor: -4 }));
  ballShadow.rotation.x = -Math.PI / 2; ballShadow.renderOrder = 2; wheel.add(ballShadow);

  /* noms des cases : une plaquette par nom, qui se retourne au passage de la verticale pour se lire toujours de gauche à droite */
  const atlas = document.createElement('canvas'); atlas.width = 2048; atlas.height = 1024;
  const atlasTex = new THREE.CanvasTexture(atlas); atlasTex.colorSpace = THREE.SRGBColorSpace; atlasTex.anisotropy = renderer.capabilities.getMaxAnisotropy();
  const labelMat = new THREE.MeshStandardMaterial({ map: atlasTex, transparent: true, roughness: 0.42, metalness: 0, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2 });
  const CW = 640, CH = 128, labels = [];
  for (let i = 0; i < N; i++) {
    const geo = new THREE.PlaneGeometry(CW / 2048, CH / 2048), uv = geo.attributes.uv, col = i % 3, row = Math.floor(i / 3);
    const u0 = col * CW / 2048, u1 = u0 + CW / 2048, v1 = 1 - row * CH / 1024, v0 = v1 - CH / 1024;
    for (let k = 0; k < uv.count; k++) uv.setXY(k, uv.getX(k) ? u1 : u0, uv.getY(k) ? v1 : v0);
    geo.rotateX(-Math.PI / 2);
    const m = new THREE.Mesh(geo, labelMat); m.position.set(0.792, 0.0015, 0); m.renderOrder = 1;
    m.userData.f = m.userData.to = Math.cos(i * STEP - 0.4) < 0 ? -1 : 1;
    const g = new THREE.Group(); g.rotation.y = -i * STEP; g.add(m); rotor.add(g); labels.push(m);
  }

  /* sol : ombre portée + ombre de contact */
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(9, 9), new THREE.ShadowMaterial({ color: '#0B1B2E', opacity: 0.11 }));
  ground.rotation.x = -Math.PI / 2; ground.position.y = BASE; ground.receiveShadow = true; wheel.add(ground);
  const cs = document.createElement('canvas'); cs.width = cs.height = 256;
  { const x = cs.getContext('2d'), g = x.createRadialGradient(128, 128, 0, 128, 128, 128);
    g.addColorStop(0, 'rgba(0,0,0,1)'); g.addColorStop(.52, 'rgba(0,0,0,.9)'); g.addColorStop(.62, 'rgba(0,0,0,.35)'); g.addColorStop(.8, 'rgba(0,0,0,.08)'); g.addColorStop(1, 'rgba(0,0,0,0)');
    x.fillStyle = g; x.fillRect(0, 0, 256, 256); }
  const contact = new THREE.Mesh(new THREE.PlaneGeometry(4.2, 4.2), new THREE.MeshBasicMaterial({ color: '#0B1B2E', transparent: true, opacity: 0.3, alphaMap: new THREE.CanvasTexture(cs), depthWrite: false }));
  contact.rotation.x = -Math.PI / 2; contact.position.y = BASE + 0.001; wheel.add(contact);

  /* ---------- gravure du cylindre (couleur + carte laiton/vernis) ---------- */
  let hoverIdx = -1, selIdx = -1;
  const draw = () => {
    const c = tex.getContext('2d'), m = mr.getContext('2d'), C = S / 2, K = S / 2;
    const filter = box.dataset.filter;
    c.setTransform(1, 0, 0, 1, 0, 0); m.setTransform(1, 0, 0, 1, 0, 0);
    c.fillStyle = COL.night; c.fillRect(0, 0, S, S);
    m.fillStyle = 'rgb(0,100,0)'; m.fillRect(0, 0, S, S);
    c.translate(C, C); m.translate(C, C);
    const sector = (ctx, i, r0, r1, inset = 0) => { const a = i * STEP, h = STEP / 2 - inset; ctx.beginPath(); ctx.arc(0, 0, r1 * K, a - h, a + h); ctx.arc(0, 0, r0 * K, a + h, a - h, true); ctx.closePath(); };
    CASES.forEach((p, i) => {
      const dim = filter && filter !== 'all' && p.type !== filter, sel = i === selIdx;
      const bg = sel ? '#D3B472' : dim ? '#13253C' : p.type === 'club' ? COL.red : i % 2 ? COL.night : COL.paper;
      sector(c, i, R_POCK[0] - 0.01, 1.0); c.fillStyle = bg; c.fill();
      if (i === hoverIdx && i !== selIdx) { c.fillStyle = 'rgba(201,168,98,.16)'; c.fill(); }
      /* filet de couleur du type au bord */
      sector(c, i, 0.958, 0.982, 0.012); c.fillStyle = dim ? 'rgba(201,168,98,.18)' : (p.type === 'club' ? '#E9DFC8' : TYPE[p.type]); c.fill();
      /* nom court, dans l'atlas des plaquettes */
      const a = atlas.getContext('2d'), cx = (i % 3) * CW + CW / 2, cy = Math.floor(i / 3) * CH + CH / 2;
      if (i === 0) a.clearRect(0, 0, atlas.width, atlas.height);
      const label = p.short.toUpperCase();
      let fs = 80; a.font = `700 semi-expanded ${fs}px Archivo`; a.letterSpacing = '10px';
      const w = a.measureText(label).width, room = 0.3 * 2048;
      if (w > room) { fs = Math.floor(fs * room / w); a.font = `700 semi-expanded ${fs}px Archivo`; }
      a.textAlign = 'center'; a.textBaseline = 'middle';
      a.fillStyle = bg === COL.paper || sel ? COL.night : '#EFE8D8';
      a.globalAlpha = dim ? 0.28 : 1;
      a.fillText(label, cx, cy + 3);
      a.globalAlpha = 1;
    });
    /* filets de laiton */
    const goldLines = (ctx, col) => {
      ctx.strokeStyle = col; ctx.lineWidth = 3.2;
      for (let i = 0; i < N; i++) { const a = i * STEP + STEP / 2; ctx.beginPath(); ctx.moveTo(Math.cos(a) * R_RING[0] * K, Math.sin(a) * R_RING[0] * K); ctx.lineTo(Math.cos(a) * 0.997 * K, Math.sin(a) * 0.997 * K); ctx.stroke(); }
      [[R_RING[0] + 0.004, 5], [0.94, 2.4], [0.995, 7]].forEach(([r, lw]) => { ctx.lineWidth = lw; ctx.beginPath(); ctx.arc(0, 0, r * K, 0, Math.PI * 2); ctx.stroke(); });
      if (selIdx >= 0 && ctx === m) { ctx.fillStyle = 'rgb(0,95,235)'; sector(ctx, selIdx, R_POCK[0] - 0.01, 0.955); ctx.fill(); }
    };
    goldLines(c, COL.brass);
    goldLines(m, 'rgb(0,72,255)');
    map.needsUpdate = true; mrMap.needsUpdate = true; atlasTex.needsUpdate = true;
  };
  draw();

  /* ---------- fiche ---------- */
  const panel = document.createElement('div'); panel.className = 'rl-panel'; panel.setAttribute('aria-live', 'polite');
  panel.innerHTML = '<a class="rl-card" target="_blank" rel="noopener"><span class="rl-ph"></span><i class="rl-rule"></i><span class="rl-txt"><span><b class="rl-name"></b><span class="rl-city"></span></span><svg class="rl-fr" aria-hidden="true"><path/><circle r="2.6"/></svg></span></a>';
  box.appendChild(panel);
  const card = panel.querySelector('.rl-card'), ph = panel.querySelector('.rl-ph');
  /* mini-carte de France, au trait */
  const FP = (lon, lat) => [(lon - 2.9) * .69, -(lat - 46.4)];
  let fx0 = Infinity, fx1 = -Infinity, fy0 = Infinity, fy1 = -Infinity;
  FRANCE.forEach(([lo, la]) => { const [x, y] = FP(lo, la); fx0 = Math.min(fx0, x); fx1 = Math.max(fx1, x); fy0 = Math.min(fy0, y); fy1 = Math.max(fy1, y); });
  const fr = panel.querySelector('.rl-fr'), fs = Math.max(fx1 - fx0, fy1 - fy0);
  fr.setAttribute('viewBox', `${fx0 - .2} ${fy0 - .2} ${fs + .4} ${fs + .4}`);
  fr.querySelector('path').setAttribute('d', 'M' + FRANCE.map(([lo, la]) => FP(lo, la).map(v => v.toFixed(2)).join(' ')).join('L') + 'Z');
  fr.querySelector('circle').setAttribute('r', (fs * 0.045).toFixed(2));
  const showPanel = i => {
    const p = CASES[i];
    panel.style.setProperty('--rl-c', TYPE[p.type]);
    panel.querySelector('.rl-name').textContent = p.name;
    panel.querySelector('.rl-city').textContent = p.city;
    if (p.url) card.href = p.url; else card.removeAttribute('href');
    const [x, y] = FP(p.lon, p.lat); const c = fr.querySelector('circle'); c.setAttribute('cx', x.toFixed(2)); c.setAttribute('cy', y.toFixed(2));
    const src = PHOTO[p.name] ? IMG + PHOTO[p.name] : '';
    const old = [...ph.querySelectorAll('img')];
    if (src && !old.some(im => im.dataset.src === src && im.classList.contains('rl-in'))) {
      const im = new Image(); im.alt = ''; im.dataset.src = src; im.decoding = 'async';
      im.onload = () => requestAnimationFrame(() => { im.classList.add('rl-in'); setTimeout(() => old.forEach(o => o.remove()), 520); });
      im.src = src; ph.appendChild(im);
    }
    panel.classList.add('rl-open'); box.classList.add('rl-sel');
  };
  const hidePanel = () => { panel.classList.remove('rl-open'); box.classList.remove('rl-sel'); };

  /* ---------- mise en page ---------- */
  let W = 1, H = 1, Wc = 1, offX = 0, offY = 0, panelAt = null, camDist = 7, camAz = 0, camEl = 0;
  const mobile = () => W < 520;
  const layout = () => {
    W = stage.clientWidth; H = stage.clientHeight; if (!W || !H) return;
    const st = stage.getBoundingClientRect(), bx = box.getBoundingClientRect();
    // sur grand écran, la toile déborde à droite de la zone : la roue se décale vers le bord et laisse à gauche la place de la fiche
    const extR = mobile() ? 0 : Math.max(0, Math.min(170, innerWidth - st.right - 10));
    const shift = mobile() ? 0 : Math.min(W * .11, extR * .7);
    Wc = W + extR;
    canvas.style.width = Wc + 'px';
    renderer.setSize(Wc, H, false);
    camera.aspect = Wc / H;
    const fitX = (mobile() ? 0.93 : 0.86) * W / Wc, fitY = mobile() ? 0.98 : 0.9, pts = [];
    for (let k = 0; k < 48; k++) { const a = k / 48 * Math.PI * 2; pts.push(new THREE.Vector3(Math.cos(a) * 1.47, 0.15, Math.sin(a) * 1.47), new THREE.Vector3(Math.cos(a) * 1.44, BASE, Math.sin(a) * 1.44)); }
    let dist = 7;
    const place = () => { camera.position.set(0, Math.sin(ELEV) * dist, Math.cos(ELEV) * dist); camera.lookAt(0, -0.02, 0); camera.clearViewOffset(); camera.updateProjectionMatrix(); camera.updateMatrixWorld(); };
    for (let it = 0; it < 4; it++) {
      place();
      let ex = 0, ey = 0; pts.forEach(v => { const q = v.clone().project(camera); ex = Math.max(ex, Math.abs(q.x)); ey = Math.max(ey, Math.abs(q.y)); });
      dist *= Math.max(ex / fitX, ey / fitY);
    }
    place(); camDist = dist;
    let y0 = 1, y1 = -1; pts.forEach(v => { const q = v.clone().project(camera); y0 = Math.min(y0, q.y); y1 = Math.max(y1, q.y); });
    offY = ((y0 + y1) / 2) * H / 2; // recentre verticalement l'ellipse
    offX = extR / 2 - shift;
    camera.setViewOffset(Wc, H, offX, offY, Wc, H); camera.updateProjectionMatrix();
    panelAt = { l: st.left - bx.left, t: st.top - bx.top, w: W, h: H };
    placePanel();
  };
  const placePanel = () => {
    if (!panelAt) return;
    const { l, t, w, h } = panelAt;
    if (mobile()) { Object.assign(panel.style, { left: l + 'px', width: w + 'px', top: (t + h - 4) + 'px', bottom: 'auto' }); return; }
    Object.assign(panel.style, { width: '', bottom: 'auto', top: (t + h - 300) + 'px', left: (l - 6) + 'px' });
  };
  new ResizeObserver(layout).observe(stage); layout();

  /* ---------- mouvement : une bille simulée, un cylindre lourd ---------- */
  let B = newBall(), run = null, pendingSel = -1, held = false, idleT = 0;
  const restLam = i => (i - 0.5) * STEP + (BALL + 0.0045) / B.r; // au repos, contre la frette côté entraînement
  B.lam = restLam(Math.floor(Math.random() * N)); B.om = reduceMotion ? 0 : 0.05; B.th = B.lam - B.psi;
  const avoidPanel = e => !mobile() && Math.cos(e.th) < -0.2 && Math.sin(e.th) > -0.35; // ne pas finir sous la fiche
  const startRun = (target, power) => {
    B.held = held;
    const plan = planRun(B, target, { power, avoid: target >= 0 ? avoidPanel : null });
    if (plan) { B = plan; B.ev = []; run = { target }; }
  };
  const settle = () => {
    const t = run && run.target;
    run = null; idleT = 0;
    if (t >= 0 && t === pendingSel) {
      if (pocketOf(B.lam) !== t) { startRun(t, 'short'); return; } // filet de sécurité : un nouveau tour
      selIdx = t; draw(); placePanel(); showPanel(t);
    }
  };

  const select = i => {
    if (i === pendingSel) return;
    pendingSel = i;
    if (selIdx >= 0) { selIdx = -1; draw(); }
    hidePanel();
    if (i < 0) { if (!run || run.target >= 0) run = null; return; }
    if (reduceMotion || (B.ph === 'rest' && pocketOf(B.lam) === i)) {
      // sans animation, ou si la bille est déjà dans la case : la fiche s'ouvre tout de suite
      B.ph = 'rest'; B.r = R_POCK[1] - BALL - 0.003; B.h = FLOOR; B.lam = restLam(i); B.th = B.lam - B.psi; selIdx = i; draw(); placePanel(); showPanel(i); run = null; return;
    }
    startRun(i, 'short');
  };

  /* ---------- survol et clic ---------- */
  const ray = new THREE.Raycaster(), ndc = new THREE.Vector2(), plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0), hit = new THREE.Vector3();
  const pick = e => {
    const r = canvas.getBoundingClientRect();
    ndc.set((e.clientX - r.left) / r.width * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
    ray.setFromCamera(ndc, camera);
    if (!ray.ray.intersectPlane(plane, hit)) return -1;
    const rr = Math.hypot(hit.x, hit.z); if (rr < R_POCK[0] - 0.02 || rr > R_RING[1] + 0.03) return -1;
    const a = Math.atan2(hit.z, hit.x) + B.psi;
    return ((Math.round(a / STEP) % N) + N) % N;
  };
  let dwell = 0, leaveT = 0;
  const setHover = i => { if (i === hoverIdx) return; hoverIdx = i; canvas.classList.toggle('rl-point', i >= 0); draw(); };
  canvas.addEventListener('pointermove', e => {
    if (e.pointerType === 'touch') return;
    const i = pick(e); clearTimeout(leaveT);
    if (i >= 0) held = true;
    setHover(i);
    clearTimeout(dwell);
    if (i >= 0 && i !== selIdx) dwell = setTimeout(() => select(i), selIdx >= 0 ? 90 : 160);
  });
  const leave = () => { clearTimeout(dwell); leaveT = setTimeout(() => { held = false; setHover(-1); select(-1); }, 450); };
  canvas.addEventListener('pointerleave', e => { if (e.pointerType !== 'touch') leave(); });
  panel.addEventListener('pointerenter', () => clearTimeout(leaveT));
  panel.addEventListener('pointerleave', leave);
  canvas.addEventListener('click', e => { const i = pick(e); if (i >= 0) { held = true; select(i); } else { held = false; select(-1); } });

  /* légende : survol = aperçu du filtre, clic = filtre posé */
  let sticky = '';
  const legend = [...box.querySelectorAll('.hs-legend li')];
  const markLegend = () => legend.forEach(li => li.classList.toggle('rl-act', li.dataset.type === sticky));
  legend.forEach(li => {
    li.addEventListener('mouseenter', () => { box.dataset.filter = li.dataset.type; });
    li.addEventListener('mouseleave', () => { if (sticky) box.dataset.filter = sticky; else delete box.dataset.filter; });
    li.addEventListener('click', () => { sticky = sticky === li.dataset.type ? '' : li.dataset.type; if (sticky) box.dataset.filter = sticky; else delete box.dataset.filter; markLegend(); });
  });
  new MutationObserver(draw).observe(box, { attributes: true, attributeFilter: ['data-filter'] });

  /* page Nos destinations : l'annuaire lance la bille dans la case de l'établissement survolé */
  document.addEventListener('dest:hover', e => {
    const i = e.detail ? CASES.findIndex(p => p.name === e.detail) : -1;
    held = i >= 0; select(i);
  });
  document.addEventListener('dest:filter', e => { sticky = e.detail === 'all' ? '' : e.detail; if (sticky) box.dataset.filter = sticky; else delete box.dataset.filter; markLegend(); });

  /* le défilement de la page entraîne doucement le cylindre */
  let lastY = scrollY;
  addEventListener('scroll', () => { const dy = scrollY - lastY; lastY = scrollY; if (reduceMotion || run || pendingSel >= 0) return; B.psi += dy * 0.0009; }, { passive: true });

  /* ---------- boucle ---------- */
  // la boucle reste légère hors écran : on ne calcule ni ne dessine tant que la roue n'est pas visible
  let launched = false, last = performance.now();
  const onScreen = () => { const r = box.getBoundingClientRect(); return r.bottom > -100 && r.top < innerHeight + 100 && r.width > 0; };
  const launch = () => {
    if (launched) return; launched = true;
    box.classList.add('live');
    if (reduceMotion) return;
    // le lancer d'ouverture : cylindre lancé, bille jetée fort sur la piste haute
    startRun(-1, 'long');
    CASES.forEach(p => { if (PHOTO[p.name]) { const im = new Image(); im.src = IMG + PHOTO[p.name]; } });
  };
  const spinQ = new THREE.Quaternion(), spinAxis = new THREE.Vector3(), spin = new THREE.Vector3(), up = new THREE.Vector3(0, 1, 0), vel = new THREE.Vector3(), roll = new THREE.Vector3(), xAxis = new THREE.Vector3(1, 0, 0);
  let acc = 0, wasOff = false;
  const placeBall = dt => {
    const c = Math.cos(B.th), sn = Math.sin(B.th);
    ball.position.set(c * B.r, B.h + BALL, sn * B.r);
    // vitesse réelle (monde) et vitesse de roulement par rapport à la surface porteuse
    const onRotor = B.ph === 'rotor', wWorld = onRotor ? B.wl - B.om : B.ph === 'free' ? B.w : 0;
    vel.set(-sn * wWorld * B.r + c * B.vr, B.ph === 'rest' ? 0 : B.vy, c * wWorld * B.r + sn * B.vr);
    if (B.contact && (B.ph === 'free' || onRotor)) {
      const vt = onRotor ? B.wl * B.r : B.r >= R_RING[1] ? B.w * B.r : (B.w + B.om) * B.r;
      roll.set(-sn * vt + c * B.vr, 0, c * vt + sn * B.vr);
      spin.crossVectors(up, roll).multiplyScalar(1 / BALL);
    } else if (B.ph === 'rest') spin.multiplyScalar(Math.exp(-dt * 6));
    const sp = spin.length();
    if (sp > 1e-4) { spinAxis.copy(spin).multiplyScalar(1 / sp); spinQ.setFromAxisAngle(spinAxis, Math.min(sp * dt, 1.2)); ball.quaternion.premultiply(spinQ); }
    // flou de mouvement : longueur = vitesse × temps de pose
    const v = vel.length(), len = v / 50;
    if (len > BALL * 0.6 && B.ph !== 'rest') {
      vel.multiplyScalar(1 / v);
      streak.visible = true;
      streak.position.copy(ball.position).addScaledVector(vel, -len * 0.5);
      streak.quaternion.setFromUnitVectors(xAxis, vel);
      streak.scale.set(1 + len / (2 * BALL), 0.92, 0.92);
      streak.material.opacity = Math.min(0.42, (len / BALL - 0.6) * 0.25);
    } else streak.visible = false;
    // ombre de contact : nette au contact, elle s'écarte et se diffuse quand la bille saute
    const hs = B.ph === 'rest' ? FLOOR : onRotor ? (B.r < R_POCK[1] ? FLOOR : 0) : B.ph === 'lift' ? Math.min(B.h, surf(B.r)) : surf(B.r), lift = Math.max(0, B.h - hs);
    ballShadow.position.set(c * B.r - lift * 0.3, hs + 0.0012, sn * B.r + lift * 0.12);
    ballShadow.scale.setScalar(1 + lift * 9);
    ballShadow.material.opacity = 0.62 / (1 + lift * 30);
    // son : roulement continu et chocs
    if (snd) {
      const rv = !B.contact || B.ph === 'rest' || B.ph === 'lift' ? 0 : onRotor ? Math.min(1, Math.abs(B.wl) * B.r / 3) : Math.min(1, B.w * B.r / 16);
      snd.roll(rv);
      if (B.ev && B.ev.length) { B.ev.slice(0, 6).forEach(([k, i]) => snd.hit(i, k)); B.ev.length = 0; }
    }
  };
  const frame = now => {
    requestAnimationFrame(frame);
    if (document.hidden || !onScreen()) { last = now; if (snd && !wasOff) { snd.stop(); wasOff = true; } return; }
    wasOff = false;
    if (!launched) { const r = box.getBoundingClientRect(), vis = Math.min(r.bottom, innerHeight) - Math.max(r.top, 0); if (reduceMotion || vis > r.height * .25) launch(); }
    const dt = Math.min(0.1, (now - last) / 1000); last = now;
    if (!reduceMotion) {
      B.held = held;
      acc += dt; let n = 0;
      // pas fixe ; si l'onglet ralentit, on plafonne les sous-pas (le temps ralentit plutôt que d'exploser)
      while (acc >= SIM_DT && n < 30) { stepBall(B, SIM_DT); acc -= SIM_DT; n++; if (run && B.ph === 'rest') settle(); }
      if (n >= 30) acc = 0;
      // tour automatique discret quand la roue est laissée au repos
      if (!run && pendingSel < 0 && !held && B.ph === 'rest' && launched) { idleT += dt; if (idleT > 14) { idleT = 0; startRun(-1, 'short'); } }
    }
    rotor.rotation.y = B.psi;
    // chaque nom se retourne d'un geste bref quand il passe la verticale (avec une marge, pour ne pas hésiter)
    for (let i = 0; i < N; i++) {
      const L = labels[i], c = Math.cos(i * STEP - B.psi);
      if (Math.abs(B.om) < 1.2) { if (c > 0.05) L.userData.to = 1; else if (c < -0.05) L.userData.to = -1; } // cylindre lancé : on ne retourne rien
      const f = L.userData.f += Math.sign(L.userData.to - L.userData.f) * Math.min(Math.abs(L.userData.to - L.userData.f), dt / 0.2);
      const e = Math.sign(f) * Math.sin(Math.min(1, Math.abs(f)) * Math.PI / 2) || 0.001;
      L.scale.set(e, 1, e);
    }
    placeBall(dt);
    // suivi de caméra très léger pendant la chute et le cliquetis, puis retour
    const follow = run && !reduceMotion && (B.ph === 'rotor' || (B.ph === 'free' && B.r < RT - 0.02));
    const tAz = follow ? Math.max(-1, Math.min(1, Math.cos(B.th) * 1.2)) * 0.05 : 0, tEl = follow ? -0.03 : 0, kc = 1 - Math.exp(-dt * 1.3);
    camAz += (tAz - camAz) * kc; camEl += (tEl - camEl) * kc;
    const el = ELEV + camEl;
    camera.position.set(Math.sin(camAz) * Math.cos(el) * camDist, Math.sin(el) * camDist, Math.cos(camAz) * Math.cos(el) * camDist); camera.lookAt(0, -0.02, 0);
    renderer.render(scene, camera);
  };
  B.th = B.lam - B.psi; rotor.rotation.y = B.psi; placeBall(0); renderer.render(scene, camera);
  requestAnimationFrame(frame);
  box.classList.add('ready');
}
