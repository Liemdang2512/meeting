import { Router } from 'express';
import sql from '../db';
import { requireAuth } from '../auth';

const router = Router();
router.use(requireAuth);

// GET /api/profiles/role
// Returns the current user's role
router.get('/role', async (req, res) => {
  try {
    const [row] = await sql`
      SELECT role FROM public.profiles WHERE user_id = ${req.user!.userId}
    `;
    res.json({ role: row?.role ?? null });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
