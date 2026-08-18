/**
 * Neutralisation du site en mode édition (§11).
 *
 * Un clic sur un lien ferait quitter l'aperçu ; un envoi de formulaire
 * enverrait de vraies données au prestataire du client. Les deux sont
 * interceptés — et seulement en mode édition, l'aperçu réel devant se comporter
 * comme le site en ligne.
 */

export interface Neutraliseur {
  dispose(): void;
}

export function neutraliserInteractions(document_: Document = document): Neutraliseur {
  const surClic = (evenement: Event): void => {
    const cible = evenement.target;
    if (!(cible instanceof Element)) return;
    const lien = cible.closest("a[href]");
    if (lien === null) return;

    const href = lien.getAttribute("href") ?? "";
    // Une ancre interne reste utile : elle permet de naviguer dans la page
    // qu'on édite. Tout le reste sortirait de l'aperçu.
    if (href.startsWith("#")) return;
    evenement.preventDefault();
  };

  const surEnvoi = (evenement: Event): void => {
    evenement.preventDefault();
  };

  document_.addEventListener("click", surClic, true);
  document_.addEventListener("submit", surEnvoi, true);

  return {
    dispose(): void {
      document_.removeEventListener("click", surClic, true);
      document_.removeEventListener("submit", surEnvoi, true);
    },
  };
}
