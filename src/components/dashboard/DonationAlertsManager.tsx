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
}

export const DonationAlertsManager: React.FC<DonationAlertsManagerProps> = ({
  streamerToken,
  initialSelectedBoxId,
  onSelectBoxId,
  onNavigateToMedia
}) => {
  const [alertBoxes, setAlertBoxes] = useState<AlertBox[]>([]);
  const [loading, setLoading] = useState(true);
  const [copiedUrl, setCopiedUrl] = useState(false);
  const [testingId, setTestingId] = useState<string | null>(null);

  // Active target selected for studio management (null = list view)
  const [selectedBoxId, setSelectedBoxId] = useState<string | null>(initialSelectedBoxId || null);

  const { playSound } = useAudio();
  const { socket } = useSocket();

  const obsUrl = `${typeof window !== 'undefined' ? window.location.origin : ''}/overlay/${streamerToken || 'streamer-token'}`;

  const fetchAlertBoxes = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/alert-boxes');
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
  }, []);

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

  // Toggle Target Alert Box Accordion Inline
  const handleOpenStudio = (box: AlertBox) => {
    const nextId = selectedBoxId === box._id ? null : box._id;
    setSelectedBoxId(nextId);
    onSelectBoxId?.(nextId);
    if (typeof window !== 'undefined') {
      window.history.pushState(
        null,
        '',
        nextId ? `/dashboard?tab=donation&id=${nextId}` : '/dashboard?tab=donation'
      );
    }
  };

  // Toggle Create New Box Accordion Inline
  const handleCreateNewBox = () => {
    const nextId = selectedBoxId === 'new' ? null : 'new';
    setSelectedBoxId(nextId);
    onSelectBoxId?.(nextId);
    if (typeof window !== 'undefined') {
      window.history.pushState(
        null,
        '',
        nextId ? '/dashboard?tab=donation&id=new' : '/dashboard?tab=donation'
      );
    }
  };

  // Collapse inline studio view
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
      donorName: 'Neon Supporter 🔥',
      donorMessage: 'Awesome stream! Keep up the insane energy! ⚡',
      amount: box.minAmountCondition || 5.0,
      currency: 'USD',
      textTemplate: box.textTemplate,
      textColor: box.textColor,
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
  // DONATION ALERT CATEGORIES & TIERS ACCORDION LIST VIEW
  // ====================================================================
  return (
    <div className="space-y-6">
      {/* OBS Browser Source URL Card */}
      <Card className="p-5 sm:p-6 bg-[#090D18] border border-cyan-500/20 shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
              <h3 className="text-sm font-bold text-white font-['Chakra_Petch'] uppercase tracking-wider">
                OBS Studio Browser Source URL
              </h3>
            </div>
            <p className="text-xs text-slate-400">
              Paste this URL into OBS Studio as a Browser Source. It automatically matches incoming tips to your condition alert categories.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={copyObsUrl}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-cyan-400 hover:bg-cyan-300 text-slate-950 font-bold text-xs transition-all shadow-[0_0_15px_rgba(0,240,255,0.25)]"
            >
              {copiedUrl ? <Check size={14} /> : <Copy size={14} />}
              <span>{copiedUrl ? 'Copied URL!' : 'Copy OBS URL'}</span>
            </button>
            <a
              href={obsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="p-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-white transition-colors"
              title="Open OBS overlay page"
            >
              <ExternalLink size={15} />
            </a>
          </div>
        </div>

        <input
          type="text"
          readOnly
          value={obsUrl}
          className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-300 font-mono text-xs select-all focus:outline-none"
        />
      </Card>

      {/* Donation Alert Categories Section Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-lg font-bold text-white font-['Chakra_Petch'] flex items-center gap-2">
            <Bell size={18} className="text-cyan-400" />
            Donation Categories &amp; Condition Tiers
          </h3>
          <p className="text-xs text-slate-400">
            Click on any donation category in the list below to expand its configuration content and live preview inline.
          </p>
        </div>
        <Button
          variant="primary"
          size="sm"
          onClick={handleCreateNewBox}
          icon={selectedBoxId === 'new' ? <ChevronUp size={14} /> : <Plus size={14} />}
          className="bg-cyan-400 text-slate-950 font-bold text-xs shadow-[0_0_15px_rgba(0,240,255,0.3)]"
        >
          {selectedBoxId === 'new' ? 'Close New Box Editor' : 'Create Donation Category'}
        </Button>
      </div>

      {/* Expandable Inline Create New Box Accordion */}
      {selectedBoxId === 'new' && (
        <div className="animate-fadeIn">
          <DonationAlertStudio
            box={null}
            streamerToken={streamerToken}
            onBack={handleBackToList}
            onSaveSuccess={handleSaveSuccess}
            onDeleteSuccess={handleDeleteSuccess}
            onNavigateToStorage={onNavigateToMedia}
            inlineMode={true}
          />
        </div>
      )}

      {/* Donation Categories Vertical Expandable List */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((n) => (
            <div key={n} className="h-20 rounded-2xl bg-slate-900/60 animate-pulse border border-slate-800" />
          ))}
        </div>
      ) : alertBoxes.length === 0 && selectedBoxId !== 'new' ? (
        <Card className="p-12 text-center space-y-4 border-dashed border-slate-800">
          <div className="w-16 h-16 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center mx-auto text-cyan-400">
            <Bell size={28} />
          </div>
          <div className="space-y-1">
            <h4 className="text-base font-bold text-white font-['Chakra_Petch']">No Donation Categories Created</h4>
            <p className="text-xs text-slate-400 max-w-md mx-auto">
              Create your first donation alert category with condition threshold, custom font, and voice model.
            </p>
          </div>
          <Button
            variant="primary"
            size="md"
            onClick={handleCreateNewBox}
            icon={<Plus size={15} />}
            className="bg-cyan-400 text-slate-950 font-bold text-xs"
          >
            Create Standard Category
          </Button>
        </Card>
      ) : (
        <div className="space-y-3">
          {alertBoxes.map((box) => {
            const isPlaying = testingId === box._id;
            const isExpanded = selectedBoxId === box._id || selectedBoxId === box._id?.toString();

            return (
              <div
                key={box._id}
                className={`rounded-2xl bg-[#090D18] border transition-all duration-300 overflow-hidden ${
                  isExpanded
                    ? 'border-cyan-500/60 shadow-[0_0_30px_rgba(0,240,255,0.18)]'
                    : box.isEnabled
                    ? 'border-slate-800 hover:border-cyan-500/40'
                    : 'border-slate-800/40 opacity-65 hover:opacity-100'
                }`}
              >
                {/* List Item Header Row (Click to Expand / Collapse) */}
                <div
                  onClick={() => handleOpenStudio(box)}
                  className="p-4 sm:px-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 cursor-pointer select-none hover:bg-white/[0.02] transition-colors"
                >
                  {/* Left: Mascot Thumbnail + Name + Condition Tier & Tags */}
                  <div className="flex items-center gap-3.5 min-w-0">
                    <div
                      className="w-12 h-12 rounded-xl bg-slate-950 border-2 flex items-center justify-center overflow-hidden flex-shrink-0"
                      style={{ borderColor: `${box.glowColor || '#00F0FF'}60` }}
                    >
                      {box.showImage && box.mediaUrl ? (
                        <img
                          src={box.mediaUrl}
                          alt="Alert mascot"
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <Bell size={18} className="text-slate-500" />
                      )}
                    </div>

                    <div className="min-w-0 space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h4 className="text-sm sm:text-base font-bold text-white font-['Chakra_Petch'] truncate">
                          {box.name}
                        </h4>
                        <span
                          className="px-2.5 py-0.5 rounded-full text-[11px] font-mono font-extrabold border flex-shrink-0"
                          style={{
                            backgroundColor: `${box.glowColor || '#00F0FF'}15`,
                            color: box.glowColor || '#00F0FF',
                            borderColor: `${box.glowColor || '#00F0FF'}40`
                          }}
                        >
                          &ge; ${Number(box.minAmountCondition).toFixed(2)} USD
                        </span>
                      </div>

                      <div className="flex flex-wrap items-center gap-2 text-[11px] font-mono text-slate-400">
                        <span style={{ fontFamily: box.fontFamily }} className="text-slate-300 font-semibold">
                          Font: {box.fontFamily}
                        </span>
                        <span className="text-slate-700">•</span>
                        <span>{box.durationSeconds}s</span>
                        <span className="text-slate-700">•</span>
                        {box.ttsEnabled ? (
                          <span className="text-cyan-400 flex items-center gap-1">
                            <Mic size={11} />
                            <span>TTS ({box.ttsType === 'cloned' ? 'AI Clone' : box.ttsType})</span>
                          </span>
                        ) : (
                          <span className="text-slate-500">TTS Off</span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Right: Quick Test, Active Switch & Expand/Collapse Toggle */}
                  <div className="flex items-center justify-between sm:justify-end gap-2.5 flex-shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-800/60">
                    {/* Quick Test Sound */}
                    <button
                      type="button"
                      onClick={(e) => handleTestAlertBox(box, e)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-cyan-950/50 border border-slate-800 hover:border-cyan-500/40 text-xs font-mono text-cyan-300 transition-colors"
                    >
                      <Play size={12} className={isPlaying ? 'text-cyan-400 animate-spin fill-cyan-400' : 'text-cyan-400 fill-cyan-400'} />
                      <span>{isPlaying ? 'Playing...' : 'Test Alert'}</span>
                    </button>

                    {/* Active / Muted Switch */}
                    <button
                      type="button"
                      onClick={(e) => handleToggleBoxStatus(box, e)}
                      className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 transition-colors"
                      title={box.isEnabled ? 'Click to mute category' : 'Click to activate category'}
                    >
                      <span className={`text-[10px] font-mono font-bold ${box.isEnabled ? 'text-emerald-400' : 'text-slate-500'}`}>
                        {box.isEnabled ? 'ACTIVE' : 'MUTED'}
                      </span>
                      <div
                        className={`w-7 h-4 rounded-full transition-colors relative p-0.5 ${
                          box.isEnabled ? 'bg-cyan-400' : 'bg-slate-700'
                        }`}
                      >
                        <div
                          className={`w-3 h-3 rounded-full bg-slate-950 transition-transform ${
                            box.isEnabled ? 'translate-x-3' : 'translate-x-0'
                          }`}
                        />
                      </div>
                    </button>

                    {/* Expand / Collapse Pill */}
                    <div
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-mono font-bold transition-colors ${
                        isExpanded
                          ? 'bg-cyan-400 text-slate-950 border-cyan-400'
                          : 'bg-cyan-500/10 text-cyan-300 border-cyan-500/30 hover:bg-cyan-500/20'
                      }`}
                    >
                      <span>{isExpanded ? 'Collapse' : 'Expand'}</span>
                      <ChevronDown
                        size={14}
                        className={`transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}
                      />
                    </div>
                  </div>
                </div>

                {/* Expanded Inline Studio Content */}
                {isExpanded && (
                  <div className="border-t border-slate-800/80 p-3 sm:p-4 bg-[#060911] animate-fadeIn">
                    <DonationAlertStudio
                      box={box}
                      streamerToken={streamerToken}
                      onBack={handleBackToList}
                      onSaveSuccess={handleSaveSuccess}
                      onDeleteSuccess={handleDeleteSuccess}
                      onNavigateToStorage={onNavigateToMedia}
                      inlineMode={true}
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
