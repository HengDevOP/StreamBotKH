'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  CheckCircle2,
  AlertCircle,
  X,
  ExternalLink,
  Copy,
  Check,
  Eye,
  EyeOff,
  Radio,
  Users,
  Sparkles,
  Sliders,
  MonitorPlay,
  Layers
} from 'lucide-react';
import { streamerService } from '../../services/streamerService';

export interface BroadcastStreamManagerProps {
  user: any;
  onRefreshUser?: () => Promise<void>;
  onNavigateToTab?: (tab: string) => void;
}

type PlatformId = 'youtube' | 'twitch' | 'tiktok' | 'facebook' | 'kick';

interface PlatformItem {
  id: PlatformId;
  name: string;
  subtitle: string;
  placeholder: string;
  logo: React.ReactNode;
}

const PLATFORMS: PlatformItem[] = [
  {
    id: 'youtube',
    name: 'YouTube',
    subtitle: 'YouTube Live Stream',
    placeholder: 'https://www.youtube.com/watch?v=... or https://youtube.com/live/...',
    logo: (
      <svg viewBox="0 0 24 24" className="w-5 h-5 fill-[#FF0000] shrink-0" aria-label="YouTube">
        <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
      </svg>
    )
  },
  {
    id: 'twitch',
    name: 'Twitch',
    subtitle: 'Twitch Channel',
    placeholder: 'https://twitch.tv/username',
    logo: (
      <svg viewBox="0 0 24 24" className="w-5 h-5 fill-[#9146FF] shrink-0" aria-label="Twitch">
        <path d="M11.571 4.714h1.715v5.143H11.57zm4.715 0H18v5.143h-1.714zM6 0L1.714 4.286v15.428h5.143V24l4.286-4.286h3.428L22.286 12V0zm14.571 11.143l-3.428 3.428h-3.429l-3 3v-3H6.857V1.714h13.714Z" />
      </svg>
    )
  },
  {
    id: 'tiktok',
    name: 'TikTok',
    subtitle: 'TikTok Live',
    placeholder: 'https://www.tiktok.com/@username/live',
    logo: (
      <svg viewBox="0 0 24 24" className="w-5 h-5 fill-white shrink-0" aria-label="TikTok">
        <path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.24 1.07-.14 1.61.24 1.64 1.82 2.89 3.5 2.77 1.81-.03 3.29-1.54 3.32-3.35.03-4.92.01-9.84.02-14.76V.02Z" />
      </svg>
    )
  },
  {
    id: 'facebook',
    name: 'Facebook',
    subtitle: 'Facebook Live',
    placeholder: 'https://www.facebook.com/username/live',
    logo: (
      <svg viewBox="0 0 24 24" className="w-5 h-5 fill-[#1877F2] shrink-0" aria-label="Facebook">
        <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
      </svg>
    )
  },
  {
    id: 'kick',
    name: 'Kick',
    subtitle: 'Kick Live Stream',
    placeholder: 'https://kick.com/username',
    logo: (
      <svg viewBox="0 0 24 24" className="w-5 h-5 fill-[#53FC18] shrink-0" aria-label="Kick">
        <path d="M2.399 0v24h6.002v-6h2.4v-2.4h2.4v2.4h2.4V24h6.002V0h-6.002v6h-2.4v2.4h-2.4V6h-2.4V0H2.399zm6.002 8.4h2.4v2.4h-2.4V8.4zm2.4 2.4h2.4v2.4h-2.4v-2.4zm-2.4 2.4h2.4v2.4h-2.4v-2.4z" />
      </svg>
    )
  }
];

export const BroadcastStreamManager: React.FC<BroadcastStreamManagerProps> = ({
  user,
  onRefreshUser
}) => {
  // URLs state
  const [urls, setUrls] = useState<{
    youtube: string;
    twitch: string;
    tiktok: string;
    facebook: string;
    kick: string;
  }>({
    youtube: user?.broadcastUrls?.youtube || user?.liveStreamUrl || '',
    twitch: user?.broadcastUrls?.twitch || user?.twitchLiveUrl || '',
    tiktok: user?.broadcastUrls?.tiktok || user?.tiktokLiveUrl || '',
    facebook: user?.broadcastUrls?.facebook || user?.facebookLiveUrl || '',
    kick: user?.broadcastUrls?.kick || ''
  });

  const lastSavedUrlsRef = useRef(urls);

  // View Count Overlay state
  const [enabledPlatforms, setEnabledPlatforms] = useState<PlatformId[]>(
    user?.broadcastViewCount?.enabledPlatforms || ['youtube', 'facebook']
  );
  const [manualViewers, setManualViewers] = useState<number>(
    typeof user?.broadcastViewCount?.manualViewers === 'number'
      ? user.broadcastViewCount.manualViewers
      : 1420
  );
  const [showLiveDot, setShowLiveDot] = useState<boolean>(
    user?.broadcastViewCount?.showLiveDot !== undefined ? Boolean(user.broadcastViewCount.showLiveDot) : true
  );
  const [showLabel, setShowLabel] = useState<boolean>(
    user?.broadcastViewCount?.showLabel !== undefined ? Boolean(user.broadcastViewCount.showLabel) : true
  );
  const [theme, setTheme] = useState<string>(
    user?.broadcastViewCount?.theme || 'glass-dark'
  );

  const [showOverlayToken, setShowOverlayToken] = useState(false);
  const [copiedOverlay, setCopiedOverlay] = useState(false);
  const [isTestingPulse, setIsTestingPulse] = useState(false);

  // Toast
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const toastTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Overlay Token & URL
  const overlayToken = user?.overlayToken || 'demo-token';
  const overlayUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/overlay/view-count/${overlayToken}`
    : `/overlay/view-count/${overlayToken}`;

  // Sync state when user prop updates
  useEffect(() => {
    if (user) {
      const initial = {
        youtube: user?.broadcastUrls?.youtube || user?.liveStreamUrl || '',
        twitch: user?.broadcastUrls?.twitch || user?.twitchLiveUrl || '',
        tiktok: user?.broadcastUrls?.tiktok || user?.tiktokLiveUrl || '',
        facebook: user?.broadcastUrls?.facebook || user?.facebookLiveUrl || '',
        kick: user?.broadcastUrls?.kick || ''
      };
      setUrls(initial);
      lastSavedUrlsRef.current = initial;

      if (user.broadcastViewCount) {
        if (Array.isArray(user.broadcastViewCount.enabledPlatforms) && user.broadcastViewCount.enabledPlatforms.length > 0) {
          setEnabledPlatforms(user.broadcastViewCount.enabledPlatforms);
        }
        if (typeof user.broadcastViewCount.manualViewers === 'number') {
          setManualViewers(user.broadcastViewCount.manualViewers);
        }
        if (user.broadcastViewCount.showLiveDot !== undefined) {
          setShowLiveDot(Boolean(user.broadcastViewCount.showLiveDot));
        }
        if (user.broadcastViewCount.showLabel !== undefined) {
          setShowLabel(Boolean(user.broadcastViewCount.showLabel));
        }
        if (user.broadcastViewCount.theme) {
          setTheme(user.broadcastViewCount.theme);
        }
      }
    }
  }, [user]);

  useEffect(() => {
    return () => {
      if (toastTimerRef.current) {
        clearTimeout(toastTimerRef.current);
      }
    };
  }, []);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    if (toastTimerRef.current) {
      clearTimeout(toastTimerRef.current);
    }
    setToast({ message, type });
    toastTimerRef.current = setTimeout(() => {
      setToast(null);
    }, 2500);
  };

  // Auto-save stream URL
  const handleAutoSaveUrl = async (
    platformId: PlatformId,
    overrideVal?: string
  ) => {
    const currentVal = (overrideVal !== undefined ? overrideVal : (urls[platformId] || '')).trim();
    const prevSaved = (lastSavedUrlsRef.current[platformId] || '').trim();

    if (currentVal === prevSaved) {
      return;
    }

    const nextUrls = {
      ...urls,
      [platformId]: currentVal
    };

    lastSavedUrlsRef.current = nextUrls;

    try {
      const sanitizedUrls = {
        youtube: (nextUrls.youtube || '').trim(),
        twitch: (nextUrls.twitch || '').trim(),
        tiktok: (nextUrls.tiktok || '').trim(),
        facebook: (nextUrls.facebook || '').trim(),
        kick: (nextUrls.kick || '').trim()
      };

      await streamerService.updateProfile({
        broadcastUrls: sanitizedUrls,
        liveStreamUrl: sanitizedUrls.youtube
      });

      if (onRefreshUser) {
        await onRefreshUser();
      }

      showToast('Stream URL saved', 'success');
    } catch (err: any) {
      showToast(err.message || 'Failed to save stream URL', 'error');
    }
  };

  const handleClearUrl = (platformId: PlatformId) => {
    setUrls((prev) => ({ ...prev, [platformId]: '' }));
    handleAutoSaveUrl(platformId, '');
  };

  // Save view count settings
  const saveViewCountSettings = async (overrides: Partial<{
    enabledPlatforms: PlatformId[];
    manualViewers: number;
    showLiveDot: boolean;
    showLabel: boolean;
    theme: string;
  }> = {}) => {
    const nextSettings = {
      enabledPlatforms: overrides.enabledPlatforms || enabledPlatforms,
      manualViewers: overrides.manualViewers !== undefined ? overrides.manualViewers : manualViewers,
      showLiveDot: overrides.showLiveDot !== undefined ? overrides.showLiveDot : showLiveDot,
      showLabel: overrides.showLabel !== undefined ? overrides.showLabel : showLabel,
      theme: overrides.theme || theme
    };

    try {
      await streamerService.updateProfile({
        broadcastViewCount: nextSettings
      });

      // Broadcast in real-time to active OBS browser sources
      await fetch('/api/widgets/view-count', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token: overlayToken,
          ...nextSettings
        })
      });

      if (onRefreshUser) {
        await onRefreshUser();
      }

      showToast('View count overlay updated', 'success');
    } catch (err: any) {
      showToast(err.message || 'Failed to update view count overlay', 'error');
    }
  };

  // Toggle platform checkbox
  const handleTogglePlatform = async (platformId: PlatformId) => {
    const next = enabledPlatforms.includes(platformId)
      ? enabledPlatforms.filter((p) => p !== platformId)
      : [...enabledPlatforms, platformId];

    if (next.length === 0) {
      showToast('Select at least one platform', 'error');
      return;
    }

    setEnabledPlatforms(next);
    await saveViewCountSettings({ enabledPlatforms: next });
  };

  // Copy Overlay URL
  const handleCopyOverlay = () => {
    navigator.clipboard.writeText(overlayUrl);
    setCopiedOverlay(true);
    showToast('Overlay URL copied to clipboard', 'success');
    setTimeout(() => setCopiedOverlay(false), 2000);
  };

  // Test pulse in OBS
  const handleTestPulse = async () => {
    setIsTestingPulse(true);
    try {
      await fetch('/api/widgets/view-count', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token: overlayToken,
          enabledPlatforms,
          manualViewers,
          showLiveDot,
          showLabel,
          theme,
          isTest: true
        })
      });
      showToast('Test pulse sent to OBS overlay!', 'success');
    } catch (err: any) {
      showToast('Failed to trigger test pulse', 'error');
    } finally {
      setTimeout(() => setIsTestingPulse(false), 800);
    }
  };

  return (
    <div className="space-y-8 max-w-5xl mx-auto pb-16 animate-in fade-in duration-300">
      
      {/* ─────────────────────────────────────────────────────────────
          SECTION 1: VIEW COUNT OVERLAY (TICK PLATFORMS + OBS TOKEN)
      ───────────────────────────────────────────────────────────── */}
      <div className="space-y-5 rounded-3xl bg-[#080C17] border border-cyan-500/20 p-6 md:p-8 shadow-xl relative overflow-hidden">
        {/* Glow Accent */}
        <div className="absolute top-0 right-0 w-80 h-80 bg-cyan-500/5 rounded-full blur-3xl pointer-events-none" />

        {/* Section Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800/80 pb-5">
          <div className="space-y-1">
            <div className="flex items-center gap-2.5">
              <span className="p-2 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400">
                <Users size={18} />
              </span>
              <h2 className="text-lg font-bold text-white font-['Chakra_Petch'] tracking-wide">
                Concurrent View Count Overlay
              </h2>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase tracking-wider bg-red-500/10 text-red-400 border border-red-500/30 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-ping" />
                Live Widget
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Tick your active broadcast platforms to aggregate and display a live concurrent viewer counter directly in OBS.
            </p>
          </div>

          {/* Test Pulse Button */}
          <button
            type="button"
            onClick={handleTestPulse}
            disabled={isTestingPulse}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-xs font-mono font-semibold text-slate-200 hover:text-white transition-all cursor-pointer shadow-sm disabled:opacity-50 shrink-0 self-start sm:self-auto"
            title="Trigger a live scale pulse on your active OBS browser source"
          >
            <Sparkles size={14} className={isTestingPulse ? 'text-cyan-400 animate-spin' : 'text-cyan-400'} />
            <span>{isTestingPulse ? 'Pulsing...' : 'Test Pulse in OBS'}</span>
          </button>
        </div>

        {/* 1.1 OBS Browser Source Overlay URL */}
        <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800/80 space-y-2.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <MonitorPlay size={15} className="text-cyan-400" />
              <span className="text-xs font-bold text-slate-200 font-['Chakra_Petch'] tracking-wide">
                OBS Browser Source Overlay URL
              </span>
            </div>
            <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full">
              Transparent Background
            </span>
          </div>

          <p className="text-[11px] text-slate-400">
            Copy this URL into <b>OBS Studio</b> as a <b>Browser Source</b> (Width: 420, Height: 120). It syncs viewers in real-time.
          </p>

          <div className="flex items-center gap-2 pt-1">
            <div className="flex-1 flex items-center rounded-xl bg-slate-900/90 border border-slate-800 focus-within:border-slate-600 transition-colors overflow-hidden px-3.5 py-2">
              <span className="text-xs font-mono text-slate-300 select-all truncate">
                {showOverlayToken
                  ? overlayUrl
                  : `${overlayUrl.split('/overlay/view-count/')[0]}/overlay/view-count/••••••••••••••••`}
              </span>
            </div>

            <button
              type="button"
              onClick={() => setShowOverlayToken(!showOverlayToken)}
              className="p-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-white transition-colors cursor-pointer shrink-0"
              title={showOverlayToken ? 'Hide private token' : 'Reveal private token'}
            >
              {showOverlayToken ? <EyeOff size={15} /> : <Eye size={15} />}
            </button>

            <button
              type="button"
              onClick={handleCopyOverlay}
              className={`flex items-center gap-1.5 px-4 py-2.5 rounded-xl border text-xs font-mono font-bold transition-all cursor-pointer shrink-0 ${
                copiedOverlay
                  ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300'
                  : 'bg-cyan-500/10 hover:bg-cyan-500/20 border-cyan-500/30 text-cyan-300 hover:border-cyan-500/50'
              }`}
            >
              {copiedOverlay ? (
                <>
                  <Check size={14} className="text-emerald-400" />
                  <span>Copied!</span>
                </>
              ) : (
                <>
                  <Copy size={14} />
                  <span>Copy URL</span>
                </>
              )}
            </button>

            <a
              href={overlayUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="p-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-white transition-colors cursor-pointer shrink-0"
              title="Open overlay in new tab"
            >
              <ExternalLink size={15} />
            </a>
          </div>
        </div>

        {/* 1.2 PLATFORM TICKING CHECKLIST */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-white font-['Chakra_Petch'] tracking-wide uppercase">
              Tick Platforms to Display
            </span>
            <span className="text-[11px] font-mono text-slate-400">
              Selected: <strong className="text-cyan-400">{enabledPlatforms.length}</strong> / 5
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            {PLATFORMS.map((platform) => {
              const isTicked = enabledPlatforms.includes(platform.id);
              return (
                <button
                  key={platform.id}
                  type="button"
                  onClick={() => handleTogglePlatform(platform.id)}
                  className={`flex items-center gap-3 p-3.5 rounded-2xl border text-left transition-all cursor-pointer select-none ${
                    isTicked
                      ? 'bg-gradient-to-b from-slate-900 to-[#0A1020] border-cyan-500/60 ring-1 ring-cyan-500/40 shadow-[0_0_15px_rgba(6,182,212,0.18)]'
                      : 'bg-slate-950/60 border-slate-800/80 hover:border-slate-700 opacity-60 hover:opacity-100'
                  }`}
                >
                  <div
                    className={`w-5 h-5 rounded-md border flex items-center justify-center shrink-0 transition-colors ${
                      isTicked
                        ? 'bg-cyan-500 border-cyan-400 text-slate-950 shadow-sm'
                        : 'border-slate-700 bg-slate-900'
                    }`}
                  >
                    {isTicked && <Check size={13} strokeWidth={3} />}
                  </div>

                  <div className="shrink-0">{platform.logo}</div>

                  <div className="min-w-0 flex-1">
                    <div className="text-xs font-bold text-white truncate font-['Chakra_Petch']">
                      {platform.name}
                    </div>
                    <div className="text-[10px] text-slate-400 font-mono truncate">
                      {isTicked ? 'Active' : 'Hidden'}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* 1.3 LIVE OVERLAY PREVIEW */}
        <div className="rounded-2xl bg-gradient-to-b from-[#0B101D] to-slate-950 border border-slate-800/80 p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-xs font-mono uppercase tracking-wider text-slate-300 font-bold">
                Live OBS Output Preview
              </span>
            </div>
            <span className="text-[11px] font-mono text-slate-400">
              Format: <span className="text-cyan-400">[logos] {'{total_view_count}'}</span>
            </span>
          </div>

          {/* Checkerboard/Transparent Preview Canvas */}
          <div className="w-full py-8 px-4 rounded-xl bg-slate-950/90 border border-slate-800/90 flex items-center justify-center relative overflow-hidden">
            <div className="absolute inset-0 opacity-[0.03] bg-[radial-gradient(#fff_1px,transparent_1px)] [background-size:12px_12px]" />

            {/* Rendered Live Overlay Pill */}
            <div
              className={`inline-flex items-center gap-3 px-5 py-2.5 transition-all duration-300 z-10 ${
                theme === 'neon-glow'
                  ? 'bg-slate-950/90 border-2 border-cyan-400/80 shadow-[0_0_25px_rgba(0,240,255,0.4)] text-white rounded-2xl'
                  : theme === 'minimal-pill'
                  ? 'bg-black/80 border border-white/20 shadow-2xl text-white rounded-full'
                  : theme === 'pure-transparent'
                  ? 'bg-transparent text-white'
                  : 'bg-[#0B0F19]/90 backdrop-blur-xl border border-slate-700/60 shadow-[0_12px_35px_rgba(0,0,0,0.8)] text-white rounded-2xl'
              }`}
            >
              {/* Platform Logos side-by-side */}
              <div className="flex items-center gap-2">
                {enabledPlatforms.map((pid) => (
                  <div key={pid} className="shrink-0 transition-transform hover:scale-110 drop-shadow-sm">
                    {PLATFORMS.find((p) => p.id === pid)?.logo}
                  </div>
                ))}
              </div>

              {/* Pulsing Red Live Dot */}
              {showLiveDot && (
                <span className="relative flex h-2.5 w-2.5 ml-0.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500"></span>
                </span>
              )}

              {/* Viewers Counter */}
              <span className="text-base font-black font-mono tracking-tight text-white drop-shadow-md">
                {manualViewers.toLocaleString()}
              </span>

              {/* Viewers Label */}
              {showLabel && (
                <span className="text-[11px] font-bold font-mono tracking-wider text-slate-300 uppercase">
                  Viewers
                </span>
              )}
            </div>
          </div>
        </div>

        {/* 1.4 CONTROLS: VIEWERS & APPEARANCE */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-1">
          {/* Base / Simulated Viewers */}
          <div className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800/80 space-y-2">
            <label className="block text-xs font-bold text-slate-300 font-['Chakra_Petch'] tracking-wide">
              Concurrent Viewers Count
            </label>
            <div className="flex items-center rounded-xl bg-slate-900 border border-slate-800 focus-within:border-slate-600 transition-colors px-3 py-2">
              <Users size={14} className="text-slate-500 mr-2 shrink-0" />
              <input
                type="number"
                min={0}
                value={manualViewers}
                onChange={(e) => {
                  const val = Math.max(0, parseInt(e.target.value, 10) || 0);
                  setManualViewers(val);
                }}
                onBlur={() => saveViewCountSettings({ manualViewers })}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.currentTarget.blur();
                  }
                }}
                className="w-full bg-transparent text-white font-mono text-xs focus:outline-none"
                placeholder="1420"
              />
            </div>
            <p className="text-[10px] text-slate-500">
              Aggregated with detected live YouTube viewers.
            </p>
          </div>

          {/* Theme Selector */}
          <div className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800/80 space-y-2">
            <label className="block text-xs font-bold text-slate-300 font-['Chakra_Petch'] tracking-wide">
              Overlay Theme
            </label>
            <select
              value={theme}
              onChange={(e) => {
                const nextTheme = e.target.value;
                setTheme(nextTheme);
                saveViewCountSettings({ theme: nextTheme });
              }}
              className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs font-mono text-white focus:outline-none focus:border-slate-600 cursor-pointer"
            >
              <option value="glass-dark">Glass Dark (Recommended)</option>
              <option value="neon-glow">Neon Glow Cyan</option>
              <option value="minimal-pill">Minimal Pill</option>
              <option value="pure-transparent">Pure Transparent</option>
            </select>
            <p className="text-[10px] text-slate-500">
              Matches any stream scene or HUD layout.
            </p>
          </div>

          {/* Toggles: Red Dot & Label */}
          <div className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800/80 space-y-2.5 flex flex-col justify-between">
            <label className="block text-xs font-bold text-slate-300 font-['Chakra_Petch'] tracking-wide">
              Display Elements
            </label>
            <div className="space-y-2">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={showLiveDot}
                  onChange={(e) => {
                    const next = e.target.checked;
                    setShowLiveDot(next);
                    saveViewCountSettings({ showLiveDot: next });
                  }}
                  className="rounded border-slate-700 bg-slate-900 text-cyan-500 focus:ring-0 focus:ring-offset-0 cursor-pointer"
                />
                <span className="text-xs font-mono text-slate-300">Pulsing Red Live Dot</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={showLabel}
                  onChange={(e) => {
                    const next = e.target.checked;
                    setShowLabel(next);
                    saveViewCountSettings({ showLabel: next });
                  }}
                  className="rounded border-slate-700 bg-slate-900 text-cyan-500 focus:ring-0 focus:ring-offset-0 cursor-pointer"
                />
                <span className="text-xs font-mono text-slate-300">Show &ldquo;Viewers&rdquo; Label</span>
              </label>
            </div>
          </div>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          SECTION 2: BROADCAST STREAM CHANNELS & URLS
      ───────────────────────────────────────────────────────────── */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <h3 className="text-sm font-bold text-white font-['Chakra_Petch'] tracking-wide uppercase">
              Broadcast Channels & Stream URLs
            </h3>
            <p className="text-[11px] text-slate-400">
              Provide your stream or channel links for auto-viewer detection and multistreaming.
            </p>
          </div>
        </div>

        <div className="space-y-3.5">
          {PLATFORMS.map((platform) => {
            const val = urls[platform.id] || '';
            const hasUrl = Boolean(val.trim());

            return (
              <div
                key={platform.id}
                className="rounded-2xl bg-[#090D18] border border-slate-800 p-4 sm:p-5 space-y-3.5 hover:border-slate-700/80 transition-colors shadow-sm"
              >
                {/* Row Header */}
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center shrink-0">
                      {platform.logo}
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-white font-['Chakra_Petch'] tracking-wide">
                        {platform.name}
                      </h4>
                      <p className="text-[11px] text-slate-400">
                        {platform.subtitle}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <span
                      className={`inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-mono font-medium border ${
                        hasUrl
                          ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                          : 'bg-slate-900 text-slate-500 border-slate-800'
                      }`}
                    >
                      <span>{hasUrl ? 'Connected' : 'Disconnected'}</span>
                    </span>
                  </div>
                </div>

                {/* Input & External Link */}
                <div className="flex items-center gap-2.5">
                  <div className="flex-1 flex items-center rounded-xl bg-slate-950 border border-slate-800 focus-within:border-slate-600 transition-colors overflow-hidden">
                    <input
                      type="url"
                      value={val}
                      onChange={(e) => setUrls({ ...urls, [platform.id]: e.target.value })}
                      onBlur={() => handleAutoSaveUrl(platform.id)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.currentTarget.blur();
                        }
                      }}
                      placeholder={platform.placeholder}
                      className="w-full px-3.5 py-2.5 bg-transparent text-white font-mono text-xs focus:outline-none placeholder-slate-600"
                    />
                    {val && (
                      <button
                        type="button"
                        onClick={() => handleClearUrl(platform.id)}
                        className="p-2 text-slate-500 hover:text-white transition-colors cursor-pointer mr-1 shrink-0"
                        title="Clear URL"
                      >
                        <X size={14} />
                      </button>
                    )}
                  </div>

                  {hasUrl && (
                    <a
                      href={val.startsWith('http://') || val.startsWith('https://') ? val : `https://${val}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-2.5 rounded-xl bg-slate-900 hover:bg-slate-850 text-slate-300 hover:text-white border border-slate-800 text-xs font-mono transition-colors shrink-0"
                      title="Open live link in new tab"
                    >
                      <ExternalLink size={14} />
                    </a>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* BOTTOM FLOATING TOAST MESSAGE */}
      <div
        className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-50 transition-all duration-200 ease-out pointer-events-none ${
          toast
            ? 'translate-y-0 opacity-100'
            : 'translate-y-2 opacity-0 pointer-events-none'
        }`}
      >
        <div
          className={`px-3.5 py-2 rounded-xl border font-mono text-xs flex items-center gap-2 ${
            toast?.type === 'error'
              ? 'bg-slate-900 border-red-500/40 text-red-300'
              : 'bg-slate-900 border-slate-800 text-slate-200'
          }`}
        >
          {toast?.type === 'error' ? (
            <AlertCircle size={14} className="text-red-400 shrink-0" />
          ) : (
            <CheckCircle2 size={14} className="text-emerald-400 shrink-0" />
          )}
          <span>{toast?.message}</span>
        </div>
      </div>
    </div>
  );
};

export default BroadcastStreamManager;
