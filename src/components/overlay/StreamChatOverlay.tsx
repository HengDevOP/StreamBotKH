'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Crown, Star, Flame, Sparkles, ShieldCheck, Zap, Heart } from 'lucide-react';
import { useSocket } from '../../context/SocketContext';
import { CHAT_ANIMATIONS_CSS } from '../../utils/chatAnimations';
import { getBadgeIconComponent } from '../../data/badgeIcons';

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
  youtubeUrl?: string;
}

const DEFAULT_SETTINGS: StreamChatSettings = {
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
  youtubeUrl: ''
};

interface StreamChatOverlayProps {
  token: string;
}

export const StreamChatOverlay: React.FC<StreamChatOverlayProps> = ({ token }) => {
  const effectiveToken = token || 'demo-token';
  const { socket, joinOverlayRoom } = useSocket();

  const [settings, setSettings] = useState<StreamChatSettings>(DEFAULT_SETTINGS);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLocked, setIsLocked] = useState<boolean>(false);
  const chatContainerRef = useRef<HTMLDivElement>(null);

  // 1. Initial settings fetch & Pro plan verification
  useEffect(() => {
    fetch(`/api/widgets/chat?token=${effectiveToken}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.isLocked || !data.success) {
          setIsLocked(true);
          return;
        }
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
      if (isLocked) return;
      const isTestMsg = msg.id?.startsWith('test_') || Boolean((msg as any).isTest);
      const delayMs = isTestMsg ? 0 : Math.max(0, (settings.messageDelay || 0) * 1000);
      const pushMessage = () => {
        setMessages((prev) => {
          if (msg.id && prev.some((m) => m.id === msg.id)) {
            return prev;
          }
          const next = [...prev, { ...msg, timestamp: Date.now() }];
          if (next.length > (settings.maxMessages || 10)) {
            return next.slice(next.length - (settings.maxMessages || 10));
          }
          return next;
        });
      };

      if (delayMs > 0) {
        setTimeout(pushMessage, delayMs);
      } else {
        pushMessage();
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
  }, [socket, isLocked, settings.maxMessages, settings.messageDelay]);

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
    const width = settings.textBorderWidth ?? 0;
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

  return (
    <div
      className="w-full h-full min-h-screen bg-transparent p-4 sm:p-6 flex flex-col justify-end overflow-hidden select-none pointer-events-none"
      style={{ fontFamily: settings.fontFamily || 'Chakra Petch, sans-serif' }}
    >
      <style>{CHAT_ANIMATIONS_CSS}</style>
      <div
        ref={chatContainerRef}
        className="flex flex-col justify-end overflow-y-auto no-scrollbar scroll-smooth"
        style={{
          width: settings.overlayWidth && settings.overlayWidth > 0 ? `${settings.overlayWidth}px` : '100%',
          maxWidth: settings.overlayWidth && settings.overlayWidth > 0 ? `${settings.overlayWidth}px` : '100%',
          maxHeight: settings.overlayHeight && settings.overlayHeight > 0 ? `${settings.overlayHeight}px` : '90vh'
        }}
      >
        {messages.map((item) => (
          <div
            key={item.id}
            className={`w-full p-1 sm:p-1.5 mb-1 select-none chat-anim-${settings.animationStyle || 'slide-left'} ${getFontSizeClass(settings.fontSize)}`}
          >
            {/* Format: [logo] {username} {badges}: {first part of message} */}
            {/* Wrapped lines wrap indented under message, never under logo */}
            <div className="w-full flex items-baseline gap-1.5 select-none break-words [overflow-wrap:anywhere] [word-break:break-word] text-left">
              <div className="flex-shrink-0 inline-flex items-baseline gap-1 self-baseline select-none whitespace-nowrap">
                <span className="inline-flex items-center justify-center self-center flex-shrink-0">
                  {renderPlatformIcon(item.platform || 'youtube')}
                </span>
                <span
                  className="font-bold tracking-wide"
                  style={{
                    color: settings.authorColor || '#00F0FF',
                    fontFamily: settings.authorFontFamily || settings.fontFamily || 'Chakra Petch',
                    WebkitTextStroke: getTextStrokeCSS(),
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
                className="flex-1 min-w-0 text-left"
                style={{
                  color: settings.messageColor || '#FFFFFF',
                  fontFamily: settings.messageFontFamily || settings.fontFamily || 'Inter',
                  WebkitTextStroke: getTextStrokeCSS(),
                  textShadow: getTextShadowCSS(),
                  wordBreak: 'break-word',
                  overflowWrap: 'anywhere'
                }}
              >
                <span>{item.message}</span>
                {settings.showTimestamp && (
                  <span className="text-[10px] text-slate-400 ml-2 select-none opacity-75 inline-block">
                    {new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default StreamChatOverlay;
