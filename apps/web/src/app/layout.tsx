import type { Metadata, Viewport } from "next";
import { NextIntlClientProvider } from "next-intl";
import { getLocale, getMessages } from "next-intl/server";
import { BRAND } from "@calque/ui";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: `${BRAND.name} — ${BRAND.tagline}`, template: `%s · ${BRAND.name}` },
  description:
    "Déposez le site que vous avez livré. Calque détecte ce qui est modifiable, verrouille le reste, et donne à votre client un éditeur qu'il comprend.",
  applicationName: BRAND.name,
  // L'application est privée : aucune de ses pages ne doit être indexée.
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  themeColor: BRAND.colors.paper,
};

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const locale = await getLocale();
  const messages = await getMessages();

  return (
    <html lang={locale}>
      <head>
        {/* La fonte d'interface est sur le chemin critique du premier rendu. */}
        <link
          rel="preload"
          href="/fonts/inter-normal-latin.woff2"
          as="font"
          type="font/woff2"
          crossOrigin="anonymous"
        />
      </head>
      <body className="min-h-dvh antialiased">
        <NextIntlClientProvider messages={messages}>{children}</NextIntlClientProvider>
      </body>
    </html>
  );
}
