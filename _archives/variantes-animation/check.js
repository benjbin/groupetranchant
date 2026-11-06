for (let i = 0; i < 60 && !window.__croupier; i++) await new Promise(r => setTimeout(r, 500)); if (!window.__croupier) throw new Error("pas de hook " + location.href + " " + document.querySelectorAll("script").length);
const R = 1.9, CT = .34, B = .03, EPS = +(window.__eps || .004), STEP = .002;
const nrm = v => { const l = Math.hypot(...v); return [v.map(x => x / l), l]; };
const cyl = (e, hero) => {
  const [a, sa] = nrm(hero ? [e[8], e[9], e[10]] : [e[4], e[5], e[6]]), [u] = nrm([e[0], e[1], e[2]]), [v] = nrm(hero ? [e[4], e[5], e[6]] : [e[8], e[9], e[10]]);
  return { c: [e[12], e[13], e[14]], a, u, v, r: R * sa, h: CT * sa / 2, b: B * sa, hero };
};
const pts = C => { const out = [], N = C.hero ? 120 : 40;
  const add = (hh, rr, n) => { for (let i = 0; i < n; i++) { const t = i / n * 2 * Math.PI, cs = Math.cos(t) * rr, sn = Math.sin(t) * rr; out.push([0, 1, 2].map(k => C.c[k] + C.a[k] * hh + C.u[k] * cs + C.v[k] * sn)); } };
  [-1, 1].forEach(s => { add(s * C.h, C.r - C.b, N); add(s * (C.h - C.b * .3), C.r - C.b * .3, N); [.25, .5, .75].forEach(f => add(s * C.h, C.r * f, Math.round(N * f))); out.push(C.c.map((x, k) => x + C.a[k] * s * C.h)); });
  add(0, C.r, N); return out; };
const inside = (p, C) => { const d = p.map((x, k) => x - C.c[k]), y = d[0] * C.a[0] + d[1] * C.a[1] + d[2] * C.a[2];
  if (Math.abs(y) >= C.h - EPS) return 0; const rad = Math.hypot(d[0] - C.a[0] * y, d[1] - C.a[1] * y, d[2] - C.a[2] * y);
  return rad < C.r - EPS ? Math.min(C.h - Math.abs(y), C.r - rad) : 0; };
const hits = [], floor = []; let pairs = 0;
{ const A = cyl([.42,0,0,0, 0,.42,0,0, 0,0,.42,0, 0,.07,0,1]), Bt = cyl([.42,0,0,0, 0,.42,0,0, 0,0,.42,0, .3,.13,0,1]), Ct = cyl([.42,0,0,0, 0,.42,0,0, 0,0,.42,0, .3,.2128,0,1]);
  window.__self = [Math.max(...pts(Bt).map(q => inside(q, A))), Math.max(...pts(Ct).map(q => inside(q, A)))]; }
for (let p = 0; p <= 1.0001; p += STEP) {
  const s = window.__intro ? window.__croupier(0, Math.min(p, 1)) : window.__croupier(Math.min(p, 1)), cs = [...s.fiches.map(e => cyl(e)), cyl(s.hero, true)], ps = cs.map(pts);
  cs.forEach((C, i) => { const m = Math.min(...ps[i].map(q => q[1])); if (m < -EPS) floor.push([+p.toFixed(3), i, +m.toFixed(4)]); });
  for (let i = 0; i < cs.length; i++) for (let j = i + 1; j < cs.length; j++) {
    const A = cs[i], Bc = cs[j], d = Math.hypot(...A.c.map((x, k) => x - Bc.c[k]));
    if (d > Math.hypot(A.r, A.h) + Math.hypot(Bc.r, Bc.h)) continue; pairs++;
    let dep = 0; ps[j].forEach(q => dep = Math.max(dep, inside(q, A))); ps[i].forEach(q => dep = Math.max(dep, inside(q, Bc)));
    if (dep > 0) hits.push([+p.toFixed(3), i, j === cs.length - 1 ? 'H' : j, +dep.toFixed(4)]);
  }
}
console.error(JSON.stringify({ self: window.__self, n: Math.round(1 / STEP) + 1, close: pairs, overlaps: hits.length, floor: floor.length, worst: hits.sort((a, b) => b[3] - a[3]).slice(0, 25), floorS: floor.slice(0, 10) }));
