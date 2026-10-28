'use client';

import React, { useEffect } from 'react';
import { ArrowLeft, Heart, Sparkles, ShieldCheck, BadgeCheck } from 'lucide-react';
import { Card } from '../common/Card';
import { Button } from '../common/Button';
import confetti from 'canvas-confetti';

interface DonationSuccessProps {
  donorName: string;
  bankingName?: string;
  amount: number;
  currency: string;
  streamerName: string;
  customThanksMessage?: string;
  isVerified?: boolean;
  onReset: () => void;
}

export const DonationSuccess: React.FC<DonationSuccessProps> = ({
  donorName,
  bankingName = 'Bakong KHQR',
  amount,
  currency,
  streamerName,
  customThanksMessage,
  isVerified,
  onReset
}) => {
  useEffect(() => {
    try {
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.5 },
        colors: ['#10B981', '#00F0FF', '#FF007A', '#FBBF24']
      });
    } catch (e) {}
  }, []);

  const formattedAmount = currency === 'KHR'
    ? `${amount.toLocaleString()} ៛`
    : `$${amount.toFixed(2)}`;

  // Interpolate streamer's custom thanks message or fallback to warm default
  let displayMessage = '';
  if (customThanksMessage && customThanksMessage.trim()) {
    displayMessage = customThanksMessage
      .replace(/\{donor\}/gi, donorName || 'Supporter')
      .replace(/\{donator\}/gi, donorName || 'Supporter')
      .replace(/\{name\}/gi, donorName || 'Supporter')
      .replace(/\{amount\}/gi, formattedAmount)
      .replace(/\{currency\}/gi, currency || 'USD')
      .replace(/\{streamer\}/gi, streamerName || 'Creator');
  } else {
    displayMessage = `Thank you so much, ${donorName || 'Supporter'}! Your tip of ${formattedAmount} has been verified and broadcast live on ${streamerName}'s stream.`;
  }

  return (
    <Card className="p-7 sm:p-9 text-center space-y-6 max-w-lg mx-auto bg-[#090D18] border border-emerald-500/30 rounded-3xl shadow-[0_0_40px_rgba(16,185,129,0.12)] animate-fadeIn relative overflow-hidden">
      <style>{`
        @keyframes drawCircle {
          0% { stroke-dashoffset: 155; opacity: 0; }
          100% { stroke-dashoffset: 0; opacity: 1; }
        }
        @keyframes drawCheck {
          0% { stroke-dashoffset: 50; opacity: 0; transform: scale(0.85); }
          100% { stroke-dashoffset: 0; opacity: 1; transform: scale(1); }
        }
      `}</style>

      {/* Ambient background glows */}
      <div className="absolute -top-16 -left-16 w-44 h-44 bg-emerald-500/10 blur-3xl rounded-full pointer-events-none" />
      <div className="absolute -bottom-16 -right-16 w-44 h-44 bg-cyan-500/10 blur-3xl rounded-full pointer-events-none" />

      {/* Sleek Animated SVG Tick / Checkmark */}
      <div className="relative w-24 h-24 mx-auto flex items-center justify-center">
        <div className="absolute inset-0 rounded-full bg-emerald-500/20 blur-xl animate-pulse" />
        <svg
          className="w-24 h-24 drop-shadow-[0_0_18px_rgba(16,185,129,0.55)]"
          viewBox="0 0 52 52"
          fill="none"
        >
          {/* Outer circle stroke */}
          <circle
            cx="26"
            cy="26"
            r="23"
            stroke="#10B981"
            strokeWidth="3.5"
            strokeLinecap="round"
            style={{
              strokeDasharray: 155,
              animation: 'drawCircle 0.65s cubic-bezier(0.65, 0, 0.45, 1) forwards'
            }}
          />
          {/* Checkmark tick */}
          <path
            d="M15 27 L22.5 34.5 L37 19"
            stroke="#10B981"
            strokeWidth="4"
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{
              strokeDasharray: 50,
              animation: 'drawCheck 0.45s cubic-bezier(0.65, 0, 0.45, 1) 0.35s both',
              transformOrigin: '26px 26px'
            }}
          />
        </svg>
      </div>

      {/* Creator Custom Thank You Section */}
      <div className="space-y-3 relative z-10">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-xs font-mono font-bold tracking-wide">
          <ShieldCheck size={14} className="text-emerald-400" />
          <span>PAYMENT VERIFIED &amp; ALERT BROADCAST</span>
        </div>

        <h2 className="text-2xl sm:text-3xl font-extrabold text-white font-['Chakra_Petch'] tracking-wide">
          THANK YOU FOR YOUR SUPPORT!
        </h2>

        {/* Custom Thanks Message from Streamer Account Settings */}
        <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 text-slate-200 text-sm leading-relaxed font-sans shadow-inner">
          <p className="whitespace-pre-line font-medium text-slate-100">
            "{displayMessage}"
          </p>
          <div className="mt-2.5 pt-2 border-t border-slate-800/80 flex items-center justify-center gap-2 text-xs font-mono text-cyan-400">
            <Heart size={13} className="text-pink-500 fill-pink-500" />
            <span>from <b className="text-white">{streamerName}</b></span>
            {isVerified && (
              <span title="Verified Creator" className="inline-flex items-center text-cyan-400">
                <BadgeCheck size={14} className="text-cyan-400 fill-cyan-400/20" />
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Clean Verified Tip Summary */}
      <div className="p-3.5 rounded-2xl bg-slate-950/60 border border-slate-800/90 text-xs font-mono flex items-center justify-between px-5 text-slate-400 relative z-10">
        <span>Total Tip Amount</span>
        <span className="text-sm font-extrabold text-emerald-400 font-mono tracking-tight">
          {formattedAmount}
        </span>
      </div>

      <Button
        variant="primary"
        size="md"
        onClick={onReset}
        icon={<ArrowLeft size={16} />}
        className="w-full py-3.5 bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-400 hover:to-cyan-400 text-slate-950 font-extrabold text-sm rounded-xl shadow-lg shadow-emerald-500/20 cursor-pointer"
      >
        Send Another Tip
      </Button>
    </Card>
  );
};
