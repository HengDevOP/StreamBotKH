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
  Globe,
  Play,
  Pause,
  Search,
  Sparkles,
  Flame,
  DollarSign,
  Megaphone,
  Trophy,
  Skull,
  Bell,
  Activity,
  Radio,
  Music,
  Gamepad2,
  Heart,
  Frown,
  Zap
} from 'lucide-react';
import { useModal } from '../../context/ModalContext';
import { POPULAR_ALERT_SOUNDS, ONLINE_MEDIA_CATEGORIES, OnlineMediaItem } from '../../data/onlineMedia';

export interface MediaItem {
  _id: string;
  userId: string;
  filename: string;
  storedFilename: string;
  url: string;
  fileType: string;
  fileSize: number;
  createdAt: string;
}

interface MediaLibraryManagerProps {
  onSelectForOverlay?: (media: MediaItem | { url: string; filename: string; _id?: string }) => void;
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

export function renderOnlineIcon(iconName: string, size = 18) {
  switch (iconName) {
    case 'DollarSign': return <DollarSign size={size} />;
    case 'Sparkles': return <Sparkles size={size} />;
    case 'Volume2': return <Volume2 size={size} />;
    case 'Flame': return <Flame size={size} />;
    case 'Zap': return <Zap size={size} />;
    case 'Megaphone': return <Megaphone size={size} />;
    case 'Trophy': return <Trophy size={size} />;
    case 'Skull': return <Skull size={size} />;
    case 'Bell': return <Bell size={size} />;
    case 'AlertCircle': return <AlertCircle size={size} />;
    case 'Activity': return <Activity size={size} />;
    case 'Radio': return <Radio size={size} />;
    case 'Music': return <Music size={size} />;
    case 'Gamepad2': return <Gamepad2 size={size} />;
    case 'Heart': return <Heart size={size} />;
    case 'Frown': return <Frown size={size} />;
    default: return <Volume2 size={size} />;
  }
}

export const MediaLibraryManager: React.FC<MediaLibraryManagerProps> = ({
  onSelectForOverlay
}) => {
  const { showConfirm, showAlert } = useModal();
  const [mediaList, setMediaList] = useState<MediaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [storageInfo, setStorageInfo] = useState<{
    plan: string;
    planLabel: string;
    usedBytes: number;
    limitBytes: number;
    remainingBytes: number;
    percentUsed: number;
  } | null>(null);

  // Online Media State
  const [activeSection, setActiveSection] = useState<'uploads' | 'online'>('uploads');
  const [onlineCategory, setOnlineCategory] = useState<string>('All');
  const [onlineSearch, setOnlineSearch] = useState<string>('');
  const [playingOnlineId, setPlayingOnlineId] = useState<string | null>(null);
  const activeAudioRef = useRef<HTMLAudioElement | null>(null);

  const handleTogglePlayOnline = (sound: OnlineMediaItem) => {
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
      const res = await fetch('/api/media', {
        headers: getAuthHeaders()
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setMediaList(data.media || []);
        if (data.storage) {
          setStorageInfo(data.storage);
        }
      }
    } catch (e: any) {
      console.error('Failed to load media:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMedia();
  }, []);

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  const handleFileProcess = async (file: File) => {
    setErrorMsg(null);
    setSuccessMsg(null);

    if (file.size > MAX_SIZE_BYTES) {
      const sizeMb = (file.size / (1024 * 1024)).toFixed(2);
      setErrorMsg(`File size (${sizeMb} MB) exceeds the 100MB per-file upload limit.`);
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
        setSuccessMsg(`"${file.name}" uploaded successfully!`);
        await fetchMedia();
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
        try {
          const res = await fetch(`/api/media/${id}`, {
            method: 'DELETE',
            headers: getAuthHeaders()
          });
          const data = await res.json();
          if (res.ok && data.success) {
            setMediaList((prev) => prev.filter((m) => m._id !== id));
            await fetchMedia();
            showAlert({
              title: 'Asset Deleted',
              message: `"${name}" has been removed successfully.`,
              type: 'success'
            });
          } else {
            showAlert({
              title: 'Delete Failed',
              message: data.error || 'Failed to delete media asset',
              type: 'danger'
            });
          }
        } catch (e: any) {
          showAlert({
            title: 'Network Error',
            message: 'A network error occurred while deleting the media asset.',
            type: 'danger'
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

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-slate-800/60">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <ImageIcon size={22} className="text-cyan-400" />
            Media Library
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Upload MP4, GIF, MP3, WAV, PNG, JPG, WEBP, and all formatted files for your live OBS overlays &amp; soundboard.
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs font-mono">
          <span className="px-2.5 py-1 rounded-md bg-slate-800 text-slate-300">
            {mediaList.length} {mediaList.length === 1 ? 'file' : 'files'}
          </span>
          <span className="px-2.5 py-1 rounded-md bg-cyan-950 text-cyan-300">
            All Formats Supported
          </span>
        </div>
      </div>

      {/* Section Switcher Tabs: My Uploads vs Online Media */}
      <div className="flex items-center gap-2 p-1.5 rounded-2xl bg-slate-900/90 border border-slate-800 w-full sm:w-fit">
        <button
          type="button"
          onClick={() => setActiveSection('uploads')}
          className={`flex-1 sm:flex-initial px-4 py-2 rounded-xl text-xs font-bold font-mono transition-all flex items-center justify-center gap-2 cursor-pointer ${
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
          onClick={() => setActiveSection('online')}
          className={`flex-1 sm:flex-initial px-4 py-2 rounded-xl text-xs font-bold font-mono transition-all flex items-center justify-center gap-2 cursor-pointer ${
            activeSection === 'online'
              ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <Globe size={14} />
          <span>Online Media (20 Popular Sounds)</span>
          <span className="px-1.5 py-0.2 rounded bg-pink-500 text-white text-[9px] font-bold uppercase tracking-wider animate-pulse">
            HOT
          </span>
        </button>
      </div>

      {/* Alert Messages */}
      {errorMsg && (
        <div className="p-3.5 rounded-xl bg-red-950/40 border border-red-800/50 text-red-300 text-xs flex items-center justify-between animate-fadeIn">
          <div className="flex items-center gap-2">
            <AlertCircle size={16} className="flex-shrink-0" />
            <span>{errorMsg}</span>
          </div>
          <button
            onClick={() => setErrorMsg(null)}
            className="text-red-400 hover:text-white text-xs font-bold px-2 py-0.5"
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

      {/* My Uploads Section */}
      {activeSection === 'uploads' && (
        <div className="space-y-6 animate-fadeIn">
          {/* Storage Quota Usage Bar */}
          {storageInfo && (
            <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800/80 space-y-2">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-xs">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-slate-300 font-bold uppercase tracking-wider">
                    Media Storage Usage:
                  </span>
                  <span className="px-2 py-0.5 rounded bg-cyan-950 text-cyan-300 font-mono text-[11px] font-bold">
                    {storageInfo.planLabel}
                  </span>
                </div>
                <div className="font-mono text-slate-400 text-xs">
                  <strong className="text-white">{formatFileSize(storageInfo.usedBytes)}</strong> used of{' '}
                  <strong className="text-white">{formatFileSize(storageInfo.limitBytes)}</strong> ({storageInfo.percentUsed}%)
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
                <span>Free: 20MB • Pro: 500MB</span>
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
                {uploading ? 'Uploading media to MongoDB...' : 'Click to upload or drag and drop'}
              </div>
              <p className="text-xs text-slate-400">
                Supports <strong className="text-slate-300">MP4</strong>, <strong className="text-slate-300">GIF</strong>, <strong className="text-slate-300">MP3</strong>, <strong className="text-slate-300">WAV</strong>, <strong className="text-slate-300">PNG</strong>, <strong className="text-slate-300">JPG</strong>, <strong className="text-slate-300">WEBP</strong> &amp; all formatted files (Free: <strong className="text-cyan-400">20MB</strong> • Pro: <strong className="text-purple-400">500MB</strong>).
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
                onClick={fetchMedia}
                className="text-xs text-slate-400 hover:text-white flex items-center gap-1 font-mono transition-colors"
              >
                <RefreshCw size={12} className={loading ? 'animate-spin' : ''} />
                <span>Refresh</span>
              </button>
            </div>

            {loading ? (
              <div className="py-12 text-center text-xs text-slate-500 font-mono flex items-center justify-center gap-2">
                <RefreshCw size={14} className="animate-spin" />
                <span>Loading media from MongoDB...</span>
              </div>
            ) : mediaList.length === 0 ? (
              <div className="p-10 rounded-2xl bg-slate-900/30 border border-slate-800/60 text-center space-y-2">
                <ImageIcon size={32} className="mx-auto text-slate-600" />
                <div className="text-sm font-medium text-slate-400">No media uploaded yet</div>
                <p className="text-xs text-slate-500 max-w-sm mx-auto">
                  Upload your stream MP4 clips, reaction GIFs, MP3/WAV sound effects, or logos above.
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
                      {/* Media Preview (Image / GIF / Video / Audio) */}
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

                      {/* Info Bar */}
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

                        {/* Actions */}
                        <div className="pt-2 border-t border-slate-800/60 flex items-center justify-between gap-1">
                          <button
                            onClick={() => copyUrl(item.url, item._id)}
                            title="Copy Public URL"
                            className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] font-mono flex items-center gap-1 transition-colors flex-1 justify-center"
                          >
                            {copiedId === item._id ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
                            <span>{copiedId === item._id ? 'Copied' : 'Copy'}</span>
                          </button>

                          {onSelectForOverlay && (
                            <button
                              onClick={() => onSelectForOverlay(item)}
                              title="Use in Overlay"
                              className="px-2 py-1 rounded bg-cyan-950/80 hover:bg-cyan-900/80 text-cyan-300 border border-cyan-800/60 text-[11px] font-mono flex items-center gap-1 transition-colors"
                            >
                              <Layers size={12} />
                              <span>Use</span>
                            </button>
                          )}

                          <button
                            onClick={() => handleDelete(item._id, item.filename)}
                            title="Delete from MongoDB"
                            className="p-1 rounded text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-colors"
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

      {/* Online Media Section */}
      {activeSection === 'online' && (
        <div className="space-y-6 animate-fadeIn">
          {/* Banner / Introduction */}
          <div className="p-5 rounded-2xl bg-gradient-to-r from-purple-950/40 via-cyan-950/30 to-slate-900 border border-cyan-500/30 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 font-mono text-[10px] font-bold uppercase tracking-wider border border-cyan-500/40">
                  Pre-configured Audio Library
                </span>
                <span className="text-xs text-slate-400 font-mono">• 0 MB quota used</span>
              </div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Sparkles size={18} className="text-cyan-400" />
                20 Most Popular Stream Alert Sounds
              </h3>
              <p className="text-xs text-slate-300 max-w-2xl">
                Ready-to-use audio clips tested for high-energy livestreaming. Click preview to listen, copy the direct URL, or apply directly to your OBS alert overlays with zero upload storage required!
              </p>
            </div>
            <div className="flex items-center gap-2 text-xs font-mono text-slate-400 bg-slate-950/60 px-3 py-2 rounded-xl border border-slate-800">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>{filteredOnlineMedia.length} / {POPULAR_ALERT_SOUNDS.length} Available</span>
            </div>
          </div>

          {/* Search & Category Filter Toolbar */}
          <div className="space-y-3">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
              {/* Search Bar */}
              <div className="relative flex-1">
                <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={onlineSearch}
                  onChange={(e) => setOnlineSearch(e.target.value)}
                  placeholder="Search sounds by title, tags (e.g. money, mario, meme, discord, nuke)..."
                  className="w-full pl-10 pr-10 py-2.5 rounded-xl bg-slate-900/80 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400 transition-colors"
                />
                {onlineSearch && (
                  <button
                    type="button"
                    onClick={() => setOnlineSearch('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white text-xs p-1 cursor-pointer"
                  >
                    ✕
                  </button>
                )}
              </div>
            </div>

            {/* Category Pills */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
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
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-1.5 cursor-pointer ${
                      isSelected
                        ? 'bg-cyan-500 text-slate-950 font-bold shadow-md shadow-cyan-500/20'
                        : 'bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-slate-200 border border-slate-800'
                    }`}
                  >
                    <span>{cat}</span>
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

          {/* Sound Cards Grid */}
          {filteredOnlineMedia.length === 0 ? (
            <div className="p-12 text-center rounded-2xl bg-slate-900/30 border border-slate-800 text-slate-400 space-y-2">
              <Search size={28} className="mx-auto text-slate-600" />
              <div className="text-sm font-semibold text-white">No alert sounds match your filter</div>
              <p className="text-xs text-slate-500">
                Try searching for something else or reset category filters.
              </p>
              <button
                type="button"
                onClick={() => {
                  setOnlineSearch('');
                  setOnlineCategory('All');
                }}
                className="mt-2 px-3 py-1.5 rounded-lg bg-cyan-500/20 text-cyan-300 text-xs font-mono hover:bg-cyan-500/30 transition-colors cursor-pointer"
              >
                Reset Filters
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {filteredOnlineMedia.map((sound) => {
                const isPlaying = playingOnlineId === sound.id;
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
                    {/* Top Preview Area */}
                    <div className="p-4 bg-gradient-to-b from-slate-900/80 to-transparent flex flex-col gap-3">
                      <div className="flex items-start justify-between gap-3">
                        {/* Icon Avatar */}
                        <div
                          className="w-12 h-12 rounded-2xl flex items-center justify-center transition-transform group-hover:scale-105 shadow-inner"
                          style={{
                            backgroundColor: `${sound.color}20`,
                            borderColor: `${sound.color}50`,
                            borderWidth: 1,
                            color: sound.color
                          }}
                        >
                          {renderOnlineIcon(sound.icon, 22)}
                        </div>

                        {/* Category & Duration Badges */}
                        <div className="flex flex-col items-end gap-1">
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase tracking-wider bg-slate-800 text-slate-300 border border-slate-700">
                            {sound.category}
                          </span>
                          <span className="text-[10px] font-mono text-cyan-400 font-bold">
                            {sound.durationSeconds}s
                          </span>
                        </div>
                      </div>

                      {/* Title & Description */}
                      <div className="space-y-1">
                        <h4 className="text-sm font-bold text-white group-hover:text-cyan-300 transition-colors line-clamp-1">
                          {sound.name}
                        </h4>
                        <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed">
                          {sound.description}
                        </p>
                      </div>

                      {/* Tags */}
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

                    {/* Bottom Action Controls */}
                    <div className="p-3 bg-slate-950/80 border-t border-slate-800/80 flex items-center gap-2">
                      {/* Play / Pause Interactive Button */}
                      <button
                        type="button"
                        onClick={() => handleTogglePlayOnline(sound)}
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

                      {/* Copy Link Button */}
                      <button
                        type="button"
                        onClick={() => copyUrl(sound.url, sound.id)}
                        title="Copy Audio URL"
                        className="p-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-white transition-colors cursor-pointer"
                      >
                        {isCopied ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
                      </button>

                      {/* Select / Use in Overlay Button */}
                      {onSelectForOverlay && (
                        <button
                          type="button"
                          onClick={() => onSelectForOverlay({ url: sound.url, filename: sound.name, _id: sound.id })}
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
    </div>
  );
};
