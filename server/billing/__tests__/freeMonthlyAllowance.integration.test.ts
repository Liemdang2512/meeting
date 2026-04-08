import { randomUUID } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import sql from '../../db';
import {
  FREE_TIER_MONTHLY_CREDITS,
  currentUtcYearMonth,
  ensureFreeMonthlyAllowance,
  ensureFreeMonthlyAllowanceInTx,
  freeAllowanceCorrelationId,
} from '../freeMonthlyAllowance';

async function createFreeUser(opts: { plans?: string[] } = {}) {
  const userId = randomUUID();
  const email = `free-allow-${userId}@example.com`;
  const plans = opts.plans ?? [];

  await sql`
    INSERT INTO auth.users (id, email, created_at)
    VALUES (${userId}, ${email}, NOW())
  `;

  await sql`
    INSERT INTO public.profiles (user_id, role, workflow_groups, features, created_at, updated_at)
    VALUES (
      ${userId},
      'free',
      ${plans.length > 0 ? sql.array(plans) : sql`ARRAY[]::text[]`},
      ARRAY['transcription', 'summary']::text[],
      NOW(),
      NOW()
    )
  `;

  return userId;
}

async function getBalance(userId: string): Promise<number> {
  const [row] = await sql`
    SELECT balance_credits
    FROM public.wallet_balances
    WHERE user_id = ${userId}
  `;
  return Number(row?.balance_credits ?? 0);
}

describe('freeMonthlyAllowance (integration)', () => {
  it('credits eligible free user once per month and is idempotent', async () => {
    const userId = await createFreeUser();
    const ym = currentUtcYearMonth();
    const cid = freeAllowanceCorrelationId(userId, ym);

    await ensureFreeMonthlyAllowance(userId);
    expect(await getBalance(userId)).toBe(FREE_TIER_MONTHLY_CREDITS);

    await ensureFreeMonthlyAllowance(userId);
    expect(await getBalance(userId)).toBe(FREE_TIER_MONTHLY_CREDITS);

    const [row] = await sql`
      SELECT COUNT(*)::int AS c
      FROM public.wallet_ledger
      WHERE correlation_id = ${cid}
    `;
    expect(row?.c).toBe(1);
  });

  it('does not grant when user has a paid workflow plan', async () => {
    const userId = await createFreeUser({ plans: ['specialist'] });
    await ensureFreeMonthlyAllowance(userId);
    expect(await getBalance(userId)).toBe(0);
  });

  it('ensureFreeMonthlyAllowanceInTx runs inside a parent transaction', async () => {
    const userId = await createFreeUser();
    await sql.begin(async (tx: any) => {
      await ensureFreeMonthlyAllowanceInTx(tx, userId);
    });
    expect(await getBalance(userId)).toBe(FREE_TIER_MONTHLY_CREDITS);
  });
});
