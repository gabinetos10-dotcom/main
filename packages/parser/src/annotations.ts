import type { FieldType } from "@calque/blueprint";
import { fieldTypeSchema } from "@calque/blueprint";
import { getAttr, type Element } from "./tree";

/**
 * Annotations `data-calque` (§9.6) — la convention de vibe coding de l'agence.
 *
 * Priorité imposée par le §9.6 : annotation explicite > surcharge admin > heuristique.
 * L'annotation gagne parce qu'elle est écrite dans le source par la personne qui
 * a fabriqué le site ; elle est donc l'intention la plus proche de la vérité.
 *
 * Syntaxe documentée dans `docs/ANNOTATIONS.md`.
 */

export type AnnotationRole = FieldType | "collection" | "lock" | "group";

export interface Annotation {
  role: AnnotationRole;
  label?: string;
  max?: number;
  min?: number;
  ratio?: string;
}

const ROLES_NON_CHAMP = new Set(["collection", "lock", "group"]);

function nombre(valeur: string | undefined): number | undefined {
  if (valeur === undefined) return undefined;
  const analyse = Number.parseInt(valeur, 10);
  return Number.isFinite(analyse) && analyse > 0 ? analyse : undefined;
}

/** Lit l'annotation portée par un élément, ou `null` s'il n'en porte pas. */
export function readAnnotation(element: Element): Annotation | null {
  const role = getAttr(element, "data-calque");
  if (role === undefined) return null;

  const normalise = role.trim().toLowerCase();
  const valide = ROLES_NON_CHAMP.has(normalise)
    ? normalise
    : fieldTypeSchema.safeParse(normalise).data;

  // Une annotation illisible ne doit pas faire taire l'heuristique : on
  // l'ignore, et le rapport d'ingestion la signalera en P4.
  if (valide === undefined) return null;

  return {
    role: valide as AnnotationRole,
    label: getAttr(element, "data-calque-label"),
    max: nombre(getAttr(element, "data-calque-max")),
    min: nombre(getAttr(element, "data-calque-min")),
    ratio: getAttr(element, "data-calque-ratio"),
  };
}

export function isFieldAnnotation(
  annotation: Annotation,
): annotation is Annotation & { role: FieldType } {
  return !ROLES_NON_CHAMP.has(annotation.role);
}
