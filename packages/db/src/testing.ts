import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";
import * as schema from "./schema/index";
import { MIGRATIONS_DIR } from "./migrations";
import type { Database, DbHandle } from "./client";

/**
 * Base de test : Postgres embarqué en WebAssembly, jetable, sans infrastructure.
 *
 * Ce module est **volontairement isolé du reste du package** : rien dans
 * `client.ts` ne le référence, pour qu'aucun bundler applicatif ne puisse le
 * tirer par transitivité. PGlite embarque plusieurs mégaoctets de WebAssembly
 * chargés via `new URL(..., import.meta.url)`, ce que webpack casse, et un
 * Postgres mono-processus n'a de toute façon pas sa place dans un serveur web.
 *
 * Pourquoi PGlite plutôt qu'un Postgres de test : c'est un vrai Postgres. Les
 * migrations, les contraintes, les transactions et les policies RLS s'y
 * comportent comme en production — condition nécessaire pour que les tests
 * d'isolation de P9 prouvent quelque chose.
 */
export async function createTestDatabase(
  options: { dataDir?: string } = {},
): Promise<DbHandle> {
  const client = options.dataDir ? new PGlite(options.dataDir) : new PGlite();
  const db = drizzle(client, { schema, casing: "snake_case" });

  return {
    db: db as unknown as Database,
    driver: "pglite",
    supportsSessionState: true,
    close: async () => {
      await client.close();
    },
  };
}

/** Base de test migrée, prête à l'emploi. */
export async function freshTestDatabase(): Promise<DbHandle> {
  const handle = await createTestDatabase();
  await migrate(handle.db as never, { migrationsFolder: MIGRATIONS_DIR });
  return handle;
}
