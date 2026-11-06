/* Contrôle juridique des textes : chaque texte visible du nouveau site doit exister à l'identique
   dans le site actuel (pages enregistrées dans reference/). Tout écart est listé.
   Utilisation : node tools/check-textes.mjs        (après node tools/build.mjs) */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const NAMED = { nbsp: ' ', amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", rsquo: '’', lsquo: '‘', laquo: '«', raquo: '»', hellip: '…', eacute: 'é', egrave: 'è', agrave: 'à', ccedil: 'ç', ocirc: 'ô', ecirc: 'ê', icirc: 'î', ucirc: 'û', Eacute: 'É', copy: '©', ndash: '–', mdash: '—', euro: '€', deg: '°' };
const decode = s => s.replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
  .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(+d))
  .replace(/&([a-z]+);/gi, (m, n) => NAMED[n] ?? m);
const norm = s => decode(s).replace(/[  \s]+/g, ' ').trim();

// texte d'origine : toutes les pages de référence, balises retirées
const strip = html => html.replace(/<script[\s\S]*?<\/script>/gi, ' ').replace(/<style[\s\S]*?<\/style>/gi, ' ').replace(/<(?=[a-zA-Z\/!])[^>]*>/g, ' ');
const refs = fs.readdirSync(path.join(root, 'reference')).filter(f => f.endsWith('.html'));
const corpus = norm(refs.map(f => strip(fs.readFileSync(path.join(root, 'reference', f), 'utf8'))).join(' ‖ '));
// formes collées (deux blocs adjacents sans espace) tolérées
const corpusTight = corpus.replace(/ /g, '');

// éléments techniques autorisés qui ne sont pas des textes éditoriaux
const ALLOW = new Set(['G', 'T', '18+', '↗', '→', '↑', '+', '·', '–', '—', '/', '|', '✕', '01', '02', '03', '04', '05', '06', '07', '08', '09', '10', '11']);

// libellés courts proposés, en attente de validation par le groupe (PROPOSITION-STRUCTURE.md, § 6) : signalés à part
const A_VALIDER = new Set(['Nos destinations', 'Tous', 'Index égalité Femmes-Hommes']);
// textes réécrits à la demande, en attente de validation par le groupe (fenêtre « En savoir plus » de l'accueil) : signalés à part
const REECRITS = new Set([
  'Fort de plus de 30 ans d’exploitation de casinos et de clubs de jeux en France, le groupe TRANCHANT réinvente chaque jour la notion de loisirs, avec de nouvelles formules qui intègrent le jeu à des complexes toujours plus ambitieux.',
  'Chaque année, il investit dans la rénovation, la modernisation et l’extension de ses établissements, et construit sur de vastes terrains de nouveaux centres dédiés au jeu, à la culture, à la restauration et à l’hébergement, avec de grands parkings et des accès facilités pour accueillir une clientèle toujours plus large.',
  'Cette expertise lui a permis d’étendre progressivement ses activités, par des acquisitions stratégiques et des diversifications ciblées et complémentaires.',
  'Ses filiales portent la digitalisation de ses métiers historiques : solutions, applications, services et équipements spécialisés, avec l’innovation technologique comme accélérateur de croissance.',
].map(norm));
const vus = new Set(), reecritsVus = new Set();

const dist = path.join(root, 'dist');
const walk = d => fs.readdirSync(d, { withFileTypes: true }).flatMap(e => e.isDirectory() ? walk(path.join(d, e.name)) : e.name.endsWith('.html') ? [path.relative(dist, path.join(d, e.name))] : []);
// page test (fiche établissement) : textes repris du site du casino, à valider par le groupe, contrôlée à part
const TESTS = ['nos-destinations/casino-de-pougues-les-eaux/'];
const pages = walk(dist).filter(f => !f.startsWith('vendor') && !TESTS.some(t => f.startsWith(t)));
let problems = 0;
for (const page of pages) {
  let html = fs.readFileSync(path.join(dist, page), 'utf8');
  html = html.replace(/<head[\s\S]*?<\/head>/i, ' ')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<svg[\s\S]*?<\/svg>/gi, ' ')
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, ' ');
  const chunks = html.split(/<[^>]+>/).map(norm).filter(Boolean);
  chunks.filter(c => A_VALIDER.has(c)).forEach(c => vus.add(c));
  chunks.filter(c => REECRITS.has(c)).forEach(c => reecritsVus.add(c));
  const bad = [...new Set(chunks.filter(c => !ALLOW.has(c) && !A_VALIDER.has(c) && !REECRITS.has(c) && !corpus.includes(c) && !corpusTight.includes(c.replace(/ /g, ''))))];
  if (bad.length) { problems += bad.length; console.log(`\n✗ ${page} — ${bad.length} texte(s) absent(s) du site actuel :`); bad.forEach(b => console.log('   « ' + b + ' »')); }
  else console.log(`✓ ${page} — ${chunks.length} textes, tous identiques au site actuel`);
}
console.log(problems ? `\n${problems} écart(s) à corriger.` : '\nAucun texte ajouté ou modifié.');
if (vus.size) console.log(`Libellés courts en attente de validation par le groupe : ${[...vus].map(v => '« ' + v + ' »').join(', ')}`);
if (reecritsVus.size) console.log(`${reecritsVus.size} paragraphe(s) réécrit(s) en attente de validation par le groupe (fenêtre « En savoir plus » de l'accueil).`);
console.log(`Page test hors contrôle (textes repris du site du casino, à valider) : ${TESTS.map(t => '/' + t).join(', ')}`);
process.exit(problems ? 1 : 0);
