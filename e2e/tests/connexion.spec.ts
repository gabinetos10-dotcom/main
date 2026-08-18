import { expect, test } from "@playwright/test";
import { emailUnique, lienPour } from "../support/connexion";

/**
 * Parcours de connexion complet — le critère d'acceptation de P0 : « je me
 * connecte par email ».
 *
 * Le lien magique est récupéré via la prise de test `CALQUE_MAGIC_LINK_SINK`,
 * alimentée par le serveur quand aucune clé Resend n'est configurée. Le jeton,
 * lui, est bien créé en base et consommé une seule fois : rien n'est simulé.
 */

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

  const lien = await lienPour(email);
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

  await page.goto(await lienPour(email));
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
