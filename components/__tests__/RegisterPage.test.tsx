import React from 'react';
import { render, screen } from '@testing-library/react';
import { vi } from 'vitest';

vi.mock('../../lib/auth', () => ({
  register: vi.fn(),
}));

describe('RegisterPage', () => {
  it.todo('hiển thị form đăng ký với 3 trường: Email, Mật khẩu, Xác nhận mật khẩu');
  it.todo('hiển thị lỗi khi mật khẩu ngắn hơn 8 ký tự (client-side, trước khi gọi API)');
  it.todo('hiển thị lỗi khi mật khẩu xác nhận không khớp (client-side)');
  it.todo('gọi register() và onRegisterSuccess khi form hợp lệ');
  it.todo('hiển thị "Đang đăng ký..." và disable nút submit khi đang loading');
  it.todo('hiển thị lỗi từ server khi register() throw');
  it.todo('có link "Đã có tài khoản? Đăng nhập" gọi onGoToLogin');
});
