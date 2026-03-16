import { describe, it, beforeEach, afterEach, afterAll, expect } from 'vitest';
import { sql, createTestUser, closeDb } from './helpers/db';
import type postgres from 'postgres';

afterAll(async () => {
  await closeDb();
});

describe('daily_conversion_usage quota table', () => {
  let tx: postgres.ReservedSql;
  let userId: string;

  beforeEach(async () => {
    tx = await sql.reserve();
    await tx`BEGIN`;
    userId = await createTestUser(tx, `quota-test-${Date.now()}@example.com`);
  });

  afterEach(async () => {
    try {
      await tx`ROLLBACK`;
    } finally {
      tx.release();
    }
  });

  it('daily_conversion_usage table exists with correct columns', async () => {
    const rows = await tx`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'daily_conversion_usage'
      ORDER BY column_name
    `;
    const cols = rows.map((r) => r.column_name as string);
    expect(cols).toContain('id');
    expect(cols).toContain('user_id');
    expect(cols).toContain('usage_date');
    expect(cols).toContain('count');
  });

  it('inserts a usage row for a user with default count 0', async () => {
    await tx`
      INSERT INTO public.daily_conversion_usage (user_id, usage_date, count)
      VALUES (${userId}, (CURRENT_DATE AT TIME ZONE 'UTC'), 0)
    `;
    const rows = await tx`
      SELECT count FROM public.daily_conversion_usage
      WHERE user_id = ${userId}
        AND usage_date = (CURRENT_DATE AT TIME ZONE 'UTC')
    `;
    expect(rows).toHaveLength(1);
    expect(rows[0].count).toBe(0);
  });

  it('atomic UPSERT increments count on conflict', async () => {
    // First insert
    const [first] = await tx`
      INSERT INTO public.daily_conversion_usage (user_id, usage_date, count)
      VALUES (${userId}, (CURRENT_DATE AT TIME ZONE 'UTC'), 1)
      ON CONFLICT (user_id, usage_date)
      DO UPDATE SET count = daily_conversion_usage.count + 1
      RETURNING count
    `;
    expect(first.count).toBe(1);

    // Second UPSERT — should increment
    const [second] = await tx`
      INSERT INTO public.daily_conversion_usage (user_id, usage_date, count)
      VALUES (${userId}, (CURRENT_DATE AT TIME ZONE 'UTC'), 1)
      ON CONFLICT (user_id, usage_date)
      DO UPDATE SET count = daily_conversion_usage.count + 1
      RETURNING count
    `;
    expect(second.count).toBe(2);
  });

  it('returns count=0 (no row) for a new free user with no usage today', async () => {
    const rows = await tx`
      SELECT count FROM public.daily_conversion_usage
      WHERE user_id = ${userId}
        AND usage_date = (CURRENT_DATE AT TIME ZONE 'UTC')
    `;
    // No row = 0 usage
    const used = rows[0]?.count ?? 0;
    expect(used).toBe(0);
  });

  it('UNIQUE constraint prevents duplicate (user_id, usage_date) rows', async () => {
    await tx`
      INSERT INTO public.daily_conversion_usage (user_id, usage_date, count)
      VALUES (${userId}, (CURRENT_DATE AT TIME ZONE 'UTC'), 1)
    `;
    await expect(
      tx`
        INSERT INTO public.daily_conversion_usage (user_id, usage_date, count)
        VALUES (${userId}, (CURRENT_DATE AT TIME ZONE 'UTC'), 1)
      `
    ).rejects.toThrow();
    // Recover from constraint violation
    await tx`ROLLBACK`;
    await tx`BEGIN`;
    userId = await createTestUser(tx, `quota-recovery-${Date.now()}@example.com`);
  });

  it('quota check: count <= 1 means user is within limit', async () => {
    await tx`
      INSERT INTO public.daily_conversion_usage (user_id, usage_date, count)
      VALUES (${userId}, (CURRENT_DATE AT TIME ZONE 'UTC'), 1)
    `;
    const [row] = await tx`
      SELECT count FROM public.daily_conversion_usage
      WHERE user_id = ${userId}
        AND usage_date = (CURRENT_DATE AT TIME ZONE 'UTC')
    `;
    const FREE_DAILY_LIMIT = 1;
    expect(row.count).toBe(FREE_DAILY_LIMIT);
    // count equals limit — user used their quota but didn't exceed
    expect(row.count > FREE_DAILY_LIMIT).toBe(false);
  });

  it('quota check: count > 1 means user exceeded limit (should 429)', async () => {
    await tx`
      INSERT INTO public.daily_conversion_usage (user_id, usage_date, count)
      VALUES (${userId}, (CURRENT_DATE AT TIME ZONE 'UTC'), 2)
    `;
    const [row] = await tx`
      SELECT count FROM public.daily_conversion_usage
      WHERE user_id = ${userId}
        AND usage_date = (CURRENT_DATE AT TIME ZONE 'UTC')
    `;
    const FREE_DAILY_LIMIT = 1;
    expect(row.count > FREE_DAILY_LIMIT).toBe(true);
  });
});
