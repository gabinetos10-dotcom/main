# Loc'n'Joy

Site vitrine d'une société **fictive** de location de voitures à Paris.
*La location de voiture qui a le goût de Paris — prenez la route, on vous laisse la joie.*

Landing page statique, sans dépendance ni étape de build : il suffit d'ouvrir
`index.html` dans un navigateur.

## Univers & direction artistique

- **Concept** : « Paris chic × automobile ». Base ivoire chaleureuse, **rouge
  signature** vif, encre profonde — dominante rouge & blanc.
- **Typographies** : *Fraunces* (serif éditorial, l'élégance parisienne),
  *Hanken Grotesk* (sans moderne pour l'interface), *Spline Sans Mono* (chiffres
  « tableau de bord » : prix, stats, plaques).
- **Illustrations** : toutes réalisées en **SVG maison** (voitures de profil,
  Tour Eiffel, immeubles haussmanniens, voiture de collection…). Aucune image
  externe : le site s'affiche partout, tout de suite.
- **Noms de véhicules** inventés à consonance parisienne (La Pigalle, Le
  Cabriolet Rivoli, La Bastille, Le Bolide Vendôme…).

## Contenu de la page

Bandeau promo · navigation collante · hero avec scène de Paris · sélection du
mois (6 voitures) · « Comment ça marche » en 4 temps · catégories filtrables ·
application mobile · offres & tarifs · carte cadeau · presse · voiture de
l'année · exclusivité « La Belle Époque » · FAQ · appel à l'action · pied de page.

## Interactions

- Menu mobile (hamburger), en-tête qui se densifie au défilement
- Galerie de catégories **filtrable** (rendue en JavaScript)
- Révélations au défilement (IntersectionObserver)
- Accordéon FAQ (une réponse ouverte à la fois)
- Formulaire newsletter avec confirmation

## Fichiers

| Fichier       | Rôle                                             |
|---------------|--------------------------------------------------|
| `index.html`  | Structure et contenu, illustrations SVG inline   |
| `styles.css`  | Thème, mise en page, composants, responsive      |
| `script.js`   | Menu, filtres catégories, révélations, FAQ       |

## Accessibilité & responsive

Contrastes soignés, `aria-label` sur les éléments interactifs, respect de
`prefers-reduced-motion`, et mise en page fluide du mobile (~360 px) au grand
écran.

---

Projet de démonstration. « Loc'n'Joy » et les médias cités sont fictifs.
