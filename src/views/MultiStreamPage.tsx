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
  AlertCircle,
  Loader2
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useAudio } from '../hooks/useAudio';
import { donationService } from '../services/donationService';
import { CreateDonationResponse } from '../types/donation';
import { BakongKHQRModal } from '../components/donate/BakongKHQRModal';
import { extractYoutubeId } from '../utils/youtube';

export interface StreamerClient {
  id: string;
  name: string;
  username: string;
  avatar: string;
  game: string;
  viewers: number;
  isLive: boolean;
  videoEmbedUrl?: string;
  youtubeId?: string;
  tipUsername?: string;
}

// Default initial database streamer
const DEFAULT_STREAMER: StreamerClient = {
  id: 'streamer_8949c329d7ca4569',
  name: 'SelenuxML',
  username: 'selenuxml',
  avatar: '/uploads/media/1793296449447-a1134a7c.png',
  game: 'Teamfight Tactics',
  viewers: 630,
  isLive: true,
  youtubeId: 'jfKfPfyJRdk',
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
  const videoIframeRef = useRef<HTMLIFrameElement | null>(null);
  const qualityMenuRef = useRef<HTMLDivElement | null>(null);

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
  const [currency, setCurrency] = useState<'USD' | 'KHR'>('USD');
  const [tipAmount, setTipAmount] = useState<string>('5.00');
  const [customAmount, setCustomAmount] = useState<string>('');
  const [tipDonorName, setTipDonorName] = useState<string>('');
  const [bankingName, setBankingName] = useState<string>('');
  const [tipDonorMessage, setTipDonorMessage] = useState<string>('');
  const [videoUrl, setVideoUrl] = useState<string>('');
  const [isVideoClipEnabled, setIsVideoClipEnabled] = useState<boolean>(false);
  const [submittingTip, setSubmittingTip] = useState<boolean>(false);
  const [activeDonation, setActiveDonation] = useState<CreateDonationResponse | null>(null);
  const [isKHQRModalOpen, setIsKHQRModalOpen] = useState<boolean>(false);
  const [tipSuccess, setTipSuccess] = useState<boolean>(false);
  const [tipTargetStreamer, setTipTargetStreamer] = useState<StreamerClient>(INITIAL_STREAMERS[0]);
  const [copiedLink, setCopiedLink] = useState<boolean>(false);
  const [copiedText, setCopiedText] = useState<string | null>(null);

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
            game: s.game || 'Live Broadcast',
            viewers: s.viewers || 0,
            isLive: Boolean(s.isLive),
            youtubeId: s.youtubeId || '',
            videoEmbedUrl: s.videoEmbedUrl,
            tipUsername: s.username
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
      const userChannel: StreamerClient = {
        id: user.userId || user.username,
        name: user.displayName || user.username,
        username: user.username,
        avatar: user.avatarUrl || `https://api.dicebear.com/7.x/bottts/svg?seed=${user.username}`,
        game: 'IRL Gaming & Chat',
        viewers: 520,
        isLive: true,
        youtubeId: extractYoutubeId(user.liveStreamUrl) || 'jfKfPfyJRdk',
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
            const loaded: StreamerClient = {
              id: pub.id || pub.username,
              name: pub.displayName || pub.username,
              username: pub.username,
              avatar: pub.avatarUrl || `https://api.dicebear.com/7.x/bottts/svg?seed=${pub.username}`,
              game: 'Live Broadcast',
              viewers: 650,
              isLive: true,
              youtubeId: pub.youtubeId || extractYoutubeId(pub.liveStreamUrl) || 'jfKfPfyJRdk',
              tipUsername: pub.username
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
    handleProceedToKHQR(undefined, streamer);
  };

  const handleProceedToKHQR = async (e?: React.FormEvent, customTargetStreamer?: StreamerClient) => {
    if (e) e.preventDefault();
    setSubmittingTip(true);

    const target = customTargetStreamer || tipTargetStreamer || selectedStreamer;
    const amountNum = parseFloat(customAmount || tipAmount) || (currency === 'KHR' ? 5000 : 1);
    const donor = tipDonorName.trim() || user?.displayName || user?.username || 'Anonymous Supporter';
    const bank = bankingName.trim() || donor || 'Bakong KHQR';
    const msg = tipDonorMessage.trim() || `Cheering for ${target.name}! 🔥`;

    try {
      const res = await donationService.createDonation({
        streamerId: target.id,
        donorName: donor,
        donorMessage: msg,
        amount: amountNum,
        currency: currency,
        bankingName: bank,
        videoUrl: isVideoClipEnabled && videoUrl.trim() ? videoUrl.trim() : undefined
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
              <span className="text-slate-500 shrink-0">
                • {streamer.viewers.toLocaleString()} watching
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
    <div className="w-screen h-screen overflow-hidden bg-[#060911] text-slate-100 flex flex-col font-sans cursor-default select-text antialiased selection:bg-cyan-500/30 selection:text-white">
      {/* ============================================================== */}
      {/* 1. TOP APPLICATION NAVIGATION BAR                              */}
      {/* ============================================================== */}
      <header className="h-12 bg-[#090D18] border-b border-slate-800/80 px-2.5 sm:px-4 flex items-center justify-between gap-2 shrink-0 z-30">
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
      <div className="flex-1 flex flex-col lg:flex-row min-h-0 overflow-hidden relative">
        {/* ============================================================ */}
        {/* VIDEO BROADCAST STAGE                                        */}
        {/* ============================================================ */}
        <main className="flex flex-col min-w-0 bg-[#060911] overflow-hidden p-2 sm:p-3 gap-2 shrink-0 lg:flex-1 lg:shrink">
          {/* 1. Video Player Canvas (Top of Stage) */}
          <div className="relative w-full aspect-video lg:aspect-auto lg:flex-1 rounded-2xl bg-[#04060A] border border-slate-800/80 overflow-hidden shadow-2xl flex items-center justify-center shrink-0">
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
                          }}
                          className="text-[10px] text-emerald-400 hover:underline font-bold flex items-center gap-0.5"
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
                    className={`border-0 select-none ${
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
                  <div className="absolute inset-0 z-10 bg-transparent select-none cursor-default" />
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
                    setTipTargetStreamer(selectedStreamer);
                    setSideTab('tip');
                  }}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-400 hover:bg-emerald-300 text-slate-950 font-bold text-xs font-mono transition-all cursor-pointer shadow-lg shadow-emerald-500/20"
                >
                  <DollarSign size={14} className="stroke-[3]" />
                  <span>Tip {selectedStreamer.name}</span>
                </button>
              </div>
            )}
          </div>

          {/* 2. Menu Next to Video Screen Bottom */}
          <div className="relative z-30 min-h-[46px] py-1.5 px-3 rounded-xl bg-[#090D18] border border-slate-800 flex items-center justify-between gap-3 shrink-0 shadow-xl select-text cursor-default">
            {/* Left: Streamer Logo, Username & Total Watching only */}
            <div className="flex items-center gap-2.5 min-w-0">
              {/* Streamer Logo */}
              <div
                className="relative shrink-0 cursor-pointer"
                onClick={() => setSideTab('streamers')}
                title="Click to view all streamers"
              >
                <img
                  src={selectedStreamer.avatar}
                  alt={selectedStreamer.name}
                  className="w-8 h-8 rounded-full bg-slate-800 object-cover ring-2 ring-emerald-500/60"
                />
                {selectedStreamer.isLive && (
                  <span className="absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full bg-emerald-400 ring-2 ring-[#090D18]" />
                )}
              </div>

              {/* Username & Total Watching only */}
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-xs sm:text-sm font-bold text-white font-['Chakra_Petch'] truncate">
                  @{selectedStreamer.username || selectedStreamer.name}
                </span>
                <span className="text-slate-600">•</span>
                {selectedStreamer.isLive ? (
                  <span className="text-emerald-400 font-bold font-mono text-xs flex items-center gap-1 shrink-0">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    {selectedStreamer.viewers.toLocaleString()} watching
                  </span>
                ) : (
                  <span className="text-slate-500 font-bold font-mono text-xs flex items-center gap-1 shrink-0">
                    <span className="w-1.5 h-1.5 rounded-full bg-slate-600" />
                    OFFLINE
                  </span>
                )}
              </div>
            </div>

            {/* Right: Quick Action Icons (Quality, Share & Fullscreen) */}
            <div className="flex items-center gap-1.5 shrink-0">
              {/* Stream Quality Selector Dropdown */}
              <div className="relative" ref={qualityMenuRef}>
                <button
                  type="button"
                  onClick={() => setIsQualityMenuOpen(!isQualityMenuOpen)}
                  className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border transition-all cursor-pointer font-mono text-xs ${
                    isQualityMenuOpen
                      ? 'bg-cyan-500/20 border-cyan-500/50 text-cyan-300 ring-1 ring-cyan-500/30'
                      : 'bg-slate-900 border-slate-800 text-slate-300 hover:text-white hover:border-slate-700'
                  }`}
                  title="Choose Stream Quality"
                >
                  <Sliders size={13} className={isQualityMenuOpen ? 'text-cyan-400' : 'text-slate-400'} />
                  <span className="text-[11px] font-bold">
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

              {/* Fullscreen Button */}
              <button
                onClick={() => setIsFullscreen(!isFullscreen)}
                className="p-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-400 hover:text-white hover:border-slate-700 transition-colors cursor-pointer"
                title={isFullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen'}
              >
                {isFullscreen ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
              </button>
            </div>
          </div>
        </main>

        {/* ============================================================ */}
        {/* LIVE CHAT • STREAMER • TIP STREAMER SECTION                  */}
        {/* Responsive: Bottom of video on device size (< lg),          */}
        {/*             Next to video on desktop size (>= lg)            */}
        {/* ============================================================ */}
        <aside className="w-full lg:w-80 xl:w-96 2xl:w-[420px] flex-1 lg:flex-none lg:h-full bg-[#090D18] border-t lg:border-t-0 lg:border-l border-slate-800/80 flex flex-col shrink-0 z-20 shadow-2xl min-h-0">
          {/* Top Tab Switcher Header (Icons Only) */}
          <div className="h-11 px-3 border-b border-slate-800 flex items-center justify-around bg-[#0B0F19] shrink-0">
            <button
              onClick={() => setSideTab('chat')}
              className={`flex-1 py-2 flex items-center justify-center transition-all border-b-2 cursor-pointer ${
                sideTab === 'chat'
                  ? 'border-cyan-400 text-cyan-300 bg-cyan-500/10'
                  : 'border-transparent text-slate-400 hover:text-white'
              }`}
              title="Live Chat"
              aria-label="Live Chat"
            >
              <MessageSquare size={18} />
            </button>

            <button
              onClick={() => setSideTab('streamers')}
              className={`relative flex-1 py-2 flex items-center justify-center transition-all border-b-2 cursor-pointer ${
                sideTab === 'streamers'
                  ? 'border-emerald-400 text-emerald-300 bg-emerald-500/10'
                  : 'border-transparent text-slate-400 hover:text-white'
              }`}
              title={`Streamers (${liveStreamersCount} Live)`}
              aria-label="Streamers"
            >
              <Users size={18} />
              {liveStreamersCount > 0 && (
                <span className="absolute top-2 right-1/4 w-2 h-2 rounded-full bg-emerald-400 animate-pulse ring-2 ring-[#0B0F19]" />
              )}
            </button>

            <button
              onClick={() => setSideTab('tip')}
              className={`flex-1 py-2 flex items-center justify-center transition-all border-b-2 cursor-pointer ${
                sideTab === 'tip'
                  ? 'border-pink-400 text-pink-300 bg-pink-500/10'
                  : 'border-transparent text-slate-400 hover:text-white'
              }`}
              title="Tip Streamer"
              aria-label="Tip Streamer"
            >
              <DollarSign size={18} />
            </button>
          </div>

          {/* Tab 1: Live Chat Content (Supports Real-Time YouTube Live Chat Stream & Room Chat) */}
          {sideTab === 'chat' && (
            <div className="h-full flex flex-col min-h-0 bg-[#090D18]">
              {/* Chat Sub-Header with Channel & Mode Switcher */}
              <div className="h-10 px-3 border-b border-slate-800/80 bg-[#090D18] flex items-center justify-between text-[11px] font-mono text-slate-400 shrink-0">
                <div className="flex items-center gap-1.5 min-w-0">
                  {chatMode === 'youtube' && selectedStreamer.isLive ? (
                    <>
                      <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse shrink-0" />
                      <span className="text-white font-bold truncate">YouTube Live Chat</span>
                    </>
                  ) : (
                    <>
                      <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse shrink-0" />
                      <span className="text-white font-bold truncate">@{selectedStreamer.name} Room</span>
                    </>
                  )}
                </div>

                {/* Mode Selector Pill & Popout Link */}
                <div className="flex items-center gap-1.5 shrink-0">
                  <div className="flex items-center bg-slate-900 border border-slate-800 rounded-lg p-0.5 text-[10px]">
                    <button
                      type="button"
                      onClick={() => setChatMode('youtube')}
                      className={`px-2 py-0.5 rounded-md font-bold transition-all cursor-pointer flex items-center gap-1 ${
                        chatMode === 'youtube'
                          ? 'bg-red-500/20 text-red-400 border border-red-500/40 shadow-sm'
                          : 'text-slate-400 hover:text-white'
                      }`}
                      title="Listen to real-time YouTube live stream chat"
                    >
                      <Youtube size={11} />
                      <span>YouTube</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setChatMode('room')}
                      className={`px-2 py-0.5 rounded-md font-bold transition-all cursor-pointer flex items-center gap-1 ${
                        chatMode === 'room'
                          ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm'
                          : 'text-slate-400 hover:text-white'
                      }`}
                      title="Switch to local room chat and donation notifications"
                    >
                      <MessageSquare size={11} />
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
                      <ExternalLink size={12} />
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
                  <div className="flex-1 flex flex-col items-center justify-center p-6 text-center bg-[#090D18]">
                    <div className="w-12 h-12 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center mb-3 text-slate-500">
                      <Radio size={22} className="opacity-60" />
                    </div>
                    <h4 className="text-sm font-bold text-white font-['Chakra_Petch'] mb-1">
                      YouTube Live Chat Offline
                    </h4>
                    <p className="text-xs text-slate-400 font-mono max-w-xs leading-relaxed mb-4">
                      {selectedStreamer.youtubeId
                        ? `${selectedStreamer.name} is not currently live on YouTube. Real-time chat will start when the stream goes live.`
                        : `${selectedStreamer.name} has not linked a YouTube live stream URL yet.`}
                    </p>
                    <button
                      type="button"
                      onClick={() => setChatMode('room')}
                      className="px-4 py-2 rounded-xl bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/40 text-xs font-mono font-bold transition-all cursor-pointer"
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
                    className="flex-1 overflow-y-auto p-3 space-y-2.5 text-xs font-mono scroll-smooth"
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
                  <form onSubmit={handleSendMessage} className="p-2.5 border-t border-slate-800 bg-[#0B0F19] flex gap-2 shrink-0">
                    <input
                      type="text"
                      value={inputMessage}
                      onChange={(e) => setInputMessage(e.target.value)}
                      placeholder={`Chat as @${user?.username || 'KhmerGamer'}...`}
                      className="flex-1 px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400 font-mono"
                    />
                    <button
                      type="submit"
                      disabled={!inputMessage.trim()}
                      className="p-2 px-3 rounded-xl bg-cyan-400 hover:bg-cyan-300 disabled:opacity-40 text-slate-950 font-bold transition-all cursor-pointer"
                      title="Send message"
                    >
                      <Send size={14} />
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
                <div className="text-[10px] font-mono text-slate-400 uppercase tracking-wider font-bold mb-1">
                  Active Channels ({filteredStreamers.length}) • LIVE on Top
                </div>
                {filteredStreamers.map((s) => renderStreamerItem(s, true))}
              </div>
            </div>
          )}

          {/* Tab 3: Tip Streamer Content (Integrated with Donation Page Flow) */}
          {sideTab === 'tip' && (
            <div className="h-full flex flex-col min-h-0 overflow-y-auto p-3.5 sm:p-4 space-y-3.5">
              {/* Streamer Profile Header */}
              <div className="p-3.5 rounded-2xl bg-gradient-to-br from-emerald-950/40 via-slate-900 to-slate-900 border border-emerald-500/30 flex items-center justify-between gap-3 shadow-lg select-text cursor-default">
                <div className="flex items-center gap-3 min-w-0 select-text">
                  <div className="relative shrink-0">
                    <img
                      src={selectedStreamer.avatar}
                      alt={selectedStreamer.name}
                      className="w-11 h-11 sm:w-12 sm:h-12 rounded-full bg-slate-800 object-cover ring-2 ring-emerald-400 shadow-md"
                    />
                    <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-emerald-400 ring-2 ring-[#090D18]" />
                  </div>
                  <div className="min-w-0 select-text">
                    <div className="flex items-center gap-1.5 select-text">
                      <h4 className="text-sm font-bold text-white font-['Chakra_Petch'] truncate select-text cursor-default">
                        {selectedStreamer.name}
                      </h4>
                      <CheckCircle2 size={14} className="text-emerald-400 shrink-0" />
                    </div>
                    <p className="text-[11px] font-mono text-slate-400 truncate select-text cursor-default">
                      @{selectedStreamer.username} • {selectedStreamer.game}
                    </p>
                    <p className="text-[10px] font-mono text-emerald-400 font-bold select-text cursor-default">
                      0% Fee Direct Bakong KHQR
                    </p>
                  </div>
                </div>

                {/* Quick Copy Streamer URL */}
                <button
                  type="button"
                  onClick={() => handleCopyStreamLink(selectedStreamer.username)}
                  className={`p-2 rounded-xl border transition-all cursor-pointer shrink-0 ${
                    copiedLink
                      ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-300'
                      : 'bg-slate-950/80 border-slate-800 text-slate-400 hover:text-white hover:border-slate-700'
                  }`}
                  title={`Copy link /tv?=${selectedStreamer.username}`}
                >
                  {copiedLink ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
                </button>
              </div>

              {/* Donor Name & Banking Account */}
              <div className="space-y-2.5">
                <div>
                  <label className="block text-[11px] font-mono text-slate-400 mb-1">
                    Your Name (Visible on Stream)
                  </label>
                  <input
                    type="text"
                    value={tipDonorName}
                    onChange={(e) => setTipDonorName(e.target.value)}
                    placeholder={user?.displayName || user?.username || 'e.g. Sokha Gamer'}
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 font-mono"
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
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 font-mono"
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
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 resize-none font-sans"
                  />
                </div>
              </div>

              {/* Optional YouTube Video Clip Share Accordion */}
              <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 space-y-2">
                <button
                  type="button"
                  onClick={() => setIsVideoClipEnabled(!isVideoClipEnabled)}
                  className="w-full flex items-center justify-between text-xs font-mono font-bold text-slate-300 hover:text-white cursor-pointer"
                >
                  <div className="flex items-center gap-1.5">
                    <Youtube size={15} className="text-red-400" />
                    <span>Play YouTube Video on Stream</span>
                  </div>
                  <span className="text-[10px] text-cyan-400">{isVideoClipEnabled ? 'ENABLED' : 'OPTIONAL'}</span>
                </button>
                {isVideoClipEnabled && (
                  <input
                    type="url"
                    value={videoUrl}
                    onChange={(e) => setVideoUrl(e.target.value)}
                    placeholder="https://www.youtube.com/watch?v=..."
                    className="w-full px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400 font-mono mt-1"
                  />
                )}
              </div>

              {/* Action Button: Proceed to Bakong KHQR */}
              <button
                type="button"
                onClick={handleProceedToKHQR}
                disabled={submittingTip}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-emerald-400 via-teal-400 to-emerald-400 hover:from-emerald-300 hover:to-teal-300 text-slate-950 font-black text-xs font-mono transition-all shadow-lg shadow-emerald-500/25 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {submittingTip ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    <span>GENERATING BAKONG KHQR...</span>
                  </>
                ) : (
                  <>
                    <DollarSign size={16} className="stroke-[3]" />
                    <span>
                      TIP STREAMER (BAKONG KHQR)
                    </span>
                  </>
                )}
              </button>
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
    </div>
  );
};
