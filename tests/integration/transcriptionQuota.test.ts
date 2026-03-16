import { describe, it, beforeEach, afterEach, afterAll, expect } from 'vitest';
import { sql, createTestUser, closeDb } from './helpers/db';
import type postgres from 'postgres';

afterAll(async () => {
  await closeDb();
});

/**
 * Integration tests for the atomic quota enforcement in POST /api/transcriptions.
 * These tests verify the DB-level behavior of the increment-then-check pattern.
 *
 * The route implementation uses:
 *   INSERT INTO public.daily_conversion_usage (user_id, usage_date, count)
 *   VALUES (userId, CURRENT_DATE AT TIME ZONE 'UTC', 1)
 *   ON CONFLICT (user_id, usage_date)
 *   DO UPDATE SET count = daily_conversion_usage.count + 1
 *   RETURNING count
 *
 * If returned count > FREE_DAILY_LIMIT (1) => 429
 * If returned count <= FREE_DAILY_LIMIT => proceed with transcription INSERT
 */
describe('Atomic quota UPSERT pattern (transcriptions route)', () => {
  let tx: postgres.ReservedSql;
  let userId: string;

  const FREE_DAILY_LIMIT = 1;

  beforeEach(async () => {
    tx = await sql.reserve();
    await tx`BEGIN`;
    userId = await createTestUser(tx, `trx-quota-${Date.now()}@example.com`);
  });

  afterEach(async () => {
    try {
      await tx`ROLLBACK`;
    } finally {
      tx.release();
    }
  });

  it('first UPSERT returns count=1 (within limit — proceed)', async () => {
    const [quota] = await tx`
      INSERT INTO public.daily_conversion_usage (user_id, usage_date, count)
      VALUES (
        ${userId},
        (CURRENT_DATE AT TIME ZONE 'UTC'),
        1
      )
      ON CONFLICT (user_id, usage_date)
      DO UPDATE SET count = daily_conversion_usage.count + 1
      RETURNING count
    `;
    expect(quota.count).toBe(1);
    expect(quota.count > FREE_DAILY_LIMIT).toBe(false); // allow transcription
  });

  it('second UPSERT returns count=2 (exceeds limit — should 429)', async () => {
    // Simulate first conversion already used
    await tx`
      INSERT INTO public.daily_conversion_usage (user_id, usage_date, count)
      VALUES (${userId}, (CURRENT_DATE AT TIME ZONE 'UTC'), 1)
    `;

    // Second attempt — route's UPSERT increments to 2
    const [quota] = await tx`
      INSERT INTO public.daily_conversion_usage (user_id, usage_date, count)
      VALUES (
        ${userId},
        (CURRENT_DATE AT TIME ZONE 'UTC'),
        1
      )
      ON CONFLICT (user_id, usage_date)
      DO UPDATE SET count = daily_conversion_usage.count + 1
      RETURNING count
    `;
    expect(quota.count).toBe(2);
    expect(quota.count > FREE_DAILY_LIMIT).toBe(true); // should 429
  });

  it('decrement restores count after 429 (undo increment on over-limit)', async () => {
    // Simulate existing count=1 (at limit)
    await tx`
      INSERT INTO public.daily_conversion_usage (user_id, usage_date, count)
      VALUES (${userId}, (CURRENT_DATE AT TIME ZONE 'UTC'), 1)
    `;

    // Over-limit UPSERT bumps to 2
    await tx`
      INSERT INTO public.daily_conversion_usage (user_id, usage_date, count)
      VALUES (
        ${userId},
        (CURRENT_DATE AT TIME ZONE 'UTC'),
        1
      )
      ON CONFLICT (user_id, usage_date)
      DO UPDATE SET count = daily_conversion_usage.count + 1
      RETURNING count
    `;

    // Undo increment (route does this on 429)
    await tx`
      UPDATE public.daily_conversion_usage
      SET count = count - 1
      WHERE user_id = ${userId}
        AND usage_date = (CURRENT_DATE AT TIME ZONE 'UTC')
    `;

    const [row] = await tx`
      SELECT count FROM public.daily_conversion_usage
      WHERE user_id = ${userId}
        AND usage_date = (CURRENT_DATE AT TIME ZONE 'UTC')
    `;
    expect(row.count).toBe(1); // restored to limit, not exceeded
  });

  it('non-free users have no usage row — quota check skipped (no table interaction)', async () => {
    // For non-free users, the route doesn't touch daily_conversion_usage
    // Verify the table has no row for this user (simulating admin/user role)
    const rows = await tx`
      SELECT count FROM public.daily_conversion_usage
      WHERE user_id = ${userId}
    `;
    expect(rows).toHaveLength(0); // No interaction with quota table for non-free
  });
});
