"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import type { FieldType } from "@calque/blueprint";
import type { ModeleEditeur, SectionAnnexe } from "./types";

/**
 * Navigateur de contenu (§12, zone de gauche).
 *
 * Arbre `Pages → Blocs → Champs & Listes`, recherche, badge « modifié ». Aucun
 * jargon (§12) : on dit « bloc », « liste », « carte » — jamais « div »,
 * « collection » ou « DOM ».
 */

const ICONE: Record<FieldType, string> = {
  text: "T",
  richtext: "¶",
  image: "▣",
  link: "↗",
  cta: "▭",
  "video-embed": "▶",
  "map-embed": "◎",
  icon: "✦",
  contact: "☎",
  social: "◈",
  "form-endpoint": "✉",
  boolean: "◐",
};

const SECTIONS: Array<{ id: SectionAnnexe; clef: string }> = [
  { id: "theme", clef: "theme" },
  { id: "contact", clef: "contact" },
  { id: "seo", clef: "seo" },
  { id: "medias", clef: "medias" },
];

export interface ArbreProps {
  modele: ModeleEditeur;
  selection: string | null;
  section: string | null;
  survol: string | null;
  modifies: ReadonlySet<string>;
  onChoisirChamp: (champId: string) => void;
  onChoisirCollection: (collectionId: string) => void;
  onOuvrirSection: (section: SectionAnnexe) => void;
}

export function Arbre({
  modele,
  selection,
  section,
  survol,
  modifies,
  onChoisirChamp,
  onChoisirCollection,
  onOuvrirSection,
}: ArbreProps) {
  const t = useTranslations("editeur");
  const [recherche, setRecherche] = useState("");

  const champsParId = useMemo(
    () => new Map(modele.champs.map((champ) => [champ.id, champ])),
    [modele.champs],
  );
  const collectionsParId = useMemo(
    () => new Map(modele.collections.map((collection) => [collection.id, collection])),
    [modele.collections],
  );
  const blocsParId = useMemo(
    () => new Map(modele.blocs.map((bloc) => [bloc.id, bloc])),
    [modele.blocs],
  );

  const filtre = recherche.trim().toLocaleLowerCase("fr");
  const correspond = (libelle: string): boolean =>
    filtre.length === 0 || libelle.toLocaleLowerCase("fr").includes(filtre);

  return (
    <nav
      aria-label={t("navigateur")}
      className="flex h-full flex-col overflow-hidden border-r border-papier-300 bg-white"
    >
      <div className="border-b border-papier-200 p-3">
        <label htmlFor="recherche" className="sr-only">
          {t("rechercher")}
        </label>
        <input
          id="recherche"
          type="search"
          value={recherche}
          onChange={(evenement) => setRecherche(evenement.target.value)}
          placeholder={t("rechercher")}
          data-testid="recherche"
          className="h-8 w-full rounded-md border border-papier-300 bg-papier-50 px-2.5 text-[13px] outline-none focus-visible:border-bleu-500 focus-visible:ring-2 focus-visible:ring-bleu-200"
        />
      </div>

      <div className="flex-1 overflow-y-auto p-2">
        {modele.pages.map((page) => {
          const blocs = page.blocIds
            .map((id) => blocsParId.get(id))
            .filter((bloc): bloc is NonNullable<typeof bloc> => bloc !== undefined);

          const visibles = blocs
            .map((bloc) => ({
              bloc,
              champs: bloc.champIds
                .map((id) => champsParId.get(id))
                .filter((champ) => champ !== undefined && correspond(champ.label)),
              collections: bloc.collectionIds
                .map((id) => collectionsParId.get(id))
                .filter(
                  (collection) =>
                    collection !== undefined && correspond(collection.label),
                ),
            }))
            .filter(
              (entree) => entree.champs.length > 0 || entree.collections.length > 0,
            );

          if (visibles.length === 0) return null;

          return (
            <section key={page.path} className="mb-3">
              <h2 className="px-2 py-1 text-[11px] font-medium uppercase tracking-wide text-encre-400">
                {page.label}
              </h2>

              {visibles.map(({ bloc, champs, collections }) => (
                <details key={bloc.id} open className="mb-1">
                  <summary className="cursor-pointer rounded px-2 py-1 text-[12px] text-encre-500 hover:bg-papier-100">
                    {bloc.label}
                  </summary>

                  <ul className="ml-1 border-l border-papier-200 pl-1">
                    {champs.map((champ) => (
                      <li key={champ?.id}>
                        <button
                          type="button"
                          data-testid={`arbre-champ-${champ?.id}`}
                          onClick={() => champ && onChoisirChamp(champ.id)}
                          aria-current={selection === champ?.id}
                          className={`flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-[13px] transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-bleu-300 ${
                            selection === champ?.id
                              ? "bg-bleu-100 text-bleu-800"
                              : survol === champ?.id
                                ? "bg-papier-200"
                                : "hover:bg-papier-100"
                          }`}
                        >
                          <span
                            aria-hidden
                            className="w-3 shrink-0 text-center text-encre-400"
                          >
                            {champ === undefined ? "" : ICONE[champ.type]}
                          </span>
                          <span className="truncate">{champ?.label}</span>
                          {champ !== undefined && modifies.has(champ.id) && (
                            <span
                              title={t("modifie")}
                              className="ml-auto size-1.5 shrink-0 rounded-full bg-ambre-500"
                            />
                          )}
                        </button>
                      </li>
                    ))}

                    {collections.map((collection) => (
                      <li key={collection?.id}>
                        <button
                          type="button"
                          data-testid={`arbre-liste-${collection?.id}`}
                          onClick={() => collection && onChoisirCollection(collection.id)}
                          aria-current={selection === collection?.id}
                          className={`flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-[13px] transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-bleu-300 ${
                            selection === collection?.id
                              ? "bg-bleu-100 text-bleu-800"
                              : "hover:bg-papier-100"
                          }`}
                        >
                          <span
                            aria-hidden
                            className="w-3 shrink-0 text-center text-encre-400"
                          >
                            ☰
                          </span>
                          <span className="truncate">{collection?.label}</span>
                          <span className="ml-auto shrink-0 text-[11px] text-encre-400">
                            {collection?.items.length}
                          </span>
                        </button>
                      </li>
                    ))}
                  </ul>
                </details>
              ))}
            </section>
          );
        })}
      </div>

      <div className="border-t border-papier-200 p-2">
        {SECTIONS.map((entree) => (
          <button
            key={entree.id}
            type="button"
            data-testid={`section-${entree.id}`}
            onClick={() => onOuvrirSection(entree.id)}
            aria-current={section === entree.id}
            className={`block w-full rounded px-2 py-1.5 text-left text-[13px] transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-bleu-300 ${
              section === entree.id ? "bg-bleu-100 text-bleu-800" : "hover:bg-papier-100"
            }`}
          >
            {t(`sections.${entree.clef}`)}
          </button>
        ))}
      </div>
    </nav>
  );
}
