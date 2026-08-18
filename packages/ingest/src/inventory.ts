import type { SourceFileKind } from "@calque/blueprint";

/** Classement des fichiers d'un dépôt (§8.2). */

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
  ".mp4": "asset",
  ".webm": "asset",
  ".pdf": "asset",
  ".woff": "font",
  ".woff2": "font",
  ".ttf": "font",
  ".otf": "font",
  ".eot": "font",
};

export function classifyFile(chemin: string): SourceFileKind {
  const nom = chemin.split("/").pop() ?? "";
  const point = nom.lastIndexOf(".");
  const extension = point === -1 ? "" : nom.slice(point).toLowerCase();
  return EXTENSIONS[extension] ?? "autre";
}

/**
 * Page d'entrée : `index.html` à la racine, sinon la page la plus haute dans
 * l'arbre ; à profondeur égale, la première dans l'ordre alphabétique (§8.2).
 *
 * Le tri alphabétique n'est pas cosmétique : sans lui, l'entrée dépendrait de
 * l'ordre des fichiers dans l'archive, donc du système qui l'a produite.
 */
export function pickEntry(chemins: readonly string[]): string | null {
  const pages = chemins.filter((chemin) => classifyFile(chemin) === "page");
  if (pages.length === 0) return null;
  if (pages.includes("index.html")) return "index.html";

  const profondeur = (chemin: string): number => chemin.split("/").length;
  return (
    [...pages].sort((a, b) => profondeur(a) - profondeur(b) || a.localeCompare(b))[0] ??
    null
  );
}

/**
 * Retire le dossier racine commun.
 *
 * Une archive faite depuis le Finder ou l'Explorateur enveloppe tout dans un
 * dossier au nom du projet. Sans ce dépliage, l'entrée serait
 * `mon-site-v2-final/index.html` et tous les chemins relatifs du site
 * resteraient corrects — mais les URL publiées porteraient ce dossier.
 */
export function stripCommonRoot(chemins: readonly string[]): {
  prefix: string;
  paths: string[];
} {
  if (chemins.length === 0) return { prefix: "", paths: [] };

  const premiers = new Set(chemins.map((chemin) => chemin.split("/")[0] ?? ""));
  if (premiers.size !== 1) return { prefix: "", paths: [...chemins] };

  const racine = [...premiers][0] as string;
  if (chemins.some((chemin) => chemin === racine || !chemin.includes("/"))) {
    return { prefix: "", paths: [...chemins] };
  }

  return {
    prefix: `${racine}/`,
    paths: chemins.map((chemin) => chemin.slice(racine.length + 1)),
  };
}
