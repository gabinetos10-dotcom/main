# GJS Agency — Warm Futurism ✦

The flagship marketing site for **GJS Agency** — a digital studio doing
**Web Creation · Automations · Scraping · Consulting**.

Art direction: **Warm Futurism** — an optimistic, dreamy, tactile vision of
the future. Daylight (cream) chapters alternate with Deep (indigo) chapters
where gold/apricot/raspberry accents glow like light in a night sky.
No dark-cyberpunk clichés were harmed in the making of this site.

## Run it

```bash
npm install
npm run dev        # → http://localhost:5173
```

```bash
npm run build      # production build → dist/
npm run preview    # serve the production build locally
```

## Stack

- **Vite + vanilla JS (ES modules)** — lightest path, zero framework overhead
- **Three.js** — the hero "Code Core": an iridescent breathing prism orbited
  by a galaxy of code glyphs (procedural geometry + custom GLSL, no model files)
- **GSAP + ScrollTrigger** — scroll choreography, split-text reveals, marquees
- **Lenis** — premium smooth scrolling
- **Canvas 2D** — all three mini-games

## Where to edit things

| What | Where |
|---|---|
| **All copy, nav, services, games, process, work, team** | `src/data/content.js` — placeholders are marked `[EDIT]` |
| **Brand colors & design tokens** | `src/styles/tokens.css` — the six core hexes are the brand, treat as law |
| **Global styles / components / sections** | `src/styles/*.css` |
| **Hero 3D scene & shaders** | `src/three/hero.js` |
| **Scroll & motion choreography** | `src/scripts/scroll.js` |
| **Games** | `src/games/{code-rush,flow-forge,data-harvest}.js`, shell in `src/games/arcade.js` |
| **Contact form endpoint** | `src/components/form.js` → replace `fakeSend()` with a real POST |
| **SEO/meta/OG** | `index.html` head + `public/og-card.svg` |

## The easter eggs 🥚

- **Konami code** (`↑ ↑ ↓ ↓ ← → ← → B A`) **or typing `GJS`** anywhere →
  **Dream Mode**: the 3D core goes hyperspace, brand blobs rain, hues sing —
  and the **secret Strategy Console** opens (commands: `help`, `strategy`,
  `promo`, `quiz`, `dream`, `clear`, `exit`). Yes, there's a promo code.
- **Click the logo 5×** → the monogram celebrates.
- The **glowing orb** in the footer opens the console directly.
- Open devtools → ASCII greeting in the console.

## Performance & accessibility notes

- Three.js and the games are **code-split and lazy-loaded**; the preloader
  counts real milestones (fonts, window load, 3D first frame).
- The 3D scene clamps DPR to 1.75, **pauses when offscreen or on a hidden
  tab**, and falls back to a static gradient poster when WebGL is missing.
- `prefers-reduced-motion` disables Lenis, GSAP reveals, the 3D scene, blob
  rain and the loader theatrics — content stays fully usable.
- Burger menu, arcade overlay and secret console all have **focus traps,
  ESC-to-close, `aria-expanded`/`aria-hidden`, and scroll locking**.
- Games run on desktop (keyboard/mouse) **and** mobile (tap/drag/swipe);
  high scores persist in `localStorage` (`gjs-arcade-best`), sound is
  optional and mutable (`gjs-arcade-muted`).

## Structure

```
index.html               page skeleton, all sections, SEO/meta
public/                  favicon.svg, og-card.svg
src/
  main.js                boot order & lazy imports
  data/content.js        ✏️ all editable content
  styles/                tokens → base → components → sections → games
  components/            loader, header+burger, cursor, form, render
  scripts/               scroll (Lenis+GSAP), eggs (easter eggs + console art)
  three/hero.js          the Code Core (scene + shaders)
  games/                 arcade shell + 3 games
```

---

© GJS Agency — made with unreasonable care. The future is warm ✦
