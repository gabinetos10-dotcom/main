import { expect, test, type Page } from "@playwright/test";
import { readFile, readdir } from "node:fs/promises";
import { join, relative, resolve } from "node:path";
import { zipSync } from "fflate";
import { seConnecter } from "../support/connexion";

/**
 * Critère d'acceptation du §22 P7 : « ajout d'une 4ᵉ carte service depuis l'UI,
 * correctement stylée ».
 *
 * « Correctement stylée » se vérifie sur le rendu, pas sur le HTML : la carte
 * ajoutée doit occuper la même colonne de grille que ses voisines, à la même
 * largeur. Une carte au bon balisage mais hors grille échouerait ici, et c'est
 * exactement ce qu'on veut détecter.
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

/** Ouvre la liste des services dans le panneau, par la recherche du navigateur. */
async function ouvrirListeServices(page: Page): Promise<void> {
  await page.getByTestId("recherche").fill("Ce que nous fabriquons");
  await page.locator('[data-testid^="arbre-liste-"]').first().click();
  await expect(page.getByTestId("proprietes-liste")).toBeVisible();
  await page.getByTestId("recherche").fill("");
}

const CARTES = "#services article.carte";

test("le client ajoute une quatrième carte de service, correctement stylée", async ({
  page,
}) => {
  test.setTimeout(180_000);
  await ouvrirEditeur(page, "01-artisan-landing", "Menuiserie Rousseau");

  const apercu = page.frameLocator('[data-testid="apercu"]');
  await expect(apercu.locator(CARTES)).toHaveCount(3, { timeout: 30_000 });

  await ouvrirListeServices(page);
  await expect(page.getByTestId("items-liste").locator("li")).toHaveCount(3);

  await page.getByTestId("ajouter-item").click();
  await expect(apercu.locator(CARTES)).toHaveCount(4, { timeout: 30_000 });

  const ajoutee = apercu.locator(CARTES).nth(3);
  await expect(ajoutee.locator("h3")).toHaveCount(1);
  await expect(ajoutee.locator("p")).toHaveCount(1);
  await expect(ajoutee.locator("a")).toHaveCount(1);

  // L'image reprend celle d'une carte existante : une image vide s'afficherait
  // cassée, et une carte cassée fait croire que l'ajout a échoué.
  await expect(ajoutee.locator("img")).toHaveAttribute("src", /\S+/u);

  /*
   * « Correctement stylée » se juge sur le rendu, pas sur le balisage : la carte
   * ajoutée doit recevoir du CSS du site exactement ce que reçoivent ses
   * voisines — cadre, fond, arrondi — et occuper la même place.
   */
  const styleDe = (numero: number): Promise<string> =>
    apercu
      .locator(CARTES)
      .nth(numero)
      .evaluate((element) => {
        const styles = getComputedStyle(element);
        return [styles.border, styles.borderRadius, styles.backgroundColor].join(" | ");
      });

  // Le gabarit vient de la carte la plus complète — ici celle qui porte le badge
  // « Le plus demandé » (§9.3.4) : la carte ajoutée lui ressemble donc trait pour
  // trait. Ce qui compte est qu'elle reçoive bien le CSS du site.
  expect(await styleDe(3)).toBe(await styleDe(1));
  expect(await styleDe(3)).toContain("1px solid");

  const premiere = await apercu.locator(CARTES).first().boundingBox();
  const quatrieme = await ajoutee.boundingBox();
  expect(premiere).not.toBeNull();
  expect(quatrieme).not.toBeNull();
  expect(Math.abs((quatrieme?.width ?? 0) - (premiere?.width ?? 0))).toBeLessThan(2);
  expect(quatrieme?.height ?? 0).toBeGreaterThan(100);

  /* Elle se modifie comme les autres, et survit au rechargement. */
  await ajoutee.locator("h3").click();
  await page.getByTestId("champ-valeur").fill("Terrasses et bardages");
  await expect(ajoutee.locator("h3")).toHaveText("Terrasses et bardages");

  await expect(page.getByTestId("etat-enregistrement")).toHaveText("Enregistré", {
    timeout: 20_000,
  });
  await page.reload();

  const recharge = page.frameLocator('[data-testid="apercu"]');
  await expect(recharge.locator(CARTES)).toHaveCount(4, { timeout: 30_000 });
  await expect(recharge.locator(`${CARTES} h3`).nth(3)).toHaveText(
    "Terrasses et bardages",
  );
});

test("supprimer une carte est annulable, et la liste se réordonne", async ({ page }) => {
  test.setTimeout(180_000);
  await ouvrirEditeur(page, "01-artisan-landing", "Menuiserie Rousseau");

  const apercu = page.frameLocator('[data-testid="apercu"]');
  await expect(apercu.locator(CARTES)).toHaveCount(3, { timeout: 30_000 });
  const premierTitre = await apercu.locator(`${CARTES} h3`).first().textContent();

  await ouvrirListeServices(page);

  /* Réordonner : la première carte descend d'un rang. */
  const premierItem = page.getByTestId("items-liste").locator("li").first();
  await premierItem.getByRole("button", { name: "Descendre d'un rang" }).click();
  await expect(apercu.locator(`${CARTES} h3`).nth(1)).toHaveText(premierTitre ?? "", {
    timeout: 30_000,
  });

  /* Supprimer : une confirmation dans la ligne, puis le bandeau d'annulation. */
  await page
    .getByTestId("items-liste")
    .locator("li")
    .first()
    .getByRole("button", { name: "Supprimer cet élément" })
    .click();
  await page.getByRole("button", { name: "Supprimer", exact: true }).click();

  // On le vérifie sans attendre l'aperçu : la proposition s'efface au bout de
  // huit secondes, et la reconstruction peut être plus lente que cela.
  await expect(page.getByTestId("toast-annuler")).toBeVisible();
  await expect(page.getByTestId("items-liste").locator("li")).toHaveCount(2);

  await page.getByTestId("toast-annuler-bouton").click();
  await expect(page.getByTestId("items-liste").locator("li")).toHaveCount(3);
  await expect(apercu.locator(CARTES)).toHaveCount(3, { timeout: 30_000 });
});

test("dupliquer un bloc ajoute une seconde section, modifiable séparément", async ({
  page,
}) => {
  test.setTimeout(180_000);
  await ouvrirEditeur(page, "01-artisan-landing", "Menuiserie Rousseau");

  const apercu = page.frameLocator('[data-testid="apercu"]');
  await expect(apercu.locator("#services")).toBeVisible({ timeout: 30_000 });

  const titres = apercu.getByRole("heading", { name: "Ce que nous fabriquons" });
  await expect(titres).toHaveCount(1);

  // Le bloc se sélectionne par son titre dans l'arbre, pas par son chevron.
  await page.getByTestId("recherche").fill("Ce que nous fabriquons");
  await page.locator('[data-testid^="arbre-bloc-"]').first().click();
  await expect(page.getByTestId("proprietes-bloc")).toBeVisible();
  await page.getByTestId("recherche").fill("");

  await page.getByTestId("dupliquer-bloc").click();
  await expect(titres).toHaveCount(2, { timeout: 30_000 });

  /* La copie apparaît dans l'arbre, et se modifie sans toucher à l'original. */
  const copie = page.locator('[data-testid^="arbre-copie-"]').first();
  await expect(copie).toBeVisible();
  await copie.locator('[data-testid^="arbre-champ-dup_"]').first().click();
  await page.getByTestId("champ-valeur").fill("Nos autres savoir-faire");

  await expect(
    apercu.getByRole("heading", { name: "Nos autres savoir-faire" }),
  ).toBeVisible({ timeout: 30_000 });
  await expect(titres).toHaveCount(1);

  /* Masquer le bloc source ne supprime rien : il revient tel quel. */
  await page.getByTestId("recherche").fill("Ce que nous fabriquons");
  await page.locator('[data-testid^="arbre-bloc-"]').first().click();
  await expect(page.getByTestId("proprietes-bloc")).toBeVisible();
  /**
   * L'aperçu se reconstruit à chaque bascule, et l'iframe est remontée : entre
   * les deux, le document est vide. On interroge donc l'état complet — nombre
   * de sections **et** visibilité — jusqu'à ce qu'il soit celui attendu, plutôt
   * que d'enchaîner des assertions qu'un rechargement peut couper en deux.
   */
  const etatDesSections = async (): Promise<string> => {
    const sections = apercu.locator("#services");
    if ((await sections.count()) !== 2) return "en cours";
    const premiere = await sections.first().isVisible();
    const seconde = await sections.last().isVisible();
    return `${premiere ? "visible" : "masquée"}/${seconde ? "visible" : "masquée"}`;
  };

  await page.getByTestId("masquer-bloc").check();

  // La copie garde l'identifiant de son bloc source : c'est ce qui lui assure
  // exactement le même style. Seul le bloc masqué disparaît.
  await expect.poll(etatDesSections, { timeout: 30_000 }).toBe("masquée/visible");

  await page.getByTestId("masquer-bloc").uncheck();
  await expect.poll(etatDesSections, { timeout: 30_000 }).toBe("visible/visible");
});
