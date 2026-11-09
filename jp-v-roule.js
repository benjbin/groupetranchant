/* Transition « roule » : le jeton qui roule.
   Un grand jeton entre par la gauche en roulant sur sa tranche (roulement sans glissement : rotation propre = distance / rayon),
   en léger virage. Sa tranche fend le tapis : derrière lui la fente s'ouvre en une déchirure qui s'élargit, bordée d'une ombre douce.
   Ralenti, il penche, sa trajectoire s'enroule et il tombe en tournoyant comme un disque d'Euler (le point de contact roule sur
   la tranche, le dessin tourne à peine), puis se couche, GT lisible. Le reste du tapis, jeton dessus, est tiré vers la droite :
   la révélation finit de balayer l'écran. Tout est fonction de q (la cinématique est intégrée une fois, puis lue dans une table). */
export function create(ctx) {
  const { THREE, renderer, camera, K, env, view, LITE, seg, sm, mix, clamp01 } = ctx;
  const PI = Math.PI, { R, CT } = K;

  /* ---------- le jeton plein : tranche, deux faces, liserés or, lentilles ---------- */
  const views = [['♠', 'GT', '♥'], ['♦', 'GT', '♣']].map(v => v.map(K.lensView));
  const lensF = K.lensMat(views[0]), lensB = K.lensMat(views[1]);
  const probe = K.portalChip([lensF, lensB]);
  const faceTex = probe.children[2].children[0].material.map, edgeTex = probe.children[0].material.map;
  const chip = new THREE.Group(), faceM = K.clay(faceTex);
  const add = (geo, mat, z, back) => { const m = new THREE.Mesh(geo, mat); m.position.z = z; if (back) m.rotation.y = PI; m.frustumCulled = false; chip.add(m); return m; };
  add(K.edgeGeo, K.clay(edgeTex), 0);
  add(K.faceGeo, faceM, CT / 2); add(K.faceGeo, faceM, -CT / 2, true);
  const ringG = K.ringGeo.clone().scale(1, 1, .35);
  add(ringG, K.goldMat, CT / 2 + .004); add(ringG, K.goldMat, -CT / 2 - .004, true);
  add(K.lensGeo, lensF, CT / 2 + .006); add(K.lensGeo, lensB, -CT / 2 - .006, true);

  const scene = new THREE.Scene();
  scene.environment = env; scene.environmentRotation.x = -PI / 2;
  const LD = new THREE.Vector3(-.55, .12, 1.5).normalize();     // vers la lumière principale : haute, à gauche ; l'ombre part à droite
  const key = new THREE.DirectionalLight(0xFFF0DA, 1.5); key.position.copy(LD).multiplyScalar(12);
  const rim = new THREE.DirectionalLight(0x8FB4E6, .8); rim.position.set(7, 6, 3);
  scene.add(key, rim, new THREE.AmbientLight(0xffffff, .08), chip);

  /* ---------- le tapis : plan du monde (z = 0), fente puis déchirure le long de l'arc parcouru, balayage final ---------- */
  const F = { uRes: { value: new THREE.Vector2() }, uL: { value: 0 }, uCc: { value: new THREE.Vector3() }, uCn: { value: new THREE.Vector3(0, 0, 1) },
    uLd: { value: LD }, uRad: { value: R }, uHt: { value: CT / 2 }, uSA: { value: 0 }, uOff: { value: 0 },
    uO: { value: new THREE.Vector2() }, uRa: { value: 40 }, uTh: { value: new THREE.Vector3() }, uA0: { value: 4 }, uK: { value: new THREE.Vector2(.5, .1) },
    uXs: { value: -1e4 }, uFw: { value: .4 }, uSeam: { value: 0 } };
  const felt = new THREE.Mesh(new THREE.PlaneGeometry(800, 800), new THREE.ShaderMaterial({
    uniforms: F, transparent: true, depthTest: false, depthWrite: false, premultipliedAlpha: true,
    vertexShader: 'varying vec3 vW; void main(){ vec4 w = modelMatrix * vec4(position, 1.); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }',
    fragmentShader: `varying vec3 vW;
      uniform vec2 uRes, uO, uK; uniform vec3 uCc, uCn, uLd, uTh; uniform float uL, uRad, uHt, uSA, uOff, uRa, uA0, uXs, uFw, uSeam;
      float rnd(vec2 p){ return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
      float h1(float x){ return fract(sin(x * 127.1) * 43758.5453); }
      float vn(float x){ float i = floor(x), f = fract(x); return mix(h1(i), h1(i + 1.), f * f * (3. - 2. * f)); }
      float shade(vec3 p, out float ao){
        vec3 a = p - uCc; float an = dot(a, uCn), ln = dot(uLd, uCn);
        vec3 A = a - uCn * an, B = uLd - uCn * ln;
        ao = 1. - smoothstep(0., .3, length(vec2(max(length(A) - uRad, 0.), max(abs(an) - uHt, 0.))));
        float ta = -1e4, tb = 1e4;
        if (abs(ln) > 1e-4) { float t1 = (-uHt - an) / ln, t2 = (uHt - an) / ln; ta = min(t1, t2); tb = max(t1, t2); }
        else if (abs(an) > uHt) return 0.;
        ta = max(ta, 0.); if (tb <= ta) return 0.;
        float bb = dot(B, B), t = bb > 1e-8 ? clamp(-dot(A, B) / bb, ta, tb) : ta;
        float r = length(A + B * t), pen = .02 + t * .05;
        return 1. - smoothstep(uRad - pen, uRad + pen, r);
      }
      void main(){
        vec2 p = gl_FragCoord.xy, q = (p - uRes * .5) / uRes.y;
        vec3 c = vec3(.0431, .1059, .1804) + uL * vec3(.05, .07, .08) * (1. - smoothstep(.05, .75, length(q * vec2(.8, 1.))));
        c += (rnd(p) - .5) * .012 * uL;
        vec2 f = vW.xy - vec2(uOff, 0.);                           // repère du tapis (il glisse à la fin)
        vec2 r = f - uO; float th = atan(r.x, -r.y), dd = length(r) - uRa;   // angle sur l'arc, écart à la trajectoire
        float a = (uTh.x - th) * uRa;                               // âge : distance parcourue depuis le passage du jeton
        float side = sign(dd), w = -1.;
        if (a > uA0 && th > uTh.y - .02) {
          float b = a - uA0;
          w = uK.x * pow(b, 1.15) + uK.y * b * b;
          w += (vn(a * 1.3 + side * 17.) - .5) * .45 * min(1., w) + (vn(a * 7. + side * 5.) - .5) * .1 * min(1., w * 2.);
        }
        float sd = max(w - abs(dd), uXs - f.x + (vn(f.y * 1.1) - .5) * .9 + (vn(f.y * 6.) - .5) * .18);                     // > 0 : tapis ouvert
        float aa = fwidth(sd) * .75 + 1e-4, m = 1. - smoothstep(-aa, aa, sd);
        /* fente laissée par la tranche, avant qu'elle ne s'ouvre ; liseré clair des fibres sur le bord déchiré */
        float seamOn = uSeam * step(0., a) * step(th, uTh.x) * (1. - smoothstep(uA0 * .8, uA0 * 1.2, a)) * step(uTh.y - .02, th);
        float lw = .028 + fwidth(dd);
        c *= 1. - .75 * seamOn * (1. - smoothstep(lw * .4, lw, abs(dd)));
        c += vec3(.05, .06, .07) * (1. - smoothstep(0., .07, -sd)) * step(-.3, -sd) * smoothstep(-1., .2, w);
        float ao, sh = uSA > 0. ? shade(vec3(vW.xy, 0.), ao) : 0.;
        if (uSA > 0.) c *= 1. - uSA * (.55 * sh + .45 * ao);
        float fr = .48 * (1. - smoothstep(0., uFw, sd));            // ombre douce du bord du tapis sur la section
        gl_FragColor = vec4(c, 1.) * m + vec4(0., 0., 0., fr) * (1. - m);
      }` }));
  felt.frustumCulled = false; const under = new THREE.Scene(); under.add(felt);
  renderer.compile(under, camera);                             // shader du tapis prêt avant le premier passage
  [...views.flat(), faceTex, edgeTex].forEach(t => renderer.initTexture(t));   // textures envoyées au GPU d'avance, pas au milieu du défilement

  /* ---------- cinématique : roulement sur un arc, virage qui se resserre, chute en disque d'Euler ---------- */
  const NS = 1201, TB = new Float32Array(NS * 5);             // par échantillon : contact x, y, cap ψ, inclinaison γ, distance roulée s
  const lift = g => R * Math.sin(g) + CT / 2 * Math.cos(g), off = g => R * Math.cos(g) - CT / 2 * Math.sin(g);
  const T1 = .7;                                               // fin du roulement (en temps normalisé τ)
  const gam = t => t < T1 ? PI / 2 - (.06 + .3 * sm(seg(t, .3, T1))) : (PI / 2 - .36) * (1 - seg(t, T1, 1)) ** 1.6;
  let Ra = 40, phi0 = 0, ox = 0, oy = 0, sArc = 0, Sroll = 10;
  function integrate() {
    const n = 6000, dt = 1 / n, psi0 = -Sroll / (2 * Ra) * .9;
    let x = 0, y = 0, psi = psi0, s = 0, om = 0, k = 0;
    const vR = t => Sroll * (1 - .75 * t / T1) / (.625 * T1);
    for (let i = 0; i <= n; i++) {
      const t = i * dt, g = gam(t);
      if (i % 5 === 0) { const j = (i / 5) * 5; TB[j] = x; TB[j + 1] = y; TB[j + 2] = psi; TB[j + 3] = g; TB[j + 4] = s; }
      let v, kap;
      if (t < T1) { v = vR(t); const e = sm(seg(t, .5, T1)); kap = mix(1 / Ra, 1 / Math.max(off(g), .25), e); if (t < .5) sArc = s; }
      else { if (!om) { om = vR(T1) / off(gam(T1)); k = gam(T1); } v = om * Math.min(5, Math.sqrt(k / Math.max(g, 1e-3))) * off(g); kap = 1 / off(g); }
      x += Math.cos(psi) * v * dt; y += Math.sin(psi) * v * dt; psi += v * kap * dt; s += v * dt;
    }
    return psi0;
  }
  const P = { x: 0, y: 0, psi: 0, g: 0, s: 0 };
  const read = t => {
    const f = clamp01(t) * (NS - 1), i = Math.min(NS - 2, Math.floor(f)), u = f - i, a = i * 5, b = a + 5;
    P.x = mix(TB[a], TB[b], u) + ox; P.y = mix(TB[a + 1], TB[b + 1], u) + oy; P.psi = mix(TB[a + 2], TB[b + 2], u); P.g = mix(TB[a + 3], TB[b + 3], u); P.s = mix(TB[a + 4], TB[b + 4], u);
    return P;
  };
  const centre = (p, v) => v.set(p.x - Math.sin(p.psi) * off(p.g), p.y + Math.cos(p.psi) * off(p.g), lift(p.g));

  const T = view.T, EL = 52 * PI / 180, Tg = new THREE.Vector3();
  let Dcam = 20, Oend = 30, Xs0 = 0, xSpan = 20, dpr = 1;
  const v0 = new THREE.Vector3(), v1 = new THREE.Vector3(), nd = new THREE.Vector3();
  const placeCam = () => {
    camera.position.set(Tg.x, Tg.y - Dcam * Math.cos(EL), Dcam * Math.sin(EL)); camera.up.set(0, 0, 1); camera.lookAt(Tg);
    camera.updateMatrixWorld(); camera.matrixWorldInverse.copy(camera.matrixWorld).invert();
  };
  const onFelt = (nx, ny, v) => {                              // point du tapis vu au coin (nx, ny) de l'écran
    v.set(nx, ny, .5).unproject(camera).sub(camera.position).normalize();
    return v.multiplyScalar(-camera.position.z / v.z).add(camera.position);
  };
  const resize = () => {
    const { W, H } = view, asp = W / H;
    renderer.getDrawingBufferSize(F.uRes.value); dpr = F.uRes.value.y / H;
    const Ww = 2 * R / (asp > 1 ? .2 : .42);                    // largeur de tapis vue au centre : le jeton en occupe 20 % (42 % sur téléphone)
    Dcam = Ww / (2 * T * asp); Tg.set(0, 0, 0); placeCam();
    Ra = asp > 1 ? 40 : 26;
    const xT = Ww * (asp > 1 ? .2 : .1), yT = Ww * (asp > 1 ? -.02 : .04) / Math.max(asp, .6);
    Sroll = Ww * .8 + R;
    for (let it = 0; it < 6; it++) {                            // le jeton doit entrer de hors champ (avec son ombre)
      integrate(); ox = 0; oy = 0;
      centre(read(1), v0); ox = xT - v0.x; oy = yT - v0.y;
      centre(read(0), v1); v1.project(camera);
      const need = -1 - (2.6 * R) / (Ww / 2);
      if (v1.x < need || it === 5) break;
      Sroll += (v1.x - need) * Ww / 2 + .5;
    }
    const p0 = read(0), psi0 = p0.psi;
    F.uO.value.set(p0.x - Ra * Math.sin(psi0), p0.y + Ra * Math.cos(psi0));   // centre du virage
    F.uRa.value = Ra; F.uTh.value.set(psi0, psi0, 0);
    F.uA0.value = (asp > 1 ? 2.3 : 1.3) * R; F.uK.value.set(asp > 1 ? .55 : .9, asp > 1 ? .07 : .35); F.uFw.value = .045 * Ww;
    const pe = read(1); phi0 = -(pe.psi - pe.s / R);              // couché, le GT finit droit face à nous
    centre(pe, v0); Xs0 = v0.x - 1.75 * R;
    let xr = -1e9; for (const ny of [-1, 1]) xr = Math.max(xr, onFelt(1, ny, v1).x);
    Oend = xr - Xs0 + .1 * Ww; xSpan = Xs0 - onFelt(-1, 1, v1).x + .1 * Ww;
  };
  resize();
  const qa = new THREE.Quaternion(), qb = new THREE.Quaternion(), qc = new THREE.Quaternion(), ZA = new THREE.Vector3(0, 0, 1), XA = new THREE.Vector3(1, 0, 0), lc = new THREE.Vector3();
  return {
    frame(q) {
      const t = seg(q, .03, .74), p = read(t);
      const sl = seg(q, .82, .95), O = Oend * sl * sl * (1.4 - .4 * sl);    // glissement final, tiré de plus en plus vite
      qa.setFromAxisAngle(ZA, p.psi); qb.setFromAxisAngle(XA, p.g); qc.setFromAxisAngle(ZA, phi0 - p.s / R);
      chip.quaternion.copy(qa).multiply(qb).multiply(qc);
      centre(p, chip.position); chip.position.x += O;
      placeCam();
      chip.updateMatrixWorld(true);
      chip.worldToLocal(lc.copy(camera.position));
      lensF.userData.phi.value = Math.atan2(lc.x, lc.z); lensB.userData.phi.value = Math.atan2(-lc.x, -lc.z);
      /* tapis : angle courant du contact sur l'arc (au-delà, la fente ne suit plus), glissement, balayage */
      const sc = Math.min(p.s, sArc + .3 * R);
      F.uTh.value.x = F.uTh.value.y + sc / Ra; F.uSeam.value = t > 0 ? 1 : 0;
      F.uOff.value = O; F.uXs.value = q < .66 ? -1e4 : mix(Xs0 - xSpan, Xs0, sm(seg(q, .66, .82)));
      F.uL.value = sm(seg(q, 0, .2));
      F.uCc.value.copy(chip.position); F.uCn.value.set(0, 0, 1).applyQuaternion(chip.quaternion);
      F.uSA.value = q < .03 ? 0 : .7;
      renderer.clear(); renderer.render(under, camera); renderer.render(scene, camera);
    },
    resize, scene
  };
}
