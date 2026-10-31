'use client';

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, LogOut, ShieldAlert, ArrowLeft, Loader2 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export const ImpersonationBanner: React.FC = () => {
  const { user, isImpersonating, impersonatorAdmin, stopImpersonating } = useAuth();
  const [exiting, setExiting] = useState(false);
  const navigate = useNavigate();

  if (!isImpersonating) return null;

  const handleExit = async () => {
    try {
      setExiting(true);
      await stopImpersonating();
      window.location.href = '/dashboard?tab=admin-users';
    } catch (err) {
      console.error('Failed to exit impersonation:', err);
      setExiting(false);
    }
  };

  return (
    <div className="w-full bg-gradient-to-r from-amber-600 via-amber-500 to-orange-600 text-slate-950 px-3 sm:px-6 py-2 sm:py-2.5 shadow-lg shadow-amber-500/20 relative z-[9999] border-b border-amber-300/40 select-none">
      <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2.5 sm:gap-4 text-xs font-sans">
        {/* Left: Indicator & User Details */}
        <div className="flex items-center gap-2.5 min-w-0 text-center sm:text-left">
          <div className="w-7 h-7 rounded-lg bg-black/20 flex items-center justify-center flex-shrink-0 text-slate-950 font-bold">
            <Eye size={16} className="animate-pulse" />
          </div>

          <div className="min-w-0">
            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-1.5 font-bold">
              <span className="bg-black/25 text-white px-2 py-0.5 rounded text-[10px] font-mono uppercase tracking-wider font-extrabold">
                ADMIN IMPERSONATION ACTIVE
              </span>
              <span className="text-slate-950 truncate">
                Interacting as <strong className="text-black font-extrabold underline">{user?.displayName || user?.username || 'Streamer'}</strong> (@{user?.username})
              </span>
            </div>
            <p className="text-[11px] text-slate-900/90 hidden md:block">
              All settings, overlays, soundboard, and actions apply directly to this streamer&apos;s account.
            </p>
          </div>
        </div>

        {/* Right: Exit Button */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <button
            type="button"
            onClick={handleExit}
            disabled={exiting}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-slate-950 hover:bg-black text-amber-300 hover:text-amber-200 border border-black/30 font-mono font-black text-xs shadow-md transition-all cursor-pointer active:scale-95 disabled:opacity-50"
          >
            {exiting ? (
              <>
                <Loader2 size={13} className="animate-spin text-amber-300" />
                <span>Returning...</span>
              </>
            ) : (
              <>
                <LogOut size={13} />
                <span>Exit to Admin {impersonatorAdmin?.email ? `(${impersonatorAdmin.email.split('@')[0]})` : ''}</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
