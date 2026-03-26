import React from 'react';
import type { AuthUser, WorkflowGroup } from '../../lib/auth';
import { authFetch, setToken } from '../../lib/api';
import { WORKFLOW_GROUPS } from './types';

interface GroupSwitcherProps {
  user: AuthUser;
  navigate: (path: string) => void;
}

export function GroupSwitcher({ user, navigate }: GroupSwitcherProps) {
  const handleSwitch = async (group: WorkflowGroup) => {
    if (!user.workflowGroups.includes(group)) {
      const target = WORKFLOW_GROUPS.find((g) => g.key === group)?.label ?? group;
      window.alert(`Nhóm "${target}" chưa được đăng ký. Vui lòng nâng cấp hoặc vào Profile để cập nhật.`);
      return;
    }
    if (group === user.activeWorkflowGroup) return;
    try {
      const res = await authFetch('/profiles/active-workflow-group', {
        method: 'PATCH',
        body: JSON.stringify({ group }),
      });
      if (res.ok) {
        const data = await res.json();
        setToken(data.token);
        navigate('/' + group);
        window.dispatchEvent(new PopStateEvent('popstate'));
      }
    } catch { /* ignore */ }
  };

  return (
    <div className="flex gap-1">
      {WORKFLOW_GROUPS.map(({ key, label }) => {
        const isSubscribed = user.workflowGroups.includes(key);
        return (
        <button
          key={key}
          onClick={() => handleSwitch(key)}
          className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${
            !isSubscribed
              ? 'bg-slate-100 text-slate-400'
              : key === user.activeWorkflowGroup
              ? 'bg-indigo-600 text-white'
              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
          }`}
          title={isSubscribed ? `Chuyển sang nhóm ${label}` : `Nhóm ${label} chưa đăng ký`}
        >
          {label}{!isSubscribed ? ' (khóa)' : ''}
        </button>
      )})}
    </div>
  );
}
