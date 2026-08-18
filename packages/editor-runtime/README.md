# @calque/editor-runtime

Injecté **uniquement en mode aperçu**, jamais dans le site publié. Bundlé en IIFE par
esbuild, **9,5 kB gzip** pour un budget de 40 (§4) — la build échoue au-delà.

## Il est chargé en premier, et ce n'est pas un détail

Le runtime est injecté en tête du `<head>`, avant les `<script>` du site. C'est le seul
instant où il peut définir `window.gsap` avant que le CDN ne le définisse lui-même.
Injecté en fin de `<body>`, il arriverait après la bibliothèque : les éléments seraient
déjà revenus à `opacity: 0` et l'aperçu resterait une page blanche.

## Mode d'édition statique (§11)

Sur la majorité des sites vibe-codés, rien n'est visible avant un défilement. Dans une
iframe d'édition, personne ne défile.

Deux gestes, dans cet ordre :

1. une feuille de style qui force l'état final de `.reveal`, `[data-aos]`, `[data-scroll]`
   et consorts — le CSS du site n'est jamais modifié, on empile une feuille plus
   spécifique ;
2. des bouchons inertes à la place de GSAP, ScrollTrigger, SplitText, SplitType, AOS,
   Locomotive, Lenis et Splitting. Ils sont posés en propriétés **non réinscriptibles** :
   un script qui ferait `window.gsap = …` échoue silencieusement plutôt que de reprendre
   la main.

Le bouchon `SplitText` mérite une mention : la vraie bibliothèque démonte un titre en
dizaines de `<span>`, faisant disparaître le champ du DOM au moment précis où
l'utilisateur veut cliquer dessus. Le bouchon rend l'élément intact.

## Résolution d'un champ

Trois voies, de la plus sûre à la plus tolérante : l'attribut `data-calque-field` posé au
build, puis le `domPath`, puis l'empreinte plus le hachage de contenu. La troisième compte
plus qu'il n'y paraît : sur un site animé, le DOM au moment du clic n'est pas celui que le
parser a analysé.

## Protocole

`@calque/protocol`, validé par Zod des deux côtés, versionné, origines vérifiées dans les
deux sens. Un message d'une autre version ou d'une autre origine est ignoré sans bruit :
une fenêtre reçoit des messages d'extensions et d'outils de développement en permanence.

`zod/mini` plutôt que `zod` : la variante complète coûterait à elle seule plus que le
budget entier.

## Ce qu'il ne fait pas

- Il ne connaît ni la base, ni l'authentification, ni le contenu publié. Il reçoit une
  liste de champs et parle par `postMessage` — c'est ce qui permet de le servir depuis un
  autre domaine sans lui confier le moindre jeton.
- Il n'enregistre rien. Ce qu'il écrit dans le DOM vivant est un affichage ; la vérité est
  le calque de contenu, et c'est le builder qui produira le site.
