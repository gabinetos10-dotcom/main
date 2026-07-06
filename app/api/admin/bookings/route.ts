import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isAdmin } from "@/lib/admin-auth";
import { ensureFleetSeeded } from "@/lib/seed";

export const dynamic = "force-dynamic";

export async function GET() {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }
  await ensureFleetSeeded();
  const bookings = await prisma.booking.findMany({
    include: { vehicle: { select: { name: true, brand: true, image: true } } },
    orderBy: { startDate: "asc" },
  });
  const messages = await prisma.contactMessage.findMany({
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json({ bookings, messages });
}
