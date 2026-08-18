"use client";

import { useEffect, useRef } from "react";
import { useTranslations } from "next-intl";
import type { ChampVue, MediaVue } from "./types";

/**
 * Panneau de propriétés (§12, zone de droite).
 *
 * Un formulaire par type de champ, avec une aide en français simple. Le compteur
 * de caractères **avertit** sans jamais bloquer (§11) : dépasser la longueur
 * prévue déforme la mise en page, ce n'est pas une faute.
 */

function objet(valeur: unknown): Record<string, unknown> {
  return typeof valeur === "object" && valeur !== null
    ? (valeur as Record<string, unknown>)
    : {};
}

function Champ({
  id,
  libelle,
  aide,
  children,
}: {
  id: string;
  libelle: string;
  aide?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="block text-[13px] font-medium text-encre-700">
        {libelle}
      </label>
      {children}
      {aide !== undefined && (
        <p className="text-[12px] leading-relaxed text-encre-500">{aide}</p>
      )}
    </div>
  );
}

const CLASSE_SAISIE =
  "w-full rounded-md border border-papier-300 bg-white px-3 py-2 text-[14px] outline-none transition focus-visible:border-bleu-500 focus-visible:ring-2 focus-visible:ring-bleu-200";

function CompteurCaracteres({ valeur, maximum }: { valeur: string; maximum?: number }) {
  const t = useTranslations("editeur");
  if (maximum === undefined) return null;
  const trop = valeur.length > maximum;
  return (
    <p
      className={`text-[12px] ${trop ? "text-ambre-700" : "text-encre-400"}`}
      aria-live="polite"
    >
      {trop
        ? t("tropLong", { longueur: valeur.length, maximum })
        : t("longueur", { longueur: valeur.length, maximum })}
    </p>
  );
}

export interface ProprietesProps {
  champ: ChampVue | null;
  valeur: unknown;
  medias: MediaVue[];
  /**
   * Compteur de demandes de focus. Il change quand le panneau veut que le
   * curseur arrive dans le premier champ — après l'ajout d'un élément de liste,
   * là où le §13 demande de « scroller et donner le focus ».
   */
  focus: number;
  onChanger: (valeur: unknown) => void;
  onOuvrirMedias: () => void;
}

export function Proprietes({
  champ,
  valeur,
  medias,
  focus,
  onChanger,
  onOuvrirMedias,
}: ProprietesProps) {
  const t = useTranslations("editeur");
  const cadre = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (focus === 0) return;
    cadre.current?.querySelector<HTMLElement>('[data-testid="champ-valeur"]')?.focus();
  }, [focus]);

  if (champ === null) {
    return (
      <p className="text-[14px] leading-relaxed text-encre-500">{t("aucuneSelection")}</p>
    );
  }

  const contraintes = champ.constraints;
  const maximum =
    typeof contraintes["maxLength"] === "number" ? contraintes["maxLength"] : undefined;

  return (
    <div ref={cadre} className="space-y-4" data-testid="proprietes">
      <div>
        <p className="text-[11px] uppercase tracking-wide text-encre-400">
          {champ.blocLabel}
        </p>
        <h2 className="text-[15px] font-medium text-encre-800">{champ.label}</h2>
      </div>

      {(champ.type === "text" || champ.type === "contact") && (
        <Champ id="valeur" libelle={t("texte")} aide={t("texteAide")}>
          <textarea
            id="valeur"
            data-testid="champ-valeur"
            rows={contraintes["multiline"] === true ? 4 : 2}
            value={String(valeur ?? "")}
            onChange={(evenement) => onChanger(evenement.target.value)}
            className={CLASSE_SAISIE}
          />
          <CompteurCaracteres valeur={String(valeur ?? "")} maximum={maximum} />
        </Champ>
      )}

      {champ.type === "richtext" && (
        <Champ id="valeur" libelle={t("texte")} aide={t("richtextAide")}>
          <textarea
            id="valeur"
            data-testid="champ-valeur"
            rows={5}
            value={String(valeur ?? "")}
            onChange={(evenement) => onChanger(evenement.target.value)}
            className={`${CLASSE_SAISIE} font-mono text-[13px]`}
          />
        </Champ>
      )}

      {champ.type === "image" && (
        <div className="space-y-4">
          <Champ id="image-src" libelle={t("image")} aide={t("imageAide")}>
            <div className="flex items-center gap-3">
              <div className="size-16 shrink-0 overflow-hidden rounded border border-papier-300 bg-papier-100">
                {(() => {
                  const src = String(objet(valeur)["src"] ?? "");
                  const media = medias.find((candidat) => candidat.path === src);
                  return media === undefined ? null : (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={media.url}
                      alt=""
                      className="size-full object-cover"
                      width={64}
                      height={64}
                    />
                  );
                })()}
              </div>
              <button
                type="button"
                data-testid="choisir-image"
                onClick={onOuvrirMedias}
                className="rounded-md border border-papier-300 px-3 py-2 text-[13px] transition hover:border-bleu-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-bleu-300"
              >
                {t("changerImage")}
              </button>
            </div>
          </Champ>

          <Champ id="image-alt" libelle={t("alt")} aide={t("altAide")}>
            <input
              id="image-alt"
              data-testid="champ-alt"
              value={String(objet(valeur)["alt"] ?? "")}
              onChange={(evenement) =>
                onChanger({ ...objet(valeur), alt: evenement.target.value })
              }
              className={CLASSE_SAISIE}
            />
          </Champ>
        </div>
      )}

      {(champ.type === "link" || champ.type === "cta") && (
        <div className="space-y-4">
          <Champ id="lien-libelle" libelle={t("libelleLien")}>
            <input
              id="lien-libelle"
              data-testid="champ-valeur"
              value={String(objet(valeur)["label"] ?? "")}
              onChange={(evenement) =>
                onChanger({ ...objet(valeur), label: evenement.target.value })
              }
              className={CLASSE_SAISIE}
            />
          </Champ>
          <Champ id="lien-href" libelle={t("destination")} aide={t("destinationAide")}>
            <input
              id="lien-href"
              data-testid="champ-href"
              value={String(objet(valeur)["href"] ?? "")}
              onChange={(evenement) =>
                onChanger({ ...objet(valeur), href: evenement.target.value })
              }
              className={CLASSE_SAISIE}
            />
          </Champ>
        </div>
      )}

      {champ.type === "social" && (
        <Champ
          id="social-href"
          libelle={t("adresseProfil")}
          aide={t("adresseProfilAide")}
        >
          <input
            id="social-href"
            data-testid="champ-valeur"
            value={String(objet(valeur)["href"] ?? "")}
            onChange={(evenement) =>
              onChanger({ ...objet(valeur), href: evenement.target.value })
            }
            className={CLASSE_SAISIE}
          />
        </Champ>
      )}

      {champ.type === "map-embed" && (
        <Champ id="adresse" libelle={t("adressePlan")} aide={t("adressePlanAide")}>
          <input
            id="adresse"
            data-testid="champ-valeur"
            value={String(objet(valeur)["address"] ?? "")}
            onChange={(evenement) =>
              onChanger({ ...objet(valeur), address: evenement.target.value })
            }
            className={CLASSE_SAISIE}
          />
        </Champ>
      )}

      {champ.type === "form-endpoint" && (
        <Champ
          id="endpoint"
          libelle={t("destinationFormulaire")}
          aide={t("destinationFormulaireAide")}
        >
          <input
            id="endpoint"
            data-testid="champ-valeur"
            value={String(objet(valeur)["action"] ?? "")}
            onChange={(evenement) =>
              onChanger({ ...objet(valeur), action: evenement.target.value })
            }
            className={CLASSE_SAISIE}
          />
        </Champ>
      )}

      {champ.type === "video-embed" && (
        <Champ id="video" libelle={t("adresseVideo")} aide={t("adresseVideoAide")}>
          <input
            id="video"
            data-testid="champ-valeur"
            value={String(objet(valeur)["src"] ?? "")}
            onChange={(evenement) =>
              onChanger({ ...objet(valeur), src: evenement.target.value })
            }
            className={CLASSE_SAISIE}
          />
        </Champ>
      )}
    </div>
  );
}
