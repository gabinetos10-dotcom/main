import { pgEnum } from "drizzle-orm/pg-core";

/** Plans tarifaires (§3). Les quotas associés vivent dans `src/plans.ts`. */
export const planEnum = pgEnum("plan", ["solo", "studio", "agence"]);

/** Rôles (§16). `agency_admin` est le seul rôle porté au niveau organisation. */
export const roleEnum = pgEnum("role", [
  "agency_admin",
  "site_owner",
  "site_editor",
  "viewer",
]);

export const siteStatusEnum = pgEnum("site_status", [
  "ingestion",
  "pret",
  "publie",
  "archive",
  "echec_ingestion",
]);

export const hostProviderEnum = pgEnum("host_provider", ["cloudflare", "netlify"]);

export const deploymentStatusEnum = pgEnum("deployment_status", [
  "en_attente",
  "construction",
  "deploiement",
  "reussi",
  "echec",
  "annule",
]);

export const subscriptionStatusEnum = pgEnum("subscription_status", [
  "essai",
  "actif",
  "impaye",
  "annule",
  "expire",
]);

export const localeEnum = pgEnum("locale", ["fr", "en"]);
