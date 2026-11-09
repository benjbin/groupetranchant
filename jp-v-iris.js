/* Transition « Le diaphragme » : un grand jeton GT tombe et se pose au centre du tapis ; dix jetons rouges et noirs glissent
   en spirale depuis les bords et se referment autour de lui en couronne, chacun monté sur son voisin comme une écaille
   (inclinaison calculée pour un contact exact, sans interpénétration). Le tapis est découpé selon le polygone intérieur
   formé par les jetons : la pièce découpée emporte le GT en glissant sous la couronne, puis la couronne tourne et s'ouvre,
   les jetons pivotant vers l'extérieur, jusqu'à ce que l'ouverture dépasse l'écran. Fonction pure de q. */
export function create(ctx) {
  const { THREE, renderer, camera, K, env, view, LITE, seg, sm, mix, clamp01 } = ctx;
  const PI = Math.PI, R = K.R, CT = K.CT, N = 10, SG = 1.3;          // dix lames ; le GT est 1,3 fois plus grand
  const TT = 4.6, G = 956;

  const scene = new THREE.Scene();
  scene.environment = env; scene.environmentRotation.x = -PI / 2;
  const key = new THREE.DirectionalLight(0xFFF0DA, 1.7); key.position.set(-5, -7, 22); key.castShadow = true;
  const SMS = LITE ? 1024 : 2048; key.shadow.mapSize.set(SMS, SMS);
  Object.assign(key.shadow.camera, { left: -13, right: 13, top: 13, bottom: -13, near: 11.6, far: 60 });
  key.shadow.bias = -.0004; key.shadow.normalBias = .02; key.shadow.radius = 3;
  const rim = new THREE.DirectionalLight(0x8FB4E6, .8); rim.position.set(9, 12, 6);
  scene.add(key, key.target, rim, new THREE.AmbientLight(0xffffff, .06));
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  const merge = gs => {
    const g = new THREE.BufferGeometry(), at = { position: [], normal: [], uv: [] }, idx = []; let o = 0;
    gs.forEach(s => { for (const k in at) at[k].push(...s.attributes[k].array); s.index.array.forEach(i => idx.push(i + o)); o += s.attributes.position.count; });
    for (const k in at) g.setAttribute(k, new THREE.Float32BufferAttribute(at[k], k === 'uv' ? 2 : 3));
    g.setIndex(idx); return g;
  };
  const both = (geo, z) => merge([geo.clone().translate(0, 0, z), geo.clone().rotateY(PI).translate(0, 0, -z)]);
  const faceG = both(K.faceGeo, CT / 2), ringG = both(K.ringGeo.clone().scale(1, 1, .35), CT / 2 + .004);

  /* ---------- tapis : ouverture = région vue depuis le centre sans croiser aucun jeton (polygone intérieur exact) ---------- */
  const AP = `
    uniform vec3 uCh[${N}], uPad[${N}]; uniform vec2 uPo; uniform float uCut;
    float apD(vec2 p, vec3 ch[${N}]){            // > 0 : dans l'ouverture (le segment centre → p ne touche aucun jeton)
      float d = 1e3;
      for (int i = 0; i < ${N}; i++) { vec2 c = ch[i].xy; float h = clamp(dot(c, p) / max(dot(p, p), 1e-6), 0., 1.); d = min(d, length(c - p * h) - ch[i].z); }
      return d;
    }
    float feltA(vec2 p, out float inPad, out float dA){   // 1 : feutre ou pièce découpée visibles
      dA = apD(p, uCh); float aa = fwidth(dA) + .003;
      float open = smoothstep(-aa, aa, dA) * uCut;
      float dp = apD(p - uPo, uPad); inPad = smoothstep(-aa, aa, dp);
      return 1. - open * (1. - inPad);
    }`;
  const U = { uL: { value: 0 }, uCh: { value: [...Array(N)].map(() => new THREE.Vector3()) }, uPad: { value: [...Array(N)].map(() => new THREE.Vector3()) },
    uPo: { value: new THREE.Vector2() }, uCut: { value: 0 }, uSeam: { value: 0 }, uPadK: { value: 0 }, uAO: { value: [...Array(N + 1)].map(() => new THREE.Vector4()) } };
  const felt = new THREE.Mesh(new THREE.PlaneGeometry(600, 600), new THREE.ShaderMaterial({
    uniforms: U, transparent: true, depthTest: false, depthWrite: false, premultipliedAlpha: true,
    vertexShader: 'varying vec2 vW; void main(){ vec4 w = modelMatrix * vec4(position, 1.); vW = w.xy; gl_Position = projectionMatrix * viewMatrix * w; }',
    fragmentShader: `varying vec2 vW; uniform float uL, uSeam, uPadK; uniform vec4 uAO[${N + 1}];
      ${AP}
      float hh(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
      float vn(vec2 p){ vec2 i = floor(p), f = fract(p); f = f * f * (3. - 2. * f);
        return mix(mix(hh(i), hh(i + vec2(1, 0)), f.x), mix(hh(i + vec2(0, 1)), hh(i + vec2(1, 1)), f.x), f.y); }
      void main(){
        vec2 p = vW; float inPad, dA;
        float a = feltA(p, inPad, dA);
        vec2 pf = mix(p, p - uPo, inPad * uCut);                  // la pièce découpée emporte sa propre texture
        vec3 c = vec3(.0431, .1059, .1804);
        float pool = 1. - smoothstep(1.5, 15., length(p * vec2(1., 1.1) - vec2(-1., 1.)));
        c += uL * (vec3(.05, .07, .08) * pool + (vn(pf * 9.) - .5) * .012 + (hh(gl_FragCoord.xy) - .5) * .01);
        float ao = 0.;
        for (int i = 0; i < ${N + 1}; i++) { vec4 o = uAO[i]; if (o.w > 0.) { float r = length(p - o.xy) / o.z, k = o.w * (1. - smoothstep(.8, 1.3, r));
          if (i == ${N}) k *= mix(1., inPad * step(0., dA), uCut);        // ombre du GT : seulement sur sa pièce, dans l'ouverture
          ao = max(ao, k); } }
        c *= 1. - ao;
        // pièce découpée qui passe sous la couronne : plus sombre, et ombrée par le bord du feutre
        float under = uCut * inPad * (1. - smoothstep(-.01, .01, -dA)) ;
        c *= mix(1., (.78 - .2 * uPadK) * mix(.55, 1., smoothstep(0., .9, dA)), under);
        // trait de coupe
        float sd = abs(apD(p - uPo, uPad));
        c *= 1. - uSeam * .7 * (1. - smoothstep(.0, .045, sd)) * mix(1., step(0., dA), uCut);
        float lip = .35 * uCut * (1. - inPad) * (1. - smoothstep(0., .5, dA)) * step(0., dA);
        gl_FragColor = vec4(c, 1.) * a + vec4(0., 0., 0., lip * (1. - a));
      }` }));
  felt.frustumCulled = false;
  const under = new THREE.Scene(); under.add(felt);
  const shMat = new THREE.ShadowMaterial({ opacity: .6, depthWrite: false });
  shMat.onBeforeCompile = s => {
    Object.assign(s.uniforms, { uCh: U.uCh, uPad: U.uPad, uPo: U.uPo, uCut: U.uCut });
    s.vertexShader = 'varying vec2 vW;\n' + s.vertexShader.replace('#include <worldpos_vertex>', '#include <worldpos_vertex>\nvW = (modelMatrix * vec4(transformed, 1.)).xy;');
    s.fragmentShader = 'varying vec2 vW;\n' + AP + "\n" + s.fragmentShader.replace('gl_FragColor = vec4( color, opacity * ( 1.0 - getShadowMask() ) );',
      'float ip, da; float fa = feltA(vW, ip, da); gl_FragColor = vec4(color, opacity * (1.0 - getShadowMask()) * fa);');
  };
  const shPlane = new THREE.Mesh(new THREE.PlaneGeometry(80, 80), shMat);
  shPlane.receiveShadow = true; shPlane.renderOrder = -1; shPlane.frustumCulled = false; scene.add(shPlane);

  /* ---------- le grand jeton GT : rogné à l'ouverture quand il passe sous le feutre ---------- */
  const uCamP = { value: new THREE.Vector3() };
  const clip = m => {
    m.onBeforeCompile = s => {
      Object.assign(s.uniforms, { uCh: U.uCh, uPad: U.uPad, uPo: U.uPo, uCut: U.uCut, uCamP });
      s.vertexShader = 'varying vec3 vWP;\n' + s.vertexShader.replace('#include <worldpos_vertex>', '#include <worldpos_vertex>\nvWP = (modelMatrix * vec4(transformed, 1.)).xyz;');
      s.fragmentShader = 'varying vec3 vWP; uniform vec3 uCamP;\n' + AP + "\n" + s.fragmentShader.replace('#include <clipping_planes_fragment>', `#include <clipping_planes_fragment>
        if (uCut > .5) { vec2 pp = uCamP.xy + (vWP.xy - uCamP.xy) * uCamP.z / max(uCamP.z - vWP.z, 1e-3); if (apD(pp, uCh) < 0.) discard; }`);
    };
    m.customProgramCacheKey = () => 'jpv-iris-clip';
    return m;
  };
  const gt = new THREE.Group(), gtIn = new THREE.Group(); gt.add(gtIn); gtIn.scale.setScalar(SG);
  {
    const e = new THREE.Mesh(K.edgeGeo, clip(K.clay(K.chipEdge(K.C.red)))), f = new THREE.Mesh(faceG, clip(K.clay(K.chipFace(K.C.red, true))));
    const r = new THREE.Mesh(ringG, clip(K.goldMat.clone()));
    e.castShadow = f.castShadow = true; gtIn.add(e, f, r); gt.userData.cast = [e, f];
  }
  scene.add(gt);

  /* ---------- la couronne : dix jetons instanciés, rouge et noir en alternance ---------- */
  const kinds = [K.C.red, K.C.black].map(b => {
    const mk = (geo, map) => { const mt = K.clay(map); mt.clearcoat = .4; mt.clearcoatRoughness = .42;   // vernis moins miroir : vu d'en haut, pas d'éblouissement
      const m = new THREE.InstancedMesh(geo, mt, N / 2); m.castShadow = m.receiveShadow = true; m.frustumCulled = false; scene.add(m); return m; };
    return { edge: mk(K.edgeGeo, K.chipEdge(b)), face: mk(faceG, K.chipFace(b, false)) };
  });
  const rings = new THREE.InstancedMesh(ringG, K.goldMat, N); rings.frustumCulled = false; scene.add(rings);

  /* inclinaison de contact : chaque jeton monte sur son voisin (côté haut vers le suivant, côté bas sur le feutre).
     Pour un rayon de couronne ρ, on cherche la plus petite inclinaison α sans aucune pénétration entre deux voisins. */
  const SAMP = []; for (const rr of [1, .8, .55, .3]) { const n = Math.round(56 * rr); for (let i = 0; i < n; i++) SAMP.push([Math.cos(i / n * 2 * PI) * R * rr, Math.sin(i / n * 2 * PI) * R * rr]); }
  const tA = new THREE.Vector3(), tB = new THREE.Vector3(), nA = new THREE.Vector3(), nB = new THREE.Vector3(), eA1 = new THREE.Vector3(), eA2 = new THREE.Vector3(), eB1 = new THREE.Vector3(), eB2 = new THREE.Vector3(), pt = new THREE.Vector3(), dd = new THREE.Vector3();
  // repère d'un jeton i de la couronne (ρ, Θ, α) : centre, normale, deux vecteurs du plan
  function frameOf(i, rho, Th, al, c, n, e1, e2) {
    const a = Th + i * 2 * PI / N, b = a + 2 * PI / N;
    const ux = Math.cos(b) - Math.cos(a), uy = Math.sin(b) - Math.sin(a), ul = Math.hypot(ux, uy);
    const u0 = ux / ul, u1 = uy / ul, sa = Math.sin(al), ca = Math.cos(al);
    c.set(rho * Math.cos(a), rho * Math.sin(a), CT / 2 * ca + R * sa);
    n.set(-sa * u0, -sa * u1, ca);
    e1.set(u0 * ca, u1 * ca, sa);                    // vers le voisin, en montant
    e2.crossVectors(n, e1);
  }
  function pen(rho, al) {
    frameOf(0, rho, 0, al, tA, nA, eA1, eA2); frameOf(1, rho, 0, al, tB, nB, eB1, eB2);
    let m = -1;
    for (const [x, y] of SAMP) {
      // dessus de B sous A
      pt.copy(tB).addScaledVector(eB1, x).addScaledVector(eB2, y).addScaledVector(nB, CT / 2);
      dd.subVectors(pt, tA); let z = dd.dot(nA), r = Math.hypot(dd.dot(eA1), dd.dot(eA2));
      if (r < R) m = Math.max(m, z + CT / 2);
      // dessous de A au-dessus de B
      pt.copy(tA).addScaledVector(eA1, x).addScaledVector(eA2, y).addScaledVector(nA, -CT / 2);
      dd.subVectors(pt, tB); z = dd.dot(nB); r = Math.hypot(dd.dot(eB1), dd.dot(eB2));
      if (r < R) m = Math.max(m, CT / 2 - z);
    }
    return m;
  }
  const RH0 = 2.5 * R, RH1 = 3.12 * R, RT = R / Math.sin(PI / N);       // couronne fermée, ouverte, contact limite
  const TAB = 120, aTab = new Float32Array(TAB + 1), r0T = 2.3 * R;
  for (let k = 0; k <= TAB; k++) {
    const rho = mix(r0T, RT, k / TAB);
    let a = 0, b = .7;
    if (pen(rho, 0) > 0) { for (let i = 0; i < 26; i++) { const mm = (a + b) / 2; (pen(rho, mm) > 0 ? a = mm : b = mm); } aTab[k] = b + .002; }
  }
  const alpha = rho => { if (rho >= RT) return 0; const x = clamp01((rho - r0T) / (RT - r0T)) * TAB, i = Math.min(TAB - 1, Math.floor(x)); return mix(aTab[i], aTab[i + 1], x - i); };

  /* ---------- calendrier ---------- */
  const lift = a => CT / 2 * Math.cos(a) + R * Math.abs(Math.sin(a));
  const GZ0 = 22, gtF = Math.sqrt(2 * GZ0 / G), qGL = .1;               // GT : lâché d'assez haut, posé à q = .1
  function gtPose(q) {
    const t = (q - qGL) * TT;
    let z, tilt = 0, prec = 0, spin = .35;
    if (t < 0) { const s = Math.max(0, t + gtF); z = GZ0 - G * s * s / 2; tilt = .16 * (-t / gtF); prec = 1.2 + t * 3; spin = .35 + t * 1.5; }
    else {
      let s = t, v = .2 * G * gtF, zb = 0;
      for (let j = 0; j < 3; j++) { const du = 2 * v / G; if (s < du) { zb = v * s - G * s * s / 2; break; } s -= du; v *= .25; }
      const w = clamp01(t / .9);                                        // toupie d'Euler qui s'éteint
      tilt = .1 * (1 - w) ** 1.7; prec = 1.2 + 26 * w ** 1.7; z = zb; spin = .35 - .15 * w;
    }
    const ca = Math.cos(tilt);
    return { z: Math.max(z, 0) + SG * (CT / 2 * ca + R * Math.sin(tilt)), tilt, prec, spin };
  }
  const QI0 = .14, QI1 = .4, QC = .44, QS0 = .47, QS1 = .64, QO0 = .6;
  function ring(q) {                                                       // ρ et Θ de la couronne
    const e = sm(seg(q, QI0, QI1)), o = sm(seg(q, QO0, .95));
    const rho = mix(mix(rFar, RH0, 1 - (1 - e) ** 2), RH1, o);
    const Th = -1.5 * (1 - e) ** 1.6 + .95 * o;
    return { rho, Th, spinIn: 2.4 * (1 - e) ** 1.4, o };
  }
  const SLD = new THREE.Vector2(-.62, -.78);                               // la pièce découpée part vers le bas à gauche
  let Dc = 31, zEnd = 8, rFar = 9.5 * R;
  const resize = () => {
    const a = camera.aspect, T = view.T;
    Dc = Math.max((RH0 + R) / (.8 * T), (RH0 + R) / (.88 * T * a));
    zEnd = (RH1 - R * 1.06) / (T * Math.sqrt(1 + a * a) * 1.04);
    rFar = Math.max(9.5 * R, Dc * T * Math.sqrt(1 + a * a) * 1.1 + 1.6 * R);   // les jetons partent de hors champ
  };
  resize();
  // pièce découpée = l'ouverture au moment de la coupe (figée)
  const projChip = (c, out, cam) => { const k = cam.z / (cam.z - c.z - CT / 2); out.set(cam.x + (c.x - cam.x) * k, cam.y + (c.y - cam.y) * k, R * k * .985); };
  const qN = new THREE.Quaternion(), qZ = new THREE.Quaternion(), ZV = new THREE.Vector3(0, 0, 1), dum = new THREE.Object3D(), ax = new THREE.Vector3();
  const cC = new THREE.Vector3(), cN = new THREE.Vector3(), c1 = new THREE.Vector3(), c2 = new THREE.Vector3();
  function placeRing(q, cam, store) {
    const { rho, Th, spinIn, o } = ring(q), al = alpha(rho);
    for (let i = 0; i < N; i++) {
      frameOf(i, rho, Th, al, cC, cN, c1, c2);
      if (store) projChip(cC, store[i], cam);
      else {
        qN.setFromUnitVectors(ZV, cN); qZ.setFromAxisAngle(ZV, i * .9 + spinIn + Th * 1.0 + o * .6);   // les jetons pivotent en s'ouvrant
        dum.quaternion.copy(qN).multiply(qZ); dum.position.copy(cC); dum.updateMatrix();
        const kd = kinds[i % 2], j = i >> 1;
        kd.edge.setMatrixAt(j, dum.matrix); kd.face.setMatrixAt(j, dum.matrix); rings.setMatrixAt(i, dum.matrix);
        projChip(cC, U.uCh.value[i], cam);
        U.uAO.value[i].set(cC.x, cC.y, R * 1.04, .5);
      }
    }
  }
  const camAt = q => mix(Dc, zEnd, Math.pow(sm(seg(q, QO0 + .02, .95)), 1.15));
  const camTilt = q => .1 * (1 - sm(seg(q, QO0, .95)));
  const camQC = new THREE.Vector3();
  const tgt = new THREE.Vector3();

  const api = {
    scene, chips: rings, resize,
    frame(q) {
      renderer.clear();
      if (q >= .95) return;
      const cz = camAt(q), tilt = camTilt(q);
      camera.position.set(0, -cz * tilt, cz); camera.up.set(0, 1, 0); tgt.set(0, 0, 0); camera.lookAt(tgt); camera.updateMatrixWorld();
      uCamP.value.copy(camera.position);
      U.uL.value = sm(seg(q, 0, .14));
      if (q >= QC) { camQC.set(0, -camAt(QC) * camTilt(QC), camAt(QC)); placeRing(QC, camQC, U.uPad.value); }
      placeRing(q, camera.position, null);
      kinds.forEach(kd => { kd.edge.instanceMatrix.needsUpdate = kd.face.instanceMatrix.needsUpdate = true; });
      rings.instanceMatrix.needsUpdate = true;
      // coupe puis glissade de la pièce (et du GT posé dessus) sous la couronne
      const cut = q >= QC, sl = sm(seg(q, QS0, QS1)), dist = sl * (RH0 + SG * R + 1.2) * 1.15;
      U.uCut.value = cut ? 1 : 0; U.uSeam.value = cut ? .6 + .4 * (1 - sm(seg(q, QS0, QS0 + .04))) : sm(seg(q, QC - .03, QC));
      U.uPo.value.set(SLD.x * dist, SLD.y * dist); U.uPadK.value = sl;
      const g = gtPose(q);
      gt.visible = q > qGL - gtF / TT && sl < 1;
      gt.userData.cast.forEach(m => { m.castShadow = q < QS0; });   // sous le feutre, il ne porte plus d'ombre dessus
      ax.set(Math.cos(g.prec), Math.sin(g.prec), 0);
      gt.quaternion.setFromAxisAngle(ax, g.tilt).multiply(qZ.setFromAxisAngle(ZV, g.spin));
      gt.position.set(U.uPo.value.x, U.uPo.value.y, g.z - SG * CT / 2 + SG * CT / 2);
      const gh = Math.max(0, g.z - SG * lift(g.tilt));
      U.uAO.value[N].set(gt.position.x, gt.position.y, SG * R * (1.03 + gh * .08), gt.visible ? .55 * (1 - sm(clamp01(gh / 5))) : 0);
      renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
      renderer.render(under, camera); renderer.render(scene, camera);
    }
  };
  /* préchauffage : textures envoyées, programmes (dont ceux de la carte d'ombre) compilés dès la création, jamais en plein défilement */
  scene.traverse(o => { const m = o.material; if (m) for (const k of ['map', 'roughnessMap']) if (m[k]) renderer.initTexture(m[k]); });
  for (const q of [.3, .5, .7]) api.frame(q);
  renderer.clear();
  return api;
}
