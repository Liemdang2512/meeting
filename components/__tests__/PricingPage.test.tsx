import React from 'react';
import { render, screen } from '@testing-library/react';
import { vi } from 'vitest';

describe('PricingPage', () => {
  it.todo('hiển thị 3 gói: Free, Pro, Enterprise');
  it.todo('gói Free có nút "Gói hiện tại" bị disabled khi currentUserRole="free"');
  it.todo('gói Pro có nút "Nâng cấp ngay" mở UpgradeModal khi click');
  it.todo('gói Enterprise có nút "Liên hệ"');
  it.todo('UpgradeModal không hiển thị khi mới render (isOpen=false)');
});
