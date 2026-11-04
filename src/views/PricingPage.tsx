'use client';

import React, { useState, useEffect } from 'react';
import {
  Check,
  Zap,
  HelpCircle,
  ArrowRight,
  ShieldCheck,
  CreditCard,
  Tv,
  Send,
  Sparkles,
  ChevronDown,
  Lock,
  Disc,
  Video,
  Volume2,
  Trophy,
  Target,
  Timer,
  Bot,
  Gift
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { Button } from '../components/common/Button';
import { request } from '../services/api';
import { PromotionConfig } from '../components/dashboard/AdminPromotionManager';
import { useAuth } from '../context/AuthContext';

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

export const PricingPage: React.FC<PricingPageProps> = ({ onNavigate }) => {
  const { user, loading: authLoading, refreshUser, loginWithGoogleRedirect } = useAuth();
  const [currency, setCurrency] = useState<'USD' | 'KHR'>('USD');
  const [annualBilling, setAnnualBilling] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [promo, setPromo] = useState<PromotionConfig | null>(null);
  const [trialSettings, setTrialSettings] = useState<TrialSettings | null>(null);
  const [dataLoading, setDataLoading] = useState(true);
  const [claimingTrial, setClaimingTrial] = useState(false);
  const [trialSuccessMsg, setTrialSuccessMsg] = useState<string | null>(null);
  const [claimError, setClaimError] = useState<string | null>(null);

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

  // If user clicked trial while unauthenticated and just completed login, auto-claim
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
      // Must be a signed-in user: save intent and redirect to Google Sign-In
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
        setTrialSuccessMsg(`🎉 Success! Free Pro Trial is now active. Unlocking all Pro overlays!`);
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
  const isProUser = Boolean(user && user.plan === 'pro');
  const hasUsedTrialAlready = Boolean(user && user.hasUsedTrial && !user.isAdmin);
  const isTrialEnabled = Boolean(trialSettings?.isEnabled);
  const showFreeTrial = isTrialEnabled && !isProUser && !hasUsedTrialAlready;

  const toggleFaq = (index: number) => {
    setOpenFaq(openFaq === index ? null : index);
  };

  const getProPrice = () => {
    const isPromoActive = Boolean(promo?.isActive);
    const annualDiscount = Math.max(0, Math.min(100, Number(promo?.annualDiscountPercent ?? 10)));
    const annualMultiplier = (100 - annualDiscount) / 100;
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

  const faqs = [
    {
      q: 'What are the differences between the Free and Pro plans?',
      a: 'The Free plan ($0) includes 20MB media storage, Donations Alerts, and the Payment Gateway (ABA PayWay & Bakong KHQR). The Pro plan ($4.99/mo with annual discount) removes the donation page watermark, expands storage to 100MB (supporting MP4, GIF, MP3, WAV & all formats), and unlocks all advanced stream assets: Leaderboard, Goals, Subathon Timer, Soundboard, Video Alerts, and Spinning Wheels.'
    },
    {
      q: 'Is the Payment Gateway available on both Free and Pro plans?',
      a: 'Yes! The Payment Gateway (ABA PayWay & Bakong KHQR checkout) is available on all plans so every streamer can start receiving viewer tips right away.'
    },
    {
      q: 'Which stream widgets are unlocked on the Pro plan?',
      a: 'Upgrading to the Pro plan unlocks Donor Leaderboard, Goal Progress Bars, Subathon Countdown Timer, PC Hotkey Soundboard, YouTube Media Share Video Alerts, and Interactive Spinning Wheels.'
    },
    {
      q: 'Which Cambodian banks are supported by Bakong KHQR?',
      a: 'All 40+ member financial institutions of the National Bank of Cambodia Bakong network, including ABA Mobile, Acleda toanChet, Canadia, Sathapana, Wing, CPBank, Chip Mong Bank, and more.'
    },
    {
      q: 'Can I stream simultaneously to multiple platforms (Twitch, YouTube, TikTok, Facebook)?',
      a: 'Yes! The OBS browser source operates completely independent of your streaming destination. Any software that captures your OBS browser source URL will display your live alerts, leaderboard, and video share.'
    },
    {
      q: 'Can I upgrade or downgrade my plan at any time?',
      a: 'Yes, you can upgrade to Pro or switch back to Free whenever you wish directly from your streamer dashboard billing settings.'
    }
  ];

  return (
    <div className="min-h-screen py-8 sm:py-16 px-3 sm:px-6 lg:px-8 max-w-7xl mx-auto space-y-12 sm:space-y-20">
      {/* Header */}
      <div className="text-center space-y-3 sm:space-y-4 max-w-3xl mx-auto">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-900 border border-slate-800 text-xs font-mono text-cyan-400">
          <Sparkles size={13} />
          <span>TRANSPARENT CREATOR PRICING</span>
        </div>
        <h1 className="text-2xl xs:text-3xl sm:text-5xl font-extrabold text-white tracking-tight">
          Simple, transparent plans for Cambodian streamers
        </h1>
        <p className="text-sm sm:text-base text-slate-400 max-w-2xl mx-auto leading-relaxed px-1">
          {!isWaitingForData && isProUser
            ? 'You are currently on the Pro plan with full access to all stream widgets, 100MB storage, and zero watermark. View Free tier details below.'
            : 'Start free with Donations Alerts, Payment Gateway, and 20MB storage, or upgrade to Pro to unlock 100MB storage, Leaderboard, Goals, Timer, Soundboard, Video Alerts, and Spinning Wheels.'}
        </p>

        {/* Currency & Billing Controls */}
        <div className="flex flex-wrap items-center justify-center gap-4 pt-4">
          {/* Monthly / Annual Toggle - only relevant when Pro plan is visible */}
          {!isWaitingForData && !isProUser && (
            <div className="inline-flex items-center p-1 rounded-xl bg-slate-900 border border-slate-800 text-xs font-medium">
              <button
                onClick={() => setAnnualBilling(false)}
                className={`px-3 py-1.5 rounded-lg transition-colors ${
                  !annualBilling ? 'bg-slate-800 text-white font-semibold' : 'text-slate-400 hover:text-white'
                }`}
              >
                Monthly
              </button>
              <button
                onClick={() => setAnnualBilling(true)}
                className={`px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5 ${
                  annualBilling ? 'bg-cyan-500 text-slate-950 font-semibold' : 'text-slate-400 hover:text-white'
                }`}
              >
                <span>Annual</span>
                <span className="text-[10px] px-1.5 py-0.2 rounded bg-black/20 font-bold">
                  Save {promo?.annualDiscountPercent ?? 10}%
                </span>
              </button>
            </div>
          )}

          {/* Currency Toggle */}
          <div className="inline-flex items-center p-1 rounded-xl bg-slate-900 border border-slate-800 text-xs font-medium">
            <button
              onClick={() => setCurrency('USD')}
              className={`px-3 py-1.5 rounded-lg transition-colors ${
                currency === 'USD' ? 'bg-slate-800 text-white font-semibold' : 'text-slate-400 hover:text-white'
              }`}
            >
              USD ($)
            </button>
            <button
              onClick={() => setCurrency('KHR')}
              className={`px-3 py-1.5 rounded-lg transition-colors ${
                currency === 'KHR' ? 'bg-slate-800 text-white font-semibold' : 'text-slate-400 hover:text-white'
              }`}
            >
              Riel (៛)
            </button>
          </div>
        </div>
      </div>

      {/* Active Pro Banner for Pro Users */}
      {!isWaitingForData && isProUser && (
        <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-purple-950/70 via-[#120E22] to-cyan-950/70 border border-purple-500/40 max-w-xl mx-auto shadow-xl shadow-purple-500/10 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-xl bg-purple-500/20 border border-purple-500/40 flex items-center justify-center text-purple-300 flex-shrink-0">
              <Sparkles size={22} className="animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 font-bold border border-purple-500/40 uppercase tracking-wider">
                  Active Subscriber
                </span>
                {user?.trialActive && (
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-bold border border-amber-500/40 uppercase tracking-wider">
                    Free Trial
                  </span>
                )}
              </div>
              <h3 className="text-sm sm:text-base font-bold text-white mt-1">
                You are currently on the PRO PLAN
              </h3>
              <p className="text-xs text-slate-400">
                All advanced overlays, 100MB storage, and stream assets are active on your account.
              </p>
            </div>
          </div>
          <button
            onClick={() => onNavigate('dashboard')}
            className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-purple-500 hover:bg-purple-400 text-slate-950 text-xs font-extrabold uppercase tracking-wider transition-colors flex-shrink-0 cursor-pointer shadow-md shadow-purple-500/25"
          >
            Dashboard
          </button>
        </div>
      )}

      {/* Plans Section: Await Data & Trial Settings First */}
      {isWaitingForData ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8 max-w-5xl mx-auto items-stretch">
          {/* Skeleton Card 1 */}
          <div className="rounded-2xl border border-slate-800 bg-[#0B0F19] p-6 sm:p-8 flex flex-col h-[520px] justify-between animate-pulse shadow-xl">
            <div className="space-y-4">
              <div className="h-4 w-24 bg-slate-800 rounded" />
              <div className="h-9 w-32 bg-slate-800 rounded" />
              <div className="h-px bg-slate-800 my-6" />
              <div className="space-y-3.5">
                {[1, 2, 3, 4, 5, 6, 7].map((i) => (
                  <div key={i} className="h-4 bg-slate-800/60 rounded w-full" />
                ))}
              </div>
            </div>
            <div className="h-11 bg-slate-800 rounded-xl w-full" />
          </div>

          {/* Skeleton Card 2 */}
          <div className="rounded-2xl border border-purple-500/30 bg-[#120E22]/60 p-6 sm:p-8 flex flex-col h-[520px] justify-between animate-pulse shadow-xl">
            <div className="space-y-4">
              <div className="h-4 w-28 bg-purple-900/40 rounded" />
              <div className="h-9 w-36 bg-purple-900/40 rounded" />
              <div className="h-px bg-purple-500/20 my-6" />
              <div className="space-y-3.5">
                {[1, 2, 3, 4, 5, 6, 7].map((i) => (
                  <div key={i} className="h-4 bg-purple-900/30 rounded w-full" />
                ))}
              </div>
            </div>
            <div className="h-11 bg-purple-900/50 rounded-xl w-full" />
          </div>
        </div>
      ) : (
        <div className={`grid grid-cols-1 ${isProUser ? 'max-w-xl' : 'md:grid-cols-2 max-w-5xl'} gap-6 sm:gap-8 mx-auto items-stretch`}>
          {/* Plan 1: Free Plan */}
          <div className="rounded-2xl border border-slate-800 bg-[#0B0F19] p-5 xs:p-6 sm:p-8 flex flex-col h-full justify-between hover:border-slate-700 transition-colors shadow-xl">
            <div className="flex-1 flex flex-col">
              <div className="space-y-2">
                <span className="text-xs font-mono uppercase tracking-wider text-slate-400 font-bold">FREE PLAN</span>
                <div className="text-3xl font-extrabold text-white">
                  {currency === 'KHR' ? '0 ៛' : '$0'}
                  <span className="text-sm font-normal text-slate-400 ml-1">/ month</span>
                </div>
              </div>

              <div className="h-px bg-slate-800 my-6" />

              <ul className="space-y-3.5 text-xs text-slate-300 flex-1">
                <li className="flex items-center gap-3 text-cyan-300 font-semibold">
                  <Check size={16} className="text-cyan-400 flex-shrink-0" />
                  <span>20MB Storage</span>
                </li>
                <li className="flex items-center gap-3 text-emerald-300 font-semibold">
                  <Check size={16} className="text-emerald-400 flex-shrink-0" />
                  <span>Payment Gateway Included (ABA PayWay &amp; Bakong KHQR)</span>
                </li>
                <li className="flex items-center gap-3">
                  <Check size={16} className="text-cyan-400 flex-shrink-0" />
                  <span>Donations Alerts &amp; 60FPS OBS Browser Overlay</span>
                </li>
                <li className="flex items-center gap-3">
                  <Check size={16} className="text-cyan-400 flex-shrink-0" />
                  <span>Telegram Bot Notification Integration</span>
                </li>
                <li className="flex items-center gap-3 text-slate-600">
                  <span className="w-4 text-center">-</span>
                  <span>Removed Watermark on Donation Page</span>
                </li>
                <li className="flex items-center gap-3 text-slate-600">
                  <span className="w-4 text-center">-</span>
                  <span>Donor Leaderboard (20 Unique Styles)</span>
                </li>
                <li className="flex items-center gap-3 text-slate-600">
                  <span className="w-4 text-center">-</span>
                  <span>Goal Progress Bar &amp; Subathon Timer</span>
                </li>
                <li className="flex items-center gap-3 text-slate-600">
                  <span className="w-4 text-center">-</span>
                  <span>Soundboard with PC Hotkey SFX Engine</span>
                </li>
                <li className="flex items-center gap-3 text-slate-600">
                  <span className="w-4 text-center">-</span>
                  <span>Video Alerts (Media Share) &amp; Spinning Wheels</span>
                </li>
              </ul>
            </div>

            <div className="mt-8 pt-6 border-t border-slate-800/80 w-full">
              <button
                onClick={() => onNavigate('dashboard')}
                className="w-full py-3 px-4 rounded-xl text-xs font-bold uppercase tracking-wider text-white bg-slate-800 hover:bg-slate-700 border border-slate-700 transition-colors cursor-pointer"
              >
                {isProUser ? 'Current Plan: PRO (View in Dashboard)' : 'Start Free'}
              </button>
            </div>
          </div>

          {/* Plan 2: Pro Plan (Shown ONLY if user is NOT on Pro plan) */}
          {!isProUser && (
            <div className="rounded-2xl border-2 border-purple-500/80 bg-[#120E22] p-5 xs:p-6 sm:p-8 flex flex-col h-full justify-between relative shadow-2xl shadow-purple-500/10">
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3.5 py-0.5 rounded-full bg-gradient-to-r from-purple-500 to-cyan-400 text-slate-950 font-mono text-[10px] font-extrabold uppercase tracking-widest shadow-lg shadow-purple-500/30 whitespace-nowrap">
                RECOMMENDED
              </div>

              <div className="flex-1 flex flex-col">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-mono uppercase tracking-wider text-purple-400 font-bold">PRO PLAN</span>
                    {showFreeTrial && (
                      <span className="px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[10px] font-mono font-bold uppercase tracking-wider flex items-center gap-1 animate-pulse">
                        <Sparkles size={11} />
                        {trialSettings?.durationDays || 7}-Day Free Trial
                      </span>
                    )}
                  </div>
                  <div className="flex items-baseline gap-2.5">
                    <span className="text-3xl font-extrabold text-white">
                      {showFreeTrial ? '$0' : getProPrice()}
                    </span>
                    {showFreeTrial ? (
                      <span className="text-xs font-mono text-amber-300 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/30">
                        for first {trialSettings?.durationDays || 7} days
                      </span>
                    ) : (
                      <>
                        {promo?.isActive && (
                          <span className="text-sm font-mono text-slate-500 line-through">
                            {getOriginalProPrice()}
                          </span>
                        )}
                        <span className="text-sm font-normal text-slate-400">/ month</span>
                      </>
                    )}
                  </div>
                </div>

                <div className="h-px bg-purple-500/20 my-6" />

                <ul className="space-y-3.5 text-xs text-slate-200 flex-1">
                  <li className="flex items-center gap-3 text-purple-300 font-semibold">
                    <Check size={16} className="text-purple-400 flex-shrink-0" />
                    <span>100MB Storage</span>
                  </li>
                  <li className="flex items-center gap-3 text-emerald-300 font-semibold">
                    <Check size={16} className="text-emerald-400 flex-shrink-0" />
                    <span>Unlock Leaderboard, Goals &amp; Subathon Timer</span>
                  </li>
                  <li className="flex items-center gap-3 text-emerald-300 font-semibold">
                    <Check size={16} className="text-emerald-400 flex-shrink-0" />
                    <span>Unlock Soundboard, Video Alerts &amp; Spinning Wheels</span>
                  </li>
                  <li className="flex items-center gap-3 text-emerald-300 font-semibold">
                    <Check size={16} className="text-emerald-400 flex-shrink-0" />
                    <span>Removed Watermark (Clean Donation Page)</span>
                  </li>
                  <li className="flex items-center gap-3">
                    <Check size={16} className="text-purple-400 flex-shrink-0" />
                    <span>Payment Gateway (ABA PayWay &amp; Bakong KHQR) + Telegram Bot</span>
                  </li>
                  <li className="flex items-center gap-3">
                    <Check size={16} className="text-purple-400 flex-shrink-0" />
                    <span>Text-to-Speech (TTS) Voice Donor Reader</span>
                  </li>
                  <li className="flex items-center gap-3">
                    <Check size={16} className="text-purple-400 flex-shrink-0" />
                    <span>Zero-latency queued alert dispatcher</span>
                  </li>
                  <li className="flex items-center gap-3">
                    <Check size={16} className="text-purple-400 flex-shrink-0" />
                    <span>Multiple caster overlay tokens</span>
                  </li>
                  <li className="flex items-center gap-3">
                    <Check size={16} className="text-purple-400 flex-shrink-0" />
                    <span>Priority 24/7 direct Telegram SLA</span>
                  </li>
                </ul>
              </div>

              <div className="mt-8 pt-6 border-t border-purple-500/30 w-full space-y-2.5">
                {showFreeTrial ? (
                  <button
                    type="button"
                    onClick={handleClaimTrial}
                    disabled={claimingTrial}
                    className="w-full py-3.5 px-4 rounded-xl text-xs font-black uppercase tracking-wider text-slate-950 bg-gradient-to-r from-amber-400 via-orange-400 to-amber-300 hover:from-amber-300 hover:to-orange-300 transition-all shadow-lg shadow-amber-500/25 cursor-pointer flex items-center justify-center gap-2 active:scale-95"
                  >
                    <Gift size={16} className="text-slate-950 animate-bounce" />
                    <span>{claimingTrial ? 'Activating Free Trial...' : `Free Trial ${trialSettings?.durationDays || 7} Days`}</span>
                  </button>
                ) : (
                  <a
                    href="https://t.me/hchenheng"
                    onClick={() => {
                      if (typeof window !== 'undefined') {
                        window.location.href = 'https://t.me/hchenheng';
                      }
                    }}
                    className="w-full block text-center py-3 px-4 rounded-xl text-xs font-extrabold uppercase tracking-wider text-slate-950 bg-gradient-to-r from-purple-500 via-pink-500 to-cyan-400 hover:opacity-95 transition-all shadow-lg shadow-purple-500/25 cursor-pointer"
                  >
                    Get Pro Plan
                  </a>
                )}

                {trialSuccessMsg && (
                  <p className="text-center text-xs text-emerald-400 font-semibold animate-pulse">
                    {trialSuccessMsg}
                  </p>
                )}
                {claimError && (
                  <p className="text-center text-xs text-rose-400 font-medium">
                    {claimError}
                  </p>
                )}
                {hasUsedTrialAlready && (
                  <p className="text-[10px] text-slate-400 text-center font-mono">
                    • 7-day free trial completed. Upgrade to Pro to unlock all stream assets.
                  </p>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Feature Comparison Matrix */}
      <div className="space-y-6">
        <h2 className="text-2xl font-bold text-white text-center">Feature Breakdown</h2>
        <div className="overflow-x-auto rounded-2xl border border-slate-800 bg-[#0B0F19] max-w-5xl mx-auto shadow-xl">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="border-b border-slate-800 bg-slate-900/50 text-[11px] font-mono uppercase tracking-wider text-slate-400">
              <tr>
                <th className="py-4 px-6 font-semibold">Feature</th>
                <th className="py-4 px-6 font-semibold text-center">Free ($0)</th>
                <th className="py-4 px-6 font-semibold text-center text-purple-400 font-bold">
                  Pro ({getProPrice()}/mo)
                  {!isWaitingForData && isProUser && (
                    <span className="ml-2 text-[10px] px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/40 font-mono inline-flex items-center gap-1">
                      <Sparkles size={10} /> Active
                    </span>
                  )}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              <tr>
                <td className="py-3.5 px-6 font-medium text-white">Media Storage Limit (MP4, GIF, MP3, WAV, All Formats)</td>
                <td className="py-3.5 px-6 text-center text-cyan-400 font-bold">20MB</td>
                <td className="py-3.5 px-6 text-center text-purple-400 font-bold">100MB</td>
              </tr>
              <tr>
                <td className="py-3.5 px-6 font-medium text-white">Removed Watermark (Clean Donation Page)</td>
                <td className="py-3.5 px-6 text-center text-slate-500">Shows Branding</td>
                <td className="py-3.5 px-6 text-center"><Check size={16} className="inline text-emerald-400" /></td>
              </tr>
              <tr>
                <td className="py-3.5 px-6 font-medium text-white">Payment Gateway (ABA PayWay &amp; Bakong KHQR)</td>
                <td className="py-3.5 px-6 text-center"><Check size={16} className="inline text-emerald-400" /></td>
                <td className="py-3.5 px-6 text-center"><Check size={16} className="inline text-emerald-400" /></td>
              </tr>
              <tr>
                <td className="py-3.5 px-6 font-medium text-white">Telegram Bot &amp; GramJS Listener</td>
                <td className="py-3.5 px-6 text-center"><Check size={16} className="inline text-cyan-400" /></td>
                <td className="py-3.5 px-6 text-center"><Check size={16} className="inline text-emerald-400" /></td>
              </tr>
              <tr>
                <td className="py-3.5 px-6 font-medium text-white">Donations Alerts &amp; OBS 60FPS Browser Overlay</td>
                <td className="py-3.5 px-6 text-center"><Check size={16} className="inline text-cyan-400" /></td>
                <td className="py-3.5 px-6 text-center"><Check size={16} className="inline text-cyan-400" /></td>
              </tr>
              <tr>
                <td className="py-3.5 px-6 font-medium text-white">Donor Leaderboard (20 Unique Styles)</td>
                <td className="py-3.5 px-6 text-center text-slate-600">-</td>
                <td className="py-3.5 px-6 text-center"><Check size={16} className="inline text-emerald-400" /></td>
              </tr>
              <tr>
                <td className="py-3.5 px-6 font-medium text-white">Goal Progress Bar &amp; Subathon Timer</td>
                <td className="py-3.5 px-6 text-center text-slate-600">-</td>
                <td className="py-3.5 px-6 text-center"><Check size={16} className="inline text-emerald-400" /></td>
              </tr>
              <tr>
                <td className="py-3.5 px-6 font-medium text-white">PC Hotkey Soundboard Engine</td>
                <td className="py-3.5 px-6 text-center text-slate-600">-</td>
                <td className="py-3.5 px-6 text-center"><Check size={16} className="inline text-emerald-400" /></td>
              </tr>
              <tr>
                <td className="py-3.5 px-6 font-medium text-white">Video Alerts (YouTube Media Share)</td>
                <td className="py-3.5 px-6 text-center text-slate-600">-</td>
                <td className="py-3.5 px-6 text-center"><Check size={16} className="inline text-emerald-400" /></td>
              </tr>
              <tr>
                <td className="py-3.5 px-6 font-medium text-white">Interactive Spinning Wheels Widget</td>
                <td className="py-3.5 px-6 text-center text-slate-600">-</td>
                <td className="py-3.5 px-6 text-center"><Check size={16} className="inline text-emerald-400" /></td>
              </tr>
              <tr>
                <td className="py-3.5 px-6 font-medium text-white">Web Speech TTS Donor Voice Reader</td>
                <td className="py-3.5 px-6 text-center text-slate-600">-</td>
                <td className="py-3.5 px-6 text-center"><Check size={16} className="inline text-cyan-400" /></td>
              </tr>
              <tr>
                <td className="py-3.5 px-6 font-medium text-white">Alert Queue Buffer</td>
                <td className="py-3.5 px-6 text-center">Standard</td>
                <td className="py-3.5 px-6 text-center text-purple-400 font-semibold">Priority Zero-Latency</td>
              </tr>
              <tr>
                <td className="py-3.5 px-6 font-medium text-white">Support SLA</td>
                <td className="py-3.5 px-6 text-center">Community</td>
                <td className="py-3.5 px-6 text-center text-purple-400 font-semibold">24/7 Direct Telegram</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Frequently Asked Questions Accordion */}
      <div className="space-y-6 max-w-3xl mx-auto">
        <h2 className="text-2xl font-bold text-white text-center">Frequently Asked Questions</h2>
        <div className="space-y-3">
          {faqs.map((faq, idx) => (
            <div
              key={idx}
              className="rounded-xl border border-slate-800 bg-[#0B0F19] overflow-hidden transition-colors"
            >
              <button
                onClick={() => toggleFaq(idx)}
                className="w-full py-4 px-5 text-left text-sm font-semibold text-white flex items-center justify-between hover:bg-slate-900/50 cursor-pointer"
              >
                <span>{faq.q}</span>
                <ChevronDown
                  size={16}
                  className={`text-slate-400 transition-transform duration-200 ${
                    openFaq === idx ? 'rotate-180 text-cyan-400' : ''
                  }`}
                />
              </button>
              {openFaq === idx && (
                <div className="px-5 pb-4 text-xs text-slate-400 leading-relaxed border-t border-slate-800/60 pt-3">
                  {faq.a}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
