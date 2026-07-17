/**
 * Gestion du consentement (RGPD).
 * — Rien ne se charge sans consentement : le site n'embarque AUCUN traceur
 *   par défaut. Les catégories « analytics » et « media » sont prêtes à
 *   l'emploi le jour où un outil est branché (cf. applyConsent()).
 * — Le refus est aussi simple que l'acceptation, le choix est persisté.
 */
export type ConsentState = {
  necessary: true;
  analytics: boolean;
  media: boolean;
  decidedAt: string;
};

const KEY = "gjs-consent-v1";
export const CONSENT_EVENT = "gjs:consent";

export function readConsent(): ConsentState | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as ConsentState;
    if (typeof parsed.analytics !== "boolean") return null;
    return parsed;
  } catch {
    return null;
  }
}

export function writeConsent(partial: { analytics: boolean; media: boolean }) {
  const state: ConsentState = {
    necessary: true,
    analytics: partial.analytics,
    media: partial.media,
    decidedAt: new Date().toISOString(),
  };
  try {
    window.localStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    /* stockage indisponible : le bandeau réapparaîtra, aucun traceur ne charge */
  }
  window.dispatchEvent(new CustomEvent(CONSENT_EVENT, { detail: state }));
  applyConsent(state);
  return state;
}

/**
 * Point d'entrée unique pour activer des services tiers APRÈS consentement.
 * Aujourd'hui : no-op documenté (aucun traceur embarqué).
 */
export function applyConsent(state: ConsentState) {
  if (state.analytics) {
    // [À COMPLÉTER] — initialiser ici votre outil de mesure d'audience
    // (ex. Plausible/Matomo). Ne JAMAIS le charger avant ce point.
  }
  if (state.media) {
    // [À COMPLÉTER] — autoriser ici les contenus externes embarqués
    // (ex. vidéos hébergées) si vous en ajoutez un jour.
  }
}
