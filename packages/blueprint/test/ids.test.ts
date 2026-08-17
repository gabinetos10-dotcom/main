import { describe, expect, it } from "vitest";
import {
  DEFAULT_COLLECTION_SIMILARITY_THRESHOLD,
  computeContentHash,
  computeFieldId,
  computeFingerprint,
  duplicatedFieldId,
  fingerprintSimilarity,
  isDuplicatedId,
  normalizeText,
  splitFingerprint,
} from "../src/ids";

describe("computeFieldId", () => {
  it("est déterministe", () => {
    const a = computeFieldId("index.html", "body > main > h1");
    const b = computeFieldId("index.html", "body > main > h1");
    expect(a).toBe(b);
    expect(a).toMatch(/^fld_[0-9a-f]{10}$/u);
  });

  it("distingue deux pages au même chemin DOM", () => {
    expect(computeFieldId("index.html", "body > h1")).not.toBe(
      computeFieldId("contact.html", "body > h1"),
    );
  });

  it("change dès que le chemin DOM change — c'est précisément pourquoi il est persisté", () => {
    // Insérer une section en tête de page décale les `nth-of-type` en aval.
    // Si le `fieldId` était recalculé à la lecture, tout le contenu serait orphelin.
    const avant = computeFieldId("index.html", "body > section:nth-of-type(2) > h2");
    const apres = computeFieldId("index.html", "body > section:nth-of-type(3) > h2");
    expect(avant).not.toBe(apres);
  });
});

describe("duplicatedFieldId", () => {
  it("produit un identifiant préfixé, non dérivable d'un chemin DOM", () => {
    const id = duplicatedFieldId("fld_9f8e7d", "1");
    expect(id).toMatch(/^dup_[0-9a-f]{10}$/u);
    expect(isDuplicatedId(id)).toBe(true);
    expect(isDuplicatedId("fld_9f8e7d")).toBe(false);
  });

  it("sépare deux duplications du même champ source", () => {
    expect(duplicatedFieldId("fld_a", "1")).not.toBe(duplicatedFieldId("fld_a", "2"));
  });
});

describe("normalizeText / computeContentHash", () => {
  it("ignore les différences d'espacement", () => {
    expect(normalizeText("  Nos   services\n\t")).toBe("Nos services");
    expect(computeContentHash("Nos   services")).toBe(
      computeContentHash(" Nos services "),
    );
  });

  it("distingue deux contenus différents", () => {
    expect(computeContentHash("Nos services")).not.toBe(
      computeContentHash("Nos projets"),
    );
  });
});

describe("computeFingerprint", () => {
  it("ignore l'ordre d'écriture des classes", () => {
    const a = computeFingerprint({
      tagName: "article",
      classes: ["shadow", "card"],
      shapeHash: "h3+p+a",
    });
    const b = computeFingerprint({
      tagName: "article",
      classes: ["card", "shadow"],
      shapeHash: "h3+p+a",
    });
    expect(a).toBe(b);
  });

  it("se décompose en trois segments", () => {
    const fingerprint = computeFingerprint({
      tagName: "article",
      classes: ["card", "shadow"],
      shapeHash: "h3+p+a",
    });
    expect(splitFingerprint(fingerprint)).toEqual({
      tagName: "article",
      classes: ["card", "shadow"],
      shapeHash: "h3+p+a",
    });
  });

  it("gère un élément sans classe", () => {
    const fingerprint = computeFingerprint({
      tagName: "li",
      classes: [],
      shapeHash: "leaf",
    });
    expect(splitFingerprint(fingerprint)?.classes).toEqual([]);
  });
});

describe("fingerprintSimilarity", () => {
  const carteSimple = computeFingerprint({
    tagName: "article",
    classes: ["card", "shadow"],
    shapeHash: "h3+p+a",
  });

  it("vaut 1 pour deux empreintes identiques", () => {
    expect(fingerprintSimilarity(carteSimple, carteSimple)).toBe(1);
  });

  it("vaut 0 quand les balises diffèrent", () => {
    const autreBalise = computeFingerprint({
      tagName: "div",
      classes: ["card", "shadow"],
      shapeHash: "h3+p+a",
    });
    expect(fingerprintSimilarity(carteSimple, autreBalise)).toBe(0);
  });

  it("regroupe une carte portant un badge en plus — le cas qui casse l'égalité stricte", () => {
    // C'est le faux négatif le plus coûteux du produit : une grille de services
    // dont une carte porte « Populaire » ne formerait aucune collection si le
    // regroupement exigeait une empreinte identique (§9.3, risque 5).
    const carteAvecBadge = computeFingerprint({
      tagName: "article",
      classes: ["card", "shadow", "card--populaire"],
      shapeHash: "h3+p+a",
    });

    const score = fingerprintSimilarity(carteSimple, carteAvecBadge);
    expect(score).toBeGreaterThanOrEqual(DEFAULT_COLLECTION_SIMILARITY_THRESHOLD);
    expect(score).toBeLessThan(1);
  });

  it("ne regroupe pas deux composants réellement différents", () => {
    const temoignage = computeFingerprint({
      tagName: "article",
      classes: ["testimonial"],
      shapeHash: "blockquote+cite",
    });
    expect(fingerprintSimilarity(carteSimple, temoignage)).toBeLessThan(
      DEFAULT_COLLECTION_SIMILARITY_THRESHOLD,
    );
  });

  it("renvoie 0 sur une empreinte malformée", () => {
    expect(fingerprintSimilarity(carteSimple, "n'importe quoi")).toBe(0);
  });
});
