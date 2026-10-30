'use client';

import React, { useState, useEffect } from 'react';
import {
  Timer,
  Play,
  Pause,
  RotateCcw,
  Flame,
  Sparkles,
  Sliders,
  Monitor,
  DollarSign,
  Palette,
  Layers,
  Eye,
  CheckCircle2,
  Search,
  ArrowDown
} from 'lucide-react';
import { Card } from '../common/Card';
import { Button } from '../common/Button';
import { useSocket } from '../../context/SocketContext';
import {
  TIMER_TEMPLATES,
  TimerTemplateRenderer,
  TimerTemplateMeta,
  formatTimerParts
} from '../overlay/timerTemplates';

interface TimerWidgetManagerProps {
  streamerToken?: string;
}

const parseBool = (val: any, defaultVal = true): boolean => {
  if (val === undefined || val === null) return defaultVal;
  if (val === false || val === 0 || val === '0' || val === 'false') return false;
  return true;
};

export const TimerWidgetManager: React.FC<TimerWidgetManagerProps> = ({ streamerToken }) => {
  const { socket } = useSocket();

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

  // Visual Appearance Customization & 40 Templates
  const [templateStyle, setTemplateStyle] = useState<string>('cyber-neon');
  const [showBackground, setShowBackground] = useState<boolean>(true);
  const [showAnimation, setShowAnimation] = useState<boolean>(true);
  const [showTitle, setShowTitle] = useState<boolean>(true);
  const [showDescription, setShowDescription] = useState<boolean>(true);
  const [description, setDescription] = useState<string>('');
  const [glowColor, setGlowColor] = useState('#00F0FF');
  const [fontFamily, setFontFamily] = useState('Chakra Petch');
  const [soundEnabled, setSoundEnabled] = useState(false);

  // In-line Template Browser & Category Filter State
  const [templateFilter, setTemplateFilter] = useState<
    'All' | 'Cyber' | 'Gaming' | 'Retro' | 'Aesthetic' | 'Minimal' | 'Special'
  >('All');
  const [searchQuery, setSearchQuery] = useState('');

  // Test simulation state
  const [customTestAmount, setCustomTestAmount] = useState<number>(2.0);
  const [savedSuccess, setSavedSuccess] = useState(false);

  const effectiveToken = streamerToken || 'demo-token';

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
          setShowBackground(parseBool(t.showBackground, true));
          setShowAnimation(parseBool(t.showAnimation, true));
          setShowTitle(parseBool(t.showTitle, true));
          setShowDescription(parseBool(t.showDescription, true));
          setDescription(t.description || '');
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

  const addSeconds = (seconds: number, donorName?: string, tipAmount?: number) => {
    const maxSec = hasCap ? maxCapHours * 3600 : 86400 * 365;
    const newRemaining = Math.min(maxSec, remainingSeconds + seconds);
    setRemainingSeconds(newRemaining);

    // Save and broadcast update
    saveTimerState(newRemaining, isRunning, { addedSec: seconds, donor: donorName, amount: tipAmount });
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

  interface TimerStateOverrides {
    addedSec?: number;
    donor?: string;
    amount?: number;
    templateStyle?: string;
    glowColor?: string;
    showBackground?: boolean;
    showAnimation?: boolean;
    showTitle?: boolean;
    showDescription?: boolean;
    description?: string;
    title?: string;
  }

  const saveTimerState = (
    currentSec: number,
    running: boolean,
    overrides?: TimerStateOverrides
  ) => {
    const activeTemplate = overrides?.templateStyle !== undefined ? overrides.templateStyle : templateStyle;
    const activeColor = overrides?.glowColor !== undefined ? overrides.glowColor : glowColor;
    const activeBg = overrides?.showBackground !== undefined ? overrides.showBackground : showBackground;
    const activeAnim = overrides?.showAnimation !== undefined ? overrides.showAnimation : showAnimation;
    const activeShowTitle = overrides?.showTitle !== undefined ? overrides.showTitle : showTitle;
    const activeShowDesc = overrides?.showDescription !== undefined ? overrides.showDescription : showDescription;
    const activeDesc = overrides?.description !== undefined ? overrides.description : description;
    const activeTitle = overrides?.title !== undefined ? overrides.title : title;

    const payload = {
      token: effectiveToken,
      title: activeTitle,
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
      showTitle: activeShowTitle,
      showDescription: activeShowDesc,
      description: activeDesc,
      soundEnabled,
      maxCapSeconds: hasCap ? maxCapHours * 3600 : 86400 * 365,
      addedSeconds: overrides?.addedSec || 0,
      donorName: overrides?.donor,
      tipAmount: overrides?.amount
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
    saveTimerState(remainingSeconds, isRunning, { showBackground: nextVal });
  };

  const handleToggleShowAnimation = () => {
    const nextVal = !showAnimation;
    setShowAnimation(nextVal);
    saveTimerState(remainingSeconds, isRunning, { showAnimation: nextVal });
  };

  const handleToggleShowTitle = () => {
    const nextVal = !showTitle;
    setShowTitle(nextVal);
    saveTimerState(remainingSeconds, isRunning, { showTitle: nextVal });
  };

  const handleToggleShowDescription = () => {
    const nextVal = !showDescription;
    setShowDescription(nextVal);
    saveTimerState(remainingSeconds, isRunning, { showDescription: nextVal });
  };

  const handleSelectTemplate = (templateId: string, previewColor: string) => {
    setTemplateStyle(templateId);
    setGlowColor(previewColor);
    saveTimerState(remainingSeconds, isRunning, { templateStyle: templateId, glowColor: previewColor });
  };

  const scrollToTemplateBrowser = () => {
    const el = document.getElementById('timer-templates-browser');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const handleSaveAllSettings = () => {
    saveTimerState(remainingSeconds, isRunning, {
      title,
      description,
      showTitle,
      showDescription
    });
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

  const filteredTemplates = TIMER_TEMPLATES.filter((tpl) => {
    const matchesCategory = templateFilter === 'All' || tpl.category === templateFilter;
    const q = searchQuery.toLowerCase().trim();
    const matchesSearch =
      q === '' ||
      tpl.name.toLowerCase().includes(q) ||
      tpl.description.toLowerCase().includes(q) ||
      tpl.category.toLowerCase().includes(q);
    return matchesCategory && matchesSearch;
  });

  return (
    <div className="space-y-6">
      {/* ============================================================== */}
      {/* TOP LIVE COUNTDOWN PREVIEW & STREAMER CONTROLS                */}
      {/* ============================================================== */}
      <Card className="p-6 bg-gradient-to-br from-[#0B0F19] via-[#090D18] to-slate-950 border border-cyan-500/30 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-cyan-500/5 rounded-full blur-3xl pointer-events-none" />

        {/* Header Controls for Live Preview */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800/80 relative z-10">
          <span className="text-sm font-bold text-white font-['Chakra_Petch'] flex items-center gap-2">
            <Eye size={16} className="text-cyan-400" />
            Preview
          </span>

          {/* Browse 40 Templates in Main Content (Smooth Scroll) */}
          <button
            type="button"
            onClick={scrollToTemplateBrowser}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-cyan-500/20 to-blue-500/20 hover:from-cyan-500/30 hover:to-blue-500/30 border border-cyan-400/50 text-cyan-300 text-xs font-mono font-bold transition-all shadow-[0_0_15px_rgba(6,182,212,0.2)]"
          >
            <Palette size={13} />
            <span>Browse 40 Templates</span>
            <ArrowDown size={12} className="animate-bounce" />
          </button>
        </div>

        {/* 1:1 Visual Preview Render */}
        <div className="py-8 flex flex-col items-center justify-center relative z-10 w-full overflow-hidden">
          <div className="w-full flex items-center justify-center min-h-[140px] px-2">
            <TimerTemplateRenderer
              title={title}
              remainingSeconds={remainingSeconds}
              isRunning={isRunning}
              rateMinutesPerUsd={rateMinutesPerUsd}
              glowColor={glowColor}
              templateStyle={templateStyle}
              showBackground={showBackground}
              showAnimation={showAnimation}
              showTitle={showTitle}
              showDescription={showDescription}
              description={description}
            />
          </div>
        </div>
      </Card>

      {/* ============================================================== */}
      {/* LIVE TIMER CONTROLS (DIRECTLY AFTER PREVIEW)                   */}
      {/* ============================================================== */}
      <Card className="p-5 sm:p-6 bg-[#090D18] border-slate-800 space-y-4">
        <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
          <h3 className="text-sm font-bold text-white font-['Chakra_Petch'] uppercase tracking-wider flex items-center gap-2">
            <Sliders size={16} className="text-cyan-400" />
            Live Timer Controls
          </h3>
          <span className={`text-[10px] font-mono px-2.5 py-0.5 rounded-full font-bold ${
            isRunning ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30' : 'bg-amber-500/10 text-amber-400 border border-amber-500/30'
          }`}>
            {isRunning ? 'COUNTDOWN RUNNING' : 'PAUSED'}
          </span>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-4">
          {/* Pause / Resume & Reset Buttons */}
          <div className="flex items-center gap-2 flex-wrap">
            <Button
              type="button"
              variant="primary"
              size="sm"
              onClick={toggleRunning}
              className={`font-mono font-bold text-xs shadow-lg transition-all active:scale-[0.98] ${
                isRunning
                  ? 'bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-amber-500/20'
                  : 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-emerald-500/20'
              }`}
              icon={isRunning ? <Pause size={14} /> : <Play size={14} />}
            >
              {isRunning ? 'Pause Timer' : 'Resume Timer'}
            </Button>

            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={resetToInitial}
              className="font-mono font-bold text-xs text-slate-300 hover:text-white bg-slate-900 hover:bg-slate-800 border border-slate-800 transition-colors"
              icon={<RotateCcw size={13} />}
              title="Reset to initial duration"
            >
              Reset
            </Button>
          </div>

          {/* Quick Adjust Buttons */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-slate-400 text-xs font-mono font-semibold mr-1">Quick Adjust:</span>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => addSeconds(300)}
              className="font-mono font-bold text-xs bg-slate-900 hover:bg-slate-800 text-cyan-400 hover:text-cyan-300 border border-cyan-500/30 hover:border-cyan-400/60 shadow-sm transition-all active:scale-95"
            >
              +5m
            </Button>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => addSeconds(600)}
              className="font-mono font-bold text-xs bg-slate-900 hover:bg-slate-800 text-cyan-400 hover:text-cyan-300 border border-cyan-500/30 hover:border-cyan-400/60 shadow-sm transition-all active:scale-95"
            >
              +10m
            </Button>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => addSeconds(1800)}
              className="font-mono font-bold text-xs bg-slate-900 hover:bg-slate-800 text-cyan-400 hover:text-cyan-300 border border-cyan-500/30 hover:border-cyan-400/60 shadow-sm transition-all active:scale-95"
            >
              +30m
            </Button>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => addSeconds(3600)}
              className="font-mono font-bold text-xs bg-slate-900 hover:bg-slate-800 text-cyan-400 hover:text-cyan-300 border border-cyan-500/30 hover:border-cyan-400/60 shadow-sm transition-all active:scale-95"
            >
              +1h
            </Button>
            <Button
              type="button"
              variant="danger"
              size="sm"
              onClick={() => subtractSeconds(300)}
              className="font-mono font-bold text-xs text-red-400 hover:text-red-300 bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 hover:border-red-400/60 shadow-sm transition-all active:scale-95"
              title="Subtract 5 minutes"
            >
              -5m
            </Button>
            <Button
              type="button"
              variant="danger"
              size="sm"
              onClick={() => subtractSeconds(600)}
              className="font-mono font-bold text-xs text-red-400 hover:text-red-300 bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 hover:border-red-400/60 shadow-sm transition-all active:scale-95"
              title="Subtract 10 minutes"
            >
              -10m
            </Button>
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
              {/* Timer Subathon Title + Toggle */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-slate-300 font-semibold block">
                    Timer Title / Subathon Goal
                  </label>
                  <label className="flex items-center gap-1.5 cursor-pointer select-none">
                    <span className="text-[11px] text-slate-400 font-normal">{showTitle ? 'Visible' : 'Hidden'}</span>
                    <input
                      type="checkbox"
                      checked={showTitle}
                      onChange={handleToggleShowTitle}
                      className="w-4 h-4 accent-cyan-400 rounded cursor-pointer"
                    />
                  </label>
                </div>
                {showTitle && (
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="SUBATHON COUNTDOWN"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white font-bold focus:outline-none focus:border-cyan-400"
                  />
                )}
              </div>

              {/* Description Below Timer + Toggle */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-slate-300 font-semibold block">
                    Timer Description (Below Timer)
                  </label>
                  <label className="flex items-center gap-1.5 cursor-pointer select-none">
                    <span className="text-[11px] text-slate-400 font-normal">{showDescription ? 'Visible' : 'Hidden'}</span>
                    <input
                      type="checkbox"
                      checked={showDescription}
                      onChange={handleToggleShowDescription}
                      className="w-4 h-4 accent-cyan-400 rounded cursor-pointer"
                    />
                  </label>
                </div>
                {showDescription && (
                  <input
                    type="text"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="$1 = +10m • 4,000៛ = +10m (leave empty for formula)"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white font-mono text-xs focus:outline-none focus:border-cyan-400"
                  />
                )}
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
            </div>

            <Button
              variant="primary"
              size="md"
              onClick={handleSaveAllSettings}
              className="w-full font-bold"
            >
              {savedSuccess ? 'Saved & Updated!' : 'Save & Update'}
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
                OBS Visual Theme (40 Designs)
              </h3>
            </div>

            <div className="space-y-4 text-xs font-mono">
              {/* Current Active Template Banner */}
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
                    onClick={scrollToTemplateBrowser}
                    className="flex-shrink-0 flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs transition-all shadow-[0_0_15px_rgba(6,182,212,0.3)]"
                  >
                    <Palette size={14} />
                    <span>Browse All</span>
                  </button>
                </div>
              </div>

              {/* Display Options: Background & Animation Toggles */}
              <div className="space-y-2 pt-1">
                {/* Background Container Toggle */}
                <label className="flex items-center justify-between p-3 rounded-xl bg-slate-950 border border-slate-800 cursor-pointer select-none">
                  <div className="space-y-0.5">
                    <span className="text-xs font-mono text-slate-200 font-bold flex items-center gap-1.5">
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
                    <span className="text-xs font-mono text-slate-200 font-bold flex items-center gap-1.5">
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
      {/* IN-LINE TEMPLATE BROWSER (ALL 40 UNIQUE HANDCRAFTED DESIGNS)   */}
      {/* ============================================================== */}
      <div id="timer-templates-browser" className="pt-4 space-y-4">
        {/* Section Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-5 rounded-2xl bg-[#090D18] border border-cyan-500/30 shadow-xl">
          <div className="space-y-1">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-cyan-500/15 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
                <Palette size={18} />
              </div>
              <h3 className="text-lg sm:text-xl font-bold text-white font-['Chakra_Petch']">
                Timer Styling Templates (40 Unique Designs)
              </h3>
              <span className="text-[10px] font-mono px-2.5 py-0.5 rounded-full bg-cyan-500/15 border border-cyan-500/30 text-cyan-300 font-bold">
                INSTANT LIVE OBS SYNC
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Browse and click any template below to immediately apply it to your stream countdown overlay. No OBS reload needed.
            </p>
          </div>

          {/* Search Box */}
          <div className="relative min-w-[240px]">
            <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search 40 templates..."
              className="w-full pl-9 pr-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs font-mono text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400"
            />
          </div>
        </div>

        {/* Category Filter Pills */}
        <div className="p-2 rounded-2xl bg-[#090D18] border border-slate-800 flex items-center gap-2 overflow-x-auto scrollbar-thin">
          {(['All', 'Cyber', 'Gaming', 'Retro', 'Aesthetic', 'Minimal', 'Special'] as const).map((cat) => {
            const count =
              cat === 'All'
                ? TIMER_TEMPLATES.length
                : TIMER_TEMPLATES.filter((t) => t.category === cat).length;
            const isSelected = templateFilter === cat;

            return (
              <button
                key={cat}
                type="button"
                onClick={() => setTemplateFilter(cat)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-mono font-bold transition-all whitespace-nowrap flex items-center gap-1.5 ${
                  isSelected
                    ? 'bg-cyan-500 text-slate-950 shadow-[0_0_15px_rgba(6,182,212,0.4)]'
                    : 'text-slate-400 hover:text-white bg-slate-950/80 hover:bg-slate-900 border border-slate-800/80'
                }`}
              >
                <span>{cat}</span>
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-md ${
                    isSelected ? 'bg-slate-950/20 text-slate-950 font-black' : 'bg-slate-800 text-slate-400'
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* 40 Template Cards Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {filteredTemplates.map((tpl) => {
            const isCurrentSelected = templateStyle === tpl.id;

            return (
              <div
                key={tpl.id}
                onClick={() => handleSelectTemplate(tpl.id, tpl.previewColor)}
                className={`p-4 rounded-2xl bg-[#090D18] border transition-all cursor-pointer flex flex-col justify-between space-y-3 group hover:border-cyan-400/60 hover:shadow-2xl ${
                  isCurrentSelected
                    ? 'border-cyan-400 ring-2 ring-cyan-400/30 bg-cyan-950/20 shadow-[0_0_25px_rgba(6,182,212,0.15)]'
                    : 'border-slate-800 hover:bg-slate-900/40'
                }`}
              >
                {/* Top Info Bar */}
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span
                      className="w-3.5 h-3.5 rounded-full flex-shrink-0 shadow-md"
                      style={{ backgroundColor: tpl.previewColor, boxShadow: `0 0 10px ${tpl.previewColor}80` }}
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
                      <span className="flex items-center gap-1 text-[10px] font-mono px-2 py-0.5 rounded-full bg-cyan-500/15 border border-cyan-500/40 text-cyan-300 font-bold">
                        <CheckCircle2 size={11} className="text-cyan-400" />
                        Active on OBS
                      </span>
                    )}
                  </div>
                </div>

                {/* Live Miniature Preview */}
                <div className="p-3 sm:p-4 rounded-xl bg-slate-950/90 border border-slate-800/80 flex items-center justify-center min-h-[120px] overflow-hidden">
                  <div className="transform scale-[0.74] sm:scale-[0.80] origin-center w-full flex items-center justify-center pointer-events-none select-none">
                    <TimerTemplateRenderer
                      title={title || "SUBATHON"}
                      remainingSeconds={remainingSeconds}
                      isRunning={isRunning}
                      rateMinutesPerUsd={rateMinutesPerUsd}
                      glowColor={tpl.previewColor}
                      templateStyle={tpl.id}
                      showBackground={showBackground}
                      showAnimation={showAnimation}
                      showTitle={showTitle}
                      showDescription={showDescription}
                      description={description}
                    />
                  </div>
                </div>

                {/* Description & Selection Button */}
                <div className="flex items-center justify-between gap-3 text-xs font-mono pt-1">
                  <p className="text-[11px] text-slate-400 line-clamp-1 flex-1">
                    {tpl.description}
                  </p>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleSelectTemplate(tpl.id, tpl.previewColor);
                    }}
                    className={`px-3.5 py-1.5 rounded-xl text-[11px] font-mono font-bold transition-all flex-shrink-0 ${
                      isCurrentSelected
                        ? 'bg-cyan-500 text-slate-950 shadow-[0_0_15px_rgba(6,182,212,0.4)]'
                        : 'bg-slate-900 group-hover:bg-cyan-500/20 text-slate-300 group-hover:text-cyan-300 border border-slate-800 group-hover:border-cyan-500/40'
                    }`}
                  >
                    {isCurrentSelected ? 'Applied' : 'Select'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Empty Search Result Fallback */}
        {filteredTemplates.length === 0 && (
          <div className="p-12 text-center rounded-2xl bg-[#090D18] border border-slate-800 space-y-2">
            <Palette size={28} className="mx-auto text-slate-600" />
            <h4 className="text-sm font-bold text-white font-['Chakra_Petch']">No templates found</h4>
            <p className="text-xs text-slate-400 font-mono">
              No style matches "{searchQuery}". Try searching for Cyber, Retro, Neon, or clear the search.
            </p>
            <button
              type="button"
              onClick={() => {
                setSearchQuery('');
                setTemplateFilter('All');
              }}
              className="mt-2 px-4 py-1.5 rounded-xl bg-slate-800 text-white text-xs font-mono font-bold hover:bg-slate-700 transition-colors"
            >
              Reset Filters
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
