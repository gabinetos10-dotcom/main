import { describe, expect, it } from "vitest";
import {
  BLUEPRINT_VERSION,
  blueprintSchema,
  contentDataSchema,
  emptyContent,
  fieldSchema,
  parseBlueprint,
  safeParseBlueprint,
} from "../src/index";

/** Le blueprint minimal de la spec §9.7, réduit à ce qui est obligatoire. */
function minimalBlueprint() {
  return {
    blueprintVersion: BLUEPRINT_VERSION,
    generatedAt: "2026-08-17T10:00:00Z",
    parserVersion: "0.0.0",
    site: { entry: "index.html", pageCount: 1 },
    pages: [
      {
        path: "index.html",
        label: "Accueil",
        blocks: [
          {
            id: "blk_hero",
            label: "Section Hero",
            domPath: "body > main:nth-of-type(1) > section:nth-of-type(1)",
            capabilities: ["hide", "reorder"],
            fields: [
              {
                id: "fld_9f8e7d",
                type: "text",
                label: "Titre principal",
                domPath: "body > main:nth-of-type(1) > section:nth-of-type(1) > h1",
                value: "Votre projet, notre savoir-faire",
                constraints: { maxLength: 70, multiline: false },
                meta: { fingerprint: "h1|hero-title|leaf", contentHash: "abc123" },
              },
            ],
          },
        ],
      },
    ],
  };
}

describe("blueprintSchema", () => {
  it("accepte le blueprint minimal et remplit les valeurs par défaut", () => {
    const blueprint = parseBlueprint(minimalBlueprint());

    expect(blueprint.site.adapter).toBe("static-html");
    expect(blueprint.theme).toEqual({ tokens: [], fonts: [] });
    expect(blueprint.globals).toEqual([]);
    expect(blueprint.locked).toEqual([]);
    expect(blueprint.warnings).toEqual([]);

    const page = blueprint.pages[0];
    expect(page).toBeDefined();
    expect(page?.virtual).toBe(false);
    expect(page?.blocks[0]?.collections).toEqual([]);
  });

  it("refuse un champ dont le type est inconnu", () => {
    const bad = minimalBlueprint();
    // Type inconnu injecté volontairement pour vérifier le rejet à la frontière.
    (bad.pages[0]!.blocks[0]!.fields[0] as { type: string }).type = "carrousel";

    expect(safeParseBlueprint(bad).success).toBe(false);
  });

  it("refuse une valeur qui ne correspond pas au type discriminant", () => {
    // Un champ `image` dont la valeur est une chaîne : c'est exactement l'erreur
    // qu'un parser bâclé produirait, elle doit être bloquée à la frontière.
    const result = fieldSchema.safeParse({
      id: "fld_x",
      type: "image",
      label: "Visuel",
      domPath: "body > img",
      value: "assets/hero.jpg",
      meta: { fingerprint: "img||leaf" },
    });

    expect(result.success).toBe(false);
  });

  it("normalise un champ image partiel", () => {
    const field = fieldSchema.parse({
      id: "fld_img",
      type: "image",
      label: "Visuel principal",
      domPath: "body > img:nth-of-type(1)",
      value: { src: "assets/hero.jpg" },
      meta: { fingerprint: "img||leaf" },
    });

    expect(field.type).toBe("image");
    if (field.type !== "image") throw new Error("type inattendu");
    expect(field.value.alt).toBe("");
    expect(field.constraints.maxBytes).toBe(10_000_000);
    expect(field.constraints.isBackground).toBe(false);
    expect(field.locked).toBe(false);
  });

  it("normalise un lien sans cible explicite", () => {
    const field = fieldSchema.parse({
      id: "fld_cta",
      type: "cta",
      label: "Bouton d'appel à l'action",
      domPath: "body > a:nth-of-type(1)",
      value: { label: "Demander un devis", href: "/contact.html" },
      meta: { fingerprint: "a|btn|leaf" },
    });

    if (field.type !== "cta") throw new Error("type inattendu");
    expect(field.value.target).toBe("_self");
  });

  it("survit à un aller-retour JSON", () => {
    const blueprint = parseBlueprint(minimalBlueprint());
    const roundTripped = blueprintSchema.parse(JSON.parse(JSON.stringify(blueprint)));
    expect(roundTripped).toEqual(blueprint);
  });
});

describe("contentDataSchema", () => {
  it("produit un calque vide exploitable", () => {
    const content = emptyContent();
    expect(content).toEqual({
      fields: {},
      collections: {},
      blocks: {},
      theme: {},
      seo: {},
      globals: {},
    });
  });

  it("normalise l'état d'une collection partiellement décrit", () => {
    const content = contentDataSchema.parse({
      collections: { col_services: { order: ["itm_001", "itm_002"] } },
    });

    const state = content.collections["col_services"];
    expect(state?.order).toEqual(["itm_001", "itm_002"]);
    expect(state?.added).toEqual({});
    expect(state?.removed).toEqual([]);
  });
});
