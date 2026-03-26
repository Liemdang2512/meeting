import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Request, Response } from 'express';

vi.mock('../../db', () => ({
  default: vi.fn(),
}));

vi.mock('nodemailer', () => ({
  default: {
    createTransport: vi.fn(),
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

import nodemailer from 'nodemailer';
import sql from '../../db';
import emailRouter from '../email';
import adminRouter from '../admin';
import { generateMinutesPdfBuffer } from '../../lib/pdfGenerator';
import { markdownToHtml } from '../../../lib/markdownUtils';
import { buildEmailHtml } from '../../lib/emailTemplate';

const mockSql = vi.mocked(sql);
const mockCreateTransport = vi.mocked(nodemailer.createTransport);
const mockGenerateMinutesPdfBuffer = vi.mocked(generateMinutesPdfBuffer);
const mockMarkdownToHtml = vi.mocked(markdownToHtml);
const mockBuildEmailHtml = vi.mocked(buildEmailHtml);

function createMockRes(): Response {
  const res: Partial<Response> & { statusCode: number; body?: unknown } = {
    statusCode: 200,
    status(code: number) {
      this.statusCode = code;
      return this as Response;
    },
    json(payload: unknown) {
      this.body = payload;
      return this as Response;
    },
  };
  return res as Response;
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
  });

  it('returns 400 if recipients array is empty', async () => {
    const req = {
      body: { recipients: [], subject: 'Test', minutesMarkdown: 'Noi dung' },
    } as Partial<Request> as Request;
    const res = createMockRes();

    await handler(req, res);

    expect(res.statusCode).toBe(400);
    expect(res.body).toEqual({ error: 'Danh sach nguoi nhan khong hop le' });
  });

  it('returns 400 if subject is missing', async () => {
    const req = {
      body: { recipients: ['a@example.com'], minutesMarkdown: 'Noi dung' },
    } as Partial<Request> as Request;
    const res = createMockRes();

    await handler(req, res);

    expect(res.statusCode).toBe(400);
    expect(res.body).toEqual({ error: 'Tieu de email la bat buoc' });
  });

  it('returns 503 if Resend API key not configured in DB', async () => {
    mockSql
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([]);

    const req = {
      body: { recipients: ['a@example.com'], subject: 'Test', minutesMarkdown: 'Noi dung' },
    } as Partial<Request> as Request;
    const res = createMockRes();

    await handler(req, res);

    expect(res.statusCode).toBe(503);
    expect(res.body).toEqual({ error: 'Email chua duoc cau hinh. Admin can them Gmail credentials.' });
  });

  it('calls Resend SDK with correct payload including PDF attachment', async () => {
    const sendMail = vi.fn().mockResolvedValue({ messageId: 'msg-123' });
    mockCreateTransport.mockReturnValue({ sendMail } as any);
    mockGenerateMinutesPdfBuffer.mockResolvedValue(Buffer.from('pdf-buffer'));
    mockMarkdownToHtml.mockReturnValue('<p>minutes html</p>');
    mockBuildEmailHtml.mockReturnValue('<html>email</html>');
    mockSql
      .mockResolvedValueOnce([{ value: '20' }])
      .mockResolvedValueOnce([{ value: 'sender@gmail.com' }])
      .mockResolvedValueOnce([{ value: 'app-password' }]);

    const mindmapPdfDataUrl = `data:application/pdf;base64,${Buffer.from('mindmap-pdf').toString('base64')}`;
    const req = {
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

    expect(mockCreateTransport).toHaveBeenCalledWith({
      service: 'gmail',
      auth: { user: 'sender@gmail.com', pass: 'app-password' },
    });
    expect(sendMail).toHaveBeenCalledTimes(1);
    expect(sendMail).toHaveBeenCalledWith(
      expect.objectContaining({
        from: '"Meeting Scribe" <sender@gmail.com>',
        to: 'a@example.com, b@example.com',
        subject: 'Bien ban',
        html: '<html>email</html>',
      }),
    );
    const sentPayload = sendMail.mock.calls[0][0];
    expect(sentPayload.attachments).toHaveLength(2);
    expect(sentPayload.attachments[0].filename).toBe('bien-ban-cuoc-hop.pdf');
    expect(sentPayload.attachments[1]).toEqual(
      expect.objectContaining({
        filename: 'so-do-tu-duy.pdf',
        contentType: 'application/pdf',
      }),
    );
    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({ ok: true, id: 'msg-123' });
  });

  it('returns success response with email ID', async () => {
    const sendMail = vi.fn().mockResolvedValue({ messageId: 'email-id-001' });
    mockCreateTransport.mockReturnValue({ sendMail } as any);
    mockGenerateMinutesPdfBuffer.mockResolvedValue(Buffer.from('pdf-buffer'));
    mockMarkdownToHtml.mockReturnValue('<p>minutes html</p>');
    mockBuildEmailHtml.mockReturnValue('<html>email</html>');
    mockSql
      .mockResolvedValueOnce([{ value: '20' }])
      .mockResolvedValueOnce([{ value: 'sender@gmail.com' }])
      .mockResolvedValueOnce([{ value: 'app-password' }]);

    const req = {
      body: {
        recipients: ['a@example.com'],
        subject: 'Minutes',
        minutesMarkdown: 'Noi dung',
      },
    } as Partial<Request> as Request;
    const res = createMockRes();

    await handler(req, res);

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
    ]);

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
    mockSql.mockResolvedValueOnce([]);
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
});
