import { getTranslations } from 'next-intl/server';
import { notFound } from 'next/navigation';

/**
 * Revue des tokens du back-office.
 *
 * Exclue de la production : c'est un instrument de travail, pas une page produit. À la phase 1,
 * elle accueillera chaque composant dans ses 8 états (DESIGN.md § Matrice d'états) — c'est le seul
 * moyen de vérifier cette matrice sans la relire à la main à chaque revue.
 */

const SURFACES = [
  '--ui-bg',
  '--ui-surface-1',
  '--ui-surface-2',
  '--ui-surface-3',
  '--ui-canvas-bg',
];
const TEXT = ['--ui-text', '--ui-text-muted', '--ui-text-subtle'];
const ACCENT = [
  '--ui-accent',
  '--ui-accent-hover',
  '--ui-accent-active',
  '--ui-success',
  '--ui-warning',
  '--ui-danger',
];
const TYPE_SCALE = [
  { token: '--ui-text-2xl', font: 'var(--ui-font-display)', weight: 700 },
  { token: '--ui-text-xl', font: 'var(--ui-font-display)', weight: 500 },
  { token: '--ui-text-md', font: 'var(--ui-font-sans)', weight: 400 },
  { token: '--ui-text-base', font: 'var(--ui-font-sans)', weight: 400 },
  { token: '--ui-text-dense', font: 'var(--ui-font-sans)', weight: 400 },
  { token: '--ui-text-micro', font: 'var(--ui-font-mono)', weight: 400 },
];
const RADII = ['--ui-radius-sm', '--ui-radius-md', '--ui-radius-lg'];
const DURATIONS = ['--ui-duration-fast', '--ui-duration', '--ui-duration-slow'];

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="border-line border-t py-8">
      <h2 className="text-micro text-ink-subtle font-mono tracking-[0.06em] uppercase">{title}</h2>
      <div className="mt-4">{children}</div>
    </section>
  );
}

function Swatch({ token, border }: { token: string; border?: boolean }) {
  return (
    <div className="flex items-center gap-3">
      <span
        aria-hidden
        className={`size-10 rounded-md ${border ? 'border-line-strong border' : ''}`}
        style={{ backgroundColor: `var(${token})` }}
      />
      <code className="numeric text-ink-muted text-xs">{token}</code>
    </div>
  );
}

export default async function DesignSystemPage() {
  if (process.env.NODE_ENV === 'production') {
    notFound();
  }

  const t = await getTranslations('designSystem');

  return (
    <main className="mx-auto max-w-3xl px-6 py-16">
      <p className="text-micro text-accent font-mono tracking-[0.06em] uppercase">{t('eyebrow')}</p>
      <h1 className="font-display mt-3 text-2xl font-bold tracking-[-0.02em]">{t('title')}</h1>
      <p className="text-ink-muted mt-2 max-w-prose">{t('intro')}</p>

      <Section title={t('sections.surfaces')}>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          {SURFACES.map((token) => (
            <Swatch key={token} token={token} border />
          ))}
        </div>
      </Section>

      <Section title={t('sections.text')}>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          {TEXT.map((token) => (
            <Swatch key={token} token={token} />
          ))}
        </div>
      </Section>

      <Section title={t('sections.accent')}>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          {ACCENT.map((token) => (
            <Swatch key={token} token={token} />
          ))}
        </div>
      </Section>

      <Section title={t('sections.typography')}>
        <ul className="space-y-3">
          {TYPE_SCALE.map((entry) => (
            <li key={entry.token} className="flex items-baseline gap-4">
              <span
                className="flex-1 truncate"
                style={{
                  fontSize: `var(${entry.token})`,
                  fontFamily: entry.font,
                  fontWeight: entry.weight,
                }}
              >
                {t('typographySample')}
              </span>
              <code className="numeric text-ink-subtle shrink-0 text-xs">{entry.token}</code>
            </li>
          ))}
        </ul>
      </Section>

      <Section title={t('sections.radii')}>
        <div className="flex gap-6">
          {RADII.map((token) => (
            <div key={token} className="flex flex-col items-center gap-2">
              <span
                aria-hidden
                className="border-line-strong bg-surface-2 size-12 border"
                style={{ borderRadius: `var(${token})` }}
              />
              <code className="numeric text-ink-subtle text-xs">{token}</code>
            </div>
          ))}
        </div>
      </Section>

      <Section title={t('sections.motion')}>
        <ul className="space-y-2">
          {DURATIONS.map((token) => (
            <li key={token} className="text-dense flex items-baseline gap-4">
              <code className="numeric text-ink-muted w-56">{token}</code>
              <span className="text-ink-subtle">var(--ui-ease)</span>
            </li>
          ))}
        </ul>
        <p className="text-dense text-ink-subtle mt-4 max-w-prose">{t('motionNote')}</p>
      </Section>
    </main>
  );
}
