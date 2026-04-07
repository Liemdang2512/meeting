import { Router } from 'express';
import sql from '../db';
import { requireAuth, requireFeature } from '../auth';

const router = Router();
router.use(requireAuth);

// POST /api/summaries — requires 'summary' feature
// Body: { transcription_id: string, summary_text: string, prompt_used?: string }
router.post('/', requireFeature('summary'), async (req, res) => {
  const { transcription_id, summary_text, prompt_used, billing_correlation_id } = req.body ?? {};
  if (!transcription_id || !summary_text) {
    return res.status(400).json({ error: 'transcription_id và summary_text là bắt buộc' });
  }
  try {
    const [transcription] = await sql`
      SELECT id FROM public.transcriptions
      WHERE id = ${transcription_id} AND user_id = ${req.user!.userId}
    `;
    if (!transcription) {
      return res.status(403).json({ error: 'Bạn không có quyền truy cập transcription này' });
    }

    if (billing_correlation_id) {
      const [debitRow] = await sql`
        SELECT id
        FROM public.wallet_ledger
        WHERE user_id = ${req.user!.userId}
          AND event_type = 'debit'
          AND correlation_id = ${billing_correlation_id}
        LIMIT 1
      `;

      if (!debitRow) {
        return res.status(402).json({
          error: 'INSUFFICIENT_BALANCE',
          message: 'Không tìm thấy giao dịch debit hợp lệ cho phiên tạo biên bản.',
          upgradeRequired: true,
        });
      }
    }

    const [row] = await sql`
      INSERT INTO public.summaries (transcription_id, summary_text, prompt_used)
      VALUES (${transcription_id}, ${summary_text}, ${prompt_used ?? null})
      RETURNING id, created_at, transcription_id, summary_text, prompt_used
    `;
    return res.status(201).json(row);
  } catch (err: any) {
    console.error('[summaries/create]', err);
    return res.status(500).json({ error: 'Lỗi hệ thống' });
  }
});

export default router;
