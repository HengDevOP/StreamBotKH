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
  Check,
  CreditCard,
  X,
  AlertCircle,
  Disc
} from 'lucide-react';
import { Card } from '../common/Card';
import { Button } from '../common/Button';
import { Modal } from '../common/Modal';
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
  isWheelSpin?: boolean;
  donationType?: 'tip' | 'subscribe' | 'wheel';
  qrImage?: string;
}

import { getBadgeIconComponent } from '../../data/badgeIcons';

interface DonorFormProps {
  streamer: PublicStreamerInfo;
  onSubmit: (data: DonorFormData) => Promise<void>;
  onSetupRequired?: () => void;
  loading?: boolean;
  isModalOpen?: boolean;
  /** Embedded mode (e.g. TV side panel): hides the streamer profile header but keeps the language switch */
  hideHeader?: boolean;
  /** Optional override for the outer Card container classes */
  className?: string;
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
    oneTimeTip: 'Tip',
    subscribe: 'Membership',
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
    termsNotice: 'By continuing, you agree to the',
    termsOfService: 'Terms of Service',
    wheel: 'Wheel',
    spinWheelWithKhqr: (price: string) => `Spin Wheel with Bakong KHQR ${price ? `(${price})` : ''}`,
    subscribeWithKhqr: (price: string) => `Join Membership with Bakong KHQR ${price ? `(${price})` : ''}`,
    loading: 'Generating KHQR...'
  },
  kh: {
    oneTimeTip: 'ឧបត្ថម្ភ (Tip)',
    subscribe: 'ជាវសមាជិក (Membership)',
    wheel: 'កងបង្វិល (Wheel)',
    spinWheelWithKhqr: (price: string) => `បង្វិលកងជាមួយ Bakong KHQR ${price ? `(${price})` : ''}`,
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
    termsNotice: 'តាមរយៈការបន្ត អ្នកយល់ព្រមទទួលយក',
    termsOfService: 'លក្ខខណ្ឌនៃសេវាកម្ម (Terms of Service)',
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

export const DonorForm: React.FC<DonorFormProps> = ({ streamer, onSubmit, onSetupRequired, loading, isModalOpen, hideHeader = false, className }) => {
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
  const khqrItems = Array.isArray(streamer.khqrItems) ? streamer.khqrItems : [];
  const usdKhqrList = khqrItems
    .filter((i) => i.currency === 'USD')
    .sort((a, b) => Number(a.amount) - Number(b.amount));
  const khrKhqrList = khqrItems
    .filter((i) => i.currency === 'KHR')
    .sort((a, b) => Number(a.amount) - Number(b.amount));

  const initialCurrency: 'USD' | 'KHR' =
    usdKhqrList.length > 0 ? 'USD' : khrKhqrList.length > 0 ? 'KHR' : 'USD';
  const initialList = initialCurrency === 'USD' ? usdKhqrList : khrKhqrList;
  const initialItem = initialList.length > 0 ? initialList[0] : null;

  // Donation mode & tier states
  const [donationType, setDonationType] = useState<'tip' | 'subscribe' | 'wheel'>('tip');
  const [subscriberSettings, setSubscriberSettings] = useState<{ enabled: boolean; tiers: SubscriberTier[] } | null>(null);
  const [selectedTierId, setSelectedTierId] = useState<string>('');
  const [wheelSettings, setWheelSettings] = useState<{
    isEnabled: boolean;
    minTipAmount: number;
    spinSoundUrl: string;
    slices: Array<{ id: string; label: string; color: string; percentage?: number }>;
  } | null>(null);
  const [liveVideoSettings, setLiveVideoSettings] = useState<{
    isEnabled: boolean;
    minTipAmount: number;
    maxDurationSeconds: number;
  } | null>(null);

  const [currency, setCurrency] = useState<'USD' | 'KHR'>(initialCurrency);
  const [amount, setAmount] = useState<number>(initialItem ? Number(initialItem.amount) : 0);
  const [selectedKhqrId, setSelectedKhqrId] = useState<string>(initialItem ? initialItem.id : '');
  const [donorName, setDonorName] = useState<string>('');
  const [bankingName, setBankingName] = useState<string>('');
  const [donorMessage, setDonorMessage] = useState<string>('');
  const [showPayerInfoModal, setShowPayerInfoModal] = useState<boolean>(false);
  const [showTermsModal, setShowTermsModal] = useState<boolean>(false);

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

  const handleSelectTipCurrency = (nextCurr: 'USD' | 'KHR') => {
    setCurrency(nextCurr);
    const list = nextCurr === 'USD' ? usdKhqrList : khrKhqrList;
    if (list.length > 0) {
      setAmount(Number(list[0].amount));
      setSelectedKhqrId(list[0].id);
    } else {
      setAmount(0);
      setSelectedKhqrId('');
    }
  };

  // Ensure default active is always the first index of the active currency
  useEffect(() => {
    if (donationType === 'tip') {
      const activeList = currency === 'USD' ? usdKhqrList : khrKhqrList;
      if (activeList.length > 0) {
        const exists = activeList.some((i) => i.id === selectedKhqrId);
        if (!exists) {
          setAmount(Number(activeList[0].amount));
          setSelectedKhqrId(activeList[0].id);
        }
      }
    }
  }, [currency, usdKhqrList, khrKhqrList, donationType, selectedKhqrId]);

  // Fetch streamer subscriber, wheel, and video alert settings
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

    // Fetch streamer wheel settings
    fetch(`/api/streamer/${encodeURIComponent(streamer.username)}/wheel`)
      .then((res) => res.json())
      .then((data) => {
        if (data.success && data.isEnabled && Array.isArray(data.slices) && data.slices.length > 0) {
          setWheelSettings({
            isEnabled: true,
            minTipAmount: Number(data.minTipAmount) || 2.0,
            spinSoundUrl: data.spinSoundUrl || '/sounds/neon-chime.mp3',
            slices: data.slices
          });
        }
      })
      .catch(() => {});

    // Fetch streamer video alert settings ("Minimum Tip to Trigger Video")
    fetch(`/api/streamer/settings/video?username=${encodeURIComponent(streamer.username)}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.success && data.settings) {
          setLiveVideoSettings({
            isEnabled: Boolean(data.settings.isEnabled),
            minTipAmount: Number(data.settings.minTipAmount ?? 2.0),
            maxDurationSeconds: Number(data.settings.maxDurationSeconds ?? 30)
          });
        }
      })
      .catch(() => {});
  }, [streamer?.username]);

  const handleModeChange = (mode: 'tip' | 'subscribe' | 'wheel') => {
    setDonationType(mode);
    if (mode === 'subscribe' && subscriberSettings?.tiers?.length) {
      const activeTier = subscriberSettings.tiers.find((t) => t.id === selectedTierId) || subscriberSettings.tiers[0];
      if (activeTier) {
        setAmount(activeTier.price);
        setCurrency(activeTier.currency || 'USD');
      }
    } else if (mode === 'wheel' && wheelSettings) {
      setAmount(wheelSettings.minTipAmount || 2.0);
      setCurrency('USD');
    } else if (mode === 'tip') {
      const activeList = currency === 'USD' ? usdKhqrList : khrKhqrList;
      const matched = activeList.find((i) => i.id === selectedKhqrId) || activeList[0];
      if (matched) {
        setAmount(Number(matched.amount));
        setCurrency(matched.currency);
        setSelectedKhqrId(matched.id);
      } else {
        setAmount(0);
        setSelectedKhqrId('');
      }
    }
  };

  const handleSelectTier = (tier: SubscriberTier) => {
    setSelectedTierId(tier.id);
    setAmount(tier.price);
    setCurrency(tier.currency || 'USD');
  };

  // 1. Restore draft from localStorage on mount safely (only username and payer name)
  useEffect(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.donorName) setDonorName(parsed.donorName);
        if (parsed.bankingName) setBankingName(parsed.bankingName);
      }
    } catch (e) {
      console.warn('Could not read draft from localStorage', e);
    } finally {
      isLoadedRef.current = true;
    }
  }, [storageKey]);

  // 2. Persist draft to localStorage on changes ONLY after initial load (only username and payer name)
  useEffect(() => {
    if (!isLoadedRef.current) return;
    try {
      const draft = {
        donorName,
        bankingName
      };
      localStorage.setItem(storageKey, JSON.stringify(draft));
    } catch (e) {
      console.warn('Could not persist draft to localStorage', e);
    }
  }, [storageKey, donorName, bankingName]);

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
      if (vDur && vDur > 0 && vDur < 30) {
        setVideoStartTime(0);
        setVideoEndTime(vDur);
      } else {
        const defaultDur = Math.min(videoMaxDuration, data.defaultDuration || 30);
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
    lastFetchedUrl.current = '';
    setIsPlayingPreview(true);
    setPreviewKey((k) => k + 1);
    void fetchYoutubeDetails(DEMO_YOUTUBE_URL);
  };

  const handleResetForm = () => {
    setDonorName('');
    setBankingName('');
    const activeList = currency === 'USD' ? usdKhqrList : khrKhqrList;
    if (activeList.length > 0) {
      setAmount(Number(activeList[0].amount));
      setSelectedKhqrId(activeList[0].id);
    } else {
      setAmount(0);
      setSelectedKhqrId('');
    }
    setDonorMessage('');
    handleClearVideo();
    try {
      localStorage.removeItem(storageKey);
    } catch (e) {}
  };

  // Auto pause preview playback when viewer clicks Tip to show Bakong KHQR modal or info modal
  useEffect(() => {
    if (loading || isModalOpen || showPayerInfoModal) {
      setIsPlayingPreview(false);
    }
  }, [loading, isModalOpen, showPayerInfoModal]);

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

    // Prevent proceeding if user has not selected any amount in Tip mode
    if (donationType === 'tip' && (amount <= 0 || (khqrItems.length > 0 && !selectedKhqrId))) {
      return;
    }

    // Auto pause preview video immediately when viewer clicks Tip to show Bakong KHQR modal
    setIsPlayingPreview(false);

    const selectedTier = donationType === 'subscribe' && subscriberSettings?.tiers
      ? subscriberSettings.tiers.find((t) => t.id === selectedTierId) || subscriberSettings.tiers[0]
      : null;

    const finalAmount = donationType === 'subscribe' && selectedTier
      ? selectedTier.price
      : donationType === 'wheel' && wheelSettings
      ? (wheelSettings.minTipAmount || 2.0)
      : (amount || 0);

    if (!finalAmount || finalAmount <= 0) {
      return;
    }

    const finalCurrency = donationType === 'subscribe' && selectedTier
      ? (selectedTier.currency || 'USD')
      : donationType === 'wheel'
      ? 'USD'
      : (currency || 'USD');

    const activeKhqrList = finalCurrency === 'USD' ? usdKhqrList : khrKhqrList;
    const matchedKhqrItem =
      donationType === 'tip'
        ? activeKhqrList.find((i) => i.id === selectedKhqrId) ||
          activeKhqrList.find((i) => Math.abs(Number(i.amount) - finalAmount) < 0.001)
        : null;
    const resolvedFinalAmount = finalAmount;

    // Show donor username on alerts and TTS, and pass bankingName for bank payment matching
    await onSubmit({
      donorName: cleanDonor || cleanBanking || 'Supporter',
      bankingName: cleanBanking || cleanDonor,
      donorMessage: donorMessage.trim(),
      amount: resolvedFinalAmount,
      currency: finalCurrency,
      qrImage: matchedKhqrItem?.imageUrl || undefined,
      videoUrl: donationType === 'tip' && meetsMinTip && videoUrl.trim() ? videoUrl.trim() : undefined,
      videoTitle: donationType === 'tip' && meetsMinTip && videoTitle.trim() ? videoTitle.trim() : undefined,
      videoStartTime: donationType === 'tip' && meetsMinTip && videoUrl.trim() ? Math.max(0, videoStartTime) : undefined,
      videoEndTime: donationType === 'tip' && meetsMinTip && videoUrl.trim() ? Math.max(videoStartTime + 5, videoEndTime) : undefined,
      isSubscription: donationType === 'subscribe',
      isWheelSpin: donationType === 'wheel',
      donationType: donationType,
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

  // Video alert configuration constraints from streamer settings ("Minimum Tip to Trigger Video")
  const isStreamerPlanUnlocked = (streamer.plan ? streamer.plan.toLowerCase() !== 'free' : false) || Boolean((streamer as any).isAdmin);
  const isVideoAlertsEnabled =
    isStreamerPlanUnlocked &&
    Boolean(liveVideoSettings ? liveVideoSettings.isEnabled : streamer.videoAlertEnabled) &&
    streamer.hasVideoOverlay !== false;
  const videoMinTip = Number(liveVideoSettings?.minTipAmount ?? streamer.videoMinTipAmount ?? 2.0);
  const videoMinTipKhr = Math.round(videoMinTip * 4000);
  const videoMaxDuration = Number(liveVideoSettings?.maxDurationSeconds ?? streamer.videoMaxDurationSeconds ?? 300); // up to 5 minutes
  const currentAmountInUsd = currency === 'KHR' ? (amount || 0) / 4000 : (amount || 0);
  const meetsMinTip = amount > 0 && currentAmountInUsd + 0.0001 >= videoMinTip;
  const requiredTipLabel =
    currency === 'KHR'
      ? lang === 'kh'
        ? `[ទាមទារ ${videoMinTipKhr.toLocaleString()} ៛]`
        : `[Required ${videoMinTipKhr.toLocaleString()} ៛]`
      : lang === 'kh'
      ? `[ទាមទារ $${videoMinTip.toFixed(2)}]`
      : `[Required $${videoMinTip.toFixed(2)}]`;

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
    <>
      <Card
        className={
          className ||
          'p-4 xs:p-5 sm:p-6 border border-slate-800 bg-[#0C101C] rounded-2xl shadow-2xl space-y-4 sm:space-y-5 w-full h-full flex flex-col justify-between'
        }
      >
      {/* Embedded mode: compact language switch only (streamer profile is shown by the host page) */}
      {hideHeader && (
        <div className="flex items-center justify-end">
          <div className="inline-flex items-center p-0.5 rounded-xl bg-slate-950 border border-slate-700/80 shadow-sm">
            <button
              type="button"
              onClick={() => handleSwitchLang('en')}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold font-mono transition-all cursor-pointer ${
                lang === 'en' ? 'bg-white text-slate-950 shadow-sm' : 'text-slate-400 hover:text-white'
              }`}
              title="Switch to English"
            >
              EN
            </button>
            <button
              type="button"
              onClick={() => handleSwitchLang('kh')}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold font-mono transition-all cursor-pointer ${
                lang === 'kh' ? 'bg-white text-slate-950 shadow-sm' : 'text-slate-400 hover:text-white'
              }`}
              title="ប្តូរទៅភាសាខ្មែរ (Khmer)"
            >
              KH
            </button>
          </div>
        </div>
      )}

      {/* 1. Streamer Profile & Bio Header */}
      {!hideHeader && (
      <>
        {streamer.bannerUrl && (
          <div className="relative -mx-4 xs:-mx-5 sm:-mx-6 -mt-4 xs:-mt-5 sm:-mt-6 mb-3.5 h-24 sm:h-28 rounded-t-2xl overflow-hidden border-b border-slate-800">
            <img
              src={streamer.bannerUrl}
              alt={`${streamer.displayName} Banner`}
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#0C101C] via-[#0C101C]/25 to-transparent pointer-events-none" />
          </div>
        )}

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
      </>
      )}

      {/* Donation Type Switch: Tip vs Subscribe / Membership vs Wheel */}
      {((subscriberSettings?.enabled && subscriberSettings.tiers.length > 0) || wheelSettings?.isEnabled) && (
        <div
          className={`grid p-1 bg-slate-950/80 border border-slate-800 rounded-xl gap-1 ${
            subscriberSettings?.enabled && subscriberSettings.tiers.length > 0 && wheelSettings?.isEnabled
              ? 'grid-cols-3'
              : 'grid-cols-2'
          }`}
        >
          <button
            type="button"
            onClick={() => handleModeChange('tip')}
            className={`flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-bold font-mono transition-all cursor-pointer ${
              donationType === 'tip'
                ? 'bg-white text-slate-950 shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Heart size={14} className={donationType === 'tip' ? 'text-slate-950 fill-slate-950' : 'text-slate-400'} />
            <span>{DONOR_TRANSLATIONS[lang].oneTimeTip}</span>
          </button>

          {subscriberSettings?.enabled && subscriberSettings.tiers.length > 0 && (
            <button
              type="button"
              onClick={() => handleModeChange('subscribe')}
              className={`flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-bold font-mono transition-all cursor-pointer ${
                donationType === 'subscribe'
                  ? 'bg-white text-slate-950 shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Crown size={14} className={donationType === 'subscribe' ? 'text-slate-950' : 'text-slate-400'} />
              <span>{DONOR_TRANSLATIONS[lang].subscribe}</span>
            </button>
          )}

          {wheelSettings?.isEnabled && (
            <button
              type="button"
              onClick={() => handleModeChange('wheel')}
              className={`flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-bold font-mono transition-all cursor-pointer ${
                donationType === 'wheel'
                  ? 'bg-white text-slate-950 shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Disc size={14} className={donationType === 'wheel' ? 'text-slate-950' : 'text-slate-400'} />
              <span>{DONOR_TRANSLATIONS[lang].wheel}</span>
            </button>
          )}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* MEMBERSHIP TIERS (Rendered in Subscribe Mode) */}
        {donationType === 'subscribe' && subscriberSettings?.tiers && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold uppercase tracking-wider text-amber-400 font-['Chakra_Petch'] flex items-center gap-1.5">
                <Crown size={15} className="text-amber-400" />
                <span>{DONOR_TRANSLATIONS[lang].selectTier}</span>
              </label>
              <span className="text-[10px] font-mono font-semibold text-amber-300/80 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20">
                {DONOR_TRANSLATIONS[lang].activeBadge}
              </span>
            </div>

            {subscriberSettings.tiers.length === 0 ? (
              <div className="p-6 rounded-2xl bg-slate-950/70 border border-dashed border-slate-800 text-center space-y-2">
                <Crown className="w-8 h-8 text-amber-400 mx-auto opacity-50" />
                <p className="text-xs text-slate-300 font-semibold">No membership tiers available at the moment.</p>
                <p className="text-[11px] text-slate-500">The streamer has not configured active membership tiers yet.</p>
              </div>
            ) : (
              <div
                className={`grid gap-3 ${
                  subscriberSettings.tiers.length === 1
                    ? 'grid-cols-1'
                    : subscriberSettings.tiers.length === 2
                    ? 'grid-cols-1 sm:grid-cols-2'
                    : 'grid-cols-1 sm:grid-cols-3'
                }`}
              >
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
                      className={`p-3.5 sm:p-4 rounded-2xl border cursor-pointer transition-all flex flex-col justify-between text-left relative overflow-hidden group ${
                        isSelected
                          ? 'bg-gradient-to-b from-amber-500/20 via-[#151122] to-[#0A0E18] border-amber-400 ring-2 ring-amber-400/40 shadow-[0_0_25px_rgba(245,158,11,0.25)]'
                          : 'bg-slate-950/70 border-slate-800/90 hover:border-slate-700 hover:bg-slate-900/40'
                      }`}
                    >
                      {/* Active Corner Glow */}
                      {isSelected && (
                        <div className="absolute top-0 right-0 w-24 h-24 bg-amber-400/10 blur-2xl pointer-events-none rounded-full" />
                      )}

                      <div className="space-y-2.5">
                        {/* Top: Tier Name & Checkmark */}
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-xs sm:text-sm font-bold text-white font-['Chakra_Petch'] truncate">
                            {tier.name}
                          </span>
                          <div
                            className={`w-4 h-4 rounded-full border flex items-center justify-center flex-shrink-0 transition-colors ${
                              isSelected
                                ? 'border-amber-400 bg-amber-400 text-slate-950 shadow-sm shadow-amber-400/50'
                                : 'border-slate-700 group-hover:border-slate-600'
                            }`}
                          >
                            {isSelected && <Check size={11} className="stroke-[3]" />}
                          </div>
                        </div>

                        {/* Price Display */}
                        <div className="flex items-baseline gap-1">
                          <span className="text-lg sm:text-xl font-black text-amber-400 font-mono tracking-tight">
                            {formattedPrice}
                          </span>
                          <span className="text-[11px] text-slate-400 font-normal">/mo</span>
                        </div>

                        {/* Badge Display Capsule */}
                        <div className="pt-0.5">
                          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-slate-900/90 border border-slate-800 shadow-inner">
                            <span className="text-[9px] font-mono uppercase tracking-wider text-slate-400 font-semibold">
                              Badge:
                            </span>
                            <span
                              className="inline-flex items-center gap-1 text-xs font-bold font-mono tracking-wider truncate max-w-[120px]"
                              style={{ color: tier.badgeColor || '#00F0FF' }}
                            >
                              {tier.badgeImage || tier.badgeGifUrl ? (
                                <img
                                  src={tier.badgeImage || tier.badgeGifUrl}
                                  alt="Badge"
                                  className="w-3.5 h-3.5 object-contain flex-shrink-0 inline-block"
                                />
                              ) : (
                                <IconComp
                                  className="w-3.5 h-3.5 flex-shrink-0 inline-block"
                                  style={{ color: tier.badgeColor || '#00F0FF' }}
                                />
                              )}
                              {tier.badgeText ? <span>{tier.badgeText}</span> : null}
                            </span>
                          </div>
                        </div>

                        {/* Perks */}
                        {tier.perks && tier.perks.length > 0 && (
                          <ul className="text-[11px] text-slate-300 space-y-1 pt-2 border-t border-slate-800/80">
                            {tier.perks.slice(0, 3).map((perk, idx) => (
                              <li key={idx} className="flex items-center gap-1.5 truncate">
                                <span className="text-amber-400 font-bold">✓</span>
                                <span className="truncate">{perk}</span>
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            <div className="p-3 bg-gradient-to-r from-amber-500/15 via-amber-500/5 to-transparent border border-amber-500/30 rounded-xl flex items-center gap-2.5 text-xs text-amber-300 font-mono">
              <Crown size={16} className="text-amber-400 shrink-0" />
              <span className="leading-snug">{DONOR_TRANSLATIONS[lang].vipNotice}</span>
            </div>
          </div>
        )}

        {/* WHEEL REWARDS (Rendered in Wheel Mode) */}
        {donationType === 'wheel' && wheelSettings && (
          <div className="space-y-2">
            <label className="text-[11px] font-bold uppercase tracking-wider text-white font-['Chakra_Petch'] flex flex-wrap items-center gap-x-1.5 gap-y-0.5">
              <span>{lang === 'kh' ? 'រង្វាន់កងបង្វិល' : 'Wheel Rewards'}</span>
              <span className="text-red-400 font-mono font-bold text-[10px] sm:text-[11px] normal-case tracking-normal">
                [{lang === 'kh' ? 'ទាមទារ' : 'Required'} ${wheelSettings.minTipAmount.toFixed(2)}]
              </span>
            </label>

            <p className="text-xs text-slate-400 leading-relaxed">
              {lang === 'kh'
                ? 'ការឧបត្ថម្ភរបស់អ្នកនឹងបង្វិលកងរង្វាន់ដោយស្វ័យប្រវត្តិលើផ្ទាំងផ្សាយផ្ទាល់។'
                : 'Your donation automatically spins the reward wheel live on stream.'}
            </p>

            <div className="flex flex-wrap gap-1.5">
              {wheelSettings.slices.map((slice) => (
                <span
                  key={slice.id}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-slate-950 border border-slate-800 text-xs font-medium text-slate-200"
                >
                  <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: slice.color }} />
                  <span>{slice.label}</span>
                </span>
              ))}
            </div>
          </div>
        )}

        {/* INPUT FORM FIELDS (Responsive: Side-by-side on ONE LINE in both modes) */}
        {donationType === 'subscribe' ? (
          /* ============================================================== */
          /* SUBSCRIBE MODE: RESPONSIVE 2-COLUMN ROW ON ONE LINE            */
          /* ============================================================== */
          <div className="space-y-3">
            {/* 2-COLUMN ROW ON ONE LINE: YouTube Name & Payer Name (Bank Account) */}
            <div className="grid grid-cols-2 gap-2.5 sm:gap-3">
              {/* FIELD 1: YouTube Account Name (for Chat Badge) */}
              <div className="space-y-1.5 min-w-0">
                <label className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-white font-['Chakra_Petch'] flex items-center justify-between gap-1 whitespace-nowrap min-w-0">
                  <span className="truncate flex items-center gap-1">
                    <span>{lang === 'kh' ? 'ឈ្មោះ YouTube' : 'YouTube Name'}</span>
                    <span className="text-amber-400">*</span>
                  </span>
                  <div className="flex items-center gap-1 shrink-0">
                    <span className="text-[8px] sm:text-[9px] font-mono font-bold text-amber-400 bg-amber-500/15 px-1 sm:px-1.5 py-0.2 rounded uppercase">
                      CHAT
                    </span>
                    <span className="text-[9px] sm:text-[10px] font-mono text-slate-400">{donorName.length}/25</span>
                  </div>
                </label>
                <input
                  type="text"
                  required
                  maxLength={25}
                  placeholder={DONOR_TRANSLATIONS[lang].youtubePlaceholder}
                  value={donorName}
                  onChange={(e) => setDonorName(e.target.value.slice(0, 25))}
                  className="w-full px-2.5 sm:px-3.5 py-2 sm:py-2.5 rounded-none bg-slate-950 border border-amber-500/40 text-white text-xs sm:text-sm font-medium focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400/30 transition-all placeholder:text-slate-500"
                />
              </div>

              {/* FIELD 2: Payer Name (Bank Account) */}
              <div className="space-y-1.5 min-w-0">
                <label className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-white font-['Chakra_Petch'] flex items-center justify-between gap-1 whitespace-nowrap min-w-0">
                  <span className="truncate flex items-center gap-1.5 min-w-0" title={DONOR_TRANSLATIONS[lang].payerName}>
                    <span className="truncate">{lang === 'kh' ? 'ឈ្មោះធនាគារ' : 'Payer Name'}</span>{' '}
                    <span className="text-slate-400 font-normal text-[9px] sm:text-[10px] font-sans shrink-0">
                      ({lang === 'kh' ? 'គណនី' : 'Bank'})
                    </span>{' '}
                    <span className="text-amber-400 shrink-0">*</span>
                    <button
                      type="button"
                      onClick={() => setShowPayerInfoModal(true)}
                      className="w-3.5 h-3.5 sm:w-4 sm:h-4 rounded-full border border-rose-500 text-rose-500 hover:text-rose-400 hover:border-rose-400 bg-transparent font-black text-[9px] sm:text-[10px] leading-none inline-flex items-center justify-center shrink-0 cursor-pointer transition-all hover:scale-115 active:scale-95"
                      title={lang === 'kh' ? 'ចុចដើម្បីអានការណែនាំអំពីឈ្មោះម្ចាស់គណនីធនាគារ' : 'Click to learn why Payer Name is required and how it works'}
                    >
                      !
                    </button>
                  </span>
                  <span className="text-[9px] sm:text-[10px] font-mono text-slate-400 shrink-0">{bankingName.length}/30</span>
                </label>
                <input
                  type="text"
                  required
                  maxLength={30}
                  placeholder={DONOR_TRANSLATIONS[lang].payerPlaceholder}
                  value={bankingName}
                  onChange={(e) => setBankingName(e.target.value.slice(0, 30))}
                  className="w-full px-2.5 sm:px-3.5 py-2 sm:py-2.5 rounded-none bg-slate-950 border border-slate-700 text-white text-xs sm:text-sm font-semibold focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400/30 transition-all placeholder:text-slate-500 uppercase"
                />
              </div>
            </div>

            <p className="text-[10px] text-amber-300/90 font-mono mt-0.5 flex items-start gap-1 leading-relaxed">
              <span>⚡</span>
              <span>{DONOR_TRANSLATIONS[lang].youtubeHelp}</span>
            </p>

            {/* FIELD 3: Text (Message) */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold uppercase tracking-wider text-white font-['Chakra_Petch']">
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
                className="w-full p-3 rounded-none bg-slate-950 border border-slate-700 text-white text-xs sm:text-sm focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400/30 transition-all resize-none placeholder:text-slate-500 leading-relaxed"
              />
            </div>
          </div>
        ) : (
          /* ============================================================== */
          /* TIP MODE: FAST 2-COLUMN COMPACT LAYOUT (ONE LINE)              */
          /* ============================================================== */
          <>
            {/* CURRENCY & AMOUNT TAB SWITCH (FROM STREAMER CREATED KHQR) */}
            {khqrItems.length > 0 && (
              <div className="space-y-2">
                {/* Currency Tab Switch Row */}
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-white font-['Chakra_Petch']">
                    {lang === 'kh' ? 'ចំនួនទឹកប្រាក់ (TIP AMOUNT)' : 'TIP AMOUNT'}
                  </span>

                  <div className="inline-flex items-center p-0.5 rounded-xl bg-slate-950 border border-slate-700/80 shadow-sm">
                    {usdKhqrList.length > 0 && (
                      <button
                        type="button"
                        onClick={() => handleSelectTipCurrency('USD')}
                        className={`px-3 py-1 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer ${
                          currency === 'USD'
                            ? 'bg-white text-slate-950 shadow-sm'
                            : 'text-slate-400 hover:text-white border border-transparent'
                        }`}
                      >
                        USD ($)
                      </button>
                    )}

                    {khrKhqrList.length > 0 && (
                      <button
                        type="button"
                        onClick={() => handleSelectTipCurrency('KHR')}
                        className={`px-3 py-1 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer ${
                          currency === 'KHR'
                            ? 'bg-white text-slate-950 shadow-sm'
                            : 'text-slate-400 hover:text-white border border-transparent'
                        }`}
                      >
                        KHR (៛)
                      </button>
                    )}
                  </div>
                </div>

                {/* Amount Tab Switch Grid for Active Currency */}
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-1.5 p-1 bg-slate-950/90 border border-slate-800 rounded-xl">
                  {(currency === 'USD' ? usdKhqrList : khrKhqrList).map((item, idx) => {
                    const isSelected =
                      selectedKhqrId === item.id ||
                      (!selectedKhqrId && idx === 0) ||
                      (!selectedKhqrId && amount > 0 && Math.abs(Number(item.amount) - amount) < 0.001);
                    const formattedAmt =
                      item.currency === 'KHR'
                        ? `${Number(item.amount).toLocaleString()} ៛`
                        : `$${Number(item.amount).toFixed(2)}`;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => {
                          setAmount(Number(item.amount));
                          setCurrency(item.currency);
                          setSelectedKhqrId(item.id);
                        }}
                        className={`py-2 px-2.5 rounded-lg font-mono text-xs font-bold flex items-center justify-center transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-white text-slate-950 shadow-sm'
                            : 'border border-transparent text-slate-400 hover:text-white hover:bg-slate-900/80'
                        }`}
                      >
                        <span>{formattedAmt}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-2.5 sm:gap-3">
              {/* FIELD 1: Username */}
              <div className="space-y-1.5 min-w-0">
                <label className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-white font-['Chakra_Petch'] flex items-center justify-between gap-1 whitespace-nowrap min-w-0">
                  <span className="truncate">
                    <span>{DONOR_TRANSLATIONS[lang].username}</span>
                  </span>
                  <span className="text-[9px] sm:text-[10px] font-mono text-slate-400 shrink-0">{donorName.length}/25</span>
                </label>
                <input
                  type="text"
                  required
                  maxLength={25}
                  placeholder={DONOR_TRANSLATIONS[lang].usernamePlaceholder}
                  value={donorName}
                  onChange={(e) => setDonorName(e.target.value.slice(0, 25))}
                  className="w-full px-2.5 sm:px-3.5 py-2 sm:py-2.5 rounded-none bg-slate-950 border border-slate-700 focus:border-cyan-400 text-white text-xs sm:text-sm font-medium focus:outline-none transition-colors placeholder:text-slate-500"
                />
              </div>

              {/* FIELD 2: Payer Name (Bank Account) */}
              <div className="space-y-1.5 min-w-0">
                <label className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-white font-['Chakra_Petch'] flex items-center justify-between gap-1 whitespace-nowrap min-w-0">
                  <span className="truncate flex items-center gap-1.5 min-w-0" title={DONOR_TRANSLATIONS[lang].payerName}>
                    <span className="truncate">{lang === 'kh' ? 'ឈ្មោះធនាគារ' : 'Payer Name'}</span>{' '}
                    <span className="text-slate-400 font-normal text-[9px] sm:text-[10px] font-sans shrink-0">
                      ({lang === 'kh' ? 'គណនី' : 'Bank'})
                    </span>{' '}
                    <span className="text-cyan-400 shrink-0">*</span>
                    <button
                      type="button"
                      onClick={() => setShowPayerInfoModal(true)}
                      className="w-3.5 h-3.5 sm:w-4 sm:h-4 rounded-full border border-rose-500 text-rose-500 hover:text-rose-400 hover:border-rose-400 bg-transparent font-black text-[9px] sm:text-[10px] leading-none inline-flex items-center justify-center shrink-0 cursor-pointer transition-all hover:scale-115 active:scale-95"
                      title={lang === 'kh' ? 'ចុចដើម្បីអានការណែនាំអំពីឈ្មោះម្ចាស់គណនីធនាគារ' : 'Click to learn why Payer Name is required and how it works'}
                    >
                      !
                    </button>
                  </span>
                  <span className="text-[9px] sm:text-[10px] font-mono text-slate-400 shrink-0">{bankingName.length}/30</span>
                </label>
                <input
                  type="text"
                  required
                  maxLength={30}
                  placeholder={DONOR_TRANSLATIONS[lang].payerPlaceholder}
                  value={bankingName}
                  onChange={(e) => setBankingName(e.target.value.slice(0, 30))}
                  className="w-full px-2.5 sm:px-3.5 py-2 sm:py-2.5 rounded-none bg-slate-950 border border-slate-700 text-white text-xs sm:text-sm font-medium focus:outline-none focus:border-cyan-400 transition-colors placeholder:text-slate-500 uppercase"
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
          </>
        )}

        {/* FIELD 4: Video URL (Media Share) - Blurred with [Required $X.XX] inside URL input until tip >= videoMinTip */}
        {isVideoAlertsEnabled && donationType === 'tip' && (
          <div className="space-y-2">
            <div className="flex items-start sm:items-center justify-between gap-2">
              <label className="text-[11px] font-bold uppercase tracking-wider text-white font-['Chakra_Petch'] flex flex-wrap items-center gap-x-1.5 gap-y-0.5 min-w-0">
                <span>{DONOR_TRANSLATIONS[lang].shareMedia}</span>
              </label>
              {meetsMinTip && (
                <button
                  type="button"
                  onClick={handleLoadDemoVideo}
                  className="text-[10px] font-mono text-cyan-400 hover:text-cyan-300 underline shrink-0 whitespace-nowrap cursor-pointer"
                >
                  {DONOR_TRANSLATIONS[lang].tryDemo}
                </button>
              )}
            </div>

            <div className="relative overflow-hidden">
              <input
                type="url"
                disabled={!meetsMinTip}
                placeholder={DONOR_TRANSLATIONS[lang].videoPlaceholder}
                value={videoUrl}
                onChange={handleVideoUrlChange}
                className={`w-full px-3.5 py-2.5 pr-14 rounded-none bg-slate-950 border border-slate-700 text-white text-xs sm:text-sm font-medium focus:outline-none focus:border-white transition-all placeholder:text-slate-400 ${
                  !meetsMinTip ? 'blur-[2px] opacity-40 select-none cursor-not-allowed' : ''
                }`}
              />
              {!meetsMinTip && (
                <div className="absolute inset-[1px] z-10 bg-slate-950/60 backdrop-blur-[4px] flex items-center justify-center select-none cursor-not-allowed">
                  <span className="text-red-400 font-mono font-bold text-xs sm:text-sm tracking-wide">
                    {requiredTipLabel}
                  </span>
                </div>
              )}
              {meetsMinTip && videoUrl && (
                <button
                  type="button"
                  onClick={handleClearVideo}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-white text-xs transition-colors cursor-pointer"
                >
                  {DONOR_TRANSLATIONS[lang].clear}
                </button>
              )}
            </div>

            {meetsMinTip && videoError && (
              <p className="text-[10px] text-red-400 font-mono">{videoError}</p>
            )}

            {meetsMinTip && videoTitle && (
              <div className="flex items-center gap-2 p-1.5 bg-slate-950/80 border border-slate-800 text-[11px]">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse flex-shrink-0" />
                <span className="text-slate-300 truncate font-medium">{videoTitle}</span>
              </div>
            )}

            {/* Video Preview Player & Scrubber Timeline */}
            {meetsMinTip && activeVideoId && (
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

        {/* Terms of Service Acceptance Notice */}
        <div className="pt-2 text-center">
          <p className="text-[11px] sm:text-xs text-slate-400 font-sans leading-relaxed">
            <span>{DONOR_TRANSLATIONS[lang].termsNotice} </span>
            <button
              type="button"
              onClick={() => setShowTermsModal(true)}
              className="text-white underline hover:text-cyan-300 transition-colors cursor-pointer font-medium"
            >
              {DONOR_TRANSLATIONS[lang].termsOfService}
            </button>
          </p>
        </div>

        {/* Submit CTA Button */}
        <div className="pt-2">
          {(() => {
            const selectedTier = donationType === 'subscribe' && subscriberSettings?.tiers
              ? subscriberSettings.tiers.find((t) => t.id === selectedTierId) || subscriberSettings.tiers[0]
              : null;
            const subPriceLabel = selectedTier
              ? (selectedTier.currency === 'KHR' ? `${selectedTier.price.toLocaleString()} ៛` : `$${selectedTier.price.toFixed(2)}`)
              : '';

            const hasSelectedAmount =
              donationType === 'subscribe'
                ? Boolean(selectedTier && selectedTier.price > 0)
                : donationType === 'wheel'
                ? Boolean(wheelSettings && (wheelSettings.minTipAmount || 2) > 0)
                : amount > 0 && (khqrItems.length === 0 || Boolean(selectedKhqrId));

            return (
              <Button
                type="submit"
                variant="primary"
                size="lg"
                loading={loading}
                disabled={
                  streamer.isTipConfigured === false
                    ? false
                    : !donorName.trim() || !bankingName.trim() || !hasSelectedAmount
                }
                onClick={(e) => {
                  if (streamer.isTipConfigured === false) {
                    e.preventDefault();
                    onSetupRequired?.();
                  }
                }}
                className={`w-full py-3.5 text-sm sm:text-base font-bold text-slate-950 rounded-none shadow-lg transition-all font-['Chakra_Petch'] flex items-center justify-center gap-2 ${
                  donationType === 'subscribe'
                    ? 'bg-gradient-to-r from-amber-400 to-yellow-300 hover:from-amber-300 hover:to-yellow-200 shadow-amber-500/20'
                    : donationType === 'wheel'
                    ? 'bg-gradient-to-r from-purple-400 to-pink-400 hover:from-purple-300 hover:to-pink-300 shadow-purple-500/20'
                    : 'bg-cyan-400 hover:bg-cyan-300 shadow-cyan-500/20'
                }`}
              >
                {loading ? (
                  <span>{DONOR_TRANSLATIONS[lang].loading}</span>
                ) : donationType === 'subscribe' ? (
                  <>
                    <Crown size={18} className="fill-slate-950/20" />
                    <span>{DONOR_TRANSLATIONS[lang].subscribeWithKhqr(subPriceLabel)}</span>
                  </>
                ) : donationType === 'wheel' ? (
                  <>
                    <Disc size={18} className="fill-slate-950/20" />
                    <span>
                      {DONOR_TRANSLATIONS[lang].spinWheelWithKhqr(
                        `$${(wheelSettings?.minTipAmount || 2).toFixed(2)}`
                      )}
                    </span>
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

    {/* PAYER NAME INFORMATION & VERIFICATION GUIDE MODAL */}
    {showPayerInfoModal && (
      <Modal
        isOpen={showPayerInfoModal}
        onClose={() => setShowPayerInfoModal(false)}
        title={lang === 'kh' ? 'ការណែនាំអំពីឈ្មោះម្ចាស់គណនីធនាគារ (Payer Name)' : 'Payer Name (Bank Account) Guide'}
        maxWidth="lg"
      >
        <div className="space-y-4 text-white">
          {/* Section 1: What is Payer Name? */}
          <div className="space-y-1.5">
            <h1 className="text-base sm:text-lg font-bold text-white uppercase tracking-wider font-['Chakra_Petch']">
              <span>{lang === 'kh' ? 'តើអ្វីទៅជាឈ្មោះម្ចាស់គណនី (What is Payer Name)?' : 'What is Payer Name?'}</span>
            </h1>
            <p className="text-justify text-xs sm:text-sm text-white leading-relaxed font-sans">
              {lang === 'kh'
                ? 'ឈ្មោះម្ចាស់គណនីធនាគារ (Payer Name) គឺជាឈ្មោះផ្លូវការជាអក្សរឡាតាំងដែលបានចុះឈ្មោះក្នុងកម្មវិធីធនាគារទូរស័ព្ទ ឬកាបូបបាគងរបស់អ្នក (ដូចជា ABA Mobile, ACLEDA, Wing, Canadia, Sathapana ជាដើម)។ ឈ្មោះនេះត្រូវតែជាឈ្មោះពិតប្រាកដដែលបង្ហាញលើគណនីធនាគាររបស់អ្នក មិនមែនជាឈ្មោះហៅក្រៅ ឬឈ្មោះក្នុងហ្គេមឡើយ។'
                : 'Payer Name is your official English / Latin account holder name registered on your Mobile Banking app or Bakong wallet (such as ABA Mobile, ACLEDA, Wing, Canadia, Sathapana, etc.).'}
            </p>
          </div>

          {/* Section 2: How to Provide */}
          <div className="space-y-1.5">
            <h1 className="text-base sm:text-lg font-bold text-white uppercase tracking-wider font-['Chakra_Petch']">
              {lang === 'kh' ? 'របៀបស្វែងរក និងបំពេញ (How to Provide)' : 'How to Provide'}
            </h1>
            <p className="text-justify text-xs sm:text-sm text-white leading-relaxed font-sans">
              {lang === 'kh'
                ? 'ដើម្បីបំពេញបានត្រឹមត្រូវ សូមបើកកម្មវិធីធនាគារទូរស័ព្ទរបស់អ្នកដូចជា ABA Mobile ឬ ACLEDA រួចពិនិត្យមើលឈ្មោះ Profile គណនី ឬកាតនិម្មិតរបស់អ្នកដើម្បីមើលឈ្មោះជាអក្សរឡាតាំង ហើយវាយបញ្ចូលឈ្មោះជាអក្សរឡាតាំងនោះឱ្យដូចគ្នាបេះបិទទៅក្នុងប្រអប់ "ឈ្មោះម្ចាស់គណនីធនាគារ" នៅលើទំព័រឧបត្ថម្ភនេះ។'
                : 'Open your Mobile Banking app (such as ABA Mobile, ACLEDA, or Wing), check your Account Profile or Virtual Card to find your exact Latin account name, and enter that exact spelling into the "Payer Name" field.'}
            </p>
          </div>

          {/* Section 3: How It Works (Instant) */}
          <div className="space-y-1.5">
            <h1 className="text-base sm:text-lg font-bold text-white uppercase tracking-wider font-['Chakra_Petch']">
              {lang === 'kh' ? 'ដំណើរការផ្ទៀងផ្ទាត់ស្វ័យប្រវត្តិ (How It Works)' : 'How It Works (Instant)'}
            </h1>
            <p className="text-justify text-xs sm:text-sm text-white leading-relaxed font-sans">
              {lang === 'kh'
                ? 'នៅពេលអ្នកធ្វើការផ្ទេរប្រាក់តាមរយៈ Bakong KHQR ធនាគាររបស់អ្នកនឹងបញ្ជូនរបាយការណ៍ប្រតិបត្តិការផ្លូវការដែលមានឈ្មោះអ្នកផ្ញើមកកាន់ប្រព័ន្ធ។ ប្រព័ន្ធស្វ័យប្រវត្តិនឹងយកឈ្មោះនោះមកផ្គូផ្គងជាមួយឈ្មោះដែលអ្នកបានបញ្ចូលនៅទីនេះភ្លាមៗ ដើម្បីបញ្ជាក់ការទូទាត់ និងបង្ហាញ Alert ឬផ្ដល់ផ្លាកសមាជិក VIP ក្នុងរយៈពេលត្រឹមតែ 2 វិនាទីប៉ុណ្ណោះ។'
                : 'When you transfer via Bakong KHQR, your bank sends a secure confirmation record containing the sender’s account name. Our automated system matches that name with the Payer Name you entered here to instantly verify your tip or active VIP subscriber badge in under 2 seconds!'}
            </p>
          </div>

          {/* Section 4: Examples: Correct vs Incorrect */}
          <div className="space-y-1.5">
            <h1 className="text-base sm:text-lg font-bold text-white uppercase tracking-wider font-['Chakra_Petch']">
              {lang === 'kh' ? 'ឧទាហរណ៍ជាក់ស្តែង (Examples: Correct vs Incorrect)' : 'Examples: Correct vs Incorrect'}
            </h1>
            <p className="text-justify text-xs sm:text-sm text-white leading-relaxed font-sans">
              {lang === 'kh'
                ? 'ឈ្មោះត្រឹមត្រូវ (ឈ្មោះម្ចាស់គណនីធនាគារពិតប្រាកដ) រួមមាន SOKPHEAK TRA, CHAN SOPHEA ឬ HENG HOK។ ឈ្មោះមិនត្រឹមត្រូវដែលមិនអាចផ្ទៀងផ្ទាត់បានរួមមាន GamerPro99, Sokha <3 ឬ Anonymous។ សូមកុំប្រើប្រាស់ឈ្មោះហៅក្រៅ ឬឈ្មោះគណនីហ្គេម ព្រោះប្រព័ន្ធនឹងមិនអាចផ្ទៀងផ្ទាត់ការទូទាត់បានឡើយ។'
                : 'Correct bank account name examples include SOKPHEAK TRA, CHAN SOPHEA, or HENG HOK. Incorrect examples include GamerPro99, Sokha <3, or Anonymous. Non-bank nicknames will cause automated matching to fail.'}
            </p>
          </div>

          {/* Section 5: Important Note */}
          <div className="space-y-1.5">
            <h1 className="text-base sm:text-lg font-bold text-rose-500 uppercase tracking-wider font-['Chakra_Petch'] flex items-center gap-1.5 border-l-2 border-rose-500 pl-2">
              <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
              <span>{lang === 'kh' ? 'ចំណាំសំខាន់ (Important)' : 'Important'}</span>
            </h1>
            <p className="text-justify text-xs sm:text-sm text-white leading-relaxed font-sans">
              {lang === 'kh'
                ? 'ប្រសិនបើឈ្មោះដែលអ្នកបានបំពេញមិនត្រូវគ្នាជាមួយឈ្មោះម្ចាស់គណនីធនាគារដែលបានផ្ទេរប្រាក់ជាក់ស្តែងទេនោះ ប្រព័ន្ធនឹងមិនអាចផ្ទៀងផ្ទាត់ និងដំណើរការដោយស្វ័យប្រវត្តិបានឡើយ ហើយទាមទារការត្រួតពិនិត្យដោយផ្ទាល់ដៃ។'
                : 'Important: If the entered name does not match the bank transaction sender name, automatic verification cannot proceed and may require manual streamer review.'}
            </p>
          </div>

          {/* Got it button */}
          <div className="pt-2">
            <button
              type="button"
              onClick={() => setShowPayerInfoModal(false)}
              className="w-full py-2.5 sm:py-3 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs sm:text-sm font-mono border border-slate-700 hover:border-slate-600 transition-all cursor-pointer active:scale-98 text-center"
            >
              {lang === 'kh' ? 'យល់ហើយ បន្តទៅមុខទៀត' : 'Got it, Continue'}
            </button>
          </div>
        </div>
      </Modal>
    )}

    {/* TERMS OF SERVICE MODAL */}
    {showTermsModal && (
      <Modal
        isOpen={showTermsModal}
        onClose={() => setShowTermsModal(false)}
        title={lang === 'kh' ? 'លក្ខខណ្ឌនៃសេវាកម្ម (Terms of Service)' : 'Terms of Service'}
        maxWidth="lg"
      >
        <div className="space-y-4 text-white">
          {/* Section 1: Voluntary Support */}
          <div className="space-y-1.5">
            <h1 className="text-base sm:text-lg font-bold text-white uppercase tracking-wider font-['Chakra_Petch']">
              <span>{lang === 'kh' ? '១. ការឧបត្ថម្ភដោយស្ម័គ្រចិត្ត (Voluntary Tip)' : '1. Voluntary Support'}</span>
            </h1>
            <p className="text-justify text-xs sm:text-sm text-slate-300 leading-relaxed font-sans">
              {lang === 'kh'
                ? 'ការផ្ញើប្រាក់ឧបត្ថម្ភ (Tip) ឬការជាវសមាជិក (Subscription) គឺជាការគាំទ្រដោយស្ម័គ្រចិត្តសុទ្ធសាធ ដើម្បីលើកទឹកចិត្តដល់អ្នកបង្កើតមាតិកា (Streamer)។ វាមិនមែនជាការទិញលក់ទំនិញ ឬសេវាកម្មពាណិជ្ជកម្មនោះទេ។'
                : 'Tips, donations, and subscriptions are voluntary contributions made directly to support the content creator. They do not constitute an exchange for physical goods or commercial services.'}
            </p>
          </div>

          {/* Section 2: Non-Refundable Policy */}
          <div className="space-y-1.5">
            <h1 className="text-base sm:text-lg font-bold text-white uppercase tracking-wider font-['Chakra_Petch']">
              <span>{lang === 'kh' ? '២. គោលការណ៍មិនអាចដកប្រាក់វិញ (Non-Refundable Policy)' : '2. Non-Refundable Policy'}</span>
            </h1>
            <p className="text-justify text-xs sm:text-sm text-slate-300 leading-relaxed font-sans">
              {lang === 'kh'
                ? 'រាល់ការទូទាត់ដែលបានផ្ទេរជោគជ័យតាមរយៈ Bakong KHQR គឺមិនអាចធ្វើការបង្វិលប្រាក់ត្រឡប់មកវិញ (Non-refundable) ឬទាមទារសងប្រាក់វិញបានឡើយ។ សូមពិនិត្យមើលចំនួនទឹកប្រាក់ឱ្យបានច្បាស់លាស់មុនពេលបញ្ជាក់ការទូទាត់។'
                : 'All transactions completed via Bakong KHQR are final, non-refundable, and non-reversible. Please carefully verify the transfer amount and recipient before confirming your payment.'}
            </p>
          </div>

          {/* Section 3: Community & Content Guidelines */}
          <div className="space-y-1.5">
            <h1 className="text-base sm:text-lg font-bold text-white uppercase tracking-wider font-['Chakra_Petch']">
              <span>{lang === 'kh' ? '៣. ក្រមសីលធម៌សារ និងវីដេអូ (Content Guidelines)' : '3. Content Guidelines'}</span>
            </h1>
            <p className="text-justify text-xs sm:text-sm text-slate-300 leading-relaxed font-sans">
              {lang === 'kh'
                ? 'សារជូនពរ ឈ្មោះអ្នកឧបត្ថម្ភ និងតំណភ្ជាប់វីដេអូដែលបានចែករំលែក មិនត្រូវមានខ្លឹមសារជេរប្រមាថ អាសអាភាស ការស្អប់ខ្ពើម ការរើសអើង ឬការបំពានច្បាប់ឡើយ។ Streamer មានសិទ្ធិរំលង ឬបញ្ឈប់ការចាក់ផ្សាយសារទាំងឡាយណាដែលល្មើសនឹងគោលការណ៍។'
                : 'Donor messages, usernames, and shared media must not contain hate speech, harassment, pornography, unlawful material, or policy violations. Streamers reserve the right to skip or mute any alerts that breach community rules.'}
            </p>
          </div>

          {/* Section 4: Accurate Payer Information */}
          <div className="space-y-1.5">
            <h1 className="text-base sm:text-lg font-bold text-white uppercase tracking-wider font-['Chakra_Petch']">
              <span>{lang === 'kh' ? '៤. ភាពត្រឹមត្រូវនៃព័ត៌មានគណនី (Payer Information)' : '4. Payer Verification'}</span>
            </h1>
            <p className="text-justify text-xs sm:text-sm text-slate-300 leading-relaxed font-sans">
              {lang === 'kh'
                ? 'អ្នកឧបត្ថម្ភត្រូវទទួលខុសត្រូវក្នុងការបញ្ចូលឈ្មោះម្ចាស់គណនីធនាគារឱ្យត្រូវនឹងឈ្មោះលើគណនីផ្ទេរប្រាក់ជាក់ស្តែង ដើម្បីឱ្យប្រព័ន្ធស្វ័យប្រវត្តិអាចផ្ទៀងផ្ទាត់ និងបង្ហាញការជូនដំណឹងនៅលើផ្ទាំងផ្សាយផ្ទាល់បានភ្លាមៗ។'
                : 'The donor is responsible for providing their accurate bank account holder name matching the transfer record so that automated verification and on-stream alerts can trigger without delay.'}
            </p>
          </div>

          {/* Close / Understood button */}
          <div className="pt-2">
            <button
              type="button"
              onClick={() => setShowTermsModal(false)}
              className="w-full py-2.5 sm:py-3 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs sm:text-sm font-mono border border-slate-700 hover:border-slate-600 transition-all cursor-pointer active:scale-98 text-center"
            >
              {lang === 'kh' ? 'យល់ព្រម និងបិទ (I Understand)' : 'I Understand'}
            </button>
          </div>
        </div>
      </Modal>
    )}
  </>
  );
};
