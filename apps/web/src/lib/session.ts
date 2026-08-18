import { redirect } from "next/navigation";
import { getDatabase, organizationsRepository, type OrgMembership } from "@calque/db";
import { auth } from "@/auth";

/**
 * Contexte de la requête : qui, et pour quelle organisation.
 *
 * Toute page ou action de l'application passe par ici. Rien dans `apps/web` ne
 * doit résoudre une organisation autrement — c'est ce point unique qui garantit
 * qu'un identifiant d'organisation n'arrive jamais depuis l'URL ou un formulaire.
 */

export interface RequestContext {
  userId: string;
  email: string;
  org: OrgMembership;
}

function slugifier(valeur: string): string {
  return (
    valeur
      .normalize("NFD")
      .replace(/[̀-ͯ]/gu, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/gu, "-")
      .replace(/^-|-$/gu, "")
      .slice(0, 40) || "agence"
  );
}

export async function requireContext(): Promise<RequestContext> {
  const session = await auth();
  const userId = session?.user?.id;
  const email = session?.user?.email;

  if (userId === undefined || email === null || email === undefined) {
    redirect("/connexion");
  }

  const handle = await getDatabase();
  const organisations = organizationsRepository(handle);
  const existantes = await organisations.forUser(userId);

  // Première connexion : on crée l'organisation de l'agence. Sans elle, aucun
  // écran de l'application n'aurait de contexte, et le multi-tenant du §16 n'a
  // pas d'état « sans organisation » à représenter.
  const org =
    existantes[0] ??
    (await organisations.createForOwner({
      userId,
      name: email.split("@")[0] ?? "Mon agence",
      slug: `${slugifier(email.split("@")[0] ?? "agence")}-${userId.slice(0, 6)}`,
    }));

  return { userId, email, org };
}
