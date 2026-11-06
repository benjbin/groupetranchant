/* Page établissement — « Une soirée chez Tranchant ».
   L'arrivée (la façade passe du jour à la nuit, l'enseigne s'allume, l'heure tourne), le seuil (les portes s'ouvrent),
   la salle (une roulette laquée en 3D qui tourne : décor seul, sans mise ni gain), la frise du jour choisi,
   « Composer ma soirée » (étapes et boutons selon les choix), puis la nuit à l'hôtel jusqu'au lever du jour. */
const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const hm = m => `${String(Math.floor(m / 60) % 24).padStart(2, '0')}:${String(Math.round(m % 60)).padStart(2, '0')}`;

export function mountEv(root, { reduceMotion = false } = {}) {
  /* scènes épinglées : avancement 0 → 1 pendant que la section défile sous l'écran */
  const pins = [...root.querySelectorAll('.ev-arr, .ev-door, .ev-night')];
  const clocks = { 'ev-arr': [19 * 60, 19 * 60 + 55], 'ev-night': [0, 7 * 60 + 30] };
  let raf = 0;
  const update = () => {
    raf = 0;
    const vh = innerHeight;
    pins.forEach(s => {
      const r = s.getBoundingClientRect();
      if (r.bottom < -vh || r.top > vh * 2) return;
      const p = reduceMotion ? (s.classList.contains('ev-door') ? 1 : .6) : clamp(-r.top / Math.max(1, r.height - vh));
      s.style.setProperty('--ev', p.toFixed(4));
      const c = clocks[[...s.classList].find(k => clocks[k])];
      const t = s.querySelector('.ev-clock span, .ev-time span');
      if (c && t) t.textContent = hm(c[0] + (c[1] - c[0]) * (Math.round(p * 20) / 20));
    });
  };
  const req = () => { if (!raf) raf = requestAnimationFrame(update); };
  addEventListener('scroll', req, { passive: true }); addEventListener('resize', req);
  update();

  /* guirlande de lumières de la salle */
  const bulbs = root.querySelector('.ev-bulbs');
  if (bulbs) for (let i = 0; i < 64; i++) { const b = document.createElement('i'); b.style.setProperty('--i', i); bulbs.appendChild(b); }

  /* chiffres qui montent */
  root.querySelectorAll('.ev-nums b[data-n]').forEach(b => {
    if (reduceMotion) return;
    const to = +b.dataset.n; b.textContent = '0';
    const io = new IntersectionObserver(([e]) => {
      if (!e.isIntersecting) return; io.disconnect();
      const t0 = performance.now(), st = now => { const t = Math.min(1, (now - t0) / 1800); b.textContent = Math.round(to * (1 - Math.pow(1 - t, 3))); if (t < 1) requestAnimationFrame(st); };
      requestAnimationFrame(st);
    }, { threshold: .5 });
    io.observe(b);
  });

  /* frise : le jour choisi règle l'heure de fermeture ; la frise se tire à la souris */
  const DAYS = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];
  const days = [...root.querySelectorAll('.ev-days button')];
  const closeB = root.querySelector('[data-close]'), closeN = root.querySelector('[data-close-note]'), tDay = root.querySelector('.ev-ticket-d');
  const today = new Date().getDay();
  const setDay = d => {
    days.forEach(b => b.setAttribute('aria-pressed', String(+b.dataset.d === d)));
    const late = d === 5 || d === 6;
    if (closeB) closeB.textContent = late ? '04:00' : '03:00';
    if (closeN) closeN.textContent = late ? 'Vendredi et samedi' : 'Du dimanche au jeudi';
    if (tDay) tDay.textContent = d === today ? 'Ce soir' : DAYS[d] + ' soir';
  };
  days.forEach(b => b.addEventListener('click', () => setDay(+b.dataset.d)));
  setDay(today);
  const track = root.querySelector('.ev-track');
  if (track) {
    let x0 = 0, s0 = 0, down = false;
    track.addEventListener('pointerdown', e => { if (e.pointerType !== 'mouse') return; down = true; x0 = e.clientX; s0 = track.scrollLeft; track.classList.add('drag'); });
    addEventListener('pointermove', e => { if (down) track.scrollLeft = s0 - (e.clientX - x0); });
    addEventListener('pointerup', () => { down = false; track.classList.remove('drag'); });
  }

  /* composer ma soirée */
  const opts = [...root.querySelectorAll('.ev-opts button')], tpl = root.querySelector('#ev-t');
  const steps = root.querySelector('.ev-steps'), acts = root.querySelector('.ev-acts');
  const compose = () => {
    const on = new Set(opts.filter(b => b.getAttribute('aria-pressed') === 'true').map(b => b.dataset.o));
    steps.replaceChildren(...[...tpl.content.querySelectorAll('li')].filter(li => on.has(li.dataset.o)).map((li, i) => { const n = li.cloneNode(true); n.style.setProperty('--k', i); return n; }));
    acts.replaceChildren(...[...tpl.content.querySelectorAll('a')].filter(a => on.has(a.dataset.o) || a.dataset.o === 'any').map(a => a.cloneNode(true)));
    root.querySelector('.ev-ticket').classList.toggle('empty', !on.size);
  };
  opts.forEach(b => b.addEventListener('click', () => { b.setAttribute('aria-pressed', String(b.getAttribute('aria-pressed') !== 'true')); compose(); }));
  if (tpl && steps) compose();

  /* roulette 3D, chargée à l'approche de la salle */
  const wheel = root.querySelector('.ev-wheel');
  if (wheel) {
    const io = new IntersectionObserver(([e]) => {
      if (!e.isIntersecting) return; io.disconnect();
      mountWheel(wheel, reduceMotion).catch(err => console.warn('roulette 3D indisponible', err));
    }, { rootMargin: '400px' });
    io.observe(wheel);
  }
}

/* ---------- roulette : cuvette laquée bleu nuit, jante laiton, cylindre numéroté, bille d'ivoire ---------- */
const ORDER = [0, 32, 15, 19, 4, 21, 2, 25, 17, 34, 6, 27, 13, 36, 11, 30, 8, 23, 10, 5, 24, 16, 33, 1, 20, 14, 31, 9, 22, 18, 29, 7, 28, 12, 35, 3, 26];
const RED = new Set([1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36]);
const N = ORDER.length, STEP = Math.PI * 2 / N;

async function mountWheel(box, reduceMotion) {
  const probe = document.createElement('canvas');
  const gl = probe.getContext('webgl2') || probe.getContext('webgl');
  if (!gl) return;
  gl.getExtension('WEBGL_lose_context')?.loseContext();
  const THREE = await import('three');
  const { RoomEnvironment } = await import('three/addons/environments/RoomEnvironment.js');
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.NeutralToneMapping; renderer.toneMappingExposure = 1;
  renderer.domElement.setAttribute('aria-hidden', 'true');
  box.appendChild(renderer.domElement);
  const scene = new THREE.Scene();
  const pm = new THREE.PMREMGenerator(renderer);
  scene.environment = pm.fromScene(new RoomEnvironment(), .04).texture;
  const camera = new THREE.PerspectiveCamera(30, 1, .1, 50);
  const key = new THREE.SpotLight('#ffe9c4', 30, 12, .55, .6); key.position.set(-1.2, 4, 1.6); scene.add(key);
  scene.add(new THREE.AmbientLight('#8fa6c2', .25));

  // cuvette : profil tourné, laque bleu nuit vernie
  const prof = [[1.42, -.12], [1.42, .1], [1.36, .2], [1.3, .21], [1.16, .17], [1.02, .07], [.99, .03], [.99, -.12]].map(([r, y]) => new THREE.Vector2(r, y));
  const bowl = new THREE.Mesh(new THREE.LatheGeometry(prof, 160), new THREE.MeshPhysicalMaterial({ color: '#0B1B2E', roughness: .28, clearcoat: 1, clearcoatRoughness: .08, metalness: .05, side: THREE.DoubleSide }));
  scene.add(bowl);
  const brass = new THREE.MeshStandardMaterial({ color: '#C9A862', metalness: 1, roughness: .26 });
  const rim = new THREE.Mesh(new THREE.TorusGeometry(1.42, .03, 16, 160), brass); rim.rotation.x = Math.PI / 2; rim.position.y = .1; scene.add(rim);
  // déflecteurs laiton sur la piste
  for (let i = 0; i < 8; i++) {
    const a = i / 8 * Math.PI * 2, d = new THREE.Mesh(new THREE.BoxGeometry(.05, .02, .02), brass);
    d.position.set(Math.cos(a) * 1.1, .14, Math.sin(a) * 1.1); d.rotation.y = -a + (i % 2 ? .6 : 0); scene.add(d);
  }

  // cylindre : disque peint (numéros, cases, cône) + cloisons et tourelle en laiton
  const rotor = new THREE.Group(); rotor.position.y = .02; scene.add(rotor);
  const S = 2048, cv = document.createElement('canvas'); cv.width = cv.height = S;
  const g = cv.getContext('2d'), c = S / 2, R = S / 2;
  const sector = (r0, r1, i, fill) => { g.beginPath(); g.arc(c, c, r1, i * STEP, (i + 1) * STEP); g.arc(c, c, r0, (i + 1) * STEP, i * STEP, true); g.closePath(); g.fillStyle = fill; g.fill(); };
  const cone = g.createRadialGradient(c, c, 0, c, c, R * .66);
  cone.addColorStop(0, '#3a2a18'); cone.addColorStop(.25, '#6b4a26'); cone.addColorStop(.7, '#2a1c10'); cone.addColorStop(1, '#14100c');
  g.fillStyle = cone; g.beginPath(); g.arc(c, c, R * .66, 0, Math.PI * 2); g.fill();
  for (let k = 0; k < 4; k++) { g.strokeStyle = 'rgba(201,168,98,.35)'; g.lineWidth = 3; g.beginPath(); g.arc(c, c, R * (.2 + k * .11), 0, Math.PI * 2); g.stroke(); }
  ORDER.forEach((n, i) => {
    const col = n === 0 ? '#1d6b4a' : RED.has(n) ? '#8a0f1f' : '#0d1014';
    sector(R * .8, R * .99, i, col);
    sector(R * .66, R * .8, i, n === 0 ? '#16553b' : RED.has(n) ? '#7c1522' : '#0b0e11');
    g.save(); g.translate(c, c); g.rotate((i + .5) * STEP + Math.PI / 2);
    g.fillStyle = '#F3EEE3'; g.font = `600 ${S * .042}px Archivo, Helvetica, sans-serif`; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillText(String(n), 0, -R * .895); g.restore();
  });
  g.strokeStyle = '#C9A862'; g.lineWidth = 6; [.8, .99, .66].forEach(k => { g.beginPath(); g.arc(c, c, R * k, 0, Math.PI * 2); g.stroke(); });
  const tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = renderer.capabilities.getMaxAnisotropy();
  const disk = new THREE.Mesh(new THREE.CircleGeometry(.97, 148), new THREE.MeshPhysicalMaterial({ map: tex, roughness: .35, clearcoat: .8, clearcoatRoughness: .15 }));
  disk.rotation.x = -Math.PI / 2; rotor.add(disk);
  for (let i = 0; i < N; i++) {
    const a = i * STEP, f = new THREE.Mesh(new THREE.BoxGeometry(.135, .035, .006), brass);
    f.position.set(Math.cos(a) * .97 * .73, .017, Math.sin(a) * .97 * .73); f.rotation.y = -a; rotor.add(f);
  }
  const tur = new THREE.Group(); rotor.add(tur);
  const at = (m, y) => { m.position.y = y; tur.add(m); };
  at(new THREE.Mesh(new THREE.CylinderGeometry(.05, .085, .2, 32), brass), .1);
  at(new THREE.Mesh(new THREE.SphereGeometry(.05, 24, 16), brass), .23);
  for (let i = 0; i < 4; i++) {
    const arm = new THREE.Mesh(new THREE.CylinderGeometry(.012, .012, .5, 12), brass);
    arm.rotation.z = Math.PI / 2; arm.rotation.y = i * Math.PI / 2; arm.position.y = .17; tur.add(arm);
    const k = new THREE.Mesh(new THREE.SphereGeometry(.024, 16, 12), brass);
    k.position.set(Math.cos(i * Math.PI / 2) * .25, .17, -Math.sin(i * Math.PI / 2) * .25); tur.add(k);
  }

  // bille
  const ball = new THREE.Mesh(new THREE.SphereGeometry(.034, 32, 16), new THREE.MeshPhysicalMaterial({ color: '#f6f2ea', roughness: .12, clearcoat: 1 }));
  scene.add(ball);

  const fit = () => {
    const w = box.clientWidth, h = box.clientHeight; if (!w || !h) return;
    renderer.setSize(w, h, false); camera.aspect = w / h;
    camera.position.set(0, 3.8, 3.3).multiplyScalar(w / h < 1 ? 1.25 : 1); camera.lookAt(0, -.05, 0); camera.updateProjectionMatrix();
  };
  fit(); new ResizeObserver(fit).observe(box);
  box.classList.add('on');

  /* cycle : la bille court sur la piste, ralentit, tombe dans une case et suit le cylindre, puis repart */
  let phi = 0, alpha = 0, va = 0, phase = 'spin', t = 0, lam0 = 0, lam1 = 0, seen = true, last = 0, px = 0, tx = 0;
  const vr = .55;
  const launch = () => { phase = 'spin'; t = 0; va = -7.5; };
  launch();
  const place = (rad, ang, y) => ball.position.set(Math.cos(ang) * rad, y, Math.sin(ang) * rad);
  const frame = now => {
    const dt = Math.min(.05, (now - (last || now)) / 1000); last = now; t += dt;
    phi += vr * dt; rotor.rotation.y = phi;
    if (phase === 'spin') {
      va *= Math.pow(.83, dt); alpha += va * dt;
      place(1.235, alpha, .2 + Math.sin(alpha * 3) * .002);
      if (t > 5.2) {
        phase = 'drop'; t = 0;
        const local = ((alpha + phi) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2);
        lam0 = local; lam1 = (Math.floor(local / STEP) - 1 + .5) * STEP;
      }
    } else if (phase === 'drop') {
      const k = clamp(t / 1.1), e = 1 - Math.pow(1 - k, 3);
      const lam = lam0 + (lam1 - lam0) * e + Math.sin(k * Math.PI * 3) * (1 - k) * .05;
      const rad = 1.235 + (.97 * .73 - 1.235) * e, y = .2 + (.055 - .2) * e + Math.abs(Math.sin(k * Math.PI * 2.5)) * (1 - k) * .04;
      place(rad, lam - phi, y);
      if (k >= 1) { phase = 'rest'; t = 0; }
    } else if (phase === 'rest') {
      place(.97 * .73, lam1 - phi, .055);
      if (t > 3.4) { alpha = lam1 - phi; launch(); }
    }
    px += (tx - px) * .05;
    scene.rotation.x = px * .06; scene.rotation.z = -px * .04;
    renderer.render(scene, camera);
    if (seen && !reduceMotion) requestAnimationFrame(frame);
  };
  box.addEventListener('pointermove', e => { const r = box.getBoundingClientRect(); tx = (e.clientX - r.left) / r.width - .5; });
  box.addEventListener('pointerleave', () => { tx = 0; });
  if (reduceMotion) { place(.97 * .73, .3, .055); renderer.render(scene, camera); return; }
  new IntersectionObserver(([e]) => { const was = seen; seen = e.isIntersecting; if (seen && !was) { last = 0; requestAnimationFrame(frame); } }).observe(box);
  requestAnimationFrame(frame);
}
