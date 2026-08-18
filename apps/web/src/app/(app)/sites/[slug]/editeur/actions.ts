"use server";

import { z } from "zod";
import { contentPatchSchema, type ContentData } from "@calque/blueprint";
import { draftsRepository, getDatabase, sitesRepository } from "@calque/db";
import { requireContext } from "@/lib/session";

/**
 * Enregistrement du brouillon (§10).
 *
 * L'appelant envoie un **patch**, pas le contenu entier : deux onglets ouverts
 * sur le même site ne s'écrasent alors que sur les champs qu'ils touchent tous
 * les deux. La fusion se fait en base, dans la transaction, à partir de l'état
 * relu.
 */

const patchSchema = z.object({
  siteId: z.string().uuid(),
  patch: contentPatchSchema,
});

export interface ResultatEnregistrement {
  ok: boolean;
  updatedAt: string;
  message?: string;
}

export async function enregistrerBrouillon(
  entree: unknown,
): Promise<ResultatEnregistrement> {
  const analyse = patchSchema.safeParse(entree);
  if (!analyse.success) {
    return { ok: false, updatedAt: "", message: "Modification invalide." };
  }

  const contexte = await requireContext();
  const handle = await getDatabase();

  try {
    await draftsRepository(handle, contexte.org.orgId).merge({
      siteId: analyse.data.siteId,
      patch: analyse.data.patch,
      userId: contexte.userId,
    });
    return { ok: true, updatedAt: new Date().toISOString() };
  } catch {
    return {
      ok: false,
      updatedAt: "",
      message:
        "L'enregistrement n'a pas abouti. Vos modifications sont encore à l'écran.",
    };
  }
}

/** Heartbeat du verrou coopératif (§10) : « Marie est en train d'éditer ». */
export async function rafraichirVerrou(siteId: string): Promise<{
  acquired: boolean;
  holder: string | null;
}> {
  const contexte = await requireContext();
  const handle = await getDatabase();
  return draftsRepository(handle, contexte.org.orgId).acquireLock({
    siteId,
    userId: contexte.userId,
  });
}

export async function lireBrouillon(siteId: string): Promise<ContentData | null> {
  const contexte = await requireContext();
  const handle = await getDatabase();

  const sites = sitesRepository(handle, contexte.org.orgId);
  if (!(await sites.list()).some((site) => site.id === siteId)) return null;

  const brouillon = await draftsRepository(handle, contexte.org.orgId).get(siteId);
  return brouillon?.data ?? null;
}
