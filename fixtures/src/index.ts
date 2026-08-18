import { createHash } from "node:crypto";
import { readFile, readdir, stat } from "node:fs/promises";
import { dirname, extname, join, posix, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { parseExpected, type Expected } from "@calque/blueprint/expected";
import type { SourceFile, SourceFileKind, SourceSnapshot } from "@calque/blueprint";

/**
 * Chargement des fixtures sous la forme que le produit manipule réellement :
 * un `SourceSnapshot` (§24), pas un tas de chemins.
 *
 * P4 lira ce même type depuis un ZIP déposé et R2. Faire passer les tests du
 * parser par l'interface plutôt que par le disque évite d'écrire un parser qui
 * ne saurait analyser que des fichiers locaux.
 */

export const FIXTURES_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");

export const FIXTURE_NAMES = [
  "01-artisan-landing",
  "02-restaurant-multipage",
  "03-portfolio-onepage-gsap",
] as const;

export type FixtureName = (typeof FIXTURE_NAMES)[number];

export function fixtureRoot(name: FixtureName): string {
  return join(FIXTURES_ROOT, name);
}

const EXTENSIONS: Record<string, SourceFileKind> = {
  ".html": "page",
  ".htm": "page",
  ".css": "style",
  ".js": "script",
  ".mjs": "script",
  ".jpg": "asset",
  ".jpeg": "asset",
  ".png": "asset",
  ".gif": "asset",
  ".svg": "asset",
  ".webp": "asset",
  ".avif": "asset",
  ".ico": "asset",
  ".woff": "font",
  ".woff2": "font",
  ".ttf": "font",
  ".otf": "font",
};

/** Classement d'un fichier par extension (§8, inventaire). */
export function classifyFile(path: string): SourceFileKind {
  return EXTENSIONS[extname(path).toLowerCase()] ?? "autre";
}

/**
 * Page d'entrée : `index.html` à la racine, sinon la page la plus haute dans
 * l'arbre, à profondeur égale la première dans l'ordre alphabétique (§8).
 */
export function pickEntry(paths: readonly string[]): string {
  const pages = paths.filter((path) => classifyFile(path) === "page");
  if (pages.length === 0) throw new Error("Aucune page HTML dans le dépôt.");
  if (pages.includes("index.html")) return "index.html";

  const profondeur = (path: string): number => path.split("/").length;
  return [...pages].sort(
    (a, b) => profondeur(a) - profondeur(b) || a.localeCompare(b),
  )[0] as string;
}

async function listerFichiers(racine: string, dossier = racine): Promise<string[]> {
  const entrees = await readdir(dossier, { withFileTypes: true });
  const chemins: string[] = [];

  for (const entree of entrees) {
    const complet = join(dossier, entree.name);
    if (entree.isDirectory()) {
      chemins.push(...(await listerFichiers(racine, complet)));
    } else if (entree.name !== "expected.json") {
      chemins.push(relative(racine, complet).split(/[\\/]/u).join(posix.sep));
    }
  }

  return chemins.sort();
}

/**
 * Construit un `SourceSnapshot` depuis un dossier.
 *
 * Le contenu des pages, feuilles de style et scripts est chargé d'emblée : le
 * parser en a besoin de toute façon. Les binaires restent sur disque, lus à la
 * demande par `read()` — c'est la même stratégie qu'avec un stockage objet.
 */
export async function loadSnapshot(racine: string): Promise<SourceSnapshot> {
  const chemins = await listerFichiers(racine);
  const fichiers: SourceFile[] = [];

  for (const chemin of chemins) {
    const absolu = join(racine, chemin);
    const kind = classifyFile(chemin);
    const contenu = await readFile(absolu);
    const textuel = kind === "page" || kind === "style" || kind === "script";

    fichiers.push({
      path: chemin,
      kind,
      bytes: contenu.byteLength,
      sha256: createHash("sha256").update(contenu).digest("hex"),
      ...(textuel ? { content: new Uint8Array(contenu) } : {}),
    });
  }

  return {
    entry: pickEntry(chemins),
    files: fichiers,
    async read(path: string): Promise<Uint8Array> {
      const absolu = join(racine, path);
      await stat(absolu);
      return new Uint8Array(await readFile(absolu));
    },
  };
}

export function loadFixtureSnapshot(name: FixtureName): Promise<SourceSnapshot> {
  return loadSnapshot(fixtureRoot(name));
}

export async function loadExpected(name: FixtureName): Promise<Expected> {
  const brut = await readFile(join(fixtureRoot(name), "expected.json"), "utf8");
  return parseExpected(JSON.parse(brut));
}
