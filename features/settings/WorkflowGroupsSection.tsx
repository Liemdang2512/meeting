import React, { useState } from 'react';
import type { AuthUser } from '../../lib/auth';
import type { WorkflowGroup } from '../../lib/auth';
import { authFetch, setToken } from '../../lib/api';
import { WORKFLOW_GROUPS } from '../workflows/types';

interface WorkflowGroupsSectionProps {
  user: AuthUser;
  onUpdate: () => void;
}

export function WorkflowGroupsSection({ user, onUpdate }: WorkflowGroupsSectionProps) {
  const [selected, setSelected] = useState<WorkflowGroup[]>([...user.workflowGroups]);
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved'>('idle');
  const [error, setError] = useState<string>('');

  const toggleGroup = (group: WorkflowGroup) => {
    setError('');
    setSelected(prev => {
      if (prev.includes(group)) {
        if (prev.length <= 1) {
          setError('Phai giu it nhat 1 nhom');
          return prev;
        }
        return prev.filter(g => g !== group);
      } else {
        return [...prev, group];
      }
    });
  };

  const hasChanges = () => {
    const sorted = [...selected].sort();
    const orig = [...user.workflowGroups].sort();
    return JSON.stringify(sorted) !== JSON.stringify(orig);
  };

  const handleSave = async () => {
    if (selected.length === 0) {
      setError('Phai giu it nhat 1 nhom');
      return;
    }
    const add = selected.filter(g => !user.workflowGroups.includes(g));
    const remove = user.workflowGroups.filter(g => !selected.includes(g));

    if (add.length === 0 && remove.length === 0) return;

    setSaveState('saving');
    setError('');
    try {
      const res = await authFetch('/profiles/workflow-groups', {
        method: 'PATCH',
        body: JSON.stringify({ add, remove }),
      });
      if (res.ok) {
        const data = await res.json();
        setToken(data.token);
        setSaveState('saved');
        setTimeout(() => setSaveState('idle'), 2000);
        window.dispatchEvent(new PopStateEvent('popstate'));
        onUpdate();
      } else {
        const data = await res.json();
        setError(data.error || 'Luu that bai');
        setSaveState('idle');
      }
    } catch {
      setError('Luu that bai');
      setSaveState('idle');
    }
  };

  return (
    <div className="space-y-6">
      <h2 className="text-lg font-medium text-slate-800">Quan ly nhom nguoi dung</h2>

      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
        <p className="text-sm text-slate-600">
          Chon nhom nguoi dung ban thuoc ve. Ban co the thuoc nhieu nhom cung mot luc.
        </p>

        <div className="grid gap-3">
          {WORKFLOW_GROUPS.map(({ key, label, description }) => {
            const isActive = selected.includes(key);
            return (
              <button
                key={key}
                type="button"
                onClick={() => toggleGroup(key)}
                className={`w-full text-left px-4 py-4 rounded-xl border-2 transition-all ${
                  isActive
                    ? 'border-indigo-500 bg-indigo-50'
                    : 'border-slate-200 bg-white hover:border-slate-300'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <div className={`font-medium text-sm ${isActive ? 'text-indigo-700' : 'text-slate-700'}`}>
                      {label}
                    </div>
                    <div className="text-xs text-slate-500 mt-0.5">{description}</div>
                  </div>
                  <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                    isActive ? 'border-indigo-500 bg-indigo-500' : 'border-slate-300'
                  }`}>
                    {isActive && (
                      <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        {error && (
          <p className="text-sm text-red-600">{error}</p>
        )}

        <button
          onClick={handleSave}
          disabled={saveState === 'saving' || !hasChanges()}
          className="px-6 py-3 bg-indigo-600 text-white font-sans font-medium border-slate-200 shadow-sm rounded-xl hover:bg-indigo-700 transition-all active:bg-indigo-800 border disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {saveState === 'saving' ? 'Dang luu...' : saveState === 'saved' ? 'Da luu' : 'Luu thay doi'}
        </button>
      </div>
    </div>
  );
}
