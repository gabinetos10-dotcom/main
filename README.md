# Loc'n'Joy

Site vitrine d'une société **fictive** de location de voitures à Paris.
*Roulez dans des histoires qui valent le détour.*

Landing page statique, sans dépendance ni étape de build : il suffit d'ouvrir
`index.html` dans un navigateur.

## Direction artistique

La mise en page et le langage visuel s'inspirent fidèlement de la structure du
site de référence (Aardvark Book Club, réalisé sous Webflow), **réinterprétés
pour l'automobile** : tout le texte, les noms et les illustrations sont
**originaux**.

- **Palette** : fond blanc cassé, **rouge signature** comme couleur d'accent, et
  des **blocs pastel** (rose, pêche, jaune, bleu, pervenche) pour les cartes et
  les bandes de section — l'esprit coloré et joyeux du modèle, en rouge & blanc.
- **Typographies** : *Bricolage Grotesque* pour les gros titres, *Hanken
  Grotesk* pour le corps, et *Caveat* pour les **annotations manuscrites**
  (« livrée en 90 min ! ») — des équivalents libres proches des polices du
  modèle (Champ / Degular / Hello Organichand).
- **Boutons pilules**, coins très arrondis, grands titres, stickers pivotés :
  les codes visuels du modèle, adaptés au contexte.
- **Illustrations** : voitures dessinées en **SVG maison** (contour noir, corps
  rouge), posées dans des blocs pastel comme les couvertures du site d'origine.
- **Noms de véhicules** inventés à consonance parisienne (La Pigalle, Le
  Cabriolet Rivoli, La Bastille, Le Bolide Vendôme…).

## Structure de la page

Navigation collante · hero (titre géant + bloc pastel avec voiture) · sélection
du mois (6 voitures) · « Comment ça roule ? » en 4 étapes · catégories
filtrables · application mobile · offres & tarifs · carte cadeau · presse ·
voiture de l'année · exclusivité « La Belle Époque » · FAQ · pied de page — un
enchaînement calqué sur celui du site de référence.

## Mouvement (comme le site de référence)

La « mécanique » d'animation reprend celle du modèle, avec les mêmes
librairies open-source (Lenis + GSAP), pilotée par du code maison :

- **Scroll fluide à inertie** (Lenis) — la signature du site d'origine
- **Entrée du hero façon SplitText** : le titre apparaît mot par mot
- **Révélations au défilement** en cascade par lot (GSAP ScrollTrigger)
- **Parallaxe** sur le bloc hero, la carte cadeau et la voiture de collection
- **Bandeau défilant (marquee)** dont la vitesse et le sens suivent le défilement
- **Boutons magnétiques** (les CTA principaux suivent le curseur)
- **Repli propre** : si les librairies ne se chargent pas, révélations via
  IntersectionObserver ; respect complet de `prefers-reduced-motion`

Les librairies (MIT) sont **embarquées dans `lib/`** : le site reste
autonome, sans dépendance à un CDN.

## Interactions

- Menu mobile (hamburger), en-tête qui se densifie au défilement
- Galerie de catégories **filtrable** (rendue en JavaScript)
- Accordéon FAQ (une réponse ouverte à la fois), formulaire newsletter

## Fichiers

| Fichier        | Rôle                                                     |
|----------------|----------------------------------------------------------|
| `index.html`   | Structure, contenu et illustrations SVG inline           |
| `styles.css`   | Palette, typographie, composants, responsive             |
| `script.js`    | Scroll fluide, animations, filtres, FAQ, menu…           |
| `lib/`         | Lenis + GSAP + ScrollTrigger (MIT), embarqués localement  |

---

Projet de démonstration. « Loc'n'Joy », les médias cités et les tarifs sont
fictifs. Le contenu (textes, noms, illustrations) est original ; seule la
grammaire visuelle s'inspire du site de référence.
