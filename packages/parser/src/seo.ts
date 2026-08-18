import type { Seo } from "@calque/blueprint";
import { findAll, getAttr, tagName, textContent, normalized, type Element } from "./tree";

/** Extraction SEO par page (§9.5). Rien d'autre du `<head>` n'est éditable. */
export function extractSeo(html: Element | null, head: Element | null): Seo {
  const seo: Seo = { title: "", description: "" };
  if (html !== null) {
    const lang = getAttr(html, "lang");
    if (lang !== undefined && lang.length > 0) seo.lang = lang;
  }
  if (head === null) return seo;

  const titre = findAll(head, (element) => tagName(element) === "title")[0];
  if (titre !== undefined) seo.title = normalized(textContent(titre));

  for (const meta of findAll(head, (element) => tagName(element) === "meta")) {
    const nom = getAttr(meta, "name")?.toLowerCase();
    const propriete = getAttr(meta, "property")?.toLowerCase();
    const contenu = getAttr(meta, "content");
    if (contenu === undefined) continue;

    if (nom === "description") seo.description = contenu;
    if (propriete === "og:title") seo.ogTitle = contenu;
    if (propriete === "og:description") seo.ogDescription = contenu;
    if (propriete === "og:image") seo.ogImage = contenu;
  }

  for (const lien of findAll(head, (element) => tagName(element) === "link")) {
    const relations = (getAttr(lien, "rel") ?? "").toLowerCase().split(/\s+/u);
    const href = getAttr(lien, "href");
    if (href === undefined) continue;
    if (relations.includes("canonical")) seo.canonical = href;
    if (relations.includes("icon") || relations.includes("shortcut")) seo.favicon = href;
  }

  return seo;
}
