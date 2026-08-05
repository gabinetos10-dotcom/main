import { prisma } from './client';

/**
 * Vérifie que la base répond.
 *
 * Exposé ici — et non écrit à la main dans les applications — parce que ADR-007 interdit tout
 * accès Prisma hors de ce paquet, y compris pour un simple `SELECT 1`.
 */
export async function checkDatabaseConnection(): Promise<
  { ok: true } | { ok: false; error: string }
> {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return { ok: true };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : String(error) };
  }
}
