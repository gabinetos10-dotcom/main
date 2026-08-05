import createMiddleware from 'next-intl/middleware';
import { NextRequest } from 'next/server';
import { describe, expect, it } from 'vitest';

import { routing } from '../routing';

/**
 * Non-régression : un navigateur configuré en anglais recevait la racine en anglais.
 *
 * `next-intl` négocie par défaut la langue depuis l'en-tête `Accept-Language`. La racine cessait
 * donc d'être française pour une partie des visiteurs, contrairement à la décision inscrite dans
 * docs/PLAN.md. Le défaut était invisible en `curl` — sans en-tête, la négociation retombe sur la
 * langue par défaut.
 */

const middleware = createMiddleware(routing);

function request(path: string, acceptLanguage?: string) {
  const headers = new Headers();
  if (acceptLanguage) {
    headers.set('accept-language', acceptLanguage);
  }
  return new NextRequest(new URL(path, 'http://localhost:3000'), { headers });
}

/** next-intl réécrit en interne vers `/<locale>/…` : c'est cet en-tête qui dit la langue servie. */
function servedLocale(response: Response): string {
  const rewrite = response.headers.get('x-middleware-rewrite');
  const location = response.headers.get('location');
  const target = rewrite ?? location;
  if (!target) {
    throw new Error("Le middleware n'a ni réécrit ni redirigé la requête.");
  }
  return new URL(target).pathname.split('/')[1] ?? '';
}

describe('routage des langues', () => {
  it('sert le français à la racine, quel que soit Accept-Language', () => {
    expect(servedLocale(middleware(request('/')))).toBe('fr');
    expect(servedLocale(middleware(request('/', 'en-US,en;q=0.9')))).toBe('fr');
    expect(servedLocale(middleware(request('/', 'de-DE,de;q=0.9')))).toBe('fr');
  });

  it("sert l'anglais quand il est demandé explicitement par l'URL", () => {
    expect(servedLocale(middleware(request('/en', 'fr-FR')))).toBe('en');
  });

  it('ne préfixe pas la langue par défaut', () => {
    // `as-needed` : /fr n'est pas une URL canonique, elle redirige vers la racine.
    const response = middleware(request('/fr'));
    expect(response.headers.get('location')).toContain('http://localhost:3000/');
    expect(response.headers.get('location')).not.toContain('/fr');
  });
});
