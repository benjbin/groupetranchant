/* Socle commun des maquettes : rendu cinéma, scroll, chapitres */
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { BokehPass } from 'three/addons/postprocessing/BokehPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

if (window.gsap) gsap.ticker.lagSmoothing(0);

export const IMG = 'https://www.groupetranchant.com/wp-content/uploads/';
export const BRAND = { blue: 0x2F5F90, navy: 0x1C3557, yellow: 0xF2C230, bordeaux: 0xA51E30 };
export const clamp01 = x => Math.min(1, Math.max(0, x));
export const smooth = x => x * x * (3 - 2 * x);
export const mobile = () => innerWidth < 821;

/* Grain, vignettage, légère aberration chromatique */
const FinishShader = {
  uniforms: { tDiffuse: { value: null }, uTime: { value: 0 }, uGrain: { value: .05 }, uVig: { value: .4 }, uAb: { value: .002 } },
  vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.); }',
  fragmentShader: `uniform sampler2D tDiffuse; uniform float uTime, uGrain, uVig, uAb; varying vec2 vUv;
    float rnd(vec2 p){ return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
    void main(){
      vec2 d = vUv - .5; float r2 = dot(d, d);
      vec3 c = vec3(texture2D(tDiffuse, vUv + d * uAb).r, texture2D(tDiffuse, vUv).g, texture2D(tDiffuse, vUv - d * uAb).b);
      c *= 1. - uVig * smoothstep(.04, .55, r2 * 1.7);
      c += (rnd(vUv * 1000. + fract(uTime)) - .5) * uGrain;
      gl_FragColor = vec4(c, 1.);
    }`
};

/* Flou de bascule (effet miniature) */
const TiltShader = {
  uniforms: { tDiffuse: { value: null }, uDir: { value: new THREE.Vector2(1, 0) }, uAmount: { value: 5 }, uFocus: { value: .5 }, uRange: { value: .3 }, uRes: { value: new THREE.Vector2(1, 1) } },
  vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.); }',
  fragmentShader: `uniform sampler2D tDiffuse; uniform vec2 uDir, uRes; uniform float uAmount, uFocus, uRange; varying vec2 vUv;
    void main(){
      float b = smoothstep(0., uRange, abs(vUv.y - uFocus)) * uAmount;
      vec4 s = vec4(0.); float t = 0.;
      for (int i = -6; i <= 6; i++) { float w = exp(-float(i * i) / 18.); s += texture2D(tDiffuse, vUv + uDir * float(i) * b / uRes) * w; t += w; }
      gl_FragColor = s / t;
    }`
};

export function createStage(o = {}) {
  const canvas = document.getElementById('gl');
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: 'high-performance' });
  const dpr = Math.min(devicePixelRatio, o.maxDpr || 1.5);
  renderer.setPixelRatio(dpr);
  renderer.setSize(innerWidth, innerHeight);
  renderer.toneMapping = o.toneMapping ?? THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = o.exposure ?? 1;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(o.fov || 35, innerWidth / innerHeight, .1, 400);
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(renderer), .04).texture;

  const rt = new THREE.WebGLRenderTarget(innerWidth * dpr, innerHeight * dpr, { type: THREE.HalfFloatType, samples: 4 });
  const composer = new EffectComposer(renderer, rt);
  composer.addPass(new RenderPass(scene, camera));
  let bokeh = null, tiltH = null, tiltV = null;
  if (o.dof) { bokeh = new BokehPass(scene, camera, o.dof); composer.addPass(bokeh); }
  if (o.tilt) {
    tiltH = new ShaderPass(TiltShader); tiltV = new ShaderPass(TiltShader);
    tiltV.uniforms.uDir.value.set(0, 1);
    [tiltH, tiltV].forEach(p => { Object.assign(p.uniforms.uAmount, { value: o.tilt.amount }); p.uniforms.uFocus.value = o.tilt.focus; p.uniforms.uRange.value = o.tilt.range; composer.addPass(p); });
  }
  const b = o.bloom || {};
  const bloom = new UnrealBloomPass(new THREE.Vector2(innerWidth, innerHeight), b.strength ?? .4, b.radius ?? .6, b.threshold ?? .85);
  composer.addPass(bloom);
  composer.addPass(new OutputPass());
  const finish = new ShaderPass(FinishShader);
  finish.uniforms.uGrain.value = o.grain ?? .04;
  finish.uniforms.uVig.value = o.vignette ?? .4;
  finish.uniforms.uAb.value = o.aberration ?? .0015;
  composer.addPass(finish);

  const resize = () => {
    renderer.setSize(innerWidth, innerHeight);
    composer.setSize(innerWidth, innerHeight);
    camera.aspect = innerWidth / innerHeight;
    camera.updateProjectionMatrix();
    [tiltH, tiltV].forEach(p => p && p.uniforms.uRes.value.set(innerWidth * dpr, innerHeight * dpr));
  };
  resize();
  addEventListener('resize', resize);
  return { renderer, scene, camera, composer, bokeh, bloom, finish, tiltH, tiltV, dpr };
}

/* Faisceau de lumière volumétrique */
export function beamMaterial(color, { attenuation = 10, anglePower = 2.5, opacity = .4 } = {}) {
  return new THREE.ShaderMaterial({
    uniforms: { uColor: { value: new THREE.Color(color) }, uApex: { value: new THREE.Vector3() }, uAtt: { value: attenuation }, uPow: { value: anglePower }, uOpacity: { value: opacity } },
    vertexShader: 'varying vec3 vN; varying vec3 vW; void main(){ vN = normalize(normalMatrix * normal); vec4 w = modelMatrix * vec4(position, 1.); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }',
    fragmentShader: `uniform vec3 uColor, uApex; uniform float uAtt, uPow, uOpacity; varying vec3 vN; varying vec3 vW;
      void main(){ float i = 1. - clamp(distance(vW, uApex) / uAtt, 0., 1.); vec3 n = vec3(vN.x, vN.y, abs(vN.z)); i *= pow(max(dot(n, vec3(0., 0., 1.)), 0.), uPow); gl_FragColor = vec4(uColor * i * uOpacity, 1.); }`,
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending
  });
}
export function beam(from, to, radius, color, opts) {
  const h = from.distanceTo(to) * 1.15;
  const geo = new THREE.ConeGeometry(radius, h, 64, 1, true);
  geo.translate(0, -h / 2, 0); geo.rotateX(-Math.PI / 2);
  const m = beamMaterial(color, { attenuation: h, ...opts });
  m.uniforms.uApex.value.copy(from);
  const mesh = new THREE.Mesh(geo, m);
  mesh.position.copy(from); mesh.lookAt(to);
  return mesh;
}

/* Poussière en suspension */
let dotTex = null;
export function dust(n, min, max, color, size = .03, opacity = .7) {
  if (!dotTex) {
    const c = document.createElement('canvas'); c.width = c.height = 64;
    const x = c.getContext('2d'); const g = x.createRadialGradient(32, 32, 0, 32, 32, 32);
    g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(.4, 'rgba(255,255,255,.35)'); g.addColorStop(1, 'rgba(255,255,255,0)');
    x.fillStyle = g; x.fillRect(0, 0, 64, 64); dotTex = new THREE.CanvasTexture(c);
  }
  const p = new Float32Array(n * 3), seed = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    p[i * 3] = min.x + Math.random() * (max.x - min.x);
    p[i * 3 + 1] = min.y + Math.random() * (max.y - min.y);
    p[i * 3 + 2] = min.z + Math.random() * (max.z - min.z);
    seed[i] = Math.random() * 100;
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(p, 3));
  const base = p.slice();
  const pts = new THREE.Points(g, new THREE.PointsMaterial({ color, size, map: dotTex, transparent: true, opacity, depthWrite: false, blending: THREE.AdditiveBlending, sizeAttenuation: true }));
  pts.userData.update = t => {
    for (let i = 0; i < n; i++) {
      const s = seed[i];
      p[i * 3] = base[i * 3] + Math.sin(t * .13 + s) * .25;
      p[i * 3 + 1] = base[i * 3 + 1] + Math.sin(t * .09 + s * 2) * .3;
      p[i * 3 + 2] = base[i * 3 + 2] + Math.cos(t * .11 + s) * .25;
    }
    g.attributes.position.needsUpdate = true;
  };
  return pts;
}

/* Images clés de caméra, interpolées avec un temps d'arrêt à chaque étape */
export function keyframes(frames) {
  const v = (a, b, e) => a.map((x, k) => x + (b[k] - x) * e);
  return p => {
    let i = 0;
    while (i < frames.length - 2 && p > frames[i + 1].t) i++;
    const A = frames[i], B = frames[i + 1];
    const e = smooth(clamp01((p - A.t) / (B.t - A.t)));
    const out = {};
    Object.keys(A).forEach(k => { if (k !== 't') out[k] = Array.isArray(A[k]) ? v(A[k], B[k], e) : A[k] + (B[k] - A[k]) * e; });
    out.e = e; out.i = i;
    return out;
  };
}

/* Défilement fluide et progression lissée */
export function setupScroll(screens) {
  history.scrollRestoration = 'manual';
  scrollTo(0, 0);
  document.getElementById('scroll').style.height = screens * 100 + 'vh';
  const lenis = new Lenis({ lerp: .075, smoothWheel: true });
  lenis.stop();
  let ps = 0;
  const api = {
    lenis,
    progress: 0,
    update() {
      lenis.raf(performance.now());
      const max = document.documentElement.scrollHeight - innerHeight;
      const p = max > 0 ? clamp01(lenis.scroll / max) : 0;
      const now = performance.now(), dt = Math.min(.25, (now - (api._t || now)) / 1000); api._t = now;
      ps += (p - ps) * (1 - Math.exp(-dt * 5));
      if (Math.abs(p - ps) < 1e-4) ps = p;
      api.progress = ps;
      const bar = document.querySelector('.progress i');
      if (bar) bar.style.transform = `scaleY(${ps})`;
      document.body.classList.toggle('scrolled', lenis.scroll > 30);
      return ps;
    },
    to(p) { lenis.scrollTo(p * (document.documentElement.scrollHeight - innerHeight), { duration: 2.4 }); }
  };
  window.__scroll = api;
  return api;
}

/* Chapitres de texte affichés selon la progression */
export function chapters(p) {
  document.querySelectorAll('.chapter').forEach(el => {
    const a = +el.dataset.from, b = +el.dataset.to, f = .045;
    const o = Math.min(a <= 0 ? 1 : clamp01((p - a) / f), b >= 1 ? 1 : clamp01((b - p) / f));
    el.style.opacity = o;
    el.style.visibility = o > .01 ? 'visible' : 'hidden';
    el.style.transform = `translateY(${(1 - o) * 26}px)`;
    el.classList.toggle('on', o > .5);
  });
}

export function hideLoader(after) {
  const l = document.getElementById('loader');
  l.classList.add('done');
  document.body.classList.remove('loading');
  setTimeout(() => after && after(), 400);
}

export function setLoad(v) { const b = document.querySelector('#loader .bar i'); if (b) b.style.width = Math.round(v * 100) + '%'; }

/* Parallaxe souris */
export const mouse = { x: 0, y: 0, sx: 0, sy: 0 };
addEventListener('pointermove', e => { mouse.x = e.clientX / innerWidth - .5; mouse.y = e.clientY / innerHeight - .5; });
export function stepMouse() { mouse.sx += (mouse.x - mouse.sx) * .04; mouse.sy += (mouse.y - mouse.sy) * .04; }
