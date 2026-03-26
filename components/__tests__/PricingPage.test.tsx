import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { vi } from 'vitest';
import { PricingPage } from '../../features/pricing/PricingPage';

describe('PricingPage', () => {
  it('hiển thị 3 gói: Phóng viên, Chuyên viên, Cán bộ', () => {
    render(<PricingPage />);
    expect(screen.getByText('Phóng viên')).toBeInTheDocument();
    expect(screen.getByText('Chuyên viên')).toBeInTheDocument();
    expect(screen.getByText('Cán bộ')).toBeInTheDocument();
  });

  it('currentUserRole="free" không được tính là đã đăng ký gói trả phí', () => {
    render(<PricingPage currentUserRole="free" />);
    expect(screen.queryByRole('button', { name: 'Gói hiện tại' })).not.toBeInTheDocument();
  });

  it('gói Chuyên viên có nút "Nâng cấp ngay" mở UpgradeModal khi click', () => {
    render(<PricingPage currentUserRole="free" />);
    const upgradeBtn = screen.getAllByRole('button', { name: 'Nâng cấp ngay' })[1];
    expect(upgradeBtn).toBeTruthy();
    fireEvent.click(upgradeBtn);
    // After click, UpgradeModal should be open - check for modal content
    expect(screen.getByText('Nâng cấp lên Pro')).toBeInTheDocument();
  });

  it('currentUserRole="pro" được tính là đang dùng gói Chuyên viên', () => {
    render(<PricingPage currentUserRole="pro" />);
    const btn = screen.getByRole('button', { name: 'Gói hiện tại' });
    expect(btn).toBeInTheDocument();
    expect(btn).toBeDisabled();
  });

  it('khi currentUserRole="free" thì cả 3 gói đều là "Nâng cấp ngay"', () => {
    render(<PricingPage currentUserRole="free" />);
    const upgradeButtons = screen.getAllByRole('button', { name: 'Nâng cấp ngay' });
    expect(upgradeButtons).toHaveLength(3);
  });

  it('UpgradeModal không hiển thị khi mới render (isOpen=false)', () => {
    render(<PricingPage />);
    expect(screen.queryByText('Nâng cấp lên Pro')).not.toBeInTheDocument();
  });
});
