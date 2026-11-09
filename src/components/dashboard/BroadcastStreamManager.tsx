'use client';

import React, { useState, useEffect } from 'react';
import {
  Check,
  CheckCircle2,
  AlertCircle,
  X,
  ExternalLink,
  Save,
  Loader2
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
  helpText: string;
  logo: React.ReactNode;
}

const PLATFORMS: PlatformItem[] = [
  {
    id: 'youtube',
    name: 'YouTube',
    subtitle: 'YouTube Live Stream',
    placeholder: 'https://www.youtube.com/watch?v=... or https://youtube.com/live/...',
    helpText: 'Paste your YouTube stream link (e.g. youtube.com/watch?v=... or youtube.com/live/...).',
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
    helpText: 'Paste your Twitch channel URL (e.g. twitch.tv/yourchannel).',
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
    helpText: 'Paste your TikTok Live URL or profile link (e.g. tiktok.com/@username/live).',
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
    helpText: 'Paste your Facebook Gaming or Live broadcast URL.',
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

  const [savingPlatform, setSavingPlatform] = useState<string | null>(null);
  const [savingAll, setSavingAll] = useState<boolean>(false);
  const [saveSuccessMessage, setSaveSuccessMessage] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Sync state when user prop updates
  useEffect(() => {
    if (user) {
      setUrls({
        youtube: user?.broadcastUrls?.youtube || user?.liveStreamUrl || '',
        twitch: user?.broadcastUrls?.twitch || user?.twitchLiveUrl || '',
        tiktok: user?.broadcastUrls?.tiktok || user?.tiktokLiveUrl || '',
        facebook: user?.broadcastUrls?.facebook || user?.facebookLiveUrl || ''
      });
    }
  }, [user]);

  // Save handler (individual or all)
  const handleSave = async (platformId?: 'youtube' | 'twitch' | 'tiktok' | 'facebook') => {
    if (platformId) {
      setSavingPlatform(platformId);
    } else {
      setSavingAll(true);
    }
    setErrorMsg(null);
    setSaveSuccessMessage(null);

    try {
      const sanitizedUrls = {
        youtube: (urls.youtube || '').trim(),
        twitch: (urls.twitch || '').trim(),
        tiktok: (urls.tiktok || '').trim(),
        facebook: (urls.facebook || '').trim()
      };

      await streamerService.updateProfile({
        broadcastUrls: sanitizedUrls,
        liveStreamUrl: sanitizedUrls.youtube
      });

      if (onRefreshUser) {
        await onRefreshUser();
      }

      setSaveSuccessMessage(
        platformId
          ? `${PLATFORMS.find((p) => p.id === platformId)?.name || 'Platform'} URL saved successfully.`
          : 'All broadcast URLs saved successfully.'
      );
      setTimeout(() => setSaveSuccessMessage(null), 3000);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to save broadcast URLs.');
    } finally {
      setSavingPlatform(null);
      setSavingAll(false);
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12 animate-in fade-in duration-300">
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-1">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-white font-['Chakra_Petch'] tracking-wide">
            Broadcast
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Connect your live stream URLs across YouTube, Twitch, TikTok, and Facebook.
          </p>
        </div>

        <button
          type="button"
          onClick={() => handleSave()}
          disabled={savingAll || savingPlatform !== null}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-mono text-xs font-bold border border-slate-700 hover:border-slate-600 transition-all cursor-pointer disabled:opacity-40 self-start sm:self-auto shadow-sm"
        >
          {savingAll ? (
            <Loader2 size={14} className="animate-spin text-slate-400" />
          ) : (
            <Save size={14} className="text-slate-400" />
          )}
          <span>{savingAll ? 'Saving All...' : 'Save All URLs'}</span>
        </button>
      </div>

      {/* FEEDBACK BANNERS */}
      {saveSuccessMessage && (
        <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs font-mono flex items-center gap-2">
          <CheckCircle2 size={15} className="text-emerald-400 shrink-0" />
          <span>{saveSuccessMessage}</span>
        </div>
      )}

      {errorMsg && (
        <div className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-300 text-xs font-mono flex items-center gap-2">
          <AlertCircle size={15} className="text-red-400 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* PLATFORMS LIST */}
      <div className="space-y-4">
        {PLATFORMS.map((platform) => {
          const val = urls[platform.id] || '';
          const hasUrl = Boolean(val.trim());
          const isSavingThis = savingPlatform === platform.id;

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
                    <span className={`w-1.5 h-1.5 rounded-full ${hasUrl ? 'bg-emerald-400' : 'bg-slate-600'}`} />
                    <span>{hasUrl ? 'Connected' : 'Not configured'}</span>
                  </span>
                </div>
              </div>

              {/* Input & Action buttons */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
                <div className="flex-1 flex items-center rounded-xl bg-slate-950 border border-slate-800 focus-within:border-slate-600 transition-colors overflow-hidden">
                  <input
                    type="url"
                    value={val}
                    onChange={(e) => setUrls({ ...urls, [platform.id]: e.target.value })}
                    placeholder={platform.placeholder}
                    className="w-full px-3.5 py-2.5 bg-transparent text-white font-mono text-xs focus:outline-none placeholder-slate-600"
                  />
                  {val && (
                    <button
                      type="button"
                      onClick={() => setUrls({ ...urls, [platform.id]: '' })}
                      className="p-2 text-slate-500 hover:text-white transition-colors cursor-pointer mr-1 shrink-0"
                      title="Clear URL"
                    >
                      <X size={14} />
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {hasUrl && (
                    <a
                      href={val.startsWith('http://') || val.startsWith('https://') ? val : `https://${val}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-2.5 rounded-xl bg-slate-900 hover:bg-slate-850 text-slate-300 hover:text-white border border-slate-800 text-xs font-mono transition-colors"
                      title="Open live link in new tab"
                    >
                      <ExternalLink size={14} />
                    </a>
                  )}

                  <button
                    type="button"
                    onClick={() => handleSave(platform.id)}
                    disabled={isSavingThis || savingAll}
                    className="px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs font-mono border border-slate-800 hover:border-slate-700 transition-all cursor-pointer disabled:opacity-40 flex items-center gap-1.5"
                  >
                    {isSavingThis ? (
                      <Loader2 size={13} className="animate-spin text-slate-400" />
                    ) : (
                      <Check size={13} className="text-slate-400" />
                    )}
                    <span>{isSavingThis ? 'Saving...' : 'Save'}</span>
                  </button>
                </div>
              </div>

              {/* Guidance text */}
              <p className="text-[11px] font-mono text-slate-500">
                {platform.helpText}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default BroadcastStreamManager;
