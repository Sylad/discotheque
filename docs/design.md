# Discothèque — document de design (V1)

> Statut : **à valider par Sylvain** (validation unique, au design). Après
> validation, les lots de `docs/plan/raf.yaml` s'enchaînent sans nouvelle question.
> Source : `docs/spec-origine.md` (spec de Sylvain, copiée telle quelle).
> Rédigé le 2026-09-29.

Les choix déjà tranchés par Sylvain ne sont pas rediscutés ici : hébergement
k3s dark-blue (ns `preprod`) derrière le tunnel Cloudflare, reconnaissance par un
modèle vision **local** (Ollama sur la RTX 5090 de Big-Blue), stack React 18 +
TanStack + Tailwind / NestJS 11 comme finance-tracker et ol-companion, signature
commune des apps (raf, Nouveautés, cadence, revue UX, PIN).

Sommaire

1. Vocabulaire et adresse d'une pochette
2. Modèle de données
3. Architecture (front, back, worker vision, stockage, recherche)
4. Flux photo → découpe → analyse → validation
5. Règles dures (invariants testés)
6. Écrans
7. Sauvegarde, restauration, export
8. Confidentialité
9. Déploiement
10. Risques
11. Questions à valider

---

## 1. Vocabulaire et adresse d'une pochette

| Terme | Sens |
|---|---|
| **Classeur** | Un classeur physique : numéro (1, 2, …), nom, couleur ou photo de couverture. |
| **Page** | Une face visible de 4 pochettes (convention de la spec §1), numérotée dans l'ordre où l'on feuillette. |
| **Position** | `HG`, `HD`, `BG`, `BD` (haut/bas, gauche/droite). |
| **Pochette** | Un emplacement physique = (classeur, page, position). Adresse unique. |
| **Ouverture** | Ce que montre une photo : en général 2 pages face à face = 8 pochettes. |

Affichage d'une adresse : **Classeur 3 → page 30 → bas droite**, toujours
accompagné de la photo de la page avec la pochette encadrée.

Première face isolée : à la création d'un classeur, on indique si la page 1 est
seule (au dos de la couverture) ; les ouvertures suivantes sont alors proposées
comme (2,3), (4,5)… sinon (1,2), (3,4)… Les numéros proposés restent modifiables à
chaque photo.

## 2. Modèle de données

### Les quatre niveaux

La spec distingue œuvre / édition / exemplaire. On garde exactement ces mots ;
l'exemplaire est **un disque physique** (un disque = une pochette).

```
Œuvre ──< ContenuDisque >── Exemplaire (disque) ──> Pochette (classeur, page, position)
  │                              │
  └──< ÉditionŒuvre >── Édition <┘ (facultative)
```

| Table | Champs principaux | Remarques |
|---|---|---|
| `classeur` | id, numero (unique), nom, couleur, photo_couverture, premiere_face_isolee | |
| `pochette` | id, classeur_id, page, position, etat (`libre` / `occupee` / `vide_confirmee`) | **Unique (classeur, page, position)** — garantit qu'une adresse ne porte qu'un disque. |
| `oeuvre` | id, type (`film` / `serie` / `autre`), titre_fr, titre_original, annee, saga, alias[] | Les alias alimentent la recherche (« LOTR », « SDA »). |
| `edition` | id, libelle, format (`DVD` / `BD` / `UHD` / inconnu), version (cinéma, longue, collector… ou inconnue), nb_disques_attendus (nullable), coffret (nullable) | Facultative : un disque peut exister sans édition connue. |
| `edition_oeuvre` | edition_id, oeuvre_id | N:N (coffret trilogie, compilation). |
| `exemplaire` | id, pochette_id (nullable si sorti du classeur), edition_id (nullable), copie (1, 2, …), numero_disque, nature (`film` / `bonus` / `episodes` / `mixte` / inconnue), statut (`non_identifie` / `a_verifier` / `confirme`) | `copie` distingue deux exemplaires de la même édition (« seconde copie, disque 1 »). |
| `contenu_disque` | exemplaire_id, oeuvre_id, saison, episodes (liste), role (`principal` / `bonus`) | Un disque peut contenir plusieurs films ou épisodes. |
| `photo` | id, fichier, sha256, prise_le, classeur_id, pages (1 ou 2 numéros), grille (coordonnées des 8 cases), courante (par page) | Les anciennes photos restent (historique) ; une seule photo **courante** par page. |
| `analyse` | id, photo_id, position_case, modele, prompt_version, demandee_le, faite_le, resultat_json, statut (`en_attente` / `en_cours` / `faite` / `echec`) | La file de travaux du worker vision (§3). |
| `provenance` | exemplaire_id, champ, source (`reconnu` / `confirme`), analyse_id, confirme_le | Une ligne par champ renseigné. |
| `evenement` | id, date, type (deplacement, confirmation, fusion manuelle…), avant/après JSON | Journal simple, utile pour comprendre et restaurer. |

### Provenance « reconnu » / « confirmé »

Chaque champ d'identification d'un exemplaire (titre/œuvre, format, édition,
version, saison, numéro de disque, épisodes, nature) a une provenance :

- **reconnu** : rempli par une analyse (modèle + version de prompt + date conservés) ;
- **confirmé** : validé ou saisi par l'utilisateur.

L'interface affiche la différence (ex. valeur reconnue en italique avec une pastille
« proposé », valeur confirmée en texte normal). « Tout valider » passe en
*confirmé* les champs reconnus affichés.

Une valeur **inconnue** est stockée comme `null` + provenance, jamais comme une
chaîne vide ou devinée.

### Composition attendue d'une édition

`nb_disques_attendus` n'est rempli que si l'utilisateur le connaît. Le contrôle
« disque manquant » ne s'active que dans ce cas (spec §5).

## 3. Architecture

```
 Téléphone / PC ──HTTPS──> Cloudflare tunnel ──> dark-blue, ns preprod
                                                 ├─ discotheque-frontend (nginx + React)
                                                 └─ discotheque-backend (NestJS)
                                                       ├─ SQLite  (PVC discotheque-data)
                                                       └─ photos/ (même PVC)
                                                              ▲
                                  tire les travaux, renvoie   │  (sortant uniquement,
                                  les résultats                │   jamais de port ouvert
 Big-Blue (WSL) : worker vision ───────────────────────────────┘   sur Big-Blue)
                  └─ Ollama localhost:11434 (RTX 5090)
```

### Front (React 18 + Vite + TanStack Router/Query + Tailwind)

Identique à finance-tracker : routage « code-based », TanStack Query pour les appels
API, PIN stocké en `localStorage` et envoyé en `Authorization: Bearer`. Pensé
**téléphone d'abord** (photo devant les classeurs) puis ordinateur (corrections en
série, raccourcis clavier sur l'écran de validation).

Prise de vue : `<input type="file" accept="image/*" capture="environment" multiple>`
— l'appareil photo natif du téléphone, pas de flux caméra dans le navigateur
(plus simple, meilleure qualité, marche sur iOS et Android).

### Back (NestJS 11)

Modules : `classeurs`, `photos`, `catalogue` (œuvres/éditions/exemplaires),
`analyse` (file de travaux + API du worker), `recherche`, `sauvegarde`, `health`.
`PinGuard` global comme finance-tracker ; le worker a son propre jeton
(`WORKER_TOKEN`), limité aux routes `/api/worker/*`.

### Stockage : SQLite (proposition argumentée)

Les autres apps stockent des fichiers JSON. Ici on propose **SQLite** (fichier unique
sur le PVC, via `better-sqlite3`, requêtes SQL écrites à la main + migrations
numérotées — proche de JDBC, pas d'ORM magique) :

- **Intégrité** : l'unicité d'une adresse (classeur, page, position) et le
  « déplacer avec conflit » sont des contraintes et des transactions, pas du code
  à maintenir à la main sur des fichiers.
- **Relations** : œuvre ↔ édition ↔ exemplaire ↔ pochette ↔ photo ↔ analyse sont
  des jointures ; en JSON il faudrait les recoudre en mémoire à chaque lecture.
- **Recherche** : SQLite embarque **FTS5** avec le tokenizer `trigram` (recherche
  par morceau de titre) ; les fautes de frappe sont traitées en plus (ci-dessous).
- **Sauvegarde** : `VACUUM INTO` produit une copie cohérente à chaud, en un fichier.

Volume attendu : quelques milliers de disques au plus — SQLite est largement
dimensionné. Une seule instance backend (SQLite + PVC `ReadWriteOnce`), déployée en
stratégie `Recreate`.

Photos : fichiers JPEG sur le même PVC (`photos/AAAA/MM/<sha256>.jpg`), nommés par
empreinte (une photo réimportée à l'identique n'est pas dupliquée). EXIF GPS retiré
à l'arrivée, HEIC (iPhone) converti en JPEG côté serveur (`sharp`).

### Recherche tolérante

Chaque œuvre produit des « clés de recherche » normalisées : titre FR, titre
original, saga, alias, en minuscules, **sans accents ni ponctuation**, articles de
tête ignorés (le, la, les, l', the…). Deux étages :

1. **FTS5 trigram** sur ces clés : « seigneur anneaux », « communauté », « lotr ».
2. **Similarité de trigrammes** en mémoire sur les mêmes clés quand l'étage 1 ne
   trouve rien ou peu (fautes courantes : « seigneur des aneaux », « comunauté »).

Série + saison : « Friends saison 3 », « Friends s3 » → filtre sur
`contenu_disque.saison`. Épisode : seulement si les épisodes du disque sont
renseignés ou confirmés (spec §4).

Résultats **groupés par œuvre, puis par édition**, chaque exemplaire avec son
adresse. La recherche lit uniquement la base : elle ne relance jamais la
reconnaissance.

### Worker vision (Big-Blue)

Ollama tourne sur Big-Blue (PC de Sylvain, WSL) alors que l'app tourne sur
dark-blue. On découple par une **file de travaux** :

1. Une photo validée crée 8 travaux `analyse` (un par case) en `en_attente`.
2. Le worker, lancé sur Big-Blue, interroge le backend toutes les ~10 s :
   `POST /api/worker/jobs/prendre` → reçoit un travail + un **bail** (5 min).
3. Il télécharge la photo, découpe la case (redressement de perspective), appelle
   Ollama en local, renvoie le résultat JSON : `POST /api/worker/jobs/:id/resultat`.
4. Bail expiré sans résultat (PC éteint en cours de route) → le travail repart en
   file. Trois échecs → `echec`, visible dans « À vérifier ».
5. Le worker envoie un battement de cœur ; l'app affiche « Analyse : active » ou
   « Analyse en pause — PC éteint depuis 14 h 02 ».

**Mode dégradé** : PC éteint = les photos sont stockées, les emplacements créés
(« occupé, non identifié »), la saisie manuelle et la recherche marchent ;
seules les propositions automatiques attendent.

Le worker est proposé en **Python 3.12** (OpenCV pour le redressement, client
Ollama officiel, même outillage que jobmail-assistant), dans `worker/` du même
dépôt, lancé par un script. Il ne parle qu'au backend et à `localhost:11434`.

### Modèle vision : candidats et jalon

Relevé `ollama list` du 2026-09-29 sur Big-Blue (Ollama 0.24.0, RTX 5090 32 Go) :

| Modèle installé | Vision ? |
|---|---|
| `gemma3:27b` (17 Go) | **oui** — seul candidat déjà présent |
| `qwen3:32b`, `qwen3-coder:30b`, `llama3.1:8b` | non (texte seul) |

Candidats à installer pour l'essai (à confirmer dans la bibliothèque Ollama au
moment du lot ; tous tiennent dans 32 Go) : famille **Qwen-VL** (`qwen2.5vl:32b`
/ `:7b`, ou `qwen3-vl` s'il est publié), `mistral-small3.2:24b` (vision),
`llama3.2-vision:11b`, `minicpm-v:8b` (bon en OCR), `gemma3:12b` (version rapide).

**Premier lot = essai sur 10 photos** (spec §8 : reflets, séries, bonus, plusieurs
éditions d'un même film). Vérité terrain saisie à la main, puis chaque modèle
note sur : pochette vide/occupée, titre exact, format, édition/version, saison et
disque, **taux d'inventions** (valeur donnée alors qu'illisible — critère
éliminatoire), durée par case. Le verdict (modèle retenu, prompt, seuil de
confiance) est écrit dans `docs/essai-vision.md` et départage les candidats.

Le résultat demandé au modèle est un JSON strict, avec pour chaque champ la
**preuve lue** (le texte vu sur la pochette). Un champ sans preuve est ramené à
« inconnu » par le backend (règle §5.2).

## 4. Flux photo → découpe → analyse → validation

1. **Choisir le classeur** (dernier utilisé présélectionné).
2. **Pages visibles** : proposées d'après la dernière ouverture (30-31 → 32-33),
   modifiables ; option « une seule page ».
3. **Photo** (prise ou import, plusieurs à la suite). Téléversement immédiat, avec
   reprise si le réseau coupe.
4. **Découpe en 8 cases** : une grille de deux pages × 4 cases est posée sur la
   photo ; l'utilisateur ajuste les 4 coins de chaque page au doigt si besoin. La
   grille retenue est mémorisée par classeur (même cadrage la fois suivante). À
   l'écran, les vignettes sont de simples découpes d'affichage de la photo
   d'origine (aucun fichier créé) ; le redressement fin est fait par le worker.
5. **Analyse** : 8 travaux en file (§3). L'utilisateur peut enchaîner la photo
   suivante sans attendre.
6. **Validation rapide** : l'écran montre les 8 cases, vignette + propositions.
   Actions : tout valider, corriger un titre, choisir parmi plusieurs œuvres,
   préciser l'édition, marquer bonus ou pochette vide, reporter, reprendre la photo
   d'un seul disque (gros plan rattaché à la case, analysé seul).
7. **Rattachement au catalogue** : pour un titre validé, l'app propose les œuvres
   et éditions existantes proches ; créer une nouvelle œuvre est un choix explicite.
   Jamais de fusion automatique (§5.1).

Objectif de vitesse (critère §8) : valider une ouverture bien reconnue en
**moins de 30 s**, au pouce, sans scroller sur un téléphone de 390 px de large.

## 5. Règles dures (chacune verrouillée par un test)

1. **Jamais de fusion automatique** : deux disques de même titre restent deux
   exemplaires. Seul l'utilisateur rattache un disque à une édition existante ou
   déclare un doublon. Les « doublons possibles » sont signalés, pas fusionnés.
2. **Illisible = inconnu** : ni version longue, ni langue, ni numéro de disque
   déduits du seul titre. Champ sans preuve lue → `null`.
3. **Une réanalyse ne remplace pas le confirmé** : une nouvelle photo ou une
   nouvelle analyse produit des **propositions de changement** (écran de
   comparaison) ; un champ confirmé ne change que par une action de l'utilisateur.
4. **Réimport sans copies artificielles** : une nouvelle photo d'une page déjà
   cataloguée est rapprochée **par adresse** (classeur, page, position), pas par
   titre ; elle met à jour la photo courante et propose des changements, elle ne
   crée pas d'exemplaire.
5. **Une adresse, un disque** : contrainte d'unicité ; « Déplacer » vers une
   pochette occupée ouvre la résolution du conflit (échanger, choisir une autre
   pochette, annuler).
6. **Pochette occupée non identifiée** = un exemplaire `non_identifie` avec sa
   photo et son adresse, complétable plus tard.
7. **Disque manquant** signalé uniquement si `nb_disques_attendus` est connu.

## 6. Écrans

| Écran | Téléphone (prioritaire) | Ordinateur |
|---|---|---|
| **Recherche** (accueil) | Champ en haut, résultats par œuvre → édition → exemplaire + adresse ; toucher un exemplaire ouvre la photo avec la pochette encadrée. | Idem, plus large. |
| **Classeurs** | Liste des classeurs (couleur, nb de disques, pages photographiées) → pages → grille 2×2 cliquable. | Double page côte à côte, comme le classeur ouvert. |
| **Ajouter des photos** | Parcours §4 étapes 1 à 4, gros boutons, enchaînement d'ouvertures. | Import de plusieurs fichiers. |
| **À vérifier** | Files : non identifiés, propositions incertaines, doublons possibles, conflits d'emplacement, pages pas encore photographiées, analyses en échec. | Correction en série au clavier. |
| **Fiche d'une œuvre** | Titres, saga, éditions → exemplaires avec adresse ; actions déplacer, corriger, déclarer doublon. | Idem + édition des alias. |
| **Sauvegarde et export** | Télécharger une sauvegarde, état de la dernière sauvegarde automatique. | Restauration (avec confirmation), export CSV. |

Plus, comme toutes les apps : **Nouveautés** (cadence news) et l'écran de **PIN**.
Chaque écran est un lot `--visible` revu par l'agent UX (captures 390 et 1440 px)
avant clôture.

## 7. Sauvegarde, restauration, export

- **Sauvegarde** = une archive `.zip` : copie cohérente de la base (`VACUUM INTO`)
  + toutes les photos + un `manifeste.json` (version du schéma, date, nombre de
  disques, empreinte sha256 de chaque fichier).
- **Automatique** : une copie quotidienne sur le PVC, 7 dernières gardées.
  Téléchargement manuel depuis l'écran « Sauvegarde et export ».
- **Restauration complète** : téléverser une archive → vérification du manifeste
  et des empreintes → l'état actuel est d'abord sauvegardé → remplacement. Les
  emplacements, validations et historiques de photos reviennent à l'identique
  (critère §8, testé par un aller-retour automatique).
- **Export tabulaire** : CSV (UTF-8, séparateur `;` pour Excel FR), une ligne par
  exemplaire : œuvre, titre original, édition, format, version, copie, disque,
  saison/épisodes, adresse, statut, provenance.
- **Plex** : hors V1. Le catalogue ne dépend pas de Plex ; une connexion future
  rapprochera disques possédés et copies numériques sans mélanger les inventaires.

## 8. Confidentialité

- **Aucune image n'est envoyée à un service d'analyse distant.** L'analyse se fait
  sur la RTX 5090 de Big-Blue ; les photos transitent téléphone → tunnel
  Cloudflare → dark-blue (comme toute requête des apps loisir), puis dark-blue →
  Big-Blue pour le worker.
- EXIF (dont la position GPS) retiré dès l'arrivée des photos.
- PIN obligatoire **dès la mise en prod**, stocké hors git dans le Secret
  Kubernetes `discotheque-secrets` ; jeton du worker distinct.
- Photos, base et sauvegardes jamais versionnées (`.gitignore`), jamais dans les
  captures Nouveautés sans vérifier qu'elles ne montrent rien de privé.

## 9. Déploiement

Même chaîne que les autres apps loisir :

- **CI** `.github/workflows/build.yml` (copie adaptée de finance-tracker, sans
  filtre `paths`) : build + push de `ghcr.io/sylad/discotheque-backend` et
  `-frontend` en `sha-<7 caractères>`. Paquets GHCR **privés**, tirés via le
  `regcred` du namespace.
- **Chart** `developpeur-gitops/charts/discotheque/` (écrit dans le lot d'infra,
  hors de ce dépôt) :
  - Deployment `discotheque-backend` (1 réplica, stratégie `Recreate`, sondes sur
    `/api/health`) et `discotheque-frontend` (nginx, `client_max_body_size 25m`
    pour les photos) + Services ;
  - PVC `discotheque-data` (`local-path`, 20 Gi proposés) monté sur `/app/data`
    (base + photos + sauvegardes) ;
  - Secret `discotheque-secrets` (`APP_PIN`, `WORKER_TOKEN`) créé à la main, hors
    git ;
  - route `discotheque.sladoire.dev` dans le chart `cloudflared` ;
  - Application ArgoCD.
- **Livraison** : `cadence deliver` → `scripts/deploy.sh` (bump des seuls tags
  construits, dans `developpeur-gitops`) → `scripts/verify-rollout.sh` (pods sur
  les bons tags, contexte `dark-blue`, lecture seule) + `/api/health` +
  page d'accueil (`cadence.yaml`).
- **Worker** : hors cluster, sur Big-Blue ; configuration `DISCO_API_URL`,
  `WORKER_TOKEN`, `OLLAMA_MODEL` dans un `.env` non versionné.

## 10. Risques

| Risque | Parade |
|---|---|
| Reflets des pochettes plastique, textes minuscules : reconnaissance médiocre. | Jalon d'essai en premier ; « reprendre la photo d'un disque » ; l'app reste utilisable en saisie manuelle. |
| Le modèle invente (version longue, n° de disque). | Preuve lue exigée par champ, taux d'invention éliminatoire à l'essai, règle §5.2 testée. |
| Découpe imprécise (classeur penché, pochettes qui se chevauchent). | Grille ajustable au doigt, mémorisée par classeur ; redressement côté worker. |
| PC éteint : pas d'analyse. | File de travaux + bail + mode dégradé affiché. |
| Worker bloqué par Cloudflare (protection anti-robot, erreur 1010 déjà vécue). | Voir question 2 (passer par le réseau local) ou règle Cloudflare dédiée au jeton. |
| Perte du PVC `local-path` (un seul nœud, sauvegardes minimales sur dark-blue). | Sauvegarde téléchargeable + question 5 (copie vers le NAS). |
| Envoi de grosses photos par le tunnel (délais, 413 nginx). | Redimensionnement côté téléphone avant envoi (question 4), `client_max_body_size`, envoi une photo à la fois. |
| Temps de validation trop long pour de petites sessions. | Critère mesuré à l'essai de réception (< 30 s par ouverture bien reconnue). |

## 11. Questions à valider

1. **Stockage SQLite** plutôt que les fichiers JSON des autres apps (argumenté §3) :
   d'accord ?
2. **Chemin du worker** vers l'API : par le **réseau local** (Big-Blue → dark-blue
   192.168.1.38, sans passer par Cloudflare ; demande une entrée LAN pour
   `preprod`) ou par `discotheque.sladoire.dev` avec le jeton du worker ?
3. **Worker en Python** (OpenCV, comme jobmail-assistant) ou en TypeScript comme
   le reste ? Et démarrage : automatique à l'ouverture de session Windows, ou
   lancé à la main avant une séance de photos ?
4. **Photos** : garder l'original pleine résolution (≈ 4–8 Mo, meilleur pour
   réanalyser) ou réduire à ~2500 px à l'envoi (≈ 1 Mo, plus rapide par le
   tunnel) ?
5. **Sauvegarde automatique vers le NAS** Synology en plus des copies sur le PVC,
   ou téléchargement manuel seulement ?
6. **Vraies données en prod** : contrairement à finance-tracker (démo seulement),
   le catalogue réel vivrait sur dark-blue, puisqu'on l'utilise au téléphone
   devant les classeurs. D'accord ?
7. **Référentiel de titres externe** (ex. TMDB, texte seulement, jamais d'image)
   pour proposer titre original, saga et année — ou tout en local, saisi à la
   main ? Sans référentiel, la recherche par titre original ne marche que si on
   l'a saisi.

## 12. Décisions validées (Sylvain, 2026-09-29)

Le design est validé avec ces réponses aux questions du § 11 :

1. **Stockage** : SQLite (relations, unicité des adresses, recherche, sauvegarde en un fichier).
2. **Liaison worker → API** : par le réseau local (`discotheque.dark-blue.lan`), pas par le tunnel Cloudflare.
3. **Worker** : Python (OpenCV + client Ollama), démarrage manuel en V1.
4. **Photos** : conservées en pleine résolution ; vignettes d'affichage dérivées.
5. **Sauvegarde** : téléchargement manuel en V1 ; copie automatique vers le NAS plus tard.
6. **Vraies données sur dark-blue** : oui, derrière un PIN obligatoire (hors git).
7. **Référentiel de titres externe (TMDB)** : plus tard, lot optionnel L22 ; la V1 est entièrement locale.

Modèles vision : installation de 2 à 3 candidats sur Big-Blue autorisée pour l'essai L3.
