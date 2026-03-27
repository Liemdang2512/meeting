import React, { useState } from 'react';
import { login } from '../lib/auth';
import { AuthShell } from './auth/AuthShell';

interface LoginPageProps {
  onLoginSuccess: () => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({ onLoginSuccess }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await login(email.trim(), password);
      onLoginSuccess();
    } catch (err: any) {
      if (err?.message === 'Invalid login credentials') {
        setError('Email hoặc mật khẩu không đúng.');
      } else if (err?.message) {
        setError(err.message);
      } else {
        setError('Không thể đăng nhập. Vui lòng thử lại.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell
      title={
        <>
          Meeting
          <br />
          Minute
        </>
      }
      subtitle="Tự động hóa biên bản"
      showBackHome
      footer={
        <div className="space-y-3">
          <div className="text-center">
            <button
              type="button"
              onClick={() => {
                window.history.pushState({}, '', '/register');
                window.dispatchEvent(new PopStateEvent('popstate'));
              }}
              className="text-sm text-[#1E40AF] hover:text-[#1E3A8A] font-medium transition-colors"
            >
              Chưa có tài khoản? Đăng ký miễn phí
            </button>
          </div>
          <p className="text-xs text-slate-400 text-center font-medium">
            Tài khoản admin: liên hệ quản trị viên
          </p>
        </div>
      }
    >
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <label
              htmlFor="login-email"
              className="block text-sm font-medium text-slate-800"
            >
              Email
            </label>
            <input
              id="login-email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full h-10 px-3 border border-slate-200 rounded-lg focus:border-[#1E40AF] focus:ring-1 focus:ring-[#1E40AF] outline-none bg-slate-50 focus:bg-white text-slate-800 font-medium transition-colors placeholder:text-gray-400"
              placeholder="name@company.com"
            />
          </div>

          <div className="space-y-2">
            <label
              htmlFor="login-password"
              className="block text-sm font-medium text-slate-800"
            >
              Mật khẩu
            </label>
            <input
              id="login-password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full h-10 px-3 border border-slate-200 rounded-lg focus:border-[#1E40AF] focus:ring-1 focus:ring-[#1E40AF] outline-none bg-slate-50 focus:bg-white text-slate-800 font-medium transition-colors placeholder:text-gray-400"
              placeholder="••••••••"
            />
          </div>

          {error && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-600 font-medium flex items-center gap-2 justify-center">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-[#1E3A8A] text-white font-medium text-base rounded-xl shadow-sm hover:bg-[#1E40AF] transition-colors disabled:opacity-50 disabled:cursor-not-allowed mt-4"
          >
            {loading ? 'Đang xác thực...' : 'Đăng nhập'}
          </button>
        </form>
    </AuthShell>
  );
};

