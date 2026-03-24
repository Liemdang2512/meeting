import { describe, it, expect, vi } from 'vitest';
import { render, fireEvent } from '@testing-library/react';
import { GroupSwitcher } from '../GroupSwitcher';
import type { AuthUser } from '../../../lib/auth';

// Mock lib/api
vi.mock('../../../lib/api', () => ({
  authFetch: vi.fn(),
  setToken: vi.fn(),
}));

const singleGroupUser: AuthUser = {
  userId: '1', email: 'a@b.com', role: 'free',
  workflowGroups: ['specialist'],
  activeWorkflowGroup: 'specialist',
};

const multiGroupUser: AuthUser = {
  userId: '2', email: 'b@c.com', role: 'free',
  workflowGroups: ['reporter', 'specialist'],
  activeWorkflowGroup: 'reporter',
};

describe('GroupSwitcher', () => {
  it('renders nothing for single-group user', () => {
    const nav = vi.fn();
    const { container } = render(<GroupSwitcher user={singleGroupUser} navigate={nav} />);
    expect(container.innerHTML).toBe('');
  });

  it('renders group buttons for multi-group user', () => {
    const nav = vi.fn();
    const { getByText } = render(<GroupSwitcher user={multiGroupUser} navigate={nav} />);
    expect(getByText('Phong vien')).toBeTruthy();
    expect(getByText('Chuyen vien')).toBeTruthy();
  });

  it('highlights active group with indigo style', () => {
    const nav = vi.fn();
    const { getByText } = render(<GroupSwitcher user={multiGroupUser} navigate={nav} />);
    const activeBtn = getByText('Phong vien');
    expect(activeBtn.className).toContain('bg-indigo-600');
  });
});
