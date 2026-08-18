/**
 * Résolution `fieldId` → nœud du DOM vivant (§11).
 *
 * Trois voies, de la plus sûre à la plus tolérante :
 *
 *  1. l'attribut `data-calque-field`, posé par le builder en mode aperçu —
 *     immédiat, et insensible à tout ce que les scripts du site ont pu faire ;
 *  2. le `domPath`, si le DOM n'a pas bougé ;
 *  3. l'empreinte et le hachage de contenu, si un script a déplacé l'élément.
 *
 * La troisième voie compte plus qu'il n'y paraît : sur un site animé, le DOM au
 * moment où l'utilisateur clique n'est pas celui que le parser a analysé.
 */

export interface FieldDescriptor {
  fieldId: string;
  domPath: string;
  type: string;
  fingerprint?: string;
  contentHash?: string;
}

export interface Resolution {
  element: HTMLElement;
  via: "attribut" | "domPath" | "empreinte";
}

function normaliser(texte: string): string {
  return texte.replace(/[\s\u00A0\u202F]+/gu, " ").trim();
}

/**
 * Hachage de contenu — même algorithme que le parser, en 32 bits.
 *
 * Le parser utilise SHA-1 tronqué, indisponible de façon synchrone dans le
 * navigateur. Ce hachage-ci ne sert qu'à départager des candidats déjà filtrés
 * par leur empreinte : une collision y est sans conséquence, contrairement au
 * hachage persisté du blueprint.
 */
export function hashRapide(texte: string): string {
  let h = 2166136261;
  const propre = normaliser(texte);
  for (let i = 0; i < propre.length; i += 1) {
    h ^= propre.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0).toString(16);
}

export function shapeDescriptor(element: Element, profondeur = 2): string {
  if (profondeur === 0) return "";
  return Array.from(element.children)
    .map((enfant) => {
      const sous = shapeDescriptor(enfant, profondeur - 1);
      const nom = enfant.tagName.toLowerCase();
      return sous.length > 0 ? `${nom}(${sous})` : nom;
    })
    .join("+");
}

export function fingerprintOf(element: Element): string {
  const classes = Array.from(element.classList).sort().join(".");
  return `${element.tagName.toLowerCase()}|${classes}|${shapeDescriptor(element)}`;
}

export function resolveField(
  racine: Document,
  descripteur: FieldDescriptor,
): Resolution | null {
  const parAttribut = racine.querySelector<HTMLElement>(
    `[data-calque-field="${CSS.escape(descripteur.fieldId)}"]`,
  );
  if (parAttribut !== null) return { element: parAttribut, via: "attribut" };

  try {
    const parChemin = racine.querySelector<HTMLElement>(descripteur.domPath);
    if (parChemin !== null) return { element: parChemin, via: "domPath" };
  } catch {
    /* un chemin devenu invalide ne doit pas interrompre la résolution */
  }

  if (descripteur.fingerprint === undefined) return null;

  const candidats = Array.from(racine.querySelectorAll<HTMLElement>("*")).filter(
    (element) => fingerprintOf(element) === descripteur.fingerprint,
  );
  if (candidats.length === 1)
    return { element: candidats[0] as HTMLElement, via: "empreinte" };

  if (descripteur.contentHash !== undefined) {
    const memeContenu = candidats.filter(
      (element) => hashRapide(element.textContent ?? "") === descripteur.contentHash,
    );
    if (memeContenu.length === 1) {
      return { element: memeContenu[0] as HTMLElement, via: "empreinte" };
    }
  }

  return null;
}
