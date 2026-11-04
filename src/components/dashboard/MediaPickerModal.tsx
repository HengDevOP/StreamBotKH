'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  X,
  UploadCloud,
  Image as ImageIcon,
  Check,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  Loader2,
  Video,
  Volume2,
  FileText,
  Layers,
  Play,
  Pause,
  Search,
  Sparkles,
  Crown,
  Smile,
  Film,
  Music
} from 'lucide-react';
import { MediaItem, isVideoAsset, isAudioAsset, isImageAsset } from './MediaLibraryManager';
import { mediaService, StorageInfo } from '../../services/mediaService';
import {
  PRESET_GIFS,
  PRESET_STICKERS,
  PRESET_SOUNDS,
  PRESET_STICKER_GROUPS,
  ALL_PRESETS,
  PresetMediaItem
} from '../../data/presetsData';
import { ProUpgradeModal } from './ProUpgradeModal';

interface MediaPickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (mediaUrl: string, item?: MediaItem) => void;
  currentUrl?: string;
  title?: string;
  subtitle?: string;
  currentPlan?: 'free' | 'pro' | string;
  isTrialActive?: boolean;
  isAdmin?: boolean;
  onUpgrade?: () => void;
}

export const MediaPickerModal: React.FC<MediaPickerModalProps> = ({
  isOpen,
  onClose,
  onSelect,
  currentUrl,
  title = 'Choose from Media Library',
  subtitle = 'Select a file from your library, or pick from 500+ stickers, 100 GIFs, and sounds.',
  currentPlan,
  isTrialActive,
  isAdmin,
  onUpgrade
}) => {
  const [mediaList, setMediaList] = useState<MediaItem[]>(() => mediaService.getCachedMedia());
  const [selectedUrl, setSelectedUrl] = useState<string>(currentUrl || '');
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [storageInfo, setStorageInfo] = useState<StorageInfo | null>(() => mediaService.getCachedStorage());

  // Pro Plan / Trial Guard State
  const [showProModal, setShowProModal] = useState(false);
  const [proModalFeature, setProModalFeature] = useState('Stickers & GIF Presets');

  const isProOrTrial =
    currentPlan === 'pro' ||
    currentPlan === 'starter' ||
    Boolean(isTrialActive) ||
    Boolean(isAdmin) ||
    storageInfo?.plan === 'pro';

  // Section Selector: 'uploads' | 'stickers' | 'gifs' | 'sounds'
  const isInitiallyPreset = useMemo<'uploads' | 'stickers' | 'gifs' | 'sounds'>(() => {
    if (!currentUrl) return 'uploads';
    if (currentUrl.includes('/stickers/')) return 'stickers';
    if (currentUrl.includes('/gifs/')) return 'gifs';
    if (currentUrl.includes('/sounds/')) return 'sounds';
    return 'uploads';
  }, [currentUrl]);

  const [activeSection, setActiveSection] = useState<'uploads' | 'stickers' | 'gifs' | 'sounds'>(isInitiallyPreset);

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
      setErrorMsg(null);
      const data = await mediaService.fetchMedia({ force });
      setMediaList(data.media || []);
      if (data.storage) {
        setStorageInfo(data.storage);
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to load Media Library');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!isOpen) return;

    setSelectedUrl(currentUrl || '');
    setErrorMsg(null);
    setSuccessMsg(null);

    // Subscribe to real-time WebSocket updates while modal is open
    const unsubscribe = mediaService.subscribe((data) => {
      setMediaList(data.media || []);
      if (data.storage) {
        setStorageInfo(data.storage);
      }
      setLoading(false);
    });

    // Revalidate in background without blocking
    fetchMedia(false);

    return () => {
      unsubscribe();
    };
  }, [isOpen, currentUrl]);

  if (!isOpen) return null;

  const formatFileSize = (bytes: number) => {
    const b = Number(bytes);
    if (!Number.isFinite(b) || b <= 0) return '0 MB';
    if (b < 1024) return `${b} B`;
    if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`;
    const mb = b / (1024 * 1024);
    return mb % 1 === 0 ? `${mb.toFixed(0)} MB` : `${mb.toFixed(1)} MB`;
  };

  const handleUploadFile = async (file: File) => {
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
      setSuccessMsg(`"${file.name}" uploaded to your Media Library!`);
      setMediaList(mediaService.getCachedMedia());
      if (result.storage) {
        setStorageInfo(result.storage);
      }
      if (result.media?.url) {
        setSelectedUrl(result.media.url);
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
    const file = e.target.files?.[0];
    if (file) {
      handleUploadFile(file);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      handleUploadFile(file);
    }
  };

  const handlePresetSelect = (item: PresetMediaItem) => {
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
    setSelectedUrl(item.url);
  };

  const handlePresetDoubleClick = (item: PresetMediaItem) => {
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
    onSelect(item.url, {
      _id: item.id,
      userId: 'presets',
      filename: item.name,
      storedFilename: item.url.split('/').pop() || '',
      url: item.url,
      fileType: item.category === 'Sounds' ? 'audio/mp3' : item.format === 'gif' ? 'image/gif' : 'image/webp',
      fileSize: 45000,
      createdAt: new Date().toISOString()
    });
    onClose();
  };

  const handleConfirmSelection = () => {
    if (!selectedUrl) return;

    const isPresetUrl = selectedUrl.startsWith('/uploads/presets/');
    if (isPresetUrl && !isProOrTrial) {
      setProModalFeature('Presets Library');
      setShowProModal(true);
      return;
    }

    const found = mediaList.find((m) => m.url === selectedUrl);
    const presetFound = ALL_PRESETS.find((p) => p.url === selectedUrl);
    const itemToPass: any = found || (presetFound ? {
      _id: presetFound.id,
      userId: 'presets',
      filename: presetFound.name,
      storedFilename: presetFound.url.split('/').pop() || '',
      url: presetFound.url,
      fileType: presetFound.category === 'Sounds' ? 'audio/mp3' : presetFound.format === 'gif' ? 'image/gif' : 'image/webp',
      fileSize: 45000,
      createdAt: new Date().toISOString()
    } : undefined);
    onSelect(selectedUrl, itemToPass);
    onClose();
  };

  return (
    <>
      <div
        className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm animate-fadeIn"
        onClick={onClose}
      >
        <div
          className="w-full max-w-4xl max-h-[90vh] rounded-2xl bg-[#090D18] border border-slate-800 shadow-2xl flex flex-col overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Modal Header */}
          <div className="px-5 sm:px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-[#0B0F19]">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
                <ImageIcon size={20} />
              </div>
              <div>
                <h3 className="text-base font-bold text-white font-['Chakra_Petch']">{title}</h3>
                <p className="text-xs text-slate-400">{subtitle}</p>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800/70 transition-colors cursor-pointer"
            >
              <X size={18} />
            </button>
          </div>

          {/* Plan Pro Notice Banner for Free Users */}
          {!isProOrTrial && (
            <div className="px-4 sm:px-6 py-2.5 bg-gradient-to-r from-amber-500/15 via-amber-500/10 to-transparent border-b border-amber-500/30 flex items-center justify-between text-xs text-amber-200">
              <div className="flex items-center gap-2">
                <Crown size={15} className="text-amber-400 fill-amber-400 flex-shrink-0 animate-pulse" />
                <span>
                  <strong>500 Stickers, 100 GIFs &amp; Sounds</strong> are free on <strong>Pro Plan</strong> or <strong>Trial</strong>. Free users will see the King icon.
                </span>
              </div>
              <button
                type="button"
                onClick={() => {
                  setProModalFeature('Presets Library (500 Stickers, 100 GIFs & Sounds)');
                  setShowProModal(true);
                }}
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-xs transition-colors cursor-pointer shadow-sm shadow-amber-500/20 flex-shrink-0"
              >
                <Crown size={12} className="fill-current" />
                <span>Upgrade to Pro</span>
              </button>
            </div>
          )}

          {/* Tab Navigation */}
          <div className="px-4 sm:px-6 py-2.5 bg-[#070A12] border-b border-slate-800 flex items-center gap-2 overflow-x-auto no-scrollbar">
            <button
              type="button"
              onClick={() => setActiveSection('uploads')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold font-mono transition-all flex items-center gap-2 cursor-pointer whitespace-nowrap ${
                activeSection === 'uploads'
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Layers size={13} />
              <span>My Uploads ({mediaList.length})</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveSection('stickers')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold font-mono transition-all flex items-center gap-2 cursor-pointer whitespace-nowrap ${
                activeSection === 'stickers'
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Smile size={13} />
              <span>Stickers (500)</span>
              {!isProOrTrial && (
                <Crown size={12} className="text-amber-400 fill-amber-400 ml-0.5" />
              )}
              <span className="px-1.5 py-0.2 rounded bg-pink-500 text-white text-[8px] font-bold uppercase tracking-wider">
                FACEBOOK
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveSection('gifs')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold font-mono transition-all flex items-center gap-2 cursor-pointer whitespace-nowrap ${
                activeSection === 'gifs'
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Film size={13} />
              <span>GIFs (100)</span>
              {!isProOrTrial && (
                <Crown size={12} className="text-amber-400 fill-amber-400 ml-0.5" />
              )}
            </button>

            <button
              type="button"
              onClick={() => setActiveSection('sounds')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold font-mono transition-all flex items-center gap-2 cursor-pointer whitespace-nowrap ${
                activeSection === 'sounds'
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Music size={13} />
              <span>Sounds ({PRESET_SOUNDS.length})</span>
              {!isProOrTrial && (
                <Crown size={12} className="text-amber-400 fill-amber-400 ml-0.5" />
              )}
            </button>
          </div>

          {/* ============================================================== */}
          {/* TAB 1: MY UPLOADS                                              */}
          {/* ============================================================== */}
          {activeSection === 'uploads' && (
            <>
              {/* Upload Bar + Storage Quota */}
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setDragActive(true);
                }}
                onDragLeave={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setDragActive(false);
                }}
                onDrop={handleDrop}
                className={`px-6 py-4 border-b border-slate-800/80 transition-colors ${
                  dragActive ? 'bg-cyan-500/10 border-cyan-400' : 'bg-slate-950/60'
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="*/*"
                      onChange={handleInputChange}
                      className="hidden"
                    />
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploading}
                      className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-cyan-400 to-cyan-300 hover:from-cyan-300 hover:to-cyan-200 text-slate-950 font-extrabold text-xs transition-all cursor-pointer disabled:opacity-50 shadow-md shadow-cyan-500/10"
                    >
                      {uploading ? (
                        <>
                          <Loader2 size={15} className="animate-spin" />
                          <span>Uploading Into Cloud...</span>
                        </>
                      ) : (
                        <>
                          <UploadCloud size={15} />
                          <span>Upload New Media</span>
                        </>
                      )}
                    </button>

                    <span className="text-[11px] font-mono text-slate-400">
                      MP4, GIF, MP3, WAV, PNG, JPG supported
                    </span>
                  </div>

                  <div className="flex items-center gap-2.5 self-end sm:self-auto">
                    {storageInfo && (
                      <span className="text-[11px] font-mono text-slate-400 px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-800">
                        {(storageInfo.usedBytes / (1024 * 1024)).toFixed(1)} MB / {(storageInfo.limitBytes / (1024 * 1024)).toFixed(0)} MB used ({storageInfo.planLabel})
                      </span>
                    )}
                    <button
                      type="button"
                      onClick={() => fetchMedia(true)}
                      disabled={loading}
                      title="Refresh Library"
                      className="p-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-white transition-colors cursor-pointer"
                    >
                      <RefreshCw size={14} className={loading ? 'animate-spin text-cyan-400' : ''} />
                    </button>
                  </div>
                </div>

                {/* Feedback Banners */}
                {errorMsg && (
                  <div className="mt-3 p-3 rounded-xl bg-red-950/60 border border-red-500/50 text-red-300 text-xs font-mono flex items-center justify-between gap-2 shadow-lg shadow-red-950/40 animate-fadeIn">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="px-2 py-0.5 rounded bg-red-500/20 text-red-400 border border-red-500/40 text-[10px] font-bold uppercase tracking-wider flex-shrink-0 flex items-center gap-1">
                        <AlertCircle size={12} className="text-red-400" />
                        Storage Limit Exceeded
                      </span>
                      <span className="font-sans text-xs">{errorMsg}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setErrorMsg(null)}
                      className="text-red-400 hover:text-white text-xs font-bold px-1.5 py-0.5 cursor-pointer ml-auto flex-shrink-0"
                    >
                      ✕
                    </button>
                  </div>
                )}
                {successMsg && (
                  <div className="mt-3 p-3 rounded-xl bg-emerald-950/50 border border-emerald-500/40 text-emerald-300 text-xs font-mono flex items-center gap-2">
                    <CheckCircle2 size={15} className="text-emerald-400 flex-shrink-0" />
                    <span>{successMsg}</span>
                  </div>
                )}
              </div>

              {/* Media Grid */}
              <div className="flex-1 overflow-y-auto p-4 sm:p-6 min-h-[360px]">
                {loading ? (
                  <div className="py-20 text-center space-y-2 text-slate-400 font-mono text-xs">
                    <Loader2 size={24} className="animate-spin text-cyan-400 mx-auto" />
                    <div>Loading your Media Library...</div>
                  </div>
                ) : mediaList.length === 0 ? (
                  <div className="py-14 text-center space-y-3 border border-dashed border-slate-800 rounded-2xl bg-slate-950/40 p-8">
                    <ImageIcon size={32} className="text-slate-600 mx-auto" />
                    <div className="text-sm font-bold text-white">Your Media Library is Empty</div>
                    <p className="text-xs text-slate-400 max-w-sm mx-auto">
                      Click &ldquo;Upload New Media&rdquo; above to upload your own media, or explore the preset Stickers, GIFs and Sounds above!
                    </p>
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/40 text-xs font-bold transition-colors cursor-pointer"
                    >
                      <UploadCloud size={14} />
                      <span>Upload First File</span>
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                    {mediaList.map((item) => {
                      const isSelected = selectedUrl === item.url;
                      const isVideo = isVideoAsset(item);
                      const isAudio = isAudioAsset(item);
                      const isImage = isImageAsset(item);
                      const extBadge = (item.filename.split('.').pop() || 'FILE').toUpperCase();

                      return (
                        <div
                          key={item._id || item.url}
                          onClick={() => setSelectedUrl(item.url)}
                          onDoubleClick={() => {
                            onSelect(item.url, item);
                            onClose();
                          }}
                          className={`group relative rounded-xl overflow-hidden border-2 transition-all cursor-pointer bg-slate-950 flex flex-col ${
                            isSelected
                              ? 'border-cyan-400 shadow-[0_0_20px_rgba(0,240,255,0.25)]'
                              : 'border-slate-800 hover:border-slate-600'
                          }`}
                        >
                          <div className="aspect-square w-full bg-slate-900/80 flex items-center justify-center overflow-hidden relative p-2">
                            {isVideo ? (
                              <video
                                src={item.url}
                                muted
                                loop
                                playsInline
                                className="w-full h-full object-contain rounded-lg"
                              />
                            ) : isAudio ? (
                              <div className="flex flex-col items-center justify-center gap-2 text-purple-400">
                                <Volume2 size={28} />
                                <span className="text-[10px] font-mono text-slate-300">{extBadge}</span>
                              </div>
                            ) : isImage ? (
                              <img
                                src={item.url}
                                alt={item.filename}
                                loading="lazy"
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                              />
                            ) : (
                              <div className="flex flex-col items-center justify-center gap-2 text-cyan-400">
                                <FileText size={28} />
                                <span className="text-[10px] font-mono text-slate-300">{extBadge}</span>
                              </div>
                            )}

                            <span className="absolute top-2 left-2 px-1.5 py-0.5 rounded text-[9px] font-mono font-bold uppercase bg-black/75 text-slate-200 flex items-center gap-1">
                              {isVideo && <Video size={9} className="text-cyan-400" />}
                              {isAudio && <Volume2 size={9} className="text-purple-400" />}
                              {extBadge}
                            </span>

                            {isSelected && (
                              <div className="absolute top-2 right-2 w-6 h-6 rounded-full bg-cyan-400 text-slate-950 flex items-center justify-center shadow-lg">
                                <Check size={14} strokeWidth={3} />
                              </div>
                            )}
                          </div>
                          <div className="p-2.5 bg-[#0B0F19] border-t border-slate-800/80">
                            <div className="text-[11px] font-semibold text-slate-200 truncate" title={item.filename}>
                              {item.filename}
                            </div>
                            <div className="text-[10px] font-mono text-slate-500 mt-0.5">
                              {formatFileSize(item.fileSize || 0)}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </>
          )}

          {/* ============================================================== */}
          {/* TAB 2: STICKERS (500)                                          */}
          {/* ============================================================== */}
          {activeSection === 'stickers' && (
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 min-h-[360px]">
              {/* Filter & Search Bar */}
              <div className="space-y-3">
                <div className="relative">
                  <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search 500+ stickers (e.g. pusheen, cat, pepe, panda, troll, doge)..."
                    className="w-full pl-10 pr-9 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400 transition-colors"
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => setSearchQuery('')}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white text-xs p-0.5 cursor-pointer"
                    >
                      ✕
                    </button>
                  )}
                </div>

                {/* Group Filter Chips */}
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
                  <button
                    type="button"
                    onClick={() => setStickerGroup('All')}
                    className={`px-3 py-1 rounded-lg text-[11px] font-semibold whitespace-nowrap transition-all flex items-center gap-1 cursor-pointer ${
                      stickerGroup === 'All'
                        ? 'bg-cyan-500 text-slate-950 font-bold shadow-sm'
                        : 'bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-slate-200 border border-slate-800'
                    }`}
                  >
                    <span>All Stickers</span>
                    <span className="text-[9px] px-1 py-0.2 rounded-full font-mono bg-slate-950/30">
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
                        className={`px-3 py-1 rounded-lg text-[11px] font-semibold whitespace-nowrap transition-all flex items-center gap-1 cursor-pointer ${
                          isSelected
                            ? 'bg-cyan-500 text-slate-950 font-bold shadow-sm'
                            : 'bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-slate-200 border border-slate-800'
                        }`}
                      >
                        <span>{grp}</span>
                        <span
                          className={`text-[9px] px-1 py-0.2 rounded-full font-mono ${
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
                <div className="py-14 text-center text-xs text-slate-500 font-mono">
                  No stickers match &ldquo;{searchQuery}&rdquo;
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3">
                    {filteredStickers.slice(0, visibleStickersCount).map((sticker) => {
                      const isSelected = selectedUrl === sticker.url;

                      return (
                        <div
                          key={sticker.id}
                          onClick={() => handlePresetSelect(sticker)}
                          onDoubleClick={() => handlePresetDoubleClick(sticker)}
                          className={`group relative rounded-xl overflow-hidden border transition-all cursor-pointer bg-slate-950 flex flex-col justify-between ${
                            isSelected
                              ? 'border-cyan-400 shadow-[0_0_16px_rgba(0,240,255,0.3)] bg-cyan-950/20'
                              : 'border-slate-800/90 hover:border-slate-600 hover:bg-slate-900/60'
                          }`}
                        >
                          <div className="aspect-square w-full p-2 flex items-center justify-center relative bg-slate-900/40">
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
                                className="absolute top-1.5 right-1.5 flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-amber-500/25 border border-amber-400/60 shadow-lg shadow-amber-500/20 backdrop-blur-md"
                              >
                                <Crown size={12} className="text-amber-400 fill-amber-400" />
                                <span className="text-[9px] font-black tracking-wider text-amber-300 font-mono">PRO</span>
                              </div>
                            )}

                            {isSelected && isProOrTrial && (
                              <div className="absolute top-1.5 right-1.5 w-5 h-5 rounded-full bg-cyan-400 text-slate-950 flex items-center justify-center shadow-lg">
                                <Check size={12} strokeWidth={3} />
                              </div>
                            )}

                            {sticker.isAnimated && (
                              <span className="absolute bottom-1.5 left-1.5 px-1 py-0.2 rounded bg-black/75 text-[8px] font-mono font-bold text-pink-400 uppercase">
                                GIF
                              </span>
                            )}
                          </div>

                          <div className="p-1.5 bg-[#0B0F19] border-t border-slate-800/60">
                            <div className="text-[10px] font-medium text-slate-300 truncate" title={sticker.name}>
                              {sticker.name}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {visibleStickersCount < filteredStickers.length && (
                    <div className="pt-2 text-center">
                      <button
                        type="button"
                        onClick={() => setVisibleStickersCount((prev) => Math.min(prev + 60, filteredStickers.length))}
                        className="px-5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-xs font-mono text-cyan-300 hover:text-white transition-colors cursor-pointer"
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
          {/* TAB 3: GIFS (100)                                              */}
          {/* ============================================================== */}
          {activeSection === 'gifs' && (
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 min-h-[360px]">
              {/* Search Bar */}
              <div className="relative">
                <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search 100 popular alert GIFs..."
                  className="w-full pl-10 pr-9 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400 transition-colors"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white text-xs p-0.5 cursor-pointer"
                  >
                    ✕
                  </button>
                )}
              </div>

              {/* GIFs Grid */}
              {filteredGifs.length === 0 ? (
                <div className="py-14 text-center text-xs text-slate-500 font-mono">
                  No GIFs match &ldquo;{searchQuery}&rdquo;
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3.5">
                    {filteredGifs.slice(0, visibleGifsCount).map((gif) => {
                      const isSelected = selectedUrl === gif.url;

                      return (
                        <div
                          key={gif.id}
                          onClick={() => handlePresetSelect(gif)}
                          onDoubleClick={() => handlePresetDoubleClick(gif)}
                          className={`group relative rounded-xl overflow-hidden border transition-all cursor-pointer bg-slate-950 flex flex-col justify-between ${
                            isSelected
                              ? 'border-cyan-400 shadow-[0_0_18px_rgba(0,240,255,0.3)] bg-cyan-950/20'
                              : 'border-slate-800/90 hover:border-slate-600 hover:bg-slate-900/60'
                          }`}
                        >
                          <div className="aspect-square w-full p-2 flex items-center justify-center relative bg-slate-900/40">
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

                            {isSelected && isProOrTrial && (
                              <div className="absolute top-2 right-2 w-6 h-6 rounded-full bg-cyan-400 text-slate-950 flex items-center justify-center shadow-lg">
                                <Check size={13} strokeWidth={3} />
                              </div>
                            )}

                            <span className="absolute bottom-2 left-2 px-1.5 py-0.5 rounded bg-black/75 text-[9px] font-mono font-bold text-cyan-300 uppercase">
                              GIF
                            </span>
                          </div>

                          <div className="p-2 bg-[#0B0F19] border-t border-slate-800/60">
                            <div className="text-[11px] font-semibold text-slate-200 truncate" title={gif.name}>
                              {gif.name}
                            </div>
                            <div className="text-[10px] font-mono text-slate-500 mt-0.5">
                              {gif.group}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {visibleGifsCount < filteredGifs.length && (
                    <div className="pt-2 text-center">
                      <button
                        type="button"
                        onClick={() => setVisibleGifsCount((prev) => Math.min(prev + 48, filteredGifs.length))}
                        className="px-5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-xs font-mono text-cyan-300 hover:text-white transition-colors cursor-pointer"
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
          {/* TAB 4: SOUNDS (18)                                             */}
          {/* ============================================================== */}
          {activeSection === 'sounds' && (
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 min-h-[360px]">
              {/* Search */}
              <div className="relative">
                <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search preset sounds (e.g. kaching, victory, coin, meme, oof)..."
                  className="w-full pl-10 pr-9 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400 transition-colors"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white text-xs p-0.5 cursor-pointer"
                  >
                    ✕
                  </button>
                )}
              </div>

              {/* Sound Cards */}
              {filteredSounds.length === 0 ? (
                <div className="py-12 text-center text-xs text-slate-500 font-mono">
                  No sounds match &ldquo;{searchQuery}&rdquo;
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                  {filteredSounds.map((sound) => {
                    const isSelected = selectedUrl === sound.url;
                    const isPlaying = playingSoundId === sound.id;

                    return (
                      <div
                        key={sound.id}
                        onClick={() => handlePresetSelect(sound)}
                        onDoubleClick={() => handlePresetDoubleClick(sound)}
                        className={`group p-3.5 rounded-xl border transition-all cursor-pointer bg-slate-950/90 flex flex-col justify-between gap-3 relative ${
                          isSelected
                            ? 'border-cyan-400 shadow-[0_0_16px_rgba(0,240,255,0.2)] bg-cyan-950/15'
                            : 'border-slate-800/90 hover:border-slate-700 hover:bg-slate-900/50'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div className="w-9 h-9 rounded-xl bg-purple-500/15 border border-purple-500/30 flex items-center justify-center text-purple-400 flex-shrink-0">
                              <Volume2 size={16} />
                            </div>
                            <div className="min-w-0">
                              <div className="text-xs font-bold text-white truncate" title={sound.name}>
                                {sound.name}
                              </div>
                              <div className="text-[10px] font-mono text-slate-400">
                                {sound.group} • {sound.duration || 1.5}s
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-1.5 flex-shrink-0">
                            {!isProOrTrial && (
                              <div
                                title="Pro Plan Required"
                                className="flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-amber-500/25 border border-amber-400/60 shadow-sm"
                              >
                                <Crown size={11} className="text-amber-400 fill-amber-400" />
                                <span className="text-[8px] font-black text-amber-300 font-mono">PRO</span>
                              </div>
                            )}

                            {isSelected && isProOrTrial && (
                              <div className="w-5 h-5 rounded-full bg-cyan-400 text-slate-950 flex items-center justify-center shadow-md">
                                <Check size={12} strokeWidth={3} />
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center justify-between pt-2 border-t border-slate-800/60">
                          <button
                            type="button"
                            onClick={(e) => handleTogglePlaySound(sound, e)}
                            className={`px-3 py-1 rounded-lg text-[10px] font-bold font-mono flex items-center gap-1.5 transition-colors cursor-pointer ${
                              isPlaying
                                ? 'bg-cyan-400 text-slate-950 animate-pulse'
                                : 'bg-slate-900 hover:bg-slate-800 text-cyan-300 border border-cyan-500/30'
                            }`}
                          >
                            {isPlaying ? (
                              <>
                                <Pause size={10} className="fill-current" />
                                <span>Stop</span>
                              </>
                            ) : (
                              <>
                                <Play size={10} className="fill-current" />
                                <span>Preview</span>
                              </>
                            )}
                          </button>

                          <span className="text-[9px] font-mono text-slate-500">
                            {isProOrTrial ? 'Double-click to apply' : 'Pro plan required'}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Modal Footer */}
          <div className="px-5 sm:px-6 py-4 border-t border-slate-800 bg-[#0B0F19] flex items-center justify-between gap-4">
            <div className="text-xs text-slate-400 truncate">
              {selectedUrl ? (
                <span className="font-mono text-cyan-400">Selected: {selectedUrl.split('/').pop()}</span>
              ) : (
                <span>Click any item above to select it</span>
              )}
            </div>

            <div className="flex items-center gap-3 flex-shrink-0">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-xs font-semibold text-slate-300 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmSelection}
                disabled={!selectedUrl}
                className="px-5 py-2 rounded-xl bg-cyan-400 hover:bg-cyan-300 disabled:opacity-40 text-slate-950 font-extrabold text-xs transition-all cursor-pointer"
              >
                Apply Selected Media
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Pro Plan Required Modal */}
      <ProUpgradeModal
        isOpen={showProModal}
        onClose={() => setShowProModal(false)}
        featureName={proModalFeature}
        title="This preset is available on Pro plan"
        telegramContactUrl="https://t.me/hchenheng"
      />
    </>
  );
};
