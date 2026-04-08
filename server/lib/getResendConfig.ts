import sql from '../db';

const DEFAULT_FROM = 'Meeting Scribe <onboarding@resend.dev>';

/**
 * Resend API key: `RESEND_API_KEY` env wins, else `app_settings.resend_api_key`.
 * From: `RESEND_FROM` env, else `app_settings.resend_from`, else Resend dev default.
 */
export async function getResendConfig(): Promise<{
  apiKey: string | null;
  from: string;
}> {
  const envKey = process.env.RESEND_API_KEY?.trim();
  const envFrom = process.env.RESEND_FROM?.trim();
  if (envKey) {
    return { apiKey: envKey, from: envFrom || DEFAULT_FROM };
  }

  let rows: { key: string; value: string }[] = [];
  try {
    rows = await sql`
      SELECT key, value FROM public.app_settings
      WHERE key IN ('resend_api_key', 'resend_from')
    `;
  } catch {
    return { apiKey: null, from: DEFAULT_FROM };
  }

  if (!Array.isArray(rows)) {
    return { apiKey: null, from: DEFAULT_FROM };
  }

  const map = Object.fromEntries(rows.map(r => [r.key, r.value])) as Record<string, string>;
  const apiKey = map.resend_api_key?.trim() || null;
  const from = map.resend_from?.trim() || DEFAULT_FROM;
  return { apiKey, from };
}

/** `SMTP_MAX_RECIPIENTS` env wins, else `app_settings.email_max_recipients`, else 20. */
export async function getMaxEmailRecipients(): Promise<number> {
  const env = process.env.SMTP_MAX_RECIPIENTS?.trim();
  if (env) {
    const n = parseInt(env, 10);
    if (!Number.isNaN(n) && n > 0) return n;
  }

  try {
    const rows = await sql`
      SELECT value FROM public.app_settings WHERE key = 'email_max_recipients' LIMIT 1
    `;
    const row = Array.isArray(rows) ? rows[0] : undefined;
    if (row?.value != null) {
      const n = parseInt(String(row.value), 10);
      if (!Number.isNaN(n) && n > 0) return n;
    }
  } catch {
    /* missing table / tests */
  }
  return 20;
}
