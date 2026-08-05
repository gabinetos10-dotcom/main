import { loadRootEnv } from '@atelier/config/load-env';

/**
 * Point d'entrée du seed.
 *
 * Il ne fait que charger l'environnement avant d'importer le reste : le client Prisma lit
 * `DATABASE_URL` à sa construction, donc au moment de l'import. Un import statique de `./run`
 * s'exécuterait avant cette ligne et échouerait.
 */
loadRootEnv(import.meta.dirname);

await import('./run');
