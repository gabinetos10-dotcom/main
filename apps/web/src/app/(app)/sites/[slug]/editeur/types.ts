import type { ContentData, FieldType, Seo, ThemeToken } from "@calque/blueprint";

/**
 * Modèle passé du serveur au panneau d'édition.
 *
 * Le blueprint entier ne descend pas dans le client : il pèse plusieurs
 * centaines de kilo-octets sur un site multi-pages, dont l'interface n'a que
 * faire. On envoie ce qui s'affiche, et rien d'autre.
 */

export interface ChampVue {
  id: string;
  label: string;
  type: FieldType;
  pagePath: string;
  blocId: string;
  blocLabel: string;
  constraints: Record<string, unknown>;
  valeurInitiale: unknown;
  /** Vrai pour une valeur d'item de liste : l'interface la range sous sa liste. */
  dansListe: boolean;
  collectionId?: string;
}

export interface ItemVue {
  itemId: string;
  /** Identifiants de champs de cet item, dans l'ordre du gabarit. */
  champIds: string[];
  /** Premier texte de l'item : sert d'étiquette dans la liste. */
  resume: string;
}

export interface CollectionVue {
  id: string;
  label: string;
  pagePath: string;
  blocId: string;
  min: number;
  max: number;
  locked: boolean;
  items: ItemVue[];
  gabarit: Array<{ key: string; label: string; type: FieldType }>;
}

export interface BlocVue {
  id: string;
  label: string;
  pagePath: string;
  peutMasquer: boolean;
  champIds: string[];
  collectionIds: string[];
}

export interface PageVue {
  path: string;
  label: string;
  blocIds: string[];
  seo: Seo;
}

export interface MediaVue {
  id: string;
  path: string;
  alt: string;
  width: number | null;
  height: number | null;
  /** URL servie par l'aperçu, pour l'afficher dans la bibliothèque. */
  url: string;
}

export interface GlobalVue {
  groupeId: string;
  groupeLabel: string;
  id: string;
  label: string;
  type: FieldType;
  valeurInitiale: unknown;
  occurrences: string[];
}

export interface ModeleEditeur {
  siteId: string;
  siteName: string;
  slug: string;
  statut: string;
  apercuUrl: string;
  pages: PageVue[];
  blocs: BlocVue[];
  champs: ChampVue[];
  collections: CollectionVue[];
  theme: ThemeToken[];
  globaux: GlobalVue[];
  medias: MediaVue[];
  contenu: ContentData;
}

/** Sections annexes du navigateur de contenu (§12). */
export type SectionAnnexe = "theme" | "contact" | "seo" | "medias";
