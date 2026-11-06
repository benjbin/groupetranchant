# Voltige · Groupe Tranchant

**Concept.** Le logo est une trajectoire. Une seule ligne continue, tracée comme la traînée de fumigène de la Patrouille Tranchant, écrit un looping : elle entre à plat, boucle par-dessus elle-même puis ressort en montant. Le groupe se signe d'un geste plutôt que d'un emblème. Un point corail, la tête de patrouille, termine la trace.

**Construction.** La ligne est un tronçon exact de trochoïde allongé (x = t − r·sin t, y = −r·cos t, r = 3,8), c'est-à-dire la vraie trace d'un avion qui boucle en avançant. On garde un seul looping, entre le bas de boucle et la ressource suivante. La figure est inclinée de −10°, étirée de 25 % en hauteur et penchée de 15 % vers l'avant. L'épaisseur est calculée comme une plume large à −35° : attaque fine, plein dans la boucle, sortie effilée jusqu'à zéro. Le contour est ensuite converti en Bézier cubiques. Le point corail est posé dans l'axe de la sortie. Le favicon (`symbole.svg`) raccourcit les traînes et nourrit le trait (plein × 1,75) pour rester lisible à 32 et 16 px.

**Logotype.** TRANCHANT en Archivo 540, chasse 112 %, interlettrage 0,17 em, vectorisé. Le nom est posé sur l'horizon de la figure : sa ligne de base prolonge le point le plus bas de la traînée. Le nom reste au sol et le geste part dans le ciel.

**Palette.** Ciel #1F33C9 (fond de marque), Stratosphère #0B1240 (nuit, texte), Nuage #F4F2EC (la fumée, le papier), Fumigène #FF5B3A (le point, et rien d'autre), Brume #E4E8F1 (surfaces).

**Typographies.** Archivo 540 à 600, chasse 112 %, pour le nom et les titres. Manrope 300 à 700 pour le texte et les interfaces.

**Règles d'usage.**
- Sur Ciel : trait Nuage et point Fumigène. Sur clair : trait Ciel et point Fumigène. Monochrome : une seule couleur, point compris.
- La ligne ne se redessine pas, ne se coupe pas et ne s'épaissit pas. Elle ne reçoit ni dégradé ni ombre, et ne se double pas.
- Le corail ne sert qu'au point et ne dépasse jamais 3 % d'une surface.
- Zone de protection : la hauteur de la boucle ÷ 3. Taille minimale : 20 px de haut pour le logo, 16 px pour le symbole.
- Système : la traînée, recadrée en très grand et à 15 % d'opacité, sert de fond de page (site, carte de visite). Chaque figure (tonneau, huit cubain) peut devenir un motif secondaire, et le logo garde toujours le looping.

**Animation et ouverture 3D (environ 4 s).** Dans un ciel Ciel dégradé, une tête lumineuse trace la ligne (masque en stroke-dashoffset, accélération puis décélération). Elle sème des particules de fumée qui gonflent et dérivent avec le vent. À la ressource, la trace se dissipe légèrement : un double turbulent et flou s'efface. Le point corail éclot dans une bouffée de fumée corail, le nom se pose lettre par lettre, puis tout se fige. En 3D (Three.js), le trochoïde devient une vraie trajectoire dans l'espace, avec une caméra qui suit l'avion de loin. La traînée est un ruban de particules volumétriques ; la caméra se cale enfin de profil, là où la boucle se lit comme le logo.
