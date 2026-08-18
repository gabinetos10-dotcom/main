"use server";

import { randomUUID } from "node:crypto";
import { z } from "zod";
import type { ContentData } from "@calque/blueprint";
import {
  draftsRepository,
  getDatabase,
  mediaRepository,
  sitesRepository,
} from "@calque/db";
import { MediaError, processImage } from "@calque/media";
import { requireContext } from "@/lib/session";
import { cleDepotMedia, createUploadTarget } from "@/lib/depot";
import { objectStore } from "@/lib/storage";

/**
 * Actions de l'éditeur.
 *
 * L'enregistrement du brouillon, lui, passe par `POST /api/brouillon/{siteId}` :
 * une action serveur ferait revalider la route à chaque frappe, et n'accepte pas
 * `keepalive` au moment où l'onglet se ferme.
 */

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

/* ── Médias (§14) ──────────────────────────────────────────────────────────── */

const preparerMediaSchema = z.object({ siteId: z.string().uuid() });

export interface PreparationMedia {
  uploadUrl: string;
  sameOrigin: boolean;
  cle: string;
}

export async function preparerDepotMedia(entree: unknown): Promise<PreparationMedia> {
  const { siteId } = preparerMediaSchema.parse(entree);
  const contexte = await requireContext();
  const handle = await getDatabase();

  const sites = sitesRepository(handle, contexte.org.orgId);
  if (!(await sites.list()).some((site) => site.id === siteId)) {
    throw new Error("Site inconnu.");
  }

  const cible = createUploadTarget(siteId, cleDepotMedia(siteId, randomUUID()));
  return { uploadUrl: cible.url, sameOrigin: cible.sameOrigin, cle: cible.key };
}

const finaliserMediaSchema = z.object({
  siteId: z.string().uuid(),
  cle: z.string().min(1),
  mime: z.string().min(1),
  alt: z.string().default(""),
  aspectRatio: z.string().optional(),
});

export interface ResultatMedia {
  ok: boolean;
  media?: {
    id: string;
    path: string;
    alt: string;
    width: number | null;
    height: number | null;
  };
  message?: string;
}

/**
 * Traite une image déposée : recadrage au ratio du champ, déclinaisons webp et
 * avif, enregistrement dans la bibliothèque du site (§14).
 *
 * Le fichier temporaire est effacé dans tous les cas — succès comme échec : il a
 * été écrit par le navigateur, et rien ne garantit qu'une seconde tentative
 * réutilise la même clé.
 */
export async function finaliserMedia(entree: unknown): Promise<ResultatMedia> {
  const analyse = finaliserMediaSchema.safeParse(entree);
  if (!analyse.success) return { ok: false, message: "Dépôt invalide." };

  const contexte = await requireContext();
  const handle = await getDatabase();
  const sites = sitesRepository(handle, contexte.org.orgId);

  if (!(await sites.list()).some((site) => site.id === analyse.data.siteId)) {
    return { ok: false, message: "Site inconnu." };
  }
  if (!analyse.data.cle.startsWith(`sites/${analyse.data.siteId}/depots/`)) {
    return { ok: false, message: "Dépôt invalide." };
  }

  const store = objectStore();

  try {
    const contenu = await store.get(analyse.data.cle);
    const traite = await processImage({
      content: contenu,
      mime: analyse.data.mime,
      siteId: analyse.data.siteId,
      store,
      ...(analyse.data.aspectRatio === undefined
        ? {}
        : { aspectRatio: analyse.data.aspectRatio }),
    });

    const ligne = await mediaRepository(handle, contexte.org.orgId).upsert({
      siteId: analyse.data.siteId,
      path: traite.path,
      mime: traite.mime,
      bytes: traite.bytes,
      width: traite.width === 0 ? null : traite.width,
      height: traite.height === 0 ? null : traite.height,
      hash: traite.hash,
      alt: analyse.data.alt,
      variants: traite.variants,
    });

    return {
      ok: true,
      media: {
        id: ligne.id,
        path: ligne.path,
        alt: ligne.alt,
        width: ligne.width,
        height: ligne.height,
      },
    };
  } catch (erreur) {
    return {
      ok: false,
      message:
        erreur instanceof MediaError
          ? erreur.message
          : "Cette image n'a pas pu être traitée. Réessayez avec un autre fichier.",
    };
  } finally {
    await store.delete(analyse.data.cle);
  }
}
