'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  Sparkles,
  Zap,
  MessageSquare,
  Crown,
  Target,
  Play,
  Volume2,
  CheckCircle2,
  Flame,
  Star,
  ShieldCheck,
  Video,
  Trophy,
  Medal,
  Award,
  Tv
} from 'lucide-react';
import { NeonAlertCard } from '../overlay/NeonAlertCard';
import { GoalTemplateRenderer } from '../overlay/goalTemplates';

interface ShowcaseAlertCombo {
  id: string;
  donorName: string;
  donorMessage: string;
  amount: number;
  currency: 'USD' | 'KHR';
  layoutMode: 'top' | 'left' | 'right' | 'bottom';
  animationStyle: 'zoom' | 'bounce' | 'glitch' | 'shake' | 'flip' | 'slide' | 'pulse';
  donorColor: string;
  amountColor: string;
  glowColor: string;
  fontFamily: string;
  mediaUrl: string;
}

const DONATION_SHOWCASE_COMBOS: ShowcaseAlertCombo[] = [
  // 1. TOP LAYOUT (Mascot Top, Pikachu, Zoom)
  {
    id: 'combo-1',
    donorName: 'Sophea Gaming',
    donorMessage: 'GG bro! Best carry in Mobile Legends tournament! Keep the stream hype! 🔥🔥🔥',
    amount: 10,
    currency: 'USD',
    layoutMode: 'top',
    animationStyle: 'zoom',
    donorColor: 'linear-gradient(135deg, #FFE600 0%, #FF8C00 100%)',
    amountColor: 'linear-gradient(135deg, #00F0FF 0%, #38BDF8 100%)',
    glowColor: '#00F0FF',
    fontFamily: 'Chakra Petch',
    mediaUrl: '/assets/pokemon/25.gif'
  },
  // 2. LEFT LAYOUT (Mascot Left Side, Lucario, Glitch Split)
  {
    id: 'combo-2',
    donorName: 'Dara_Esports',
    donorMessage: 'That AWM 400m sniper shot was illegal! Chicken dinner tonight squad 🍗⚡',
    amount: 50,
    currency: 'USD',
    layoutMode: 'left',
    animationStyle: 'glitch',
    donorColor: 'linear-gradient(135deg, #EC4899 0%, #F43F5E 100%)',
    amountColor: 'linear-gradient(135deg, #A855F7 0%, #C084FC 100%)',
    glowColor: '#EC4899',
    fontFamily: 'Orbitron',
    mediaUrl: '/assets/pokemon/448.gif'
  },
  // 3. RIGHT LAYOUT (Mascot Right Side, Charmander, Wobble Bounce)
  {
    id: 'combo-3',
    donorName: 'Vannak Pro',
    donorMessage: 'Coffee on me bro! Road to Mythical Glory let’s gooo ☕💖',
    amount: 40000,
    currency: 'KHR',
    layoutMode: 'right',
    animationStyle: 'bounce',
    donorColor: 'linear-gradient(135deg, #10B981 0%, #34D399 100%)',
    amountColor: 'linear-gradient(135deg, #F59E0B 0%, #FBBF24 100%)',
    glowColor: '#10B981',
    fontFamily: 'Kanit',
    mediaUrl: '/assets/pokemon/4.gif'
  },
  // 4. BOTTOM LAYOUT (Mascot at Bottom, Gengar, 3D Flip)
  {
    id: 'combo-4',
    donorName: 'Bopha_Cute',
    donorMessage: 'Insane reaction time right there! Keep grinding the late night stream 🎮🔥',
    amount: 25,
    currency: 'USD',
    layoutMode: 'bottom',
    animationStyle: 'flip',
    donorColor: 'linear-gradient(135deg, #8B5CF6 0%, #D946EF 100%)',
    amountColor: 'linear-gradient(135deg, #00F0FF 0%, #10B981 100%)',
    glowColor: '#8B5CF6',
    fontFamily: 'Chakra Petch',
    mediaUrl: '/assets/pokemon/94.gif'
  },
  // 5. TOP LAYOUT (Mew, Slide Up Bounce)
  {
    id: 'combo-5',
    donorName: 'Meng MLBB',
    donorMessage: 'That 1v5 clutch had the whole chat screaming! Unstoppable carry 👑⚡',
    amount: 100000,
    currency: 'KHR',
    layoutMode: 'top',
    animationStyle: 'slide',
    donorColor: 'linear-gradient(135deg, #00F0FF 0%, #06B6D4 100%)',
    amountColor: 'linear-gradient(135deg, #22C55E 0%, #4ADE80 100%)',
    glowColor: '#00F0FF',
    fontFamily: 'Bebas Neue',
    mediaUrl: '/assets/pokemon/151.gif'
  },
  // 6. LEFT LAYOUT (Dragonite, Camera Shake)
  {
    id: 'combo-6',
    donorName: 'Chhay_FPS',
    donorMessage: 'Savage kill right there! MVP of the tournament! 🔥🔥🔥',
    amount: 100,
    currency: 'USD',
    layoutMode: 'left',
    animationStyle: 'shake',
    donorColor: 'linear-gradient(135deg, #EF4444 0%, #F97316 100%)',
    amountColor: 'linear-gradient(135deg, #FACC15 0%, #F59E0B 100%)',
    glowColor: '#EF4444',
    fontFamily: 'Orbitron',
    mediaUrl: '/assets/pokemon/149.gif'
  },
  // 7. RIGHT LAYOUT (Eevee, Heartbeat Pulse)
  {
    id: 'combo-7',
    donorName: 'Ah_Lin_Live',
    donorMessage: 'Thank you for the pro gameplay tips, learned so much today! 🌟🎮',
    amount: 5,
    currency: 'USD',
    layoutMode: 'right',
    animationStyle: 'pulse',
    donorColor: 'linear-gradient(135deg, #F43F5E 0%, #FB7185 100%)',
    amountColor: 'linear-gradient(135deg, #38BDF8 0%, #818CF8 100%)',
    glowColor: '#F43F5E',
    fontFamily: 'Kanit',
    mediaUrl: '/assets/pokemon/133.gif'
  },
  // 8. BOTTOM LAYOUT (Snorlax, CapCut Zoom-In)
  {
    id: 'combo-8',
    donorName: 'Socheat Carry',
    donorMessage: 'Good luck in the MPL tournament! Cambodia esports to the top 🏆✨',
    amount: 20000,
    currency: 'KHR',
    layoutMode: 'bottom',
    animationStyle: 'zoom',
    donorColor: 'linear-gradient(135deg, #F59E0B 0%, #D97706 100%)',
    amountColor: 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
    glowColor: '#F59E0B',
    fontFamily: 'Chakra Petch',
    mediaUrl: '/assets/pokemon/143.gif'
  }
];

const getGradientOrColorStyle = (colorStr?: string): React.CSSProperties => {
  if (!colorStr) return {};
  if (colorStr.includes('gradient')) {
    return {
      backgroundImage: colorStr,
      WebkitBackgroundClip: 'text',
      WebkitTextFillColor: 'transparent',
      backgroundClip: 'text',
      color: 'transparent',
      display: 'inline-block'
    };
  }
  return { color: colorStr };
};

interface MediaShareClip {
  id: string;
  title: string;
  gameTag: string;
  donorName: string;
  donorMessage: string;
  amount: number;
  currency: 'USD' | 'KHR';
  donorColor: string;
  amountColor: string;
  glowColor: string;
  animationStyle: string;
  themeGradient: string;
}

const MEDIA_SHARE_SHOWCASE_CLIPS: MediaShareClip[] = [
  {
    id: 'media-1',
    title: 'Chou Godly Flick Kick & 1v5 Wipeout',
    gameTag: 'MOBILE LEGENDS 4K',
    donorName: 'Socheat ML',
    donorMessage: 'Legendary Chou freestyle kick! Best carry in Cambodia 🏆',
    amount: 5,
    currency: 'USD',
    donorColor: 'linear-gradient(135deg, #00F0FF 0%, #38BDF8 100%)',
    amountColor: 'linear-gradient(135deg, #F59E0B 0%, #FBBF24 100%)',
    glowColor: '#00F0FF',
    animationStyle: 'animate-showcase-flip-media',
    themeGradient: 'from-blue-950/40 via-slate-950 to-black'
  },
  {
    id: 'media-2',
    title: 'AWM 450m Sniper Headshot in Pochinki',
    gameTag: 'PUBG MOBILE ESPORTS',
    donorName: 'Dara_Sniper',
    donorMessage: 'Insane bullet lead calculation! Winner Winner Chicken Dinner 🍗🔥',
    amount: 10,
    currency: 'USD',
    donorColor: 'linear-gradient(135deg, #10B981 0%, #34D399 100%)',
    amountColor: 'linear-gradient(135deg, #00F0FF 0%, #06B6D4 100%)',
    glowColor: '#10B981',
    animationStyle: 'animate-capcut-zoom-in',
    themeGradient: 'from-emerald-950/40 via-slate-950 to-black'
  },
  {
    id: 'media-3',
    title: 'Night City Ultra Drift & 5-Star Police Escape',
    gameTag: 'CYBERPUNK 2077 4K',
    donorName: 'SpeedDemon_KH',
    donorMessage: 'Clean drift through Vinewood hills while 5 stars chase! Keep the stream hype 🚗💨',
    amount: 40000,
    currency: 'KHR',
    donorColor: 'linear-gradient(135deg, #EC4899 0%, #F43F5E 100%)',
    amountColor: 'linear-gradient(135deg, #A855F7 0%, #C084FC 100%)',
    glowColor: '#EC4899',
    animationStyle: 'animate-capcut-glitch-split',
    themeGradient: 'from-pink-950/40 via-slate-950 to-black'
  },
  {
    id: 'media-4',
    title: 'Fanny Superhuman Cable Through Entire Jungle',
    gameTag: 'MLBB PRO LEAGUE',
    donorName: 'Meng MLBB',
    donorMessage: 'That cable speed is superhuman! Unstoppable assassin play ⚡👑',
    amount: 15,
    currency: 'USD',
    donorColor: 'linear-gradient(135deg, #8B5CF6 0%, #D946EF 100%)',
    amountColor: 'linear-gradient(135deg, #FACC15 0%, #F59E0B 100%)',
    glowColor: '#8B5CF6',
    animationStyle: 'animate-capcut-3d-flip-x',
    themeGradient: 'from-purple-950/40 via-slate-950 to-black'
  },
  {
    id: 'media-5',
    title: 'Valorant Ace Clutch 1v5 on A-Site Haven',
    gameTag: 'VALORANT RADIANT',
    donorName: 'Bopha_Cute',
    donorMessage: 'Whole chat was screaming! Best clutch of the night bro 🔥🔥🔥',
    amount: 100000,
    currency: 'KHR',
    donorColor: 'linear-gradient(135deg, #EF4444 0%, #F97316 100%)',
    amountColor: 'linear-gradient(135deg, #10B981 0%, #34D399 100%)',
    glowColor: '#EF4444',
    animationStyle: 'animate-capcut-slide-up-bounce',
    themeGradient: 'from-rose-950/40 via-slate-950 to-black'
  },
  {
    id: 'media-6',
    title: 'បទនគររាជ Nokoraja (Live Orchestral Anthem)',
    gameTag: 'KHMER MEDIA SHARE',
    donorName: 'Vannak Pro',
    donorMessage: 'National pride right here! Blast this anthem for the squad 🇰🇭🎵',
    amount: 25,
    currency: 'USD',
    donorColor: 'linear-gradient(135deg, #06B6D4 0%, #3B82F6 100%)',
    amountColor: 'linear-gradient(135deg, #EC4899 0%, #F43F5E 100%)',
    glowColor: '#06B6D4',
    animationStyle: 'animate-capcut-origami-fold',
    themeGradient: 'from-cyan-950/40 via-slate-950 to-black'
  }
];

interface ShowcaseGoalPreset {
  id: string;
  title: string;
  targetAmount: number;
  accentColor: string;
  templateStyle: string;
}

const SHOWCASE_GOAL_PRESETS: ShowcaseGoalPreset[] = [
  {
    id: 'goal-1',
    title: '🚀 4K Streaming Rig & 240Hz Esports Monitor',
    targetAmount: 500,
    accentColor: '#10B981',
    templateStyle: 'cyber-neon'
  },
  {
    id: 'goal-2',
    title: '👑 Cambodia MLBB Bootcamp Tournament Fund',
    targetAmount: 1200,
    accentColor: '#F59E0B',
    templateStyle: 'golden-luxury'
  },
  {
    id: 'goal-3',
    title: '🎧 Shure SM7B Studio Mic & GoXLR Mixer',
    targetAmount: 350,
    accentColor: '#00F0FF',
    templateStyle: 'glass-frost'
  },
  {
    id: 'goal-4',
    title: '⚡ 24-Hour Non-Stop Subathon Stream Marathon',
    targetAmount: 800,
    accentColor: '#D946EF',
    templateStyle: 'synthwave-midnight'
  },
  {
    id: 'goal-5',
    title: '🏆 Pro Gaming RTX 4090 GPU Live Upgrade',
    targetAmount: 1500,
    accentColor: '#10B981',
    templateStyle: 'chroma-rgb'
  },
  {
    id: 'goal-6',
    title: '🎮 Retro Arcade Cabinet & Fighting Stick',
    targetAmount: 400,
    accentColor: '#EF4444',
    templateStyle: 'retro-arcade'
  },
  {
    id: 'goal-7',
    title: '🔥 Full RGB Studio Lighting & Soundproofing',
    targetAmount: 600,
    accentColor: '#F97316',
    templateStyle: 'mecha-hud'
  }
];

/**
 * Scroll Swipe-Up Reveal Wrapper:
 * Observes when the element scrolls into view and triggers a smooth GPU-accelerated swipe-up animation.
 */
const ScrollSwipeSection: React.FC<{
  children: React.ReactNode;
  className?: string;
}> = ({ children, className = '' }) => {
  const [isVisible, setIsVisible] = useState(false);
  const sectionRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
        }
      },
      {
        threshold: 0.15,
        rootMargin: '0px 0px -50px 0px'
      }
    );

    const el = sectionRef.current;
    if (el) observer.observe(el);

    return () => {
      if (el) observer.unobserve(el);
    };
  }, []);

  return (
    <div
      ref={sectionRef}
      className={`transition-all duration-1000 ease-out transform ${
        isVisible
          ? 'opacity-100 translate-y-0 filter-none'
          : 'opacity-0 translate-y-20 blur-[2px]'
      } ${className}`}
    >
      {children}
    </div>
  );
};

export const HomeFeatureShowcase: React.FC = () => {
  // Mobile Screen Detector (window width < 1024px)
  const [isMobile, setIsMobile] = useState<boolean>(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(typeof window !== 'undefined' && window.innerWidth < 1024);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // 1. Dynamic Donation Alert Cycling Simulation
  const [alertIndex, setAlertIndex] = useState<number>(0);
  const [alertCycleKey, setAlertCycleKey] = useState<number>(0);

  useEffect(() => {
    const cycleTimer = setInterval(() => {
      setAlertIndex((prev) => (prev + 1) % DONATION_SHOWCASE_COMBOS.length);
      setAlertCycleKey((prev) => prev + 1);
    }, 3200);

    return () => clearInterval(cycleTimer);
  }, []);

  const currentAlert = DONATION_SHOWCASE_COMBOS[alertIndex];

  // 2. Video Alert (Media Share) 5-Second Real-Time Countdown & Cycle
  const [videoClipIndex, setVideoClipIndex] = useState<number>(0);
  const [videoClipCycleKey, setVideoClipCycleKey] = useState<number>(0);
  const [videoRemainingPct, setVideoRemainingPct] = useState<number>(100);

  useEffect(() => {
    let animId: number;
    const durationMs = 5000; // Exact 5 seconds per clip
    let startTime = performance.now();

    const loop = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(1, elapsed / durationMs);
      const remaining = Math.max(0, (1 - progress) * 100);
      setVideoRemainingPct(remaining);

      if (progress >= 1) {
        setVideoClipIndex((prev) => (prev + 1) % MEDIA_SHARE_SHOWCASE_CLIPS.length);
        setVideoClipCycleKey((k) => k + 1);
        startTime = performance.now();
      }

      animId = requestAnimationFrame(loop);
    };

    animId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animId);
  }, []);

  const currentMediaClip = MEDIA_SHARE_SHOWCASE_CLIPS[videoClipIndex];

  // 3. Leaderboard Cycle Toggle
  const [leaderboardCycleKey, setLeaderboardCycleKey] = useState<number>(0);
  useEffect(() => {
    const lbTimer = setInterval(() => {
      setLeaderboardCycleKey((k) => k + 1);
    }, 4000);
    return () => clearInterval(lbTimer);
  }, []);

  // 4. Goal Progress Continuous Loop (0% -> 100%) - Resets seamlessly with no complete label
  const [goalIndex, setGoalIndex] = useState<number>(0);
  const [goalProgress, setGoalProgress] = useState<number>(0);
  const [goalCycleKey, setGoalCycleKey] = useState<number>(0);

  useEffect(() => {
    let animId: number;
    let holdTimeout: NodeJS.Timeout;
    const durationMs = 4500; // 4.5 seconds to progress from 0% to 100%
    let startTime = performance.now();
    let isHolding = false;

    const loop = (now: number) => {
      if (isHolding) {
        animId = requestAnimationFrame(loop);
        return;
      }

      const elapsed = now - startTime;
      const progress = Math.min(100, (elapsed / durationMs) * 100);
      setGoalProgress(progress);

      if (progress >= 100) {
        isHolding = true;
        // When it hits 100, hold for brief 300ms then reset to another goal randomly name and amount
        holdTimeout = setTimeout(() => {
          setGoalIndex((prev) => (prev + 1) % SHOWCASE_GOAL_PRESETS.length);
          setGoalCycleKey((k) => k + 1);
          setGoalProgress(0);
          startTime = performance.now();
          isHolding = false;
        }, 300);
      }

      animId = requestAnimationFrame(loop);
    };

    animId = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(animId);
      clearTimeout(holdTimeout);
    };
  }, []);

  const currentGoal = SHOWCASE_GOAL_PRESETS[goalIndex];
  const currentGoalAmount = Number(((goalProgress / 100) * currentGoal.targetAmount).toFixed(2));

  // 5. Chat Cycle Toggle
  const [chatCycleKey, setChatCycleKey] = useState<number>(0);
  useEffect(() => {
    const chatTimer = setInterval(() => {
      setChatCycleKey((k) => k + 1);
    }, 3800);
    return () => clearInterval(chatTimer);
  }, []);

  /**
   * Helper to compute dynamic 3D rotation:
   * - On mobile: smoothly changes between -15deg and +15deg on each update with CSS transition
   * - On desktop: sits inward at -15deg or +15deg facing the paired text description
   */
  const getCardTransform = (isRightColumnOnDesktop: boolean, cycleKey: number) => {
    if (isMobile) {
      const angle = cycleKey % 2 === 0 ? -15 : 15;
      return `perspective(900px) rotateY(${angle}deg) rotateX(2deg)`;
    }
    const desktopAngle = isRightColumnOnDesktop ? -15 : 15;
    return `perspective(1400px) rotateY(${desktopAngle}deg) rotateX(2deg)`;
  };

  return (
    <section className="max-w-6xl mx-auto px-4 space-y-28 sm:space-y-36 relative">
      {/* Background Ambient Glows */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-cyan-500/5 blur-[160px] pointer-events-none rounded-full" />
      <div className="absolute top-2/3 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-purple-500/5 blur-[160px] pointer-events-none rounded-full" />

      {/* ========================================================================= */}
      {/* FEATURE 1: ALERTS DONATION (DETAILED OVERVIEW & DYNAMIC ROTATING ALERTS)  */}
      {/* 100% Transparent, No Background & No Border: Exact img, title, message    */}
      {/* Positions: Top, Left, Right, Bottom with dynamic names, amounts & colors  */}
      {/* ========================================================================= */}
      <ScrollSwipeSection className="flex flex-col lg:flex-row items-center gap-10 lg:gap-14 relative z-10">
        {/* Left Side: Rich Detailed Donation Alert Overview */}
        <div className="w-full lg:w-1/2 space-y-4">
          <h3 className="text-3xl sm:text-4xl font-extrabold text-white font-['Chakra_Petch'] leading-tight">
            Fully Customizable 60 FPS Live Donation Alerts
          </h3>

          <p className="text-slate-300 text-sm sm:text-base leading-relaxed">
            When a viewer scans your Bakong KHQR code with ABA Mobile, ACLEDA, or Wing, alerts flash instantaneously onto your stream screen in full 60 FPS without dropping a single frame. Money deposits straight into your personal bank account with 0% platform cuts and zero waiting period.
          </p>

          <p className="text-slate-400 text-xs sm:text-sm leading-relaxed">
            Personalize your broadcast with customizable entrance animations, dynamic mascot positions (Top, Left, Right, Bottom), dual USD &amp; Cambodian Riel currency formatting, and neural KiriTTS voice cheers with automatic stream audio ducking.
          </p>
        </div>

        {/* Right Side: 3D Preview (Smoothly rotates 15° left / 15° right when it changes on mobile) */}
        <div className="perspective-container w-full lg:w-1/2 flex justify-center">
          <div
            className="w-full max-w-lg bg-transparent border-0 shadow-none p-0 relative flex flex-col items-center justify-center min-h-[360px]"
            style={{
              transform: getCardTransform(true, alertCycleKey),
              transition: 'transform 0.8s cubic-bezier(0.16, 1, 0.3, 1)',
              transformStyle: 'preserve-3d',
              willChange: 'transform'
            }}
          >
            {/* Exact Dashboard Alert Component: Image, Title, and Messages (Remounts on key change for fresh animations) */}
            <div className="w-full relative z-10 py-2">
              <NeonAlertCard
                key={`alert-preview-${alertCycleKey}-${currentAlert.id}`}
                alert={{
                  donationId: `preview-${alertCycleKey}`,
                  donorName: currentAlert.donorName,
                  donorMessage: currentAlert.donorMessage,
                  amount: currentAlert.amount,
                  currency: currentAlert.currency,
                  textTemplate: '{donator} donated {amount} through superchat!',
                  textColor: '#FFFFFF',
                  donorColor: currentAlert.donorColor,
                  amountColor: currentAlert.amountColor,
                  mediaUrl: currentAlert.mediaUrl,
                  customGifUrl: currentAlert.mediaUrl,
                  showImage: true,
                  fontFamily: currentAlert.fontFamily,
                  fontSize: 28,
                  layoutMode: currentAlert.layoutMode,
                  animationStyle: currentAlert.animationStyle,
                  glowColor: currentAlert.glowColor
                }}
              />
            </div>
          </div>
        </div>
      </ScrollSwipeSection>

      {/* ========================================================================= */}
      {/* FEATURE 2: VIDEO ALERTS (LEFT: 3D CARD, RIGHT: TEXT)                      */}
      {/* Smoothly rotates 15° when video clip changes                              */}
      {/* ========================================================================= */}
      <ScrollSwipeSection className="flex flex-col lg:flex-row-reverse items-center gap-10 lg:gap-14 relative z-10">
        {/* Right Side: Title & Description */}
        <div className="w-full lg:w-1/2 space-y-4">
          <h3 className="text-3xl sm:text-4xl font-extrabold text-white font-['Chakra_Petch'] leading-tight">
            Media Share &amp; Video Alerts with Live Scrubber
          </h3>

          <p className="text-slate-300 text-sm sm:text-base leading-relaxed">
            Allow your viewers to share hype gameplay moments, music tracks, or funny clips on stream. Our video alert engine synchronizes YouTube playback with live progress scrubbers, volume leveling, and automatic game audio ducking.
          </p>
        </div>

        {/* Left Side: 3D Preview (Smoothly rotates 15° left / 15° right when clip updates on mobile) */}
        <div className="perspective-container w-full lg:w-1/2 flex justify-center">
          <div
            className="w-full max-w-lg bg-transparent border-0 shadow-none p-0 relative flex flex-col items-center justify-center min-h-[360px]"
            style={{
              transform: getCardTransform(false, videoClipCycleKey),
              transition: 'transform 0.8s cubic-bezier(0.16, 1, 0.3, 1)',
              transformStyle: 'preserve-3d',
              willChange: 'transform'
            }}
          >
            {/* Animated Wrapper remounting on each 5s cycle key for change animation */}
            <div
              key={`media-share-${videoClipCycleKey}-${currentMediaClip.id}`}
              className={`w-full relative flex flex-col ${currentMediaClip.animationStyle} select-none`}
              style={{
                filter: `drop-shadow(0 0 25px ${currentMediaClip.glowColor}25)`
              }}
            >
              {/* ============================================================== */}
              {/* 1. TOP SECTION: THE DONOR (NAME & AMOUNT)                     */}
              {/* Exact format: donor name & amount, styled like overlay assets  */}
              {/* ============================================================== */}
              <div className="w-full px-4 py-2.5 flex items-center justify-between text-xs font-mono bg-slate-950/95 rounded-t-2xl border border-b-0 border-slate-800/90 backdrop-blur-md">
                <div className="flex items-center gap-2 min-w-0">
                  <span
                    className="text-sm sm:text-base font-bold font-['Chakra_Petch'] tracking-wide truncate"
                    style={{
                      ...getGradientOrColorStyle(currentMediaClip.donorColor),
                      textShadow: `0 0 12px ${currentMediaClip.glowColor}99, 0 2px 4px rgba(0,0,0,0.95)`
                    }}
                  >
                    {currentMediaClip.donorName}
                  </span>
                  <span className="text-[10px] px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-300 font-mono font-bold border border-cyan-500/30 flex-shrink-0">
                    MEDIA SHARE
                  </span>
                </div>
                <div className="text-right flex-shrink-0 pl-2">
                  <span
                    className="text-xs sm:text-sm font-black font-mono"
                    style={getGradientOrColorStyle(currentMediaClip.amountColor)}
                  >
                    {currentMediaClip.currency === 'KHR'
                      ? `${currentMediaClip.amount.toLocaleString()} ៛`
                      : `$${currentMediaClip.amount.toFixed(2)} Superchat`}
                  </span>
                </div>
              </div>

              {/* ============================================================== */}
              {/* 2. THE VIDEO SCREEN (16:9 Aspect Ratio)                        */}
              {/* Clean authentic video display matching OBS overlay             */}
              {/* ============================================================== */}
              <div className="relative w-full aspect-video overflow-hidden bg-black border-x border-slate-800/90 flex flex-col justify-between p-3.5 sm:p-4">
                {/* Background Gameplay & Ambient Scene */}
                <div className={`absolute inset-0 bg-gradient-to-br ${currentMediaClip.themeGradient} opacity-90`} />

                {/* Cyber Grid Subtle Pattern */}
                <div className="absolute inset-0 cyber-grid opacity-20 pointer-events-none" />

                {/* Center Dynamic Glow Pulse */}
                <div
                  className="absolute inset-0 opacity-25 pointer-events-none animate-pulse"
                  style={{
                    background: `radial-gradient(circle at 50% 50%, ${currentMediaClip.glowColor} 0%, transparent 70%)`
                  }}
                />

                {/* Top Video HUD: Game tag & 60 FPS Badge */}
                <div className="relative z-10 flex items-center justify-between">
                  <span className="px-2.5 py-1 rounded bg-black/75 backdrop-blur-md text-[10px] sm:text-[11px] font-mono font-bold text-white border border-white/10 shadow-sm">
                    {currentMediaClip.gameTag}
                  </span>
                  <div className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-black/75 backdrop-blur-md text-[10px] font-mono text-cyan-300 border border-cyan-500/30">
                    <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-ping" />
                    <span>60 FPS</span>
                  </div>
                </div>

                {/* Center Video Playing Indicator & Title */}
                <div className="relative z-10 my-auto text-center space-y-1.5">
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-black/85 backdrop-blur-md border border-red-500/50 text-red-400 text-xs font-mono shadow-lg">
                    <Play size={12} className="fill-red-500 text-red-500 animate-pulse" />
                    <span className="font-bold tracking-wide">Playing Live Media Share</span>
                  </div>
                  <h4 className="text-base sm:text-lg font-black text-white font-['Chakra_Petch'] drop-shadow-[0_2px_12px_rgba(0,0,0,0.95)] tracking-wide">
                    {currentMediaClip.title}
                  </h4>
                </div>

                {/* Bottom HUD: Live Time Remaining in 5s clip & Auto-Ducking Status */}
                <div className="relative z-10 flex items-center justify-between text-[10px] sm:text-[11px] font-mono text-slate-300">
                  <div className="flex items-center gap-1.5">
                    <Tv size={12} className="text-red-400" />
                    <span>0:0{Math.min(5, Math.max(0, Math.ceil((videoRemainingPct / 100) * 5)))} / 0:05</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-slate-400">
                    <Volume2 size={12} className="text-cyan-400" />
                    <span>Auto-Ducking 85%</span>
                  </div>
                </div>
              </div>

              {/* ============================================================== */}
              {/* 3. THE DURATION BAR (THE RED COLOR ONE)                         */}
              {/* Smooth real-time countdown progress bar                        */}
              {/* ============================================================== */}
              <div className="w-full h-1.5 sm:h-2 relative overflow-hidden bg-slate-950 border-x border-slate-800/90">
                <div
                  className="h-full rounded-r-sm will-change-[width]"
                  style={{
                    width: `${videoRemainingPct}%`,
                    backgroundColor: '#DC2626',
                    boxShadow: '0 0 10px rgba(220, 38, 38, 0.85)'
                  }}
                />
              </div>

              {/* ============================================================== */}
              {/* 4. THE MESSAGES SECTION (WHAT THE DONOR SAY AT BOTTOM)         */}
              {/* ============================================================== */}
              <div className="w-full p-3 sm:p-3.5 rounded-b-2xl bg-slate-950/95 border border-t-0 border-slate-800/90 backdrop-blur-md flex items-center justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <p className="text-xs sm:text-sm text-slate-200 leading-snug font-sans italic truncate">
                    {currentMediaClip.donorMessage}
                  </p>
                </div>
                <div className="text-[10px] font-mono text-slate-500 flex items-center gap-1 flex-shrink-0">
                  <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-ping" />
                  <span>5s CLIP</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </ScrollSwipeSection>

      {/* ========================================================================= */}
      {/* FEATURE 3: LEADERBOARD (LEFT: TEXT, RIGHT: 3D CARD)                       */}
      {/* Smoothly rotates 15° when leaderboard cycles                              */}
      {/* ========================================================================= */}
      <ScrollSwipeSection className="flex flex-col lg:flex-row items-center gap-10 lg:gap-14 relative z-10">
        {/* Left Side: Title & Description */}
        <div className="w-full lg:w-1/2 space-y-4">
          <h3 className="text-3xl sm:text-4xl font-extrabold text-white font-['Chakra_Petch'] leading-tight">
            Real-Time Stream Leaderboard &amp; Top Supporters
          </h3>

          <p className="text-slate-300 text-sm sm:text-base leading-relaxed">
            Recognize your top supporters and high rollers with high-contrast Hall of Fame leaderboards. Features real-time ranking updates, gold crown podium highlights, and automatic multi-currency conversion between USD and KHR.
          </p>
        </div>

        {/* Right Side: 3D Preview (Smoothly rotates 15° left / 15° right when it changes on mobile) */}
        <div className="perspective-container w-full lg:w-1/2 flex justify-center">
          <div
            className="w-full max-w-lg bg-transparent border-0 shadow-none p-0 relative"
            style={{
              transform: getCardTransform(true, leaderboardCycleKey),
              transition: 'transform 0.8s cubic-bezier(0.16, 1, 0.3, 1)',
              transformStyle: 'preserve-3d',
              willChange: 'transform'
            }}
          >
            {/* Header */}
            <div className="flex items-center justify-between pb-2 mb-3">
              <div className="flex items-center gap-2">
                <Trophy size={16} className="text-yellow-400 animate-pulse" />
                <span className="text-sm font-bold text-white font-['Chakra_Petch']">
                  STREAM LEADERBOARD
                </span>
                <span className="px-2 py-0.5 rounded-full bg-yellow-500/20 text-yellow-300 text-[10px] font-mono font-bold">
                  {leaderboardCycleKey % 2 === 0 ? 'ALL-TIME' : 'MONTHLY'}
                </span>
              </div>
              <div className="text-[11px] font-mono text-slate-400 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                <span>Real-Time Sync</span>
              </div>
            </div>

            {/* Podium Donor Rows */}
            <div className="space-y-2.5">
              {/* Rank 1: Gold */}
              <div className="p-3 rounded-xl bg-gradient-to-r from-yellow-500/15 via-amber-500/10 to-slate-950 border border-yellow-400/50 flex items-center justify-between shadow-lg">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-yellow-500 to-amber-300 p-0.5 flex items-center justify-center shadow-md">
                    <div className="w-full h-full rounded-[10px] bg-slate-950 flex items-center justify-center text-yellow-400">
                      <Crown size={18} className="fill-yellow-400/20" />
                    </div>
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-white font-['Chakra_Petch']">
                        Vannak_Pro
                      </span>
                      <span className="px-1.5 py-0.2 rounded bg-yellow-400/20 text-yellow-300 font-mono text-[9px] font-bold">
                        RANK #1
                      </span>
                    </div>
                    <span className="text-[11px] text-slate-400 font-mono">18 Superchats • MLBB Team</span>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-base font-black text-yellow-400 font-mono drop-shadow-[0_0_10px_rgba(234,179,8,0.5)]">
                    $150.00
                  </div>
                  <div className="text-[10px] text-slate-400 font-mono">(600,000 ៛)</div>
                </div>
              </div>

              {/* Rank 2: Silver */}
              <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 flex items-center justify-between hover:border-slate-700 transition-all">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-slate-800 border border-slate-600 flex items-center justify-center text-slate-300">
                    <Medal size={16} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-white font-['Chakra_Petch']">
                        DaraEsports
                      </span>
                      <span className="px-1.5 py-0.2 rounded bg-slate-800 text-slate-300 font-mono text-[9px]">
                        RANK #2
                      </span>
                    </div>
                    <span className="text-[11px] text-slate-400 font-mono">11 Superchats</span>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-bold text-slate-200 font-mono">
                    $85.00
                  </div>
                  <div className="text-[10px] text-slate-400 font-mono">(340,000 ៛)</div>
                </div>
              </div>

              {/* Rank 3: Bronze */}
              <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 flex items-center justify-between hover:border-slate-700 transition-all">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-amber-950/40 border border-amber-700/50 flex items-center justify-center text-amber-500">
                    <Award size={16} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-white font-['Chakra_Petch']">
                        Sreypov_Live
                      </span>
                      <span className="px-1.5 py-0.2 rounded bg-amber-950 text-amber-400 font-mono text-[9px]">
                        RANK #3
                      </span>
                    </div>
                    <span className="text-[11px] text-slate-400 font-mono">7 Superchats</span>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-bold text-amber-300 font-mono">
                    $50.00
                  </div>
                  <div className="text-[10px] text-slate-400 font-mono">(200,000 ៛)</div>
                </div>
              </div>
            </div>

            {/* Total Volume Footer */}
            <div className="mt-3 pt-2.5 flex items-center justify-between text-xs font-mono text-slate-400">
              <span className="text-slate-300">Total Stream Season:</span>
              <span className="text-yellow-400 font-bold">$2,850.00 (11,400,000 ៛)</span>
            </div>
          </div>
        </div>
      </ScrollSwipeSection>

      {/* ========================================================================= */}
      {/* FEATURE 4: STREAM GOAL (LEFT: 3D CARD, RIGHT: TEXT)                       */}
      {/* Smoothly rotates 15° when goal milestone / celebration cycles             */}
      {/* ========================================================================= */}
      <ScrollSwipeSection className="flex flex-col lg:flex-row-reverse items-center gap-10 lg:gap-14 relative z-10">
        {/* Right Side: Title & Description */}
        <div className="w-full lg:w-1/2 space-y-4">
          <h3 className="text-3xl sm:text-4xl font-extrabold text-white font-['Chakra_Petch'] leading-tight">
            Dynamic Stream Goals with 0% to 100% Progress
          </h3>

          <p className="text-slate-300 text-sm sm:text-base leading-relaxed">
            Rally your community toward hardware upgrades, gaming tournaments, or charity milestones. Watch the glowing neon progress bar run smoothly in real time with dynamic numeric counters and automatic celebration particle bursts.
          </p>
        </div>

        {/* Left Side: 3D Preview (Smoothly rotates 15° left / 15° right when goal updates on mobile) */}
        <div className="perspective-container w-full lg:w-1/2 flex justify-center">
          <div
            className="w-full max-w-lg bg-transparent border-0 shadow-none p-0 relative"
            style={{
              transform: getCardTransform(false, goalCycleKey),
              transition: 'transform 0.8s cubic-bezier(0.16, 1, 0.3, 1)',
              transformStyle: 'preserve-3d',
              willChange: 'transform'
            }}
          >
            {/* Real Dashboard & Overlay Goal Asset (Template Renderer) */}
            <div
              key={`goal-preview-${goalCycleKey}-${currentGoal.id}`}
              className="w-full relative z-10 animate-fade-in flex justify-center select-none"
            >
              <GoalTemplateRenderer
                title={currentGoal.title}
                targetAmount={currentGoal.targetAmount}
                currentAmount={currentGoalAmount}
                accentColor={currentGoal.accentColor}
                templateStyle={currentGoal.templateStyle}
                showBalance={true}
                showBackground={true}
                showAnimation={true}
                endDate={null}
              />
            </div>
          </div>
        </div>
      </ScrollSwipeSection>

      {/* ========================================================================= */}
      {/* FEATURE 5: LIVE CHAT (LEFT: TEXT, RIGHT: 3D CARD)                         */}
      {/* Smoothly rotates 15° when chat cycles                                     */}
      {/* ========================================================================= */}
      <ScrollSwipeSection className="flex flex-col lg:flex-row items-center gap-10 lg:gap-14 relative z-10">
        {/* Left Side: Title & Description */}
        <div className="w-full lg:w-1/2 space-y-4">
          <h3 className="text-3xl sm:text-4xl font-extrabold text-white font-['Chakra_Petch'] leading-tight">
            Live Stream Chat with Swipe Animations
          </h3>

          <p className="text-slate-300 text-sm sm:text-base leading-relaxed">
            Keep your viewers engaged with customizable, high-contrast chat bubbles. Incoming messages slide in smoothly with our dynamic swipe animation, while superchats stay pinned for maximum visibility.
          </p>
        </div>

        {/* Right Side: 3D Preview (Smoothly rotates 15° left / 15° right when it changes on mobile) */}
        <div className="perspective-container w-full lg:w-1/2 flex justify-center">
          <div
            className="w-full max-w-lg bg-transparent border-0 shadow-none p-0 relative"
            style={{
              transform: getCardTransform(true, chatCycleKey),
              transition: 'transform 0.8s cubic-bezier(0.16, 1, 0.3, 1)',
              transformStyle: 'preserve-3d',
              willChange: 'transform'
            }}
          >
            {/* Chat Header */}
            <div className="flex items-center justify-between pb-2 mb-3 relative z-10">
              <div className="flex items-center gap-2">
                <MessageSquare size={16} className="text-pink-400 animate-pulse" />
                <span className="text-sm font-bold text-white font-['Chakra_Petch']">
                  LIVE STREAM CHAT OVERLAY
                </span>
                <span className="px-2 py-0.5 rounded-full bg-pink-500/20 text-pink-300 text-[10px] font-mono font-bold">
                  1,420 VIEWERS
                </span>
              </div>
              <div className="text-[11px] font-mono text-slate-400 flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-emerald-400" />
                <span>Real-Time Sync</span>
              </div>
            </div>

            {/* Pinned Superchat Banner */}
            <div className="mb-3.5 p-3 rounded-xl bg-gradient-to-r from-pink-500/20 via-purple-500/20 to-cyan-500/20 border border-pink-500/40 flex items-center justify-between shadow-lg relative z-10">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-pink-500 flex items-center justify-center text-white font-black text-xs font-mono">
                  $25
                </div>
                <div>
                  <div className="text-xs font-bold text-white font-['Chakra_Petch'] flex items-center gap-1.5">
                    <span>Piseth_Pro</span>
                    <span className="text-[10px] px-1.5 py-0.2 rounded bg-pink-400/20 text-pink-300 font-mono">
                      SUPERCHAT
                    </span>
                  </div>
                  <div className="text-[11px] text-pink-200">
                    &ldquo;Coffee on me bro! Best streamer in town ☕🔥&rdquo;
                  </div>
                </div>
              </div>
              <div className="text-xs font-black text-pink-300 font-mono">$25.00</div>
            </div>

            {/* Chat Message Rows */}
            <div className="space-y-2.5 font-sans relative z-10">
              {[
                {
                  author: 'Chhay_99',
                  badge: 'VIP',
                  badgeBg: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
                  icon: Flame,
                  text: 'Savage kill right there! Insane reaction time ⚡⚡',
                  color: 'text-amber-400'
                },
                {
                  author: 'Bopha_Gamer',
                  badge: 'SUB 6MO',
                  badgeBg: 'bg-pink-500/20 text-pink-300 border-pink-500/40',
                  icon: Star,
                  text: 'Let\'s hit 1,000 stars tonight squad! 💖💖',
                  color: 'text-pink-400'
                },
                {
                  author: 'Socheat_Mod',
                  badge: 'MOD',
                  badgeBg: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
                  icon: ShieldCheck,
                  text: 'Rules: Be respectful in chat & enjoy the live gameplay! 🎮',
                  color: 'text-emerald-400'
                },
                {
                  author: 'Meng_MLBB',
                  badge: 'SUB 2MO',
                  badgeBg: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40',
                  icon: Zap,
                  text: 'That ultimate combo was legendary 🔥🔥🔥',
                  color: 'text-cyan-400'
                }
              ].map((msg, i) => {
                const Icon = msg.icon;
                return (
                  <div
                    key={i}
                    className="p-2.5 rounded-xl bg-slate-950/70 border border-slate-800/80 flex items-start gap-2.5 hover:border-pink-500/40 transition-all text-xs"
                  >
                    <span className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-bold border flex items-center gap-1 ${msg.badgeBg}`}>
                      <Icon size={10} />
                      <span>{msg.badge}</span>
                    </span>
                    <div className="flex-1">
                      <span className={`font-bold font-['Chakra_Petch'] mr-2 ${msg.color}`}>
                        {msg.author}:
                      </span>
                      <span className="text-slate-300 leading-relaxed">{msg.text}</span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Floating Emojis */}
            <div className="absolute bottom-4 right-4 flex items-center gap-1.5 pointer-events-none z-10">
              {['🔥', '⚡', '💖', '🎉'].map((emoji, i) => (
                <span key={i} className="text-lg animate-bounce" style={{ animationDelay: `${i * 150}ms` }}>
                  {emoji}
                </span>
              ))}
            </div>
          </div>
        </div>
      </ScrollSwipeSection>
    </section>
  );
};
