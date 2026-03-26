import React from 'react';
import { Check } from 'lucide-react';

const DEFAULT_STEPS = ['Upload', 'Phiên âm', 'Thông tin', 'Kết quả'];

interface Props {
  currentStep: number; // 1-based index
  steps?: string[];
}

export function WorkflowStepHeader({ currentStep, steps = DEFAULT_STEPS }: Props) {
  return (
    <div className="flex items-center gap-2 mb-8">
      {steps.map((label, i) => {
        const stepNum = i + 1;
        const isActive = stepNum === currentStep;
        const isCompleted = stepNum < currentStep;
        return (
          <React.Fragment key={i}>
            {i > 0 && <div className="flex-1 h-px bg-slate-200" />}
            <div className="flex flex-col items-center gap-1">
              <div className={
                isCompleted ? 'w-8 h-8 rounded-full bg-slate-200 text-slate-500 flex items-center justify-center' :
                isActive ? 'w-8 h-8 rounded-full bg-[#1E3A8A] text-white flex items-center justify-center text-sm font-semibold' :
                'w-8 h-8 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center text-sm font-semibold'
              }>
                {isCompleted ? <Check className="w-4 h-4" /> : stepNum}
              </div>
              <span className={isActive ? 'text-sm font-semibold text-slate-700' : 'text-sm text-slate-400'}>
                {label}
              </span>
            </div>
          </React.Fragment>
        );
      })}
    </div>
  );
}
