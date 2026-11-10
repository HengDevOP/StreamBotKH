'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
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
  Zap,
  Maximize2
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
  { name: 'Emerald', hex: '#10B981' },
  { name: 'Cyan', hex: '#06B6D4' },
  { name: 'Sky', hex: '#38BDF8' },
  { name: 'Violet', hex: '#8B5CF6' },
  { name: 'Rose', hex: '#F43F5E' },
  { name: 'Amber', hex: '#F59E0B' },
  { name: 'Pure White', hex: '#FFFFFF' }
];

const ANIMATION_FLOWS = [
  {
    id: 'marquee',
    label: 'Marquee Ticker',
    desc: 'Classic smooth horizontal broadcast crawl loop',
    badge: 'Popular'
  },
  {
    id: 'typewriter',
    label: 'Typewriter Flow',
    desc: 'Letter-by-letter live terminal typing with blinking cursor',
    badge: 'Dynamic'
  },
  {
    id: 'fade-slide',
    label: 'Fade & Slide',
    desc: 'Smooth vertical entrance and exit cycling through messages',
    badge: 'Smooth'
  },
  {
    id: 'float-bounce',
    label: 'Float & Bounce',
    desc: 'Gentle rhythmic floating sinusoidal wave motion',
    badge: 'Chill'
  },
  {
    id: 'wave-glow',
    label: 'Wave Glow',
    desc: 'Animated iridescent light shimmer sweeping across text',
    badge: 'Glow'
  },
  {
    id: 'cyber-glitch',
    label: 'Cyber Glitch',
    desc: 'Neon cybernetic pulse breathing with digital aesthetic',
    badge: 'Cyber'
  },
  {
    id: 'flip-3d',
    label: 'Flip 3D',
    desc: 'Perspective billboard 3D flip card transition',
    badge: '3D'
  }
];

const LAYOUT_POSITIONS = [
  { id: 'top-ticker', label: 'Top Bar Ticker', desc: 'Full-width banner fixed at the top edge' },
  { id: 'bottom-ticker', label: 'Bottom Dock Ticker', desc: 'Full-width dock fixed at the bottom edge' },
  { id: 'top-left', label: 'Top-Left Card', desc: 'Modern floating card pinned to upper-left' },
  { id: 'top-right', label: 'Top-Right Card', desc: 'Modern floating card pinned to upper-right' },
  { id: 'bottom-left', label: 'Bottom-Left Card', desc: 'Stream lower-third pinned to bottom-left' },
  { id: 'bottom-right', label: 'Bottom-Right Card', desc: 'Stream lower-third pinned to bottom-right' },
  { id: 'center-lower', label: 'Center Lower-Third', desc: 'Centered broadcast presentation banner' }
];

const BADGE_ICONS = [
  { id: 'radio', label: 'Radio / Live', icon: Radio },
  { id: 'sparkles', label: 'Sparkles', icon: Sparkles },
  { id: 'bell', label: 'Bell', icon: Bell },
  { id: 'flame', label: 'Flame', icon: Flame },
  { id: 'crown', label: 'Crown', icon: Crown },
  { id: 'star', label: 'Star', icon: Star },
  { id: 'heart', label: 'Heart', icon: Heart },
  { id: 'tv', label: 'TV Screen', icon: Tv },
  { id: 'none', label: 'None (Text Only)', icon: null }
];

const DIMENSION_PRESETS = [
  { label: '1920 × 1080 (Full 1080p)', w: 1920, h: 1080 },
  { label: '1920 × 80 (Standard Ticker)', w: 1920, h: 80 },
  { label: '1920 × 120 (Tall Ticker Bar)', w: 1920, h: 120 },
  { label: '800 × 200 (Lower-Third Banner)', w: 800, h: 200 },
  { label: '600 × 250 (Corner Card)', w: 600, h: 250 },
  { label: '400 × 150 (Compact Dock)', w: 400, h: 150 }
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

  // Preview canvas background mode: 'grid' | 'dark' | 'gameplay'
  const [previewBg, setPreviewBg] = useState<'grid' | 'dark' | 'gameplay'>('grid');
  // Bounds line toggle
  const [showBoundsLine, setShowBoundsLine] = useState<boolean>(true);

  // 1920x1080 Virtual Canvas Responsive Scale Engine
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
    backgroundColor: 'rgba(11, 15, 25, 0.88)',
    borderColor: 'rgba(16, 185, 129, 0.35)',
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

  // 1. Load configuration from API
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

  // Save changes to backend
  const handleSave = async () => {
    setIsSaving(true);
    setSaveSuccess(false);

    try {
      const res = await fetch('/api/widgets/custom-overlay', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...config,
          token
        })
      });

      const data = await res.json();
      if (data.success) {
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 3000);
      } else {
        alert(data.error || 'Failed to save overlay settings');
      }
    } catch (err: any) {
      console.error('Error saving overlay config:', err);
      alert('Error saving overlay settings');
    } finally {
      setIsSaving(false);
    }
  };

  // Test broadcast / pulse OBS
  const handleTestBroadcast = () => {
    if (socket) {
      socket.emit('custom-overlay:test', { token });
    }
    setTestSent(true);
    setTimeout(() => setTestSent(false), 2000);
  };

  // Reset to default configuration
  const handleReset = () => {
    if (window.confirm('Reset overlay settings to defaults?')) {
      setConfig({
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
        backgroundColor: 'rgba(11, 15, 25, 0.88)',
        borderColor: 'rgba(16, 185, 129, 0.35)',
        backgroundStyle: 'glass',
        showBackground: true,
        isActive: true
      });
    }
  };

  // Resolved custom bounds (1080p stream space)
  const targetW = Math.min(1920, Math.max(100, Number(config.customWidth) || 1920));
  const targetH = Math.min(1080, Math.max(30, Number(config.customHeight) || 1080));

  // Compute position of custom box inside 1920x1080 canvas
  const getCustomBoxPositionStyle = (): React.CSSProperties => {
    if (targetW >= 1920 && targetH >= 1080) {
      return {
        top: 0,
        left: 0,
        width: 1920,
        height: 1080,
        position: 'absolute'
      };
    }

    const leftCenter = Math.max(0, (1920 - targetW) / 2);

    switch (config.layoutPosition) {
      case 'top-ticker':
        return {
          top: 0,
          left: leftCenter,
          width: targetW,
          height: targetH,
          position: 'absolute'
        };
      case 'bottom-ticker':
        return {
          top: 1080 - targetH,
          left: leftCenter,
          width: targetW,
          height: targetH,
          position: 'absolute'
        };
      case 'top-left':
        return {
          top: 40,
          left: 40,
          width: targetW,
          height: targetH,
          position: 'absolute'
        };
      case 'top-right':
        return {
          top: 40,
          left: 1920 - targetW - 40,
          width: targetW,
          height: targetH,
          position: 'absolute'
        };
      case 'bottom-left':
        return {
          top: 1080 - targetH - 40,
          left: 40,
          width: targetW,
          height: targetH,
          position: 'absolute'
        };
      case 'bottom-right':
        return {
          top: 1080 - targetH - 40,
          left: 1920 - targetW - 40,
          width: targetW,
          height: targetH,
          position: 'absolute'
        };
      case 'center-lower':
      default:
        return {
          top: 1080 - targetH - 60,
          left: leftCenter,
          width: targetW,
          height: targetH,
          position: 'absolute'
        };
    }
  };

  return (
    <div className="w-full max-w-7xl mx-auto space-y-6 pb-16">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900/60 border border-slate-800 rounded-2xl p-5 backdrop-blur-md">
        <div className="flex items-start gap-3.5">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-cyan-500/20 to-emerald-500/20 border border-cyan-500/30 flex items-center justify-center shrink-0 shadow-lg shadow-cyan-500/10">
            <Layers className="w-6 h-6 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-xl font-bold text-white tracking-tight">Custom Overlay Studio</h1>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
                PRO ACTIVE
              </span>
            </div>
            <p className="text-sm text-slate-400 mt-0.5">
              Design animated on-screen tickers, cards & lower-thirds with real-time text flow and live stream goal integration.
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2.5 shrink-0">
          <Button
            variant="outline"
            size="sm"
            onClick={handleReset}
            icon={<RotateCcw className="w-4 h-4" />}
          >
            Reset
          </Button>

          <Button
            variant="secondary"
            size="sm"
            onClick={handleTestBroadcast}
            icon={testSent ? <Check className="w-4 h-4 text-emerald-400" /> : <Play className="w-4 h-4 text-cyan-400" />}
          >
            {testSent ? 'Pulsed OBS!' : 'Test OBS'}
          </Button>

          <Button
            variant="primary"
            size="sm"
            onClick={handleSave}
            loading={isSaving}
            icon={saveSuccess ? <CheckCircle2 className="w-4 h-4" /> : <Zap className="w-4 h-4" />}
            className="shadow-lg shadow-cyan-500/20"
          >
            {saveSuccess ? 'Saved to OBS!' : 'Save & Broadcast'}
          </Button>
        </div>
      </div>

      {/* Interactive 1920x1080 OBS Stream Preview Screen */}
      <div className="bg-slate-900/70 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl">
        {/* Preview Control & Custom Dimensions Toolbar */}
        <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-3 border-b border-slate-800/90 bg-slate-950/70">
          <div className="flex items-center gap-2.5">
            <Monitor className="w-4 h-4 text-cyan-400" />
            <span className="text-xs font-bold uppercase tracking-wider text-slate-200">
              OBS 1080p Canvas Preview
            </span>
            <span className="text-[11px] text-cyan-400 font-mono font-bold px-2 py-0.5 rounded-md bg-cyan-500/10 border border-cyan-500/30">
              1920 × 1080
            </span>
          </div>

          {/* Quick Custom W & H Inputs */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1.5 bg-slate-900 px-3 py-1.5 rounded-xl border border-slate-750 text-xs shadow-inner">
              <span className="text-[11px] font-bold text-slate-400 uppercase">W:</span>
              <input
                type="number"
                min="100"
                max="1920"
                step="10"
                value={config.customWidth || 1920}
                onChange={(e) => setConfig({ ...config, customWidth: Number(e.target.value) || 100 })}
                className="w-16 bg-slate-950 border border-slate-700 rounded px-1.5 py-0.5 text-xs text-white font-mono text-center focus:outline-none focus:border-cyan-400"
                title="Custom Overlay Width in pixels"
              />
              <span className="text-[10px] text-slate-500 font-mono">px</span>

              <span className="text-slate-600 mx-1">×</span>

              <span className="text-[11px] font-bold text-slate-400 uppercase">H:</span>
              <input
                type="number"
                min="30"
                max="1080"
                step="10"
                value={config.customHeight || 1080}
                onChange={(e) => setConfig({ ...config, customHeight: Number(e.target.value) || 40 })}
                className="w-16 bg-slate-950 border border-slate-700 rounded px-1.5 py-0.5 text-xs text-white font-mono text-center focus:outline-none focus:border-cyan-400"
                title="Custom Overlay Height in pixels"
              />
              <span className="text-[10px] text-slate-500 font-mono">px</span>
            </div>

            {/* Guide line toggle */}
            <button
              type="button"
              onClick={() => setShowBoundsLine(!showBoundsLine)}
              className={`px-3 py-1.5 rounded-xl border text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer ${
                showBoundsLine
                  ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40 shadow-sm'
                  : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-slate-200'
              }`}
              title="Toggle Custom W x H Boundary Guide Line"
            >
              <Maximize2 className="w-3.5 h-3.5" />
              <span>Bounds Line: {showBoundsLine ? 'ON' : 'OFF'}</span>
            </button>

            {/* Background Toggle */}
            <div className="flex items-center gap-1 bg-slate-900 p-1 rounded-xl border border-slate-800 text-xs">
              <button
                onClick={() => setPreviewBg('grid')}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-colors cursor-pointer ${
                  previewBg === 'grid'
                    ? 'bg-slate-800 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Grid
              </button>
              <button
                onClick={() => setPreviewBg('dark')}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-colors cursor-pointer ${
                  previewBg === 'dark'
                    ? 'bg-slate-800 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Dark
              </button>
              <button
                onClick={() => setPreviewBg('gameplay')}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-colors cursor-pointer ${
                  previewBg === 'gameplay'
                    ? 'bg-slate-800 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Stream Room
              </button>
            </div>
          </div>
        </div>

        {/* Live Canvas Viewport (1920x1080 Scaled Viewport) */}
        <div
          ref={previewContainerRef}
          className={`relative w-full aspect-video min-h-[300px] max-h-[540px] overflow-hidden select-none transition-all duration-300 ${
            previewBg === 'grid'
              ? 'bg-[radial-gradient(#1e293b_1px,transparent_1px)] [background-size:24px_24px] bg-[#050811]'
              : previewBg === 'dark'
              ? 'bg-[#060911]'
              : 'bg-gradient-to-tr from-slate-950 via-[#0B132B] to-[#1C2541]'
          }`}
        >
          {/* Virtual 1920x1080 Native Canvas Scaled to Fit Container */}
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
            {/* Gameplay Backdrop */}
            {previewBg === 'gameplay' && (
              <div className="absolute inset-0 opacity-20 flex items-center justify-center pointer-events-none">
                <div className="text-center space-y-4">
                  <Tv className="w-36 h-36 mx-auto text-slate-500" />
                  <p className="text-xl font-mono uppercase tracking-widest text-slate-400">
                    1080p Stream Gameplay / Broadcast Canvas (1920 × 1080)
                  </p>
                </div>
              </div>
            )}

            {/* Grid Crosshairs for 1080p Canvas */}
            {previewBg === 'grid' && (
              <div className="absolute inset-0 pointer-events-none opacity-25">
                <div className="absolute top-1/2 left-0 w-full h-[1px] bg-slate-700/60" />
                <div className="absolute top-0 left-1/2 h-full w-[1px] bg-slate-700/60" />
              </div>
            )}

            {/* Custom W & H Region with Boundary Line */}
            <div
              className="absolute transition-all duration-300"
              style={getCustomBoxPositionStyle()}
            >
              {/* Boundary Guide Line from Custom W & H */}
              {showBoundsLine && (
                <div className="absolute -inset-1 border-2 border-dashed border-cyan-400/90 rounded-2xl shadow-[0_0_25px_rgba(6,182,212,0.4)] pointer-events-none z-30">
                  {/* Dimension Badge */}
                  <div className="absolute -top-4 right-4 px-3 py-1 rounded-full bg-cyan-400 text-slate-950 font-mono font-black text-xs shadow-lg flex items-center gap-1.5 uppercase tracking-wider">
                    <Maximize2 className="w-3 h-3" />
                    <span>{targetW} × {targetH} px</span>
                  </div>

                  {/* Corner Guides */}
                  <span className="absolute -top-1.5 -left-1.5 w-4 h-4 border-t-2 border-l-2 border-cyan-300" />
                  <span className="absolute -top-1.5 -right-1.5 w-4 h-4 border-t-2 border-r-2 border-cyan-300" />
                  <span className="absolute -bottom-1.5 -left-1.5 w-4 h-4 border-b-2 border-l-2 border-cyan-300" />
                  <span className="absolute -bottom-1.5 -right-1.5 w-4 h-4 border-b-2 border-r-2 border-cyan-300" />
                </div>
              )}

              {/* Live Preview Data Rendered INSIDE the Custom W & H Box */}
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

      {/* Main Studio Configuration Tabs & Panels */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        {/* Navigation Tabs */}
        <div className="flex items-center overflow-x-auto border-b border-slate-800/80 bg-slate-950/40 p-1.5 gap-1.5 scrollbar-thin">
          <button
            onClick={() => setActiveTab('content')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'content'
                ? 'bg-slate-800 text-white shadow-md'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-850'
            }`}
          >
            <Type className="w-4 h-4 text-white" />
            Content & Ticker
          </button>

          <button
            onClick={() => setActiveTab('animation')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'animation'
                ? 'bg-slate-800 text-white shadow-md'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-850'
            }`}
          >
            <Sparkles className="w-4 h-4 text-white" />
            Flow Animation
          </button>

          <button
            onClick={() => setActiveTab('goal')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'goal'
                ? 'bg-slate-800 text-white shadow-md'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-850'
            }`}
          >
            <Target className="w-4 h-4 text-white" />
            Goal Integration
            {config.showGoal && (
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
            )}
          </button>

          <button
            onClick={() => setActiveTab('layout')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'layout'
                ? 'bg-slate-800 text-white shadow-md'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-850'
            }`}
          >
            <Layout className="w-4 h-4 text-white" />
            Layout, W & H
          </button>

          <button
            onClick={() => setActiveTab('style')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'style'
                ? 'bg-slate-800 text-white shadow-md'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-850'
            }`}
          >
            <Palette className="w-4 h-4 text-white" />
            Typography & Colors
          </button>
        </div>

        {/* Tab Contents */}
        <div className="p-6">
          {/* ================= TAB 1: CONTENT & TICKER ================= */}
          {activeTab === 'content' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {/* Badge Tag */}
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                    Header Badge / Tag
                  </label>
                  <input
                    type="text"
                    value={config.badgeText || ''}
                    onChange={(e) => setConfig({ ...config, badgeText: e.target.value })}
                    placeholder="e.g. 🔴 LIVE STREAM, 📢 ANNOUNCEMENT"
                    className="w-full bg-slate-950/80 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-cyan-400"
                  />
                  <p className="text-[11px] text-slate-400">
                    A prominent pill tag shown on the left of your overlay.
                  </p>
                </div>

                {/* Badge Icon */}
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                    Badge Icon
                  </label>
                  <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
                    {BADGE_ICONS.map((b) => {
                      const IconComp = b.icon;
                      const isSelected = config.badgeIcon === b.id;
                      return (
                        <button
                          key={b.id}
                          type="button"
                          onClick={() => setConfig({ ...config, badgeIcon: b.id })}
                          className={`flex flex-col items-center justify-center p-2 rounded-xl border text-xs transition-all cursor-pointer ${
                            isSelected
                              ? 'bg-slate-800 border-cyan-400 text-cyan-300 shadow-md shadow-cyan-500/10'
                              : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700'
                          }`}
                        >
                          {IconComp ? <IconComp className="w-4 h-4 mb-1" /> : <span className="text-xs mb-1">—</span>}
                          <span className="text-[10px] truncate max-w-full">{b.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Primary Headline */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                  Primary Headline / Announcement
                </label>
                <input
                  type="text"
                  value={config.headline}
                  onChange={(e) => setConfig({ ...config, headline: e.target.value })}
                  placeholder="Welcome to the Stream! Don’t forget to follow & share!"
                  className="w-full bg-slate-950/80 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-cyan-400"
                />
              </div>

              {/* Subtext / Details */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                  Subtext / Secondary Info
                </label>
                <input
                  type="text"
                  value={config.subtext || ''}
                  onChange={(e) => setConfig({ ...config, subtext: e.target.value })}
                  placeholder="💬 Type !socials in chat • 🎁 Support via KHQR / ABA • ⚡ Daily Gaming"
                  className="w-full bg-slate-950/80 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-cyan-400"
                />
              </div>

              {/* Rotating Ticker Messages */}
              <div className="space-y-3 pt-3 border-t border-slate-800">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                    Rotating Ticker Messages ({config.tickerMessages?.length || 0})
                  </label>
                  <span className="text-[11px] text-slate-400">
                    Cycles seamlessly across marquee, typewriter & fade animations
                  </span>
                </div>

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
                    placeholder="Add a new message to the ticker rotation..."
                    className="flex-1 bg-slate-950/80 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-cyan-400"
                  />
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={handleAddTickerMessage}
                    icon={<Plus className="w-4 h-4" />}
                  >
                    Add
                  </Button>
                </div>

                {/* Messages List */}
                <div className="space-y-2 mt-2">
                  {(config.tickerMessages || []).map((msg, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between gap-3 p-3 rounded-xl bg-slate-950/60 border border-slate-800/80 hover:border-slate-700 text-sm text-slate-200"
                    >
                      <div className="flex items-center gap-2.5 truncate">
                        <span className="w-5 h-5 rounded-md bg-slate-800 text-[11px] font-bold text-slate-400 flex items-center justify-center shrink-0">
                          {idx + 1}
                        </span>
                        <span className="truncate">{msg}</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveTickerMessage(idx)}
                        className="p-1.5 rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-colors cursor-pointer"
                        title="Delete Message"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ================= TAB 2: ANIMATION & FLOW ================= */}
          {activeTab === 'animation' && (
            <div className="space-y-6">
              <div>
                <label className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-3 block">
                  Select Flow Display Animation
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {ANIMATION_FLOWS.map((flow) => {
                    const isSelected = config.animationFlow === flow.id;
                    return (
                      <button
                        key={flow.id}
                        type="button"
                        onClick={() => setConfig({ ...config, animationFlow: flow.id as any })}
                        className={`text-left p-4 rounded-xl border transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-slate-800/90 border-cyan-400 shadow-lg shadow-cyan-500/10 ring-1 ring-cyan-400'
                            : 'bg-slate-950/60 border-slate-800 hover:border-slate-700 text-slate-300'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="text-sm font-bold text-white">{flow.label}</span>
                          <span
                            className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full ${
                              isSelected
                                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                                : 'bg-slate-800 text-slate-400'
                            }`}
                          >
                            {flow.badge}
                          </span>
                        </div>
                        <p className="text-xs text-slate-400 leading-relaxed">{flow.desc}</p>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Animation Speed */}
              <div className="space-y-2.5 pt-4 border-t border-slate-800">
                <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block">
                  Animation Flow Speed
                </label>
                <div className="grid grid-cols-3 gap-3 max-w-md">
                  {[
                    { id: 'slow', label: 'Slow (Relaxed)', desc: 'Gentle, easy to read' },
                    { id: 'normal', label: 'Normal (Balanced)', desc: 'Standard broadcast pace' },
                    { id: 'fast', label: 'Fast (Dynamic)', desc: 'High energy stream pace' }
                  ].map((speed) => {
                    const isSelected = config.animationSpeed === speed.id;
                    return (
                      <button
                        key={speed.id}
                        type="button"
                        onClick={() => setConfig({ ...config, animationSpeed: speed.id as any })}
                        className={`p-3 rounded-xl border text-center transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-slate-800 border-cyan-400 text-white shadow-md shadow-cyan-500/10'
                            : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700'
                        }`}
                      >
                        <div className="text-xs font-bold">{speed.label}</div>
                        <div className="text-[10px] text-slate-500 mt-0.5">{speed.desc}</div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* ================= TAB 3: GOAL INTEGRATION ================= */}
          {activeTab === 'goal' && (
            <div className="space-y-6">
              {/* Master Toggle */}
              <div className="flex items-center justify-between p-4 rounded-xl bg-slate-950/70 border border-slate-800">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center shrink-0">
                    <Target className="w-5 h-5 text-emerald-400" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white">
                      Show Stream Goal on Overlay Screen
                    </h3>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Automatically displays and updates your active live donation goal alongside the text in real-time.
                    </p>
                  </div>
                </div>

                {/* Switch */}
                <button
                  type="button"
                  onClick={() => setConfig({ ...config, showGoal: !config.showGoal })}
                  className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                    config.showGoal ? 'bg-emerald-500' : 'bg-slate-700'
                  }`}
                >
                  <span
                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                      config.showGoal ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>

              {config.showGoal && (
                <div className="space-y-5 animate-in fade-in duration-300">
                  {/* Connected Live Goal Status */}
                  <div className="p-4 rounded-xl bg-slate-950/50 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-emerald-400" />
                        <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                          Connected Stream Goal: {activeGoal?.title || 'Active Goal'}
                        </span>
                      </div>
                      <p className="text-xs text-slate-400">
                        Current: <strong className="text-emerald-400">${activeGoal?.currentAmount || 0}</strong> / Target: <strong className="text-white">${activeGoal?.targetAmount || 100}</strong> ({Math.min(100, Math.round(((activeGoal?.currentAmount || 0) / (activeGoal?.targetAmount || 100)) * 100))}%)
                      </p>
                    </div>

                    {onNavigateToGoals && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={onNavigateToGoals}
                        icon={<ArrowRight className="w-4 h-4" />}
                      >
                        Edit Goals in Goals Studio
                      </Button>
                    )}
                  </div>

                  {/* Goal Display Layout Mode */}
                  <div className="space-y-3">
                    <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block">
                      Goal Presentation Style
                    </label>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      {[
                        {
                          id: 'compact-pill',
                          title: 'Compact Neon Pill',
                          desc: 'Sleek mini-progress pill embedded seamlessly into ticker or header bar. Highly space-efficient.'
                        },
                        {
                          id: 'docked',
                          title: 'Docked Side Card',
                          desc: 'Dedicated goal stats box docked neatly on the right side of the ticker stream.'
                        },
                        {
                          id: 'stacked',
                          title: 'Stacked Underneath',
                          desc: 'Progress bar anchored directly beneath the custom text card. Ideal for corner floating cards.'
                        }
                      ].map((layout) => {
                        const isSelected = config.goalLayout === layout.id;
                        return (
                          <button
                            key={layout.id}
                            type="button"
                            onClick={() => setConfig({ ...config, goalLayout: layout.id as any })}
                            className={`text-left p-4 rounded-xl border transition-all cursor-pointer ${
                              isSelected
                                ? 'bg-slate-800/90 border-emerald-400 shadow-lg shadow-emerald-500/10 ring-1 ring-emerald-400'
                                : 'bg-slate-950/60 border-slate-800 hover:border-slate-700 text-slate-300'
                            }`}
                          >
                            <div className="text-sm font-bold text-white mb-1">{layout.title}</div>
                            <div className="text-xs text-slate-400 leading-relaxed">{layout.desc}</div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ================= TAB 4: LAYOUT, W & H ================= */}
          {activeTab === 'layout' && (
            <div className="space-y-6">
              {/* Canvas Custom Dimensions Section */}
              <div className="space-y-4 p-5 rounded-2xl bg-slate-950/70 border border-slate-800 shadow-md">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <Maximize2 className="w-4 h-4 text-cyan-400" />
                      <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider">
                        Custom Dimensions (Width & Height)
                      </h3>
                    </div>
                    <p className="text-[11px] text-slate-400 mt-1">
                      Sets the exact W × H bounds for OBS Studio. Displayed inside the 1920×1080 canvas with a cyan dashed guide line.
                    </p>
                  </div>
                  <div className="text-xs font-mono font-black text-cyan-300 bg-cyan-500/10 border border-cyan-500/30 px-3 py-1.5 rounded-xl shadow-inner shrink-0">
                    {targetW} × {targetH} px
                  </div>
                </div>

                {/* Range Sliders & Inputs */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                  {/* Width Input */}
                  <div className="space-y-2 p-3.5 rounded-xl bg-slate-900/80 border border-slate-800">
                    <div className="flex justify-between items-center text-xs">
                      <span className="font-bold text-slate-300">Custom Width (W)</span>
                      <div className="flex items-center gap-1 font-mono text-cyan-400 font-bold">
                        <input
                          type="number"
                          min="100"
                          max="1920"
                          step="10"
                          value={config.customWidth || 1920}
                          onChange={(e) => setConfig({ ...config, customWidth: Number(e.target.value) || 100 })}
                          className="w-16 bg-slate-950 border border-slate-700 rounded px-1.5 py-0.5 text-xs text-white font-mono text-center focus:outline-none focus:border-cyan-400"
                        />
                        <span>px</span>
                      </div>
                    </div>
                    <input
                      type="range"
                      min="200"
                      max="1920"
                      step="10"
                      value={config.customWidth || 1920}
                      onChange={(e) => setConfig({ ...config, customWidth: Number(e.target.value) })}
                      className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-400"
                    />
                    <div className="flex justify-between text-[10px] text-slate-500 font-mono">
                      <span>200px</span>
                      <span>1280px (720p)</span>
                      <span>1920px (Full HD)</span>
                    </div>
                  </div>

                  {/* Height Input */}
                  <div className="space-y-2 p-3.5 rounded-xl bg-slate-900/80 border border-slate-800">
                    <div className="flex justify-between items-center text-xs">
                      <span className="font-bold text-slate-300">Custom Height (H)</span>
                      <div className="flex items-center gap-1 font-mono text-cyan-400 font-bold">
                        <input
                          type="number"
                          min="30"
                          max="1080"
                          step="10"
                          value={config.customHeight || 1080}
                          onChange={(e) => setConfig({ ...config, customHeight: Number(e.target.value) || 30 })}
                          className="w-16 bg-slate-950 border border-slate-700 rounded px-1.5 py-0.5 text-xs text-white font-mono text-center focus:outline-none focus:border-cyan-400"
                        />
                        <span>px</span>
                      </div>
                    </div>
                    <input
                      type="range"
                      min="30"
                      max="1080"
                      step="10"
                      value={config.customHeight || 1080}
                      onChange={(e) => setConfig({ ...config, customHeight: Number(e.target.value) })}
                      className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-400"
                    />
                    <div className="flex justify-between text-[10px] text-slate-500 font-mono">
                      <span>30px</span>
                      <span>80px (Standard Ticker)</span>
                      <span>1080px (Full HD)</span>
                    </div>
                  </div>
                </div>

                {/* Dimension Presets */}
                <div className="space-y-2 pt-2 border-t border-slate-800/80">
                  <span className="text-[11px] font-semibold text-slate-400">Quick Dimension Presets:</span>
                  <div className="flex flex-wrap gap-2">
                    {DIMENSION_PRESETS.map((p) => {
                      const isSelected = config.customWidth === p.w && config.customHeight === p.h;
                      return (
                        <button
                          key={p.label}
                          type="button"
                          onClick={() => setConfig({ ...config, customWidth: p.w, customHeight: p.h })}
                          className={`px-3 py-1.5 rounded-xl border text-xs font-mono transition-colors cursor-pointer ${
                            isSelected
                              ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/50 shadow-sm'
                              : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white hover:border-slate-700'
                          }`}
                        >
                          {p.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Layout Placement */}
              <div>
                <label className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-3 block">
                  Canvas Position & Anchor
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
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
                            // If switching to ticker and height is default 1080, suggest 80px
                            customHeight: isTicker && config.customHeight === 1080 ? 80 : config.customHeight
                          });
                        }}
                        className={`text-left p-4 rounded-xl border transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-slate-800/90 border-cyan-400 shadow-lg shadow-cyan-500/10 ring-1 ring-cyan-400'
                            : 'bg-slate-950/60 border-slate-800 hover:border-slate-700 text-slate-300'
                        }`}
                      >
                        <div className="text-sm font-bold text-white mb-1">{pos.label}</div>
                        <div className="text-xs text-slate-400 leading-relaxed">{pos.desc}</div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Background Glass Style */}
              <div className="space-y-3 pt-4 border-t border-slate-800">
                <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block">
                  Backdrop & Border Style
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                  {[
                    { id: 'glass', label: 'Frosted Glassmorphism', desc: 'Modern translucent backdrop with soft blur' },
                    { id: 'deep', label: 'Deep Dark (#0B0F19)', desc: 'High contrast solid dark backdrop' },
                    { id: 'neon-border', label: 'Cyber Neon Border', desc: 'Glowing perimeter box shadow with accent glow' },
                    { id: 'transparent', label: 'Pure Transparent', desc: 'Text & goal floating cleanly with no box background' }
                  ].map((style) => {
                    const isSelected = config.backgroundStyle === style.id;
                    return (
                      <button
                        key={style.id}
                        type="button"
                        onClick={() => setConfig({ ...config, backgroundStyle: style.id as any })}
                        className={`text-left p-3.5 rounded-xl border transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-slate-800 border-cyan-400 text-white shadow-md shadow-cyan-500/10'
                            : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700'
                        }`}
                      >
                        <div className="text-xs font-bold text-white mb-0.5">{style.label}</div>
                        <div className="text-[11px] text-slate-400">{style.desc}</div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* ================= TAB 5: TYPOGRAPHY & COLORS ================= */}
          {activeTab === 'style' && (
            <div className="space-y-6">
              {/* Font Family & Size */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                    Font Family
                  </label>
                  <select
                    value={config.fontFamily}
                    onChange={(e) => setConfig({ ...config, fontFamily: e.target.value })}
                    className="w-full bg-slate-950/80 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-cyan-400"
                  >
                    {FONT_OPTIONS.map((f) => (
                      <option key={f.value} value={f.value}>
                        {f.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <label className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                      Font Size ({config.fontSize}px)
                    </label>
                  </div>
                  <input
                    type="range"
                    min="14"
                    max="36"
                    step="1"
                    value={config.fontSize}
                    onChange={(e) => setConfig({ ...config, fontSize: Number(e.target.value) })}
                    className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-400 mt-2"
                  />
                  <div className="flex justify-between text-[10px] text-slate-500 font-mono">
                    <span>14px (Compact)</span>
                    <span>20px (Medium)</span>
                    <span>36px (Huge)</span>
                  </div>
                </div>
              </div>

              {/* Color Controls */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-5 pt-4 border-t border-slate-800">
                {/* Text Color */}
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                    Text Color
                  </label>
                  <div className="flex items-center gap-3">
                    <input
                      type="color"
                      value={config.textColor || '#FFFFFF'}
                      onChange={(e) => setConfig({ ...config, textColor: e.target.value })}
                      className="w-10 h-10 rounded-xl bg-transparent border border-slate-700 cursor-pointer"
                    />
                    <input
                      type="text"
                      value={config.textColor || '#FFFFFF'}
                      onChange={(e) => setConfig({ ...config, textColor: e.target.value })}
                      className="flex-1 bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white font-mono uppercase"
                    />
                  </div>
                </div>

                {/* Accent Color */}
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                    Accent Color
                  </label>
                  <div className="flex items-center gap-3">
                    <input
                      type="color"
                      value={config.accentColor || '#10B981'}
                      onChange={(e) => setConfig({ ...config, accentColor: e.target.value })}
                      className="w-10 h-10 rounded-xl bg-transparent border border-slate-700 cursor-pointer"
                    />
                    <input
                      type="text"
                      value={config.accentColor || '#10B981'}
                      onChange={(e) => setConfig({ ...config, accentColor: e.target.value })}
                      className="flex-1 bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white font-mono uppercase"
                    />
                  </div>
                </div>

                {/* Glow Color */}
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                    Glow & Shadow Color
                  </label>
                  <div className="flex items-center gap-3">
                    <input
                      type="color"
                      value={config.glowColor || '#10B981'}
                      onChange={(e) => setConfig({ ...config, glowColor: e.target.value })}
                      className="w-10 h-10 rounded-xl bg-transparent border border-slate-700 cursor-pointer"
                    />
                    <input
                      type="text"
                      value={config.glowColor || '#10B981'}
                      onChange={(e) => setConfig({ ...config, glowColor: e.target.value })}
                      className="flex-1 bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white font-mono uppercase"
                    />
                  </div>
                </div>
              </div>

              {/* Preset Palette Swatches */}
              <div className="space-y-2 pt-2">
                <span className="text-[11px] font-semibold text-slate-400">Quick Palette Swatches:</span>
                <div className="flex flex-wrap items-center gap-2">
                  {PRESET_COLORS.map((c) => (
                    <button
                      key={c.name}
                      type="button"
                      onClick={() => setConfig({ ...config, accentColor: c.hex, glowColor: c.hex })}
                      className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-950 border border-slate-800 hover:border-slate-700 text-xs text-slate-300 transition-colors cursor-pointer"
                    >
                      <span className="w-3 h-3 rounded-full" style={{ backgroundColor: c.hex }} />
                      <span>{c.name}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
