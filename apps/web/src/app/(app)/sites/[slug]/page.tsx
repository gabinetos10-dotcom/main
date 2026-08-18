import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import type { BlueprintWarning } from "@calque/blueprint";
import { getDatabase, sitesRepository } from "@calque/db";
import { Card, CardContent } from "@/components/ui/card";
import { requireContext } from "@/lib/session";

export const metadata: Metadata = { title: "Rapport d'analyse" };

/**
 * Rapport d'ingestion destiné à l'admin de l'agence (§8.5).
 *
 * Il répond à une seule question : « qu'est-ce que mon client pourra changer, et
 * qu'est-ce qui restera figé ? » — avant de lui donner accès. Les avertissements
 * y sont en clair, sans code technique.
 */

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

function Chiffre({ valeur, libelle }: { valeur: number; libelle: string }) {
  return (
    <div className="rounded-lg border border-papier-300 bg-white px-4 py-3">
      <p className="titre-display text-2xl tabular-nums">{valeur}</p>
      <p className="mt-0.5 text-[13px] text-encre-500">{libelle}</p>
    </div>
  );
}

export default async function PageRapport({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const contexte = await requireContext();
  const t = await getTranslations("rapport");

  const handle = await getDatabase();
  const sites = sitesRepository(handle, contexte.org.orgId);

  const site = await sites.bySlug(slug);
  if (site === null) notFound();

  const dernier = await sites.latestBlueprint(site.id);
  if (dernier === null) {
    return (
      <>
        <h1 className="titre-display text-3xl">{site.name}</h1>
        <Card className="mt-8">
          <CardContent className="py-12 text-center">
            <p className="text-[15px] font-medium text-encre-800">{t("echec")}</p>
            <p className="mx-auto mt-2 max-w-sm text-[14px] leading-relaxed text-encre-500">
              {t("echecAide")}
            </p>
          </CardContent>
        </Card>
      </>
    );
  }

  const { blueprint } = dernier;
  const reelles = blueprint.pages.filter((page) => !page.virtual);
  const virtuelles = blueprint.pages.filter((page) => page.virtual);

  const champs = reelles.reduce(
    (total, page) => total + page.blocks.reduce((n, bloc) => n + bloc.fields.length, 0),
    0,
  );
  const collections = reelles.reduce(
    (total, page) =>
      total + page.blocks.reduce((n, bloc) => n + bloc.collections.length, 0),
    0,
  );
  const images = reelles.reduce(
    (total, page) =>
      total +
      page.blocks.reduce(
        (n, bloc) => n + bloc.fields.filter((champ) => champ.type === "image").length,
        0,
      ),
    0,
  );

  const attention = blueprint.warnings.filter((a) => a.severity === "attention");
  const infos = blueprint.warnings.filter((a) => a.severity === "info");

  return (
    <>
      <Link
        href="/tableau-de-bord"
        className="text-[13px] text-encre-500 hover:underline"
      >
        ← {t("retour")}
      </Link>

      <h1 className="titre-display mt-4 text-3xl" data-testid="titre-rapport">
        {site.name}
      </h1>
      <p className="mt-2 text-[15px] text-encre-600">
        {t("resume", { pages: reelles.length, champs })}
      </p>

      <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-4" data-testid="chiffres">
        <Chiffre valeur={reelles.length} libelle={t("pages")} />
        <Chiffre valeur={champs} libelle={t("champs")} />
        <Chiffre valeur={images} libelle={t("images")} />
        <Chiffre valeur={collections} libelle={t("listes")} />
      </div>

      {virtuelles.length > 0 && (
        <p className="mt-4 text-[14px] leading-relaxed text-encre-600">
          {t("pagesVirtuelles", { nombre: virtuelles.length })}
        </p>
      )}

      <h2 className="titre-display mt-10 text-xl">{t("pageParPage")}</h2>
      <div className="mt-4 overflow-hidden rounded-lg border border-papier-300 bg-white">
        <table className="w-full text-left text-[14px]">
          <thead className="border-b border-papier-300 bg-papier-100 text-[13px] text-encre-500">
            <tr>
              <th className="px-4 py-2 font-medium">{t("colonnePage")}</th>
              <th className="px-4 py-2 font-medium">{t("colonneSections")}</th>
              <th className="px-4 py-2 font-medium">{t("colonneChamps")}</th>
              <th className="px-4 py-2 font-medium">{t("colonneListes")}</th>
            </tr>
          </thead>
          <tbody>
            {reelles.map((page) => (
              <tr key={page.path} className="border-b border-papier-200 last:border-0">
                <td className="px-4 py-2.5 font-medium text-encre-800">{page.path}</td>
                <td className="px-4 py-2.5 tabular-nums">{page.blocks.length}</td>
                <td className="px-4 py-2.5 tabular-nums">
                  {page.blocks.reduce((n, bloc) => n + bloc.fields.length, 0)}
                </td>
                <td className="px-4 py-2.5 tabular-nums">
                  {page.blocks.reduce((n, bloc) => n + bloc.collections.length, 0)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {blueprint.warnings.length > 0 && (
        <>
          <h2 className="titre-display mt-10 text-xl">{t("aSavoir")}</h2>
          <ul className="mt-4 space-y-3" data-testid="avertissements">
            {[...attention, ...infos].map((avertissement, index) => (
              <li
                key={`${avertissement.code}-${index}`}
                className="rounded-lg border border-papier-300 bg-white px-4 py-3"
              >
                <p className="text-[14px] font-medium text-encre-800">
                  {TITRE_AVERTISSEMENT[avertissement.code]}
                </p>
                <p className="mt-1 text-[14px] leading-relaxed text-encre-600">
                  {avertissement.message}
                </p>
              </li>
            ))}
          </ul>
        </>
      )}
    </>
  );
}
