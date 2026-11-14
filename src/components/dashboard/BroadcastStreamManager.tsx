'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  AlertCircle,
  X,
  ExternalLink,
  Copy,
  Check,
  Eye,
  EyeOff,
  Radio,
  Users,
  RefreshCw,
  PanelRight
} from 'lucide-react';
import { streamerService } from '../../services/streamerService';
import { AnimatedCounter } from '../overlay/StreamViewCountOverlay';

export interface BroadcastStreamManagerProps {
  user: any;
  onRefreshUser?: () => Promise<void>;
  onNavigateToTab?: (tab: string) => void;
  isRightbarOpen?: boolean;
  onToggleRightbar?: () => void;
  onCloseRightbar?: () => void;
}

type PlatformId = 'youtube' | 'twitch' | 'tiktok' | 'facebook' | 'kick' | 'instagram';

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
      <svg viewBox="0 0 24 24" className="w-4 h-4 fill-[#FF0000] shrink-0" aria-label="YouTube">
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
      <svg viewBox="0 0 24 24" className="w-4 h-4 fill-[#9146FF] shrink-0" aria-label="Twitch">
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
      <svg viewBox="0 0 24 24" className="w-4 h-4 fill-white shrink-0" aria-label="TikTok">
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
      <svg viewBox="0 0 24 24" className="w-4 h-4 fill-[#1877F2] shrink-0" aria-label="Facebook">
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
      <svg viewBox="0 0 24 24" className="w-4 h-4 fill-[#53FC18] shrink-0" aria-label="Kick">
        <path d="M1.333 0h8v5.333H12V2.667h2.667V0h8v8H20v2.667h-2.667v2.666H20V16h2.667v8h-8v-2.667H12v-2.666H9.333V24h-8Z" />
      </svg>
    )
  },
  {
    id: 'instagram',
    name: 'Instagram',
    subtitle: 'Instagram Live',
    placeholder: 'https://www.instagram.com/username/live',
    logo: (
      <svg viewBox="0 0 24 24" className="w-4 h-4 shrink-0" aria-label="Instagram">
        <defs>
          <radialGradient id="ig-grad-manager" cx="20%" cy="110%" r="130%">
            <stop offset="0%" stopColor="#FFDD55" />
            <stop offset="10%" stopColor="#FFDD55" />
            <stop offset="50%" stopColor="#FF543E" />
            <stop offset="80%" stopColor="#C837AB" />
            <stop offset="100%" stopColor="#3772FF" />
          </radialGradient>
        </defs>
        <rect width="24" height="24" rx="6" fill="url(#ig-grad-manager)" />
        <path
          fill="#ffffff"
          transform="translate(3.6, 3.6) scale(0.7)"
          d="M7.0301.084c-1.2768.0602-2.1487.264-2.911.5634-.7888.3075-1.4575.72-2.1228 1.3877-.6652.6677-1.075 1.3368-1.3802 2.127-.2954.7638-.4956 1.6365-.552 2.914-.0564 1.2775-.0689 1.6882-.0626 4.947.0062 3.2586.0206 3.6671.0825 4.9473.061 1.2765.264 2.1482.5635 2.9107.308.7889.72 1.4573 1.388 2.1228.6679.6655 1.3365 1.0743 2.1285 1.38.7632.295 1.6361.4961 2.9134.552 1.2773.056 1.6884.069 4.9462.0627 3.2578-.0062 3.668-.0207 4.9478-.0814 1.28-.0607 2.147-.2652 2.9098-.5633.7889-.3086 1.4578-.72 2.1228-1.3881.665-.6682 1.0745-1.3378 1.3795-2.1284.2957-.7632.4966-1.636.552-2.9124.056-1.2809.0692-1.6898.063-4.948-.0063-3.2583-.021-3.6668-.0817-4.9465-.0607-1.2797-.264-2.1487-.5633-2.9117-.3084-.7889-.72-1.4568-1.3876-2.1228C21.2982 1.33 20.628.9208 19.8378.6165 19.074.321 18.2017.1197 16.9244.0645 15.6471.0093 15.236-.005 11.977.0014 8.718.0076 8.31.0215 7.0301.0839m.1402 21.6932c-1.17-.0509-1.8053-.2453-2.2287-.408-.5606-.216-.96-.4771-1.3819-.895-.422-.4178-.6811-.8186-.9-1.378-.1644-.4234-.3624-1.058-.4171-2.228-.0595-1.2645-.072-1.6442-.079-4.848-.007-3.2037.0053-3.583.0607-4.848.05-1.169.2456-1.805.408-2.2282.216-.5613.4762-.96.895-1.3816.4188-.4217.8184-.6814 1.3783-.9003.423-.1651 1.0575-.3614 2.227-.4171 1.2655-.06 1.6447-.072 4.848-.079 3.2033-.007 3.5835.005 4.8495.0608 1.169.0508 1.8053.2445 2.228.408.5608.216.96.4754 1.3816.895.4217.4194.6816.8176.9005 1.3787.1653.4217.3617 1.056.4169 2.2263.0602 1.2655.0739 1.645.0796 4.848.0058 3.203-.0055 3.5834-.061 4.848-.051 1.17-.245 1.8055-.408 2.2294-.216.5604-.4763.96-.8954 1.3814-.419.4215-.8181.6811-1.3783.9-.4224.1649-1.0577.3617-2.2262.4174-1.2656.0595-1.6448.072-4.8493.079-3.2045.007-3.5825-.006-4.848-.0608M16.953 5.5864A1.44 1.44 0 1 0 18.39 4.144a1.44 1.44 0 0 0-1.437 1.4424M5.8385 12.012c.0067 3.4032 2.7706 6.1557 6.173 6.1493 3.4026-.0065 6.157-2.7701 6.1506-6.1733-.0065-3.4032-2.771-6.1565-6.174-6.1498-3.403.0067-6.156 2.771-6.1496 6.1738M8 12.0077a4 4 0 1 1 4.008 3.9921A3.9996 3.9996 0 0 1 8 12.0077"
        />
      </svg>
    )
  }
];

export const BroadcastStreamManager: React.FC<BroadcastStreamManagerProps> = ({
  user,
  onRefreshUser,
  isRightbarOpen = true,
  onToggleRightbar,
  onCloseRightbar
}) => {
  // URLs state
  const [urls, setUrls] = useState<{
    youtube: string;
    twitch: string;
    tiktok: string;
    facebook: string;
    kick: string;
    instagram: string;
  }>({
    youtube: user?.broadcastUrls?.youtube || user?.liveStreamUrl || '',
    twitch: user?.broadcastUrls?.twitch || user?.twitchLiveUrl || '',
    tiktok: user?.broadcastUrls?.tiktok || user?.tiktokLiveUrl || '',
    facebook: user?.broadcastUrls?.facebook || user?.facebookLiveUrl || '',
    kick: user?.broadcastUrls?.kick || '',
    instagram: user?.broadcastUrls?.instagram || ''
  });

  const lastSavedUrlsRef = useRef(urls);

  // View Count Overlay state
  const [enabledPlatforms, setEnabledPlatforms] = useState<PlatformId[]>(
    user?.broadcastViewCount?.enabledPlatforms || ['youtube', 'facebook']
  );
  const [realViewers, setRealViewers] = useState<number>(0);
  const [platformViewers, setPlatformViewers] = useState<Record<string, number>>({});
  const [isChannelLive, setIsChannelLive] = useState<boolean>(false);
  const [hasConfiguredChannels, setHasConfiguredChannels] = useState<boolean>(false);
  const [isRefreshingViewers, setIsRefreshingViewers] = useState<boolean>(false);
  const [previewScale, setPreviewScale] = useState<number>(1.25);

  const [showOverlayToken, setShowOverlayToken] = useState(false);
  const [copiedOverlay, setCopiedOverlay] = useState(false);

  // Error Toast only
  const [errorToast, setErrorToast] = useState<string | null>(null);
  const toastTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Overlay Token & URL
  const overlayToken = user?.overlayToken || 'demo-token';
  const overlayUrl =
    typeof window !== 'undefined'
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
        kick: user?.broadcastUrls?.kick || '',
        instagram: user?.broadcastUrls?.instagram || ''
      };
      setUrls(initial);
      lastSavedUrlsRef.current = initial;

      if (user.broadcastViewCount) {
        if (
          Array.isArray(user.broadcastViewCount.enabledPlatforms) &&
          user.broadcastViewCount.enabledPlatforms.length > 0
        ) {
          setEnabledPlatforms(user.broadcastViewCount.enabledPlatforms);
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

  const fetchLiveViewers = React.useCallback(
    async (manual = false) => {
      if (manual) setIsRefreshingViewers(true);
      try {
        const res = await fetch(`/api/widgets/view-count?token=${overlayToken}`);
        const data = await res.json();
        if (data?.success && typeof data.totalViewers === 'number') {
          setRealViewers(data.totalViewers);
          setIsChannelLive(Boolean(data.isLive));
          setHasConfiguredChannels(Boolean(data.hasChannels));
          if (data.platformViewers && typeof data.platformViewers === 'object') {
            setPlatformViewers(data.platformViewers);
          }
        }
      } catch {
      } finally {
        if (manual) setIsRefreshingViewers(false);
      }
    },
    [overlayToken]
  );

  // Sync real-time live viewers detected from configured broadcast channels
  useEffect(() => {
    fetchLiveViewers();
    const interval = setInterval(() => fetchLiveViewers(false), 10000);
    return () => clearInterval(interval);
  }, [fetchLiveViewers]);

  const showError = (message: string) => {
    if (toastTimerRef.current) {
      clearTimeout(toastTimerRef.current);
    }
    setErrorToast(message);
    toastTimerRef.current = setTimeout(() => {
      setErrorToast(null);
    }, 2500);
  };

  // Auto-save stream URL
  const handleAutoSaveUrl = async (platformId: PlatformId, overrideVal?: string) => {
    const currentVal = (overrideVal !== undefined ? overrideVal : urls[platformId] || '').trim();
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
        kick: (nextUrls.kick || '').trim(),
        instagram: (nextUrls.instagram || '').trim()
      };

      await streamerService.updateProfile({
        broadcastUrls: sanitizedUrls,
        liveStreamUrl: sanitizedUrls.youtube
      });

      if (onRefreshUser) {
        await onRefreshUser();
      }

      // Sync updated broadcast channel URLs to real-time view count overlay
      fetch('/api/widgets/view-count', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token: overlayToken,
          enabledPlatforms,
          broadcastUrls: sanitizedUrls
        })
      })
        .then((res) => res.json())
        .then((data) => {
          if (data?.success && typeof data.totalViewers === 'number') {
            setRealViewers(data.totalViewers);
            setIsChannelLive(Boolean(data.isLive));
            setHasConfiguredChannels(Boolean(data.hasChannels));
            if (data.platformViewers && typeof data.platformViewers === 'object') {
              setPlatformViewers(data.platformViewers);
            }
          }
        })
        .catch(() => {});
    } catch (err: any) {
      showError(err.message || 'Failed to save channel URL');
    }
  };

  const handleClearUrl = (platformId: PlatformId) => {
    setUrls((prev) => ({ ...prev, [platformId]: '' }));
    handleAutoSaveUrl(platformId, '');
  };

  // Save view count settings
  const saveViewCountSettings = async (
    overrides: Partial<{
      enabledPlatforms: PlatformId[];
    }> = {}
  ) => {
    const nextSettings = {
      enabledPlatforms: overrides.enabledPlatforms || enabledPlatforms
    };

    try {
      await streamerService.updateProfile({
        broadcastViewCount: nextSettings
      });

      const res = await fetch('/api/widgets/view-count', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token: overlayToken,
          ...nextSettings,
          broadcastUrls: urls
        })
      });
      const data = await res.json();
      if (data?.success && typeof data.totalViewers === 'number') {
        setRealViewers(data.totalViewers);
        setIsChannelLive(Boolean(data.isLive));
        setHasConfiguredChannels(Boolean(data.hasChannels));
        if (data.platformViewers && typeof data.platformViewers === 'object') {
          setPlatformViewers(data.platformViewers);
        }
      }

      if (onRefreshUser) {
        await onRefreshUser();
      }
    } catch (err: any) {
      showError(err.message || 'Failed to save platform selection');
    }
  };

  // Toggle platform checkbox
  const handleTogglePlatform = async (platformId: PlatformId) => {
    const next = enabledPlatforms.includes(platformId)
      ? enabledPlatforms.filter((p) => p !== platformId)
      : [...enabledPlatforms, platformId];

    if (next.length === 0) {
      showError('Select at least one platform');
      return;
    }

    setEnabledPlatforms(next);
    await saveViewCountSettings({ enabledPlatforms: next });
  };

  // Copy Overlay URL
  const handleCopyOverlay = () => {
    navigator.clipboard.writeText(overlayUrl);
    setCopiedOverlay(true);
    setTimeout(() => setCopiedOverlay(false), 2000);
  };

  const connectedCount = PLATFORMS.filter((p) => Boolean((urls[p.id] || '').trim())).length;

  return (
    <div className="flex-1 flex flex-col lg:flex-row gap-4 min-h-0 w-full h-full overflow-hidden">
      {/* ============================================================ */}
      {/* LEFT MAIN WORKSPACE: CONCURRENT VIEW COUNT WEB APPLICATION   */}
      {/* ============================================================ */}
      <div className="flex-1 min-w-0 bg-[#0B0F19] border border-slate-800/80 rounded-xl flex flex-col overflow-hidden min-h-[480px]">
        {/* Top Header Bar */}
        <div className="px-4 py-3 border-b border-slate-800/80 bg-[#090D16] flex flex-wrap items-center justify-between gap-2 shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <Radio
              size={15}
              className={isChannelLive ? 'text-emerald-400 animate-pulse shrink-0' : 'text-slate-400 shrink-0'}
            />
            <span className="text-xs font-semibold text-white truncate">Concurrent View Count</span>
            <span
              className={`px-2 py-0.5 rounded text-[10px] font-mono border ${
                isChannelLive
                  ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                  : hasConfiguredChannels
                  ? 'bg-slate-900 text-slate-400 border-slate-800'
                  : 'bg-slate-900 text-slate-500 border-slate-800'
              }`}
            >
              {isChannelLive
                ? `LIVE • ${realViewers.toLocaleString()} WATCHING`
                : hasConfiguredChannels
                ? 'OFFLINE • 0 WATCHING'
                : 'NO CHANNELS LINKED'}
            </span>
          </div>

          <div className="flex items-center gap-2">
            {/* Scale Controls */}
            <div className="flex items-center gap-1 bg-slate-900/90 border border-slate-800 rounded-lg p-0.5">
              {[0.75, 1, 1.25, 1.5].map((scaleVal) => (
                <button
                  key={scaleVal}
                  type="button"
                  onClick={() => setPreviewScale(scaleVal)}
                  className={`px-2 py-0.5 rounded text-[10px] font-mono transition-colors ${
                    previewScale === scaleVal
                      ? 'bg-slate-700 text-white font-semibold'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {Math.round(scaleVal * 100)}%
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={() => fetchLiveViewers(true)}
              disabled={isRefreshingViewers}
              className="px-2.5 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-white text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
              title="Refresh live viewer count"
            >
              <RefreshCw size={12} className={isRefreshingViewers ? 'animate-spin' : ''} />
              <span className="hidden sm:inline">Refresh</span>
            </button>

            {onToggleRightbar && !isRightbarOpen && (
              <button
                type="button"
                onClick={onToggleRightbar}
                className="px-2.5 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-200 hover:text-white text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer"
                title="Open Broadcast Channels"
              >
                <PanelRight size={13} />
                <span className="hidden sm:inline">Channels</span>
              </button>
            )}
          </div>
        </div>

        {/* Main Scrollable Content Area */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 flex flex-col gap-5">
          {/* Live Preview Stage */}
          <div className="obs-preview-stage flex-1 min-h-[220px] rounded-xl bg-[#070A12] border border-slate-800/80 flex flex-col justify-between p-5 relative overflow-hidden">
            <div className="flex items-center justify-between gap-2 text-[11px] font-mono text-slate-500">
              <span>OBS OVERLAY PREVIEW</span>
              <span>
                {enabledPlatforms.length} {enabledPlatforms.length === 1 ? 'PLATFORM' : 'PLATFORMS'} ACTIVE
              </span>
            </div>

            {/* Center Scaled Preview Badge */}
            <div className="my-auto py-8 flex items-center justify-center overflow-x-auto">
              <div
                style={{
                  transform: `scale(${previewScale})`,
                  transformOrigin: 'center center'
                }}
                className="transition-transform duration-200"
              >
                <div className="inline-flex items-center gap-2.5 px-4 py-2.5 rounded-xl bg-black/85 border border-white/10 text-white shadow-lg">
                  <div className="flex items-center gap-2">
                    {enabledPlatforms.map((pid) => (
                      <div key={pid} className="shrink-0 flex items-center justify-center">
                        {PLATFORMS.find((p) => p.id === pid)?.logo}
                      </div>
                    ))}
                  </div>
                  <AnimatedCounter
                    value={realViewers}
                    className="text-xl font-bold font-mono tracking-tight text-white"
                  />
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-400 border-t border-slate-800/60 pt-3">
              <span>
                Tick or untick platforms below to customize which icons appear next to your total concurrent viewers.
              </span>
              <span className="font-mono text-slate-500">Auto-updates every 10s</span>
            </div>
          </div>

          {/* Platform Filter & Live Breakdown Grid */}
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-2">
              <div>
                <h4 className="text-xs font-semibold text-white uppercase tracking-wider">
                  Displayed Overlay Platforms & Live Breakdown
                </h4>
                <p className="text-[11px] text-slate-400">
                  Select platforms to include in your OBS Concurrent View Count overlay.
                </p>
              </div>
              <div className="text-xs font-mono text-slate-400">
                Total: <span className="text-white font-semibold">{realViewers.toLocaleString()}</span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-2.5">
              {PLATFORMS.map((platform) => {
                const isTicked = enabledPlatforms.includes(platform.id);
                const hasUrl = Boolean((urls[platform.id] || '').trim());
                const count = platformViewers[platform.id] || 0;

                return (
                  <button
                    key={platform.id}
                    type="button"
                    onClick={() => handleTogglePlatform(platform.id)}
                    className={`p-3.5 rounded-xl border text-left transition-colors cursor-pointer flex items-center justify-between gap-3 ${
                      isTicked
                        ? 'bg-slate-900/90 border-slate-600 text-white'
                        : 'bg-[#090D16] border-slate-800/80 text-slate-400 hover:border-slate-700 hover:text-slate-200'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className={`w-9 h-9 rounded-lg border flex items-center justify-center shrink-0 ${
                          isTicked ? 'bg-slate-800 border-slate-700' : 'bg-slate-950 border-slate-800'
                        }`}
                      >
                        {platform.logo}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-semibold text-white truncate">{platform.name}</span>
                          {isTicked && (
                            <span className="px-1.5 py-0.2 rounded bg-white/10 text-[9px] font-mono text-slate-200">
                              ON
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-slate-400 truncate">
                          {count > 0
                            ? `${count.toLocaleString()} watching live`
                            : hasUrl
                            ? 'Channel linked • 0 watching'
                            : 'Not linked in rightbar'}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <span
                        className={`text-xs font-mono font-semibold ${
                          count > 0 ? 'text-emerald-400' : 'text-slate-500'
                        }`}
                      >
                        {count.toLocaleString()}
                      </span>
                      <div
                        className={`w-4 h-4 rounded border flex items-center justify-center ${
                          isTicked ? 'bg-white border-white text-slate-950' : 'border-slate-700 bg-slate-950'
                        }`}
                      >
                        {isTicked && <Check size={11} strokeWidth={3} />}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Bottom OBS Source URL Dock Bar */}
        <div className="p-3.5 border-t border-slate-800/80 bg-[#090D16] flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 shrink-0">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <span className="text-[11px] font-mono text-slate-400 shrink-0 hidden md:inline">OBS SOURCE URL:</span>
            <div className="flex-1 flex items-center rounded-lg bg-slate-950 border border-slate-800 px-3 py-2 overflow-hidden min-w-0">
              <span className="text-xs font-mono text-slate-300 select-all truncate">
                {showOverlayToken
                  ? overlayUrl
                  : `${overlayUrl.split('/overlay/view-count/')[0]}/overlay/view-count/••••••••••••••••`}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => setShowOverlayToken(!showOverlayToken)}
              className="p-2 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-400 hover:text-white transition-colors cursor-pointer"
              title={showOverlayToken ? 'Hide token' : 'Show token'}
            >
              {showOverlayToken ? <EyeOff size={14} /> : <Eye size={14} />}
            </button>

            <button
              type="button"
              onClick={handleCopyOverlay}
              className="px-3.5 py-2 rounded-lg bg-white hover:bg-slate-200 text-slate-950 text-xs font-semibold transition-colors cursor-pointer flex items-center gap-1.5"
            >
              {copiedOverlay ? <Check size={13} className="text-emerald-600" /> : <Copy size={13} />}
              <span>{copiedOverlay ? 'Copied' : 'Copy OBS URL'}</span>
            </button>

            <a
              href={overlayUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="p-2 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-400 hover:text-white transition-colors cursor-pointer"
              title="Open overlay in new tab"
            >
              <ExternalLink size={14} />
            </a>
          </div>
        </div>
      </div>

      {/* ============================================================ */}
      {/* RIGHTBAR: BROADCAST CHANNELS CONFIGURATION                   */}
      {/* ============================================================ */}
      <div
        className={`fixed inset-0 bg-black/60 z-40 lg:hidden transition-opacity duration-300 ease-in-out ${
          isRightbarOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
        onClick={onCloseRightbar}
      />

      <div
        className={`fixed lg:static top-0 right-0 bottom-0 z-50 lg:z-auto w-full max-w-[380px] lg:max-w-none shrink-0 h-full overflow-hidden transition-all duration-300 ease-in-out ${
          isRightbarOpen
            ? 'translate-x-0 lg:w-[360px] xl:w-[390px] lg:opacity-100 pointer-events-auto'
            : 'translate-x-full lg:translate-x-0 lg:w-0 lg:opacity-0 lg:-ml-4 pointer-events-none'
        }`}
      >
        <aside className="w-full max-w-[380px] lg:max-w-none lg:w-[360px] xl:w-[390px] bg-[#0B0F19] border-l lg:border border-slate-800/80 lg:rounded-xl flex flex-col h-full overflow-hidden">
          {/* Rightbar Header */}
          <div className="px-4 py-3 border-b border-slate-800/80 bg-[#090D16] flex items-center justify-between gap-2 shrink-0">
            <div>
              <div className="flex items-center gap-2">
                <Users size={14} className="text-slate-300" />
                <h3 className="text-xs font-semibold text-white uppercase tracking-wider">
                  Broadcast Channels
                </h3>
                <span className="px-1.5 py-0.5 rounded bg-slate-900 border border-slate-800 text-[10px] font-mono text-slate-400">
                  {connectedCount}/{PLATFORMS.length}
                </span>
              </div>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Add your live stream links for automatic viewer tracking.
              </p>
            </div>

            {onCloseRightbar && (
              <button
                type="button"
                onClick={onCloseRightbar}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
                title="Close Broadcast Channels"
              >
                <X size={15} />
              </button>
            )}
          </div>

          {/* Rightbar Scrollable Channel List */}
          <div className="flex-1 overflow-y-auto p-3.5 space-y-2.5">
            {PLATFORMS.map((platform) => {
              const val = urls[platform.id] || '';
              const hasUrl = Boolean(val.trim());
              const liveCount = platformViewers[platform.id] || 0;

              return (
                <div
                  key={platform.id}
                  className="rounded-xl bg-[#090D16] border border-slate-800 p-3 space-y-2.5 hover:border-slate-700/80 transition-colors"
                >
                  {/* Channel Header */}
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-7 h-7 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-center shrink-0">
                        {platform.logo}
                      </div>
                      <div className="min-w-0">
                        <h4 className="text-xs font-semibold text-white truncate">{platform.name}</h4>
                        <p className="text-[10px] text-slate-400 truncate">{platform.subtitle}</p>
                      </div>
                    </div>

                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-mono font-medium border shrink-0 ${
                        liveCount > 0
                          ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                          : hasUrl
                          ? 'bg-slate-800 text-slate-200 border-slate-700'
                          : 'bg-slate-950 text-slate-500 border-slate-800'
                      }`}
                    >
                      {liveCount > 0
                        ? `● Live (${liveCount.toLocaleString()})`
                        : hasUrl
                        ? 'Connected'
                        : 'Disconnected'}
                    </span>
                  </div>

                  {/* URL Input & Actions */}
                  <div className="flex items-center gap-1.5">
                    <div className="flex-1 flex items-center rounded-lg bg-slate-950 border border-slate-800 focus-within:border-slate-600 transition-colors overflow-hidden">
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
                        className="w-full px-2.5 py-1.5 bg-transparent text-white font-mono text-[11px] focus:outline-none placeholder-slate-600"
                      />
                      {val && (
                        <button
                          type="button"
                          onClick={() => handleClearUrl(platform.id)}
                          className="p-1.5 text-slate-500 hover:text-white transition-colors cursor-pointer shrink-0"
                          title="Clear URL"
                        >
                          <X size={12} />
                        </button>
                      )}
                    </div>

                    {hasUrl && (
                      <a
                        href={val.startsWith('http://') || val.startsWith('https://') ? val : `https://${val}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800 transition-colors shrink-0"
                        title="Open channel in new tab"
                      >
                        <ExternalLink size={13} />
                      </a>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </aside>
      </div>

      {/* Error Toast Message */}
      {errorToast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 pointer-events-none">
          <div className="px-3.5 py-2 rounded-lg bg-slate-900 border border-red-500/40 text-red-300 font-mono text-xs flex items-center gap-2 shadow-xl">
            <AlertCircle size={14} className="text-red-400 shrink-0" />
            <span>{errorToast}</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default BroadcastStreamManager;
