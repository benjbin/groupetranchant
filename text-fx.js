/* Groupe Tranchant — effets d'apparition des textes.
   Le découpage se fait uniquement à l'affichage : les textes du HTML ne sont jamais modifiés. */
const clamp01 = x => Math.min(1, Math.max(0, x));

/* Enveloppe chaque mot (et éventuellement chaque lettre) dans des spans, sans toucher aux balises internes (liens, gras, retours à la ligne) */
function wrapTextNodes(el, perChar) {
  let i = 0;
  const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
  const nodes = [];
  while (walker.nextNode()) nodes.push(walker.currentNode);
  nodes.forEach(node => {
    const frag = document.createDocumentFragment();
    node.textContent.split(/(\s+)/).forEach(tok => {
      if (!tok) return;
      if (/^\s+$/.test(tok)) { frag.appendChild(document.createTextNode(tok)); return; }
      const w = document.createElement('span'); w.className = 'w';
      if (perChar) {
        [...tok].forEach(ch => { const c = document.createElement('span'); c.className = 'c'; c.style.setProperty('--i', i++); c.textContent = ch; w.appendChild(c); });
      } else {
        const wi = document.createElement('span'); wi.className = 'wi'; wi.style.setProperty('--i', i++); wi.textContent = tok; w.appendChild(wi);
      }
      frag.appendChild(w);
    });
    node.replaceWith(frag);
  });
  el._units = [...el.querySelectorAll(perChar ? '.c' : '.wi')];
  return el;
}

export function splitWords(el) { if (!el._units) { wrapTextNodes(el, false); el.classList.add('fx-words'); } return el; }
export function splitChars(el) { if (!el._units) { wrapTextNodes(el, true); el.classList.add('fx-chars'); } return el; }
export function play(el) { el.classList.add('fx-in'); }
export function reset(el) { el.classList.remove('fx-in'); }

/* Lecture au défilement : les mots s'éclairent du doré pâle à l'ivoire selon l'avancée l (0 → 1) */
export function scrub(el, l) {
  if (!el._units) { wrapTextNodes(el, false); el.classList.add('fx-scrub'); }
  const n = el._units.length, head = l * (n + 10);
  if (el._last === Math.round(head * 4)) return;
  el._last = Math.round(head * 4);
  el._units.forEach((u, i) => u.style.setProperty('--v', clamp01((head - i) / 10).toFixed(3)));
}

/* Reflet doré qui traverse un titre (calque superposé, même texte, invisible pour les lecteurs d'écran) */
export function sheen(el) {
  if (el.querySelector('.sheen')) return;
  const s = document.createElement('span');
  s.className = 'sheen'; s.setAttribute('aria-hidden', 'true');
  s.textContent = el.textContent;
  el.style.position = 'relative';
  el.appendChild(s);
}

/* Compteurs en rouleaux de chiffres : s'arrêtent sur la valeur exacte affichée dans le HTML */
export function odometer(el) {
  const txt = el.textContent.trim();
  if (!/^\d+$/.test(txt) || el.classList.contains('odo')) return;
  el.setAttribute('aria-label', txt);
  el.classList.add('odo');
  const strip = [...'01234567890123456789'].map(d => `<span>${d}</span>`).join('');
  el.innerHTML = [...txt].map((d, i) => `<span class="odo-col" aria-hidden="true" style="--d:${d};--i:${txt.length - 1 - i}"><span class="odo-strip">${strip}</span></span>`).join('');
}

/* Mise en place automatique sur la page */
export function init({ reduceMotion, lenis }) {
  if (reduceMotion) return { scrubVisible() {} };
  const io = new IntersectionObserver(es => es.forEach(e => {
    if (!e.isIntersecting) return;
    e.target.classList.add('fx-in');
    io.unobserve(e.target);
  }), { rootMargin: '0px 0px -10% 0px' });

  // grands titres : mots qui montent d'un masque, du flou au net
  document.querySelectorAll('main .section h2.display, main .sec-head h2, .acc-title, .dest-sec .kicker, main h4.display').forEach(h => { if (!h.closest('.chapter')) { splitWords(h); io.observe(h); } });
  // titres de page : lettres en bascule 3D
  document.querySelectorAll('.page-head h1').forEach(h => { splitChars(h); setTimeout(() => { play(h); setTimeout(() => sheen(h), 1400); }, 250); });
  // paragraphes : dévoilement en rideau, l'un après l'autre
  document.querySelectorAll('.m-body > p, .act-body > p, .strat-text > p:not(.lead), .car-intro p, .pat-text > p, .shoot-text > p, .legal-text > p, .sec-head > p.lead, .notes p, .m-tag').forEach((p, k) => { p.classList.add('fx-para'); io.observe(p); });
  // surtitres : barre tricolore tracée, lettres qui se resserrent
  document.querySelectorAll('.kicker').forEach(k => { if (!k.closest('.chapter')) io.observe(k); });
  // compteurs
  document.querySelectorAll('[data-count]').forEach(el => { odometer(el); io.observe(el); });
  // grandes phrases hors ouverture : lecture au défilement
  const scrubs = [...document.querySelectorAll('.lead.big')].filter(el => !el.closest('.chapter'));
  const update = () => scrubs.forEach(el => { const r = el.getBoundingClientRect(); if (r.bottom < 0 || r.top > innerHeight) return; scrub(el, clamp01((innerHeight * .88 - r.top) / (innerHeight * .55 + r.height * .4))); });
  if (scrubs.length) { lenis.on('scroll', update); update(); }
  return { scrubVisible: update };
}
