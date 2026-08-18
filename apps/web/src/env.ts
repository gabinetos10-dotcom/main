import { z } from "zod";

/**
 * Validation de l'environnement — une frontière comme une autre (§4).
 *
 * Le principe : une variable manquante doit produire une erreur explicite au
 * démarrage, pas un `undefined` qui se propage jusqu'à une requête HTTP en
 * production. Les variables optionnelles dégradent des fonctionnalités, elles ne
 * bloquent jamais le démarrage.
 */

/** `next build` positionne cette variable ; le serveur en exécution, non. */
function isBuildPhase(): boolean {
  return process.env["NEXT_PHASE"] === "phase-production-build";
}

const serverSchema = z
  .object({
    NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
    /**
     * Nature du **déploiement**, distincte de `NODE_ENV` qui décrit la *build*.
     *
     * Les tests de bout en bout démarrent volontairement une build de production
     * — c'est le seul moyen de vérifier ce qui sera réellement déployé — mais
     * sur une machine de développement, avec un stockage sur disque. Confondre
     * les deux obligerait soit à tester autre chose que la production, soit à
     * ouvrir une porte dérobée dans la validation du stockage.
     */
    CALQUE_ENV: z.enum(["development", "test", "production"]).optional(),

    DATABASE_DRIVER: z.enum(["pg", "neon"]).default("pg"),
    DATABASE_URL: z.string().optional(),

    AUTH_SECRET: z.string().min(1).optional(),
    AUTH_URL: z.string().optional(),
    AUTH_GOOGLE_ID: z.string().optional(),
    AUTH_GOOGLE_SECRET: z.string().optional(),

    RESEND_API_KEY: z.string().optional(),
    EMAIL_FROM: z.string().default("Calque <bonjour@calque.studio>"),

    /**
     * Stockage des sources déposées, des médias et des builds (§3 : R2).
     * `filesystem` est le pilote de développement local ; il n'est jamais
     * accepté en production, où il perdrait tout à chaque déploiement.
     */
    STORAGE_DRIVER: z.enum(["filesystem", "r2"]).default("filesystem"),
    STORAGE_DIR: z.string().default(".data/stockage"),
    R2_ACCOUNT_ID: z.string().optional(),
    R2_BUCKET: z.string().optional(),
    R2_ACCESS_KEY_ID: z.string().optional(),
    R2_SECRET_ACCESS_KEY: z.string().optional(),

    SENTRY_DSN: z.string().optional(),
    LOG_LEVEL: z
      .enum(["fatal", "error", "warn", "info", "debug", "trace"])
      .default("info"),
  })
  .superRefine((value, ctx) => {
    // Le build n'ouvre aucune connexion : exiger l'URL ici bloquerait une CI
    // qui compile sans base, alors que le démarrage, lui, en a réellement besoin.
    if (!isBuildPhase() && !value.DATABASE_URL) {
      ctx.addIssue({
        code: "custom",
        path: ["DATABASE_URL"],
        message:
          "DATABASE_URL est requis. Démarrer un Postgres local : ./scripts/postgres-local.sh start",
      });
    }
    // En production, un secret d'authentification absent signifierait des
    // sessions signées avec une valeur devinable. On refuse de démarrer.
    //
    // Le build est exempté : `next build` évalue les modules serveur pour
    // collecter les routes, sans avoir besoin des secrets d'exécution. Exiger
    // AUTH_SECRET ici obligerait la CI à porter un faux secret, ce qui rendrait
    // la vérification inutile là où elle compte vraiment — au démarrage.
    if (!isBuildPhase() && value.NODE_ENV === "production" && !value.AUTH_SECRET) {
      ctx.addIssue({
        code: "custom",
        path: ["AUTH_SECRET"],
        message: "AUTH_SECRET est obligatoire en production.",
      });
    }
    const deploiement = value.CALQUE_ENV ?? value.NODE_ENV;
    if (
      !isBuildPhase() &&
      deploiement === "production" &&
      value.STORAGE_DRIVER !== "r2"
    ) {
      ctx.addIssue({
        code: "custom",
        path: ["STORAGE_DRIVER"],
        message:
          "Le stockage sur disque n'est pas utilisable en production : les sources déposées disparaîtraient au premier redéploiement.",
      });
    }
    if (
      value.STORAGE_DRIVER === "r2" &&
      !(
        value.R2_ACCOUNT_ID &&
        value.R2_BUCKET &&
        value.R2_ACCESS_KEY_ID &&
        value.R2_SECRET_ACCESS_KEY
      )
    ) {
      ctx.addIssue({
        code: "custom",
        path: ["R2_BUCKET"],
        message:
          "R2_ACCOUNT_ID, R2_BUCKET, R2_ACCESS_KEY_ID et R2_SECRET_ACCESS_KEY sont requis avec le pilote r2.",
      });
    }
    // Google est tout ou rien : une moitié de configuration produirait un bouton
    // « Continuer avec Google » qui échoue au clic.
    const hasId = Boolean(value.AUTH_GOOGLE_ID);
    const hasSecret = Boolean(value.AUTH_GOOGLE_SECRET);
    if (hasId !== hasSecret) {
      ctx.addIssue({
        code: "custom",
        path: ["AUTH_GOOGLE_ID"],
        message:
          "AUTH_GOOGLE_ID et AUTH_GOOGLE_SECRET doivent être fournis ensemble, ou aucun des deux.",
      });
    }
  });

export type ServerEnv = z.infer<typeof serverSchema>;

function readServerEnv(): ServerEnv {
  const parsed = serverSchema.safeParse(process.env);

  if (!parsed.success) {
    const details = parsed.error.issues
      .map((issue) => `  • ${issue.path.join(".") || "(racine)"} : ${issue.message}`)
      .join("\n");
    throw new Error(`Configuration d'environnement invalide :\n${details}`);
  }

  return parsed.data;
}

let cached: ServerEnv | undefined;

/** Ne jamais appeler depuis un composant client : ces valeurs sont des secrets. */
export function serverEnv(): ServerEnv {
  cached ??= readServerEnv();
  return cached;
}

/** Fonctionnalités activées ou non selon ce qui est configuré. */
export function features() {
  const env = serverEnv();
  return {
    /** Sans clé Resend, les liens magiques sont journalisés au lieu d'être envoyés. */
    emailDelivery: Boolean(env.RESEND_API_KEY),
    googleSignIn: Boolean(env.AUTH_GOOGLE_ID && env.AUTH_GOOGLE_SECRET),
    errorTracking: Boolean(env.SENTRY_DSN),
    persistentStorage: env.STORAGE_DRIVER === "r2",
  };
}
