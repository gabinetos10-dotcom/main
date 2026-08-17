import type { DbHandle } from "../src/client";
import { freshTestDatabase } from "../src/testing";
import * as schema from "../src/schema/index";

/**
 * Base Postgres jetable pour un fichier de test.
 *
 * PGlite est un vrai Postgres compilé en WebAssembly : les migrations, les
 * contraintes, les transactions et — ce qui compte pour §16 — le RLS s'y
 * comportent comme en production. C'est la raison de ce choix plutôt qu'un
 * mock ou SQLite.
 */
export async function freshDatabase(): Promise<DbHandle> {
  return freshTestDatabase();
}

export interface Seed {
  orgId: string;
  otherOrgId: string;
  userId: string;
  siteId: string;
}

export async function seed(handle: DbHandle): Promise<Seed> {
  const [org] = await handle.db
    .insert(schema.organizations)
    .values({ name: "Atelier GJS", slug: "atelier-gjs", plan: "studio" })
    .returning({ id: schema.organizations.id });

  const [otherOrg] = await handle.db
    .insert(schema.organizations)
    .values({ name: "Studio Rival", slug: "studio-rival", plan: "solo" })
    .returning({ id: schema.organizations.id });

  const [user] = await handle.db
    .insert(schema.users)
    .values({ email: "marie@atelier-gjs.fr", name: "Marie" })
    .returning({ id: schema.users.id });

  if (!org || !otherOrg || !user) throw new Error("seed incomplet");

  await handle.db
    .insert(schema.memberships)
    .values({ orgId: org.id, userId: user.id, role: "agency_admin" });

  const [site] = await handle.db
    .insert(schema.sites)
    .values({
      orgId: org.id,
      name: "Menuiserie Rousseau",
      slug: "menuiserie-rousseau",
      previewSubdomain: "menuiserie-rousseau-a1b2",
    })
    .returning({ id: schema.sites.id });

  if (!site) throw new Error("seed incomplet");

  return { orgId: org.id, otherOrgId: otherOrg.id, userId: user.id, siteId: site.id };
}
