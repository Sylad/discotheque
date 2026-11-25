# Carte du dépôt discotheque

## Écrans

Aucun : pas encore de code applicatif (squelette L4 à faire).

## Analyse statique (L25, D-31 du registre parent)

- `cadence.yaml` → `analyse:` déclare trois outils, joués par la porte de `cadence run` à chaque lot :
  - `eslint` (`eslint.config.mjs`) : typescript-eslint `recommendedTypeChecked` + sonarjs `recommended`,
    seuils de cadence max-lines 400, max-lines-per-function 80, max-depth 4, max-params 5,
    complexity 15, cognitive-complexity 15. Couvre tout le dépôt sauf `worker/` (Python).
  - `tsc` (`tsconfig.json` racine) : vérifie seulement les `.mjs` de la racine et de `scripts/` (checkJs).
  - `ruff` (`ruff.toml`, `uvx ruff@0.17.6`) : pour le futur `worker/` Python (C901 15, max-args 5).
- Outils installés à la racine (`package.json`, devDependencies) ; `npm test` joue
  `scripts/analyse-config.test.mjs`, qui vérifie les seuils contre la demande.
- Décisions : base figée à zéro violation (aucun code existant) ; `backend/` et `frontend/` auront
  leur propre `tsconfig.json` et une entrée `tsc-backend` / `tsc-frontend` ajoutée par
  `Analyse-adoption:` dans L4 (ajout pur, pas de lot `config: true`). Toute autre modification
  d'un fichier de `configs:` exige un lot `config: true` du plan. typescript bloqué en 6.0.x
  (typescript-eslint 8.74 ne prend pas encore TypeScript 7).
