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
const vus = new Set();

const dist = path.join(root, 'dist');
const walk = d => fs.readdirSync(d, { withFileTypes: true }).flatMap(e => e.isDirectory() ? walk(path.join(d, e.name)) : e.name.endsWith('.html') ? [path.relative(dist, path.join(d, e.name))] : []);
const pages = walk(dist).filter(f => !f.startsWith('vendor'));
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
  const bad = [...new Set(chunks.filter(c => !ALLOW.has(c) && !A_VALIDER.has(c) && !corpus.includes(c) && !corpusTight.includes(c.replace(/ /g, ''))))];
  if (bad.length) { problems += bad.length; console.log(`\n✗ ${page} — ${bad.length} texte(s) absent(s) du site actuel :`); bad.forEach(b => console.log('   « ' + b + ' »')); }
  else console.log(`✓ ${page} — ${chunks.length} textes, tous identiques au site actuel`);
}
console.log(problems ? `\n${problems} écart(s) à corriger.` : '\nAucun texte ajouté ou modifié.');
if (vus.size) console.log(`Libellés courts en attente de validation par le groupe : ${[...vus].map(v => '« ' + v + ' »').join(', ')}`);
process.exit(problems ? 1 : 0);
