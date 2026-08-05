import { RuleTester } from 'eslint';
import { afterAll, describe, it } from 'vitest';

import rule from '../no-direct-prisma.js';

RuleTester.afterAll = afterAll;
RuleTester.describe = describe;
RuleTester.it = it;
RuleTester.itOnly = it.only;

const ruleTester = new RuleTester({
  languageOptions: { ecmaVersion: 2023, sourceType: 'module' },
});

ruleTester.run('no-direct-prisma', rule, {
  valid: [
    { code: "import { getSiteForOrg } from '@atelier/db';" },
    { code: "import { z } from 'zod';" },
    { code: "const { getSiteForOrg } = require('@atelier/db');" },
    { code: "import('./local-module.js');" },
  ],
  invalid: [
    {
      code: "import { PrismaClient } from '@prisma/client';",
      errors: [{ messageId: 'forbidden' }],
    },
    {
      code: "import { PrismaClient } from '.prisma/client';",
      errors: [{ messageId: 'forbidden' }],
    },
    {
      code: "import { prisma } from '@atelier/db/client';",
      errors: [{ messageId: 'forbidden' }],
    },
    {
      code: "const { PrismaClient } = require('@prisma/client');",
      errors: [{ messageId: 'forbidden' }],
    },
    {
      code: "await import('@prisma/client');",
      errors: [{ messageId: 'forbidden' }],
    },
  ],
});
