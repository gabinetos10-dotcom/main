import type { Metadata } from "next";
import Link from "next/link";
import { SITE } from "@/lib/content";
import { PageEnter } from "@/components/ui/PageEnter";

export const metadata: Metadata = {
  title: "Politique de confidentialité",
  description:
    "Politique de confidentialité et de protection des données personnelles du site GJS — RGPD.",
  alternates: { canonical: "/politique-de-confidentialite" },
};

export default function PolitiqueConfidentialitePage() {
  return (
    <main id="contenu" className="relative pb-28 pt-40">
      <div className="container-gjs">
        <div className="mx-auto max-w-3xl">
          <PageEnter>
            <p className="eyebrow mb-5">Vos données, vos droits</p>
            <h1 className="font-display text-display-lg font-semibold text-mist">
              Politique de confidentialité
            </h1>
            <p className="mt-4 font-mono text-xs tracking-wider text-cambridge/70">
              Dernière mise à jour : juillet 2026 — conforme RGPD (UE 2016/679)
            </p>

            <div className="legal-prose mt-6">
              <h2>En deux mots</h2>
              <p>
                Ce site collecte le strict minimum : les informations que vous nous transmettez
                volontairement via le formulaire de contact. <strong>Aucun traceur publicitaire</strong>{" "}
                n'est embarqué, et aucun outil de mesure d'audience ne s'active sans votre consentement
                explicite.
              </p>

              <h2>Responsable du traitement</h2>
              <p>
                <strong>{SITE.legalName}</strong> — <strong>[À COMPLÉTER : adresse]</strong>.<br />
                Contact données personnelles : <a href={`mailto:${SITE.email}`}>{SITE.email}</a>{" "}
                <strong>[À COMPLÉTER si DPO distinct]</strong>.
              </p>

              <h2>Données collectées via le formulaire</h2>
              <ul>
                <li>
                  <strong>Données :</strong> nom, adresse e-mail, sujet, message.
                </li>
                <li>
                  <strong>Finalité :</strong> répondre à votre demande et assurer le suivi commercial de
                  celle-ci. Rien d'autre — pas de newsletter non sollicitée.
                </li>
                <li>
                  <strong>Base légale :</strong> votre consentement (art. 6.1.a RGPD), matérialisé par la
                  case à cocher — jamais pré-cochée — du formulaire.
                </li>
                <li>
                  <strong>Durée de conservation :</strong> 12 mois après notre dernier échange, puis
                  suppression.
                </li>
                <li>
                  <strong>Destinataires :</strong> l'équipe {SITE.name} exclusivement. Aucune revente,
                  aucun partage à des fins commerciales.
                </li>
                <li>
                  <strong>Hébergement des données :</strong> <strong>[À COMPLÉTER — hébergeur et
                  localisation, UE recommandée]</strong>.
                </li>
              </ul>
              <p>
                Minimisation : côté serveur, le contenu de votre message n'est pas journalisé ; seules des
                métadonnées techniques (horodatage, longueur) le sont le temps du traitement.
              </p>

              <h2>Cookies & stockage local</h2>
              <ul>
                <li>
                  <strong>gjs-consent-v1</strong> (localStorage) — mémorise vos préférences de
                  consentement. Essentiel, durée de vie : 13 mois maximum recommandés, supprimable à tout
                  moment via votre navigateur.
                </li>
                <li>
                  <strong>gjs-visited</strong> (sessionStorage) — évite de rejouer l'écran de chargement
                  dans un même onglet. Purement technique, supprimé à la fermeture de l'onglet.
                </li>
                <li>
                  <strong>Mesure d'audience :</strong> désactivée par défaut. Si vous l'acceptez via le
                  bandeau « Gérer les cookies », un outil respectueux de la vie privée pourra être activé{" "}
                  <strong>[À COMPLÉTER le jour venu — ex. Matomo/Plausible]</strong>. Refuser est aussi
                  simple qu'accepter, et votre choix est modifiable à tout moment depuis le pied de page.
                </li>
              </ul>

              <h2>Vos droits</h2>
              <p>
                Conformément au RGPD et à la loi Informatique et Libertés, vous disposez des droits
                d'accès, de rectification, d'effacement, de limitation, d'opposition et de portabilité de
                vos données.
              </p>
              <p>
                Pour les exercer : <a href={`mailto:${SITE.email}`}>{SITE.email}</a>. Nous répondons sous
                30 jours. Vous pouvez également introduire une réclamation auprès de la CNIL —{" "}
                <a href="https://www.cnil.fr" target="_blank" rel="noreferrer noopener">
                  www.cnil.fr
                </a>
                .
              </p>

              <h2>Sécurité</h2>
              <p>
                Échanges chiffrés (HTTPS), accès restreints, dépendances maintenues à jour. En cas de
                violation de données susceptible d'engendrer un risque pour vos droits, vous seriez
                notifié·e conformément aux articles 33 et 34 du RGPD.
              </p>

              <h2>Évolution de cette politique</h2>
              <p>
                Cette politique peut évoluer avec le site. La date de mise à jour figure en haut de page ;
                en cas de changement substantiel, le bandeau de consentement vous sera présenté à nouveau.
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
