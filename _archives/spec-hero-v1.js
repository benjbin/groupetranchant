/* Groupe Tranchant — Activités spécialisées : ouverture en 3D, pour comprendre la page d'un coup d'œil.
   Au centre, le groupe (noyau lumineux cerclé de tricolore) ; autour, ses cinq filiales en orbite, chacune
   reconnaissable à son objet : machine à sous (CAT), baie de serveurs et courbe en direct (CERTUS),
   écran d'où sort un cube (ALIOSCOPY), empreinte balayée (ZALIX), globe et conteneur (IDS).
   Des flux de données relient chaque filiale au noyau. Les étiquettes HTML suivent les objets et mènent à leur section.
   Contrat : mountSpecHero(hero, { reduceMotion }). Textures procédurales, aucune image chargée. */
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';

const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const ease = t => t * t * (3 - 2 * t);
export const NAVY = 0x0B1B2E, ACC = 0x7FA8DA, GOLD = 0xF9C83B, BLUE = 0x2b5cff, RED = 0xE1000F;

export const std = (color, o = {}) => new THREE.MeshStandardMaterial({ color, roughness: .35, metalness: .6, ...o });
export const glow = (color, k = 2) => new THREE.MeshStandardMaterial({ color: 0x000000, emissive: color, emissiveIntensity: k, roughness: 1, metalness: 0 });

export function canvasTex(w, h, draw) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
  return t;
}

/* --- les cinq objets --- */
function slot() {
  const g = new THREE.Group();
  const body = new THREE.Mesh(new THREE.BoxGeometry(1.05, 1.5, .7), std(0x14233a, { metalness: .8, roughness: .3 }));
  const trim = new THREE.Mesh(new THREE.BoxGeometry(1.12, .08, .76), std(0xc9a24a, { metalness: 1, roughness: .25 }));
  trim.position.y = .78; const trim2 = trim.clone(); trim2.position.y = -.2;
  const top = new THREE.Mesh(new THREE.BoxGeometry(.9, .12, .2), glow(GOLD, 3)); top.position.set(0, .66, .3);
  const sym = canvasTex(128, 512, (x, w, h) => {
    x.fillStyle = '#f7f3ea'; x.fillRect(0, 0, w, h);
    ['7', 'BAR', '7', '♦', '7', 'BAR', '♣', '7'].forEach((s, i) => {
      x.fillStyle = s === '7' ? '#E1000F' : s === 'BAR' ? '#0B1B2E' : '#335F94';
      x.font = `bold ${s === 'BAR' ? 36 : 56}px Arial`; x.textAlign = 'center'; x.textBaseline = 'middle';
      x.fillText(s, w / 2, (i + .5) * h / 8);
    });
  });
  sym.wrapS = sym.wrapT = THREE.RepeatWrapping;
  const reels = [];
  for (let i = 0; i < 3; i++) {
    const t = sym.clone(); t.needsUpdate = true; t.wrapS = t.wrapT = THREE.RepeatWrapping;
    const r = new THREE.Mesh(new THREE.CylinderGeometry(.2, .2, .26, 32, 1, true), new THREE.MeshStandardMaterial({ map: t, roughness: .4, emissive: 0xffffff, emissiveMap: t, emissiveIntensity: .35 }));
    r.rotation.z = Math.PI / 2; r.position.set((i - 1) * .29, .28, .2); reels.push(t); g.add(r);
  }
  const win = new THREE.Mesh(new THREE.BoxGeometry(.92, .48, .1), std(0x0a1422)); win.position.set(0, .28, .2);
  const chips = new THREE.Group();
  [[RED, -.3], [BLUE, 0], [GOLD, .3]].forEach(([c, x], k) => {
    for (let i = 0; i < 4 + k; i++) { const ch = new THREE.Mesh(new THREE.CylinderGeometry(.11, .11, .035, 24), std(c, { metalness: .2, roughness: .5 })); ch.position.set(x, -.72 + i * .04, .52); chips.add(ch); }
  });
  g.add(body, trim, trim2, top, win, chips);
  g.userData.tick = t => reels.forEach((r, i) => { r.offset.y = (t * (.9 + i * .25)) % 1; });
  return g;
}

function rack() {
  const g = new THREE.Group(), leds = [];
  for (let i = 0; i < 4; i++) {
    const u = new THREE.Mesh(new THREE.BoxGeometry(1.1, .26, .8), std(0x15263d, { metalness: .85 }));
    u.position.y = -.55 + i * .3; g.add(u);
    for (let k = 0; k < 6; k++) { const l = new THREE.Mesh(new THREE.BoxGeometry(.06, .05, .02), glow(k % 3 ? ACC : 0x4cff9a, 3)); l.position.set(-.4 + k * .12, -.55 + i * .3, .41); g.add(l); leds.push(l); }
  }
  const bars = [];
  for (let k = 0; k < 6; k++) { const b = new THREE.Mesh(new THREE.BoxGeometry(.11, 1, .11), glow(k === 5 ? GOLD : ACC, 1.6)); b.position.set(-.38 + k * .15, .9, 0); g.add(b); bars.push(b); }
  g.userData.tick = t => {
    leds.forEach((l, i) => { l.material.emissiveIntensity = Math.sin(t * 6 + i * 1.7) > .2 ? 3 : .3; });
    bars.forEach((b, i) => { const h = .25 + .55 * (.5 + .5 * Math.sin(t * 1.4 + i * .9)) * (i + 2) / 7; b.scale.y = h; b.position.y = .78 + h / 2; });
  };
  return g;
}

function screen3d() {
  const g = new THREE.Group();
  const frame = new THREE.Mesh(new THREE.BoxGeometry(1.5, .95, .07), std(0x111c2c, { metalness: .9 }));
  const panel = new THREE.Mesh(new THREE.PlaneGeometry(1.4, .85), new THREE.MeshStandardMaterial({ color: 0x000000, emissive: 0x1d3f7a, emissiveIntensity: 1.2 }));
  panel.position.z = .04;
  const grid = new THREE.GridHelper(1.3, 8, ACC, 0x2a4f86); grid.rotation.x = Math.PI / 2; grid.position.z = .045; grid.scale.y = .62;
  const stand = new THREE.Mesh(new THREE.CylinderGeometry(.03, .03, .5), std(0x8c9bb0, { metalness: 1 })); stand.position.y = -.7;
  const cube = new THREE.Mesh(new THREE.BoxGeometry(.32, .32, .32), std(RED, { metalness: .3, roughness: .3 }));
  const ball = new THREE.Mesh(new THREE.SphereGeometry(.14, 32, 16), std(GOLD, { metalness: .7, roughness: .2 }));
  g.add(frame, panel, grid, stand, cube, ball);
  g.userData.tick = t => {
    const k = .5 + .5 * Math.sin(t * 1.2);
    cube.position.set(-.18, .02, .1 + k * .7); cube.rotation.set(t * .7, t, 0);
    ball.position.set(.35, .15 + Math.sin(t * 2) * .05, .2 + (1 - k) * .55);
  };
  return g;
}

function finger() {
  const g = new THREE.Group();
  const tex = canvasTex(512, 512, (x, w, h) => {
    x.fillStyle = '#06101c'; x.fillRect(0, 0, w, h);
    x.strokeStyle = '#F9C83B'; x.lineWidth = 5; x.lineCap = 'round';
    for (let r = 14; r < 230; r += 15) {
      x.beginPath();
      for (let a = 0; a <= Math.PI * 2 + .01; a += .04) {
        const rr = r * (1 + .1 * Math.sin(a * 2 + r * .03)) + 6 * Math.sin(a * 5 + r * .11);
        const px = w / 2 + Math.cos(a) * rr * .78, py = h / 2 + Math.sin(a) * rr - r * .25;
        a ? x.lineTo(px, py) : x.moveTo(px, py);
      }
      if ((r / 15 | 0) % 4 === 1) x.setLineDash([60, 18]); else x.setLineDash([]);
      x.stroke();
    }
  });
  const disc = new THREE.Mesh(new THREE.CircleGeometry(.72, 64), new THREE.MeshStandardMaterial({ map: tex, emissive: 0xffffff, emissiveMap: tex, emissiveIntensity: .9, roughness: .6 }));
  const ring = new THREE.Mesh(new THREE.TorusGeometry(.76, .025, 12, 80), std(0x9fb3cc, { metalness: 1, roughness: .2 }));
  const base = new THREE.Mesh(new THREE.CylinderGeometry(.82, .82, .08, 64), std(0x13233a)); base.rotation.x = Math.PI / 2; base.position.z = -.05;
  const scan = new THREE.Mesh(new THREE.PlaneGeometry(1.5, .03), glow(ACC, 4)); scan.position.z = .03;
  g.add(base, disc, ring, scan);
  g.userData.tick = t => { scan.position.y = Math.sin(t * 1.6) * .66; scan.scale.x = Math.sqrt(Math.max(0, 1 - (scan.position.y / .76) ** 2)); };
  return g;
}

function globe() {
  const g = new THREE.Group();
  const sphere = new THREE.Mesh(new THREE.SphereGeometry(.62, 48, 32), std(0x10223a, { metalness: .4, roughness: .55 }));
  const n = 900, pos = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) { const y = 1 - (i / (n - 1)) * 2, r = Math.sqrt(1 - y * y), th = i * 2.39996; pos.set([Math.cos(th) * r * .64, y * .64, Math.sin(th) * r * .64], i * 3); }
  const pg = new THREE.BufferGeometry(); pg.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const dots = new THREE.Points(pg, new THREE.PointsMaterial({ color: ACC, size: .018, transparent: true, opacity: .85 }));
  const earth = new THREE.Group(); earth.add(sphere, dots);
  const orbit = new THREE.Group();
  const box = new THREE.Mesh(new THREE.BoxGeometry(.36, .16, .16), std(RED, { metalness: .5, roughness: .45 })); box.position.x = .95;
  const route = new THREE.Mesh(new THREE.TorusGeometry(.95, .006, 6, 120), glow(GOLD, 2)); route.rotation.x = Math.PI / 2;
  orbit.add(box, route); orbit.rotation.z = .35;
  g.add(earth, orbit);
  g.userData.tick = t => { earth.rotation.y = t * .25; orbit.rotation.y = t * .6; };
  return g;
}

export function mountSpecHero(hero, { reduceMotion }) {
  return mountHub(hero, { reduceMotion, makers: [slot, rack, screen3d, finger, globe] });
}

/* Le moyeu : noyau du groupe, orbite, socles, flux, étiquettes. makers : une fonction par objet (Group, userData.tick(t)).
   fly() : avancée du défilement (0 → 1) si l'ouverture est épinglée ; sinon calculée sur la position du bloc. */
export function mountHub(hero, { reduceMotion, makers, fly: flyFn }) {
  const host = hero.querySelector('.sz-hero-gl');
  const labels = [...hero.querySelectorAll('.sz-orbit a')];
  let renderer;
  try { renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: 'high-performance' }); } catch { return; }
  renderer.setClearColor(0x08121f, 1);
  renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.05;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  host.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  scene.fog = new THREE.Fog(0x08121f, 16, 34);
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), .04).texture; scene.environmentIntensity = .55;
  const camera = new THREE.PerspectiveCamera(34, 1, .1, 60);
  const key = new THREE.DirectionalLight(0xfff1dc, 2.2); key.position.set(4, 6, 5); scene.add(key);
  const rim = new THREE.DirectionalLight(0x7fa8da, 2.4); rim.position.set(-6, 2, -4); scene.add(rim);

  const world = new THREE.Group(); scene.add(world);
  // sol : grille qui se perd dans la brume
  const grid = new THREE.GridHelper(40, 60, 0x2a4f86, 0x16304f); grid.position.y = -1.6; grid.material.transparent = true; grid.material.opacity = .45; world.add(grid);

  // noyau du groupe : sphère lumineuse, anneaux bleu-blanc-rouge
  const core = new THREE.Group(); world.add(core);
  // au cœur, le logo du groupe dans une bulle de verre
  const glass = new THREE.Mesh(new THREE.SphereGeometry(.78, 64, 32), new THREE.MeshPhysicalMaterial({ color: 0x9fc0ff, metalness: 0, roughness: .05, transparent: true, opacity: .16, clearcoat: 1, envMapIntensity: 2.2, side: THREE.DoubleSide, depthWrite: false }));
  const mesh = new THREE.Mesh(new THREE.IcosahedronGeometry(.8, 2), new THREE.MeshBasicMaterial({ color: ACC, wireframe: true, transparent: true, opacity: .14 }));
  core.add(glass, mesh);
  const src = hero.querySelector('.sz-logo-src');
  const logo = new THREE.Sprite(new THREE.SpriteMaterial({ color: 0xd8d8d8, transparent: true, depthWrite: false }));
  logo.scale.setScalar(1.35); logo.renderOrder = 2; core.add(logo);
  if (src) new THREE.TextureLoader().load(src.currentSrc || src.src, tx => { tx.colorSpace = THREE.SRGBColorSpace; logo.material.map = tx; logo.material.needsUpdate = true; });
  const rings = [BLUE, 0xffffff, RED].map((c, i) => { const r = new THREE.Mesh(new THREE.TorusGeometry(.95 + i * .14, .018, 10, 140), glow(c, c === 0xffffff ? 1.1 : 2)); r.rotation.set(Math.PI / 2 + (i - 1) * .35, (i - 1) * .4, 0); core.add(r); return r; });
  const coreLight = new THREE.PointLight(0x6f9bff, 6, 8); core.add(coreLight);

  // les cinq filiales sur l'orbite, chacune sur son socle
  const R = 3.4, sats = makers.map((mk, i) => {
    const pivot = new THREE.Group();
    const obj = mk(); obj.scale.setScalar(.82);
    const ped = new THREE.Mesh(new THREE.CylinderGeometry(.62, .7, .1, 48), std(0x0f1f35, { metalness: .9, roughness: .3 }));
    const halo = new THREE.Mesh(new THREE.TorusGeometry(.66, .012, 8, 96), glow(ACC, 2.5)); halo.rotation.x = Math.PI / 2; halo.position.y = .055;
    ped.position.y = -.95; halo.position.y = -.9;
    pivot.add(obj, ped, halo); world.add(pivot);
    return { pivot, obj, halo, a0: i / 5 * Math.PI * 2 - Math.PI / 2, hover: 0, thover: 0 };
  });

  // l'orbite tracée au sol, sous les socles
  const orbit = new THREE.Group(); orbit.position.y = -.98; world.add(orbit);
  const orb1 = new THREE.Mesh(new THREE.TorusGeometry(R, .012, 6, 200), glow(ACC, 1.4)); orb1.rotation.x = Math.PI / 2;
  const orb2 = new THREE.Mesh(new THREE.RingGeometry(R - .9, R + .9, 160), new THREE.MeshBasicMaterial({ color: 0x3d6fd1, transparent: true, opacity: .07, side: THREE.DoubleSide, depthWrite: false })); orb2.rotation.x = -Math.PI / 2;
  orbit.add(orb1, orb2);

  // flux de données : un trait par filiale, des impulsions qui vont et viennent
  const pulseGeo = new THREE.SphereGeometry(.045, 12, 8);
  const links = sats.map(() => {
    const line = new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3()]), new THREE.LineBasicMaterial({ color: ACC, transparent: true, opacity: .35 }));
    world.add(line);
    const pulses = [0, .33, .66].map((o, k) => { const p = new THREE.Mesh(pulseGeo, glow(k === 1 ? GOLD : ACC, 4)); world.add(p); return { p, o, dir: k === 1 ? -1 : 1 }; });
    return { line, pulses };
  });

  // poussière de données
  const dn = 500, dp = new Float32Array(dn * 3);
  for (let i = 0; i < dn; i++) dp.set([(Math.random() - .5) * 18, Math.random() * 7 - 1.5, (Math.random() - .5) * 18], i * 3);
  const dg = new THREE.BufferGeometry(); dg.setAttribute('position', new THREE.BufferAttribute(dp, 3));
  const dust = new THREE.Points(dg, new THREE.PointsMaterial({ color: ACC, size: .03, transparent: true, opacity: .5 })); world.add(dust);

  const composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));
  const bloom = new UnrealBloomPass(new THREE.Vector2(256, 256), .55, .45, .82); composer.addPass(bloom);
  composer.addPass(new OutputPass());

  let W = 1, H = 1, wide = true;
  const size = () => {
    W = host.clientWidth || 1; H = host.clientHeight || 1; wide = W / H > 1.15;
    const dpr = Math.min(devicePixelRatio || 1, 1.5);
    renderer.setPixelRatio(dpr); renderer.setSize(W, H, false); composer.setPixelRatio(dpr); composer.setSize(W, H);
    camera.aspect = W / H; camera.updateProjectionMatrix();
  };
  new ResizeObserver(size).observe(host); size();

  // pointeur et survol des étiquettes
  let mx = 0, my = 0, tmx = 0, tmy = 0;
  hero.addEventListener('pointermove', e => { tmx = e.clientX / innerWidth - .5; tmy = e.clientY / innerHeight - .5; });
  // une filiale à la fois est mise en avant : celle que l'on survole (étiquette ou objet), sinon tour à tour
  let focus = -1, userFocus = -1, cycleAt = 0;
  const setFocus = i => {
    if (i === focus) return; focus = i;
    sats.forEach((s, k) => { s.thover = k === i ? 1 : 0; });
    labels.forEach((a, k) => a.classList.toggle('on', k === i));
    hero.classList.toggle('sz-focus', i >= 0);
  };
  labels.forEach((a, i) => {
    a.addEventListener('mouseenter', () => { userFocus = i; setFocus(i); });
    a.addEventListener('mouseleave', () => { userFocus = -1; cycleAt = performance.now(); });
  });
  const ray = new THREE.Raycaster(), ndc = new THREE.Vector2();
  const hit = e => {
    const b = host.getBoundingClientRect();
    ndc.set((e.clientX - b.left) / b.width * 2 - 1, -(e.clientY - b.top) / b.height * 2 + 1);
    ray.setFromCamera(ndc, camera);
    const h = ray.intersectObjects(sats.map(s => s.pivot), true)[0];
    return h ? sats.findIndex(s => { let o = h.object; while (o) { if (o === s.pivot) return true; o = o.parent; } return false; }) : -1;
  };
  hero.addEventListener('pointermove', e => {
    if (e.target.closest('.sz-orbit a, .page-head-in')) return;
    const i = hit(e); hero.style.cursor = i >= 0 ? 'pointer' : '';
    if (i >= 0) { userFocus = i; setFocus(i); } else if (userFocus >= 0) { userFocus = -1; cycleAt = performance.now(); }
  });
  hero.addEventListener('click', e => { if (e.target.closest('a')) return; const i = hit(e); if (i >= 0) labels[i]?.click(); });

  const v = new THREE.Vector3();
  let on = true, t0 = performance.now(), intro = reduceMotion ? 1 : 0;
  const render = now => {
    const t = reduceMotion ? 3 : (now - t0) / 1000;
    intro = reduceMotion ? 1 : clamp(t / 2.6);
    const ei = ease(intro);
    let fly;
    if (flyFn) fly = flyFn();
    else { const r = hero.getBoundingClientRect(); fly = clamp(-r.top / Math.max(1, r.height)); hero.style.setProperty('--fly', fly.toFixed(4)); }
    mx += (tmx - mx) * .05; my += (tmy - my) * .05;

    // caméra : arrivée en plongée, puis le défilement l'approche du noyau
    const dist = (wide ? 18 : 22 + 12 * clamp(1 - W / H)) - ei * 1.5 - fly * 4;
    const elev = .62 - (1 - ei) * .3 + my * .1 - fly * .15;
    const az = (1 - ei) * .9 + mx * .35;
    camera.position.set(Math.sin(az) * dist * Math.cos(elev), Math.sin(elev) * dist + .2, Math.cos(az) * dist * Math.cos(elev));
    world.position.x = wide ? 2.7 : 0;   // sur grand écran, l'ensemble se tient à droite du titre
    camera.lookAt(0, wide ? -.4 : -2.6, 0);

    core.rotation.y = t * .3; rings.forEach((rg, i) => { rg.rotation.z = t * (.4 + i * .2) * (i % 2 ? -1 : 1); });
    coreLight.intensity = 5 + Math.sin(t * 2) * 1.5;
    if (userFocus < 0 && intro >= 1 && !reduceMotion && now - cycleAt > 3200) { cycleAt = now; setFocus((focus + 1) % sats.length); }
    const spin = t * .06 + fly * .8;
    orbit.scale.setScalar((wide ? 1 : .8) * (.35 + .65 * ei)); orb1.material.emissiveIntensity = 1 + Math.sin(t * 1.5) * .4;
    logo.material.rotation = Math.sin(t * .6) * .06;
    sats.forEach((s, i) => {
      s.hover += (s.thover - s.hover) * .12;
      const a = s.a0 + spin, rr = R * (wide ? 1 : .8) * (.35 + .65 * ease(clamp(intro * 1.4 - i * .08)));
      s.pivot.position.set(Math.cos(a) * rr, Math.sin(t * .9 + i) * .08 + s.hover * .25, Math.sin(a) * rr);
      s.pivot.lookAt(camera.position.x, s.pivot.position.y, camera.position.z);
      s.pivot.scale.setScalar((ease(clamp(intro * 1.6 - i * .12))) * (1 + s.hover * .18));
      s.halo.material.emissiveIntensity = 2.5 + s.hover * 5;
      s.obj.userData.tick?.(t);
      const L = links[i];
      L.line.geometry.attributes.position.setXYZ(1, s.pivot.position.x, s.pivot.position.y - .2, s.pivot.position.z); L.line.geometry.attributes.position.needsUpdate = true;
      L.line.material.opacity = .25 + s.hover * .5;
      L.pulses.forEach(pu => { const k = ((t * .45 * pu.dir + pu.o) % 1 + 1) % 1; pu.p.position.copy(s.pivot.position).multiplyScalar(k); pu.p.position.y = (s.pivot.position.y - .2) * k; pu.p.visible = intro > .6; });
      // étiquette : suit l'objet à l'écran
      if (labels[i]) {
        s.pivot.getWorldPosition(v); v.y += wide ? 1.15 : 1.05; v.project(camera);
        const hw = labels[i].firstElementChild.offsetWidth / 2 + 12;
        const x = clamp((v.x * .5 + .5) * W, hw, W - hw), y = Math.max(110, (-v.y * .5 + .5) * H);
        labels[i].style.transform = `translate(${x.toFixed(1)}px,${y.toFixed(1)}px)`;
        labels[i].style.opacity = (clamp(intro * 2 - 1 - i * .08) * (1 - fly * 1.6)).toFixed(3);
        labels[i].style.zIndex = v.z < 0.985 ? 3 : 2;
      }
    });
    dust.rotation.y = t * .02;
    composer.render();
  };
  const loop = now => { if (!on) return; render(now); if (!reduceMotion) requestAnimationFrame(loop); };
  new IntersectionObserver(([e]) => { const was = on; on = e.isIntersecting; if (on && !was) requestAnimationFrame(loop); }).observe(hero);
  hero.classList.add('gl-on');
  requestAnimationFrame(loop);
  if (reduceMotion) addEventListener('resize', () => requestAnimationFrame(render));
}
