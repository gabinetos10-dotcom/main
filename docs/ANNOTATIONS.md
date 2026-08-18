# Annotations `data-calque`

Cinq attributs à poser dans le HTML pendant le vibe coding. Ils disent au parser ce
qu'il doit faire d'un élément, au lieu de le lui laisser deviner.

Ils sont **facultatifs** : sans eux, l'heuristique du §9.2 fait le travail. Ils
servent quand on veut être sûr — et ils deviennent, à l'usage, la convention
d'écriture de l'agence.

## Les cinq rôles

```html
<!-- Un champ, avec son nom tel que le client le verra -->
<h1 data-calque="text" data-calque-label="Titre de la page" data-calque-max="60">…</h1>

<!-- Une liste que le client pourra allonger -->
<div data-calque="collection" data-calque-label="Nos services" data-calque-max="8">…</div>

<!-- Un bloc à ne jamais laisser modifier -->
<section data-calque="lock">…</section>

<!-- Une image, avec son cadrage imposé -->
<img data-calque="image" data-calque-ratio="4/3" data-calque-label="Photo du plat" />

<!-- Un regroupement, présenté au client comme une partie à part -->
<div data-calque="group" data-calque-label="Bloc horaires">…</div>
```

## Les attributs

| Attribut            | Sur                 | Effet                                                         |
| ------------------- | ------------------- | ------------------------------------------------------------- |
| `data-calque`       | tout élément        | Rôle : un type de champ, `collection`, `lock` ou `group`      |
| `data-calque-label` | tout élément annoté | Le nom affiché au client. Écrivez-le en français, sans jargon |
| `data-calque-max`   | champ, collection   | Longueur maximale d'un texte, ou nombre maximal d'items       |
| `data-calque-min`   | collection          | Nombre minimal d'items                                        |
| `data-calque-ratio` | image               | Format de recadrage imposé, écrit `16/9`                      |

Les valeurs possibles de `data-calque` pour un champ sont celles du §9.2 :
`text`, `richtext`, `image`, `link`, `cta`, `video-embed`, `map-embed`, `icon`,
`contact`, `social`, `form-endpoint`, `boolean`.

## Qui gagne

**Annotation dans le code > surcharge de l'admin en base > heuristique.**

L'annotation gagne parce qu'elle est écrite par la personne qui a fabriqué le site :
c'est l'intention la plus proche de la vérité. Une surcharge d'admin s'applique donc
partout _sauf_ là où le code a déjà tranché — ce qui est aussi ce qui permet de
re-livrer un design sans perdre les réglages faits dans l'interface.

## Ce que le parser ne fera pas

- **Changer un type vers une forme de valeur incompatible.** `data-calque="image"`
  sur un `<p>` de texte est ignoré : il n'y a pas d'image à en tirer, et fabriquer
  une valeur vide produirait un champ cassé. L'annotation est ignorée, l'heuristique
  reprend la main.
- **Se taire sur une annotation illisible.** Un rôle inconnu — faute de frappe,
  attribut inventé — est ignoré sans bruit côté classification ; le rapport
  d'ingestion le signalera.
- **Déverrouiller ce que la sécurité verrouille.** `data-calque="text"` sur un
  `<script>` ne l'ouvre pas à l'édition.

## Un exemple complet

```html
<section class="services" data-calque="group" data-calque-label="Nos prestations">
  <h2 data-calque="text" data-calque-label="Titre de la section" data-calque-max="45">
    Ce que nous fabriquons
  </h2>

  <div
    class="grille"
    data-calque="collection"
    data-calque-label="Cartes services"
    data-calque-max="6"
  >
    <article class="carte">
      <img
        src="assets/cuisine.jpg"
        alt="Cuisine en chêne"
        data-calque="image"
        data-calque-ratio="4/3"
        data-calque-label="Photo du service"
      />
      <h3 data-calque="text" data-calque-max="40">Cuisines sur mesure</h3>
      <p data-calque="text" data-calque-max="160">Façades en chêne, frêne ou noyer.</p>
    </article>
    …
  </div>

  <p class="mention-legale" data-calque="lock">Devis non contractuel.</p>
</section>
```
