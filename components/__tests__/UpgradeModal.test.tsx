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
    expect(screen.getByText('Chuyển khoản')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Tạo mã QR →' })).toBeInTheDocument();
  });

  it('tab chuyển khoản hiển thị hướng dẫn VietQR', () => {
    render(<UpgradeModal isOpen={true} onClose={vi.fn()} />);
    expect(screen.getByRole('button', { name: 'Tạo mã QR →' })).toBeInTheDocument();
    expect(
      screen.getByText(/Hỗ trợ tất cả ngân hàng Việt Nam qua VietQR/i),
    ).toBeInTheDocument();
  });

  it('nhấn Tạo mã QR gọi API và hiển thị trạng thái chờ xác nhận', async () => {
    const fetchMock = vi.fn(async () => ({
      ok: true,
      json: async () => ({
        orderId: 'ord_test_1',
        qrImageUrl: 'https://example.com/qr.png',
        amount: 299000,
        accountNo: '123456',
        accountName: 'CONG TY TEST',
        bankBin: '970436',
        transferContent: 'TEST CK',
        expiresAt: new Date().toISOString(),
      }),
    })) as unknown as typeof fetch;
    vi.stubGlobal('fetch', fetchMock);

    render(<UpgradeModal isOpen={true} onClose={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: 'Tạo mã QR →' }));

    await waitFor(() => {
      expect(screen.getByText('Đang chờ xác nhận thanh toán...')).toBeInTheDocument();
    });
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/payments/vietqr/create',
      expect.objectContaining({ method: 'POST' }),
    );
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
