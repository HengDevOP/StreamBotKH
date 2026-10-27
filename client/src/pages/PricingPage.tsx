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
  ChevronDown
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
      return annualBilling ? '6,400 ៛' : '8,000 ៛';
    }
    return annualBilling ? '$1.59' : '$1.99';
  };

  const getStudioPrice = () => {
    if (currency === 'KHR') {
      return annualBilling ? '16,000 ៛' : '20,000 ៛';
    }
    return annualBilling ? '$3.99' : '$4.99';
  };

  const faqs = [
    {
      q: 'What is the platform fee on each plan?',
      a: 'The Free Starter plan includes a 10% platform fee on incoming tips. Pro ($1.99/month) and Studio ($4.99/month) have 0% platform fees with no fee cuts, so you keep 100% of your earnings.'
    },
    {
      q: 'Which Cambodian banks are supported by Bakong KHQR?',
      a: 'All 40+ member financial institutions of the National Bank of Cambodia Bakong system, including ABA Mobile, Acleda toanChet, Canadia, Sathapana, Wing, CPBank, and Chip Mong Bank.'
    },
    {
      q: 'Can I stream simultaneously to multiple platforms (Twitch, YouTube, TikTok, Facebook)?',
      a: 'Yes! The OBS browser source operates completely independent of your streaming destination. Any platform that captures your OBS canvas will show your alerts.'
    },
    {
      q: 'How does Text-to-Speech (TTS) work for Khmer and English?',
      a: 'The alert overlay uses the native Web Speech API in your OBS browser source to pronounce donor names and messages smoothly without external paid voice server delays.'
    },
    {
      q: 'Can I cancel or switch my plan at any time?',
      a: 'Yes, you can upgrade, downgrade, or cancel whenever you wish directly from your streamer dashboard settings.'
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
          Simple, affordable plans for Cambodian streamers
        </h1>
        <p className="text-base text-slate-400 max-w-2xl mx-auto leading-relaxed">
          Start free with standard 10% fee, or eliminate all fee cuts with Pro at just $1.99/month.
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

      {/* Pricing Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* Plan 1: Starter (Free - 10% fee) */}
        <div className="rounded-2xl border border-slate-800 bg-[#0B0F19] p-8 flex flex-col justify-between hover:border-slate-700 transition-colors">
          <div className="space-y-6">
            <div className="space-y-2">
              <span className="text-xs font-mono uppercase tracking-wider text-slate-400 font-semibold">Free Starter</span>
              <div className="text-3xl font-extrabold text-white">
                {currency === 'KHR' ? '0 ៛' : '$0'}
                <span className="text-sm font-normal text-slate-400 ml-1">/ month</span>
              </div>
              <p className="text-xs text-amber-400 font-mono font-medium">10% platform fee per donation</p>
              <p className="text-xs text-slate-400">Essential alert tools for creators just starting out.</p>
            </div>

            <div className="h-px bg-slate-800" />

            <ul className="space-y-3.5 text-xs text-slate-300">
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
                <span>Platform fee cut on tips</span>
              </li>
              <li className="flex items-center gap-3">
                <Check size={16} className="text-cyan-400 flex-shrink-0" />
                <span>Web Audio alert chimes</span>
              </li>
              <li className="flex items-center gap-3 text-slate-600">
                <span className="w-4 text-center">-</span>
                <span>Telegram bot push alerts</span>
              </li>
              <li className="flex items-center gap-3 text-slate-600">
                <span className="w-4 text-center">-</span>
                <span>Text-to-Speech (TTS) reader</span>
              </li>
            </ul>
          </div>

          <div className="pt-8">
            <button
              onClick={() => onNavigate('dashboard')}
              className="w-full py-2.5 px-4 rounded-xl text-xs font-bold uppercase tracking-wider text-white bg-slate-800 hover:bg-slate-700 border border-slate-700 transition-colors"
            >
              Start Free (10% Fee)
            </button>
          </div>
        </div>

        {/* Plan 2: Pro Streamer ($1.99/mo - 0% fee) */}
        <div className="rounded-2xl border-2 border-cyan-500/80 bg-[#0E1424] p-8 flex flex-col justify-between relative">
          <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full bg-cyan-500 text-slate-950 font-mono text-[10px] font-bold uppercase tracking-widest">
            RECOMMENDED
          </div>

          <div className="space-y-6">
            <div className="space-y-2">
              <span className="text-xs font-mono uppercase tracking-wider text-cyan-400 font-semibold">Pro Streamer</span>
              <div className="text-3xl font-extrabold text-white">
                {getProPrice()}
                <span className="text-sm font-normal text-slate-400 ml-1">/ month</span>
              </div>
              <p className="text-xs text-emerald-400 font-mono font-semibold">0% platform fee (No fee cut)</p>
              <p className="text-xs text-slate-400">Keep 100% of your donations with full automation.</p>
            </div>

            <div className="h-px bg-slate-800" />

            <ul className="space-y-3.5 text-xs text-slate-200">
              <li className="flex items-center gap-3">
                <Check size={16} className="text-cyan-400 flex-shrink-0" />
                <span className="font-semibold text-emerald-400">0% fee cut on all donations</span>
              </li>
              <li className="flex items-center gap-3">
                <Check size={16} className="text-cyan-400 flex-shrink-0" />
                <span>ABA PayWay instant pushback webhook</span>
              </li>
              <li className="flex items-center gap-3">
                <Check size={16} className="text-cyan-400 flex-shrink-0" />
                <span>Telegram Bot real-time alerts (/start)</span>
              </li>
              <li className="flex items-center gap-3">
                <Check size={16} className="text-cyan-400 flex-shrink-0" />
                <span>Text-to-Speech (TTS) voice donor reader</span>
              </li>
              <li className="flex items-center gap-3">
                <Check size={16} className="text-cyan-400 flex-shrink-0" />
                <span>Alert Box Studio: Custom GIF & Audio</span>
              </li>
              <li className="flex items-center gap-3">
                <Check size={16} className="text-cyan-400 flex-shrink-0" />
                <span>Zero-latency queued alert dispatcher</span>
              </li>
            </ul>
          </div>

          <div className="pt-8">
            <button
              onClick={() => onNavigate('dashboard')}
              className="w-full py-2.5 px-4 rounded-xl text-xs font-bold uppercase tracking-wider text-slate-950 bg-cyan-400 hover:bg-cyan-300 transition-colors"
            >
              Upgrade to Pro ($1.99/mo)
            </button>
          </div>
        </div>

        {/* Plan 3: Studio & Esports ($4.99/mo - 0% fee) */}
        <div className="rounded-2xl border border-slate-800 bg-[#0B0F19] p-8 flex flex-col justify-between hover:border-slate-700 transition-colors">
          <div className="space-y-6">
            <div className="space-y-2">
              <span className="text-xs font-mono uppercase tracking-wider text-purple-400 font-semibold">Studio & Esports</span>
              <div className="text-3xl font-extrabold text-white">
                {getStudioPrice()}
                <span className="text-sm font-normal text-slate-400 ml-1">/ month</span>
              </div>
              <p className="text-xs text-emerald-400 font-mono font-semibold">0% platform fee (No fee cut)</p>
              <p className="text-xs text-slate-400">For tournament hosts, studios, and production crews.</p>
            </div>

            <div className="h-px bg-slate-800" />

            <ul className="space-y-3.5 text-xs text-slate-300">
              <li className="flex items-center gap-3">
                <Check size={16} className="text-purple-400 flex-shrink-0" />
                <span className="font-semibold text-emerald-400">0% fee cut on all donations</span>
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
                <span>Webhook forwarding to custom backend</span>
              </li>
              <li className="flex items-center gap-3">
                <Check size={16} className="text-purple-400 flex-shrink-0" />
                <span>Priority 24/7 direct Telegram support</span>
              </li>
            </ul>
          </div>

          <div className="pt-8">
            <button
              onClick={() => onNavigate('dashboard')}
              className="w-full py-2.5 px-4 rounded-xl text-xs font-bold uppercase tracking-wider text-white bg-slate-800 hover:bg-slate-700 border border-slate-700 transition-colors"
            >
              Get Studio ($4.99/mo)
            </button>
          </div>
        </div>
      </div>

      {/* Feature Comparison Matrix */}
      <div className="space-y-6">
        <h2 className="text-2xl font-bold text-white text-center">Feature Breakdown</h2>
        <div className="overflow-x-auto rounded-2xl border border-slate-800 bg-[#0B0F19]">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="border-b border-slate-800 bg-slate-900/50 text-[11px] font-mono uppercase tracking-wider text-slate-400">
              <tr>
                <th className="py-4 px-6 font-semibold">Feature</th>
                <th className="py-4 px-6 font-semibold text-center">Starter ($0)</th>
                <th className="py-4 px-6 font-semibold text-center text-cyan-400">Pro ($1.99/mo)</th>
                <th className="py-4 px-6 font-semibold text-center">Studio ($4.99/mo)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              <tr>
                <td className="py-3.5 px-6 font-medium text-white">Platform Commission Cut</td>
                <td className="py-3.5 px-6 text-center text-amber-400 font-bold">10% Fee</td>
                <td className="py-3.5 px-6 text-center text-emerald-400 font-bold">0% (No cut)</td>
                <td className="py-3.5 px-6 text-center text-emerald-400 font-bold">0% (No cut)</td>
              </tr>
              <tr>
                <td className="py-3.5 px-6 font-medium text-white">Bakong KHQR Dynamic Checkout</td>
                <td className="py-3.5 px-6 text-center"><Check size={16} className="inline text-cyan-400" /></td>
                <td className="py-3.5 px-6 text-center"><Check size={16} className="inline text-cyan-400" /></td>
                <td className="py-3.5 px-6 text-center"><Check size={16} className="inline text-cyan-400" /></td>
              </tr>
              <tr>
                <td className="py-3.5 px-6 font-medium text-white">ABA PayWay Instant Pushback</td>
                <td className="py-3.5 px-6 text-center text-slate-600">-</td>
                <td className="py-3.5 px-6 text-center"><Check size={16} className="inline text-cyan-400" /></td>
                <td className="py-3.5 px-6 text-center"><Check size={16} className="inline text-cyan-400" /></td>
              </tr>
              <tr>
                <td className="py-3.5 px-6 font-medium text-white">OBS 60FPS Browser Overlay</td>
                <td className="py-3.5 px-6 text-center"><Check size={16} className="inline text-cyan-400" /></td>
                <td className="py-3.5 px-6 text-center"><Check size={16} className="inline text-cyan-400" /></td>
                <td className="py-3.5 px-6 text-center"><Check size={16} className="inline text-cyan-400" /></td>
              </tr>
              <tr>
                <td className="py-3.5 px-6 font-medium text-white">Telegram Alert Bot Integration</td>
                <td className="py-3.5 px-6 text-center text-slate-600">-</td>
                <td className="py-3.5 px-6 text-center"><Check size={16} className="inline text-cyan-400" /></td>
                <td className="py-3.5 px-6 text-center"><Check size={16} className="inline text-cyan-400" /></td>
              </tr>
              <tr>
                <td className="py-3.5 px-6 font-medium text-white">Web Speech TTS Donor Voice</td>
                <td className="py-3.5 px-6 text-center text-slate-600">-</td>
                <td className="py-3.5 px-6 text-center"><Check size={16} className="inline text-cyan-400" /></td>
                <td className="py-3.5 px-6 text-center"><Check size={16} className="inline text-cyan-400" /></td>
              </tr>
              <tr>
                <td className="py-3.5 px-6 font-medium text-white">Alert Queue Buffer</td>
                <td className="py-3.5 px-6 text-center">Basic</td>
                <td className="py-3.5 px-6 text-center text-cyan-400 font-semibold">Priority</td>
                <td className="py-3.5 px-6 text-center text-cyan-400 font-semibold">Priority</td>
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
                className="w-full py-4 px-5 text-left text-sm font-semibold text-white flex items-center justify-between hover:bg-slate-900/50"
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
