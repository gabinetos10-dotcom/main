import pino from "pino";

/**
 * Journalisation structurée (§3).
 *
 * `redact` est une mesure de sécurité, pas de confort : les liens magiques, les
 * jetons de session et les en-têtes d'autorisation ne doivent jamais atterrir
 * dans un agrégateur de logs. La seule exception est le transport de
 * développement `magicLink`, qui écrit délibérément l'URL en clair parce qu'il
 * remplace l'envoi d'email en local.
 */
export const logger = pino({
  level: process.env["LOG_LEVEL"] ?? "info",
  base: { service: "calque-web" },
  redact: {
    paths: [
      "req.headers.authorization",
      "req.headers.cookie",
      "*.token",
      "*.tokenHash",
      "*.access_token",
      "*.refresh_token",
      "*.id_token",
      "*.sessionToken",
      "*.password",
      "*.secret",
    ],
    censor: "[masqué]",
  },
  formatters: {
    level: (label) => ({ level: label }),
  },
});

export type Logger = typeof logger;

export function childLogger(bindings: Record<string, unknown>): Logger {
  return logger.child(bindings);
}
