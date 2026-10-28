'use client';

import React from 'react';
import { Lock, X, ExternalLink } from 'lucide-react';

interface ProUpgradeModalProps {
  isOpen: boolean;
  onClose: () => void;
  telegramContactUrl?: string;
  featureName?: string;
  title?: string;
}

export const ProUpgradeModal: React.FC<ProUpgradeModalProps> = ({
  isOpen,
  onClose,
  telegramContactUrl = 'https://t.me/hchenheng',
  featureName,
  title = 'This feature is available on Pro plan'
}) => {
  if (!isOpen) return null;

  const handleUpgradeClick = () => {
    let target = (telegramContactUrl || 'https://t.me/hchenheng').trim();
    if (!target.startsWith('http://') && !target.startsWith('https://')) {
      target = `https://${target}`;
    }
    target = target.replace(/t\.me\/@/i, 't.me/');
    window.open(target, '_blank', 'noopener,noreferrer');
  };

  const modalTitle = featureName ? `${featureName} is available on Pro plan` : title;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn select-none"
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm rounded-2xl bg-[#090D18] border border-amber-500/40 p-6 shadow-2xl shadow-amber-500/10 relative space-y-5 text-center"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          aria-label="Close"
          className="absolute top-4 right-4 p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800/60 transition-colors"
        >
          <X size={18} />
        </button>

        {/* Lock Icon */}
        <div className="pt-2">
          <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 shadow-lg shadow-amber-500/20 mx-auto">
            <Lock size={32} className="text-amber-400" />
          </div>
        </div>

        {/* Title Only */}
        <div>
          <h3 className="text-lg sm:text-xl font-bold text-white font-['Chakra_Petch'] leading-snug">
            {modalTitle}
          </h3>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-2.5 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white font-semibold text-xs transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleUpgradeClick}
            className="flex-1 py-2.5 px-4 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-400 hover:from-amber-600 hover:to-yellow-500 text-slate-950 font-extrabold text-xs flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20 transition-all active:scale-[0.98]"
          >
            <span>Upgrade</span>
            <ExternalLink size={14} />
          </button>
        </div>
      </div>
    </div>
  );
};
