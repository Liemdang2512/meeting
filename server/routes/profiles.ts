import { Router, Request, Response } from 'express';
import sql from '../db';
import { requireAuth, signToken } from '../auth';

const router = Router();
router.use(requireAuth);

const VALID_PLANS = ['reporter', 'specialist', 'officer'] as const;

function requireAdmin(req: Request, res: Response, next: () => void) {
  if (req.user?.role !== 'admin') {
    res.status(403).json({ error: 'Chỉ admin mới có quyền thay đổi gói' });
    return;
  }
  next();
}

// GET /api/profiles/role
router.get('/role', async (req, res) => {
  try {
    const [row] = await sql`
      SELECT role FROM public.profiles WHERE user_id = ${req.user!.userId}
    `;
    res.json({ role: row?.role ?? null });
  } catch (err: any) {
    console.error('[profiles/role]', err);
    res.status(500).json({ error: 'Lỗi hệ thống' });
  }
});

// PATCH /api/profiles/plans — Admin only
// Body: { userId: string, add?: string[], remove?: string[] }
router.patch('/plans', requireAdmin, async (req, res) => {
  const { userId, add, remove } = req.body ?? {};
  if (!userId || typeof userId !== 'string') {
    return res.status(400).json({ error: 'userId là bắt buộc' });
  }
  try {
    const [profile] = await sql`
      SELECT workflow_groups, role FROM public.profiles WHERE user_id = ${userId}
    `;
    if (!profile) {
      return res.status(404).json({ error: 'User không tồn tại' });
    }
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
      WHERE user_id = ${userId}
    `;

    return res.json({ ok: true, plans });
  } catch (err: any) {
    console.error('[profiles/plans]', err);
    return res.status(500).json({ error: 'Lỗi hệ thống' });
  }
});

export default router;
