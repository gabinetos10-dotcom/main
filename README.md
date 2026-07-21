# Maison Jolie Wedding

Site vitrine de **Maison Jolie Wedding** — Mélina, wedding planner & wedding designer
en Occitanie (Montpellier, Béziers, Narbonne).

> *Une sensibilité esthétique, guidée par les liens humains.*

## Stack — 100 % statique, zéro build

HTML5 + CSS3 + JavaScript **vanilla**. Aucun framework, bundler ni étape de build.
Il suffit d'ouvrir `index.html` ou de déposer le dossier sur n'importe quel
hébergement statique (Netlify, GitHub Pages, OVH, o2switch…).

Les seules dépendances externes sont **Google Fonts** (Fraunces, Ephesis, Hanken
Grotesk) chargées par `<link>`. Toute l'imagerie est faite d'**illustrations SVG
originales** et de dégradés CSS — aucune photo externe requise (les crédits
`© Yann Bader`, `© Cindy Gonzalez`, `© Lydia Torresan` sont réservés dans le
markup pour les vraies photos).

## Structure

```
index.html                    Page d'accueil (toutes les sections + mini-jeu)
wedding-planner.html          Service — organisation
wedding-designer.html         Service — décoration / scénographie
portfolio.html                Galerie filtrable + lightbox
blog.html                     Journal (inspirations / conseils / coulisses)
contact.html                  « Je me marie ! »
mentions-legales-cgv.html     Légal (champs [À COMPLÉTER])
politique-confidentialite.html  RGPD (champs [À COMPLÉTER])

css/  reset.css · variables.css (tokens) · style.css · animations.css
js/   components.js (header/footer) · main.js (curseur, confettis, tilt, magnétisme)
      nav.js · petals.js · preloader.js · scroll.js (reveals/parallaxe/galerie)
      moodboard.js (mini-jeu signature) · transitions.js · form.js · easteregg.js
assets/ svg/ (og-image) · images/ · icons/
```

## Points forts

- **Preloader cinématographique** (monogramme MJ tracé à l'or, voile qui se soulève) — une fois par session.
- **Fond vivant** : mesh gradient animé, pétales en `<canvas>`, halo solaire, grain, scrollbar sur-mesure.
- **Mini-jeu « Composez votre univers »** : générateur de moodboard en direct sur `<canvas>`, accessible clavier, qui pré-remplit le formulaire de contact.
- **Micro-interactions** : boutons magnétiques, cartes en tilt 3D, curseur custom, confettis, révélations au scroll.
- **Transitions de page** inter-`.html` (voile), **easter egg** (« OUI »), **bannière cookies RGPD**.
- **Accessibilité** : HTML sémantique, navigation clavier complète, focus visibles, ARIA, `prefers-reduced-motion` respecté, contrastes AA.
- **SEO** : meta, Open Graph, JSON-LD `LocalBusiness`.

## À personnaliser avant mise en ligne

- Remplacer les illustrations SVG par les vraies photos (`assets/images/`, en `<picture>` AVIF/WebP + JPEG).
- Renseigner les champs `[À COMPLÉTER]` des pages légales.
- Brancher un endpoint d'envoi de formulaire — chercher `// TODO endpoint` dans `js/form.js`
  (fallback `mailto:` en place par défaut).
- Valider les contenus rédactionnels balisés `<!-- COPY (à valider) -->` dans le HTML.

---
Des mariages élégants, pensés avec le cœur.
