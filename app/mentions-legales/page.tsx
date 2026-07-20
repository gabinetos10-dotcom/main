import type { Metadata } from "next";
import LegalPage, { ToFill } from "@/components/legal/LegalPage";
import { brand } from "@/lib/content";

export const metadata: Metadata = {
  title: "Mentions légales & CGV",
  description: "Mentions légales et conditions générales de vente de Maison Jolie Wedding.",
  alternates: { canonical: "/mentions-legales" },
  robots: { index: false, follow: true },
};

export default function MentionsLegalesPage() {
  return (
    <LegalPage
      kicker="Informations légales"
      title="Mentions légales & CGV"
      updated="2026"
      blocks={[
        {
          heading: "Éditeur du site",
          body: (
            <>
              <p>
                Le présent site est édité par <strong>Maison Jolie Wedding</strong>, exploité par
                Mélina, wedding planner &amp; designer.
              </p>
              <p>
                Raison sociale / statut : <ToFill>forme juridique</ToFill>
                <br />
                SIRET : <ToFill>numéro SIRET</ToFill>
                <br />
                Siège : <ToFill>adresse postale</ToFill>
                <br />
                Téléphone : {brand.contact.phone} — E-mail : {brand.contact.email}
                <br />
                Directrice de la publication : Mélina.
              </p>
              <p>
                TVA intracommunautaire : <ToFill>n° TVA le cas échéant</ToFill>.
              </p>
            </>
          ),
        },
        {
          heading: "Hébergeur",
          body: (
            <p>
              Le site est hébergé par <ToFill>nom de l'hébergeur</ToFill>,{" "}
              <ToFill>adresse de l'hébergeur</ToFill>, <ToFill>téléphone de l'hébergeur</ToFill>.
            </p>
          ),
        },
        {
          heading: "Propriété intellectuelle",
          body: (
            <p>
              L&apos;ensemble des contenus de ce site (textes, identité visuelle, mise en page) est
              protégé. Les photographies de mariages sont la propriété de leurs auteurs — crédits :
              © Yann Bader, © Cindy Gonzalez, © Lydia Torresan. Toute reproduction sans autorisation
              est interdite.
            </p>
          ),
        },
        {
          heading: "Conditions générales de vente (extrait)",
          body: (
            <>
              <p>
                Les prestations de wedding planning et de wedding design font l&apos;objet d&apos;un
                devis personnalisé et d&apos;un contrat signé précisant l&apos;étendue de la mission,
                le prix, les modalités de paiement et d&apos;annulation.
              </p>
              <p>
                Modalités détaillées (acompte, échéancier, rétractation, responsabilité) :{" "}
                <ToFill>préciser vos CGV complètes</ToFill>.
              </p>
            </>
          ),
        },
        {
          heading: "Médiation & litiges",
          body: (
            <p>
              En cas de litige, une solution amiable sera recherchée en priorité. À défaut, le
              consommateur peut recourir à un médiateur de la consommation :{" "}
              <ToFill>coordonnées du médiateur</ToFill>.
            </p>
          ),
        },
      ]}
    />
  );
}
