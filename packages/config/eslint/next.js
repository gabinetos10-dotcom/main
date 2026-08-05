import nextPlugin from '@next/eslint-plugin-next';

import { reactConfig } from './react.js';

/** Applications Next.js : `apps/web`, `apps/sites`. */
export const next = [
  ...reactConfig,
  {
    plugins: { '@next/next': nextPlugin },
    rules: {
      ...nextPlugin.configs.recommended.rules,
      ...nextPlugin.configs['core-web-vitals'].rules,
      // ADR-007 : l'accès aux données passe par les helpers de @atelier/db.
      'atelier/no-direct-prisma': 'error',
      // Règle héritée du Pages Router : elle cherche un dossier `pages/` qui n'existera jamais.
      '@next/next/no-html-link-for-pages': 'off',
    },
  },
];

export default next;
