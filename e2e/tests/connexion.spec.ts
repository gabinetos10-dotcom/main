import { expect, test } from "@playwright/test";
import { readFile } from "node:fs/promises";

/**
 * Parcours de connexion complet — le critère d'acceptation de P0 : « je me
 * connecte par email ».
 *
 * Le lien magique est récupéré via la prise de test `CALQUE_MAGIC_LINK_SINK`,
 * alimentée par le serveur quand aucune clé Resend n'est configurée. Le jeton,
 * lui, est bien créé en base et consommé une seule fois : rien n'est simulé.
 */

async function dernierLien(): Promise<string> {
  const chemin = process.env["CALQUE_MAGIC_LINK_SINK"];
  if (!chemin) throw new Error("CALQUE_MAGIC_LINK_SINK non défini");

  // L'écriture du lien suit l'envoi de la réponse HTTP : on laisse quelques
  // instants au serveur plutôt que de supposer l'ordre.
  for (let essai = 0; essai < 40; essai += 1) {
    try {
      const lignes = (await readFile(chemin, "utf8")).trim().split("\n").filter(Boolean);
      const dernier = lignes.at(-1);
      if (dernier) return dernier;
    } catch {
      /* le fichier n'existe pas encore */
    }
    await new Promise((r) => setTimeout(r, 250));
  }
  throw new Error(`Aucun lien de connexion déposé dans ${chemin}`);
}

function emailUnique(): string {
  return `e2e-${Date.now()}-${Math.floor(Math.random() * 1e4)}@calque.test`;
}

test("une page protégée renvoie vers la connexion", async ({ page }) => {
  await page.goto("/tableau-de-bord");
  await expect(page).toHaveURL(/\/connexion/u);
  await expect(page.getByRole("heading", { name: "Connexion" })).toBeVisible();
});

test("une adresse invalide est refusée sans quitter la page", async ({ page }) => {
  await page.goto("/connexion");
  await page.getByLabel("Adresse email").fill("pas-une-adresse");
  await page.getByRole("button", { name: /lien de connexion/iu }).click();

  await expect(page.getByText(/ne semble pas valide/iu)).toBeVisible();
  await expect(page).toHaveURL(/\/connexion/u);
});

test("connexion de bout en bout par lien magique", async ({ page }) => {
  const email = emailUnique();

  await page.goto("/connexion");
  await page.getByLabel("Adresse email").fill(email);
  await page.getByRole("button", { name: /lien de connexion/iu }).click();

  await expect(page.getByRole("heading", { name: /boîte mail/iu })).toBeVisible();

  const lien = await dernierLien();
  expect(lien).toContain("/api/auth/callback/");

  await page.goto(lien);

  await expect(page).toHaveURL(/\/tableau-de-bord/u);
  await expect(page.getByRole("heading", { name: "Vos sites" })).toBeVisible();
  await expect(page.getByText(email)).toBeVisible();

  // Un lien magique ne fonctionne qu'une fois : le rejouer doit échouer.
  await page.context().clearCookies();
  await page.goto(lien);
  await expect(page).toHaveURL(/\/erreur/u);
});

test("la déconnexion referme l'accès", async ({ page }) => {
  const email = emailUnique();

  await page.goto("/connexion");
  await page.getByLabel("Adresse email").fill(email);
  await page.getByRole("button", { name: /lien de connexion/iu }).click();
  await expect(page.getByRole("heading", { name: /boîte mail/iu })).toBeVisible();

  await page.goto(await dernierLien());
  await expect(page.getByRole("heading", { name: "Vos sites" })).toBeVisible();

  await page.getByRole("button", { name: "Se déconnecter" }).click();

  await page.goto("/tableau-de-bord");
  await expect(page).toHaveURL(/\/connexion/u);
});

test("l'application porte ses en-têtes de sécurité (§17)", async ({ request }) => {
  const reponse = await request.get("/");
  expect(reponse.status()).toBe(200);

  const entetes = reponse.headers();
  expect(entetes["x-frame-options"]).toBe("DENY");
  expect(entetes["x-content-type-options"]).toBe("nosniff");
  expect(entetes["referrer-policy"]).toBe("strict-origin-when-cross-origin");
  // L'en-tête qui trahirait la version de Next est explicitement désactivé.
  expect(entetes["x-powered-by"]).toBeUndefined();
});
