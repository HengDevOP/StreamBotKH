'use client';

import React from 'react';
import {
  Check,
  CheckCircle2,
  Copy,
  DollarSign,
  Grid,
  Play,
  Radio,
  Users
} from 'lucide-react';

export interface StreamerClient {
  id: string;
  name: string;
  username: string;
  avatar: string;
  bio?: string;
  isVerified?: boolean;
  game: string;
  viewers: number;
  isLive: boolean;
  videoEmbedUrl?: string;
  youtubeId?: string;
  tipUsername?: string;
  isTelegramConnected?: boolean;
  hasTelegramGroup?: boolean;
  hasMasterKhqr?: boolean;
  isTipConfigured?: boolean;
  videoAlertEnabled?: boolean;
  hasVideoOverlay?: boolean;
  videoMinTipAmount?: number;
  videoMaxDurationSeconds?: number;
  plan?: string;
}

export interface ChatMessage {
  id: string;
  author: string;
  avatar?: string;
  badge?: string;
  badgeColor?: string;
  message: string;
  time: string;
  isTip?: boolean;
  tipAmount?: string;
}

/* ============================================================================
 * LOADING SKELETONS
 * ========================================================================== */

export const TelevisionPlayerSkeleton: React.FC = () => (
  <div
    aria-label="Loading broadcast feed"
    className="relative w-full h-full bg-[#070B14] flex flex-col items-center justify-center p-6 overflow-hidden select-none"
  >
    <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_40%,rgba(16,185,129,0.08),transparent_60%)] pointer-events-none" />
    {/* Top bar placeholder badges */}
    <div className="absolute top-3 left-3 right-3 flex items-center justify-between">
      <div className="h-6 w-28 rounded-lg bg-slate-800/70 animate-pulse" />
      <div className="h-6 w-20 rounded-lg bg-slate-800/60 animate-pulse" />
    </div>

    {/* Center signal pulse */}
    <div className="relative z-10 flex flex-col items-center gap-3 text-center">
      <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-slate-900/90 border border-slate-800 flex items-center justify-center shadow-inner">
        <Radio size={26} className="text-emerald-400/70 animate-pulse" />
      </div>
      <div className="space-y-2 flex flex-col items-center">
        <div className="h-4 w-40 sm:w-48 rounded-md bg-slate-800/80 animate-pulse" />
        <div className="h-3 w-28 sm:w-36 rounded-md bg-slate-800/50 animate-pulse" />
      </div>
    </div>

    {/* Subtle progress shimmer line */}
    <div className="absolute bottom-0 inset-x-0 h-0.5 bg-slate-800/60 overflow-hidden">
      <div className="h-full w-1/3 bg-gradient-to-r from-transparent via-emerald-400/60 to-transparent animate-pulse" />
    </div>
  </div>
);

export const TelevisionControlBarSkeleton: React.FC = () => (
  <div className="relative z-30 min-h-[42px] sm:min-h-[48px] py-1.5 px-2.5 sm:px-3.5 rounded-xl bg-[#090E1B]/95 border border-slate-800/80 flex items-center justify-between gap-3 shrink-0 shadow-xl">
    <div className="flex items-center gap-2.5 min-w-0">
      <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-slate-800/80 animate-pulse shrink-0" />
      <div className="space-y-1.5">
        <div className="h-3.5 w-24 sm:w-32 rounded bg-slate-800/80 animate-pulse" />
        <div className="h-2.5 w-16 rounded bg-slate-800/50 animate-pulse" />
      </div>
    </div>
    <div className="flex items-center gap-1.5 shrink-0">
      <div className="w-7 h-7 rounded-lg bg-slate-800/70 animate-pulse" />
      <div className="w-7 h-7 rounded-lg bg-slate-800/70 animate-pulse" />
      <div className="w-16 h-7 rounded-lg bg-slate-800/70 animate-pulse hidden sm:block" />
      <div className="w-7 h-7 rounded-lg bg-slate-800/70 animate-pulse" />
    </div>
  </div>
);

export const TelevisionRecommendedSkeleton: React.FC<{ count?: number }> = ({ count = 5 }) => (
  <div className="flex flex-nowrap items-stretch gap-3 overflow-hidden pb-1">
    {Array.from({ length: count }).map((_, idx) => (
      <div
        key={idx}
        className="w-[184px] xl:w-[202px] shrink-0 rounded-xl bg-[#090E1B] border border-slate-800/70 overflow-hidden flex flex-col"
      >
        <div className="w-full aspect-video bg-slate-800/50 animate-pulse relative">
          <div className="absolute top-2 left-2 h-4 w-12 rounded bg-slate-700/60" />
          <div className="absolute bottom-2 left-2 h-4 w-14 rounded bg-slate-700/60" />
        </div>
        <div className="p-2.5 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <div className="w-7 h-7 rounded-full bg-slate-800/80 animate-pulse shrink-0" />
            <div className="space-y-1.5 flex-1">
              <div className="h-3 w-20 rounded bg-slate-800/80 animate-pulse" />
              <div className="h-2.5 w-24 rounded bg-slate-800/50 animate-pulse" />
            </div>
          </div>
          <div className="h-6 w-11 rounded-lg bg-slate-800/70 animate-pulse shrink-0" />
        </div>
      </div>
    ))}
  </div>
);

export const TelevisionStreamerListSkeleton: React.FC<{ count?: number }> = ({ count = 6 }) => (
  <div className="space-y-2">
    {Array.from({ length: count }).map((_, idx) => (
      <div
        key={idx}
        className="p-2.5 rounded-xl bg-[#090E1B]/75 border border-slate-800/60 flex items-center justify-between gap-3"
      >
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <div className="w-9 h-9 rounded-full bg-slate-800/80 animate-pulse shrink-0" />
          <div className="space-y-1.5 flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <div className="h-3.5 w-24 rounded bg-slate-800/80 animate-pulse" />
              <div className="h-3.5 w-10 rounded bg-slate-800/60 animate-pulse" />
            </div>
            <div className="h-2.5 w-32 rounded bg-slate-800/50 animate-pulse" />
          </div>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <div className="w-6 h-6 rounded-lg bg-slate-800/60 animate-pulse" />
          <div className="w-5 h-5 rounded-full bg-slate-800/60 animate-pulse" />
        </div>
      </div>
    ))}
  </div>
);

export const TelevisionTipFormSkeleton: React.FC = () => (
  <div className="p-3.5 sm:p-4 rounded-2xl border border-slate-800/80 bg-[#0B101D] space-y-4">
    <div className="flex items-center justify-between">
      <div className="h-4 w-32 rounded bg-slate-800/80 animate-pulse" />
      <div className="h-6 w-16 rounded-lg bg-slate-800/60 animate-pulse" />
    </div>
    <div className="grid grid-cols-4 gap-2">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="h-10 rounded-xl bg-slate-800/60 animate-pulse" />
      ))}
    </div>
    <div className="space-y-2.5">
      <div className="h-10 w-full rounded-xl bg-slate-800/60 animate-pulse" />
      <div className="h-20 w-full rounded-xl bg-slate-800/50 animate-pulse" />
    </div>
    <div className="h-11 w-full rounded-xl bg-emerald-500/20 border border-emerald-500/20 animate-pulse" />
  </div>
);

/* ============================================================================
 * MEMOIZED CHANNEL, CAROUSEL & CHAT ROW CARDS
 * ========================================================================== */

interface TelevisionStreamerCardProps {
  streamer: StreamerClient;
  isSelected: boolean;
  isInMultiView: boolean;
  isCurrentUser: boolean;
  showControls?: boolean;
  onSelect: (streamer: StreamerClient) => void;
  onToggleMultiView: (e: React.MouseEvent, streamerId: string) => void;
}

export const TelevisionStreamerCard = React.memo<TelevisionStreamerCardProps>(
  ({
    streamer,
    isSelected,
    isInMultiView,
    isCurrentUser,
    showControls = true,
    onSelect,
    onToggleMultiView
  }) => {
    return (
      <div
        role="button"
        tabIndex={0}
        onClick={() => onSelect(streamer)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onSelect(streamer);
          }
        }}
        className={`p-2.5 rounded-xl flex items-center justify-between gap-3 cursor-pointer transition-all border ${
          isSelected
            ? 'bg-slate-800/90 border-emerald-500/60 shadow-lg shadow-emerald-950/40 ring-1 ring-emerald-500/30'
            : 'bg-[#090E1B]/70 border-slate-800/70 hover:bg-slate-800/50 hover:border-slate-700'
        }`}
        title={`${streamer.name} • ${streamer.game}`}
      >
        <div className="relative shrink-0">
          <img
            src={streamer.avatar}
            alt={streamer.name}
            loading="lazy"
            decoding="async"
            className={`w-9 h-9 rounded-full bg-slate-800 object-cover ring-2 ${
              streamer.isLive ? 'ring-emerald-500/75' : 'ring-slate-700/80 opacity-80'
            }`}
          />
          {streamer.isLive ? (
            <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse ring-2 ring-[#090D18]" />
          ) : (
            <span className="absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full bg-slate-600 ring-2 ring-[#090D18]" />
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="text-xs sm:text-sm font-bold text-white truncate leading-tight">
              {streamer.name}
            </span>
            {streamer.isVerified && (
              <CheckCircle2 size={12} className="text-emerald-400 shrink-0" />
            )}
            {isCurrentUser && (
              <span className="px-1.5 py-0.5 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 text-[8px] font-mono font-bold uppercase shrink-0 leading-none">
                You
              </span>
            )}
            {streamer.isLive ? (
              <span className="px-1.5 py-0.5 rounded bg-red-500/20 text-red-400 text-[8px] font-mono font-black shrink-0 leading-none">
                LIVE
              </span>
            ) : (
              <span className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-500 text-[8px] font-mono font-bold shrink-0 leading-none">
                OFFLINE
              </span>
            )}
          </div>
          <div className="flex items-center gap-2 mt-0.5 text-[10px] text-slate-400 font-mono truncate">
            <span className="truncate">{streamer.game}</span>
            {streamer.isLive && (
              <span className="text-red-400 font-bold inline-flex items-center gap-1 shrink-0">
                <Users size={11} className="text-red-400 shrink-0" />
                <span>{streamer.viewers.toLocaleString()}</span>
              </span>
            )}
          </div>
        </div>

        {showControls && (
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={(e) => onToggleMultiView(e, streamer.id)}
              className={`p-1.5 rounded-lg text-[10px] font-mono transition-colors cursor-pointer ${
                isInMultiView
                  ? 'text-emerald-400 bg-emerald-500/15 border border-emerald-500/30'
                  : 'text-slate-500 hover:text-slate-300 hover:bg-slate-800'
              }`}
              title={isInMultiView ? 'Remove from multi-view' : 'Add to multi-view (up to 4)'}
              aria-label={isInMultiView ? 'Remove from multi-view' : 'Add to multi-view'}
            >
              <Grid size={13} />
            </button>

            <div
              className={`w-5 h-5 rounded-full flex items-center justify-center transition-all ${
                isSelected
                  ? 'bg-emerald-400 text-slate-950 shadow-[0_0_10px_rgba(16,185,129,0.45)]'
                  : 'border border-slate-700 bg-slate-900/80'
              }`}
            >
              {isSelected && <Check size={12} className="stroke-[3]" />}
            </div>
          </div>
        )}
      </div>
    );
  }
);
TelevisionStreamerCard.displayName = 'TelevisionStreamerCard';

interface RecommendedStreamerCardProps {
  streamer: StreamerClient;
  isCurrent: boolean;
  onSelect: (streamer: StreamerClient) => void;
  onQuickTip: (e: React.MouseEvent, streamer: StreamerClient) => void;
}

export const RecommendedStreamerCard = React.memo<RecommendedStreamerCardProps>(
  ({ streamer, isCurrent, onSelect, onQuickTip }) => {
    return (
      <div
        role="button"
        tabIndex={0}
        onClick={() => onSelect(streamer)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onSelect(streamer);
          }
        }}
        className={`group relative w-[184px] xl:w-[202px] shrink-0 snap-start rounded-xl bg-[#090E1B] border transition-all duration-200 overflow-hidden cursor-pointer flex flex-col shadow-lg ${
          isCurrent
            ? 'border-emerald-500/70 ring-1 ring-emerald-500/30'
            : 'border-slate-800/80 hover:border-emerald-500/50 hover:bg-[#0D1324] hover:shadow-emerald-950/30'
        }`}
        title={`Watch ${streamer.name} (@${streamer.username})`}
      >
        <div className="relative w-full aspect-video bg-gradient-to-br from-[#0B1224] via-[#060913] to-[#0D162B] overflow-hidden flex items-center justify-center select-none">
          <img
            src={streamer.avatar}
            alt=""
            aria-hidden="true"
            loading="lazy"
            decoding="async"
            className="absolute inset-0 w-full h-full object-cover blur-2xl opacity-25 scale-125 pointer-events-none"
          />
          <div className="relative z-0 flex flex-col items-center justify-center gap-1.5 opacity-90">
            <img
              src={streamer.avatar}
              alt={streamer.name}
              loading="lazy"
              decoding="async"
              className="w-10 h-10 rounded-full bg-slate-900 border border-slate-700/80 object-cover shadow-md"
            />
            <span className="text-[10px] font-mono text-slate-400">@{streamer.username}</span>
          </div>

          {streamer.youtubeId && (
            <img
              src={`https://i.ytimg.com/vi/${streamer.youtubeId}/hqdefault.jpg`}
              alt={`${streamer.name} stream preview`}
              loading="lazy"
              decoding="async"
              onError={(e) => {
                (e.currentTarget as HTMLImageElement).style.display = 'none';
              }}
              className="absolute inset-0 z-10 w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            />
          )}

          <div className="absolute inset-x-0 bottom-0 h-12 z-20 bg-gradient-to-t from-black/85 via-black/30 to-transparent pointer-events-none" />

          <div className="absolute top-2 left-2 z-20">
            {streamer.isLive ? (
              <span className="px-2 py-0.5 rounded-md bg-red-600/95 text-white text-[10px] font-mono font-black tracking-wider uppercase flex items-center gap-1 shadow-md">
                <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                LIVE
              </span>
            ) : (
              <span className="px-2 py-0.5 rounded-md bg-slate-950/85 backdrop-blur-sm border border-slate-800 text-slate-400 text-[9px] font-mono font-bold uppercase">
                OFFLINE
              </span>
            )}
          </div>

          <div className="absolute bottom-2 left-2 right-2 z-20 flex items-center justify-between gap-2 pointer-events-none">
            {streamer.isLive ? (
              <span className="px-2 py-0.5 rounded-md bg-slate-950/85 backdrop-blur-sm border border-red-500/30 text-red-400 text-[10px] font-mono font-bold flex items-center gap-1">
                <Users size={11} className="text-red-400 shrink-0" />
                <span>{streamer.viewers.toLocaleString()}</span>
              </span>
            ) : (
              <span className="text-[10px] font-mono text-slate-300/90 truncate">
                {streamer.game}
              </span>
            )}
          </div>

          <div className="absolute inset-0 z-30 bg-black/35 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center pointer-events-none">
            <div className="w-10 h-10 rounded-full bg-emerald-400 text-slate-950 flex items-center justify-center shadow-lg shadow-emerald-500/40 transform scale-90 group-hover:scale-100 transition-transform duration-200">
              <Play size={18} className="fill-slate-950 ml-0.5" />
            </div>
          </div>
        </div>

        <div className="p-2.5 flex items-center justify-between gap-2 bg-[#090E1B] group-hover:bg-[#0D1324] transition-colors">
          <div className="flex items-center gap-2 min-w-0">
            <div className="relative shrink-0">
              <img
                src={streamer.avatar}
                alt={streamer.name}
                loading="lazy"
                decoding="async"
                className={`w-7 h-7 rounded-full bg-slate-800 object-cover ring-2 ${
                  streamer.isLive ? 'ring-emerald-500/70' : 'ring-slate-800'
                }`}
              />
              <span
                className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full ring-2 ring-[#090E1B] ${
                  streamer.isLive ? 'bg-emerald-400' : 'bg-slate-600'
                }`}
              />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1 min-w-0">
                <span className="text-xs font-bold text-white font-['Chakra_Petch'] truncate group-hover:text-emerald-300 transition-colors">
                  {streamer.name}
                </span>
                {streamer.isVerified && (
                  <CheckCircle2 size={12} className="text-emerald-400 shrink-0" />
                )}
              </div>
              <p className="text-[10px] font-mono text-slate-400 truncate">
                {streamer.bio || `@${streamer.username} • ${streamer.game}`}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={(e) => onQuickTip(e, streamer)}
            className="px-2 py-1 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 text-[10px] font-mono font-bold flex items-center gap-0.5 shrink-0 transition-colors cursor-pointer"
            title={`Tip ${streamer.name}`}
          >
            <DollarSign size={10} className="stroke-[2.5]" />
            <span>Tip</span>
          </button>
        </div>
      </div>
    );
  }
);
RecommendedStreamerCard.displayName = 'RecommendedStreamerCard';

interface ChatMessageRowProps {
  msg: ChatMessage;
  isCopied: boolean;
  onCopy: (text: string) => void;
}

export const ChatMessageRow = React.memo<ChatMessageRowProps>(({ msg, isCopied, onCopy }) => {
  const fullMsgText = `${msg.author}: ${msg.message}`;

  return (
    <div
      className={`p-2 rounded-xl border transition-all select-text group/chat ${
        msg.isTip
          ? 'bg-emerald-950/30 border-emerald-500/40 shadow-sm'
          : 'bg-slate-900/45 border-slate-800/60 hover:bg-slate-900/75'
      }`}
    >
      <div className="flex items-center justify-between gap-1.5 mb-1 select-text">
        <div className="flex items-center gap-1.5 min-w-0 select-text">
          <span className="font-bold text-white truncate text-[11px] select-text">
            @{msg.author}
          </span>
          {msg.badge && (
            <span
              className={`px-1.5 py-0.5 rounded text-[8px] font-bold uppercase tracking-wider shrink-0 leading-none ${
                msg.badgeColor || 'bg-slate-800 text-slate-300'
              }`}
            >
              {msg.badge}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1 shrink-0">
          {msg.isTip && msg.tipAmount && (
            <span className="px-1.5 py-0.5 rounded-full bg-emerald-400 text-slate-950 font-black text-[9px] font-mono flex items-center gap-0.5 select-text">
              <DollarSign size={9} className="stroke-[3]" />
              {msg.tipAmount}
            </span>
          )}
          <button
            type="button"
            onClick={() => onCopy(fullMsgText)}
            className="opacity-0 group-hover/chat:opacity-100 focus:opacity-100 transition-opacity p-0.5 rounded text-slate-400 hover:text-cyan-300 hover:bg-slate-800 cursor-pointer"
            title="Copy message text"
            aria-label="Copy message text"
          >
            {isCopied ? <Check size={11} className="text-emerald-400" /> : <Copy size={11} />}
          </button>
        </div>
      </div>
      <p className="text-slate-200 text-xs leading-relaxed break-words font-sans select-text cursor-default selection:bg-cyan-500/40 selection:text-white">
        {msg.message}
      </p>
    </div>
  );
});
ChatMessageRow.displayName = 'ChatMessageRow';
