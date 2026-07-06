import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ensureFleetSeeded } from "@/lib/seed";

export const dynamic = "force-dynamic";

export async function GET() {
  await ensureFleetSeeded();
  const vehicles = await prisma.vehicle.findMany({
    orderBy: { pricePerDay: "asc" },
  });
  return NextResponse.json(vehicles);
}
