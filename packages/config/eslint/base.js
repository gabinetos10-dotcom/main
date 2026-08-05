import js from '@eslint/js';
import prettier from 'eslint-config-prettier';
import tseslint from 'typescript-eslint';

import { atelierPlugin } from './rules/index.js';

/** Fichiers et dossiers que personne ne lint. */
export const ignores = {
  ignores: [
    '**/node_modules/**',
    '**/.next/**',
    '**/dist/**',
    '**/build/**',
    '**/coverage/**',
    '**/.turbo/**',
    '**/*.d.ts',
  ],
};

/**
 * Socle commun : recommandations JS + TypeScript, règles maison, désactivation de tout ce qui
 * entre en conflit avec Prettier.
 */
export const base = [
  ignores,
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    plugins: { atelier: atelierPlugin },
    rules: {
      // CLAUDE.md : « Pas de `any` sans commentaire justifiant l'échappatoire. »
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_', caughtErrorsIgnorePattern: '^_' },
      ],
      '@typescript-eslint/consistent-type-imports': [
        'error',
        { prefer: 'type-imports', fixStyle: 'inline-type-imports' },
      ],
      // CLAUDE.md : aucun marqueur de travail différé dans le code livré. Une fonctionnalité
      // non implémentée n'existe pas — ni dans l'interface, ni en commentaire.
      'no-warning-comments': ['error', { terms: ['todo', 'fixme', 'xxx'], location: 'anywhere' }],
      'no-console': ['error', { allow: ['warn', 'error'] }],
      eqeqeq: ['error', 'always', { null: 'ignore' }],
      'no-restricted-syntax': [
        'error',
        {
          selector: 'TSAsExpression > TSAnyKeyword, TSTypeAssertion > TSAnyKeyword',
          message: "Pas de cast vers `any`. Décris le type réel, ou documente l'échappatoire.",
        },
      ],
    },
  },
  {
    // Les tests ont le droit d'être bavards et de fabriquer des cas volontairement invalides.
    files: ['**/*.test.ts', '**/*.test.tsx', '**/*.test.js', '**/__tests__/**'],
    rules: {
      'no-console': 'off',
      '@typescript-eslint/no-explicit-any': 'off',
    },
  },
  prettier,
];

export default base;
