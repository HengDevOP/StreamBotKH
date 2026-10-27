'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Tv,
  Plus,
  Copy,
  Check,
  ExternalLink,
  Trash2,
  Play,
  Sparkles,
  Sliders,
  Volume2,
  Clock,
  DollarSign,
  Image as ImageIcon,
  CheckCircle2,
  RefreshCw,
  X,
  Layers
} from 'lucide-react';
import { Button } from '../common/Button';
import { MediaItem } from './MediaLibraryManager';
import { useSocket } from '../../context/SocketContext';
import { useModal } from '../../context/ModalContext';
import { CreateOverlayModal } from './CreateOverlayModal';

export interface OverlayItem {
  _id: string;
  userId: string;
  name: string;
  overlayToken: string;
  width?: number;
  height?: number;
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
}

interface OverlayManagerProps {
  onNavigateToMedia?: () => void;
  selectedMediaForNewOverlay?: MediaItem | null;
  onClearSelectedMedia?: () => void;
}

export const OverlayManager: React.FC<OverlayManagerProps> = ({
  onNavigateToMedia,
  selectedMediaForNewOverlay,
  onClearSelectedMedia
}) => {
  const { socket } = useSocket();
  const { showConfirm, showAlert } = useModal();
  const [overlays, setOverlays] = useState<OverlayItem[]>([]);
  const [mediaList, setMediaList] = useState<MediaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [copiedToken, setCopiedToken] = useState<string | null>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [testingId, setTestingId] = useState<string | null>(null);
  const [initialName, setInitialName] = useState<string>('Alert Box Overlay');
  const [initialMediaUrl, setInitialMediaUrl] = useState<string | undefined>(undefined);

  const fetchOverlaysAndMedia = async () => {
    try {
      setLoading(true);
      const [resOverlays, resMedia] = await Promise.all([
        fetch('/api/overlays'),
        fetch('/api/media')
      ]);

      const dataOverlays = await resOverlays.json();
      const dataMedia = await resMedia.json();

      if (resOverlays.ok && dataOverlays.success) {
        setOverlays(dataOverlays.overlays || []);
      }
      if (resMedia.ok && dataMedia.success) {
        setMediaList(dataMedia.media || []);
      }
    } catch (e) {
      console.error('Error fetching overlay data:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOverlaysAndMedia();
  }, []);

  // When selectedMediaForNewOverlay is passed from Media Library
  useEffect(() => {
    if (selectedMediaForNewOverlay) {
      setInitialMediaUrl(selectedMediaForNewOverlay.url);
      setInitialName(`Overlay (${selectedMediaForNewOverlay.filename.replace(/\.[^/.]+$/, '')})`);
      setIsCreateOpen(true);
      onClearSelectedMedia?.();
    }
  }, [selectedMediaForNewOverlay]);

  const handleDeleteOverlay = (id: string, overlayName: string) => {
    showConfirm({
      title: 'Delete OBS Overlay?',
      message: `Are you sure you want to delete overlay "${overlayName}"? The overlay URL in your OBS Studio will immediately stop displaying alerts.`,
      type: 'danger',
      confirmText: 'Delete Overlay',
      onConfirm: async () => {
        try {
          const res = await fetch(`/api/overlays/${id}`, { method: 'DELETE' });
          const data = await res.json();
          if (res.ok && data.success) {
            setOverlays((prev) => prev.filter((o) => o._id !== id));
            showAlert({
              title: 'Overlay Deleted',
              message: `Overlay "${overlayName}" has been permanently removed.`,
              type: 'success'
            });
          } else {
            showAlert({
              title: 'Delete Failed',
              message: data.error || 'Failed to delete overlay',
              type: 'danger'
            });
          }
        } catch (e: any) {
          showAlert({
            title: 'Delete Error',
            message: 'A network error occurred while deleting the overlay.',
            type: 'danger'
          });
        }
      }
    });
  };

  const copyObsUrl = (token: string) => {
    const fullUrl = `${window.location.origin}/overlay/${token}`;
    navigator.clipboard.writeText(fullUrl);
    setCopiedToken(token);
    setTimeout(() => setCopiedToken(null), 2000);
  };

  const handleTestAlert = (overlay: OverlayItem) => {
    setTestingId(overlay._id);
    if (socket) {
      socket.emit('trigger:test_alert', {
        overlayToken: overlay.overlayToken,
        donationId: `test-${Date.now()}`,
        donorName: 'Pro Supporter',
        donorMessage: 'Loving the stream! Keep it up 🔥',
        amount: 10.0,
        currency: 'USD',
        bankingName: 'ABA Bank',
        glowColor: overlay.glowColor || '#00F0FF',
        customGifUrl: overlay.mediaUrl,
        soundUrl: overlay.soundUrl || '/sounds/neon-chime.mp3',
        soundVolume: overlay.soundVolume ?? 0.85,
        durationSeconds: overlay.durationSeconds ?? 8,
        ttsEnabled: overlay.ttsEnabled ?? true
      });
    }

    setTimeout(() => setTestingId(null), 2500);
  };

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-slate-800/60">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Tv size={22} className="text-cyan-400" />
            OBS Overlays
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Create and manage browser source alert overlays with custom PNG, JPG, or GIF reactions from your Media Library.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="primary"
            size="sm"
            onClick={() => setIsCreateOpen(true)}
            className="flex items-center gap-1.5 font-bold text-xs"
          >
            <Plus size={14} />
            <span>Create New Overlay</span>
          </Button>
        </div>
      </div>

      {/* Overlay List */}
      <div className="space-y-4">
        {loading ? (
          <div className="py-12 text-center text-xs text-slate-500 font-mono flex items-center justify-center gap-2">
            <RefreshCw size={14} className="animate-spin" />
            <span>Loading overlays from MongoDB...</span>
          </div>
        ) : overlays.length === 0 ? (
          <div className="p-10 rounded-2xl bg-slate-900/30 border border-slate-800/60 text-center space-y-3">
            <Tv size={32} className="mx-auto text-slate-600" />
            <div className="text-sm font-medium text-slate-300">No custom overlays created yet</div>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              Click &quot;Create New Overlay&quot; above to build your first OBS alert source using uploaded media.
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsCreateOpen(true)}
              className="mt-2 text-xs"
            >
              <Plus size={14} />
              <span>Create First Overlay</span>
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {overlays.map((item) => {
              const obsUrl = `${typeof window !== 'undefined' ? window.location.origin : ''}/overlay/${item.overlayToken}`;
              const isCopied = copiedToken === item.overlayToken;

              return (
                <div
                  key={item._id}
                  className="rounded-2xl bg-slate-900/60 border border-slate-800/80 p-5 space-y-4 flex flex-col justify-between hover:border-slate-700 transition-all shadow-sm"
                >
                  <div className="space-y-3">
                    {/* Top Row: Title & Badge */}
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="text-sm font-bold text-white flex items-center gap-2">
                          <span
                            className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                            style={{ backgroundColor: item.glowColor || '#00F0FF' }}
                          />
                          <span className="truncate max-w-[180px]">{item.name}</span>
                        </div>
                        <div className="text-[11px] font-mono text-slate-500 mt-0.5 truncate">
                          Token: {item.overlayToken.slice(0, 16)}...
                        </div>
                      </div>

                      <button
                        onClick={() => handleDeleteOverlay(item._id, item.name)}
                        className="text-slate-500 hover:text-red-400 p-1 transition-colors"
                        title="Delete Overlay"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>

                    {/* Media Preview Box */}
                    <div className="w-full h-32 rounded-xl bg-slate-950 border border-slate-800/80 flex items-center justify-center overflow-hidden p-2 relative group">
                      {item.mediaUrl ? (
                        <img
                          src={item.mediaUrl}
                          alt={item.name}
                          className="max-h-full max-w-full object-contain rounded-lg"
                        />
                      ) : (
                        <ImageIcon size={28} className="text-slate-700" />
                      )}
                      <span className="absolute bottom-2 left-2 px-1.5 py-0.5 rounded text-[10px] font-mono bg-black/70 text-slate-300">
                        {item.durationSeconds || 8}s • Min ${item.minAmountAlert || 1}
                      </span>
                    </div>

                    {/* OBS Browser Source URL Box */}
                    <div className="space-y-1">
                      <label className="text-[10px] font-mono uppercase text-slate-500 font-bold block">
                        OBS Browser Source URL ({item.width || 1080}×{item.height || 720})
                      </label>
                      <div className="flex items-center gap-1.5">
                        <input
                          type="text"
                          readOnly
                          value={obsUrl}
                          className="w-full text-xs font-mono px-2.5 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-slate-300 select-all focus:outline-none"
                        />
                        <button
                          onClick={() => copyObsUrl(item.overlayToken)}
                          title="Copy OBS URL"
                          className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs flex items-center gap-1 transition-colors whitespace-nowrap"
                        >
                          {isCopied ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Actions Bar */}
                  <div className="pt-3 border-t border-slate-800/60 flex items-center justify-between gap-2">
                    <Link
                      href={`/dashboard?overlay=${item._id}`}
                      className="px-3 py-1.5 rounded-lg bg-cyan-500/15 hover:bg-cyan-500/25 text-cyan-300 border border-cyan-500/30 text-xs font-mono font-bold flex items-center gap-1.5 transition-colors"
                      title="Manage resolution, media and settings"
                    >
                      <Sliders size={13} className="text-cyan-400" />
                      <span>Manage</span>
                    </Link>

                    <a
                      href={`/overlay/${item.overlayToken}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-2.5 py-1.5 rounded-lg bg-slate-800/60 hover:bg-slate-800 text-slate-300 text-xs font-mono flex items-center gap-1.5 transition-colors"
                    >
                      <ExternalLink size={12} />
                      <span>OBS</span>
                    </a>

                    <button
                      onClick={() => handleTestAlert(item)}
                      disabled={testingId === item._id}
                      className="px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-700/60 text-xs font-bold font-mono flex items-center gap-1.5 transition-colors flex-1 justify-center"
                    >
                      <Play size={12} className={testingId === item._id ? 'animate-spin' : ''} />
                      <span>{testingId === item._id ? 'Triggering...' : 'Test'}</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ============================================================== */}
      {/* CREATE NEW OVERLAY MODAL (RESOLUTION PICKER & STUDIO REDIRECT) */}
      {/* ============================================================== */}
      <CreateOverlayModal
        isOpen={isCreateOpen}
        onClose={() => {
          setIsCreateOpen(false);
          setInitialName('Alert Box Overlay');
          setInitialMediaUrl(undefined);
        }}
        initialName={initialName}
        initialMediaUrl={initialMediaUrl}
        onCreated={(created) => {
          setOverlays((prev) => [created, ...prev]);
        }}
      />
    </div>
  );
};
