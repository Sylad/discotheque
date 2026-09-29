# Discothèque

Retrouver ses disques physiques (films, séries, disques bonus) rangés dans des
classeurs de pochettes, à partir d'un catalogue alimenté par des photos.

Recherche typique : « Seigneur des anneaux » → chaque exemplaire possédé, son
édition (DVD, Blu-ray, version longue, bonus, doublon) et son emplacement exact :
**Classeur 3 → page 30 → bas droite**, avec la photo de la page et la pochette
encadrée.

## Statut

Cadrage (2026-09-29) : spec, design et plan. Pas encore de code applicatif.

- Spec d'origine : [`docs/spec-origine.md`](docs/spec-origine.md)
- Design (à valider) : [`docs/design.md`](docs/design.md)
- Plan : [`docs/plan/raf.yaml`](docs/plan/raf.yaml) (tenu par `raf`, [cadence](https://github.com/Sylad/cadence))

## Stack prévue

- Frontend : React 18, Vite, TanStack Router / Query, Tailwind
- Backend : NestJS 11, SQLite, photos sur volume persistant
- Reconnaissance : modèle vision **local** (Ollama, GPU du PC de dev) via une file
  de travaux — aucune image envoyée à un service distant
- Hébergement : k3s (dark-blue), CI GitHub → GHCR → ArgoCD, exposé par un tunnel
  Cloudflare sur `discotheque.sladoire.dev`

## Données

Photos, catalogue et sauvegardes ne sont jamais versionnés. Sauvegarde
exportable (base + photos), restauration complète, export CSV.
