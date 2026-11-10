'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useSocket } from '../../context/SocketContext';
import {
  Sparkles,
  Bell,
  Flame,
  Radio,
  Crown,
  Star,
  Heart,
  Tv,
  Target,
  Trophy
} from 'lucide-react';

export interface CustomOverlayConfig {
  id?: string;
  streamerToken?: string;
  badgeText?: string;
  badgeIcon?: string;
  headline: string;
  subtext?: string;
  tickerMessages?: string[];
  animationFlow: 'marquee' | 'typewriter' | 'fade-slide' | 'float-bounce' | 'wave-glow' | 'cyber-glitch' | 'flip-3d';
  animationSpeed: 'slow' | 'normal' | 'fast';
  showGoal: boolean;
  goalLayout?: 'docked' | 'compact-pill' | 'stacked';
  customWidth?: number;
  customHeight?: number;
  layoutPosition: 'top-ticker' | 'bottom-ticker' | 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'center-lower';
  fontFamily: string;
  fontSize: number;
  textColor: string;
  accentColor: string;
  glowColor: string;
  backgroundColor: string;
  borderColor: string;
  backgroundStyle: 'glass' | 'deep' | 'neon-border' | 'transparent';
  showBackground?: boolean;
  isActive?: boolean;
}

export interface LiveGoalData {
  id?: string;
  title: string;
  targetAmount: number;
  currentAmount: number;
  accentColor: string;
  templateStyle?: string;
}

interface CustomStreamOverlayProps {
  token: string;
  initialConfig?: CustomOverlayConfig;
  initialGoal?: LiveGoalData | null;
  isPreview?: boolean;
  isInsideCustomBox?: boolean;
}

export const CustomStreamOverlay: React.FC<CustomStreamOverlayProps> = ({
  token,
  initialConfig,
  initialGoal,
  isPreview = false,
  isInsideCustomBox = false
}) => {
  const { socket, joinOverlayRoom } = useSocket();

  const [config, setConfig] = useState<CustomOverlayConfig>(
    initialConfig || {
      badgeText: '🔴 LIVE STREAM',
      badgeIcon: 'radio',
      headline: 'Welcome to the Stream! Don’t forget to follow & share!',
      subtext: '💬 Type !socials in chat • 🎁 Support via KHQR / ABA live • ⚡ Daily Gaming & Chill',
      tickerMessages: [
        'Welcome to the Stream! Don’t forget to follow & share!',
        '💬 Type !socials in chat for Discord & Telegram links',
        '🎁 Support via KHQR / ABA live on screen with instant alert',
        '⚡ Daily Gaming, chill vibes & community giveaways'
      ],
      animationFlow: 'marquee',
      animationSpeed: 'normal',
      showGoal: true,
      goalLayout: 'compact-pill',
      customWidth: 1920,
      customHeight: 1080,
      layoutPosition: 'top-ticker',
      fontFamily: 'Inter',
      fontSize: 18,
      textColor: '#FFFFFF',
      accentColor: '#10B981',
      glowColor: '#10B981',
      backgroundColor: 'rgba(11, 15, 25, 0.88)',
      borderColor: 'rgba(16, 185, 129, 0.35)',
      backgroundStyle: 'glass',
      showBackground: true,
      isActive: true
    }
  );

  const [goal, setGoal] = useState<LiveGoalData | null>(
    initialGoal || {
      title: 'Livestream Goal',
      targetAmount: 100,
      currentAmount: 45,
      accentColor: '#10B981',
      templateStyle: 'cyber-neon'
    }
  );

  const [activeMessageIndex, setActiveMessageIndex] = useState(0);

  // Typewriter state
  const [typewriterText, setTypewriterText] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [typewriterLoop, setTypewriterLoop] = useState(0);

  // Derive active configuration (prioritizing live props in preview mode for zero-latency response)
  const activeConfig: CustomOverlayConfig = isPreview && initialConfig ? initialConfig : config;
  const activeGoal: LiveGoalData | null = isPreview && initialGoal ? initialGoal : goal;

  // Fallback goal guarantee for preview and live stream display
  const fallbackGoal: LiveGoalData = useMemo(() => ({
    title: 'Livestream Goal',
    targetAmount: 100,
    currentAmount: 45,
    accentColor: activeConfig.accentColor || '#10B981',
    templateStyle: 'cyber-neon'
  }), [activeConfig.accentColor]);

  const displayGoal = activeGoal || fallbackGoal;

  // 1. Fetch initial configuration & active goal if not supplied via props
  useEffect(() => {
    if (initialConfig) {
      setConfig(initialConfig);
      if (initialGoal !== undefined) setGoal(initialGoal);
      return;
    }

    let isMounted = true;
    fetch(`/api/widgets/custom-overlay?token=${token || 'demo-token'}`)
      .then((res) => res.json())
      .then((data) => {
        if (!isMounted) return;
        if (data.success && data.overlay) {
          setConfig(data.overlay);
          if (data.goal) {
            setGoal(data.goal);
          }
        }
      })
      .catch((err) => console.error('[CustomOverlay] Error loading settings:', err));

    fetch(`/api/widgets/goals?token=${token || 'demo-token'}`)
      .then((res) => res.json())
      .then((data) => {
        if (!isMounted) return;
        if (data.success && (data.goal || data.activeGoal)) {
          const g = data.goal || data.activeGoal;
          setGoal({
            id: g.id || String(g._id),
            title: g.title || 'Livestream Goal',
            targetAmount: Number(g.targetAmount ?? g.target_amount ?? 100),
            currentAmount: Number(g.currentAmount ?? g.current_amount ?? 0),
            accentColor: g.accentColor || g.accent_color || '#10B981',
            templateStyle: g.templateStyle || g.template_style || 'cyber-neon'
          });
        }
      })
      .catch(() => {});

    return () => {
      isMounted = false;
    };
  }, [token, initialConfig, initialGoal]);

  // 2. Join Socket.IO Room for live OBS instance
  useEffect(() => {
    if (!isPreview && token && joinOverlayRoom) {
      joinOverlayRoom(token);
    }
  }, [token, isPreview, joinOverlayRoom]);

  // 3. Socket event listeners for real-time OBS updates
  useEffect(() => {
    if (!socket || isPreview) return;

    const handleCustomOverlayUpdate = (payload: any) => {
      if (!payload) return;
      setConfig((prev) => ({
        ...prev,
        ...payload,
        tickerMessages: Array.isArray(payload.tickerMessages) && payload.tickerMessages.length > 0
          ? payload.tickerMessages
          : prev.tickerMessages
      }));
    };

    const handleGoalUpdate = (payload: any) => {
      if (!payload) return;
      setGoal((prev) => ({
        id: payload.id || prev?.id,
        title: payload.title || prev?.title || 'Livestream Goal',
        targetAmount: Number(payload.targetAmount ?? prev?.targetAmount ?? 100),
        currentAmount: Number(payload.currentAmount ?? prev?.currentAmount ?? 0),
        accentColor: payload.accentColor || prev?.accentColor || '#10B981',
        templateStyle: payload.templateStyle || prev?.templateStyle || 'cyber-neon'
      }));
    };

    socket.on('custom-overlay:update', handleCustomOverlayUpdate);
    socket.on('goal:update', handleGoalUpdate);

    return () => {
      socket.off('custom-overlay:update', handleCustomOverlayUpdate);
      socket.off('goal:update', handleGoalUpdate);
    };
  }, [socket, isPreview]);

  // Messages list to cycle through
  const messagesList = useMemo(() => {
    if (activeConfig.tickerMessages && activeConfig.tickerMessages.length > 0) {
      return activeConfig.tickerMessages;
    }
    const list = [activeConfig.headline, activeConfig.subtext].filter(Boolean);
    return list.length > 0 ? list : ['Welcome to the Livestream!'];
  }, [activeConfig.tickerMessages, activeConfig.headline, activeConfig.subtext]);

  // Animation cycle interval for Fade-Slide and Flip-3D
  useEffect(() => {
    if (activeConfig.animationFlow !== 'fade-slide' && activeConfig.animationFlow !== 'flip-3d') return;
    if (messagesList.length <= 1) return;

    const intervalDuration =
      activeConfig.animationSpeed === 'fast' ? 3500 : activeConfig.animationSpeed === 'slow' ? 7000 : 5000;

    const timer = setInterval(() => {
      setActiveMessageIndex((prev) => (prev + 1) % messagesList.length);
    }, intervalDuration);

    return () => clearInterval(timer);
  }, [activeConfig.animationFlow, activeConfig.animationSpeed, messagesList.length]);

  // Typewriter effect engine
  useEffect(() => {
    if (activeConfig.animationFlow !== 'typewriter') return;

    const currentMessage = messagesList[typewriterLoop % messagesList.length] || '';
    const typingSpeed =
      activeConfig.animationSpeed === 'fast' ? 45 : activeConfig.animationSpeed === 'slow' ? 120 : 75;
    const pauseDelay =
      activeConfig.animationSpeed === 'fast' ? 2000 : activeConfig.animationSpeed === 'slow' ? 4500 : 3000;

    let timeout: NodeJS.Timeout;

    if (!isDeleting) {
      if (typewriterText.length < currentMessage.length) {
        timeout = setTimeout(() => {
          setTypewriterText(currentMessage.slice(0, typewriterText.length + 1));
        }, typingSpeed);
      } else {
        timeout = setTimeout(() => {
          setIsDeleting(true);
        }, pauseDelay);
      }
    } else {
      if (typewriterText.length > 0) {
        timeout = setTimeout(() => {
          setTypewriterText(currentMessage.slice(0, typewriterText.length - 1));
        }, typingSpeed / 2);
      } else {
        setIsDeleting(false);
        setTypewriterLoop((prev) => prev + 1);
      }
    }

    return () => clearTimeout(timeout);
  }, [activeConfig.animationFlow, activeConfig.animationSpeed, typewriterText, isDeleting, typewriterLoop, messagesList]);

  // Calculate goal percentage
  const goalPercentage = useMemo(() => {
    if (!displayGoal || !displayGoal.targetAmount || displayGoal.targetAmount <= 0) return 0;
    return Math.min(100, Math.max(0, Math.round((displayGoal.currentAmount / displayGoal.targetAmount) * 100)));
  }, [displayGoal]);

  // Render badge icon
  const renderBadgeIcon = () => {
    const iconClass = 'w-4 h-4 shrink-0';
    switch (activeConfig.badgeIcon) {
      case 'sparkles':
        return <Sparkles className={iconClass} />;
      case 'bell':
        return <Bell className={iconClass} />;
      case 'flame':
        return <Flame className={iconClass} />;
      case 'crown':
        return <Crown className={iconClass} />;
      case 'star':
        return <Star className={iconClass} />;
      case 'heart':
        return <Heart className={iconClass} />;
      case 'tv':
        return <Tv className={iconClass} />;
      case 'none':
        return null;
      case 'radio':
      default:
        return <Radio className={iconClass} />;
    }
  };

  // Marquee duration based on speed
  const marqueeDuration = useMemo(() => {
    switch (activeConfig.animationSpeed) {
      case 'fast':
        return '14s';
      case 'slow':
        return '38s';
      case 'normal':
      default:
        return '24s';
    }
  }, [activeConfig.animationSpeed]);

  // Container styling CSS
  const getContainerStyle = (): React.CSSProperties => {
    const style: React.CSSProperties = {
      fontFamily: activeConfig.fontFamily || 'Inter, sans-serif'
    };

    if (activeConfig.backgroundStyle === 'transparent' || !activeConfig.showBackground) {
      style.background = 'transparent';
      style.borderColor = 'transparent';
      style.boxShadow = 'none';
      return style;
    }

    if (activeConfig.backgroundStyle === 'deep') {
      style.background = '#0B0F19';
      style.borderColor = activeConfig.borderColor || '#1E293B';
      style.boxShadow = `0 10px 25px -5px rgba(0, 0, 0, 0.7), 0 0 15px ${activeConfig.glowColor}25`;
    } else if (activeConfig.backgroundStyle === 'neon-border') {
      style.background = 'rgba(11, 15, 25, 0.92)';
      style.borderColor = activeConfig.glowColor || activeConfig.accentColor;
      style.boxShadow = `0 0 20px ${activeConfig.glowColor}40, inset 0 0 15px ${activeConfig.glowColor}15`;
    } else {
      // Glassmorphism (default)
      style.background = activeConfig.backgroundColor || 'rgba(11, 15, 25, 0.88)';
      style.backdropFilter = 'blur(16px)';
      style.WebkitBackdropFilter = 'blur(16px)';
      style.borderColor = activeConfig.borderColor || 'rgba(16, 185, 129, 0.35)';
      style.boxShadow = `0 8px 32px 0 rgba(0, 0, 0, 0.5), 0 0 15px ${activeConfig.glowColor}20`;
    }

    return style;
  };

  // Layout position classes
  const getPositionClasses = () => {
    if (isInsideCustomBox) {
      return 'relative w-full h-full z-20 flex';
    }
    const pos = isPreview ? 'absolute' : 'fixed';
    switch (activeConfig.layoutPosition) {
      case 'top-ticker':
        return `${pos} top-0 left-0 w-full z-20 px-4 py-2.5 border-b`;
      case 'bottom-ticker':
        return `${pos} bottom-0 left-0 w-full z-20 px-4 py-2.5 border-t`;
      case 'top-left':
        return `${pos} top-6 left-6 z-20 max-w-xl rounded-2xl p-4 border`;
      case 'top-right':
        return `${pos} top-6 right-6 z-20 max-w-xl rounded-2xl p-4 border`;
      case 'bottom-left':
        return `${pos} bottom-6 left-6 z-20 max-w-xl rounded-2xl p-4 border`;
      case 'bottom-right':
        return `${pos} bottom-6 right-6 z-20 max-w-xl rounded-2xl p-4 border`;
      case 'center-lower':
      default:
        return `${pos} bottom-12 left-1/2 -translate-x-1/2 z-20 max-w-3xl w-11/12 rounded-2xl p-4 border`;
    }
  };

  const isTickerLayout = activeConfig.layoutPosition === 'top-ticker' || activeConfig.layoutPosition === 'bottom-ticker';

  // Render Goal Widget
  const renderGoalWidget = (mode: 'compact-pill' | 'docked' | 'stacked') => {
    if (!activeConfig.showGoal || !displayGoal) return null;

    const accent = displayGoal.accentColor || activeConfig.accentColor || '#10B981';

    if (mode === 'compact-pill') {
      return (
        <div
          className="flex items-center gap-3 px-3 py-1.5 rounded-full shrink-0 border transition-all duration-300"
          style={{
            background: 'rgba(15, 23, 42, 0.85)',
            borderColor: `${accent}60`,
            boxShadow: `0 0 12px ${accent}25`
          }}
        >
          <div className="flex items-center gap-1.5">
            <span
              className="w-2 h-2 rounded-full animate-ping shrink-0"
              style={{ backgroundColor: accent }}
            />
            <Target className="w-3.5 h-3.5 shrink-0" style={{ color: accent }} />
            <span className="text-xs font-bold uppercase tracking-wider text-slate-200 truncate max-w-[120px]">
              {displayGoal.title}
            </span>
          </div>

          {/* Mini Progress Bar */}
          <div className="w-24 sm:w-28 h-2 bg-slate-800/90 rounded-full overflow-hidden p-0.5 border border-slate-700/60 shrink-0">
            <div
              className="h-full rounded-full transition-all duration-700 ease-out"
              style={{
                width: `${goalPercentage}%`,
                background: `linear-gradient(90deg, ${accent}, #38BDF8)`,
                boxShadow: `0 0 8px ${accent}`
              }}
            />
          </div>

          {/* Amount Counter */}
          <div className="flex items-baseline gap-1 text-xs font-semibold shrink-0">
            <span style={{ color: accent }}>${Number(displayGoal.currentAmount).toFixed(0)}</span>
            <span className="text-slate-400 text-[10px]">/ ${Number(displayGoal.targetAmount).toFixed(0)}</span>
            <span className="text-[10px] font-bold text-slate-300 ml-0.5">({goalPercentage}%)</span>
          </div>
        </div>
      );
    }

    if (mode === 'docked') {
      return (
        <div
          className="flex flex-col justify-center px-4 py-2 rounded-xl shrink-0 border min-w-[220px]"
          style={{
            background: 'rgba(15, 23, 42, 0.85)',
            borderColor: `${accent}40`,
            boxShadow: `0 0 15px ${accent}15`
          }}
        >
          <div className="flex items-center justify-between gap-2 mb-1">
            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-200 truncate">
              <Trophy className="w-3.5 h-3.5 shrink-0" style={{ color: accent }} />
              <span className="truncate">{displayGoal.title}</span>
            </div>
            <span className="text-xs font-black tracking-wider" style={{ color: accent }}>
              {goalPercentage}%
            </span>
          </div>

          <div className="w-full h-2 bg-slate-900/90 rounded-full overflow-hidden border border-slate-700/60 p-0.5 mb-1">
            <div
              className="h-full rounded-full transition-all duration-700 ease-out"
              style={{
                width: `${goalPercentage}%`,
                background: `linear-gradient(90deg, ${accent}, #06B6D4)`,
                boxShadow: `0 0 10px ${accent}`
              }}
            />
          </div>

          <div className="flex justify-between items-center text-[10px] font-medium text-slate-400">
            <span>Goal Progress</span>
            <span className="font-semibold text-slate-200">
              <strong style={{ color: accent }}>${Number(displayGoal.currentAmount).toFixed(0)}</strong> / ${Number(displayGoal.targetAmount).toFixed(0)}
            </span>
          </div>
        </div>
      );
    }

    // Stacked mode
    return (
      <div className="w-full mt-2.5 pt-2.5 border-t border-slate-700/50 flex flex-col gap-1.5">
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center gap-1.5 font-bold text-slate-200">
            <Target className="w-3.5 h-3.5" style={{ color: accent }} />
            <span className="truncate">{displayGoal.title}</span>
          </div>
          <div className="flex items-center gap-1 font-semibold text-xs shrink-0">
            <span style={{ color: accent }}>${Number(displayGoal.currentAmount).toFixed(0)}</span>
            <span className="text-slate-400">/ ${Number(displayGoal.targetAmount).toFixed(0)}</span>
            <span className="text-emerald-400 font-bold ml-1">({goalPercentage}%)</span>
          </div>
        </div>

        <div className="w-full h-2.5 bg-slate-900/80 rounded-full overflow-hidden border border-slate-700/60 p-0.5">
          <div
            className="h-full rounded-full transition-all duration-700 ease-out"
            style={{
              width: `${goalPercentage}%`,
              background: `linear-gradient(90deg, ${accent}, #38BDF8)`,
              boxShadow: `0 0 10px ${accent}`
            }}
          />
        </div>
      </div>
    );
  };

  // Render animated text based on selected flow
  const renderAnimatedFlow = () => {
    const textStyle: React.CSSProperties = {
      color: activeConfig.textColor || '#FFFFFF',
      fontSize: `${activeConfig.fontSize || 18}px`,
      fontWeight: 600
    };

    // 1. Marquee Ticker
    if (activeConfig.animationFlow === 'marquee') {
      return (
        <div className="relative overflow-hidden w-full flex items-center">
          <div
            className="marquee-track flex items-center gap-12 whitespace-nowrap will-change-transform"
            style={{
              animation: `custom-marquee ${marqueeDuration} linear infinite`
            }}
          >
            {messagesList.map((msg, idx) => (
              <div key={`m1-${idx}`} className="flex items-center gap-4 shrink-0">
                <span style={textStyle}>{msg}</span>
                <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: activeConfig.accentColor }} />
              </div>
            ))}
            {/* Duplicate for seamless continuous loop */}
            {messagesList.map((msg, idx) => (
              <div key={`m2-${idx}`} className="flex items-center gap-4 shrink-0" aria-hidden="true">
                <span style={textStyle}>{msg}</span>
                <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: activeConfig.accentColor }} />
              </div>
            ))}
          </div>
        </div>
      );
    }

    // 2. Typewriter Effect
    if (activeConfig.animationFlow === 'typewriter') {
      return (
        <div className="flex items-center gap-2 overflow-hidden">
          <span style={textStyle} className="tracking-wide">
            {typewriterText}
          </span>
          <span
            className="inline-block w-2.5 h-5 animate-pulse shrink-0 rounded-sm"
            style={{ backgroundColor: activeConfig.accentColor || '#10B981' }}
          />
        </div>
      );
    }

    // 3. Fade & Slide Flow
    if (activeConfig.animationFlow === 'fade-slide') {
      return (
        <div className="relative overflow-hidden py-1 w-full">
          <div
            key={activeMessageIndex}
            className="fade-slide-enter flex items-center gap-2 transition-all duration-500"
          >
            <span style={textStyle} className="leading-snug">
              {messagesList[activeMessageIndex]}
            </span>
          </div>
        </div>
      );
    }

    // 4. Float & Bounce
    if (activeConfig.animationFlow === 'float-bounce') {
      return (
        <div className="float-bounce-anim flex items-center gap-3">
          <span style={textStyle}>
            {activeConfig.headline}
          </span>
          {activeConfig.subtext && (
            <span className="text-xs font-normal opacity-80" style={{ color: activeConfig.textColor }}>
              ({activeConfig.subtext})
            </span>
          )}
        </div>
      );
    }

    // 5. Wave Glow & Shimmer
    if (activeConfig.animationFlow === 'wave-glow') {
      return (
        <div className="flex items-center gap-3">
          <span
            className="wave-glow-text font-black tracking-wide"
            style={{
              fontSize: `${activeConfig.fontSize || 20}px`,
              backgroundImage: `linear-gradient(90deg, ${activeConfig.textColor || '#FFF'} 0%, ${activeConfig.accentColor || '#10B981'} 50%, ${activeConfig.textColor || '#FFF'} 100%)`,
              backgroundSize: '200% auto',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              textShadow: `0 0 20px ${activeConfig.glowColor}40`
            }}
          >
            {activeConfig.headline}
          </span>
          {activeConfig.subtext && (
            <span className="text-xs opacity-75 font-medium" style={{ color: activeConfig.textColor }}>
              {activeConfig.subtext}
            </span>
          )}
        </div>
      );
    }

    // 6. Cyber Glitch & Pulse
    if (activeConfig.animationFlow === 'cyber-glitch') {
      return (
        <div className="cyber-pulse-anim flex items-center gap-3">
          <span
            style={{
              ...textStyle,
              textShadow: `0 0 10px ${activeConfig.glowColor}, 0 0 20px ${activeConfig.glowColor}80`
            }}
            className="font-bold tracking-wider"
          >
            {activeConfig.headline}
          </span>
          {activeConfig.subtext && (
            <span className="text-xs uppercase font-mono tracking-widest opacity-80" style={{ color: activeConfig.accentColor }}>
              // {activeConfig.subtext}
            </span>
          )}
        </div>
      );
    }

    // 7. Flip 3D
    if (activeConfig.animationFlow === 'flip-3d') {
      return (
        <div className="perspective-800 w-full">
          <div key={activeMessageIndex} className="flip-3d-enter">
            <span style={textStyle}>
              {messagesList[activeMessageIndex]}
            </span>
          </div>
        </div>
      );
    }

    return <span style={textStyle}>{activeConfig.headline}</span>;
  };

  // Only suppress rendering if inactive on production OBS screen; preview always renders
  if (!activeConfig.isActive && !isPreview) {
    return null;
  }

  const effectiveGoalLayout = activeConfig.goalLayout || (isTickerLayout ? 'compact-pill' : 'stacked');

  return (
    <>
      <style>{`
        @keyframes custom-marquee {
          0% {
            transform: translate3d(0, 0, 0);
          }
          100% {
            transform: translate3d(-50%, 0, 0);
          }
        }

        .fade-slide-enter {
          animation: fadeSlideAnim 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }

        @keyframes fadeSlideAnim {
          0% {
            opacity: 0;
            transform: translateY(14px) scale(0.98);
          }
          100% {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }

        .float-bounce-anim {
          animation: floatBounceAnim 3.5s ease-in-out infinite;
        }

        @keyframes floatBounceAnim {
          0%, 100% {
            transform: translateY(0px);
          }
          50% {
            transform: translateY(-5px);
          }
        }

        .wave-glow-text {
          animation: waveGlowAnim 3s linear infinite;
        }

        @keyframes waveGlowAnim {
          0% {
            background-position: 0% center;
          }
          100% {
            background-position: 200% center;
          }
        }

        .cyber-pulse-anim {
          animation: cyberPulseAnim 2.5s ease-in-out infinite;
        }

        @keyframes cyberPulseAnim {
          0%, 100% {
            filter: drop-shadow(0 0 2px rgba(16, 185, 129, 0.4));
          }
          50% {
            filter: drop-shadow(0 0 10px rgba(16, 185, 129, 0.9));
          }
        }

        .flip-3d-enter {
          animation: flip3DAnim 0.7s cubic-bezier(0.23, 1, 0.32, 1) forwards;
          transform-origin: center top;
        }

        @keyframes flip3DAnim {
          0% {
            opacity: 0;
            transform: perspective(600px) rotateX(-90deg);
          }
          100% {
            opacity: 1;
            transform: perspective(600px) rotateX(0deg);
          }
        }
      `}</style>

      <div
        className={`${getPositionClasses()} transition-all duration-300 ease-out`}
        style={getContainerStyle()}
      >
        {isTickerLayout ? (
          /* ================= TICKER FULL-WIDTH LAYOUT ================= */
          <div className="flex items-center justify-between gap-4 w-full h-full">
            {/* Left Badge */}
            {activeConfig.badgeText && (
              <div
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full shrink-0 font-bold text-xs tracking-wider uppercase border shadow-sm"
                style={{
                  background: `${activeConfig.accentColor}20`,
                  borderColor: `${activeConfig.accentColor}60`,
                  color: activeConfig.accentColor
                }}
              >
                {renderBadgeIcon()}
                <span>{activeConfig.badgeText}</span>
              </div>
            )}

            {/* Middle Animated Text Flow */}
            <div className="flex-1 min-w-0 overflow-hidden">
              {renderAnimatedFlow()}
            </div>

            {/* Right: Live Stream Goal (If toggled) */}
            {activeConfig.showGoal && renderGoalWidget(effectiveGoalLayout === 'docked' ? 'docked' : 'compact-pill')}
          </div>
        ) : (
          /* ================= FLOATING CARD / LOWER-THIRD LAYOUT ================= */
          <div className="flex flex-col justify-center gap-2 w-full h-full">
            {/* Top Row: Badge & Header Icon */}
            <div className="flex items-center justify-between gap-3">
              {activeConfig.badgeText && (
                <div
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg shrink-0 font-bold text-[11px] tracking-wider uppercase border"
                  style={{
                    background: `${activeConfig.accentColor}20`,
                    borderColor: `${activeConfig.accentColor}50`,
                    color: activeConfig.accentColor
                  }}
                >
                  {renderBadgeIcon()}
                  <span>{activeConfig.badgeText}</span>
                </div>
              )}

              {/* Goal compact pill on top row if selected */}
              {activeConfig.showGoal && effectiveGoalLayout === 'compact-pill' && renderGoalWidget('compact-pill')}
            </div>

            {/* Animated Flow Text */}
            <div className="py-1">
              {renderAnimatedFlow()}
            </div>

            {/* Stacked or Docked Goal underneath */}
            {activeConfig.showGoal && effectiveGoalLayout !== 'compact-pill' && renderGoalWidget(effectiveGoalLayout)}
          </div>
        )}
      </div>
    </>
  );
};
