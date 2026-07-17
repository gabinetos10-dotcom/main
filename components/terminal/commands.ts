import { SERVICES, CASES, SITE, TECHS } from "@/lib/content";
import type { GameId } from "@/lib/content";

export interface CommandResult {
  lines: string[];
  action?: "clear" | "exit" | { type: "game"; game: GameId } | { type: "matrix" } | { type: "goto"; target: string };
}

const ASCII = [
  "  ██████╗       ██╗███████╗",
  " ██╔════╝       ██║██╔════╝",
  " ██║  ███╗      ██║███████╗",
  " ██║   ██║ ██   ██║╚════██║",
  " ╚██████╔╝ ╚█████╔╝███████║",
  "  ╚═════╝   ╚════╝ ╚══════╝",
];

const HELP: string[] = [
  "Commandes disponibles :",
  "  help        — cette liste",
  "  about       — qui est GJS ?",
  "  services    — ce qu'on sait faire",
  "  projets     — quelques réalisations",
  "  stack       — nos outils favoris",
  "  play        — lancer un mini-jeu (play data | flow | ship)",
  "  matrix      — vous verrez bien",
  "  contact     — nous écrire",
  "  hire        — la voie rapide",
  "  clear       — nettoyer l'écran",
  "  exit        — fermer le terminal",
  "",
  "(il existe aussi des commandes non documentées. évidemment.)",
];

/** Interprète une ligne de commande du terminal GJS. */
export function runCommand(raw: string): CommandResult {
  const input = raw.trim().toLowerCase();
  const [cmd = "", ...args] = input.split(/\s+/);

  switch (cmd) {
    case "":
      return { lines: [] };
    case "help":
    case "aide":
    case "?":
      return { lines: HELP };
    case "about":
    case "apropos":
      return {
        lines: [
          ...ASCII,
          "",
          "GJS — agence de développement web française.",
          "Création de sites, automatisation, scraping & données, conseil.",
          "Petite équipe, gros standards. On construit des outils vivants,",
          "et on reste là quand ils grandissent.",
        ],
      };
    case "services":
      return {
        lines: SERVICES.flatMap((s) => [`▸ ${s.num} ${s.title}`, `    ${s.hook}`]),
      };
    case "projets":
    case "work":
    case "cases":
      return {
        lines: CASES.map((c) => `▸ ${c.name} — ${c.meta} (${c.year}) · ${c.stat.value} ${c.stat.label}`),
      };
    case "stack":
      return { lines: ["Outils du quotidien :", "  " + TECHS.join(" · ")] };
    case "contact":
      return {
        lines: [`e-mail : ${SITE.email}`, `zone   : ${SITE.location}`, "", "ou tapez 'hire' pour la voie rapide →"],
        action: undefined,
      };
    case "hire":
    case "embauchez-nous":
      return {
        lines: ["Excellent choix. Direction le formulaire de contact…"],
        action: { type: "goto", target: "#contact" },
      };
    case "play":
    case "jouer": {
      const map: Record<string, GameId> = {
        data: "catcher",
        catcher: "catcher",
        scraping: "catcher",
        flow: "chain",
        chain: "chain",
        automatisation: "chain",
        ship: "shipit",
        shipit: "shipit",
        web: "shipit",
      };
      const g = args[0] ? map[args[0]] : undefined;
      if (!g)
        return {
          lines: ["Usage : play data | flow | ship", "  data — Data Catcher (scraping)", "  flow — Chaîne de réaction (automatisation)", "  ship — Ship It (création web)"],
        };
      return { lines: [`Lancement de ${args[0]}…`], action: { type: "game", game: g } };
    }
    case "matrix":
      return { lines: ["Réveille-toi, Néo… le flux est lime chez nous. (12 s)"], action: { type: "matrix" } };
    case "konami":
      return { lines: ["↑ ↑ ↓ ↓ ← → ← → B A — essayez-le hors du terminal ;)"] };
    case "whoami":
      return { lines: ["invité@gjs — mais on peut arranger ça : tapez 'hire'."] };
    case "sudo":
      return { lines: ["Bien tenté. Ici, même root demande poliment."] };
    case "coffee":
    case "café":
      return { lines: ["☕ préparation… erreur 418 : I'm a teapot."] };
    case "ls":
      return { lines: ["services/  projets/  equipe/  secrets/"] };
    case "cat":
      if (args[0] === "secrets" || args[0] === "secrets/")
        return { lines: ["secrets/konami.txt : ↑↑↓↓←→←→BA", "secrets/logo.txt   : cliquez 5× sur le logo", "secrets/vous.txt   : vous êtes le genre de client qu'on adore"] };
      return { lines: [`cat : ${args[0] ?? ""} — fichier introuvable`] };
    case "gjs":
      return { lines: ASCII };
    case "clear":
    case "cls":
      return { lines: [], action: "clear" };
    case "exit":
    case "quit":
    case ":q":
      return { lines: ["À bientôt."], action: "exit" };
    default:
      return { lines: [`commande inconnue : ${cmd} — tapez 'help'`] };
  }
}
