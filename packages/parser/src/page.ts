import type {
  Block,
  BlockCapability,
  Collection,
  CollectionItem,
  Field,
  FieldOverride,
  FieldType,
  LockedNode,
  Page,
  TemplateField,
  BlueprintWarning,
} from "@calque/blueprint";
import {
  DEFAULT_COLLECTION_SHAPE_FLOOR,
  DEFAULT_COLLECTION_SIMILARITY_THRESHOLD,
  computeBlockId,
  computeCollectionId,
  computeContentHash,
  computeFieldId,
  fingerprintShapeSimilarity,
  fingerprintSimilarity,
} from "@calque/blueprint/ids";
import { isFieldAnnotation, readAnnotation } from "./annotations";
import { classify, type FieldCandidate } from "./classify";
import { labelForBlock, labelForField, truncate } from "./labels";
import { lockDecision, type LockContext } from "./lock";
import { extractSeo } from "./seo";
import { applySplices, type Splice } from "./splice";
import {
  children,
  domPathOf,
  findAll,
  findFirst,
  fingerprintOf,
  getAttr,
  innerRange,
  normalized,
  parseHtml,
  tagName,
  textContent,
  type Element,
  elementRange,
} from "./tree";

/**
 * Analyse d'une page : de l'arbre parse5 aux blocs, champs et collections du §9.7.
 *
 * Le parcours est en profondeur et **post-ordre pour les conteneurs** : on ne
 * décide qu'un élément est un champ qu'après avoir constaté que rien d'éditable
 * ne vit en dessous. C'est ce qui évite le pire des faux positifs — un `<div>`
 * entier proposé comme « texte », dont l'édition écraserait tout le sous-arbre.
 */

const BALISES_TECHNIQUES = new Set(["script", "style", "noscript", "template"]);
const BALISES_HORS_COLLECTION = new Set([
  "body",
  "main",
  "html",
  "head",
  "section",
  "header",
  "footer",
  "nav",
  "article",
  // Les lignes d'un formulaire ont la forme d'une collection ; les rendre
  // ajoutables produirait des champs de saisie sans nom ni traitement.
  "form",
  "fieldset",
]);
const MEMBRES_INTERDITS = new Set([
  "section",
  "main",
  "body",
  "html",
  "head",
  "header",
  "footer",
  "nav",
]);
const MULTILIGNE = new Set(["p", "blockquote", "dd", "figcaption", "li", "td"]);

export interface PageOptions {
  path: string;
  html: string;
  entry: string;
  lockContext: LockContext;
  overrides: Readonly<Record<string, FieldOverride>>;
  similarityThreshold?: number;
  shapeFloor?: number;
  /** Fichiers présents dans le dépôt, pour signaler les images manquantes. */
  knownFiles: ReadonlySet<string>;
}

export interface FieldEntry {
  element: Element;
  field: Field;
}

interface Sink {
  fields: FieldEntry[];
  collections: Collection[];
}

export interface PageResult {
  page: Page;
  entries: FieldEntry[];
  locked: LockedNode[];
  warnings: BlueprintWarning[];
  anchorTargets: ReadonlySet<string>;
  blocksById: ReadonlyMap<string, Element>;
  stats: { fields: number; images: number; collections: number };
}

function ratio(largeur?: number, hauteur?: number): string | undefined {
  if (largeur === undefined || hauteur === undefined) return undefined;
  const pgcd = (a: number, b: number): number => (b === 0 ? a : pgcd(b, a % b));
  const diviseur = pgcd(largeur, hauteur);
  return `${largeur / diviseur}/${hauteur / diviseur}`;
}

function ancestorTags(element: Element): string[] {
  const balises: string[] = [];
  let courant = element.parentNode;
  while (courant !== null && courant !== undefined && "tagName" in courant) {
    balises.push((courant as Element).tagName.toLowerCase());
    courant = (courant as Element).parentNode;
  }
  return balises;
}

export function analyzePage(options: PageOptions): PageResult {
  return new PageWalker(options).run();
}

class PageWalker {
  private readonly seuil: number;
  private readonly plancher: number;
  private readonly locked: LockedNode[] = [];
  private readonly warnings: BlueprintWarning[] = [];
  private readonly blocks: Block[] = [];
  private readonly entries: FieldEntry[] = [];
  private readonly blocksById = new Map<string, Element>();
  private readonly anchorTargets = new Set<string>();
  private compteurItem = 0;
  private titreDuBloc: string | null = null;

  constructor(private readonly options: PageOptions) {
    this.seuil = options.similarityThreshold ?? DEFAULT_COLLECTION_SIMILARITY_THRESHOLD;
    this.plancher = options.shapeFloor ?? DEFAULT_COLLECTION_SHAPE_FLOOR;
  }

  run(): PageResult {
    const document = parseHtml(this.options.html);
    const html = findFirst(document, (element) => tagName(element) === "html");
    const head = html === null ? null : findFirst(html, (e) => tagName(e) === "head");
    const body = html === null ? null : findFirst(html, (e) => tagName(e) === "body");

    if (html !== null && html.sourceCodeLocation?.startTag === undefined) {
      this.warn(
        "FRAGMENT_SANS_HTML",
        "Ce fichier est un fragment : il n'a pas de balise <html>. Les champs restent détectés, mais la page ne peut pas être servie telle quelle.",
        "attention",
      );
    }

    if (head !== null) this.inspectHead(head);
    if (body !== null) {
      this.collectAnchors(body);
      this.markDynamic(body);
      for (const racine of this.blockRoots(body)) this.walkBlockRoot(racine);
    }

    const seo = extractSeo(html, head);

    return {
      page: {
        path: this.options.path,
        label: seo.title.length > 0 ? seo.title : this.options.path,
        virtual: false,
        seo,
        blocks: this.blocks,
      },
      entries: this.entries,
      locked: this.locked,
      warnings: this.warnings,
      anchorTargets: this.anchorTargets,
      blocksById: this.blocksById,
      stats: {
        fields: this.entries.length,
        images: this.entries.filter((entree) => entree.field.type === "image").length,
        collections: this.blocks.reduce(
          (total, bloc) => total + bloc.collections.length,
          0,
        ),
      },
    };
  }

  /* ── Repérages préalables ────────────────────────────────────────────────── */

  private inspectHead(head: Element): void {
    for (const script of findAll(head, (element) => tagName(element) === "script")) {
      const src = getAttr(script, "src") ?? "";
      if (src.includes("cdn.tailwindcss.com")) {
        this.warn(
          "TAILWIND_CDN",
          "Tailwind est servi par CDN : les classes utilitaires ne sont jamais modifiées, et le thème se limite à ce que la configuration déclare.",
        );
      }
    }
  }

  /**
   * Consigne tous les éléments dont un script écrit le texte, avant le parcours.
   *
   * Sans cette passe, un élément dynamique niché dans un texte enrichi ne serait
   * jamais visité — le parent est classé d'un bloc — et le rapport d'ingestion
   * tairait justement ce que l'admin doit savoir.
   */
  private markDynamic(body: Element): void {
    for (const correspond of this.options.lockContext.dynamicMatchers) {
      for (const element of findAll(body, correspond)) {
        this.lock(
          element,
          "texte-dynamique",
          "Contenu écrit par un script au chargement de la page.",
        );
      }
    }
  }

  private collectAnchors(body: Element): void {
    for (const lien of findAll(body, (element) => tagName(element) === "a")) {
      const href = getAttr(lien, "href") ?? "";
      if (href.startsWith("#") && href.length > 1) this.anchorTargets.add(href.slice(1));
    }
  }

  /**
   * Racines de blocs : les enfants directs du `<body>`, en dépliant `<main>` en
   * ses sections quand il en a. Un bloc est ce que le client verra comme « une
   * partie de la page » dans l'arbre d'édition.
   */
  private blockRoots(body: Element): Element[] {
    const racines: Element[] = [];
    for (const enfant of children(body)) {
      if (BALISES_TECHNIQUES.has(tagName(enfant))) continue;
      const sections = children(enfant).filter((petit) => tagName(petit) === "section");
      if (tagName(enfant) === "main" && sections.length > 0) {
        racines.push(
          ...children(enfant).filter((petit) => !BALISES_TECHNIQUES.has(tagName(petit))),
        );
      } else {
        racines.push(enfant);
      }
    }
    return racines;
  }

  /* ── Blocs ───────────────────────────────────────────────────────────────── */

  private walkBlockRoot(racine: Element): void {
    const titre = findFirst(racine, (element) => /^h[1-6]$/u.test(tagName(element)));
    this.titreDuBloc = titre === null ? null : normalized(textContent(titre));

    const sink: Sink = { fields: [], collections: [] };
    this.processNode(racine, sink);
    this.emitBlock(racine, sink);
    this.titreDuBloc = null;
  }

  private emitBlock(racine: Element, sink: Sink): void {
    if (sink.fields.length === 0 && sink.collections.length === 0) return;

    const domPath = domPathOf(racine);
    const id = computeBlockId(this.options.path, domPath);
    const titre = findFirst(racine, (element) => /^h[1-6]$/u.test(tagName(element)));
    const annotation = readAnnotation(racine);

    const balise = tagName(racine);
    const structurel = balise === "header" || balise === "footer" || balise === "nav";

    this.blocks.push({
      id,
      label:
        annotation?.label ??
        labelForBlock(racine, titre === null ? null : textContent(titre)),
      domPath,
      capabilities: structurel
        ? []
        : (["hide", "reorder", "duplicate"] satisfies BlockCapability[]),
      fields: sink.fields.map((entree) => entree.field),
      collections: sink.collections,
    });
    this.blocksById.set(id, racine);
    this.entries.push(...sink.fields);
  }

  /* ── Parcours ────────────────────────────────────────────────────────────── */

  private processNode(element: Element, sink: Sink): void {
    const annotation = readAnnotation(element);

    if (annotation?.role === "lock") {
      this.lock(element, "annotation", 'data-calque="lock"');
      return;
    }

    const verrou = lockDecision(element, this.options.lockContext);
    if (verrou !== null && annotation === null) {
      this.lock(element, verrou.reason, verrou.detail);
      return;
    }

    if (annotation?.role === "group") {
      const interne: Sink = { fields: [], collections: [] };
      this.processContainer(element, interne);
      this.emitBlock(element, interne);
      return;
    }

    const candidat =
      annotation !== null && isFieldAnnotation(annotation)
        ? (classify(element, this.contexte()) ??
          this.candidatParDefaut(annotation.role, element))
        : classify(element, this.contexte());

    if (candidat !== null) {
      sink.fields.push(this.makeField(element, candidat));
      if (!candidat.descend) return;
    }

    this.processContainer(element, sink);
  }

  private processContainer(container: Element, sink: Sink): void {
    const enfants = children(container).filter(
      (enfant) => !BALISES_TECHNIQUES.has(tagName(enfant)),
    );
    if (enfants.length === 0) return;

    const parcourus = new Map<Element, Sink>();
    const consommes = new Set<Element>();

    for (const groupe of this.detectGroups(container, enfants)) {
      for (const membre of groupe) {
        if (!parcourus.has(membre)) {
          const interne: Sink = { fields: [], collections: [] };
          this.processNode(membre, interne);
          parcourus.set(membre, interne);
        }
      }

      const contenus = groupe.map((membre) => parcourus.get(membre) as Sink);

      // §9.3.3 : chaque membre doit porter au moins un champ éditable.
      if (contenus.some((contenu) => contenu.fields.length === 0)) continue;
      // Un item de collection est un *composant* répété. Deux paragraphes de
      // prose voisins ont la même empreinte sans former une liste : les rendre
      // ajoutables offrirait au client un bouton « ajouter un paragraphe » là
      // où il n'y a qu'un texte suivi.
      if (groupe.some((membre) => children(membre).length === 0)) continue;
      // Une collection imbriquée serait perdue : les items ne portent que des
      // valeurs. On préfère garder la collection intérieure.
      if (contenus.some((contenu) => contenu.collections.length > 0)) continue;

      const motif = this.navigationReason(container, groupe);
      if (motif !== null) {
        this.lock(container, "navigation", motif);
        continue;
      }

      const collection = this.buildCollection(container, groupe, contenus);
      if (collection === null) continue;

      sink.collections.push(collection);
      for (const membre of groupe) consommes.add(membre);
    }

    for (const enfant of enfants) {
      if (consommes.has(enfant)) continue;
      const deja = parcourus.get(enfant);
      if (deja !== undefined) {
        sink.fields.push(...deja.fields);
        sink.collections.push(...deja.collections);
      } else {
        this.processNode(enfant, sink);
      }
    }
  }

  /* ── Collections (§9.3) ──────────────────────────────────────────────────── */

  private detectGroups(container: Element, enfants: Element[]): Element[][] {
    if (BALISES_HORS_COLLECTION.has(tagName(container))) {
      const force = readAnnotation(container)?.role === "collection";
      if (!force) return [];
    }

    const groupes: Element[][] = [];
    let courant: Element[] = [];

    const fermer = (): void => {
      if (courant.length >= 2) groupes.push(courant);
      courant = [];
    };

    for (const enfant of enfants) {
      if (MEMBRES_INTERDITS.has(tagName(enfant))) {
        fermer();
        continue;
      }
      const premier = courant[0];
      if (premier === undefined) {
        courant = [enfant];
        continue;
      }
      const reference = fingerprintOf(premier);
      const candidat = fingerprintOf(enfant);
      const similarite = fingerprintSimilarity(reference, candidat);
      const forme = fingerprintShapeSimilarity(reference, candidat);

      if (similarite >= this.seuil && forme >= this.plancher) {
        courant.push(enfant);
      } else {
        fermer();
        courant = [enfant];
      }
    }
    fermer();

    return groupes;
  }

  /**
   * Faux positifs du §9.3.7 : un menu, un fil d'Ariane, une liste de mentions
   * légales ont exactement la forme d'une collection. Les rendre modifiables
   * casserait la navigation du site.
   */
  private navigationReason(container: Element, groupe: Element[]): string | null {
    const ancetres = [tagName(container), ...ancestorTags(container)];
    if (ancetres.includes("nav") || ancetres.includes("footer")) {
      return "Groupe répété dans la navigation ou le pied de page : verrouillé par défaut, déverrouillable par l'admin (§9.3).";
    }

    const uniquementDesLiens = groupe.every((membre) => {
      const liens = findAll(membre, (element) => tagName(element) === "a");
      if (liens.length !== 1) return false;
      if (findAll(membre, (element) => tagName(element) === "img").length > 0)
        return false;
      return normalized(textContent(membre)).length <= 40;
    });

    return uniquementDesLiens
      ? "Suite de liens courts — menu, fil d'Ariane ou mentions : la rendre modifiable casserait la navigation (§9.3)."
      : null;
  }

  private buildCollection(
    container: Element,
    groupe: Element[],
    contenus: Sink[],
  ): Collection | null {
    const containerPath = domPathOf(container);
    const annotation = readAnnotation(container);

    // §9.3.4 dit « le premier item ». On prend le plus riche : sur une
    // collection hétérogène, le premier peut être le plus pauvre, et le gabarit
    // serait alors incapable d'exprimer les champs des autres.
    let indiceModele = 0;
    for (let i = 1; i < contenus.length; i += 1) {
      if (
        (contenus[i] as Sink).fields.length >
        (contenus[indiceModele] as Sink).fields.length
      ) {
        indiceModele = i;
      }
    }

    const modele = groupe[indiceModele] as Element;
    const entreesModele = (contenus[indiceModele] as Sink).fields;
    if (entreesModele.length === 0) return null;

    const cheminModele = domPathOf(modele);
    const clefs = entreesModele.map((_, index) => `f${index + 1}`);

    const champsGabarit: TemplateField[] = entreesModele.map((entree, index) => ({
      key: clefs[index] as string,
      type: entree.field.type,
      label: entree.field.label,
      constraints: { ...entree.field.constraints },
    }));

    const items: CollectionItem[] = groupe.map((membre, index) => {
      const contenu = contenus[index] as Sink;
      const cheminMembre = domPathOf(membre);
      const values: Record<string, unknown> = {};
      const valueMeta: CollectionItem["valueMeta"] = {};
      const utilisees = new Set<number>();
      const relatif = (entree: FieldEntry, racine: string): string =>
        entree.field.domPath.slice(racine.length + 3);

      // Premier passage : correspondance exacte par chemin relatif. C'est le cas
      // ordinaire, y compris quand un item porte un élément en plus.
      const affectations = new Array<number>(entreesModele.length).fill(-1);
      for (const [rang, gabarit] of entreesModele.entries()) {
        const attendu = relatif(gabarit, cheminModele);
        const trouve = contenu.fields.findIndex(
          (entree, position) =>
            !utilisees.has(position) && relatif(entree, cheminMembre) === attendu,
        );
        if (trouve !== -1) {
          affectations[rang] = trouve;
          utilisees.add(trouve);
        }
      }

      // Second passage, **dans l'ordre** : les emplacements restés vides
      // prennent le champ suivant compatible, sans jamais croiser une
      // affectation déjà faite. C'est le cas de la galerie où trois items
      // utilisent <picture> et le quatrième un <img> : même rôle, chemin
      // différent. Un appariement par simple rang de type décalerait tout dès
      // qu'un item porte un badge en plus.
      for (const [rang, gabarit] of entreesModele.entries()) {
        if (affectations[rang] !== -1) continue;

        const plancher = Math.max(
          -1,
          ...affectations.slice(0, rang).filter((position) => position !== -1),
        );
        const plafond = affectations
          .slice(rang + 1)
          .filter((position) => position !== -1)
          .reduce(
            (minimum, position) => Math.min(minimum, position),
            Number.POSITIVE_INFINITY,
          );

        const trouve = contenu.fields.findIndex(
          (entree, position) =>
            !utilisees.has(position) &&
            position > plancher &&
            position < plafond &&
            memeForme(entree.field.type, gabarit.field.type),
        );
        if (trouve !== -1) {
          affectations[rang] = trouve;
          utilisees.add(trouve);
        }
      }

      for (const [rang, position] of affectations.entries()) {
        if (position === -1) continue;
        const entree = contenu.fields[position] as FieldEntry;
        const clef = clefs[rang] as string;
        values[clef] = entree.field.value;
        valueMeta[clef] = {
          domPath: entree.field.domPath,
          ...(entree.field.meta.contentHash !== undefined
            ? { contentHash: entree.field.meta.contentHash }
            : {}),
          ...(entree.field.meta.sourceRange !== undefined
            ? { sourceRange: entree.field.meta.sourceRange }
            : {}),
          ...(entree.field.meta.valueRanges !== undefined
            ? { valueRanges: entree.field.meta.valueRanges }
            : {}),
        };
      }

      this.compteurItem += 1;
      return {
        itemId: `itm_${String(this.compteurItem).padStart(3, "0")}`,
        values,
        valueMeta,
        meta: {
          fingerprint: fingerprintOf(membre),
          contentHash: computeContentHash(textContent(membre)),
          ...(elementRange(membre) !== undefined
            ? { sourceRange: elementRange(membre) }
            : {}),
        },
      };
    });

    const libelle = annotation?.label ?? this.labelForCollection(container, groupe);
    const cohesion = moyenneDesSimilarites(groupe.map(fingerprintOf));
    if (cohesion < 1) {
      this.warn(
        "COLLECTION_HETEROGENE",
        `« ${libelle} » : les éléments ne sont pas tous identiques. Un ajout reprendra la forme du plus complet.`,
        "info",
        containerPath,
      );
    }

    // Les champs happés par la collection restent des champs : ils alimentent
    // les panneaux globaux et la mesure du rappel, même s'ils ne figurent pas
    // dans `block.fields`.
    for (const contenu of contenus) this.entries.push(...contenu.fields);

    return {
      id: computeCollectionId(this.options.path, containerPath),
      label: libelle,
      containerPath,
      itemSignature: fingerprintOf(modele),
      cohesion: Number(cohesion.toFixed(3)),
      min: 1,
      max: annotation?.max ?? Math.max(12, groupe.length * 2),
      locked: false,
      itemTemplate: {
        html: this.buildTemplateHtml(modele, entreesModele, clefs),
        fields: champsGabarit,
      },
      items,
    };
  }

  /**
   * Le gabarit est **découpé dans le source**, pas resérialisé : un item ajouté
   * porte ainsi exactement les mêmes classes et le même formatage que ses
   * voisins, ce que le §22 P7 exige (« correctement stylée »).
   */
  private buildTemplateHtml(
    modele: Element,
    entrees: FieldEntry[],
    clefs: string[],
  ): string {
    const etendue = elementRange(modele);
    if (etendue === undefined) return "";

    const source = this.options.html;
    const splices: Splice[] = [];

    for (const [index, entree] of entrees.entries()) {
      const clef = clefs[index] as string;
      const debutBalise = entree.element.sourceCodeLocation?.startTag;
      if (debutBalise !== undefined) {
        const apresNom = debutBalise.startOffset + 1 + tagName(entree.element).length;
        splices.push({
          startOffset: apresNom,
          endOffset: apresNom,
          replacement: ` data-f="${clef}"`,
        });
      }

      for (const [partie, plage] of Object.entries(entree.field.meta.valueRanges ?? {})) {
        splices.push({
          startOffset: plage.startOffset,
          endOffset: plage.endOffset,
          replacement: partie === "href" ? "#" : "",
        });
      }
    }

    const complet = applySplices(source, splices);
    const decalage = complet.length - source.length;
    return complet.slice(etendue.startOffset, etendue.endOffset + decalage).trim();
  }

  /**
   * Nommage d'une collection (§9.3.5).
   *
   * La classe du conteneur d'abord — `grille-plats`, `horaires`, `galerie` sont
   * écrites par la personne qui a fait le site et disent ce que c'est. À défaut
   * — un site Tailwind n'a que des classes utilitaires — le titre de la section
   * qui l'englobe : « Questions fréquentes » vaut mieux que « Liste de 4 ».
   */
  private labelForCollection(container: Element, groupe: Element[]): string {
    // Les lignes d'un tableau tirent leur nom de la légende : « Entrées »,
    // « Plats », « Desserts » — trois collections dans une même section.
    if (tagName(container) === "tbody") {
      const table = container.parentNode;
      if (table !== null && "tagName" in table) {
        const legende = findFirst(table as Element, (e) => tagName(e) === "caption");
        if (legende !== null) return truncate(textContent(legende));
      }
    }

    const base = labelForBlock(container, null);
    const generique = base === "Section" || base === "Élément éditable";
    if (!generique) return base;
    if (this.titreDuBloc !== null) return this.titreDuBloc;
    return `Liste de ${groupe.length} éléments`;
  }

  /* ── Champs ──────────────────────────────────────────────────────────────── */

  private contexte(): { entry: string; pagePath: string; source: string } {
    return {
      entry: this.options.entry,
      pagePath: this.options.path,
      source: this.options.html,
    };
  }

  private candidatParDefaut(type: FieldType, element: Element): FieldCandidate | null {
    if (type !== "text" && type !== "richtext") return null;
    const texte = normalized(textContent(element));
    if (texte.length === 0) return null;
    return {
      type,
      value: texte,
      valueRanges:
        innerRange(element) !== undefined ? { text: innerRange(element) as never } : {},
      descend: false,
    };
  }

  private makeField(element: Element, candidat: FieldCandidate): FieldEntry {
    const domPath = domPathOf(element);
    const id = computeFieldId(this.options.path, domPath);
    const annotation = readAnnotation(element);
    const surcharge = this.options.overrides[id];

    const type = this.resolveType(candidat, annotation, surcharge);
    const texte = normalized(textContent(element));
    // Un champ qui reste conteneur — image de fond, formulaire — ne doit pas
    // hériter du texte de tout ce qu'il englobe comme libellé.
    const label =
      annotation?.label ??
      surcharge?.label ??
      labelForField(element, type, candidat.descend ? "" : texte);

    const verrouille = this.shouldLockField(element, type, surcharge);

    const champ = {
      id,
      label,
      domPath,
      locked: verrouille,
      type,
      value: candidat.value,
      constraints: this.constraints(element, type, candidat, annotation?.max),
      meta: {
        fingerprint: fingerprintOf(element),
        contentHash: computeContentHash(texte),
        ...(elementRange(element) !== undefined
          ? { sourceRange: elementRange(element) }
          : {}),
        ...(Object.keys(candidat.valueRanges).length > 0
          ? { valueRanges: candidat.valueRanges }
          : {}),
      },
    } as Field;

    if (verrouille) {
      this.lock(
        element,
        surcharge?.locked === true ? "override-admin" : "navigation",
        surcharge?.locked === true
          ? "Verrouillé par l'admin."
          : "Lien de navigation : sa destination fait la structure du site.",
      );
    }

    return { element, field: champ };
  }

  /** Priorité du §9.6 : annotation explicite > surcharge admin > heuristique. */
  private resolveType(
    candidat: FieldCandidate,
    annotation: ReturnType<typeof readAnnotation>,
    surcharge: FieldOverride | undefined,
  ): FieldType {
    const souhaite =
      annotation !== null && isFieldAnnotation(annotation)
        ? annotation.role
        : surcharge?.type;
    if (souhaite === undefined || souhaite === candidat.type) return candidat.type;
    return compatible(candidat.type, souhaite) ? souhaite : candidat.type;
  }

  /**
   * Un `<a>` de menu reste visible dans l'arbre mais n'est pas modifiable : sa
   * destination *est* la structure du site. Le critère porte sur la balise, pas
   * sur le type — un lien de menu vers la page d'accueil est classé `text`, et
   * serait sinon le seul du menu à rester ouvert à l'édition.
   *
   * Les coordonnées et les réseaux sociaux échappent à ce verrou : ce sont des
   * contenus, où qu'ils soient posés dans la page.
   */
  private shouldLockField(
    element: Element,
    type: FieldType,
    surcharge: FieldOverride | undefined,
  ): boolean {
    if (surcharge?.editable === true) return false;
    if (surcharge?.locked === true) return true;
    if (tagName(element) !== "a") return false;
    if (type === "contact" || type === "social") return false;

    const ancetres = ancestorTags(element);
    if (ancetres.includes("nav")) return true;
    return (
      ancetres.includes("footer") && (ancetres.includes("ul") || ancetres.includes("ol"))
    );
  }

  private constraints(
    element: Element,
    type: FieldType,
    candidat: FieldCandidate,
    maxAnnote: number | undefined,
  ): Record<string, unknown> {
    if (type === "text" || type === "contact") {
      const longueur = normalized(textContent(element)).length;
      return {
        maxLength: maxAnnote ?? Math.max(24, Math.round(longueur * 1.6)),
        multiline: MULTILIGNE.has(tagName(element)) && longueur > 60,
      };
    }
    if (type === "richtext") {
      return maxAnnote === undefined ? {} : { maxLength: maxAnnote };
    }
    if (type === "image") {
      const valeur = candidat.value as { width?: number; height?: number };
      const format = ratio(valeur.width, valeur.height);
      return {
        ...(format === undefined ? {} : { aspectRatio: format }),
        ...(candidat.constraints ?? {}),
      };
    }
    return candidat.constraints ?? {};
  }

  /* ── Journal ─────────────────────────────────────────────────────────────── */

  private lock(element: Element, reason: LockedNode["reason"], detail?: string): void {
    const domPath = domPathOf(element);
    if (
      this.locked.some((verrou) => verrou.domPath === domPath && verrou.reason === reason)
    ) {
      return;
    }
    this.locked.push({ domPath, reason, ...(detail === undefined ? {} : { detail }) });
  }

  private warn(
    code: BlueprintWarning["code"],
    message: string,
    severity: BlueprintWarning["severity"] = "info",
    domPath?: string,
  ): void {
    if (
      this.warnings.some(
        (avertissement) =>
          avertissement.code === code && avertissement.domPath === domPath,
      )
    ) {
      return;
    }
    this.warnings.push({
      code,
      message,
      severity,
      pagePath: this.options.path,
      ...(domPath === undefined ? {} : { domPath }),
    });
  }
}

/* ── Utilitaires ───────────────────────────────────────────────────────────── */

const FAMILLES_COMPATIBLES: ReadonlyArray<ReadonlySet<FieldType>> = [
  new Set<FieldType>(["text", "richtext", "contact"]),
  new Set<FieldType>(["link", "cta", "social"]),
  new Set<FieldType>(["image"]),
  new Set<FieldType>(["video-embed", "map-embed"]),
];

function compatible(depuis: FieldType, vers: FieldType): boolean {
  return FAMILLES_COMPATIBLES.some((famille) => famille.has(depuis) && famille.has(vers));
}

/**
 * Deux types partagent-ils la *forme de valeur* ? Un emplacement de gabarit ne
 * peut accueillir un champ que si la valeur a la même forme : une chaîne pour
 * `text`/`richtext`/`contact`, un objet lien pour `link`/`cta`, et ainsi de
 * suite. Sans cette contrainte, l'éditeur afficherait un objet dans un champ de
 * saisie de texte.
 */
const FORMES_DE_VALEUR: ReadonlyArray<ReadonlySet<FieldType>> = [
  new Set<FieldType>(["text", "richtext", "contact"]),
  new Set<FieldType>(["link", "cta"]),
  new Set<FieldType>(["image"]),
  new Set<FieldType>(["social"]),
  new Set<FieldType>(["video-embed"]),
  new Set<FieldType>(["map-embed"]),
  new Set<FieldType>(["icon"]),
  new Set<FieldType>(["form-endpoint"]),
  new Set<FieldType>(["boolean"]),
];

function memeForme(a: FieldType, b: FieldType): boolean {
  return FORMES_DE_VALEUR.some((famille) => famille.has(a) && famille.has(b));
}

export function moyenneDesSimilarites(empreintes: readonly string[]): number {
  if (empreintes.length < 2) return 1;
  let total = 0;
  let paires = 0;
  for (let i = 0; i < empreintes.length; i += 1) {
    for (let j = i + 1; j < empreintes.length; j += 1) {
      total += fingerprintSimilarity(empreintes[i] as string, empreintes[j] as string);
      paires += 1;
    }
  }
  return paires === 0 ? 1 : total / paires;
}
