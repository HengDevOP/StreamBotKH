'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Tv,
  ArrowLeft,
  Copy,
  Check,
  ExternalLink,
  Play,
  Sparkles,
  Sliders,
  Volume2,
  Clock,
  DollarSign,
  Image as ImageIcon,
  CheckCircle2,
  RefreshCw,
  Layers,
  Settings,
  MessageSquare,
  Maximize2,
  Monitor,
  Trash2,
  Send,
  Eye,
  CheckCheck,
  ZoomIn,
  ZoomOut,
  Scan,
  Maximize
} from 'lucide-react';
import { Button } from '../common/Button';
import { Card } from '../common/Card';
import { Switch } from '../common/Switch';
import { useSocket } from '../../context/SocketContext';
import { useModal } from '../../context/ModalContext';
import { useAudio } from '../../hooks/useAudio';
import { MediaItem } from './MediaLibraryManager';
import { NeonAlertCard } from '../overlay/NeonAlertCard';

interface OverlayStudioProps {
  overlayId: string;
}

export interface OverlayData {
  _id: string;
  userId: string;
  name: string;
  overlayToken: string;
  width?: number;
  height?: number;
  mediaId?: string;
  mediaUrl?: string;
  soundUrl?: string;
  soundVolume?: number;
  glowColor?: string;
  templateStyle?: string;
  durationSeconds?: number;
  minAmountAlert?: number;
  ttsEnabled?: boolean;
  isDefault?: boolean;
  createdAt: string;
  updatedAt: string;
}

type StudioTab = 'appearance' | 'audio' | 'text' | 'canvas' | 'obs';

export const OverlayStudio: React.FC<OverlayStudioProps> = ({ overlayId }) => {
  const navigate = useNavigate();
  const { socket } = useSocket();
  const { showConfirm, showAlert } = useModal();
  const { playSound } = useAudio();

  const [overlay, setOverlay] = useState<OverlayData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'idle'>('idle');
  const [activeTab, setActiveTab] = useState<StudioTab>('appearance');
  const [copiedUrl, setCopiedUrl] = useState(false);
  const [testing, setTesting] = useState(false);

  // Editable Properties
  const [name, setName] = useState('');
  const [width, setWidth] = useState(1080);
  const [height, setHeight] = useState(720);
  const [mediaUrl, setMediaUrl] = useState('https://media.giphy.com/media/l41lT4n6ylgW2hh04/giphy.gif');
  const [soundUrl, setSoundUrl] = useState('/sounds/neon-chime.mp3');
  const [soundVolume, setSoundVolume] = useState(0.85);
  const [glowColor, setGlowColor] = useState('#00F0FF');
  const [templateStyle, setTemplateStyle] = useState('neon-box');
  const [durationSeconds, setDurationSeconds] = useState(8);
  const [minAmountAlert, setMinAmountAlert] = useState(1.0);
  const [ttsEnabled, setTtsEnabled] = useState(true);

  // Media Library for selection
  const [mediaList, setMediaList] = useState<MediaItem[]>([]);

  // Simulator Canvas State
  const activeTestAlertRef = useRef<any>(null);
  const [activeTestAlert, setActiveTestAlert] = useState<any>(null);
  const alertTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Canvas Viewport & Scaling State
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [containerSize, setContainerSize] = useState<{ width: number; height: number }>({ width: 800, height: 460 });
  const [scaleMode, setScaleMode] = useState<'fit' | '25' | '50' | '75' | '100'>('fit');
  const [manualScale, setManualScale] = useState<number | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;
    const el = containerRef.current;
    const updateSize = () => {
      if (el) {
        setContainerSize({
          width: Math.max(200, el.clientWidth - 48),
          height: Math.max(200, el.clientHeight - 48)
        });
      }
    };
    updateSize();
    const ro = new ResizeObserver(updateSize);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const fitScale = Math.min(
    containerSize.width / (width || 1),
    containerSize.height / (height || 1)
  );

  const currentScale = manualScale !== null
    ? manualScale
    : scaleMode === 'fit'
      ? Math.max(0.05, Math.min(fitScale, 1.0))
      : parseInt(scaleMode, 10) / 100;

  const scaledWidth = Math.round(width * currentScale);
  const scaledHeight = Math.round(height * currentScale);

  const handleZoomIn = () => {
    const next = Math.min(2.0, (manualScale ?? currentScale) + 0.1);
    setManualScale(parseFloat(next.toFixed(2)));
  };

  const handleZoomOut = () => {
    const next = Math.max(0.15, (manualScale ?? currentScale) - 0.1);
    setManualScale(parseFloat(next.toFixed(2)));
  };

  const handleSetPreset = (preset: 'fit' | '25' | '50' | '75' | '100') => {
    setScaleMode(preset);
    if (preset === 'fit') {
      setManualScale(null);
    } else {
      setManualScale(parseInt(preset, 10) / 100);
    }
  };

  // Fetch overlay details and media library
  useEffect(() => {
    let isMounted = true;

    const fetchOverlay = async () => {
      try {
        setLoading(true);
        const [resOverlay, resMedia] = await Promise.all([
          fetch(`/api/overlays/${overlayId}`),
          fetch('/api/media')
        ]);

        const dataOverlay = await resOverlay.json();
        const dataMedia = await resMedia.json();

        if (isMounted) {
          if (resOverlay.ok && dataOverlay.success && dataOverlay.overlay) {
            const ov = dataOverlay.overlay;
            setOverlay(ov);
            setName(ov.name || 'Overlay');
            setWidth(ov.width || 1080);
            setHeight(ov.height || 720);
            setMediaUrl(ov.mediaUrl || 'https://media.giphy.com/media/l41lT4n6ylgW2hh04/giphy.gif');
            setSoundUrl(ov.soundUrl || '/sounds/neon-chime.mp3');
            setSoundVolume(ov.soundVolume ?? 0.85);
            setGlowColor(ov.glowColor || '#00F0FF');
            setTemplateStyle(ov.templateStyle || 'neon-box');
            setDurationSeconds(ov.durationSeconds ?? 8);
            setMinAmountAlert(ov.minAmountAlert ?? 1.0);
            setTtsEnabled(ov.ttsEnabled ?? true);
          } else {
            showAlert({
              title: 'Overlay Not Found',
              message: 'The requested overlay could not be found.',
              type: 'danger'
            });
            navigate('/dashboard?tab=overlay');
          }

          if (resMedia.ok && dataMedia.success) {
            setMediaList(dataMedia.media || []);
          }
        }
      } catch (err: any) {
        console.error('Error loading overlay studio:', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchOverlay();

    return () => {
      isMounted = false;
      if (alertTimeoutRef.current) clearTimeout(alertTimeoutRef.current);
    };
  }, [overlayId]);

  // Save changes to API
  const saveChanges = async (updates: Partial<OverlayData>) => {
    if (!overlay) return;
    setSaving(true);
    setSaveStatus('saving');

    try {
      const res = await fetch(`/api/overlays/${overlay._id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates)
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setOverlay(data.overlay);
        setSaveStatus('saved');
        setTimeout(() => setSaveStatus('idle'), 2500);
      }
    } catch (e) {
      console.error('Failed to save overlay changes:', e);
    } finally {
      setSaving(false);
    }
  };

  // Trigger test alert in canvas simulator and broadcast via socket
  const handleTriggerTestAlert = () => {
    if (!overlay) return;
    setTesting(true);

    const testPayload = {
      donationId: `test-${Date.now()}`,
      donorName: 'Neon Champion',
      donorMessage: 'Loving the live stream quality! Ace this match! 🚀🔥',
      amount: 10.0,
      currency: 'USD',
      bankingName: 'Bakong KHQR',
      glowColor,
      customGifUrl: mediaUrl,
      soundUrl,
      soundVolume,
      durationSeconds,
      templateStyle,
      ttsEnabled
    };

    // Play preview sound locally
    playSound(soundUrl, soundVolume);

    // Show inside simulator canvas
    setActiveTestAlert(testPayload);
    if (alertTimeoutRef.current) clearTimeout(alertTimeoutRef.current);
    alertTimeoutRef.current = setTimeout(() => {
      setActiveTestAlert(null);
    }, (durationSeconds || 8) * 1000);

    // Broadcast to real OBS browser source via WebSocket
    if (socket) {
      socket.emit('trigger:test_alert', {
        overlayToken: overlay.overlayToken,
        ...testPayload
      });
    }

    setTimeout(() => setTesting(false), 2000);
  };

  const copyObsUrl = () => {
    if (!overlay) return;
    const url = `${window.location.origin}/overlay/${overlay.overlayToken}`;
    navigator.clipboard.writeText(url);
    setCopiedUrl(true);
    setTimeout(() => setCopiedUrl(false), 2000);
  };

  const handleDeleteOverlay = () => {
    if (!overlay) return;
    showConfirm({
      title: 'Delete Overlay?',
      message: `Are you sure you want to delete "${overlay.name}"? OBS Studio browser sources using this URL will stop displaying alerts.`,
      type: 'danger',
      confirmText: 'Delete Permanently',
      onConfirm: async () => {
        try {
          const res = await fetch(`/api/overlays/${overlay._id}`, { method: 'DELETE' });
          if (res.ok) {
            navigate('/dashboard?tab=overlay');
          }
        } catch (e) {}
      }
    });
  };

  if (loading || !overlay) {
    return (
      <div className="w-full h-screen bg-[#070A12] flex flex-col items-center justify-center text-cyan-400 gap-3">
        <RefreshCw size={36} className="animate-spin" />
        <span className="text-xs font-mono tracking-wider text-slate-400">LOADING OVERLAY MANAGEMENT STUDIO...</span>
      </div>
    );
  }

  const obsBrowserUrl = `${typeof window !== 'undefined' ? window.location.origin : ''}/overlay/${overlay.overlayToken}`;
  const aspectRatio = width / (height || 1);

  return (
    <div className="w-full h-screen h-[100dvh] overflow-hidden bg-[#060911] text-slate-100 flex flex-col">
      
      {/* ============================================================== */}
      {/* STUDIO TOP NAVIGATION HEADER                                   */}
      {/* ============================================================== */}
      <header className="h-14 border-b border-slate-800/80 bg-[#090D18] px-4 flex items-center justify-between flex-shrink-0 z-20">
        <div className="flex items-center gap-3">
          <Link
            to="/dashboard?tab=overlay"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-xs font-mono text-slate-300 hover:text-white transition-colors"
          >
            <ArrowLeft size={14} />
            <span>Dashboard</span>
          </Link>

          <span className="text-slate-600">/</span>

          <div className="flex items-center gap-2">
            <Tv size={16} className="text-cyan-400" />
            <span className="text-sm font-bold text-white font-['Chakra_Petch'] truncate max-w-[200px] sm:max-w-xs">
              {overlay.name}
            </span>
          </div>

          <span className="hidden sm:inline-flex px-2 py-0.5 rounded-md bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 text-[11px] font-mono font-bold">
            {width} × {height} px
          </span>
        </div>

        <div className="flex items-center gap-2">
          {/* Save Status indicator */}
          <div className="hidden sm:flex items-center gap-1.5 text-xs font-mono text-slate-400 mr-2">
            {saveStatus === 'saving' ? (
              <>
                <RefreshCw size={12} className="animate-spin text-cyan-400" />
                <span>Saving...</span>
              </>
            ) : saveStatus === 'saved' ? (
              <>
                <CheckCheck size={14} className="text-emerald-400" />
                <span className="text-emerald-400 font-bold">Live Saved</span>
              </>
            ) : (
              <span className="text-slate-500">Auto-save enabled</span>
            )}
          </div>

          {/* Copy OBS URL Button */}
          <button
            onClick={copyObsUrl}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-xs font-mono text-cyan-400 font-bold transition-all shadow-sm"
          >
            {copiedUrl ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
            <span>{copiedUrl ? 'Copied URL!' : 'Copy OBS URL'}</span>
          </button>

          {/* Open Real Browser Source in New Tab */}
          <a
            href={obsBrowserUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="p-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-400 hover:text-white transition-colors"
            title="Open OBS overlay page in new tab"
          >
            <ExternalLink size={15} />
          </a>

          {/* Test Alert Button */}
          <Button
            variant="primary"
            size="sm"
            onClick={handleTriggerTestAlert}
            disabled={testing}
            icon={<Send size={13} className={testing ? 'animate-bounce' : ''} />}
            className="bg-cyan-400 hover:bg-cyan-300 text-slate-950 font-bold text-xs shadow-[0_0_15px_rgba(0,240,255,0.3)]"
          >
            {testing ? 'Firing Alert...' : 'Test Alert'}
          </Button>
        </div>
      </header>

      {/* ============================================================== */}
      {/* STUDIO BODY (SIDEBAR + WORKBENCH CANVAS)                       */}
      {/* ============================================================== */}
      <div className="flex-1 flex overflow-hidden">
        
        {/* ============================================================ */}
        {/* LEFT DEDICATED OVERLAY MANAGEMENT SIDEBAR                    */}
        {/* ============================================================ */}
        <aside className="w-64 sm:w-72 bg-[#080C16] border-r border-slate-800/80 flex flex-col flex-shrink-0 z-10 select-none">
          {/* Sidebar Top: Overview Card */}
          <div className="p-4 border-b border-slate-800/60 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400 font-bold">
                Overlay Management
              </span>
              <span className="flex items-center gap-1 text-[10px] font-mono text-emerald-400">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                OBS Ready
              </span>
            </div>

            <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
              <input
                type="text"
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  saveChanges({ name: e.target.value });
                }}
                className="w-full bg-transparent text-sm font-bold text-white font-['Chakra_Petch'] focus:outline-none focus:border-cyan-400"
                placeholder="Overlay Name"
              />
              <div className="flex items-center justify-between text-[11px] font-mono text-slate-400">
                <span>Canvas:</span>
                <span className="text-cyan-400 font-bold">{width} × {height}</span>
              </div>
            </div>
          </div>

          {/* Sidebar Navigation Tabs */}
          <nav className="flex-1 p-3 space-y-1.5 overflow-y-auto">
            <button
              onClick={() => setActiveTab('appearance')}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold font-mono transition-all text-left ${
                activeTab === 'appearance'
                  ? 'bg-cyan-500/15 text-cyan-300 border border-cyan-500/30 shadow-[0_0_12px_rgba(0,240,255,0.1)]'
                  : 'text-slate-400 hover:text-white hover:bg-slate-900/60'
              }`}
            >
              <Sparkles size={16} className={activeTab === 'appearance' ? 'text-cyan-400' : 'text-slate-500'} />
              <div className="leading-tight">
                <div className="font-bold">Appearance & Media</div>
                <div className="text-[10px] text-slate-500 font-normal">Reactions, glow color, style</div>
              </div>
            </button>

            <button
              onClick={() => setActiveTab('audio')}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold font-mono transition-all text-left ${
                activeTab === 'audio'
                  ? 'bg-cyan-500/15 text-cyan-300 border border-cyan-500/30 shadow-[0_0_12px_rgba(0,240,255,0.1)]'
                  : 'text-slate-400 hover:text-white hover:bg-slate-900/60'
              }`}
            >
              <Volume2 size={16} className={activeTab === 'audio' ? 'text-cyan-400' : 'text-slate-500'} />
              <div className="leading-tight">
                <div className="font-bold">Sound & Audio</div>
                <div className="text-[10px] text-slate-500 font-normal">Chimes, volume control</div>
              </div>
            </button>

            <button
              onClick={() => setActiveTab('text')}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold font-mono transition-all text-left ${
                activeTab === 'text'
                  ? 'bg-cyan-500/15 text-cyan-300 border border-cyan-500/30 shadow-[0_0_12px_rgba(0,240,255,0.1)]'
                  : 'text-slate-400 hover:text-white hover:bg-slate-900/60'
              }`}
            >
              <MessageSquare size={16} className={activeTab === 'text' ? 'text-cyan-400' : 'text-slate-500'} />
              <div className="leading-tight">
                <div className="font-bold">Text & Duration</div>
                <div className="text-[10px] text-slate-500 font-normal">Template, timer, TTS</div>
              </div>
            </button>

            <button
              onClick={() => setActiveTab('canvas')}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold font-mono transition-all text-left ${
                activeTab === 'canvas'
                  ? 'bg-cyan-500/15 text-cyan-300 border border-cyan-500/30 shadow-[0_0_12px_rgba(0,240,255,0.1)]'
                  : 'text-slate-400 hover:text-white hover:bg-slate-900/60'
              }`}
            >
              <Layers size={16} className={activeTab === 'canvas' ? 'text-cyan-400' : 'text-slate-500'} />
              <div className="leading-tight">
                <div className="font-bold">Canvas Dimensions</div>
                <div className="text-[10px] text-slate-500 font-normal">{width}×{height} px resolution</div>
              </div>
            </button>

            <button
              onClick={() => setActiveTab('obs')}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold font-mono transition-all text-left ${
                activeTab === 'obs'
                  ? 'bg-cyan-500/15 text-cyan-300 border border-cyan-500/30 shadow-[0_0_12px_rgba(0,240,255,0.1)]'
                  : 'text-slate-400 hover:text-white hover:bg-slate-900/60'
              }`}
            >
              <Settings size={16} className={activeTab === 'obs' ? 'text-cyan-400' : 'text-slate-500'} />
              <div className="leading-tight">
                <div className="font-bold">OBS Browser Setup</div>
                <div className="text-[10px] text-slate-500 font-normal">Integration instructions</div>
              </div>
            </button>
          </nav>

          {/* Sidebar Bottom: Quick Actions */}
          <div className="p-3 border-t border-slate-800/80 space-y-2">
            <button
              onClick={handleTriggerTestAlert}
              disabled={testing}
              className="w-full py-2.5 px-3 rounded-xl bg-cyan-950/80 hover:bg-cyan-900/80 border border-cyan-500/40 text-cyan-300 text-xs font-bold font-mono flex items-center justify-center gap-2 transition-all shadow-[0_0_15px_rgba(0,240,255,0.15)]"
            >
              <Play size={13} className={testing ? 'animate-spin' : ''} />
              <span>{testing ? 'Triggering...' : 'Fire Test Alert'}</span>
            </button>

            <button
              onClick={handleDeleteOverlay}
              className="w-full py-2 px-3 rounded-xl bg-red-950/20 hover:bg-red-950/50 border border-red-500/20 text-red-400 hover:text-red-300 text-[11px] font-mono flex items-center justify-center gap-1.5 transition-colors"
            >
              <Trash2 size={13} />
              <span>Delete Overlay</span>
            </button>
          </div>
        </aside>

        {/* ============================================================ */}
        {/* CENTER MAIN WORKBENCH: LIVE CANVAS SIMULATOR & CONTROLS      */}
        {/* ============================================================ */}
        <main className="flex-1 flex flex-col overflow-y-auto bg-[#070A12] p-4 sm:p-6 lg:p-8 space-y-6">
          
          {/* ========================================================== */}
          {/* INTERACTIVE OBS CANVAS SIMULATOR CONTAINER                 */}
          {/* ========================================================== */}
          <div className="space-y-2.5">
            <div className="flex flex-wrap items-center justify-between gap-2.5 text-xs font-mono">
              <div className="flex items-center gap-2">
                <span className="text-slate-200 font-bold flex items-center gap-1.5">
                  <Monitor size={15} className="text-cyan-400" />
                  Live OBS Canvas Simulator
                </span>
                <span className="px-2 py-0.5 rounded-md bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 font-bold">
                  {width} × {height} px
                </span>
                <span className="hidden sm:inline-block px-1.5 py-0.5 rounded bg-slate-900 text-slate-400 border border-slate-800 text-[10px]">
                  Aspect: {(width / (height || 1)).toFixed(2)}:1
                </span>
              </div>

              {/* Scale & Zoom Controls */}
              <div className="flex items-center gap-1.5 bg-slate-950 p-1 rounded-xl border border-slate-800">
                <span className="text-[11px] text-slate-400 px-2 font-bold font-mono">
                  Scale: <span className="text-cyan-400">{Math.round(currentScale * 100)}%</span>
                  {manualScale === null && scaleMode === 'fit' ? ' (Fit)' : ''}
                </span>

                <button
                  type="button"
                  onClick={handleZoomOut}
                  title="Zoom Out (-10%)"
                  className="p-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white transition-colors"
                >
                  <ZoomOut size={13} />
                </button>

                <button
                  type="button"
                  onClick={() => handleSetPreset('fit')}
                  className={`px-2 py-1 rounded-lg text-[10px] font-bold font-mono transition-colors ${
                    manualScale === null && scaleMode === 'fit'
                      ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                      : 'text-slate-400 hover:text-white hover:bg-slate-900'
                  }`}
                  title="Fit to Screen"
                >
                  Fit
                </button>

                <button
                  type="button"
                  onClick={() => handleSetPreset('50')}
                  className={`px-2 py-1 rounded-lg text-[10px] font-bold font-mono transition-colors ${
                    currentScale === 0.5
                      ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                      : 'text-slate-400 hover:text-white hover:bg-slate-900'
                  }`}
                >
                  50%
                </button>

                <button
                  type="button"
                  onClick={() => handleSetPreset('100')}
                  className={`px-2 py-1 rounded-lg text-[10px] font-bold font-mono transition-colors ${
                    currentScale === 1.0
                      ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                      : 'text-slate-400 hover:text-white hover:bg-slate-900'
                  }`}
                  title="Actual 1:1 Pixel Size"
                >
                  100%
                </button>

                <button
                  type="button"
                  onClick={handleZoomIn}
                  title="Zoom In (+10%)"
                  className="p-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white transition-colors"
                >
                  <ZoomIn size={13} />
                </button>
              </div>
            </div>

            {/* Viewport Box (Scrollable when scaled beyond container) */}
            <div
              ref={containerRef}
              className="w-full h-[460px] sm:h-[520px] rounded-2xl bg-[#040711] border border-slate-800 p-4 shadow-2xl relative overflow-auto flex items-center justify-center select-none"
            >
              {/* Scaled Wrapper: occupies the exact scaled dimensions in the DOM */}
              <div
                style={{
                  width: `${scaledWidth}px`,
                  height: `${scaledHeight}px`,
                  minWidth: `${scaledWidth}px`,
                  minHeight: `${scaledHeight}px`,
                  position: 'relative'
                }}
                className="transition-all duration-150"
              >
                {/* THE ACTUAL CANVAS: Exact width and height in px, displayed on scale */}
                <div
                  style={{
                    width: `${width}px`,
                    height: `${height}px`,
                    transform: `scale(${currentScale})`,
                    transformOrigin: 'top left'
                  }}
                  className="absolute top-0 left-0 border-2 border-cyan-500/40 shadow-[0_0_50px_rgba(0,0,0,0.85)] bg-slate-950/80 rounded-xl overflow-hidden flex flex-col items-center justify-center"
                >
                  {/* Checkerboard Pattern for Transparency Indicator */}
                  <div
                    className="absolute inset-0 opacity-25 pointer-events-none"
                    style={{
                      backgroundImage: `linear-gradient(45deg, #1e293b 25%, transparent 25%), linear-gradient(-45deg, #1e293b 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #1e293b 75%), linear-gradient(-45deg, transparent 75%, #1e293b 75%)`,
                      backgroundSize: '24px 24px',
                      backgroundPosition: '0 0, 0 12px, 12px -12px, -12px 0px'
                    }}
                  />

                  {/* Center Alignment Crosshairs */}
                  <div className="absolute inset-x-0 top-1/2 border-t border-cyan-500/20 border-dashed pointer-events-none" />
                  <div className="absolute inset-y-0 left-1/2 border-l border-cyan-500/20 border-dashed pointer-events-none" />

                  {/* Corner Coordinate Badges */}
                  <div className="absolute top-2 left-2 px-2 py-0.5 rounded bg-black/80 border border-slate-800 text-[11px] font-mono text-slate-400 select-none pointer-events-none">
                    0, 0
                  </div>
                  <div className="absolute top-2 right-2 px-2 py-0.5 rounded bg-black/80 border border-slate-800 text-[11px] font-mono text-slate-400 select-none pointer-events-none">
                    OBS Browser Source Canvas
                  </div>
                  <div className="absolute bottom-2 right-2 px-2 py-0.5 rounded bg-black/80 border border-slate-800 text-[11px] font-mono text-cyan-400 font-bold select-none pointer-events-none">
                    {width} × {height} px
                  </div>

                  {/* Simulated Alert Notification or Idle Content inside 1:1 Canvas */}
                  {activeTestAlert ? (
                    <div className="relative z-10 w-full flex items-center justify-center p-6">
                      <NeonAlertCard
                        alert={{
                          donationId: 'test-preview',
                          donorName: activeTestAlert.donorName,
                          donorMessage: activeTestAlert.donorMessage,
                          amount: Number(activeTestAlert.amount),
                          currency: 'USD',
                          bankingName: activeTestAlert.bankingName,
                          glowColor: glowColor,
                          customGifUrl: mediaUrl,
                          soundUrl: soundUrl,
                          soundVolume: soundVolume,
                          templateStyle: templateStyle,
                          durationSeconds: durationSeconds,
                          ttsEnabled: ttsEnabled,
                          isTest: true
                        }}
                      />
                    </div>
                  ) : (
                    <div className="relative z-10 text-center space-y-4 p-8 max-w-md mx-auto bg-slate-950/70 backdrop-blur-md rounded-2xl border border-slate-800/80 shadow-2xl">
                      <div className="w-16 h-16 mx-auto rounded-2xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 shadow-[0_0_20px_rgba(0,240,255,0.2)]">
                        <Tv size={32} />
                      </div>
                      <div className="space-y-1">
                        <div className="text-xl font-bold font-['Chakra_Petch'] text-white">
                          OBS Studio Canvas ({width} × {height} px)
                        </div>
                        <p className="text-xs font-mono text-slate-400 leading-relaxed">
                          This is your actual resolution canvas displayed on scale. Center crosshairs show exact alert alignment.
                        </p>
                      </div>
                      <div className="pt-2 flex items-center justify-center">
                        <Button
                          variant="primary"
                          size="sm"
                          onClick={handleTriggerTestAlert}
                          disabled={testing}
                          icon={<Send size={13} className={testing ? 'animate-bounce' : ''} />}
                          className="bg-cyan-400 hover:bg-cyan-300 text-slate-950 font-bold text-xs shadow-[0_0_15px_rgba(0,240,255,0.3)]"
                        >
                          {testing ? 'Firing Alert...' : 'Fire Test Alert'}
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* ========================================================== */}
          {/* SETTINGS WORKBENCH PANEL                                   */}
          {/* ========================================================== */}
          <div className="rounded-2xl bg-[#090D18] border border-slate-800 p-5 sm:p-6 space-y-5">
            
            {/* TAB: APPEARANCE & MEDIA */}
            {activeTab === 'appearance' && (
              <div className="space-y-5">
                <div className="pb-3 border-b border-slate-800/80 flex items-center justify-between">
                  <h4 className="text-sm font-bold text-white font-['Chakra_Petch'] flex items-center gap-2">
                    <Sparkles size={16} className="text-cyan-400" />
                    Reaction Media & Accent Glow
                  </h4>
                  <span className="text-xs font-mono text-slate-400">PNG / JPG / GIF</span>
                </div>

                {/* Media Library Selector */}
                <div className="space-y-2">
                  <label className="text-xs font-mono font-bold text-slate-300 block">
                    Choose Reaction Media from Library
                  </label>
                  {mediaList.length > 0 ? (
                    <div className="grid grid-cols-3 sm:grid-cols-6 gap-2.5 max-h-48 overflow-y-auto p-2 bg-slate-950 rounded-xl border border-slate-800">
                      {mediaList.map((m) => {
                        const isSelected = mediaUrl === m.url;
                        return (
                          <div
                            key={m._id}
                            onClick={() => {
                              setMediaUrl(m.url);
                              saveChanges({ mediaUrl: m.url, mediaId: m._id });
                            }}
                            className={`aspect-square rounded-xl p-1 bg-slate-900 border cursor-pointer flex items-center justify-center overflow-hidden transition-all relative ${
                              isSelected
                                ? 'border-cyan-400 ring-2 ring-cyan-400/40'
                                : 'border-slate-800 hover:border-slate-700'
                            }`}
                          >
                            <img
                              src={m.url}
                              alt={m.filename}
                              className="max-h-full max-w-full object-contain"
                            />
                            {isSelected && (
                              <div className="absolute top-1 right-1 w-4 h-4 rounded-full bg-cyan-400 flex items-center justify-center text-slate-950">
                                <Check size={11} strokeWidth={3} />
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 text-center text-xs text-slate-500 font-mono">
                      No media uploaded yet. You can upload media in the Media Library tab on the dashboard.
                    </div>
                  )}
                </div>

                {/* Custom GIF / Media URL direct input */}
                <div className="space-y-1.5">
                  <label className="text-xs font-mono font-bold text-slate-300 block">
                    Or Enter Custom Image / GIF URL
                  </label>
                  <input
                    type="url"
                    value={mediaUrl}
                    onChange={(e) => {
                      setMediaUrl(e.target.value);
                      saveChanges({ mediaUrl: e.target.value });
                    }}
                    placeholder="https://media.giphy.com/media/.../giphy.gif"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white font-mono text-xs focus:outline-none focus:border-cyan-400"
                  />
                </div>

                {/* Glow Color Presets */}
                <div className="space-y-2">
                  <label className="text-xs font-mono font-bold text-slate-300 block">
                    Accent Glow Color
                  </label>
                  <div className="flex flex-wrap items-center gap-3">
                    {[
                      { label: 'Cyber Cyan', hex: '#00F0FF' },
                      { label: 'Neon Pink', hex: '#FF007A' },
                      { label: 'Electric Emerald', hex: '#00FF66' },
                      { label: 'Hyper Yellow', hex: '#FFE600' },
                      { label: 'Vivid Violet', hex: '#8A2BE2' },
                    ].map((c) => (
                      <button
                        key={c.hex}
                        type="button"
                        onClick={() => {
                          setGlowColor(c.hex);
                          saveChanges({ glowColor: c.hex });
                        }}
                        style={{ backgroundColor: c.hex }}
                        className={`w-8 h-8 rounded-full border-2 transition-transform ${
                          glowColor === c.hex ? 'border-white scale-110 shadow-lg' : 'border-transparent hover:scale-105'
                        }`}
                        title={c.label}
                      />
                    ))}
                    <input
                      type="color"
                      value={glowColor}
                      onChange={(e) => {
                        setGlowColor(e.target.value);
                        saveChanges({ glowColor: e.target.value });
                      }}
                      className="w-8 h-8 rounded-full bg-transparent cursor-pointer border border-slate-700"
                      title="Custom Color"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* TAB: SOUND & AUDIO */}
            {activeTab === 'audio' && (
              <div className="space-y-5">
                <div className="pb-3 border-b border-slate-800/80 flex items-center justify-between">
                  <h4 className="text-sm font-bold text-white font-['Chakra_Petch'] flex items-center gap-2">
                    <Volume2 size={16} className="text-cyan-400" />
                    Sound Chimes & Volume
                  </h4>
                  <button
                    onClick={() => playSound(soundUrl, soundVolume)}
                    className="text-xs font-mono text-cyan-400 hover:underline flex items-center gap-1"
                  >
                    <Play size={12} />
                    <span>Test Audio</span>
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Chime Preset Selector */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-mono font-bold text-slate-300 block">Sound Effect</label>
                    <select
                      value={soundUrl}
                      onChange={(e) => {
                        setSoundUrl(e.target.value);
                        saveChanges({ soundUrl: e.target.value });
                        playSound(e.target.value, soundVolume);
                      }}
                      className="w-full px-3 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white font-mono text-xs focus:outline-none focus:border-cyan-400"
                    >
                      <option value="/sounds/neon-chime.mp3">Cyber Synthesizer Chime (Default)</option>
                      <option value="synth">Web Audio Synth Harmonic Bell</option>
                    </select>
                  </div>

                  {/* Volume Slider */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs font-mono">
                      <label className="font-bold text-slate-300">Volume Level</label>
                      <span className="text-cyan-400 font-bold">{Math.round(soundVolume * 100)}%</span>
                    </div>
                    <input
                      type="range"
                      min={0}
                      max={1}
                      step={0.05}
                      value={soundVolume}
                      onChange={(e) => {
                        const val = parseFloat(e.target.value);
                        setSoundVolume(val);
                        saveChanges({ soundVolume: val });
                      }}
                      className="w-full accent-cyan-400"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* TAB: TEXT & DURATION */}
            {activeTab === 'text' && (
              <div className="space-y-5">
                <div className="pb-3 border-b border-slate-800/80 flex items-center justify-between">
                  <h4 className="text-sm font-bold text-white font-['Chakra_Petch'] flex items-center gap-2">
                    <MessageSquare size={16} className="text-cyan-400" />
                    Alert Duration & Text-to-Speech
                  </h4>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Duration Slider */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs font-mono">
                      <label className="font-bold text-slate-300">Display Duration</label>
                      <span className="text-cyan-400 font-bold">{durationSeconds} Seconds</span>
                    </div>
                    <input
                      type="range"
                      min={3}
                      max={30}
                      value={durationSeconds}
                      onChange={(e) => {
                        const val = parseInt(e.target.value);
                        setDurationSeconds(val);
                        saveChanges({ durationSeconds: val });
                      }}
                      className="w-full accent-cyan-400"
                    />
                  </div>

                  {/* Min Amount Alert */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-mono font-bold text-slate-300 block">
                      Minimum Amount to Trigger ($)
                    </label>
                    <input
                      type="number"
                      step={0.5}
                      min={0.1}
                      value={minAmountAlert}
                      onChange={(e) => {
                        const val = parseFloat(e.target.value) || 1.0;
                        setMinAmountAlert(val);
                        saveChanges({ minAmountAlert: val });
                      }}
                      className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white font-mono text-xs focus:outline-none focus:border-cyan-400"
                    />
                  </div>
                </div>

                {/* TTS Toggle */}
                <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between">
                  <div className="space-y-0.5">
                    <div className="text-xs font-bold text-white font-mono">Text-to-Speech (TTS) Voice</div>
                    <div className="text-[11px] text-slate-400">Read donor cheers aloud automatically</div>
                  </div>
                  <Switch
                    checked={ttsEnabled}
                    onChange={(val) => {
                      setTtsEnabled(val);
                      saveChanges({ ttsEnabled: val });
                    }}
                  />
                </div>
              </div>
            )}

            {/* TAB: CANVAS DIMENSIONS */}
            {activeTab === 'canvas' && (
              <div className="space-y-5">
                <div className="pb-3 border-b border-slate-800/80 flex items-center justify-between">
                  <h4 className="text-sm font-bold text-white font-['Chakra_Petch'] flex items-center gap-2">
                    <Layers size={16} className="text-cyan-400" />
                    Canvas Dimensions (Width × Height)
                  </h4>
                  <span className="text-xs font-mono text-cyan-400">{width} × {height} px</span>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-mono font-bold text-slate-300 block">Width (px)</label>
                    <input
                      type="number"
                      min={200}
                      max={3840}
                      value={width}
                      onChange={(e) => {
                        const val = parseInt(e.target.value) || 1080;
                        setWidth(val);
                        saveChanges({ width: val });
                      }}
                      className="w-full px-3 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white font-mono text-xs focus:outline-none focus:border-cyan-400"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-mono font-bold text-slate-300 block">Height (px)</label>
                    <input
                      type="number"
                      min={150}
                      max={2160}
                      value={height}
                      onChange={(e) => {
                        const val = parseInt(e.target.value) || 720;
                        setHeight(val);
                        saveChanges({ height: val });
                      }}
                      className="w-full px-3 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white font-mono text-xs focus:outline-none focus:border-cyan-400"
                    />
                  </div>
                </div>

                {/* Dimension Presets */}
                <div className="space-y-2">
                  <label className="text-xs font-mono font-bold text-slate-400 block">Quick Presets</label>
                  <div className="flex flex-wrap gap-2">
                    {[
                      { label: '1080 × 720 (Default 3:2)', w: 1080, h: 720 },
                      { label: '1920 × 1080 (16:9 FHD)', w: 1920, h: 1080 },
                      { label: '1280 × 720 (16:9 HD)', w: 1280, h: 720 },
                      { label: '720 × 1080 (9:16 Vertical)', w: 720, h: 1080 },
                    ].map((p) => (
                      <button
                        key={p.label}
                        type="button"
                        onClick={() => {
                          setWidth(p.w);
                          setHeight(p.h);
                          saveChanges({ width: p.w, height: p.h });
                        }}
                        className={`px-3 py-1.5 rounded-lg border text-xs font-mono transition-colors ${
                          width === p.w && height === p.h
                            ? 'bg-cyan-500/10 border-cyan-400 text-cyan-300 font-bold'
                            : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                        }`}
                      >
                        {p.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* TAB: OBS SOURCE SETUP */}
            {activeTab === 'obs' && (
              <div className="space-y-5">
                <div className="pb-3 border-b border-slate-800/80 flex items-center justify-between">
                  <h4 className="text-sm font-bold text-white font-['Chakra_Petch'] flex items-center gap-2">
                    <Settings size={16} className="text-cyan-400" />
                    OBS Studio Integration Guide
                  </h4>
                </div>

                <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                  <div className="text-xs font-bold text-slate-300 font-mono">OBS Browser Source URL</div>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      readOnly
                      value={obsBrowserUrl}
                      className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-800 text-cyan-400 font-mono text-xs select-all focus:outline-none"
                    />
                    <button
                      onClick={copyObsUrl}
                      className="px-3.5 py-2 rounded-lg bg-cyan-400 hover:bg-cyan-300 text-slate-950 font-bold font-mono text-xs flex items-center gap-1.5 flex-shrink-0"
                    >
                      {copiedUrl ? <Check size={13} /> : <Copy size={13} />}
                      <span>{copiedUrl ? 'Copied!' : 'Copy'}</span>
                    </button>
                  </div>
                </div>

                <div className="space-y-2 text-xs text-slate-300 font-mono leading-relaxed">
                  <div className="font-bold text-white">How to add to OBS Studio:</div>
                  <ol className="list-decimal pl-5 space-y-1.5 text-slate-400 text-[11px]">
                    <li>In OBS Studio, click the <strong className="text-white">(+)</strong> button under the Sources panel.</li>
                    <li>Select <strong className="text-white">Browser</strong> and name it (e.g. &quot;{overlay.name}&quot;).</li>
                    <li>Paste the copied URL into the <strong className="text-white">URL</strong> field.</li>
                    <li>Set <strong className="text-white">Width</strong> to <code className="text-cyan-400">{width}</code> and <strong className="text-white">Height</strong> to <code className="text-cyan-400">{height}</code>.</li>
                    <li>Check <strong className="text-white">&quot;Shutdown source when not visible&quot;</strong> and <strong className="text-white">&quot;Refresh browser when scene becomes active&quot;</strong>.</li>
                    <li>Click <strong className="text-white">OK</strong> and your alert box is live!</li>
                  </ol>
                </div>
              </div>
            )}

          </div>

        </main>
      </div>

    </div>
  );
};
