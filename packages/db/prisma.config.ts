import { loadRootEnv } from '@atelier/config/load-env';
import { defineConfig } from 'prisma/config';

// Le monorepo n'a qu'un seul .env, à la racine ; la CLI Prisma le chercherait ici.
loadRootEnv(import.meta.dirname);

export default defineConfig({
  schema: 'prisma/schema.prisma',
});
