'use client';

import React, { useState } from 'react';
import {
  Zap,
  Radio,
  Bell,
  DollarSign,
  Bot,
  ShieldCheck,
  ArrowRight,
  Sparkles,
  Volume2,
  Tv,
  QrCode,
  ChevronDown,
  Layers,
  Send,
  CreditCard,
  Crown,
  BadgeCheck,
  Heart
} from 'lucide-react';
import { Button } from '../components/common/Button';

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

const GLOW_COLORS = ['#00F0FF', '#EC4899', '#10B981', '#A855F7', '#F59E0B', '#38BDF8'];

// Helper to repeat items to ensure seamless CSS marquee loop without gaps
const repeatForMarquee = (items: VerifiedCreatorCard[], targetMin = 8): VerifiedCreatorCard[] => {
  if (items.length === 0) return [];
  let res = [...items];
  while (res.length < targetMin) {
    res = res.concat(items);
  }
  return res;
};

export const HomePage: React.FC<HomePageProps> = ({ onNavigate }) => {
  // Dynamic Verified Streamers State from Database
  const [dbVerifiedStreamers, setDbVerifiedStreamers] = useState<any[]>([]);

  React.useEffect(() => {
    fetch('/api/streamer/verified')
      .then((res) => res.json())
      .then((data) => {
        if (data.success && Array.isArray(data.streamers)) {
          setDbVerifiedStreamers(data.streamers);
        }
      })
      .catch(() => {});
  }, []);

  const allVerifiedCards = React.useMemo<VerifiedCreatorCard[]>(() => {
    return (dbVerifiedStreamers || []).map((s, idx) => ({
      name: s.displayName || s.username,
      username: s.username,
      tag: s.bio || 'Verified Streamer',
      avatar: s.avatarUrl || `https://api.dicebear.com/7.x/bottts/svg?seed=${s.username}`,
      supporters: s.totalTips > 0 ? `${s.totalTips} Tips` : 'Verified Creator',
      verified: true,
      glowColor: GLOW_COLORS[idx % GLOW_COLORS.length]
    }));
  }, [dbVerifiedStreamers]);

  const lane1List = React.useMemo(() => {
    if (allVerifiedCards.length === 0) return [];
    const source = allVerifiedCards.length > 1
      ? allVerifiedCards.filter((_, i) => i % 2 === 0)
      : allVerifiedCards;
    return repeatForMarquee(source, 6);
  }, [allVerifiedCards]);

  const lane2List = React.useMemo(() => {
    if (allVerifiedCards.length === 0) return [];
    const source = allVerifiedCards.length > 1
      ? allVerifiedCards.filter((_, i) => i % 2 === 1)
      : allVerifiedCards;
    return repeatForMarquee(source, 6);
  }, [allVerifiedCards]);

  const renderStreamerCard = (creator: VerifiedCreatorCard, key: string) => (
    <div
      key={key}
      onClick={() => onNavigate('donate', { username: creator.username })}
      className="w-[250px] xs:w-[280px] sm:w-[320px] flex-shrink-0 p-3.5 sm:p-4 rounded-2xl bg-[#0C101C]/90 hover:bg-[#121829] border border-slate-800/90 hover:border-cyan-500/50 shadow-xl transition-all duration-300 hover:scale-[1.02] cursor-pointer group flex flex-col justify-between space-y-3 sm:space-y-3.5 select-none"
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

  // Fee Calculator State
  const [monthlyTips, setMonthlyTips] = useState<number>(1000);

  // FAQ Accordion State
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(0);

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
      <section className="relative pt-8 sm:pt-20 text-center space-y-6 sm:space-y-9 max-w-5xl mx-auto px-3 sm:px-4">
        {/* Hero Headline */}
        <div className="space-y-4 sm:space-y-5">
          <h1 className="text-3xl xs:text-4xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight text-white uppercase leading-[1.08] font-['Chakra_Petch']">
            LEVEL UP YOUR LIVESTREAM <br />
            <span className="animate-shimmer text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-indigo-300 to-pink-500">
              WITH INSTANT DIRECT TIPS
            </span>
          </h1>
          <p className="text-sm sm:text-lg text-slate-300 max-w-2xl mx-auto leading-relaxed font-normal px-1">
            The next-generation live tipping engine built for Cambodian content creators. Accept instant payments via <b className="text-white font-semibold">ABA Mobile</b>, <b className="text-white font-semibold">ACLEDA</b>, and <b className="text-white font-semibold">Bakong KHQR</b> with 60 FPS OBS alerts, automated Khmer/English voice TTS, and Telegram alerts.
          </p>
        </div>

        {/* CTA Launchpad - Single Prominent Action */}
        <div className="flex items-center justify-center pt-2">
          <button
            onClick={() => onNavigate('dashboard')}
            className="group relative inline-flex items-center justify-center gap-2.5 sm:gap-3 px-7 sm:px-10 py-3.5 sm:py-4 text-sm sm:text-base font-bold text-slate-950 font-['Chakra_Petch'] uppercase tracking-wider bg-gradient-to-r from-cyan-400 via-cyan-300 to-cyan-400 hover:from-cyan-300 hover:to-cyan-200 rounded-2xl shadow-[0_0_30px_rgba(0,240,255,0.4)] hover:shadow-[0_0_50px_rgba(0,240,255,0.65)] hover:scale-[1.02] active:scale-[0.98] transition-all duration-300 cursor-pointer overflow-hidden w-full xs:w-auto"
          >
            {/* Shimmer sweep effect */}
            <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000 bg-gradient-to-r from-transparent via-white/40 to-transparent pointer-events-none" />
            <Zap size={18} className="fill-slate-950 text-slate-950 group-hover:rotate-12 transition-transform duration-300 flex-shrink-0" />
            <span className="relative z-10">Get Started</span>
            <ArrowRight size={16} className="text-slate-950 group-hover:translate-x-1 transition-transform duration-300 flex-shrink-0" />
          </button>
        </div>
      </section>

      {/* ===================== VERIFIED STREAMERS SEAMLESS CARDS MARQUEE (2 SECTIONS) ===================== */}
      {allVerifiedCards.length > 0 && (
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
      )}

      {/* ===================== HOW IT WORKS PIPELINE ===================== */}
      <section className="max-w-6xl mx-auto px-4 space-y-10 sm:space-y-12 relative">
        {/* Subtle Ambient Radial Glow */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[300px] bg-cyan-500/5 blur-[120px] pointer-events-none rounded-full" />

        <div className="text-center space-y-3 relative z-10">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-cyan-500/10 border border-cyan-500/25 text-cyan-400 text-xs font-mono font-bold tracking-widest uppercase">
            <Sparkles size={13} className="text-cyan-400" />
            <span>ZERO CONFIGURATION SETUP</span>
          </div>
          <h2 className="text-3xl sm:text-5xl font-extrabold text-white font-['Chakra_Petch'] uppercase tracking-tight">
            HOW STREAMBOTKH WORKS
          </h2>
          <p className="text-sm sm:text-base text-slate-400 max-w-xl mx-auto leading-relaxed">
            From zero to broadcasting in less than 2 minutes. No complicated banking merchant setup required.
          </p>
        </div>

        {/* 3 Steps Pipeline Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 relative z-10">
          {/* Step 1 */}
          <div className="p-7 rounded-2xl bg-[#090D18]/90 border border-slate-800/80 hover:border-cyan-500/40 backdrop-blur-sm transition-all duration-300 flex flex-col justify-between group hover:-translate-y-1 shadow-lg hover:shadow-cyan-500/10 relative overflow-hidden">
            {/* Top Accent Gradient Line */}
            <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-cyan-400/80 via-cyan-400/20 to-transparent group-hover:h-[3px] transition-all" />

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="w-12 h-12 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 font-mono font-bold text-lg group-hover:scale-105 transition-transform">
                  01
                </div>
                <div className="w-8 h-8 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-400 group-hover:text-cyan-400 transition-colors">
                  <Tv size={16} />
                </div>
              </div>

              <div className="space-y-2">
                <h3 className="text-lg font-bold text-white font-['Chakra_Petch'] group-hover:text-cyan-300 transition-colors">
                  Add Browser Source to OBS
                </h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Copy your private 60 FPS overlay link from your Streamer Deck and paste it directly into OBS Studio or Streamlabs as a transparent Browser Source.
                </p>
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-slate-800/80 flex items-center justify-between font-mono text-[11px]">
              <span className="text-slate-400 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
                <span className="text-cyan-300">ovl_token_••••••••</span>
              </span>
              <span className="px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 text-[10px] font-semibold">
                60 FPS Overlay
              </span>
            </div>
          </div>

          {/* Step 2 */}
          <div className="p-7 rounded-2xl bg-[#090D18]/90 border border-slate-800/80 hover:border-pink-500/40 backdrop-blur-sm transition-all duration-300 flex flex-col justify-between group hover:-translate-y-1 shadow-lg hover:shadow-pink-500/10 relative overflow-hidden">
            {/* Top Accent Gradient Line */}
            <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-pink-400/80 via-pink-400/20 to-transparent group-hover:h-[3px] transition-all" />

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="w-12 h-12 rounded-xl bg-pink-500/10 border border-pink-500/30 flex items-center justify-center text-pink-400 font-mono font-bold text-lg group-hover:scale-105 transition-transform">
                  02
                </div>
                <div className="w-8 h-8 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-400 group-hover:text-pink-400 transition-colors">
                  <Send size={16} />
                </div>
              </div>

              <div className="space-y-2">
                <h3 className="text-lg font-bold text-white font-['Chakra_Petch'] group-hover:text-pink-300 transition-colors">
                  Share Your Tip Page Link
                </h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Pin your custom URL (<code className="text-white font-semibold">streambotkh.com/@username</code>) in your chat or bio. Viewers select their bank and enter their cheer message.
                </p>
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-slate-800/80 flex items-center justify-between font-mono text-[11px]">
              <span className="text-slate-400 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-pink-400 animate-pulse" />
                <span className="text-pink-300">/@username</span>
              </span>
              <span className="px-2 py-0.5 rounded bg-pink-500/10 text-pink-400 border border-pink-500/20 text-[10px] font-semibold">
                Bakong KHQR
              </span>
            </div>
          </div>

          {/* Step 3 */}
          <div className="p-7 rounded-2xl bg-[#090D18]/90 border border-slate-800/80 hover:border-emerald-500/40 backdrop-blur-sm transition-all duration-300 flex flex-col justify-between group hover:-translate-y-1 shadow-lg hover:shadow-emerald-500/10 relative overflow-hidden">
            {/* Top Accent Gradient Line */}
            <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-emerald-400/80 via-emerald-400/20 to-transparent group-hover:h-[3px] transition-all" />

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 font-mono font-bold text-lg group-hover:scale-105 transition-transform">
                  03
                </div>
                <div className="w-8 h-8 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-400 group-hover:text-emerald-400 transition-colors">
                  <Zap size={16} />
                </div>
              </div>

              <div className="space-y-2">
                <h3 className="text-lg font-bold text-white font-['Chakra_Petch'] group-hover:text-emerald-300 transition-colors">
                  Instant Alerts &amp; Direct Deposit
                </h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  When viewers scan the Bakong KHQR code with ABA Mobile, alerts instantly flash on your stream screen, TTS reads the message, and money deposits directly to your bank.
                </p>
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-slate-800/80 flex items-center justify-between font-mono text-[11px]">
              <span className="text-slate-400 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-emerald-300">Direct to Bank</span>
              </span>
              <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] font-semibold">
                Live TTS &amp; Audio SFX
              </span>
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
