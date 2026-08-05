import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { prisma, withArchived } from '../client';

/**
 * Contraintes d'intégrité que le schéma doit garantir. Elles ne sont pas décoratives : chacune
 * empêche un état incohérent qui coûterait cher à démêler en production.
 */

const PREFIX = 'test-schema';

async function purge() {
  await withArchived().organization.deleteMany({ where: { slug: { startsWith: PREFIX } } });
  await withArchived().user.deleteMany({ where: { email: { startsWith: PREFIX } } });
}

// Rerunnable après un run interrompu : on nettoie avant, pas seulement après.
beforeAll(purge);

afterAll(async () => {
  await purge();
  await prisma.$disconnect();
});

describe('contraintes du schéma', () => {
  it('refuse deux sites avec le même sous-domaine', async () => {
    const org = await prisma.organization.create({
      data: { name: 'Org', slug: `${PREFIX}-unicite-slug` },
    });
    await prisma.site.create({ data: { name: 'A', slug: `${PREFIX}-collision`, orgId: org.id } });

    await expect(
      prisma.site.create({ data: { name: 'B', slug: `${PREFIX}-collision`, orgId: org.id } }),
    ).rejects.toThrow();
  });

  it('refuse deux pages au même chemin dans un site', async () => {
    const org = await prisma.organization.create({
      data: { name: 'Org', slug: `${PREFIX}-unicite-path` },
    });
    const site = await prisma.site.create({
      data: { name: 'Site', slug: `${PREFIX}-pages`, orgId: org.id },
    });
    const content = { version: 1, root: [], meta: { updatedAt: new Date().toISOString() } };

    await prisma.page.create({ data: { siteId: site.id, path: '/', title: 'Accueil', content } });

    await expect(
      prisma.page.create({ data: { siteId: site.id, path: '/', title: 'Doublon', content } }),
    ).rejects.toThrow();
  });

  it("supprime les sites en cascade quand l'organisation disparaît", async () => {
    const org = await prisma.organization.create({
      data: { name: 'Org', slug: `${PREFIX}-cascade` },
    });
    const site = await prisma.site.create({
      data: { name: 'Site', slug: `${PREFIX}-cascade-site`, orgId: org.id },
    });

    await withArchived().organization.delete({ where: { id: org.id } });

    expect(await withArchived().site.findUnique({ where: { id: site.id } })).toBeNull();
  });

  it("n'autorise qu'un seul membre par couple (utilisateur, organisation)", async () => {
    const org = await prisma.organization.create({
      data: { name: 'Org', slug: `${PREFIX}-membership` },
    });
    const user = await prisma.user.create({
      data: { email: `${PREFIX}-membre@atelier.test`, name: 'Membre' },
    });
    await prisma.membership.create({ data: { orgId: org.id, userId: user.id, role: 'EDITOR' } });

    await expect(
      prisma.membership.create({ data: { orgId: org.id, userId: user.id, role: 'ADMIN' } }),
    ).rejects.toThrow();

    await withArchived().user.delete({ where: { id: user.id } });
  });

  it('conserve la révision publiée pointée par le site', async () => {
    const org = await prisma.organization.create({
      data: { name: 'Org', slug: `${PREFIX}-revision` },
    });
    const site = await prisma.site.create({
      data: { name: 'Site', slug: `${PREFIX}-revision-site`, orgId: org.id },
    });
    const revision = await prisma.revision.create({
      data: { siteId: site.id, snapshot: { pages: [] }, kind: 'PUBLISH' },
    });

    const published = await prisma.site.update({
      where: { id: site.id },
      data: { publishedRevisionId: revision.id },
    });

    expect(published.publishedRevisionId).toBe(revision.id);
  });
});
