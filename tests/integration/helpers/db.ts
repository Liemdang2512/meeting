import postgres from 'postgres';

export const TEST_DB_URL =
  process.env.TEST_DATABASE_URL ??
  'postgres://postgres:postgres@localhost:5433/meeting_test';

// Single connection for serial tests (singleFork ensures no concurrency)
export const sql = postgres(TEST_DB_URL, {
  max: 1,
  onnotice: () => {}, // suppress NOTICE from CREATE ROLE IF NOT EXISTS etc.
});

/**
 * Insert a test user into auth.users and return their UUID.
 * Must be called BEFORE inserting into any table with REFERENCES auth.users(id).
 */
export async function createTestUser(
  tx: postgres.ReservedSql,
  email = 'test@example.com',
): Promise<string> {
  const rows = await tx`
    INSERT INTO auth.users (email)
    VALUES (${email})
    RETURNING id
  `;
  return rows[0].id as string;
}

/**
 * Set the Supabase-compatible JWT claims for the current transaction.
 * auth.uid() will return the given userId after this call.
 * Uses set_config with is_local=true so it resets on ROLLBACK/COMMIT.
 */
export async function setAuthContext(
  tx: postgres.ReservedSql,
  userId: string,
): Promise<void> {
  const claims = JSON.stringify({ sub: userId, role: 'authenticated' });
  await tx`
    SELECT set_config('request.jwt.claims', ${claims}, true)
  `;
}

/**
 * Close all database connections. Call in afterAll.
 */
export async function closeDb(): Promise<void> {
  await sql.end({ timeout: 5 });
}
