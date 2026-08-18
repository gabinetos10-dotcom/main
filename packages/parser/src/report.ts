import type {
  AnalyzeResult,
  Blueprint,
  BlueprintWarning,
  FieldType,
} from "@calque/blueprint";

/**
 * Rapport d'ingestion (§8.5) — le troisième critère d'acceptation du P2 :
 * « rapport lisible ».
 *
 * Il s'adresse à l'admin d'agence, pas au client final, mais reste écrit sans
 * jargon (§21) : ni `domPath`, ni « nœud », ni code d'erreur nu. Chaque
 * avertissement dit ce qui se passe et ce que ça change pour le client.
 */

const LIBELLE_TYPE: Record<FieldType, string> = {
  text: "textes",
  richtext: "textes mis en forme",
  image: "images",
  link: "liens",
  cta: "boutons",
  "video-embed": "vidéos",
  "map-embed": "plans",
  icon: "icônes",
  contact: "coordonnées",
  social: "réseaux sociaux",
  "form-endpoint": "formulaires",
  boolean: "sections masquables",
};

const TITRE_AVERTISSEMENT: Record<BlueprintWarning["code"], string> = {
  DYNAMIC_TEXT: "Texte écrit par un script",
  ANIM_LIB_DETECTED: "Animations au défilement",
  DOM_MUTATED_AT_RUNTIME: "Éléments fabriqués au chargement",
  SHADOW_DOM_DETECTED: "Composant fermé",
  TEXT_SPLITTER_DETECTED: "Titres découpés à l'affichage",
  NO_CSS_VARIABLES: "Pas de variables de couleur",
  COLLECTION_HETEROGENE: "Liste aux éléments inégaux",
  FRAGMENT_SANS_HTML: "Fichier incomplet",
  IMAGE_MANQUANTE: "Image absente",
  FORM_SANS_ENDPOINT: "Formulaire sans destination",
  TAILWIND_CDN: "Tailwind chargé depuis un CDN",
};

export interface ReportOptions {
  /** Nom du site, tel que l'agence le connaît. */
  siteName?: string;
}

function compterParType(blueprint: Blueprint): Map<FieldType, number> {
  const compte = new Map<FieldType, number>();
  const ajouter = (type: FieldType): void =>
    void compte.set(type, (compte.get(type) ?? 0) + 1);

  for (const page of blueprint.pages) {
    for (const bloc of page.blocks) {
      for (const champ of bloc.fields) ajouter(champ.type);
      for (const collection of bloc.collections) {
        for (const item of collection.items) {
          for (const clef of Object.keys(item.valueMeta)) {
            const gabarit = collection.itemTemplate.fields.find(
              (champ) => champ.key === clef,
            );
            if (gabarit !== undefined) ajouter(gabarit.type);
          }
        }
      }
    }
  }

  return compte;
}

function pluriel(nombre: number, singulier: string, pluriel_: string): string {
  return `${nombre} ${nombre > 1 ? pluriel_ : singulier}`;
}

export function renderReport(
  resultat: AnalyzeResult,
  options: ReportOptions = {},
): string {
  const { blueprint, stats } = resultat;
  const lignes: string[] = [];

  const reelles = blueprint.pages.filter((page) => !page.virtual);
  const virtuelles = blueprint.pages.filter((page) => page.virtual);

  lignes.push(options.siteName ?? "Rapport d'analyse");
  lignes.push("=".repeat((options.siteName ?? "Rapport d'analyse").length));
  lignes.push("");
  lignes.push(
    `${pluriel(reelles.length, "page", "pages")} · ` +
      `${pluriel(stats.fields, "élément modifiable", "éléments modifiables")} · ` +
      `${pluriel(stats.collections, "liste", "listes")} · ` +
      `analyse en ${stats.durationMs} ms`,
  );

  if (virtuelles.length > 0) {
    lignes.push(
      `Ce site tient sur une seule page : ses ${virtuelles.length} sections sont présentées au client comme autant de pages.`,
    );
  }

  lignes.push("");
  lignes.push("Ce que le client pourra modifier");
  lignes.push("-".repeat(32));
  const parType = [...compterParType(blueprint).entries()].sort((a, b) => b[1] - a[1]);
  for (const [type, nombre] of parType) {
    lignes.push(`  ${String(nombre).padStart(4)}  ${LIBELLE_TYPE[type]}`);
  }

  lignes.push("");
  lignes.push("Page par page");
  lignes.push("-".repeat(13));
  for (const page of reelles) {
    const champs = page.blocks.reduce((total, bloc) => total + bloc.fields.length, 0);
    const listes = page.blocks.reduce(
      (total, bloc) => total + bloc.collections.length,
      0,
    );
    lignes.push(
      `  ${page.path.padEnd(24)} ${String(page.blocks.length).padStart(2)} section(s), ` +
        `${String(champs).padStart(3)} élément(s), ${listes} liste(s)`,
    );
    for (const bloc of page.blocks) {
      for (const collection of bloc.collections) {
        lignes.push(
          `      • ${collection.label} — ${collection.items.length} élément(s), ` +
            `jusqu'à ${collection.max}`,
        );
      }
    }
  }

  if (blueprint.theme.tokens.length > 0 || blueprint.theme.fonts.length > 0) {
    lignes.push("");
    lignes.push("Couleurs et polices");
    lignes.push("-".repeat(19));
    const deduites = blueprint.theme.tokens.filter((jeton) => jeton.inferred);
    const declarees = blueprint.theme.tokens.filter((jeton) => !jeton.inferred);
    if (declarees.length > 0) {
      lignes.push(`  ${declarees.length} réglage(s) déclaré(s) par le site :`);
      for (const jeton of declarees.slice(0, 10)) {
        lignes.push(`      ${jeton.label.padEnd(26)} ${jeton.value}`);
      }
      if (declarees.length > 10)
        lignes.push(`      … et ${declarees.length - 10} autre(s)`);
    }
    if (deduites.length > 0) {
      lignes.push(
        `  ${deduites.length} couleur(s) déduites du CSS — leur remplacement global reste à activer :`,
      );
      for (const jeton of deduites) {
        lignes.push(
          `      ${jeton.label.padEnd(26)} ${jeton.value} (${jeton.usageCount} usages)`,
        );
      }
    }
    for (const police of blueprint.theme.fonts) {
      lignes.push(`  Police : ${police.family} (${police.source})`);
    }
  }

  lignes.push("");
  lignes.push("Ce qui reste verrouillé");
  lignes.push("-".repeat(23));
  const parRaison = new Map<string, number>();
  for (const verrou of blueprint.locked) {
    parRaison.set(verrou.reason, (parRaison.get(verrou.reason) ?? 0) + 1);
  }
  const EXPLICATION: Record<string, string> = {
    script: "scripts et feuilles de style",
    style: "styles",
    noscript: "contenus de repli",
    head: "en-tête technique de la page",
    decoratif: "éléments purement décoratifs",
    "wrapper-vide": "conteneurs sans contenu propre",
    "texte-trop-court": "textes d'un seul caractère",
    "compteur-anime": "compteurs animés",
    "texte-dynamique": "textes écrits par un script",
    "structure-formulaire": "champs de saisie des formulaires",
    "shadow-dom": "composants dont le contenu est fermé",
    navigation: "menus et listes de liens",
    annotation: "éléments marqués verrouillés dans le code",
    "override-admin": "éléments que vous avez verrouillés",
  };
  for (const [raison, nombre] of [...parRaison.entries()].sort((a, b) => b[1] - a[1])) {
    lignes.push(`  ${String(nombre).padStart(4)}  ${EXPLICATION[raison] ?? raison}`);
  }

  if (blueprint.warnings.length > 0) {
    lignes.push("");
    lignes.push("À savoir avant de livrer au client");
    lignes.push("-".repeat(33));
    const attention = blueprint.warnings.filter((a) => a.severity === "attention");
    const info = blueprint.warnings.filter((a) => a.severity === "info");
    for (const avertissement of [...attention, ...info]) {
      const marque = avertissement.severity === "attention" ? "!" : "·";
      lignes.push(`  ${marque} ${TITRE_AVERTISSEMENT[avertissement.code]}`);
      lignes.push(`    ${avertissement.message}`);
      if (avertissement.pagePath !== undefined) {
        lignes.push(`    (${avertissement.pagePath})`);
      }
    }
  }

  lignes.push("");
  return lignes.join("\n");
}
