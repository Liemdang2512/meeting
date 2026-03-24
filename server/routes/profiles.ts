import { Router } from 'express';
import sql from '../db';
import { requireAuth, signToken, WorkflowGroup } from '../auth';

const router = Router();
router.use(requireAuth);

const VALID_GROUPS: WorkflowGroup[] = ['reporter', 'specialist', 'officer'];

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

// PATCH /api/profiles/active-workflow-group
// Body: { group: WorkflowGroup }
// Returns: { token: string } (new JWT with updated activeWorkflowGroup)
router.patch('/active-workflow-group', async (req, res) => {
  const { group } = req.body ?? {};
  if (!group || !VALID_GROUPS.includes(group)) {
    return res.status(400).json({ error: 'Nhóm không hợp lệ' });
  }
  try {
    // Verify user belongs to this group
    const [profile] = await sql`
      SELECT workflow_groups FROM public.profiles WHERE user_id = ${req.user!.userId}
    `;
    if (!profile?.workflow_groups?.includes(group)) {
      return res.status(403).json({ error: 'Bạn không thuộc nhóm này' });
    }
    // Update DB
    await sql`
      UPDATE public.profiles SET active_workflow_group = ${group}, updated_at = NOW()
      WHERE user_id = ${req.user!.userId}
    `;
    // Re-issue JWT with updated active group
    const newToken = signToken({ ...req.user!, activeWorkflowGroup: group });
    return res.json({ token: newToken });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

export default router;
