import type { Metadata } from "next";
import LegalPage, { ToFill } from "@/components/legal/LegalPage";
import { brand } from "@/lib/content";

export const metadata: Metadata = {
  title: "Politique de confidentialité",
  description: "Comment Maison Jolie Wedding collecte et protège vos données personnelles (RGPD).",
  alternates: { canonical: "/politique-de-confidentialite" },
  robots: { index: false, follow: true },
};

export default function PrivacyPage() {
  return (
    <LegalPage
      kicker="Vos données"
      title="Politique de confidentialité"
      intro="Votre confiance compte autant que votre mariage. Voici, en toute transparence, comment vos informations sont traitées."
      updated="2026"
      blocks={[
        {
          heading: "Responsable de traitement",
          body: (
            <p>
              Les données collectées sur ce site sont traitées par Maison Jolie Wedding (Mélina).
              Pour toute question : {brand.contact.email}.
            </p>
          ),
        },
        {
          heading: "Données collectées & finalités",
          body: (
            <>
              <p>Nous collectons uniquement les données que vous nous transmettez volontairement :</p>
              <ul className="list-disc space-y-1 pl-5">
                <li>
                  <strong>Formulaire de contact</strong> : prénoms, e-mail, téléphone, date et lieu
                  envisagés, type de prestation, message — pour répondre à votre demande et établir
                  un devis.
                </li>
                <li>
                  <strong>Newsletter</strong> : adresse e-mail — pour vous envoyer nos actualités et
                  inspirations, avec votre consentement.
                </li>
              </ul>
            </>
          ),
        },
        {
          heading: "Base légale & durée de conservation",
          body: (
            <p>
              Le traitement repose sur votre consentement et sur l&apos;intérêt légitime à répondre à
              vos demandes. Les données de contact sont conservées{" "}
              <ToFill>durée, ex. 3 ans après le dernier échange</ToFill>, les données de newsletter
              jusqu&apos;à votre désinscription.
            </p>
          ),
        },
        {
          heading: "Destinataires & sous-traitants",
          body: (
            <p>
              Vos données ne sont jamais vendues. Elles peuvent être traitées par nos outils
              techniques (hébergement, service d&apos;e-mailing) :{" "}
              <ToFill>lister vos sous-traitants, ex. hébergeur, Brevo…</ToFill>.
            </p>
          ),
        },
        {
          heading: "Cookies",
          body: (
            <p>
              Ce site n&apos;installe aucun cookie de mesure ou de marketing sans votre accord
              préalable, recueilli via le bandeau dédié. Vous pouvez modifier votre choix à tout
              moment. Cookies éventuellement utilisés :{" "}
              <ToFill>lister les cookies réellement déposés</ToFill>.
            </p>
          ),
        },
        {
          heading: "Vos droits",
          body: (
            <>
              <p>
                Conformément au RGPD, vous disposez d&apos;un droit d&apos;accès, de rectification,
                d&apos;effacement, d&apos;opposition et de portabilité de vos données. Pour les
                exercer, écrivez à {brand.contact.email}.
              </p>
              <p>
                Vous pouvez également introduire une réclamation auprès de la CNIL (
                <a href="https://www.cnil.fr" target="_blank" rel="noopener noreferrer">
                  www.cnil.fr
                </a>
                ).
              </p>
            </>
          ),
        },
      ]}
    />
  );
}
