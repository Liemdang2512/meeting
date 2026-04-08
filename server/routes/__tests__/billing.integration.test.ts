import { randomUUID } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import sql from '../../db';
import {
  authorizeAndCharge,
  BillingInsufficientBalanceError,
  refundCharge,
} from '../../billing/billingService';

async function createUserWithBalance(balanceCredits: number) {
  const userId = randomUUID();
  const email = `billing-runtime-${userId}@example.com`;

  await sql`
    INSERT INTO auth.users (id, email, created_at)
    VALUES (${userId}, ${email}, NOW())
  `;

  await sql`
    INSERT INTO public.wallet_balances (user_id, balance_credits, created_at, updated_at)
    VALUES (${userId}, ${balanceCredits}, NOW(), NOW())
    ON CONFLICT (user_id) DO UPDATE
    SET balance_credits = ${balanceCredits}, updated_at = NOW()
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

async function getLedgerEntries(userId: string, correlationId: string) {
  return sql`
    SELECT event_type, action_type, amount_credits, balance_after_credits, metadata
    FROM public.wallet_ledger
    WHERE user_id = ${userId}
      AND (
        correlation_id = ${correlationId}
        OR correlation_id LIKE ${`${correlationId}:%`}
      )
    ORDER BY created_at ASC, id ASC
  `;
}

describe('Billing runtime integration (D-04/D-05/D-07)', () => {
  it('charges credits at action start and writes a debit ledger row', async () => {
    const userId = await createUserWithBalance(20_000);
    const correlationId = `BILLING_TEST_${Date.now()}_SUCCESS`;

    const result = await authorizeAndCharge({
      userId,
      actionType: 'minutes-generate',
      amountCredits: 10_000,
      correlationId,
      metadata: { source: 'billing.integration.test.ts' },
    });

    expect(result.charged).toBe(true);
    expect(result.correlationId).toBe(correlationId);

    const balance = await getBalance(userId);
    expect(balance).toBe(10_000);

    const ledger = await getLedgerEntries(userId, correlationId);
    expect(ledger).toHaveLength(1);
    expect(ledger[0]).toMatchObject({
      event_type: 'debit',
      action_type: 'minutes-generate',
      amount_credits: -10_000,
      balance_after_credits: 10_000,
    });
  });

  it('rejects debit when charge would breach overdraft floor and returns upgrade payload', async () => {
    const userId = await createUserWithBalance(-9_500);
    const correlationId = `BILLING_TEST_${Date.now()}_FLOOR`;

    await expect(
      authorizeAndCharge({
        userId,
        actionType: 'minutes-generate',
        amountCredits: 10_000,
        correlationId,
        metadata: { source: 'billing.integration.test.ts' },
      }),
    ).rejects.toBeInstanceOf(BillingInsufficientBalanceError);

    await expect(
      authorizeAndCharge({
        userId,
        actionType: 'minutes-generate',
        amountCredits: 10_000,
        correlationId: `${correlationId}_PAYLOAD`,
      }),
    ).rejects.toMatchObject({
      statusCode: 402,
      payload: {
        upgradeRequired: true,
      },
    });
  });

  it('refunds fully after post-charge failure using same correlation id', async () => {
    const userId = await createUserWithBalance(30_000);
    const correlationId = `BILLING_TEST_${Date.now()}_REFUND`;

    await authorizeAndCharge({
      userId,
      actionType: 'minutes-generate',
      amountCredits: 10_000,
      correlationId,
      metadata: { source: 'billing.integration.test.ts' },
    });

    const refund = await refundCharge({
      userId,
      actionType: 'minutes-generate',
      correlationId,
      metadata: { reason: 'simulated-downstream-failure' },
    });

    expect(refund.refunded).toBe(true);
    expect(refund.amountCredits).toBe(10_000);

    const balance = await getBalance(userId);
    expect(balance).toBe(30_000);

    const ledger = await getLedgerEntries(userId, correlationId);
    expect(ledger).toHaveLength(2);
    expect(ledger[0]).toMatchObject({ event_type: 'debit', amount_credits: -10_000 });
    expect(ledger[1]).toMatchObject({ event_type: 'refund', amount_credits: 10_000 });
    expect(String(ledger[1].metadata)).toContain(correlationId);
  });
});
