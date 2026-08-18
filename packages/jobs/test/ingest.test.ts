import { describe, expect, it } from "vitest";
import { readFile, readdir } from "node:fs/promises";
import { join, relative } from "node:path";
import { zipSync } from "fflate";
import { FIXTURES_ROOT } from "@calque/fixtures";
import { createMemoryStore, keys } from "@calque/storage";
import { freshTestDatabase } from "@calque/db/testing";
import * as schema from "@calque/db/schema";
import { createIngestJob, createInlineRunner } from "../src/index";

/**
 * Le travail INGEST de bout en bout, contre un vrai Postgres (§8, §22 P4).
 *
 * PGlite est un Postgres compilé en WebAssembly : les contraintes, les
 * transactions et les types JSON s'y comportent comme en production. Un mock de
 * base laisserait passer exactement les erreurs que ce test cherche.
 */

async function zipperFixture(nom: string): Promise<Uint8Array> {
  const racine = join(FIXTURES_ROOT, nom);
  const entrees: Record<string, Uint8Array> = {};

  const parcourir = async (dossier: string): Promise<void> => {
    for (const entree of await readdir(dossier, { withFileTypes: true })) {
      const complet = join(dossier, entree.name);
      if (entree.isDirectory()) {
        await parcourir(complet);
        continue;
      }
      if (entree.name === "expected.json") continue;
      entrees[relative(racine, complet).split(/[\\/]/u).join("/")] = new Uint8Array(
        await readFile(complet),
      );
    }
  };

  await parcourir(racine);
  return zipSync(entrees, { level: 6 });
}

async function preparer() {
  const handle = await freshTestDatabase();
  const [org] = await handle.db
    .insert(schema.organizations)
    .values({ name: "Atelier GJS", slug: "atelier-gjs", plan: "studio" })
    .returning({ id: schema.organizations.id });
  const [user] = await handle.db
    .insert(schema.users)
    .values({ email: "marie@atelier-gjs.fr" })
    .returning({ id: schema.users.id });
  const [site] = await handle.db
    .insert(schema.sites)
    .values({
      orgId: org?.id as string,
      name: "Menuiserie Rousseau",
      slug: "menuiserie-rousseau",
      previewSubdomain: "menuiserie-a1b2",
    })
    .returning({ id: schema.sites.id });

  return {
    handle,
    orgId: org?.id as string,
    userId: user?.id as string,
    siteId: site?.id as string,
    store: createMemoryStore(),
  };
}

describe("travail INGEST", () => {
  it("dépose, analyse et rend le site éditable en moins de 60 secondes", async () => {
    const contexte = await preparer();
    const versionId = crypto.randomUUID();

    await contexte.store.put(
      keys.archive(contexte.siteId, versionId),
      await zipperFixture("01-artisan-landing"),
    );

    const resultat = await createInlineRunner().enqueue(
      createIngestJob({ handle: contexte.handle, store: contexte.store }),
      {
        orgId: contexte.orgId,
        siteId: contexte.siteId,
        versionId,
        label: "Livraison initiale",
        actorId: contexte.userId,
      },
    );

    expect(resultat.report.durationMs).toBeLessThan(60_000);
    expect(resultat.report.detected.fields).toBeGreaterThan(30);

    const sites = await contexte.handle.db.select().from(schema.sites);
    expect(sites[0]?.status).toBe("pret");

    const plans = await contexte.handle.db.select().from(schema.blueprints);
    expect(plans).toHaveLength(1);
    expect(plans[0]?.blueprint.pages.length).toBeGreaterThan(0);

    // Le brouillon initial contient le site tel qu'il a été livré : le client
    // ouvre l'éditeur et voit son site, pas un formulaire vide.
    const brouillons = await contexte.handle.db.select().from(schema.contentDrafts);
    expect(Object.keys(brouillons[0]?.data.fields ?? {}).length).toBeGreaterThan(30);

    const versions = await contexte.handle.db.select().from(schema.siteVersions);
    expect(versions[0]?.sourceManifest.files.length).toBeGreaterThan(5);
    expect(versions[0]?.sourceManifest.entry).toBe("index.html");

    await contexte.handle.close();
  });

  it("consigne le dépôt dans le journal d'audit", async () => {
    const contexte = await preparer();
    const versionId = crypto.randomUUID();
    await contexte.store.put(
      keys.archive(contexte.siteId, versionId),
      await zipperFixture("02-restaurant-multipage"),
    );

    await createInlineRunner().enqueue(
      createIngestJob({ handle: contexte.handle, store: contexte.store }),
      {
        orgId: contexte.orgId,
        siteId: contexte.siteId,
        versionId,
        label: "Livraison initiale",
        actorId: contexte.userId,
      },
    );

    const journal = await contexte.handle.db.select().from(schema.auditLogs);
    expect(journal.map((ligne) => ligne.action)).toContain("site.ingest");

    await contexte.handle.close();
  });

  /**
   * Un site qui disparaîtrait du tableau de bord laisserait l'agence sans
   * explication. Il reste visible, en échec explicite.
   */
  it("laisse le site en échec explicite quand l'archive est inexploitable", async () => {
    const contexte = await preparer();
    const versionId = crypto.randomUUID();
    await contexte.store.put(
      keys.archive(contexte.siteId, versionId),
      zipSync({ "notes.txt": new TextEncoder().encode("rien à voir") }),
    );

    await expect(
      createInlineRunner().enqueue(
        createIngestJob({ handle: contexte.handle, store: contexte.store }),
        {
          orgId: contexte.orgId,
          siteId: contexte.siteId,
          versionId,
          label: "Livraison initiale",
          actorId: contexte.userId,
        },
      ),
    ).rejects.toThrow(/aucune page HTML/iu);

    const sites = await contexte.handle.db.select().from(schema.sites);
    expect(sites[0]?.status).toBe("echec_ingestion");

    await contexte.handle.close();
  });

  it("refuse une charge utile mal formée avant de toucher à la base", async () => {
    const contexte = await preparer();
    await expect(
      createInlineRunner().enqueue(
        createIngestJob({ handle: contexte.handle, store: contexte.store }),
        {
          orgId: "pas-un-uuid",
          siteId: contexte.siteId,
          versionId: "x",
          label: "",
          actorId: null,
        },
      ),
    ).rejects.toThrow();
    await contexte.handle.close();
  });
});

describe("clés de stockage", () => {
  /**
   * L'identifiant de la version en base doit être **exactement** celui sous
   * lequel les fichiers ont été écrits. Sinon l'aperçu cherche les sources là où
   * elles ne sont pas, et l'échec n'apparaît qu'à l'ouverture de l'éditeur.
   */
  it("la version enregistrée porte l'identifiant sous lequel le stockage a écrit", async () => {
    const contexte = await preparer();
    const versionId = crypto.randomUUID();
    await contexte.store.put(
      keys.archive(contexte.siteId, versionId),
      await zipperFixture("01-artisan-landing"),
    );

    const resultat = await createInlineRunner().enqueue(
      createIngestJob({ handle: contexte.handle, store: contexte.store }),
      {
        orgId: contexte.orgId,
        siteId: contexte.siteId,
        versionId,
        label: "Livraison initiale",
        actorId: contexte.userId,
      },
    );

    expect(resultat.siteVersionId).toBe(versionId);

    const versions = await contexte.handle.db.select().from(schema.siteVersions);
    expect(versions[0]?.id).toBe(versionId);

    for (const fichier of versions[0]?.sourceManifest.files ?? []) {
      expect(await contexte.store.has(fichier.key)).toBe(true);
      expect(fichier.key).toContain(`/sources/${versionId}/`);
    }

    await contexte.handle.close();
  });
});
