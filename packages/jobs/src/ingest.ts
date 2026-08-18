import { z } from "zod";
import { initialContent } from "@calque/builder";
import { sitesRepository, type DbHandle, type SourceManifest } from "@calque/db";
import { ingestArchive, IngestError, type IngestReport } from "@calque/ingest";
import { keys, type ObjectStore } from "@calque/storage";
import { defineJob } from "./runner";

/**
 * INGEST (§5, §8) : archive déposée → source immuable + blueprint + brouillon.
 *
 * Le travail est idempotent par `versionId` : le rejouer réécrit les mêmes
 * objets sous les mêmes clés et crée une nouvelle ligne de version. Il ne mute
 * jamais une version existante — c'est ce qui rend le retour arrière possible.
 */

export const ingestPayloadSchema = z.object({
  orgId: z.string().uuid(),
  siteId: z.string().uuid(),
  versionId: z.string().uuid(),
  label: z.string().default("Livraison initiale"),
  actorId: z.string().uuid().nullable().default(null),
});

export type IngestPayload = z.infer<typeof ingestPayloadSchema>;

export interface IngestJobResult {
  report: IngestReport;
  siteVersionId: string;
  blueprintId: string;
}

export interface IngestDependencies {
  handle: DbHandle;
  store: ObjectStore;
  now?: () => Date;
}

export function createIngestJob(deps: IngestDependencies) {
  return defineJob({
    name: "site.ingest",
    payload: ingestPayloadSchema,

    async run(payload): Promise<IngestJobResult> {
      const sites = sitesRepository(deps.handle, payload.orgId);

      try {
        const archive = await deps.store.get(
          keys.archive(payload.siteId, payload.versionId),
        );

        const { blueprint, report, snapshot } = await ingestArchive({
          archive,
          siteId: payload.siteId,
          versionId: payload.versionId,
          store: deps.store,
          now: deps.now?.(),
          storeArchive: false,
        });

        const manifest: SourceManifest = {
          entry: snapshot.entry,
          totalBytes: report.files.bytes,
          files: snapshot.files.map((fichier) => ({
            path: fichier.path,
            kind: fichier.kind,
            bytes: fichier.bytes,
            sha256: fichier.sha256,
            key: keys.source(payload.siteId, payload.versionId, fichier.path),
          })),
        };

        const enregistre = await sites.recordIngestion({
          siteId: payload.siteId,
          label: payload.label,
          manifest,
          blueprint,
          stats: {
            pages: report.detected.pages,
            fields: report.detected.fields,
            images: report.detected.images,
            collections: report.detected.collections,
            lockedNodes: report.detected.lockedNodes,
            durationMs: report.durationMs,
          },
          initialContent: initialContent(blueprint),
          createdBy: payload.actorId,
        });

        return { report, ...enregistre };
      } catch (erreur) {
        // Le site reste visible dans le tableau de bord, en échec explicite :
        // un site qui disparaîtrait laisserait l'agence sans explication.
        await sites.setStatus(payload.siteId, "echec_ingestion");
        throw erreur instanceof IngestError
          ? erreur
          : new IngestError(
              "archive-illisible",
              erreur instanceof Error
                ? erreur.message
                : "Le dépôt a échoué pour une raison inconnue.",
            );
      }
    },
  });
}
