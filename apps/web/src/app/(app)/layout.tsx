import Link from "next/link";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { BRAND } from "@calque/ui";
import { auth, signOut } from "@/auth";
import { Button } from "@/components/ui/button";

/**
 * Garde d'accès de l'application.
 *
 * La vérification est faite ici, dans un composant serveur, et non dans un
 * middleware : les sessions sont stockées en base (§16, révocation immédiate) et
 * le runtime edge d'un middleware ne peut pas interroger Postgres. Un middleware
 * ne pourrait constater que la présence d'un cookie, ce qui n'est pas une
 * autorisation.
 */
export default async function LayoutApplication({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session?.user) redirect("/connexion");

  const t = await getTranslations("tableauDeBord");

  return (
    <div className="min-h-dvh bg-papier-100">
      <header className="border-b border-papier-300 bg-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
          <Link
            href="/tableau-de-bord"
            className="text-[15px] font-semibold tracking-tight"
          >
            {BRAND.name}
          </Link>
          <div className="flex items-center gap-4">
            <span className="hidden text-[13px] text-encre-500 sm:inline">
              {t("connecteEnTantQue", { email: session.user.email ?? "" })}
            </span>
            <form
              action={async () => {
                "use server";
                await signOut({ redirectTo: "/" });
              }}
            >
              <Button type="submit" variant="discret" className="h-9 px-3 text-[13px]">
                {t("deconnexion")}
              </Button>
            </form>
          </div>
        </div>
      </header>
      {/* La largeur est décidée par chaque page : l'éditeur occupe tout l'écran. */}
      <main>{children}</main>
    </div>
  );
}
