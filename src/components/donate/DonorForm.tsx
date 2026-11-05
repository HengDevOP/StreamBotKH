'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  DollarSign,
  MessageSquare,
  User,
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
  ExternalLink,
  Crown,
  Star,
  Flame,
  Zap,
  Heart,
  Check
} from 'lucide-react';
import { Card } from '../common/Card';
import { Button } from '../common/Button';
import { PublicStreamerInfo } from '../../services/donationService';
import { VideoPlayerWithProgressBar } from '../common/VideoPlayerWithProgressBar';
import { VideoClipScrubberLine } from './VideoClipScrubberLine';
import { detectPlatform } from '../../utils/socialPlatforms';
import { SubscriberTier } from '../../types/subscriber';

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
  isSubscription?: boolean;
  tierId?: string;
  tierName?: string;
  badgeText?: string;
  badgeColor?: string;
  badgeBg?: string;
  badgeBorder?: string;
  badgeIcon?: string;
  badgeGifUrl?: string;
  badgeImage?: string;
}

import { getBadgeIconComponent } from '../../data/badgeIcons';

interface DonorFormProps {
  streamer: PublicStreamerInfo;
  onSubmit: (data: DonorFormData) => Promise<void>;
  onSetupRequired?: () => void;
  loading?: boolean;
  isModalOpen?: boolean;
}

const DEMO_YOUTUBE_URL = 'https://www.youtube.com/watch?v=HSsGnEOFY6U';

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

export type DonorLanguage = 'en' | 'kh';

export const DONOR_TRANSLATIONS = {
  en: {
    oneTimeTip: 'One-Time Tip',
    subscribe: 'Subscribe',
    vipBadge: 'VIP BADGE',
    selectTier: 'Select Membership Tier',
    activeBadge: '30-day active badge',
    vipNotice: 'Your VIP badge will display next to your username in stream chat and alerts!',
    username: 'Username *',
    youtubeName: 'YouTube Account Name (for Chat Badge) *',
    matchLiveChat: 'MATCH LIVE CHAT',
    usernamePlaceholder: 'Tra Gamer',
    youtubePlaceholder: 'e.g. SokhaGamer or @sokhagamer',
    youtubeHelp: 'Enter your exact YouTube channel name or @handle so your VIP badge displays automatically in live stream chat.',
    payerName: 'Payer Name (Bank Account) *',
    payerPlaceholder: 'SOKPHEAK TRA',
    message: 'Text (Message)',
    messagePlaceholder: 'Drop a cheer or message to be broadcasted on stream...',
    shareMedia: 'Share Media',
    requiredTip: '[Required $1.00]',
    tryDemo: 'Try Demo Video',
    videoPlaceholder: 'Paste YouTube link (e.g. https://www.youtube.com/watch?v=...)',
    clear: 'Clear',
    sendTip: 'Send Tip',
    subscribeWithKhqr: (price: string) => `Subscribe with Bakong KHQR ${price ? `(${price})` : ''}`,
    loading: 'Generating KHQR...'
  },
  kh: {
    oneTimeTip: 'ឧបត្ថម្ភ (Tip)',
    subscribe: 'ជាវសមាជិក (Subscribe)',
    vipBadge: 'ផ្លាក VIP',
    selectTier: 'ជ្រើសរើសកម្រិតសមាជិក',
    activeBadge: 'ផ្លាកមានសុពលភាព 30 ថ្ងៃ',
    vipNotice: 'ផ្លាកសញ្ញា VIP របស់អ្នកនឹងបង្ហាញជាប់ឈ្មោះក្នុង live chat និងលើផ្ទាំងផ្សាយផ្ទាល់!',
    username: 'ឈ្មោះអ្នកឧបត្ថម្ភ *',
    youtubeName: 'ឈ្មោះគណនី YouTube (សម្រាប់ផ្លាក Chat) *',
    matchLiveChat: 'ដូចឈ្មោះ LIVE CHAT',
    usernamePlaceholder: 'ឧ. ត្រា ហ្គេមមឺ',
    youtubePlaceholder: 'ឧ. SokhaGamer ឬ @sokhagamer',
    youtubeHelp: 'សូមបញ្ចូលឈ្មោះគណនី YouTube ឬ @handle របស់អ្នកឱ្យដូចគ្នាបេះបិទ ដើម្បីឱ្យផ្លាកសញ្ញា VIP បង្ហាញក្នុង live chat ដោយស្វ័យប្រវត្តិ។',
    payerName: 'ឈ្មោះម្ចាស់គណនីធនាគារ *',
    payerPlaceholder: 'SOKPHEAK TRA (អក្សរឡាតាំង)',
    message: 'សារជូនពរ (Message)',
    messagePlaceholder: 'សរសេរសារជូនពរ ឬលើកទឹកចិត្តដែលនឹងបង្ហាញលើផ្ទាំងផ្សាយផ្ទាល់...',
    shareMedia: 'ចែករំលែកវីដេអូ',
    requiredTip: '[ទាមទារ $1.00]',
    tryDemo: 'សាកល្បងវីដេអូគំរូ',
    videoPlaceholder: 'បិទភ្ជាប់តំណ YouTube (ឧ. https://www.youtube.com/watch?v=...)',
    clear: 'សម្អាត',
    sendTip: 'ផ្ញើជំនួយឧបត្ថម្ភ (Send Tip)',
    subscribeWithKhqr: (price: string) => `ជាវសមាជិកជាមួយ Bakong KHQR ${price ? `(${price})` : ''}`,
    loading: 'កំពុងបង្កើត KHQR...'
  }
};

function formatTime(seconds: number): string {
  const s = Math.max(0, Math.floor(seconds || 0));
  const mins = Math.floor(s / 60);
  const secs = s % 60;
  return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
}

export const DonorForm: React.FC<DonorFormProps> = ({ streamer, onSubmit, onSetupRequired, loading, isModalOpen }) => {
  const storageKey = `streambotkh_draft_${streamer.username || 'neonstreamer'}`;
  const isLoadedRef = useRef<boolean>(false);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Language Switcher State: 'en' | 'kh'
  const [lang, setLang] = useState<DonorLanguage>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('stream_lang');
      if (saved === 'kh' || saved === 'en') return saved;
    }
    return 'en';
  });

  const handleSwitchLang = (newLang: DonorLanguage) => {
    setLang(newLang);
    if (typeof window !== 'undefined') {
      localStorage.setItem('stream_lang', newLang);
      window.dispatchEvent(new CustomEvent('stream_lang_change', { detail: newLang }));
    }
  };

  useEffect(() => {
    const onLangChange = (e: any) => {
      const l = e.detail || localStorage.getItem('stream_lang');
      if (l === 'kh' || l === 'en') {
        setLang(l);
      }
    };
    window.addEventListener('stream_lang_change', onLangChange);
    return () => window.removeEventListener('stream_lang_change', onLangChange);
  }, []);

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

  // Subscriber / Membership State
  const [donationType, setDonationType] = useState<'tip' | 'subscribe'>('tip');
  const [subscriberSettings, setSubscriberSettings] = useState<{ enabled: boolean; tiers: SubscriberTier[] } | null>(null);
  const [selectedTierId, setSelectedTierId] = useState<string>('');

  // Fetch streamer subscriber settings
  useEffect(() => {
    if (!streamer?.username) return;
    fetch(`/api/streamer/${encodeURIComponent(streamer.username)}/subscribers`)
      .then((res) => res.json())
      .then((data) => {
        if (data.success && data.enabled && Array.isArray(data.tiers) && data.tiers.length > 0) {
          const activeTiers = data.tiers.filter((t: SubscriberTier) => t.enabled !== false);
          if (activeTiers.length > 0) {
            setSubscriberSettings({ enabled: true, tiers: activeTiers });
            setSelectedTierId(activeTiers[0].id);
          }
        }
      })
      .catch(() => {});
  }, [streamer?.username]);

  const handleModeChange = (mode: 'tip' | 'subscribe') => {
    setDonationType(mode);
    if (mode === 'subscribe' && subscriberSettings?.tiers?.length) {
      const activeTier = subscriberSettings.tiers.find((t) => t.id === selectedTierId) || subscriberSettings.tiers[0];
      if (activeTier) {
        setAmount(activeTier.price);
        setCurrency(activeTier.currency || 'USD');
      }
    }
  };

  const handleSelectTier = (tier: SubscriberTier) => {
    setSelectedTierId(tier.id);
    setAmount(tier.price);
    setCurrency(tier.currency || 'USD');
  };

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
      setIsPlayingPreview(true);
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
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    setVideoError(null);
    setVideoUrl(DEMO_YOUTUBE_URL);
    setVideoStartTime(0);
    setVideoEndTime(30);
    setIsPlayingPreview(true);
    setPreviewKey((k) => k + 1);
    void fetchYoutubeDetails(DEMO_YOUTUBE_URL);
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

  // Auto pause preview playback when viewer clicks Tip to show Bakong KHQR modal
  useEffect(() => {
    if (loading || isModalOpen) {
      setIsPlayingPreview(false);
    }
  }, [loading, isModalOpen]);

  // Ensure clip duration boundaries strictly match video duration 100% without glitches
  useEffect(() => {
    if (videoDuration && videoDuration > 0) {
      if (videoEndTime > videoDuration) {
        setVideoEndTime(videoDuration);
      }
      if (videoStartTime >= videoDuration) {
        setVideoStartTime(Math.max(0, videoDuration - Math.min(30, videoDuration)));
      }
    }
  }, [videoDuration]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (streamer.isTipConfigured === false) {
      onSetupRequired?.();
      return;
    }
    const cleanDonor = donorName.trim();
    const cleanBanking = bankingName.trim();
    if (!cleanDonor && !cleanBanking) return;

    // Auto pause preview video immediately when viewer clicks Tip to show Bakong KHQR modal
    setIsPlayingPreview(false);

    const selectedTier = donationType === 'subscribe' && subscriberSettings?.tiers
      ? subscriberSettings.tiers.find((t) => t.id === selectedTierId) || subscriberSettings.tiers[0]
      : null;

    const finalAmount = donationType === 'subscribe' && selectedTier ? selectedTier.price : (amount || 0);
    const finalCurrency = donationType === 'subscribe' && selectedTier ? (selectedTier.currency || 'USD') : (currency || 'USD');

    // Show donor username on alerts and TTS, and pass bankingName for bank payment matching
    await onSubmit({
      donorName: cleanDonor || cleanBanking || 'Supporter',
      bankingName: cleanBanking || cleanDonor,
      donorMessage: donorMessage.trim(),
      amount: finalAmount,
      currency: finalCurrency,
      videoUrl: donationType === 'tip' && videoUrl.trim() ? videoUrl.trim() : undefined,
      videoTitle: donationType === 'tip' && videoTitle.trim() ? videoTitle.trim() : undefined,
      videoStartTime: donationType === 'tip' && videoUrl.trim() ? Math.max(0, videoStartTime) : undefined,
      videoEndTime: donationType === 'tip' && videoUrl.trim() ? Math.max(videoStartTime + 5, videoEndTime) : undefined,
      isSubscription: donationType === 'subscribe',
      tierId: selectedTier?.id,
      tierName: selectedTier?.name,
      badgeText: selectedTier?.badgeText,
      badgeColor: selectedTier?.badgeColor,
      badgeBg: selectedTier?.badgeBg,
      badgeBorder: selectedTier?.badgeBorder,
      badgeIcon: selectedTier?.badgeIcon,
      badgeGifUrl: selectedTier?.badgeGifUrl || selectedTier?.badgeImage,
      badgeImage: selectedTier?.badgeImage || selectedTier?.badgeGifUrl
    });
  };

  const isEligibleTTS = amount >= (streamer.ttsMinAmount || 2);
  const totalClipSeconds = Math.max(5, videoEndTime - videoStartTime);
  const activeVideoId = extractYouTubeId(videoUrl);

  // Check if streamer has a valid live stream video URL configured in My Account
  const validLiveVideoId = extractYouTubeId(streamer.liveStreamUrl || '');
  const isStreamerLive = Boolean(validLiveVideoId);

  // Video alert configuration constraints from streamer settings (unlocked only if streamer is Pro/Admin and enabled)
  const isStreamerPlanUnlocked = (streamer.plan ? streamer.plan.toLowerCase() !== 'free' : false) || Boolean((streamer as any).isAdmin);
  const isVideoAlertsEnabled = isStreamerPlanUnlocked && Boolean(streamer.videoAlertEnabled) && streamer.hasVideoOverlay !== false;
  const videoMinTip = Number(streamer.videoMinTipAmount ?? 1.00);
  const videoMaxDuration = Number(streamer.videoMaxDurationSeconds ?? 300); // up to 5 minutes
  const currentAmountInUsd = currency === 'KHR' ? (amount || 0) / 4000 : (amount || 0);
  const meetsMinTip = true;

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
          {/* Streamer Avatar / Logo - clickable to /tv in a new window only if valid live stream URL is set */}
          {isStreamerLive ? (
            <a
              href={`/tv?=${streamer.username}`}
              target="_blank"
              rel="noopener noreferrer"
              title={`Watch @${streamer.username} live on /tv`}
              className="relative flex-shrink-0 group cursor-pointer transition-transform duration-200 hover:scale-105"
            >
              <div className="w-11 h-11 xs:w-12 xs:h-12 sm:w-14 sm:h-14 rounded-xl p-0.5 bg-gradient-to-tr from-cyan-500 via-indigo-500 to-pink-500 shadow-md group-hover:shadow-cyan-500/40 transition-shadow">
                <img
                  src={streamer.avatarUrl || `https://api.dicebear.com/7.x/bottts/svg?seed=${streamer.username}`}
                  alt={streamer.displayName}
                  className="w-full h-full rounded-[10px] bg-slate-900 object-cover"
                />
              </div>
              <div className="absolute -bottom-1.5 inset-x-0 flex justify-center">
                <span className="px-1.5 py-0.2 rounded-full bg-red-600 group-hover:bg-red-500 text-white font-mono font-bold text-[8px] uppercase tracking-wider flex items-center gap-0.5 shadow transition-colors">
                  <span className="w-1 h-1 rounded-full bg-white animate-pulse" />
                  LIVE
                </span>
              </div>
            </a>
          ) : (
            <div className="relative flex-shrink-0">
              <div className="w-11 h-11 xs:w-12 xs:h-12 sm:w-14 sm:h-14 rounded-xl p-0.5 bg-gradient-to-tr from-cyan-500 via-indigo-500 to-pink-500 shadow-md">
                <img
                  src={streamer.avatarUrl || `https://api.dicebear.com/7.x/bottts/svg?seed=${streamer.username}`}
                  alt={streamer.displayName}
                  className="w-full h-full rounded-[10px] bg-slate-900 object-cover"
                />
              </div>
            </div>
          )}

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

        {/* Top Right: Language Switcher EN / KH */}
        <div className="flex items-center shrink-0 ml-2 self-start">
          <div className="inline-flex items-center p-0.5 rounded-xl bg-slate-950 border border-slate-700/80 shadow-sm">
            <button
              type="button"
              onClick={() => handleSwitchLang('en')}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold font-mono transition-all cursor-pointer ${
                lang === 'en'
                  ? 'bg-white text-slate-950 shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
              title="Switch to English"
            >
              EN
            </button>
            <button
              type="button"
              onClick={() => handleSwitchLang('kh')}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold font-mono transition-all cursor-pointer ${
                lang === 'kh'
                  ? 'bg-white text-slate-950 shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
              title="ប្តូរទៅភាសាខ្មែរ (Khmer)"
            >
              KH
            </button>
          </div>
        </div>
      </div>

      {/* Donation Type Switch: One-Time Tip vs Subscribe / Membership */}
      {subscriberSettings?.enabled && subscriberSettings.tiers.length > 0 && (
        <div className="grid grid-cols-2 p-1 bg-slate-950/80 border border-slate-800 rounded-xl gap-1">
          <button
            type="button"
            onClick={() => handleModeChange('tip')}
            className={`flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-bold font-['Chakra_Petch'] transition-all ${
              donationType === 'tip'
                ? 'bg-gradient-to-r from-pink-500/20 to-purple-500/20 text-pink-300 border border-pink-500/40 shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Heart size={14} className={donationType === 'tip' ? 'text-pink-400 fill-pink-400/40' : ''} />
            <span>{DONOR_TRANSLATIONS[lang].oneTimeTip}</span>
          </button>
          <button
            type="button"
            onClick={() => handleModeChange('subscribe')}
            className={`flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-bold font-['Chakra_Petch'] transition-all relative ${
              donationType === 'subscribe'
                ? 'bg-gradient-to-r from-amber-500/20 to-yellow-500/20 text-amber-300 border border-amber-500/40 shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Crown size={14} className={donationType === 'subscribe' ? 'text-amber-400' : ''} />
            <span>{DONOR_TRANSLATIONS[lang].subscribe}</span>
            <span className="text-[9px] px-1 py-0.2 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40 font-mono">
              {DONOR_TRANSLATIONS[lang].vipBadge}
            </span>
          </button>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* MEMBERSHIP TIERS (Rendered in Subscribe Mode) */}
        {donationType === 'subscribe' && subscriberSettings?.tiers && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-[11px] font-bold uppercase tracking-wider text-amber-400 font-['Chakra_Petch'] flex items-center gap-1.5">
                <Crown size={14} className="text-amber-400" />
                <span>{DONOR_TRANSLATIONS[lang].selectTier}</span>
              </label>
              <span className="text-[10px] font-mono text-slate-400">{DONOR_TRANSLATIONS[lang].activeBadge}</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              {subscriberSettings.tiers.map((tier) => {
                const isSelected = (selectedTierId || subscriberSettings.tiers[0].id) === tier.id;
                const IconComp = getBadgeIconComponent(tier.badgeIcon);
                const formattedPrice = tier.currency === 'KHR'
                  ? `${tier.price.toLocaleString()} ៛`
                  : `$${tier.price.toFixed(2)}`;

                return (
                  <div
                    key={tier.id}
                    onClick={() => handleSelectTier(tier)}
                    className={`p-3 rounded-xl border cursor-pointer transition-all flex flex-col justify-between text-left relative ${
                      isSelected
                        ? 'bg-gradient-to-b from-amber-500/10 to-amber-950/20 border-amber-400 shadow-[0_0_15px_rgba(245,158,11,0.2)]'
                        : 'bg-slate-950/70 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-white font-['Chakra_Petch'] truncate">
                          {tier.name}
                        </span>
                        <div className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center ${
                          isSelected ? 'border-amber-400 bg-amber-400 text-slate-950' : 'border-slate-600'
                        }`}>
                          {isSelected && <Check size={10} className="stroke-[3]" />}
                        </div>
                      </div>

                      <div className="text-sm font-extrabold text-amber-400 font-mono">
                        {formattedPrice} <span className="text-[10px] text-slate-400 font-normal">/mo</span>
                      </div>

                      {/* Live Vector Badge */}
                      <div>
                        <div
                          className="inline-flex items-center gap-1.5 text-xs font-bold font-mono tracking-wider"
                          style={{
                            color: tier.badgeColor || '#00F0FF'
                          }}
                        >
                          {tier.badgeImage || tier.badgeGifUrl ? (
                            <img
                              src={tier.badgeImage || tier.badgeGifUrl}
                              alt="Badge"
                              className="w-3.5 h-3.5 object-contain flex-shrink-0"
                            />
                          ) : (
                            <IconComp
                              className="w-3.5 h-3.5 flex-shrink-0"
                              style={{ color: tier.badgeColor || '#00F0FF' }}
                            />
                          )}
                          {tier.badgeText ? (
                            <span className="truncate max-w-[90px]">{tier.badgeText}</span>
                          ) : null}
                        </div>
                      </div>

                      {/* Perks */}
                      {tier.perks && tier.perks.length > 0 && (
                        <ul className="text-[10px] text-slate-400 space-y-1 pt-1.5 border-t border-slate-800/80">
                          {tier.perks.slice(0, 3).map((perk, idx) => (
                            <li key={idx} className="flex items-center gap-1 truncate">
                              <span className="text-amber-400">✓</span> {perk}
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="p-2.5 bg-amber-500/10 border border-amber-500/20 rounded-lg flex items-center gap-2 text-[11px] text-amber-300 font-mono">
              <Crown size={14} className="text-amber-400 shrink-0" />
              <span>{DONOR_TRANSLATIONS[lang].vipNotice}</span>
            </div>
          </div>
        )}

        {/* Row with Username & Bank Name (All input field icons removed, pure white styling) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {/* FIELD 1: Username / YouTube Account Name */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold uppercase tracking-wider text-white font-['Chakra_Petch'] flex items-center justify-between">
              <span>
                {donationType === 'subscribe' ? DONOR_TRANSLATIONS[lang].youtubeName : DONOR_TRANSLATIONS[lang].username}
              </span>
              <div className="flex items-center gap-2">
                {donationType === 'subscribe' && (
                  <span className="text-[9px] font-mono text-amber-400 bg-amber-500/10 px-1.5 py-0.2 rounded border border-amber-500/20">
                    {DONOR_TRANSLATIONS[lang].matchLiveChat}
                  </span>
                )}
                <span className="text-[10px] font-mono text-slate-400">{donorName.length}/25</span>
              </div>
            </label>
            <input
              type="text"
              required
              maxLength={25}
              placeholder={donationType === 'subscribe' ? DONOR_TRANSLATIONS[lang].youtubePlaceholder : DONOR_TRANSLATIONS[lang].usernamePlaceholder}
              value={donorName}
              onChange={(e) => setDonorName(e.target.value.slice(0, 25))}
              className={`w-full px-3.5 py-2.5 rounded-none bg-slate-950 border text-white text-xs sm:text-sm font-medium focus:outline-none transition-colors placeholder:text-slate-400 ${
                donationType === 'subscribe'
                  ? 'border-amber-500/50 focus:border-white'
                  : 'border-slate-700 focus:border-white'
              }`}
            />
            {donationType === 'subscribe' && (
              <p className="text-[10px] text-amber-300/90 font-mono mt-1 flex items-start gap-1 leading-tight">
                <span>⚡</span>
                <span>{DONOR_TRANSLATIONS[lang].youtubeHelp}</span>
              </p>
            )}
          </div>

          {/* FIELD 2: Payer Name (Bank Account) */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold uppercase tracking-wider text-white font-['Chakra_Petch'] flex items-center justify-between">
              <span>{DONOR_TRANSLATIONS[lang].payerName}</span>
              <span className="text-[10px] font-mono text-slate-400">{bankingName.length}/30</span>
            </label>
            <input
              type="text"
              required
              maxLength={30}
              placeholder={DONOR_TRANSLATIONS[lang].payerPlaceholder}
              value={bankingName}
              onChange={(e) => setBankingName(e.target.value.slice(0, 30))}
              className="w-full px-3.5 py-2.5 rounded-none bg-slate-950 border border-slate-700 text-white text-xs sm:text-sm font-medium focus:outline-none focus:border-white transition-colors placeholder:text-slate-400 uppercase"
            />
          </div>
        </div>

        {/* FIELD 3: Text (Message) */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label className="text-[11px] font-bold uppercase tracking-wider text-white font-['Chakra_Petch']">
              <span>{DONOR_TRANSLATIONS[lang].message}</span>
            </label>
            <span className="text-[10px] font-mono text-slate-400">{donorMessage.length}/200</span>
          </div>

          <textarea
            rows={2}
            maxLength={200}
            placeholder={DONOR_TRANSLATIONS[lang].messagePlaceholder}
            value={donorMessage}
            onChange={(e) => setDonorMessage(e.target.value.slice(0, 200))}
            className="w-full p-3 rounded-none bg-slate-950 border border-slate-700 text-white text-xs sm:text-sm focus:outline-none focus:border-white transition-colors resize-none placeholder:text-slate-400 leading-relaxed"
          />
        </div>

        {/* FIELD 4: Video URL (Media Share) - Direct unlocked input with [Required $1.00] */}
        {isVideoAlertsEnabled && donationType === 'tip' && (
          <div className="space-y-2">
            <div className="flex items-start sm:items-center justify-between gap-2">
              <label className="text-[11px] font-bold uppercase tracking-wider text-white font-['Chakra_Petch'] flex flex-wrap items-center gap-x-1.5 gap-y-0.5 min-w-0">
                <span>{DONOR_TRANSLATIONS[lang].shareMedia}</span>
                <span className="text-red-400 font-mono font-bold text-[10px] sm:text-[11px] normal-case tracking-normal">
                  {DONOR_TRANSLATIONS[lang].requiredTip}
                </span>
              </label>
              <button
                type="button"
                onClick={handleLoadDemoVideo}
                className="text-[10px] font-mono text-cyan-400 hover:text-cyan-300 underline shrink-0 whitespace-nowrap cursor-pointer"
              >
                {DONOR_TRANSLATIONS[lang].tryDemo}
              </button>
            </div>

            <div className="relative">
              <input
                type="url"
                placeholder={DONOR_TRANSLATIONS[lang].videoPlaceholder}
                value={videoUrl}
                onChange={handleVideoUrlChange}
                className="w-full px-3.5 py-2.5 pr-14 rounded-none bg-slate-950 border border-slate-700 text-white text-xs sm:text-sm font-medium focus:outline-none focus:border-white transition-colors placeholder:text-slate-400"
              />
              {videoUrl && (
                <button
                  type="button"
                  onClick={handleClearVideo}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-white text-xs transition-colors cursor-pointer"
                >
                  {DONOR_TRANSLATIONS[lang].clear}
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
                  key={previewKey}
                  videoId={activeVideoId}
                  startTime={videoStartTime}
                  endTime={videoEndTime}
                  autoplay={isPlayingPreview && !loading && !isModalOpen}
                  isPaused={Boolean(loading || isModalOpen)}
                  muted={false}
                  videoTitle={videoTitle}
                  donorName={donorName || 'Viewer'}
                  amount={amount}
                  currency={currency}
                  isPreview={true}
                  donorMessage={donorMessage}
                  onPlayStateChange={setIsPlayingPreview}
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
                    setIsPlayingPreview(true);
                    setPreviewKey((k) => k + 1);
                  }}
                />
              </div>
            )}
          </div>
        )}

        {/* Submit CTA Button */}
        <div className="pt-2">
          {(() => {
            const selectedTier = donationType === 'subscribe' && subscriberSettings?.tiers
              ? subscriberSettings.tiers.find((t) => t.id === selectedTierId) || subscriberSettings.tiers[0]
              : null;
            const subPriceLabel = selectedTier
              ? (selectedTier.currency === 'KHR' ? `${selectedTier.price.toLocaleString()} ៛` : `$${selectedTier.price.toFixed(2)}`)
              : '';

            return (
              <Button
                type="submit"
                variant="primary"
                size="lg"
                loading={loading}
                disabled={streamer.isTipConfigured === false ? false : !donorName.trim()}
                onClick={(e) => {
                  if (streamer.isTipConfigured === false) {
                    e.preventDefault();
                    onSetupRequired?.();
                  }
                }}
                className={`w-full py-3.5 text-sm sm:text-base font-bold text-slate-950 rounded-none shadow-lg transition-all font-['Chakra_Petch'] flex items-center justify-center gap-2 ${
                  donationType === 'subscribe'
                    ? 'bg-gradient-to-r from-amber-400 to-yellow-300 hover:from-amber-300 hover:to-yellow-200 shadow-amber-500/20'
                    : 'bg-cyan-400 hover:bg-cyan-300 shadow-cyan-500/20'
                }`}
              >
                {donationType === 'subscribe' ? (
                  <>
                    <Crown size={18} className="fill-slate-950/20" />
                    <span>{DONOR_TRANSLATIONS[lang].subscribeWithKhqr(subPriceLabel)}</span>
                  </>
                ) : (
                  <span>{DONOR_TRANSLATIONS[lang].sendTip}</span>
                )}
              </Button>
            );
          })()}
        </div>
      </form>
    </Card>
  );
};
