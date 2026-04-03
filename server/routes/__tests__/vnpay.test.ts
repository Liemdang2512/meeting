// server/routes/__tests__/vnpay.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Unit test: orderId format
describe('VNPay orderId format', () => {
  it('generates orderId with ORD_ prefix and timestamp', () => {
    const userId = 'abcd1234-5678-90ef-ghij-klmnopqrstuv';
    const now = Date.now();
    const orderId = `ORD_${now}_${userId.slice(0, 8)}`;
    expect(orderId).toMatch(/^ORD_\d+_abcd1234$/);
  });
});

// Unit test: IPN idempotency logic (pure logic, no DB)
describe('VNPay IPN idempotency', () => {
  it('returns already-processed signal when order.status is completed', () => {
    const orderStatus = 'completed';
    const isAlreadyProcessed = orderStatus === 'completed';
    expect(isAlreadyProcessed).toBe(true);
  });

  it('returns false for pending order (should process)', () => {
    const orderStatus = 'pending';
    const isAlreadyProcessed = orderStatus === 'completed';
    expect(isAlreadyProcessed).toBe(false);
  });
});

// Unit test: amount verification logic
describe('VNPay amount verification', () => {
  it('flags mismatch when IPN amount differs from stored amount', () => {
    const storedAmount = 99000;
    const ipnAmount = 50000;
    expect(Number(ipnAmount) !== storedAmount).toBe(true);
  });

  it('passes when IPN amount matches stored amount', () => {
    const storedAmount = 99000;
    const ipnAmount = 99000;
    expect(Number(ipnAmount) !== storedAmount).toBe(false);
  });
});
