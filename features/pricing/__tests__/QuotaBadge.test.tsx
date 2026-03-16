import React from 'react';
import { render, screen, waitFor, act } from '@testing-library/react';
import { vi, beforeEach, describe, it, expect } from 'vitest';
import { QuotaBadge } from '../QuotaBadge';
import { QuotaUpgradeModal } from '../QuotaUpgradeModal';
import { authFetch } from '../../../lib/api';

vi.mock('../../../lib/api', () => ({
  authFetch: vi.fn(),
}));

const mockAuthFetch = vi.mocked(authFetch);

describe('QuotaBadge', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('không render gì khi quota chưa load (null state)', () => {
    // authFetch never resolves during this test
    mockAuthFetch.mockReturnValue(new Promise(() => {}));
    const { container } = render(<QuotaBadge />);
    expect(container.firstChild).toBeNull();
  });

  it('hiển thị "Unlimited" khi role !== "free" (unlimited: true)', async () => {
    mockAuthFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ role: 'user', unlimited: true }),
    } as Response);
    render(<QuotaBadge />);
    await waitFor(() => {
      expect(screen.getByText('Unlimited')).toBeInTheDocument();
    });
  });

  it('hiển thị "Hôm nay: 0/1 lượt" khi used=0, limit=1 (màu xanh)', async () => {
    mockAuthFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ role: 'free', used: 0, limit: 1, remaining: 1 }),
    } as Response);
    render(<QuotaBadge />);
    await waitFor(() => {
      expect(screen.getByText('Hôm nay: 0/1 lượt')).toBeInTheDocument();
    });
    const badge = screen.getByText('Hôm nay: 0/1 lượt');
    expect(badge.className).toContain('emerald');
  });

  it('hiển thị "Hôm nay: 1/1 lượt" khi used=1, limit=1 (màu amber)', async () => {
    mockAuthFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ role: 'free', used: 1, limit: 1, remaining: 0 }),
    } as Response);
    render(<QuotaBadge onQuotaExhausted={() => {}} />);
    await waitFor(() => {
      expect(screen.getByText('Hôm nay: 1/1 lượt')).toBeInTheDocument();
    });
    const badge = screen.getByText('Hôm nay: 1/1 lượt');
    expect(badge.className).toContain('amber');
  });

  it('gọi onQuotaExhausted khi remaining === 0', async () => {
    mockAuthFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ role: 'free', used: 1, limit: 1, remaining: 0 }),
    } as Response);
    const onExhausted = vi.fn();
    render(<QuotaBadge onQuotaExhausted={onExhausted} />);
    await waitFor(() => {
      expect(onExhausted).toHaveBeenCalledTimes(1);
    });
  });

  it('re-fetch quota khi nhận được sự kiện "quota-updated" trên window', async () => {
    mockAuthFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ role: 'free', used: 0, limit: 1, remaining: 1 }),
    } as Response);
    render(<QuotaBadge />);
    await waitFor(() => {
      expect(screen.getByText('Hôm nay: 0/1 lượt')).toBeInTheDocument();
    });
    expect(mockAuthFetch).toHaveBeenCalledTimes(1);

    // Dispatch the event and check that authFetch is called again
    await act(async () => {
      window.dispatchEvent(new Event('quota-updated'));
    });
    await waitFor(() => {
      expect(mockAuthFetch).toHaveBeenCalledTimes(2);
    });
  });
});

describe('QuotaUpgradeModal', () => {
  it('không render gì khi isOpen=false', () => {
    const { container } = render(
      <QuotaUpgradeModal isOpen={false} onClose={() => {}} onViewPlans={() => {}} />
    );
    expect(container.firstChild).toBeNull();
  });

  it('hiển thị modal khi isOpen=true với "Đóng" và "Xem các gói"', () => {
    render(
      <QuotaUpgradeModal isOpen={true} onClose={() => {}} onViewPlans={() => {}} />
    );
    expect(screen.getByText(/Đã hết lượt hôm nay/i)).toBeInTheDocument();
    expect(screen.getByText(/Xem các gói nâng cấp/i)).toBeInTheDocument();
    expect(screen.getByText(/Đóng/i)).toBeInTheDocument();
  });

  it('gọi onClose khi click "Đóng"', () => {
    const onClose = vi.fn();
    render(
      <QuotaUpgradeModal isOpen={true} onClose={onClose} onViewPlans={() => {}} />
    );
    screen.getByText(/Đóng/i).click();
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('gọi onViewPlans khi click "Xem các gói nâng cấp"', () => {
    const onViewPlans = vi.fn();
    render(
      <QuotaUpgradeModal isOpen={true} onClose={() => {}} onViewPlans={onViewPlans} />
    );
    screen.getByText(/Xem các gói nâng cấp/i).click();
    expect(onViewPlans).toHaveBeenCalledTimes(1);
  });
});
