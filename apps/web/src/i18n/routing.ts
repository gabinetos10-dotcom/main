import { defineRouting } from 'next-intl/routing';

/**
 * Le français est la langue du produit ; l'anglais est disponible.
 *
 * `as-needed` : le français vit à la racine (`/reglages`), l'anglais sous préfixe (`/en/settings`).
 * Ce choix évite de faire porter à la majorité francophone un préfixe qu'elle ne lira jamais.
 */
export const routing = defineRouting({
  locales: ['fr', 'en'],
  defaultLocale: 'fr',
  localePrefix: 'as-needed',
});

export type Locale = (typeof routing.locales)[number];
