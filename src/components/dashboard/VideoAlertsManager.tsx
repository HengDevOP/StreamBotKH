'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Video,
  Play,
  Volume2,
  VolumeX,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  Check,
  Copy,
  ExternalLink,
  Eye,
  EyeOff,
  X,
  RefreshCw,
  PanelRight,
  Save
} from 'lucide-react';
import { useSocket } from '../../context/SocketContext';
import {
  VideoPlayerWithProgressBar,
  formatTime,
  TextAlignMode
} from '../common/VideoPlayerWithProgressBar';
import { VideoClipScrubberLine } from '../donate/VideoClipScrubberLine';
import { VideoAlertsSkeleton } from './DashboardSkeleton';

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
  isRightbarOpen: controlledIsRightbarOpen,
  onToggleRightbar,
  onCloseRightbar,
  onUnsavedChangesChange
}) => {
  const isLocked = false;
  const { socket } = useSocket();

  // Rightbar Settings Drawer State
  const [internalRightbarOpen, setInternalRightbarOpen] = useState(true);
  const isRightbarOpen =
    controlledIsRightbarOpen !== undefined ? controlledIsRightbarOpen : internalRightbarOpen;

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

  // Video Alert Configuration State
  const [isEnabled, setIsEnabled] = useState(false);
  const [minTipAmount, setMinTipAmount] = useState<number>(2.0);
  const [maxDurationSeconds, setMaxDurationSeconds] = useState<number>(30);
  const [videoVolume, setVideoVolume] = useState<number>(85);
  const [autoDucking, setAutoDucking] = useState(true);
  const [headerColor, setHeaderColor] = useState<string>('#00F0FF');
  const [headerBgColor, setHeaderBgColor] = useState<string>('rgba(2, 6, 23, 0.95)');
  const [footerColor, setFooterColor] = useState<string>('#FFFFFF');
  const [footerBgColor, setFooterBgColor] = useState<string>('rgba(0, 0, 0, 0.90)');
  const [headerTextAlign, setHeaderTextAlign] = useState<TextAlignMode>('left');
  const [footerTextAlign, setFooterTextAlign] = useState<TextAlignMode>('left');
  const [isSaving, setIsSaving] = useState(false);

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
  const [demoVideoUrl, setDemoVideoUrl] = useState(
    'https://www.youtube.com/watch?v=HSsGnEOFY6U&list=RDHSsGnEOFY6U&start_radio=1'
  );
  const [demoVideoDuration, setDemoVideoDuration] = useState<number | undefined>(66);
  const [demoStartTime, setDemoStartTime] = useState(0);
  const [demoEndTime, setDemoEndTime] = useState(30);
  const [demoDonorName, setDemoDonorName] = useState('Supporter');
  const [demoAmount, setDemoAmount] = useState(5.0);
  const [demoDonorMessage, setDemoDonorMessage] = useState(
    'Check out this legendary hype moment!'
  );
  const [isSimulating, setIsSimulating] = useState(false);
  const [previewMuted, setPreviewMuted] = useState(false);
  const [previewScale, setPreviewScale] = useState<number>(1);
  const [activeRightbarTab, setActiveRightbarTab] = useState<'general' | 'style' | 'simulator'>(
    'general'
  );

  // OBS URL state
  const [showOverlayToken, setShowOverlayToken] = useState(false);
  const [copiedOverlay, setCopiedOverlay] = useState(false);

  const effectiveToken = streamerToken || 'demo-token';
  const overlayUrl =
    typeof window !== 'undefined'
      ? `${window.location.origin}/overlay/video/${effectiveToken}`
      : `/overlay/video/${effectiveToken}`;

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

  const getAuthHeaders = (): Record<string, string> => {
    if (typeof window === 'undefined') return {};
    const token =
      localStorage.getItem('streamneon_auth_token') || localStorage.getItem('streamneon_token');
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
    const match = demoVideoUrl.match(
      /(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([\w-]{11})/
    );
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

  useEffect(() => {
    onUnsavedChangesChange?.(hasUnsavedChanges);
    window.dispatchEvent(
      new CustomEvent('video-unsaved-changes', { detail: { hasUnsavedChanges } })
    );
    window.dispatchEvent(
      new CustomEvent('dashboard-unsaved-changes', {
        detail: { tab: 'video-alerts', hasUnsaved: hasUnsavedChanges }
      })
    );
    if (!hasUnsavedChanges) {
      setIsEarthquake(false);
    }
  }, [hasUnsavedChanges, onUnsavedChangesChange]);

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

  const handleSaveSettings = async () => {
    setIsSaving(true);

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
      const res = await fetch(
        `/api/streamer/settings/video?token=${encodeURIComponent(effectiveToken)}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...getAuthHeaders()
          },
          body: JSON.stringify(payload)
        }
      );

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

        if (socket) {
          socket.emit('streamer_video_settings_updated', {
            token: effectiveToken,
            settings: payload
          });
        }
      } else {
        alert(data.error || 'Failed to save video settings');
      }
    } catch (e: any) {
      console.error('Error saving video settings:', e);
    } finally {
      setIsSaving(false);
    }
  };

  const handleCopyOverlay = () => {
    navigator.clipboard.writeText(overlayUrl);
    setCopiedOverlay(true);
    setTimeout(() => setCopiedOverlay(false), 2000);
  };

  if (!savedSettings) {
    return <VideoAlertsSkeleton />;
  }

  return (
    <div className="flex-1 flex flex-col lg:flex-row gap-4 min-h-0 w-full h-full overflow-hidden relative">
      {/* ============================================================== */}
      {/* LEFT MAIN WORKSPACE: VIDEO SHARE PREVIEW + BOTTOM OBS BAR      */}
      {/* ============================================================== */}
      <div className="flex-1 min-w-0 bg-[#0B0F19] border border-slate-800/80 rounded-xl flex flex-col overflow-hidden min-h-[480px]">
        {/* Top Bar */}
        <div className="px-4 py-3 border-b border-slate-800/80 bg-[#090D16] flex flex-wrap items-center justify-between gap-2 shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <Video size={15} className="text-slate-300 shrink-0" />
            <span className="text-xs font-semibold text-white truncate">Video Share Preview</span>
            <span
              className={`px-2 py-0.5 rounded text-[10px] font-mono border ${
                isEnabled
                  ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                  : 'bg-slate-900 text-slate-400 border-slate-800'
              }`}
            >
              {isEnabled ? 'ENABLED' : 'DISABLED'}
            </span>
            <span className="hidden sm:inline-block px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-[10px] font-mono text-slate-400">
              Min ${minTipAmount.toFixed(2)} • Max {maxDurationSeconds}s
            </span>
          </div>

          <div className="flex items-center gap-2">
            {/* Sound / Mute Toggle */}
            <button
              type="button"
              onClick={() => setPreviewMuted((prev) => !prev)}
              className="px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-[11px] font-mono text-slate-300 hover:text-white flex items-center gap-1.5 transition-colors cursor-pointer"
              title={previewMuted ? 'Unmute preview sound' : 'Mute preview sound'}
            >
              {previewMuted ? (
                <>
                  <VolumeX size={13} className="text-red-400" />
                  <span>Muted</span>
                </>
              ) : (
                <>
                  <Volume2 size={13} className="text-slate-300" />
                  <span>{videoVolume}%</span>
                </>
              )}
            </button>

            {/* Scale Selector */}
            <div className="flex items-center gap-1 bg-slate-900/90 border border-slate-800 rounded-lg p-0.5">
              {[0.75, 1, 1.15].map((scaleVal) => (
                <button
                  key={scaleVal}
                  type="button"
                  onClick={() => setPreviewScale(scaleVal)}
                  className={`px-2 py-0.5 rounded text-[10px] font-mono transition-colors ${
                    previewScale === scaleVal
                      ? 'bg-slate-700 text-white font-semibold'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {Math.round(scaleVal * 100)}%
                </button>
              ))}
            </div>

            {!isRightbarOpen && (
              <button
                type="button"
                onClick={toggleRightbar}
                className="px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-200 hover:text-white text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer"
                title="Open Video Share Settings"
              >
                <PanelRight size={13} />
                <span className="hidden sm:inline">Config</span>
              </button>
            )}
          </div>
        </div>

        {/* Center Preview Canvas */}
        <div className="obs-preview-stage flex-1 bg-[#070A12] overflow-auto flex flex-col items-center justify-center p-4 sm:p-6 min-h-[320px]">
          {activeYtId ? (
            <div
              style={{
                transform: `scale(${previewScale})`,
                transformOrigin: 'center center'
              }}
              className="w-full max-w-xl transition-transform duration-200"
            >
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
            <div className="w-full max-w-xl aspect-video rounded-xl bg-slate-950 border border-slate-800 flex flex-col items-center justify-center text-slate-500 gap-2">
              <Video size={32} className="text-slate-600" />
              <span className="text-xs font-mono text-slate-400">
                Enter a valid YouTube URL in the Simulator tab to preview
              </span>
            </div>
          )}
        </div>

        {/* Bottom OBS Source & Test Action Bar */}
        <div className="p-3.5 border-t border-slate-800/80 bg-[#090D16] flex flex-col gap-2.5 shrink-0">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
            {/* OBS Source URL Readout */}
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <span className="text-[11px] font-mono text-slate-400 shrink-0 hidden md:inline">
                OBS SOURCE URL:
              </span>
              <div className="flex-1 flex items-center rounded-lg bg-slate-950 border border-slate-800 px-3 py-1.5 overflow-hidden min-w-0">
                <span className="text-xs font-mono text-slate-300 select-all truncate">
                  {showOverlayToken
                    ? overlayUrl
                    : `${overlayUrl.split('/overlay/video/')[0]}/overlay/video/••••••••••••••••`}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setShowOverlayToken(!showOverlayToken)}
                className="p-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-400 hover:text-white transition-colors cursor-pointer shrink-0"
                title={showOverlayToken ? 'Hide token' : 'Show token'}
              >
                {showOverlayToken ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-2 flex-wrap shrink-0">
              <button
                type="button"
                onClick={handleCopyOverlay}
                className="px-3.5 py-1.5 rounded-lg bg-white hover:bg-slate-200 text-slate-950 font-semibold text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                {copiedOverlay ? (
                  <Check size={13} className="text-emerald-600" />
                ) : (
                  <Copy size={13} />
                )}
                <span>{copiedOverlay ? 'Copied URL' : 'Copy OBS URL'}</span>
              </button>

              <button
                type="button"
                disabled={isLocked || isSimulating}
                onClick={handleTestVideoAlert}
                className="px-3.5 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-100 font-medium text-xs flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
              >
                <Play size={13} />
                <span>{isSimulating ? 'Playing on OBS...' : 'Test Video Alert'}</span>
              </button>

              <a
                href={overlayUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-200 text-xs font-medium flex items-center gap-1.5 transition-colors"
                title="Open Video Share Overlay in New Tab"
              >
                <ExternalLink size={13} />
                <span>Popup</span>
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* ============================================================== */}
      {/* MOBILE BACKDROP OVERLAY                                        */}
      {/* ============================================================== */}
      <div
        className={`fixed inset-0 z-40 bg-black/60 lg:hidden transition-opacity duration-300 ease-in-out ${
          isRightbarOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
        onClick={closeRightbar}
      />

      {/* ============================================================== */}
      {/* RIGHTBAR: ALL VIDEO SHARE CONFIGURATION & CLIP SIMULATOR       */}
      {/* ============================================================== */}
      <div
        className={`fixed lg:static top-0 right-0 bottom-0 z-50 lg:z-auto w-full max-w-[390px] lg:max-w-none shrink-0 h-full overflow-hidden transition-all duration-300 ease-in-out ${
          isRightbarOpen
            ? 'translate-x-0 lg:w-[360px] xl:w-[400px] lg:opacity-100 pointer-events-auto'
            : 'translate-x-full lg:translate-x-0 lg:w-0 lg:opacity-0 lg:-ml-4 pointer-events-none'
        }`}
      >
        <aside className="w-full max-w-[390px] lg:max-w-none lg:w-[360px] xl:w-[400px] bg-[#0B0F19] border-l lg:border border-slate-800/80 lg:rounded-xl flex flex-col h-full overflow-hidden">
          {/* Rightbar Header */}
          <div className="px-4 py-3 border-b border-slate-800/80 bg-[#090D16] flex items-center justify-between gap-2 shrink-0">
            <div>
              <h3 className="text-xs font-semibold text-white uppercase tracking-wider">
                Video Share Configuration
              </h3>
              <p className="text-[11px] text-slate-400">
                Rules, banner appearance &amp; clip simulator
              </p>
            </div>

            <div className="flex items-center gap-2">
              {hasUnsavedChanges && (
                <span className="text-[10px] font-mono text-amber-300 px-2 py-0.5 rounded bg-amber-500/10 border border-amber-500/30">
                  Unsaved
                </span>
              )}
              <button
                type="button"
                onClick={closeRightbar}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
                title="Close Settings"
              >
                <X size={15} />
              </button>
            </div>
          </div>

          {/* Rightbar Section Tabs */}
          <div className="grid grid-cols-3 gap-1 p-2 bg-[#090D16] border-b border-slate-800/80 shrink-0">
            {(
              [
                { id: 'general', label: 'General' },
                { id: 'style', label: 'Appearance' },
                { id: 'simulator', label: 'Simulator' }
              ] as const
            ).map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveRightbarTab(tab.id)}
                className={`py-1.5 px-2 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                  activeRightbarTab === tab.id
                    ? 'bg-slate-800 text-white'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Scrollable Rightbar Body */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {/* TAB 1: GENERAL SETTINGS */}
            {activeRightbarTab === 'general' && (
              <>
                {/* Enable / Disable Video Share */}
                <div className="p-3.5 rounded-xl bg-[#090D16] border border-slate-800 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-xs font-semibold text-white">Enable Video Share</div>
                    <p className="text-[11px] text-slate-400">
                      {isEnabled
                        ? 'Active on your public donation page'
                        : 'Hidden on your public donation page'}
                    </p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer shrink-0">
                    <input
                      type="checkbox"
                      checked={isEnabled}
                      onChange={(e) => setIsEnabled(e.target.checked)}
                      disabled={isLocked}
                      className="sr-only peer"
                    />
                    <div className="w-10 h-5 bg-slate-800 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-500" />
                  </label>
                </div>

                {/* Minimum Tip to Trigger Video */}
                <div className="p-3.5 rounded-xl bg-[#090D16] border border-slate-800 space-y-2.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-200 font-medium">Minimum Tip Amount</span>
                    <span className="font-mono font-semibold text-white">
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
                    className="w-full accent-slate-200 cursor-pointer"
                  />

                  <div className="grid grid-cols-4 sm:grid-cols-7 gap-1">
                    {[0.25, 0.5, 1.0, 2.0, 5.0, 10.0, 50.0].map((amt) => (
                      <button
                        key={amt}
                        type="button"
                        disabled={isLocked}
                        onClick={() => setMinTipAmount(amt)}
                        className={`py-1 px-1 rounded text-center font-mono text-[10px] border transition-colors cursor-pointer ${
                          minTipAmount === amt
                            ? 'bg-slate-800 border-slate-500 text-white font-semibold'
                            : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                        }`}
                      >
                        ${amt.toFixed(amt < 1 ? 2 : 0)}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Max Allowed Clip Length */}
                <div className="p-3.5 rounded-xl bg-[#090D16] border border-slate-800 space-y-2.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-200 font-medium">Max Allowed Clip Length</span>
                    <span className="font-mono font-semibold text-white">
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
                    className="w-full accent-slate-200 cursor-pointer"
                  />

                  <div className="grid grid-cols-6 gap-1">
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
                        className={`py-1 px-1.5 rounded text-center font-mono text-[10px] border transition-colors cursor-pointer ${
                          maxDurationSeconds === p.sec
                            ? 'bg-slate-800 border-slate-500 text-white font-semibold'
                            : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                        }`}
                      >
                        {p.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Video Player Volume */}
                <div className="p-3.5 rounded-xl bg-[#090D16] border border-slate-800 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-200 font-medium">Video Player Volume</span>
                    <span className="font-mono font-semibold text-white">{videoVolume}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={videoVolume}
                    onChange={(e) => setVideoVolume(Number(e.target.value))}
                    disabled={isLocked}
                    className="w-full accent-slate-200 cursor-pointer"
                  />
                </div>

                {/* Auto Ducking */}
                <label className="p-3.5 rounded-xl bg-[#090D16] border border-slate-800 flex items-center justify-between gap-3 cursor-pointer">
                  <div>
                    <div className="text-xs font-medium text-slate-200">
                      Automatic Audio Ducking
                    </div>
                    <div className="text-[11px] text-slate-400">
                      Lowers background audio while clip plays
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={autoDucking}
                    onChange={(e) => setAutoDucking(e.target.checked)}
                    disabled={isLocked}
                    className="w-4 h-4 rounded border-slate-700 bg-slate-900 text-white focus:ring-0"
                  />
                </label>
              </>
            )}

            {/* TAB 2: HEADER & FOOTER APPEARANCE */}
            {activeRightbarTab === 'style' && (
              <div className="space-y-4">
                {/* Header Styling */}
                <div className="p-3.5 rounded-xl bg-[#090D16] border border-slate-800 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-white">Header (Donor Name)</span>
                    <span className="text-[10px] font-mono text-slate-500">Top Bar</span>
                  </div>

                  {/* Header Text Color */}
                  <div className="space-y-1.5">
                    <label className="text-[11px] text-slate-400 block">Text Color</label>
                    <div className="flex items-center gap-2">
                      <div className="flex items-center gap-1.5 bg-slate-950 border border-slate-800 rounded-lg p-1 px-2 flex-1">
                        <input
                          type="color"
                          value={
                            headerColor.startsWith('#') && headerColor.length === 7
                              ? headerColor
                              : '#00F0FF'
                          }
                          onChange={(e) => setHeaderColor(e.target.value)}
                          className="w-5 h-5 rounded border-0 bg-transparent cursor-pointer"
                        />
                        <input
                          type="text"
                          value={headerColor}
                          onChange={(e) => setHeaderColor(e.target.value)}
                          className="w-full bg-transparent text-xs font-mono text-white focus:outline-none uppercase"
                        />
                      </div>
                      <div className="flex items-center gap-1">
                        {['#00F0FF', '#FFFFFF', '#FFE600', '#10B981', '#EC4899'].map((hex) => (
                          <button
                            key={hex}
                            type="button"
                            onClick={() => setHeaderColor(hex)}
                            className={`w-5 h-5 rounded border ${
                              headerColor.toLowerCase() === hex.toLowerCase()
                                ? 'border-white scale-110'
                                : 'border-slate-700'
                            }`}
                            style={{ backgroundColor: hex }}
                          />
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Header Background Color */}
                  <div className="space-y-1.5">
                    <label className="text-[11px] text-slate-400 block">Background Color</label>
                    <div className="flex items-center gap-2">
                      <div className="flex items-center gap-1.5 bg-slate-950 border border-slate-800 rounded-lg p-1 px-2 flex-1">
                        <input
                          type="color"
                          value={
                            headerBgColor.startsWith('#') && headerBgColor.length === 7
                              ? headerBgColor
                              : '#020617'
                          }
                          onChange={(e) => setHeaderBgColor(e.target.value)}
                          className="w-5 h-5 rounded border-0 bg-transparent cursor-pointer"
                        />
                        <input
                          type="text"
                          value={headerBgColor}
                          onChange={(e) => setHeaderBgColor(e.target.value)}
                          className="w-full bg-transparent text-xs font-mono text-white focus:outline-none"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => setHeaderBgColor('transparent')}
                        className="px-2 py-1 rounded bg-slate-900 border border-slate-800 text-[10px] font-mono text-slate-300 hover:text-white"
                      >
                        Clear
                      </button>
                    </div>
                  </div>

                  {/* Header Text Align */}
                  <div className="space-y-1.5">
                    <label className="text-[11px] text-slate-400 block">Text Alignment</label>
                    <div className="grid grid-cols-4 gap-1">
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
                          className={`py-1.5 px-2 rounded text-[10px] font-medium flex items-center justify-center gap-1 border transition-colors ${
                            headerTextAlign === id
                              ? 'bg-slate-800 border-slate-600 text-white'
                              : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                          }`}
                        >
                          <Icon size={11} />
                          <span>{label}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Footer Styling */}
                <div className="p-3.5 rounded-xl bg-[#090D16] border border-slate-800 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-white">Footer (Donor Message)</span>
                    <span className="text-[10px] font-mono text-slate-500">Bottom Bar</span>
                  </div>

                  {/* Footer Text Color */}
                  <div className="space-y-1.5">
                    <label className="text-[11px] text-slate-400 block">Text Color</label>
                    <div className="flex items-center gap-2">
                      <div className="flex items-center gap-1.5 bg-slate-950 border border-slate-800 rounded-lg p-1 px-2 flex-1">
                        <input
                          type="color"
                          value={
                            footerColor.startsWith('#') && footerColor.length === 7
                              ? footerColor
                              : '#FFFFFF'
                          }
                          onChange={(e) => setFooterColor(e.target.value)}
                          className="w-5 h-5 rounded border-0 bg-transparent cursor-pointer"
                        />
                        <input
                          type="text"
                          value={footerColor}
                          onChange={(e) => setFooterColor(e.target.value)}
                          className="w-full bg-transparent text-xs font-mono text-white focus:outline-none uppercase"
                        />
                      </div>
                      <div className="flex items-center gap-1">
                        {['#FFFFFF', '#E2E8F0', '#CFFAFE', '#FEF3C7', '#FFE4E6'].map((hex) => (
                          <button
                            key={hex}
                            type="button"
                            onClick={() => setFooterColor(hex)}
                            className={`w-5 h-5 rounded border ${
                              footerColor.toLowerCase() === hex.toLowerCase()
                                ? 'border-white scale-110'
                                : 'border-slate-700'
                            }`}
                            style={{ backgroundColor: hex }}
                          />
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Footer Background Color */}
                  <div className="space-y-1.5">
                    <label className="text-[11px] text-slate-400 block">Background Color</label>
                    <div className="flex items-center gap-2">
                      <div className="flex items-center gap-1.5 bg-slate-950 border border-slate-800 rounded-lg p-1 px-2 flex-1">
                        <input
                          type="color"
                          value={
                            footerBgColor.startsWith('#') && footerBgColor.length === 7
                              ? footerBgColor
                              : '#000000'
                          }
                          onChange={(e) => setFooterBgColor(e.target.value)}
                          className="w-5 h-5 rounded border-0 bg-transparent cursor-pointer"
                        />
                        <input
                          type="text"
                          value={footerBgColor}
                          onChange={(e) => setFooterBgColor(e.target.value)}
                          className="w-full bg-transparent text-xs font-mono text-white focus:outline-none"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => setFooterBgColor('transparent')}
                        className="px-2 py-1 rounded bg-slate-900 border border-slate-800 text-[10px] font-mono text-slate-300 hover:text-white"
                      >
                        Clear
                      </button>
                    </div>
                  </div>

                  {/* Footer Text Align */}
                  <div className="space-y-1.5">
                    <label className="text-[11px] text-slate-400 block">Text Alignment</label>
                    <div className="grid grid-cols-4 gap-1">
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
                          className={`py-1.5 px-2 rounded text-[10px] font-medium flex items-center justify-center gap-1 border transition-colors ${
                            footerTextAlign === id
                              ? 'bg-slate-800 border-slate-600 text-white'
                              : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                          }`}
                        >
                          <Icon size={11} />
                          <span>{label}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 3: CLIP TRIMMING & TEST SIMULATOR */}
            {activeRightbarTab === 'simulator' && (
              <div className="space-y-3.5">
                <div className="p-3.5 rounded-xl bg-[#090D16] border border-slate-800 space-y-3">
                  <div>
                    <label className="text-[11px] text-slate-300 font-medium flex items-center justify-between mb-1">
                      <span>YouTube Video URL</span>
                      {demoVideoDuration && (
                        <span className="text-[10px] font-mono text-slate-500">
                          Duration: {formatTime(demoVideoDuration)}
                        </span>
                      )}
                    </label>
                    <input
                      type="text"
                      value={demoVideoUrl}
                      onChange={(e) => setDemoVideoUrl(e.target.value)}
                      placeholder="https://www.youtube.com/watch?v=..."
                      className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-white font-mono text-xs focus:outline-none focus:border-slate-600"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] text-slate-400 flex items-center justify-between mb-1">
                      <span>Preview Donor Name (Header)</span>
                      <span className="text-[10px] font-mono text-slate-500">
                        {demoDonorName.length}/25
                      </span>
                    </label>
                    <input
                      type="text"
                      value={demoDonorName}
                      maxLength={25}
                      onChange={(e) => setDemoDonorName(e.target.value.slice(0, 25))}
                      className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-white text-xs focus:outline-none focus:border-slate-600"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] text-slate-400 flex items-center justify-between mb-1">
                      <span>Preview Message (Footer)</span>
                      <span className="text-[10px] font-mono text-slate-500">
                        {demoDonorMessage.length}/200
                      </span>
                    </label>
                    <input
                      type="text"
                      value={demoDonorMessage}
                      maxLength={200}
                      onChange={(e) => setDemoDonorMessage(e.target.value.slice(0, 200))}
                      className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-white text-xs focus:outline-none focus:border-slate-600"
                    />
                  </div>

                  {activeYtId && (
                    <div className="pt-2 border-t border-slate-800/80 space-y-2">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-slate-300 font-medium">Clip Range Trimmer</span>
                        <span className="font-mono text-slate-400">
                          {demoEndTime - demoStartTime}s / {maxDurationSeconds}s
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

                  <button
                    type="button"
                    disabled={isLocked || isSimulating}
                    onClick={handleTestVideoAlert}
                    className="w-full py-2 px-3 rounded-lg bg-white hover:bg-slate-200 text-slate-950 font-semibold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
                  >
                    <Play size={13} />
                    <span>
                      {isSimulating ? 'Playing Video Clip on OBS...' : 'Trigger Test Video Alert'}
                    </span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </aside>
      </div>

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
          className={`rounded-xl px-4 py-3 transition-all duration-300 flex items-center justify-between gap-3 ${
            isEarthquake
              ? 'bg-red-950 border border-red-500 shadow-2xl'
              : 'bg-[#090D16] border border-slate-700 shadow-2xl'
          }`}
        >
          <div className="min-w-0">
            <div
              className={`text-xs font-semibold truncate ${
                isEarthquake ? 'text-red-200' : 'text-white'
              }`}
            >
              {isEarthquake
                ? 'Unsaved changes — please save or reset first'
                : 'Careful — you have unsaved changes'}
            </div>
            <p
              className={`text-[11px] truncate hidden xs:block ${
                isEarthquake ? 'text-red-300' : 'text-slate-400'
              }`}
            >
              Save to update your live donation page and OBS overlay
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={handleResetChanges}
              disabled={isSaving}
              className="px-3 py-1.5 rounded-lg text-xs font-medium text-slate-300 hover:text-white bg-slate-900 hover:bg-slate-800 border border-slate-800 transition-colors cursor-pointer"
            >
              Reset
            </button>
            <button
              type="button"
              onClick={handleSaveSettings}
              disabled={isSaving}
              className="px-4 py-1.5 rounded-lg text-xs font-semibold bg-white hover:bg-slate-200 text-slate-950 transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
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
    </div>
  );
};
