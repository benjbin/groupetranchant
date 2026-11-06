# Jeton lenticulaire · Groupe Tranchant

**Concept.** Le casino, métier d'origine du groupe, donne la forme : un jeton en céramique. La technologie du groupe (Alioscopy) en fait l'idée : le centre du jeton est un réseau lenticulaire. De face, il montre le monogramme **GT** (un G bleu et un T rouge taillés dans les mêmes lames) ; incliné à gauche, la **Lune** (casinos, hôtels, restaurants, scènes) ; incliné à droite, l'**Aile** (la Patrouille et les loisirs sportifs). Un même jeton montre une autre face du groupe selon le côté d'où on le regarde.

**Construction (calculée).**
- **Corps :** Ø 240 en céramique mate, tranche de 18.
- **Inserts de tranche :** 8 inserts de 22,5°, de r 100 à 120. Chacun est fait de 3 lamelles radiales de 5,5° séparées de 3°.
- **Liserés et microtexte :** liseré à r 97. Entre les deux liserés court le microtexte GROUPE TRANCHANT · FRANCE · EUROPE · AFRIQUE · 1988, vectorisé lettre par lettre, avec un interlettrage calculé pour boucler exactement 360°. Second liseré à r 80.
- **Centre :** une lentille de 128 de côté portant 15 lames au pas de 8,53, avec 3 vues entrelacées. Le GT est dessiné sur la grille des lames : chaque lettre fait 6 lames de large et 84 de haut, avec des fûts de 2 lames et une contreforme de 2 lames ; le G a des arrondis r 24 / r 8 et son éperon tient sur 3 lames, le T a son fût sur les lames 11 et 12. Le bloc est centré dans le disque. La Lune et l'Aile sont ramenées à 104 pour rester dans le centre. La vue de la lamelle i vaut V + ½·((i+½)/15 − ½) (parallaxe), et sa fenêtre fait une demi-vue.
- **Inserts lenticulaires :** chaque insert est lui aussi une lentille radiale : en mouvement, l'anneau passe au bleu (Lune) ou au rouge (Aile).
- **Rotation :** en 3D, l'angle de rotation du jeton choisit la vue, V = 1 + 2·sin φ (borné). Un tour complet sur la tranche fait défiler Aile, Lune, GT, et la tranche montre les inserts comme sur une pile.

**État fixe.** Le jeton vu de face : GT, le G en Bleu et le T en Rouge (plus lisible que des lames alternées, qui mélangeaient les deux lettres), avec les inserts alternés rouge et bleu. **Choix des vues :** GT reste sur la face, partout où le logo est figé (impression, favicon, jeton posé, enseigne au repos), et les inclinaisons gardent la Lune et l'Aile, parce qu'un G seul ou un T seul découperait le monogramme au lieu de le renforcer. Le monochrome est au trait, dans une seule encre (contour, inserts, liserés, microtexte et lames), le fond passant au travers.

**Logotype.** Archivo étendu 125 %, graisse 560, + 12 %, vectorisé. GROUPE (graisse 520, + 50 %) au-dessus de TRANCHANT. Le bloc est centré sur l'axe horizontal du jeton.

**Favicon.** `symbole.svg` sur une grille de 32 px : un disque, 8 inserts pleins (r 13,5 à 16) et GT en lames épaissies jointives, avec des traits de 2 px sur des pixels entiers (G et T de 8 × 12 px, approche de 2 px). Sans microtexte ni liseré. Le GT reste lisible à 16 px.

**Palette.** Rouge Aile #FF2E4C, Bleu Lune #2D55FF, Céramique #15151E, Encre #0A0A10, Papier #F2EFE8. Les deux encres sont toujours côte à côte et jamais mélangées. Sur fond noir, le rouge semble avancer devant le bleu (chromostéréopsie).

**Typographies.** Archivo étendu (500 à 700) pour les titres, Manrope (300 à 700) pour le texte.

**Règles d'usage.**
- À l'impression, on utilise l'état fixe en deux tons directs, ou le monochrome au trait. Pas de dégradé ni d'ombre portée.
- La Lune et l'Aile n'existent qu'en mouvement (écran, enseigne, plaques en série). Elles ne remplacent jamais le logo seul.
- Sous 48 px, on passe au favicon. Zone de protection : ¼ du diamètre du jeton.
- On ne représente jamais le jeton avec des dés, des cartes ou une roulette, et on n'en aligne jamais deux côte à côte.

**Ouverture du site en 3D (environ 4 s).** Un jeton tombe en Three.js et se pose à plat : on voit GT. Il se redresse sur sa tranche et tourne deux fois. À chaque passage, le centre bascule (Aile, Lune, GT) et les inserts virent au rouge puis au bleu. Il retombe de face sur GT, puis six autres jetons s'empilent dessous et alignent leurs lamelles. La caméra recule et le nom se pose à droite. Sur mobile, l'inclinaison du téléphone pilote la rotation.
