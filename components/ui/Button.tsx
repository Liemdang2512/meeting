import React from 'react';

type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'ghost';
type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
}

const sizeClasses: Record<ButtonSize, string> = {
  sm: 'h-9 px-3 text-sm',
  md: 'h-10 px-4 text-sm',
  lg: 'h-11 px-5 text-base',
};

const variantClasses: Record<ButtonVariant, string> = {
  primary: 'bg-[#1E3A8A] text-white hover:bg-[#1E40AF] border border-[#1E3A8A]',
  secondary: 'bg-white text-slate-800 hover:bg-slate-50 border border-slate-200',
  danger: 'bg-red-600 text-white hover:bg-red-700 border border-red-600',
  ghost: 'bg-transparent text-slate-700 hover:bg-slate-100 border border-transparent',
};

export const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  size = 'md',
  className = '',
  type = 'button',
  ...props
}) => {
  const classes = [
    'inline-flex items-center justify-center gap-2 rounded-xl font-medium transition-colors',
    'focus:outline-none focus-visible:ring-2 focus-visible:ring-[#1E40AF]/30',
    'disabled:opacity-50 disabled:cursor-not-allowed',
    sizeClasses[size],
    variantClasses[variant],
    className,
  ].join(' ');

  return <button type={type} className={classes} {...props} />;
};
