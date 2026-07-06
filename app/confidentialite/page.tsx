import LegalLayout from "@/components/LegalLayout";

export const metadata = { title: "Politique de confidentialité — Loc'N'Joy" };

export default function Confidentialite() {
  return (
    <LegalLayout title="Politique de confidentialité">
      <h2>Données collectées</h2>
      <p>
        Dans le cadre des demandes de réservation et du formulaire de contact, nous collectons :
        prénom, nom, adresse email, numéro de téléphone, identifiant Snapchat (facultatif) et le
        contenu de votre message. Ces données sont nécessaires au traitement de votre demande.
      </p>
      <h2>Finalités du traitement</h2>
      <p>
        Les données sont utilisées exclusivement pour : traiter vos demandes de réservation,
        répondre à vos messages, et assurer le suivi de la relation client. Elles ne sont ni
        vendues ni transmises à des tiers à des fins commerciales.
      </p>
      <h2>Durée de conservation</h2>
      <p>
        Les données de réservation sont conservées pendant la durée nécessaire à la gestion de la
        location et aux obligations légales applicables. Les messages de contact sont conservés
        au maximum 3 ans après le dernier échange.
      </p>
      <h2>Vos droits (RGPD)</h2>
      <p>
        Conformément au Règlement Général sur la Protection des Données (RGPD) et à la loi
        Informatique et Libertés, vous disposez d&apos;un droit d&apos;accès, de rectification,
        d&apos;effacement, de limitation, d&apos;opposition et de portabilité de vos données.
        Pour exercer ces droits, contactez-nous à : contact@locnjoy.fr.
      </p>
      <h2>Cookies</h2>
      <p>
        Ce site n&apos;utilise pas de cookies publicitaires. Seuls des cookies techniques
        strictement nécessaires au fonctionnement du site (session d&apos;administration) sont
        déposés.
      </p>
    </LegalLayout>
  );
}
