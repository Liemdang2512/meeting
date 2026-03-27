import React from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(function Input(
  { className = '', ...props },
  ref,
) {
  const classes = [
    'w-full h-10 px-3 border border-slate-200 rounded-lg bg-white text-slate-800',
    'placeholder:text-gray-400 transition-colors',
    'focus:outline-none focus:ring-2 focus:ring-[#1E40AF]/30 focus:border-[#1E40AF]',
    'disabled:opacity-50 disabled:cursor-not-allowed',
    className,
  ].join(' ');

  return <input ref={ref} className={classes} {...props} />;
});
