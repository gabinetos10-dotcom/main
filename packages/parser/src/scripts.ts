import { parse as parseJs } from "acorn";
import { simple as walkSimple } from "acorn-walk";
import type { Node as AcornNode } from "acorn";

/**
 * Analyse des scripts du site (§8, cas limites).
 *
 * Deux questions seulement, mais elles décident de ce que l'éditeur peut promettre :
 *
 *  1. Le site utilise-t-il une bibliothèque d'animation, un découpeur de texte,
 *     un shadow DOM ? Le mode d'édition statique du §11 en dépend.
 *  2. Quels éléments voient leur texte écrit au runtime ? Les proposer à
 *     l'édition afficherait au client une valeur qui serait écrasée au
 *     chargement — le pire des deux mondes.
 *
 * La seconde question se répond sur l'arbre syntaxique, pas par recherche de
 * texte : `element.textContent = …` doit être relié au sélecteur qui a produit
 * `element`, et seule une analyse des liaisons le permet.
 */

export interface ScriptFinding {
  /** Sélecteur CSS simple dont le contenu est écrit par un script. */
  selector: string;
  file: string;
}

export interface ScriptAnalysis {
  animationLibrary: string | null;
  textSplitter: string | null;
  shadowDom: boolean;
  domMutated: boolean;
  dynamic: ScriptFinding[];
  /** Familles déclarées dans une configuration Tailwind CDN inline. */
  configuredFonts: string[];
}

const BIBLIOTHEQUES_ANIMATION: ReadonlyArray<[RegExp, string]> = [
  [/\bgsap\b|ScrollTrigger/u, "GSAP ScrollTrigger"],
  [/\bAOS\.(?:init|refresh)\b/u, "AOS"],
  [/\bLocomotiveScroll\b/u, "Locomotive Scroll"],
  [/\bScrollMagic\b/u, "ScrollMagic"],
  [/\bnew\s+Rellax\b/u, "Rellax"],
  [/\banime\s*\(/u, "anime.js"],
  [/\blottie\.(?:loadAnimation|play)\b/u, "Lottie"],
  [/\bbarba\.init\b/u, "Barba.js"],
];

const DECOUPEURS: ReadonlyArray<[RegExp, string]> = [
  [/\bSplitText\b/u, "SplitText"],
  [/\bSplitType\b/u, "SplitType"],
  [/\bSplitting\s*\(/u, "Splitting.js"],
  [/\bnew\s+Typed\b/u, "Typed.js"],
];

const ECRITURES = new Set(["textContent", "innerText", "innerHTML"]);
const SELECTEURS_UNIQUES = new Set(["querySelector", "getElementById", "closest"]);
const SELECTEURS_MULTIPLES = new Set(["querySelectorAll", "getElementsByClassName"]);

interface Litteral extends AcornNode {
  type: "Literal";
  value: unknown;
}

interface Identifiant extends AcornNode {
  type: "Identifier";
  name: string;
}

interface MembreExpression extends AcornNode {
  type: "MemberExpression";
  object: AcornNode;
  property: AcornNode;
  computed: boolean;
}

interface AppelExpression extends AcornNode {
  type: "CallExpression";
  callee: AcornNode;
  arguments: AcornNode[];
}

function estIdentifiant(noeud: AcornNode | undefined): noeud is Identifiant {
  return noeud?.type === "Identifier";
}

function nomDePropriete(noeud: MembreExpression): string | null {
  if (noeud.computed) return null;
  return estIdentifiant(noeud.property) ? noeud.property.name : null;
}

/** `document.querySelector('.x')` → `.x` ; `getElementById('x')` → `#x`. */
function selecteurDeLAppel(
  noeud: AcornNode,
): { selector: string; multiple: boolean } | null {
  if (noeud.type !== "CallExpression") return null;
  const appel = noeud as AppelExpression;
  if (appel.callee.type !== "MemberExpression") return null;

  const methode = nomDePropriete(appel.callee as MembreExpression);
  if (methode === null) return null;

  const premier = appel.arguments[0];
  if (premier?.type !== "Literal") return null;
  const valeur = (premier as Litteral).value;
  if (typeof valeur !== "string" || valeur.length === 0) return null;

  if (SELECTEURS_UNIQUES.has(methode)) {
    return {
      selector: methode === "getElementById" ? `#${valeur}` : valeur,
      multiple: false,
    };
  }
  if (SELECTEURS_MULTIPLES.has(methode)) {
    return {
      selector: methode === "getElementsByClassName" ? `.${valeur}` : valeur,
      multiple: true,
    };
  }
  return null;
}

/** Y a-t-il, dans ce sous-arbre, une écriture de contenu sur `nom` ? */
function ecritSur(racine: AcornNode, nom: string): boolean {
  let trouve = false;
  walkSimple(racine, {
    AssignmentExpression(noeud) {
      const gauche = (noeud as unknown as { left: AcornNode }).left;
      if (gauche.type !== "MemberExpression") return;
      const membre = gauche as MembreExpression;
      const propriete = nomDePropriete(membre);
      if (propriete === null || !ECRITURES.has(propriete)) return;
      if (estIdentifiant(membre.object) && membre.object.name === nom) trouve = true;
    },
  });
  return trouve;
}

/**
 * Familles de polices déclarées dans un `tailwind.config = { … }` inline.
 *
 * Un site servi par le CDN Tailwind n'a pas de `@font-face` ni d'`@import` : sa
 * typographie est écrite en JavaScript. Sans cette lecture, le panneau de thème
 * s'ouvrirait sans aucune police sur le cas le plus courant du vibe coding.
 */
function famillesTailwind(programme: AcornNode): string[] {
  const familles: string[] = [];

  walkSimple(programme, {
    Property(noeud) {
      const propriete = noeud as unknown as { key: AcornNode; value: AcornNode };
      const cle = estIdentifiant(propriete.key)
        ? propriete.key.name
        : propriete.key.type === "Literal"
          ? String((propriete.key as Litteral).value)
          : null;
      if (cle !== "fontFamily") return;

      walkSimple(propriete.value, {
        ArrayExpression(tableau) {
          const elements = (tableau as unknown as { elements: Array<AcornNode | null> })
            .elements;
          const premier = elements[0];
          if (premier?.type !== "Literal") return;
          const valeur = (premier as Litteral).value;
          if (
            typeof valeur === "string" &&
            valeur.length > 0 &&
            !familles.includes(valeur)
          ) {
            familles.push(valeur);
          }
        },
      });
    },
  });

  return familles;
}

function analyserProgramme(code: string): AcornNode | null {
  try {
    return parseJs(code, {
      ecmaVersion: "latest",
      sourceType: "script",
      allowReturnOutsideFunction: true,
    }) as unknown as AcornNode;
  } catch {
    // Un script illisible — minifié, ou du TypeScript servi tel quel — ne doit
    // pas faire échouer l'ingestion. On perd la détection, pas l'analyse.
    return null;
  }
}

function analyserFichier(code: string, file: string): ScriptFinding[] {
  const programme = analyserProgramme(code);
  if (programme === null) return [];

  const trouvailles: ScriptFinding[] = [];
  const ajouter = (selector: string): void => {
    if (!trouvailles.some((existant) => existant.selector === selector)) {
      trouvailles.push({ selector, file });
    }
  };

  // `var x = document.querySelector('sel')` puis, plus loin, `x.textContent = …`
  walkSimple(programme, {
    VariableDeclarator(noeud) {
      const declarateur = noeud as unknown as { id: AcornNode; init?: AcornNode | null };
      if (!estIdentifiant(declarateur.id) || !declarateur.init) return;
      const cible = selecteurDeLAppel(declarateur.init);
      if (cible === null || cible.multiple) return;
      if (ecritSur(programme, declarateur.id.name)) ajouter(cible.selector);
    },
  });

  // `document.querySelectorAll('sel').forEach(function (el) { el.textContent = … })`
  walkSimple(programme, {
    CallExpression(noeud) {
      const appel = noeud as unknown as AppelExpression;
      if (appel.callee.type !== "MemberExpression") return;
      const membre = appel.callee as MembreExpression;
      if (nomDePropriete(membre) !== "forEach") return;

      const cible = selecteurDeLAppel(membre.object);
      if (cible === null) return;

      const rappel = appel.arguments[0];
      if (
        rappel?.type !== "FunctionExpression" &&
        rappel?.type !== "ArrowFunctionExpression"
      ) {
        return;
      }
      const parametres = (rappel as unknown as { params: AcornNode[] }).params;
      const premier = parametres[0];
      if (!estIdentifiant(premier)) return;
      if (ecritSur(rappel, premier.name)) ajouter(cible.selector);
    },
  });

  return trouvailles;
}

export function analyzeScripts(
  fichiers: ReadonlyArray<{ path: string; code: string }>,
): ScriptAnalysis {
  const resultat: ScriptAnalysis = {
    animationLibrary: null,
    textSplitter: null,
    shadowDom: false,
    domMutated: false,
    dynamic: [],
    configuredFonts: [],
  };

  for (const { path, code } of fichiers) {
    for (const [motif, nom] of BIBLIOTHEQUES_ANIMATION) {
      if (resultat.animationLibrary === null && motif.test(code)) {
        resultat.animationLibrary = nom;
      }
    }
    for (const [motif, nom] of DECOUPEURS) {
      if (resultat.textSplitter === null && motif.test(code)) resultat.textSplitter = nom;
    }
    if (/attachShadow|customElements\.define/u.test(code)) resultat.shadowDom = true;
    if (/\b(?:appendChild|insertAdjacentHTML|createElement|cloneNode)\b/u.test(code)) {
      resultat.domMutated = true;
    }

    resultat.dynamic.push(...analyserFichier(code, path));

    if (code.includes("fontFamily")) {
      const programme = analyserProgramme(code);
      if (programme !== null) {
        for (const famille of famillesTailwind(programme)) {
          if (!resultat.configuredFonts.includes(famille)) {
            resultat.configuredFonts.push(famille);
          }
        }
      }
    }
  }

  return resultat;
}
