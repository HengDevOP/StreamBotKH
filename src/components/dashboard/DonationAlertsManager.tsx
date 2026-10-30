'use client';

import React, { useState, useEffect } from 'react';
import {
  Bell,
  Volume2,
  Sparkles,
  Play,
  Copy,
  Check,
  ExternalLink,
  Sliders,
  Plus,
  Trash2,
  Edit2,
  Mic,
  Cpu,
  Monitor,
  CheckCircle2,
  RefreshCw,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { Card } from '../common/Card';
import { Button } from '../common/Button';
import { AlertBox } from '../../types/alert';
import { useAudio } from '../../hooks/useAudio';
import { useSocket } from '../../context/SocketContext';
import { DonationAlertStudio } from './DonationAlertStudio';

interface DonationAlertsManagerProps {
  streamerToken?: string;
  initialSelectedBoxId?: string;
  onSelectBoxId?: (boxId: string | null) => void;
  onNavigateToMedia?: () => void;
  onRegenerateToken?: () => void;
}

export const DonationAlertsManager: React.FC<DonationAlertsManagerProps> = ({
  streamerToken,
  initialSelectedBoxId,
  onSelectBoxId,
  onNavigateToMedia,
  onRegenerateToken
}) => {
  const [alertBoxes, setAlertBoxes] = useState<AlertBox[]>([]);
  const [loading, setLoading] = useState(true);
  const [copiedUrl, setCopiedUrl] = useState(false);
  const [copiedBoxId, setCopiedBoxId] = useState<string | null>(null);
  const [testingId, setTestingId] = useState<string | null>(null);

  // Active target selected for studio management (null = list view)
  const [selectedBoxId, setSelectedBoxId] = useState<string | null>(initialSelectedBoxId || null);

  const { playSound } = useAudio();
  const { socket } = useSocket();

  const obsUrl = `${typeof window !== 'undefined' ? window.location.origin : ''}/overlay/alert/${streamerToken || 'streamer-token'}`;

  const fetchAlertBoxes = async () => {
    try {
      setLoading(true);
      const tokenParam = streamerToken ? `?token=${encodeURIComponent(streamerToken)}` : '';
      const authToken = typeof window !== 'undefined'
        ? (localStorage.getItem('streamneon_auth_token') || localStorage.getItem('streamneon_token'))
        : null;
      const res = await fetch(`/api/alert-boxes${tokenParam}`, {
        headers: authToken ? { Authorization: `Bearer ${authToken}` } : undefined
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setAlertBoxes(data.alertBoxes || []);
      }
    } catch (e) {
      console.error('Error fetching alert boxes:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAlertBoxes();
  }, [streamerToken]);

  // Sync with initialSelectedBoxId or URL search params
  useEffect(() => {
    if (initialSelectedBoxId) {
      setSelectedBoxId(initialSelectedBoxId);
      return;
    }
    if (typeof window !== 'undefined') {
      const search = window.location.search;
      if (search.includes('?id=')) {
        setSelectedBoxId(search.split('?id=')[1]?.split('&')[0] || null);
      } else if (search.includes('&id=')) {
        setSelectedBoxId(search.split('&id=')[1]?.split('&')[0] || null);
      }
    }
  }, [initialSelectedBoxId]);

  // Handle browser back/forward buttons (popstate)
  useEffect(() => {
    const handlePopState = () => {
      const search = window.location.search;
      let targetId: string | null = null;
      if (search.includes('?id=')) {
        targetId = search.split('?id=')[1]?.split('&')[0] || null;
      } else if (search.includes('&id=')) {
        targetId = search.split('&id=')[1]?.split('&')[0] || null;
      }
      setSelectedBoxId(targetId);
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const copyObsUrl = () => {
    navigator.clipboard.writeText(obsUrl);
    setCopiedUrl(true);
    setTimeout(() => setCopiedUrl(false), 2000);
  };

  const copyBoxUrl = (box: AlertBox, e: React.MouseEvent) => {
    e.stopPropagation();
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    const token = streamerToken || 'streamer-token';
    const url = `${origin}/overlay/alert/${token}?boxId=${box._id}`;
    navigator.clipboard.writeText(url);
    setCopiedBoxId(box._id);
    setTimeout(() => setCopiedBoxId(null), 2000);
  };

  // Open Target Alert Box Studio Page
  const handleOpenStudio = (box: AlertBox) => {
    setSelectedBoxId(box._id);
    onSelectBoxId?.(box._id);
    if (typeof window !== 'undefined') {
      window.history.pushState(null, '', `/dashboard?tab=donation&id=${box._id}`);
    }
  };

  // Open Create New Box Studio Page
  const handleCreateNewBox = () => {
    setSelectedBoxId('new');
    onSelectBoxId?.('new');
    if (typeof window !== 'undefined') {
      window.history.pushState(null, '', '/dashboard?tab=donation&id=new');
    }
  };

  // Back to list view
  const handleBackToList = () => {
    setSelectedBoxId(null);
    onSelectBoxId?.(null);
    if (typeof window !== 'undefined') {
      window.history.pushState(null, '', '/dashboard?tab=donation');
    }
  };

  // Save success callback
  const handleSaveSuccess = (savedBox: AlertBox) => {
    setAlertBoxes((prev) => {
      const exists = prev.some((b) => b._id === savedBox._id);
      if (exists) {
        return prev.map((b) => (b._id === savedBox._id ? savedBox : b));
      }
      return [...prev, savedBox];
    });
    setSelectedBoxId(savedBox._id);
    onSelectBoxId?.(savedBox._id);
    if (typeof window !== 'undefined') {
      window.history.pushState(null, '', `/dashboard?tab=donation&id=${savedBox._id}`);
    }
  };

  // Delete success callback
  const handleDeleteSuccess = (deletedBoxId: string) => {
    setAlertBoxes((prev) => prev.filter((b) => b._id !== deletedBoxId));
    setSelectedBoxId(null);
    onSelectBoxId?.(null);
    if (typeof window !== 'undefined') {
      window.history.pushState(null, '', '/dashboard?tab=donation');
    }
  };

  // Quick toggle on/off directly from card list
  const handleToggleBoxStatus = async (box: AlertBox, e: React.MouseEvent) => {
    e.stopPropagation();
    const updatedStatus = !box.isEnabled;
    setAlertBoxes((prev) =>
      prev.map((b) => (b._id === box._id ? { ...b, isEnabled: updatedStatus } : b))
    );

    try {
      await fetch(`/api/alert-boxes/${box._id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isEnabled: updatedStatus })
      });
    } catch (e) {
      console.error('Failed to update toggle:', e);
    }
  };

  // Quick test sound & OBS overlay trigger from card list
  const handleTestAlertBox = (box: AlertBox, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setTestingId(box._id);
    playSound(box.soundUrl, box.soundVolume);

    const effectiveToken = streamerToken || 'demo-token';
    const alertPayload = {
      donationId: 'test-' + Date.now(),
      boxId: String(box._id),
      donorName: 'Neon Supporter 🔥',
      donorMessage: 'Awesome stream! Keep up the insane energy! ⚡',
      amount: box.minAmountCondition || 5.0,
      currency: 'USD',
      textTemplate: box.textTemplate,
      textColor: box.textColor,
      donorColor: box.donorColor,
      amountColor: box.amountColor,
      customGifUrl: box.mediaUrl,
      mediaUrl: box.mediaUrl,
      showImage: box.showImage !== false,
      fontFamily: box.fontFamily || 'Chakra Petch',
      fontSize: box.fontSize || 28,
      glowColor: box.glowColor || '#00F0FF',
      soundUrl: box.soundUrl,
      soundVolume: box.soundVolume,
      durationSeconds: box.durationSeconds || 8,
      ttsEnabled: box.ttsEnabled !== false,
      ttsType: box.ttsType || 'google',
      clonedVoiceSampleUrl: box.clonedVoiceSampleUrl,
      overlayToken: effectiveToken,
      isVideoTest: false,
      videoUrl: undefined,
      isTest: true
    };

    if (socket && socket.connected) {
      socket.emit('trigger:test_alert', alertPayload);
    } else {
      fetch('/api/overlays/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(alertPayload)
      }).catch(() => {});
    }

    setTimeout(() => {
      setTestingId(null);
    }, 3000);
  };

  // ====================================================================
  // VIEW 1: TARGET STUDIO PAGE (WHEN A BOX OR 'NEW' IS SELECTED)
  // ====================================================================
  if (selectedBoxId) {
    if (loading && alertBoxes.length === 0 && selectedBoxId !== 'new') {
      return (
        <div className="flex flex-col items-center justify-center p-16 text-cyan-400 gap-3 min-h-[400px]">
          <div className="w-8 h-8 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin" />
          <span className="text-xs font-mono tracking-wider text-slate-400">LOADING ALERT STUDIO...</span>
        </div>
      );
    }

    const targetBox =
      selectedBoxId === 'new'
        ? null
        : alertBoxes.find((b) => b._id === selectedBoxId || b._id.toString() === selectedBoxId) || null;

    return (
      <DonationAlertStudio
        box={targetBox}
        streamerToken={streamerToken}
        onBack={handleBackToList}
        onSaveSuccess={handleSaveSuccess}
        onDeleteSuccess={handleDeleteSuccess}
        onNavigateToStorage={onNavigateToMedia}
        onRegenerateToken={onRegenerateToken}
      />
    );
  }

  // ====================================================================
  // VIEW 2: DONATION ALERT BOXES GRID (DEFAULT VIEW)
  // ====================================================================
  return (
    <div className="space-y-6">
      {/* Donation Alert Boxes Section Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-lg font-bold text-white font-['Chakra_Petch'] flex items-center gap-2">
            <Bell size={18} className="text-cyan-400" />
            Donation Alert Boxes &amp; Condition Tiers
          </h3>
          <p className="text-xs text-slate-400">
            Click on any donation box to open the full studio with real-time preview, custom font, reaction GIF, and TTS Voice Clone.
          </p>
        </div>
        <Button
          variant="primary"
          size="sm"
          onClick={handleCreateNewBox}
          icon={<Plus size={14} />}
          className="bg-cyan-400 text-slate-950 font-bold text-xs shadow-[0_0_15px_rgba(0,240,255,0.3)]"
        >
          Create Donation Box
        </Button>
      </div>

      {/* Global Universal Overlay Bar */}
      <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 flex-shrink-0">
            <Monitor size={18} />
          </div>
          <div>
            <div className="text-xs font-bold text-white font-['Chakra_Petch'] flex items-center gap-2">
              <span>Universal OBS Overlay URL</span>
              <span className="px-2 py-0.5 rounded-full text-[9px] font-mono font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                ALL TIERS IN ONE
              </span>
            </div>
            <div className="text-[11px] text-slate-400 font-mono truncate max-w-xl">
              Automatically triggers whichever alert box matches the donation condition (&ge; threshold).
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 w-full md:w-auto">
          <div className="flex-1 md:w-64 px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-[11px] font-mono text-slate-400 truncate select-all">
            {obsUrl}
          </div>
          <button
            type="button"
            onClick={copyObsUrl}
            className="px-3 py-1.5 rounded-xl bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/30 text-xs font-mono font-bold text-cyan-300 flex items-center gap-1.5 transition-colors flex-shrink-0"
          >
            {copiedUrl ? <Check size={13} className="text-emerald-400" /> : <Copy size={13} />}
            <span>{copiedUrl ? 'Copied' : 'Copy'}</span>
          </button>
          {onRegenerateToken && (
            <button
              type="button"
              onClick={onRegenerateToken}
              className="px-3 py-1.5 rounded-xl bg-red-950/30 hover:bg-red-900/50 border border-red-500/30 text-xs font-mono font-bold text-red-400 flex items-center gap-1.5 transition-colors flex-shrink-0"
              title="Regenerate Universal OBS Overlay Token"
            >
              <RefreshCw size={13} className="hover:rotate-180 transition-transform duration-500" />
              <span>Regenerate</span>
            </button>
          )}
        </div>
      </div>

      {/* Donation Boxes Card Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {[1, 2, 3].map((n) => (
            <div key={n} className="h-64 rounded-2xl bg-slate-900/60 animate-pulse border border-slate-800" />
          ))}
        </div>
      ) : alertBoxes.length === 0 ? (
        <Card className="p-12 text-center space-y-4 border-dashed border-slate-800">
          <div className="w-16 h-16 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center mx-auto text-cyan-400">
            <Bell size={28} />
          </div>
          <div className="space-y-1">
            <h4 className="text-base font-bold text-white font-['Chakra_Petch']">No Donation Boxes Created</h4>
            <p className="text-xs text-slate-400 max-w-md mx-auto">
              Create your first donation alert box with condition threshold, custom font, and voice model.
            </p>
          </div>
          <Button
            variant="primary"
            size="md"
            onClick={handleCreateNewBox}
            icon={<Plus size={15} />}
            className="bg-cyan-400 text-slate-950 font-bold text-xs"
          >
            Create Standard Box
          </Button>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {alertBoxes.map((box) => {
            const isPlaying = testingId === box._id;
            return (
              <div
                key={box._id}
                onClick={() => handleOpenStudio(box)}
                className={`group p-5 rounded-2xl bg-[#090D18] border transition-all duration-300 hover:border-cyan-500/50 hover:shadow-[0_0_25px_rgba(0,240,255,0.15)] cursor-pointer flex flex-col justify-between space-y-4 relative overflow-hidden ${
                  box.isEnabled ? 'border-slate-800' : 'border-slate-800/40 opacity-60'
                }`}
              >
                {/* Card Top: Name & Condition Badge */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span
                      className="px-2.5 py-0.5 rounded-full text-[11px] font-mono font-extrabold border"
                      style={{
                        backgroundColor: `${box.glowColor}15`,
                        color: box.glowColor,
                        borderColor: `${box.glowColor}40`
                      }}
                    >
                      &ge; ${Number(box.minAmountCondition).toFixed(2)} USD
                    </span>

                    {/* Toggle ON/OFF Switch */}
                    <button
                      type="button"
                      onClick={(e) => handleToggleBoxStatus(box, e)}
                      className="flex items-center gap-1.5 p-1 rounded-lg hover:bg-slate-800 transition-colors"
                      title={box.isEnabled ? 'Click to deactivate' : 'Click to activate'}
                    >
                      <span className={`text-[10px] font-mono font-bold ${box.isEnabled ? 'text-emerald-400' : 'text-slate-500'}`}>
                        {box.isEnabled ? 'ACTIVE' : 'MUTED'}
                      </span>
                      <div
                        className={`w-8 h-4 rounded-full transition-colors relative p-0.5 ${
                          box.isEnabled ? 'bg-cyan-400' : 'bg-slate-700'
                        }`}
                      >
                        <div
                          className={`w-3 h-3 rounded-full bg-slate-950 transition-transform ${
                            box.isEnabled ? 'translate-x-4' : 'translate-x-0'
                          }`}
                        />
                      </div>
                    </button>
                  </div>

                  <h4 className="text-base font-bold text-white font-['Chakra_Petch'] leading-tight group-hover:text-cyan-300 transition-colors">
                    {box.name}
                  </h4>
                </div>

                {/* Card Middle: Thumbnail Preview & Feature Badges */}
                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800/80 flex items-center gap-3">
                  {/* Thumbnail / Mascot */}
                  <div className="w-14 h-14 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-center overflow-hidden flex-shrink-0">
                    {box.showImage && box.mediaUrl ? (
                      <img
                        src={box.mediaUrl}
                        alt="Alert mascot"
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                      />
                    ) : (
                      <Bell size={20} className="text-slate-600" />
                    )}
                  </div>

                  <div className="flex-1 min-w-0 space-y-1">
                    <div className="text-xs font-mono text-slate-300 font-bold truncate" style={{ fontFamily: box.fontFamily }}>
                      Font: {box.fontFamily}
                    </div>
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="px-1.5 py-0.5 rounded bg-slate-900 border border-slate-800 text-[10px] font-mono text-slate-400">
                        {box.durationSeconds}s
                      </span>
                      {box.ttsEnabled ? (
                        <span className="px-1.5 py-0.5 rounded bg-cyan-950/40 border border-cyan-500/30 text-[10px] font-mono text-cyan-300 flex items-center gap-1">
                          <Mic size={10} />
                          <span>
                            TTS{' '}
                            {box.ttsType === 'cloned'
                              ? 'AI Clone'
                              : box.ttsType === 'google-male'
                              ? 'Google Male'
                              : box.ttsType === 'google'
                              ? 'Google Female'
                              : box.ttsType === 'kiritts-male'
                              ? 'KiriTTS Male'
                              : box.ttsType === 'kiritts-female'
                              ? 'KiriTTS Female'
                              : box.ttsType}
                          </span>
                        </span>
                      ) : (
                        <span className="px-1.5 py-0.5 rounded bg-slate-900 text-[10px] font-mono text-slate-500">
                          TTS OFF
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Dedicated OBS Browser Source URL for this Box */}
                {(() => {
                  const origin = typeof window !== 'undefined' ? window.location.origin : '';
                  const token = streamerToken || 'streamer-token';
                  const boxUrl = `${origin}/overlay/${token}?boxId=${box._id}`;
                  const isCopied = copiedBoxId === box._id;

                  return (
                    <div
                      onClick={(e) => e.stopPropagation()}
                      className="p-2.5 rounded-xl bg-slate-950/90 border border-slate-800/80 flex items-center justify-between gap-2"
                    >
                      <div className="flex items-center gap-1.5 min-w-0 flex-1">
                        <Monitor size={12} className="text-cyan-400 flex-shrink-0" />
                        <span className="text-[10px] font-mono text-slate-400 truncate select-all" title={boxUrl}>
                          {boxUrl}
                        </span>
                      </div>
                      <div className="flex items-center gap-1 flex-shrink-0">
                        <button
                          type="button"
                          onClick={(e) => copyBoxUrl(box, e)}
                          title="Copy Dedicated OBS Browser Source URL"
                          className="px-2 py-1 rounded-lg bg-slate-900 hover:bg-cyan-950/60 text-slate-300 hover:text-cyan-300 border border-slate-800 hover:border-cyan-500/40 transition-colors flex items-center gap-1 text-[10px] font-mono font-bold"
                        >
                          {isCopied ? (
                            <>
                              <Check size={11} className="text-emerald-400" />
                              <span className="text-emerald-400">Copied</span>
                            </>
                          ) : (
                            <>
                              <Copy size={11} />
                              <span>Copy URL</span>
                            </>
                          )}
                        </button>
                        <a
                          href={boxUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          title="Open dedicated overlay in new tab"
                          className="p-1 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white border border-slate-800 transition-colors"
                        >
                          <ExternalLink size={11} />
                        </a>
                      </div>
                    </div>
                  );
                })()}

                {/* Card Bottom: Test and Edit Buttons */}
                <div className="flex items-center justify-between pt-2 border-t border-slate-800/60">
                  <button
                    type="button"
                    onClick={(e) => handleTestAlertBox(box, e)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-cyan-950/50 border border-slate-800 hover:border-cyan-500/40 text-xs font-mono text-cyan-300 transition-colors"
                  >
                    <Play size={12} className={isPlaying ? 'text-cyan-400 animate-spin fill-cyan-400' : 'text-cyan-400 fill-cyan-400'} />
                    <span>{isPlaying ? 'Playing...' : 'Test Sound'}</span>
                  </button>

                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => handleOpenStudio(box)}
                      className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/30 text-xs font-mono text-cyan-300 font-bold transition-colors"
                    >
                      <Edit2 size={12} />
                      <span>Manage Studio</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
