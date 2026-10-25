/* Génère le dossier dist/ prêt à déposer sur l'hébergement.
   - les 7 adresses du site actuel, plus /groupe/, /nos-destinations/ et une page par offre d'emploi
   - libellés courts en attente de validation par le groupe : V1, V2, V3 (voir PROPOSITION-STRUCTURE.md)
   - textes repris à l'identique du site actuel (contrôle : node tools/check-textes.mjs)
   - fichiers CSS/JS versionnés pour que les navigateurs ne gardent pas une ancienne version
   Utilisation : node tools/build.mjs
   Préproduction dans un sous-dossier (ex. GitHub Pages) : BASE=/groupetranchant PREVIEW=1 node tools/build.mjs
     BASE    préfixe ajouté à tous les chemins du site
     PREVIEW demande aux moteurs de recherche de ne pas indexer cette copie */
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dist = path.join(root, 'dist');
const SITE = 'https://www.groupetranchant.com';
const BASE = (process.env.BASE || '').replace(/\/$/, '');
const PREVIEW = !!process.env.PREVIEW;
// préfixe les chemins absolus du site (« /page/ ») quand il est publié dans un sous-dossier
const based = html => BASE ? html.replace(/((?:href|src|content|action)=["']|url\(['"]?|"(?:three|three\/addons\/)": ")\/(?!\/)/g, `$1${BASE}/`) : html;
const { IMG, PLACES, PHOTO } = await import(path.join(root, 'data.js'));

/* Libellés courts proposés, en attente de validation par le groupe */
export const V1 = 'Nos destinations', V2 = 'Tous', V3 = 'Index égalité Femmes-Hommes';
const REF_DATE = '2026-10-25'; // relevé du site actuel (date de publication des offres à confirmer par le groupe)

const PAGES = [
  { slug: '', file: 'accueil', sec: 'accueil', title: 'Accueil - Groupe TRANCHANT', three: true,
    desc: 'Créé en 1988 et géré par la famille TRANCHANT, le groupe a ouvert ses premiers casinos ; puis s’est très vite développé, grâce à de nouvelles acquisitions en France et à l’international.' },
  { slug: 'groupe', file: 'groupe', sec: 'groupe', title: 'Présentation du groupe - Groupe TRANCHANT', crumb: 'PRÉSENTATION DU GROUPE',
    desc: 'Propriétaire de bâtiments classés aux Monuments Historiques et locataire de plusieurs municipalités notamment, le groupe TRANCHANT a également construit ses propres casinos et hôtels en harmonie avec les spécificités régionales.' },
  { slug: 'activites-principales', file: 'activites-principales', sec: 'principales', title: 'Activités principales - Groupe TRANCHANT', crumb: 'Activités principales',
    desc: 'Le groupe TRANCHANT exploite dix-sept casinos en France et en Suisse, ainsi que le premier club de jeux parisien, conçus pour privilégier le bien-être et le confort des joueurs dans de vastes salles lumineuses, élégantes et chaleureuses.' },
  { slug: 'nos-destinations', file: 'nos-destinations', sec: 'destinations', title: 'Nos destinations de jeux et de loisirs - Groupe TRANCHANT', crumb: 'Nos destinations de jeux et de loisirs', three: true,
    desc: 'Casinos, hôtels et club de jeu du groupe TRANCHANT en France et en Suisse.' },
  { slug: 'activites-specialisees', file: 'activites-specialisees', sec: 'specialisees', title: 'Activités spécialisées - Groupe TRANCHANT', crumb: 'Activités spécialisées', b2b: true,
    desc: 'Depuis ses origines avec TECHNI-IMPORT PROFESSIONNEL, acteur historique et premier importateur dans l’hexagone des plus grandes marques de machines à sous dès 1988, la filiale spécialisée du groupe TRANCHANT est devenue en quelques années un fournisseur incontournable des casinos et clubs de jeux.' },
  { slug: 'activites-sportives', file: 'activites-sportives', sec: 'sportives', title: 'Activités sportives - Groupe TRANCHANT', crumb: 'Activités sportives',
    desc: 'Véritable sport aérien, la voltige est une activité presque aussi ancienne que l’aviation elle-même. Aussi, et pour faire partager sa passion pour l’aviation et le pilotage, la famille TRANCHANT a créé en 2004 l’unique patrouille privée en France de voltige aérienne.' },
  { slug: 'carrieres', file: 'carrieres', sec: 'carrieres', title: 'Carrières - Groupe TRANCHANT', crumb: 'Carrières',
    desc: 'Rejoindre le GROUPE TRANCHANT, c’est intégrer l’un des leaders du marché, empreint depuis sa création à la fois de l’histoire d’une famille visionnaire, et de l’histoire d’une grande entreprise française qui, jour après jour, entretien et invente ses trois grands métiers : le jeu, l’hôtellerie et la restauration.' },
  { slug: 'mentions-legales', file: 'mentions-legales', sec: 'mentions', title: 'Mentions légales - Groupe TRANCHANT', crumb: 'Mentions légales',
    desc: 'www.groupetranchant.com est un site (ci-après le « Site ») exploité par le GIE CASINOS CONSEIL ET SERVICE (ci-après le « GIE »), groupement d’intérêt économique immatriculé au RCS de Paris sous le numéro 409 406 972 dont le siège social est situé 23 rue Boissière 75116 PARIS.' },
  { slug: 'contact', file: 'contact', sec: 'contact', title: 'Contact - Groupe TRANCHANT', crumb: 'Contact',
    desc: 'GIE CASINOS CONSEIL & SERVICE 23, rue Boissière 75116 PARIS 01 44 05 36 60' }
];
const href = p => '/' + (p.slug ? p.slug + '/' : '');

/* ---------- copie des fichiers ---------- */
const FILES = ['site.css', 'fonts.css', 'site.js', 'text-fx.js', 'scene.js', 'stage.js', 'data.js', 'site.webmanifest', 'robots.txt', '.htaccess'];
const DIRS = ['img', 'fonts', 'vendor', 'data'];
fs.rmSync(dist, { recursive: true, force: true });
fs.mkdirSync(dist);
FILES.forEach(f => fs.copyFileSync(path.join(root, f), path.join(dist, f)));
DIRS.forEach(d => fs.cpSync(path.join(root, d), path.join(dist, d), { recursive: true }));

const hash = crypto.createHash('sha1');
[...FILES.filter(f => /\.(css|js)$/.test(f)), 'src/offres.html', ...fs.readdirSync(path.join(root, 'src/pages')).map(f => 'src/pages/' + f)].forEach(f => hash.update(fs.readFileSync(path.join(root, f))));
const v = hash.digest('hex').slice(0, 8);
['site.js', 'scene.js', 'stage.js', 'text-fx.js'].forEach(f => {
  const p = path.join(dist, f);
  fs.writeFileSync(p, fs.readFileSync(p, 'utf8').replace(/(['"])\.\/(data|scene|stage|text-fx)\.js\1/g, `$1./$2.js?v=${v}$1`));
});

if (BASE) {
  ['scene.js', 'site.webmanifest'].forEach(f => {
    const q = path.join(dist, f);
    fs.writeFileSync(q, fs.readFileSync(q, 'utf8').replace(/(['"`])\/(vendor|data|img)\//g, `$1${BASE}/$2/`).replace('"start_url": "/"', `"start_url": "${BASE}/"`));
  });
}
if (PREVIEW) {
  fs.writeFileSync(path.join(dist, 'robots.txt'), 'User-agent: *\nDisallow: /\n');
  fs.writeFileSync(path.join(dist, '.nojekyll'), '');
}

/* ---------- gabarits communs ---------- */
const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const LOGO = `<svg width="0" height="0" style="position:absolute" aria-hidden="true"><symbol id="gt" viewBox="0 0 66 40"><circle cx="20" cy="20" r="18" fill="#fff" stroke="#2F5F90" stroke-width="1.6"/><path fill="#2F5F90" d="M20.6 10.6c-5.4 0-9 3.8-9 9.4s3.4 9.4 8.6 9.4c2.6 0 4.6-1 5.8-2.8v2.4h3v-9.6h-8.6v3h5.2c-.4 2.2-2.2 3.6-5 3.6-3.4 0-5.4-2.4-5.4-6s2.2-6 5.4-6c2.2 0 3.8 1 4.4 2.8h3.8c-.8-3.8-3.8-6.2-8.2-6.2z"/><circle cx="45" cy="20" r="18" fill="#F2C230"/><path fill="#fff" d="M37.4 11h15.2v3.2h-5.8V29h-3.6V14.2h-5.8z"/></symbol></svg>`;
const FILIALES = [
  ['cat', 'CASINO ADVANCED TECHNOLOGY', 'Matériels et accessoires de jeux', 'https://www.sfmcat.com/'],
  ['certus', 'CERTUS TECHNOLOGIES', 'Solutions de jeu connectées', 'https://certus-gaming.com/'],
  ['alioscopy', 'ALIOSCOPY', 'Solutions de réalité virtuelle', 'https://www.alioscopy.com/en/home.php'],
  ['zalix', 'ZALIX BIOMÉTRIE', 'Solutions de sécurité biométrique', 'https://www.zalix.fr/'],
  ['ids', 'IMPORTATION DISTRIBUTION SERVICES', 'Services de Sourcing', 'https://ids-ste.com/']
];
const MENU = [
  { sec: 'groupe', label: 'PRÉSENTATION DU GROUPE', href: '/groupe/', sub: [['Stratégie de croissance et d\'expansion', '/groupe/#strategie'], ['ENGAGEMENTS ET VALEURS', '/groupe/#engagements'], [V3, '/groupe/#index-egalite']] },
  { sec: 'principales', label: 'Activités principales', href: '/activites-principales/', sub: [['CASINOS ET CLUB DE JEUX', 'casinos'], ['HÔTELS', 'hotels'], ['RESTAURANTS ET BARS', 'restaurants'], ['SALLES DE CONCERTS ET SPECTACLES', 'spectacles'], ['SALLES DE RÉCEPTION ET SÉMINAIRES', 'receptions']].map(([t, a]) => [t, '/activites-principales/#' + a]) },
  { sec: 'destinations', label: V1, href: '/nos-destinations/' },
  { sec: 'sportives', label: 'Activités sportives', href: '/activites-sportives/', sub: [['PATROUILLE TRANCHANT', '/activites-sportives/#patrouille'], ['SHOOTING CLUBS', '/activites-sportives/#shooting']] },
  { sec: 'specialisees', label: 'Activités spécialisées', href: '/activites-specialisees/', sub: FILIALES.map(([a, n, d]) => [n, '/activites-specialisees/#' + a, d]) }
];
const nav = cur => MENU.map(m => `<div class="nav-item${m.sub ? ' has-sub' : ''}"><a href="${m.href}"${m.sec === cur.sec ? ' aria-current="page"' : ''}>${esc(m.label)}</a>${m.sub ? `<div class="sub">${m.sub.map(([t, h, d]) => `<a href="${h}">${esc(t)}${d ? `<small>${esc(d)}</small>` : ''}</a>`).join('')}</div>` : ''}</div>`).join('');
const drawer = () => MENU.map(m => `<a href="${m.href}">${esc(m.label)}</a>`).join('') + `<a href="/carrieres/">Carrières</a><a href="/contact/">Contact</a>`;
const footCols = () => [
  ['PRÉSENTATION DU GROUPE', '/groupe/', MENU[0].sub],
  ['Activités principales', '/activites-principales/', [...MENU[1].sub, [V1, '/nos-destinations/']]],
  ['ACTIVITÉS SPÉCIALISÉES', '/activites-specialisees/', MENU[4].sub],
  ['Activités sportives', '/activites-sportives/', MENU[3].sub],
  ['Carrières', '/carrieres/', [['OFFRES D\'EMPLOI', '/carrieres/#offres-emploi'], ['Principaux métiers', '/carrieres/#metiers'], ['Contact', '/contact/']]]
].map(([t, h, l]) => `<div><a class="fc-title" href="${h}">${esc(t)}</a>${l.map(([x, y]) => `<a href="${y}">${esc(x)}</a>`).join('')}</div>`).join('');
const crumbs = (...items) => `<nav class="crumbs" aria-label="Fil d'Ariane"><a href="/">Accueil</a>${items.map(([t, h]) => `<span aria-hidden="true">/</span>${h ? `<a href="${h}">${esc(t)}</a>` : `<span aria-current="page">${esc(t)}</span>`}`).join('')}</nav>`;
const ldCrumbs = (...items) => ({ '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: [['Accueil', '/'], ...items].map(([t, h], i) => ({ '@type': 'ListItem', position: i + 1, name: t, item: SITE + h })) });

const ORG = {
  '@context': 'https://schema.org', '@type': 'Organization', name: 'Groupe TRANCHANT', url: SITE + '/',
  logo: SITE + '/img/logo-groupe-tranchant.png', foundingDate: '1988',
  description: PAGES[0].desc,
  address: { '@type': 'PostalAddress', streetAddress: '23, rue Boissière', postalCode: '75116', addressLocality: 'Paris', addressCountry: 'FR' },
  telephone: '+33 1 44 05 36 60',
  subOrganization: PLACES.map(p => ({ '@type': p.type === 'hotel' ? 'Hotel' : p.type === 'club' ? 'EntertainmentBusiness' : 'Casino', name: p.name, ...(p.url ? { url: p.url } : {}), address: { '@type': 'PostalAddress', addressLocality: p.city } }))
};

const head = p => `<!doctype html>
<html lang="fr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(p.title)}</title>
<meta name="description" content="${esc(p.desc)}">
<link rel="canonical" href="${SITE}${href(p)}">
<meta name="robots" content="${PREVIEW ? 'noindex, nofollow' : 'index, follow, max-image-preview:large'}">
<meta name="theme-color" content="#050608">
<meta property="og:type" content="website">
<meta property="og:locale" content="fr_FR">
<meta property="og:site_name" content="Groupe TRANCHANT">
<meta property="og:title" content="${esc(p.title)}">
<meta property="og:description" content="${esc(p.desc)}">
<meta property="og:url" content="${SITE}${href(p)}">
<meta property="og:image" content="${SITE}/img/og-groupe-tranchant.jpg">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta name="twitter:card" content="summary_large_image">
<link rel="icon" href="/img/favicon.svg" type="image/svg+xml">
<link rel="icon" href="/img/favicon-32.png" sizes="32x32" type="image/png">
<link rel="apple-touch-icon" href="/img/apple-touch-icon.png">
<link rel="manifest" href="/site.webmanifest">
<link rel="preload" href="/fonts/archivo-latin.woff2" as="font" type="font/woff2" crossorigin>
<link rel="preload" href="/fonts/inter-latin.woff2" as="font" type="font/woff2" crossorigin>
<link rel="stylesheet" href="/fonts.css">
<link rel="stylesheet" href="/site.css?v=${v}">
${p.three ? `<link rel="modulepreload" href="/vendor/three/three.module.min.js">
<script type="importmap">{ "imports": { "three": "/vendor/three/three.module.min.js", "three/addons/": "/vendor/three/addons/" } }</script>` : ''}
${(p.ld || []).map(o => `<script type="application/ld+json">${JSON.stringify(o).replace(/</g, '\\u003c')}</script>`).join('\n')}
</head>
<body class="${p.three ? 'loading' : 'flat'}${p.b2b ? ' b2b' : ''}">
<a class="skip" href="#contenu">Aller au contenu</a>
${LOGO}
${p.three ? `<div id="loader"><svg><use href="#gt"/></svg><div class="bar"><i></i></div></div>` : ''}
<header class="top" id="top">
  <a class="brand" href="/" aria-label="Groupe TRANCHANT"><svg><use href="#gt"/></svg><span>GROUPE TRANCHANT<i class="tri"></i></span></a>
  <nav class="nav" aria-label="Navigation principale">${nav(p)}</nav>
  <div class="top-right"><a class="top-link" href="/contact/"${p.sec === 'contact' ? ' aria-current="page"' : ''}>Contact</a><a class="top-contact" href="/carrieres/"${p.sec === 'carrieres' ? ' aria-current="page"' : ''}>Carrières</a><img class="b18img" src="/img/18ans.png" alt="18+" width="34" height="34"><button class="burger" id="burger" aria-label="Menu" aria-expanded="false" aria-controls="menu"><span></span><span></span></button></div>
</header>
<div class="drawer-menu" id="menu">${drawer()}</div>
<main id="contenu">
`;

const foot = () => `
</main>
<footer class="foot">
  <div class="foot-brand"><svg><use href="#gt"/></svg><span>GROUPE TRANCHANT</span></div>
  <i class="tri wide"></i>
  <nav class="foot-cols" aria-label="Pied de page">${footCols()}</nav>
  <nav class="foot-legal" aria-label="Informations légales"><a href="/mentions-legales/">Mentions légales</a><a href="/mentions-legales/#donnees">POLITIQUE DE TRAITEMENT DES DONNÉES À CARACTÈRE PERSONNEL</a><a href="/mentions-legales/#cookies">CHARTES COOKIES</a></nav>
  <div class="legal">
    <img src="/img/18ans.png" alt="18+" width="40" height="40">
    <p>LES JEUX D’ARGENT ET DE HASARD PEUVENT ÊTRE DANGEREUX : PERTES D’ARGENT, CONFLITS FAMILIAUX, ADDICTION... RETROUVEZ NOS CONSEILS SUR <a href="https://joueurs-info-service.fr/" target="_blank" rel="noopener">JOUEURS-INFO-SERVICE.FR</a> (09 74 75 13 13 - APPEL NON SURTAXÉ)</p>
    <img class="gouv" src="/img/logo-gouv.svg" alt="" width="80" height="48">
  </div>
  <div class="copy"><p>© 2026 Groupe TRANCHANT</p><p>Mis en ligne par Groupe TRANCHANT</p></div>
</footer>
<script src="/vendor/gsap.min.js" defer></script>
<script src="/vendor/lenis.min.js" defer></script>
<script type="module" src="/site.js?v=${v}"></script>
</body>
</html>
`;

/* ---------- offres d'emploi (src/offres.html, textes du site actuel) ---------- */
const slugify = t => t.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/\([^)]*\)/g, ' ').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const OFFRES = [...fs.readFileSync(path.join(root, 'src/offres.html'), 'utf8').matchAll(/<details class="acc" id="([^"]+)"><summary>([^<]+)<\/summary><div class="acc-in text"><div>([\s\S]*?)<\/div><\/div><\/details>/g)].map(([, id, title, body]) => {
  const [ville, poste] = title.split(' - ');
  const site = (body.match(/href="(https?:[^"]+)"/) || [])[1];
  return { id, title, ville, poste, body, slug: slugify(title), intro: body.match(/<p>[\s\S]*?<\/p>/)[0],
    place: PLACES.find(p => p.url && site && p.url.replace(/^https?:\/\/(www\.)?/, '') === site.replace(/^https?:\/\/(www\.)?/, '')),
    apply: (body.match(/href="(mailto:[^"]+)"/) || [])[1] };
});
const offreHref = o => `/carrieres/offres/${o.slug}/`;
const villes = [...new Set(OFFRES.map(o => o.ville))];
const filtres = (target, opts) => `<div class="filters" data-target="${target}" role="group" aria-label="Filtrer"><button type="button" data-f="all" aria-pressed="true">${V2}</button>${opts.map(([f, t]) => `<button type="button" data-f="${f}" aria-pressed="false">${t}</button>`).join('')}</div>`;
const offreCard = o => `<article class="job" id="${o.id}" data-k="${slugify(o.ville)}" data-reveal><p class="job-city">${esc(o.ville)}</p><h3 class="display">${esc(o.poste)}</h3><div class="job-intro">${o.intro}</div><a class="btn" href="${offreHref(o)}">En savoir plus</a></article>`;

/* ---------- blocs générés à partir des données (noms et villes du site actuel) ---------- */
const ORDER = ['Paris Élysées Club', 'Grand Casino Basel', 'Airport Hotel Basel', 'Seven Casino', 'Golden Tulip', "Casino d'Argelès-Gazost", 'Casino de Bagnères-de-Bigorre', 'Casino Terrazur', 'Casino de Dunkerque', 'Casino Flamingos', 'Casino de Luc-sur-Mer', 'Casino de Néris-les-Bains', 'Casino de Pau', 'Casino de Pougues-les-Eaux', 'Hôtel des Sources', 'Casino de Roscoff', 'Casino de Saint-Gervais', 'Casino de Sète', 'Casino de Valras-Plage', 'Casino de Villers-sur-Mer', "Casino d'Yport", 'Grand Casino Prilly'];
const byName = n => PLACES.find(p => p.name === n);
const destinations = ORDER.map(byName).map(p => {
  const jobs = OFFRES.filter(o => o.place === p);
  const name = p.url ? `<a class="dest-link" href="${esc(p.url)}" target="_blank" rel="noopener">${esc(p.name)} <span aria-hidden="true">↗</span></a>` : esc(p.name);
  return `<article class="dest" data-k="${p.type}" data-name="${esc(p.name)}" data-reveal><figure><img src="${IMG + PHOTO[p.name]}" alt="" loading="lazy"><i class="c-${p.type}"></i></figure><h4 class="display">${name}</h4>${p.type === 'hotel' ? '' : `<p>${esc(p.city)}</p>`}${jobs.length ? `<a class="dest-jobs" href="/carrieres/?ville=${slugify(jobs[0].ville)}#offres-emploi">OFFRES D'EMPLOI</a>` : ''}</article>`;
}).join('');
const region = r => ORDER.map(byName).filter(p => p.r === r).map(p => `<li><i class="c-${p.type}"></i>${p.url ? `<a href="${esc(p.url)}" target="_blank" rel="noopener">${esc(p.name)}</a>` : esc(p.name)}<span>${esc(p.city)}</span></li>`).join('');
const vignettes = (list => list + list)(ORDER.map(byName).map(p => `<figure><img src="${IMG + PHOTO[p.name]}" alt="" loading="lazy"><figcaption><i class="c-${p.type}"></i>${esc(p.name)}</figcaption></figure>`).join(''));
const filiales = (internal) => FILIALES.map(([a, n, d, u], i) => `<a class="spec" href="${internal ? '/activites-specialisees/#' + a : '#' + a}" data-reveal><span class="n" aria-hidden="true">0${i + 1}</span><h4 class="display">${n}</h4><span class="btn">${d}</span></a>`).join('');

const BLOCS = {
  destinations, vignettes, V2, V3,
  'region': region,
  'offres': OFFRES.map(offreCard).join(''),
  'offres-liste': OFFRES.map(o => `<li><a href="${offreHref(o)}"><b>${esc(o.poste)}</b><span>${esc(o.ville)}</span></a></li>`).join(''),
  'filtres-offres': filtres('#jobs', villes.map(v => [slugify(v), esc(v)]))
};
const fill = (html, p) => html
  .replace(/\{\{region:(\w+)\}\}/g, (_, r) => region(r))
  .replace(/\{\{filiales\}\}/g, () => filiales(p.sec !== 'specialisees'))
  .replace(/\{\{([\w-]+)\}\}/g, (m, k) => typeof BLOCS[k] === 'string' ? BLOCS[k] : m);

/* ---------- pages ---------- */
const written = [];
const write = (p, body) => {
  const out = path.join(dist, p.slug);
  fs.mkdirSync(out, { recursive: true });
  fs.writeFileSync(path.join(out, 'index.html'), based(head(p) + body + foot()));
  written.push(p);
};
for (const p of PAGES) {
  p.ld = p.slug === '' ? [ORG] : [ldCrumbs([p.crumb, href(p)])];
  let body = fill(fs.readFileSync(path.join(root, 'src/pages', p.file + '.html'), 'utf8'), p);
  if (p.slug && p.file !== 'nos-destinations') body = body.replace('<div class="page-head-in">', `<div class="page-head-in">\n    ${crumbs([p.crumb])}`);
  if (/\{\{/.test(body)) throw new Error(`Bloc non remplacé dans ${p.file} : ${body.match(/\{\{[^}]*\}\}/)[0]}`);
  write(p, body);
}

/* une page par offre d'emploi, avec données structurées JobPosting (Google for Jobs) */
for (const o of OFFRES) {
  const [, dept] = o.ville.match(/\((\d+)\)/) || [];
  const city = o.place ? o.place.city : o.ville.replace(/\s*\(.*$/, '');
  const p = { slug: offreHref(o).slice(1, -1), sec: 'carrieres', title: `${o.title} - Groupe TRANCHANT`,
    desc: o.intro.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim().slice(0, 300),
    ld: [ldCrumbs(['Carrières', '/carrieres/'], [o.title, offreHref(o)]), {
      '@context': 'https://schema.org', '@type': 'JobPosting', title: o.poste.replace(/\s*\(H\/F\)\s*$/, ''), description: o.body, datePosted: REF_DATE,
      hiringOrganization: { '@type': 'Organization', name: 'Groupe TRANCHANT', sameAs: SITE + '/', logo: SITE + '/img/logo-groupe-tranchant.png' },
      jobLocation: { '@type': 'Place', address: { '@type': 'PostalAddress', addressLocality: city, ...(dept ? { postalCode: dept } : {}), addressCountry: 'FR' } },
      ...(/durée indéterminée/i.test(o.body) ? { employmentType: 'FULL_TIME' } : {}), directApply: false }] };
  const autres = OFFRES.filter(x => x !== o).map(x => `<li><a href="${offreHref(x)}"><b>${esc(x.poste)}</b><span>${esc(x.ville)}</span></a></li>`).join('');
  write(p, `<section class="page-head slim job-head">
  <div class="page-head-in">
    ${crumbs(['Carrières', '/carrieres/'], ['OFFRES D\'EMPLOI', '/carrieres/#offres-emploi'])}
    <h1 class="display big job-title">${esc(o.title)}</h1>
  </div>
</section>
<section class="section job-page">
  <div class="job-grid">
    <article class="job-body acc-in text">${o.body}</article>
    <aside class="job-aside">
      ${o.place ? `<figure><img src="${IMG + PHOTO[o.place.name]}" alt=""></figure>` : ''}
      ${o.apply ? `<a class="btn solid" href="${o.apply}">Postuler</a>` : ''}
      <a class="btn" href="/carrieres/#offres-emploi">OFFRES D'EMPLOI</a>
    </aside>
  </div>
  ${autres ? `<div class="home-jobs"><h2 class="acc-title">OFFRES D'EMPLOI</h2><ul class="jobs">${autres}</ul></div>` : ''}
</section>
`);
}

/* ---------- plan du site ---------- */
fs.writeFileSync(path.join(dist, 'sitemap.xml'), `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${written.map(p => `  <url><loc>${SITE}${href(p)}</loc><lastmod>${new Date().toISOString().slice(0, 10)}</lastmod><priority>${p.slug ? '0.8' : '1.0'}</priority></url>`).join('\n')}
</urlset>
`);

const size = q => fs.statSync(q).isDirectory() ? fs.readdirSync(q).reduce((s, f) => s + size(path.join(q, f)), 0) : fs.statSync(q).size;
console.log(`dist/ généré — ${written.length} pages, version ${v}, ${(size(dist) / 1024 / 1024).toFixed(2)} Mo`);
