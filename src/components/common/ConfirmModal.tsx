'use client';

import React, { useEffect } from 'react';
import { X } from 'lucide-react';

export type ModalType = 'danger' | 'warning' | 'info' | 'success';

export interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm?: () => void | Promise<void>;
  title: string;
  message: string | React.ReactNode;
  type?: ModalType;
  confirmText?: string;
  cancelText?: string;
  isAlertOnly?: boolean;
  loading?: boolean;
}

export const ConfirmModal: React.FC<ConfirmModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  type = 'warning',
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  isAlertOnly = false,
  loading = false
}) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !loading) {
        onClose();
      }
    };
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.body.style.overflow = 'unset';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose, loading]);

  if (!isOpen) return null;

  const getConfirmButtonClasses = () => {
    switch (type) {
      case 'danger':
        return 'bg-red-600 hover:bg-red-500 text-white font-medium';
      case 'warning':
        return 'bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold';
      case 'success':
      case 'info':
      default:
        return 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-semibold';
    }
  };

  const handleConfirmClick = async () => {
    if (onConfirm) {
      await onConfirm();
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fadeIn">
      {/* Backdrop */}
      <div
        className="fixed inset-0"
        onClick={!loading ? onClose : undefined}
      />

      {/* Modal Dialog Card */}
      <div className="relative w-full max-w-md bg-[#0F141F] border border-slate-800 rounded-xl p-5 sm:p-6 shadow-2xl z-10 space-y-4">
        {/* Header: Title and Close button */}
        <div className="flex items-start justify-between gap-3">
          <h3 className="text-base sm:text-lg font-semibold text-white">
            {title}
          </h3>
          {!loading && (
            <button
              onClick={onClose}
              className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800/80 transition-colors -mr-1 -mt-1 cursor-pointer"
            >
              <X size={18} />
            </button>
          )}
        </div>

        {/* Message body */}
        <div className="text-sm text-slate-300 leading-relaxed">
          {message}
        </div>

        {/* Modal Action Buttons */}
        <div className="pt-2 flex items-center justify-end gap-2.5">
          {!isAlertOnly && (
            <button
              type="button"
              disabled={loading}
              onClick={onClose}
              className="px-4 py-2 rounded-lg text-xs sm:text-sm font-medium text-slate-300 hover:text-white bg-slate-800/80 hover:bg-slate-800 border border-slate-700/60 transition-colors disabled:opacity-50 cursor-pointer"
            >
              {cancelText}
            </button>
          )}

          <button
            type="button"
            disabled={loading}
            onClick={handleConfirmClick}
            className={`px-4 py-2 rounded-lg text-xs sm:text-sm font-semibold transition-colors disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer ${getConfirmButtonClasses()}`}
          >
            {loading && (
              <span className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />
            )}
            <span>{isAlertOnly ? (confirmText === 'Confirm' ? 'Got It' : confirmText) : confirmText}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
