import { Router } from 'express';
import sql from '../db';
import { requireAuth } from '../auth';
import { LEGACY_OVERDRAFT_FLOOR_CREDITS } from '../billing/legacyAccessPolicy';

const router = Router();

export function buildWalletQuotaPayload(input: {
  role?: string;
  balanceCredits?: number | null;
  legacyAccessUntil?: Date | string | null;
}) {
  return {
    role: input.role ?? 'free',
    billingModel: 'wallet' as const,
    balance: Number(input.balanceCredits ?? 0),
    overdraftLimit: LEGACY_OVERDRAFT_FLOOR_CREDITS,
    legacyAccessUntil: input.legacyAccessUntil ?? null,
  };
}

// GET /api/quota — returns current user's conversion quota status
router.get('/', requireAuth, async (req, res) => {
  const user = req.user!;
  try {
    const [wallet] = await sql`
      SELECT balance_credits
      FROM public.wallet_balances
      WHERE user_id = ${user.userId}
      LIMIT 1
    `;
    const [legacyAssignment] = await sql`
      SELECT legacy_access_until
      FROM public.legacy_migration_assignments
      WHERE user_id = ${user.userId}
      ORDER BY assigned_at DESC
      LIMIT 1
    `;

    return res.json(
      buildWalletQuotaPayload({
        role: user.role,
        balanceCredits: wallet?.balance_credits,
        legacyAccessUntil: legacyAssignment?.legacy_access_until ?? null,
      }),
    );
  } catch (err: any) {
    console.error('[quota/get]', err);
    return res.status(500).json({ error: 'Lỗi hệ thống' });
  }
});

export default router;
