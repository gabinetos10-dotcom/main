import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { prisma, withArchived } from '../client';

/**
 * Test d'intégration : le soft delete doit être invisible pour l'appelant ordinaire et accessible
 * uniquement par l'échappatoire explicite. Il tourne contre la base de développement
 * (`docker compose up -d`), sur des enregistrements préfixés qu'il nettoie lui-même.
 */

const PREFIX = 'test-soft-delete';

let orgId: string;
let liveSiteId: string;
let archivedSiteId: string;

beforeAll(async () => {
  // Un run interrompu laisse ses enregistrements derrière lui : sans ce nettoyage, la suite
  // échouerait ensuite sur une contrainte d'unicité au lieu de tester ce qu'elle teste.
  await withArchived().organization.deleteMany({ where: { slug: { startsWith: PREFIX } } });

  const org = await prisma.organization.create({
    data: { name: 'Organisation de test', slug: `${PREFIX}-org` },
  });
  orgId = org.id;

  const live = await prisma.site.create({
    data: { name: 'Site actif', slug: `${PREFIX}-live`, orgId },
  });
  liveSiteId = live.id;

  const archived = await prisma.site.create({
    data: { name: 'Site archivé', slug: `${PREFIX}-archived`, orgId, archivedAt: new Date() },
  });
  archivedSiteId = archived.id;
});

afterAll(async () => {
  await withArchived().organization.deleteMany({ where: { slug: { startsWith: PREFIX } } });
  await prisma.$disconnect();
});

describe('extension soft-delete', () => {
  it('exclut les sites archivés de findMany', async () => {
    const sites = await prisma.site.findMany({ where: { orgId } });
    expect(sites.map((site) => site.id)).toEqual([liveSiteId]);
  });

  it('exclut les sites archivés du comptage — sinon les quotas seraient faux', async () => {
    expect(await prisma.site.count({ where: { orgId } })).toBe(1);
  });

  it('renvoie null pour un site archivé cherché par son identifiant unique', async () => {
    expect(await prisma.site.findUnique({ where: { id: archivedSiteId } })).toBeNull();
    expect(await prisma.site.findUnique({ where: { id: liveSiteId } })).not.toBeNull();
  });

  it('lève pour findUniqueOrThrow sur un site archivé', async () => {
    await expect(
      prisma.site.findUniqueOrThrow({ where: { id: archivedSiteId } }),
    ).rejects.toThrow();
  });

  it("ne fait pas fuiter archivedAt quand l'appelant ne l'a pas demandé", async () => {
    const site = await prisma.site.findUnique({
      where: { id: liveSiteId },
      select: { id: true, name: true },
    });
    expect(site).toEqual({ id: liveSiteId, name: 'Site actif' });
    expect(site).not.toHaveProperty('archivedAt');
  });

  it('laisse withArchived() voir les enregistrements archivés', async () => {
    const sites = await withArchived().site.findMany({ where: { orgId } });
    expect(sites).toHaveLength(2);
  });

  it("n'affecte pas les modèles hors périmètre", async () => {
    const orgs = await prisma.organization.findMany({ where: { id: orgId } });
    expect(orgs).toHaveLength(1);
  });
});
