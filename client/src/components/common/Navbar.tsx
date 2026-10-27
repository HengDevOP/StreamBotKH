import React, { useState } from 'react';
import {
  Bot,
  ExternalLink,
  LogOut,
  Menu,
  X
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useSocket } from '../../context/SocketContext';

interface NavbarProps {
  onNavigate?: (page: string) => void;
  currentPage?: string;
}

// Official 4-color Google Icon
const GoogleIcon = () => (
  <svg className="w-4 h-4 flex-shrink-0" viewBox="0 0 24 24">
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
);

// Official Discord Icon
const DiscordIcon = () => (
  <svg className="w-4 h-4 flex-shrink-0" viewBox="0 0 24 24" fill="currentColor">
    <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994.021-.041.001-.09-.041-.106a13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.929 1.793 8.18 1.793 12.061 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.894.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.028zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z" />
  </svg>
);

export const Navbar: React.FC<NavbarProps> = ({ onNavigate, currentPage }) => {
  const { user, logout } = useAuth();
  const { connected } = useSocket();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 w-full bg-[#070A12]/95 backdrop-blur-md border-b border-white/[0.08]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 sm:h-18">
          {/* Left: Logo + Title ("streambotkh.com") + Nav Menu */}
          <div className="flex items-center gap-6 lg:gap-8">
            {/* Logo on the left & Title "streambotkh.com" */}
            <div
              className="flex items-center gap-3 cursor-pointer group select-none"
              onClick={() => onNavigate?.('home')}
            >
              {/* Clean Minimalist Logo */}
              <div className="w-9 h-9 rounded-xl bg-slate-900 border border-slate-700/80 flex items-center justify-center group-hover:border-cyan-400 transition-colors">
                <Bot className="text-cyan-400 w-5 h-5" />
              </div>

              {/* Title "streambotkh.com" */}
              <div className="flex items-center">
                <span className="text-xl sm:text-2xl font-bold tracking-tight text-white font-['Chakra_Petch']">
                  streambot<span className="text-cyan-400">kh</span>
                </span>
                <span className="text-xs font-mono font-semibold text-slate-400 ml-0.5">
                  .com
                </span>
              </div>
            </div>

            {/* Nav Menu directly after the title with own route page links */}
            <nav className="hidden md:flex items-center gap-1 pl-4 border-l border-slate-800">
              {/* 1. Home Route (/) */}
              <button
                onClick={() => onNavigate?.('home')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold tracking-wide transition-colors ${
                  currentPage === 'home'
                    ? 'text-white bg-white/[0.08]'
                    : 'text-slate-400 hover:text-white hover:bg-white/[0.04]'
                }`}
              >
                Home
              </button>

              {/* 2. Resources Route (/resources) */}
              <button
                onClick={() => onNavigate?.('resources')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold tracking-wide transition-colors ${
                  currentPage === 'resources'
                    ? 'text-white bg-white/[0.08]'
                    : 'text-slate-400 hover:text-white hover:bg-white/[0.04]'
                }`}
              >
                Resources
              </button>

              {/* 3. Pricing Route (/pricing) */}
              <button
                onClick={() => onNavigate?.('pricing')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold tracking-wide transition-colors ${
                  currentPage === 'pricing'
                    ? 'text-white bg-white/[0.08]'
                    : 'text-slate-400 hover:text-white hover:bg-white/[0.04]'
                }`}
              >
                Pricing
              </button>

              {/* 4. Discord Route (/discord) */}
              <button
                onClick={() => onNavigate?.('discord')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold tracking-wide transition-colors ${
                  currentPage === 'discord'
                    ? 'text-[#5865F2] bg-[#5865F2]/10 border border-[#5865F2]/30'
                    : 'text-slate-400 hover:text-[#5865F2] hover:bg-white/[0.04]'
                }`}
              >
                <DiscordIcon />
                <span>Discord</span>
              </button>

              {/* Streamer Dashboard Link when authenticated */}
              {user && (
                <button
                  onClick={() => onNavigate?.('dashboard')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold tracking-wide transition-colors ml-1 ${
                    currentPage === 'dashboard'
                      ? 'text-cyan-400 bg-cyan-950/40 border border-cyan-500/40'
                      : 'text-slate-400 hover:text-cyan-300 hover:bg-white/[0.04]'
                  }`}
                >
                  <span>Dashboard</span>
                  <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
                </button>
              )}
            </nav>
          </div>

          {/* Right Section (Flex End): "Sign in with Google" / Profile */}
          <div className="flex items-center gap-3">
            {/* Status indicator */}
            <div className="hidden lg:flex items-center gap-2 px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-800 text-[11px] font-mono text-slate-400">
              <span
                className={`w-2 h-2 rounded-full ${
                  connected ? 'bg-emerald-400' : 'bg-amber-400'
                }`}
              />
              <span>{connected ? 'ONLINE' : 'SYNCING'}</span>
            </div>

            {/* User authenticated or Sign In with Google */}
            {user ? (
              <div className="flex items-center gap-2">
                <div
                  className="flex items-center gap-2.5 py-1 px-2.5 rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-700 transition-colors cursor-pointer"
                  onClick={() => onNavigate?.('dashboard')}
                >
                  <img
                    src={
                      user.avatarUrl ||
                      `https://api.dicebear.com/7.x/bottts/svg?seed=${user.username}`
                    }
                    alt={user.displayName}
                    className="w-7 h-7 rounded-lg border border-slate-700 bg-slate-800 object-cover"
                  />
                  <div className="hidden sm:flex flex-col text-left">
                    <span className="text-xs font-semibold text-white leading-tight">
                      {user.displayName}
                    </span>
                    <span className="text-[10px] text-slate-400 font-mono leading-tight">
                      @{user.username}
                    </span>
                  </div>
                </div>

                <button
                  onClick={logout}
                  title="Sign Out"
                  className="p-2 rounded-lg text-slate-400 hover:text-red-400 hover:bg-red-500/10 border border-slate-800 transition-colors"
                >
                  <LogOut size={15} />
                </button>
              </div>
            ) : (
              /* Flat, clean "Sign in with Google" button on the flex end right side */
              <button
                type="button"
                onClick={() => onNavigate?.('login')}
                className="flex items-center gap-2.5 px-3.5 sm:px-4 py-2 rounded-xl bg-white/[0.06] hover:bg-white/[0.1] border border-white/[0.12] hover:border-white/[0.25] text-white font-medium text-xs sm:text-sm tracking-wide transition-colors active:scale-98 cursor-pointer"
              >
                <GoogleIcon />
                <span className="whitespace-nowrap">Sign in with Google</span>
              </button>
            )}

            {/* Mobile Hamburger Toggle */}
            <button
              onClick={() => setMobileMenuOpen((prev) => !prev)}
              className="md:hidden p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 border border-slate-800 transition-colors"
              aria-label="Toggle navigation menu"
            >
              {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-slate-800 bg-[#090D18] px-4 pt-3 pb-5 space-y-2">
          <button
            onClick={() => {
              onNavigate?.('home');
              setMobileMenuOpen(false);
            }}
            className={`w-full text-left px-3 py-2 rounded-lg text-xs font-semibold ${
              currentPage === 'home'
                ? 'text-white bg-white/[0.08]'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Home
          </button>

          <button
            onClick={() => {
              onNavigate?.('resources');
              setMobileMenuOpen(false);
            }}
            className={`w-full text-left px-3 py-2 rounded-lg text-xs font-semibold ${
              currentPage === 'resources'
                ? 'text-white bg-white/[0.08]'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Resources
          </button>

          <button
            onClick={() => {
              onNavigate?.('pricing');
              setMobileMenuOpen(false);
            }}
            className={`w-full text-left px-3 py-2 rounded-lg text-xs font-semibold ${
              currentPage === 'pricing'
                ? 'text-white bg-white/[0.08]'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Pricing
          </button>

          <button
            onClick={() => {
              onNavigate?.('discord');
              setMobileMenuOpen(false);
            }}
            className={`w-full text-left px-3 py-2 rounded-lg text-xs font-semibold flex items-center gap-2 ${
              currentPage === 'discord'
                ? 'text-[#5865F2] bg-[#5865F2]/10'
                : 'text-slate-400 hover:text-[#5865F2]'
            }`}
          >
            <DiscordIcon />
            <span>Discord</span>
          </button>

          {user && (
            <button
              onClick={() => {
                onNavigate?.('dashboard');
                setMobileMenuOpen(false);
              }}
              className="w-full text-left px-3 py-2 rounded-lg text-xs font-semibold text-cyan-400 hover:bg-slate-800"
            >
              Streamer Dashboard
            </button>
          )}

          {!user && (
            <div className="pt-2 border-t border-slate-800">
              <button
                onClick={() => {
                  onNavigate?.('login');
                  setMobileMenuOpen(false);
                }}
                className="w-full py-2.5 px-3 rounded-xl bg-white/[0.06] border border-white/[0.12] text-white font-medium text-xs flex items-center justify-center gap-2.5"
              >
                <GoogleIcon />
                <span>Sign in with Google</span>
              </button>
            </div>
          )}
        </div>
      )}
    </header>
  );
};
