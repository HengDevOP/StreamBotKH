'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  CheckCircle2,
  AlertCircle,
  X,
  ExternalLink,
  Copy,
  Eye,
  EyeOff
} from 'lucide-react';
import { streamerService } from '../../services/streamerService';
import { AnimatedCounter } from '../overlay/StreamViewCountOverlay';

export interface BroadcastStreamManagerProps {
  user: any;
  onRefreshUser?: () => Promise<void>;
  onNavigateToTab?: (tab: string) => void;
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
      <svg viewBox="0 0 24 24" className="w-4 h-4 fill-[#E4405F] shrink-0" aria-label="Instagram">
        <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
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
  const [isChannelLive, setIsChannelLive] = useState<boolean>(false);
  const [hasConfiguredChannels, setHasConfiguredChannels] = useState<boolean>(false);

  const [showOverlayToken, setShowOverlayToken] = useState(false);
  const [copiedOverlay, setCopiedOverlay] = useState(false);

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
        kick: user?.broadcastUrls?.kick || '',
        instagram: user?.broadcastUrls?.instagram || ''
      };
      setUrls(initial);
      lastSavedUrlsRef.current = initial;

      if (user.broadcastViewCount) {
        if (Array.isArray(user.broadcastViewCount.enabledPlatforms) && user.broadcastViewCount.enabledPlatforms.length > 0) {
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

  // Sync real-time live viewers detected from configured broadcast channels
  useEffect(() => {
    let isMounted = true;
    const fetchLiveViewers = async () => {
      try {
        const res = await fetch(`/api/widgets/view-count?token=${overlayToken}`);
        const data = await res.json();
        if (isMounted && data?.success && typeof data.totalViewers === 'number') {
          setRealViewers(data.totalViewers);
          setIsChannelLive(Boolean(data.isLive));
          setHasConfiguredChannels(Boolean(data.hasChannels));
        }
      } catch {}
    };

    fetchLiveViewers();
    const interval = setInterval(fetchLiveViewers, 10000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [overlayToken]);

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
          enabledPlatforms
        })
      })
        .then((res) => res.json())
        .then((data) => {
          if (data?.success && typeof data.totalViewers === 'number') {
            setRealViewers(data.totalViewers);
            setIsChannelLive(Boolean(data.isLive));
            setHasConfiguredChannels(Boolean(data.hasChannels));
          }
        })
        .catch(() => {});

      showToast('Saved', 'success');
    } catch (err: any) {
      showToast(err.message || 'Failed to save', 'error');
    }
  };

  const handleClearUrl = (platformId: PlatformId) => {
    setUrls((prev) => ({ ...prev, [platformId]: '' }));
    handleAutoSaveUrl(platformId, '');
  };

  // Save view count settings
  const saveViewCountSettings = async (overrides: Partial<{
    enabledPlatforms: PlatformId[];
  }> = {}) => {
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
          ...nextSettings
        })
      });
      const data = await res.json();
      if (data?.success && typeof data.totalViewers === 'number') {
        setRealViewers(data.totalViewers);
        setIsChannelLive(Boolean(data.isLive));
        setHasConfiguredChannels(Boolean(data.hasChannels));
      }

      if (onRefreshUser) {
        await onRefreshUser();
      }

      showToast('Saved', 'success');
    } catch (err: any) {
      showToast(err.message || 'Failed to save', 'error');
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
    showToast('Copied URL', 'success');
    setTimeout(() => setCopiedOverlay(false), 2000);
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12 animate-in fade-in duration-300">
      
      {/* ─────────────────────────────────────────────────────────────
          VIEW COUNT OVERLAY SECTION (CLEAN & MINIMAL)
      ───────────────────────────────────────────────────────────── */}
      <div className="rounded-2xl bg-[#090D18] border border-slate-800 p-5 space-y-4 shadow-sm">
        <div>
          <h3 className="text-sm font-bold text-white font-['Chakra_Petch'] tracking-wide">
            Concurrent View Count
          </h3>
          <p className="text-[11px] text-slate-400">
            Tick platforms to display their logos with your concurrent viewer count in OBS.
          </p>
        </div>

        {/* Overlay URL Input */}
        <div className="flex items-center gap-2">
          <div className="flex-1 flex items-center rounded-xl bg-slate-950 border border-slate-800 px-3.5 py-2.5 overflow-hidden">
            <span className="text-xs font-mono text-slate-400 select-all truncate">
              {showOverlayToken
                ? overlayUrl
                : `${overlayUrl.split('/overlay/view-count/')[0]}/overlay/view-count/••••••••••••••••`}
            </span>
          </div>

          <button
            type="button"
            onClick={() => setShowOverlayToken(!showOverlayToken)}
            className="p-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-400 hover:text-white transition-colors cursor-pointer shrink-0"
            title={showOverlayToken ? 'Hide token' : 'Show token'}
          >
            {showOverlayToken ? <EyeOff size={15} /> : <Eye size={15} />}
          </button>

          <button
            type="button"
            onClick={handleCopyOverlay}
            className="px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-xs font-mono text-slate-200 hover:text-white transition-colors cursor-pointer shrink-0 flex items-center gap-1.5"
          >
            <Copy size={13} />
            <span>{copiedOverlay ? 'Copied' : 'Copy URL'}</span>
          </button>

          <a
            href={overlayUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="p-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-400 hover:text-white transition-colors cursor-pointer shrink-0"
            title="Open overlay in new tab"
          >
            <ExternalLink size={15} />
          </a>
        </div>

        {/* Platform Selection */}
        <div className="space-y-2">
          <label className="text-xs font-medium text-slate-400">
            Platforms
          </label>
          <div className="flex flex-wrap gap-2">
            {PLATFORMS.map((platform) => {
              const isTicked = enabledPlatforms.includes(platform.id);
              return (
                <button
                  key={platform.id}
                  type="button"
                  onClick={() => handleTogglePlatform(platform.id)}
                  className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-xs font-medium transition-colors cursor-pointer select-none ${
                    isTicked
                      ? 'bg-slate-800 border-slate-600 text-white'
                      : 'bg-slate-950 border-slate-800 text-slate-500 hover:text-slate-300'
                  }`}
                >
                  <div className="shrink-0">{platform.logo}</div>
                  <span>{platform.name}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Clean Live Preview */}
        <div className="space-y-2 pt-2 border-t border-slate-800/80">
          <div className="flex items-center justify-between">
            <label className="text-xs font-medium text-slate-400">
              Preview
            </label>
            <div className="text-[11px] font-mono">
              {isChannelLive ? (
                <span className="text-emerald-400 font-medium">
                  ● Live ({realViewers.toLocaleString()} watching)
                </span>
              ) : hasConfiguredChannels ? (
                <span className="text-slate-500">
                  Channels offline (0 watching)
                </span>
              ) : (
                <span className="text-slate-500">
                  No channel set
                </span>
              )}
            </div>
          </div>
          <div className="p-4 rounded-xl bg-slate-950 border border-slate-800/80 flex items-center justify-center">
            <div className="inline-flex items-center gap-2.5 px-3.5 py-2 rounded-xl bg-black/80 border border-white/10 text-white">
              <div className="flex items-center gap-2">
                {enabledPlatforms.map((pid) => (
                  <div key={pid} className="shrink-0">
                    {PLATFORMS.find((p) => p.id === pid)?.logo}
                  </div>
                ))}
              </div>
              <AnimatedCounter
                value={realViewers}
                className="text-lg font-bold font-mono tracking-tight text-white"
              />
            </div>
          </div>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          STREAM CHANNELS & URLS SECTION
      ───────────────────────────────────────────────────────────── */}
      <div className="space-y-4">
        <div>
          <h3 className="text-sm font-bold text-white font-['Chakra_Petch'] tracking-wide">
            Broadcast Channels
          </h3>
          <p className="text-[11px] text-slate-400">
            Add your stream or channel links for viewer tracking and multistreaming.
          </p>
        </div>

        <div className="space-y-3">
          {PLATFORMS.map((platform) => {
            const val = urls[platform.id] || '';
            const hasUrl = Boolean(val.trim());

            return (
              <div
                key={platform.id}
                className="rounded-2xl bg-[#090D18] border border-slate-800 p-4 sm:p-5 space-y-3 hover:border-slate-700/80 transition-colors shadow-sm"
              >
                {/* Row Header */}
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center shrink-0">
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
                      className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-mono font-medium border ${
                        hasUrl
                          ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                          : 'bg-slate-900 text-slate-500 border-slate-800'
                      }`}
                    >
                      {hasUrl ? 'Connected' : 'Disconnected'}
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
                      title="Open in new tab"
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

      {/* Floating Toast Message */}
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
