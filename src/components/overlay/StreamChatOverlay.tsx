'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Crown, Star, Flame, Sparkles, ShieldCheck, Zap, Heart } from 'lucide-react';
import { useSocket } from '../../context/SocketContext';
import { CHAT_ANIMATIONS_CSS } from '../../utils/chatAnimations';
import { getBadgeIconComponent } from '../../data/badgeIcons';
import { ChatOverlayTheme, CHAT_THEMES } from '../../data/chatOverlayPresets';

export interface ChatMessage {
  id: string;
  author: string;
  message: string;
  avatar?: string;
  badge?: string;
  badgeColor?: string;
  badgeBg?: string;
  badgeBorder?: string;
  badgeIcon?: string;
  badgeGifUrl?: string;
  badgeImage?: string;
  platform?: string;
  timestamp: number;
}

export interface StreamChatSettings {
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
  fadeDuration: number; // in seconds (0 = never fade)
  messageDelay: number; // in seconds (0 = instant)
  maxMessages: number;
  textBorderWidth: number;
  textBorderColor: string;
  textShadowStyle: 'none' | 'soft' | 'strong' | 'glow' | 'custom';
  textShadowColor: string;
  textShadowBlur: number;
  soundEnabled?: boolean;
  soundUrl?: string;
  soundVolume?: number;
  youtubeUrl?: string;
}

const DEFAULT_SETTINGS: StreamChatSettings = {
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

interface StreamChatOverlayProps {
  token: string;
}

export const StreamChatOverlay: React.FC<StreamChatOverlayProps> = ({ token }) => {
  const effectiveToken = token || 'demo-token';
  const { socket, joinOverlayRoom } = useSocket();

  const [settings, setSettings] = useState<StreamChatSettings>(DEFAULT_SETTINGS);
  const settingsRef = useRef<StreamChatSettings>(settings);
  useEffect(() => {
    settingsRef.current = settings;
  }, [settings]);

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLocked, setIsLocked] = useState<boolean>(false);
  const chatContainerRef = useRef<HTMLDivElement>(null);

  // Smooth & Instant Animated Message Queue
  const messageQueueRef = useRef<ChatMessage[]>([]);
  const isDrainingRef = useRef<boolean>(false);
  const lastSoundTimeRef = useRef<number>(0);
  const drainTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Clean up any pending stagger timers on unmount
  useEffect(() => {
    return () => {
      if (drainTimerRef.current) {
        clearTimeout(drainTimerRef.current);
      }
    };
  }, []);

  const playNotificationSound = () => {
    const curSettings = settingsRef.current;
    if (curSettings.soundEnabled === false || typeof window === 'undefined' || typeof Audio === 'undefined') {
      return;
    }
    const now = Date.now();
    // Throttle audio by 180ms to avoid audio distortion during high-volume bursts
    if (now - lastSoundTimeRef.current < 180) {
      return;
    }
    lastSoundTimeRef.current = now;
    try {
      const soundSrc = curSettings.soundUrl || '/sounds/cash-register-kaching.mp3';
      const audio = new Audio(soundSrc);
      const volume = curSettings.soundVolume !== undefined ? curSettings.soundVolume : 0.85;
      audio.volume = Math.min(1, Math.max(0, volume));
      audio.play().catch((err) => {
        console.warn('[StreamChatOverlay] Audio play blocked:', err);
      });
    } catch (err) {
      console.warn('[StreamChatOverlay] Audio playback error:', err);
    }
  };

  const drainQueue = () => {
    if (messageQueueRef.current.length === 0) {
      isDrainingRef.current = false;
      return;
    }

    isDrainingRef.current = true;
    const nextMsg = messageQueueRef.current.shift();
    if (!nextMsg) {
      isDrainingRef.current = false;
      return;
    }

    // Deliver next message into visible stream overlay
    setMessages((prev) => {
      if (nextMsg.id && prev.some((m) => m.id === nextMsg.id)) {
        return prev;
      }
      const curMax = settingsRef.current.maxMessages || 10;
      const next = [...prev, { ...nextMsg, timestamp: Date.now() }];
      if (next.length > curMax) {
        return next.slice(next.length - curMax);
      }
      return next;
    });

    playNotificationSound();

    // If more messages exist in queue from a rapid burst, stagger them smoothly
    if (messageQueueRef.current.length > 0) {
      const remaining = messageQueueRef.current.length;
      // Stagger: 260ms for 1-2 queued items (clean slide animation), 160ms for 3-5 items, 100ms for large raids
      const staggerDelay = remaining > 5 ? 100 : remaining > 2 ? 160 : 260;
      drainTimerRef.current = setTimeout(() => {
        drainQueue();
      }, staggerDelay);
    } else {
      isDrainingRef.current = false;
    }
  };

  const enqueueMessage = (msg: ChatMessage) => {
    if (msg.id && messageQueueRef.current.some((m) => m.id === msg.id)) {
      return;
    }

    messageQueueRef.current.push(msg);

    // If queue is idle, display the first message immediately with 0ms latency!
    if (!isDrainingRef.current) {
      drainQueue();
    }
  };

  // 1. Initial settings fetch
  useEffect(() => {
    fetch(`/api/widgets/chat?token=${effectiveToken}`)
      .then((res) => res.json())
      .then((data) => {
        setIsLocked(false);
        if (data.settings) {
          setSettings((prev) => ({ ...prev, ...data.settings }));
        }
      })
      .catch(() => {});
  }, [effectiveToken]);

  // 2. Join overlay room
  useEffect(() => {
    if (effectiveToken) {
      joinOverlayRoom(effectiveToken);
    }
  }, [effectiveToken, joinOverlayRoom]);

  // 3. Socket event handlers
  useEffect(() => {
    if (!socket) return;

    const handleChatMessage = (msg: ChatMessage) => {
      if (isLocked || !msg) return;
      const isTestMsg = msg.id?.startsWith('test_') || Boolean((msg as any).isTest);
      const delayMs = isTestMsg ? 0 : Math.max(0, (settingsRef.current.messageDelay || 0) * 1000);

      if (delayMs > 0) {
        setTimeout(() => enqueueMessage(msg), delayMs);
      } else {
        enqueueMessage(msg);
      }
    };

    const handleSettingsUpdated = (updated: Partial<StreamChatSettings>) => {
      setSettings((prev) => ({ ...prev, ...updated }));
    };

    socket.on('chat:message', handleChatMessage);
    socket.on('chat:settings_updated', handleSettingsUpdated);

    return () => {
      socket.off('chat:message', handleChatMessage);
      socket.off('chat:settings_updated', handleSettingsUpdated);
    };
  }, [socket, isLocked]);

  // 4. Auto fade-out messages after fadeDuration seconds
  useEffect(() => {
    if (!settings.fadeDuration || settings.fadeDuration <= 0) return;

    const interval = setInterval(() => {
      const now = Date.now();
      const expirationMs = settings.fadeDuration * 1000;
      setMessages((prev) => prev.filter((m) => now - m.timestamp < expirationMs));
    }, 1000);

    return () => clearInterval(interval);
  }, [settings.fadeDuration]);

  // Auto-scroll to bottom as new messages arrive
  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [messages]);

  if (isLocked) {
    return <div className="w-full h-full bg-transparent" />;
  }

  // Helper for font size class & matching line heights
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
      <span className="inline-flex items-center justify-center flex-shrink-0" title="YouTube">
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

  const renderBadgeElement = (item: ChatMessage) => {
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

  const renderMessageContent = (item: ChatMessage) => {
    const urlTheme = typeof window !== 'undefined'
      ? (new URLSearchParams(window.location.search).get('theme') as ChatOverlayTheme | null)
      : null;
    const activeTheme: ChatOverlayTheme = urlTheme || settings.theme || 'default';
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
                {renderPlatformIcon(item.platform || 'youtube')}
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
                  {new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
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
                {renderPlatformIcon(item.platform || 'youtube')}
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
                {new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
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
              {renderPlatformIcon(item.platform || 'youtube')}
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
                {new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
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
              {renderPlatformIcon(item.platform || 'youtube')}
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
                {new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
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
                {renderPlatformIcon(item.platform || 'youtube')}
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
                  {new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
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
            {renderPlatformIcon(item.platform || 'youtube')}
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
            {new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </span>
        )}
      </div>
    );
  };

  return (
    <div
      className="w-full h-full min-h-screen bg-transparent p-0 flex flex-col justify-end overflow-hidden select-none pointer-events-none"
      style={{ fontFamily: settings.fontFamily || 'Chakra Petch, sans-serif' }}
    >
      <style>{CHAT_ANIMATIONS_CSS}</style>
      <div
        ref={chatContainerRef}
        className="flex flex-col justify-end overflow-y-auto no-scrollbar scroll-smooth"
        style={{
          width: settings.overlayWidth && settings.overlayWidth > 0 ? `${settings.overlayWidth}px` : '100%',
          maxWidth: settings.overlayWidth && settings.overlayWidth > 0 ? `${settings.overlayWidth}px` : '100%',
          height: settings.overlayHeight && settings.overlayHeight > 0 ? `${settings.overlayHeight}px` : '100%',
          maxHeight: settings.overlayHeight && settings.overlayHeight > 0 ? `${settings.overlayHeight}px` : '100%',
          boxSizing: 'border-box'
        }}
      >
        {messages.map((item) => renderMessageContent(item))}
      </div>
    </div>
  );
};

export default StreamChatOverlay;
