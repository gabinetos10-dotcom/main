import { createHash, createHmac } from "node:crypto";

/**
 * Signature AWS Signature Version 4, telle que R2 l'attend sur son API
 * S3-compatible (§3).
 *
 * Écrite à la main plutôt que tirée du SDK AWS : le produit n'a besoin que de
 * `PUT`, `GET`, `HEAD`, `DELETE` et `ListObjectsV2`, et le SDK pèse plusieurs
 * mégaoctets qu'il faudrait ensuite exclure du bundle Next. La canonisation est
 * la partie délicate — elle est testée séparément.
 */

const ALGORITHME = "AWS4-HMAC-SHA256";

export function sha256Hex(contenu: Uint8Array | string): string {
  return createHash("sha256").update(contenu).digest("hex");
}

function hmac(cle: Buffer | string, donnee: string): Buffer {
  return createHmac("sha256", cle).update(donnee, "utf8").digest();
}

/** `2026-08-18T09:41:07.000Z` → `20260818T094107Z`. */
export function amzDate(date: Date): string {
  return `${date.toISOString().replace(/[-:]/gu, "").slice(0, 15)}Z`;
}

/**
 * Encodage des URI selon RFC 3986, tel que SigV4 l'exige.
 *
 * `encodeURIComponent` laisse passer `!`, `'`, `(`, `)` et `*`, qu'AWS attend
 * encodés. Une clé d'objet contenant une apostrophe suffirait à faire échouer
 * toutes les signatures.
 */
export function encodeRfc3986(valeur: string): string {
  return encodeURIComponent(valeur).replace(
    /[!'()*]/gu,
    (caractere) => `%${caractere.charCodeAt(0).toString(16).toUpperCase()}`,
  );
}

/** Chaque segment est encodé, les séparateurs sont conservés. */
export function canonicalUri(chemin: string): string {
  return chemin
    .split("/")
    .map((segment) => encodeRfc3986(segment))
    .join("/");
}

export function canonicalQuery(parametres: Readonly<Record<string, string>>): string {
  return Object.entries(parametres)
    .map(([cle, valeur]) => [encodeRfc3986(cle), encodeRfc3986(valeur)] as const)
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
    .map(([cle, valeur]) => `${cle}=${valeur}`)
    .join("&");
}

export interface SignInput {
  method: string;
  /** Chemin déjà découpé, non encodé : `/bucket/sites/abc/index.html`. */
  path: string;
  query?: Readonly<Record<string, string>>;
  headers: Readonly<Record<string, string>>;
  payloadHash: string;
  region: string;
  service: string;
  accessKeyId: string;
  secretAccessKey: string;
  date: Date;
}

export interface CanonicalRequest {
  text: string;
  signedHeaders: string;
}

export function canonicalRequest(input: SignInput): CanonicalRequest {
  const entetes = Object.entries(input.headers)
    .map(
      ([nom, valeur]) =>
        [nom.toLowerCase(), valeur.trim().replace(/\s+/gu, " ")] as const,
    )
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));

  const signedHeaders = entetes.map(([nom]) => nom).join(";");
  const canoniques = entetes.map(([nom, valeur]) => `${nom}:${valeur}\n`).join("");

  return {
    text: [
      input.method.toUpperCase(),
      canonicalUri(input.path),
      canonicalQuery(input.query ?? {}),
      canoniques,
      signedHeaders,
      input.payloadHash,
    ].join("\n"),
    signedHeaders,
  };
}

export function stringToSign(input: SignInput, canonique: string): string {
  const horodatage = amzDate(input.date);
  const jour = horodatage.slice(0, 8);
  return [
    ALGORITHME,
    horodatage,
    `${jour}/${input.region}/${input.service}/aws4_request`,
    sha256Hex(canonique),
  ].join("\n");
}

export function signingKey(input: SignInput): Buffer {
  const jour = amzDate(input.date).slice(0, 8);
  const dateKey = hmac(`AWS4${input.secretAccessKey}`, jour);
  const regionKey = hmac(dateKey, input.region);
  const serviceKey = hmac(regionKey, input.service);
  return hmac(serviceKey, "aws4_request");
}

export function authorizationHeader(input: SignInput): string {
  const canonique = canonicalRequest(input);
  const aSigner = stringToSign(input, canonique.text);
  const signature = createHmac("sha256", signingKey(input))
    .update(aSigner, "utf8")
    .digest("hex");
  const jour = amzDate(input.date).slice(0, 8);

  return (
    `${ALGORITHME} Credential=${input.accessKeyId}/${jour}/${input.region}/${input.service}/aws4_request, ` +
    `SignedHeaders=${canonique.signedHeaders}, Signature=${signature}`
  );
}
