import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { auth } from "@/auth";
import { features } from "@/env";
import { Button } from "@/components/ui/button";
import { connexionGoogle } from "../actions";
import { FormulaireConnexion } from "./formulaire";

export const metadata: Metadata = { title: "Connexion" };

export default async function PageConnexion() {
  const session = await auth();
  if (session?.user) redirect("/tableau-de-bord");

  const t = await getTranslations("connexion");
  const flags = features();

  return (
    <>
      <h1 className="titre-display text-3xl">{t("titre")}</h1>
      <p className="mt-3 mb-8 text-[15px] leading-relaxed text-encre-700">
        {t("sousTitre")}
      </p>

      <FormulaireConnexion />

      {flags.googleSignIn ? (
        <>
          <div className="my-6 flex items-center gap-3">
            <span className="h-px flex-1 bg-papier-300" />
            <span className="text-[13px] text-encre-500">{t("ou")}</span>
            <span className="h-px flex-1 bg-papier-300" />
          </div>
          <form action={connexionGoogle}>
            <Button type="submit" variant="secondaire" className="w-full">
              {t("google")}
            </Button>
          </form>
        </>
      ) : null}

      {!flags.emailDelivery ? (
        <p className="mt-8 rounded-[var(--radius-calque)] border border-ambre-100 bg-ambre-100/50 p-3 text-[13px] leading-relaxed text-ambre-700">
          {t("modeDev")}
        </p>
      ) : null}
    </>
  );
}
