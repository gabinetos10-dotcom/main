import { NextResponse } from "next/server";
import { z } from "zod";
import { getDatabase, sitesRepository } from "@calque/db";
import { keys } from "@calque/storage";
import { requireContext } from "@/lib/session";
import { objectStore } from "@/lib/storage";

/**
 * Sert un média de la bibliothèque, pour l'éditeur.
 *
 * Le site publié, lui, servira ces images depuis le CDN : cette route n'existe
 * que pour l'interface d'édition, et vérifie donc la session et l'appartenance
 * du site à l'organisation.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const paramsSchema = z.object({
  siteId: z.string().uuid(),
  hash: z.string().regex(/^[0-9a-f]{64}$/u),
  variante: z.string().regex(/^[0-9a-z.]+$/u),
});

const TYPES: Record<string, string> = {
  webp: "image/webp",
  avif: "image/avif",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  gif: "image/gif",
  svg: "image/svg+xml",
};

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ siteId: string; hash: string; variante: string }> },
): Promise<Response> {
  const analyse = paramsSchema.safeParse(await params);
  if (!analyse.success) {
    return NextResponse.json({ erreur: "Requête invalide." }, { status: 400 });
  }

  const contexte = await requireContext();
  const handle = await getDatabase();
  const sites = sitesRepository(handle, contexte.org.orgId);
  if (!(await sites.list()).some((site) => site.id === analyse.data.siteId)) {
    return NextResponse.json({ erreur: "Site inconnu." }, { status: 404 });
  }

  try {
    const octets = await objectStore().get(
      keys.media(analyse.data.siteId, analyse.data.hash, analyse.data.variante),
    );
    const extension = analyse.data.variante.split(".").pop() ?? "";
    return new Response(new Uint8Array(octets), {
      headers: {
        "content-type": TYPES[extension] ?? "application/octet-stream",
        "cache-control": "private, max-age=3600",
        "x-content-type-options": "nosniff",
      },
    });
  } catch {
    return NextResponse.json({ erreur: "Média inconnu." }, { status: 404 });
  }
}
