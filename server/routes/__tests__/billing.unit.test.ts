import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  getBillingUsdToVnd,
  getCreditsPerMillionOutputTokens,
  getOutputTokenChargeCredits,
  getPackCredits,
  getPackPrice,
  OUTPUT_USD_PER_MILLION_TOKENS,
  resolveBillableOutputTokens,
} from '../../billing/rateCard';

describe('billing contract constants', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('maps fixed pack IDs to canonical VND price anchors', () => {
    expect(getPackPrice('specialist')).toBe(299000);
    expect(getPackPrice('reporter')).toBe(399000);
    expect(getPackPrice('officer')).toBe(499000);
  });

  it('returns positive credit values for each fixed pack', () => {
    expect(getPackCredits('specialist')).toBeGreaterThan(0);
    expect(getPackCredits('reporter')).toBeGreaterThan(0);
    expect(getPackCredits('officer')).toBeGreaterThan(0);
  });

  it('prices output tokens as USD/M × VND/USD → credits/M (default FX)', () => {
    vi.stubEnv('BILLING_USD_TO_VND', '');
    expect(getBillingUsdToVnd()).toBe(25_000);
    expect(getCreditsPerMillionOutputTokens()).toBe(OUTPUT_USD_PER_MILLION_TOKENS * 25_000);
    expect(getOutputTokenChargeCredits(1_000_000)).toBe(250_000);
    expect(getOutputTokenChargeCredits(1)).toBe(1);
    expect(getOutputTokenChargeCredits(0)).toBe(0);
  });

  it('respects BILLING_USD_TO_VND override', () => {
    vi.stubEnv('BILLING_USD_TO_VND', '26000');
    expect(getBillingUsdToVnd()).toBe(26_000);
    expect(getCreditsPerMillionOutputTokens()).toBe(OUTPUT_USD_PER_MILLION_TOKENS * 26_000);
  });

  it('uses provider output token count when present', () => {
    expect(resolveBillableOutputTokens({ candidatesTokenCount: 500 }, 'x'.repeat(10_000))).toBe(500);
  });

  it('falls back to text-length estimate when usage is missing', () => {
    const text = 'abcd';
    expect(resolveBillableOutputTokens(undefined, text)).toBe(1);
    expect(resolveBillableOutputTokens({}, 'a'.repeat(40))).toBe(10);
  });

  it('returns 0 billable tokens for empty text without usage', () => {
    expect(resolveBillableOutputTokens(undefined, '   ')).toBe(0);
  });
});
