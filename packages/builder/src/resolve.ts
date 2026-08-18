import type { FieldMeta } from "@calque/blueprint";
import { computeContentHash } from "@calque/blueprint/ids";
import {
  childNodes,
  domPathOf,
  fingerprintOf,
  isElement,
  textContent,
  type Element,
  type Node,
} from "@calque/parser";

/**
 * Résolution d'un champ vers son nœud dans le source (§15, étape 3).
 *
 * Le builder ne fait pas confiance aux offsets enregistrés dans le blueprint :
 * il reparse le source et retrouve chaque champ. C'est ce qui permet à un
 * contenu de survivre à une re-livraison où le design a bougé — et ce qui évite
 * d'écrire à l'aveugle dans un fichier qui aurait changé sous nos pieds.
 *
 * Trois étages, du plus sûr au plus tolérant :
 *
 *   1. `domPath` exact — le cas ordinaire ;
 *   2. empreinte **et** hachage de contenu — l'élément a bougé mais n'a pas changé ;
 *   3. empreinte seule, et seulement si elle ne désigne qu'un candidat.
 *
 * Au-delà, on ne devine pas : le champ est déclaré irrésolu et rien n'est écrit.
 */

export type ResolutionReason = "domPath" | "fingerprint+contentHash" | "fingerprint";

export interface Resolution {
  element: Element;
  reason: ResolutionReason;
}

export class PageIndex {
  private readonly parChemin = new Map<string, Element>();
  private readonly parEmpreinte = new Map<string, Element[]>();

  constructor(racine: Node) {
    const parcourir = (noeud: Node): void => {
      for (const enfant of childNodes(noeud)) {
        if (!isElement(enfant)) continue;
        this.parChemin.set(domPathOf(enfant), enfant);
        const empreinte = fingerprintOf(enfant);
        const existants = this.parEmpreinte.get(empreinte);
        if (existants === undefined) this.parEmpreinte.set(empreinte, [enfant]);
        else existants.push(enfant);
        parcourir(enfant);
      }
    };
    parcourir(racine);
  }

  resolve(domPath: string, meta: FieldMeta): Resolution | null {
    const exact = this.parChemin.get(domPath);
    if (exact !== undefined) return { element: exact, reason: "domPath" };

    const candidats = this.parEmpreinte.get(meta.fingerprint) ?? [];
    if (candidats.length === 0) return null;

    if (meta.contentHash !== undefined) {
      const memeContenu = candidats.filter(
        (candidat) => computeContentHash(textContent(candidat)) === meta.contentHash,
      );
      if (memeContenu.length === 1) {
        return { element: memeContenu[0] as Element, reason: "fingerprint+contentHash" };
      }
    }

    if (candidats.length === 1) {
      return { element: candidats[0] as Element, reason: "fingerprint" };
    }

    return null;
  }

  byPath(domPath: string): Element | undefined {
    return this.parChemin.get(domPath);
  }
}
