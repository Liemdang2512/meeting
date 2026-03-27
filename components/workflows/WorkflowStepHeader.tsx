import React from 'react';
import { Check } from 'lucide-react';

const DEFAULT_STEPS = ['Upload', 'Phiên âm', 'Thông tin', 'Kết quả'];

interface Props {
  currentStep: number; // 1-based index
  steps?: string[];
  onStepClick?: (step: number) => void;
}

export function WorkflowStepHeader({ currentStep, steps = DEFAULT_STEPS, onStepClick }: Props) {
  return (
    <div className="flex items-center gap-2 mb-8" role="list" aria-label="Các bước thực hiện">
      {steps.map((label, i) => {
        const stepNum = i + 1;
        const isActive = stepNum === currentStep;
        const isCompleted = stepNum < currentStep;
        const isClickable = isCompleted && !!onStepClick;

        const circle = (
          <div className={
            isCompleted
              ? `w-8 h-8 rounded-full bg-slate-200 text-slate-500 flex items-center justify-center ${isClickable ? 'group-hover:bg-[#1E3A8A] group-hover:text-white transition-colors' : ''}`
              : isActive
              ? 'w-8 h-8 rounded-full bg-[#1E3A8A] text-white flex items-center justify-center text-sm font-semibold'
              : 'w-8 h-8 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center text-sm font-semibold'
          }>
            {isCompleted ? <Check className="w-4 h-4" /> : stepNum}
          </div>
        );

        const labelEl = (
          <span className={
            isActive
              ? 'text-sm font-semibold text-slate-700'
              : isClickable
              ? 'text-sm text-slate-400 group-hover:text-slate-600 transition-colors'
              : 'text-sm text-slate-400'
          }>
            {label}
          </span>
        );

        return (
          <React.Fragment key={i}>
            {i > 0 && <div className="flex-1 h-px bg-slate-200" />}
            {isClickable ? (
              <button
                type="button"
                role="listitem"
                className="flex flex-col items-center gap-1 cursor-pointer group bg-transparent border-0 p-0"
                onClick={() => onStepClick(stepNum)}
                aria-label={`Quay lại bước ${stepNum}: ${label}`}
              >
                {circle}
                {labelEl}
              </button>
            ) : (
              <div
                role="listitem"
                aria-current={isActive ? 'step' : undefined}
                className="flex flex-col items-center gap-1"
              >
                {circle}
                {labelEl}
              </div>
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}
