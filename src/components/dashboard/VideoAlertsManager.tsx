'use client';

import React, { useState, useEffect } from 'react';
import {
  Video,
  Copy,
  Check,
  ExternalLink,
  Sparkles,
  Play,
  Sliders,
  Monitor,
  ShieldCheck,
  Volume2,
  Clock,
  Lock,
  ArrowRight,
  Tv,
  DollarSign,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { Card } from '../common/Card';
import { Button } from '../common/Button';
import { useSocket } from '../../context/SocketContext';
import {
  VideoPlayerWithProgressBar,
  formatTime
} from '../common/VideoPlayerWithProgressBar';
import { VideoClipScrubberLine } from '../donate/VideoClipScrubberLine';

interface VideoAlertsManagerProps {
  streamerToken?: string;
  isLocked?: boolean;
  currentPlan?: 'free' | 'pro' | string;
  onUpgrade?: () => void;
}

export const VideoAlertsManager: React.FC<VideoAlertsManagerProps> = ({
  streamerToken,
  isLocked = false,
  currentPlan = 'free',
  onUpgrade
}) => {
  const { socket } = useSocket();
  const [copiedUrl, setCopiedUrl] = useState(false);

  // Video Alert Configuration State (Disabled by default until enabled by streamer)
  const [isEnabled, setIsEnabled] = useState(false);
  const [minTipAmount, setMinTipAmount] = useState<number>(2.0); // Allowed: $0.25 to $50
  const [maxDurationSeconds, setMaxDurationSeconds] = useState<number>(30); // Allowed: up to 300s (5m)
  const [videoVolume, setVideoVolume] = useState<number>(85);
  const [autoDucking, setAutoDucking] = useState(true);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Live Test Simulation State
  const [demoVideoUrl, setDemoVideoUrl] = useState('https://www.youtube.com/watch?v=HSsGnEOFY6U&list=RDHSsGnEOFY6U&start_radio=1');
  const [demoVideoDuration, setDemoVideoDuration] = useState<number | undefined>(66);
  const [demoStartTime, setDemoStartTime] = useState(0);
  const [demoEndTime, setDemoEndTime] = useState(30);
  const [demoDonorName, setDemoDonorName] = useState('CyberValkyrie');
  const [demoAmount, setDemoAmount] = useState(5.0);
  const [demoDonorMessage, setDemoDonorMessage] = useState('Check out this legendary hype moment! 🔥');
  const [isSimulating, setIsSimulating] = useState(false);

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
            // If video duration is less than the preset, default to full duration!
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
  const obsUrl = `${typeof window !== 'undefined' ? window.location.origin : ''}/overlay/video/${effectiveToken}`;

  // 1. Fetch saved video settings from database
  useEffect(() => {
    fetch(`/api/streamer/settings/video?token=${effectiveToken}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.success && data.settings) {
          const s = data.settings;
          setIsEnabled(s.isEnabled ?? false);
          setMinTipAmount(Number(s.minTipAmount ?? 2.0));
          setMaxDurationSeconds(Number(s.maxDurationSeconds ?? 30));
          setVideoVolume(Number(s.videoVolume ?? 85));
          setAutoDucking(s.autoDucking ?? true);
        }
      })
      .catch((e) => console.error('Error fetching video settings:', e));
  }, [effectiveToken]);

  const copyObsUrl = () => {
    navigator.clipboard.writeText(obsUrl);
    setCopiedUrl(true);
    setTimeout(() => setCopiedUrl(false), 2000);
  };

  const extractYouTubeId = (url: string) => {
    const match = url.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=|shorts\/))([\w-]{11})/);
    return match ? match[1] : null;
  };

  const activeYtId = extractYouTubeId(demoVideoUrl);

  const handleTestVideoAlert = () => {
    setIsSimulating(true);

    const testPayload = {
      donationId: `test-video-${Date.now()}`,
      donorName: demoDonorName,
      donorMessage: demoDonorMessage,
      amount: demoAmount,
      currency: 'USD',
      bankingName: 'ABA Bank',
      videoUrl: demoVideoUrl,
      videoTitle: 'បទនគររាជ Nokoraja Part 1 (Live Media Share)',
      videoStartTime: demoStartTime,
      videoEndTime: demoEndTime,
      soundVolume: videoVolume / 100,
      videoAlertEnabled: true,
      videoMinTipAmount: 0,
      videoMaxDurationSeconds: maxDurationSeconds,
      durationSeconds: 0, // Instant play for test video without awaiting donation alert
      isVideoTest: true,
      directVideo: true,
      isTest: true,
      overlayToken: effectiveToken
    };

    if (socket && socket.connected) {
      socket.emit('trigger:test_alert', testPayload);
    } else {
      fetch('/api/overlays/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(testPayload)
      }).catch((e) => console.error('Error broadcasting video test alert:', e));
    }

    const totalTestDuration = Math.max(5, (demoEndTime - demoStartTime)) + 2;
    setTimeout(() => {
      setIsSimulating(false);
    }, totalTestDuration * 1000);
  };

  const handleSaveSettings = async () => {
    setIsSaving(true);
    try {
      const res = await fetch('/api/streamer/settings/video', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token: effectiveToken,
          isEnabled,
          minTipAmount,
          maxDurationSeconds,
          videoVolume,
          autoDucking
        })
      });
      const data = await res.json();
      if (data.success) {
        setSavedSuccess(true);
        setTimeout(() => setSavedSuccess(false), 2500);
      }
    } catch (e) {
      console.error('Error saving video alert settings:', e);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* ============================================================== */}
      {/* OBS BROWSER SOURCE URL BAR                                     */}
      {/* ============================================================== */}
      <div className="p-4 rounded-2xl bg-[#090D18] border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <Monitor size={16} className="text-cyan-400 flex-shrink-0" />
          <span className="text-xs font-mono font-bold text-slate-300 flex-shrink-0">OBS Video Overlay URL:</span>
          <span className="text-[11px] font-mono text-slate-400 truncate select-all" title={obsUrl}>
            {obsUrl}
          </span>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <button
            type="button"
            onClick={copyObsUrl}
            className="px-3 py-1.5 rounded-xl bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/30 text-xs font-mono font-bold text-cyan-300 flex items-center gap-1.5 transition-colors"
          >
            {copiedUrl ? <Check size={13} className="text-emerald-400" /> : <Copy size={13} />}
            <span>{copiedUrl ? 'Copied' : 'Copy URL'}</span>
          </button>
          <a
            href={obsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="p-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white border border-slate-800 transition-colors"
            title="Open in new tab"
          >
            <ExternalLink size={13} />
          </a>
        </div>
      </div>

      {/* ============================================================== */}
      {/* FREE PLAN: LOCKED CALLOUT & UPGRADE BANNER                    */}
      {/* ============================================================== */}
      {isLocked && (
        <div className="p-6 sm:p-8 rounded-2xl bg-gradient-to-br from-amber-950/30 via-slate-900/80 to-slate-950 border border-amber-500/30 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-96 h-96 bg-amber-500/5 rounded-full blur-3xl pointer-events-none" />

          <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            <div className="space-y-3 max-w-2xl">
              <div className="flex items-center gap-2">
                <span className="p-2 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/40">
                  <Lock size={20} />
                </span>
                <span className="text-xs font-mono text-amber-400 font-bold uppercase tracking-wider">
                  Premium Streamer Feature
                </span>
              </div>
              <h3 className="text-xl sm:text-2xl font-bold text-white font-['Chakra_Petch']">
                Unlock YouTube Video Alerts on Stream
              </h3>
              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                Video Alerts allows fans to share high-energy YouTube clips, music videos, and meme reactions directly onto your live broadcast screen when they donate. Upgrade to any paid plan to enable Media Share with full moderation and timestamp trimming controls.
              </p>
            </div>

            {/* Upgrade CTA Button */}
            <div className="flex-shrink-0 flex flex-col items-start lg:items-end gap-2">
              <Button
                variant="primary"
                size="lg"
                onClick={onUpgrade || (() => window.open('https://t.me/hchenheng', '_blank', 'noopener,noreferrer'))}
                className="w-full sm:w-auto bg-gradient-to-r from-amber-500 to-yellow-400 hover:from-amber-600 hover:to-yellow-500 text-slate-950 font-extrabold shadow-lg shadow-amber-500/20 flex items-center justify-center gap-2"
              >
                <Sparkles size={16} />
                <span>Upgrade Plan</span>
                <ArrowRight size={16} />
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* VIDEO ALERTS SETTINGS & SIMULATION                            */}
      {/* ============================================================== */}
      <div className={`grid grid-cols-1 lg:grid-cols-12 gap-6 ${isLocked ? 'opacity-70 pointer-events-none' : ''}`}>
        {/* Left Column: Rules & Moderation Settings */}
        <div className="lg:col-span-6 space-y-6">
          <Card className="p-5 sm:p-6 bg-[#090D18] border-slate-800 space-y-5">
            {/* 1. ENABLE / DISABLE TOGGLE FOR VIDEO ALERTS */}
            <div className="flex items-center justify-between border-b border-slate-800/80 pb-4">
              <div className="space-y-0.5">
                <h3 className="text-sm font-bold text-white font-['Chakra_Petch'] uppercase tracking-wider flex items-center gap-2">
                  <Sliders size={16} className="text-cyan-400" />
                  Video Alert (Media Share) Status
                </h3>
                <p className="text-[11px] text-slate-400">
                  {isEnabled
                    ? 'Enabled: Video URL input is visible on your donation page'
                    : 'Disabled: Video feature is hidden from your donation page'}
                </p>
              </div>

              <label className="relative inline-flex items-center cursor-pointer">
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

            <div className="space-y-5 text-xs font-mono">
              {/* 2. MINIMUM TIP CONDITION ($0.25 to $50) */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-slate-300 font-semibold flex items-center gap-1.5">
                    <DollarSign size={14} className="text-cyan-400" />
                    <span>Minimum Tip to Trigger Video ($0.25 to $50)</span>
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
                  disabled={isLocked || !isEnabled}
                  className="w-full accent-cyan-400"
                />

                {/* Quick Presets ($0.25 to $50) */}
                <div className="grid grid-cols-4 sm:grid-cols-7 gap-1.5">
                  {[0.25, 0.5, 1.0, 2.0, 5.0, 10.0, 50.0].map((amt) => (
                    <button
                      key={amt}
                      type="button"
                      disabled={isLocked || !isEnabled}
                      onClick={() => setMinTipAmount(amt)}
                      className={`py-1.5 px-2 rounded-lg text-center font-bold text-[10px] border transition-colors ${
                        minTipAmount === amt
                          ? 'bg-cyan-500/20 border-cyan-400 text-cyan-300 shadow-[0_0_8px_rgba(6,182,212,0.3)]'
                          : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                      }`}
                    >
                      ${amt.toFixed(amt < 1 ? 2 : 0)}
                    </button>
                  ))}
                </div>

                <span className="text-[10px] text-slate-500 block">
                  Donations under ${minTipAmount.toFixed(2)} will trigger standard mascot/text alerts without video.
                </span>
              </div>

              {/* 3. MAXIMUM VIDEO CLIP DURATION (UP TO 5 MINUTES / 300 SECONDS) */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-slate-300 font-semibold flex items-center gap-1.5">
                    <Clock size={14} className="text-amber-400" />
                    <span>Max Allowed Clip Length (Up to 5 Mins)</span>
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
                  disabled={isLocked || !isEnabled}
                  className="w-full accent-amber-400"
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
                      disabled={isLocked || !isEnabled}
                      onClick={() => setMaxDurationSeconds(p.sec)}
                      className={`py-1.5 px-2 rounded-lg text-center font-bold text-[10px] border transition-colors ${
                        maxDurationSeconds === p.sec
                          ? 'bg-amber-500/20 border-amber-400 text-amber-300 shadow-[0_0_8px_rgba(245,158,11,0.3)]'
                          : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                      }`}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
                <span className="text-[10px] text-slate-500 block">
                  Allows viewers to share clips up to 5 minutes (300 seconds) on stream.
                </span>
              </div>

              {/* 4. VIDEO PLAYER VOLUME */}
              <div>
                <label className="text-slate-300 font-semibold block mb-1.5 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <Volume2 size={14} className="text-cyan-400" />
                    Video Player Volume
                  </span>
                  <span className="text-cyan-400 font-bold">{videoVolume}%</span>
                </label>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={videoVolume}
                  onChange={(e) => setVideoVolume(Number(e.target.value))}
                  disabled={isLocked || !isEnabled}
                  className="w-full accent-cyan-400"
                />
              </div>

              {/* 5. AUTO DUCKING TOGGLE */}
              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-950 border border-slate-800">
                <div>
                  <span className="text-slate-200 font-semibold block">Automatic Audio Ducking</span>
                  <span className="text-[10px] text-slate-400">Lowers background stream audio while media share plays</span>
                </div>
                <input
                  type="checkbox"
                  checked={autoDucking}
                  onChange={(e) => setAutoDucking(e.target.checked)}
                  disabled={isLocked || !isEnabled}
                  className="w-4 h-4 accent-cyan-400 rounded"
                />
              </div>
            </div>

            <Button
              variant="primary"
              size="md"
              disabled={isLocked || isSaving}
              onClick={handleSaveSettings}
              className="w-full font-bold bg-cyan-400 hover:bg-cyan-300 text-slate-950"
            >
              {savedSuccess ? 'Settings Saved & Broadcasted to OBS!' : isSaving ? 'Saving...' : 'Save Video Alert Rules'}
            </Button>
          </Card>
        </div>

        {/* Right Column: Live Video Simulator & Progress Bar Preview */}
        <div className="lg:col-span-6 space-y-6">
          <Card className="p-5 sm:p-6 bg-[#090D18] border-slate-800 space-y-5">
            <div className="flex items-center justify-between border-b border-slate-800/80 pb-4">
              <h3 className="text-sm font-bold text-white font-['Chakra_Petch'] uppercase tracking-wider flex items-center gap-2">
                <Play size={16} className="text-cyan-400" />
                Live Video Alert & Progress Bar Simulator
              </h3>
              <span className="text-[10px] font-mono text-cyan-400 font-bold">
                BROADCAST TEST TO OBS
              </span>
            </div>

            <div className="space-y-4 text-xs font-mono">
              <div>
                <label className="text-slate-300 font-semibold block mb-1.5">YouTube Video URL</label>
                <input
                  type="text"
                  value={demoVideoUrl}
                  onChange={(e) => setDemoVideoUrl(e.target.value)}
                  disabled={isLocked}
                  placeholder="https://www.youtube.com/watch?v=..."
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-cyan-400 focus:outline-none focus:border-cyan-400 font-mono text-xs"
                />
              </div>

              {/* Video Player With Custom Progress Duration Bar at Bottom */}
              {activeYtId ? (
                <div className="space-y-3">
                  <VideoPlayerWithProgressBar
                    videoId={activeYtId}
                    startTime={demoStartTime}
                    endTime={demoEndTime}
                    autoplay={true}
                    muted={false}
                    videoTitle="បទនគររាជ Nokoraja Part 1 (Live Media Share)"
                    donorName={demoDonorName}
                    amount={demoAmount}
                    currency="USD"
                    isPreview={true}
                  />

                  {/* Custom clip duration scrubber line */}
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
              ) : (
                <div className="w-full aspect-video rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-center text-slate-500">
                  <span>Enter a valid YouTube URL to preview</span>
                </div>
              )}

              {/* 2-Stage Sequence Explanation Note */}
              <div className="p-3 rounded-xl bg-cyan-950/20 border border-cyan-500/30 text-[11px] text-slate-300 space-y-1">
                <span className="font-bold text-cyan-300 flex items-center gap-1.5">
                  <Sparkles size={13} className="text-cyan-400" />
                  <span>Media Share Playback Modes:</span>
                </span>
                <p className="text-slate-400 leading-relaxed">
                  • <strong>Live Donation:</strong> Plays sequentially (Stage 1 Donation Card ➔ Stage 2 Video Clip with progress countdown bar).<br />
                  • <strong>Test Video:</strong> Plays video clip instantly on OBS screen without awaiting donation alert requirements.
                </p>
              </div>

              <Button
                variant="secondary"
                size="md"
                disabled={isLocked || isSimulating}
                onClick={handleTestVideoAlert}
                className="w-full font-bold flex items-center justify-center gap-2 border-cyan-500/40 text-cyan-300 hover:bg-cyan-500/10"
              >
                <Play size={14} className="fill-cyan-400" />
                <span>
                  {isSimulating
                    ? 'Playing Video Clip on OBS Screen...'
                    : 'Trigger Test Video Alert (Instant Play)'}
                </span>
              </Button>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};
