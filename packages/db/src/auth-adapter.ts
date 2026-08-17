import { DrizzleAdapter } from "@auth/drizzle-adapter";
import type { Adapter } from "@auth/core/adapters";
import { getDatabase } from "./client";
import { accounts, sessions, users, verificationTokens } from "./schema/auth";

/**
 * Adaptateur Auth.js.
 *
 * Il vit ici plutôt que dans l'application pour respecter la barrière 1 du §16 :
 * rien en dehors de `packages/db` ne manipule le client Drizzle. L'application
 * reçoit un adaptateur déjà câblé et n'a jamais accès à la connexion.
 *
 * Les tables d'authentification ne sont pas scopées par organisation — un
 * utilisateur peut appartenir à plusieurs organisations — et ne passent donc pas
 * par `withTenant`.
 */
export async function createAuthAdapter(): Promise<Adapter> {
  const { db } = await getDatabase();

  return DrizzleAdapter(db, {
    usersTable: users,
    accountsTable: accounts,
    sessionsTable: sessions,
    verificationTokensTable: verificationTokens,
  }) as Adapter;
}

/**
 * Surface de l'adaptateur, telle qu'exposée par `@auth/drizzle-adapter`.
 *
 * Cette liste est nécessaire parce qu'Auth.js énumère l'adaptateur avec
 * `Object.keys()` au moment d'installer son gestionnaire d'erreurs
 * (`adapterErrorHandler`, @auth/core/lib/init.js). Un objet dont les méthodes
 * n'existent qu'au moment de l'appel — un Proxy, par exemple — est donc vu comme
 * vide, et l'échec se manifeste très loin de sa cause : « getUserByEmail is not
 * a function » à la première tentative de connexion.
 *
 * La liste est figée ici et vérifiée contre l'adaptateur réel au premier appel
 * (voir `verifierSurface`) : si une version future d'`@auth/drizzle-adapter`
 * ajoute une méthode, on obtient une erreur explicite au lieu d'une méthode
 * silencieusement absente.
 */
const METHODES_ADAPTATEUR = [
  "createUser",
  "getUser",
  "getUserByEmail",
  "getUserByAccount",
  "updateUser",
  "deleteUser",
  "linkAccount",
  "unlinkAccount",
  "getAccount",
  "createSession",
  "getSessionAndUser",
  "updateSession",
  "deleteSession",
  "createVerificationToken",
  "useVerificationToken",
  "createAuthenticator",
  "getAuthenticator",
  "listAuthenticatorsByUserId",
  "updateAuthenticatorCounter",
] as const satisfies readonly (keyof Adapter)[];

function verifierSurface(reel: Adapter): void {
  const connues = new Set<string>(METHODES_ADAPTATEUR);
  const inconnues = Object.keys(reel).filter((nom) => !connues.has(nom));
  if (inconnues.length > 0) {
    throw new Error(
      "@auth/drizzle-adapter expose des méthodes non relayées par l'adaptateur " +
        `paresseux : ${inconnues.join(", ")}. Compléter METHODES_ADAPTATEUR ` +
        "dans packages/db/src/auth-adapter.ts.",
    );
  }
}

/**
 * Adaptateur paresseux : aucune connexion n'est ouverte tant qu'Auth.js n'appelle
 * pas réellement une de ses méthodes.
 *
 * La configuration d'Auth.js est synchrone, alors que créer l'adaptateur est
 * asynchrone. Sans cette indirection, il faudrait un `await` de haut niveau dans
 * le module d'authentification — et *importer* ce module ouvrirait alors une
 * connexion Postgres : au premier rendu d'une page publique, pendant la collecte
 * des routes au build, dans un worker qui ne servira jamais de requête
 * authentifiée. Un module qui se connecte à une base au chargement est un effet
 * de bord qu'on ne veut nulle part.
 */
export function lazyAuthAdapter(): Adapter {
  let resolution: Promise<Adapter> | undefined;

  const charger = (): Promise<Adapter> =>
    (resolution ??= createAuthAdapter().then((reel) => {
      verifierSurface(reel);
      return reel;
    }));

  const adapter: Record<string, unknown> = {};

  for (const nom of METHODES_ADAPTATEUR) {
    adapter[nom] = async (...args: unknown[]) => {
      const reel = await charger();
      const methode = reel[nom];
      if (typeof methode !== "function") {
        throw new Error(`Méthode d'adaptateur Auth.js absente : « ${nom} ».`);
      }
      return (methode as (...a: unknown[]) => unknown)(...args);
    };
  }

  return adapter as Adapter;
}
