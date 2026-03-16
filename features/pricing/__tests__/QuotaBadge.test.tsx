import React from 'react';
import { render, screen } from '@testing-library/react';
import { vi } from 'vitest';

vi.mock('../../../lib/api', () => ({
  authFetch: vi.fn(),
}));

describe('QuotaBadge', () => {
  it.todo('không render gì khi quota chưa load (null state)');
  it.todo('hiển thị "Unlimited" khi role !== "free" (unlimited: true)');
  it.todo('hiển thị "Hôm nay: 0/1 lượt" khi used=0, limit=1 (màu xanh)');
  it.todo('hiển thị "Hôm nay: 1/1 lượt" khi used=1, limit=1 (màu amber)');
  it.todo('gọi onQuotaExhausted khi remaining === 0');
  it.todo('re-fetch quota khi nhận được sự kiện "quota-updated" trên window');
});
