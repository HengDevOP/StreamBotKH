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
  Shield,
  LifeBuoy,
  X,
  Radio,
  ExternalLink,
  ChevronRight,
  Flame,
  ArrowRight
} from 'lucide-react';
import { request } from '../../services/api';
import { SupportTicket, TicketMessage } from '../../types/streamer';
import { useModal } from '../../context/ModalContext';
import { useSocket } from '../../context/SocketContext';
import { useAuth } from '../../context/AuthContext';

interface TicketSupportManagerProps {
  isAdmin?: boolean;
}

const CATEGORY_CONFIG: Record<string, { label: string; color: string }> = {
  general: { label: 'General Support', color: 'bg-slate-800 text-slate-300 border-slate-700' },
  technical: { label: 'Technical Issue', color: 'bg-red-500/15 text-red-300 border-red-500/30' },
  payment: { label: 'Payment & KHQR', color: 'bg-amber-500/15 text-amber-300 border-amber-500/30' },
  overlay: { label: 'OBS & Overlays', color: 'bg-cyan-500/15 text-cyan-300 border-cyan-500/30' },
  feature: { label: 'Feature Request', color: 'bg-purple-500/15 text-purple-300 border-purple-500/30' },
  other: { label: 'Other Inquiries', color: 'bg-slate-800 text-slate-400 border-slate-700' }
};

const PRIORITY_CONFIG: Record<string, { label: string; color: string }> = {
  urgent: { label: 'Urgent', color: 'bg-rose-500/20 text-rose-300 border-rose-500/40' },
  high: { label: 'High', color: 'bg-orange-500/20 text-orange-300 border-orange-500/40' },
  medium: { label: 'Medium', color: 'bg-blue-500/20 text-blue-300 border-blue-500/40' },
  low: { label: 'Low', color: 'bg-slate-800 text-slate-400 border-slate-700' }
};

const STATUS_CONFIG: Record<string, { label: string; color: string; dot: string }> = {
  open: { label: 'Waiting for Agent', color: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30', dot: 'bg-emerald-400' },
  claimed: { label: 'In Live Chat', color: 'bg-purple-500/15 text-purple-300 border-purple-500/30', dot: 'bg-purple-400' },
  resolved: { label: 'Resolved', color: 'bg-teal-500/15 text-teal-300 border-teal-500/30', dot: 'bg-teal-400' },
  closed: { label: 'Closed', color: 'bg-slate-800 text-slate-400 border-slate-700', dot: 'bg-slate-500' }
};

export const TicketSupportManager: React.FC<TicketSupportManagerProps> = ({ isAdmin = false }) => {
  const { showConfirm } = useModal();
  const { socket, connected } = useSocket();
  const { user } = useAuth();

  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [summary, setSummary] = useState({
    total: 0,
    open: 0,
    claimed: 0,
    resolved: 0,
    closed: 0,
    unclaimed: 0
  });
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [adminQueueFilter, setAdminQueueFilter] = useState<'all' | 'mine' | 'unclaimed'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Selected Ticket & Live Chat State
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null);
  const [messages, setMessages] = useState<TicketMessage[]>([]);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [sendingReply, setSendingReply] = useState(false);
  const [claimingTicket, setClaimingTicket] = useState(false);
  const [copiedId, setCopiedId] = useState(false);

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
        if (res.summary) setSummary(res.summary);

        // Auto-select first ticket if none selected or current no longer exists
        if (!selectedTicketId && res.tickets.length > 0) {
          setSelectedTicketId(res.tickets[0].id);
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
                  status: 'claimed',
                  claimedById: data.claimedById,
                  claimedByName: data.claimedByName,
                  claimedByAvatar: data.claimedByAvatar,
                  claimedAt: data.claimedAt
                }
              : t
          )
        );
        if (data.systemMessage) {
          setMessages((prev) => [...prev, data.systemMessage]);
          setTimeout(() => scrollToBottom(true), 50);
        }
      }
    };

    const handleStatusChanged = (data: any) => {
      if (selectedTicketId) {
        setTickets((prev) =>
          prev.map((t) => (t.id === selectedTicketId ? { ...t, ...data } : t))
        );
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

  // 4. Send Message Handler
  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!selectedTicketId || !replyText.trim() || sendingReply) return;

    const textToSend = replyText.trim();
    setReplyText('');
    setSendingReply(true);

    try {
      const res = await request<any>(`/tickets/${selectedTicketId}/messages`, {
        method: 'POST',
        body: JSON.stringify({ message: textToSend })
      });

      if (res && res.message) {
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
                  lastMessage: textToSend,
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
    } finally {
      setSendingReply(false);
    }
  };

  // 5. Admin Claim / Unclaim Ticket
  const handleToggleClaim = async (action: 'claim' | 'unclaim') => {
    if (!selectedTicketId || claimingTicket) return;
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

  // 6. Update Status (Resolved / Open / Closed)
  const handleUpdateStatus = async (newStatus: 'open' | 'claimed' | 'resolved' | 'closed') => {
    if (!selectedTicketId) return;
    try {
      await request<any>(`/tickets/${selectedTicketId}`, {
        method: 'PUT',
        body: JSON.stringify({ status: newStatus })
      });
      await loadTicketMessages(selectedTicketId);
      await loadTickets(true);
    } catch (err: any) {
      console.error('[TicketSupportManager] Status update error:', err);
    }
  };

  // 7. Delete Ticket
  const handleDeleteTicket = async (ticketId: string) => {
    showConfirm({
      title: 'Delete Support Ticket',
      message: 'Are you sure you want to delete this ticket and its entire chat history? This cannot be undone.',
      confirmLabel: 'Delete Ticket',
      confirmVariant: 'danger',
      onConfirm: async () => {
        try {
          await request(`/tickets/${ticketId}`, { method: 'DELETE' });
          if (selectedTicketId === ticketId) {
            setSelectedTicketId(null);
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
      if (isAdmin) {
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
  }, [tickets, isAdmin, adminQueueFilter, searchQuery]);

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="relative overflow-hidden rounded-2xl border border-slate-800 bg-gradient-to-r from-slate-900/90 via-slate-900/60 to-[#0A0E1A] p-5 sm:p-6 shadow-2xl">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="p-3 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400">
              <Headphones className="w-6 h-6 sm:w-7 sm:h-7" />
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                  {isAdmin ? 'Admin Support Desk • Live Chat' : 'Ticket Support & Live Help'}
                </h2>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 font-mono">
                  LIVE DESK
                </span>
                {connected && (
                  <span className="hidden sm:inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] font-mono">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    <span>WebSocket Synced</span>
                  </span>
                )}
              </div>
              <p className="text-xs sm:text-sm text-slate-400 mt-1">
                {isAdmin
                  ? 'Claim tickets submitted by Cambodian live streamers and communicate via real-time live chat.'
                  : 'Submit a ticket for technical issues, KHQR tip questions, or overlay setup. Admin will claim and chat with you live.'}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              onClick={() => loadTickets()}
              disabled={loading}
              className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition-all text-xs flex items-center gap-1.5"
              title="Refresh tickets"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">Refresh</span>
            </button>

            <button
              onClick={() => setShowCreateModal(true)}
              className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-bold text-xs sm:text-sm shadow-lg shadow-cyan-500/20 transition-all flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              <span>Create Ticket</span>
            </button>
          </div>
        </div>

        {/* Metric Pills */}
        <div className="mt-5 pt-4 border-t border-slate-800/80 grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-3">
          <div className="px-3 py-2 rounded-xl bg-slate-900/60 border border-slate-800">
            <div className="text-[11px] text-slate-400 uppercase font-mono">Total Tickets</div>
            <div className="text-lg font-black text-white">{summary.total}</div>
          </div>
          <div className="px-3 py-2 rounded-xl bg-emerald-500/5 border border-emerald-500/20">
            <div className="text-[11px] text-emerald-400 uppercase font-mono flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span>Open Queue</span>
            </div>
            <div className="text-lg font-black text-emerald-300">{summary.open}</div>
          </div>
          <div className="px-3 py-2 rounded-xl bg-purple-500/5 border border-purple-500/20">
            <div className="text-[11px] text-purple-400 uppercase font-mono">Live in Chat</div>
            <div className="text-lg font-black text-purple-300">{summary.claimed}</div>
          </div>
          <div className="px-3 py-2 rounded-xl bg-teal-500/5 border border-teal-500/20">
            <div className="text-[11px] text-teal-400 uppercase font-mono">Resolved</div>
            <div className="text-lg font-black text-teal-300">{summary.resolved}</div>
          </div>
          {isAdmin && (
            <div className="px-3 py-2 rounded-xl bg-amber-500/5 border border-amber-500/20 col-span-2 sm:col-span-1">
              <div className="text-[11px] text-amber-400 uppercase font-mono">Needs Agent</div>
              <div className="text-lg font-black text-amber-300">{summary.unclaimed}</div>
            </div>
          )}
        </div>
      </div>

      {/* Main Split-View Desk (Left: Tickets Queue, Right: Live Conversation) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 min-h-[640px]">
        
        {/* ============================================================== */}
        {/* LEFT COLUMN: TICKET LIST & QUEUE BROWSER                       */}
        {/* ============================================================== */}
        <div className="lg:col-span-5 xl:col-span-4 flex flex-col rounded-2xl border border-slate-800 bg-[#070A13] overflow-hidden">
          
          {/* Search & Status Filters */}
          <div className="p-3.5 border-b border-slate-800/80 space-y-2.5 bg-slate-900/40">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search ticket #, title, user..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-950/80 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 transition-colors"
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
            {isAdmin && (
              <div className="grid grid-cols-3 gap-1 p-1 rounded-xl bg-slate-950 border border-slate-800 text-[11px] font-mono">
                <button
                  onClick={() => setAdminQueueFilter('all')}
                  className={`py-1 rounded-lg transition-all ${
                    adminQueueFilter === 'all'
                      ? 'bg-slate-800 text-cyan-400 font-bold'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  All ({tickets.length})
                </button>
                <button
                  onClick={() => setAdminQueueFilter('unclaimed')}
                  className={`py-1 rounded-lg transition-all ${
                    adminQueueFilter === 'unclaimed'
                      ? 'bg-amber-500/20 text-amber-300 font-bold border border-amber-500/30'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Unclaimed
                </button>
                <button
                  onClick={() => setAdminQueueFilter('mine')}
                  className={`py-1 rounded-lg transition-all ${
                    adminQueueFilter === 'mine'
                      ? 'bg-purple-500/20 text-purple-300 font-bold border border-purple-500/30'
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
                  className={`px-2.5 py-1 rounded-lg whitespace-nowrap text-[11px] font-mono transition-all ${
                    statusFilter === s
                      ? 'bg-cyan-500/20 text-cyan-300 font-bold border border-cyan-500/30'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800'
                  }`}
                >
                  {s.toUpperCase()}
                </button>
              ))}
            </div>
          </div>

          {/* Ticket Cards Stream */}
          <div className="flex-1 overflow-y-auto divide-y divide-slate-800/60 max-h-[560px]">
            {loading ? (
              <div className="p-8 text-center text-xs text-slate-500 flex flex-col items-center gap-2">
                <RefreshCw className="w-5 h-5 animate-spin text-cyan-400" />
                <span>Loading tickets...</span>
              </div>
            ) : filteredTickets.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-500 space-y-2">
                <MessageSquare className="w-8 h-8 text-slate-600 mx-auto" />
                <p>No support tickets found.</p>
                <button
                  onClick={() => setShowCreateModal(true)}
                  className="px-3 py-1.5 rounded-lg bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 border border-cyan-500/20 text-xs font-semibold"
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
                    className={`p-3.5 cursor-pointer transition-all ${
                      isSelected
                        ? 'bg-cyan-500/10 border-l-4 border-l-cyan-400'
                        : 'hover:bg-slate-900/50 border-l-4 border-l-transparent'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2 mb-1.5">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[11px] font-mono font-bold text-slate-400">
                          {ticket.id}
                        </span>
                        <span className={`px-1.5 py-0.5 rounded text-[9px] font-mono border ${categoryInfo.color}`}>
                          {categoryInfo.label}
                        </span>
                      </div>
                      <span className={`px-1.5 py-0.2 rounded text-[9px] font-mono border ${priorityInfo.color}`}>
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
                      <div className="mt-2 pt-1.5 border-t border-slate-800/60 flex items-center gap-1.5 text-[11px] text-purple-300">
                        <UserCheck className="w-3.5 h-3.5 text-purple-400" />
                        <span>Claimed by {ticket.claimedByName}</span>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* ============================================================== */}
        {/* RIGHT COLUMN: LIVE CONVERSATION & TICKET DETAIL                */}
        {/* ============================================================== */}
        <div className="lg:col-span-7 xl:col-span-8 flex flex-col rounded-2xl border border-slate-800 bg-[#070A13] overflow-hidden">
          
          {!selectedTicket ? (
            <div className="flex-1 flex flex-col items-center justify-center p-12 text-center text-slate-500 space-y-3">
              <div className="w-16 h-16 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-600">
                <LifeBuoy className="w-8 h-8" />
              </div>
              <h3 className="text-base font-bold text-slate-300">No Ticket Selected</h3>
              <p className="text-xs text-slate-500 max-w-sm">
                Select a support ticket from the queue on the left to start live chatting, or create a new ticket.
              </p>
              <button
                onClick={() => setShowCreateModal(true)}
                className="px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs"
              >
                Create Support Ticket
              </button>
            </div>
          ) : (
            <>
              {/* Ticket Top Bar */}
              <div className="p-4 border-b border-slate-800 bg-slate-900/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      onClick={copyTicketId}
                      className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-cyan-400 text-[11px] font-mono font-bold flex items-center gap-1 transition-colors"
                      title="Click to copy ticket ID"
                    >
                      <span>{selectedTicket.id}</span>
                      {copiedId ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3 text-slate-400" />}
                    </button>

                    <span className={`px-2 py-0.5 rounded text-[10px] font-mono border ${CATEGORY_CONFIG[selectedTicket.category]?.color || CATEGORY_CONFIG.general.color}`}>
                      {CATEGORY_CONFIG[selectedTicket.category]?.label || 'General'}
                    </span>

                    <span className={`px-2 py-0.5 rounded text-[10px] font-mono border ${PRIORITY_CONFIG[selectedTicket.priority]?.color || PRIORITY_CONFIG.medium.color}`}>
                      {PRIORITY_CONFIG[selectedTicket.priority]?.label || 'Medium'}
                    </span>
                  </div>

                  <h3 className="text-base sm:text-lg font-black text-white">
                    {selectedTicket.title}
                  </h3>

                  <div className="text-[11px] text-slate-400 flex items-center gap-2">
                    <span>Creator: <strong className="text-slate-200">@{selectedTicket.streamerUsername || 'creator'}</strong> ({selectedTicket.streamerDisplayName})</span>
                    <span>•</span>
                    <span>Opened {new Date(selectedTicket.createdAt).toLocaleDateString()}</span>
                  </div>
                </div>

                {/* Status Dropdown / Controls */}
                <div className="flex items-center gap-2 self-start sm:self-auto">
                  <select
                    value={selectedTicket.status}
                    onChange={(e) => handleUpdateStatus(e.target.value as any)}
                    className="px-2.5 py-1.5 rounded-xl bg-slate-950 border border-slate-700 text-xs font-mono text-slate-200 focus:outline-none focus:border-cyan-500"
                  >
                    <option value="open">Waiting for Agent</option>
                    <option value="claimed">In Live Chat</option>
                    <option value="resolved">Mark Resolved</option>
                    <option value="closed">Closed</option>
                  </select>

                  {isAdmin && (
                    <button
                      onClick={() => handleDeleteTicket(selectedTicket.id)}
                      className="p-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 transition-colors"
                      title="Delete ticket"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>

              {/* Admin Claim Banner */}
              {isAdmin && (
                <div className="px-4 py-2.5 bg-gradient-to-r from-purple-950/40 via-purple-900/20 to-slate-900 border-b border-purple-500/20 flex flex-wrap items-center justify-between gap-3 text-xs">
                  {selectedTicket.claimedById ? (
                    <div className="flex items-center gap-2 text-purple-300">
                      <UserCheck className="w-4 h-4 text-purple-400" />
                      <span>
                        Ticket claimed by <strong>{selectedTicket.claimedByName || 'Admin'}</strong>
                      </span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 text-amber-300">
                      <Flame className="w-4 h-4 text-amber-400 animate-bounce" />
                      <span>Unclaimed ticket in queue. Take ownership to start direct live chat with this creator.</span>
                    </div>
                  )}

                  <div className="flex items-center gap-2">
                    {selectedTicket.claimedById ? (
                      <button
                        onClick={() => handleToggleClaim('unclaim')}
                        disabled={claimingTicket}
                        className="px-3 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-[11px] font-mono border border-slate-700 transition-colors flex items-center gap-1.5"
                      >
                        <UserX className="w-3.5 h-3.5" />
                        <span>Release Ticket</span>
                      </button>
                    ) : (
                      <button
                        onClick={() => handleToggleClaim('claim')}
                        disabled={claimingTicket}
                        className="px-3 py-1 rounded-lg bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold text-[11px] font-mono shadow-md shadow-purple-500/20 transition-all flex items-center gap-1.5"
                      >
                        <UserCheck className="w-3.5 h-3.5" />
                        <span>Claim Ticket &amp; Chat</span>
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* Resolved / Closed Banner */}
              {(selectedTicket.status === 'resolved' || selectedTicket.status === 'closed') && (
                <div className="px-4 py-2 bg-emerald-950/30 border-b border-emerald-500/20 text-emerald-300 text-xs flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    <span>This ticket is marked as <strong>{selectedTicket.status.toUpperCase()}</strong>. Sending a new message will automatically reopen it.</span>
                  </div>
                  <button
                    onClick={() => handleUpdateStatus('open')}
                    className="text-[11px] font-mono text-emerald-400 hover:underline"
                  >
                    Reopen Ticket
                  </button>
                </div>
              )}

              {/* Messages Chat Stream */}
              <div className="flex-1 p-4 overflow-y-auto space-y-4 max-h-[460px] bg-[#060810]/60">
                {loadingMessages ? (
                  <div className="p-12 text-center text-xs text-slate-500 flex flex-col items-center gap-2">
                    <RefreshCw className="w-5 h-5 animate-spin text-cyan-400" />
                    <span>Loading conversation history...</span>
                  </div>
                ) : messages.length === 0 ? (
                  <div className="p-8 text-center text-xs text-slate-500 space-y-2">
                    <MessageSquare className="w-8 h-8 text-slate-700 mx-auto" />
                    <p>No messages yet in this ticket thread.</p>
                  </div>
                ) : (
                  messages.map((msg) => {
                    if (msg.senderRole === 'system') {
                      return (
                        <div key={msg.id} className="flex justify-center my-2">
                          <span className="px-3 py-1 rounded-full bg-slate-900/80 border border-slate-800 text-[11px] text-slate-400 font-mono flex items-center gap-1.5">
                            <Sparkles className="w-3 h-3 text-cyan-400" />
                            <span>{msg.message}</span>
                          </span>
                        </div>
                      );
                    }

                    const isAdminMsg = msg.senderRole === 'admin';
                    return (
                      <div
                        key={msg.id}
                        className={`flex gap-3 max-w-[85%] ${
                          isAdminMsg ? 'ml-auto flex-row-reverse' : 'mr-auto flex-row'
                        }`}
                      >
                        {/* Avatar */}
                        <div className="w-8 h-8 rounded-full bg-slate-800 border border-slate-700 flex-shrink-0 overflow-hidden flex items-center justify-center text-xs font-bold text-white">
                          {msg.senderAvatar ? (
                            <img src={msg.senderAvatar} alt={msg.senderName} className="w-full h-full object-cover" />
                          ) : (
                            <span>{msg.senderName.slice(0, 2).toUpperCase()}</span>
                          )}
                        </div>

                        {/* Bubble */}
                        <div className="space-y-1">
                          <div
                            className={`flex items-center gap-2 text-[11px] ${
                              isAdminMsg ? 'justify-end' : 'justify-start'
                            }`}
                          >
                            <span className="font-bold text-slate-300">{msg.senderName}</span>
                            {isAdminMsg ? (
                              <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-purple-500/20 text-purple-300 border border-purple-500/30 font-mono">
                                SUPPORT AGENT
                              </span>
                            ) : (
                              <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 font-mono">
                                CREATOR
                              </span>
                            )}
                            <span className="text-slate-500 text-[10px] font-mono">
                              {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>

                          <div
                            className={`p-3.5 rounded-2xl text-xs sm:text-sm leading-relaxed whitespace-pre-wrap break-words ${
                              isAdminMsg
                                ? 'bg-gradient-to-br from-purple-900/60 to-indigo-950/70 border border-purple-500/30 text-purple-100 rounded-tr-none shadow-lg shadow-purple-950/30'
                                : 'bg-slate-900 border border-slate-800 text-slate-200 rounded-tl-none shadow-md'
                            }`}
                          >
                            {msg.message}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Chat Input Bar */}
              <div className="p-3 sm:p-4 border-t border-slate-800 bg-slate-950/90">
                <form onSubmit={handleSendMessage} className="flex items-end gap-2">
                  <div className="flex-1 relative">
                    <textarea
                      rows={2}
                      value={replyText}
                      onChange={(e) => setReplyText(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          handleSendMessage();
                        }
                      }}
                      placeholder={
                        isAdmin
                          ? 'Type your live support response (Enter to send, Shift+Enter for new line)...'
                          : 'Type your message to support agent (Enter to send)...'
                      }
                      className="w-full p-3 rounded-xl bg-slate-900 border border-slate-800 text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 resize-none transition-colors"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={!replyText.trim() || sendingReply}
                    className="p-3 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-md shadow-cyan-500/20 flex-shrink-0"
                    title="Send message"
                  >
                    <Send className={`w-4 h-4 ${sendingReply ? 'animate-pulse' : ''}`} />
                  </button>
                </form>
                <div className="flex items-center justify-between mt-2 text-[10px] text-slate-500 font-mono">
                  <span>Press <strong>Enter</strong> to send • <strong>Shift + Enter</strong> for line break</span>
                  <span className="flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                    <span>Real-time Chat</span>
                  </span>
                </div>
              </div>
            </>
          )}

        </div>
      </div>

      {/* ============================================================== */}
      {/* MODAL: CREATE NEW SUPPORT TICKET                               */}
      {/* ============================================================== */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-lg rounded-2xl border border-slate-800 bg-[#0B0F19] p-6 shadow-2xl relative">
            <button
              onClick={() => setShowCreateModal(false)}
              className="absolute top-4 right-4 p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-3 mb-5">
              <div className="p-2.5 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400">
                <Headphones className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">Create Support Ticket</h3>
                <p className="text-xs text-slate-400">Our support engineers will claim your ticket and chat with you live.</p>
              </div>
            </div>

            {createError && (
              <div className="mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-300 text-xs flex items-center gap-2">
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
                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Category</label>
                  <select
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-white focus:outline-none focus:border-cyan-500 font-mono"
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
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-white focus:outline-none focus:border-cyan-500 font-mono"
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
                  className="w-full p-3 rounded-xl bg-slate-900 border border-slate-800 text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 resize-none leading-relaxed"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingTicket || !newTitle.trim() || !newMessage.trim()}
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-bold text-xs disabled:opacity-40 transition-all flex items-center gap-1.5 shadow-lg shadow-cyan-500/20"
                >
                  {submittingTicket ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                  <span>Submit Ticket</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
