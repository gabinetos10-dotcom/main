#!/usr/bin/env node
/**
 * Génère les images des fixtures.
 *
 * Pourquoi générer plutôt qu'utiliser des photographies : aucune question de
 * droits, poids maîtrisé, et surtout des dimensions et des ratios choisis pour
 * exercer précisément ce que le produit doit savoir faire — recadrage au ratio
 * du champ (§14), `srcset` en 400/800/1200/1600, détection des `width`/`height`.
 *
 * Le rendu est déterministe : régénérer produit exactement les mêmes fichiers.
 *
 *   node fixtures/tools/generate-assets.mjs
 */
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const RACINE = resolve(dirname(fileURLToPath(import.meta.url)), "..");

/** Générateur pseudo-aléatoire déterministe (mulberry32). */
function graine(valeur) {
  let a = valeur >>> 0;
  return () => {
    a += 0x6d2b79f5;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Compose une image « photographique » : dégradé de fond, formes douces, grain.
 * L'objectif n'est pas de tromper l'œil mais d'occuper la place d'une vraie
 * photo, avec le bon ratio et une densité de couleur crédible.
 */
function svgAbstrait({ largeur, hauteur, palette, seed, formes = 7 }) {
  const rnd = graine(seed);
  const [fond1, fond2, ...accents] = palette;

  const blobs = Array.from({ length: formes }, (_, i) => {
    const cx = Math.round(rnd() * largeur);
    const cy = Math.round(rnd() * hauteur);
    const rx = Math.round((0.18 + rnd() * 0.4) * largeur);
    const ry = Math.round((0.18 + rnd() * 0.4) * hauteur);
    const couleur = accents[i % accents.length];
    const opacite = (0.18 + rnd() * 0.3).toFixed(2);
    const rotation = Math.round(rnd() * 180);
    return `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="${couleur}" opacity="${opacite}" transform="rotate(${rotation} ${cx} ${cy})"/>`;
  }).join("");

  return Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${largeur}" height="${hauteur}">
  <defs>
    <linearGradient id="f" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="${fond1}"/>
      <stop offset="1" stop-color="${fond2}"/>
    </linearGradient>
    <filter id="flou"><feGaussianBlur stdDeviation="${Math.round(largeur / 22)}"/></filter>
  </defs>
  <rect width="${largeur}" height="${hauteur}" fill="url(#f)"/>
  <g filter="url(#flou)">${blobs}</g>
</svg>`);
}

/** Grain : sans lui les dégradés ont l'air d'un fond CSS, pas d'une photo. */
async function grain(largeur, hauteur, seed) {
  const rnd = graine(seed + 9999);
  const pixels = Buffer.alloc(largeur * hauteur);
  for (let i = 0; i < pixels.length; i += 1) {
    pixels[i] = 118 + Math.round(rnd() * 20);
  }
  return sharp(pixels, { raw: { width: largeur, height: hauteur, channels: 1 } })
    .toColourspace("b-w")
    .png()
    .toBuffer();
}

async function image(chemin, { largeur, hauteur, palette, seed, formes }) {
  const destination = join(RACINE, chemin);
  await mkdir(dirname(destination), { recursive: true });

  const bruit = await grain(largeur, hauteur, seed);
  const buffer = await sharp(svgAbstrait({ largeur, hauteur, palette, seed, formes }))
    .composite([{ input: bruit, blend: "soft-light" }])
    .jpeg({ quality: 76, chromaSubsampling: "4:2:0", mozjpeg: true })
    .toBuffer();

  await writeFile(destination, buffer);
  return `${chemin} — ${largeur}×${hauteur}, ${(buffer.length / 1024).toFixed(0)} Ko`;
}

async function svg(chemin, contenu) {
  const destination = join(RACINE, chemin);
  await mkdir(dirname(destination), { recursive: true });
  await writeFile(destination, contenu, "utf8");
  return `${chemin} — SVG`;
}

/* ── Palettes ──────────────────────────────────────────────────────────────── */

const BOIS = ["#3b2a1d", "#7a5433", "#c08b52", "#e0c39a", "#8a6a45"];
const TABLE = ["#2a1f1c", "#6d3b2c", "#c25b3a", "#e8b98a", "#8f4a33"];
const ARGENT = ["#1b1f24", "#3a444f", "#7b8794", "#c2cad3", "#55606d"];

/* ── Déclaration des images ────────────────────────────────────────────────── */

const IMAGES = [
  // 01 — Menuiserie Rousseau
  ["01-artisan-landing/assets/hero.jpg", 1600, 900, BOIS, 101],
  ["01-artisan-landing/assets/atelier.jpg", 800, 600, BOIS, 102],
  ["01-artisan-landing/assets/cuisine.jpg", 800, 600, BOIS, 103],
  ["01-artisan-landing/assets/escalier.jpg", 800, 600, BOIS, 104],
  ["01-artisan-landing/assets/equipe.jpg", 1200, 800, BOIS, 105],
  ["01-artisan-landing/assets/og.jpg", 1200, 630, BOIS, 106],

  // 02 — Le Comptoir des Halles
  ["02-restaurant-multipage/assets/hero.jpg", 1600, 900, TABLE, 201],
  ["02-restaurant-multipage/assets/salle.jpg", 1200, 800, TABLE, 202],
  ["02-restaurant-multipage/assets/chef.jpg", 800, 1000, TABLE, 203],
  ["02-restaurant-multipage/assets/plat-1.jpg", 800, 800, TABLE, 204],
  ["02-restaurant-multipage/assets/plat-2.jpg", 800, 800, TABLE, 205],
  ["02-restaurant-multipage/assets/plat-3.jpg", 800, 800, TABLE, 206],
  ["02-restaurant-multipage/assets/plat-4.jpg", 800, 800, TABLE, 207],
  ["02-restaurant-multipage/assets/galerie-1.jpg", 1200, 900, TABLE, 208],
  ["02-restaurant-multipage/assets/galerie-2.jpg", 1200, 900, TABLE, 209],
  ["02-restaurant-multipage/assets/galerie-3.jpg", 1200, 900, TABLE, 210],
  ["02-restaurant-multipage/assets/og.jpg", 1200, 630, TABLE, 211],

  // 03 — Camille Ferrand, photographe
  ["03-portfolio-onepage-gsap/assets/cover.jpg", 1600, 1000, ARGENT, 301],
  ["03-portfolio-onepage-gsap/assets/shot-1.jpg", 1200, 900, ARGENT, 302],
  ["03-portfolio-onepage-gsap/assets/shot-2.jpg", 900, 1200, ARGENT, 303],
  ["03-portfolio-onepage-gsap/assets/shot-3.jpg", 1200, 900, ARGENT, 304],
  ["03-portfolio-onepage-gsap/assets/shot-4.jpg", 900, 1200, ARGENT, 305],
  ["03-portfolio-onepage-gsap/assets/shot-5.jpg", 1200, 900, ARGENT, 306],
  ["03-portfolio-onepage-gsap/assets/shot-6.jpg", 1200, 900, ARGENT, 307],
  ["03-portfolio-onepage-gsap/assets/portrait.jpg", 800, 1000, ARGENT, 308],
];

const LOGO_MENUISERIE = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" width="48" height="48" role="img" aria-label="Menuiserie Rousseau">
  <rect width="48" height="48" rx="8" fill="#3b2a1d"/>
  <path d="M12 34 L24 14 L36 34 Z" fill="none" stroke="#c08b52" stroke-width="3" stroke-linejoin="round"/>
  <path d="M18 34 H30" stroke="#e0c39a" stroke-width="3" stroke-linecap="round"/>
</svg>
`;

const FAVICON_RESTAURANT = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" width="32" height="32">
  <rect width="32" height="32" rx="6" fill="#6d3b2c"/>
  <path d="M11 8 v7 a3 3 0 0 0 6 0 V8" stroke="#e8b98a" stroke-width="2" fill="none" stroke-linecap="round"/>
  <path d="M14 15 v9" stroke="#e8b98a" stroke-width="2" stroke-linecap="round"/>
  <path d="M22 8 c2 2 2 6 0 8 v8" stroke="#e8b98a" stroke-width="2" fill="none" stroke-linecap="round"/>
</svg>
`;

const LOGO_PORTFOLIO = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 40" width="40" height="40" role="img" aria-label="Camille Ferrand">
  <circle cx="20" cy="20" r="18" fill="none" stroke="#c2cad3" stroke-width="1.5"/>
  <circle cx="20" cy="20" r="8" fill="none" stroke="#c2cad3" stroke-width="1.5"/>
  <circle cx="20" cy="20" r="2.5" fill="#c2cad3"/>
</svg>
`;

async function main() {
  const journal = [];

  for (const [chemin, largeur, hauteur, palette, seed] of IMAGES) {
    journal.push(await image(chemin, { largeur, hauteur, palette, seed }));
  }

  journal.push(await svg("01-artisan-landing/assets/logo.svg", LOGO_MENUISERIE));
  journal.push(
    await svg("02-restaurant-multipage/assets/favicon.svg", FAVICON_RESTAURANT),
  );
  journal.push(await svg("03-portfolio-onepage-gsap/assets/logo.svg", LOGO_PORTFOLIO));

  for (const ligne of journal) console.log(`  ${ligne}`);
  console.log(`\n✓ ${journal.length} fichiers générés.`);
}

main().catch((erreur) => {
  console.error("✗ Génération échouée :", erreur);
  process.exitCode = 1;
});
