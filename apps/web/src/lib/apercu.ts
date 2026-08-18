import type {
  Blueprint,
  ContentData,
  SourceFile,
  SourceSnapshot,
} from "@calque/blueprint";
import type { SourceManifest } from "@calque/db";
import { build } from "@calque/builder";
import { keys, type ObjectStore } from "@calque/storage";

/**
 * Fabrique l'aperçu d'un site : source immuable + calque de contenu → HTML servi
 * dans l'iframe d'édition (§11).
 *
 * C'est exactement la fonction de publication, avec `injectEditorRuntime`. Rien
 * n'est simulé : ce que le client voit dans l'aperçu est ce qui sera publié, au
 * runtime d'édition près.
 */

export function snapshotDepuisManifeste(
  store: ObjectStore,
  siteId: string,
  siteVersionId: string,
  manifest: SourceManifest,
  contenus: ReadonlyMap<string, Uint8Array>,
): SourceSnapshot {
  const fichiers: SourceFile[] = manifest.files.map((fichier) => {
    const contenu = contenus.get(fichier.path);
    return {
      path: fichier.path,
      kind: fichier.kind as SourceFile["kind"],
      bytes: fichier.bytes,
      sha256: fichier.sha256,
      ...(contenu === undefined ? {} : { content: contenu }),
    };
  });

  return {
    entry: manifest.entry,
    files: fichiers,
    read: (path) => store.get(keys.source(siteId, siteVersionId, path)),
  };
}

/** Charge les fichiers textuels d'une version : parser et builder en ont besoin. */
export async function chargerTextes(
  store: ObjectStore,
  siteId: string,
  siteVersionId: string,
  manifest: SourceManifest,
): Promise<Map<string, Uint8Array>> {
  const contenus = new Map<string, Uint8Array>();
  const textuels = manifest.files.filter((fichier) =>
    ["page", "style", "script"].includes(fichier.kind),
  );

  await Promise.all(
    textuels.map(async (fichier) => {
      contenus.set(
        fichier.path,
        await store.get(keys.source(siteId, siteVersionId, fichier.path)),
      );
    }),
  );

  return contenus;
}

export interface ConfigurationRuntime {
  fields: Array<{
    fieldId: string;
    domPath: string;
    type: string;
    fingerprint?: string;
    contentHash?: string;
  }>;
  parentOrigin: string;
  labels: Record<string, string>;
}

/**
 * Descripteurs de champs remis au runtime.
 *
 * Les valeurs de collection y figurent aussi : sans elles, le client ne pourrait
 * pas cliquer sur le titre d'une carte, qui est pourtant ce qu'il modifie le
 * plus souvent.
 */
export function configurationRuntime(
  blueprint: Blueprint,
  parentOrigin: string,
): ConfigurationRuntime {
  const fields: ConfigurationRuntime["fields"] = [];
  const labels: Record<string, string> = {};

  for (const page of blueprint.pages) {
    if (page.virtual) continue;
    for (const bloc of page.blocks) {
      for (const champ of bloc.fields) {
        if (champ.locked) continue;
        fields.push({
          fieldId: champ.id,
          domPath: champ.domPath,
          type: champ.type,
          ...(champ.meta.fingerprint === undefined
            ? {}
            : { fingerprint: champ.meta.fingerprint }),
          ...(champ.meta.contentHash === undefined
            ? {}
            : { contentHash: champ.meta.contentHash }),
        });
        labels[champ.id] = champ.label;
      }

      for (const collection of bloc.collections) {
        const types = new Map(
          collection.itemTemplate.fields.map((champ) => [champ.key, champ]),
        );
        for (const item of collection.items) {
          for (const [clef, localisation] of Object.entries(item.valueMeta)) {
            const gabarit = types.get(clef);
            if (gabarit === undefined) continue;
            const identifiant = `${item.itemId}.${clef}`;
            fields.push({
              fieldId: identifiant,
              domPath: localisation.domPath,
              type: gabarit.type,
              ...(localisation.contentHash === undefined
                ? {}
                : { contentHash: localisation.contentHash }),
            });
            labels[identifiant] = `${collection.label} — ${gabarit.label}`;
          }
        }
      }
    }
  }

  return { fields, parentOrigin, labels };
}

export interface ApercuInput {
  store: ObjectStore;
  siteId: string;
  siteVersionId: string;
  manifest: SourceManifest;
  blueprint: Blueprint;
  content: ContentData;
  runtimeUrl: string;
  parentOrigin: string;
}

export async function construireApercu(
  input: ApercuInput,
): Promise<Map<string, Uint8Array>> {
  const contenus = await chargerTextes(
    input.store,
    input.siteId,
    input.siteVersionId,
    input.manifest,
  );
  const snapshot = snapshotDepuisManifeste(
    input.store,
    input.siteId,
    input.siteVersionId,
    input.manifest,
    contenus,
  );

  const resultat = await build(snapshot, input.blueprint, input.content, {
    pagesOnly: true,
    injectEditorRuntime: true,
    editorRuntimeUrl: input.runtimeUrl,
    editorConfig: configurationRuntime(input.blueprint, input.parentOrigin),
  });

  return new Map(resultat.files.map((fichier) => [fichier.path, fichier.content]));
}
