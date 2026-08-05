#!/usr/bin/env node
/**
 * Télécharge et auto-héberge les polices du back-office (ADR-012 : catalogue fermé).
 *
 * Les fichiers produits sont versionnés dans le dépôt : `next/font/local` exige des polices
 * connues à la compilation, et une requête vers un CDN tiers coûterait du CLS et un trou dans la
 * CSP. Ce script sert à ajouter ou mettre à jour une famille, pas à s'exécuter au build.
 *
 * Usage : pnpm fonts:fetch
 */
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const outputDir = join(here, '..', 'packages', 'ui', 'src', 'styles', 'fonts');

/** Navigateur moderne : sans cela, Google Fonts sert du woff1, deux fois plus lourd. */
const MODERN_BROWSER =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0 Safari/537.36';

/**
 * Les familles du back-office, direction « Atelier » (docs/DESIGN.md).
 * Toutes libres d'usage commercial : Fontshare (Indian Type Foundry) et OFL.
 */
const FAMILIES = [
  {
    file: 'cabinet-grotesk-500.woff2',
    css: 'https://api.fontshare.com/v2/css?f[]=cabinet-grotesk@500&display=swap',
  },
  {
    file: 'cabinet-grotesk-700.woff2',
    css: 'https://api.fontshare.com/v2/css?f[]=cabinet-grotesk@700&display=swap',
  },
  {
    file: 'switzer-400.woff2',
    css: 'https://api.fontshare.com/v2/css?f[]=switzer@400&display=swap',
  },
  {
    file: 'switzer-500.woff2',
    css: 'https://api.fontshare.com/v2/css?f[]=switzer@500&display=swap',
  },
  {
    file: 'switzer-600.woff2',
    css: 'https://api.fontshare.com/v2/css?f[]=switzer@600&display=swap',
  },
  {
    file: 'martian-mono-latin.woff2',
    css: 'https://fonts.googleapis.com/css2?family=Martian+Mono:wght@400..600&display=swap',
    /** Google découpe en sous-ensembles ; on ne garde que le latin de base. */
    subset: 'latin',
  },
];

/**
 * @param {string} css
 * @param {string | undefined} subset
 * @returns {string}
 */
function extractWoff2Url(css, subset) {
  const scope = subset ? sliceSubset(css, subset) : css;
  // Fontshare sert des URLs relatives au protocole et entre guillemets ; Google Fonts non.
  const match = /url\(\s*['"]?(?:https:)?(\/\/[^)'"\s]+\.woff2)['"]?\s*\)/.exec(scope);
  if (!match?.[1]) {
    throw new Error(`Aucune URL woff2 trouvée${subset ? ` pour le sous-ensemble ${subset}` : ''}.`);
  }
  return `https:${match[1]}`;
}

/**
 * Google Fonts précède chaque bloc @font-face d'un commentaire nommant le sous-ensemble.
 * On isole le dernier bloc portant exactement ce nom (les variantes s'appellent `latin-ext`).
 *
 * @param {string} css
 * @param {string} subset
 */
function sliceSubset(css, subset) {
  const blocks = css.split('/*').filter((block) => block.trimStart().startsWith(`${subset} */`));
  const block = blocks.at(-1);
  if (!block) {
    throw new Error(`Sous-ensemble « ${subset} » absent de la réponse.`);
  }
  return block;
}

async function main() {
  await mkdir(outputDir, { recursive: true });

  for (const family of FAMILIES) {
    const cssResponse = await fetch(family.css, { headers: { 'User-Agent': MODERN_BROWSER } });
    if (!cssResponse.ok) {
      throw new Error(`CSS indisponible (${cssResponse.status}) : ${family.css}`);
    }

    const fontUrl = extractWoff2Url(await cssResponse.text(), family.subset);
    const fontResponse = await fetch(fontUrl, { headers: { 'User-Agent': MODERN_BROWSER } });
    if (!fontResponse.ok) {
      throw new Error(`Police indisponible (${fontResponse.status}) : ${fontUrl}`);
    }

    const bytes = Buffer.from(await fontResponse.arrayBuffer());
    await writeFile(join(outputDir, family.file), bytes);
    console.log(`  ${family.file.padEnd(30)} ${(bytes.length / 1024).toFixed(1)} Ko`);
  }

  console.log(`\n${FAMILIES.length} fichiers écrits dans packages/ui/src/styles/fonts/.`);
}

main().catch((error) => {
  console.error('Téléchargement des polices interrompu :', error.message);
  process.exitCode = 1;
});
