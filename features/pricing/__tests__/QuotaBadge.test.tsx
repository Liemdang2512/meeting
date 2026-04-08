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

  it('hiển thị badge ví credits cho payload wallet', async () => {
    mockAuthFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ role: 'free', billingModel: 'wallet', balance: 12000, overdraftLimit: 0 }),
    } as Response);
    render(<QuotaBadge />);
    await waitFor(() => {
      expect(screen.getByText('Ví: 12.000 credits')).toBeInTheDocument();
    });
  });

  it('pill variant đổi màu amber khi số dư âm', async () => {
    mockAuthFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ role: 'free', billingModel: 'wallet', balance: -500, overdraftLimit: 0 }),
    } as Response);
    render(<QuotaBadge />);
    await waitFor(() => {
      expect(screen.getByText('Ví: -500 credits')).toBeInTheDocument();
    });
    const badge = screen.getByText('Ví: -500 credits');
    expect(badge.className).toContain('amber');
  });

  it('không gọi onQuotaExhausted cho payload wallet-only phase 11', async () => {
    mockAuthFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ role: 'free', billingModel: 'wallet', balance: 0, overdraftLimit: 0 }),
    } as Response);
    const onExhausted = vi.fn();
    render(<QuotaBadge onQuotaExhausted={onExhausted} />);
    await waitFor(() => expect(screen.getByText('Ví: 0 credits')).toBeInTheDocument());
    expect(onExhausted).not.toHaveBeenCalled();
  });

  it('re-fetch quota khi nhận được sự kiện "quota-updated" trên window', async () => {
    mockAuthFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ role: 'free', billingModel: 'wallet', balance: 0, overdraftLimit: 0 }),
    } as Response);
    render(<QuotaBadge />);
    await waitFor(() => {
      expect(screen.getByText('Ví: 0 credits')).toBeInTheDocument();
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
      json: async () => ({ role: 'user', billingModel: 'wallet', balance: 8000, overdraftLimit: 0 }),
    } as Response);
    render(<QuotaBadge variant="card" />);
    await waitFor(() => {
      expect(screen.getByText('Số dư ví')).toBeInTheDocument();
      expect(screen.getByText('8.000 credits')).toBeInTheDocument();
    });
expect(screen.queryByText('Lượt hôm nay')).toBeNull();
    expect(screen.queryByText(/Hôm nay:/)).toBeNull();
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
