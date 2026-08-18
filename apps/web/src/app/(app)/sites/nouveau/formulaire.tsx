"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { lancerIngestion, preparerDepot } from "../actions";

type Etape = "attente" | "envoi" | "analyse" | "erreur";

/**
 * Dépôt d'une archive.
 *
 * L'archive est envoyée directement au stockage, pas au serveur de
 * l'application : c'est ce qui permet un ZIP de 100 Mo. Les trois états visibles
 * — envoi, analyse, terminé — correspondent aux trois temps réels du parcours,
 * sans indicateur de progression inventé.
 */
export function FormulaireDepot() {
  const t = useTranslations("depot");
  const router = useRouter();
  const [etape, setEtape] = useState<Etape>("attente");
  const [message, setMessage] = useState<string | null>(null);
  const [fichier, setFichier] = useState<File | null>(null);
  const [nom, setNom] = useState("");
  const [enCours, demarrer] = useTransition();
  const champFichier = useRef<HTMLInputElement>(null);

  const soumettre = (evenement: React.FormEvent): void => {
    evenement.preventDefault();
    if (fichier === null) {
      setMessage(t("erreurFichierManquant"));
      setEtape("erreur");
      return;
    }

    demarrer(async () => {
      setEtape("envoi");
      setMessage(null);

      try {
        const preparation = await preparerDepot(
          nom.trim().length > 0 ? nom : fichier.name,
        );

        const reponse = await fetch(preparation.uploadUrl, {
          method: "PUT",
          body: fichier,
          headers: { "content-type": "application/zip" },
          ...(preparation.sameOrigin ? { credentials: "same-origin" as const } : {}),
        });

        if (!reponse.ok) {
          setEtape("erreur");
          setMessage(t("erreurEnvoi"));
          return;
        }

        setEtape("analyse");
        const resultat = await lancerIngestion({
          siteId: preparation.siteId,
          versionId: preparation.versionId,
          slug: preparation.slug,
        });

        if (!resultat.ok) {
          setEtape("erreur");
          setMessage(resultat.message ?? t("erreurEnvoi"));
          return;
        }

        router.push(`/sites/${resultat.slug}`);
      } catch {
        setEtape("erreur");
        setMessage(t("erreurEnvoi"));
      }
    });
  };

  const occupe = enCours || etape === "envoi" || etape === "analyse";

  return (
    <form onSubmit={soumettre} className="space-y-6" data-testid="formulaire-depot">
      <div className="space-y-2">
        <Label htmlFor="nom">{t("nom")}</Label>
        <Input
          id="nom"
          name="nom"
          value={nom}
          onChange={(evenement) => setNom(evenement.target.value)}
          placeholder={t("nomPlaceholder")}
          disabled={occupe}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="archive">{t("archive")}</Label>
        <input
          ref={champFichier}
          id="archive"
          name="archive"
          type="file"
          accept=".zip,application/zip"
          disabled={occupe}
          onChange={(evenement) => {
            const choisi = evenement.target.files?.[0] ?? null;
            setFichier(choisi);
            if (choisi !== null && nom.trim().length === 0) {
              setNom(choisi.name.replace(/\.zip$/iu, ""));
            }
          }}
          className="block w-full rounded-md border border-papier-300 bg-white px-3 py-2 text-[14px] file:mr-3 file:rounded file:border-0 file:bg-papier-200 file:px-3 file:py-1.5 file:text-[13px]"
        />
        <p className="text-[13px] leading-relaxed text-encre-500">{t("aide")}</p>
      </div>

      {message !== null && (
        <p role="alert" data-testid="erreur-depot" className="text-[14px] text-ambre-700">
          {message}
        </p>
      )}

      <Button type="submit" disabled={occupe} data-testid="lancer-depot">
        {etape === "envoi"
          ? t("envoiEnCours")
          : etape === "analyse"
            ? t("analyseEnCours")
            : t("deposer")}
      </Button>
    </form>
  );
}
