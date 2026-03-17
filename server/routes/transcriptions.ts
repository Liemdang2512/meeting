import { Router } from 'express';
import sql from '../db';
import { requireAuth } from '../auth';

const router = Router();
router.use(requireAuth);

const DEFAULT_FREE_DAILY_LIMIT = 1;

// POST /api/transcriptions
// Body: { file_name: string, file_size?: number, transcription_text: string }
// Returns: inserted row { id, created_at, file_name, file_size, transcription_text, user_id }
router.post('/', async (req, res) => {
  const { file_name, file_size, transcription_text } = req.body ?? {};
  if (!file_name || !transcription_text) {
    return res.status(400).json({ error: 'file_name và transcription_text là bắt buộc' });
  }

  // Quota enforcement for free tier (atomic: increment-then-check, prevents race condition)
  if (req.user!.role === 'free') {
    try {
      const [profile] = await sql`
        SELECT daily_limit FROM public.profiles WHERE user_id = ${req.user!.userId}
      `;
      const dailyLimit = profile?.daily_limit ?? DEFAULT_FREE_DAILY_LIMIT;
      const [quota] = await sql`
        INSERT INTO public.daily_conversion_usage (user_id, usage_date, count)
        VALUES (
          ${req.user!.userId},
          (CURRENT_DATE AT TIME ZONE 'UTC'),
          1
        )
        ON CONFLICT (user_id, usage_date)
        DO UPDATE SET count = daily_conversion_usage.count + 1
        RETURNING count
      `;
      if (quota.count > dailyLimit) {
        // Undo the increment so the count stays accurate
        await sql`
          UPDATE public.daily_conversion_usage
          SET count = count - 1
          WHERE user_id = ${req.user!.userId}
            AND usage_date = (CURRENT_DATE AT TIME ZONE 'UTC')
        `;
        return res.status(429).json({
          error: 'Bạn đã đạt giới hạn hôm nay. Nâng cấp để tiếp tục.',
          quota: { used: dailyLimit, limit: dailyLimit, remaining: 0 },
          upgradeRequired: true,
        });
      }
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  }

  try {
    const [row] = await sql`
      INSERT INTO public.transcriptions (file_name, file_size, transcription_text, user_id)
      VALUES (${file_name}, ${file_size ?? null}, ${transcription_text}, ${req.user!.userId})
      RETURNING id, created_at, file_name, file_size, transcription_text, user_id
    `;
    return res.status(201).json(row);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

export default router;
