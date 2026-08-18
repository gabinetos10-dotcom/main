import type {
  Blueprint,
  ContentData,
  SourceFile,
  SourceSnapshot,
} from "@calque/blueprint";
import type { SourceManifest } from "@calque/db";
import { build, itemValueKey } from "@calque/builder";
import { duplicatedFieldId } from "@calque/blueprint/ids";
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
  /** Items de liste, pour les poignées de réordonnancement de l'aperçu (§13). */
  collections: Array<{
    collectionId: string;
    editable: boolean;
    items: Array<{ itemId: string; domPath: string }>;
  }>;
  parentOrigin: string;
  labels: Record<string, string>;
  /**
   * Libellés des poignées de liste.
   *
   * Le runtime est un fichier statique partagé par tous les sites : il ne peut
   * pas embarquer de texte traduit. Les quatre libellés voyagent donc avec la
   * configuration, dans la langue du panneau.
   */
  actions: Record<"up" | "down" | "duplicate" | "remove", string>;
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
  actions: ConfigurationRuntime["actions"],
  content: ContentData,
): ConfigurationRuntime {
  const fields: ConfigurationRuntime["fields"] = [];
  const collections: ConfigurationRuntime["collections"] = [];
  const labels: Record<string, string> = {};

  for (const page of blueprint.pages) {
    if (page.virtual) continue;
    for (const bloc of page.blocks) {
      const nonces = content.blocks[bloc.id]?.duplicates ?? [];

      for (const champ of bloc.fields) {
        if (champ.locked) continue;

        // Un bloc dupliqué n'existe pas dans le blueprint : ses champs portent
        // des identifiants `dup_`, et le builder les marque dans la copie.
        for (const nonce of nonces) {
          const identifiant = duplicatedFieldId(champ.id, nonce);
          fields.push({
            fieldId: identifiant,
            domPath: `[data-calque-field="${identifiant}"]`,
            type: champ.type,
          });
          labels[identifiant] = champ.label;
        }

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
        const etat = content.collections[collection.id];
        const ajoutes = Object.keys(etat?.added ?? {});

        collections.push({
          collectionId: collection.id,
          editable: !collection.locked,
          items: [
            ...collection.items
              .filter((item) => item.domPath !== undefined)
              .map((item) => ({ itemId: item.itemId, domPath: item.domPath as string })),
            // Un item ajouté n'a pas de chemin DOM : il n'existait pas à
            // l'analyse. Le builder lui pose son identifiant, et c'est par là
            // que le runtime le retrouve.
            ...ajoutes.map((itemId) => ({
              itemId,
              domPath: `[data-calque-item="${itemId}"]`,
            })),
          ],
        });

        for (const itemId of ajoutes) {
          for (const gabarit of collection.itemTemplate.fields) {
            const identifiant = itemValueKey(itemId, gabarit.key);
            fields.push({
              fieldId: identifiant,
              domPath: `[data-calque-field="${identifiant}"]`,
              type: gabarit.type,
            });
            labels[identifiant] = `${collection.label} — ${gabarit.label}`;
          }
        }

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

  return { fields, collections, parentOrigin, labels, actions };
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
  actions: ConfigurationRuntime["actions"];
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
    editorConfig: configurationRuntime(
      input.blueprint,
      input.parentOrigin,
      input.actions,
      input.content,
    ),
  });

  return new Map(resultat.files.map((fichier) => [fichier.path, fichier.content]));
}
