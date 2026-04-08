import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi } from 'vitest';

vi.mock('../../lib/auth', () => ({
  register: vi.fn(),
  getGoogleOAuthStartUrl: vi.fn(() => '/api/auth/google'),
}));

import { RegisterPage } from '../RegisterPage';
import { register } from '../../lib/auth';

function checkTerms() {
  const checkbox = screen.getByRole('checkbox');
  fireEvent.click(checkbox);
}

describe('RegisterPage', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it('hien thi form dang ky voi 3 truong', () => {
    render(<RegisterPage onGoToLogin={() => {}} />);

    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^mật khẩu$/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^xác nhận$/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /tạo tài khoản/i })).toBeInTheDocument();
  });

  it('hien thi loi khi chua dong y dieu khoan', async () => {
    render(<RegisterPage onGoToLogin={() => {}} />);

    fireEvent.change(screen.getByLabelText(/email/i), {
      target: { value: 'user@example.com' },
    });
    fireEvent.change(screen.getByLabelText(/^mật khẩu$/i), {
      target: { value: 'password123' },
    });
    fireEvent.change(screen.getByLabelText(/^xác nhận$/i), {
      target: { value: 'password123' },
    });

    // Do NOT check terms
    fireEvent.click(screen.getByRole('button', { name: /tạo tài khoản/i }));

    await waitFor(() => {
      expect(screen.getByText(/vui lòng đồng ý/i)).toBeInTheDocument();
    });
    expect(register).not.toHaveBeenCalled();
  });

  it('hien thi loi khi mat khau ngan hon 8 ky tu (truoc khi goi API)', async () => {
    render(<RegisterPage onGoToLogin={() => {}} />);

    checkTerms();

    fireEvent.change(screen.getByLabelText(/email/i), {
      target: { value: 'user@example.com' },
    });
    fireEvent.change(screen.getByLabelText(/^mật khẩu$/i), {
      target: { value: 'short' },
    });
    fireEvent.change(screen.getByLabelText(/^xác nhận$/i), {
      target: { value: 'short' },
    });

    fireEvent.click(screen.getByRole('button', { name: /tạo tài khoản/i }));

    await waitFor(() => {
      expect(screen.getByText(/ít nhất 8 ký tự/i)).toBeInTheDocument();
    });
    expect(register).not.toHaveBeenCalled();
  });

  it('hien thi loi khi mat khau khong khop (truoc khi goi API)', async () => {
    render(<RegisterPage onGoToLogin={() => {}} />);

    checkTerms();

    fireEvent.change(screen.getByLabelText(/email/i), {
      target: { value: 'user@example.com' },
    });
    fireEvent.change(screen.getByLabelText(/^mật khẩu$/i), {
      target: { value: 'password123' },
    });
    fireEvent.change(screen.getByLabelText(/^xác nhận$/i), {
      target: { value: 'different123' },
    });

    fireEvent.click(screen.getByRole('button', { name: /tạo tài khoản/i }));

    await waitFor(() => {
      expect(screen.getByText(/không khớp/i)).toBeInTheDocument();
    });
    expect(register).not.toHaveBeenCalled();
  });

  it('sau dang ky thanh cong hien hop thu va khong tu dong dang nhap', async () => {
    const mockedRegister = register as unknown as ReturnType<typeof vi.fn>;
    mockedRegister.mockResolvedValueOnce({
      ok: true,
      message: 'Đã gửi email xác nhận. Vui lòng kiểm tra hộp thư.',
    });
    const onGoToLoginSpy = vi.fn();

    render(<RegisterPage onGoToLogin={onGoToLoginSpy} />);

    checkTerms();

    fireEvent.change(screen.getByLabelText(/email/i), {
      target: { value: 'newuser@example.com' },
    });
    fireEvent.change(screen.getByLabelText(/^mật khẩu$/i), {
      target: { value: 'securepass123' },
    });
    fireEvent.change(screen.getByLabelText(/^xác nhận$/i), {
      target: { value: 'securepass123' },
    });

    fireEvent.click(screen.getByRole('button', { name: /tạo tài khoản/i }));

    await waitFor(() => {
      expect(mockedRegister).toHaveBeenCalledWith(
        'newuser@example.com',
        'securepass123',
        'securepass123',
      );
      expect(screen.getByText('Kiểm tra hộp thư', { exact: true })).toBeInTheDocument();
    });
    expect(onGoToLoginSpy).not.toHaveBeenCalled();
    expect(localStorage.getItem('auth_token')).toBeNull();
  });

  it('hien thi "Dang dang ky..." va disable nut submit khi dang loading', async () => {
    const mockedRegister = register as unknown as ReturnType<typeof vi.fn>;
    mockedRegister.mockImplementation(
      () =>
        new Promise((resolve) =>
          setTimeout(() => resolve({ ok: true, message: 'Đã gửi email.' }), 200),
        ),
    );

    render(<RegisterPage onGoToLogin={() => {}} />);

    checkTerms();

    fireEvent.change(screen.getByLabelText(/email/i), {
      target: { value: 'user@example.com' },
    });
    fireEvent.change(screen.getByLabelText(/^mật khẩu$/i), {
      target: { value: 'password123' },
    });
    fireEvent.change(screen.getByLabelText(/^xác nhận$/i), {
      target: { value: 'password123' },
    });

    fireEvent.click(screen.getByRole('button', { name: /tạo tài khoản/i }));

    await waitFor(() => {
      expect(screen.getByText(/đang đăng ký/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /đang đăng ký/i })).toBeDisabled();
    });
  });

  it('hien thi loi tu server khi dang ky that bai', async () => {
    const mockedRegister = register as unknown as ReturnType<typeof vi.fn>;
    mockedRegister.mockRejectedValueOnce(new Error('Email đã được sử dụng'));

    render(<RegisterPage onGoToLogin={() => {}} />);

    checkTerms();

    fireEvent.change(screen.getByLabelText(/email/i), {
      target: { value: 'existing@example.com' },
    });
    fireEvent.change(screen.getByLabelText(/^mật khẩu$/i), {
      target: { value: 'password123' },
    });
    fireEvent.change(screen.getByLabelText(/^xác nhận$/i), {
      target: { value: 'password123' },
    });

    fireEvent.click(screen.getByRole('button', { name: /tạo tài khoản/i }));

    await waitFor(() => {
      expect(screen.getByText(/email đã được sử dụng/i)).toBeInTheDocument();
    });
  });

  it('co link "Da co tai khoan? Dang nhap" goi onGoToLogin', () => {
    const onGoToLogin = vi.fn();
    render(<RegisterPage onGoToLogin={onGoToLogin} />);

    fireEvent.click(screen.getByRole('button', { name: /đăng nhập ngay/i }));
    expect(onGoToLogin).toHaveBeenCalled();
  });
});
