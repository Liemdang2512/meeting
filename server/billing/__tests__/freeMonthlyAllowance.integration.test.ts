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

async function seedWallet(userId: string, balanceCredits: number) {
  await sql`
    INSERT INTO public.wallet_balances (user_id, balance_credits, created_at, updated_at)
    VALUES (${userId}, ${balanceCredits}, NOW(), NOW())
    ON CONFLICT (user_id) DO UPDATE
    SET balance_credits = ${balanceCredits}, updated_at = NOW()
  `;
}

async function getAllowancePeriod(userId: string): Promise<string | null> {
  const [row] = await sql`
    SELECT free_allowance_period_utc
    FROM public.profiles
    WHERE user_id = ${userId}
  `;
  return (row?.free_allowance_period_utc as string | null | undefined) ?? null;
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
    expect(await getAllowancePeriod(userId)).toBe(ym);
  });

  it('tops up only to the floor when balance is below 1000', async () => {
    const userId = await createFreeUser();
    await seedWallet(userId, 400);
    const ym = currentUtcYearMonth();
    const cid = freeAllowanceCorrelationId(userId, ym);

    await ensureFreeMonthlyAllowance(userId);
    expect(await getBalance(userId)).toBe(FREE_TIER_MONTHLY_CREDITS);

    const [ledger] = await sql`
      SELECT amount_credits
      FROM public.wallet_ledger
      WHERE correlation_id = ${cid}
      LIMIT 1
    `;
    expect(Number(ledger?.amount_credits)).toBe(600);

    await ensureFreeMonthlyAllowance(userId);
    expect(await getBalance(userId)).toBe(FREE_TIER_MONTHLY_CREDITS);
  });

  it('does not top up when balance is already at or above 1000 but marks the month', async () => {
    const userId = await createFreeUser();
    await seedWallet(userId, 1500);
    const ym = currentUtcYearMonth();
    const cid = freeAllowanceCorrelationId(userId, ym);

    await ensureFreeMonthlyAllowance(userId);
    expect(await getBalance(userId)).toBe(1500);

    const [cnt] = await sql`
      SELECT COUNT(*)::int AS c
      FROM public.wallet_ledger
      WHERE correlation_id = ${cid}
    `;
    expect(cnt?.c).toBe(0);
    expect(await getAllowancePeriod(userId)).toBe(ym);
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
