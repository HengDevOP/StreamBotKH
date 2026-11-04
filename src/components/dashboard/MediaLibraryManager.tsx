'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  UploadCloud,
  Trash2,
  Copy,
  Check,
  Image as ImageIcon,
  AlertCircle,
  CheckCircle2,
  RefreshCw,
  Layers,
  Video,
  Volume2,
  FileText,
  Play,
  Pause,
  Search,
  Sparkles,
  Crown,
  Smile,
  Film,
  Music
} from 'lucide-react';
import { useModal } from '../../context/ModalContext';
import { mediaService, MediaItem, StorageInfo } from '../../services/mediaService';
import {
  PRESET_GIFS,
  PRESET_STICKERS,
  PRESET_SOUNDS,
  PRESET_STICKER_GROUPS,
  PresetMediaItem
} from '../../data/presetsData';
import { ProUpgradeModal } from './ProUpgradeModal';

export type { MediaItem, StorageInfo };

interface MediaLibraryManagerProps {
  onSelectForOverlay?: (media: MediaItem | { url: string; filename: string; _id?: string }) => void;
  currentPlan?: 'free' | 'pro' | string;
  isTrialActive?: boolean;
  isAdmin?: boolean;
  onUpgrade?: () => void;
}

export function isVideoAsset(item: Pick<MediaItem, 'fileType' | 'url' | 'filename'>): boolean {
  const ft = (item.fileType || '').toLowerCase();
  const name = (item.url || item.filename || '').toLowerCase();
  return ft.startsWith('video/') || /\.(mp4|webm|mov|m4v|avi|mkv)$/i.test(name);
}

export function isAudioAsset(item: Pick<MediaItem, 'fileType' | 'url' | 'filename'>): boolean {
  const ft = (item.fileType || '').toLowerCase();
  const name = (item.url || item.filename || '').toLowerCase();
  return ft.startsWith('audio/') || /\.(mp3|wav|wave|ogg|m4a|aac|flac)$/i.test(name);
}

export function isImageAsset(item: Pick<MediaItem, 'fileType' | 'url' | 'filename'>): boolean {
  const ft = (item.fileType || '').toLowerCase();
  const name = (item.url || item.filename || '').toLowerCase();
  return ft.startsWith('image/') || /\.(png|jpe?g|gif|webp|svg|avif|bmp|ico)$/i.test(name);
}

export const MediaLibraryManager: React.FC<MediaLibraryManagerProps> = ({
  onSelectForOverlay,
  currentPlan,
  isTrialActive,
  isAdmin,
  onUpgrade
}) => {
  const { showConfirm, showAlert } = useModal();
  const [mediaList, setMediaList] = useState<MediaItem[]>(() => mediaService.getCachedMedia());
  const [loading, setLoading] = useState(() => mediaService.getCachedMedia().length === 0);
  const [uploading, setUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [storageInfo, setStorageInfo] = useState<StorageInfo | null>(() => mediaService.getCachedStorage());

  // Pro Plan / Trial Guard
  const [showProModal, setShowProModal] = useState(false);
  const [proModalFeature, setProModalFeature] = useState('Presets Library');

  const isProOrTrial =
    currentPlan === 'pro' ||
    currentPlan === 'starter' ||
    Boolean(isTrialActive) ||
    Boolean(isAdmin) ||
    storageInfo?.plan === 'pro';

  // Section Selector: 'uploads' | 'stickers' | 'gifs' | 'sounds'
  const [activeSection, setActiveSection] = useState<'uploads' | 'stickers' | 'gifs' | 'sounds'>('uploads');

  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState('');
  const [stickerGroup, setStickerGroup] = useState<string>('All');
  const [playingSoundId, setPlayingSoundId] = useState<string | null>(null);
  const [visibleStickersCount, setVisibleStickersCount] = useState(60);
  const [visibleGifsCount, setVisibleGifsCount] = useState(48);
  const activeAudioRef = useRef<HTMLAudioElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Reset pagination on filter change
  useEffect(() => {
    setVisibleStickersCount(60);
  }, [stickerGroup, searchQuery]);

  useEffect(() => {
    setVisibleGifsCount(48);
  }, [searchQuery]);

  const handleTogglePlaySound = (sound: PresetMediaItem, e?: React.MouseEvent) => {
    if (e) {
      e.stopPropagation();
    }
    if (playingSoundId === sound.id) {
      if (activeAudioRef.current) {
        activeAudioRef.current.pause();
        activeAudioRef.current = null;
      }
      setPlayingSoundId(null);
      return;
    }

    if (activeAudioRef.current) {
      activeAudioRef.current.pause();
      activeAudioRef.current = null;
    }

    const audio = new Audio(sound.url);
    activeAudioRef.current = audio;
    setPlayingSoundId(sound.id);

    audio.onended = () => {
      setPlayingSoundId(null);
      activeAudioRef.current = null;
    };
    audio.onerror = () => {
      setPlayingSoundId(null);
      activeAudioRef.current = null;
    };

    audio.play().catch((err) => {
      console.warn('Audio play error:', err);
      setPlayingSoundId(null);
    });
  };

  useEffect(() => {
    return () => {
      if (activeAudioRef.current) {
        activeAudioRef.current.pause();
        activeAudioRef.current = null;
      }
    };
  }, []);

  // Filtered Stickers
  const filteredStickers = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return PRESET_STICKERS.filter((item) => {
      const matchGroup = stickerGroup === 'All' || item.group === stickerGroup;
      const matchQuery =
        !q ||
        item.name.toLowerCase().includes(q) ||
        item.tags.some((t) => t.toLowerCase().includes(q));
      return matchGroup && matchQuery;
    });
  }, [stickerGroup, searchQuery]);

  // Filtered GIFs
  const filteredGifs = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return PRESET_GIFS.filter((item) => {
      if (!q) return true;
      return (
        item.name.toLowerCase().includes(q) ||
        item.tags.some((t) => t.toLowerCase().includes(q))
      );
    });
  }, [searchQuery]);

  // Filtered Sounds
  const filteredSounds = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return PRESET_SOUNDS.filter((item) => {
      if (!q) return true;
      return (
        item.name.toLowerCase().includes(q) ||
        item.group.toLowerCase().includes(q) ||
        item.tags.some((t) => t.toLowerCase().includes(q))
      );
    });
  }, [searchQuery]);

  const fetchMedia = async (force = false) => {
    try {
      if (mediaList.length === 0) {
        setLoading(true);
      }
      const data = await mediaService.fetchMedia({ force });
      setMediaList(data.media || []);
      if (data.storage) {
        setStorageInfo(data.storage);
      }
    } catch (e: any) {
      console.error('Failed to load media:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const unsubscribe = mediaService.subscribe((data) => {
      setMediaList(data.media || []);
      if (data.storage) {
        setStorageInfo(data.storage);
      }
      setLoading(false);
    });

    fetchMedia(false);

    return () => {
      unsubscribe();
    };
  }, []);

  const formatFileSize = (bytes: number) => {
    const b = Number(bytes);
    if (!Number.isFinite(b) || b <= 0) return '0 MB';
    if (b < 1024) return `${b} B`;
    if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`;
    const mb = b / (1024 * 1024);
    return mb % 1 === 0 ? `${mb.toFixed(0)} MB` : `${mb.toFixed(1)} MB`;
  };

  const handleFileProcess = async (file: File) => {
    setErrorMsg(null);
    setSuccessMsg(null);

    const incomingSize = Number(file.size) || 0;
    if (storageInfo && (storageInfo.usedBytes + incomingSize > storageInfo.limitBytes || incomingSize > storageInfo.remainingBytes)) {
      const totalMb = ((storageInfo.usedBytes + incomingSize) / (1024 * 1024)).toFixed(1);
      const usedMb = (storageInfo.usedBytes / (1024 * 1024)).toFixed(1);
      const fileMb = (incomingSize / (1024 * 1024)).toFixed(1);
      const limitMb = (storageInfo.limitBytes / (1024 * 1024)).toFixed(0);
      setErrorMsg(
        `Total storage limit reached: ${totalMb} MB attempted (${usedMb} MB used + ${fileMb} MB file) of ${limitMb} MB max quota. Delete older files or upgrade plan.`
      );
      return;
    }

    setUploading(true);

    try {
      const result = await mediaService.uploadMedia(file);
      setSuccessMsg(`"${file.name}" uploaded successfully!`);
      setMediaList(mediaService.getCachedMedia());
      if (result.storage) {
        setStorageInfo(result.storage);
      }
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (err: any) {
      setErrorMsg(err.message || 'Network error during upload.');
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files[0]) {
      handleFileProcess(files[0]);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileProcess(e.dataTransfer.files[0]);
    }
  };

  const handleDelete = (id: string, name: string) => {
    showConfirm({
      title: 'Delete Media Asset?',
      message: `Are you sure you want to delete "${name}"? This file will be permanently removed from your media library.`,
      type: 'danger',
      confirmText: 'Delete Asset',
      onConfirm: async () => {
        setMediaList((prev) => prev.filter((m) => m._id !== id));
        try {
          await mediaService.deleteMedia(id);
          showAlert({
            title: 'Asset Deleted',
            message: `"${name}" has been removed and storage space has been reclaimed.`,
            type: 'success'
          });
        } catch (e: any) {
          showAlert({
            title: 'Asset Pruned',
            message: `"${name}" was not found and has been pruned from your library.`,
            type: 'info'
          });
        }
      }
    });
  };

  const copyUrl = (url: string, id: string) => {
    const fullUrl = window.location.origin + url;
    navigator.clipboard.writeText(fullUrl);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handlePresetAction = (item: PresetMediaItem, action: 'copy' | 'use') => {
    if (!isProOrTrial) {
      setProModalFeature(
        item.category === 'Stickers'
          ? '500+ Sticker Presets'
          : item.category === 'GIFs'
          ? '100 Popular GIF Presets'
          : 'Sound Presets'
      );
      setShowProModal(true);
      return;
    }

    if (action === 'copy') {
      copyUrl(item.url, item.id);
    } else if (action === 'use' && onSelectForOverlay) {
      onSelectForOverlay({ url: item.url, filename: item.name, _id: item.id });
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-slate-800/60">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <ImageIcon size={22} className="text-cyan-400" />
            Media Library &amp; Presets
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Upload custom MP4/GIF/audio, or use 500+ Facebook stickers, 100 alert GIFs, and stream sounds.
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs font-mono">
          <span className="px-2.5 py-1 rounded-md bg-slate-800 text-slate-300">
            {mediaList.length} uploads
          </span>
          <span className="px-2.5 py-1 rounded-md bg-pink-950/80 text-pink-300 border border-pink-800/50">
            500 Stickers
          </span>
          <span className="px-2.5 py-1 rounded-md bg-cyan-950 text-cyan-300">
            100 GIFs
          </span>
        </div>
      </div>

      {/* Plan Pro Notice Banner for Free Users */}
      {!isProOrTrial && (
        <div className="p-3.5 rounded-xl bg-gradient-to-r from-amber-500/15 via-amber-500/10 to-transparent border border-amber-500/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs text-amber-200">
          <div className="flex items-center gap-2.5">
            <Crown size={18} className="text-amber-400 fill-amber-400 flex-shrink-0 animate-pulse" />
            <span>
              <strong>500 Stickers, 100 GIFs &amp; Sounds</strong> are available for free to <strong>Pro Plan</strong> and <strong>Trial</strong> users. Free users will see the yellow King icon.
            </span>
          </div>
          <button
            type="button"
            onClick={() => {
              setProModalFeature('Presets Library (500 Stickers, 100 GIFs & Sounds)');
              setShowProModal(true);
            }}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-xs transition-colors cursor-pointer shadow-md shadow-amber-500/20 flex-shrink-0"
          >
            <Crown size={13} className="fill-current" />
            <span>Upgrade to Pro</span>
          </button>
        </div>
      )}

      {/* Section Switcher Tabs */}
      <div className="flex items-center gap-1.5 p-1 rounded-xl bg-slate-900/90 border border-slate-800 w-fit overflow-x-auto no-scrollbar">
        <button
          type="button"
          onClick={() => setActiveSection('uploads')}
          className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-2 cursor-pointer whitespace-nowrap ${
            activeSection === 'uploads'
              ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <Layers size={14} />
          <span>My Uploads ({mediaList.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveSection('stickers')}
          className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-2 cursor-pointer whitespace-nowrap ${
            activeSection === 'stickers'
              ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <Smile size={14} />
          <span>Stickers (500)</span>
          {!isProOrTrial && (
            <Crown size={12} className="text-amber-400 fill-amber-400" />
          )}
          <span className="px-1.5 py-0.2 rounded bg-pink-500 text-white text-[8px] font-bold uppercase tracking-wider">
            FB
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveSection('gifs')}
          className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-2 cursor-pointer whitespace-nowrap ${
            activeSection === 'gifs'
              ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <Film size={14} />
          <span>GIFs (100)</span>
          {!isProOrTrial && (
            <Crown size={12} className="text-amber-400 fill-amber-400" />
          )}
        </button>

        <button
          type="button"
          onClick={() => setActiveSection('sounds')}
          className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-2 cursor-pointer whitespace-nowrap ${
            activeSection === 'sounds'
              ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <Music size={14} />
          <span>Sounds ({PRESET_SOUNDS.length})</span>
          {!isProOrTrial && (
            <Crown size={12} className="text-amber-400 fill-amber-400" />
          )}
        </button>
      </div>

      {/* Alert Messages */}
      {errorMsg && (
        <div className="p-3.5 rounded-xl bg-red-950/60 border border-red-500/50 text-red-300 text-xs flex items-center justify-between shadow-lg shadow-red-950/40 animate-fadeIn">
          <div className="flex items-center gap-2.5 flex-wrap">
            <span className="px-2 py-0.5 rounded-md bg-red-500/20 text-red-400 border border-red-500/40 font-mono font-bold text-[10px] uppercase tracking-wider flex-shrink-0 flex items-center gap-1">
              <AlertCircle size={12} className="text-red-400" />
              Storage Limit Exceeded
            </span>
            <span className="font-sans font-medium text-red-200">{errorMsg}</span>
          </div>
          <button
            onClick={() => setErrorMsg(null)}
            className="text-red-400 hover:text-white text-xs font-bold px-2 py-0.5 ml-2 cursor-pointer flex-shrink-0"
          >
            ✕
          </button>
        </div>
      )}

      {successMsg && (
        <div className="p-3.5 rounded-xl bg-emerald-950/40 border border-emerald-800/50 text-emerald-300 text-xs flex items-center gap-2 animate-fadeIn">
          <CheckCircle2 size={16} className="flex-shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* ============================================================== */}
      {/* SECTION 1: MY UPLOADS                                          */}
      {/* ============================================================== */}
      {activeSection === 'uploads' && (
        <div className="space-y-6 animate-fadeIn">
          {/* Storage Quota Usage Bar */}
          {storageInfo && (
            <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800/80 space-y-2">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-xs">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-mono text-slate-300 font-bold uppercase tracking-wider">
                    Media Storage Usage:
                  </span>
                  <span className="px-2 py-0.5 rounded bg-cyan-950 text-cyan-300 font-mono text-[11px] font-bold">
                    {storageInfo.planLabel}
                  </span>
                  {(storageInfo.remainingBytes <= 0 || storageInfo.percentUsed >= 100) && (
                    <span className="px-2 py-0.5 rounded-md bg-red-500/20 text-red-400 border border-red-500/40 font-mono text-[10px] font-bold uppercase tracking-wider animate-pulse flex-shrink-0">
                      MAX LIMIT REACHED
                    </span>
                  )}
                </div>
                <div className="font-mono text-slate-400 text-xs">
                  <strong className={storageInfo.percentUsed >= 100 ? 'text-red-400 font-bold' : 'text-white'}>
                    {formatFileSize(storageInfo.usedBytes)}
                  </strong>{' '}
                  used of <strong className="text-white">{formatFileSize(storageInfo.limitBytes)}</strong> ({storageInfo.percentUsed}%)
                </div>
              </div>

              {/* Progress Bar */}
              <div className="w-full h-2 rounded-full bg-slate-950 overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${
                    storageInfo.percentUsed > 90
                      ? 'bg-red-400'
                      : storageInfo.percentUsed > 70
                      ? 'bg-amber-400'
                      : 'bg-cyan-400'
                  }`}
                  style={{ width: `${Math.max(2, storageInfo.percentUsed)}%` }}
                />
              </div>

              <div className="flex items-center justify-between text-[11px] font-mono text-slate-500">
                <span>Free: 20MB • Pro: 100MB</span>
                <span>{formatFileSize(storageInfo.remainingBytes)} available</span>
              </div>
            </div>
          )}

          {/* Drag & Drop Upload Zone */}
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`p-8 rounded-2xl border-2 border-dashed cursor-pointer transition-all flex flex-col items-center justify-center text-center gap-3 ${
              dragActive
                ? 'border-cyan-400 bg-cyan-950/20'
                : 'border-slate-800 hover:border-slate-700 bg-slate-900/40 hover:bg-slate-900/60'
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="*/*"
              className="hidden"
              onChange={handleInputChange}
              disabled={uploading}
            />

            <div className="w-12 h-12 rounded-2xl bg-slate-800 flex items-center justify-center text-cyan-400 shadow-sm">
              {uploading ? (
                <RefreshCw size={22} className="animate-spin text-cyan-400" />
              ) : (
                <UploadCloud size={24} />
              )}
            </div>

            <div className="space-y-1">
              <div className="text-sm font-semibold text-white">
                {uploading ? 'Uploading Into Cloud...' : 'Click to upload or drag and drop'}
              </div>
              <p className="text-xs text-slate-400">
                Supports <strong className="text-slate-300">MP4</strong>, <strong className="text-slate-300">GIF</strong>, <strong className="text-slate-300">MP3</strong>, <strong className="text-slate-300">WAV</strong>, <strong className="text-slate-300">PNG</strong>, <strong className="text-slate-300">JPG</strong>, <strong className="text-slate-300">WEBP</strong>.
              </p>
            </div>
          </div>

          {/* Media Gallery Grid */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-300 uppercase tracking-wider font-mono">
                Uploaded Media ({mediaList.length})
              </h3>
              <button
                onClick={() => fetchMedia(true)}
                className="text-xs text-slate-400 hover:text-white flex items-center gap-1 font-mono transition-colors cursor-pointer"
              >
                <RefreshCw size={12} className={loading ? 'animate-spin' : ''} />
                <span>Refresh</span>
              </button>
            </div>

            {loading ? (
              <div className="py-12 text-center text-xs text-slate-500 font-mono flex items-center justify-center gap-2">
                <RefreshCw size={14} className="animate-spin" />
                <span>Loading media from Cloud...</span>
              </div>
            ) : mediaList.length === 0 ? (
              <div className="p-10 rounded-2xl bg-slate-900/30 border border-slate-800/60 text-center space-y-2">
                <ImageIcon size={32} className="mx-auto text-slate-600" />
                <div className="text-sm font-medium text-slate-400">No media uploaded yet</div>
                <p className="text-xs text-slate-500 max-w-sm mx-auto">
                  Upload your stream MP4 clips, reaction GIFs, MP3/WAV sound effects, or switch to the Stickers and GIFs tabs above.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {mediaList.map((item) => {
                  const isVideo = isVideoAsset(item);
                  const isAudio = isAudioAsset(item);
                  const isImage = isImageAsset(item);
                  const extBadge = (item.filename.split('.').pop() || 'FILE').toUpperCase();

                  return (
                    <div
                      key={item._id}
                      className="group rounded-xl bg-slate-900/60 border border-slate-800/80 overflow-hidden flex flex-col justify-between hover:border-slate-700 transition-all shadow-sm"
                    >
                      <div className="w-full aspect-square bg-slate-950 flex flex-col items-center justify-center relative overflow-hidden p-3">
                        {isVideo ? (
                          <video
                            src={item.url}
                            controls
                            muted
                            loop
                            playsInline
                            className="max-w-full max-h-full object-contain rounded-lg"
                          />
                        ) : isAudio ? (
                          <div className="w-full h-full flex flex-col items-center justify-center gap-3 px-2 text-center">
                            <div className="w-14 h-14 rounded-2xl bg-purple-500/15 border border-purple-500/30 flex items-center justify-center text-purple-400">
                              <Volume2 size={28} />
                            </div>
                            <audio src={item.url} controls className="w-full h-8" />
                          </div>
                        ) : isImage ? (
                          <img
                            src={item.url}
                            alt={item.filename}
                            className="max-w-full max-h-full object-contain rounded-lg"
                            loading="lazy"
                          />
                        ) : (
                          <div className="flex flex-col items-center justify-center gap-2 text-slate-400">
                            <FileText size={32} className="text-cyan-400" />
                            <span className="text-xs font-mono">{extBadge}</span>
                          </div>
                        )}

                        <span className="absolute top-2 right-2 px-1.5 py-0.5 rounded text-[10px] font-mono font-bold uppercase bg-black/75 text-slate-200 flex items-center gap-1">
                          {isVideo && <Video size={10} className="text-cyan-400" />}
                          {isAudio && <Volume2 size={10} className="text-purple-400" />}
                          {extBadge}
                        </span>
                      </div>

                      <div className="p-3 space-y-2 flex-1 flex flex-col justify-between">
                        <div>
                          <div className="text-xs font-semibold text-slate-200 truncate" title={item.filename}>
                            {item.filename}
                          </div>
                          <div className="flex items-center justify-between text-[11px] font-mono text-slate-500 mt-1">
                            <span>{formatFileSize(item.fileSize)}</span>
                            <span>{new Date(item.createdAt).toLocaleDateString()}</span>
                          </div>
                        </div>

                        <div className="pt-2 border-t border-slate-800/60 flex items-center justify-between gap-1">
                          <button
                            onClick={() => copyUrl(item.url, item._id)}
                            title="Copy Public URL"
                            className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] font-mono flex items-center gap-1 transition-colors flex-1 justify-center cursor-pointer"
                          >
                            {copiedId === item._id ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
                            <span>{copiedId === item._id ? 'Copied' : 'Copy'}</span>
                          </button>

                          {onSelectForOverlay && (
                            <button
                              onClick={() => onSelectForOverlay(item)}
                              title="Use in Overlay"
                              className="px-2 py-1 rounded bg-cyan-950/80 hover:bg-cyan-900/80 text-cyan-300 border border-cyan-800/60 text-[11px] font-mono flex items-center gap-1 transition-colors cursor-pointer"
                            >
                              <Layers size={12} />
                              <span>Use</span>
                            </button>
                          )}

                          <button
                            onClick={() => handleDelete(item._id, item.filename)}
                            title="Delete from Cloud"
                            className="p-1 rounded text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-colors cursor-pointer"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* SECTION 2: STICKERS (500)                                      */}
      {/* ============================================================== */}
      {activeSection === 'stickers' && (
        <div className="space-y-6 animate-fadeIn">
          {/* Search & Filter Toolbar */}
          <div className="space-y-3">
            <div className="relative">
              <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search 500+ stickers (e.g. pusheen, cat, pepe, panda, troll, doge)..."
                className="w-full pl-10 pr-9 py-2.5 rounded-xl bg-slate-900/80 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400 transition-colors"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white text-xs p-1 cursor-pointer"
                >
                  ✕
                </button>
              )}
            </div>

            {/* Sticker Groups */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
              <button
                type="button"
                onClick={() => setStickerGroup('All')}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-1.5 cursor-pointer ${
                  stickerGroup === 'All'
                    ? 'bg-cyan-500 text-slate-950 font-bold shadow-sm'
                    : 'bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-slate-200 border border-slate-800'
                }`}
              >
                <span>All Stickers</span>
                <span className="text-[10px] px-1.5 py-0.2 rounded-full font-mono bg-slate-950/30">
                  {PRESET_STICKERS.length}
                </span>
              </button>

              {PRESET_STICKER_GROUPS.map((grp) => {
                const count = PRESET_STICKERS.filter((s) => s.group === grp).length;
                const isSelected = stickerGroup === grp;
                return (
                  <button
                    key={grp}
                    type="button"
                    onClick={() => setStickerGroup(grp)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-1.5 cursor-pointer ${
                      isSelected
                        ? 'bg-cyan-500 text-slate-950 font-bold shadow-sm'
                        : 'bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-slate-200 border border-slate-800'
                    }`}
                  >
                    <span>{grp}</span>
                    <span
                      className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                        isSelected ? 'bg-slate-950/30 text-slate-950 font-bold' : 'bg-slate-800 text-slate-400'
                      }`}
                    >
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Stickers Grid */}
          {filteredStickers.length === 0 ? (
            <div className="p-12 text-center rounded-2xl bg-slate-900/30 border border-slate-800 text-slate-400">
              No stickers found matching &ldquo;{searchQuery}&rdquo;
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-3.5">
                {filteredStickers.slice(0, visibleStickersCount).map((sticker) => {
                  const isCopied = copiedId === sticker.id;

                  return (
                    <div
                      key={sticker.id}
                      onClick={() => !isProOrTrial && handlePresetAction(sticker, 'copy')}
                      className="group rounded-xl bg-slate-900/60 border border-slate-800/80 overflow-hidden flex flex-col justify-between hover:border-slate-700 transition-all shadow-sm relative"
                    >
                      <div className="aspect-square w-full p-2.5 flex items-center justify-center relative bg-slate-950">
                        <img
                          src={sticker.url}
                          alt={sticker.name}
                          loading="lazy"
                          className="max-w-full max-h-full object-contain group-hover:scale-110 transition-transform duration-200"
                        />

                        {/* Yellow King Icon for Free Users (Pro Plan Required) */}
                        {!isProOrTrial && (
                          <div
                            title="Pro Plan Required"
                            className="absolute top-2 right-2 flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-amber-500/25 border border-amber-400/60 shadow-lg shadow-amber-500/20 backdrop-blur-md"
                          >
                            <Crown size={12} className="text-amber-400 fill-amber-400" />
                            <span className="text-[9px] font-black tracking-wider text-amber-300 font-mono">PRO</span>
                          </div>
                        )}

                        {sticker.isAnimated && (
                          <span className="absolute bottom-1.5 left-1.5 px-1 py-0.2 rounded bg-black/75 text-[8px] font-mono font-bold text-pink-400 uppercase">
                            GIF
                          </span>
                        )}
                      </div>

                      <div className="p-2 bg-[#0B0F19] border-t border-slate-800/60 space-y-1.5">
                        <div className="text-[11px] font-semibold text-slate-200 truncate" title={sticker.name}>
                          {sticker.name}
                        </div>

                        <div className="flex items-center gap-1 pt-1 border-t border-slate-800/40">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handlePresetAction(sticker, 'copy');
                            }}
                            title="Copy Image URL"
                            className="flex-1 py-1 px-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px] font-mono flex items-center justify-center gap-1 transition-colors cursor-pointer"
                          >
                            {!isProOrTrial ? (
                              <>
                                <Crown size={11} className="text-amber-400 fill-amber-400" />
                                <span>Unlock</span>
                              </>
                            ) : isCopied ? (
                              <>
                                <Check size={11} className="text-emerald-400" />
                                <span>Copied</span>
                              </>
                            ) : (
                              <>
                                <Copy size={11} />
                                <span>Copy</span>
                              </>
                            )}
                          </button>

                          {onSelectForOverlay && isProOrTrial && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handlePresetAction(sticker, 'use');
                              }}
                              title="Use in Alert Box"
                              className="px-2 py-1 rounded bg-cyan-950/80 hover:bg-cyan-900 text-cyan-300 text-[10px] font-mono flex items-center gap-1 transition-colors cursor-pointer"
                            >
                              <Layers size={11} />
                              <span>Use</span>
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {visibleStickersCount < filteredStickers.length && (
                <div className="pt-4 text-center">
                  <button
                    type="button"
                    onClick={() => setVisibleStickersCount((prev) => Math.min(prev + 60, filteredStickers.length))}
                    className="px-6 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-xs font-mono text-cyan-300 hover:text-white transition-colors cursor-pointer"
                  >
                    Load More Stickers ({visibleStickersCount} of {filteredStickers.length})
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* ============================================================== */}
      {/* SECTION 3: GIFS (100)                                          */}
      {/* ============================================================== */}
      {activeSection === 'gifs' && (
        <div className="space-y-6 animate-fadeIn">
          {/* Search */}
          <div className="relative">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search 100 popular alert GIFs..."
              className="w-full pl-10 pr-9 py-2.5 rounded-xl bg-slate-900/80 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400 transition-colors"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white text-xs p-1 cursor-pointer"
              >
                ✕
              </button>
            )}
          </div>

          {/* GIFs Grid */}
          {filteredGifs.length === 0 ? (
            <div className="p-12 text-center rounded-2xl bg-slate-900/30 border border-slate-800 text-slate-400">
              No GIFs found matching &ldquo;{searchQuery}&rdquo;
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                {filteredGifs.slice(0, visibleGifsCount).map((gif) => {
                  const isCopied = copiedId === gif.id;

                  return (
                    <div
                      key={gif.id}
                      onClick={() => !isProOrTrial && handlePresetAction(gif, 'copy')}
                      className="group rounded-xl bg-slate-900/60 border border-slate-800/80 overflow-hidden flex flex-col justify-between hover:border-slate-700 transition-all shadow-sm relative"
                    >
                      <div className="aspect-square w-full p-2.5 flex items-center justify-center relative bg-slate-950">
                        <img
                          src={gif.url}
                          alt={gif.name}
                          loading="lazy"
                          className="max-w-full max-h-full object-contain group-hover:scale-105 transition-transform duration-200"
                        />

                        {/* Yellow King Icon for Free Users (Pro Plan Required) */}
                        {!isProOrTrial && (
                          <div
                            title="Pro Plan Required"
                            className="absolute top-2 right-2 flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-amber-500/25 border border-amber-400/60 shadow-lg shadow-amber-500/20 backdrop-blur-md"
                          >
                            <Crown size={12} className="text-amber-400 fill-amber-400" />
                            <span className="text-[9px] font-black tracking-wider text-amber-300 font-mono">PRO</span>
                          </div>
                        )}

                        <span className="absolute bottom-2 left-2 px-1.5 py-0.5 rounded bg-black/75 text-[9px] font-mono font-bold text-cyan-300 uppercase">
                          GIF
                        </span>
                      </div>

                      <div className="p-2.5 bg-[#0B0F19] border-t border-slate-800/60 space-y-1.5">
                        <div className="text-[11px] font-semibold text-slate-200 truncate" title={gif.name}>
                          {gif.name}
                        </div>
                        <div className="text-[10px] font-mono text-slate-500">
                          {gif.group}
                        </div>

                        <div className="flex items-center gap-1 pt-1.5 border-t border-slate-800/40">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handlePresetAction(gif, 'copy');
                            }}
                            title="Copy GIF URL"
                            className="flex-1 py-1 px-2 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px] font-mono flex items-center justify-center gap-1 transition-colors cursor-pointer"
                          >
                            {!isProOrTrial ? (
                              <>
                                <Crown size={11} className="text-amber-400 fill-amber-400" />
                                <span>Unlock</span>
                              </>
                            ) : isCopied ? (
                              <>
                                <Check size={11} className="text-emerald-400" />
                                <span>Copied</span>
                              </>
                            ) : (
                              <>
                                <Copy size={11} />
                                <span>Copy</span>
                              </>
                            )}
                          </button>

                          {onSelectForOverlay && isProOrTrial && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handlePresetAction(gif, 'use');
                              }}
                              title="Use in Alert Box"
                              className="px-2 py-1 rounded bg-cyan-950/80 hover:bg-cyan-900 text-cyan-300 text-[10px] font-mono flex items-center gap-1 transition-colors cursor-pointer"
                            >
                              <Layers size={11} />
                              <span>Use</span>
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {visibleGifsCount < filteredGifs.length && (
                <div className="pt-4 text-center">
                  <button
                    type="button"
                    onClick={() => setVisibleGifsCount((prev) => Math.min(prev + 48, filteredGifs.length))}
                    className="px-6 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-xs font-mono text-cyan-300 hover:text-white transition-colors cursor-pointer"
                  >
                    Load More GIFs ({visibleGifsCount} of {filteredGifs.length})
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* ============================================================== */}
      {/* SECTION 4: SOUNDS (18)                                         */}
      {/* ============================================================== */}
      {activeSection === 'sounds' && (
        <div className="space-y-6 animate-fadeIn">
          {/* Search */}
          <div className="relative">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search sounds (e.g. kaching, victory, coin, meme, oof)..."
              className="w-full pl-10 pr-9 py-2.5 rounded-xl bg-slate-900/80 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400 transition-colors"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white text-xs p-1 cursor-pointer"
              >
                ✕
              </button>
            )}
          </div>

          {/* Sound Cards */}
          {filteredSounds.length === 0 ? (
            <div className="p-12 text-center rounded-2xl bg-slate-900/30 border border-slate-800 text-slate-400">
              No sounds found matching &ldquo;{searchQuery}&rdquo;
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {filteredSounds.map((sound) => {
                const isPlaying = playingSoundId === sound.id;
                const isCopied = copiedId === sound.id;

                return (
                  <div
                    key={sound.id}
                    className={`group rounded-2xl bg-[#0B0F19] border transition-all flex flex-col justify-between overflow-hidden shadow-sm relative ${
                      isPlaying
                        ? 'border-cyan-400 shadow-[0_0_20px_rgba(0,240,255,0.2)] ring-1 ring-cyan-400/50'
                        : 'border-slate-800/90 hover:border-slate-700 hover:shadow-md'
                    }`}
                  >
                    <div className="p-4 bg-gradient-to-b from-slate-900/80 to-transparent flex flex-col gap-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="w-12 h-12 rounded-2xl bg-purple-500/15 border border-purple-500/30 flex items-center justify-center text-purple-400 flex-shrink-0">
                          <Volume2 size={22} />
                        </div>

                        <div className="flex items-center gap-1.5 flex-shrink-0">
                          {!isProOrTrial && (
                            <div
                              title="Pro Plan Required"
                              className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-500/25 border border-amber-400/60 shadow-sm"
                            >
                              <Crown size={12} className="text-amber-400 fill-amber-400" />
                              <span className="text-[9px] font-black text-amber-300 font-mono">PRO</span>
                            </div>
                          )}

                          <span className="text-[10px] font-mono text-cyan-400 font-bold px-2 py-0.5 rounded bg-slate-900 border border-slate-800">
                            {sound.duration || 1.5}s
                          </span>
                        </div>
                      </div>

                      <div className="space-y-1">
                        <h4 className="text-sm font-bold text-white group-hover:text-cyan-300 transition-colors line-clamp-1">
                          {sound.name}
                        </h4>
                        <p className="text-xs text-slate-400 font-mono">
                          {sound.group}
                        </p>
                      </div>

                      <div className="flex flex-wrap gap-1">
                        {sound.tags.slice(0, 3).map((tag) => (
                          <span
                            key={tag}
                            className="px-1.5 py-0.5 rounded text-[9px] font-mono bg-slate-900 text-slate-400 border border-slate-800/80"
                          >
                            #{tag}
                          </span>
                        ))}
                      </div>
                    </div>

                    <div className="p-3 bg-slate-950/80 border-t border-slate-800/80 flex items-center gap-2">
                      <button
                        type="button"
                        onClick={(e) => handleTogglePlaySound(sound, e)}
                        className={`flex-1 px-3 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
                          isPlaying
                            ? 'bg-cyan-400 text-slate-950 shadow-md shadow-cyan-400/30 animate-pulse'
                            : 'bg-slate-900 hover:bg-slate-800 text-cyan-300 border border-cyan-500/30 hover:border-cyan-500/60'
                        }`}
                      >
                        {isPlaying ? (
                          <>
                            <Pause size={14} className="fill-current" />
                            <span>Stop</span>
                          </>
                        ) : (
                          <>
                            <Play size={14} className="fill-current" />
                            <span>Preview</span>
                          </>
                        )}
                      </button>

                      <button
                        type="button"
                        onClick={() => handlePresetAction(sound, 'copy')}
                        title="Copy Audio URL"
                        className="p-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-white transition-colors cursor-pointer"
                      >
                        {!isProOrTrial ? (
                          <Crown size={14} className="text-amber-400 fill-amber-400" />
                        ) : isCopied ? (
                          <Check size={14} className="text-emerald-400" />
                        ) : (
                          <Copy size={14} />
                        )}
                      </button>

                      {onSelectForOverlay && isProOrTrial && (
                        <button
                          type="button"
                          onClick={() => handlePresetAction(sound, 'use')}
                          title="Use in Alert Box"
                          className="px-3 py-2 rounded-xl bg-cyan-950/80 hover:bg-cyan-900/80 text-cyan-300 border border-cyan-800/80 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                        >
                          <Layers size={13} />
                          <span>Use</span>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Pro Plan Required Modal */}
      <ProUpgradeModal
        isOpen={showProModal}
        onClose={() => setShowProModal(false)}
        featureName={proModalFeature}
        title="This preset is available on Pro plan"
        telegramContactUrl="https://t.me/hchenheng"
      />
    </div>
  );
};
