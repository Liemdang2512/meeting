import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Request, Response } from 'express';

vi.mock('../../db', () => ({
  default: vi.fn(),
}));

const mockSendEmail = vi.fn();
vi.mock('resend', () => ({
  Resend: class {
    emails = { send: mockSendEmail };
  },
}));

vi.mock('../../lib/pdfGenerator', () => ({
  generateMinutesPdfBuffer: vi.fn(),
}));

vi.mock('../../../lib/markdownUtils', () => ({
  markdownToHtml: vi.fn(),
}));

vi.mock('../../lib/emailTemplate', () => ({
  buildEmailHtml: vi.fn(),
}));

import sql from '../../db';
import emailRouter from '../email';
import adminRouter from '../admin';
import { generateMinutesPdfBuffer } from '../../lib/pdfGenerator';
import { markdownToHtml } from '../../../lib/markdownUtils';
import { buildEmailHtml } from '../../lib/emailTemplate';

const mockSql = vi.mocked(sql);
const mockGenerateMinutesPdfBuffer = vi.mocked(generateMinutesPdfBuffer);
const mockMarkdownToHtml = vi.mocked(markdownToHtml);
const mockBuildEmailHtml = vi.mocked(buildEmailHtml);

function createMockRes(): any {
  const res = {
    statusCode: 200,
    body: undefined as any,
    status(code: number) {
      this.statusCode = code;
      return this;
    },
    json(payload: unknown) {
      this.body = payload;
      return this;
    },
  };
  return res;
}

function createAdminUser() {
  return { userId: '1', email: 'admin@test.com', role: 'admin', plans: ['reporter', 'specialist', 'officer'], features: [] };
}

function getRouteHandler(router: any, path: string, method: 'get' | 'post' | 'put') {
  const layer = router.stack.find((item: any) => item.route?.path === path && item.route.methods?.[method]);
  if (!layer) {
    throw new Error(`Route ${method.toUpperCase()} ${path} not found`);
  }
  return layer.route.stack[layer.route.stack.length - 1].handle;
}

describe('POST /api/email/send-minutes', () => {
  const handler = getRouteHandler(emailRouter, '/send-minutes', 'post');

  beforeEach(() => {
    vi.clearAllMocks();
    mockSql.mockResolvedValue([] as any);
  });

  it('returns 403 for non-admin user', async () => {
    const req = {
      user: { userId: '1', email: 'user@test.com', role: 'free', plans: ['specialist'], features: [] },
      body: { recipients: ['a@b.com'], subject: 'Test', minutesMarkdown: '# Test' },
    } as Partial<Request> as Request;
    const res = createMockRes();
    await handler(req, res);
    expect(res.statusCode).toBe(403);
    expect(res.body).toEqual({ error: 'Chi admin moi duoc gui email bien ban' });
  });

  it('returns 400 if recipients array is empty', async () => {
    const req = {
      user: createAdminUser(),
      body: { recipients: [], subject: 'Test', minutesMarkdown: 'Noi dung' },
    } as Partial<Request> as Request;
    const res = createMockRes();

    await handler(req, res);

    expect(res.statusCode).toBe(400);
    expect(res.body).toEqual({ error: 'Danh sach nguoi nhan khong hop le' });
  });

  it('returns 400 if subject is missing', async () => {
    const req = {
      user: createAdminUser(),
      body: { recipients: ['a@example.com'], minutesMarkdown: 'Noi dung' },
    } as Partial<Request> as Request;
    const res = createMockRes();

    await handler(req, res);

    expect(res.statusCode).toBe(400);
    expect(res.body).toEqual({ error: 'Tieu de email la bat buoc' });
  });

  it('returns 503 if RESEND_API_KEY not configured', async () => {
    const saved = process.env.RESEND_API_KEY;
    delete process.env.RESEND_API_KEY;

    const req = {
      user: createAdminUser(),
      body: { recipients: ['a@example.com'], subject: 'Test', minutesMarkdown: 'Noi dung' },
    } as Partial<Request> as Request;
    const res = createMockRes();

    await handler(req, res);

    process.env.RESEND_API_KEY = saved;

    expect(res.statusCode).toBe(503);
    expect(res.body).toEqual({
      error:
        'Email chưa được cấu hình. Đặt RESEND_API_KEY trong env hoặc lưu API key Resend trong Admin → Cài đặt email (resend_api_key).',
    });
  });

  it('uses Resend key from app_settings when RESEND_API_KEY env is unset', async () => {
    const savedKey = process.env.RESEND_API_KEY;
    delete process.env.RESEND_API_KEY;

    mockSql
      .mockResolvedValueOnce([] as any)
      .mockResolvedValueOnce([
        { key: 'resend_api_key', value: 're_from_settings' },
        { key: 'resend_from', value: 'DB <db@example.com>' },
      ] as any);

    mockSendEmail.mockResolvedValue({ data: { id: 'msg-db' }, error: null });
    mockGenerateMinutesPdfBuffer.mockResolvedValue(Buffer.from('pdf-buffer'));
    mockMarkdownToHtml.mockReturnValue('<p>minutes html</p>');
    mockBuildEmailHtml.mockReturnValue('<html>email</html>');

    const req = {
      user: createAdminUser(),
      body: {
        recipients: ['a@example.com'],
        subject: 'Test',
        minutesMarkdown: 'Noi dung',
      },
    } as Partial<Request> as Request;
    const res = createMockRes();

    await handler(req, res);

    if (savedKey !== undefined) process.env.RESEND_API_KEY = savedKey;
    else delete process.env.RESEND_API_KEY;

    expect(res.statusCode).toBe(200);
    expect(mockSendEmail).toHaveBeenCalledTimes(1);
    expect(mockSendEmail.mock.calls[0][0].from).toBe('DB <db@example.com>');
  });

  it('calls Resend with correct payload including PDF attachment', async () => {
    process.env.RESEND_API_KEY = 're_test_key';

    mockSendEmail.mockResolvedValue({ data: { id: 'msg-123' }, error: null });
    mockGenerateMinutesPdfBuffer.mockResolvedValue(Buffer.from('pdf-buffer'));
    mockMarkdownToHtml.mockReturnValue('<p>minutes html</p>');
    mockBuildEmailHtml.mockReturnValue('<html>email</html>');

    const mindmapPdfDataUrl = `data:application/pdf;base64,${Buffer.from('mindmap-pdf').toString('base64')}`;
    const req = {
      user: createAdminUser(),
      body: {
        recipients: ['a@example.com', 'b@example.com'],
        subject: 'Bien ban',
        minutesMarkdown: '# Minutes',
        meetingInfo: {
          companyName: 'ACME',
          companyAddress: 'HCM',
          meetingDatetime: '2026-03-24',
          meetingLocation: 'Zoom',
          participants: [{ name: 'Nguyen Van A', title: 'CEO' }],
        },
        mindmapPng: mindmapPdfDataUrl,
      },
    } as Partial<Request> as Request;
    const res = createMockRes();

    await handler(req, res);

    delete process.env.RESEND_API_KEY;

    expect(mockSendEmail).toHaveBeenCalledTimes(1);
    const callArg = mockSendEmail.mock.calls[0][0];
    expect(callArg.to).toEqual(['a@example.com', 'b@example.com']);
    expect(callArg.subject).toBe('Bien ban');
    expect(callArg.html).toBe('<html>email</html>');
    expect(callArg.attachments).toHaveLength(2);
    expect(callArg.attachments[0].filename).toBe('bien-ban-cuoc-hop.pdf');
    expect(callArg.attachments[1].filename).toBe('so-do-tu-duy.pdf');
    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({ ok: true, id: 'msg-123' });
  });

  it('returns success response with email ID', async () => {
    process.env.RESEND_API_KEY = 're_test_key';

    mockSendEmail.mockResolvedValue({ data: { id: 'email-id-001' }, error: null });
    mockGenerateMinutesPdfBuffer.mockResolvedValue(Buffer.from('pdf-buffer'));
    mockMarkdownToHtml.mockReturnValue('<p>minutes html</p>');
    mockBuildEmailHtml.mockReturnValue('<html>email</html>');

    const req = {
      user: createAdminUser(),
      body: {
        recipients: ['a@example.com'],
        subject: 'Minutes',
        minutesMarkdown: 'Noi dung',
      },
    } as Partial<Request> as Request;
    const res = createMockRes();

    await handler(req, res);

    delete process.env.RESEND_API_KEY;

    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({ ok: true, id: 'email-id-001' });
  });
});

describe('GET /api/admin/settings', () => {
  const handler = getRouteHandler(adminRouter, '/settings', 'get');

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns settings with masked API key', async () => {
    mockSql.mockResolvedValueOnce([
      { key: 'gmail_user', value: 'sender@gmail.com', updated_at: '2026-03-24' },
      { key: 'gmail_app_password', value: 'abcd1234', updated_at: '2026-03-24' },
    ] as any);

    const req = {} as Request;
    const res = createMockRes();

    await handler(req, res);

    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({
      settings: [
        { key: 'gmail_user', value: 'sender@gmail.com', updated_at: '2026-03-24' },
        { key: 'gmail_app_password', value: 'abcd...', updated_at: '2026-03-24' },
      ],
    });
  });
});

describe('PUT /api/admin/settings', () => {
  const handler = getRouteHandler(adminRouter, '/settings', 'put');

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('rejects unknown setting keys', async () => {
    const req = { body: { key: 'unknown_key', value: '123' } } as Partial<Request> as Request;
    const res = createMockRes();

    await handler(req, res);

    expect(res.statusCode).toBe(400);
    expect(res.body).toEqual({ error: 'Setting key khong hop le' });
    expect(mockSql).not.toHaveBeenCalled();
  });

  it('upserts allowed setting keys', async () => {
    mockSql.mockResolvedValueOnce([] as any);
    const req = { body: { key: 'gmail_user', value: 'new@gmail.com' } } as Partial<Request> as Request;
    const res = createMockRes();

    await handler(req, res);

    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({ ok: true });
    expect(mockSql).toHaveBeenCalledTimes(1);
    const callArgs = mockSql.mock.calls[0];
    expect(callArgs[1]).toBe('gmail_user');
    expect(callArgs[2]).toBe('new@gmail.com');
  });

  it('accepts resend_api_key and resend_from', async () => {
    mockSql.mockResolvedValueOnce([] as any);
    const req = { body: { key: 'resend_api_key', value: 're_secret' } } as Partial<Request> as Request;
    const res = createMockRes();

    await handler(req, res);

    expect(res.statusCode).toBe(200);
    expect(mockSql.mock.calls[0][1]).toBe('resend_api_key');
    expect(mockSql.mock.calls[0][2]).toBe('re_secret');
  });
});
