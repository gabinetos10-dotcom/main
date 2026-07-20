# Maison Jolie Wedding

Site vitrine de **Mélina — wedding planner & wedding designer en Occitanie**
(Montpellier · Béziers · Narbonne). Une pièce sur-mesure : direction
artistique « Solaire & poudrée », motion signature et un mini-jeu de moodboard
qui fait réagir le site au goût du visiteur.

> _« Une sensibilité esthétique, guidée par les liens humains. »_

---

## Stack technique

- **Next.js 14** (App Router) + **TypeScript**
- **Tailwind CSS** (tokens de palette en variables CSS)
- **Framer Motion** — transitions de composants, révélations, `AnimatePresence`
- **GSAP + ScrollTrigger** — timeline épinglée (« Le parcours d'un oui »)
- **Lenis** — smooth scroll (désactivé sous `prefers-reduced-motion`)
- **Canvas 2D** — pétales de fond + système de confettis (aucune lib lourde)
- **next/font** — Fraunces (serif), Ephesis (calligraphie), Hanken Grotesk (sans)

## Démarrer

```bash
npm install
npm run dev      # http://localhost:3000
npm run build    # build de production
npm run start    # sert le build
npm run lint
```

## Structure

```
app/                 Routes (App Router) + layout, sitemap, robots, favicon
  page.tsx           Page d'accueil (assemble les sections)
  wedding-planner/   Pages services
  wedding-designer/
  portfolio/  blog/  contact/
  mentions-legales/  politique-de-confidentialite/
  template.tsx       Transition de page (voile coloré + monogramme)
components/
  background/        Mesh gradient, pétales canvas, halo, grain
  preloader/         Écran de chargement cinématographique
  header/            Header + menu burger fleuri (mobile)
  sections/          Hero, Manifesto, Services, Journey, Moodboard, …
  portfolio/         Galerie filtrable + lightbox
  contact/           Formulaire + carte stylisée
  ui/                Button magnétique, Reveal, TiltCard, ArtVisual, curseur…
  brand/ decor/ legal/
lib/
  content.ts         ⭐ TOUT le contenu éditorial (source unique)
  moodboard.ts       Données & générateur du mini-jeu
  confetti.ts hooks.ts fonts.ts utils.ts
```

## Palette « Solaire & poudrée »

Définie en variables CSS dans `app/globals.css` et exposée à Tailwind
(`text-terracotta`, `bg-blush`, …). Le mini-jeu pilote `--mood-1/2/3` en direct
pour recolorer le fond du site.

| Token | Hex | Usage |
|---|---|---|
| `creme` | `#FDF7F0` | Fond principal |
| `ivoire` | `#FFFDFA` | Surfaces, cartes |
| `blush` | `#F6D2CE` | Rose pastel principal |
| `rose-poudre` | `#E39AA1` | Accents, hovers |
| `soleil` | `#FBE3A1` | Jaune ensoleillé |
| `miel` | `#F4C871` | Jaune doré secondaire |
| `sauge` | `#AFC7A6` | Vert eucalyptus |
| `terracotta` | `#E38B6D` | **CTA** & pics d'énergie |
| `or` | `#C9A227` | Filets fins, détails précieux |
| `prune` | `#46343B` | Encre & fond du footer |

---

## ✅ À faire avant la mise en ligne

Tous les points sont balisés dans le code par des commentaires.

- **`// [À VALIDER]`** — textes rédigés par le studio dans la voix de la marque
  (manifeste, descriptions de services, étapes, témoignages, articles, textes du
  moodboard). À relire/valider par Mélina. Centralisés dans `lib/content.ts` et
  `lib/moodboard.ts`.
- **`// [À REMPLACER]`** — les visuels sont pour l'instant des placeholders
  art-dirigés (`components/ui/ArtVisual.tsx`). À remplacer par les vraies
  photographies (© Yann Bader, © Cindy Gonzalez, © Lydia Torresan) via
  `next/image`. Les teintes de chaque projet sont dans `projects[]`.
- **`[À COMPLÉTER]`** — mentions d'éditeur/hébergeur, SIRET, CGV, médiateur, durées
  de conservation… surlignés en jaune sur les pages légales.
- **`// [À CONNECTER]`** — le formulaire de contact (`components/contact/ContactForm.tsx`)
  et la newsletter (`components/footer/Footer.tsx`) simulent l'envoi. Brancher une
  route API / un service (Brevo, Formspree…).

## Accessibilité & performance

- `prefers-reduced-motion` respecté partout (Lenis, GSAP, pétales, curseur et
  toutes les animations Framer via `<MotionConfig reducedMotion="user">`).
  Repli vertical accessible pour la timeline.
- Navigation clavier complète, focus visibles, ARIA sur le mini-jeu et la
  lightbox, contrastes soignés.
- Images modernes (AVIF/WebP) via `next/image`, particules plafonnées, libs de
  motion chargées à la demande.
- Métadonnées SEO, Open Graph, `sitemap.xml`, `robots.txt` et données
  structurées `LocalBusiness`.

## ✿ Petit secret

Tapez **« OUI »** au clavier n'importe où sur le site. 🤍
