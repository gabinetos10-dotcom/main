import type { Metadata } from "next";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { getDatabase, sitesRepository } from "@calque/db";
import { Card, CardContent } from "@/components/ui/card";
import { requireContext } from "@/lib/session";

export const metadata: Metadata = { title: "Vos sites" };

const LIBELLE_STATUT: Record<string, string> = {
  ingestion: "Analyse en cours",
  pret: "Prêt à éditer",
  publie: "En ligne",
  archive: "Archivé",
  echec_ingestion: "Dépôt en échec",
};

export default async function PageTableauDeBord() {
  const t = await getTranslations("tableauDeBord");
  const contexte = await requireContext();

  const handle = await getDatabase();
  const sites = await sitesRepository(handle, contexte.org.orgId).list();

  return (
    <>
      <div className="flex items-center justify-between gap-4">
        <h1 className="titre-display text-3xl">{t("titre")}</h1>
        <Link
          href="/sites/nouveau"
          data-testid="lien-depot"
          className="inline-flex h-10 items-center rounded-md bg-encre-900 px-4 text-[14px] font-medium text-papier-50 transition hover:bg-encre-800"
        >
          {t("deposer")}
        </Link>
      </div>

      {sites.length === 0 ? (
        <Card className="mt-8">
          <CardContent className="py-14 text-center">
            <p className="text-[15px] font-medium text-encre-800">{t("vide")}</p>
            <p className="mx-auto mt-2 max-w-sm text-[14px] leading-relaxed text-encre-500">
              {t("videAide")}
            </p>
          </CardContent>
        </Card>
      ) : (
        <ul className="mt-8 space-y-3" data-testid="liste-sites">
          {sites.map((site) => (
            <li key={site.id}>
              <Link
                href={`/sites/${site.slug}`}
                className="flex items-center justify-between rounded-lg border border-papier-300 bg-white px-5 py-4 transition hover:border-bleu-400"
              >
                <span>
                  <span className="block text-[15px] font-medium text-encre-800">
                    {site.name}
                  </span>
                  <span className="mt-0.5 block text-[13px] text-encre-500">
                    {LIBELLE_STATUT[site.status] ?? site.status}
                  </span>
                </span>
                <span className="text-[13px] text-encre-400">→</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
