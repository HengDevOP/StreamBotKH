import React, { useState } from 'react';
import { Bot, ShieldCheck, Sparkles, ArrowRight } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/common/Button';

interface LoginPageProps {
  onSuccess: () => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({ onSuccess }) => {
  const { loginWithGoogle, loginDemo, loading } = useAuth();
  const [googleEmail, setGoogleEmail] = useState('');
  const [googleName, setGoogleName] = useState('');
  const [showCustomGoogle, setShowCustomGoogle] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const handleDemoLogin = async () => {
    try {
      await loginDemo();
      onSuccess();
    } catch (err: any) {
      alert('Demo login failed: ' + err.message);
    }
  };

  const handleCustomGoogleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!googleEmail.trim()) return;

    setSubmitting(true);
    try {
      await loginWithGoogle('mock-google-token', googleEmail.trim(), googleName.trim() || undefined);
      onSuccess();
    } catch (err: any) {
      alert('Google login failed: ' + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 py-16">
      <div className="w-full max-w-md p-8 sm:p-10 space-y-7 text-center rounded-2xl border border-slate-800 bg-[#0B0F19]">
        {/* Brand Logo */}
        <div className="w-14 h-14 rounded-2xl bg-slate-900 border border-slate-700 mx-auto flex items-center justify-center">
          <Bot size={28} className="text-cyan-400" />
        </div>

        <div className="space-y-1.5">
          <h2 className="text-2xl font-extrabold text-white font-['Chakra_Petch'] tracking-wide">
            streambot<span className="text-cyan-400">kh</span>.com
          </h2>
          <p className="text-xs text-slate-400">
            Sign in to access your livestream alerts & ABA Bakong dashboard
          </p>
        </div>

        {/* 1-Click Instant Demo Streamer Button */}
        <div className="p-5 rounded-xl bg-slate-900 border border-slate-800 space-y-3">
          <div className="flex items-center justify-center gap-1.5 text-xs text-cyan-400 font-semibold font-mono">
            <Sparkles size={14} />
            <span>INSTANT DEMO ONBOARDING</span>
          </div>
          <Button
            variant="primary"
            size="md"
            onClick={handleDemoLogin}
            loading={loading}
            className="w-full font-bold text-xs tracking-wider uppercase"
          >
            1-Click Demo Login (@neonstreamer)
          </Button>
          <span className="text-[11px] text-slate-400 block font-sans">
            Instant entry as pre-configured streamer with test alerts and transactions.
          </span>
        </div>

        {/* Divider */}
        <div className="flex items-center gap-3">
          <div className="h-px bg-slate-800 flex-1" />
          <span className="text-[10px] font-mono text-slate-500 uppercase tracking-widest">OR USE GOOGLE</span>
          <div className="h-px bg-slate-800 flex-1" />
        </div>

        {/* Google Sign In */}
        {!showCustomGoogle ? (
          <button
            type="button"
            onClick={() => setShowCustomGoogle(true)}
            className="w-full py-3 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs sm:text-sm flex items-center justify-center gap-3 border border-slate-700 hover:border-slate-500 transition-colors cursor-pointer"
          >
            <svg className="w-4 h-4 flex-shrink-0" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.17z"/>
              <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.33 24 12 24z"/>
              <path fill="#FBBC05" d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 9.98 0 12s.45 3.82 1.25 5.42l4.03-3.15z"/>
              <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"/>
            </svg>
            <span>Sign in with Google</span>
          </button>
        ) : (
          <form onSubmit={handleCustomGoogleSubmit} className="space-y-3 text-left">
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1 font-mono">Google Email</label>
              <input
                type="email"
                required
                placeholder="streamer@gmail.com"
                value={googleEmail}
                onChange={(e) => setGoogleEmail(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-cyan-400 transition-colors"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1 font-mono">Channel Name</label>
              <input
                type="text"
                placeholder="My Channel"
                value={googleName}
                onChange={(e) => setGoogleName(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-cyan-400 transition-colors"
              />
            </div>
            <Button
              type="submit"
              variant="primary"
              size="md"
              loading={submitting}
              className="w-full font-bold"
            >
              Sign In with Google
            </Button>
          </form>
        )}

        <div className="pt-2 text-[11px] font-mono text-slate-500 flex items-center justify-center gap-1.5">
          <ShieldCheck size={14} className="text-cyan-400" />
          <span>SSL 256-Bit Encrypted Streamer Auth</span>
        </div>
      </div>
    </div>
  );
};
