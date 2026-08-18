"use client";

import { useTranslations } from "next-intl";
import type { BlocVue } from "../types";

/**
 * Panneau d'un bloc (§13) : le masquer, le dupliquer.
 *
 * Masquer n'efface rien : le HTML source reste intact, la publication ajoute une
 * règle `display: none` dans la feuille de surcharge. Le client peut donc
 * revenir en arrière sans que rien n'ait été perdu.
 */
export function PanneauBloc({
  bloc,
  masque,
  duplications,
  onBasculer,
  onDupliquer,
}: {
  bloc: BlocVue;
  masque: boolean;
  duplications: number;
  onBasculer: (masquer: boolean) => void;
  onDupliquer: () => void;
}) {
  const t = useTranslations("editeur");

  return (
    <div className="space-y-4" data-testid="proprietes-bloc">
      <div>
        <p className="text-[11px] uppercase tracking-wide text-encre-400">{t("bloc")}</p>
        <h2 className="text-[15px] font-medium text-encre-800">{bloc.label}</h2>
      </div>

      {bloc.peutMasquer && (
        <label className="flex items-start gap-2.5 text-[13px]">
          <input
            type="checkbox"
            data-testid="masquer-bloc"
            checked={masque}
            onChange={(evenement) => onBasculer(evenement.target.checked)}
            className="mt-0.5 size-4"
          />
          <span>
            <span className="block font-medium text-encre-700">{t("masquerBloc")}</span>
            <span className="mt-0.5 block leading-relaxed text-encre-500">
              {t("masquerBlocAide")}
            </span>
          </span>
        </label>
      )}

      <div className="space-y-1.5">
        <button
          type="button"
          onClick={onDupliquer}
          data-testid="dupliquer-bloc"
          className="w-full rounded-md border border-papier-300 px-3 py-2 text-[13px] transition hover:border-bleu-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-bleu-300"
        >
          {t("dupliquerBloc")}
        </button>
        {duplications > 0 && (
          <p className="text-[12px] text-encre-500">
            {t("duplications", { nombre: duplications })}
          </p>
        )}
      </div>
    </div>
  );
}
