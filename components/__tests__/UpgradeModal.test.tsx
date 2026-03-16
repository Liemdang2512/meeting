import React from 'react';
import { render, screen } from '@testing-library/react';
import { vi } from 'vitest';

describe('UpgradeModal', () => {
  it.todo('không render gì khi isOpen=false');
  it.todo('hiển thị form thanh toán khi isOpen=true (step: form)');
  it.todo('form có trường: cardNumber, expiry, CVV');
  it.todo('submit form → hiển thị "Đang xử lý..." (step: processing)');
  it.todo('sau 2 giây → hiển thị "Thanh toán thành công!" (step: success)');
  it.todo('nút Đóng trong success state gọi onClose và reset về form');
});
