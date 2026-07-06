import { prisma } from "./prisma";
import { FLEET } from "./fleet-data";

// Lazily seeds the fleet on first access so the demo works with a
// freshly-pushed empty database, without a separate seed step.
let seeded = false;

export async function ensureFleetSeeded() {
  if (seeded) return;
  const count = await prisma.vehicle.count();
  if (count === 0) {
    for (const car of FLEET) {
      await prisma.vehicle.upsert({
        where: { slug: car.slug },
        update: {},
        create: car,
      });
    }
  }
  seeded = true;
}
