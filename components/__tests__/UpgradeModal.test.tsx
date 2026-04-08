import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { vi } from 'vitest';
import { UpgradeModal } from '../../features/pricing/UpgradeModal';

vi.mock('../../lib/api', () => ({
  getToken: vi.fn(() => 'mock-token'),
}));

describe('UpgradeModal', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(window, 'open').mockReturnValue({} as Window);
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({
        ok: true,
        json: async () => ({ paymentUrl: 'https://pay.example.com' }),
      })) as unknown as typeof fetch
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('không render gì khi isOpen=false', () => {
    render(<UpgradeModal isOpen={false} onClose={vi.fn()} />);
    expect(screen.queryByText('Hoàn tất đơn hàng của bạn')).not.toBeInTheDocument();
  });

  it('hiển thị form thanh toán khi isOpen=true (step: form)', () => {
    render(<UpgradeModal isOpen={true} onClose={vi.fn()} />);
    expect(screen.getByText('Hoàn tất đơn hàng của bạn')).toBeInTheDocument();
    expect(screen.getByText('Phương thức thanh toán')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('0000 0000 0000 0000')).toBeInTheDocument();
  });

  it('form có trường: cardNumber, expiry, CVV', () => {
    render(<UpgradeModal isOpen={true} onClose={vi.fn()} />);
    expect(screen.getByPlaceholderText('NGUYEN VAN A')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('0000 0000 0000 0000')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('MM/YY')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('•••')).toBeInTheDocument();
  });

  it('nhấn thanh toán mở cổng và hiển thị trạng thái chờ', async () => {
    render(<UpgradeModal isOpen={true} onClose={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: 'Thanh toán ngay →' }));

    await waitFor(() => {
      expect(screen.getByText('Đang chờ xác nhận từ cổng thanh toán...')).toBeInTheDocument();
    });
    expect(window.open).toHaveBeenCalled();
  });

  it('nhận postMessage success thì gọi onPaymentSuccess và onClose', async () => {
    const onClose = vi.fn();
    const onPaymentSuccess = vi.fn(async () => undefined);
    render(<UpgradeModal isOpen={true} onClose={onClose} onPaymentSuccess={onPaymentSuccess} />);

    await act(async () => {
      window.dispatchEvent(new MessageEvent('message', {
        origin: window.location.origin,
        data: { type: 'PAYMENT_RESULT', status: 'success' },
      }));
    });

    await waitFor(() => {
      expect(onPaymentSuccess).toHaveBeenCalledTimes(1);
      expect(onClose).toHaveBeenCalledTimes(1);
    });
  });

  it('nút Đóng gọi onClose', () => {
    const onClose = vi.fn();
    render(<UpgradeModal isOpen={true} onClose={onClose} />);
    fireEvent.click(screen.getByRole('button', { name: 'Đóng' }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
