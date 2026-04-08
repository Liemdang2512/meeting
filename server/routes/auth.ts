import { createHash, randomBytes } from 'node:crypto';
import { Router } from 'express';
import bcrypt from 'bcryptjs';
import rateLimit from 'express-rate-limit';
import jwt from 'jsonwebtoken';
import { OAuth2Client } from 'google-auth-library';
import { z } from 'zod';
import sql from '../db';
import {
  signToken,
  signRefreshToken,
  verifyRefreshToken,
  requireAuth,
  FREE_FEATURES,
  Feature,
  COOKIE_OPTIONS,
} from '../auth';
import { ensureFreeMonthlyAllowance, ensureFreeMonthlyAllowanceInTx } from '../billing/freeMonthlyAllowance';
import { sendVerificationEmail } from '../lib/sendVerificationEmail';

const router = Router();

function getJwtSecret(): string {
  const s = process.env.API_JWT_SECRET;
  if (!s) throw new Error('API_JWT_SECRET is required');
  return s;
}

/** Public origin of the Express API — used for verification and OAuth redirect URIs only. */
function getApiPublicBase(): string {
  return (process.env.API_PUBLIC_URL ?? `http://localhost:${process.env.PORT ?? '3001'}`).replace(/\/$/, '');
}

function getGoogleRedirectUri(): string {
  return `${getApiPublicBase()}/api/auth/google/callback`;
}

function getAppUrl(): string {
  return (process.env.APP_URL ?? 'http://localhost:3000').replace(/\/$/, '');
}

function hashVerificationToken(raw: string): string {
  return createHash('sha256').update(raw, 'utf8').digest('hex');
}

const OAUTH_STATE_COOKIE = 'oauth_state';
const oauthStateCookieOptions = {
  ...COOKIE_OPTIONS,
  sameSite: 'lax' as const,
  maxAge: 10 * 60 * 1000,
};

function clearOauthStateCookie(res: import('express').Response): void {
  const { maxAge: _maxAge, ...opts } = oauthStateCookieOptions;
  void _maxAge;
  res.clearCookie(OAUTH_STATE_COOKIE, opts);
}

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  message: { error: 'Quá nhiều lần đăng nhập thất bại. Vui lòng thử lại sau 15 phút.' },
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  skipSuccessfulRequests: true,
});

// POST /api/auth/login
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
        u.email_verified_at,
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
    if (user.email_verified_at == null) {
      return res.status(403).json({ error: 'Vui lòng xác nhận email trước khi đăng nhập.' });
    }
    await ensureFreeMonthlyAllowance(user.id);
    const role = user.role ?? 'free';
    const plans: string[] = user.workflow_groups ?? [];
    const features: Feature[] = user.features?.length ? user.features : FREE_FEATURES;
    const token = signToken({ userId: user.id, email: user.email, role, plans, features });
    const refreshToken = signRefreshToken(user.id);
    res.cookie('session', token, { ...COOKIE_OPTIONS, maxAge: 60 * 60 * 1000 });
    res.cookie('refresh_token', refreshToken, { ...COOKIE_OPTIONS, maxAge: 7 * 24 * 60 * 60 * 1000 });
    return res.json({ token, user: { id: user.id, email: user.email, role, plans, features } });
  } catch (err: unknown) {
    console.error('[auth/login]', err);
    return res.status(500).json({ error: 'Đã xảy ra lỗi. Vui lòng thử lại sau.' });
  }
});

const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 5,
  message: { error: 'Quá nhiều yêu cầu đăng ký. Vui lòng thử lại sau 1 giờ.' },
  standardHeaders: 'draft-7',
  legacyHeaders: false,
});

export const RegisterSchema = z
  .object({
    email: z.string().email('Email không hợp lệ'),
    password: z.string().min(8, 'Mật khẩu phải có ít nhất 8 ký tự'),
    confirmPassword: z.string(),
  })
  .refine(d => d.password === d.confirmPassword, {
    message: 'Mật khẩu xác nhận không khớp',
    path: ['confirmPassword'],
  });

// GET /api/auth/verify-email?token=...
router.get('/verify-email', async (req, res) => {
  const raw = typeof req.query.token === 'string' ? req.query.token : '';
  const appBase = getAppUrl();
  if (!raw) {
    return res.redirect(302, `${appBase}/login?verified=0`);
  }
  try {
    const tokenHash = hashVerificationToken(raw);
    const [row] = await sql`
      SELECT id, user_id
      FROM auth.email_verification_tokens
      WHERE token_hash = ${tokenHash}
        AND expires_at > NOW()
        AND used_at IS NULL
      LIMIT 1
    `;
    if (!row) {
      return res.redirect(302, `${appBase}/login?verified=0`);
    }
    await sql.begin(async (tx: any) => {
      await tx`
        UPDATE auth.users
        SET email_verified_at = NOW()
        WHERE id = ${row.user_id}
      `;
      await tx`
        UPDATE auth.email_verification_tokens
        SET used_at = NOW()
        WHERE id = ${row.id}
      `;
    });
    await ensureFreeMonthlyAllowance(row.user_id);
    return res.redirect(302, `${appBase}/login?verified=1`);
  } catch (err: unknown) {
    console.error('[auth/verify-email]', err);
    return res.redirect(302, `${appBase}/login?verified=0`);
  }
});

// POST /api/auth/register
router.post('/register', registerLimiter, async (req, res) => {
  const parsed = RegisterSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.issues[0].message });
  }
  const { email, password } = parsed.data;
  try {
    const [existingUser] = await sql`
      SELECT id, password_hash, email_verified_at, google_sub
      FROM auth.users
      WHERE email = ${email}
    `;

    if (existingUser) {
      if (existingUser.email_verified_at != null) {
        return res.status(409).json({ error: 'Email đã được sử dụng' });
      }
      if (!existingUser.password_hash) {
        return res.status(409).json({ error: 'Email đã được sử dụng' });
      }
      const passwordOk = await bcrypt.compare(password, existingUser.password_hash);
      if (!passwordOk) {
        return res.status(409).json({ error: 'Email đã được sử dụng' });
      }

      const rawTokenResend = randomBytes(32).toString('hex');
      const tokenHashResend = hashVerificationToken(rawTokenResend);
      await sql.begin(async (tx: any) => {
        await tx`
          DELETE FROM auth.email_verification_tokens
          WHERE user_id = ${existingUser.id} AND used_at IS NULL
        `;
        await tx`
          INSERT INTO auth.email_verification_tokens (user_id, token_hash, expires_at)
          VALUES (${existingUser.id}, ${tokenHashResend}, NOW() + INTERVAL '24 hours')
        `;
      });
      const apiPublicResend = getApiPublicBase();
      const verifyUrlResend = `${apiPublicResend}/api/auth/verify-email?token=${encodeURIComponent(rawTokenResend)}`;
      await sendVerificationEmail({ to: email, verifyUrl: verifyUrlResend });
      return res.status(201).json({
        ok: true,
        message:
          'Tài khoản chưa xác nhận. Đã gửi lại email xác nhận — vui lòng kiểm tra hộp thư.',
      });
    }

    const rawToken = randomBytes(32).toString('hex');
    const tokenHash = hashVerificationToken(rawToken);

    await sql.begin(async (tx: any) => {
      const [dup] = await tx`SELECT id FROM auth.users WHERE email = ${email}`;
      if (dup) {
        const err: Error & { statusCode?: number } = new Error('Email đã được sử dụng');
        err.statusCode = 409;
        throw err;
      }
      const password_hash = await bcrypt.hash(password, 12);
      const [u] = await tx`
        INSERT INTO auth.users (email, password_hash, email_verified_at, created_at)
        VALUES (${email}, ${password_hash}, NULL, NOW())
        RETURNING id, email
      `;
      await tx`
        INSERT INTO public.profiles (user_id, role, workflow_groups, features, created_at, updated_at)
        VALUES (${u.id}, 'free', ARRAY[]::text[], ${sql.array(FREE_FEATURES)}, NOW(), NOW())
      `;
      await tx`
        DELETE FROM auth.email_verification_tokens
        WHERE user_id = ${u.id} AND used_at IS NULL
      `;
      await tx`
        INSERT INTO auth.email_verification_tokens (user_id, token_hash, expires_at)
        VALUES (${u.id}, ${tokenHash}, NOW() + INTERVAL '24 hours')
      `;
      return u;
    });

    const apiPublicBase = getApiPublicBase();
    const verifyUrl = `${apiPublicBase}/api/auth/verify-email?token=${encodeURIComponent(rawToken)}`;
    await sendVerificationEmail({ to: email, verifyUrl });

    return res.status(201).json({
      ok: true,
      message: 'Đã gửi email xác nhận. Vui lòng kiểm tra hộp thư.',
    });
  } catch (err: unknown) {
    const e = err as { statusCode?: number; message?: string };
    if (e.statusCode === 409) {
      return res.status(409).json({ error: e.message });
    }
    console.error('[auth/register]', err);
    return res.status(500).json({ error: 'Đã xảy ra lỗi. Vui lòng thử lại sau.' });
  }
});

// POST /api/auth/logout
router.post('/logout', (_req, res) => {
  res.clearCookie('session', COOKIE_OPTIONS);
  res.clearCookie('refresh_token', COOKIE_OPTIONS);
  clearOauthStateCookie(res);
  res.json({ ok: true });
});

// POST /api/auth/refresh
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
        u.email_verified_at,
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
    if (user.email_verified_at == null) {
      res.clearCookie('session', COOKIE_OPTIONS);
      res.clearCookie('refresh_token', COOKIE_OPTIONS);
      return res.status(401).json({ error: 'Email chưa được xác nhận' });
    }
    await ensureFreeMonthlyAllowance(user.id);
    const role = user.role ?? 'free';
    const plans: string[] = user.workflow_groups ?? [];
    const features: Feature[] = user.features?.length ? user.features : FREE_FEATURES;
    const token = signToken({ userId: user.id, email: user.email, role, plans, features });
    res.cookie('session', token, { ...COOKIE_OPTIONS, maxAge: 60 * 60 * 1000 });
    return res.json({ token, user: { id: user.id, email: user.email, role, plans, features } });
  } catch (err: unknown) {
    console.error('[auth/refresh]', err);
    return res.status(500).json({ error: 'Đã xảy ra lỗi. Vui lòng thử lại sau.' });
  }
});

// GET /api/auth/google — start OAuth (browser redirect)
router.get('/google', (_req, res) => {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  if (!clientId?.trim() || !clientSecret?.trim()) {
    return res.status(503).json({ error: 'Đăng nhập Google chưa được cấu hình' });
  }
  const secret = getJwtSecret();
  const state = jwt.sign(
    { purpose: 'google-oauth', rnd: randomBytes(16).toString('hex') },
    secret,
    { expiresIn: '10m' },
  );
  const redirectUri = getGoogleRedirectUri();
  res.cookie(OAUTH_STATE_COOKIE, state, oauthStateCookieOptions);
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: 'openid email profile',
    state,
    prompt: 'select_account',
  });
  const url = `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
  return res.redirect(302, url);
});

// GET /api/auth/google/callback
router.get('/google/callback', async (req, res) => {
  const appBase = getAppUrl();
  const failRedirect = (path: string) => res.redirect(302, `${appBase}${path}`);

  const code = typeof req.query.code === 'string' ? req.query.code : '';
  const stateQ = typeof req.query.state === 'string' ? req.query.state : '';
  const stateCookie = req.cookies?.[OAUTH_STATE_COOKIE];
  clearOauthStateCookie(res);

  if (!code || !stateQ || !stateCookie || stateQ !== stateCookie) {
    return failRedirect('/login?oauth_error=state');
  }
  try {
    const decoded = jwt.verify(stateQ, getJwtSecret()) as { purpose?: string };
    if (decoded.purpose !== 'google-oauth') {
      return failRedirect('/login?oauth_error=state');
    }
  } catch {
    return failRedirect('/login?oauth_error=state');
  }

  const clientId = process.env.GOOGLE_CLIENT_ID!;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET!;
  const redirectUri = getGoogleRedirectUri();
  const client = new OAuth2Client(clientId, clientSecret, redirectUri);

  let idToken: string | undefined;
  try {
    const { tokens } = await client.getToken(code);
    idToken = tokens.id_token ?? undefined;
  } catch (e) {
    console.error('[auth/google/callback] getToken', e);
    return res.status(400).json({ error: 'OAuth token exchange failed' });
  }
  if (!idToken) {
    return res.status(400).json({ error: 'Missing id_token' });
  }

  let payload: { sub?: string; email?: string; email_verified?: boolean } | undefined;
  try {
    const ticket = await client.verifyIdToken({ idToken, audience: clientId });
    payload = ticket.getPayload() ?? undefined;
  } catch (e) {
    console.error('[auth/google/callback] verifyIdToken', e);
    return res.status(400).json({ error: 'Invalid Google token' });
  }

  if (!payload?.sub || !payload.email) {
    return res.status(400).json({ error: 'Invalid Google profile' });
  }
  if (payload.email_verified !== true) {
    return res.status(403).json({ error: 'Email Google chưa được xác minh' });
  }

  const sub = payload.sub;
  const email = payload.email;

  try {
    const session = await sql.begin(async (tx: any) => {
      const [byGoogle] = await tx`
        SELECT u.id, u.email, u.password_hash, u.google_sub, u.email_verified_at,
               p.role, p.workflow_groups, p.features
        FROM auth.users u
        LEFT JOIN public.profiles p ON p.user_id = u.id
        WHERE u.google_sub = ${sub}
        LIMIT 1
      `;
      if (byGoogle) {
        if (byGoogle.email_verified_at == null) {
          await tx`UPDATE auth.users SET email_verified_at = NOW() WHERE id = ${byGoogle.id}`;
        }
        return byGoogle;
      }

      const [byEmail] = await tx`
        SELECT u.id, u.email, u.password_hash, u.google_sub, u.email_verified_at,
               p.role, p.workflow_groups, p.features
        FROM auth.users u
        LEFT JOIN public.profiles p ON p.user_id = u.id
        WHERE u.email = ${email}
        LIMIT 1
      `;

      if (!byEmail) {
        const [u] = await tx`
          INSERT INTO auth.users (email, password_hash, email_verified_at, google_sub, created_at)
          VALUES (${email}, NULL, NOW(), ${sub}, NOW())
          RETURNING id, email
        `;
        await tx`
          INSERT INTO public.profiles (user_id, role, workflow_groups, features, created_at, updated_at)
          VALUES (${u.id}, 'free', ARRAY[]::text[], ${sql.array(FREE_FEATURES)}, NOW(), NOW())
        `;
        await ensureFreeMonthlyAllowanceInTx(tx, u.id);
        const [row] = await tx`
          SELECT u.id, u.email, u.password_hash, u.google_sub, u.email_verified_at,
                 p.role, p.workflow_groups, p.features
          FROM auth.users u
          LEFT JOIN public.profiles p ON p.user_id = u.id
          WHERE u.id = ${u.id}
          LIMIT 1
        `;
        return row;
      }

      if (byEmail.google_sub && byEmail.google_sub !== sub) {
        const err: Error & { statusCode?: number; oauthMessage?: string } = new Error('email_google_mismatch');
        err.statusCode = 409;
        err.oauthMessage = 'Email đã gắn với tài khoản khác';
        throw err;
      }

      if (!byEmail.password_hash && !byEmail.google_sub) {
        await tx`
          UPDATE auth.users
          SET google_sub = ${sub},
              email_verified_at = COALESCE(email_verified_at, NOW())
          WHERE id = ${byEmail.id}
        `;
        const [row] = await tx`
          SELECT u.id, u.email, u.password_hash, u.google_sub, u.email_verified_at,
                 p.role, p.workflow_groups, p.features
          FROM auth.users u
          LEFT JOIN public.profiles p ON p.user_id = u.id
          WHERE u.id = ${byEmail.id}
          LIMIT 1
        `;
        return row;
      }

      if (byEmail.password_hash && !byEmail.google_sub) {
        const err: Error & { statusCode?: number; oauthMessage?: string } = new Error('password_account');
        err.statusCode = 409;
        err.oauthMessage =
          'Tài khoản này đã đăng ký bằng email và mật khẩu. Vui lòng đăng nhập bằng mật khẩu.';
        throw err;
      }

      return byEmail;
    });

    await ensureFreeMonthlyAllowance(session.id);
    const role = session.role ?? 'free';
    const plans: string[] = session.workflow_groups ?? [];
    const features: Feature[] = session.features?.length ? session.features : FREE_FEATURES;
    const token = signToken({ userId: session.id, email: session.email, role, plans, features });
    const refreshToken = signRefreshToken(session.id);
    res.cookie('session', token, { ...COOKIE_OPTIONS, maxAge: 60 * 60 * 1000 });
    res.cookie('refresh_token', refreshToken, { ...COOKIE_OPTIONS, maxAge: 7 * 24 * 60 * 60 * 1000 });
    return res.redirect(302, `${appBase}/meeting`);
  } catch (err: unknown) {
    const e = err as { statusCode?: number; oauthMessage?: string };
    if (e.statusCode === 409 && e.oauthMessage) {
      return res.status(409).json({ error: e.oauthMessage });
    }
    console.error('[auth/google/callback]', err);
    return res.status(500).json({ error: 'Đã xảy ra lỗi. Vui lòng thử lại sau.' });
  }
});

// GET /api/auth/me
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
  } catch (err: unknown) {
    console.error('[auth/me]', err);
    res.status(500).json({ error: 'Đã xảy ra lỗi. Vui lòng thử lại sau.' });
  }
});

export default router;
