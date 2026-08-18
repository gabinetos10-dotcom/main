import { and, eq } from "drizzle-orm";
import type { DbHandle } from "../client";
import { memberships, organizations } from "../schema/tenancy";
import { withTenant } from "../tenant";

/**
 * Organisations et appartenances.
 *
 * Ce dépôt est le seul qui travaille **hors** contexte d'organisation : il faut
 * bien trouver l'organisation avant de pouvoir s'y scoper. Toutes ses requêtes
 * sont donc filtrées explicitement par `userId`, jamais par un identifiant
 * fourni par l'appelant.
 */

export interface OrgMembership {
  orgId: string;
  orgName: string;
  orgSlug: string;
  role: (typeof memberships.$inferSelect)["role"];
}

export function organizationsRepository(handle: DbHandle) {
  return {
    /** Organisations dont l'utilisateur est membre. La seule porte d'entrée. */
    async forUser(userId: string): Promise<OrgMembership[]> {
      const lignes = await handle.db
        .select({
          orgId: organizations.id,
          orgName: organizations.name,
          orgSlug: organizations.slug,
          role: memberships.role,
        })
        .from(memberships)
        .innerJoin(organizations, eq(memberships.orgId, organizations.id))
        .where(eq(memberships.userId, userId));

      return lignes;
    },

    async isMember(userId: string, orgId: string): Promise<boolean> {
      const ligne = await handle.db
        .select({ id: memberships.id })
        .from(memberships)
        .where(and(eq(memberships.userId, userId), eq(memberships.orgId, orgId)))
        .limit(1);
      return ligne.length > 0;
    },

    /**
     * Crée l'organisation d'un nouvel utilisateur et l'y inscrit comme
     * administrateur d'agence, dans une seule transaction : une organisation
     * sans membre serait inaccessible à jamais.
     */
    async createForOwner(input: {
      userId: string;
      name: string;
      slug: string;
    }): Promise<OrgMembership> {
      return handle.db.transaction(async (tx) => {
        const [organisation] = await tx
          .insert(organizations)
          .values({ name: input.name, slug: input.slug })
          .returning();

        if (organisation === undefined) {
          throw new Error("Création de l'organisation impossible.");
        }

        await tx.insert(memberships).values({
          orgId: organisation.id,
          userId: input.userId,
          role: "agency_admin",
        });

        return {
          orgId: organisation.id,
          orgName: organisation.name,
          orgSlug: organisation.slug,
          role: "agency_admin" as const,
        };
      });
    },

    /** Compte les membres d'une organisation, pour le quota de sièges (§16). */
    async seatCount(orgId: string): Promise<number> {
      return withTenant(handle, orgId, async (db) => {
        const lignes = await db
          .select({ id: memberships.id })
          .from(memberships)
          .where(eq(memberships.orgId, orgId));
        return lignes.length;
      });
    },
  };
}
