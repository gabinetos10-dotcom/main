import type {
  AnalyzeOptions,
  AnalyzeResult,
  Blueprint,
  BuildOptions,
  BuildResult,
  ContentData,
  LabelPatch,
  ReconciliationPlan,
  SiteAdapter,
  SourceSnapshot,
} from "@calque/blueprint";
import { analyze, ADAPTER_ID, PARSER_VERSION } from "@calque/parser";
import { build, BUILDER_VERSION } from "./index";
import { reconcile } from "./reconcile";

/**
 * `StaticHtmlAdapter` — la seule implémentation de `SiteAdapter` en v1 (§24).
 *
 * Elle n'ajoute aucune logique : elle assemble le parser et le builder derrière
 * l'interface, pour que la v2 puisse brancher un adaptateur « site avec build
 * step » sans toucher ni au blueprint ni à l'éditeur.
 */
export function createStaticHtmlAdapter(): SiteAdapter {
  return {
    id: ADAPTER_ID,
    version: `${PARSER_VERSION}+${BUILDER_VERSION}`,

    capabilities: {
      byteIdenticalRebuild: true,
      collections: true,
      themeTokens: true,
      blockDuplication: true,
      livePreview: true,
    },

    analyze(source: SourceSnapshot, options?: AnalyzeOptions): Promise<AnalyzeResult> {
      return analyze(source, options);
    },

    build(
      source: SourceSnapshot,
      blueprint: Blueprint,
      content: ContentData,
      options?: BuildOptions,
    ): Promise<BuildResult> {
      return build(source, blueprint, content, options);
    },

    reconcile(precedent: Blueprint, suivant: Blueprint): Promise<ReconciliationPlan> {
      return Promise.resolve(reconcile(precedent, suivant));
    },

    applyLabelPatch(blueprint: Blueprint, patch: LabelPatch): Blueprint {
      return applyLabelPatch(blueprint, patch);
    },
  };
}

/**
 * Applique le calque de libellés produit par l'IA (§19), hors chemin critique.
 *
 * Le blueprint est reconstruit, jamais muté : c'est un document persisté, et le
 * calque doit pouvoir être rejoué ou annulé sans relancer l'analyse.
 */
export function applyLabelPatch(blueprint: Blueprint, patch: LabelPatch): Blueprint {
  const libelle = (id: string, actuel: string): string => patch.labels[id] ?? actuel;

  return {
    ...blueprint,
    pages: blueprint.pages.map((page) => ({
      ...page,
      blocks: page.blocks.map((bloc) => ({
        ...bloc,
        label: libelle(bloc.id, bloc.label),
        fields: bloc.fields.map((champ) => ({
          ...champ,
          label: libelle(champ.id, champ.label),
        })),
        collections: bloc.collections.map((collection) => ({
          ...collection,
          label: libelle(collection.id, collection.label),
          itemTemplate: {
            ...collection.itemTemplate,
            fields: collection.itemTemplate.fields.map((champ) => ({
              ...champ,
              label: libelle(`${collection.id}.${champ.key}`, champ.label),
            })),
          },
        })),
      })),
    })),
  };
}

export { reconcile, contentRemapping } from "./reconcile";
