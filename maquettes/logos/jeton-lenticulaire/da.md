# Jeton lenticulaire (v3) · Groupe Tranchant

**Concept.** Le casino est le métier d'origine du groupe : le logo est un jeton de table rouge, reconnaissable au premier regard. Son centre est un réseau lenticulaire, comme un écran Alioscopy, ce qui en fait « le jeton qui change de face ». De face, on lit **GT**. Incliné à gauche, il montre **♠** ; incliné à droite, **♥** ; au revers, **♣** et **♦**. En un tour sur la tranche, on voit défiler les quatre enseignes, puis le jeton retombe sur GT.

**Construction (calculée).**
- **Corps :** Ø 240, tranche de 18, en rouge casino.
- **Inserts de tranche :** 8 inserts rectangulaires de 22 × 20,5 (ivoire, filet noir de 4, ivoire), tous les 45°. On les retrouve sur la tranche en 3D et en colonnes sur les piles.
- **Couronne dentelée :** 64 dents ivoire de 2,6 × 4, entre r 93 et r 97.
- **Liseré or :** r 90,5.
- **Microtexte :** GROUPE TRANCHANT · CASINOS · HÔTELS · DIVERTISSEMENT · 1988, vectorisé lettre par lettre, avec un interlettrage calculé pour boucler exactement 360°.
- **Centre :** liseré ivoire à r 78,5, centre ivoire de rayon 77.
- **Lentille :** une boîte de 128 portant 15 lames au pas de 8,53, avec 3 vues entrelacées. La vue de la lamelle i vaut V + ½·((i+½)/15 − ½) (parallaxe) et sa fenêtre fait une demi-vue. La rotation φ choisit la vue : V = 1 + 2·sin φ (borné). Le verso a sa propre lentille (♣ · GT · ♦).
- **GT :** dessiné sur la grille des lames. Chaque lettre fait 6 lames de large et 84 de haut, avec des fûts de 2 lames. Le G est noir, le T rouge : ce sont les deux couleurs du jeu, et les enseignes suivent la même règle.

**Logotype.** Archivo étendu 125 % vectorisé. GROUPE (graisse 520) au-dessus de TRANCHANT (graisse 560, + 12 %), puis la signature CASINOS · HÔTELS · DIVERTISSEMENT (graisse 520, + 28 %), en or sur fond sombre et en rouge sur fond clair. Le bloc est centré sur l'axe du jeton.

**Favicon.** `symbole.svg` sur une grille de 32 px : un disque rouge, 8 inserts ivoire de 4 px, un centre ivoire de rayon 11,6 et GT en pixels entiers (traits de 2 px, G noir, T rouge). On lit à la fois un jeton et GT, jusqu'à 16 px.

**Palette.** Rouge casino #C8203A, Noir laqué #0D0D11, Ivoire #F3ECDD, Vert tapis #0E5A3C (fond de scène), Or #C9A45C (en touche seulement : liseré, signature, marquise).

**Typographies.** Archivo étendu (500 à 700) pour les titres, Manrope (300 à 700) pour le texte.

**Règles d'usage.**
- À l'impression, on utilise toujours l'état fixe GT, en quadri ou en tons directs (rouge, noir, ivoire, et or à chaud). Le monochrome est au trait, dans une seule encre.
- Les enseignes n'existent qu'en mouvement (écran, enseigne, plaques en série) et ne remplacent jamais le logo seul.
- Sous 48 px, on passe au favicon. Zone de protection : ¼ du diamètre. On ne place jamais deux jetons côte à côte comme logo.

**Ouverture du site en 3D (environ 4 s).** Sur un tapis vert, un jeton est lancé en Three.js et tourne sur sa tranche. On voit défiler ♥, ♣, GT, ♦ et ♠, et les inserts ivoire balaient la lumière. Il retombe à plat sur GT, puis six jetons s'empilent dessous en alignant leurs inserts. La caméra recule et le nom se pose avec la signature CASINOS · HÔTELS · DIVERTISSEMENT. Sur mobile, l'inclinaison du téléphone pilote la rotation.
