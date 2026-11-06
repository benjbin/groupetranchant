/* Groupe Tranchant — carte des implantations, variante E : « La mise ».
   Vingt-deux jetons de table, un par établissement, posés en rosace sur le papier de la page et photographiés en studio.
   Jetons d'argile bleu nuit, inserts de tranche et liseré à la couleur du type (casino bleu, club rouge, hôtel jaune),
   centre ivoire où le nom court est imprimé en capitales Archivo. Au centre, une petite pile de jetons GT de la maison.
   Au survol, au clic, au clavier ou via dest:hover, le jeton se soulève, se retourne en l'air et se pose sur la pile
   comme une mise ; la fiche s'ouvre alors (photo, nom, ville, situation discrète en France).
   Le jeton (textures, argile, bague d'or) vient du kit partagé jeton-portail.js. */
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { PLACES, PHOTO, IMG, FRANCE } from './data.js';
import { chipKit } from './jeton-portail.js';
import { createChipSound } from './roulette-sound.js';

/* ordre des jetons : le club d'abord, puis le tour du groupe, chaque hôtel à côté de son casino */
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
const N = CASES.length;

const COL = { night: '#0B1B2E', paper: '#F3EEE3', ivory: '#F3ECDD', blue: '#335F94', yellow: '#F9C83B', gold: '#C9A45C' };
const TYPE = { casino: COL.blue, club: '#BA2637', hotel: COL.yellow };

/* géométrie (unités monde : 1 = diamètre d'un jeton) */
const PI = Math.PI, TAU = PI * 2;
const RD = 0.5;                                  // rayon d'un jeton
const NIN = Math.min(8, N), NOUT = N - NIN;      // rosace : 8 jetons au cœur, le reste autour
const R_IN = 1.4, R_OUT = Math.max(2.42, NOUT * 1.08 / TAU);
const PILE = 3;                                  // jetons GT de la maison, au centre
const clamp01 = x => Math.min(1, Math.max(0, x));
const seg = (x, a, b) => clamp01((x - a) / (b - a)), sm = x => x * x * (3 - 2 * x);
const HOME = CASES.map((_, i) => {
  const inner = i < NIN, k = inner ? i : i - NIN, n = inner ? NIN : NOUT, r = inner ? R_IN : R_OUT;
  const a = PI / 2 + (k + (inner ? 0 : 0.5)) / n * TAU;     // le club devant, au cœur ; le tour continue dans le sens des aiguilles vu d'en haut
  return new THREE.Vector3(Math.cos(a) * r, 0, Math.sin(a) * r);
});

const CSS = `
.hstrat-map.rl-on .hs-stage{display:block;perspective:none}
.rl-canvas{position:absolute;top:0;left:0;height:100%;display:block;opacity:0;transform:translateY(18px);transition:opacity 1.6s var(--ease),transform 1.8s var(--ease);cursor:default;outline:none}
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
.hstrat-map.rl-on .hs-legend{gap:26px;bottom:22px;left:var(--rl-lx,50%);transition:opacity .4s}
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
  try { await Promise.all([document.fonts.load('700 semi-expanded 40px Archivo'), document.fonts.load('600 40px Archivo'), document.fonts.load('800 40px Archivo')]); } catch {}

  /* ---------- son (coupé par défaut) ---------- */
  let snd = null;
  try { snd = createChipSound(); } catch {}
  if (snd) {
    const bt = document.createElement('button'); bt.type = 'button'; bt.className = 'rl-snd'; bt.setAttribute('aria-label', 'Son'); bt.setAttribute('aria-pressed', 'false');
    bt.innerHTML = '<svg viewBox="0 0 16 16" aria-hidden="true"><path class="rl-body" d="M2 6h2.6L8 3.2v9.6L4.6 10H2z"/><g class="rl-on"><path d="M10.4 5.6a3.4 3.4 0 0 1 0 4.8"/><path d="M12.3 3.8a6 6 0 0 1 0 8.4"/></g><g class="rl-off"><line x1="10.6" y1="6" x2="14" y2="10"/><line x1="14" y1="6" x2="10.6" y2="10"/></g></svg>';
    bt.addEventListener('click', () => { const on = bt.getAttribute('aria-pressed') !== 'true'; bt.setAttribute('aria-pressed', String(on)); try { on ? snd.enable() : snd.disable(); } catch {} });
    box.appendChild(bt);
  }
  const clack = (i, k) => { if (snd) try { snd.clack(i, k); } catch {} };

  /* ---------- rendu ---------- */
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.NeutralToneMapping;
  renderer.toneMappingExposure = 1.0;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  const canvas = renderer.domElement; canvas.className = 'rl-canvas'; canvas.tabIndex = 0;
  stage.appendChild(canvas);

  const scene = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture; pmrem.dispose();
  scene.environmentIntensity = 0.8;
  const camera = new THREE.PerspectiveCamera(26, 1, 0.1, 60);
  const ELEV = 56 * PI / 180;

  const key = new THREE.DirectionalLight(0xfff6ea, 1.75);
  key.position.set(-2.2, 8, 3.2);
  key.castShadow = true;
  key.shadow.mapSize.set(2048, 2048);
  Object.assign(key.shadow.camera, { left: -3.6, right: 3.6, top: 3.6, bottom: -3.6, near: 2, far: 16 });
  key.shadow.radius = 5; key.shadow.bias = -0.0008; key.shadow.normalBias = 0.02;
  scene.add(key);
  const fill = new THREE.DirectionalLight(0xe8eefa, 0.4); fill.position.set(5, 3, 6); scene.add(fill);

  /* ---------- le kit jeton ---------- */
  const K = chipKit(renderer, { lite: true });
  const s = RD / K.R, CTW = K.CT * s;            // échelle kit → monde, épaisseur d'un jeton
  const maxAniso = renderer.capabilities.getMaxAnisotropy();

  /* faces : un atlas de 22 faces (512 px chacune), nom court imprimé sur le centre ivoire */
  const CELL = 512, COLS = Math.ceil(Math.sqrt(N)), PAD = 6, AS = COLS * CELL;
  const atlas = document.createElement('canvas'); atlas.width = atlas.height = AS;
  {
    const x = atlas.getContext('2d');
    x.fillStyle = COL.night; x.fillRect(0, 0, AS, AS);
    CASES.forEach((p, i) => {
      const cx = (i % COLS) * CELL + CELL / 2, cy = Math.floor(i / COLS) * CELL + CELL / 2, m = CELL / 2 - PAD, P = r => r * m, tc = TYPE[p.type];
      x.save(); x.translate(cx, cy);
      x.beginPath(); x.arc(0, 0, m + PAD - 1, 0, TAU); x.clip();
      x.fillStyle = COL.night; x.fillRect(-CELL / 2, -CELL / 2, CELL, CELL);
      // inserts de bord (8) : couleur du type, filet ivoire
      K.INS.forEach(a => {
        x.save(); x.rotate(-a + PI / 2);
        const w = P(.2), y1 = -P(1.02), hh = P(.19);
        x.fillStyle = tc; x.fillRect(-w / 2, y1, w, hh);
        x.fillStyle = COL.ivory; x.fillRect(-P(.018), y1, P(.036), hh);
        x.restore();
      });
      // denticules ivoire
      x.fillStyle = 'rgba(243,236,221,.85)';
      for (let k = 0; k < 56; k++) { x.save(); x.rotate(k * TAU / 56 + TAU / 112); x.fillRect(-P(.011), -P(.805), P(.022), P(.032)); x.restore(); }
      // centre ivoire, liseré du type
      x.fillStyle = COL.ivory; x.beginPath(); x.arc(0, 0, P(.705), 0, TAU); x.fill();
      x.strokeStyle = tc; x.lineWidth = P(.032); x.beginPath(); x.arc(0, 0, P(.655), 0, TAU); x.stroke();
      x.strokeStyle = 'rgba(11,27,46,.18)'; x.lineWidth = P(.006); x.beginPath(); x.arc(0, 0, P(.62), 0, TAU); x.stroke();
      // nom court
      const words = p.short.toUpperCase().split(' '), lines = words.length > 1 && p.short.length > 9 ? words : [words.join(' ')];
      let fs = P(lines.length > 1 ? .19 : .215); const room = P(lines.length > 1 ? 1.1 : 1.26);
      const setF = () => { x.font = `800 ${fs}px Archivo`; x.letterSpacing = `${Math.round(fs * .035)}px`; }; setF();
      const wMax = Math.max(...lines.map(l => x.measureText(l).width));
      if (wMax > room) { fs = Math.floor(fs * room / wMax); setF(); }
      x.fillStyle = '#07111F'; x.textAlign = 'center'; x.textBaseline = 'middle';
      const lh = fs * 1.08, y0 = -(lines.length - 1) * lh / 2 - P(.03);
      lines.forEach((l, k) => x.fillText(l, P(.01), y0 + k * lh));
      x.letterSpacing = '0px';
      // petit filet sous le nom
      x.fillStyle = tc; x.fillRect(-P(.09), y0 + (lines.length - 1) * lh + fs * .62, P(.18), P(.024));
      // usure : micro-éraflures claires près du bord
      for (let k = 0; k < 160; k++) {
        const a = Math.random() * TAU, r = P(.88 + Math.random() * .12);
        x.fillStyle = `rgba(255,246,230,${.03 + Math.random() * .08})`; x.fillRect(Math.cos(a) * r, Math.sin(a) * r, 1 + Math.random() * 3, 1 + Math.random() * 1.5);
      }
      x.restore();
    });
  }
  const atlasTex = new THREE.CanvasTexture(atlas); atlasTex.colorSpace = THREE.SRGBColorSpace; atlasTex.anisotropy = maxAniso;
  const faceGeoOf = i => {
    const g = K.faceGeo.clone(), uv = g.attributes.uv, c = i % COLS, r = Math.floor(i / COLS), span = (CELL - 2 * PAD) / AS;
    for (let k = 0; k < uv.count; k++) uv.setXY(k, (c * CELL + PAD) / AS + uv.getX(k) * span, 1 - (r * CELL + PAD) / AS - (1 - uv.getY(k)) * span);
    return g;
  };
  /* tranches : bleu nuit, inserts à la couleur du type coupés d'un filet ivoire (une texture par type) */
  const edgeTex = {};
  Object.entries(TYPE).forEach(([t, col]) => {
    const W = 1024, [c, x] = K.canvas(W, 32);
    x.fillStyle = COL.night; x.fillRect(0, 0, W, 32);
    K.INS.forEach(a => {
      const u = ((a + PI / 2) / TAU % 1) * W, w = .2 / TAU * W;
      x.fillStyle = col; x.fillRect(u - w / 2, 0, w, 32);
      x.fillStyle = COL.ivory; x.fillRect(u - w * .09, 0, w * .18, 32);
    });
    const g = x.createLinearGradient(0, 0, 0, 32);
    [[0, .45], [.2, 0], [.8, 0], [1, .45]].forEach(([o, a]) => g.addColorStop(o, `rgba(0,0,0,${a})`));
    x.fillStyle = g; x.fillRect(0, 0, W, 32);
    for (let k = 0; k < 160; k++) { x.fillStyle = `rgba(255,246,230,${.04 + Math.random() * .1})`; x.fillRect(Math.random() * W, Math.random() < .5 ? Math.random() * 5 : 27 + Math.random() * 5, 1 + Math.random() * 2, 1); }
    edgeTex[t] = K.tex(c);
  });

  const shade = m => { m.castShadow = true; m.receiveShadow = true; return m; };
  /* un jeton, à plat (axe vertical) ; le groupe extérieur porte position et orientation */
  const makeChip = (faceGeo, faceMat, edgeMat, ringMat = K.goldMat) => {
    const outer = new THREE.Group(), inner = new THREE.Group();
    inner.rotation.x = -PI / 2; inner.scale.setScalar(s); outer.add(inner);
    inner.add(shade(new THREE.Mesh(K.edgeGeo, edgeMat)));
    [1, -1].forEach(sg => {
      const f = shade(new THREE.Mesh(faceGeo, faceMat)); f.position.z = sg * K.CT / 2; if (sg < 0) f.rotation.y = PI; inner.add(f);
      const ring = new THREE.Mesh(K.ringGeo, ringMat); ring.scale.set(.93, .93, .35); ring.position.z = sg * (K.CT / 2 + .004); inner.add(ring);
    });
    return outer;
  };

  /* la maison : petite pile de jetons GT rouges au centre (le GT de la DA sur le dessus) */
  const houseFace = K.clay(K.chipFace(K.C.red, true)), houseEdge = K.clay(K.chipEdge(K.C.red));
  for (let k = 0; k < PILE; k++) {
    const c = makeChip(K.faceGeo, houseFace, houseEdge);
    c.position.set(Math.sin(k * 2.1) * .012, CTW * (k + .5), Math.cos(k * 1.7) * .012);
    c.rotation.y = k === PILE - 1 ? 0 : (k * 1.3) % 1 - .5;
    scene.add(c);
  }
  const STACK_TOP = CTW * PILE;

  /* les 22 jetons */
  const DIM = new THREE.Color(COL.paper);
  const chips = CASES.map((p, i) => {
    const fm = K.clay(atlasTex), em = K.clay(edgeTex[p.type]);
    fm.emissive = new THREE.Color(0); em.emissive = new THREE.Color(0);
    const g = makeChip(faceGeoOf(i), fm, em);
    g.position.copy(HOME[i]).setY(CTW / 2); g.visible = !!reduceMotion;
    scene.add(g);
    return { g, fm, em, i, home: HOME[i], pos: g.position, lift: 0, liftV: 0, fl: null, wob: null, dim: 0, dimT: 0, dealt: true };
  });

  /* ombres : portée (carte d'ombre) + contact, une tache douce par jeton (instanciée) */
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(14, 14), new THREE.ShadowMaterial({ color: '#0B1B2E', opacity: 0.16 }));
  ground.rotation.x = -PI / 2; ground.receiveShadow = true; scene.add(ground);
  const blobMat = new THREE.ShaderMaterial({ transparent: true, depthWrite: false,
    vertexShader: 'attribute float aO; varying float vO; varying vec2 vU; void main() { vO = aO; vU = uv * 2. - 1.; gl_Position = projectionMatrix * modelViewMatrix * instanceMatrix * vec4(position, 1.); }',
    fragmentShader: 'varying float vO; varying vec2 vU; void main() { float r = clamp(1. - length(vU), 0., 1.); gl_FragColor = vec4(.043, .106, .18, vO * r * r * (3. - 2. * r)); }' });
  const blobGeo = new THREE.PlaneGeometry(1, 1).rotateX(-PI / 2);
  blobGeo.setAttribute('aO', new THREE.InstancedBufferAttribute(new Float32Array(N + 1), 1));
  const blobs = new THREE.InstancedMesh(blobGeo, blobMat, N + 1); blobs.position.y = .002; blobs.renderOrder = -1; blobs.frustumCulled = false; scene.add(blobs);
  const dum = new THREE.Object3D();
  const setBlob = (k, x, z, size, op) => { dum.position.set(x, 0, z); dum.scale.set(size, 1, size); dum.updateMatrix(); blobs.setMatrixAt(k, dum.matrix); blobGeo.attributes.aO.array[k] = op; };
  setBlob(N, 0, 0, RD * 2.7, .5);

  /* ---------- fiche ---------- */
  const panel = document.createElement('div'); panel.className = 'rl-panel'; panel.setAttribute('aria-live', 'polite');
  panel.innerHTML = '<a class="rl-card" target="_blank" rel="noopener"><span class="rl-ph"></span><i class="rl-rule"></i><span class="rl-txt"><span><b class="rl-name"></b><span class="rl-city"></span></span><svg class="rl-fr" aria-hidden="true"><path/><circle r="2.6"/></svg></span></a>';
  box.appendChild(panel);
  const card = panel.querySelector('.rl-card'), ph = panel.querySelector('.rl-ph');
  /* mini-carte de France, au trait */
  const FP = (lon, lat) => [(lon - 2.9) * .69, -(lat - 46.4)];
  let fx0 = Infinity, fx1 = -Infinity, fy0 = Infinity, fy1 = -Infinity;
  FRANCE.forEach(([lo, la]) => { const [x, y] = FP(lo, la); fx0 = Math.min(fx0, x); fx1 = Math.max(fx1, x); fy0 = Math.min(fy0, y); fy1 = Math.max(fy1, y); });
  const fr = panel.querySelector('.rl-fr'), fsz = Math.max(fx1 - fx0, fy1 - fy0);
  fr.setAttribute('viewBox', `${fx0 - .2} ${fy0 - .2} ${fsz + .4} ${fsz + .4}`);
  fr.querySelector('path').setAttribute('d', 'M' + FRANCE.map(([lo, la]) => FP(lo, la).map(v => v.toFixed(2)).join(' ')).join('L') + 'Z');
  fr.querySelector('circle').setAttribute('r', (fsz * 0.045).toFixed(2));
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
  let W = 1, H = 1, Wc = 1, panelAt = null, camDist = 9, dirty = true;
  const mobile = () => W < 520;
  const EXT = R_OUT + RD + .04;
  const layout = () => {
    W = stage.clientWidth; H = stage.clientHeight; if (!W || !H) return;
    const st = stage.getBoundingClientRect(), bx = box.getBoundingClientRect();
    // sur grand écran, la toile déborde à droite de la zone : la rosace se décale vers le bord et laisse à gauche la place de la fiche
    const extR = mobile() ? 0 : Math.max(0, Math.min(170, innerWidth - st.right - 10));
    // place gardée à gauche pour la fiche (200 px), la rosace se centre dans le reste
    const keep = mobile() ? 0 : 214, avail = Wc0 => Wc0 - keep - 8;
    Wc = W + extR;
    canvas.style.width = Wc + 'px';
    renderer.setSize(Wc, H, false);
    camera.aspect = Wc / H;
    const fitX = mobile() ? 0.97 : 0.97 * avail(Wc) / Wc, fitY = mobile() ? 0.92 : 0.9, pts = [];
    for (let k = 0; k < 48; k++) { const a = k / 48 * TAU; pts.push(new THREE.Vector3(Math.cos(a) * EXT, 0, Math.sin(a) * EXT), new THREE.Vector3(Math.cos(a) * EXT, CTW + .1, Math.sin(a) * EXT)); }
    pts.push(new THREE.Vector3(0, 1.1, 0));       // hauteur de vol au-dessus de la pile
    let dist = 9;
    const place = () => { camera.position.set(0, Math.sin(ELEV) * dist, Math.cos(ELEV) * dist); camera.lookAt(0, 0, 0); camera.clearViewOffset(); camera.updateProjectionMatrix(); camera.updateMatrixWorld(); };
    for (let it = 0; it < 4; it++) {
      place();
      let ex = 0, ey = 0; pts.forEach(v => { const q = v.clone().project(camera); ex = Math.max(ex, Math.abs(q.x)); ey = Math.max(ey, Math.abs(q.y)); });
      dist *= Math.max(ex / fitX, ey / fitY);
    }
    place(); camDist = dist;
    let y0 = 1, y1 = -1; pts.forEach(v => { const q = v.clone().project(camera); y0 = Math.min(y0, q.y); y1 = Math.max(y1, q.y); });
    const offY = ((y0 + y1) / 2) * H / 2, offX = mobile() ? 0 : Wc / 2 - (keep + avail(Wc) / 2);
    camera.setViewOffset(Wc, H, offX, offY, Wc, H); camera.updateProjectionMatrix();
    box.style.setProperty('--rl-lx', (st.left - bx.left + Wc / 2 - offX).toFixed(1) + 'px');   // la légende se centre sous la rosace
    panelAt = { l: st.left - bx.left, t: st.top - bx.top, w: W, h: H };
    placePanel(); dirty = true;
  };
  const placePanel = () => {
    if (!panelAt) return;
    const { l, t, w, h } = panelAt;
    if (mobile()) { Object.assign(panel.style, { left: l + 'px', width: w + 'px', top: (t + h - 4) + 'px', bottom: 'auto' }); return; }
    Object.assign(panel.style, { width: '', bottom: 'auto', top: (t + h - 300) + 'px', left: (l - 6) + 'px' });
  };
  new ResizeObserver(layout).observe(stage); layout();

  /* ---------- mouvement : vols de jetons ---------- */
  const PILE_POS = new THREE.Vector3(0, STACK_TOP + CTW / 2, 0);
  const UP = new THREE.Vector3(0, 1, 0), tmpA = new THREE.Vector3();
  let selIdx = -1, pendingSel = -1, hoverIdx = -1, onPile = -1, held = false;
  const T = () => performance.now() / 1000;
  /* vol : arc de from à to ; tours = retournements en l'air (autour d'un axe horizontal perpendiculaire à la trajectoire) */
  const fly = (c, to, { dur, peak, turns, delay = 0, kind = 'land' }) => {
    const from = c.pos.clone(); from.y = Math.max(from.y, CTW / 2);
    tmpA.subVectors(to, from).setY(0);
    const axis = tmpA.lengthSq() > 1e-6 ? new THREE.Vector3().crossVectors(UP, tmpA.normalize()) : new THREE.Vector3(1, 0, 0);
    c.fl = { from, to: to.clone(), t0: T() + delay, dur, peak, turns, axis, kind };
    c.wob = null; dirty = true;
    if (delay < .02) clack(.35, 'lift');
  };
  const sendHome = (c, delay = 0) => { if (onPile === c.i) onPile = -1; fly(c, c.home.clone().setY(CTW / 2), { dur: .62, peak: .7, turns: .5, delay, kind: 'drop' }); };
  const sendPile = c => { onPile = c.i; fly(c, PILE_POS, { dur: .82, peak: 1.0, turns: 1, kind: 'land' }); };
  const landed = c => {
    const f = c.fl; c.fl = null;
    c.pos.copy(f.to); c.g.quaternion.identity();
    // petite oscillation sur l'arête, amortie
    c.wob = { t0: T(), axis: new THREE.Vector3(Math.random() - .5, 0, Math.random() - .5).normalize(), a: f.kind === 'land' ? .07 : .045 };
    clack(f.kind === 'land' ? .9 : f.kind === 'deal' ? .5 : .7, f.kind === 'land' ? 'land' : 'drop');
    if (f.kind === 'land' && c.i === pendingSel) { selIdx = c.i; placePanel(); showPanel(c.i); }
  };

  const select = i => {
    if (i === pendingSel) return;
    pendingSel = i; selIdx = -1;
    hidePanel();
    // le jeton déjà misé (ou en route vers la pile) rentre chez lui
    chips.forEach(c => { if (c.i !== i && (onPile === c.i || (c.fl && c.fl.kind === 'land'))) {
      if (reduceMotion) { c.fl = null; c.wob = null; c.pos.copy(c.home).setY(CTW / 2); c.g.quaternion.identity(); onPile = -1; }
      else sendHome(c);
    } });
    if (i < 0) { dirty = true; return; }
    const c = chips[i];
    if (reduceMotion) { c.fl = null; c.pos.copy(PILE_POS); c.g.quaternion.identity(); onPile = i; selIdx = i; placePanel(); showPanel(i); dirty = true; return; }
    if (onPile === i && !c.fl) { selIdx = i; placePanel(); showPanel(i); return; }
    sendPile(c);
  };

  /* ---------- survol, clic, clavier ---------- */
  const ray = new THREE.Raycaster(), ndc = new THREE.Vector2(), plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -CTW), hit = new THREE.Vector3();
  const pick = e => {
    const r = canvas.getBoundingClientRect();
    ndc.set((e.clientX - r.left) / r.width * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
    ray.setFromCamera(ndc, camera);
    if (!ray.ray.intersectPlane(plane, hit)) return -1;
    let best = -1, bd = RD * 1.04;
    HOME.forEach((h, i) => { const d = Math.hypot(hit.x - h.x, hit.z - h.z); if (d < bd) { bd = d; best = i; } });
    return best;
  };
  let dwell = 0, leaveT = 0;
  const setHover = i => { if (i === hoverIdx) return; if (i >= 0 && i !== selIdx && !reduceMotion) clack(.18, 'tick'); hoverIdx = i; canvas.classList.toggle('rl-point', i >= 0); dirty = true; };
  canvas.addEventListener('pointermove', e => {
    if (e.pointerType === 'touch') return;
    const i = pick(e); clearTimeout(leaveT);
    if (i >= 0) held = true;
    setHover(i);
    clearTimeout(dwell);
    if (i >= 0 && i !== pendingSel) dwell = setTimeout(() => select(i), pendingSel >= 0 ? 140 : 200);
  });
  const leave = () => { clearTimeout(dwell); leaveT = setTimeout(() => { held = false; setHover(-1); select(-1); }, 450); };
  canvas.addEventListener('pointerleave', e => { if (e.pointerType !== 'touch') leave(); });
  panel.addEventListener('pointerenter', () => clearTimeout(leaveT));
  panel.addEventListener('pointerleave', leave);
  canvas.addEventListener('click', e => { const i = pick(e); if (i >= 0) { held = true; select(i); } else { held = false; select(-1); } });
  canvas.addEventListener('keydown', e => {
    const cur = pendingSel >= 0 ? pendingSel : hoverIdx;
    let n = null;
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') n = cur < 0 ? 0 : (cur + 1) % N;
    else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') n = cur < 0 ? N - 1 : (cur - 1 + N) % N;
    else if (e.key === 'Home') n = 0; else if (e.key === 'End') n = N - 1;
    else if (e.key === 'Escape') { held = false; setHover(-1); select(-1); e.preventDefault(); return; }
    else if ((e.key === 'Enter' || e.key === ' ') && selIdx >= 0 && card.href) { card.click(); e.preventDefault(); return; }
    if (n === null) return;
    e.preventDefault(); held = true; setHover(n); select(n);
  });
  canvas.addEventListener('blur', () => { if (!panel.matches(':hover')) { held = false; setHover(-1); } });

  /* légende : survol = aperçu du filtre, clic = filtre posé */
  let sticky = '';
  const legend = [...box.querySelectorAll('.hs-legend li')];
  const markLegend = () => legend.forEach(li => li.classList.toggle('rl-act', li.dataset.type === sticky));
  legend.forEach(li => {
    li.addEventListener('mouseenter', () => { box.dataset.filter = li.dataset.type; });
    li.addEventListener('mouseleave', () => { if (sticky) box.dataset.filter = sticky; else delete box.dataset.filter; });
    li.addEventListener('click', () => { sticky = sticky === li.dataset.type ? '' : li.dataset.type; if (sticky) box.dataset.filter = sticky; else delete box.dataset.filter; markLegend(); });
  });
  const applyFilter = () => { const f = box.dataset.filter; chips.forEach(c => { c.dimT = f && f !== 'all' && CASES[c.i].type !== f ? 1 : 0; if (reduceMotion) c.dim = c.dimT; }); dirty = true; };
  new MutationObserver(applyFilter).observe(box, { attributes: true, attributeFilter: ['data-filter'] });

  /* page Nos destinations : l'annuaire mise le jeton de l'établissement survolé */
  document.addEventListener('dest:hover', e => {
    const i = e.detail ? CASES.findIndex(p => p.name === e.detail) : -1;
    held = i >= 0; select(i);
  });
  document.addEventListener('dest:filter', e => { sticky = e.detail === 'all' ? '' : e.detail; if (sticky) box.dataset.filter = sticky; else delete box.dataset.filter; markLegend(); });

  /* le défilement incline très légèrement la prise de vue */
  let scrollEl = 0;
  const readScroll = () => { const r = box.getBoundingClientRect(); return Math.max(-1, Math.min(1, (r.top + r.height / 2 - innerHeight / 2) / innerHeight)); };

  /* ---------- boucle ---------- */
  let launched = false, last = performance.now(), nextRipple = 0;
  const onScreen = () => { const r = box.getBoundingClientRect(); return r.bottom > -100 && r.top < innerHeight + 100 && r.width > 0; };
  const launch = () => {
    if (launched) return; launched = true;
    box.classList.add('live');
    if (reduceMotion) return;
    // la donne d'ouverture : les jetons tombent à leur place, l'un après l'autre
    chips.forEach((c, k) => {
      c.pos.y = CTW / 2 + 1.4; c.g.visible = false;
      c.fl = { from: c.home.clone().setY(CTW / 2 + .9).addScaledVector(c.home, .05), to: c.home.clone().setY(CTW / 2), t0: T() + .15 + k * .055, dur: .42, peak: 0, turns: 0, axis: new THREE.Vector3(1, 0, 0), kind: 'deal' };
    });
    nextRipple = T() + 9;
    CASES.forEach(p => { if (PHOTO[p.name]) { const im = new Image(); im.src = IMG + PHOTO[p.name]; } });
  };
  // jetons hors pile, survolés ou effleurés par la vague d'attente
  const ripple = { t0: -10 };
  const frame = nowMs => {
    requestAnimationFrame(frame);
    if (document.hidden || !onScreen()) { last = nowMs; return; }
    if (!launched) { const r = box.getBoundingClientRect(), vis = Math.min(r.bottom, innerHeight) - Math.max(r.top, 0); if (reduceMotion || vis > r.height * .25) launch(); }
    const dt = Math.min(0.1, (nowMs - last) / 1000); last = nowMs;
    const t = T();
    let moving = false;
    // vague d'attente : quand rien ne bouge, un frisson parcourt la rosace (un jeton après l'autre se soulève d'un rien)
    if (!reduceMotion && launched && pendingSel < 0 && !held && t > nextRipple) { ripple.t0 = t; nextRipple = t + 12; }
    const rp = t - ripple.t0;
    chips.forEach((c, k) => {
      // filtre
      if (c.dim !== c.dimT) { c.dim += Math.sign(c.dimT - c.dim) * Math.min(Math.abs(c.dimT - c.dim), dt / .35); c.fm.emissive.copy(DIM).multiplyScalar(c.dim * .5); c.em.emissive.copy(DIM).multiplyScalar(c.dim * .4); moving = true; }
      if (c.fl) {
        const f = c.fl, u = (t - f.t0) / f.dur;
        if (u < 0) { if (f.kind === 'deal') c.g.visible = false; moving = true; return; }
        c.g.visible = true;
        if (u >= 1) { landed(c); moving = true; }
        else {
          if (f.kind === 'deal') {
            const e = u * u;                                       // chute (gravité)
            c.pos.lerpVectors(f.from, f.to, e);
            c.g.quaternion.setFromAxisAngle(f.axis, (1 - e) * .5);
          } else {
            const e = sm(u), fl = sm(seg(u, .14, .84));
            c.pos.lerpVectors(f.from, f.to, e); c.pos.y += f.peak * 4 * e * (1 - e);
            c.g.quaternion.setFromAxisAngle(f.axis, fl * f.turns * TAU);
          }
          moving = true;
        }
      } else {
        // survol et vague : le jeton à sa place se soulève un peu
        const atHome = onPile !== c.i;
        let target = atHome && (c.i === hoverIdx) && c.i !== pendingSel ? .07 : 0;
        if (atHome && rp >= 0 && rp < 3) { const w = rp - k * .07; if (w > 0 && w < .5) target = Math.max(target, .05 * Math.sin(PI * w / .5)); if (w > .5 && w - dt <= .5) clack(.08, 'tick'); }
        if (Math.abs(target - c.lift) > 1e-4 || Math.abs(c.liftV) > 1e-4) {
          const kk = 260, d = 2 * Math.sqrt(kk) * .8;          // ressort amorti
          c.liftV += (kk * (target - c.lift) - d * c.liftV) * dt; c.lift += c.liftV * dt; moving = true;
        } else { c.lift = target; c.liftV = 0; }
        const base = onPile === c.i ? PILE_POS.y : CTW / 2;
        c.pos.y = base + c.lift;
        if (c.wob) {
          const w = t - c.wob.t0, a = c.wob.a * Math.exp(-w * 7) * Math.cos(w * 26);
          if (w > .9) { c.wob = null; c.g.quaternion.identity(); } else c.g.quaternion.setFromAxisAngle(c.wob.axis, a);
          moving = true;
        } else c.g.quaternion.setFromAxisAngle(tmpA.set(1, 0, 0), c.lift * 1.4);   // soulevé, il s'incline vers le regard
      }
      // tache de contact
      const sit = onPile === c.i && !c.fl ? STACK_TOP : 0, hgt = Math.max(0, c.pos.y - CTW / 2 - sit);
      setBlob(k, c.pos.x + hgt * .18, c.pos.z + hgt * .1, RD * 2.5 * (1 + hgt * .8), (sit ? .25 : .55) / (1 + hgt * 6));
    });
    blobs.instanceMatrix.needsUpdate = true; blobGeo.attributes.aO.needsUpdate = true;
    // prise de vue
    const se = reduceMotion ? 0 : readScroll() * .05;
    if (Math.abs(se - scrollEl) > 1e-4) { scrollEl += (se - scrollEl) * (1 - Math.exp(-dt * 6)); moving = true; }
    if (moving || dirty) {
      const el = ELEV + scrollEl;
      camera.position.set(0, Math.sin(el) * camDist, Math.cos(el) * camDist); camera.lookAt(0, 0, 0);
      renderer.render(scene, camera);
      dirty = false;
    }
  };
  applyFilter();
  renderer.render(scene, camera);
  requestAnimationFrame(frame);
  box.classList.add('ready');
}
