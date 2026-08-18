"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import type { ContentData } from "@calque/blueprint";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { creerPont, message, type Pont } from "./pont";
import { enregistrerBrouillon } from "./actions";

/**
 * Éditeur : arbre à gauche, aperçu au centre, propriétés à droite (§12).
 *
 * Le panneau ne touche jamais au DOM du site : il envoie des messages à
 * l'aperçu, qui applique. C'est ce qui permet de servir l'aperçu depuis un autre
 * domaine, dans une iframe en bac à sable.
 */

export interface ChampEditeur {
  id: string;
  label: string;
  type: string;
  pagePath: string;
  blocLabel: string;
  value: unknown;
}

export interface EditeurProps {
  siteId: string;
  siteName: string;
  apercuUrl: string;
  champs: ChampEditeur[];
  contenu: ContentData;
}

type EtatEnregistrement = "repos" | "enregistrement" | "enregistre" | "erreur";

function valeurTextuelle(type: string, valeur: unknown): string {
  if (type === "link" || type === "cta") {
    return String((valeur as { label?: unknown } | null)?.label ?? "");
  }
  if (type === "image") {
    return String((valeur as { alt?: unknown } | null)?.alt ?? "");
  }
  return typeof valeur === "string" ? valeur : "";
}

function avecTexte(type: string, ancienne: unknown, texte: string): unknown {
  if (type === "link" || type === "cta") {
    return { ...(ancienne as object), label: texte };
  }
  if (type === "image") {
    return { ...(ancienne as object), alt: texte };
  }
  return texte;
}

export function Editeur({ siteId, siteName, apercuUrl, champs, contenu }: EditeurProps) {
  const t = useTranslations("editeur");
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const pontRef = useRef<Pont | null>(null);
  const minuterie = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [valeurs, setValeurs] = useState<Record<string, unknown>>(contenu.fields);
  const [selection, setSelection] = useState<string | null>(null);
  const [survol, setSurvol] = useState<string | null>(null);
  const [zonesVisibles, setZonesVisibles] = useState(false);
  const [pret, setPret] = useState(false);
  const [irresolus, setIrresolus] = useState<string[]>([]);
  const [enregistrement, setEnregistrement] = useState<EtatEnregistrement>("repos");

  const parId = useMemo(
    () => new Map(champs.map((champ) => [champ.id, champ])),
    [champs],
  );

  /* ── Enregistrement différé (§10 : autosave 800 ms) ──────────────────────── */

  function planifier(patch: Record<string, unknown>): void {
    if (minuterie.current !== null) clearTimeout(minuterie.current);
    setEnregistrement("enregistrement");
    minuterie.current = setTimeout(() => {
      void enregistrerBrouillon({ siteId, patch: { fields: patch } }).then((resultat) => {
        setEnregistrement(resultat.ok ? "enregistre" : "erreur");
      });
    }, 800);
  }

  function appliquer(
    fieldId: string,
    valeur: unknown,
    options: { versApercu: boolean } = { versApercu: true },
  ): void {
    const champ = parId.get(fieldId);
    if (champ === undefined) return;

    setValeurs((precedent) => ({ ...precedent, [fieldId]: valeur }));
    planifier({ [fieldId]: valeur });

    if (options.versApercu) {
      pontRef.current?.envoyer(
        message("SET_VALUE", { fieldId, type: champ.type, value: valeur }),
      );
    }
  }

  /**
   * L'effet du pont ne dépend pas d'`appliquer` : il lit sa version courante
   * dans une ref. Sans cela, chaque frappe reconstruirait le pont — et l'aperçu
   * perdrait ses écouteurs au milieu d'une saisie.
   */
  const appliquerRef = useRef(appliquer);
  useEffect(() => {
    appliquerRef.current = appliquer;
  });

  /* ── Pont avec l'aperçu ──────────────────────────────────────────────────── */

  useEffect(() => {
    const iframe = iframeRef.current;
    if (iframe === null) return;

    // `window` n'existe qu'ici : ce composant est aussi rendu côté serveur.
    const origine = new URL(apercuUrl, window.location.origin).origin;

    const pont = creerPont(iframe, origine, (msg) => {
      switch (msg.type) {
        case "READY":
          setPret(true);
          setIrresolus(msg.payload.unresolvedFieldIds);
          return;
        case "HOVER":
          setSurvol(msg.payload.fieldId);
          return;
        case "FIELD_CLICK":
          setSelection(msg.payload.fieldId);
          return;
        case "FIELD_INPUT":
          appliquerRef.current(msg.payload.fieldId, msg.payload.value, {
            versApercu: false,
          });
          return;
        case "ERROR":
        case "SCROLL_POS":
          return;
      }
    });

    pontRef.current = pont;
    return () => {
      pont.fermer();
      pontRef.current = null;
    };
  }, [apercuUrl]);

  /* ── Commandes vers l'aperçu ─────────────────────────────────────────────── */

  useEffect(() => {
    if (!pret) return;
    pontRef.current?.envoyer(
      message("HIGHLIGHT", { fieldId: selection, showAll: zonesVisibles }),
    );
  }, [pret, selection, zonesVisibles]);

  const choisir = (fieldId: string): void => {
    setSelection(fieldId);
    pontRef.current?.envoyer(message("SCROLL_TO", { fieldId }));
  };

  const champSelectionne = selection === null ? null : (parId.get(selection) ?? null);
  const parPage = useMemo(() => {
    const groupes = new Map<string, ChampEditeur[]>();
    for (const champ of champs) {
      const liste = groupes.get(champ.pagePath);
      if (liste === undefined) groupes.set(champ.pagePath, [champ]);
      else liste.push(champ);
    }
    return [...groupes.entries()];
  }, [champs]);

  return (
    <div className="grid h-[calc(100dvh-4rem)] grid-cols-[16rem_1fr_20rem] gap-0">
      {/* ── Navigateur de contenu ──────────────────────────────────────────── */}
      <aside className="overflow-y-auto border-r border-papier-300 bg-white p-3">
        <p className="px-2 pb-2 text-[13px] font-medium text-encre-800">{siteName}</p>
        {parPage.map(([page, liste]) => (
          <section key={page} className="mb-4">
            <p className="px-2 py-1 text-[11px] uppercase tracking-wide text-encre-400">
              {page}
            </p>
            <ul>
              {liste.map((champ) => (
                <li key={champ.id}>
                  <button
                    type="button"
                    data-testid={`champ-${champ.id}`}
                    onClick={() => choisir(champ.id)}
                    className={`w-full truncate rounded px-2 py-1.5 text-left text-[13px] transition ${
                      selection === champ.id
                        ? "bg-bleu-100 text-bleu-800"
                        : survol === champ.id
                          ? "bg-papier-200"
                          : "hover:bg-papier-100"
                    } ${irresolus.includes(champ.id) ? "text-encre-400 line-through" : ""}`}
                  >
                    {champ.label}
                  </button>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </aside>

      {/* ── Aperçu ─────────────────────────────────────────────────────────── */}
      <section className="flex flex-col bg-papier-200">
        <div className="flex items-center gap-3 border-b border-papier-300 bg-white px-4 py-2">
          <Button
            type="button"
            variant="discret"
            className="h-8 px-2.5 text-[13px]"
            data-testid="voir-zones"
            aria-pressed={zonesVisibles}
            onClick={() => setZonesVisibles((valeur) => !valeur)}
          >
            {t("voirZones")}
          </Button>
          <span
            className="ml-auto text-[12px] text-encre-500"
            aria-live="polite"
            data-testid="etat-enregistrement"
          >
            {enregistrement === "enregistrement"
              ? t("enregistrement")
              : enregistrement === "enregistre"
                ? t("enregistre")
                : enregistrement === "erreur"
                  ? t("erreurEnregistrement")
                  : ""}
          </span>
        </div>
        <iframe
          ref={iframeRef}
          src={apercuUrl}
          title={t("apercu")}
          data-testid="apercu"
          sandbox="allow-scripts allow-same-origin"
          className="h-full w-full flex-1 border-0 bg-white"
        />
      </section>

      {/* ── Propriétés ─────────────────────────────────────────────────────── */}
      <aside className="overflow-y-auto border-l border-papier-300 bg-white p-4">
        {champSelectionne === null ? (
          <p className="text-[14px] leading-relaxed text-encre-500">
            {t("aucuneSelection")}
          </p>
        ) : (
          <div className="space-y-3" data-testid="proprietes">
            <div>
              <p className="text-[11px] uppercase tracking-wide text-encre-400">
                {champSelectionne.blocLabel}
              </p>
              <h2 className="text-[15px] font-medium text-encre-800">
                {champSelectionne.label}
              </h2>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="valeur">{t("valeur")}</Label>
              <Input
                id="valeur"
                data-testid="champ-valeur"
                value={valeurTextuelle(
                  champSelectionne.type,
                  valeurs[champSelectionne.id] ?? champSelectionne.value,
                )}
                onChange={(evenement) =>
                  appliquer(
                    champSelectionne.id,
                    avecTexte(
                      champSelectionne.type,
                      valeurs[champSelectionne.id] ?? champSelectionne.value,
                      evenement.target.value,
                    ),
                  )
                }
              />
            </div>
          </div>
        )}
      </aside>
    </div>
  );
}
