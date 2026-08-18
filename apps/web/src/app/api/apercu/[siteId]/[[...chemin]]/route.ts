import { NextResponse } from "next/server";
import { getTranslations } from "next-intl/server";
import { z } from "zod";
import { OVERRIDES_PATH, renderOverrides } from "@calque/builder";
import {
  draftsRepository,
  getDatabase,
  mediaRepository,
  sitesRepository,
} from "@calque/db";
import { keys } from "@calque/storage";
import { requireContext } from "@/lib/session";
import { objectStore } from "@/lib/storage";
import { construireApercu } from "@/lib/apercu";

/**
 * Serveur d'aperçu (§11).
 *
 * Il sert le site **tel qu'il serait publié**, plus le runtime d'édition : la
 * même fonction `build`, avec `injectEditorRuntime`. Ce que le client voit ici
 * est ce qu'il obtiendra en publiant.
 *
 * ⚠️ Le §11 veut l'aperçu servi depuis `*.calque-preview.site`, un eTLD+1
 * distinct de l'application, pour que les cookies de session ne soient pas
 * accessibles depuis la page éditée. Ce déploiement demande un domaine et une
 * entrée DNS : il est consigné dans `docs/RUNBOOK.md` comme préalable à la mise
 * en production. En attendant, l'iframe reste en bac à sable et la CSP interdit
 * tout ce qui n'est pas nécessaire.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Préfixe des images ajoutées depuis la bibliothèque, absentes du source. */
const CHEMIN_MEDIAS = "assets/calque/";

const paramsSchema = z.object({
  siteId: z.string().uuid(),
  chemin: z.array(z.string()).default([]),
});

const TYPES: Record<string, string> = {
  html: "text/html; charset=utf-8",
  css: "text/css; charset=utf-8",
  js: "text/javascript; charset=utf-8",
  json: "application/json; charset=utf-8",
  svg: "image/svg+xml",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  gif: "image/gif",
  webp: "image/webp",
  avif: "image/avif",
  ico: "image/x-icon",
  woff: "font/woff",
  woff2: "font/woff2",
  mp4: "video/mp4",
};

function typeDe(chemin: string): string {
  const extension = chemin.split(".").pop()?.toLowerCase() ?? "";
  return TYPES[extension] ?? "application/octet-stream";
}

/**
 * En-têtes de l'aperçu.
 *
 * `frame-ancestors 'self'` : seule l'application peut l'encadrer. Pas de
 * `X-Frame-Options: DENY` — il empêcherait précisément l'usage prévu.
 */
function entetes(contentType: string): Headers {
  const entetes = new Headers();
  entetes.set("content-type", contentType);
  entetes.set("cache-control", "no-store");
  entetes.set("x-content-type-options", "nosniff");
  entetes.set("referrer-policy", "no-referrer");
  entetes.set(
    "content-security-policy",
    [
      "default-src 'self' data: blob: https:",
      "script-src 'self' 'unsafe-inline' https:",
      "style-src 'self' 'unsafe-inline' https:",
      "frame-ancestors 'self'",
      "form-action 'none'",
      "base-uri 'none'",
    ].join("; "),
  );
  return entetes;
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ siteId: string; chemin?: string[] }> },
): Promise<NextResponse | Response> {
  const analyse = paramsSchema.safeParse(await params);
  if (!analyse.success) {
    return NextResponse.json({ erreur: "Requête invalide." }, { status: 400 });
  }

  const contexte = await requireContext();
  const handle = await getDatabase();
  const sites = sitesRepository(handle, contexte.org.orgId);

  const site = (await sites.list()).find(
    (candidat) => candidat.id === analyse.data.siteId,
  );
  if (site === undefined) {
    return NextResponse.json({ erreur: "Site inconnu." }, { status: 404 });
  }

  const dernier = await sites.latestBlueprint(site.id);
  if (dernier === null) {
    return NextResponse.json(
      { erreur: "Ce site n'a pas encore été analysé." },
      { status: 409 },
    );
  }

  const brouillon = await draftsRepository(handle, contexte.org.orgId).get(site.id);
  if (brouillon === null) {
    return NextResponse.json({ erreur: "Aucun brouillon." }, { status: 409 });
  }

  const store = objectStore();
  const demande = analyse.data.chemin.join("/");
  const chemin = demande.length === 0 ? dernier.manifest.entry : demande;

  // La feuille de surcharge n'existe pas dans le source : elle est calculée.
  if (chemin === OVERRIDES_PATH) {
    const { css } = renderOverrides(dernier.blueprint, brouillon.data);
    return new Response(css, { headers: entetes(TYPES["css"] as string) });
  }

  const estPage = chemin.endsWith(".html") || chemin.endsWith(".htm");

  if (!estPage) {
    // Une image choisie dans la bibliothèque n'existe pas dans le source : son
    // chemin est fabriqué à partir de son empreinte, et elle vit sous les médias.
    if (chemin.startsWith(CHEMIN_MEDIAS)) {
      const nom = chemin.slice(CHEMIN_MEDIAS.length);
      const prefixe = nom.split(".")[0] ?? "";
      const extension = nom.split(".").pop() ?? "";
      const medias = await mediaRepository(handle, contexte.org.orgId).list(site.id);
      const media = medias.find((candidat) => candidat.hash.startsWith(prefixe));
      if (media !== undefined) {
        try {
          const octets = await store.get(
            keys.media(site.id, media.hash, `origine.${extension}`),
          );
          return new Response(new Uint8Array(octets), {
            headers: entetes(typeDe(chemin)),
          });
        } catch {
          /* le média est référencé mais absent : on tombe dans le 404 commun */
        }
      }
      return NextResponse.json({ erreur: "Média inconnu." }, { status: 404 });
    }

    // Images, polices, feuilles de style du site : inchangées par le build,
    // servies directement depuis le stockage plutôt que reconstruites.
    try {
      const octets = await store.get(keys.source(site.id, dernier.siteVersionId, chemin));
      return new Response(new Uint8Array(octets), { headers: entetes(typeDe(chemin)) });
    } catch {
      return NextResponse.json({ erreur: "Fichier inconnu." }, { status: 404 });
    }
  }

  // Les libellés des poignées descendent d'ici : le runtime est un fichier
  // statique, partagé par tous les sites, et n'embarque aucune phrase.
  const t = await getTranslations("editeur");
  const pages = await construireApercu({
    store,
    siteId: site.id,
    siteVersionId: dernier.siteVersionId,
    manifest: dernier.manifest,
    blueprint: dernier.blueprint,
    content: brouillon.data,
    runtimeUrl: "/apercu/editor-runtime.js",
    parentOrigin: new URL(_request.url).origin,
    actions: {
      up: t("monter"),
      down: t("descendre"),
      duplicate: t("dupliquer"),
      remove: t("supprimer"),
    },
  });

  const page = pages.get(chemin);
  if (page === undefined) {
    return NextResponse.json({ erreur: "Page inconnue." }, { status: 404 });
  }

  return new Response(new Uint8Array(page), {
    headers: entetes(TYPES["html"] as string),
  });
}
