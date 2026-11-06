# Série 3 : le jeton de casino

Lis d'abord `BRIEF.md`, dans ce même dossier, pour le client, les livrables et la vérification.

**Une règle de ce brief change.** Le client rappelle que son métier d'origine, c'est le **casino**. Le logo doit donc partir du **jeton de casino** (jeton de poker, plaque). L'interdit sur les jetons ne s'applique plus.

## Toujours interdits
- Aucune arme, lame, cible ni viseur.
- Aucune image d'alcool.
- Ni dés, ni cartes, ni as, ni roulette, ni trèfle.
- Ne pas reprendre l'ancien logo : deux pièces côte à côte, un G blanc et bleu, un T jaune. Le nouveau doit être nettement différent.

## Ce qui est attendu
- **Un vrai savoir-faire du jeton :** liserés, inserts de couleur sur la tranche (« edge spots »), anneaux, centre imprimé, matières (argile, céramique, nacre), plaques rectangulaires des grands casinos. Il faut s'en servir intelligemment, pas en clip-art.
- **Un logo haut de gamme :** crédible pour un groupe sérieux et mémorable, pas un jeton de poker générique.
- **Les mêmes livrables que `BRIEF.md` :** `logo.svg`, `logo-clair.svg`, `symbole.svg`, `planche.html` et `da.md`.
- **Une planche animée :** le jeton qui tourne, qui se pose, qui s'empile, avec un moment « waouh ». Elle reste en SVG, CSS ou canvas, sans image externe.
- **Une version fixe impeccable** pour l'impression et le favicon. Le favicon doit rester lisible à 32 px.

## Vérification
- Faire des captures à 1440 px de large, puis à 390 px de large pour le mobile, à plusieurs moments de l'animation.
- Utiliser le script de capture : `node /private/tmp/claude-501/-Users-mac-jb-Desktop-CLIENTS-Groupe-Tranchant-groupe-tranchant/fce1a243-086c-4171-8997-6f178713ce0f/scratchpad/cap.mjs <sortie.png> <largeur> <hauteur> <url> "js optionnel"`.
- Ranger les captures de travail dans `/private/tmp/claude-501/-Users-mac-jb-Desktop-CLIENTS-Groupe-Tranchant-groupe-tranchant/fce1a243-086c-4171-8997-6f178713ce0f/scratchpad/<slug>/`.
- Ne mettre aucun nom de personne réelle : écrire « Prénom Nom ».
- Le serveur local est http://127.0.0.1:8797/ : la planche est donc à `/maquettes/logos/<slug>/planche.html`.
- Ne rien modifier en dehors de `maquettes/logos/<slug>/`. Pas de commit.
