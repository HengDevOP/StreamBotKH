'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  DollarSign,
  MessageSquare,
  User,
  Zap,
  Sparkles,
  Volume2,
  ShieldCheck,
  Youtube,
  Play,
  Square,
  Loader2,
  Tv,
  CheckCircle2,
  BadgeCheck,
  Sliders,
  Landmark,
  Lock,
  ExternalLink
} from 'lucide-react';
import { Card } from '../common/Card';
import { Button } from '../common/Button';
import { PublicStreamerInfo } from '../../services/donationService';
import { VideoPlayerWithProgressBar } from '../common/VideoPlayerWithProgressBar';
import { VideoClipScrubberLine } from './VideoClipScrubberLine';
import { detectPlatform } from '../../utils/socialPlatforms';

export interface DonorFormData {
  donorName: string;
  donorMessage: string;
  amount?: number;
  currency?: 'USD' | 'KHR';
  bankingName: string;
  videoUrl?: string;
  videoTitle?: string;
  videoStartTime?: number;
  videoEndTime?: number;
}

interface DonorFormProps {
  streamer: PublicStreamerInfo;
  onSubmit: (data: DonorFormData) => Promise<void>;
  loading?: boolean;
}

const DEMO_YOUTUBE_URL = 'https://www.youtube.com/watch?v=HSsGnEOFY6U&list=RDHSsGnEOFY6U&start_radio=1';

export function extractYouTubeId(url: string): string | null {
  if (!url) return null;
  const trimmed = url.trim();
  if (/^[a-zA-Z0-9_-]{11}$/.test(trimmed)) {
    return trimmed;
  }
  const regExp = /(?:youtu\.be\/|(?:www\.|m\.)?youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=|shorts\/|live\/))([\w-]{11})/;
  const match = trimmed.match(regExp);
  return match ? match[1] : null;
}

function formatTime(seconds: number): string {
  const s = Math.max(0, Math.floor(seconds || 0));
  const mins = Math.floor(s / 60);
  const secs = s % 60;
  return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
}

export const DonorForm: React.FC<DonorFormProps> = ({ streamer, onSubmit, loading }) => {
  const storageKey = `streambotkh_draft_${streamer.username || 'neonstreamer'}`;
  const isLoadedRef = useRef<boolean>(false);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Form states: Username, Bank Name, Text/Message, Video URL + Amount & Currency
  const [currency, setCurrency] = useState<'USD' | 'KHR'>('USD');
  const [amount, setAmount] = useState<number>(5);
  const [donorName, setDonorName] = useState<string>('');
  const [bankingName, setBankingName] = useState<string>('');
  const [donorMessage, setDonorMessage] = useState<string>('');

  // YouTube Video Overlay states
  const [videoUrl, setVideoUrl] = useState<string>('');
  const [videoTitle, setVideoTitle] = useState<string>('');
  const [videoAuthor, setVideoAuthor] = useState<string>('');
  const [videoThumbnail, setVideoThumbnail] = useState<string>('');
  const [videoDuration, setVideoDuration] = useState<number | undefined>(undefined);
  const [videoStartTime, setVideoStartTime] = useState<number>(0);
  const [videoEndTime, setVideoEndTime] = useState<number>(30);
  const [fetchingVideo, setFetchingVideo] = useState<boolean>(false);
  const [videoError, setVideoError] = useState<string | null>(null);

  // Live video preview playback state
  const [isPlayingPreview, setIsPlayingPreview] = useState<boolean>(false);
  const [previewKey, setPreviewKey] = useState<number>(0);

  // 1. Restore draft from localStorage on mount safely
  useEffect(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.donorName) setDonorName(parsed.donorName);
        if (parsed.bankingName) setBankingName(parsed.bankingName);
        if (parsed.amount) setAmount(Number(parsed.amount) || 5);
        if (parsed.currency) setCurrency(parsed.currency === 'KHR' ? 'KHR' : 'USD');
        if (parsed.donorMessage) setDonorMessage(parsed.donorMessage);
        if (parsed.videoUrl) {
          setVideoUrl(parsed.videoUrl);
          if (parsed.videoTitle) setVideoTitle(parsed.videoTitle);
          if (parsed.videoAuthor) setVideoAuthor(parsed.videoAuthor);
          if (parsed.videoThumbnail) setVideoThumbnail(parsed.videoThumbnail);
          if (parsed.videoStartTime !== undefined) setVideoStartTime(Number(parsed.videoStartTime) || 0);
          if (parsed.videoEndTime !== undefined) setVideoEndTime(Number(parsed.videoEndTime) || 30);
        }
      }
    } catch (e) {
      console.warn('Could not read draft from localStorage', e);
    } finally {
      isLoadedRef.current = true;
    }
  }, [storageKey]);

  // 2. Persist draft to localStorage on changes ONLY after initial load
  useEffect(() => {
    if (!isLoadedRef.current) return;
    try {
      const draft = {
        donorName,
        bankingName,
        amount,
        currency,
        donorMessage,
        videoUrl,
        videoTitle,
        videoAuthor,
        videoThumbnail,
        videoStartTime,
        videoEndTime
      };
      localStorage.setItem(storageKey, JSON.stringify(draft));
    } catch (e) {
      console.warn('Could not persist draft to localStorage', e);
    }
  }, [
    storageKey,
    donorName,
    bankingName,
    amount,
    currency,
    donorMessage,
    videoUrl,
    videoTitle,
    videoAuthor,
    videoThumbnail,
    videoStartTime,
    videoEndTime
  ]);

  // Handle YouTube URL lookup with proper debouncing
  const lastFetchedUrl = useRef<string>('');

  const fetchYoutubeDetails = async (url: string) => {
    const trimmed = url.trim();
    if (!trimmed) {
      setVideoTitle('');
      setVideoAuthor('');
      setVideoThumbnail('');
      setVideoError(null);
      setIsPlayingPreview(false);
      return;
    }

    const videoId = extractYouTubeId(trimmed);
    if (!videoId) {
      setVideoError('Please enter a valid YouTube video link');
      setVideoTitle('');
      setVideoThumbnail('');
      setIsPlayingPreview(false);
      return;
    }

    if (trimmed === lastFetchedUrl.current && videoTitle) {
      return;
    }

    setFetchingVideo(true);
    setVideoError(null);

    try {
      const res = await fetch(`/api/youtube/details?url=${encodeURIComponent(trimmed)}`);
      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Invalid YouTube URL');
      }

      lastFetchedUrl.current = trimmed;
      setVideoTitle(data.title || `YouTube Video (${videoId})`);
      setVideoAuthor(data.author || 'YouTube Creator');
      setVideoThumbnail(data.thumbnail || `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`);

      const vDur = data.videoDuration ? Number(data.videoDuration) : undefined;
      setVideoDuration(vDur);

      // If video duration is less than the preset (30s), default to full duration!
      if (vDur && vDur < 30) {
        setVideoStartTime(0);
        setVideoEndTime(vDur);
      } else {
        const defaultDur = data.defaultDuration || 30;
        setVideoStartTime(0);
        setVideoEndTime(defaultDur);
      }
      setIsPlayingPreview(true);
      setPreviewKey((k) => k + 1);
    } catch (err: any) {
      setVideoError(null);
      setVideoTitle(`YouTube Video (${videoId})`);
      setVideoThumbnail(`https://img.youtube.com/vi/${videoId}/hqdefault.jpg`);
      setIsPlayingPreview(true);
    } finally {
      setFetchingVideo(false);
    }
  };

  const handleVideoUrlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newUrl = e.target.value;
    setVideoUrl(newUrl);

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    if (!newUrl.trim()) {
      handleClearVideo();
      return;
    }

    debounceTimerRef.current = setTimeout(() => {
      fetchYoutubeDetails(newUrl);
    }, 400);
  };

  const handleClearVideo = () => {
    setVideoUrl('');
    setVideoTitle('');
    setVideoAuthor('');
    setVideoThumbnail('');
    setVideoDuration(undefined);
    setVideoStartTime(0);
    setVideoEndTime(30);
    setVideoError(null);
    setIsPlayingPreview(false);
    lastFetchedUrl.current = '';
  };

  const handleLoadDemoVideo = () => {
    setVideoUrl(DEMO_YOUTUBE_URL);
    setVideoStartTime(0);
    setVideoEndTime(30);
    fetchYoutubeDetails(DEMO_YOUTUBE_URL);
  };

  const handleResetForm = () => {
    setDonorName('');
    setBankingName('');
    setAmount(currency === 'USD' ? 5 : 20000);
    setDonorMessage('');
    handleClearVideo();
    try {
      localStorage.removeItem(storageKey);
    } catch (e) {}
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanDonor = donorName.trim();
    const cleanBanking = bankingName.trim();
    if (!cleanDonor && !cleanBanking) return;

    // Show donor username on alerts and TTS, and pass bankingName for bank payment matching
    await onSubmit({
      donorName: cleanDonor || cleanBanking || 'Supporter',
      bankingName: cleanBanking || cleanDonor,
      donorMessage: donorMessage.trim(),
      amount: amount || 0,
      currency: currency || 'USD',
      videoUrl: videoUrl.trim() ? videoUrl.trim() : undefined,
      videoTitle: videoTitle.trim() ? videoTitle.trim() : undefined,
      videoStartTime: videoUrl.trim() ? Math.max(0, videoStartTime) : undefined,
      videoEndTime: videoUrl.trim() ? Math.max(videoStartTime + 5, videoEndTime) : undefined
    });
  };

  const isEligibleTTS = amount >= (streamer.ttsMinAmount || 2);
  const totalClipSeconds = Math.max(5, videoEndTime - videoStartTime);
  const activeVideoId = extractYouTubeId(videoUrl);

  // Video alert configuration constraints from streamer settings (disabled by default unless explicitly enabled)
  const isVideoAlertsEnabled = Boolean(streamer.videoAlertEnabled) && streamer.hasVideoOverlay !== false;
  const videoMinTip = Number(streamer.videoMinTipAmount ?? 0.25);
  const videoMaxDuration = Number(streamer.videoMaxDurationSeconds ?? 300); // up to 5 minutes
  const currentAmountInUsd = currency === 'KHR' ? (amount || 0) / 4000 : (amount || 0);
  const meetsMinTip = currentAmountInUsd >= videoMinTip;

  const handleSetClipDuration = (durationSec: number) => {
    setVideoEndTime(videoStartTime + durationSec);
    setIsPlayingPreview(true);
    setPreviewKey((k) => k + 1);
  };

  const handleTogglePlayPreview = () => {
    setIsPlayingPreview(!isPlayingPreview);
    if (!isPlayingPreview) {
      setPreviewKey((k) => k + 1);
    }
  };

  return (
    <Card className="p-4 xs:p-5 sm:p-6 border border-slate-800 bg-[#0C101C] rounded-2xl shadow-2xl space-y-4 sm:space-y-5 w-full h-full flex flex-col justify-between">
      {/* 1. Streamer Profile & Bio Header */}
      <div className="flex items-start justify-between gap-2.5 sm:gap-3 pb-3.5 sm:pb-4 border-b border-slate-800/80">
        <div className="flex items-center gap-3 sm:gap-3.5 min-w-0">
          <div className="relative flex-shrink-0">
            <div className="w-11 h-11 xs:w-12 xs:h-12 sm:w-14 sm:h-14 rounded-xl p-0.5 bg-gradient-to-tr from-cyan-500 via-indigo-500 to-pink-500 shadow-md">
              <img
                src={streamer.avatarUrl || `https://api.dicebear.com/7.x/bottts/svg?seed=${streamer.username}`}
                alt={streamer.displayName}
                className="w-full h-full rounded-[10px] bg-slate-900 object-cover"
              />
            </div>
            <div className="absolute -bottom-1.5 inset-x-0 flex justify-center">
              <span className="px-1.5 py-0.2 rounded-full bg-red-600 text-white font-mono font-bold text-[8px] uppercase tracking-wider flex items-center gap-0.5 shadow">
                <span className="w-1 h-1 rounded-full bg-white animate-pulse" />
                LIVE
              </span>
            </div>
          </div>

          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <h1 className="text-sm xs:text-base sm:text-lg font-bold text-white font-['Chakra_Petch'] truncate">
                {streamer.displayName}
              </h1>
              {streamer.isVerified && (
                <span title="Verified Streamer" className="inline-flex items-center text-cyan-400 flex-shrink-0">
                  <BadgeCheck size={16} className="text-cyan-400 fill-cyan-400/20" />
                </span>
              )}
            </div>
            <p className="text-[10px] xs:text-[11px] text-cyan-400 font-mono">@{streamer.username}</p>
            {streamer.bio && (
              <p className="text-[11px] xs:text-xs text-slate-400 line-clamp-2 mt-0.5 sm:mt-1 leading-relaxed">
                {streamer.bio}
              </p>
            )}

            {/* Social / Channel Links Displayed After Logo & Bio */}
            {((streamer.socialLinks && streamer.socialLinks.length > 0) || (streamer.links && streamer.links.length > 0)) && (
              <div className="flex flex-wrap items-center gap-1.5 mt-2.5">
                {(streamer.socialLinks || streamer.links || []).map((link) => {
                  const detected = detectPlatform(link.url);
                  return (
                    <a
                      key={link.id || link.url}
                      href={link.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      title={link.title || detected.defaultTitle}
                      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-semibold font-mono border transition-all duration-200 hover:scale-105 shadow-sm ${detected.brandColor}`}
                    >
                      <img
                        src={link.icon || detected.iconUrl}
                        alt={link.title || detected.defaultTitle}
                        className="w-3.5 h-3.5 rounded-sm object-contain flex-shrink-0"
                        onError={(e) => {
                          (e.target as HTMLElement).style.display = 'none';
                        }}
                      />
                      <span className="truncate max-w-[130px]">{link.title || detected.defaultTitle}</span>
                      <ExternalLink size={10} className="opacity-60 flex-shrink-0" />
                    </a>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Row with Username & Bank Name */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {/* FIELD 1: Username */}
          <div className="space-y-1">
            <label className="text-[11px] font-bold uppercase tracking-wider text-slate-300 font-['Chakra_Petch'] flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <User size={13} className="text-cyan-400" />
                <span>Username *</span>
              </span>
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                <User size={14} />
              </div>
              <input
                type="text"
                required
                placeholder="Tra Gamer"
                value={donorName}
                onChange={(e) => setDonorName(e.target.value)}
                className="w-full pl-9 pr-3 py-2 rounded-none bg-slate-950 border border-slate-800 text-white text-xs sm:text-sm font-medium focus:outline-none focus:border-cyan-400 transition-colors placeholder:text-slate-500"
              />
            </div>
          </div>

          {/* FIELD 2: Payer Name (Bank Account) */}
          <div className="space-y-1">
            <label className="text-[11px] font-bold uppercase tracking-wider text-slate-300 font-['Chakra_Petch'] flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Landmark size={13} className="text-cyan-400" />
                <span>Payer Name (Bank Account) *</span>
              </span>
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                <Landmark size={14} />
              </div>
              <input
                type="text"
                required
                placeholder="SOKPHEAK TRA"
                value={bankingName}
                onChange={(e) => setBankingName(e.target.value)}
                className="w-full pl-9 pr-3 py-2 rounded-none bg-slate-950 border border-slate-800 text-white text-xs sm:text-sm font-medium focus:outline-none focus:border-cyan-400 transition-colors placeholder:text-slate-500 uppercase"
              />
            </div>
          </div>
        </div>

        {/* FIELD 3: Text (Message) */}
        <div className="space-y-1">
          <div className="flex items-center justify-between">
            <label className="text-[11px] font-bold uppercase tracking-wider text-slate-300 font-['Chakra_Petch'] flex items-center gap-1.5">
              <MessageSquare size={13} className="text-cyan-400" />
              <span>Text (Message)</span>
            </label>
            <span className="text-[10px] font-mono text-slate-500">{donorMessage.length}/200</span>
          </div>

          <textarea
            rows={2}
            maxLength={200}
            placeholder="Drop a cheer or message to be broadcasted on stream..."
            value={donorMessage}
            onChange={(e) => setDonorMessage(e.target.value)}
            className="w-full p-2.5 rounded-none bg-slate-950 border border-slate-800 text-white text-xs sm:text-sm focus:outline-none focus:border-cyan-400 transition-colors resize-none placeholder:text-slate-500 leading-relaxed"
          />
        </div>

        {/* FIELD 4: Video URL (Media Share) - Only rendered if enabled by streamer */}
        {isVideoAlertsEnabled && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-[11px] font-bold uppercase tracking-wider text-slate-300 font-['Chakra_Petch'] flex items-center gap-1.5">
                <Youtube size={14} className="text-red-500" />
                <span>Video URL (YouTube Media Share)</span>
              </label>
              {meetsMinTip && (
                <button
                  type="button"
                  onClick={handleLoadDemoVideo}
                  className="text-[10px] font-mono text-cyan-400 hover:text-cyan-300 underline"
                >
                  Try Demo Video
                </button>
              )}
            </div>

            {/* If tip amount is under streamer's minimum tip threshold ($0.25 to $50) */}
            {!meetsMinTip ? (
              <div className="p-3 bg-slate-950 border border-amber-500/30 rounded-none flex items-center justify-between gap-3 text-xs font-mono">
                <div className="space-y-0.5">
                  <span className="text-amber-300 font-bold flex items-center gap-1.5 text-[11px]">
                    <Lock size={12} className="text-amber-400" />
                    <span>Media Share unlocks at ${videoMinTip.toFixed(2)}+</span>
                  </span>
                  <span className="text-[10px] text-slate-400 block">
                    Current tip: ${currentAmountInUsd.toFixed(2)} USD
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    if (currency === 'KHR') {
                      setAmount(Math.round(videoMinTip * 4000));
                    } else {
                      setAmount(videoMinTip);
                    }
                  }}
                  className="px-2.5 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-[10px] uppercase font-mono rounded-none transition-colors whitespace-nowrap"
                >
                  Set to ${videoMinTip.toFixed(2)}
                </button>
              </div>
            ) : (
              <>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-red-500">
                    {fetchingVideo ? (
                      <Loader2 size={14} className="animate-spin text-cyan-400" />
                    ) : (
                      <Youtube size={14} />
                    )}
                  </div>
                  <input
                    type="url"
                    placeholder="Paste YouTube link (e.g. https://www.youtube.com/watch?v=...)"
                    value={videoUrl}
                    onChange={handleVideoUrlChange}
                    className="w-full pl-9 pr-14 py-2 rounded-none bg-slate-950 border border-slate-800 text-white text-xs sm:text-sm font-medium focus:outline-none focus:border-red-500/70 transition-colors placeholder:text-slate-500"
                  />
                  {videoUrl && (
                    <button
                      type="button"
                      onClick={handleClearVideo}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-red-400 text-xs transition-colors"
                    >
                      Clear
                    </button>
                  )}
                </div>

                {videoError && (
                  <p className="text-[10px] text-red-400 font-mono">{videoError}</p>
                )}

                {videoTitle && (
                  <div className="flex items-center gap-2 p-1.5 bg-slate-950/80 border border-slate-800 text-[11px]">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse flex-shrink-0" />
                    <span className="text-slate-300 truncate font-medium">{videoTitle}</span>
                  </div>
                )}

                {/* Video Preview Player & Scrubber Timeline */}
                {activeVideoId && (
                  <div className="space-y-2.5 pt-1 animate-fadeIn">
                    {/* Live Preview Player with Custom Progress Duration Bar at Bottom */}
                    <VideoPlayerWithProgressBar
                      videoId={activeVideoId}
                      startTime={videoStartTime}
                      endTime={videoEndTime}
                      autoplay={true}
                      muted={false}
                      videoTitle={videoTitle}
                      donorName={donorName || 'Viewer'}
                      amount={amount}
                      currency={currency}
                      isPreview={true}
                    />

                    {/* Custom Clip Duration Line for easy drag & move segment up to 5 mins */}
                    <VideoClipScrubberLine
                      startTime={videoStartTime}
                      endTime={videoEndTime}
                      videoDuration={videoDuration}
                      maxAllowedDuration={videoMaxDuration}
                      onChange={(newStart, newEnd) => {
                        setVideoStartTime(newStart);
                        setVideoEndTime(newEnd);
                      }}
                    />
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* Tips CTA Button */}
        <div className="pt-2">
          <Button
            type="submit"
            variant="primary"
            size="lg"
            loading={loading}
            disabled={!donorName.trim()}
            className="w-full py-3 text-sm sm:text-base font-bold bg-cyan-400 hover:bg-cyan-300 text-slate-950 rounded-none shadow-lg shadow-cyan-500/20 transition-all font-['Chakra_Petch']"
            icon={<Zap size={18} className="fill-slate-950" />}
          >
            Tips
          </Button>
        </div>
      </form>
    </Card>
  );
};
