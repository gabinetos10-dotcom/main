"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import type { BlockState, CollectionState, ContentPatch, Seo } from "@calque/blueprint";
import { Arbre } from "./arbre";
import { Proprietes } from "./proprietes";
import { PanneauListe } from "./panneaux/liste";
import { PanneauBloc } from "./panneaux/bloc";
import {
  PanneauContact,
  PanneauMedias,
  PanneauSeo,
  PanneauTheme,
} from "./panneaux/annexes";
import { duplicatedFieldId } from "@calque/blueprint/ids";
import { creerPont, message, type Pont } from "./pont";
import { creerStore, type StoreEditeur } from "./store";
import type {
  ChampVue,
  CollectionVue,
  DuplicationVue,
  ItemVue,
  MediaVue,
  ModeleEditeur,
  SectionAnnexe,
} from "./types";
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
  const [recharge, setRecharge] = useState(0);
  const [focusChamp, setFocusChamp] = useState(0);
  const [annulation, setAnnulation] = useState<{
    libelle: string;
    retablir: () => void;
  } | null>(null);

  /**
   * Les items ajoutés n'existent dans aucun blueprint : ils sont nés dans le
   * brouillon, après l'analyse. Le panneau les fabrique donc lui-même, à partir
   * du gabarit de leur liste — sans quoi le client verrait dans l'aperçu une
   * carte qu'il ne pourrait ni sélectionner ni modifier.
   */
  const ajouts = useMemo(() => {
    const champs = new Map<string, ChampVue>();
    const items = new Map<string, ItemVue>();
    const origine = new Map<string, { collectionId: string; clef: string }>();
    const blocs: DuplicationVue[] = [];

    for (const collection of modele.collections) {
      const etat = contenu.collections[collection.id];
      if (etat === undefined) continue;

      for (const [itemId, valeurs] of Object.entries(etat.added)) {
        const champIds: string[] = [];
        let resume = "";

        for (const gabarit of collection.gabarit) {
          const identifiant = `${itemId}.${gabarit.key}`;
          champIds.push(identifiant);
          const valeur = (valeurs as Record<string, unknown>)[gabarit.key];
          if (resume === "" && gabarit.type === "text" && typeof valeur === "string") {
            resume = valeur;
          }

          champs.set(identifiant, {
            id: identifiant,
            label: gabarit.label,
            type: gabarit.type,
            pagePath: collection.pagePath,
            blocId: collection.blocId,
            blocLabel: collection.label,
            constraints: {},
            valeurInitiale: valeur,
            dansListe: true,
            collectionId: collection.id,
          });
          origine.set(identifiant, {
            collectionId: collection.id,
            clef: gabarit.key,
          });
        }

        items.set(itemId, { itemId, champIds, resume });
      }
    }

    /**
     * Un bloc dupliqué (§13) n'existe pas davantage dans le blueprint : ses
     * champs portent des identifiants `dup_`, dérivés du champ source et du
     * numéro de copie. Le panneau les calcule comme le builder, avec la même
     * fonction — c'est la seule façon que le client et le serveur désignent le
     * même champ.
     */
    for (const bloc of modele.blocs) {
      const nonces = contenu.blocks[bloc.id]?.duplicates ?? [];
      for (const [rang, nonce] of nonces.entries()) {
        const champsCopie: ChampVue[] = [];
        for (const champId of bloc.champIds) {
          const source = modele.champs.find((candidat) => candidat.id === champId);
          if (source === undefined) continue;
          const identifiant = duplicatedFieldId(champId, nonce);
          const copie: ChampVue = {
            ...source,
            id: identifiant,
            valeurInitiale: contenu.fields[champId] ?? source.valeurInitiale,
          };
          champs.set(identifiant, copie);
          champsCopie.push(copie);
        }
        blocs.push({
          cle: `${bloc.id}#${nonce}`,
          sourceBlocId: bloc.id,
          label: `${bloc.label} (${rang + 2})`,
          champs: champsCopie,
        });
      }
    }

    return { champs, items, origine, blocs };
  }, [
    modele.collections,
    modele.blocs,
    modele.champs,
    contenu.collections,
    contenu.blocks,
    contenu.fields,
  ]);

  const champsParId = useMemo(
    () =>
      new Map<string, ChampVue>([
        ...modele.champs.map((champ) => [champ.id, champ] as const),
        ...ajouts.champs,
      ]),
    [modele.champs, ajouts],
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

  /** Champ à rejoindre dans l'aperçu dès qu'il aura fini de se reconstruire. */
  const aRejoindre = useRef<string | null>(null);

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

    // La valeur d'un item ajouté ne vit pas dans `fields` : elle appartient à
    // l'item, dans l'état de sa liste. L'écrire ailleurs la perdrait au premier
    // réordonnancement, puisque le builder reconstruit l'item depuis là.
    const ajout = ajouts.origine.get(fieldId);
    if (ajout !== undefined) {
      const [itemId] = fieldId.split(".");
      store.getState().appliquer(
        champ?.label ?? fieldId,
        (brouillon) => {
          const etat = brouillon.collections[ajout.collectionId];
          const item = etat?.added[itemId as string];
          if (item !== undefined) item[ajout.clef] = valeur;
        },
        fieldId,
      );
      planifier({
        collections: {
          [ajout.collectionId]: store.getState().contenu.collections[
            ajout.collectionId
          ] as CollectionState,
        },
      });
    } else {
      store.getState().appliquer(
        champ?.label ?? fieldId,
        (brouillon) => {
          brouillon.fields[fieldId] = valeur;
        },
        fieldId,
      );
      planifier({ fields: { [fieldId]: valeur } });
    }

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

  const demandeRef = useRef(traiterDemandeApercu);
  useEffect(() => {
    demandeRef.current = traiterDemandeApercu;
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
          // Le §13 veut qu'un élément ajouté soit amené sous les yeux. Il n'est
          // visible qu'après la reconstruction : c'est donc l'aperçu qui donne
          // le signal, pas le clic.
          if (aRejoindre.current !== null) {
            pont.envoyer(message("SCROLL_TO", { fieldId: aRejoindre.current }));
            aRejoindre.current = null;
          }
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
        case "COLLECTION_REQUEST":
          demandeRef.current(msg.payload);
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
  }, [modele.apercuUrl, store, recharge]);

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

  /**
   * La proposition d'annulation s'efface d'elle-même au bout de huit secondes.
   *
   * Elle n'est pas la seule voie de retour : l'annulation générale reprend la
   * suppression comme n'importe quelle autre action. Le bandeau n'est qu'un
   * raccourci pour l'instant qui suit le clic, pas un filet permanent.
   */
  useEffect(() => {
    if (annulation === null) return;
    const minuteur = setTimeout(() => setAnnulation(null), 8000);
    return () => clearTimeout(minuteur);
  }, [annulation]);

  /* ── Listes (§13) ────────────────────────────────────────────────────────── */

  /**
   * Après une opération de structure, l'aperçu est reconstruit.
   *
   * Le runtime ne sait pas instancier un item : il n'a ni le gabarit, ni le
   * contenu. Il montre ce que le builder a produit — donc on enregistre, puis on
   * recharge l'iframe.
   */
  async function reconstruireApercu(): Promise<void> {
    if (minuterie.current !== null) clearTimeout(minuterie.current);
    setEnregistrement("enregistrement");
    const ok = await envoyerPatch(false);
    setEnregistrement(ok ? "enregistre" : "erreur");
    setRecharge((valeur) => valeur + 1);
  }

  function etatListe(collectionId: string): CollectionState {
    return contenu.collections[collectionId] ?? { order: [], added: {}, removed: [] };
  }

  /** Items de la liste dans l'ordre courant, ajouts compris. */
  function itemsDeLaListe(collection: CollectionVue): ItemVue[] {
    const parId = new Map(collection.items.map((item) => [item.itemId, item]));
    return ordreCourant(collection)
      .map((itemId) => parId.get(itemId) ?? ajouts.items.get(itemId))
      .filter((item): item is ItemVue => item !== undefined);
  }

  function ordreCourant(collection: CollectionVue): string[] {
    const etat = etatListe(collection.id);
    const naturel = collection.items.map((item) => item.itemId);
    const base = etat.order.length > 0 ? etat.order : naturel;
    return base.filter((itemId) => !etat.removed.includes(itemId));
  }

  function appliquerListe(
    collectionId: string,
    libelle: string,
    recette: (etat: CollectionState) => void,
  ): void {
    store.getState().appliquer(
      libelle,
      (brouillon) => {
        const etat = brouillon.collections[collectionId] ?? {
          order: [],
          added: {},
          removed: [],
        };
        brouillon.collections[collectionId] = etat;
        recette(etat);
      },
      collectionId,
    );
    planifier({
      collections: {
        [collectionId]: store.getState().contenu.collections[
          collectionId
        ] as CollectionState,
      },
    });
    void reconstruireApercu();
  }

  /** Première valeur non vide trouvée pour cette clé, parmi les items existants. */
  function valeurExistante(collection: CollectionVue, clef: string): unknown {
    for (const item of collection.items) {
      const identifiant = `${item.itemId}.${clef}`;
      const champ = champsParId.get(identifiant);
      if (champ === undefined) continue;
      const valeur = contenu.fields[identifiant] ?? champ.valeurInitiale;
      if (valeur !== undefined && valeur !== null && valeur !== "") return valeur;
    }
    return undefined;
  }

  /** Placeholders explicites, comme le §13 les demande. */
  function valeursParDefaut(collection: CollectionVue): Record<string, unknown> {
    const valeurs: Record<string, unknown> = {};
    for (const gabarit of collection.gabarit) {
      if (gabarit.type === "image") {
        // Une image vide s'afficherait cassée, et une carte cassée donne
        // l'impression que l'ajout a échoué. On reprend celle d'un élément
        // existant : la carte est présentable, et le client la remplace ensuite.
        valeurs[gabarit.key] = valeurExistante(collection, gabarit.key) ?? {
          src: "",
          alt: "",
        };
      } else if (gabarit.type === "link" || gabarit.type === "cta") {
        valeurs[gabarit.key] = { label: gabarit.label, href: "#" };
      } else valeurs[gabarit.key] = gabarit.label;
    }
    return valeurs;
  }

  function valeursDeLItem(
    collection: CollectionVue,
    itemId: string,
  ): Record<string, unknown> {
    const etat = etatListe(collection.id);
    const ajoute = etat.added[itemId];
    if (ajoute !== undefined) return { ...ajoute };

    const valeurs: Record<string, unknown> = {};
    for (const gabarit of collection.gabarit) {
      const clef = `${itemId}.${gabarit.key}`;
      const champ = champsParId.get(clef);
      if (champ === undefined) continue;
      valeurs[gabarit.key] = contenu.fields[clef] ?? champ.valeurInitiale;
    }
    return valeurs;
  }

  function nouvelItemId(): string {
    return `itm_${Math.random().toString(36).slice(2, 12)}`;
  }

  function ajouterItem(collection: CollectionVue): void {
    const itemId = nouvelItemId();
    const ordre = ordreCourant(collection);
    appliquerListe(collection.id, t("ajouterElement"), (etat) => {
      etat.added[itemId] = valeursParDefaut(collection);
      etat.order = [...ordre, itemId];
    });

    // On ouvre le premier champ du nouvel élément, on l'amène sous les yeux du
    // client et on y pose le curseur : ajouter, c'est vouloir écrire dedans.
    const premier = collection.gabarit[0];
    if (premier === undefined) return;
    const champId = `${itemId}.${premier.key}`;
    store.getState().choisir(champId);
    aRejoindre.current = champId;
    setFocusChamp((valeur) => valeur + 1);
  }

  function dupliquerItem(collection: CollectionVue, itemId: string): void {
    const copieId = nouvelItemId();
    const ordre = ordreCourant(collection);
    const valeurs = valeursDeLItem(collection, itemId);

    // Suffixe « (copie) » sur le premier champ texte, comme le §13 le demande :
    // deux items identiques dans une liste sont impossibles à distinguer.
    const premierTexte = collection.gabarit.find((gabarit) => gabarit.type === "text");
    if (premierTexte !== undefined && typeof valeurs[premierTexte.key] === "string") {
      valeurs[premierTexte.key] = t("copieDe", {
        texte: valeurs[premierTexte.key] as string,
      });
    }

    const rang = ordre.indexOf(itemId);
    appliquerListe(collection.id, t("dupliquer"), (etat) => {
      etat.added[copieId] = valeurs;
      etat.order = [...ordre.slice(0, rang + 1), copieId, ...ordre.slice(rang + 1)];
    });
  }

  function supprimerItem(collection: CollectionVue, itemId: string): void {
    const ordre = ordreCourant(collection);
    if (ordre.length <= collection.min) return;

    const avant = etatListe(collection.id);
    appliquerListe(collection.id, t("supprimer"), (etat) => {
      etat.order = ordre.filter((candidat) => candidat !== itemId);
      if (etat.added[itemId] !== undefined) delete etat.added[itemId];
      else etat.removed = [...etat.removed, itemId];
    });

    // Toute action destructive est annulable (§12), pendant huit secondes.
    setAnnulation({
      libelle: t("elementSupprime"),
      retablir: () => {
        store.getState().appliquer(t("annuler"), (brouillon) => {
          brouillon.collections[collection.id] = avant;
        });
        planifier({ collections: { [collection.id]: avant } });
        void reconstruireApercu();
      },
    });
  }

  function deplacerItem(
    collection: CollectionVue,
    itemId: string,
    versRang: number,
  ): void {
    const ordre = ordreCourant(collection);
    const depuis = ordre.indexOf(itemId);
    if (depuis === -1 || versRang < 0 || versRang >= ordre.length) return;

    const suivant = [...ordre];
    suivant.splice(depuis, 1);
    suivant.splice(versRang, 0, itemId);

    appliquerListe(collection.id, t("deplacer"), (etat) => {
      etat.order = suivant;
    });
  }

  /**
   * Garde-fou de mise en page (§13) : informatif, jamais bloquant.
   *
   * On ne connaît pas la grille du site — c'est du CSS qu'on ne touche pas. On
   * signale seulement le cas le plus courant : un nombre d'éléments qui cesse de
   * se répartir également sur deux, trois ou quatre colonnes.
   */
  function avertissementMiseEnPage(collection: CollectionVue): string | null {
    const depart = collection.items.length;
    const courant = ordreCourant(collection).length;
    if (courant === depart || courant < 2) return null;

    const colonnes = [4, 3, 2].find((n) => depart % n === 0 && depart > n);
    if (colonnes === undefined || courant % colonnes === 0) return null;
    return t("grilleDesequilibree", { colonnes });
  }

  /* ── Blocs (§13) ─────────────────────────────────────────────────────────── */

  function basculerBloc(blocId: string, masquer: boolean): void {
    store.getState().appliquer(
      masquer ? t("masquerBloc") : t("afficherBloc"),
      (brouillon) => {
        const etat = brouillon.blocks[blocId] ?? { hidden: false, duplicates: [] };
        brouillon.blocks[blocId] = { ...etat, hidden: masquer };
      },
      blocId,
    );
    planifier({
      blocks: { [blocId]: store.getState().contenu.blocks[blocId] as BlockState },
    });
    void reconstruireApercu();
  }

  function dupliquerBloc(blocId: string): void {
    const nonce = Math.random().toString(36).slice(2, 10);
    store.getState().appliquer(
      t("dupliquerBloc"),
      (brouillon) => {
        const etat = brouillon.blocks[blocId] ?? { hidden: false, duplicates: [] };
        brouillon.blocks[blocId] = { ...etat, duplicates: [...etat.duplicates, nonce] };
      },
      blocId,
    );
    planifier({
      blocks: { [blocId]: store.getState().contenu.blocks[blocId] as BlockState },
    });
    void reconstruireApercu();
  }

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
  const blocSelectionne =
    selection === null
      ? null
      : (modele.blocs.find((bloc) => bloc.id === selection) ?? null);

  /** Une demande venue de l'aperçu : ↑ ↓ ⧉ ✕ sur un item survolé (§13). */
  function traiterDemandeApercu(demande: {
    collectionId: string;
    itemId: string;
    op: "up" | "down" | "duplicate" | "remove";
  }): void {
    const collection = collectionsParId.get(demande.collectionId);
    if (collection === undefined) return;

    const ordre = ordreCourant(collection);
    const rang = ordre.indexOf(demande.itemId);

    switch (demande.op) {
      case "up":
        deplacerItem(collection, demande.itemId, rang - 1);
        return;
      case "down":
        deplacerItem(collection, demande.itemId, rang + 1);
        return;
      case "duplicate":
        dupliquerItem(collection, demande.itemId);
        return;
      case "remove":
        supprimerItem(collection, demande.itemId);
        return;
    }
  }

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

      {annulation !== null && (
        <div
          role="status"
          data-testid="toast-annuler"
          className="flex items-center gap-3 border-b border-encre-800 bg-encre-900 px-4 py-2 text-[13px] text-papier-50"
        >
          <span>{annulation.libelle}</span>
          <button
            type="button"
            data-testid="toast-annuler-bouton"
            onClick={() => {
              annulation.retablir();
              setAnnulation(null);
            }}
            className="rounded px-2 py-0.5 underline underline-offset-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-bleu-300"
          >
            {t("annuler")}
          </button>
        </div>
      )}

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
          duplications={ajouts.blocs}
          compteurs={
            new Map(
              modele.collections.map((collection) => [
                collection.id,
                ordreCourant(collection).length,
              ]),
            )
          }
          onChoisirChamp={(id) => {
            store.getState().choisir(id);
            pontRef.current?.envoyer(message("SCROLL_TO", { fieldId: id }));
          }}
          onChoisirCollection={(id) => store.getState().choisir(id)}
          onChoisirBloc={(id) => store.getState().choisir(id)}
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
              key={recharge}
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
              {collectionSelectionnee !== null ? (
                <PanneauListe
                  collection={collectionSelectionnee}
                  items={itemsDeLaListe(collectionSelectionnee)}
                  avertissement={avertissementMiseEnPage(collectionSelectionnee)}
                  onChoisirItem={(itemId) => {
                    const premier = itemsDeLaListe(collectionSelectionnee).find(
                      (item) => item.itemId === itemId,
                    )?.champIds[0];
                    if (premier !== undefined) store.getState().choisir(premier);
                  }}
                  onAjouter={() => ajouterItem(collectionSelectionnee)}
                  onDupliquer={(itemId) => dupliquerItem(collectionSelectionnee, itemId)}
                  onSupprimer={(itemId) => supprimerItem(collectionSelectionnee, itemId)}
                  onDeplacer={(itemId, rang) =>
                    deplacerItem(collectionSelectionnee, itemId, rang)
                  }
                />
              ) : blocSelectionne !== null ? (
                <PanneauBloc
                  bloc={blocSelectionne}
                  masque={contenu.blocks[blocSelectionne.id]?.hidden === true}
                  duplications={
                    contenu.blocks[blocSelectionne.id]?.duplicates.length ?? 0
                  }
                  onBasculer={(masquer) => basculerBloc(blocSelectionne.id, masquer)}
                  onDupliquer={() => dupliquerBloc(blocSelectionne.id)}
                />
              ) : (
                <Proprietes
                  champ={champSelectionne}
                  valeur={valeurCourante}
                  medias={medias}
                  focus={focusChamp}
                  onChanger={(valeur) =>
                    champSelectionne && changerChamp(champSelectionne.id, valeur)
                  }
                  onOuvrirMedias={() => store.getState().ouvrirSection("medias")}
                />
              )}
            </>
          )}
        </aside>
      </div>
    </div>
  );
}
