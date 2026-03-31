import React, { useEffect } from 'react';
import { Lock } from 'lucide-react';
import type { WorkflowGroup, AuthUser } from '../../lib/auth';
import { QuotaBadge } from '../pricing/QuotaBadge';

interface WorkflowGuardProps {
  group: WorkflowGroup;
  user: AuthUser | null;
  navigate: (path: string) => void;
  children: React.ReactNode;
}

export function WorkflowGuard({ group, user, navigate, children }: WorkflowGuardProps) {
  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }
    // Free users được dùng specialist mặc định (1 lượt/ngày)
    const isFreeSpecialist = user.role === 'free' && group === 'specialist';
    if (!isFreeSpecialist && !user.plans?.includes(group) && user.role !== 'admin') {
      const targetLabel =
        group === 'reporter' ? 'Phóng viên' : group === 'specialist' ? 'Chuyên viên' : 'Cán bộ';
      window.alert(`Bạn chưa đăng ký gói "${targetLabel}". Vui lòng nâng cấp trong trang Pricing.`);
      navigate('/pricing');
    }
  }, [user, group, navigate]);

  if (!user) return null;
  const isFreeSpecialist = user.role === 'free' && group === 'specialist';
  if (!isFreeSpecialist && !user.plans?.includes(group) && user.role !== 'admin') return null;

  // Banner nhắc nhở cho free user
  if (isFreeSpecialist && !user.plans?.includes(group)) {
    return (
      <>
        <div className="mx-auto max-w-4xl w-full px-4 pt-4">
          <div className="flex items-center justify-between gap-3 px-4 py-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-800">
            <div className="flex items-center gap-2 text-sm font-medium">
              <Lock size={15} className="shrink-0" />
              <span>Gói miễn phí — 1 lượt ghi chép/ngày. Nâng cấp để không giới hạn.</span>
            </div>
            <div className="flex items-center gap-3 shrink-0">
              <QuotaBadge />
              <button
                onClick={() => navigate('/pricing')}
                className="text-xs font-semibold text-amber-900 underline underline-offset-2 hover:text-amber-700 whitespace-nowrap"
              >
                Nâng cấp
              </button>
            </div>
          </div>
        </div>
        {children}
      </>
    );
  }

  return <>{children}</>;
}
