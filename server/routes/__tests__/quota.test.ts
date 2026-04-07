import { describe, expect, it } from 'vitest';
import { isWalletBillingUser } from '../quota';

describe('quota billing model classification', () => {
  it('treats non-free role users as wallet model', () => {
    expect(isWalletBillingUser({ role: 'user', plans: [] })).toBe(true);
    expect(isWalletBillingUser({ role: 'admin', plans: [] })).toBe(true);
  });

  it('treats free users with paid plans as wallet model', () => {
    expect(isWalletBillingUser({ role: 'free', plans: ['specialist'] })).toBe(true);
    expect(isWalletBillingUser({ role: 'free', plans: ['reporter', 'officer'] })).toBe(true);
  });

  it('keeps free users without plans on quota model', () => {
    expect(isWalletBillingUser({ role: 'free', plans: [] })).toBe(false);
    expect(isWalletBillingUser({ role: 'free' })).toBe(false);
  });
});
