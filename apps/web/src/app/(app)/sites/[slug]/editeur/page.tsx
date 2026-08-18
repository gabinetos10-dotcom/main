import type { Metadata } from "next";
import { notFound } from "next/navigation";
import type { ContentData } from "@calque/blueprint";
import { draftsRepository, getDatabase, sitesRepository } from "@calque/db";
import { requireContext } from "@/lib/session";
import { Editeur, type ChampEditeur } from "./editeur";

export const metadata: Metadata = { title: "Éditeur" };

/**
 * Charge le blueprint et le brouillon, puis passe la main au panneau.
 *
 * Le blueprint entier ne descend pas dans le client : seuls les champs, avec
 * leur libellé et leur valeur. Un blueprint de site multi-pages pèse plusieurs
 * centaines de kilo-octets dont l'interface n'a que faire.
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

  const champs: ChampEditeur[] = [];
  const contenu: ContentData = brouillon.data;

  for (const page of dernier.blueprint.pages) {
    if (page.virtual) continue;
    for (const bloc of page.blocks) {
      for (const champ of bloc.fields) {
        if (champ.locked) continue;
        champs.push({
          id: champ.id,
          label: champ.label,
          type: champ.type,
          pagePath: page.path,
          blocLabel: bloc.label,
          value: contenu.fields[champ.id] ?? champ.value,
        });
      }

      for (const collection of bloc.collections) {
        const gabarits = new Map(
          collection.itemTemplate.fields.map((champ) => [champ.key, champ]),
        );
        for (const [rang, item] of collection.items.entries()) {
          for (const clef of Object.keys(item.valueMeta)) {
            const gabarit = gabarits.get(clef);
            if (gabarit === undefined) continue;
            const identifiant = `${item.itemId}.${clef}`;
            champs.push({
              id: identifiant,
              label: `${gabarit.label} ${rang + 1}`,
              type: gabarit.type,
              pagePath: page.path,
              blocLabel: collection.label,
              value: contenu.fields[identifiant] ?? item.values[clef],
            });
          }
        }
      }
    }
  }

  return (
    <Editeur
      siteId={site.id}
      siteName={site.name}
      apercuUrl={`/api/apercu/${site.id}/`}
      champs={champs}
      contenu={contenu}
    />
  );
}
