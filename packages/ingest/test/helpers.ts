import { readFile, readdir } from "node:fs/promises";
import { join, relative } from "node:path";
import { zipSync } from "fflate";
import { FIXTURES_ROOT, type FixtureName } from "@calque/fixtures";

/** Fabrique une archive à partir d'un dossier de fixture, comme le ferait une agence. */
export async function zipFixture(
  nom: FixtureName,
  options: { prefix?: string; extra?: Record<string, Uint8Array> } = {},
): Promise<Uint8Array> {
  const racine = join(FIXTURES_ROOT, nom);
  const entrees: Record<string, Uint8Array> = {};

  const parcourir = async (dossier: string): Promise<void> => {
    for (const entree of await readdir(dossier, { withFileTypes: true })) {
      const complet = join(dossier, entree.name);
      if (entree.isDirectory()) {
        await parcourir(complet);
        continue;
      }
      if (entree.name === "expected.json") continue;
      const chemin = relative(racine, complet).split(/[\\/]/u).join("/");
      entrees[`${options.prefix ?? ""}${chemin}`] = new Uint8Array(
        await readFile(complet),
      );
    }
  };

  await parcourir(racine);
  for (const [chemin, contenu] of Object.entries(options.extra ?? {})) {
    entrees[chemin] = contenu;
  }

  return zipSync(entrees, { level: 6 });
}

export function zipOf(entrees: Record<string, string | Uint8Array>): Uint8Array {
  const encodeur = new TextEncoder();
  const preparees: Record<string, Uint8Array> = {};
  for (const [chemin, contenu] of Object.entries(entrees)) {
    preparees[chemin] = typeof contenu === "string" ? encodeur.encode(contenu) : contenu;
  }
  return zipSync(preparees, { level: 6 });
}
