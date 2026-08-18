import type { Blueprint, FieldOverride, LabelPatch } from "./schema";
import type { ContentData } from "./types";

/**
 * `SiteAdapter` — l'interface commune derrière laquelle parser et builder sont
 * interchangeables (§24).
 *
 * En v1, un seul adaptateur est implémenté : `StaticHtmlAdapter` (P2/P3).
 * La v2 ajoutera un adaptateur pour les sites avec build step (Next, Vite) qui
 * remplacera l'analyse HTML par un rendu statique préalable et la publication
 * par un commit + build CI — sans toucher au blueprint ni à l'éditeur.
 *
 * L'interface est définie maintenant, avant d'écrire la moindre ligne de parser,
 * pour que P2 et P3 naissent derrière elle plutôt que d'être refactorés après.
 */

/* ── Fichiers ──────────────────────────────────────────────────────────────── */

export type SourceFileKind = "page" | "style" | "script" | "asset" | "font" | "autre";

export interface SourceFile {
  /** Chemin relatif POSIX depuis la racine du site : `assets/hero.jpg`. */
  path: string;
  kind: SourceFileKind;
  bytes: number;
  sha256: string;
  /** Contenu brut. Absent pour les binaires volumineux, lus à la demande. */
  content?: Uint8Array;
}

export interface SourceSnapshot {
  /** Page d'entrée : `index.html` racine, sinon la plus haute dans l'arbre (§8). */
  entry: string;
  files: readonly SourceFile[];
  /** Lecture paresseuse d'un fichier absent de `files[].content`. */
  read(path: string): Promise<Uint8Array>;
}

export interface OutputFile {
  path: string;
  content: Uint8Array;
}

/* ── Capacités déclarées par l'adaptateur ──────────────────────────────────── */

export interface AdapterCapabilities {
  /** Le builder garantit l'identité byte-à-byte sur un contenu inchangé (§15). */
  byteIdenticalRebuild: boolean;
  collections: boolean;
  themeTokens: boolean;
  blockDuplication: boolean;
  /** L'aperçu peut être servi sans étape de build. */
  livePreview: boolean;
}

/* ── Analyse ───────────────────────────────────────────────────────────────── */

export interface AnalyzeOptions {
  /** Seuil de regroupement des collections. Voir `fingerprintSimilarity`. */
  collectionSimilarityThreshold?: number;
  /** Plancher de similarité de forme, sous lequel aucun groupe ne se forme. */
  collectionShapeFloor?: number;
  /** Surcharges admin persistées, indexées par `fieldId` (§9.6). */
  fieldOverrides?: Readonly<Record<string, FieldOverride>>;
  /** Horodatage injecté, pour rendre l'analyse reproductible en test. */
  now?: Date;
}

export interface AnalyzeResult {
  blueprint: Blueprint;
  stats: {
    pages: number;
    fields: number;
    images: number;
    collections: number;
    lockedNodes: number;
    durationMs: number;
  };
}

/* ── Build ─────────────────────────────────────────────────────────────────── */

export interface BuildOptions {
  /** Réécriture des URLs médias vers le CDN (§15, étape 6). */
  mediaBaseUrl?: string;
  /** Injecte le runtime éditeur. Vrai en aperçu, TOUJOURS faux en publication. */
  injectEditorRuntime?: boolean;
  editorRuntimeUrl?: string;
  /** Régénère `sitemap.xml` et `robots.txt` (§15, étape 8). */
  siteUrl?: string;
}

export interface BuildResult {
  files: readonly OutputFile[];
  /** Champs que le builder n'a pas su résoudre. Jamais une écriture au hasard. */
  unresolvedFieldIds: readonly string[];
  stats: {
    filesWritten: number;
    bytesWritten: number;
    durationMs: number;
  };
}

/* ── Réconciliation d'une re-livraison de design (§8) ──────────────────────── */

export type ReconciliationStatus = "conserve" | "nouveau" | "orphelin";

export interface ReconciliationEntry {
  status: ReconciliationStatus;
  /** Identifiant dans l'ancien blueprint. Absent si `nouveau`. */
  previousFieldId?: string;
  /** Identifiant dans le nouveau blueprint. Absent si `orphelin`. */
  nextFieldId?: string;
  label: string;
  /** [0..1]. 1 = match exact par `domPath`. */
  confidence: number;
  reason: "domPath" | "fingerprint+contentHash" | "fingerprint" | "aucun";
}

export interface ReconciliationPlan {
  entries: readonly ReconciliationEntry[];
  summary: { conserves: number; nouveaux: number; orphelins: number };
}

/* ── L'interface ───────────────────────────────────────────────────────────── */

export interface SiteAdapter {
  readonly id: string;
  readonly version: string;
  readonly capabilities: AdapterCapabilities;

  /** Source immuable → blueprint. Ne mute jamais le source (§5). */
  analyze(source: SourceSnapshot, options?: AnalyzeOptions): Promise<AnalyzeResult>;

  /**
   * `build(source, blueprint, contenu) → site_final`, fonction pure (§15).
   *
   * Invariant testé en premier : avec le contenu initial extrait par `analyze`,
   * la sortie est byte-identique au source.
   */
  build(
    source: SourceSnapshot,
    blueprint: Blueprint,
    content: ContentData,
    options?: BuildOptions,
  ): Promise<BuildResult>;

  /** Mapping entre deux blueprints du même site, pour survivre à une v2 du design. */
  reconcile(previous: Blueprint, next: Blueprint): Promise<ReconciliationPlan>;

  /** Applique le calque de libellés produit par l'IA, hors chemin critique. */
  applyLabelPatch(blueprint: Blueprint, patch: LabelPatch): Blueprint;
}
