/** Tarification et quotas (§3). Vérifiés côté serveur avant chaque action (§16). */

export type Plan = "solo" | "studio" | "agence";

export interface PlanQuotas {
  label: string;
  /** Prix mensuel en centimes d'euro. */
  priceCents: number;
  /** `null` = illimité. */
  sites: number | null;
  seats: number | null;
  storageBytes: number;
  publishesPerMonth: number | null;
  aiCreditsPerMonth: number;
  whiteLabel: boolean;
}

const GO = 1024 * 1024 * 1024;

export const PLANS: Record<Plan, PlanQuotas> = {
  solo: {
    label: "Solo",
    priceCents: 2900,
    sites: 1,
    seats: 3,
    storageBytes: 2 * GO,
    publishesPerMonth: 50,
    aiCreditsPerMonth: 100,
    whiteLabel: false,
  },
  studio: {
    label: "Studio",
    priceCents: 7900,
    sites: 10,
    seats: 15,
    storageBytes: 20 * GO,
    publishesPerMonth: 500,
    aiCreditsPerMonth: 1000,
    whiteLabel: false,
  },
  agence: {
    label: "Agence",
    priceCents: 19900,
    sites: null,
    seats: null,
    storageBytes: 100 * GO,
    publishesPerMonth: null,
    aiCreditsPerMonth: 5000,
    whiteLabel: true,
  },
};

/** Essai gratuit 14 jours sans carte (§3). */
export const TRIAL_DAYS = 14;
