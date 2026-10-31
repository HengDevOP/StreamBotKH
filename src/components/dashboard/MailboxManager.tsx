'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  Mail,
  RotateCw,
  CheckCheck,
  Trash2,
  Bell,
  Shield,
  Sparkles,
  DollarSign,
  Megaphone,
  Search,
  ExternalLink,
  ChevronRight,
  Clock,
  CheckCircle2,
  AlertCircle,
  X,
  ArrowLeft,
  Inbox,
  Filter
} from 'lucide-react';
import { request } from '../../services/api';
import { MailboxMessage } from './MailboxDrawer';
import { useModal } from '../../context/ModalContext';

interface MailboxManagerProps {
  onNavigateTab?: (tab: string) => void;
  onUnreadCountChange?: (count: number) => void;
}

export const MailboxManager: React.FC<MailboxManagerProps> = ({
  onNavigateTab,
  onUnreadCountChange
}) => {
  const { showConfirm } = useModal();
  const [messages, setMessages] = useState<MailboxMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMessage, setSelectedMessage] = useState<MailboxMessage | null>(null);
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [filterUnreadOnly, setFilterUnreadOnly] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [markingAll, setMarkingAll] = useState(false);
  const [deletingAllRead, setDeletingAllRead] = useState(false);

  // 1. Fetch messages
  const fetchMessages = async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const res = await request<{ messages: MailboxMessage[]; unreadCount: number }>('/mailbox');
      if (res && res.messages) {
        setMessages(res.messages);
        onUnreadCountChange?.(res.unreadCount);

        // Keep selected message in sync or select first
        if (selectedMessage) {
          const fresh = res.messages.find((m) => m.id === selectedMessage.id);
          if (fresh) setSelectedMessage(fresh);
        } else if (res.messages.length > 0) {
          setSelectedMessage(res.messages[0]);
        }
      }
    } catch (err) {
      console.warn('[MailboxManager] Error fetching messages:', err);
    } finally {
      if (!silent) setLoading(false);
    }
  };

  useEffect(() => {
    fetchMessages();
  }, []);

  const unreadCount = useMemo(() => messages.filter((m) => !m.isRead).length, [messages]);

  // 2. Mark as read
  const handleMarkAsRead = async (message: MailboxMessage) => {
    if (message.isRead) return;
    try {
      await request('/mailbox/read', {
        method: 'POST',
        body: JSON.stringify({ messageId: message.id })
      });
      setMessages((prev) =>
        prev.map((m) => (m.id === message.id ? { ...m, isRead: true } : m))
      );
      if (selectedMessage?.id === message.id) {
        setSelectedMessage({ ...selectedMessage, isRead: true });
      }
      onUnreadCountChange?.(Math.max(0, unreadCount - 1));
    } catch (err) {
      console.error('[MailboxManager] Mark as read failed:', err);
    }
  };

  // 3. Toggle unread
  const handleToggleUnread = async (message: MailboxMessage, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    try {
      await request('/mailbox/read', {
        method: 'POST',
        body: JSON.stringify({ messageId: message.id, unread: message.isRead })
      });
      const newReadState = !message.isRead;
      setMessages((prev) =>
        prev.map((m) => (m.id === message.id ? { ...m, isRead: newReadState } : m))
      );
      if (selectedMessage?.id === message.id) {
        setSelectedMessage({ ...selectedMessage, isRead: newReadState });
      }
      onUnreadCountChange?.(newReadState ? Math.max(0, unreadCount - 1) : unreadCount + 1);
    } catch (err) {
      console.error('[MailboxManager] Toggle unread failed:', err);
    }
  };

  // 4. Mark all as read
  const handleMarkAllAsRead = async () => {
    if (unreadCount === 0 || markingAll) return;
    setMarkingAll(true);
    try {
      await request('/mailbox/read', {
        method: 'POST',
        body: JSON.stringify({ all: true })
      });
      setMessages((prev) => prev.map((m) => ({ ...m, isRead: true })));
      if (selectedMessage) {
        setSelectedMessage({ ...selectedMessage, isRead: true });
      }
      onUnreadCountChange?.(0);
    } catch (err) {
      console.error('[MailboxManager] Mark all as read failed:', err);
    } finally {
      setMarkingAll(false);
    }
  };

  // 5. Delete single message
  const handleDeleteMessage = async (messageId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    try {
      await request(`/mailbox?messageId=${encodeURIComponent(messageId)}`, {
        method: 'DELETE'
      });
      const remaining = messages.filter((m) => m.id !== messageId);
      setMessages(remaining);
      if (selectedMessage?.id === messageId) {
        setSelectedMessage(remaining[0] || null);
      }
      onUnreadCountChange?.(remaining.filter((m) => !m.isRead).length);
    } catch (err) {
      console.error('[MailboxManager] Delete message failed:', err);
    }
  };

  // 6. Delete all read messages
  const handleDeleteAllRead = async () => {
    const readCount = messages.filter((m) => m.isRead).length;
    if (readCount === 0 || deletingAllRead) return;

    showConfirm({
      title: 'Clear Read Messages',
      message: `Delete all ${readCount} read messages permanently from your mailbox?`,
      confirmVariant: 'danger',
      confirmLabel: 'Clear Read',
      onConfirm: async () => {
        setDeletingAllRead(true);
        try {
          await request('/mailbox?allRead=true', { method: 'DELETE' });
          const unreadOnly = messages.filter((m) => !m.isRead);
          setMessages(unreadOnly);
          setSelectedMessage(unreadOnly[0] || null);
        } catch (err) {
          console.error('[MailboxManager] Delete read failed:', err);
        } finally {
          setDeletingAllRead(false);
        }
      }
    });
  };

  // Category Icon & Styling
  const getCategoryMeta = (cat: string) => {
    switch (cat) {
      case 'security':
        return {
          label: 'Security & Tokens',
          color: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
          icon: Shield
        };
      case 'donation':
        return {
          label: 'Payments & KHQR',
          color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
          icon: DollarSign
        };
      case 'announcement':
        return {
          label: 'Announcement',
          color: 'text-purple-400 bg-purple-500/10 border-purple-500/20',
          icon: Megaphone
        };
      case 'system':
      default:
        return {
          label: 'System Notification',
          color: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/20',
          icon: Sparkles
        };
    }
  };

  // Filtered List
  const filteredMessages = useMemo(() => {
    return messages.filter((msg) => {
      if (filterUnreadOnly && msg.isRead) return false;
      if (filterCategory !== 'all' && msg.category !== filterCategory) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesTitle = msg.title.toLowerCase().includes(q);
        const matchesContent = msg.content.toLowerCase().includes(q);
        const matchesSender = msg.senderName.toLowerCase().includes(q);
        if (!matchesTitle && !matchesContent && !matchesSender) return false;
      }
      return true;
    });
  }, [messages, filterUnreadOnly, filterCategory, searchQuery]);

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="relative overflow-hidden rounded-2xl border border-slate-800 bg-gradient-to-r from-slate-900/90 via-slate-900/60 to-[#0A0E1A] p-5 sm:p-6 shadow-2xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="p-3 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 flex-shrink-0">
              <Mail className="w-6 h-6 sm:w-7 sm:h-7" />
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                  Streamer Mailbox &amp; Notifications
                </h2>
                {unreadCount > 0 && (
                  <span className="px-2 py-0.5 rounded-full bg-cyan-400 text-slate-950 font-bold text-xs font-mono">
                    {unreadCount} Unread
                  </span>
                )}
              </div>
              <p className="text-xs sm:text-sm text-slate-400 mt-1">
                Official announcements, system releases, payment webhook notifications, and security updates.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => fetchMessages()}
              disabled={loading}
              className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition-all text-xs flex items-center gap-1.5"
              title="Refresh Mailbox"
            >
              <RotateCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">Refresh</span>
            </button>

            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllAsRead}
                disabled={markingAll}
                className="px-3.5 py-2.5 rounded-xl bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 text-xs font-semibold transition-all flex items-center gap-1.5"
              >
                <CheckCheck className="w-4 h-4" />
                <span>Mark All Read</span>
              </button>
            )}

            {messages.some((m) => m.isRead) && (
              <button
                onClick={handleDeleteAllRead}
                disabled={deletingAllRead}
                className="px-3.5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-red-400 border border-slate-700 text-xs font-semibold transition-all flex items-center gap-1.5"
              >
                <Trash2 className="w-4 h-4" />
                <span>Clear Read</span>
              </button>
            )}
          </div>
        </div>

        {/* Filter Pills */}
        <div className="mt-5 pt-4 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex flex-wrap items-center gap-1.5">
            {[
              { id: 'all', label: 'All Mail' },
              { id: 'system', label: 'System' },
              { id: 'donation', label: 'Payments' },
              { id: 'security', label: 'Security' },
              { id: 'announcement', label: 'Announcements' }
            ].map((cat) => (
              <button
                key={cat.id}
                onClick={() => setFilterCategory(cat.id)}
                className={`px-3 py-1.5 rounded-xl font-mono text-[11px] transition-all ${
                  filterCategory === cat.id
                    ? 'bg-cyan-500/20 text-cyan-300 font-bold border border-cyan-500/40'
                    : 'bg-slate-900/60 text-slate-400 hover:text-white border border-slate-800'
                }`}
              >
                {cat.label}
              </button>
            ))}

            <button
              onClick={() => setFilterUnreadOnly(!filterUnreadOnly)}
              className={`px-3 py-1.5 rounded-xl font-mono text-[11px] transition-all ml-1 ${
                filterUnreadOnly
                  ? 'bg-amber-500/20 text-amber-300 font-bold border border-amber-500/40'
                  : 'bg-slate-900/60 text-slate-400 hover:text-white border border-slate-800'
              }`}
            >
              Unread Only ({unreadCount})
            </button>
          </div>

          <span className="text-[11px] font-mono text-slate-500">
            Showing {filteredMessages.length} of {messages.length} messages
          </span>
        </div>
      </div>

      {/* Split Workbench View */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 min-h-[580px]">
        {/* Left Column: Messages Queue */}
        <div className="lg:col-span-5 xl:col-span-4 flex flex-col rounded-2xl border border-slate-800 bg-[#070A13] overflow-hidden">
          {/* Search Bar */}
          <div className="p-3.5 border-b border-slate-800 bg-slate-900/40">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search messages..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-950/80 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
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
          </div>

          {/* List Stream */}
          <div className="flex-1 overflow-y-auto divide-y divide-slate-800/60 max-h-[560px]">
            {loading ? (
              <div className="p-8 text-center text-xs text-slate-500 flex flex-col items-center gap-2">
                <RotateCw className="w-5 h-5 animate-spin text-cyan-400" />
                <span>Loading mailbox...</span>
              </div>
            ) : filteredMessages.length === 0 ? (
              <div className="p-12 text-center text-xs text-slate-500 space-y-2">
                <Inbox className="w-8 h-8 text-slate-600 mx-auto" />
                <p>No messages in this filter.</p>
              </div>
            ) : (
              filteredMessages.map((msg) => {
                const isSelected = selectedMessage?.id === msg.id;
                const meta = getCategoryMeta(msg.category);
                const Icon = meta.icon;

                return (
                  <div
                    key={msg.id}
                    onClick={() => {
                      setSelectedMessage(msg);
                      handleMarkAsRead(msg);
                    }}
                    className={`p-4 cursor-pointer transition-all ${
                      isSelected
                        ? 'bg-cyan-500/10 border-l-4 border-l-cyan-400'
                        : 'hover:bg-slate-900/50 border-l-4 border-l-transparent'
                    } ${!msg.isRead ? 'bg-slate-900/30' : ''}`}
                  >
                    <div className="flex items-start justify-between gap-2 mb-1.5">
                      <div className="flex items-center gap-2 min-w-0">
                        {!msg.isRead && (
                          <span className="w-2 h-2 rounded-full bg-cyan-400 flex-shrink-0 animate-pulse" />
                        )}
                        <span className={`px-1.5 py-0.5 rounded text-[9px] font-mono border flex items-center gap-1 ${meta.color}`}>
                          <Icon className="w-2.5 h-2.5" />
                          <span>{meta.label}</span>
                        </span>
                      </div>
                      <span className="text-[10px] font-mono text-slate-500 whitespace-nowrap">
                        {new Date(msg.createdAt).toLocaleDateString()}
                      </span>
                    </div>

                    <h4 className={`text-xs sm:text-sm font-bold line-clamp-1 mb-1 ${!msg.isRead ? 'text-white' : 'text-slate-300'}`}>
                      {msg.title}
                    </h4>

                    <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed">
                      {msg.preview || msg.content}
                    </p>

                    <div className="flex items-center justify-between text-[11px] text-slate-500 pt-2.5 mt-2 border-t border-slate-800/40">
                      <span>{msg.senderName}</span>
                      <button
                        onClick={(e) => handleDeleteMessage(msg.id, e)}
                        className="text-slate-500 hover:text-red-400 transition-colors p-1"
                        title="Delete message"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right Column: Message Detail View */}
        <div className="lg:col-span-7 xl:col-span-8 flex flex-col rounded-2xl border border-slate-800 bg-[#070A13] overflow-hidden">
          {!selectedMessage ? (
            <div className="flex-1 flex flex-col items-center justify-center p-12 text-center text-slate-500 space-y-3">
              <div className="w-16 h-16 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-600">
                <Mail className="w-8 h-8" />
              </div>
              <h3 className="text-base font-bold text-slate-300">No Message Selected</h3>
              <p className="text-xs text-slate-500 max-w-sm">
                Select a notification from the list on the left to read its full message content and recommendations.
              </p>
            </div>
          ) : (
            <div className="flex-1 flex flex-col">
              {/* Message Header */}
              <div className="p-5 border-b border-slate-800 bg-slate-900/60 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-mono border ${getCategoryMeta(selectedMessage.category).color}`}>
                      {getCategoryMeta(selectedMessage.category).label}
                    </span>
                    <span className="text-slate-500 text-xs font-mono">•</span>
                    <span className="text-slate-400 text-xs font-mono flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-slate-500" />
                      <span>{new Date(selectedMessage.createdAt).toLocaleString()}</span>
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={(e) => handleToggleUnread(selectedMessage, e)}
                      className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-mono border border-slate-700 transition-colors"
                    >
                      {selectedMessage.isRead ? 'Mark as Unread' : 'Mark as Read'}
                    </button>
                    <button
                      onClick={() => handleDeleteMessage(selectedMessage.id)}
                      className="p-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 transition-colors"
                      title="Delete"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <h3 className="text-lg sm:text-xl font-black text-white">
                  {selectedMessage.title}
                </h3>

                <div className="text-xs text-slate-400 flex items-center gap-2">
                  <span>From: <strong className="text-slate-200">{selectedMessage.senderName}</strong></span>
                </div>
              </div>

              {/* Message Body */}
              <div className="flex-1 p-6 overflow-y-auto space-y-5 bg-[#060810]/60">
                <div className="text-sm text-slate-200 leading-relaxed whitespace-pre-wrap font-sans space-y-3">
                  {selectedMessage.content}
                </div>

                {/* Direct Action Link */}
                {selectedMessage.actionUrl && (
                  <div className="pt-4 border-t border-slate-800/80">
                    <button
                      onClick={() => {
                        if (selectedMessage.actionUrl?.startsWith('/dashboard?tab=')) {
                          const targetTab = selectedMessage.actionUrl.split('?tab=')[1];
                          onNavigateTab?.(targetTab);
                        } else if (selectedMessage.actionUrl?.startsWith('/')) {
                          window.location.href = selectedMessage.actionUrl;
                        } else {
                          window.open(selectedMessage.actionUrl, '_blank');
                        }
                      }}
                      className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-bold text-xs shadow-md shadow-cyan-500/20 transition-all"
                    >
                      <span>{selectedMessage.actionLabel || 'Open Feature'}</span>
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>

              {/* Message Footer Info */}
              <div className="p-4 border-t border-slate-800 bg-slate-950/80 text-[11px] text-slate-500 font-mono flex items-center justify-between">
                <span>StreamBotKH Live Notification Engine</span>
                <span className="flex items-center gap-1.5 text-emerald-400">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Verified Platform Dispatch</span>
                </span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
