import { Router } from 'express';
import sql from '../db';
import { requireAuth } from '../auth';

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

export default router;
