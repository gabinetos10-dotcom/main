import { describe, expect, it } from "vitest";
import {
  amzDate,
  canonicalQuery,
  canonicalRequest,
  canonicalUri,
  encodeRfc3986,
  parseListing,
  sha256Hex,
  stringToSign,
} from "../src/index";

/**
 * Signature SigV4 (§3, R2 par son API S3-compatible).
 *
 * ⚠️ Ces tests couvrent la canonisation — la partie où une erreur produit une
 * signature valide mais fausse, donc un refus incompréhensible. Le dialogue HTTP
 * avec un bucket réel n'est pas exercé : aucune clé R2 n'existe dans ce dépôt.
 */

const BASE = {
  method: "PUT",
  path: "/mon-bucket/sites/s1/index.html",
  headers: {
    host: "compte.r2.cloudflarestorage.com",
    "x-amz-date": "20260818T120000Z",
    "x-amz-content-sha256": "abc",
  },
  payloadHash: "abc",
  region: "auto",
  service: "s3",
  accessKeyId: "AKIA",
  secretAccessKey: "secret",
  date: new Date("2026-08-18T12:00:00.000Z"),
} as const;

describe("encodage", () => {
  it("encode selon RFC 3986, pas selon encodeURIComponent", () => {
    // Ces cinq caractères, qu'`encodeURIComponent` laisse passer, suffisent à
    // faire échouer toutes les signatures d'un bucket dont une clé en contient.
    expect(encodeRfc3986("a!'()*b")).toBe("a%21%27%28%29%2Ab");
    expect(encodeRfc3986("é")).toBe("%C3%A9");
  });

  it("garde les séparateurs de chemin et encode le reste", () => {
    expect(canonicalUri("/bucket/mon dossier/photo(1).jpg")).toBe(
      "/bucket/mon%20dossier/photo%281%29.jpg",
    );
  });

  it("trie les paramètres de requête par nom", () => {
    expect(canonicalQuery({ prefix: "a/b", "list-type": "2" })).toBe(
      "list-type=2&prefix=a%2Fb",
    );
  });
});

describe("horodatage", () => {
  it("écrit la date au format attendu par AWS", () => {
    expect(amzDate(new Date("2026-08-18T09:41:07.123Z"))).toBe("20260818T094107Z");
  });
});

describe("requête canonique", () => {
  it("compose les six lignes dans l'ordre imposé", () => {
    const canonique = canonicalRequest(BASE);
    expect(canonique.text.split("\n")).toEqual([
      "PUT",
      "/mon-bucket/sites/s1/index.html",
      "",
      "host:compte.r2.cloudflarestorage.com",
      "x-amz-content-sha256:abc",
      "x-amz-date:20260818T120000Z",
      "",
      "host;x-amz-content-sha256;x-amz-date",
      "abc",
    ]);
    expect(canonique.signedHeaders).toBe("host;x-amz-content-sha256;x-amz-date");
  });

  it("trie les en-têtes et compacte leurs espaces", () => {
    const canonique = canonicalRequest({
      ...BASE,
      headers: { "z-dernier": "  deux   espaces ", host: "h", "a-premier": "1" },
    });
    expect(canonique.signedHeaders).toBe("a-premier;host;z-dernier");
    expect(canonique.text).toContain("z-dernier:deux espaces\n");
  });

  it("compose la chaîne à signer avec la portée du jour", () => {
    const canonique = canonicalRequest(BASE);
    expect(stringToSign(BASE, canonique.text).split("\n")).toEqual([
      "AWS4-HMAC-SHA256",
      "20260818T120000Z",
      "20260818/auto/s3/aws4_request",
      sha256Hex(canonique.text),
    ]);
  });
});

describe("lecture du listing S3", () => {
  it("extrait les clés et les tailles", () => {
    const xml = `<?xml version="1.0"?><ListBucketResult>
      <Contents><Key>sites/s1/a.html</Key><Size>128</Size></Contents>
      <Contents><Key>sites/s1/b&amp;c.css</Key><Size>64</Size></Contents>
    </ListBucketResult>`;

    expect(parseListing(xml)).toEqual([
      { key: "sites/s1/a.html", size: 128 },
      { key: "sites/s1/b&c.css", size: 64 },
    ]);
  });

  it("renvoie une liste vide sur un bucket vide", () => {
    expect(parseListing("<ListBucketResult></ListBucketResult>")).toEqual([]);
  });
});
