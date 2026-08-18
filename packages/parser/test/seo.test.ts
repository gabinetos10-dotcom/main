import { describe, expect, it } from "vitest";
import { extractSeo } from "../src/seo";
import { findFirst, parseHtml, tagName } from "../src/tree";

/** Extraction SEO par page (§9.5). Rien d'autre du `<head>` n'est éditable. */

function seoDe(head: string) {
  const document = parseHtml(
    `<!DOCTYPE html><html lang="fr"><head>${head}</head><body></body></html>`,
  );
  const html = findFirst(document, (element) => tagName(element) === "html");
  const tete = html === null ? null : findFirst(html, (e) => tagName(e) === "head");
  return extractSeo(html, tete);
}

describe("extractSeo", () => {
  it("lit le titre, la description, les balises Open Graph et le canonique", () => {
    const seo = seoDe(`
      <title>Menuiserie Rousseau — Annecy</title>
      <meta name="description" content="Atelier de menuiserie à Annecy.">
      <meta property="og:title" content="Menuiserie Rousseau">
      <meta property="og:description" content="Sur mesure en bois massif.">
      <meta property="og:image" content="assets/og.jpg">
      <link rel="canonical" href="https://menuiserie-rousseau.fr/">
      <link rel="icon" href="assets/logo.svg">
    `);

    expect(seo).toEqual({
      title: "Menuiserie Rousseau — Annecy",
      description: "Atelier de menuiserie à Annecy.",
      ogTitle: "Menuiserie Rousseau",
      ogDescription: "Sur mesure en bois massif.",
      ogImage: "assets/og.jpg",
      canonical: "https://menuiserie-rousseau.fr/",
      favicon: "assets/logo.svg",
      lang: "fr",
    });
  });

  it("renvoie des champs vides plutôt que de lever sur un head nu", () => {
    expect(seoDe("")).toEqual({ title: "", description: "", lang: "fr" });
  });
});
