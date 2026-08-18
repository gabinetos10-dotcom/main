import { NextResponse } from "next/server";
import { z } from "zod";
import { keys } from "@calque/storage";
import { LIMITES } from "@calque/ingest";
import { getDatabase, sitesRepository } from "@calque/db";
import { requireContext } from "@/lib/session";
import { objectStore } from "@/lib/storage";
import { serverEnv } from "@/env";

/**
 * Réception d'une archive en développement local.
 *
 * En production, le navigateur écrit directement dans R2 par URL signée et cette
 * route n'existe pas fonctionnellement : elle refuse. La garder sous le pilote
 * disque évite d'avoir deux parcours d'interface différents.
 */

export const runtime = "nodejs";
export const maxDuration = 60;

const paramsSchema = z.object({
  siteId: z.string().uuid(),
  versionId: z.string().uuid(),
});

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ siteId: string; versionId: string }> },
): Promise<NextResponse> {
  if (serverEnv().STORAGE_DRIVER === "r2") {
    return NextResponse.json(
      { erreur: "Le dépôt passe par une URL signée avec ce stockage." },
      { status: 409 },
    );
  }

  const analyse = paramsSchema.safeParse(await params);
  if (!analyse.success) {
    return NextResponse.json({ erreur: "Requête invalide." }, { status: 400 });
  }

  const contexte = await requireContext();
  const handle = await getDatabase();
  const sites = sitesRepository(handle, contexte.org.orgId);

  // Le site doit appartenir à l'organisation de la session : sans cette
  // vérification, un identifiant deviné suffirait à écrire chez un autre client.
  const autorise = (await sites.list()).some((site) => site.id === analyse.data.siteId);
  if (!autorise) {
    return NextResponse.json({ erreur: "Site inconnu." }, { status: 404 });
  }

  const corps = new Uint8Array(await request.arrayBuffer());
  if (corps.byteLength === 0) {
    return NextResponse.json({ erreur: "Archive vide." }, { status: 400 });
  }
  if (corps.byteLength > LIMITES.archiveBytes) {
    return NextResponse.json(
      { erreur: `L'archive dépasse ${LIMITES.archiveBytes / 1024 / 1024} Mo.` },
      { status: 413 },
    );
  }

  await objectStore().put(
    keys.archive(analyse.data.siteId, analyse.data.versionId),
    corps,
    { contentType: "application/zip" },
  );

  return NextResponse.json({ octets: corps.byteLength });
}
