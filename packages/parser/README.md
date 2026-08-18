# @calque/parser

Lit un site déposé, produit un `blueprint.json`. **Ne modifie jamais le source** (§5).

```ts
import { analyze } from "@calque/parser";

const { blueprint, stats } = await analyze(snapshot);
```

`snapshot` est un `SourceSnapshot` (§24) : la page d'entrée, la liste des fichiers, et de
quoi lire les binaires à la demande. Le P4 le construira depuis un ZIP déposé ; les tests
le construisent depuis `@calque/fixtures`.

## Le chemin d'une page

```
HTML ──parse5──► arbre ──┬─► verrous (§9.2)      ──► locked[]
                         ├─► classification (§9.2) ──► fields[]
                         ├─► collections (§9.3)     ──► collections[]
                         ├─► blocs                   ──► blocks[]
                         └─► SEO (§9.5)              ──► seo
CSS  ──postcss──► jetons et polices (§9.4)           ──► theme
JS   ──acorn───► bibliothèques, textes dynamiques    ──► warnings[]
```

Trois choses méritent d'être sues avant de toucher au code.

**Le parcours est post-ordre.** Un élément ne devient un champ qu'après qu'on a constaté
que rien d'éditable ne vit en dessous. Sans cela, un `<div>` entier serait proposé comme
« texte » et son édition écraserait tout le sous-arbre.

**Les empreintes se comparent par ressemblance, pas par égalité.** Le troisième segment
d'une empreinte est un descripteur lisible — `img+div(h3+p+a)` — comparé jeton à jeton.
L'égalité stricte du §9.3 ne regrouperait aucune des collections hétérogènes des
fixtures. Seuil et plancher sont calibrés dans `@calque/blueprint/ids` et gelés par
`test/collections.test.ts`.

**Rien n'est resérialisé.** Chaque champ porte les offsets exacts de ses parties
réécrivables (`meta.valueRanges`), et le gabarit d'un item est découpé dans le source.
C'est la condition de l'identité byte-à-byte que le P3 doit garantir.

## Voir ce qu'il trouve

```bash
pnpm parser:report ../../fixtures/02-restaurant-multipage
```

Le rapport est écrit pour être lu par un humain — pas de chemin DOM, pas de code
technique (§21).

## Mesurer

```bash
pnpm vitest run --project parser
```

`test/recall.test.ts` porte le critère d'acceptation du §9.3 : **≥ 90 % de rappel** sur
les champs annotés des trois fixtures, champs critiques comptés double, et **zéro faux
positif destructeur**. Le banc résout les sélecteurs de `expected.json` avec cheerio, puis
calcule le `domPath` avec le code du parser lui-même — l'accord entre les deux arbres est
testé séparément dans `test/dom-path.test.ts`.

## Ce qui n'est pas là

- `build()` — P3.
- `reconcile()` — la réconciliation d'une re-livraison, P10. Le blueprint porte déjà de
  quoi la faire : `domPath`, `fingerprint` et `contentHash` par champ.
- La passe IA de renommage des libellés (§19) — P10. Elle s'appliquera comme un calque
  séparé (`labelPatch`), jamais en bloquant l'analyse.
