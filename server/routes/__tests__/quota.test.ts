import { describe, expect, it } from 'vitest';
import { buildWalletQuotaPayload } from '../quota';

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
});
