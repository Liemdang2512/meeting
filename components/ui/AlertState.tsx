import React from 'react';

type AlertVariant = 'info' | 'success' | 'warning' | 'error';

interface AlertStateProps {
  title?: string;
  message: string;
  variant?: AlertVariant;
  className?: string;
}

const variantMap: Record<AlertVariant, string> = {
  info: 'bg-blue-50 border-blue-200 text-blue-800',
  success: 'bg-emerald-50 border-emerald-200 text-emerald-800',
  warning: 'bg-amber-50 border-amber-200 text-amber-800',
  error: 'bg-red-50 border-red-200 text-red-800',
};

export const AlertState: React.FC<AlertStateProps> = ({
  title,
  message,
  variant = 'info',
  className = '',
}) => {
  return (
    <div className={`rounded-xl border px-4 py-3 ${variantMap[variant]} ${className}`}>
      {title ? <p className="text-sm font-semibold">{title}</p> : null}
      <p className="text-sm">{message}</p>
    </div>
  );
};
