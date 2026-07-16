# GJS Agency — OVERPRINT

A one-page site for **GJS Agency** (web creation · automations · scraping · consulting),
built as a *field-printed almanac*: flat spot inks, real overprint, halftone reveals,
registration furniture — the warmth of print, behaving impossibly.

**The one idea:** GJS layers craft, code and strategy like a printer layers inks.
Every key element is printed twice, in two brand inks, blended with
`mix-blend-mode: multiply` — the palette's third colors are *born on the sheet*,
never hard-coded. Hover anything and the plates wobble out of register, then snap back.

---

## Run it

```bash
npm i && npm run dev
```

Then open the printed URL (default `http://localhost:5173`).

- `npm run build` — production build to `dist/`
- `npm run preview` — serve the production build locally

No environment variables, no backend. All fonts are self-hosted (`public/fonts/`).

## Stack

Vite + vanilla ES modules · Three.js (lazy chunk) · GSAP + ScrollTrigger · Lenis.
Main JS bundle ≈ 12 KB gzip; Three.js streams in only after the loader hands off,
and only on capable devices.

## Where to edit things

| What | Where |
| --- | --- |
| **All copy, services, work, people, games text, nav** | `src/config/content.js` (everything marked PLACEHOLDER) |
| **The six inks, paper, type scale, spacing** | `:root` in `src/styles/base.css` |
| **Overprint engine** (dual plates, wobble, misprint mode) | `src/styles/overprint.css` + `src/core/overprint.js` |
| **Plate layouts** | `index.html` (semantic sections) + `src/styles/plates.css` |
| **Loader** | `src/loader/loader.js` + `src/styles/loader.css` |
| **3D specimen** | `src/three/specimen.js` |
| **Games** | `src/games/*.js` (shared frame in `shell.js`) |
| **Easter egg & zine** | `src/egg/misprint.js` + `src/styles/egg.css` |
| **Contact form** | `index.html` — swap the `mailto:` action for your endpoint |

### How the overprint engine works

Text: give any element `class="op"` — its text is duplicated into two pseudo-element
"plates" colored `--op-a` / `--op-b`, multiplied, offset by `--reg-x/--reg-y`.
Boxes: `class="op-box"` (filled) or `op-frame` (outlined). Re-ink any subtree by
overriding `--op-a`/`--op-b` on a wrapper — that is all the Ink Mixer does.
On the dark "night press" and colophon sheets the blend flips to `screen` automatically.

### The loader (real progress + intent)

Six plates = six real milestones (`sheet`, `type`, `press`, `grain`, `specimen`,
`plates`) registered in `src/main.js` as each thing actually finishes. Hard cap
**2.2 s**, Escape/click to skip, instant path under `prefers-reduced-motion`.
The one-tap question ("What are you here to make?") promotes an ink to the
**session accent** (`--accent`), stars the matching service plate, tags its game,
and is remembered in `localStorage` — returning visitors get a ~0.6 s pass and skip
the question.

`localStorage` keys (all prefixed `gjs-`): `intent`, `accent`, `mix`, `visited`,
`muted`, `hs-<game>`, `misprint-found`. Clear them to replay the first-visit flow.

### The Misprint (easter egg)

Konami code (`↑↑↓↓←→←→BA`) **or** pressing the pressmark in the colophon three
times. Plates go out of register site-wide and a secret zine prints: founders'
note, promo code (`PROMO_CODE` in `content.js`), and the hidden strategy console
(consulting's "game"). Breadcrumbs live in manifesto sidenote 2 and the index-card
foot. Devs get an ASCII colophon in the browser console.

## Performance & accessibility toggles

- `prefers-reduced-motion` → no smooth scroll/wobble/choreography/3D/cursor; the
  sheet arrives already printed. Verified: nothing stays hidden.
- Low-power heuristic (`src/core/prefs.js → lowPower()`) skips 3D and the ink
  cursor; tune it there.
- 3D: DPR capped at 1.75, pauses offscreen and on hidden tabs, poster fallback.
- The paper-feed scrollbar and ink cursor only exist on fine-pointer desktops;
  mobile keeps native scrolling and gets ≥44 px touch targets throughout.
- Games: keyboard + touch, focus-trapped dialog, Escape closes, mute persisted.

## Structure

```
index.html              the almanac (all plates, semantic sections)
src/config/content.js   ← edit copy here
src/styles/             base · overprint · layout · components · plates · loader · games · egg
src/core/               prefs · inks · overprint · halftone · registration · cursor · motion · transitions · audio
src/loader/loader.js    the press loader
src/shell/              header · menu · scrollbar · marginalia · inkmixer · colophon · plates
src/three/specimen.js   the printed 3D code specimen
src/games/              shell + pressrun + inkrouting + fieldcollector
src/egg/misprint.js     the director's test print
```

All visible copy is **placeholder** and marked as such in comments.
