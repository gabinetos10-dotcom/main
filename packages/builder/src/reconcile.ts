import type {
  Blueprint,
  Field,
  ReconciliationEntry,
  ReconciliationPlan,
} from "@calque/blueprint";
import { fingerprintSimilarity } from "@calque/blueprint/ids";

/**
 * Réconciliation d'une re-livraison de design (§8).
 *
 * L'agence redéploie une v2 : les `domPath` ont bougé, les identifiants aussi.
 * Cette fonction propose un mapping entre l'ancien et le nouveau blueprint pour
 * que **les contenus du client survivent**. Elle ne décide rien : l'admin valide
 * l'écran de réconciliation avant que quoi que ce soit ne soit appliqué.
 *
 * Trois étages, du plus sûr au plus tolérant, exactement ceux du builder :
 * `domPath` exact, puis empreinte + hachage de contenu, puis empreinte seule.
 */

const SEUIL_EMPREINTE = 0.75;

interface Indexed {
  field: Field;
  pagePath: string;
}

function indexer(blueprint: Blueprint): Indexed[] {
  const entrees: Indexed[] = [];
  for (const page of blueprint.pages) {
    if (page.virtual) continue;
    for (const bloc of page.blocks) {
      for (const champ of bloc.fields)
        entrees.push({ field: champ, pagePath: page.path });
      for (const collection of bloc.collections) {
        for (const item of collection.items) {
          for (const [clef, localisation] of Object.entries(item.valueMeta)) {
            const gabarit = collection.itemTemplate.fields.find((c) => c.key === clef);
            if (gabarit === undefined) continue;
            entrees.push({
              pagePath: page.path,
              field: {
                id: `${item.itemId}.${clef}`,
                label: `${collection.label} — ${gabarit.label}`,
                domPath: localisation.domPath,
                locked: false,
                type: gabarit.type,
                value: item.values[clef],
                constraints: {},
                meta: {
                  fingerprint: item.meta?.fingerprint ?? "",
                  ...(localisation.contentHash !== undefined
                    ? { contentHash: localisation.contentHash }
                    : {}),
                },
              } as Field,
            });
          }
        }
      }
    }
  }
  return entrees;
}

function cle(entree: Indexed): string {
  return `${entree.pagePath}::${entree.field.domPath}`;
}

export function reconcile(precedent: Blueprint, suivant: Blueprint): ReconciliationPlan {
  const anciens = indexer(precedent);
  const nouveaux = indexer(suivant);

  const nouveauxParChemin = new Map(nouveaux.map((entree) => [cle(entree), entree]));
  const consommes = new Set<string>();
  const entries: ReconciliationEntry[] = [];

  const apparier = (ancien: Indexed): ReconciliationEntry | null => {
    const exact = nouveauxParChemin.get(cle(ancien));
    if (exact !== undefined && !consommes.has(exact.field.id)) {
      consommes.add(exact.field.id);
      return {
        status: "conserve",
        previousFieldId: ancien.field.id,
        nextFieldId: exact.field.id,
        label: ancien.field.label,
        confidence: 1,
        reason: "domPath",
      };
    }

    const candidats = nouveaux.filter(
      (candidat) =>
        !consommes.has(candidat.field.id) &&
        candidat.pagePath === ancien.pagePath &&
        candidat.field.type === ancien.field.type,
    );

    const memeContenu = candidats.filter(
      (candidat) =>
        ancien.field.meta.contentHash !== undefined &&
        candidat.field.meta.contentHash === ancien.field.meta.contentHash,
    );
    if (memeContenu.length === 1) {
      const gagnant = memeContenu[0] as Indexed;
      consommes.add(gagnant.field.id);
      return {
        status: "conserve",
        previousFieldId: ancien.field.id,
        nextFieldId: gagnant.field.id,
        label: ancien.field.label,
        confidence: 0.9,
        reason: "fingerprint+contentHash",
      };
    }

    let meilleur: { entree: Indexed; score: number } | null = null;
    for (const candidat of candidats) {
      const score = fingerprintSimilarity(
        ancien.field.meta.fingerprint,
        candidat.field.meta.fingerprint,
      );
      if (score >= SEUIL_EMPREINTE && (meilleur === null || score > meilleur.score)) {
        meilleur = { entree: candidat, score };
      }
    }

    if (meilleur !== null) {
      consommes.add(meilleur.entree.field.id);
      return {
        status: "conserve",
        previousFieldId: ancien.field.id,
        nextFieldId: meilleur.entree.field.id,
        label: ancien.field.label,
        confidence: Number(meilleur.score.toFixed(2)),
        reason: "fingerprint",
      };
    }

    return null;
  };

  for (const ancien of anciens) {
    const apparie = apparier(ancien);
    entries.push(
      apparie ?? {
        status: "orphelin",
        previousFieldId: ancien.field.id,
        label: ancien.field.label,
        confidence: 0,
        reason: "aucun",
      },
    );
  }

  for (const nouveau of nouveaux) {
    if (consommes.has(nouveau.field.id)) continue;
    entries.push({
      status: "nouveau",
      nextFieldId: nouveau.field.id,
      label: nouveau.field.label,
      confidence: 0,
      reason: "aucun",
    });
  }

  return {
    entries,
    summary: {
      conserves: entries.filter((entree) => entree.status === "conserve").length,
      nouveaux: entries.filter((entree) => entree.status === "nouveau").length,
      orphelins: entries.filter((entree) => entree.status === "orphelin").length,
    },
  };
}

/**
 * Traduit un plan validé en réétiquetage du contenu : ancien identifiant →
 * nouveau. Ce qui n'est pas apparié n'est pas perdu, il est simplement absent
 * de la table — l'écran de réconciliation le montre comme orphelin.
 */
export function contentRemapping(plan: ReconciliationPlan): Record<string, string> {
  const table: Record<string, string> = {};
  for (const entree of plan.entries) {
    if (entree.status !== "conserve") continue;
    if (entree.previousFieldId === undefined || entree.nextFieldId === undefined)
      continue;
    table[entree.previousFieldId] = entree.nextFieldId;
  }
  return table;
}
