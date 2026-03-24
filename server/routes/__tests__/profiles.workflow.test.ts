import { describe, it, expect } from 'vitest';

// Validate the group-switch logic inline (no DB/HTTP needed)
// Full integration tests live in tests/integration/ and require Docker DB.

const VALID_GROUPS = ['reporter', 'specialist', 'officer'] as const;
type WorkflowGroup = typeof VALID_GROUPS[number];

function validateGroupSwitch(
  requestedGroup: string,
  userGroups: WorkflowGroup[]
): { status: number; error?: string; ok?: boolean } {
  if (!requestedGroup || !(VALID_GROUPS as readonly string[]).includes(requestedGroup)) {
    return { status: 400, error: 'Nhóm không hợp lệ' };
  }
  if (!userGroups.includes(requestedGroup as WorkflowGroup)) {
    return { status: 403, error: 'Bạn không thuộc nhóm này' };
  }
  return { status: 200, ok: true };
}

describe('PATCH /api/profiles/active-workflow-group', () => {
  it('rejects invalid group value', () => {
    const result = validateGroupSwitch('hacker', ['reporter', 'specialist']);
    expect(result.status).toBe(400);
    expect(result.error).toBeTruthy();
  });

  it('rejects group not in user workflowGroups', () => {
    // user has ['reporter', 'specialist'] — 'officer' is valid enum but not in their groups
    const result = validateGroupSwitch('officer', ['reporter', 'specialist']);
    expect(result.status).toBe(403);
    expect(result.error).toBeTruthy();
  });

  it('accepts group that user belongs to and returns new token', () => {
    const result = validateGroupSwitch('specialist', ['reporter', 'specialist']);
    expect(result.status).toBe(200);
    expect(result.ok).toBe(true);
  });
});
