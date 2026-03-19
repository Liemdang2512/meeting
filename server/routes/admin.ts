import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import sql from '../db';
import { requireAuth } from '../auth';

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
  const { email, password, role = 'user' } = req.body ?? {};
  if (!email || !password) {
    return res.status(400).json({ error: 'Email và mật khẩu là bắt buộc' });
  }
  if (!['free', 'pro', 'enterprise', 'admin'].includes(role)) {
    return res.status(400).json({ error: 'Role không hợp lệ (free, pro, enterprise hoặc admin)' });
  }
  try {
    // Kiểm tra email đã tồn tại chưa
    const [existing] = await sql`
      SELECT id FROM auth.users WHERE email = ${email}
    `;
    if (existing) {
      return res.status(409).json({ error: 'Email đã tồn tại' });
    }

    const password_hash = await bcrypt.hash(password, 12);

    // Tạo user trong auth.users
    const [newUser] = await sql`
      INSERT INTO auth.users (email, password_hash, created_at)
      VALUES (${email}, ${password_hash}, NOW())
      RETURNING id, email, created_at
    `;

    // Tạo profile với role
    await sql`
      INSERT INTO public.profiles (user_id, role, created_at, updated_at)
      VALUES (${newUser.id}, ${role}, NOW(), NOW())
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
  const { role, password, daily_limit } = req.body ?? {};

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
      if (!['free', 'pro', 'enterprise', 'admin'].includes(role)) {
        return res.status(400).json({ error: 'Role không hợp lệ (free, pro, enterprise hoặc admin)' });
      }
      await sql`
        INSERT INTO public.profiles (user_id, role, created_at, updated_at)
        VALUES (${id}, ${role}, NOW(), NOW())
        ON CONFLICT (user_id) DO UPDATE SET role = ${role}, updated_at = NOW()
      `;
    }

    if (daily_limit !== undefined) {
      if (daily_limit !== null && (!Number.isInteger(daily_limit) || daily_limit < 1)) {
        return res.status(400).json({ error: 'daily_limit phải là số nguyên >= 1 hoặc null' });
      }
      await sql`
        INSERT INTO public.profiles (user_id, daily_limit, created_at, updated_at)
        VALUES (${id}, ${daily_limit}, NOW(), NOW())
        ON CONFLICT (user_id) DO UPDATE SET daily_limit = ${daily_limit}, updated_at = NOW()
      `;
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
      r.key === 'resend_api_key' && r.value.length > 8
        ? { ...r, value: r.value.slice(0, 8) + '...' }
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
  const ALLOWED_KEYS = ['resend_api_key', 'resend_from_email', 'email_max_recipients'];
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
