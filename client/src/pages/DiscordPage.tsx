import React from 'react';
import {
  Users,
  MessageSquare,
  Sparkles,
  ExternalLink,
  ShieldCheck,
  Radio,
  Tv,
  CheckCircle2,
  Heart,
  Bot
} from 'lucide-react';

interface DiscordPageProps {
  onNavigate: (page: string) => void;
}

// Discord Icon SVG
const DiscordIcon = () => (
  <svg className="w-5 h-5 flex-shrink-0" viewBox="0 0 24 24" fill="currentColor">
    <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994.021-.041.001-.09-.041-.106a13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.929 1.793 8.18 1.793 12.061 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.894.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.028zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z" />
  </svg>
);

export const DiscordPage: React.FC<DiscordPageProps> = ({ onNavigate }) => {
  return (
    <div className="min-h-screen py-16 px-4 sm:px-6 lg:px-8 max-w-6xl mx-auto space-y-16">
      {/* Header */}
      <div className="text-center space-y-4 max-w-2xl mx-auto">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-slate-900 border border-slate-800 text-xs font-mono text-[#5865F2]">
          <DiscordIcon />
          <span className="uppercase tracking-widest font-semibold">STREAMBOTKH COMMUNITY</span>
        </div>
        <h1 className="text-4xl sm:text-5xl font-extrabold text-white tracking-tight">
          Join Cambodia's Streamer Hub
        </h1>
        <p className="text-sm sm:text-base text-slate-400 leading-relaxed">
          Connect with 2,400+ live streamers, get instant OBS setup help, share custom alert overlays, and speak directly with our engineering team.
        </p>

        {/* Action Button */}
        <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-4">
          <a
            href="https://discord.gg/streambotkh"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2.5 px-6 py-3 rounded-xl bg-[#5865F2] hover:bg-[#4752C4] text-white font-bold text-sm transition-colors"
          >
            <DiscordIcon />
            <span>Join Official Discord Server</span>
            <ExternalLink size={14} />
          </a>
          <button
            onClick={() => onNavigate('resources')}
            className="px-5 py-3 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 text-sm font-semibold transition-colors"
          >
            Explore Resources
          </button>
        </div>
      </div>

      {/* Live Server Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="rounded-2xl border border-slate-800 bg-[#0B0F19] p-5 text-center space-y-1">
          <div className="text-2xl font-extrabold text-white">2,480+</div>
          <div className="text-xs text-slate-400 font-mono">Total Creators</div>
        </div>
        <div className="rounded-2xl border border-slate-800 bg-[#0B0F19] p-5 text-center space-y-1">
          <div className="text-2xl font-extrabold text-emerald-400 flex items-center justify-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
            680+
          </div>
          <div className="text-xs text-slate-400 font-mono">Online Now</div>
        </div>
        <div className="rounded-2xl border border-slate-800 bg-[#0B0F19] p-5 text-center space-y-1">
          <div className="text-2xl font-extrabold text-cyan-400">&lt; 5m</div>
          <div className="text-xs text-slate-400 font-mono">Average Support Reply</div>
        </div>
        <div className="rounded-2xl border border-slate-800 bg-[#0B0F19] p-5 text-center space-y-1">
          <div className="text-2xl font-extrabold text-purple-400">100%</div>
          <div className="text-xs text-slate-400 font-mono">Free Community Access</div>
        </div>
      </div>

      {/* Community Channels Breakdown */}
      <div className="space-y-6">
        <div className="text-center space-y-2">
          <h2 className="text-2xl font-bold text-white">Popular Community Channels</h2>
          <p className="text-xs text-slate-400">What you'll find when you join</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="rounded-2xl border border-slate-800 bg-[#0B0F19] p-6 space-y-3 hover:border-slate-700 transition-colors">
            <div className="p-3 rounded-xl bg-pink-500/10 border border-pink-500/20 text-pink-400 w-fit">
              <Tv size={20} />
            </div>
            <h3 className="text-base font-bold text-white font-mono">#obs-help & overlays</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Get assistance positioning your alert box, importing custom CSS themes, and optimizing OBS performance for 60FPS.
            </p>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-[#0B0F19] p-6 space-y-3 hover:border-slate-700 transition-colors">
            <div className="p-3 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 w-fit">
              <Bot size={20} />
            </div>
            <h3 className="text-base font-bold text-white font-mono">#aba-bakong-setup</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Discussions on merchant credentials, pushback webhook configuration, and Bakong KHQR testing.
            </p>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-[#0B0F19] p-6 space-y-3 hover:border-slate-700 transition-colors">
            <div className="p-3 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-400 w-fit">
              <Radio size={20} />
            </div>
            <h3 className="text-base font-bold text-white font-mono">#streamer-showcase</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Drop your stream link whenever you go live on Twitch, YouTube, TikTok, or Facebook to gain viewer traffic!
            </p>
          </div>
        </div>
      </div>

      {/* Community Roles & Perks */}
      <div className="rounded-2xl border border-slate-800 bg-[#0B0F19] p-8 space-y-6">
        <h3 className="text-xl font-bold text-white">Community Roles & Perks</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
          <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 space-y-2">
            <div className="text-cyan-400 font-bold font-mono">@Verified Streamer</div>
            <p className="text-slate-400">Available to all creators actively using streambotkh overlays on stream.</p>
          </div>
          <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 space-y-2">
            <div className="text-pink-400 font-bold font-mono">@Pro VIP Creator</div>
            <p className="text-slate-400">Exclusive access to private VIP lounge and priority dev support tickets.</p>
          </div>
          <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 space-y-2">
            <div className="text-purple-400 font-bold font-mono">@Beta Tester</div>
            <p className="text-slate-400">Try new alert animations, sound packs, and bot features before public launch.</p>
          </div>
        </div>
      </div>
    </div>
  );
};
