import { randomUUID } from 'node:crypto';
import sql from '../db';
import { isLegacyAccessAllowed, canDebitWithOverdraftFloor, LEGACY_OVERDRAFT_FLOOR_CREDITS } from './legacyAccessPolicy';
import { ensureFreeMonthlyAllowance } from './freeMonthlyAllowance';
import type { BillingActionType } from './types';

export interface InsufficientBalancePayload {
  error: 'INSUFFICIENT_BALANCE';
  message: string;
  upgradeRequired: true;
  currentBalanceCredits: number;
  requiredCredits: number;
  overdraftLimitCredits: number;
}

export class BillingInsufficientBalanceError extends Error {
  statusCode: number;
  payload: InsufficientBalancePayload;

  constructor(payload: InsufficientBalancePayload) {
    super(payload.message);
    this.name = 'BillingInsufficientBalanceError';
    this.statusCode = 402;
    this.payload = payload;
  }
}

export interface AuthorizeAndChargeInput {
  userId: string;
  actionType: BillingActionType;
  /** Whole credits to debit (e.g. from output-token pricing). Zero skips debit. */
  amountCredits: number;
  correlationId?: string;
  metadata?: Record<string, unknown>;
}

export interface AuthorizeAndChargeResult {
  charged: boolean;
  correlationId: string;
  amountCredits: number;
  balanceAfterCredits: number;
  skippedReason?: 'legacy-access' | 'zero-amount';
}

export interface RefundChargeInput {
  userId: string;
  actionType: BillingActionType;
  correlationId: string;
  metadata?: Record<string, unknown>;
}

export interface RefundChargeResult {
  refunded: boolean;
  correlationId: string;
  amountCredits: number;
  balanceAfterCredits: number;
  skippedReason?: 'missing-debit' | 'already-refunded';
}

export async function authorizeAndCharge({
  userId,
  actionType,
  amountCredits,
  correlationId = randomUUID(),
  metadata = {},
}: AuthorizeAndChargeInput): Promise<AuthorizeAndChargeResult> {
  const requiredCredits = Math.max(0, Math.ceil(Number(amountCredits)));
  if (!Number.isFinite(requiredCredits)) {
    throw new Error('Invalid amountCredits');
  }

  await ensureFreeMonthlyAllowance(userId);

  return sql.begin(async (tx: any) => {
    const [legacyAssignment] = await tx`
      SELECT legacy_access_until
      FROM public.legacy_migration_assignments
      WHERE user_id = ${userId}
      ORDER BY assigned_at DESC
      LIMIT 1
    `;

    if (isLegacyAccessAllowed(legacyAssignment?.legacy_access_until ?? null, new Date())) {
      const [existingBalance] = await tx`
        SELECT balance_credits
        FROM public.wallet_balances
        WHERE user_id = ${userId}
        LIMIT 1
      `;

      return {
        charged: false,
        correlationId,
        amountCredits: 0,
        balanceAfterCredits: Number(existingBalance?.balance_credits ?? 0),
        skippedReason: 'legacy-access' as const,
      };
    }

    if (requiredCredits === 0) {
      await tx`
        INSERT INTO public.wallet_balances (user_id, balance_credits, created_at, updated_at)
        VALUES (${userId}, 0, NOW(), NOW())
        ON CONFLICT (user_id) DO NOTHING
      `;
      const [existingBalance] = await tx`
        SELECT balance_credits
        FROM public.wallet_balances
        WHERE user_id = ${userId}
        LIMIT 1
      `;
      return {
        charged: false,
        correlationId,
        amountCredits: 0,
        balanceAfterCredits: Number(existingBalance?.balance_credits ?? 0),
        skippedReason: 'zero-amount' as const,
      };
    }

    await tx`
      INSERT INTO public.wallet_balances (user_id, balance_credits, created_at, updated_at)
      VALUES (${userId}, 0, NOW(), NOW())
      ON CONFLICT (user_id) DO NOTHING
    `;

    const [wallet] = await tx`
      SELECT balance_credits
      FROM public.wallet_balances
      WHERE user_id = ${userId}
      FOR UPDATE
    `;
    const currentBalance = Number(wallet?.balance_credits ?? 0);

    if (!canDebitWithOverdraftFloor(currentBalance, requiredCredits, LEGACY_OVERDRAFT_FLOOR_CREDITS)) {
      throw new BillingInsufficientBalanceError({
        error: 'INSUFFICIENT_BALANCE',
        message: 'So du khong du. Vui long nap them de tiep tuc.',
        upgradeRequired: true,
        currentBalanceCredits: currentBalance,
        requiredCredits,
        overdraftLimitCredits: LEGACY_OVERDRAFT_FLOOR_CREDITS,
      });
    }

    const [updatedBalance] = await tx`
      UPDATE public.wallet_balances
      SET balance_credits = balance_credits - ${requiredCredits},
          updated_at = NOW()
      WHERE user_id = ${userId}
      RETURNING (balance_credits)::int AS balance_credits
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
        ${userId},
        'debit',
        ${actionType},
        ${-requiredCredits}::int,
        ${updatedBalance.balance_credits}::int,
        ${correlationId},
        ${JSON.stringify({
          ...metadata,
          billingCorrelationId: correlationId,
        })}::jsonb
      )
    `;

    return {
      charged: true,
      correlationId,
      amountCredits: requiredCredits,
      balanceAfterCredits: Number(updatedBalance.balance_credits ?? 0),
    };
  });
}

export async function refundCharge({
  userId,
  actionType,
  correlationId,
  metadata = {},
}: RefundChargeInput): Promise<RefundChargeResult> {
  const refundCorrelationId = `${correlationId}:refund`;

  return sql.begin(async (tx: any) => {
    await tx`
      INSERT INTO public.wallet_balances (user_id, balance_credits, created_at, updated_at)
      VALUES (${userId}, 0, NOW(), NOW())
      ON CONFLICT (user_id) DO NOTHING
    `;

    const [wallet] = await tx`
      SELECT balance_credits
      FROM public.wallet_balances
      WHERE user_id = ${userId}
      FOR UPDATE
    `;

    const [debitRow] = await tx`
      SELECT amount_credits
      FROM public.wallet_ledger
      WHERE user_id = ${userId}
        AND event_type = 'debit'
        AND correlation_id = ${correlationId}
      ORDER BY created_at ASC
      LIMIT 1
    `;

    if (!debitRow) {
      return {
        refunded: false,
        correlationId,
        amountCredits: 0,
        balanceAfterCredits: Number(wallet?.balance_credits ?? 0),
        skippedReason: 'missing-debit',
      };
    }

    const [existingRefund] = await tx`
      SELECT id
      FROM public.wallet_ledger
      WHERE user_id = ${userId}
        AND event_type = 'refund'
        AND correlation_id = ${refundCorrelationId}
      LIMIT 1
    `;

    if (existingRefund) {
      return {
        refunded: false,
        correlationId,
        amountCredits: 0,
        balanceAfterCredits: Number(wallet?.balance_credits ?? 0),
        skippedReason: 'already-refunded',
      };
    }

    const refundAmount = Math.abs(Number(debitRow.amount_credits ?? 0));
    const [updatedBalance] = await tx`
      UPDATE public.wallet_balances
      SET balance_credits = balance_credits + ${refundAmount},
          updated_at = NOW()
      WHERE user_id = ${userId}
      RETURNING (balance_credits)::int AS balance_credits
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
        ${userId},
        'refund',
        ${actionType},
        ${refundAmount}::int,
        ${updatedBalance.balance_credits}::int,
        ${refundCorrelationId},
        ${JSON.stringify({
          ...metadata,
          billingCorrelationId: correlationId,
        })}::jsonb
      )
    `;

    return {
      refunded: true,
      correlationId,
      amountCredits: refundAmount,
      balanceAfterCredits: Number(updatedBalance.balance_credits ?? 0),
    };
  });
}
