import LegalLayout from "@/components/LegalLayout";

export const metadata = { title: "Mentions légales — Loc'N'Joy" };

export default function MentionsLegales() {
  return (
    <LegalLayout title="Mentions légales">
      <h2>Éditeur du site</h2>
      <p>
        Loc&apos;N&apos;Joy — Société de location de véhicules.
        <br />
        Siège social : Paris, France.
        <br />
        Email : contact@locnjoy.fr — Téléphone : +33 6 00 00 00 00.
        <br />
        <em>[À compléter : forme juridique, capital social, RCS, SIRET, TVA intracommunautaire.]</em>
      </p>
      <h2>Directeur de la publication</h2>
      <p>
        <em>[À compléter : nom du directeur de la publication.]</em>
      </p>
      <h2>Hébergement</h2>
      <p>
        <em>[À compléter : nom, adresse et téléphone de l&apos;hébergeur du site.]</em>
      </p>
      <h2>Propriété intellectuelle</h2>
      <p>
        L&apos;ensemble des contenus présents sur ce site (textes, visuels, logos, éléments
        graphiques) est la propriété exclusive de Loc&apos;N&apos;Joy, sauf mention contraire.
        Toute reproduction, représentation ou diffusion, totale ou partielle, sans autorisation
        écrite préalable est interdite.
      </p>
      <h2>Responsabilité</h2>
      <p>
        Loc&apos;N&apos;Joy s&apos;efforce d&apos;assurer l&apos;exactitude des informations
        publiées sur ce site mais ne saurait être tenue responsable des erreurs, omissions ou
        indisponibilités des informations et services.
      </p>
    </LegalLayout>
  );
}
