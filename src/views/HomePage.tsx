'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  ArrowRight,
  ChevronDown,
  BadgeCheck
} from 'lucide-react';
import { HomeFeatureShowcase } from '../components/home/HomeFeatureShowcase';
import { HomeHeroStreamCanvas } from '../components/home/HomeHeroStreamCanvas';
import { MatrixBackground } from '../components/home/MatrixBackground';

interface HomePageProps {
  onNavigate: (page: string, params?: any) => void;
}

interface VerifiedCreatorCard {
  name: string;
  username: string;
  tag: string;
  avatar: string;
  bannerUrl?: string;
  supporters?: string;
  verified: boolean;
  isLive?: boolean;
  glowColor?: string;
}

const GLOW_COLORS = ['#00F0FF', '#EC4899', '#10B981', '#A855F7', '#F59E0B', '#38BDF8'];

const HERO_SWIPE_WORDS = [
  'ALERTBOX',
  'DONATION',
  'VIDEO SHARE',
  'OVERLAY',
  'WIDGETS',
  'GOAL TRACKER',
  'LEADERBOARD',
  'GAMES',
  'MEMBERSHIP',
  'LIVE CHAT',
  'BROADCAST'
];

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
  // Animated Hero Swipe Word state (cycles through feature keywords)
  const [featureIndex, setFeatureIndex] = useState(0);
  const [prevFeatureIndex, setPrevFeatureIndex] = useState<number | null>(null);
  const [isFeatureSwiping, setIsFeatureSwiping] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => {
      setFeatureIndex((curr) => {
        setPrevFeatureIndex(curr);
        setIsFeatureSwiping(true);
        return (curr + 1) % HERO_SWIPE_WORDS.length;
      });
    }, 2400);

    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (isFeatureSwiping) {
      const timeout = setTimeout(() => {
        setIsFeatureSwiping(false);
        setPrevFeatureIndex(null);
      }, 480);
      return () => clearTimeout(timeout);
    }
  }, [isFeatureSwiping, featureIndex]);

  // Await backend completion before displaying streamer cards (prevents showing seed cards)
  const [isLoadingStreamers, setIsLoadingStreamers] = useState<boolean>(true);
  const [dbVerifiedStreamers, setDbVerifiedStreamers] = useState<any[]>([]);

  React.useEffect(() => {
    let isMounted = true;
    document.title = 'StreamWidgets - Home';
    setIsLoadingStreamers(true);

    fetch('/api/streamer/verified')
      .then((res) => res.json())
      .then((data) => {
        if (!isMounted) return;
        if (data.success && Array.isArray(data.streamers)) {
          // Strictly accept only verified streamers
          const verifiedOnly = data.streamers.filter((s: any) => s.isVerified === true);
          setDbVerifiedStreamers(verifiedOnly);
        } else {
          setDbVerifiedStreamers([]);
        }
      })
      .catch((err) => {
        console.error('[HomePage] Error loading verified streamers:', err);
        if (isMounted) setDbVerifiedStreamers([]);
      })
      .finally(() => {
        if (isMounted) {
          setIsLoadingStreamers(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const allVerifiedCards = React.useMemo<VerifiedCreatorCard[]>(() => {
    // While awaiting backend completion, do not return any cards to prevent flash of seed cards
    if (isLoadingStreamers) {
      return [];
    }

    const dbCards: VerifiedCreatorCard[] = (dbVerifiedStreamers || [])
      .filter((s: any) => s.isVerified === true)
      .map((s, idx) => ({
        name: s.displayName || s.username,
        username: s.username,
        tag: s.bio || (s.plan === 'pro' ? 'PRO Verified Streamer' : 'Verified Content Creator'),
        avatar: s.avatarUrl || `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(s.username)}`,
        bannerUrl: s.bannerUrl || '',
        supporters: s.supporters || (s.totalTips > 0 ? `${s.totalTips} ${s.totalTips === 1 ? 'Tip' : 'Tips'}` : (s.plan === 'pro' ? 'PRO Creator' : 'Verified Creator')),
        verified: true,
        isLive: Boolean(s.isLive),
        glowColor: GLOW_COLORS[idx % GLOW_COLORS.length]
      }));

    return dbCards;
  }, [dbVerifiedStreamers, isLoadingStreamers]);

  const lane1List = React.useMemo(() => {
    if (allVerifiedCards.length === 0) return [];
    const source = allVerifiedCards.length >= 6
      ? allVerifiedCards.filter((_, i) => i % 2 === 0)
      : allVerifiedCards;
    return repeatForMarquee(source, 8);
  }, [allVerifiedCards]);

  const lane2List = React.useMemo(() => {
    if (allVerifiedCards.length === 0) return [];
    const source = allVerifiedCards.length >= 6
      ? allVerifiedCards.filter((_, i) => i % 2 === 1)
      : [...allVerifiedCards].reverse();
    return repeatForMarquee(source, 8);
  }, [allVerifiedCards]);

  const renderStreamerCard = (creator: VerifiedCreatorCard, key: string) => (
    <div
      key={key}
      onClick={() => onNavigate('donate', { username: creator.username })}
      className="home-streamer-card relative w-[250px] xs:w-[280px] sm:w-[320px] flex-shrink-0 rounded-2xl overflow-hidden border border-white/[0.08] hover:border-cyan-500/50 shadow-xl transition-all duration-300 hover:scale-[1.02] cursor-pointer group select-none bg-[#0A0F1E]/90"
      style={
        creator.bannerUrl
          ? {
              backgroundImage: `url("${creator.bannerUrl}")`,
              backgroundSize: 'cover',
              backgroundPosition: 'center'
            }
          : undefined
      }
    >
      {/* Frosted Glass Overlay: darkens and softens banner for crisp contrast or defaults to solid card */}
      <div
        className={`w-full h-full p-3.5 sm:p-4 flex items-center gap-3 sm:gap-3.5 transition-colors ${
          creator.bannerUrl
            ? 'bg-slate-950/80 group-hover:bg-slate-950/70 backdrop-blur-sm'
            : 'bg-[#0A0F1E]/90 group-hover:bg-[#10172C]/95'
        }`}
      >
        {/* Left Side: Profile Logo (Avatar) */}
        <div className="relative flex-shrink-0">
          <div className="w-12 h-12 rounded-xl p-0.5 bg-gradient-to-tr from-cyan-500 via-indigo-500 to-pink-500 shadow-md">
            <img
              src={creator.avatar}
              alt={creator.name}
              className="w-full h-full rounded-[10px] bg-slate-900 object-cover"
            />
          </div>
          <div className="absolute -bottom-1 -right-1 p-0.5 rounded-full bg-slate-950 shadow-sm">
            <BadgeCheck size={14} className="text-cyan-400 fill-cyan-400/20" />
          </div>
        </div>

        {/* Right Side: Creator Identity Info */}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5 min-w-0">
            <h4 className="text-sm font-bold text-white font-['Chakra_Petch'] truncate group-hover:text-cyan-300 transition-colors">
              {creator.name}
            </h4>
            <BadgeCheck size={13} className="text-cyan-400 fill-cyan-400/20 flex-shrink-0" />
            {creator.isLive && (
              <span className="px-1.5 py-0.2 rounded-full bg-rose-500/20 border border-rose-500/50 text-[9px] font-mono text-rose-400 font-bold uppercase tracking-wider flex items-center gap-1 flex-shrink-0 ml-auto">
                <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-ping" />
                LIVE
              </span>
            )}
          </div>
          <p className="text-[11px] font-mono text-cyan-400 truncate">@{creator.username}</p>
          <p className="text-[11px] text-slate-300/80 truncate mt-0.5">{creator.tag}</p>
        </div>
      </div>
    </div>
  );

  // FAQ Accordion State
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(0);

  // Scroll reveal observer for Final Monumental CTA
  const [isCtaVisible, setIsCtaVisible] = useState(false);
  const ctaSectionRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsCtaVisible(true);
        }
      },
      {
        threshold: 0.15,
        rootMargin: '0px 0px -40px 0px'
      }
    );

    const el = ctaSectionRef.current;
    if (el) observer.observe(el);

    return () => {
      if (el) observer.unobserve(el);
    };
  }, []);

  // Landing page is strictly dark & radiant mode (no day/night mode)
  useEffect(() => {
    document.documentElement.classList.remove('light-mode');
  }, []);

  return (
    <div className="relative overflow-hidden -mt-16 sm:-mt-20 pt-16 sm:pt-20 pb-32 hero-radiant-page-flow text-slate-100">
      {/* Exact Cyber Grid from Main Card spanning entire page */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.025)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.025)_1px,transparent_1px)] bg-[size:18px_18px] pointer-events-none opacity-80 z-0" />

      {/* Ambient Soft Glow from Main Card */}
      <div className="absolute top-20 left-1/2 -translate-x-1/2 w-[900px] h-[600px] bg-white/[0.04] rounded-full blur-[140px] pointer-events-none z-0" />

      {/* Dynamic Animated Radiant Glow Beams across Entire Page */}
      <div className="absolute top-10 left-1/4 w-[750px] h-[700px] bg-gradient-to-br from-cyan-500/20 via-blue-600/15 to-transparent rounded-full blur-[150px] pointer-events-none animate-radiant-pulse z-0" />
      <div className="absolute top-[650px] right-10 w-[800px] h-[750px] bg-gradient-to-bl from-purple-600/20 via-indigo-600/15 to-transparent rounded-full blur-[160px] pointer-events-none animate-radiant-pulse [animation-delay:4s] z-0" />
      <div className="absolute top-[1600px] left-8 w-[850px] h-[750px] bg-gradient-to-br from-cyan-500/15 via-indigo-600/12 to-transparent rounded-full blur-[160px] pointer-events-none animate-radiant-pulse [animation-delay:2s] z-0" />
      <div className="absolute top-[2800px] right-12 w-[800px] h-[800px] bg-gradient-to-bl from-purple-600/15 via-pink-600/10 to-transparent rounded-full blur-[160px] pointer-events-none animate-radiant-pulse [animation-delay:5s] z-0" />
      <div className="absolute bottom-24 left-1/3 w-[850px] h-[650px] bg-gradient-to-t from-indigo-600/20 via-cyan-500/15 to-transparent rounded-full blur-[150px] pointer-events-none animate-radiant-pulse [animation-delay:3s] z-0" />

      {/* Animated Matrix Digital Rain Canvas Background */}
      <MatrixBackground opacity={0.25} />

      {/* OBS Alertbox Studio Dot-Matrix Canvas Layer */}
      <div className="absolute inset-0 obs-studio-dot-grid pointer-events-none opacity-40 z-0" />

      {/* ===================== HERO SECTION ===================== */}
      {/* Unified 2-column grid: Left Content + Right Interactive Stream Canvas (No Fullscreen Trapping) */}
      <section className="relative max-w-[1720px] 2xl:max-w-[1840px] mx-auto px-4 xs:px-6 sm:px-10 lg:px-12 xl:px-16 2xl:px-20 z-10 py-8 sm:py-12 lg:py-14 xl:py-16">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 sm:gap-10 lg:gap-12 xl:gap-16 items-center">
            {/* Left Column: Hero Headline, Swiping Keyword, Description, CTA Buttons */}
            <div className="w-full lg:col-span-5 xl:col-span-5 text-center lg:text-left space-y-6 sm:space-y-8 flex flex-col items-center lg:items-start">
              {/* Hero Headline */}
              <div className="space-y-4 sm:space-y-5">
                <h1 className="text-2xl xs:text-[1.85rem] sm:text-4xl md:text-5xl lg:text-5xl xl:text-6xl font-extrabold tracking-tight text-white uppercase leading-[1.08] font-['Chakra_Petch']">
                  <span className="block">LEVEL UP YOUR LIVESTREAM</span>
                  <span className="inline-flex items-center justify-center lg:justify-start flex-nowrap whitespace-nowrap gap-x-2 sm:gap-x-3.5 max-w-full">
                    <span className="shrink-0">WITH</span>
                    <span className="relative inline-flex items-center overflow-hidden h-[1.18em] align-top transition-[width] duration-300 ease-out whitespace-nowrap shrink-0">
                      {/* Invisible sizer to naturally reserve exact width */}
                      <span className="invisible select-none pointer-events-none whitespace-nowrap px-0.5">
                        {HERO_SWIPE_WORDS[featureIndex]}
                      </span>

                      {/* Previous exiting word during swipe */}
                      {isFeatureSwiping && prevFeatureIndex !== null && (
                        <span
                          key={`prev-${prevFeatureIndex}`}
                          className="absolute inset-0 flex items-center justify-center lg:justify-start whitespace-nowrap px-0.5 animate-hero-swipe-out pointer-events-none"
                        >
                          <span className="hero-swipe-blue font-extrabold text-[#00F0FF] whitespace-nowrap">
                            {HERO_SWIPE_WORDS[prevFeatureIndex]}
                          </span>
                        </span>
                      )}

                      {/* Current entering word */}
                      <span
                        key={`curr-${featureIndex}`}
                        className={`absolute inset-0 flex items-center justify-center lg:justify-start whitespace-nowrap px-0.5 ${
                          isFeatureSwiping ? 'animate-hero-swipe-in' : ''
                        }`}
                      >
                        <span className="hero-swipe-blue font-extrabold text-[#00F0FF] whitespace-nowrap">
                          {HERO_SWIPE_WORDS[featureIndex]}
                        </span>
                      </span>
                    </span>
                  </span>
                </h1>
                <p className="text-xs sm:text-sm md:text-base lg:text-base xl:text-lg text-slate-300 leading-relaxed font-normal max-w-2xl mx-auto lg:mx-0 text-justify [text-align-last:center] lg:[text-align-last:left]">
                  The next-generation live tipping engine built for Cambodian content creators. Accept instant payments via <b className="text-white font-semibold">ABA Mobile</b>, <b className="text-white font-semibold">ACLEDA</b>, and <b className="text-white font-semibold">Bakong KHQR</b> with 60 FPS OBS alerts, automated Khmer/English voice TTS, and Telegram alerts.
                </p>
              </div>

              {/* CTA Buttons: 1st "Get Started", 2nd "Explore Features ->" */}
              <div className="flex flex-wrap items-center justify-center lg:justify-start gap-4 sm:gap-6 pt-1">
                {/* 1st Button: Get Started (Solid Blue, No Gradient, No Lightning Icon) */}
                <button
                  onClick={() => onNavigate('dashboard')}
                  className="home-hero-cta group inline-flex items-center justify-center px-8 sm:px-10 py-3.5 sm:py-4 text-sm sm:text-base font-bold text-white font-['Chakra_Petch'] uppercase tracking-wider bg-[#0284C7] hover:bg-[#0369A1] rounded-2xl shadow-[0_0_25px_rgba(2,132,199,0.45)] hover:shadow-[0_0_35px_rgba(2,132,199,0.65)] hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 cursor-pointer flex-shrink-0"
                >
                  <span>Get Started</span>
                </button>

                {/* 2nd Button: Explore Features -> */}
                <button
                  onClick={() => {
                    const target = document.getElementById('features');
                    if (target) {
                      target.scrollIntoView({ behavior: 'smooth' });
                    }
                  }}
                  className="home-hero-explore group inline-flex items-center gap-2 px-2 py-3 text-sm sm:text-base font-bold font-['Chakra_Petch'] uppercase tracking-wider text-slate-300 hover:text-white transition-colors cursor-pointer select-none bg-transparent border-0"
                >
                  <span>Explore Features</span>
                  <ArrowRight size={17} className="transition-transform duration-200 group-hover:translate-x-1.5 text-cyan-400 flex-shrink-0" />
                </button>
              </div>
            </div>

            {/* Right Column: Connected Cards to Central Live Stream Screen (Fully responsive) */}
            <div className="w-full lg:col-span-7 xl:col-span-7 relative flex items-center justify-center lg:justify-end pt-4 lg:pt-0 min-w-0">
              <HomeHeroStreamCanvas />
            </div>
          </div>
        </section>

        {/* ===================== SEAMLESS STREAMERS SECTION (DESKTOP & MOBILE) ===================== */}
        {(isLoadingStreamers || allVerifiedCards.length > 0) && (
          <section
            id="streamers"
            className="relative z-10 space-y-8 pt-8 lg:pt-4 pb-12 sm:pb-16 scroll-mt-20"
          >
            {/* Title Area: TRUSTED BY VERIFIED CAMBODIAN STREAMERS */}
            <div className="max-w-[1720px] 2xl:max-w-[1840px] mx-auto px-6 sm:px-10 lg:px-12 xl:px-16 2xl:px-20 text-center space-y-3 relative z-10">
              <h2 className="text-3xl sm:text-5xl font-extrabold text-white font-['Chakra_Petch'] uppercase tracking-tight">
                TRUSTED BY VERIFIED CAMBODIAN STREAMERS
              </h2>

              <p className="text-xs sm:text-sm md:text-base text-slate-400 max-w-3xl mx-auto leading-relaxed text-justify [text-align-last:center]">
                Leading gaming creators, esports casters, and livestreamers accept direct tips with 0% platform cuts, instant ABA Mobile &amp; Bakong KHQR transfers, and real-time alerts.
              </p>
            </div>

            {/* Loading Skeleton State while awaiting backend data */}
            {isLoadingStreamers ? (
              <div
                className="relative w-full space-y-4 overflow-hidden py-3"
                style={{
                  maskImage: 'linear-gradient(to right, transparent, black 6%, black 94%, transparent)',
                  WebkitMaskImage: 'linear-gradient(to right, transparent, black 6%, black 94%, transparent)'
                }}
              >
                {/* Skeleton Row 1 */}
                <div className="overflow-hidden w-full flex">
                  <div className="flex items-center gap-4 py-1 animate-pulse">
                    {Array.from({ length: 6 }).map((_, idx) => (
                      <div
                        key={`skeleton-lane1-${idx}`}
                        className="w-[250px] xs:w-[280px] sm:w-[320px] flex-shrink-0 p-3.5 sm:p-4 rounded-2xl bg-[#0A0F1E]/80 border border-white/[0.06] shadow-xl flex flex-col justify-between space-y-3 sm:space-y-3.5 select-none"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-12 h-12 rounded-xl bg-slate-800/80 flex-shrink-0" />
                          <div className="min-w-0 flex-1 space-y-2">
                            <div className="h-4 w-3/4 rounded bg-slate-800" />
                            <div className="h-3 w-1/2 rounded bg-slate-800/60" />
                            <div className="h-3 w-4/5 rounded bg-slate-800/40" />
                          </div>
                        </div>
                        <div className="pt-2.5 border-t border-white/[0.06] flex items-center justify-between">
                          <div className="h-3 w-20 rounded bg-slate-800/60" />
                          <div className="h-3 w-14 rounded bg-slate-800/60" />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Skeleton Row 2 */}
                <div className="overflow-hidden w-full flex">
                  <div className="flex items-center gap-4 py-1 animate-pulse">
                    {Array.from({ length: 6 }).map((_, idx) => (
                      <div
                        key={`skeleton-lane2-${idx}`}
                        className="w-[250px] xs:w-[280px] sm:w-[320px] flex-shrink-0 p-3.5 sm:p-4 rounded-2xl bg-[#0A0F1E]/80 border border-white/[0.06] shadow-xl flex flex-col justify-between space-y-3 sm:space-y-3.5 select-none"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-12 h-12 rounded-xl bg-slate-800/80 flex-shrink-0" />
                          <div className="min-w-0 flex-1 space-y-2">
                            <div className="h-4 w-3/4 rounded bg-slate-800" />
                            <div className="h-3 w-1/2 rounded bg-slate-800/60" />
                            <div className="h-3 w-4/5 rounded bg-slate-800/40" />
                          </div>
                        </div>
                        <div className="pt-2.5 border-t border-white/[0.06] flex items-center justify-between">
                          <div className="h-3 w-20 rounded bg-slate-800/60" />
                          <div className="h-3 w-14 rounded bg-slate-800/60" />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              /* 2-Section Seamless Moving Tickers with Verified Streamers */
              <div
                className="relative w-full space-y-4 overflow-hidden py-3 animate-fade-in"
                style={{
                  maskImage: 'linear-gradient(to right, transparent, black 6%, black 94%, transparent)',
                  WebkitMaskImage: 'linear-gradient(to right, transparent, black 6%, black 94%, transparent)'
                }}
              >
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
            )}
          </section>
        )}

      {/* Subsequent Landing Page Sections Container */}
      <div className="w-full max-w-full min-w-0 space-y-28 sm:space-y-36 pt-16 sm:pt-24 relative z-10 overflow-hidden">

      {/* ===================== STAGE 4: FOURTH SCROLL (INTERACTIVE 60 FPS OVERLAY SHOWCASE) ===================== */}
      <div id="features" className="w-full max-w-full min-w-0 scroll-mt-24 flex flex-col justify-center overflow-hidden">
        <HomeFeatureShowcase />
      </div>

      {/* ===================== FREQUENTLY ASKED QUESTIONS (NO ELEMENT OUTLINES) ===================== */}
      <section className="max-w-5xl xl:max-w-6xl mx-auto px-6 sm:px-10 space-y-8">
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
              q: 'How do I add StreamWidgets to OBS Studio or Streamlabs?',
              a: 'In your Creator Panel (/creator), copy your unique Browser Source URL. In OBS Studio, click (+) -> Browser Source, paste your URL, and set Width: 600, Height: 800. That’s it! Your alerts will display transparently over your gameplay.'
            },
            {
              q: 'How does the 0% platform fee work on the $4.99 Pro plan?',
              a: 'Unlike Twitch or YouTube which take 30% to 50% cuts from your tips, StreamWidgets charges zero platform cuts on donor tips. 100% of viewer donations go directly to your linked ABA Bank or Bakong account without any cut taken.'
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
                className="home-faq-item rounded-2xl border-0 bg-[#0A0F1E]/80 shadow-xl backdrop-blur-xl overflow-hidden transition-all"
              >
                <button
                  onClick={() => setOpenFaqIndex(isOpen ? null : idx)}
                  className="home-faq-trigger w-full p-5 text-left flex items-center justify-between gap-4 font-semibold text-sm sm:text-base text-white hover:text-cyan-300 transition-colors cursor-pointer"
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
                  <div className="home-faq-content px-5 pb-5 pt-1 text-xs sm:text-sm md:text-base text-slate-300 leading-relaxed border-t border-white/[0.04] text-justify [text-align-last:left]">
                    {item.a}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* ===================== FINAL MONUMENTAL CTA (FULL SCREEN WIDTH FIT) ===================== */}
      <section className="w-full max-w-[1720px] 2xl:max-w-[1840px] mx-auto px-4 sm:px-6 lg:px-10 xl:px-12 2xl:px-16">
        <div
          ref={ctaSectionRef}
          className="home-monumental-cta w-full p-8 sm:p-12 lg:p-16 xl:p-20 2xl:p-24 rounded-3xl sm:rounded-[40px] bg-gradient-to-r from-[#0C1428]/95 via-[#101732]/95 to-[#160E2A]/95 border-0 relative overflow-hidden shadow-none backdrop-blur-2xl"
        >
          {/* Subtle Ambient Radial Glows behind the sticker & content spanning the full width */}
          <div className="absolute top-1/2 right-10 -translate-y-1/2 w-[600px] h-[600px] bg-cyan-500/15 rounded-full blur-[140px] pointer-events-none -z-10" />
          <div className="absolute -bottom-20 right-1/4 w-[520px] h-[520px] bg-purple-500/15 rounded-full blur-[130px] pointer-events-none -z-10" />
          <div className="absolute top-0 left-10 w-[500px] h-[500px] bg-blue-600/12 rounded-full blur-[120px] pointer-events-none -z-10" />

          {/* Grid Layout: Left Content (Col 1-7) + Right Sticker (Col 8-12) */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 xl:gap-16 items-center relative z-10">
            {/* Left Content Column */}
            <div
              className={`lg:col-span-7 text-center lg:text-left space-y-6 transition-all duration-700 ease-out ${
                isCtaVisible
                  ? 'opacity-100 translate-x-0 filter-none'
                  : 'opacity-0 -translate-x-10 blur-[2px]'
              }`}
            >
              <div className="space-y-3.5">
                <h2 className="text-3xl sm:text-4xl md:text-5xl lg:text-5xl xl:text-6xl 2xl:text-7xl font-black text-white font-['Chakra_Petch'] uppercase leading-[1.08] tracking-tight">
                  READY TO UPGRADE <br />
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-blue-400 to-indigo-300">
                    YOUR LIVESTREAM?
                  </span>
                </h2>
                <p className="text-xs sm:text-sm md:text-base lg:text-lg xl:text-xl text-slate-300 leading-relaxed font-normal max-w-2xl xl:max-w-3xl text-justify [text-align-last:center] lg:[text-align-last:left]">
                  Join top Cambodian content creators broadcasting with zero-latency tip alerts, Khmer voice synthesis, and direct bank payouts straight to your ABA or Bakong account.
                </p>
              </div>

              {/* Action Button: Discord Community */}
              <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4 pt-2">
                <button
                  onClick={() => onNavigate('discord')}
                  className="home-cta-secondary-btn w-full sm:w-auto inline-flex items-center justify-center gap-2.5 px-8 sm:px-10 py-4 text-sm sm:text-base xl:text-lg font-bold font-['Chakra_Petch'] uppercase tracking-wider text-white rounded-2xl bg-[#5865F2] hover:bg-[#4752C4] shadow-[0_0_25px_rgba(88,101,242,0.4)] hover:shadow-[0_0_35px_rgba(88,101,242,0.6)] hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 cursor-pointer flex-shrink-0"
                >
                  <svg className="w-5 h-5 flex-shrink-0 fill-current" viewBox="0 0 24 24">
                    <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994.021-.041.001-.09-.041-.106a13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.929 1.793 8.18 1.793 12.061 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.894.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.028zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z" />
                  </svg>
                  <span>Join Discord Community</span>
                </button>
              </div>
            </div>

            {/* Right Sticker Column: StreamBot Mascot Thumbs-Up (Static, No Animation) */}
            <div className="lg:col-span-5 flex items-center justify-center lg:justify-end relative">
              <div className="relative select-none w-full max-w-[320px] xs:max-w-[380px] sm:max-w-[440px] lg:max-w-[500px] xl:max-w-[560px] 2xl:max-w-[620px]">
                <img
                  src="/images/streambot-thumbsup-sticker.png"
                  alt="StreamBot Thumbs Up Mascot"
                  className="w-full h-auto object-contain drop-shadow-[0_20px_50px_rgba(0,240,255,0.4)] pointer-events-none"
                />
              </div>
            </div>
          </div>
        </div>
      </section>
      </div>
    </div>
  );
};
