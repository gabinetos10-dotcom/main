import { eq } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { DbHandle } from "../src/client";
import * as schema from "../src/schema/index";
import { freshDatabase, seed, type Seed } from "./helpers";

let handle: DbHandle;
let fixture: Seed;

beforeAll(async () => {
  handle = await freshDatabase();
  fixture = await seed(handle);
}, 60_000);

afterAll(async () => {
  await handle?.close();
});

describe("organisations et membres", () => {
  it("interdit deux membres identiques dans la même organisation", async () => {
    await expect(
      handle.db
        .insert(schema.memberships)
        .values({ orgId: fixture.orgId, userId: fixture.userId, role: "site_owner" }),
    ).rejects.toThrow();
  });

  it("autorise le même utilisateur dans deux organisations", async () => {
    await expect(
      handle.db
        .insert(schema.memberships)
        .values({ orgId: fixture.otherOrgId, userId: fixture.userId, role: "viewer" }),
    ).resolves.toBeDefined();
  });

  it("applique le plan Solo par défaut", async () => {
    const [org] = await handle.db
      .insert(schema.organizations)
      .values({ name: "Sans plan", slug: "sans-plan" })
      .returning();
    expect(org?.plan).toBe("solo");
    expect(org?.branding).toEqual({});
  });
});

describe("utilisateurs", () => {
  it("mappe la propriété `image` d'Auth.js sur la colonne `avatar_url` du §18", async () => {
    await handle.db
      .update(schema.users)
      .set({ image: "https://exemple.fr/avatar.png" })
      .where(eq(schema.users.id, fixture.userId));

    const [row] = await handle.db
      .select({ image: schema.users.image })
      .from(schema.users)
      .where(eq(schema.users.id, fixture.userId));

    expect(row?.image).toBe("https://exemple.fr/avatar.png");
  });

  it("interdit deux comptes avec la même adresse email", async () => {
    await expect(
      handle.db.insert(schema.users).values({ email: "marie@atelier-gjs.fr" }),
    ).rejects.toThrow();
  });
});

describe("sites", () => {
  it("interdit deux sites de même slug dans une organisation", async () => {
    await expect(
      handle.db
        .insert(schema.sites)
        .values({ orgId: fixture.orgId, name: "Doublon", slug: "menuiserie-rousseau" }),
    ).rejects.toThrow();
  });

  it("autorise le même slug dans deux organisations différentes", async () => {
    await expect(
      handle.db.insert(schema.sites).values({
        orgId: fixture.otherOrgId,
        name: "Homonyme",
        slug: "menuiserie-rousseau",
      }),
    ).resolves.toBeDefined();
  });

  it("démarre au statut `ingestion`", async () => {
    const [site] = await handle.db
      .select({ status: schema.sites.status })
      .from(schema.sites)
      .where(eq(schema.sites.id, fixture.siteId));
    expect(site?.status).toBe("ingestion");
  });
});

describe("contenu", () => {
  it("n'accepte qu'un seul brouillon actif par site (§10)", async () => {
    await handle.db.insert(schema.contentDrafts).values({
      siteId: fixture.siteId,
      data: { fields: {}, collections: {}, blocks: {}, theme: {}, seo: {}, globals: {} },
    });

    await expect(
      handle.db.insert(schema.contentDrafts).values({
        siteId: fixture.siteId,
        data: {
          fields: {},
          collections: {},
          blocks: {},
          theme: {},
          seo: {},
          globals: {},
        },
      }),
    ).rejects.toThrow();
  });

  it("numérote les versions de contenu sans collision", async () => {
    const empty = {
      fields: {},
      collections: {},
      blocks: {},
      theme: {},
      seo: {},
      globals: {},
    };

    await handle.db
      .insert(schema.contentVersions)
      .values({ siteId: fixture.siteId, number: 1, data: empty });

    await expect(
      handle.db
        .insert(schema.contentVersions)
        .values({ siteId: fixture.siteId, number: 1, data: empty }),
    ).rejects.toThrow();
  });

  it("stocke le calque de contenu tel quel, sans le déformer", async () => {
    const data = {
      fields: { fld_9f8e7d: "Votre projet, notre savoir-faire" },
      collections: {
        col_services: { order: ["itm_001", "itm_002"], added: {}, removed: [] },
      },
      blocks: { blk_hero: { hidden: false, duplicates: [] } },
      theme: { tok_a1b2: "#2F5CE0" },
      seo: {},
      globals: { fld_phone: "01 23 45 67 89" },
    };

    const [version] = await handle.db
      .insert(schema.contentVersions)
      .values({ siteId: fixture.siteId, number: 2, data })
      .returning();

    expect(version?.data).toEqual(data);
  });
});

describe("suppressions en cascade", () => {
  it("supprime le contenu d'un site avec le site, mais conserve son journal d'audit", async () => {
    const [org] = await handle.db
      .insert(schema.organizations)
      .values({ name: "Éphémère", slug: "ephemere" })
      .returning({ id: schema.organizations.id });
    if (!org) throw new Error("organisation non créée");

    const [site] = await handle.db
      .insert(schema.sites)
      .values({ orgId: org.id, name: "Site jetable", slug: "site-jetable" })
      .returning({ id: schema.sites.id });
    if (!site) throw new Error("site non créé");

    await handle.db.insert(schema.contentDrafts).values({
      siteId: site.id,
      data: { fields: {}, collections: {}, blocks: {}, theme: {}, seo: {}, globals: {} },
    });
    await handle.db
      .insert(schema.auditLogs)
      .values({ orgId: org.id, siteId: site.id, action: "site.cree" });

    await handle.db.delete(schema.sites).where(eq(schema.sites.id, site.id));

    const drafts = await handle.db
      .select()
      .from(schema.contentDrafts)
      .where(eq(schema.contentDrafts.siteId, site.id));
    expect(drafts).toHaveLength(0);

    // Une trace d'audit effacée par la suppression de ce qu'elle décrit n'a plus
    // aucune valeur probante : elle survit volontairement (rétention 12 mois, §16).
    const logs = await handle.db
      .select()
      .from(schema.auditLogs)
      .where(eq(schema.auditLogs.siteId, site.id));
    expect(logs).toHaveLength(1);
  });
});
