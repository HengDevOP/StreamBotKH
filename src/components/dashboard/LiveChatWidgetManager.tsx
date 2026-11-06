'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  MessageSquare,
  Copy,
  Check,
  ExternalLink,
  Sparkles,
  Send,
  Sliders,
  Palette,
  Type,
  Clock,
  Lock,
  Eye,
  Save,
  Menu,
  X,
  Trash2,
  RefreshCw,
  CheckCircle2,
  Smile,
  Maximize2,
  Crown,
  Star,
  Flame,
  Heart,
  Zap,
  ShieldCheck,
  AlertTriangle,
  Volume2,
  VolumeX,
  Volume1,
  Play,
  Square,
  Music,
  FolderOpen
} from 'lucide-react';
import { getBadgeIconComponent } from '../../data/badgeIcons';
import { Card } from '../common/Card';
import { Button } from '../common/Button';
import { ANIMATION_STYLES, CHAT_ANIMATIONS_CSS, CHAT_FONTS } from '../../utils/chatAnimations';
import { useSocket } from '../../context/SocketContext';
import { MediaPickerModal } from './MediaPickerModal';

export interface LiveChatWidgetManagerProps {
  streamerToken?: string;
  isLocked?: boolean;
  onUpgrade?: () => void;
  isRightbarOpen?: boolean;
  onToggleRightbar?: () => void;
  onCloseRightbar?: () => void;
}

interface ChatSettings {
  fontFamily: string;
  authorFontFamily: string;
  messageFontFamily: string;
  fontSize: string;
  lineStyle: 'inline' | 'indented' | 'stacked';
  authorColor: string;
  messageColor: string;
  animationStyle: string;
  overlayWidth: number;
  overlayHeight: number;
  showBadges: boolean;
  showTimestamp: boolean;
  fadeDuration: number;
  messageDelay: number;
  maxMessages: number;
  textBorderWidth: number;
  textBorderColor: string;
  textShadowStyle: 'none' | 'soft' | 'strong' | 'glow' | 'custom';
  textShadowColor: string;
  textShadowBlur: number;
  soundEnabled: boolean;
  soundUrl: string;
  soundVolume: number;
  youtubeUrl: string;
}

export const CHAT_SOUND_PRESETS = [
  {
    id: 'cash-register',
    name: 'Cash Register',
    badge: 'DEFAULT',
    desc: 'Classic tip & ka-ching sound',
    url: '/sounds/cash-register-kaching.mp3',
    icon: '💰'
  },
  {
    id: 'mario-coin',
    name: 'Super Mario Coin',
    badge: 'RETRO',
    desc: 'Retro 8-bit coin pickup sound',
    url: '/sounds/mario-coin.mp3',
    icon: '⭐'
  },
  {
    id: 'discord-ping',
    name: 'Discord Ping',
    badge: 'POPULAR',
    desc: 'Familiar message ping chime',
    url: '/sounds/memes/meme-discord-ping.mp3',
    icon: '🔔'
  },
  {
    id: 'neon-chime',
    name: 'Neon Cyber Synth',
    badge: 'CLEAN',
    desc: 'Futuristic synth chime',
    url: '/sounds/neon-chime.mp3',
    icon: '⚡'
  },
  {
    id: 'hitmarker',
    name: 'Gaming Hitmarker',
    badge: 'TACTICAL',
    desc: 'Tactical hit sound effect',
    url: '/sounds/memes/meme-hitmarker.mp3',
    icon: '🎯'
  },
  {
    id: 'windows-startup',
    name: 'Windows Startup',
    badge: 'CLASSIC',
    desc: 'Iconic startup audio chime',
    url: '/sounds/memes/meme-windows-startup.mp3',
    icon: '💻'
  },
  {
    id: 'baby-triple',
    name: 'Baby A Triple!',
    badge: 'HYPE',
    desc: 'Epic gaming celebration',
    url: '/sounds/memes/oh-baby-a-triple.mp3',
    icon: '🔥'
  },
  {
    id: 'roblox-oof',
    name: 'Roblox OOF',
    badge: 'MEME',
    desc: 'Iconic comedy reaction sound',
    url: '/sounds/memes/oh-roblox-oof.mp3',
    icon: '😅'
  }
];

const DEFAULT_SETTINGS: ChatSettings = {
  fontFamily: 'Chakra Petch',
  authorFontFamily: 'Chakra Petch',
  messageFontFamily: 'Inter',
  fontSize: 'base',
  lineStyle: 'indented',
  authorColor: '#00F0FF',
  messageColor: '#FFFFFF',
  animationStyle: 'slide-left',
  overlayWidth: 420,
  overlayHeight: 600,
  showBadges: true,
  showTimestamp: false,
  fadeDuration: 15,
  messageDelay: 0,
  maxMessages: 10,
  textBorderWidth: 0,
  textBorderColor: '#000000',
  textShadowStyle: 'none',
  textShadowColor: 'rgba(0, 0, 0, 0.95)',
  textShadowBlur: 0,
  soundEnabled: true,
  soundUrl: '/sounds/cash-register-kaching.mp3',
  soundVolume: 0.85,
  youtubeUrl: ''
};

const SAMPLE_NAMES = [
  'NeonSamurai',
  'DaraGamer',
  'PixelQueen',
  'SokhaAce',
  'KompongChamp',
  'CyberFan99',
  'ChakriyaX',
  'VannakPro',
  'KhmerGamer',
  'RithyAce',
  'TechWarrior',
  'ShadowNinja',
  'BuntheunGG',
  'SreypovGamer',
  'SopheaLive'
];

const SAMPLE_MESSAGES = [
  'Let’s go! Epic live stream today! 🔥🚀',
  'wwmwmwmwmwmwmwmwmwmmwmwmw wmwmwmwmwmmwmwmwmwmwmwmwm',
  'GG clutch win! That play was insane 💯',
  'Top tier broadcast quality today! ✨',
  'StreamBotKH live chat overlay is so smooth ⚡',
  'Just shared the stream with the squad 🙌',
  'Insane gameplay today, keep rocking! 🎯',
  'Love the clean chat colors bro! 👑',
  'What game are we playing next? 🎮',
  'W stream! W gameplay! 🚀',
  'That headshot was illegal bro 😂🔥',
  'Big respect from Phnom Penh! 🇰🇭',
  '10/10 content as always GG!',
  'Best live stream vibes right now 🎶',
  'Drop that discord link in chat!'
];

const SAMPLE_BADGES = ['VIP', 'MOD', 'MEMBER', 'SUPPORTER', ''];

const SAMPLE_BADGE_PRESETS: Record<string, { color: string; icon: string }> = {
  VIP: { color: '#F59E0B', icon: 'Crown' },
  MOD: { color: '#10B981', icon: 'Shield' },
  MEMBER: { color: '#A855F7', icon: 'Star' },
  SUPPORTER: { color: '#00F0FF', icon: 'Zap' }
};

interface LocalChatMessage {
  id: string;
  author: string;
  message: string;
  badge?: string;
  badgeColor?: string;
  badgeBg?: string;
  badgeBorder?: string;
  badgeIcon?: string;
  badgeGifUrl?: string;
  badgeImage?: string;
  platform?: string;
  time: string;
}

const INITIAL_MESSAGES: LocalChatMessage[] = [
  {
    id: 'p1',
    author: 'NeonSamurai',
    message: 'Let’s go! Epic live stream today, quality is amazing! 🔥🚀',
    badge: 'VIP',
    badgeColor: '#F59E0B',
    badgeIcon: 'Crown',
    platform: 'youtube',
    time: '14:02'
  },
  {
    id: 'p2',
    author: 'DaraGamer',
    message: 'GG clutch win! That play was insane 💯',
    badge: 'MOD',
    badgeColor: '#10B981',
    badgeIcon: 'Shield',
    platform: 'youtube',
    time: '14:03'
  },
  {
    id: 'p3',
    author: 'PixelQueen',
    message: 'Loving the clean live chat overlay! ✨',
    badge: 'MEMBER',
    badgeColor: '#A855F7',
    badgeIcon: 'Star',
    platform: 'youtube',
    time: '14:04'
  }
];

const QUICK_TAGS = [
  '🔥 Hype Stream!',
  '🎉 GG Clutch Play!',
  '⚡ Top Tier Quality!',
  '👑 Jackpot Winner!',
  '✨ Welcome to the chat!'
];

export const LiveChatWidgetManager: React.FC<LiveChatWidgetManagerProps> = ({
  streamerToken,
  isLocked = false,
  onUpgrade,
  isRightbarOpen: controlledIsRightbarOpen,
  onToggleRightbar,
  onCloseRightbar
}) => {
  const [settings, setSettings] = useState<ChatSettings>(DEFAULT_SETTINGS);
  const [savedSettings, setSavedSettings] = useState<ChatSettings>(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [saveSuccess, setSaveSuccess] = useState<boolean>(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [copiedUrl, setCopiedUrl] = useState<boolean>(false);
  const [sendingTest, setSendingTest] = useState<boolean>(false);
  const [testSent, setTestSent] = useState<boolean>(false);

  // Rightbar Settings Drawer State (Controlled from Navbar or Uncontrolled fallback)
  const [internalRightbarOpen, setInternalRightbarOpen] = useState<boolean>(false);
  const isRightbarOpen = controlledIsRightbarOpen !== undefined ? controlledIsRightbarOpen : internalRightbarOpen;

  const toggleRightbar = () => {
    if (onToggleRightbar) {
      onToggleRightbar();
    } else {
      setInternalRightbarOpen((prev) => !prev);
    }
  };

  const closeRightbar = () => {
    if (onCloseRightbar) {
      onCloseRightbar();
    } else {
      setInternalRightbarOpen(false);
    }
  };

  // Live Chat messages feed
  const [messages, setMessages] = useState<LocalChatMessage[]>(INITIAL_MESSAGES);
  const [customInput, setCustomInput] = useState('');
  const chatScrollRef = useRef<HTMLDivElement>(null);
  const settingsSectionRef = useRef<HTMLElement>(null);

  // Sound Notification & Media Picker State
  const [isMediaPickerOpen, setIsMediaPickerOpen] = useState<boolean>(false);
  const [isPlayingAudio, setIsPlayingAudio] = useState<boolean>(false);
  const previewAudioRef = useRef<HTMLAudioElement | null>(null);

  const settingsRef = useRef<ChatSettings>(settings);
  useEffect(() => {
    settingsRef.current = settings;
  }, [settings]);

  const playPreviewSound = (urlToPlay?: string, volToUse?: number) => {
    if (typeof window === 'undefined') return;
    try {
      if (previewAudioRef.current) {
        previewAudioRef.current.pause();
        previewAudioRef.current.currentTime = 0;
      }
      const targetUrl = urlToPlay || settingsRef.current.soundUrl || '/sounds/cash-register-kaching.mp3';
      const audio = new Audio(targetUrl);
      previewAudioRef.current = audio;
      const vol = volToUse !== undefined ? volToUse : (settingsRef.current.soundVolume ?? 0.85);
      audio.volume = Math.min(1, Math.max(0, vol));
      setIsPlayingAudio(true);
      audio.onended = () => setIsPlayingAudio(false);
      audio.onerror = () => setIsPlayingAudio(false);
      audio.play().catch((err) => {
        console.warn('Audio preview play blocked:', err);
        setIsPlayingAudio(false);
      });
    } catch (e) {
      console.warn('Error playing preview audio:', e);
      setIsPlayingAudio(false);
    }
  };

  const stopPreviewSound = () => {
    if (previewAudioRef.current) {
      previewAudioRef.current.pause();
      previewAudioRef.current.currentTime = 0;
      setIsPlayingAudio(false);
    }
  };

  useEffect(() => {
    return () => {
      if (previewAudioRef.current) {
        previewAudioRef.current.pause();
        previewAudioRef.current = null;
      }
    };
  }, []);

  // Smooth & Instant Preview Delivery Queue
  const previewQueueRef = useRef<LocalChatMessage[]>([]);
  const isDrainingPreviewRef = useRef<boolean>(false);
  const previewDrainTimerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    return () => {
      if (previewDrainTimerRef.current) {
        clearTimeout(previewDrainTimerRef.current);
      }
    };
  }, []);

  const drainPreviewQueue = () => {
    if (previewQueueRef.current.length === 0) {
      isDrainingPreviewRef.current = false;
      return;
    }

    isDrainingPreviewRef.current = true;
    const nextMsg = previewQueueRef.current.shift();
    if (!nextMsg) {
      isDrainingPreviewRef.current = false;
      return;
    }

    setMessages((prev) => {
      if (nextMsg.id && prev.some((m) => m.id === nextMsg.id)) {
        return prev;
      }
      const curMax = settingsRef.current.maxMessages || 15;
      const next = [...prev, nextMsg];
      if (next.length > curMax) {
        return next.slice(next.length - curMax);
      }
      return next;
    });

    if (previewQueueRef.current.length > 0) {
      const remaining = previewQueueRef.current.length;
      const staggerDelay = remaining > 5 ? 100 : remaining > 2 ? 160 : 260;
      previewDrainTimerRef.current = setTimeout(() => {
        drainPreviewQueue();
      }, staggerDelay);
    } else {
      isDrainingPreviewRef.current = false;
    }
  };

  const enqueuePreviewMessage = (newMsg: LocalChatMessage, playSound = false) => {
    if (newMsg.id && previewQueueRef.current.some((m) => m.id === newMsg.id)) {
      return;
    }
    if (playSound && settingsRef.current.soundEnabled && typeof window !== 'undefined') {
      playPreviewSound(settingsRef.current.soundUrl, settingsRef.current.soundVolume);
    }
    previewQueueRef.current.push(newMsg);
    if (!isDrainingPreviewRef.current) {
      drainPreviewQueue();
    }
  };

  const token = streamerToken || 'demo-token';
  const obsUrl = `${typeof window !== 'undefined' ? window.location.origin : ''}/widget/chat/${token}`;

  const { socket, joinOverlayRoom } = useSocket();

  useEffect(() => {
    if (token) {
      joinOverlayRoom(token);
    }
  }, [token, joinOverlayRoom]);

  // Real-time socket listener so test messages from Subscribers tab and OBS sync into preview
  useEffect(() => {
    if (!socket) return;
    const handleIncomingChatMessage = (msg: any) => {
      if (!msg) return;
      const newMsg: LocalChatMessage = {
        id: msg.id || 'msg_' + Date.now(),
        author: msg.author || 'Viewer',
        message: msg.message || '',
        badge: msg.badge,
        badgeColor: msg.badgeColor,
        badgeBg: msg.badgeBg,
        badgeBorder: msg.badgeBorder,
        badgeIcon: msg.badgeIcon,
        badgeGifUrl: msg.badgeGifUrl || msg.badgeImage,
        badgeImage: msg.badgeImage || msg.badgeGifUrl,
        platform: msg.platform || 'youtube',
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      enqueuePreviewMessage(newMsg, true);
    };

    socket.on('chat:message', handleIncomingChatMessage);
    return () => {
      socket.off('chat:message', handleIncomingChatMessage);
    };
  }, [socket]);

  // Unsaved changes tracking
  const hasUnsavedChanges = useMemo(() => {
    return JSON.stringify(settings) !== JSON.stringify(savedSettings);
  }, [settings, savedSettings]);

  const [isEarthquake, setIsEarthquake] = useState(false);
  const earthquakeTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Broadcast unsaved changes status to top navbar and global dashboard
  useEffect(() => {
    window.dispatchEvent(new CustomEvent('chat-unsaved-changes', { detail: { hasUnsavedChanges } }));
    window.dispatchEvent(new CustomEvent('dashboard-unsaved-changes', { detail: { tab: 'chat', hasUnsaved: hasUnsavedChanges } }));
    if (!hasUnsavedChanges) {
      setIsEarthquake(false);
    }
  }, [hasUnsavedChanges]);

  // Listen for earthquake trigger when user attempts to navigate away without saving
  useEffect(() => {
    const handleEarthquake = (e: any) => {
      if (e.detail?.tab && e.detail.tab !== 'chat') return;
      if (!hasUnsavedChanges) return;

      setIsEarthquake(false);
      requestAnimationFrame(() => {
        setIsEarthquake(true);
      });

      if (earthquakeTimerRef.current) clearTimeout(earthquakeTimerRef.current);
      earthquakeTimerRef.current = setTimeout(() => {
        setIsEarthquake(false);
      }, 2800);
    };

    window.addEventListener('dashboard-unsaved-earthquake', handleEarthquake);
    return () => {
      window.removeEventListener('dashboard-unsaved-earthquake', handleEarthquake);
      if (earthquakeTimerRef.current) clearTimeout(earthquakeTimerRef.current);
    };
  }, [hasUnsavedChanges]);

  // Global listener for toggling / scrolling to chat settings
  useEffect(() => {
    const handleToggle = () => {
      toggleRightbar();
      if (settingsSectionRef.current) {
        settingsSectionRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    };
    window.addEventListener('toggle-live-chat-settings', handleToggle);
    return () => window.removeEventListener('toggle-live-chat-settings', handleToggle);
  }, [onToggleRightbar]);

  // Fetch saved settings on mount
  useEffect(() => {
    fetch(`/api/widgets/chat?token=${token}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          if (data.settings) {
            setSettings((prev) => ({ ...prev, ...data.settings }));
            setSavedSettings((prev) => ({ ...prev, ...data.settings }));
          }
        }
      })
      .catch((err) => console.error('Failed to load chat settings:', err))
      .finally(() => setLoading(false));
  }, [token]);

  // Auto-scroll chat feed to bottom
  useEffect(() => {
    if (chatScrollRef.current) {
      chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
    }
  }, [messages]);

  // Automatic sample message simulation every 2.5 seconds on the preview screen
  useEffect(() => {
    const simInterval = setInterval(() => {
      const randName = SAMPLE_NAMES[Math.floor(Math.random() * SAMPLE_NAMES.length)];
      const randText = SAMPLE_MESSAGES[Math.floor(Math.random() * SAMPLE_MESSAGES.length)];
      const randBadge = SAMPLE_BADGES[Math.floor(Math.random() * SAMPLE_BADGES.length)];
      const badgeConfig = randBadge ? SAMPLE_BADGE_PRESETS[randBadge] : null;

      const newSampleMsg: LocalChatMessage = {
        id: 'auto_' + Date.now() + '_' + Math.floor(Math.random() * 1000),
        author: randName,
        message: randText,
        badge: randBadge || undefined,
        badgeColor: badgeConfig?.color,
        badgeIcon: badgeConfig?.icon,
        platform: 'youtube',
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };

      enqueuePreviewMessage(newSampleMsg, false);
    }, 2500);

    return () => clearInterval(simInterval);
  }, [settings.maxMessages]);

  const copyObsUrl = () => {
    navigator.clipboard.writeText(obsUrl);
    setCopiedUrl(true);
    setTimeout(() => setCopiedUrl(false), 2000);
  };

  const handleResetChanges = () => {
    setIsEarthquake(false);
    setSettings(savedSettings);
  };

  const handleSaveSettings = async () => {
    setSaving(true);
    setSaveSuccess(false);
    setSaveError(null);
    try {
      const res = await fetch('/api/widgets/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token,
          action: 'save_settings',
          ...settings
        })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setIsEarthquake(false);
        if (data.settings) {
          setSettings((prev) => ({ ...prev, ...data.settings }));
          setSavedSettings((prev) => ({ ...prev, ...data.settings }));
        } else {
          setSavedSettings(settings);
        }
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 3000);
      } else {
        const errorMsg = data.error || 'Failed to save settings to database.';
        setSaveError(errorMsg);
        setTimeout(() => setSaveError(null), 5000);
      }
    } catch (err: any) {
      console.error('Error saving chat settings:', err);
      setSaveError(err.message || 'Network error saving chat settings.');
      setTimeout(() => setSaveError(null), 5000);
    } finally {
      setSaving(false);
    }
  };

  const handleSendTestMessage = async (customMsg?: string) => {
    setSendingTest(true);
    setTestSent(false);

    // Play notification sound on dashboard preview if sound is enabled
    if (settingsRef.current.soundEnabled && typeof window !== 'undefined') {
      playPreviewSound(settingsRef.current.soundUrl, settingsRef.current.soundVolume);
    }

    const sampleAuthors = ['CyberFan', 'SokhaAce', 'KompongChamp', 'GamerKhmer', 'ChakriyaX'];
    const sampleTexts = [
      'Amazing broadcast quality! ⚡',
      'Drop that link in chat! 🎯',
      'The vibe here is unmatched 🙌',
      'StreamBotKH live chat is clean!',
      'Hype hype hype! 🔥🔥🔥'
    ];
    const randIdx = Math.floor(Math.random() * sampleAuthors.length);

    const authorName = customMsg ? 'Streamer' : sampleAuthors[randIdx];
    const textContent = customMsg || sampleTexts[randIdx];

    const assignedBadge = randIdx % 2 === 0 ? 'VIP' : 'MOD';
    const badgePreset = SAMPLE_BADGE_PRESETS[assignedBadge];

    const testPayload = {
      token,
      action: 'test_message',
      author: authorName,
      message: textContent,
      badge: assignedBadge,
      badgeColor: badgePreset?.color,
      badgeIcon: badgePreset?.icon
    };

    if (socket && socket.connected) {
      socket.emit('chat:test_message', testPayload);
      setTestSent(true);
      setTimeout(() => setTestSent(false), 2000);
      setSendingTest(false);
      return;
    }

    try {
      await fetch('/api/widgets/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(testPayload)
      });
      setTestSent(true);
      setTimeout(() => setTestSent(false), 2000);
    } catch (err) {
      console.error('Failed to broadcast test chat message:', err);
    } finally {
      setSendingTest(false);
      setCustomInput('');
    }
  };

  const handleClearMessages = () => {
    setMessages([]);
  };

  if (isLocked) {
    return (
      <Card className="p-8 text-center bg-slate-900/60 border border-slate-800">
        <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center mx-auto mb-4 text-amber-400">
          <Lock className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-bold text-white mb-2 font-['Chakra_Petch']">Live Chat Widget is Pro Only</h2>
        <p className="text-slate-400 max-w-md mx-auto mb-6 text-sm">
          Upgrade to a Pro or Creator Plan to unlock real-time live chat overlay on your OBS stream with customizable themes, animations, and auto-fade.
        </p>
        {onUpgrade && (
          <Button onClick={onUpgrade} className="bg-gradient-to-r from-amber-500 to-orange-500 text-slate-950 font-bold">
            Upgrade to Pro
          </Button>
        )}
      </Card>
    );
  }

  // Font size class with proportional line heights to lock Y-pitch
  const getFontSizeClass = (size: string) => {
    switch (size) {
      case 'sm':
        return 'text-xs leading-5';
      case 'lg':
        return 'text-base leading-6';
      case 'xl':
        return 'text-lg leading-7';
      case 'base':
      default:
        return 'text-sm leading-5';
    }
  };

  const getBadgeClass = (badge: string) => {
    switch (badge) {
      case 'MOD':
        return 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40';
      case 'VIP':
        return 'bg-amber-500/20 text-amber-300 border border-amber-500/40';
      case 'MEMBER':
        return 'bg-purple-500/20 text-purple-300 border border-purple-500/40';
      case 'SUPPORTER':
        return 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40';
      default:
        return 'bg-blue-500/20 text-blue-300 border border-blue-500/40';
    }
  };

  const getTextStrokeCSS = () => {
    const width = Number(settings.textBorderWidth) || 0;
    if (width <= 0) return undefined;
    return `${width}px ${settings.textBorderColor || '#000000'}`;
  };

  const getTextShadowCSS = () => {
    if (!settings.textShadowStyle || settings.textShadowStyle === 'none') {
      return 'none';
    }
    const color = settings.textShadowColor || 'rgba(0,0,0,0.95)';
    const blur = settings.textShadowBlur ?? 4;
    switch (settings.textShadowStyle) {
      case 'soft':
        return `0 1px 2px ${color}`;
      case 'glow':
        return `0 0 ${blur || 8}px ${settings.authorColor || '#00F0FF'}, 0 0 16px ${settings.authorColor || '#00F0FF'}`;
      case 'custom':
        return `0 2px ${blur}px ${color}`;
      case 'strong':
        return `0 2px ${blur}px ${color}, 0 0 2px ${color}`;
      default:
        return 'none';
    }
  };

  const renderBadgeIcon = (iconName?: string, color?: string) => {
    const IconComp = getBadgeIconComponent(iconName || 'Crown');
    return (
      <IconComp
        className="w-3.5 h-3.5 flex-shrink-0"
        style={{ color: color || '#00F0FF' }}
      />
    );
  };

  const renderPlatformIcon = (platform: string = 'youtube') => {
    if (platform === 'twitch') {
      return (
        <span className="inline-flex items-center justify-center w-4 h-4 rounded-[4px] bg-[#9146FF] text-white flex-shrink-0 shadow-sm" title="Twitch">
          <svg viewBox="0 0 24 24" className="w-2.5 h-2.5 fill-current"><path d="M11.571 4.714h1.715v5.143H11.57zm4.715 0H18v5.143h-1.714zM6 0L1.714 4.286v15.428h5.143V24l4.286-4.286h3.428L22.286 12V0zm14.571 11.143l-3.428 3.428h-3.429l-3 3v-3H6.857V1.714h13.714Z"/></svg>
        </span>
      );
    }
    // YouTube Official Logo: Vibrant red button container with crisp white play triangle
    return (
      <span className="inline-flex items-center justify-center flex-shrink-0" title="YouTube Live">
        <svg viewBox="0 0 24 24" className="w-[18px] h-[18px] flex-shrink-0 drop-shadow-sm">
          <path
            fill="#FF0000"
            d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814z"
          />
          <polygon
            fill="#FFFFFF"
            points="9.545,15.568 15.818,12 9.545,8.432"
          />
        </svg>
      </span>
    );
  };

  return (
    <div className="relative w-full h-full flex-1 min-h-0 flex flex-col">
      <style>{CHAT_ANIMATIONS_CSS}</style>

      {/* ============================================================== */}
      {/* 2-COLUMN LIVE WEB APPLICATION WORKSPACE                        */}
      {/* (DESKTOP: LIVE RIGHTBAR CONTENT, MOBILE: BOTTOM PAGE)          */}
      {/* ============================================================== */}
      <div className="w-full flex-1 min-h-0 flex flex-col lg:flex-row gap-3 sm:gap-4 items-stretch overflow-hidden">
        {/* LEFT COLUMN: MAIN SIMPLE LIVE CHAT STAGE */}
        <div className="relative flex-1 min-w-0 w-full rounded-2xl bg-slate-950 border border-slate-800/90 shadow-2xl overflow-hidden flex flex-col min-h-[480px] lg:min-h-0 h-full">
          {/* Chat Stage Top Header */}
          <div className="px-4 py-3 bg-[#0a0f1d] border-b border-slate-800 flex items-center justify-between gap-2 flex-shrink-0 z-10">
            <div className="flex items-center gap-2 min-w-0">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.8)] flex-shrink-0" />
              <span className="text-xs font-bold text-white font-['Chakra_Petch'] tracking-wide truncate">
                LIVE STREAM CHAT
              </span>
              <span className="text-[10px] text-slate-500 font-mono hidden sm:inline flex-shrink-0">
                ({messages.length} messages)
              </span>
              <span className="text-[10px] text-cyan-400 font-mono hidden md:inline-flex items-center gap-1 bg-cyan-950/60 px-2 py-0.5 rounded border border-cyan-800/40 flex-shrink-0">
                <Maximize2 className="w-2.5 h-2.5" />
                {settings.overlayWidth ? `${settings.overlayWidth}px` : 'Auto'} × {settings.overlayHeight ? `${settings.overlayHeight}px` : 'Auto'}
              </span>
            </div>

            <div className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0">
              {/* Copy OBS URL Button */}
              <button
                type="button"
                onClick={copyObsUrl}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all border cursor-pointer ${
                  copiedUrl
                    ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 shadow-[0_0_8px_rgba(16,185,129,0.3)]'
                    : 'bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                }`}
                title="Copy OBS Overlay URL"
              >
                {copiedUrl ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3 text-cyan-400" />}
                <span className="hidden xs:inline">{copiedUrl ? 'Copied' : 'Copy OBS URL'}</span>
              </button>

              {/* Open Overlay in Tab */}
              <a
                href={obsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="p-1 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-750 transition-colors flex items-center justify-center"
                title="Open OBS Overlay in new tab"
              >
                <ExternalLink className="w-3.5 h-3.5" />
              </a>

              <button
                type="button"
                onClick={handleClearMessages}
                className="p-1.5 rounded-lg text-slate-400 hover:text-red-400 hover:bg-slate-900 transition-colors"
                title="Clear Messages"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>

              <button
                type="button"
                onClick={() => handleSendTestMessage()}
                disabled={sendingTest}
                className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 text-[11px] font-semibold transition-all"
              >
                <Sparkles className="w-3 h-3 text-amber-400" />
                <span>Simulate</span>
              </button>

              {/* Toggle Rightbar Settings on Mobile */}
              <button
                type="button"
                onClick={toggleRightbar}
                className={`lg:hidden flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all border cursor-pointer ${
                  isRightbarOpen
                    ? 'bg-cyan-500 text-slate-950 border-cyan-400 shadow-[0_0_10px_rgba(0,240,255,0.4)]'
                    : 'bg-slate-900 hover:bg-slate-800 text-cyan-300 border-cyan-500/30'
                }`}
                title={isRightbarOpen ? 'Close Settings' : 'Open Settings'}
                aria-label="Toggle Chat Settings"
              >
                <Sliders className="w-3.5 h-3.5" />
                <span>Settings</span>
              </button>
            </div>
          </div>

        {/* Scrollable Chat Feed Area - Anchored to bottom like OBS Stream Overlay */}
        <div
          ref={chatScrollRef}
          className="flex-1 p-4 sm:p-6 overflow-y-auto no-scrollbar relative flex flex-col justify-end"
          style={{
            backgroundImage: 'radial-gradient(ellipse at top, #0f172a 0%, #030712 100%)',
            fontFamily: settings.fontFamily || 'Chakra Petch, sans-serif'
          }}
        >
          {/* Subtle Grid Lines */}
          <div className="absolute inset-0 opacity-10 bg-[radial-gradient(#38bdf8_1px,transparent_1px)] [background-size:20px_20px] pointer-events-none" />

          {/* OBS Canvas Bounds Indicator & Message Container */}
          <div
            className="w-full mx-auto z-10 relative flex flex-col justify-end transition-all duration-300"
            style={{
              width: settings.overlayWidth && settings.overlayWidth > 0 ? `${settings.overlayWidth}px` : '100%',
              maxWidth: settings.overlayWidth && settings.overlayWidth > 0 ? `${settings.overlayWidth}px` : '100%',
              maxHeight: settings.overlayHeight && settings.overlayHeight > 0 ? `${settings.overlayHeight}px` : undefined
            }}
          >
            {messages.length === 0 ? (
              <div className="py-12 flex flex-col items-center justify-center text-center text-slate-500 space-y-2">
                <MessageSquare className="w-8 h-8 opacity-40 text-cyan-400" />
                <p className="text-xs">No chat messages yet.</p>
                <p className="text-[11px] text-slate-600">
                  Click <strong className="text-slate-400">Simulate</strong> or type a message below to broadcast to OBS.
                </p>
              </div>
            ) : (
              messages.map((item) => (
                <div
                  key={item.id}
                  className={`w-full p-1 sm:p-1.5 mb-1 select-none chat-anim-${settings.animationStyle || 'slide-left'} ${getFontSizeClass(settings.fontSize)}`}
                >
                  {/* Format: [logo] {username} {badges}: {first part of message} */}
                  {/* Wrapped lines wrap indented under message, never under logo */}
                  <div className="w-full flex items-baseline gap-1.5 select-none break-words [overflow-wrap:anywhere] [word-break:break-word] text-left">
                    <div className="flex-shrink-0 inline-flex items-baseline gap-1 self-baseline select-none whitespace-nowrap">
                      <span className="inline-flex items-center justify-center self-center flex-shrink-0">
                        {renderPlatformIcon((item as any).platform || 'youtube')}
                      </span>
                      <span
                        className="font-bold tracking-wide"
                        style={{
                          color: settings.authorColor && settings.authorColor !== '#000000' ? settings.authorColor : '#00F0FF',
                          fontFamily: settings.authorFontFamily || settings.fontFamily || 'Chakra Petch',
                          WebkitTextStroke: getTextStrokeCSS(),
                          paintOrder: 'stroke fill',
                          textShadow: getTextShadowCSS()
                        }}
                      >
                        {item.author}
                      </span>
                      {settings.showBadges && (item.badge || item.badgeIcon || item.badgeImage || item.badgeGifUrl) && (
                        <span
                          className="inline-flex items-center self-center flex-shrink-0 leading-none"
                          style={{ color: item.badgeColor || '#00F0FF' }}
                          title={item.badge || 'Subscriber'}
                        >
                          {item.badgeImage || item.badgeGifUrl ? (
                            <img
                              src={item.badgeImage || item.badgeGifUrl}
                              alt="Badge"
                              className="w-3.5 h-3.5 object-contain inline-block flex-shrink-0"
                            />
                          ) : (
                            renderBadgeIcon(item.badgeIcon, item.badgeColor || '#00F0FF')
                          )}
                          {item.badge ? (
                            <span
                              className="text-[9px] font-extrabold uppercase tracking-wider ml-1 leading-none"
                              style={{ color: item.badgeColor || '#00F0FF' }}
                            >
                              {item.badge}
                            </span>
                          ) : null}
                        </span>
                      )}
                      <span className="font-bold text-slate-300">:</span>
                    </div>
                    <div
                      className="flex-1 min-w-0 text-left font-medium text-white"
                      style={{
                        color: settings.messageColor && settings.messageColor !== '#000000' ? settings.messageColor : '#FFFFFF',
                        fontFamily: settings.messageFontFamily || settings.fontFamily || 'Inter',
                        WebkitTextStroke: getTextStrokeCSS(),
                        paintOrder: 'stroke fill',
                        textShadow: getTextShadowCSS(),
                        wordBreak: 'break-word',
                        overflowWrap: 'anywhere'
                      }}
                    >
                      <span>{item.message}</span>
                      {settings.showTimestamp && (
                        <span className="text-[10px] text-slate-400 ml-2 select-none opacity-75 inline-block">
                          {item.time}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Quick Tag Pills */}
        <div className="px-4 py-2 bg-slate-900/90 border-t border-slate-800/80 flex items-center gap-2 overflow-x-auto no-scrollbar flex-shrink-0">
          <span className="text-[10px] text-slate-500 font-mono uppercase flex-shrink-0">Quick Chat:</span>
          {QUICK_TAGS.map((tag) => (
            <button
              key={tag}
              type="button"
              onClick={() => handleSendTestMessage(tag)}
              className="px-2.5 py-1 rounded-lg bg-slate-950 hover:bg-slate-800 text-[11px] text-slate-300 hover:text-white border border-slate-800 whitespace-nowrap transition-colors flex-shrink-0"
            >
              {tag}
            </button>
          ))}
        </div>

        {/* Bottom Interactive Message Composer */}
        <div className="p-3 sm:p-4 bg-[#0a0f1d] border-t border-slate-800 flex-shrink-0">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (customInput.trim()) {
                handleSendTestMessage(customInput.trim());
              }
            }}
            className="flex items-center gap-2"
          >
            <input
              type="text"
              placeholder="Type a chat message to send to your OBS stream..."
              value={customInput}
              onChange={(e) => setCustomInput(e.target.value)}
              className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400"
            />
            <Button
              type="submit"
              disabled={sendingTest || !customInput.trim()}
              className="bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold px-4 py-2.5 rounded-xl text-xs flex items-center gap-1.5 transition-all"
            >
              <Send className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Send</span>
            </Button>
          </form>
        </div>
      </div>

      {/* ============================================================== */}
      {/* MOBILE BACKDROP OVERLAY                                        */}
      {/* ============================================================== */}
      {isRightbarOpen && (
        <div
          className="fixed inset-0 z-[90] bg-black/80 backdrop-blur-md lg:hidden transition-opacity duration-200"
          onClick={closeRightbar}
        />
      )}

      {/* ============================================================== */}
      {/* RIGHT COLUMN: LIVE RIGHTBAR SETTINGS (FITS ON WEBPAGE)         */}
      {/* (DESKTOP: RIGHT COLUMN | MOBILE: RESPONSIVE MODAL WEB APP)     */}
      {/* ============================================================== */}
      <aside
        ref={settingsSectionRef}
        id="chat-settings-section"
        className={`
          ${isRightbarOpen
            ? 'fixed inset-0 sm:inset-y-0 sm:right-0 sm:left-auto z-[100] w-full sm:w-[420px] bg-[#090D18] sm:border-l border-slate-800 shadow-2xl flex flex-col h-[100dvh] max-h-[100dvh] overflow-hidden animate-in slide-in-from-right duration-200'
            : 'hidden'
          }
          lg:relative lg:inset-auto lg:z-auto lg:w-[340px] xl:w-[370px] lg:flex lg:flex-col lg:rounded-2xl lg:border lg:border-slate-800/90 lg:shadow-2xl lg:h-full lg:overflow-hidden lg:min-h-0 flex-shrink-0
        `}
      >
          {/* Rightbar Header Deck */}
          <div className="p-4 sm:p-5 border-b border-slate-800 bg-[#060911]/90 flex items-center justify-between gap-3 flex-shrink-0">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-lg bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 shadow-inner flex-shrink-0">
                <Sliders className="w-4 h-4" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-bold text-white font-['Chakra_Petch'] uppercase tracking-wider">
                    Chat Settings
                  </h3>
                  <span className="px-1.5 py-0.5 rounded text-[9px] font-mono font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                    LIVE
                  </span>
                </div>
                <p className="text-[10px] text-slate-400">Live customization &amp; overlay sync</p>
              </div>
            </div>

            <div className="flex items-center gap-2 flex-shrink-0">
              {hasUnsavedChanges && (
                <span className="hidden sm:inline text-[10px] font-mono text-amber-400 font-semibold px-2 py-0.5 rounded bg-amber-500/10 border border-amber-500/30 animate-pulse">
                  Unsaved
                </span>
              )}
              {saveSuccess && (
                <span className="text-[10px] font-mono text-emerald-400 font-bold px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/30 flex items-center gap-1 animate-in fade-in">
                  <Check size={11} className="text-emerald-400" />
                  <span>Saved</span>
                </span>
              )}
              <Button
                type="button"
                variant="primary"
                size="sm"
                onClick={handleSaveSettings}
                loading={saving}
                disabled={!hasUnsavedChanges && !saveSuccess}
                className={`font-bold font-mono text-xs px-3 shadow-md transition-all ${
                  hasUnsavedChanges
                    ? 'bg-cyan-400 hover:bg-cyan-300 text-slate-950 shadow-[0_0_12px_rgba(0,240,255,0.35)]'
                    : 'bg-slate-800 text-slate-400 border border-slate-700/80 cursor-default opacity-80'
                }`}
              >
                <Save size={12} className={hasUnsavedChanges ? 'text-slate-950' : 'text-slate-400'} />
                <span>Save</span>
              </Button>
              {/* Mobile Close Button */}
              <button
                type="button"
                onClick={closeRightbar}
                className="lg:hidden w-8 h-8 rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
                title="Close Settings"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Error Alert Banner if Save failed */}
          {saveError && (
            <div className="px-4 py-2.5 bg-red-950/80 border-b border-red-500/40 text-red-200 text-xs flex items-center gap-2 animate-in fade-in">
              <AlertTriangle size={14} className="text-red-400 flex-shrink-0" />
              <span className="flex-1 text-[11px] font-medium leading-tight">{saveError}</span>
              <button
                type="button"
                onClick={() => setSaveError(null)}
                className="text-red-400 hover:text-white p-0.5"
              >
                <X size={12} />
              </button>
            </div>
          )}

        {/* Scrollable Settings Content Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-5 no-scrollbar">
          {/* SECTION 1: TYPOGRAPHY (2 DIFFERENT FONTS: USERNAME & MESSAGE) */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-white font-bold text-xs">
              <Type className="w-3.5 h-3.5 text-cyan-400" />
              <span>Typography (2 Fonts)</span>
            </div>

            <div className="space-y-3">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-[11px] text-slate-300 font-medium">Username Font</label>
                  <span className="text-[9px] text-cyan-400 font-mono">
                    {settings.authorFontFamily || 'Chakra Petch'}
                  </span>
                </div>
                <select
                  value={settings.authorFontFamily || settings.fontFamily || 'Chakra Petch'}
                  onChange={(e) => setSettings({ ...settings, authorFontFamily: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-400"
                >
                  {CHAT_FONTS.map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-[11px] text-slate-300 font-medium">Message Font</label>
                  <span className="text-[9px] text-cyan-400 font-mono">
                    {settings.messageFontFamily || 'Inter'}
                  </span>
                </div>
                <select
                  value={settings.messageFontFamily || 'Inter'}
                  onChange={(e) => setSettings({ ...settings, messageFontFamily: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-400"
                >
                  {CHAT_FONTS.map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[11px] text-slate-400 block mb-1 font-medium">Font Size</label>
                <div className="grid grid-cols-4 gap-1.5">
                  {(['sm', 'base', 'lg', 'xl'] as const).map((sz) => (
                    <button
                      key={sz}
                      onClick={() => setSettings({ ...settings, fontSize: sz })}
                      className={`py-1.5 text-xs font-semibold rounded-lg border uppercase transition-all ${
                        settings.fontSize === sz
                          ? 'border-cyan-400 bg-cyan-500/20 text-cyan-300'
                          : 'border-slate-800 bg-slate-950 text-slate-400 hover:text-white'
                      }`}
                    >
                      {sz}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* SECTION: TEXT BORDER & SHADOW (STROKE & GLOW) */}
          <div className="space-y-3.5 pt-3 border-t border-slate-800/80">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-white font-bold text-xs">
                <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                <span>Text Border & Shadow</span>
              </div>
              <span className="text-[10px] text-cyan-400 font-mono">
                {settings.textBorderWidth ? `${settings.textBorderWidth}px stroke` : 'No border'} • {settings.textShadowStyle || 'strong'}
              </span>
            </div>

            {/* 1. Text Border (Outline / Stroke) */}
            <div className="space-y-2 p-3 rounded-xl bg-slate-950/80 border border-slate-800">
              <div className="flex items-center justify-between">
                <label className="text-[11px] font-semibold text-slate-300">Text Outline Border</label>
                <span className="text-[10px] text-cyan-400 font-mono font-bold">
                  {settings.textBorderWidth === 0 ? 'Off (0px)' : `${settings.textBorderWidth}px`}
                </span>
              </div>

              {/* Stroke Width Buttons: 0px, 1px, 2px, 3px, 4px */}
              <div className="grid grid-cols-5 gap-1.5">
                {[0, 1, 2, 3, 4].map((w) => {
                  const isSelected = (settings.textBorderWidth ?? 0) === w;
                  return (
                    <button
                      key={w}
                      type="button"
                      onClick={() => setSettings({ ...settings, textBorderWidth: w })}
                      className={`py-1.5 rounded-lg border text-xs font-mono font-bold transition-all cursor-pointer text-center ${
                        isSelected
                          ? 'bg-cyan-500/20 border-cyan-400 text-cyan-300 shadow-[0_0_8px_rgba(0,240,255,0.3)]'
                          : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white hover:border-slate-700'
                      }`}
                    >
                      {w === 0 ? 'None' : `${w}px`}
                    </button>
                  );
                })}
              </div>

              {/* Stroke Color Picker & Presets */}
              {(settings.textBorderWidth ?? 0) > 0 && (
                <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 flex-1">
                    <input
                      type="color"
                      value={settings.textBorderColor?.startsWith('#') && settings.textBorderColor.length === 7 ? settings.textBorderColor : '#000000'}
                      onChange={(e) => setSettings({ ...settings, textBorderColor: e.target.value })}
                      className="w-6 h-6 rounded border-0 cursor-pointer p-0 bg-transparent"
                      title="Choose outline color"
                    />
                    <input
                      type="text"
                      value={settings.textBorderColor || '#000000'}
                      onChange={(e) => setSettings({ ...settings, textBorderColor: e.target.value })}
                      className="w-20 bg-slate-900 border border-slate-800 rounded px-2 py-1 text-[11px] font-mono text-white uppercase focus:outline-none focus:border-cyan-400"
                      maxLength={7}
                    />
                  </div>

                  {/* Quick Color Swatches */}
                  <div className="flex items-center gap-1">
                    {[
                      { color: '#000000', name: 'Black' },
                      { color: '#0B101E', name: 'Dark Navy' },
                      { color: '#FFFFFF', name: 'White' },
                      { color: '#00F0FF', name: 'Cyan' },
                      { color: '#F59E0B', name: 'Amber' }
                    ].map((swatch) => (
                      <button
                        key={swatch.color}
                        type="button"
                        onClick={() => setSettings({ ...settings, textBorderColor: swatch.color })}
                        className={`w-5 h-5 rounded-md border transition-all cursor-pointer ${
                          settings.textBorderColor?.toLowerCase() === swatch.color.toLowerCase()
                            ? 'ring-2 ring-cyan-400 scale-110'
                            : 'border-slate-800 hover:scale-105'
                        }`}
                        style={{ backgroundColor: swatch.color }}
                        title={swatch.name}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* 2. Text Shadow */}
            <div className="space-y-2 p-3 rounded-xl bg-slate-950/80 border border-slate-800">
              <div className="flex items-center justify-between">
                <label className="text-[11px] font-semibold text-slate-300">Text Shadow & Glow</label>
                <span className="text-[10px] text-cyan-400 font-mono font-bold capitalize">
                  {settings.textShadowStyle || 'strong'}
                </span>
              </div>

              {/* Shadow Style Options: None, Soft, Strong, Glow */}
              <div className="grid grid-cols-4 gap-1.5">
                {[
                  { id: 'none', label: 'None' },
                  { id: 'soft', label: 'Soft' },
                  { id: 'strong', label: 'Strong' },
                  { id: 'glow', label: 'Neon' }
                ].map((s) => {
                  const isSelected = (settings.textShadowStyle || 'strong') === s.id;
                  return (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => setSettings({ ...settings, textShadowStyle: s.id as any })}
                      className={`py-1.5 rounded-lg border text-xs font-semibold transition-all cursor-pointer text-center ${
                        isSelected
                          ? 'bg-cyan-500/20 border-cyan-400 text-cyan-300 shadow-[0_0_8px_rgba(0,240,255,0.3)]'
                          : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white hover:border-slate-700'
                      }`}
                    >
                      {s.label}
                    </button>
                  );
                })}
              </div>

              {/* Shadow Blur & Color if not 'none' */}
              {(settings.textShadowStyle || 'strong') !== 'none' && (
                <div className="pt-2 border-t border-slate-800/80 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-[10px] text-slate-400 font-medium">Shadow Blur</span>
                    <span className="text-cyan-400 font-mono font-bold text-[10px]">{settings.textShadowBlur ?? 4}px</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="16"
                    step="1"
                    value={settings.textShadowBlur ?? 4}
                    onChange={(e) => setSettings({ ...settings, textShadowBlur: Number(e.target.value) })}
                    className="w-full h-1.5 bg-slate-900 rounded-lg appearance-none cursor-pointer accent-cyan-400"
                  />
                </div>
              )}
            </div>
          </div>

          {/* SECTION 2: OVERLAY DIMENSIONS (WIDTH & HEIGHT) */}
          <div className="space-y-3 pt-3 border-t border-slate-800/80">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-white font-bold text-xs">
                <Maximize2 className="w-3.5 h-3.5 text-cyan-400" />
                <span>Overlay Dimensions</span>
              </div>
              <span className="text-[10px] text-cyan-400 font-mono font-bold">
                {settings.overlayWidth ? `${settings.overlayWidth}px` : 'Auto'} × {settings.overlayHeight ? `${settings.overlayHeight}px` : 'Auto'}
              </span>
            </div>

            {/* Presets */}
            <div className="grid grid-cols-5 gap-1">
              {[
                { label: 'Auto (0)', w: 0, h: 0 },
                { label: 'Compact', w: 360, h: 480 },
                { label: 'Standard', w: 420, h: 600 },
                { label: 'Wide', w: 560, h: 720 },
                { label: 'HD Box', w: 640, h: 800 }
              ].map((p) => {
                const active = settings.overlayWidth === p.w && settings.overlayHeight === p.h;
                return (
                  <button
                    key={p.label}
                    type="button"
                    onClick={() => setSettings({ ...settings, overlayWidth: p.w, overlayHeight: p.h })}
                    className={`py-1.5 px-0.5 rounded-lg border text-[10px] font-mono font-semibold transition-all truncate text-center ${
                      active
                        ? 'border-cyan-400 bg-cyan-500/20 text-cyan-300 shadow-[0_0_8px_rgba(0,240,255,0.2)]'
                        : 'border-slate-800 bg-slate-950 text-slate-400 hover:text-white hover:border-slate-700'
                    }`}
                  >
                    {p.label}
                  </button>
                );
              })}
            </div>

            {/* Width & Height Number Inputs & Sliders from 0 */}
            <div className="space-y-2.5">
              <div>
                <div className="flex justify-between items-center text-xs mb-1">
                  <span className="text-[11px] text-slate-400 font-medium">Width (W) — 0 for Auto</span>
                  <div className="flex items-center gap-1">
                    <input
                      type="number"
                      min="0"
                      max="1920"
                      step="1"
                      value={settings.overlayWidth ?? 420}
                      onChange={(e) => setSettings({ ...settings, overlayWidth: Math.max(0, Number(e.target.value) || 0) })}
                      className="w-16 bg-slate-950 border border-slate-800 rounded px-1.5 py-0.5 text-right font-mono text-cyan-400 text-xs focus:outline-none focus:border-cyan-400"
                    />
                    <span className="text-[10px] text-slate-500 font-mono">px</span>
                  </div>
                </div>
                <input
                  type="range"
                  min="0"
                  max="1920"
                  step="5"
                  value={settings.overlayWidth ?? 420}
                  onChange={(e) => setSettings({ ...settings, overlayWidth: Number(e.target.value) })}
                  className="w-full h-1.5 bg-slate-950 rounded-lg appearance-none cursor-pointer accent-cyan-400"
                />
              </div>

              <div>
                <div className="flex justify-between items-center text-xs mb-1">
                  <span className="text-[11px] text-slate-400 font-medium">Height (H) — 0 for Auto</span>
                  <div className="flex items-center gap-1">
                    <input
                      type="number"
                      min="0"
                      max="1440"
                      step="1"
                      value={settings.overlayHeight ?? 600}
                      onChange={(e) => setSettings({ ...settings, overlayHeight: Math.max(0, Number(e.target.value) || 0) })}
                      className="w-16 bg-slate-950 border border-slate-800 rounded px-1.5 py-0.5 text-right font-mono text-cyan-400 text-xs focus:outline-none focus:border-cyan-400"
                    />
                    <span className="text-[10px] text-slate-500 font-mono">px</span>
                  </div>
                </div>
                <input
                  type="range"
                  min="0"
                  max="1440"
                  step="5"
                  value={settings.overlayHeight ?? 600}
                  onChange={(e) => setSettings({ ...settings, overlayHeight: Number(e.target.value) })}
                  className="w-full h-1.5 bg-slate-950 rounded-lg appearance-none cursor-pointer accent-cyan-400"
                />
              </div>
            </div>

            {/* OBS Recommendation Hint */}
            <div className="p-2.5 rounded-xl bg-cyan-950/20 border border-cyan-500/20 flex items-start gap-2">
              <span className="text-[10px] text-cyan-300/90 leading-tight">
                💡 Set Width or Height to <strong className="text-white font-mono">0</strong> for Auto / Full width. In OBS Studio Browser Source properties, set Width: <strong className="text-white font-mono">{settings.overlayWidth || 1920}</strong> and Height: <strong className="text-white font-mono">{settings.overlayHeight || 1080}</strong>.
              </span>
            </div>
          </div>

          {/* SECTION 3: ANIMATION STYLES (20 UNIQUE ANIMATIONS) */}
          <div className="space-y-3 pt-3 border-t border-slate-800/80">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-white font-bold text-xs">
                <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                <span>Animation Style</span>
                <span className="px-1.5 py-0.5 rounded-full text-[9px] font-black bg-cyan-500/20 text-cyan-300 border border-cyan-500/40">
                  {ANIMATION_STYLES.length}
                </span>
              </div>
              <span className="text-[10px] text-cyan-400 font-mono capitalize">
                {settings.animationStyle || 'slide-left'}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2 max-h-60 overflow-y-auto pr-1 no-scrollbar">
              {ANIMATION_STYLES.map((anim) => {
                const isSelected = (settings.animationStyle || 'slide-left') === anim.id;
                return (
                  <button
                    key={anim.id}
                    type="button"
                    onClick={() => setSettings({ ...settings, animationStyle: anim.id })}
                    className={`p-2.5 rounded-xl border text-left transition-all relative overflow-hidden group cursor-pointer ${
                      isSelected
                        ? 'border-cyan-400 bg-cyan-500/15 text-white shadow-[0_0_12px_rgba(0,240,255,0.25)]'
                        : 'border-slate-800/90 bg-slate-950/80 text-slate-300 hover:border-slate-700 hover:text-white'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[11px] font-bold truncate">
                        {anim.name}
                      </span>
                      {isSelected && (
                        <Check className="w-3 h-3 text-cyan-400 flex-shrink-0" />
                      )}
                    </div>
                    <div className="text-[9px] text-slate-400 truncate font-mono">
                      {anim.desc}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* SECTION 4: COLORS */}
          <div className="space-y-3 pt-3 border-t border-slate-800/80">
            <div className="flex items-center gap-2 text-white font-bold text-xs">
              <Palette className="w-3.5 h-3.5 text-cyan-400" />
              <span>Colors</span>
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-[10px] text-slate-400 truncate">Author Color</label>
                  <span className="text-[9px] text-cyan-400 font-mono">{settings.authorColor || '#00F0FF'}</span>
                </div>
                <div className="flex items-center gap-1.5 bg-slate-950 border border-slate-800 rounded-xl p-1.5">
                  <input
                    type="color"
                    value={settings.authorColor?.startsWith('#') && settings.authorColor.length === 7 ? settings.authorColor : '#00F0FF'}
                    onChange={(e) => setSettings({ ...settings, authorColor: e.target.value })}
                    className="w-6 h-6 rounded border-0 bg-transparent cursor-pointer"
                  />
                  <input
                    type="text"
                    value={settings.authorColor || '#00F0FF'}
                    onChange={(e) => setSettings({ ...settings, authorColor: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-800 rounded px-1.5 py-0.5 text-[10px] font-mono text-white uppercase focus:outline-none focus:border-cyan-400"
                    maxLength={7}
                  />
                </div>
                {/* Author Color Swatches */}
                <div className="flex items-center gap-1 mt-1.5">
                  {[
                    { color: '#00F0FF', name: 'Cyber Cyan' },
                    { color: '#F59E0B', name: 'Amber Gold' },
                    { color: '#10B981', name: 'Emerald' },
                    { color: '#A855F7', name: 'Purple' },
                    { color: '#EC4899', name: 'Neon Pink' },
                    { color: '#FFFFFF', name: 'Pure White' }
                  ].map((swatch) => (
                    <button
                      key={swatch.color}
                      type="button"
                      onClick={() => setSettings({ ...settings, authorColor: swatch.color })}
                      className={`w-4 h-4 rounded-md border transition-all cursor-pointer ${
                        settings.authorColor?.toLowerCase() === swatch.color.toLowerCase()
                          ? 'ring-2 ring-cyan-400 scale-110'
                          : 'border-slate-800 hover:scale-105'
                      }`}
                      style={{ backgroundColor: swatch.color }}
                      title={swatch.name}
                    />
                  ))}
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-[10px] text-slate-400 truncate">Message Color</label>
                  <span className="text-[9px] text-cyan-400 font-mono">{settings.messageColor || '#FFFFFF'}</span>
                </div>
                <div className="flex items-center gap-1.5 bg-slate-950 border border-slate-800 rounded-xl p-1.5">
                  <input
                    type="color"
                    value={settings.messageColor?.startsWith('#') && settings.messageColor.length === 7 && settings.messageColor !== '#000000' ? settings.messageColor : '#FFFFFF'}
                    onChange={(e) => setSettings({ ...settings, messageColor: e.target.value })}
                    className="w-6 h-6 rounded border-0 bg-transparent cursor-pointer"
                  />
                  <input
                    type="text"
                    value={settings.messageColor || '#FFFFFF'}
                    onChange={(e) => setSettings({ ...settings, messageColor: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-800 rounded px-1.5 py-0.5 text-[10px] font-mono text-white uppercase focus:outline-none focus:border-cyan-400"
                    maxLength={7}
                  />
                </div>
                {/* Message Color Swatches */}
                <div className="flex items-center gap-1 mt-1.5">
                  {[
                    { color: '#FFFFFF', name: 'Pure White' },
                    { color: '#F1F5F9', name: 'Slate White' },
                    { color: '#E2E8F0', name: 'Soft Light Gray' },
                    { color: '#E0F2FE', name: 'Sky Frost' },
                    { color: '#FEF08A', name: 'Light Cream' },
                    { color: '#DCFCE7', name: 'Soft Mint' }
                  ].map((swatch) => (
                    <button
                      key={swatch.color}
                      type="button"
                      onClick={() => setSettings({ ...settings, messageColor: swatch.color })}
                      className={`w-4 h-4 rounded-md border transition-all cursor-pointer ${
                        settings.messageColor?.toLowerCase() === swatch.color.toLowerCase()
                          ? 'ring-2 ring-cyan-400 scale-110'
                          : 'border-slate-800 hover:scale-105'
                      }`}
                      style={{ backgroundColor: swatch.color }}
                      title={swatch.name}
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* SECTION 5: LIVE CHAT NOTIFICATION SOUND */}
          <div className="space-y-3 pt-3 border-t border-slate-800/80">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-white font-bold text-xs">
                <Volume2 className="w-3.5 h-3.5 text-cyan-400" />
                <span>Notification Sound</span>
              </div>
              <div className="flex items-center gap-2">
                <span className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded ${
                  settings.soundEnabled
                    ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                    : 'bg-slate-800 text-slate-400 border border-slate-700'
                }`}>
                  {settings.soundEnabled ? 'ON' : 'MUTED'}
                </span>
                {/* Sound Toggle Switch */}
                <button
                  type="button"
                  onClick={() => setSettings((prev) => ({ ...prev, soundEnabled: !prev.soundEnabled }))}
                  className={`w-10 h-5 flex items-center rounded-full p-0.5 transition-colors cursor-pointer ${
                    settings.soundEnabled ? 'bg-cyan-500' : 'bg-slate-700'
                  }`}
                  title={settings.soundEnabled ? 'Mute chat sound' : 'Enable chat sound'}
                >
                  <div
                    className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${
                      settings.soundEnabled ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>
            </div>

            <p className="text-[10px] text-slate-400 leading-normal">
              Plays an audio chime on your stream overlay and dashboard whenever someone sends a live chat message.
            </p>

            {settings.soundEnabled && (
              <div className="space-y-3 p-3 rounded-xl bg-slate-950/80 border border-slate-800">
                {/* Sound Presets */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-[11px] font-semibold text-slate-300">
                    <span>Sound Preset</span>
                    <span className="text-[10px] text-cyan-400 font-mono truncate max-w-[150px]">
                      {CHAT_SOUND_PRESETS.find((p) => p.url === settings.soundUrl)?.name || 'Custom Audio'}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-1.5 max-h-48 overflow-y-auto pr-0.5 no-scrollbar">
                    {CHAT_SOUND_PRESETS.map((preset) => {
                      const isSelected = settings.soundUrl === preset.url;
                      return (
                        <button
                          key={preset.id}
                          type="button"
                          onClick={() => {
                            setSettings((prev) => ({ ...prev, soundUrl: preset.url }));
                            playPreviewSound(preset.url, settings.soundVolume);
                          }}
                          className={`p-2 rounded-lg border text-left transition-all cursor-pointer flex items-center gap-2 ${
                            isSelected
                              ? 'border-cyan-400 bg-cyan-500/15 text-white shadow-[0_0_8px_rgba(0,240,255,0.2)]'
                              : 'border-slate-800 bg-slate-900/90 text-slate-300 hover:border-slate-700 hover:text-white'
                          }`}
                        >
                          <span className="text-base flex-shrink-0">{preset.icon}</span>
                          <div className="min-w-0 flex-1">
                            <div className="text-[11px] font-bold truncate flex items-center justify-between gap-1">
                              <span className="truncate">{preset.name}</span>
                              {preset.badge && (
                                <span className={`text-[8px] font-mono px-1 py-0.2 rounded ${
                                  isSelected
                                    ? 'bg-cyan-400 text-slate-950 font-black'
                                    : 'bg-slate-800 text-slate-400'
                                }`}>
                                  {preset.badge}
                                </span>
                              )}
                            </div>
                            <div className="text-[9px] text-slate-400 truncate font-mono">
                              {preset.desc}
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Preview and Media Library Bar */}
                <div className="pt-2 border-t border-slate-800/80 space-y-2.5">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        if (isPlayingAudio) {
                          stopPreviewSound();
                        } else {
                          playPreviewSound(settings.soundUrl, settings.soundVolume);
                        }
                      }}
                      className={`px-3 py-1.5 rounded-lg border text-xs font-mono font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                        isPlayingAudio
                          ? 'bg-amber-500/20 border-amber-400 text-amber-300 shadow-[0_0_10px_rgba(245,158,11,0.3)] animate-pulse'
                          : 'bg-cyan-500/20 border-cyan-400/80 text-cyan-300 hover:bg-cyan-500/30'
                      }`}
                      title={isPlayingAudio ? 'Stop Preview' : 'Play Sound Preview'}
                    >
                      {isPlayingAudio ? (
                        <>
                          <Square className="w-3.5 h-3.5 fill-amber-300" />
                          <span>Stop</span>
                        </>
                      ) : (
                        <>
                          <Play className="w-3.5 h-3.5 fill-cyan-300" />
                          <span>Preview</span>
                        </>
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={() => setIsMediaPickerOpen(true)}
                      className="flex-1 px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-300 hover:text-white text-xs font-mono font-medium flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <FolderOpen className="w-3.5 h-3.5 text-cyan-400" />
                      <span>Media Library</span>
                    </button>
                  </div>

                  {/* Volume Slider */}
                  <div className="space-y-1">
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-[11px] text-slate-400 font-medium flex items-center gap-1.5">
                        {settings.soundVolume === 0 ? (
                          <VolumeX className="w-3.5 h-3.5 text-slate-500" />
                        ) : settings.soundVolume < 0.5 ? (
                          <Volume1 className="w-3.5 h-3.5 text-cyan-400" />
                        ) : (
                          <Volume2 className="w-3.5 h-3.5 text-cyan-400" />
                        )}
                        <span>Sound Volume</span>
                      </span>
                      <span className="text-cyan-400 font-mono font-bold text-xs">
                        {Math.round((settings.soundVolume ?? 0.85) * 100)}%
                      </span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.05"
                      value={settings.soundVolume ?? 0.85}
                      onChange={(e) => setSettings({ ...settings, soundVolume: parseFloat(e.target.value) })}
                      className="w-full h-1.5 bg-slate-900 rounded-lg appearance-none cursor-pointer accent-cyan-400"
                    />
                  </div>

                  {/* Direct Audio URL */}
                  <div>
                    <label className="text-[10px] text-slate-400 block mb-1 font-mono">Audio URL or File Path</label>
                    <input
                      type="text"
                      value={settings.soundUrl || ''}
                      onChange={(e) => setSettings({ ...settings, soundUrl: e.target.value })}
                      placeholder="/sounds/cash-register-kaching.mp3"
                      className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1 text-[11px] font-mono text-slate-200 focus:outline-none focus:border-cyan-400 truncate"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* SECTION 6: TIMING & VISIBILITY TOGGLES */}
          <div className="space-y-3 pt-3 border-t border-slate-800/80">
            <div className="flex items-center gap-2 text-white font-bold text-xs">
              <Clock className="w-3.5 h-3.5 text-cyan-400" />
              <span>Timing &amp; Toggles</span>
            </div>

            <div className="space-y-3">
              <div>
                <div className="flex justify-between items-center text-xs mb-1">
                  <span className="text-[11px] text-slate-400 font-medium">Message Delay (Stream Sync)</span>
                  <span className="text-cyan-400 font-mono font-bold text-xs">
                    {(settings.messageDelay ?? 0) === 0 ? 'Instant (0s)' : `${settings.messageDelay}s delay`}
                  </span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="30"
                  step="1"
                  value={settings.messageDelay ?? 0}
                  onChange={(e) => setSettings({ ...settings, messageDelay: Number(e.target.value) })}
                  className="w-full h-1.5 bg-slate-950 rounded-lg appearance-none cursor-pointer accent-cyan-400"
                />
                <div className="flex justify-between text-[9px] text-slate-500 mt-1 font-mono">
                  <span>0s (Instant)</span>
                  <span>5s</span>
                  <span>15s</span>
                  <span>30s</span>
                </div>
                {/* Quick Presets for Delay */}
                <div className="flex items-center gap-1.5 mt-2">
                  {[0, 3, 5, 10, 15, 30].map((d) => (
                    <button
                      key={d}
                      type="button"
                      onClick={() => setSettings({ ...settings, messageDelay: d })}
                      className={`flex-1 py-1 rounded text-[10px] font-mono font-medium transition-all ${
                        (settings.messageDelay ?? 0) === d
                          ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                          : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
                      }`}
                    >
                      {d === 0 ? 'Instant' : `${d}s`}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <div className="flex justify-between items-center text-xs mb-1">
                  <span className="text-[11px] text-slate-400 font-medium">Message Auto-Fade</span>
                  <span className="text-cyan-400 font-mono font-bold text-xs">
                    {settings.fadeDuration === 0 ? 'Never Fade' : `${settings.fadeDuration}s`}
                  </span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="60"
                  step="5"
                  value={settings.fadeDuration}
                  onChange={(e) => setSettings({ ...settings, fadeDuration: Number(e.target.value) })}
                  className="w-full h-1.5 bg-slate-950 rounded-lg appearance-none cursor-pointer accent-cyan-400"
                />
              </div>

              <div>
                <div className="flex justify-between items-center text-xs mb-1">
                  <span className="text-[11px] text-slate-400 font-medium">Max Messages</span>
                  <span className="text-cyan-400 font-mono font-bold text-xs">{settings.maxMessages} items</span>
                </div>
                <input
                  type="range"
                  min="3"
                  max="20"
                  value={settings.maxMessages}
                  onChange={(e) => setSettings({ ...settings, maxMessages: Number(e.target.value) })}
                  className="w-full h-1.5 bg-slate-950 rounded-lg appearance-none cursor-pointer accent-cyan-400"
                />
              </div>

              {/* Toggles */}
              <div className="grid grid-cols-2 gap-2 pt-1">
                <label className="flex items-center gap-2 p-2 rounded-xl bg-slate-950 border border-slate-800 cursor-pointer hover:border-slate-700">
                  <input
                    type="checkbox"
                    checked={settings.showBadges}
                    onChange={(e) => setSettings({ ...settings, showBadges: e.target.checked })}
                    className="rounded border-slate-700 text-cyan-500 focus:ring-0 w-3.5 h-3.5"
                  />
                  <span className="text-xs text-slate-300 font-medium">Role Badges</span>
                </label>

                <label className="flex items-center gap-2 p-2 rounded-xl bg-slate-950 border border-slate-800 cursor-pointer hover:border-slate-700">
                  <input
                    type="checkbox"
                    checked={settings.showTimestamp}
                    onChange={(e) => setSettings({ ...settings, showTimestamp: e.target.checked })}
                    className="rounded border-slate-700 text-cyan-500 focus:ring-0 w-3.5 h-3.5"
                  />
                  <span className="text-xs text-slate-300 font-medium">Timestamps</span>
                </label>
              </div>
            </div>
          </div>
        </div>

        {/* Sticky Footer Action Bar (Desktop and Mobile) */}
        <div className="p-3.5 bg-[#060911] border-t border-slate-800 flex items-center justify-between gap-2.5 flex-shrink-0">
          <button
            type="button"
            onClick={handleResetChanges}
            disabled={saving || !hasUnsavedChanges}
            className="px-3.5 py-2 rounded-xl text-xs font-mono font-bold text-slate-400 hover:text-white hover:bg-slate-800/80 disabled:opacity-30 transition-colors cursor-pointer"
          >
            Reset
          </button>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={closeRightbar}
              className="lg:hidden px-3.5 py-2 rounded-xl text-xs font-mono font-bold text-slate-300 hover:text-white bg-slate-900 border border-slate-800 transition-colors cursor-pointer"
            >
              Close
            </button>
            <Button
              type="button"
              variant="primary"
              size="sm"
              onClick={handleSaveSettings}
              loading={saving}
              disabled={!hasUnsavedChanges && !saveSuccess}
              className={`font-bold font-mono text-xs px-4 shadow-[0_0_15px_rgba(0,240,255,0.3)] ${
                hasUnsavedChanges
                  ? 'bg-cyan-400 hover:bg-cyan-300 text-slate-950'
                  : 'bg-slate-800 text-slate-400 border border-slate-700/80 cursor-default opacity-80'
              }`}
            >
              <Save size={13} className={hasUnsavedChanges ? 'text-slate-950' : 'text-slate-400'} />
              <span>Save</span>
            </Button>
          </div>
        </div>
      </aside>
    </div>

      {/* ============================================================== */}
      {/* 4. BOTTOM FLOATING UNSAVED CHANGES TOAST BAR                   */}
      {/* ============================================================== */}
      <div
        className={`fixed bottom-5 left-1/2 -translate-x-1/2 z-50 w-[calc(100%-1.5rem)] max-w-xl transition-all duration-300 ease-in-out ${
          hasUnsavedChanges
            ? 'translate-y-0 opacity-100 pointer-events-auto'
            : 'translate-y-24 opacity-0 pointer-events-none'
        } ${isEarthquake ? 'animate-toast-earthquake' : ''}`}
      >
        <div
          className={`rounded-2xl px-4 py-3 backdrop-blur-xl transition-all duration-300 flex items-center justify-between gap-3 ${
            isEarthquake
              ? 'bg-gradient-to-r from-red-950/95 via-rose-950/95 to-red-950/95 border-2 border-red-500 shadow-[0_0_35px_rgba(239,68,68,0.7),0_14px_45px_rgba(0,0,0,0.95)] animate-toast-red-pulse'
              : 'bg-[#0B101E]/95 border border-cyan-500/40 shadow-[0_14px_45px_rgba(0,0,0,0.85),0_0_25px_rgba(0,240,255,0.18)]'
          }`}
        >
          <div className="flex items-center gap-2.5 min-w-0">
            {isEarthquake ? (
              <div className="w-8 h-8 rounded-xl bg-red-500/20 border border-red-500/40 flex items-center justify-center text-red-400 flex-shrink-0 shadow-[0_0_12px_rgba(239,68,68,0.5)]">
                <AlertTriangle size={16} className="animate-bounce" />
              </div>
            ) : (
              <div className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-pulse flex-shrink-0 shadow-[0_0_8px_rgba(0,240,255,0.8)]" />
            )}
            <div className="min-w-0">
              <div className={`text-xs font-bold truncate flex items-center gap-1.5 ${isEarthquake ? 'text-red-200' : 'text-slate-100'}`}>
                {isEarthquake ? (
                  <>
                    <span className="font-black text-red-400 uppercase tracking-wider">Unsaved Changes!</span>
                    <span className="hidden sm:inline text-red-200 font-medium">— Navigation blocked</span>
                  </>
                ) : (
                  <span>Careful — you have unsaved changes!</span>
                )}
              </div>
              <p className={`text-[10px] truncate hidden xs:block ${isEarthquake ? 'text-red-300 font-semibold' : 'text-slate-400'}`}>
                {isEarthquake
                  ? 'Please Save or Reset changes before switching to another feature!'
                  : 'Save your configuration to sync with OBS live chat'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            <button
              type="button"
              disabled={saving}
              onClick={handleResetChanges}
              className={`px-3 py-1.5 rounded-xl text-xs font-mono font-bold transition-all cursor-pointer ${
                isEarthquake
                  ? 'bg-red-950/80 border border-red-500/40 text-red-300 hover:bg-red-900/60 hover:text-white'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/80'
              }`}
            >
              Reset
            </button>
            <Button
              type="button"
              variant="primary"
              size="sm"
              onClick={handleSaveSettings}
              loading={saving}
              className={`font-bold font-mono text-xs px-4 transition-all shadow-md active:scale-95 ${
                isEarthquake
                  ? 'bg-gradient-to-r from-red-500 to-rose-600 hover:from-red-400 hover:to-rose-500 text-white shadow-[0_0_20px_rgba(239,68,68,0.6)] animate-pulse border-0'
                  : 'bg-cyan-400 hover:bg-cyan-300 text-slate-950 shadow-[0_0_15px_rgba(0,240,255,0.3)]'
              }`}
            >
              <Save size={13} className={isEarthquake ? 'text-white' : 'text-slate-950'} />
              <span>Save Changes</span>
            </Button>
          </div>
        </div>
      </div>

      {/* ============================================================== */}
      {/* 5. TOP RIGHT CHANGES SAVED SUCCESS TOAST                       */}
      {/* ============================================================== */}
      {saveSuccess && (
        <div className="fixed top-6 right-6 z-50 animate-in fade-in slide-in-from-top-4 duration-300 pointer-events-none">
          <div className="rounded-xl px-4 py-2.5 bg-emerald-950/90 border border-emerald-500/40 text-emerald-300 text-xs font-mono font-bold flex items-center gap-2 shadow-2xl shadow-emerald-950/50">
            <Check className="w-4 h-4 text-emerald-400" />
            <span>Changes saved successfully!</span>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* 6. MEDIA PICKER MODAL (GLOBAL AUDIO & UPLOAD ASSETS)           */}
      {/* ============================================================== */}
      {isMediaPickerOpen && (
        <MediaPickerModal
          isOpen={isMediaPickerOpen}
          onClose={() => setIsMediaPickerOpen(false)}
          filterMode="audio"
          initialSection="sounds"
          currentUrl={settings.soundUrl}
          title="Choose Live Chat Notification Sound"
          subtitle="Pick a preset notification chime or select from your uploaded audio files."
          onSelect={(selectedUrl: string) => {
            setSettings((prev) => ({ ...prev, soundUrl: selectedUrl }));
            setIsMediaPickerOpen(false);
            playPreviewSound(selectedUrl, settings.soundVolume);
          }}
        />
      )}
    </div>
  );
};

export default LiveChatWidgetManager;
