import { describe, expect, it } from "vitest";
import sharp from "sharp";
import { createMemoryStore, keys } from "@calque/storage";
import { LARGEURS, MediaError, hashOf, processImage, srcset } from "../src/index";

/**
 * Traitement des médias (§14).
 *
 * Les images de test sont fabriquées par sharp : un fichier binaire versionné
 * pour tester du traitement d'image serait opaque et impossible à ajuster.
 */

async function imageJpeg(largeur: number, hauteur: number): Promise<Uint8Array> {
  const octets = await sharp({
    create: {
      width: largeur,
      height: hauteur,
      channels: 3,
      background: { r: 200, g: 140, b: 80 },
    },
  })
    .jpeg({ quality: 80 })
    .toBuffer();
  return new Uint8Array(octets);
}

describe("processImage", () => {
  it("décline l'image en webp et avif sur les largeurs du §14", async () => {
    const store = createMemoryStore();
    const resultat = await processImage({
      content: await imageJpeg(1600, 900),
      mime: "image/jpeg",
      siteId: "site_1",
      store,
    });

    expect(resultat.variants.widths).toEqual([...LARGEURS]);
    expect(resultat.variants.formats).toEqual(["webp", "avif"]);

    for (const largeur of LARGEURS) {
      for (const format of ["webp", "avif"] as const) {
        const clef = resultat.variants.keys[`${format}/${largeur}`];
        expect(clef, `${format}/${largeur}`).toBeDefined();
        expect(await store.has(clef as string)).toBe(true);
      }
    }
  });

  /**
   * Agrandir produirait une variante plus lourde que l'original pour une image
   * plus floue.
   */
  it("n'agrandit jamais une image plus petite que les largeurs cibles", async () => {
    const store = createMemoryStore();
    const resultat = await processImage({
      content: await imageJpeg(300, 200),
      mime: "image/jpeg",
      siteId: "site_1",
      store,
    });

    expect(resultat.variants.widths).toEqual([300]);
    expect(resultat.width).toBe(300);
  });

  it("recadre au ratio du champ, depuis le centre", async () => {
    const store = createMemoryStore();
    const resultat = await processImage({
      content: await imageJpeg(1600, 1600),
      mime: "image/jpeg",
      siteId: "site_1",
      store,
      aspectRatio: "16/9",
    });

    expect(resultat.width).toBe(1600);
    expect(resultat.height).toBe(900);
  });

  it("applique un recadrage explicite plutôt que le ratio du champ", async () => {
    const store = createMemoryStore();
    const resultat = await processImage({
      content: await imageJpeg(1000, 1000),
      mime: "image/jpeg",
      siteId: "site_1",
      store,
      crop: { x: 100, y: 100, width: 400, height: 200 },
      aspectRatio: "1/1",
    });

    expect(resultat.width).toBe(400);
    expect(resultat.height).toBe(200);
  });

  /** Une agence redépose souvent le même logo : le hachage évite d'en garder dix. */
  it("range l'image sous son empreinte, à l'identique pour un même fichier", async () => {
    const store = createMemoryStore();
    const contenu = await imageJpeg(800, 600);

    const premier = await processImage({
      content: contenu,
      mime: "image/jpeg",
      siteId: "site_1",
      store,
    });
    const second = await processImage({
      content: contenu,
      mime: "image/jpeg",
      siteId: "site_1",
      store,
    });

    expect(premier.hash).toBe(second.hash);
    expect(premier.hash).toBe(hashOf(contenu));
    expect(premier.path).toBe(second.path);
  });

  it("garde un SVG tel quel, sans le rastériser", async () => {
    const store = createMemoryStore();
    const svg = new TextEncoder().encode(
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10"></svg>',
    );

    const resultat = await processImage({
      content: svg,
      mime: "image/svg+xml",
      siteId: "site_1",
      store,
    });

    expect(resultat.variants.widths).toEqual([]);
    expect(resultat.path.endsWith(".svg")).toBe(true);
    expect(await store.has(keys.media("site_1", resultat.hash, "origine.svg"))).toBe(
      true,
    );
  });

  it("refuse un type de fichier non pris en charge", async () => {
    const store = createMemoryStore();
    await expect(
      processImage({
        content: new TextEncoder().encode("%PDF-1.4"),
        mime: "application/pdf",
        siteId: "site_1",
        store,
      }),
    ).rejects.toThrow(MediaError);
  });

  it("refuse un fichier au-delà de dix mégaoctets", async () => {
    const store = createMemoryStore();
    await expect(
      processImage({
        content: new Uint8Array(11 * 1024 * 1024),
        mime: "image/jpeg",
        siteId: "site_1",
        store,
      }),
    ).rejects.toThrow(/10 Mo/u);
  });

  it("refuse un fichier qui prétend être une image sans en être une", async () => {
    const store = createMemoryStore();
    await expect(
      processImage({
        content: new TextEncoder().encode("ceci n'est pas une image"),
        mime: "image/jpeg",
        siteId: "site_1",
        store,
      }),
    ).rejects.toThrow(/image valide/u);
  });
});

describe("srcset", () => {
  it("écrit les largeurs disponibles, dans l'ordre", async () => {
    const store = createMemoryStore();
    const resultat = await processImage({
      content: await imageJpeg(1200, 800),
      mime: "image/jpeg",
      siteId: "site_1",
      store,
    });

    const attribut = srcset(resultat.variants, "webp", "https://cdn.calque.studio");
    expect(attribut).toContain("400w");
    expect(attribut).toContain("1200w");
    expect(attribut).not.toContain("1600w");
    expect(attribut.startsWith("https://cdn.calque.studio/")).toBe(true);
  });
});
