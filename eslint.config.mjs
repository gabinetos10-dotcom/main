import js from "@eslint/js";
import tseslint from "typescript-eslint";
import reactHooks from "eslint-plugin-react-hooks";
import next from "@next/eslint-plugin-next";

export default tseslint.config(
  {
    ignores: [
      "**/node_modules/**",
      "**/.next/**",
      "**/dist/**",
      "**/.turbo/**",
      "**/coverage/**",
      // Contenu tiers versionné dans le dépôt (skills Claude Code) : hors périmètre.
      ".claude/**",
      "**/playwright-report/**",
      "**/test-results/**",
      // Les sites de fixture sont du HTML/CSS/JS livré par une agence, imité au
      // plus près du vibe coding : les normaliser leur ferait perdre ce qu'ils
      // servent à tester. L'outillage des fixtures, lui, est linté normalement.
      "fixtures/0*/**",
      "packages/db/drizzle/**",
      // Fichiers générés par Next à chaque build.
      "apps/web/next-env.d.ts",
    ],
  },

  js.configs.recommended,
  ...tseslint.configs.recommended,

  {
    files: ["**/*.{ts,tsx,mts,mjs}"],
    rules: {
      // §4 : zéro `any` non justifié. Un `any` doit porter un commentaire d'explication,
      // ce que cette règle force en pratique puisqu'il faut un eslint-disable motivé.
      "@typescript-eslint/no-explicit-any": "error",
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
      "@typescript-eslint/consistent-type-imports": [
        "error",
        { prefer: "type-imports", fixStyle: "inline-type-imports" },
      ],
      eqeqeq: ["error", "smart"],
      "no-console": ["error", { allow: ["warn", "error"] }],
    },
  },

  // §21 : jamais de regex sur du HTML. Ces modules manipulent du HTML et doivent
  // passer par parse5. La règle est déclarée dès P0 pour que P2/P3 naissent conformes.
  {
    files: ["packages/parser/**/*.ts", "packages/builder/**/*.ts"],
    rules: {
      "no-restricted-syntax": [
        "error",
        {
          selector: "NewExpression[callee.name='RegExp'][arguments.0.value=/<[a-zA-Z]/]",
          message:
            "Interdit : parsing HTML par expression régulière (§21). Utiliser parse5.",
        },
      ],
    },
  },

  // §16, barrière 1 : aucun accès direct au client Drizzle depuis l'application.
  // Toute requête passe par un repository scopé exporté par @calque/db.
  {
    files: ["apps/web/**/*.{ts,tsx}"],
    ignores: ["apps/web/src/auth.ts"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          paths: [
            {
              name: "@calque/db/client",
              message:
                "Accès direct au client Drizzle interdit hors de packages/db (§16). Utiliser un repository scopé withTenant().",
            },
            {
              name: "drizzle-orm/node-postgres",
              message: "Le client Drizzle ne s'instancie que dans packages/db (§16).",
            },
            {
              name: "drizzle-orm/neon-serverless",
              message: "Le client Drizzle ne s'instancie que dans packages/db (§16).",
            },
          ],
        },
      ],
    },
  },

  {
    files: ["apps/web/**/*.{ts,tsx}"],
    plugins: { "react-hooks": reactHooks, "@next/next": next },
    rules: {
      ...reactHooks.configs.recommended.rules,
      ...next.configs.recommended.rules,
      ...next.configs["core-web-vitals"].rules,
      // Règle propre au routeur `pages/`, que ce projet n'utilise pas.
      "@next/next/no-html-link-for-pages": "off",
    },
  },

  // Outillage exécuté par Node hors bundler : globales Node, sorties console
  // assumées (ce sont des scripts d'atelier, pas du code applicatif).
  {
    files: ["**/tools/**/*.{mjs,mts}", "scripts/**/*.mjs"],
    languageOptions: {
      globals: { Buffer: "readonly", process: "readonly", console: "readonly" },
    },
    rules: { "no-console": "off" },
  },

  {
    files: ["**/*.test.ts", "**/*.spec.ts", "**/tools/**/*.{mjs,mts}", "e2e/**/*.ts"],
    rules: {
      "no-console": "off",
      "@typescript-eslint/no-explicit-any": "off",
    },
  },
);
