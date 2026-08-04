/**
 * Construit `standalone.html` : le jeu entier (Three.js, modules, CSS, HUD)
 * dans un unique fichier HTML, ouvrable directement en `file://`, sans serveur.
 *
 *   node tools/build-standalone.mjs
 *
 * esbuild n'est utilisé que pour cette étape ; le jeu lui-même n'a aucune
 * dépendance et se lance tel quel derrière un simple serveur HTTP.
 */
import { build } from 'esbuild';
import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

const bundle = await build({
  entryPoints: [join(root, 'src/main.js')],
  bundle: true,
  format: 'iife',
  target: 'es2020',
  legalComments: 'inline',   // conserve la licence MIT de Three.js
  write: false,
});
const js = bundle.outputFiles[0].text;

const css = await readFile(join(root, 'styles/style.css'), 'utf8');
const html = await readFile(join(root, 'index.html'), 'utf8');

// On récupère le contenu du <body> de la page d'origine, sans le <canvas>
// (réinséré en tête) ni la balise <script> qui chargeait les modules.
const body = html
  .slice(html.indexOf('<body>') + 6, html.indexOf('</body>'))
  .replace(/<script[\s\S]*?<\/script>/g, '')
  .trim();

const out = `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" />
<title>DERNIÈRE LUEUR — Survie 3D contre les zombies</title>
<style>
${css}
</style>
</head>
<body>
${body}
<script>
${js}
</script>
</body>
</html>
`;

const dest = join(root, 'standalone.html');
await writeFile(dest, out);
console.log(`standalone.html écrit (${(out.length / 1024 / 1024).toFixed(2)} Mo)`);

// `--fragment <chemin>` : même contenu, mais sans <html>/<head>/<body>, pour les
// hébergeurs qui fournissent eux-mêmes le squelette de la page.
const flag = process.argv.indexOf('--fragment');
if (flag !== -1 && process.argv[flag + 1]) {
  const fragment = `<title>DERNIÈRE LUEUR — Survie 3D contre les zombies</title>
<style>
${css}
</style>
${body}
<script>
${js}
</script>
`;
  await writeFile(process.argv[flag + 1], fragment);
  console.log(`fragment écrit : ${process.argv[flag + 1]}`);
}
