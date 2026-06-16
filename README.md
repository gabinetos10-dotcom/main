# NOUS. — Creative Branding Studio

An award-worthy, immersive showcase site for **NOUS.** ("us" in French) — a fictional
branding agency built around collaboration, human connection and bold, minimalist impact.

Bespoke, fluid and editorial — engineered to feel nothing like a boilerplate template.

## ✦ Highlights

- **Custom fluid cursor** — magnetic ring with lag, morphing into `hover` / `view` / `text` states.
- **Smooth scrolling** via [Lenis](https://github.com/studio-freight/lenis), synced to GSAP ScrollTrigger.
- **Animated preloader** — counter + masked letter reveal + organic SVG curtain morph.
- **Interactive hero** — a morphing SVG blob that loops organically and reacts to the mouse, with a counter-rotating star.
- **Manifesto** — word-by-word opacity fill driven by scroll scrub.
- **Selected Work** — pinned **horizontal scroll** gallery with tilt + magnetic CTA (native swipe on mobile).
- **Services** — animated accordion that reveals capability tags.
- **Contact** — fluid floating-label form with an SVG curve that morphs on scroll, plus client-side validation.
- **Micro-interactions** — magnetic buttons, line-mask text reveals, animated stat counters, a seamless marquee and a dynamic nav.
- Fully **responsive** (mobile-first fluid `clamp()` typography) and **`prefers-reduced-motion`** aware.

## ✦ Tech

| Layer       | Choice                                            |
|-------------|---------------------------------------------------|
| Markup      | Semantic HTML5                                    |
| Styles      | Modern CSS3 — custom properties, fluid type, grid |
| Motion      | GSAP 3 + ScrollTrigger                            |
| Smooth scroll | Lenis                                           |
| Build step  | **None** — fully static, zero bundler             |

Libraries load from CDN, so there is nothing to install.

## ✦ Run it

Any static server works. From the project root:

```bash
# Python
python3 -m http.server 8000

# or Node
npx serve .
```

Then open <http://localhost:8000>. (Opening `index.html` directly also works, but a
local server is recommended so fonts/CDN behave consistently.)

## ✦ Structure

```
.
├── index.html        # Page structure + content
├── css/
│   └── style.css     # Design system + all layouts
├── js/
│   └── main.js       # Interaction engine (cursor, scroll, reveals, form…)
└── assets/           # (reserved for imagery)
```

## ✦ Brand palette

| Token        | Value     | Use                       |
|--------------|-----------|---------------------------|
| `--brown-900`| `#2C1A14` | Ink / dark sections       |
| `--brown-700`| `#4A3525` | Secondary brown           |
| `--yellow`   | `#FFDE4D` | Primary accent            |
| `--yellow-2` | `#F4C430` | Deeper accent             |
| `--cream`    | `#FDFBF7` | Background                 |

Type: **Fraunces** (display) + **Space Grotesk** (body).

---

Made with care, by us.
