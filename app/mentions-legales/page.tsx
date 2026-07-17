import type { Metadata } from "next";
import Link from "next/link";
import { SITE } from "@/lib/content";
import { PageEnter } from "@/components/ui/PageEnter";

export const metadata: Metadata = {
  title: "Mentions légales",
  description: "Mentions légales du site GJS — éditeur, hébergeur, propriété intellectuelle.",
  alternates: { canonical: "/mentions-legales" },
};

export default function MentionsLegalesPage() {
  return (
    <main id="contenu" className="relative pb-28 pt-40">
      <div className="container-gjs">
        <div className="mx-auto max-w-3xl">
          <PageEnter>
            <p className="eyebrow mb-5">Informations légales</p>
            <h1 className="font-display text-display-lg font-semibold text-mist">Mentions légales</h1>
            <p className="mt-4 font-mono text-xs tracking-wider text-cambridge/70">
              Dernière mise à jour : juillet 2026
            </p>

            <div className="legal-prose mt-6">
              <h2>Éditeur du site</h2>
              <p>
                Le site <strong>{SITE.url.replace("https://", "")}</strong> est édité par{" "}
                <strong>{SITE.legalName}</strong>.
              </p>
              <ul>
                <li>Forme juridique : <strong>[À COMPLÉTER]</strong> (ex. SAS au capital de … €)</li>
                <li>Siège social : <strong>[À COMPLÉTER]</strong></li>
                <li>RCS / SIREN : <strong>[À COMPLÉTER]</strong></li>
                <li>N° de TVA intracommunautaire : <strong>[À COMPLÉTER]</strong></li>
                <li>Directeur·rice de la publication : <strong>[À COMPLÉTER]</strong></li>
                <li>
                  Contact : <a href={`mailto:${SITE.email}`}>{SITE.email}</a> — {SITE.phone}
                </li>
              </ul>

              <h2>Hébergement</h2>
              <p>
                Le site est hébergé par <strong>[À COMPLÉTER — nom de l'hébergeur]</strong>,{" "}
                <strong>[À COMPLÉTER — adresse complète]</strong>, <strong>[À COMPLÉTER — téléphone]</strong>.
              </p>

              <h2>Propriété intellectuelle</h2>
              <p>
                L'ensemble des contenus de ce site (textes, interfaces, illustrations, code, identité
                visuelle) est la propriété exclusive de {SITE.name}, sauf mention contraire. Toute
                reproduction, représentation ou adaptation, totale ou partielle, sans autorisation écrite
                préalable est interdite (articles L.335-2 et suivants du Code de la propriété
                intellectuelle).
              </p>

              <h2>Responsabilité</h2>
              <p>
                {SITE.name} s'efforce d'assurer l'exactitude des informations publiées mais ne saurait être
                tenue responsable des erreurs, omissions ou de l'indisponibilité temporaire du site. Les
                études de cas présentées à titre d'illustration sont signalées comme telles.
              </p>

              <h2>Crédits</h2>
              <ul>
                <li>Conception & développement : {SITE.name}</li>
                <li>
                  Typographies : Clash Display et Satoshi (Fontshare — ITF Free Font License), JetBrains
                  Mono (SIL Open Font License). Polices auto-hébergées : aucune requête vers des serveurs
                  tiers.
                </li>
              </ul>

              <h2>Nous contacter</h2>
              <p>
                Pour toute question relative au site : <a href={`mailto:${SITE.email}`}>{SITE.email}</a>.
              </p>
            </div>

            <Link
              href="/"
              className="link-sweep mt-12 inline-block font-mono text-[11px] uppercase tracking-[0.2em] text-mist hover:text-mindaro"
            >
              ← Retour à l'accueil
            </Link>
          </PageEnter>
        </div>
      </div>
    </main>
  );
}
