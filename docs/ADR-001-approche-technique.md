# ADR-001 — Approche technique : détection automatique sur HTML livré

**Statut :** accepté · **Date :** 2026-08-17 · **Phase :** P0

---

## Contexte

Une agence livre des sites statiques codés rapidement, souvent en vibe coding. Le client
final veut ensuite changer un texte, une photo, un horaire, un tarif — sans rappeler
l'agence, et sans rien casser.

Toutes les solutions existantes exigent de **réauthorer le site** dans leur format :
composants annotés, schéma de contenu déclaré, ou reconstruction dans un éditeur
propriétaire. Cette réauthoring est précisément le coût qu'on refuse de faire payer.

La question à trancher : **comment rendre un site éditable sans demander à l'agence de le
réécrire ?**

---

## Options examinées

### 1. Annotations obligatoires dans le HTML — _Decap CMS_

Decap (ex-Netlify CMS) fonctionne sur un schéma de collections déclaré en YAML, adossé à
des fichiers Markdown. Le HTML n'est pas la source de vérité : le contenu l'est, et le
site est régénéré par un générateur statique.

**Écarté.** Suppose une architecture contenu/gabarit préexistante. Un site vibe-codé n'en
a pas : le contenu _est_ dans le HTML. Adopter Decap voudrait dire extraire le contenu,
inventer un schéma, et réécrire le site comme un gabarit — soit exactement la réauthoring
qu'on refuse.

### 2. Édition contextuelle avec schéma déclaré — _TinaCMS_

Tina offre la meilleure expérience d'édition visuelle du marché : le client clique dans un
aperçu réel de son site. Mais l'aperçu est un rendu React, et chaque champ éditable doit
être câblé au schéma Tina dans le code du composant.

**Écarté comme socle, retenu comme référence d'expérience.** Le modèle « je clique sur ce
que je vois » est exactement ce qu'on veut offrir, et il inspire directement le §11 et le
§12. Ce qu'on refuse, c'est le câblage manuel : chez nous, la détection remplace la
déclaration.

### 3. Constructeur par blocs — _Puck_

Puck est un éditeur de pages React : on déclare un catalogue de composants, le client les
assemble. Excellent quand on part d'une bibliothèque de composants.

**Écarté.** Le point de départ est un fichier HTML, pas un catalogue de composants React.
Et l'assemblage libre est explicitement hors périmètre (§6) : le client ne doit pas
pouvoir déplacer le layout au pixel, seulement remplir des emplacements que le designer a
prévus.

### 4. Éditeur visuel de site complet — _Silex, Pinegrow, Webflow_

Ces outils importent ou produisent du HTML et laissent tout modifier : structure,
styles, positionnement.

**Écarté pour deux raisons.** D'abord le périmètre : donner à un restaurateur la
possibilité de déplacer une section, c'est lui donner la possibilité de casser son site.
Ensuite l'aller-retour : ces éditeurs _possèdent_ le HTML après import et le
reformatent. L'agence ne peut plus re-livrer une v2 de son design depuis son propre code
sans perdre le travail du client.

---

## Décision

**Analyser le HTML livré, détecter automatiquement ce qui est modifiable, verrouiller le
reste, et stocker les modifications du client comme un calque séparé.**

```
build(source_immuable, blueprint, contenu) → site_final
```

Trois propriétés découlent de cette forme :

1. **Le source n'est jamais muté.** Les fichiers déposés sont stockés en lecture seule.
   Corrompre le site original est impossible par construction, pas par précaution.
2. **Le contenu survit au design.** Une v2 du design produit un nouveau blueprint ; le
   calque de contenu est réconcilié contre lui (§8). L'agence continue de coder dans son
   éditeur, avec son propre dépôt.
3. **L'historique et le retour arrière sont gratuits.** Une version publiée est un
   instantané du calque, pas une copie du site. Revenir en arrière, c'est rejouer
   `build()` avec un calque antérieur.

Les annotations `data-calque` (§9.6) existent, mais restent **facultatives** : elles
affinent une détection qui fonctionne sans elles. C'est l'inverse du modèle Decap/Tina,
où l'annotation est la condition d'existence du champ.

---

## Ce que cette approche coûte

Le choix n'est pas gratuit, et il faut nommer la facture :

- **La détection est heuristique, donc faillible.** D'où le critère chiffré du §9.3 (≥ 90 %
  de rappel, 0 faux positif destructeur) et la couverture de tests maximale sur le parser.
  Les overrides admin (§9.6) sont la soupape : ce que l'heuristique rate, l'admin le
  corrige en une fois, à l'onboarding.
- **On ne peut offrir que ce que le HTML expose.** Pas de nouveau type de bloc, pas de
  champ qui n'existe pas déjà dans le design. C'est une limite assumée : le produit vend
  la mise à jour de contenu, pas la création de page (§6).
- **La fidélité de reconstruction est une contrainte permanente.** Regénérer le site
  impose de ne rien abîmer de ce qu'on ne touche pas. C'est ce qui motive l'invariant
  byte-à-byte du §15 et l'architecture du builder décrite en ADR-002.

---

## Conséquences

- `packages/parser` est le composant le plus critique du produit et porte la plus forte
  exigence de test (§22 P2).
- `packages/builder` doit garantir l'identité byte-à-byte sur contenu inchangé, sous peine
  de rendre chaque publication suspecte (§15, ADR-002).
- Parser et builder sont deux implémentations d'une même interface `SiteAdapter`
  (`packages/blueprint/src/adapter.ts`), conçue dès P0 pour que la v2 — sites avec build
  step (§24) — se branche derrière sans toucher au blueprint ni à l'éditeur.
- L'éditeur ne manipule jamais de HTML : il lit un blueprint et écrit un calque. C'est ce
  qui le rend indépendant de l'adaptateur.
