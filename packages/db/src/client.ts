import type { SQL } from "drizzle-orm";
import type { PgDatabase, PgQueryResultHKT } from "drizzle-orm/pg-core";
import * as schema from "./schema/index";

/**
 * Choix du pilote de base de données.
 *
 * ⚠️ RISQUE STRUCTURANT — lire avant de toucher à ce fichier.
 *
 * L'isolation multi-tenant (§16) repose sur une double barrière, dont la seconde
 * est du RLS Postgres piloté par `SET LOCAL app.current_org_id`. `SET LOCAL` n'a
 * d'effet que sur **la même connexion physique, à l'intérieur de la même
 * transaction**.
 *
 * Le pilote `neon-http` de Drizzle est *sans état* : une requête HTTP par
 * instruction. Le `SET LOCAL` y part dans le vide, `current_setting()` renvoie
 * NULL côté policy, et selon la façon dont la policy est écrite on obtient soit
 * zéro ligne partout, soit — bien pire — une fuite silencieuse entre
 * organisations. Il est donc volontairement absent de cette liste et ne doit
 * jamais y être ajouté.
 *
 *   pg     : Postgres via TCP. Développement local, conteneur CI, Neon en direct.
 *   neon   : Neon via WebSocket. Le pilote de production sur Vercel.
 *
 * `pglite` est un troisième pilote, réservé aux tests : il vit dans
 * `./testing` et n'est jamais atteignable depuis l'application. Il charge un
 * WebAssembly via `new URL(..., import.meta.url)`, ce que les bundlers cassent —
 * et surtout, un Postgres embarqué mono-processus n'a rien à faire dans un
 * serveur web multi-processus.
 */
export type DbDriver = "pg" | "neon" | "pglite";

export type Database = PgDatabase<PgQueryResultHKT, typeof schema>;

export interface DbHandle {
  db: Database;
  driver: DbDriver;
  /**
   * Vrai lorsque le pilote garantit qu'une transaction s'exécute sur une seule
   * connexion, et donc que `SET LOCAL` tient. Faux ⇒ le RLS est inerte : les
   * repositories scopés refusent de démarrer.
   */
  supportsSessionState: boolean;
  close(): Promise<void>;
}

export interface DbConfig {
  driver: Exclude<DbDriver, "pglite">;
  url: string;
}

export function resolveDbConfigFromEnv(env: NodeJS.ProcessEnv = process.env): DbConfig {
  const driver = env["DATABASE_DRIVER"] ?? "pg";
  if (driver !== "pg" && driver !== "neon") {
    throw new Error(
      `DATABASE_DRIVER invalide : « ${driver} ». Valeurs acceptées : pg, neon. ` +
        "(pglite est réservé aux tests, via @calque/db/testing.)",
    );
  }
  const url = env["DATABASE_URL"];
  if (!url) {
    throw new Error(
      "DATABASE_URL est requis. Voir .env.example et scripts/postgres-local.sh.",
    );
  }
  return { driver, url };
}

/** Les pilotes sont importés dynamiquement : seul celui qui sert est chargé. */
export async function createDatabase(config: DbConfig): Promise<DbHandle> {
  switch (config.driver) {
    case "pg": {
      const [{ default: pg }, { drizzle }] = await Promise.all([
        import("pg"),
        import("drizzle-orm/node-postgres"),
      ]);
      const pool = new pg.Pool({ connectionString: config.url, max: 10 });
      const db = drizzle(pool, { schema, casing: "snake_case" });
      return {
        db: db as unknown as Database,
        driver: "pg",
        supportsSessionState: true,
        close: async () => {
          await pool.end();
        },
      };
    }

    case "neon": {
      const [neon, { drizzle }, ws] = await Promise.all([
        import("@neondatabase/serverless"),
        import("drizzle-orm/neon-serverless"),
        import("ws"),
      ]);
      // Le pilote WebSocket a besoin d'une implémentation Node de WebSocket.
      neon.neonConfig.webSocketConstructor = ws.default;
      const pool = new neon.Pool({ connectionString: config.url });
      const db = drizzle(pool, { schema, casing: "snake_case" });
      return {
        db: db as unknown as Database,
        driver: "neon",
        supportsSessionState: true,
        close: async () => {
          await pool.end();
        },
      };
    }
  }
}

/**
 * Exécute du SQL brut et renvoie les lignes typées.
 *
 * `Database` est le type de base commun aux pilotes ; son `execute()` renvoie
 * `unknown` parce que la forme du résultat en dépend. Tous exposent en pratique
 * `{ rows }`, ce que cette fonction normalise en un seul endroit.
 */
export async function rawRows<T>(db: Database, query: SQL): Promise<T[]> {
  const result: unknown = await db.execute(query);
  if (Array.isArray(result)) return result as T[];
  if (result !== null && typeof result === "object" && "rows" in result) {
    return (result as { rows: T[] }).rows;
  }
  return [];
}

let cached: Promise<DbHandle> | undefined;

/** Handle partagé par processus. À n'utiliser que depuis `packages/db` (§16). */
export function getDatabase(): Promise<DbHandle> {
  cached ??= createDatabase(resolveDbConfigFromEnv());
  return cached;
}

export { schema };
