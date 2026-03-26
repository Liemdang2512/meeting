import React, { useEffect } from 'react';
import type { WorkflowGroup, AuthUser } from '../../lib/auth';

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
    if (!user.workflowGroups.includes(group)) {
      const targetLabel =
        group === 'reporter' ? 'Phóng viên' : group === 'specialist' ? 'Chuyên viên' : 'Cán bộ';
      window.alert(`Bạn chưa đăng ký nhóm "${targetLabel}". Vui lòng nâng cấp hoặc cập nhật trong Profile.`);
      navigate('/pricing');
    }
  }, [user, group, navigate]);

  if (!user) return null;
  if (!user.workflowGroups.includes(group)) return null;
  return <>{children}</>;
}
