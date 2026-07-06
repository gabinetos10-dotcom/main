import { prisma } from "@/lib/prisma";
import { ensureFleetSeeded } from "@/lib/seed";
import HomeClient from "@/components/HomeClient";
import { FLEET } from "@/lib/fleet-data";
import type { Vehicle } from "@/components/types";

export const dynamic = "force-dynamic";

export default async function Home() {
  let vehicles: Vehicle[];
  try {
    await ensureFleetSeeded();
    vehicles = await prisma.vehicle.findMany({ orderBy: { pricePerDay: "asc" } });
  } catch {
    // Database unreachable — fall back to the static catalogue so the
    // showcase still renders (booking will surface its own errors).
    vehicles = FLEET.map((c, i) => ({ ...c, id: `static-${i}` }));
  }
  return <HomeClient vehicles={vehicles} />;
}
