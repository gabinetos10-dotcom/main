import { Plan, Role } from '@prisma/client';

/**
 * Données de démonstration.
 *
 * Deux organisations, parce que la moitié des bugs multi-tenants ne se voit qu'à partir de deux
 * (ADR-007). Les quatre rôles sont représentés dans la première : c'est ce qui permet de tester la
 * matrice de permissions de la phase 1 sans cliquer.
 */

export const seedUsers = [
  {
    email: 'amelie@atelier.test',
    name: 'Amélie Rousset',
    role: Role.OWNER,
  },
  {
    email: 'karim@atelier.test',
    name: 'Karim Belhadj',
    role: Role.ADMIN,
  },
  {
    email: 'lea@atelier.test',
    name: 'Léa Marchand',
    role: Role.EDITOR,
  },
  {
    email: 'tom@atelier.test',
    name: 'Tom Vasseur',
    role: Role.VIEWER,
  },
] as const;

/** Organisation « agence » : plusieurs sites, plusieurs membres, plusieurs rôles. */
export const seedAgency = {
  name: 'Studio Bellevue',
  slug: 'studio-bellevue',
  plan: Plan.BUSINESS,
} as const;

/** Organisation « indépendante » : un seul membre, plan gratuit. Le cas le plus fréquent. */
export const seedFreelance = {
  name: 'Manon Ferrand',
  slug: 'manon-ferrand',
  plan: Plan.FREE,
  owner: {
    email: 'manon@atelier.test',
    name: 'Manon Ferrand',
  },
} as const;

export const seedSite = {
  name: 'Café Lauzon',
  slug: 'cafe-lauzon',
  pages: [
    { path: '/', title: 'Accueil', isHome: true, order: 0 },
    { path: '/la-carte', title: 'La carte', isHome: false, order: 1 },
    { path: '/contact', title: 'Contact', isHome: false, order: 2 },
  ],
} as const;

/**
 * Document vide mais valide (ADR-001). Les blocks n'existent qu'à la phase 2 : y mettre des types
 * inventés maintenant produirait des documents à migrer avant même d'avoir un moteur de rendu.
 */
export function emptyDocument() {
  return {
    version: 1,
    root: [],
    meta: { updatedAt: new Date().toISOString() },
  };
}
