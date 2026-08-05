/**
 * Marque, centralisée (ADR : un renommage doit rester un changement local).
 *
 * Rien d'autre dans le dépôt ne doit écrire le nom du produit en dur : ni une page, ni un email,
 * ni un template. Une chaîne de marque hors de ce fichier est un bug.
 */

export const brand = {
  /** Nom complet, tel qu'il s'affiche à l'utilisateur. */
  name: "L'atelier du web",
  /** Nom court, pour les endroits contraints (onglet, en-tête dense, expéditeur d'email). */
  shortName: 'Atelier',
  /** Identifiant technique : scope npm, préfixes de cookies, noms de files BullMQ. */
  slug: 'atelier',
  /** Baseline. Une seule, tenue partout. */
  tagline: 'Des sites web faits main, sans écrire une ligne de code.',
  /** Domaine de l'application et du site vitrine. */
  domain: 'atelierduweb.fr',
  /** Adresses d'expédition (surchargées par l'environnement en production). */
  email: {
    from: 'bonjour@atelierduweb.fr',
    support: 'support@atelierduweb.fr',
  },
} as const;

/**
 * Domaine racine des sites publiés (`monsite.<base>`).
 *
 * Distinct de `brand.domain` à dessein : le jour où les sites publiés déménagent sur un domaine
 * plus court, c'est une variable d'environnement à changer, pas une migration.
 */
export function sitesBaseDomain(env: { SITES_BASE_DOMAIN?: string }): string {
  return env.SITES_BASE_DOMAIN ?? brand.domain;
}

export type Brand = typeof brand;
