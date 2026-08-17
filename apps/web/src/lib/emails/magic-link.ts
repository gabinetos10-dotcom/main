import { BRAND } from "@calque/ui";

/**
 * Email de connexion. HTML en tableaux et styles en ligne : c'est ce que les
 * clients de messagerie savent rendre. Ton sobre, aucun visuel superflu (§2).
 *
 * En marque blanche (plan Agence, §3), `brand` porte les valeurs de l'agence.
 */
export interface MagicLinkEmailOptions {
  url: string;
  brand?: { name?: string; accentColor?: string };
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/gu, "&amp;")
    .replace(/</gu, "&lt;")
    .replace(/>/gu, "&gt;")
    .replace(/"/gu, "&quot;");
}

export function magicLinkEmail({ url, brand }: MagicLinkEmailOptions): string {
  const name = escapeHtml(brand?.name ?? BRAND.name);
  const accent = escapeHtml(brand?.accentColor ?? BRAND.colors.blue);
  const href = escapeHtml(url);

  return `<!doctype html>
<html lang="fr">
  <body style="margin:0;padding:32px 16px;background:${BRAND.colors.paper};font-family:ui-sans-serif,system-ui,-apple-system,'Segoe UI',sans-serif;color:${BRAND.colors.ink};">
    <table role="presentation" cellpadding="0" cellspacing="0" style="max-width:480px;margin:0 auto;background:#ffffff;border:1px solid #e5dfd3;border-radius:8px;">
      <tr>
        <td style="padding:32px;">
          <p style="margin:0 0 24px;font-size:15px;font-weight:600;letter-spacing:-0.01em;">${name}</p>
          <h1 style="margin:0 0 12px;font-size:20px;font-weight:600;letter-spacing:-0.02em;">Votre lien de connexion</h1>
          <p style="margin:0 0 24px;font-size:15px;line-height:1.55;color:#39424e;">
            Cliquez sur le bouton ci-dessous pour accéder à votre espace. Ce lien
            est valable 24 heures et ne fonctionne qu'une seule fois.
          </p>
          <table role="presentation" cellpadding="0" cellspacing="0">
            <tr>
              <td style="border-radius:6px;background:${accent};">
                <a href="${href}" style="display:inline-block;padding:12px 20px;font-size:15px;font-weight:500;color:#ffffff;text-decoration:none;">Se connecter</a>
              </td>
            </tr>
          </table>
          <p style="margin:24px 0 0;font-size:13px;line-height:1.55;color:#6b7684;">
            Si le bouton ne fonctionne pas, copiez cette adresse dans votre navigateur :<br />
            <span style="word-break:break-all;color:#39424e;">${href}</span>
          </p>
          <hr style="margin:24px 0 0;border:none;border-top:1px solid #f2eee6;" />
          <p style="margin:16px 0 0;font-size:13px;line-height:1.55;color:#6b7684;">
            Vous n'êtes pas à l'origine de cette demande&nbsp;? Ignorez cet email,
            aucun compte n'a été créé ni modifié.
          </p>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}
