import { expect, test, type Page } from "@playwright/test";
import { readFile, readdir } from "node:fs/promises";
import { join, relative, resolve } from "node:path";
import sharp from "sharp";
import { zipSync } from "fflate";
import { seConnecter } from "../support/connexion";

/**
 * Critère d'acceptation du §22 P6 : « une personne non technique modifie 5
 * champs et 1 image sans aide ».
 *
 * Le test suit ce parcours dans l'ordre où quelqu'un le ferait : il clique dans
 * l'aperçu ou dans la liste, tape, dépose une image, et vérifie que tout est
 * encore là après rechargement. Aucun raccourci par l'API.
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

async function ouvrirEditeur(page: Page, fixture: string, nom: string): Promise<void> {
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

test("une personne non technique modifie cinq champs et une image", async ({ page }) => {
  test.setTimeout(180_000);
  await ouvrirEditeur(page, "01-artisan-landing", "Menuiserie Rousseau");

  const apercu = page.frameLocator('[data-testid="apercu"]');
  await expect(apercu.locator("main h1").first()).toBeVisible({ timeout: 30_000 });

  /* 1 — le titre principal, en cliquant dessus dans l'aperçu */
  await apercu.locator("main h1").first().click();
  await expect(page.getByTestId("proprietes")).toBeVisible();
  await page.getByTestId("champ-valeur").fill("Le chêne, pour la vie");
  await expect(apercu.locator("main h1").first()).toHaveText("Le chêne, pour la vie");

  /* 2 — le sous-titre, trouvé par la recherche dans la liste de gauche */
  await page.getByTestId("recherche").fill("Cuisines, escaliers");
  const sousTitre = page.locator('[data-testid^="arbre-champ-"]').first();
  await sousTitre.click();
  await page
    .getByTestId("champ-valeur")
    .fill("Cuisines et escaliers, façonnés à Annecy.");
  await page.getByTestId("recherche").fill("");

  /* 3 — un bouton : texte et destination sont deux champs distincts */
  await apercu.getByRole("link", { name: "Demander un devis" }).first().click();
  await expect(page.getByTestId("champ-href")).toBeVisible();
  await page.getByTestId("champ-valeur").fill("Nous écrire");
  await expect(apercu.getByRole("link", { name: "Nous écrire" }).first()).toBeVisible();

  /* 4 — le référencement de la page */
  await page.getByTestId("section-seo").click();
  await page.getByTestId("seo-titre").fill("Menuiserie Rousseau — Escaliers sur mesure");

  /* 5 — une couleur du site */
  await page.getByTestId("section-theme").click();
  const jeton = page.locator('[data-testid^="jeton-"]').first();
  await expect(jeton).toBeVisible();
  await jeton.fill("#2f5ce0");

  /* 6 — une image, déposée depuis la bibliothèque */
  await apercu.locator("main img").first().click();
  await expect(page.getByTestId("choisir-image")).toBeVisible();
  await page.getByTestId("choisir-image").click();

  const image = await sharp({
    create: {
      width: 1200,
      height: 675,
      channels: 3,
      background: { r: 40, g: 80, b: 160 },
    },
  })
    .jpeg()
    .toBuffer();

  await page.setInputFiles("#depot-media", {
    name: "nouvelle-photo.jpg",
    mimeType: "image/jpeg",
    buffer: image,
  });

  await expect(page.getByTestId("bibliotheque").locator("li")).toHaveCount(1, {
    timeout: 60_000,
  });
  await expect(page.getByTestId("erreur-media")).toHaveCount(0);

  // L'image doit être posée dans le champ sélectionné, sans autre geste : c'est
  // le comportement attendu quand on dépose depuis un champ image.
  await expect(apercu.locator("main img").first()).toHaveAttribute(
    "src",
    /assets\/calque\//u,
    { timeout: 15_000 },
  );

  /* Tout doit survivre au rechargement : c'est là que le brouillon se prouve. */
  await expect(page.getByTestId("etat-enregistrement")).toHaveText("Enregistré", {
    timeout: 20_000,
  });
  await page.reload();

  const recharge = page.frameLocator('[data-testid="apercu"]');
  await expect(recharge.locator("main h1").first()).toHaveText("Le chêne, pour la vie", {
    timeout: 30_000,
  });
  await expect(recharge.getByRole("link", { name: "Nous écrire" }).first()).toBeVisible();
  await expect(recharge.locator("main img").first()).toHaveAttribute(
    "src",
    /assets\/calque\//u,
  );
});

test("annuler et rétablir remontent le fil des modifications", async ({ page }) => {
  test.setTimeout(180_000);
  await ouvrirEditeur(page, "01-artisan-landing", "Menuiserie Rousseau");

  const apercu = page.frameLocator('[data-testid="apercu"]');
  const titre = apercu.locator("main h1").first();
  await expect(titre).toBeVisible({ timeout: 30_000 });

  await titre.click();
  await page.getByTestId("champ-valeur").fill("Première version");
  await expect(titre).toHaveText("Première version");

  await page.getByTestId("annuler").click();
  await expect(page.getByTestId("champ-valeur")).not.toHaveValue("Première version");

  await page.getByTestId("refaire").click();
  await expect(page.getByTestId("champ-valeur")).toHaveValue("Première version");
});

test("l'aperçu réel rend au site son comportement", async ({ page }) => {
  test.setTimeout(180_000);
  await ouvrirEditeur(page, "03-portfolio-onepage-gsap", "Camille Ferrand");

  const apercu = page.frameLocator('[data-testid="apercu"]');
  await expect(apercu.locator("#accueil h1")).toBeVisible({ timeout: 30_000 });

  // En édition, la feuille statique est posée ; en aperçu réel, elle disparaît.
  await expect(apercu.locator("#calque-edition-statique")).toHaveCount(1);
  await page.getByTestId("mode-apercu").click();
  await expect(apercu.locator("#calque-edition-statique")).toHaveCount(0);
  await page.getByTestId("mode-apercu").click();
  await expect(apercu.locator("#calque-edition-statique")).toHaveCount(1);
});

test("les cadrages tablette et téléphone redimensionnent l'aperçu", async ({ page }) => {
  test.setTimeout(180_000);
  await ouvrirEditeur(page, "01-artisan-landing", "Menuiserie Rousseau");

  const iframe = page.getByTestId("apercu");
  await page.getByTestId("cadrage-mobile").click();
  await expect(iframe).toHaveCSS("width", "390px");

  await page.getByTestId("cadrage-desktop").click();
  await expect(iframe).not.toHaveCSS("width", "390px");
});
