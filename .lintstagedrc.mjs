export default {
  // `--no-warn-ignored` : lint-staged passe des chemins explicites, y compris des fichiers
  // générés qu'ESLint ignore (next-env.d.ts). Les signaler ferait échouer chaque commit.
  '*.{ts,tsx,js,jsx,mjs}': ['prettier --write', 'eslint --fix --max-warnings=0 --no-warn-ignored'],
  '*.{json,md,yml,yaml,css}': ['prettier --write'],
  // La CLI Prisma vit dans packages/db : l'appeler depuis la racine échouerait.
  'packages/db/prisma/schema.prisma': (files) =>
    files.map((file) => `pnpm --filter @atelier/db exec prisma format --schema ${file}`),
};
