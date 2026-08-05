import react from 'eslint-plugin-react';
import reactHooks from 'eslint-plugin-react-hooks';

import { base } from './base.js';

/** Bibliothèques de composants : `packages/ui`, `packages/blocks`, `packages/renderer`. */
export const reactConfig = [
  ...base,
  {
    files: ['**/*.tsx', '**/*.jsx'],
    plugins: { react, 'react-hooks': reactHooks },
    languageOptions: {
      parserOptions: { ecmaFeatures: { jsx: true } },
    },
    // Version fixée plutôt que détectée : `detect` résout React depuis le répertoire courant, ce
    // qui échoue quand le lint tourne à la racine du monorepo.
    settings: { react: { version: '19.0' } },
    rules: {
      ...react.configs.flat.recommended.rules,
      ...reactHooks.configs.recommended.rules,
      // React 19 : plus besoin d'importer React pour le JSX.
      'react/react-in-jsx-scope': 'off',
      'react/prop-types': 'off',
      // DESIGN.md § Interdits.
      'atelier/no-emoji-jsx': 'error',
    },
  },
];

export default reactConfig;
