import { Router } from 'express';
import sql from '../db';
import { requireAuth } from '../auth';

const router = Router();

const DEFAULT_FREE_DAILY_LIMIT = 1;

// GET /api/quota — returns current user's conversion quota status
router.get('/', requireAuth, async (req, res) => {
  const user = req.user!;
  if (user.role !== 'free') {
    return res.json({ role: user.role, unlimited: true });
  }
  try {
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
      used,
      limit: dailyLimit,
      remaining: Math.max(0, dailyLimit - used),
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

export default router;
