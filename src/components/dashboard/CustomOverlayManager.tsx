'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  Layers,
  Check,
  Sparkles,
  Radio,
  Bell,
  Flame,
  Crown,
  Star,
  Heart,
  Tv,
  Target,
  Play,
  RotateCcw,
  Palette,
  Layout,
  Type,
  Plus,
  Trash2,
  Sliders,
  Monitor,
  CheckCircle2,
  ArrowRight,
  Maximize2,
  Copy,
  ExternalLink,
  RefreshCw
} from 'lucide-react';
import { Button } from '../common/Button';
import { CustomStreamOverlay, CustomOverlayConfig, LiveGoalData } from '../overlay/CustomStreamOverlay';
import { useSocket } from '../../context/SocketContext';

interface CustomOverlayManagerProps {
  streamerToken?: string;
  onNavigateToGoals?: () => void;
}

type TabSection = 'content' | 'animation' | 'goal' | 'layout' | 'style';

const FONT_OPTIONS = [
  { label: 'Inter (Modern & Clean)', value: 'Inter' },
  { label: 'Chakra Petch (Cyber & Tech)', value: 'Chakra Petch' },
  { label: 'Montserrat (Bold & Elegant)', value: 'Montserrat' },
  { label: 'Orbitron (Futuristic Sci-Fi)', value: 'Orbitron' },
  { label: 'Bebas Neue (High Impact Stream)', value: 'Bebas Neue' },
  { label: 'Kanit (Modern Display)', value: 'Kanit' },
  { label: 'Press Start 2P (Retro 8-Bit Pixel)', value: 'Press Start 2P' },
  { label: 'Kantumruy Pro (Khmer Modern)', value: 'Kantumruy Pro' },
  { label: 'Battambang (Khmer Traditional)', value: 'Battambang' }
];

const PRESET_COLORS = [
  { name: 'Pure White', hex: '#FFFFFF' },
  { name: 'Neutral Gray', hex: '#A3A3A3' },
  { name: 'Emerald', hex: '#10B981' },
  { name: 'Cyan', hex: '#06B6D4' },
  { name: 'Sky Blue', hex: '#38BDF8' },
  { name: 'Violet', hex: '#8B5CF6' },
  { name: 'Rose', hex: '#F43F5E' },
  { name: 'Amber', hex: '#F59E0B' }
];

const ANIMATION_FLOWS = [
  {
    id: 'marquee',
    label: 'Marquee Ticker',
    desc: 'Classic horizontal broadcast crawl loop'
  },
  {
    id: 'typewriter',
    label: 'Typewriter Flow',
    desc: 'Letter-by-letter live terminal typing'
  },
  {
    id: 'fade-slide',
    label: 'Fade & Slide',
    desc: 'Smooth vertical entrance and exit cycling'
  },
  {
    id: 'float-bounce',
    label: 'Float & Bounce',
    desc: 'Gentle rhythmic floating sinusoidal motion'
  },
  {
    id: 'wave-glow',
    label: 'Wave Glow',
    desc: 'Light shimmer sweeping across text'
  },
  {
    id: 'cyber-glitch',
    label: 'Glitch Pulse',
    desc: 'Digital breathing and pulse animation'
  },
  {
    id: 'flip-3d',
    label: 'Flip 3D',
    desc: 'Perspective 3D flip card transition'
  }
];

const LAYOUT_POSITIONS = [
  { id: 'top-ticker', label: 'Top Bar Ticker', desc: 'Full-width banner at top' },
  { id: 'bottom-ticker', label: 'Bottom Dock Ticker', desc: 'Full-width dock at bottom' },
  { id: 'top-left', label: 'Top-Left Card', desc: 'Floating card upper-left' },
  { id: 'top-right', label: 'Top-Right Card', desc: 'Floating card upper-right' },
  { id: 'bottom-left', label: 'Bottom-Left Card', desc: 'Lower-third bottom-left' },
  { id: 'bottom-right', label: 'Bottom-Right Card', desc: 'Lower-third bottom-right' },
  { id: 'center-lower', label: 'Center Lower-Third', desc: 'Centered banner' }
];

const BADGE_ICONS = [
  { id: 'radio', label: 'Live', icon: Radio },
  { id: 'bell', label: 'Bell', icon: Bell },
  { id: 'flame', label: 'Flame', icon: Flame },
  { id: 'crown', label: 'Crown', icon: Crown },
  { id: 'star', label: 'Star', icon: Star },
  { id: 'heart', label: 'Heart', icon: Heart },
  { id: 'tv', label: 'TV', icon: Tv },
  { id: 'none', label: 'None', icon: null }
];

const DIMENSION_PRESETS = [
  { label: '1920 × 1080 (Full HD)', w: 1920, h: 1080 },
  { label: '1920 × 80 (Ticker)', w: 1920, h: 80 },
  { label: '800 × 200 (Banner)', w: 800, h: 200 },
  { label: '600 × 250 (Corner)', w: 600, h: 250 },
  { label: '400 × 150 (Dock)', w: 400, h: 150 }
];

export const CustomOverlayManager: React.FC<CustomOverlayManagerProps> = ({
  streamerToken,
  onNavigateToGoals
}) => {
  const { socket } = useSocket();
  const token = streamerToken || 'demo-token';

  const [activeTab, setActiveTab] = useState<TabSection>('content');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [testSent, setTestSent] = useState(false);
  const [copiedObs, setCopiedObs] = useState(false);

  // Preview canvas background mode
  const [previewBg, setPreviewBg] = useState<'grid' | 'dark' | 'gameplay'>('grid');
  const [showBoundsLine, setShowBoundsLine] = useState<boolean>(true);

  // Scaled preview observer
  const previewContainerRef = useRef<HTMLDivElement>(null);
  const [canvasScale, setCanvasScale] = useState<number>(0.5);

  useEffect(() => {
    const updateScale = () => {
      if (previewContainerRef.current) {
        const w = previewContainerRef.current.clientWidth;
        if (w > 0) {
          setCanvasScale(w / 1920);
        }
      }
    };

    updateScale();
    const observer = new ResizeObserver(updateScale);
    if (previewContainerRef.current) {
      observer.observe(previewContainerRef.current);
    }
    window.addEventListener('resize', updateScale);

    return () => {
      observer.disconnect();
      window.removeEventListener('resize', updateScale);
    };
  }, []);

  // Form State
  const [config, setConfig] = useState<CustomOverlayConfig>({
    badgeText: '🔴 LIVE STREAM',
    badgeIcon: 'radio',
    headline: 'Welcome to the Stream! Don’t forget to follow & share!',
    subtext: '💬 Type !socials in chat • 🎁 Support via KHQR / ABA live • ⚡ Daily Gaming & Chill',
    tickerMessages: [
      'Welcome to the Stream! Don’t forget to follow & share!',
      '💬 Type !socials in chat for Discord & Telegram links',
      '🎁 Support via KHQR / ABA live on screen with instant alert',
      '⚡ Daily Gaming, chill vibes & community giveaways'
    ],
    animationFlow: 'marquee',
    animationSpeed: 'normal',
    showGoal: true,
    goalLayout: 'compact-pill',
    customWidth: 1920,
    customHeight: 1080,
    layoutPosition: 'top-ticker',
    fontFamily: 'Inter',
    fontSize: 18,
    textColor: '#FFFFFF',
    accentColor: '#10B981',
    glowColor: '#10B981',
    backgroundColor: 'rgba(15, 15, 15, 0.92)',
    borderColor: 'rgba(255, 255, 255, 0.15)',
    backgroundStyle: 'glass',
    showBackground: true,
    isActive: true
  });

  const [activeGoal, setActiveGoal] = useState<LiveGoalData | null>({
    title: 'Livestream Goal',
    targetAmount: 100,
    currentAmount: 45,
    accentColor: '#10B981',
    templateStyle: 'cyber-neon'
  });

  const [newTickerInput, setNewTickerInput] = useState('');

  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  const obsUrl = `${origin}/overlay/custom/${token}`;

  const handleCopyObs = () => {
    navigator.clipboard.writeText(obsUrl);
    setCopiedObs(true);
    setTimeout(() => setCopiedObs(false), 2000);
  };

  // Load configuration from API
  useEffect(() => {
    let isMounted = true;
    setIsLoading(true);

    fetch(`/api/widgets/custom-overlay?token=${token}`)
      .then((res) => res.json())
      .then((data) => {
        if (!isMounted) return;
        if (data.success && data.overlay) {
          setConfig(data.overlay);
        }
        if (data.goal) {
          setActiveGoal(data.goal);
        }
      })
      .catch((err) => console.error('Error fetching overlay config:', err))
      .finally(() => {
        if (isMounted) setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [token]);

  // Add new ticker message
  const handleAddTickerMessage = () => {
    const trimmed = newTickerInput.trim();
    if (!trimmed) return;
    setConfig((prev) => ({
      ...prev,
      tickerMessages: [...(prev.tickerMessages || []), trimmed]
    }));
    setNewTickerInput('');
  };

  // Remove ticker message
  const handleRemoveTickerMessage = (index: number) => {
    setConfig((prev) => ({
      ...prev,
      tickerMessages: (prev.tickerMessages || []).filter((_, idx) => idx !== index)
    }));
  };

  // Save Settings
  const handleSave = async () => {
    setIsSaving(true);
    try {
      const res = await fetch('/api/widgets/custom-overlay', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, config })
      });
      const data = await res.json();
      if (data.success) {
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 2500);
      } else {
        alert(data.error || 'Failed to save configuration.');
      }
    } catch (err: any) {
      alert(err.message || 'Error saving overlay config');
    } finally {
      setIsSaving(false);
    }
  };

  // Test pulse broadcast
  const handleTestBroadcast = async () => {
    try {
      const res = await fetch('/api/widgets/custom-overlay', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, action: 'test_alert', config })
      });
      const data = await res.json();
      if (data.success) {
        setTestSent(true);
        setTimeout(() => setTestSent(false), 2500);
      }
    } catch (err) {
      console.error('Failed to trigger test broadcast:', err);
    }
  };

  // Reset to default
  const handleReset = () => {
    if (!confirm('Reset custom overlay to standard defaults?')) return;
    setConfig({
      badgeText: '🔴 LIVE STREAM',
      badgeIcon: 'radio',
      headline: 'Welcome to the Stream! Don’t forget to follow & share!',
      subtext: '💬 Type !socials in chat • 🎁 Support via KHQR / ABA live • ⚡ Daily Gaming',
      tickerMessages: [
        'Welcome to the Stream! Don’t forget to follow & share!',
        '💬 Type !socials in chat for Discord & Telegram links',
        '🎁 Support via KHQR / ABA live on screen with instant alert'
      ],
      animationFlow: 'marquee',
      animationSpeed: 'normal',
      showGoal: true,
      goalLayout: 'compact-pill',
      customWidth: 1920,
      customHeight: 1080,
      layoutPosition: 'top-ticker',
      fontFamily: 'Inter',
      fontSize: 18,
      textColor: '#FFFFFF',
      accentColor: '#10B981',
      glowColor: '#10B981',
      backgroundColor: 'rgba(15, 15, 15, 0.92)',
      borderColor: 'rgba(255, 255, 255, 0.15)',
      backgroundStyle: 'glass',
      showBackground: true,
      isActive: true
    });
  };

  const targetW = config.customWidth || 1920;
  const targetH = config.customHeight || 1080;

  const getCustomBoxPositionStyle = (): React.CSSProperties => {
    const leftCenter = (1920 - targetW) / 2;
    const topCenter = (1080 - targetH) / 2;

    switch (config.layoutPosition) {
      case 'top-ticker':
        return { top: 0, left: leftCenter, width: targetW, height: targetH, position: 'absolute' };
      case 'bottom-ticker':
        return { top: 1080 - targetH, left: leftCenter, width: targetW, height: targetH, position: 'absolute' };
      case 'top-left':
        return { top: 40, left: 40, width: targetW, height: targetH, position: 'absolute' };
      case 'top-right':
        return { top: 40, left: 1920 - targetW - 40, width: targetW, height: targetH, position: 'absolute' };
      case 'bottom-left':
        return { top: 1080 - targetH - 40, left: 40, width: targetW, height: targetH, position: 'absolute' };
      case 'bottom-right':
        return { top: 1080 - targetH - 40, left: 1920 - targetW - 40, width: targetW, height: targetH, position: 'absolute' };
      case 'center-lower':
      default:
        return { top: 1080 - targetH - 60, left: leftCenter, width: targetW, height: targetH, position: 'absolute' };
    }
  };

  return (
    <div className="space-y-6">
      {/* 1. Header Card */}
      <div className="bg-[#141414] border border-[#262626] rounded-xl p-5 sm:p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-white tracking-wide">Custom Overlay</h2>
              <span className="text-[10px] font-semibold uppercase px-2 py-0.5 rounded bg-neutral-800 text-neutral-300 border border-[#262626]">
                Overlay Widget
              </span>
            </div>
            <p className="text-xs text-neutral-400">
              Design animated on-screen tickers, cards &amp; lower-thirds with real-time text flow and live stream goal integration.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleReset}
              className="text-xs px-3 py-2 rounded-lg bg-[#1a1a1a] border border-[#262626] hover:bg-[#222] text-neutral-300 hover:text-white flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <RotateCcw size={13} />
              <span>Reset</span>
            </button>
            <button
              onClick={handleTestBroadcast}
              className="text-xs px-3 py-2 rounded-lg bg-[#1a1a1a] border border-[#262626] hover:bg-[#222] text-neutral-300 hover:text-white flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              {testSent ? <Check size={13} className="text-emerald-400" /> : <Play size={13} />}
              <span>{testSent ? 'Pulsed OBS' : 'Test OBS'}</span>
            </button>
            <Button
              onClick={handleSave}
              disabled={isSaving}
              className="bg-white hover:bg-neutral-200 text-black font-semibold text-xs px-4 py-2 rounded-lg transition-colors flex items-center gap-1.5"
            >
              {isSaving ? (
                <>
                  <RefreshCw size={13} className="animate-spin" />
                  <span>Saving...</span>
                </>
              ) : saveSuccess ? (
                <>
                  <Check size={14} className="text-emerald-600" />
                  <span>Saved!</span>
                </>
              ) : (
                <span>Save Changes</span>
              )}
            </Button>
          </div>
        </div>

        {/* OBS Browser Source URL Box */}
        <div className="pt-3 border-t border-[#262626] flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
          <div className="flex items-center gap-2 flex-1 min-w-0 bg-[#0f0f0f] border border-[#262626] rounded-lg px-3 py-2 text-xs font-mono text-neutral-300 truncate">
            <span className="text-neutral-500 select-none">OBS URL:</span>
            <span className="truncate">{obsUrl}</span>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={handleCopyObs}
              className="text-xs px-3 py-2 border border-[#262626] bg-[#1a1a1a] hover:bg-[#222222] text-white rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              {copiedObs ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
              <span>{copiedObs ? 'Copied' : 'Copy Link'}</span>
            </button>
            <a
              href={obsUrl}
              target="_blank"
              rel="noreferrer"
              className="text-xs px-3 py-2 border border-[#262626] bg-[#1a1a1a] hover:bg-[#222222] text-neutral-300 hover:text-white rounded-lg flex items-center gap-1.5 transition-colors"
            >
              <ExternalLink size={14} />
              <span>Open</span>
            </a>
          </div>
        </div>
      </div>

      {/* 2. Studio Workbench with RIGHTBAR Configuration */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Section: Live Stage Canvas Viewport */}
        <div className="lg:col-span-7 xl:col-span-8 space-y-4">
          <div className="bg-[#141414] border border-[#262626] rounded-xl overflow-hidden">
            {/* Viewport Toolbar */}
            <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 border-b border-[#262626] bg-[#0f0f0f]">
              <div className="flex items-center gap-2">
                <Monitor size={14} className="text-neutral-400" />
                <span className="text-xs font-semibold text-white uppercase tracking-wider">
                  Live Stage Canvas
                </span>
                <span className="text-[10px] font-mono text-neutral-400 px-1.5 py-0.5 rounded bg-[#1c1c1c] border border-[#2c2c2c]">
                  {targetW} × {targetH} px
                </span>
              </div>

              {/* Viewport Display Options */}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowBoundsLine(!showBoundsLine)}
                  className={`px-2.5 py-1 rounded text-xs transition-colors cursor-pointer ${
                    showBoundsLine
                      ? 'bg-white text-black font-medium'
                      : 'bg-[#1a1a1a] text-neutral-400 border border-[#262626]'
                  }`}
                  title="Toggle boundary guide outline"
                >
                  Guide: {showBoundsLine ? 'ON' : 'OFF'}
                </button>

                <div className="flex items-center gap-1 bg-[#1a1a1a] p-0.5 rounded border border-[#262626] text-xs">
                  {(['grid', 'dark', 'gameplay'] as const).map((mode) => (
                    <button
                      key={mode}
                      onClick={() => setPreviewBg(mode)}
                      className={`px-2 py-0.5 rounded capitalize transition-colors text-[11px] ${
                        previewBg === mode
                          ? 'bg-[#2a2a2a] text-white font-medium'
                          : 'text-neutral-400 hover:text-white'
                      }`}
                    >
                      {mode === 'gameplay' ? 'Room' : mode}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Scaled 1920x1080 Viewport */}
            <div
              ref={previewContainerRef}
              className={`relative w-full aspect-video min-h-[300px] overflow-hidden select-none bg-[#0a0a0a]`}
            >
              <div
                style={{
                  width: 1920,
                  height: 1080,
                  transform: `scale(${canvasScale})`,
                  transformOrigin: 'top left',
                  position: 'absolute',
                  top: 0,
                  left: 0
                }}
              >
                {/* Subtle grid pattern */}
                {previewBg === 'grid' && (
                  <div
                    className="absolute inset-0 opacity-[0.04] pointer-events-none"
                    style={{
                      backgroundImage: 'radial-gradient(circle, #ffffff 1px, transparent 1px)',
                      backgroundSize: '24px 24px'
                    }}
                  />
                )}

                {/* Bounds container */}
                <div
                  className="absolute transition-all duration-200"
                  style={getCustomBoxPositionStyle()}
                >
                  {showBoundsLine && (
                    <div className="absolute -inset-0.5 border border-dashed border-white/50 rounded-xl pointer-events-none z-30" />
                  )}

                  <div className="w-full h-full relative overflow-hidden rounded-xl">
                    <CustomStreamOverlay
                      token={token}
                      initialConfig={config}
                      initialGoal={activeGoal}
                      isPreview={true}
                      isInsideCustomBox={true}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Dimension Presets */}
          <div className="bg-[#141414] border border-[#262626] rounded-xl p-4 flex flex-wrap items-center justify-between gap-3">
            <span className="text-xs text-neutral-400 font-medium">Quick Dimension Presets:</span>
            <div className="flex flex-wrap items-center gap-2">
              {DIMENSION_PRESETS.map((p) => {
                const isSelected = config.customWidth === p.w && config.customHeight === p.h;
                return (
                  <button
                    key={p.label}
                    type="button"
                    onClick={() => setConfig({ ...config, customWidth: p.w, customHeight: p.h })}
                    className={`px-2.5 py-1 rounded text-xs font-mono transition-colors cursor-pointer ${
                      isSelected
                        ? 'bg-white text-black font-semibold'
                        : 'bg-[#1a1a1a] border border-[#262626] text-neutral-400 hover:text-white'
                    }`}
                  >
                    {p.label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right Section: Configuration Rightbar */}
        <div className="lg:col-span-5 xl:col-span-4 bg-[#141414] border border-[#262626] rounded-xl flex flex-col overflow-hidden">
          {/* Rightbar Tab Navigation Bar */}
          <div className="flex items-center overflow-x-auto border-b border-[#262626] bg-[#0f0f0f] p-1 gap-1 scrollbar-none shrink-0">
            {[
              { id: 'content', label: 'Content', icon: Type },
              { id: 'animation', label: 'Flow', icon: Sparkles },
              { id: 'goal', label: 'Goal', icon: Target },
              { id: 'layout', label: 'Layout', icon: Layout },
              { id: 'style', label: 'Style', icon: Palette }
            ].map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as TabSection)}
                  className={`flex-1 py-1.5 px-2 rounded text-xs font-medium flex items-center justify-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap ${
                    isActive
                      ? 'bg-white text-black font-semibold'
                      : 'text-neutral-400 hover:text-white'
                  }`}
                >
                  <Icon size={13} />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>

          {/* Rightbar Scrollable Body */}
          <div className="p-4 sm:p-5 space-y-4 max-h-[580px] overflow-y-auto text-xs">
            {/* TAB 1: CONTENT */}
            {activeTab === 'content' && (
              <div className="space-y-4">
                {/* Badge Text & Icon */}
                <div className="space-y-1.5">
                  <label className="font-medium text-neutral-300">Header Badge Text</label>
                  <input
                    type="text"
                    value={config.badgeText || ''}
                    onChange={(e) => setConfig({ ...config, badgeText: e.target.value })}
                    placeholder="e.g. 🔴 LIVE STREAM"
                    className="w-full bg-[#181818] border border-[#262626] rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-neutral-400"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="font-medium text-neutral-300">Badge Icon</label>
                  <div className="grid grid-cols-4 gap-1.5">
                    {BADGE_ICONS.map((b) => {
                      const IconComp = b.icon;
                      const isSelected = config.badgeIcon === b.id;
                      return (
                        <button
                          key={b.id}
                          type="button"
                          onClick={() => setConfig({ ...config, badgeIcon: b.id })}
                          className={`p-2 rounded-lg border text-center transition-colors cursor-pointer flex flex-col items-center gap-1 ${
                            isSelected
                              ? 'bg-white text-black font-semibold border-white'
                              : 'bg-[#181818] border-[#262626] text-neutral-400 hover:text-white'
                          }`}
                        >
                          {IconComp ? <IconComp size={14} /> : <span className="text-xs">—</span>}
                          <span className="text-[10px] truncate">{b.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Primary Headline */}
                <div className="space-y-1.5">
                  <label className="font-medium text-neutral-300">Primary Headline</label>
                  <input
                    type="text"
                    value={config.headline}
                    onChange={(e) => setConfig({ ...config, headline: e.target.value })}
                    placeholder="Welcome to the Stream!"
                    className="w-full bg-[#181818] border border-[#262626] rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-neutral-400"
                  />
                </div>

                {/* Subtext */}
                <div className="space-y-1.5">
                  <label className="font-medium text-neutral-300">Subtext Information</label>
                  <input
                    type="text"
                    value={config.subtext || ''}
                    onChange={(e) => setConfig({ ...config, subtext: e.target.value })}
                    placeholder="💬 Type !socials in chat..."
                    className="w-full bg-[#181818] border border-[#262626] rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-neutral-400"
                  />
                </div>

                {/* Ticker Messages List */}
                <div className="space-y-2 pt-2 border-t border-[#262626]">
                  <label className="font-medium text-neutral-300">Ticker Rotation Messages ({config.tickerMessages?.length || 0})</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={newTickerInput}
                      onChange={(e) => setNewTickerInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleAddTickerMessage();
                        }
                      }}
                      placeholder="Add rotating message..."
                      className="flex-1 bg-[#181818] border border-[#262626] rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-neutral-400"
                    />
                    <button
                      type="button"
                      onClick={handleAddTickerMessage}
                      className="px-3 py-1.5 rounded-lg bg-white hover:bg-neutral-200 text-black font-semibold text-xs cursor-pointer"
                    >
                      Add
                    </button>
                  </div>

                  <div className="space-y-1.5 max-h-40 overflow-y-auto">
                    {(config.tickerMessages || []).map((msg, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between gap-2 p-2 rounded-lg bg-[#181818] border border-[#262626]"
                      >
                        <span className="truncate text-neutral-300">{msg}</span>
                        <button
                          type="button"
                          onClick={() => handleRemoveTickerMessage(idx)}
                          className="text-neutral-500 hover:text-red-400 p-0.5"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* TAB 2: ANIMATION */}
            {activeTab === 'animation' && (
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <label className="font-medium text-neutral-300">Flow Style</label>
                  <div className="space-y-1.5">
                    {ANIMATION_FLOWS.map((flow) => {
                      const isSelected = config.animationFlow === flow.id;
                      return (
                        <div
                          key={flow.id}
                          onClick={() => setConfig({ ...config, animationFlow: flow.id as any })}
                          className={`p-2.5 rounded-lg border text-left cursor-pointer transition-colors ${
                            isSelected
                              ? 'bg-white text-black border-white'
                              : 'bg-[#181818] border-[#262626] text-neutral-400 hover:text-white'
                          }`}
                        >
                          <div className="font-semibold text-xs">{flow.label}</div>
                          <div className="text-[10px] opacity-75">{flow.desc}</div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="space-y-1.5 pt-2 border-t border-[#262626]">
                  <label className="font-medium text-neutral-300">Flow Speed</label>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { id: 'slow', label: 'Slow' },
                      { id: 'normal', label: 'Normal' },
                      { id: 'fast', label: 'Fast' }
                    ].map((sp) => (
                      <button
                        key={sp.id}
                        type="button"
                        onClick={() => setConfig({ ...config, animationSpeed: sp.id as any })}
                        className={`py-2 rounded-lg border text-xs text-center transition-colors cursor-pointer ${
                          config.animationSpeed === sp.id
                            ? 'bg-white text-black font-semibold border-white'
                            : 'bg-[#181818] border-[#262626] text-neutral-400 hover:text-white'
                        }`}
                      >
                        {sp.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* TAB 3: GOAL */}
            {activeTab === 'goal' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between p-3 rounded-lg bg-[#181818] border border-[#262626]">
                  <div>
                    <div className="font-medium text-white">Show Stream Goal</div>
                    <div className="text-[11px] text-neutral-400">Display active donation goal on overlay</div>
                  </div>
                  <input
                    type="checkbox"
                    checked={config.showGoal}
                    onChange={(e) => setConfig({ ...config, showGoal: e.target.checked })}
                    className="w-4 h-4 accent-white cursor-pointer"
                  />
                </div>

                {config.showGoal && (
                  <div className="space-y-3 pt-2">
                    <label className="font-medium text-neutral-300">Goal Presentation Layout</label>
                    <div className="space-y-1.5">
                      {[
                        { id: 'compact-pill', title: 'Compact Pill', desc: 'Mini progress pill embedded inside banner' },
                        { id: 'docked', title: 'Docked Side Card', desc: 'Goal box docked on the side' },
                        { id: 'stacked', title: 'Stacked Underneath', desc: 'Progress bar anchored below text' }
                      ].map((lay) => (
                        <div
                          key={lay.id}
                          onClick={() => setConfig({ ...config, goalLayout: lay.id as any })}
                          className={`p-2.5 rounded-lg border cursor-pointer transition-colors ${
                            config.goalLayout === lay.id
                              ? 'bg-white text-black font-semibold border-white'
                              : 'bg-[#181818] border-[#262626] text-neutral-400 hover:text-white'
                          }`}
                        >
                          <div className="text-xs">{lay.title}</div>
                          <div className="text-[10px] opacity-75">{lay.desc}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* TAB 4: LAYOUT & DIMENSIONS */}
            {activeTab === 'layout' && (
              <div className="space-y-4">
                {/* Custom Dimensions */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="font-medium text-neutral-300">Custom Width</label>
                    <span className="font-mono text-neutral-400">{config.customWidth || 1920} px</span>
                  </div>
                  <input
                    type="range"
                    min="200"
                    max="1920"
                    step="10"
                    value={config.customWidth || 1920}
                    onChange={(e) => setConfig({ ...config, customWidth: Number(e.target.value) })}
                    className="w-full accent-white cursor-pointer"
                  />
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="font-medium text-neutral-300">Custom Height</label>
                    <span className="font-mono text-neutral-400">{config.customHeight || 1080} px</span>
                  </div>
                  <input
                    type="range"
                    min="30"
                    max="1080"
                    step="10"
                    value={config.customHeight || 1080}
                    onChange={(e) => setConfig({ ...config, customHeight: Number(e.target.value) })}
                    className="w-full accent-white cursor-pointer"
                  />
                </div>

                {/* Canvas Anchor Placement */}
                <div className="space-y-1.5 pt-2 border-t border-[#262626]">
                  <label className="font-medium text-neutral-300">Canvas Anchor Placement</label>
                  <div className="grid grid-cols-2 gap-1.5">
                    {LAYOUT_POSITIONS.map((pos) => {
                      const isSelected = config.layoutPosition === pos.id;
                      return (
                        <button
                          key={pos.id}
                          type="button"
                          onClick={() => {
                            const isTicker = pos.id === 'top-ticker' || pos.id === 'bottom-ticker';
                            setConfig({
                              ...config,
                              layoutPosition: pos.id as any,
                              customHeight: isTicker && config.customHeight === 1080 ? 80 : config.customHeight
                            });
                          }}
                          className={`p-2 rounded-lg border text-left transition-colors cursor-pointer ${
                            isSelected
                              ? 'bg-white text-black font-semibold border-white'
                              : 'bg-[#181818] border-[#262626] text-neutral-400 hover:text-white'
                          }`}
                        >
                          <div className="text-xs truncate">{pos.label}</div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Backdrop Style */}
                <div className="space-y-1.5 pt-2 border-t border-[#262626]">
                  <label className="font-medium text-neutral-300">Backdrop Style</label>
                  <div className="grid grid-cols-2 gap-1.5">
                    {[
                      { id: 'glass', label: 'Translucent Glass' },
                      { id: 'deep', label: 'Solid Dark' },
                      { id: 'neon-border', label: 'Clean Border' },
                      { id: 'transparent', label: 'Transparent' }
                    ].map((st) => (
                      <button
                        key={st.id}
                        type="button"
                        onClick={() => setConfig({ ...config, backgroundStyle: st.id as any })}
                        className={`p-2 rounded-lg border text-center transition-colors cursor-pointer text-xs ${
                          config.backgroundStyle === st.id
                            ? 'bg-white text-black font-semibold border-white'
                            : 'bg-[#181818] border-[#262626] text-neutral-400 hover:text-white'
                        }`}
                      >
                        {st.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* TAB 5: STYLE */}
            {activeTab === 'style' && (
              <div className="space-y-4">
                {/* Font Family */}
                <div className="space-y-1.5">
                  <label className="font-medium text-neutral-300">Font Family</label>
                  <select
                    value={config.fontFamily}
                    onChange={(e) => setConfig({ ...config, fontFamily: e.target.value })}
                    className="w-full bg-[#181818] border border-[#262626] rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-neutral-400 cursor-pointer"
                  >
                    {FONT_OPTIONS.map((f) => (
                      <option key={f.value} value={f.value}>{f.label}</option>
                    ))}
                  </select>
                </div>

                {/* Font Size */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="font-medium text-neutral-300">Font Size</label>
                    <span className="font-mono text-neutral-400">{config.fontSize || 18} px</span>
                  </div>
                  <input
                    type="range"
                    min="12"
                    max="48"
                    value={config.fontSize || 18}
                    onChange={(e) => setConfig({ ...config, fontSize: Number(e.target.value) })}
                    className="w-full accent-white cursor-pointer"
                  />
                </div>

                {/* Accent Color Swatches */}
                <div className="space-y-1.5 pt-2 border-t border-[#262626]">
                  <label className="font-medium text-neutral-300">Theme Color</label>
                  <div className="flex flex-wrap gap-2">
                    {PRESET_COLORS.map((c) => (
                      <button
                        key={c.hex}
                        type="button"
                        onClick={() =>
                          setConfig({
                            ...config,
                            accentColor: c.hex,
                            glowColor: c.hex
                          })
                        }
                        className={`w-6 h-6 rounded-full border transition-transform cursor-pointer ${
                          config.accentColor === c.hex ? 'scale-125 border-white ring-2 ring-white/50' : 'border-neutral-700'
                        }`}
                        style={{ backgroundColor: c.hex }}
                        title={c.name}
                      />
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Sticky Rightbar Bottom Save Button */}
          <div className="p-4 border-t border-[#262626] bg-[#0f0f0f] shrink-0">
            <Button
              onClick={handleSave}
              disabled={isSaving}
              className="w-full bg-white hover:bg-neutral-200 text-black font-semibold text-xs py-2.5 rounded-lg transition-colors flex items-center justify-center gap-1.5"
            >
              {isSaving ? (
                <>
                  <RefreshCw size={13} className="animate-spin" />
                  <span>Saving...</span>
                </>
              ) : saveSuccess ? (
                <>
                  <Check size={14} className="text-emerald-600" />
                  <span>Saved!</span>
                </>
              ) : (
                <span>Save Configuration</span>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
