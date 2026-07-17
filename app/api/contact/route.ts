import { NextResponse } from "next/server";

/**
 * API de contact — MOCKÉE, prête à brancher.
 * — Honeypot anti-spam (champ `website` invisible)
 * — Rate-limit naïf par IP (best-effort, par instance serveur)
 * — Validation stricte + minimisation RGPD : le contenu du message
 *   n'est PAS journalisé.
 * [À COMPLÉTER] : brancher un service d'envoi (Resend, Brevo, SMTP…)
 * à l'endroit indiqué plus bas.
 */

const RATE = new Map<string, number[]>();
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export async function POST(req: Request) {
  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ ok: false, error: "Requête invalide." }, { status: 400 });
  }

  // Honeypot : un humain ne voit jamais ce champ. S'il est rempli → bot.
  if (typeof body.website === "string" && body.website.trim() !== "") {
    return NextResponse.json({ ok: true, id: "noop" });
  }

  // Rate-limit : 5 requêtes / minute / IP
  const ip = (req.headers.get("x-forwarded-for") ?? "local").split(",")[0]!.trim();
  const now = Date.now();
  const hits = (RATE.get(ip) ?? []).filter((t) => now - t < 60_000);
  if (hits.length >= 5) {
    return NextResponse.json(
      { ok: false, error: "Trop de tentatives. Réessayez dans une minute." },
      { status: 429 }
    );
  }
  hits.push(now);
  RATE.set(ip, hits);

  const name = String(body.name ?? "").trim();
  const email = String(body.email ?? "").trim();
  const subject = String(body.subject ?? "").trim();
  const message = String(body.message ?? "").trim();
  const consent = body.consent === true;

  if (!consent) {
    return NextResponse.json(
      { ok: false, error: "Le consentement est requis pour traiter votre demande." },
      { status: 400 }
    );
  }
  if (name.length < 2 || name.length > 120) {
    return NextResponse.json({ ok: false, error: "Merci d'indiquer votre nom." }, { status: 400 });
  }
  if (!EMAIL_RE.test(email) || email.length > 160) {
    return NextResponse.json({ ok: false, error: "Adresse e-mail invalide." }, { status: 400 });
  }
  if (message.length < 10 || message.length > 4000) {
    return NextResponse.json(
      { ok: false, error: "Votre message doit contenir entre 10 et 4000 caractères." },
      { status: 400 }
    );
  }

  // Simule la latence d'un vrai envoi
  await new Promise((r) => setTimeout(r, 500));

  // ┌────────────────────────────────────────────────────────────┐
  // │ [À COMPLÉTER] Envoi réel — exemple avec Resend :           │
  // │   await resend.emails.send({ from, to, subject, text })    │
  // └────────────────────────────────────────────────────────────┘
  console.log("[GJS][contact]", {
    name,
    email,
    subject,
    messageLength: message.length, // minimisation : pas le contenu
    at: new Date().toISOString(),
  });

  return NextResponse.json({ ok: true, id: crypto.randomUUID() });
}
