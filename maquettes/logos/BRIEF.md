# Brief : nouvelle identité Groupe TRANCHANT

## Le client
Groupe familial français fondé en 1988 et dirigé par la famille TRANCHANT, avec son siège à Paris. Ses activités :
- **Activités principales :** casinos et clubs de jeux, hôtels, restaurants et bars, salles de concerts et de spectacles, salles de réception et de séminaires.
- **Activités spécialisées :** des sociétés technologiques, à savoir Casino Advanced Technology, Certus Technologies, Alioscopy (écrans 3D sans lunettes), Zalix Biométrie et Importation Distribution Services.
- **Activités sportives :** Patrouille Tranchant (voltige aérienne) et Shooting Clubs (loisirs sportifs).

Présence en France, en Europe et en Afrique. Ton recherché : haut de gamme, familial, solide, « nuit » et divertissement, sans être tape-à-l'œil.

## Demande
Un **nouveau logo**, créé de zéro, avec une vraie direction artistique. L'ancien logo est deux jetons G (blanc et bleu) et T (jaune) : ne pas s'en inspirer.

## Interdits absolus
- Aucune arme, lame, couteau, cible ni viseur, alors même que le nom évoque « tranchant » et qu'il existe des Shooting Clubs.
- Aucune image d'alcool : verre, bouteille, coupe.
- Aucun cliché casino lourd : dés, cartes, as, jetons, roulette, trèfle.
- Ne copier aucune marque existante.

## Couleurs actuelles du site (libres de les faire évoluer)
| Rôle | Valeur |
|---|---|
| Bleu nuit, fond | #0B1B2E |
| Marine | #132A45 |
| Bleu | #335F94 |
| Jaune or | #F9C83B |
| Bordeaux | #BA2637 |
| Papier | #F5F1EA |

## Polices disponibles localement
Fichiers dans `/fonts/`, déclarés dans `/fonts.css` :
- **Archivo :** graisses 400 à 800, chasse 100 à 125 %.
- **Manrope :** graisses 200 à 800.
- **Inter.**

Google Fonts est autorisé, en lien `<link>`. Pour une écriture vraiment propriétaire, dessiner les lettres en tracés SVG est un plus.

## Livrables
Tout va dans `maquettes/logos/<slug>/` :
1. **`logo.svg` :** le logo principal (symbole et nom), version sur fond sombre.
2. **`logo-clair.svg` :** la version sur fond clair.
3. **`symbole.svg` :** le symbole seul, carré, qui doit être lisible à 32 px (favicon).
4. **`planche.html` :** une page autonome qui présente la direction. Elle contient :
   - le nom et le concept en 2 ou 3 phrases ;
   - le logo en grand, sur fond sombre et sur fond clair ;
   - la version monochrome ;
   - le symbole à 128, 64 et 32 px ;
   - la palette et la typographie ;
   - 4 mises en situation : en-tête du site, carte de visite, icône d'appli, enseigne sur façade la nuit.
   Le tout en SVG et CSS, sans image externe, mis en page avec soin.
5. **`da.md` :** le concept, la construction du symbole, la palette, les typos, les règles d'usage et la déclinaison possible en 3D animée pour l'ouverture du site. 15 à 30 lignes maximum.

## Vérification obligatoire
Le projet est servi sur http://127.0.0.1:8797/, donc la planche est à `http://127.0.0.1:8797/maquettes/logos/<slug>/planche.html`.
- **Capture :** lancer `node /private/tmp/claude-501/-Users-mac-jb-Desktop-CLIENTS-Groupe-Tranchant-groupe-tranchant/2004d2b4-4544-4b6b-8fcb-1b2779144406/scratchpad/hdr/cap.mjs <sortie.png> 1440 900 <url> "js optionnel"`, qui utilise Chrome sans fenêtre.
  - Pour capturer toute la hauteur, passer en JS `document.body.style.zoom=1` et utiliser une hauteur de fenêtre plus grande (par exemple 1440 × 3200).
  - Les captures de travail vont dans le dossier scratchpad, pas dans le projet.
- **Contrôle :** regarder les captures et corriger jusqu'à un résultat digne d'une agence d'identité haut de gamme. Vérifier le symbole à 32 px.
- **Limites :** ne rien modifier en dehors de `maquettes/logos/<slug>/`. Pas de commit. Rien à télécharger.
