/* Groupe Tranchant — interface du site (la 3D est chargée à part, seulement si la page en contient et si l'appareil la gère) */
import * as FX from './text-fx.js';
const clamp01 = x => Math.min(1, Math.max(0, x));
const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
const params = new URLSearchParams(location.search);
const hasWebGL = !params.has('no3d') && (() => { try { const c = document.createElement('canvas'); return !!(c.getContext('webgl2') || c.getContext('webgl')); } catch (e) { return false; } })();
const has3D = !!document.querySelector('#hero, #implantations');

/* ================= DÉFILEMENT ================= */
history.scrollRestoration = 'manual';
if (!location.hash) scrollTo(0, 0);
const lenis = new Lenis({ lerp: .08, smoothWheel: !reduceMotion });
if (params.has('debug')) window.__lenis = lenis;
const header = document.getElementById('top');
// liens vers une ancre de la page en cours (y compris ceux du menu, écrits « /page/#ancre »)
document.querySelectorAll('a[href*="#"]').forEach(a => a.addEventListener('click', e => {
  if (a.pathname !== location.pathname || a.search !== location.search && !a.getAttribute('href').startsWith('#')) return;
  const id = a.hash; if (id.length < 2 || !document.querySelector(id)) return;
  e.preventDefault(); document.body.classList.remove('menu-open'); lenis.start();
  const target = document.querySelector(id);
  if (target.tagName === 'DETAILS') target.open = true;
  lenis.scrollTo(target, { offset: -90, duration: reduceMotion ? 0 : 1.6, immediate: reduceMotion });
}));
const burger = document.getElementById('burger');
burger?.addEventListener('click', () => burger.setAttribute('aria-expanded', document.body.classList.toggle('menu-open')));
let lastY = 0;
const solidAfter = () => has3D && document.getElementById('hero') ? innerHeight * 3.4 : 40;
lenis.on('scroll', ({ scroll }) => {
  document.body.classList.toggle('scrolled', scroll > 30);
  header.classList.toggle('solid', scroll > solidAfter());
  header.classList.toggle('hide', scroll > lastY && scroll > innerHeight && !document.body.classList.contains('menu-open'));
  lastY = scroll;
});
const io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } }), { rootMargin: '0px 0px -12% 0px' });
document.querySelectorAll('[data-reveal]').forEach(el => io.observe(el));

/* Effets d'apparition des textes (titres, paragraphes, surtitres, compteurs) */
FX.init({ reduceMotion, lenis });

/* Ouverture : titre lettre par lettre (au signal de la scène 3D), paragraphes lus au défilement */
let heroIntro = false;
const heroTitle = document.querySelector('#hero .ch-hero h1');
if (heroTitle && !reduceMotion) FX.splitChars(heroTitle);
document.addEventListener('hero:intro', () => { heroIntro = true; });

/* Profondeur des photos au défilement */
if (!reduceMotion) {
  const parallax = [...document.querySelectorAll('.m-img img, .card-img img, .pat-imgs img, .head-img')];
  lenis.on('scroll', () => parallax.forEach(img => {
    const r = img.parentElement.getBoundingClientRect();
    if (r.bottom < 0 || r.top > innerHeight) return;
    img.style.translate = `0 ${(r.top + r.height / 2 - innerHeight / 2) / innerHeight * -26}px`;
  }));
}

/* Formulaire de contact : ouvre la messagerie avec le message prérempli (site statique, sans serveur) */
document.querySelector('.contact-form')?.addEventListener('submit', e => {
  e.preventDefault();
  const f = new FormData(e.target);
  const body = `${f.get('message')}\n\n${f.get('nom')} — ${f.get('email')}`;
  location.href = `mailto:information@groupetranchant.com?subject=${encodeURIComponent(f.get('sujet'))}&body=${encodeURIComponent(body)}`;
});

/* Filtres (annuaire des destinations, offres d'emploi) : boutons data-f, éléments data-k */
const filterGroups = [...document.querySelectorAll('.filters')].map(bar => {
  const grid = document.querySelector(bar.dataset.target);
  const buttons = [...bar.querySelectorAll('button')];
  const apply = (f, q) => {
    buttons.forEach(b => b.setAttribute('aria-pressed', b.dataset.f === f));
    [...grid.children].forEach(el => {
      const show = q ? el.textContent.includes(q) : f === 'all' || el.dataset.k === f;
      el.classList.toggle('is-off', !show);
      if (show) el.classList.add('in');
    });
    if (grid.id === 'dest-grid') document.dispatchEvent(new CustomEvent('dest:filter', { detail: f }));
  };
  buttons.forEach(b => b.addEventListener('click', () => apply(b.dataset.f)));
  return { grid, apply, buttons };
});
// filtre transmis par l'adresse : /nos-destinations/?f=casino, /carrieres/?ville=paris
const preset = params.get('f') || params.get('ville');
filterGroups.forEach(g => { if (preset && g.buttons.some(b => b.dataset.f === preset)) g.apply(preset); });
// fiches métiers : « Voir les offres d'emploi » n'affiche que les offres correspondantes
document.querySelectorAll('a[data-q]').forEach(a => a.addEventListener('click', () => filterGroups.find(g => g.grid.id === 'jobs')?.apply('all', a.dataset.q)));
// survol d'un établissement de l'annuaire : sa punaise s'allume sur la maquette
document.querySelectorAll('#dest-grid .dest').forEach(el => {
  el.addEventListener('mouseenter', () => document.dispatchEvent(new CustomEvent('dest:hover', { detail: el.dataset.name })));
  el.addEventListener('mouseleave', () => document.dispatchEvent(new CustomEvent('dest:hover', { detail: '' })));
});

/* Sommaire de la page Groupe : la rubrique lue est mise en avant */
const tocLinks = [...document.querySelectorAll('.toc a')];
if (tocLinks.length) {
  const secs = tocLinks.map(a => document.querySelector(a.getAttribute('href')));
  lenis.on('scroll', () => {
    let k = 0; secs.forEach((s, i) => { if (s.getBoundingClientRect().top < innerHeight * .4) k = i; });
    tocLinks.forEach((a, i) => a.classList.toggle('on', i === k));
  });
}

/* Outils partagés avec la scène 3D */
const progressOf = el => { const r = el.getBoundingClientRect(); return clamp01(-r.top / (r.height - innerHeight)); };
const isVisible = el => { const r = el.getBoundingClientRect(); return r.bottom > 0 && r.top < innerHeight; };
function chapters(root, p) {
  root.querySelectorAll('.chapter').forEach(el => {
    const a = +el.dataset.from, b = +el.dataset.to, f = .045;
    const o = Math.min(a <= 0 ? 1 : clamp01((p - a) / f), b >= 1 ? 1 : clamp01((b - p) / f));
    el.style.opacity = o;
    el.style.visibility = o > .01 ? 'visible' : 'hidden';
    el.style.setProperty('--cy', (1 - o) * 26 + 'px');
    el.classList.toggle('on', o > .5);
    if (reduceMotion || !el.closest('#hero')) return;
    // titre et surtitre : rejouent leur apparition à chaque retour
    if (el.classList.contains('ch-hero')) {
      if (o > .5 && heroIntro && !el.classList.contains('fx-in')) { el.classList.add('fx-in'); FX.play(heroTitle); setTimeout(() => FX.sheen(heroTitle), 1600); }
      if (o < .02 && heroIntro) { el.classList.remove('fx-in'); FX.reset(heroTitle); }
      return;
    }
    // panneaux : dévoilement en balayage et lecture des mots synchronisés avec le défilement
    el.style.clipPath = `inset(0 ${((1 - o) * 100).toFixed(2)}% 0 0 round 4px)`;
    el.classList.toggle('fx-in', o > .35);
    const l = clamp01((p - a) / ((b - a) * .62));
    el.querySelectorAll('.lead').forEach((lead, k, all) => FX.scrub(lead, clamp01(l * all.length - k)));
  });
}
function smoother(rate = 5) {
  let v = 0, t = 0;
  return target => { const now = performance.now(), dt = Math.min(.25, (now - (t || now)) / 1000); t = now; v += (target - v) * (1 - Math.exp(-dt * rate)); if (Math.abs(target - v) < 1e-4) v = target; return v; };
}

/* ================= DÉMARRAGE ================= */
function startWithout3D() {
  if (has3D) document.body.classList.add('no-webgl');
  document.getElementById('loader')?.classList.add('done');
  document.body.classList.remove('loading');
  const raf = t => { lenis.raf(t); requestAnimationFrame(raf); };
  requestAnimationFrame(raf);
  if (location.hash && document.querySelector(location.hash)) setTimeout(() => lenis.scrollTo(location.hash, { offset: -90, immediate: true, force: true }), 300);
}
if (has3D && hasWebGL) {
  lenis.stop();
  import('./scene.js').then(m => m.start({ lenis, chapters, progressOf, isVisible, smoother, reduceMotion })).catch(err => { console.warn('3D indisponible', err); lenis.start(); startWithout3D(); });
} else startWithout3D();
