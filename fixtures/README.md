# Fixtures

Trois sites de test et leur vérité terrain. Ils ne sont pas là pour être jolis : chacun
existe pour mettre en échec une hypothèse précise du parser.

| Fixture                     | Site                   | Pages | Ce qu'elle met à l'épreuve                                                      |
| --------------------------- | ---------------------- | ----- | ------------------------------------------------------------------------------- |
| `01-artisan-landing`        | Menuiserie, Annecy     | 1     | Collection hétérogène, FAQ en `<details>`, compteurs animés, Tailwind CDN       |
| `02-restaurant-multipage`   | Bistrot, Lyon          | 4     | En-tête partagé, variables CSS, tableaux, `<picture>`, iframe Maps              |
| `03-portfolio-onepage-gsap` | Photographe, Marseille | 1     | GSAP ScrollTrigger, **SplitText**, shadow DOM, images de fond, pages virtuelles |

## Le format `expected.json`

Chaque fixture porte un `expected.json` validé par
`packages/blueprint/src/expected.ts`. Le banc de mesure vit dans
`packages/parser/test/recall.test.ts` et en tire deux chiffres :

- **le rappel** — part des champs attendus effectivement détectés. Le critère du §9.3 est
  **≥ 90 %**. Un champ marqué `"critical": true` compte double : c'est un champ dont
  l'absence rendrait le produit inutilisable sur cette fixture (titre principal, photo
  d'accueil, téléphone).
- **les faux positifs destructeurs** — tout élément listé dans `mustBeLocked` mais classé
  éditable. Le critère est **zéro**. Un seul suffit à faire échouer la phase.

Les éléments sont désignés par **sélecteur CSS**, pas par `domPath` : un sélecteur reste
lisible et modifiable à la main, un `domPath` non.

Un sélecteur de `mustBeLocked` s'entend au pluriel : **tous** les éléments qu'il désigne
doivent être verrouillés. `.counter` couvre ainsi les quatre compteurs d'un coup.

## Les liens morts sont voulus

Les trois fixtures pointent vers une page de mentions légales absente de l'archive. Ce
n'est pas un oubli : une agence livre régulièrement un site dont un lien de pied de page
n'a jamais été écrit. Le parser doit produire un champ `link` sans se plaindre, et le
build doit reconduire la cible telle quelle. Ne « corrigez » pas ces liens.

## Les images

Générées, pas photographiées :

```bash
pnpm fixtures:assets
```

Le script (`tools/generate-assets.mjs`) produit des JPEG déterministes aux dimensions et
ratios choisis pour exercer le recadrage (§14) et la génération de `srcset`. Aucune
question de droits, poids maîtrisé, régénération à l'identique.

## Regarder les fixtures

Ce sont des sites statiques : il suffit de les servir.

```bash
python3 -m http.server 8080 --directory fixtures/01-artisan-landing
```

La fixture GSAP charge ses bibliothèques depuis un CDN. Hors ligne, elle s'affiche sans
animation — et comme `.reveal` est à `opacity: 0`, la page paraît vide. Ce n'est pas un
défaut de la fixture : **c'est exactement le problème que le mode d'édition statique du
§11 doit résoudre**, et la raison d'être de cette troisième fixture.

## Ce que les fixtures ne couvrent pas

À compléter si le besoin apparaît :

- Site livré sous forme de fragments HTML sans `<html>` (composants partagés).
- Tailwind compilé plutôt que servi par CDN.
- Site multilingue avec `hreflang`.
- Carrousel qui clone ses diapositives au runtime.
