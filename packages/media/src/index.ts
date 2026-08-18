import { createHash } from "node:crypto";
import sharp from "sharp";
import type { Metadata, Sharp } from "sharp";
import { z } from "zod";
import { keys, type ObjectStore } from "@calque/storage";

/**
 * Bibliothèque de médias (§14).
 *
 * Une image déposée est traitée une fois et pour toutes : recadrée au ratio du
 * champ si demandé, déclinée en `webp` et `avif` sur quatre largeurs, et rangée
 * sous son empreinte. Le dédoublonnage par hachage n'est pas une optimisation
 * anecdotique — une agence redépose souvent le même logo sur dix sites.
 */

/** §14 : `srcset` en 400/800/1200/1600. */
export const LARGEURS = [400, 800, 1200, 1600] as const;
export const FORMATS = ["webp", "avif"] as const;

export const LIMITE_OCTETS = 10 * 1024 * 1024;

export const TYPES_ACCEPTES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/avif",
  "image/gif",
  "image/svg+xml",
]);

export class MediaError extends Error {
  constructor(
    readonly code: "type-refuse" | "trop-gros" | "illisible",
    message: string,
  ) {
    super(message);
    this.name = "MediaError";
  }
}

export const cropSchema = z.object({
  x: z.number().min(0),
  y: z.number().min(0),
  width: z.number().positive(),
  height: z.number().positive(),
});

export type Crop = z.infer<typeof cropSchema>;

export interface MediaVariants {
  widths: number[];
  formats: Array<"webp" | "avif" | "jpeg" | "png">;
  /** `webp/800` → clé de stockage. */
  keys: Record<string, string>;
}

export interface ProcessedMedia {
  hash: string;
  mime: string;
  bytes: number;
  width: number;
  height: number;
  /** Chemin public relatif du fichier d'origine, tel qu'il sera écrit au build. */
  path: string;
  variants: MediaVariants;
}

export function hashOf(contenu: Uint8Array): string {
  return createHash("sha256").update(contenu).digest("hex");
}

function extensionDe(mime: string): string {
  switch (mime) {
    case "image/png":
      return "png";
    case "image/webp":
      return "webp";
    case "image/avif":
      return "avif";
    case "image/gif":
      return "gif";
    case "image/svg+xml":
      return "svg";
    default:
      return "jpg";
  }
}

export interface ProcessInput {
  content: Uint8Array;
  mime: string;
  siteId: string;
  store: ObjectStore;
  /** Recadrage en pixels de l'image d'origine, appliqué avant les variantes. */
  crop?: Crop;
  /** Format cible du champ, `16/9`. Recadre au centre à défaut de recadrage explicite. */
  aspectRatio?: string;
}

function ratioNumerique(format: string | undefined): number | null {
  if (format === undefined) return null;
  const [largeur, hauteur] = format.split("/").map((part) => Number.parseFloat(part));
  if (largeur === undefined || hauteur === undefined) return null;
  if (!Number.isFinite(largeur) || !Number.isFinite(hauteur) || hauteur === 0)
    return null;
  return largeur / hauteur;
}

/**
 * Traite une image et écrit ses variantes dans le stockage.
 *
 * Les SVG ne sont ni recadrés ni déclinés : ce sont des vecteurs, les
 * redimensionner n'a pas de sens, et les rastériser perdrait leur qualité.
 */
export async function processImage(input: ProcessInput): Promise<ProcessedMedia> {
  if (!TYPES_ACCEPTES.has(input.mime)) {
    throw new MediaError(
      "type-refuse",
      "Ce type de fichier n'est pas accepté. Utilisez une image JPEG, PNG, WebP, AVIF ou SVG.",
    );
  }
  if (input.content.byteLength > LIMITE_OCTETS) {
    throw new MediaError(
      "trop-gros",
      `Cette image fait ${Math.round(input.content.byteLength / 1024 / 1024)} Mo. La limite est de ${LIMITE_OCTETS / 1024 / 1024} Mo.`,
    );
  }

  const hash = hashOf(input.content);
  const extension = extensionDe(input.mime);
  const chemin = `assets/calque/${hash.slice(0, 16)}.${extension}`;

  if (input.mime === "image/svg+xml") {
    await input.store.put(
      keys.media(input.siteId, hash, `origine.${extension}`),
      input.content,
      {
        contentType: input.mime,
        cacheControl: "public, max-age=31536000, immutable",
      },
    );
    return {
      hash,
      mime: input.mime,
      bytes: input.content.byteLength,
      width: 0,
      height: 0,
      path: chemin,
      variants: { widths: [], formats: [], keys: {} },
    };
  }

  let image: Sharp;
  let metadonnees: Metadata;
  try {
    image = sharp(Buffer.from(input.content), { failOn: "error" });
    metadonnees = await image.metadata();
  } catch {
    throw new MediaError("illisible", "Ce fichier ne semble pas être une image valide.");
  }

  const largeurSource = metadonnees.width ?? 0;
  const hauteurSource = metadonnees.height ?? 0;
  if (largeurSource === 0 || hauteurSource === 0) {
    throw new MediaError("illisible", "Ce fichier ne semble pas être une image valide.");
  }

  let base = image.rotate();
  let largeur = largeurSource;
  let hauteur = hauteurSource;

  if (input.crop !== undefined) {
    const zone = cropSchema.parse(input.crop);
    largeur = Math.min(Math.round(zone.width), largeurSource);
    hauteur = Math.min(Math.round(zone.height), hauteurSource);
    base = base.extract({
      left: Math.round(zone.x),
      top: Math.round(zone.y),
      width: largeur,
      height: hauteur,
    });
  } else {
    const ratio = ratioNumerique(input.aspectRatio);
    if (ratio !== null) {
      const cible = Math.abs(largeurSource / hauteurSource - ratio) > 0.01;
      if (cible) {
        // Recadrage centré au ratio du champ : l'image publiée doit occuper la
        // place prévue par le design, pas la déformer.
        const parLargeur = largeurSource / ratio <= hauteurSource;
        largeur = parLargeur ? largeurSource : Math.round(hauteurSource * ratio);
        hauteur = parLargeur ? Math.round(largeurSource / ratio) : hauteurSource;
        base = base.extract({
          left: Math.round((largeurSource - largeur) / 2),
          top: Math.round((hauteurSource - hauteur) / 2),
          width: largeur,
          height: hauteur,
        });
      }
    }
  }

  const original = await base.clone().toBuffer();
  await input.store.put(
    keys.media(input.siteId, hash, `origine.${extension}`),
    new Uint8Array(original),
    { contentType: input.mime, cacheControl: "public, max-age=31536000, immutable" },
  );

  const clefs: Record<string, string> = {};
  const largeursProduites: number[] = [];

  for (const cible of LARGEURS) {
    // On n'agrandit jamais : une variante 1600 depuis une source 800 serait
    // plus lourde que l'original pour une image plus floue.
    if (cible > largeur) continue;
    largeursProduites.push(cible);

    for (const format of FORMATS) {
      const redimensionne = base
        .clone()
        .resize({ width: cible, withoutEnlargement: true });
      const octets =
        format === "webp"
          ? await redimensionne.webp({ quality: 78 }).toBuffer()
          : await redimensionne.avif({ quality: 55 }).toBuffer();

      const clef = keys.media(input.siteId, hash, `${cible}.${format}`);
      await input.store.put(clef, new Uint8Array(octets), {
        contentType: `image/${format}`,
        cacheControl: "public, max-age=31536000, immutable",
      });
      clefs[`${format}/${cible}`] = clef;
    }
  }

  // Une image plus petite que la plus petite largeur cible garde au moins une
  // déclinaison : sans elle, la publication n'aurait aucun `srcset` à écrire.
  if (largeursProduites.length === 0) {
    largeursProduites.push(largeur);
    for (const format of FORMATS) {
      const octets =
        format === "webp"
          ? await base.clone().webp({ quality: 78 }).toBuffer()
          : await base.clone().avif({ quality: 55 }).toBuffer();
      const clef = keys.media(input.siteId, hash, `${largeur}.${format}`);
      await input.store.put(clef, new Uint8Array(octets), {
        contentType: `image/${format}`,
        cacheControl: "public, max-age=31536000, immutable",
      });
      clefs[`${format}/${largeur}`] = clef;
    }
  }

  return {
    hash,
    mime: input.mime,
    bytes: original.byteLength,
    width: largeur,
    height: hauteur,
    path: chemin,
    variants: {
      widths: largeursProduites,
      formats: [...FORMATS],
      keys: clefs,
    },
  };
}

/** `srcset` prêt à écrire, pour une base d'URL donnée (§15, étape 6). */
export function srcset(
  variants: MediaVariants,
  format: "webp" | "avif",
  baseUrl: string,
): string {
  return variants.widths
    .map((largeur) => {
      const clef = variants.keys[`${format}/${largeur}`];
      return clef === undefined ? null : `${baseUrl}/${clef} ${largeur}w`;
    })
    .filter((entree): entree is string => entree !== null)
    .join(", ");
}
