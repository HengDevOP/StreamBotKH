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
  PanelRight,
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
import { CHAT_THEMES, ChatOverlayTheme, ChatThemePreset } from '../../data/chatOverlayPresets';
import { LiveChatSkeleton } from './DashboardSkeleton';

export interface LiveChatWidgetManagerProps {
  streamerToken?: string;
  isLocked?: boolean;
  onUpgrade?: () => void;
  isRightbarOpen?: boolean;
  onToggleRightbar?: () => void;
  onCloseRightbar?: () => void;
}

interface ChatSettings {
  theme?: ChatOverlayTheme;
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
    id: 'minecraft-oof',
    name: 'Minecraft OOF',
    badge: 'MINECRAFT',
    desc: 'Classic 8-bit player hurt sound',
    url: '/sounds/memes/oh-minecraft-oof.mp3',
    icon: '⛏️'
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
  theme: 'default',
  fontFamily: 'Chakra Petch',
  authorFontFamily: 'Chakra Petch',
  messageFontFamily: 'Inter',
  fontSize: 'base',
  lineStyle: 'inline',
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
  'Hello streamer! Loving the live broadcast today, keep up the amazing gameplay and positive energy! 🎮🔥',
  'GG clutch win! That play was insane 💯',
  'Can you show us your build loadout and camera setup? That keyboard sound is so clean! 🎧✨',
  'Top tier broadcast quality today! ✨',
  'Watching live from Phnom Penh! Drop the community link whenever you get a break! 🚀',
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
  avatar?: string;
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
    avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=NeonSamurai',
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
    avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=DaraGamer',
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
    avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=PixelQueen',
    message: 'Loving the clean live chat overlay! ✨',
    badge: 'MEMBER',
    badgeColor: '#A855F7',
    badgeIcon: 'Star',
    platform: 'youtube',
    time: '14:04'
  }
];

const QUICK_TAGS = [
  'Welcome to the stream',
  'Hello everyone',
  'Great gameplay',
  'Awesome stream quality',
  'Keep up the good work',
  'Multi-line chat test'
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
  const [previewScale, setPreviewScale] = useState<number>(1);
  const [widthInput, setWidthInput] = useState<string>(String(DEFAULT_SETTINGS.overlayWidth));
  const [heightInput, setHeightInput] = useState<string>(String(DEFAULT_SETTINGS.overlayHeight));

  useEffect(() => {
    setWidthInput(String(settings.overlayWidth ?? 0));
  }, [settings.overlayWidth]);

  useEffect(() => {
    setHeightInput(String(settings.overlayHeight ?? 0));
  }, [settings.overlayHeight]);

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
        avatar: msg.avatar,
        message: msg.message || msg.content || msg.text || '',
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
        avatar: `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(randName)}`,
        message: randText,
        badge: randBadge || undefined,
        badgeColor: badgeConfig?.color,
        badgeIcon: badgeConfig?.icon,
        platform: Math.random() > 0.5 ? 'youtube' : 'twitch',
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

  const handleSelectTheme = (themeId: ChatOverlayTheme) => {
    const preset = CHAT_THEMES.find((t) => t.id === themeId);
    if (!preset) return;

    setSettings((prev) => ({
      ...prev,
      theme: themeId,
      fontFamily: preset.recommendedSettings.fontFamily,
      authorFontFamily: preset.recommendedSettings.authorFontFamily,
      messageFontFamily: preset.recommendedSettings.messageFontFamily,
      fontSize: preset.recommendedSettings.fontSize,
      lineStyle: preset.recommendedSettings.lineStyle,
      authorColor: preset.recommendedSettings.authorColor,
      messageColor: preset.recommendedSettings.messageColor,
      animationStyle: preset.recommendedSettings.animationStyle,
      textShadowStyle: preset.recommendedSettings.textShadowStyle,
      textShadowColor: preset.recommendedSettings.textShadowColor,
      textShadowBlur: preset.recommendedSettings.textShadowBlur,
      textBorderWidth: preset.recommendedSettings.textBorderWidth,
      textBorderColor: preset.recommendedSettings.textBorderColor,
      soundUrl: preset.recommendedSettings.soundUrl || prev.soundUrl
    }));

    if (preset.recommendedSettings.soundUrl) {
      playPreviewSound(preset.recommendedSettings.soundUrl, settings.soundVolume);
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
      'Hello streamer! Loving the broadcast today, keep up the amazing gameplay and positive energy! 🎮🔥',
      'Drop that link in chat! 🎯',
      'Can you show us your build loadout and camera setup? That keyboard sound is so clean! 🎧✨',
      'The vibe here is unmatched 🙌',
      'StreamBotKH live chat is clean!',
      'Watching live from Phnom Penh! Drop the community link whenever you get a break! 🚀',
      'Hype hype hype! 🔥🔥🔥'
    ];
    const randIdx = Math.floor(Math.random() * sampleAuthors.length);

    const authorName = customMsg ? 'Streamer' : sampleAuthors[randIdx];
    const textContent = customMsg === 'Multi-line chat test'
      ? 'Hello streamer! Really loving your live broadcast quality today, keep up the great gameplay and positive energy for the squad tonight.'
      : (customMsg || sampleTexts[randIdx % sampleTexts.length]);

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

  const renderBadgeElement = (item: LocalChatMessage) => {
    if (!settings.showBadges || !(item.badge || item.badgeIcon || item.badgeImage || item.badgeGifUrl)) {
      return null;
    }
    return (
      <span
        className="inline-flex items-center self-center flex-shrink-0 leading-none align-middle"
        style={{ color: item.badgeColor || '#00F0FF' }}
        title={item.badge || 'Subscriber'}
      >
        {item.badgeImage || item.badgeGifUrl ? (
          <img
            src={item.badgeImage || item.badgeGifUrl}
            alt="Badge"
            className="w-3.5 h-3.5 object-contain inline-block flex-shrink-0 align-middle"
          />
        ) : (
          renderBadgeIcon(item.badgeIcon, item.badgeColor || '#00F0FF')
        )}
        {item.badge ? (
          <span
            className="text-[9px] font-extrabold uppercase tracking-wider ml-1 leading-none align-middle"
            style={{ color: item.badgeColor || '#00F0FF' }}
          >
            {item.badge}
          </span>
        ) : null}
      </span>
    );
  };

  const renderMessageContent = (item: LocalChatMessage) => {
    const activeTheme = settings.theme || 'default';
    const lineStyle = settings.lineStyle || 'inline';
    const messageContent = item.message || (item as any).content || (item as any).text || (item as any).comment || '';
    const avatarUrl = item.avatar || (item as any).avatar;

    // ==============================================================
    // 1. TEMPLATE: GTA V (LOS SANTOS HUD CARD)
    // ==============================================================
    if (activeTheme === 'gta-v') {
      return (
        <div
          key={item.id}
          className={`w-full mb-2.5 p-2.5 rounded-lg bg-[#0e1217]/95 border border-slate-800 shadow-[0_4px_16px_rgba(0,0,0,0.65)] backdrop-blur-md relative overflow-hidden select-none chat-anim-${settings.animationStyle || 'slide-left'} text-left`}
          style={{
            borderLeft: `4px solid ${settings.authorColor || '#48BB78'}`
          }}
        >
          {/* Row 1: Header (Wanted Star + Avatar + Platform + Author + Badges + L.S. + Timestamp) */}
          <div className="flex items-center justify-between gap-1.5 mb-1.5 select-none relative z-10">
            <div className="flex items-center gap-1.5 min-w-0">
              <span className="inline-flex items-center text-[#F6E05E] text-xs font-black select-none drop-shadow-[0_0_4px_rgba(246,224,94,0.6)]" title="Wanted Level">
                ★
              </span>

              {avatarUrl && (
                <img
                  src={avatarUrl}
                  alt={item.author}
                  className="w-4 h-4 rounded-full object-cover border border-slate-700 flex-shrink-0"
                  onError={(e) => { (e.target as HTMLElement).style.display = 'none'; }}
                />
              )}

              <span className="inline-flex items-center justify-center flex-shrink-0">
                {renderPlatformIcon((item as any).platform || 'youtube')}
              </span>
              <span
                className="font-black uppercase tracking-wider text-sm truncate"
                style={{
                  color: settings.authorColor || '#48BB78',
                  fontFamily: settings.authorFontFamily || 'Pricedown Bl, Bebas Neue, Montserrat, sans-serif',
                  WebkitTextStroke: getTextStrokeCSS(),
                  paintOrder: 'stroke fill',
                  textShadow: getTextShadowCSS()
                }}
              >
                {item.author}
              </span>
              {renderBadgeElement(item)}
            </div>
            <div className="flex items-center gap-1.5 flex-shrink-0">
              <span className="px-1.5 py-0.5 rounded bg-black/60 text-[9px] font-mono font-bold text-slate-300 uppercase tracking-widest border border-slate-700/60 select-none">
                L.S.
              </span>
              {settings.showTimestamp && (
                <span className="text-[10px] text-slate-400 select-none opacity-75 font-mono">
                  {item.time}
                </span>
              )}
            </div>
          </div>

          {/* Row 2: Tactical HUD Inner Text Card */}
          <div
            className="w-full p-2 sm:p-2.5 rounded-md bg-black/55 border border-slate-800/80 shadow-inner relative z-10"
          >
            <div
              className="w-full text-left font-medium text-slate-100 leading-relaxed whitespace-pre-wrap break-words [overflow-wrap:anywhere] [word-break:break-word]"
              style={{
                fontSize: settings.fontSize === 'sm' ? '12.5px' : settings.fontSize === 'lg' ? '16px' : settings.fontSize === 'xl' ? '18px' : '14px',
                color: settings.messageColor || '#F7FAFC',
                fontFamily: settings.messageFontFamily || settings.fontFamily || 'Inter, sans-serif',
                WebkitTextStroke: getTextStrokeCSS(),
                paintOrder: 'stroke fill',
                textShadow: getTextShadowCSS()
              }}
            >
              {messageContent}
            </div>
          </div>
        </div>
      );
    }

    // ==============================================================
    // 2. TEMPLATE: GTA 6 (VICE CITY SUNSET GRADIENT CARD)
    // ==============================================================
    if (activeTheme === 'gta-6') {
      return (
        <div
          key={item.id}
          className={`w-full mb-3 p-3 sm:p-3.5 rounded-2xl relative overflow-hidden select-none chat-anim-${settings.animationStyle || 'zoom-in'} text-left transition-all`}
          style={{
            // Authentic GTA VI Vice City Sunset Gradient (Violet -> Magenta/Pink -> Coral -> Sunset Gold)
            background: 'linear-gradient(135deg, rgba(62, 10, 88, 0.94) 0%, rgba(162, 28, 93, 0.92) 42%, rgba(217, 72, 15, 0.90) 82%, rgba(245, 158, 11, 0.88) 100%)',
            border: '1.5px solid rgba(255, 115, 195, 0.55)',
            boxShadow: '0 0 25px rgba(255, 42, 133, 0.4), 0 8px 32px rgba(0, 0, 0, 0.75), inset 0 1px 1px rgba(255, 255, 255, 0.4), inset 0 0 20px rgba(255, 122, 0, 0.18)',
            backdropFilter: 'blur(16px)'
          }}
        >
          {/* Top Edge Neon Sunset Light Beam */}
          <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-[#00F0FF] via-[#FF2A85] to-[#FFB800] shadow-[0_0_8px_#FF2A85]" />

          {/* Subtle Ambient Palm Tree Watermark */}
          <div className="absolute -right-2 -bottom-2 text-4xl opacity-15 select-none pointer-events-none filter drop-shadow">
            🌴
          </div>

          {/* Row 1: Header (VI Sunset Badge + Avatar + Platform + Author + Badges + Timestamp) */}
          <div className="flex items-center justify-between gap-1.5 mb-2 select-none relative z-10">
            <div className="flex items-center gap-1.5 min-w-0">
              {/* Official GTA 6 Roman Numeral "VI" Sunset Gradient Badge */}
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md font-black italic text-xs tracking-tight bg-gradient-to-b from-[#FF7CD6] via-[#FF2A85] to-[#FFA234] text-white shadow-[0_0_12px_rgba(255,42,133,0.65)] border border-white/40 select-none flex-shrink-0">
                <span className="leading-none drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]">VI</span>
                <span className="text-[8px] uppercase tracking-widest not-italic font-sans opacity-95">VICE</span>
              </span>

              {/* User Avatar if available */}
              {avatarUrl && (
                <img
                  src={avatarUrl}
                  alt={item.author}
                  className="w-5 h-5 rounded-full object-cover border border-white/40 shadow-sm flex-shrink-0"
                  onError={(e) => { (e.target as HTMLElement).style.display = 'none'; }}
                />
              )}

              <span className="inline-flex items-center justify-center flex-shrink-0">
                {renderPlatformIcon((item as any).platform || 'youtube')}
              </span>

              {/* Author Username with GTA / Pricedown Typography & Neon Accent */}
              <span
                className="font-black italic tracking-wide text-sm truncate uppercase drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)]"
                style={{
                  color: settings.authorColor && settings.authorColor !== '#000000' ? settings.authorColor : '#00F0FF',
                  fontFamily: settings.authorFontFamily || 'Pricedown Bl, Righteous, Montserrat, sans-serif',
                  WebkitTextStroke: getTextStrokeCSS(),
                  paintOrder: 'stroke fill',
                  textShadow: settings.textShadowStyle !== 'none'
                    ? getTextShadowCSS()
                    : '0 0 10px rgba(0, 240, 255, 0.7), 0 2px 4px rgba(0, 0, 0, 0.9)'
                }}
              >
                {item.author}
              </span>

              {renderBadgeElement(item)}
            </div>

            {settings.showTimestamp && (
              <span className="text-[10px] text-amber-200/90 select-none font-mono font-bold drop-shadow-[0_1px_2px_rgba(0,0,0,0.9)] flex-shrink-0">
                {item.time}
              </span>
            )}
          </div>

          {/* Row 2: Inner Text Card Container (Glassmorphic dark card bubble with subtle gradient for crystal-clear readability) */}
          <div
            className="w-full p-2.5 sm:p-3 rounded-xl relative overflow-hidden backdrop-blur-md z-10"
            style={{
              background: 'linear-gradient(135deg, rgba(16, 4, 28, 0.65) 0%, rgba(38, 8, 48, 0.55) 100%)',
              border: '1px solid rgba(255, 255, 255, 0.16)',
              boxShadow: 'inset 0 1px 1px rgba(255, 255, 255, 0.12), 0 4px 12px rgba(0, 0, 0, 0.4)'
            }}
          >
            <div
              className="w-full text-left font-medium leading-relaxed whitespace-pre-wrap break-words [overflow-wrap:anywhere] [word-break:break-word]"
              style={{
                fontSize: settings.fontSize === 'sm' ? '12.5px' : settings.fontSize === 'lg' ? '16px' : settings.fontSize === 'xl' ? '18px' : '14px',
                color: settings.messageColor && settings.messageColor !== '#000000' ? settings.messageColor : '#FFFFFF',
                fontFamily: settings.messageFontFamily || settings.fontFamily || 'Inter, sans-serif',
                WebkitTextStroke: getTextStrokeCSS(),
                paintOrder: 'stroke fill',
                textShadow: settings.textShadowStyle !== 'none'
                  ? getTextShadowCSS()
                  : '0 1px 2px rgba(0, 0, 0, 0.85)'
              }}
            >
              {messageContent}
            </div>
          </div>
        </div>
      );
    }

    // ==============================================================
    // 3. TEMPLATE: MINECRAFT (8-BIT PIXEL BLOCK HUD)
    // ==============================================================
    if (activeTheme === 'minecraft') {
      return (
        <div
          key={item.id}
          className={`w-full mb-1.5 px-3 py-2 rounded-sm bg-black/70 border border-[#333333] shadow-[2px_2px_0px_#000000] text-left select-none relative overflow-hidden chat-anim-${settings.animationStyle || 'fade-in'}`}
          style={{
            fontFamily: `'Press Start 2P', 'VT323', monospace`
          }}
        >
          <div className="flex items-baseline gap-1.5 text-[11px] sm:text-xs leading-loose break-words [overflow-wrap:anywhere] [word-break:break-word]">
            {/* Minecraft Rank Tag */}
            <span className="text-[#FFAA00] font-normal flex-shrink-0" style={{ textShadow: '2px 2px 0px #3f2a00' }}>
              [<span className="text-[#FFFF55] font-bold">VIP</span>]
            </span>

            <span className="inline-block self-center flex-shrink-0">
              {renderPlatformIcon((item as any).platform || 'youtube')}
            </span>

            {/* Minecraft Player Bracket & Username: <Username> */}
            <span className="text-white font-normal flex-shrink-0" style={{ textShadow: '2px 2px 0px #000000' }}>
              &lt;<span
                style={{
                  color: settings.authorColor || '#55FF55',
                  textShadow: '2px 2px 0px #133a13'
                }}
              >{item.author}</span>&gt;
            </span>

            {/* Minecraft Diamond badge */}
            {settings.showBadges && (
              <span className="inline-block text-xs select-none flex-shrink-0" title="Player Badge">
                💎
              </span>
            )}

            {/* Message Text with Minecraft Pixel Shadow */}
            <span
              className="font-normal text-white flex-1 whitespace-pre-wrap break-words [overflow-wrap:anywhere]"
              style={{
                color: settings.messageColor || '#FFFFFF',
                textShadow: '2px 2px 0px #000000'
              }}
            >
              {messageContent}
            </span>

            {settings.showTimestamp && (
              <span
                className="text-[9px] text-[#AAAAAA] ml-2 opacity-70 flex-shrink-0 font-mono"
                style={{ textShadow: '1px 1px 0px #000000' }}
              >
                {item.time}
              </span>
            )}
          </div>
        </div>
      );
    }

    // ==============================================================
    // 4. TEMPLATE: DEFAULT / CYBER NEON (INLINE / INDENTED / STACKED)
    // ==============================================================
    // 1. STACKED (2-ROW) LAYOUT:
    if (lineStyle === 'stacked') {
      return (
        <div
          key={item.id}
          className={`w-full p-1 sm:p-1.5 mb-1.5 select-none chat-anim-${settings.animationStyle || 'slide-left'} ${getFontSizeClass(settings.fontSize)} text-left`}
        >
          <div className="w-full flex items-center gap-1.5 mb-0.5 select-none text-left">
            {avatarUrl && (
              <img
                src={avatarUrl}
                alt={item.author}
                className="w-4 h-4 rounded-full object-cover border border-slate-700 flex-shrink-0"
                onError={(e) => { (e.target as HTMLElement).style.display = 'none'; }}
              />
            )}
            <span className="inline-flex items-center justify-center flex-shrink-0">
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
            {renderBadgeElement(item)}
            {settings.showTimestamp && (
              <span className="text-[10px] text-slate-400 ml-auto select-none opacity-75 font-mono">
                {item.time}
              </span>
            )}
          </div>
          <div
            className="w-full text-left font-medium text-white leading-relaxed whitespace-pre-wrap break-words [overflow-wrap:anywhere] [word-break:break-word]"
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
            {messageContent}
          </div>
        </div>
      );
    }

    // 2. INDENTED (HANGING INDENT) LAYOUT:
    if (lineStyle === 'indented') {
      return (
        <div
          key={item.id}
          className={`w-full p-1 sm:p-1.5 mb-1 select-none chat-anim-${settings.animationStyle || 'slide-left'} ${getFontSizeClass(settings.fontSize)}`}
        >
          <div className="w-full flex items-baseline gap-1.5 select-none text-left break-words [overflow-wrap:anywhere] [word-break:break-word]">
            <div className="flex-shrink-0 inline-flex items-baseline gap-1 self-baseline select-none whitespace-nowrap">
              {avatarUrl && (
                <img
                  src={avatarUrl}
                  alt={item.author}
                  className="w-4 h-4 rounded-full object-cover border border-slate-700 self-center flex-shrink-0"
                  onError={(e) => { (e.target as HTMLElement).style.display = 'none'; }}
                />
              )}
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
              {renderBadgeElement(item)}
              <span className="font-bold text-slate-300">:</span>
            </div>
            <div
              className="flex-1 min-w-0 text-left font-medium text-white leading-relaxed"
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
              <span className="whitespace-pre-wrap">{messageContent}</span>
              {settings.showTimestamp && (
                <span className="text-[10px] text-slate-400 ml-2 select-none opacity-75 inline-block font-mono">
                  {item.time}
                </span>
              )}
            </div>
          </div>
        </div>
      );
    }

    // 3. INLINE FLOW LAYOUT (DEFAULT):
    return (
      <div
        key={item.id}
        className={`w-full p-1 sm:p-1.5 mb-1 select-none chat-anim-${settings.animationStyle || 'slide-left'} ${getFontSizeClass(settings.fontSize)} text-left leading-relaxed break-words [overflow-wrap:anywhere] [word-break:break-word]`}
        style={{ wordBreak: 'break-word', overflowWrap: 'anywhere' }}
      >
        <span className="inline-flex items-center gap-1 mr-1.5 align-baseline select-none whitespace-nowrap">
          {avatarUrl && (
            <img
              src={avatarUrl}
              alt={item.author}
              className="w-4 h-4 rounded-full object-cover border border-slate-700 inline-block self-center flex-shrink-0 align-middle mr-0.5"
              onError={(e) => { (e.target as HTMLElement).style.display = 'none'; }}
            />
          )}
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
          {renderBadgeElement(item)}
          <span className="font-bold text-slate-300">:</span>
        </span>

        <span
          className="font-medium text-white inline align-baseline whitespace-pre-wrap"
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
          {messageContent}
        </span>

        {settings.showTimestamp && (
          <span className="text-[10px] text-slate-400 ml-2 select-none opacity-75 inline-block align-baseline font-mono">
            {item.time}
          </span>
        )}
      </div>
    );
  };

  if (loading) {
    return <LiveChatSkeleton />;
  }

  return (
    <div className="relative w-full h-full flex-1 min-h-0 flex flex-col">
      <style>{CHAT_ANIMATIONS_CSS}</style>

      {/* ============================================================== */}
      {/* 2-COLUMN LIVE WEB APPLICATION WORKSPACE                        */}
      {/* ============================================================== */}
      <div className="w-full flex-1 min-h-0 flex flex-col lg:flex-row gap-3 sm:gap-4 items-stretch overflow-hidden">
        {/* LEFT COLUMN: MAIN LIVE CHAT PREVIEW STAGE */}
        <div className="relative flex-1 min-w-0 w-full rounded-xl bg-[#0B0F19] border border-slate-800/80 overflow-hidden flex flex-col min-h-[480px] lg:min-h-0 h-full">
          {/* Chat Stage Top Header */}
          <div className="px-4 py-2.5 bg-[#090D16] border-b border-slate-800/80 flex flex-wrap items-center justify-between gap-2 flex-shrink-0 z-10">
            {/* Left: Dimensions & Scale Size Controls (Top-Left Origin) */}
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-semibold text-white">Live Chat Preview</span>
              <span className="text-[11px] font-mono text-slate-400 px-2 py-0.5 rounded bg-slate-900 border border-slate-800">
                {settings.overlayWidth ? `${settings.overlayWidth}px` : 'Auto'} × {settings.overlayHeight ? `${settings.overlayHeight}px` : 'Auto'}
              </span>

              {/* Scale Size Selector */}
              <div className="flex items-center gap-1 bg-slate-950 border border-slate-800 rounded-lg p-0.5">
                <span className="text-[10px] font-mono text-slate-400 px-1.5">Scale</span>
                {[
                  { label: '50%', value: 0.5 },
                  { label: '75%', value: 0.75 },
                  { label: '100%', value: 1 },
                  { label: '125%', value: 1.25 }
                ].map((s) => (
                  <button
                    key={s.label}
                    type="button"
                    onClick={() => setPreviewScale(s.value)}
                    className={`px-2 py-0.5 rounded text-[10px] font-mono transition-colors ${
                      previewScale === s.value
                        ? 'bg-slate-800 text-white font-semibold'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Right: Stage Actions */}
            <div className="flex items-center gap-1.5 sm:gap-2">
              <button
                type="button"
                onClick={copyObsUrl}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-medium transition-colors border cursor-pointer ${
                  copiedUrl
                    ? 'bg-emerald-950/60 text-emerald-300 border-emerald-700/60'
                    : 'bg-slate-900 hover:bg-slate-800 text-slate-200 border-slate-800'
                }`}
                title="Copy OBS Overlay URL"
              >
                {copiedUrl ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3 text-slate-400" />}
                <span className="hidden xs:inline">{copiedUrl ? 'Copied' : 'Copy OBS URL'}</span>
              </button>

              <a
                href={obsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="p-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800 transition-colors flex items-center justify-center"
                title="Open OBS Overlay in new tab"
              >
                <ExternalLink className="w-3.5 h-3.5" />
              </a>

              <button
                type="button"
                onClick={handleClearMessages}
                className="p-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white border border-slate-800 transition-colors"
                title="Clear Messages"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>

              <button
                type="button"
                onClick={() => handleSendTestMessage()}
                disabled={sendingTest}
                className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-800 text-[11px] font-medium transition-colors"
              >
                <span>Simulate</span>
              </button>

              <button
                type="button"
                onClick={toggleRightbar}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-medium transition-colors border cursor-pointer ${
                  isRightbarOpen
                    ? 'bg-slate-200 text-slate-950 border-slate-200 font-semibold'
                    : 'bg-slate-900 hover:bg-slate-800 text-slate-200 border-slate-800'
                }`}
                title={isRightbarOpen ? 'Close Settings' : 'Open Settings'}
                aria-label="Toggle Chat Settings"
              >
                <PanelRight className="w-3.5 h-3.5" />
                <span>Settings</span>
              </button>
            </div>
          </div>

          {/* Scrollable Chat Feed Area - Scaled from Top-Left (origin-top-left) */}
          <div
            className="obs-preview-stage flex-1 p-4 sm:p-6 overflow-auto relative flex items-start justify-start"
            style={{
              backgroundColor: '#060911',
              backgroundImage:
                'linear-gradient(45deg, #0b101d 25%, transparent 25%), linear-gradient(-45deg, #0b101d 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #0b101d 75%), linear-gradient(-45deg, transparent 75%, #0b101d 75%)',
              backgroundSize: '24px 24px',
              backgroundPosition: '0 0, 0 12px, 12px -12px, -12px 0px',
              fontFamily: settings.fontFamily || 'Chakra Petch, sans-serif'
            }}
          >
            {/* Outer footprint wrapper sized to scaled dimensions so scrollbars fit top-left scaling */}
            <div
              className="relative"
              style={{
                width:
                  settings.overlayWidth && settings.overlayWidth > 0
                    ? `${Math.round(settings.overlayWidth * previewScale)}px`
                    : `${Math.round(100 * previewScale)}%`,
                height:
                  settings.overlayHeight && settings.overlayHeight > 0
                    ? `${Math.round(settings.overlayHeight * previewScale)}px`
                    : '100%',
                minHeight:
                  settings.overlayHeight && settings.overlayHeight > 0
                    ? `${Math.round(Math.min(settings.overlayHeight, 320) * previewScale)}px`
                    : '320px'
              }}
            >
              {/* OBS Canvas Bounds Indicator & Message Container - Anchored & Scaled from Top-Left */}
              <div
                className={`relative z-10 origin-top-left transition-transform duration-150 flex flex-col justify-end p-3 ${
                  settings.overlayWidth > 0 || settings.overlayHeight > 0
                    ? 'border border-slate-800 rounded-lg bg-[#090D16]/60'
                    : 'w-full'
                }`}
                style={{
                  transform: `scale(${previewScale})`,
                  transformOrigin: 'top left',
                  width: settings.overlayWidth && settings.overlayWidth > 0 ? `${settings.overlayWidth}px` : '100%',
                  maxWidth: settings.overlayWidth && settings.overlayWidth > 0 ? `${settings.overlayWidth}px` : '100%',
                  height: settings.overlayHeight && settings.overlayHeight > 0 ? `${settings.overlayHeight}px` : '100%',
                  maxHeight: settings.overlayHeight && settings.overlayHeight > 0 ? `${settings.overlayHeight}px` : '100%',
                  minHeight: settings.overlayHeight && settings.overlayHeight > 0 ? `${Math.min(settings.overlayHeight, 320)}px` : '320px',
                  boxSizing: 'border-box'
                }}
              >
                <div
                  ref={chatScrollRef}
                  className="w-full h-full flex flex-col justify-end overflow-y-auto no-scrollbar"
                >
                  {messages.length === 0 ? (
                    <div className="py-12 flex flex-col items-center justify-center text-center text-slate-500 space-y-1.5">
                      <MessageSquare className="w-6 h-6 opacity-40 text-slate-400" />
                      <p className="text-xs text-slate-400">No chat messages yet.</p>
                      <p className="text-[11px] text-slate-500">
                        Click <strong className="text-slate-300">Simulate</strong> or type a message below to test.
                      </p>
                    </div>
                  ) : (
                    messages.map((item) => renderMessageContent(item))
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Quick Tag Pills */}
          <div className="px-4 py-2 bg-[#090D16] border-t border-slate-800/80 flex items-center gap-2 overflow-x-auto no-scrollbar flex-shrink-0">
            <span className="text-[10px] text-slate-500 font-mono uppercase flex-shrink-0">Quick Chat:</span>
            {QUICK_TAGS.map((tag) => (
              <button
                key={tag}
                type="button"
                onClick={() => handleSendTestMessage(tag)}
                className="px-2.5 py-1 rounded-md bg-slate-950 hover:bg-slate-800 text-[11px] text-slate-300 hover:text-white border border-slate-800 whitespace-nowrap transition-colors flex-shrink-0"
              >
                {tag}
              </button>
            ))}
          </div>

          {/* Bottom Interactive Message Composer */}
          <div className="p-3 bg-[#090D16] border-t border-slate-800/80 flex-shrink-0">
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
                placeholder="Type a test chat message..."
                value={customInput}
                onChange={(e) => setCustomInput(e.target.value)}
                className="flex-1 bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-slate-600"
              />
              <button
                type="submit"
                disabled={sendingTest || !customInput.trim()}
                className="bg-slate-100 hover:bg-white disabled:opacity-40 text-slate-950 font-semibold px-4 py-2 rounded-lg text-xs flex items-center gap-1.5 transition-colors"
              >
                <Send className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Send</span>
              </button>
            </form>
          </div>
        </div>

        {/* ============================================================== */}
        {/* MOBILE BACKDROP OVERLAY                                        */}
        {/* ============================================================== */}
        <div
          className={`fixed inset-0 z-[90] bg-black/60 lg:hidden transition-opacity duration-300 ease-in-out ${
            isRightbarOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
          }`}
          onClick={closeRightbar}
        />

        {/* ============================================================== */}
        {/* RIGHT COLUMN: SIMPLE CONFIG RIGHTBAR (NO SAVE/RESET BUTTONS)   */}
        {/* ============================================================== */}
        <div
          className={`fixed inset-y-0 right-0 z-[100] w-full sm:w-[380px] lg:relative lg:inset-auto lg:z-auto shrink-0 h-[100dvh] max-h-[100dvh] lg:h-full lg:max-h-none lg:min-h-0 overflow-hidden transition-all duration-300 ease-in-out ${
            isRightbarOpen
              ? 'translate-x-0 lg:w-[350px] xl:w-[380px] lg:opacity-100 pointer-events-auto'
              : 'translate-x-full lg:translate-x-0 lg:w-0 lg:opacity-0 lg:-ml-4 pointer-events-none'
          }`}
        >
          <aside
            ref={settingsSectionRef}
            id="chat-settings-section"
            className="w-full sm:w-[380px] lg:w-[350px] xl:w-[380px] bg-[#0B0F19] sm:border-l border-slate-800 flex flex-col h-full overflow-hidden lg:rounded-xl lg:border lg:border-slate-800/80"
          >
            {/* Rightbar Header (Clean, without duplicate Save button) */}
            <div className="px-4 py-3 border-b border-slate-800/80 bg-[#090D16] flex items-center justify-between gap-3 flex-shrink-0">
              <div className="min-w-0">
                <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                  Chat Configuration
                </h3>
                <p className="text-[11px] text-slate-400">Customize layout, dimensions &amp; typography</p>
              </div>

              <div className="flex items-center gap-2 flex-shrink-0">
                {hasUnsavedChanges && (
                  <span className="text-[10px] font-mono text-amber-300 px-2 py-0.5 rounded bg-amber-500/10 border border-amber-500/30">
                    Modified
                  </span>
                )}
                <button
                  type="button"
                  onClick={closeRightbar}
                  className="p-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-400 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
                  title="Close Settings"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

          {/* Error Alert Banner if Save failed */}
          {saveError && (
            <div className="px-4 py-2.5 bg-red-950/80 border-b border-red-500/40 text-red-200 text-xs flex items-center gap-2">
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
          <div className="flex-1 overflow-y-auto p-4 space-y-5">
            {/* SECTION 0: CHAT OVERLAY TEMPLATE / THEME */}
            <div className="space-y-2.5 pb-4 border-b border-slate-800/80">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-200">Overlay Theme</span>
                <span className="text-[10px] font-mono text-slate-400 uppercase">
                  {CHAT_THEMES.find((t) => t.id === (settings.theme || 'default'))?.name || 'Classic'}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-1.5">
                {CHAT_THEMES.map((themePreset) => {
                  const isSelected = (settings.theme || 'default') === themePreset.id;
                  return (
                    <button
                      key={themePreset.id}
                      type="button"
                      onClick={() => handleSelectTheme(themePreset.id)}
                      className={`p-2.5 rounded-lg border text-left transition-colors cursor-pointer ${
                        isSelected
                          ? 'border-slate-400 bg-slate-800 text-white'
                          : 'border-slate-800 bg-slate-950 text-slate-300 hover:border-slate-700 hover:bg-slate-900'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-1.5 mb-0.5">
                        <span className="text-xs font-semibold text-white truncate">
                          {themePreset.name}
                        </span>
                        <span className="px-1.5 py-0.5 rounded text-[9px] font-mono text-slate-400 bg-slate-900 border border-slate-800">
                          {themePreset.badge}
                        </span>
                      </div>
                      <div className="text-[10px] text-slate-400 truncate">
                        {themePreset.subtitle}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* SECTION 1: OVERLAY DIMENSIONS (TEXT VALUE INPUTS FOR W & H) */}
            <div className="space-y-3 pb-4 border-b border-slate-800/80">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-200">Overlay Dimensions (W × H)</span>
                <span className="text-[10px] text-slate-400 font-mono">
                  {settings.overlayWidth ? `${settings.overlayWidth}px` : 'Auto'} × {settings.overlayHeight ? `${settings.overlayHeight}px` : 'Auto'}
                </span>
              </div>

              {/* Direct Value Text Inputs for Width (W) and Height (H) */}
              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-[11px] text-slate-400 font-medium mb-1">
                    Width (W)
                  </label>
                  <div className="relative flex items-center">
                    <input
                      type="text"
                      inputMode="numeric"
                      value={widthInput}
                      placeholder="420 (0 = Auto)"
                      onChange={(e) => {
                        const raw = e.target.value.replace(/[^0-9]/g, '');
                        setWidthInput(raw);
                        if (raw !== '') {
                          const parsed = Math.min(3840, Math.max(0, parseInt(raw, 10) || 0));
                          setSettings((prev) => ({ ...prev, overlayWidth: parsed }));
                        }
                      }}
                      onBlur={() => {
                        if (widthInput.trim() === '') {
                          setWidthInput('0');
                          setSettings((prev) => ({ ...prev, overlayWidth: 0 }));
                        }
                      }}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-3 pr-8 py-2 text-xs font-mono text-white placeholder-slate-600 focus:outline-none focus:border-slate-500"
                    />
                    <span className="absolute right-2.5 text-[10px] font-mono text-slate-500 pointer-events-none">
                      px
                    </span>
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] text-slate-400 font-medium mb-1">
                    Height (H)
                  </label>
                  <div className="relative flex items-center">
                    <input
                      type="text"
                      inputMode="numeric"
                      value={heightInput}
                      placeholder="600 (0 = Auto)"
                      onChange={(e) => {
                        const raw = e.target.value.replace(/[^0-9]/g, '');
                        setHeightInput(raw);
                        if (raw !== '') {
                          const parsed = Math.min(3840, Math.max(0, parseInt(raw, 10) || 0));
                          setSettings((prev) => ({ ...prev, overlayHeight: parsed }));
                        }
                      }}
                      onBlur={() => {
                        if (heightInput.trim() === '') {
                          setHeightInput('0');
                          setSettings((prev) => ({ ...prev, overlayHeight: 0 }));
                        }
                      }}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-3 pr-8 py-2 text-xs font-mono text-white placeholder-slate-600 focus:outline-none focus:border-slate-500"
                    />
                    <span className="absolute right-2.5 text-[10px] font-mono text-slate-500 pointer-events-none">
                      px
                    </span>
                  </div>
                </div>
              </div>

              {/* Dimension Presets */}
              <div className="grid grid-cols-5 gap-1">
                {[
                  { label: 'Auto (0)', w: 0, h: 0 },
                  { label: '360×480', w: 360, h: 480 },
                  { label: '420×600', w: 420, h: 600 },
                  { label: '600×600', w: 600, h: 600 },
                  { label: '640×800', w: 640, h: 800 }
                ].map((p) => {
                  const active = settings.overlayWidth === p.w && settings.overlayHeight === p.h;
                  return (
                    <button
                      key={p.label}
                      type="button"
                      onClick={() => setSettings({ ...settings, overlayWidth: p.w, overlayHeight: p.h })}
                      className={`py-1.5 px-1 rounded-md border text-[10px] font-mono transition-colors truncate text-center ${
                        active
                          ? 'border-slate-500 bg-slate-800 text-white font-semibold'
                          : 'border-slate-800 bg-slate-950 text-slate-400 hover:text-white'
                      }`}
                    >
                      {p.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* SECTION 2: TYPOGRAPHY (USERNAME & MESSAGE FONTS) */}
            <div className="space-y-3 pb-4 border-b border-slate-800/80">
              <span className="text-xs font-semibold text-slate-200 block">Typography</span>

              <div className="space-y-2.5">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-[11px] text-slate-400">Username Font</label>
                    <span className="text-[10px] text-slate-400 font-mono">
                      {settings.authorFontFamily || 'Chakra Petch'}
                    </span>
                  </div>
                  <select
                    value={settings.authorFontFamily || settings.fontFamily || 'Chakra Petch'}
                    onChange={(e) => setSettings({ ...settings, authorFontFamily: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-slate-600"
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
                    <label className="text-[11px] text-slate-400">Message Font</label>
                    <span className="text-[10px] text-slate-400 font-mono">
                      {settings.messageFontFamily || 'Inter'}
                    </span>
                  </div>
                  <select
                    value={settings.messageFontFamily || 'Inter'}
                    onChange={(e) => setSettings({ ...settings, messageFontFamily: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-slate-600"
                  >
                    {CHAT_FONTS.map((f) => (
                      <option key={f.id} value={f.id}>
                        {f.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-[11px] text-slate-400 block mb-1">Font Size</label>
                  <div className="grid grid-cols-4 gap-1.5">
                    {(['sm', 'base', 'lg', 'xl'] as const).map((sz) => (
                      <button
                        key={sz}
                        type="button"
                        onClick={() => setSettings({ ...settings, fontSize: sz })}
                        className={`py-1.5 text-xs font-medium rounded-lg border uppercase transition-colors ${
                          settings.fontSize === sz
                            ? 'border-slate-500 bg-slate-800 text-white font-semibold'
                            : 'border-slate-800 bg-slate-950 text-slate-400 hover:text-white'
                        }`}
                      >
                        {sz}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="text-[11px] text-slate-400 block mb-1">Line Layout</label>
                  <div className="grid grid-cols-3 gap-1.5">
                    {[
                      { id: 'inline', label: 'Inline' },
                      { id: 'indented', label: 'Indented' },
                      { id: 'stacked', label: 'Stacked' }
                    ].map((styleOption) => (
                      <button
                        key={styleOption.id}
                        type="button"
                        onClick={() => setSettings({ ...settings, lineStyle: styleOption.id as any })}
                        className={`py-1.5 px-2 text-center rounded-lg border text-xs transition-colors cursor-pointer ${
                          (settings.lineStyle || 'inline') === styleOption.id
                            ? 'border-slate-500 bg-slate-800 text-white font-semibold'
                            : 'border-slate-800 bg-slate-950 text-slate-400 hover:text-white'
                        }`}
                      >
                        {styleOption.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* SECTION 3: COLORS */}
            <div className="space-y-3 pb-4 border-b border-slate-800/80">
              <span className="text-xs font-semibold text-slate-200 block">Colors</span>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">Author Color</label>
                  <div className="flex items-center gap-1.5 bg-slate-950 border border-slate-800 rounded-lg p-1.5">
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
                      className="w-full bg-slate-900 border border-slate-800 rounded px-1.5 py-0.5 text-[11px] font-mono text-white uppercase focus:outline-none focus:border-slate-600"
                      maxLength={7}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">Message Color</label>
                  <div className="flex items-center gap-1.5 bg-slate-950 border border-slate-800 rounded-lg p-1.5">
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
                      className="w-full bg-slate-900 border border-slate-800 rounded px-1.5 py-0.5 text-[11px] font-mono text-white uppercase focus:outline-none focus:border-slate-600"
                      maxLength={7}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* SECTION 4: TEXT BORDER & SHADOW */}
            <div className="space-y-3 pb-4 border-b border-slate-800/80">
              <span className="text-xs font-semibold text-slate-200 block">Text Stroke &amp; Shadow</span>

              <div className="space-y-2 p-2.5 rounded-lg bg-slate-950 border border-slate-800">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] text-slate-400">Outline Width</label>
                  <span className="text-[10px] text-slate-300 font-mono">
                    {settings.textBorderWidth === 0 ? 'None' : `${settings.textBorderWidth}px`}
                  </span>
                </div>
                <div className="grid grid-cols-5 gap-1">
                  {[0, 1, 2, 3, 4].map((w) => {
                    const isSelected = (settings.textBorderWidth ?? 0) === w;
                    return (
                      <button
                        key={w}
                        type="button"
                        onClick={() => setSettings({ ...settings, textBorderWidth: w })}
                        className={`py-1 rounded border text-xs font-mono transition-colors ${
                          isSelected
                            ? 'bg-slate-800 border-slate-500 text-white font-semibold'
                            : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                        }`}
                      >
                        {w === 0 ? '0' : `${w}px`}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="space-y-2 p-2.5 rounded-lg bg-slate-950 border border-slate-800">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] text-slate-400">Text Shadow</label>
                  <span className="text-[10px] text-slate-300 font-mono capitalize">
                    {settings.textShadowStyle || 'none'}
                  </span>
                </div>
                <div className="grid grid-cols-4 gap-1">
                  {[
                    { id: 'none', label: 'None' },
                    { id: 'soft', label: 'Soft' },
                    { id: 'strong', label: 'Strong' },
                    { id: 'glow', label: 'Glow' }
                  ].map((s) => {
                    const isSelected = (settings.textShadowStyle || 'none') === s.id;
                    return (
                      <button
                        key={s.id}
                        type="button"
                        onClick={() => setSettings({ ...settings, textShadowStyle: s.id as any })}
                        className={`py-1 rounded border text-xs transition-colors ${
                          isSelected
                            ? 'bg-slate-800 border-slate-500 text-white font-semibold'
                            : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                        }`}
                      >
                        {s.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* SECTION 5: ANIMATION STYLE */}
            <div className="space-y-2.5 pb-4 border-b border-slate-800/80">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-200">Entry Animation</span>
                <span className="text-[10px] text-slate-400 font-mono">
                  {settings.animationStyle || 'slide-left'}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-1.5 max-h-48 overflow-y-auto pr-0.5">
                {ANIMATION_STYLES.map((anim) => {
                  const isSelected = (settings.animationStyle || 'slide-left') === anim.id;
                  return (
                    <button
                      key={anim.id}
                      type="button"
                      onClick={() => setSettings({ ...settings, animationStyle: anim.id })}
                      className={`p-2 rounded-lg border text-left transition-colors cursor-pointer ${
                        isSelected
                          ? 'border-slate-500 bg-slate-800 text-white'
                          : 'border-slate-800 bg-slate-950 text-slate-300 hover:border-slate-700 hover:text-white'
                      }`}
                    >
                      <div className="text-[11px] font-semibold truncate">{anim.name}</div>
                      <div className="text-[10px] text-slate-400 truncate">{anim.desc}</div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* SECTION 6: NOTIFICATION SOUND */}
            <div className="space-y-2.5 pb-4 border-b border-slate-800/80">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-200">Notification Sound</span>
                <input
                  type="checkbox"
                  checked={settings.soundEnabled}
                  onChange={(e) => setSettings((prev) => ({ ...prev, soundEnabled: e.target.checked }))}
                  className="rounded border-slate-700 bg-slate-950 text-slate-200 focus:ring-0"
                />
              </div>

              {settings.soundEnabled && (
                <div className="space-y-2.5 p-2.5 rounded-lg bg-slate-950 border border-slate-800">
                  <div className="grid grid-cols-2 gap-1.5 max-h-40 overflow-y-auto">
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
                          className={`p-2 rounded-md border text-left transition-colors ${
                            isSelected
                              ? 'border-slate-500 bg-slate-800 text-white'
                              : 'border-slate-800 bg-slate-900 text-slate-300 hover:border-slate-700'
                          }`}
                        >
                          <div className="text-[11px] font-medium truncate">{preset.name}</div>
                          <div className="text-[9px] text-slate-400 truncate">{preset.desc}</div>
                        </button>
                      );
                    })}
                  </div>

                  <div className="flex items-center gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => {
                        if (isPlayingAudio) {
                          stopPreviewSound();
                        } else {
                          playPreviewSound(settings.soundUrl, settings.soundVolume);
                        }
                      }}
                      className="px-2.5 py-1.5 rounded-md bg-slate-800 hover:bg-slate-700 text-white text-xs font-medium flex items-center gap-1.5"
                    >
                      {isPlayingAudio ? <Square className="w-3 h-3" /> : <Play className="w-3 h-3" />}
                      <span>{isPlayingAudio ? 'Stop' : 'Preview'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setIsMediaPickerOpen(true)}
                      className="flex-1 px-2.5 py-1.5 rounded-md bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-200 text-xs font-medium flex items-center justify-center gap-1.5"
                    >
                      <FolderOpen className="w-3.5 h-3.5" />
                      <span>Media Library</span>
                    </button>
                  </div>

                  <div className="space-y-1 pt-1">
                    <div className="flex justify-between text-[11px] text-slate-400">
                      <span>Volume</span>
                      <span className="font-mono text-slate-200">{Math.round((settings.soundVolume ?? 0.85) * 100)}%</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.05"
                      value={settings.soundVolume ?? 0.85}
                      onChange={(e) => setSettings({ ...settings, soundVolume: parseFloat(e.target.value) })}
                      className="w-full accent-slate-300 cursor-pointer"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* SECTION 7: TIMING & DISPLAY TOGGLES */}
            <div className="space-y-3">
              <span className="text-xs font-semibold text-slate-200 block">Timing &amp; Display</span>

              <div>
                <div className="flex justify-between text-[11px] text-slate-400 mb-1">
                  <span>Message Delay</span>
                  <span className="font-mono text-slate-200">
                    {(settings.messageDelay ?? 0) === 0 ? 'Instant (0s)' : `${settings.messageDelay}s`}
                  </span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="30"
                  step="1"
                  value={settings.messageDelay ?? 0}
                  onChange={(e) => setSettings({ ...settings, messageDelay: Number(e.target.value) })}
                  className="w-full accent-slate-300 cursor-pointer"
                />
              </div>

              <div>
                <div className="flex justify-between text-[11px] text-slate-400 mb-1">
                  <span>Auto-Fade</span>
                  <span className="font-mono text-slate-200">
                    {settings.fadeDuration === 0 ? 'Never' : `${settings.fadeDuration}s`}
                  </span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="60"
                  step="5"
                  value={settings.fadeDuration}
                  onChange={(e) => setSettings({ ...settings, fadeDuration: Number(e.target.value) })}
                  className="w-full accent-slate-300 cursor-pointer"
                />
              </div>

              <div>
                <div className="flex justify-between text-[11px] text-slate-400 mb-1">
                  <span>Max Messages</span>
                  <span className="font-mono text-slate-200">{settings.maxMessages}</span>
                </div>
                <input
                  type="range"
                  min="3"
                  max="20"
                  value={settings.maxMessages}
                  onChange={(e) => setSettings({ ...settings, maxMessages: Number(e.target.value) })}
                  className="w-full accent-slate-300 cursor-pointer"
                />
              </div>

              <div className="grid grid-cols-2 gap-2 pt-1">
                <label className="flex items-center gap-2 p-2.5 rounded-lg bg-slate-950 border border-slate-800 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.showBadges}
                    onChange={(e) => setSettings({ ...settings, showBadges: e.target.checked })}
                    className="rounded border-slate-700 bg-slate-900 text-slate-200 focus:ring-0"
                  />
                  <span className="text-xs text-slate-300">Role Badges</span>
                </label>

                <label className="flex items-center gap-2 p-2.5 rounded-lg bg-slate-950 border border-slate-800 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.showTimestamp}
                    onChange={(e) => setSettings({ ...settings, showTimestamp: e.target.checked })}
                    className="rounded border-slate-700 bg-slate-900 text-slate-200 focus:ring-0"
                  />
                  <span className="text-xs text-slate-300">Timestamps</span>
                </label>
              </div>
            </div>
          </div>
          </aside>
        </div>
      </div>

      {/* ============================================================== */}
      {/* FLOATING UNSAVED CHANGES TOAST BAR                             */}
      {/* ============================================================== */}
      <div
        className={`fixed bottom-5 left-1/2 -translate-x-1/2 z-50 w-[calc(100%-1.5rem)] max-w-xl transition-all duration-300 ease-in-out ${
          hasUnsavedChanges
            ? 'translate-y-0 opacity-100 pointer-events-auto'
            : 'translate-y-24 opacity-0 pointer-events-none'
        } ${isEarthquake ? 'animate-toast-earthquake' : ''}`}
      >
        <div
          className={`rounded-xl px-4 py-3 transition-all duration-300 flex items-center justify-between gap-3 ${
            isEarthquake
              ? 'bg-red-950 border border-red-500 shadow-2xl'
              : 'bg-[#090D16] border border-slate-700 shadow-2xl'
          }`}
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="min-w-0">
              <div className={`text-xs font-semibold truncate ${isEarthquake ? 'text-red-200' : 'text-white'}`}>
                {isEarthquake ? 'Unsaved changes — please save or reset first' : 'You have unsaved changes'}
              </div>
              <p className={`text-[11px] truncate hidden xs:block ${isEarthquake ? 'text-red-300' : 'text-slate-400'}`}>
                Save your configuration to update your OBS live chat overlay
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            <button
              type="button"
              disabled={saving}
              onClick={handleResetChanges}
              className="px-3 py-1.5 rounded-lg text-xs font-medium text-slate-300 hover:text-white bg-slate-900 hover:bg-slate-800 border border-slate-800 transition-colors cursor-pointer"
            >
              Reset
            </button>
            <button
              type="button"
              onClick={handleSaveSettings}
              disabled={saving}
              className="px-4 py-1.5 rounded-lg text-xs font-semibold bg-white hover:bg-slate-200 text-slate-950 transition-colors cursor-pointer disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </div>
      </div>

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
