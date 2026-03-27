import { Router } from 'express';
import bcrypt from 'bcryptjs';
import rateLimit from 'express-rate-limit';
import { z } from 'zod';
import sql from '../db';
import { signToken, requireAuth, FREE_FEATURES, ALL_FEATURES, Feature } from '../auth';

const router = Router();

// POST /api/auth/login
// Body: { email: string, password: string }
router.post('/login', async (req, res) => {
  const { email, password } = req.body ?? {};
  if (!email || !password) {
    return res.status(400).json({ error: 'Email và mật khẩu là bắt buộc' });
  }
  try {
    // Ensure password_hash column exists (idempotent)
    await sql`
      ALTER TABLE auth.users ADD COLUMN IF NOT EXISTS password_hash text
    `;

    const [user] = await sql`
      SELECT id, email, password_hash FROM auth.users WHERE email = ${email}
    `;
    if (!user || !user.password_hash) {
      return res.status(401).json({ error: 'Email hoặc mật khẩu không đúng' });
    }
    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
      return res.status(401).json({ error: 'Email hoặc mật khẩu không đúng' });
    }
    // Get role and workflow groups from profiles
    const [profile] = await sql`
      SELECT role, workflow_groups, active_workflow_group, features FROM public.profiles WHERE user_id = ${user.id}
    `;
    const role = profile?.role ?? 'free';
    const workflowGroups = profile?.workflow_groups ?? [];
    const activeWorkflowGroup = profile?.active_workflow_group ?? '';
    const features: Feature[] = profile?.features?.length ? profile.features : FREE_FEATURES;
    const token = signToken({ userId: user.id, email: user.email, role, workflowGroups, activeWorkflowGroup, features });
    return res.json({ token, user: { id: user.id, email: user.email, role, workflowGroups, activeWorkflowGroup, features } });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  limit: 5,
  message: { error: 'Quá nhiều yêu cầu đăng ký. Vui lòng thử lại sau 1 giờ.' },
  standardHeaders: 'draft-7',
  legacyHeaders: false,
});

export const RegisterSchema = z.object({
  email: z.string().email('Email không hợp lệ'),
  password: z.string().min(8, 'Mật khẩu phải có ít nhất 8 ký tự'),
  confirmPassword: z.string(),
  workflowGroups: z.array(z.enum(['reporter', 'specialist', 'officer'])).min(1, 'Chọn ít nhất 1 nhóm').optional(),
}).refine(d => d.password === d.confirmPassword, {
  message: 'Mật khẩu xác nhận không khớp',
  path: ['confirmPassword'],
});

// POST /api/auth/register
router.post('/register', registerLimiter, async (req, res) => {
  const parsed = RegisterSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.issues[0].message });
  }
  const { email, password } = parsed.data;
  try {
    const newUser = await sql.begin(async (tx: any) => {
      const [existing] = await tx`SELECT id FROM auth.users WHERE email = ${email}`;
      if (existing) {
        const err: any = new Error('Email đã được sử dụng');
        err.statusCode = 409;
        throw err;
      }
      const password_hash = await bcrypt.hash(password, 12);
      const [u] = await tx`
        INSERT INTO auth.users (email, password_hash, created_at)
        VALUES (${email}, ${password_hash}, NOW())
        RETURNING id, email
      `;
      await tx`
        INSERT INTO public.profiles (user_id, role, workflow_groups, active_workflow_group, features, created_at, updated_at)
        VALUES (${u.id}, 'free', ARRAY[]::text[], '', ${sql.array(FREE_FEATURES)}, NOW(), NOW())
      `;
      return u;
    });
    const token = signToken({ userId: newUser.id, email: newUser.email, role: 'free', workflowGroups: [], activeWorkflowGroup: '' as any, features: FREE_FEATURES });
    return res.status(201).json({ token, user: { id: newUser.id, email: newUser.email, role: 'free', workflowGroups: [], activeWorkflowGroup: '', features: FREE_FEATURES } });
  } catch (err: any) {
    if (err.statusCode === 409) {
      return res.status(409).json({ error: err.message });
    }
    return res.status(500).json({ error: err.message });
  }
});

// POST /api/auth/logout — stateless JWT, client just discards token
router.post('/logout', (_req, res) => {
  res.json({ ok: true });
});

// GET /api/auth/me — return fresh user info from DB
router.get('/me', requireAuth, async (req, res) => {
  try {
    const [profile] = await sql`
      SELECT role, workflow_groups, active_workflow_group, features
      FROM public.profiles
      WHERE user_id = ${req.user!.userId}
    `;

    const role = profile?.role ?? req.user!.role ?? 'free';
    const workflowGroups = profile?.workflow_groups ?? req.user!.workflowGroups ?? [];
    const activeWorkflowGroup = profile?.active_workflow_group ?? req.user!.activeWorkflowGroup ?? '';
    const features: Feature[] = profile?.features?.length ? profile.features : (req.user!.features ?? FREE_FEATURES);

    const freshUser = {
      userId: req.user!.userId,
      email: req.user!.email,
      role,
      workflowGroups,
      activeWorkflowGroup,
      features,
    };

    const token = signToken(freshUser);
    res.json({ user: freshUser, token });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
