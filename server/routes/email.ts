import { Router } from 'express';
import nodemailer from 'nodemailer';
import { requireAuth } from '../auth';
import sql from '../db';
import { markdownToHtml } from '../../lib/markdownUtils';
import { generateMinutesPdfBuffer } from '../lib/pdfGenerator';
import { buildEmailHtml } from '../lib/emailTemplate';

const router = Router();

router.post('/send-minutes', requireAuth, async (req, res) => {
  if (req.user!.role !== 'admin') {
    return res.status(403).json({ error: 'Chi admin moi duoc gui email bien ban' });
  }
  try {
    const { recipients, subject, minutesMarkdown, meetingInfo, mindmapPng } = req.body;

    // Validate input
    if (!Array.isArray(recipients) || recipients.length === 0) {
      return res.status(400).json({ error: 'Danh sach nguoi nhan khong hop le' });
    }
    if (!subject || typeof subject !== 'string') {
      return res.status(400).json({ error: 'Tieu de email la bat buoc' });
    }
    if (!minutesMarkdown || typeof minutesMarkdown !== 'string') {
      return res.status(400).json({ error: 'Noi dung bien ban la bat buoc' });
    }

    // Check max recipients (env var hoặc default 20)
    const maxRecipients = parseInt(process.env.SMTP_MAX_RECIPIENTS ?? '20', 10);
    if (recipients.length > maxRecipients) {
      return res.status(400).json({ error: `Tối đa ${maxRecipients} người nhận` });
    }

    // Đọc SMTP config từ env vars
    const smtpHost = process.env.SMTP_HOST;
    const smtpUser = process.env.SMTP_USER;
    const smtpPassword = process.env.SMTP_PASSWORD;
    const smtpPort = parseInt(process.env.SMTP_PORT ?? '465', 10);
    const smtpSecure = (process.env.SMTP_SECURE ?? 'true') === 'true';

    if (!smtpHost || !smtpUser || !smtpPassword) {
      return res.status(503).json({ error: 'Email chưa được cấu hình. Kiểm tra SMTP_HOST, SMTP_USER, SMTP_PASSWORD trong env.' });
    }

    const fromEmail = smtpUser;

    // Generate PDF Buffer
    const pdfBuffer = await generateMinutesPdfBuffer({
      companyName: meetingInfo?.companyName ?? '',
      companyAddress: meetingInfo?.companyAddress ?? '',
      meetingDatetime: meetingInfo?.meetingDatetime ?? '',
      meetingLocation: meetingInfo?.meetingLocation ?? '',
      participants: meetingInfo?.participants ?? [],
      minutesMarkdown,
    });

    // Build HTML email body
    const minutesHtml = markdownToHtml(minutesMarkdown);
    const hasMindmap = typeof mindmapPng === 'string' && mindmapPng.length > 0;
    const htmlBody = buildEmailHtml({
      companyName: meetingInfo?.companyName ?? '',
      companyAddress: meetingInfo?.companyAddress ?? '',
      meetingDatetime: meetingInfo?.meetingDatetime ?? '',
      meetingLocation: meetingInfo?.meetingLocation ?? '',
      participants: meetingInfo?.participants ?? [],
      minutesHtml,
      hasMindmap,
    });

    // Send via cPanel SMTP
    const transporter = nodemailer.createTransport({
      host: smtpHost,
      port: smtpPort,
      secure: smtpSecure,
      auth: {
        user: smtpUser,
        pass: smtpPassword,
      },
    });

    const attachments: nodemailer.SendMailOptions['attachments'] = [
      { filename: 'bien-ban-cuoc-hop.pdf', content: pdfBuffer },
    ];

    if (hasMindmap) {
      // mindmapPng là data URL của PDF: "data:application/pdf;base64,..."
      const base64Data = (mindmapPng as string).replace(/^data:[^;]+;base64,/, '');
      attachments.push({
        filename: 'so-do-tu-duy.pdf',
        content: Buffer.from(base64Data, 'base64'),
        contentType: 'application/pdf',
      });
    }

    const info = await transporter.sendMail({
      from: `"Meeting Scribe" <${fromEmail}>`,
      to: recipients.join(', '),
      subject,
      html: htmlBody,
      attachments,
    });

    return res.json({ ok: true, id: info.messageId });
  } catch (err: any) {
    console.error('Email send error:', err);
    // AggregateError (e.g. postgres connection refused) has an empty .message —
    // extract the first sub-error message so the response is diagnostic.
    const message =
      err.message ||
      (err instanceof AggregateError && err.errors?.[0]?.message) ||
      'Loi gui email';
    return res.status(500).json({ error: message });
  }
});

export default router;
