'use client';

import React, { useState } from 'react';
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
  Bot
} from 'lucide-react';
import { Button } from '../components/common/Button';

interface PricingPageProps {
  onNavigate: (page: string) => void;
}

export const PricingPage: React.FC<PricingPageProps> = ({ onNavigate }) => {
  const [currency, setCurrency] = useState<'USD' | 'KHR'>('USD');
  const [annualBilling, setAnnualBilling] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  const toggleFaq = (index: number) => {
    setOpenFaq(openFaq === index ? null : index);
  };

  const getProPrice = () => {
    if (currency === 'KHR') {
      return annualBilling ? '16,000 ៛' : '20,000 ៛';
    }
    return annualBilling ? '$3.99' : '$4.99';
  };

  const faqs = [
    {
      q: 'What are the differences between the Free and Pro plans?',
      a: 'The Free plan ($0) includes 20MB media storage and full access to all 8 interactive streaming widgets (Video Alerts, Spinning Wheels, Soundboard, Leaderboard, Goals, Timer, Donations Alerts, Media Share) with a 10% platform fee on incoming tips. The Pro plan ($4.99/mo or $3.99/mo annual) eliminates the platform fee (0% fee - keep 100% of your earnings), expands storage to 10GB, and unlocks the Payment Gateway (custom ABA PayWay merchant credentials & direct Bakong KHQR) and GramJS Telegram group auto-listener.'
    },
    {
      q: 'How does the Payment Gateway work in the Pro plan?',
      a: 'Pro members gain access to the Payment Gateway Admin to connect their own ABA PayWay Merchant ID and API Key, Bakong Account ID, and GramJS Telegram listener. This allows viewer tips to settle directly into your private business bank account with 0% platform deductions.'
    },
    {
      q: 'Are Video Alerts and Wheels free for everyone?',
      a: 'Yes! Both YouTube Media Share Video Alerts and interactive Spinning Wheels are available on both Free and Pro plans, so every creator can boost chat engagement.'
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
          Start free with all interactive stream widgets and 20MB storage, or upgrade to Pro to unlock the Payment Gateway, Telegram group listener, and keep 100% of your earnings with 0% fee.
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
              <p className="text-xs text-slate-400">Everything you need to launch your stream with all interactive alert widgets.</p>
            </div>

            <div className="h-px bg-slate-800 my-6" />

            <ul className="space-y-3.5 text-xs text-slate-300 flex-1">
              <li className="flex items-center gap-3 text-cyan-300 font-semibold">
                <Check size={16} className="text-cyan-400 flex-shrink-0" />
                <span>20MB Media Storage Quota</span>
              </li>
              <li className="flex items-center gap-3 text-emerald-300 font-semibold">
                <Check size={16} className="text-emerald-400 flex-shrink-0" />
                <span>Video Alerts (Media Share) Included</span>
              </li>
              <li className="flex items-center gap-3 text-emerald-300 font-semibold">
                <Check size={16} className="text-emerald-400 flex-shrink-0" />
                <span>Spinning Wheels Giveaway Widget Included</span>
              </li>
              <li className="flex items-center gap-3">
                <Check size={16} className="text-cyan-400 flex-shrink-0" />
                <span>Soundboard with PC Hotkey SFX Engine</span>
              </li>
              <li className="flex items-center gap-3">
                <Check size={16} className="text-cyan-400 flex-shrink-0" />
                <span>Leaderboard Widget (20 Unique Styles)</span>
              </li>
              <li className="flex items-center gap-3">
                <Check size={16} className="text-cyan-400 flex-shrink-0" />
                <span>Goal Progress Bar & Subathon Timer</span>
              </li>
              <li className="flex items-center gap-3">
                <Check size={16} className="text-cyan-400 flex-shrink-0" />
                <span>Dynamic Bakong KHQR checkout</span>
              </li>
              <li className="flex items-center gap-3">
                <Check size={16} className="text-cyan-400 flex-shrink-0" />
                <span>60FPS OBS browser source overlay</span>
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
                <span>Payment Gateway Admin (ABA PayWay direct credentials)</span>
              </li>
              <li className="flex items-center gap-3 text-slate-600">
                <span className="w-4 text-center">-</span>
                <span>GramJS Telegram Group auto-listener</span>
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
          <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3.5 py-0.5 rounded-full bg-gradient-to-r from-purple-500 to-cyan-400 text-slate-950 font-mono text-[10px] font-extrabold uppercase tracking-widest shadow-lg shadow-purple-500/30">
            RECOMMENDED &bull; 0% FEE
          </div>

          <div className="flex-1 flex flex-col">
            <div className="space-y-2">
              <span className="text-xs font-mono uppercase tracking-wider text-purple-400 font-bold">PRO PLAN</span>
              <div className="text-3xl font-extrabold text-white">
                {getProPrice()}
                <span className="text-sm font-normal text-slate-400 ml-1">/ month</span>
              </div>
              <p className="text-xs text-emerald-400 font-mono font-semibold">0% platform fee (Keep 100% of tips)</p>
              <p className="text-xs text-slate-400">Exclusive Payment Gateway, GramJS Telegram Auto-Listener & 10GB storage.</p>
            </div>

            <div className="h-px bg-purple-500/20 my-6" />

            <ul className="space-y-3.5 text-xs text-slate-200 flex-1">
              <li className="flex items-center gap-3 text-emerald-300 font-semibold">
                <Check size={16} className="text-emerald-400 flex-shrink-0" />
                <span>Direct ABA PayWay Merchant ID & Key Settlement</span>
              </li>
              <li className="flex items-center gap-3 text-emerald-300 font-semibold">
                <Check size={16} className="text-emerald-400 flex-shrink-0" />
                <span>GramJS Telegram Group & Bot Auto-Listener</span>
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
                <span>10GB Media Cloud Storage (High Capacity)</span>
              </li>
              <li className="flex items-center gap-3">
                <Check size={16} className="text-purple-400 flex-shrink-0" />
                <span>Text-to-Speech (TTS) Voice Donor Reader</span>
              </li>
              <li className="flex items-center gap-3">
                <Check size={16} className="text-purple-400 flex-shrink-0" />
                <span>All 8 Stream Assets: Video, Wheels, Soundboard & Leaderboard</span>
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
                <span>Custom domain tip portal</span>
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
                <th className="py-4 px-6 font-semibold text-center text-purple-400 font-bold">Pro ($4.99/mo)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              <tr>
                <td className="py-3.5 px-6 font-medium text-white">Media Storage Limit</td>
                <td className="py-3.5 px-6 text-center text-cyan-400 font-bold">20MB</td>
                <td className="py-3.5 px-6 text-center text-purple-400 font-bold">10GB</td>
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
                <td className="py-3.5 px-6 font-medium text-white">Custom ABA PayWay Direct Settlement</td>
                <td className="py-3.5 px-6 text-center text-slate-600">-</td>
                <td className="py-3.5 px-6 text-center"><Check size={16} className="inline text-emerald-400" /></td>
              </tr>
              <tr>
                <td className="py-3.5 px-6 font-medium text-white">GramJS Telegram Group & Bot Listener</td>
                <td className="py-3.5 px-6 text-center text-slate-600">-</td>
                <td className="py-3.5 px-6 text-center"><Check size={16} className="inline text-emerald-400" /></td>
              </tr>
              <tr>
                <td className="py-3.5 px-6 font-medium text-white">Bakong KHQR Dynamic Checkout</td>
                <td className="py-3.5 px-6 text-center"><Check size={16} className="inline text-cyan-400" /></td>
                <td className="py-3.5 px-6 text-center"><Check size={16} className="inline text-cyan-400" /></td>
              </tr>
              <tr>
                <td className="py-3.5 px-6 font-medium text-white">Video Alerts (YouTube Media Share)</td>
                <td className="py-3.5 px-6 text-center"><Check size={16} className="inline text-emerald-400" /></td>
                <td className="py-3.5 px-6 text-center"><Check size={16} className="inline text-emerald-400" /></td>
              </tr>
              <tr>
                <td className="py-3.5 px-6 font-medium text-white">Interactive Spinning Wheels Widget</td>
                <td className="py-3.5 px-6 text-center"><Check size={16} className="inline text-emerald-400" /></td>
                <td className="py-3.5 px-6 text-center"><Check size={16} className="inline text-emerald-400" /></td>
              </tr>
              <tr>
                <td className="py-3.5 px-6 font-medium text-white">PC Hotkey Soundboard Engine</td>
                <td className="py-3.5 px-6 text-center"><Check size={16} className="inline text-cyan-400" /></td>
                <td className="py-3.5 px-6 text-center"><Check size={16} className="inline text-cyan-400" /></td>
              </tr>
              <tr>
                <td className="py-3.5 px-6 font-medium text-white">Donor Leaderboard (20 Unique Styles)</td>
                <td className="py-3.5 px-6 text-center"><Check size={16} className="inline text-cyan-400" /></td>
                <td className="py-3.5 px-6 text-center"><Check size={16} className="inline text-cyan-400" /></td>
              </tr>
              <tr>
                <td className="py-3.5 px-6 font-medium text-white">Goal Progress Bar & Subathon Timer</td>
                <td className="py-3.5 px-6 text-center"><Check size={16} className="inline text-cyan-400" /></td>
                <td className="py-3.5 px-6 text-center"><Check size={16} className="inline text-cyan-400" /></td>
              </tr>
              <tr>
                <td className="py-3.5 px-6 font-medium text-white">OBS 60FPS Browser Overlay</td>
                <td className="py-3.5 px-6 text-center"><Check size={16} className="inline text-cyan-400" /></td>
                <td className="py-3.5 px-6 text-center"><Check size={16} className="inline text-cyan-400" /></td>
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
