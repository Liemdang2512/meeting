import { describe, it, expect } from 'vitest';
import { RegisterSchema } from '../auth';

const BASE = {
  email: 'a@b.com',
  password: '12345678',
  confirmPassword: '12345678',
};

describe('RegisterSchema workflowGroups validation', () => {
  it('rejects empty workflowGroups array', () => {
    const result = RegisterSchema.safeParse({ ...BASE, workflowGroups: [] });
    expect(result.success).toBe(false);
  });
  it('rejects unknown group value like "hacker"', () => {
    const result = RegisterSchema.safeParse({ ...BASE, workflowGroups: ['hacker'] });
    expect(result.success).toBe(false);
  });
  it('accepts valid single group ["reporter"]', () => {
    const result = RegisterSchema.safeParse({ ...BASE, workflowGroups: ['reporter'] });
    expect(result.success).toBe(true);
  });
  it('accepts valid multiple groups ["reporter","specialist"]', () => {
    const result = RegisterSchema.safeParse({ ...BASE, workflowGroups: ['reporter', 'specialist'] });
    expect(result.success).toBe(true);
  });
});
