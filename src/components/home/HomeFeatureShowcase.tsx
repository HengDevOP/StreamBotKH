'use client';

import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
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
  Tv,
  VolumeX,
  Bell,
  RotateCw,
  Clock,
  Timer,
  Disc,
  Gift
} from 'lucide-react';
import { NeonAlertCard } from '../overlay/NeonAlertCard';
import { GoalTemplateRenderer } from '../overlay/goalTemplates';
import { TimerTemplateRenderer } from '../overlay/timerTemplates';

interface ShowcaseAlertCombo {
  id: string;
  donorName: string;
  donorMessage: string;
  amount: number;
  currency: 'USD' | 'KHR';
  layoutMode: 'top' | 'left' | 'right' | 'bottom';
  animationStyle: 'zoom' | 'bounce' | 'glitch' | 'shake' | 'flip' | 'slide' | 'pulse' | 'pop';
  donorColor: string;
  amountColor: string;
  glowColor: string;
  fontFamily: string;
  mediaUrl: string;
  textTemplate: string;
  badgeText?: string;
  badgeColor?: string;
  badgeBg?: string;
  badgeBorder?: string;
}

const DONATION_SHOWCASE_COMBOS: ShowcaseAlertCombo[] = [
  // 1. Superchat Alert (Solid White & Gold, SBKH Celebrate Sticker, Zoom)
  {
    id: 'combo-1',
    donorName: 'Sophea Gaming',
    donorMessage: 'GG bro! Best carry in Mobile Legends tournament! Keep the stream hype! 🔥🔥🔥',
    amount: 10,
    currency: 'USD',
    layoutMode: 'top',
    animationStyle: 'zoom',
    donorColor: '#FFFFFF',
    amountColor: '#FACC15',
    glowColor: '#00F0FF',
    fontFamily: 'Chakra Petch',
    mediaUrl: '/sbkh/sbkh_party_celebrate.gif',
    textTemplate: '{donor} donated {amount} through superchat!'
  },
  // 2. Just Subscribed Alert (SBKH Subscribe Button Sticker, Slide Up)
  {
    id: 'combo-2',
    donorName: 'Dara_Esports',
    donorMessage: 'Just hit that follow & sub button! Best esports live caster in town 🎮✨',
    amount: 0,
    currency: 'USD',
    layoutMode: 'top',
    animationStyle: 'slide',
    donorColor: '#FFFFFF',
    amountColor: '#38BDF8',
    glowColor: '#38BDF8',
    fontFamily: 'Chakra Petch',
    mediaUrl: '/sbkh/sbkh_subscribe_button.gif',
    textTemplate: '{donor} just subscribed!',
    badgeText: 'NEW SUB',
    badgeColor: '#38BDF8',
    badgeBg: 'rgba(56, 189, 248, 0.15)',
    badgeBorder: 'rgba(56, 189, 248, 0.35)'
  },
  // 3. Participation Club Alert (SBKH King Crown Sticker, Wobble Bounce)
  {
    id: 'combo-3',
    donorName: 'Vannak Pro',
    donorMessage: 'Proud to be a member of the squad! Let’s crush the seasonal tournament 👑⚡',
    amount: 0,
    currency: 'KHR',
    layoutMode: 'top',
    animationStyle: 'bounce',
    donorColor: '#FFFFFF',
    amountColor: '#F59E0B',
    glowColor: '#F59E0B',
    fontFamily: 'Kanit',
    mediaUrl: '/sbkh/sbkh_king_crown.gif',
    textTemplate: '{donor} has joined the participation club!',
    badgeText: 'VIP CLUB',
    badgeColor: '#FBBF24',
    badgeBg: 'rgba(245, 158, 11, 0.15)',
    badgeBorder: 'rgba(245, 158, 11, 0.35)'
  },
  // 4. Tip Alert (Solid White & Cyan, SBKH Thumbs Up Sticker, Pop Spring)
  {
    id: 'combo-4',
    donorName: 'Bopha_Cute',
    donorMessage: 'Coffee on me bro! Road to Mythical Glory let’s gooo and keep it hype ☕💖',
    amount: 40000,
    currency: 'KHR',
    layoutMode: 'top',
    animationStyle: 'pop',
    donorColor: '#FFFFFF',
    amountColor: '#38BDF8',
    glowColor: '#38BDF8',
    fontFamily: 'Chakra Petch',
    mediaUrl: '/sbkh/sbkh_thumbs_up.gif',
    textTemplate: '{donor} sent {amount} tip alert!'
  },
  // 5. Resubscription Alert (SBKH Star Eyes Sticker, Heartbeat Pulse)
  {
    id: 'combo-5',
    donorName: 'Meng MLBB',
    donorMessage: 'Tier 1 sub for 3 months! That 1v5 clutch had the whole chat screaming 👑⚡',
    amount: 0,
    currency: 'USD',
    layoutMode: 'top',
    animationStyle: 'pulse',
    donorColor: '#FFFFFF',
    amountColor: '#A855F7',
    glowColor: '#A855F7',
    fontFamily: 'Bebas Neue',
    mediaUrl: '/sbkh/sbkh_star_eyes.gif',
    textTemplate: '{donor} just subscribed!',
    badgeText: '3 MO RESUB',
    badgeColor: '#C084FC',
    badgeBg: 'rgba(168, 85, 247, 0.15)',
    badgeBorder: 'rgba(168, 85, 247, 0.35)'
  },
  // 6. Participation Club Alert (SBKH Gamer Fire Sticker, Glitch Split)
  {
    id: 'combo-6',
    donorName: 'Chhay_FPS',
    donorMessage: 'Club pass unlocked! Cambodia esports to the absolute top 🔥🔥🔥',
    amount: 0,
    currency: 'USD',
    layoutMode: 'top',
    animationStyle: 'glitch',
    donorColor: '#FFFFFF',
    amountColor: '#EC4899',
    glowColor: '#EC4899',
    fontFamily: 'Orbitron',
    mediaUrl: '/sbkh/sbkh_gamer_fire.gif',
    textTemplate: '{donor} has joined the participation club!',
    badgeText: 'CHAMPION',
    badgeColor: '#F472B6',
    badgeBg: 'rgba(236, 72, 153, 0.15)',
    badgeBorder: 'rgba(236, 72, 153, 0.35)'
  },
  // 7. High Roller Superchat (Solid White & Emerald, SBKH Trophy Sticker, 3D Flip)
  {
    id: 'combo-7',
    donorName: 'Ah_Lin_Live',
    donorMessage: 'Savage kill right there! MVP of the match, keep shredding bro! 🏆✨',
    amount: 50,
    currency: 'USD',
    layoutMode: 'top',
    animationStyle: 'flip',
    donorColor: '#FFFFFF',
    amountColor: '#4ADE80',
    glowColor: '#10B981',
    fontFamily: 'Kanit',
    mediaUrl: '/sbkh/sbkh_champion_trophy.gif',
    textTemplate: '{donor} donated {amount} through superchat!'
  },
  // 8. Cheers Tip Alert (Solid White & Amber, SBKH Rich Coins Sticker, Camera Shake)
  {
    id: 'combo-8',
    donorName: 'Socheat Carry',
    donorMessage: 'High roller donation incoming! Good luck in the MPL tournament 🚀💰',
    amount: 100000,
    currency: 'KHR',
    layoutMode: 'top',
    animationStyle: 'shake',
    donorColor: '#FFFFFF',
    amountColor: '#FACC15',
    glowColor: '#F59E0B',
    fontFamily: 'Chakra Petch',
    mediaUrl: '/sbkh/sbkh_rich_coins.gif',
    textTemplate: '{donor} cheered with {amount}!'
  },
  // 9. Just Subscribed Alert (SBKH Love Heart Sticker, CapCut Zoom)
  {
    id: 'combo-9',
    donorName: 'Rithy_Pro',
    donorMessage: 'Love the stream vibes & positive energy every single night! 💖💖',
    amount: 0,
    currency: 'USD',
    layoutMode: 'top',
    animationStyle: 'zoom',
    donorColor: '#FFFFFF',
    amountColor: '#F43F5E',
    glowColor: '#F43F5E',
    fontFamily: 'Chakra Petch',
    mediaUrl: '/sbkh/sbkh_love_heart.gif',
    textTemplate: '{donor} just subscribed!',
    badgeText: 'SUBSCRIBER',
    badgeColor: '#FB7185',
    badgeBg: 'rgba(244, 63, 94, 0.15)',
    badgeBorder: 'rgba(244, 63, 94, 0.35)'
  },
  // 10. Participation Club Alert (SBKH Let\'s Go Sticker, Wobble Bounce)
  {
    id: 'combo-10',
    donorName: 'Piseth_KH',
    donorMessage: 'Joined the elite streamers circle! Let’s reach the next milestone! 🌟🎯',
    amount: 0,
    currency: 'KHR',
    layoutMode: 'top',
    animationStyle: 'bounce',
    donorColor: '#FFFFFF',
    amountColor: '#00F0FF',
    glowColor: '#00F0FF',
    fontFamily: 'Orbitron',
    mediaUrl: '/sbkh/sbkh_lets_go.gif',
    textTemplate: '{donor} has joined the participation club!',
    badgeText: 'ELITE CLUB',
    badgeColor: '#38BDF8',
    badgeBg: 'rgba(0, 240, 255, 0.15)',
    badgeBorder: 'rgba(0, 240, 255, 0.35)'
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
    donorColor: '#FFFFFF',
    amountColor: '#FACC15',
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
    donorColor: '#FFFFFF',
    amountColor: '#38BDF8',
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
    donorColor: '#FFFFFF',
    amountColor: '#F472B6',
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
    donorColor: '#FFFFFF',
    amountColor: '#FACC15',
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
    donorColor: '#FFFFFF',
    amountColor: '#4ADE80',
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
    donorColor: '#FFFFFF',
    amountColor: '#38BDF8',
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
    title: '🌊 Liquid Water Cooling Loop & Custom Rig',
    targetAmount: 750,
    accentColor: '#00F0FF',
    templateStyle: 'liquid-gradient-shader'
  },
  {
    id: 'goal-3',
    title: '👑 Cambodia MLBB Bootcamp Tournament Fund',
    targetAmount: 1200,
    accentColor: '#F59E0B',
    templateStyle: 'golden-luxury'
  },
  {
    id: 'goal-4',
    title: '🎮 Retro Arcade Cabinet & Fighting Stick',
    targetAmount: 400,
    accentColor: '#EF4444',
    templateStyle: 'retro-arcade'
  },
  {
    id: 'goal-5',
    title: '🎧 Shure SM7B Studio Mic & GoXLR Mixer',
    targetAmount: 350,
    accentColor: '#38BDF8',
    templateStyle: 'glass-frost'
  },
  {
    id: 'goal-6',
    title: '⚡ 24-Hour Non-Stop Subathon Stream Marathon',
    targetAmount: 800,
    accentColor: '#D946EF',
    templateStyle: 'synthwave-midnight'
  },
  {
    id: 'goal-7',
    title: '🌋 Hardcore 24-Hour PUBG Rank Push Challenge',
    targetAmount: 600,
    accentColor: '#FF4500',
    templateStyle: 'lava-core'
  },
  {
    id: 'goal-8',
    title: '🏆 Pro Gaming RTX 4090 GPU Live Upgrade',
    targetAmount: 1500,
    accentColor: '#10B981',
    templateStyle: 'chroma-rgb'
  },
  {
    id: 'goal-9',
    title: '🔥 Full RGB Studio Lighting & Soundproofing',
    targetAmount: 600,
    accentColor: '#F97316',
    templateStyle: 'mecha-hud'
  },
  {
    id: 'goal-10',
    title: '💻 Matrix Terminal Soundboard & OBS Setup',
    targetAmount: 450,
    accentColor: '#00FF66',
    templateStyle: 'matrix-terminal'
  },
  {
    id: 'goal-11',
    title: '🌌 Deep Space Galaxy Broadcast Overlay',
    targetAmount: 900,
    accentColor: '#8B5CF6',
    templateStyle: 'cosmic-galaxy'
  },
  {
    id: 'goal-12',
    title: '💖 Streamer Setup Cat-Ear Headset & Aesthetic Cam',
    targetAmount: 300,
    accentColor: '#F472B6',
    templateStyle: 'kawaii-pastel'
  }
];

export interface ShowcaseWheelSlice {
  id: string;
  label: string;
  color: string;
  icon: string;
}

const SHOWCASE_WHEEL_SLICES: ShowcaseWheelSlice[] = [
  { id: '1', label: '1v1 MLBB Match', color: '#00F0FF', icon: '🎮' },
  { id: '2', label: 'Custom Song', color: '#A855F7', icon: '🎵' },
  { id: '3', label: 'Voice Shoutout', color: '#10B981', icon: '📢' },
  { id: '4', label: 'VIP Discord', color: '#F59E0B', icon: '👑' },
  { id: '5', label: 'Wheel Reroll', color: '#EC4899', icon: '🎲' },
  { id: '6', label: '10,000 ៛ Bonus', color: '#3B82F6', icon: '💵' },
  { id: '7', label: '50 Pushups', color: '#F97316', icon: '💪' },
  { id: '8', label: 'Jackpot 🏆', color: '#EF4444', icon: '✨' }
];

export interface ShowcaseTimerPreset {
  id: string;
  name: string;
  title: string;
  glowColor: string;
  style: string;
  description: string;
}

const SHOWCASE_TIMER_PRESETS: ShowcaseTimerPreset[] = [
  {
    id: 'cyber-neon',
    name: 'Cyber Neon',
    title: 'SUBATHON COUNTDOWN 🔥',
    glowColor: '#00F0FF',
    style: 'cyber-neon',
    description: '$1 = +10m • 4,000៛ = +10m • KHQR Instant Sync'
  },
  {
    id: 'chroma-rgb',
    name: 'Chroma RGB',
    title: '24-HOUR CHARITY CHALLENGE ⚡',
    glowColor: '#10B981',
    style: 'chroma-rgb',
    description: '$1 = +15m • 4,000៛ = +15m • Goal: $2,500'
  },
  {
    id: 'matrix-terminal',
    name: 'Matrix CRT',
    title: 'SPEEDRUN CLOCK // ANY% 🎮',
    glowColor: '#10B981',
    style: 'matrix-terminal',
    description: 'SYS_TICK: 60Hz • LIVE TELEMETRY OVERLAY'
  },
  {
    id: 'blood-moon',
    name: 'Blood Moon',
    title: 'ELITE BOSS MARATHON 💀',
    glowColor: '#DC2626',
    style: 'blood-moon',
    description: 'DEATH = +30m • TIP = EXTEND TIME'
  },
  {
    id: 'quantum-core',
    name: 'Quantum Core',
    title: 'COMMUNITY STREAM GOAL 🚀',
    glowColor: '#2563EB',
    style: 'quantum-core',
    description: 'HARD CAP: 48:00:00 • 1,280 BACKERS'
  },
  {
    id: 'synthwave-1984',
    name: 'Synthwave',
    title: 'MIDNIGHT RETRO VIBES 🌆',
    glowColor: '#EC4899',
    style: 'synthwave-1984',
    description: 'SUB = +10m • SUPERCHAT = +25m'
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
        threshold: 0.08,
        rootMargin: '0px 0px -40px 0px'
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
      className={`w-full max-w-full min-w-0 transition-[opacity,transform] duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] transform-gpu ${
        isVisible
          ? 'opacity-100 translate-y-0 scale-100'
          : 'opacity-0 translate-y-8 scale-[0.985] pointer-events-none'
      } ${className}`}
      style={{ willChange: isVisible ? 'auto' : 'transform, opacity' }}
    >
      {children}
    </div>
  );
};

export const HomeFeatureShowcase: React.FC = () => {
  // Section visibility observer: pauses heavy requestAnimationFrame loops when scrolled out of view (saves mobile CPU)
  const showcaseSectionRef = useRef<HTMLElement | null>(null);
  const [isSectionVisible, setIsSectionVisible] = useState<boolean>(true);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsSectionVisible(entry.isIntersecting);
      },
      { threshold: 0.05 }
    );
    const el = showcaseSectionRef.current;
    if (el) observer.observe(el);
    return () => {
      if (el) observer.unobserve(el);
    };
  }, []);

  // 1. Dynamic Donation Alert Cycling Simulation
  const [alertIndex, setAlertIndex] = useState<number>(0);
  const [alertCycleKey, setAlertCycleKey] = useState<number>(0);

  useEffect(() => {
    const cycleTimer = setInterval(() => {
      if (!isSectionVisible) return;
      setAlertIndex((prev) => (prev + 1) % DONATION_SHOWCASE_COMBOS.length);
      setAlertCycleKey((prev) => prev + 1);
    }, 3200);

    return () => clearInterval(cycleTimer);
  }, [isSectionVisible]);

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
      if (!isSectionVisible) {
        animId = requestAnimationFrame(loop);
        return;
      }

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
  }, [isSectionVisible]);

  const currentMediaClip = MEDIA_SHARE_SHOWCASE_CLIPS[videoClipIndex];

  // 3. Leaderboard Cycle Toggle
  const [leaderboardCycleKey, setLeaderboardCycleKey] = useState<number>(0);
  useEffect(() => {
    const lbTimer = setInterval(() => {
      if (!isSectionVisible) return;
      setLeaderboardCycleKey((k) => k + 1);
    }, 4000);
    return () => clearInterval(lbTimer);
  }, [isSectionVisible]);

  // 4. Goal Progress Continuous Loop (0% -> 100%) - Resets seamlessly with celebration hold
  const [goalIndex, setGoalIndex] = useState<number>(0);
  const [goalProgress, setGoalProgress] = useState<number>(0);
  const [goalCycleKey, setGoalCycleKey] = useState<number>(0);

  useEffect(() => {
    let animId: number;
    let holdTimeout: NodeJS.Timeout;
    const durationMs = 4200; // 4.2 seconds to smoothly progress from 0% to 100%
    let startTime = performance.now();
    let isHolding = false;

    const loop = (now: number) => {
      if (!isSectionVisible || isHolding) {
        animId = requestAnimationFrame(loop);
        return;
      }

      const elapsed = now - startTime;
      const progress = Math.min(100, (elapsed / durationMs) * 100);
      setGoalProgress(progress);

      if (progress >= 100) {
        isHolding = true;
        // Hold for 750ms so viewers see the celebration glow and completed 100% bar before rotating style
        holdTimeout = setTimeout(() => {
          setGoalIndex((prev) => (prev + 1) % SHOWCASE_GOAL_PRESETS.length);
          setGoalCycleKey((k) => k + 1);
          setGoalProgress(0);
          startTime = performance.now();
          isHolding = false;
        }, 750);
      }

      animId = requestAnimationFrame(loop);
    };

    animId = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(animId);
      clearTimeout(holdTimeout);
    };
  }, [isSectionVisible]);

  const currentGoal = SHOWCASE_GOAL_PRESETS[goalIndex];
  const currentGoalAmount = Number(((goalProgress / 100) * currentGoal.targetAmount).toFixed(2));

  // 5. Chat Cycle Toggle
  const [chatCycleKey, setChatCycleKey] = useState<number>(0);
  useEffect(() => {
    const chatTimer = setInterval(() => {
      if (!isSectionVisible) return;
      setChatCycleKey((k) => k + 1);
    }, 3800);
    return () => clearInterval(chatTimer);
  }, [isSectionVisible]);

  // 6. Wheel Spin Engine (Random spins + User click triggers)
  const [wheelRotation, setWheelRotation] = useState<number>(0);
  const [isWheelSpinning, setIsWheelSpinning] = useState<boolean>(false);
  const [wheelWinner, setWheelWinner] = useState<string | null>(null);

  const svgWheelSlices = useMemo(() => {
    const count = SHOWCASE_WHEEL_SLICES.length;
    const anglePerSlice = 360 / count;
    const r = 160;
    const cx = 175;
    const cy = 175;

    return SHOWCASE_WHEEL_SLICES.map((slice, i) => {
      const startAngle = i * anglePerSlice;
      const endAngle = (i + 1) * anglePerSlice;

      const rad1 = ((startAngle - 90) * Math.PI) / 180;
      const rad2 = ((endAngle - 90) * Math.PI) / 180;

      const x1 = cx + r * Math.cos(rad1);
      const y1 = cy + r * Math.sin(rad1);
      const x2 = cx + r * Math.cos(rad2);
      const y2 = cy + r * Math.sin(rad2);

      const pathData = `M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 0 1 ${x2} ${y2} Z`;

      const midAngle = (startAngle + endAngle) / 2;
      const midRad = ((midAngle - 90) * Math.PI) / 180;
      const textR = 108;
      const tx = cx + textR * Math.cos(midRad);
      const ty = cy + textR * Math.sin(midRad);

      return {
        ...slice,
        pathData,
        tx,
        ty,
        midAngle
      };
    });
  }, []);

  const triggerWheelSpin = useCallback(() => {
    if (isWheelSpinning) return;
    setIsWheelSpinning(true);
    setWheelWinner(null);

    // 4 to 6 full rotations (1440 - 2160 deg) + random angle offset
    const randomExtra = 1440 + Math.floor(Math.random() * 720);
    const nextRotation = wheelRotation + randomExtra;
    setWheelRotation(nextRotation);

    // Accurate winning slice calculation based on top arrow pointer
    const sliceAngle = 360 / SHOWCASE_WHEEL_SLICES.length;
    const normalized = (360 - (nextRotation % 360)) % 360;
    const winningIndex = Math.floor(normalized / sliceAngle) % SHOWCASE_WHEEL_SLICES.length;
    const winningSlice = SHOWCASE_WHEEL_SLICES[winningIndex];

    setTimeout(() => {
      setIsWheelSpinning(false);
      setWheelWinner(`${winningSlice.icon} ${winningSlice.label}`);

      // Celebration outcome popup display for 2.6 seconds
      setTimeout(() => {
        setWheelWinner(null);
      }, 2600);
    }, 3600);
  }, [isWheelSpinning, wheelRotation]);

  useEffect(() => {
    if (!isSectionVisible) return;
    const autoSpinInterval = setInterval(() => {
      triggerWheelSpin();
    }, 8500);
    return () => clearInterval(autoSpinInterval);
  }, [isSectionVisible, triggerWheelSpin]);

  // 7. Subathon & Event Countdown Timer (Ticking second-by-second + Style rotation + Simulated donor additions)
  const [timerSeconds, setTimerSeconds] = useState<number>(9932); // 02h 45m 32s
  const [timerPresetIndex, setTimerPresetIndex] = useState<number>(0);
  const [recentTimeBonus, setRecentTimeBonus] = useState<{ donor: string; minutes: number } | null>(null);

  // 1s countdown tick
  useEffect(() => {
    const tickInterval = setInterval(() => {
      setTimerSeconds((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(tickInterval);
  }, []);

  // Theme style rotation every 8.5 seconds
  useEffect(() => {
    if (!isSectionVisible) return;
    const styleInterval = setInterval(() => {
      setTimerPresetIndex((prev) => (prev + 1) % SHOWCASE_TIMER_PRESETS.length);
    }, 8500);
    return () => clearInterval(styleInterval);
  }, [isSectionVisible]);

  // Simulated live donor time extension every 6 seconds
  useEffect(() => {
    if (!isSectionVisible) return;
    const donorSimulations = [
      { donor: 'Piseth_Pro', minutes: 15 },
      { donor: 'Sophea_MLBB', minutes: 10 },
      { donor: 'Bopha_Gamer', minutes: 25 },
      { donor: 'DaraEsports', minutes: 20 },
      { donor: 'Vannak_99', minutes: 30 }
    ];
    let simIdx = 0;

    const bonusInterval = setInterval(() => {
      const sim = donorSimulations[simIdx % donorSimulations.length];
      simIdx++;

      setTimerSeconds((prev) => prev + sim.minutes * 60);
      setRecentTimeBonus({ donor: sim.donor, minutes: sim.minutes });

      setTimeout(() => {
        setRecentTimeBonus(null);
      }, 3000);
    }, 6000);

    return () => clearInterval(bonusInterval);
  }, [isSectionVisible]);

  const currentTimerPreset = SHOWCASE_TIMER_PRESETS[timerPresetIndex];

  return (
    <section ref={showcaseSectionRef} className="w-full max-w-[1720px] 2xl:max-w-[1840px] mx-auto px-4 xs:px-5 sm:px-10 lg:px-12 xl:px-16 2xl:px-20 space-y-20 sm:space-y-36 relative overflow-hidden min-w-0">
      {/* Background Ambient Glows */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-cyan-500/5 blur-[160px] pointer-events-none rounded-full" />
      <div className="absolute top-2/3 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-purple-500/5 blur-[160px] pointer-events-none rounded-full" />

      {/* ========================================================================= */}
      {/* FEATURE 1: ALERTS DONATION (DETAILED OVERVIEW & DYNAMIC ROTATING ALERTS)  */}
      {/* 100% Transparent, No Background & No Border: Exact img, title, message    */}
      {/* Positions: Top, Left, Right, Bottom with dynamic names, amounts & colors  */}
      {/* ========================================================================= */}
      <ScrollSwipeSection className="w-full max-w-full min-w-0 flex flex-col lg:flex-row items-center gap-8 sm:gap-10 lg:gap-14 relative z-10">
        {/* Left Side: Rich Detailed Alert Widgets Overview */}
        <div className="w-full lg:w-1/2 space-y-4 min-w-0">
          <h3 className="text-2xl xs:text-3xl sm:text-4xl font-extrabold text-white font-['Chakra_Petch'] leading-tight">
            ALERT WIDGETS
          </h3>

          <p className="text-slate-300 text-xs sm:text-sm md:text-base leading-relaxed text-justify [text-align-last:left]">
            Bring your livestream to life with stunning Alert Widgets designed to make every interaction unforgettable. Customize eye-catching entrance animations, dynamic mascot positions, expressive visual effects, and personalized KiriTTS voice cheers with intelligent audio ducking. Make every viewer interaction feel unique with beautifully animated alerts that add personality, excitement, and engagement to your broadcast.
          </p>

          {/* Feature Highlights Grid - Clean Default Icons */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-3 pt-2 w-full min-w-0">
            <div className="p-3 rounded-xl bg-white/[0.04] flex items-start gap-2.5 min-w-0">
              <div className="w-7 h-7 rounded-lg bg-white/[0.08] flex items-center justify-center shrink-0 text-slate-300 mt-0.5">
                <Zap size={14} />
              </div>
              <div className="min-w-0">
                <span className="text-xs font-bold text-white block truncate">&lt; 150ms Instant</span>
                <span className="text-[11px] text-slate-400 truncate block">Zero latency popups</span>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-white/[0.04] flex items-start gap-2.5 min-w-0">
              <div className="w-7 h-7 rounded-lg bg-white/[0.08] flex items-center justify-center shrink-0 text-slate-300 mt-0.5">
                <Sparkles size={14} />
              </div>
              <div className="min-w-0">
                <span className="text-xs font-bold text-white block truncate">Fully Customization</span>
                <span className="text-[11px] text-slate-400 truncate block">Animations & layout</span>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-white/[0.04] flex items-start gap-2.5 min-w-0">
              <div className="w-7 h-7 rounded-lg bg-white/[0.08] flex items-center justify-center shrink-0 text-slate-300 mt-0.5">
                <Volume2 size={14} />
              </div>
              <div className="min-w-0">
                <span className="text-xs font-bold text-white block truncate">Khmer AI Voice TTS</span>
                <span className="text-[11px] text-slate-400 truncate block">Automated cheers</span>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-white/[0.04] flex items-start gap-2.5 min-w-0">
              <div className="w-7 h-7 rounded-lg bg-white/[0.08] flex items-center justify-center shrink-0 text-slate-300 mt-0.5">
                <Star size={14} />
              </div>
              <div className="min-w-0">
                <span className="text-xs font-bold text-white block truncate">USD &amp; KHR Dual</span>
                <span className="text-[11px] text-slate-400 truncate block">Bakong KHQR sync</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Side: Clean Default Flat Preview (Responsive width & height, no overflow clip) */}
        <div className="w-full lg:w-1/2 flex justify-center min-w-0">
          <div className="w-full max-w-[460px] min-h-[290px] sm:min-h-[340px] bg-transparent border-0 shadow-none p-0 relative flex flex-col items-center justify-center min-w-0">
            {/* Exact Dashboard Alert Component: Image, Title, and Messages */}
            <div className="w-full h-full relative z-10 flex items-center justify-center p-1 sm:p-2 min-w-0">
              <div className="w-full max-w-[440px] flex items-center justify-center min-w-0">
                <NeonAlertCard
                  key={`alert-preview-${alertCycleKey}-${currentAlert.id}`}
                  className="w-full max-w-full flex flex-col items-center justify-center"
                  alert={{
                    donationId: `preview-${alertCycleKey}`,
                    donorName: currentAlert.donorName,
                    donorMessage: currentAlert.donorMessage,
                    amount: currentAlert.amount,
                    currency: currentAlert.currency,
                    textTemplate: currentAlert.textTemplate || '{donor} donated {amount} through superchat!',
                    textColor: '#FFFFFF',
                    donorColor: currentAlert.donorColor,
                    amountColor: currentAlert.amountColor,
                    mediaUrl: currentAlert.mediaUrl,
                    customGifUrl: currentAlert.mediaUrl,
                    showImage: true,
                    fontFamily: currentAlert.fontFamily,
                    fontSize: 22,
                    layoutMode: 'top',
                    animationStyle: currentAlert.animationStyle,
                    glowColor: currentAlert.glowColor,
                    badgeText: currentAlert.badgeText,
                    badgeColor: currentAlert.badgeColor,
                    badgeBg: currentAlert.badgeBg,
                    badgeBorder: currentAlert.badgeBorder
                  }}
                />
              </div>
            </div>
          </div>
        </div>
      </ScrollSwipeSection>

      {/* ========================================================================= */}
      {/* FEATURE 2: VIDEO ALERTS (LEFT: CARD, RIGHT: TEXT)                         */}
      {/* Smoothly rotates 15° when video clip changes                              */}
      {/* Zero element outline: clean border-0 with soft translucent glass          */}
      {/* ========================================================================= */}
      <ScrollSwipeSection className="w-full max-w-full min-w-0 flex flex-col lg:flex-row-reverse items-center gap-8 sm:gap-10 lg:gap-14 relative z-10">
        {/* Right Side: Title & Description */}
        <div className="w-full lg:w-1/2 space-y-4 min-w-0">
          <h3 className="text-2xl xs:text-3xl sm:text-4xl font-extrabold text-white font-['Chakra_Petch'] leading-tight">
            Media Share &amp; Video Alerts with Live Scrubber
          </h3>

          <p className="text-slate-300 text-xs sm:text-sm md:text-base leading-relaxed text-justify [text-align-last:left]">
            Allow your viewers to share hype gameplay moments, music tracks, or funny clips on stream. Our video alert engine synchronizes YouTube playback with live progress scrubbers, volume leveling, and automatic game audio ducking.
          </p>

          {/* Feature Highlights Grid - Clean Default Icons */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-3 pt-2 w-full min-w-0">
            <div className="p-3 rounded-xl bg-white/[0.04] flex items-start gap-2.5 min-w-0">
              <div className="w-7 h-7 rounded-lg bg-white/[0.08] flex items-center justify-center shrink-0 text-slate-300 mt-0.5">
                <Tv size={14} />
              </div>
              <div className="min-w-0">
                <span className="text-xs font-bold text-white block truncate">OBS Studio 60 FPS</span>
                <span className="text-[11px] text-slate-400 truncate block">Zero CPU browser overlay</span>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-white/[0.04] flex items-start gap-2.5 min-w-0">
              <div className="w-7 h-7 rounded-lg bg-white/[0.08] flex items-center justify-center shrink-0 text-slate-300 mt-0.5">
                <Volume2 size={14} />
              </div>
              <div className="min-w-0">
                <span className="text-xs font-bold text-white block truncate">Auto-Ducking 85%</span>
                <span className="text-[11px] text-slate-400 truncate block">Protects voice &amp; gameplay</span>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-white/[0.04] flex items-start gap-2.5 min-w-0">
              <div className="w-7 h-7 rounded-lg bg-white/[0.08] flex items-center justify-center shrink-0 text-slate-300 mt-0.5">
                <Flame size={14} />
              </div>
              <div className="min-w-0">
                <span className="text-xs font-bold text-white block truncate">Live Scrubber</span>
                <span className="text-[11px] text-slate-400 truncate block">Red duration bar sync</span>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-white/[0.04] flex items-start gap-2.5 min-w-0">
              <div className="w-7 h-7 rounded-lg bg-white/[0.08] flex items-center justify-center shrink-0 text-slate-300 mt-0.5">
                <ShieldCheck size={14} />
              </div>
              <div className="min-w-0">
                <span className="text-xs font-bold text-white block truncate">Safety Moderation</span>
                <span className="text-[11px] text-slate-400 truncate block">Instant skip hotkeys</span>
              </div>
            </div>
          </div>
        </div>

        {/* Left Side: Clean Default Flat Preview (No 3D rotation, responsive) */}
        <div className="w-full lg:w-1/2 flex justify-center min-w-0">
          <div className="w-full max-w-lg bg-transparent border-0 shadow-none p-0 relative flex flex-col items-center justify-center min-w-0">
            {/* Animated Wrapper remounting on each 5s cycle key for change animation - No element outline */}
            <div
              key={`media-share-${videoClipCycleKey}-${currentMediaClip.id}`}
              className={`w-full relative flex flex-col rounded-2xl sm:rounded-3xl overflow-hidden border-0 shadow-[0_0_50px_rgba(0,0,0,0.85)] ${currentMediaClip.animationStyle} select-none min-w-0`}
              style={{
                filter: `drop-shadow(0 0 25px ${currentMediaClip.glowColor}25)`
              }}
            >
              {/* ============================================================== */}
              {/* 1. TOP SECTION: THE DONOR (NAME & AMOUNT)                     */}
              {/* Zero element outline, translucent obsidian glass              */}
              {/* ============================================================== */}
              <div className="w-full px-3 sm:px-4 py-2.5 sm:py-3 flex items-center justify-between text-xs font-mono bg-[#0A0F1E]/95 backdrop-blur-xl gap-2 min-w-0">
                <div className="flex items-center gap-1.5 sm:gap-2 min-w-0 flex-1">
                  <span
                    className="text-xs sm:text-base font-bold font-['Chakra_Petch'] tracking-wide truncate"
                    style={{
                      ...getGradientOrColorStyle(currentMediaClip.donorColor),
                      textShadow: `0 0 12px ${currentMediaClip.glowColor}99, 0 2px 4px rgba(0,0,0,0.95)`
                    }}
                  >
                    {currentMediaClip.donorName}
                  </span>
                  <span className="text-[9px] sm:text-[10px] px-1.5 sm:px-2 py-0.5 rounded-full bg-cyan-500/15 text-cyan-300 font-mono font-bold flex-shrink-0">
                    MEDIA SHARE
                  </span>
                </div>
                <div className="text-right flex-shrink-0 pl-1">
                  <span
                    className="text-xs sm:text-sm font-black font-mono whitespace-nowrap"
                    style={getGradientOrColorStyle(currentMediaClip.amountColor)}
                  >
                    {currentMediaClip.currency === 'KHR'
                      ? `${currentMediaClip.amount.toLocaleString()} ៛`
                      : `$${currentMediaClip.amount.toFixed(2)}`}
                  </span>
                </div>
              </div>

              {/* ============================================================== */}
              {/* 2. THE VIDEO SCREEN (16:9 Aspect Ratio)                        */}
              {/* Zero element outline                                           */}
              {/* ============================================================== */}
              <div className="relative w-full aspect-video overflow-hidden bg-black flex flex-col justify-between p-3.5 sm:p-4">
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

                {/* Top Video HUD: Game tag & 60 FPS Badge - No element outline */}
                <div className="relative z-10 flex items-center justify-between">
                  <span className="px-2.5 py-1 rounded-full bg-black/75 backdrop-blur-md text-[10px] sm:text-[11px] font-mono font-bold text-white shadow-sm">
                    {currentMediaClip.gameTag}
                  </span>
                  <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-black/75 backdrop-blur-md text-[10px] font-mono text-cyan-300">
                    <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-ping" />
                    <span>60 FPS</span>
                  </div>
                </div>

                {/* Center Video Playing Indicator & Title - No element outline */}
                <div className="relative z-10 my-auto text-center space-y-1.5">
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-black/85 backdrop-blur-md text-red-400 text-xs font-mono shadow-lg">
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
              <div className="w-full h-1.5 sm:h-2 relative overflow-hidden bg-slate-950">
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
              {/* No element outline                                             */}
              {/* ============================================================== */}
              <div className="w-full p-3.5 sm:p-4 bg-[#0A0F1E]/95 backdrop-blur-xl flex items-center justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <p className="text-xs sm:text-sm text-slate-200 leading-snug font-sans italic truncate">
                    &ldquo;{currentMediaClip.donorMessage}&rdquo;
                  </p>
                </div>
                <div className="text-[10px] font-mono text-slate-400 flex items-center gap-1.5 flex-shrink-0">
                  <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-ping" />
                  <span>5s CLIP</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </ScrollSwipeSection>

      {/* ========================================================================= */}
      {/* FEATURE 3: LEADERBOARD (LEFT: TEXT, RIGHT: CARD)                          */}
      {/* ========================================================================= */}
      <ScrollSwipeSection className="w-full max-w-full min-w-0 flex flex-col lg:flex-row items-center gap-8 sm:gap-10 lg:gap-14 relative z-10">
        {/* Left Side: Title & Description */}
        <div className="w-full lg:w-1/2 space-y-4 min-w-0">
          <h3 className="text-2xl xs:text-3xl sm:text-4xl font-extrabold text-white font-['Chakra_Petch'] leading-tight">
            Real-Time Stream Leaderboard &amp; Top Supporters
          </h3>

          <p className="text-slate-300 text-xs sm:text-sm md:text-base leading-relaxed text-justify [text-align-last:left]">
            Recognize your top supporters and high rollers with high-contrast Hall of Fame leaderboards. Features real-time ranking updates, gold crown podium highlights, and automatic multi-currency conversion between USD and KHR.
          </p>
        </div>

        {/* Right Side: Clean Default Flat Preview (No 3D rotation) */}
        <div className="w-full lg:w-1/2 flex justify-center min-w-0">
          <div className="w-full max-w-lg bg-transparent border-0 shadow-none p-0 relative min-w-0">
            {/* Header */}
            <div className="flex items-center justify-between pb-2 mb-3 gap-2 min-w-0">
              <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
                <Trophy size={16} className="text-yellow-400 animate-pulse shrink-0" />
                <span className="text-xs sm:text-sm font-bold text-white font-['Chakra_Petch'] truncate">
                  STREAM LEADERBOARD
                </span>
                <span className="px-1.5 sm:px-2 py-0.5 rounded-full bg-yellow-500/20 text-yellow-300 text-[9px] sm:text-[10px] font-mono font-bold shrink-0">
                  {leaderboardCycleKey % 2 === 0 ? 'ALL-TIME' : 'MONTHLY'}
                </span>
              </div>
              <div className="text-[10px] sm:text-[11px] font-mono text-slate-400 flex items-center gap-1.5 shrink-0">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                <span>Real-Time Sync</span>
              </div>
            </div>

            {/* Podium Donor Rows */}
            <div className="space-y-2.5">
              {/* Rank 1: Gold - No element outline */}
              <div className="p-2.5 sm:p-3 rounded-xl bg-gradient-to-r from-yellow-500/15 via-amber-500/10 to-slate-950/80 border-0 flex items-center justify-between shadow-lg gap-2 min-w-0">
                <div className="flex items-center gap-2.5 sm:gap-3 min-w-0 flex-1">
                  <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-gradient-to-tr from-yellow-500 to-amber-300 p-0.5 flex items-center justify-center shadow-md shrink-0">
                    <div className="w-full h-full rounded-[10px] bg-slate-950 flex items-center justify-center text-yellow-400">
                      <Crown size={18} className="fill-yellow-400/20" />
                    </div>
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span className="text-xs sm:text-sm font-bold text-white font-['Chakra_Petch'] truncate">
                        Vannak_Pro
                      </span>
                      <span className="px-1.5 py-0.2 rounded bg-yellow-400/20 text-yellow-300 font-mono text-[9px] font-bold shrink-0">
                        RANK #1
                      </span>
                    </div>
                    <span className="text-[10px] sm:text-[11px] text-slate-400 font-mono truncate block">18 Superchats • MLBB Team</span>
                  </div>
                </div>
                <div className="text-right shrink-0 pl-1">
                  <div className="text-sm sm:text-base font-black text-yellow-400 font-mono drop-shadow-[0_0_10px_rgba(234,179,8,0.5)] whitespace-nowrap">
                    $150.00
                  </div>
                  <div className="text-[9px] sm:text-[10px] text-slate-400 font-mono whitespace-nowrap">(600,000 ៛)</div>
                </div>
              </div>

              {/* Rank 2: Silver - No element outline */}
              <div className="p-2.5 sm:p-3 rounded-xl bg-slate-950/80 border-0 flex items-center justify-between transition-all gap-2 min-w-0">
                <div className="flex items-center gap-2.5 sm:gap-3 min-w-0 flex-1">
                  <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-slate-800 border-0 flex items-center justify-center text-slate-300 shrink-0">
                    <Medal size={16} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span className="text-xs sm:text-sm font-bold text-white font-['Chakra_Petch'] truncate">
                        DaraEsports
                      </span>
                      <span className="px-1.5 py-0.2 rounded bg-slate-800 text-slate-300 font-mono text-[9px] shrink-0">
                        RANK #2
                      </span>
                    </div>
                    <span className="text-[10px] sm:text-[11px] text-slate-400 font-mono truncate block">11 Superchats</span>
                  </div>
                </div>
                <div className="text-right shrink-0 pl-1">
                  <div className="text-xs sm:text-sm font-bold text-slate-200 font-mono whitespace-nowrap">
                    $85.00
                  </div>
                  <div className="text-[9px] sm:text-[10px] text-slate-400 font-mono whitespace-nowrap">(340,000 ៛)</div>
                </div>
              </div>

              {/* Rank 3: Bronze - No element outline */}
              <div className="p-2.5 sm:p-3 rounded-xl bg-slate-950/80 border-0 flex items-center justify-between transition-all gap-2 min-w-0">
                <div className="flex items-center gap-2.5 sm:gap-3 min-w-0 flex-1">
                  <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-amber-950/40 border-0 flex items-center justify-center text-amber-500 shrink-0">
                    <Award size={16} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span className="text-xs sm:text-sm font-bold text-white font-['Chakra_Petch'] truncate">
                        Sreypov_Live
                      </span>
                      <span className="px-1.5 py-0.2 rounded bg-amber-950 text-amber-400 font-mono text-[9px] shrink-0">
                        RANK #3
                      </span>
                    </div>
                    <span className="text-[10px] sm:text-[11px] text-slate-400 font-mono truncate block">7 Superchats</span>
                  </div>
                </div>
                <div className="text-right shrink-0 pl-1">
                  <div className="text-xs sm:text-sm font-bold text-amber-300 font-mono whitespace-nowrap">
                    $50.00
                  </div>
                  <div className="text-[9px] sm:text-[10px] text-slate-400 font-mono whitespace-nowrap">(200,000 ៛)</div>
                </div>
              </div>
            </div>

            {/* Total Volume Footer */}
            <div className="mt-3 pt-2.5 flex items-center justify-between text-[11px] sm:text-xs font-mono text-slate-400 gap-2 min-w-0">
              <span className="text-slate-300 truncate">Total Stream Season:</span>
              <span className="text-yellow-400 font-bold shrink-0 whitespace-nowrap">$2,850.00 (11,400,000 ៛)</span>
            </div>
          </div>
        </div>
      </ScrollSwipeSection>

      {/* ========================================================================= */}
      {/* FEATURE 4: STREAM GOAL (LEFT: CARD, RIGHT: TEXT)                          */}
      {/* ========================================================================= */}
      <ScrollSwipeSection className="w-full max-w-full min-w-0 flex flex-col lg:flex-row-reverse items-center gap-8 sm:gap-10 lg:gap-14 relative z-10">
        {/* Right Side: Title & Description */}
        <div className="w-full lg:w-1/2 space-y-4 min-w-0">
          <h3 className="text-2xl xs:text-3xl sm:text-4xl font-extrabold text-white font-['Chakra_Petch'] leading-tight">
            Dynamic Stream Goals with 0% to 100% Progress
          </h3>

          <p className="text-slate-300 text-xs sm:text-sm md:text-base leading-relaxed text-justify [text-align-last:left]">
            Rally your community toward hardware upgrades, gaming tournaments, or charity milestones. Watch the glowing neon progress bar run smoothly in real time with dynamic numeric counters and automatic celebration particle bursts.
          </p>
        </div>

        {/* Left Side: Clean Default Flat Preview (No 3D rotation) */}
        <div className="w-full lg:w-1/2 flex justify-center min-w-0">
          <div className="w-full max-w-lg bg-transparent border-0 shadow-none p-0 relative min-w-0">
            {/* Real Dashboard & Overlay Goal Asset (Template Renderer with isAnimating=true for synchronized progress) */}
            <div
              key={`goal-preview-${goalCycleKey}-${currentGoal.id}`}
              className="w-full max-w-full relative z-10 animate-fade-in flex justify-center select-none min-w-0 overflow-hidden"
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
                showGradientShader={true}
                isAnimating={true}
                endDate={null}
              />
            </div>
          </div>
        </div>
      </ScrollSwipeSection>

      {/* ========================================================================= */}
      {/* FEATURE 5: LIVE CHAT (LEFT: TEXT, RIGHT: CARD)                            */}
      {/* ========================================================================= */}
      <ScrollSwipeSection className="w-full max-w-full min-w-0 flex flex-col lg:flex-row items-center gap-8 sm:gap-10 lg:gap-14 relative z-10">
        {/* Left Side: Title & Description */}
        <div className="w-full lg:w-1/2 space-y-4 min-w-0">
          <h3 className="text-2xl xs:text-3xl sm:text-4xl font-extrabold text-white font-['Chakra_Petch'] leading-tight">
            Live Stream Chat with Swipe Animations
          </h3>

          <p className="text-slate-300 text-xs sm:text-sm md:text-base leading-relaxed text-justify [text-align-last:left]">
            Keep your viewers engaged with customizable, high-contrast chat bubbles. Incoming messages slide in smoothly with our dynamic swipe animation, while superchats stay pinned for maximum visibility.
          </p>
        </div>

        {/* Right Side: Clean Default Flat Preview (No 3D rotation) */}
        <div className="w-full lg:w-1/2 flex justify-center min-w-0">
          <div className="w-full max-w-lg bg-transparent border-0 shadow-none p-0 relative min-w-0">
            {/* Chat Header */}
            <div className="flex items-center justify-between pb-2 mb-3 relative z-10 gap-2 min-w-0">
              <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
                <MessageSquare size={16} className="text-pink-400 animate-pulse shrink-0" />
                <span className="text-xs sm:text-sm font-bold text-white font-['Chakra_Petch'] truncate">
                  LIVE STREAM CHAT OVERLAY
                </span>
                <span className="px-1.5 sm:px-2 py-0.5 rounded-full bg-pink-500/20 text-pink-300 text-[9px] sm:text-[10px] font-mono font-bold shrink-0">
                  1,420 VIEWERS
                </span>
              </div>
              <div className="text-[10px] sm:text-[11px] font-mono text-slate-400 flex items-center gap-1 shrink-0">
                <span className="w-2 h-2 rounded-full bg-emerald-400" />
                <span>Real-Time Sync</span>
              </div>
            </div>

            {/* Pinned Superchat Banner - No element outline */}
            <div className="mb-3.5 p-2.5 sm:p-3 rounded-xl bg-gradient-to-r from-pink-500/20 via-purple-500/20 to-cyan-500/20 border-0 flex items-center justify-between shadow-lg relative z-10 gap-2 min-w-0">
              <div className="flex items-center gap-2 sm:gap-2.5 min-w-0 flex-1">
                <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-pink-500 flex items-center justify-center text-white font-black text-xs font-mono shrink-0">
                  $25
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-xs font-bold text-white font-['Chakra_Petch'] flex items-center gap-1.5 min-w-0">
                    <span className="truncate">Piseth_Pro</span>
                    <span className="text-[9px] sm:text-[10px] px-1.5 py-0.2 rounded bg-pink-400/20 text-pink-300 font-mono shrink-0">
                      SUPERCHAT
                    </span>
                  </div>
                  <div className="text-[10px] sm:text-[11px] text-pink-200 truncate">
                    &ldquo;Coffee on me bro! Best streamer in town ☕🔥&rdquo;
                  </div>
                </div>
              </div>
              <div className="text-xs font-black text-pink-300 font-mono shrink-0 pl-1 whitespace-nowrap">$25.00</div>
            </div>

            {/* Chat Message Rows - No element outlines */}
            <div className="space-y-2.5 font-sans relative z-10">
              {[
                {
                  author: 'Chhay_99',
                  badge: 'VIP',
                  badgeBg: 'bg-amber-500/20 text-amber-300',
                  icon: Flame,
                  text: 'Savage kill right there! Insane reaction time ⚡⚡',
                  color: 'text-amber-400'
                },
                {
                  author: 'Bopha_Gamer',
                  badge: 'SUB 6MO',
                  badgeBg: 'bg-pink-500/20 text-pink-300',
                  icon: Star,
                  text: 'Let\'s hit 1,000 stars tonight squad! 💖💖',
                  color: 'text-pink-400'
                },
                {
                  author: 'Socheat_Mod',
                  badge: 'MOD',
                  badgeBg: 'bg-emerald-500/20 text-emerald-300',
                  icon: ShieldCheck,
                  text: 'Rules: Be respectful in chat & enjoy the live gameplay! 🎮',
                  color: 'text-emerald-400'
                },
                {
                  author: 'Meng_MLBB',
                  badge: 'SUB 2MO',
                  badgeBg: 'bg-cyan-500/20 text-cyan-300',
                  icon: Zap,
                  text: 'That ultimate combo was legendary 🔥🔥🔥',
                  color: 'text-cyan-400'
                }
              ].map((msg, i) => {
                const Icon = msg.icon;
                return (
                  <div
                    key={i}
                    className="p-2 sm:p-2.5 rounded-xl bg-slate-950/70 border-0 flex items-start gap-2 sm:gap-2.5 transition-all text-xs min-w-0"
                  >
                    <span className={`px-1.5 py-0.5 rounded text-[9px] sm:text-[10px] font-mono font-bold flex items-center gap-1 shrink-0 ${msg.badgeBg}`}>
                      <Icon size={10} />
                      <span>{msg.badge}</span>
                    </span>
                    <div className="flex-1 min-w-0 break-words">
                      <span className={`font-bold font-['Chakra_Petch'] mr-1.5 ${msg.color}`}>
                        {msg.author}:
                      </span>
                      <span className="text-slate-300 leading-relaxed text-[11px] sm:text-xs">{msg.text}</span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Floating Emojis */}
            <div className="absolute bottom-4 right-4 flex items-center gap-1.5 pointer-events-none z-10">
              {['🔥', '⚡', '💖', '🎉'].map((emoji, i) => (
                <span key={i} className="text-base sm:text-lg animate-bounce" style={{ animationDelay: `${i * 150}ms` }}>
                  {emoji}
                </span>
              ))}
            </div>
          </div>
        </div>
      </ScrollSwipeSection>

      {/* ========================================================================= */}
      {/* FEATURE 6: INTERACTIVE SPINNING WHEEL (LEFT: CARD, RIGHT: TEXT)           */}
      {/* ========================================================================= */}
      <ScrollSwipeSection className="w-full max-w-full min-w-0 flex flex-col lg:flex-row-reverse items-center gap-8 sm:gap-10 lg:gap-14 relative z-10">
        {/* Right Side: Title & Description */}
        <div className="w-full lg:w-1/2 space-y-4 min-w-0">
          <h3 className="text-2xl xs:text-3xl sm:text-4xl font-extrabold text-white font-['Chakra_Petch'] leading-tight">
            Interactive Wheel of Fortune &amp; Chat Rewards
          </h3>

          <p className="text-slate-300 text-xs sm:text-sm md:text-base leading-relaxed text-justify [text-align-last:left]">
            Boost audience retention and superchat excitement with an interactive Spinning Wheel widget. Streamers can configure custom rewards—from 1v1 viewer matches, song requests, pushup challenges, to cash jackpots—with fully customizable slice odds, sound triggers, and instant zero-latency spin animations directly in OBS.
          </p>

          {/* Feature Highlights Grid - Clean Default Icons */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-3 pt-2 w-full min-w-0">
            <div className="p-3 rounded-xl bg-white/[0.04] flex items-start gap-2.5 min-w-0">
              <div className="w-7 h-7 rounded-lg bg-white/[0.08] flex items-center justify-center shrink-0 text-slate-300 mt-0.5">
                <Disc size={14} />
              </div>
              <div className="min-w-0">
                <span className="text-xs font-bold text-white block truncate">Custom Odds &amp; Slices</span>
                <span className="text-[11px] text-slate-400 truncate block">Weighted percentages</span>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-white/[0.04] flex items-start gap-2.5 min-w-0">
              <div className="w-7 h-7 rounded-lg bg-white/[0.08] flex items-center justify-center shrink-0 text-slate-300 mt-0.5">
                <Sparkles size={14} />
              </div>
              <div className="min-w-0">
                <span className="text-xs font-bold text-white block truncate">Real-Time OBS Animation</span>
                <span className="text-[11px] text-slate-400 truncate block">60 FPS GPU acceleration</span>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-white/[0.04] flex items-start gap-2.5 min-w-0">
              <div className="w-7 h-7 rounded-lg bg-white/[0.08] flex items-center justify-center shrink-0 text-slate-300 mt-0.5">
                <Trophy size={14} />
              </div>
              <div className="min-w-0">
                <span className="text-xs font-bold text-white block truncate">Superchat Triggers</span>
                <span className="text-[11px] text-slate-400 truncate block">Spin on donor tips</span>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-white/[0.04] flex items-start gap-2.5 min-w-0">
              <div className="w-7 h-7 rounded-lg bg-white/[0.08] flex items-center justify-center shrink-0 text-slate-300 mt-0.5">
                <Volume2 size={14} />
              </div>
              <div className="min-w-0">
                <span className="text-xs font-bold text-white block truncate">Audio SFX &amp; Alerts</span>
                <span className="text-[11px] text-slate-400 truncate block">Cyber chime victory triggers</span>
              </div>
            </div>
          </div>
        </div>

        {/* Left Side: Clean Default Flat Preview (No 3D rotation, pure borderless card) */}
        <div className="w-full lg:w-1/2 flex justify-center min-w-0">
          <div className="w-full max-w-lg bg-transparent border-0 shadow-none p-0 relative flex flex-col items-center min-w-0">
            {/* Wheel Header Status */}
            <div className="flex items-center justify-between pb-2 mb-2 w-full max-w-[380px] min-w-0">
              <div className="flex items-center gap-1.5 min-w-0">
                <Disc size={15} className="text-purple-400 animate-spin shrink-0" style={{ animationDuration: '6s' }} />
                <span className="text-xs sm:text-sm font-bold text-white font-['Chakra_Petch'] truncate">
                  STREAM WHEEL OVERLAY
                </span>
                <span className="px-1.5 py-0.2 rounded-full bg-purple-500/20 text-purple-300 text-[9px] font-mono font-bold shrink-0">
                  60 FPS
                </span>
              </div>
              <div className="text-[10px] font-mono text-slate-400 flex items-center gap-1 shrink-0">
                <span className="w-2 h-2 rounded-full bg-emerald-400" />
                <span>OBS Ready</span>
              </div>
            </div>

            {/* Circular Spinning Wheel Preview Container */}
            <div className="relative w-64 h-64 xs:w-72 xs:h-72 sm:w-80 sm:h-80 md:w-84 md:h-84 flex items-center justify-center select-none my-1">
              {/* Pointer Arrow at Top Center */}
              <div className="absolute -top-3 z-30 w-0 h-0 border-l-[12px] sm:border-l-[14px] border-l-transparent border-r-[12px] sm:border-r-[14px] border-r-transparent border-t-[22px] sm:border-t-[26px] border-t-amber-400 filter drop-shadow-[0_4px_12px_rgba(245,158,11,0.9)] pointer-events-none" />

              {/* Vector SVG Circular Wheel */}
              <svg
                viewBox="0 0 350 350"
                className="w-full h-full drop-shadow-[0_0_35px_rgba(168,85,247,0.35)] select-none cursor-pointer"
                onClick={triggerWheelSpin}
                style={{
                  transform: `rotate(${wheelRotation}deg)`,
                  transition: isWheelSpinning
                    ? 'transform 3.6s cubic-bezier(0.12, 0.8, 0.32, 1)'
                    : 'none',
                  filter: wheelWinner ? 'blur(2px) brightness(0.7)' : 'none'
                }}
              >
                {svgWheelSlices.map((s) => (
                  <g key={s.id}>
                    <path d={s.pathData} fill={s.color} stroke="#090D18" strokeWidth="3" />
                    <text
                      x={s.tx}
                      y={s.ty}
                      textAnchor="middle"
                      dominantBaseline="middle"
                      transform={`rotate(${s.midAngle - 90}, ${s.tx}, ${s.ty})`}
                      fill="#FFFFFF"
                      fontWeight="bold"
                      fontSize="11"
                      fontFamily="Chakra Petch"
                      className="drop-shadow-[0_1px_2px_rgba(0,0,0,0.95)]"
                    >
                      {s.label}
                    </text>
                  </g>
                ))}

                {/* Center Hub */}
                <circle cx="175" cy="175" r="30" fill="#090D18" stroke="#1E293B" strokeWidth="4" />
                <circle cx="175" cy="175" r="16" fill="#8B5CF6" />
                <circle cx="175" cy="175" r="6" fill="#FFFFFF" opacity="0.95" />
              </svg>

              {/* Outcome Celebration Popup (Centered over the blurred wheel) */}
              {wheelWinner && (
                <div className="absolute inset-0 z-40 flex items-center justify-center p-3 pointer-events-none animate-in fade-in zoom-in-95 duration-300">
                  <div className="w-full max-w-[260px] px-4 py-3 rounded-2xl bg-[#090D18]/95 border-2 border-purple-500/80 shadow-[0_0_40px_rgba(168,85,247,0.8)] text-center backdrop-blur-md">
                    <span className="text-[10px] font-mono uppercase tracking-widest text-purple-300 font-bold block">
                      REWARD OUTCOME
                    </span>
                    <span className="text-base sm:text-lg font-black text-white font-['Chakra_Petch'] break-words">
                      {wheelWinner}
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Test Spin Controls */}
            <div className="mt-2.5 flex items-center justify-center gap-2.5 w-full">
              <button
                type="button"
                onClick={triggerWheelSpin}
                disabled={isWheelSpinning}
                className="px-4 py-2 rounded-xl bg-purple-600/30 hover:bg-purple-600/50 text-purple-200 text-xs font-mono font-bold flex items-center gap-2 border-0 transition-all active:scale-95 disabled:opacity-50"
              >
                <RotateCw size={13} className={isWheelSpinning ? 'animate-spin' : ''} />
                <span>{isWheelSpinning ? 'Spinning Wheel...' : 'Test Spin Wheel'}</span>
              </button>
            </div>
          </div>
        </div>
      </ScrollSwipeSection>

      {/* ========================================================================= */}
      {/* FEATURE 7: SUBATHON & COUNTDOWN TIMER (LEFT: TEXT, RIGHT: CARD)           */}
      {/* ========================================================================= */}
      <ScrollSwipeSection className="w-full max-w-full min-w-0 flex flex-col lg:flex-row items-center gap-8 sm:gap-10 lg:gap-14 relative z-10">
        {/* Left Side: Title & Description */}
        <div className="w-full lg:w-1/2 space-y-4 min-w-0">
          <h3 className="text-2xl xs:text-3xl sm:text-4xl font-extrabold text-white font-['Chakra_Petch'] leading-tight">
            Dynamic Subathon &amp; Event Countdown Timer
          </h3>

          <p className="text-slate-300 text-xs sm:text-sm md:text-base leading-relaxed text-justify [text-align-last:left]">
            Supercharge your marathon streams and charity events with an automated Subathon Countdown Timer. Automatically extend stream duration for every Superchat, Bakong KHQR tip, or tier subscription. Featuring over 40+ high-energy cyber, RGB, and retro themes with customizable soft/hard caps and synchronized low-latency overlay integration.
          </p>

          {/* Feature Highlights Grid - Clean Default Icons */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-3 pt-2 w-full min-w-0">
            <div className="p-3 rounded-xl bg-white/[0.04] flex items-start gap-2.5 min-w-0">
              <div className="w-7 h-7 rounded-lg bg-white/[0.08] flex items-center justify-center shrink-0 text-slate-300 mt-0.5">
                <Timer size={14} />
              </div>
              <div className="min-w-0">
                <span className="text-xs font-bold text-white block truncate">Auto Time Extension</span>
                <span className="text-[11px] text-slate-400 truncate block">+Minutes per $1 or 4,000 ៛</span>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-white/[0.04] flex items-start gap-2.5 min-w-0">
              <div className="w-7 h-7 rounded-lg bg-white/[0.08] flex items-center justify-center shrink-0 text-slate-300 mt-0.5">
                <Sparkles size={14} />
              </div>
              <div className="min-w-0">
                <span className="text-xs font-bold text-white block truncate">40+ Cyber &amp; Gaming Styles</span>
                <span className="text-[11px] text-slate-400 truncate block">Neon, Chroma RGB, Mecha HUD</span>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-white/[0.04] flex items-start gap-2.5 min-w-0">
              <div className="w-7 h-7 rounded-lg bg-white/[0.08] flex items-center justify-center shrink-0 text-slate-300 mt-0.5">
                <ShieldCheck size={14} />
              </div>
              <div className="min-w-0">
                <span className="text-xs font-bold text-white block truncate">Soft &amp; Hard Time Caps</span>
                <span className="text-[11px] text-slate-400 truncate block">Max marathon boundaries</span>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-white/[0.04] flex items-start gap-2.5 min-w-0">
              <div className="w-7 h-7 rounded-lg bg-white/[0.08] flex items-center justify-center shrink-0 text-slate-300 mt-0.5">
                <Zap size={14} />
              </div>
              <div className="min-w-0">
                <span className="text-xs font-bold text-white block truncate">Zero CPU Browser Source</span>
                <span className="text-[11px] text-slate-400 truncate block">60 FPS lightweight sync</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Side: Clean Default Flat Preview (No 3D rotation) */}
        <div className="w-full lg:w-1/2 flex justify-center min-w-0">
          <div className="w-full max-w-lg bg-transparent border-0 shadow-none p-0 relative flex flex-col items-center min-w-0">
            {/* Timer Header Status */}
            <div className="flex items-center justify-between pb-2 mb-2 w-full max-w-xl min-w-0">
              <div className="flex items-center gap-1.5 min-w-0">
                <Timer size={15} className="text-cyan-400 animate-pulse shrink-0" />
                <span className="text-xs sm:text-sm font-bold text-white font-['Chakra_Petch'] truncate">
                  SUBATHON COUNTDOWN OVERLAY
                </span>
                <span className="px-1.5 py-0.2 rounded-full bg-cyan-500/20 text-cyan-300 text-[9px] font-mono font-bold shrink-0">
                  LIVE TICK
                </span>
              </div>
              <div className="text-[10px] font-mono text-emerald-400 flex items-center gap-1 shrink-0">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                <span>+10m / $1 Added</span>
              </div>
            </div>

            {/* Real Dashboard & Overlay Timer Asset (Dynamic Style Rotation & Live Second Countdown) */}
            <div
              key={`timer-card-${timerPresetIndex}-${currentTimerPreset.id}`}
              className="w-full max-w-full overflow-hidden flex justify-center select-none min-w-0 animate-fade-in"
            >
              <TimerTemplateRenderer
                title={currentTimerPreset.title}
                remainingSeconds={timerSeconds}
                isRunning={true}
                rateMinutesPerUsd={10}
                glowColor={currentTimerPreset.glowColor}
                templateStyle={currentTimerPreset.style}
                showBackground={true}
                showAnimation={true}
                showTitle={true}
                showDescription={true}
                description={currentTimerPreset.description}
              />
            </div>

            {/* Simulated Live Donor Time Extension Badge */}
            <div className="h-8 mt-3 flex items-center justify-center w-full">
              {recentTimeBonus ? (
                <div className="px-3 py-1 rounded-full bg-emerald-500/20 border-0 text-emerald-300 text-[11px] font-mono flex items-center gap-1.5 shadow-lg animate-in fade-in slide-in-from-bottom-2 duration-300">
                  <Zap size={12} className="text-emerald-400 animate-bounce" />
                  <span className="font-bold">{recentTimeBonus.donor}</span>
                  <span>added</span>
                  <span className="font-bold text-white">+{recentTimeBonus.minutes}m</span>
                  <span>via Superchat!</span>
                </div>
              ) : (
                <div className="flex items-center gap-1.5 text-[10px] sm:text-[11px] font-mono text-slate-400">
                  <Clock size={12} />
                  <span>Cycles across 40+ themes automatically • Real-time sync</span>
                </div>
              )}
            </div>

            {/* Interactive Theme Style Switcher Pills */}
            <div className="mt-2 flex items-center justify-center gap-1.5 flex-wrap">
              {SHOWCASE_TIMER_PRESETS.map((p, idx) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setTimerPresetIndex(idx)}
                  className={`px-2 py-0.5 rounded-full text-[10px] font-mono transition-all border-0 ${
                    idx === timerPresetIndex
                      ? 'bg-white/20 text-white font-bold'
                      : 'bg-white/[0.04] text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {p.name}
                </button>
              ))}
            </div>
          </div>
        </div>
      </ScrollSwipeSection>
    </section>
  );
};
