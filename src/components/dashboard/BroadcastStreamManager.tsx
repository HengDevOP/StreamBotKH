'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  CheckCircle2,
  AlertCircle,
  X,
  ExternalLink
} from 'lucide-react';
import { streamerService } from '../../services/streamerService';

export interface BroadcastStreamManagerProps {
  user: any;
  onRefreshUser?: () => Promise<void>;
  onNavigateToTab?: (tab: string) => void;
}

interface PlatformItem {
  id: 'youtube' | 'twitch' | 'tiktok' | 'facebook';
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
  }
];

export const BroadcastStreamManager: React.FC<BroadcastStreamManagerProps> = ({
  user,
  onRefreshUser
}) => {
  const [urls, setUrls] = useState<{
    youtube: string;
    twitch: string;
    tiktok: string;
    facebook: string;
  }>({
    youtube: user?.broadcastUrls?.youtube || user?.liveStreamUrl || '',
    twitch: user?.broadcastUrls?.twitch || user?.twitchLiveUrl || '',
    tiktok: user?.broadcastUrls?.tiktok || user?.tiktokLiveUrl || '',
    facebook: user?.broadcastUrls?.facebook || user?.facebookLiveUrl || ''
  });

  const lastSavedUrlsRef = useRef(urls);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const toastTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Sync state when user prop updates
  useEffect(() => {
    if (user) {
      const initial = {
        youtube: user?.broadcastUrls?.youtube || user?.liveStreamUrl || '',
        twitch: user?.broadcastUrls?.twitch || user?.twitchLiveUrl || '',
        tiktok: user?.broadcastUrls?.tiktok || user?.tiktokLiveUrl || '',
        facebook: user?.broadcastUrls?.facebook || user?.facebookLiveUrl || ''
      };
      setUrls(initial);
      lastSavedUrlsRef.current = initial;
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

  const handleAutoSave = async (
    platformId: 'youtube' | 'twitch' | 'tiktok' | 'facebook',
    overrideVal?: string
  ) => {
    const currentVal = (overrideVal !== undefined ? overrideVal : (urls[platformId] || '')).trim();
    const prevSaved = (lastSavedUrlsRef.current[platformId] || '').trim();

    // No changes, skip request
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
        facebook: (nextUrls.facebook || '').trim()
      };

      await streamerService.updateProfile({
        broadcastUrls: sanitizedUrls,
        liveStreamUrl: sanitizedUrls.youtube
      });

      if (onRefreshUser) {
        await onRefreshUser();
      }

      showToast('Save changes', 'success');
    } catch (err: any) {
      showToast(err.message || 'Failed to save changes', 'error');
    }
  };

  const handleClear = (platformId: 'youtube' | 'twitch' | 'tiktok' | 'facebook') => {
    setUrls((prev) => ({ ...prev, [platformId]: '' }));
    handleAutoSave(platformId, '');
  };

  return (
    <div className="space-y-4 max-w-5xl mx-auto pb-12 animate-in fade-in duration-300">
      {/* PLATFORMS LIST */}
      <div className="space-y-4">
        {PLATFORMS.map((platform) => {
          const val = urls[platform.id] || '';
          const hasUrl = Boolean(val.trim());

          return (
            <div
              key={platform.id}
              className="rounded-2xl bg-[#090D18] border border-slate-800 p-5 space-y-4 hover:border-slate-700/80 transition-colors shadow-sm"
            >
              {/* Row Header */}
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center shrink-0">
                    {platform.logo}
                  </div>
                  <div>
                    <h2 className="text-sm font-bold text-white font-['Chakra_Petch'] tracking-wide">
                      {platform.name}
                    </h2>
                    <p className="text-[11px] text-slate-400">
                      {platform.subtitle}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span
                    className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-mono font-medium border ${
                      hasUrl
                        ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                        : 'bg-slate-900 text-slate-500 border-slate-800'
                    }`}
                  >
                    {hasUrl && <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />}
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
                    onBlur={() => handleAutoSave(platform.id)}
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
                      onClick={() => handleClear(platform.id)}
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
                    className="p-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800 text-xs font-mono transition-colors shrink-0"
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

      {/* BOTTOM FLOATING TOAST MESSAGE */}
      <div
        className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-50 transition-all duration-300 ease-out pointer-events-none ${
          toast
            ? 'translate-y-0 opacity-100 scale-100'
            : 'translate-y-4 opacity-0 scale-95 pointer-events-none'
        }`}
      >
        <div
          className={`px-4 py-2.5 rounded-xl border font-mono text-xs font-semibold flex items-center gap-2 shadow-2xl backdrop-blur-md ${
            toast?.type === 'error'
              ? 'bg-red-950/90 border-red-500/40 text-red-200 shadow-[0_10px_30px_rgba(239,68,68,0.3)]'
              : 'bg-[#0B101E]/95 border-emerald-500/40 text-emerald-300 shadow-[0_10px_30px_rgba(16,185,129,0.25)]'
          }`}
        >
          {toast?.type === 'error' ? (
            <AlertCircle size={15} className="text-red-400 shrink-0" />
          ) : (
            <CheckCircle2 size={15} className="text-emerald-400 shrink-0" />
          )}
          <span>{toast?.message}</span>
        </div>
      </div>
    </div>
  );
};

export default BroadcastStreamManager;
