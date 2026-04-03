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
    console.error('[user-settings/get]', err);
    res.status(500).json({ error: 'Lỗi hệ thống' });
  }
});

// PUT /api/user-settings
// Body: { gemini_api_key: string }
router.put('/', async (req, res) => {
  const { gemini_api_key } = req.body ?? {};
  if (gemini_api_key !== undefined && gemini_api_key !== null && typeof gemini_api_key !== 'string') {
    return res.status(400).json({ error: 'gemini_api_key phải là string' });
  }
  try {
    await sql`
      INSERT INTO public.user_settings (user_id, gemini_api_key, updated_at)
      VALUES (${req.user!.userId}, ${gemini_api_key}, now())
      ON CONFLICT (user_id) DO UPDATE SET gemini_api_key = EXCLUDED.gemini_api_key, updated_at = now()
    `;
    res.json({ ok: true });
  } catch (err: any) {
    console.error('[user-settings/put]', err);
    res.status(500).json({ error: 'Lỗi hệ thống' });
  }
});

export default router;
