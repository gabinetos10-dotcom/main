import { getRequestConfig } from "next-intl/server";
import { DEFAULT_LOCALE, LOCALES, type Locale } from "./locales";

/**
 * next-intl sans routage préfixé par langue.
 *
 * L'internationalisation complète — négociation, sélecteur, URLs traduites —
 * arrive en P10. Poser next-intl dès maintenant, mais sans segment `[locale]`,
 * permet d'écrire toute l'interface avec des clés de traduction dès P0 sans
 * figer une arborescence de routes qu'il faudrait ensuite déplacer.
 */
export default getRequestConfig(async () => {
  const locale: Locale = DEFAULT_LOCALE;
  const messages = (await import(`./messages/${locale}.json`)) as {
    default: Record<string, unknown>;
  };

  return { locale, messages: messages.default };
});

export { DEFAULT_LOCALE, LOCALES };
