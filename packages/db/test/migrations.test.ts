import { sql } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { rawRows, type DbHandle } from "../src/client";
import { freshDatabase } from "./helpers";

let handle: DbHandle;

beforeAll(async () => {
  handle = await freshDatabase();
}, 60_000);

afterAll(async () => {
  await handle?.close();
});

/** Tables du §18, plus celles qu'Auth.js impose. Aucune ne doit manquer. */
const EXPECTED_TABLES = [
  "accounts",
  "audit_logs",
  "blueprints",
  "content_drafts",
  "content_versions",
  "deployments",
  "field_overrides",
  "invitations",
  "media_assets",
  "memberships",
  "organizations",
  "sessions",
  "site_versions",
  "sites",
  "subscriptions",
  "usage_counters",
  "users",
  "verification_tokens",
] as const;

describe("migrations", () => {
  it("crée toutes les tables du modèle de données", async () => {
    const rows = await rawRows<{ table_name: string }>(
      handle.db,
      sql`select table_name from information_schema.tables
          where table_schema = 'public' and table_type = 'BASE TABLE'`,
    );
    const tables = new Set(rows.map((r) => r.table_name));

    for (const table of EXPECTED_TABLES) {
      expect(tables, `table manquante : ${table}`).toContain(table);
    }
  });

  it("indexe toutes les clés étrangères et les colonnes de recherche (§18)", async () => {
    const rows = await rawRows<{ indexname: string }>(
      handle.db,
      sql`select indexname from pg_indexes where schemaname = 'public'`,
    );
    const indexes = new Set(rows.map((r) => r.indexname));

    for (const expected of [
      "sites_slug_idx",
      "sites_org_id_idx",
      "blueprints_site_id_idx",
      "deployments_site_id_started_at_idx",
      "memberships_org_user_uq",
      "sites_org_slug_uq",
      "content_versions_site_number_uq",
    ]) {
      expect(indexes, `index manquant : ${expected}`).toContain(expected);
    }
  });

  it("est idempotente : rejouer les migrations ne casse rien", async () => {
    const [{ migrate }, { MIGRATIONS_DIR }] = await Promise.all([
      import("drizzle-orm/pglite/migrator"),
      import("../src/migrations"),
    ]);
    await expect(
      migrate(handle.db as never, { migrationsFolder: MIGRATIONS_DIR }),
    ).resolves.toBeUndefined();
  });
});
