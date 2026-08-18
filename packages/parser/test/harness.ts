import { readFile } from "node:fs/promises";
import { join } from "node:path";
import * as cheerio from "cheerio";
import type { AnyNode, Element as DomElement } from "domhandler";
import type { Blueprint, FieldType } from "@calque/blueprint";
import {
  FIXTURE_NAMES,
  fixtureRoot,
  loadExpected,
  loadFixtureSnapshot,
  type FixtureName,
} from "@calque/fixtures";
import { analyze } from "../src/index";
import { computeDomPath, type DomPathTree } from "../src/dom-path";

/**
 * Banc de mesure du critère du §9.3 : ≥ 90 % de rappel, zéro faux positif
 * destructeur.
 *
 * `expected.json` désigne les éléments par sélecteur CSS ; le blueprint les
 * désigne par `domPath`. Le pont est cheerio — un vrai moteur de sélecteurs —
 * suivi du **même** calcul de `domPath` que celui du parser, par l'accesseur
 * générique de `dom-path.ts`. Deux implémentations divergeraient en silence et
 * la mesure deviendrait fausse sans que rien n'échoue.
 */

const EPOCH = new Date("2026-01-01T00:00:00.000Z");

const FORMES_DE_VALEUR: ReadonlyArray<ReadonlySet<FieldType>> = [
  new Set<FieldType>(["text", "richtext", "contact"]),
  new Set<FieldType>(["link", "cta"]),
];

function memeFormeDeValeur(a: FieldType, b: FieldType): boolean {
  return FORMES_DE_VALEUR.some((famille) => famille.has(a) && famille.has(b));
}

export const cheerioTree: DomPathTree<AnyNode> = {
  tagName: (noeud) =>
    noeud.type === "tag" ? (noeud as DomElement).name.toLowerCase() : null,
  parentOf: (noeud) => noeud.parent ?? null,
  childrenOf: (noeud) => ("children" in noeud ? (noeud.children as AnyNode[]) : []),
};

export interface Editable {
  type: FieldType;
  /** Vrai quand le champ apparaît dans l'arbre mais reste non modifiable. */
  locked: boolean;
  origine: "champ" | "item";
}

/** Tous les éléments éditables d'une page, indexés par `domPath`. */
export function editablesDeLaPage(
  blueprint: Blueprint,
  chemin: string,
): Map<string, Editable> {
  const index = new Map<string, Editable>();
  const page = blueprint.pages.find((candidate) => candidate.path === chemin);
  if (page === undefined) return index;

  for (const bloc of page.blocks) {
    for (const champ of bloc.fields) {
      index.set(champ.domPath, {
        type: champ.type,
        locked: champ.locked,
        origine: "champ",
      });
    }

    for (const collection of bloc.collections) {
      const types = new Map(
        collection.itemTemplate.fields.map((champ) => [champ.key, champ.type]),
      );
      for (const item of collection.items) {
        for (const [clef, localisation] of Object.entries(item.valueMeta)) {
          index.set(localisation.domPath, {
            type: types.get(clef) ?? "text",
            locked: collection.locked,
            origine: "item",
          });
        }
      }
    }
  }

  return index;
}

export function conteneursDeCollection(
  blueprint: Blueprint,
  chemin: string,
): Map<string, { label: string; items: number; types: FieldType[]; locked: boolean }> {
  const index = new Map<
    string,
    { label: string; items: number; types: FieldType[]; locked: boolean }
  >();
  const page = blueprint.pages.find((candidate) => candidate.path === chemin);
  if (page === undefined) return index;

  for (const bloc of page.blocks) {
    for (const collection of bloc.collections) {
      index.set(collection.containerPath, {
        label: collection.label,
        items: collection.items.length,
        types: collection.itemTemplate.fields.map((champ) => champ.type),
        locked: collection.locked,
      });
    }
  }

  return index;
}

export interface Manque {
  page: string;
  selector: string;
  type: FieldType;
  critical: boolean;
  raison: "absent" | "verrouillé" | "sélecteur sans cible";
}

export interface Mesure {
  fixture: FixtureName;
  blueprint: Blueprint;
  poidsTotal: number;
  poidsDetecte: number;
  poidsTypeExact: number;
  manques: Manque[];
  typesDivergents: Array<{
    page: string;
    selector: string;
    attendu: string;
    obtenu: string;
  }>;
  fauxPositifs: Array<{ page: string; selector: string; raison: string }>;
  collectionsManquantes: Array<{ page: string; selector: string; raison: string }>;
}

export function rappel(mesure: Mesure): number {
  return mesure.poidsTotal === 0 ? 1 : mesure.poidsDetecte / mesure.poidsTotal;
}

export function rappelType(mesure: Mesure): number {
  return mesure.poidsTotal === 0 ? 1 : mesure.poidsTypeExact / mesure.poidsTotal;
}

export async function mesurer(fixture: FixtureName): Promise<Mesure> {
  const snapshot = await loadFixtureSnapshot(fixture);
  const attendu = await loadExpected(fixture);
  const { blueprint } = await analyze(snapshot, { now: EPOCH });

  const mesure: Mesure = {
    fixture,
    blueprint,
    poidsTotal: 0,
    poidsDetecte: 0,
    poidsTypeExact: 0,
    manques: [],
    typesDivergents: [],
    fauxPositifs: [],
    collectionsManquantes: [],
  };

  for (const page of attendu.pages) {
    const html = await readFile(join(fixtureRoot(fixture), page.path), "utf8");
    const $ = cheerio.load(html);
    const cheminsDe = (selecteur: string): string[] =>
      $(selecteur)
        .toArray()
        .map((element) => computeDomPath(element as AnyNode, cheerioTree));

    const editables = editablesDeLaPage(blueprint, page.path);
    const collections = conteneursDeCollection(blueprint, page.path);

    for (const champ of page.fields) {
      const poids = champ.critical ? 2 : 1;
      mesure.poidsTotal += poids;

      const chemins = cheminsDe(champ.selector);
      if (chemins.length === 0) {
        mesure.manques.push({
          page: page.path,
          selector: champ.selector,
          type: champ.type,
          critical: champ.critical,
          raison: "sélecteur sans cible",
        });
        continue;
      }

      const trouves = chemins
        .map((chemin) => editables.get(chemin))
        .filter((entree): entree is Editable => entree !== undefined);
      const ouvert = trouves.find((entree) => !entree.locked);

      if (ouvert === undefined) {
        mesure.manques.push({
          page: page.path,
          selector: champ.selector,
          type: champ.type,
          critical: champ.critical,
          raison: trouves.length > 0 ? "verrouillé" : "absent",
        });
        continue;
      }

      mesure.poidsDetecte += poids;
      // Un champ autonome doit porter le type annoncé. Une valeur d'item, elle,
      // hérite du type de sa *colonne* : dans une liste de coordonnées dont deux
      // lignes portent un lien et une non, l'emplacement a un seul type pour les
      // trois. On n'exige donc que la même forme de valeur.
      const typeAccepte =
        ouvert.type === champ.type ||
        (ouvert.origine === "item" && memeFormeDeValeur(ouvert.type, champ.type));

      if (typeAccepte) {
        mesure.poidsTypeExact += poids;
      } else {
        mesure.typesDivergents.push({
          page: page.path,
          selector: champ.selector,
          attendu: champ.type,
          obtenu: ouvert.type,
        });
      }
    }

    // Faux positifs destructeurs : l'élément désigné ne doit être ni un champ
    // ouvert à l'édition, ni le conteneur d'une collection modifiable.
    for (const verrou of page.mustBeLocked) {
      for (const chemin of cheminsDe(verrou.selector)) {
        const champ = editables.get(chemin);
        if (champ !== undefined && !champ.locked) {
          mesure.fauxPositifs.push({
            page: page.path,
            selector: verrou.selector,
            raison: `classé « ${champ.type} » modifiable (${chemin})`,
          });
        }
        const collection = collections.get(chemin);
        if (collection !== undefined && !collection.locked) {
          mesure.fauxPositifs.push({
            page: page.path,
            selector: verrou.selector,
            raison: `exposé comme collection « ${collection.label} » (${chemin})`,
          });
        }
      }
    }

    for (const attendue of page.collections) {
      const chemins = cheminsDe(attendue.containerSelector);
      const trouvee = chemins
        .map((chemin) => collections.get(chemin))
        .find((collection) => collection !== undefined);

      if (trouvee === undefined) {
        mesure.collectionsManquantes.push({
          page: page.path,
          selector: attendue.containerSelector,
          raison: "aucune collection détectée à cet endroit",
        });
        continue;
      }
      if (trouvee.items < attendue.minItems) {
        mesure.collectionsManquantes.push({
          page: page.path,
          selector: attendue.containerSelector,
          raison: `${trouvee.items} items détectés, ${attendue.minItems} attendus`,
        });
      }
      // Le gabarit doit exposer au moins autant d'emplacements que la vérité
      // terrain en annonce, et une image là où une image est attendue.
      const imagesAttendues = attendue.itemFields.filter(
        (type) => type === "image",
      ).length;
      const imagesTrouvees = trouvee.types.filter((type) => type === "image").length;
      if (
        trouvee.types.length < attendue.itemFields.length ||
        imagesTrouvees < imagesAttendues
      ) {
        mesure.collectionsManquantes.push({
          page: page.path,
          selector: attendue.containerSelector,
          raison: `gabarit [${trouvee.types.join(", ")}] insuffisant pour [${attendue.itemFields.join(", ")}]`,
        });
      }
    }
  }

  return mesure;
}

export async function mesurerToutes(): Promise<Mesure[]> {
  return Promise.all(FIXTURE_NAMES.map((nom) => mesurer(nom)));
}
