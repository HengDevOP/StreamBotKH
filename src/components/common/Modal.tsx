'use client';

import React, { useEffect } from 'react';
import { X } from 'lucide-react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  showDot?: boolean;
  children: React.ReactNode;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl';
}

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  showDot = false,
  children,
  maxWidth = 'md'
}) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.body.style.overflow = 'unset';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const widthClasses = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2.5 xs:p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
      <div
        className="fixed inset-0"
        onClick={onClose}
      />
      <div
        className={`relative w-full ${widthClasses[maxWidth]} bg-slate-900 border border-slate-800 rounded-2xl sm:rounded-3xl p-4 sm:p-6 shadow-2xl z-10 overflow-hidden border-cyan-500/30 max-h-[92vh] overflow-y-auto`}
      >
        <div className="flex items-center justify-between pb-3 sm:pb-4 border-b border-slate-800/80 mb-4 sm:mb-5">
          {title && (
            <h3 className="text-base sm:text-xl font-bold tracking-wide text-white flex items-center gap-2 truncate">
              {showDot && (
                <span className="w-2 h-2 rounded-full bg-cyan-400 shadow-neon-cyan animate-pulse flex-shrink-0" />
              )}
              <span className="truncate">{title}</span>
            </h3>
          )}
          <button
            onClick={onClose}
            className="p-1 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors ml-auto flex-shrink-0"
          >
            <X size={18} />
          </button>
        </div>
        <div>{children}</div>
      </div>
    </div>
  );
};
