import LegalLayout from "@/components/LegalLayout";

export const metadata = { title: "Conditions générales — Loc'N'Joy" };

export default function CGV() {
  return (
    <LegalLayout title="Conditions générales">
      <h2>Objet</h2>
      <p>
        Les présentes conditions générales régissent la location de véhicules proposée par
        Loc&apos;N&apos;Joy. Toute demande de réservation implique l&apos;acceptation sans
        réserve des présentes conditions.
      </p>
      <h2>Conditions de location</h2>
      <p>
        Le locataire doit être titulaire d&apos;un permis de conduire valide et répondre aux
        conditions d&apos;âge et d&apos;ancienneté de permis exigées pour la catégorie du
        véhicule loué. Une pièce d&apos;identité, un justificatif de domicile et un dépôt de
        garantie sont exigés à la remise des clés.
        <br />
        <em>[À compléter : âge minimum, ancienneté de permis, montants des dépôts de garantie.]</em>
      </p>
      <h2>Réservation et confirmation</h2>
      <p>
        La demande de réservation effectuée sur le site ne devient définitive qu&apos;après
        confirmation par Loc&apos;N&apos;Joy. Les tarifs affichés s&apos;entendent par jour de
        location, hors options et hors dépôt de garantie.
      </p>
      <h2>Annulation</h2>
      <p>
        <em>[À compléter : conditions et délais d&apos;annulation, frais éventuels.]</em>
      </p>
      <h2>Assurance et responsabilité</h2>
      <p>
        Les véhicules sont assurés dans les conditions précisées au contrat de location remis à
        la prise du véhicule. Le locataire demeure responsable des franchises, amendes et
        infractions commises pendant la durée de la location.
      </p>
      <h2>Droit applicable</h2>
      <p>
        Les présentes conditions sont soumises au droit français. Tout litige relève, à défaut
        d&apos;accord amiable, des tribunaux compétents de Paris.
      </p>
    </LegalLayout>
  );
}
