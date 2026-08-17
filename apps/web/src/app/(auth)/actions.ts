"use server";

import { AuthError } from "next-auth";
import { z } from "zod";
import { signIn } from "@/auth";
import { logger } from "@/lib/logger";

export interface EtatConnexion {
  erreur?: string;
  email?: string;
}

const emailSchema = z
  .string()
  .trim()
  .min(1, "Entrez votre adresse email.")
  .max(320, "Cette adresse est trop longue.")
  .email("Cette adresse email ne semble pas valide.");

/**
 * Envoi du lien magique.
 *
 * `signIn` provoque une redirection en levant une exception : elle doit être
 * relancée telle quelle. Seules les `AuthError` sont converties en message
 * affichable — tout le reste remonte au gestionnaire d'erreurs de Next.
 */
export async function envoyerLienDeConnexion(
  _etatPrecedent: EtatConnexion,
  formData: FormData,
): Promise<EtatConnexion> {
  const brut = formData.get("email");
  const email = typeof brut === "string" ? brut : "";

  const validation = emailSchema.safeParse(email);
  if (!validation.success) {
    return { erreur: validation.error.issues[0]?.message, email };
  }

  try {
    // `redirectTo` fixe la destination encodée dans le lien de connexion : sans
    // lui, Auth.js ramène à la racine du site, c'est-à-dire sur la page
    // marketing, alors que la personne vient précisément de se connecter.
    await signIn("resend", {
      email: validation.data,
      redirectTo: "/tableau-de-bord",
    });
    return {};
  } catch (error) {
    if (error instanceof AuthError) {
      logger.warn({ type: error.type }, "échec d'envoi du lien de connexion");
      return {
        erreur: "L'envoi a échoué. Vérifiez votre adresse et réessayez.",
        email,
      };
    }
    throw error;
  }
}

export async function connexionGoogle(): Promise<void> {
  await signIn("google", { redirectTo: "/tableau-de-bord" });
}
