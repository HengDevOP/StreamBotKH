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
  Tag,
  Clock
} from 'lucide-react';
import { Button } from '../components/common/Button';
import { request } from '../services/api';
import { PromotionConfig } from '../components/dashboard/AdminPromotionManager';

interface PricingPageProps {
  onNavigate: (page: string) => void;
}

export const PricingPage: React.FC<PricingPageProps> = ({ onNavigate }) => {
  const [currency, setCurrency] = useState<'USD' | 'KHR'>('USD');
  const [annualBilling, setAnnualBilling] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [promo, setPromo] = useState<PromotionConfig | null>(null);

  useEffect(() => {
    request<PromotionConfig>('/promotions')
      .then((data) => setPromo(data))
      .catch(() => {});
  }, []);

  const toggleFaq = (index: number) => {
    setOpenFaq(openFaq === index ? null : index);
  };

  const getProPrice = () => {
    const isPromoActive = Boolean(promo?.isActive);
    if (currency === 'KHR') {
      const baseKhr = isPromoActive ? promo!.promoPriceKhr : promo?.originalPriceKhr ?? 20000;
      const finalKhr = annualBilling ? Math.round(baseKhr * 0.8) : baseKhr;
      return `${finalKhr.toLocaleString()} ៛`;
    }
    const baseUsd = isPromoActive ? promo!.promoPriceUsd : promo?.originalPriceUsd ?? 4.99;
    const finalUsd = annualBilling ? Number((baseUsd * 0.8).toFixed(2)) : baseUsd;
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
      a: 'The Free plan ($0) includes 20MB media storage, Donations Alerts, and the Payment Gateway (ABA PayWay & Bakong KHQR) with a 10% platform fee on incoming tips. The Pro plan ($4.99/mo or $3.99/mo annual) eliminates the platform fee (0% fee - keep 100% of your earnings), removes the donation page watermark, expands storage to 500MB (supporting MP4, GIF, MP3, WAV & all formats), and unlocks all advanced stream assets: Leaderboard, Goals, Subathon Timer, Soundboard, Video Alerts, and Spinning Wheels.'
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
    <div className="min-h-screen py-16 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto space-y-20">
      {/* Header */}
      <div className="text-center space-y-4 max-w-3xl mx-auto">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-900 border border-slate-800 text-xs font-mono text-cyan-400">
          <Sparkles size={13} />
          <span>TRANSPARENT CREATOR PRICING</span>
        </div>
        <h1 className="text-4xl sm:text-5xl font-extrabold text-white tracking-tight">
          Simple, transparent plans for Cambodian streamers
        </h1>
        <p className="text-base text-slate-400 max-w-2xl mx-auto leading-relaxed">
          Start free with Donations Alerts, Payment Gateway, and 20MB storage, or upgrade to Pro to unlock Leaderboard, Goals, Timer, Soundboard, Video Alerts, Spinning Wheels, 500MB storage, and 0% fee.
        </p>

        {/* Currency & Billing Controls */}
        <div className="flex flex-wrap items-center justify-center gap-4 pt-4">
          {/* Monthly / Annual Toggle */}
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
              <span className="text-[10px] px-1.5 py-0.2 rounded bg-black/20 font-bold">Save 20%</span>
            </button>
          </div>

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

      {/* Active Promotion Hero Banner */}
      {promo?.isActive && (
        <div className="max-w-5xl mx-auto p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-purple-950/80 via-[#151029] to-cyan-950/60 border border-purple-500/50 shadow-xl shadow-purple-500/10 flex flex-col sm:flex-row items-center justify-between gap-4 animate-fadeIn">
          <div className="flex items-center gap-3.5 text-center sm:text-left">
            <div className="w-10 h-10 rounded-xl bg-purple-500/20 border border-purple-500/40 flex items-center justify-center text-cyan-400 flex-shrink-0 mx-auto sm:mx-0">
              <Tag size={18} />
            </div>
            <div>
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                <span className="text-xs font-mono font-extrabold uppercase tracking-wider text-cyan-400">
                  {promo.promoTitle}
                </span>
                {promo.discountPercent > 0 && (
                  <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 font-mono text-[10px] font-bold">
                    SAVE {promo.discountPercent}%
                  </span>
                )}
              </div>
              <p className="text-xs sm:text-sm text-slate-200 font-medium mt-0.5">
                Upgrade to Pro Plan for just <span className="text-emerald-400 font-bold font-mono">{getProPrice()}/mo</span>{' '}
                <span className="text-slate-500 line-through font-mono text-xs">{getOriginalProPrice()}</span> during our promotional period!
              </p>
            </div>
          </div>

          {(promo.startDate || promo.endDate) && (
            <div className="px-3.5 py-2 rounded-xl bg-slate-950/70 border border-purple-500/30 text-[11px] font-mono text-purple-200 flex items-center gap-2 flex-shrink-0">
              <Clock size={13} className="text-cyan-400" />
              <span>
                {promo.startDate
                  ? new Date(promo.startDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                  : 'Now'}{' '}
                &rarr;{' '}
                {promo.endDate
                  ? new Date(promo.endDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                  : 'Limited Time'}
              </span>
            </div>
          )}
        </div>
      )}

      {/* 2 Plans Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-5xl mx-auto items-stretch">
        {/* Plan 1: Free Plan */}
        <div className="rounded-2xl border border-slate-800 bg-[#0B0F19] p-7 sm:p-8 flex flex-col h-full justify-between hover:border-slate-700 transition-colors shadow-xl">
          <div className="flex-1 flex flex-col">
            <div className="space-y-2">
              <span className="text-xs font-mono uppercase tracking-wider text-slate-400 font-bold">FREE PLAN</span>
              <div className="text-3xl font-extrabold text-white">
                {currency === 'KHR' ? '0 ៛' : '$0'}
                <span className="text-sm font-normal text-slate-400 ml-1">/ month</span>
              </div>
              <p className="text-xs text-amber-400 font-mono font-medium">10% platform fee per donation</p>
              <p className="text-xs text-slate-400">Everything you need to start accepting donations with Payment Gateway &amp; live OBS alerts.</p>
            </div>

            <div className="h-px bg-slate-800 my-6" />

            <ul className="space-y-3.5 text-xs text-slate-300 flex-1">
              <li className="flex items-center gap-3 text-cyan-300 font-semibold">
                <Check size={16} className="text-cyan-400 flex-shrink-0" />
                <span>20MB Media Storage Quota</span>
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
              <li className="flex items-center gap-3 text-amber-300">
                <span className="font-mono font-bold text-amber-400">10%</span>
                <span>Platform fee cut on incoming tips</span>
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
              Start Free (20MB Storage)
            </button>
          </div>
        </div>

        {/* Plan 2: Pro Plan ($4.99/mo - 0% fee, 10GB storage, Payment Gateway) */}
        <div className="rounded-2xl border-2 border-purple-500/80 bg-[#120E22] p-7 sm:p-8 flex flex-col h-full justify-between relative shadow-2xl shadow-purple-500/10">
          <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3.5 py-0.5 rounded-full bg-gradient-to-r from-purple-500 to-cyan-400 text-slate-950 font-mono text-[10px] font-extrabold uppercase tracking-widest shadow-lg shadow-purple-500/30 whitespace-nowrap">
            {promo?.isActive
              ? `${promo.promoTitle} • ${promo.discountPercent}% OFF`
              : 'RECOMMENDED • 0% FEE'}
          </div>

          <div className="flex-1 flex flex-col">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono uppercase tracking-wider text-purple-400 font-bold">PRO PLAN</span>
                {promo?.isActive && promo.discountPercent > 0 && (
                  <span className="px-2 py-0.5 rounded bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 font-mono text-[10px] font-bold">
                    PROMO -{promo.discountPercent}%
                  </span>
                )}
              </div>
              <div className="flex items-baseline gap-2.5">
                <span className="text-3xl font-extrabold text-white">
                  {getProPrice()}
                </span>
                {promo?.isActive && (
                  <span className="text-sm font-mono text-slate-500 line-through">
                    {getOriginalProPrice()}
                  </span>
                )}
                <span className="text-sm font-normal text-slate-400">/ month</span>
              </div>
              <p className="text-xs text-emerald-400 font-mono font-semibold">0% platform fee (Keep 100% of tips)</p>
              {promo?.isActive && promo.endDate && (
                <p className="text-[11px] text-cyan-300 font-mono flex items-center gap-1.5">
                  <Clock size={12} className="text-cyan-400" />
                  <span>
                    Promo ends {new Date(promo.endDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </span>
                </p>
              )}
              <p className="text-xs text-slate-400">Unlocks Leaderboard, Goals, Timer, Soundboard, Video Alerts, Spinning Wheels &amp; 500MB storage.</p>
            </div>

            <div className="h-px bg-purple-500/20 my-6" />

            <ul className="space-y-3.5 text-xs text-slate-200 flex-1">
              <li className="flex items-center gap-3 text-emerald-300 font-semibold">
                <Check size={16} className="text-emerald-400 flex-shrink-0" />
                <span>Unlock Leaderboard, Goals &amp; Subathon Timer</span>
              </li>
              <li className="flex items-center gap-3 text-emerald-300 font-semibold">
                <Check size={16} className="text-emerald-400 flex-shrink-0" />
                <span>Unlock Soundboard, Video Alerts &amp; Spinning Wheels</span>
              </li>
              <li className="flex items-center gap-3">
                <Check size={16} className="text-emerald-400 flex-shrink-0" />
                <span className="font-semibold text-emerald-400">0% platform fee cut (Keep 100% of tips)</span>
              </li>
              <li className="flex items-center gap-3 text-emerald-300 font-semibold">
                <Check size={16} className="text-emerald-400 flex-shrink-0" />
                <span>Removed Watermark (Clean Donation Page)</span>
              </li>
              <li className="flex items-center gap-3 text-purple-300 font-semibold">
                <Check size={16} className="text-purple-400 flex-shrink-0" />
                <span>500MB Media Cloud Storage (MP4, GIF, MP3, WAV & All Formats)</span>
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

          <div className="mt-8 pt-6 border-t border-purple-500/30 w-full">
            <button
              onClick={() => onNavigate('dashboard')}
              className="w-full py-3 px-4 rounded-xl text-xs font-extrabold uppercase tracking-wider text-slate-950 bg-gradient-to-r from-purple-500 via-pink-500 to-cyan-400 hover:opacity-95 transition-all shadow-lg shadow-purple-500/25 cursor-pointer"
            >
              Get Pro Plan ({getProPrice()}/mo)
            </button>
          </div>
        </div>
      </div>

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
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              <tr>
                <td className="py-3.5 px-6 font-medium text-white">Media Storage Limit (MP4, GIF, MP3, WAV, All Formats)</td>
                <td className="py-3.5 px-6 text-center text-cyan-400 font-bold">20MB</td>
                <td className="py-3.5 px-6 text-center text-purple-400 font-bold">500MB</td>
              </tr>
              <tr>
                <td className="py-3.5 px-6 font-medium text-white">Platform Commission Cut</td>
                <td className="py-3.5 px-6 text-center text-amber-400 font-bold">10% Fee</td>
                <td className="py-3.5 px-6 text-center text-emerald-400 font-bold">0% (Keep 100%)</td>
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
