'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  UploadCloud,
  Trash2,
  Copy,
  Check,
  Image as ImageIcon,
  AlertCircle,
  CheckCircle2,
  RefreshCw,
  Plus,
  Sparkles,
  ExternalLink,
  Layers
} from 'lucide-react';
import { Button } from '../common/Button';
import { useModal } from '../../context/ModalContext';

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
  onSelectForOverlay?: (media: MediaItem) => void;
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

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Maximum allowed file size: 2MB in bytes
  const MAX_SIZE_BYTES = 2 * 1024 * 1024;
  const ALLOWED_TYPES = ['image/png', 'image/jpeg', 'image/jpg', 'image/gif'];

  const fetchMedia = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/media');
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

  // Format bytes to human readable string (KB / MB)
  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  const handleFileProcess = async (file: File) => {
    setErrorMsg(null);
    setSuccessMsg(null);

    // 1. Client-side size validation (2MB limit)
    if (file.size > MAX_SIZE_BYTES) {
      const sizeMb = (file.size / (1024 * 1024)).toFixed(2);
      setErrorMsg(`File exceeds the 2MB limit (${sizeMb} MB). Please choose an image or GIF under 2MB.`);
      return;
    }

    // 2. Client-side type validation
    const fileType = file.type.toLowerCase();
    const isImage = ALLOWED_TYPES.includes(fileType) || /\.(png|jpe?g|gif)$/i.test(file.name);
    if (!isImage) {
      setErrorMsg('Unsupported file format. Please upload PNG, JPG, or GIF only.');
      return;
    }

    // 3. Upload to backend & save in MongoDB
    setUploading(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await fetch('/api/media', {
        method: 'POST',
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
            method: 'DELETE'
          });
          const data = await res.json();
          if (res.ok && data.success) {
            setMediaList((prev) => prev.filter((m) => m._id !== id));
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
            Upload custom PNG, JPG, or animated GIFs to display on your live OBS alert overlays. Stored securely in MongoDB.
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs font-mono">
          <span className="px-2.5 py-1 rounded-md bg-slate-800 text-slate-300">
            {mediaList.length} {mediaList.length === 1 ? 'file' : 'files'}
          </span>
          <span className="px-2.5 py-1 rounded-md bg-cyan-950 text-cyan-300">
            Max 2MB / file
          </span>
        </div>
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
            <span>Free: 20MB • Starter: 1GB • Pro: 10GB</span>
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
          accept="image/png,image/jpeg,image/jpg,image/gif"
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
            Supports <strong className="text-slate-300">PNG</strong>, <strong className="text-slate-300">JPG</strong>, or <strong className="text-slate-300">GIF</strong>. Maximum file size is <strong className="text-cyan-400">2MB</strong>.
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
              Upload your stream reaction GIFs, victory icons, or sponsor logos above (up to 2MB).
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {mediaList.map((item) => (
              <div
                key={item._id}
                className="group rounded-xl bg-slate-900/60 border border-slate-800/80 overflow-hidden flex flex-col justify-between hover:border-slate-700 transition-all shadow-sm"
              >
                {/* Media Image / GIF Preview */}
                <div className="w-full aspect-square bg-slate-950 flex items-center justify-center relative overflow-hidden p-2">
                  <img
                    src={item.url}
                    alt={item.filename}
                    className="max-w-full max-h-full object-contain rounded-lg"
                    loading="lazy"
                  />
                  <span className="absolute top-2 right-2 px-1.5 py-0.5 rounded text-[10px] font-mono font-bold uppercase bg-black/70 text-slate-300">
                    {item.filename.split('.').pop() || 'IMG'}
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
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
