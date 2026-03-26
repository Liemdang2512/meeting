import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi } from 'vitest';

vi.mock('../../lib/auth', () => ({
  register: vi.fn(),
}));

import { RegisterPage } from '../RegisterPage';
import { register } from '../../lib/auth';

// Helper to click the first workflow group card (specialist)
function selectGroup(groupLabel: RegExp) {
  const btn = screen.getByRole('button', { name: groupLabel });
  fireEvent.click(btn);
}

describe('RegisterPage', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it('hien thi form dang ky voi 3 truong', () => {
    render(<RegisterPage onRegisterSuccess={() => {}} onGoToLogin={() => {}} />);

    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^mật khẩu$/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/xác nhận mật khẩu/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /tạo tài khoản/i })).toBeInTheDocument();
  });

  it('hien thi loi khi chua chon nhom nguoi dung', async () => {
    render(<RegisterPage onRegisterSuccess={() => {}} onGoToLogin={() => {}} />);

    fireEvent.change(screen.getByLabelText(/email/i), {
      target: { value: 'user@example.com' },
    });
    fireEvent.change(screen.getByLabelText(/^mật khẩu$/i), {
      target: { value: 'password123' },
    });
    fireEvent.change(screen.getByLabelText(/xác nhận mật khẩu/i), {
      target: { value: 'password123' },
    });

    fireEvent.click(screen.getByRole('button', { name: /tạo tài khoản/i }));

    await waitFor(() => {
      expect(screen.getByText(/chọn ít nhất 1 nhóm/i)).toBeInTheDocument();
    });
    expect(register).not.toHaveBeenCalled();
  });

  it('hien thi loi khi mat khau ngan hon 8 ky tu (truoc khi goi API)', async () => {
    render(<RegisterPage onRegisterSuccess={() => {}} onGoToLogin={() => {}} />);

    // Select a group first to bypass group validation
    selectGroup(/chuyên viên/i);

    fireEvent.change(screen.getByLabelText(/email/i), {
      target: { value: 'user@example.com' },
    });
    fireEvent.change(screen.getByLabelText(/^mật khẩu$/i), {
      target: { value: 'short' },
    });
    fireEvent.change(screen.getByLabelText(/xác nhận mật khẩu/i), {
      target: { value: 'short' },
    });

    fireEvent.click(screen.getByRole('button', { name: /tạo tài khoản/i }));

    await waitFor(() => {
      expect(screen.getByText(/ít nhất 8 ký tự/i)).toBeInTheDocument();
    });
    expect(register).not.toHaveBeenCalled();
  });

  it('hien thi loi khi mat khau khong khop (truoc khi goi API)', async () => {
    render(<RegisterPage onRegisterSuccess={() => {}} onGoToLogin={() => {}} />);

    // Select a group first to bypass group validation
    selectGroup(/chuyên viên/i);

    fireEvent.change(screen.getByLabelText(/email/i), {
      target: { value: 'user@example.com' },
    });
    fireEvent.change(screen.getByLabelText(/^mật khẩu$/i), {
      target: { value: 'password123' },
    });
    fireEvent.change(screen.getByLabelText(/xác nhận mật khẩu/i), {
      target: { value: 'different123' },
    });

    fireEvent.click(screen.getByRole('button', { name: /tạo tài khoản/i }));

    await waitFor(() => {
      expect(screen.getByText(/không khớp/i)).toBeInTheDocument();
    });
    expect(register).not.toHaveBeenCalled();
  });

  it('goi register va onRegisterSuccess khi form hop le', async () => {
    const mockedRegister = register as unknown as ReturnType<typeof vi.fn>;
    mockedRegister.mockResolvedValueOnce(undefined);
    const onRegisterSuccess = vi.fn();

    render(<RegisterPage onRegisterSuccess={onRegisterSuccess} onGoToLogin={() => {}} />);

    // Select specialist group
    selectGroup(/chuyên viên/i);

    fireEvent.change(screen.getByLabelText(/email/i), {
      target: { value: 'newuser@example.com' },
    });
    fireEvent.change(screen.getByLabelText(/^mật khẩu$/i), {
      target: { value: 'securepass123' },
    });
    fireEvent.change(screen.getByLabelText(/xác nhận mật khẩu/i), {
      target: { value: 'securepass123' },
    });

    fireEvent.click(screen.getByRole('button', { name: /tạo tài khoản/i }));

    await waitFor(() => {
      expect(mockedRegister).toHaveBeenCalledWith(
        'newuser@example.com',
        'securepass123',
        'securepass123',
        ['specialist'],
      );
      expect(onRegisterSuccess).toHaveBeenCalled();
    });
  });

  it('hien thi "Dang dang ky..." va disable nut submit khi dang loading', async () => {
    const mockedRegister = register as unknown as ReturnType<typeof vi.fn>;
    mockedRegister.mockImplementation(
      () => new Promise((resolve) => setTimeout(resolve, 200)),
    );

    render(<RegisterPage onRegisterSuccess={() => {}} onGoToLogin={() => {}} />);

    // Select a group first
    selectGroup(/chuyên viên/i);

    fireEvent.change(screen.getByLabelText(/email/i), {
      target: { value: 'user@example.com' },
    });
    fireEvent.change(screen.getByLabelText(/^mật khẩu$/i), {
      target: { value: 'password123' },
    });
    fireEvent.change(screen.getByLabelText(/xác nhận mật khẩu/i), {
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

    render(<RegisterPage onRegisterSuccess={() => {}} onGoToLogin={() => {}} />);

    // Select a group first
    selectGroup(/chuyên viên/i);

    fireEvent.change(screen.getByLabelText(/email/i), {
      target: { value: 'existing@example.com' },
    });
    fireEvent.change(screen.getByLabelText(/^mật khẩu$/i), {
      target: { value: 'password123' },
    });
    fireEvent.change(screen.getByLabelText(/xác nhận mật khẩu/i), {
      target: { value: 'password123' },
    });

    fireEvent.click(screen.getByRole('button', { name: /tạo tài khoản/i }));

    await waitFor(() => {
      expect(screen.getByText(/email đã được sử dụng/i)).toBeInTheDocument();
    });
  });

  it('co link "Da co tai khoan? Dang nhap" goi onGoToLogin', () => {
    const onGoToLogin = vi.fn();
    render(<RegisterPage onRegisterSuccess={() => {}} onGoToLogin={onGoToLogin} />);

    fireEvent.click(screen.getByText(/đã có tài khoản/i));
    expect(onGoToLogin).toHaveBeenCalled();
  });
});
