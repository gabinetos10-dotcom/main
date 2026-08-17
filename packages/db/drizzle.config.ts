import { defineConfig } from "drizzle-kit";

/**
 * `drizzle-kit generate` n'a besoin que du schéma : il produit du SQL versionné
 * sans se connecter. Les migrations sont appliquées par `src/migrate.ts`, qui
 * sait parler aussi bien à PGlite qu'à un Postgres réel.
 */
export default defineConfig({
  schema: "./src/schema/index.ts",
  out: "./drizzle",
  dialect: "postgresql",
  casing: "snake_case",
  strict: true,
  verbose: true,
  dbCredentials: {
    url: process.env["DATABASE_URL"] ?? "postgres://localhost:5432/calque",
  },
});
