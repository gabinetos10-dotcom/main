import { RuleTester } from 'eslint';
import { afterAll, describe, it } from 'vitest';

import rule from '../no-emoji-jsx.js';

RuleTester.afterAll = afterAll;
RuleTester.describe = describe;
RuleTester.it = it;
RuleTester.itOnly = it.only;

const ruleTester = new RuleTester({
  languageOptions: {
    ecmaVersion: 2023,
    sourceType: 'module',
    parserOptions: { ecmaFeatures: { jsx: true } },
  },
});

ruleTester.run('no-emoji-jsx', rule, {
  valid: [
    { code: 'const el = <span>Publier</span>;' },
    { code: 'const el = <Rocket aria-hidden />;' },
    { code: "const legal = '© 2026 L\\'atelier du web';" },
    { code: "const accented = 'Révision épinglée, déjà publiée';" },
  ],
  invalid: [
    {
      code: 'const el = <span>🚀 Publier</span>;',
      errors: [{ messageId: 'emoji' }],
    },
    {
      code: "const label = '✅ Enregistré';",
      errors: [{ messageId: 'emoji' }],
    },
    {
      code: 'const label = `Statut : ✨`;',
      errors: [{ messageId: 'emoji' }],
    },
  ],
});
