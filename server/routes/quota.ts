import { Router } from 'express';
import sql from '../db';
import { requireAuth } from '../auth';
import { LEGACY_OVERDRAFT_FLOOR_CREDITS } from '../billing/legacyAccessPolicy';

const router = Router();

const DEFAULT_FREE_DAILY_LIMIT = 1;

export function isWalletBillingUser(user: { role?: string; plans?: string[] }): boolean {
  if (user.role !== 'free') return true;
  return Array.isArray(user.plans) && user.plans.length > 0;
}

// GET /api/quota — returns current user's conversion quota status
router.get('/', requireAuth, async (req, res) => {
  const user = req.user!;
  try {
    if (isWalletBillingUser(user)) {
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

      return res.json({
        role: user.role,
        billingModel: 'wallet',
        balance: Number(wallet?.balance_credits ?? 0),
        overdraftLimit: LEGACY_OVERDRAFT_FLOOR_CREDITS,
        legacyAccessUntil: legacyAssignment?.legacy_access_until ?? null,
      });
    }

    // 1 LEFT JOIN thay vì 2 queries riêng — giảm 1 DB roundtrip
    const [result] = await sql`
      SELECT
        COALESCE(p.daily_limit, ${DEFAULT_FREE_DAILY_LIMIT}) AS daily_limit,
        COALESCE(d.count, 0) AS used
      FROM public.profiles p
      LEFT JOIN public.daily_conversion_usage d
        ON d.user_id = p.user_id AND d.usage_date = CURRENT_DATE
      WHERE p.user_id = ${user.userId}
    `;
    const dailyLimit = result?.daily_limit ?? DEFAULT_FREE_DAILY_LIMIT;
    const used = result?.used ?? 0;
    return res.json({
      role: 'free',
      billingModel: 'quota',
      used,
      limit: dailyLimit,
      remaining: Math.max(0, dailyLimit - used),
    });
  } catch (err: any) {
    console.error('[quota/get]', err);
    return res.status(500).json({ error: 'Lỗi hệ thống' });
  }
});

export default router;
