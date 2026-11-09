/* Transition « La mise » (rateau) : vue en biais sur le tapis bleu nuit, sous une lampe de table.
   Des piles de jetons alignées (rouges, noires, une pile GT) sont poussées vers la caméra par un geste de croupier
   invisible : elles glissent sur le feutre, se tassent en un bloc, et le bloc avance jusqu'à remplir le bas de l'écran.
   Puis le tapis est tiré vers le haut comme une nappe qu'on retire : il se plie (pli de tissu en 3D, ombré), emporte
   les jetons, et la section suivante apparaît par le bas, sous l'ombre portée du tapis qui s'en va.
   Tout est fonction pure de q (aucun temps réel) ; aucun jeton n'en traverse un autre (poses au contact exact). */

const PI = Math.PI;
/* ---------- calendrier ---------- */
const Q = { light: [0, .14], tilt: [0, .22], push: [.13, .42], adv: [.38, .57], pull: [.585, .935], end: .95 };

/* ---------- disposition des piles (centres dans le repère du bloc : x vers la droite, z vers la caméra) ----------
   bureau : rangée avant de 4, rangée arrière de 3 (en quinconce) ; téléphone : hexagone 2-3-2 */
function layout(R, mobile) {
  const D = 2 * R + .12, h = D * Math.sqrt(3) / 2;
  const P = mobile
    ? [[-.5 * D, h, 6, 0], [.5 * D, h, 7, 1], [-D, 0, 9, 1], [0, 0, 12, 2], [D, 0, 8, 0], [-.5 * D, -h, 10, 0], [.5 * D, -h, 11, 1]]
    : [[-1.5 * D, 0, 6, 1], [-.5 * D, 0, 8, 0], [.5 * D, 0, 7, 1], [1.5 * D, 0, 5, 0], [-D, -h, 10, 0], [0, -h, 12, 2], [D, -h, 9, 1]];
  // départ : mêmes rangées, alignées mais écartées, plus loin sur le tapis
  const sx = mobile ? 1.32 : 1.42, sz = mobile ? 1.6 : 1.55;
  return { D, st: P.map(([x, z, n, kind], i) => ({ x, z, n, kind, x0: x * sx, z0: z * sz - (mobile ? 1.4 : 1.0), lag: [.0, .05, .02, .07, .035, .01, .06][i] })) };
}
/* glissade avec frottement : poussée brève (accélération) puis le jeton glisse et s'arrête (décélération constante) */
const slide = t => t <= 0 ? 0 : t >= 1 ? 1 : (t < .2 ? t * t / .4 : .1 + (.64 - (1 - t) ** 2) / 1.6) / .5;
const shearOf = t => t <= 0 || t >= 1 ? 0 : t < .2 ? -.045 * Math.sin(PI * t / .2) : .016 * Math.sin(PI * (t - .2) / .8);
const sg = (x, a, b) => Math.min(1, Math.max(0, (x - a) / (b - a)));
/* position (x, z dans le repère du bloc) et cisaillement de chaque pile pendant la poussée : pure, testable */
export function pushPose(L, t, out) {
  L.st.forEach((s, i) => {
    const u = sg(t, s.lag, s.lag + .82), e = slide(u);
    out[i * 3] = s.x0 + (s.x - s.x0) * e; out[i * 3 + 1] = s.z0 + (s.z - s.z0) * e; out[i * 3 + 2] = shearOf(u);
  });
  return out;
}

export function create(ctx) {
  const { THREE, renderer, camera, K, env, view, LITE, seg, sm, mix } = ctx;
  const { R, CT, C } = K;
  const scene = new THREE.Scene();
  scene.environment = env; scene.environmentIntensity = .4;
  scene.environmentRotation.x = -PI / 2;
  /* lampe de table au-dessus du tapis, côté lointain, un peu à droite ; liseré froid de la salle */
  const LP = new THREE.Vector3(3, 30, -12);
  const lamp = new THREE.SpotLight(0xFFE6C4, 0, 0, .62, 1, 0); lamp.position.copy(LP);
  const rim = new THREE.DirectionalLight(0x8FB4E6, 0); rim.position.set(-8, 6, 12);
  const amb = new THREE.HemisphereLight(0x9DB8DA, 0x0B1B2E, 0);
  scene.add(lamp, lamp.target, rim, amb);

  /* ---------- jetons instanciés (axe vertical), trois sortes : rouges, noirs, GT ---------- */
  const merge = gs => { const g = new THREE.BufferGeometry(), at = { position: [], normal: [], uv: [] }, idx = []; let o = 0;
    gs.forEach(s => { for (const k in at) at[k].push(...s.attributes[k].array); s.index.array.forEach(i => idx.push(i + o)); o += s.attributes.position.count; });
    for (const k in at) g.setAttribute(k, new THREE.Float32BufferAttribute(at[k], k === 'uv' ? 2 : 3));
    g.setIndex(idx); return g.rotateX(-PI / 2); };
  const both = (geo, z) => merge([geo.clone().translate(0, 0, z), geo.clone().rotateY(PI).translate(0, 0, -z)]);
  const edge2 = K.edgeGeo.clone().rotateX(-PI / 2), face2 = both(K.faceGeo, CT / 2), ring2 = both(K.ringGeo.clone().scale(1, 1, .35), CT / 2 + .004);
  const LD = layout(R, false), LM = layout(R, true);
  const nMax = Math.max(...[LD, LM].map(L => L.st.reduce((a, s) => a + s.n, 0)));
  const kinds = [[C.red, false], [C.black, false], [C.red, true]].map(([b, gt]) => {
    const edge = new THREE.InstancedMesh(edge2, K.clay(K.chipEdge(b)), nMax), face = new THREE.InstancedMesh(face2, K.clay(K.chipFace(b, gt)), nMax);
    [edge, face].forEach(m => { m.frustumCulled = false; scene.add(m); });
    return { edge, face, n: 0 };
  });
  const rings = new THREE.InstancedMesh(ring2, K.goldMat, nMax); rings.frustumCulled = false; scene.add(rings);
  kinds.forEach(k => [k.edge, k.face].forEach(m => renderer.initTexture(m.material.map)));   // textures envoyées tout de suite, pas à la première image
  /* imperfections fixes de chaque jeton : rotation propre, infime décalage (déterministes) */
  const hash = (i, k) => { const s = Math.sin(i * 127.1 + k * 311.7) * 43758.5453; return s - Math.floor(s); };

  /* ---------- le tapis : nappe paramétrée (u le long du tirage, 0 à l'ourlet ; v en travers), déformée dans le shader ----------
     trajet fixe dans le monde : à plat, puis un pli de rayon uRho qui se relève de l'angle uAl, puis un plan incliné ;
     le tissu glisse le long de ce trajet (uD), avec un pli de traîne (bourrelet couché vers la caméra) près de l'ourlet */
  const U = {
    uZH: { value: 0 }, uD: { value: 0 }, uSL: { value: 0 }, uRho: { value: 5 }, uAl: { value: 0 },
    uRA: { value: 0 }, uRU: { value: 3 }, uRW: { value: .75 }, uLean: { value: 1.4 }, uHem: { value: 0 },
    uLight: { value: 0 }, uLP: { value: LP }, uLF: { value: new THREE.Vector2(0, -3) }, uPool: { value: new THREE.Vector2(5, 24) },
    uCam: { value: new THREE.Vector3() }, uSt: { value: [...Array(7)].map(() => new THREE.Vector4()) }, uStR: { value: R },
    uBox: { value: new THREE.Vector4() }, uFloor: { value: new THREE.Vector4() },
  };
  const PATH = `
    uniform float uZH, uD, uSL, uRho, uAl, uRA, uRU, uRW, uLean, uHem;
    // trajet : (y, z) et normale (ny, nz) à l'abscisse curviligne s
    vec4 path(float s){
      if (s < uSL) return vec4(0., uZH - s, 1., 0.);
      float a = s - uSL, la = uRho * uAl, zl = uZH - uSL;
      if (a < la) { float th = a / uRho; return vec4(uRho - uRho * cos(th), zl - uRho * sin(th), cos(th), sin(th)); }
      vec2 e = vec2(uRho - uRho * cos(uAl), zl - uRho * sin(uAl)) + (a - la) * vec2(sin(uAl), -cos(uAl));
      return vec4(e, cos(uAl), sin(uAl));
    }
    // plis de traîne : un grand pli en biais qui s'éteint d'un côté, un second plus petit, et l'ourlet qui se soulève
    float bump(float u, float v){
      float x1 = (u - uRU - .09 * v) / uRW, a1 = .5 + .5 * smoothstep(-30., 18., v);
      float x2 = (u - uRU - 2.3 + .05 * v) / (uRW * .8), a2 = .42 * (1. - smoothstep(-8., 26., v));
      return uRA * (a1 * exp(-x1 * x1) + a2 * exp(-x2 * x2)) + uHem * exp(-u / .45);
    }
    vec3 cloth(float u, float v){
      float b = bump(u, v);
      vec4 p = path(u + uD - uLean * b);
      return vec3(v, p.x + p.z * b, p.y + p.w * b);
    }`;
  const clothMat = new THREE.ShaderMaterial({
    uniforms: U, side: THREE.DoubleSide,
    vertexShader: PATH + `
      varying vec3 vW, vN; varying vec2 vM;
      void main(){
        float u = position.z, v = position.x, e = .03;
        vec3 p = cloth(u, v);
        vec3 du = cloth(u + e, v) - cloth(u - e, v), dv = cloth(u, v + e) - cloth(u, v - e);
        vW = p; vN = normalize(cross(dv, du)); vM = vec2(u, v);
        gl_Position = projectionMatrix * viewMatrix * vec4(p, 1.);
      }`,
    fragmentShader: PATH + `
      uniform float uLight, uStR; uniform vec3 uLP, uCam; uniform vec2 uLF, uPool; uniform vec4 uSt[7]; uniform vec4 uBox;
      varying vec3 vW, vN; varying vec2 vM;
      float h21(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
      float vn(vec2 p){ vec2 i = floor(p), f = fract(p); f = f * f * (3. - 2. * f);
        return mix(mix(h21(i), h21(i + vec2(1, 0)), f.x), mix(h21(i + vec2(0, 1)), h21(i + vec2(1, 1)), f.x), f.y); }
      float segd(vec2 p, vec2 a, vec2 b){ vec2 pa = p - a, ba = b - a; return length(pa - ba * clamp(dot(pa, ba) / max(dot(ba, ba), 1e-4), 0., 1.)); }
      void main(){
        vec3 V = normalize(uCam - vW), N = normalize(vN);
        bool back = dot(N, V) < 0.; if (back) N = -N;
        vec3 Ld = uLP - vW; float dl = length(Ld); Ld /= dl;
        float u = vM.x, v = vM.y;
        // ombre portée des plis (marche le long du tissu vers la lampe)
        float sh = 1., b0 = bump(u, v), tb = (uLP.y - vW.y) / max(.5, vW.z - uLP.z);
        for (int k = 1; k <= ${LITE ? 5 : 9}; k++) { float du = float(k) * .32; sh = min(sh, 1. - smoothstep(-.02, .1, bump(u + du, v) - b0 - du * tb)); }
        // ombres des piles : contact (occlusion) et ombre portée de la lampe (pile projetée : gélule base → sommet projeté)
        vec2 m = vec2(u, v); float ao = 1.;
        for (int i = 0; i < 7; i++) {
          vec4 s = uSt[i]; vec2 c = s.xy;
          float d0 = length(m - c) / uStR, dc = segd(m, c, c + s.zw) - uStR;
          ao *= 1. - .55 * (1. - smoothstep(.96, 1.42, d0));
          sh = min(sh, mix(.18, 1., smoothstep(-.35, .35 + .06 * length(s.zw), dc)));
        }
        float lam = max(dot(N, Ld), 0.), pool = 1. - smoothstep(uPool.x, uPool.y, length(vW.xz - uLF));
        float I = uLight * pool * lam * sh;
        vec3 base = vec3(.0431, .1059, .1804);
        vec2 fw = fwidth(m); float fz = 1. - smoothstep(.02, .06, max(fw.x, fw.y));
        float fib = ((vn(m * vec2(9., 7.)) - .5) * .5 * (1. - smoothstep(.06, .16, max(fw.x, fw.y))) + (vn(m * 31.) - .5) * .5 * fz);
        float c2 = bump(u + .25, v) + bump(u - .25, v) - 2. * b0; ao *= 1. - clamp(c2 * 1.4, 0., .55);
        vec3 c = base * (.8 + .2 * N.y) * mix(1., ao, uLight);
        c += I * vec3(.09, .08, .065) * pow(max(dot(N, normalize(Ld + V)), 0.), 10.);
        c += I * (vec3(.115, .1, .078) + base * .55) * (1. + .22 * fib);
        c += uLight * pool * sh * vec3(.05, .06, .075) * pow(1. - max(dot(N, V), 0.), 3.) * lam;   // duvet du feutre en rasant
        // marquage du tapis (doré) : double filet parallèle à l'ourlet, cadre de la mise
        float lw = .045, ln = 0.;
        ln = max(ln, 1. - smoothstep(lw * .5, lw * .5 + .02, abs(u - 1.55)));
        ln = max(ln, 1. - smoothstep(lw * .5, lw * .5 + .02, abs(u - 1.85)));
        vec2 bq = abs(m - uBox.xy) - uBox.zw; float bd = abs(max(bq.x, bq.y));
        ln = max(ln, (1. - smoothstep(lw * .5, lw * .5 + .02, bd)) * step(max(bq.x, bq.y), .1));
        vec3 gold = vec3(.62, .48, .24);
        c = mix(c, gold * (.18 + 1.1 * I) * (.9 + .2 * fib), ln * uLight * .85);
        // ourlet : bande cousue un peu plus claire
        float hem = 1. - smoothstep(.1, .16, u);
        c = mix(c, c * 1.25 + vec3(.01, .012, .016) * uLight, hem * .7);
        if (back) c = (vec3(.07, .08, .095) + I * vec3(.12, .11, .1)) * (.6 + .4 * lam);   // envers du tapis : toile grise
        gl_FragColor = vec4(c, 1.);
      }`,
  });
  /* maillage : dense près de l'ourlet (les plis), plus lâche ensuite */
  const us = []; for (let u = 0; u < 12; u += LITE ? .09 : .06) us.push(u); for (let u = 12; u <= 140; u += .5) us.push(u);
  const vs = []; const NV = LITE ? 44 : 64; for (let i = 0; i <= NV; i++) vs.push(-70 + 140 * i / NV);
  const pos = new Float32Array(us.length * vs.length * 3), idx = [];
  us.forEach((u, i) => vs.forEach((v, j) => { const k = (i * vs.length + j) * 3; pos[k] = v; pos[k + 2] = u; }));
  for (let i = 0; i < us.length - 1; i++) for (let j = 0; j < vs.length - 1; j++) {
    const a = i * vs.length + j, b = a + vs.length; idx.push(a, b, a + 1, b, b + 1, a + 1);
  }
  const cg = new THREE.BufferGeometry(); cg.setAttribute('position', new THREE.BufferAttribute(pos, 3)); cg.setIndex(idx);
  const cloth = new THREE.Mesh(cg, clothMat); cloth.frustumCulled = false; cloth.renderOrder = 1; scene.add(cloth);
  /* sol révélé : seulement l'ombre portée du tapis qui s'en va, sur la section suivante (noir prémultiplié) */
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(400, 400).rotateX(-PI / 2), new THREE.ShaderMaterial({
    uniforms: U, transparent: true, depthWrite: false, premultipliedAlpha: true,
    vertexShader: 'varying vec3 vW; void main(){ vW = (modelMatrix * vec4(position, 1.)).xyz; gl_Position = projectionMatrix * viewMatrix * vec4(vW, 1.); }',
    fragmentShader: `uniform vec4 uFloor; varying vec3 vW;
      void main(){ float a = uFloor.z * (1. - smoothstep(uFloor.x - uFloor.y, uFloor.x + uFloor.y, vW.z)) * (.55 + .45 * exp(-max(0., uFloor.x - vW.z) * .25));
        gl_FragColor = vec4(0., 0., 0., a); }`,
  }));
  floor.position.y = -.4; floor.frustumCulled = false; floor.renderOrder = 0; scene.add(floor);

  /* ---------- cadrage (recalculé au redimensionnement) ---------- */
  let L = LD, mobile = false, Cy = 20, Cz = 20, P0 = 0, P1 = 0, PA = 0, Zf = 0, adv = 0, zH0 = 0, sL = 0, uB = 0, Dtot = 40, zMax = 0;
  const RHO = 5, AMAX = .24;
  const v3 = new THREE.Vector3(), v4 = new THREE.Vector3(), dirV = new THREE.Vector3();
  const aimCam = (y, z, p) => { camera.position.set(0, y, z); camera.up.set(0, 1, 0); dirV.set(0, -Math.sin(p), -Math.cos(p)); camera.lookAt(v4.copy(camera.position).add(dirV)); camera.updateMatrixWorld(); };
  const ndc = (x, y, z) => v3.set(x, y, z).project(camera);
  function resize() {
    const asp = camera.aspect;
    mobile = asp < .9; L = mobile ? LM : LD;
    let hw = 0, zmn = 0; zMax = 0; L.st.forEach(s => { hw = Math.max(hw, Math.abs(s.x) + R); zMax = Math.max(zMax, s.z + R); zmn = Math.min(zmn, s.z - R); });
    P1 = (mobile ? 58 : 50) * PI / 180; PA = P1 - (mobile ? 2 : 7) * PI / 180; P0 = P1 + 17 * PI / 180;
    // bloc final : bord avant près du bas de l'écran, largeur à ~88 % (bureau) / 90 % (téléphone)
    const fx = mobile ? .9 : .8, fy = mobile ? -.84 : -.86;
    let lo = 5, hi = 200;
    for (let it = 0; it < 40; it++) {
      const dist = (lo + hi) / 2; Cy = dist * Math.sin(P1);
      let a = -100, b = 100;                                       // Cz tel que le bord avant tombe à fy
      for (let j = 0; j < 40; j++) { Cz = (a + b) / 2; aimCam(Cy, Cz, P1); (ndc(0, 0, zMax).y > fy ? (b = Cz) : (a = Cz)); }
      aimCam(Cy, Cz, P1); (ndc(hw, 0, 0).x > fx ? (lo = dist) : (hi = dist));
    }
    Zf = 0; adv = mobile ? 7 : 7.5;
    // ourlet hors champ en bas (même au départ, caméra plus plongeante), avec marge
    // départ : caméra plus plongeante, juste assez pour que les piles soient encore hors champ (au-dessus)
    for (P0 = PA + 8 * PI / 180; P0 < 1.45; P0 += PI / 360) {
      aimCam(Cy, Cz, P0);
      if (L.st.every(s => ndc(s.x0, 0, Zf - adv + s.z0 + R).y > 1.04 && ndc(s.x0, s.n * CT, Zf - adv + s.z0 + R).y > 1.04)) break;
    }
    P0 += 2 * PI / 180;
    zH0 = Cz - Cy / Math.tan(P0 + 15.5 * PI / 180) + 2.5;
    sL = zH0 - zMax; uB = zH0 - Zf;                                // le pli se forme au pied des piles avant
    U.uBox.value.set(uB - (zMax + zmn) / 2, 0, (zMax - zmn) / 2 + .55, hw + .55);
    // course du tirage : jusqu'à ce que l'ourlet (et son pli) soit passé au-dessus du haut de l'écran
    aimCam(Cy, Cz, P1);
    const zl = zH0 - sL, la = RHO * AMAX;
    let s = 0;
    for (; s < 400; s += .25) {
      const a = s - sL; let y, z;
      if (a < 0) { y = 0; z = zH0 - s; } else if (a < la) { y = RHO - RHO * Math.cos(a / RHO); z = zl - RHO * Math.sin(a / RHO); }
      else { y = RHO - RHO * Math.cos(AMAX) + (a - la) * Math.sin(AMAX); z = zl - RHO * Math.sin(AMAX) - (a - la) * Math.cos(AMAX); }
      if (ndc(0, y - .4, z + .3).y > 1.01) break;
    }
    Dtot = s + 1.5;
  }

  /* ---------- pose d'une image ---------- */
  const pp = new Float32Array(21), mat = new THREE.Matrix4(), qB = new THREE.Quaternion(), qS = new THREE.Quaternion(), qT = new THREE.Quaternion();
  const XA = new THREE.Vector3(1, 0, 0), YA = new THREE.Vector3(0, 1, 0), O = new THREE.Vector3(), lpL = new THREE.Vector3(), sc1 = new THREE.Vector3(1, 1, 1), cp = new THREE.Vector3();
  const pathAt = (s, al, out) => {
    const a = s - sL, la = RHO * al, zl = zH0 - sL;
    if (a < 0) return out.set(0, 0, zH0 - s);
    if (a < la) return out.set(0, RHO - RHO * Math.cos(a / RHO), zl - RHO * Math.sin(a / RHO));
    return out.set(0, RHO - RHO * Math.cos(al) + (a - la) * Math.sin(al), zl - RHO * Math.sin(al) - (a - la) * Math.cos(al));
  };
  function frame(q) {
    renderer.clear();
    if (q >= Q.end) return;
    const light = sm(seg(q, ...Q.light)), tilt = sm(seg(q, ...Q.tilt));
    const tp = seg(q, ...Q.push), ta = seg(q, ...Q.adv), tl = seg(q, ...Q.pull);
    // le bloc : poussée (piles qui se tassent), avance d'un seul tenant, puis emporté par le tapis
    pushPose(L, tp, pp);
    const ea = ta * ta * (3 - 2 * ta), zb = Zf - adv * (1 - ea);
    aimCam(Cy, Cz, mix(P0, PA, tilt) + (P1 - PA) * ea); U.uCam.value.copy(camera.position);
    const shA = -.032 * Math.sin(2 * PI * ta);
    const d = Dtot * (.3 * tl + .7 * tl ** 2.4), al = Math.min(AMAX, d / RHO, AMAX * sm(seg(tl, 0, .35)) + 1e-6);
    const sB = uB + d;
    if (d > 0) { pathAt(sB, al, O); qB.setFromAxisAngle(XA, al); } else { O.set(0, 0, zb); qB.identity(); }
    // tirage : les jetons du haut traînent un peu vers la caméra quand le tapis accélère
    const shC = .03 * Math.sin(PI * Math.min(1, tl * 1.6));
    // lampe dans le repère du bloc (ombres portées des piles, calculées sur le plan du tapis)
    lpL.copy(LP).sub(O).applyQuaternion(qT.copy(qB).invert());
    kinds.forEach(k => { k.n = 0; });
    let ni = 0;
    L.st.forEach((s, i) => {
      const x = pp[i * 3], z = pp[i * 3 + 1], shr = pp[i * 3 + 2] + shA + shC, kd = kinds[s.kind];
      for (let c = 0; c < s.n; c++) {
        const f = s.n > 1 ? c / (s.n - 1) : 0, id = i * 31 + c;
        cp.set(x + (hash(id, 1) - .5) * .028, CT * (c + .5), z + (hash(id, 2) - .5) * .028 + shr * f);
        cp.applyQuaternion(qB).add(O);
        qS.setFromAxisAngle(YA, s.kind === 2 ? (c === s.n - 1 ? 0 : (hash(id, 3) - .5) * .5) : hash(id, 3) * PI * 2);   // pile GT : le GT du dessus se lit droit qT.copy(qB).multiply(qS);
        mat.compose(cp, qT, sc1);
        kd.edge.setMatrixAt(kd.n, mat); kd.face.setMatrixAt(kd.n, mat); kd.n++;
        rings.setMatrixAt(ni++, mat);
      }
      // ombre : gélule de la base au sommet projeté depuis la lampe (repère du bloc → coordonnées du tissu)
      const H = s.n * CT, ly = Math.max(lpL.y, H + .5), k2 = ly / (ly - H);
      const px = lpL.x + (x - lpL.x) * k2, pz = lpL.z + (z - lpL.z) * k2;
      U.uSt.value[i].set(uB - (d > 0 ? 0 : zb - Zf) - z, x, -(pz - z), px - x);
    });
    kinds.forEach(k => { k.edge.count = k.face.count = k.n; k.edge.instanceMatrix.needsUpdate = k.face.instanceMatrix.needsUpdate = true; });
    rings.count = ni; rings.instanceMatrix.needsUpdate = true;
    // tapis
    U.uZH.value = zH0; U.uSL.value = sL; U.uRho.value = RHO; U.uD.value = d; U.uAl.value = al;
    const fk = mobile ? 1.6 : 1;
    U.uRA.value = 1.3 * fk * sm(seg(tl, 0, .25)); U.uRU.value = sL - 2.8 * fk - .8 * sm(seg(tl, 0, .6)); U.uRW.value = .95 * fk; U.uHem.value = .22 * sm(seg(tl, .05, .4));
    U.uLight.value = light;
    // ombre du tapis sur la section révélée : bord de l'ourlet projeté depuis la lampe
    pathAt(d, al, v4); const hy = v4.y + U.uHem.value, kz = LP.y / Math.max(.5, LP.y - hy), zp = LP.z + (v4.z - LP.z) * kz;
    U.uFloor.value.set(zp + .2, .35 + hy * .35, d > 0 ? .4 * light * (1 - sm(seg(q, .78, .9))) : 0, 0);
    lamp.intensity = 1.7 * light; lamp.target.position.set(0, 0, Zf - 2); lamp.target.updateMatrixWorld();
    rim.intensity = .55 * light; amb.intensity = .15 + .2 * light;
    renderer.render(scene, camera);
  }
  resize();
  return { frame, resize, scene };
}
