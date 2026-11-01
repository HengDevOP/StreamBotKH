'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  Bell,
  Play,
  Copy,
  Check,
  ExternalLink,
  Plus,
  Edit2,
  Trash2,
  Mic,
  Monitor,
  X
} from 'lucide-react';
import { Card } from '../common/Card';
import { Button } from '../common/Button';
import { AlertBox } from '../../types/alert';
import { useAudio } from '../../hooks/useAudio';
import { useSocket } from '../../context/SocketContext';
import { useModal } from '../../context/ModalContext';
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
  const [copiedBoxId, setCopiedBoxId] = useState<string | null>(null);
  const [testingId, setTestingId] = useState<string | null>(null);

  // Create Donation Box Modal State
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newBoxName, setNewBoxName] = useState('');
  const [createError, setCreateError] = useState<string | null>(null);
  const [isCreatingBox, setIsCreatingBox] = useState(false);
  const createInputRef = useRef<HTMLInputElement | null>(null);

  // Active target selected for studio management (null = list view)
  const [selectedBoxId, setSelectedBoxId] = useState<string | null>(initialSelectedBoxId || null);

  const { playSound } = useAudio();
  const { socket } = useSocket();
  const { showConfirm } = useModal();

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

  // Open Create New Box Pop-up Modal
  const handleCreateNewBox = () => {
    setNewBoxName('');
    setCreateError(null);
    setIsCreateModalOpen(true);
  };

  useEffect(() => {
    if (!isCreateModalOpen) return;
    const focusTimer = window.setTimeout(() => {
      createInputRef.current?.focus();
    }, 30);
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isCreatingBox) {
        setIsCreateModalOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.clearTimeout(focusTimer);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isCreateModalOpen, isCreatingBox]);

  const handleSubmitCreateBox = async (e?: React.FormEvent) => {
    e?.preventDefault();
    const trimmed = newBoxName.trim().slice(0, 16);
    if (!trimmed) {
      setCreateError('Please enter a donation box name.');
      createInputRef.current?.focus();
      return;
    }

    setIsCreatingBox(true);
    setCreateError(null);

    try {
      const authToken = typeof window !== 'undefined'
        ? (localStorage.getItem('streamneon_auth_token') || localStorage.getItem('streamneon_token'))
        : null;
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (authToken) {
        headers.Authorization = `Bearer ${authToken}`;
      }

      const res = await fetch('/api/alert-boxes', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          name: trimmed,
          minAmountCondition: 0.01,
          isEnabled: true,
          templateStyle: 'neon-box',
          showImage: true,
          mediaUrl: 'https://media.giphy.com/media/l41lT4n6ylgW2hh04/giphy.gif',
          layoutMode: 'top',
          soundUrl: '/sounds/cash-register-kaching.mp3',
          soundVolume: 0.85,
          durationSeconds: 8,
          glowColor: '#00F0FF',
          fontFamily: 'Kh Ang Bokor',
          fontSize: 28,
          textColor: '#FFFFFF',
          donorColor: 'linear-gradient(135deg, #00F0FF 0%, #7000FF 100%)',
          amountColor: 'linear-gradient(135deg, #FFE600 0%, #FF5E00 100%)',
          textTemplate: '{donator} donated {amount} through superchat!',
          animationStyle: 'fade',
          ttsEnabled: true,
          ttsMinAmount: 0.01,
          ttsType: 'google',
          token: streamerToken
        })
      });

      const data = await res.json();
      if (res.ok && data.success && data.alertBox) {
        setAlertBoxes((prev) => [...prev, data.alertBox]);
        setIsCreateModalOpen(false);
        setNewBoxName('');
      } else {
        setCreateError(data.error || 'Failed to create donation box.');
      }
    } catch (err) {
      console.error('Error creating donation box:', err);
      setCreateError('Network error while creating donation box.');
    } finally {
      setIsCreatingBox(false);
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

  // Delete box directly from the main card grid
  const handleDeleteBoxCard = (box: AlertBox, e: React.MouseEvent) => {
    e.stopPropagation();
    showConfirm({
      title: 'Delete Donation Box?',
      message: `Are you sure you want to delete "${box.name}"? This action cannot be undone.`,
      type: 'danger',
      confirmText: 'Delete Box',
      onConfirm: async () => {
        try {
          const authToken = typeof window !== 'undefined'
            ? (localStorage.getItem('streamneon_auth_token') || localStorage.getItem('streamneon_token'))
            : null;
          const res = await fetch(`/api/alert-boxes/${box._id}`, {
            method: 'DELETE',
            headers: authToken ? { Authorization: `Bearer ${authToken}` } : undefined
          });
          if (res.ok) {
            setAlertBoxes((prev) => prev.filter((b) => b._id !== box._id));
          }
        } catch (err) {
          console.error('Failed to delete alert box:', err);
        }
      }
    });
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
      {/* Create Action Header */}
      {!loading && alertBoxes.length > 0 && (
        <div className="flex items-center justify-end">
          <Button
            variant="primary"
            size="sm"
            onClick={handleCreateNewBox}
            icon={<Plus size={14} />}
            className="bg-cyan-400 text-slate-950 font-bold text-xs shadow-[0_0_15px_rgba(0,240,255,0.3)]"
          >
            Create Standard Box
          </Button>
        </div>
      )}

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
                className="group p-5 rounded-2xl bg-[#090D18] border border-slate-800 transition-all duration-300 hover:border-cyan-500/50 hover:shadow-[0_0_25px_rgba(0,240,255,0.15)] cursor-pointer flex flex-col justify-between space-y-4 relative overflow-hidden"
              >
                {/* Card Top: Condition Badges, Top-Right Delete Button & Name */}
                <div className="space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-1 min-w-0">
                      {(Array.isArray(box.conditions) && box.conditions.length > 0
                        ? box.conditions
                        : [{ id: 'default', minAmountCondition: box.minAmountCondition, glowColor: box.glowColor }]
                      )
                        .slice(0, 3)
                        .map((cond, idx) => {
                          const chipColor = cond.glowColor || box.glowColor || '#00F0FF';
                          return (
                            <span
                              key={cond.id || idx}
                              className="px-2 py-0.5 rounded-full text-[11px] font-mono font-extrabold border"
                              style={{
                                backgroundColor: `${chipColor}15`,
                                color: chipColor,
                                borderColor: `${chipColor}40`
                              }}
                            >
                              {Number(cond.minAmountCondition || 0.01).toFixed(2)}$
                            </span>
                          );
                        })}
                      {Array.isArray(box.conditions) && box.conditions.length > 3 && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-slate-900 text-slate-400 border border-slate-800">
                          +{box.conditions.length - 3}
                        </span>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={(e) => handleDeleteBoxCard(box, e)}
                      title={`Delete ${box.name}`}
                      aria-label={`Delete ${box.name}`}
                      className="p-1.5 rounded-lg bg-slate-900 hover:bg-red-950/50 border border-slate-800 hover:border-red-500/40 text-slate-400 hover:text-red-400 transition-colors flex-shrink-0 cursor-pointer"
                    >
                      <Trash2 size={13} />
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

                {/* Card Bottom: Test, Overlay Icons, Manage & Delete Buttons */}
                <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-800/60">
                  <button
                    type="button"
                    onClick={(e) => handleTestAlertBox(box, e)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-cyan-950/50 border border-slate-800 hover:border-cyan-500/40 text-xs font-mono text-cyan-300 transition-colors cursor-pointer"
                  >
                    <Play size={12} className={isPlaying ? 'text-cyan-400 animate-spin fill-cyan-400' : 'text-cyan-400 fill-cyan-400'} />
                    <span>{isPlaying ? 'Playing...' : 'Test Sound'}</span>
                  </button>

                  <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                    {(() => {
                      const origin = typeof window !== 'undefined' ? window.location.origin : '';
                      const token = streamerToken || 'streamer-token';
                      const boxUrl = `${origin}/overlay/alert/${token}?boxId=${box._id}`;
                      const isCopied = copiedBoxId === box._id;

                      return (
                        <>
                          <button
                            type="button"
                            onClick={(e) => copyBoxUrl(box, e)}
                            title={isCopied ? 'Copied OBS Overlay URL!' : 'Copy OBS Overlay URL'}
                            className={`p-1.5 rounded-lg border transition-colors cursor-pointer ${
                              isCopied
                                ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-400'
                                : 'bg-slate-900 hover:bg-cyan-950/60 border-slate-800 hover:border-cyan-500/40 text-slate-400 hover:text-cyan-300'
                            }`}
                          >
                            {isCopied ? <Check size={13} className="text-emerald-400" /> : <Copy size={13} />}
                          </button>
                          <a
                            href={boxUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            title="Open Target Overlay"
                            className="p-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-cyan-300 border border-slate-800 hover:border-cyan-500/40 transition-colors"
                          >
                            <ExternalLink size={13} />
                          </a>
                        </>
                      );
                    })()}
                    <button
                      type="button"
                      onClick={() => handleOpenStudio(box)}
                      className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/30 text-xs font-mono text-cyan-300 font-bold transition-colors cursor-pointer"
                    >
                      <Edit2 size={12} />
                      <span className="hidden xs:inline">Manage</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create Donation Box Name Pop-up Modal */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
          <div
            className="fixed inset-0"
            onClick={!isCreatingBox ? () => setIsCreateModalOpen(false) : undefined}
          />
          <form
            onSubmit={handleSubmitCreateBox}
            className="relative w-full max-w-md bg-[#0B0F19] border border-slate-800 rounded-2xl p-5 sm:p-6 shadow-2xl z-10 space-y-5 animate-in zoom-in-95 duration-150"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 flex-shrink-0">
                  <Bell size={20} />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white font-['Chakra_Petch'] tracking-wide">
                    Create Standard Box
                  </h3>
                  <p className="text-xs text-slate-400">
                    Enter any name for your donation alert box (up to 16 characters).
                  </p>
                </div>
              </div>
              <button
                type="button"
                disabled={isCreatingBox}
                onClick={() => setIsCreateModalOpen(false)}
                className="p-1.5 rounded-lg text-slate-500 hover:text-white hover:bg-slate-900 transition-colors cursor-pointer"
                aria-label="Close modal"
              >
                <X size={16} />
              </button>
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label htmlFor="new-donation-box-name" className="text-xs font-mono font-bold text-slate-300">
                  Donation Box Name
                </label>
                <span
                  className={`text-[11px] font-mono ${
                    newBoxName.length >= 16 ? 'text-cyan-400 font-bold' : 'text-slate-500'
                  }`}
                >
                  {newBoxName.length}/16
                </span>
              </div>
              <input
                ref={createInputRef}
                id="new-donation-box-name"
                type="text"
                maxLength={16}
                value={newBoxName}
                onChange={(e) => {
                  setNewBoxName(e.target.value.slice(0, 16));
                  if (createError) setCreateError(null);
                }}
                placeholder="e.g. Standard Box"
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 focus:border-cyan-400 text-white font-mono text-sm focus:outline-none transition-colors"
              />
              {createError && (
                <p className="text-xs font-mono text-red-400">{createError}</p>
              )}
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-1">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={isCreatingBox}
                onClick={() => setIsCreateModalOpen(false)}
                className="border-slate-700 text-slate-300 hover:text-white text-xs"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="primary"
                size="sm"
                disabled={isCreatingBox || !newBoxName.trim()}
                icon={!isCreatingBox ? <Plus size={14} /> : undefined}
                className="bg-cyan-400 hover:bg-cyan-300 text-slate-950 font-bold text-xs shadow-[0_0_15px_rgba(0,240,255,0.25)]"
              >
                {isCreatingBox ? 'Creating...' : 'Create Box'}
              </Button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
