import noDirectPrisma from './no-direct-prisma.js';
import noEmojiJsx from './no-emoji-jsx.js';
import noHardcodedDesignValues from './no-hardcoded-design-values.js';

/**
 * Règles maison de L'atelier du web. Chacune porte une décision d'architecture ; chacune a ses
 * tests dans `eslint/rules/__tests__` — une règle non testée ne protège rien.
 */
export const atelierPlugin = {
  meta: { name: '@atelier/eslint-plugin', version: '0.0.0' },
  rules: {
    'no-direct-prisma': noDirectPrisma,
    'no-emoji-jsx': noEmojiJsx,
    'no-hardcoded-design-values': noHardcodedDesignValues,
  },
};

export { noDirectPrisma, noEmojiJsx, noHardcodedDesignValues };
