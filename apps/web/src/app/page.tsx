import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { BRAND } from "@calque/ui";

export default async function PageMarketing() {
  const t = await getTranslations("marketing");

  const etapes = [
    { cle: "une", numero: "01" },
    { cle: "deux", numero: "02" },
    { cle: "trois", numero: "03" },
  ] as const;

  return (
    <div className="min-h-dvh bg-papier-100">
      <header className="mx-auto flex max-w-5xl items-center justify-between px-6 py-6">
        <span className="text-[15px] font-semibold tracking-tight">{BRAND.name}</span>
        <Link
          href="/connexion"
          className="text-sm text-encre-700 underline-offset-4 hover:text-encre-900 hover:underline"
        >
          Connexion
        </Link>
      </header>

      <main className="mx-auto max-w-5xl px-6">
        {/* Hero — la typographie porte le message, pas les effets visuels. */}
        <section className="border-b border-papier-300 py-20 md:py-28">
          <h1 className="titre-display max-w-3xl text-[2.6rem] whitespace-pre-line md:text-6xl">
            {t("titre")}
          </h1>
          <p className="mt-8 max-w-xl text-[17px] leading-relaxed text-encre-700">
            {t("sousTitre")}
          </p>
          <div className="mt-10 flex flex-wrap items-center gap-3">
            <Link
              href="/connexion"
              className="inline-flex h-12 items-center justify-center rounded-[var(--radius-calque)] bg-bleu-600 px-7 text-base font-medium text-white transition-colors hover:bg-bleu-700"
            >
              {t("cta")}
            </Link>
            <Link
              href="#etapes"
              className="px-2 text-sm text-encre-700 underline-offset-4 hover:underline"
            >
              {t("ctaSecondaire")}
            </Link>
          </div>
        </section>

        {/* Le différenciateur, énoncé avant les fonctionnalités. */}
        <section className="border-b border-papier-300 py-16">
          <div className="grid gap-10 md:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)]">
            <h2 className="titre-display text-2xl md:text-3xl">{t("principe.titre")}</h2>
            <div>
              <p className="text-[17px] leading-relaxed text-encre-700">
                {t("principe.texte")}
              </p>
              <p className="mt-6 font-mono text-[13px] text-encre-500">
                build(source_immuable, blueprint, contenu) → site_final
              </p>
            </div>
          </div>
        </section>

        <section id="etapes" className="border-b border-papier-300 py-16">
          <h2 className="titre-display text-2xl md:text-3xl">{t("etapes.titre")}</h2>
          <ol className="mt-10 grid gap-10 md:grid-cols-3">
            {etapes.map(({ cle, numero }) => (
              <li key={cle}>
                <span className="font-mono text-[13px] text-ambre-600">{numero}</span>
                <h3 className="mt-3 text-[17px] font-semibold tracking-tight">
                  {t(`etapes.${cle}.titre`)}
                </h3>
                <p className="mt-2 text-[15px] leading-relaxed text-encre-700">
                  {t(`etapes.${cle}.texte`)}
                </p>
              </li>
            ))}
          </ol>
        </section>

        <section className="py-16">
          <div className="grid gap-10 md:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)]">
            <h2 className="titre-display text-2xl md:text-3xl">{t("pourQui.titre")}</h2>
            <p className="text-[17px] leading-relaxed text-encre-700">
              {t("pourQui.texte")}
            </p>
          </div>
        </section>
      </main>

      <footer className="mx-auto max-w-5xl border-t border-papier-300 px-6 py-8">
        <p className="text-[13px] text-encre-500">
          {BRAND.name} — {BRAND.tagline} · Hébergement en Union européenne.
        </p>
      </footer>
    </div>
  );
}
