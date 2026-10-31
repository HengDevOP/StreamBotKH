'use client';

import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Bell,
  Layers,
  Video,
  Trophy,
  Volume2,
  Disc,
  Target,
  Timer,
  ShieldCheck,
  Zap,
  ArrowUp,
  ExternalLink,
  Sparkles,
  Radio,
  Tv,
  CheckCircle2,
  Lock,
  ChevronRight,
  Globe2,
  Activity
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

// Official Discord Icon
const DiscordIcon = ({ className = 'w-4 h-4' }: { className?: string }) => (
  <svg className={`${className} flex-shrink-0`} viewBox="0 0 24 24" fill="currentColor">
    <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994.021-.041.001-.09-.041-.106a13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.929 1.793 8.18 1.793 12.061 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.894.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.028zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z" />
  </svg>
);

// Official Telegram Icon
const TelegramIcon = ({ className = 'w-4 h-4' }: { className?: string }) => (
  <svg className={`${className} flex-shrink-0`} viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.894 8.221l-1.97 9.28c-.145.658-.537.818-1.084.508l-3-2.21-1.446 1.394c-.16.16-.295.295-.605.295l.213-3.053 5.56-5.023c.242-.213-.054-.333-.373-.121l-6.871 4.326-2.962-.924c-.643-.204-.657-.643.136-.953l11.57-4.461c.536-.195 1.006.128.832.942z" />
  </svg>
);

export const Footer: React.FC = () => {
  const { user, loginWithGoogleRedirect } = useAuth();
  const navigate = useNavigate();

  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    });
  };

  const widgetLinks = [
    { name: 'Donation Tip Alerts', path: '/resources/donations-alerts', icon: Bell, color: 'text-cyan-400' },
    { name: 'Media Share & Sync', path: '/resources/media-share', icon: Layers, color: 'text-blue-400' },
    { name: 'Video Alerts (YouTube)', path: '/resources/video-alerts', icon: Video, color: 'text-pink-400' },
    { name: 'Stream Soundboard SFX', path: '/resources/soundboard', icon: Volume2, color: 'text-emerald-400' },
    { name: 'Subathon Timer', path: '/resources/timer', icon: Timer, color: 'text-orange-400' },
    { name: 'Goal Tracker Bar', path: '/resources/goal', icon: Target, color: 'text-teal-400' },
    { name: 'Wheel of Fortune', path: '/resources/wheels', icon: Disc, color: 'text-purple-400' },
    { name: 'Top Supporters Board', path: '/resources/leaderboard', icon: Trophy, color: 'text-amber-400' }
  ];

  const platformLinks = [
    { name: 'Creator Dashboard', path: '/dashboard' },
    { name: 'Pricing & Pro Plan', path: '/pricing' },
    { name: 'Guides & Documentation', path: '/documents' },
    { name: 'OBS Browser Source Guide', path: '/documents' },
    { name: 'Live Heartbeat Status', path: '/status', badge: 'LIVE' },
    { name: 'Discord Community Hub', path: '/discord' }
  ];

  const paymentRails = [
    { name: 'ABA PayWay', sub: 'Instant Webhook Tip Alert' },
    { name: 'Bakong KHQR', sub: 'All Cambodian Banks & Wallets' },
    { name: 'Acleda & Wing', sub: 'National KHQR Standard' },
    { name: 'Direct to Bank', sub: 'Zero Middleman Escrow Holding' }
  ];

  return (
    <footer className="relative border-t border-slate-800/80 bg-[#06080F] text-slate-300 overflow-hidden font-sans">
      {/* Decorative ambient gradient backdrop */}
      <div className="absolute top-0 left-1/4 -translate-y-1/2 w-96 h-96 bg-cyan-500/5 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute top-1/2 right-10 -translate-y-1/2 w-96 h-96 bg-purple-500/5 rounded-full blur-3xl pointer-events-none" />

      {/* Top Pre-Footer Callout / Call To Action */}
      <div className="border-b border-slate-800/60 bg-gradient-to-r from-slate-900/60 via-slate-900/30 to-slate-900/60 py-10 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="space-y-2 text-center md:text-left">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 text-xs font-semibold uppercase tracking-wider">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Next-Gen Streaming Technology</span>
            </div>
            <h3 className="text-xl sm:text-2xl font-black text-white tracking-tight">
              Ready to elevate your live broadcast experience?
            </h3>
            <p className="text-sm text-slate-400 max-w-xl">
              Connect your ABA PayWay or Bakong KHQR account in under 2 minutes and start receiving zero-latency tip alerts on OBS Studio.
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-3">
            {user ? (
              <button
                onClick={() => navigate('/dashboard')}
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-bold text-sm shadow-lg shadow-cyan-500/20 transition-all flex items-center gap-2"
              >
                <Tv className="w-4 h-4" />
                <span>Open Dashboard</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                onClick={() => loginWithGoogleRedirect()}
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-bold text-sm shadow-lg shadow-cyan-500/20 transition-all flex items-center gap-2"
              >
                <Zap className="w-4 h-4" />
                <span>Start Free with Google</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            )}
            <Link
              to="/documents"
              className="px-4 py-2.5 rounded-xl bg-slate-800/80 hover:bg-slate-700/80 text-slate-200 border border-slate-700 text-sm font-semibold transition-all flex items-center gap-2"
            >
              <span>Explore Widgets</span>
            </Link>
          </div>
        </div>
      </div>

      {/* Main Multi-Column Content Area */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-10 lg:gap-8">
          
          {/* Column 1: Brand & Identity (Spans 2 cols on LG) */}
          <div className="lg:col-span-2 space-y-5">
            <div className="flex items-center gap-3">
              <div className="relative">
                <img
                  src="/images/logo-64.png"
                  alt="StreamBot KH Logo"
                  className="w-10 h-10 object-contain drop-shadow-[0_0_12px_rgba(6,182,212,0.5)]"
                />
                <span className="absolute -bottom-1 -right-1 w-3 h-3 bg-emerald-500 border-2 border-[#06080F] rounded-full animate-pulse" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xl font-black text-white tracking-wider font-mono">
                    STREAMBOT<span className="text-cyan-400">KH</span>
                  </span>
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 font-mono">
                    v2.4
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 font-mono tracking-tight">
                  ABA PAYWAY &amp; BAKONG KHQR OVERLAY ENGINE
                </p>
              </div>
            </div>

            <p className="text-sm text-slate-400 leading-relaxed max-w-sm">
              The premier interactive streaming overlay suite built exclusively for Cambodian live streamers. Direct bank settlement, real-time audio/visual alerts, soundboards, and OBS Studio integration.
            </p>

            {/* Live System Operational Status Badge */}
            <div className="pt-1">
              <Link
                to="/status"
                className="inline-flex items-center gap-2.5 px-3.5 py-2 rounded-xl bg-slate-900/90 hover:bg-slate-800/90 border border-slate-800 text-xs text-slate-300 transition-all group"
              >
                <span className="relative flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
                </span>
                <span className="font-mono text-emerald-400 font-bold group-hover:underline">
                  All Systems Operational
                </span>
                <span className="text-slate-600">•</span>
                <span className="text-[11px] text-slate-400 font-mono">99.98% Uptime</span>
                <ChevronRight className="w-3.5 h-3.5 text-slate-500 group-hover:text-slate-300 transition-colors ml-auto" />
              </Link>
            </div>

            {/* Official Social & Community Channels */}
            <div className="pt-2">
              <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
                Join Creator Community
              </div>
              <div className="flex flex-wrap items-center gap-2.5">
                <a
                  href="https://t.me/streambotkh"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-sky-500/10 hover:bg-sky-500/20 border border-sky-500/20 text-sky-400 hover:text-sky-300 text-xs font-medium transition-all"
                  title="Official Telegram Channel & Notifications"
                >
                  <TelegramIcon className="w-4 h-4" />
                  <span>Telegram</span>
                  <ExternalLink className="w-3 h-3 opacity-60" />
                </a>

                <a
                  href="https://discord.gg/streambotkh"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/20 text-indigo-400 hover:text-indigo-300 text-xs font-medium transition-all"
                  title="Official Discord Server"
                >
                  <DiscordIcon className="w-4 h-4" />
                  <span>Discord</span>
                  <ExternalLink className="w-3 h-3 opacity-60" />
                </a>

                <Link
                  to="/status"
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700 text-slate-300 hover:text-white text-xs font-medium transition-all"
                  title="Realtime API & Node Telemetry"
                >
                  <Activity className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Status</span>
                </Link>
              </div>
            </div>
          </div>

          {/* Column 2: Overlays & Interactive Widgets */}
          <div className="space-y-4">
            <h4 className="text-xs font-bold text-white uppercase tracking-wider font-mono flex items-center gap-2">
              <Radio className="w-3.5 h-3.5 text-cyan-400" />
              <span>Overlay Widgets</span>
            </h4>
            <ul className="space-y-2 text-sm">
              {widgetLinks.map((item) => {
                const Icon = item.icon;
                return (
                  <li key={item.path}>
                    <Link
                      to={item.path}
                      className="group flex items-center gap-2 text-slate-400 hover:text-white transition-colors py-0.5"
                    >
                      <Icon className={`w-3.5 h-3.5 ${item.color} group-hover:scale-110 transition-transform`} />
                      <span className="text-xs sm:text-[13px]">{item.name}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>

          {/* Column 3: Platform & Resources */}
          <div className="space-y-4">
            <h4 className="text-xs font-bold text-white uppercase tracking-wider font-mono flex items-center gap-2">
              <Layers className="w-3.5 h-3.5 text-blue-400" />
              <span>Platform &amp; Docs</span>
            </h4>
            <ul className="space-y-2 text-sm">
              {platformLinks.map((item) => (
                <li key={item.path + item.name}>
                  <Link
                    to={item.path}
                    className="group inline-flex items-center gap-2 text-slate-400 hover:text-white transition-colors py-0.5"
                  >
                    <ChevronRight className="w-3 h-3 text-slate-600 group-hover:text-cyan-400 group-hover:translate-x-0.5 transition-all" />
                    <span className="text-xs sm:text-[13px]">{item.name}</span>
                    {item.badge && (
                      <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                        {item.badge}
                      </span>
                    )}
                  </Link>
                </li>
              ))}
              <li>
                <a
                  href="https://t.me/streambotkh"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group inline-flex items-center gap-2 text-slate-400 hover:text-white transition-colors py-0.5"
                >
                  <ChevronRight className="w-3 h-3 text-slate-600 group-hover:text-cyan-400 transition-all" />
                  <span className="text-xs sm:text-[13px]">Telegram Bot Service</span>
                  <ExternalLink className="w-3 h-3 text-slate-600" />
                </a>
              </li>
            </ul>
          </div>

          {/* Column 4: Payments & Security */}
          <div className="space-y-4">
            <h4 className="text-xs font-bold text-white uppercase tracking-wider font-mono flex items-center gap-2">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span>Payment &amp; Trust</span>
            </h4>

            <div className="space-y-3">
              {paymentRails.map((rail, idx) => (
                <div
                  key={idx}
                  className="p-2.5 rounded-lg bg-slate-900/60 border border-slate-800/80 space-y-0.5"
                >
                  <div className="flex items-center gap-1.5 text-xs font-bold text-slate-200">
                    <CheckCircle2 className="w-3.5 h-3.5 text-cyan-400 flex-shrink-0" />
                    <span>{rail.name}</span>
                  </div>
                  <div className="text-[11px] text-slate-400 pl-5">
                    {rail.sub}
                  </div>
                </div>
              ))}
            </div>

            <div className="pt-2 text-[11px] text-slate-400 flex items-center gap-1.5">
              <Lock className="w-3.5 h-3.5 text-slate-500" />
              <span>256-Bit SSL Encrypted Webhook</span>
            </div>
          </div>

        </div>
      </div>

      {/* Sub-Footer / Copyright & Back-to-Top Bar */}
      <div className="border-t border-slate-800/80 bg-[#05060B] py-6 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-xs font-mono text-slate-400">
          
          <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 text-center sm:text-left">
            <span>&copy; {new Date().getFullYear()} STREAMBOTKH.COM</span>
            <span className="hidden sm:inline text-slate-700">•</span>
            <span>All rights reserved.</span>
            <span className="hidden md:inline text-slate-700">•</span>
            <span className="text-slate-400">Made for Cambodian Streamers 🇰🇭</span>
          </div>

          <div className="flex items-center gap-4">
            <Link to="/status" className="hover:text-emerald-400 transition-colors flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span>API Status</span>
            </Link>
            <span className="text-slate-700">•</span>
            <Link to="/documents" className="hover:text-slate-200 transition-colors">
              Terms &amp; Docs
            </Link>
            <span className="text-slate-700">•</span>
            <button
              onClick={scrollToTop}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-all text-xs"
              title="Scroll to Top"
            >
              <span>Top</span>
              <ArrowUp className="w-3.5 h-3.5" />
            </button>
          </div>

        </div>
      </div>
    </footer>
  );
};
