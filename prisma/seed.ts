// Standalone seed script: `npm run db:seed`
// (The app also self-seeds on first request via lib/seed.ts.)
import { PrismaClient } from "@prisma/client";
import { FLEET } from "../lib/fleet-data";

const prisma = new PrismaClient();

async function main() {
  for (const car of FLEET) {
    await prisma.vehicle.upsert({
      where: { slug: car.slug },
      update: car,
      create: car,
    });
  }
  console.log(`Seeded ${FLEET.length} vehicles.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
