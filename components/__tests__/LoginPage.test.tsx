import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi } from 'vitest';

vi.mock('../../lib/auth', () => {
  return {
    login: vi.fn(),
    getGoogleOAuthStartUrl: vi.fn(() => '/api/auth/google'),
  };
});

import { LoginPage } from '../LoginPage';
import { login, getGoogleOAuthStartUrl } from '../../lib/auth';

describe('LoginPage', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it('hiển thị form đăng nhập cơ bản', () => {
    render(<LoginPage onLoginSuccess={() => {}} />);

    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^mật khẩu$/i)).toBeInTheDocument();
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
    fireEvent.change(screen.getByLabelText(/^mật khẩu$/i), {
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
    fireEvent.change(screen.getByLabelText(/^mật khẩu$/i), {
      target: { value: 'wrong' },
    });

    fireEvent.click(screen.getByRole('button', { name: /đăng nhập/i }));

    await waitFor(() => {
      expect(
        screen.getByText(/email hoặc mật khẩu không đúng/i),
      ).toBeInTheDocument();
    });
  });

  it('nút Google gán href tới URL OAuth', () => {
    const mockGet = getGoogleOAuthStartUrl as unknown as ReturnType<typeof vi.fn>;
    mockGet.mockReturnValue('/api/auth/google');
    // jsdom: replace location để đọc được gán href
    const old = window.location;
    // @ts-expect-error test-only
    delete window.location;
    // @ts-expect-error test-only
    window.location = { ...old, href: '' } as Location;

    render(<LoginPage onLoginSuccess={() => {}} />);
    fireEvent.click(screen.getByRole('button', { name: /google/i }));
    expect(window.location.href).toBe('/api/auth/google');

    // @ts-expect-error restore
    window.location = old;
  });

  it('hiển thị thông báo khi email chưa xác nhận (403)', async () => {
    const mockedLogin = login as unknown as ReturnType<typeof vi.fn>;
    mockedLogin.mockRejectedValueOnce(new Error('Vui lòng xác nhận email trước khi đăng nhập.'));

    render(<LoginPage onLoginSuccess={() => {}} />);

    fireEvent.change(screen.getByLabelText(/email/i), {
      target: { value: 'pending@example.com' },
    });
    fireEvent.change(screen.getByLabelText(/^mật khẩu$/i), {
      target: { value: 'password123' },
    });
    fireEvent.click(screen.getByRole('button', { name: /đăng nhập/i }));

    await waitFor(() => {
      expect(
        screen.getByText(/Vui lòng xác nhận email trước khi đăng nhập/i),
      ).toBeInTheDocument();
    });
  });

  it('hiển thị banner khi verified=1 trên URL', () => {
    window.history.pushState({}, '', '/login?verified=1');
    render(<LoginPage onLoginSuccess={() => {}} />);
    expect(screen.getByText(/Email đã được xác nhận. Bạn có thể đăng nhập./i)).toBeInTheDocument();
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
    fireEvent.change(screen.getByLabelText(/^mật khẩu$/i), {
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
