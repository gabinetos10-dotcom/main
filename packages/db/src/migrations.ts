import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import type { DbHandle } from "./client";

/** Dossier des migrations SQL générées par `drizzle-kit generate`, versionnées. */
export const MIGRATIONS_DIR = resolve(
  dirname(fileURLToPath(import.meta.url)),
  "..",
  "drizzle",
);

/**
 * Applique les migrations sur une base réelle.
 *
 * Le cas PGlite est traité par `./testing` : garder son migrateur hors de ce
 * module évite qu'un bundler applicatif ne suive la référence jusqu'au
 * WebAssembly de PGlite.
 */
export async function runMigrations(handle: DbHandle): Promise<void> {
  const migrationsFolder = MIGRATIONS_DIR;

  switch (handle.driver) {
    case "pg": {
      const { migrate } = await import("drizzle-orm/node-postgres/migrator");
      // Le migrateur est typé par pilote ; `handle.driver` a déjà fait la
      // discrimination, la conversion est donc sûre ici.
      await migrate(handle.db as never, { migrationsFolder });
      return;
    }
    case "neon": {
      const { migrate } = await import("drizzle-orm/neon-serverless/migrator");
      await migrate(handle.db as never, { migrationsFolder });
      return;
    }
    case "pglite": {
      throw new Error(
        "Les migrations PGlite passent par `freshTestDatabase()` de @calque/db/testing.",
      );
    }
  }
}
