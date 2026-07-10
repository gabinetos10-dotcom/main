# GJS Agency — Cyber-Luxury Agency Website

A premium, futuristic, mobile-first one-page site for **GJS Agency**.
100% self-contained vanilla HTML5 / CSS / ES6+ — no build step, no frameworks,
no runtime dependencies (only Google Fonts via CDN, with system-font fallback).

## Run it

Any static server works:

```bash
python3 -m http.server 8080
# → http://localhost:8080
```

## What's inside

| File | Role |
|---|---|
| `index.html` | Full page markup: preloader, header, fullscreen menu, hero, services, Capability Hub (3 games), manifesto, contact, footer, secret transmission modal |
| `css/style.css` | Design system on CSS custom properties — midnight-blue canvas, cyan/violet/matrix glows, glassmorphism, clip-path footer, fluid `clamp()` type scale |
| `js/engine.js` | Boot-terminal preloader with shutter exit, hand-rolled pseudo-3D canvas (fibonacci-sphere data nodes, lattice floor, orbiting holographic code quads, pointer/gyro parallax), data-dust particles, custom cursor, magnetic elements, scroll reveals, live HUD telemetry, Overdrive easter egg |
| `js/games.js` | The Capability Hub: **Scraping Matrix** (arcade node-tapping vs firewalls, 30s, local best score), **Automation Pipeline** (connect TRIGGER→ACTION, light-pulse compile, +400% victory), **Visual Hacking Lab** (Simon-style light-rhythm decryption with WebAudio tones, voucher reward) |

## Easter egg — Overdrive Mode

- Type `gjs` or `cyber` anywhere, or enter the **Konami code**
  (`↑ ↑ ↓ ↓ ← → ← → B A`)
- On mobile: **triple-tap the GJS logo**

The site flips hyper-neon, headings glitch, and a secret transmission invites
you to *Contact the Architects*. `Esc` severs the link.

## Performance & accessibility notes

- All animation runs on `transform`/`opacity` or `requestAnimationFrame`;
  canvases pause off-screen and on hidden tabs; DPR is capped.
- `prefers-reduced-motion` collapses animations and heavy canvas work.
- Semantic landmarks, ARIA states on menu/tabs/overlays, `:focus-visible`
  styling, keyboard-escapable overlays.
- `window.__GJS_HUB` exposes the three game controllers for debugging/tests.
