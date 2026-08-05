import { describe, expect, it } from 'vitest';

import { EnvValidationError, parseEnv, serverEnvSchema, storageEnvSchema } from '../env';

const valid = {
  NODE_ENV: 'test',
  DATABASE_URL: 'postgresql://atelier:atelier@localhost:55432/atelier',
  REDIS_URL: 'redis://localhost:56379',
  S3_ENDPOINT: 'http://localhost:59000',
  S3_REGION: 'eu-west-1',
  S3_BUCKET: 'atelier-dev',
  S3_ACCESS_KEY_ID: 'atelier',
  S3_SECRET_ACCESS_KEY: 'atelier-secret',
  S3_PUBLIC_URL: 'http://localhost:59000/atelier-dev',
  S3_FORCE_PATH_STYLE: 'true',
  APP_URL: 'http://localhost:3000',
  SITES_BASE_DOMAIN: 'lvh.me',
};

describe('parseEnv', () => {
  it('accepte un environnement complet et renvoie un objet typé', () => {
    const env = parseEnv(serverEnvSchema, valid);
    expect(env.DATABASE_URL).toBe(valid.DATABASE_URL);
    expect(env.NODE_ENV).toBe('test');
  });

  it('transforme S3_FORCE_PATH_STYLE en booléen', () => {
    expect(parseEnv(storageEnvSchema, valid).S3_FORCE_PATH_STYLE).toBe(true);
    expect(
      parseEnv(storageEnvSchema, { ...valid, S3_FORCE_PATH_STYLE: 'false' }).S3_FORCE_PATH_STYLE,
    ).toBe(false);
  });

  it('applique false par défaut quand S3_FORCE_PATH_STYLE est absent', () => {
    const { S3_FORCE_PATH_STYLE: _omitted, ...withoutFlag } = valid;
    expect(parseEnv(storageEnvSchema, withoutFlag).S3_FORCE_PATH_STYLE).toBe(false);
  });

  it('échoue quand une variable manque, en la nommant', () => {
    const { DATABASE_URL: _omitted, ...incomplete } = valid;
    expect(() => parseEnv(serverEnvSchema, incomplete)).toThrow(EnvValidationError);
    expect(() => parseEnv(serverEnvSchema, incomplete)).toThrow(/DATABASE_URL/);
  });

  it("refuse une DATABASE_URL qui n'est pas PostgreSQL", () => {
    expect(() =>
      parseEnv(serverEnvSchema, { ...valid, DATABASE_URL: 'mysql://localhost' }),
    ).toThrow(/DATABASE_URL doit être une URL PostgreSQL/);
  });

  it('rassemble toutes les erreurs en un seul message', () => {
    try {
      parseEnv(serverEnvSchema, { NODE_ENV: 'test' });
      expect.unreachable('parseEnv aurait dû lever pour un environnement quasi vide');
    } catch (error) {
      expect(error).toBeInstanceOf(EnvValidationError);
      expect((error as EnvValidationError).issues.length).toBeGreaterThan(5);
    }
  });
});
