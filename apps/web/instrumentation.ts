import type { Instrumentation } from "next";

/**
 * Sentry n'est initialisé que si un DSN est fourni : un environnement de
 * développement ou de CI sans secret ne doit ni échouer ni émettre de trafic
 * réseau vers un tiers.
 */
export async function register(): Promise<void> {
  if (!process.env["SENTRY_DSN"]) return;

  const Sentry = await import("@sentry/nextjs");
  Sentry.init({
    dsn: process.env["SENTRY_DSN"],
    tracesSampleRate: 0.1,
    // RGPD (§17) : aucune donnée personnelle par défaut dans les rapports.
    sendDefaultPii: false,
    environment: process.env["NODE_ENV"],
  });
}

export const onRequestError: Instrumentation.onRequestError = async (...args) => {
  if (!process.env["SENTRY_DSN"]) return;
  const Sentry = await import("@sentry/nextjs");
  Sentry.captureRequestError(...args);
};
