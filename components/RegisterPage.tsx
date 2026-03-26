import React, { useState } from 'react';
import { register } from '../lib/auth';
import type { WorkflowGroup } from '../lib/auth';
import { WORKFLOW_GROUPS } from '../features/workflows/types';
import { AuthShell } from './auth/AuthShell';

interface RegisterPageProps {
  onRegisterSuccess: () => void;
  onGoToLogin: () => void;
}

export const RegisterPage: React.FC<RegisterPageProps> = ({ onRegisterSuccess, onGoToLogin }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [selectedGroups, setSelectedGroups] = useState<WorkflowGroup[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const toggleGroup = (group: WorkflowGroup) => {
    setSelectedGroups(prev =>
      prev.includes(group) ? prev.filter(g => g !== group) : [...prev, group]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validate group selection first
    if (selectedGroups.length === 0) {
      setError('Vui lòng chọn ít nhất 1 nhóm người dùng');
      return;
    }

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
      await register(email.trim(), password, confirmPassword, selectedGroups);
      onRegisterSuccess();
    } catch (err: any) {
      setError(err?.message || 'Không thể đăng ký. Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell
      title={
        <>
          Đăng ký
          <br />
          tài khoản
        </>
      }
      subtitle="Miễn phí · 1 chuyển đổi/ngày"
      footer={
        <div className="text-center">
          <button
            type="button"
            onClick={onGoToLogin}
            className="text-sm text-[#1E40AF] hover:text-[#1E3A8A] font-medium transition-colors"
          >
            Đã có tài khoản? Đăng nhập
          </button>
        </div>
      }
    >
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-3">
            <label className="block text-sm font-medium text-slate-800">Nhóm người dùng *</label>
            <div className="space-y-2">
              {WORKFLOW_GROUPS.map(({ key, label, description }) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => toggleGroup(key)}
                  className={`w-full p-4 border rounded-xl text-left transition-colors cursor-pointer ${
                    selectedGroups.includes(key)
                      ? 'border-[#1E40AF] bg-blue-50 text-[#1E3A8A]'
                      : 'border-slate-200 bg-slate-50 text-slate-700 hover:border-slate-300'
                  }`}
                >
                  <div className="font-medium">{label}</div>
                  <div className="text-sm opacity-70">{description}</div>
                </button>
              ))}
            </div>
            <p className="text-xs text-slate-400">Có thể chọn nhiều nhóm</p>
          </div>

          <div className="space-y-2">
            <label htmlFor="reg-email" className="block text-sm font-medium text-slate-800">Email</label>
            <input
              id="reg-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full h-10 px-3 border border-slate-200 rounded-lg focus:border-[#1E40AF] focus:ring-1 focus:ring-[#1E40AF] outline-none bg-slate-50 focus:bg-white text-slate-800 font-medium transition-colors placeholder:text-gray-400"
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
              className="w-full h-10 px-3 border border-slate-200 rounded-lg focus:border-[#1E40AF] focus:ring-1 focus:ring-[#1E40AF] outline-none bg-slate-50 focus:bg-white text-slate-800 font-medium transition-colors placeholder:text-gray-400"
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
              className="w-full h-10 px-3 border border-slate-200 rounded-lg focus:border-[#1E40AF] focus:ring-1 focus:ring-[#1E40AF] outline-none bg-slate-50 focus:bg-white text-slate-800 font-medium transition-colors placeholder:text-gray-400"
              placeholder="Nhập lại mật khẩu"
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
            {loading ? 'Đang đăng ký...' : 'Tạo tài khoản'}
          </button>
        </form>
    </AuthShell>
  );
};
