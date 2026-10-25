# Groupe Tranchant — mise en ligne

## En bref

Le site est **100 % statique** : aucune base de données, aucun PHP, aucun compte à créer.
Il suffit de déposer **le contenu du dossier `dist/`** à la racine de l'hébergement (par FTP/SFTP ou via le gestionnaire de fichiers de l'hébergeur).

```
node tools/build.mjs      # régénère dist/ après toute modification
```

Poids total : environ 2 Mo (dont 670 Ko pour la bibliothèque 3D, 300 Ko de polices, 600 Ko de relief et contours).

## Structure et textes

Le site suit la nouvelle structure décrite dans `PROPOSITION-STRUCTURE.md` : 14 pages.
- Les 7 adresses du site actuel sont conservées : `/`, `/activites-principales/`, `/activites-specialisees/`, `/activites-sportives/`, `/carrieres/`, `/mentions-legales/`, `/contact/`.
- Deux pages sont ajoutées : `/groupe/` (présentation, stratégie, engagements, index égalité) et `/nos-destinations/` (maquette 3D et annuaire filtrable des 22 établissements).
- Chaque offre d'emploi a sa propre page, sous `/carrieres/offres/…/`.

**Tous les textes sont repris à l'identique** du site actuel (titres, paragraphes, boutons, fiches métiers, offres d'emploi, tableau de l'index égalité, mentions légales, mention « jeux d'argent ») : ils sont seulement déplacés et mis en forme.

Trois libellés courts sont nouveaux et **restent à faire valider par le groupe** : « Nos destinations » (menu), « Tous » (filtres) et « Index égalité Femmes-Hommes » (sommaire, menu et pied de page). Ils sont définis en un seul endroit, en tête de `tools/build.mjs`, et le contrôle des textes les signale à chaque passage.

Les offres d'emploi se modifient dans `src/offres.html`. Leurs pages, les cartes de Carrières, la liste de l'accueil et les pastilles « OFFRES D'EMPLOI » de l'annuaire sont régénérées automatiquement.

Deux contrôles automatiques le vérifient, à relancer après toute modification :

```
node tools/build.mjs           # génère dist/
node tools/check-textes.mjs    # chaque texte du nouveau site existe à l'identique sur le site actuel
node tools/check-complet.mjs   # chaque texte du site actuel est présent dans le nouveau site
```

Les pages du site actuel servant de référence sont enregistrées dans `reference/` (relevé du 25 octobre 2026). Si le groupe modifie un texte, le modifier dans `src/pages/` puis mettre à jour `reference/` avec la version validée.

## Préproduction publique (GitHub Pages)

À chaque envoi sur la branche `main` du dépôt GitHub, le site est contrôlé puis publié automatiquement (`.github/workflows/pages.yml`) :
1. **Contrôle juridique** : si un texte diffère du site actuel, la publication est bloquée.
2. **Génération** pour le sous-dossier GitHub Pages, avec l'option `BASE`.
3. **Mode préproduction** (option `PREVIEW`) : la balise `noindex` et un `robots.txt` fermé empêchent Google d'indexer cette copie, qui ne concurrence donc pas le site officiel.

Pour reproduire ce rendu en local :

```
BASE=/groupetranchant PREVIEW=1 node tools/build.mjs
```

Pour la mise en ligne définitive sur le domaine du groupe, générer **sans** ces deux options : `node tools/build.mjs`.

Les pages d'offres déclarent des données structurées JobPosting (Google for Jobs). Leur date de publication est provisoirement celle du relevé (25/10/2026) : la remplacer par les vraies dates fournies par le groupe (`REF_DATE` dans `tools/build.mjs`).

## Ce que contient `dist/`

| Élément | Rôle |
|---|---|
| `index.html` et un dossier par page | Les 7 pages, avec tout le contenu écrit dans le HTML (lisible par Google même sans JavaScript) |
| `site.js` | Interface : défilement, apparitions, compteurs, formulaire de contact |
| `scene.js`, `stage.js`, `data.js` | Les scènes 3D (ouverture sur l'Accueil, maquette de la France sur Nos destinations), chargées seulement sur ces pages et si l'appareil gère la 3D |
| `vendor/` | Three.js 0.160, GSAP 3.12.5, Lenis 1.1.13, police des lettres 3D — servis depuis le site |
| `fonts/`, `fonts.css` | Archivo et Inter hébergées sur le site (aucun appel à Google Fonts) |
| `data/` | Relief réel de la France (tuiles Terrarium) et contours France + Suisse (Natural Earth, domaine public) |
| `img/` | Favicon, icônes, logo, image de partage, logos 18 ans et prévention du jeu |
| `robots.txt`, `sitemap.xml`, `site.webmanifest` | Référencement |
| `.htaccess` | Compression, cache, en-têtes de sécurité, redirection HTTPS + www (serveurs Apache) |

## Avant la mise en ligne : à vérifier

1. **Nom de domaine** : les balises canoniques, Open Graph, le sitemap, le robots.txt et la redirection du `.htaccess` utilisent `https://www.groupetranchant.com/`. Si le site est publié ailleurs (préproduction, autre domaine), remplacer cette adresse dans ces fichiers.
2. **Photos** : elles sont encore chargées depuis le site actuel (`groupetranchant.com/wp-content/uploads/…`) et sont en petite définition (480 px de large pour la plupart). Pour la mise en ligne, récupérer les originaux en haute définition auprès du groupe, les placer dans `img/` et mettre à jour l'adresse `IMG` dans `data.js`. **Attention** : si l'ancien site WordPress est supprimé, ces photos disparaîtront.
3. **Chiffres (repris tels quels du site actuel)** : le texte annonce « dix-sept casinos » alors que 18 casinos figurent dans les destinations (dont le Grand Casino Prilly) ; le compteur indique « 18 Restaurants » alors que le texte parle de « plus de 50 restaurants ». Ces écarts existent sur le site actuel ; à faire trancher par le groupe s'il souhaite les corriger.
4. **Prilly** : aucun site web n'est indiqué pour le Grand Casino Prilly ; le nom s'affiche sans lien.
5. **Formulaire de contact** : le site étant statique, le bouton « Envoyer » ouvre la messagerie du visiteur avec le message prérempli, adressé à information@groupetranchant.com. Pour un envoi direct sans messagerie, brancher le formulaire sur un service d'envoi (ou le PHP de l'hébergeur).
6. **Mentions obligatoires** : le bandeau « Jeux d'argent » et le 18+ sont présents en pied de page. Le site ne dépose aucun cookie et n'appelle aucun service tiers (hors photos) : pas de bandeau cookies nécessaire tant qu'aucun outil de mesure d'audience n'est ajouté.

## Serveur Nginx (si l'hébergement n'est pas sous Apache)

```nginx
location / { try_files $uri $uri/ =404; }
location ~* \.(css|js)$ { add_header Cache-Control "public, max-age=31536000, immutable"; }
location ~* \.(woff2)$ { add_header Cache-Control "public, max-age=31536000, immutable"; }
location ~* \.(png|jpg|svg|json)$ { add_header Cache-Control "public, max-age=2592000"; }
location = /index.html { add_header Cache-Control "no-cache"; }
gzip on; gzip_types text/css text/javascript application/json image/svg+xml;
```

## Après la mise en ligne

- Déclarer le sitemap dans **Google Search Console** (`https://www.groupetranchant.com/sitemap.xml`).
- Tester l'aperçu de partage avec le **débogueur LinkedIn / Facebook** (image `img/og-groupe-tranchant.jpg`).
- Vérifier les données structurées avec l'**outil de test des résultats enrichis** de Google.

## Comportements prévus

- **Mobile ou appareil modeste** : pas de flou de profondeur, ombres et reflets allégés.
- **« Réduire les animations » activé** dans le système : défilement direct, pas d'effets de profondeur ni de bande défilante.
- **Appareil sans 3D (WebGL)** : la page s'affiche normalement, les textes des scènes 3D deviennent des sections classiques. Pour voir ce rendu sur n'importe quel ordinateur, ajouter `?no3d` à l'adresse.
- **JavaScript désactivé** : tout le contenu reste lisible.
- **La carte 3D** n'est construite qu'à l'approche de la section Implantations, pour accélérer l'arrivée sur la page.
