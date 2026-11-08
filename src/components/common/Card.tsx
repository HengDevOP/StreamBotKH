'use client';

import React from 'react';
import { clsx } from 'clsx';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  glow?: 'cyan' | 'pink' | 'purple' | 'none';
  onClick?: () => void;
}

export const Card: React.FC<CardProps> = ({
  children,
  className,
  glow = 'none',
  onClick
}) => {
  const borderStyles = {
    none: 'border-slate-800 hover:border-slate-700',
    cyan: 'border-slate-800 hover:border-cyan-500/50',
    pink: 'border-slate-800 hover:border-pink-500/50',
    purple: 'border-slate-800 hover:border-purple-500/50',
  };

  return (
    <div
      onClick={onClick}
      className={clsx(
        "bg-[#0B0F19] rounded-2xl border transition-colors duration-200 p-4 sm:p-6 relative overflow-hidden",
        borderStyles[glow],
        className
      )}
    >
      {children}
    </div>
  );
};
