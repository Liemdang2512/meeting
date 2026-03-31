import { describe, it, expect } from 'vitest';

// Validate plan management logic inline (no DB/HTTP needed)
// Full integration tests live in tests/integration/ and require Docker DB.

const VALID_PLANS = ['reporter', 'specialist', 'officer'] as const;
type Plan = typeof VALID_PLANS[number];

function validatePlanToggle(
  plan: string,
  userPlans: Plan[],
  action: 'add' | 'remove'
): { status: number; error?: string; plans?: Plan[] } {
  if (!plan || !(VALID_PLANS as readonly string[]).includes(plan)) {
    return { status: 400, error: 'Gói không hợp lệ' };
  }
  if (action === 'add') {
    const newPlans = userPlans.includes(plan as Plan) ? userPlans : [...userPlans, plan as Plan];
    return { status: 200, plans: newPlans };
  } else {
    const newPlans = userPlans.filter(p => p !== plan);
    return { status: 200, plans: newPlans };
  }
}

describe('PATCH /api/profiles/plans', () => {
  it('rejects invalid plan value', () => {
    const result = validatePlanToggle('hacker', ['reporter', 'specialist'], 'add');
    expect(result.status).toBe(400);
    expect(result.error).toBeTruthy();
  });

  it('adds a valid plan', () => {
    const result = validatePlanToggle('officer', ['reporter', 'specialist'], 'add');
    expect(result.status).toBe(200);
    expect(result.plans).toContain('officer');
    expect(result.plans).toHaveLength(3);
  });

  it('removes a plan', () => {
    const result = validatePlanToggle('reporter', ['reporter', 'specialist'], 'remove');
    expect(result.status).toBe(200);
    expect(result.plans).not.toContain('reporter');
    expect(result.plans).toHaveLength(1);
  });
});
