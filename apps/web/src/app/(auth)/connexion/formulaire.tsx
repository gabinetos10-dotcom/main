"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { envoyerLienDeConnexion, type EtatConnexion } from "../actions";

function BoutonEnvoi() {
  const t = useTranslations("connexion");
  const { pending } = useFormStatus();

  return (
    <Button type="submit" className="w-full" disabled={pending}>
      {pending ? t("envoiEnCours") : t("envoyer")}
    </Button>
  );
}

export function FormulaireConnexion() {
  const t = useTranslations("connexion");
  const [etat, action] = useActionState<EtatConnexion, FormData>(
    envoyerLienDeConnexion,
    {},
  );

  return (
    <form action={action} className="space-y-4" noValidate>
      <div className="space-y-1.5">
        <Label htmlFor="email">{t("email")}</Label>
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          defaultValue={etat.email ?? ""}
          placeholder={t("emailPlaceholder")}
          aria-invalid={etat.erreur ? true : undefined}
          aria-describedby={etat.erreur ? "email-erreur" : undefined}
        />
        {/* `aria-live` : l'erreur est annoncée aux lecteurs d'écran (§12). */}
        <p
          id="email-erreur"
          aria-live="polite"
          className="min-h-5 text-[13px] text-erreur-600"
        >
          {etat.erreur ?? ""}
        </p>
      </div>

      <BoutonEnvoi />
    </form>
  );
}
