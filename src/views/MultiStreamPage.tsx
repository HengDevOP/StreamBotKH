'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate, useLocation, useParams, useSearchParams } from 'react-router-dom';
import {
  Monitor,
  Volume2,
  VolumeX,
  Maximize2,
  Minimize2,
  MessageSquare,
  Search,
  Check,
  CheckCircle2,
  DollarSign,
  Zap,
  Lock,
  Unlock,
  RefreshCw,
  Sliders,
  X,
  ArrowLeft,
  ArrowRight,
  ExternalLink,
  Share2,
  Copy,
  Grid,
  Tv,
  Heart,
  Sparkles,
  Send,
  Smile,
  Users,
  Radio,
  ChevronRight,
  ChevronLeft,
  Flame,
  Award,
  Crown,
  Layers,
  Menu,
  Youtube,
  Play,
  AlertCircle,
  AlertTriangle,
  Loader2
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import { useAudio } from '../hooks/useAudio';
import { donationService } from '../services/donationService';
import { CreateDonationResponse } from '../types/donation';
import { BakongKHQRModal } from '../components/donate/BakongKHQRModal';
import { VideoPlayerWithProgressBar } from '../components/common/VideoPlayerWithProgressBar';
import { VideoClipScrubberLine } from '../components/donate/VideoClipScrubberLine';
import { extractYoutubeId } from '../utils/youtube';

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
  videoMinTipAmount?: number;
  videoMaxDurationSeconds?: number;
}

// Default initial database streamer
const DEFAULT_STREAMER: StreamerClient = {
  id: 'streamer_8949c329d7ca4569',
  name: 'SelenuxML',
  username: 'selenuxml',
  avatar: '/uploads/media/1793296449447-a1134a7c.png',
  game: 'Teamfight Tactics',
  viewers: 0,
  isLive: false,
  youtubeId: '',
  tipUsername: 'selenuxml'
};

const INITIAL_STREAMERS: StreamerClient[] = [DEFAULT_STREAMER];

interface ChatMessage {
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

const INITIAL_CHAT_MESSAGES: ChatMessage[] = [
  {
    id: 'm1',
    author: 'tinkersmos',
    message: 'Lek 4 nah tt aii leak 3 tah 🔥',
    time: '22:15'
  },
  {
    id: 'm2',
    author: 'John_C_Smith',
    badge: '#2 Supporter',
    badgeColor: 'bg-purple-600 text-white',
    message: 'Champoin 10K$ top 2 2k$ top 3 1.5k$ top 4 800$ top 5-8 500 top 9-16 250$',
    time: '22:15'
  },
  {
    id: 'm3',
    author: 'KengLukSroul',
    badge: '#1 Top Fan',
    badgeColor: 'bg-pink-600 text-white',
    message: 'លេងល្អណាស់បង 🐬⚡️ ជឿជាក់!',
    time: '22:16'
  },
  {
    id: 'm4',
    author: 'KONNA-j5c',
    message: 'Gm ng dg lek 8 hx may pak 🥰',
    time: '22:16'
  },
  {
    id: 'm5',
    author: 'cho-yun126',
    message: 'mayy jol lg Dak tae challenges oy may dg win hx',
    time: '22:16'
  },
  {
    id: 'm6',
    author: 'TeVin-only',
    message: 'May pak jol dg tae lek 8 yk mg',
    time: '22:17'
  },
  {
    id: 'm7',
    author: 'Kairo-r3f',
    message: 'lek 8 🤣 bos jab trey tv see lek 8 🤣🤣',
    time: '22:17'
  },
  {
    id: 'm8',
    author: 'HourChheangveng',
    message: 'jab lek 8 👑',
    time: '22:18'
  },
  {
    id: 'm9',
    author: 'Sinkongpav.2',
    message: 'May Bach Jol Ig te nh pbak jit nas',
    time: '22:18'
  },
  {
    id: 'm10',
    author: 'Luciddd1',
    badge: 'Top 3',
    badgeColor: 'bg-amber-500 text-slate-950',
    message: 'luy sot 🚀💸',
    time: '22:18',
    isTip: true,
    tipAmount: '$5.00'
  },
  {
    id: 'm11',
    author: 'ahprechha',
    message: 'merl link muy may',
    time: '22:19'
  },
  {
    id: 'm12',
    author: 'GatoZore',
    message: 'TK go go 🐬🐬🐬',
    time: '22:19'
  },
  {
    id: 'm13',
    author: 'Sopheak-smg',
    message: 'Hello may bonh TK fan pi Siem Reap!',
    time: '22:20'
  }
];

export const MultiStreamPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const { username: paramUsername } = useParams<{ username?: string }>();
  const { user } = useAuth();
  const { socket } = useSocket();
  const { playSynthNeonChime } = useAudio();

  // Extract requested streamer username from route /tv?={username}, /tv?user=, or /tv/:username
  const getRequestedUsername = (): string | null => {
    if (paramUsername && paramUsername.trim()) {
      return paramUsername.replace(/^[@=]/, '').trim().toLowerCase();
    }
    const emptyKey = searchParams.get('');
    if (emptyKey && emptyKey.trim()) {
      return emptyKey.replace(/^[@=]/, '').trim().toLowerCase();
    }
    const namedParam =
      searchParams.get('user') ||
      searchParams.get('username') ||
      searchParams.get('streamer') ||
      searchParams.get('channel') ||
      searchParams.get('name');
    if (namedParam && namedParam.trim()) {
      return namedParam.replace(/^[@=]/, '').trim().toLowerCase();
    }
    if (location.search) {
      const raw = location.search.replace(/^\?/, '').trim();
      const first = raw.split('&')[0];
      if (first.startsWith('=')) {
        return first.slice(1).replace(/^@/, '').trim().toLowerCase();
      }
      if (!first.includes('=')) {
        return first.replace(/^@/, '').trim().toLowerCase();
      }
    }
    return null;
  };

  // Streamers List & State
  const [streamers, setStreamers] = useState<StreamerClient[]>(INITIAL_STREAMERS);
  const [selectedStreamer, setSelectedStreamer] = useState<StreamerClient>(INITIAL_STREAMERS[0]);
  const [multiViewIds, setMultiViewIds] = useState<string[]>([INITIAL_STREAMERS[0].id]);
  const [searchQuery, setSearchQuery] = useState('');

  // Side Panel View State ('chat' | 'streamers' | 'tip')
  const [sideTab, setSideTab] = useState<'chat' | 'streamers' | 'tip'>('chat');
  const [isNavMenuOpen, setIsNavMenuOpen] = useState(false);

  // View & Audio Controls
  const [fitScreenMode, setFitScreenMode] = useState<'fit' | 'grid'>('fit');
  const [volume, setVolume] = useState<number>(50);
  const [isMuted, setIsMuted] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(true);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showFullscreenHud, setShowFullscreenHud] = useState(true);
  const [viewportSize, setViewportSize] = useState<{ width: number; height: number }>(() => ({
    width: typeof window !== 'undefined' ? window.innerWidth : 1280,
    height: typeof window !== 'undefined' ? window.innerHeight : 720,
  }));
  const [isLocked, setIsLocked] = useState(false);

  // Stream Quality Options & State
  const QUALITY_OPTIONS = [
    { label: 'Auto', value: 'auto', desc: 'Optimal based on connection' },
    { label: '1080p HD', value: 'hd1080', desc: '1080p60 / FHD' },
    { label: '720p HD', value: 'hd720', desc: '720p60 / HD' },
    { label: '480p', value: 'large', desc: 'Standard definition' },
    { label: '360p', value: 'medium', desc: 'Data saver' },
    { label: '144p', value: 'tiny', desc: 'Lowest data usage' },
  ];
  const [selectedQuality, setSelectedQuality] = useState<string>('auto');
  const [isQualityMenuOpen, setIsQualityMenuOpen] = useState<boolean>(false);
  const [showNativeControls, setShowNativeControls] = useState<boolean>(false);
  const mainStageScrollRef = useRef<HTMLElement | null>(null);
  const recommendedRowRef = useRef<HTMLDivElement | null>(null);
  const [canScrollRecLeft, setCanScrollRecLeft] = useState<boolean>(false);
  const [canScrollRecRight, setCanScrollRecRight] = useState<boolean>(true);
  const videoStageRef = useRef<HTMLDivElement | null>(null);
  const videoIframeRef = useRef<HTMLIFrameElement | null>(null);
  const qualityMenuRef = useRef<HTMLDivElement | null>(null);
  const fullscreenHudTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const isPortraitViewport = viewportSize.height > viewportSize.width;

  const revealFullscreenHud = () => {
    setShowFullscreenHud(true);
    if (fullscreenHudTimerRef.current) {
      clearTimeout(fullscreenHudTimerRef.current);
    }
    fullscreenHudTimerRef.current = setTimeout(() => {
      setShowFullscreenHud(false);
    }, 3500);
  };

  // Track viewport size & orientation changes for horizontal fullscreen rotation
  useEffect(() => {
    const updateViewportSize = () => {
      setViewportSize({
        width: window.innerWidth,
        height: window.innerHeight,
      });
    };

    const handleOrientationChange = () => {
      updateViewportSize();
      // Mobile browsers sometimes update innerWidth/innerHeight slightly after orientationchange
      setTimeout(updateViewportSize, 120);
    };

    updateViewportSize();
    window.addEventListener('resize', updateViewportSize);
    window.addEventListener('orientationchange', handleOrientationChange);
    window.visualViewport?.addEventListener('resize', updateViewportSize);

    return () => {
      window.removeEventListener('resize', updateViewportSize);
      window.removeEventListener('orientationchange', handleOrientationChange);
      window.visualViewport?.removeEventListener('resize', updateViewportSize);
    };
  }, []);

  // Sync fullscreen state with native browser Fullscreen API & Escape key
  useEffect(() => {
    const doc = document as Document & {
      webkitFullscreenElement?: Element | null;
    };

    const handleNativeFullscreenChange = () => {
      setViewportSize({
        width: window.innerWidth,
        height: window.innerHeight,
      });
      const fsEl = doc.fullscreenElement || doc.webkitFullscreenElement;
      if (!fsEl) {
        setIsFullscreen(false);
        try {
          const orientationApi = (window.screen as Screen & {
            orientation?: ScreenOrientation & { unlock?: () => void };
          })?.orientation;
          orientationApi?.unlock?.();
        } catch {}
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isFullscreen) {
        void exitFullscreenMode();
      }
    };

    document.addEventListener('fullscreenchange', handleNativeFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleNativeFullscreenChange);
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('fullscreenchange', handleNativeFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleNativeFullscreenChange);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isFullscreen]);

  useEffect(() => {
    return () => {
      if (fullscreenHudTimerRef.current) {
        clearTimeout(fullscreenHudTimerRef.current);
      }
    };
  }, []);

  const enterFullscreenMode = async () => {
    setIsFullscreen(true);
    setIsQualityMenuOpen(false);
    revealFullscreenHud();

    const el = videoStageRef.current as (HTMLDivElement & {
      webkitRequestFullscreen?: () => Promise<void> | void;
      msRequestFullscreen?: () => Promise<void> | void;
    }) | null;

    if (el) {
      try {
        if (typeof el.requestFullscreen === 'function') {
          await el.requestFullscreen();
        } else if (typeof el.webkitRequestFullscreen === 'function') {
          await el.webkitRequestFullscreen();
        } else if (typeof el.msRequestFullscreen === 'function') {
          await el.msRequestFullscreen();
        }
      } catch {
        // Fallback to CSS fixed fullscreen + horizontal rotation when native Fullscreen API is unavailable
      }
    }

    try {
      const orientationApi = (window.screen as Screen & {
        orientation?: ScreenOrientation & { lock?: (mode: string) => Promise<void> };
      })?.orientation;
      if (orientationApi && typeof orientationApi.lock === 'function') {
        await orientationApi.lock('landscape');
      }
    } catch {
      // Portrait devices without orientation.lock support automatically rotate 90deg via CSS
    }
  };

  const exitFullscreenMode = async () => {
    setIsFullscreen(false);
    if (fullscreenHudTimerRef.current) {
      clearTimeout(fullscreenHudTimerRef.current);
    }

    try {
      const orientationApi = (window.screen as Screen & {
        orientation?: ScreenOrientation & { unlock?: () => void };
      })?.orientation;
      if (orientationApi && typeof orientationApi.unlock === 'function') {
        orientationApi.unlock();
      }
    } catch {}

    const doc = document as Document & {
      webkitFullscreenElement?: Element | null;
      webkitExitFullscreen?: () => Promise<void> | void;
      msExitFullscreen?: () => Promise<void> | void;
    };

    if (doc.fullscreenElement || doc.webkitFullscreenElement) {
      try {
        if (typeof doc.exitFullscreen === 'function') {
          await doc.exitFullscreen();
        } else if (typeof doc.webkitExitFullscreen === 'function') {
          await doc.webkitExitFullscreen();
        } else if (typeof doc.msExitFullscreen === 'function') {
          await doc.msExitFullscreen();
        }
      } catch {}
    }
  };

  const handleToggleFullscreen = () => {
    if (isFullscreen) {
      void exitFullscreenMode();
    } else {
      void enterFullscreenMode();
    }
  };

  // Close quality dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (qualityMenuRef.current && !qualityMenuRef.current.contains(e.target as Node)) {
        setIsQualityMenuOpen(false);
      }
    };
    if (isQualityMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isQualityMenuOpen]);

  // Handle stream quality change via YouTube Iframe API & remounting with vq
  const changeStreamQuality = (qualityKey: string) => {
    setSelectedQuality(qualityKey);
    setIsQualityMenuOpen(false);

    if (videoIframeRef.current && videoIframeRef.current.contentWindow) {
      try {
        // Handshake
        videoIframeRef.current.contentWindow.postMessage(
          JSON.stringify({ event: 'listening' }),
          '*'
        );
        // 1. setPlaybackQuality command
        videoIframeRef.current.contentWindow.postMessage(
          JSON.stringify({
            event: 'command',
            func: 'setPlaybackQuality',
            args: [qualityKey]
          }),
          '*'
        );
        // 2. setPlaybackQualityRange command
        videoIframeRef.current.contentWindow.postMessage(
          JSON.stringify({
            event: 'command',
            func: 'setPlaybackQualityRange',
            args: [qualityKey, qualityKey]
          }),
          '*'
        );
        // 3. loadVideoById with suggestedQuality
        if (selectedStreamer?.youtubeId) {
          videoIframeRef.current.contentWindow.postMessage(
            JSON.stringify({
              event: 'command',
              func: 'loadVideoById',
              args: [{
                videoId: selectedStreamer.youtubeId,
                suggestedQuality: qualityKey
              }]
            }),
            '*'
          );
        }
      } catch (err) {
        console.warn('Error setting stream quality:', err);
      }
    }
  };

  // Chat State
  const [chatMode, setChatMode] = useState<'youtube' | 'room'>('youtube');
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>(INITIAL_CHAT_MESSAGES);
  const [inputMessage, setInputMessage] = useState('');
  const chatScrollRef = useRef<HTMLDivElement | null>(null);

  const embedDomain = useMemo(() => {
    if (typeof window === 'undefined') return 'localhost';
    const host = window.location.hostname;
    return host === '127.0.0.1' ? 'localhost' : host;
  }, []);

  // Tip / Donation Page States (Work like Donation Page)
  const [currency] = useState<'USD' | 'KHR'>('USD');
  const [tipAmount] = useState<string>('5.00');
  const [customAmount] = useState<string>('');
  const [tipDonorName, setTipDonorName] = useState<string>('');
  const [bankingName, setBankingName] = useState<string>('');
  const [tipDonorMessage, setTipDonorMessage] = useState<string>('');

  // Share Media (YouTube Video & Clip Duration) States — Matches Donation Page
  const [videoUrl, setVideoUrl] = useState<string>('');
  const [videoTitle, setVideoTitle] = useState<string>('');
  const [videoDuration, setVideoDuration] = useState<number | undefined>(undefined);
  const [videoStartTime, setVideoStartTime] = useState<number>(0);
  const [videoEndTime, setVideoEndTime] = useState<number>(30);
  const [fetchingVideo, setFetchingVideo] = useState<boolean>(false);
  const [videoError, setVideoError] = useState<string | null>(null);
  const [isPlayingPreview, setIsPlayingPreview] = useState<boolean>(false);
  const [sharePreviewKey, setSharePreviewKey] = useState<number>(0);
  const shareDebounceRef = useRef<NodeJS.Timeout | null>(null);
  const lastFetchedShareUrlRef = useRef<string>('');

  const [submittingTip, setSubmittingTip] = useState<boolean>(false);
  const [activeDonation, setActiveDonation] = useState<CreateDonationResponse | null>(null);
  const [isKHQRModalOpen, setIsKHQRModalOpen] = useState<boolean>(false);
  const [tipSuccess, setTipSuccess] = useState<boolean>(false);
  const [tipTargetStreamer, setTipTargetStreamer] = useState<StreamerClient>(INITIAL_STREAMERS[0]);
  const [copiedLink, setCopiedLink] = useState<boolean>(false);
  const [copiedText, setCopiedText] = useState<string | null>(null);
  const [isUnconfiguredTipModalOpen, setIsUnconfiguredTipModalOpen] = useState<boolean>(false);

  const activeShareVideoId = useMemo(() => extractYoutubeId(videoUrl), [videoUrl]);

  const fetchShareYoutubeDetails = async (url: string) => {
    const trimmed = url.trim();
    if (!trimmed) {
      setVideoTitle('');
      setVideoError(null);
      setIsPlayingPreview(false);
      return;
    }

    const vid = extractYoutubeId(trimmed);
    if (!vid) {
      setVideoError('Please enter a valid YouTube video link');
      setVideoTitle('');
      setIsPlayingPreview(false);
      return;
    }

    if (trimmed === lastFetchedShareUrlRef.current && videoTitle) {
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

      lastFetchedShareUrlRef.current = trimmed;
      setVideoTitle(data.title || `YouTube Video (${vid})`);

      const vDur = data.videoDuration ? Number(data.videoDuration) : undefined;
      setVideoDuration(vDur);

      if (vDur && vDur < 30) {
        setVideoStartTime(0);
        setVideoEndTime(vDur);
      } else {
        const defaultDur = data.defaultDuration || 30;
        setVideoStartTime(0);
        setVideoEndTime(defaultDur);
      }
      setIsPlayingPreview(true);
    } catch {
      setVideoError(null);
      setVideoTitle(`YouTube Video (${vid})`);
      setIsPlayingPreview(true);
    } finally {
      setFetchingVideo(false);
    }
  };

  const handleClearShareVideo = () => {
    setVideoUrl('');
    setVideoTitle('');
    setVideoDuration(undefined);
    setVideoStartTime(0);
    setVideoEndTime(30);
    setVideoError(null);
    setIsPlayingPreview(false);
    lastFetchedShareUrlRef.current = '';
  };

  const handleShareVideoUrlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newUrl = e.target.value;
    setVideoUrl(newUrl);

    if (shareDebounceRef.current) {
      clearTimeout(shareDebounceRef.current);
    }

    if (!newUrl.trim()) {
      handleClearShareVideo();
      return;
    }

    if (extractYoutubeId(newUrl.trim())) {
      setVideoError(null);
      setIsPlayingPreview(true);
    }

    shareDebounceRef.current = setTimeout(() => {
      fetchShareYoutubeDetails(newUrl);
    }, 400);
  };

  const handleLoadDemoShareVideo = () => {
    const demoUrl = 'https://www.youtube.com/watch?v=HSsGnEOFY6U';
    if (shareDebounceRef.current) {
      clearTimeout(shareDebounceRef.current);
    }
    setVideoError(null);
    setVideoUrl(demoUrl);
    setVideoStartTime(0);
    setVideoEndTime(30);
    setIsPlayingPreview(true);
    setSharePreviewKey((k) => k + 1);
    void fetchShareYoutubeDetails(demoUrl);
  };

  // Auto pause Share Media preview when KHQR modal opens, submitting, or switching away from tip tab
  useEffect(() => {
    if (submittingTip || isKHQRModalOpen || sideTab !== 'tip') {
      setIsPlayingPreview(false);
    }
  }, [submittingTip, isKHQRModalOpen, sideTab]);

  // Clamp clip duration boundaries to videoDuration
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

  // Handle escape key and body scroll lock for unconfigured tip popup modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsUnconfiguredTipModalOpen(false);
      }
    };
    if (isUnconfiguredTipModalOpen) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.body.style.overflow = 'unset';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isUnconfiguredTipModalOpen]);

  // Copy Streamer Link (/tv?=${username}) Helper
  const handleCopyStreamLink = (customUsername?: string) => {
    const uname = customUsername || selectedStreamer?.username || '';
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    const shareUrl = uname ? `${origin}/tv?=${uname}` : `${origin}/tv`;

    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(shareUrl).then(() => {
        setCopiedLink(true);
        setTimeout(() => setCopiedLink(false), 2000);
      }).catch(() => {
        fallbackCopyTextToClipboard(shareUrl);
      });
    } else {
      fallbackCopyTextToClipboard(shareUrl);
    }
  };

  const fallbackCopyTextToClipboard = (text: string) => {
    try {
      const textArea = document.createElement('textarea');
      textArea.value = text;
      textArea.style.position = 'fixed';
      textArea.style.top = '0';
      textArea.style.left = '0';
      textArea.style.opacity = '0';
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    } catch (e) {
      console.error('Failed to copy link:', e);
    }
  };

  const handleCopyText = (text: string) => {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(() => {
        setCopiedText(text);
        setTimeout(() => setCopiedText(null), 2000);
      }).catch(() => {
        try {
          const textArea = document.createElement('textarea');
          textArea.value = text;
          textArea.style.position = 'fixed';
          textArea.style.top = '0';
          textArea.style.left = '0';
          textArea.style.opacity = '0';
          document.body.appendChild(textArea);
          textArea.focus();
          textArea.select();
          document.execCommand('copy');
          document.body.removeChild(textArea);
          setCopiedText(text);
          setTimeout(() => setCopiedText(null), 2000);
        } catch (err) {
          console.error(err);
        }
      });
    }
  };

  // Auto-scroll chat to bottom
  useEffect(() => {
    if (chatScrollRef.current) {
      chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
    }
  }, [chatMessages, sideTab]);

  // Periodic simulated realistic live chat activity
  useEffect(() => {
    const samplePool = [
      { author: 'SokhaEsports', message: 'TFT combo so clean 🔥' },
      { author: 'ChhayGaming', message: 'Lek 1 ban ot may? ⚡' },
      { author: 'VannakPro', message: 'Tip Bakong $2.00 check notification bro!' },
      { author: 'DaraKompongCham', message: 'May pak dak hero level 9 mg tv!' },
      { author: 'SreyNeath', message: 'Hi Bong TK from Phnom Penh! ❤️' },
      { author: 'VisalChallenger', message: 'Gg ez win champion tier 👑' }
    ];

    const timer = setInterval(() => {
      const pick = samplePool[Math.floor(Math.random() * samplePool.length)];
      const now = new Date();
      const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

      setChatMessages((prev) => [
        ...prev.slice(-30),
        {
          id: 'sim_' + Date.now(),
          author: pick.author,
          message: pick.message,
          time: timeStr
        }
      ]);
    }, 8000);

    return () => clearInterval(timer);
  }, []);

  // Fetch real registered streamers from real database (/api/streamers)
  useEffect(() => {
    fetch('/api/streamers')
      .then((res) => res.json())
      .then((data) => {
        if (data.success && Array.isArray(data.streamers) && data.streamers.length > 0) {
          const dbStreamers: StreamerClient[] = data.streamers.map((s: any) => ({
            id: s.id || s.username,
            name: s.name || s.displayName || s.username,
            username: s.username,
            avatar: s.avatar || s.avatarUrl || `https://api.dicebear.com/7.x/bottts/svg?seed=${s.username}`,
            bio: s.bio || '',
            isVerified: Boolean(s.isVerified),
            game: s.game || 'Live Broadcast',
            viewers: s.viewers || 0,
            isLive: Boolean(s.isLive),
            youtubeId: s.youtubeId || '',
            videoEmbedUrl: s.videoEmbedUrl,
            tipUsername: s.username,
            isTelegramConnected: s.isTelegramConnected,
            hasTelegramGroup: s.hasTelegramGroup,
            hasMasterKhqr: s.hasMasterKhqr,
            isTipConfigured: s.isTipConfigured,
            videoMinTipAmount: Number(s.videoMinTipAmount ?? 2.0),
            videoMaxDurationSeconds: Number(s.videoMaxDurationSeconds ?? 300)
          }));

          // Active channels list is 100% retrieved from database user accounts
          setStreamers(dbStreamers);

          // Focus requested streamer from route /tv?={username} if present
          const reqUser = getRequestedUsername();
          if (reqUser) {
            const match = dbStreamers.find(
              (s) => s.username.toLowerCase() === reqUser || s.id.toLowerCase() === reqUser
            );
            if (match) {
              setSelectedStreamer(match);
              setTipTargetStreamer(match);
              setMultiViewIds([match.id]);
              return;
            }
          }

          // Otherwise focus first real live database streamer by default
          const firstStreamer = dbStreamers.find((s) => s.isLive) || dbStreamers[0];
          setSelectedStreamer(firstStreamer);
          setTipTargetStreamer(firstStreamer);
          setMultiViewIds([firstStreamer.id]);
        }
      })
      .catch((err) => {
        console.warn('Failed to load real database streamers:', err);
      });
  }, []);

  // Ensure logged-in user's channel account is always included in the active channel list
  useEffect(() => {
    if (!user || !user.username) return;
    setStreamers((prev) => {
      const exists = prev.some((s) => s.username.toLowerCase() === user.username.toLowerCase());
      if (exists) return prev;
      const ytId = extractYoutubeId(user.liveStreamUrl) || '';
      const userChannel: StreamerClient = {
        id: user.userId || user.username,
        name: user.displayName || user.username,
        username: user.username,
        avatar: user.avatarUrl || `https://api.dicebear.com/7.x/bottts/svg?seed=${user.username}`,
        bio: user.bio || '',
        game: 'IRL Gaming & Chat',
        viewers: 0,
        isLive: false,
        youtubeId: ytId,
        tipUsername: user.username
      };
      return [userChannel, ...prev];
    });
  }, [user]);

  // React to URL route changes: /tv?={username} or /tv?user={username} or /tv/:username
  useEffect(() => {
    const reqUser = getRequestedUsername();
    if (!reqUser) return;

    const match = streamers.find(
      (s) => s.username.toLowerCase() === reqUser || s.id.toLowerCase() === reqUser
    );

    if (match) {
      if (selectedStreamer.username.toLowerCase() !== match.username.toLowerCase()) {
        setSelectedStreamer(match);
        setTipTargetStreamer(match);
        setMultiViewIds([match.id]);
      }
    } else {
      // Query profile from database in case streamer isn't in current list
      donationService.getPublicStreamer(reqUser)
        .then((pub) => {
          if (pub) {
            const ytId = pub.youtubeId || extractYoutubeId(pub.liveStreamUrl) || '';
            const loaded: StreamerClient = {
              id: pub.id || pub.username,
              name: pub.displayName || pub.username,
              username: pub.username,
              avatar: pub.avatarUrl || `https://api.dicebear.com/7.x/bottts/svg?seed=${pub.username}`,
              bio: pub.bio || '',
              game: 'Live Broadcast',
              viewers: pub.isLive ? (pub.viewers || 0) : 0,
              isLive: Boolean(pub.isLive),
              youtubeId: ytId,
              tipUsername: pub.username,
              isTelegramConnected: pub.isTelegramConnected,
              hasTelegramGroup: pub.hasTelegramGroup,
              hasMasterKhqr: pub.hasMasterKhqr,
              isTipConfigured: pub.isTipConfigured,
              videoMinTipAmount: Number(pub.videoMinTipAmount ?? 2.0),
              videoMaxDurationSeconds: Number(pub.videoMaxDurationSeconds ?? 300)
            };
            setStreamers((prev) => [loaded, ...prev.filter((p) => p.username.toLowerCase() !== reqUser)]);
            setSelectedStreamer(loaded);
            setTipTargetStreamer(loaded);
            setMultiViewIds([loaded.id]);
          }
        })
        .catch(() => {});
    }
  }, [location.search, paramUsername]);

  // Keep selected streamer's tip & media share requirements fresh when viewing Tip tab
  useEffect(() => {
    const uname = selectedStreamer?.username?.trim();
    if (!uname || sideTab !== 'tip') return;
    let cancelled = false;

    donationService
      .getPublicStreamer(uname)
      .then((pub) => {
        if (cancelled || !pub) return;
        const nextMinTip = Number(pub.videoMinTipAmount ?? 2.0);
        const nextMaxDur = Number(pub.videoMaxDurationSeconds ?? 300);

        setSelectedStreamer((prev) => {
          if (prev.username.toLowerCase() !== uname.toLowerCase()) return prev;
          return {
            ...prev,
            bio: pub.bio !== undefined ? pub.bio : prev.bio,
            isTelegramConnected: pub.isTelegramConnected ?? prev.isTelegramConnected,
            hasTelegramGroup: pub.hasTelegramGroup ?? prev.hasTelegramGroup,
            hasMasterKhqr: pub.hasMasterKhqr ?? prev.hasMasterKhqr,
            isTipConfigured: pub.isTipConfigured ?? prev.isTipConfigured,
            videoMinTipAmount: nextMinTip,
            videoMaxDurationSeconds: nextMaxDur
          };
        });

        setStreamers((prev) =>
          prev.map((s) =>
            s.username.toLowerCase() === uname.toLowerCase()
              ? {
                  ...s,
                  bio: pub.bio !== undefined ? pub.bio : s.bio,
                  isTelegramConnected: pub.isTelegramConnected ?? s.isTelegramConnected,
                  hasTelegramGroup: pub.hasTelegramGroup ?? s.hasTelegramGroup,
                  hasMasterKhqr: pub.hasMasterKhqr ?? s.hasMasterKhqr,
                  isTipConfigured: pub.isTipConfigured ?? s.isTipConfigured,
                  videoMinTipAmount: nextMinTip,
                  videoMaxDurationSeconds: nextMaxDur
                }
              : s
          )
        );
      })
      .catch(() => {});

    return () => {
      cancelled = true;
    };
  }, [selectedStreamer?.username, sideTab]);

  // Real-time WebSocket synchronization for YouTube Live Status & Watching Count
  const watchedYoutubeIdsKey = useMemo(() => {
    const ids = new Set<string>();
    for (const s of streamers) {
      if (s.youtubeId) ids.add(s.youtubeId);
    }
    if (selectedStreamer?.youtubeId) {
      ids.add(selectedStreamer.youtubeId);
    }
    return Array.from(ids).sort().join(',');
  }, [streamers, selectedStreamer?.youtubeId]);

  useEffect(() => {
    if (!socket) return;

    const emitWatchList = () => {
      const videoIds = watchedYoutubeIdsKey ? watchedYoutubeIdsKey.split(',').filter(Boolean) : [];
      socket.emit('tv:watch_youtube', { videoIds });
    };

    emitWatchList();
    socket.on('connect', emitWatchList);

    return () => {
      socket.off('connect', emitWatchList);
    };
  }, [socket, watchedYoutubeIdsKey]);

  useEffect(() => {
    if (!socket) return;

    const onYoutubeStats = (payload: {
      stats?: Record<string, { isLive: boolean; viewers: number }>;
    }) => {
      const statsMap = payload?.stats;
      if (!statsMap) return;

      setStreamers((prev) => {
        let changed = false;
        const next = prev.map((s) => {
          if (!s.youtubeId || !statsMap[s.youtubeId]) return s;
          const st = statsMap[s.youtubeId];
          const nextIsLive = Boolean(st.isLive);
          const nextViewers = nextIsLive ? (st.viewers || 0) : 0;
          if (s.isLive === nextIsLive && s.viewers === nextViewers) return s;
          changed = true;
          return { ...s, isLive: nextIsLive, viewers: nextViewers };
        });
        return changed ? next : prev;
      });

      setSelectedStreamer((prev) => {
        if (!prev?.youtubeId || !statsMap[prev.youtubeId]) return prev;
        const st = statsMap[prev.youtubeId];
        const nextIsLive = Boolean(st.isLive);
        const nextViewers = nextIsLive ? (st.viewers || 0) : 0;
        if (prev.isLive === nextIsLive && prev.viewers === nextViewers) return prev;
        return { ...prev, isLive: nextIsLive, viewers: nextViewers };
      });
    };

    const onStreamerUpdated = (payload: {
      id?: string;
      username: string;
      displayName?: string;
      avatarUrl?: string;
      bio?: string;
      liveStreamUrl: string;
      youtubeId: string;
      isLive: boolean;
      viewers: number;
    }) => {
      if (!payload?.username) return;
      const targetUser = payload.username.toLowerCase();

      setStreamers((prev) =>
        prev.map((s) =>
          s.username.toLowerCase() === targetUser
            ? {
                ...s,
                name: payload.displayName || s.name,
                avatar: payload.avatarUrl || s.avatar,
                bio: payload.bio !== undefined ? payload.bio : s.bio,
                youtubeId: payload.youtubeId || '',
                isLive: Boolean(payload.isLive),
                viewers: payload.isLive ? (payload.viewers || 0) : 0
              }
            : s
        )
      );

      setSelectedStreamer((prev) =>
        prev.username.toLowerCase() === targetUser
          ? {
              ...prev,
              name: payload.displayName || prev.name,
              avatar: payload.avatarUrl || prev.avatar,
              bio: payload.bio !== undefined ? payload.bio : prev.bio,
              youtubeId: payload.youtubeId || '',
              isLive: Boolean(payload.isLive),
              viewers: payload.isLive ? (payload.viewers || 0) : 0
            }
          : prev
      );
    };

    socket.on('tv:youtube_stats', onYoutubeStats);
    socket.on('tv:streamer_updated', onStreamerUpdated);

    return () => {
      socket.off('tv:youtube_stats', onYoutubeStats);
      socket.off('tv:streamer_updated', onStreamerUpdated);
    };
  }, [socket]);

  useEffect(() => {
    return () => {
      socket?.emit('tv:leave');
    };
  }, [socket]);

  // 1. Sort Streamers with LIVE on the very top, followed by view count
  const sortedStreamers = useMemo(() => {
    return [...streamers].sort((a, b) => {
      if (a.isLive !== b.isLive) {
        return a.isLive ? -1 : 1; // Live on top!
      }
      return (b.viewers || 0) - (a.viewers || 0); // Highest viewers next
    });
  }, [streamers]);

  // 2. Filter Streamers by user search
  const filteredStreamers = useMemo(() => {
    if (!searchQuery.trim()) return sortedStreamers;
    const q = searchQuery.toLowerCase().trim();
    return sortedStreamers.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        s.game.toLowerCase().includes(q) ||
        s.username.toLowerCase().includes(q)
    );
  }, [sortedStreamers, searchQuery]);

  const liveStreamersCount = useMemo(() => {
    return streamers.filter((s) => s.isLive).length;
  }, [streamers]);

  const recommendedStreamers = useMemo(() => {
    const others = sortedStreamers.filter(
      (s) => s.id !== selectedStreamer.id && s.username.toLowerCase() !== selectedStreamer.username.toLowerCase()
    );
    return others.length > 0 ? others : sortedStreamers;
  }, [sortedStreamers, selectedStreamer.id, selectedStreamer.username]);

  const handleSelectStreamer = (streamer: StreamerClient) => {
    setSelectedStreamer(streamer);
    setTipTargetStreamer(streamer);
    if (!multiViewIds.includes(streamer.id)) {
      setMultiViewIds([streamer.id]);
    }
    setIsNavMenuOpen(false);
    // Sync the URL route: /tv?={username}
    navigate(`/tv?=${streamer.username}`, { replace: true });
  };

  const handleSelectRecommendedStreamer = (streamer: StreamerClient) => {
    handleSelectStreamer(streamer);
    mainStageScrollRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const updateRecommendedScrollState = () => {
    const el = recommendedRowRef.current;
    if (!el) return;
    setCanScrollRecLeft(el.scrollLeft > 4);
    setCanScrollRecRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 4);
  };

  const scrollRecommendedRow = (direction: 'left' | 'right') => {
    const el = recommendedRowRef.current;
    if (!el) return;
    const step = Math.max(280, Math.round(el.clientWidth * 0.72));
    el.scrollBy({
      left: direction === 'left' ? -step : step,
      behavior: 'smooth'
    });
  };

  useEffect(() => {
    updateRecommendedScrollState();
    const timer = setTimeout(updateRecommendedScrollState, 150);
    window.addEventListener('resize', updateRecommendedScrollState);
    return () => {
      clearTimeout(timer);
      window.removeEventListener('resize', updateRecommendedScrollState);
    };
  }, [recommendedStreamers.length]);

  const handleToggleMultiView = (e: React.MouseEvent, streamerId: string) => {
    e.stopPropagation();
    if (multiViewIds.includes(streamerId)) {
      if (multiViewIds.length > 1) {
        setMultiViewIds(multiViewIds.filter((id) => id !== streamerId));
      }
    } else {
      if (multiViewIds.length < 4) {
        setMultiViewIds([...multiViewIds, streamerId]);
      }
    }
  };

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputMessage.trim()) return;

    const now = new Date();
    const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

    setChatMessages((prev) => [
      ...prev,
      {
        id: 'msg_' + Date.now(),
        author: user?.displayName || user?.username || 'KhmerGamer',
        badge: user?.isAdmin ? 'ADMIN' : 'VIEWER',
        badgeColor: user?.isAdmin ? 'bg-cyan-500 text-slate-950' : 'bg-slate-800 text-slate-300',
        message: inputMessage.trim(),
        time: timeStr
      }
    ]);
    setInputMessage('');
  };

  const handleOpenTipModal = (streamer: StreamerClient) => {
    handleSelectStreamer(streamer);
    setSideTab('tip');
    if (streamer.isTipConfigured === false) {
      setTipTargetStreamer(streamer);
      setIsUnconfiguredTipModalOpen(true);
      return;
    }
    handleProceedToKHQR(undefined, streamer);
  };

  const handleProceedToKHQR = async (e?: React.FormEvent, customTargetStreamer?: StreamerClient) => {
    if (e) e.preventDefault();
    const target = customTargetStreamer || tipTargetStreamer || selectedStreamer;

    // Check if streamer has fully configured GramJS, KHQR image, and monitored group
    if (target.isTipConfigured === false) {
      setTipTargetStreamer(target);
      setIsUnconfiguredTipModalOpen(true);
      return;
    }

    if (target.isTipConfigured === undefined && target.username) {
      try {
        const pub = await donationService.getPublicStreamer(target.username);
        if (pub && pub.isTipConfigured === false) {
          const updated = { ...target, ...pub };
          setTipTargetStreamer(updated);
          setSelectedStreamer((prev) => (prev.id === target.id ? updated : prev));
          setIsUnconfiguredTipModalOpen(true);
          return;
        }
      } catch (e) {}
    }

    setIsPlayingPreview(false);
    setSubmittingTip(true);

    const amountNum = parseFloat(customAmount || tipAmount) || (currency === 'KHR' ? 5000 : 1);
    const donor = tipDonorName.trim() || user?.displayName || user?.username || 'Anonymous Supporter';
    const bank = bankingName.trim() || donor || 'Bakong KHQR';
    const msg = tipDonorMessage.trim() || `Cheering for ${target.name}! 🔥`;
    const cleanShareUrl = activeShareVideoId && videoUrl.trim() ? videoUrl.trim() : '';

    try {
      const res = await donationService.createDonation({
        streamerId: target.id,
        donorName: donor,
        donorMessage: msg,
        amount: amountNum,
        currency: currency,
        bankingName: bank,
        videoUrl: cleanShareUrl || undefined,
        videoTitle: cleanShareUrl && videoTitle.trim() ? videoTitle.trim() : undefined,
        videoStartTime: cleanShareUrl ? Math.max(0, videoStartTime) : undefined,
        videoEndTime: cleanShareUrl ? Math.max(videoStartTime + 5, videoEndTime) : undefined
      });

      setActiveDonation(res);
      setIsKHQRModalOpen(true);
    } catch (err: any) {
      console.warn('Backend donation creation error, using fallback KHQR payload:', err);
      const fallbackId = 'tip_' + Date.now();
      const fallbackPayload = `bakong://khqr?amount=${amountNum}&currency=${currency}&recipient=${target.username}&order=${fallbackId}`;
      const fallbackQr = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(fallbackPayload)}`;
      setActiveDonation({
        donationId: fallbackId,
        amount: amountNum,
        currency: currency,
        bankingName: bank,
        qrString: fallbackPayload,
        qrImage: fallbackQr,
        abaDeepLink: '',
        bakongDeepLink: '',
        expiresInSeconds: 300
      });
      setIsKHQRModalOpen(true);
    } finally {
      setSubmittingTip(false);
    }
  };

  const handlePaymentSuccess = (paidDetails?: any) => {
    setIsKHQRModalOpen(false);
    setTipSuccess(true);
    playSynthNeonChime(0.9);

    const now = new Date();
    const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    const amountNum = paidDetails?.amount || parseFloat(customAmount || tipAmount) || (currency === 'KHR' ? 5000 : 5);
    const formattedAmount = currency === 'KHR' ? `${Number(amountNum).toLocaleString()} ៛` : `$${Number(amountNum).toFixed(2)}`;
    const donor = paidDetails?.donor_name || tipDonorName.trim() || user?.displayName || 'Anonymous Supporter';
    const msg = paidDetails?.donor_message || tipDonorMessage.trim() || `Bakong KHQR Tip Sent to ${selectedStreamer.name}! ⚡️`;

    setChatMessages((prev) => [
      ...prev,
      {
        id: 'tip_' + Date.now(),
        author: donor,
        badge: 'BAKONG TIP',
        badgeColor: 'bg-emerald-500 text-slate-950',
        message: `${msg} ⚡️`,
        time: timeStr,
        isTip: true,
        tipAmount: formattedAmount
      }
    ]);

    setTimeout(() => {
      setTipSuccess(false);
    }, 4000);
  };

  // Reusable Streamer Item Component (Used in Sidebar, NavMenu, and Mobile Tab)
  const renderStreamerItem = (streamer: StreamerClient, showControls = true) => {
    const isSelected = selectedStreamer.id === streamer.id;
    const isInMultiView = multiViewIds.includes(streamer.id);

    return (
      <div
        key={streamer.id}
        onClick={() => handleSelectStreamer(streamer)}
        className={`p-2.5 rounded-xl flex items-center justify-between gap-3 cursor-pointer transition-all border ${
          isSelected
            ? 'bg-slate-800/95 border-emerald-500/60 shadow-lg shadow-emerald-950/40 ring-1 ring-emerald-500/30'
            : 'bg-[#090D18]/60 border-slate-800/60 hover:bg-slate-800/60 hover:border-slate-700'
        }`}
        title={`${streamer.name} • ${streamer.game}`}
      >
        {/* Avatar with Live Indicator */}
        <div className="relative shrink-0">
          <img
            src={streamer.avatar}
            alt={streamer.name}
            className={`w-9 h-9 rounded-full bg-slate-800 object-cover ring-2 ${
              streamer.isLive ? 'ring-emerald-500/70' : 'ring-slate-700 opacity-70'
            }`}
          />
          {streamer.isLive ? (
            <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse ring-2 ring-[#090D18]" />
          ) : (
            <span className="absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full bg-slate-600 ring-2 ring-[#090D18]" />
          )}
        </div>

        {/* Streamer Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="text-xs sm:text-sm font-bold text-white truncate leading-tight">
              {streamer.name}
            </span>
            {user?.username && streamer.username.toLowerCase() === user.username.toLowerCase() && (
              <span className="px-1.5 py-0.2 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 text-[8px] font-mono font-bold uppercase shrink-0">
                You
              </span>
            )}
            {streamer.isLive ? (
              <span className="px-1.5 py-0.2 rounded bg-red-500/20 text-red-400 text-[8px] font-mono font-black shrink-0">
                LIVE
              </span>
            ) : (
              <span className="px-1.5 py-0.2 rounded bg-slate-800 text-slate-500 text-[8px] font-mono font-bold shrink-0">
                OFFLINE
              </span>
            )}
          </div>
          <div className="flex items-center gap-2 mt-0.5 text-[10px] text-slate-400 font-mono truncate">
            <span className="truncate">{streamer.game}</span>
            {streamer.isLive && (
              <span className="text-red-500 font-bold inline-flex items-center gap-1 shrink-0">
                <Users size={11} className="text-red-500 shrink-0" />
                <span>{streamer.viewers.toLocaleString()}</span>
              </span>
            )}
          </div>
        </div>

        {/* Action Controls */}
        {showControls && (
          <div className="flex items-center gap-1.5 shrink-0">
            {/* Multi-view Grid Toggle */}
            <button
              type="button"
              onClick={(e) => handleToggleMultiView(e, streamer.id)}
              className={`p-1.5 rounded-lg text-[10px] font-mono transition-colors ${
                isInMultiView
                  ? 'text-emerald-400 bg-emerald-500/15 border border-emerald-500/30'
                  : 'text-slate-500 hover:text-slate-300 hover:bg-slate-800'
              }`}
              title={isInMultiView ? 'Remove from multi-view' : 'Add to multi-view'}
            >
              <Grid size={13} />
            </button>

            {/* Selection Checkmark */}
            <div
              className={`w-5 h-5 rounded-full flex items-center justify-center transition-all ${
                isSelected
                  ? 'bg-emerald-400 text-slate-950 shadow-[0_0_10px_rgba(16,185,129,0.5)]'
                  : 'border border-slate-700 bg-slate-900/80'
              }`}
            >
              {isSelected && <Check size={12} className="stroke-[3]" />}
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="w-full h-screen h-[100dvh] max-h-[100dvh] overflow-hidden bg-[#060911] text-slate-100 flex flex-col font-sans cursor-default select-text antialiased selection:bg-cyan-500/30 selection:text-white">
      {/* ============================================================== */}
      {/* 1. TOP APPLICATION NAVIGATION BAR                              */}
      {/* ============================================================== */}
      <header className="h-10 sm:h-12 bg-[#090D18] border-b border-slate-800/80 px-2.5 sm:px-4 flex items-center justify-between gap-2 shrink-0 z-30">
        {/* Left: Branding & Broadcast Identity */}
        <div className="flex items-center gap-2 min-w-0">
          <button
            onClick={() => navigate('/')}
            className="flex items-center gap-2 group text-left cursor-pointer focus:outline-none shrink-0"
            title="Return to streambotkh.com"
          >
            <div className="w-7 h-7 rounded-lg bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400 group-hover:scale-105 transition-transform">
              <Tv size={15} />
            </div>
            <span className="text-sm font-extrabold tracking-wider font-['Chakra_Petch'] text-white">
              TV
            </span>
          </button>
        </div>

        {/* Right: Copy Link & Back (Icon Only, Back Button in Red) */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          {/* Copy Streamer Share Link */}
          <button
            onClick={() => handleCopyStreamLink()}
            className={`p-2 rounded-lg border transition-colors cursor-pointer ${
              copiedLink
                ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-300'
                : 'bg-slate-900 border-slate-800 hover:border-slate-700 text-slate-300 hover:text-white'
            }`}
            title={copiedLink ? 'Stream Link Copied!' : `Copy link to /tv?=${selectedStreamer.username}`}
            aria-label="Copy Stream Link"
          >
            {copiedLink ? <Check size={15} className="text-emerald-400" /> : <Copy size={15} />}
          </button>

          {/* Back to Home Button (Red Theme) */}
          <button
            onClick={() => navigate('/')}
            className="p-2 rounded-lg bg-red-500/10 border border-red-500/30 hover:border-red-500/60 hover:bg-red-500/20 text-red-400 hover:text-red-300 transition-colors cursor-pointer shadow-sm"
            title="Back to Home"
            aria-label="Back to Home"
          >
            <ArrowLeft size={15} />
          </button>
        </div>
      </header>

      {/* ============================================================== */}
      {/* 2. SLIDING NAVMENU DRAWER (LISTS ALL STREAMERS SORTED BY LIVE) */}
      {/* ============================================================== */}
      {isNavMenuOpen && (
        <div className="fixed inset-0 z-50 flex">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/80 backdrop-blur-sm transition-opacity"
            onClick={() => setIsNavMenuOpen(false)}
          />

          {/* Sliding Panel */}
          <div className="relative w-80 max-w-[85vw] h-full bg-[#090D18] border-r border-slate-800 flex flex-col shadow-2xl z-50 animate-in slide-in-from-left duration-200">
            {/* Navmenu Header */}
            <div className="h-14 px-4 border-b border-slate-800 flex items-center justify-between bg-[#0B0F19] shrink-0">
              <div className="flex items-center gap-2">
                <Tv size={16} className="text-emerald-400" />
                <h3 className="text-sm font-extrabold text-white font-['Chakra_Petch']">
                  ALL STREAMERS
                </h3>
                <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 text-[10px] font-mono font-bold">
                  {liveStreamersCount} LIVE
                </span>
              </div>
              <button
                onClick={() => setIsNavMenuOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
              >
                <X size={18} />
              </button>
            </div>

            {/* Navmenu Search Bar */}
            <div className="p-3 border-b border-slate-800 bg-[#090D18] shrink-0">
              <div className="relative">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search Streamer..."
                  className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400 font-mono"
                />
              </div>
            </div>

            {/* Navmenu Streamers List (Live sorted to top) */}
            <div className="flex-1 overflow-y-auto p-3 space-y-2">
              <div className="text-[10px] font-mono text-slate-400 uppercase tracking-wider font-bold mb-1">
                Select Stream to Watch ({filteredStreamers.length})
              </div>
              {filteredStreamers.map((streamer) => renderStreamerItem(streamer, true))}
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* 3. MAIN WORKBENCH: FULLY RESPONSIVE DESKTOP & MOBILE LAYOUT    */}
      {/* ============================================================== */}
      <div
        className={`flex-1 flex flex-col lg:flex-row min-h-0 ${
          isFullscreen ? 'overflow-visible' : 'overflow-hidden'
        } relative`}
      >
        {/* ============================================================ */}
        {/* VIDEO BROADCAST STAGE (Top-Left 16:9 Video + 1-Row Carousel) */}
        {/* ============================================================ */}
        <main
          ref={mainStageScrollRef}
          className={`w-full lg:w-[clamp(30rem,calc(((100dvh-21.25rem)*16/9)+1.5rem),calc(100%-20rem))] flex flex-col min-w-0 bg-[#060911] ${
            isFullscreen ? 'overflow-visible' : 'overflow-hidden lg:overflow-y-auto'
          } p-1.5 sm:p-3 gap-1.5 sm:gap-2 shrink-0 lg:flex-none lg:h-full scroll-smooth`}
        >
          {/* Top-Left Responsive 16:9 Video Wrapper */}
          <div className="w-full max-w-[calc((100dvh-18rem)*16/9)] lg:max-w-none mx-auto lg:mx-0 flex flex-col gap-1.5 sm:gap-2 shrink-0">
            {/* 1. Video Player Canvas (True 16:9 aspect-video — Expands & Rotates Horizontally in Fullscreen) */}
            <div
              ref={videoStageRef}
              onMouseMove={() => {
                if (isFullscreen) revealFullscreenHud();
              }}
              onTouchStart={() => {
                if (isFullscreen) revealFullscreenHud();
              }}
              className={
                isFullscreen
                  ? 'fixed inset-0 z-[100] w-full h-full bg-black overflow-hidden flex items-center justify-center'
                  : 'relative w-full aspect-video rounded-xl sm:rounded-2xl bg-[#04060A] border border-slate-800/80 overflow-hidden shadow-2xl flex items-center justify-center shrink-0'
              }
            >
            <div
              className={`relative flex items-center justify-center overflow-hidden ${
                isFullscreen && isPortraitViewport ? 'shrink-0 rotate-90 bg-black' : 'w-full h-full'
              }`}
              style={
                isFullscreen && isPortraitViewport
                  ? { width: `${viewportSize.height}px`, height: `${viewportSize.width}px` }
                  : undefined
              }
            >
            {fitScreenMode === 'grid' && multiViewIds.length > 1 ? (
              /* Multi-Stream Grid Mode */
              <div className="w-full h-full grid grid-cols-1 md:grid-cols-2 gap-2 p-2 overflow-y-auto">
                {multiViewIds.map((id) => {
                  const s = streamers.find((c) => c.id === id) || selectedStreamer;
                  return (
                    <div
                      key={id}
                      onClick={() => setSelectedStreamer(s)}
                      className={`relative rounded-xl overflow-hidden bg-slate-950 border transition-all cursor-pointer flex flex-col ${
                        selectedStreamer.id === id ? 'border-emerald-500 ring-2 ring-emerald-500/30' : 'border-slate-800 hover:border-slate-700'
                      }`}
                    >
                      <div className="relative flex-1 bg-black flex items-center justify-center min-h-[140px] overflow-hidden">
                        {s.isLive && s.youtubeId ? (
                          <iframe
                            src={`https://www.youtube-nocookie.com/embed/${s.youtubeId}?autoplay=1&mute=1&controls=0&modestbranding=1&rel=0&iv_load_policy=3&disablekb=1&playsinline=1`}
                            title={s.name}
                            className="w-[104%] h-[114%] -mt-[2%] -mb-[4%] border-0 pointer-events-none select-none"
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                          />
                        ) : (
                          <div className="w-full h-full flex flex-col items-center justify-center p-2 bg-[#080B14] text-center">
                            <span className="text-[10px] font-mono font-bold text-slate-500">OFFLINE</span>
                          </div>
                        )}
                        <div className="absolute inset-0 z-10 bg-transparent select-none" />
                        <div className="absolute top-2 left-2 px-2 py-0.5 rounded bg-slate-950/80 backdrop-blur-sm border border-slate-800 text-[10px] font-mono text-white flex items-center gap-1.5 z-20">
                          {s.isLive ? (
                            <span className="w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse" />
                          ) : (
                            <span className="w-1.5 h-1.5 rounded-full bg-slate-600" />
                          )}
                          <span>{s.name}</span>
                        </div>
                      </div>
                      <div className="h-8 bg-slate-900/90 px-3 flex items-center justify-between text-xs font-mono">
                        <span className="text-slate-400 truncate">{s.isLive ? s.game : 'Stream Offline'}</span>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedStreamer(s);
                            setTipTargetStreamer(s);
                            setSideTab('tip');
                            if (s.isTipConfigured === false) {
                              setIsUnconfiguredTipModalOpen(true);
                            }
                          }}
                          className="text-[10px] text-emerald-400 hover:underline font-bold flex items-center gap-0.5 cursor-pointer"
                        >
                          <DollarSign size={10} />
                          <span>Tip</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : selectedStreamer.isLive && selectedStreamer.youtubeId ? (
              /* Single Focus View (Continuous Live Stream on Current View without Pause or YouTube Labels) */
              <div className="relative w-full h-full flex items-center justify-center bg-black overflow-hidden select-none">
                {/* 1. Cropped & Scaled Video Player (Hides YouTube top title header and bottom-right logo outside overflow) */}
                <div className="absolute inset-0 overflow-hidden flex items-center justify-center">
                  <iframe
                    ref={videoIframeRef}
                    key={`${selectedStreamer.youtubeId}_${selectedQuality}_${showNativeControls ? 'ctrl' : 'noctrl'}`}
                    onLoad={() => {
                      if (videoIframeRef.current && videoIframeRef.current.contentWindow) {
                        try {
                          videoIframeRef.current.contentWindow.postMessage(
                            JSON.stringify({ event: 'listening' }),
                            '*'
                          );
                          if (selectedQuality !== 'auto') {
                            videoIframeRef.current.contentWindow.postMessage(
                              JSON.stringify({
                                event: 'command',
                                func: 'setPlaybackQuality',
                                args: [selectedQuality]
                              }),
                              '*'
                            );
                            videoIframeRef.current.contentWindow.postMessage(
                              JSON.stringify({
                                event: 'command',
                                func: 'setPlaybackQualityRange',
                                args: [selectedQuality, selectedQuality]
                              }),
                              '*'
                            );
                          }
                        } catch (e) {}
                      }
                    }}
                    src={`https://www.youtube.com/embed/${selectedStreamer.youtubeId}?autoplay=1&mute=${isMuted ? 1 : 0}&controls=${showNativeControls ? 1 : 0}&modestbranding=1&rel=0&iv_load_policy=3&disablekb=1&playsinline=1&enablejsapi=1${
                      typeof window !== 'undefined' ? `&origin=${encodeURIComponent(window.location.origin)}` : ''
                    }${selectedQuality !== 'auto' ? `&vq=${selectedQuality}` : ''}`}
                    title={selectedStreamer.name}
                    className={`border-0 select-none shrink-0 ${
                      showNativeControls
                        ? 'w-full h-full pointer-events-auto'
                        : 'w-[104%] h-[114%] -mt-[2%] -mb-[4%] pointer-events-none'
                    }`}
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  />
                </div>

                {/* 2. Interactive Shield: Disables clicking video to pause it, keeping live on current view */}
                {!showNativeControls && (
                  <div
                    onClick={() => {
                      if (isFullscreen) {
                        if (showFullscreenHud) {
                          setShowFullscreenHud(false);
                        } else {
                          revealFullscreenHud();
                        }
                      }
                    }}
                    onDoubleClick={handleToggleFullscreen}
                    className="absolute inset-0 z-10 bg-transparent select-none cursor-default"
                  />
                )}

                {/* 3. Subtle Corner Gradients: Guarantees YouTube labels and logo are completely hidden (active when native controls off) */}
                {!showNativeControls && (
                  <>
                    <div className="absolute top-0 left-0 right-0 h-10 z-20 pointer-events-none bg-gradient-to-b from-black/85 to-transparent" />
                    <div className="absolute bottom-0 right-0 w-32 h-14 z-20 pointer-events-none bg-gradient-to-t from-black/90 to-transparent" />
                  </>
                )}
              </div>
            ) : (
              /* Streamer Offline Screen */
              <div className="relative w-full h-full flex flex-col items-center justify-center p-6 text-center bg-[#070A12] select-none">
                <div className="relative mb-3">
                  <img
                    src={selectedStreamer.avatar}
                    alt={selectedStreamer.name}
                    className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-slate-900 border-2 border-slate-700 object-cover opacity-80"
                  />
                  <span className="absolute -bottom-1 -right-1 px-2 py-0.5 rounded-full bg-slate-800 border border-slate-700 text-[9px] font-mono font-bold text-slate-400">
                    OFFLINE
                  </span>
                </div>
                <h3 className="text-base sm:text-lg font-bold text-white font-['Chakra_Petch']">
                  {selectedStreamer.name} is Offline
                </h3>
                <p className="text-xs text-slate-400 max-w-sm mt-1 mb-4 font-mono leading-relaxed">
                  {selectedStreamer.youtubeId
                    ? 'The broadcast has ended or is not live right now. Check back when they stream again!'
                    : 'This streamer has not attached an active live stream URL yet.'}
                </p>
                <button
                  type="button"
                  onClick={() => {
                    if (isFullscreen) {
                      void exitFullscreenMode();
                    }
                    setTipTargetStreamer(selectedStreamer);
                    setSideTab('tip');
                    if (selectedStreamer.isTipConfigured === false) {
                      setIsUnconfiguredTipModalOpen(true);
                    }
                  }}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-400 hover:bg-emerald-300 text-slate-950 font-bold text-xs font-mono transition-all cursor-pointer shadow-lg shadow-emerald-500/20"
                >
                  <DollarSign size={14} className="stroke-[3]" />
                  <span>Tip {selectedStreamer.name}</span>
                </button>
              </div>
            )}

            {/* Fullscreen Horizontal HUD & Minimize Button */}
            {isFullscreen && (
              <>
                <div
                  className={`absolute top-3 left-3 sm:top-5 sm:left-5 z-40 flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-950/75 backdrop-blur-md border border-slate-800/80 shadow-xl transition-opacity duration-300 pointer-events-none ${
                    showFullscreenHud ? 'opacity-100' : 'opacity-0'
                  }`}
                >
                  <img
                    src={selectedStreamer.avatar}
                    alt={selectedStreamer.name}
                    className="w-6 h-6 rounded-full bg-slate-800 object-cover ring-1 ring-emerald-500/60"
                  />
                  <span className="text-xs font-bold text-white font-['Chakra_Petch']">
                    @{selectedStreamer.username || selectedStreamer.name}
                  </span>
                  {selectedStreamer.isLive && (
                    <>
                      <span className="text-slate-600 text-[10px]">•</span>
                      <span className="text-red-500 font-bold font-mono text-[11px] flex items-center gap-1">
                        <Users size={12} className="text-red-500 shrink-0" />
                        <span>{selectedStreamer.viewers.toLocaleString()}</span>
                      </span>
                    </>
                  )}
                </div>

                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    void exitFullscreenMode();
                  }}
                  className={`absolute ${
                    showNativeControls ? 'top-3 right-3 sm:top-5 sm:right-5' : 'bottom-3 right-3 sm:bottom-5 sm:right-5'
                  } z-40 p-2.5 rounded-xl bg-slate-950/80 hover:bg-slate-900/95 backdrop-blur-md border border-slate-700/80 hover:border-emerald-400/60 text-white shadow-2xl transition-all duration-300 cursor-pointer flex items-center justify-center ${
                    showFullscreenHud ? 'opacity-100' : 'opacity-50 hover:opacity-100'
                  }`}
                  title="Minimize Video"
                  aria-label="Exit Fullscreen"
                >
                  <Minimize2 size={18} />
                </button>
              </>
            )}
            </div>
          </div>

          {/* 2. Menu Next to Video Screen Bottom */}
          <div className="relative z-30 min-h-[38px] sm:min-h-[46px] py-1 sm:py-1.5 px-2 sm:px-3 rounded-lg sm:rounded-xl bg-[#090D18] border border-slate-800 flex items-center justify-between gap-2 sm:gap-3 shrink-0 shadow-xl select-text cursor-default">
            {/* Left: Streamer Logo, Username & Total Watching only */}
            <div className="flex items-center gap-2 sm:gap-2.5 min-w-0">
              {/* Streamer Logo */}
              <div
                className="relative shrink-0 cursor-pointer"
                onClick={() => setSideTab('streamers')}
                title="Click to view all streamers"
              >
                <img
                  src={selectedStreamer.avatar}
                  alt={selectedStreamer.name}
                  className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-slate-800 object-cover ring-2 ring-emerald-500/60"
                />
                {selectedStreamer.isLive && (
                  <span className="absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full bg-emerald-400 ring-2 ring-[#090D18]" />
                )}
              </div>

              {/* Username & Total Watching only */}
              <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
                <span className="text-[11px] sm:text-sm font-bold text-white font-['Chakra_Petch'] truncate">
                  @{selectedStreamer.username || selectedStreamer.name}
                </span>
                <span className="text-slate-600 text-[10px] sm:text-xs">•</span>
                {selectedStreamer.isLive ? (
                  <span
                    className="text-red-500 font-bold font-mono text-[11px] sm:text-xs flex items-center gap-1 shrink-0"
                    title={`${selectedStreamer.viewers.toLocaleString()} watching`}
                  >
                    <Users size={13} className="text-red-500 shrink-0" />
                    <span>{selectedStreamer.viewers.toLocaleString()}</span>
                  </span>
                ) : (
                  <span className="text-slate-500 font-bold font-mono text-[10px] sm:text-xs flex items-center gap-1 shrink-0">
                    <span className="w-1.5 h-1.5 rounded-full bg-slate-600" />
                    OFFLINE
                  </span>
                )}
              </div>
            </div>

            {/* Right: Quick Action Icons (Quality, Share & Fullscreen) */}
            <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
              {/* Stream Quality Selector Dropdown */}
              <div className="relative" ref={qualityMenuRef}>
                <button
                  type="button"
                  onClick={() => setIsQualityMenuOpen(!isQualityMenuOpen)}
                  className={`flex items-center gap-1 sm:gap-1.5 px-2 sm:px-2.5 py-1 sm:py-1.5 rounded-lg border transition-all cursor-pointer font-mono text-xs ${
                    isQualityMenuOpen
                      ? 'bg-cyan-500/20 border-cyan-500/50 text-cyan-300 ring-1 ring-cyan-500/30'
                      : 'bg-slate-900 border-slate-800 text-slate-300 hover:text-white hover:border-slate-700'
                  }`}
                  title="Choose Stream Quality"
                >
                  <Sliders size={12} className={isQualityMenuOpen ? 'text-cyan-400' : 'text-slate-400'} />
                  <span className="text-[10px] sm:text-[11px] font-bold">
                    {QUALITY_OPTIONS.find((q) => q.value === selectedQuality)?.label.replace(' HD', '') || 'Auto'}
                  </span>
                </button>

                {isQualityMenuOpen && (
                  <div className="absolute bottom-full right-0 mb-2 w-52 rounded-xl bg-[#0B0F1D]/95 backdrop-blur-md border border-slate-700 shadow-2xl p-1.5 z-50 animate-in fade-in zoom-in-95 duration-100 select-none">
                    <div className="px-2.5 py-1.5 border-b border-slate-800 mb-1 flex items-center justify-between">
                      <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400">
                        Stream Quality
                      </span>
                      <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
                    </div>
                    <div className="space-y-0.5">
                      {QUALITY_OPTIONS.map((opt) => {
                        const isSelected = selectedQuality === opt.value;
                        return (
                          <button
                            key={opt.value}
                            type="button"
                            onClick={() => changeStreamQuality(opt.value)}
                            className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-left transition-all cursor-pointer ${
                              isSelected
                                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 font-semibold'
                                : 'text-slate-300 hover:bg-slate-800/70 hover:text-white'
                            }`}
                          >
                            <div className="flex flex-col">
                              <span className="text-xs font-mono font-medium">{opt.label}</span>
                              <span className="text-[9px] text-slate-400 font-mono leading-none">{opt.desc}</span>
                            </div>
                            {isSelected && <Check size={13} className="text-cyan-400 shrink-0 ml-2" />}
                          </button>
                        );
                      })}
                    </div>

                    {/* Optional Native Player Controls Toggle */}
                    <div className="pt-1.5 mt-1 border-t border-slate-800/80">
                      <button
                        type="button"
                        onClick={() => {
                          setShowNativeControls(!showNativeControls);
                          setIsQualityMenuOpen(false);
                        }}
                        className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-left transition-all cursor-pointer ${
                          showNativeControls
                            ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30 font-semibold'
                            : 'text-slate-400 hover:bg-slate-800/70 hover:text-white'
                        }`}
                        title="Toggle YouTube Player Gear & Resolution Menu"
                      >
                        <div className="flex flex-col">
                          <span className="text-[11px] font-mono font-medium">Native Gear Controls</span>
                          <span className="text-[9px] text-slate-500 font-mono leading-none">
                            {showNativeControls ? 'Controls Enabled' : 'Unlock YouTube player bar'}
                          </span>
                        </div>
                        {showNativeControls && <Check size={13} className="text-amber-400 shrink-0 ml-2" />}
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Share / Copy Streamer URL */}
              <button
                onClick={() => handleCopyStreamLink()}
                className={`p-1.5 rounded-lg border transition-colors cursor-pointer ${
                  copiedLink
                    ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-300'
                    : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white hover:border-slate-700'
                }`}
                title={copiedLink ? 'Stream Link Copied!' : `Copy Stream Link (/tv?=${selectedStreamer.username})`}
              >
                {copiedLink ? <Check size={14} className="text-emerald-400" /> : <Share2 size={14} />}
              </button>

              {/* Fullscreen / Minimize Button */}
              <button
                type="button"
                onClick={handleToggleFullscreen}
                className="p-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-400 hover:text-white hover:border-slate-700 transition-colors cursor-pointer"
                title={isFullscreen ? 'Minimize Video' : 'Full Screen (Horizontal)'}
                aria-label={isFullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen'}
              >
                {isFullscreen ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
              </button>
            </div>
          </div>
          </div>

          {/* 3. Desktop Recommended Streamers Section (1-Row Left/Right Scrollable Carousel) */}
          <section className="hidden lg:flex lg:flex-col gap-2 pt-0.5 pb-1 shrink-0 w-full">
            <div className="flex items-center justify-between px-0.5">
              <div className="flex items-center gap-2">
                <Sparkles size={15} className="text-emerald-400" />
                <h2 className="text-sm font-extrabold uppercase tracking-wider text-white font-['Chakra_Petch']">
                  Recommended Streamers
                </h2>
                {recommendedStreamers.some((s) => s.isLive) && (
                  <span className="px-2 py-0.5 rounded-full bg-red-500/15 border border-red-500/30 text-red-400 text-[10px] font-mono font-bold flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse" />
                    {recommendedStreamers.filter((s) => s.isLive).length} LIVE
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => scrollRecommendedRow('left')}
                    disabled={!canScrollRecLeft}
                    className="p-1.5 rounded-lg bg-[#090D18] border border-slate-800 text-slate-300 hover:text-white hover:border-emerald-500/50 disabled:opacity-35 disabled:pointer-events-none transition-colors cursor-pointer"
                    title="Scroll Left"
                    aria-label="Scroll Recommended Streamers Left"
                  >
                    <ChevronLeft size={14} />
                  </button>
                  <button
                    type="button"
                    onClick={() => scrollRecommendedRow('right')}
                    disabled={!canScrollRecRight}
                    className="p-1.5 rounded-lg bg-[#090D18] border border-slate-800 text-slate-300 hover:text-white hover:border-emerald-500/50 disabled:opacity-35 disabled:pointer-events-none transition-colors cursor-pointer"
                    title="Scroll Right"
                    aria-label="Scroll Recommended Streamers Right"
                  >
                    <ChevronRight size={14} />
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => setSideTab('streamers')}
                  className="text-[11px] font-mono text-slate-400 hover:text-emerald-400 flex items-center gap-0.5 transition-colors cursor-pointer pl-1"
                >
                  <span>View All ({streamers.length})</span>
                  <ChevronRight size={13} />
                </button>
              </div>
            </div>

            <div className="relative group/recrow w-full">
              {/* Left Floating Scroll Button */}
              {canScrollRecLeft && (
                <button
                  type="button"
                  onClick={() => scrollRecommendedRow('left')}
                  className="absolute left-2 top-1/2 -translate-y-1/2 z-30 w-9 h-9 rounded-full bg-slate-950/90 hover:bg-emerald-400 text-white hover:text-slate-950 border border-slate-700/80 hover:border-emerald-300 shadow-2xl flex items-center justify-center opacity-0 group-hover/recrow:opacity-100 transition-all duration-200 cursor-pointer"
                  title="Scroll Left"
                  aria-label="Scroll Left"
                >
                  <ChevronLeft size={18} />
                </button>
              )}

              {/* Right Floating Scroll Button */}
              {canScrollRecRight && (
                <button
                  type="button"
                  onClick={() => scrollRecommendedRow('right')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 z-30 w-9 h-9 rounded-full bg-slate-950/90 hover:bg-emerald-400 text-white hover:text-slate-950 border border-slate-700/80 hover:border-emerald-300 shadow-2xl flex items-center justify-center opacity-0 group-hover/recrow:opacity-100 transition-all duration-200 cursor-pointer"
                  title="Scroll Right"
                  aria-label="Scroll Right"
                >
                  <ChevronRight size={18} />
                </button>
              )}

              <div
                ref={recommendedRowRef}
                onScroll={updateRecommendedScrollState}
                className="flex flex-nowrap items-stretch gap-3 overflow-x-auto scroll-smooth snap-x snap-mandatory pb-1 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
              >
                {recommendedStreamers.map((s) => {
                  const isCurrent = selectedStreamer.id === s.id;
                  return (
                    <div
                      key={s.id}
                      role="button"
                      tabIndex={0}
                      onClick={() => handleSelectRecommendedStreamer(s)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          handleSelectRecommendedStreamer(s);
                        }
                      }}
                      className={`group relative w-[195px] xl:w-[210px] shrink-0 snap-start rounded-xl bg-[#090D18] border transition-all duration-200 overflow-hidden cursor-pointer flex flex-col shadow-lg ${
                        isCurrent
                          ? 'border-emerald-500/70 ring-1 ring-emerald-500/30'
                          : 'border-slate-800/80 hover:border-emerald-500/50 hover:bg-[#0C1222] hover:shadow-emerald-950/30'
                      }`}
                      title={`Watch ${s.name} (@${s.username})`}
                    >
                    {/* 16:9 Video Card Preview */}
                    <div className="relative w-full aspect-video bg-gradient-to-br from-[#0B1224] via-[#060913] to-[#0D162B] overflow-hidden flex items-center justify-center select-none">
                      {/* Ambient Avatar Backdrop (Visible when no YouTube thumbnail or while loading) */}
                      <img
                        src={s.avatar}
                        alt=""
                        aria-hidden="true"
                        className="absolute inset-0 w-full h-full object-cover blur-2xl opacity-25 scale-125 pointer-events-none"
                      />
                      <div className="relative z-0 flex flex-col items-center justify-center gap-1.5 opacity-85">
                        <img
                          src={s.avatar}
                          alt={s.name}
                          className="w-11 h-11 rounded-full bg-slate-900 border border-slate-700/80 object-cover shadow-md"
                        />
                        <span className="text-[10px] font-mono text-slate-400">@{s.username}</span>
                      </div>

                      {/* Real YouTube Video / Live Broadcast Thumbnail */}
                      {s.youtubeId && (
                        <img
                          src={`https://i.ytimg.com/vi/${s.youtubeId}/hqdefault.jpg`}
                          alt={`${s.name} stream preview`}
                          loading="lazy"
                          onError={(e) => {
                            (e.currentTarget as HTMLImageElement).style.display = 'none';
                          }}
                          className="absolute inset-0 z-10 w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                      )}

                      {/* Subtle Bottom Readability Gradient */}
                      <div className="absolute inset-x-0 bottom-0 h-12 z-20 bg-gradient-to-t from-black/85 via-black/30 to-transparent pointer-events-none" />

                      {/* Top-Left Live / Offline Status Pill */}
                      <div className="absolute top-2 left-2 z-20">
                        {s.isLive ? (
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

                      {/* Bottom-Left Viewers / Category Pill */}
                      <div className="absolute bottom-2 left-2 right-2 z-20 flex items-center justify-between gap-2 pointer-events-none">
                        {s.isLive ? (
                          <span className="px-2 py-0.5 rounded-md bg-slate-950/85 backdrop-blur-sm border border-red-500/30 text-red-500 text-[10px] font-mono font-bold flex items-center gap-1">
                            <Users size={11} className="text-red-500 shrink-0" />
                            <span>{s.viewers.toLocaleString()}</span>
                          </span>
                        ) : (
                          <span className="text-[10px] font-mono text-slate-300/90 truncate">
                            {s.game}
                          </span>
                        )}
                      </div>

                      {/* Hover Play Video Indicator */}
                      <div className="absolute inset-0 z-30 bg-black/35 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center pointer-events-none">
                        <div className="w-10 h-10 rounded-full bg-emerald-400 text-slate-950 flex items-center justify-center shadow-lg shadow-emerald-500/40 transform scale-90 group-hover:scale-100 transition-transform duration-200">
                          <Play size={18} className="fill-slate-950 ml-0.5" />
                        </div>
                      </div>
                    </div>

                    {/* Video Card Footer Info */}
                    <div className="p-2 flex items-center justify-between gap-2 bg-[#090D18] group-hover:bg-[#0C1222] transition-colors">
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="relative shrink-0">
                          <img
                            src={s.avatar}
                            alt={s.name}
                            className={`w-7 h-7 rounded-full bg-slate-800 object-cover ring-2 ${
                              s.isLive ? 'ring-emerald-500/70' : 'ring-slate-800'
                            }`}
                          />
                          <span
                            className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full ring-2 ring-[#090D18] ${
                              s.isLive ? 'bg-emerald-400' : 'bg-slate-600'
                            }`}
                          />
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-1 min-w-0">
                            <span className="text-xs font-bold text-white font-['Chakra_Petch'] truncate group-hover:text-emerald-300 transition-colors">
                              {s.name}
                            </span>
                            {s.isVerified && (
                              <CheckCircle2 size={12} className="text-emerald-400 shrink-0" />
                            )}
                          </div>
                          <p className="text-[10px] font-mono text-slate-400 truncate">
                            {s.bio || `@${s.username} • ${s.game}`}
                          </p>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSelectRecommendedStreamer(s);
                          setTipTargetStreamer(s);
                          setSideTab('tip');
                          if (s.isTipConfigured === false) {
                            setIsUnconfiguredTipModalOpen(true);
                          }
                        }}
                        className="px-2 py-1 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 text-[10px] font-mono font-bold flex items-center gap-0.5 shrink-0 transition-colors cursor-pointer"
                        title={`Tip ${s.name}`}
                      >
                        <DollarSign size={10} className="stroke-[2.5]" />
                        <span>Tip</span>
                      </button>
                    </div>
                  </div>
                );
              })}
              </div>
            </div>
          </section>
        </main>

        {/* ============================================================ */}
        {/* LIVE CHAT • STREAMER • TIP STREAMER SECTION                  */}
        {/* Responsive: Bottom of video on device size (< lg),          */}
        {/*             Rescales width dynamically next to video (>= lg) */}
        {/* ============================================================ */}
        <aside className="w-full lg:w-auto lg:min-w-[20rem] flex-1 lg:h-full bg-[#090D18] border-t lg:border-t-0 lg:border-l border-slate-800/80 flex flex-col min-h-0 overflow-hidden z-20 shadow-2xl">
          {/* Top Tab Switcher Header (Icons Only) */}
          <div className="h-9 sm:h-11 px-2 sm:px-3 border-b border-slate-800 flex items-center justify-around bg-[#0B0F19] shrink-0">
            <button
              onClick={() => setSideTab('chat')}
              className={`flex-1 py-1 sm:py-2 flex items-center justify-center transition-all border-b-2 cursor-pointer ${
                sideTab === 'chat'
                  ? 'border-cyan-400 text-cyan-300 bg-cyan-500/10'
                  : 'border-transparent text-slate-400 hover:text-white'
              }`}
              title="Live Chat"
              aria-label="Live Chat"
            >
              <MessageSquare size={16} className="sm:w-[18px] sm:h-[18px]" />
            </button>

            <button
              onClick={() => setSideTab('streamers')}
              className={`relative flex-1 py-1 sm:py-2 flex items-center justify-center transition-all border-b-2 cursor-pointer ${
                sideTab === 'streamers'
                  ? 'border-emerald-400 text-emerald-300 bg-emerald-500/10'
                  : 'border-transparent text-slate-400 hover:text-white'
              }`}
              title={`Streamers (${liveStreamersCount} Currently Live)`}
              aria-label={`Streamers (${liveStreamersCount} Currently Live)`}
            >
              <span className="relative inline-flex items-center justify-center">
                <Users size={16} className="sm:w-[18px] sm:h-[18px]" />
                <span
                  className={`absolute -top-1.5 -right-2.5 min-w-[14px] h-[14px] sm:min-w-[16px] sm:h-[16px] px-1 rounded-full font-mono text-[8px] sm:text-[9px] font-extrabold leading-none flex items-center justify-center ring-2 ring-[#0B0F19] ${
                    liveStreamersCount > 0
                      ? 'bg-emerald-500 text-slate-950 shadow-sm shadow-emerald-500/40'
                      : 'bg-slate-700 text-slate-300'
                  }`}
                >
                  {liveStreamersCount}
                </span>
              </span>
            </button>

            <button
              onClick={() => setSideTab('tip')}
              className={`flex-1 py-1 sm:py-2 flex items-center justify-center transition-all border-b-2 cursor-pointer ${
                sideTab === 'tip'
                  ? 'border-pink-400 text-pink-300 bg-pink-500/10'
                  : 'border-transparent text-slate-400 hover:text-white'
              }`}
              title="Tip Streamer"
              aria-label="Tip Streamer"
            >
              <DollarSign size={16} className="sm:w-[18px] sm:h-[18px]" />
            </button>
          </div>

          {/* Tab 1: Live Chat Content (Supports Real-Time YouTube Live Chat Stream & Room Chat) */}
          {sideTab === 'chat' && (
            <div className="h-full flex flex-col min-h-0 bg-[#090D18]">
              {/* Chat Sub-Header with Channel & Mode Switcher */}
              <div className="h-8 sm:h-10 px-2 sm:px-3 border-b border-slate-800/80 bg-[#090D18] flex items-center justify-between text-[10px] sm:text-[11px] font-mono text-slate-400 shrink-0">
                <div className="flex items-center gap-1 sm:gap-1.5 min-w-0">
                  {chatMode === 'youtube' && selectedStreamer.isLive ? (
                    <>
                      <span className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-red-500 animate-pulse shrink-0" />
                      <span className="text-white font-bold truncate">YouTube Live Chat</span>
                    </>
                  ) : (
                    <>
                      <span className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-cyan-400 animate-pulse shrink-0" />
                      <span className="text-white font-bold truncate">@{selectedStreamer.name} Room</span>
                    </>
                  )}
                </div>

                {/* Mode Selector Pill & Popout Link */}
                <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
                  <div className="flex items-center bg-slate-900 border border-slate-800 rounded-lg p-0.5 text-[9px] sm:text-[10px]">
                    <button
                      type="button"
                      onClick={() => setChatMode('youtube')}
                      className={`px-1.5 sm:px-2 py-0.5 rounded-md font-bold transition-all cursor-pointer flex items-center gap-1 ${
                        chatMode === 'youtube'
                          ? 'bg-red-500/20 text-red-400 border border-red-500/40 shadow-sm'
                          : 'text-slate-400 hover:text-white'
                      }`}
                      title="Listen to real-time YouTube live stream chat"
                    >
                      <Youtube size={10} className="sm:w-[11px] sm:h-[11px]" />
                      <span>YouTube</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setChatMode('room')}
                      className={`px-1.5 sm:px-2 py-0.5 rounded-md font-bold transition-all cursor-pointer flex items-center gap-1 ${
                        chatMode === 'room'
                          ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm'
                          : 'text-slate-400 hover:text-white'
                      }`}
                      title="Switch to local room chat and donation notifications"
                    >
                      <MessageSquare size={10} className="sm:w-[11px] sm:h-[11px]" />
                      <span>Room</span>
                    </button>
                  </div>

                  {chatMode === 'youtube' && selectedStreamer.youtubeId && (
                    <a
                      href={`https://www.youtube.com/live_chat?v=${selectedStreamer.youtubeId}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-1 rounded-md text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                      title="Pop out YouTube Live Chat in a new window"
                    >
                      <ExternalLink size={11} className="sm:w-3 sm:h-3" />
                    </a>
                  )}
                </div>
              </div>

              {/* Chat Viewport */}
              {chatMode === 'youtube' ? (
                selectedStreamer.youtubeId && selectedStreamer.isLive ? (
                  /* 1. Real-Time YouTube Live Chat Iframe */
                  <div className="flex-1 w-full h-full relative min-h-0 bg-[#0F0F0F] overflow-hidden flex flex-col">
                    <iframe
                      key={`yt_chat_${selectedStreamer.youtubeId}`}
                      src={`https://www.youtube.com/live_chat?v=${selectedStreamer.youtubeId}&embed_domain=${embedDomain}&dark_theme=1`}
                      title={`${selectedStreamer.name} YouTube Live Chat`}
                      className="w-full h-full border-0 flex-1 bg-[#0F0F0F]"
                      allow="autoplay; encrypted-media"
                    />
                  </div>
                ) : (
                  /* Offline or Missing Live URL */
                  <div className="flex-1 flex flex-col items-center justify-center p-4 sm:p-6 text-center bg-[#090D18]">
                    <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center mb-2 sm:mb-3 text-slate-500">
                      <Radio size={18} className="sm:w-[22px] sm:h-[22px] opacity-60" />
                    </div>
                    <h4 className="text-xs sm:text-sm font-bold text-white font-['Chakra_Petch'] mb-1">
                      YouTube Live Chat Offline
                    </h4>
                    <p className="text-[11px] sm:text-xs text-slate-400 font-mono max-w-xs leading-relaxed mb-3 sm:mb-4">
                      {selectedStreamer.youtubeId
                        ? `${selectedStreamer.name} is not currently live on YouTube. Real-time chat will start when the stream goes live.`
                        : `${selectedStreamer.name} has not linked a YouTube live stream URL yet.`}
                    </p>
                    <button
                      type="button"
                      onClick={() => setChatMode('room')}
                      className="px-3.5 py-1.5 sm:px-4 sm:py-2 rounded-xl bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/40 text-[11px] sm:text-xs font-mono font-bold transition-all cursor-pointer"
                    >
                      Open Room Chat
                    </button>
                  </div>
                )
              ) : (
                /* 2. Room Chat (Local TV Chat & KHQR Tip Notifications) */
                <>
                  <div
                    ref={chatScrollRef}
                    className="flex-1 min-h-0 overflow-y-auto p-2 sm:p-3 space-y-1.5 sm:space-y-2.5 text-xs font-mono scroll-smooth"
                  >
                    <div className="p-2 rounded-lg bg-slate-900/60 border border-slate-800/60 text-[10px] text-slate-400 text-center">
                      Welcome to @{selectedStreamer.name}&apos;s live stream room! Be respectful to everyone.
                    </div>

                    {chatMessages.map((msg) => {
                      const fullMsgText = `${msg.author}: ${msg.message}`;
                      const isThisCopied = copiedText === fullMsgText;
                      return (
                        <div
                          key={msg.id}
                          className={`p-2 rounded-xl border transition-all select-text group/chat ${
                            msg.isTip
                              ? 'bg-emerald-950/30 border-emerald-500/40 shadow-sm'
                              : 'bg-slate-900/40 border-slate-800/60 hover:bg-slate-900/70'
                          }`}
                        >
                          <div className="flex items-center justify-between gap-1.5 mb-1 select-text">
                            <div className="flex items-center gap-1.5 min-w-0 select-text">
                              <span className="font-bold text-white truncate text-[11px] select-text">
                                @{msg.author}
                              </span>
                              {msg.badge && (
                                <span
                                  className={`px-1.5 py-0.2 rounded text-[8px] font-bold uppercase tracking-wider shrink-0 ${
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
                                onClick={() => handleCopyText(fullMsgText)}
                                className="opacity-0 group-hover/chat:opacity-100 transition-opacity p-0.5 rounded text-slate-400 hover:text-cyan-300 hover:bg-slate-800 cursor-pointer"
                                title="Copy message text"
                              >
                                {isThisCopied ? (
                                  <Check size={11} className="text-emerald-400" />
                                ) : (
                                  <Copy size={11} />
                                )}
                              </button>
                            </div>
                          </div>
                          <p className="text-slate-200 text-xs leading-relaxed break-words font-sans select-text cursor-default selection:bg-cyan-500/40 selection:text-white">
                            {msg.message}
                          </p>
                        </div>
                      );
                    })}
                  </div>

                  {/* Room Chat Input */}
                  <form onSubmit={handleSendMessage} className="p-1.5 sm:p-2.5 pb-[max(0.375rem,env(safe-area-inset-bottom))] border-t border-slate-800 bg-[#0B0F19] flex gap-1.5 sm:gap-2 shrink-0">
                    <input
                      type="text"
                      value={inputMessage}
                      onChange={(e) => setInputMessage(e.target.value)}
                      placeholder={`Chat as @${user?.username || 'KhmerGamer'}...`}
                      className="flex-1 px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-lg sm:rounded-xl bg-slate-900 border border-slate-800 text-[11px] sm:text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400 font-mono"
                    />
                    <button
                      type="submit"
                      disabled={!inputMessage.trim()}
                      className="px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-lg sm:rounded-xl bg-cyan-400 hover:bg-cyan-300 disabled:opacity-40 text-slate-950 font-bold transition-all cursor-pointer shrink-0"
                      title="Send message"
                    >
                      <Send size={13} className="sm:w-3.5 sm:h-3.5" />
                    </button>
                  </form>
                </>
              )}
            </div>
          )}

          {/* Tab 2: Streamer List Content */}
          {sideTab === 'streamers' && (
            <div className="h-full flex flex-col min-h-0">
              <div className="p-3 border-b border-slate-800 bg-[#090D18] shrink-0">
                <div className="relative">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search Streamer..."
                    className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-400 font-mono"
                  />
                </div>
              </div>
              <div className="flex-1 overflow-y-auto p-3 space-y-2">
                {filteredStreamers.map((s) => renderStreamerItem(s, true))}
              </div>
            </div>
          )}

          {/* Tab 3: Tip Streamer Content (Integrated with Donation Page Flow) */}
          {sideTab === 'tip' && (
            <div className="h-full flex flex-col min-h-0 bg-[#090D18]">
              {/* 1. Scrollable Form Body */}
              <div className="flex-1 min-h-0 overflow-y-auto p-2.5 sm:p-3.5 space-y-2.5 sm:space-y-3">
                {/* Streamer Profile Header */}
                <div className="p-2.5 sm:p-3 rounded-xl sm:rounded-2xl bg-gradient-to-br from-emerald-950/40 via-slate-900 to-slate-900 border border-emerald-500/30 flex items-center justify-between gap-2.5 shadow-md select-text cursor-default">
                  <div className="flex items-center gap-2.5 min-w-0 select-text">
                    <div className="relative shrink-0">
                      <img
                        src={selectedStreamer.avatar}
                        alt={selectedStreamer.name}
                        className="w-9 h-9 sm:w-11 sm:h-11 rounded-full bg-slate-800 object-cover ring-2 ring-emerald-400 shadow-sm"
                      />
                      {selectedStreamer.isLive && (
                        <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-400 ring-2 ring-[#090D18]" />
                      )}
                    </div>
                    <div className="min-w-0 select-text">
                      <div className="flex items-center gap-1 select-text">
                        <h4 className="text-xs sm:text-sm font-bold text-white font-['Chakra_Petch'] truncate select-text cursor-default">
                          {selectedStreamer.name}
                        </h4>
                        <CheckCircle2 size={13} className="text-emerald-400 shrink-0" />
                      </div>
                      {selectedStreamer.bio && (
                        <p className="text-[11px] sm:text-xs font-sans text-slate-400 line-clamp-2 mt-0.5 leading-relaxed select-text cursor-default">
                          {selectedStreamer.bio}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Quick Copy Streamer URL */}
                  <button
                    type="button"
                    onClick={() => handleCopyStreamLink(selectedStreamer.username)}
                    className={`p-1.5 sm:p-2 rounded-lg sm:rounded-xl border transition-all cursor-pointer shrink-0 ${
                      copiedLink
                        ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-300'
                        : 'bg-slate-950/80 border-slate-800 text-slate-400 hover:text-white hover:border-slate-700'
                    }`}
                    title={`Copy link /tv?=${selectedStreamer.username}`}
                  >
                    {copiedLink ? <Check size={13} className="text-emerald-400" /> : <Copy size={13} />}
                  </button>
                </div>

                {/* Tipping Not Configured Warning Card (Clicking opens Popup Modal) */}
                {selectedStreamer.isTipConfigured === false && (
                  <div
                    onClick={() => {
                      setTipTargetStreamer(selectedStreamer);
                      setIsUnconfiguredTipModalOpen(true);
                    }}
                    className="p-2.5 sm:p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 space-y-1.5 select-text shadow-sm cursor-pointer hover:bg-amber-500/15 transition-all group"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5 font-bold text-xs font-mono">
                        <AlertTriangle size={15} className="text-amber-400 shrink-0 animate-pulse" />
                        <span>Tipping Not Configured</span>
                      </div>
                      <span className="text-[10px] font-mono font-bold text-amber-400 group-hover:underline flex items-center gap-0.5">
                        <span>Check Status</span>
                        <ArrowRight size={10} />
                      </span>
                    </div>
                    <p className="text-[11px] font-sans text-amber-200/90 leading-snug">
                      Streamer has not completed tip setup. Click here to review required setup checklist.
                    </p>
                  </div>
                )}

                {/* Donor Name & Banking Account */}
                <div className="space-y-2">
                  <div>
                    <label className="block text-[11px] font-mono text-slate-400 mb-1">
                      Your Name (Visible on Stream)
                    </label>
                    <input
                      type="text"
                      value={tipDonorName}
                      onChange={(e) => setTipDonorName(e.target.value)}
                      placeholder={user?.displayName || user?.username || 'e.g. Sokha Gamer'}
                      className="w-full px-3 py-1.5 sm:py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-mono text-slate-400 mb-1">
                      ABA / Banking Account Name (For Auto-Verify)
                    </label>
                    <input
                      type="text"
                      value={bankingName}
                      onChange={(e) => setBankingName(e.target.value)}
                      placeholder="e.g. HENG HOCHEN"
                      className="w-full px-3 py-1.5 sm:py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 font-mono"
                    />
                  </div>

                  <div>
                    <div className="flex items-center justify-between text-[11px] font-mono text-slate-400 mb-1">
                      <span>Cheer Message (TTS Alert on Stream)</span>
                      <span>{tipDonorMessage.length}/250</span>
                    </div>
                    <textarea
                      rows={2}
                      maxLength={250}
                      value={tipDonorMessage}
                      onChange={(e) => setTipDonorMessage(e.target.value)}
                      placeholder={`Cheering for ${selectedStreamer.name}! 🔥`}
                      className="w-full px-3 py-1.5 sm:py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 resize-none font-sans"
                    />
                  </div>
                </div>

                {/* Share Media (YouTube Video & Clip Duration — Exact Donation Page Experience) */}
                <div className="space-y-2 pt-0.5">
                  <div className="flex items-start sm:items-center justify-between gap-2">
                    <label className="text-[11px] font-bold uppercase tracking-wider text-slate-300 font-['Chakra_Petch'] flex flex-wrap items-center gap-x-1.5 gap-y-0.5 min-w-0">
                      <span className="inline-flex items-center gap-1.5 shrink-0">
                        <Youtube size={14} className="text-red-500" />
                        <span>Share Media</span>
                      </span>
                      <span className="text-red-500 font-mono font-bold text-[10px] sm:text-[11px] normal-case tracking-normal">
                        [Required ${Number(selectedStreamer.videoMinTipAmount ?? 2.0).toFixed(2)} To Show On Stream]
                      </span>
                    </label>
                    <button
                      type="button"
                      onClick={handleLoadDemoShareVideo}
                      className="text-[10px] font-mono text-cyan-400 hover:text-cyan-300 underline cursor-pointer shrink-0 whitespace-nowrap"
                    >
                      Try Demo Video
                    </button>
                  </div>

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
                      onChange={handleShareVideoUrlChange}
                      className="w-full pl-9 pr-14 py-1.5 sm:py-2 rounded-xl bg-slate-900 border border-slate-800 text-white text-xs font-mono focus:outline-none focus:border-red-500/70 transition-colors placeholder:text-slate-500"
                    />
                    {videoUrl && (
                      <button
                        type="button"
                        onClick={handleClearShareVideo}
                        className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-red-400 text-[11px] font-mono transition-colors cursor-pointer"
                      >
                        Clear
                      </button>
                    )}
                  </div>

                  {videoError && (
                    <p className="text-[10px] text-red-400 font-mono">{videoError}</p>
                  )}

                  {videoTitle && (
                    <div className="flex items-center gap-2 p-1.5 rounded-lg bg-slate-950/80 border border-slate-800 text-[11px]">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse shrink-0" />
                      <span className="text-slate-300 truncate font-medium select-text">{videoTitle}</span>
                    </div>
                  )}

                  {/* Video Preview Player & Interactive Clip Duration Scrubber */}
                  {activeShareVideoId && (
                    <div className="space-y-2.5 pt-1 animate-in fade-in duration-150">
                      <VideoPlayerWithProgressBar
                        key={sharePreviewKey}
                        videoId={activeShareVideoId}
                        startTime={videoStartTime}
                        endTime={videoEndTime}
                        autoplay={isPlayingPreview && !submittingTip && !isKHQRModalOpen && sideTab === 'tip'}
                        isPaused={submittingTip || isKHQRModalOpen || sideTab !== 'tip'}
                        muted={false}
                        videoTitle={videoTitle}
                        donorName={tipDonorName || user?.displayName || user?.username || 'Viewer'}
                        isPreview={true}
                        onPlayStateChange={setIsPlayingPreview}
                      />

                      <VideoClipScrubberLine
                        startTime={videoStartTime}
                        endTime={videoEndTime}
                        videoDuration={videoDuration}
                        maxAllowedDuration={Number(selectedStreamer.videoMaxDurationSeconds ?? 300)}
                        onChange={(newStart, newEnd) => {
                          setVideoStartTime(newStart);
                          setVideoEndTime(newEnd);
                          setIsPlayingPreview(true);
                        }}
                      />
                    </div>
                  )}
                </div>
              </div>

              {/* 2. Pinned Action Footer: Fits on application screen, always visible without getting cut off */}
              <div className="p-2.5 sm:p-3 border-t border-slate-800 bg-[#0B0F19] shrink-0 pb-[max(0.6rem,env(safe-area-inset-bottom))] shadow-2xl">
                <button
                  type="button"
                  onClick={handleProceedToKHQR}
                  disabled={submittingTip}
                  className="w-full py-2.5 sm:py-3 px-3 rounded-xl bg-gradient-to-r from-emerald-400 via-teal-400 to-emerald-400 hover:from-emerald-300 hover:to-teal-300 active:scale-[0.99] text-slate-950 font-black text-xs sm:text-sm font-mono tracking-wide transition-all shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {submittingTip ? (
                    <>
                      <Loader2 size={16} className="animate-spin" />
                      <span>GENERATING BAKONG KHQR...</span>
                    </>
                  ) : selectedStreamer.isTipConfigured === false ? (
                    <>
                      <AlertTriangle size={15} />
                      <span>TIPPING SETUP REQUIRED</span>
                    </>
                  ) : (
                    <>
                      <DollarSign size={16} className="stroke-[3]" />
                      <span>TIP STREAMER (BAKONG KHQR)</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </aside>
      </div>

      {/* Real Bakong KHQR Modal (Matches Donation Page Architecture) */}
      <BakongKHQRModal
        isOpen={isKHQRModalOpen}
        onClose={() => setIsKHQRModalOpen(false)}
        donationData={activeDonation}
        donorName={tipDonorName || user?.displayName || user?.username || 'Anonymous Supporter'}
        bankingName={bankingName || tipDonorName || 'Bakong KHQR'}
        streamerId={tipTargetStreamer?.id || selectedStreamer.id}
        streamerUsername={tipTargetStreamer?.username || selectedStreamer.username}
        onPaymentSuccess={handlePaymentSuccess}
      />

      {/* Streamer Tipping Unconfigured Modal (Top-Tier Animated Popup Dialog) */}
      {isUnconfiguredTipModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
          {/* Backdrop Click Dismiss */}
          <div
            className="fixed inset-0"
            onClick={() => setIsUnconfiguredTipModalOpen(false)}
          />

          {/* Animated Popup Container */}
          <div className="relative w-full max-w-md rounded-2xl sm:rounded-3xl bg-gradient-to-b from-[#10162A] via-[#0C1120] to-[#080B14] border border-amber-500/50 shadow-[0_0_60px_rgba(245,158,11,0.25)] p-5 sm:p-6 select-text overflow-hidden z-10 animate-in zoom-in-95 duration-200 max-h-[92vh] overflow-y-auto">
            {/* Ambient Radial Glow */}
            <div className="absolute -top-12 left-1/2 -translate-x-1/2 w-48 h-20 bg-amber-400/15 rounded-full blur-2xl pointer-events-none" />

            {/* Popup Header */}
            <div className="flex items-start justify-between gap-3 pb-3 border-b border-slate-800/80 mb-4">
              <div className="flex items-center gap-3">
                <div className="relative w-11 h-11 sm:w-12 sm:h-12 rounded-2xl bg-amber-500/15 border border-amber-500/40 flex items-center justify-center text-amber-400 shrink-0 shadow-lg shadow-amber-500/20">
                  <AlertTriangle size={22} />
                  <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-amber-400 animate-ping opacity-75" />
                  <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-amber-400" />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-bold text-white font-['Chakra_Petch'] leading-tight">
                    Tipping Setup Required
                  </h3>
                  <p className="text-[11px] font-mono text-amber-300/80 mt-0.5">
                    @{tipTargetStreamer?.username || selectedStreamer.username}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsUnconfiguredTipModalOpen(false)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800/80 transition-colors cursor-pointer border border-slate-800"
                title="Close popup"
              >
                <X size={16} />
              </button>
            </div>

            {/* Clean Modal Message */}
            <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/25 text-xs text-amber-200 leading-relaxed font-sans mb-4">
              This streamer hasn&apos;t configured tipping yet. If you are this streamer, please head to your Dashboard to finish connecting your payment and notification setup.
            </div>

            {/* Configuration Checklist */}
            <div className="p-3.5 rounded-xl bg-slate-950/90 border border-slate-800/90 space-y-2.5 text-xs font-mono mb-5 shadow-inner">
              <div className="text-[10px] text-slate-500 uppercase tracking-wider font-bold mb-1 flex items-center justify-between">
                <span>Setup Checklist</span>
                <span className="text-[9px] text-slate-600">Bakong 0% Direct</span>
              </div>
              <div className="flex items-center justify-between p-2 rounded-lg bg-slate-900/60 border border-slate-800/50">
                <span className="text-slate-300 text-[11px]">Telegram Session (GramJS)</span>
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                    (tipTargetStreamer || selectedStreamer).isTelegramConnected
                      ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400'
                      : 'bg-amber-500/15 border-amber-500/30 text-amber-400'
                  }`}
                >
                  {(tipTargetStreamer || selectedStreamer).isTelegramConnected ? '✓ Connected' : '✗ Not Connected'}
                </span>
              </div>
              <div className="flex items-center justify-between p-2 rounded-lg bg-slate-900/60 border border-slate-800/50">
                <span className="text-slate-300 text-[11px]">Master KHQR Payment Image</span>
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                    (tipTargetStreamer || selectedStreamer).hasMasterKhqr
                      ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400'
                      : 'bg-amber-500/15 border-amber-500/30 text-amber-400'
                  }`}
                >
                  {(tipTargetStreamer || selectedStreamer).hasMasterKhqr ? '✓ Uploaded' : '✗ Missing'}
                </span>
              </div>
              <div className="flex items-center justify-between p-2 rounded-lg bg-slate-900/60 border border-slate-800/50">
                <span className="text-slate-300 text-[11px]">Monitored Alert Group</span>
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                    (tipTargetStreamer || selectedStreamer).hasTelegramGroup
                      ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400'
                      : 'bg-amber-500/15 border-amber-500/30 text-amber-400'
                  }`}
                >
                  {(tipTargetStreamer || selectedStreamer).hasTelegramGroup ? '✓ Linked' : '✗ Not Linked'}
                </span>
              </div>
            </div>

            {/* Popup Action Buttons */}
            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={() => {
                  setIsUnconfiguredTipModalOpen(false);
                  navigate('/dashboard');
                }}
                className="flex-1 py-2.5 sm:py-3 px-4 rounded-xl bg-gradient-to-r from-amber-400 via-amber-300 to-amber-500 hover:from-amber-300 hover:to-amber-400 active:scale-[0.98] text-slate-950 font-black text-xs font-mono transition-all flex items-center justify-center gap-1.5 shadow-lg shadow-amber-500/25 cursor-pointer"
              >
                <Sliders size={14} />
                <span>Go to Dashboard</span>
              </button>
              <button
                type="button"
                onClick={() => setIsUnconfiguredTipModalOpen(false)}
                className="py-2.5 sm:py-3 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-white text-xs font-mono font-medium transition-all cursor-pointer active:scale-[0.98]"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
