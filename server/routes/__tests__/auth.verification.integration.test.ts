import { createServer } from 'node:http';
import { randomUUID } from 'node:crypto';
import express from 'express';
import cookieParser from 'cookie-parser';
import bcrypt from 'bcryptjs';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import sql from '../../db';
import authRouter from '../auth';
import { signRefreshToken } from '../../auth';

const sentVerifyUrls: string[] = [];

vi.mock('../../lib/sendVerificationEmail', () => ({
  sendVerificationEmail: vi.fn(async (opts: { verifyUrl: string }) => {
    sentVerifyUrls.push(opts.verifyUrl);
    return { sent: false };
  }),
}));

function parseOAuthStateCookie(setCookieHeaders: string[]): string | null {
  for (const line of setCookieHeaders) {
    const m = line.match(/^oauth_state=([^;]+)/);
    if (m) return decodeURIComponent(m[1]);
  }
  return null;
}

async function startTestServer(): Promise<{ base: string; close: () => Promise<void> }> {
  const app = express();
  app.use(express.json());
  app.use(cookieParser());
  app.use('/api/auth', authRouter);
  return new Promise((resolve, reject) => {
    const server = createServer(app);
    server.listen(0, '127.0.0.1', () => {
      const addr = server.address();
      if (!addr || typeof addr === 'string') {
        reject(new Error('no listen address'));
        return;
      }
      resolve({
        base: `http://127.0.0.1:${addr.port}`,
        close: () => new Promise<void>((res, rej) => server.close(e => (e ? rej(e) : res()))),
      });
    });
  });
}

describe('auth email verification (integration)', () => {
  let base = '';
  let closeServer: () => Promise<void> = async () => {};

  beforeAll(async () => {
    process.env.APP_URL = 'http://127.0.0.1:1';
    const s = await startTestServer();
    base = s.base;
    process.env.API_PUBLIC_URL = base;
    closeServer = s.close;
  });

  afterAll(async () => {
    await closeServer();
  });

  it('register returns 201 without token; login blocked until verify; verify then login', async () => {
    sentVerifyUrls.length = 0;
    const email = `verify-${randomUUID()}@example.com`;
    const password = 'abcdefgh1';

    const reg = await fetch(`${base}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, confirmPassword: password }),
    });
    expect(reg.status).toBe(201);
    const body = (await reg.json()) as { ok?: boolean; message?: string; token?: string };
    expect(body.ok).toBe(true);
    expect(body.message).toBeDefined();
    expect(body.token).toBeUndefined();

    const [u] = await sql`
      SELECT id, email_verified_at FROM auth.users WHERE email = ${email}
    `;
    expect(u).toBeDefined();
    expect(u.email_verified_at).toBeNull();

    const loginBefore = await fetch(`${base}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    expect(loginBefore.status).toBe(403);
    const loginErr = (await loginBefore.json()) as { error: string };
    expect(loginErr.error).toBe('Vui lòng xác nhận email trước khi đăng nhập.');

    expect(sentVerifyUrls.length).toBe(1);
    const verifyUrl = sentVerifyUrls[0]!;
    const verifyRes = await fetch(verifyUrl, { redirect: 'manual' });
    expect(verifyRes.status).toBe(302);

    const [u2] = await sql`
      SELECT email_verified_at FROM auth.users WHERE email = ${email}
    `;
    expect(u2.email_verified_at).not.toBeNull();

    const loginAfter = await fetch(`${base}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    expect(loginAfter.status).toBe(200);
    const ok = (await loginAfter.json()) as { token: string };
    expect(ok.token).toBeDefined();
  });

  it('register again with same email+password while unverified resends verification (201)', async () => {
    sentVerifyUrls.length = 0;
    const email = `resend-dup-${randomUUID()}@example.com`;
    const password = 'resenddup1';

    const reg1 = await fetch(`${base}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, confirmPassword: password }),
    });
    expect(reg1.status).toBe(201);
    expect(sentVerifyUrls.length).toBe(1);

    const reg2 = await fetch(`${base}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, confirmPassword: password }),
    });
    expect(reg2.status).toBe(201);
    const body2 = (await reg2.json()) as { ok?: boolean; message?: string };
    expect(body2.ok).toBe(true);
    expect(body2.message).toMatch(/gửi lại email xác nhận/i);
    expect(sentVerifyUrls.length).toBe(2);
  });

  it('POST /refresh returns 401 for unverified user', async () => {
    const email = `unver-refresh-${randomUUID()}@example.com`;
    const userId = randomUUID();
    const password_hash = await bcrypt.hash('testpass12', 12);
    await sql`
      INSERT INTO auth.users (id, email, password_hash, email_verified_at, created_at)
      VALUES (${userId}, ${email}, ${password_hash}, NULL, NOW())
    `;
    await sql`
      INSERT INTO public.profiles (user_id, role, workflow_groups, features, created_at, updated_at)
      VALUES (${userId}, 'free', ARRAY[]::text[], ARRAY[]::text[], NOW(), NOW())
    `;
    await sql`
      INSERT INTO public.wallet_balances (user_id, balance_credits, created_at, updated_at)
      VALUES (${userId}, 0, NOW(), NOW())
      ON CONFLICT (user_id) DO NOTHING
    `;

    const refreshToken = signRefreshToken(userId);
    const ref = await fetch(`${base}/api/auth/refresh`, {
      method: 'POST',
      headers: { Cookie: `refresh_token=${refreshToken}` },
    });
    expect(ref.status).toBe(401);
    const j = (await ref.json()) as { error: string };
    expect(j.error).toBe('Email chưa được xác nhận');
  });
});
