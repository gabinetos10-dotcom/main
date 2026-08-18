/**
 * Dépôts scopés — la seule façon d'atteindre la base depuis l'application.
 *
 * Barrière 1 du §16 : `apps/web` ne peut pas importer `@calque/db/client`, la
 * règle ESLint le refuse. Il passe par ces dépôts, qui ouvrent tous une
 * transaction `withTenant` — barrière 2.
 */
export { organizationsRepository, type OrgMembership } from "./organizations";
export { sitesRepository, type SiteRow, type IngestedVersion } from "./sites";
