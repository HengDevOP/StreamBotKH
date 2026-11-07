'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  Disc,
  Play,
  RotateCcw,
  Sliders,
  Monitor,
  Plus,
  Trash2,
  Gift,
  Award,
  Lock,
  Volume2,
  Check,
  AlertCircle,
  Sparkles,
  ExternalLink,
  Radio,
  Percent
} from 'lucide-react';
import { Card } from '../common/Card';
import { Button } from '../common/Button';
import { useAudio } from '../../hooks/useAudio';

export interface WheelSlice {
  id: string;
  label: string;
  color: string;
  percentage: number;
}

interface SpinningWheelManagerProps {
  streamerToken?: string;
  streamerUsername?: string;
  isLocked?: boolean;
  onUpgrade?: () => void;
}

const PRESET_COLORS = [
  '#00F0FF',
  '#A855F7',
  '#10B981',
  '#F59E0B',
  '#EC4899',
  '#3B82F6',
  '#EF4444',
  '#8B5CF6',
  '#14B8A6',
  '#F97316'
];

const SOUND_PRESETS = [
  { id: 'synth-neon', name: 'Cyber Synth Chime', url: '/sounds/neon-chime.mp3' },
  { id: 'kaching', name: 'Cash Register (Ka-ching)', url: '/sounds/cash-register-kaching.mp3' },
  { id: 'mario', name: 'Mario Coin', url: '/sounds/mario-coin.mp3' },
  { id: 'hitmarker', name: 'Hitmarker Sound', url: '/sounds/memes/meme-hitmarker.mp3' },
  { id: 'discord', name: 'Discord Ping', url: '/sounds/memes/meme-discord-ping.mp3' },
  { id: 'cheer', name: 'Crowd Cheer', url: '/sounds/memes/oh-crowd.mp3' },
  { id: 'custom', name: 'Custom Audio URL', url: '' }
];

const DEFAULT_SLICES: WheelSlice[] = [
  { id: '1', label: '1v1 Match', color: '#00F0FF', percentage: 20 },
  { id: '2', label: 'Custom Song', color: '#A855F7', percentage: 20 },
  { id: '3', label: 'Shoutout', color: '#10B981', percentage: 20 },
  { id: '4', label: 'Discord VIP', color: '#F59E0B', percentage: 15 },
  { id: '5', label: 'Wheel Reroll', color: '#EC4899', percentage: 15 },
  { id: '6', label: 'GG Jackpot 👑', color: '#EF4444', percentage: 10 }
];

export const SpinningWheelManager: React.FC<SpinningWheelManagerProps> = ({
  streamerToken,
  streamerUsername,
  isLocked = false,
  onUpgrade
}) => {
  const effectiveToken = streamerToken || 'demo-token';
  const { playSound } = useAudio();

  // Settings State
  const [isEnabled, setIsEnabled] = useState<boolean>(false);
  const [minTipAmount, setMinTipAmount] = useState<number>(2.0);
  const [spinSoundUrl, setSpinSoundUrl] = useState<string>('/sounds/neon-chime.mp3');
  const [customSoundUrl, setCustomSoundUrl] = useState<string>('');
  const [slices, setSlices] = useState<WheelSlice[]>(DEFAULT_SLICES);

  // New Slice Form
  const [newSliceLabel, setNewSliceLabel] = useState('');
  const [newSliceColor, setNewSliceColor] = useState('#00F0FF');
  const [newSlicePercentage, setNewSlicePercentage] = useState<number>(15);

  // Persistence & Toast State
  const [initialSettings, setInitialSettings] = useState<string>('');
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [isPlayingSound, setIsPlayingSound] = useState(false);

  // Simulator State
  const [isSpinning, setIsSpinning] = useState(false);
  const [currentRotation, setCurrentRotation] = useState(0);
  const [winningSlice, setWinningSlice] = useState<string | null>(null);
  const [simVisible, setSimVisible] = useState(true);
  const [simCountdown, setSimCountdown] = useState<number | null>(null);

  // Load from MongoDB on mount
  useEffect(() => {
    fetch(`/api/widgets/wheel?token=${encodeURIComponent(effectiveToken)}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.success && data.settings) {
          const s = data.settings;
          setIsEnabled(Boolean(s.isEnabled));
          setMinTipAmount(Number(s.minTipAmount) || 2.0);
          setSpinSoundUrl(s.spinSoundUrl || '/sounds/neon-chime.mp3');
          if (Array.isArray(s.slices) && s.slices.length > 0) {
            setSlices(s.slices);
          }
          setInitialSettings(
            JSON.stringify({
              isEnabled: Boolean(s.isEnabled),
              minTipAmount: Number(s.minTipAmount) || 2.0,
              spinSoundUrl: s.spinSoundUrl || '/sounds/neon-chime.mp3',
              slices: Array.isArray(s.slices) && s.slices.length > 0 ? s.slices : DEFAULT_SLICES
            })
          );
        }
      })
      .catch(() => {});
  }, [effectiveToken]);

  // Determine if settings have unsaved modifications
  const currentSettingsStr = useMemo(() => {
    return JSON.stringify({
      isEnabled,
      minTipAmount,
      spinSoundUrl: spinSoundUrl === 'custom' ? customSoundUrl : spinSoundUrl,
      slices
    });
  }, [isEnabled, minTipAmount, spinSoundUrl, customSoundUrl, slices]);

  const isDirty = useMemo(() => {
    if (!initialSettings) return false;
    return initialSettings !== currentSettingsStr;
  }, [initialSettings, currentSettingsStr]);

  // Slices percentage calculations
  const totalPercentage = useMemo(() => {
    return slices.reduce((acc, s) => acc + (Number(s.percentage) || 0), 0);
  }, [slices]);

  // Automatically balance slice percentages to sum to 100%
  const handleAutoBalance = () => {
    if (slices.length === 0) return;
    const basePct = Math.floor(100 / slices.length);
    const remainder = 100 - basePct * slices.length;
    const updated = slices.map((s, idx) => ({
      ...s,
      percentage: basePct + (idx < remainder ? 1 : 0)
    }));
    setSlices(updated);
  };

  const handleAddSlice = () => {
    if (!newSliceLabel.trim() || slices.length >= 12) return;
    const color = newSliceColor || PRESET_COLORS[slices.length % PRESET_COLORS.length];
    const newSlice: WheelSlice = {
      id: Date.now().toString(),
      label: newSliceLabel.trim(),
      color,
      percentage: Math.max(1, Number(newSlicePercentage) || 10)
    };
    setSlices([...slices, newSlice]);
    setNewSliceLabel('');
    setNewSliceColor(PRESET_COLORS[(slices.length + 1) % PRESET_COLORS.length]);
  };

  const handleRemoveSlice = (id: string) => {
    if (slices.length <= 2) return;
    setSlices(slices.filter((s) => s.id !== id));
  };

  const handleUpdateSlice = (id: string, updates: Partial<WheelSlice>) => {
    setSlices(slices.map((s) => (s.id === id ? { ...s, ...updates } : s)));
  };

  const handlePlaySoundPreview = async (urlToPlay: string) => {
    if (isPlayingSound) return;
    setIsPlayingSound(true);
    try {
      await playSound(urlToPlay || '/sounds/neon-chime.mp3', 0.8);
    } catch {}
    setIsPlayingSound(false);
  };

  // Save Settings to MongoDB
  const handleSaveChanges = async () => {
    setIsSaving(true);
    try {
      const activeSound = spinSoundUrl === 'custom' ? customSoundUrl : spinSoundUrl;
      const res = await fetch('/api/widgets/wheel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token: effectiveToken,
          action: 'save_settings',
          settings: {
            isEnabled,
            minTipAmount,
            spinSoundUrl: activeSound,
            slices,
            streamerUsername
          }
        })
      });

      const data = await res.json();
      if (data.success) {
        setSaveError(null);
        setInitialSettings(
          JSON.stringify({
            isEnabled,
            minTipAmount,
            spinSoundUrl: activeSound,
            slices
          })
        );
      } else {
        setSaveError(data.error || 'Failed to save wheel settings.');
      }
    } catch (err: any) {
      setSaveError(err.message || 'Network error while saving settings.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleResetChanges = () => {
    if (!initialSettings) return;
    try {
      const parsed = JSON.parse(initialSettings);
      setIsEnabled(parsed.isEnabled ?? false);
      setMinTipAmount(parsed.minTipAmount ?? 2.0);
      setSpinSoundUrl(parsed.spinSoundUrl ?? '/sounds/neon-chime.mp3');
      setSlices(parsed.slices || DEFAULT_SLICES);
    } catch {}
  };

  // Wheel Simulation & Test Broadcast
  const handleSimulateSpin = () => {
    if (isSpinning || slices.length === 0) return;
    setIsSpinning(true);
    setWinningSlice(null);
    setSimCountdown(null);
    setSimVisible(true);

    const activeSound = spinSoundUrl === 'custom' ? customSoundUrl : spinSoundUrl;
    playSound(activeSound || '/sounds/neon-chime.mp3', 0.8);

    // Pick winner based on weights
    const totalWeight = slices.reduce((acc, s) => acc + (Number(s.percentage) || (100 / slices.length)), 0);
    let rand = Math.random() * totalWeight;
    let selectedWinner = slices[0];
    for (const s of slices) {
      const weight = Number(s.percentage) || (100 / slices.length);
      if (rand <= weight) {
        selectedWinner = s;
        break;
      }
      rand -= weight;
    }

    const degreesPerSlice = 360 / slices.length;
    const sliceIndex = slices.findIndex((s) => s.id === selectedWinner.id);
    const targetSliceAngle = (sliceIndex >= 0 ? sliceIndex : 0) * degreesPerSlice + degreesPerSlice / 2;
    const extraRotations = 5 * 360;
    const nextRotation = currentRotation + extraRotations + (360 - (targetSliceAngle % 360));

    setCurrentRotation(nextRotation);

    setTimeout(() => {
      setIsSpinning(false);
      setWinningSlice(selectedWinner.label);

      // Countdown 5 seconds, then fade out
      let remaining = 5;
      setSimCountdown(remaining);
      const timer = setInterval(() => {
        remaining -= 1;
        if (remaining <= 0) {
          clearInterval(timer);
          setSimCountdown(null);
          setSimVisible(false);
          setTimeout(() => setWinningSlice(null), 700);
        } else {
          setSimCountdown(remaining);
        }
      }, 1000);
    }, 4000);
  };

  const handleBroadcastTestSpin = async () => {
    if (isSpinning || slices.length === 0) return;
    const activeSound = spinSoundUrl === 'custom' ? customSoundUrl : spinSoundUrl;

    const totalWeight = slices.reduce((acc, s) => acc + (Number(s.percentage) || (100 / slices.length)), 0);
    let rand = Math.random() * totalWeight;
    let selectedWinner = slices[0];
    for (const s of slices) {
      const weight = Number(s.percentage) || (100 / slices.length);
      if (rand <= weight) {
        selectedWinner = s;
        break;
      }
      rand -= weight;
    }

    const degreesPerSlice = 360 / slices.length;
    const sliceIndex = slices.findIndex((s) => s.id === selectedWinner.id);
    const targetSliceAngle = (sliceIndex >= 0 ? sliceIndex : 0) * degreesPerSlice + degreesPerSlice / 2;
    const extraRotations = 5 * 360;
    const totalRotation = currentRotation + extraRotations + (360 - (targetSliceAngle % 360));

    try {
      await fetch('/api/widgets/wheel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token: effectiveToken,
          totalRotation,
          slices,
          winner: selectedWinner.label,
          donorName: 'Test Donor',
          amount: minTipAmount,
          spinSoundUrl: activeSound
        })
      });

      // Also trigger local simulation
      handleSimulateSpin();
    } catch {}
  };

  // Build SVG Pie Slices
  const svgSlices = useMemo(() => {
    if (slices.length === 0) return [];
    const count = slices.length;
    const anglePerSlice = 360 / count;

    return slices.map((slice, i) => {
      const startAngle = i * anglePerSlice;
      const endAngle = (i + 1) * anglePerSlice;

      const r = 135;
      const cx = 150;
      const cy = 150;

      const rad1 = ((startAngle - 90) * Math.PI) / 180;
      const rad2 = ((endAngle - 90) * Math.PI) / 180;

      const x1 = cx + r * Math.cos(rad1);
      const y1 = cy + r * Math.sin(rad1);
      const x2 = cx + r * Math.cos(rad2);
      const y2 = cy + r * Math.sin(rad2);

      const largeArc = anglePerSlice > 180 ? 1 : 0;
      const pathData = `M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 ${largeArc} 1 ${x2} ${y2} Z`;

      const midAngle = (startAngle + endAngle) / 2;
      const midRad = ((midAngle - 90) * Math.PI) / 180;
      const textR = 86;
      const tx = cx + textR * Math.cos(midRad);
      const ty = cy + textR * Math.sin(midRad);

      return {
        id: slice.id,
        label: slice.label,
        color: slice.color,
        pathData,
        tx,
        ty,
        midAngle
      };
    });
  }, [slices]);

  return (
    <div className="space-y-5">
      {/* Pro Locked Callout Banner */}
      {isLocked && (
        <div className="p-5 rounded-2xl bg-[#090D18] border border-amber-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1 max-w-xl">
            <div className="flex items-center gap-2">
              <span className="p-1 rounded bg-amber-500/20 text-amber-400">
                <Lock size={14} />
              </span>
              <span className="text-[11px] font-mono text-amber-400 font-bold uppercase tracking-wider">
                Pro Plan Feature
              </span>
            </div>
            <h3 className="text-base font-bold text-white font-['Chakra_Petch']">
              Interactive Wheels on Stream
            </h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Upgrade to the Pro plan to customize wheel rewards, minimum tip amounts, and live OBS browser integration.
            </p>
          </div>
          <Button
            variant="primary"
            size="sm"
            onClick={onUpgrade || (() => window.open('https://t.me/hchenheng', '_blank', 'noopener,noreferrer'))}
            className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold shrink-0 flex items-center gap-1.5"
          >
            <Sparkles size={14} />
            <span>Upgrade to Pro</span>
            <ExternalLink size={13} />
          </Button>
        </div>
      )}

      {/* Main Wheel Grid: Left Simulator / Right Settings */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* LEFT SIDE: Live Interactive Wheel Simulator */}
        <div className="lg:col-span-5 space-y-3">
          <Card className="p-4 bg-[#090D18] border border-slate-800 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <span className="text-xs font-mono font-bold text-slate-200 flex items-center gap-1.5">
                <Monitor size={14} className="text-purple-400" />
                Live Wheels Simulator (OBS Widget)
              </span>
              <span className="text-[11px] font-mono text-slate-500">
                {isSpinning ? 'Spinning...' : 'Ready'}
              </span>
            </div>

            {/* Simulated Overlay Canvas */}
            <div className="w-full rounded-xl bg-[#040711] border border-slate-800 p-6 flex flex-col items-center justify-center min-h-[380px] relative overflow-hidden">
              {/* Transparent checkerboard background */}
              <div
                className="absolute inset-0 opacity-15 pointer-events-none"
                style={{
                  backgroundImage: `linear-gradient(45deg, #1e293b 25%, transparent 25%), linear-gradient(-45deg, #1e293b 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #1e293b 75%), linear-gradient(-45deg, transparent 75%, #1e293b 75%)`,
                  backgroundSize: '20px 20px',
                  backgroundPosition: '0 0, 0 10px, 10px -10px, -10px 0px'
                }}
              />

              {/* Wheel Container with smooth fade-in / fade-out */}
              <div
                className={`flex flex-col items-center justify-center transition-opacity duration-700 ${
                  simVisible ? 'opacity-100' : 'opacity-25'
                }`}
              >
                {/* Pointer Arrow at Top */}
                <div className="relative z-20 flex flex-col items-center -mb-3">
                  <div className="w-0 h-0 border-l-[11px] border-l-transparent border-r-[11px] border-r-transparent border-t-[20px] border-t-amber-400 drop-shadow-[0_4px_8px_rgba(0,0,0,0.8)]" />
                </div>

                {/* SVG Circular Wheel */}
                <div className="relative z-10 w-64 h-64 flex items-center justify-center">
                  <svg
                    viewBox="0 0 300 300"
                    className="w-full h-full drop-shadow-[0_0_30px_rgba(168,85,247,0.3)]"
                    style={{
                      transform: `rotate(${currentRotation}deg)`,
                      transition: isSpinning
                        ? 'transform 4s cubic-bezier(0.12, 0.8, 0.32, 1), filter 0.4s ease'
                        : 'filter 0.4s ease',
                      filter: winningSlice ? 'blur(6px) brightness(0.7)' : 'none'
                    }}
                  >
                    {svgSlices.map((s) => (
                      <g key={s.id}>
                        <path d={s.pathData} fill={s.color} stroke="#0f172a" strokeWidth="2.5" />
                        <text
                          x={s.tx}
                          y={s.ty}
                          textAnchor="middle"
                          dominantBaseline="middle"
                          transform={`rotate(${s.midAngle - 90}, ${s.tx}, ${s.ty})`}
                          fill="#FFFFFF"
                          fontWeight="bold"
                          fontSize="11"
                          fontFamily="Chakra Petch"
                          className="drop-shadow"
                        >
                          {s.label.length > 14 ? `${s.label.slice(0, 13)}…` : s.label}
                        </text>
                      </g>
                    ))}

                    {/* Center Hub */}
                    <circle cx="150" cy="150" r="26" fill="#090D18" stroke="#1E293B" strokeWidth="4" />
                    <circle cx="150" cy="150" r="14" fill="#8B5CF6" />
                  </svg>

                  {/* Outcome Popup (centered over the blurred wheel) */}
                  {winningSlice && (
                    <div className="absolute inset-0 z-30 flex items-center justify-center pointer-events-none">
                      <div className="max-w-[85%] px-5 py-3 rounded-2xl bg-slate-950/90 border border-purple-500/60 shadow-2xl text-center animate-in fade-in zoom-in-95 duration-300">
                        <span className="text-[10px] font-mono uppercase tracking-widest text-purple-300 font-bold block">
                          Outcome
                        </span>
                        <span className="text-base font-bold text-white font-['Chakra_Petch'] break-words">
                          {winningSlice}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Status */}
              <div className="relative z-20 mt-4 flex flex-col items-center gap-2 min-h-[16px]">
                {simCountdown !== null && (
                  <span className="text-[11px] font-mono text-slate-400">
                    Fading out in {simCountdown}s...
                  </span>
                )}

                {!simVisible && !isSpinning && (
                  <span className="text-[11px] font-mono text-slate-500">
                    Overlay is currently faded out (invisible until next spin)
                  </span>
                )}
              </div>
            </div>

            {/* Simulator Action Buttons */}
            <div className="grid grid-cols-2 gap-2 pt-1">
              <Button
                variant="primary"
                size="sm"
                onClick={handleSimulateSpin}
                disabled={isSpinning || slices.length === 0}
                icon={<Play size={14} className={isSpinning ? 'animate-spin' : ''} />}
                className="bg-purple-500 hover:bg-purple-400 text-slate-950 font-bold text-xs"
              >
                {isSpinning ? 'Spinning...' : 'Simulate Spin'}
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={handleBroadcastTestSpin}
                disabled={isSpinning || slices.length === 0}
                icon={<Radio size={14} />}
                className="bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs font-mono font-bold"
              >
                Test Broadcast
              </Button>
            </div>
          </Card>
        </div>

        {/* RIGHT SIDE: Wheel Configuration & Rewards Panel */}
        <div className="lg:col-span-7 space-y-4">
          <Card className="p-5 bg-[#090D18] border border-slate-800 space-y-5">
            {/* Top Toggle: Register Feature on Public Donation Page */}
            <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 flex items-center justify-between gap-4">
              <div className="space-y-0.5 min-w-0">
                <div className="flex items-center gap-2">
                  <h4 className="text-sm font-bold text-white font-['Chakra_Petch']">
                    Enable Wheel on Donation Page
                  </h4>
                  <span
                    className={`px-2 py-0.2 rounded text-[10px] font-mono font-bold uppercase ${
                      isEnabled
                        ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                        : 'bg-slate-800 text-slate-400 border border-slate-700'
                    }`}
                  >
                    {isEnabled ? 'ACTIVE TAB' : 'OFF'}
                  </span>
                </div>
                <p className="text-xs text-slate-400 leading-relaxed">
                  When enabled, a new tab called <strong className="text-purple-300 font-mono">"Wheel"</strong> is registered on your public donation page alongside Tip and Subscribe.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setIsEnabled(!isEnabled)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors cursor-pointer shrink-0 ${
                  isEnabled ? 'bg-purple-500' : 'bg-slate-800'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-slate-950 transition-transform ${
                    isEnabled ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>

            {/* Trigger Settings: Min Tip & Spin Sound */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Minimum Tip Amount */}
              <div className="space-y-1.5">
                <label className="text-xs font-mono font-bold text-slate-300 flex items-center justify-between">
                  <span>Min Tip to Spin ($ USD)</span>
                  <span className="text-purple-400">${minTipAmount.toFixed(2)}</span>
                </label>
                <input
                  type="number"
                  step={0.5}
                  min={0.5}
                  value={minTipAmount}
                  onChange={(e) => setMinTipAmount(Math.max(0.25, parseFloat(e.target.value) || 1.0))}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white font-mono text-xs focus:outline-none focus:border-purple-400"
                />
              </div>

              {/* Custom Spin Sound */}
              <div className="space-y-1.5">
                <label className="text-xs font-mono font-bold text-slate-300 flex items-center justify-between">
                  <span>Spin Sound Effect</span>
                  <button
                    type="button"
                    onClick={() => handlePlaySoundPreview(spinSoundUrl === 'custom' ? customSoundUrl : spinSoundUrl)}
                    disabled={isPlayingSound}
                    className="text-purple-400 hover:text-purple-300 text-[11px] font-mono flex items-center gap-1 cursor-pointer"
                  >
                    <Volume2 size={12} className={isPlayingSound ? 'animate-pulse' : ''} />
                    <span>{isPlayingSound ? 'Playing...' : 'Preview'}</span>
                  </button>
                </label>
                <select
                  value={spinSoundUrl}
                  onChange={(e) => setSpinSoundUrl(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white font-mono text-xs focus:outline-none focus:border-purple-400"
                >
                  {SOUND_PRESETS.map((snd) => (
                    <option key={snd.id} value={snd.id === 'custom' ? 'custom' : snd.url}>
                      {snd.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Custom Sound URL input if chosen */}
            {spinSoundUrl === 'custom' && (
              <div className="space-y-1.5 pt-1">
                <label className="text-xs font-mono font-bold text-slate-300 block">Custom Sound Audio URL</label>
                <input
                  type="url"
                  placeholder="https://your-domain.com/audio.mp3"
                  value={customSoundUrl}
                  onChange={(e) => setCustomSoundUrl(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white font-mono text-xs focus:outline-none focus:border-purple-400"
                />
              </div>
            )}

            {/* Slices & Rewards Configuration */}
            <div className="space-y-3 pt-3 border-t border-slate-800">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <h4 className="text-xs font-mono font-bold text-slate-200 uppercase tracking-wider">
                    Wheel Slices &amp; Probabilities ({slices.length}/12)
                  </h4>
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                      totalPercentage === 100
                        ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                        : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                    }`}
                  >
                    Total: {totalPercentage}%
                  </span>
                </div>

                {totalPercentage !== 100 && (
                  <button
                    type="button"
                    onClick={handleAutoBalance}
                    className="text-[11px] font-mono text-purple-400 hover:text-purple-300 font-bold underline cursor-pointer"
                  >
                    Auto-Balance to 100%
                  </button>
                )}
              </div>

              {/* Slices List (Contained Scroll) */}
              <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                {slices.map((slice, idx) => (
                  <div
                    key={slice.id}
                    className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between gap-3 text-xs font-mono"
                  >
                    {/* Color Swatch & Preset Picker */}
                    <div className="flex items-center gap-2 shrink-0">
                      <input
                        type="color"
                        value={slice.color}
                        onChange={(e) => handleUpdateSlice(slice.id, { color: e.target.value })}
                        className="w-6 h-6 rounded-lg cursor-pointer bg-transparent border-0 p-0"
                        title="Choose slice color"
                      />
                    </div>

                    {/* Slice Label */}
                    <input
                      type="text"
                      value={slice.label}
                      onChange={(e) => handleUpdateSlice(slice.id, { label: e.target.value })}
                      placeholder="Reward label..."
                      className="flex-1 min-w-0 px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-white font-mono text-xs focus:outline-none focus:border-purple-400"
                    />

                    {/* Percentage (%) Input */}
                    <div className="flex items-center gap-1 shrink-0">
                      <input
                        type="number"
                        min={1}
                        max={100}
                        value={slice.percentage}
                        onChange={(e) =>
                          handleUpdateSlice(slice.id, {
                            percentage: Math.max(1, Math.min(100, parseInt(e.target.value) || 1))
                          })
                        }
                        className="w-14 px-2 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-purple-300 font-mono text-xs text-center focus:outline-none focus:border-purple-400"
                      />
                      <span className="text-slate-400 text-xs">%</span>
                    </div>

                    {/* Remove Slice Button */}
                    <button
                      type="button"
                      onClick={() => handleRemoveSlice(slice.id)}
                      disabled={slices.length <= 2}
                      className="text-slate-500 hover:text-red-400 disabled:opacity-30 disabled:hover:text-slate-500 transition-colors p-1"
                      title="Remove Slice"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
              </div>

              {/* Add New Slice Section */}
              {slices.length < 12 && (
                <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/80 space-y-2">
                  <span className="text-[11px] font-mono font-bold text-slate-300 block">Add New Slice</span>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={newSliceColor}
                      onChange={(e) => setNewSliceColor(e.target.value)}
                      className="w-8 h-8 rounded-lg cursor-pointer bg-transparent border-0 p-0 shrink-0"
                      title="New slice color"
                    />
                    <input
                      type="text"
                      placeholder="Reward label (e.g. VIP Pass, 100 Diamonds)"
                      value={newSliceLabel}
                      onChange={(e) => setNewSliceLabel(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleAddSlice()}
                      className="flex-1 px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-white font-mono text-xs focus:outline-none focus:border-purple-400"
                    />
                    <div className="flex items-center gap-1 shrink-0">
                      <input
                        type="number"
                        min={1}
                        max={100}
                        value={newSlicePercentage}
                        onChange={(e) => setNewSlicePercentage(Math.max(1, parseInt(e.target.value) || 10))}
                        className="w-14 px-2 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-purple-300 font-mono text-xs text-center focus:outline-none focus:border-purple-400"
                        title="Probability Percentage"
                      />
                      <span className="text-slate-400 text-xs">%</span>
                    </div>
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={handleAddSlice}
                      disabled={!newSliceLabel.trim() || slices.length >= 12}
                      className="bg-purple-500 hover:bg-purple-400 text-slate-950 font-bold shrink-0 text-xs"
                      icon={<Plus size={14} />}
                    >
                      Add
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </Card>
        </div>
      </div>

      {/* Floating Save Changes Bar: slides up when there are unsaved changes, slides back down once saved/reset */}
      <div
        aria-hidden={!isDirty}
        className={`fixed bottom-6 left-1/2 z-50 flex items-center gap-3 px-5 py-3 rounded-2xl bg-slate-900/95 border shadow-[0_10px_35px_rgba(0,0,0,0.8)] backdrop-blur-md transition-all duration-300 ease-out ${
          saveError ? 'border-red-500/50' : 'border-purple-500/50'
        } ${
          isDirty
            ? '-translate-x-1/2 translate-y-0 opacity-100 pointer-events-auto'
            : '-translate-x-1/2 translate-y-[calc(100%+2rem)] opacity-0 pointer-events-none'
        }`}
      >
        <div className="flex items-center gap-2">
          <span className={`w-2.5 h-2.5 rounded-full ${saveError ? 'bg-red-400' : 'bg-purple-400 animate-pulse'}`} />
          <span className={`text-xs font-mono font-medium ${saveError ? 'text-red-300' : 'text-slate-200'}`}>
            {saveError || 'Careful — you have unsaved wheel changes!'}
          </span>
        </div>

        <div className="h-4 w-px bg-slate-700 mx-1" />

        <button
          type="button"
          onClick={() => {
            setSaveError(null);
            handleResetChanges();
          }}
          disabled={isSaving}
          tabIndex={isDirty ? 0 : -1}
          className="px-3 py-1.5 rounded-xl text-xs font-mono font-bold text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
        >
          Reset
        </button>

        <Button
          type="button"
          variant="primary"
          size="sm"
          onClick={handleSaveChanges}
          loading={isSaving}
          tabIndex={isDirty ? 0 : -1}
          className="bg-purple-500 hover:bg-purple-400 text-slate-950 font-bold text-xs px-4 py-1.5 rounded-xl shadow-md shadow-purple-500/20"
        >
          Save Changes
        </Button>
      </div>
    </div>
  );
};
