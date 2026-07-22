import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { ConfidentialiteContent } from "@/components/legal/legalContent";

export const metadata: Metadata = {
  title: "Politique de confidentialité",
  description: "Politique de confidentialité et gestion des données personnelles chez GJS.",
};

export default function ConfidentialitePage() {
  return (
    <main className="container-x min-h-screen py-28">
      <Link
        href="/"
        className="mb-10 inline-flex items-center gap-2 text-sm text-[var(--color-text-dim)] transition-colors hover:text-[var(--color-text)]"
      >
        <ArrowLeft size={15} /> Retour à l'accueil
      </Link>
      <h1 className="font-[family-name:var(--font-display)] text-4xl font-semibold tracking-tight sm:text-5xl">
        Politique de confidentialité
      </h1>
      <div className="mt-10 max-w-2xl">
        <ConfidentialiteContent />
      </div>
    </main>
  );
}
