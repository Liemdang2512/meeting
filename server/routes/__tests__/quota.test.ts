import { describe, expect, it } from 'vitest';
import { buildWalletQuotaPayload, isSchemaFallbackError, loadWalletSnapshot } from '../quota';

describe('quota route wallet payload helpers', () => {
  it('builds wallet payload with defaults when wallet rows are missing', () => {
    const payload = buildWalletQuotaPayload({ role: 'free' });
    expect(payload).toMatchObject({
      role: 'free',
      billingModel: 'wallet',
      balance: 0,
      overdraftLimit: -10000,
      legacyAccessUntil: null,
    });
  });

  it('builds wallet payload from persisted wallet + migration values', () => {
    const payload = buildWalletQuotaPayload({
      role: 'user',
      balanceCredits: 12345,
      legacyAccessUntil: '2026-04-08T10:00:00.000Z',
    });
    expect(payload).toMatchObject({
      role: 'user',
      billingModel: 'wallet',
      balance: 12345,
      overdraftLimit: -10000,
      legacyAccessUntil: '2026-04-08T10:00:00.000Z',
    });
  });

  it('detects schema fallback errors for missing relation/column', () => {
    expect(isSchemaFallbackError({ code: '42P01' })).toBe(true);
    expect(isSchemaFallbackError({ code: '42703' })).toBe(true);
    expect(isSchemaFallbackError({ code: '23505' })).toBe(false);
  });

  it('falls back to wallet defaults when schema is unavailable', async () => {
    const snapshot = await loadWalletSnapshot({
      loadWallet: async () => {
        const err = Object.assign(new Error('relation missing'), { code: '42P01' });
        throw err;
      },
      loadLegacyAssignment: async () => {
        const err = Object.assign(new Error('column missing'), { code: '42703' });
        throw err;
      },
    });

    expect(snapshot).toEqual({
      balanceCredits: 0,
      legacyAccessUntil: null,
    });
  });

  it('re-throws unexpected db errors instead of hiding them', async () => {
    await expect(
      loadWalletSnapshot({
        loadWallet: async () => {
          const err = Object.assign(new Error('db unavailable'), { code: '57P01' });
          throw err;
        },
        loadLegacyAssignment: async () => null,
      }),
    ).rejects.toMatchObject({ code: '57P01' });
  });
});
