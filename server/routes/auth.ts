import { Router } from 'express';
import bcrypt from 'bcryptjs';
import sql from '../db';
import { signToken, requireAuth } from '../auth';

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
    // Get role from profiles
    const [profile] = await sql`
      SELECT role FROM public.profiles WHERE user_id = ${user.id}
    `;
    const role = profile?.role ?? 'user';
    const token = signToken({ userId: user.id, email: user.email, role });
    return res.json({ token, user: { id: user.id, email: user.email, role } });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// POST /api/auth/logout — stateless JWT, client just discards token
router.post('/logout', (_req, res) => {
  res.json({ ok: true });
});

// GET /api/auth/me — return user info from JWT
router.get('/me', requireAuth, (req, res) => {
  res.json({ user: req.user });
});

export default router;
