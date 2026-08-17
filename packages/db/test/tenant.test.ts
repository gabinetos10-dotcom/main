import { sql } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { rawRows, type DbHandle } from "../src/client";
import { TenantContextError, readTenantContext, withTenant } from "../src/tenant";
import { freshDatabase, seed, type Seed } from "./helpers";

/**
 * Ces tests ne valident pas encore les policies RLS (P9) : ils valident le socle
 * sur lequel elles reposeront, à savoir que `SET LOCAL` tient réellement pour la
 * durée d'une transaction et disparaît ensuite.
 *
 * C'est le point de défaillance silencieux du §16 : avec un pilote sans état,
 * tout ce qui suit passe au vert côté application alors que le RLS est inerte.
 */

let handle: DbHandle;
let fixture: Seed;

beforeAll(async () => {
  handle = await freshDatabase();
  fixture = await seed(handle);
}, 60_000);

afterAll(async () => {
  await handle?.close();
});

describe("withTenant", () => {
  it("expose l'organisation courante à l'intérieur de la transaction", async () => {
    const seen = await withTenant(handle, fixture.orgId, async (tx) => {
      return readTenantContext(tx);
    });
    expect(seen).toBe(fixture.orgId);
  });

  it("ne laisse rien fuiter hors de la transaction", async () => {
    await withTenant(handle, fixture.orgId, async (tx) => {
      expect(await readTenantContext(tx)).toBe(fixture.orgId);
    });

    // La connexion est rendue au pool : la requête suivante ne doit hériter
    // d'aucun contexte. C'est `SET LOCAL` — et non `SET` — qui le garantit.
    expect(await readTenantContext(handle.db)).toBeNull();
  });

  it("isole deux organisations traitées successivement", async () => {
    const premier = await withTenant(handle, fixture.orgId, (tx) =>
      readTenantContext(tx),
    );
    const second = await withTenant(handle, fixture.otherOrgId, (tx) =>
      readTenantContext(tx),
    );
    expect(premier).toBe(fixture.orgId);
    expect(second).toBe(fixture.otherOrgId);
    expect(premier).not.toBe(second);
  });

  it("annule le contexte lorsque la transaction échoue", async () => {
    await expect(
      withTenant(handle, fixture.orgId, async () => {
        throw new Error("échec métier");
      }),
    ).rejects.toThrow("échec métier");

    expect(await readTenantContext(handle.db)).toBeNull();
  });

  it("refuse un identifiant d'organisation qui n'est pas un UUID", async () => {
    await expect(
      withTenant(handle, "'; drop table sites; --", async () => undefined),
    ).rejects.toBeInstanceOf(TenantContextError);
  });

  it("refuse de démarrer sur un pilote sans état de session", async () => {
    // Simule ce que produirait `neon-http` : le RLS serait inerte, donc on
    // préfère une erreur bruyante à une isolation illusoire.
    const stateless: DbHandle = { ...handle, supportsSessionState: false };
    await expect(
      withTenant(stateless, fixture.orgId, async () => undefined),
    ).rejects.toBeInstanceOf(TenantContextError);
  });
});

/**
 * Ce qui suit n'est pas un test de fonctionnalité mais un test de *prémisse* :
 * il fige un comportement de Postgres dont dépend toute la barrière 2 du §16, et
 * qui n'est pas celui qu'on attend intuitivement.
 *
 * Résultat mesuré ici : `ENABLE` + `FORCE ROW LEVEL SECURITY` ne suffisent pas.
 * Un rôle superutilisateur — ce que PGlite utilise par défaut, et ce que sont
 * beaucoup de connexions applicatives mal configurées — traverse les policies
 * comme si elles n'existaient pas. Sans erreur et sans log.
 *
 * Conséquence de conception, à appliquer en P9 : les requêtes scopées doivent
 * s'exécuter sous un rôle non privilégié (`SET LOCAL ROLE`), pas seulement avec
 * `app.current_org_id` positionné.
 */
describe("prémisse RLS", () => {
  const PROBE = sql`_rls_probe`;

  beforeAll(async () => {
    await handle.db.execute(sql`create table ${PROBE} (org_id text, note text)`);
    await handle.db.execute(sql`alter table ${PROBE} enable row level security`);
    await handle.db.execute(sql`alter table ${PROBE} force row level security`);
    await handle.db.execute(sql`
      create policy _rls_probe_tenant on ${PROBE}
      using (org_id = current_setting('app.current_org_id', true))
    `);
    await handle.db.execute(
      sql`insert into ${PROBE} values ('org-a', 'a'), ('org-b', 'b')`,
    );
    await handle.db.execute(sql`create role calque_app nologin`);
    await handle.db.execute(
      sql`grant select, insert, update, delete on ${PROBE} to calque_app`,
    );
  });

  it("un rôle privilégié traverse les policies malgré FORCE — la barrière 2 serait inerte", async () => {
    const lignes = await rawRows<{ note: string }>(
      handle.db,
      sql`select note from ${PROBE}`,
    );
    expect(lignes).toHaveLength(2);
  });

  it("un rôle non privilégié sans contexte ne voit rien", async () => {
    const lignes = await handle.db.transaction(async (tx) => {
      await tx.execute(sql.raw("set local role calque_app"));
      return rawRows<{ note: string }>(
        tx as unknown as typeof handle.db,
        sql`select note from ${PROBE}`,
      );
    });
    expect(lignes).toHaveLength(0);
  });

  it("un rôle non privilégié ne voit que son organisation", async () => {
    const lignes = await handle.db.transaction(async (tx) => {
      await tx.execute(sql.raw("set local role calque_app"));
      await tx.execute(sql`select set_config('app.current_org_id', 'org-a', true)`);
      return rawRows<{ note: string }>(
        tx as unknown as typeof handle.db,
        sql`select note from ${PROBE}`,
      );
    });
    expect(lignes.map((l) => l.note)).toEqual(["a"]);
  });

  it("withTenant sait basculer de rôle, et refuse un nom de rôle non identifiant", async () => {
    await expect(
      withTenant(handle, fixture.orgId, async () => undefined, {
        role: "calque_app; drop table sites",
      }),
    ).rejects.toBeInstanceOf(TenantContextError);
  });
});
