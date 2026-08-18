import type {
  AnalyzeOptions,
  AnalyzeResult,
  Blueprint,
  BlueprintWarning,
  LockedNode,
  Page,
  SourceSnapshot,
} from "@calque/blueprint";
import { BLUEPRINT_VERSION, blueprintSchema } from "@calque/blueprint";
import { compileSimpleSelector } from "./simple-selector";
import { analyzePage, type FieldEntry } from "./page";
import { analyzeScripts } from "./scripts";
import { analyzeTheme, type StyleSheet } from "./theme";
import { buildGlobalGroups, type PageField } from "./globals";
import { computeFontId } from "@calque/blueprint/ids";
import { findAll, getAttr, parseHtml, tagName, type Element } from "./tree";

export const PARSER_VERSION = "2.0.0";
export const ADAPTER_ID = "static-html";

export { analyzePage } from "./page";
export { analyzeScripts } from "./scripts";
export { analyzeTheme } from "./theme";
export { applySplices } from "./splice";
export { compileSimpleSelector } from "./simple-selector";
export { classify, backgroundImage } from "./classify";
export { computeDomPath, type DomPathTree } from "./dom-path";
export { readAnnotation } from "./annotations";
export { labelForField, labelForBlock, humanize } from "./labels";
export { extractSeo } from "./seo";
export * from "./tree";

const decodeur = new TextDecoder();

function texteDe(snapshot: SourceSnapshot, chemin: string): string | null {
  const fichier = snapshot.files.find((candidat) => candidat.path === chemin);
  if (fichier?.content === undefined) return null;
  return decodeur.decode(fichier.content);
}

/** Scripts inline d'une page, pour lire une configuration Tailwind CDN. */
function scriptsInline(
  html: string,
  chemin: string,
): Array<{ path: string; code: string }> {
  const document = parseHtml(html);
  const scripts: Array<{ path: string; code: string }> = [];

  for (const [index, script] of findAll(
    document,
    (element) => tagName(element) === "script",
  ).entries()) {
    if (getAttr(script, "src") !== undefined) continue;
    const contenu = script.childNodes
      .map((noeud) => ("value" in noeud ? String(noeud.value) : ""))
      .join("");
    if (contenu.trim().length > 0) {
      scripts.push({ path: `${chemin}#script-${index + 1}`, code: contenu });
    }
  }

  return scripts;
}

/**
 * `analyze` — source immuable → blueprint (§9).
 *
 * Le source n'est jamais modifié : ce module ne fait que lire, et tout ce qu'il
 * produit est un document séparé. C'est l'invariant central du produit (§5).
 */
export async function analyze(
  source: SourceSnapshot,
  options: AnalyzeOptions = {},
): Promise<AnalyzeResult> {
  const depart = Date.now();

  const pagesSource = source.files.filter((fichier) => fichier.kind === "page");
  const feuilles: StyleSheet[] = source.files
    .filter((fichier) => fichier.kind === "style")
    .map((fichier) => ({ path: fichier.path, css: texteDe(source, fichier.path) ?? "" }));

  const scripts = source.files
    .filter((fichier) => fichier.kind === "script")
    .map((fichier) => ({
      path: fichier.path,
      code: texteDe(source, fichier.path) ?? "",
    }));

  const contenus = new Map<string, string>();
  for (const fichier of pagesSource) {
    const html =
      texteDe(source, fichier.path) ?? decodeur.decode(await source.read(fichier.path));
    contenus.set(fichier.path, html);
    scripts.push(...scriptsInline(html, fichier.path));
  }

  const analyseScripts = analyzeScripts(scripts);
  const analyseTheme = analyzeTheme(feuilles);

  for (const famille of analyseScripts.configuredFonts) {
    if (!analyseTheme.theme.fonts.some((police) => police.family === famille)) {
      analyseTheme.theme.fonts.push({
        id: computeFontId(famille),
        family: famille,
        source: "local",
        role: "headings",
      });
    }
  }

  const dynamicMatchers = analyseScripts.dynamic
    .map((trouvaille) => compileSimpleSelector(trouvaille.selector))
    .filter((predicat): predicat is (element: Element) => boolean => predicat !== null);

  const knownFiles = new Set(source.files.map((fichier) => fichier.path));

  const pages: Page[] = [];
  const virtuelles: Page[] = [];
  const locked: LockedNode[] = [];
  const warnings: BlueprintWarning[] = [];
  const globalCandidates: PageField[] = [];
  let totalChamps = 0;
  let totalImages = 0;
  let totalCollections = 0;

  const cheminsTries = [...contenus.keys()].sort((a, b) =>
    a === source.entry ? -1 : b === source.entry ? 1 : a.localeCompare(b),
  );

  for (const chemin of cheminsTries) {
    const html = contenus.get(chemin) as string;
    const resultat = analyzePage({
      path: chemin,
      html,
      entry: source.entry,
      lockContext: { dynamicMatchers },
      overrides: options.fieldOverrides ?? {},
      ...(options.collectionSimilarityThreshold !== undefined
        ? { similarityThreshold: options.collectionSimilarityThreshold }
        : {}),
      ...(options.collectionShapeFloor !== undefined
        ? { shapeFloor: options.collectionShapeFloor }
        : {}),
      knownFiles,
    });

    pages.push(resultat.page);
    locked.push(...resultat.locked);
    warnings.push(...resultat.warnings);
    totalChamps += resultat.stats.fields;
    totalImages += resultat.stats.images;
    totalCollections += resultat.stats.collections;

    for (const entree of resultat.entries) {
      if (entree.field.type === "contact" || entree.field.type === "social") {
        globalCandidates.push({ pagePath: chemin, field: entree.field });
      }
    }

    warnings.push(...imagesManquantes(resultat.entries, chemin, knownFiles));
    warnings.push(...formulairesSansEndpoint(html, chemin));

    // §8 : un one-page dont la navigation est interceptée en JavaScript se
    // présente au client comme plusieurs pages. Elles ne portent aucun bloc —
    // le contenu vit dans la page réelle, et n'existe donc qu'une fois.
    if (pagesSource.length === 1) {
      for (const bloc of resultat.page.blocks) {
        const racine = resultat.blocksById.get(bloc.id);
        if (racine === undefined) continue;
        const identifiant = getAttr(racine, "id");
        if (identifiant === undefined || !resultat.anchorTargets.has(identifiant))
          continue;
        virtuelles.push({
          path: `${chemin}#${identifiant}`,
          label: bloc.label,
          virtual: true,
          anchorBlockId: bloc.id,
          seo: resultat.page.seo,
          blocks: [],
        });
      }
    }
  }

  warnings.push(...avertissementsDuSite(analyseScripts, analyseTheme.noCssVariables));

  const blueprint: Blueprint = blueprintSchema.parse({
    blueprintVersion: BLUEPRINT_VERSION,
    generatedAt: (options.now ?? new Date()).toISOString(),
    parserVersion: PARSER_VERSION,
    site: {
      entry: source.entry,
      pageCount: pages.length,
      adapter: ADAPTER_ID,
    },
    theme: analyseTheme.theme,
    globals: buildGlobalGroups(globalCandidates),
    pages: [...pages, ...virtuelles],
    locked,
    warnings,
  } satisfies Blueprint);

  return {
    blueprint,
    stats: {
      pages: pages.length,
      fields: totalChamps,
      images: totalImages,
      collections: totalCollections,
      lockedNodes: locked.length,
      durationMs: Date.now() - depart,
    },
  };
}

function imagesManquantes(
  entrees: readonly FieldEntry[],
  chemin: string,
  connus: ReadonlySet<string>,
): BlueprintWarning[] {
  const avertissements: BlueprintWarning[] = [];

  for (const entree of entrees) {
    if (entree.field.type !== "image") continue;
    const src = (entree.field.value as { src: string }).src;
    if (src.startsWith("http") || src.startsWith("data:") || src.startsWith("//"))
      continue;
    const normalise = src.replace(/^\.?\//u, "").split(/[?#]/u)[0] as string;
    if (connus.has(normalise)) continue;

    avertissements.push({
      code: "IMAGE_MANQUANTE",
      message: `L'image « ${src} » est référencée mais absente du dépôt.`,
      severity: "attention",
      pagePath: chemin,
      domPath: entree.field.domPath,
    });
  }

  return avertissements;
}

function formulairesSansEndpoint(html: string, chemin: string): BlueprintWarning[] {
  const document = parseHtml(html);
  const avertissements: BlueprintWarning[] = [];

  for (const formulaire of findAll(document, (element) => tagName(element) === "form")) {
    const action = getAttr(formulaire, "action");
    if (action !== undefined && action.trim().length > 0) continue;
    avertissements.push({
      code: "FORM_SANS_ENDPOINT",
      message:
        "Ce formulaire n'a pas de destination : les messages envoyés depuis le site ne partiraient nulle part.",
      severity: "attention",
      pagePath: chemin,
    });
  }

  return avertissements;
}

function avertissementsDuSite(
  scripts: ReturnType<typeof analyzeScripts>,
  sansVariablesCss: boolean,
): BlueprintWarning[] {
  const avertissements: BlueprintWarning[] = [];

  if (scripts.animationLibrary !== null) {
    avertissements.push({
      code: "ANIM_LIB_DETECTED",
      message: `${scripts.animationLibrary} détecté : l'aperçu passe en mode d'édition statique, sans quoi la page apparaîtrait vide.`,
      severity: "info",
    });
  }

  if (scripts.textSplitter !== null) {
    avertissements.push({
      code: "TEXT_SPLITTER_DETECTED",
      message: `${scripts.textSplitter} découpe des titres caractère par caractère. L'éditeur neutralise ce découpage pour rendre les titres modifiables.`,
      severity: "attention",
    });
  }

  if (scripts.shadowDom) {
    avertissements.push({
      code: "SHADOW_DOM_DETECTED",
      message:
        "Un composant place son contenu dans un shadow root : ce contenu reste hors d'atteinte de l'éditeur.",
      severity: "attention",
    });
  }

  if (scripts.domMutated) {
    avertissements.push({
      code: "DOM_MUTATED_AT_RUNTIME",
      message:
        "Un script fabrique des éléments au chargement. Ce qu'il ajoute n'existe pas dans le source et ne peut pas être modifié.",
      severity: "info",
    });
  }

  for (const trouvaille of scripts.dynamic) {
    avertissements.push({
      code: "DYNAMIC_TEXT",
      message: `Le texte de « ${trouvaille.selector} » est écrit par ${trouvaille.file} au chargement : il n'est pas modifiable.`,
      severity: "attention",
    });
  }

  if (sansVariablesCss) {
    avertissements.push({
      code: "NO_CSS_VARIABLES",
      message:
        "Le site ne déclare aucune variable de couleur. Les couleurs proposées sont déduites du CSS ; leur remplacement global reste à activer manuellement.",
      severity: "info",
    });
  }

  return avertissements;
}
