import { sql } from "drizzle-orm";
import { rawRows, type Database, type DbHandle } from "./client";

/**
 * Barrière 2 de l'isolation multi-tenant (§16) : chaque requête tourne dans une
 * transaction qui ouvre par `SET LOCAL app.current_org_id`, lu par les policies
 * RLS.
 *
 * Les policies elles-mêmes arrivent en P9. Le harnais est posé dès maintenant
 * parce que c'est lui qui contraint le choix du pilote (voir `client.ts`) : le
 * poser après coup obligerait à refaire la couche d'accès.
 *
 * `SET LOCAL` est portée-transaction : le réglage disparaît au COMMIT, donc une
 * connexion rendue au pool ne peut pas fuiter le contexte d'une organisation
 * vers la requête suivante.
 */

const ORG_SETTING = "app.current_org_id";

/**
 * Rôle applicatif non privilégié sous lequel les requêtes scopées s'exécutent.
 *
 * ⚠️ Ce n'est pas une précaution décorative. Vérifié expérimentalement sur
 * Postgres (PGlite 0.5) : un superutilisateur contourne le RLS **même avec
 * `FORCE ROW LEVEL SECURITY`**, et le propriétaire d'une table le contourne
 * aussi tant que `FORCE` n'est pas activé. Une connexion applicative privilégiée
 * rend donc la barrière 2 du §16 totalement inerte — sans aucune erreur, sans
 * aucun log : exactement le mode de défaillance qu'on cherche à éviter.
 *
 * Le rôle et les policies sont créés par une migration en P9. Jusque-là,
 * `withTenant` fonctionne sans bascule de rôle et les tests documentent
 * explicitement les deux comportements.
 */
export const APP_ROLE = "calque_app";

const IDENT_RE = /^[a-z_][a-z0-9_]*$/u;

export class TenantContextError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "TenantContextError";
  }
}

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu;

export function assertOrgId(orgId: string): void {
  if (!UUID_RE.test(orgId)) {
    throw new TenantContextError(`orgId invalide : « ${orgId} ».`);
  }
}

export interface TenantOptions {
  /**
   * Bascule sur un rôle non privilégié pour la durée de la transaction. Sans
   * cela, une connexion propriétaire ou superutilisateur contourne les policies.
   * Activé en P9, quand la migration qui crée `calque_app` existe.
   */
  role?: string;
}

/**
 * Exécute `fn` dans une transaction scopée à une organisation.
 *
 * L'identifiant est passé par liaison (`set_config`) et non par interpolation :
 * `SET LOCAL` n'accepte pas de paramètre lié, `set_config()` si. Le nom de rôle,
 * lui, ne peut pas être lié du tout — il est donc validé contre une allowlist de
 * caractères avant d'être interpolé.
 */
export async function withTenant<T>(
  handle: DbHandle,
  orgId: string,
  fn: (tx: Database) => Promise<T>,
  options: TenantOptions = {},
): Promise<T> {
  if (!handle.supportsSessionState) {
    throw new TenantContextError(
      `Le pilote « ${handle.driver} » ne garantit pas une connexion unique par transaction : ` +
        "les policies RLS seraient inertes. Utiliser pglite, pg ou neon.",
    );
  }
  assertOrgId(orgId);

  const role = options.role;
  if (role !== undefined && !IDENT_RE.test(role)) {
    throw new TenantContextError(`Nom de rôle invalide : « ${role} ».`);
  }

  return handle.db.transaction(async (tx) => {
    if (role !== undefined) {
      await tx.execute(sql.raw(`set local role ${role}`));
    }
    await tx.execute(sql`select set_config(${ORG_SETTING}, ${orgId}, true)`);
    return fn(tx as unknown as Database);
  });
}

/** Lit le contexte courant. Sert aux tests d'isolation : hors transaction, il est vide. */
export async function readTenantContext(db: Database): Promise<string | null> {
  const rows = await rawRows<{ org_id: string | null }>(
    db,
    sql`select nullif(current_setting(${ORG_SETTING}, true), '') as org_id`,
  );
  return rows[0]?.org_id ?? null;
}
