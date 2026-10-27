import React from 'react';
import { clsx } from 'clsx';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'danger' | 'neon-pink' | 'neon-cyan';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  icon?: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  loading = false,
  icon,
  className,
  disabled,
  ...props
}) => {
  const base = "inline-flex items-center justify-center font-semibold tracking-wide rounded-xl transition-all duration-200 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed select-none";

  const sizeStyles = {
    sm: "px-3 py-1.5 text-xs gap-1.5",
    md: "px-4 py-2.5 text-sm gap-2",
    lg: "px-6 py-3 text-sm gap-2.5",
  };

  const variantStyles = {
    primary: "bg-cyan-400 hover:bg-cyan-300 text-slate-950 font-bold active:scale-[0.98]",
    secondary: "bg-slate-800 hover:bg-slate-700 text-slate-100 border border-slate-700 active:scale-[0.98]",
    outline: "bg-transparent border border-slate-700 hover:border-slate-500 text-slate-300 hover:text-white hover:bg-slate-800/50",
    danger: "bg-red-500/20 hover:bg-red-500/30 border border-red-500/40 text-red-300",
    'neon-pink': "bg-pink-600 hover:bg-pink-500 text-white font-bold active:scale-[0.98]",
    'neon-cyan': "bg-cyan-400 hover:bg-cyan-300 text-slate-950 font-bold active:scale-[0.98]"
  };

  return (
    <button
      className={clsx(base, sizeStyles[size], variantStyles[variant], className)}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? (
        <svg className="animate-spin -ml-1 mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
      ) : icon ? (
        icon
      ) : null}
      {children}
    </button>
  );
};
