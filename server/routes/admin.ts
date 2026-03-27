import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import sql from '../db';
import { requireAuth, FREE_FEATURES, ALL_FEATURES } from '../auth';

const VALID_ROLES = ['free', 'reporter', 'specialist', 'officer', 'admin'] as const;
type UnifiedRole = typeof VALID_ROLES[number];

// Khi đổi role → tự động set workflow_groups + features
function groupsForRole(role: UnifiedRole): string[] {
  if (role === 'reporter') return ['reporter'];
  if (role === 'specialist') return ['specialist'];
  if (role === 'officer') return ['officer'];
  if (role === 'admin') return ['reporter', 'specialist', 'officer'];
  return []; // free
}

function featuresForRole(role: UnifiedRole): string[] {
  return role === 'free' ? FREE_FEATURES : ALL_FEATURES;
}

// postgres.js không infer type cho empty array — dùng sql fragment khi rỗng
function groupsArraySql(groups: string[]) {
  return groups.length > 0 ? sql.array(groups) : sql`ARRAY[]::text[]`;
}

const router = Router();

// Middleware kiểm tra admin
function requireAdmin(req: Request, res: Response, next: () => void) {
  if (req.user?.role !== 'admin') {
    res.status(403).json({ error: 'Chỉ admin mới có quyền thực hiện thao tác này' });
    return;
  }
  next();
}

// GET /api/admin/users — danh sách tất cả users
// Query params (optional): from (ISO date), to (ISO date) — filter token usage by date range
// No params → tất cả thời gian
router.get('/users', requireAuth, requireAdmin, async (req, res) => {
  const { from, to } = req.query as Record<string, string | undefined>;

  try {
    const dateFilter = from && to
      ? sql`WHERE created_at >= ${from}::timestamptz AND created_at <= ${to}::timestamptz`
      : sql``;

    const users = await sql`
      SELECT
        u.id,
        u.email,
        u.created_at,
        p.role,
        p.daily_limit,
        COALESCE(p.features, '{}') AS features,
        COALESCE(p.workflow_groups, '{specialist}') AS workflow_groups,
        COALESCE(p.active_workflow_group, 'specialist') AS active_workflow_group,
        COALESCE(t.tokens_used, 0) AS tokens_used
      FROM auth.users u
      LEFT JOIN public.profiles p ON p.user_id = u.id
      LEFT JOIN (
        SELECT user_id, SUM(total_tokens) AS tokens_used
        FROM public.token_usage_logs
        ${dateFilter}
        GROUP BY user_id
      ) t ON t.user_id = u.id
      ORDER BY u.created_at DESC
    `;
    res.json({ users });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/admin/users — tạo user mới
// Body: { email, password, role? }
router.post('/users', requireAuth, requireAdmin, async (req, res) => {
  const { email, password, role = 'free' } = req.body ?? {};
  if (!email || !password) {
    return res.status(400).json({ error: 'Email và mật khẩu là bắt buộc' });
  }
  if (!VALID_ROLES.includes(role as UnifiedRole)) {
    return res.status(400).json({ error: 'Role không hợp lệ (free, reporter, specialist, officer hoặc admin)' });
  }
  try {
    const [existing] = await sql`SELECT id FROM auth.users WHERE email = ${email}`;
    if (existing) {
      return res.status(409).json({ error: 'Email đã tồn tại' });
    }

    const password_hash = await bcrypt.hash(password, 12);
    const [newUser] = await sql`
      INSERT INTO auth.users (email, password_hash, created_at)
      VALUES (${email}, ${password_hash}, NOW())
      RETURNING id, email, created_at
    `;

    const groups = groupsForRole(role as UnifiedRole);
    const feats = featuresForRole(role as UnifiedRole);
    const activeGroup = groups[0] ?? '';
    await sql`
      INSERT INTO public.profiles (user_id, role, workflow_groups, active_workflow_group, features, created_at, updated_at)
      VALUES (${newUser.id}, ${role}, ${groupsArraySql(groups)}, ${activeGroup}, ${sql.array(feats)}, NOW(), NOW())
    `;

    return res.status(201).json({
      user: { id: newUser.id, email: newUser.email, role, created_at: newUser.created_at },
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// PUT /api/admin/users/:id — cập nhật role hoặc password
// Body: { role?, password? }
router.put('/users/:id', requireAuth, requireAdmin, async (req, res) => {
  const { id } = req.params;
  const { role, password, daily_limit, features, workflow_groups } = req.body ?? {};

  // Không cho xóa role admin của chính mình
  if (req.user?.userId === id && role && role !== 'admin') {
    return res.status(400).json({ error: 'Không thể tự hạ quyền của chính mình' });
  }

  try {
    const [user] = await sql`SELECT id FROM auth.users WHERE id = ${id}`;
    if (!user) {
      return res.status(404).json({ error: 'User không tồn tại' });
    }

    if (role) {
      if (!VALID_ROLES.includes(role as UnifiedRole)) {
        return res.status(400).json({ error: 'Role không hợp lệ (free, reporter, specialist, officer hoặc admin)' });
      }
      const groups = groupsForRole(role as UnifiedRole);
      const feats = featuresForRole(role as UnifiedRole);
      const activeGroup = groups[0] ?? '';
      const [existing] = await sql`SELECT user_id FROM public.profiles WHERE user_id = ${id}`;
      if (existing) {
        await sql`
          UPDATE public.profiles
          SET role = ${role}, workflow_groups = ${groupsArraySql(groups)},
              active_workflow_group = ${activeGroup}, features = ${sql.array(feats)},
              updated_at = NOW()
          WHERE user_id = ${id}
        `;
      } else {
        await sql`
          INSERT INTO public.profiles (user_id, role, workflow_groups, active_workflow_group, features, created_at, updated_at)
          VALUES (${id}, ${role}, ${groupsArraySql(groups)}, ${activeGroup}, ${sql.array(feats)}, NOW(), NOW())
        `;
      }
    }

    if (daily_limit !== undefined) {
      if (daily_limit !== null && (!Number.isInteger(daily_limit) || daily_limit < 1)) {
        return res.status(400).json({ error: 'daily_limit phải là số nguyên >= 1 hoặc null' });
      }
      const [existing] = await sql`SELECT user_id FROM public.profiles WHERE user_id = ${id}`;
      if (existing) {
        await sql`UPDATE public.profiles SET daily_limit = ${daily_limit}, updated_at = NOW() WHERE user_id = ${id}`;
      } else {
        await sql`INSERT INTO public.profiles (user_id, daily_limit, created_at, updated_at) VALUES (${id}, ${daily_limit}, NOW(), NOW())`;
      }
    }

    if (workflow_groups !== undefined) {
      if (!Array.isArray(workflow_groups) || workflow_groups.length < 1) {
        return res.status(400).json({ error: 'workflow_groups phải có ít nhất 1 nhóm' });
      }
      const valid = ['reporter', 'specialist', 'officer'];
      if (!workflow_groups.every((g: string) => valid.includes(g))) {
        return res.status(400).json({ error: 'Nhóm không hợp lệ' });
      }
      const [existing] = await sql`SELECT user_id, active_workflow_group FROM public.profiles WHERE user_id = ${id}`;
      if (existing) {
        // Nếu active_workflow_group không còn trong danh sách mới, reset về nhóm đầu tiên
        const newActive = workflow_groups.includes(existing.active_workflow_group)
          ? existing.active_workflow_group
          : workflow_groups[0];
        await sql`UPDATE public.profiles SET workflow_groups = ${sql.array(workflow_groups)}, active_workflow_group = ${newActive}, updated_at = NOW() WHERE user_id = ${id}`;
      }
    }

    if (features !== undefined) {
      if (!Array.isArray(features)) {
        return res.status(400).json({ error: 'features phải là mảng' });
      }
      const [existing] = await sql`SELECT user_id FROM public.profiles WHERE user_id = ${id}`;
      if (existing) {
        await sql`UPDATE public.profiles SET features = ${sql.array(features)}, updated_at = NOW() WHERE user_id = ${id}`;
      }
    }

    if (password) {
      if (password.length < 6) {
        return res.status(400).json({ error: 'Mật khẩu phải có ít nhất 6 ký tự' });
      }
      const password_hash = await bcrypt.hash(password, 12);
      await sql`
        UPDATE auth.users SET password_hash = ${password_hash} WHERE id = ${id}
      `;
    }

    return res.json({ ok: true });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// DELETE /api/admin/users/:id — xóa user
router.delete('/users/:id', requireAuth, requireAdmin, async (req, res) => {
  const { id } = req.params;

  if (req.user?.userId === id) {
    return res.status(400).json({ error: 'Không thể tự xóa tài khoản của mình' });
  }

  try {
    const [user] = await sql`SELECT id FROM auth.users WHERE id = ${id}`;
    if (!user) {
      return res.status(404).json({ error: 'User không tồn tại' });
    }

    // Xóa các bảng liên quan trước
    await sql`DELETE FROM public.profiles WHERE user_id = ${id}`;
    await sql`DELETE FROM public.user_settings WHERE user_id = ${id}`;
    await sql`DELETE FROM auth.users WHERE id = ${id}`;

    return res.json({ ok: true });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// GET /api/admin/settings — read app settings (mask API key)
router.get('/settings', requireAuth, requireAdmin, async (req, res) => {
  try {
    const rows = await sql`SELECT key, value, updated_at FROM public.app_settings ORDER BY key`;
    const masked = rows.map(r =>
      r.key === 'gmail_app_password' && r.value.length > 4
        ? { ...r, value: r.value.slice(0, 4) + '...' }
        : r
    );
    res.json({ settings: masked });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/admin/settings — upsert a single setting
router.put('/settings', requireAuth, requireAdmin, async (req, res) => {
  const { key, value } = req.body ?? {};
  const ALLOWED_KEYS = ['gmail_user', 'gmail_app_password', 'email_max_recipients'];
  if (!key || !ALLOWED_KEYS.includes(key)) {
    return res.status(400).json({ error: 'Setting key khong hop le' });
  }
  if (value === undefined || value === null || value === '') {
    return res.status(400).json({ error: 'Value la bat buoc' });
  }
  try {
    await sql`
      INSERT INTO public.app_settings (key, value, updated_at)
      VALUES (${key}, ${String(value)}, NOW())
      ON CONFLICT (key) DO UPDATE SET value = ${String(value)}, updated_at = NOW()
    `;
    res.json({ ok: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
