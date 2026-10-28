'use client';

import React, { useState } from 'react';
import {
  Zap,
  Radio,
  Bell,
  DollarSign,
  Bot,
  ExternalLink,
  ShieldCheck,
  ArrowRight,
  Play,
  Sparkles,
  Volume2,
  Tv,
  CheckCircle2,
  Flame,
  QrCode,
  Landmark,
  Sliders,
  Check,
  ChevronDown,
  Layers,
  Send,
  Eye,
  CreditCard,
  Crown,
  BadgeCheck,
  Heart
} from 'lucide-react';
import { Button } from '../components/common/Button';
import { useAudio } from '../hooks/useAudio';
import confetti from 'canvas-confetti';

interface HomePageProps {
  onNavigate: (page: string, params?: any) => void;
}

interface VerifiedCreatorCard {
  name: string;
  username: string;
  tag: string;
  avatar: string;
  supporters?: string;
  verified: boolean;
  glowColor?: string;
}

const DEFAULT_LANE_1_CREATORS: VerifiedCreatorCard[] = [
  {
    name: 'Heng Farm 07',
    username: 'hengfarm07',
    tag: 'MLBB & Variety Live',
    avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=hengfarm07',
    supporters: '1.4k Tips',
    verified: true,
    glowColor: '#00F0FF'
  },
  {
    name: 'Neon Master VIP',
    username: 'neonstreamer',
    tag: 'Valorant & Tournament Caster',
    avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=neonmaster',
    supporters: '3.8k Tips',
    verified: true,
    glowColor: '#EC4899'
  },
  {
    name: 'Sokha Gaming KH',
    username: 'sokhagaming',
    tag: 'PUBG Mobile Cambodia',
    avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=sokhagaming',
    supporters: '890 Tips',
    verified: true,
    glowColor: '#10B981'
  },
  {
    name: 'Dara Esports Live',
    username: 'daraesports',
    tag: 'FPS & Community Tournaments',
    avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=daraesports',
    supporters: '2.1k Tips',
    verified: true,
    glowColor: '#A855F7'
  },
  {
    name: 'Sreypov Streamer',
    username: 'sreypovlive',
    tag: 'Just Chatting & Mobile Legends',
    avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=sreypovlive',
    supporters: '950 Tips',
    verified: true,
    glowColor: '#F59E0B'
  },
  {
    name: 'ProGamerKH',
    username: 'progamerkh',
    tag: 'Apex Legends & Warzone 2',
    avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=progamerkh',
    supporters: '1.2k Tips',
    verified: true,
    glowColor: '#38BDF8'
  }
];

const DEFAULT_LANE_2_CREATORS: VerifiedCreatorCard[] = [
  {
    name: 'KompongGamer',
    username: 'komponggamer',
    tag: 'GTA V Roleplay Cambodia',
    avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=komponggamer',
    supporters: '1.7k Tips',
    verified: true,
    glowColor: '#10B981'
  },
  {
    name: 'CyberNinja99',
    username: 'cyberninja99',
    tag: 'Speedruns & Retro Games',
    avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=cyberninja99',
    supporters: '720 Tips',
    verified: true,
    glowColor: '#00F0FF'
  },
  {
    name: 'Piseth Live Cast',
    username: 'pisethlive',
    tag: 'E-Sports Analyst & Podcast',
    avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=pisethlive',
    supporters: '2.5k Tips',
    verified: true,
    glowColor: '#EC4899'
  },
  {
    name: 'Apsara Gaming TV',
    username: 'apsaragaming',
    tag: 'League of Legends & Wild Rift',
    avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=apsaragaming',
    supporters: '1.9k Tips',
    verified: true,
    glowColor: '#8B5CF6'
  },
  {
    name: 'Vannak Playz',
    username: 'vannakplayz',
    tag: 'Free Fire & Mobile Tournaments',
    avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=vannakplayz',
    supporters: '1.1k Tips',
    verified: true,
    glowColor: '#06B6D4'
  },
  {
    name: 'Phnom Penh Streamers',
    username: 'ppstreamers',
    tag: 'IRL Street Food & City Walks',
    avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=ppstreamers',
    supporters: '3.1k Tips',
    verified: true,
    glowColor: '#F43F5E'
  }
];

const SUPPORTED_BANKS = [
  'ABA Bank',
  'ACLEDA Bank',
  'Canadia Bank',
  'Wing Bank',
  'Bakong KHQR',
  'Sathapana Bank',
  'J Trust Royal',
  'CPBank',
  'Chip Mong Bank',
  'Shinhan Bank',
  'Phillip Bank',
  'Prince Bank',
  'Woori Bank',
  'Campu Bank'
];

export const HomePage: React.FC<HomePageProps> = ({ onNavigate }) => {
  const { playSynthNeonChime } = useAudio();

  // Dynamic Verified Streamers State from Database
  const [dbVerifiedStreamers, setDbVerifiedStreamers] = useState<any[]>([]);

  React.useEffect(() => {
    fetch('/api/streamer/verified')
      .then((res) => res.json())
      .then((data) => {
        if (data.success && Array.isArray(data.streamers) && data.streamers.length > 0) {
          setDbVerifiedStreamers(data.streamers);
        }
      })
      .catch(() => {});
  }, []);

  const lane1List = React.useMemo(() => {
    if (!dbVerifiedStreamers || dbVerifiedStreamers.length === 0) return DEFAULT_LANE_1_CREATORS;
    const fromDb = dbVerifiedStreamers.filter((_, i) => i % 2 === 0).map((s) => ({
      name: s.displayName,
      username: s.username,
      tag: s.bio || 'Verified Streamer',
      avatar: s.avatarUrl,
      supporters: s.totalTips > 0 ? `${s.totalTips} Tips` : 'Verified Creator',
      verified: true
    }));
    return [...fromDb, ...DEFAULT_LANE_1_CREATORS];
  }, [dbVerifiedStreamers]);

  const lane2List = React.useMemo(() => {
    if (!dbVerifiedStreamers || dbVerifiedStreamers.length === 0) return DEFAULT_LANE_2_CREATORS;
    const fromDb = dbVerifiedStreamers.filter((_, i) => i % 2 === 1).map((s) => ({
      name: s.displayName,
      username: s.username,
      tag: s.bio || 'Verified Streamer',
      avatar: s.avatarUrl,
      supporters: s.totalTips > 0 ? `${s.totalTips} Tips` : 'Verified Creator',
      verified: true
    }));
    return [...fromDb, ...DEFAULT_LANE_2_CREATORS];
  }, [dbVerifiedStreamers]);

  const renderStreamerCard = (creator: VerifiedCreatorCard, key: string) => (
    <div
      key={key}
      onClick={() => onNavigate('donate', { username: creator.username })}
      className="w-[280px] sm:w-[320px] flex-shrink-0 p-4 rounded-2xl bg-[#0C101C]/90 hover:bg-[#121829] border border-slate-800/90 hover:border-cyan-500/50 shadow-xl transition-all duration-300 hover:scale-[1.02] cursor-pointer group flex flex-col justify-between space-y-3.5 select-none"
    >
      <div className="flex items-center gap-3 min-w-0">
        <div className="relative flex-shrink-0">
          <div className="w-12 h-12 rounded-xl p-0.5 bg-gradient-to-tr from-cyan-500 via-indigo-500 to-pink-500 shadow-md">
            <img
              src={creator.avatar}
              alt={creator.name}
              className="w-full h-full rounded-[10px] bg-slate-900 object-cover"
            />
          </div>
          <div className="absolute -bottom-1 -right-1 p-0.5 rounded-full bg-slate-950">
            <BadgeCheck size={14} className="text-cyan-400 fill-cyan-400/20" />
          </div>
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <h4 className="text-sm font-bold text-white font-['Chakra_Petch'] truncate group-hover:text-cyan-300 transition-colors">
              {creator.name}
            </h4>
            <BadgeCheck size={14} className="text-cyan-400 fill-cyan-400/20 flex-shrink-0" />
          </div>
          <p className="text-[11px] font-mono text-cyan-400 truncate">@{creator.username}</p>
          <p className="text-[11px] text-slate-400 truncate mt-0.5">{creator.tag}</p>
        </div>
      </div>

      <div className="pt-2.5 border-t border-slate-800/80 flex items-center justify-between text-[11px] font-mono">
        <div className="flex items-center gap-1.5 text-slate-400">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-emerald-400 font-semibold">{creator.supporters || 'Active Live'}</span>
        </div>
        <div className="flex items-center gap-1 text-cyan-400 font-bold group-hover:translate-x-0.5 transition-transform">
          <span>Tip Page</span>
          <ArrowRight size={12} />
        </div>
      </div>
    </div>
  );

  // Interactive Live Simulator State
  const [demoAmount, setDemoAmount] = useState<number>(10);
  const [demoCurrency, setDemoCurrency] = useState<'USD' | 'KHR'>('USD');
  const [demoDonor, setDemoDonor] = useState<string>('CyberNinja99');
  const [demoBank, setDemoBank] = useState<string>('ABA Bank');
  const [demoMessage, setDemoMessage] = useState<string>('Awesome clutch round! Keep dominating the stream! 🚀🔥');
  const [isPlayingDemo, setIsPlayingDemo] = useState<boolean>(false);

  // Fee Calculator State
  const [monthlyTips, setMonthlyTips] = useState<number>(1000);

  // FAQ Accordion State
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(0);

  const triggerLiveDemoAlert = (
    amount: number,
    donor: string,
    bank: string,
    msg: string,
    currency: 'USD' | 'KHR' = 'USD'
  ) => {
    setDemoAmount(amount);
    setDemoDonor(donor);
    setDemoBank(bank);
    setDemoMessage(msg);
    setDemoCurrency(currency);
    setIsPlayingDemo(true);

    playSynthNeonChime(0.9);

    try {
      if (typeof window !== 'undefined') {
        confetti({
          particleCount: 100,
          spread: 80,
          origin: { y: 0.6 },
          colors: ['#00F0FF', '#38BDF8', '#EC4899', '#A855F7', '#10B981']
        });
      }
    } catch (e) {}

    setTimeout(() => {
      setIsPlayingDemo(false);
    }, 4500);
  };

  // Fee math
  const twitchYoutubeFee = monthlyTips * 0.3; // 30% cut on Twitch/YT
  const streambotStarterFee = monthlyTips * 0.1; // 10% fee on Starter
  const streambotProCost = 1.99; // $1.99 flat, 0% cut
  const savingsVsTwitch = Math.max(0, twitchYoutubeFee - streambotProCost);

  return (
    <div className="relative overflow-hidden space-y-28 pb-32">
      {/* Dynamic Ambient Radiant Background Glows */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[550px] ambient-glow-cyan pointer-events-none -z-10" />
      <div className="absolute top-[650px] right-0 w-[600px] h-[600px] ambient-glow-pink pointer-events-none -z-10" />
      <div className="absolute top-[1600px] left-0 w-[600px] h-[600px] ambient-glow-purple pointer-events-none -z-10" />

      {/* Cyber Grid Pattern */}
      <div className="absolute inset-0 cyber-grid opacity-25 pointer-events-none -z-10" />

      {/* ===================== HERO SECTION ===================== */}
      <section className="relative pt-12 sm:pt-20 text-center space-y-8 max-w-5xl mx-auto px-4">
        {/* Holographic Live Status Pill */}
        <div className="inline-flex items-center gap-2.5 px-4 py-1.5 rounded-full bg-slate-900/90 border border-slate-700/80 text-xs font-mono text-cyan-400 shadow-sm backdrop-blur-md">
          <span className="flex h-2 w-2 relative">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-cyan-400"></span>
          </span>
          <span className="tracking-widest uppercase font-semibold text-[11px] text-slate-200">
            LIVE IN CAMBODIA: ABA PAYWAY & BAKONG KHQR 2.0
          </span>
          <span className="px-1.5 py-0.2 rounded bg-pink-500/20 text-pink-400 text-[10px] font-bold border border-pink-500/30">
            0% FEE ON PRO
          </span>
        </div>

        {/* Hero Headline */}
        <div className="space-y-4">
          <h1 className="text-4xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight text-white uppercase leading-[1.08] font-['Chakra_Petch']">
            LEVEL UP YOUR LIVESTREAM <br />
            <span className="animate-shimmer">
              WITH INSTANT DIRECT TIPS
            </span>
          </h1>
          <p className="text-base sm:text-lg text-slate-300 max-w-2xl mx-auto leading-relaxed font-normal pt-1">
            The next-generation live tipping engine built for Cambodian content creators. Accept instant payments via <b className="text-white font-semibold">ABA Mobile</b>, <b className="text-white font-semibold">ACLEDA</b>, and <b className="text-white font-semibold">Bakong KHQR</b> with 60 FPS OBS alerts, automated Khmer/English voice TTS, and Telegram alerts.
          </p>
        </div>

        {/* CTA Launchpad */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3.5 pt-2">
          <Button
            variant="primary"
            size="lg"
            onClick={() => onNavigate('dashboard')}
            icon={<Zap size={18} className="fill-slate-950" />}
            className="w-full sm:w-auto px-8 py-3.5 text-sm font-bold bg-cyan-400 hover:bg-cyan-300 text-slate-950 rounded-xl"
          >
            Launch Streamer Deck (Free)
          </Button>

          <Button
            variant="outline"
            size="lg"
            onClick={() => onNavigate('donate', { username: 'neonstreamer' })}
            className="w-full sm:w-auto px-6 py-3.5 text-sm font-semibold border-cyan-500/40 text-cyan-300 hover:bg-cyan-500/10 rounded-xl"
            icon={<ExternalLink size={16} />}
          >
            Preview Tip Page (/@neonstreamer)
          </Button>

          <Button
            variant="outline"
            size="lg"
            onClick={() => onNavigate('pricing')}
            className="w-full sm:w-auto px-6 py-3.5 text-sm font-semibold border-slate-800 hover:border-slate-700 bg-slate-900/60 rounded-xl text-slate-300"
          >
            Pricing Plans ($1.99/mo)
          </Button>
        </div>

        {/* Micro Trust Pills */}
        <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 pt-4 text-xs font-mono text-slate-400">
          <span className="flex items-center gap-1.5">
            <CheckCircle2 size={14} className="text-emerald-400" />
            <span>0% Platform Fee on Pro</span>
          </span>
          <span className="flex items-center gap-1.5">
            <CheckCircle2 size={14} className="text-cyan-400" />
            <span>30+ Cambodian Banks via Bakong</span>
          </span>
          <span className="flex items-center gap-1.5">
            <CheckCircle2 size={14} className="text-pink-400" />
            <span>OBS Studio & Streamlabs 60 FPS</span>
          </span>
          <span className="flex items-center gap-1.5">
            <CheckCircle2 size={14} className="text-amber-400" />
            <span>Instant Telegram Bot Dispatch</span>
          </span>
        </div>
      </section>

      {/* ===================== INTERACTIVE BROADCAST STUDIO HUD ===================== */}
      <section className="max-w-6xl mx-auto px-4">
        <div className="rounded-2xl border border-slate-800 bg-[#090D18] overflow-hidden shadow-2xl">
          {/* Top Simulated OBS Director Bar */}
          <div className="px-4 sm:px-6 py-3 bg-slate-950/80 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs font-mono">
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-red-600/90 text-white font-bold text-[10px] tracking-wider uppercase">
                <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                OBS LIVE 1080p60
              </span>
              <span className="hidden sm:inline text-slate-400">|</span>
              <span className="text-slate-300 font-semibold truncate max-w-xs sm:max-w-md">
                VALORANT CAMBODIA TOURNAMENT • TIPS TRIGGER VOICE TTS
              </span>
            </div>

            <div className="flex items-center gap-4 text-[11px] text-slate-400">
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-emerald-400" />
                <b className="text-white">6,800</b> kbps
              </span>
              <span className="flex items-center gap-1">
                <Eye size={12} className="text-cyan-400" />
                <b className="text-white">5,420</b> Viewers
              </span>
              <span className="hidden sm:inline text-slate-500">0% Drops</span>
            </div>
          </div>

          {/* Main Stage: Simulated Game Screen & Live Alert Overlay */}
          <div className="relative min-h-[380px] sm:min-h-[440px] bg-gradient-to-br from-slate-950 via-[#0B0F1E] to-[#120D24] p-6 sm:p-10 flex flex-col items-center justify-center overflow-hidden">
            {/* Cyber Grid backdrop lines */}
            <div className="absolute inset-0 cyber-grid-dense opacity-20 pointer-events-none" />

            {/* Corner Bracket Accents */}
            <div className="absolute top-4 left-4 w-6 h-6 border-t-2 border-l-2 border-cyan-400/60" />
            <div className="absolute top-4 right-4 w-6 h-6 border-t-2 border-r-2 border-cyan-400/60" />
            <div className="absolute bottom-4 left-4 w-6 h-6 border-b-2 border-l-2 border-cyan-400/60" />
            <div className="absolute bottom-4 right-4 w-6 h-6 border-b-2 border-r-2 border-cyan-400/60" />

            {/* Floating Live Broadcast HUD Badges */}
            <div className="absolute top-6 left-6 hidden sm:flex items-center gap-2 px-3 py-1 rounded-lg bg-slate-900/80 border border-slate-800 text-[11px] font-mono text-cyan-300 backdrop-blur-sm animate-float">
              <Zap size={12} className="text-cyan-400" />
              <span>ABA Pushback: 280ms</span>
            </div>

            <div className="absolute top-6 right-6 hidden sm:flex items-center gap-2 px-3 py-1 rounded-lg bg-slate-900/80 border border-slate-800 text-[11px] font-mono text-pink-300 backdrop-blur-sm animate-float-delayed">
              <Volume2 size={12} className="text-pink-400" />
              <span>Khmer & English TTS: Active</span>
            </div>

            {/* The Animated Live Alert Overlay Card */}
            <div
              className={`max-w-lg w-full rounded-2xl border-2 border-cyan-400 bg-slate-950/95 p-6 text-center space-y-4 backdrop-blur-xl transition-all duration-300 ${
                isPlayingDemo ? 'scale-105 border-pink-400' : 'hover:scale-[1.01]'
              }`}
            >
              {/* Alert Header Pill */}
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-[10px] font-mono font-bold text-cyan-300 uppercase">
                  <Flame size={12} className="text-pink-400" />
                  <span>NEW TIP RECEIVED</span>
                </span>
                <span className="px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-[10px] font-mono text-slate-400 flex items-center gap-1">
                  <Landmark size={10} className="text-cyan-400" />
                  <span>{demoBank}</span>
                </span>
              </div>

              {/* Reaction Mascot & Waveform */}
              <div className="flex flex-col sm:flex-row items-center gap-4 text-left">
                <div className="w-18 h-18 sm:w-20 sm:h-20 rounded-xl overflow-hidden border border-slate-700 p-1 bg-slate-900 flex-shrink-0">
                  <img
                    src="https://media.giphy.com/media/l41lT4n6ylgW2hh04/giphy.gif"
                    alt="Reaction"
                    className="w-full h-full object-cover rounded-lg"
                  />
                </div>

                <div className="flex-1 space-y-1 text-center sm:text-left">
                  <div className="text-xs font-mono text-cyan-400 font-semibold">
                    via {demoBank} • NBC Bakong KHQR
                  </div>
                  <h3 className="text-2xl sm:text-3xl font-extrabold text-white font-['Chakra_Petch'] uppercase flex items-center justify-center sm:justify-start gap-2">
                    <span>{demoDonor}</span>
                    <span className="text-cyan-400 font-mono">
                      {demoCurrency === 'KHR'
                        ? `${demoAmount.toLocaleString()} ៛`
                        : `$${demoAmount.toFixed(2)}`}
                    </span>
                  </h3>
                  <p className="text-xs sm:text-sm text-slate-200 italic line-clamp-2">
                    "{demoMessage}"
                  </p>
                </div>
              </div>

              {/* Equalizer Sound Wave Animation */}
              <div className="flex items-center justify-center gap-1 pt-1">
                <div className="w-1 bg-cyan-400 rounded-full eq-bar-1" />
                <div className="w-1 bg-pink-500 rounded-full eq-bar-2" />
                <div className="w-1 bg-purple-400 rounded-full eq-bar-3" />
                <div className="w-1 bg-cyan-400 rounded-full eq-bar-4" />
                <div className="w-1 bg-pink-500 rounded-full eq-bar-5" />
                <div className="w-1 bg-purple-400 rounded-full eq-bar-2" />
                <div className="w-1 bg-cyan-400 rounded-full eq-bar-1" />
              </div>
            </div>
          </div>

          {/* Interactive Trigger Control Deck */}
          <div className="p-4 sm:p-6 bg-slate-950 border-t border-slate-800 space-y-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
              <span className="text-xs font-mono uppercase tracking-wider text-slate-400 flex items-center gap-1.5 font-bold">
                <Sliders size={14} className="text-cyan-400" />
                <span>Live Interactive Alert Trigger:</span>
              </span>
              <span className="text-[11px] text-slate-400 font-mono">
                Click any preset below to trigger live audio chime & screen animation!
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              <button
                onClick={() =>
                  triggerLiveDemoAlert(
                    5,
                    'CyberNinja99',
                    'ABA Bank',
                    'Insane sniper clutch bro! Outstanding aim 🔥',
                    'USD'
                  )
                }
                className="p-3 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-cyan-400/60 text-left transition-colors flex items-center justify-between group"
              >
                <div>
                  <div className="text-xs font-bold text-white group-hover:text-cyan-300">
                    ⚡ $5.00 Sniper Tip
                  </div>
                  <div className="text-[11px] font-mono text-slate-400">CyberNinja99 • ABA Bank</div>
                </div>
                <Play size={14} className="text-cyan-400 group-hover:scale-110 transition-transform" />
              </button>

              <button
                onClick={() =>
                  triggerLiveDemoAlert(
                    50,
                    'WhaleSupporter',
                    'Bakong App',
                    'VIP donation for the stream quality upgrade! 👑💎',
                    'USD'
                  )
                }
                className="p-3 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-pink-500/60 text-left transition-colors flex items-center justify-between group"
              >
                <div>
                  <div className="text-xs font-bold text-white group-hover:text-pink-300">
                    👑 $50.00 VIP Drop
                  </div>
                  <div className="text-[11px] font-mono text-slate-400">WhaleSupporter • Bakong App</div>
                </div>
                <Play size={14} className="text-pink-400 group-hover:scale-110 transition-transform" />
              </button>

              <button
                onClick={() =>
                  triggerLiveDemoAlert(
                    40000,
                    'KompongGamer',
                    'ACLEDA Bank',
                    'Keep up the amazing stream bro! 🇰🇭✨',
                    'KHR'
                  )
                }
                className="p-3 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-emerald-400/60 text-left transition-colors flex items-center justify-between group"
              >
                <div>
                  <div className="text-xs font-bold text-white group-hover:text-emerald-300">
                    🇰🇭 40,000 ៛ Khmer Riel
                  </div>
                  <div className="text-[11px] font-mono text-slate-400">KompongGamer • ACLEDA Bank</div>
                </div>
                <Play size={14} className="text-emerald-400 group-hover:scale-110 transition-transform" />
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* ===================== VERIFIED STREAMERS SEAMLESS CARDS MARQUEE (2 SECTIONS) ===================== */}
      <section className="space-y-8 py-6 relative overflow-hidden">
        {/* Subtle Ambient Radial Glow */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[350px] bg-cyan-500/5 blur-[120px] pointer-events-none rounded-full" />

        <div className="max-w-6xl mx-auto px-4 text-center space-y-3 relative z-10">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-cyan-500/15 border border-cyan-500/30 text-cyan-300 text-xs font-mono font-bold tracking-wider uppercase shadow-[0_0_20px_rgba(0,240,255,0.12)]">
            <BadgeCheck size={15} className="text-cyan-400 fill-cyan-400/20" />
            <span>VERIFIED CREATOR NETWORK</span>
          </div>

          <h2 className="text-3xl sm:text-5xl font-extrabold text-white font-['Chakra_Petch'] uppercase tracking-tight">
            TRUSTED BY VERIFIED CAMBODIAN STREAMERS
          </h2>

          <p className="text-sm sm:text-base text-slate-400 max-w-2xl mx-auto leading-relaxed">
            Leading gaming creators, esports casters, and livestreamers accept direct tips with 0% platform cuts, instant ABA Mobile &amp; Bakong KHQR transfers, and real-time alerts.
          </p>
        </div>

        {/* 2-Section Seamless Moving Tickers */}
        <div className="relative w-full space-y-4 overflow-hidden py-3">
          {/* Left and Right Smooth Edge Fade Vignettes */}
          <div className="pointer-events-none absolute inset-y-0 left-0 w-16 sm:w-44 bg-gradient-to-r from-[#070A12] via-[#070A12]/85 to-transparent z-20" />
          <div className="pointer-events-none absolute inset-y-0 right-0 w-16 sm:w-44 bg-gradient-to-l from-[#070A12] via-[#070A12]/85 to-transparent z-20" />

          {/* Section 1: Seamless moving right-to-left */}
          <div className="overflow-hidden w-full flex">
            <div className="animate-marquee flex items-center gap-4 py-1">
              {lane1List.concat(lane1List).map((creator, idx) =>
                renderStreamerCard(creator, `lane1-${creator.username}-${idx}`)
              )}
            </div>
          </div>

          {/* Section 2: Seamless moving left-to-right (opposite direction) */}
          <div className="overflow-hidden w-full flex">
            <div className="animate-marquee-reverse flex items-center gap-4 py-1">
              {lane2List.concat(lane2List).map((creator, idx) =>
                renderStreamerCard(creator, `lane2-${creator.username}-${idx}`)
              )}
            </div>
          </div>
        </div>
      </section>

      {/* ===================== CONTINUOUS LOGO MARQUEE ===================== */}
      <section className="border-y border-slate-800/80 bg-slate-950/60 py-4 overflow-hidden relative">
        <div className="flex items-center gap-6">
          <div className="px-4 flex-shrink-0 text-xs font-mono font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
            <Landmark size={14} className="text-cyan-400" />
            <span>SUPPORTED CAMBODIAN BANKS:</span>
          </div>

          <div className="animate-marquee flex items-center gap-6 text-xs font-mono text-slate-300">
            {SUPPORTED_BANKS.concat(SUPPORTED_BANKS).map((bank, index) => (
              <span
                key={`${bank}-${index}`}
                className="px-3 py-1 rounded-lg bg-slate-900 border border-slate-800 whitespace-nowrap flex items-center gap-1.5"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
                <span>{bank}</span>
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* ===================== HOW IT WORKS PIPELINE ===================== */}
      <section className="max-w-6xl mx-auto px-4 space-y-12">
        <div className="text-center space-y-3">
          <span className="text-xs font-mono uppercase tracking-widest text-cyan-400 font-bold">
            ZERO CONFIGURATION SETUP
          </span>
          <h2 className="text-3xl sm:text-5xl font-extrabold text-white font-['Chakra_Petch'] uppercase">
            HOW STREAMBOTKH WORKS
          </h2>
          <p className="text-sm sm:text-base text-slate-400 max-w-xl mx-auto">
            From zero to broadcasting in less than 2 minutes. No complicated banking merchant setup required.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 relative">
          {/* Step 1 */}
          <div className="p-7 rounded-2xl bg-[#090D18] border border-slate-800 space-y-4 relative group hover:border-slate-700 transition-colors">
            <div className="w-12 h-12 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 font-mono font-bold text-lg">
              01
            </div>
            <h3 className="text-lg font-bold text-white font-['Chakra_Petch']">
              Add Browser Source to OBS
            </h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Copy your private 60 FPS overlay link from your Streamer Deck and paste it directly into OBS Studio or Streamlabs as a transparent Browser Source.
            </p>
            <div className="pt-2 font-mono text-[11px] text-cyan-400 flex items-center gap-1">
              <span>Token: ovl_token_****</span>
            </div>
          </div>

          {/* Step 2 */}
          <div className="p-7 rounded-2xl bg-[#090D18] border border-slate-800 space-y-4 relative group hover:border-slate-700 transition-colors">
            <div className="w-12 h-12 rounded-xl bg-pink-500/10 border border-pink-500/30 flex items-center justify-center text-pink-400 font-mono font-bold text-lg">
              02
            </div>
            <h3 className="text-lg font-bold text-white font-['Chakra_Petch']">
              Share Your Tip Page Link
            </h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Pin your custom URL (<code className="text-white">streambotkh.com/@username</code>) in your chat or bio. Viewers select their bank and enter their cheer message.
            </p>
            <div className="pt-2 font-mono text-[11px] text-pink-400 flex items-center gap-1">
              <span>streambotkh.com/@username</span>
            </div>
          </div>

          {/* Step 3 */}
          <div className="p-7 rounded-2xl bg-[#090D18] border border-slate-800 space-y-4 relative group hover:border-slate-700 transition-colors">
            <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 font-mono font-bold text-lg">
              03
            </div>
            <h3 className="text-lg font-bold text-white font-['Chakra_Petch']">
              Instant Alerts & 100% Payout
            </h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              When viewers scan the Bakong KHQR code with ABA Mobile, alerts instantly flash on your stream screen, TTS reads the message, and money deposits directly to your bank.
            </p>
            <div className="pt-2 font-mono text-[11px] text-emerald-400 flex items-center gap-1">
              <span>0% Platform Cut on Pro</span>
            </div>
          </div>
        </div>
      </section>

      {/* ===================== FEATURE BENTO GRID ===================== */}
      <section className="max-w-6xl mx-auto px-4 space-y-12">
        <div className="text-center space-y-3">
          <span className="text-xs font-mono uppercase tracking-widest text-pink-400 font-bold">
            EVERY TOOL YOU NEED TO SUCCEED
          </span>
          <h2 className="text-3xl sm:text-5xl font-extrabold text-white font-['Chakra_Petch'] uppercase">
            ENGINEERED FOR PRO STREAMERS
          </h2>
          <p className="text-sm sm:text-base text-slate-400 max-w-xl mx-auto">
            From low-latency NBC Bakong protocol integrations to intelligent Khmer TTS voice alerts.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {/* Bento Item 1: Large Card */}
          <div className="md:col-span-2 p-8 rounded-2xl bg-[#090D18] border border-slate-800 space-y-5 flex flex-col justify-between hover:border-slate-700 transition-colors">
            <div className="space-y-3">
              <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
                <QrCode size={20} />
              </div>
              <h3 className="text-2xl font-bold text-white font-['Chakra_Petch']">
                Dynamic Bakong KHQR Engine with Bank Selection
              </h3>
              <p className="text-xs sm:text-sm text-slate-400 leading-relaxed max-w-lg">
                Generates unique, one-time EMVCo compliant Bakong KHQR codes in real time with CRC16 CCITT checksums. Viewers choose their bank (ABA, ACLEDA, Wing, Canadia), and transactions are verified in milliseconds.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-slate-950 border border-slate-800/80 flex flex-wrap items-center justify-between gap-3 text-xs font-mono">
              <span className="text-slate-400">Accepted Wallets:</span>
              <div className="flex flex-wrap gap-1.5">
                {['ABA Mobile', 'Bakong App', 'ACLEDA toanChet', 'Wing Bank', 'Canadia'].map((w) => (
                  <span key={w} className="px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-cyan-300">
                    {w}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* Bento Item 2 */}
          <div className="p-8 rounded-2xl bg-[#090D18] border border-slate-800 space-y-4 hover:border-slate-700 transition-colors">
            <div className="w-10 h-10 rounded-xl bg-pink-500/10 border border-pink-500/30 flex items-center justify-center text-pink-400">
              <Tv size={20} />
            </div>
            <h3 className="text-xl font-bold text-white font-['Chakra_Petch']">
              60 FPS OBS Browser Overlay
            </h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Optimized for zero CPU load. Seamlessly embed in OBS Studio, Streamlabs, and vMix. Full audio chime synthesizer and confetti animation built in.
            </p>
          </div>

          {/* Bento Item 3 */}
          <div className="p-8 rounded-2xl bg-[#090D18] border border-slate-800 space-y-4 hover:border-slate-700 transition-colors">
            <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/30 flex items-center justify-center text-purple-400">
              <Volume2 size={20} />
            </div>
            <h3 className="text-xl font-bold text-white font-['Chakra_Petch']">
              Automated Text-To-Speech (TTS)
            </h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Reads donor cheers and gaming challenges out loud during your stream. Set your own minimum dollar or riel threshold to prevent spam.
            </p>
          </div>

          {/* Bento Item 4 */}
          <div className="p-8 rounded-2xl bg-[#090D18] border border-slate-800 space-y-4 hover:border-slate-700 transition-colors">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <Bot size={20} />
            </div>
            <h3 className="text-xl font-bold text-white font-['Chakra_Petch']">
              Telegram Instant Notification Bot
            </h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Receive direct mobile notifications on every tip with donor tag, amount, sender bank, and reference code. Never miss a contribution when away from screen.
            </p>
          </div>

          {/* Bento Item 5 */}
          <div className="p-8 rounded-2xl bg-[#090D18] border border-slate-800 space-y-4 hover:border-slate-700 transition-colors">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <CreditCard size={20} />
            </div>
            <h3 className="text-xl font-bold text-white font-['Chakra_Petch']">
              Dual USD ($) & Khmer Riel (៛)
            </h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Accept tips in both US Dollars and Khmer Riel with zero friction. Viewers choose their currency, and your dashboard reconciles your total revenue automatically.
            </p>
          </div>
        </div>
      </section>

      {/* ===================== INTERACTIVE FEE SAVINGS CALCULATOR ===================== */}
      <section className="max-w-4xl mx-auto px-4">
        <div className="p-8 sm:p-12 rounded-3xl bg-gradient-to-b from-[#0C1222] to-[#080B14] border border-slate-800 space-y-8">
          <div className="text-center space-y-2">
            <span className="text-xs font-mono uppercase tracking-widest text-emerald-400 font-bold">
              STOP LOSING 30% ON TWITCH & YOUTUBE
            </span>
            <h2 className="text-2xl sm:text-4xl font-extrabold text-white font-['Chakra_Petch'] uppercase">
              INTERACTIVE EARNINGS CALCULATOR
            </h2>
            <p className="text-xs sm:text-sm text-slate-400">
              See how much extra money you keep every month by switching to StreamBotKH Pro ($1.99/mo).
            </p>
          </div>

          {/* Interactive Slider */}
          <div className="space-y-4 max-w-lg mx-auto">
            <div className="flex items-center justify-between text-xs font-mono">
              <span className="text-slate-400">Your Monthly Donations:</span>
              <span className="text-2xl font-black text-cyan-400 font-mono">
                ${monthlyTips.toLocaleString()}
              </span>
            </div>
            <input
              type="range"
              min={100}
              max={5000}
              step={100}
              value={monthlyTips}
              onChange={(e) => setMonthlyTips(parseInt(e.target.value, 10))}
              className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-400"
            />
            <div className="flex justify-between text-[11px] font-mono text-slate-500">
              <span>$100 / mo</span>
              <span>$2,500 / mo</span>
              <span>$5,000 / mo</span>
            </div>
          </div>

          {/* Comparison Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
            <div className="p-5 rounded-2xl bg-red-950/20 border border-red-500/30 space-y-2">
              <div className="text-xs font-bold uppercase tracking-wider text-red-400 font-mono">
                Twitch Bits / YouTube SuperChats
              </div>
              <div className="text-3xl font-extrabold text-red-400 font-mono">
                -${twitchYoutubeFee.toFixed(0)} <span className="text-xs text-red-300 font-sans">lost to 30% cut</span>
              </div>
              <p className="text-[11px] text-slate-400">
                You only receive ${(monthlyTips - twitchYoutubeFee).toFixed(0)} out of your ${monthlyTips} earned.
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-emerald-950/20 border border-emerald-500/40 space-y-2">
              <div className="text-xs font-bold uppercase tracking-wider text-emerald-400 font-mono flex items-center justify-between">
                <span>StreamBotKH Pro Plan</span>
                <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-[10px]">0% FEE CUT</span>
              </div>
              <div className="text-3xl font-extrabold text-emerald-400 font-mono">
                +${savingsVsTwitch.toFixed(2)} <span className="text-xs text-emerald-300 font-sans">extra in your bank</span>
              </div>
              <p className="text-[11px] text-slate-400">
                Flat $1.99/mo subscription. You keep 100% of your tips directly in your ABA or Bakong account!
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ===================== TRANSPARENT PRICING TIERS ===================== */}
      <section className="max-w-6xl mx-auto px-4 space-y-12">
        <div className="text-center space-y-3">
          <span className="text-xs font-mono uppercase tracking-widest text-cyan-400 font-bold">
            SIMPLE, TRANSPARENT TIERS
          </span>
          <h2 className="text-3xl sm:text-5xl font-extrabold text-white font-['Chakra_Petch'] uppercase">
            CHOOSE YOUR STREAM PLAN
          </h2>
          <p className="text-sm sm:text-base text-slate-400 max-w-xl mx-auto">
            Start completely free or upgrade to Pro to keep 100% of your earnings with 0% platform fee.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Plan 1: Free Starter */}
          <div className="p-7 rounded-2xl bg-[#090D18] border border-slate-800 space-y-6 flex flex-col justify-between hover:border-slate-700 transition-colors">
            <div className="space-y-4">
              <div className="text-xs font-mono font-bold uppercase text-slate-400">
                FREE STARTER
              </div>
              <div>
                <div className="text-4xl font-extrabold text-white font-mono">$0</div>
                <div className="text-xs text-amber-400 font-mono font-bold pt-1">
                  10% Platform Fee Cut
                </div>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">
                Perfect for casual and new streamers getting started with live overlays.
              </p>
              <ul className="space-y-2.5 text-xs text-slate-300">
                <li className="flex items-center gap-2">
                  <Check size={14} className="text-cyan-400" />
                  <span>Unlimited viewer donations</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check size={14} className="text-cyan-400" />
                  <span>ABA Mobile & Bakong KHQR</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check size={14} className="text-cyan-400" />
                  <span>OBS 60 FPS transparent overlay</span>
                </li>
                <li className="flex items-center gap-2 text-slate-500">
                  <span className="w-3.5 h-0.5 bg-slate-700 rounded" />
                  <span>Text-To-Speech (TTS) Disabled</span>
                </li>
              </ul>
            </div>

            <Button
              variant="outline"
              size="md"
              onClick={() => onNavigate('dashboard')}
              className="w-full text-xs font-bold py-2.5 rounded-xl border-slate-800 hover:border-slate-700"
            >
              Get Started Free
            </Button>
          </div>

          {/* Plan 2: Pro Streamer (Highlighted) */}
          <div className="p-7 rounded-2xl bg-gradient-to-b from-[#0F1B2B] to-[#0A101D] border-2 border-cyan-400 space-y-6 flex flex-col justify-between relative shadow-xl">
            <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full bg-cyan-400 text-slate-950 font-mono font-bold text-[10px] uppercase">
              MOST POPULAR • 0% FEE
            </div>

            <div className="space-y-4">
              <div className="text-xs font-mono font-bold uppercase text-cyan-400">
                PRO STREAMER
              </div>
              <div>
                <div className="text-4xl font-extrabold text-white font-mono">
                  $1.99 <span className="text-xs text-slate-400 font-sans">/ month</span>
                </div>
                <div className="text-xs text-emerald-400 font-mono font-bold pt-1">
                  0% Platform Fee (Keep 100% of tips)
                </div>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">
                For active streamers who want to maximize their income and trigger live voice TTS.
              </p>
              <ul className="space-y-2.5 text-xs text-slate-200">
                <li className="flex items-center gap-2 text-emerald-400 font-bold">
                  <Check size={14} />
                  <span>0% platform fee (Keep 100% tips)</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check size={14} className="text-cyan-400" />
                  <span>Khmer & English Text-To-Speech</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check size={14} className="text-cyan-400" />
                  <span>Custom sound effects & GIF mascots</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check size={14} className="text-cyan-400" />
                  <span>Telegram bot instant notifications</span>
                </li>
              </ul>
            </div>

            <Button
              variant="primary"
              size="md"
              onClick={() => onNavigate('pricing')}
              className="w-full text-xs font-bold py-2.5 rounded-xl bg-cyan-400 hover:bg-cyan-300 text-slate-950"
            >
              Upgrade to Pro ($1.99/mo)
            </Button>
          </div>

          {/* Plan 3: Studio & Esports */}
          <div className="p-7 rounded-2xl bg-[#090D18] border border-slate-800 space-y-6 flex flex-col justify-between hover:border-slate-700 transition-colors">
            <div className="space-y-4">
              <div className="text-xs font-mono font-bold uppercase text-purple-400">
                STUDIO & ESPORTS
              </div>
              <div>
                <div className="text-4xl font-extrabold text-white font-mono">
                  $4.99 <span className="text-xs text-slate-400 font-sans">/ month</span>
                </div>
                <div className="text-xs text-emerald-400 font-mono font-bold pt-1">
                  0% Platform Fee (Keep 100% of tips)
                </div>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">
                For professional gaming houses, esports caster desks, and multiple broadcasters.
              </p>
              <ul className="space-y-2.5 text-xs text-slate-300">
                <li className="flex items-center gap-2 text-emerald-400 font-bold">
                  <Check size={14} />
                  <span>0% platform fee (Keep 100%)</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check size={14} className="text-purple-400" />
                  <span>All Pro streamer features included</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check size={14} className="text-purple-400" />
                  <span>Multiple caster overlay tokens</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check size={14} className="text-purple-400" />
                  <span>Priority 24/7 direct Telegram SLA</span>
                </li>
              </ul>
            </div>

            <Button
              variant="outline"
              size="md"
              onClick={() => onNavigate('pricing')}
              className="w-full text-xs font-bold py-2.5 rounded-xl border-slate-800 hover:border-slate-700"
            >
              Choose Studio ($4.99/mo)
            </Button>
          </div>
        </div>
      </section>

      {/* ===================== FREQUENTLY ASKED QUESTIONS ===================== */}
      <section className="max-w-4xl mx-auto px-4 space-y-8">
        <div className="text-center space-y-2">
          <span className="text-xs font-mono uppercase tracking-widest text-cyan-400 font-bold">
            COMMON INQUIRIES
          </span>
          <h2 className="text-2xl sm:text-4xl font-extrabold text-white font-['Chakra_Petch'] uppercase">
            FREQUENTLY ASKED QUESTIONS
          </h2>
        </div>

        <div className="space-y-3">
          {[
            {
              q: 'How do I add StreamBotKH to OBS Studio or Streamlabs?',
              a: 'In your Streamer Deck (/dashboard), copy your unique Browser Source URL. In OBS Studio, click (+) -> Browser Source, paste your URL, and set Width: 600, Height: 800. That’s it! Your alerts will display transparently over your gameplay.'
            },
            {
              q: 'How does the 0% platform fee work on the $1.99 Pro plan?',
              a: 'Unlike Twitch or YouTube which take 30% to 50% cuts from your tips, StreamBotKH Pro charges a tiny flat $1.99 per month fee. 100% of viewer donations go directly to your linked ABA Bank or Bakong account without any cut taken.'
            },
            {
              q: 'Which banks in Cambodia can viewers use to donate?',
              a: 'Viewers can scan your dynamic Bakong KHQR using ABA Mobile, ACLEDA toanChet, Wing Bank, Canadia, Sathapana, J Trust Royal, CPBank, and all 30+ member institutions of the National Bank of Cambodia Bakong network.'
            },
            {
              q: 'How does the Telegram bot work?',
              a: 'In your dashboard, click Telegram Alert Bot and click Link. Open the bot in Telegram and send your pairing code. The bot will automatically notify you on every tip with the donor name, amount, message, and sender bank name!'
            }
          ].map((item, idx) => {
            const isOpen = openFaqIndex === idx;
            return (
              <div
                key={idx}
                className="rounded-2xl border border-slate-800 bg-[#090D18] overflow-hidden transition-colors"
              >
                <button
                  onClick={() => setOpenFaqIndex(isOpen ? null : idx)}
                  className="w-full p-5 text-left flex items-center justify-between gap-4 font-semibold text-sm sm:text-base text-white hover:text-cyan-300 transition-colors"
                >
                  <span>{item.q}</span>
                  <ChevronDown
                    size={18}
                    className={`text-slate-400 transition-transform duration-200 flex-shrink-0 ${
                      isOpen ? 'rotate-180 text-cyan-400' : ''
                    }`}
                  />
                </button>
                {isOpen && (
                  <div className="px-5 pb-5 pt-1 text-xs sm:text-sm text-slate-300 leading-relaxed border-t border-slate-800/60">
                    {item.a}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* ===================== FINAL MONUMENTAL CTA ===================== */}
      <section className="max-w-5xl mx-auto px-4">
        <div className="p-8 sm:p-14 rounded-3xl bg-gradient-to-r from-[#0C1222] via-[#10172B] to-[#140D24] border border-cyan-500/30 text-center space-y-6 relative overflow-hidden shadow-2xl">
          <div className="space-y-3 max-w-2xl mx-auto">
            <h2 className="text-3xl sm:text-5xl font-black text-white font-['Chakra_Petch'] uppercase leading-tight">
              READY TO UPGRADE YOUR LIVESTREAM?
            </h2>
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
              Join top Cambodian content creators broadcasting with zero-latency tip alerts, Khmer voice synthesis, and direct bank payouts.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3.5 pt-2">
            <Button
              variant="primary"
              size="lg"
              onClick={() => onNavigate('dashboard')}
              icon={<Zap size={18} className="fill-slate-950" />}
              className="w-full sm:w-auto px-8 py-3.5 text-sm font-bold bg-cyan-400 hover:bg-cyan-300 text-slate-950 rounded-xl"
            >
              Start Free Today
            </Button>
            <Button
              variant="outline"
              size="lg"
              onClick={() => onNavigate('discord')}
              className="w-full sm:w-auto px-6 py-3.5 text-sm font-semibold border-slate-700 hover:border-slate-500 text-white rounded-xl bg-slate-900/60"
            >
              Join Discord Community
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
};
