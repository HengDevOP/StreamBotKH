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
  Globe,
  Layers,
  Play,
  Pause,
  Search,
  Sparkles
} from 'lucide-react';
import { MediaItem, isVideoAsset, isAudioAsset, isImageAsset, renderOnlineIcon } from './MediaLibraryManager';
import { POPULAR_ALERT_SOUNDS, ONLINE_MEDIA_CATEGORIES, OnlineMediaItem } from '../../data/onlineMedia';

interface MediaPickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (mediaUrl: string, item?: MediaItem) => void;
  currentUrl?: string;
  title?: string;
  subtitle?: string;
}

export const MediaPickerModal: React.FC<MediaPickerModalProps> = ({
  isOpen,
  onClose,
  onSelect,
  currentUrl,
  title = 'Choose from Media Library',
  subtitle = 'Select a file from your library, or upload MP4, GIF, MP3, WAV, PNG, JPG directly.'
}) => {
  const [mediaList, setMediaList] = useState<MediaItem[]>([]);
  const [selectedUrl, setSelectedUrl] = useState<string>(currentUrl || '');
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [storageInfo, setStorageInfo] = useState<{
    plan: string;
    planLabel: string;
    usedBytes: number;
    limitBytes: number;
    remainingBytes: number;
    percentUsed: number;
  } | null>(null);

  // Online Media State
  const isInitiallyOnline = useMemo(() => {
    return POPULAR_ALERT_SOUNDS.some((s) => s.url === currentUrl);
  }, [currentUrl]);

  const [activeSection, setActiveSection] = useState<'uploads' | 'online'>(isInitiallyOnline ? 'online' : 'uploads');
  const [onlineCategory, setOnlineCategory] = useState<string>('All');
  const [onlineSearch, setOnlineSearch] = useState<string>('');
  const [playingOnlineId, setPlayingOnlineId] = useState<string | null>(null);
  const activeAudioRef = useRef<HTMLAudioElement | null>(null);

  const handleTogglePlayOnline = (sound: OnlineMediaItem, e?: React.MouseEvent) => {
    if (e) {
      e.stopPropagation();
    }
    if (playingOnlineId === sound.id) {
      if (activeAudioRef.current) {
        activeAudioRef.current.pause();
        activeAudioRef.current = null;
      }
      setPlayingOnlineId(null);
      return;
    }

    if (activeAudioRef.current) {
      activeAudioRef.current.pause();
      activeAudioRef.current = null;
    }

    const audio = new Audio(sound.url);
    activeAudioRef.current = audio;
    setPlayingOnlineId(sound.id);

    audio.onended = () => {
      setPlayingOnlineId(null);
      activeAudioRef.current = null;
    };
    audio.onerror = () => {
      setPlayingOnlineId(null);
      activeAudioRef.current = null;
    };

    audio.play().catch((err) => {
      console.warn('Audio play error:', err);
      setPlayingOnlineId(null);
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

  const filteredOnlineMedia = useMemo(() => {
    return POPULAR_ALERT_SOUNDS.filter((item) => {
      const matchCat = onlineCategory === 'All' || item.category === onlineCategory;
      const q = onlineSearch.trim().toLowerCase();
      const matchQuery =
        !q ||
        item.name.toLowerCase().includes(q) ||
        item.description.toLowerCase().includes(q) ||
        item.tags.some((t) => t.toLowerCase().includes(q));
      return matchCat && matchQuery;
    });
  }, [onlineCategory, onlineSearch]);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const MAX_SIZE_BYTES = 100 * 1024 * 1024; // Up to 100MB per file (bounded by plan quota: 20MB Free / 500MB Pro)

  const getAuthHeaders = (): Record<string, string> => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('streamneon_auth_token') : null;
    return token ? { Authorization: `Bearer ${token}` } : {};
  };

  const fetchMedia = async () => {
    try {
      setLoading(true);
      setErrorMsg(null);
      const res = await fetch('/api/media', {
        headers: getAuthHeaders()
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setMediaList(data.media || []);
        if (data.storage) {
          setStorageInfo(data.storage);
        }
      } else {
        setErrorMsg(data.error || 'Could not load Media Library');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to load Media Library');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      setSelectedUrl(currentUrl || '');
      setErrorMsg(null);
      setSuccessMsg(null);
      fetchMedia();
    }
  }, [isOpen, currentUrl]);

  if (!isOpen) return null;

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  const handleUploadFile = async (file: File) => {
    setErrorMsg(null);
    setSuccessMsg(null);

    if (file.size > MAX_SIZE_BYTES) {
      const sizeMb = (file.size / (1024 * 1024)).toFixed(2);
      setErrorMsg(`File exceeds the 100MB per-file limit (${sizeMb} MB).`);
      return;
    }

    if (storageInfo && file.size > storageInfo.remainingBytes) {
      setErrorMsg(
        `File size (${formatFileSize(file.size)}) exceeds your remaining quota (${formatFileSize(
          storageInfo.remainingBytes
        )} left of ${storageInfo.planLabel}).`
      );
      return;
    }

    setUploading(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await fetch('/api/media', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: formData
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setSuccessMsg(`"${file.name}" uploaded to your Media Library!`);
        await fetchMedia();
        if (data.media?.url) {
          setSelectedUrl(data.media.url);
        }
        setTimeout(() => setSuccessMsg(null), 3000);
      } else {
        setErrorMsg(data.error || 'Failed to upload media.');
      }
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

  const handleConfirmSelection = () => {
    if (!selectedUrl) return;
    const found = mediaList.find((m) => m.url === selectedUrl);
    const onlineFound = POPULAR_ALERT_SOUNDS.find((s) => s.url === selectedUrl);
    const itemToPass: any = found || (onlineFound ? {
      _id: onlineFound.id,
      userId: 'system',
      filename: onlineFound.name,
      storedFilename: onlineFound.url.split('/').pop() || '',
      url: onlineFound.url,
      fileType: 'audio/mp3',
      fileSize: 45000,
      createdAt: new Date().toISOString()
    } : undefined);
    onSelect(selectedUrl, itemToPass);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn"
      onClick={onClose}
    >
      <div
        className="w-full max-w-3xl max-h-[88vh] rounded-2xl bg-[#090D18] border border-slate-800 shadow-2xl flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-[#0B0F19]">
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

        {/* Tab Switcher: My Uploads vs Online Media */}
        <div className="px-3.5 sm:px-6 py-2 sm:py-2.5 bg-[#070A12] border-b border-slate-800 flex items-center gap-1.5 sm:gap-2">
          <button
            type="button"
            onClick={() => setActiveSection('uploads')}
            className={`px-2.5 sm:px-3.5 py-1.5 rounded-xl text-xs font-bold font-mono transition-all flex items-center gap-1.5 cursor-pointer ${
              activeSection === 'uploads'
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Layers size={13} />
            <span className="hidden xs:inline">My Uploads ({mediaList.length})</span>
            <span className="xs:hidden">Uploads ({mediaList.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSection('online')}
            className={`px-2.5 sm:px-3.5 py-1.5 rounded-xl text-xs font-bold font-mono transition-all flex items-center gap-1.5 cursor-pointer ${
              activeSection === 'online'
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Globe size={13} />
            <span className="hidden xs:inline">Online Media (20 Sounds)</span>
            <span className="xs:hidden">Online (20)</span>
            <span className="px-1.5 py-0.2 rounded bg-pink-500 text-white text-[8px] font-bold uppercase tracking-wider animate-pulse">
              HOT
            </span>
          </button>
        </div>

        {/* Uploads Section */}
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
                        <span>Uploading...</span>
                      </>
                    ) : (
                      <>
                        <UploadCloud size={15} />
                        <span>Upload New Media</span>
                      </>
                    )}
                  </button>

                  <span className="text-[11px] font-mono text-slate-400">
                    MP4, GIF, MP3, WAV, PNG, JPG &amp; all formats supported
                  </span>
                </div>

                <div className="flex items-center gap-2.5 self-end sm:self-auto">
                  {storageInfo && (
                    <span className="text-[11px] font-mono text-slate-400 px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-800">
                      {(storageInfo.usedBytes / (1024 * 1024)).toFixed(1)} MB used ({storageInfo.planLabel})
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={fetchMedia}
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
                <div className="mt-3 p-3 rounded-xl bg-red-950/50 border border-red-500/40 text-red-300 text-xs font-mono flex items-center gap-2">
                  <AlertCircle size={15} className="text-red-400 flex-shrink-0" />
                  <span>{errorMsg}</span>
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
            <div className="flex-1 overflow-y-auto p-6">
              {loading ? (
                <div className="py-16 text-center space-y-2 text-slate-400 font-mono text-xs">
                  <Loader2 size={24} className="animate-spin text-cyan-400 mx-auto" />
                  <div>Loading your Media Library...</div>
                </div>
              ) : mediaList.length === 0 ? (
                <div className="py-14 text-center space-y-3 border border-dashed border-slate-800 rounded-2xl bg-slate-950/40 p-8">
                  <ImageIcon size={32} className="text-slate-600 mx-auto" />
                  <div className="text-sm font-bold text-white">Your Media Library is Empty</div>
                  <p className="text-xs text-slate-400 max-w-sm mx-auto">
                    Click &ldquo;Upload New Media&rdquo; above to upload MP4, GIF, MP3, WAV, PNG, or JPG files directly into your library.
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

        {/* Online Media Section */}
        {activeSection === 'online' && (
          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            {/* Search & Category Filter toolbar */}
            <div className="space-y-2.5">
              <div className="relative">
                <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={onlineSearch}
                  onChange={(e) => setOnlineSearch(e.target.value)}
                  placeholder="Search popular alert sounds (e.g. kaching, mario, meme, discord)..."
                  className="w-full pl-10 pr-9 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400 transition-colors"
                />
                {onlineSearch && (
                  <button
                    type="button"
                    onClick={() => setOnlineSearch('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white text-xs p-0.5 cursor-pointer"
                  >
                    ✕
                  </button>
                )}
              </div>

              {/* Category Pills */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
                {ONLINE_MEDIA_CATEGORIES.map((cat) => {
                  const count =
                    cat === 'All'
                      ? POPULAR_ALERT_SOUNDS.length
                      : POPULAR_ALERT_SOUNDS.filter((s) => s.category === cat).length;
                  const isSelected = onlineCategory === cat;
                  return (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setOnlineCategory(cat)}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold whitespace-nowrap transition-all flex items-center gap-1 cursor-pointer ${
                        isSelected
                          ? 'bg-cyan-500 text-slate-950 font-bold shadow-sm'
                          : 'bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-slate-200 border border-slate-800'
                      }`}
                    >
                      <span>{cat}</span>
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

            {/* Sound Cards */}
            {filteredOnlineMedia.length === 0 ? (
              <div className="py-12 text-center text-xs text-slate-500 font-mono">
                No alert sounds match &ldquo;{onlineSearch}&rdquo;
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                {filteredOnlineMedia.map((sound) => {
                  const isSelected = selectedUrl === sound.url;
                  const isPlaying = playingOnlineId === sound.id;

                  return (
                    <div
                      key={sound.id}
                      onClick={() => setSelectedUrl(sound.url)}
                      onDoubleClick={() => {
                        onSelect(sound.url, {
                          _id: sound.id,
                          userId: 'system',
                          filename: sound.name,
                          storedFilename: sound.url.split('/').pop() || '',
                          url: sound.url,
                          fileType: 'audio/mp3',
                          fileSize: 45000,
                          createdAt: new Date().toISOString()
                        });
                        onClose();
                      }}
                      className={`group p-3 rounded-xl border transition-all cursor-pointer bg-slate-950/90 flex flex-col justify-between gap-2.5 relative ${
                        isSelected
                          ? 'border-cyan-400 shadow-[0_0_16px_rgba(0,240,255,0.2)] bg-cyan-950/10'
                          : 'border-slate-800/90 hover:border-slate-700 hover:bg-slate-900/50'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div
                            className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                            style={{
                              backgroundColor: `${sound.color}20`,
                              borderColor: `${sound.color}40`,
                              borderWidth: 1,
                              color: sound.color
                            }}
                          >
                            {renderOnlineIcon(sound.icon, 16)}
                          </div>
                          <div className="min-w-0">
                            <div className="text-xs font-bold text-white truncate" title={sound.name}>
                              {sound.name}
                            </div>
                            <div className="text-[10px] font-mono text-slate-400">
                              {sound.category} • {sound.durationSeconds}s
                            </div>
                          </div>
                        </div>

                        {isSelected && (
                          <div className="w-5 h-5 rounded-full bg-cyan-400 text-slate-950 flex items-center justify-center flex-shrink-0 shadow-md">
                            <Check size={12} strokeWidth={3} />
                          </div>
                        )}
                      </div>

                      <p className="text-[11px] text-slate-400 line-clamp-1">
                        {sound.description}
                      </p>

                      <div className="flex items-center justify-between pt-2 border-t border-slate-800/60">
                        <button
                          type="button"
                          onClick={(e) => handleTogglePlayOnline(sound, e)}
                          className={`px-2.5 py-1 rounded-lg text-[10px] font-bold font-mono flex items-center gap-1.5 transition-colors cursor-pointer ${
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
                          Double-click to apply
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
        <div className="px-6 py-4 border-t border-slate-800 bg-[#0B0F19] flex items-center justify-between gap-4">
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
  );
};
