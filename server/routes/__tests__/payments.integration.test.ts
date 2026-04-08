import { randomUUID } from 'node:crypto';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import sql from '../../db';
import { invalidateProfileCache } from '../../auth';
import { getPackCredits, getPackPrice } from '../../billing/rateCard';
import { applyVnpayPaymentSuccess } from '../payments/vnpay';
import { applyMomoPaymentSuccess } from '../payments/momo';
import { applyVietqrPaymentSuccess } from '../payments/vietqr';
import { buildCheckUpgradePayload } from '../payments/index';

type Gateway = 'vnpay' | 'momo' | 'vietqr';
type PlanId = 'specialist' | 'reporter' | 'officer';

let testUserId = '';

async function setupTestUser() {
  testUserId = randomUUID();
  const testEmail = `payments-${testUserId}@example.com`;

  await sql`
    INSERT INTO auth.users (id, email, created_at)
    VALUES (${testUserId}, ${testEmail}, NOW())
  `;

  await sql`
    INSERT INTO public.profiles (user_id, role, workflow_groups, features, created_at, updated_at)
    VALUES (${testUserId}, 'free', ARRAY[]::text[], ARRAY[]::text[], NOW(), NOW())
  `;

  await sql`
    INSERT INTO public.wallet_balances (user_id, balance_credits, created_at, updated_at)
    VALUES (${testUserId}, 0, NOW(), NOW())
    ON CONFLICT (user_id) DO NOTHING
  `;
}

async function cleanupTestData() {
  if (!testUserId) return;
  invalidateProfileCache(testUserId);
}

async function insertPendingOrder(orderId: string, gateway: Gateway, planId: PlanId) {
  await sql`
    INSERT INTO public.payment_orders
      (id, user_id, gateway, amount, currency, status, plan_granted, metadata)
    VALUES
      (${orderId}, ${testUserId}, ${gateway}, ${getPackPrice(planId)}, 'VND', 'pending', ${planId},
       ${JSON.stringify({ plan: planId })}::jsonb)
  `;
}

async function getBalanceCredits() {
  const [row] = await sql`
    SELECT balance_credits
    FROM public.wallet_balances
    WHERE user_id = ${testUserId}
  `;
  return Number(row?.balance_credits ?? 0);
}

async function getTopupLedgerCount(correlationId: string) {
  const [row] = await sql`
    SELECT COUNT(*)::int AS count
    FROM public.wallet_ledger
    WHERE user_id = ${testUserId}
      AND event_type = 'topup'
      AND correlation_id = ${correlationId}
  `;
  return Number(row?.count ?? 0);
}

async function getWorkflowGroups() {
  const [profile] = await sql`
    SELECT workflow_groups
    FROM public.profiles
    WHERE user_id = ${testUserId}
  `;
  return (profile?.workflow_groups ?? []) as string[];
}

describe('Payment webhook integration — credit funding + workflow unlock', () => {
  beforeEach(async () => {
    await setupTestUser();
  });

  afterEach(async () => {
    await cleanupTestData();
  });

  it('VNPay funds credits exactly once and unlocks workflow group', async () => {
    const orderId = `TEST_VNPAY_${Date.now()}`;
    await insertPendingOrder(orderId, 'vnpay', 'specialist');

    const first = await applyVnpayPaymentSuccess(orderId, 'VNPAY_TXN_001');
    expect(first.processed).toBe(true);

    const second = await applyVnpayPaymentSuccess(orderId, 'VNPAY_TXN_RETRY');
    expect(second.processed).toBe(false);

    expect(await getTopupLedgerCount(orderId)).toBe(1);
    expect(await getBalanceCredits()).toBe(getPackCredits('specialist'));
    expect(await getWorkflowGroups()).toContain('specialist');
  });

  it('MoMo funds credits exactly once and unlocks workflow group', async () => {
    const orderId = `TEST_MOMO_${Date.now()}`;
    await insertPendingOrder(orderId, 'momo', 'reporter');

    const first = await applyMomoPaymentSuccess(orderId, 'MOMO_TXN_001');
    expect(first.processed).toBe(true);

    const second = await applyMomoPaymentSuccess(orderId, 'MOMO_TXN_RETRY');
    expect(second.processed).toBe(false);

    expect(await getTopupLedgerCount(orderId)).toBe(1);
    expect(await getBalanceCredits()).toBe(getPackCredits('reporter'));
    expect(await getWorkflowGroups()).toContain('reporter');
  });

  it('VietQR funds credits exactly once and unlocks workflow group', async () => {
    const orderId = `TEST_VIETQR_${Date.now()}`;
    await insertPendingOrder(orderId, 'vietqr', 'officer');

    const first = await applyVietqrPaymentSuccess(orderId, orderId);
    expect(first.processed).toBe(true);

    const second = await applyVietqrPaymentSuccess(orderId, `${orderId}_RETRY`);
    expect(second.processed).toBe(false);

    expect(await getTopupLedgerCount(orderId)).toBe(1);
    expect(await getBalanceCredits()).toBe(getPackCredits('officer'));
    expect(await getWorkflowGroups()).toContain('officer');
  });

  it('check-upgrade payload includes wallet fields after successful payment', async () => {
    const orderId = `TEST_VNPAY_REFRESH_${Date.now()}`;
    const expectedLegacyUntil = new Date(Date.now() + 24 * 60 * 60 * 1000);
    await insertPendingOrder(orderId, 'vnpay', 'specialist');
    await sql`
      INSERT INTO public.legacy_migration_batches (code, description, created_by)
      VALUES ('TEST_BATCH_11_03', 'integration batch', 'test-suite')
      ON CONFLICT (code) DO NOTHING
    `;
    await sql`
      INSERT INTO public.legacy_migration_assignments (
        user_id,
        batch_code,
        legacy_access_until,
        assigned_by
      ) VALUES (
        ${testUserId},
        'TEST_BATCH_11_03',
        ${expectedLegacyUntil.toISOString()},
        'test-suite'
      )
    `;

    await applyVnpayPaymentSuccess(orderId, 'VNPAY_TXN_REFRESH');

    const payload = await buildCheckUpgradePayload(testUserId, `payments-${testUserId}@example.com`);
    expect(payload.balance).toBe(getPackCredits('specialist'));
    expect(payload.overdraftLimit).toBe(0);
    expect(payload.legacyAccessUntil).toBeTruthy();
    expect(payload.user.plans).toContain('specialist');
  });
});
