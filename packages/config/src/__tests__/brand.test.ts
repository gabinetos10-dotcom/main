import { describe, expect, it } from 'vitest';

import { brand, sitesBaseDomain } from '../brand';

describe('brand', () => {
  it('expose un slug utilisable comme scope npm et préfixe de cookie', () => {
    expect(brand.slug).toMatch(/^[a-z][a-z0-9-]*$/);
  });
});

describe('sitesBaseDomain', () => {
  it("retombe sur le domaine de marque quand l'environnement ne précise rien", () => {
    expect(sitesBaseDomain({})).toBe(brand.domain);
  });

  it("laisse l'environnement pointer les sites publiés ailleurs", () => {
    expect(sitesBaseDomain({ SITES_BASE_DOMAIN: 'lvh.me' })).toBe('lvh.me');
  });
});
