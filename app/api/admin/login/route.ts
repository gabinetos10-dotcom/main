import { NextRequest, NextResponse } from "next/server";
import { setAdminSession, verifyPassword, clearAdminSession } from "@/lib/admin-auth";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  let body: { password?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Corps invalide" }, { status: 400 });
  }
  if (!body.password || !verifyPassword(body.password)) {
    return NextResponse.json({ error: "Mot de passe incorrect." }, { status: 401 });
  }
  await setAdminSession();
  return NextResponse.json({ ok: true });
}

export async function DELETE() {
  await clearAdminSession();
  return NextResponse.json({ ok: true });
}
