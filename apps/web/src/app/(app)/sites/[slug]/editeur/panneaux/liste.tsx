"use client";

import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useState } from "react";
import { useTranslations } from "next-intl";
import type { CollectionVue, ItemVue } from "../types";

/**
 * Panneau d'une liste (§13) : ajouter, dupliquer, supprimer, réordonner.
 *
 * Le glisser-déposer est doublé de boutons ↑ ↓ : une liste qu'on ne peut
 * réordonner qu'à la souris est inutilisable au clavier, et le §12 impose une
 * navigation clavier complète.
 */

function Item({
  item,
  rang,
  total,
  peutSupprimer,
  enConfirmation,
  onChoisir,
  onMonter,
  onDescendre,
  onDupliquer,
  onDemanderSuppression,
  onRenoncer,
  onSupprimer,
}: {
  item: ItemVue;
  rang: number;
  total: number;
  peutSupprimer: boolean;
  enConfirmation: boolean;
  onChoisir: () => void;
  onMonter: () => void;
  onDescendre: () => void;
  onDupliquer: () => void;
  onDemanderSuppression: () => void;
  onRenoncer: () => void;
  onSupprimer: () => void;
}) {
  const t = useTranslations("editeur");
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: item.itemId });

  // Confirmer dans la ligne, et non dans une fenêtre : le client garde sous les
  // yeux l'élément dont il est question, et le geste reste réversible ensuite.
  if (enConfirmation) {
    return (
      <li
        ref={setNodeRef}
        style={{ transform: CSS.Transform.toString(transform), transition }}
        className="flex items-center gap-2 rounded-md border border-ambre-300 bg-ambre-100 px-2 py-1.5"
        data-testid={`item-${item.itemId}`}
      >
        <span className="flex-1 truncate text-[13px] text-ambre-800">
          {t("confirmerSuppression")}
        </span>
        <button
          type="button"
          onClick={onSupprimer}
          data-testid={`confirmer-${item.itemId}`}
          className="rounded px-2 py-0.5 text-[13px] font-medium text-ambre-800 underline underline-offset-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-bleu-300"
        >
          {t("confirmer")}
        </button>
        <button
          type="button"
          onClick={onRenoncer}
          data-testid={`renoncer-${item.itemId}`}
          className="rounded px-2 py-0.5 text-[13px] text-encre-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-bleu-300"
        >
          {t("renoncer")}
        </button>
      </li>
    );
  }

  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={`flex items-center gap-1 rounded-md border bg-white px-2 py-1.5 ${
        isDragging ? "border-bleu-400 shadow-sm" : "border-papier-300"
      }`}
      data-testid={`item-${item.itemId}`}
    >
      <button
        type="button"
        {...attributes}
        {...listeners}
        aria-label={t("deplacer")}
        className="cursor-grab px-1 text-encre-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-bleu-300"
      >
        ⠿
      </button>

      <button
        type="button"
        onClick={onChoisir}
        data-testid={`ouvrir-${item.itemId}`}
        className="flex-1 truncate text-left text-[13px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-bleu-300"
      >
        {item.resume.length > 0 ? item.resume : t("sansTitre")}
      </button>

      <button
        type="button"
        onClick={onMonter}
        disabled={rang === 0}
        aria-label={t("monter")}
        className="px-1 text-[13px] text-encre-500 disabled:opacity-30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-bleu-300"
      >
        ↑
      </button>
      <button
        type="button"
        onClick={onDescendre}
        disabled={rang === total - 1}
        aria-label={t("descendre")}
        className="px-1 text-[13px] text-encre-500 disabled:opacity-30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-bleu-300"
      >
        ↓
      </button>
      <button
        type="button"
        onClick={onDupliquer}
        aria-label={t("dupliquer")}
        data-testid={`dupliquer-${item.itemId}`}
        className="px-1 text-[13px] text-encre-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-bleu-300"
      >
        ⧉
      </button>
      <button
        type="button"
        onClick={onDemanderSuppression}
        disabled={!peutSupprimer}
        aria-label={t("supprimer")}
        data-testid={`supprimer-${item.itemId}`}
        className="px-1 text-[13px] text-encre-500 disabled:opacity-30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-bleu-300"
      >
        ✕
      </button>
    </li>
  );
}

export interface PanneauListeProps {
  collection: CollectionVue;
  /** Items dans l'ordre courant, ajouts du brouillon compris. */
  items: ItemVue[];
  onChoisirItem: (itemId: string) => void;
  onAjouter: () => void;
  onDupliquer: (itemId: string) => void;
  onSupprimer: (itemId: string) => void;
  onDeplacer: (itemId: string, versRang: number) => void;
  /** Avertissement de mise en page, informatif et jamais bloquant (§13). */
  avertissement: string | null;
}

export function PanneauListe({
  collection,
  items,
  onChoisirItem,
  onAjouter,
  onDupliquer,
  onSupprimer,
  onDeplacer,
  avertissement,
}: PanneauListeProps) {
  const t = useTranslations("editeur");

  const capteurs = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const visibles = items;
  const ordre = visibles.map((item) => item.itemId);
  const [aConfirmer, setAConfirmer] = useState<string | null>(null);

  const surFin = (evenement: DragEndEvent): void => {
    const { active, over } = evenement;
    if (over === null || active.id === over.id) return;
    const cible = ordre.indexOf(String(over.id));
    if (cible !== -1) onDeplacer(String(active.id), cible);
  };

  return (
    <div className="space-y-4" data-testid="proprietes-liste">
      <div>
        <p className="text-[11px] uppercase tracking-wide text-encre-400">{t("liste")}</p>
        <h2 className="text-[15px] font-medium text-encre-800">{collection.label}</h2>
        <p className="mt-1 text-[13px] leading-relaxed text-encre-500">
          {t("listeAide", { nombre: visibles.length })}
        </p>
      </div>

      {avertissement !== null && (
        <p
          role="status"
          data-testid="avertissement-liste"
          className="rounded-md bg-ambre-100 px-3 py-2 text-[13px] leading-relaxed text-ambre-800"
        >
          {avertissement}
        </p>
      )}

      <DndContext
        sensors={capteurs}
        collisionDetection={closestCenter}
        onDragEnd={surFin}
      >
        <SortableContext items={ordre} strategy={verticalListSortingStrategy}>
          <ul className="space-y-1.5" data-testid="items-liste">
            {visibles.map((item, rang) => (
              <Item
                key={item.itemId}
                item={item}
                rang={rang}
                total={visibles.length}
                peutSupprimer={visibles.length > collection.min}
                onChoisir={() => onChoisirItem(item.itemId)}
                onMonter={() => onDeplacer(item.itemId, rang - 1)}
                onDescendre={() => onDeplacer(item.itemId, rang + 1)}
                onDupliquer={() => onDupliquer(item.itemId)}
                enConfirmation={aConfirmer === item.itemId}
                onDemanderSuppression={() => setAConfirmer(item.itemId)}
                onRenoncer={() => setAConfirmer(null)}
                onSupprimer={() => {
                  setAConfirmer(null);
                  onSupprimer(item.itemId);
                }}
              />
            ))}
          </ul>
        </SortableContext>
      </DndContext>

      <button
        type="button"
        onClick={onAjouter}
        disabled={visibles.length >= collection.max}
        data-testid="ajouter-item"
        className="w-full rounded-md border border-dashed border-papier-400 px-3 py-2 text-[13px] transition hover:border-bleu-400 disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-bleu-300"
      >
        {visibles.length >= collection.max
          ? t("listePleine", { maximum: collection.max })
          : t("ajouterElement")}
      </button>
    </div>
  );
}
