import { afterAll, describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';
import { WorkflowGuard } from '../WorkflowGuard';
import type { AuthUser } from '../../../lib/auth';

const mockUser: AuthUser = {
  userId: '1', email: 'a@b.com', role: 'free',
  plans: ['reporter', 'specialist'],
  features: ['transcription', 'summary'],
};

describe('WorkflowGuard', () => {
  const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {});

  it('renders children when user has matching plan', () => {
    const nav = vi.fn();
    const { getByText } = render(
      <WorkflowGuard group="reporter" user={mockUser} navigate={nav}>
        <div>Content</div>
      </WorkflowGuard>
    );
    expect(getByText('Content')).toBeTruthy();
    expect(nav).not.toHaveBeenCalled();
  });

  it('redirects when user does not have matching plan', () => {
    const nav = vi.fn();
    const { container } = render(
      <WorkflowGuard group="officer" user={mockUser} navigate={nav}>
        <div>Content</div>
      </WorkflowGuard>
    );
    expect(alertSpy).toHaveBeenCalled();
    expect(nav).toHaveBeenCalledWith('/pricing');
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

  it('multi-plan user can access any of their plans', () => {
    const nav = vi.fn();
    const { getByText } = render(
      <WorkflowGuard group="specialist" user={mockUser} navigate={nav}>
        <div>Specialist Content</div>
      </WorkflowGuard>
    );
    expect(getByText('Specialist Content')).toBeTruthy();
    expect(nav).not.toHaveBeenCalled();
  });

  afterAll(() => {
    alertSpy.mockRestore();
  });
});
