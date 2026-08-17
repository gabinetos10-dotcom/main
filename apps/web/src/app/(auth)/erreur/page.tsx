import type { Metadata } from "next";
import Link from "next/link";
import { getTranslations } from "next-intl/server";

export const metadata: Metadata = { title: "Connexion impossible" };

/**
 * Auth.js redirige ici avec `?error=<code>`. Les codes sont traduits en langage
 * courant : le client final ne doit jamais lire « Verification » ou
 * « AccessDenied » (§12, aucun jargon).
 */
export default async function PageErreur({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const t = await getTranslations("erreur");
  const params = await searchParams;
  const code = typeof params["error"] === "string" ? params["error"] : "";

  const message =
    code === "Verification"
      ? t("lienExpire")
      : code === "AccessDenied"
        ? t("acces")
        : t("generique");

  return (
    <>
      <h1 className="titre-display text-2xl">{t("titre")}</h1>
      <p className="mt-3 text-[15px] leading-relaxed text-encre-700">{message}</p>
      <Link
        href="/connexion"
        className="mt-8 inline-block text-sm text-encre-700 underline-offset-4 hover:underline"
      >
        {t("reessayer")}
      </Link>
    </>
  );
}
