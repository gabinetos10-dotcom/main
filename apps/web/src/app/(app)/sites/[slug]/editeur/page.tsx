import type { Metadata } from "next";
import { notFound } from "next/navigation";
import {
  draftsRepository,
  getDatabase,
  mediaRepository,
  sitesRepository,
} from "@calque/db";
import { requireContext } from "@/lib/session";
import { Editeur } from "./editeur";
import type {
  BlocVue,
  ChampVue,
  CollectionVue,
  GlobalVue,
  ModeleEditeur,
  PageVue,
} from "./types";

export const metadata: Metadata = { title: "Éditeur" };

/**
 * Prépare le modèle de l'éditeur.
 *
 * Le blueprint entier ne descend pas dans le client : il pèse plusieurs
 * centaines de kilo-octets sur un site multi-pages, dont l'interface n'a que
 * faire. On envoie ce qui s'affiche — libellés, types, contraintes, valeurs — et
 * rien d'autre.
 */
export default async function PageEditeur({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const contexte = await requireContext();
  const handle = await getDatabase();

  const sites = sitesRepository(handle, contexte.org.orgId);
  const site = await sites.bySlug(slug);
  if (site === null) notFound();

  const dernier = await sites.latestBlueprint(site.id);
  const brouillon = await draftsRepository(handle, contexte.org.orgId).get(site.id);
  if (dernier === null || brouillon === null) notFound();

  const medias = await mediaRepository(handle, contexte.org.orgId).list(site.id);

  const pages: PageVue[] = [];
  const blocs: BlocVue[] = [];
  const champs: ChampVue[] = [];
  const collections: CollectionVue[] = [];

  for (const page of dernier.blueprint.pages) {
    if (page.virtual) continue;

    const blocIds: string[] = [];

    for (const bloc of page.blocks) {
      const champIds: string[] = [];
      const collectionIds: string[] = [];

      for (const champ of bloc.fields) {
        if (champ.locked) continue;
        champIds.push(champ.id);
        champs.push({
          id: champ.id,
          label: champ.label,
          type: champ.type,
          pagePath: page.path,
          blocId: bloc.id,
          blocLabel: bloc.label,
          constraints: champ.constraints as Record<string, unknown>,
          valeurInitiale: champ.value,
          dansListe: false,
        });
      }

      for (const collection of bloc.collections) {
        collectionIds.push(collection.id);
        const gabarits = new Map(
          collection.itemTemplate.fields.map((entree) => [entree.key, entree]),
        );

        const items = collection.items.map((item, rang) => {
          const champIdsItem: string[] = [];
          let resume = "";

          for (const clef of Object.keys(item.valueMeta)) {
            const gabarit = gabarits.get(clef);
            if (gabarit === undefined) continue;

            const identifiant = `${item.itemId}.${clef}`;
            champIdsItem.push(identifiant);

            const valeur = brouillon.data.fields[identifiant] ?? item.values[clef];
            if (resume.length === 0 && typeof valeur === "string") resume = valeur;

            champs.push({
              id: identifiant,
              label: `${gabarit.label} ${rang + 1}`,
              type: gabarit.type,
              pagePath: page.path,
              blocId: bloc.id,
              blocLabel: collection.label,
              constraints: gabarit.constraints,
              valeurInitiale: item.values[clef],
              dansListe: true,
              collectionId: collection.id,
            });
          }

          return {
            itemId: item.itemId,
            champIds: champIdsItem,
            resume: resume.slice(0, 60),
          };
        });

        collections.push({
          id: collection.id,
          label: collection.label,
          pagePath: page.path,
          blocId: bloc.id,
          min: collection.min,
          max: collection.max,
          locked: collection.locked,
          items,
          gabarit: collection.itemTemplate.fields.map((entree) => ({
            key: entree.key,
            label: entree.label,
            type: entree.type,
          })),
        });
      }

      if (champIds.length === 0 && collectionIds.length === 0) continue;

      blocIds.push(bloc.id);
      blocs.push({
        id: bloc.id,
        label: bloc.label,
        pagePath: page.path,
        peutMasquer: bloc.capabilities.includes("hide"),
        champIds,
        collectionIds,
      });
    }

    pages.push({
      path: page.path,
      label: page.label.length > 0 ? page.label : page.path,
      blocIds,
      seo: page.seo,
    });
  }

  const globaux: GlobalVue[] = dernier.blueprint.globals.flatMap((groupe) =>
    groupe.fields.map((champ) => ({
      groupeId: groupe.id,
      groupeLabel: groupe.label,
      id: champ.id,
      label: champ.label,
      type: champ.type,
      valeurInitiale: champ.value,
      occurrences: champ.occurrences,
    })),
  );

  const modele: ModeleEditeur = {
    siteId: site.id,
    siteName: site.name,
    slug: site.slug,
    statut: site.status,
    /**
     * L'aperçu pointe la page d'entrée, pas le dossier.
     *
     * `/api/apercu/<id>/` est redirigé sans sa barre finale, et les URL
     * relatives du site — `styles.css`, `assets/photo.jpg` — se résolvent alors
     * un cran trop haut : le site s'affichait sans ses feuilles de style.
     */
    apercuUrl: `/api/apercu/${site.id}/${dernier.manifest.entry}`,
    pages,
    blocs,
    champs,
    collections,
    theme: dernier.blueprint.theme.tokens,
    globaux,
    medias: medias.map((media) => ({
      id: media.id,
      path: media.path,
      alt: media.alt,
      width: media.width,
      height: media.height,
      url: `/api/apercu/${site.id}/${media.path}`,
    })),
    contenu: brouillon.data,
  };

  return <Editeur modele={modele} />;
}
