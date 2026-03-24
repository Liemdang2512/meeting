import React from 'react';
import type { AuthUser, WorkflowGroup } from '../../lib/auth';
import { authFetch, setToken } from '../../lib/api';
import { WORKFLOW_GROUPS } from './types';

interface GroupSwitcherProps {
  user: AuthUser;
  navigate: (path: string) => void;
}

export function GroupSwitcher({ user, navigate }: GroupSwitcherProps) {
  if (user.workflowGroups.length <= 1) return null;

  const handleSwitch = async (group: WorkflowGroup) => {
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

  const userGroups = WORKFLOW_GROUPS.filter(g => user.workflowGroups.includes(g.key));

  return (
    <div className="flex gap-1">
      {userGroups.map(({ key, label }) => (
        <button
          key={key}
          onClick={() => handleSwitch(key)}
          className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${
            key === user.activeWorkflowGroup
              ? 'bg-indigo-600 text-white'
              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
          }`}
        >
          {label}
        </button>
      ))}
    </div>
  );
}
