import { base } from './base.js';

/** Paquets exécutés hors navigateur : `packages/db`, `packages/config`, `apps/worker`. */
export const node = [
  ...base,
  {
    files: ['**/*.ts', '**/*.js'],
    languageOptions: {
      globals: { process: 'readonly', console: 'readonly', URL: 'readonly', fetch: 'readonly' },
    },
  },
];

export default node;
