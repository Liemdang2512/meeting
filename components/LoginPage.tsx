import React, { useState } from 'react';
import { login } from '../lib/auth';
import { Mail, Lock, Activity, Sparkles, Eye, EyeOff } from 'lucide-react';

interface LoginPageProps {
  onLoginSuccess: () => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({ onLoginSuccess }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

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

  const goToRegister = () => {
    window.history.pushState({}, '', '/register');
    window.dispatchEvent(new PopStateEvent('popstate'));
  };

  return (
    <main className="min-h-screen flex flex-col md:flex-row bg-surface font-body text-on-surface antialiased">
      {/* Left Column: Nebula Gradient Illustration */}
      <section className="hidden md:flex md:w-1/2 nebula-gradient relative items-center justify-center p-12 overflow-hidden">
        {/* Decorative blobs */}
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary-fixed-dim opacity-20 blur-[120px] rounded-full" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-secondary-fixed opacity-30 blur-[100px] rounded-full" />

        <div className="relative z-10 max-w-lg text-center md:text-left">
          {/* Badge */}
          <div className="mb-12 inline-flex items-center gap-3 px-4 py-2 rounded-full bg-white/10 backdrop-blur-md border border-white/10">
            <Sparkles size={18} className="text-white" />
            <span className="text-white text-sm font-medium tracking-wide">MOMAI</span>
          </div>

          {/* Headline */}
          <h1 className="font-headline text-5xl lg:text-7xl font-extrabold text-white leading-[1.1] mb-6 tracking-tight">
            Nâng tầm<br />hiệu suất với AI
          </h1>
          <p className="text-white/80 text-lg lg:text-xl font-medium max-w-md leading-relaxed mb-10">
            Tự động hóa ghi chú cuộc họp và biến những cuộc trò chuyện thành hành động cụ thể. Chào mừng bạn đến với kỷ nguyên mới của làm việc thông minh.
          </p>

          {/* Mock card */}
          <div className="relative group">
            <div className="absolute -inset-1 bg-gradient-to-r from-primary-fixed-dim to-secondary-fixed-dim rounded-2xl blur opacity-25 group-hover:opacity-50 transition duration-1000" />
            <div className="relative bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6 shadow-2xl">
              <div className="flex items-center gap-4 mb-4">
                <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                  <Activity size={20} className="text-primary-fixed-dim" />
                </div>
                <div className="h-2 w-32 bg-white/20 rounded-full" />
              </div>
              <div className="space-y-3">
                <div className="h-2 w-full bg-white/10 rounded-full" />
                <div className="h-2 w-[85%] bg-white/10 rounded-full" />
                <div className="h-2 w-[90%] bg-white/10 rounded-full" />
              </div>
              {/* Minutes Pulse */}
              <div className="mt-8 flex items-center gap-3">
                <div className="flex gap-1 items-center">
                  <div className="w-2 h-2 rounded-full bg-primary-fixed-dim animate-pulse" />
                  <div className="w-2 h-2 rounded-full bg-secondary-fixed-dim animate-pulse" style={{ animationDelay: '0.2s' }} />
                  <div className="w-2 h-2 rounded-full bg-primary-fixed animate-pulse" style={{ animationDelay: '0.4s' }} />
                </div>
                <span className="text-white/60 text-xs font-medium uppercase tracking-widest">MOMAI Listening...</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Right Column: Login Form */}
      <section className="w-full md:w-1/2 flex items-center justify-center p-6 lg:p-20 bg-surface">
        <div className="w-full max-w-md">
          {/* Mobile branding */}
          <div className="md:hidden mb-12 flex justify-center">
            <span className="text-3xl font-headline font-extrabold tracking-tight text-on-surface">MOMAI</span>
          </div>

          <div className="mb-10 text-center md:text-left">
            <h2 className="font-headline text-3xl font-extrabold text-on-surface mb-2 tracking-tight">Chào mừng trở lại</h2>
            <p className="text-on-surface-variant font-medium">Đăng nhập để tiếp tục tối ưu hóa công việc của bạn.</p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Email */}
            <div className="space-y-2">
              <label className="block text-sm font-semibold text-on-surface ml-1" htmlFor="login-email">Email</label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Mail size={18} className="text-outline" />
                </div>
                <input
                  id="login-email"
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  placeholder="name@company.com"
                  className="block w-full pl-11 pr-4 py-3.5 bg-surface-container-low border-none rounded-xl text-on-surface placeholder:text-outline focus:ring-2 focus:ring-primary/20 focus:bg-surface-container-highest transition-all duration-200 outline-none"
                />
              </div>
            </div>

            {/* Password */}
            <div className="space-y-2">
              <div className="flex justify-between items-center ml-1">
                <label className="block text-sm font-semibold text-on-surface" htmlFor="login-password">Mật khẩu</label>
              </div>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Lock size={18} className="text-outline" />
                </div>
                <input
                  id="login-password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  placeholder="••••••••"
                  className="block w-full pl-11 pr-11 py-3.5 bg-surface-container-low border-none rounded-xl text-on-surface placeholder:text-outline focus:ring-2 focus:ring-primary/20 focus:bg-surface-container-highest transition-all duration-200 outline-none"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(v => !v)}
                  className="absolute inset-y-0 right-0 pr-4 flex items-center text-outline hover:text-on-surface transition-colors"
                  aria-label={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {/* Error */}
            {error && (
              <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-600 font-medium flex items-center gap-2">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
                  <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
                {error}
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="w-full nebula-gradient text-white font-bold py-4 rounded-full shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 text-lg disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:scale-100"
            >
              {loading ? 'Đang xác thực...' : 'Đăng nhập'}
            </button>
          </form>

          {/* Divider */}
          <div className="relative my-10">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-outline-variant/30" />
            </div>
            <div className="relative flex justify-center text-xs font-medium uppercase tracking-widest">
              <span className="bg-surface px-4 text-outline">Hoặc đăng nhập với</span>
            </div>
          </div>

          {/* Social Login */}
          <div className="grid grid-cols-2 gap-4">
            <button
              type="button"
              disabled
              title="Sắp ra mắt"
              className="flex items-center justify-center gap-3 py-3 px-4 bg-surface-container-lowest border border-outline-variant/30 rounded-xl hover:bg-surface-container transition-all duration-200 group disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
              </svg>
              <span className="text-sm font-bold text-on-surface group-hover:text-primary transition-colors">Google</span>
            </button>
            <button
              type="button"
              disabled
              title="Sắp ra mắt"
              className="flex items-center justify-center gap-3 py-3 px-4 bg-surface-container-lowest border border-outline-variant/30 rounded-xl hover:bg-surface-container transition-all duration-200 group disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <svg className="w-5 h-5" viewBox="0 0 23 23" xmlns="http://www.w3.org/2000/svg">
                <path d="M1 1h10v10H1z" fill="#f35325"/>
                <path d="M12 1h10v10H12z" fill="#81bc06"/>
                <path d="M1 12h10v10H1z" fill="#05a6f0"/>
                <path d="M12 12h10v10H12z" fill="#ffba08"/>
              </svg>
              <span className="text-sm font-bold text-on-surface group-hover:text-primary transition-colors">Microsoft</span>
            </button>
          </div>

          {/* Footer */}
          <p className="mt-12 text-center text-on-surface-variant font-medium">
            Bạn chưa có tài khoản?{' '}
            <button
              type="button"
              onClick={goToRegister}
              className="text-primary font-bold hover:underline underline-offset-4 ml-1"
            >
              Đăng ký ngay
            </button>
          </p>
          <p className="mt-3 text-center text-xs text-outline">
            Tài khoản admin: liên hệ quản trị viên
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer className="fixed bottom-0 w-full flex justify-end p-6 pointer-events-none md:justify-center">
        <p className="text-[11px] font-medium tracking-widest text-on-surface-variant opacity-40 uppercase">
          © 2026 MOMAI. Secure & Encrypted.
        </p>
      </footer>
    </main>
  );
};
