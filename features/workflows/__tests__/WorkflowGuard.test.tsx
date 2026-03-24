import { describe, it, expect } from 'vitest';

describe('WorkflowGuard', () => {
  it('renders children when user has matching group', () => {
    expect(true).toBe(false);
  });
  it('redirects when user does not have matching group', () => {
    expect(true).toBe(false);
  });
  it('redirects to login when user is null', () => {
    expect(true).toBe(false);
  });
  it('multi-group user can access any of their groups', () => {
    expect(true).toBe(false);
  });
});
