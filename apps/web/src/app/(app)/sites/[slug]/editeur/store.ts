"use client";

import { create } from "zustand";
import { applyPatches, enablePatches, produceWithPatches, type Patch } from "immer";
import type { ContentData } from "@calque/blueprint";

enablePatches();

/**
 * État de l'éditeur (§4 : Zustand + Immer, undo/redo par patches).
 *
 * L'annulation ne rejoue pas des états complets mais des **patches** : sur un
 * site de plusieurs centaines de champs, garder cinquante copies du contenu
 * coûterait des mégaoctets pour une fonctionnalité qu'on utilise trois fois par
 * session.
 */

const NIVEAUX = 50;

interface Pas {
  patches: Patch[];
  inverses: Patch[];
  /** Résumé lisible, pour le libellé du bouton d'annulation. */
  libelle: string;
}

export interface EtatEditeur {
  contenu: ContentData;
  /** Identifiants modifiés depuis l'ouverture : sert du badge « modifié ». */
  modifies: Set<string>;
  passes: Pas[];
  refaire: Pas[];
  selection: string | null;
  section: string | null;
  survol: string | null;

  appliquer(
    libelle: string,
    recette: (brouillon: ContentData) => void,
    marque?: string,
  ): void;
  annuler(): boolean;
  refaireDernier(): boolean;
  choisir(id: string | null): void;
  ouvrirSection(section: string | null): void;
  survoler(id: string | null): void;
  reinitialiser(contenu: ContentData): void;
}

export const creerStore = (initial: ContentData) =>
  create<EtatEditeur>((set, get) => ({
    contenu: initial,
    modifies: new Set<string>(),
    passes: [],
    refaire: [],
    selection: null,
    section: null,
    survol: null,

    appliquer(libelle, recette, marque) {
      const [suivant, patches, inverses] = produceWithPatches(get().contenu, recette);
      if (patches.length === 0) return;

      set((etat) => {
        const modifies = new Set(etat.modifies);
        if (marque !== undefined) modifies.add(marque);
        return {
          contenu: suivant,
          modifies,
          passes: [...etat.passes, { patches, inverses, libelle }].slice(-NIVEAUX),
          // Toute nouvelle action coupe la branche de rétablissement : c'est le
          // comportement attendu partout ailleurs, et le contraire surprendrait.
          refaire: [],
        };
      });
    },

    annuler() {
      const etat = get();
      const dernier = etat.passes.at(-1);
      if (dernier === undefined) return false;

      set({
        contenu: applyPatches(etat.contenu, dernier.inverses),
        passes: etat.passes.slice(0, -1),
        refaire: [...etat.refaire, dernier].slice(-NIVEAUX),
      });
      return true;
    },

    refaireDernier() {
      const etat = get();
      const dernier = etat.refaire.at(-1);
      if (dernier === undefined) return false;

      set({
        contenu: applyPatches(etat.contenu, dernier.patches),
        refaire: etat.refaire.slice(0, -1),
        passes: [...etat.passes, dernier].slice(-NIVEAUX),
      });
      return true;
    },

    choisir(id) {
      set({ selection: id, section: null });
    },

    /**
     * Ouvrir une section annexe **garde la sélection courante**.
     *
     * On ouvre la bibliothèque d'images depuis un champ image, pour y poser une
     * image. Effacer la sélection en chemin ferait perdre la destination : le
     * dépôt réussirait, et rien n'apparaîtrait dans la page.
     */
    ouvrirSection(section) {
      set({ section });
    },

    survoler(id) {
      set({ survol: id });
    },

    reinitialiser(contenu) {
      set({ contenu, modifies: new Set(), passes: [], refaire: [] });
    },
  }));

export type StoreEditeur = ReturnType<typeof creerStore>;
