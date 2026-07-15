# GJS Agency — Dreamy-Futuristic Agency Website

A premium, warm, mobile-first one-page site for **GJS Agency** in a
Solarpunk / Neo-Chromatique design language — luminous, welcoming, and
ultra-technological. 100% self-contained vanilla HTML5 / CSS / ES6+ —
no build step, no frameworks, no runtime dependencies (only Google Fonts
via CDN, with system-font fallback).

## Brand palette

| Token | Hex | Role |
|---|---|---|
| Indigo | `#324ea1` | structural anchor, deep contrast zones |
| Nuage / Cloud | `#a0c3eb` | airy backgrounds, glass panels |
| Or / Gold | `#ffc243` | focal points, interactive states |
| Abricot | `#eb6a29` | welcoming accents, UI indicators |
| Framboise | `#9b2d84` | luxurious shadows, creative highlights |
| Blush | `#f0bed9` | light leaks, halos, organic containers |

## Run it

```bash
python3 -m http.server 8080
# → http://localhost:8080
```

## What's inside

| File | Role |
|---|---|
| `index.html` | Full page markup: dream-compiler preloader, glass header, chromatic-wave menu, hero, the Craft, the Playground (3 games), manifesto, contact, wave footer, secret-letter modal |
| `css/style.css` | Design system on CSS custom properties — cream/cloud canvas, gold/apricot/raspberry glows, glassmorphism, organic wave `clip-path` footer, Fraunces + Outfit fluid `clamp()` type scale |
| `js/engine.js` | Morphing-blob preloader with liquid circle-wipe exit, hand-rolled pseudo-3D canvas (fibonacci constellation, revolving wireframe polyhedra "jewellery", orbiting warm-glass code chips, pointer/gyro parallax), upward-drifting bokeh light dust, cursor halo, magnetic elements, scroll reveals, live telemetry, Overdrive Dream Mode |
| `js/games.js` | The Playground: **Scraping Matrix** (harvest golden nodes & blush prisms, dodge raspberry firewalls, 30s wall-clock timer, local best score), **Automation Pipeline** (weld TRIGGER→ACTION, light-pulse compile, +400% bloom), **Visual Hacking Lab** (rhythm-of-light Simon with warm WebAudio tones, gift voucher reward) |

## Easter egg — Overdrive Dream Mode

- Type `gjs` or `dream` anywhere, or enter the **Konami code**
  (`↑ ↑ ↓ ↓ ← → ← → B A`)
- On mobile: **triple-tap the GJS sun logo**

The site slips into a high-contrast neon dusk, headings shimmer-glitch,
and a hidden letter from the agency unfolds. `Esc` folds it back.

## Performance & accessibility notes

- All animation runs on `transform`/`opacity` or `requestAnimationFrame`;
  canvases pause off-screen and on hidden tabs; DPR is capped.
- Game timers are wall-clock driven, so gameplay stays real-time even
  when rAF is throttled on low-end devices.
- `prefers-reduced-motion` collapses animations and heavy canvas work.
- Semantic landmarks, ARIA states on menu/tabs/overlays, `:focus-visible`
  styling, keyboard-escapable overlays.
- `window.__GJS_HUB` exposes the three game controllers for debugging/tests.
