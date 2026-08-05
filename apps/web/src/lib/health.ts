import { checkDatabaseConnection } from '@atelier/db';
import Redis from 'ioredis';

import { serverEnv } from '~/env';

/**
 * Sondes des trois services dont dépend l'atelier.
 *
 * Utile au-delà du confort : sur une machine fraîchement clonée, la panne la plus fréquente est
 * « j'ai oublié `docker compose up` ». Autant le dire, plutôt que de laisser une trace Prisma
 * illisible dans un terminal.
 */

export type ServiceStatus = 'up' | 'down';

export interface ServiceHealth {
  /** Clé de traduction, pas un libellé : l'interface est bilingue (FR par défaut, EN disponible). */
  key: 'database' | 'redis' | 'storage';
  status: ServiceStatus;
  latencyMs: number;
  target: string;
  error?: string;
}

async function timed<T>(run: () => Promise<T>): Promise<{ value: T; latencyMs: number }> {
  const startedAt = performance.now();
  const value = await run();
  return { value, latencyMs: Math.round(performance.now() - startedAt) };
}

function hostOf(url: string): string {
  try {
    return new URL(url).host;
  } catch {
    return url;
  }
}

async function database(): Promise<ServiceHealth> {
  const env = serverEnv();
  const { value, latencyMs } = await timed(checkDatabaseConnection);
  return {
    key: 'database',
    status: value.ok ? 'up' : 'down',
    latencyMs,
    target: hostOf(env.DATABASE_URL.replace('postgresql://', 'http://')),
    ...(value.ok ? {} : { error: value.error }),
  };
}

async function redis(): Promise<ServiceHealth> {
  const env = serverEnv();
  const client = new Redis(env.REDIS_URL, {
    lazyConnect: true,
    maxRetriesPerRequest: 1,
    retryStrategy: () => null,
  });

  try {
    const { latencyMs } = await timed(async () => {
      await client.connect();
      return client.ping();
    });
    return {
      key: 'redis',
      status: 'up',
      latencyMs,
      target: hostOf(env.REDIS_URL.replace('redis://', 'http://')),
    };
  } catch (error) {
    return {
      key: 'redis',
      status: 'down',
      latencyMs: 0,
      target: hostOf(env.REDIS_URL.replace('redis://', 'http://')),
      error: error instanceof Error ? error.message : String(error),
    };
  } finally {
    client.disconnect();
  }
}

async function storage(): Promise<ServiceHealth> {
  const env = serverEnv();
  try {
    // Une réponse HTTP, même 403, prouve que le stockage répond : on ne présente pas
    // d'informations d'identification ici, et c'est volontaire.
    const { latencyMs } = await timed(() =>
      fetch(env.S3_ENDPOINT, { method: 'GET', signal: AbortSignal.timeout(2000) }),
    );
    return { key: 'storage', status: 'up', latencyMs, target: hostOf(env.S3_ENDPOINT) };
  } catch (error) {
    return {
      key: 'storage',
      status: 'down',
      latencyMs: 0,
      target: hostOf(env.S3_ENDPOINT),
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

export async function checkServices(): Promise<ServiceHealth[]> {
  return Promise.all([database(), redis(), storage()]);
}
