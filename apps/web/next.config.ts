import { loadRootEnv } from '@atelier/config/load-env';
import createNextIntlPlugin from 'next-intl/plugin';
import type { NextConfig } from 'next';

// Next ne lit que le `.env` du dossier de l'application ; le monorepo n'en a qu'un, à la racine.
loadRootEnv(import.meta.dirname);

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts');

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Les paquets internes sont publiés en TypeScript : Next les compile lui-même.
  // `@atelier/ui` porte les déclarations next/font, qui exigent d'être compilées par Next.
  transpilePackages: ['@atelier/ui', '@atelier/db', '@atelier/config'],
  typedRoutes: true,
};

export default withNextIntl(nextConfig);
