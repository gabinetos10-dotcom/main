import { defineConfig, devices } from "@playwright/test";
import { existsSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

/**
 * Le serveur est démarré en mode production : c'est le seul moyen de vérifier
 * ce qui sera réellement déployé (chargement paresseux de l'adaptateur, en-têtes
 * de sécurité, rendu statique/dynamique).
 *
 * Prérequis : un Postgres joignable et migré.
 *   ./scripts/postgres-local.sh start && pnpm db:migrate
 */
const PORT = Number(process.env["E2E_PORT"] ?? 3100);
/**
 * `localhost` et non `127.0.0.1` : Auth.js dérive son origine du `NextRequest`,
 * qui la normalise en `localhost`. Si le navigateur visite `127.0.0.1`, la
 * `callbackUrl` du lien magique est vue comme une origine étrangère, rejetée, et
 * la redirection retombe sur la racine du site — un échec silencieux qui a l'air
 * d'un problème de session. Toutes les couches doivent parler du même hôte.
 */
const BASE = `http://localhost:${PORT}`;

/** Fichier où le serveur dépose les liens de connexion, faute de clé Resend. */
const PRISE =
  process.env["CALQUE_MAGIC_LINK_SINK"] ??
  join(mkdtempSync(join(tmpdir(), "calque-e2e-")), "liens.txt");

process.env["CALQUE_MAGIC_LINK_SINK"] = PRISE;

function chromiumPreinstalle(): string | undefined {
  const racine = process.env["PLAYWRIGHT_BROWSERS_PATH"];
  if (!racine) return undefined;
  for (const motif of [
    "chrome-linux/chrome",
    "chrome-mac/Chromium.app/Contents/MacOS/Chromium",
  ]) {
    for (const dossier of ["chromium", "chromium-1194"]) {
      const candidat = join(racine, dossier, motif);
      if (existsSync(candidat)) return candidat;
    }
  }
  return undefined;
}

const CHROMIUM_PREINSTALLE = chromiumPreinstalle();

export default defineConfig({
  testDir: "./tests",
  fullyParallel: false,
  workers: 1,
  forbidOnly: Boolean(process.env["CI"]),
  retries: process.env["CI"] ? 1 : 0,
  reporter: process.env["CI"] ? [["github"], ["list"]] : [["list"]],

  use: {
    baseURL: BASE,
    locale: "fr-FR",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
  },

  /**
   * Certains environnements (conteneurs CI, images de développement) fournissent
   * déjà un Chromium sous `PLAYWRIGHT_BROWSERS_PATH` dont la révision ne
   * correspond pas exactement à celle qu'attend la version de Playwright
   * installée. Plutôt que de retélécharger un navigateur — souvent impossible
   * derrière un proxy — on utilise celui qui est là quand il existe.
   */
  projects: [
    {
      name: "chromium",
      use: {
        ...devices["Desktop Chrome"],
        ...(CHROMIUM_PREINSTALLE
          ? { launchOptions: { executablePath: CHROMIUM_PREINSTALLE } }
          : {}),
      },
    },
  ],

  webServer: {
    command: "pnpm --filter @calque/web run build && pnpm --filter @calque/web run start",
    url: BASE,
    reuseExistingServer: !process.env["CI"],
    timeout: 180_000,
    cwd: "..",
    env: {
      PORT: String(PORT),
      NODE_ENV: "production",
      AUTH_URL: BASE,
      AUTH_SECRET: process.env["AUTH_SECRET"] ?? "secret-e2e-jamais-utilise-ailleurs",
      DATABASE_DRIVER: "pg",
      DATABASE_URL:
        process.env["DATABASE_URL"] ?? "postgres://postgres@127.0.0.1:54329/calque",
      CALQUE_MAGIC_LINK_SINK: PRISE,
      LOG_LEVEL: "warn",
    },
  },
});
