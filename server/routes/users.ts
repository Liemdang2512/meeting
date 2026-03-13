import { Router } from 'express';
import sql from '../db';
import { requireAuth } from '../auth';

const router = Router();
router.use(requireAuth);

// GET /api/user-settings
router.get('/', async (req, res) => {
  try {
    const [row] = await sql`
      SELECT gemini_api_key FROM public.user_settings WHERE user_id = ${req.user!.userId}
    `;
    res.json({ gemini_api_key: row?.gemini_api_key ?? null });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/user-settings
// Body: { gemini_api_key: string }
router.put('/', async (req, res) => {
  const { gemini_api_key } = req.body ?? {};
  try {
    await sql`
      INSERT INTO public.user_settings (user_id, gemini_api_key, updated_at)
      VALUES (${req.user!.userId}, ${gemini_api_key}, now())
      ON CONFLICT (user_id) DO UPDATE SET gemini_api_key = EXCLUDED.gemini_api_key, updated_at = now()
    `;
    res.json({ ok: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
