import { readFile, readdir, stat } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import * as cheerio from "cheerio";
import { describe, expect, it } from "vitest";
import { parseExpected, recallWeight, type Expected } from "@calque/blueprint/expected";

/**
 * Ces tests ne valident pas le parser — il n'existe pas encore. Ils valident la
 * **vérité terrain** : que chaque `expected.json` décrit un site qui existe
 * réellement, avec des sélecteurs qui désignent réellement quelque chose.
 *
 * Sans cela, P2 mesurerait un rappel contre des attentes fantômes : un sélecteur
 * mal écrit ferait échouer le parser pour une faute de frappe dans la fixture.
 */

const RACINE = dirname(fileURLToPath(import.meta.url));

const FIXTURES = [
  "01-artisan-landing",
  "02-restaurant-multipage",
  "03-portfolio-onepage-gsap",
] as const;

async function chargerAttendu(fixture: string): Promise<Expected> {
  const brut = await readFile(join(RACINE, fixture, "expected.json"), "utf8");
  return parseExpected(JSON.parse(brut));
}

async function chargerPage(fixture: string, chemin: string): Promise<cheerio.CheerioAPI> {
  const html = await readFile(join(RACINE, fixture, chemin), "utf8");
  return cheerio.load(html);
}

async function existe(chemin: string): Promise<boolean> {
  try {
    await stat(chemin);
    return true;
  } catch {
    return false;
  }
}

describe.each(FIXTURES)("fixture %s", (fixture) => {
  it("expose un expected.json conforme au schéma", async () => {
    const attendu = await chargerAttendu(fixture);
    expect(attendu.fixture).toBe(fixture);
    expect(attendu.pages.length).toBeGreaterThan(0);
    expect(attendu.exercises.length).toBeGreaterThan(0);
  });

  it("déclare une page d'entrée qui existe", async () => {
    const attendu = await chargerAttendu(fixture);
    expect(await existe(join(RACINE, fixture, attendu.entry))).toBe(true);
    expect(attendu.pages.some((page) => page.path === attendu.entry)).toBe(true);
  });

  it("décrit chaque page HTML du site, sans en oublier", async () => {
    const attendu = await chargerAttendu(fixture);
    const fichiers = await readdir(join(RACINE, fixture));
    const pagesReelles = fichiers.filter((nom) => nom.endsWith(".html")).sort();
    const pagesDecrites = attendu.pages.map((page) => page.path).sort();
    expect(pagesDecrites).toEqual(pagesReelles);
  });

  it("n'écrit que des sélecteurs qui désignent au moins un élément", async () => {
    const attendu = await chargerAttendu(fixture);
    const orphelins: string[] = [];

    for (const page of attendu.pages) {
      const $ = await chargerPage(fixture, page.path);

      for (const champ of page.fields) {
        if ($(champ.selector).length === 0) {
          orphelins.push(`${page.path} · champ · ${champ.selector}`);
        }
      }
      for (const collection of page.collections) {
        if ($(collection.containerSelector).length === 0) {
          orphelins.push(`${page.path} · collection · ${collection.containerSelector}`);
        }
      }
      for (const verrou of page.mustBeLocked) {
        if ($(verrou.selector).length === 0) {
          orphelins.push(`${page.path} · verrou · ${verrou.selector}`);
        }
      }
    }

    expect(
      orphelins,
      `sélecteurs sans correspondance :\n  ${orphelins.join("\n  ")}`,
    ).toEqual([]);
  });

  it("désigne un champ à la fois, jamais un groupe déguisé", async () => {
    // Un sélecteur de champ qui désigne plusieurs éléments est presque toujours
    // une collection mal identifiée. Les verrous, eux, s'entendent au pluriel.
    const attendu = await chargerAttendu(fixture);
    const ambigus: string[] = [];

    for (const page of attendu.pages) {
      const $ = await chargerPage(fixture, page.path);
      for (const champ of page.fields) {
        const trouves = $(champ.selector).length;
        // Les champs de contact et de réseaux sociaux sont volontairement
        // répétés : c'est ce qui en fait des champs globaux (§9.2).
        const global = champ.type === "contact" || champ.type === "social";
        if (trouves > 1 && !global) {
          ambigus.push(`${page.path} · ${champ.selector} → ${trouves} éléments`);
        }
      }
    }

    expect(ambigus, `sélecteurs ambigus :\n  ${ambigus.join("\n  ")}`).toEqual([]);
  });

  it("annonce des collections qui contiennent bien assez d'items", async () => {
    const attendu = await chargerAttendu(fixture);
    const insuffisantes: string[] = [];

    for (const page of attendu.pages) {
      const $ = await chargerPage(fixture, page.path);
      for (const collection of page.collections) {
        const enfants = $(collection.containerSelector).children().length;
        if (enfants < collection.minItems) {
          insuffisantes.push(
            `${page.path} · ${collection.containerSelector} → ${enfants} enfants, ${collection.minItems} attendus`,
          );
        }
      }
    }

    expect(insuffisantes, insuffisantes.join("\n  ")).toEqual([]);
  });

  it("référence des images qui existent sur le disque", async () => {
    const attendu = await chargerAttendu(fixture);
    const manquantes: string[] = [];

    for (const page of attendu.pages) {
      const $ = await chargerPage(fixture, page.path);

      const chemins = new Set<string>();
      $("img[src]").each((_, element) => {
        const src = $(element).attr("src");
        if (src && !src.startsWith("http") && !src.startsWith("data:")) chemins.add(src);
      });
      $("[style*='background-image']").each((_, element) => {
        const style = $(element).attr("style") ?? "";
        const trouve = /url\(['"]?([^'")]+)['"]?\)/u.exec(style);
        if (trouve?.[1] && !trouve[1].startsWith("http")) chemins.add(trouve[1]);
      });

      for (const chemin of chemins) {
        if (!(await existe(join(RACINE, fixture, chemin)))) {
          manquantes.push(`${page.path} → ${chemin}`);
        }
      }
    }

    expect(manquantes, `images manquantes :\n  ${manquantes.join("\n  ")}`).toEqual([]);
  });

  it("porte assez de champs pour que le seuil de 90 % ait un sens", async () => {
    // Un rappel de 90 % sur cinq champs se joue à un demi-champ près : le critère
    // du §9.3 n'aurait aucun pouvoir discriminant.
    const attendu = await chargerAttendu(fixture);
    expect(recallWeight(attendu)).toBeGreaterThanOrEqual(30);
  });
});

describe("couverture d'ensemble", () => {
  it("met à l'épreuve tous les cas durs annoncés au §8 et au §11", async () => {
    const attendus = await Promise.all(FIXTURES.map(chargerAttendu));
    const avertissements = new Set(attendus.flatMap((a) => a.expectedWarnings));

    for (const code of [
      "DYNAMIC_TEXT",
      "ANIM_LIB_DETECTED",
      "TEXT_SPLITTER_DETECTED",
      "SHADOW_DOM_DETECTED",
      "NO_CSS_VARIABLES",
      "TAILWIND_CDN",
    ] as const) {
      expect(avertissements, `cas dur non couvert : ${code}`).toContain(code);
    }
  });

  it("contient au moins une collection hétérogène et une homogène", async () => {
    const attendus = await Promise.all(FIXTURES.map(chargerAttendu));
    const collections = attendus.flatMap((a) => a.pages.flatMap((p) => p.collections));

    expect(collections.some((c) => c.heterogeneous)).toBe(true);
    expect(collections.some((c) => !c.heterogeneous)).toBe(true);
  });

  it("couvre au moins un site avec variables CSS et un sans", async () => {
    const attendus = await Promise.all(FIXTURES.map(chargerAttendu));
    expect(attendus.some((a) => a.themeTokens.length > 0)).toBe(true);
    expect(attendus.some((a) => a.themeTokens.length === 0)).toBe(true);
  });

  it("couvre le mono-page et le multi-pages", async () => {
    const attendus = await Promise.all(FIXTURES.map(chargerAttendu));
    expect(attendus.some((a) => a.pages.length === 1)).toBe(true);
    expect(attendus.some((a) => a.pages.length > 1)).toBe(true);
  });
});

describe("inventaire", () => {
  it("récapitule le poids de rappel de chaque fixture", async () => {
    const lignes: string[] = [];
    for (const fixture of FIXTURES) {
      const attendu = await chargerAttendu(fixture);
      const champs = attendu.pages.reduce((total, p) => total + p.fields.length, 0);
      const collections = attendu.pages.reduce(
        (total, p) => total + p.collections.length,
        0,
      );
      const verrous = attendu.pages.reduce(
        (total, p) => total + p.mustBeLocked.length,
        0,
      );
      lignes.push(
        `${fixture.padEnd(28)} ${String(attendu.pages.length).padStart(2)} page(s) · ` +
          `${String(champs).padStart(3)} champs · ${collections} collections · ` +
          `${verrous} verrous · poids de rappel ${recallWeight(attendu)}`,
      );
    }
    console.log(`\n${lignes.join("\n")}\n`);
    expect(lignes).toHaveLength(FIXTURES.length);
  });
});
