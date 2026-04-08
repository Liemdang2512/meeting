import { Router } from 'express';
import sql from '../db';
import { requireAuth } from '../auth';
import { authorizeAndCharge, BillingInsufficientBalanceError } from '../billing/billingService';
import { getOutputTokenChargeCredits, resolveBillableOutputTokens } from '../billing/rateCard';
import { canDebitWithOverdraftFloor, LEGACY_OVERDRAFT_FLOOR_CREDITS } from '../billing/legacyAccessPolicy';

const router = Router();

const PAGE_SIZE = 20;

// GET /api/wallet/history?page=1 — returns paginated wallet ledger for current user
router.get('/history', requireAuth, async (req, res) => {
  const user = req.user!;
  const page = Math.max(1, parseInt(String(req.query.page ?? '1'), 10) || 1);
  const offset = (page - 1) * PAGE_SIZE;

  try {
    const rows = await sql`
      SELECT
        id,
        event_type,
        action_type,
        amount_credits,
        balance_after_credits,
        correlation_id,
        metadata,
        created_at
      FROM public.wallet_ledger
      WHERE user_id = ${user.userId}
      ORDER BY created_at DESC
      LIMIT ${PAGE_SIZE}
      OFFSET ${offset}
    `;

    const [countResult] = await sql`
      SELECT COUNT(*)::int AS total
      FROM public.wallet_ledger
      WHERE user_id = ${user.userId}
    `;

    const total = countResult?.total ?? 0;
    const totalPages = Math.ceil(total / PAGE_SIZE);

    return res.json({
      rows,
      pagination: {
        page,
        pageSize: PAGE_SIZE,
        total,
        totalPages,
      },
    });
  } catch (err: any) {
    console.error('[wallet/history]', err);
    return res.status(500).json({ error: 'Lỗi hệ thống' });
  }
});

// GET /api/wallet/floor — check if user's balance is above overdraft floor (no write)
router.get('/floor', requireAuth, async (req, res) => {
  const user = req.user!;
  try {
    const [wallet] = await sql`
      SELECT balance_credits FROM public.wallet_balances WHERE user_id = ${user.userId}
    `;
    const balance = Number(wallet?.balance_credits ?? 0);
    const allowed = canDebitWithOverdraftFloor(balance, 1, LEGACY_OVERDRAFT_FLOOR_CREDITS);
    return res.json({ allowed, balance, overdraftLimit: LEGACY_OVERDRAFT_FLOOR_CREDITS });
  } catch (err: any) {
    console.error('[wallet/floor]', err);
    return res.status(500).json({ error: 'Lỗi hệ thống' });
  }
});

// POST /api/wallet/charge — charge based on output tokens (called by client after transcription)
// Body: { outputTokens: number, actionType: string, outputText?: string }
router.post('/charge', requireAuth, async (req, res) => {
  const user = req.user!;
  const { outputTokens, actionType, outputText } = req.body ?? {};

  if (!actionType || typeof actionType !== 'string') {
    return res.status(400).json({ error: 'actionType là bắt buộc' });
  }

  const tokens = resolveBillableOutputTokens(
    typeof outputTokens === 'number' ? { candidatesTokenCount: outputTokens } : undefined,
    typeof outputText === 'string' ? outputText : '',
  );
  const amountCredits = getOutputTokenChargeCredits(tokens);

  try {
    const billing = await authorizeAndCharge({
      userId: user.userId,
      actionType: actionType as any,
      amountCredits,
      metadata: { route: '/api/wallet/charge', outputTokensBillable: tokens },
    });
    return res.json({
      charged: billing.charged,
      amountCredits: billing.amountCredits,
      balanceAfterCredits: billing.balanceAfterCredits,
      outputTokensBilled: tokens,
      skippedReason: billing.skippedReason,
    });
  } catch (err: any) {
    if (err instanceof BillingInsufficientBalanceError) {
      return res.status(err.statusCode).json(err.payload);
    }
    console.error('[wallet/charge]', err);
    return res.status(500).json({ error: 'Lỗi hệ thống' });
  }
});

export default router;
