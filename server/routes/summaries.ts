import { Router } from 'express';
import sql from '../db';
import { requireAuth } from '../auth';

const router = Router();
router.use(requireAuth);

// POST /api/summaries
// Body: { transcription_id: string, summary_text: string, prompt_used?: string }
router.post('/', async (req, res) => {
  const { transcription_id, summary_text, prompt_used } = req.body ?? {};
  if (!transcription_id || !summary_text) {
    return res.status(400).json({ error: 'transcription_id và summary_text là bắt buộc' });
  }
  try {
    const [row] = await sql`
      INSERT INTO public.summaries (transcription_id, summary_text, prompt_used)
      VALUES (${transcription_id}, ${summary_text}, ${prompt_used ?? null})
      RETURNING id, created_at, transcription_id, summary_text, prompt_used
    `;
    return res.status(201).json(row);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

export default router;
