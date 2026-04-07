import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import sql from '../../db';
import {
  canDebitWithOverdraftFloor,
  LEGACY_OVERDRAFT_FLOOR_CREDITS,
} from '../../billing/legacyAccessPolicy';

const TEST_USER_ID = '00000000-0000-0000-0000-000000000212';
const TEST_EMAIL = 'billing-overdraft-integration@example.com';
const CHARGE_AMOUNT = 1000;

async function setupTestUserWithBalance(startBalanceCredits: number) {
  await sql`
    INSERT INTO auth.users (id, email, created_at)
    VALUES (${TEST_USER_ID}, ${TEST_EMAIL}, NOW())
    ON CONFLICT (id) DO NOTHING
  `;
  await sql`
    INSERT INTO public.wallet_balances (user_id, balance_credits, created_at, updated_at)
    VALUES (${TEST_USER_ID}, ${startBalanceCredits}, NOW(), NOW())
    ON CONFLICT (user_id) DO UPDATE
    SET balance_credits = ${startBalanceCredits}, updated_at = NOW()
  `;
}

async function cleanupTestData() {
  await sql`DELETE FROM public.wallet_ledger WHERE user_id = ${TEST_USER_ID}`;
  await sql`DELETE FROM public.wallet_balances WHERE user_id = ${TEST_USER_ID}`;
  await sql`DELETE FROM auth.users WHERE id = ${TEST_USER_ID}`;
}

async function attemptAtomicDebit(correlationId: string): Promise<boolean> {
  return sql.begin(async (tx: any) => {
    const [balanceRow] = await tx`
      SELECT balance_credits
      FROM public.wallet_balances
      WHERE user_id = ${TEST_USER_ID}
      FOR UPDATE
    `;

    const currentBalance = Number(balanceRow?.balance_credits ?? 0);
    if (!canDebitWithOverdraftFloor(currentBalance, CHARGE_AMOUNT)) {
      return false;
    }

    const [updated] = await tx`
      UPDATE public.wallet_balances
      SET balance_credits = balance_credits - ${CHARGE_AMOUNT},
          updated_at = NOW()
      WHERE user_id = ${TEST_USER_ID}
      RETURNING balance_credits
    `;

    await tx`
      INSERT INTO public.wallet_ledger (
        user_id,
        event_type,
        action_type,
        amount_credits,
        balance_after_credits,
        correlation_id,
        metadata
      ) VALUES (
        ${TEST_USER_ID},
        'debit',
        'minutes-generate',
        ${-CHARGE_AMOUNT},
        ${updated.balance_credits},
        ${correlationId},
        '{}'::jsonb
      )
    `;

    return true;
  });
}

describe('Billing overdraft floor integration (D-06/D-07)', () => {
  beforeEach(async () => {
    await setupTestUserWithBalance(-9_500);
  });

  afterEach(async () => {
    await cleanupTestData();
  });

  it('allows concurrent debits only while final balance stays above floor', async () => {
    const [first, second] = await Promise.all([
      attemptAtomicDebit('TEST_OD_1'),
      attemptAtomicDebit('TEST_OD_2'),
    ]);

    const allowedCount = [first, second].filter(Boolean).length;
    expect(allowedCount).toBe(1);

    const [balanceRow] = await sql`
      SELECT balance_credits
      FROM public.wallet_balances
      WHERE user_id = ${TEST_USER_ID}
    `;

    const finalBalance = Number(balanceRow?.balance_credits ?? 0);
    expect(finalBalance).toBeGreaterThanOrEqual(LEGACY_OVERDRAFT_FLOOR_CREDITS);
    expect(finalBalance).toBe(-10_000);
  });
});
