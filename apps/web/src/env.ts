import { parseEnv, serverEnvSchema, type ServerEnv } from '@atelier/config/env';

/**
 * Environnement du back-office.
 *
 * Validé paresseusement, à la première requête : une validation à l'import ferait échouer
 * `next build` sur une machine de CI qui n'a pas encore les secrets, ce qui n'apporte rien —
 * ce qu'on veut attraper, c'est un démarrage applicatif avec une variable manquante.
 */
let cached: ServerEnv | undefined;

export function serverEnv(): ServerEnv {
  cached ??= parseEnv(serverEnvSchema);
  return cached;
}
