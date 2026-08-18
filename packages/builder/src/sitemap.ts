/**
 * `sitemap.xml` et `robots.txt` régénérés à la publication (§9.5, §15 étape 8).
 *
 * Seules les pages réelles y figurent : une page virtuelle est une ancre dans
 * une page existante, l'indexer deux fois nuirait au référencement.
 */

function joindre(base: string, chemin: string): string {
  const racine = base.replace(/\/+$/u, "");
  if (chemin === "index.html") return `${racine}/`;
  return `${racine}/${chemin}`;
}

function echapper(valeur: string): string {
  return valeur
    .replace(/&/gu, "&amp;")
    .replace(/</gu, "&lt;")
    .replace(/>/gu, "&gt;")
    .replace(/"/gu, "&quot;");
}

export function renderSitemap(siteUrl: string, chemins: readonly string[]): string {
  const urls = [...chemins]
    .sort((a, b) =>
      a === "index.html" ? -1 : b === "index.html" ? 1 : a.localeCompare(b),
    )
    .map(
      (chemin) =>
        `  <url>\n    <loc>${echapper(joindre(siteUrl, chemin))}</loc>\n  </url>`,
    )
    .join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`;
}

export function renderRobots(siteUrl: string): string {
  return `User-agent: *\nAllow: /\n\nSitemap: ${joindre(siteUrl, "sitemap.xml")}\n`;
}
