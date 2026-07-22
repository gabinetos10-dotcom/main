import type { Metadata, Viewport } from "next";
import { Bricolage_Grotesque, Instrument_Serif, Inter, JetBrains_Mono } from "next/font/google";
import { Providers } from "@/components/providers/Providers";
import "./globals.css";

// Display — a characterful editorial grotesque (kinetic headlines).
const display = Bricolage_Grotesque({
  subsets: ["latin"],
  variable: "--font-display",
  weight: ["400", "500", "600", "700", "800"],
  display: "swap",
});

// Serif — high‑contrast italic used for emphasis words (the signature move).
const serif = Instrument_Serif({
  subsets: ["latin"],
  variable: "--font-serif",
  weight: ["400"],
  style: ["normal", "italic"],
  display: "swap",
});

const sans = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

const mono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  weight: ["400", "500", "700"],
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://gjs.agency"),
  title: {
    default: "GJS — Studio digital sur‑mesure",
    template: "%s · GJS",
  },
  description:
    "GJS est une agence française qui conçoit des sites web sur‑mesure, automatise vos workflows, extrait vos données et vous accompagne techniquement. Create • Automate • Scrape • Consult.",
  keywords: [
    "agence web",
    "création site sur-mesure",
    "automatisation",
    "web scraping",
    "conseil tech",
    "Next.js",
    "France",
  ],
  authors: [{ name: "GJS" }],
  openGraph: {
    type: "website",
    locale: "fr_FR",
    title: "GJS — Studio digital sur‑mesure",
    description:
      "Create • Automate • Scrape • Consult. L'agence qui transforme vos idées en produits digitaux vivants.",
    siteName: "GJS",
  },
  twitter: {
    card: "summary_large_image",
    title: "GJS — Studio digital sur‑mesure",
    description: "Create • Automate • Scrape • Consult.",
  },
};

export const viewport: Viewport = {
  themeColor: "#06070f",
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="fr"
      className={`${display.variable} ${serif.variable} ${sans.variable} ${mono.variable}`}
    >
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
