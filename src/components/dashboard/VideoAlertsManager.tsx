'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Video,
  Play,
  Sliders,
  DollarSign,
  Clock,
  Volume2,
  VolumeX,
  Lock,
  Sparkles,
  ArrowRight,
  CheckCircle2,
  Palette,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  Check,
  X,
  RefreshCw,
  AlertTriangle,
  Save
} from 'lucide-react';
import { Card } from '../common/Card';
import { Button } from '../common/Button';
import { useSocket } from '../../context/SocketContext';
import {
  VideoPlayerWithProgressBar,
  formatTime,
  TextAlignMode
} from '../common/VideoPlayerWithProgressBar';
import { VideoClipScrubberLine } from '../donate/VideoClipScrubberLine';

export interface VideoAlertsManagerProps {
  streamerToken?: string;
  isLocked?: boolean;
  currentPlan?: 'free' | 'pro' | string;
  onUpgrade?: () => void;
  onRegenerateToken?: () => void;
  isRightbarOpen?: boolean;
  onToggleRightbar?: () => void;
  onCloseRightbar?: () => void;
  onUnsavedChangesChange?: (hasUnsaved: boolean) => void;
}

export const VideoAlertsManager: React.FC<VideoAlertsManagerProps> = ({
  streamerToken,
  isLocked: _isLockedProp = false,
  currentPlan = 'free',
  onUpgrade,
  onRegenerateToken,
  isRightbarOpen: controlledIsRightbarOpen,
  onToggleRightbar,
  onCloseRightbar,
  onUnsavedChangesChange
}) => {
  const isLocked = false; // Video alerts and controls unlocked on free plan
  const { socket } = useSocket();

  // Rightbar Settings Drawer State (Controlled from Navbar or Uncontrolled fallback)
  const [internalRightbarOpen, setInternalRightbarOpen] = useState(false);
  const isRightbarOpen = controlledIsRightbarOpen !== undefined ? controlledIsRightbarOpen : internalRightbarOpen;

  const toggleRightbar = () => {
    if (onToggleRightbar) {
      onToggleRightbar();
    } else {
      setInternalRightbarOpen((prev) => !prev);
    }
  };

  const closeRightbar = () => {
    if (onCloseRightbar) {
      onCloseRightbar();
    } else {
      setInternalRightbarOpen(false);
    }
  };

  // Video Alert Configuration State (Disabled by default until enabled by streamer)
  const [isEnabled, setIsEnabled] = useState(false);
  const [minTipAmount, setMinTipAmount] = useState<number>(2.0); // Allowed: $0.25 to $50
  const [maxDurationSeconds, setMaxDurationSeconds] = useState<number>(30); // Allowed: up to 300s (5m)
  const [videoVolume, setVideoVolume] = useState<number>(85);
  const [autoDucking, setAutoDucking] = useState(true);
  const [headerColor, setHeaderColor] = useState<string>('#00F0FF');
  const [headerBgColor, setHeaderBgColor] = useState<string>('rgba(2, 6, 23, 0.95)');
  const [footerColor, setFooterColor] = useState<string>('#FFFFFF');
  const [footerBgColor, setFooterBgColor] = useState<string>('rgba(0, 0, 0, 0.90)');
  const [headerTextAlign, setHeaderTextAlign] = useState<TextAlignMode>('left');
  const [footerTextAlign, setFooterTextAlign] = useState<TextAlignMode>('left');
  const [isSaving, setIsSaving] = useState(false);
  const [toastMessage, setToastMessage] = useState<{ title: string; desc: string } | null>(null);

  // Baseline of saved settings to detect unsaved changes
  const [savedSettings, setSavedSettings] = useState<{
    isEnabled: boolean;
    minTipAmount: number;
    maxDurationSeconds: number;
    videoVolume: number;
    autoDucking: boolean;
    headerColor: string;
    headerBgColor: string;
    footerColor: string;
    footerBgColor: string;
    headerTextAlign: TextAlignMode;
    footerTextAlign: TextAlignMode;
  } | null>(null);

  // Live Test Simulation State
  const [demoVideoUrl, setDemoVideoUrl] = useState('https://www.youtube.com/watch?v=HSsGnEOFY6U&list=RDHSsGnEOFY6U&start_radio=1');
  const [demoVideoDuration, setDemoVideoDuration] = useState<number | undefined>(66);
  const [demoStartTime, setDemoStartTime] = useState(0);
  const [demoEndTime, setDemoEndTime] = useState(30);
  const [demoDonorName, setDemoDonorName] = useState('Supporter');
  const [demoAmount, setDemoAmount] = useState(5.0);
  const [demoDonorMessage, setDemoDonorMessage] = useState('Check out this legendary hype moment! 🔥');
  const [isSimulating, setIsSimulating] = useState(false);
  const [previewMuted, setPreviewMuted] = useState(false);

  // Auto-fetch YouTube details for live test simulator
  useEffect(() => {
    if (!demoVideoUrl.trim()) return;
    const timer = setTimeout(() => {
      fetch(`/api/youtube/details?url=${encodeURIComponent(demoVideoUrl.trim())}`)
        .then((r) => r.json())
        .then((data) => {
          if (data.success) {
            const vDur = data.videoDuration ? Number(data.videoDuration) : undefined;
            setDemoVideoDuration(vDur);
            if (vDur && vDur < 30) {
              setDemoStartTime(0);
              setDemoEndTime(vDur);
            }
          }
        })
        .catch(() => {});
    }, 400);

    return () => clearTimeout(timer);
  }, [demoVideoUrl]);

  const effectiveToken = streamerToken || 'demo-token';

  // Helper to obtain streamer auth headers from localStorage
  const getAuthHeaders = (): Record<string, string> => {
    if (typeof window === 'undefined') return {};
    const token = localStorage.getItem('streamneon_auth_token') || localStorage.getItem('streamneon_token');
    return token ? { Authorization: `Bearer ${token}` } : {};
  };

  // 1. Fetch saved video settings from database
  useEffect(() => {
    fetch(`/api/streamer/settings/video?token=${encodeURIComponent(effectiveToken)}`, {
      headers: {
        ...getAuthHeaders()
      }
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.success && data.settings) {
          const s = data.settings;
          const loaded = {
            isEnabled: Boolean(s.isEnabled),
            minTipAmount: Number(s.minTipAmount ?? 2.0),
            maxDurationSeconds: Number(s.maxDurationSeconds ?? 30),
            videoVolume: Number(s.videoVolume ?? 85),
            autoDucking: Boolean(s.autoDucking ?? true),
            headerColor: s.headerColor || '#00F0FF',
            headerBgColor: s.headerBgColor || 'rgba(2, 6, 23, 0.95)',
            footerColor: s.footerColor || '#FFFFFF',
            footerBgColor: s.footerBgColor || 'rgba(0, 0, 0, 0.90)',
            headerTextAlign: (s.headerTextAlign as TextAlignMode) || 'left',
            footerTextAlign: (s.footerTextAlign as TextAlignMode) || 'left'
          };
          setIsEnabled(loaded.isEnabled);
          setMinTipAmount(loaded.minTipAmount);
          setMaxDurationSeconds(loaded.maxDurationSeconds);
          setVideoVolume(loaded.videoVolume);
          setAutoDucking(loaded.autoDucking);
          setHeaderColor(loaded.headerColor);
          setHeaderBgColor(loaded.headerBgColor);
          setFooterColor(loaded.footerColor);
          setFooterBgColor(loaded.footerBgColor);
          setHeaderTextAlign(loaded.headerTextAlign);
          setFooterTextAlign(loaded.footerTextAlign);
          setSavedSettings(loaded);
        } else {
          setSavedSettings({
            isEnabled: false,
            minTipAmount: 2.0,
            maxDurationSeconds: 30,
            videoVolume: 85,
            autoDucking: true,
            headerColor: '#00F0FF',
            headerBgColor: 'rgba(2, 6, 23, 0.95)',
            footerColor: '#FFFFFF',
            footerBgColor: 'rgba(0, 0, 0, 0.90)',
            headerTextAlign: 'left',
            footerTextAlign: 'left'
          });
        }
      })
      .catch((e) => {
        console.error('Error fetching video settings:', e);
        setSavedSettings({
          isEnabled: false,
          minTipAmount: 2.0,
          maxDurationSeconds: 30,
          videoVolume: 85,
          autoDucking: true,
          headerColor: '#00F0FF',
          headerBgColor: 'rgba(2, 6, 23, 0.95)',
          footerColor: '#FFFFFF',
          footerBgColor: 'rgba(0, 0, 0, 0.90)',
          headerTextAlign: 'left',
          footerTextAlign: 'left'
        });
      });
  }, [effectiveToken]);

  // Extract YouTube ID from demoVideoUrl
  const activeYtId = useMemo(() => {
    if (!demoVideoUrl) return null;
    const match = demoVideoUrl.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([\w-]{11})/);
    return match ? match[1] : null;
  }, [demoVideoUrl]);

  // Detect unsaved changes vs baseline
  const hasUnsavedChanges = useMemo(() => {
    if (!savedSettings) return false;
    return (
      savedSettings.isEnabled !== isEnabled ||
      savedSettings.minTipAmount !== minTipAmount ||
      savedSettings.maxDurationSeconds !== maxDurationSeconds ||
      savedSettings.videoVolume !== videoVolume ||
      savedSettings.autoDucking !== autoDucking ||
      savedSettings.headerColor !== headerColor ||
      savedSettings.headerBgColor !== headerBgColor ||
      savedSettings.footerColor !== footerColor ||
      savedSettings.footerBgColor !== footerBgColor ||
      savedSettings.headerTextAlign !== headerTextAlign ||
      savedSettings.footerTextAlign !== footerTextAlign
    );
  }, [
    savedSettings,
    isEnabled,
    minTipAmount,
    maxDurationSeconds,
    videoVolume,
    autoDucking,
    headerColor,
    headerBgColor,
    footerColor,
    footerBgColor,
    headerTextAlign,
    footerTextAlign
  ]);

  const [isEarthquake, setIsEarthquake] = useState(false);
  const earthquakeTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Notify parent component and dashboard about unsaved changes
  useEffect(() => {
    onUnsavedChangesChange?.(hasUnsavedChanges);
    window.dispatchEvent(
      new CustomEvent('video-unsaved-changes', { detail: { hasUnsavedChanges } })
    );
    window.dispatchEvent(
      new CustomEvent('dashboard-unsaved-changes', { detail: { tab: 'video-alerts', hasUnsaved: hasUnsavedChanges } })
    );
    if (!hasUnsavedChanges) {
      setIsEarthquake(false);
    }
  }, [hasUnsavedChanges, onUnsavedChangesChange]);

  // Listen for earthquake trigger when user attempts to navigate away without saving
  useEffect(() => {
    const handleEarthquake = (e: any) => {
      if (e.detail?.tab && e.detail.tab !== 'video-alerts') return;
      if (!hasUnsavedChanges) return;

      setIsEarthquake(false);
      requestAnimationFrame(() => {
        setIsEarthquake(true);
      });

      if (earthquakeTimerRef.current) clearTimeout(earthquakeTimerRef.current);
      earthquakeTimerRef.current = setTimeout(() => {
        setIsEarthquake(false);
      }, 2800);
    };

    window.addEventListener('dashboard-unsaved-earthquake', handleEarthquake);
    return () => {
      window.removeEventListener('dashboard-unsaved-earthquake', handleEarthquake);
      if (earthquakeTimerRef.current) clearTimeout(earthquakeTimerRef.current);
    };
  }, [hasUnsavedChanges]);

  // Handle resetting back to saved state
  const handleResetChanges = () => {
    if (!savedSettings) return;
    setIsEarthquake(false);
    setIsEnabled(savedSettings.isEnabled);
    setMinTipAmount(savedSettings.minTipAmount);
    setMaxDurationSeconds(savedSettings.maxDurationSeconds);
    setVideoVolume(savedSettings.videoVolume);
    setAutoDucking(savedSettings.autoDucking);
    setHeaderColor(savedSettings.headerColor);
    setHeaderBgColor(savedSettings.headerBgColor);
    setFooterColor(savedSettings.footerColor);
    setFooterBgColor(savedSettings.footerBgColor);
    setHeaderTextAlign(savedSettings.headerTextAlign);
    setFooterTextAlign(savedSettings.footerTextAlign);
  };

  // Trigger simulated live video alert on streamer's overlay via WebSocket
  const handleTestVideoAlert = () => {
    if (isSimulating) return;
    if (!activeYtId) {
      alert('Please enter a valid YouTube video URL to test.');
      return;
    }

    setPreviewMuted(false);
    setIsSimulating(true);

    const testPayload = {
      id: `test_video_${Date.now()}`,
      donorName: demoDonorName || 'Supporter',
      amount: demoAmount,
      currency: 'USD',
      message: demoDonorMessage,
      video: {
        youtubeUrl: demoVideoUrl,
        videoId: activeYtId,
        startTime: demoStartTime,
        endTime: demoEndTime,
        duration: Math.max(1, demoEndTime - demoStartTime),
        volume: videoVolume
      },
      videoUrl: demoVideoUrl,
      videoTitle: 'Live Media Share',
      videoStartTime: demoStartTime,
      videoEndTime: demoEndTime,
      videoVolume: videoVolume,
      videoHeaderColor: headerColor,
      videoHeaderBgColor: headerBgColor,
      videoFooterColor: footerColor,
      videoFooterBgColor: footerBgColor,
      videoHeaderTextAlign: headerTextAlign,
      videoFooterTextAlign: footerTextAlign,
      headerColor,
      headerBgColor,
      footerColor,
      footerBgColor,
      headerTextAlign,
      footerTextAlign,
      autoDucking,
      overlayToken: effectiveToken
    };

    if (socket) {
      socket.emit('test_video_alert', testPayload);
    }

    const testDuration = Math.max(3, demoEndTime - demoStartTime);
    setTimeout(() => {
      setIsSimulating(false);
    }, (testDuration + 1) * 1000);
  };

  // 2. Save video settings to database via API
  const handleSaveSettings = async () => {
    setIsSaving(true);
    setToastMessage(null);

    const payload = {
      token: effectiveToken,
      isEnabled,
      minTipAmount,
      maxDurationSeconds,
      videoVolume,
      autoDucking,
      headerColor,
      headerBgColor,
      footerColor,
      footerBgColor,
      headerTextAlign,
      footerTextAlign
    };

    try {
      const res = await fetch(`/api/streamer/settings/video?token=${encodeURIComponent(effectiveToken)}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders()
        },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (data.success) {
        setIsEarthquake(false);
        setSavedSettings({
          isEnabled,
          minTipAmount,
          maxDurationSeconds,
          videoVolume,
          autoDucking,
          headerColor,
          headerBgColor,
          footerColor,
          footerBgColor,
          headerTextAlign,
          footerTextAlign
        });
        setToastMessage({
          title: 'Saved Changes',
          desc: 'Video alert configuration saved and synced to OBS!'
        });

        if (socket) {
          socket.emit('streamer_video_settings_updated', {
            token: effectiveToken,
            settings: payload
          });
        }

        setTimeout(() => setToastMessage(null), 3000);
      } else {
        alert(data.error || 'Failed to save video settings');
      }
    } catch (e: any) {
      console.error('Error saving video settings:', e);
      setToastMessage({
        title: 'Save Failed',
        desc: e.message || 'Error communicating with server.'
      });
      setTimeout(() => setToastMessage(null), 3500);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col lg:flex-row gap-4 lg:gap-5 min-h-0 w-full h-full relative">
      {/* ============================================================== */}
      {/* LEFT COLUMN: MAIN CONTENT PAGE (PREVIEW & CLIP TEST SIMULATOR) */}
      {/* ============================================================== */}
      <div className="flex-1 flex flex-col min-h-0 overflow-y-auto space-y-4 pr-0 lg:pr-1 no-scrollbar pb-20 lg:pb-6">
        
        {/* CARD 1: LIVE VIDEO ALERT PREVIEW SCREEN */}
        <div className="rounded-2xl bg-[#090D18] border border-slate-800 p-4 sm:p-5 shadow-2xl flex flex-col gap-4 flex-shrink-0">
          <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 shadow-inner">
                <Video size={16} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-bold text-white font-['Chakra_Petch'] uppercase tracking-wider">
                    Live Video Alert Preview
                  </h3>
                  <span className="px-1.5 py-0.5 rounded text-[9px] font-mono font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                    1080P CANVAS
                  </span>
                </div>
                <p className="text-[10px] text-slate-400 font-mono">
                  Real-time simulation of your OBS video stream overlay
                </p>
              </div>
            </div>

            {/* Quick Actions: Toggle Rightbar Settings on Mobile */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={toggleRightbar}
                className={`lg:hidden flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all border cursor-pointer ${
                  isRightbarOpen
                    ? 'bg-cyan-500 text-slate-950 border-cyan-400 shadow-[0_0_10px_rgba(0,240,255,0.4)]'
                    : 'bg-slate-900 hover:bg-slate-800 text-cyan-300 border-cyan-500/30'
                }`}
                title={isRightbarOpen ? 'Close Settings' : 'Open Settings'}
              >
                <Sliders size={13} />
                <span>Settings</span>
              </button>
            </div>
          </div>

          {/* OBS Studio Screen Canvas Preview Container */}
          <div className="w-full rounded-2xl bg-gradient-to-b from-slate-950 via-[#060911] to-slate-950 border border-slate-800/80 p-3 sm:p-5 shadow-inner relative flex flex-col items-center justify-center min-h-[300px]">
            {/* Subtle Studio Canvas Grid pattern */}
            <div className="absolute inset-0 opacity-15 bg-[radial-gradient(#38bdf8_1px,transparent_1px)] [background-size:20px_20px] pointer-events-none rounded-2xl" />

            {/* Canvas Header Bar with Watermark and Sound Toggle */}
            <div className="w-full flex items-center justify-between pb-2 px-1 relative z-20">
              <div className="text-[10px] font-mono font-bold text-slate-500 uppercase tracking-widest flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
                <span>OBS Studio Canvas View</span>
              </div>

              {/* Sound / Mute Toggle Pill */}
              <button
                type="button"
                onClick={() => setPreviewMuted((prev) => !prev)}
                className={`px-2.5 py-1 rounded-lg text-[10px] font-mono font-bold flex items-center gap-1.5 border transition-all cursor-pointer ${
                  previewMuted
                    ? 'bg-red-500/15 border-red-500/30 text-red-400 hover:bg-red-500/25'
                    : 'bg-cyan-500/15 border-cyan-500/30 text-cyan-300 hover:bg-cyan-500/25'
                }`}
                title={previewMuted ? 'Unmute preview sound' : 'Mute preview sound'}
              >
                {previewMuted ? (
                  <>
                    <VolumeX size={12} className="text-red-400" />
                    <span>Muted</span>
                  </>
                ) : (
                  <>
                    <Volume2 size={12} className="text-cyan-400" />
                    <span>Sound ({videoVolume}%)</span>
                  </>
                )}
              </button>
            </div>

            {/* Video Alert Component (Full unclipped alert card) */}
            {activeYtId ? (
              <div className="w-full max-w-xl my-2 relative z-10 transition-all">
                <VideoPlayerWithProgressBar
                  videoId={activeYtId}
                  startTime={demoStartTime}
                  endTime={demoEndTime}
                  volume={videoVolume}
                  autoplay={isSimulating}
                  muted={previewMuted}
                  donorName={demoDonorName}
                  headerColor={headerColor}
                  headerBgColor={headerBgColor}
                  footerColor={footerColor}
                  footerBgColor={footerBgColor}
                  headerTextAlign={headerTextAlign}
                  footerTextAlign={footerTextAlign}
                  amount={demoAmount}
                  currency="USD"
                  isPreview={true}
                  donorMessage={demoDonorMessage}
                />
              </div>
            ) : (
              <div className="w-full aspect-video rounded-xl bg-slate-950 border border-slate-800 flex flex-col items-center justify-center text-slate-500 gap-2 my-2">
                <Video size={36} className="text-slate-600" />
                <span className="text-xs font-mono text-slate-400">Enter a valid YouTube URL to preview alert</span>
              </div>
            )}
          </div>

          {/* Quick Test Trigger & Sync Status Bar */}
          <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-3 w-full">
            <div className="flex flex-wrap items-center gap-2 sm:gap-3 text-xs font-mono text-slate-400">
              <span className="flex items-center gap-1.5 text-slate-300">
                <CheckCircle2 size={13} className="text-emerald-400" />
                <span>Live Dynamic Sync</span>
              </span>
              <span className="text-slate-600">•</span>
              <span className="text-cyan-400 font-bold">Min Tip: ${minTipAmount.toFixed(2)}+</span>
              <span className="text-slate-600">•</span>
              <span className="text-amber-400 font-bold">Max Clip: {maxDurationSeconds}s</span>
            </div>

            <Button
              variant="secondary"
              size="sm"
              disabled={isLocked || isSimulating}
              onClick={handleTestVideoAlert}
              className="w-full sm:w-auto font-bold flex items-center justify-center gap-2 border-cyan-500/40 text-cyan-300 hover:bg-cyan-500/10 active:scale-95 py-2 px-4 cursor-pointer text-xs font-mono"
            >
              <Play size={13} className="fill-cyan-400" />
              <span>
                {isSimulating ? 'Playing Video on OBS...' : 'Simulate Video Alert'}
              </span>
            </Button>
          </div>
        </div>

        {/* CARD 2: CLIP TRIMMING & TEST SIMULATOR */}
        <div className={`rounded-2xl bg-[#090D18] border border-slate-800 p-4 sm:p-5 shadow-2xl space-y-4 flex-shrink-0 ${isLocked ? 'opacity-70 pointer-events-none' : ''}`}>
          <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
            <div className="flex items-center gap-2">
              <Play size={16} className="text-cyan-400" />
              <h3 className="text-sm font-bold text-white font-['Chakra_Petch'] uppercase tracking-wider">
                Clip Trimming &amp; Test Simulator
              </h3>
            </div>
            <span className="text-[10px] font-mono text-cyan-400 font-bold px-2 py-0.5 rounded bg-cyan-500/10 border border-cyan-500/30">
              BROADCAST TEST TO OBS
            </span>
          </div>

          <div className="space-y-4 text-xs font-mono">
            {/* YouTube Video URL Input */}
            <div>
              <label className="text-slate-300 font-semibold block mb-1.5 flex items-center justify-between">
                <span>YouTube Video URL</span>
                {demoVideoDuration && (
                  <span className="text-[10px] text-slate-400">Total duration: {formatTime(demoVideoDuration)}</span>
                )}
              </label>
              <input
                type="text"
                value={demoVideoUrl}
                onChange={(e) => setDemoVideoUrl(e.target.value)}
                disabled={isLocked}
                placeholder="https://www.youtube.com/watch?v=..."
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-cyan-400 focus:outline-none focus:border-cyan-400 font-mono text-xs"
              />
            </div>

            {/* Preview simulation text inputs with limits */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-slate-400 text-[10px] block mb-1 font-medium flex items-center justify-between">
                  <span>Preview Donor Name (Header)</span>
                  <span className="text-slate-500">{demoDonorName.length}/25</span>
                </label>
                <input
                  type="text"
                  value={demoDonorName}
                  maxLength={25}
                  onChange={(e) => setDemoDonorName(e.target.value.slice(0, 25))}
                  disabled={isLocked}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white font-mono text-xs focus:outline-none focus:border-cyan-400"
                />
              </div>
              <div>
                <label className="text-slate-400 text-[10px] block mb-1 font-medium flex items-center justify-between">
                  <span>Preview Message (Footer)</span>
                  <span className="text-slate-500">{demoDonorMessage.length}/200</span>
                </label>
                <input
                  type="text"
                  value={demoDonorMessage}
                  maxLength={200}
                  onChange={(e) => setDemoDonorMessage(e.target.value.slice(0, 200))}
                  disabled={isLocked}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white font-mono text-xs focus:outline-none focus:border-cyan-400"
                />
              </div>
            </div>

            {/* Video Clip Range Scrubber Line */}
            {activeYtId && (
              <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800/90 space-y-2">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-slate-300 font-semibold flex items-center gap-1.5">
                    <Clock size={13} className="text-amber-400" />
                    <span>Clip Range Trimmer</span>
                  </span>
                  <span className="text-amber-400 font-bold font-mono">
                    Selected: {demoEndTime - demoStartTime}s (Max Allowed: {maxDurationSeconds}s)
                  </span>
                </div>
                <VideoClipScrubberLine
                  startTime={demoStartTime}
                  endTime={demoEndTime}
                  videoDuration={demoVideoDuration}
                  maxAllowedDuration={maxDurationSeconds}
                  onChange={(newStart, newEnd) => {
                    setDemoStartTime(newStart);
                    setDemoEndTime(newEnd);
                  }}
                />
              </div>
            )}

            {/* Media Share Sequence Info */}
            <div className="p-3 rounded-xl bg-cyan-950/20 border border-cyan-500/30 text-[11px] text-slate-300 space-y-1">
              <span className="font-bold text-cyan-300 flex items-center gap-1.5">
                <Sparkles size={13} className="text-cyan-400" />
                <span>Media Share Playback Modes:</span>
              </span>
              <p className="text-slate-400 leading-relaxed text-[11px]">
                • <strong>Live Donation:</strong> Plays sequentially (Stage 1 Donation Card ➔ Stage 2 Video Clip with countdown bar).<br />
                • <strong>Test Video:</strong> Plays video clip instantly on OBS screen without awaiting donation alert requirements.
              </p>
            </div>

            {/* Trigger Test Video Alert Action Button */}
            <Button
              variant="secondary"
              size="md"
              disabled={isLocked || isSimulating}
              onClick={handleTestVideoAlert}
              className="w-full font-bold flex items-center justify-center gap-2 border-cyan-500/40 text-cyan-300 hover:bg-cyan-500/10 active:scale-95 py-2.5 cursor-pointer font-mono"
            >
              <Play size={14} className="fill-cyan-400" />
              <span>
                {isSimulating
                  ? 'Playing Video Clip on OBS Screen...'
                  : 'Trigger Test Video Alert (Instant Play)'}
              </span>
            </Button>
          </div>
        </div>
      </div>

      {/* ============================================================== */}
      {/* MOBILE BACKDROP OVERLAY                                        */}
      {/* ============================================================== */}
      {isRightbarOpen && (
        <div
          className="fixed inset-0 z-[90] bg-black/80 backdrop-blur-md lg:hidden transition-opacity duration-200"
          onClick={closeRightbar}
        />
      )}

      {/* ============================================================== */}
      {/* RIGHT COLUMN: MERGED DASHBOARD RIGHTBAR (STICKY ON DESKTOP)   */}
      {/* (DESKTOP: RIGHTBAR PANEL | MOBILE: RESPONSIVE SLIDE-IN MODAL)  */}
      {/* ============================================================== */}
      <aside
        className={`
          ${isRightbarOpen
            ? 'fixed inset-0 sm:inset-y-0 sm:right-0 sm:left-auto z-[100] w-full sm:w-[420px] bg-[#090D18] sm:border-l border-slate-800 shadow-2xl flex flex-col h-[100dvh] max-h-[100dvh] overflow-hidden animate-in slide-in-from-right duration-200'
            : 'hidden'
          }
          lg:relative lg:inset-auto lg:z-auto lg:w-[380px] xl:w-[420px] lg:flex lg:flex-col lg:rounded-2xl lg:border lg:border-slate-800/90 lg:bg-[#090D18] lg:shadow-2xl lg:h-full lg:overflow-hidden lg:min-h-0 flex-shrink-0
        `}
      >
        {/* Rightbar Header Deck */}
        <div className="p-4 sm:p-5 border-b border-slate-800 bg-[#060911]/90 flex items-center justify-between gap-3 flex-shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 shadow-inner flex-shrink-0">
              <Sliders size={16} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-white font-['Chakra_Petch'] uppercase tracking-wider">
                  Video Alert Settings
                </h3>
                <span className="px-1.5 py-0.5 rounded text-[9px] font-mono font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                  LIVE
                </span>
              </div>
              <p className="text-[10px] text-slate-400 font-mono">Live configuration &amp; overlay sync</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {hasUnsavedChanges && (
              <span className="text-[10px] font-mono text-amber-400 font-semibold px-2 py-0.5 rounded bg-amber-500/10 border border-amber-500/30 animate-pulse">
                Unsaved
              </span>
            )}
            <button
              type="button"
              onClick={closeRightbar}
              className="lg:hidden w-8 h-8 rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
              title="Close Settings"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Scrollable Rightbar Form Body - ALL SETTINGS MERGED TOGETHER! */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-5 no-scrollbar">
          
          {/* 1. ENABLE / DISABLE TOGGLE */}
          <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800/80 space-y-3">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5 min-w-0">
                <h4 className="text-sm font-bold text-white font-['Chakra_Petch'] uppercase tracking-wider flex items-center gap-2">
                  <Sliders size={15} className="text-cyan-400" />
                  Video Alert Status
                </h4>
                <p className="text-[11px] text-slate-400">
                  {isEnabled
                    ? 'Enabled: Video URL input is active on your donation page'
                    : 'Disabled: Video feature is hidden on your donation page'}
                </p>
              </div>

              <label className="relative inline-flex items-center cursor-pointer flex-shrink-0 ml-2">
                <input
                  type="checkbox"
                  checked={isEnabled}
                  onChange={(e) => setIsEnabled(e.target.checked)}
                  disabled={isLocked}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-cyan-500"></div>
              </label>
            </div>
          </div>

          {/* 2. MINIMUM TIP TO TRIGGER VIDEO */}
          <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800/80 space-y-2.5 font-mono text-xs">
            <div className="flex items-center justify-between">
              <label className="text-slate-300 font-semibold flex items-center gap-1.5">
                <DollarSign size={14} className="text-cyan-400" />
                <span>Minimum Tip to Trigger Video</span>
              </label>
              <span className="text-cyan-400 font-extrabold text-sm">
                ${minTipAmount.toFixed(2)} USD
              </span>
            </div>

            <input
              type="range"
              min="0.25"
              max="50"
              step="0.25"
              value={minTipAmount}
              onChange={(e) => setMinTipAmount(parseFloat(e.target.value) || 0.25)}
              disabled={isLocked}
              className="w-full accent-cyan-400 cursor-pointer"
            />

            {/* Quick Presets ($0.25 to $50) */}
            <div className="grid grid-cols-4 sm:grid-cols-7 gap-1.5">
              {[0.25, 0.5, 1.0, 2.0, 5.0, 10.0, 50.0].map((amt) => (
                <button
                  key={amt}
                  type="button"
                  disabled={isLocked}
                  onClick={() => setMinTipAmount(amt)}
                  className={`py-1.5 px-1 rounded-lg text-center font-bold text-[10px] border transition-colors cursor-pointer active:scale-95 ${
                    minTipAmount === amt
                      ? 'bg-cyan-500/20 border-cyan-400 text-cyan-300 shadow-[0_0_8px_rgba(6,182,212,0.3)]'
                      : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700'
                  }`}
                >
                  ${amt.toFixed(amt < 1 ? 2 : 0)}
                </button>
              ))}
            </div>

            <span className="text-[10px] text-slate-500 block leading-tight pt-1">
              Donations under ${minTipAmount.toFixed(2)} trigger standard mascot/text alerts without video.
            </span>
          </div>

          {/* 3. MAX ALLOWED CLIP LENGTH */}
          <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800/80 space-y-2.5 font-mono text-xs">
            <div className="flex items-center justify-between">
              <label className="text-slate-300 font-semibold flex items-center gap-1.5">
                <Clock size={14} className="text-amber-400" />
                <span>Max Allowed Clip Length</span>
              </label>
              <span className="text-amber-400 font-extrabold text-sm">
                {maxDurationSeconds}s ({formatTime(maxDurationSeconds)})
              </span>
            </div>

            <input
              type="range"
              min="10"
              max="300"
              step="5"
              value={maxDurationSeconds}
              onChange={(e) => setMaxDurationSeconds(parseInt(e.target.value) || 30)}
              disabled={isLocked}
              className="w-full accent-amber-400 cursor-pointer"
            />

            {/* Presets up to 5 minutes */}
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-1.5">
              {[
                { label: '15s', sec: 15 },
                { label: '30s', sec: 30 },
                { label: '1m', sec: 60 },
                { label: '2m', sec: 120 },
                { label: '3m', sec: 180 },
                { label: '5m', sec: 300 }
              ].map((p) => (
                <button
                  key={p.sec}
                  type="button"
                  disabled={isLocked}
                  onClick={() => setMaxDurationSeconds(p.sec)}
                  className={`py-1.5 px-2 rounded-lg text-center font-bold text-[10px] border transition-colors cursor-pointer active:scale-95 ${
                    maxDurationSeconds === p.sec
                      ? 'bg-amber-500/20 border-amber-400 text-amber-300 shadow-[0_0_8px_rgba(245,158,11,0.3)]'
                      : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700'
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          {/* 4. VIDEO PLAYER VOLUME */}
          <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800/80 space-y-2.5 font-mono text-xs">
            <div className="flex items-center justify-between">
              <label className="text-slate-300 font-semibold flex items-center gap-1.5">
                <Volume2 size={14} className="text-cyan-400" />
                <span>Video Player Volume</span>
              </label>
              <span className="text-cyan-400 font-bold">{videoVolume}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="100"
              value={videoVolume}
              onChange={(e) => setVideoVolume(Number(e.target.value))}
              disabled={isLocked}
              className="w-full accent-cyan-400 cursor-pointer"
            />
          </div>

          {/* 5. AUTO DUCKING TOGGLE */}
          <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800/80 flex items-center justify-between font-mono text-xs">
            <div>
              <span className="text-slate-200 font-semibold block">Automatic Audio Ducking</span>
              <span className="text-[10px] text-slate-400">Lowers stream audio while clip plays</span>
            </div>
            <input
              type="checkbox"
              checked={autoDucking}
              onChange={(e) => setAutoDucking(e.target.checked)}
              disabled={isLocked}
              className="w-4 h-4 accent-cyan-400 rounded cursor-pointer"
            />
          </div>

          {/* 6. HEADER & FOOTER APPEARANCE */}
          <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800/80 space-y-4 font-mono text-xs">
            <div className="flex items-center justify-between border-b border-slate-800/80 pb-2.5">
              <div className="flex items-center gap-2">
                <Palette size={15} className="text-cyan-400" />
                <h4 className="text-sm font-bold text-white font-['Chakra_Petch'] uppercase tracking-wider">
                  Header &amp; Footer Appearance
                </h4>
              </div>
              <span className="text-[9px] font-mono text-cyan-400 font-bold px-2 py-0.5 rounded bg-cyan-500/10 border border-cyan-500/30">
                LIVE SYNC
              </span>
            </div>

            {/* --- HEADER STYLING (DONOR NAME) --- */}
            <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800/70 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-slate-200 font-semibold text-xs flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-cyan-400" />
                  Header (Donor Name)
                </span>
                <span className="text-[10px] font-mono text-slate-500">Top Banner</span>
              </div>

              {/* Header Text Color */}
              <div className="space-y-1.5">
                <label className="text-[10px] text-slate-400 block font-medium">Header Text Color</label>
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1.5 bg-black border border-slate-800 rounded-lg p-1 px-2 flex-1">
                    <input
                      type="color"
                      value={headerColor.startsWith('#') && headerColor.length === 7 ? headerColor : '#00F0FF'}
                      onChange={(e) => setHeaderColor(e.target.value)}
                      disabled={isLocked}
                      className="w-5 h-5 rounded border-0 bg-transparent cursor-pointer"
                    />
                    <input
                      type="text"
                      value={headerColor}
                      onChange={(e) => setHeaderColor(e.target.value)}
                      disabled={isLocked}
                      className="w-full bg-transparent text-xs font-mono text-cyan-300 focus:outline-none uppercase"
                      placeholder="#00F0FF"
                    />
                  </div>
                  <div className="flex items-center gap-1">
                    {['#00F0FF', '#FFFFFF', '#FFE600', '#10B981', '#EC4899', '#A855F7'].map((hex) => (
                      <button
                        key={hex}
                        type="button"
                        onClick={() => setHeaderColor(hex)}
                        disabled={isLocked}
                        title={hex}
                        className={`w-5 h-5 rounded-md border transition-transform cursor-pointer ${
                          headerColor.toLowerCase() === hex.toLowerCase()
                            ? 'scale-110 ring-2 ring-cyan-400 border-white'
                            : 'border-slate-700 hover:scale-105'
                        }`}
                        style={{ backgroundColor: hex }}
                      />
                    ))}
                  </div>
                </div>
              </div>

              {/* Header Background Color */}
              <div className="space-y-1.5">
                <label className="text-[10px] text-slate-400 block font-medium">Header Background Color</label>
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1.5 bg-black border border-slate-800 rounded-lg p-1 px-2 flex-1">
                    <input
                      type="color"
                      value={headerBgColor.startsWith('#') && headerBgColor.length === 7 ? headerBgColor : '#002fff'}
                      onChange={(e) => setHeaderBgColor(e.target.value)}
                      disabled={isLocked}
                      className="w-5 h-5 rounded border-0 bg-transparent cursor-pointer"
                    />
                    <input
                      type="text"
                      value={headerBgColor}
                      onChange={(e) => setHeaderBgColor(e.target.value)}
                      disabled={isLocked}
                      className="w-full bg-transparent text-xs font-mono text-cyan-300 focus:outline-none"
                      placeholder="rgba(2, 6, 23, 0.95)"
                    />
                  </div>
                  <div className="flex items-center gap-1">
                    {['rgba(2, 6, 23, 0.95)', '#002fff', '#000000', '#0F172A', '#1E1B4B', 'transparent'].map((hex) => (
                      <button
                        key={hex}
                        type="button"
                        onClick={() => setHeaderBgColor(hex === 'transparent' ? 'transparent' : hex)}
                        disabled={isLocked}
                        title={hex}
                        className={`w-5 h-5 rounded-md border transition-transform cursor-pointer ${
                          headerBgColor.toLowerCase() === hex.toLowerCase()
                            ? 'scale-110 ring-2 ring-cyan-400 border-white'
                            : 'border-slate-700 hover:scale-105'
                        } ${hex === 'transparent' ? 'bg-slate-900 border-dashed text-[8px] flex items-center justify-center text-slate-400' : ''}`}
                        style={hex !== 'transparent' ? { backgroundColor: hex.startsWith('rgba') ? '#020617' : hex } : {}}
                      >
                        {hex === 'transparent' ? 'ø' : ''}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Header Text Align */}
              <div className="space-y-1.5">
                <label className="text-[10px] text-slate-400 block font-medium">Header Text Align</label>
                <div className="grid grid-cols-4 gap-1.5">
                  {(
                    [
                      { id: 'left', label: 'Left', icon: AlignLeft },
                      { id: 'center', label: 'Center', icon: AlignCenter },
                      { id: 'justify', label: 'Justify', icon: AlignJustify },
                      { id: 'right', label: 'Right', icon: AlignRight }
                    ] as const
                  ).map(({ id, label, icon: Icon }) => (
                    <button
                      key={id}
                      type="button"
                      onClick={() => setHeaderTextAlign(id)}
                      disabled={isLocked}
                      className={`py-1.5 px-2 rounded-lg text-xs font-mono font-bold flex items-center justify-center gap-1.5 border transition-all cursor-pointer active:scale-95 ${
                        headerTextAlign === id
                          ? 'bg-cyan-500/20 border-cyan-400 text-cyan-300 shadow-[0_0_8px_rgba(6,182,212,0.3)]'
                          : 'bg-black border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700'
                      }`}
                    >
                      <Icon size={12} />
                      <span className="text-[10px]">{label}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* --- FOOTER STYLING (DONOR MESSAGE) --- */}
            <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800/70 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-slate-200 font-semibold text-xs flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-pink-400" />
                  Footer (Donor Message)
                </span>
                <span className="text-[10px] font-mono text-slate-500">Bottom Card</span>
              </div>

              {/* Footer Text Color */}
              <div className="space-y-1.5">
                <label className="text-[10px] text-slate-400 block font-medium">Footer Text Color</label>
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1.5 bg-black border border-slate-800 rounded-lg p-1 px-2 flex-1">
                    <input
                      type="color"
                      value={footerColor.startsWith('#') && footerColor.length === 7 ? footerColor : '#FFFFFF'}
                      onChange={(e) => setFooterColor(e.target.value)}
                      disabled={isLocked}
                      className="w-5 h-5 rounded border-0 bg-transparent cursor-pointer"
                    />
                    <input
                      type="text"
                      value={footerColor}
                      onChange={(e) => setFooterColor(e.target.value)}
                      disabled={isLocked}
                      className="w-full bg-transparent text-xs font-mono text-slate-200 focus:outline-none uppercase"
                      placeholder="#FFFFFF"
                    />
                  </div>
                  <div className="flex items-center gap-1">
                    {['#FFFFFF', '#E2E8F0', '#CFFAFE', '#FEF3C7', '#D1FAE5', '#FFE4E6'].map((hex) => (
                      <button
                        key={hex}
                        type="button"
                        onClick={() => setFooterColor(hex)}
                        disabled={isLocked}
                        title={hex}
                        className={`w-5 h-5 rounded-md border transition-transform cursor-pointer ${
                          footerColor.toLowerCase() === hex.toLowerCase()
                            ? 'scale-110 ring-2 ring-pink-400 border-white'
                            : 'border-slate-700 hover:scale-105'
                        }`}
                        style={{ backgroundColor: hex }}
                      />
                    ))}
                  </div>
                </div>
              </div>

              {/* Footer Background Color */}
              <div className="space-y-1.5">
                <label className="text-[10px] text-slate-400 block font-medium">Footer Background Color</label>
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1.5 bg-black border border-slate-800 rounded-lg p-1 px-2 flex-1">
                    <input
                      type="color"
                      value={footerBgColor.startsWith('#') && footerBgColor.length === 7 ? footerBgColor : '#ff0000'}
                      onChange={(e) => setFooterBgColor(e.target.value)}
                      disabled={isLocked}
                      className="w-5 h-5 rounded border-0 bg-transparent cursor-pointer"
                    />
                    <input
                      type="text"
                      value={footerBgColor}
                      onChange={(e) => setFooterBgColor(e.target.value)}
                      disabled={isLocked}
                      className="w-full bg-transparent text-xs font-mono text-pink-300 focus:outline-none"
                      placeholder="rgba(0, 0, 0, 0.90)"
                    />
                  </div>
                  <div className="flex items-center gap-1">
                    {['rgba(0, 0, 0, 0.90)', '#ff0000', '#000000', '#020617', '#0F172A', 'transparent'].map((hex) => (
                      <button
                        key={hex}
                        type="button"
                        onClick={() => setFooterBgColor(hex === 'transparent' ? 'transparent' : hex)}
                        disabled={isLocked}
                        title={hex}
                        className={`w-5 h-5 rounded-md border transition-transform cursor-pointer ${
                          footerBgColor.toLowerCase() === hex.toLowerCase()
                            ? 'scale-110 ring-2 ring-pink-400 border-white'
                            : 'border-slate-700 hover:scale-105'
                        } ${hex === 'transparent' ? 'bg-slate-900 border-dashed text-[8px] flex items-center justify-center text-slate-400' : ''}`}
                        style={hex !== 'transparent' ? { backgroundColor: hex.startsWith('rgba') ? '#000000' : hex } : {}}
                      >
                        {hex === 'transparent' ? 'ø' : ''}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Footer Text Align */}
              <div className="space-y-1.5">
                <label className="text-[10px] text-slate-400 block font-medium">Footer Text Align</label>
                <div className="grid grid-cols-4 gap-1.5">
                  {(
                    [
                      { id: 'left', label: 'Left', icon: AlignLeft },
                      { id: 'center', label: 'Center', icon: AlignCenter },
                      { id: 'justify', label: 'Justify', icon: AlignJustify },
                      { id: 'right', label: 'Right', icon: AlignRight }
                    ] as const
                  ).map(({ id, label, icon: Icon }) => (
                    <button
                      key={id}
                      type="button"
                      onClick={() => setFooterTextAlign(id)}
                      disabled={isLocked}
                      className={`py-1.5 px-2 rounded-lg text-xs font-mono font-bold flex items-center justify-center gap-1.5 border transition-all cursor-pointer active:scale-95 ${
                        footerTextAlign === id
                          ? 'bg-pink-500/20 border-pink-400 text-pink-300 shadow-[0_0_8px_rgba(236,72,153,0.3)]'
                          : 'bg-black border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700'
                      }`}
                    >
                      <Icon size={12} />
                      <span className="text-[10px]">{label}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </aside>

      {/* ============================================================== */}
      {/* BOTTOM FLOATING UNSAVED CHANGES TOAST BAR                      */}
      {/* ============================================================== */}
      <div
        className={`fixed bottom-5 left-1/2 -translate-x-1/2 z-50 w-[calc(100%-1.5rem)] max-w-xl transition-all duration-300 ease-in-out ${
          hasUnsavedChanges
            ? 'translate-y-0 opacity-100 pointer-events-auto'
            : 'translate-y-24 opacity-0 pointer-events-none'
        } ${isEarthquake ? 'animate-toast-earthquake' : ''}`}
      >
        <div
          className={`rounded-2xl px-4 py-3 backdrop-blur-xl transition-all duration-300 flex items-center justify-between gap-3 ${
            isEarthquake
              ? 'bg-gradient-to-r from-red-950/95 via-rose-950/95 to-red-950/95 border-2 border-red-500 shadow-[0_0_35px_rgba(239,68,68,0.7),0_14px_45px_rgba(0,0,0,0.95)] animate-toast-red-pulse'
              : 'bg-[#0B101E]/95 border border-cyan-500/40 shadow-[0_14px_45px_rgba(0,0,0,0.85),0_0_25px_rgba(0,240,255,0.18)]'
          }`}
        >
          <div className="flex items-center gap-2.5 min-w-0">
            {isEarthquake ? (
              <div className="w-8 h-8 rounded-xl bg-red-500/20 border border-red-500/40 flex items-center justify-center text-red-400 flex-shrink-0 shadow-[0_0_12px_rgba(239,68,68,0.5)]">
                <AlertTriangle size={16} className="animate-bounce" />
              </div>
            ) : (
              <div className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-pulse flex-shrink-0 shadow-[0_0_8px_rgba(0,240,255,0.8)]" />
            )}
            <div className="min-w-0">
              <div className={`text-xs font-bold truncate flex items-center gap-1.5 ${isEarthquake ? 'text-red-200' : 'text-white'}`}>
                {isEarthquake ? (
                  <>
                    <span className="font-black text-red-400 uppercase tracking-wider">Unsaved Changes!</span>
                    <span className="hidden sm:inline text-red-200 font-medium">— Navigation blocked</span>
                  </>
                ) : (
                  <span>Careful — you have unsaved changes!</span>
                )}
              </div>
              <p className={`text-[10px] truncate hidden xs:block ${isEarthquake ? 'text-red-300 font-semibold' : 'text-slate-400'}`}>
                {isEarthquake
                  ? 'Please Save or Reset changes before switching to another feature!'
                  : 'Save to update live donation page and OBS overlay'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            <button
              type="button"
              onClick={handleResetChanges}
              disabled={isSaving}
              className={`px-3 py-1.5 rounded-xl text-xs font-mono font-bold transition-all cursor-pointer ${
                isEarthquake
                  ? 'bg-red-950/80 border border-red-500/40 text-red-300 hover:bg-red-900/60 hover:text-white'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              Reset
            </button>
            <button
              type="button"
              onClick={handleSaveSettings}
              disabled={isSaving}
              className={`px-4 py-1.5 rounded-xl text-xs font-mono font-bold transition-all flex items-center gap-1.5 cursor-pointer active:scale-95 shadow-md ${
                isEarthquake
                  ? 'bg-gradient-to-r from-red-500 to-rose-600 hover:from-red-400 hover:to-rose-500 text-white shadow-[0_0_20px_rgba(239,68,68,0.6)] animate-pulse'
                  : 'bg-gradient-to-r from-cyan-400 to-cyan-300 hover:from-cyan-300 hover:to-cyan-200 text-slate-950 shadow-cyan-500/20'
              } disabled:opacity-50`}
            >
              {isSaving ? (
                <>
                  <RefreshCw size={12} className="animate-spin" />
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <Save size={13} />
                  <span>Save Changes</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Floating Success Notification Toast */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 animate-bounce">
          <div className="px-4 py-3 rounded-2xl bg-emerald-950/90 border border-emerald-500/40 text-emerald-200 text-xs font-mono shadow-2xl flex items-center gap-2">
            <CheckCircle2 size={16} className="text-emerald-400" />
            <div>
              <div className="font-bold">{toastMessage.title}</div>
              <div className="text-[10px] text-emerald-400">{toastMessage.desc}</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
