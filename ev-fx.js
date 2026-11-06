/* Page établissement — « Une soirée chez Tranchant ».
   L'arrivée (la façade passe du jour à la nuit, l'enseigne s'allume, l'heure tourne), le seuil (l'accueil, puis les portes s'ouvrent),
   la salle (des jetons en 3D sur le tapis, battus lentement par une main invisible, un jeton qui roule sur sa tranche : décor seul, sans mise ni gain), la table, la nuit à l'hôtel jusqu'au lever du jour,
   puis « Composer ma soirée » (jour choisi, programme qui s'enchaîne, boutons selon les choix). */
const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const hm = m => `${String(Math.floor(m / 60) % 24).padStart(2, '0')}:${String(Math.round(m % 60)).padStart(2, '0')}`;

export function mountEv(root, { reduceMotion = false } = {}) {
  /* scènes épinglées : avancement 0 → 1 pendant que la section défile sous l'écran */
  const pins = [...root.querySelectorAll('.ev-arr, .ev-door, .ev-night')];
  const clocks = { 'ev-arr': [19 * 60, 19 * 60 + 55], 'ev-night': [0, 7 * 60 + 30] };
  const arr = root.querySelector('.ev-arr');
  let raf = 0;
  const update = () => {
    raf = 0;
    const vh = innerHeight;
    pins.forEach(s => {
      const r = s.getBoundingClientRect();
      if (r.bottom < -vh || r.top > vh * 2) return;
      // sans animation : portes fermées (le texte d'accueil reste lisible), nuit tombée
      const p = reduceMotion ? (s.classList.contains('ev-door') ? 0 : .7) : clamp(-r.top / Math.max(1, r.height - vh));
      s.style.setProperty('--ev', p.toFixed(4));
      const c = clocks[[...s.classList].find(k => clocks[k])];
      const t = s.querySelector('.ev-clock span, .ev-time span');
      if (c && t) t.textContent = hm(c[0] + (c[1] - c[0]) * (Math.round(p * 20) / 20));
    });
    // l'enseigne s'allume d'un coup, avec un petit battement de néon
    if (arr) arr.classList.toggle('lit', +arr.style.getPropertyValue('--ev') > .42);
  };
  const req = () => { if (!raf) raf = requestAnimationFrame(update); };
  addEventListener('scroll', req, { passive: true }); addEventListener('resize', req);
  update();

  /* guirlande de lumières de la salle */
  const bulbs = root.querySelector('.ev-bulbs');
  if (bulbs) for (let i = 0; i < 24; i++) { const b = document.createElement('i'); b.style.setProperty('--i', i); bulbs.appendChild(b); }

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

  /* jour de la visite : règle l'heure de fermeture du programme et le statut de l'ouverture */
  const DAYS = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];
  const days = [...root.querySelectorAll('.ev-days button')];
  const tDay = root.querySelector('.ev-ticket-d'), status = root.querySelector('[data-status]');
  const today = new Date().getDay();
  const isLate = d => d === 5 || d === 6;
  let day = today;
  if (status) status.textContent = `Ouvert ce soir jusqu'à ${isLate(today) ? 4 : 3} h, tous les jours de l'année.`;
  days.forEach(b => b.setAttribute('aria-label', DAYS[+b.dataset.d]));

  /* composer ma soirée : les étapes cochées s'enchaînent à partir de 20 h, puis la fermeture */
  const opts = [...root.querySelectorAll('.ev-opts button')], tpl = root.querySelector('#ev-t');
  const steps = root.querySelector('.ev-steps'), acts = root.querySelector('.ev-acts'), say = root.querySelector('[data-say]');
  const ticket = root.querySelector('.ev-ticket'), age = root.querySelector('[data-age]');
  const compose = () => {
    const on = new Set(opts.filter(b => b.getAttribute('aria-pressed') === 'true').map(b => b.dataset.o));
    let t = 20 * 60;
    const lis = [...tpl.content.querySelectorAll('li')].filter(li => on.has(li.dataset.o) || (li.dataset.o === 'close' && on.size)).map((li, i) => {
      const n = li.cloneNode(true); n.style.setProperty('--k', i);
      if (n.dataset.min) { n.querySelector('b').textContent = hm(t); t += +n.dataset.min; }
      if (n.dataset.o === 'close') n.querySelector('b').textContent = isLate(day) ? '04:00' : '03:00';
      return n;
    });
    steps.replaceChildren(...lis);
    // un seul bouton plein : la première réservation proposée
    const as = [...tpl.content.querySelectorAll('a')].filter(a => on.has(a.dataset.o) || a.dataset.o === 'any').map(a => a.cloneNode(true));
    as.find(a => a.dataset.o !== 'any')?.classList.add('solid');
    acts.replaceChildren(...as);
    ticket?.classList.toggle('empty', !on.size);
    if (age) age.hidden = !on.has('jeux');
    return lis.length;
  };
  const setDay = d => {
    day = d;
    days.forEach(b => b.setAttribute('aria-pressed', String(+b.dataset.d === d)));
    if (tDay) tDay.textContent = d === today ? 'Ce soir' : DAYS[d] + ' soir';
    if (tpl && steps) compose();
  };
  days.forEach(b => b.addEventListener('click', () => {
    setDay(+b.dataset.d);
    if (say) say.textContent = `${DAYS[day]} : fermeture à ${isLate(day) ? 4 : 3} h.`;
  }));
  opts.forEach(b => b.addEventListener('click', () => {
    const was = b.getAttribute('aria-pressed') === 'true';
    b.setAttribute('aria-pressed', String(!was));
    const n = compose();
    if (say) say.textContent = `${b.textContent.trim()} ${was ? 'retiré' : 'ajouté'}. Votre soirée : ${n} étape${n > 1 ? 's' : ''}.`;
  }));
  setDay(today);

  /* jetons 3D (dans .ev-wheel, nom de classe hérité du gabarit), chargés à l'approche de la salle (pas en mouvement réduit ni en économie de données) */
  const table = root.querySelector('.ev-wheel'), pause = root.querySelector('.ev-pause'), room = root.querySelector('.ev-room');
  const ctl = { paused: false, kick: null };
  if (pause) {
    if (reduceMotion) pause.hidden = true;
    pause.addEventListener('click', () => {
      ctl.paused = !ctl.paused;
      pause.setAttribute('aria-pressed', String(ctl.paused));
      pause.textContent = ctl.paused ? "Relancer l'animation" : "Mettre en pause l'animation";
      room?.classList.toggle('paused', ctl.paused);
      if (!ctl.paused) ctl.kick?.();
    });
  }
  if (table && !reduceMotion && !navigator.connection?.saveData) {
    const io = new IntersectionObserver(([e]) => {
      if (!e.isIntersecting) return; io.disconnect();
      const go = () => mountJetons(table, ctl).catch(err => console.warn('jetons 3D indisponibles', err));
      'requestIdleCallback' in window ? requestIdleCallback(go, { timeout: 1500 }) : setTimeout(go, 200);
    }, { rootMargin: '1200px' });
    io.observe(table);
  }
}

/* ---------- jetons : sur un tapis bleu nuit, deux piles (rouge, noire) qu'une main invisible bat lentement, trois piles posées,
   un jeton couché, et un jeton qui roule sur sa tranche en faisant le tour de la table. Chaque pose est calculée au contact exact :
   piles aux multiples de l'épaisseur, battage par niveaux alternés, cercle de roulement hors des piles ; aucun jeton n'en traverse un autre ---------- */
async function mountJetons(box, ctl) {
  const coarse = matchMedia('(pointer:coarse)').matches;
  const probe = document.createElement('canvas');
  const gl = probe.getContext('webgl2') || probe.getContext('webgl');
  if (!gl) return;
  gl.getExtension('WEBGL_lose_context')?.loseContext();
  const THREE = await import('three');
  const { RoomEnvironment } = await import('three/addons/environments/RoomEnvironment.js');
  const { chipKit } = await import('./jeton-portail.js');
  const PI = Math.PI;
  const renderer = new THREE.WebGLRenderer({ antialias: !coarse, alpha: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, coarse ? 1.5 : 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.NeutralToneMapping; renderer.toneMappingExposure = 1;
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.domElement.setAttribute('aria-hidden', 'true');
  // le tapis se fond dans la salle : bords du calque adoucis, sans arête visible
  renderer.domElement.style.webkitMaskImage = renderer.domElement.style.maskImage = 'radial-gradient(closest-side, #000 86%, transparent)';
  box.appendChild(renderer.domElement);
  const scene = new THREE.Scene();
  const pm = new THREE.PMREMGenerator(renderer);
  scene.environment = pm.fromScene(new RoomEnvironment(), .04).texture;
  const camera = new THREE.PerspectiveCamera(30, 1, .1, 50);
  const key = new THREE.SpotLight('#ffe9c4', 30, 16, .5, .85, 1.6); key.position.set(-1.6, 5.2, 2.4);
  key.castShadow = true; key.shadow.mapSize.setScalar(coarse ? 1024 : 2048); key.shadow.bias = -.0004; key.shadow.normalBias = .012; key.shadow.radius = 3;
  Object.assign(key.shadow.camera, { near: 2, far: 12 });
  scene.add(key, key.target);
  scene.add(new THREE.AmbientLight('#8fa6c2', .2));
  // contre-jour laiton : détache les tranches du fond bleu nuit
  const back = new THREE.DirectionalLight('#C9A862', 1.4); back.position.set(2, 1.6, -3.5); scene.add(back);

  // le jeton de la DA (jeton-portail.js) : faces GT, tranche à inserts ivoire, liseré or ; réduit, axe vertical
  const K = chipKit(renderer, { lite: coarse });
  const { R, CT, C, chipFace, chipEdge, edgeGeo, faceGeo, ringGeo, goldMat, clay } = K;
  const S = .16, rS = R * S, hS = CT * S;
  const both = (geo, z) => {          // deux faces opposées en une géométrie, couchées (axe Y)
    const a = geo.clone().translate(0, 0, z), b = geo.clone().rotateY(PI).translate(0, 0, -z), g = new THREE.BufferGeometry(), n = a.attributes.position.count;
    ['position', 'normal', 'uv'].forEach(k => { const A = a.attributes[k].array, B = b.attributes[k].array, v = new Float32Array(A.length + B.length); v.set(A); v.set(B, A.length); g.setAttribute(k, new THREE.BufferAttribute(v, a.attributes[k].itemSize)); });
    const ia = a.index.array, ib = b.index.array, idx = new Uint32Array(ia.length + ib.length); idx.set(ia); ib.forEach((v, i) => { idx[ia.length + i] = v + n; });
    g.setIndex(new THREE.BufferAttribute(idx, 1)); return g.rotateX(-PI / 2);
  };
  const edge2 = edgeGeo.clone().rotateX(-PI / 2), face2 = both(faceGeo, CT / 2), ring2 = both(ringGeo.clone().scale(1, 1, .35), CT / 2 + .004);

  // tapis : feutre bleu nuit au grain fin, qui se fond dans la salle sur ses bords ; il reçoit les ombres
  const fs = coarse ? 512 : 1024, fc = document.createElement('canvas'); fc.width = fc.height = fs;
  const fx = fc.getContext('2d'), fd = fx.createImageData(fs, fs);
  for (let i = 0; i < fd.data.length; i += 4) { const v = 22 + Math.random() * 16; fd.data[i] = v * .55; fd.data[i + 1] = v * 1.05; fd.data[i + 2] = v * 1.6; fd.data[i + 3] = 255; }
  fx.putImageData(fd, 0, 0);
  const ac = document.createElement('canvas'); ac.width = ac.height = 256;
  const ax = ac.getContext('2d'), ag = ax.createRadialGradient(128, 128, 0, 128, 128, 128);
  ag.addColorStop(0, '#fff'); ag.addColorStop(.5, '#e8e8e8'); ag.addColorStop(.78, '#444'); ag.addColorStop(.92, '#000'); ax.fillStyle = ag; ax.fillRect(0, 0, 256, 256);
  const feltTex = new THREE.CanvasTexture(fc); feltTex.colorSpace = THREE.SRGBColorSpace;
  const felt = new THREE.Mesh(new THREE.CircleGeometry(2.05, 128), new THREE.MeshStandardMaterial({ map: feltTex, alphaMap: new THREE.CanvasTexture(ac), transparent: true, depthWrite: false, roughness: 1, metalness: 0, envMapIntensity: .25 }));
  felt.rotation.x = -PI / 2; felt.receiveShadow = true; felt.renderOrder = -1; scene.add(felt);

  /* les jetons : battage (6 rouges à gauche, 6 noirs à droite), piles posées, un jeton couché, le jeton qui roule */
  const rnd = (n, k) => { const v = Math.sin(n * 12.9898 + k * 78.233) * 43758.5453; return v - Math.floor(v); };
  const chips = [], NB = 6, NT = 2 * NB, AX = 0, AZ = .22, G = rS + .03;
  for (let j = 0; j < NB; j++) [-1, 1].forEach(sd => chips.push({ role: 'riffle', col: sd < 0 ? 0 : 1, sd, j, o: 2 * j + (sd < 0 ? 1 : 0) }));
  [[-.78, -.62, 9, 0], [.12, -.86, 5, 1], [.86, -.5, 3, 0]].forEach(([x, z, n, col]) => { for (let j = 0; j < n; j++) chips.push({ role: 'pile', col, x, z, j }); });
  chips.push({ role: 'pile', col: 1, x: -.75, z: .72, j: 0 });
  chips.push({ role: 'roll', col: 0 });
  chips.forEach((c, n) => Object.assign(c, { n, s0: rnd(n, 1) * PI * 2, dx: (rnd(n, 2) - .5) * .012, dz: (rnd(n, 3) - .5) * .012 }));
  const inst = (geo, mat, n) => { const m = new THREE.InstancedMesh(geo, mat, n); m.castShadow = m.receiveShadow = true; scene.add(m); return m; };
  const cnt = [0, 0];
  chips.forEach(c => { c.ci = cnt[c.col]++; });
  const kinds = [C.red, C.black].map((b, col) => ({ edge: inst(edge2, clay(chipEdge(b)), cnt[col]), face: inst(face2, clay(chipFace(b, true)), cnt[col]) }));
  const rings = inst(ring2, goldMat, chips.length); rings.castShadow = false;

  const dum = new THREE.Object3D(), qa = new THREE.Quaternion(), qb = new THREE.Quaternion();
  const UP = new THREE.Vector3(0, 1, 0), XV = new THREE.Vector3(1, 0, 0), ZV = new THREE.Vector3(0, 0, 1);
  const seg = (x, a, b) => clamp((x - a) / (b - a)), sm = x => x * x * (3 - 2 * x), mix = (a, b, e) => a + (b - a) * e;
  const over = x => 1 + 2.2 * (x - 1) ** 3 + 1.2 * (x - 1) ** 2;      // léger dépassement puis retour
  const put = c => { dum.scale.setScalar(S); dum.updateMatrix(); const m = kinds[c.col]; m.edge.setMatrixAt(c.ci, dum.matrix); m.face.setMatrixAt(c.ci, dum.matrix); rings.setMatrixAt(c.n, dum.matrix); };
  /* battage : la main penche les deux piles sur leur arête extérieure (bords intérieurs levés), écarte les jetons d'une épaisseur
     (niveaux alternés : noir, rouge, noir…), les redresse, puis les fait glisser un à un vers le centre, chacun à sa hauteur exacte ;
     la pile alternée tient un moment, puis le geste se défait à l'envers */
  const riffle = (c, q) => {
    const { sd, j, o } = c, rx = -sd * rS;
    const a = -sd * .13 * sm(seg(q, 0, .3)) * (1 - sm(seg(q, .4, .55)));
    const yl = mix(hS * (j + .5), hS * (o + .5), sm(seg(q, .08, .4)));
    const e = over(seg(q, .55 + o / NT * .3, .7 + o / NT * .3));
    dum.position.set(AX + sd * (G + rS) + rx * Math.cos(a) - yl * Math.sin(a) - sd * G * e + c.dx * (1 - e), rx * Math.sin(a) + yl * Math.cos(a), AZ + c.dz * (1 - e));
    dum.quaternion.setFromAxisAngle(ZV, a).multiply(qa.setFromAxisAngle(UP, c.s0 + (sd < 0 ? .35 : -.3) * sm(seg(q, .55, 1))));
  };
  /* roulement : le jeton suit un cercle autour des piles, penché vers l'intérieur, sans glisser (rotation propre = chemin / rayon) */
  const RHO = 1.5, LEAN = .17, WR = .3;
  const roll = (c, t) => {
    const ph = t * WR + 1.2, rho = RHO + .03 * Math.sin(ph * 2), cx = Math.cos(ph), sz = Math.sin(ph);
    const rc = rho - rS * Math.sin(LEAN) + hS / 2 * Math.cos(LEAN), y = rS * Math.cos(LEAN) + hS / 2 * Math.sin(LEAN);
    dum.position.set(cx * rc, y, sz * rc);
    dum.quaternion.setFromAxisAngle(UP, -ph - PI / 2).multiply(qa.setFromAxisAngle(XV, PI / 2 + LEAN)).multiply(qb.setFromAxisAngle(UP, -t * WR * RHO / rS + c.s0));
  };
  const pose = t => {
    // cycle de 13 s : battage 4,6 s, la pile alternée tient 2,6 s, le geste se défait en 4,2 s, repos 1,6 s
    const T = t % 13, q = T < 4.6 ? T / 4.6 : T < 7.2 ? 1 : T < 11.4 ? 1 - (T - 7.2) / 4.2 : 0;
    chips.forEach(c => {
      if (c.role === 'riffle') riffle(c, q);
      else if (c.role === 'roll') roll(c, t);
      else { dum.position.set(c.x + c.dx, hS * (c.j + .5), c.z + c.dz); dum.quaternion.setFromAxisAngle(UP, c.s0); }
      put(c);
    });
    kinds.forEach(m => { m.edge.instanceMatrix.needsUpdate = m.face.instanceMatrix.needsUpdate = true; });
    rings.instanceMatrix.needsUpdate = true;
  };

  const fit = () => {
    const w = box.clientWidth, h = box.clientHeight; if (!w || !h) return;
    renderer.setSize(w, h, false); camera.aspect = w / h;
    const d = 1.85 / Math.tan(THREE.MathUtils.degToRad(15)) / Math.min(1, w / h);
    camera.position.set(0, .6, .8).normalize().multiplyScalar(d); camera.lookAt(0, .1, -.4); camera.updateProjectionMatrix();
  };
  fit(); new ResizeObserver(fit).observe(box);
  pose(0); renderer.compile(scene, camera);
  box.classList.add('on');

  let t = 0, seen = true, last = 0, px = 0, tx = 0;
  const frame = now => {
    const dt = Math.min(.05, (now - (last || now)) / 1000); last = now; t += dt;
    pose(t);
    px += (tx - px) * .05;
    scene.rotation.x = px * .05; scene.rotation.y = -px * .08;
    renderer.render(scene, camera);
    if (seen && !ctl.paused) requestAnimationFrame(frame); else running = false;
  };
  let running = true;
  ctl.kick = () => { if (!running && seen) { running = true; last = 0; requestAnimationFrame(frame); } };
  box.addEventListener('pointermove', e => { const r = box.getBoundingClientRect(); tx = (e.clientX - r.left) / r.width - .5; });
  box.addEventListener('pointerleave', () => { tx = 0; });
  new IntersectionObserver(([e]) => { const was = seen; seen = e.isIntersecting; if (seen && !was) ctl.kick(); }).observe(box);
  requestAnimationFrame(frame);
}
