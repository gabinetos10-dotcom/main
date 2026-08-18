import { createHash } from "node:crypto";
import { z } from "zod";
import type { Blueprint, SourceFile, SourceSnapshot } from "@calque/blueprint";
import { analyze } from "@calque/parser";
import { keys, type ObjectStore } from "@calque/storage";
import { classifyFile, pickEntry, stripCommonRoot } from "./inventory";
import { IngestError, type Rejection } from "./security";
import { extractZip } from "./zip";

export * from "./security";
export * from "./inventory";
export { extractZip, type ExtractedFile, type ExtractionResult } from "./zip";

/**
 * Job INGEST (§8) : archive déposée → source immuable dans R2 + blueprint.
 *
 * Le dépôt ne mute jamais rien : il *ajoute* une version. Chaque fichier est
 * écrit sous `sites/{siteId}/sources/{versionId}/…`, en lecture seule, avec son
 * empreinte SHA-256. Deux dépôts successifs coexistent sans se marcher dessus,
 * ce qui rend la re-livraison de design (§8) et le retour arrière possibles.
 */

export const ingestReportSchema = z.object({
  siteId: z.string(),
  versionId: z.string(),
  entry: z.string(),
  startedAt: z.string(),
  durationMs: z.number().int().min(0),
  files: z.object({
    total: z.number().int().min(0),
    pages: z.number().int().min(0),
    styles: z.number().int().min(0),
    scripts: z.number().int().min(0),
    assets: z.number().int().min(0),
    fonts: z.number().int().min(0),
    autres: z.number().int().min(0),
    bytes: z.number().int().min(0),
  }),
  detected: z.object({
    pages: z.number().int().min(0),
    virtualPages: z.number().int().min(0),
    fields: z.number().int().min(0),
    images: z.number().int().min(0),
    collections: z.number().int().min(0),
    lockedNodes: z.number().int().min(0),
    themeTokens: z.number().int().min(0),
  }),
  rejections: z.array(
    z.object({ path: z.string(), code: z.string(), message: z.string() }),
  ),
  warnings: z.array(
    z.object({
      code: z.string(),
      message: z.string(),
      pagePath: z.string().optional(),
      domPath: z.string().optional(),
      severity: z.enum(["info", "attention"]),
    }),
  ),
});

export type IngestReport = z.infer<typeof ingestReportSchema>;

export interface IngestInput {
  archive: Uint8Array;
  siteId: string;
  versionId: string;
  store: ObjectStore;
  now?: Date;
  /**
   * Faux quand l'archive est déjà dans le stockage — cas du dépôt direct par
   * URL signée, où le client l'a écrite lui-même. La réécrire ferait transiter
   * cent mégaoctets pour rien.
   */
  storeArchive?: boolean;
}

export interface IngestOutcome {
  blueprint: Blueprint;
  report: IngestReport;
  snapshot: SourceSnapshot;
}

function sha256(contenu: Uint8Array): string {
  return createHash("sha256").update(contenu).digest("hex");
}

/**
 * Construit un `SourceSnapshot` lisant depuis le stockage objet.
 *
 * Les fichiers textuels gardent leur contenu en mémoire — parser et builder en
 * ont besoin de toute façon — et les binaires sont relus à la demande. C'est ce
 * qui permet d'analyser un site de 300 Mo sans le charger entièrement.
 */
export function snapshotFromStore(
  store: ObjectStore,
  siteId: string,
  versionId: string,
  fichiers: readonly SourceFile[],
  entry: string,
): SourceSnapshot {
  return {
    entry,
    files: fichiers,
    read: (path) => store.get(keys.source(siteId, versionId, path)),
  };
}

export async function ingestArchive(input: IngestInput): Promise<IngestOutcome> {
  const depart = input.now ?? new Date();
  const debut = Date.now();

  const extraction = await extractZip(input.archive);
  const { prefix, paths } = stripCommonRoot(extraction.files.map((f) => f.path));
  const rejections: Rejection[] = [...extraction.rejections];

  const entry = pickEntry(paths);
  if (entry === null) {
    throw new IngestError(
      "aucune-page",
      "Cette archive ne contient aucune page HTML. Vérifiez que le site est bien à la racine du ZIP.",
    );
  }

  const fichiers: SourceFile[] = [];
  let octets = 0;

  for (const [index, extrait] of extraction.files.entries()) {
    const chemin = paths[index] as string;
    const kind = classifyFile(chemin);
    const textuel = kind === "page" || kind === "style" || kind === "script";

    await input.store.put(
      keys.source(input.siteId, input.versionId, chemin),
      extrait.content,
      { cacheControl: "public, max-age=31536000, immutable" },
    );

    octets += extrait.content.byteLength;
    fichiers.push({
      path: chemin,
      kind,
      bytes: extrait.content.byteLength,
      sha256: sha256(extrait.content),
      ...(textuel ? { content: extrait.content } : {}),
    });
  }

  // L'archive elle-même est conservée : c'est la seule façon de rejouer une
  // ingestion à l'identique si le parser évolue.
  if (input.storeArchive !== false) {
    await input.store.put(keys.archive(input.siteId, input.versionId), input.archive, {
      contentType: "application/zip",
    });
  }

  const snapshot = snapshotFromStore(
    input.store,
    input.siteId,
    input.versionId,
    fichiers,
    entry,
  );

  const { blueprint, stats } = await analyze(snapshot, { now: depart });

  const parKind = (kind: SourceFile["kind"]): number =>
    fichiers.filter((fichier) => fichier.kind === kind).length;

  const report: IngestReport = ingestReportSchema.parse({
    siteId: input.siteId,
    versionId: input.versionId,
    entry: prefix.length > 0 ? `${prefix}${entry}` : entry,
    startedAt: depart.toISOString(),
    durationMs: Date.now() - debut,
    files: {
      total: fichiers.length,
      pages: parKind("page"),
      styles: parKind("style"),
      scripts: parKind("script"),
      assets: parKind("asset"),
      fonts: parKind("font"),
      autres: parKind("autre"),
      bytes: octets,
    },
    detected: {
      pages: stats.pages,
      virtualPages: blueprint.pages.filter((page) => page.virtual).length,
      fields: stats.fields,
      images: stats.images,
      collections: stats.collections,
      lockedNodes: stats.lockedNodes,
      themeTokens: blueprint.theme.tokens.length,
    },
    rejections: rejections.map((rejet) => ({
      path: rejet.path,
      code: rejet.code,
      message: rejet.message,
    })),
    warnings: blueprint.warnings,
  });

  return { blueprint, report, snapshot };
}
