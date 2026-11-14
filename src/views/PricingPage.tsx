'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  Check,
  Minus,
  ArrowRight,
  ChevronDown,
  MessageSquare,
  ExternalLink
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { request } from '../services/api';
import { PromotionConfig } from '../components/dashboard/AdminPromotionManager';
import { useAuth } from '../context/AuthContext';
import { MatrixBackground } from '../components/home/MatrixBackground';

interface PricingPageProps {
  onNavigate: (page: string) => void;
}

interface TrialSettings {
  isEnabled: boolean;
  durationDays: number;
  userEligible?: boolean;
  hasUsedTrial?: boolean;
  trialActive?: boolean;
  trialEndDate?: string | null;
  remainingDays?: number;
}

type FaqCategory = 'all' | 'plans' | 'payments' | 'widgets';

interface FaqItem {
  q: string;
  a: string;
  category: Exclude<FaqCategory, 'all'>;
  tag: string;
}

interface ComparisonRow {
  label: string;
  free: string | boolean;
  pro: string | boolean;
  ultra: string | boolean;
  highlightPro?: boolean;
  highlightUltra?: boolean;
}

interface ComparisonGroup {
  group: string;
  rows: ComparisonRow[];
}

export const PricingPage: React.FC<PricingPageProps> = ({ onNavigate }) => {
  const { user, loading: authLoading, refreshUser, loginWithGoogleRedirect } = useAuth();
  const [currency, setCurrency] = useState<'USD' | 'KHR'>('USD');
  const [annualBilling, setAnnualBilling] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(0);
  const [faqCategory, setFaqCategory] = useState<FaqCategory>('all');
  const [promo, setPromo] = useState<PromotionConfig | null>(null);
  const [trialSettings, setTrialSettings] = useState<TrialSettings | null>(null);
  const [dataLoading, setDataLoading] = useState(true);
  const [claimingTrial, setClaimingTrial] = useState(false);
  const [trialSuccessMsg, setTrialSuccessMsg] = useState<string | null>(null);
  const [claimError, setClaimError] = useState<string | null>(null);

  useEffect(() => {
    document.documentElement.classList.remove('light-mode');
    document.title = 'StreamWidgets - Pricing';
  }, []);

  useEffect(() => {
    let isMounted = true;
    setDataLoading(true);

    Promise.allSettled([
      request<PromotionConfig>('/promotions'),
      request<TrialSettings>('/trial/settings')
    ])
      .then(([promoRes, trialRes]) => {
        if (!isMounted) return;
        if (promoRes.status === 'fulfilled' && promoRes.value) {
          setPromo(promoRes.value);
        }
        if (trialRes.status === 'fulfilled' && trialRes.value) {
          setTrialSettings(trialRes.value);
        }
      })
      .finally(() => {
        if (isMounted) setDataLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [user]);

  // Auto-claim trial if user signed in via redirect specifically for trial
  useEffect(() => {
    if (typeof window !== 'undefined' && user) {
      const pendingClaim = sessionStorage.getItem('auto_claim_trial');
      if (pendingClaim === 'true') {
        sessionStorage.removeItem('auto_claim_trial');
        handleClaimTrial();
      }
    }
  }, [user]);

  const handleClaimTrial = async () => {
    if (!user) {
      if (typeof window !== 'undefined') {
        sessionStorage.setItem('auto_claim_trial', 'true');
      }
      loginWithGoogleRedirect();
      return;
    }

    setClaimingTrial(true);
    setClaimError(null);
    try {
      const res = await request<{ success: boolean; message: string; trialRemainingDays?: number }>('/trial/claim', {
        method: 'POST'
      });
      if (res?.success) {
        if (typeof window !== 'undefined') {
          confetti({
            particleCount: 100,
            spread: 70,
            origin: { y: 0.6 }
          });
        }
        await refreshUser();
        setTrialSuccessMsg('Free Pro Trial is active on your account. Redirecting to dashboard...');
        setTimeout(() => {
          onNavigate('dashboard');
        }, 1200);
      }
    } catch (err: any) {
      console.error('Failed to claim trial:', err);
      setClaimError(err?.message || 'Failed to claim trial. Please try again.');
    } finally {
      setClaimingTrial(false);
    }
  };

  const isWaitingForData = authLoading || dataLoading;
  const isUltraUser = Boolean(user && user.plan === 'ultra');
  const isProUser = Boolean(user && (user.plan === 'pro' || user.plan === 'starter' || user.plan === 'studio') && !isUltraUser);
  const hasUsedTrialAlready = Boolean(user && user.hasUsedTrial && !user.isAdmin);
  const isTrialEnabled = Boolean(trialSettings?.isEnabled);
  const showFreeTrial = isTrialEnabled && !isProUser && !isUltraUser && !hasUsedTrialAlready;
  const annualDiscountPct = Math.max(0, Math.min(100, Number(promo?.annualDiscountPercent ?? 10)));

  const getProPrice = () => {
    const isPromoActive = Boolean(promo?.isActive);
    const annualMultiplier = (100 - annualDiscountPct) / 100;
    if (currency === 'KHR') {
      const baseKhr = isPromoActive ? promo!.promoPriceKhr : promo?.originalPriceKhr ?? 20000;
      const finalKhr = annualBilling ? Math.round(baseKhr * annualMultiplier) : baseKhr;
      return `${finalKhr.toLocaleString()} ៛`;
    }
    const baseUsd = isPromoActive ? promo!.promoPriceUsd : promo?.originalPriceUsd ?? 4.99;
    const finalUsd = annualBilling ? Number((baseUsd * annualMultiplier).toFixed(2)) : baseUsd;
    return `$${finalUsd.toFixed(2)}`;
  };

  const getOriginalProPrice = () => {
    if (currency === 'KHR') {
      const origKhr = promo?.originalPriceKhr ?? 20000;
      return `${origKhr.toLocaleString()} ៛`;
    }
    const origUsd = promo?.originalPriceUsd ?? 4.99;
    return `$${origUsd.toFixed(2)}`;
  };

  const getUltraPrice = () => {
    const annualMultiplier = (100 - annualDiscountPct) / 100;
    if (currency === 'KHR') {
      const baseKhr = 60000;
      const finalKhr = annualBilling ? Math.round(baseKhr * annualMultiplier) : baseKhr;
      return `${finalKhr.toLocaleString()} ៛`;
    }
    const baseUsd = 14.99;
    const finalUsd = annualBilling ? Number((baseUsd * annualMultiplier).toFixed(2)) : baseUsd;
    return `$${finalUsd.toFixed(2)}`;
  };

  const getOriginalUltraPrice = () => {
    return currency === 'KHR' ? '60,000 ៛' : '$14.99';
  };

  const faqs: FaqItem[] = useMemo(
    () => [
      {
        category: 'plans',
        tag: 'Plans & Quotas',
        q: 'What is the difference between Free, Pro, and Ultra?',
        a: 'Every plan unlocks all OBS widgets and 0% commission bank payouts. Free includes 2,000 daily tokens and 5MB storage with StreamWidgets branding. Pro ($4.99/mo) expands daily tokens to 20,000, increases storage to 20MB, and removes the watermark. Ultra ($14.99/mo) removes the daily token cap completely, provides a 100MB vault, and adds 24/7 dedicated Telegram VIP support.'
      },
      {
        category: 'payments',
        tag: 'KHQR & Payouts',
        q: 'Do you take any cut from viewer donations on Free or Pro?',
        a: 'No. StreamWidgets charges 0% platform commission across all plans. Tips go straight to your linked ABA Bank or National Bank of Cambodia Bakong KHQR account.'
      },
      {
        category: 'widgets',
        tag: 'OBS & Widgets',
        q: 'Are any OBS widgets locked behind paid tiers?',
        a: 'No widgets are locked. Alert Box, Goal Bars, Subathon Timer, Soundboard, Video Share, Donor Leaderboard, and Spinning Wheels are available on Free, Pro, and Ultra. Upgrading strictly increases your daily token allowance, cloud media storage, and removes overlays branding.'
      },
      {
        category: 'payments',
        tag: 'Cambodian Banks',
        q: 'Which banks can my viewers scan Bakong KHQR with?',
        a: 'Viewers can pay from 40+ Bakong network apps in Cambodia including ABA Mobile, ACLEDA ToanChet, Wing Bank, Canadia Bank, Sathapana, CPBank, Chip Mong Bank, and others.'
      },
      {
        category: 'widgets',
        tag: 'Streaming Software',
        q: 'Can I use these overlays on TikTok, YouTube, Facebook, or Twitch?',
        a: 'Yes. Your overlay runs inside an OBS Studio or Streamlabs Browser Source independent of where you broadcast, so alerts work identically across any livestreaming platform.'
      },
      {
        category: 'plans',
        tag: 'Billing',
        q: 'Can I switch plans or cancel at any time?',
        a: 'Yes. You can upgrade to Pro or Ultra, or return to the Free tier anytime without lock-in contracts. Your existing overlay settings and donation page configuration stay intact.'
      }
    ],
    []
  );

  const visibleFaqs = useMemo(() => {
    if (faqCategory === 'all') return faqs;
    return faqs.filter((item) => item.category === faqCategory);
  }, [faqs, faqCategory]);

  const comparisonGroups: ComparisonGroup[] = useMemo(
    () => [
      {
        group: 'Quotas & Branding',
        rows: [
          {
            label: 'Daily Token Allowance (Reset 2:00 PM SGT)',
            free: '2,000 / day',
            pro: '20,000 / day',
            ultra: 'Unlimited',
            highlightPro: true,
            highlightUltra: true
          },
          {
            label: 'Cloud Media Vault (Images, GIFs, Audio, Video)',
            free: '5 MB',
            pro: '20 MB',
            ultra: '100 MB',
            highlightPro: true,
            highlightUltra: true
          },
          {
            label: 'Watermark-Free Donation Page & Overlays',
            free: false,
            pro: true,
            ultra: true
          }
        ]
      },
      {
        group: 'Payments & Automation',
        rows: [
          {
            label: 'Bakong KHQR & ABA PayWay Gateway (0% Platform Fee)',
            free: true,
            pro: true,
            ultra: true
          },
          {
            label: 'Telegram Bot & Instant Payout Notifications',
            free: true,
            pro: true,
            ultra: true
          },
          {
            label: 'Khmer & English AI Voice Reader (TTS)',
            free: true,
            pro: true,
            ultra: true
          }
        ]
      },
      {
        group: 'OBS Studio Widgets',
        rows: [
          {
            label: '60 FPS Alertbox & Custom Overlay Studio',
            free: true,
            pro: true,
            ultra: true
          },
          {
            label: 'Donor Leaderboard (20 Built-in Themes)',
            free: true,
            pro: true,
            ultra: true
          },
          {
            label: 'Goal Progress Bar & Subathon Timer',
            free: true,
            pro: true,
            ultra: true
          },
          {
            label: 'YouTube Video Share, Soundboard & Spin Wheel',
            free: true,
            pro: true,
            ultra: true
          }
        ]
      }
    ],
    []
  );

  const renderCellValue = (val: string | boolean, emphasized?: boolean, accent: 'default' | 'pro' | 'ultra' = 'default') => {
    if (typeof val === 'boolean') {
      return val ? (
        <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-emerald-500/10 text-emerald-400">
          <Check size={14} strokeWidth={2.5} />
        </span>
      ) : (
        <span className="inline-flex items-center justify-center w-6 h-6 text-slate-600">
          <Minus size={14} />
        </span>
      );
    }

    if (emphasized) {
      return (
        <span
          className={`font-mono text-xs font-bold ${
            accent === 'ultra' ? 'text-cyan-300' : accent === 'pro' ? 'text-sky-300' : 'text-white'
          }`}
        >
          {val}
        </span>
      );
    }

    return <span className="text-xs text-slate-300 font-medium">{val}</span>;
  };

  return (
    <div className="relative overflow-hidden -mt-16 sm:-mt-20 pt-24 sm:pt-32 pb-28 hero-radiant-page-flow text-slate-100">
      {/* Match HomePage Exact Site Background Stack */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.025)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.025)_1px,transparent_1px)] bg-[size:18px_18px] pointer-events-none opacity-80 z-0" />
      <div className="absolute top-16 left-1/2 -translate-x-1/2 w-[900px] h-[560px] bg-white/[0.04] rounded-full blur-[140px] pointer-events-none z-0" />
      <div className="absolute top-10 left-1/4 w-[700px] h-[650px] bg-gradient-to-br from-cyan-500/20 via-blue-600/15 to-transparent rounded-full blur-[150px] pointer-events-none animate-radiant-pulse z-0" />
      <div className="absolute top-[750px] right-10 w-[760px] h-[700px] bg-gradient-to-bl from-purple-600/20 via-indigo-600/15 to-transparent rounded-full blur-[160px] pointer-events-none animate-radiant-pulse [animation-delay:4s] z-0" />
      <div className="absolute bottom-20 left-1/3 w-[800px] h-[600px] bg-gradient-to-t from-indigo-600/20 via-cyan-500/15 to-transparent rounded-full blur-[150px] pointer-events-none animate-radiant-pulse [animation-delay:3s] z-0" />
      <MatrixBackground opacity={0.22} />
      <div className="absolute inset-0 obs-studio-dot-grid pointer-events-none opacity-40 z-0" />

      <div className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 space-y-16 sm:space-y-24">
        {/* ===================== HERO & BILLING CONTROLS ===================== */}
        <header className="text-center max-w-3xl mx-auto space-y-5">
          <h1 className="text-3xl sm:text-5xl font-extrabold text-white font-['Chakra_Petch'] uppercase tracking-tight leading-[1.08]">
            Straightforward Creator Pricing
          </h1>
          <p className="text-sm sm:text-base text-slate-300 max-w-2xl mx-auto leading-relaxed">
            {!isWaitingForData && isUltraUser
              ? 'Your account runs on Ultra with unlimited daily tokens, a 100MB vault, and clean watermark-free overlays.'
              : !isWaitingForData && isProUser
              ? 'Your account runs on Pro with 20,000 daily tokens, 20MB storage, and watermark-free overlays.'
              : 'Every widget and bank integration is open on every tier. Pick the daily token allowance and media storage capacity that fits your channel.'}
          </p>

          {/* Studio Switcher Controls */}
          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            {!isWaitingForData && (
              <div className="inline-flex items-center p-1 rounded-xl bg-[#0A0F1E]/90 backdrop-blur-xl border border-white/10 text-xs">
                <button
                  type="button"
                  onClick={() => setAnnualBilling(false)}
                  className={`px-3.5 py-1.5 rounded-lg font-medium transition-colors cursor-pointer ${
                    !annualBilling ? 'bg-white/10 text-white font-semibold' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Monthly
                </button>
                <button
                  type="button"
                  onClick={() => setAnnualBilling(true)}
                  className={`px-3.5 py-1.5 rounded-lg font-medium transition-colors flex items-center gap-1.5 cursor-pointer ${
                    annualBilling ? 'bg-[#0284C7] text-white font-semibold' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <span>Annual</span>
                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-black/25">
                    -{annualDiscountPct}%
                  </span>
                </button>
              </div>
            )}

            <div className="inline-flex items-center p-1 rounded-xl bg-[#0A0F1E]/90 backdrop-blur-xl border border-white/10 text-xs">
              <button
                type="button"
                onClick={() => setCurrency('USD')}
                className={`px-3.5 py-1.5 rounded-lg font-medium transition-colors cursor-pointer ${
                  currency === 'USD' ? 'bg-white/10 text-white font-semibold' : 'text-slate-400 hover:text-white'
                }`}
              >
                USD ($)
              </button>
              <button
                type="button"
                onClick={() => setCurrency('KHR')}
                className={`px-3.5 py-1.5 rounded-lg font-medium transition-colors cursor-pointer ${
                  currency === 'KHR' ? 'bg-white/10 text-white font-semibold' : 'text-slate-400 hover:text-white'
                }`}
              >
                KHR (៛)
              </button>
            </div>
          </div>
        </header>

        {/* ===================== PRICING TIERS (CLEAN STUDIO CARDS) ===================== */}
        {isWaitingForData ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-stretch">
            {[0, 1, 2].map((idx) => (
              <div
                key={idx}
                className="rounded-2xl border border-white/[0.08] bg-[#0A0F1E]/85 backdrop-blur-xl p-6 sm:p-7 h-[480px] flex flex-col justify-between animate-pulse"
              >
                <div className="space-y-4">
                  <div className="h-4 w-24 bg-slate-800 rounded" />
                  <div className="h-9 w-32 bg-slate-800 rounded" />
                  <div className="h-16 bg-slate-800/50 rounded-xl" />
                  <div className="space-y-3 pt-2">
                    {[1, 2, 3, 4].map((row) => (
                      <div key={row} className="h-3.5 bg-slate-800/60 rounded w-full" />
                    ))}
                  </div>
                </div>
                <div className="h-11 bg-slate-800 rounded-xl w-full" />
              </div>
            ))}
          </div>
        ) : (
          <section className="grid grid-cols-1 md:grid-cols-3 gap-6 items-stretch">
            {/* Tier 1: Free */}
            <div className="rounded-2xl border border-white/[0.08] bg-[#0A0F1E]/85 backdrop-blur-xl p-6 sm:p-7 flex flex-col justify-between hover:border-white/15 transition-colors">
              <div>
                <div className="flex items-center justify-between gap-2">
                  <h2 className="text-base font-bold text-white font-['Chakra_Petch'] uppercase tracking-wide">
                    Free
                  </h2>
                  <span className="text-[11px] font-mono text-slate-400">Starter</span>
                </div>
                <p className="text-xs text-slate-400 mt-1">
                  Launch alerts and accept direct tips right away.
                </p>

                <div className="mt-5 flex items-baseline gap-1.5">
                  <span className="text-3xl sm:text-4xl font-extrabold text-white tabular-nums tracking-tight">
                    {currency === 'KHR' ? '0 ៛' : '$0'}
                  </span>
                  <span className="text-xs text-slate-400">/ month</span>
                </div>

                {/* Explicit Quota Strip */}
                <div className="mt-5 grid grid-cols-2 gap-2 p-3 rounded-xl bg-white/[0.03] border border-white/[0.06]">
                  <div>
                    <div className="text-[10px] font-mono uppercase text-slate-500">Daily Tokens</div>
                    <div className="text-xs font-bold text-white font-mono mt-0.5">2,000 / day</div>
                  </div>
                  <div>
                    <div className="text-[10px] font-mono uppercase text-slate-500">Media Vault</div>
                    <div className="text-xs font-bold text-white font-mono mt-0.5">5 MB</div>
                  </div>
                </div>

                <ul className="mt-6 space-y-3 text-xs text-slate-300">
                  <li className="flex items-start gap-2.5">
                    <Check size={15} className="text-emerald-400 shrink-0 mt-0.5" />
                    <span>All OBS widgets, alerts &amp; soundboard included</span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <Check size={15} className="text-emerald-400 shrink-0 mt-0.5" />
                    <span>Bakong KHQR &amp; ABA PayWay (0% commission)</span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <Check size={15} className="text-emerald-400 shrink-0 mt-0.5" />
                    <span>Telegram bot instant donation notifications</span>
                  </li>
                  <li className="flex items-start gap-2.5 text-slate-400">
                    <Minus size={15} className="text-slate-500 shrink-0 mt-0.5" />
                    <span>Includes StreamWidgets branding watermark</span>
                  </li>
                </ul>
              </div>

              <div className="mt-8 pt-5 border-t border-white/[0.07]">
                <button
                  type="button"
                  onClick={() => onNavigate('dashboard')}
                  className="w-full py-3 px-4 rounded-xl text-xs font-bold text-slate-200 bg-white/[0.06] hover:bg-white/[0.11] border border-white/10 transition-colors cursor-pointer"
                >
                  {!isProUser && !isUltraUser ? 'Current Plan' : 'Continue on Free'}
                </button>
              </div>
            </div>

            {/* Tier 2: Pro */}
            <div className="rounded-2xl border border-sky-500/45 bg-[#0C1428]/90 backdrop-blur-xl p-6 sm:p-7 flex flex-col justify-between shadow-xl shadow-black/30">
              <div>
                <div className="flex items-center justify-between gap-2">
                  <h2 className="text-base font-bold text-white font-['Chakra_Petch'] uppercase tracking-wide">
                    Pro
                  </h2>
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono font-semibold uppercase tracking-wider bg-sky-500/15 text-sky-300 border border-sky-500/30">
                    {showFreeTrial ? `${trialSettings?.durationDays || 7}-Day Trial` : 'Recommended'}
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-1">
                  Clean unbranded overlays with 10x token headroom.
                </p>

                <div className="mt-5 flex items-baseline gap-2 flex-wrap">
                  <span className="text-3xl sm:text-4xl font-extrabold text-white tabular-nums tracking-tight">
                    {showFreeTrial ? (currency === 'KHR' ? '0 ៛' : '$0') : getProPrice()}
                  </span>
                  {showFreeTrial ? (
                    <span className="text-xs font-mono text-amber-300">
                      for {trialSettings?.durationDays || 7} days, then {getProPrice()}/mo
                    </span>
                  ) : (
                    <>
                      {(promo?.isActive || annualBilling) && (
                        <span className="text-sm font-mono text-slate-500 line-through">
                          {getOriginalProPrice()}
                        </span>
                      )}
                      <span className="text-xs text-slate-400">/ month</span>
                    </>
                  )}
                </div>

                {/* Explicit Quota Strip */}
                <div className="mt-5 grid grid-cols-2 gap-2 p-3 rounded-xl bg-sky-500/[0.07] border border-sky-500/20">
                  <div>
                    <div className="text-[10px] font-mono uppercase text-slate-400">Daily Tokens</div>
                    <div className="text-xs font-bold text-sky-300 font-mono mt-0.5">20,000 / day</div>
                  </div>
                  <div>
                    <div className="text-[10px] font-mono uppercase text-slate-400">Media Vault</div>
                    <div className="text-xs font-bold text-sky-300 font-mono mt-0.5">20 MB</div>
                  </div>
                </div>

                <ul className="mt-6 space-y-3 text-xs text-slate-200">
                  <li className="flex items-start gap-2.5">
                    <Check size={15} className="text-sky-400 shrink-0 mt-0.5" />
                    <span>Zero watermark on donation page &amp; OBS overlays</span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <Check size={15} className="text-sky-400 shrink-0 mt-0.5" />
                    <span>10x daily token reset for heavy TTS &amp; alert streams</span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <Check size={15} className="text-sky-400 shrink-0 mt-0.5" />
                    <span>Priority Telegram support response</span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <Check size={15} className="text-emerald-400 shrink-0 mt-0.5" />
                    <span>All widgets, KHQR &amp; ABA instant payouts included</span>
                  </li>
                </ul>
              </div>

              <div className="mt-8 pt-5 border-t border-white/[0.08] space-y-2.5">
                {showFreeTrial ? (
                  <button
                    type="button"
                    onClick={handleClaimTrial}
                    disabled={claimingTrial}
                    className="w-full py-3 px-4 rounded-xl text-xs font-bold text-slate-950 bg-amber-400 hover:bg-amber-300 transition-colors cursor-pointer disabled:opacity-60"
                  >
                    {claimingTrial
                      ? 'Activating Trial...'
                      : `Start ${trialSettings?.durationDays || 7}-Day Free Trial`}
                  </button>
                ) : isProUser ? (
                  <button
                    type="button"
                    onClick={() => onNavigate('dashboard')}
                    className="w-full py-3 px-4 rounded-xl text-xs font-bold text-sky-300 bg-sky-500/15 border border-sky-500/35 cursor-pointer"
                  >
                    Current Plan: Pro
                  </button>
                ) : (
                  <a
                    href="https://t.me/hchenheng"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full py-3 px-4 rounded-xl text-xs font-bold text-white bg-[#0284C7] hover:bg-[#0369A1] transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <span>Upgrade to Pro</span>
                    <ArrowRight size={14} />
                  </a>
                )}

                {trialSuccessMsg && (
                  <p className="text-center text-xs text-emerald-400 font-medium">{trialSuccessMsg}</p>
                )}
                {claimError && (
                  <p className="text-center text-xs text-rose-400 font-medium">{claimError}</p>
                )}
                {hasUsedTrialAlready && (
                  <p className="text-[11px] text-slate-400 text-center">
                    Free trial already used on this account.
                  </p>
                )}
              </div>
            </div>

            {/* Tier 3: Ultra */}
            <div className="rounded-2xl border border-cyan-400/45 bg-[#091224]/90 backdrop-blur-xl p-6 sm:p-7 flex flex-col justify-between shadow-xl shadow-black/30">
              <div>
                <div className="flex items-center justify-between gap-2">
                  <h2 className="text-base font-bold text-white font-['Chakra_Petch'] uppercase tracking-wide">
                    Ultra
                  </h2>
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono font-semibold uppercase tracking-wider bg-cyan-500/15 text-cyan-300 border border-cyan-400/30">
                    Unlimited
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-1">
                  For full-time channels with high donation volume.
                </p>

                <div className="mt-5 flex items-baseline gap-2 flex-wrap">
                  <span className="text-3xl sm:text-4xl font-extrabold text-white tabular-nums tracking-tight">
                    {getUltraPrice()}
                  </span>
                  {annualBilling && (
                    <span className="text-sm font-mono text-slate-500 line-through">
                      {getOriginalUltraPrice()}
                    </span>
                  )}
                  <span className="text-xs text-slate-400">/ month</span>
                </div>

                {/* Explicit Quota Strip */}
                <div className="mt-5 grid grid-cols-2 gap-2 p-3 rounded-xl bg-cyan-500/[0.07] border border-cyan-400/20">
                  <div>
                    <div className="text-[10px] font-mono uppercase text-slate-400">Daily Tokens</div>
                    <div className="text-xs font-bold text-cyan-300 font-mono mt-0.5">Unlimited</div>
                  </div>
                  <div>
                    <div className="text-[10px] font-mono uppercase text-slate-400">Media Vault</div>
                    <div className="text-xs font-bold text-cyan-300 font-mono mt-0.5">100 MB</div>
                  </div>
                </div>

                <ul className="mt-6 space-y-3 text-xs text-slate-200">
                  <li className="flex items-start gap-2.5">
                    <Check size={15} className="text-cyan-400 shrink-0 mt-0.5" />
                    <span>No daily token limit for marathon &amp; subathon broadcasts</span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <Check size={15} className="text-cyan-400 shrink-0 mt-0.5" />
                    <span>100MB vault for high-res video &amp; custom sound alerts</span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <Check size={15} className="text-cyan-400 shrink-0 mt-0.5" />
                    <span>24/7 dedicated VIP Telegram setup &amp; troubleshooting</span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <Check size={15} className="text-emerald-400 shrink-0 mt-0.5" />
                    <span>Zero watermark + all OBS widgets unlocked</span>
                  </li>
                </ul>
              </div>

              <div className="mt-8 pt-5 border-t border-white/[0.08]">
                {isUltraUser ? (
                  <button
                    type="button"
                    onClick={() => onNavigate('dashboard')}
                    className="w-full py-3 px-4 rounded-xl text-xs font-bold text-cyan-300 bg-cyan-500/15 border border-cyan-400/35 cursor-pointer"
                  >
                    Current Plan: Ultra
                  </button>
                ) : (
                  <a
                    href="https://t.me/hchenheng"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full py-3 px-4 rounded-xl text-xs font-bold text-slate-950 bg-white hover:bg-slate-200 transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <span>Upgrade to Ultra</span>
                    <ArrowRight size={14} />
                  </a>
                )}
              </div>
            </div>
          </section>
        )}

        {/* ===================== CLEAN STUDIO COMPARISON MATRIX ===================== */}
        <section className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-2 max-w-5xl mx-auto">
            <div>
              <p className="text-[11px] font-mono uppercase tracking-widest text-cyan-400 font-semibold">
                Full Specification
              </p>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-white font-['Chakra_Petch'] uppercase tracking-tight mt-1">
                Compare Plans Side by Side
              </h2>
            </div>
            <p className="text-xs text-slate-400">
              All widgets stay unlocked on Free — upgrade only when you need higher quotas.
            </p>
          </div>

          {/* Mobile Responsive Stacked Comparison Cards (Zero Horizontal Scroll) */}
          <div className="md:hidden space-y-4">
            {/* Mobile Plan Header Strip */}
            <div className="grid grid-cols-3 gap-2 p-2.5 rounded-2xl border border-white/[0.08] bg-[#0A0F1E]/90 backdrop-blur-xl text-center">
              <div className="p-2 rounded-xl bg-white/[0.03]">
                <div className="text-[11px] font-bold text-white font-['Chakra_Petch'] uppercase">Free</div>
                <div className="text-[11px] font-mono text-slate-400 mt-0.5 tabular-nums">
                  {currency === 'KHR' ? '0 ៛' : '$0'}
                </div>
              </div>
              <div className="p-2 rounded-xl bg-sky-500/[0.08] border border-sky-500/20">
                <div className="text-[11px] font-bold text-sky-300 font-['Chakra_Petch'] uppercase">Pro</div>
                <div className="text-[11px] font-mono text-slate-200 mt-0.5 tabular-nums">{getProPrice()}</div>
              </div>
              <div className="p-2 rounded-xl bg-cyan-500/[0.08] border border-cyan-400/20">
                <div className="text-[11px] font-bold text-cyan-300 font-['Chakra_Petch'] uppercase">Ultra</div>
                <div className="text-[11px] font-mono text-slate-200 mt-0.5 tabular-nums">{getUltraPrice()}</div>
              </div>
            </div>

            {comparisonGroups.map((group) => (
              <div
                key={group.group}
                className="rounded-2xl border border-white/[0.08] bg-[#0A0F1E]/85 backdrop-blur-xl overflow-hidden"
              >
                <div className="px-4 py-2.5 bg-white/[0.03] border-b border-white/[0.06] text-[10px] font-mono uppercase tracking-widest text-slate-400 font-bold">
                  {group.group}
                </div>
                <div className="divide-y divide-white/[0.06]">
                  {group.rows.map((row) => (
                    <div key={row.label} className="p-3.5 space-y-2.5">
                      <div className="text-xs font-medium text-slate-100 leading-snug">{row.label}</div>
                      <div className="grid grid-cols-3 gap-2">
                        <div className="rounded-xl bg-white/[0.03] border border-white/[0.05] px-2 py-2 flex flex-col items-center justify-center gap-1 text-center min-w-0">
                          <span className="text-[9px] font-mono uppercase tracking-wider text-slate-500">Free</span>
                          <div className="break-words leading-tight">{renderCellValue(row.free)}</div>
                        </div>
                        <div className="rounded-xl bg-sky-500/[0.06] border border-sky-500/15 px-2 py-2 flex flex-col items-center justify-center gap-1 text-center min-w-0">
                          <span className="text-[9px] font-mono uppercase tracking-wider text-sky-400/80">Pro</span>
                          <div className="break-words leading-tight">
                            {renderCellValue(row.pro, row.highlightPro, 'pro')}
                          </div>
                        </div>
                        <div className="rounded-xl bg-cyan-500/[0.06] border border-cyan-400/15 px-2 py-2 flex flex-col items-center justify-center gap-1 text-center min-w-0">
                          <span className="text-[9px] font-mono uppercase tracking-wider text-cyan-400/80">Ultra</span>
                          <div className="break-words leading-tight">
                            {renderCellValue(row.ultra, row.highlightUltra, 'ultra')}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* Desktop 4-Column Comparison Table */}
          <div className="hidden md:block overflow-hidden rounded-2xl border border-white/[0.08] bg-[#0A0F1E]/85 backdrop-blur-xl max-w-5xl mx-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-white/[0.08] bg-white/[0.02]">
                  <th className="py-4 px-5 text-xs font-mono uppercase tracking-wider text-slate-400 font-semibold w-[46%]">
                    Capability
                  </th>
                  <th className="py-4 px-4 text-center w-[18%]">
                    <div className="text-xs font-bold text-white font-['Chakra_Petch'] uppercase">Free</div>
                    <div className="text-[11px] font-mono text-slate-400 mt-0.5">
                      {currency === 'KHR' ? '0 ៛' : '$0'}
                    </div>
                  </th>
                  <th className="py-4 px-4 text-center w-[18%] bg-sky-500/[0.04]">
                    <div className="text-xs font-bold text-sky-300 font-['Chakra_Petch'] uppercase inline-flex items-center gap-1.5">
                      <span>Pro</span>
                      {!isWaitingForData && isProUser && (
                        <span className="text-[9px] px-1.5 py-0.5 rounded bg-sky-500/20 border border-sky-500/40 font-mono">
                          Active
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] font-mono text-slate-300 mt-0.5">{getProPrice()}/mo</div>
                  </th>
                  <th className="py-4 px-4 text-center w-[18%] bg-cyan-500/[0.04]">
                    <div className="text-xs font-bold text-cyan-300 font-['Chakra_Petch'] uppercase inline-flex items-center gap-1.5">
                      <span>Ultra</span>
                      {!isWaitingForData && isUltraUser && (
                        <span className="text-[9px] px-1.5 py-0.5 rounded bg-cyan-500/20 border border-cyan-400/40 font-mono">
                          Active
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] font-mono text-slate-300 mt-0.5">{getUltraPrice()}/mo</div>
                  </th>
                </tr>
              </thead>
              <tbody>
                {comparisonGroups.map((group) => (
                  <React.Fragment key={group.group}>
                    <tr className="bg-white/[0.025] border-y border-white/[0.06]">
                      <td
                        colSpan={4}
                        className="py-2.5 px-5 text-[10px] font-mono uppercase tracking-widest text-slate-400 font-bold"
                      >
                        {group.group}
                      </td>
                    </tr>
                    {group.rows.map((row) => (
                      <tr
                        key={row.label}
                        className="border-b border-white/[0.05] last:border-b-0 hover:bg-white/[0.02] transition-colors"
                      >
                        <td className="py-3.5 px-5 text-xs text-slate-200 font-medium">{row.label}</td>
                        <td className="py-3.5 px-4 text-center">{renderCellValue(row.free)}</td>
                        <td className="py-3.5 px-4 text-center bg-sky-500/[0.02]">
                          {renderCellValue(row.pro, row.highlightPro, 'pro')}
                        </td>
                        <td className="py-3.5 px-4 text-center bg-cyan-500/[0.02]">
                          {renderCellValue(row.ultra, row.highlightUltra, 'ultra')}
                        </td>
                      </tr>
                    ))}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* ===================== REDESIGNED SPLIT-COLUMN FAQ SECTION ===================== */}
        <section className="max-w-5xl mx-auto pt-4">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 items-start">
            {/* Left Sticky Intro + Category Filter + Support Contact Card */}
            <div className="lg:col-span-4 space-y-5 lg:sticky lg:top-24">
              <div className="space-y-2">
                <p className="text-[11px] font-mono uppercase tracking-widest text-cyan-400 font-semibold">
                  FAQ
                </p>
                <h2 className="text-2xl sm:text-3xl font-extrabold text-white font-['Chakra_Petch'] uppercase tracking-tight leading-tight">
                  Answers Before You Upgrade
                </h2>
                <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
                  Everything about token resets, KHQR instant payouts, and OBS Studio compatibility.
                </p>
              </div>

              {/* Category Filter Buttons */}
              <div className="flex flex-wrap gap-1.5">
                {(
                  [
                    { id: 'all', label: 'All' },
                    { id: 'plans', label: 'Plans & Billing' },
                    { id: 'payments', label: 'KHQR & Payouts' },
                    { id: 'widgets', label: 'OBS & Widgets' }
                  ] as const
                ).map((cat) => (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => {
                      setFaqCategory(cat.id);
                      setOpenFaq(0);
                    }}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors cursor-pointer ${
                      faqCategory === cat.id
                        ? 'bg-[#0284C7] border-[#0284C7] text-white font-semibold'
                        : 'bg-[#0A0F1E]/80 border-white/[0.08] text-slate-300 hover:text-white hover:border-white/20'
                    }`}
                  >
                    {cat.label}
                  </button>
                ))}
              </div>

              {/* Compact Direct Help Card */}
              <div className="p-4 rounded-2xl bg-[#0A0F1E]/85 backdrop-blur-xl border border-white/[0.08] space-y-3">
                <div className="space-y-1">
                  <div className="text-xs font-bold text-white">Need custom setup help?</div>
                  <p className="text-[11px] text-slate-400 leading-relaxed">
                    Chat directly with support or message us on Telegram for instant Pro/Ultra activation.
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => onNavigate('dashboard')}
                    className="flex-1 min-w-[120px] py-2 px-3 rounded-lg bg-white/[0.07] hover:bg-white/[0.12] border border-white/10 text-xs font-semibold text-white transition-colors inline-flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <MessageSquare size={13} />
                    <span>Open Ticket</span>
                  </button>
                  <a
                    href="https://t.me/hchenheng"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 min-w-[120px] py-2 px-3 rounded-lg bg-[#0284C7]/20 hover:bg-[#0284C7]/30 border border-sky-500/30 text-xs font-semibold text-sky-300 transition-colors inline-flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <span>Telegram</span>
                    <ExternalLink size={12} />
                  </a>
                </div>
              </div>
            </div>

            {/* Right Interactive FAQ List */}
            <div className="lg:col-span-8 space-y-3">
              {visibleFaqs.map((faq, idx) => {
                const isOpen = openFaq === idx;
                return (
                  <div
                    key={faq.q}
                    className={`rounded-2xl backdrop-blur-xl border transition-all overflow-hidden ${
                      isOpen
                        ? 'bg-[#0C1428]/90 border-sky-500/40 shadow-lg shadow-black/25'
                        : 'bg-[#0A0F1E]/80 border-white/[0.07] hover:border-white/15'
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => setOpenFaq(isOpen ? null : idx)}
                      aria-expanded={isOpen}
                      className="w-full p-4 sm:p-5 text-left flex items-start justify-between gap-4 cursor-pointer group"
                    >
                      <div className="flex items-start gap-3.5 min-w-0">
                        <span
                          className={`text-xs font-mono font-bold pt-0.5 shrink-0 ${
                            isOpen ? 'text-cyan-400' : 'text-slate-500 group-hover:text-slate-300'
                          }`}
                        >
                          {String(idx + 1).padStart(2, '0')}
                        </span>
                        <div className="space-y-1 min-w-0">
                          <span className="inline-block text-[10px] font-mono uppercase tracking-wider text-slate-400">
                            {faq.tag}
                          </span>
                          <div
                            className={`text-sm sm:text-[15px] font-semibold leading-snug transition-colors ${
                              isOpen ? 'text-white' : 'text-slate-200 group-hover:text-white'
                            }`}
                          >
                            {faq.q}
                          </div>
                        </div>
                      </div>
                      <ChevronDown
                        size={17}
                        className={`shrink-0 mt-1 transition-transform duration-200 ${
                          isOpen ? 'rotate-180 text-cyan-400' : 'text-slate-500 group-hover:text-slate-300'
                        }`}
                      />
                    </button>

                    {isOpen && (
                      <div className="px-4 sm:px-5 pb-5 pl-[3.1rem] sm:pl-[3.35rem] text-xs sm:text-sm text-slate-300 leading-relaxed">
                        {faq.a}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};
