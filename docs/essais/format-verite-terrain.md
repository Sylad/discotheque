# Format de la vérité terrain du jeu d'essai (lots L2 → L3)

La vérité terrain décrit, photo par photo et pochette par pochette, ce qui est
**réellement lisible** sur les photos du jeu d'essai. Elle sert de référence au
lot L3 pour noter les modèles vision (présence, titre, format, édition, disque,
et surtout **taux d'inventions**).

- Fichier : `essais/verite-terrain.yaml`, **non versionné** (dossier `essais/`
  ignoré, comme les photos `essais/photos/*.jpg`). Une vue lisible
  `essais/verite-terrain.md` est générée à côté pour la correction ; en cas
  d'écart, **le YAML fait foi**.
- Ce document décrit uniquement le schéma. Il ne contient aucun contenu des
  photos.

## Structure

```yaml
schema: discotheque/verite-terrain v1
statut: <texte libre : pré-rempli / corrigé par Sylvain le …>
photos:
  - fichier: PXL_….jpg          # nom exact dans essais/photos/
    orientation: paysage | portrait
    cadrage: ouverture_2_pages | page_seule | 2_pages_empilees | autre
    nb_pochettes: 8              # pochettes décrites (4 pour une page seule)
    classeur: 3                  # facultatif, à compléter par Sylvain
    pages: [30, 31]              # facultatif, dans l'ordre des valeurs de `page`
    difficultes: [<texte>, …]    # reflets, flou, angle, pochette cachée…
    remarque: <texte>            # facultatif
    a_verifier: true | false     # vrai si une pochette ou le cadrage est douteux
    pochettes:
      - page: gauche | droite | seule | haut | bas
        position: HG | HD | BG | BD
        etat: {valeur: occupee | vide, niveau: lu}
        # champs suivants absents si la pochette est vide
        titre_lu:       {valeur: <texte tel qu'imprimé> | null, niveau: …}
        titre_probable: {valeur: <œuvre> | null, niveau: …}
        oeuvres: [<œuvre>, …]    # facultatif : disque à plusieurs films
        type:           {valeur: film | serie | bonus | autre | null, niveau: …}
        format:         {valeur: DVD | BD | UHD | null, niveau: …}
        edition:        {valeur: <texte> | null, niveau: …}   # édition / version
        saison:         {valeur: <entier> | null, niveau: …}
        numero_disque:  {valeur: <entier> | null, niveau: …}
        episodes:       {valeur: <texte ou liste> | null, niveau: …}
        nature:         {valeur: film | bonus | episodes | mixte | null, niveau: …}
        a_verifier: true | false
        champs_a_verifier: [<nom de champ>, …]   # facultatif
        remarque: <texte>                        # facultatif (indices, codes…)
```

`page` est exprimé dans le repère de la photo. Pour `2_pages_empilees`
(classeur tourné), la correspondance avec les pages physiques est à confirmer
et la photo porte `a_verifier: true`. `nature` reprend les valeurs de
`exemplaire.nature` du design (§ 2) ; `mixte` = film et suppléments sur le même
disque.

## Niveaux

| Niveau | Sens | Valeur attendue d'un modèle |
|---|---|---|
| `lu` | Le texte ou le logo est visible sur la photo (éventuellement en petit). | Cette valeur. |
| `deduit` | Non écrit sur le disque, déduit par le relecteur (titre français d'un titre original, type « film »). **Jamais** pour `edition`, la langue ou `numero_disque`. | Accepté mais non exigé ; ne compte pas comme invention. |
| `illisible` | Quelque chose est probablement écrit mais ne se lit pas (reflet, flou, trop petit). | `null`. |
| `absent` | La zone est lisible et ne porte pas cette mention, ou le champ est sans objet (saison d'un film). | `null`. |

Une valeur donnée par un modèle alors que la vérité terrain est `illisible` ou
`absent` compte comme une **invention** (critère éliminatoire de L3). Un champ
`deduit` n'est pas pénalisé s'il est laissé à `null`.

## Règles de saisie

- Recopier `titre_lu` **tel qu'imprimé** (majuscules, ponctuation) ; la
  normalisation est faite au moment de la notation.
- Un titre lu seulement dans la mention de copyright reste `lu`, avec une
  `remarque`.
- Ne jamais propager une édition, un numéro de disque ou une langue d'un disque
  voisin ou d'un autre exemplaire.
- Les codes de catalogue (« BD-03-DIM2 », « B5 »…) vont en `remarque`, pas en
  `numero_disque`.
- Après correction par Sylvain, passer `a_verifier` à `false` et mettre à jour
  `statut`.
