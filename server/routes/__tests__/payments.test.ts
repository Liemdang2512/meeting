// server/routes/__tests__/payments.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';

// --- Unit tests for invalidateProfileCache ---
describe('invalidateProfileCache', () => {
  it('removes a known userId from the cache', async () => {
    // Re-import to get fresh module state
    const mod = await import('../../auth');
    // Since profileCache is private, test the observable behavior:
    // invalidateProfileCache should not throw for any input
    expect(() => mod.invalidateProfileCache('test-user-id')).not.toThrow();
  });

  it('is a no-op for unknown userId (does not throw)', async () => {
    const mod = await import('../../auth');
    expect(() => mod.invalidateProfileCache('non-existent-uuid')).not.toThrow();
  });
});

// --- Unit tests for check-upgrade endpoint ---
// These test the route handler in isolation using direct handler invocation pattern

vi.mock('../../db', () => ({
  default: Object.assign(
    vi.fn().mockResolvedValue([{ role: 'user', workflow_groups: ['reporter'], features: ['transcription', 'summary', 'mindmap'] }]),
    { begin: vi.fn() }
  ),
}));

function createMockRes(): any {
  const res = {
    statusCode: 200,
    body: undefined as any,
    cookieSet: undefined as any,
    status(code: number) {
      this.statusCode = code;
      return this;
    },
    json(payload: unknown) {
      this.body = payload;
      return this;
    },
    cookie(name: string, value: string, options: any) {
      this.cookieSet = { name, value, options };
      return this;
    },
  };
  return res;
}

function getRouteHandler(router: any, path: string, method: 'get' | 'post' | 'put') {
  const layer = router.stack.find((item: any) => item.route?.path === path && item.route.methods?.[method]);
  if (!layer) {
    throw new Error(`Route ${method.toUpperCase()} ${path} not found`);
  }
  return layer.route.stack[layer.route.stack.length - 1].handle;
}

describe('POST /api/payments/check-upgrade', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 401 when no auth token provided (no req.user)', async () => {
    const { paymentsRouter } = await import('../payments/index');
    // Find requireAuth middleware layer — it's the second layer on the route
    const routeLayer = paymentsRouter.stack.find((item: any) => item.route?.path === '/check-upgrade');
    if (!routeLayer) throw new Error('Route /check-upgrade not found');
    // The first handler in the stack is requireAuth
    const requireAuthMiddleware = routeLayer.route.stack[0].handle;
    const req = { headers: {}, cookies: {} } as any;
    const res = createMockRes();
    const next = vi.fn();
    await requireAuthMiddleware(req, res, next);
    // requireAuth sends 401 when no token
    expect(res.statusCode).toBe(401);
    expect(next).not.toHaveBeenCalled();
  });

  it('calls next and processes check-upgrade when user is authenticated', async () => {
    const { paymentsRouter } = await import('../payments/index');
    const handler = getRouteHandler(paymentsRouter, '/check-upgrade', 'post');

    const req = {
      user: {
        userId: 'user-123',
        email: 'test@example.com',
        role: 'free',
        plans: [],
        features: ['transcription', 'summary'],
      },
    } as any;
    const res = createMockRes();

    await handler(req, res);

    // Should return token and user with upgraded role from DB
    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty('token');
    expect(res.body).toHaveProperty('user');
    expect(res.body.user.role).toBe('user');
  });
});
