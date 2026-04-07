import { describe, expect, it } from 'vitest';
import {
  getActionCost,
  getPackCredits,
  getPackPrice,
} from '../../billing/rateCard';

describe('billing contract constants', () => {
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

  it('returns deterministic non-zero debit cost for minutes generation', () => {
    const first = getActionCost('minutes-generate');
    const second = getActionCost('minutes-generate');

    expect(first).toBe(second);
    expect(first).toBeGreaterThan(0);
  });

  it('rejects unknown action types (no silent fallback)', () => {
    expect(() => getActionCost('unknown-action' as never)).toThrow(/unknown action/i);
  });
});
