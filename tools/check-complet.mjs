/* Contrôle inverse : chaque texte du site actuel (titres, paragraphes, listes, tableaux, boutons)
   doit se retrouver dans le nouveau site. Utilisation : node tools/check-complet.mjs */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const NAMED = { nbsp: ' ', amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", rsquo: '’', lsquo: '‘', laquo: '«', raquo: '»', hellip: '…', copy: '©', ndash: '–', mdash: '—', euro: '€' };
const decode = s => s.replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16))).replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(+d)).replace(/&([a-z]+);/gi, (m, n) => NAMED[n] ?? m);
const norm = s => decode(s.replace(/<(?=[a-zA-Z\/!])[^>]*>/g, ' ')).replace(/[  \s]+/g, ' ').trim();
const dist = path.join(root, 'dist');
const walk = d => fs.readdirSync(d, { withFileTypes: true }).flatMap(e => e.isDirectory() ? walk(path.join(d, e.name)) : e.name.endsWith('.html') ? [path.join(d, e.name)] : []);
const site = norm(walk(dist).filter(f => !f.includes('/vendor/')).map(f => fs.readFileSync(f, 'utf8').replace(/<head[\s\S]*?<\/head>/i, ' ').replace(/<script[\s\S]*?<\/script>/gi, ' ')).join(' ‖ '));
const siteTight = site.replace(/ /g, '').toLowerCase();
let missing = 0;
for (const f of fs.readdirSync(path.join(root, 'reference')).filter(f => f.endsWith('.html'))) {
  const html = fs.readFileSync(path.join(root, 'reference', f), 'utf8').replace(/<script[\s\S]*?<\/script>/gi, '').replace(/<style[\s\S]*?<\/style>/gi, '');
  const texts = [...html.matchAll(/<(p|h[1-6]|li|td|th|span class="elementor-button-text"|div class="e-n-accordion-item-title-text")[^>]*>([\s\S]*?)<\/(p|h[1-6]|li|td|th|span|div)>/gi)].map(m => norm(m[2])).filter(t => t.length > 1);
  const miss = [...new Set(texts.filter(t => !site.includes(t) && !siteTight.includes(t.replace(/ /g, '').toLowerCase())))];
  if (miss.length) { missing += miss.length; console.log(`\n${f} — ${miss.length} texte(s) du site actuel non repris :`); miss.forEach(t => console.log('   « ' + t.slice(0, 160) + ' »')); }
  else console.log(`✓ ${f} — tout est repris`);
}
console.log(missing ? `\n${missing} texte(s) à examiner.` : '\nTous les textes du site actuel sont présents.');
