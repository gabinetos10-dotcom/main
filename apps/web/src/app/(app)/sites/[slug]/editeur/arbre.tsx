"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import type { FieldType } from "@calque/blueprint";
import type { ChampVue, DuplicationVue, ModeleEditeur, SectionAnnexe } from "./types";

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

function LigneChamp({
  champ,
  choisi,
  survole,
  modifie,
  onChoisir,
}: {
  champ: ChampVue;
  choisi: boolean;
  survole: boolean;
  modifie: boolean;
  onChoisir: () => void;
}) {
  const t = useTranslations("editeur");

  return (
    <li>
      <button
        type="button"
        data-testid={`arbre-champ-${champ.id}`}
        onClick={onChoisir}
        aria-current={choisi}
        className={`flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-[13px] transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-bleu-300 ${
          choisi
            ? "bg-bleu-100 text-bleu-800"
            : survole
              ? "bg-papier-200"
              : "hover:bg-papier-100"
        }`}
      >
        <span aria-hidden className="w-3 shrink-0 text-center text-encre-400">
          {ICONE[champ.type]}
        </span>
        <span className="truncate">{champ.label}</span>
        {modifie && (
          <span
            title={t("modifie")}
            className="ml-auto size-1.5 shrink-0 rounded-full bg-ambre-500"
          />
        )}
      </button>
    </li>
  );
}

export interface ArbreProps {
  modele: ModeleEditeur;
  selection: string | null;
  section: string | null;
  survol: string | null;
  modifies: ReadonlySet<string>;
  /** Nombre d'éléments courant par liste : le brouillon peut en avoir ajouté. */
  compteurs: ReadonlyMap<string, number>;
  /** Copies de blocs nées dans le brouillon, rangées sous leur bloc source. */
  duplications: readonly DuplicationVue[];
  onChoisirChamp: (champId: string) => void;
  onChoisirCollection: (collectionId: string) => void;
  onChoisirBloc: (blocId: string) => void;
  onOuvrirSection: (section: SectionAnnexe) => void;
}

export function Arbre({
  modele,
  selection,
  section,
  survol,
  modifies,
  compteurs,
  duplications,
  onChoisirChamp,
  onChoisirCollection,
  onChoisirBloc,
  onOuvrirSection,
}: ArbreProps) {
  const t = useTranslations("editeur");
  const [recherche, setRecherche] = useState("");
  const [replies, setReplies] = useState<ReadonlySet<string>>(() => new Set());

  // `<details>` ne conviendrait pas ici : le titre du bloc doit *sélectionner*
  // le bloc — pour le masquer ou le dupliquer (§13) — et non le replier.
  function basculer(blocId: string): void {
    setReplies((courant) => {
      const suivant = new Set(courant);
      if (suivant.has(blocId)) suivant.delete(blocId);
      else suivant.add(blocId);
      return suivant;
    });
  }

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
              copies: duplications.filter((copie) => copie.sourceBlocId === bloc.id),
            }))
            .filter(
              (entree) =>
                entree.champs.length > 0 ||
                entree.collections.length > 0 ||
                entree.copies.length > 0,
            );

          if (visibles.length === 0) return null;

          return (
            <section key={page.path} className="mb-3">
              <h2 className="px-2 py-1 text-[11px] font-medium uppercase tracking-wide text-encre-400">
                {page.label}
              </h2>

              {visibles.map(({ bloc, champs, collections, copies }) => {
                const ouvert = !replies.has(bloc.id);
                return (
                  <div key={bloc.id} className="mb-1">
                    <div
                      className={`flex items-center rounded ${
                        selection === bloc.id ? "bg-bleu-100" : "hover:bg-papier-100"
                      }`}
                    >
                      <button
                        type="button"
                        onClick={() => basculer(bloc.id)}
                        aria-expanded={ouvert}
                        aria-controls={`contenu-${bloc.id}`}
                        aria-label={ouvert ? t("replier") : t("deplier")}
                        className="px-1.5 py-1 text-[10px] text-encre-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-bleu-300"
                      >
                        <span aria-hidden>{ouvert ? "▾" : "▸"}</span>
                      </button>
                      <button
                        type="button"
                        data-testid={`arbre-bloc-${bloc.id}`}
                        onClick={() => onChoisirBloc(bloc.id)}
                        aria-current={selection === bloc.id}
                        className={`flex-1 truncate py-1 pr-2 text-left text-[12px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-bleu-300 ${
                          selection === bloc.id ? "text-bleu-800" : "text-encre-500"
                        }`}
                      >
                        {bloc.label}
                      </button>
                    </div>

                    <div id={`contenu-${bloc.id}`} hidden={!ouvert}>
                      <ul className="ml-1 border-l border-papier-200 pl-1">
                        {champs.map((champ) => (
                          <LigneChamp
                            key={champ?.id}
                            champ={champ as ChampVue}
                            choisi={selection === champ?.id}
                            survole={survol === champ?.id}
                            modifie={champ !== undefined && modifies.has(champ.id)}
                            onChoisir={() => champ && onChoisirChamp(champ.id)}
                          />
                        ))}

                        {collections.map((collection) => (
                          <li key={collection?.id}>
                            <button
                              type="button"
                              data-testid={`arbre-liste-${collection?.id}`}
                              onClick={() =>
                                collection && onChoisirCollection(collection.id)
                              }
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
                                {collection === undefined
                                  ? ""
                                  : (compteurs.get(collection.id) ??
                                    collection.items.length)}
                              </span>
                            </button>
                          </li>
                        ))}
                      </ul>

                      {/* Les copies du bloc, rangées juste dessous : c'est là
                          qu'elles apparaissent dans la page. */}
                      {copies.map((copie) => (
                        <div key={copie.cle} data-testid={`arbre-copie-${copie.cle}`}>
                          <p className="px-2 py-1 text-[12px] text-encre-500">
                            {copie.label}
                          </p>
                          <ul className="ml-1 border-l border-papier-200 pl-1">
                            {copie.champs
                              .filter((champ) => correspond(champ.label))
                              .map((champ) => (
                                <LigneChamp
                                  key={champ.id}
                                  champ={champ}
                                  choisi={selection === champ.id}
                                  survole={survol === champ.id}
                                  modifie={modifies.has(champ.id)}
                                  onChoisir={() => onChoisirChamp(champ.id)}
                                />
                              ))}
                          </ul>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
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
