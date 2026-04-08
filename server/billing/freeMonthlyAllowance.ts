import sql from '../db';

/** Calendar-month free pool for self-serve free tier (no paid workflow plans). */
export const FREE_TIER_MONTHLY_CREDITS = 1000;

export function currentUtcYearMonth(d = new Date()): string {
  const y = d.getUTCFullYear();
  const m = d.getUTCMonth() + 1;
  return `${y}-${m.toString().padStart(2, '0')}`;
}

export function freeAllowanceCorrelationId(userId: string, yearMonth: string): string {
  return `free-allowance:${userId}:${yearMonth}`;
}

async function isEligibleInTx(tx: any, userId: string): Promise<boolean> {
  const [row] = await tx`
    SELECT role, workflow_groups
    FROM public.profiles
    WHERE user_id = ${userId}
    LIMIT 1
  `;
  if (!row || row.role !== 'free') return false;
  const plans = row.workflow_groups ?? [];
  return Array.isArray(plans) && plans.length === 0;
}

/**
 * Idempotent: at most one topup per user per UTC calendar month.
 * Call inside an existing transaction (e.g. registration).
 */
export async function ensureFreeMonthlyAllowanceInTx(tx: any, userId: string): Promise<void> {
  await tx`SELECT pg_advisory_xact_lock(hashtext(${userId}::text))`;

  if (!(await isEligibleInTx(tx, userId))) return;

  const ym = currentUtcYearMonth();
  const correlationId = freeAllowanceCorrelationId(userId, ym);

  const [exists] = await tx`
    SELECT 1 AS x
    FROM public.wallet_ledger
    WHERE correlation_id = ${correlationId}
    LIMIT 1
  `;
  if (exists) return;

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
  const nextBal = current + FREE_TIER_MONTHLY_CREDITS;

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
      ${FREE_TIER_MONTHLY_CREDITS},
      ${nextBal},
      ${correlationId},
      ${JSON.stringify({ source: 'free_monthly_allowance', period: ym })}::jsonb
    )
  `;
}

/**
 * Ensures the current month's free allowance is credited (free tier, no paid plans).
 * Cheap no-op when already granted or user is not eligible.
 */
export async function ensureFreeMonthlyAllowance(userId: string): Promise<void> {
  const [profile] = await sql`
    SELECT role, workflow_groups
    FROM public.profiles
    WHERE user_id = ${userId}
    LIMIT 1
  `;
  if (!profile || profile.role !== 'free') return;
  const plans = profile.workflow_groups ?? [];
  if (!Array.isArray(plans) || plans.length > 0) return;

  const ym = currentUtcYearMonth();
  const correlationId = freeAllowanceCorrelationId(userId, ym);

  const [exists] = await sql`
    SELECT 1 AS x
    FROM public.wallet_ledger
    WHERE correlation_id = ${correlationId}
    LIMIT 1
  `;
  if (exists) return;

  await sql.begin(async (tx: any) => {
    await ensureFreeMonthlyAllowanceInTx(tx, userId);
  });
}
