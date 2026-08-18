import type { Metadata } from "next";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { Card, CardContent } from "@/components/ui/card";
import { FormulaireDepot } from "./formulaire";

export const metadata: Metadata = { title: "Déposer un site" };

export default async function PageDepot() {
  const t = await getTranslations("depot");

  return (
    <div className="mx-auto max-w-5xl px-6 py-10">
      <Link
        href="/tableau-de-bord"
        className="text-[13px] text-encre-500 hover:underline"
      >
        ← {t("retour")}
      </Link>

      <h1 className="titre-display mt-4 text-3xl">{t("titre")}</h1>
      <p className="mt-3 max-w-xl text-[15px] leading-relaxed text-encre-600">
        {t("sousTitre")}
      </p>

      <Card className="mt-8">
        <CardContent className="py-8">
          <FormulaireDepot />
        </CardContent>
      </Card>
    </div>
  );
}
