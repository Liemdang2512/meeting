import { randomUUID } from 'node:crypto';
import { beforeEach, describe, expect, it } from 'vitest';
import sql from '../../db';
import {
  canDebitWithOverdraftFloor,
  LEGACY_OVERDRAFT_FLOOR_CREDITS,
} from '../../billing/legacyAccessPolicy';

const CHARGE_AMOUNT = 1000;
let testUserId = '';

async function setupTestUserWithBalance(startBalanceCredits: number) {
  testUserId = randomUUID();
  const testEmail = `billing-overdraft-${testUserId}@example.com`;

  await sql`
    INSERT INTO auth.users (id, email, created_at)
    VALUES (${testUserId}, ${testEmail}, NOW())
    ON CONFLICT (id) DO NOTHING
  `;
  await sql`
    INSERT INTO public.wallet_balances (user_id, balance_credits, created_at, updated_at)
    VALUES (${testUserId}, ${startBalanceCredits}, NOW(), NOW())
    ON CONFLICT (user_id) DO UPDATE
    SET balance_credits = ${startBalanceCredits}, updated_at = NOW()
  `;
}

async function attemptAtomicDebit(correlationId: string): Promise<boolean> {
  return sql.begin(async (tx: any) => {
    const [balanceRow] = await tx`
      SELECT balance_credits
      FROM public.wallet_balances
      WHERE user_id = ${testUserId}
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
      WHERE user_id = ${testUserId}
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
        ${testUserId},
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
    await setupTestUserWithBalance(-9_000);
  });

  it('allows concurrent debits only while final balance stays above floor', async () => {
    const [first, second] = await Promise.all([
      attemptAtomicDebit(`${testUserId}-TEST_OD_1`),
      attemptAtomicDebit(`${testUserId}-TEST_OD_2`),
    ]);

    const allowedCount = [first, second].filter(Boolean).length;
    expect(allowedCount).toBe(1);

    const [balanceRow] = await sql`
      SELECT balance_credits
      FROM public.wallet_balances
      WHERE user_id = ${testUserId}
    `;

    const finalBalance = Number(balanceRow?.balance_credits ?? 0);
    expect(finalBalance).toBeGreaterThanOrEqual(LEGACY_OVERDRAFT_FLOOR_CREDITS);
    expect(finalBalance).toBe(-10_000);
  });
});
