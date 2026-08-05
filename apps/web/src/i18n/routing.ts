import { defineRouting } from 'next-intl/routing';

/**
 * Le français est la langue du produit ; l'anglais est disponible.
 *
 * `as-needed` : le français vit à la racine (`/reglages`), l'anglais sous préfixe (`/en/settings`).
 * Ce choix évite de faire porter à la majorité francophone un préfixe qu'elle ne lira jamais.
 *
 * `localeDetection: false` : sans cela, next-intl négocie la langue depuis l'en-tête
 * `Accept-Language`, et un navigateur configuré en anglais est redirigé vers `/en` — la racine
 * cesse alors d'être française pour une partie des visiteurs. La langue reste un choix explicite.
 * À partir de la phase 1, `User.locale` fixera la préférence des membres connectés.
 */
export const routing = defineRouting({
  locales: ['fr', 'en'],
  defaultLocale: 'fr',
  localePrefix: 'as-needed',
  localeDetection: false,
});

export type Locale = (typeof routing.locales)[number];
