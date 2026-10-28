'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  UploadCloud,
  Image as ImageIcon,
  Check,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  Loader2
} from 'lucide-react';
import { MediaItem } from './MediaLibraryManager';

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
  subtitle = 'Select an image or GIF from your library, or upload a new file directly.'
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
    percentUsed: number;
  } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const MAX_SIZE_BYTES = 2 * 1024 * 1024; // 2MB per file
  const ALLOWED_TYPES = ['image/png', 'image/jpeg', 'image/jpg', 'image/gif', 'image/webp'];

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
        // Filter to image/gif assets suitable for profile logos & visual media
        const images = (data.media || []).filter(
          (item: MediaItem) =>
            (item.fileType && item.fileType.startsWith('image/')) ||
            /\.(png|jpe?g|gif|webp)$/i.test(item.url || item.filename || '')
        );
        setMediaList(images);
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
      setErrorMsg(`File exceeds the 2MB limit (${sizeMb} MB). Please choose an image under 2MB.`);
      return;
    }

    const fileType = (file.type || '').toLowerCase();
    const isImage = ALLOWED_TYPES.includes(fileType) || /\.(png|jpe?g|gif|webp)$/i.test(file.name);
    if (!isImage) {
      setErrorMsg('Unsupported file format. Please upload PNG, JPG, GIF, or WEBP only.');
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
    onSelect(selectedUrl, found);
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
                accept="image/png,image/jpeg,image/jpg,image/gif,image/webp"
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
                PNG, JPG, GIF up to 2MB (or drag &amp; drop here)
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
                Click &ldquo;Upload New Media&rdquo; above to upload a profile logo or image directly into your library.
              </p>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/40 text-xs font-bold transition-colors cursor-pointer"
              >
                <UploadCloud size={14} />
                <span>Upload First Image</span>
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
              {mediaList.map((item) => {
                const isSelected = selectedUrl === item.url;
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
                    <div className="aspect-square w-full bg-slate-900/80 flex items-center justify-center overflow-hidden relative">
                      <img
                        src={item.url}
                        alt={item.filename}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                      />
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

        {/* Modal Footer */}
        <div className="px-6 py-4 border-t border-slate-800 bg-[#0B0F19] flex items-center justify-between gap-3">
          <div className="text-xs font-mono text-slate-400 truncate">
            {selectedUrl ? '1 media item selected' : 'Click an image above to select it'}
          </div>

          <div className="flex items-center gap-2.5 flex-shrink-0">
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
              className="inline-flex items-center gap-2 px-5 py-2 rounded-xl bg-gradient-to-r from-cyan-400 to-cyan-300 hover:from-cyan-300 hover:to-cyan-200 text-slate-950 font-extrabold text-xs transition-all cursor-pointer disabled:opacity-40"
            >
              <Check size={14} />
              <span>Use Selected Logo</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
