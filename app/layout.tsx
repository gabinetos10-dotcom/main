import type { Metadata, Viewport } from "next";
import { Inter, Syne } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const syne = Syne({
  subsets: ["latin"],
  variable: "--font-syne",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Loc'N'Joy — Location de voitures premium à Paris",
  description:
    "Loc'N'Joy, agence parisienne de location de véhicules sportifs et premium. Réservez votre expérience au cœur de Paris.",
  keywords: ["location voiture", "Paris", "premium", "sportive", "luxe"],
};

export const viewport: Viewport = {
  themeColor: "#0a0a0b",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="fr" className={`${inter.variable} ${syne.variable}`}>
      <body className="grain">{children}</body>
    </html>
  );
}
