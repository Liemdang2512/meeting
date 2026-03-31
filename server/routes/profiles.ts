import { Router } from 'express';
import sql from '../db';
import { requireAuth, signToken } from '../auth';

const router = Router();
router.use(requireAuth);

const VALID_PLANS = ['reporter', 'specialist', 'officer'] as const;

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

// PATCH /api/profiles/plans
// Body: { add?: string[], remove?: string[] }
// User tự quản lý các gói đăng ký
// Returns: { token: string, plans: string[] }
router.patch('/plans', async (req, res) => {
  const { add, remove } = req.body ?? {};
  try {
    const [profile] = await sql`
      SELECT workflow_groups, role FROM public.profiles WHERE user_id = ${req.user!.userId}
    `;
    let plans: string[] = profile?.workflow_groups ?? [];

    if (Array.isArray(add)) {
      for (const p of add) {
        if (VALID_PLANS.includes(p as any) && !plans.includes(p)) {
          plans.push(p);
        }
      }
    }

    if (Array.isArray(remove)) {
      plans = plans.filter((p: string) => !remove.includes(p));
    }

    const plansArray = plans.length > 0 ? sql.array(plans) : sql`ARRAY[]::text[]`;
    await sql`
      UPDATE public.profiles
      SET workflow_groups = ${plansArray}, updated_at = NOW()
      WHERE user_id = ${req.user!.userId}
    `;

    const newToken = signToken({ ...req.user!, plans });
    return res.json({ token: newToken, plans });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

export default router;
