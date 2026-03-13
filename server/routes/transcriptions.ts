import { Router } from 'express';
import sql from '../db';
import { requireAuth } from '../auth';

const router = Router();
router.use(requireAuth);

// POST /api/transcriptions
// Body: { file_name: string, file_size?: number, transcription_text: string }
// Returns: inserted row { id, created_at, file_name, file_size, transcription_text, user_id }
router.post('/', async (req, res) => {
  const { file_name, file_size, transcription_text } = req.body ?? {};
  if (!file_name || !transcription_text) {
    return res.status(400).json({ error: 'file_name và transcription_text là bắt buộc' });
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
