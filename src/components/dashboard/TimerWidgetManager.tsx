'use client';

import React, { useState, useEffect } from 'react';
import {
  Timer,
  Play,
  Pause,
  RotateCcw,
  Copy,
  Check,
  ExternalLink,
  Flame,
  Sparkles,
  Sliders,
  Monitor,
  Volume2,
  DollarSign,
  Palette,
  X,
  Layers,
  Eye,
  CheckCircle2
} from 'lucide-react';
import { Card } from '../common/Card';
import { Button } from '../common/Button';
import { useSocket } from '../../context/SocketContext';
import { useAudio } from '../../hooks/useAudio';
import {
  TIMER_TEMPLATES,
  TimerTemplateRenderer,
  TimerTemplateMeta,
  formatTimerParts
} from '../overlay/timerTemplates';

interface TimerWidgetManagerProps {
  streamerToken?: string;
}

export const TimerWidgetManager: React.FC<TimerWidgetManagerProps> = ({ streamerToken }) => {
  const { socket } = useSocket();
  const { playSynthNeonChime } = useAudio();

  const [copiedUrl, setCopiedUrl] = useState(false);
  const [title, setTitle] = useState('SUBATHON COUNTDOWN 🔥');
  const [remainingSeconds, setRemainingSeconds] = useState(7200); // 2 hours
  const [initialHours, setInitialHours] = useState(2);
  const [initialMinutes, setInitialMinutes] = useState(0);
  const [isRunning, setIsRunning] = useState(true);

  // Donation Calculation Rules
  const [rateMinutesPerUsd, setRateMinutesPerUsd] = useState(10.0); // 1$ = 10mins
  const [rateMinutesPerKhr, setRateMinutesPerKhr] = useState(10.0);
  const [maxCapHours, setMaxCapHours] = useState(24);
  const [hasCap, setHasCap] = useState(true);

  // Visual Appearance Customization & 20 Templates
  const [templateStyle, setTemplateStyle] = useState<string>('cyber-neon');
  const [showBackground, setShowBackground] = useState<boolean>(true);
  const [showAnimation, setShowAnimation] = useState<boolean>(true);
  const [glowColor, setGlowColor] = useState('#00F0FF');
  const [fontFamily, setFontFamily] = useState('Chakra Petch');
  const [soundEnabled, setSoundEnabled] = useState(true);

  // Template Modal & Category Filter State
  const [isTemplateModalOpen, setIsTemplateModalOpen] = useState(false);
  const [templateFilter, setTemplateFilter] = useState<
    'All' | 'Cyber' | 'Gaming' | 'Retro' | 'Aesthetic' | 'Minimal' | 'Special'
  >('All');

  // Test simulation state
  const [customTestAmount, setCustomTestAmount] = useState<number>(2.0);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [recentBonusToast, setRecentBonusToast] = useState<string | null>(null);

  const effectiveToken = streamerToken || 'demo-token';
  const obsUrl = `${typeof window !== 'undefined' ? window.location.origin : ''}/overlay/timer/${effectiveToken}`;

  // 1. Fetch initial configuration from database
  useEffect(() => {
    fetch(`/api/widgets/timer?token=${effectiveToken}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.success && data.timer) {
          const t = data.timer;
          setTitle(t.title || 'SUBATHON COUNTDOWN 🔥');
          setRemainingSeconds(t.remainingSeconds ?? 7200);
          const initSec = t.initialSeconds ?? 7200;
          setInitialHours(Math.floor(initSec / 3600));
          setInitialMinutes(Math.floor((initSec % 3600) / 60));
          setIsRunning(t.isRunning ?? true);
          setRateMinutesPerUsd(t.rateMinutesPerUsd ?? 10.0);
          setRateMinutesPerKhr(t.rateMinutesPerKhr ?? 10.0);
          setGlowColor(t.glowColor || '#00F0FF');
          setFontFamily(t.fontFamily || 'Chakra Petch');
          setTemplateStyle(t.templateStyle || 'cyber-neon');
          setShowBackground(t.showBackground !== false);
          setShowAnimation(t.showAnimation !== false);
          setSoundEnabled(t.soundEnabled ?? true);
          if (t.maxCapSeconds) {
            setMaxCapHours(Math.round(t.maxCapSeconds / 3600));
            setHasCap(true);
          } else {
            setHasCap(false);
          }
        }
      })
      .catch((e) => console.error('Error fetching timer config:', e));
  }, [effectiveToken]);

  // 2. Countdown interval in dashboard
  useEffect(() => {
    if (!isRunning) return;

    const interval = setInterval(() => {
      setRemainingSeconds((prev) => Math.max(0, prev - 1));
    }, 1000);

    return () => clearInterval(interval);
  }, [isRunning]);

  // 3. Listen to live socket events (live donations or external timer adjustments)
  useEffect(() => {
    if (!socket) return;

    const handleDonationAlert = (payload: any) => {
      if (!payload) return;
      const tipAmount = Number(payload.amount) || 0;
      if (tipAmount <= 0) return;

      const currency = payload.currency || 'USD';
      const amountInUsd = currency === 'KHR' ? tipAmount / 4000 : tipAmount;
      const minutesToAdd = amountInUsd * rateMinutesPerUsd;
      const secondsToAdd = Math.round(minutesToAdd * 60);

      if (secondsToAdd > 0) {
        addSeconds(secondsToAdd, payload.donorName, tipAmount);
      }
    };

    socket.on('donation:alert', handleDonationAlert);
    socket.on('donation:paid', handleDonationAlert);

    return () => {
      socket.off('donation:alert', handleDonationAlert);
      socket.off('donation:paid', handleDonationAlert);
    };
  }, [socket, rateMinutesPerUsd]);

  const copyObsUrl = () => {
    navigator.clipboard.writeText(obsUrl);
    setCopiedUrl(true);
    setTimeout(() => setCopiedUrl(false), 2000);
  };

  const addSeconds = (seconds: number, donorName?: string, tipAmount?: number) => {
    const maxSec = hasCap ? maxCapHours * 3600 : 86400 * 365;
    const newRemaining = Math.min(maxSec, remainingSeconds + seconds);
    setRemainingSeconds(newRemaining);

    const minutesFormatted = Math.round(seconds / 60);
    const toastText = donorName
      ? `+${minutesFormatted}m from ${donorName} ($${tipAmount || 0})`
      : `+${minutesFormatted}m added`;
    setRecentBonusToast(toastText);
    setTimeout(() => setRecentBonusToast(null), 3500);

    if (soundEnabled) {
      playSynthNeonChime(0.8);
    }

    // Save and broadcast update
    saveTimerState(newRemaining, isRunning, seconds, donorName, tipAmount);
  };

  const subtractSeconds = (seconds: number) => {
    const newRemaining = Math.max(0, remainingSeconds - seconds);
    setRemainingSeconds(newRemaining);
    saveTimerState(newRemaining, isRunning);
  };

  const toggleRunning = () => {
    const nextState = !isRunning;
    setIsRunning(nextState);
    saveTimerState(remainingSeconds, nextState);
  };

  const resetToInitial = () => {
    const initialSec = initialHours * 3600 + initialMinutes * 60;
    setRemainingSeconds(initialSec);
    saveTimerState(initialSec, isRunning);
  };

  const saveTimerState = (
    currentSec: number,
    running: boolean,
    addedSec: number = 0,
    donor?: string,
    amount?: number,
    overrideTemplate?: string,
    overrideColor?: string,
    overrideBg?: boolean,
    overrideAnim?: boolean
  ) => {
    const activeTemplate = overrideTemplate !== undefined ? overrideTemplate : templateStyle;
    const activeColor = overrideColor !== undefined ? overrideColor : glowColor;
    const activeBg = overrideBg !== undefined ? overrideBg : showBackground;
    const activeAnim = overrideAnim !== undefined ? overrideAnim : showAnimation;

    const payload = {
      token: effectiveToken,
      title,
      remainingSeconds: currentSec,
      initialSeconds: initialHours * 3600 + initialMinutes * 60,
      rateMinutesPerUsd: Number(rateMinutesPerUsd),
      rateMinutesPerKhr: Number(rateMinutesPerKhr),
      isRunning: running,
      glowColor: activeColor,
      fontFamily,
      templateStyle: activeTemplate,
      showBackground: activeBg,
      showAnimation: activeAnim,
      soundEnabled,
      maxCapSeconds: hasCap ? maxCapHours * 3600 : 86400 * 365,
      addedSeconds: addedSec,
      donorName: donor,
      tipAmount: amount
    };

    fetch('/api/widgets/timer', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    }).catch((e) => console.error('Error saving timer state:', e));
  };

  const handleToggleShowBackground = () => {
    const nextVal = !showBackground;
    setShowBackground(nextVal);
    saveTimerState(remainingSeconds, isRunning, 0, undefined, undefined, undefined, undefined, nextVal, undefined);
  };

  const handleToggleShowAnimation = () => {
    const nextVal = !showAnimation;
    setShowAnimation(nextVal);
    saveTimerState(remainingSeconds, isRunning, 0, undefined, undefined, undefined, undefined, undefined, nextVal);
  };

  const handleSelectTemplateFromModal = (templateId: string, previewColor: string) => {
    setTemplateStyle(templateId);
    setGlowColor(previewColor);
    setIsTemplateModalOpen(false);
    saveTimerState(
      remainingSeconds,
      isRunning,
      0,
      undefined,
      undefined,
      templateId,
      previewColor
    );
  };

  const handleSaveAllSettings = () => {
    saveTimerState(remainingSeconds, isRunning);
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2500);
  };

  const handleSimulateDonation = (amount: number, currency: 'USD' | 'KHR' = 'USD') => {
    const amountInUsd = currency === 'KHR' ? amount / 4000 : amount;
    const minutesToAdd = amountInUsd * rateMinutesPerUsd;
    const secondsToAdd = Math.round(minutesToAdd * 60);

    addSeconds(secondsToAdd, 'CyberValkyrie', amount);
  };

  const currentTemplate =
    TIMER_TEMPLATES.find((t) => t.id === templateStyle) || TIMER_TEMPLATES[0];

  const filteredTemplates =
    templateFilter === 'All'
      ? TIMER_TEMPLATES
      : TIMER_TEMPLATES.filter((t) => t.category === templateFilter);

  return (
    <div className="space-y-6">
      {/* ============================================================== */}
      {/* HEADER WITH OBS BROWSER SOURCE URL                            */}
      {/* ============================================================== */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl bg-[#090D18] border border-slate-800">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-cyan-950/60 border border-cyan-800/40 flex items-center justify-center text-cyan-400">
              <Timer size={18} />
            </div>
            <h2 className="text-xl font-bold text-white font-['Chakra_Petch']">
              Timer (Subathon Countdown Overlay)
            </h2>
            <span className="text-[11px] font-mono px-2.5 py-0.5 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 font-bold">
              20 STYLES
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Display a live stream countdown timer that automatically extends whenever viewers donate (e.g. $1 = +10 mins).
          </p>
        </div>

        {/* OBS URL Box */}
        <div className="flex items-center gap-2 bg-slate-950 px-3 py-1.5 rounded-xl border border-slate-800 max-w-md w-full sm:w-auto">
          <Monitor size={14} className="text-cyan-400 flex-shrink-0" />
          <span className="text-[11px] font-mono text-slate-400 truncate flex-1">
            {obsUrl}
          </span>
          <button
            onClick={copyObsUrl}
            className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 text-xs font-mono transition-colors"
          >
            {copiedUrl ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
            <span>{copiedUrl ? 'Copied' : 'Copy'}</span>
          </button>
          <a
            href={obsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
            title="Open in new window"
          >
            <ExternalLink size={13} />
          </a>
        </div>
      </div>

      {/* ============================================================== */}
      {/* TOP LIVE COUNTDOWN PREVIEW & STREAMER CONTROLS                */}
      {/* ============================================================== */}
      <Card className="p-6 bg-gradient-to-br from-[#0B0F19] via-[#090D18] to-slate-950 border border-cyan-500/30 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-cyan-500/5 rounded-full blur-3xl pointer-events-none" />

        {/* Floating Toast Notification when time is added */}
        {recentBonusToast && (
          <div
            className="absolute top-4 right-4 z-20 animate-bounce flex items-center gap-2 px-4 py-1.5 rounded-full bg-slate-900 border text-xs font-bold font-mono shadow-2xl"
            style={{ borderColor: glowColor, color: glowColor }}
          >
            <Sparkles size={14} />
            <span>{recentBonusToast}</span>
          </div>
        )}

        {/* Header Controls for Live Preview */}
        <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-slate-800/80 relative z-10">
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono uppercase tracking-wider text-slate-400 font-bold flex items-center gap-1.5">
              <Eye size={14} className="text-cyan-400" />
              Live OBS Output Preview
            </span>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-slate-900 border border-slate-800 text-cyan-300 font-bold">
              {currentTemplate.name}
            </span>
          </div>

          <div className="flex items-center gap-2">
            {/* Quick Toggle: Background */}
            <button
              type="button"
              onClick={handleToggleShowBackground}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-mono font-bold border transition-all ${
                showBackground
                  ? 'bg-cyan-500/10 border-cyan-400/50 text-cyan-300'
                  : 'bg-slate-900/80 border-slate-800 text-slate-400 hover:text-white'
              }`}
              title="Toggle background card on OBS"
            >
              <Layers size={13} />
              <span>Background: {showBackground ? 'ON' : 'OFF'}</span>
            </button>

            {/* Quick Toggle: Animation */}
            <button
              type="button"
              onClick={handleToggleShowAnimation}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-mono font-bold border transition-all ${
                showAnimation
                  ? 'bg-amber-500/10 border-amber-400/50 text-amber-300'
                  : 'bg-slate-900/80 border-slate-800 text-slate-400 hover:text-white'
              }`}
              title="Toggle animations on OBS"
            >
              <Sparkles size={13} />
              <span>Animation: {showAnimation ? 'ON' : 'OFF'}</span>
            </button>

            {/* Browse 20 Templates Modal Button */}
            <button
              type="button"
              onClick={() => setIsTemplateModalOpen(true)}
              className="flex items-center gap-1.5 px-3.5 py-1 rounded-xl bg-gradient-to-r from-cyan-500/20 to-blue-500/20 hover:from-cyan-500/30 hover:to-blue-500/30 border border-cyan-400/50 text-cyan-300 text-xs font-mono font-bold transition-all shadow-[0_0_15px_rgba(6,182,212,0.2)]"
            >
              <Palette size={13} />
              <span>Browse 20 Templates</span>
            </button>
          </div>
        </div>

        {/* 1:1 Visual Preview Render */}
        <div className="py-8 flex flex-col items-center justify-center relative z-10">
          <div className="w-full flex items-center justify-center min-h-[140px]">
            <TimerTemplateRenderer
              title={title}
              remainingSeconds={remainingSeconds}
              isRunning={isRunning}
              rateMinutesPerUsd={rateMinutesPerUsd}
              glowColor={glowColor}
              templateStyle={templateStyle}
              showBackground={showBackground}
              showAnimation={showAnimation}
            />
          </div>

          <div className="text-xs font-mono text-slate-400 mt-4 text-center">
            Subathon Formula: <span className="text-cyan-400 font-bold">$1.00 = +{rateMinutesPerUsd}m</span> •{' '}
            <span className="text-emerald-400 font-bold">4,000៛ = +{rateMinutesPerKhr}m</span>
          </div>

          {/* Quick Manual Streamer Control Buttons */}
          <div className="flex flex-wrap items-center justify-center gap-2 pt-4">
            <button
              onClick={toggleRunning}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold font-mono text-xs shadow-lg transition-all active:scale-[0.98] ${
                isRunning
                  ? 'bg-amber-500 hover:bg-amber-600 text-slate-950 shadow-amber-500/20'
                  : 'bg-emerald-500 hover:bg-emerald-600 text-slate-950 shadow-emerald-500/20'
              }`}
            >
              {isRunning ? <Pause size={15} /> : <Play size={15} />}
              <span>{isRunning ? 'Pause Timer' : 'Resume Timer'}</span>
            </button>

            <button
              onClick={() => addSeconds(300)}
              className="px-3.5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-200 text-xs font-mono font-bold transition-colors"
            >
              +5m
            </button>
            <button
              onClick={() => addSeconds(600)}
              className="px-3.5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-200 text-xs font-mono font-bold transition-colors"
            >
              +10m
            </button>
            <button
              onClick={() => addSeconds(1800)}
              className="px-3.5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-200 text-xs font-mono font-bold transition-colors"
            >
              +30m
            </button>
            <button
              onClick={() => addSeconds(3600)}
              className="px-3.5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-200 text-xs font-mono font-bold transition-colors"
            >
              +1h
            </button>
            <button
              onClick={() => subtractSeconds(300)}
              className="px-3 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-400 hover:text-red-400 text-xs font-mono transition-colors"
              title="Subtract 5 minutes"
            >
              -5m
            </button>
            <button
              onClick={resetToInitial}
              className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-400 hover:text-white text-xs font-mono transition-colors"
              title="Reset to initial duration"
            >
              <RotateCcw size={13} />
              <span>Reset</span>
            </button>
          </div>
        </div>
      </Card>

      {/* ============================================================== */}
      {/* 2-COLUMN SETTINGS: FORMULA RULES & VISUAL THEMES              */}
      {/* ============================================================== */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Donation Calculation Rules */}
        <div className="lg:col-span-6 space-y-6">
          <Card className="p-5 sm:p-6 bg-[#090D18] border-slate-800 space-y-5">
            <div className="flex items-center justify-between border-b border-slate-800/80 pb-4">
              <h3 className="text-sm font-bold text-white font-['Chakra_Petch'] uppercase tracking-wider flex items-center gap-2">
                <Sliders size={16} className="text-cyan-400" />
                Subathon Donation Rules
              </h3>
            </div>

            <div className="space-y-4 text-xs font-mono">
              {/* Timer Subathon Title */}
              <div>
                <label className="text-slate-300 font-semibold block mb-1.5">
                  Timer Title / Subathon Goal
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="SUBATHON COUNTDOWN 🔥"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white font-bold focus:outline-none focus:border-cyan-400"
                />
              </div>

              {/* Time Added per $1.00 USD (Example: 1$ = 10mins) */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-slate-300 font-semibold flex items-center gap-1.5">
                    <DollarSign size={14} className="text-cyan-400" />
                    <span>Time Added per $1.00 USD (Minutes)</span>
                  </label>
                  <span className="text-cyan-400 font-bold text-sm">+{rateMinutesPerUsd} Mins</span>
                </div>
                <input
                  type="number"
                  min="0.1"
                  step="0.5"
                  value={rateMinutesPerUsd}
                  onChange={(e) => setRateMinutesPerUsd(Math.max(0.1, parseFloat(e.target.value) || 1))}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-cyan-400 font-bold focus:outline-none focus:border-cyan-400"
                />
                {/* Quick Preset Buttons */}
                <div className="grid grid-cols-4 gap-2 mt-2">
                  {[5, 10, 15, 30].map((mins) => (
                    <button
                      key={mins}
                      type="button"
                      onClick={() => setRateMinutesPerUsd(mins)}
                      className={`py-1.5 rounded-lg text-center font-bold border transition-colors ${
                        rateMinutesPerUsd === mins
                          ? 'bg-cyan-500/20 border-cyan-400 text-cyan-300'
                          : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                      }`}
                    >
                      {mins}m / $1
                    </button>
                  ))}
                </div>
                <span className="text-[10px] text-slate-500 mt-1 block">
                  e.g. At 10m/$1, a $2 tip automatically adds +20 minutes to the live countdown.
                </span>
              </div>

              {/* Starting / Initial Duration */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-300 font-semibold block mb-1.5">Starting Hours</label>
                  <input
                    type="number"
                    min="0"
                    value={initialHours}
                    onChange={(e) => setInitialHours(Math.max(0, parseInt(e.target.value) || 0))}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white font-bold"
                  />
                </div>
                <div>
                  <label className="text-slate-300 font-semibold block mb-1.5">Starting Minutes</label>
                  <input
                    type="number"
                    min="0"
                    max="59"
                    value={initialMinutes}
                    onChange={(e) => setInitialMinutes(Math.max(0, Math.min(59, parseInt(e.target.value) || 0)))}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white font-bold"
                  />
                </div>
              </div>

              {/* Maximum Cap Limit */}
              <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-slate-200 font-semibold">Maximum Timer Cap</span>
                  <input
                    type="checkbox"
                    checked={hasCap}
                    onChange={(e) => setHasCap(e.target.checked)}
                    className="w-4 h-4 accent-cyan-400 rounded"
                  />
                </div>
                {hasCap && (
                  <div className="flex items-center gap-2 pt-1">
                    <input
                      type="number"
                      min="1"
                      max="168"
                      value={maxCapHours}
                      onChange={(e) => setMaxCapHours(Math.max(1, parseInt(e.target.value) || 24))}
                      className="w-24 px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-amber-400 font-bold"
                    />
                    <span className="text-slate-400 text-xs">Hours max cap (prevents endless stream)</span>
                  </div>
                )}
              </div>

              {/* Sound on Donation */}
              <div className="flex items-center justify-between p-3.5 rounded-xl bg-slate-950 border border-slate-800">
                <span className="text-slate-200 font-semibold flex items-center gap-2">
                  <Volume2 size={16} className="text-cyan-400" />
                  Play Chime Sound when Time is Added
                </span>
                <input
                  type="checkbox"
                  checked={soundEnabled}
                  onChange={(e) => setSoundEnabled(e.target.checked)}
                  className="w-4 h-4 accent-cyan-400 rounded"
                />
              </div>
            </div>

            <Button
              variant="primary"
              size="md"
              onClick={handleSaveAllSettings}
              className="w-full font-bold"
            >
              {savedSuccess ? 'Settings Saved & Broadcasted to OBS!' : 'Save Timer Settings'}
            </Button>
          </Card>
        </div>

        {/* Right Column: Visual Theme & Live Simulator */}
        <div className="lg:col-span-6 space-y-6">
          {/* Visual Theme Card */}
          <Card className="p-5 sm:p-6 bg-[#090D18] border-slate-800 space-y-5">
            <div className="flex items-center justify-between border-b border-slate-800/80 pb-4">
              <h3 className="text-sm font-bold text-white font-['Chakra_Petch'] uppercase tracking-wider flex items-center gap-2">
                <Palette size={16} className="text-cyan-400" />
                OBS Visual Theme (20 Designs)
              </h3>
            </div>

            <div className="space-y-4 text-xs font-mono">
              {/* Current Active Template Banner + Modal Open Button */}
              <div>
                <label className="text-slate-300 font-semibold block mb-2">Selected Timer Template</label>
                <div className="p-4 rounded-2xl bg-slate-950 border border-cyan-500/30 flex items-center justify-between gap-3 shadow-lg">
                  <div className="space-y-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-white font-['Chakra_Petch'] truncate">
                        {currentTemplate.name}
                      </span>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-300 border border-cyan-500/30">
                        {currentTemplate.category}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400 line-clamp-1">
                      {currentTemplate.description}
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => setIsTemplateModalOpen(true)}
                    className="flex-shrink-0 flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs transition-all shadow-[0_0_15px_rgba(6,182,212,0.3)]"
                  >
                    <Palette size={14} />
                    <span>Change</span>
                  </button>
                </div>
              </div>

              {/* Display Options: Background & Animation Toggles */}
              <div className="space-y-2 pt-1">
                {/* Background Container Toggle */}
                <label className="flex items-center justify-between p-3 rounded-xl bg-slate-950 border border-slate-800 cursor-pointer select-none">
                  <div className="space-y-0.5">
                    <span className="text-xs font-mono text-slate-200 font-bold block flex items-center gap-1.5">
                      <Layers size={13} className="text-cyan-400" />
                      <span>Show Container Background</span>
                    </span>
                    <span className="text-[10px] text-slate-400 block">
                      Turn off for transparent borderless floating digits directly over gameplay
                    </span>
                  </div>
                  <input
                    type="checkbox"
                    checked={showBackground}
                    onChange={handleToggleShowBackground}
                    className="w-4 h-4 rounded bg-slate-900 border-slate-700 text-cyan-500 focus:ring-0 focus:ring-offset-0"
                  />
                </label>

                {/* Animation Toggle */}
                <label className="flex items-center justify-between p-3 rounded-xl bg-slate-950 border border-slate-800 cursor-pointer select-none">
                  <div className="space-y-0.5">
                    <span className="text-xs font-mono text-slate-200 font-bold block flex items-center gap-1.5">
                      <Sparkles size={13} className="text-amber-400" />
                      <span>Enable Dynamic Visual Animations</span>
                    </span>
                    <span className="text-[10px] text-slate-400 block">
                      Enables unique pulses, radar scanlines, neon glows, and heartbeat rhythms
                    </span>
                  </div>
                  <input
                    type="checkbox"
                    checked={showAnimation}
                    onChange={handleToggleShowAnimation}
                    className="w-4 h-4 rounded bg-slate-900 border-slate-700 text-cyan-500 focus:ring-0 focus:ring-offset-0"
                  />
                </label>
              </div>

              {/* Glow Accent Color */}
              <div>
                <label className="text-slate-300 font-semibold block mb-2">Glow Accent Color</label>
                <div className="flex items-center gap-3">
                  {[
                    { name: 'Cyan', color: '#00F0FF' },
                    { name: 'Emerald', color: '#10B981' },
                    { name: 'Lime', color: '#84CC16' },
                    { name: 'Amber', color: '#F59E0B' },
                    { name: 'Purple', color: '#A855F7' },
                    { name: 'Crimson', color: '#DC2626' }
                  ].map((c) => (
                    <button
                      key={c.color}
                      type="button"
                      onClick={() => setGlowColor(c.color)}
                      className={`w-8 h-8 rounded-full border-2 transition-transform ${
                        glowColor === c.color ? 'scale-110 border-white ring-2 ring-cyan-500/50' : 'border-transparent'
                      }`}
                      style={{ backgroundColor: c.color }}
                      title={c.name}
                    />
                  ))}
                </div>
              </div>

              {/* Font Family Selector */}
              <div>
                <label className="text-slate-300 font-semibold block mb-1.5">Timer Font Style</label>
                <select
                  value={fontFamily}
                  onChange={(e) => setFontFamily(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-200 focus:outline-none focus:border-cyan-400"
                >
                  <option value="Chakra Petch">Chakra Petch (Cyberpunk)</option>
                  <option value="Orbitron">Orbitron (Sci-Fi Futuristic)</option>
                  <option value="Inter">Inter (Clean Modern)</option>
                  <option value="Bebas Neue">Bebas Neue (Bold Tall)</option>
                  <option value="Press Start 2P">Press Start 2P (Retro 8-Bit)</option>
                </select>
              </div>
            </div>
          </Card>

          {/* Interactive Live Donation Simulator Card */}
          <Card className="p-5 sm:p-6 bg-[#090D18] border-slate-800 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
              <h3 className="text-sm font-bold text-white font-['Chakra_Petch'] uppercase tracking-wider flex items-center gap-2">
                <Play size={16} className="text-cyan-400" />
                Live Subathon Simulator
              </h3>
              <span className="text-[10px] font-mono text-cyan-400 font-bold">
                TEST BROADCAST TO OBS
              </span>
            </div>

            <p className="text-xs text-slate-400">
              Click any sample donation below to test adding time in real-time. The active OBS Browser Source overlay will update and trigger the bonus animation immediately!
            </p>

            <div className="grid grid-cols-3 gap-2.5 pt-1">
              <button
                type="button"
                onClick={() => handleSimulateDonation(2.0, 'USD')}
                className="p-3 rounded-xl bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/30 text-cyan-300 text-xs font-mono font-bold transition-all text-center"
              >
                <span className="block text-sm">$2.00 Tip</span>
                <span className="text-[10px] text-cyan-400">+20 Mins</span>
              </button>

              <button
                type="button"
                onClick={() => handleSimulateDonation(5.0, 'USD')}
                className="p-3 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-300 text-xs font-mono font-bold transition-all text-center"
              >
                <span className="block text-sm">$5.00 Tip</span>
                <span className="text-[10px] text-amber-400">+50 Mins</span>
              </button>

              <button
                type="button"
                onClick={() => handleSimulateDonation(40000, 'KHR')}
                className="p-3 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 text-xs font-mono font-bold transition-all text-center"
              >
                <span className="block text-sm">40,000៛</span>
                <span className="text-[10px] text-emerald-400">+100 Mins</span>
              </button>
            </div>

            {/* Custom Amount Test */}
            <div className="flex items-center gap-2 pt-2">
              <div className="flex-1 flex items-center rounded-xl bg-slate-950 border border-slate-800 px-3 py-2 text-xs font-mono">
                <span className="text-slate-400 mr-2">$</span>
                <input
                  type="number"
                  min="0.5"
                  step="0.5"
                  value={customTestAmount}
                  onChange={(e) => setCustomTestAmount(parseFloat(e.target.value) || 1)}
                  className="w-full bg-transparent text-white font-bold focus:outline-none"
                  placeholder="2.00"
                />
              </div>
              <button
                type="button"
                onClick={() => handleSimulateDonation(customTestAmount, 'USD')}
                className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-mono text-xs font-bold transition-colors"
              >
                Test +{Math.round(customTestAmount * rateMinutesPerUsd)}m
              </button>
            </div>
          </Card>
        </div>
      </div>

      {/* ============================================================== */}
      {/* TEMPLATE PREVIEWS MODAL (ALL 20 UNIQUE DESIGNS)                */}
      {/* ============================================================== */}
      {isTemplateModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/85 backdrop-blur-md animate-fadeIn"
          onClick={() => setIsTemplateModalOpen(false)}
        >
          <div
            className="w-full max-w-5xl max-h-[92vh] bg-[#080C16] border border-cyan-500/30 rounded-3xl shadow-2xl flex flex-col overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="p-5 sm:p-6 border-b border-slate-800 flex items-start justify-between gap-4 bg-slate-950/70 flex-shrink-0">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-cyan-500/15 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
                    <Palette size={18} />
                  </div>
                  <h3 className="text-lg sm:text-xl font-bold text-white font-['Chakra_Petch']">
                    Timer Styling Templates (20 Unique Designs)
                  </h3>
                </div>
                <p className="text-xs text-slate-400">
                  Click any template to select it for your stream overlay. Each template features custom countdown frames, digital typography, glowing accents, and dynamic animations.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsTemplateModalOpen(false)}
                className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors flex-shrink-0"
              >
                <X size={20} />
              </button>
            </div>

            {/* Category Filter Pills */}
            <div className="px-5 sm:px-6 py-3 border-b border-slate-800/80 bg-slate-950/40 flex items-center gap-1.5 overflow-x-auto flex-shrink-0">
              {(['All', 'Cyber', 'Gaming', 'Retro', 'Aesthetic', 'Minimal', 'Special'] as const).map(
                (cat) => {
                  const count =
                    cat === 'All'
                      ? TIMER_TEMPLATES.length
                      : TIMER_TEMPLATES.filter((t) => t.category === cat).length;
                  return (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setTemplateFilter(cat)}
                      className={`px-3 py-1 rounded-xl text-xs font-mono font-bold transition-all whitespace-nowrap ${
                        templateFilter === cat
                          ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-[0_0_12px_rgba(6,182,212,0.25)]'
                          : 'text-slate-400 hover:text-white bg-slate-900 border border-slate-800'
                      }`}
                    >
                      {cat} ({count})
                    </button>
                  );
                }
              )}
            </div>

            {/* Template Preview Cards Grid */}
            <div className="p-5 sm:p-6 overflow-y-auto space-y-4 flex-1">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {filteredTemplates.map((tpl) => {
                  const isCurrentSelected = templateStyle === tpl.id;

                  return (
                    <div
                      key={tpl.id}
                      onClick={() => handleSelectTemplateFromModal(tpl.id, tpl.previewColor)}
                      className={`p-4 rounded-2xl bg-[#090D18] border transition-all cursor-pointer flex flex-col justify-between space-y-3 group hover:border-cyan-400/60 hover:shadow-xl ${
                        isCurrentSelected
                          ? 'border-cyan-400 ring-2 ring-cyan-400/20 bg-cyan-950/15'
                          : 'border-slate-800 hover:bg-slate-900/40'
                      }`}
                    >
                      {/* Top Info Bar */}
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span
                            className="w-3 h-3 rounded-full flex-shrink-0"
                            style={{ backgroundColor: tpl.previewColor }}
                          />
                          <span className="text-sm font-bold text-white font-['Chakra_Petch'] group-hover:text-cyan-300 transition-colors">
                            {tpl.name}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-slate-900 border border-slate-800 text-slate-400">
                            {tpl.category}
                          </span>
                          {isCurrentSelected && (
                            <span className="flex items-center gap-1 text-[10px] font-mono px-2 py-0.5 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 font-bold">
                              <CheckCircle2 size={11} />
                              Current
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Live Miniature Preview */}
                      <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800/80 flex items-center justify-center min-h-[105px] overflow-hidden">
                        <div className="transform scale-[0.88] origin-center w-full flex items-center justify-center pointer-events-none">
                          <TimerTemplateRenderer
                            title="SUBATHON GOAL"
                            remainingSeconds={remainingSeconds}
                            isRunning={isRunning}
                            rateMinutesPerUsd={rateMinutesPerUsd}
                            glowColor={tpl.previewColor}
                            templateStyle={tpl.id}
                            showBackground={showBackground}
                            showAnimation={showAnimation}
                          />
                        </div>
                      </div>

                      {/* Description & Apply Button */}
                      <div className="flex items-center justify-between gap-3 text-xs font-mono pt-1">
                        <p className="text-[11px] text-slate-400 line-clamp-1 flex-1">
                          {tpl.description}
                        </p>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleSelectTemplateFromModal(tpl.id, tpl.previewColor);
                          }}
                          className={`px-3 py-1 rounded-xl text-[11px] font-mono font-bold transition-all flex-shrink-0 ${
                            isCurrentSelected
                              ? 'bg-cyan-500 text-slate-950 shadow-[0_0_12px_rgba(6,182,212,0.4)]'
                              : 'bg-slate-900 group-hover:bg-cyan-500/20 text-slate-300 group-hover:text-cyan-300 border border-slate-800 group-hover:border-cyan-500/30'
                          }`}
                        >
                          {isCurrentSelected ? 'Applied' : 'Select'}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 sm:p-5 border-t border-slate-800 bg-slate-950/70 flex items-center justify-between flex-shrink-0">
              <span className="text-xs font-mono text-slate-400">
                20 handcrafted unique templates • Instant live sync with OBS Browser Source
              </span>
              <button
                type="button"
                onClick={() => setIsTemplateModalOpen(false)}
                className="px-5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white text-xs font-mono font-bold transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
