/* Groupe Tranchant — Activités principales : la page se vit au défilement.
   1. Ouverture épinglée : la salle du Paris Élysées Club en WebGL, loupe au pointeur, puis travelling avant
      dans la salle (zoom, aberration, poussière d'or qui file vers la caméra) ; le titre éclate vers le spectateur,
      les chiffres montent un à un.
   2. Récit en cinq chapitres : la photo reste en scène et se remplace par volet qui monte, le chapitre lu s'allume. */
const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const ease = t => t * t * (3 - 2 * t);

const VERT = `attribute vec2 p;varying vec2 vUv;void main(){vUv=p*.5+.5;gl_Position=vec4(p,0.,1.);}`;
const FRAG = `precision highp float;
varying vec2 vUv;
uniform sampler2D uTex;uniform vec2 uRes,uImg,uMouse;uniform float uP,uT,uM;
vec2 cover(vec2 uv){float ra=uRes.x/uRes.y,ia=uImg.x/uImg.y;vec2 s=ra>ia?vec2(1.,ia/ra):vec2(ra/ia,1.);return (uv-.5)*s+.5;}
float h(vec2 v){return fract(sin(dot(v,vec2(127.1,311.7)))*43758.5453);}
void main(){
  vec2 c=vec2(.49,.53);
  float z=1.+uP*1.15;
  vec2 d=vUv-c;
  d*=1.-uP*.45*dot(d,d);
  vec2 uv=c+d/z;
  vec2 asp=vec2(uRes.x/uRes.y,1.);
  float lm=smoothstep(.3,0.,length((vUv-uMouse)*asp))*uM;
  uv-=(vUv-uMouse)*lm*.16;
  uv.y+=sin(uv.x*9.+uT*.5)*.0018;uv.x+=cos(uv.y*7.+uT*.4)*.0014;
  vec2 dir=normalize(d+1e-5)*(.0015+uP*.014+lm*.012);
  vec3 col=vec3(0.);
  float blur=uP*.06;
  for(int i=0;i<8;i++){
    float k=float(i)/7.;
    vec2 q=cover(c+(uv-c)*(1.-blur*k));
    col+=vec3(texture2D(uTex,q+dir).r,texture2D(uTex,q).g,texture2D(uTex,q-dir).b);
  }
  col/=8.;
  col=mix(col,col*vec3(.78,.88,1.06),.45);
  float vig=smoothstep(1.15,.15,length((vUv-.5)*vec2(1.15,1.)));
  col*=mix(.5,1.05,vig);
  col+=vec3(.98,.78,.23)*lm*.07;
  // poussière d'or : des points qui filent vers la caméra pendant le travelling
  for(int i=0;i<36;i++){
    float fi=float(i);
    vec2 o=vec2(h(vec2(fi,1.)),h(vec2(fi,7.)))-.5;
    float zz=fract(h(vec2(fi,3.))+uT*.035+uP*.9);
    vec2 pos=c+o*asp.yx*(.15+zz*zz*2.4)*vec2(1.,1.);
    float r=(.0015+zz*zz*.012)*(.6+h(vec2(fi,9.)));
    float dd=length((vUv-pos)*asp);
    float a=smoothstep(r,r*.15,dd)*smoothstep(0.,.25,zz)*smoothstep(1.,.75,zz);
    col+=vec3(1.,.82,.36)*a*(.35+uP*.9);
  }
  col=mix(col,vec3(.043,.106,.18),clamp(uP*1.15-.12,0.,.84));
  gl_FragColor=vec4(col,1.);
}`;

function glHero(hero, img) {
  const cv = document.createElement('canvas');
  cv.className = 'ap-gl';
  const gl = cv.getContext('webgl', { antialias: false, alpha: false, powerPreference: 'high-performance' });
  if (!gl) return null;
  const sh = (t, s) => { const o = gl.createShader(t); gl.shaderSource(o, s); gl.compileShader(o); if (!gl.getShaderParameter(o, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(o)); return o; };
  const pr = gl.createProgram();
  gl.attachShader(pr, sh(gl.VERTEX_SHADER, VERT)); gl.attachShader(pr, sh(gl.FRAGMENT_SHADER, FRAG)); gl.linkProgram(pr); gl.useProgram(pr);
  gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  const loc = gl.getAttribLocation(pr, 'p'); gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
  const U = n => gl.getUniformLocation(pr, n);
  const u = { res: U('uRes'), img: U('uImg'), mouse: U('uMouse'), p: U('uP'), t: U('uT'), m: U('uM') };
  const tex = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, tex);
  gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, img);
  [gl.TEXTURE_WRAP_S, gl.TEXTURE_WRAP_T].forEach(k => gl.texParameteri(gl.TEXTURE_2D, k, gl.CLAMP_TO_EDGE));
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.uniform2f(u.img, img.naturalWidth, img.naturalHeight);
  hero.prepend(cv);
  const size = () => {
    const dpr = Math.min(devicePixelRatio || 1, innerWidth < 700 ? 1.5 : 1.25);
    cv.width = Math.round(cv.clientWidth * dpr); cv.height = Math.round(cv.clientHeight * dpr);
    gl.viewport(0, 0, cv.width, cv.height); gl.uniform2f(u.res, cv.width, cv.height);
  };
  size(); addEventListener('resize', size);
  return {
    draw(p, t, mx, my, m) { gl.uniform1f(u.p, p); gl.uniform1f(u.t, t); gl.uniform2f(u.mouse, mx, my); gl.uniform1f(u.m, m); gl.drawArrays(gl.TRIANGLES, 0, 3); }
  };
}

export function mountAp(root, { reduceMotion }) {
  const track = root.querySelector('.ap-track');
  const hero = root.querySelector('.ap-hero');
  const h1 = hero.querySelector('h1');
  const figs = [...hero.querySelectorAll('.ap-figs > div')];
  const stage = root.querySelector('.ap-stage');
  const shots = [...root.querySelectorAll('.ap-shot')];
  const chs = [...root.querySelectorAll('.ap-ch')];
  const prog = root.querySelector('.ap-prog');
  if (reduceMotion) { root.classList.add('ap-still'); return; }
  root.classList.add('ap-live');
  figs.forEach((f, i) => f.style.setProperty('--i', i));

  // titre : chaque lettre reçoit sa trajectoire vers le spectateur (après le découpage fait par text-fx)
  const seedChars = () => h1.querySelectorAll('.c').forEach((c, i) => {
    const r = Math.sin(i * 91.7) * .5 + .5;
    c.style.setProperty('--r', (.4 + r * .9).toFixed(2));
    c.style.setProperty('--dx', ((Math.sin(i * 37.3) * 2 - 1) * 26).toFixed(1));
  });
  seedChars(); setTimeout(seedChars, 400);

  // WebGL : image locale (même origine) ; sans elle, l'image d'ouverture fait elle-même le travelling (CSS)
  let gl = null, mx = .5, my = .5, tmx = .5, tmy = .5, m = 0, tm = 0;
  const im = hero.querySelector('.ap-gl-src');
  if (im) im.decode().then(() => { try { gl = glHero(hero, im); if (gl) hero.classList.add('gl-on'); } catch (e) { console.warn('ouverture WebGL indisponible', e); } }).catch(() => {});
  hero.addEventListener('pointermove', e => { const r = hero.getBoundingClientRect(); tmx = (e.clientX - r.left) / r.width; tmy = 1 - (e.clientY - r.top) / r.height; tm = 1; });
  hero.addEventListener('pointerleave', () => { tm = 0; });

  let heroP = 0, heroVisible = true;
  new IntersectionObserver(es => { heroVisible = es[0].isIntersecting; }).observe(hero);

  const frame = now => {
    requestAnimationFrame(frame);
    const vh = innerHeight;
    // 1. ouverture
    const tr = track.getBoundingClientRect();
    heroP = clamp(-tr.top / Math.max(1, tr.height - vh));
    root.style.setProperty('--hp', heroP.toFixed(4));
    const fly = ease(clamp(heroP / .5));
    hero.style.setProperty('--fly', fly.toFixed(4));
    figs.forEach((f, i) => f.style.setProperty('--q', ease(clamp((heroP - .38 - i * .07) / .22)).toFixed(4)));
    if (gl && heroVisible) {
      mx += (tmx - mx) * .08; my += (tmy - my) * .08; m += (tm - m) * .06;
      gl.draw(ease(heroP), now / 1000, mx, my, m);
    }
    // 2. récit : chaque chapitre fait monter sa photo dans la scène et s'allume quand il passe au centre
    const staged = stage && stage.offsetParent !== null;
    chs.forEach((c, i) => {
      const r = c.getBoundingClientRect(), mid = r.top + r.height / 2;
      if (r.top < vh * .78 && r.bottom > vh * .1) c.classList.add('on');
      if (!staged) return;
      const a = 1 - clamp(Math.abs(mid - vh / 2) / (vh * .6));
      c.style.setProperty('--a', ease(a).toFixed(4));
      c.style.setProperty('--s', mid > vh / 2 ? 1 : -1);
      if (shots[i]) {
        shots[i].style.setProperty('--w', ease(clamp((vh * 1.2 - mid) / (vh * .65))).toFixed(4));
        shots[i].style.setProperty('--g', clamp((vh / 2 - mid) / vh + .5).toFixed(4));
      }
    });
    if (staged && prog && chs.length) {
      const f = chs[0].getBoundingClientRect(), l = chs[chs.length - 1].getBoundingClientRect();
      const f0 = f.top + f.height / 2, l0 = l.top + l.height / 2;
      prog.style.setProperty('--sp', clamp((vh / 2 - f0) / Math.max(1, l0 - f0) * .8 + .2).toFixed(4));
    }
  };
  requestAnimationFrame(frame);
}
