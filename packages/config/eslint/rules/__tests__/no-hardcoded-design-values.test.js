import { RuleTester } from 'eslint';
import { afterAll, describe, it } from 'vitest';

import rule from '../no-hardcoded-design-values.js';

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

ruleTester.run('no-hardcoded-design-values', rule, {
  valid: [
    { code: "const style = 'bg-surface text-primary';" },
    { code: "const color = 'var(--site-color-primary)';" },
    { code: 'const radius = `var(--site-radius-md)`;' },
    { code: "const anchor = '#section-tarifs';" },
    { code: "const grid = 'grid-cols-[repeat(3,1fr)]';" },
    {
      // Le fichier qui définit les tokens a le droit d'écrire des valeurs brutes.
      code: "export const ink = '#0D0C0B';",
      filename: '/repo/packages/tokens/src/presets/atelier.ts',
      options: [{ allowIn: ['packages/tokens/'] }],
    },
  ],
  invalid: [
    {
      code: "const color = '#FF4D14';",
      errors: [{ messageId: 'hardcodedColor', data: { value: '#FF4D14' } }],
    },
    {
      code: "const shadow = 'rgba(0, 0, 0, .6)';",
      errors: [{ messageId: 'hardcodedColor' }],
    },
    {
      code: 'const border = `1px solid hsl(24 90% 54%)`;',
      errors: [{ messageId: 'hardcodedColor' }],
    },
    {
      code: "const className = 'bg-[#0D0C0B] text-white';",
      errors: [{ messageId: 'arbitraryUtility' }],
    },
    {
      code: "const className = 'text-[color:var(--x)]';",
      errors: [{ messageId: 'arbitraryUtility' }],
    },
    {
      code: 'const el = <div className="border-[2px]" />;',
      errors: [{ messageId: 'arbitraryUtility' }],
    },
  ],
});
