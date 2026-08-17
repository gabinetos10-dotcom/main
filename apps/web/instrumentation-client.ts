import * as Sentry from "@sentry/nextjs";

const dsn = process.env["NEXT_PUBLIC_SENTRY_DSN"];

if (dsn) {
  Sentry.init({
    dsn,
    tracesSampleRate: 0.1,
    // RGPD (§17) : ni rejeu de session, ni données personnelles par défaut.
    sendDefaultPii: false,
    environment: process.env.NODE_ENV,
  });
}

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
