# Lenticulaire · Groupe Tranchant

**Concept.** Le symbole est une image lenticulaire, comme les écrans 3D sans lunettes d'Alioscopy, une société du groupe. Quinze lamelles verticales montrent une figure différente selon l'angle de vue : la **Lune** vue de gauche (la nuit : casinos, hôtels, restaurants, scènes), l'**Initiale** T vue de face (la famille, depuis 1988) et l'**Aile** vue de droite (la Patrouille et les loisirs sportifs). La technologie n'est pas une quatrième figure : c'est le procédé qui porte les trois autres.

**Construction (calculée).** Carré de 120, 15 lamelles au pas de 8 : lame de 5 et jour de 3. Sous chaque lamelle, trois bandes de 2,67 sont entrelacées, une par figure. La lamelle i est vue en v = V + ½·((i+½)/15 − ½), ce qui reproduit la parallaxe d'un vrai réseau. Sa lentille montre une fenêtre d'une demi-vue, étirée sur la lame. Les transitions balaient donc la figure d'un bord à l'autre au lieu de fondre. L'état fixe correspond à V = 1 : le T avec une barre de 36 (3/10) et un fût de 5 lamelles (de la 6ᵉ à la 10ᵉ), lames paires en Rouge, lames impaires en Bleu.

**Logotype.** Archivo étendu 125 %, graisse 560, interlettrage de + 12 %, vectorisé. La capitale de TRANCHANT mesure exactement 36, la hauteur de la barre du T, et le nom démarre sur la 19ᵉ lamelle : il prolonge la barre. GROUPE (graisse 520, + 50 %, hauteur 9,6) se pose au pied du fût.

**Favicon.** `symbole.svg` est redessiné sur la grille de 32 px : 7 lames de 2 px au pas de 4, une barre de 8 px et un fût de 3 lames, chaque bord tombant sur un pixel entier.

**Palette.** Rouge Aile #FF2E4C, Bleu Lune #2D55FF, Encre #0A0A10, Papier #F2EFE8. Les deux encres sont toujours côte à côte et jamais mélangées : à distance, l'œil fabrique un violet. Sur fond noir, le rouge semble plus proche que le bleu (chromostéréopsie) : le relief est déjà dans la couleur. Les fonds et les écrans d'attente utilisent un moiré généré à partir de deux trames de même pas, l'une tournée de 2 à 5°.

**Typographies.** Archivo étendu (500 à 700) pour les titres, Manrope (300 à 700) pour le texte et les interfaces.

**Règles d'usage.**
- À l'impression, on utilise toujours l'état fixe (l'Initiale) en deux tons directs, ou en monochrome Papier ou Encre. Pas de dégradé ni d'ombre.
- La Lune et l'Aile n'existent qu'en mouvement (écran, enseigne, objet lenticulaire) ou dans une suite de trois images. Elles ne remplacent jamais le logo seul.
- Les lamelles sont générées par le calcul et jamais redessinées. Sous 48 px, on passe au symbole à 7 lames.
- Zone de protection : 3 lamelles (24) autour du logo. Taille minimale : 20 px de haut pour le logo, 16 px pour le symbole.

**Ouverture du site en 3D (environ 4 s).** Une feuille de 15 lames en Three.js flotte dans le noir et la caméra glisse latéralement devant elle. La Lune bleue se découpe, puis les lames pivotent sur leur axe et la figure balaie vers le T rouge et bleu, puis vers l'Aile. La caméra revient de face : le T se fige, le nom glisse sur la barre et le moiré s'estompe en fond. Sur mobile, l'inclinaison du téléphone pilote la caméra.
