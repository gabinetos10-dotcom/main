"use client";

import {
  message,
  readFromPreview,
  type FromPreview,
  type ToPreview,
} from "@calque/protocol";

/**
 * Pont `postMessage` côté panneau (§11).
 *
 * L'origine est vérifiée dans les deux sens : on n'envoie qu'à l'origine de
 * l'aperçu, et on n'écoute que ce qui en vient. Une iframe reçoit et émet des
 * messages de toutes provenances — extensions, outils de développement — et
 * traiter le premier venu reviendrait à laisser n'importe qui piloter l'éditeur.
 */

export interface Pont {
  envoyer(msg: ToPreview): void;
  fermer(): void;
}

export function creerPont(
  iframe: HTMLIFrameElement,
  origineApercu: string,
  surMessage: (msg: FromPreview) => void,
): Pont {
  const ecouter = (evenement: MessageEvent): void => {
    if (evenement.origin !== origineApercu) return;
    if (evenement.source !== iframe.contentWindow) return;
    const msg = readFromPreview(evenement.data);
    if (msg !== null) surMessage(msg);
  };

  window.addEventListener("message", ecouter);

  return {
    envoyer(msg) {
      iframe.contentWindow?.postMessage(msg, origineApercu);
    },
    fermer() {
      window.removeEventListener("message", ecouter);
    },
  };
}

export { message };
