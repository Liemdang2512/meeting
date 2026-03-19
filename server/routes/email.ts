import { Router } from 'express';
import { Resend } from 'resend';
import { requireAuth } from '../auth';
import sql from '../db';
import { markdownToHtml } from '../../lib/markdownUtils';
import { generateMinutesPdfBuffer } from '../lib/pdfGenerator';
import { buildEmailHtml } from '../lib/emailTemplate';

const router = Router();

router.post('/send-minutes', requireAuth, async (req, res) => {
  try {
    const { recipients, subject, minutesMarkdown, meetingInfo } = req.body;

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

    // Check max recipients from settings (default 20)
    const [maxSetting] = await sql`SELECT value FROM public.app_settings WHERE key = 'email_max_recipients'`;
    const maxRecipients = maxSetting ? parseInt(maxSetting.value, 10) : 20;
    if (recipients.length > maxRecipients) {
      return res.status(400).json({ error: `Toi da ${maxRecipients} nguoi nhan` });
    }

    // Load Resend API key from DB
    const [apiKeySetting] = await sql`SELECT value FROM public.app_settings WHERE key = 'resend_api_key'`;
    if (!apiKeySetting) {
      return res.status(503).json({ error: 'Email chua duoc cau hinh. Admin can them Resend API key.' });
    }

    // Load from email
    const [fromSetting] = await sql`SELECT value FROM public.app_settings WHERE key = 'resend_from_email'`;
    const fromEmail = fromSetting?.value || process.env.RESEND_FROM_EMAIL || 'noreply@example.com';

    // Generate PDF Buffer
    const pdfBuffer = generateMinutesPdfBuffer({
      companyName: meetingInfo?.companyName ?? '',
      companyAddress: meetingInfo?.companyAddress ?? '',
      meetingDatetime: meetingInfo?.meetingDatetime ?? '',
      meetingLocation: meetingInfo?.meetingLocation ?? '',
      participants: meetingInfo?.participants ?? [],
      minutesMarkdown,
    });

    // Build HTML email body
    const minutesHtml = markdownToHtml(minutesMarkdown);
    const htmlBody = buildEmailHtml({
      companyName: meetingInfo?.companyName ?? '',
      companyAddress: meetingInfo?.companyAddress ?? '',
      meetingDatetime: meetingInfo?.meetingDatetime ?? '',
      meetingLocation: meetingInfo?.meetingLocation ?? '',
      participants: meetingInfo?.participants ?? [],
      minutesHtml,
    });

    // Send via Resend
    const resend = new Resend(apiKeySetting.value);
    const { data, error } = await resend.emails.send({
      from: fromEmail,
      to: recipients,
      subject,
      html: htmlBody,
      attachments: [
        {
          filename: 'bien-ban-cuoc-hop.pdf',
          content: pdfBuffer,
        },
      ],
    });

    if (error) {
      return res.status(502).json({ error: error.message });
    }

    return res.json({ ok: true, id: data?.id });
  } catch (err: any) {
    console.error('Email send error:', err);
    return res.status(500).json({ error: err.message || 'Loi gui email' });
  }
});

export default router;
