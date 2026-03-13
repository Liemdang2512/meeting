import { describe, it, beforeEach, afterEach, afterAll, expect } from 'vitest';
import { sql, createTestUser, setAuthContext, closeDb } from './helpers/db';
import type postgres from 'postgres';

afterAll(async () => {
  await closeDb();
});

describe('token_usage_logs table', () => {
  let tx: postgres.ReservedSql;
  let userId: string;

  beforeEach(async () => {
    tx = await sql.reserve();
    await tx`BEGIN`;
    // Always create a user first — token_usage_logs.user_id has FK to auth.users
    userId = await createTestUser(tx, `test-${Date.now()}@example.com`);
  });

  afterEach(async () => {
    try {
      await tx`ROLLBACK`;
    } finally {
      tx.release();
    }
  });

  it('inserts a token log row with required fields', async () => {
    await tx`
      INSERT INTO public.token_usage_logs
        (user_id, action_type, feature, model)
      VALUES
        (${userId}, 'transcribe', 'transcription', 'gemini-1.5-flash')
    `;
    const rows = await tx`
      SELECT * FROM public.token_usage_logs WHERE user_id = ${userId}
    `;
    expect(rows).toHaveLength(1);
    expect(rows[0].action_type).toBe('transcribe');
    expect(rows[0].feature).toBe('transcription');
    expect(rows[0].model).toBe('gemini-1.5-flash');
  });

  it('inserts a token log row with all optional fields', async () => {
    const meta = { file_name: 'meeting.mp3' };
    await tx`
      INSERT INTO public.token_usage_logs
        (user_id, action_type, feature, model, input_tokens, output_tokens, total_tokens, metadata)
      VALUES
        (${userId}, 'summarize', 'meeting_minutes', 'gemini-1.5-pro', 800, 200, 1000, ${tx.json(meta)})
    `;
    const rows = await tx`
      SELECT * FROM public.token_usage_logs WHERE user_id = ${userId}
    `;
    expect(rows).toHaveLength(1);
    expect(rows[0].total_tokens).toBe(1000);
    expect(rows[0].metadata).toEqual(meta);
  });

  it('optional fields (input_tokens, output_tokens, metadata) can be NULL', async () => {
    await tx`
      INSERT INTO public.token_usage_logs
        (user_id, action_type, feature, model)
      VALUES
        (${userId}, 'transcribe', 'transcription', 'gemini-1.5-flash')
    `;
    const rows = await tx`
      SELECT * FROM public.token_usage_logs WHERE user_id = ${userId}
    `;
    expect(rows).toHaveLength(1);
    expect(rows[0].input_tokens).toBeNull();
    expect(rows[0].output_tokens).toBeNull();
    expect(rows[0].metadata).toBeNull();
  });

  it('transaction rollback removes the inserted row', async () => {
    // Insert inside the transaction
    await tx`
      INSERT INTO public.token_usage_logs
        (user_id, action_type, feature, model)
      VALUES
        (${userId}, 'transcribe', 'transcription', 'gemini-1.5-flash')
    `;
    // Verify it exists inside the transaction
    const inTx = await tx`SELECT COUNT(*) as n FROM public.token_usage_logs WHERE user_id = ${userId}`;
    expect(Number(inTx[0].n)).toBe(1);

    // Capture userId for post-rollback check
    const capturedUserId = userId;

    // Roll back manually and start a new transaction to verify isolation
    await tx`ROLLBACK`;
    // After rollback, the row should not exist — check via the same reserved connection
    // (no concurrent connection needed since we're on the same serialized client)
    await tx`BEGIN`;
    const afterRollback = await tx`SELECT COUNT(*) as n FROM public.token_usage_logs WHERE user_id = ${capturedUserId}`;
    expect(Number(afterRollback[0].n)).toBe(0);
    // afterEach will ROLLBACK this new transaction — that's fine
  });

  it('rejects insert with non-existent user_id (FK constraint)', async () => {
    const fakeUserId = '99999999-9999-9999-9999-999999999999';
    await expect(
      tx`
        INSERT INTO public.token_usage_logs
          (user_id, action_type, feature, model)
        VALUES
          (${fakeUserId}, 'transcribe', 'transcription', 'gemini-1.5-flash')
      `
    ).rejects.toThrow();
    // After FK violation the transaction is aborted — rollback and restart
    await tx`ROLLBACK`;
    await tx`BEGIN`;
    // Recreate user for afterEach cleanup (transaction is now fresh)
    userId = await createTestUser(tx, `recovery-${Date.now()}@example.com`);
  });
});

describe('is_admin() function', () => {
  let tx: postgres.ReservedSql;
  let userId: string;

  beforeEach(async () => {
    tx = await sql.reserve();
    await tx`BEGIN`;
    userId = await createTestUser(tx, `admin-test-${Date.now()}@example.com`);
  });

  afterEach(async () => {
    try {
      await tx`ROLLBACK`;
    } finally {
      tx.release();
    }
  });

  it('returns false for a user with no profile', async () => {
    await setAuthContext(tx, userId);
    const rows = await tx`SELECT public.is_admin() AS result`;
    expect(rows[0].result).toBe(false);
  });

  it('returns false for a user with role=user in profiles', async () => {
    await tx`
      INSERT INTO public.profiles (user_id, role)
      VALUES (${userId}, 'user')
    `;
    await setAuthContext(tx, userId);
    const rows = await tx`SELECT public.is_admin() AS result`;
    expect(rows[0].result).toBe(false);
  });

  it('returns true for a user with role=admin in profiles', async () => {
    await tx`
      INSERT INTO public.profiles (user_id, role)
      VALUES (${userId}, 'admin')
    `;
    await setAuthContext(tx, userId);
    const rows = await tx`SELECT public.is_admin() AS result`;
    expect(rows[0].result).toBe(true);
  });
});
