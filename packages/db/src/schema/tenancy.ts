import {
  bigint,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { localeEnum, planEnum, roleEnum, subscriptionStatusEnum } from "./enums";
import { users } from "./auth";

/** Marque blanche (§3) — plan Agence uniquement, appliqué côté serveur. */
export interface Branding {
  logoUrl?: string;
  accentColor?: string;
  emailFromName?: string;
  customDomain?: string;
}

export const organizations = pgTable(
  "organizations",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: text("name").notNull(),
    slug: text("slug").notNull().unique(),
    plan: planEnum("plan").notNull().default("solo"),
    stripeCustomerId: text("stripe_customer_id"),
    branding: jsonb("branding_json").$type<Branding>().notNull().default({}),
    locale: localeEnum("locale").notNull().default("fr"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("organizations_slug_idx").on(t.slug)],
);

export const memberships = pgTable(
  "memberships",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orgId: uuid("org_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    role: roleEnum("role").notNull().default("viewer"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("memberships_org_user_uq").on(t.orgId, t.userId),
    index("memberships_org_id_idx").on(t.orgId),
    index("memberships_user_id_idx").on(t.userId),
  ],
);

/**
 * Invitations par email, lien magique expirant à 7 jours, sans mot de passe (§16).
 * Seul le hachage du jeton est stocké : une fuite de la base ne permet pas de
 * rejouer une invitation.
 */
export const invitations = pgTable(
  "invitations",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orgId: uuid("org_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    /** Nul pour une invitation au niveau organisation (rôle `agency_admin`). */
    siteId: uuid("site_id"),
    email: text("email").notNull(),
    role: roleEnum("role").notNull().default("site_editor"),
    tokenHash: text("token_hash").notNull().unique(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    acceptedAt: timestamp("accepted_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("invitations_org_id_idx").on(t.orgId),
    index("invitations_email_idx").on(t.email),
  ],
);

export const subscriptions = pgTable(
  "subscriptions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orgId: uuid("org_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    stripeSubscriptionId: text("stripe_subscription_id").unique(),
    plan: planEnum("plan").notNull().default("solo"),
    status: subscriptionStatusEnum("status").notNull().default("essai"),
    currentPeriodEnd: timestamp("current_period_end", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("subscriptions_org_id_idx").on(t.orgId)],
);

/** Compteurs de quota (§16), un enregistrement par organisation et par période `AAAA-MM`. */
export const usageCounters = pgTable(
  "usage_counters",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orgId: uuid("org_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    period: text("period").notNull(),
    sites: integer("sites").notNull().default(0),
    seats: integer("seats").notNull().default(0),
    storageBytes: bigint("storage_bytes", { mode: "number" }).notNull().default(0),
    publishes: integer("publishes").notNull().default(0),
    aiCredits: integer("ai_credits").notNull().default(0),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("usage_counters_org_period_uq").on(t.orgId, t.period)],
);

/**
 * Journal d'audit (§16), rétention 12 mois.
 *
 * `site_id` et `actor_id` n'ont volontairement pas de clé étrangère : un journal
 * d'audit doit survivre à la suppression de ce qu'il décrit. Une trace effacée en
 * cascade par la suppression d'un site n'a plus aucune valeur probante.
 */
export const auditLogs = pgTable(
  "audit_logs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orgId: uuid("org_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    siteId: uuid("site_id"),
    actorId: uuid("actor_id"),
    action: text("action").notNull(),
    target: text("target"),
    metadata: jsonb("metadata_json")
      .$type<Record<string, unknown>>()
      .notNull()
      .default({}),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("audit_logs_org_id_created_at_idx").on(t.orgId, t.createdAt),
    index("audit_logs_site_id_idx").on(t.siteId),
  ],
);
