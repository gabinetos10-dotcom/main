import { expect, test, type Page } from "@playwright/test";
import { readFile, readdir } from "node:fs/promises";
import { join, relative, resolve } from "node:path";
import { zipSync } from "fflate";
import { seConnecter } from "../support/connexion";

/**
 * Critère d'acceptation du §22 P5 : « survol d'un texte dans l'aperçu →
 * surlignage ; modification → changement en direct, **y compris sur la fixture
 * GSAP** ».
 *
 * La fixture GSAP est le cas qui décide : tout y est à `opacity: 0` en attendant
 * un défilement, et son titre principal est démonté caractère par caractère par
 * SplitText. Sans le mode d'édition statique du §11, l'aperçu est une page vide.
 */

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

async function deposerEtOuvrirEditeur(
  page: Page,
  fixture: string,
  nom: string,
): Promise<void> {
  await seConnecter(page);
  await page.getByTestId("lien-depot").click();
  await page.getByLabel("Nom du site").fill(nom);
  await page.setInputFiles("#archive", {
    name: `${fixture}.zip`,
    mimeType: "application/zip",
    buffer: await archiveDeFixture(fixture),
  });
  await page.getByTestId("lancer-depot").click();
  await expect(page.getByTestId("titre-rapport")).toBeVisible({ timeout: 60_000 });
  await page.getByTestId("lien-editeur").click();
  await expect(page.getByTestId("apercu")).toBeVisible();
}

test("le site animé est visible dans l'aperçu, malgré GSAP", async ({ page }) => {
  test.setTimeout(120_000);
  await deposerEtOuvrirEditeur(page, "03-portfolio-onepage-gsap", "Camille Ferrand");

  const apercu = page.frameLocator('[data-testid="apercu"]');

  // Sans le mode statique, `.reveal` reste à opacity 0 et rien ne se voit.
  const chapo = apercu.locator("#accueil .chapo");
  await expect(chapo).toBeVisible({ timeout: 30_000 });
  await expect(chapo).toHaveCSS("opacity", "1");

  // Et le titre n'a pas été démonté en dizaines de <span> par SplitText.
  const titre = apercu.locator("#accueil h1");
  await expect(titre).toHaveText("Regarder longtemps, photographier peu");
  expect(await titre.locator("span").count()).toBe(0);
});

test("survol dans l'aperçu : le champ est surligné et repéré dans le panneau", async ({
  page,
}) => {
  test.setTimeout(120_000);
  await deposerEtOuvrirEditeur(page, "01-artisan-landing", "Menuiserie Rousseau");

  const apercu = page.frameLocator('[data-testid="apercu"]');
  const titre = apercu.locator("main h1").first();
  await expect(titre).toBeVisible({ timeout: 30_000 });

  await titre.hover();

  // Le surlignage est posé par le runtime, hors du flux de la page.
  await expect(apercu.locator("#calque-surlignage .cadre")).toBeVisible();
  await expect(apercu.locator("#calque-surlignage .etiquette")).toContainText(
    "Le bois massif",
  );
});

test("modification depuis le panneau : le site change en direct", async ({ page }) => {
  test.setTimeout(120_000);
  await deposerEtOuvrirEditeur(page, "01-artisan-landing", "Menuiserie Rousseau");

  const apercu = page.frameLocator('[data-testid="apercu"]');
  const titre = apercu.locator("main h1").first();
  await expect(titre).toBeVisible({ timeout: 30_000 });
  await titre.click();

  await expect(page.getByTestId("proprietes")).toBeVisible();
  const champ = page.getByTestId("champ-valeur");
  await expect(champ).toHaveValue("Le bois massif, façonné pour durer");

  await champ.fill("Le chêne, pour la vie");
  // Aucun rechargement : c'est le runtime qui écrit dans le DOM vivant.
  await expect(titre).toHaveText("Le chêne, pour la vie");

  await expect(page.getByTestId("etat-enregistrement")).toHaveText("Enregistré", {
    timeout: 15_000,
  });

  // Et la modification survit à un rechargement : elle est bien dans le brouillon.
  await page.reload();
  const apercuRecharge = page.frameLocator('[data-testid="apercu"]');
  await expect(apercuRecharge.locator("main h1").first()).toHaveText(
    "Le chêne, pour la vie",
    { timeout: 30_000 },
  );
});

test("« voir les zones modifiables » illumine tout ce qui est éditable", async ({
  page,
}) => {
  test.setTimeout(120_000);
  await deposerEtOuvrirEditeur(page, "01-artisan-landing", "Menuiserie Rousseau");

  const apercu = page.frameLocator('[data-testid="apercu"]');
  await expect(apercu.locator("main h1").first()).toBeVisible({ timeout: 30_000 });

  await page.getByTestId("voir-zones").click();
  const cadres = apercu.locator('#calque-surlignage .cadre[data-doux="true"]');
  await expect(cadres.first()).toBeVisible();
  expect(await cadres.count()).toBeGreaterThan(5);
});
