import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Corps invalide" }, { status: 400 });
  }

  const { firstName, lastName, email, snapchat, message } = body as Record<string, string>;

  if (!firstName || !lastName || !email || !message) {
    return NextResponse.json(
      { error: "Prénom, nom, email et message sont requis." },
      { status: 400 }
    );
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: "Adresse email invalide." }, { status: 400 });
  }

  await prisma.contactMessage.create({
    data: {
      firstName: firstName.trim().slice(0, 100),
      lastName: lastName.trim().slice(0, 100),
      email: email.trim().slice(0, 200),
      snapchat: snapchat?.trim().slice(0, 100) || null,
      message: message.trim().slice(0, 5000),
    },
  });

  return NextResponse.json({ ok: true }, { status: 201 });
}
