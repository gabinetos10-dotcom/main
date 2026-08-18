import { unzip, type Unzipped } from "fflate";
import { inspectEntry, IngestError, LIMITES, type Rejection } from "./security";

/**
 * Extraction d'une archive ZIP (§8.1).
 *
 * fflate expose un filtre appelé **avant** de décompresser chaque entrée : c'est
 * ce qui permet de refuser une bombe de décompression sans jamais l'allouer. Un
 * extracteur qui décompresse d'abord et vérifie ensuite ne protège de rien.
 */

export interface ExtractedFile {
  path: string;
  content: Uint8Array;
}

export interface ExtractionResult {
  files: ExtractedFile[];
  rejections: Rejection[];
  totalBytes: number;
}

export async function extractZip(archive: Uint8Array): Promise<ExtractionResult> {
  if (archive.byteLength > LIMITES.archiveBytes) {
    throw new IngestError(
      "archive-trop-grosse",
      `L'archive fait ${Math.round(archive.byteLength / 1024 / 1024)} Mo, au-delà de la limite de ${LIMITES.archiveBytes / 1024 / 1024} Mo.`,
    );
  }

  const rejections: Rejection[] = [];
  const acceptes = new Map<string, string>();
  let total = 0;
  let comptes = 0;
  let bombe: Rejection | null = null;

  const decompresse = await new Promise<Unzipped>((resolve, reject) => {
    unzip(
      archive,
      {
        filter(fichier) {
          if (fichier.name.endsWith("/")) return false;

          const verdict = inspectEntry(fichier.name, {
            compressed: fichier.size,
            uncompressed: fichier.originalSize,
          });

          if (verdict.rejection !== null) {
            rejections.push(verdict.rejection);
            if (verdict.rejection.code === "taux-de-compression")
              bombe = verdict.rejection;
            return false;
          }

          comptes += 1;
          total += fichier.originalSize;
          acceptes.set(fichier.name, verdict.path as string);
          return true;
        },
      },
      (erreur, resultat) => {
        if (erreur) reject(erreur);
        else resolve(resultat);
      },
    );
  }).catch((erreur: unknown) => {
    throw new IngestError(
      "archive-illisible",
      `Cette archive n'a pas pu être ouverte : ${erreur instanceof Error ? erreur.message : "format inconnu"}.`,
    );
  });

  if (bombe !== null) {
    throw new IngestError(
      "decompresse-trop-gros",
      "Cette archive contient un fichier au taux de compression anormal. Le dépôt est interrompu.",
    );
  }
  if (comptes > LIMITES.fileCount) {
    throw new IngestError(
      "trop-de-fichiers",
      `L'archive contient ${comptes} fichiers, au-delà de la limite de ${LIMITES.fileCount}.`,
    );
  }
  if (total > LIMITES.totalBytes) {
    throw new IngestError(
      "decompresse-trop-gros",
      `Décompressée, l'archive ferait ${Math.round(total / 1024 / 1024)} Mo, au-delà de la limite de ${LIMITES.totalBytes / 1024 / 1024} Mo.`,
    );
  }

  const files: ExtractedFile[] = [];
  for (const [brut, chemin] of acceptes) {
    const contenu = decompresse[brut];
    if (contenu !== undefined) files.push({ path: chemin, content: contenu });
  }

  return {
    files: files.sort((a, b) => a.path.localeCompare(b.path)),
    rejections,
    totalBytes: total,
  };
}
