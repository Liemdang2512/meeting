import { createServer } from 'node:http';
import { randomUUID } from 'node:crypto';
import express from 'express';
import cookieParser from 'cookie-parser';
import bcrypt from 'bcryptjs';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import sql from '../../db';

const { getTokenMock, verifyIdTokenMock } = vi.hoisted(() => ({
  getTokenMock: vi.fn(),
  verifyIdTokenMock: vi.fn(),
}));

vi.mock('google-auth-library', () => ({
  OAuth2Client: class MockOAuth2Client {
    getToken(...args: unknown[]) {
      return getTokenMock(...args);
    }
    verifyIdToken(...args: unknown[]) {
      return verifyIdTokenMock(...args);
    }
  },
}));

import authRouter from '../auth';

function getSetCookieLines(res: Response): string[] {
  const h = res.headers.getSetCookie?.();
  if (h?.length) return h;
  const single = res.headers.get('set-cookie');
  return single ? [single] : [];
}

function parseOAuthStateCookie(res: Response): string | null {
  for (const line of getSetCookieLines(res)) {
    const m = line.match(/^oauth_state=([^;]+)/);
    if (m) return m[1];
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

describe('auth Google OAuth (integration)', () => {
  let base = '';
  let closeServer: () => Promise<void> = async () => {};

  beforeAll(async () => {
    process.env.GOOGLE_CLIENT_ID = 'test-google-client-id';
    process.env.GOOGLE_CLIENT_SECRET = 'test-google-secret';
    process.env.APP_URL = 'http://127.0.0.1:1';
    const s = await startTestServer();
    base = s.base;
    process.env.API_PUBLIC_URL = base;
    closeServer = s.close;
  });

  afterAll(async () => {
    await closeServer();
  });

  beforeEach(() => {
    getTokenMock.mockReset();
    verifyIdTokenMock.mockReset();
  });

  it('creates new user with google_sub and verified email', async () => {
    const sub = `sub-${randomUUID()}`;
    const gEmail = `gnew-${randomUUID()}@example.com`;
    getTokenMock.mockResolvedValue({ tokens: { id_token: 'mock.id.token' } });
    verifyIdTokenMock.mockResolvedValue({
      getPayload: () => ({
        sub,
        email: gEmail,
        email_verified: true,
      }),
    });

    const start = await fetch(`${base}/api/auth/google`, { redirect: 'manual' });
    expect(start.status).toBe(302);
    const loc = start.headers.get('location')!;
    expect(loc).toContain('accounts.google.com');
    const state = new URL(loc).searchParams.get('state');
    expect(state).toBeTruthy();
    const cookieVal = parseOAuthStateCookie(start);
    expect(cookieVal).toBe(state);

    const cb = await fetch(
      `${base}/api/auth/google/callback?code=fake-code&state=${encodeURIComponent(state!)}`,
      { redirect: 'manual', headers: { Cookie: `oauth_state=${cookieVal}` } },
    );
    expect(cb.status).toBe(302);
    expect(cb.headers.get('location')).toContain('/meeting');
    expect(getTokenMock).toHaveBeenCalled();
    expect(verifyIdTokenMock).toHaveBeenCalled();

    const [row] = await sql`
      SELECT google_sub, email_verified_at, password_hash FROM auth.users WHERE email = ${gEmail}
    `;
    expect(row?.google_sub).toBe(sub);
    expect(row?.email_verified_at).not.toBeNull();
    expect(row?.password_hash).toBeNull();
  });

  it('links Google to existing email-only row without password', async () => {
    const email = `link-${randomUUID()}@example.com`;
    const userId = randomUUID();
    await sql`
      INSERT INTO auth.users (id, email, password_hash, email_verified_at, google_sub, created_at)
      VALUES (${userId}, ${email}, NULL, NULL, NULL, NOW())
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

    const sub = `sub-link-${randomUUID()}`;
    getTokenMock.mockResolvedValue({ tokens: { id_token: 'mock.id.token' } });
    verifyIdTokenMock.mockResolvedValue({
      getPayload: () => ({ sub, email, email_verified: true }),
    });

    const start = await fetch(`${base}/api/auth/google`, { redirect: 'manual' });
    const loc = start.headers.get('location')!;
    const state = new URL(loc).searchParams.get('state')!;
    const cookieVal = parseOAuthStateCookie(start)!;

    const cb = await fetch(
      `${base}/api/auth/google/callback?code=fake&state=${encodeURIComponent(state)}`,
      { redirect: 'manual', headers: { Cookie: `oauth_state=${cookieVal}` } },
    );
    expect(cb.status).toBe(302);

    const [row] = await sql`
      SELECT google_sub, email_verified_at FROM auth.users WHERE id = ${userId}
    `;
    expect(row.google_sub).toBe(sub);
    expect(row.email_verified_at).not.toBeNull();
  });

  it('returns 409 when email already registered with password', async () => {
    const email = `pwd-${randomUUID()}@example.com`;
    const password_hash = await bcrypt.hash('secretpass1', 12);
    await sql`
      INSERT INTO auth.users (id, email, password_hash, email_verified_at, google_sub, created_at)
      VALUES (${randomUUID()}, ${email}, ${password_hash}, NOW(), NULL, NOW())
    `;

    getTokenMock.mockResolvedValue({ tokens: { id_token: 'mock.id.token' } });
    verifyIdTokenMock.mockResolvedValue({
      getPayload: () => ({
        sub: `sub-pwd-${randomUUID()}`,
        email,
        email_verified: true,
      }),
    });

    const start = await fetch(`${base}/api/auth/google`, { redirect: 'manual' });
    const loc = start.headers.get('location')!;
    const state = new URL(loc).searchParams.get('state')!;
    const cookieVal = parseOAuthStateCookie(start)!;

    const cb = await fetch(
      `${base}/api/auth/google/callback?code=fake&state=${encodeURIComponent(state)}`,
      { headers: { Cookie: `oauth_state=${cookieVal}` } },
    );
    expect(cb.status).toBe(409);
    const body = (await cb.json()) as { error: string };
    expect(body.error).toBe(
      'Tài khoản này đã đăng ký bằng email và mật khẩu. Vui lòng đăng nhập bằng mật khẩu.',
    );
  });

  it('returns 403 when Google email is not verified', async () => {
    getTokenMock.mockResolvedValue({ tokens: { id_token: 'mock.id.token' } });
    verifyIdTokenMock.mockResolvedValue({
      getPayload: () => ({
        sub: `sub-unv-${randomUUID()}`,
        email: `unv-${randomUUID()}@example.com`,
        email_verified: false,
      }),
    });

    const start = await fetch(`${base}/api/auth/google`, { redirect: 'manual' });
    const loc = start.headers.get('location')!;
    const state = new URL(loc).searchParams.get('state')!;
    const cookieVal = parseOAuthStateCookie(start)!;

    const cb = await fetch(
      `${base}/api/auth/google/callback?code=fake&state=${encodeURIComponent(state)}`,
      { headers: { Cookie: `oauth_state=${cookieVal}` } },
    );
    expect(cb.status).toBe(403);
    const body = (await cb.json()) as { error: string };
    expect(body.error).toBe('Email Google chưa được xác minh');
  });
});
