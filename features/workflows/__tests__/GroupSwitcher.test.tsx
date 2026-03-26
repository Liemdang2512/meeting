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
  features: ['transcription', 'summary'],
};

const multiGroupUser: AuthUser = {
  userId: '2', email: 'b@c.com', role: 'free',
  workflowGroups: ['reporter', 'specialist'],
  activeWorkflowGroup: 'reporter',
  features: ['transcription', 'summary'],
};

describe('GroupSwitcher', () => {
  it('renders all groups and marks unsubscribed as locked', () => {
    const nav = vi.fn();
    const { getByText } = render(<GroupSwitcher user={singleGroupUser} navigate={nav} />);
    expect(getByText('Chuyên viên')).toBeTruthy();
    expect(getByText('Phóng viên (khóa)')).toBeTruthy();
    expect(getByText('Cán bộ (khóa)')).toBeTruthy();
  });

  it('renders group buttons for multi-group user', () => {
    const nav = vi.fn();
    const { getByText } = render(<GroupSwitcher user={multiGroupUser} navigate={nav} />);
    expect(getByText('Phóng viên')).toBeTruthy();
    expect(getByText('Chuyên viên')).toBeTruthy();
    expect(getByText('Cán bộ (khóa)')).toBeTruthy();
  });

  it('highlights active group with indigo style', () => {
    const nav = vi.fn();
    const { getByText } = render(<GroupSwitcher user={multiGroupUser} navigate={nav} />);
    const activeBtn = getByText('Phóng viên');
    expect(activeBtn.className).toContain('bg-indigo-600');
  });
});
