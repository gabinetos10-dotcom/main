# GJS — Studio digital immersif

Site vitrine ultra‑haut de gamme pour **GJS**, agence française spécialisée en
**création web sur‑mesure**, **automatisation**, **web scraping** et **conseil tech**.

Expérience immersive : preloader animé, arrière‑plan WebGL réactif, mini‑jeux
interactifs, easter egg CLI, smooth scroll et micro‑interactions calibrées.

> **Create • Automate • Scrape • Consult**

## ✨ Stack technique

| Domaine        | Outil                                             |
| -------------- | ------------------------------------------------- |
| Framework      | Next.js 15 (App Router) · React 19 · TypeScript   |
| Styles         | Tailwind CSS v4 + design system CSS tokenisé      |
| Animations     | Framer Motion                                     |
| 3D / Canvas    | Three.js · @react-three/fiber · @react-three/drei |
| Smooth scroll  | Lenis                                             |
| Icônes         | lucide-react                                      |

## 🚀 Démarrage

```bash
npm install
npm run dev        # http://localhost:3000
npm run build      # build de production
npm run start      # sert le build
```

## 🧩 Fonctionnalités

- **Preloader** — compteur fluide, monogramme qui se dessine, reveal en rideau.
- **Header flottant** en glassmorphism, boutons magnétiques, statut « live »,
  menu mobile plein écran.
- **Arrière‑plan WebGL** — nuage de particules en apesanteur réactif au curseur,
  grille réactive, dégradé auroral. Dégradé statique en `prefers-reduced-motion`.
- **Playground interactif** :
  - _Scraping Simulator_ — terminal live qui parse une URL et structure la donnée.
  - _Automation Flow Builder_ — reliez 3 nœuds (drag/tap) pour débloquer « +85% ».
- **Easter egg** — Konami code (`↑↑↓↓←→←→ B A`) ou 5 clics sur le logo → mode
  **Matrix Terminal** CLI interactif (`help`, `about`, `services`, `exit`…).
- **Sections** — Hero kinetic, 4 piliers en cartes tilt 3D, ADN + compteurs,
  case studies en scroll horizontal épinglé, formulaire de contact en 4 étapes.
- **Footer** — rupture ultra‑saturée, marquee géant, horloge temps réel de Paris,
  CTA magnétique.
- **RGPD** — bandeau cookies non intrusif + pages/modales _Mentions légales_ et
  _Politique de confidentialité_.

## 🎨 Design system

Parti pris **éditorial** : quasi‑monochrome chaud, **un seul accent** (ember),
la typographie et le vide font le travail — pas de dégradé arc‑en‑ciel.

Typographie : **Bricolage Grotesque** (display), **Instrument Serif** en
italique pour les mots‑clés (la signature `.em` / `<Em>`), Inter (texte),
JetBrains Mono (labels techniques). Curseur sur‑mesure (`CustomCursor`) en
`mix-blend-difference`.

Toute la marque se re‑skinne depuis les tokens CSS dans
[`src/app/globals.css`](src/app/globals.css) :

```css
--color-bg:        #0a0a0b;  /* near‑black chaud        */
--color-surface:   rgba(255,255,255,.028);
--color-accent:    #ff5a2c;  /* ember — l'unique accent */
--color-highlight: #ede9e1;  /* off‑white (emphase)     */
--color-text:      #ece8e0;  /* papier chaud            */
--color-ivory:     #f1ece2;  /* rupture claire du footer */
```

Changez ces valeurs et l'ensemble du site (accents, glows, bordures, footer)
s'adapte.

## 📁 Architecture

```
src/
├── app/                      # routes, layout, design system global
│   ├── mentions-legales/     # page légale dédiée
│   └── confidentialite/      # page RGPD dédiée
├── components/
│   ├── canvas/               # scène WebGL (particules, lazy‑loaded)
│   ├── games/                # Scraping Simulator · Automation Builder
│   ├── sections/             # Hero, Expertise, Playground, About, …
│   ├── ui/                   # Header, Preloader, Magnetic, Marquee, …
│   ├── legal/                # modale + contenus légaux partagés
│   ├── easter-egg/           # Matrix Terminal
│   └── providers/            # Lenis smooth scroll · easter egg context
├── hooks/                    # useMousePosition, useKonamiCode, useMediaQuery
└── lib/                      # données de contenu · utilitaires
```

## ♿ Performance & accessibilité

- Three.js **lazy‑loadé** (hors bundle initial) et jamais rendu côté serveur.
- Densité de particules **réduite sur mobile**, canvas Matrix throttlé à ~18 fps.
- Respect de `prefers-reduced-motion` (Lenis et WebGL désactivés, fallback statique).
- `requestAnimationFrame` + cleanup systématique des listeners et effets.

---

Fait avec ♥ en France.
