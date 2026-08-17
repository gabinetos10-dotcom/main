import type { Metadata } from "next";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { features } from "@/env";

export const metadata: Metadata = { title: "Vérifiez votre boîte mail" };

export default async function PageVerifier() {
  const t = await getTranslations("verifier");
  const flags = features();

  return (
    <>
      <h1 className="titre-display text-2xl">{t("titre")}</h1>
      <p className="mt-3 text-[15px] leading-relaxed text-encre-700">{t("texte")}</p>
      <p className="mt-4 text-[13px] leading-relaxed text-encre-500">{t("aide")}</p>

      {!flags.emailDelivery ? (
        <p className="mt-6 rounded-[var(--radius-calque)] border border-ambre-100 bg-ambre-100/50 p-3 text-[13px] leading-relaxed text-ambre-700">
          Aucun email n&apos;a été envoyé : le lien de connexion se trouve dans les logs
          du serveur, sur la ligne « lien de connexion journalisé ».
        </p>
      ) : null}

      <Link
        href="/connexion"
        className="mt-8 inline-block text-sm text-encre-700 underline-offset-4 hover:underline"
      >
        {t("retour")}
      </Link>
    </>
  );
}
