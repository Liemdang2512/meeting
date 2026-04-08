import type { CreditPackDefinition, CreditPackId } from './types';

const CREDIT_PACKS: Record<CreditPackId, CreditPackDefinition> = {
  specialist: { packId: 'specialist', priceVnd: 299000, credits: 299000 },
  reporter: { packId: 'reporter', priceVnd: 399000, credits: 399000 },
  officer: { packId: 'officer', priceVnd: 499000, credits: 499000 },
};

/** Output-token retail price in USD per 1,000,000 tokens (Gemini candidates). */
export const OUTPUT_USD_PER_MILLION_TOKENS = 10;

const OUTPUT_TOKENS_PER_MILLION = 1_000_000;

const DEFAULT_USD_TO_VND = 25_000;

function failUnknownPack(packId: string): never {
  throw new Error(`Unknown pack type: ${packId}`);
}

/**
 * VND per 1 USD for converting USD API cost into credits (credits ≈ VND at pack parity).
 * Override with env `BILLING_USD_TO_VND` when the FX rate should change.
 */
export function getBillingUsdToVnd(): number {
  const raw = process.env.BILLING_USD_TO_VND;
  if (raw === undefined || raw === '') {
    return DEFAULT_USD_TO_VND;
  }
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? Math.round(n) : DEFAULT_USD_TO_VND;
}

/** Credits charged per 1,000,000 output tokens at current USD→VND mapping. */
export function getCreditsPerMillionOutputTokens(): number {
  return Math.round(OUTPUT_USD_PER_MILLION_TOKENS * getBillingUsdToVnd());
}

/**
 * Credits to debit for a given output token count (rounded up).
 * Example: default FX → 10 USD/M × 25,000 = 250,000 credits per 1M output tokens.
 */
export function getOutputTokenChargeCredits(outputTokens: number): number {
  const tokens = Math.max(0, Math.floor(Number(outputTokens)));
  if (tokens === 0) {
    return 0;
  }
  const perMillion = getCreditsPerMillionOutputTokens();
  return Math.ceil((tokens * perMillion) / OUTPUT_TOKENS_PER_MILLION);
}

/**
 * Prefer provider usage; if missing, approximate from response text (~4 chars per token).
 */
export function resolveBillableOutputTokens(
  usage: { candidatesTokenCount?: number } | undefined,
  text: string,
): number {
  const c = usage?.candidatesTokenCount;
  if (typeof c === 'number' && Number.isFinite(c) && c >= 0) {
    return Math.floor(c);
  }
  const t = text.trim();
  if (!t) {
    return 0;
  }
  return Math.max(1, Math.ceil(t.length / 4));
}

export function getPackPrice(packId: CreditPackId | string): number {
  const pack = CREDIT_PACKS[packId as CreditPackId];
  return pack ? pack.priceVnd : failUnknownPack(packId);
}

export function getPackCredits(packId: CreditPackId | string): number {
  const pack = CREDIT_PACKS[packId as CreditPackId];
  return pack ? pack.credits : failUnknownPack(packId);
}
