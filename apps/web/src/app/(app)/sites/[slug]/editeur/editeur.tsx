"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import type { ContentPatch, Seo } from "@calque/blueprint";
import { Arbre } from "./arbre";
import { Proprietes } from "./proprietes";
import {
  PanneauContact,
  PanneauMedias,
  PanneauSeo,
  PanneauTheme,
} from "./panneaux/annexes";
import { creerPont, message, type Pont } from "./pont";
import { creerStore, type StoreEditeur } from "./store";
import type { MediaVue, ModeleEditeur, SectionAnnexe } from "./types";
import { finaliserMedia, preparerDepotMedia, rafraichirVerrou } from "./actions";

/**
 * Interface d'édition (§12) : navigateur de contenu · aperçu · propriétés.
 *
 * Le panneau ne touche jamais au DOM du site : il envoie des messages à
 * l'aperçu, qui applique. C'est ce qui permet de servir l'aperçu depuis un autre
 * domaine, dans une iframe en bac à sable.
 */

type EtatEnregistrement = "repos" | "enregistrement" | "enregistre" | "erreur";

const LARGEURS_APERCU: Record<string, string> = {
  desktop: "100%",
  tablette: "820px",
  mobile: "390px",
};

function objet(valeur: unknown): Record<string, unknown> {
  return typeof valeur === "object" && valeur !== null
    ? (valeur as Record<string, unknown>)
    : {};
}

export function Editeur({ modele }: { modele: ModeleEditeur }) {
  const t = useTranslations("editeur");
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const pontRef = useRef<Pont | null>(null);
  const minuterie = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [store] = useState<StoreEditeur>(() => creerStore(modele.contenu));
  const contenu = store((etat) => etat.contenu);
  const selection = store((etat) => etat.selection);
  const section = store((etat) => etat.section);
  const survol = store((etat) => etat.survol);
  const modifies = store((etat) => etat.modifies);

  const [medias, setMedias] = useState<MediaVue[]>(modele.medias);
  const [enregistrement, setEnregistrement] = useState<EtatEnregistrement>("repos");
  const [zonesVisibles, setZonesVisibles] = useState(false);
  const [modeApercu, setModeApercu] = useState(false);
  const [cadrage, setCadrage] = useState<keyof typeof LARGEURS_APERCU>("desktop");
  const [pret, setPret] = useState(false);
  const [irresolus, setIrresolus] = useState<string[]>([]);
  const [verrouPar, setVerrouPar] = useState<string | null>(null);

  const champsParId = useMemo(
    () => new Map(modele.champs.map((champ) => [champ.id, champ])),
    [modele.champs],
  );
  const collectionsParId = useMemo(
    () => new Map(modele.collections.map((collection) => [collection.id, collection])),
    [modele.collections],
  );

  /* ── Enregistrement différé (§10 : autosave 800 ms) ──────────────────────── */

  /**
   * On envoie un **patch** de ce qui vient de changer, jamais le contenu entier.
   *
   * Ce n'est pas une optimisation. Chaque action serveur fait revalider la route
   * par Next, ce qui peut remonter le composant ; une sauvegarde différée de
   * l'instance précédente arriverait alors après une plus récente et écraserait
   * un contenu plus frais par un contenu périmé. Un patch ne touche que ses
   * propres clés, donc l'ordre d'arrivée cesse d'importer.
   */
  const enAttente = useRef<ContentPatch>({});

  function planifier(patch: ContentPatch): void {
    const cumul = enAttente.current;
    enAttente.current = {
      fields: { ...cumul.fields, ...patch.fields },
      theme: { ...cumul.theme, ...patch.theme },
      seo: { ...cumul.seo, ...patch.seo },
      globals: { ...cumul.globals, ...patch.globals },
      blocks: { ...cumul.blocks, ...patch.blocks },
      collections: { ...cumul.collections, ...patch.collections },
    };

    if (minuterie.current !== null) clearTimeout(minuterie.current);
    setEnregistrement("enregistrement");

    minuterie.current = setTimeout(() => {
      void envoyerPatch(false).then((ok) => {
        setEnregistrement(ok ? "enregistre" : "erreur");
      });
    }, 800);
  }

  async function envoyerPatch(auDepart: boolean): Promise<boolean> {
    const aEnvoyer = enAttente.current;
    enAttente.current = {};
    if (Object.keys(aEnvoyer).length === 0) return true;

    try {
      const reponse = await fetch(`/api/brouillon/${modele.siteId}`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ patch: aEnvoyer }),
        credentials: "same-origin",
        keepalive: auDepart,
      });
      return reponse.ok;
    } catch {
      return false;
    }
  }

  /**
   * Vidage de la file au moment où l'onglet se ferme ou se recharge.
   *
   * Sans cela, la dernière modification est perdue exactement quand
   * l'utilisateur croit avoir fini — le pire moment possible. `keepalive` laisse
   * la requête partir alors que la page disparaît.
   */
  const envoyerRef = useRef(envoyerPatch);
  useEffect(() => {
    envoyerRef.current = envoyerPatch;
  });

  useEffect(() => {
    const vider = (): void => {
      if (minuterie.current !== null) clearTimeout(minuterie.current);
      void envoyerRef.current(true);
    };
    window.addEventListener("pagehide", vider);
    return () => {
      window.removeEventListener("pagehide", vider);
      vider();
    };
  }, []);

  function changerChamp(fieldId: string, valeur: unknown): void {
    const champ = champsParId.get(fieldId);
    store.getState().appliquer(
      champ?.label ?? fieldId,
      (brouillon) => {
        brouillon.fields[fieldId] = valeur;
      },
      fieldId,
    );
    planifier({ fields: { [fieldId]: valeur } });
    if (champ !== undefined) {
      pontRef.current?.envoyer(
        message("SET_VALUE", { fieldId, type: champ.type, value: valeur }),
      );
    }
  }

  function changerJeton(tokenId: string, valeur: string): void {
    const jeton = modele.theme.find((candidat) => candidat.id === tokenId);
    store.getState().appliquer(
      jeton?.label ?? tokenId,
      (brouillon) => {
        brouillon.theme[tokenId] = valeur;
      },
      tokenId,
    );
    planifier({ theme: { [tokenId]: valeur } });
    if (jeton !== undefined) {
      pontRef.current?.envoyer(
        message("SET_TOKEN", { cssVar: jeton.cssVar, value: valeur }),
      );
    }
  }

  function changerGlobal(id: string, valeur: unknown): void {
    const global = modele.globaux.find((candidat) => candidat.id === id);
    store.getState().appliquer(
      global?.label ?? id,
      (brouillon) => {
        brouillon.globals[id] = valeur;
      },
      id,
    );
    planifier({ globals: { [id]: valeur } });
  }

  function changerSeo(pagePath: string, champ: keyof Seo, valeur: string): void {
    store.getState().appliquer(
      t("sections.seo"),
      (brouillon) => {
        const actuel = brouillon.seo[pagePath] ?? {};
        brouillon.seo[pagePath] = { ...actuel, [champ]: valeur };
      },
      `seo:${pagePath}`,
    );
    planifier({
      seo: { [pagePath]: store.getState().contenu.seo[pagePath] ?? {} },
    });
  }

  /**
   * L'effet du pont ne dépend d'aucune fonction de rendu : il lit leur version
   * courante dans une ref. Sans cela, chaque frappe reconstruirait le pont, et
   * l'aperçu perdrait ses écouteurs au milieu d'une saisie.
   */
  const changerRef = useRef(changerChamp);
  useEffect(() => {
    changerRef.current = changerChamp;
  });

  /* ── Pont avec l'aperçu ──────────────────────────────────────────────────── */

  useEffect(() => {
    const iframe = iframeRef.current;
    if (iframe === null) return;

    // `window` n'existe qu'ici : ce composant est aussi rendu côté serveur.
    const origine = new URL(modele.apercuUrl, window.location.origin).origin;

    const pont = creerPont(iframe, origine, (msg) => {
      switch (msg.type) {
        case "READY":
          setPret(true);
          setIrresolus(msg.payload.unresolvedFieldIds);
          return;
        case "HOVER":
          store.getState().survoler(msg.payload.fieldId);
          return;
        case "FIELD_CLICK":
          store.getState().choisir(msg.payload.fieldId);
          return;
        case "FIELD_INPUT":
          changerRef.current(msg.payload.fieldId, msg.payload.value);
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
  }, [modele.apercuUrl, store]);

  useEffect(() => {
    if (!pret) return;
    pontRef.current?.envoyer(
      message("HIGHLIGHT", { fieldId: selection, showAll: zonesVisibles }),
    );
  }, [pret, selection, zonesVisibles]);

  useEffect(() => {
    if (!pret) return;
    pontRef.current?.envoyer(
      message("SET_MODE", { mode: modeApercu ? "apercu" : "edition" }),
    );
  }, [pret, modeApercu]);

  /* ── Verrou coopératif (§10) ─────────────────────────────────────────────── */

  useEffect(() => {
    let vivant = true;
    const battre = async (): Promise<void> => {
      const resultat = await rafraichirVerrou(modele.siteId);
      if (vivant) setVerrouPar(resultat.acquired ? null : resultat.holder);
    };
    void battre();
    const intervalle = setInterval(() => void battre(), 30_000);
    return () => {
      vivant = false;
      clearInterval(intervalle);
    };
  }, [modele.siteId]);

  /* ── Raccourcis clavier ──────────────────────────────────────────────────── */

  useEffect(() => {
    const surTouche = (evenement: KeyboardEvent): void => {
      if (!(evenement.metaKey || evenement.ctrlKey)) return;
      if (evenement.key !== "z") return;
      evenement.preventDefault();
      const change = evenement.shiftKey
        ? store.getState().refaireDernier()
        : store.getState().annuler();
      if (change) planifier(store.getState().contenu);
    };
    window.addEventListener("keydown", surTouche);
    return () => window.removeEventListener("keydown", surTouche);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [store]);

  /* ── Médias ──────────────────────────────────────────────────────────────── */

  async function deposerMedia(fichier: File): Promise<string | null> {
    try {
      const preparation = await preparerDepotMedia({ siteId: modele.siteId });
      const reponse = await fetch(preparation.uploadUrl, {
        method: "PUT",
        body: fichier,
        headers: { "content-type": fichier.type || "application/octet-stream" },
        ...(preparation.sameOrigin ? { credentials: "same-origin" as const } : {}),
      });
      if (!reponse.ok) return t("erreurDepotMedia");

      const champ = selection === null ? null : champsParId.get(selection);
      const ratio =
        champ?.type === "image" && typeof champ.constraints["aspectRatio"] === "string"
          ? (champ.constraints["aspectRatio"] as string)
          : undefined;

      const resultat = await finaliserMedia({
        siteId: modele.siteId,
        cle: preparation.cle,
        mime: fichier.type,
        alt: "",
        ...(ratio === undefined ? {} : { aspectRatio: ratio }),
      });

      if (!resultat.ok || resultat.media === undefined) {
        return resultat.message ?? t("erreurDepotMedia");
      }

      const nouveau: MediaVue = {
        id: resultat.media.id,
        path: resultat.media.path,
        alt: resultat.media.alt,
        width: resultat.media.width,
        height: resultat.media.height,
        url: `/api/apercu/${modele.siteId}/${resultat.media.path}`,
      };
      setMedias((precedent) => [
        nouveau,
        ...precedent.filter((m) => m.id !== nouveau.id),
      ]);

      // Déposer depuis un champ image, c'est vouloir l'y poser.
      if (champ?.type === "image") {
        changerChamp(champ.id, {
          ...objet(contenu.fields[champ.id] ?? champ.valeurInitiale),
          src: nouveau.path,
        });
      }
      return null;
    } catch {
      return t("erreurDepotMedia");
    }
  }

  function choisirMedia(media: MediaVue): void {
    const champ = selection === null ? null : champsParId.get(selection);
    if (champ?.type !== "image") return;
    changerChamp(champ.id, {
      ...objet(contenu.fields[champ.id] ?? champ.valeurInitiale),
      src: media.path,
      ...(media.alt.length > 0 ? { alt: media.alt } : {}),
    });
    store.getState().choisir(champ.id);
  }

  /* ── Rendu ───────────────────────────────────────────────────────────────── */

  const champSelectionne =
    selection === null ? null : (champsParId.get(selection) ?? null);
  const collectionSelectionnee =
    selection === null ? null : (collectionsParId.get(selection) ?? null);

  const valeurCourante =
    champSelectionne === null
      ? null
      : (contenu.fields[champSelectionne.id] ?? champSelectionne.valeurInitiale);

  return (
    <div className="flex h-[calc(100dvh-4rem)] flex-col">
      <header className="flex items-center gap-3 border-b border-papier-300 bg-white px-4 py-2">
        <Link
          href={`/sites/${modele.slug}`}
          className="text-[13px] text-encre-500 hover:underline"
        >
          ← {t("retour")}
        </Link>
        <span className="text-[14px] font-medium text-encre-800">{modele.siteName}</span>

        <div className="ml-auto flex items-center gap-2">
          <button
            type="button"
            data-testid="annuler"
            onClick={() => {
              if (store.getState().annuler()) planifier(store.getState().contenu);
            }}
            className="h-8 rounded-md border border-papier-300 px-2.5 text-[13px] transition hover:border-encre-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-bleu-300"
          >
            {t("annuler")}
          </button>
          <button
            type="button"
            data-testid="refaire"
            onClick={() => {
              if (store.getState().refaireDernier()) planifier(store.getState().contenu);
            }}
            className="h-8 rounded-md border border-papier-300 px-2.5 text-[13px] transition hover:border-encre-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-bleu-300"
          >
            {t("refaire")}
          </button>
          <span
            className="ml-2 min-w-24 text-right text-[12px] text-encre-500"
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
      </header>

      {verrouPar !== null && (
        <p
          role="status"
          data-testid="banniere-verrou"
          className="border-b border-ambre-300 bg-ambre-100 px-4 py-2 text-[13px] text-ambre-800"
        >
          {t("dejaEnEdition")}
        </p>
      )}

      <div className="grid min-h-0 flex-1 grid-cols-[16rem_1fr_21rem]">
        <Arbre
          modele={modele}
          selection={selection}
          section={section}
          survol={survol}
          modifies={modifies}
          onChoisirChamp={(id) => {
            store.getState().choisir(id);
            pontRef.current?.envoyer(message("SCROLL_TO", { fieldId: id }));
          }}
          onChoisirCollection={(id) => store.getState().choisir(id)}
          onOuvrirSection={(nom: SectionAnnexe) => store.getState().ouvrirSection(nom)}
        />

        <section className="flex min-h-0 flex-col bg-papier-200">
          <div className="flex items-center gap-2 border-b border-papier-300 bg-white px-4 py-2">
            {(["desktop", "tablette", "mobile"] as const).map((valeur) => (
              <button
                key={valeur}
                type="button"
                data-testid={`cadrage-${valeur}`}
                aria-pressed={cadrage === valeur}
                onClick={() => setCadrage(valeur)}
                className={`h-8 rounded-md px-2.5 text-[13px] transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-bleu-300 ${
                  cadrage === valeur
                    ? "bg-encre-900 text-papier-50"
                    : "hover:bg-papier-100"
                }`}
              >
                {t(`cadrage.${valeur}`)}
              </button>
            ))}

            <button
              type="button"
              data-testid="voir-zones"
              aria-pressed={zonesVisibles}
              onClick={() => setZonesVisibles((valeur) => !valeur)}
              className={`ml-auto h-8 rounded-md px-2.5 text-[13px] transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-bleu-300 ${
                zonesVisibles ? "bg-bleu-100 text-bleu-800" : "hover:bg-papier-100"
              }`}
            >
              {t("voirZones")}
            </button>
            <button
              type="button"
              data-testid="mode-apercu"
              aria-pressed={modeApercu}
              onClick={() => setModeApercu((valeur) => !valeur)}
              className={`h-8 rounded-md px-2.5 text-[13px] transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-bleu-300 ${
                modeApercu ? "bg-bleu-100 text-bleu-800" : "hover:bg-papier-100"
              }`}
            >
              {t("apercuReel")}
            </button>
          </div>

          <div className="min-h-0 flex-1 overflow-auto p-4">
            <iframe
              ref={iframeRef}
              src={modele.apercuUrl}
              title={t("apercu")}
              data-testid="apercu"
              sandbox="allow-scripts allow-same-origin"
              style={{ width: LARGEURS_APERCU[cadrage] }}
              className="mx-auto h-full min-h-[36rem] border-0 bg-white shadow-sm transition-[width]"
            />
          </div>
        </section>

        <aside className="min-h-0 overflow-y-auto border-l border-papier-300 bg-white p-4">
          {section === "theme" ? (
            <PanneauTheme
              jetons={modele.theme}
              valeurs={contenu.theme}
              onChanger={changerJeton}
            />
          ) : section === "contact" ? (
            <PanneauContact
              globaux={modele.globaux}
              valeurs={contenu.globals}
              onChanger={changerGlobal}
            />
          ) : section === "seo" ? (
            <PanneauSeo
              pages={modele.pages}
              valeurs={contenu.seo}
              onChanger={changerSeo}
            />
          ) : section === "medias" ? (
            <PanneauMedias
              medias={medias}
              onChoisir={choisirMedia}
              onDeposer={deposerMedia}
            />
          ) : (
            <>
              {champSelectionne !== null && irresolus.includes(champSelectionne.id) && (
                <p className="mb-3 rounded-md bg-ambre-100 px-3 py-2 text-[13px] text-ambre-800">
                  {t("champIntrouvable")}
                </p>
              )}
              <Proprietes
                champ={champSelectionne}
                collection={collectionSelectionnee}
                valeur={valeurCourante}
                medias={medias}
                onChanger={(valeur) =>
                  champSelectionne && changerChamp(champSelectionne.id, valeur)
                }
                onChoisirChamp={(id) => store.getState().choisir(id)}
                onOuvrirMedias={() => store.getState().ouvrirSection("medias")}
              />
            </>
          )}
        </aside>
      </div>
    </div>
  );
}
