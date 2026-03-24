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
      navigate(`/${user.activeWorkflowGroup}`);
    }
  }, [user, group, navigate]);

  if (!user) return null;
  if (!user.workflowGroups.includes(group)) return null;
  return <>{children}</>;
}
