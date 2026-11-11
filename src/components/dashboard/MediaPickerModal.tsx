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
  Music,
  Filter,
  Edit2
} from 'lucide-react';
import { MediaItem, isVideoAsset, isAudioAsset, isImageAsset } from './MediaLibraryManager';
import { mediaService, StorageInfo } from '../../services/mediaService';
import {
  PRESET_GIFS,
  PRESET_STICKERS,
  PRESET_SOUNDS,
  PRESET_STICKER_GROUPS,
  PRESET_TEMPLATES,
  PRESET_TEMPLATE_GROUPS,
  PRESET_MLBB,
  PRESET_MLBB_GROUPS,
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
  initialSection?: 'uploads' | 'template' | 'mlbb' | 'stickers' | 'gifs' | 'sounds';
  filterMode?: 'all' | 'audio' | 'image';
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
  onUpgrade,
  initialSection,
  filterMode = 'all'
}) => {
  const isAudioOnly = filterMode === 'audio' || initialSection === 'sounds';
  const [mediaList, setMediaList] = useState<MediaItem[]>(() => mediaService.getCachedMedia());
  const audioUploadsCount = useMemo(() => mediaList.filter((m) => isAudioAsset(m)).length, [mediaList]);
  const [selectedUrl, setSelectedUrl] = useState<string>(currentUrl || '');
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [storageInfo, setStorageInfo] = useState<StorageInfo | null>(() => mediaService.getCachedStorage());
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState<string>('');
  const [savingRenameId, setSavingRenameId] = useState<string | null>(null);

  // Pro Plan / Trial Guard State
  const [showProModal, setShowProModal] = useState(false);
  const [proModalFeature, setProModalFeature] = useState('Stickers & GIF Presets');

  const isProOrTrial = true; // All media assets, stickers, GIFs and audio presets unlocked for all plans

  // Section Selector: 'uploads' | 'template' | 'mlbb' | 'stickers' | 'gifs' | 'sounds'
  const isInitiallyPreset = useMemo<'uploads' | 'template' | 'mlbb' | 'stickers' | 'gifs' | 'sounds'>(() => {
    if (isAudioOnly) {
      if (currentUrl && !currentUrl.includes('/sounds/') && !currentUrl.includes('/uploads/presets/')) {
        return 'uploads';
      }
      return 'sounds';
    }
    if (initialSection) return initialSection;
    if (!currentUrl) return 'template';
    if (currentUrl.includes('/mlbb/')) return 'mlbb';
    if (currentUrl.includes('/sbkh/')) return 'template';
    if (currentUrl.includes('/stickers/')) return 'stickers';
    if (currentUrl.includes('/gifs/')) return 'gifs';
    if (currentUrl.includes('/sounds/')) return 'sounds';
    return 'uploads';
  }, [currentUrl, initialSection, isAudioOnly]);

  const [activeSection, setActiveSection] = useState<'uploads' | 'template' | 'mlbb' | 'stickers' | 'gifs' | 'sounds'>(isInitiallyPreset);

  // Filter inside uploads tab: 'all' | 'images' | 'audio' | 'video'
  const [uploadsFilter, setUploadsFilter] = useState<'all' | 'images' | 'audio' | 'video'>(
    isAudioOnly ? 'audio' : filterMode === 'image' ? 'images' : 'all'
  );

  useEffect(() => {
    if (isOpen) {
      if (isAudioOnly) {
        setUploadsFilter('audio');
        if (currentUrl && mediaList.some((m) => m.url === currentUrl && isAudioAsset(m))) {
          setActiveSection('uploads');
        } else {
          setActiveSection('sounds');
        }
      } else if (initialSection) {
        setActiveSection(initialSection);
        if (initialSection === 'template' || initialSection === 'mlbb' || initialSection === 'stickers' || initialSection === 'gifs' || filterMode === 'image') {
          setUploadsFilter('images');
        }
      } else if (isInitiallyPreset) {
        setActiveSection(isInitiallyPreset);
      }
    }
  }, [isOpen, initialSection, isInitiallyPreset, isAudioOnly, filterMode]);

  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState('');
  const [templateGroup, setTemplateGroup] = useState<string>('All');
  const [mlbbFilter, setMlbbFilter] = useState<'All' | 'Animated GIF' | 'HD Sticker (PNG)'>('All');
  const [stickerGroup, setStickerGroup] = useState<string>('All');
  const [soundGroup, setSoundGroup] = useState<string>('All');
  const [playingSoundId, setPlayingSoundId] = useState<string | null>(null);
  const [visibleMlbbCount, setVisibleMlbbCount] = useState(48);
  const [visibleStickersCount, setVisibleStickersCount] = useState(60);
  const [visibleGifsCount, setVisibleGifsCount] = useState(48);
  const activeAudioRef = useRef<HTMLAudioElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Reset pagination on filter change
  useEffect(() => {
    setVisibleMlbbCount(48);
  }, [mlbbFilter, searchQuery]);

  useEffect(() => {
    setVisibleStickersCount(60);
  }, [stickerGroup, searchQuery]);

  useEffect(() => {
    setVisibleGifsCount(48);
  }, [searchQuery]);

  // Universal Audio Player (Handles both presets and user uploads)
  const handleTogglePlaySound = (url: string, id: string, e?: React.MouseEvent) => {
    if (e) {
      e.stopPropagation();
    }
    if (playingSoundId === id) {
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

    const audio = new Audio(url);
    activeAudioRef.current = audio;
    setPlayingSoundId(id);

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

  // Filtered Templates (SBKH HD PNG & Animated GIF)
  const filteredTemplates = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return PRESET_TEMPLATES.filter((item) => {
      const matchGroup = templateGroup === 'All' || item.group === templateGroup;
      const matchQuery =
        !q ||
        item.name.toLowerCase().includes(q) ||
        item.tags.some((t) => t.toLowerCase().includes(q));
      return matchGroup && matchQuery;
    });
  }, [templateGroup, searchQuery]);

  // Filtered MLBB Emotes (Layla)
  const filteredMlbb = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return PRESET_MLBB.filter((item) => {
      const matchType =
        mlbbFilter === 'All'
          ? true
          : mlbbFilter === 'Animated GIF'
          ? item.isAnimated
          : !item.isAnimated;
      const matchQuery =
        !q ||
        item.name.toLowerCase().includes(q) ||
        item.group.toLowerCase().includes(q) ||
        (item.type && item.type.toLowerCase().includes(q)) ||
        item.tags.some((t) => t.toLowerCase().includes(q));
      return matchType && matchQuery;
    });
  }, [mlbbFilter, searchQuery]);

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
      const matchGroup = soundGroup === 'All' || item.group === soundGroup;
      const matchQuery =
        !q ||
        item.name.toLowerCase().includes(q) ||
        item.group.toLowerCase().includes(q) ||
        item.tags.some((t) => t.toLowerCase().includes(q));
      return matchGroup && matchQuery;
    });
  }, [soundGroup, searchQuery]);

  // Unique Sound Groups
  const soundGroups = useMemo(() => {
    const set = new Set<string>();
    PRESET_SOUNDS.forEach((s) => {
      if (s.group) set.add(s.group);
    });
    return Array.from(set);
  }, []);

  // Filtered Uploads
  const filteredUploads = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return mediaList.filter((m) => {
      const matchQuery = !q || m.filename.toLowerCase().includes(q);
      if (!matchQuery) return false;

      if (isAudioOnly) {
        return isAudioAsset(m);
      }
      if (uploadsFilter === 'images') {
        return isImageAsset(m);
      }
      if (uploadsFilter === 'audio') {
        return isAudioAsset(m);
      }
      if (uploadsFilter === 'video') {
        return isVideoAsset(m);
      }
      return true;
    });
  }, [mediaList, searchQuery, uploadsFilter, isAudioOnly]);

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

  const handleStartRename = (item: MediaItem, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const dotIdx = item.filename.lastIndexOf('.');
    const baseName = dotIdx > 0 ? item.filename.slice(0, dotIdx) : item.filename;
    setEditingId(item._id);
    setEditingName(baseName);
  };

  const handleCancelRename = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setEditingId(null);
    setEditingName('');
  };

  const handleSaveRename = async (item: MediaItem, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const trimmed = editingName.trim();
    if (!trimmed) {
      handleCancelRename();
      return;
    }

    const dotIdx = item.filename.lastIndexOf('.');
    const ext = dotIdx > 0 ? item.filename.slice(dotIdx) : '';
    const nextFilename =
      ext && !trimmed.toLowerCase().endsWith(ext.toLowerCase())
        ? `${trimmed}${ext}`
        : trimmed;

    if (nextFilename === item.filename) {
      handleCancelRename();
      return;
    }

    setSavingRenameId(item._id);
    setErrorMsg(null);
    try {
      const updated = await mediaService.renameMedia(item._id, nextFilename);
      setMediaList((prev) =>
        prev.map((m) =>
          m._id === item._id ? { ...m, filename: updated?.filename || nextFilename } : m
        )
      );
      setSuccessMsg(`Renamed to "${updated?.filename || nextFilename}"!`);
      setTimeout(() => setSuccessMsg(null), 2500);
      handleCancelRename();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to rename file.');
    } finally {
      setSavingRenameId(null);
    }
  };

  const handleUploadFile = async (file: File) => {
    setErrorMsg(null);
    setSuccessMsg(null);

    if (isAudioOnly && !isAudioAsset({ fileType: file.type, url: file.name, filename: file.name })) {
      setErrorMsg('Only audio files (MP3, WAV, OGG, M4A, AAC, FLAC) are allowed for sound alerts.');
      return;
    }

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
    if (!isProOrTrial && item.category !== 'Template' && item.category !== 'MLBB Emote') {
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
    if (!isProOrTrial && item.category !== 'Template' && item.category !== 'MLBB Emote') {
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
      fileType:
        item.category === 'Sounds'
          ? 'audio/mp3'
          : item.format === 'gif'
          ? 'image/gif'
          : item.format === 'png'
          ? 'image/png'
          : 'image/webp',
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
      fileType:
        presetFound.category === 'Sounds'
          ? 'audio/mp3'
          : presetFound.format === 'gif'
          ? 'image/gif'
          : presetFound.format === 'png'
          ? 'image/png'
          : 'image/webp',
      fileSize: 45000,
      createdAt: new Date().toISOString()
    } : undefined);
    onSelect(selectedUrl, itemToPass);
    onClose();
  };

  return (
    <>
      <div
        className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/80 backdrop-blur-md animate-fadeIn"
        onClick={onClose}
      >
        <div
          className="w-full max-w-5xl h-full sm:h-auto max-h-[92vh] rounded-2xl sm:rounded-3xl bg-[#090D18] border border-cyan-500/25 shadow-[0_20px_50px_rgba(0,0,0,0.85)] flex flex-col overflow-hidden text-slate-100"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Modal Header */}
          <div className="px-4 sm:px-6 py-3.5 sm:py-4 border-b border-slate-800 flex items-center justify-between bg-[#0B0F19] flex-shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-cyan-500/20 to-blue-600/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 shadow-sm flex-shrink-0">
                {activeSection === 'sounds' ? (
                  <Volume2 size={20} />
                ) : activeSection === 'stickers' ? (
                  <Smile size={20} />
                ) : activeSection === 'gifs' ? (
                  <Film size={20} />
                ) : activeSection === 'mlbb' ? (
                  <Sparkles size={20} className="text-amber-400" />
                ) : (
                  <ImageIcon size={20} />
                )}
              </div>
              <div>
                <h3 className="text-base sm:text-lg font-bold text-white font-['Chakra_Petch'] flex items-center gap-2">
                  <span>{title}</span>
                  <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 text-[10px] font-mono uppercase font-bold tracking-wider">
                    <Sparkles size={10} />
                    Global Media Library
                  </span>
                </h3>
                <p className="text-xs text-slate-400 line-clamp-1">{subtitle}</p>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="p-2 sm:p-2.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 border border-slate-800/80 transition-colors cursor-pointer flex-shrink-0"
              title="Close"
            >
              <X size={18} />
            </button>
          </div>

          {/* Plan Pro Notice Banner for Free Users */}
          {!isProOrTrial && (
            <div className="px-4 sm:px-6 py-2 bg-gradient-to-r from-amber-500/15 via-amber-500/10 to-transparent border-b border-amber-500/30 flex items-center justify-between text-xs text-amber-200 flex-shrink-0">
              <div className="flex items-center gap-2">
                <Crown size={15} className="text-amber-400 fill-amber-400 flex-shrink-0 animate-pulse" />
                <span className="text-[11px] sm:text-xs">
                  <strong>500 Stickers, 100 GIFs &amp; Sounds</strong> are free on <strong>Pro Plan</strong> or <strong>Trial</strong>. Free users will see the King icon.
                </span>
              </div>
              <button
                type="button"
                onClick={() => {
                  setProModalFeature('Presets Library (500 Stickers, 100 GIFs & Sounds)');
                  setShowProModal(true);
                }}
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-xs transition-colors cursor-pointer shadow-sm shadow-amber-500/20 flex-shrink-0 ml-2"
              >
                <Crown size={12} className="fill-current" />
                <span>Upgrade</span>
              </button>
            </div>
          )}

          {/* Section Selector Tabs Bar */}
          <div className="px-3 sm:px-6 py-2.5 bg-[#070A12] border-b border-slate-800 flex flex-wrap sm:flex-nowrap items-center gap-1.5 sm:gap-2 overflow-x-auto no-scrollbar flex-shrink-0">
            {!isAudioOnly && (
              <>
                <button
                  type="button"
                  onClick={() => setActiveSection('template')}
                  className={`flex-1 sm:flex-initial justify-center px-2.5 sm:px-3.5 py-1.5 rounded-xl text-[11px] sm:text-xs font-bold font-mono transition-all flex items-center gap-1.5 sm:gap-2 cursor-pointer whitespace-nowrap ${
                    activeSection === 'template'
                      ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/50 shadow-[0_0_12px_rgba(0,240,255,0.2)]'
                      : 'text-slate-400 hover:text-white hover:bg-slate-900 border border-transparent'
                  }`}
                >
                  <Sparkles size={14} className={`flex-shrink-0 ${activeSection === 'template' ? 'text-white' : ''}`} />
                  <span>Template ({PRESET_TEMPLATES.length})</span>
                  <span className="px-1.5 py-0.2 rounded bg-purple-500/90 text-white text-[8px] font-bold uppercase tracking-wider flex-shrink-0">
                    HD + GIF
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveSection('mlbb')}
                  className={`flex-1 sm:flex-initial justify-center px-2.5 sm:px-3.5 py-1.5 rounded-xl text-[11px] sm:text-xs font-bold font-mono transition-all flex items-center gap-1.5 sm:gap-2 cursor-pointer whitespace-nowrap ${
                    activeSection === 'mlbb'
                      ? 'bg-amber-500/20 text-amber-300 border border-amber-500/50 shadow-[0_0_12px_rgba(245,158,11,0.25)]'
                      : 'text-slate-400 hover:text-white hover:bg-slate-900 border border-transparent'
                  }`}
                >
                  <Sparkles size={14} className={`flex-shrink-0 ${activeSection === 'mlbb' ? 'text-amber-400' : ''}`} />
                  <span>MLBB Emote ({PRESET_MLBB.length})</span>
                  <span className="px-1.5 py-0.2 rounded bg-amber-500/90 text-slate-950 text-[8px] font-black uppercase tracking-wider flex-shrink-0">
                    LAYLA
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveSection('stickers')}
                  className={`flex-1 sm:flex-initial justify-center px-2.5 sm:px-3.5 py-1.5 rounded-xl text-[11px] sm:text-xs font-bold font-mono transition-all flex items-center gap-1.5 sm:gap-2 cursor-pointer whitespace-nowrap ${
                    activeSection === 'stickers'
                      ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/50 shadow-[0_0_12px_rgba(0,240,255,0.2)]'
                      : 'text-slate-400 hover:text-white hover:bg-slate-900 border border-transparent'
                  }`}
                >
                  <Smile size={14} className={`flex-shrink-0 ${activeSection === 'stickers' ? 'text-white' : ''}`} />
                  <span>Stickers (500)</span>
                  <span className="px-1.5 py-0.2 rounded bg-pink-500/90 text-white text-[8px] font-bold uppercase tracking-wider flex-shrink-0">
                    FB
                  </span>
                  {!isProOrTrial && (
                    <Crown size={12} className="text-amber-400 fill-amber-400 ml-0.5 flex-shrink-0" />
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => setActiveSection('gifs')}
                  className={`flex-1 sm:flex-initial justify-center px-2.5 sm:px-3.5 py-1.5 rounded-xl text-[11px] sm:text-xs font-bold font-mono transition-all flex items-center gap-1.5 sm:gap-2 cursor-pointer whitespace-nowrap ${
                    activeSection === 'gifs'
                      ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/50 shadow-[0_0_12px_rgba(0,240,255,0.2)]'
                      : 'text-slate-400 hover:text-white hover:bg-slate-900 border border-transparent'
                  }`}
                >
                  <Film size={14} className={`flex-shrink-0 ${activeSection === 'gifs' ? 'text-white' : ''}`} />
                  <span>GIFs (100)</span>
                  <span className="hidden sm:inline-block px-1.5 py-0.2 rounded bg-cyan-500/30 text-cyan-300 text-[8px] font-bold uppercase tracking-wider">
                    TRENDING
                  </span>
                  {!isProOrTrial && (
                    <Crown size={12} className="text-amber-400 fill-amber-400 ml-0.5 flex-shrink-0" />
                  )}
                </button>
              </>
            )}

            {filterMode !== 'image' && (
              <button
                type="button"
                onClick={() => setActiveSection('sounds')}
                className={`flex-1 sm:flex-initial justify-center px-2.5 sm:px-3.5 py-1.5 rounded-xl text-[11px] sm:text-xs font-bold font-mono transition-all flex items-center gap-1.5 sm:gap-2 cursor-pointer whitespace-nowrap ${
                  activeSection === 'sounds'
                    ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/50 shadow-[0_0_12px_rgba(0,240,255,0.2)]'
                    : 'text-slate-400 hover:text-white hover:bg-slate-900 border border-transparent'
                }`}
              >
                <Music size={14} className={`flex-shrink-0 ${activeSection === 'sounds' ? 'text-white' : ''}`} />
                <span>Sounds ({PRESET_SOUNDS.length})</span>
                <span className="px-1.5 py-0.2 rounded bg-purple-500/30 text-purple-300 text-[8px] font-bold uppercase tracking-wider flex-shrink-0">
                  SFX
                </span>
                {!isProOrTrial && (
                  <Crown size={12} className="text-amber-400 fill-amber-400 ml-0.5 flex-shrink-0" />
                )}
              </button>
            )}

            <button
              type="button"
              onClick={() => setActiveSection('uploads')}
              className={`flex-1 sm:flex-initial justify-center px-2.5 sm:px-3.5 py-1.5 rounded-xl text-[11px] sm:text-xs font-bold font-mono transition-all flex items-center gap-1.5 sm:gap-2 cursor-pointer whitespace-nowrap ${
                activeSection === 'uploads'
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/50 shadow-[0_0_12px_rgba(0,240,255,0.2)]'
                  : 'text-slate-400 hover:text-white hover:bg-slate-900 border border-transparent'
              }`}
            >
              {isAudioOnly ? (
                <Volume2 size={14} className={`flex-shrink-0 ${activeSection === 'uploads' ? 'text-white' : ''}`} />
              ) : (
                <Layers size={14} className={`flex-shrink-0 ${activeSection === 'uploads' ? 'text-white' : ''}`} />
              )}
              <span>
                {isAudioOnly ? `My Uploads (${audioUploadsCount})` : `My Uploads (${mediaList.length})`}
              </span>
              {isAudioOnly && (
                <span className="px-1.5 py-0.2 rounded bg-cyan-500/20 text-cyan-300 text-[8px] font-bold uppercase tracking-wider flex-shrink-0">
                  MP3 • WAV
                </span>
              )}
            </button>
          </div>

          {/* ============================================================== */}
          {/* TAB 0: TEMPLATE (SBKH HD PNG & ANIMATED GIF)                   */}
          {/* ============================================================== */}
          {activeSection === 'template' && (
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 min-h-[360px]">
              {/* Filter & Search Bar */}
              <div className="space-y-3">
                <div className="relative">
                  <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search SBKH mascot templates (e.g. hi, thank you, love, gg, live, gaming, subscribe)..."
                    className="w-full pl-10 pr-9 py-2.5 rounded-xl bg-slate-900/90 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400 transition-colors"
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

                {/* Group Filter Chips */}
                <div className="flex flex-wrap items-center gap-1.5 pb-1">
                  <button
                    type="button"
                    onClick={() => setTemplateGroup('All')}
                    className={`flex-1 sm:flex-initial justify-center px-3 py-1.5 rounded-xl text-[11px] font-semibold whitespace-nowrap transition-all flex items-center gap-1.5 cursor-pointer ${
                      templateGroup === 'All'
                        ? 'bg-cyan-500 text-slate-950 font-bold shadow-sm'
                        : 'bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-slate-200 border border-slate-800'
                    }`}
                  >
                    <span>All Templates</span>
                    <span className="text-[9px] px-1.5 py-0.2 rounded-full font-mono bg-slate-950/30">
                      {PRESET_TEMPLATES.length}
                    </span>
                  </button>

                  {PRESET_TEMPLATE_GROUPS.map((grp) => {
                    const count = PRESET_TEMPLATES.filter((t) => t.group === grp).length;
                    const isSelected = templateGroup === grp;
                    return (
                      <button
                        key={grp}
                        type="button"
                        onClick={() => setTemplateGroup(grp)}
                        className={`flex-1 sm:flex-initial justify-center px-3 py-1.5 rounded-xl text-[11px] font-semibold whitespace-nowrap transition-all flex items-center gap-1.5 cursor-pointer ${
                          isSelected
                            ? 'bg-cyan-500 text-slate-950 font-bold shadow-sm'
                            : 'bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-slate-200 border border-slate-800'
                        }`}
                      >
                        <span>{grp}</span>
                        <span
                          className={`text-[9px] px-1.5 py-0.2 rounded-full font-mono ${
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

              {/* Templates Grid */}
              {filteredTemplates.length === 0 ? (
                <div className="py-16 text-center text-xs text-slate-500 font-mono">
                  No templates match &ldquo;{searchQuery}&rdquo;
                </div>
              ) : (
                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-7 gap-2.5 sm:gap-3">
                  {filteredTemplates.map((tpl) => {
                    const isSelected = selectedUrl === tpl.url;

                    return (
                      <div
                        key={tpl.id}
                        onClick={() => handlePresetSelect(tpl)}
                        onDoubleClick={() => handlePresetDoubleClick(tpl)}
                        className={`group relative rounded-2xl overflow-hidden border transition-all cursor-pointer bg-slate-950 flex flex-col justify-between ${
                          isSelected
                            ? 'border-cyan-400 ring-2 ring-cyan-400/40 shadow-[0_0_20px_rgba(0,240,255,0.35)] bg-cyan-950/25'
                            : 'border-slate-800/90 hover:border-slate-600 hover:bg-slate-900/60'
                        }`}
                      >
                        <div className="aspect-square w-full p-2.5 flex items-center justify-center relative bg-slate-900/30">
                          <img
                            src={tpl.url}
                            alt={tpl.name}
                            loading="lazy"
                            className="max-w-full max-h-full object-contain group-hover:scale-110 transition-transform duration-200"
                          />

                          {isSelected && (
                            <div className="absolute top-1.5 right-1.5 w-5 h-5 rounded-full bg-cyan-400 text-slate-950 flex items-center justify-center shadow-lg">
                              <Check size={12} strokeWidth={3} />
                            </div>
                          )}

                          <span
                            className={`absolute bottom-1.5 left-1.5 px-1 py-0.2 rounded text-[8px] font-mono font-bold uppercase ${
                              tpl.isAnimated
                                ? 'bg-pink-500/20 text-pink-300 border border-pink-500/40'
                                : 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                            }`}
                          >
                            {tpl.isAnimated ? 'GIF' : 'HD'}
                          </span>
                        </div>

                        <div className="p-1.5 bg-[#0B0F19] border-t border-slate-800/60">
                          <div className="text-[10px] font-medium text-slate-300 truncate" title={tpl.name}>
                            {tpl.name}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* ============================================================== */}
          {/* TAB 0.5: MLBB EMOTE (LAYLA ANIMATED GIF & HD STICKER)          */}
          {/* ============================================================== */}
          {activeSection === 'mlbb' && (
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 min-h-[360px]">
              {/* Filter & Search Bar */}
              <div className="space-y-3">
                <div className="relative">
                  <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search MLBB Layla emotes (e.g. hi, laugh, rage, cry, heart, sleepy, boba, drink, cool, victory)..."
                    className="w-full pl-10 pr-9 py-2.5 rounded-xl bg-slate-900/90 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-400 transition-colors"
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

                {/* Subcategory & Filter Chips */}
                <div className="flex flex-wrap items-center gap-1.5 pb-1">
                  <div className="flex items-center gap-1.5 mr-1">
                    <span className="text-[10px] font-mono uppercase font-bold text-slate-500">Category:</span>
                    <span className="px-2 py-0.5 rounded-lg bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[10px] font-mono font-bold uppercase">
                      MLBB Emote
                    </span>
                    <span className="text-[10px] font-mono uppercase font-bold text-slate-500 ml-1">Type:</span>
                    <span className="px-2 py-0.5 rounded-lg bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[10px] font-mono font-bold uppercase">
                      Layla
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() => setMlbbFilter('All')}
                    className={`flex-1 sm:flex-initial justify-center px-3 py-1.5 rounded-xl text-[11px] font-semibold whitespace-nowrap transition-all flex items-center gap-1.5 cursor-pointer ${
                      mlbbFilter === 'All'
                        ? 'bg-amber-500 text-slate-950 font-bold shadow-sm'
                        : 'bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-slate-200 border border-slate-800'
                    }`}
                  >
                    <span>All Layla Emotes</span>
                    <span className="text-[9px] px-1.5 py-0.2 rounded-full font-mono bg-slate-950/30">
                      {PRESET_MLBB.length}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setMlbbFilter('Animated GIF')}
                    className={`flex-1 sm:flex-initial justify-center px-3 py-1.5 rounded-xl text-[11px] font-semibold whitespace-nowrap transition-all flex items-center gap-1.5 cursor-pointer ${
                      mlbbFilter === 'Animated GIF'
                        ? 'bg-amber-500 text-slate-950 font-bold shadow-sm'
                        : 'bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-slate-200 border border-slate-800'
                    }`}
                  >
                    <span>Layla Animated (GIF)</span>
                    <span
                      className={`text-[9px] px-1.5 py-0.2 rounded-full font-mono ${
                        mlbbFilter === 'Animated GIF' ? 'bg-slate-950/30 text-slate-950 font-bold' : 'bg-slate-800 text-slate-400'
                      }`}
                    >
                      {PRESET_MLBB.filter((m) => m.isAnimated).length}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setMlbbFilter('HD Sticker (PNG)')}
                    className={`flex-1 sm:flex-initial justify-center px-3 py-1.5 rounded-xl text-[11px] font-semibold whitespace-nowrap transition-all flex items-center gap-1.5 cursor-pointer ${
                      mlbbFilter === 'HD Sticker (PNG)'
                        ? 'bg-amber-500 text-slate-950 font-bold shadow-sm'
                        : 'bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-slate-200 border border-slate-800'
                    }`}
                  >
                    <span>Layla HD Stickers (PNG)</span>
                    <span
                      className={`text-[9px] px-1.5 py-0.2 rounded-full font-mono ${
                        mlbbFilter === 'HD Sticker (PNG)' ? 'bg-slate-950/30 text-slate-950 font-bold' : 'bg-slate-800 text-slate-400'
                      }`}
                    >
                      {PRESET_MLBB.filter((m) => !m.isAnimated).length}
                    </span>
                  </button>
                </div>
              </div>

              {/* Emotes Grid */}
              {filteredMlbb.length === 0 ? (
                <div className="py-16 text-center text-xs text-slate-500 font-mono">
                  No Layla emotes match &ldquo;{searchQuery}&rdquo;
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-7 gap-2.5 sm:gap-3">
                    {filteredMlbb.slice(0, visibleMlbbCount).map((item) => {
                      const isSelected = selectedUrl === item.url;

                      return (
                        <div
                          key={item.id}
                          onClick={() => handlePresetSelect(item)}
                          onDoubleClick={() => handlePresetDoubleClick(item)}
                          className={`group relative rounded-2xl overflow-hidden border transition-all cursor-pointer bg-slate-950 flex flex-col justify-between ${
                            isSelected
                              ? 'border-amber-400 ring-2 ring-amber-400/40 shadow-[0_0_20px_rgba(245,158,11,0.35)] bg-amber-950/25'
                              : 'border-slate-800/90 hover:border-amber-500/40 hover:bg-slate-900/60'
                          }`}
                        >
                          <div className="aspect-square w-full p-2.5 flex items-center justify-center relative bg-slate-900/30">
                            <img
                              src={item.url}
                              alt={item.name}
                              loading="lazy"
                              className="max-w-full max-h-full object-contain group-hover:scale-110 transition-transform duration-200"
                            />

                            {isSelected && (
                              <div className="absolute top-1.5 right-1.5 w-5 h-5 rounded-full bg-amber-400 text-slate-950 flex items-center justify-center shadow-lg">
                                <Check size={12} strokeWidth={3} />
                              </div>
                            )}

                            <span
                              className={`absolute bottom-1.5 left-1.5 px-1 py-0.2 rounded text-[8px] font-mono font-bold uppercase ${
                                item.isAnimated
                                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                                  : 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                              }`}
                            >
                              {item.isAnimated ? 'GIF' : 'HD'}
                            </span>
                          </div>

                          <div className="p-1.5 bg-[#0B0F19] border-t border-slate-800/60">
                            <div className="text-[10px] font-medium text-slate-300 truncate" title={item.name}>
                              {item.name}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {visibleMlbbCount < filteredMlbb.length && (
                    <div className="pt-2 text-center">
                      <button
                        type="button"
                        onClick={() => setVisibleMlbbCount((prev) => Math.min(prev + 48, filteredMlbb.length))}
                        className="px-5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-xs font-mono text-amber-300 hover:text-white transition-colors cursor-pointer"
                      >
                        Load More Layla Emotes ({visibleMlbbCount} of {filteredMlbb.length})
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {/* ============================================================== */}
          {/* TAB 1: STICKERS (500)                                          */}
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
                    className="w-full pl-10 pr-9 py-2.5 rounded-xl bg-slate-900/90 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400 transition-colors"
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

                {/* Group Filter Chips */}
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
                  <button
                    type="button"
                    onClick={() => setStickerGroup('All')}
                    className={`px-3 py-1.5 rounded-xl text-[11px] font-semibold whitespace-nowrap transition-all flex items-center gap-1.5 cursor-pointer ${
                      stickerGroup === 'All'
                        ? 'bg-cyan-500 text-slate-950 font-bold shadow-sm'
                        : 'bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-slate-200 border border-slate-800'
                    }`}
                  >
                    <span>All Stickers</span>
                    <span className="text-[9px] px-1.5 py-0.2 rounded-full font-mono bg-slate-950/30">
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
                        className={`px-3 py-1.5 rounded-xl text-[11px] font-semibold whitespace-nowrap transition-all flex items-center gap-1.5 cursor-pointer ${
                          isSelected
                            ? 'bg-cyan-500 text-slate-950 font-bold shadow-sm'
                            : 'bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-slate-200 border border-slate-800'
                        }`}
                      >
                        <span>{grp}</span>
                        <span
                          className={`text-[9px] px-1.5 py-0.2 rounded-full font-mono ${
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
                <div className="py-16 text-center text-xs text-slate-500 font-mono">
                  No stickers match &ldquo;{searchQuery}&rdquo;
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-7 gap-2.5 sm:gap-3">
                    {filteredStickers.slice(0, visibleStickersCount).map((sticker) => {
                      const isSelected = selectedUrl === sticker.url;

                      return (
                        <div
                          key={sticker.id}
                          onClick={() => handlePresetSelect(sticker)}
                          onDoubleClick={() => handlePresetDoubleClick(sticker)}
                          className={`group relative rounded-2xl overflow-hidden border transition-all cursor-pointer bg-slate-950 flex flex-col justify-between ${
                            isSelected
                              ? 'border-cyan-400 ring-2 ring-cyan-400/40 shadow-[0_0_20px_rgba(0,240,255,0.35)] bg-cyan-950/25'
                              : 'border-slate-800/90 hover:border-slate-600 hover:bg-slate-900/60'
                          }`}
                        >
                          <div className="aspect-square w-full p-2.5 flex items-center justify-center relative bg-slate-900/30">
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
                    <div className="pt-3 text-center">
                      <button
                        type="button"
                        onClick={() => setVisibleStickersCount((prev) => Math.min(prev + 60, filteredStickers.length))}
                        className="px-6 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-xs font-mono font-bold text-cyan-300 hover:text-white transition-colors cursor-pointer"
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
          {/* TAB 2: GIFS (100)                                              */}
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
                  className="w-full pl-10 pr-9 py-2.5 rounded-xl bg-slate-900/90 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400 transition-colors"
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
                <div className="py-16 text-center text-xs text-slate-500 font-mono">
                  No GIFs match &ldquo;{searchQuery}&rdquo;
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3.5">
                    {filteredGifs.slice(0, visibleGifsCount).map((gif) => {
                      const isSelected = selectedUrl === gif.url;

                      return (
                        <div
                          key={gif.id}
                          onClick={() => handlePresetSelect(gif)}
                          onDoubleClick={() => handlePresetDoubleClick(gif)}
                          className={`group relative rounded-2xl overflow-hidden border transition-all cursor-pointer bg-slate-950 flex flex-col justify-between ${
                            isSelected
                              ? 'border-cyan-400 ring-2 ring-cyan-400/40 shadow-[0_0_20px_rgba(0,240,255,0.35)] bg-cyan-950/25'
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
                    <div className="pt-3 text-center">
                      <button
                        type="button"
                        onClick={() => setVisibleGifsCount((prev) => Math.min(prev + 48, filteredGifs.length))}
                        className="px-6 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-xs font-mono font-bold text-cyan-300 hover:text-white transition-colors cursor-pointer"
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
          {/* TAB 3: SOUNDS (18)                                             */}
          {/* ============================================================== */}
          {activeSection === 'sounds' && (
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 min-h-[360px]">
              {/* Search & Sound Groups */}
              <div className="space-y-3">
                <div className="relative">
                  <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search preset sounds (e.g. kaching, victory, coin, meme, oof)..."
                    className="w-full pl-10 pr-9 py-2.5 rounded-xl bg-slate-900/90 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400 transition-colors"
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

                {/* Sound Group Chips */}
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
                  <button
                    type="button"
                    onClick={() => setSoundGroup('All')}
                    className={`px-3 py-1.5 rounded-xl text-[11px] font-semibold whitespace-nowrap transition-all flex items-center gap-1 cursor-pointer ${
                      soundGroup === 'All'
                        ? 'bg-cyan-500 text-slate-950 font-bold shadow-sm'
                        : 'bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-slate-200 border border-slate-800'
                    }`}
                  >
                    <span>All Sounds</span>
                    <span className="text-[9px] px-1.5 py-0.2 rounded-full font-mono bg-slate-950/30">
                      {PRESET_SOUNDS.length}
                    </span>
                  </button>

                  {soundGroups.map((grp) => {
                    const count = PRESET_SOUNDS.filter((s) => s.group === grp).length;
                    const isSelected = soundGroup === grp;
                    return (
                      <button
                        key={grp}
                        type="button"
                        onClick={() => setSoundGroup(grp)}
                        className={`px-3 py-1.5 rounded-xl text-[11px] font-semibold whitespace-nowrap transition-all flex items-center gap-1 cursor-pointer ${
                          isSelected
                            ? 'bg-cyan-500 text-slate-950 font-bold shadow-sm'
                            : 'bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-slate-200 border border-slate-800'
                        }`}
                      >
                        <span>{grp}</span>
                        <span
                          className={`text-[9px] px-1.5 py-0.2 rounded-full font-mono ${
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

              {/* Sound Cards Grid */}
              {filteredSounds.length === 0 ? (
                <div className="py-16 text-center text-xs text-slate-500 font-mono">
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
                        className={`group p-3.5 rounded-2xl border transition-all cursor-pointer bg-slate-950/90 flex flex-col justify-between gap-3 relative ${
                          isSelected
                            ? 'border-cyan-400 ring-2 ring-cyan-400/40 shadow-[0_0_18px_rgba(0,240,255,0.25)] bg-cyan-950/20'
                            : 'border-slate-800/90 hover:border-slate-700 hover:bg-slate-900/50'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div className="w-10 h-10 rounded-2xl bg-purple-500/15 border border-purple-500/30 flex items-center justify-center text-purple-400 flex-shrink-0">
                              <Volume2 size={18} />
                            </div>
                            <div className="min-w-0">
                              <div className="text-xs font-bold text-white truncate" title={sound.name}>
                                {sound.name}
                              </div>
                              <div className="text-[10px] font-mono text-slate-400 mt-0.5">
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

                        {/* Audio Waveform Equalizer when playing */}
                        {isPlaying && (
                          <div className="flex items-center gap-1 h-3 px-1">
                            <span className="w-1 bg-cyan-400 h-2 rounded-full animate-bounce" />
                            <span className="w-1 bg-cyan-300 h-3 rounded-full animate-bounce [animation-delay:0.15s]" />
                            <span className="w-1 bg-cyan-400 h-1.5 rounded-full animate-bounce [animation-delay:0.3s]" />
                            <span className="w-1 bg-cyan-300 h-3 rounded-full animate-bounce [animation-delay:0.45s]" />
                            <span className="w-1 bg-cyan-400 h-2 rounded-full animate-bounce [animation-delay:0.2s]" />
                          </div>
                        )}

                        <div className="flex items-center justify-between pt-2 border-t border-slate-800/60">
                          <button
                            type="button"
                            onClick={(e) => handleTogglePlaySound(sound.url, sound.id, e)}
                            className={`px-3 py-1.5 rounded-xl text-[10px] font-bold font-mono flex items-center gap-1.5 transition-colors cursor-pointer ${
                              isPlaying
                                ? 'bg-cyan-400 text-slate-950 font-black shadow-md shadow-cyan-400/30'
                                : 'bg-slate-900 hover:bg-slate-800 text-cyan-300 border border-cyan-500/30'
                            }`}
                          >
                            {isPlaying ? (
                              <>
                                <Pause size={11} className="fill-current" />
                                <span>Stop Preview</span>
                              </>
                            ) : (
                              <>
                                <Play size={11} className="fill-current" />
                                <span>Preview Audio</span>
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

          {/* ============================================================== */}
          {/* TAB 4: MY UPLOADS                                              */}
          {/* ============================================================== */}
          {activeSection === 'uploads' && (
            <div className="flex-1 overflow-y-auto flex flex-col min-h-[360px]">
              {/* Upload Dropzone & Storage Quota */}
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
                className={`px-4 sm:px-6 py-4 border-b border-slate-800/80 transition-colors flex-shrink-0 ${
                  dragActive ? 'bg-cyan-500/15 border-cyan-400' : 'bg-slate-950/60'
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept={isAudioOnly ? '.mp3,.wav,.ogg,.m4a,.aac,.flac,audio/*' : '*/*'}
                      onChange={handleInputChange}
                      className="hidden"
                    />
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploading}
                      className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-cyan-400 to-cyan-300 hover:from-cyan-300 hover:to-cyan-200 text-slate-950 font-black text-xs transition-all cursor-pointer disabled:opacity-50 shadow-md shadow-cyan-500/20"
                    >
                      {uploading ? (
                        <>
                          <Loader2 size={15} className="animate-spin" />
                          <span>Uploading Into Cloud...</span>
                        </>
                      ) : (
                        <>
                          <UploadCloud size={15} />
                          <span>{isAudioOnly ? 'Upload Audio' : 'Upload File'}</span>
                        </>
                      )}
                    </button>

                    <span className="text-[11px] font-mono text-slate-400 hidden sm:inline">
                      {isAudioOnly
                        ? 'MP3, WAV, OGG, M4A, AAC, FLAC audio files supported'
                        : 'MP4, GIF, MP3, WAV, PNG, JPG supported'}
                    </span>
                  </div>

                  <div className="flex items-center gap-2.5 self-end sm:self-auto">
                    {storageInfo && (
                      <span className="text-[11px] font-mono text-slate-400 px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-800">
                        {(storageInfo.usedBytes / (1024 * 1024)).toFixed(1)} MB / {(storageInfo.limitBytes / (1024 * 1024)).toFixed(0)} MB ({storageInfo.planLabel})
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

                {/* Upload Feedback */}
                {errorMsg && (
                  <div className="mt-3 p-3 rounded-xl bg-red-950/60 border border-red-500/50 text-red-300 text-xs font-mono flex items-center justify-between gap-2 shadow-lg animate-fadeIn">
                    <div className="flex items-center gap-2">
                      <AlertCircle size={15} className="flex-shrink-0 text-red-400" />
                      <span>{errorMsg}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setErrorMsg(null)}
                      className="text-red-400 hover:text-white text-xs font-bold px-2 py-0.5 cursor-pointer"
                    >
                      ✕
                    </button>
                  </div>
                )}

                {successMsg && (
                  <div className="mt-3 p-3 rounded-xl bg-emerald-950/60 border border-emerald-500/50 text-emerald-300 text-xs font-mono flex items-center gap-2 shadow-lg animate-fadeIn">
                    <CheckCircle2 size={15} className="flex-shrink-0 text-emerald-400" />
                    <span>{successMsg}</span>
                  </div>
                )}
              </div>

              {/* Uploads Filter Bar */}
              <div className="px-4 sm:px-6 py-2.5 bg-slate-900/50 border-b border-slate-800/80 flex items-center justify-between gap-2 flex-wrap flex-shrink-0">
                <div className="flex items-center gap-1.5">
                  <Filter size={12} className="text-slate-400" />
                  <span className="text-[11px] font-mono text-slate-400 mr-1">Filter:</span>
                  {isAudioOnly ? (
                    <span className="px-2.5 py-1 rounded-lg text-[10px] font-mono font-bold uppercase bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 flex items-center gap-1.5">
                      <Volume2 size={11} />
                      <span>Audio Only (MP3, WAV, OGG, M4A, AAC, FLAC)</span>
                    </span>
                  ) : (
                    (['all', 'images', 'audio', 'video'] as const).map((filterKey) => (
                      <button
                        key={filterKey}
                        type="button"
                        onClick={() => setUploadsFilter(filterKey)}
                        className={`px-2.5 py-1 rounded-lg text-[10px] font-mono font-bold uppercase transition-all cursor-pointer ${
                          uploadsFilter === filterKey
                            ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                            : 'bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800'
                        }`}
                      >
                        {filterKey}
                      </button>
                    ))
                  )}
                </div>

                <div className="text-[11px] font-mono text-slate-500">
                  Showing {filteredUploads.length} {isAudioOnly ? 'audio ' : ''}files
                </div>
              </div>

              {/* Uploads Grid */}
              <div className="flex-1 p-4 sm:p-6 overflow-y-auto">
                {loading && mediaList.length === 0 ? (
                  <div className="py-16 text-center text-xs text-slate-500 font-mono flex items-center justify-center gap-2">
                    <Loader2 size={15} className="animate-spin text-cyan-400" />
                    <span>Loading your cloud assets...</span>
                  </div>
                ) : filteredUploads.length === 0 ? (
                  <div className="p-10 rounded-2xl bg-slate-900/30 border border-slate-800 text-center space-y-2 max-w-md mx-auto my-6">
                    <ImageIcon size={32} className="mx-auto text-slate-600" />
                    <div className="text-xs font-bold text-slate-300">No matching files in storage</div>
                    <p className="text-[11px] text-slate-500">
                      Upload files via the button above, or browse 500+ stickers, GIFs, and sounds in the other tabs!
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3.5">
                    {filteredUploads.map((item) => {
                      const isSelected = selectedUrl === item.url;
                      const isVideo = isVideoAsset(item);
                      const isAudio = isAudioAsset(item);
                      const isImage = isImageAsset(item);
                      const isPlaying = playingSoundId === item._id;
                      const extBadge = (item.filename.split('.').pop() || 'FILE').toUpperCase();

                      return (
                        <div
                          key={item._id || item.url}
                          onClick={() => setSelectedUrl(item.url)}
                          onDoubleClick={() => {
                            onSelect(item.url, item);
                            onClose();
                          }}
                          className={`group relative rounded-2xl overflow-hidden border-2 transition-all cursor-pointer bg-slate-950 flex flex-col justify-between ${
                            isSelected
                              ? 'border-cyan-400 ring-2 ring-cyan-400/40 shadow-[0_0_20px_rgba(0,240,255,0.3)] bg-cyan-950/20'
                              : 'border-slate-800 hover:border-slate-600 hover:bg-slate-900/40'
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
                              <div className="flex flex-col items-center justify-center gap-2 text-purple-400 text-center">
                                <Volume2 size={32} />
                                <button
                                  type="button"
                                  onClick={(e) => handleTogglePlaySound(item.url, item._id, e)}
                                  className={`px-2.5 py-1 rounded-lg text-[9px] font-mono font-bold flex items-center gap-1 transition-colors cursor-pointer ${
                                    isPlaying
                                      ? 'bg-cyan-400 text-slate-950 animate-pulse'
                                      : 'bg-slate-800 text-cyan-300 hover:bg-slate-700'
                                  }`}
                                >
                                  {isPlaying ? <Pause size={9} fill="currentColor" /> : <Play size={9} fill="currentColor" />}
                                  <span>{isPlaying ? 'Stop' : 'Play'}</span>
                                </button>
                              </div>
                            ) : isImage ? (
                              <img
                                src={item.url}
                                alt={item.filename}
                                loading="lazy"
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200 rounded-lg"
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

                          <div
                            className="p-2.5 bg-[#0B0F19] border-t border-slate-800/80"
                            onClick={(e) => {
                              if (editingId === item._id) e.stopPropagation();
                            }}
                          >
                            {editingId === item._id ? (
                              <div className="space-y-1">
                                <div className="flex items-center gap-1">
                                  <input
                                    type="text"
                                    autoFocus
                                    value={editingName}
                                    onChange={(e) => setEditingName(e.target.value)}
                                    onKeyDown={(e) => {
                                      if (e.key === 'Enter') {
                                        e.preventDefault();
                                        handleSaveRename(item);
                                      } else if (e.key === 'Escape') {
                                        handleCancelRename();
                                      }
                                    }}
                                    disabled={savingRenameId === item._id}
                                    placeholder="File name..."
                                    className="w-full px-2 py-1 rounded bg-slate-950 border border-cyan-400 text-[11px] text-white font-medium focus:outline-none"
                                  />
                                  <button
                                    type="button"
                                    onClick={(e) => handleSaveRename(item, e)}
                                    disabled={savingRenameId === item._id}
                                    title="Save"
                                    className="p-1 rounded bg-cyan-500 hover:bg-cyan-400 text-slate-950 transition-colors cursor-pointer flex-shrink-0"
                                  >
                                    {savingRenameId === item._id ? (
                                      <RefreshCw size={10} className="animate-spin" />
                                    ) : (
                                      <Check size={10} strokeWidth={3} />
                                    )}
                                  </button>
                                  <button
                                    type="button"
                                    onClick={(e) => handleCancelRename(e)}
                                    disabled={savingRenameId === item._id}
                                    title="Cancel"
                                    className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors cursor-pointer flex-shrink-0"
                                  >
                                    <X size={10} />
                                  </button>
                                </div>
                                <div className="text-[10px] font-mono text-slate-500">
                                  {formatFileSize(item.fileSize || 0)}
                                </div>
                              </div>
                            ) : (
                              <div className="flex items-start justify-between gap-1.5">
                                <div className="min-w-0 flex-1">
                                  <div
                                    className="text-[11px] font-semibold text-slate-200 truncate"
                                    title={item.filename}
                                  >
                                    {item.filename}
                                  </div>
                                  <div className="text-[10px] font-mono text-slate-500 mt-0.5">
                                    {formatFileSize(item.fileSize || 0)}
                                  </div>
                                </div>
                                <button
                                  type="button"
                                  onClick={(e) => handleStartRename(item, e)}
                                  title="Rename File"
                                  className="p-1 rounded-md text-slate-400 hover:text-cyan-400 hover:bg-cyan-500/10 transition-colors cursor-pointer flex-shrink-0"
                                >
                                  <Edit2 size={12} />
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Modal Footer */}
          <div className="px-4 sm:px-6 py-3.5 border-t border-slate-800 bg-[#0B0F19] flex flex-col sm:flex-row items-center justify-between gap-3 flex-shrink-0">
            <div className="text-xs text-slate-400 truncate w-full sm:w-auto text-center sm:text-left">
              {selectedUrl ? (
                <span className="font-mono text-cyan-400 flex items-center gap-1.5 justify-center sm:justify-start truncate">
                  <CheckCircle2 size={13} className="text-cyan-400 flex-shrink-0" />
                  <span className="truncate">Selected: {selectedUrl.split('/').pop()}</span>
                </span>
              ) : (
                <span className="text-slate-500">Click any media card to select, or double-click to apply instantly.</span>
              )}
            </div>

            <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end flex-shrink-0">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 sm:flex-none px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-xs font-semibold text-slate-300 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmSelection}
                disabled={!selectedUrl}
                className="flex-1 sm:flex-none px-5 py-2 rounded-xl bg-gradient-to-r from-cyan-400 to-cyan-300 hover:from-cyan-300 hover:to-cyan-200 disabled:opacity-40 text-slate-950 font-black text-xs transition-all cursor-pointer shadow-md shadow-cyan-500/20"
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
