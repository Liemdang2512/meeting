import { afterAll } from 'vitest';
import { closeDb } from './db';

// Close the shared postgres.js client after all integration tests complete.
// Without this, the Vitest process hangs waiting for open connections.
afterAll(async () => {
  await closeDb();
});
