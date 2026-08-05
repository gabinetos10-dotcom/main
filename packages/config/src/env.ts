/**
 * Validation des variables d'environnement (PARTIE 8).
 *
 * Principe : on échoue au démarrage, bruyamment, avec la liste exacte des variables fautives.
 * Une variable manquante qui se manifeste trois écrans plus loin en production coûte infiniment
 * plus cher qu'un boot refusé.
 */
import { z } from 'zod';

const url = z.string().url();

/** Variables partagées par toutes les applications. */
export const sharedEnvSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
});

/** Accès aux données. */
export const databaseEnvSchema = z.object({
  DATABASE_URL: z.string().startsWith('postgresql://', {
    message: 'DATABASE_URL doit être une URL PostgreSQL (postgresql://…)',
  }),
});

/** File d'attente, cache, rate limiting. */
export const redisEnvSchema = z.object({
  REDIS_URL: z.string().startsWith('redis://', {
    message: 'REDIS_URL doit être une URL Redis (redis://…)',
  }),
});

/** Stockage S3-compatible (R2 en production, MinIO en local — ADR-015). */
export const storageEnvSchema = z.object({
  S3_ENDPOINT: url,
  S3_REGION: z.string().min(1),
  S3_BUCKET: z.string().min(1),
  S3_ACCESS_KEY_ID: z.string().min(1),
  S3_SECRET_ACCESS_KEY: z.string().min(1),
  S3_PUBLIC_URL: url,
  /** MinIO exige le path-style ; R2 et S3 non. */
  S3_FORCE_PATH_STYLE: z
    .enum(['true', 'false'])
    .default('false')
    .transform((value) => value === 'true'),
});

/** URLs publiques. */
export const urlsEnvSchema = z.object({
  APP_URL: url,
  SITES_BASE_DOMAIN: z.string().min(1),
});

export class EnvValidationError extends Error {
  constructor(public readonly issues: z.ZodIssue[]) {
    const details = issues
      .map((issue) => `  • ${issue.path.join('.') || '(racine)'} — ${issue.message}`)
      .join('\n');
    super(
      `Variables d'environnement invalides :\n${details}\n\n` +
        'Compare ton .env avec .env.example, puis relance.',
    );
    this.name = 'EnvValidationError';
  }
}

/**
 * Valide `source` contre `schema` et renvoie l'objet typé.
 *
 * @throws {EnvValidationError} si une variable manque ou est mal formée.
 */
export function parseEnv<T extends z.ZodTypeAny>(
  schema: T,
  source: Record<string, string | undefined> = process.env,
): z.infer<T> {
  const result = schema.safeParse(source);
  if (!result.success) {
    throw new EnvValidationError(result.error.issues);
  }
  return result.data;
}

/** Environnement complet attendu par une application serveur à la phase 0. */
export const serverEnvSchema = sharedEnvSchema
  .merge(databaseEnvSchema)
  .merge(redisEnvSchema)
  .merge(storageEnvSchema)
  .merge(urlsEnvSchema);

export type ServerEnv = z.infer<typeof serverEnvSchema>;
