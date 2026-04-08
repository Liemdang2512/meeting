import { Router } from 'express';
import { GoogleGenAI } from '@google/genai';
import sql from '../db';
import { requireAuth, requireFeature } from '../auth';
import { BillingInsufficientBalanceError, authorizeAndCharge } from '../billing/billingService';
import {
  getCreditsPerMillionOutputTokens,
  getOutputTokenChargeCredits,
  resolveBillableOutputTokens,
} from '../billing/rateCard';

const router = Router();
router.use(requireAuth);

async function getApiKeyForUser(userId: string): Promise<string | null> {
  const [row] = await sql`
    SELECT gemini_api_key FROM public.user_settings WHERE user_id = ${userId}
  `;
  return row?.gemini_api_key ?? null;
}

function getSystemApiKey(): string | null {
  // Prefer backend-specific env, but allow frontend-style VITE_* in dev to avoid split config.
  return process.env.GEMINI_API_KEY ?? process.env.VITE_GEMINI_API_KEY ?? null;
}

// POST /api/gemini/generate
// Body: { prompt: string, model?: string, systemInstruction?: string }
// Uses user's stored API key or falls back to system key
router.post('/generate', requireFeature('transcription'), async (req, res) => {
  const { prompt, model = 'gemini-3-flash-preview', systemInstruction } = req.body ?? {};
  if (!prompt || typeof prompt !== 'string') {
    return res.status(400).json({ error: 'prompt là bắt buộc' });
  }

  const apiKey = await getApiKeyForUser(req.user!.userId) ?? getSystemApiKey();
  if (!apiKey) {
    return res.status(400).json({ error: 'Chưa cấu hình API key. Vui lòng thêm Gemini API key trong cài đặt.' });
  }

  try {
    const ai = new GoogleGenAI({ apiKey });
    const response = await ai.models.generateContent({
      model,
      contents: prompt,
      config: systemInstruction ? { systemInstruction } : undefined,
    });
    const text = response.text ?? '';
    const usage = (response as any).usageMetadata as {
      promptTokenCount?: number;
      candidatesTokenCount?: number;
      totalTokenCount?: number;
    } | undefined;

    const outputTokens = resolveBillableOutputTokens(usage, text);
    const amountCredits = getOutputTokenChargeCredits(outputTokens);

    try {
      const billing = await authorizeAndCharge({
        userId: req.user!.userId,
        actionType: 'minutes-generate',
        amountCredits,
        metadata: {
          route: '/api/gemini/generate',
          model,
          outputTokensBillable: outputTokens,
          creditsPerMillionOutput: getCreditsPerMillionOutputTokens(),
        },
      });

      console.log('[gemini/billing]', {
        userId: req.user!.userId,
        charged: billing.charged,
        amountCredits: billing.amountCredits,
        balanceAfter: billing.balanceAfterCredits,
        skippedReason: billing.skippedReason,
      });

      return res.json({
        text,
        usage: usage
          ? {
              inputTokens: usage.promptTokenCount ?? 0,
              outputTokens: usage.candidatesTokenCount ?? 0,
              totalTokens: usage.totalTokenCount ?? 0,
            }
          : null,
        billing: {
          charged: billing.charged,
          amountCredits: billing.amountCredits,
          balanceAfterCredits: billing.balanceAfterCredits,
          correlationId: billing.correlationId,
          skippedReason: billing.skippedReason,
        },
      });
    } catch (chargeErr) {
      if (chargeErr instanceof BillingInsufficientBalanceError) {
        return res.status(chargeErr.statusCode).json(chargeErr.payload);
      }
      throw chargeErr;
    }
  } catch (err: any) {
    console.error('[gemini/generate]', err);
    if (err.status === 429) {
      return res.status(429).json({ error: 'API rate limit exceeded. Vui lòng thử lại sau.' });
    }
    if (err.status === 401 || err.status === 403) {
      return res.status(400).json({ error: 'API key không hợp lệ. Vui lòng kiểm tra lại.' });
    }
    return res.status(502).json({ error: 'AI service không khả dụng. Vui lòng thử lại sau.' });
  }
});

export default router;
