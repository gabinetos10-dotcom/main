/**
 * Applique les migrations sur la base désignée par l'environnement.
 *
 *   pnpm db:migrate
 *
 * Il faut donc une base Postgres joignable. Sans instance sous la main :
 *
 *   ./scripts/postgres-local.sh start
 *
 * démarre un cluster local dans `.data/pg` et affiche la `DATABASE_URL` à
 * reporter dans `.env`.
 */
import { createDatabase, resolveDbConfigFromEnv } from "./client";
import { runMigrations } from "./migrations";

async function main(): Promise<void> {
  const config = resolveDbConfigFromEnv();
  // L'URL peut contenir un mot de passe : on n'affiche que l'hôte et la base.
  const cible = (() => {
    try {
      const parsed = new URL(config.url);
      return `${parsed.host}${parsed.pathname}`;
    } catch {
      return "(url illisible)";
    }
  })();

  console.warn(`→ Migrations : pilote=${config.driver} cible=${cible}`);

  const handle = await createDatabase(config);
  try {
    const started = Date.now();
    await runMigrations(handle);
    console.warn(`✓ Migrations appliquées en ${Date.now() - started} ms`);
  } finally {
    await handle.close();
  }
}

main().catch((error: unknown) => {
  console.error("✗ Échec des migrations :", error);
  process.exitCode = 1;
});
