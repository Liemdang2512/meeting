import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { vi } from 'vitest';
import { PricingPage } from '../../features/pricing/PricingPage';

describe('PricingPage', () => {
  it('hiển thị 3 gói: Free, Pro, Enterprise', () => {
    render(<PricingPage />);
    expect(screen.getByText('Free')).toBeInTheDocument();
    expect(screen.getByText('Pro')).toBeInTheDocument();
    expect(screen.getByText('Enterprise')).toBeInTheDocument();
  });

  it('gói Free có nút "Gói hiện tại" bị disabled khi currentUserRole="free"', () => {
    render(<PricingPage currentUserRole="free" />);
    const btn = screen.getAllByRole('button').find(b => b.textContent === 'Gói hiện tại');
    expect(btn).toBeTruthy();
    expect(btn).toBeDisabled();
  });

  it('gói Pro có nút "Nâng cấp ngay" mở UpgradeModal khi click', () => {
    render(<PricingPage currentUserRole="free" />);
    const upgradeBtn = screen.getByRole('button', { name: 'Nâng cấp ngay' });
    expect(upgradeBtn).toBeInTheDocument();
    fireEvent.click(upgradeBtn);
    // After click, UpgradeModal should be open - check for modal content
    expect(screen.getByText('Nâng cấp lên Pro')).toBeInTheDocument();
  });

  it('gói Enterprise có nút "Liên hệ"', () => {
    render(<PricingPage />);
    const contactBtn = screen.getByRole('button', { name: 'Liên hệ' });
    expect(contactBtn).toBeInTheDocument();
  });

  it('UpgradeModal không hiển thị khi mới render (isOpen=false)', () => {
    render(<PricingPage />);
    expect(screen.queryByText('Nâng cấp lên Pro')).not.toBeInTheDocument();
  });
});
