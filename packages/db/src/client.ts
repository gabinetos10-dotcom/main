import { PrismaClient } from '@prisma/client';

import { softDeleteExtension } from './extensions/soft-delete';

/**
 * Client Prisma.
 *
 * ADR-007 : ce module ne doit être importé que depuis `packages/db`. Ailleurs, on passe par les
 * helpers scopés par organisation — la règle ESLint `atelier/no-direct-prisma` le garantit.
 */

const globalForPrisma = globalThis as unknown as {
  atelierPrisma?: PrismaClient;
};

function createBaseClient(): PrismaClient {
  return new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
  });
}

/**
 * En développement, Next.js recharge les modules à chaud : sans ce cache, chaque rechargement
 * ouvrirait un nouveau pool de connexions jusqu'à saturer Postgres.
 */
const basePrisma = globalForPrisma.atelierPrisma ?? createBaseClient();

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.atelierPrisma = basePrisma;
}

/** Client par défaut : les enregistrements archivés sont invisibles. */
export const prisma = basePrisma.$extends(softDeleteExtension);

/**
 * Échappatoire explicite au soft delete — corbeille, restauration, purge RGPD.
 * Volontairement verbeux : on doit pouvoir retrouver tous ses usages en une recherche.
 */
export function withArchived(): PrismaClient {
  return basePrisma;
}

export type Database = typeof prisma;
