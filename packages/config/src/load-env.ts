import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';

/**
 * Charge le `.env` unique de la racine du monorepo.
 *
 * Chaque outil cherche son `.env` à un endroit différent : Next dans le dossier de l'application,
 * la CLI Prisma dans celui du schéma. Sans ce chargement explicite, il faudrait dupliquer le
 * fichier — et une duplication de configuration finit toujours par diverger.
 *
 * En production, les variables viennent de l'hébergeur : l'absence de fichier n'est pas une erreur.
 */
export function loadRootEnv(startDir: string = process.cwd()): string | undefined {
  let current = startDir;

  for (;;) {
    if (existsSync(join(current, 'pnpm-workspace.yaml'))) {
      const envPath = join(current, '.env');
      if (existsSync(envPath)) {
        process.loadEnvFile(envPath);
        return envPath;
      }
      return undefined;
    }

    const parent = dirname(current);
    if (parent === current) {
      return undefined;
    }
    current = parent;
  }
}
