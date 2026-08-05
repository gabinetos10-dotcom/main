import { base } from './packages/config/eslint/base.js';
import { next } from './packages/config/eslint/next.js';
import { node } from './packages/config/eslint/node.js';
import { reactConfig } from './packages/config/eslint/react.js';

/**
 * Configuration unique du monorepo.
 *
 * Le flat config d'ESLint 9 ne cherche pas de configuration par dossier : c'est celle du
 * répertoire courant qui s'applique à tous les fichiers passés en argument. Une configuration par
 * paquet ne fonctionnerait donc que si le lint était toujours lancé depuis ce paquet — ce que
 * lint-staged, exécuté à la racine, ne fait pas. D'où ce fichier unique, découpé par `files`.
 */

/** @param {readonly import('eslint').Linter.Config[]} configs @param {string[]} files */
function scope(configs, files) {
  return configs.map((config) =>
    // Les entrées purement globales (ignores) ne doivent pas être restreintes.
    config.ignores && !config.rules && !config.plugins ? config : { ...config, files },
  );
}

export default [
  {
    ignores: [
      '**/node_modules/**',
      '**/.next/**',
      '**/dist/**',
      '**/build/**',
      '**/coverage/**',
      '**/.turbo/**',
      '**/*.d.ts',
      '.claude/**',
      'packages/db/prisma/migrations/**',
    ],
  },

  // Paquets exécutés hors navigateur.
  ...scope(node, ['packages/config/**/*.{ts,js}', 'packages/db/**/*.ts', 'scripts/**/*.mjs']),

  // Bibliothèques de composants.
  ...scope(reactConfig, ['packages/ui/**/*.{ts,tsx}']),

  // Applications Next.js.
  ...scope(next, ['apps/*/**/*.{ts,tsx}']),

  // Fichiers de configuration de la racine.
  ...scope(base, ['*.mjs', '*.js']),

  {
    // Les règles ESLint sont écrites en JS annoté JSDoc : ESLint type leurs paramètres.
    files: ['packages/config/eslint/**/*.js'],
    rules: { '@typescript-eslint/no-unused-vars': 'off' },
  },
  {
    // Le seed et les scripts s'adressent à un humain dans un terminal : c'est leur raison d'être.
    files: ['packages/db/src/seed/**/*.ts', 'scripts/**/*.mjs'],
    rules: { 'no-console': 'off' },
  },
  {
    // ADR-003 / ADR-016 : le back-office consomme ses tokens, il n'écrit pas de valeurs.
    files: ['apps/web/src/**/*.{ts,tsx}', 'packages/ui/src/**/*.{ts,tsx}'],
    rules: { 'atelier/no-hardcoded-design-values': 'error' },
  },
];
