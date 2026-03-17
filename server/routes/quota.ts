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
    const [profile] = await sql`
      SELECT daily_limit FROM public.profiles WHERE user_id = ${user.userId}
    `;
    const dailyLimit = profile?.daily_limit ?? DEFAULT_FREE_DAILY_LIMIT;
    const [row] = await sql`
      SELECT count FROM public.daily_conversion_usage
      WHERE user_id = ${user.userId}
        AND usage_date = (CURRENT_DATE AT TIME ZONE 'UTC')
    `;
    const used = row?.count ?? 0;
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
