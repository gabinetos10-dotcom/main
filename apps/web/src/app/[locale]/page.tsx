import { brand } from '@atelier/config/brand';
import { getTranslations } from 'next-intl/server';

import { checkServices } from '~/lib/health';

/** Les sondes interrogent des services en direct : cette page ne peut pas être mise en cache. */
export const dynamic = 'force-dynamic';

export default async function StatusPage() {
  const t = await getTranslations('status');
  const services = await checkServices();
  const allUp = services.every((service) => service.status === 'up');

  return (
    <main className="mx-auto flex min-h-dvh max-w-2xl flex-col justify-center px-6 py-16">
      <p className="text-micro text-ink-subtle font-mono tracking-[0.06em] uppercase">
        {t('eyebrow')}
      </p>
      <h1 className="font-display text-ink mt-3 text-2xl font-bold tracking-[-0.02em]">
        {brand.name}
      </h1>
      <p className="text-ink-muted mt-2 max-w-prose">{t('intro')}</p>

      <ul className="border-line mt-10 border-t">
        {services.map((service) => (
          <li
            key={service.key}
            className="border-line text-dense flex items-baseline gap-4 border-b py-3"
          >
            <span
              aria-hidden
              className={`mt-[0.4em] size-1.5 shrink-0 rounded-full ${
                service.status === 'up' ? 'bg-success' : 'bg-danger'
              }`}
            />
            <span className="text-ink w-28 shrink-0">{t(`services.${service.key}`)}</span>
            <span className="numeric text-ink-subtle flex-1 truncate">{service.target}</span>
            <span className="numeric text-ink-muted shrink-0">
              {service.status === 'up' ? `${service.latencyMs} ms` : t('down')}
            </span>
          </li>
        ))}
      </ul>

      {!allUp && (
        <p className="border-line bg-surface-1 text-dense text-ink-muted mt-6 rounded-md border p-4">
          {t('hint')}
        </p>
      )}
    </main>
  );
}
