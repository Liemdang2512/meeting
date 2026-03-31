import { describe, it, expect } from 'vitest';
import { RegisterSchema } from '../auth';

const BASE = {
  email: 'a@b.com',
  password: '12345678',
  confirmPassword: '12345678',
};

describe('RegisterSchema validation', () => {
  it('accepts valid registration without plans', () => {
    const result = RegisterSchema.safeParse({ ...BASE });
    expect(result.success).toBe(true);
  });
  it('rejects mismatched passwords', () => {
    const result = RegisterSchema.safeParse({ ...BASE, confirmPassword: 'different' });
    expect(result.success).toBe(false);
  });
  it('rejects short password', () => {
    const result = RegisterSchema.safeParse({ ...BASE, password: '1234', confirmPassword: '1234' });
    expect(result.success).toBe(false);
  });
  it('rejects invalid email', () => {
    const result = RegisterSchema.safeParse({ ...BASE, email: 'not-an-email' });
    expect(result.success).toBe(false);
  });
});
