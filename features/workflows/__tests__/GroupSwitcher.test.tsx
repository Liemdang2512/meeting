import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';
import { GroupSwitcher } from '../GroupSwitcher';
import type { AuthUser } from '../../../lib/auth';

const singlePlanUser: AuthUser = {
  userId: '1', email: 'a@b.com', role: 'free',
  plans: ['specialist'],
  features: ['transcription', 'summary'],
};

const multiPlanUser: AuthUser = {
  userId: '2', email: 'b@c.com', role: 'free',
  plans: ['reporter', 'specialist'],
  features: ['transcription', 'summary'],
};

describe('GroupSwitcher', () => {
  it('renders all groups and marks unsubscribed as locked', () => {
    const nav = vi.fn();
    const { getByText } = render(<GroupSwitcher user={singlePlanUser} navigate={nav} />);
    expect(getByText('Chuyên viên')).toBeTruthy();
    expect(getByText('Phóng viên (khóa)')).toBeTruthy();
    expect(getByText('Cán bộ (khóa)')).toBeTruthy();
  });

  it('renders group buttons for multi-plan user', () => {
    const nav = vi.fn();
    const { getByText } = render(<GroupSwitcher user={multiPlanUser} navigate={nav} />);
    expect(getByText('Phóng viên')).toBeTruthy();
    expect(getByText('Chuyên viên')).toBeTruthy();
    expect(getByText('Cán bộ (khóa)')).toBeTruthy();
  });
});
