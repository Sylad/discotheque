# Discothèque — guide Claude Code

App perso pour **retrouver un film, une série ou un disque bonus** rangé dans
plusieurs classeurs de pochettes, à partir d'un catalogue alimenté par des photos.
Spec : `docs/spec-origine.md` (copie telle quelle, ne pas modifier). Design :
`docs/design.md` (**à valider par Sylvain** avant tout code applicatif).

## État

Dépôt posé le 2026-09-29 : squelette, spec, design, plan. **Aucun code applicatif**
tant que le design n'est pas validé. Pas encore de dépôt GitHub ni de chart gitops.

## Architecture (cible, cf. design)

| | |
|---|---|
| Frontend | React 18 + Vite + TanStack Router (code-based) / Query + Tailwind — téléphone d'abord |
| Backend | NestJS 11, préfixe `/api`, `PinGuard` global (sauf `/api/health`) |
| Stockage | SQLite (proposé) + photos JPEG sur le PVC `discotheque-data` |
| Reconnaissance | Worker **sur Big-Blue** qui tire une file de travaux du backend et appelle **Ollama local** (RTX 5090). Aucune image vers un service distant. |
| Hébergement | k3s dark-blue, ns `preprod`, `discotheque.sladoire.dev` via le tunnel Cloudflare |
| Livraison | CI GitHub → GHCR (privé) → `developpeur-gitops/charts/discotheque/` → ArgoCD |

## Règles dures (spec — chacune doit avoir son test)

- **Jamais de fusion automatique** de deux disques de même titre.
- **Illisible = inconnu** : ne rien déduire du seul titre (version longue, langue,
  numéro de disque). Un champ sans preuve lue par le modèle reste `null`.
- **Une réanalyse ne remplace jamais une information confirmée** : elle produit
  des propositions ; la provenance `reconnu` / `confirme` est conservée par champ.
- **Réimport rapproché par adresse** (classeur, page, position), jamais par titre :
  pas de copies artificielles.
- Une adresse = un disque (contrainte d'unicité) ; déplacer vers une pochette
  occupée = résolution de conflit explicite.

## Données et confidentialité

- ❌ Jamais de photo, de base SQLite, de sauvegarde ni de jeu d'essai versionné
  (`data/`, `photos/`, `backups/`, `essais/` dans `.gitignore`).
- ❌ Jamais d'image envoyée à un service distant d'analyse.
- ✅ PIN dès la mise en prod, dans le Secret `discotheque-secrets` (hors git),
  jeton du worker distinct (`WORKER_TOKEN`).
- Fichiers temporaires : `~/projects/developpeur/tmp/`, jamais dans le dépôt.

## Sessions et livraison (cadence)

- Début : `/cadence:session-start` ; fin : `/cadence:session-close`.
- Livraison : `/cadence:deliver` (`cadence.yaml`) : CI du sha poussé →
  `scripts/deploy.sh` (bump des seuls tags construits dans `developpeur-gitops`)
  → `scripts/verify-rollout.sh` + `/api/health`. Scripts à écrire dans le lot
  d'infra, sur le modèle de finance-tracker. Jamais deux livraisons à la fois.
- Bumper le tag **à la main / par deploy.sh**, jamais `upgrade-app.sh`.

## Plan (raf)

Le reste à faire vit dans `docs/plan/raf.yaml`, tenu par le CLI `raf`. Chaque
commit cite son lot (`feat(L7): …`, `L7/t1`). `raf start` avant le premier commit,
`raf done` une fois testé, décisions dans `raf note`. `raf check` doit rester propre.
Commits à chemins explicites (jamais `git add -A` ni `commit -a`).

**Revue UX obligatoire** : tout lot qui touche un écran est `--visible` et revu par
l'agent `cadence:ux-reviewer` (captures 390 et 1440 px) avant `raf done` ;
verdict par `raf ux <lot> "…"`. Mobile en priorité (photo devant les classeurs).

## Nouveautés (cadence news)

Lot visible terminé → `cadence news new <lot>` → `docs/nouveautes/<date>-<titre>.md`
(texte pour l'utilisateur, horodaté), au moins une capture dans
`docs/nouveautes/captures/`. `npm run news` régénère les données servies par la
page `/nouveautes` (versionnées : la CI n'a pas cadence).
