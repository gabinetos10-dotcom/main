import Link from "next/link";

export default function LegalLayout({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-noir">
      <div className="mx-auto max-w-3xl px-5 py-16 md:py-24">
        <Link
          href="/"
          className="text-xs uppercase tracking-[0.2em] text-smoke transition-colors hover:text-blood"
        >
          ← Retour à l&apos;accueil
        </Link>
        <h1 className="mt-6 font-display text-3xl font-extrabold uppercase text-white md:text-4xl">
          {title}
        </h1>
        <div className="mt-2 h-1 w-16 bg-blood" />
        <div className="prose-invert mt-10 space-y-6 text-sm leading-relaxed text-smoke-light [&_h2]:font-display [&_h2]:text-lg [&_h2]:font-bold [&_h2]:text-white [&_h2]:mt-8">
          {children}
        </div>
      </div>
    </div>
  );
}
