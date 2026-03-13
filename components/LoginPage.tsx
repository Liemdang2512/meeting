import React, { useState } from 'react';
import { login } from '../lib/auth';

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
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
      <div className="max-w-md w-full bg-white border border-slate-200 p-8 space-y-8 shadow-sm rounded-xl">
        <div className="text-center space-y-4">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-indigo-600 text-white font-sans font-medium text-3xl mb-2 rounded-xl transition-all shadow-sm">
            MA
          </div>
          <h1 className="text-4xl font-sans font-medium text-slate-800 leading-none">
            Meeting<br/>Assistant
          </h1>
          <p className="text-slate-500 text-sm font-medium border-b border-slate-200 pb-4 inline-block">
            Tự động hóa biên bản
          </p>
        </div>

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
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full px-4 py-3 border border-slate-200 rounded-lg focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none bg-slate-50 focus:bg-white text-slate-800 font-medium transition-colors"
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
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full px-4 py-3 border border-slate-200 rounded-lg focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none bg-slate-50 focus:bg-white text-slate-800 font-medium transition-colors"
              placeholder="••••••••"
            />
          </div>

          {error && (
            <div className="p-4 bg-red-50 border-red-200 rounded-lg text-red-600 font-medium text-center">
              ⚠ {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 bg-indigo-600 text-white font-sans font-medium text-lg rounded-xl shadow-sm hover:bg-indigo-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed mt-4"
          >
            {loading ? 'Đang xác thực...' : 'Đăng nhập'}
          </button>
        </form>

        <div className="pt-4 border-t border-slate-200">
          <p className="text-xs text-slate-400 text-center font-medium">
            Liên hệ quản trị viên để cấp quyền truy cập
          </p>
        </div>
      </div>
    </div>
  );
};

