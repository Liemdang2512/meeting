import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';
import { WorkflowGuard } from '../WorkflowGuard';
import type { AuthUser } from '../../../lib/auth';

const mockUser: AuthUser = {
  userId: '1', email: 'a@b.com', role: 'free',
  workflowGroups: ['reporter', 'specialist'],
  activeWorkflowGroup: 'reporter',
};

describe('WorkflowGuard', () => {
  it('renders children when user has matching group', () => {
    const nav = vi.fn();
    const { getByText } = render(
      <WorkflowGuard group="reporter" user={mockUser} navigate={nav}>
        <div>Content</div>
      </WorkflowGuard>
    );
    expect(getByText('Content')).toBeTruthy();
    expect(nav).not.toHaveBeenCalled();
  });

  it('redirects when user does not have matching group', () => {
    const nav = vi.fn();
    const { container } = render(
      <WorkflowGuard group="officer" user={mockUser} navigate={nav}>
        <div>Content</div>
      </WorkflowGuard>
    );
    expect(nav).toHaveBeenCalledWith('/reporter');
    expect(container.innerHTML).toBe('');
  });

  it('redirects to login when user is null', () => {
    const nav = vi.fn();
    render(
      <WorkflowGuard group="reporter" user={null} navigate={nav}>
        <div>Content</div>
      </WorkflowGuard>
    );
    expect(nav).toHaveBeenCalledWith('/login');
  });

  it('multi-group user can access any of their groups', () => {
    const nav = vi.fn();
    const { getByText } = render(
      <WorkflowGuard group="specialist" user={mockUser} navigate={nav}>
        <div>Specialist Content</div>
      </WorkflowGuard>
    );
    expect(getByText('Specialist Content')).toBeTruthy();
    expect(nav).not.toHaveBeenCalled();
  });
});
