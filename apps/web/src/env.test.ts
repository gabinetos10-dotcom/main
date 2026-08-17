import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * `serverEnv()` met son résultat en cache : chaque cas recharge le module pour
 * repartir d'un état propre.
 */
async function chargerEnv(variables: Record<string, string | undefined>) {
  vi.resetModules();
  for (const [cle, valeur] of Object.entries(variables)) {
    if (valeur === undefined) delete process.env[cle];
    else process.env[cle] = valeur;
  }
  // `process.env` reste modifié jusqu'au `afterEach` : la validation n'a lieu
  // qu'au premier appel de `serverEnv()`, donc après le retour de cette
  // fonction. Le restaurer ici viderait le test de sa substance.
  return import("./env");
}

const BASE = {
  NODE_ENV: "development",
  DATABASE_DRIVER: "pg",
  DATABASE_URL: "postgres://postgres@127.0.0.1:5432/calque",
  AUTH_SECRET: undefined,
  AUTH_GOOGLE_ID: undefined,
  AUTH_GOOGLE_SECRET: undefined,
  RESEND_API_KEY: undefined,
  SENTRY_DSN: undefined,
  NEXT_PHASE: undefined,
} as const;

let envInitial: NodeJS.ProcessEnv;

beforeEach(() => {
  envInitial = { ...process.env };
});

afterEach(() => {
  process.env = envInitial;
});

describe("serverEnv", () => {
  it("accepte une configuration de développement minimale", async () => {
    const { serverEnv } = await chargerEnv({ ...BASE });
    const env = serverEnv();
    expect(env.DATABASE_DRIVER).toBe("pg");
    expect(env.LOG_LEVEL).toBe("info");
    expect(env.EMAIL_FROM).toContain("Calque");
  });

  it("refuse de démarrer sans URL de base de données", async () => {
    const { serverEnv } = await chargerEnv({ ...BASE, DATABASE_URL: undefined });
    expect(() => serverEnv()).toThrow(/DATABASE_URL/u);
  });

  it("exige AUTH_SECRET en production", async () => {
    const { serverEnv } = await chargerEnv({ ...BASE, NODE_ENV: "production" });
    expect(() => serverEnv()).toThrow(/AUTH_SECRET/u);
  });

  it("laisse passer le build de production, qui n'ouvre aucune connexion", async () => {
    // `next build` évalue les modules serveur pour collecter les routes. Exiger
    // les secrets d'exécution à ce moment obligerait la CI à porter de faux
    // secrets, ce qui viderait la vérification de son sens.
    const { serverEnv } = await chargerEnv({
      ...BASE,
      NODE_ENV: "production",
      DATABASE_URL: undefined,
      NEXT_PHASE: "phase-production-build",
    });
    expect(() => serverEnv()).not.toThrow();
  });

  it("refuse une configuration Google à moitié renseignée", async () => {
    const { serverEnv } = await chargerEnv({ ...BASE, AUTH_GOOGLE_ID: "abc" });
    expect(() => serverEnv()).toThrow(/AUTH_GOOGLE/u);
  });

  it("refuse un pilote de base de données inconnu", async () => {
    const { serverEnv } = await chargerEnv({ ...BASE, DATABASE_DRIVER: "sqlite" });
    expect(() => serverEnv()).toThrow(/DATABASE_DRIVER/u);
  });
});

describe("features", () => {
  it("désactive l'envoi d'emails sans clé Resend", async () => {
    const { features } = await chargerEnv({ ...BASE });
    expect(features().emailDelivery).toBe(false);
    expect(features().googleSignIn).toBe(false);
    expect(features().errorTracking).toBe(false);
  });

  it("active chaque fonctionnalité dès que sa configuration est complète", async () => {
    const { features } = await chargerEnv({
      ...BASE,
      RESEND_API_KEY: "re_test",
      AUTH_GOOGLE_ID: "id",
      AUTH_GOOGLE_SECRET: "secret",
      SENTRY_DSN: "https://exemple.ingest.sentry.io/1",
    });
    expect(features()).toEqual({
      emailDelivery: true,
      googleSignIn: true,
      errorTracking: true,
    });
  });
});
