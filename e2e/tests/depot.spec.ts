import { expect, test } from "@playwright/test";
import { readFile, readdir } from "node:fs/promises";
import { join, relative, resolve } from "node:path";
import { zipSync } from "fflate";
import { seConnecter } from "../support/connexion";

/**
 * Parcours de dépôt (§22 P4) : « dépôt d'un ZIP → blueprint + rapport en moins
 * de 60 s ».
 *
 * L'archive est fabriquée à la volée depuis une fixture, envoyée par le
 * navigateur comme le ferait une agence, puis analysée par le vrai travail
 * INGEST contre le vrai Postgres. Aucune étape n'est court-circuitée.
 */

/** `pnpm e2e` s'exécute depuis la racine du dépôt. */
const FIXTURES = resolve(process.cwd(), "fixtures");

async function archiveDeFixture(nom: string): Promise<Buffer> {
  const racine = join(FIXTURES, nom);
  const entrees: Record<string, Uint8Array> = {};

  const parcourir = async (dossier: string): Promise<void> => {
    for (const entree of await readdir(dossier, { withFileTypes: true })) {
      const complet = join(dossier, entree.name);
      if (entree.isDirectory()) {
        await parcourir(complet);
        continue;
      }
      if (entree.name === "expected.json") continue;
      entrees[relative(racine, complet).split(/[\\/]/u).join("/")] = new Uint8Array(
        await readFile(complet),
      );
    }
  };

  await parcourir(racine);
  return Buffer.from(zipSync(entrees, { level: 6 }));
}

test("dépôt d'une archive : rapport d'analyse en moins de 60 secondes", async ({
  page,
}) => {
  test.setTimeout(120_000);
  await seConnecter(page);

  await page.getByTestId("lien-depot").click();
  await expect(page.getByRole("heading", { name: /Déposer un site/iu })).toBeVisible();

  await page.getByLabel("Nom du site").fill("Menuiserie Rousseau");
  await page.setInputFiles("#archive", {
    name: "menuiserie.zip",
    mimeType: "application/zip",
    buffer: await archiveDeFixture("01-artisan-landing"),
  });

  const depart = Date.now();
  await page.getByTestId("lancer-depot").click();

  await expect(page.getByTestId("titre-rapport")).toBeVisible({ timeout: 60_000 });
  expect(Date.now() - depart).toBeLessThan(60_000);

  await expect(page.getByTestId("titre-rapport")).toHaveText("Menuiserie Rousseau");

  // Le rapport dit ce que le client pourra changer.
  const chiffres = page.getByTestId("chiffres");
  await expect(chiffres).toContainText("éléments modifiables");
  await expect(chiffres).toContainText("listes");

  // Et ce qui mérite d'être su avant de lui donner l'accès.
  await expect(page.getByTestId("avertissements")).toContainText("Tailwind");
});

test("le site apparaît dans le tableau de bord, prêt à éditer", async ({ page }) => {
  test.setTimeout(120_000);
  await seConnecter(page);

  await page.getByTestId("lien-depot").click();
  await page.getByLabel("Nom du site").fill("Le Comptoir des Halles");
  await page.setInputFiles("#archive", {
    name: "comptoir.zip",
    mimeType: "application/zip",
    buffer: await archiveDeFixture("02-restaurant-multipage"),
  });
  await page.getByTestId("lancer-depot").click();
  await expect(page.getByTestId("titre-rapport")).toBeVisible({ timeout: 60_000 });

  await page.goto("/tableau-de-bord");
  const liste = page.getByTestId("liste-sites");
  await expect(liste).toContainText("Le Comptoir des Halles");
  await expect(liste).toContainText("Prêt à éditer");
});

test("une archive sans page HTML est refusée avec une explication lisible", async ({
  page,
}) => {
  test.setTimeout(120_000);
  await seConnecter(page);

  await page.getByTestId("lien-depot").click();
  await page.getByLabel("Nom du site").fill("Archive vide");
  await page.setInputFiles("#archive", {
    name: "vide.zip",
    mimeType: "application/zip",
    buffer: Buffer.from(zipSync({ "notes.txt": new TextEncoder().encode("rien") })),
  });
  await page.getByTestId("lancer-depot").click();

  const alerte = page.getByTestId("erreur-depot");
  await expect(alerte).toBeVisible({ timeout: 60_000 });
  await expect(alerte).toContainText(/aucune page HTML/iu);
});
