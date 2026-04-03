import { Router } from 'express';
import bcrypt from 'bcryptjs';
import rateLimit from 'express-rate-limit';
import { z } from 'zod';
import sql from '../db';
import { signToken, signRefreshToken, verifyRefreshToken, requireAuth, FREE_FEATURES, ALL_FEATURES, Feature, COOKIE_OPTIONS } from '../auth';

const router = Router();

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  message: { error: 'Quá nhiều lần đăng nhập thất bại. Vui lòng thử lại sau 15 phút.' },
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  skipSuccessfulRequests: true,
});

// POST /api/auth/login
// Body: { email: string, password: string }
router.post('/login', loginLimiter, async (req, res) => {
  const { email, password } = req.body ?? {};
  if (!email || !password) {
    return res.status(400).json({ error: 'Email và mật khẩu là bắt buộc' });
  }
  try {
    const [user] = await sql`
      SELECT
        u.id,
        u.email,
        u.password_hash,
        p.role,
        p.workflow_groups,
        p.features
      FROM auth.users u
      LEFT JOIN public.profiles p ON p.user_id = u.id
      WHERE u.email = ${email}
    `;
    if (!user || !user.password_hash) {
      return res.status(401).json({ error: 'Email hoặc mật khẩu không đúng' });
    }
    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
      return res.status(401).json({ error: 'Email hoặc mật khẩu không đúng' });
    }
    const role = user.role ?? 'free';
    const plans: string[] = user.workflow_groups ?? [];
    const features: Feature[] = user.features?.length ? user.features : FREE_FEATURES;
    const token = signToken({ userId: user.id, email: user.email, role, plans, features });
    const refreshToken = signRefreshToken(user.id);
    res.cookie('session', token, { ...COOKIE_OPTIONS, maxAge: 60 * 60 * 1000 });
    res.cookie('refresh_token', refreshToken, { ...COOKIE_OPTIONS, maxAge: 7 * 24 * 60 * 60 * 1000 });
    return res.json({ token, user: { id: user.id, email: user.email, role, plans, features } });
  } catch (err: any) {
    console.error('[auth/login]', err);
    return res.status(500).json({ error: 'Đã xảy ra lỗi. Vui lòng thử lại sau.' });
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
        INSERT INTO public.profiles (user_id, role, workflow_groups, features, created_at, updated_at)
        VALUES (${u.id}, 'free', ARRAY[]::text[], ${sql.array(FREE_FEATURES)}, NOW(), NOW())
      `;
      return u;
    });
    const token = signToken({ userId: newUser.id, email: newUser.email, role: 'free', plans: [], features: FREE_FEATURES });
    const refreshToken = signRefreshToken(newUser.id);
    res.cookie('session', token, { ...COOKIE_OPTIONS, maxAge: 60 * 60 * 1000 });
    res.cookie('refresh_token', refreshToken, { ...COOKIE_OPTIONS, maxAge: 7 * 24 * 60 * 60 * 1000 });
    return res.status(201).json({ token, user: { id: newUser.id, email: newUser.email, role: 'free', plans: [], features: FREE_FEATURES } });
  } catch (err: any) {
    if (err.statusCode === 409) {
      return res.status(409).json({ error: err.message });
    }
    console.error('[auth/register]', err);
    return res.status(500).json({ error: 'Đã xảy ra lỗi. Vui lòng thử lại sau.' });
  }
});

// POST /api/auth/logout — clear cookies + client discards token
router.post('/logout', (_req, res) => {
  res.clearCookie('session', COOKIE_OPTIONS);
  res.clearCookie('refresh_token', COOKIE_OPTIONS);
  res.json({ ok: true });
});

// POST /api/auth/refresh — issue new access token from valid refresh token
router.post('/refresh', async (req, res) => {
  const refreshToken = req.cookies?.refresh_token;
  if (!refreshToken) {
    return res.status(401).json({ error: 'No refresh token' });
  }
  const payload = verifyRefreshToken(refreshToken);
  if (!payload) {
    res.clearCookie('session', COOKIE_OPTIONS);
    res.clearCookie('refresh_token', COOKIE_OPTIONS);
    return res.status(401).json({ error: 'Invalid refresh token' });
  }
  try {
    const [user] = await sql`
      SELECT
        u.id,
        u.email,
        p.role,
        p.workflow_groups,
        p.features
      FROM auth.users u
      LEFT JOIN public.profiles p ON p.user_id = u.id
      WHERE u.id = ${payload.userId}
    `;
    if (!user) {
      return res.status(401).json({ error: 'User not found' });
    }
    const role = user.role ?? 'free';
    const plans: string[] = user.workflow_groups ?? [];
    const features: Feature[] = user.features?.length ? user.features : FREE_FEATURES;
    const token = signToken({ userId: user.id, email: user.email, role, plans, features });
    res.cookie('session', token, { ...COOKIE_OPTIONS, maxAge: 60 * 60 * 1000 });
    return res.json({ token, user: { id: user.id, email: user.email, role, plans, features } });
  } catch (err: any) {
    console.error('[auth/refresh]', err);
    return res.status(500).json({ error: 'Đã xảy ra lỗi. Vui lòng thử lại sau.' });
  }
});

// GET /api/auth/me — return fresh user info from DB
router.get('/me', requireAuth, async (req, res) => {
  try {
    const [profile] = await sql`
      SELECT role, workflow_groups, features
      FROM public.profiles
      WHERE user_id = ${req.user!.userId}
    `;

    const role = profile?.role ?? req.user!.role ?? 'free';
    const plans: string[] = profile?.workflow_groups ?? req.user!.plans ?? [];
    const features: Feature[] = profile?.features?.length ? profile.features : (req.user!.features ?? FREE_FEATURES);

    const freshUser = {
      userId: req.user!.userId,
      email: req.user!.email,
      role,
      plans,
      features,
    };

    const token = signToken(freshUser);
    res.cookie('session', token, { ...COOKIE_OPTIONS, maxAge: 60 * 60 * 1000 });
    res.json({ user: freshUser, token });
  } catch (err: any) {
    console.error('[auth/me]', err);
    res.status(500).json({ error: 'Đã xảy ra lỗi. Vui lòng thử lại sau.' });
  }
});

export default router;
