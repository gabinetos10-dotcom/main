import { z } from "zod";
import { amzDate, authorizationHeader, sha256Hex } from "./sigv4";
import { ObjectNotFound, type ObjectStore, type StoredObject } from "./types";

/**
 * Cloudflare R2, par son API S3-compatible (§3).
 *
 * ⚠️ Ce pilote n'a jamais été exercé contre un bucket réel depuis ce dépôt :
 * aucune clé R2 n'y est disponible. La signature et la canonisation sont testées
 * unitairement ; le dialogue HTTP ne l'est pas. Le premier déploiement doit le
 * vérifier avant toute mise en production — voir `docs/RUNBOOK.md`.
 */

export const r2ConfigSchema = z.object({
  accountId: z.string().min(1),
  bucket: z.string().min(1),
  accessKeyId: z.string().min(1),
  secretAccessKey: z.string().min(1),
  /** R2 n'a qu'une région logique. */
  region: z.string().default("auto"),
  /** Point d'entrée, déductible du compte. Surchargeable pour un bac à sable. */
  endpoint: z.string().url().optional(),
});

export type R2Config = z.infer<typeof r2ConfigSchema>;

const VIDE_SHA256 = "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855";

export function createR2Store(
  configBrute: unknown,
  fetchImpl: typeof fetch = fetch,
): ObjectStore {
  const config = r2ConfigSchema.parse(configBrute);
  const base = config.endpoint ?? `https://${config.accountId}.r2.cloudflarestorage.com`;
  const host = new URL(base).host;

  async function appeler(
    method: string,
    key: string,
    options: {
      body?: Uint8Array;
      query?: Record<string, string>;
      headers?: Record<string, string>;
    } = {},
  ): Promise<Response> {
    const date = new Date();
    const chemin = `/${config.bucket}${key.length > 0 ? `/${key}` : ""}`;
    const payloadHash =
      options.body === undefined ? VIDE_SHA256 : sha256Hex(options.body);

    const headers: Record<string, string> = {
      host,
      "x-amz-date": amzDate(date),
      "x-amz-content-sha256": payloadHash,
      ...options.headers,
    };

    const autorisation = authorizationHeader({
      method,
      path: chemin,
      query: options.query,
      headers,
      payloadHash,
      region: config.region,
      service: "s3",
      accessKeyId: config.accessKeyId,
      secretAccessKey: config.secretAccessKey,
      date,
    });

    const url = new URL(`${base}${chemin}`);
    for (const [cle, valeur] of Object.entries(options.query ?? {})) {
      url.searchParams.set(cle, valeur);
    }

    // `fetch` n'accepte pas un `Uint8Array` générique comme corps : on lui donne
    // le tampon sous-jacent d'une copie, qui est un `ArrayBuffer` en propre.
    const corps =
      options.body === undefined ? undefined : new Uint8Array(options.body).buffer;

    return fetchImpl(url, {
      method,
      headers: { ...headers, authorization: autorisation },
      ...(corps === undefined ? {} : { body: corps }),
    });
  }

  return {
    id: "r2",

    async put(key, content, options) {
      const reponse = await appeler("PUT", key, {
        body: content,
        headers: {
          "content-length": String(content.byteLength),
          ...(options?.contentType === undefined
            ? {}
            : { "content-type": options.contentType }),
          ...(options?.cacheControl === undefined
            ? {}
            : { "cache-control": options.cacheControl }),
        },
      });
      if (!reponse.ok) {
        throw new Error(`R2 : écriture de ${key} refusée (${reponse.status}).`);
      }
    },

    async get(key) {
      const reponse = await appeler("GET", key);
      if (reponse.status === 404) throw new ObjectNotFound(key);
      if (!reponse.ok)
        throw new Error(`R2 : lecture de ${key} refusée (${reponse.status}).`);
      return new Uint8Array(await reponse.arrayBuffer());
    },

    async has(key) {
      const reponse = await appeler("HEAD", key);
      return reponse.ok;
    },

    async list(prefix) {
      const objets: StoredObject[] = [];
      let jeton: string | undefined;

      do {
        const reponse = await appeler("GET", "", {
          query: {
            "list-type": "2",
            prefix,
            ...(jeton === undefined ? {} : { "continuation-token": jeton }),
          },
        });
        if (!reponse.ok) throw new Error(`R2 : listing refusé (${reponse.status}).`);

        const xml = await reponse.text();
        objets.push(...parseListing(xml));
        jeton = extraireBalise(xml, "NextContinuationToken");
      } while (jeton !== undefined);

      return objets;
    },

    async delete(key) {
      const reponse = await appeler("DELETE", key);
      if (!reponse.ok && reponse.status !== 404) {
        throw new Error(`R2 : suppression de ${key} refusée (${reponse.status}).`);
      }
    },

    async deletePrefix(prefix) {
      for (const objet of await this.list(prefix)) await this.delete(objet.key);
    },
  };
}

/**
 * Lecture du listing S3.
 *
 * XML très contraint et connu — pas du HTML : un découpage suffit, et ajouter un
 * analyseur XML pour cinq balises coûterait plus qu'il ne rapporte.
 */
export function parseListing(xml: string): StoredObject[] {
  const objets: StoredObject[] = [];
  for (const bloc of xml.split("<Contents>").slice(1)) {
    const key = extraireBalise(bloc, "Key");
    const taille = extraireBalise(bloc, "Size");
    if (key !== undefined) {
      objets.push({ key: decodeXml(key), size: Number.parseInt(taille ?? "0", 10) });
    }
  }
  return objets;
}

function extraireBalise(xml: string, nom: string): string | undefined {
  const debut = xml.indexOf(`<${nom}>`);
  if (debut === -1) return undefined;
  const fin = xml.indexOf(`</${nom}>`, debut);
  if (fin === -1) return undefined;
  return xml.slice(debut + nom.length + 2, fin);
}

function decodeXml(valeur: string): string {
  return valeur
    .replace(/&lt;/gu, "<")
    .replace(/&gt;/gu, ">")
    .replace(/&quot;/gu, '"')
    .replace(/&#39;/gu, "'")
    .replace(/&amp;/gu, "&");
}
