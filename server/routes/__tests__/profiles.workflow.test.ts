import { describe, it, expect } from 'vitest';

describe('PATCH /api/profiles/active-workflow-group', () => {
  it('rejects group not in user workflowGroups', () => {
    expect(true).toBe(false);
  });
  it('accepts group that user belongs to and returns new token', () => {
    expect(true).toBe(false);
  });
  it('rejects invalid group value', () => {
    expect(true).toBe(false);
  });
});
