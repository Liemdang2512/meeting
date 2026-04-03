import { Router } from 'express';
import sql from '../db';
import { requireAuth } from '../auth';

const router = Router();
router.use(requireAuth);

// POST /api/token-logs
// Body: { feature, action_type, model, input_tokens?, output_tokens?, total_tokens?, metadata? }
router.post('/', async (req, res) => {
  const { feature, action_type, model, input_tokens, output_tokens, total_tokens, metadata } =
    req.body ?? {};
  if (!feature || !action_type || !model) {
    return res.status(400).json({ error: 'feature, action_type, model là bắt buộc' });
  }
  try {
    await sql`
      INSERT INTO public.token_usage_logs
        (user_id, feature, action_type, model, input_tokens, output_tokens, total_tokens, metadata)
      VALUES (
        ${req.user!.userId}, ${feature}, ${action_type}, ${model},
        ${input_tokens ?? null}, ${output_tokens ?? null}, ${total_tokens ?? null},
        ${metadata ? JSON.stringify(metadata) : null}
      )
    `;
    return res.status(201).json({ ok: true });
  } catch (err: any) {
    console.error('[token-logs/create]', err);
    return res.status(500).json({ error: 'Lỗi hệ thống' });
  }
});

// GET /api/token-logs?from=ISO&to=ISO&feature=?&userId=?&page=1&pageSize=20
// Admin only — checks role from JWT
router.get('/', async (req, res) => {
  if (req.user!.role !== 'admin') {
    return res.status(403).json({ error: 'Chỉ admin mới có thể xem tất cả token logs' });
  }
  const { from, to, feature, userId, page = '1', pageSize = '20' } = req.query as Record<string, string>;
  const pageNum = parseInt(page, 10);
  const pageSizeNum = parseInt(pageSize, 10);
  const offset = (pageNum - 1) * pageSizeNum;

  try {
    const featureFilter = feature && feature !== 'all' ? sql`AND l.feature = ${feature}` : sql``;
    const userFilter = userId ? sql`AND l.user_id = ${userId}::uuid` : sql``;
    const dateFilter = from && to
      ? sql`AND l.created_at >= ${from}::timestamptz AND l.created_at <= ${to}::timestamptz`
      : sql``;

    const rows = await sql`
      SELECT
        l.*,
        u.email,
        COUNT(*) OVER() AS total_count
      FROM public.token_usage_logs l
      JOIN auth.users u ON u.id = l.user_id
      WHERE 1=1
        ${dateFilter}
        ${featureFilter}
        ${userFilter}
      ORDER BY l.created_at DESC
      LIMIT ${pageSizeNum} OFFSET ${offset}
    `;
    const total = Number(rows[0]?.total_count ?? 0);
    return res.json({ rows, total, page: pageNum, pageSize: pageSizeNum });
  } catch (err: any) {
    console.error('[token-logs/list]', err);
    return res.status(500).json({ error: 'Lỗi hệ thống' });
  }
});

export default router;
