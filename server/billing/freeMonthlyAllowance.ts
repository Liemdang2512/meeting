import sql from '../db';

/** Floor for free tier: each UTC month we top up only up to this balance (if below). */
export const FREE_TIER_MONTHLY_CREDITS = 1000;

export function currentUtcYearMonth(d = new Date()): string {
  const y = d.getUTCFullYear();
  const m = d.getUTCMonth() + 1;
  return `${y}-${m.toString().padStart(2, '0')}`;
}

export function freeAllowanceCorrelationId(userId: string, yearMonth: string): string {
  return `free-allowance:${userId}:${yearMonth}`;
}

function isEligibleProfile(row: {
  role?: string | null;
  workflow_groups?: string[] | null;
}): boolean {
  if (!row || row.role !== 'free') return false;
  const plans = row.workflow_groups ?? [];
  return Array.isArray(plans) && plans.length === 0;
}

async function markAllowancePeriodApplied(tx: any, userId: string, ym: string): Promise<void> {
  await tx`
    UPDATE public.profiles
    SET free_allowance_period_utc = ${ym},
        updated_at = NOW()
    WHERE user_id = ${userId}
  `;
}

/**
 * Idempotent per UTC month: bring balance up to FREE_TIER_MONTHLY_CREDITS only if below;
 * if already at or above, only records the period (no ledger row when delta is 0).
 */
export async function ensureFreeMonthlyAllowanceInTx(tx: any, userId: string): Promise<void> {
  await tx`SELECT pg_advisory_xact_lock(hashtext(${userId}::text))`;

  const [profile] = await tx`
    SELECT role, workflow_groups, free_allowance_period_utc
    FROM public.profiles
    WHERE user_id = ${userId}
    FOR UPDATE
    LIMIT 1
  `;
  if (!isEligibleProfile(profile ?? {})) return;

  const ym = currentUtcYearMonth();
  if (profile?.free_allowance_period_utc === ym) return;

  const correlationId = freeAllowanceCorrelationId(userId, ym);
  const [ledgerExists] = await tx`
    SELECT 1 AS x
    FROM public.wallet_ledger
    WHERE correlation_id = ${correlationId}
    LIMIT 1
  `;
  if (ledgerExists) {
    await markAllowancePeriodApplied(tx, userId, ym);
    return;
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
  const current = Number(wallet?.balance_credits ?? 0);
  const delta = Math.max(0, FREE_TIER_MONTHLY_CREDITS - current);
  const nextBal = current + delta;

  if (delta > 0) {
    await tx`
      UPDATE public.wallet_balances
      SET balance_credits = ${nextBal},
          updated_at = NOW()
      WHERE user_id = ${userId}
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
        'topup',
        NULL,
        ${delta},
        ${nextBal},
        ${correlationId},
        ${JSON.stringify({
          source: 'free_monthly_allowance',
          period: ym,
          target_floor: FREE_TIER_MONTHLY_CREDITS,
        })}::jsonb
      )
    `;
  }

  await markAllowancePeriodApplied(tx, userId, ym);
}

/**
 * Ensures the current month's free allowance (free tier, no paid plans).
 * Cheap no-op when already applied or user is not eligible.
 */
export async function ensureFreeMonthlyAllowance(userId: string): Promise<void> {
  const ym = currentUtcYearMonth();

  const [profile] = await sql`
    SELECT role, workflow_groups, free_allowance_period_utc
    FROM public.profiles
    WHERE user_id = ${userId}
    LIMIT 1
  `;
  if (!isEligibleProfile(profile ?? {})) return;
  if (profile?.free_allowance_period_utc === ym) return;

  const correlationId = freeAllowanceCorrelationId(userId, ym);
  const [ledgerExists] = await sql`
    SELECT 1 AS x
    FROM public.wallet_ledger
    WHERE correlation_id = ${correlationId}
    LIMIT 1
  `;
  if (ledgerExists) {
    await sql`
      UPDATE public.profiles
      SET free_allowance_period_utc = ${ym},
          updated_at = NOW()
      WHERE user_id = ${userId}
        AND (free_allowance_period_utc IS DISTINCT FROM ${ym})
    `;
    return;
  }

  await sql.begin(async (tx: any) => {
    await ensureFreeMonthlyAllowanceInTx(tx, userId);
  });
}
