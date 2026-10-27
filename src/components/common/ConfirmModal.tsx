'use client';

import React, { useEffect } from 'react';
import { AlertTriangle, AlertCircle, Info, CheckCircle2, Trash2, X } from 'lucide-react';
import { Button } from './Button';

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

  const getIcon = () => {
    switch (type) {
      case 'danger':
        return <Trash2 size={24} className="text-red-400" />;
      case 'warning':
        return <AlertTriangle size={24} className="text-amber-400" />;
      case 'success':
        return <CheckCircle2 size={24} className="text-emerald-400" />;
      case 'info':
      default:
        return <Info size={24} className="text-cyan-400" />;
    }
  };

  const getIconBg = () => {
    switch (type) {
      case 'danger':
        return 'bg-red-500/10 border-red-500/30 text-red-400';
      case 'warning':
        return 'bg-amber-500/10 border-amber-500/30 text-amber-400';
      case 'success':
        return 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400';
      case 'info':
      default:
        return 'bg-cyan-500/10 border-cyan-500/30 text-cyan-400';
    }
  };

  const getConfirmButtonClasses = () => {
    switch (type) {
      case 'danger':
        return 'bg-red-600 hover:bg-red-500 text-white shadow-lg shadow-red-600/30';
      case 'warning':
        return 'bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold shadow-lg shadow-amber-500/30';
      case 'success':
        return 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold shadow-lg shadow-emerald-500/30';
      case 'info':
      default:
        return 'bg-cyan-400 hover:bg-cyan-300 text-slate-950 font-bold shadow-lg shadow-cyan-400/30';
    }
  };

  const handleConfirmClick = async () => {
    if (onConfirm) {
      await onConfirm();
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
      {/* Backdrop */}
      <div
        className="fixed inset-0"
        onClick={!loading ? onClose : undefined}
      />

      {/* Modal Dialog Card */}
      <div className="relative w-full max-w-md bg-[#0B0F19] border border-slate-800 rounded-2xl p-6 shadow-2xl z-10 overflow-hidden space-y-5 animate-in zoom-in-95 duration-150">
        <div className="flex items-start gap-4">
          <div className={`p-3 rounded-xl border flex-shrink-0 ${getIconBg()}`}>
            {getIcon()}
          </div>

          <div className="space-y-1.5 flex-1 min-w-0 pt-0.5">
            <h3 className="text-base font-bold text-white font-['Chakra_Petch'] tracking-wide">
              {title}
            </h3>
            <div className="text-xs text-slate-400 leading-relaxed font-sans">
              {message}
            </div>
          </div>

          {!loading && (
            <button
              onClick={onClose}
              className="p-1 rounded-lg text-slate-500 hover:text-white hover:bg-slate-800 transition-colors ml-auto flex-shrink-0"
            >
              <X size={18} />
            </button>
          )}
        </div>

        {/* Modal Action Buttons */}
        <div className="pt-2 flex items-center justify-end gap-3 border-t border-slate-800/80">
          {!isAlertOnly && (
            <button
              type="button"
              disabled={loading}
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white bg-slate-900 hover:bg-slate-800 border border-slate-800 transition-colors disabled:opacity-50"
            >
              {cancelText}
            </button>
          )}

          <button
            type="button"
            disabled={loading}
            onClick={handleConfirmClick}
            className={`px-5 py-2 rounded-xl text-xs font-bold transition-all disabled:opacity-50 flex items-center gap-2 ${getConfirmButtonClasses()}`}
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
