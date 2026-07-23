# Loc'n'Joy

Site vitrine d'une société **fictive** de location de voitures à Paris.
*La location de voiture qui a le goût de Paris — prenez la route, on vous laisse la joie.*

Landing page statique, sans dépendance ni étape de build : il suffit d'ouvrir
`index.html` dans un navigateur.

## Univers & direction artistique

- **Concept** : « Paris chic × automobile ». Base ivoire chaleureuse, **rouge
  signature** vif, encre profonde — dominante rouge & blanc.
- **Mode nuit « Paris de nuit »** : thème sombre complet, mémorisé, avec ciel
  étoilé, lune et fenêtres allumées dans la scène du hero.
- **Typographies** : *Fraunces* (serif éditorial, l'élégance parisienne),
  *Hanken Grotesk* (sans moderne pour l'interface), *Spline Sans Mono* (chiffres
  « tableau de bord » : prix, stats, plaques).
- **Illustrations** : toutes réalisées en **SVG maison** (voitures de profil,
  Tour Eiffel, immeubles haussmanniens, voiture de collection, carte de Paris…).
  Aucune image externe : le site s'affiche partout, tout de suite.
- **Noms de véhicules** inventés à consonance parisienne (La Pigalle, Le
  Cabriolet Rivoli, La Bastille, Le Bolide Vendôme…).

## Contenu de la page

Écran de chargement · bandeau promo · navigation collante · hero avec scène de
Paris et **barre de réservation** · sélection du mois (6 voitures) · « Comment ça
marche » en 4 temps · catégories filtrables · **carte interactive des points de
retrait** · application mobile · offres & tarifs · carte cadeau · presse ·
**carrousel de témoignages** · voiture de l'année · exclusivité « La Belle
Époque » · FAQ · appel à l'action · pied de page.

## Interactions & animations

- **Écran de chargement** de marque (voiture qui roule + barre de progression),
  puis entrée orchestrée du hero en cascade
- **Bascule jour / nuit** avec mémorisation (localStorage) et respect du thème
  système au premier chargement
- **Barre de réservation** : lieu + dates pré-remplies, recherche animée et
  notification (toast)
- **Carte de Paris interactive** : points de retrait cliquables mettant à jour
  la fiche agence
- **Carrousel de témoignages** auto-défilant (flèches, pastilles, pause au survol)
- **Cartes voitures en relief 3D** suivant le curseur
- Galerie de catégories **filtrable**, barre de progression de défilement,
  compteurs animés, parallaxe souris sur la scène de Paris, reflets sur les boutons
- Menu mobile, accordéon FAQ, formulaire newsletter, bandeau cookies, retour en haut

## Fichiers

| Fichier       | Rôle                                                       |
|---------------|------------------------------------------------------------|
| `index.html`  | Structure, contenu et illustrations SVG inline             |
| `styles.css`  | Thème clair/sombre, mise en page, composants, responsive   |
| `script.js`   | Chargement, thème, réservation, carte, carrousel, filtres… |

## Accessibilité & responsive

Contrastes soignés en thème clair **et** sombre, `aria-label` sur les éléments
interactifs, points de carte navigables au clavier, respect complet de
`prefers-reduced-motion` (animations et défilement automatique désactivés), et
mise en page fluide du mobile (~360 px) au grand écran.

---

Projet de démonstration. « Loc'n'Joy », les agences, les médias et les
témoignages cités sont fictifs.
