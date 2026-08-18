import type { Field, GlobalGroup } from "@calque/blueprint";
import { computeFieldId, normalizeText } from "@calque/blueprint/ids";

/**
 * Panneaux globaux « Informations de contact » et « Réseaux sociaux » (§9.2).
 *
 * Un téléphone répété sur quatre pages est *un* champ, pas huit. Le groupe ne
 * remplace pas les champs de page : il les commande. `fieldIds` porte la liste
 * de ceux que le builder devra réécrire — sans elle, le panneau global serait
 * un affichage sans effet.
 */

export interface PageField {
  pagePath: string;
  field: Field;
}

function cleDeContact(field: Field): string | null {
  if (field.type !== "contact") return null;
  const valeur = normalizeText(String(field.value)).toLowerCase();
  return valeur.length === 0 ? null : valeur;
}

function cleDeReseau(field: Field): string | null {
  if (field.type !== "social") return null;
  return (field.value as { network: string }).network;
}

function construireGroupe(
  id: string,
  label: string,
  entrees: readonly PageField[],
  clef: (field: Field) => string | null,
): GlobalGroup | null {
  const paquets = new Map<string, PageField[]>();

  for (const entree of entrees) {
    if (entree.field.locked) continue;
    const cle = clef(entree.field);
    if (cle === null) continue;
    const existant = paquets.get(cle);
    if (existant === undefined) paquets.set(cle, [entree]);
    else existant.push(entree);
  }

  if (paquets.size === 0) return null;

  const champs = [...paquets.entries()].map(([cle, membres]) => {
    const premier = membres[0] as PageField;
    return {
      ...premier.field,
      id: computeFieldId("__globaux__", `${id}::${cle}`),
      occurrences: [...new Set(membres.map((membre) => membre.pagePath))],
      fieldIds: membres.map((membre) => membre.field.id),
    };
  });

  return { id, label, fields: champs };
}

export function buildGlobalGroups(entrees: readonly PageField[]): GlobalGroup[] {
  const groupes: GlobalGroup[] = [];

  const contact = construireGroupe(
    "grp_contact",
    "Informations de contact",
    entrees,
    cleDeContact,
  );
  if (contact !== null) groupes.push(contact);

  const reseaux = construireGroupe(
    "grp_reseaux",
    "Réseaux sociaux",
    entrees,
    cleDeReseau,
  );
  if (reseaux !== null) groupes.push(reseaux);

  return groupes;
}
