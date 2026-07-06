import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ensureFleetSeeded } from "@/lib/seed";

export const dynamic = "force-dynamic";

// GET /api/bookings?vehicleId=xxx
// Returns the booked (unavailable) date ranges for a vehicle so the
// client calendar can gray them out. Cancelled bookings free the dates.
export async function GET(req: NextRequest) {
  await ensureFleetSeeded();
  const vehicleId = req.nextUrl.searchParams.get("vehicleId");
  if (!vehicleId) {
    return NextResponse.json({ error: "vehicleId requis" }, { status: 400 });
  }
  const bookings = await prisma.booking.findMany({
    where: { vehicleId, status: { not: "CANCELLED" } },
    select: { startDate: true, endDate: true },
  });
  return NextResponse.json(
    bookings.map((b) => ({
      start: b.startDate.toISOString().slice(0, 10),
      end: b.endDate.toISOString().slice(0, 10),
    }))
  );
}

// POST /api/bookings — create a booking request.
export async function POST(req: NextRequest) {
  await ensureFleetSeeded();
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Corps invalide" }, { status: 400 });
  }

  const { vehicleId, firstName, lastName, email, phone, startDate, endDate, startTime, endTime } =
    body as Record<string, string>;

  if (!vehicleId || !firstName || !lastName || !email || !phone || !startDate || !endDate || !startTime || !endTime) {
    return NextResponse.json({ error: "Tous les champs sont requis." }, { status: 400 });
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: "Adresse email invalide." }, { status: 400 });
  }

  const start = new Date(`${startDate}T00:00:00.000Z`);
  const end = new Date(`${endDate}T00:00:00.000Z`);
  if (isNaN(start.getTime()) || isNaN(end.getTime()) || end < start) {
    return NextResponse.json({ error: "Dates invalides." }, { status: 400 });
  }
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  if (start < today) {
    return NextResponse.json({ error: "La date de départ est déjà passée." }, { status: 400 });
  }

  const vehicle = await prisma.vehicle.findUnique({ where: { id: vehicleId } });
  if (!vehicle) {
    return NextResponse.json({ error: "Véhicule introuvable." }, { status: 404 });
  }

  // Overlap check: an existing active booking [s, e] conflicts with the
  // requested [start, end] when s <= end AND e >= start.
  const conflict = await prisma.booking.findFirst({
    where: {
      vehicleId,
      status: { not: "CANCELLED" },
      startDate: { lte: end },
      endDate: { gte: start },
    },
  });
  if (conflict) {
    return NextResponse.json(
      { error: "Ce véhicule est déjà réservé sur ces dates." },
      { status: 409 }
    );
  }

  const booking = await prisma.booking.create({
    data: {
      vehicleId,
      firstName: firstName.trim().slice(0, 100),
      lastName: lastName.trim().slice(0, 100),
      email: email.trim().slice(0, 200),
      phone: phone.trim().slice(0, 30),
      startDate: start,
      endDate: end,
      startTime,
      endTime,
    },
  });

  return NextResponse.json({ ok: true, id: booking.id }, { status: 201 });
}
