import Link from "next/link";
import Button from "@/components/ui/Button";
import Monogram from "@/components/brand/Monogram";

export default function NotFound() {
  return (
    <section className="flex min-h-[100svh] flex-col items-center justify-center px-6 text-center">
      <Monogram className="w-20" strokeWidth={2.5} />
      <p className="script-accent mt-6 text-5xl text-terracotta">Oups…</p>
      <h1 className="mt-3 font-serif text-display-sm font-light text-prune">
        Cette page s&apos;est envolée.
      </h1>
      <p className="mt-4 max-w-md text-prune/70">
        Comme un pétale au vent, la page que vous cherchez n&apos;est plus là. Revenons vers de plus
        beaux horizons.
      </p>
      <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
        <Button href="/">Retour à l&apos;accueil</Button>
        <Link href="/contact" className="link-underline text-sm font-medium text-prune/80">
          Nous écrire
        </Link>
      </div>
    </section>
  );
}
