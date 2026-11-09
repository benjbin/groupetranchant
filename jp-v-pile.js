/* Transition « La pile » : vue plongeante sur le tapis. Vingt jetons rouges et noirs tombent un à un et montent une haute
   pile au centre (chacun se pose au contact exact du précédent, avec un léger rebond) ; la pile vacille sur sa tranche,
   puis se vide par le haut en cascade : chaque jeton glisse, bascule par-dessus le bord, claque sur le tapis et file hors
   champ, chacun dans sa direction. Le tapis se perce dans le sillage des jetons, puis s'ouvre entièrement sur la suite.
   Tout est une fonction pure de q (aucun temps réel) : la mécanique est calculée en secondes « physiques » τ = q · TT. */
export function create(ctx) {
  const { THREE, renderer, camera, K, env, view, LITE, seg, sm, mix, clamp01 } = ctx;
  const PI = Math.PI, R = K.R, CT = K.CT, N = 20;
  const TT = 4.6, G = 956;                                   // durée physique de la zone (s) ; pesanteur (unité ≈ 1 cm / 0,97)
  const rnd = (i, s) => { const x = Math.sin(i * 127.1 + s * 311.7) * 43758.5453; return x - Math.floor(x); };

  /* ---------- scène ---------- */
  const scene = new THREE.Scene();
  scene.environment = env; scene.environmentRotation.x = -PI / 2;    // reflets du studio pris de côté (comme la chute) : rouge profond, sans voile
  const key = new THREE.DirectionalLight(0xFFF0DA, 2.1); key.position.set(-5, -7, 22);
  key.castShadow = true;
  const SM = LITE ? 1024 : 2048;
  key.shadow.mapSize.set(SM, SM);
  Object.assign(key.shadow.camera, { left: -17, right: 17, top: 17, bottom: -17, near: 11.6, far: 70 });   // plan proche : un jeton encore haut dans l'air ne porte pas d'ombre nette (son ombre de contact prend le relais)
  key.shadow.bias = -.0004; key.shadow.normalBias = .02; key.shadow.radius = 3;
  const rim = new THREE.DirectionalLight(0x8FB4E6, .8); rim.position.set(9, 12, 6);
  scene.add(key, key.target, rim, new THREE.AmbientLight(0xffffff, .06));
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;   // seules les lumières qui portent ombre (ici) en tiennent compte

  /* jetons instanciés (axe du jeton = z local) */
  const merge = gs => {
    const g = new THREE.BufferGeometry(), at = { position: [], normal: [], uv: [] }, idx = []; let o = 0;
    gs.forEach(s => { for (const k in at) at[k].push(...s.attributes[k].array); s.index.array.forEach(i => idx.push(i + o)); o += s.attributes.position.count; });
    for (const k in at) g.setAttribute(k, new THREE.Float32BufferAttribute(at[k], k === 'uv' ? 2 : 3));
    g.setIndex(idx); return g;
  };
  const both = (geo, z) => merge([geo.clone().translate(0, 0, z), geo.clone().rotateY(PI).translate(0, 0, -z)]);
  const faceG = both(K.faceGeo, CT / 2), ringG = both(K.ringGeo.clone().scale(1, 1, .35), CT / 2 + .004);
  // couleurs : alternance irrégulière, comme une pile montée à la main
  const COL = [...Array(N)].map((_, k) => (rnd(k, 3) < .5 ? 0 : 1));
  COL[N - 1] = 0;                                                   // le dernier posé (GT au sommet) est rouge
  const kinds = [K.C.red, K.C.black].map((b, col) => {
    const n = Math.max(1, COL.filter(c => c === col).length);
    const mk = (geo, map) => { const mt = K.clay(map); mt.clearcoat = .4; mt.clearcoatRoughness = .42;   // vernis moins miroir : vu d'en haut, pas d'éblouissement
      const m = new THREE.InstancedMesh(geo, mt, n); m.castShadow = m.receiveShadow = true; m.frustumCulled = false; scene.add(m); return m; };
    return { edge: mk(K.edgeGeo, K.chipEdge(b)), face: mk(faceG, K.chipFace(b, true)) };
  });
  const rings = new THREE.InstancedMesh(ringG, K.goldMat, N); rings.frustumCulled = false; scene.add(rings);
  const CI = []; { const c = [0, 0]; COL.forEach((col, k) => CI.push(c[col]++)); }

  /* ---------- tapis : feutre bleu nuit, ombre de contact, percé dans le sillage des jetons ---------- */
  const HOLE = `
    uniform vec4 uTr[${N}]; uniform float uTw[${N}]; uniform float uHc, uGrow;
    float hh(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
    float vn(vec2 p){ vec2 i = floor(p), f = fract(p); f = f * f * (3. - 2. * f);
      return mix(mix(hh(i), hh(i + vec2(1, 0)), f.x), mix(hh(i + vec2(0, 1)), hh(i + vec2(1, 1)), f.x), f.y); }
    float cap(vec2 p, vec2 a, vec2 b){ vec2 pa = p - a, ba = b - a; float h = clamp(dot(pa, ba) / max(dot(ba, ba), 1e-4), 0., 1.); return length(pa - ba * h); }
    float holeD(vec2 p){                       // distance signée au bord du trou (< 0 : percé)
      float d = length(p) - uHc;
      for (int i = 0; i < ${N}; i++) if (uTw[i] > 0.) d = min(d, cap(p, uTr[i].xy, uTr[i].zw) - uTw[i] - uGrow);
      return d + (vn(p * 2.3) - .5) * .16 + (vn(p * 9.) - .5) * .05;     // bord déchiré, fibreux
    }`;
  const U = {
    uL: { value: 0 }, uTr: { value: [...Array(N)].map(() => new THREE.Vector4()) }, uTw: { value: new Float32Array(N) },
    uHc: { value: -1 }, uGrow: { value: 0 }, uAO: { value: [...Array(N)].map(() => new THREE.Vector4()) }
  };
  const felt = new THREE.Mesh(new THREE.PlaneGeometry(800, 800), new THREE.ShaderMaterial({
    uniforms: U, transparent: true, depthTest: false, depthWrite: false, premultipliedAlpha: true,
    vertexShader: 'varying vec2 vW; void main(){ vec4 w = modelMatrix * vec4(position, 1.); vW = w.xy; gl_Position = projectionMatrix * viewMatrix * w; }',
    fragmentShader: `varying vec2 vW; uniform float uL; uniform vec4 uAO[${N}];
      ${HOLE}
      void main(){
        vec2 p = vW;
        vec3 c = vec3(.0431, .1059, .1804);
        float pool = 1. - smoothstep(2., 19., length(p * vec2(1., 1.15) - vec2(-1.5, 1.)));
        c += uL * (vec3(.045, .065, .075) * pool + (vn(p * 9.) - .5) * .012 + (hh(gl_FragCoord.xy) - .5) * .01);
        float ao = 0.;
        for (int i = 0; i < ${N}; i++) { vec4 a = uAO[i]; if (a.w > 0.) { float r = length(p - a.xy) / a.z; ao = max(ao, a.w * (1. - smoothstep(.82, 1.32, r))); } }
        c *= 1. - ao;
        float d = holeD(p), aa = fwidth(d) * .8 + .002;
        float m = smoothstep(-aa, aa, d);
        c += uL * vec3(.10, .12, .14) * (1. - smoothstep(0., .07, d)) * m;      // fibres claires de la coupe
        float lip = .4 * smoothstep(-.6, 0., d) * (1. - m);                     // le feutre ombre légèrement la suite au bord
        gl_FragColor = vec4(c, 1.) * m + vec4(0., 0., 0., lip);
      }` }));
  felt.frustumCulled = false;
  const under = new THREE.Scene(); under.add(felt);
  // ombres portées (carte d'ombre) sur le feutre seulement
  const shMat = new THREE.ShadowMaterial({ opacity: .62, depthWrite: false });
  shMat.onBeforeCompile = s => {
    Object.assign(s.uniforms, { uTr: U.uTr, uTw: U.uTw, uHc: U.uHc, uGrow: U.uGrow });
    s.vertexShader = 'varying vec2 vW;\n' + s.vertexShader.replace('#include <worldpos_vertex>', '#include <worldpos_vertex>\nvW = (modelMatrix * vec4(transformed, 1.)).xy;');
    s.fragmentShader = 'varying vec2 vW;\n' + HOLE + s.fragmentShader.replace('gl_FragColor = vec4( color, opacity * ( 1.0 - getShadowMask() ) );',
      'float hd = holeD(vW); gl_FragColor = vec4(color, opacity * (1.0 - getShadowMask()) * smoothstep(-.02, .02, hd));');
  };
  const shPlane = new THREE.Mesh(new THREE.PlaneGeometry(120, 120), shMat);
  shPlane.receiveShadow = true; shPlane.renderOrder = -1; shPlane.frustumCulled = false; scene.add(shPlane);

  /* ---------- mécanique (précalculée une fois) ---------- */
  const lift = a => CT / 2 * Math.cos(a) + R * Math.abs(Math.sin(a));
  const H0 = 34;                                              // hauteur de chute au-dessus de la pile
  const tf = Math.sqrt(2 * H0 / G), E1 = .16;                 // durée de la chute ; restitution
  const C = [...Array(N)].map((_, k) => {
    const land = TT * (.07 + .33 * Math.pow(k / (N - 1), .82)); // le rythme s'accélère
    const o = [k ? (rnd(k, 1) - .5) * .12 : 0, k ? (rnd(k, 2) - .5) * .12 : 0];   // pile montée à la main : infimes décalages
    return { k, land, rel: land - tf, o, spin: rnd(k, 4) * 6.28, ta: rnd(k, 5) * 6.28, a0: .05 + rnd(k, 6) * .05,
      th: 0, vs: 0, p: 0, lv: 0, ld: 0 };
  });
  // la pile vacille : balancement rigide sur le bord de sa base (contact exact avec le feutre au point de pivot)
  const QW0 = .405, QW1 = .5;
  const peelQ = k => QW1 + (N - 1 - k) * .0125;              // la cascade vide la pile par le haut
  const rockAmp = q => .095 * sm(seg(q, QW0, QW0 + .07)) * (1 - sm(seg(q, QW1 + .03, peelQ(0) - .01)));
  const rock = q => { const t = (q - QW0) * TT; return rockAmp(q) * Math.sin(2 * PI * 2.6 * t) * (1 + .25 * Math.sin(2 * PI * 1.1 * t)); };
  const rockDir = q => .9 + 1.6 * (q - QW0);
  const GOLD = PI * (3 - Math.sqrt(5));
  C.forEach(c => {
    c.th = -PI / 2 + .35 + ((N - 1 - c.k) * 7 % N) * 2 * PI / N + (rnd(c.k, 7) - .5) * .14;   // chacun sa direction, deux voisins d'angle partent à trois jetons d'écart
    c.vs = 64 + rnd(c.k, 8) * 16;                                            // vitesse d'éjection (u/s)
    c.p = peelQ(c.k) * TT;
  });
  const PHI = .14;                                                            // bascule maximale par-dessus le bord
  const dist = (c, s) => c.vs * s * s / (s + .02);                           // départ sans à-coup
  const dDot = (c, s) => c.vs * (s * s + .04 * s) / ((s + .02) ** 2);
  // bascule : quand le centre a franchi le bord, le jeton pivote sur l'arête du jeton du dessous
  // le jeton quitte la pile quand son bord intérieur passe l'arête, ou plus tôt si son bord extérieur touche le feutre
  const tipLeave = c => { let a = 0, b = 2; for (let i = 0; i < 40; i++) { const m = (a + b) / 2; local(c, c.p + m, V); (V.lv ? b = m : a = m); } return b; };
  const V = { x: 0, y: 0, z: 0, nx: 0, ny: 0, nz: 1, sp: 0, lv: false };
  // pose dans le repère de la pile (avant de quitter la pile)
  function local(c, tau, out, sup = -1e9) {
    const k = c.k, base = k * CT + CT / 2;
    let x = c.o[0], y = c.o[1], z, a = 0, ad = c.ta, sp = c.spin;
    if (tau < c.p) {                                              // chute puis rebonds
      const dt = tau - c.rel;
      if (dt < tf) {
        z = base + H0 - G * dt * dt / 2; a = .18 * Math.sin(dt * 7 + c.ta) * (1 - dt / tf) + c.a0 * dt / tf; sp += dt * 1.6;
        z = Math.max(z, base + lift(a) - CT / 2);
      } else {
        let s = dt - tf, v = E1 * G * tf, zb = 0;
        for (let j = 0; j < 3; j++) { const du = 2 * v / G; if (s < du) { zb = v * s - G * s * s / 2; break; } s -= du; v *= E1 * .8; }
        const w = dt - tf; a = c.a0 * Math.exp(-w / .05) * Math.cos(w * 70); sp += tf * 1.6 + .25 * (1 - Math.exp(-w / .1));
        z = base + zb + lift(a) - CT / 2;
      }
      z = Math.max(z, sup + lift(a));                              // jamais dans le jeton du dessous, même s'il bouge encore
      ad = c.ta + (dt - tf) * 9;
      out.x = x; out.y = y; out.z = z;
      const sa = Math.sin(a); out.nx = sa * Math.cos(ad); out.ny = sa * Math.sin(ad); out.nz = Math.cos(a); out.sp = sp;
      return;
    }
    const s = tau - c.p, d = dist(c, s), cx = Math.cos(c.th), cy = Math.sin(c.th);
    sp += tf * 1.6 + .25 + s * 2;
    const dr = cx * c.o[0] + cy * c.o[1] + d;
    out.lv = false;
    if (k === 0 || dr <= R) { out.x = x + cx * d; out.y = y + cy * d; out.z = base; out.nx = out.ny = 0; out.nz = 1; out.sp = sp; return; }
    // pivot sur l'arête E du jeton du dessous
    const below = C[k - 1].o, op = -cy * c.o[0] + cx * c.o[1];
    const sr = dr - R, ph = Math.min(PHI * (sr / R) ** 2, Math.asin(Math.min(1, k * CT / (sr + R))));   // le bord extérieur ne descend pas sous le feutre
    const Ex = below[0] + cx * R - cy * op, Ey = below[1] + cy * R + cx * op, Ez = k * CT;
    const ca = Math.cos(ph), sa = Math.sin(ph);
    out.x = Ex + sr * ca * cx + CT / 2 * sa * cx; out.y = Ey + sr * ca * cy + CT / 2 * sa * cy;
    out.z = Ez - sr * sa + CT / 2 * ca;
    out.nx = sa * cx; out.ny = sa * cy; out.nz = ca; out.sp = sp; out.lv = sr >= 1.03 * R;
  }
  // repère de la pile : rotation rigide autour du point de pivot sur le bord de la base
  const qS = new THREE.Quaternion(), axS = new THREE.Vector3(), vT = new THREE.Vector3(), pv = new THREE.Vector3();
  function stackFrame(q) {
    const w = rock(q), th = rockDir(q), s = Math.sign(w) || 1;
    pv.set(Math.cos(th) * R * s, Math.sin(th) * R * s, 0);
    axS.set(-Math.sin(th), Math.cos(th), 0); qS.setFromAxisAngle(axS, w);
  }
  const toWorld = out => {
    vT.set(out.x, out.y, out.z).sub(pv).applyQuaternion(qS).add(pv); out.x = vT.x; out.y = vT.y; out.z = vT.z;
    vT.set(out.nx, out.ny, out.nz).applyQuaternion(qS); out.nx = vT.x; out.ny = vT.y; out.nz = vT.z;
  };
  // vol libre, claquement sur le tapis, glissade : précalcul de l'état au départ et à l'atterrissage
  const MU = 26;                                               // décélération de glissade sur le feutre (u/s²)
  C.forEach(c => {
    c.lv = c.p + (c.k === 0 ? .07 : tipLeave(c));
    stackFrame(c.lv / TT); local(c, c.lv, V); toWorld(V);
    const e = 1e-3, V2 = { ...V }; stackFrame((c.lv - e) / TT); local(c, c.lv - e, V2); toWorld(V2);
    c.P0 = [V.x, V.y, V.z]; c.V0 = [(V.x - V2.x) / e, (V.y - V2.y) / e, (V.z - V2.z) / e];
    c.ph0 = Math.acos(Math.min(1, V.nz)); c.w0 = c.k === 0 ? 0 : (c.ph0 - Math.acos(Math.min(1, V2.nz))) / e;
    c.w0 = Math.min(Math.max(c.w0, 0), 3); c.sp0 = V.sp;
    if (c.k === 0) { c.ld = c.lv; c.phL = 0; }
    else {
      const low = t => c.P0[2] + c.V0[2] * t - G * t * t / 2 - lift(c.ph0 + c.w0 * t);
      let a = 0, b = 1; for (let i = 0; i < 40; i++) { const m = (a + b) / 2; (low(m) <= 0 ? b = m : a = m); }
      c.ld = c.lv + b; c.phL = c.ph0 + c.w0 * b;
    }
    const t = c.ld - c.lv;
    c.L = [c.P0[0] + c.V0[0] * t, c.P0[1] + c.V0[1] * t];
    c.vh = Math.hypot(c.V0[0], c.V0[1]); c.dx = c.V0[0] / (c.vh || 1); c.dy = c.V0[1] / (c.vh || 1);
  });
  const SLAP = .045;
  function flying(c, tau, out) {
    const cx = Math.cos(c.th), cy = Math.sin(c.th);
    if (tau < c.ld) {
      const t = tau - c.lv, ph = c.ph0 + c.w0 * t;
      out.x = c.P0[0] + c.V0[0] * t; out.y = c.P0[1] + c.V0[1] * t; out.z = c.P0[2] + c.V0[2] * t - G * t * t / 2;
      out.nx = Math.sin(ph) * cx; out.ny = Math.sin(ph) * cy; out.nz = Math.cos(ph); out.sp = c.sp0 + t * 2;
      return;
    }
    const t = tau - c.ld, v = c.vh * .82;                     // le choc absorbe une part de la vitesse
    const tm = Math.max(v / MU, 1e-3), tt = Math.min(t, tm), s = v * tt - MU * tt * tt / 2;
    const ph = c.phL * Math.max(0, 1 - t / SLAP) ** 2 * (t < SLAP ? 1 : 0);   // claque à plat (pivot sur l'arête extérieure)
    const hb = t > SLAP ? .35 * Math.max(0, Math.sin(PI * (t - SLAP) / .05)) * (t < SLAP + .05 ? 1 : 0) : 0;  // petit sursaut
    out.x = c.L[0] + c.dx * s; out.y = c.L[1] + c.dy * s; out.z = lift(ph) + hb;
    out.nx = Math.sin(ph) * cx; out.ny = Math.sin(ph) * cy; out.nz = Math.cos(ph); out.sp = c.sp0 + (c.ld - c.lv) * 2 + tt * 3 * (1 - tt / tm / 2);
  }

  /* ---------- caméra ---------- */
  let D0 = 40;
  const resize = () => {
    const a = camera.aspect;
    D0 = a >= 1 ? 31 : 31 * Math.min(2.2, .55 + .7 / a);       // téléphone : plus de recul pour garder la pile entière
  };
  resize();

  const dum = new THREE.Object3D(), qN = new THREE.Quaternion(), qZ = new THREE.Quaternion(), ZV = new THREE.Vector3(0, 0, 1), nV = new THREE.Vector3();
  const hidden = new THREE.Matrix4().makeScale(0, 0, 0);
  const tgt = new THREE.Vector3();
  const api = {
    scene, chips: rings,
    resize,
    frame(q) {
      renderer.clear();
      if (q >= .95) return;
      const tau = q * TT;
      /* caméra : plongée oblique, légère dérive ; à la fin elle descend vers le tapis qui s'ouvre */
      const e = sm(seg(q, .66, .95)), el = mix(.92, 1.3, sm(seg(q, .5, .95))), az = -PI / 2 + .12 - .2 * q;
      const D = D0 * mix(1, .62, e);
      tgt.set(0, 0, mix(2.6, 0, sm(seg(q, .45, .85))));
      camera.position.set(tgt.x + D * Math.cos(el) * Math.cos(az), tgt.y + D * Math.cos(el) * Math.sin(az), tgt.z + D * Math.sin(el));
      camera.up.set(0, 0, 1); camera.lookAt(tgt);
      camera.updateMatrixWorld();
      U.uL.value = sm(seg(q, 0, .16));
      stackFrame(q);
            let sup = -1e9;
      for (let i = 0; i < N; i++) {
        const c = C[i], ci = CI[i], kd = kinds[COL[i]];
        let m;
        if (tau < c.rel) { m = hidden; U.uAO.value[i].w = 0; U.uTw.value[i] = 0; }
        else {
          if (tau < c.lv) {
            local(c, tau, V, sup);
            sup = tau < c.p ? V.z + CT / 2 * V.nz + R * Math.sqrt(Math.max(0, 1 - V.nz * V.nz)) : -1e9;
            toWorld(V);
          } else { flying(c, tau, V); sup = -1e9; }
          nV.set(V.nx, V.ny, V.nz).normalize(); qN.setFromUnitVectors(ZV, nV); qZ.setFromAxisAngle(ZV, V.sp);
          dum.quaternion.copy(qN).multiply(qZ); dum.position.set(V.x, V.y, V.z); dum.scale.set(1, 1, 1); dum.updateMatrix(); m = dum.matrix;
          const h = Math.max(0, V.z - (CT / 2 * nV.z + R * Math.sqrt(Math.max(0, 1 - nV.z * nV.z))));
          U.uAO.value[i].set(V.x, V.y, R * (1.02 + h * .1), .55 * (1 - sm(clamp01(h / 4))));
          // sillage : le feutre s'ouvre derrière le jeton qui glisse
          if (tau > c.ld + .02) { const g = sm(clamp01((tau - c.ld - .02) / .25)); U.uTr.value[i].set(c.L[0], c.L[1], V.x - c.dx * R * .35, V.y - c.dy * R * .35); U.uTw.value[i] = R * .62 * g; }
          else U.uTw.value[i] = 0;
        }
        kd.edge.setMatrixAt(ci, m); kd.face.setMatrixAt(ci, m); rings.setMatrixAt(i, m);
      }
      kinds.forEach(kd => { kd.edge.instanceMatrix.needsUpdate = kd.face.instanceMatrix.needsUpdate = true; });
      rings.instanceMatrix.needsUpdate = true;
      // centre : s'ouvre quand le dernier jeton a quitté la base ; puis tout s'ouvre
      const qc = C[0].lv / TT;
      U.uHc.value = q > qc + .01 ? mix(-1, 46, Math.pow(seg(q, qc + .01, .93), 2)) : -1;
      U.uGrow.value = 26 * Math.pow(seg(q, .6, .93), 2.5);
      renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
      renderer.render(under, camera); renderer.render(scene, camera);
    }
  };
  /* préchauffage : textures envoyées, programmes (dont ceux de la carte d'ombre) compilés dès la création, jamais en plein défilement */
  scene.traverse(o => { const m = o.material; if (m) for (const k of ['map', 'roughnessMap']) if (m[k]) renderer.initTexture(m[k]); });
  for (const q of [.3, .6, .8]) api.frame(q);
  renderer.clear();
  return api;
}
