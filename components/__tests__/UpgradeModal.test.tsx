import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { vi } from 'vitest';
import { UpgradeModal } from '../../features/pricing/UpgradeModal';

describe('UpgradeModal', () => {
  it('không render gì khi isOpen=false', () => {
    render(<UpgradeModal isOpen={false} onClose={vi.fn()} />);
    expect(screen.queryByText('Nâng cấp lên Pro')).not.toBeInTheDocument();
  });

  it('hiển thị form thanh toán khi isOpen=true (step: form)', () => {
    render(<UpgradeModal isOpen={true} onClose={vi.fn()} />);
    expect(screen.getByText('Nâng cấp lên Pro')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('1234 5678 9012 3456')).toBeInTheDocument();
  });

  it('form có trường: cardNumber, expiry, CVV', () => {
    render(<UpgradeModal isOpen={true} onClose={vi.fn()} />);
    expect(screen.getByPlaceholderText('1234 5678 9012 3456')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('MM/YY')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('CVV')).toBeInTheDocument();
  });

  it('submit form → hiển thị "Đang xử lý..." (step: processing)', async () => {
    vi.useFakeTimers();
    render(<UpgradeModal isOpen={true} onClose={vi.fn()} />);
    fireEvent.change(screen.getByPlaceholderText('1234 5678 9012 3456'), { target: { value: '1234' } });
    fireEvent.change(screen.getByPlaceholderText('MM/YY'), { target: { value: '12/25' } });
    fireEvent.change(screen.getByPlaceholderText('CVV'), { target: { value: '123' } });
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Thanh toán' }));
    });
    expect(screen.getByText('Đang xử lý...')).toBeInTheDocument();
    vi.useRealTimers();
  });

  it('sau 2 giây → hiển thị "Thanh toán thành công!" (step: success)', async () => {
    vi.useFakeTimers();
    render(<UpgradeModal isOpen={true} onClose={vi.fn()} />);
    fireEvent.change(screen.getByPlaceholderText('1234 5678 9012 3456'), { target: { value: '1234' } });
    fireEvent.change(screen.getByPlaceholderText('MM/YY'), { target: { value: '12/25' } });
    fireEvent.change(screen.getByPlaceholderText('CVV'), { target: { value: '123' } });
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Thanh toán' }));
    });
    expect(screen.getByText('Đang xử lý...')).toBeInTheDocument();
    await act(async () => {
      vi.runAllTimers();
    });
    expect(screen.getByText('Thanh toán thành công!')).toBeInTheDocument();
    vi.useRealTimers();
  });

  it('nút Đóng trong success state gọi onClose và reset về form', async () => {
    vi.useFakeTimers();
    const onClose = vi.fn();
    render(<UpgradeModal isOpen={true} onClose={onClose} />);
    fireEvent.change(screen.getByPlaceholderText('1234 5678 9012 3456'), { target: { value: '1234' } });
    fireEvent.change(screen.getByPlaceholderText('MM/YY'), { target: { value: '12/25' } });
    fireEvent.change(screen.getByPlaceholderText('CVV'), { target: { value: '123' } });
    fireEvent.click(screen.getByRole('button', { name: 'Thanh toán' }));
    await act(async () => {
      vi.advanceTimersByTime(2000);
    });
    expect(screen.getByText('Thanh toán thành công!')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Đóng' }));
    expect(onClose).toHaveBeenCalledTimes(1);
    vi.useRealTimers();
  });
});
