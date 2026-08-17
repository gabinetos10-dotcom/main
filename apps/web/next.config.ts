import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

/**
 * En-têtes de sécurité (§17).
 *
 * `X-Frame-Options: DENY` sur l'application est le pendant du `frame-ancestors`
 * permissif que servira le serveur d'aperçu (P5) : l'application encadre
 * l'aperçu, jamais l'inverse. Les deux vivent sur des eTLD+1 distincts (§3) pour
 * que les cookies de session ne soient jamais visibles depuis le site d'un client.
 */
const securityHeaders = [
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
];

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,

  /**
   * Les packages internes exportent directement leurs sources TypeScript : pas
   * d'étape de compilation intermédiaire à orchestrer dans le monorepo.
   */
  transpilePackages: ["@calque/blueprint", "@calque/db", "@calque/ui"],

  /**
   * Les pilotes de base de données restent hors du bundle serveur.
   *
   * PGlite charge son WebAssembly via `new URL(..., import.meta.url)` : bundlé
   * par webpack, cette résolution casse (`ERR_INVALID_ARG_TYPE` au chargement).
   * `pg` et `ws` embarquent du natif ou des chemins conditionnels qui posent le
   * même genre de problème. Ils sont chargés depuis node_modules à l'exécution.
   */
  serverExternalPackages: [
    "@electric-sql/pglite",
    "@neondatabase/serverless",
    "pg",
    "ws",
  ],

  /**
   * ESLint tourne comme étape distincte (`pnpm lint`) sur tout le monorepo avec
   * la configuration à plat de la racine. Le relancer dans `next build` ferait
   * un second passage avec une configuration détectée différemment, pour un
   * résultat identique.
   */
  eslint: { ignoreDuringBuilds: true },

  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

/**
 * Sentry n'est branché que si un DSN est fourni : un build local ou de CI sans
 * secret ne doit ni échouer ni tenter de téléverser des sourcemaps.
 */
export default async function config(): Promise<NextConfig> {
  const withIntl = withNextIntl(nextConfig);

  if (!process.env["SENTRY_DSN"] && !process.env["NEXT_PUBLIC_SENTRY_DSN"]) {
    return withIntl;
  }

  const { withSentryConfig } = await import("@sentry/nextjs");
  return withSentryConfig(withIntl, {
    silent: true,
    disableLogger: true,
    widenClientFileUpload: false,
  });
}
