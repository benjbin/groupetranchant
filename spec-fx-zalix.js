/* Groupe Tranchant — scène de la filiale ZALIX BIOMÉTRIE (activités spécialisées, accueil).
   Contrat : mount(layer, { reduceMotion }) → { play(), pause(), pointer(mx, my) }.

   Une vraie empreinte digitale, synthétisée à chaque visite sur le GPU :
   - champ d'orientation à singularités (Sherlock-Monro : noyau(x) + delta(s)),
   - bruit blanc filtré itérativement par un filtre de Gabor orienté → crêtes continues
     avec leurs bifurcations et terminaisons naturelles,
   - squelettisation (Zhang-Suen) puis nombre de croisements sur CPU → les minuties
     marquées à l'écran sont réellement celles de l'empreinte affichée.
   Puis : appui sur le capteur en verre, balayage, repérage des minuties, validation en jaune.
   Un canvas WebGL (three.js) pour le capteur et l'empreinte, un canvas 2D pour l'interface. */
import * as THREE from 'three';

const N = 512;            // résolution de la synthèse
const LAM = 9.2;          // période des crêtes (px de synthèse)
const CYC = 5.2;          // durée d'un cycle (s)
const COL = { paper: [245, 241, 234], mist: [157, 180, 208], blue: [51, 95, 148], yellow: [249, 200, 59] };
const rgba = (c, a) => `rgba(${c[0]},${c[1]},${c[2]},${a})`;
const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const sm = (a, b, v) => { const t = clamp((v - a) / (b - a)); return t * t * (3 - 2 * t); };
const easeIO = t => { t = clamp(t); return t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; };
const easeO = t => 1 - Math.pow(1 - clamp(t), 3);
const rand = seed => () => (seed = (seed * 16807) % 2147483647) / 2147483647;

/* ---------- types d'empreintes : singularités (x, y, signe : +1 noyau / -1 delta) + rotation ---------- */
const FINGERS = [
  { seed: 7, rot: .10, sing: [[.04, .16, 1], [-.52, -.44, -1]], core: [.04, .16], delta: [-.52, -.44] },          // boucle droite
  { seed: 23, rot: -.05, sing: [[-.07, .17, 1], [.07, .04, 1], [-.56, -.40, -1], [.55, -.46, -1]], core: [0, .11], delta: [-.56, -.40] }, // verticille
  { seed: 41, rot: -.12, sing: [[-.05, .14, 1], [.50, -.46, -1]], core: [-.05, .14], delta: [.50, -.46] }         // boucle gauche
];

/* silhouette de la pulpe du doigt (coordonnées -1..1, y vers le haut) — partagée JS / GLSL */
const shape = (x, y) => { const qx = x / .70, qy = (y + .02) / .92, e = qy > 0 ? 2 : 2.8; return Math.pow(Math.abs(qx) ** e + Math.abs(qy) ** e, 1 / e); };
const GLSL_SHAPE = `float shape(vec2 p){ vec2 q=vec2(p.x/.70,(p.y+.02)/.92); float e=q.y>0.?2.:2.8; return pow(pow(abs(q.x),e)+pow(abs(q.y),e),1./e); }`;

const VERT = `varying vec2 vUv; void main(){ vUv=uv; gl_Position=vec4(position.xy,0.,1.); }`;

/* filtre de Gabor orienté, séparé en deux passes : à travers les crêtes (sinusoïde), puis le long (gaussienne) */
const SYNTH = `precision highp float;
uniform sampler2D src; uniform float dir, rot, lam, gain; uniform vec3 sing[4]; varying vec2 vUv;
const float NN=${N}.;
float theta(vec2 p){ float a=0.; for(int i=0;i<4;i++){ if(sing[i].z!=0.){ vec2 d=p-sing[i].xy; a+=sing[i].z*atan(d.y,d.x);} } return .5*a+rot; }
float S(vec2 uv){ return texture2D(src,uv).r*4.-2.; }
float S1(vec2 uv){ return texture2D(src,uv).r*2.-1.; }
void main(){
  vec2 p=vUv*2.-1.; float th=theta(p); vec2 t=vec2(cos(th),sin(th)), n=vec2(-t.y,t.x);
  float l=lam*(1.+.07*p.y-.05*dot(p,p));
  if(dir<.5){
    float gs=0., cs=0.;
    for(int i=-7;i<=7;i++){ float fi=float(i), g=exp(-fi*fi/(2.*3.2*3.2)); gs+=g; cs+=g*cos(6.2832*fi/l); }
    float c0=cs/gs, sum=0., nr=0.;
    for(int i=-7;i<=7;i++){ float fi=float(i), g=exp(-fi*fi/(2.*3.2*3.2)), c=cos(6.2832*fi/l), w=g*(c-c0); sum+=w*S1(vUv+n*fi/NN); nr+=w*c; }
    gl_FragColor=vec4(clamp(.5+.25*sum/nr,0.,1.),0.,0.,1.);
  } else {
    float sum=0., gs=0.;
    for(int i=-5;i<=5;i++){ float fi=float(i), g=exp(-fi*fi/(2.*2.6*2.6)); gs+=g; sum+=g*S(vUv+t*fi*1.3/NN); }
    gl_FragColor=vec4(.5+.5*tanh(gain*sum/gs),0.,0.,1.);
  }
}`;

/* rendu : capteur en verre, empreinte, balayage, validation */
const VIEW = `precision highp float;
uniform sampler2D tex; uniform vec2 res; uniform float dpr, R, press, scan, wave, fade, time, lit, mode, morph, focus, pupil, sweep;
uniform vec2 ctr, core, ptr; varying vec2 vUv;
${GLSL_SHAPE}
float h21(vec2 p){ p=fract(p*vec2(123.34,456.21)); p+=dot(p,p+45.32); return fract(p.x*p.y); }
vec2 h22(vec2 p){ float a=h21(p); return vec2(a,h21(p+a+3.1)); }
float vn(vec2 p){ vec2 i=floor(p), f=fract(p); f=f*f*(3.-2.*f); return mix(mix(h21(i),h21(i+vec2(1,0)),f.x),mix(h21(i+vec2(0,1)),h21(i+1.),f.x),f.y); }
float fbm(vec2 p){ return .55*vn(p)+.3*vn(p*2.1+7.)+.15*vn(p*4.3+3.); }
float sdBox(vec2 p, vec2 b, float r){ vec2 q=abs(p)-b+r; return length(max(q,0.))+min(max(q.x,q.y),0.)-r; }
// bruit périodique en x (pas de couture autour de l'iris)
float pvn(vec2 p, float per){ vec2 i=floor(p), f=fract(p); f=f*f*(3.-2.*f); float x0=mod(i.x,per), x1=mod(i.x+1.,per);
  return mix(mix(h21(vec2(x0,i.y)),h21(vec2(x1,i.y)),f.x),mix(h21(vec2(x0,i.y+1.)),h21(vec2(x1,i.y+1.)),f.x),f.y); }
/* iris en macro : fibres radiales, cryptes, collerette, hétérochromie centrale, anneau limbique */
vec3 irisCol(vec2 q){
  vec2 e=q-ptr*vec2(.05,-.05);
  float r=length(e), a=atan(e.y,e.x), ri=.62, rp=pupil;
  float u=(r-rp)/(ri-rp);
  float aa=a+(.010*sin(a*7.+u*5.)+.006*sin(a*19.-u*7.))*(.3+u);
  float x=aa/6.28318;
  // stries radiales longues (trabécules) + fibres fines ondulées
  float f1=pvn(vec2(x*64.,u*1.6),64.), f2=pvn(vec2(x*150.+f1*1.5,u*3.),150.), f3=pvn(vec2(x*340.,u*6.+f2*2.),340.);
  float fib=.38*f1+.37*f2+.25*f3;
  fib=smoothstep(.15,.85,fib);
  fib=mix(.5,fib,.25+.75*focus);
  float cry=smoothstep(.74,.86,pvn(vec2(x*44.,u*5.+3.),44.)*.8+.2*f2)*smoothstep(.34,.44,u)*smoothstep(.9,.62,u);
  float cr=.30+.03*sin(a*9.)+.02*sin(a*23.)+.06*(f1-.5);
  vec3 c=mix(vec3(.07,.13,.23),vec3(.56,.67,.82),fib);
  c=mix(c,vec3(.02,.04,.08),cry*.85*(.5+.5*focus));
  float inner=smoothstep(cr+.04,cr-.08,u);
  c=mix(c,mix(vec3(.26,.18,.08),vec3(.86,.62,.26),fib),inner*.72);
  c+=vec3(.70,.66,.58)*exp(-pow((u-cr)/.025,2.))*.22*(.4+.6*f2)*focus;
  c*=1.-.22*exp(-pow((u-.72-.012*sin(a*17.))/.014,2.))*(.4+.6*f1)-.15*exp(-pow((u-.84-.01*sin(a*11.))/.012,2.))*(.3+.7*f2);
  c*=mix(1.,.22,smoothstep(.8,1.,u));
  c*=.72+.4*smoothstep(.7,-.7,e.y);
  float pe=smoothstep(-.02,.025,u);
  float ruff=exp(-pow((u-.02)/.022,2.))*(.4+.6*pvn(vec2(x*90.,1.),90.));
  c=mix(vec3(.006,.012,.025),c,pe)+vec3(.55,.32,.10)*ruff*.45*pe*focus;
  // sclérotique dans l'ombre, minces vaisseaux
  float ves=smoothstep(.93,1.,pvn(vec2(x*16.,r*9.),16.))*.5;
  vec3 scl=vec3(.11,.15,.21)*(1.-.6*smoothstep(.7,.9,r))+vec3(.25,.08,.1)*ves*smoothstep(.66,.75,r)*.4;
  c=mix(c,scl,smoothstep(.985,1.05,u));
  return c;
}
void main(){
  vec2 fc=vec2(gl_FragCoord.x, res.y-gl_FragCoord.y)/dpr;
  vec2 q=(fc-ctr)/R; q.y=-q.y;
  float px=1./R;                                   // un pixel CSS en unités R
  float sd=sdBox(q, mix(vec2(.86,1.02),vec2(.9,.9),morph), mix(.17,.9,morph));
  vec3 col=vec3(0.); float a=0.;
  // halo du capteur
  float halo=exp(-max(sd,0.)*7.)*(.07+.09*lit);
  col+=vec3(.20,.37,.58)*halo; a+=halo*.9;
  if(sd<0.){
    float ins=-sd;
    // verre : bleu nuit éclairé par la tranche
    vec3 g=mix(vec3(.050,.110,.185), vec3(.075,.160,.255), smoothstep(1.1,-1.1,q.y));
    g+=vec3(.20,.37,.58)*exp(-ins*10.)*.22;
    g+=vec3(.62,.71,.82)*exp(-ins*40.)*.10;
    // trame du capteur
    vec2 cell=fract(fc/3.);
    g+=vec3(.6,.7,.82)*.018*step(.66,cell.x)*step(.66,cell.y);
    // reflet diagonal qui suit le pointeur
    float rf=q.x*.62+q.y+.55-ptr.x*.5+ptr.y*.3;
    g+=vec3(.75,.82,.92)*(exp(-rf*rf*28.)*.05+exp(-pow(rf-.32,2.)*160.)*.03);
    col=g; a=1.;

    if(mode>.5){
      // ---- iris ----
      vec3 ic=irisCol(q);
      vec2 e=q-ptr*vec2(.05,-.05); float r=length(e);
      float ang=atan(e.x,e.y); if(ang<0.) ang+=6.28318;
      float da=sweep*6.28318-ang;
      float inI=smoothstep(.64,.6,r)*smoothstep(pupil-.01,pupil+.02,r);
      float wash=sweep>0.&&sweep<1.?step(0.,da)*exp(-da*1.6)*.35:0.;
      ic+=vec3(.42,.62,.95)*wash*inI;
      ic+=vec3(.8,.9,1.)*exp(-da*da/.0009)*step(0.,sweep)*step(sweep,.999)*smoothstep(.85,.6,r)*smoothstep(pupil,pupil+.03,r)*.6;
      float front=wave*1.1, rr=(r-pupil)/(.62-pupil);
      ic=mix(ic,ic*vec3(1.12,.98,.6)+vec3(.04,.025,0.),smoothstep(front,front-.25,rr)*inI*.4);
      ic+=vec3(.98,.78,.23)*exp(-pow((rr-front)*7.,2.))*step(.001,wave)*(1.-smoothstep(.8,1.,wave))*inI*.4;
      // reflets cornéens : couronne de LED du capteur + dôme
      vec2 sc0=vec2(-.13,.16)+ptr*vec2(.10,-.10); float sp=0.;
      for(int k=0;k<10;k++){ float t=float(k)*.62832; vec2 d=q-sc0-.15*vec2(cos(t),sin(t)); sp+=exp(-dot(d,d)/.00009); }
      sp+=exp(-dot((q-vec2(.3,-.28)-ptr*.06)/vec2(.05,.035),(q-vec2(.3,-.28)-ptr*.06)/vec2(.05,.035)))*.25;
      sp+=exp(-pow(length(q-vec2(-.22,.3)-ptr*.08)/.32,2.))*.07;
      ic+=vec3(.9,.95,1.)*sp*(.4+.6*focus)*(1.+lit*.6);
      float vign=smoothstep(.95,.55,r);
      col=mix(col,ic,fade*vign);
    } else {
    // ---- empreinte ----
    vec2 uv=q*.5+.5;
    vec4 tx=texture2D(tex,uv);
    float s=tx.r*2.-1., sk=tx.g;
    float d=shape(q);
    float nz=fbm(q*5.+3.);
    float cr=press*1.08;
    float contact=smoothstep(cr, cr-.28, d+.16*(nz-.5));
    float pres=contact*smoothstep(1.02,.55,d);                // pression : plus forte au centre
    float thr=mix(.95,-.25,pres);
    float ridge=smoothstep(thr,thr+.38,s)*contact;
    // pores de sudation sur les crêtes
    vec2 pc=uv*${N}./(${LAM}*1.05); vec2 pi=floor(pc), pf=fract(pc);
    vec2 pp=h22(pi)*.6+.2; float pore=smoothstep(.17,.09,length(pf-pp))*step(.45,h21(pi+9.));
    ridge*=1.-.75*pore*smoothstep(.2,.8,s);
    // grain de la peau et encrage irrégulier
    ridge*=.62+.38*fbm(uv*46.)+.0*nz;
    // creases (plis) fins
    float cz=abs(q.y+.48+.06*sin(q.x*3.)-.05*q.x); ridge*=mix(.25,1.,smoothstep(.0,.018,cz));
    float cz2=abs(q.x*.35+q.y-.42+.04*sin(q.x*7.)); ridge*=mix(.5,1.,max(smoothstep(.0,.014,cz2),smoothstep(.12,.32,abs(q.x-.12))));

    float scanned=smoothstep(scan-.012,scan+.02,q.y);
    float band=scanned*smoothstep(.34,.0,q.y-scan);
    float dens=texture2D(tex,uv,4.).r;                           // densité locale (mip) pour la lueur
    float wd=length(q-core), front=wave*2.4;
    float valid=smoothstep(front,front-.35,wd);
    vec3 rc=mix(vec3(.96,.945,.92), vec3(.98,.80,.25), valid*.72);
    // latent (avant balayage) : faible, bleuté
    col+=vec3(.55,.66,.80)*ridge*.20*(1.-scanned)*fade;
    // balayé : crêtes nettes et lumineuses
    col+=rc*ridge*.82*scanned*(1.-band*.55)*fade;
    col+=mix(vec3(.2,.37,.58),vec3(.98,.78,.23),valid)*contact*.10*scanned*fade*(.6+.4*dens);
    // bande de traitement : squelette des crêtes juste derrière la ligne
    col+=vec3(.55,.75,1.)*sk*band*contact*1.1*fade;
    // front de validation
    float ring=exp(-pow((wd-front)*9.,2.))*step(.001,wave)*(1.-smoothstep(.85,1.,wave));
    col+=vec3(.98,.78,.23)*(ridge*1.2+contact*.18)*ring*fade;
    // ligne de balayage
    if(scan>-1.2 && scan<1.2){
      float dy=(q.y-scan)/px;
      float ln=exp(-dy*dy/1.6);
      float gl=exp(-abs(q.y-scan)*16.)*.30+exp(-max(q.y-scan,0.)*5.)*step(scan,q.y)*.07;
      float edge=smoothstep(0.,.08,ins);
      col+=(vec3(.85,.92,1.)*ln*.9+vec3(.32,.52,.80)*gl)*edge;
    }
    }
  }
  // liseré du verre
  float rim=exp(-pow(sd/(1.1*px),2.));
  float top=.35+.65*smoothstep(-.5,1.,q.y-q.x*.3);
  col+=vec3(.70,.78,.88)*rim*(.20+.25*top+.25*lit); a=max(a,rim*.6);
  gl_FragColor=vec4(col*a+col*(1.-a)*0., a);
}`;

/* ---------- squelette + minuties (CPU) ---------- */
function minutiae(buf, finger) {
  const B = new Uint8Array(N * N);
  for (let i = 0; i < N * N; i++) B[i] = buf[i * 4] > 140 ? 1 : 0;
  // Zhang-Suen
  const idx = (x, y) => y * N + x;
  let changed = true, it = 0; const del = [];
  while (changed && it++ < 30) {
    changed = false;
    for (let pass = 0; pass < 2; pass++) {
      del.length = 0;
      for (let y = 1; y < N - 1; y++) for (let x = 1; x < N - 1; x++) {
        if (!B[idx(x, y)]) continue;
        const p2 = B[idx(x, y - 1)], p3 = B[idx(x + 1, y - 1)], p4 = B[idx(x + 1, y)], p5 = B[idx(x + 1, y + 1)], p6 = B[idx(x, y + 1)], p7 = B[idx(x - 1, y + 1)], p8 = B[idx(x - 1, y)], p9 = B[idx(x - 1, y - 1)];
        const b = p2 + p3 + p4 + p5 + p6 + p7 + p8 + p9; if (b < 2 || b > 6) continue;
        const A = (!p2 && p3) + (!p3 && p4) + (!p4 && p5) + (!p5 && p6) + (!p6 && p7) + (!p7 && p8) + (!p8 && p9) + (!p9 && p2);
        if (A !== 1) continue;
        if (pass === 0 ? (p2 * p4 * p6 || p4 * p6 * p8) : (p2 * p4 * p8 || p2 * p6 * p8)) continue;
        del.push(idx(x, y));
      }
      if (del.length) { changed = true; for (const k of del) B[k] = 0; }
    }
  }
  const pts = [];
  const nb = [[0, -1], [1, -1], [1, 0], [1, 1], [0, 1], [-1, 1], [-1, 0], [-1, -1]];
  for (let y = 2; y < N - 2; y++) for (let x = 2; x < N - 2; x++) {
    if (!B[idx(x, y)]) continue;
    const px = x / N * 2 - 1, py = 1 - y / N * 2;    // y du tampon : ligne 0 = bas de la texture → retourné plus bas
    let cn = 0; for (let k = 0; k < 8; k++) cn += Math.abs(B[idx(x + nb[k][0], y + nb[k][1])] - B[idx(x + nb[(k + 1) % 8][0], y + nb[(k + 1) % 8][1])]);
    cn /= 2;
    if (cn === 1 || cn === 3) pts.push({ x, y, type: cn === 1 ? 0 : 1 });
  }
  // texture : y=0 en bas → coordonnées print (y vers le haut) = y/N*2-1
  const out = [];
  for (const m of pts) {
    m.px = m.x / N * 2 - 1; m.py = m.y / N * 2 - 1;
    if (shape(m.px, m.py) > .74) continue;
    // à l'écart des singularités (zones peu fiables)
    if (finger.sing.some(([sx, sy]) => Math.hypot(m.px - sx, m.py - sy) < .07)) continue;
    out.push(m);
  }
  // minuties parasites : trop proches l'une de l'autre → on retire les deux
  const minD = LAM * 1.1;
  const keep = out.filter(a => !out.some(b => b !== a && Math.hypot(a.x - b.x, a.y - b.y) < minD));
  // direction : on remonte le squelette depuis la terminaison
  for (const m of keep) {
    if (m.type === 0) {
      let x = m.x, y = m.y, px = -1, py = -1;
      for (let s = 0; s < 7; s++) {
        let moved = false;
        for (const [dx, dy] of nb) { const nx = x + dx, ny = y + dy; if ((nx !== px || ny !== py) && !(nx === m.x && ny === m.y && s) && B[idx(nx, ny)] && !(nx === px && ny === py)) { px = x; py = y; x = nx; y = ny; moved = true; break; } }
        if (!moved) break;
      }
      m.a = Math.atan2(-(m.y - y), m.x - x);   // vers l'extérieur de la crête, repère écran (y vers le bas)
    } else {
      let a = 0; for (const [sx, sy, sg] of finger.sing) a += sg * Math.atan2(m.py - sy, m.px - sx);
      m.a = -(a * .5 + finger.rot);
    }
  }
  // sélection régulière (distance minimale), ordre reproductible
  const R = rand(finger.seed * 7 + 1); keep.sort(() => R() - .5);
  const sel = [];
  for (const m of keep) { if (sel.length >= 30) break; if (sel.every(o => Math.hypot(o.x - m.x, o.y - m.y) > LAM * 3.4)) sel.push(m); }
  // liaisons : chaque minutie vers ses 2 voisines les plus proches
  const edges = new Set();
  sel.forEach((m, i) => {
    sel.map((o, j) => [j, Math.hypot(o.px - m.px, o.py - m.py)]).filter(([j]) => j !== i).sort((a, b) => a[1] - b[1]).slice(0, 2)
      .forEach(([j]) => edges.add(i < j ? i + '-' + j : j + '-' + i));
  });
  return { list: sel, edges: [...edges].map(e => e.split('-').map(Number)), skel: B };
}

export async function mount(layer, { reduceMotion }) {
  const gl = document.createElement('canvas'), hud = document.createElement('canvas');
  layer.append(gl, hud);
  const ctx = hud.getContext('2d');
  const renderer = new THREE.WebGLRenderer({ canvas: gl, alpha: true, antialias: false, premultipliedAlpha: true, powerPreference: 'low-power' });
  renderer.setClearColor(0, 0);
  const cam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2));
  const scene = new THREE.Scene(); scene.add(quad);

  /* ---- synthèse d'une empreinte ---- */
  const synthMat = new THREE.ShaderMaterial({ vertexShader: VERT, fragmentShader: SYNTH, uniforms: { src: { value: null }, dir: { value: 0 }, rot: { value: 0 }, lam: { value: LAM }, gain: { value: 2.6 }, sing: { value: [0, 1, 2, 3].map(() => new THREE.Vector3()) } } });
  const mkRT = () => new THREE.WebGLRenderTarget(N, N, { minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter, depthBuffer: false, wrapS: THREE.ClampToEdgeWrapping, wrapT: THREE.ClampToEdgeWrapping });
  const prints = [];
  function synth(fi) {
    const f = FINGERS[fi], R = rand(f.seed * 131 + 17);
    const noise = new Uint8Array(N * N * 4);
    for (let i = 0; i < N * N; i++) noise[i * 4] = 128 + (R() - .5) * 90 | 0;
    const init = new THREE.DataTexture(noise, N, N); init.minFilter = init.magFilter = THREE.LinearFilter; init.needsUpdate = true;
    const A = mkRT(), Bt = mkRT();
    f.sing.forEach((s, i) => synthMat.uniforms.sing.value[i].set(s[0], s[1], s[2]));
    for (let i = f.sing.length; i < 4; i++) synthMat.uniforms.sing.value[i].set(0, 0, 0);
    synthMat.uniforms.rot.value = f.rot;
    quad.material = synthMat;
    let src = init;
    for (let k = 0; k < 22; k++) {
      synthMat.uniforms.src.value = src; synthMat.uniforms.dir.value = 0; renderer.setRenderTarget(Bt); renderer.render(scene, cam);
      synthMat.uniforms.src.value = Bt.texture; synthMat.uniforms.dir.value = 1; renderer.setRenderTarget(A); renderer.render(scene, cam);
      src = A.texture;
    }
    const buf = new Uint8Array(N * N * 4);
    renderer.readRenderTargetPixels(A, 0, 0, N, N, buf);
    renderer.setRenderTarget(null);
    A.dispose(); Bt.dispose(); init.dispose();
    const mz = minutiae(buf, f);
    for (let i = 0; i < N * N; i++) { buf[i * 4 + 1] = mz.skel[i] * 255; buf[i * 4 + 3] = 255; }
    const tex = new THREE.DataTexture(buf, N, N);
    tex.minFilter = THREE.LinearMipmapLinearFilter; tex.magFilter = THREE.LinearFilter; tex.generateMipmaps = true; tex.needsUpdate = true;
    prints[fi] = { tex, mz, f };
  }
  synth(0);

  const view = new THREE.ShaderMaterial({
    vertexShader: VERT, fragmentShader: VIEW, transparent: true,
    uniforms: Object.fromEntries(Object.entries({ tex: prints[0].tex, res: new THREE.Vector2(), dpr: 1, R: 100, ctr: new THREE.Vector2(), core: new THREE.Vector2(), ptr: new THREE.Vector2(), press: 0, scan: 9, wave: 0, fade: 1, time: 0, lit: 0, mode: 0, morph: 0, focus: 1, pupil: .24, sweep: -1 }).map(([k, v]) => [k, { value: v }]))
  });
  const U = view.uniforms;

  let w = 0, h = 0, dpr = 1;
  let cur = 0, cyc = 0, clock = 0, on = false, raf = 0, last = 0, pausedAt = -1e9, mx = 0, my = 0, tmx = 0, tmy = 0;
  const resize = () => {
    w = layer.clientWidth; h = layer.clientHeight; dpr = Math.min(devicePixelRatio || 1, 2);
    if (!w || !h) return;
    renderer.setPixelRatio(dpr); renderer.setSize(w, h, false);
    hud.width = w * dpr; hud.height = h * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    U.res.value.set(w * dpr, h * dpr); U.dpr.value = dpr;
    if (!on) draw(reduceMotion ? 3.9 : clock);
  };

  /* ---- interface 2D ---- */
  const L = () => { const S = Math.min(w, h), R = S * .385; return { S, R, cx: w / 2 + mx * 5, cy: h / 2 + my * 4 }; };
  const toScr = (l, x, y) => [l.cx + x * l.R, l.cy - y * l.R];
  const mixC = (a, b, k) => a.map((v, i) => Math.round(v + (b[i] - v) * k));

  // cadre commun : viseur, petits chiffres, jauge, validation
  function frameHud(t, l, { vd, left, score, prog, fade }) {
    const R = l.R, k = Math.max(.75, R / 210);
    const hx = .9 * R + 12 * k, hy = (1.02 + (.9 - 1.02) * U.morph.value) * R + 12 * k, Lc = 16 * k;
    ctx.lineWidth = 1.5;
    ctx.strokeStyle = rgba(mixC(COL.mist, COL.yellow, vd), (.5 + .45 * vd) * Math.max(fade, .5));
    for (const [dx, dy] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
      const x0 = l.cx + dx * hx, y0 = l.cy + dy * hy;
      ctx.beginPath(); ctx.moveTo(x0, y0 - dy * Lc); ctx.lineTo(x0, y0); ctx.lineTo(x0 - dx * Lc, y0); ctx.stroke();
    }
    const ty = l.cy + hy + 14 * k, fs = Math.round(9.5 * k + 1);
    ctx.font = `600 ${fs}px ui-monospace, "SF Mono", Menlo, Consolas, monospace`;
    ctx.textBaseline = 'middle';
    // rangée alignée à droite (le grand numéro de la scène occupe le coin bas gauche)
    const badge = 22 * k, gap = 12 * k;
    const scTxt = (score * 99.7).toFixed(1).padStart(4, '0');
    const xs = l.cx + hx - badge, wS = ctx.measureText(scTxt).width, wL = ctx.measureText(left).width;
    ctx.textAlign = 'right'; ctx.fillStyle = vd > .01 ? rgba(COL.yellow, .9 * fade) : rgba(COL.mist, .6 * Math.max(fade, .4));
    ctx.fillText(scTxt, xs, ty);
    ctx.fillStyle = rgba(COL.mist, .6 * Math.max(fade, .4));
    ctx.fillText(left, xs - wS - gap, ty);
    const gx = l.cx - .2 * R, gw = Math.max(10, xs - wS - wL - 2 * gap - gx);
    ctx.fillStyle = rgba(COL.mist, .16); ctx.fillRect(gx, ty - .5, gw, 1);
    ctx.fillStyle = vd > .01 ? rgba(COL.yellow, .9 * fade) : rgba(COL.paper, .7 * fade);
    ctx.fillRect(gx, ty - .5, gw * clamp(prog), 1);
    if (vd > .01) {
      const ox = l.cx + hx - 6 * k, rr = 9 * k * easeO(vd * 1.4);
      ctx.fillStyle = rgba(COL.yellow, fade); ctx.beginPath(); ctx.arc(ox, ty, rr, 0, 7); ctx.fill();
      const q = easeO(vd * 1.6 - .5);
      if (q > 0) {
        ctx.strokeStyle = `rgba(11,27,46,${fade})`; ctx.lineWidth = 1.8 * k; ctx.lineJoin = 'round';
        ctx.beginPath(); ctx.moveTo(ox - 4 * k, ty); ctx.lineTo(ox - 1.2 * k, ty + 3 * k);
        ctx.lineTo(ox - 1.2 * k + 5.6 * k * q, ty + 3 * k - 6.5 * k * q); ctx.stroke();
      }
    }
  }

  function printHud(t, l, P) {
    const { list, edges } = P.mz;
    const scanY = U.scan.value, fade = U.fade.value, R = l.R;
    const k = Math.max(.75, R / 210);
    const appear = m => clamp((scanY < m.py ? 1 : 0) * (t - m.t0) / .28);
    // passage du balayage : instant de détection de chaque minutie
    for (const m of list) if (m.t0 === undefined && scanY < m.py - .02) m.t0 = t;
    const matchT = m => 2.55 + m.rank * .022;
    ctx.lineCap = 'round';
    // liaisons
    for (const [i, j] of edges) {
      const a = list[i], b = list[j]; if (a.t0 === undefined || b.t0 === undefined) continue;
      const q = clamp((t - Math.max(a.t0, b.t0) - .1) / .35); if (q <= 0) continue;
      const [ax, ay] = toScr(l, a.px, a.py), [bx, by] = toScr(l, b.px, b.py);
      const y1 = clamp((t - Math.max(matchT(a), matchT(b))) / .2);
      ctx.strokeStyle = y1 > 0 ? rgba(COL.yellow, (.18 + .32 * y1) * fade) : rgba(COL.mist, .32 * fade);
      ctx.lineWidth = .8;
      ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(ax + (bx - ax) * easeO(q), ay + (by - ay) * easeO(q)); ctx.stroke();
    }
    // marqueurs
    for (const m of list) {
      if (m.t0 === undefined) continue;
      const q = easeO((t - m.t0) / .3), [x, y] = toScr(l, m.px, m.py);
      const yl = clamp((t - matchT(m)) / .18);
      const c = yl > 0 ? COL.yellow : COL.paper, al = fade * Math.min(1, q * 1.4);
      const sc = 1 + (1 - q) * 1.6, r = 3.6 * k * sc;
      ctx.strokeStyle = rgba(c, .95 * al); ctx.lineWidth = 1.3;
      if (yl > 0) { ctx.fillStyle = rgba(COL.yellow, .22 * al); }
      ctx.beginPath();
      if (m.type === 0) ctx.arc(x, y, r, 0, 7); else ctx.rect(x - r, y - r, r * 2, r * 2);
      if (yl > 0) ctx.fill();
      ctx.stroke();
      ctx.beginPath(); ctx.moveTo(x + Math.cos(m.a) * r, y + Math.sin(m.a) * r); ctx.lineTo(x + Math.cos(m.a) * (r + 8 * k), y + Math.sin(m.a) * (r + 8 * k)); ctx.stroke();
      // onde à l'apparition
      const rp = clamp((t - m.t0) / .5);
      if (rp < 1) { ctx.strokeStyle = rgba(COL.mist, (1 - rp) * .5 * fade); ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(x, y, r + rp * 14 * k, 0, 7); ctx.stroke(); }
      if (yl > 0 && yl < 1) { ctx.strokeStyle = rgba(COL.yellow, (1 - yl) * .8 * fade); ctx.beginPath(); ctx.arc(x, y, r + yl * 9 * k, 0, 7); ctx.stroke(); }
    }
    // noyau et delta (convention dactyloscopique : cercle et triangle)
    const sing = (p, tri) => {
      const [x, y] = toScr(l, p[0], p[1]); if (scanY > p[1] - .02) return;
      const q = easeO(clamp((t - .6 - (1 - p[1]) * .9) / .4)); if (q <= 0) return;
      const vd = clamp((t - 2.9) / .3), c = vd > 0 ? COL.yellow : COL.mist, r = 7 * k;
      ctx.strokeStyle = rgba(c, .85 * fade * q); ctx.lineWidth = 1.2; ctx.setLineDash([2.5, 2.5]);
      ctx.beginPath();
      if (tri) { ctx.moveTo(x, y - r * 1.1); ctx.lineTo(x + r, y + r * .7); ctx.lineTo(x - r, y + r * .7); ctx.closePath(); }
      else ctx.arc(x, y, r * (1 + (1 - q)), 0, 7);
      ctx.stroke(); ctx.setLineDash([]);
    };
    sing(P.f.core, false); sing(P.f.delta, true);

    const found = list.filter(m => m.t0 !== undefined).length;
    const sc = t < 2.55 ? 0 : Math.min(1, (t - 2.55) / .6);
    frameHud(t, l, { vd: clamp((t - 3.05) / .45), left: String(found).padStart(2, '0') + ' / ' + String(list.length).padStart(2, '0'), score: sc, prog: Math.max((1 - scanY) / 2 * .7, sc * .3 + .7 * (sc > 0)), fade });
  }

  /* ---- iris : segmentation, balayage angulaire, code d'iris en couronne ---- */
  const IR = rand(1999), BITS = 72, bits = [0, 1].map(() => Array.from({ length: BITS }, () => IR() > .5 ? 1 : 0));
  const HEX = Array.from({ length: 8 }, () => '0123456789ABCDEF'[IR() * 16 | 0]).join('');
  function irisHud(t, l) {
    const R = l.R, k = Math.max(.75, R / 210), fade = U.fade.value, sw = U.sweep.value;
    const ex = l.cx + mx * .05 * R, ey = l.cy + my * .05 * R;     // l'iris suit la parallaxe du shader
    const seg = easeO((t - .75) / .45), vt = (t - 3.0) / .45, vd = easeO(vt);
    if (seg > 0) {
      const a = seg * fade;
      ctx.lineWidth = 1; ctx.strokeStyle = rgba(vd > 0 ? mixC(COL.mist, COL.yellow, vd) : COL.mist, .55 * a);
      ctx.setLineDash([3, 4]); ctx.beginPath(); ctx.arc(ex, ey, U.pupil.value * R * (1 + (1 - seg) * .6), 0, 7); ctx.stroke(); ctx.setLineDash([]);
      ctx.strokeStyle = rgba(vd > 0 ? mixC(COL.mist, COL.yellow, vd) : COL.paper, .5 * a);
      ctx.beginPath(); ctx.arc(ex, ey, .625 * R * (1 + (1 - seg) * .18), 0, 7); ctx.stroke();
      // réticule
      ctx.strokeStyle = rgba(COL.mist, .5 * a); const c = 5 * k;
      ctx.beginPath(); ctx.moveTo(ex - c, ey); ctx.lineTo(ex + c, ey); ctx.moveTo(ex, ey - c); ctx.lineTo(ex, ey + c); ctx.stroke();
      // repères cardinaux sur le limbe
      for (let i = 0; i < 4; i++) { const an = i * Math.PI / 2, r0 = .625 * R; ctx.beginPath(); ctx.moveTo(ex + Math.sin(an) * (r0 - 5 * k), ey - Math.cos(an) * (r0 - 5 * k)); ctx.lineTo(ex + Math.sin(an) * (r0 + 5 * k), ey - Math.cos(an) * (r0 + 5 * k)); ctx.stroke(); }
    }
    // couronne du code d'iris
    const step = Math.PI * 2 / BITS;
    for (let row = 0; row < 2; row++) {
      const rr = (.705 + row * .06) * R;
      for (let i = 0; i < BITS; i++) {
        const a0 = i * step, rev = sw >= 1 ? 1 : clamp((sw * Math.PI * 2 - a0) / .35);
        if (rev <= 0) continue;
        const yl = clamp((t - 3.0 - (i / BITS) * .35 - row * .05) / .15);
        const c = yl > 0 ? mixC(COL.paper, COL.yellow, yl) : COL.paper, b = bits[row][i];
        ctx.strokeStyle = rgba(c, (b ? .85 : .2) * rev * fade);
        ctx.lineWidth = b ? 3.4 * k : 1.2 * k;
        ctx.beginPath(); ctx.arc(ex, ey, rr, a0 + .02 - Math.PI / 2, a0 + step - .02 - Math.PI / 2); ctx.stroke();
      }
    }
    // rayon de balayage
    if (sw > 0 && sw < 1) {
      const an = sw * Math.PI * 2;
      ctx.strokeStyle = rgba(COL.paper, .8 * fade); ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(ex + Math.sin(an) * U.pupil.value * R, ey - Math.cos(an) * U.pupil.value * R); ctx.lineTo(ex + Math.sin(an) * .8 * R, ey - Math.cos(an) * .8 * R); ctx.stroke();
      ctx.fillStyle = rgba(COL.paper, fade); ctx.beginPath(); ctx.arc(ex + Math.sin(an) * .8 * R, ey - Math.cos(an) * .8 * R, 2 * k, 0, 7); ctx.fill();
    }
    const n = Math.round(clamp(sw) * 8);
    frameHud(t, l, { vd: clamp(vt), left: HEX.slice(0, n).padEnd(8, '·'), score: t < 2.95 ? 0 : clamp((t - 2.95) / .5), prog: sw < 0 ? 0 : clamp(sw) * .8 + (t > 2.95 ? .2 : 0), fade });
  }

  function draw(t) {
    if (!w || !h) return;
    const P = prints[cur]; if (!P) return;
    const l = L(), iris = cyc % 2 === 1;
    quad.material = view;
    U.tex.value = P.tex; U.R.value = l.R; U.ctr.value.set(l.cx, l.cy); U.core.value.set(P.f.core[0], P.f.core[1]);
    U.ptr.value.set(mx, my); U.time.value = t; U.mode.value = iris ? 1 : 0;
    U.fade.value = 1 - easeIO((t - 4.6) / .5);
    if (iris) {
      U.morph.value = easeIO(t / .8);
      U.focus.value = easeO((t - .15) / .75);
      U.fade.value *= easeO(t / .5);
      U.pupil.value = .25 - .06 * easeO((t - .85) / .7) + .012 * easeIO((t - 3.4) / 1.2) + .003 * Math.sin(t * 2.7);
      U.sweep.value = t < 1.1 ? -1 : t > 2.9 ? 1 : easeIO((t - 1.1) / 1.8);
      U.wave.value = clamp((t - 2.95) / .8);
      U.lit.value = Math.max(Math.exp(-Math.pow((t - .85) / .12, 2)) * 1.4, Math.sin(clamp((t - 3) / 1.6) * Math.PI) * .8);
      U.scan.value = 9;
    } else {
      U.morph.value = cyc > 0 ? 1 - easeIO(t / .8) : 0;
      U.press.value = easeO((t - (cyc > 0 ? .35 : 0)) / .9) * (1 - easeIO((t - 4.55) / .55));
      U.scan.value = t < .45 ? 1.25 : t > 2.5 ? -9 : 1.06 - 2.12 * easeIO((t - .45) / 2.05);
      U.wave.value = clamp((t - 2.95) / .9);
      U.lit.value = Math.sin(clamp((t - 3) / 1.6) * Math.PI) * .8;
      U.focus.value = 1; U.sweep.value = -1;
    }
    renderer.render(scene, cam);
    ctx.clearRect(0, 0, w, h);
    if (iris) irisHud(t, l); else printHud(t, l, P);
  }

  function next() {
    cyc++;
    if (cyc % 2 === 0) { const n = (cur + 1) % FINGERS.length; if (!prints[n]) synth(n); cur = n; }
    reset();
  }
  // rangs de validation (du noyau vers l'extérieur)
  const reset = () => { const P = prints[cur], c = P.f.core; P.mz.list.forEach(m => m.t0 = undefined); P.mz.list.slice().sort((a, b) => Math.hypot(a.px - c[0], a.py - c[1]) - Math.hypot(b.px - c[0], b.py - c[1])).forEach((m, i) => m.rank = i); };
  reset();

  const frame = now => {
    raf = 0; if (!on) return;
    const dt = Math.min(.05, (now - last) / 1000); last = now;
    clock += dt;
    if (clock >= CYC) { clock -= CYC; next(); }
    mx += (tmx - mx) * .06; my += (tmy - my) * .06;
    draw(clock);
    raf = requestAnimationFrame(frame);
  };

  new ResizeObserver(resize).observe(layer);
  resize();
  if (reduceMotion) {
    // image fixe : empreinte identifiée, toutes les minuties marquées
    for (const m of prints[0].mz.list) m.t0 = 0;
    draw(3.9);
  } else {
    // préparation des autres empreintes au calme
    const idle = window.requestIdleCallback || (f => setTimeout(f, 200));
    idle(() => { if (!prints[1]) synth(1); idle(() => { if (!prints[2]) synth(2); }); });
  }

  return {
    play() {
      if (reduceMotion || on) return;
      if (performance.now() - pausedAt > 1200) {
        // nouvelle visite : on repart d'une empreinte (la suivante si elle est prête)
        if (cyc > 0 || clock > 0) { const n = (cur + 1) % FINGERS.length; if (prints[n]) cur = n; }
        cyc = 0; clock = 0; reset();
      }
      on = true; last = performance.now(); if (!raf) raf = requestAnimationFrame(frame);
    },
    pause() { on = false; pausedAt = performance.now(); if (raf) cancelAnimationFrame(raf); raf = 0; },
    pointer(px, py) { tmx = px; tmy = py; }
  };
}
