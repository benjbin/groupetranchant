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
// barre principale : repère tricolore qui suit le survol, méga-menu ouvert au survol ou au clavier, avancement de la lecture
const navEl = header.querySelector('.nav'), navInd = header.querySelector('.nav-ind');
if (navEl && navInd) {
  const items = [...navEl.querySelectorAll('.nav-item')];
  const current = navEl.querySelector('.nav-item>a[aria-current]');
  const mark = a => { if (!a) { navInd.classList.remove('on'); return; } const n = header.getBoundingClientRect(), r = a.getBoundingClientRect(), pad = a.parentElement.classList.contains('has-sub') ? 14 : 0; navInd.style.setProperty('--x', r.left - n.left - 1 + 'px'); navInd.style.setProperty('--y', r.bottom - n.top - 9 + 'px'); navInd.style.setProperty('--w', r.width - pad + 'px'); navInd.classList.add('on'); };
  let shut = 0;
  const open = it => { clearTimeout(shut); items.forEach(o => o.classList.toggle('open', o === it && it.classList.contains('has-sub'))); mark(it.firstElementChild); };
  const close = () => { clearTimeout(shut); shut = setTimeout(() => { items.forEach(o => o.classList.remove('open')); mark(current); }, 140); };
  items.forEach(it => { it.addEventListener('mouseenter', () => open(it)); it.addEventListener('focusin', () => open(it)); });
  navEl.addEventListener('mouseleave', close);
  navEl.addEventListener('focusout', e => { if (!navEl.contains(e.relatedTarget)) close(); });
  addEventListener('keydown', e => { if (e.key === 'Escape' && navEl.querySelector('.open')) { items.forEach(o => o.classList.remove('open')); mark(current); document.activeElement?.blur(); } });
  // le premier calage attend les polices, sinon la largeur des libellés est fausse
  document.fonts.ready.then(() => mark(current)); addEventListener('resize', () => mark(navEl.querySelector('.open>a') || current));
}
lenis.on('scroll', ({ progress }) => header.style.setProperty('--sp', (progress || 0).toFixed(4)));
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
  const parallax = [...document.querySelectorAll('.m-img img, .card-img img, .pat-imgs img, .head-img, .spx-img img')];
  lenis.on('scroll', () => parallax.forEach(img => {
    const r = img.parentElement.getBoundingClientRect();
    if (r.bottom < 0 || r.top > innerHeight) return;
    img.style.translate = `0 ${(r.top + r.height / 2 - innerHeight / 2) / innerHeight * -26}px`;
  }));
}

/* Contact : la carte du quartier suit légèrement le pointeur */
const cxHead = document.querySelector('.cx');
if (cxHead && !reduceMotion) cxHead.addEventListener('pointermove', e => { cxHead.style.setProperty('--mx', (e.clientX / innerWidth - .5).toFixed(3)); cxHead.style.setProperty('--my', (e.clientY / innerHeight - .5).toFixed(3)); });
if (cxHead && !reduceMotion) import('./cx-fx.js').then(m => m.mountCx(cxHead)).catch(err => console.warn('phares indisponibles', err));
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
// même chose depuis la liste par région, à côté de la carte
document.querySelectorAll('.dmap-regions li').forEach(el => {
  const name = el.querySelector('a')?.textContent || el.firstChild?.nextSibling?.textContent || '';
  el.addEventListener('mouseenter', () => document.dispatchEvent(new CustomEvent('dest:hover', { detail: name.trim() })));
  el.addEventListener('mouseleave', () => document.dispatchEvent(new CustomEvent('dest:hover', { detail: '' })));
});

/* Fenêtres de texte : un lien data-dialog ouvre la fenêtre au lieu de changer de page */
document.querySelectorAll('a[data-dialog]').forEach(a => {
  const dlg = document.getElementById(a.dataset.dialog);
  if (!dlg?.showModal) return;
  a.addEventListener('click', e => { e.preventDefault(); dlg.showModal(); lenis.stop(); document.documentElement.classList.add('dlg-open'); });
  dlg.querySelector('.hs-dlg-x')?.addEventListener('click', () => dlg.close());
  dlg.addEventListener('click', e => { if (e.target === dlg) dlg.close(); });
  dlg.addEventListener('close', () => { lenis.start(); document.documentElement.classList.remove('dlg-open'); });
  // la photo glisse légèrement à l'opposé du pointeur
  const fig = dlg.querySelector('.hs-dlg-img');
  if (fig && !reduceMotion) {
    fig.addEventListener('pointermove', e => { const r = fig.getBoundingClientRect(); fig.style.setProperty('--ix', ((.5 - (e.clientX - r.left) / r.width) * 14).toFixed(1) + 'px'); fig.style.setProperty('--iy', ((.5 - (e.clientY - r.top) / r.height) * 14).toFixed(1) + 'px'); });
    fig.addEventListener('pointerleave', () => { fig.style.removeProperty('--ix'); fig.style.removeProperty('--iy'); });
  }
});

/* Page Groupe : l'année et l'image de la stratégie s'allument à l'arrivée de leur chapitre */
const gpLit = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { e.target.classList.add('lit'); gpLit.unobserve(e.target); } }), { threshold: .25 });
document.querySelectorAll('.gp-intro, .gp-strat').forEach(el => gpLit.observe(el));
// fiche d'offre : la barre « Postuler » mobile apparaît une fois l'ouverture passée, et s'efface devant la carte
const jpHead = document.querySelector('.jp-hero'), jpCard = document.querySelector('.jp-apply');
if (jpHead && document.querySelector('.jp-bar')) {
  const seen = new Map();
  const jpIo = new IntersectionObserver(es => { es.forEach(e => seen.set(e.target, e.isIntersecting)); document.body.classList.toggle('jp-show', !seen.get(jpHead) && !seen.get(jpCard)); });
  jpIo.observe(jpHead); if (jpCard) jpIo.observe(jpCard);
}
/* Carrières : au survol d'un métier, sa photo suit le pointeur */
const crPrev = document.querySelector('.cr-prev');
if (crPrev && matchMedia('(hover: hover)').matches && !matchMedia('(min-width: 1101px)').matches) {
  let lx = 0;
  document.querySelectorAll('.cr-metiers .acc').forEach(d => {
    const s = d.querySelector('summary'), img = d.querySelector('.acc-in img');
    if (!img) return;
    s.addEventListener('pointerenter', () => { if (!d.open) { crPrev.style.backgroundImage = `url("${img.src}")`; crPrev.classList.add('on'); } });
    s.addEventListener('pointermove', e => { crPrev.style.setProperty('--x', e.clientX + 'px'); crPrev.style.setProperty('--y', e.clientY + 'px'); crPrev.style.setProperty('--r', Math.max(-8, Math.min(8, (e.clientX - lx) * .4)) + 'deg'); lx = e.clientX; });
    s.addEventListener('pointerleave', () => crPrev.classList.remove('on'));
    s.addEventListener('click', () => crPrev.classList.remove('on'));
  });
}
const crRoot = document.querySelector('.cr');
if (crRoot) import('./cr-fx.js').then(m => m.mountCr(crRoot, { reduceMotion })).catch(err => console.warn('effets Carrières indisponibles', err));
const dnHero = document.querySelector('.dn-hero');
if (dnHero) import('./dn-fx.js').then(m => m.mountDn(dnHero, { reduceMotion })).catch(err => console.warn('effets Destinations indisponibles', err));
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
    el.style.clipPath = `inset(0 ${((1 - o) * 100).toFixed(2)}% 0 0 round 22px)`;
    el.classList.toggle('fx-in', o > .35);
    const l = clamp01((p - a) / ((b - a) * .62));
    el.querySelectorAll('.lead').forEach((lead, k, all) => FX.scrub(lead, clamp01(l * all.length - k)));
  });
}
// activités principales : la dernière carte survolée reste ouverte
document.querySelectorAll('#activites .panels').forEach(g => {
  const cards = [...g.querySelectorAll('.pnl')], open = c => cards.forEach(x => x.classList.toggle('is-open', x === c));
  open(cards[0]);
  cards.forEach(c => c.addEventListener('focus', () => open(c)));
  // la carte sous le pointeur s'ouvre aussitôt ; les cartes qui glissent sous un pointeur immobile ne déclenchent rien
  let lx = -1e4, ly = -1e4;
  g.addEventListener('pointermove', e => {
    const c = e.target.closest('.pnl');
    if (!c || c.classList.contains('is-open') || Math.hypot(e.clientX - lx, e.clientY - ly) < 4) return;
    open(c); lx = e.clientX; ly = e.clientY;
  });
});
// stratégie (accueil) : carte 3D des implantations
const stratMap = document.querySelector('.hstrat-map');
// accueil : la roulette des établissements ; Nos destinations : le réseau depuis Paris
const loadMap = () => stratMap.classList.contains('dmap-map') ? import('./strat-map-f.js') : import('./strat-map-e.js');
if (stratMap) loadMap().then(m => m.mountStratMap(stratMap, { reduceMotion })).catch(err => { console.warn('carte 3D indisponible', err); stratMap.classList.add('off'); });
// activités spécialisées (accueil) : une scène animée par filiale
const specFx = document.querySelector('#specialisees.sx');
if (specFx) import('./spec-fx.js').then(m => m.mountSpecFx(specFx, { reduceMotion })).catch(err => console.warn('scènes des filiales indisponibles', err));
// activités sportives (accueil) : la Patrouille puis le Shooting en 3D plein écran
const sportSec = document.getElementById('sportives');
const apRoot = document.querySelector('.gp.ap');
if (apRoot) import('./ap-fx.js').then(m => m.mountAp(apRoot, { reduceMotion })).catch(err => console.warn('effets des activités indisponibles', err));
const apHero = document.querySelector('.ap-hero');
if (apHero && !reduceMotion) import('./ap-hub.js').then(m => m.mountApHub(apHero, { reduceMotion, fly: () => parseFloat(apHero.style.getPropertyValue('--fly')) || 0 })).catch(err => console.warn('ouverture 3D indisponible', err));
const szHero = document.querySelector('.sz-hero');
if (szHero && !reduceMotion) import('./spec-hero.js').then(m => m.mountSpecHero(szHero, { reduceMotion })).catch(err => console.warn('ouverture 3D indisponible', err));
const szRoot = document.querySelector('.sz');
if (szRoot) import('./sz-fx.js').then(m => m.mountSz(szRoot, { reduceMotion })).catch(err => console.warn('scènes des filiales indisponibles', err));
const gsRoot = document.querySelector('.ge, .gx') && document.querySelector('.gp');
if (gsRoot) import('./gp-suite.js').then(m => m.mountGpSuite(gsRoot, { reduceMotion })).catch(err => console.warn('suite Groupe indisponible', err));
const spRoot = document.querySelector('.sp');
const gmRoot = document.querySelector('.gm');
if (gmRoot) import('./gp-maquette.js').then(m => m.mountGm(gmRoot, { reduceMotion })).catch(err => { console.warn('maquette 3D indisponible', err); gmRoot.classList.add('gm-still'); });
if (spRoot) import('./sp-fx.js').then(m => m.mountSp(spRoot, { reduceMotion })).catch(err => console.warn('effets des activités sportives indisponibles', err));
if (sportSec) import('./sport-v-g.js').then(m => m.mountSport(sportSec, { reduceMotion, lenis })).catch(err => console.warn('scènes sportives indisponibles', err));
// panneaux de l'ouverture : reflet qui suit le pointeur
document.querySelectorAll('#hero .ch-right, #hero .ch-left').forEach(el => el.addEventListener('pointermove', e => {
  const r = el.getBoundingClientRect();
  el.style.setProperty('--mx', e.clientX - r.left + 'px'); el.style.setProperty('--my', e.clientY - r.top + 'px');
}));
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
