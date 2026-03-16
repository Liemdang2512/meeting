import React, { useState } from 'react';
import { register } from '../lib/auth';

interface RegisterPageProps {
  onRegisterSuccess: () => void;
  onGoToLogin: () => void;
}

export const RegisterPage: React.FC<RegisterPageProps> = ({ onRegisterSuccess, onGoToLogin }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Client-side validation
    if (password.length < 8) {
      setError('Mật khẩu phải có ít nhất 8 ký tự');
      return;
    }
    if (password !== confirmPassword) {
      setError('Mật khẩu xác nhận không khớp');
      return;
    }

    setLoading(true);
    try {
      await register(email.trim(), password, confirmPassword);
      onRegisterSuccess();
    } catch (err: any) {
      setError(err?.message || 'Không thể đăng ký. Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
      <div className="max-w-md w-full bg-white border border-slate-200 p-8 space-y-8 shadow-sm rounded-xl">
        <div className="text-center space-y-4">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-indigo-600 text-white font-sans font-medium text-3xl mb-2 rounded-xl transition-all shadow-sm">
            MA
          </div>
          <h1 className="text-4xl font-sans font-medium text-slate-800 leading-none">
            Đăng ký<br/>tài khoản
          </h1>
          <p className="text-slate-500 text-sm font-medium border-b border-slate-200 pb-4 inline-block">
            Miễn phí · 1 chuyển đổi/ngày
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <label htmlFor="reg-email" className="block text-sm font-medium text-slate-800">Email</label>
            <input
              id="reg-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full px-4 py-3 border border-slate-200 rounded-lg focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none bg-slate-50 focus:bg-white text-slate-800 font-medium transition-colors"
              placeholder="name@company.com"
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="reg-password" className="block text-sm font-medium text-slate-800">Mật khẩu</label>
            <input
              id="reg-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full px-4 py-3 border border-slate-200 rounded-lg focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none bg-slate-50 focus:bg-white text-slate-800 font-medium transition-colors"
              placeholder="Tối thiểu 8 ký tự"
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="reg-confirm" className="block text-sm font-medium text-slate-800">Xác nhận mật khẩu</label>
            <input
              id="reg-confirm"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              className="w-full px-4 py-3 border border-slate-200 rounded-lg focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none bg-slate-50 focus:bg-white text-slate-800 font-medium transition-colors"
              placeholder="Nhập lại mật khẩu"
            />
          </div>

          {error && (
            <div className="p-4 bg-red-50 border-red-200 rounded-lg text-red-600 font-medium text-center">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 bg-indigo-600 text-white font-sans font-medium text-lg rounded-xl shadow-sm hover:bg-indigo-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed mt-4"
          >
            {loading ? 'Đang đăng ký...' : 'Tạo tài khoản'}
          </button>
        </form>

        <div className="pt-4 border-t border-slate-200 text-center">
          <button
            type="button"
            onClick={onGoToLogin}
            className="text-sm text-indigo-600 hover:text-indigo-800 font-medium transition-colors"
          >
            Đã có tài khoản? Đăng nhập
          </button>
        </div>
      </div>
    </div>
  );
};
