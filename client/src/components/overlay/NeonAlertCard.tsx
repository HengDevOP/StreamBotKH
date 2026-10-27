import React from 'react';
import { Sparkles, Heart, Zap, Flame, Crown } from 'lucide-react';
import { LiveAlertPayload } from '../../types/alert';

interface NeonAlertCardProps {
  alert: LiveAlertPayload;
}

export const NeonAlertCard: React.FC<NeonAlertCardProps> = ({ alert }) => {
  const {
    donorName,
    donorMessage,
    amount,
    currency,
    glowColor = '#00F0FF',
    customGifUrl,
    templateStyle = 'neon-box'
  } = alert;

  const formattedAmount = currency === 'KHR'
    ? `${amount.toLocaleString()} ៛`
    : `$${amount.toFixed(2)}`;

  const defaultGif = 'https://media.giphy.com/media/l41lT4n6ylgW2hh04/giphy.gif';
  const displayGif = customGifUrl || defaultGif;
  const isVipTip = amount >= 20;

  return (
    <div
      className="relative flex flex-col items-center justify-center p-6 text-center animate-bounce-subtle"
      style={{
        maxWidth: '560px',
        width: '100%'
      }}
    >
      {/* Outer Holographic Container */}
      <div
        className="w-full relative rounded-3xl p-7 bg-slate-950/95 backdrop-blur-2xl border-2 transition-all duration-500 overflow-hidden"
        style={{
          borderColor: glowColor,
          boxShadow: `0 0 40px ${glowColor}66, 0 0 80px ${glowColor}22, inset 0 0 20px ${glowColor}33`
        }}
      >
        {/* Animated Cyber Corner Accents */}
        <div
          className="absolute top-0 left-0 w-6 h-6 border-t-4 border-l-4"
          style={{ borderColor: glowColor }}
        />
        <div
          className="absolute top-0 right-0 w-6 h-6 border-t-4 border-r-4"
          style={{ borderColor: glowColor }}
        />
        <div
          className="absolute bottom-0 left-0 w-6 h-6 border-b-4 border-l-4"
          style={{ borderColor: glowColor }}
        />
        <div
          className="absolute bottom-0 right-0 w-6 h-6 border-b-4 border-r-4"
          style={{ borderColor: glowColor }}
        />

        {/* Top VIP / Hype Ribbon */}
        <div className="flex items-center justify-center gap-2 mb-3">
          <div
            className="px-3 py-1 rounded-full text-xs font-mono font-black uppercase tracking-widest flex items-center gap-1.5 shadow-md"
            style={{
              backgroundColor: `${glowColor}25`,
              color: glowColor,
              border: `1px solid ${glowColor}66`
            }}
          >
            {isVipTip ? <Crown size={14} className="text-yellow-400 fill-yellow-400" /> : <Flame size={14} />}
            <span>{isVipTip ? 'LEGENDARY WHALE TIP' : 'NEW TIP BROADCAST'}</span>
          </div>
        </div>

        {/* Mascot / GIF Reaction with Glowing Halo */}
        <div className="relative mb-4 flex justify-center">
          <div
            className="w-28 h-28 sm:w-32 sm:h-32 rounded-3xl overflow-hidden border-2 p-1.5 bg-slate-900 shadow-2xl relative"
            style={{ borderColor: glowColor }}
          >
            <img
              src={displayGif}
              alt="Reaction Mascot"
              className="w-full h-full object-cover rounded-2xl"
            />
          </div>

          <div
            className="absolute -top-2 -right-2 w-9 h-9 rounded-full flex items-center justify-center text-slate-950 font-black shadow-lg animate-spin"
            style={{ backgroundColor: glowColor, animationDuration: '6s' }}
          >
            <Zap size={18} fill="currentColor" />
          </div>
        </div>

        {/* Headline: Donor & Amount */}
        <div className="space-y-2">
          <div className="flex items-center justify-center gap-2">
            <Sparkles size={20} style={{ color: glowColor }} />
            <h2 className="text-3xl sm:text-4xl font-black tracking-wide text-white uppercase font-['Chakra_Petch'] leading-none">
              {donorName}
            </h2>
            <Sparkles size={20} style={{ color: glowColor }} />
          </div>

          {alert.bankingName && (
            <div className="flex items-center justify-center">
              <span className="px-2.5 py-0.5 rounded-md bg-slate-900/90 border border-slate-700 text-[11px] font-mono text-cyan-300 font-semibold">
                via {alert.bankingName}
              </span>
            </div>
          )}

          {/* Amount Display Pill */}
          <div
            className="inline-block px-6 py-1.5 rounded-2xl bg-slate-900/90 border-2 shadow-2xl"
            style={{ borderColor: glowColor }}
          >
            <span
              className="text-3xl sm:text-4xl font-black font-mono tracking-tight"
              style={{
                color: glowColor,
                textShadow: `0 0 15px ${glowColor}cc, 0 0 30px ${glowColor}66`
              }}
            >
              {formattedAmount}
            </span>
          </div>
        </div>

        {/* Donor Message */}
        {donorMessage && (
          <div className="mt-4 p-4 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-inner">
            <p className="text-base sm:text-xl font-bold text-slate-100 italic leading-snug">
              "{donorMessage}"
            </p>
          </div>
        )}

        {/* Audio Equalizer Waveform Animation */}
        <div className="flex items-center justify-center gap-1 mt-4">
          <div className="w-1 bg-cyan-400 rounded-full eq-bar-1" />
          <div className="w-1 bg-pink-500 rounded-full eq-bar-2" />
          <div className="w-1 bg-purple-400 rounded-full eq-bar-3" />
          <div className="w-1 bg-cyan-400 rounded-full eq-bar-4" />
          <div className="w-1 bg-pink-500 rounded-full eq-bar-5" />
          <div className="w-1 bg-purple-400 rounded-full eq-bar-2" />
          <div className="w-1 bg-cyan-400 rounded-full eq-bar-1" />
        </div>

        {/* Bottom StreamNeon VIP Branding Watermark */}
        <div className="mt-4 pt-3 border-t border-slate-900 flex items-center justify-between text-[10px] font-mono text-slate-400">
          <span className="flex items-center gap-1.5">
            <Heart size={12} className="text-pink-500 fill-pink-500 animate-pulse" />
            <b className="text-slate-300">STREAMNEON.VIP</b>
          </span>
          <span className="uppercase tracking-widest text-[9px] text-cyan-400 font-bold">
            ABA BAKONG KHQR
          </span>
        </div>
      </div>
    </div>
  );
};
