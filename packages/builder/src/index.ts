import type {
  Blueprint,
  BuildOptions,
  BuildResult,
  ContentData,
  OutputFile,
  Page,
  SourceSnapshot,
} from "@calque/blueprint";
import { duplicatedFieldId } from "@calque/blueprint/ids";
import {
  applySplices,
  childNodes,
  elementRange,
  findFirst,
  isElement,
  parseHtml,
  tagName,
  type Element,
  type Node,
  type Splice,
} from "@calque/parser";
import { escapeAttribute } from "./escape";
import { itemValueKey } from "./initial";
import { OVERRIDES_PATH, renderOverrides } from "./overrides";
import { PageIndex } from "./resolve";
import { seoSplices } from "./seo";
import { collectionUnchanged, rewriteCollection } from "./collections";
import { sameValue, splicesForValue } from "./writes";
import { renderRobots, renderSitemap } from "./sitemap";

export { initialContent, itemValueKey } from "./initial";
export { OVERRIDES_PATH, renderOverrides } from "./overrides";
export { escapeText, escapeAttribute, sanitizeRichtext, sanitizeUrl } from "./escape";
export { mapEmbedUrl, sameValue, splicesForValue } from "./writes";
export { PageIndex } from "./resolve";
export { renderSitemap, renderRobots } from "./sitemap";

export const BUILDER_VERSION = "3.0.0";

const decodeur = new TextDecoder();
const encodeur = new TextEncoder();

interface PageBuild {
  html: string;
  unresolved: string[];
}

/**
 * `build(source, blueprint, contenu) → site_final` (§15).
 *
 * Fonction pure : elle lit un instantané immuable et renvoie des fichiers. Elle
 * n'écrit rien, ne mute rien, et ne dépend d'aucune horloge ni d'aucun réseau.
 *
 * L'invariant qui tient tout le système :
 *
 *     build(source, blueprint, initialContent(blueprint)) ≡ source
 *
 * Il tient parce qu'un champ dont la valeur n'a pas changé n'est pas réécrit du
 * tout. Rien n'est resérialisé : on remplace des intervalles d'octets, et seuls
 * ceux-là.
 */
export async function build(
  source: SourceSnapshot,
  blueprint: Blueprint,
  content: ContentData,
  options: BuildOptions = {},
): Promise<BuildResult> {
  const depart = Date.now();
  const fichiers: OutputFile[] = [];
  const unresolvedFieldIds: string[] = [];

  const pages = new Map(
    blueprint.pages.filter((page) => !page.virtual).map((page) => [page.path, page]),
  );

  for (const fichier of source.files) {
    const estPage = fichier.kind === "page" && pages.has(fichier.path);
    if (options.pagesOnly === true && !estPage) continue;

    const contenu = fichier.content ?? (await source.read(fichier.path));

    const page = pages.get(fichier.path);
    if (fichier.kind !== "page" || page === undefined) {
      if (options.pagesOnly !== true)
        fichiers.push({ path: fichier.path, content: contenu });
      continue;
    }

    const rendu = buildPage(decodeur.decode(contenu), page, blueprint, content, options);
    unresolvedFieldIds.push(...rendu.unresolved);
    fichiers.push({ path: fichier.path, content: encodeur.encode(rendu.html) });
  }

  const surcharges = renderOverrides(blueprint, content);
  if (!surcharges.empty) {
    fichiers.push({ path: OVERRIDES_PATH, content: encodeur.encode(surcharges.css) });
  }

  if (options.siteUrl !== undefined) {
    const chemins = [...pages.keys()];
    fichiers.push({
      path: "sitemap.xml",
      content: encodeur.encode(renderSitemap(options.siteUrl, chemins)),
    });
    fichiers.push({
      path: "robots.txt",
      content: encodeur.encode(renderRobots(options.siteUrl)),
    });
  }

  return {
    files: fichiers,
    unresolvedFieldIds,
    stats: {
      filesWritten: fichiers.length,
      bytesWritten: fichiers.reduce(
        (total, fichier) => total + fichier.content.byteLength,
        0,
      ),
      durationMs: Date.now() - depart,
    },
  };
}

function buildPage(
  source: string,
  page: Page,
  blueprint: Blueprint,
  content: ContentData,
  options: BuildOptions,
): PageBuild {
  const document = parseHtml(source);
  const index = new PageIndex(document);
  const splices: Splice[] = [];
  const unresolved: string[] = [];
  const consommees = new Set<string>();
  const marquage: Array<{ element: Element; fieldId: string }> = [];

  const surchargesActives = !renderOverrides(blueprint, content).empty;

  for (const bloc of page.blocks) {
    /* ── Collections structurellement modifiées ────────────────────────────── */
    for (const collection of bloc.collections) {
      const etat = content.collections[collection.id];
      if (collectionUnchanged(collection, etat)) continue;

      const reecriture = rewriteCollection(
        collection,
        etat ?? { order: [], added: {}, removed: [] },
        index,
        source,
        content.fields,
      );
      if (reecriture === null) {
        unresolved.push(collection.id);
        continue;
      }
      splices.push(reecriture.splice);
      for (const clef of reecriture.consumedFieldKeys) consommees.add(clef);
    }

    /* ── Valeurs d'items des collections restées en place ───────────────────── */
    for (const collection of bloc.collections) {
      const etat = content.collections[collection.id];
      if (!collectionUnchanged(collection, etat)) continue;

      for (const item of collection.items) {
        for (const gabarit of collection.itemTemplate.fields) {
          const clef = itemValueKey(item.itemId, gabarit.key);
          if (consommees.has(clef)) continue;

          const localisation = item.valueMeta[gabarit.key];
          if (localisation === undefined) continue;

          const souhaitee = content.fields[clef];
          if (souhaitee === undefined || sameValue(souhaitee, item.values[gabarit.key])) {
            continue;
          }

          const element = index.byPath(localisation.domPath);
          if (element === undefined) {
            unresolved.push(clef);
            continue;
          }

          const produits = splicesForValue(gabarit.type, souhaitee, { element, source });
          if (produits === null) unresolved.push(clef);
          else splices.push(...produits);
        }
      }
    }

    /* ── Champs de bloc ────────────────────────────────────────────────────── */
    for (const champ of bloc.fields) {
      const resolution = index.resolve(champ.domPath, champ.meta);
      if (resolution !== null && options.injectEditorRuntime === true) {
        marquage.push({ element: resolution.element, fieldId: champ.id });
      }

      const souhaitee = content.fields[champ.id] ?? content.globals[champ.id];
      if (souhaitee === undefined || sameValue(souhaitee, champ.value)) continue;
      if (champ.locked) continue;

      if (resolution === null) {
        unresolved.push(champ.id);
        continue;
      }

      const produits = splicesForValue(
        champ.type,
        souhaitee,
        { element: resolution.element, source },
        champ.constraints as Record<string, unknown>,
      );
      if (produits === null) unresolved.push(champ.id);
      else splices.push(...produits);
    }

    /* ── Duplications de bloc (§13) ────────────────────────────────────────── */
    const etatBloc = content.blocks[bloc.id];
    for (const nonce of etatBloc?.duplicates ?? []) {
      const element = index.byPath(bloc.domPath);
      const plage = element === undefined ? undefined : elementRange(element);
      if (element === undefined || plage === undefined) {
        unresolved.push(`${bloc.id}#${nonce}`);
        continue;
      }

      const locaux: Splice[] = [];
      for (const champ of bloc.fields) {
        const valeur = content.fields[duplicatedFieldId(champ.id, nonce)];
        if (valeur === undefined) continue;
        const cible = index.byPath(champ.domPath);
        if (cible === undefined) continue;
        const produits = splicesForValue(champ.type, valeur, { element: cible, source });
        if (produits === null) continue;
        for (const produit of produits) {
          locaux.push({
            startOffset: produit.startOffset - plage.startOffset,
            endOffset: produit.endOffset - plage.startOffset,
            replacement: produit.replacement,
          });
        }
      }

      const copie = applySplices(
        source.slice(plage.startOffset, plage.endOffset),
        locaux,
      );
      splices.push({
        startOffset: plage.endOffset,
        endOffset: plage.endOffset,
        replacement: `\n${copie}`,
      });
    }
  }

  /* ── SEO ─────────────────────────────────────────────────────────────────── */
  const head = findFirst(document, (element) => tagName(element) === "head");
  const souhaiteSeo = content.seo[page.path];
  const insertionsHead: string[] = [];

  if (head !== null && souhaiteSeo !== undefined) {
    const resultat = seoSplices(head, source, page.seo, souhaiteSeo);
    splices.push(...resultat.splices);
    insertionsHead.push(...resultat.insertions);
  }

  /* ── Feuille de surcharge, chargée en dernier (§15 étape 7) ──────────────── */
  if (surchargesActives) {
    insertionsHead.push(
      `<link rel="stylesheet" href="${escapeAttribute(cheminRelatif(page.path, OVERRIDES_PATH))}">`,
    );
  }

  if (head !== null && insertionsHead.length > 0) {
    const fin = head.sourceCodeLocation?.endTag;
    if (fin !== undefined) {
      splices.push({
        startOffset: fin.startOffset,
        endOffset: fin.startOffset,
        replacement: `${insertionsHead.join("\n")}\n`,
      });
    }
  }

  /* ── Nettoyage des annotations (§15 étape 9) ─────────────────────────────── */
  if (options.injectEditorRuntime !== true) {
    splices.push(...splicesDeNettoyage(document, source));
  } else {
    for (const { element, fieldId } of marquage) {
      const debut = element.sourceCodeLocation?.startTag;
      if (debut === undefined) continue;
      const point = debut.startOffset + 1 + tagName(element).length;
      splices.push({
        startOffset: point,
        endOffset: point,
        replacement: ` data-calque-field="${escapeAttribute(fieldId)}"`,
      });
    }

    /**
     * Le runtime est injecté **en tête du `<head>`**, avant les `<script>` du
     * site. C'est le seul instant où il peut neutraliser GSAP ou AOS avant que
     * le CDN ne les définisse : injecté en fin de `<body>`, il arriverait après
     * la bibliothèque et l'aperçu resterait une page vide (§11).
     */
    const debutHead = head?.sourceCodeLocation?.startTag;
    if (debutHead !== undefined && options.editorRuntimeUrl !== undefined) {
      const configuration =
        options.editorConfig === undefined
          ? ""
          : `<script type="application/json" id="calque-config">${jsonPourScript(options.editorConfig)}</script>`;
      splices.push({
        startOffset: debutHead.endOffset,
        endOffset: debutHead.endOffset,
        replacement: `\n${configuration}<script src="${escapeAttribute(options.editorRuntimeUrl)}"></script>`,
      });
    }
  }

  return { html: applySplices(source, splices), unresolved };
}

/**
 * Retire tous les attributs `data-calque*` du HTML publié (§15, étape 9).
 *
 * Ils ont piloté l'analyse ; ils n'ont rien à faire dans le site du client, où
 * ils ne feraient que révéler l'outillage.
 */
function splicesDeNettoyage(document: Node, source: string): Splice[] {
  const splices: Splice[] = [];

  const parcourir = (noeud: Node): void => {
    for (const enfant of childNodes(noeud)) {
      if (!isElement(enfant)) continue;
      const localisations = enfant.sourceCodeLocation?.attrs;
      if (localisations !== undefined) {
        for (const attribut of enfant.attrs) {
          if (!attribut.name.startsWith("data-calque")) continue;
          const plage = localisations[attribut.name];
          if (plage === undefined) continue;
          let debut = plage.startOffset;
          while (debut > 0 && /\s/u.test(source[debut - 1] as string)) debut -= 1;
          splices.push({
            startOffset: debut,
            endOffset: plage.endOffset,
            replacement: "",
          });
        }
      }
      parcourir(enfant);
    }
  };

  parcourir(document);
  return splices;
}

/**
 * Sérialise une configuration pour une balise `<script type="application/json">`.
 *
 * `</script>` dans une chaîne fermerait la balise et injecterait du contenu dans
 * la page : c'est la seule séquence qui compte à l'intérieur d'un script JSON.
 */
function jsonPourScript(valeur: unknown): string {
  return JSON.stringify(valeur)
    .replace(/</gu, "\\u003c")
    .replace(/>/gu, "\\u003e")
    .replace(/\u2028/gu, "\\u2028")
    .replace(/\u2029/gu, "\\u2029");
}

/** `menu.html` + `assets/x.css` → `assets/x.css` ; `a/b.html` → `../assets/x.css`. */
function cheminRelatif(depuis: string, vers: string): string {
  const profondeur = depuis.split("/").length - 1;
  return profondeur === 0 ? vers : `${"../".repeat(profondeur)}${vers}`;
}
