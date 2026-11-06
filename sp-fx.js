/* Groupe Tranchant — Activités sportives : la page entière se lit devant les scènes 3D de l'accueil.
   Une scène collante occupe l'écran pendant tout le défilement (sport-3d-air.js puis sport-3d-shot.js) ;
   le titre s'efface en s'étirant, les deux chapitres passent devant dans des panneaux de verre,
   le Shooting s'ouvre en iris sur la Patrouille. Photos en repli sans WebGL ; page calme si l'utilisateur réduit les animations. */
import { splitChars, play } from './text-fx.js';

const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const ease = t => t * t * (3 - 2 * t);
const LOAD = { air: () => import('./sport-3d-air.js'), shot: () => import('./sport-3d-shot.js') };

export function mountSp(root, { reduceMotion }) {
  const h1 = root.querySelector('.sp-open h1');
  splitChars(h1); setTimeout(() => play(h1), 250);
  if (reduceMotion) { root.classList.add('sp-still'); return; }
  root.classList.add('sp-live');

  const track = root.querySelector('.sp-track'), stage = root.querySelector('.sp-stage'), open = root.querySelector('.sp-open');
  const layers = [...root.querySelectorAll('.sp-layer')], hud = root.querySelector('.sp-hud');
  const chs = [...root.querySelectorAll('.sp-ch')], shotCh = root.querySelector('#shooting');
  h1.querySelectorAll('.c').forEach((c, i) => c.style.setProperty('--dx', (Math.sin(i * 37.3) * 1.6).toFixed(2)));

  // les panneaux : chaque ligne entre quand elle arrive dans l'écran
  const io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } }), { rootMargin: '0px 0px -12% 0px' });
  root.querySelectorAll('.sp-panel > *').forEach(el => io.observe(el));

  // scènes 3D : la Patrouille tout de suite, le Shooting ensuite ; une erreur laisse la photo
  const hasGL = (() => { try { const c = document.createElement('canvas'); return !!(c.getContext('webgl2') || c.getContext('webgl')); } catch { return false; } })();
  const S = [null, null];
  let visible = true, mix = 0, cur = 0;
  const safe = (i, fn, ...a) => { try { S[i]?.[fn]?.(...a); } catch (err) { console.warn('scène 3D désactivée', err); S[i] = null; layers[i].querySelector('.sp-host').remove(); layers[i].querySelector('.sp-photo').style.visibility = ''; } };
  const sync = () => S.forEach((s, i) => s && safe(i, visible && (i ? mix > 0 : mix < 1) ? 'play' : 'pause'));
  const load = i => LOAD[layers[i].dataset.k]().then(m => {
    S[i] = m.mount(layers[i].querySelector('.sp-host'), { reduceMotion });
    layers[i].querySelector('.sp-photo').style.visibility = 'hidden';
    sync(); frame();
  }).catch(err => console.warn('scène 3D indisponible', err));
  if (hasGL) load(0).then(() => (window.requestIdleCallback || setTimeout)(() => load(1)));

  let last = '';
  const frame = () => {
    const vh = innerHeight;
    // ouverture : le titre s'étire vers le spectateur et s'efface
    const o = open.getBoundingClientRect();
    root.style.setProperty('--fly', ease(clamp(-o.top / (vh * .7))).toFixed(4));
    // passage au Shooting : iris ouvert par le défilement
    const s = shotCh.getBoundingClientRect(), t = track.getBoundingClientRect();
    const m = ease(clamp((vh * 1.05 - s.top) / (vh * .85)));
    if ((m > 0) !== (mix > 0) || (m < 1) !== (mix < 1)) { mix = m; sync(); } else mix = m;
    root.style.setProperty('--m', m.toFixed(4));
    root.style.setProperty('--tp', clamp(-t.top / Math.max(1, t.height - vh)).toFixed(4));
    const shotTop = s.top - t.top;
    safe(0, 'progress', clamp(-t.top / Math.max(1, shotTop - vh * .2)));
    safe(1, 'progress', clamp((vh * .2 - s.top) / Math.max(1, s.height - vh * .6)));
    cur = m > .5 ? 1 : 0;
    const n = cur ? '02' : '01';
    if (n !== last) { hud.dataset.n = n; last = n; }
  };
  (function tick() { frame(); requestAnimationFrame(tick); })();

  stage.parentElement.addEventListener('pointermove', e => safe(cur, 'pointer', e.clientX / innerWidth - .5, e.clientY / innerHeight - .5));
  new IntersectionObserver(([e]) => { visible = e.isIntersecting; sync(); }).observe(track);
}
