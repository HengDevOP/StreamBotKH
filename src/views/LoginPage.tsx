'use client';

import React, { useState, useEffect } from 'react';
import { Bot, ShieldCheck, AlertCircle, Loader2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface LoginPageProps {
  onSuccess: () => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({ onSuccess }) => {
  const { user, loading, loginWithGoogleRedirect, setTokenAndRefresh } = useAuth();
  const [redirecting, setRedirecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Handle OAuth callback query parameters (?token=... or ?error=...)
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const params = new URLSearchParams(window.location.search);
    const urlError = params.get('error');
    const urlToken = params.get('token');

    if (urlError) {
      setError(urlError);
      params.delete('error');
      const newQuery = params.toString();
      window.history.replaceState(
        {},
        '',
        `${window.location.pathname}${newQuery ? `?${newQuery}` : ''}`
      );
    }

    if (urlToken) {
      params.delete('token');
      const newQuery = params.toString();
      window.history.replaceState(
        {},
        '',
        `${window.location.pathname}${newQuery ? `?${newQuery}` : ''}`
      );
      setTokenAndRefresh(urlToken).then(() => {
        onSuccess();
      });
    }
  }, []);

  // Automatically navigate to dashboard once user is authenticated
  useEffect(() => {
    if (!loading && user) {
      onSuccess();
    }
  }, [user, loading, onSuccess]);

  const handleGoogleSignIn = () => {
    setError(null);
    setRedirecting(true);
    loginWithGoogleRedirect();
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 py-16">
      <div className="w-full max-w-md p-8 sm:p-10 space-y-7 text-center rounded-2xl border border-slate-800 bg-[#0B0F19] shadow-2xl">
        {/* Brand Logo */}
        <div className="w-14 h-14 rounded-2xl bg-slate-900 border border-slate-700 mx-auto flex items-center justify-center">
          <Bot size={28} className="text-cyan-400" />
        </div>

        <div className="space-y-1.5">
          <h2 className="text-2xl font-extrabold text-white font-['Chakra_Petch'] tracking-wide">
            streambot<span className="text-cyan-400">kh</span>.com
          </h2>
          <p className="text-xs text-slate-400">
            Sign in with your Google account to access your livestream alerts &amp; ABA Bakong dashboard
          </p>
        </div>

        {/* Error notification banner */}
        {error && (
          <div className="p-3.5 rounded-xl bg-red-950/40 border border-red-500/30 text-red-300 text-xs flex items-start gap-2.5 text-left animate-fadeIn">
            <AlertCircle size={16} className="text-red-400 flex-shrink-0 mt-0.5" />
            <div className="flex-1 font-mono leading-relaxed">{error}</div>
          </div>
        )}

        {/* Full Google OAuth 2.0 Sign In Button */}
        <div className="pt-1">
          <button
            type="button"
            onClick={handleGoogleSignIn}
            disabled={redirecting || loading}
            className="w-full py-3.5 px-5 rounded-xl bg-white hover:bg-slate-100 text-slate-900 font-bold text-xs sm:text-sm flex items-center justify-center gap-3 border border-white/20 shadow-lg shadow-cyan-500/10 transition-all cursor-pointer disabled:opacity-60"
          >
            {redirecting || loading ? (
              <>
                <Loader2 size={18} className="animate-spin text-slate-700" />
                <span>Connecting to Google...</span>
              </>
            ) : (
              <>
                <svg className="w-5 h-5 flex-shrink-0" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.17z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.33 24 12 24z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 9.98 0 12s.45 3.82 1.25 5.42l4.03-3.15z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
                  />
                </svg>
                <span>Continue with Google</span>
              </>
            )}
          </button>
        </div>

        <div className="pt-2 text-[11px] font-mono text-slate-500 flex items-center justify-center gap-1.5">
          <ShieldCheck size={14} className="text-cyan-400" />
          <span>Google OAuth 2.0 • SSL 256-Bit Encrypted Auth</span>
        </div>
      </div>
    </div>
  );
};
