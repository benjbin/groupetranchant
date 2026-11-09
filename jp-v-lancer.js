/* Transition « lancer » : le pile ou face.
   Le jeton GT, lancé d'une pichenette depuis le bas de l'écran, monte en vrillant sur un diamètre (la lentille fait jaillir ♠ et ♥,
   GT par instants), se stabilise face à nous et vient droit vers la caméra. Quand sa face remplit l'écran, il est traversé :
   les lames de la lentille s'effacent du centre vers les bords, puis la couronne, et le tapis reste percé exactement
   à la silhouette projetée du jeton, qui continue de grandir jusqu'à dépasser les coins. Tout est fonction de q. */
export function create(ctx) {
  const { THREE, renderer, camera, K, env, view, LITE, seg, sm, mix, clamp01 } = ctx;
  const PI = Math.PI, { R, CT, RC } = K;

  /* ---------- le jeton : couronne de face percée, paroi du centre, lentille pleine (une seule par face) ---------- */
  const views = [['♠', 'GT', '♥'], ['♦', 'GT', '♣']].map(v => v.map(K.lensView));
  const U = { uO: { value: 0 }, uE: { value: 0 } };            // uO : effacement des lames, uE : rayon effacé de la couronne
  const lensF = K.lensMat(views[0]), lensB = K.lensMat(views[1]);
  { const pre = lensF.onBeforeCompile;                         // chaque lame s'efface à son tour, du centre vers les bords
    lensF.transparent = true;
    lensF.onBeforeCompile = (s, r) => {
      pre(s, r); s.uniforms.uO = U.uO;
      s.fragmentShader = 'uniform float uO;\n' + s.fragmentShader.replace('diffuseColor *= tx;',
        'diffuseColor *= tx; float kk = abs(i - 7.) / 7.; diffuseColor.a *= 1. - smoothstep(kk * .55, kk * .55 + .45, uO);');
    }; }
  const probe = K.portalChip([lensF, lensB]);                  // textures de face et de tranche déjà prêtes dans le kit
  const faceTex = probe.children[2].children[0].material.map, edgeTex = probe.children[0].material.map;
  const fade = (m, radial) => {
    m.transparent = true;
    if (radial) m.onBeforeCompile = s => {
      s.uniforms.uE = U.uE;
      s.fragmentShader = 'uniform float uE;\n' + s.fragmentShader.replace('#include <map_fragment>',
        '#include <map_fragment>\n float rr = length(vMapUv - .5) * 2.; diffuseColor.a *= smoothstep(uE - .015, uE, rr);');
    };
    return m;
  };
  const faceF = fade(K.clay(faceTex), true), faceB = K.clay(faceTex), edgeM = fade(K.clay(edgeTex));
  const goldF = fade(K.goldMat.clone());
  const wallM = fade(new THREE.MeshPhysicalMaterial({ color: 0xE9E0CE, roughness: .7, clearcoat: .3, side: THREE.BackSide, envMapIntensity: .6 }));
  const chip = new THREE.Group();
  const add = (geo, mat, z, back, ro) => { const m = new THREE.Mesh(geo, mat); m.position.z = z; if (back) m.rotation.y = PI; m.renderOrder = ro; chip.add(m); return m; };
  const wall = add(new THREE.CylinderGeometry(RC, RC, CT, 120, 1, true).rotateX(PI / 2), wallM, 0, false, 1);
  const edge = add(K.edgeGeo, edgeM, 0, false, 2);
  const fFace = add(new THREE.RingGeometry(RC, R - .03, 160, 1), faceF, CT / 2, false, 3);
  const bFace = add(K.faceGeo, faceB, -CT / 2, true, 3);
  const ringG = K.ringGeo.clone().scale(1, 1, .35);
  const fGold = add(ringG, goldF, CT / 2 + .004, false, 4), bGold = add(ringG, K.goldMat, -CT / 2 - .004, true, 4);
  const fLens = add(K.lensGeo, lensF, CT / 2 + .006, false, 5), bLens = add(K.lensGeo, lensB, -CT / 2 - .006, true, 5);
  const back = [bFace, bGold, bLens];
  chip.traverse(o => { o.frustumCulled = false; });

  const scene = new THREE.Scene();
  scene.environment = env; scene.environmentRotation.x = -PI / 2;
  const LD = new THREE.Vector3(-.32, .5, 1).normalize();       // direction de la lumière principale (ombre portée cohérente)
  const key = new THREE.DirectionalLight(0xFFF0DA, 1.4); key.position.copy(LD).multiplyScalar(12);
  const rim = new THREE.DirectionalLight(0x8FB4E6, .9); rim.position.set(6, -5, 4);
  scene.add(key, rim, new THREE.AmbientLight(0xffffff, .08), chip);

  /* ---------- le tapis : plein écran, ombre portée exacte du cylindre (lancer de rayon vers la lumière), percé à la silhouette ---------- */
  const F = { uRes: { value: new THREE.Vector2() }, uL: { value: 0 }, uPx: { value: 1 }, uCc: { value: new THREE.Vector3() }, uCn: { value: new THREE.Vector3(0, 0, 1) },
    uLd: { value: LD }, uRad: { value: R }, uHt: { value: CT / 2 }, uSA: { value: 0 }, uHC: { value: new THREE.Vector2() }, uHR: { value: 0 }, uFr: { value: 20 } };
  const felt = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), new THREE.ShaderMaterial({
    uniforms: F, transparent: true, depthTest: false, depthWrite: false, premultipliedAlpha: true,
    vertexShader: 'void main(){ gl_Position = vec4(position.xy, 0., 1.); }',
    fragmentShader: `uniform vec2 uRes, uHC; uniform float uL, uPx, uRad, uHt, uSA, uHR, uFr; uniform vec3 uCc, uCn, uLd;
      float rnd(vec2 p){ return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
      /* part de lumière arrêtée par le jeton (cylindre de rayon uRad, demi-épaisseur uHt) pour le point p du tapis */
      float shade(vec3 p){
        vec3 a = p - uCc; float an = dot(a, uCn), ln = dot(uLd, uCn);
        vec3 A = a - uCn * an, B = uLd - uCn * ln;
        float ta = -1e4, tb = 1e4;
        if (abs(ln) > 1e-4) { float t1 = (-uHt - an) / ln, t2 = (uHt - an) / ln; ta = min(t1, t2); tb = max(t1, t2); }
        else if (abs(an) > uHt) return 0.;
        ta = max(ta, 0.); if (tb <= ta) return 0.;
        float bb = dot(B, B), t = bb > 1e-8 ? clamp(-dot(A, B) / bb, ta, tb) : ta;
        float r = length(A + B * t), pen = .03 + t * .07;
        return (1. - smoothstep(uRad - pen, uRad + pen, r)) / (1. + t * .09);
      }
      void main(){
        vec2 p = gl_FragCoord.xy, q = (p - uRes * .5) / uRes.y;
        vec3 c = vec3(.0431, .1059, .1804) + uL * vec3(.05, .07, .08) * (1. - smoothstep(.05, .75, length(q * vec2(.8, 1.))));
        c += (rnd(p) - .5) * .012 * uL;
        float sh = uSA > 0. ? uSA * shade(vec3((p - uRes * .5) * uPx, 0.)) : 0.;
        float d = uHR - length(p - uHC), m = uHR > 0. ? 1. - smoothstep(-1., 1., d) : 1.;
        float fr = .42 * (1. - smoothstep(0., uFr, d));            // ombre douce du bord du tapis sur la section
        gl_FragColor = vec4(c * (1. - sh), 1.) * m + vec4(0., 0., 0., fr) * (1. - m);
      }` }));
  felt.frustumCulled = false; const under = new THREE.Scene(); under.add(felt);
  renderer.compile(under, camera);                             // shader du tapis prêt avant le premier passage
  [...views.flat(), faceTex, edgeTex].forEach(t => renderer.initTexture(t));   // textures envoyées au GPU d'avance, pas au milieu du défilement

  /* ---------- trajectoire : diamètre apparent s (en hauteurs d'écran) interpolé en log, monotone et lisse ---------- */
  const mono = (xs, ys) => {
    const n = xs.length, d = [], m = [];
    for (let i = 0; i < n - 1; i++) d.push((ys[i + 1] - ys[i]) / (xs[i + 1] - xs[i]));
    for (let i = 0; i < n; i++) m.push(i === 0 ? d[0] : i === n - 1 ? d[n - 2] : d[i - 1] * d[i] <= 0 ? 0 : 2 / (1 / d[i - 1] + 1 / d[i]));
    return x => {
      if (x <= xs[0]) return ys[0]; if (x >= xs[n - 1]) return ys[n - 1];
      let i = 0; while (x > xs[i + 1]) i++;
      const h = xs[i + 1] - xs[i], t = (x - xs[i]) / h, t2 = t * t, t3 = t2 * t;
      return (2 * t3 - 3 * t2 + 1) * ys[i] + (t3 - 2 * t2 + t) * h * m[i] + (-2 * t3 + 3 * t2) * ys[i + 1] + (t3 - t2) * h * m[i + 1];
    };
  };
  const T = view.T, Q0 = .03, QS = .6, QF = .64, QE = .935;   // entrée, fin de la vrille, face plein écran, silhouette au-delà des coins
  let Dc = 20, lnS = null, sIn = .3, dpr = 1;
  const resize = () => {
    const { W, H } = view;
    renderer.getDrawingBufferSize(F.uRes.value); dpr = F.uRes.value.y / H;
    const mn = Math.min(W, H) / H, sF = .3 * mn;             // posé sur le tapis, il occuperait 30 % du petit côté
    Dc = R / (T * sF); sIn = sF * 1.25;
    lnS = mono([Q0, .4, QF, .8, QE], [sIn, sF * 2.1, mn * 1.02, mn * 1.02 + (Math.hypot(W, H) / H - mn) * .45, Math.hypot(W, H) / H * 1.12].map(Math.log));
    F.uFr.value = 22 * dpr;
  };
  resize();
  const qa = new THREE.Quaternion(), qb = new THREE.Quaternion(), ZA = new THREE.Vector3(0, 0, 1), YA = new THREE.Vector3(0, 1, 0), lc = new THREE.Vector3();
  const N = LITE ? 3 : 4;                                      // tours complets de la vrille
  return {
    frame(q) {
      const { W, H } = view;
      const s = Math.exp(lnS(q)), d = R / (T * s);              // distance caméra-jeton pour ce diamètre apparent
      const u = seg(q, Q0, .42), us = seg(q, Q0, QS);
      const Y = -(.5 + sIn / 2 + .03) * (1 - u) ** 2, X = .07 * Math.sin(PI * u) * (1 - u) * (W / H);
      const th = 2 * PI * N * (1 - (1 - us) ** 2.4), chi = 1.3 * (1 - us) ** 1.7 + .18 * Math.sin(us * 9) * (1 - us) ** 2;
      qa.setFromAxisAngle(ZA, chi); qb.setFromAxisAngle(YA, th);
      chip.quaternion.copy(qa).multiply(qb);
      chip.position.set(X * 2 * T * d, Y * 2 * T * d, Dc - d);
      camera.position.set(0, 0, Dc); camera.up.set(0, 1, 0); camera.lookAt(0, 0, 0);
      chip.updateMatrixWorld(true);
      chip.worldToLocal(lc.copy(camera.position));
      lensF.userData.phi.value = Math.atan2(lc.x, lc.z); lensB.userData.phi.value = Math.atan2(-lc.x, -lc.z);
      /* traversée : lames, puis couronne (du centre vers le bord), paroi et tranche avec elle */
      const o = seg(q, QF, .73), e = mix(.6, 1.12, sm(seg(q, .69, .83)));
      U.uO.value = o; U.uE.value = q < .69 ? 0 : e;
      back.forEach(m => { m.visible = o === 0; });
      fLens.visible = o < 1;
      wallM.opacity = 1 - sm(seg(e, .64, .78)); goldF.opacity = 1 - sm(seg(e, .72, .8)); edgeM.opacity = 1 - sm(seg(e, .93, 1.08));
      chip.visible = e < 1.11;
      /* tapis : lumière, ombre portée, et trou à la silhouette projetée (cercle exact : le jeton est alors parallèle à l'écran) */
      const fp = dpr * H / 2 / T, cx = F.uRes.value.x / 2, cy = F.uRes.value.y / 2;
      F.uL.value = sm(seg(q, 0, .2)); F.uPx.value = Dc / fp;
      F.uCc.value.copy(chip.position); F.uCn.value.set(0, 0, 1).applyQuaternion(chip.quaternion);
      F.uSA.value = q < Q0 ? 0 : .6 * (1 - sm(seg(q, QF, .8)));
      if (o > 0) {
        let rs = 0;                                              // profil de la tranche arrondie (b = .03) : rayon apparent maximal
        for (let k = 0; k <= 6; k++) { const t = k / 6 * PI / 2; rs = Math.max(rs, (R - .03 + .03 * Math.cos(t)) / (d - (CT / 2 - .03 + .03 * Math.sin(t)))); }
        F.uHC.value.set(cx + chip.position.x * fp / d, cy + chip.position.y * fp / d); F.uHR.value = rs * fp - .6;
      } else F.uHR.value = 0;
      renderer.clear(); renderer.render(under, camera); if (chip.visible) renderer.render(scene, camera);
    },
    resize, scene
  };
}
