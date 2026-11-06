/* Contact : les phares continuent de filer sur l'avenue de la photo.
   Un calque canvas, calé sur la photo (mêmes cadrage et mouvement), fait partir des traînées blanches et dorées
   depuis l'Arc vers le spectateur à gauche, et des feux rouges qui s'éloignent à droite. Décor seul, aria-hidden. */
const IW = 2400, IH = 1350, VX = 1180, VY = 650; // taille de la photo et point de fuite (pied de l'Arc)
const rnd = (a, b) => a + Math.random() * (b - a);

export function mountCx(root) {
  const ph = root.querySelector('.cx-ph'), img = ph?.querySelector('img');
  if (!ph || !img) return;
  const cv = document.createElement('canvas');
  cv.setAttribute('aria-hidden', 'true');
  ph.appendChild(cv);
  const ctx = cv.getContext('2d');
  let W = 0, H = 0, s = 1, ox = 0, oy = 0, dpr = 1;
  const fit = () => {
    const r = ph.getBoundingClientRect();
    dpr = Math.min(devicePixelRatio || 1, 1.5);
    W = r.width; H = r.height;
    cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
    s = Math.max(W / IW, H / IH);
    // même cadrage que l'object-position de la photo
    const [px, py] = getComputedStyle(img).objectPosition.split(' ').map(v => parseFloat(v) / 100);
    ox = (W - IW * s) * (isNaN(px) ? .5 : px); oy = (H - IH * s) * (isNaN(py) ? .5 : py);
  };
  const P = (x, y) => [ox + x * s, oy + y * s];

  // une voie : une courbe du point de fuite jusque sous le bas de l'image
  const make = (t0) => {
    const away = Math.random() < .42; // feux arrière : côté droit, ils remontent vers l'Arc
    const bx = away ? rnd(1500, 3300) : rnd(-900, 1050);
    const warm = Math.random();
    return {
      bx, by: rnd(1500, 1900), bend: rnd(-160, 160), away,
      t: t0 ?? rnd(0, 1), sp: rnd(.10, .22) * (away ? .7 : 1), len: rnd(.08, .2),
      col: away ? [255, rnd(40, 80), rnd(40, 60)] : warm < .55 ? [255, 236, 200] : [249, 200, 90],
      w: rnd(.6, 1.4)
    };
  };
  const cars = Array.from({ length: 46 }, () => make());
  // position sur la voie : u=0 au point de fuite, u=1 en bas ; la perspective accélère vers le spectateur
  const at = (c, u) => {
    const e = u * u * u, cx = (VX + c.bx) / 2 + c.bend, cy = (VY + c.by) / 2 - 40;
    const k = 1 - e;
    return P(k * k * VX + 2 * k * e * cx + e * e * c.bx, k * k * VY + 2 * k * e * cy + e * e * c.by);
  };

  let run = false, last = 0, raf = 0;
  const frame = now => {
    raf = run ? requestAnimationFrame(frame) : 0;
    const dt = Math.min(.05, (now - (last || now)) / 1000); last = now;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, W, H);
    ctx.globalCompositeOperation = 'lighter';
    ctx.lineCap = 'round';
    for (const c of cars) {
      c.t += c.sp * dt * (c.away ? -1 : 1);
      if (c.t > 1.15 || c.t < -.05) Object.assign(c, make(c.away ? 1.1 : 0));
      const a = Math.max(0, Math.min(1, c.t)), b = Math.max(0, Math.min(1, c.t - (c.away ? -c.len : c.len)));
      if (a === b) continue;
      const fade = Math.min(1, c.t * 6) * Math.min(1, (1.05 - Math.min(1, c.t)) * 2.2);
      const head = c.away ? b : a, tail = c.away ? a : b;
      const [x1, y1] = at(c, tail), [x2, y2] = at(c, head);
      const wide = (1 + head * head * 4) * c.w * s * 1.6;
      const [r, g, bl] = c.col;
      const grad = ctx.createLinearGradient(x1, y1, x2, y2);
      grad.addColorStop(0, `rgba(${r},${g},${bl},0)`);
      grad.addColorStop(1, `rgba(${r},${g},${bl},${.18 * fade})`);
      ctx.strokeStyle = grad; ctx.lineWidth = wide * 4;
      ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
      const core = ctx.createLinearGradient(x1, y1, x2, y2);
      core.addColorStop(0, `rgba(${r},${g},${bl},0)`);
      core.addColorStop(1, `rgba(255,250,240,${.75 * fade})`);
      ctx.strokeStyle = core; ctx.lineWidth = Math.max(.6, wide * .7);
      ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
    }
  };
  const play = on => {
    run = on && !document.hidden;
    if (run && !raf) { last = 0; raf = requestAnimationFrame(frame); }
  };
  let seen = true;
  fit();
  addEventListener('resize', fit);
  new IntersectionObserver(([e]) => { seen = e.isIntersecting; play(seen); }).observe(ph);
  document.addEventListener('visibilitychange', () => play(seen));
  play(true);

  // un reflet suit le pointeur sur le verre du formulaire
  const form = root.querySelector('.cx-form');
  form?.addEventListener('pointermove', e => {
    const r = form.getBoundingClientRect();
    form.style.setProperty('--gx', ((e.clientX - r.left) / r.width * 100).toFixed(1) + '%');
    form.style.setProperty('--gy', ((e.clientY - r.top) / r.height * 100).toFixed(1) + '%');
  });
}
