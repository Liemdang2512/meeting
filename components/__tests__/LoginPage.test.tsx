import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi } from 'vitest';

vi.mock('../../lib/supabase', () => {
  return {
    signInWithEmail: vi.fn(),
  };
});

import { LoginPage } from '../LoginPage';
import { signInWithEmail } from '../../lib/supabase';

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

  it('gọi signInWithEmail với email và mật khẩu đúng', async () => {
    const mockedSignInWithEmail = signInWithEmail as unknown as ReturnType<
      typeof vi.fn
    >;
    mockedSignInWithEmail.mockResolvedValueOnce(undefined);
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
      expect(mockedSignInWithEmail).toHaveBeenCalledWith(
        'user@example.com',
        'password123',
      );
      expect(onLoginSuccess).toHaveBeenCalled();
    });
  });

  it('hiển thị thông báo khi thông tin đăng nhập sai', async () => {
    const error = new Error('Invalid login credentials');
    const mockedSignInWithEmail = signInWithEmail as unknown as ReturnType<
      typeof vi.fn
    >;
    mockedSignInWithEmail.mockRejectedValueOnce(error);

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
    const mockedSignInWithEmail = signInWithEmail as unknown as ReturnType<
      typeof vi.fn
    >;
    mockedSignInWithEmail.mockImplementation(
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
      expect(mockedSignInWithEmail).toHaveBeenCalledTimes(1);
    });
  });
});

