'use client';

import React, { useEffect } from 'react';
import { Sparkles, ArrowLeft, CheckCircle2, Landmark, Heart } from 'lucide-react';
import { Card } from '../common/Card';
import { Button } from '../common/Button';
import confetti from 'canvas-confetti';

interface DonationSuccessProps {
  donorName: string;
  bankingName?: string;
  amount: number;
  currency: string;
  streamerName: string;
  onReset: () => void;
}

export const DonationSuccess: React.FC<DonationSuccessProps> = ({
  donorName,
  bankingName = 'Bakong KHQR',
  amount,
  currency,
  streamerName,
  onReset
}) => {
  useEffect(() => {
    confetti({
      particleCount: 100,
      spread: 70,
      origin: { y: 0.5 },
      colors: ['#00F0FF', '#FF007A', '#39FF14', '#FFE600']
    });
  }, []);

  const formattedAmount = currency === 'KHR'
    ? `${amount.toLocaleString()} ៛`
    : `$${amount.toFixed(2)}`;

  return (
    <Card className="p-8 text-center space-y-6 max-w-lg mx-auto bg-[#0C101C] border border-slate-800 rounded-2xl animate-fadeIn">
      <div className="w-16 h-16 rounded-2xl bg-cyan-500/10 border border-cyan-500/40 flex items-center justify-center mx-auto text-cyan-400">
        <Sparkles size={32} />
      </div>

      <div className="space-y-2">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-mono font-bold">
          <CheckCircle2 size={13} />
          <span>PAYMENT VERIFIED</span>
        </div>
        <h2 className="text-2xl sm:text-3xl font-extrabold text-white font-['Chakra_Petch']">
          TIP DELIVERED! 💥
        </h2>
        <p className="text-sm text-slate-300 leading-relaxed">
          Thank you, <b className="text-cyan-400">{donorName}</b>! Your tip of{' '}
          <b className="text-white font-mono">{formattedAmount}</b> has been broadcast live on{' '}
          <b>{streamerName}</b>'s broadcast.
        </p>
      </div>

      {/* Transaction Details Pill */}
      <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 text-left space-y-2 text-xs">
        <div className="flex items-center justify-between pb-2 border-b border-slate-800/80">
          <span className="text-slate-400">Sender Bank / Wallet</span>
          <span className="text-cyan-400 font-mono font-semibold flex items-center gap-1">
            <Landmark size={12} />
            {bankingName}
          </span>
        </div>
        <div className="flex items-center justify-between pb-2 border-b border-slate-800/80">
          <span className="text-slate-400">Streamer</span>
          <span className="text-white font-semibold">{streamerName}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-slate-400">Settlement Network</span>
          <span className="text-emerald-400 font-mono font-semibold">National Bakong KHQR</span>
        </div>
      </div>

      <Button
        variant="primary"
        size="md"
        onClick={onReset}
        icon={<ArrowLeft size={16} />}
        className="w-full py-3 bg-cyan-400 hover:bg-cyan-300 text-slate-950 font-bold rounded-xl"
      >
        Send Another Tip
      </Button>
    </Card>
  );
};
