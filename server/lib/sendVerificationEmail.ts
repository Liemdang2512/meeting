import { Resend } from 'resend';
import { getResendConfig } from './getResendConfig';

export async function sendVerificationEmail({
  to,
  verifyUrl,
}: {
  to: string;
  verifyUrl: string;
}): Promise<{ sent: boolean }> {
  const { apiKey, from } = await getResendConfig();
  if (!apiKey) {
    console.warn(
      '[sendVerificationEmail] No Resend key (RESEND_API_KEY env or app_settings.resend_api_key); skipping send',
    );
    return { sent: false };
  }
  const resend = new Resend(apiKey);

  const html = `
    <p>Xin chào,</p>
    <p>Vui lòng xác nhận địa chỉ email bằng cách nhấp vào liên kết sau:</p>
    <p><a href="${verifyUrl}">Xác nhận email</a></p>
    <p>Nếu bạn không yêu cầu tài khoản này, có thể bỏ qua email.</p>
  `.trim();

  try {
    const { error } = await resend.emails.send({
      from,
      to: [to],
      subject: 'Xác nhận tài khoản Meeting Minutes AI',
      html,
    });
    if (error) {
      console.error('[sendVerificationEmail]', error);
      return { sent: false };
    }
    return { sent: true };
  } catch (e) {
    console.error('[sendVerificationEmail]', e);
    return { sent: false };
  }
}
