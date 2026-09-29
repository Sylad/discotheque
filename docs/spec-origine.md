<!-- Copie telle quelle de la spec de Sylvain (Desktop/specDisco.txt), reçue le 2026-09-29. Ne pas modifier : les évolutions vont dans docs/design.md. -->

Discothèque:

# Discothèque — Retrouver ses disques physiques

## Objectif

Une application personnelle permettant de retrouver un film, une série ou un disque bonus dans plusieurs classeurs, à partir d’un catalogue alimenté principalement par des photos.

Recherche typique : **« Seigneur des anneaux »**.

L’application affiche les exemplaires possédés, leurs éditions et leur emplacement exact. Elle conserve séparément les DVD, Blu-ray, versions longues, disques bonus et exemplaires en double.

Aucun classement alphabétique physique n’est nécessaire.

## 1. Repérer les emplacements sans ambiguïté

Chaque classeur possède un nom et un numéro : « Classeur 1 », « Classeur 2 », etc. Une couleur ou une photo peut faciliter son identification.

**Convention proposée : une “page” désigne une face visible de quatre pochettes.** Les faces sont numérotées dans l’ordre où l’on feuillette le classeur. Une photo d’une ouverture montre donc généralement deux pages et huit emplacements.

Chaque page comprend quatre positions :

| | |
|---|---|
| Haut gauche | Haut droite |
| Bas gauche | Bas droite |

Une adresse complète ressemble à :

**Classeur 3 → page 30 → bas droite**

Lors du premier import d’un classeur, l’utilisateur confirme la correspondance entre les pages physiques et cette numérotation, notamment si la première face est isolée.

L’application ne dépend pas exclusivement du numéro : elle affiche aussi **la photo de la page avec la bonne pochette encadrée**.

## 2. Alimenter le catalogue avec des photos

### Prise de vue

Depuis un téléphone, l’utilisateur :

1. Choisit le classeur.
2. Indique les deux pages visibles.
3. Prend ou importe une photo des huit pochettes.
4. Vérifie les propositions de reconnaissance.
5. Valide et passe à l’ouverture suivante.

Les numéros des pages suivantes sont proposés automatiquement, mais restent modifiables. Il est possible de photographier une seule page ou d’importer plusieurs photos à la suite.

### Reconnaissance assistée

L’application découpe la photo en emplacements et analyse chaque disque séparément :

- Présence d’un disque ou pochette vide.
- Texte visible et titre probable.
- Film, série ou bonus.
- Format : DVD, Blu-ray ou UHD Blu-ray.
- Édition ou version, si elle est lisible.
- Saison, numéro de disque, épisodes, si indiqués.

**Une information illisible reste inconnue.** L’application ne doit pas déduire une version longue, une langue ou un numéro de disque à partir du seul titre du film.

Les pochettes occupées mais non identifiées restent enregistrées avec leur photo et leur emplacement. Elles peuvent être complétées plus tard.

### Validation rapide

Un écran présente les huit pochettes avec leur image et les informations proposées.

L’utilisateur peut :

- Tout valider quand les propositions sont correctes.
- Corriger un titre.
- Choisir entre plusieurs œuvres possibles.
- Préciser une édition.
- Signaler un bonus ou une pochette vide.
- Reporter une identification.
- Reprendre uniquement la photo d’un disque illisible.

La distinction entre **information reconnue automatiquement** et **information confirmée par l’utilisateur** est conservée.

## 3. Distinguer œuvres, éditions et exemplaires

Le catalogue distingue trois niveaux :

| Niveau | Exemple |
|---|---|
| Œuvre | Le Seigneur des anneaux : La Communauté de l’anneau |
| Édition | Blu-ray, version longue |
| Exemplaire physique | Disque 1 de cette édition, situé dans une pochette précise |

Une même œuvre peut donc posséder plusieurs éditions, et une même édition plusieurs exemplaires.

**Deux disques portant le même titre ne sont jamais fusionnés automatiquement.**

Le système distingue :

- Même film dans deux formats.
- Version cinéma et version longue.
- Deux copies de la même édition.
- Film réparti sur plusieurs disques.
- Disque du film et disque bonus.
- Plusieurs disques d’une même saison.
- Disque contenant plusieurs films ou épisodes.

Les regroupements en coffrets ou éditions sont facultatifs : on doit pouvoir cataloguer un disque sans connaître son coffret d’origine.

## 4. Retrouver un disque

La recherche accepte :

- Le titre français ou original.
- Une partie du titre.
- Une saga.
- Une série et une saison.
- Des fautes de frappe courantes.

Les résultats sont regroupés par œuvre, puis par édition. Chaque exemplaire conserve son emplacement propre.

Exemple d’affichage fictif :

**La Communauté de l’anneau**

| Exemplaire | Emplacement |
|---|---|
| DVD — version cinéma | Classeur 1, page 12, haut gauche |
| Blu-ray — version longue — disque 1 | Classeur 3, page 30, bas droite |
| Blu-ray — version longue — disque 2 | Classeur 3, page 31, haut gauche |
| Blu-ray — version longue — seconde copie, disque 1 | Classeur 2, page 44, bas gauche |

En ouvrant un résultat, l’utilisateur voit la photo de référence et l’emplacement surligné.

Pour une série, il peut rechercher une saison ou un épisode. La recherche par épisode n’est disponible que si la correspondance avec les disques a été renseignée ou confirmée.

## 5. Gérer les ajouts et les changements

### Nouveau disque

L’utilisateur choisit une pochette libre et photographie le disque. Le reste du classement ne change pas.

### Déplacement

Une action « Déplacer » permet d’attribuer une nouvelle adresse et de libérer l’ancienne. Si la destination est occupée, l’application demande de résoudre le conflit.

### Nouvelle photo d’une page déjà cataloguée

L’application compare la photo au contenu enregistré et propose les changements. **Une nouvelle analyse ne remplace pas silencieusement les informations déjà confirmées.**

Les anciennes photos restent accessibles dans l’historique ; la photo courante est clairement identifiée.

### Contrôles utiles

- Emplacements occupés mais non identifiés.
- Identifications à vérifier.
- Doublons possibles.
- Conflits d’emplacement.
- Pages pas encore photographiées.

Un disque manquant dans une édition ne peut être signalé que si la composition attendue de cette édition est connue.

## 6. Écrans principaux

- **Recherche** : accès immédiat à un titre et à ses emplacements.
- **Classeurs** : navigation par classeur, page et pochette.
- **Ajouter des photos** : capture et import successifs.
- **À vérifier** : propositions incertaines et disques non identifiés.
- **Fiche d’une œuvre** : éditions et exemplaires possédés.
- **Sauvegarde et export** : récupération du catalogue et des photos.

L’interface doit être confortable sur téléphone pour la photographie et la consultation devant les classeurs, ainsi que sur ordinateur pour les corrections en série.

## 7. Conservation et confidentialité

- Sauvegarde exportable du catalogue avec ses photos.
- Restauration complète, y compris les emplacements et validations.
- Export tabulaire pour consulter les données hors de l’application.
- Recherche utilisable sans relancer la reconnaissance des photos.
- Si l’analyse utilise un service distant, préciser quelles images lui sont transmises.
- Ne pas imposer de lien avec Plex pour utiliser le catalogue.

Une connexion à Plex pourra ensuite rapprocher **disques physiques possédés** et **copies numériques disponibles**, sans confondre ces deux inventaires.

## 8. Première version et critères de réussite

La première version comprend les classeurs, les emplacements, l’import de photos, la reconnaissance assistée, la correction manuelle, la recherche, la gestion des éditions et doublons, ainsi que la sauvegarde.

Avant d’importer toute la collection, effectuer un essai sur une dizaine de photos comprenant des reflets, des séries, des bonus et plusieurs éditions d’un même film.

Le prototype est satisfaisant si :

- Chaque disque validé conduit à la bonne pochette.
- Les doublons restent des exemplaires distincts.
- Les reconnaissances incertaines sont faciles à corriger.
- Une réimportation ne crée pas de copies artificielles du catalogue.
- Une sauvegarde restaurée retrouve les mêmes photos et emplacements.
- La validation des huit pochettes est suffisamment rapide pour traiter les classeurs par petites sessions.