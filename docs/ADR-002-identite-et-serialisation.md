# ADR-002 — Identité des champs et sérialisation du builder

**Statut :** accepté · **Date :** 2026-08-17 · **Phase :** P0 (à appliquer en P2/P3)

---

## Contexte

Deux problèmes distincts, tous deux capables de faire échouer le produit silencieusement.
Ils sont traités ensemble parce que leur solution est la même idée : **ne jamais faire
confiance à une position dans le DOM.**

---

## Problème 1 — L'invariant byte-à-byte est infaisable par sérialisation d'AST

Le §15 impose que `build(source, blueprint, contenu_initial)` produise un HTML identique
au source, « à la normalisation près ».

Or `parse5.serialize(parse5.parse(html))` **n'est pas l'identité**. Elle normalise les
guillemets d'attributs, ré-encode les entités, ferme les balises implicites, transforme
`<br />` en `<br>`, insère `<html>/<head>/<body>` autour d'un fragment, normalise le
doctype, met les noms de balises en minuscules. Sur un site vibe-codé, un build « sans
aucun changement » produit un diff de plusieurs centaines de lignes.

La clause « à la normalisation près » vide alors le test de son sens : elle absorbe aussi
bien la normalisation du sérialiseur qu'une vraie régression. Un test qui ne peut plus
distinguer les deux ne protège de rien.

### Décision

**Le builder n'est pas un sérialiseur d'AST : c'est un moteur d'épissage de chaînes.**

1. Parser avec `parse5` en activant `sourceCodeLocationInfo: true`, qui donne pour chaque
   nœud ses offsets exacts (`startOffset`, `endOffset`) dans le buffer d'origine.
2. Le parser inscrit ces offsets dans `field.meta.sourceRange` (déjà prévu dans le schéma
   du blueprint).
3. Le builder applique les modifications par **splices ordonnés à rebours** sur la chaîne
   source : en partant de la fin, chaque remplacement laisse intacts les offsets des
   modifications restantes.
4. Tout ce qui n'est pas explicitement remplacé reste **bit pour bit identique** :
   indentation, commentaires, guillemets, tics de formatage du générateur.

L'invariant devient littéralement vrai — zéro octet de diff — et le test de P3 redevient un
vrai filet de sécurité.

### Conséquences

- Les insertions de collection détectent l'indentation locale du conteneur avant
  d'insérer, pour ne pas défigurer le fichier.
- Le CSS d'override est injecté par splice juste avant `</head>`, pas par manipulation
  d'arbre.
- La suppression des attributs `data-calque*` (§15, étape 9) est elle aussi un splice.
- Un champ dont le `sourceRange` est absent ou invalide n'est **pas** écrit : il est
  signalé dans `BuildResult.unresolvedFieldIds`. Jamais d'écriture approximative.

---

## Problème 2 — L'identité des champs se casse là où on en a le plus besoin

Le §9.1 définit `fieldId = "fld_" + sha1(pagePath + "::" + domPath).slice(0, 10)`, avec un
`domPath` positionnel (`section:nth-of-type(2)`). Trois failles se composent :

**a. Péremption pendant le build.** Le builder supprime des items, en insère, duplique des
blocs, masque des sections. Dès la première mutation, tous les `domPath` situés après elle
sont périmés. Un builder qui résout paresseusement écrit dans le mauvais nœud — sans
erreur.

**b. Le déterminisme est déjà faux.** Le §13 crée des `fieldId` préfixés `dup_` lors d'une
duplication de bloc. Ces identifiants ne sont dérivables d'aucun `domPath` du source,
puisque le bloc dupliqué n'existe pas dans le source.

**c. La réconciliation hérite du problème.** Une v2 du design qui insère une section en
tête de page décale tous les `nth-of-type` et invalide 100 % des `fieldId` de la page. Le
mapping de migration (§8) tomberait intégralement sur le score de similarité, jamais sur
le match exact — alors que c'est précisément le cas où le contenu du client doit survivre.

### Décision

**1. `fieldId` est une identité opaque et persistée.**

Il est calculé une fois à l'ingestion, stocké, puis traité comme une chaîne sans
structure. Il n'est **jamais recalculé à la lecture**. Le recalcul ne sert qu'à _proposer_
un mapping lors d'une re-livraison.

**2. Le builder résout tout avant de muter quoi que ce soit.**

Une passe complète construit une `Map<fieldId, sourceRange>` figée. Les mutations viennent
ensuite, par splices arrière. La résolution paresseuse devient impossible par
construction, pas par discipline.

**3. La résolution dégrade en trois étages, et échoue bruyamment.**

| Étage | Critère                       | Confiance     |
| ----- | ----------------------------- | ------------- |
| 1     | `domPath` exact               | 1,0           |
| 2     | `fingerprint` + `contentHash` | ~0,8          |
| 3     | `fingerprint` + proximité     | ~0,5          |
| —     | aucun                         | échec signalé |

Un champ non résolu produit un avertissement visible et une entrée dans
`unresolvedFieldIds`. Jamais une écriture au hasard.

**4. Le regroupement des collections utilise un seuil, pas une égalité.**

Le §9.3 groupe les enfants consécutifs de `fingerprint` **identique**. En vibe coding, les
cartes d'une grille sont rarement identiques : une carte porte un badge « Populaire », une
autre n'a pas d'image, une troisième a deux boutons. Le `shapeHash` diffère, le groupe se
scinde, et aucune collection n'est détectée — un faux négatif sur la fonctionnalité la
plus vendeuse du produit.

`fingerprintSimilarity()` (dans `@calque/blueprint/ids`) renvoie un score dans `[0..1]` :
la balise doit correspondre (sinon 0), puis Jaccard sur les classes (60 %) et égalité de
forme (40 %). Le seuil par défaut est **0,75**, calibré sur les fixtures en P2. Le champ
`collection.itemSignature` décrit la signature du **groupe**, et `collection.cohesion`
enregistre la similarité moyenne mesurée.

---

## Vérification

- P2 : le rappel du parser est mesuré contre `expected.json`, avec au moins une fixture
  portant une collection délibérément hétérogène (`heterogeneous: true`).
- P3 : `build(source, blueprint, contenu_initial) === source`, comparaison d'octets sur
  les 3 fixtures. Ce test s'écrit **avant** toute autre ligne du builder.
- Déjà couvert en P0 : `packages/blueprint/test/ids.test.ts` fige le comportement de
  `fingerprintSimilarity` sur le cas « carte avec badge », et vérifie que `dup_` n'est
  dérivable d'aucun chemin DOM.
