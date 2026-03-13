import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    include: ['tests/integration/**/*.test.ts'],
    setupFiles: ['./tests/integration/helpers/setup.ts'],
    testTimeout: 30000,
    hookTimeout: 30000,
    // singleFork: all integration tests run in one process serially.
    // Required because tests share a postgres.js client with reserved connections.
    // Parallel workers would create transaction conflicts.
    pool: 'forks',
    poolOptions: {
      forks: {
        singleFork: true,
      },
    },
  },
});
