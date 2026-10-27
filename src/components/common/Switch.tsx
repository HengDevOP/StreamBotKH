'use client';

import React from 'react';
import { clsx } from 'clsx';

interface SwitchProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: string;
  description?: string;
  disabled?: boolean;
}

export const Switch: React.FC<SwitchProps> = ({
  checked,
  onChange,
  label,
  description,
  disabled = false
}) => {
  return (
    <label className={clsx("flex items-center justify-between cursor-pointer group select-none", disabled && "opacity-50 cursor-not-allowed")}>
      {(label || description) && (
        <div className="flex flex-col mr-4">
          {label && <span className="text-sm font-semibold text-slate-200 group-hover:text-cyan-400 transition-colors">{label}</span>}
          {description && <span className="text-xs text-slate-400 mt-0.5">{description}</span>}
        </div>
      )}
      <div
        onClick={() => !disabled && onChange(!checked)}
        className={clsx(
          "w-12 h-6 flex items-center rounded-full p-1 transition-colors duration-300 relative",
          checked ? "bg-cyan-500 shadow-neon-cyan" : "bg-slate-700"
        )}
      >
        <div
          className={clsx(
            "bg-white w-4 h-4 rounded-full shadow-md transform transition-transform duration-300",
            checked ? "translate-x-6" : "translate-x-0"
          )}
        />
      </div>
    </label>
  );
};
