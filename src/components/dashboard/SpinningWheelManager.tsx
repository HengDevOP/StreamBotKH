'use client';

import React, { useState, useRef } from 'react';
import {
  Disc,
  Copy,
  Check,
  ExternalLink,
  Sparkles,
  Play,
  RotateCcw,
  Sliders,
  Monitor,
  Plus,
  Trash2,
  Gift,
  Award,
  Lock
} from 'lucide-react';
import { Card } from '../common/Card';
import { Button } from '../common/Button';
import { useAudio } from '../../hooks/useAudio';

interface SpinningWheelManagerProps {
  streamerToken?: string;
  isLocked?: boolean;
  onUpgrade?: () => void;
}

interface WheelSlice {
  id: string;
  label: string;
  color: string;
}

export const SpinningWheelManager: React.FC<SpinningWheelManagerProps> = ({
  streamerToken,
  isLocked = false,
  onUpgrade
}) => {
  const [copiedUrl, setCopiedUrl] = useState(false);
  const [minTipAmount, setMinTipAmount] = useState<number>(2.0);
  const [slices, setSlices] = useState<WheelSlice[]>([
    { id: '1', label: '1v1 Match', color: '#00F0FF' },
    { id: '2', label: 'Custom Song', color: '#A855F7' },
    { id: '3', label: 'Shoutout', color: '#10B981' },
    { id: '4', label: 'Discord VIP', color: '#F59E0B' },
    { id: '5', label: 'Wheel Reroll', color: '#EC4899' },
    { id: '6', label: 'GG Jackpot 👑', color: '#EF4444' }
  ]);
  const [newSliceLabel, setNewSliceLabel] = useState('');

  // Wheel Animation & Simulation State
  const [isSpinning, setIsSpinning] = useState(false);
  const [currentRotation, setCurrentRotation] = useState(0);
  const [winningSlice, setWinningSlice] = useState<string | null>(null);

  const { playSynthNeonChime } = useAudio();

  const obsUrl = `${typeof window !== 'undefined' ? window.location.origin : ''}/widget/wheel/${streamerToken || 'streamer-token'}`;

  const copyObsUrl = () => {
    navigator.clipboard.writeText(obsUrl);
    setCopiedUrl(true);
    setTimeout(() => setCopiedUrl(false), 2000);
  };

  const handleAddSlice = () => {
    if (!newSliceLabel.trim() || slices.length >= 12) return;
    const colors = ['#00F0FF', '#A855F7', '#10B981', '#F59E0B', '#EC4899', '#3B82F6', '#EF4444'];
    const color = colors[slices.length % colors.length];
    setSlices([...slices, { id: Date.now().toString(), label: newSliceLabel.trim(), color }]);
    setNewSliceLabel('');
  };

  const handleRemoveSlice = (id: string) => {
    if (slices.length <= 2) return;
    setSlices(slices.filter((s) => s.id !== id));
  };

  const handleSpinWheel = () => {
    if (isSpinning || slices.length === 0) return;
    setIsSpinning(true);
    setWinningSlice(null);

    // Calculate random rotations: 5 full turns (1800 deg) + random slice angle
    const extraRotations = 5 * 360;
    const randomAngle = Math.floor(Math.random() * 360);
    const totalRotation = currentRotation + extraRotations + randomAngle;

    setCurrentRotation(totalRotation);

    playSynthNeonChime();

    setTimeout(() => {
      setIsSpinning(false);
      // Determine winning slice (pointer is at the top: 270 deg or 90 deg)
      const degreesPerSlice = 360 / slices.length;
      const normalizedAngle = (360 - (totalRotation % 360)) % 360;
      const sliceIndex = Math.floor(normalizedAngle / degreesPerSlice);
      const winner = slices[sliceIndex % slices.length]?.label || slices[0].label;
      setWinningSlice(winner);
    }, 4000);
  };

  return (
    <div className="space-y-6">
      {/* OBS Browser Source URL Card */}
      <Card className="p-5 sm:p-6 bg-[#090D18] border border-purple-500/20 shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Disc size={16} className="text-purple-400" />
              <h3 className="text-sm font-bold text-white font-['Chakra_Petch'] uppercase tracking-wider">
                Wheels OBS Browser Source
              </h3>
              {isLocked ? (
                <span className="flex items-center gap-1 text-[10px] font-mono px-2 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 font-bold">
                  <Lock size={10} />
                  PRO ONLY
                </span>
              ) : (
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-purple-500/10 border border-purple-500/30 text-purple-400 font-bold">
                  PRO ACTIVE
                </span>
              )}
            </div>
            <p className="text-xs text-slate-400">
              Interactive stream wheel widget that automatically spins when a viewer sends a qualifying donation tip.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={copyObsUrl}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-purple-400 hover:bg-purple-300 text-slate-950 font-bold text-xs transition-all shadow-[0_0_15px_rgba(168,85,247,0.25)]"
            >
              {copiedUrl ? <Check size={14} /> : <Copy size={14} />}
              <span>{copiedUrl ? 'Copied URL!' : 'Copy Wheel URL'}</span>
            </button>
            <a
              href={obsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="p-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-white transition-colors"
              title="Open Wheel Widget"
            >
              <ExternalLink size={15} />
            </a>
          </div>
        </div>

        <input
          type="text"
          readOnly
          value={obsUrl}
          className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-300 font-mono text-xs select-all focus:outline-none"
        />
      </Card>

      {/* Pro Locked Callout Banner */}
      {isLocked && (
        <div className="p-6 sm:p-7 rounded-2xl bg-gradient-to-br from-amber-950/30 via-slate-900/80 to-slate-950 border border-amber-500/30 relative overflow-hidden">
          <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-5">
            <div className="space-y-2 max-w-xl">
              <div className="flex items-center gap-2">
                <span className="p-1.5 rounded-lg bg-amber-500/20 text-amber-400 border border-amber-500/40">
                  <Lock size={16} />
                </span>
                <span className="text-xs font-mono text-amber-400 font-bold uppercase tracking-wider">
                  Pro Plan Feature
                </span>
              </div>
              <h3 className="text-lg sm:text-xl font-bold text-white font-['Chakra_Petch']">
                Unlock Interactive Wheels on Stream
              </h3>
              <p className="text-xs text-slate-300 leading-relaxed">
                The Wheels overlay allows viewers to trigger automated on-screen reward spins during your live broadcast when they donate. Upgrade to the Pro plan to customize wheel rewards, minimum tip amounts, and live OBS browser integration.
              </p>
            </div>
            <div className="flex-shrink-0">
              <Button
                variant="primary"
                size="md"
                onClick={onUpgrade || (() => window.open('https://t.me/@hchenheng', '_blank', 'noopener,noreferrer'))}
                className="bg-gradient-to-r from-amber-500 to-yellow-400 hover:from-amber-600 hover:to-yellow-500 text-slate-950 font-extrabold shadow-lg shadow-amber-500/20 flex items-center gap-2"
              >
                <Sparkles size={15} />
                <span>Upgrade to Pro</span>
                <ExternalLink size={14} />
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Main Wheel Configuration & Live Preview */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Configuration Panel */}
        <div className="lg:col-span-5 space-y-5">
          <Card className="p-5 bg-[#090D18] border border-slate-800 space-y-5">
            <div className="pb-3 border-b border-slate-800 flex items-center justify-between">
              <h4 className="text-sm font-bold text-white font-['Chakra_Petch'] flex items-center gap-2">
                <Sliders size={16} className="text-purple-400" />
                Wheels Rewards
              </h4>
              <span className="text-xs font-mono text-purple-400 font-bold">{slices.length} Rewards</span>
            </div>

            {/* Min Tip to Trigger Spin */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs font-mono">
                <label className="text-slate-300 font-bold">Min Tip to Spin Wheel ($)</label>
                <span className="text-purple-400 font-bold">${minTipAmount.toFixed(2)}</span>
              </div>
              <input
                type="number"
                step={0.5}
                min={0.5}
                value={minTipAmount}
                onChange={(e) => setMinTipAmount(Math.max(0.5, parseFloat(e.target.value) || 1.0))}
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white font-mono text-xs focus:outline-none focus:border-purple-400"
              />
            </div>

            {/* Slice List */}
            <div className="space-y-2">
              <label className="text-xs font-mono font-bold text-slate-300 block">Wheel Slices</label>
              <div className="space-y-1.5 max-h-52 overflow-y-auto pr-1">
                {slices.map((slice, idx) => (
                  <div
                    key={slice.id}
                    className="flex items-center justify-between p-2 rounded-xl bg-slate-950 border border-slate-800 text-xs font-mono"
                  >
                    <div className="flex items-center gap-2">
                      <span className="w-3.5 h-3.5 rounded-full flex-shrink-0" style={{ backgroundColor: slice.color }} />
                      <span className="text-slate-200 font-medium truncate max-w-[170px]">{slice.label}</span>
                    </div>
                    {slices.length > 2 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveSlice(slice.id)}
                        className="text-slate-500 hover:text-red-400 transition-colors p-1"
                      >
                        <Trash2 size={13} />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Add New Slice */}
            <div className="space-y-2 pt-2 border-t border-slate-800">
              <label className="text-xs font-mono font-bold text-slate-300 block">Add New Reward</label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  placeholder="e.g. 100 Diamonds"
                  value={newSliceLabel}
                  onChange={(e) => setNewSliceLabel(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleAddSlice()}
                  className="flex-1 px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white font-mono text-xs focus:outline-none focus:border-purple-400"
                />
                <Button
                  variant="primary"
                  size="sm"
                  onClick={handleAddSlice}
                  disabled={!newSliceLabel.trim() || slices.length >= 12}
                  className="bg-purple-500 hover:bg-purple-400 text-slate-950 font-bold"
                  icon={<Plus size={14} />}
                >
                  Add
                </Button>
              </div>
            </div>
          </Card>
        </div>

        {/* Right: Live Interactive Wheel Simulator */}
        <div className="lg:col-span-7 space-y-3">
          <div className="flex items-center justify-between text-xs font-mono">
            <span className="text-slate-300 font-bold flex items-center gap-1.5">
              <Monitor size={14} className="text-purple-400" />
              Live Wheels Simulator (OBS Widget)
            </span>
            <span className="text-slate-500 text-[11px]">Click Spin to simulate</span>
          </div>

          <div className="w-full rounded-2xl bg-[#040711] border border-slate-800 p-8 flex flex-col items-center justify-center min-h-[420px] relative overflow-hidden">
            {/* Transparent checkerboard */}
            <div
              className="absolute inset-0 opacity-15 pointer-events-none"
              style={{
                backgroundImage: `linear-gradient(45deg, #1e293b 25%, transparent 25%), linear-gradient(-45deg, #1e293b 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #1e293b 75%), linear-gradient(-45deg, transparent 75%, #1e293b 75%)`,
                backgroundSize: '20px 20px',
                backgroundPosition: '0 0, 0 10px, 10px -10px, -10px 0px'
              }}
            />

            {/* Pointer / Needle at Top */}
            <div className="relative z-20 flex flex-col items-center -mb-3">
              <div className="w-0 h-0 border-l-[12px] border-l-transparent border-r-[12px] border-r-transparent border-t-[22px] border-t-amber-400 drop-shadow-[0_4px_8px_rgba(0,0,0,0.8)]" />
            </div>

            {/* CSS Rotating Wheel Canvas */}
            <div className="relative z-10 w-64 h-64 sm:w-72 sm:h-72 flex items-center justify-center">
              <div
                style={{
                  transform: `rotate(${currentRotation}deg)`,
                  transition: isSpinning ? 'transform 4s cubic-bezier(0.15, 0.9, 0.25, 1)' : 'none',
                  background: `conic-gradient(${slices
                    .map((s, i) => `${s.color} ${(i / slices.length) * 100}% ${((i + 1) / slices.length) * 100}%`)
                    .join(', ')})`
                }}
                className="w-full h-full rounded-full border-4 border-slate-900 shadow-[0_0_40px_rgba(168,85,247,0.35)] relative overflow-hidden flex items-center justify-center"
              >
                {/* Center Core Cap */}
                <div className="w-16 h-16 rounded-full bg-slate-950 border-4 border-slate-800 flex items-center justify-center shadow-2xl z-10">
                  <Disc size={20} className="text-purple-400 animate-spin-slow" />
                </div>
              </div>
            </div>

            {/* Spin Action Controls */}
            <div className="relative z-20 mt-6 flex flex-col items-center gap-3">
              <Button
                variant="primary"
                size="md"
                onClick={handleSpinWheel}
                disabled={isSpinning}
                icon={<Play size={15} className={isSpinning ? 'animate-spin' : ''} />}
                className="px-6 py-2.5 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-400 hover:to-pink-400 text-white font-extrabold text-sm shadow-[0_0_25px_rgba(168,85,247,0.4)]"
              >
                {isSpinning ? 'SPINNING WHEEL...' : 'SPIN WHEEL'}
              </Button>

              {/* Winning Banner Alert */}
              {winningSlice && (
                <div className="animate-bounce p-3 px-5 rounded-2xl bg-purple-950/90 border border-purple-400 text-center shadow-[0_0_20px_rgba(168,85,247,0.5)]">
                  <span className="text-[10px] font-mono uppercase tracking-wider text-purple-300 font-bold block">
                    WINNING REWARD
                  </span>
                  <span className="text-base font-extrabold text-white font-['Chakra_Petch']">
                    🎉 {winningSlice}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};