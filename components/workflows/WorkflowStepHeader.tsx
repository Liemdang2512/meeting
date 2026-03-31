import React from 'react';
import { Check } from 'lucide-react';

export interface StepItem {
  label: string;
  icon?: React.ReactNode;
}

interface Props {
  currentStep: number; // 1-based index
  steps: (string | StepItem)[];
  onStepClick?: (step: number) => void;
}

export function WorkflowStepHeader({ currentStep, steps, onStepClick }: Props) {
  return (
    <div className="flex items-center mb-8" role="list" aria-label="Các bước thực hiện">
      {steps.map((step, i) => {
        const stepNum = i + 1;
        const isActive = stepNum === currentStep;
        const isCompleted = stepNum < currentStep;
        const isClickable = isCompleted && !!onStepClick;
        const label = typeof step === 'string' ? step : step.label;
        const icon = typeof step === 'object' ? step.icon : undefined;

        const circle = (
          <div
            className={
              isActive
                ? 'w-11 h-11 rounded-full nebula-gradient text-white flex items-center justify-center shadow-lg shadow-primary/25 transition-all'
                : isCompleted
                ? `w-8 h-8 rounded-full bg-surface-container text-on-surface-variant/50 flex items-center justify-center transition-all ${isClickable ? 'group-hover:bg-primary/10 group-hover:text-primary' : ''}`
                : 'w-8 h-8 rounded-full bg-surface-container/60 border border-outline-variant/20 text-on-surface-variant/30 flex items-center justify-center text-sm font-bold'
            }
          >
            {isCompleted ? (
              <Check className="w-4 h-4" />
            ) : isActive && icon ? (
              <span className="w-5 h-5 flex items-center justify-center">{icon}</span>
            ) : (
              <span className="text-sm font-bold">{stepNum}</span>
            )}
          </div>
        );

        const labelEl = (
          <span
            className={
              isActive
                ? 'text-[10px] font-bold uppercase tracking-widest text-primary mt-1.5'
                : isCompleted
                ? `text-[10px] font-semibold uppercase tracking-widest text-on-surface-variant/40 mt-1.5 ${isClickable ? 'group-hover:text-on-surface-variant/70 transition-colors' : ''}`
                : 'text-[10px] font-semibold uppercase tracking-widest text-on-surface-variant/30 mt-1.5'
            }
          >
            {label}
          </span>
        );

        const connector = i > 0 && (
          <div className="flex-1 relative mx-1" style={{ height: '2px' }}>
            {/* Base gray line */}
            <div className="absolute inset-0 bg-outline-variant/20 rounded-full" />
            {/* Colored segment for completed */}
            {isCompleted && (
              <div className="absolute inset-0 nebula-gradient rounded-full opacity-60" />
            )}
            {/* Half-colored for active (left half) */}
            {isActive && (
              <div className="absolute left-0 right-1/2 top-0 bottom-0 nebula-gradient rounded-full opacity-40" />
            )}
          </div>
        );

        const inner = (
          <div className="flex flex-col items-center gap-0">
            {circle}
            {labelEl}
          </div>
        );

        return (
          <React.Fragment key={i}>
            {connector}
            {isClickable ? (
              <button
                type="button"
                role="listitem"
                className="flex flex-col items-center cursor-pointer group bg-transparent border-0 p-0"
                onClick={() => onStepClick(stepNum)}
                aria-label={`Quay lại bước ${stepNum}: ${label}`}
              >
                {inner}
              </button>
            ) : (
              <div
                role="listitem"
                aria-current={isActive ? 'step' : undefined}
                className="flex flex-col items-center"
              >
                {inner}
              </div>
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}
