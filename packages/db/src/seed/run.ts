import { PageStatus, SiteStatus } from '@prisma/client';

import { prisma } from '../client';
import { emptyDocument, seedAgency, seedFreelance, seedSite, seedUsers } from './data';

/**
 * Seed idempotent : rejouable autant de fois que nécessaire sans erreur ni doublon.
 * Un seed qu'on ne peut lancer qu'une fois oblige à réinitialiser la base pour un rien.
 */
async function seed() {
  const agency = await prisma.organization.upsert({
    where: { slug: seedAgency.slug },
    update: { name: seedAgency.name, plan: seedAgency.plan },
    create: { name: seedAgency.name, slug: seedAgency.slug, plan: seedAgency.plan },
  });

  for (const user of seedUsers) {
    const record = await prisma.user.upsert({
      where: { email: user.email },
      update: { name: user.name },
      create: { email: user.email, name: user.name, emailVerified: true },
    });

    await prisma.membership.upsert({
      where: { userId_orgId: { userId: record.id, orgId: agency.id } },
      update: { role: user.role },
      create: {
        userId: record.id,
        orgId: agency.id,
        role: user.role,
        acceptedAt: new Date(),
      },
    });
  }

  const freelanceOwner = await prisma.user.upsert({
    where: { email: seedFreelance.owner.email },
    update: { name: seedFreelance.owner.name },
    create: {
      email: seedFreelance.owner.email,
      name: seedFreelance.owner.name,
      emailVerified: true,
    },
  });

  const freelance = await prisma.organization.upsert({
    where: { slug: seedFreelance.slug },
    update: { name: seedFreelance.name, plan: seedFreelance.plan },
    create: { name: seedFreelance.name, slug: seedFreelance.slug, plan: seedFreelance.plan },
  });

  await prisma.membership.upsert({
    where: { userId_orgId: { userId: freelanceOwner.id, orgId: freelance.id } },
    update: {},
    create: {
      userId: freelanceOwner.id,
      orgId: freelance.id,
      role: 'OWNER',
      acceptedAt: new Date(),
    },
  });

  const site = await prisma.site.upsert({
    where: { slug: seedSite.slug },
    update: { name: seedSite.name },
    create: {
      name: seedSite.name,
      slug: seedSite.slug,
      orgId: agency.id,
      status: SiteStatus.DRAFT,
    },
  });

  for (const page of seedSite.pages) {
    await prisma.page.upsert({
      where: { siteId_path: { siteId: site.id, path: page.path } },
      update: { title: page.title, order: page.order },
      create: {
        siteId: site.id,
        path: page.path,
        title: page.title,
        isHome: page.isHome,
        order: page.order,
        content: emptyDocument(),
        status: PageStatus.DRAFT,
      },
    });
  }

  console.log(
    [
      'Seed terminé.',
      `  ${seedAgency.name} — ${seedUsers.length} membres (OWNER, ADMIN, EDITOR, VIEWER)`,
      `  ${seedFreelance.name} — 1 membre (OWNER)`,
      `  ${seedSite.name} — ${seedSite.pages.length} pages, document vide`,
    ].join('\n'),
  );
}

await seed()
  .catch((error: unknown) => {
    console.error('Seed interrompu :', error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
