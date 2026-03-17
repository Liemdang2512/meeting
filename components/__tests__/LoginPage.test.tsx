import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi } from 'vitest';

vi.mock('../../lib/auth', () => {
  return {
    login: vi.fn(),
  };
});

import { LoginPage } from '../LoginPage';
import { login } from '../../lib/auth';

describe('LoginPage', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it('hiển thị form đăng nhập cơ bản', () => {
    render(<LoginPage onLoginSuccess={() => {}} />);

    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/mật khẩu/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /đăng nhập/i })).toBeInTheDocument();
  });

  it('gọi login với email và mật khẩu đúng', async () => {
    const mockedLogin = login as unknown as ReturnType<typeof vi.fn>;
    mockedLogin.mockResolvedValueOnce(undefined);
    const onLoginSuccess = vi.fn();

    render(<LoginPage onLoginSuccess={onLoginSuccess} />);

    fireEvent.change(screen.getByLabelText(/email/i), {
      target: { value: 'user@example.com' },
    });
    fireEvent.change(screen.getByLabelText(/mật khẩu/i), {
      target: { value: 'password123' },
    });

    fireEvent.click(screen.getByRole('button', { name: /đăng nhập/i }));

    await waitFor(() => {
      expect(mockedLogin).toHaveBeenCalledWith(
        'user@example.com',
        'password123',
      );
      expect(onLoginSuccess).toHaveBeenCalled();
    });
  });

  it('hiển thị thông báo khi thông tin đăng nhập sai', async () => {
    const error = new Error('Invalid login credentials');
    const mockedLogin = login as unknown as ReturnType<typeof vi.fn>;
    mockedLogin.mockRejectedValueOnce(error);

    render(<LoginPage onLoginSuccess={() => {}} />);

    fireEvent.change(screen.getByLabelText(/email/i), {
      target: { value: 'wrong@example.com' },
    });
    fireEvent.change(screen.getByLabelText(/mật khẩu/i), {
      target: { value: 'wrong' },
    });

    fireEvent.click(screen.getByRole('button', { name: /đăng nhập/i }));

    await waitFor(() => {
      expect(
        screen.getByText(/email hoặc mật khẩu không đúng/i),
      ).toBeInTheDocument();
    });
  });

  it('không double-submit khi đang loading', async () => {
    const mockedLogin = login as unknown as ReturnType<typeof vi.fn>;
    mockedLogin.mockImplementation(
      () => new Promise((resolve) => setTimeout(resolve, 100)),
    );

    render(<LoginPage onLoginSuccess={() => {}} />);

    fireEvent.change(screen.getByLabelText(/email/i), {
      target: { value: 'user@example.com' },
    });
    fireEvent.change(screen.getByLabelText(/mật khẩu/i), {
      target: { value: 'password123' },
    });

    const button = screen.getByRole('button', { name: /đăng nhập/i });
    fireEvent.click(button);
    fireEvent.click(button);

    await waitFor(() => {
      expect(mockedLogin).toHaveBeenCalledTimes(1);
    });
  });
});
