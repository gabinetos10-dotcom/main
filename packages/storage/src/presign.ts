import { z } from "zod";
import {
  amzDate,
  canonicalQuery,
  canonicalRequest,
  canonicalUri,
  signingKey,
  stringToSign,
} from "./sigv4";
import { createHmac } from "node:crypto";
import { r2ConfigSchema } from "./r2";

/**
 * URL signée pour un dépôt direct depuis le navigateur.
 *
 * Une archive fait jusqu'à 100 Mo (§8) : la faire transiter par une fonction
 * serverless la ferait buter sur la limite de corps de requête de l'hébergeur.
 * Le navigateur écrit donc directement dans le stockage, avec une URL valable
 * quinze minutes et pour une seule clé.
 *
 * ⚠️ Comme le reste du pilote R2, cette signature n'a pas été exercée contre un
 * bucket réel depuis ce dépôt.
 */

export const presignInputSchema = z.object({
  key: z.string().min(1),
  method: z.enum(["PUT", "GET"]).default("PUT"),
  expiresInSeconds: z.number().int().min(60).max(3600).default(900),
});

export type PresignInput = z.infer<typeof presignInputSchema>;

export function presignR2Url(
  configBrute: unknown,
  entree: PresignInput,
  date: Date = new Date(),
): string {
  const config = r2ConfigSchema.parse(configBrute);
  const input = presignInputSchema.parse(entree);

  const base = config.endpoint ?? `https://${config.accountId}.r2.cloudflarestorage.com`;
  const host = new URL(base).host;
  const chemin = `/${config.bucket}/${input.key}`;

  const horodatage = amzDate(date);
  const jour = horodatage.slice(0, 8);
  const portee = `${jour}/${config.region}/s3/aws4_request`;

  const query: Record<string, string> = {
    "X-Amz-Algorithm": "AWS4-HMAC-SHA256",
    "X-Amz-Credential": `${config.accessKeyId}/${portee}`,
    "X-Amz-Date": horodatage,
    "X-Amz-Expires": String(input.expiresInSeconds),
    "X-Amz-SignedHeaders": "host",
  };

  const signature = signerRequete({
    method: input.method,
    path: chemin,
    query,
    headers: { host },
    // Une requête présignée ne peut pas connaître d'avance le hachage du corps.
    payloadHash: "UNSIGNED-PAYLOAD",
    region: config.region,
    service: "s3",
    accessKeyId: config.accessKeyId,
    secretAccessKey: config.secretAccessKey,
    date,
  });

  return `${base}${canonicalUri(chemin)}?${canonicalQuery({ ...query, "X-Amz-Signature": signature })}`;
}

function signerRequete(input: Parameters<typeof canonicalRequest>[0]): string {
  const canonique = canonicalRequest(input);
  const aSigner = stringToSign(input, canonique.text);
  return createHmac("sha256", signingKey(input)).update(aSigner, "utf8").digest("hex");
}
