/**
 * Sécurité du dépôt (§8.1).
 *
 * Une archive vient de l'extérieur : elle est hostile jusqu'à preuve du
 * contraire. Chaque règle ici correspond à une façon connue de sortir du
 * répertoire d'extraction, de saturer la machine, ou de faire exécuter du code
 * par l'hébergeur qui servira le site.
 *
 * Les entrées refusées ne font pas échouer le dépôt : elles sont **écartées** et
 * listées dans le rapport. Une archive contient presque toujours un `.DS_Store`
 * ou un `__MACOSX/`, et refuser tout le dépôt pour ça serait insupportable.
 * Seules les menaces qui portent sur l'archive entière — bombe, taille — la
 * font échouer.
 */

export const LIMITES = {
  /** Taille de l'archive elle-même. */
  archiveBytes: 100 * 1024 * 1024,
  /** Taille totale décompressée. */
  totalBytes: 300 * 1024 * 1024,
  fileCount: 3000,
  /** Rapport décompressé / compressé, par fichier. */
  compressionRatio: 100,
  /** Taille d'un fichier isolé. */
  fileBytes: 50 * 1024 * 1024,
} as const;

export type RejectionCode =
  | "chemin-hors-archive"
  | "extension-serveur"
  | "dossier-exclu"
  | "fichier-cache"
  | "fichier-trop-gros"
  | "taux-de-compression";

export interface Rejection {
  path: string;
  code: RejectionCode;
  /** Phrase destinée à l'admin, sans jargon. */
  message: string;
}

export class IngestError extends Error {
  constructor(
    readonly code:
      | "archive-trop-grosse"
      | "trop-de-fichiers"
      | "decompresse-trop-gros"
      | "archive-illisible"
      | "aucune-page",
    message: string,
  ) {
    super(message);
    this.name = "IngestError";
  }
}

/** Extensions qu'un hébergeur pourrait exécuter, ou qui portent des secrets. */
const EXTENSIONS_INTERDITES = new Set([
  ".php",
  ".php3",
  ".php4",
  ".php5",
  ".phtml",
  ".asp",
  ".aspx",
  ".jsp",
  ".cgi",
  ".pl",
  ".py",
  ".rb",
  ".sh",
  ".bash",
  ".exe",
  ".dll",
  ".so",
  ".sql",
  ".env",
  ".pem",
  ".key",
  ".p12",
  ".pfx",
  ".htaccess",
]);

const DOSSIERS_EXCLUS = [
  ".git/",
  "node_modules/",
  "__MACOSX/",
  ".svn/",
  ".hg/",
  "vendor/",
  ".next/",
  ".vercel/",
];

const FICHIERS_CACHES = new Set([".DS_Store", "Thumbs.db", "desktop.ini", ".gitignore"]);

/**
 * Normalise un chemin d'archive et refuse tout ce qui sort du dossier.
 *
 * Renvoie `null` pour un chemin hostile : `../`, chemin absolu, lettre de
 * lecteur Windows, ou séparateur nul.
 */
export function normalizeEntryPath(brut: string): string | null {
  if (brut.includes("\0")) return null;

  const unifie = brut.replace(/\\/gu, "/");
  if (unifie.startsWith("/") || /^[a-zA-Z]:/u.test(unifie)) return null;

  const segments: string[] = [];
  for (const segment of unifie.split("/")) {
    if (segment === "" || segment === ".") continue;
    if (segment === "..") return null;
    segments.push(segment);
  }

  return segments.length === 0 ? null : segments.join("/");
}

function extension(chemin: string): string {
  const nom = chemin.split("/").pop() ?? "";
  const point = nom.lastIndexOf(".");
  return point === -1 ? "" : nom.slice(point).toLowerCase();
}

export interface EntryVerdict {
  /** Chemin normalisé, quand l'entrée est acceptée. */
  path: string | null;
  rejection: Rejection | null;
}

export function inspectEntry(
  brut: string,
  taille: { compressed: number; uncompressed: number },
): EntryVerdict {
  const chemin = normalizeEntryPath(brut);
  if (chemin === null) {
    return {
      path: null,
      rejection: {
        path: brut,
        code: "chemin-hors-archive",
        message: "Ce fichier cherche à s'écrire en dehors du dossier du site.",
      },
    };
  }

  for (const dossier of DOSSIERS_EXCLUS) {
    if (
      chemin === dossier.slice(0, -1) ||
      chemin.startsWith(dossier) ||
      chemin.includes(`/${dossier}`)
    ) {
      return {
        path: null,
        rejection: {
          path: chemin,
          code: "dossier-exclu",
          message: `Dossier technique ignoré (${dossier.replace("/", "")}).`,
        },
      };
    }
  }

  const nom = chemin.split("/").pop() ?? "";
  if (FICHIERS_CACHES.has(nom)) {
    return {
      path: null,
      rejection: {
        path: chemin,
        code: "fichier-cache",
        message: "Fichier système ignoré.",
      },
    };
  }

  if (EXTENSIONS_INTERDITES.has(extension(chemin))) {
    return {
      path: null,
      rejection: {
        path: chemin,
        code: "extension-serveur",
        message:
          "Ce type de fichier ne peut pas être publié : il serait exécuté par l'hébergeur.",
      },
    };
  }

  if (taille.uncompressed > LIMITES.fileBytes) {
    return {
      path: null,
      rejection: {
        path: chemin,
        code: "fichier-trop-gros",
        message: `Fichier de ${Math.round(taille.uncompressed / 1024 / 1024)} Mo, au-delà de la limite de ${LIMITES.fileBytes / 1024 / 1024} Mo.`,
      },
    };
  }

  // Une bombe de décompression : quelques kilo-octets qui en produisent des giga.
  if (
    taille.compressed > 0 &&
    taille.uncompressed / taille.compressed > LIMITES.compressionRatio &&
    taille.uncompressed > 1024 * 1024
  ) {
    return {
      path: null,
      rejection: {
        path: chemin,
        code: "taux-de-compression",
        message:
          "Fichier au taux de compression anormal : dépôt interrompu par précaution.",
      },
    };
  }

  return { path: chemin, rejection: null };
}
