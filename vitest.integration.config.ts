import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    include: ['tests/integration/**/*.test.ts'],
    setupFiles: ['./tests/integration/helpers/setup.ts'],
    testTimeout: 30000,
    hookTimeout: 30000,
    // fileParallelism: false = all integration tests run serially in one process.
    // Required because tests share a postgres.js client with reserved connections.
    // Parallel workers would create transaction conflicts.
    // (Vitest 4: poolOptions.forks.singleFork was replaced by top-level fileParallelism)
    pool: 'forks',
    fileParallelism: false,
  },
});
