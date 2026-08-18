"use client";

import { useRef, useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import type { Seo, ThemeToken } from "@calque/blueprint";
import type { GlobalVue, MediaVue, PageVue } from "../types";

/**
 * Sections annexes du navigateur de contenu (§12) : thème, informations de
 * contact, référencement, médias.
 *
 * Elles vivent hors de l'arbre de la page parce qu'elles ne s'y rattachent pas :
 * une couleur ou un numéro de téléphone valent pour tout le site.
 */

const CLASSE_SAISIE =
  "w-full rounded-md border border-papier-300 bg-white px-3 py-2 text-[14px] outline-none transition focus-visible:border-bleu-500 focus-visible:ring-2 focus-visible:ring-bleu-200";

export function PanneauTheme({
  jetons,
  valeurs,
  onChanger,
}: {
  jetons: ThemeToken[];
  valeurs: Record<string, string>;
  onChanger: (tokenId: string, valeur: string) => void;
}) {
  const t = useTranslations("editeur");
  const couleurs = jetons.filter((jeton) => jeton.type === "color");
  const autres = jetons.filter((jeton) => jeton.type !== "color");

  return (
    <div className="space-y-5" data-testid="panneau-theme">
      <div>
        <h2 className="text-[15px] font-medium text-encre-800">{t("sections.theme")}</h2>
        <p className="mt-1 text-[13px] leading-relaxed text-encre-500">
          {t("themeAide")}
        </p>
      </div>

      {couleurs.length > 0 && (
        <section className="space-y-3">
          <h3 className="text-[12px] uppercase tracking-wide text-encre-400">
            {t("couleurs")}
          </h3>
          {couleurs.map((jeton) => (
            <div key={jeton.id} className="flex items-center gap-3">
              <input
                type="color"
                id={`jeton-${jeton.id}`}
                data-testid={`jeton-${jeton.id}`}
                value={
                  /^#[0-9a-f]{6}$/iu.test(valeurs[jeton.id] ?? jeton.value)
                    ? (valeurs[jeton.id] ?? jeton.value)
                    : "#000000"
                }
                onChange={(evenement) => onChanger(jeton.id, evenement.target.value)}
                className="size-8 shrink-0 cursor-pointer rounded border border-papier-300"
              />
              <label htmlFor={`jeton-${jeton.id}`} className="flex-1 text-[13px]">
                {jeton.label}
              </label>
              <span className="font-mono text-[12px] text-encre-400">
                {valeurs[jeton.id] ?? jeton.value}
              </span>
            </div>
          ))}
        </section>
      )}

      {autres.length > 0 && (
        <section className="space-y-3">
          <h3 className="text-[12px] uppercase tracking-wide text-encre-400">
            {t("autresReglages")}
          </h3>
          {autres.map((jeton) => (
            <div key={jeton.id} className="space-y-1">
              <label htmlFor={`jeton-${jeton.id}`} className="block text-[13px]">
                {jeton.label}
              </label>
              <input
                id={`jeton-${jeton.id}`}
                value={valeurs[jeton.id] ?? jeton.value}
                onChange={(evenement) => onChanger(jeton.id, evenement.target.value)}
                className={CLASSE_SAISIE}
              />
            </div>
          ))}
        </section>
      )}
    </div>
  );
}

export function PanneauContact({
  globaux,
  valeurs,
  onChanger,
}: {
  globaux: GlobalVue[];
  valeurs: Record<string, unknown>;
  onChanger: (id: string, valeur: unknown) => void;
}) {
  const t = useTranslations("editeur");

  return (
    <div className="space-y-5" data-testid="panneau-contact">
      <div>
        <h2 className="text-[15px] font-medium text-encre-800">
          {t("sections.contact")}
        </h2>
        <p className="mt-1 text-[13px] leading-relaxed text-encre-500">
          {t("contactAide")}
        </p>
      </div>

      {globaux.map((global) => {
        const valeur = valeurs[global.id] ?? global.valeurInitiale;
        const estObjet = typeof valeur === "object" && valeur !== null;
        const texte = estObjet
          ? String((valeur as Record<string, unknown>)["href"] ?? "")
          : String(valeur ?? "");

        return (
          <div key={global.id} className="space-y-1.5">
            <label
              htmlFor={`global-${global.id}`}
              className="block text-[13px] font-medium"
            >
              {global.label}
            </label>
            <input
              id={`global-${global.id}`}
              data-testid={`global-${global.id}`}
              value={texte}
              onChange={(evenement) =>
                onChanger(
                  global.id,
                  estObjet
                    ? { ...(valeur as object), href: evenement.target.value }
                    : evenement.target.value,
                )
              }
              className={CLASSE_SAISIE}
            />
            <p className="text-[12px] text-encre-500">
              {t("apparaitSur", { pages: global.occurrences.join(", ") })}
            </p>
          </div>
        );
      })}
    </div>
  );
}

export function PanneauSeo({
  pages,
  valeurs,
  onChanger,
}: {
  pages: PageVue[];
  valeurs: Record<string, Partial<Seo>>;
  onChanger: (pagePath: string, champ: keyof Seo, valeur: string) => void;
}) {
  const t = useTranslations("editeur");
  const [ouverte, setOuverte] = useState(pages[0]?.path ?? "");

  const page = pages.find((candidate) => candidate.path === ouverte) ?? pages[0];
  if (page === undefined) return null;

  const actuel = { ...page.seo, ...valeurs[page.path] };

  return (
    <div className="space-y-5" data-testid="panneau-seo">
      <div>
        <h2 className="text-[15px] font-medium text-encre-800">{t("sections.seo")}</h2>
        <p className="mt-1 text-[13px] leading-relaxed text-encre-500">{t("seoAide")}</p>
      </div>

      <div className="space-y-1.5">
        <label htmlFor="seo-page" className="block text-[13px] font-medium">
          {t("page")}
        </label>
        <select
          id="seo-page"
          value={page.path}
          onChange={(evenement) => setOuverte(evenement.target.value)}
          className={CLASSE_SAISIE}
        >
          {pages.map((candidate) => (
            <option key={candidate.path} value={candidate.path}>
              {candidate.label}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-1.5">
        <label htmlFor="seo-titre" className="block text-[13px] font-medium">
          {t("titreOnglet")}
        </label>
        <input
          id="seo-titre"
          data-testid="seo-titre"
          value={actuel.title ?? ""}
          onChange={(evenement) => onChanger(page.path, "title", evenement.target.value)}
          className={CLASSE_SAISIE}
        />
        <p className="text-[12px] text-encre-500">{t("titreOngletAide")}</p>
      </div>

      <div className="space-y-1.5">
        <label htmlFor="seo-description" className="block text-[13px] font-medium">
          {t("descriptionRecherche")}
        </label>
        <textarea
          id="seo-description"
          data-testid="seo-description"
          rows={3}
          value={actuel.description ?? ""}
          onChange={(evenement) =>
            onChanger(page.path, "description", evenement.target.value)
          }
          className={CLASSE_SAISIE}
        />
        <p className="text-[12px] text-encre-500">{t("descriptionRechercheAide")}</p>
      </div>
    </div>
  );
}

export function PanneauMedias({
  medias,
  onChoisir,
  onDeposer,
}: {
  medias: MediaVue[];
  onChoisir?: (media: MediaVue) => void;
  onDeposer: (fichier: File) => Promise<string | null>;
}) {
  const t = useTranslations("editeur");
  const champ = useRef<HTMLInputElement>(null);
  const [erreur, setErreur] = useState<string | null>(null);
  const [enCours, demarrer] = useTransition();

  return (
    <div className="space-y-4" data-testid="panneau-medias">
      <div>
        <h2 className="text-[15px] font-medium text-encre-800">{t("sections.medias")}</h2>
        <p className="mt-1 text-[13px] leading-relaxed text-encre-500">
          {t("mediasAide")}
        </p>
      </div>

      <div>
        <label htmlFor="depot-media" className="sr-only">
          {t("ajouterImage")}
        </label>
        <input
          ref={champ}
          id="depot-media"
          data-testid="depot-media"
          type="file"
          accept="image/*"
          disabled={enCours}
          onChange={(evenement) => {
            const fichier = evenement.target.files?.[0];
            if (fichier === undefined) return;
            demarrer(async () => {
              setErreur(await onDeposer(fichier));
              if (champ.current !== null) champ.current.value = "";
            });
          }}
          className="block w-full rounded-md border border-papier-300 bg-white px-3 py-2 text-[13px] file:mr-3 file:rounded file:border-0 file:bg-papier-200 file:px-3 file:py-1.5"
        />
        {erreur !== null && (
          <p
            role="alert"
            data-testid="erreur-media"
            className="mt-2 text-[13px] text-ambre-700"
          >
            {erreur}
          </p>
        )}
      </div>

      <ul className="grid grid-cols-3 gap-2" data-testid="bibliotheque">
        {medias.map((media) => (
          <li key={media.id}>
            <button
              type="button"
              data-testid={`media-${media.id}`}
              onClick={() => onChoisir?.(media)}
              className="block w-full overflow-hidden rounded border border-papier-300 transition hover:border-bleu-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-bleu-300"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={media.url}
                alt={media.alt}
                className="aspect-[4/3] w-full object-cover"
                loading="lazy"
              />
            </button>
          </li>
        ))}
      </ul>

      {medias.length === 0 && (
        <p className="text-[13px] text-encre-500">{t("bibliothequeVide")}</p>
      )}
    </div>
  );
}
