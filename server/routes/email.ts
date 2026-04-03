import { Router } from 'express';
import { Resend } from 'resend';
import { requireAuth, requireFeature } from '../auth';
import { markdownToHtml } from '../../lib/markdownUtils';
import { generateMinutesPdfBuffer } from '../lib/pdfGenerator';
import { buildEmailHtml } from '../lib/emailTemplate';

const router = Router();

router.post('/send-minutes', requireAuth, requireFeature('email'), async (req, res) => {
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

    // Resend API key (required)
    const resendApiKey = process.env.RESEND_API_KEY;
    if (!resendApiKey) {
      return res.status(503).json({ error: 'Email chưa được cấu hình. Kiểm tra RESEND_API_KEY trong env.' });
    }

    // From address — must be a verified domain in Resend dashboard
    // Default: onboarding@resend.dev (works for testing, sending to owner only)
    // Production: set RESEND_FROM env var to a verified address e.g. "Meeting Scribe <no-reply@yourdomain.com>"
    const fromEmail = process.env.RESEND_FROM ?? 'Meeting Scribe <onboarding@resend.dev>';

    const resend = new Resend(resendApiKey);

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

    const attachments: Array<{ filename: string; content: Buffer; contentType?: string }> = [
      { filename: 'bien-ban-cuoc-hop.pdf', content: pdfBuffer, contentType: 'application/pdf' },
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

    const { data, error } = await resend.emails.send({
      from: fromEmail,
      to: recipients,
      subject,
      html: htmlBody,
      attachments: attachments.map(a => ({
        filename: a.filename,
        content: a.content,
        content_type: a.contentType,
      })),
    });

    if (error) {
      console.error('[email/send] Resend API error:', error);
      return res.status(500).json({ error: 'Lỗi gửi email. Vui lòng thử lại sau.' });
    }

    return res.json({ ok: true, id: data?.id });
  } catch (err: any) {
    console.error('[email/send]', err);
    return res.status(500).json({ error: 'Lỗi gửi email. Vui lòng thử lại sau.' });
  }
});

export default router;
