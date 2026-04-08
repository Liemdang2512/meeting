import React, { useRef, useState } from 'react';
import { register, getGoogleOAuthStartUrl } from '../lib/auth';
import { Mail, AlertCircle, Eye, EyeOff } from 'lucide-react';

interface RegisterPageProps {
  onGoToLogin: () => void;
}

export const RegisterPage: React.FC<RegisterPageProps> = ({ onGoToLogin }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [registrationComplete, setRegistrationComplete] = useState(false);
  const [registeredMessage, setRegisteredMessage] = useState<string | null>(null);
  const submitLockRef = useRef(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitLockRef.current) return;
    submitLockRef.current = true;
    setError(null);

    const termsChecked = (document.getElementById('terms') as HTMLInputElement)?.checked;
    if (!termsChecked) {
      setError('Vui lòng đồng ý với Điều khoản dịch vụ để tiếp tục');
      submitLockRef.current = false;
      return;
    }
    if (password.length < 8) {
      setError('Mật khẩu phải có ít nhất 8 ký tự');
      submitLockRef.current = false;
      return;
    }
    if (password !== confirmPassword) {
      setError('Mật khẩu xác nhận không khớp');
      submitLockRef.current = false;
      return;
    }

    setLoading(true);
    try {
      const result = await register(email.trim(), password, confirmPassword);
      setRegisteredMessage(result.message);
      setRegistrationComplete(true);
      setError(null);
    } catch (err: any) {
      setError(err?.message || 'Không thể đăng ký. Vui lòng thử lại.');
    } finally {
      setLoading(false);
      submitLockRef.current = false;
    }
  };

  const goToHome = () => {
    window.history.pushState({}, '', '/');
    window.dispatchEvent(new PopStateEvent('popstate'));
  };

  return (
    <main className="min-h-screen flex flex-col md:flex-row overflow-hidden bg-surface font-body text-on-surface antialiased">
      {/* Left Side: Visual Illustration Column */}
      <section className="hidden md:flex md:w-1/2 nebula-gradient relative items-center justify-center p-12 overflow-hidden">
        {/* Decorative blobs */}
        <div className="absolute top-[-15%] left-[-10%] w-[50%] h-[50%] bg-primary-fixed-dim opacity-20 blur-[120px] rounded-full pointer-events-none" />
        <div className="absolute bottom-[-15%] right-[-10%] w-[60%] h-[60%] bg-secondary-fixed opacity-25 blur-[100px] rounded-full pointer-events-none" />
        <div className="relative z-10 max-w-lg text-center">
          <div className="mb-12">
            <h1 className="font-headline text-5xl font-extrabold text-on-primary tracking-tight leading-tight mb-6">
              Biến âm thanh thành tri thức
            </h1>
            <p className="text-on-primary/80 text-lg font-medium max-w-md mx-auto">
              Khám phá sức mạnh của AI trong việc tóm tắt, phân tích và lưu trữ những cuộc hội thoại quan trọng nhất của bạn.
            </p>
          </div>
          {/* Abstract Visual: pulse blobs */}
          <div className="flex items-center justify-center gap-4 py-8">
            <div className="w-16 h-16 rounded-full bg-primary-fixed-dim/40 blur-xl animate-pulse" />
            <div className="w-24 h-24 rounded-full bg-secondary-fixed/50 blur-2xl animate-pulse" style={{ animationDelay: '0.5s' }} />
            <div className="w-16 h-16 rounded-full bg-primary-fixed-dim/40 blur-xl animate-pulse" style={{ animationDelay: '1s' }} />
          </div>
          {/* Featured Card UI Mockup */}
          <div className="glass-panel rounded-xl p-6 text-left shadow-2xl mt-8 border border-white/20">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full nebula-gradient flex items-center justify-center">
                <svg className="w-5 h-5 text-white fill-current" viewBox="0 0 24 24"><path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm-1-9c0-.55.45-1 1-1s1 .45 1 1v6c0 .55-.45 1-1 1s-1-.45-1-1V5z"/><path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z"/></svg>
              </div>
              <div>
                <div className="h-3 w-32 bg-on-surface/10 rounded-full mb-2" />
                <div className="h-2 w-20 bg-on-surface/5 rounded-full" />
              </div>
            </div>
            <div className="space-y-3">
              <div className="h-2 w-full bg-on-surface/5 rounded-full" />
              <div className="h-2 w-5/6 bg-on-surface/5 rounded-full" />
              <div className="h-2 w-4/6 bg-on-surface/10 rounded-full" />
            </div>
          </div>
        </div>
      </section>

      {/* Right Side: Form Column */}
      <section className="flex-1 flex flex-col justify-center items-center px-6 py-12 md:px-24 bg-surface">
        <div className="w-full max-w-md">
          {/* Brand Anchor */}
          <div className="mb-10">
            <div className="mb-6 flex justify-center md:justify-start">
              <button
                type="button"
                onClick={goToHome}
                className="flex items-center gap-3 rounded-lg transition-opacity hover:opacity-90"
              >
                <img
                  src="/NAI.png"
                  alt="MOMAI Logo"
                  className="w-12 h-12 object-contain rounded-xl"
                />
                <div className="text-left">
                  <p className="text-lg tracking-[0.18em] uppercase text-[#4f5e86] font-semibold">Meeting Minute</p>
                </div>
              </button>
            </div>
            <h3 className="font-body text-xl font-semibold text-on-surface-variant text-center md:text-left">Tạo tài khoản mới</h3>
          </div>

          {registrationComplete ? (
            <div className="mb-8 p-5 rounded-xl bg-primary/10 border border-primary/20 text-on-surface">
              <p className="font-semibold text-lg mb-2">Kiểm tra hộp thư</p>
              <p className="text-on-surface-variant mb-4">
                {registeredMessage ?? 'Chúng tôi đã gửi liên kết xác nhận tới email của bạn. Sau khi xác nhận, bạn có thể đăng nhập.'}
              </p>
              <button
                type="button"
                onClick={onGoToLogin}
                className="w-full nebula-gradient py-3 rounded-full text-white font-bold shadow-md hover:opacity-95 transition-opacity"
              >
                Đến trang đăng nhập
              </button>
            </div>
          ) : (
            <>
          {/* Social Registration */}
          <div className="grid grid-cols-2 gap-4 mb-8">
            <button
              type="button"
              onClick={() => {
                window.location.href = getGoogleOAuthStartUrl();
              }}
              className="flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-surface-container-low text-on-surface font-medium border border-outline-variant/15 hover:bg-surface-container-highest transition-colors"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              <span className="text-sm">Google</span>
            </button>
            <button
              type="button"
              disabled
              title="Sắp ra mắt"
              className="flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-surface-container-low text-on-surface font-medium border border-outline-variant/15 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path fill="#F25022" d="M1 1h10v10H1z"/>
                <path fill="#7FBA00" d="M13 1h10v10H13z"/>
                <path fill="#00A4EF" d="M1 13h10v10H1z"/>
                <path fill="#FFB900" d="M13 13h10v10H13z"/>
              </svg>
              <span className="text-sm">Microsoft</span>
            </button>
          </div>

          {/* Divider */}
          <div className="relative flex items-center mb-8">
            <div className="flex-grow border-t border-outline-variant/20" />
            <span className="flex-shrink mx-4 text-sm text-on-surface-variant/60 font-medium">Hoặc đăng ký bằng email</span>
            <div className="flex-grow border-t border-outline-variant/20" />
          </div>

          {/* Registration Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Email */}
            <div className="space-y-2">
              <label htmlFor="reg-email" className="block text-sm font-semibold text-on-surface-variant ml-1">Email</label>
              <div className="relative">
                <input
                  id="reg-email"
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  placeholder="email@example.com"
                  className="w-full bg-surface-container-lowest px-4 py-3.5 pr-12 rounded-xl text-on-surface placeholder:text-on-surface-variant/40 focus:bg-surface-container-highest focus:ring-0 focus:outline-none transition-all border-none"
                />
                <Mail className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-on-surface-variant/40" />
              </div>
            </div>

            {/* Password Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label htmlFor="reg-password" className="block text-sm font-semibold text-on-surface-variant ml-1">Mật khẩu</label>
                <div className="relative">
                  <input
                    id="reg-password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="new-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    placeholder="••••••••"
                    className="w-full bg-surface-container-lowest px-4 py-3.5 pr-12 rounded-xl text-on-surface placeholder:text-on-surface-variant/40 focus:bg-surface-container-highest focus:ring-0 focus:outline-none transition-all border-none"
                  />
                  <button type="button" onClick={() => setShowPassword(v => !v)} className="absolute right-4 top-1/2 -translate-y-1/2 text-on-surface-variant/40 hover:text-on-surface transition-colors" aria-label={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}>
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>
              <div className="space-y-2">
                <label htmlFor="reg-confirm" className="block text-sm font-semibold text-on-surface-variant ml-1">Xác nhận</label>
                <div className="relative">
                  <input
                    id="reg-confirm"
                    type={showConfirm ? 'text' : 'password'}
                    autoComplete="new-password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    placeholder="••••••••"
                    className="w-full bg-surface-container-lowest px-4 py-3.5 pr-12 rounded-xl text-on-surface placeholder:text-on-surface-variant/40 focus:bg-surface-container-highest focus:ring-0 focus:outline-none transition-all border-none"
                  />
                  <button type="button" onClick={() => setShowConfirm(v => !v)} className="absolute right-4 top-1/2 -translate-y-1/2 text-on-surface-variant/40 hover:text-on-surface transition-colors" aria-label={showConfirm ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}>
                    {showConfirm ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>
            </div>

            {/* Terms Checkbox */}
            <div className="flex items-start gap-3 pt-2">
              <input
                id="terms"
                type="checkbox"
                className="mt-1 rounded border-outline-variant/30 text-primary focus:ring-primary/30"
              />
              <label htmlFor="terms" className="text-sm text-on-surface-variant leading-tight">
                Tôi đồng ý với{' '}
                <span className="text-primary font-semibold hover:underline cursor-pointer">Điều khoản dịch vụ</span>
                {' '}và{' '}
                <span className="text-primary font-semibold hover:underline cursor-pointer">Chính sách bảo mật</span>.
              </label>
            </div>

            {/* Error */}
            {error && (
              <div className="p-4 bg-error/10 border border-error/20 rounded-xl text-error font-medium flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                {error}
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full nebula-gradient py-4 rounded-full text-white font-bold text-lg shadow-lg hover:shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all mt-4 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
            >
              {loading ? 'Đang đăng ký...' : 'Tạo tài khoản'}
            </button>
          </form>
            </>
          )}

          {/* Footer Link */}
          <div className="mt-10 text-center">
            <p className="text-on-surface-variant font-medium">
              Đã có tài khoản?{' '}
              <button
                type="button"
                onClick={onGoToLogin}
                className="text-primary font-bold hover:underline ml-1"
              >
                Đăng nhập ngay
              </button>
            </p>
            <p className="mt-3 text-xs text-on-surface-variant opacity-60">
              © 2025 MoMai by NeuronsAI. All rights reserved.
            </p>
          </div>
        </div>
      </section>
    </main>
  );
};
