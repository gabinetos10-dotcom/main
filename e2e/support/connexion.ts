import { readFile } from "node:fs/promises";
import type { Page } from "@playwright/test";

/**
 * Connexion réelle par lien magique, réutilisée par les parcours qui commencent
 * après l'authentification. Rien n'est simulé : le jeton est créé en base et
 * consommé une seule fois.
 */

/**
 * Récupère le lien magique **de cette adresse**.
 *
 * La prise est un fichier partagé par tous les tests, qui s'exécutent en
 * parallèle : prendre la dernière ligne reviendrait à voler le lien du voisin,
 * et l'échec ressemblerait à un problème de session.
 */
export async function lienPour(email: string): Promise<string> {
  const chemin = process.env["CALQUE_MAGIC_LINK_SINK"];
  if (!chemin) throw new Error("CALQUE_MAGIC_LINK_SINK non défini");
  const attendu = encodeURIComponent(email);

  for (let essai = 0; essai < 60; essai += 1) {
    try {
      const lignes = (await readFile(chemin, "utf8")).trim().split("\n").filter(Boolean);
      const mien = lignes.findLast((ligne) => ligne.includes(attendu));
      if (mien) return mien;
    } catch {
      /* le fichier n'existe pas encore */
    }
    await new Promise((r) => setTimeout(r, 250));
  }
  throw new Error(`Aucun lien de connexion pour ${email} dans ${chemin}`);
}

export function emailUnique(prefixe = "e2e"): string {
  return `${prefixe}-${Date.now()}-${Math.floor(Math.random() * 1e4)}@calque.test`;
}

export async function seConnecter(page: Page, email = emailUnique()): Promise<string> {
  await page.goto("/connexion");
  await page.getByLabel("Adresse email").fill(email);
  await page.getByRole("button", { name: /lien de connexion/iu }).click();
  // On attend l'écran de confirmation, pas une URL : Auth.js sert la page de
  // vérification sous sa propre route, et l'URL exacte est un détail interne.
  await page.getByRole("heading", { name: /boîte mail/iu }).waitFor();

  const lien = await lienPour(email);
  await page.goto(lien);
  await page.waitForURL(/\/tableau-de-bord/u, { timeout: 20_000 });
  return email;
}
