# Groupe TRANCHANT — proposition de nouvelle structure

Synthèse de trois analyses (inventaire des textes et architecture, benchmark de 8 sites de groupes : Barrière, Partouche, JOA, Monte-Carlo SBM, Casinos Austria, Accor, LVMH, Groupe Rocher, et analyse des publics et du référencement).

**Règle conservée : tous les textes restent mot pour mot ceux du site actuel.** On déplace, regroupe et met en scène ; on ne réécrit pas. Les libellés de menu et de section reprennent des intitulés qui existent déjà. Les rares nouveaux libellés indispensables sont listés à la fin, pour validation.

---

## 1. Le diagnostic en bref

- **L'accueil répète les pages activités** (cartes « Parcourir » qui mènent toutes au même endroit, filiales reprises avec d'autres libellés) et **mélange tous les publics** : grand public, institutions, filiales B2B, candidats, index réglementaire.
- **« Activités principales / spécialisées / sportives »** sont des catégories internes : le visiteur ne sait pas où trouver un casino, un hôtel ou une filiale.
- **Les filiales technologiques (B2B)** sont noyées entre les loisirs et le sport.
- **Les 22 établissements n'ont pas d'annuaire** : les clients qui cherchent « leur » casino finissent sur des annuaires tiers.
- **Les offres d'emploi sont tout en bas de Carrières**, sans adresse propre : Google ne peut pas les afficher dans ses résultats emploi, Hellowork et France Travail captent les candidats.
- **L'index égalité, contenu réglementaire, est sur l'accueil.**

## 2. Les publics, par ordre d'importance

1. **Candidats** — une offre près de chez eux, comment postuler.
2. **Clients** qui cherchent leur établissement (puis son site).
3. **Prospects B2B** des filiales (opérateurs de jeux, sécurité, grands comptes).
4. **Communes, institutions, presse** — histoire, implantations, engagements (les casinos sont attribués par délégation de service public).
5. **Organisateurs de séminaires et d'événements.**
6. **Salariés et inspection** — l'index égalité.
7. **Passionnés** d'aviation ou de tir.

## 3. La nouvelle arborescence

```
En-tête :  [logo → Accueil]
           PRÉSENTATION DU GROUPE · Activités principales ▾ · Nos destinations* · Activités sportives · Activités spécialisées ▾
           [Carrières]  [Contact]  18+

/                                   Accueil — une page qui oriente chaque public
/groupe/                            PRÉSENTATION DU GROUPE                         (nouvelle page)
/activites-principales/             Activités principales                          (adresse conservée)
/nos-destinations/                  Nos destinations de jeux et de loisirs         (nouvelle page)
/activites-specialisees/            Activités spécialisées — pôle B2B              (adresse conservée)
/activites-sportives/               Activités sportives                            (adresse conservée)
/carrieres/                         Carrières                                      (adresse conservée)
/carrieres/offres/<ville-poste>/    une page par offre d'emploi (×5)               (nouvelles pages)
/contact/                           Contact                                        (adresse conservée)
/mentions-legales/                  Mentions légales — sortie du menu, en pied de page
```
\* libellé court à valider (voir § 6).

Les 7 adresses actuelles sont conservées : aucun lien existant ne casse.

## 4. Le contenu de chaque page

### Accueil — orienter en un coup d'œil
1. **Ouverture 3D (Monogramme)** : « Bienvenue dans le / Groupe TRANCHANT » + la phrase « Dans chaque établissement de jeux, les équipes dirigeantes ont deux priorités… ».
2. **Chiffres clés** (17 Casinos, 1 Club de jeu, 3 Hôtels, 18 Restaurants, 3103644 Visiteurs, 1181 Collaborateurs) en rouleaux.
3. **Activités principales** : les 5 cartes, remises dans l'ordre des sections ; chaque « Parcourir » mène enfin à **sa** section.
4. **Nos destinations de jeux et de loisirs** : aperçu de la maquette 3D de la France, qui ouvre l'annuaire.
5. **Activités sportives** : Patrouille et Shooting Clubs.
6. **ACTIVITÉS SPÉCIALISÉES** : les 5 filiales, qui mènent à leur section du pôle B2B.
7. **Attirer et fidéliser les talents** + les intitulés des offres en cours, chacun cliquable.

### PRÉSENTATION DU GROUPE (nouvelle page, textes de l'accueil actuel)
1. La présentation (1988, Monuments Historiques).
2. **Stratégie de croissance et d'expansion**.
3. **ENGAGEMENTS ET VALEURS** : « Appliquer une démarche sociétale » (jeu responsable) avec la Brochure.
4. **L'index relatif à l'égalité Femmes-Hommes (Données 2025)** — ancre stable `#index-egalite`, liée depuis le pied de page ; sur mobile, une carte par établissement au lieu d'un tableau illisible.

### Activités principales
Les 5 sections (casinos et club, hôtels, restaurants et bars, concerts et spectacles, réceptions et séminaires), chacune avec son ancre. Sous les casinos, la liste des casinos ; les 3 boutons hôtels mènent aux hôtels dans l'annuaire.

### Nos destinations de jeux et de loisirs (nouvelle page)
**L'annuaire des 22 établissements**, hôtels compris (ils manquent aujourd'hui dans la grille) :
- la **maquette 3D de la France** en tête, synchronisée avec la liste ;
- filtres **Casinos / Hôtels / Club de jeu** (repris de la légende) ;
- chaque carte : photo, nom, ville, lien vers le site de l'établissement, et pastille « OFFRES D'EMPLOI » quand il recrute (Seven Casino, Casino Terrazur, Paris Élysées Club).

**Pas de page par établissement** : chaque établissement a déjà son site, qui doit rester la page qui ressort sur Google ; une fiche groupe sans texte propre lui ferait concurrence et obligerait à faire rédiger et valider 22 textes. (Option possible plus tard, si le groupe fournit les textes.)

### Activités spécialisées — le pôle B2B
Une identité visuelle à part (plus « technologie », grille nette), un sommaire des 5 filiales, puis les 5 sections avec leur nom en surtitre et une ancre propre (`#cat`, `#certus`, `#alioscopy`, `#zalix`, `#ids`). En introduction, le paragraphe « Ses principales filiales illustrent les ambitions du groupe… » (déplacé de la stratégie — à valider).

### Activités sportives
Inchangée, avec un lien vers IDS (partenaire des Shooting Clubs).

### Carrières — les offres d'abord
1. Nous rejoindre, Construire votre parcours.
2. **OFFRES D'EMPLOI** remontées en haut, filtrables par ville, **chacune avec sa propre page** (texte intégral + données structurées JobPosting pour Google for Jobs).
3. Principaux métiers : les 11 fiches ; « Voir les offres d'emploi (n) » filtre les offres du métier, avec un nombre calculé automatiquement (les ancres actuelles sont fausses).

### Contact et Mentions légales
Textes inchangés. Mentions légales sorties du menu principal, accessibles depuis le pied de page.

### Pied de page (sur toutes les pages)
Colonnes titrées avec des intitulés existants (Activités principales, Activités sportives, ACTIVITÉS SPÉCIALISÉES, PRÉSENTATION DU GROUPE, Carrières), ligne légale (Mentions légales, POLITIQUE DE TRAITEMENT DES DONNÉES À CARACTÈRE PERSONNEL, CHARTES COOKIES), et **la mise en garde « jeux d'argent », le 18+ et le logo de prévention sur toutes les pages**, nouvelles pages comprises.

## 5. Les idées de design

- **Accueil** : l'ouverture 3D reste la signature ; le reste devient une page d'aiguillage rythmée (chiffres en rouleaux, grandes cartes, aperçu de la maquette).
- **Annuaire** : la maquette 3D devient un vrai outil — filtrer « Hôtels » fait se lever les punaises jaunes, survoler une carte de la liste éclaire sa punaise, et inversement.
- **Pôle B2B** : un univers graphique distinct pour signaler qu'on change de public.
- **Groupe** : mise en page éditoriale longue, avec un sommaire latéral qui suit la lecture.
- **Carrières** : liste d'offres filtrable, en cartes ; pages d'offre sobres, avec un bouton de candidature toujours visible.
- **Partout** : les effets d'apparition des textes déjà en place (lettres 3D, lecture mot à mot, rideaux).

## 6. Nouveaux libellés à faire valider (liste minimale)

| Réf. | Où | Proposition | Repli sans nouveau texte |
|---|---|---|---|
| V1 | Menu | « Nos destinations » | le titre complet « Nos destinations de jeux et de loisirs » |
| V2 | Filtres de l'annuaire et des offres | « Tous » | aucun filtre actif par défaut |
| V3 | Pied de page | « Index égalité Femmes-Hommes » | le titre complet de l'index |

Données (pas des textes) à fournir par le groupe pour les pages d'offre : date de publication et date limite de chaque offre, adresse de l'établissement.

## 7. Points à trancher par le groupe

1. **17 ou 18 casinos** : le texte dit « dix-sept », la liste en compte 18 avec le Grand Casino Prilly (dont il manque aussi l'adresse du site).
2. **« 18 Restaurants » ou « plus de 50 restaurants »** : les deux figurent sur le site actuel.
3. **Mise en garde « jeux d'argent »** : faire confirmer par le juriste que la formule actuelle est toujours celle en vigueur.
4. **Mentions légales** : la clause qui interdit tout lien vers le site freine le référencement ; la politique de données ne couvre pas le formulaire de contact et parle d'un « onglet Carrières » qui n'existe pas.
5. **Index égalité** : expliquer « CLMCE » ; la note « ** » ne renvoie à rien dans le tableau.
6. **Casse** : afficher « PRÉSENTATION DU GROUPE » en casse normale dans le menu compte-t-il comme « mot pour mot » ?
7. **Langues** : une version anglaise (et allemande) pour les établissements suisses et les clients B2B ?
