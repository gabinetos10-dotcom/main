import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
    setupFiles: ['./vitest.setup.ts'],
    // Les tests écrivent dans la base : les faire tourner en parallèle les ferait se marcher dessus.
    fileParallelism: false,
    testTimeout: 20_000,
  },
});
