/** Shared legal copy — rendered both in the footer modal and on dedicated routes. */

function Block({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-8 first:mt-0">
      <h3 className="font-[family-name:var(--font-display)] text-lg font-medium text-[var(--color-text)]">
        {title}
      </h3>
      <div className="mt-2 space-y-2 text-sm leading-relaxed text-[var(--color-text-dim)]">
        {children}
      </div>
    </section>
  );
}

export function MentionsContent() {
  return (
    <>
      <Block title="Éditeur du site">
        <p>
          Le présent site est édité par <strong>GJS</strong>, studio digital
          indépendant. Contact : hello@gjs.agency — Paris, France.
        </p>
        <p>
          Numéro SIRET : [à compléter]. Directeur de la publication : le
          représentant légal de GJS.
        </p>
      </Block>
      <Block title="Hébergement">
        <p>
          Le site est hébergé par un prestataire cloud (ex. Vercel Inc., 340 S
          Lemon Ave #4133, Walnut, CA 91789, USA) assurant la disponibilité et
          la sécurité de l'infrastructure.
        </p>
      </Block>
      <Block title="Propriété intellectuelle">
        <p>
          L'ensemble des contenus (textes, visuels, code, animations, identité
          graphique) est la propriété exclusive de GJS, sauf mention contraire.
          Toute reproduction sans autorisation est interdite.
        </p>
      </Block>
      <Block title="Responsabilité">
        <p>
          GJS met tout en œuvre pour fournir des informations exactes mais ne
          saurait être tenu responsable des erreurs, d'une indisponibilité
          ponctuelle ou de l'usage fait des informations présentes sur le site.
        </p>
      </Block>
      <Block title="Contact">
        <p>Pour toute question relative aux présentes mentions : hello@gjs.agency.</p>
      </Block>
    </>
  );
}

export function ConfidentialiteContent() {
  return (
    <>
      <Block title="Données collectées">
        <p>
          Nous collectons uniquement les données que vous nous transmettez
          volontairement via le formulaire de contact (nom, email, description
          de projet) ainsi que des données techniques anonymisées de mesure
          d'audience.
        </p>
      </Block>
      <Block title="Finalités">
        <p>
          Vos données servent exclusivement à répondre à votre demande, établir
          un devis et améliorer l'expérience du site. Aucune revente à des tiers.
        </p>
      </Block>
      <Block title="Cookies">
        <p>
          Le site utilise des cookies strictement nécessaires ainsi que, avec
          votre consentement, des cookies de mesure d'audience. Vous pouvez
          retirer votre consentement à tout moment depuis le bandeau dédié.
        </p>
      </Block>
      <Block title="Durée de conservation">
        <p>
          Les données de contact sont conservées 3 ans après le dernier échange,
          puis supprimées ou anonymisées.
        </p>
      </Block>
      <Block title="Vos droits (RGPD)">
        <p>
          Conformément au RGPD, vous disposez d'un droit d'accès, de
          rectification, d'effacement, de portabilité et d'opposition. Pour les
          exercer : hello@gjs.agency. Vous pouvez également saisir la CNIL.
        </p>
      </Block>
    </>
  );
}
