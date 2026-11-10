'use client';

import React from 'react';
import { Link } from 'react-router-dom';
import { Activity } from 'lucide-react';

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
  const widgetLinks = [
    { name: 'Donation Tip Alerts', path: '/resources/donations-alerts' },
    { name: 'Media Share & Sync', path: '/resources/media-share' },
    { name: 'Video Alerts (YouTube)', path: '/resources/video-alerts' },
    { name: 'Stream Soundboard SFX', path: '/resources/soundboard' },
    { name: 'Subathon Timer', path: '/resources/timer' },
    { name: 'Goal Tracker Bar', path: '/resources/goal' },
    { name: 'Wheel of Fortune', path: '/resources/wheels' },
    { name: 'Top Supporters Board', path: '/resources/leaderboard' }
  ];

  const platformLinks = [
    { name: 'Creator Panel', path: '/creator' },
    { name: 'Pricing & Pro Plan', path: '/pricing' },
    { name: 'Documentations & Guides', path: '/documentation' },
    { name: 'OBS Browser Source Guide', path: '/documentation/obs-studio' },
    { name: 'Live Heartbeat Status', path: '/status', badge: 'LIVE' },
    { name: 'Discord Community Hub', path: '/discord' },
    { name: 'Telegram Bot Service', path: 'https://t.me/streambotkh', external: true }
  ];

  return (
    <footer className="relative border-t border-slate-800/80 bg-[#06080F] text-slate-300 overflow-hidden font-sans">
      {/* Decorative ambient gradient backdrop */}
      <div className="absolute top-0 left-1/4 -translate-y-1/2 w-96 h-96 bg-cyan-500/5 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute top-1/2 right-10 -translate-y-1/2 w-96 h-96 bg-purple-500/5 rounded-full blur-3xl pointer-events-none" />

      {/* Main Multi-Column Content Area */}
      <div className="max-w-[1720px] 2xl:max-w-[1840px] mx-auto px-6 sm:px-10 lg:px-12 xl:px-16 2xl:px-20 py-10 sm:py-14 relative z-10">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10 lg:gap-8">
          
          {/* Column 1: Brand & Identity (Typographic Title Branding + Telegram / Discord / Status Icons) */}
          <div className="lg:col-span-2 space-y-5">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-2xl font-black text-white tracking-wider font-mono">
                  STREAMBOT<span className="text-cyan-400">KH</span>
                </span>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 font-mono">
                  v2.4
                </span>
              </div>
              <p className="text-[11px] text-slate-400 font-mono tracking-tight mt-1">
                ABA PAYWAY &amp; BAKONG KHQR OVERLAY ENGINE
              </p>
            </div>

            {/* Telegram, Discord, Status as Icons */}
            <div className="flex items-center gap-2.5 pt-1">
              <a
                href="https://t.me/streambotkh"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Telegram"
                title="Official Telegram Channel"
                className="w-10 h-10 rounded-xl bg-slate-900/80 hover:bg-sky-500/15 border border-slate-800 hover:border-sky-500/30 text-slate-400 hover:text-sky-400 flex items-center justify-center transition-all duration-200 hover:scale-105 active:scale-95 shadow-sm"
              >
                <TelegramIcon className="w-4.5 h-4.5" />
              </a>

              <a
                href="https://discord.gg/streambotkh"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Discord"
                title="Official Discord Server"
                className="w-10 h-10 rounded-xl bg-slate-900/80 hover:bg-indigo-500/15 border border-slate-800 hover:border-indigo-500/30 text-slate-400 hover:text-indigo-400 flex items-center justify-center transition-all duration-200 hover:scale-105 active:scale-95 shadow-sm"
              >
                <DiscordIcon className="w-4.5 h-4.5" />
              </a>

              <Link
                to="/status"
                aria-label="System Status"
                title="System Status & Telemetry"
                className="w-10 h-10 rounded-xl bg-slate-900/80 hover:bg-emerald-500/15 border border-slate-800 hover:border-emerald-500/30 text-slate-400 hover:text-emerald-400 flex items-center justify-center transition-all duration-200 hover:scale-105 active:scale-95 shadow-sm relative group"
              >
                <Activity className="w-4.5 h-4.5" />
                <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-emerald-500 rounded-full border border-[#06080F] animate-pulse" />
              </Link>
            </div>
          </div>

          {/* Column 2: Overlays & Interactive Widgets (Clean Text List, No Icons) */}
          <div className="space-y-4">
            <h4 className="text-xs font-bold text-white uppercase tracking-wider font-mono">
              Overlay Widgets
            </h4>
            <ul className="space-y-2 text-sm">
              {widgetLinks.map((item) => (
                <li key={item.path}>
                  <Link
                    to={item.path}
                    className="text-xs sm:text-[13px] text-slate-400 hover:text-cyan-300 transition-colors py-0.5 block"
                  >
                    {item.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Column 3: Platform & Resources (Clean Text List, No Icons) */}
          <div className="space-y-4">
            <h4 className="text-xs font-bold text-white uppercase tracking-wider font-mono">
              Platform &amp; Docs
            </h4>
            <ul className="space-y-2 text-sm">
              {platformLinks.map((item) => (
                <li key={item.path + item.name}>
                  {item.external ? (
                    <a
                      href={item.path}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs sm:text-[13px] text-slate-400 hover:text-cyan-300 transition-colors py-0.5 block"
                    >
                      {item.name}
                    </a>
                  ) : (
                    <Link
                      to={item.path}
                      className="inline-flex items-center gap-2 text-xs sm:text-[13px] text-slate-400 hover:text-cyan-300 transition-colors py-0.5"
                    >
                      <span>{item.name}</span>
                      {item.badge && (
                        <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                          {item.badge}
                        </span>
                      )}
                    </Link>
                  )}
                </li>
              ))}
            </ul>
          </div>

        </div>
      </div>
    </footer>
  );
};
