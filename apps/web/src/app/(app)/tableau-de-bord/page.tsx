import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Card, CardContent } from "@/components/ui/card";

export const metadata: Metadata = { title: "Vos sites" };

export default async function PageTableauDeBord() {
  const t = await getTranslations("tableauDeBord");

  return (
    <>
      <h1 className="titre-display text-3xl">{t("titre")}</h1>

      <Card className="mt-8">
        <CardContent className="py-14 text-center">
          <p className="text-[15px] font-medium text-encre-800">{t("vide")}</p>
          <p className="mx-auto mt-2 max-w-sm text-[14px] leading-relaxed text-encre-500">
            {t("videAide")}
          </p>
        </CardContent>
      </Card>
    </>
  );
}
