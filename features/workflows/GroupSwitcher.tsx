import React from 'react';
import type { AuthUser, WorkflowGroup } from '../../lib/auth';
import { WORKFLOW_GROUPS } from './types';

interface GroupSwitcherProps {
  user: AuthUser;
  navigate: (path: string) => void;
}

export function GroupSwitcher({ user, navigate }: GroupSwitcherProps) {
  const currentPath = window.location.hash.replace('#', '') || window.location.pathname;

  const handleSwitch = (group: WorkflowGroup) => {
    const hasPlan = user.role === 'admin' || user.plans?.includes(group);
    if (!hasPlan) {
      const target = WORKFLOW_GROUPS.find((g) => g.key === group)?.label ?? group;
      window.alert(`Gói "${target}" chưa được đăng ký. Vui lòng nâng cấp trong trang Pricing.`);
      return;
    }
    navigate('/' + group);
  };

  return (
    <div className="flex gap-1">
      {WORKFLOW_GROUPS.map(({ key, label }) => {
        const hasPlan = user.role === 'admin' || user.plans?.includes(key);
        const isActive = currentPath === '/' + key;
        return (
          <button
            key={key}
            onClick={() => handleSwitch(key)}
            className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${
              !hasPlan
                ? 'bg-slate-100 text-slate-400'
                : isActive
                ? 'bg-indigo-600 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
            title={hasPlan ? `Chuyển sang gói ${label}` : `Gói ${label} chưa đăng ký`}
          >
            {label}{!hasPlan ? ' (khóa)' : ''}
          </button>
        );
      })}
    </div>
  );
}
