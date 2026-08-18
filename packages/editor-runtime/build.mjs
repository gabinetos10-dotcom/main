#!/usr/bin/env node
/**
 * Bundle IIFE du runtime d'édition (§4 : « bundlé esbuild en IIFE, budget < 40 kB gz »).
 *
 * Le budget est vérifié ici, pas surveillé de loin : dépasser fait échouer la
 * build. Un runtime qui grossit sans qu'on le remarque finit par coûter une
 * seconde de chargement à chaque ouverture de l'aperçu.
 */
import { gzipSync } from "node:zlib";
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { build } from "esbuild";

const RACINE = dirname(fileURLToPath(import.meta.url));
const SORTIE = join(RACINE, "dist", "editor-runtime.js");
const BUDGET_GZ = 40 * 1024;

const resultat = await build({
  entryPoints: [join(RACINE, "src", "index.ts")],
  bundle: true,
  format: "iife",
  platform: "browser",
  target: ["chrome111", "firefox115", "safari16"],
  minify: true,
  legalComments: "none",
  write: false,
  define: { "process.env.NODE_ENV": '"production"' },
});

const fichier = resultat.outputFiles[0];
if (fichier === undefined) throw new Error("esbuild n'a produit aucun fichier.");

const gz = gzipSync(fichier.contents, { level: 9 });
const kb = (n) => `${(n / 1024).toFixed(1)} kB`;

await mkdir(dirname(SORTIE), { recursive: true });
await writeFile(SORTIE, fichier.contents);

console.log(
  `  editor-runtime.js — ${kb(fichier.contents.byteLength)} brut, ${kb(gz.byteLength)} gzip`,
);

if (gz.byteLength > BUDGET_GZ) {
  console.error(
    `\n✗ Budget dépassé : ${kb(gz.byteLength)} gzip pour un plafond de ${kb(BUDGET_GZ)} (§4).`,
  );
  process.exitCode = 1;
} else {
  console.log(`✓ Sous le budget de ${kb(BUDGET_GZ)} gzip.`);
}
