import React, { useState } from 'react';
import type { AuthUser } from '../../lib/auth';
import type { WorkflowGroup } from '../../lib/auth';
import { authFetch, setToken } from '../../lib/api';
import { WORKFLOW_GROUPS } from '../workflows/types';

interface PlanSelectionSectionProps {
  user: AuthUser;
  onUpdate: () => void;
}

export function WorkflowGroupsSection({ user, onUpdate }: PlanSelectionSectionProps) {
  const [selected, setSelected] = useState<WorkflowGroup[]>([...(user.plans ?? []) as WorkflowGroup[]]);
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved'>('idle');
  const [error, setError] = useState<string>('');

  const togglePlan = (plan: WorkflowGroup) => {
    setError('');
    setSelected(prev =>
      prev.includes(plan) ? prev.filter(p => p !== plan) : [...prev, plan]
    );
  };

  const hasChanges = () => {
    const sorted = [...selected].sort();
    const orig = [...(user.plans ?? [])].sort();
    return JSON.stringify(sorted) !== JSON.stringify(orig);
  };

  const handleSave = async () => {
    const add = selected.filter(p => !(user.plans ?? []).includes(p));
    const remove = (user.plans ?? []).filter(p => !selected.includes(p as WorkflowGroup));

    if (add.length === 0 && remove.length === 0) return;

    setSaveState('saving');
    setError('');
    try {
      const res = await authFetch('/profiles/plans', {
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
        setError(data.error || 'Lưu thất bại');
        setSaveState('idle');
      }
    } catch {
      setError('Lưu thất bại');
      setSaveState('idle');
    }
  };

  const roleLabel = user.role === 'admin' ? 'ADMIN' : 'FREE';
  const planLabels = WORKFLOW_GROUPS
    .filter(g => (user.plans ?? []).includes(g.key))
    .map(g => g.label);

  return (
    <div className="space-y-6">
      <h2 className="text-lg font-medium text-slate-800">Gói đăng ký</h2>

      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-3">
        <p className="text-sm text-slate-700">
          Tài khoản: <span className="font-semibold text-[#1E3A8A]">{roleLabel}</span>
        </p>
        <p className="text-sm text-slate-700">
          Gói đang có: <span className="font-semibold">{planLabels.length > 0 ? planLabels.join(', ') : 'Chưa có gói'}</span>
        </p>
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
        <p className="text-sm font-medium text-slate-700">Chọn các gói muốn đăng ký:</p>
        <div className="grid gap-3">
          {WORKFLOW_GROUPS.map(({ key, label, description }) => {
            const isActive = selected.includes(key);
            return (
              <button
                key={key}
                type="button"
                onClick={() => togglePlan(key)}
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
          {saveState === 'saving' ? 'Đang lưu...' : saveState === 'saved' ? 'Đã lưu' : 'Lưu thay đổi'}
        </button>
      </div>
    </div>
  );
}
