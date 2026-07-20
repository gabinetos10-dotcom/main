import type { Config } from "tailwindcss";

/**
 * Design tokens for « Maison Jolie Wedding ».
 * The raw hex values live as CSS variables in app/globals.css so they can be
 * driven live by the moodboard mini-game; Tailwind reads them through var().
 */
const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        creme: "var(--creme)",
        ivoire: "var(--ivoire)",
        blush: "var(--blush)",
        "rose-poudre": "var(--rose-poudre)",
        soleil: "var(--soleil)",
        miel: "var(--miel)",
        sauge: "var(--sauge)",
        terracotta: "var(--terracotta)",
        or: "var(--or)",
        prune: "var(--prune)",
      },
      fontFamily: {
        // Display serif — optical "soft/organic" settings applied per-use.
        serif: ["var(--font-fraunces)", "Cormorant Garamond", "serif"],
        // Calligraphy — reserved for emotional accents only.
        script: ["var(--font-ephesis)", "Petit Formal Script", "cursive"],
        // Humanist sans — body, UI, menus.
        sans: ["var(--font-hanken)", "Manrope", "system-ui", "sans-serif"],
      },
      fontSize: {
        // Fluid display scale — imposing headings that breathe with the viewport.
        "display-sm": ["clamp(2.5rem, 6vw, 4rem)", { lineHeight: "1.02" }],
        "display": ["clamp(3rem, 9vw, 7rem)", { lineHeight: "0.98" }],
        "display-lg": ["clamp(3.5rem, 12vw, 10rem)", { lineHeight: "0.92" }],
      },
      letterSpacing: {
        kicker: "0.42em",
        wide: "0.18em",
      },
      borderRadius: {
        card: "1.75rem",
        pill: "999px",
      },
      boxShadow: {
        // Coloured, never grey — diffuse blush / soleil glows.
        blush: "0 30px 80px -40px rgba(227, 154, 161, 0.55)",
        soleil: "0 30px 90px -45px rgba(244, 200, 113, 0.5)",
        bloom:
          "0 20px 60px -30px rgba(227, 139, 109, 0.35), 0 8px 24px -12px rgba(227, 154, 161, 0.3)",
        lift: "0 40px 120px -50px rgba(70, 52, 59, 0.35)",
      },
      transitionTimingFunction: {
        // Signature easing — softened out-expo. Everything flowers, nothing pops.
        signature: "cubic-bezier(0.22, 1, 0.36, 1)",
        veil: "cubic-bezier(0.76, 0, 0.24, 1)",
      },
      keyframes: {
        "mesh-drift": {
          "0%, 100%": { transform: "translate3d(0,0,0) scale(1)" },
          "33%": { transform: "translate3d(2%, -3%, 0) scale(1.08)" },
          "66%": { transform: "translate3d(-2%, 2%, 0) scale(1.04)" },
        },
        "float-slow": {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-12px)" },
        },
        "sheen": {
          "0%": { backgroundPosition: "200% center" },
          "100%": { backgroundPosition: "-200% center" },
        },
        "petal-fall": {
          "0%": { transform: "translateY(-10%) rotate(0deg)", opacity: "0" },
          "10%": { opacity: "1" },
          "100%": { transform: "translateY(120vh) rotate(320deg)", opacity: "0" },
        },
      },
      animation: {
        "mesh-drift": "mesh-drift 28s ease-in-out infinite",
        "float-slow": "float-slow 6s ease-in-out infinite",
        sheen: "sheen 6s linear infinite",
      },
    },
  },
  plugins: [],
};

export default config;
