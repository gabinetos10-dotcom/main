"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getDatabase, sitesRepository } from "@calque/db";
import { IngestError } from "@calque/ingest";
import { createIngestJob, createInlineRunner } from "@calque/jobs";
import { requireContext } from "@/lib/session";
import { createUploadTarget } from "@/lib/depot";
import { objectStore } from "@/lib/storage";
import { logger } from "@/lib/logger";

/**
 * Parcours de dépôt d'un site (§8).
 *
 * Trois temps, parce que l'archive ne passe pas par le serveur :
 *   1. `preparerDepot` crée le site et rend une cible d'écriture ;
 *   2. le navigateur écrit l'archive dans le stockage ;
 *   3. `lancerIngestion` déclenche le travail INGEST et rend le rapport.
 */

const nomSchema = z
  .string()
  .trim()
  .min(2, "Donnez un nom d'au moins deux caractères.")
  .max(80, "Ce nom est trop long.");

function slugifier(valeur: string): string {
  return (
    valeur
      .normalize("NFD")
      .replace(/[̀-ͯ]/gu, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/gu, "-")
      .replace(/^-|-$/gu, "")
      .slice(0, 48) || "site"
  );
}

export interface PreparationDepot {
  siteId: string;
  slug: string;
  versionId: string;
  uploadUrl: string;
  sameOrigin: boolean;
}

export async function preparerDepot(nomBrut: string): Promise<PreparationDepot> {
  const contexte = await requireContext();
  const nom = nomSchema.parse(nomBrut);

  const handle = await getDatabase();
  const sites = sitesRepository(handle, contexte.org.orgId);

  const base = slugifier(nom);
  let slug = base;
  let suffixe = 2;
  while ((await sites.bySlug(slug)) !== null) {
    slug = `${base}-${suffixe}`;
    suffixe += 1;
  }

  const site = await sites.create({ name: nom, slug });
  const cible = createUploadTarget(site.id);

  return {
    siteId: site.id,
    slug: site.slug,
    versionId: cible.versionId,
    uploadUrl: cible.url,
    sameOrigin: cible.sameOrigin,
  };
}

export interface ResultatIngestion {
  ok: boolean;
  slug: string;
  message?: string;
}

export async function lancerIngestion(input: {
  siteId: string;
  versionId: string;
  slug: string;
}): Promise<ResultatIngestion> {
  const contexte = await requireContext();
  const runner = createInlineRunner();
  const job = createIngestJob({ handle: await getDatabase(), store: objectStore() });

  try {
    await runner.enqueue(job, {
      orgId: contexte.org.orgId,
      siteId: input.siteId,
      versionId: input.versionId,
      label: "Livraison initiale",
      actorId: contexte.userId,
    });

    revalidatePath("/tableau-de-bord");
    return { ok: true, slug: input.slug };
  } catch (erreur) {
    logger.error({ err: erreur, siteId: input.siteId }, "ingestion échouée");
    return {
      ok: false,
      slug: input.slug,
      message:
        erreur instanceof IngestError
          ? erreur.message
          : "Le dépôt n'a pas pu être analysé. Réessayez, ou envoyez-nous l'archive.",
    };
  }
}
