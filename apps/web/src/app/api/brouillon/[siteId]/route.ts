import { NextResponse } from "next/server";
import { z } from "zod";
import { contentPatchSchema } from "@calque/blueprint";
import { draftsRepository, getDatabase } from "@calque/db";
import { requireContext } from "@/lib/session";

/**
 * Enregistrement du brouillon (§10, autosave).
 *
 * Une route plutôt qu'une action serveur, pour deux raisons :
 *
 *  • une action serveur fait revalider la route courante à chaque appel, donc
 *    re-rendre tout l'éditeur toutes les 800 ms de frappe ;
 *  • une route accepte `keepalive`, ce qui permet de vider la file d'attente au
 *    moment où l'onglet se ferme. Sans cela, la dernière modification est perdue
 *    exactement quand l'utilisateur croit avoir fini.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const corpsSchema = z.object({
  siteId: z.string().uuid(),
  patch: contentPatchSchema,
});

export async function POST(
  request: Request,
  { params }: { params: Promise<{ siteId: string }> },
): Promise<NextResponse> {
  const { siteId } = await params;

  let brut: unknown;
  try {
    brut = await request.json();
  } catch {
    return NextResponse.json({ ok: false, message: "Corps illisible." }, { status: 400 });
  }

  const analyse = corpsSchema.safeParse({
    siteId,
    patch: (brut as { patch?: unknown })?.patch,
  });
  if (!analyse.success) {
    return NextResponse.json(
      { ok: false, message: "Modification invalide." },
      { status: 400 },
    );
  }

  const contexte = await requireContext();
  const handle = await getDatabase();

  try {
    await draftsRepository(handle, contexte.org.orgId).merge({
      siteId: analyse.data.siteId,
      patch: analyse.data.patch,
      userId: contexte.userId,
    });
    return NextResponse.json({ ok: true, updatedAt: new Date().toISOString() });
  } catch {
    return NextResponse.json(
      {
        ok: false,
        message:
          "L'enregistrement n'a pas abouti. Vos modifications sont encore à l'écran.",
      },
      { status: 500 },
    );
  }
}
