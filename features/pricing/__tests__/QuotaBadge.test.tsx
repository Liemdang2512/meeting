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

  it('hiển thị skeleton loading khi quota chưa load', () => {
    // authFetch never resolves during this test
    mockAuthFetch.mockReturnValue(new Promise(() => {}));
    const { container } = render(<QuotaBadge />);
    // Component renders a skeleton span while loading
    expect(container.firstChild).not.toBeNull();
  });

  it('hiển thị badge ví credits khi role !== "free"', async () => {
    mockAuthFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ role: 'user', billingModel: 'wallet', balance: 12000, overdraftLimit: -10000 }),
    } as Response);
    render(<QuotaBadge />);
    await waitFor(() => {
      expect(screen.getByText('Ví: 12.000 credits')).toBeInTheDocument();
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

  it('card variant hiển thị trạng thái ví thay vì quota ngày cho paid user', async () => {
    mockAuthFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ role: 'user', billingModel: 'wallet', balance: 8000, overdraftLimit: -10000 }),
    } as Response);
    render(<QuotaBadge variant="card" />);
    await waitFor(() => {
      expect(screen.getByText('Số dư ví')).toBeInTheDocument();
      expect(screen.getByText('8.000 credits')).toBeInTheDocument();
    });
    expect(screen.queryByText('Lượt hôm nay')).toBeNull();
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
