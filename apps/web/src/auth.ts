import NextAuth, { type NextAuthConfig } from "next-auth";
import Google from "next-auth/providers/google";
import Resend from "next-auth/providers/resend";
import type { Provider } from "next-auth/providers";
import { lazyAuthAdapter } from "@calque/db/auth-adapter";
import { features, serverEnv } from "./env";
import { logger } from "./lib/logger";
import { magicLinkEmail } from "./lib/emails/magic-link";

/**
 * Lien magique (§3).
 *
 * Sans clé Resend, le lien est écrit dans les logs du serveur au lieu d'être
 * envoyé. Ce n'est pas un bouchon : le jeton est bien créé en base et le lien
 * fonctionne réellement. C'est ce qui rend le parcours de connexion utilisable
 * en local sans ouvrir de compte chez un tiers.
 */
const magicLink = Resend({
  apiKey: process.env["RESEND_API_KEY"] ?? "re_non_configure",
  from: process.env["EMAIL_FROM"] ?? "Calque <bonjour@calque.studio>",
  name: "Lien de connexion",
  maxAge: 24 * 60 * 60,

  async sendVerificationRequest({ identifier, url }) {
    const env = serverEnv();
    if (!features().emailDelivery) {
      logger.warn(
        { destinataire: identifier, lien: url },
        "RESEND_API_KEY absent : lien de connexion journalisé au lieu d'être envoyé",
      );

      // Prise de test : les tests E2E ont besoin de récupérer le lien de façon
      // déterministe, sans parser des logs. Le chemin n'est jamais défini en
      // production, et cette branche est de toute façon inatteignable dès qu'une
      // clé Resend est configurée.
      const prise = process.env["CALQUE_MAGIC_LINK_SINK"];
      if (prise) {
        const { appendFile } = await import("node:fs/promises");
        await appendFile(prise, `${url}\n`, "utf8");
      }
      return;
    }

    const { Resend: ResendClient } = await import("resend");
    const client = new ResendClient(env.RESEND_API_KEY);
    const { error } = await client.emails.send({
      from: env.EMAIL_FROM,
      to: identifier,
      subject: "Votre lien de connexion à Calque",
      html: magicLinkEmail({ url }),
      text: `Votre lien de connexion à Calque :\n\n${url}\n\nIl expire dans 24 heures. Si vous n'êtes pas à l'origine de cette demande, ignorez cet email.`,
    });

    if (error) {
      logger.error(
        { err: error, destinataire: identifier },
        "Envoi du lien de connexion échoué",
      );
      throw new Error("L'envoi de l'email a échoué.");
    }
  },
});

const providers: Provider[] = [magicLink];

// Google n'est proposé que si les deux moitiés du secret sont présentes ; la
// lecture passe par `process.env` plutôt que par le schéma validé, qui n'est
// évalué qu'à la première requête (voir `lazyAuthAdapter`).
const googleId = process.env["AUTH_GOOGLE_ID"];
const googleSecret = process.env["AUTH_GOOGLE_SECRET"];
if (googleId && googleSecret) {
  providers.push(
    Google({
      clientId: googleId,
      clientSecret: googleSecret,
      allowDangerousEmailAccountLinking: false,
    }),
  );
}

const config: NextAuthConfig = {
  adapter: lazyAuthAdapter(),
  providers,
  // Sessions en base : la révocation est immédiate, ce qui compte pour un produit
  // où l'agence retire des accès (§16). Un JWT resterait valide jusqu'à expiration.
  session: { strategy: "database", maxAge: 30 * 24 * 60 * 60 },
  pages: {
    signIn: "/connexion",
    verifyRequest: "/verifier",
    error: "/erreur",
  },
  callbacks: {
    session({ session, user }) {
      if (session.user) session.user.id = user.id;
      return session;
    },
  },
  events: {
    signIn({ user, isNewUser }) {
      logger.info({ userId: user.id, isNewUser }, "connexion");
    },
  },
  trustHost: true,
};

export const { handlers, auth, signIn, signOut } = NextAuth(config);
