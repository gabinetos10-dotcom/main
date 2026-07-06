import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isAdmin } from "@/lib/admin-auth";

export const dynamic = "force-dynamic";

const ALLOWED = ["PENDING", "CONFIRMED", "CANCELLED"];

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }
  const { id } = await params;
  let body: { status?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Corps invalide" }, { status: 400 });
  }
  if (!body.status || !ALLOWED.includes(body.status)) {
    return NextResponse.json({ error: "Statut invalide" }, { status: 400 });
  }
  try {
    const booking = await prisma.booking.update({
      where: { id },
      data: { status: body.status },
    });
    return NextResponse.json(booking);
  } catch {
    return NextResponse.json({ error: "Réservation introuvable" }, { status: 404 });
  }
}
