import type { Metadata, Viewport } from "next";
import "./globals.css";
import { fraunces, ephesis, hanken } from "@/lib/fonts";
import { brand } from "@/lib/content";
import Providers from "@/components/providers/Providers";
import SiteBackground from "@/components/background/SiteBackground";
import Header from "@/components/header/Header";
import Preloader from "@/components/preloader/Preloader";
import CustomCursor from "@/components/ui/CustomCursor";
import Footer from "@/components/footer/Footer";
import CookieBanner from "@/components/legal/CookieBanner";
import EasterEgg from "@/components/ui/EasterEgg";

const SITE_URL = "https://www.maisonjoliewedding.com";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "Maison Jolie Wedding — Wedding planner & designer en Occitanie",
    template: "%s · Maison Jolie Wedding",
  },
  description:
    "Mélina, wedding planner & wedding designer en Occitanie (Montpellier, Béziers, Narbonne). Des mariages élégants, pensés avec le cœur. Une sensibilité esthétique, guidée par les liens humains.",
  keywords: [
    "wedding planner Béziers",
    "décoratrice de mariage Montpellier",
    "wedding designer Occitanie",
    "wedding planner Narbonne",
    "organisation mariage Hérault",
    "scénographie mariage Sud de la France",
  ],
  authors: [{ name: "Maison Jolie Wedding" }],
  creator: "Maison Jolie Wedding",
  openGraph: {
    type: "website",
    locale: "fr_FR",
    url: SITE_URL,
    title: "Maison Jolie Wedding — Wedding planner & designer en Occitanie",
    description:
      "Des mariages élégants, pensés avec le cœur. Wedding planner & designer à Montpellier, Béziers, Narbonne.",
    siteName: "Maison Jolie Wedding",
  },
  twitter: {
    card: "summary_large_image",
    title: "Maison Jolie Wedding",
    description:
      "Wedding planner & designer en Occitanie. Une sensibilité esthétique, guidée par les liens humains.",
  },
  alternates: { canonical: SITE_URL },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  themeColor: "#FDF7F0",
  width: "device-width",
  initialScale: 1,
};

/** Données structurées LocalBusiness pour le SEO local. */
const localBusinessJsonLd = {
  "@context": "https://schema.org",
  "@type": "ProfessionalService",
  name: "Maison Jolie Wedding",
  description:
    "Wedding planner et wedding designer en Occitanie — Mélina accompagne des mariages élégants et sur-mesure.",
  areaServed: ["Montpellier", "Béziers", "Narbonne", "Hérault", "Occitanie"],
  telephone: "+33768189458",
  email: brand.contact.email,
  founder: { "@type": "Person", name: "Mélina" },
  address: {
    "@type": "PostalAddress",
    addressRegion: "Occitanie",
    addressCountry: "FR",
  },
  sameAs: [brand.contact.instagramHref],
  url: SITE_URL,
  slogan: brand.baseline,
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="fr" className={`${fraunces.variable} ${ephesis.variable} ${hanken.variable}`}>
      <head>
        <script
          type="application/ld+json"
          // eslint-disable-next-line react/no-danger
          dangerouslySetInnerHTML={{ __html: JSON.stringify(localBusinessJsonLd) }}
        />
      </head>
      <body>
        <Providers>
          {/* Habillage de fond permanent */}
          <SiteBackground />
          {/* Preloader cinématographique (une fois par session) */}
          <Preloader />
          {/* Curseur personnalisé (desktop) */}
          <CustomCursor />

          <Header />
          <main className="relative z-10">{children}</main>
          <Footer />

          <CookieBanner />
          <EasterEgg />
        </Providers>
      </body>
    </html>
  );
}
