import { randomUUID } from 'node:crypto';
import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import sql from '../db';
import { requireAuth, FREE_FEATURES, ALL_FEATURES } from '../auth';

const VALID_ROLES = ['free', 'admin'] as const;
type SystemRole = typeof VALID_ROLES[number];

const VALID_PLANS = ['reporter', 'specialist', 'officer'] as const;

function featuresForPlans(role: string, plans: string[]): string[] {
  if (role === 'admin' || plans.length > 0) return ALL_FEATURES;
  return FREE_FEATURES;
}

// postgres.js không infer type cho empty array — dùng sql fragment khi rỗng
function plansArraySql(plans: string[]) {
  return plans.length > 0 ? sql.array(plans) : sql`ARRAY[]::text[]`;
}

const router = Router();

// Middleware kiem tra admin
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
        COALESCE(p.workflow_groups, '{}') AS plans,
        COALESCE(wb.balance_credits, 0) AS balance_credits,
        COALESCE(t.tokens_used, 0) AS tokens_used
      FROM auth.users u
      LEFT JOIN public.profiles p ON p.user_id = u.id
      LEFT JOIN public.wallet_balances wb ON wb.user_id = u.id
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
    console.error('[admin/list-users]', err);
    res.status(500).json({ error: 'Lỗi hệ thống' });
  }
});

// POST /api/admin/users — tạo user mới
// Body: { email, password, role?, plans? }
router.post('/users', requireAuth, requireAdmin, async (req, res) => {
  const { email, password, role = 'free', plans = [] } = req.body ?? {};
  if (!email || !password) {
    return res.status(400).json({ error: 'Email và mật khẩu là bắt buộc' });
  }
  if (!VALID_ROLES.includes(role as SystemRole)) {
    return res.status(400).json({ error: 'Role không hợp lệ (free hoặc admin)' });
  }
  if (!Array.isArray(plans) || !plans.every((p: string) => VALID_PLANS.includes(p as any))) {
    return res.status(400).json({ error: 'Plans không hợp lệ' });
  }
  try {
    const [existing] = await sql`SELECT id FROM auth.users WHERE email = ${email}`;
    if (existing) {
      return res.status(409).json({ error: 'Email đã tồn tại' });
    }

    const password_hash = await bcrypt.hash(password, 12);
    const [newUser] = await sql`
      INSERT INTO auth.users (email, password_hash, email_verified_at, created_at)
      VALUES (${email}, ${password_hash}, NOW(), NOW())
      RETURNING id, email, created_at
    `;

    const feats = featuresForPlans(role, plans);
    await sql`
      INSERT INTO public.profiles (user_id, role, workflow_groups, features, created_at, updated_at)
      VALUES (${newUser.id}, ${role}, ${plansArraySql(plans)}, ${sql.array(feats)}, NOW(), NOW())
    `;

    await sql`
      INSERT INTO public.wallet_balances (user_id, balance_credits, created_at, updated_at)
      VALUES (${newUser.id}, 0, NOW(), NOW())
      ON CONFLICT (user_id) DO NOTHING
    `;

    return res.status(201).json({
      user: { id: newUser.id, email: newUser.email, role, plans, created_at: newUser.created_at },
    });
  } catch (err: any) {
    console.error('[admin/create-user]', err);
    return res.status(500).json({ error: 'Lỗi hệ thống' });
  }
});

// PUT /api/admin/users/:id — cập nhật role, plans, password, features, ví
// Body: { role?, plans?, password?, daily_limit?, features?, balance_credits? }
router.put('/users/:id', requireAuth, requireAdmin, async (req, res) => {
  const { id } = req.params;
  const { role, plans, password, daily_limit, features, balance_credits } = req.body ?? {};

  // Không cho xóa role admin của chính mình
  if (req.user?.userId === id && role && role !== 'admin') {
    return res.status(400).json({ error: 'Không thể tự hạ quyền của chính mình' });
  }

  // Validate inputs sớm trước khi chạm DB
  if (role !== undefined && !VALID_ROLES.includes(role as SystemRole)) {
    return res.status(400).json({ error: 'Role không hợp lệ (free hoặc admin)' });
  }
  if (plans !== undefined && (!Array.isArray(plans) || !plans.every((p: string) => VALID_PLANS.includes(p as any)))) {
    return res.status(400).json({ error: 'Plans không hợp lệ (reporter, specialist, officer)' });
  }
  if (daily_limit !== undefined && daily_limit !== null && (!Number.isInteger(daily_limit) || daily_limit < 1)) {
    return res.status(400).json({ error: 'daily_limit phải là số nguyên >= 1 hoặc null' });
  }
  if (features !== undefined && !Array.isArray(features)) {
    return res.status(400).json({ error: 'features phải là mảng' });
  }
  if (balance_credits !== undefined && (!Number.isInteger(balance_credits) || balance_credits < 0)) {
    return res.status(400).json({ error: 'balance_credits phải là số nguyên >= 0' });
  }
  if (password) {
    if (password.length < 8) {
      return res.status(400).json({ error: 'Mật khẩu phải có ít nhất 8 ký tự' });
    }
    if (!/[A-Z]/.test(password)) {
      return res.status(400).json({ error: 'Mật khẩu cần ít nhất 1 chữ hoa' });
    }
    if (!/[0-9]/.test(password)) {
      return res.status(400).json({ error: 'Mật khẩu cần ít nhất 1 chữ số' });
    }
  }

  try {
    // 1 query duy nhất lấy cả user + profile — thay vì nhiều SELECT rải rác
    const [existing] = await sql`
      SELECT
        u.id,
        p.user_id AS profile_exists,
        p.role AS current_role,
        p.workflow_groups AS current_plans,
        p.daily_limit AS current_daily_limit
      FROM auth.users u
      LEFT JOIN public.profiles p ON p.user_id = u.id
      WHERE u.id = ${id}
    `;
    if (!existing) {
      return res.status(404).json({ error: 'User không tồn tại' });
    }

    const hasProfile = !!existing.profile_exists;

    // Tính toán role/plans/features mới từ state hiện tại
    const effectiveRole = role ?? existing.current_role ?? 'free';
    const rawPlans = plans ?? existing.current_plans;
    const effectivePlans = Array.isArray(rawPlans) ? rawPlans : [];
    const needsProfileUpdate = role !== undefined || plans !== undefined || daily_limit !== undefined || features !== undefined;

    if (needsProfileUpdate) {
      // Tính features dựa trên role + plans cuối cùng
      const effectiveFeatures = features ?? featuresForPlans(effectiveRole, effectivePlans);
      const nextDailyLimit =
        daily_limit !== undefined ? daily_limit : (existing.current_daily_limit ?? null);

      if (hasProfile) {
        // UPDATE — giá trị daily_limit lấy từ DB khi body không gửi (tránh fragment sql lồng nhau gây lỗi driver)
        await sql`
          UPDATE public.profiles SET
            role = ${role ?? existing.current_role ?? 'free'},
            workflow_groups = ${plansArraySql(effectivePlans)},
            features = ${sql.array(effectiveFeatures)},
            daily_limit = ${nextDailyLimit},
            updated_at = NOW()
          WHERE user_id = ${id}
        `;
      } else {
        // INSERT — user chưa có profile
        await sql`
          INSERT INTO public.profiles (user_id, role, workflow_groups, features, daily_limit, created_at, updated_at)
          VALUES (
            ${id}, ${effectiveRole}, ${plansArraySql(effectivePlans)},
            ${sql.array(effectiveFeatures)}, ${daily_limit ?? null}, NOW(), NOW()
          )
        `;
      }
    }

    // Đổi password riêng (bảng khác)
    if (password) {
      const password_hash = await bcrypt.hash(password, 12);
      await sql`UPDATE auth.users SET password_hash = ${password_hash} WHERE id = ${id}`;
    }

    if (balance_credits !== undefined) {
      const [wallet] = await sql`
        INSERT INTO public.wallet_balances (user_id, balance_credits, created_at, updated_at)
        VALUES (${id}, 0, NOW(), NOW())
        ON CONFLICT (user_id) DO NOTHING
        RETURNING balance_credits
      `;

      const [currentWallet] = wallet
        ? [wallet]
        : await sql`
            SELECT balance_credits
            FROM public.wallet_balances
            WHERE user_id = ${id}
          `;

      const currentBalance = Number(currentWallet?.balance_credits ?? 0);
      const targetBalance = Math.trunc(Number(balance_credits));
      if (currentBalance !== targetBalance) {
        await sql`
          UPDATE public.wallet_balances
          SET balance_credits = ${targetBalance}, updated_at = NOW()
          WHERE user_id = ${id}
        `;

        const delta = targetBalance - currentBalance;
        const correlationId = `admin-adjust-${id}-${randomUUID()}`;
        await sql`
          INSERT INTO public.wallet_ledger (
            user_id,
            event_type,
            action_type,
            pack_id,
            amount_credits,
            balance_after_credits,
            correlation_id,
            metadata,
            created_at
          ) VALUES (
            ${id},
            'adjustment',
            NULL,
            NULL,
            ${delta},
            ${targetBalance},
            ${correlationId},
            ${JSON.stringify({
              source: 'admin-ui',
              note: 'Manual wallet balance adjustment',
            })}::jsonb,
            NOW()
          )
        `;
      }
    }

    return res.json({ ok: true });
  } catch (err: any) {
    console.error('[admin/update-user]', err);
    return res.status(500).json({ error: 'Lỗi hệ thống' });
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

    await sql.begin(async (tx: any) => {
      // Tắt trigger append-only của wallet_ledger trong transaction này
      // để có thể xóa các bản ghi ledger khi xóa user
      await tx`SET LOCAL session_replication_role = replica`;
      await tx`DELETE FROM public.wallet_ledger WHERE user_id = ${id}`;
      await tx`DELETE FROM public.wallet_balances WHERE user_id = ${id}`;
      await tx`DELETE FROM public.summaries WHERE transcription_id IN (
        SELECT id FROM public.transcriptions WHERE user_id = ${id}
      )`;
      await tx`DELETE FROM public.transcriptions WHERE user_id = ${id}`;
      await tx`DELETE FROM public.token_usage_logs WHERE user_id = ${id}`;
      await tx`DELETE FROM public.daily_conversion_usage WHERE user_id = ${id}`;
      await tx`DELETE FROM public.user_settings WHERE user_id = ${id}`;
      await tx`DELETE FROM public.profiles WHERE user_id = ${id}`;
      await tx`DELETE FROM auth.users WHERE id = ${id}`;
    });

    return res.json({ ok: true });
  } catch (err: any) {
    console.error('[admin/delete-user]', err);
    return res.status(500).json({ error: 'Lỗi hệ thống khi xóa user' });
  }
});

// GET /api/admin/payments
// Returns paginated list of all payment orders with user email.
// Query params: limit (default 50, max 200), offset (default 0), status (optional filter)
router.get('/payments', requireAuth, requireAdmin, async (req, res) => {
  const limit = Math.min(Number(req.query.limit ?? 50), 200);
  const offset = Number(req.query.offset ?? 0);
  const statusFilter = req.query.status as string | undefined;

  try {
    const orders = await sql`
      SELECT
        po.id,
        po.gateway,
        po.amount,
        po.currency,
        po.status,
        po.plan_granted,
        po.gateway_txn_id,
        po.created_at,
        po.updated_at,
        u.email AS user_email
      FROM public.payment_orders po
      JOIN auth.users u ON u.id = po.user_id
      ${statusFilter ? sql`WHERE po.status = ${statusFilter}` : sql``}
      ORDER BY po.created_at DESC
      LIMIT ${limit}
      OFFSET ${offset}
    `;

    const [countResult] = await sql`
      SELECT COUNT(*)::int AS total FROM public.payment_orders
      ${statusFilter ? sql`WHERE status = ${statusFilter}` : sql``}
    `;

    return res.json({
      orders,
      total: countResult.total,
      limit,
      offset,
    });
  } catch (err: any) {
    console.error('[admin/payments]', err);
    return res.status(500).json({ error: 'Đã xảy ra lỗi. Vui lòng thử lại sau.' });
  }
});

// GET /api/admin/settings — read app settings (mask API key)
router.get('/settings', requireAuth, requireAdmin, async (req, res) => {
  try {
    const rows = await sql`SELECT key, value, updated_at FROM public.app_settings ORDER BY key`;
    const masked = rows.map(r => {
      if (
        (r.key === 'gmail_app_password' || r.key === 'resend_api_key') &&
        r.value.length > 4
      ) {
        return { ...r, value: r.value.slice(0, 4) + '...' };
      }
      return r;
    });
    res.json({ settings: masked });
  } catch (err: any) {
    console.error('[admin/get-settings]', err);
    res.status(500).json({ error: 'Lỗi hệ thống' });
  }
});

// PUT /api/admin/settings — upsert a single setting
router.put('/settings', requireAuth, requireAdmin, async (req, res) => {
  const { key, value } = req.body ?? {};
  const ALLOWED_KEYS = [
    'gmail_user',
    'gmail_app_password',
    'email_max_recipients',
    'resend_api_key',
    'resend_from',
  ];
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
    console.error('[admin/put-settings]', err);
    res.status(500).json({ error: 'Lỗi hệ thống' });
  }
});

export default router;
