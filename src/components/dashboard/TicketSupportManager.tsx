'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Headphones,
  Plus,
  RefreshCw,
  CheckCircle2,
  Clock,
  AlertCircle,
  MessageSquare,
  Trash2,
  Search,
  Send,
  UserCheck,
  UserX,
  Copy,
  Check,
  Sparkles,
  ShieldCheck,
  LifeBuoy,
  X,
  Flame,
  Inbox,
  Calendar,
  ArrowRightLeft,
  Mic,
  Square,
  Link2,
  FileText,
  ExternalLink,
  Download,
  Image as ImageIcon,
  Film,
  Play,
  Pause
} from 'lucide-react';
import { request } from '../../services/api';
import { SupportTicket, TicketAttachment, TicketMessage } from '../../types/streamer';
import { useModal } from '../../context/ModalContext';
import { useSocket } from '../../context/SocketContext';
import { useAuth } from '../../context/AuthContext';

interface TicketSupportManagerProps {
  isAdmin?: boolean;
}

export interface ActiveSupportAdmin {
  id: string;
  username: string;
  displayName: string;
  email: string;
  avatarUrl?: string;
  bio?: string;
  isVerified?: boolean;
  role: string;
  isOnline: boolean;
  lastActiveAt?: string;
}

const CATEGORY_CONFIG: Record<string, { label: string; color: string }> = {
  general: { label: 'General Support', color: 'bg-slate-800 text-slate-300 border-slate-700' },
  technical: { label: 'Technical Issue', color: 'bg-rose-500/15 text-rose-400 border-rose-500/30' },
  payment: { label: 'Payment & KHQR', color: 'bg-amber-500/15 text-amber-400 border-amber-500/30' },
  overlay: { label: 'OBS & Overlays', color: 'bg-cyan-500/15 text-cyan-400 border-cyan-500/30' },
  feature: { label: 'Feature Request', color: 'bg-indigo-500/15 text-indigo-400 border-indigo-500/30' },
  other: { label: 'Other Inquiries', color: 'bg-slate-800 text-slate-400 border-slate-700' }
};

const PRIORITY_CONFIG: Record<string, { label: string; color: string }> = {
  urgent: { label: 'Urgent', color: 'bg-rose-500/15 text-rose-400 border-rose-500/35' },
  high: { label: 'High', color: 'bg-orange-500/15 text-orange-400 border-orange-500/35' },
  medium: { label: 'Medium', color: 'bg-sky-500/15 text-sky-400 border-sky-500/35' },
  low: { label: 'Low', color: 'bg-slate-800 text-slate-400 border-slate-700' }
};

const STATUS_CONFIG: Record<string, { label: string; color: string; dot: string }> = {
  open: { label: 'Waiting for Agent', color: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30', dot: 'bg-emerald-400' },
  claimed: { label: 'In Live Chat', color: 'bg-indigo-500/15 text-indigo-400 border-indigo-500/30', dot: 'bg-indigo-400' },
  resolved: { label: 'Resolved', color: 'bg-teal-500/15 text-teal-400 border-teal-500/30', dot: 'bg-teal-400' },
  closed: { label: 'Closed', color: 'bg-slate-800 text-slate-400 border-slate-700', dot: 'bg-slate-500' }
};

const formatDurationSec = (sec?: number) => {
  const s = Math.max(0, Math.round(sec || 0));
  const mins = Math.floor(s / 60);
  const rem = s % 60;
  return `${mins}:${rem.toString().padStart(2, '0')}`;
};

const buildFallbackWaveform = (seedStr: string, count = 28): number[] => {
  let hash = 0;
  for (let i = 0; i < seedStr.length; i++) {
    hash = (hash * 31 + seedStr.charCodeAt(i)) | 0;
  }
  return Array.from({ length: count }, (_, idx) => {
    const val = Math.abs(Math.sin((idx + 1) * 0.7 + (hash % 17) * 0.23) * Math.cos(idx * 0.35 + (hash % 7)));
    return Math.min(1, Math.max(0.22, 0.25 + val * 0.72));
  });
};

const SentVoiceCard: React.FC<{ attachment: TicketAttachment; isAdminBubble: boolean }> = ({
  attachment,
  isAdminBubble
}) => {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [audioDuration, setAudioDuration] = useState<number>(attachment.durationSec || 0);
  const [playbackRate, setPlaybackRate] = useState<1 | 1.5 | 2>(1);

  const bars = useMemo(
    () =>
      Array.isArray(attachment.waveform) && attachment.waveform.length > 0
        ? attachment.waveform
        : buildFallbackWaveform(attachment.id || attachment.url),
    [attachment.waveform, attachment.id, attachment.url]
  );

  const totalDur = Math.max(1, audioDuration || attachment.durationSec || 1);
  const progress = Math.min(1, currentTime / totalDur);

  const togglePlay = () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (isPlaying) {
      audio.pause();
      setIsPlaying(false);
    } else {
      audio.playbackRate = playbackRate;
      audio.play().then(() => setIsPlaying(true)).catch(() => {});
    }
  };

  const cycleSpeed = () => {
    const next: 1 | 1.5 | 2 = playbackRate === 1 ? 1.5 : playbackRate === 1.5 ? 2 : 1;
    setPlaybackRate(next);
    if (audioRef.current) {
      audioRef.current.playbackRate = next;
    }
  };

  const handleScrub = (e: React.MouseEvent<HTMLDivElement>) => {
    const audio = audioRef.current;
    if (!audio) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const ratio = Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width));
    const targetDur = Number.isFinite(audio.duration) && audio.duration > 0 ? audio.duration : totalDur;
    audio.currentTime = ratio * targetDur;
    setCurrentTime(audio.currentTime);
  };

  return (
    <div
      className={`w-[225px] sm:w-[275px] max-w-full rounded-2xl p-2.5 border backdrop-blur-sm transition-all ${
        isAdminBubble
          ? 'bg-indigo-950/55 border-indigo-400/25'
          : 'bg-slate-950/70 border-slate-700/60'
      }`}
    >
      <audio
        ref={audioRef}
        src={attachment.url}
        preload="metadata"
        onLoadedMetadata={(e) => {
          const d = e.currentTarget.duration;
          if (Number.isFinite(d) && d > 0) setAudioDuration(d);
        }}
        onTimeUpdate={(e) => setCurrentTime(e.currentTarget.currentTime)}
        onEnded={() => {
          setIsPlaying(false);
          setCurrentTime(0);
        }}
        className="hidden"
      />

      <div className="flex items-center gap-2.5">
        <button
          type="button"
          onClick={togglePlay}
          className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 transition-all shadow-md cursor-pointer ${
            isPlaying
              ? 'bg-gradient-to-br from-cyan-400 to-blue-500 text-white ring-2 ring-cyan-400/35 scale-105'
              : isAdminBubble
              ? 'bg-indigo-500 hover:bg-indigo-400 text-white'
              : 'bg-cyan-500 hover:bg-cyan-400 text-slate-950'
          }`}
          title={isPlaying ? 'Pause voice message' : 'Play voice message'}
        >
          {isPlaying ? <Pause className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 fill-current ml-0.5" />}
        </button>

        <div className="flex-1 min-w-0 space-y-1.5">
          {/* Interactive Waveform Scrubber */}
          <div
            role="slider"
            aria-label="Voice note progress"
            aria-valuemin={0}
            aria-valuemax={Math.round(totalDur)}
            aria-valuenow={Math.round(currentTime)}
            tabIndex={0}
            onClick={handleScrub}
            className="h-7 flex items-center gap-[2px] cursor-pointer select-none overflow-hidden"
          >
            {bars.map((level, idx) => {
              const barPos = (idx + 0.5) / bars.length;
              const isPlayed = barPos <= progress;
              return (
                <span
                  key={idx}
                  className={`flex-1 min-w-[2px] max-w-[5px] rounded-full transition-colors ${
                    isPlayed
                      ? 'bg-cyan-400'
                      : isAdminBubble
                      ? 'bg-indigo-400/30 hover:bg-indigo-400/50'
                      : 'bg-slate-600/70 hover:bg-slate-500'
                  }`}
                  style={{ height: `${Math.round(level * 100)}%` }}
                />
              );
            })}
          </div>

          <div className="flex items-center justify-between gap-2 text-[10px] font-mono">
            <span className="inline-flex items-center gap-1 text-slate-300/90 tabular-nums">
              <Mic className={`w-2.5 h-2.5 ${isPlaying ? 'text-cyan-400 animate-pulse' : 'text-slate-400'}`} />
              <span>
                {isPlaying || currentTime > 0
                  ? `${formatDurationSec(currentTime)} / ${formatDurationSec(audioDuration || attachment.durationSec)}`
                  : formatDurationSec(audioDuration || attachment.durationSec)}
              </span>
            </span>

            <button
              type="button"
              onClick={cycleSpeed}
              className="px-1.5 py-0.5 rounded-md bg-white/10 hover:bg-white/15 text-slate-200 text-[9px] font-bold transition-colors cursor-pointer"
              title="Toggle playback speed"
            >
              {playbackRate}x
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export const TicketSupportManager: React.FC<TicketSupportManagerProps> = ({ isAdmin = false }) => {
  const { showConfirm } = useModal();
  const { socket } = useSocket();
  const { user } = useAuth();

  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [activeSupports, setActiveSupports] = useState<ActiveSupportAdmin[]>([]);
  const [availableAdmins, setAvailableAdmins] = useState<ActiveSupportAdmin[]>([]);
  const [serverIsAdmin, setServerIsAdmin] = useState<boolean>(false);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [adminQueueFilter, setAdminQueueFilter] = useState<'all' | 'mine' | 'unclaimed'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Server-enforced Admin Desk capability (cannot be enabled by client tampering alone)
  const hasAdminPower = Boolean(isAdmin && serverIsAdmin);

  // Selected Ticket & Live Chat State
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null);
  const [messages, setMessages] = useState<TicketMessage[]>([]);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [sendingReply, setSendingReply] = useState(false);
  const [claimingTicket, setClaimingTicket] = useState(false);
  const [updatingTicketMeta, setUpdatingTicketMeta] = useState(false);
  const [copiedId, setCopiedId] = useState(false);

  // Rich Composer State (Attachments & Voice Recording)
  const [pendingAttachments, setPendingAttachments] = useState<TicketAttachment[]>([]);
  const [uploadingAttachment, setUploadingAttachment] = useState(false);
  const [composerError, setComposerError] = useState<string | null>(null);
  const [isRecordingVoice, setIsRecordingVoice] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [visualizerBars, setVisualizerBars] = useState<number[]>(() => Array(28).fill(0.16));
  const [recordedVoiceDraft, setRecordedVoiceDraft] = useState<{
    file: File;
    previewUrl: string;
    durationSec: number;
    waveform: number[];
  } | null>(null);
  const [isPlayingVoicePreview, setIsPlayingVoicePreview] = useState(false);
  const [voicePreviewTime, setVoicePreviewTime] = useState(0);

  const MAX_VOICE_DURATION_SEC = 60;
  const MAX_VIDEO_DURATION_SEC = 300; // 5 minutes
  const VISUALIZER_BAR_COUNT = 28;

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordTimerRef = useRef<number | null>(null);
  const recordCancelledRef = useRef<boolean>(false);
  const recordStartedAtRef = useRef<number>(0);
  const audioContextRef = useRef<AudioContext | null>(null);
  const visualizerRafRef = useRef<number | null>(null);
  const capturedWaveformRef = useRef<number[]>([]);
  const lastWaveSampleAtRef = useRef<number>(0);
  const voicePreviewAudioRef = useRef<HTMLAudioElement | null>(null);
  const recordedVoiceDraftRef = useRef(recordedVoiceDraft);
  recordedVoiceDraftRef.current = recordedVoiceDraft;

  // Transfer Ticket Modal (Admin Only)
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [transferTargetId, setTransferTargetId] = useState('');
  const [transferIdentifier, setTransferIdentifier] = useState('');
  const [transferNote, setTransferNote] = useState('');
  const [transferringTicket, setTransferringTicket] = useState(false);
  const [transferError, setTransferError] = useState<string | null>(null);

  // New Ticket Creation Modal
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newCategory, setNewCategory] = useState('technical');
  const [newPriority, setNewPriority] = useState('medium');
  const [newMessage, setNewMessage] = useState('');
  const [submittingTicket, setSubmittingTicket] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const selectedTicket = useMemo(
    () => tickets.find((t) => t.id === selectedTicketId) || null,
    [tickets, selectedTicketId]
  );

  const scrollToBottom = (smooth = true) => {
    messagesEndRef.current?.scrollIntoView({ behavior: smooth ? 'smooth' : 'auto' });
  };

  // 1. Load tickets list
  const loadTickets = async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const queryParams = new URLSearchParams();
      if (!isAdmin) queryParams.set('scope', 'mine');
      if (statusFilter !== 'ALL') queryParams.set('status', statusFilter);

      const res = await request<any>(`/tickets?${queryParams.toString()}`);
      if (res && res.tickets) {
        setTickets(res.tickets);
        setServerIsAdmin(Boolean(res.isAdmin));
        if (Array.isArray(res.activeSupports)) {
          setActiveSupports(res.activeSupports);
        }
        setAvailableAdmins(Array.isArray(res.availableAdmins) ? res.availableAdmins : []);

        // Auto-select first ticket if none selected, or clear selection if selected ticket was deleted
        if (!selectedTicketId && res.tickets.length > 0) {
          setSelectedTicketId(res.tickets[0].id);
        } else if (
          selectedTicketId &&
          statusFilter === 'ALL' &&
          !res.tickets.some((t: SupportTicket) => t.id === selectedTicketId)
        ) {
          setSelectedTicketId(res.tickets.length > 0 ? res.tickets[0].id : null);
          setMessages([]);
          setPendingAttachments([]);
          setReplyText('');
        }
      }
    } catch (err: any) {
      console.error('[TicketSupportManager] Failed to load tickets:', err);
    } finally {
      if (!silent) setLoading(false);
    }
  };

  // 2. Load conversation thread when active ticket changes
  const loadTicketMessages = async (ticketId: string) => {
    setLoadingMessages(true);
    try {
      const res = await request<any>(`/tickets/${ticketId}`);
      if (res && res.messages) {
        setMessages(res.messages);
        setTimeout(() => scrollToBottom(false), 80);
      }
      if (res && res.ticket) {
        setTickets((prev) => prev.map((t) => (t.id === ticketId ? { ...t, ...res.ticket } : t)));
      }
    } catch (err: any) {
      console.error('[TicketSupportManager] Failed to load messages:', err);
    } finally {
      setLoadingMessages(false);
    }
  };

  useEffect(() => {
    loadTickets();
  }, [statusFilter, isAdmin]);

  useEffect(() => {
    if (selectedTicketId) {
      loadTicketMessages(selectedTicketId);
    } else {
      setMessages([]);
    }
  }, [selectedTicketId]);

  // 3. Socket.IO Live Real-Time Chat Sync
  useEffect(() => {
    if (!socket || !selectedTicketId) return;

    socket.emit('join:ticket', { ticketId: selectedTicketId });

    const handleNewMessage = (data: { ticketId: string; message: TicketMessage }) => {
      if (data.ticketId === selectedTicketId) {
        setMessages((prev) => {
          if (prev.some((m) => m.id === data.message.id)) return prev;
          return [...prev, data.message];
        });
        setTimeout(() => scrollToBottom(true), 50);
      }

      // Update snippet in tickets list
      setTickets((prev) =>
        prev.map((t) =>
          t.id === data.ticketId
            ? {
                ...t,
                lastMessage: data.message.message,
                lastMessageAt: data.message.createdAt,
                status: t.status === 'resolved' || t.status === 'closed' ? 'claimed' : t.status
              }
            : t
        )
      );
    };

    const handleTicketClaimed = (data: any) => {
      if (selectedTicketId) {
        setTickets((prev) =>
          prev.map((t) =>
            t.id === selectedTicketId
              ? {
                  ...t,
                  status: data.status || (data.claimedById ? 'claimed' : 'open'),
                  claimedById: data.claimedById ?? null,
                  claimedByName: data.claimedByName ?? null,
                  claimedByAvatar: data.claimedByAvatar ?? null,
                  claimedAt: data.claimedAt ?? null
                }
              : t
          )
        );
        if (data.systemMessage) {
          setMessages((prev) => {
            if (prev.some((m) => m.id === data.systemMessage.id)) return prev;
            return [...prev, data.systemMessage];
          });
          setTimeout(() => scrollToBottom(true), 50);
        }
      }
    };

    const handleStatusChanged = (data: any) => {
      if (selectedTicketId) {
        setTickets((prev) =>
          prev.map((t) => (t.id === selectedTicketId ? { ...t, ...data } : t))
        );
        if (data.systemMessage) {
          setMessages((prev) => {
            if (prev.some((m) => m.id === data.systemMessage.id)) return prev;
            return [...prev, data.systemMessage];
          });
          setTimeout(() => scrollToBottom(true), 50);
        }
      }
    };

    socket.on('ticket:message', handleNewMessage);
    socket.on('ticket:claimed', handleTicketClaimed);
    socket.on('ticket:status_changed', handleStatusChanged);

    return () => {
      socket.emit('leave:ticket', { ticketId: selectedTicketId });
      socket.off('ticket:message', handleNewMessage);
      socket.off('ticket:claimed', handleTicketClaimed);
      socket.off('ticket:status_changed', handleStatusChanged);
    };
  }, [socket, selectedTicketId]);

  // Listen for real-time Admin online/offline presence changes and ticket deletions
  useEffect(() => {
    if (!socket) return;
    const handlePresence = () => {
      loadTickets(true);
    };
    const handleTicketDeleted = (data: { ticketId?: string }) => {
      if (!data?.ticketId) return;
      const deletedId = data.ticketId;
      setTickets((prev) => prev.filter((t) => t.id !== deletedId));
      setSelectedTicketId((currentId) => {
        if (currentId !== deletedId) return currentId;
        stopActiveRecorderResources(true);
        clearRecordedVoiceDraft();
        setMessages([]);
        setPendingAttachments([]);
        setReplyText('');
        setComposerError(null);
        return null;
      });
    };
    socket.on('support:admin_presence', handlePresence);
    socket.on('ticket:deleted', handleTicketDeleted);
    return () => {
      socket.off('support:admin_presence', handlePresence);
      socket.off('ticket:deleted', handleTicketDeleted);
    };
  }, [socket, statusFilter, isAdmin]);

  // Periodic polling fallback (every 12s)
  useEffect(() => {
    const interval = setInterval(() => {
      loadTickets(true);
      if (selectedTicketId) {
        request<any>(`/tickets/${selectedTicketId}`).then((res) => {
          if (res && res.messages) {
            setMessages(res.messages);
          }
        }).catch(() => {});
      }
    }, 12000);
    return () => clearInterval(interval);
  }, [selectedTicketId]);

  // Helper formatting & URL auto-link rendering
  const formatAttachmentSize = (bytes?: number) => {
    if (!bytes || bytes <= 0) return '';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const renderMessageTextWithLinks = (text: string) => {
    const urlRegex = /(https?:\/\/[^\s<]+)/g;
    const parts = text.split(urlRegex);
    return parts.map((part, idx) => {
      if (part.match(/^https?:\/\/[^\s<]+$/)) {
        return (
          <a
            key={idx}
            href={part}
            target="_blank"
            rel="noopener noreferrer"
            className="underline decoration-cyan-400/60 text-cyan-300 hover:text-cyan-200 break-all"
          >
            {part}
          </a>
        );
      }
      return <React.Fragment key={idx}>{part}</React.Fragment>;
    });
  };

  const clearRecordedVoiceDraft = () => {
    if (voicePreviewAudioRef.current) {
      voicePreviewAudioRef.current.pause();
      voicePreviewAudioRef.current.currentTime = 0;
    }
    setIsPlayingVoicePreview(false);
    setVoicePreviewTime(0);
    setRecordedVoiceDraft((prev) => {
      if (prev?.previewUrl) {
        URL.revokeObjectURL(prev.previewUrl);
      }
      return null;
    });
  };

  const stopVisualizerResources = () => {
    if (visualizerRafRef.current !== null) {
      cancelAnimationFrame(visualizerRafRef.current);
      visualizerRafRef.current = null;
    }
    if (audioContextRef.current) {
      audioContextRef.current.close().catch(() => {});
      audioContextRef.current = null;
    }
    setVisualizerBars(Array(VISUALIZER_BAR_COUNT).fill(0.16));
  };

  // Cleanup active voice recording & composer state when switching tickets or unmounting
  const stopActiveRecorderResources = (cancel = true) => {
    recordCancelledRef.current = cancel;
    if (recordTimerRef.current) {
      window.clearInterval(recordTimerRef.current);
      recordTimerRef.current = null;
    }
    stopVisualizerResources();
    const recorder = mediaRecorderRef.current;
    if (recorder && recorder.state !== 'inactive') {
      try {
        recorder.stop();
      } catch {}
    } else if (recorder) {
      recorder.stream.getTracks().forEach((t) => t.stop());
      mediaRecorderRef.current = null;
    }
    setIsRecordingVoice(false);
    setRecordingSeconds(0);
  };

  useEffect(() => {
    stopActiveRecorderResources(true);
    clearRecordedVoiceDraft();
    setPendingAttachments([]);
    setComposerError(null);
  }, [selectedTicketId]);

  useEffect(() => {
    return () => {
      stopActiveRecorderResources(true);
      if (recordedVoiceDraftRef.current?.previewUrl) {
        URL.revokeObjectURL(recordedVoiceDraftRef.current.previewUrl);
      }
    };
  }, []);

  // Upload images, videos, or voice clips to selected ticket
  const uploadAttachmentFile = async (
    file: File,
    kind?: 'voice' | 'image' | 'video',
    durationSec?: number
  ) => {
    if (!selectedTicketId) return null;
    const formData = new FormData();
    formData.append('file', file);
    if (kind) formData.append('kind', kind);
    if (durationSec && durationSec > 0) formData.append('durationSec', String(durationSec));

    const res = await request<any>(`/tickets/${selectedTicketId}/upload`, {
      method: 'POST',
      body: formData
    });
    return res?.attachment as TicketAttachment | undefined;
  };

  const isVideoMediaFile = (file: File) => {
    const mime = String(file.type || '').toLowerCase();
    if (mime.startsWith('video/')) return true;
    return /\.(mp4|mov|webm|m4v|ogv|3gp|avi|mkv)$/i.test(file.name);
  };

  const isSupportedMediaFile = (file: File) => {
    const mime = String(file.type || '').toLowerCase();
    if (mime.startsWith('image/') && !mime.includes('svg')) return true;
    if (isVideoMediaFile(file)) return true;
    return /\.(png|jpe?g|webp|gif|bmp|heic|heif|avif)$/i.test(file.name);
  };

  const readVideoDurationSeconds = (file: File): Promise<number | null> =>
    new Promise((resolve) => {
      const objectUrl = URL.createObjectURL(file);
      const video = document.createElement('video');
      video.preload = 'metadata';

      const finish = (seconds: number | null) => {
        URL.revokeObjectURL(objectUrl);
        video.removeAttribute('src');
        resolve(seconds);
      };

      video.onloadedmetadata = () => {
        const dur = Number.isFinite(video.duration) && video.duration > 0 ? Math.round(video.duration) : null;
        finish(dur);
      };
      video.onerror = () => finish(null);
      video.src = objectUrl;
    });

  const handleFileInputChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const fileList = e.target.files;
    if (!fileList || fileList.length === 0 || !selectedTicketId) return;

    const remainingSlots = Math.max(0, 6 - pendingAttachments.length);
    if (remainingSlots === 0) {
      setComposerError('Maximum 6 attachments per message.');
      e.target.value = '';
      return;
    }

    const selectedFiles = Array.from(fileList);
    const validMediaFiles = selectedFiles.filter(isSupportedMediaFile);
    if (validMediaFiles.length === 0) {
      setComposerError('Only image and video files can be attached.');
      e.target.value = '';
      return;
    }

    setUploadingAttachment(true);
    setComposerError(
      validMediaFiles.length < selectedFiles.length
        ? 'Some files were skipped. Only images and videos are supported.'
        : null
    );

    try {
      const filesToUpload = validMediaFiles.slice(0, remainingSlots);
      for (const file of filesToUpload) {
        if (isVideoMediaFile(file)) {
          const videoDurationSec = await readVideoDurationSeconds(file);
          if (videoDurationSec !== null && videoDurationSec > MAX_VIDEO_DURATION_SEC) {
            setComposerError('Video duration cannot exceed 5 minutes (5:00 max).');
            continue;
          }
          const uploaded = await uploadAttachmentFile(file, 'video', videoDurationSec ?? undefined);
          if (uploaded) {
            setPendingAttachments((prev) => [...prev, uploaded]);
          }
        } else {
          const uploaded = await uploadAttachmentFile(file, 'image');
          if (uploaded) {
            setPendingAttachments((prev) => [...prev, uploaded]);
          }
        }
      }
    } catch (err: any) {
      setComposerError(err.message || 'Failed to upload image or video attachment.');
    } finally {
      setUploadingAttachment(false);
      e.target.value = '';
    }
  };

  const buildWaveformSummary = (samples: number[]): number[] => {
    if (!samples.length) {
      return Array.from({ length: VISUALIZER_BAR_COUNT }, (_, i) =>
        0.25 + 0.45 * Math.abs(Math.sin(i * 0.65))
      );
    }
    const bars: number[] = [];
    for (let i = 0; i < VISUALIZER_BAR_COUNT; i++) {
      const start = Math.floor((i / VISUALIZER_BAR_COUNT) * samples.length);
      const end = Math.max(start + 1, Math.floor(((i + 1) / VISUALIZER_BAR_COUNT) * samples.length));
      let peak = 0.2;
      for (let j = start; j < end && j < samples.length; j++) {
        if (samples[j] > peak) peak = samples[j];
      }
      bars.push(Math.min(1, Math.max(0.2, peak)));
    }
    return bars;
  };

  const handleStartVoiceRecording = async () => {
    if (!selectedTicketId || isRecordingVoice || uploadingAttachment) return;
    if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') {
      setComposerError('Voice recording is not supported in this browser.');
      return;
    }

    clearRecordedVoiceDraft();
    setComposerError(null);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const preferredTypes = ['audio/webm;codecs=opus', 'audio/webm', 'audio/ogg;codecs=opus', 'audio/mp4'];
      const chosenMime = preferredTypes.find((type) => MediaRecorder.isTypeSupported(type));
      const recorder = chosenMime ? new MediaRecorder(stream, { mimeType: chosenMime }) : new MediaRecorder(stream);

      audioChunksRef.current = [];
      capturedWaveformRef.current = [];
      lastWaveSampleAtRef.current = 0;
      recordCancelledRef.current = false;
      recordStartedAtRef.current = Date.now();
      mediaRecorderRef.current = recorder;

      // Start Real Web Audio API Live Voice Visualizer
      try {
        const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
        if (AudioCtx) {
          const ctx = new AudioCtx();
          const source = ctx.createMediaStreamSource(stream);
          const analyser = ctx.createAnalyser();
          analyser.fftSize = 64;
          analyser.smoothingTimeConstant = 0.72;
          source.connect(analyser);
          audioContextRef.current = ctx;

          const freqData = new Uint8Array(analyser.frequencyBinCount);
          const renderVisualizer = () => {
            analyser.getByteFrequencyData(freqData);
            const nextBars: number[] = [];
            let sum = 0;
            for (let i = 0; i < VISUALIZER_BAR_COUNT; i++) {
              const binIdx = Math.min(freqData.length - 1, Math.floor((i / VISUALIZER_BAR_COUNT) * freqData.length));
              const normalized = Math.min(1, Math.max(0.16, freqData[binIdx] / 215));
              nextBars.push(normalized);
              sum += normalized;
            }
            setVisualizerBars(nextBars);

            const nowMs = Date.now();
            if (nowMs - lastWaveSampleAtRef.current >= 120) {
              lastWaveSampleAtRef.current = nowMs;
              capturedWaveformRef.current.push(Math.min(1, Math.max(0.2, (sum / VISUALIZER_BAR_COUNT) * 1.35)));
            }

            visualizerRafRef.current = requestAnimationFrame(renderVisualizer);
          };
          visualizerRafRef.current = requestAnimationFrame(renderVisualizer);
        }
      } catch {
        // Fallback visual animation if AudioContext unavailable
      }

      recorder.ondataavailable = (ev) => {
        if (ev.data && ev.data.size > 0) {
          audioChunksRef.current.push(ev.data);
        }
      };

      recorder.onstop = () => {
        stream.getTracks().forEach((track) => track.stop());
        if (recordTimerRef.current) {
          window.clearInterval(recordTimerRef.current);
          recordTimerRef.current = null;
        }
        stopVisualizerResources();

        const elapsedSec = Math.min(
          MAX_VOICE_DURATION_SEC,
          Math.max(1, Math.round((Date.now() - recordStartedAtRef.current) / 1000))
        );
        mediaRecorderRef.current = null;
        setIsRecordingVoice(false);
        setRecordingSeconds(0);

        if (recordCancelledRef.current || audioChunksRef.current.length === 0) {
          audioChunksRef.current = [];
          capturedWaveformRef.current = [];
          return;
        }

        const mime = (recorder.mimeType || 'audio/webm').split(';')[0];
        const ext = mime.includes('ogg') ? 'ogg' : mime.includes('mp4') ? 'm4a' : 'webm';
        const blob = new Blob(audioChunksRef.current, { type: mime });
        audioChunksRef.current = [];

        const voiceFile = new File([blob], `voice-note-${Date.now()}.${ext}`, { type: mime });
        const previewUrl = URL.createObjectURL(blob);
        const waveform = buildWaveformSummary(capturedWaveformRef.current);
        capturedWaveformRef.current = [];

        setRecordedVoiceDraft({
          file: voiceFile,
          previewUrl,
          durationSec: elapsedSec,
          waveform
        });
      };

      recorder.start(200);
      setIsRecordingVoice(true);
      setRecordingSeconds(0);
      recordTimerRef.current = window.setInterval(() => {
        const secs = Math.floor((Date.now() - recordStartedAtRef.current) / 1000);
        if (secs >= MAX_VOICE_DURATION_SEC) {
          setRecordingSeconds(MAX_VOICE_DURATION_SEC);
          stopActiveRecorderResources(false);
        } else {
          setRecordingSeconds(secs);
        }
      }, 250);
    } catch (err: any) {
      stopVisualizerResources();
      setComposerError(err.message || 'Microphone access denied or unavailable.');
    }
  };

  const handleToggleVoicePreview = () => {
    const audio = voicePreviewAudioRef.current;
    if (!audio || !recordedVoiceDraft) return;
    if (isPlayingVoicePreview) {
      audio.pause();
      setIsPlayingVoicePreview(false);
    } else {
      audio.play().then(() => setIsPlayingVoicePreview(true)).catch(() => {});
    }
  };

  const handleSendVoiceDraft = async () => {
    if (!selectedTicketId || !recordedVoiceDraft || sendingReply || uploadingAttachment) return;

    const draft = recordedVoiceDraft;
    if (voicePreviewAudioRef.current) {
      voicePreviewAudioRef.current.pause();
    }
    setIsPlayingVoicePreview(false);
    setUploadingAttachment(true);
    setComposerError(null);

    try {
      const uploaded = await uploadAttachmentFile(draft.file, 'voice', draft.durationSec);
      if (!uploaded) {
        throw new Error('Failed to upload voice recording.');
      }

      const textToSend = replyText.trim();
      const attachmentsToSend = [
        ...pendingAttachments,
        { ...uploaded, waveform: draft.waveform }
      ];

      setSendingReply(true);
      const res = await request<any>(`/tickets/${selectedTicketId}/messages`, {
        method: 'POST',
        body: JSON.stringify({
          message: textToSend,
          attachments: attachmentsToSend
        })
      });

      if (res && res.message) {
        clearRecordedVoiceDraft();
        setReplyText('');
        setPendingAttachments([]);
        if (textareaRef.current) textareaRef.current.style.height = 'auto';

        setMessages((prev) => {
          if (prev.some((m) => m.id === res.message.id)) return prev;
          return [...prev, res.message];
        });
        setTimeout(() => scrollToBottom(true), 60);

        setTickets((prev) =>
          prev.map((t) =>
            t.id === selectedTicketId
              ? {
                  ...t,
                  lastMessage: textToSend || '🎤 Voice message',
                  lastMessageAt: res.message.createdAt,
                  status: res.ticketStatus || t.status
                }
              : t
          )
        );
      }
    } catch (err: any) {
      setComposerError(err.message || 'Failed to send voice message.');
    } finally {
      setUploadingAttachment(false);
      setSendingReply(false);
    }
  };

  // 4. Send Message Handler (Text, Voice, and File Attachments)
  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!selectedTicketId || sendingReply || uploadingAttachment || isRecordingVoice) return;

    const textToSend = replyText.trim();
    const attachmentsToSend = [...pendingAttachments];
    if (!textToSend && attachmentsToSend.length === 0) return;

    setReplyText('');
    if (textareaRef.current) textareaRef.current.style.height = 'auto';
    setPendingAttachments([]);
    setComposerError(null);
    setSendingReply(true);

    try {
      const res = await request<any>(`/tickets/${selectedTicketId}/messages`, {
        method: 'POST',
        body: JSON.stringify({
          message: textToSend,
          attachments: attachmentsToSend
        })
      });

      if (res && res.message) {
        setMessages((prev) => {
          if (prev.some((m) => m.id === res.message.id)) return prev;
          return [...prev, res.message];
        });
        setTimeout(() => scrollToBottom(true), 60);

        const snippet =
          textToSend ||
          (attachmentsToSend[0]?.kind === 'voice'
            ? '🎤 Voice message'
            : attachmentsToSend[0]?.kind === 'link'
            ? `🔗 ${attachmentsToSend[0].name}`
            : `📎 ${attachmentsToSend[0]?.name || 'Attachment'}`);

        setTickets((prev) =>
          prev.map((t) =>
            t.id === selectedTicketId
              ? {
                  ...t,
                  lastMessage: snippet,
                  lastMessageAt: res.message.createdAt,
                  status: res.ticketStatus || t.status
                }
              : t
          )
        );
      }
    } catch (err: any) {
      console.error('[TicketSupportManager] Failed to send message:', err);
      setReplyText(textToSend); // Restore on error
      setPendingAttachments(attachmentsToSend);
      setComposerError(err.message || 'Failed to send message.');
    } finally {
      setSendingReply(false);
    }
  };

  // 5. Admin Claim / Unclaim Ticket
  const handleToggleClaim = async (action: 'claim' | 'unclaim') => {
    if (!selectedTicketId || claimingTicket || !hasAdminPower) return;
    setClaimingTicket(true);
    try {
      const res = await request<any>(`/tickets/${selectedTicketId}/claim`, {
        method: 'POST',
        body: JSON.stringify({ action })
      });

      if (res && res.success) {
        await loadTicketMessages(selectedTicketId);
        await loadTickets(true);
      }
    } catch (err: any) {
      console.error('[TicketSupportManager] Claim error:', err);
    } finally {
      setClaimingTicket(false);
    }
  };

  // 5b. Admin Transfer Ticket Modal & Handler
  const handleOpenTransferModal = () => {
    if (!hasAdminPower || !selectedTicket) return;
    const candidate =
      availableAdmins.find((a) => a.id !== selectedTicket.claimedById) || availableAdmins[0] || null;
    setTransferTargetId(candidate ? candidate.id : '');
    setTransferIdentifier('');
    setTransferNote('');
    setTransferError(null);
    setShowTransferModal(true);
  };

  const handleTransferTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTicketId || !hasAdminPower || transferringTicket) return;

    const cleanIdentifier = transferIdentifier.trim();
    if (!transferTargetId && !cleanIdentifier) {
      setTransferError('Please select a target admin or enter their email / username.');
      return;
    }

    setTransferringTicket(true);
    setTransferError(null);

    try {
      const payload: Record<string, string> = { note: transferNote.trim() };
      if (cleanIdentifier) {
        if (cleanIdentifier.includes('@') && !cleanIdentifier.startsWith('@')) {
          payload.targetEmail = cleanIdentifier;
        } else {
          payload.targetUsername = cleanIdentifier.replace(/^@+/, '');
        }
      } else {
        payload.targetAdminId = transferTargetId;
      }

      const res = await request<any>(`/tickets/${selectedTicketId}/transfer`, {
        method: 'POST',
        body: JSON.stringify(payload)
      });

      if (res && res.success) {
        setShowTransferModal(false);
        setTransferNote('');
        setTransferIdentifier('');
        await loadTicketMessages(selectedTicketId);
        await loadTickets(true);
      }
    } catch (err: any) {
      setTransferError(err.message || 'Failed to transfer support ticket');
    } finally {
      setTransferringTicket(false);
    }
  };

  // 6. Update Status (Admin Only)
  const handleUpdateStatus = async (newStatus: 'open' | 'claimed' | 'resolved' | 'closed') => {
    if (!selectedTicketId || !hasAdminPower || updatingTicketMeta) return;
    setUpdatingTicketMeta(true);
    try {
      await request<any>(`/tickets/${selectedTicketId}`, {
        method: 'PUT',
        body: JSON.stringify({ status: newStatus })
      });
      await loadTicketMessages(selectedTicketId);
      await loadTickets(true);
    } catch (err: any) {
      console.error('[TicketSupportManager] Status update error:', err);
    } finally {
      setUpdatingTicketMeta(false);
    }
  };

  // 6b. Update Priority (Admin Only)
  const handleUpdatePriority = async (newPriority: 'low' | 'medium' | 'high' | 'urgent') => {
    if (!selectedTicketId || !hasAdminPower || updatingTicketMeta) return;
    setUpdatingTicketMeta(true);
    try {
      await request<any>(`/tickets/${selectedTicketId}`, {
        method: 'PUT',
        body: JSON.stringify({ priority: newPriority })
      });
      await loadTicketMessages(selectedTicketId);
      await loadTickets(true);
    } catch (err: any) {
      console.error('[TicketSupportManager] Priority update error:', err);
    } finally {
      setUpdatingTicketMeta(false);
    }
  };

  // 7. Delete Ticket (Admin Only - Erases ticket, messages, and media files)
  const handleDeleteTicket = async (ticketId: string) => {
    if (!hasAdminPower) return;
    showConfirm({
      title: 'Delete Support Ticket',
      message: 'Are you sure you want to permanently erase this ticket, its chat history, and all uploaded media? This cannot be undone.',
      confirmText: 'Delete Ticket',
      type: 'danger',
      onConfirm: async () => {
        try {
          await request(`/tickets/${ticketId}`, { method: 'DELETE' });
          setTickets((prev) => prev.filter((t) => t.id !== ticketId));
          if (selectedTicketId === ticketId) {
            stopActiveRecorderResources(true);
            clearRecordedVoiceDraft();
            setSelectedTicketId(null);
            setMessages([]);
            setPendingAttachments([]);
            setReplyText('');
            setComposerError(null);
          }
          await loadTickets();
        } catch (err: any) {
          console.error('[TicketSupportManager] Delete error:', err);
        }
      }
    });
  };

  // 8. Create New Ticket
  const handleCreateTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !newMessage.trim() || submittingTicket) return;

    setSubmittingTicket(true);
    setCreateError(null);

    try {
      const res = await request<any>('/tickets', {
        method: 'POST',
        body: JSON.stringify({
          title: newTitle.trim(),
          category: newCategory,
          priority: newPriority,
          message: newMessage.trim()
        })
      });

      if (res && res.ticket) {
        setShowCreateModal(false);
        setNewTitle('');
        setNewMessage('');
        setNewCategory('technical');
        setNewPriority('medium');
        await loadTickets();
        setSelectedTicketId(res.ticket.id);
      }
    } catch (err: any) {
      setCreateError(err.message || 'Failed to submit ticket');
    } finally {
      setSubmittingTicket(false);
    }
  };

  const copyTicketId = () => {
    if (!selectedTicket) return;
    navigator.clipboard.writeText(selectedTicket.id);
    setCopiedId(true);
    setTimeout(() => setCopiedId(false), 2000);
  };

  // Filtered Tickets
  const filteredTickets = useMemo(() => {
    return tickets.filter((t) => {
      // Admin Queue Filter
      if (hasAdminPower) {
        if (adminQueueFilter === 'mine' && t.claimedById !== user?.id) return false;
        if (adminQueueFilter === 'unclaimed' && (t.claimedById || t.status !== 'open')) return false;
      }

      // Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesTitle = t.title.toLowerCase().includes(q);
        const matchesId = t.id.toLowerCase().includes(q);
        const matchesUser =
          (t.streamerDisplayName || '').toLowerCase().includes(q) ||
          (t.streamerUsername || '').toLowerCase().includes(q);
        const matchesLastMsg = (t.lastMessage || '').toLowerCase().includes(q);
        if (!matchesTitle && !matchesId && !matchesUser && !matchesLastMsg) return false;
      }

      return true;
    });
  }, [tickets, hasAdminPower, adminQueueFilter, searchQuery, user?.id]);

  const renderActiveAgents = () => (
    <div className="flex items-center gap-1.5 shrink-0" title={activeSupports.length > 0 ? 'Active Support Agents' : 'No Support Agents Online'}>
      {activeSupports.length > 0 ? (
        <div className="flex items-center -space-x-1.5 hover:space-x-1.5 transition-all">
          {activeSupports.map((adminProfile) => (
            <div
              key={adminProfile.id || adminProfile.email}
              className="relative shrink-0 transition-transform hover:scale-105 hover:z-10"
              title={`${adminProfile.displayName} (@${adminProfile.username}) • Online`}
            >
              <div className="w-8 h-8 rounded-full bg-slate-800 border-2 border-emerald-400/80 overflow-hidden flex items-center justify-center text-[10px] font-bold text-white shadow-sm">
                {adminProfile.avatarUrl ? (
                  <img
                    src={adminProfile.avatarUrl}
                    alt={adminProfile.displayName}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span>{(adminProfile.displayName || 'AD').slice(0, 2).toUpperCase()}</span>
                )}
              </div>
              <span
                className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-400 border-2 border-[#090D16] shadow-sm"
                aria-label="Online"
              />
            </div>
          ))}
        </div>
      ) : (
        <span
          className="inline-flex items-center gap-1.5 px-2 py-1 rounded-full bg-slate-900 border border-slate-800 text-slate-400 text-[10px] font-mono"
          title="No support agents online"
        >
          <span className="w-2 h-2 rounded-full bg-slate-500" />
          <span className="hidden sm:inline">Offline</span>
        </span>
      )}
    </div>
  );

  return (
    <div className="w-full h-full flex-1 flex flex-col min-h-0 overflow-hidden">
      {/* Main Full-Height Split Desk (Left: Ticket Sidebar, Right: Full-Height Chatbox) */}
      <div className="flex-1 min-h-0 h-full grid grid-cols-1 lg:grid-cols-12 gap-2.5 sm:gap-3 overflow-hidden">
        
        {/* ============================================================== */}
        {/* LEFT SIDEBAR: TICKET LIST & QUEUE BROWSER                      */}
        {/* ============================================================== */}
        <div
          className={`lg:col-span-4 xl:col-span-4 flex flex-col min-h-0 h-full rounded-2xl border border-slate-800 bg-[#0B0F19] overflow-hidden ${
            selectedTicket ? 'hidden lg:flex' : 'flex'
          }`}
        >
          {/* Sidebar Search & Filter Controls */}
          <div className="p-3 sm:p-3.5 border-b border-slate-800/80 space-y-2.5 bg-[#090D16] shrink-0">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-xs font-bold text-white uppercase tracking-wider font-mono truncate">
                  {hasAdminPower ? 'Ticket Queue' : 'My Tickets'}
                </span>
                <span className="px-2 py-0.5 rounded-md bg-slate-900 border border-slate-800 text-slate-300 text-[10px] font-mono font-bold shrink-0">
                  {filteredTickets.length}
                </span>
              </div>

              <button
                type="button"
                onClick={() => setShowCreateModal(true)}
                className="px-2.5 py-1.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-bold text-[11px] shadow-md shadow-cyan-500/20 transition-all flex items-center gap-1 shrink-0 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>New Ticket</span>
              </button>
            </div>

            {/* Search Input */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search ticket #, title, user..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-7 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 transition-colors"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Admin Specific Sub-filter (All / Mine / Unclaimed) */}
            {hasAdminPower && (
              <div className="grid grid-cols-3 gap-1 p-1 rounded-xl bg-slate-950 border border-slate-800 text-[10px] font-mono">
                <button
                  onClick={() => setAdminQueueFilter('all')}
                  className={`py-1.5 rounded-lg transition-all cursor-pointer ${
                    adminQueueFilter === 'all'
                      ? 'bg-slate-800 text-cyan-400 font-bold'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  All ({tickets.length})
                </button>
                <button
                  onClick={() => setAdminQueueFilter('unclaimed')}
                  className={`py-1.5 rounded-lg transition-all cursor-pointer ${
                    adminQueueFilter === 'unclaimed'
                      ? 'bg-amber-500/20 text-amber-400 font-bold border border-amber-500/30'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Unclaimed
                </button>
                <button
                  onClick={() => setAdminQueueFilter('mine')}
                  className={`py-1.5 rounded-lg transition-all cursor-pointer ${
                    adminQueueFilter === 'mine'
                      ? 'bg-indigo-500/20 text-indigo-400 font-bold border border-indigo-500/30'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  My Claims
                </button>
              </div>
            )}

            {/* Status Pills */}
            <div className="flex items-center gap-1 overflow-x-auto pb-0.5 no-scrollbar text-xs">
              {['ALL', 'open', 'claimed', 'resolved', 'closed'].map((s) => (
                <button
                  key={s}
                  onClick={() => setStatusFilter(s)}
                  className={`px-2.5 py-1 rounded-lg whitespace-nowrap text-[10px] font-mono transition-all cursor-pointer ${
                    statusFilter === s
                      ? 'bg-cyan-500/15 text-cyan-400 font-bold border border-cyan-500/30'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800'
                  }`}
                >
                  {s.toUpperCase()}
                </button>
              ))}
            </div>
          </div>

          {/* Ticket Cards Stream */}
          <div className="flex-1 min-h-0 overflow-y-auto divide-y divide-slate-800/70">
            {loading ? (
              <div className="p-8 text-center text-xs text-slate-500 flex flex-col items-center gap-2">
                <RefreshCw className="w-5 h-5 animate-spin text-cyan-400" />
                <span>Loading support tickets...</span>
              </div>
            ) : filteredTickets.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-500 space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-center mx-auto text-slate-500">
                  <Inbox className="w-6 h-6" />
                </div>
                <p>No support tickets found.</p>
                <button
                  onClick={() => setShowCreateModal(true)}
                  className="px-3.5 py-1.5 rounded-xl bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 border border-cyan-500/25 text-xs font-semibold cursor-pointer"
                >
                  Open First Ticket
                </button>
              </div>
            ) : (
              filteredTickets.map((ticket) => {
                const isSelected = ticket.id === selectedTicketId;
                const statusInfo = STATUS_CONFIG[ticket.status] || STATUS_CONFIG.open;
                const priorityInfo = PRIORITY_CONFIG[ticket.priority] || PRIORITY_CONFIG.medium;
                const categoryInfo = CATEGORY_CONFIG[ticket.category] || CATEGORY_CONFIG.general;

                return (
                  <div
                    key={ticket.id}
                    onClick={() => setSelectedTicketId(ticket.id)}
                    className={`p-3.5 cursor-pointer transition-all border-l-4 ${
                      isSelected
                        ? 'bg-cyan-500/10 border-l-cyan-400'
                        : 'hover:bg-slate-900/50 border-l-transparent'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2 mb-1.5">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span className="text-[11px] font-mono font-bold text-slate-400 truncate">
                          {ticket.id}
                        </span>
                        <span className={`px-1.5 py-0.5 rounded text-[9px] font-mono border shrink-0 ${categoryInfo.color}`}>
                          {categoryInfo.label}
                        </span>
                      </div>
                      <span className={`px-1.5 py-0.5 rounded text-[9px] font-mono border shrink-0 ${priorityInfo.color}`}>
                        {priorityInfo.label}
                      </span>
                    </div>

                    <h4 className="text-sm font-bold text-white line-clamp-1 mb-1">
                      {ticket.title}
                    </h4>

                    {ticket.lastMessage && (
                      <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed mb-2">
                        {ticket.lastMessage}
                      </p>
                    )}

                    <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1">
                      <div className="flex items-center gap-1.5">
                        <span className={`w-2 h-2 rounded-full ${statusInfo.dot}`} />
                        <span className="font-mono text-slate-400">{statusInfo.label}</span>
                      </div>

                      <div className="text-[10px] font-mono text-slate-500">
                        {ticket.lastMessageAt ? new Date(ticket.lastMessageAt).toLocaleDateString() : ''}
                      </div>
                    </div>

                    {/* Claimed Agent Footer Tag */}
                    {ticket.claimedByName && (
                      <div className="mt-2 pt-2 border-t border-slate-800/70 flex items-center gap-2 text-[11px] text-indigo-400">
                        {ticket.claimedByAvatar ? (
                          <img
                            src={ticket.claimedByAvatar}
                            alt={ticket.claimedByName}
                            className="w-4 h-4 rounded-full object-cover border border-indigo-400/40"
                          />
                        ) : (
                          <UserCheck className="w-3.5 h-3.5 text-indigo-400" />
                        )}
                        <span className="truncate font-medium">Agent: {ticket.claimedByName}</span>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* ============================================================== */}
        {/* RIGHT DYNAMIC CONTENT: FULL-HEIGHT LIVE CONVERSATION CHATBOX   */}
        {/* ============================================================== */}
        <div
          className={`lg:col-span-8 xl:col-span-8 flex flex-col flex-1 min-h-0 h-full rounded-2xl border border-slate-800 bg-[#0B0F19] overflow-hidden ${
            selectedTicket ? 'flex' : 'hidden lg:flex'
          }`}
        >
          {!selectedTicket ? (
            <>
              <div className="p-3 sm:px-4 sm:py-3 border-b border-slate-800 bg-[#090D16] flex items-center justify-between gap-3 shrink-0">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-300 font-mono">
                  Support Chat
                </span>
                {renderActiveAgents()}
              </div>
              <div className="flex-1 min-h-0 flex flex-col items-center justify-center p-8 sm:p-12 text-center text-slate-500 space-y-3">
                <div className="w-16 h-16 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-center text-cyan-400">
                  <LifeBuoy className="w-8 h-8" />
                </div>
                <h3 className="text-base font-bold text-white">No Support Ticket Selected</h3>
                <p className="text-xs text-slate-400 max-w-sm leading-relaxed">
                  Select a support ticket from the queue on the left to inspect or reply in real time, or open a new ticket.
                </p>
                <button
                  onClick={() => setShowCreateModal(true)}
                  className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-bold text-xs shadow-md shadow-cyan-500/20 cursor-pointer flex items-center gap-1.5"
                >
                  <Plus className="w-4 h-4" />
                  <span>Create Support Ticket</span>
                </button>
              </div>
            </>
          ) : (
            <>
              {/* Chatbox Top Navbar */}
              <div className="p-3 sm:px-4 sm:py-3 border-b border-slate-800 bg-[#090D16] flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 sm:gap-3 shrink-0 min-w-0">
                <div className="space-y-1.5 min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setSelectedTicketId(null)}
                      className="lg:hidden px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 text-[11px] font-mono font-bold flex items-center gap-1 transition-colors cursor-pointer"
                    >
                      <span>← Queue</span>
                    </button>
                    <button
                      onClick={copyTicketId}
                      className="px-2 py-0.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-cyan-400 text-[11px] font-mono font-bold flex items-center gap-1 transition-colors cursor-pointer"
                      title="Click to copy ticket ID"
                    >
                      <span>{selectedTicket.id}</span>
                      {copiedId ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3 text-slate-400" />}
                    </button>

                    <span className={`px-2 py-0.5 rounded-md text-[10px] font-mono border ${CATEGORY_CONFIG[selectedTicket.category]?.color || CATEGORY_CONFIG.general.color}`}>
                      {CATEGORY_CONFIG[selectedTicket.category]?.label || 'General'}
                    </span>

                    <span className={`px-2 py-0.5 rounded-md text-[10px] font-mono border ${PRIORITY_CONFIG[selectedTicket.priority]?.color || PRIORITY_CONFIG.medium.color}`}>
                      {PRIORITY_CONFIG[selectedTicket.priority]?.label || 'Medium'}
                    </span>
                  </div>

                  <h3 className="text-sm sm:text-base font-bold text-white truncate">
                    {selectedTicket.title}
                  </h3>

                  <div className="text-[11px] text-slate-400 flex flex-wrap items-center gap-2">
                    <span className="inline-flex items-center gap-1.5">
                      {selectedTicket.streamerAvatar && (
                        <img
                          src={selectedTicket.streamerAvatar}
                          alt={selectedTicket.streamerDisplayName}
                          className="w-4 h-4 rounded-full object-cover border border-slate-700"
                        />
                      )}
                      <span>
                        Creator: <strong className="text-slate-200">@{selectedTicket.streamerUsername || 'creator'}</strong> ({selectedTicket.streamerDisplayName})
                      </span>
                    </span>
                    <span>•</span>
                    <span className="inline-flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      <span>Opened {new Date(selectedTicket.createdAt).toLocaleDateString()}</span>
                    </span>
                  </div>
                </div>

                {/* Chatbox Navbar Right: Active Agents (Green Dot Avatars) + Controls */}
                <div className="flex flex-wrap items-center gap-2 sm:gap-2.5 self-start sm:self-auto shrink-0 max-w-full">
                  {renderActiveAgents()}
                  <span className="hidden sm:inline-block h-5 w-px bg-slate-800" />
                  {hasAdminPower ? (
                    <>
                      <select
                        value={selectedTicket.priority}
                        disabled={updatingTicketMeta}
                        onChange={(e) => handleUpdatePriority(e.target.value as any)}
                        title="Admin: Change ticket priority"
                        className="px-2.5 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-xs font-mono text-slate-200 focus:outline-none focus:border-cyan-500 cursor-pointer max-w-full"
                      >
                        <option value="low">Priority: Low</option>
                        <option value="medium">Priority: Medium</option>
                        <option value="high">Priority: High</option>
                        <option value="urgent">Priority: Urgent</option>
                      </select>

                      <select
                        value={selectedTicket.status}
                        disabled={updatingTicketMeta}
                        onChange={(e) => handleUpdateStatus(e.target.value as any)}
                        title="Admin: Change ticket status"
                        className="px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-xs font-mono text-slate-200 focus:outline-none focus:border-cyan-500 cursor-pointer max-w-full"
                      >
                        <option value="open">Waiting for Agent</option>
                        <option value="claimed">In Live Chat</option>
                        <option value="resolved">Mark Resolved</option>
                        <option value="closed">Closed</option>
                      </select>

                      <button
                        type="button"
                        onClick={() => handleDeleteTicket(selectedTicket.id)}
                        className="p-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/25 transition-colors cursor-pointer"
                        title="Delete ticket"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </>
                  ) : (
                    <span
                      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-mono font-semibold ${
                        STATUS_CONFIG[selectedTicket.status]?.color || STATUS_CONFIG.open.color
                      }`}
                    >
                      <span
                        className={`w-2 h-2 rounded-full ${
                          STATUS_CONFIG[selectedTicket.status]?.dot || STATUS_CONFIG.open.dot
                        }`}
                      />
                      <span>{STATUS_CONFIG[selectedTicket.status]?.label || 'Waiting for Agent'}</span>
                    </span>
                  )}
                </div>
              </div>

              {/* Admin Claim & Transfer Banner */}
              {hasAdminPower && (
                <div className="px-4 py-2.5 bg-indigo-500/10 border-b border-indigo-500/20 flex flex-wrap items-center justify-between gap-3 text-xs shrink-0">
                  {selectedTicket.claimedById ? (
                    <div className="flex items-center gap-2 text-indigo-300">
                      {selectedTicket.claimedByAvatar ? (
                        <img
                          src={selectedTicket.claimedByAvatar}
                          alt={selectedTicket.claimedByName || 'Admin'}
                          className="w-5 h-5 rounded-full object-cover border border-indigo-400/50"
                        />
                      ) : (
                        <UserCheck className="w-4 h-4 text-indigo-400" />
                      )}
                      <span>
                        Ticket claimed by <strong>{selectedTicket.claimedByName || 'Admin'}</strong>
                      </span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 text-amber-400">
                      <Flame className="w-4 h-4 text-amber-400" />
                      <span>Unclaimed ticket in queue. Claim ownership or transfer to another support admin.</span>
                    </div>
                  )}

                  <div className="flex flex-wrap items-center gap-2">
                    {selectedTicket.claimedById ? (
                      <button
                        type="button"
                        onClick={() => handleToggleClaim('unclaim')}
                        disabled={claimingTicket}
                        className="px-3 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white text-[11px] font-mono border border-slate-700 transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                      >
                        <UserX className="w-3.5 h-3.5" />
                        <span>Release Ticket</span>
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleToggleClaim('claim')}
                        disabled={claimingTicket}
                        className="px-3 py-1.5 rounded-lg bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold text-[11px] font-mono shadow-md shadow-indigo-500/20 transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                      >
                        <UserCheck className="w-3.5 h-3.5" />
                        <span>Claim Ticket &amp; Chat</span>
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={handleOpenTransferModal}
                      disabled={claimingTicket || transferringTicket}
                      className="px-3 py-1 rounded-lg bg-cyan-500/15 hover:bg-cyan-500/25 text-cyan-400 border border-cyan-500/35 text-[11px] font-mono font-bold transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                      title="Transfer this ticket to another administrator"
                    >
                      <ArrowRightLeft className="w-3.5 h-3.5" />
                      <span>Transfer Ticket</span>
                    </button>
                  </div>
                </div>
              )}

              {/* Assigned Support Agent Strip for Clients */}
              {!hasAdminPower && selectedTicket.claimedByName && (
                <div className="px-4 py-2 bg-indigo-500/5 border-b border-indigo-500/20 flex items-center justify-between gap-2 text-xs shrink-0">
                  <div className="flex items-center gap-2 text-indigo-400">
                    {selectedTicket.claimedByAvatar ? (
                      <img
                        src={selectedTicket.claimedByAvatar}
                        alt={selectedTicket.claimedByName}
                        className="w-5 h-5 rounded-full object-cover border border-indigo-400/50"
                      />
                    ) : (
                      <ShieldCheck className="w-4 h-4 text-indigo-400" />
                    )}
                    <span>
                      Assigned Support Engineer: <strong className="text-white">{selectedTicket.claimedByName}</strong>
                    </span>
                  </div>
                  <span className="px-2 py-0.5 rounded bg-indigo-500/15 border border-indigo-500/30 text-indigo-400 text-[10px] font-mono font-bold">
                    IN PROGRESS
                  </span>
                </div>
              )}

              {/* Resolved / Closed Banner */}
              {(selectedTicket.status === 'resolved' || selectedTicket.status === 'closed') && (
                <div className="px-3 sm:px-4 py-2 bg-emerald-500/10 border-b border-emerald-500/20 text-emerald-400 text-xs flex flex-wrap items-center justify-between gap-2 shrink-0">
                  <div className="flex items-center gap-2 min-w-0">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span className="leading-snug">
                      This ticket is marked as <strong>{selectedTicket.status.toUpperCase()}</strong>. Sending a new message will automatically reopen it.
                    </span>
                  </div>
                  {hasAdminPower && (
                    <button
                      type="button"
                      onClick={() => handleUpdateStatus('open')}
                      className="text-[11px] font-mono font-bold text-emerald-400 hover:underline shrink-0 cursor-pointer"
                    >
                      Reopen Ticket
                    </button>
                  )}
                </div>
              )}

              {/* Messages Chat Stream */}
              <div className="ticket-chat-canvas flex-1 min-h-0 p-3 sm:p-4 overflow-y-auto space-y-3 sm:space-y-4 bg-[#090D16]">
                {loadingMessages ? (
                  <div className="p-12 text-center text-xs text-slate-500 flex flex-col items-center gap-2">
                    <RefreshCw className="w-5 h-5 animate-spin text-cyan-400" />
                    <span>Loading conversation history...</span>
                  </div>
                ) : messages.length === 0 ? (
                  <div className="p-8 text-center text-xs text-slate-500 space-y-2">
                    <MessageSquare className="w-8 h-8 text-slate-600 mx-auto" />
                    <p>No messages yet in this ticket thread.</p>
                  </div>
                ) : (
                  messages.map((msg) => {
                    if (msg.senderRole === 'system') {
                      return (
                        <div key={msg.id} className="flex justify-center my-2 px-2">
                          <span className="px-3 py-1 rounded-full bg-slate-900 border border-slate-800 text-[11px] text-slate-400 font-mono flex items-center gap-1.5 text-center break-words max-w-full">
                            <Sparkles className="w-3 h-3 text-cyan-400 shrink-0" />
                            <span>{msg.message}</span>
                          </span>
                        </div>
                      );
                    }

                    const isAdminMsg = msg.senderRole === 'admin';
                    return (
                      <div
                        key={msg.id}
                        className={`flex gap-2 sm:gap-3 max-w-[92%] sm:max-w-[82%] md:max-w-[78%] ${
                          isAdminMsg ? 'ml-auto flex-row-reverse' : 'mr-auto flex-row'
                        }`}
                      >
                        {/* Avatar */}
                        <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-slate-800 border border-slate-700 flex-shrink-0 overflow-hidden flex items-center justify-center text-[11px] sm:text-xs font-bold text-white">
                          {msg.senderAvatar ? (
                            <img src={msg.senderAvatar} alt={msg.senderName} className="w-full h-full object-cover" />
                          ) : (
                            <span>{msg.senderName.slice(0, 2).toUpperCase()}</span>
                          )}
                        </div>

                        {/* Bubble */}
                        <div className="space-y-1 min-w-0">
                          <div
                            className={`flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] ${
                              isAdminMsg ? 'justify-end' : 'justify-start'
                            }`}
                          >
                            <span className="font-bold text-slate-300 truncate max-w-[140px] sm:max-w-none">{msg.senderName}</span>
                            {isAdminMsg ? (
                              <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 font-mono shrink-0">
                                SUPPORT ADMIN
                              </span>
                            ) : (
                              <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 font-mono shrink-0">
                                CREATOR
                              </span>
                            )}
                            <span className="text-slate-500 text-[10px] font-mono shrink-0">
                              {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>

                          <div
                            className={`p-2.5 sm:p-3.5 rounded-2xl text-xs sm:text-sm leading-relaxed space-y-2.5 ${
                              isAdminMsg
                                ? 'ticket-bubble-admin bg-gradient-to-br from-indigo-900/60 to-purple-950/70 border border-indigo-500/30 text-indigo-50 rounded-tr-none shadow-md'
                                : 'ticket-bubble-user bg-slate-900 border border-slate-800 text-slate-200 rounded-tl-none shadow-sm'
                            }`}
                          >
                            {msg.message && (
                              <div className="whitespace-pre-wrap break-words">
                                {renderMessageTextWithLinks(msg.message)}
                              </div>
                            )}

                            {Array.isArray(msg.attachments) && msg.attachments.length > 0 && (
                              <div className="space-y-2">
                                {msg.attachments.map((att) => {
                                  if (att.kind === 'voice') {
                                    return (
                                      <SentVoiceCard
                                        key={att.id}
                                        attachment={att}
                                        isAdminBubble={isAdminMsg}
                                      />
                                    );
                                  }

                                  if (att.kind === 'image') {
                                    return (
                                      <a
                                        key={att.id}
                                        href={att.url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="block rounded-xl overflow-hidden border border-white/10 bg-black/20 hover:opacity-95 transition-opacity max-w-[240px]"
                                        title={att.name}
                                      >
                                        <img
                                          src={att.url}
                                          alt={att.name}
                                          className="w-full max-h-[190px] object-cover"
                                        />
                                      </a>
                                    );
                                  }

                                  if (
                                    att.kind === 'video' ||
                                    (att.kind === 'file' &&
                                      (att.mimeType?.startsWith('video/') || /\.(mp4|mov|webm|m4v|ogv|3gp|avi|mkv)$/i.test(att.url || att.name)))
                                  ) {
                                    return (
                                      <div
                                        key={att.id}
                                        className="rounded-xl overflow-hidden border border-white/10 bg-black/40 max-w-[280px]"
                                      >
                                        <video
                                          src={att.url}
                                          controls
                                          playsInline
                                          preload="metadata"
                                          className="w-full max-h-[220px] bg-black"
                                        />
                                        <div className="px-2.5 py-1.5 flex items-center justify-between gap-2 text-[10px] text-slate-300 bg-black/30">
                                          <span className="truncate font-medium">{att.name}</span>
                                          {(att.durationSec || att.size) ? (
                                            <span className="font-mono text-slate-400 shrink-0">
                                              {[
                                                att.durationSec ? formatDurationSec(att.durationSec) : null,
                                                att.size ? formatAttachmentSize(att.size) : null
                                              ]
                                                .filter(Boolean)
                                                .join(' • ')}
                                            </span>
                                          ) : null}
                                        </div>
                                      </div>
                                    );
                                  }

                                  if (att.kind === 'link') {
                                    return (
                                      <a
                                        key={att.id}
                                        href={att.url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="flex items-center justify-between gap-2.5 p-2.5 rounded-xl bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/30 transition-colors min-w-0"
                                      >
                                        <div className="flex items-center gap-2 min-w-0">
                                          <div className="p-1.5 rounded-lg bg-cyan-500/20 text-cyan-300 shrink-0">
                                            <Link2 className="w-3.5 h-3.5" />
                                          </div>
                                          <div className="min-w-0">
                                            <div className="text-xs font-semibold text-white truncate">{att.name}</div>
                                            <div className="text-[10px] font-mono text-cyan-300/80 truncate">{att.url}</div>
                                          </div>
                                        </div>
                                        <ExternalLink className="w-3.5 h-3.5 text-cyan-300 shrink-0" />
                                      </a>
                                    );
                                  }

                                  return (
                                    <a
                                      key={att.id}
                                      href={att.url}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      download={att.name}
                                      className="flex items-center justify-between gap-2.5 p-2.5 rounded-xl bg-black/25 hover:bg-black/35 border border-white/10 transition-colors min-w-0"
                                    >
                                      <div className="flex items-center gap-2 min-w-0">
                                        <div className="p-1.5 rounded-lg bg-slate-800 text-slate-200 shrink-0">
                                          <FileText className="w-3.5 h-3.5" />
                                        </div>
                                        <div className="min-w-0">
                                          <div className="text-xs font-semibold text-white truncate">{att.name}</div>
                                          {att.size ? (
                                            <div className="text-[10px] font-mono text-slate-400">
                                              {formatAttachmentSize(att.size)}
                                            </div>
                                          ) : null}
                                        </div>
                                      </div>
                                      <Download className="w-3.5 h-3.5 text-slate-300 shrink-0" />
                                    </a>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Chat Input Bar */}
              <div className="px-2.5 pt-2 pb-2.5 sm:px-3.5 sm:pt-2 sm:pb-3.5 border-t border-slate-800 bg-[#0B0F19] shrink-0 space-y-1.5">
                {/* Center-Top Encrypted Chat Label */}
                <p className="text-center text-[10px] sm:text-[11px] font-medium text-slate-500">
                  Encrypted Chat
                </p>

                {composerError && (
                  <div className="px-3 py-1.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-[11px] flex items-center justify-between gap-2">
                    <span className="truncate">{composerError}</span>
                    <button
                      type="button"
                      onClick={() => setComposerError(null)}
                      className="text-rose-300 hover:text-white shrink-0 cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}

                {/* Pending Image / Video Attachments Preview Strip */}
                {pendingAttachments.length > 0 && (
                  <div className="flex flex-wrap items-center gap-2">
                    {pendingAttachments.map((att) => (
                      <div
                        key={att.id}
                        className="flex items-center gap-2 px-2.5 py-1.5 rounded-xl bg-slate-900 border border-slate-700/80 text-[11px] text-slate-200 max-w-full"
                      >
                        {att.kind === 'image' ? (
                          <div className="flex items-center gap-1.5 min-w-0">
                            <ImageIcon className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                            <span className="truncate max-w-[150px]">{att.name}</span>
                          </div>
                        ) : att.kind === 'video' ? (
                          <div className="flex items-center gap-1.5 min-w-0">
                            <Film className="w-3.5 h-3.5 text-purple-400 shrink-0" />
                            <span className="truncate max-w-[150px]">{att.name}</span>
                          </div>
                        ) : att.kind === 'link' ? (
                          <div className="flex items-center gap-1.5 min-w-0">
                            <Link2 className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                            <span className="truncate max-w-[180px] text-cyan-300">{att.name}</span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1.5 min-w-0">
                            <FileText className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                            <span className="truncate max-w-[150px]">{att.name}</span>
                          </div>
                        )}

                        <button
                          type="button"
                          onClick={() => setPendingAttachments((prev) => prev.filter((p) => p.id !== att.id))}
                          className="p-0.5 rounded text-slate-400 hover:text-rose-400 cursor-pointer shrink-0"
                          title="Remove attachment"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  accept="image/*,video/*"
                  onChange={handleFileInputChange}
                  className="hidden"
                />

                {/* IN-PLACE MORPHED VOICE RECORDING VISUALIZER (MAX 1:00) */}
                {isRecordingVoice ? (
                  <div className="rounded-2xl bg-rose-950/35 border border-rose-500/40 p-1.5 sm:px-2.5 sm:py-2 flex items-center gap-2 sm:gap-3 animate-fade-in">
                    <button
                      type="button"
                      onClick={() => stopActiveRecorderResources(true)}
                      className="h-9 w-9 rounded-xl bg-slate-900/80 hover:bg-slate-800 text-slate-400 hover:text-rose-400 border border-slate-800 flex items-center justify-center shrink-0 transition-colors cursor-pointer"
                      title="Discard recording"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-pulse" />
                      <span className="text-[11px] sm:text-xs font-mono font-bold text-rose-300 tabular-nums">
                        {formatDurationSec(recordingSeconds)}
                        <span className="text-slate-500 font-normal"> / 1:00</span>
                      </span>
                    </div>

                    {/* Real Live Audio Frequency Visualizer */}
                    <div
                      className="flex-1 min-w-0 h-8 flex items-center justify-center gap-[2px] sm:gap-[3px] px-1 overflow-hidden"
                      aria-label="Live voice waveform visualizer"
                    >
                      {visualizerBars.map((level, idx) => (
                        <span
                          key={idx}
                          className="flex-1 max-w-[5px] min-w-[2px] rounded-full bg-gradient-to-t from-rose-500 to-cyan-400 transition-all duration-75"
                          style={{ height: `${Math.round(level * 100)}%` }}
                        />
                      ))}
                    </div>

                    <button
                      type="button"
                      onClick={() => stopActiveRecorderResources(false)}
                      className="h-9 px-3 sm:px-3.5 rounded-xl bg-rose-500 hover:bg-rose-400 text-white text-xs font-bold flex items-center gap-1.5 shrink-0 shadow-md shadow-rose-500/25 transition-colors cursor-pointer"
                      title="Stop & review recording"
                    >
                      <Square className="w-3.5 h-3.5 fill-current" />
                      <span className="hidden xs:inline">Stop</span>
                    </button>
                  </div>
                ) : recordedVoiceDraft ? (
                  /* IN-PLACE VOICE REPLAY PLAYER BEFORE SENDING */
                  <div className="rounded-2xl bg-slate-950 border border-cyan-500/40 p-1.5 sm:px-2.5 sm:py-2 flex items-center gap-2 sm:gap-2.5 animate-fade-in">
                    <audio
                      ref={voicePreviewAudioRef}
                      src={recordedVoiceDraft.previewUrl}
                      preload="metadata"
                      onTimeUpdate={(e) => setVoicePreviewTime(e.currentTarget.currentTime)}
                      onEnded={() => {
                        setIsPlayingVoicePreview(false);
                        setVoicePreviewTime(0);
                      }}
                      className="hidden"
                    />

                    <button
                      type="button"
                      disabled={sendingReply || uploadingAttachment}
                      onClick={clearRecordedVoiceDraft}
                      className="h-9 w-9 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-rose-400 border border-slate-800 flex items-center justify-center shrink-0 transition-colors disabled:opacity-40 cursor-pointer"
                      title="Discard voice message"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>

                    <button
                      type="button"
                      disabled={sendingReply || uploadingAttachment}
                      onClick={handleToggleVoicePreview}
                      className="h-9 w-9 rounded-xl bg-cyan-500/15 hover:bg-cyan-500/25 text-cyan-400 border border-cyan-500/35 flex items-center justify-center shrink-0 transition-colors cursor-pointer"
                      title={isPlayingVoicePreview ? 'Pause replay' : 'Replay voice message'}
                    >
                      {isPlayingVoicePreview ? (
                        <Pause className="w-4 h-4 fill-current" />
                      ) : (
                        <Play className="w-4 h-4 fill-current ml-0.5" />
                      )}
                    </button>

                    {/* Clickable Waveform Scrubber */}
                    <div
                      role="slider"
                      aria-label="Voice message playback position"
                      aria-valuemin={0}
                      aria-valuemax={recordedVoiceDraft.durationSec}
                      aria-valuenow={Math.round(voicePreviewTime)}
                      tabIndex={0}
                      onClick={(e) => {
                        const audio = voicePreviewAudioRef.current;
                        if (!audio) return;
                        const rect = e.currentTarget.getBoundingClientRect();
                        const ratio = Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width));
                        const targetDur = Number.isFinite(audio.duration) && audio.duration > 0
                          ? audio.duration
                          : recordedVoiceDraft.durationSec;
                        audio.currentTime = ratio * targetDur;
                        setVoicePreviewTime(audio.currentTime);
                      }}
                      className="flex-1 min-w-0 h-8 flex items-center gap-[2px] sm:gap-[3px] px-1 cursor-pointer select-none overflow-hidden"
                    >
                      {recordedVoiceDraft.waveform.map((level, idx) => {
                        const totalDur = Math.max(1, recordedVoiceDraft.durationSec);
                        const progress = Math.min(1, voicePreviewTime / totalDur);
                        const barPos = (idx + 0.5) / recordedVoiceDraft.waveform.length;
                        const isPlayed = barPos <= progress;
                        return (
                          <span
                            key={idx}
                            className={`flex-1 max-w-[5px] min-w-[2px] rounded-full transition-colors ${
                              isPlayed ? 'bg-cyan-400' : 'bg-slate-700'
                            }`}
                            style={{ height: `${Math.round(level * 100)}%` }}
                          />
                        );
                      })}
                    </div>

                    <span className="text-[11px] font-mono text-slate-300 tabular-nums shrink-0 px-1">
                      {formatDurationSec(isPlayingVoicePreview || voicePreviewTime > 0 ? voicePreviewTime : recordedVoiceDraft.durationSec)}
                    </span>

                    <button
                      type="button"
                      disabled={sendingReply || uploadingAttachment}
                      onClick={handleSendVoiceDraft}
                      className="h-9 w-9 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white flex items-center justify-center shrink-0 shadow-md shadow-cyan-500/20 disabled:opacity-40 transition-all cursor-pointer"
                      title="Send voice message"
                      aria-label="Send voice message"
                    >
                      <Send className={`w-4 h-4 ${sendingReply || uploadingAttachment ? 'animate-pulse' : ''}`} />
                    </button>
                  </div>
                ) : (
                  /* REDESIGNED UNIFIED RESPONSIVE CHAT INPUT + INTEGRATED SEND BUTTON */
                  <form
                    onSubmit={handleSendMessage}
                    className="rounded-2xl bg-slate-950 border border-slate-800 focus-within:border-cyan-500/75 p-1.5 flex items-end gap-1 sm:gap-1.5 transition-colors"
                  >
                    {/* Left Embedded Action Icons (Gallery, Voice) */}
                    <div className="flex items-center gap-0.5 sm:gap-1 shrink-0 pb-0.5">
                      <button
                        type="button"
                        disabled={uploadingAttachment}
                        onClick={() => fileInputRef.current?.click()}
                        className="h-8 w-8 sm:h-9 sm:w-9 rounded-xl hover:bg-slate-900 text-slate-400 hover:text-cyan-400 flex items-center justify-center transition-colors disabled:opacity-40 cursor-pointer"
                        title="Attach image or video"
                        aria-label="Attach image or video"
                      >
                        <ImageIcon className={`w-4 h-4 ${uploadingAttachment ? 'animate-pulse text-cyan-400' : ''}`} />
                      </button>

                      <button
                        type="button"
                        disabled={uploadingAttachment}
                        onClick={handleStartVoiceRecording}
                        className="h-8 w-8 sm:h-9 sm:w-9 rounded-xl hover:bg-slate-900 text-slate-400 hover:text-rose-400 flex items-center justify-center transition-colors disabled:opacity-40 cursor-pointer"
                        title="Record voice message (up to 1:00)"
                        aria-label="Record voice message"
                      >
                        <Mic className="w-4 h-4" />
                      </button>
                    </div>

                    {/* Auto-Growing Center Input Field */}
                    <textarea
                      ref={textareaRef}
                      rows={1}
                      value={replyText}
                      onChange={(e) => {
                        setReplyText(e.target.value);
                        e.currentTarget.style.height = 'auto';
                        e.currentTarget.style.height = `${Math.min(e.currentTarget.scrollHeight, 128)}px`;
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          handleSendMessage();
                        }
                      }}
                      placeholder={
                        uploadingAttachment
                          ? 'Uploading attachment...'
                          : hasAdminPower
                          ? 'Write a support reply...'
                          : 'Message support...'
                      }
                      className="flex-1 min-w-0 bg-transparent border-0 text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-0 resize-none py-2 px-1.5 max-h-32 leading-snug"
                    />

                    {/* Aligned Integrated Send Button */}
                    <button
                      type="submit"
                      disabled={(!replyText.trim() && pendingAttachments.length === 0) || sendingReply || uploadingAttachment}
                      className="h-8 w-8 sm:h-9 sm:w-9 mb-0.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white disabled:opacity-35 disabled:cursor-not-allowed transition-all shadow-md shadow-cyan-500/20 flex items-center justify-center shrink-0 cursor-pointer"
                      title="Send message"
                      aria-label="Send message"
                    >
                      <Send className={`w-4 h-4 ${sendingReply ? 'animate-pulse' : ''}`} />
                    </button>
                  </form>
                )}
              </div>
            </>
          )}

        </div>
      </div>

      {/* ============================================================== */}
      {/* MODAL: CREATE NEW SUPPORT TICKET                               */}
      {/* ============================================================== */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-lg rounded-2xl border border-slate-800 bg-[#0B0F19] p-6 shadow-2xl relative">
            <button
              onClick={() => setShowCreateModal(false)}
              className="absolute top-4 right-4 p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-3 mb-5">
              <div className="p-2.5 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400">
                <Headphones className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">Create Support Ticket</h3>
                <p className="text-xs text-slate-400">Our support team will claim your ticket and chat with you live.</p>
              </div>
            </div>

            {createError && (
              <div className="mb-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/25 text-rose-400 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{createError}</span>
              </div>
            )}

            <form onSubmit={handleCreateTicket} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">Subject / Issue Summary *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. ABA PayWay webhook not triggering alert on OBS"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Category</label>
                  <select
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white focus:outline-none focus:border-cyan-500 font-mono"
                  >
                    <option value="technical">Technical Issue</option>
                    <option value="payment">Payment &amp; KHQR</option>
                    <option value="overlay">OBS &amp; Overlays</option>
                    <option value="feature">Feature Request</option>
                    <option value="general">General Support</option>
                    <option value="other">Other</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Priority</label>
                  <select
                    value={newPriority}
                    onChange={(e) => setNewPriority(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white focus:outline-none focus:border-cyan-500 font-mono"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="urgent">Urgent</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Initial Message / Description *</label>
                <textarea
                  required
                  rows={4}
                  placeholder="Explain what happened, steps to reproduce, or what you need help configuring..."
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  className="w-full p-3 rounded-xl bg-slate-950 border border-slate-800 text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 resize-none leading-relaxed"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingTicket || !newTitle.trim() || !newMessage.trim()}
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-bold text-xs disabled:opacity-40 transition-all flex items-center gap-1.5 shadow-lg shadow-cyan-500/20 cursor-pointer"
                >
                  {submittingTicket ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                  <span>Submit Ticket</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL: TRANSFER SUPPORT TICKET (ADMIN ONLY)                    */}
      {/* ============================================================== */}
      {hasAdminPower && showTransferModal && selectedTicket && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-md rounded-2xl border border-slate-800 bg-[#0B0F19] p-6 shadow-2xl relative">
            <button
              type="button"
              onClick={() => setShowTransferModal(false)}
              className="absolute top-4 right-4 p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-3 mb-5">
              <div className="p-2.5 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400">
                <ArrowRightLeft className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">Transfer Support Ticket</h3>
                <p className="text-xs text-slate-400">
                  Reassign <span className="font-mono text-cyan-400">{selectedTicket.id}</span> to another administrator.
                </p>
              </div>
            </div>

            {transferError && (
              <div className="mb-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/25 text-rose-400 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{transferError}</span>
              </div>
            )}

            <form onSubmit={handleTransferTicket} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-300 font-semibold mb-1.5">
                  Select Target Support Admin
                </label>
                {availableAdmins.length > 0 ? (
                  <select
                    value={transferTargetId}
                    onChange={(e) => {
                      setTransferTargetId(e.target.value);
                      if (e.target.value) setTransferIdentifier('');
                    }}
                    className="w-full px-3 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white focus:outline-none focus:border-cyan-500 font-mono"
                  >
                    <option value="">-- Choose an administrator --</option>
                    {availableAdmins.map((adminAcc) => (
                      <option key={adminAcc.id || adminAcc.email} value={adminAcc.id}>
                        {adminAcc.displayName} (@{adminAcc.username}) — {adminAcc.isOnline ? 'Online' : 'Offline'}
                        {selectedTicket.claimedById === adminAcc.id ? ' (Current)' : ''}
                      </option>
                    ))}
                  </select>
                ) : (
                  <p className="text-[11px] text-slate-400 italic">No directory admins listed; specify email or username below.</p>
                )}
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1.5">
                  Or Specify Admin Email / @Username
                </label>
                <input
                  type="text"
                  placeholder="e.g. admin@domain.com or @adminuser"
                  value={transferIdentifier}
                  onChange={(e) => {
                    setTransferIdentifier(e.target.value);
                    if (e.target.value.trim()) setTransferTargetId('');
                  }}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1.5">
                  Handover Note (Optional)
                </label>
                <textarea
                  rows={3}
                  placeholder="Add context for the receiving administrator..."
                  value={transferNote}
                  onChange={(e) => setTransferNote(e.target.value)}
                  className="w-full p-3 rounded-xl bg-slate-950 border border-slate-800 text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 resize-none leading-relaxed"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setShowTransferModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={transferringTicket || (!transferTargetId && !transferIdentifier.trim())}
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-bold text-xs disabled:opacity-40 transition-all flex items-center gap-1.5 shadow-lg shadow-cyan-500/20 cursor-pointer"
                >
                  {transferringTicket ? (
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <ArrowRightLeft className="w-3.5 h-3.5" />
                  )}
                  <span>Confirm Transfer</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
