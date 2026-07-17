import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { clash, satoshi, jetbrains } from "@/lib/fonts";
import { SITE } from "@/lib/content";
import { Providers } from "@/components/providers/Providers";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { AuroraBackground } from "@/components/fx/AuroraBackground";
import "@/styles/globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(SITE.url),
  title: { default: SITE.title, template: "%s — GJS" },
  description: SITE.description,
  keywords: [
    "agence web",
    "développement web",
    "création de site internet",
    "automatisation",
    "scraping",
    "collecte de données",
    "conseil digital",
    "Next.js",
    "France",
  ],
  openGraph: {
    type: "website",
    locale: "fr_FR",
    url: SITE.url,
    siteName: SITE.name,
    title: SITE.title,
    description: SITE.description,
  },
  twitter: {
    card: "summary_large_image",
    title: SITE.title,
    description: SITE.description,
  },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  themeColor: "#04070e",
  colorScheme: "dark",
  width: "device-width",
  initialScale: 1,
};

/* Données structurées Organization (SEO) */
const jsonLd = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: SITE.name,
  legalName: SITE.legalName,
  url: SITE.url,
  email: SITE.email,
  description: SITE.description,
  address: { "@type": "PostalAddress", addressLocality: "Paris", addressCountry: "FR" },
  knowsAbout: ["Développement web", "Automatisation", "Scraping de données", "Conseil digital"],
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="fr" className={`${clash.variable} ${satoshi.variable} ${jetbrains.variable}`}>
      <body>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
        <a href="#contenu" className="skip-link">
          Aller au contenu
        </a>
        <Providers>
          <AuroraBackground />
          <Header />
          {children}
          <Footer />
        </Providers>
      </body>
    </html>
  );
}
